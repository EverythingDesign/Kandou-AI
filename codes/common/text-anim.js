function homeEntranceAnimation(headingWrap, secondaryWrap = null, endColor = "#ffffff") {
    // If the second argument is a color string, shift the parameter
    if (typeof secondaryWrap === "string" && (secondaryWrap.startsWith("#") || secondaryWrap.startsWith("rgb") || secondaryWrap.startsWith("hsl"))) {
        endColor = secondaryWrap;
        secondaryWrap = null;
    }

    const headingEl = typeof headingWrap === "string" ? document.querySelector(headingWrap) : headingWrap;
    const secondaryEl = typeof secondaryWrap === "string" ? document.querySelector(secondaryWrap) : secondaryWrap;

    if (!headingEl) return;
    const heading = /^(H[1-6])$/i.test(headingEl.tagName)
        ? headingEl
        : headingEl.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']");

    if (!heading) return;

    const startColor = "#6adb2b";
    function start() {
        const check = () => {
            const chars = heading.querySelectorAll(".char");
            const words = heading.querySelectorAll(".word");
            return chars.length > 0 ? { chars, words } : null;
        };

        const runAnimation = (splitData) => {
            const chars = splitData ? splitData.chars : [heading];
            const words = splitData ? splitData.words : [];

            const master = gsap.timeline();

            // Initial state setup
            gsap.set(headingEl, { opacity: 1 });
            gsap.set(chars, { opacity: 0 });
            if (words.length > 0) gsap.set(words, { opacity: 1 });

            if (secondaryEl) gsap.set(secondaryEl, { opacity: 0 });

            const duration = 1;

            // 1. Stagger opacity & color to startColor
            master.to(
                chars,
                {
                    opacity: 1,
                    color: startColor,
                    duration: duration * 0.6,
                    ease: "power2.inOut",
                    stagger: { each: duration / chars.length },
                },
                0
            );

            // 2. Stagger color to destination color (handles strong tags)
            master.to(
                chars,
                {
                    color: (index, target) => target.closest("strong") ? "#6adb2b" : endColor,
                    duration: duration * 0.6,
                    ease: "power2.inOut",
                    stagger: { each: duration / chars.length },
                },
                duration * 0.4
            );

            // 3. Make secondary opacity 1 halfway through heading animation
            if (secondaryEl) {
                master.to(
                    secondaryEl,
                    {
                        opacity: 1,
                        duration: 0.5,
                        ease: "power1.out",
                    },
                    duration * 0.4
                );
            }
        };

        const initialSplit = check();
        if (initialSplit) {
            runAnimation(initialSplit);
            return;
        }

        // Wait for the splitter to finish. Some splitters build chars in
        // multiple passes (words → chars) or re-split after webfonts load, so
        // firing on the FIRST .char animates a partial set that then gets
        // replaced — the visible chars never fade in. Debounce until mutations
        // settle, then read + animate the FINAL node set.
        let settle;
        const observer = new MutationObserver(() => {
            if (!check()) return;
            clearTimeout(settle);
            settle = setTimeout(() => {
                observer.disconnect();
                clearTimeout(safetyTimeout);
                runAnimation(check()); // re-read: grab the final chars, not stale ones
            }, 100);
        });

        observer.observe(heading, { childList: true, subtree: true });

        // Safety fallback: if the split never happens, reveal the heading anyway.
        const safetyTimeout = setTimeout(() => {
            observer.disconnect();
            runAnimation(check()); // null → single-block fallback if still unsplit
        }, 15000);
    }

    start();
}


