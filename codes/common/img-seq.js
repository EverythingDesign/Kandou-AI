(() => {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const parseUrlList = (text) =>
        text
            .split(",")
            .map((s) => s.replace(/['"]/g, "").trim())
            .filter(Boolean);

    /* â”€â”€ expose globally â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    window.initImageSequence = async ({
        wrap,
        canvas,
        deskLow,
        deskHigh,
        mobLow = null,
        mobHigh = null,
        label = "seq",
        start = "top top",
        end = "bottom bottom",
    }) => {
        const TAG = `[${label}]`;

        /* ---------- DOM ---------- */
        const wrapEl = document.querySelector(wrap);
        const canvasEl = document.querySelector(canvas);
        if (!wrapEl || !canvasEl) {
            console.warn(`${TAG} ${wrap} or ${canvas} not found`);
            return;
        }

        const imgEls = canvasEl.querySelectorAll("img[home-visual-group='initial']");
        if (!imgEls.length) {
            console.warn(`${TAG} No <img initial-frame> in ${canvas}`);
            return;
        }

        /* ---------- Pick URLs ---------- */
        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        const LOW_FILE = isMobile && mobLow ? mobLow : deskLow;
        const HIGH_FILE = isMobile && mobHigh ? mobHigh : deskHigh;

        /* ---------- Fetch low-res list only ---------- */
        let URLS_LOW, URLS_HIGH;
        try {
            const lR = await fetch(LOW_FILE);
            const lT = await lR.text();
            URLS_LOW = parseUrlList(lT);

            if (!URLS_LOW.length) {
                console.error(`${TAG} Empty low URL list`);
                return;
            }
        } catch (e) {
            console.error(`${TAG} Fetch failed:`, e);
            return;
        }

        const FRAME_COUNT = URLS_LOW.length;
        console.log(
            `${TAG} âœ… ${FRAME_COUNT} frames (${isMobile ? "mobile" : "desktop"})`
        );

        /* ---------- seq:init (script-order safe) ---------- */
        window.__seqInit = window.__seqInit || {};
        window.__seqInit[label] = { label, frameCount: FRAME_COUNT };
        window.dispatchEvent(
            new CustomEvent("seq:init", {
                detail: { label, frameCount: FRAME_COUNT },
            })
        );

        /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Sequence engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        class ScrollSequence {
            constructor() {
                this.frameCount = FRAME_COUNT;
                this.preloadRadius = 5;
                this.lowConcurrency = 6;
                this.highConcurrency = 2;
                this.scrollStopDelay = 350;
                this.initialBurst = 120;

                this.currentFrame = 0;
                this.targetFrame = 0;
                this.scrollVelocity = 0;
                this.isScrolling = false;
                this.lastProgress = 0;
                this.lastFrameTime = Date.now();
                this.scrollStopTimer = null;
                this._lastQuality = null;
                this._rafId = null;

                this.images = {
                    low: new Array(this.frameCount),
                    high: new Array(this.frameCount),
                };

                this.loadedLow = 0;
                this.loadedHigh = 0;

                this._init();
            }

            _bsp(s, e, skip) {
                const o = [],
                    seen = new Set(skip);
                const add = (i) => {
                    if (i < s || i > e || seen.has(i)) return;
                    seen.add(i);
                    o.push(i);
                };
                add(s);
                add(e);
                const r = (lo, hi) => {
                    if (lo > hi) return;
                    const m = (lo + hi) >> 1;
                    add(m);
                    r(lo, m - 1);
                    r(m + 1, hi);
                };
                r(s + 1, e - 1);
                return o;
            }

            _loadImage(i, q) {
                return new Promise((res) => {
                    const img = new Image();
                    img.onload = () => {
                        if (q === "low") this.loadedLow++;
                        else this.loadedHigh++;
                        res(img);
                    };
                    img.onerror = () => res(null);

                    const url = q === "low" ? URLS_LOW[i] : URLS_HIGH[i];
                    if (url) img.src = url;
                    else img.onerror();
                });
            }

            async _loadBatch(order, q, conc) {
                let idx = 0;
                await Promise.all(
                    Array.from({ length: conc }, async () => {
                        while (idx < order.length) {
                            const i = order[idx++];
                            const img = await this._loadImage(i, q);
                            this.images[q][i] = img;
                            if (q === "low" && i === 0 && img) this._applyFrame(0);
                        }
                    })
                );
            }

            async _preload() {
                // Phase 1 â€” load the first N frames (blocking gate for the preloader)
                const burst = Math.min(this.initialBurst, this.frameCount);
                const initialFrames = [];
                for (let i = 0; i < burst; i++) initialFrames.push(i);
                await this._loadBatch(initialFrames, "low", this.lowConcurrency);

                // âœ… Signal ready NOW â€” site can reveal while the rest streams in
                window.dispatchEvent(
                    new CustomEvent("seq:ready", {
                        detail: { label, frameCount: FRAME_COUNT },
                    })
                );

                // Phase 2 â€” BSP the remaining low-res frames in the background (no await)
                const remaining = this._bsp(
                    0,
                    this.frameCount - 1,
                    new Set(initialFrames)
                );

                this._loadBatch(remaining, "low", this.lowConcurrency).then(
                    async () => {
                        console.log(`${TAG} LOW fully loaded`);

                        // Phase 3 â€” high-res after low-res fully loaded
                        try {
                            const hR = await fetch(HIGH_FILE);
                            const hT = await hR.text();
                            URLS_HIGH = parseUrlList(hT);

                            if (URLS_HIGH.length) {
                                const highOrder = this._bsp(0, this.frameCount - 1, new Set());
                                await this._loadBatch(highOrder, "high", this.highConcurrency);
                                console.log(`${TAG} HIGH fully loaded`);
                            }
                        } catch (e) {
                            console.warn(`${TAG} High-res fetch failed:`, e);
                        }
                    }
                );
            }

            async _upgradeAround(base) {
                if (!URLS_HIGH) return;

                const lo = Math.max(0, base - this.preloadRadius);
                const hi = Math.min(this.frameCount - 1, base + this.preloadRadius);

                for (let i = lo; i <= hi; i++) {
                    if (!this.images.high[i]) {
                        this.images.high[i] = await this._loadImage(i, "high");
                    }
                }

                if (this.targetFrame === base) this._applyFrame(base);
            }

            _nearestLoaded(t) {
                const ok = (i) => this.images.low[i] || this.images.high[i];
                if (ok(t)) return t;

                for (let r = 1; r < this.frameCount; r++) {
                    if (t + r < this.frameCount && ok(t + r)) return t + r;
                    if (t - r >= 0 && ok(t - r)) return t - r;
                }
                return t;
            }

            _applyFrame(index) {
                const useHigh = !this.isScrolling && this.images.high[index];
                const src = useHigh ? this.images.high[index] : this.images.low[index];

                if (!src) return;

                const newSrc = src.src;
                imgEls.forEach((el) => {
                    if (el.src !== newSrc) {
                        el.src = newSrc;
                        el.srcset = "";
                    }
                });

                this.currentFrame = index;

                // window.dispatchEvent(
                //   new CustomEvent("seq:frame", {
                //     detail: {
                //       frame: index,
                //       progress: index / (this.frameCount - 1),
                //     },
                //   })
                // );
                window.dispatchEvent(
                    new CustomEvent("seq:frame", {
                        detail: {
                            label,
                            frame: index,
                            progress: index / (this.frameCount - 1),
                        },
                    })
                );

                const q = useHigh ? "HIGH" : "LOW";
                if (q !== this._lastQuality) {
                    console.log(`${TAG} ðŸŽ¨ Quality â†’ ${q} (frame ${index})`);
                    this._lastQuality = q;
                }
            }

            _onProgress(progress) {
                const now = Date.now();
                const dP = Math.abs(progress - this.lastProgress);
                const dT = Math.max(now - this.lastFrameTime, 1);

                this.scrollVelocity = (dP / dT) * 1000;
                this.lastProgress = progress;
                this.lastFrameTime = now;

                this.targetFrame = Math.floor(progress * (this.frameCount - 1));
                this.isScrolling = this.scrollVelocity > 0.01;

                if (!this._rafId) {
                    this._rafId = requestAnimationFrame(() => {
                        this._rafId = null;
                        const ri = this._nearestLoaded(this.targetFrame);
                        if (ri !== this.currentFrame) this._applyFrame(ri);
                    });
                }

                if (this.scrollStopTimer) clearTimeout(this.scrollStopTimer);
                this.scrollStopTimer = setTimeout(() => {
                    this.isScrolling = false;
                    this._applyFrame(this.currentFrame);
                    this._upgradeAround(this.targetFrame);
                }, this.scrollStopDelay);
            }

            _onResize() {
                this._applyFrame(this.currentFrame);
            }

            _init() {
                ScrollTrigger.create({
                    trigger: wrapEl,
                    start,
                    end,
                    // scrub: 0.3,
                    scrub: true,
                    // markers: true,
                    onUpdate: (self) => this._onProgress(self.progress),
                });

                window.addEventListener("resize", this._onResize.bind(this));
                this._preload();
            }
        }

        return new ScrollSequence();
    };
})();