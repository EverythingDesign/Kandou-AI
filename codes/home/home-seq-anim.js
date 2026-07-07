function setupHeroAnimations({ frameCount, label }) {
    const startColor = "#6adb2b";
    const endColor = "#ffffff";

    const f = (frame) => frame / (frameCount - 1);

    const ANIMATIONS = [];

    const DIALOGUE_ANIMATIONS = [
        {
            sel: "#home-dialogue-g1-1",
            start: f(0),
            end: f(50),
            out: [f(100), f(120)],
        },
        {
            sel: "#home-dialogue-g2-1",
            start: f(125),
            end: f(130),
            out: [f(180), f(220)],
        },
        {
            sel: "#home-dialogue-g2-2",
            start: f(140),
            end: f(150),
            out: [f(180), f(220)],
        },
        {
            sel: "#home-dialogue-g2-3",
            start: f(160),
            end: f(170),
            out: [f(180), f(220)],
        },
        {
            sel: "#home-dialogue-g3-1",
            start: f(230),
            end: f(250),
            out: [f(260), f(275)],
        },
    ];

    const master = gsap.timeline({ paused: true });

    master.set({}, {}, 1);

    ANIMATIONS.forEach(({ sel, to, start, end, out }) => {
        if (to) {
            master.to(
                sel,
                {
                    ...to,
                    duration: end - start,
                    ease: "none",
                },
                start
            );
        }

        if (out) {
            master.to(
                sel,
                {
                    opacity: 0,
                    duration: out[1] - out[0],
                    ease: "none",
                },
                out[0]
            );
        }
    });

    DIALOGUE_ANIMATIONS.forEach(({ sel, start, end, out }) => {
        const words = document.querySelectorAll(`${sel} .char`);
        const duration = end - start;

        master.to(
            words,
            {
                opacity: 1,
                color: startColor,
                duration: duration * 0.6,
                ease: "power2.inOut",
                stagger: { each: duration / words.length },
            },
            start
        );

        master.to(
            words,
            {
                color: (index, target) => target.closest("strong") ? "#6adb2b" : endColor,
                duration: duration * 0.6,
                ease: "power2.inOut",
                stagger: { each: duration / words.length },
            },
            start + duration * 0.4
        );

        if (out) {
            master.to(
                sel,
                {
                    opacity: 0,
                    duration: out[1] - out[0],
                    ease: "none",
                },
                out[0]
            );
        }
    });

    // Drive the timeline from the image-sequence's per-frame event.
    // img-seq.js dispatches `seq:frame` with { label, frame, progress } each frame.
    window.addEventListener("seq:frame", ({ detail }) => {
        if (detail.label !== label) return;
        master.progress(detail.progress);
    });
}

// Run immediately if seq:init already fired, otherwise wait
if (window.__seqInit?.["kandou-seq"]) {
    setupHeroAnimations(window.__seqInit["kandou-seq"]);
} else {
    window.addEventListener("seq:init", ({ detail }) => {
        if (detail.label === "kandou-seq") setupHeroAnimations(detail);
    });
}



gsap.registerPlugin(ScrollTrigger, Flip);

function initFinalFlip() {
    const img = document.querySelector('.home-visual-img');
    const finalFrame = document.querySelector('[final-frame-wrap]');
    if (!img || !finalFrame) return;

    const homeParent = img.parentElement;   // .hero_canvas — where the image sequence draws
    let flip;

    const buildFlip = () => {
        if (flip) flip.kill();
        const state = Flip.getState(img);   // measured NOW, at sequence end
        finalFrame.appendChild(img);        // move into the final wrap
        flip = Flip.from(state, {
            absolute: true,                   // ← REQUIRED for a sticky/absolute source
            // NOTE: keep scale OFF. scale:true animates via scaleX/scaleY from one
            // origin; hero (≈2.0) and final (≈2.6) have different aspect ratios, so
            // it overshoots width and drifts left. width/height mode is geometrically
            // exact both ways. The reverse-freeze is handled by the progress clamp below.
            ease: "none",
            duration: 1
        });
        flip.pause(0);                      // we scrub it manually below
    };

    // Scrolled back up past the start → hand the image back to the hero so the
    // sequence can drive it again. Without this the img stays parented in the
    // final wrap (just overlaid at the hero spot) and the sequence looks frozen.
    const resetHome = () => {
        if (flip) { flip.kill(); flip = null; }
        gsap.set(img, { clearProps: "all" });   // strip flip's inline transform/position/size
        homeParent.appendChild(img);            // back into .hero_canvas
    };

    ScrollTrigger.create({
        trigger: ".home-seq-trigger",
        start: "bottom bottom",
        // endTrigger: "#storyline",            // right where the sequence finishes
        // end: "top center",                  // scrub range for the hand-off
        end: "bottom center",                  // scrub range for the hand-off
        scrub: true,
        onEnter: () => { if (!flip) buildFlip(); },
        onEnterBack: () => { if (!flip) buildFlip(); },   // built even if we arrive scrolled-past
        // Clamp just under 1 so Flip never fires onComplete (which tears down the
        // absolute wrapper and freezes width on the way back up). 0.999 = ~0.07px
        // off the final rest position — imperceptible, and it stays fully reversible.
        onUpdate: (self) => { if (flip) flip.progress(self.progress * 0.999); },
        onLeaveBack: () => resetHome()      // ← back into the sequence: return img to hero
    });
}

// Actually run it — this was defined but never called.
if (window.Webflow && window.Webflow.push) {
    window.Webflow.push(initFinalFlip);
} else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFinalFlip);
} else {
    initFinalFlip();
}