function commonEntranceAnimation(endColorHead = "#ffffff", endColorPara = "#fff") {
    const headingEl = document.querySelector("[entrance-head]");
    const subheadEl = document.querySelector("[entrance-subhead]");
    const subParaEl = document.querySelector("[entrance-subpara]");
    const subImgEl = document.querySelectorAll("[entrance-img]");

    // if (!headingEl && !subheadEl && !subParaEl && !subImgEl) return;

    const startColor = "#6adb2b";
    const duration = 0.45;

    const check = () => {
        const headChars = headingEl ? headingEl.querySelectorAll(".char") : [];
        const subChars = subheadEl ? subheadEl.querySelectorAll(".char") : [];
        const subParaChars = subParaEl ? subParaEl.querySelectorAll(".char") : [];
        // Need at least one element to have chars before we can start
        const headOk = !headingEl || headChars.length > 0;
        const subOk = !subheadEl || subChars.length > 0;
        const subParaOk = !subParaEl || subParaChars.length > 0;
        return (headOk && subOk && subParaOk) ? { headChars, subChars, subParaChars } : null;
    };

    const runAnimation = (splitData) => {
        const headChars = splitData ? splitData.headChars : (headingEl ? [headingEl] : []);
        const subChars = splitData ? splitData.subChars : (subheadEl ? [subheadEl] : []);
        const subParaChars = splitData ? splitData.subParaChars : (subParaEl ? [subParaEl] : []);

        const master = gsap.timeline();

        if (headingEl) {
            gsap.set(headingEl, { opacity: 1 });
            gsap.set(Array.from(headChars), { opacity: 0 });
        }
        if (subheadEl) {
            gsap.set(subheadEl, { opacity: 1 });
            gsap.set(Array.from(subChars), { opacity: 0 });
        }
        if (subParaEl) {
            gsap.set(subParaEl, { opacity: 1 });
            gsap.set(Array.from(subParaChars), { opacity: 0 });
        }

        if (headChars.length > 0) {
            master
                .to(headChars, {
                    opacity: 1,
                    color: startColor,
                    duration: duration * 0.6,
                    ease: "power2.inOut",
                    stagger: { each: duration / headChars.length },
                }, 0)
                .to(headChars, {
                    color: (index, target) => target.closest("strong") ? "#010101" : endColorHead,
                    duration: duration * 0.6,
                    ease: "power2.inOut",
                    stagger: { each: duration / headChars.length },
                }, duration * 0.4);
        }

        if (subChars.length > 0) {
            master
                .to(subChars, {
                    opacity: 1,
                    color: startColor,
                    duration: duration * 0.6,
                    ease: "power2.inOut",
                    stagger: { each: duration / subChars.length },
                }, 0)
                .to(subChars, {
                    color: (index, target) => target.closest("strong") ? "#696969" : "#696969",
                    duration: duration * 0.6,
                    ease: "power2.inOut",
                    stagger: { each: duration / subChars.length },
                }, duration * 0.4)
                .to(subParaEl, {
                    opacity: 1,
                    duration: 0.5,
                    ease: "power1.out",
                }, ">=")

        }
        if (subParaChars.length > 0) {
            master
                .to(subParaChars, {
                    opacity: 1,
                    color: startColor,
                    duration: duration * 0.6,
                    ease: "power2.inOut",
                    stagger: { each: duration / subParaChars.length },
                }, 0)
                .to(subParaChars, {
                    color: (index, target) => target.closest("strong") ? "#010101" : endColorPara,
                    duration: duration * 0.6,
                    ease: "power2.inOut",
                    stagger: { each: duration / subParaChars.length },
                }, duration * 0.4)

        }
        if (subImgEl) {
            master
                .to(subImgEl, {
                    opacity: 1,
                    y: "0%",
                    duration: 0.5,
                    ease: "power1.out",
                }, 0)
        }
    };

    const initialSplit = check();
    if (initialSplit) {
        runAnimation(initialSplit);
        return;
    }

    // Chars not ready yet — wait for SplitText to finish with MutationObserver,
    // debounced 100ms so multi-pass splitting settles before we animate.
    let settle;
    const observers = [];

    const onMutation = () => {
        if (!check()) return;
        clearTimeout(settle);
        settle = setTimeout(() => {
            observers.forEach(o => o.disconnect());
            clearTimeout(safetyTimeout);
            runAnimation(check());
        }, 100);
    };

    [headingEl, subheadEl].forEach(el => {
        if (!el) return;
        const obs = new MutationObserver(onMutation);
        obs.observe(el, { childList: true, subtree: true });
        observers.push(obs);
    });

    const safetyTimeout = setTimeout(() => {
        observers.forEach(o => o.disconnect());
        runAnimation(check());
    }, 15000);
}


function commonHeadingEntranceAnimation(endColorHead = "#ffffff") {
    const headingEls = document.querySelectorAll("[section-head]");

    if (!headingEls.length) return;

    const startColor = "#6adb2b";
    const duration = 0.45;

    const isAlreadyInViewport = (headingEl) => {
        const rect = headingEl.getBoundingClientRect();
        return rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
    };

    headingEls.forEach((headingEl) => {
        let hasStarted = false;

        const check = () => {
            const headChars = headingEl.querySelectorAll(".char");
            return headChars.length > 0 ? { headChars } : null;
        };

        const startAnimation = (splitData) => {
            if (hasStarted) return;
            hasStarted = true;

            const headChars = splitData ? splitData.headChars : [headingEl];
            const master = gsap.timeline({
                scrollTrigger: {
                    trigger: headingEl,
                    start: "top 90%",
                    end: "+=500",
                    once: true,
                    toggleActions: "play none none none",
                    // scrub: true,
                }
            });

            gsap.set(headingEl, { opacity: 1 });
            gsap.set(Array.from(headChars), { opacity: 0 });

            if (headChars.length > 0) {
                master
                    .to(headChars, {
                        opacity: 1,
                        color: startColor,
                        duration: duration * 0.6,
                        ease: "power2.inOut",
                        stagger: { each: duration / headChars.length },
                    }, 0)
                    .to(headChars, {
                        color: (index, target) => target.closest("strong") ? "#010101" : endColorHead,
                        duration: duration * 0.6,
                        ease: "power2.inOut",
                        stagger: { each: duration / headChars.length },
                    }, duration * 0.4);
            }
        };

        const tryStart = () => {
            const initialSplit = check();
            if (initialSplit) {
                startAnimation(initialSplit);
            }
        };

        if (isAlreadyInViewport(headingEl)) {
            tryStart();
            return;
        }

        // Chars not ready yet — wait for SplitText via MutationObserver.
        // If the page loads below the trigger point, the ScrollTrigger will
        // start the animation when the heading enters the viewport.
        let settle;
        const obs = new MutationObserver(() => {
            if (!check()) return;
            clearTimeout(settle);
            settle = setTimeout(() => {
                obs.disconnect();
                clearTimeout(safetyTimeout);
                tryStart();
            }, 100);
        });

        obs.observe(headingEl, { childList: true, subtree: true });

        const safetyTimeout = setTimeout(() => {
            obs.disconnect();
            tryStart();
        }, 15000);

        ScrollTrigger.create({
            trigger: headingEl,
            start: "top 90%",
            once: true,
            toggleActions: "play none none none",
            onEnter: () => {
                tryStart();
            },
        });
    });
}


// Expose globally to prevent esbuild tree-shaking
window.homeEntranceAnimation = homeEntranceAnimation;
window.commonEntranceAnimation = commonEntranceAnimation;
window.commonHeadingEntranceAnimation = commonHeadingEntranceAnimation;
