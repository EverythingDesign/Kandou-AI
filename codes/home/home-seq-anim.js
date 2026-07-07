// gsap.set("[detected-info]", { opacity: 0 });

function setupHeroAnimations({ frameCount, label }) {
    const startColor = "#6adb2b";
    const endColor = "#ffffff";

    const f = (frame) => frame / (frameCount - 1);

    const ANIMATIONS = [
        // {
        //     sel: "#home-dialogue-g1-1",
        //     to: { opacity: 0 },
        //     start: f(20),
        //     end: f(70),
        // },
    ];

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
            out: [f(170), f(210)],
        },
        {
            sel: "#home-dialogue-g2-2",
            start: f(135),
            end: f(140),
            out: [f(170), f(210)],
        },
        {
            sel: "#home-dialogue-g2-3",
            start: f(145),
            end: f(150),
            out: [f(170), f(210)],
        },
        {
            sel: "#home-dialogue-g3-1",
            start: f(220),
            end: f(230),
            out: [f(300), f(340)],
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
