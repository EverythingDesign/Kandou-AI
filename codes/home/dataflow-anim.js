const sectionTrigger = document.querySelector("#dataflow");
const container = document.querySelector("#h-data-container");
// const rivSrc = "https://cdn.prod.website-files.com/69d76d29d92505bbfe2e7d5f/6a4cd9078594b6c1a567ceaf_kandou_-_homepage_8.riv";
const rivSrc = "https://cdn.prod.website-files.com/69d76d29d92505bbfe2e7d5f/6a4d37cf9d77be71fb91ae40_kandou_-_homepage_9.riv";
const triggerGroup = document.querySelectorAll("[trigger-group='home']");

const canvas = document.createElement("canvas");
container.appendChild(canvas);

let vmi = null;        // view model instance
let stepProp = null;   // the property we drive: { name, type }

// States: -1 Closed Wire (initial) · 0 Opening/Opened · 1 Inside Wire / Data Flow MIMO · 2 Closing / Closed
const CLOSED = -1;

const getRiveLayout = () => {
    const isMobile = window.innerWidth <= 767;
    return new rive.Layout({
        fit: isMobile ? rive.Fit.Cover : rive.Fit.Contain,
        alignment: rive.Alignment.Center
    });
};

const r = new rive.Rive({
    src: rivSrc,
    canvas,
    autoplay: true,
    stateMachines: "Main Rive StateMachine",
    autoBind: true,
    layout: getRiveLayout(),
    onLoad: () => {
        r.resizeDrawingSurfaceToCanvas();

        vmi = r.viewModelInstance;
        const props = vmi?.properties || [];
        console.log("VM instance:", vmi);
        console.log("properties:", props);

        stepProp = props.find(p => p.type === "number")
            || props.find(p => p.type === "enum")
            || props.find(p => p.type === "trigger")
            || null;
        console.log("driving property:", stepProp);

        window.r = r;
        window.vmi = vmi;

        setStep(CLOSED);   // wire starts closed
        initScroll();
    },
});
addEventListener("resize", () => {
    r.resizeDrawingSurfaceToCanvas();
    if (r) r.layout = getRiveLayout();
});

function initScroll() {
    gsap.registerPlugin(ScrollTrigger);

    // Each trigger moves the wire between two ADJACENT states (±1, never skipping):
    //   entering the range (down or back up) → advance to `to`
    //   leaving back past the start          → drop to `from`
    const steps = [
        { el: sectionTrigger, from: -1, to: 0, start: "top 20%", end: "bottom 90%" },   // #dataflow: closed ⇄ open
        { el: triggerGroup[0], from: 0, to: 1, start: "top center", end: "top 20%" },   // group[0]: open ⇄ inside/data flow
        { el: triggerGroup[2], from: 1, to: 2, start: "top center", end: "top 20%" },   // group[1]: inside ⇄ closing/closed
    ];

    steps.forEach(({ el, from, to, start, end }) => {
        if (!el) return;
        ScrollTrigger.create({
            trigger: el,
            start: start,
            end: end,
            onEnter: () => setStep(to),
            onEnterBack: () => setStep(to),
            onLeaveBack: () => setStep(from)
        });
    });
}

function setStep(i) {
    if (!vmi || !stepProp) { console.warn("no VM property to drive"); return; }
    const { name, type } = stepProp;

    if (type === "number") {
        const p = vmi.number(name);
        if (p) p.value = i;
        console.log(`number "${name}" =`, i);

    } else if (type === "enum") {
        const p = vmi.enum(name);
        if (p) {
            const opts = p.values || p.enums || null;
            p.value = (opts && opts[i] != null) ? opts[i] : String(i);
            console.log(`enum "${name}" =`, p.value, "options:", opts);
        }

    } else if (type === "trigger") {
        const p = vmi.trigger(name);
        if (p) p.trigger();
        console.log(`trigger "${name}" fired for step`, i);
    }
}


let dataFlowRetries = 0;
const maxDataFlowRetries = 100;

function initDataFlowText() {
    const dataFlowHeadings = document.querySelectorAll("#dataflow h2");
    const dataSignalCards = document.querySelectorAll("[dataflow-signal]");

    if (dataFlowHeadings.length < 2) {
        if (dataFlowRetries < maxDataFlowRetries) {
            dataFlowRetries++;
            setTimeout(initDataFlowText, 20);
        }
        return;
    }

    let h1Chars = dataFlowHeadings[0].querySelectorAll(".char");
    let h2Chars = dataFlowHeadings[1].querySelectorAll(".char");

    if (h1Chars.length === 0 || h2Chars.length === 0) {
        if (dataFlowRetries < maxDataFlowRetries) {
            dataFlowRetries++;
            setTimeout(initDataFlowText, 20);
            return;
        }
        // Fallbacks if splitting fails
        h1Chars = h1Chars.length > 0 ? h1Chars : [dataFlowHeadings[0]];
        h2Chars = h2Chars.length > 0 ? h2Chars : [dataFlowHeadings[1]];
    }

    gsap.set(h2Chars, { opacity: 0 });
    gsap.set(h1Chars, { opacity: 0 });
    gsap.set("#dataflow .word", { opacity: 1 });
    gsap.set(".ab-kandou_wrap", { y: "-5%" });

    //the text animations
    const dataFlowDuration = 1;
    const dataFlowHeading1 = gsap.timeline({
        scrollTrigger: {
            trigger: sectionTrigger,
            start: "top 75%",
            end: "top top",
            scrub: true,
        }
    });

    dataFlowHeading1
        .to(
            "#home-hero [entrance-content]",
            {
                opacity: 0,
                duration: 0.5,
                ease: "power2.inOut",
            },
            0
        )
        .to(
            "#home-hero .home-hero-visual-desktop",
            {
                y: "10%",
                duration: 0.5,
                ease: "none",
            },
            0
        )
        .to(
            ".ab-kandou_wrap",
            {
                y: "0%",
                duration: 1,
                ease: "power2.inOut",
            },
            0
        )
        .to(
            h1Chars,
            {
                opacity: 1,
                color: "#6adb2b",
                duration: dataFlowDuration * 0.6,
                ease: "power2.inOut",
                stagger: { each: dataFlowDuration / h1Chars.length },
            }, 0
        ).to(
            h1Chars,
            {
                color: (index, target) => target.closest("strong") ? "#6adb2b" : "#fff",
                duration: dataFlowDuration * 0.6,
                ease: "power2.inOut",
                stagger: { each: dataFlowDuration / h1Chars.length },
            },
            0.4 + (dataFlowDuration * 0.4)
        );

    const dataFlowHeading2 = gsap.timeline({
        scrollTrigger: {
            trigger: triggerGroup[0],
            start: "top 80%",
            end: "top 20%",
            // toggleActions: "play none none reverse",
            scrub: true,
        }
    });

    dataFlowHeading2.to(
        dataFlowHeadings[0],
        {
            opacity: 0,
            duration: 0.5,
            ease: "power2.inOut",
        },
        0
    ).to(
        h2Chars,
        {
            opacity: 1,
            color: "#6adb2b",
            duration: dataFlowDuration * 0.6,
            ease: "power2.inOut",
            stagger: { each: dataFlowDuration / h2Chars.length },
        },
        0.2
    ).to(
        h2Chars,
        {
            color: (index, target) => target.closest("strong") ? "#6adb2b" : "#fff",
            duration: dataFlowDuration * 0.6,
            ease: "power2.inOut",
            stagger: { each: dataFlowDuration / h2Chars.length },
        },
        0.5 + (dataFlowDuration * 0.4)
    );

    //the signals card
    const dataSignalsTl = gsap.timeline({
        scrollTrigger: {
            trigger: sectionTrigger,
            start: "top 20%",
            end: "bottom 90%",
            // toggleActions: "play none none reverse"
            scrub: true,
        }
    });
    dataSignalsTl.to(
        dataSignalCards,
        {
            opacity: 1,
            ease: "power2.inOut",
        },
    );
    const dataSignalOuputStable = gsap.timeline({
        scrollTrigger: {
            trigger: triggerGroup[0],
            start: "top 65%",
            end: "top center",
            scrub: true,
        }
    });
    dataSignalOuputStable
        .to(
            "[copper-mimo] p",
            {
                color: "#6adb2b",
                ease: "power2.inOut",
            }, 0
        ).to(
            "#toggle-button-inner",
            {
                x: "100%",
                backgroundColor: "#6adb2b",
                ease: "power2.inOut",
            }, 0
        ).to(
            "[dataflow-signal-output='noise']",
            {
                opacity: 0,
                ease: "power2.inOut",
            }, 0
        ).to(
            "[dataflow-signal-output='stable']",
            {
                opacity: 1,
                ease: "power2.inOut",
            }, 0
        ).to(
            "[dataflow-signal-output='stable'] .char",
            {
                opacity: 1,
                color: "#6adb2b",
                ease: "power2.inOut",
            }, 0
        )
        .to(
            "[dataflow-signal-output='stable'] .char",
            {
                opacity: 1,
                color: "#fff",
                ease: "power2.inOut",
            }, 0.4
        )


    //the powered by card
    let poweredByChars = "#powered-by .char";
    const poweredByTl = gsap.timeline({
        scrollTrigger: {
            trigger: triggerGroup[0],
            start: "top 20%",
            endTrigger: triggerGroup[1],
            end: "top top",
            scrub: true,
        }
    });
    poweredByTl.to(
        dataFlowHeadings,
        {
            opacity: 0,
            ease: "power2.inOut",
        }, 0
    ).to(
        "#toggle-button",
        {
            opacity: 0,
            ease: "power2.inOut",
        }, 0
    ).to(
        dataSignalCards,
        {
            opacity: 0,
            ease: "power2.inOut",
        }, 0
    ).to(
        poweredByChars,
        {
            opacity: 1,
            color: "#6adb2b",
            duration: dataFlowDuration * 0.6,
            ease: "power2.inOut",
            stagger: { each: dataFlowDuration / poweredByChars.length },
        }, 0
    ).to(
        poweredByChars,
        {
            color: (index, target) => target.closest("strong") ? "#6adb2b" : "#fff",
            duration: dataFlowDuration * 0.6,
            ease: "power2.inOut",
            stagger: { each: dataFlowDuration / poweredByChars.length },
        },
        0.4 + (dataFlowDuration * 0.4)
    ).to(
        "#powered-by p",
        {
            opacity: 1,
            duration: 1,
            ease: "power2.inOut",
        },
    )
    //the hbm chips card
    let hbmChipsChars = "#hbm-chips .char";
    const hbmChipsTl = gsap.timeline({
        scrollTrigger: {
            trigger: triggerGroup[1],
            start: "bottom center",
            endTrigger: triggerGroup[2],
            end: "top top",
            scrub: true,
        }
    });
    hbmChipsTl
        .to(
            hbmChipsChars,
            {
                opacity: 1,
                color: "#6adb2b",
                duration: dataFlowDuration * 0.6,
                ease: "power2.inOut",
                stagger: { each: dataFlowDuration / hbmChipsChars.length },
            },
        ).to(
            hbmChipsChars,
            {
                color: (index, target) => target.closest("strong") ? "#6adb2b" : "#fff",
                duration: dataFlowDuration * 0.6,
                ease: "power2.inOut",
                stagger: { each: dataFlowDuration / hbmChipsChars.length },
            },
            0.4 + (dataFlowDuration * 0.4)
        )

    //the new gen ai  card
    let newGenAIChars = "#new-gen-ai .char";
    const newGenAITl = gsap.timeline({
        scrollTrigger: {
            trigger: triggerGroup[2],
            start: "bottom center",
            endTrigger: triggerGroup[3],
            end: "bottom 80%",
            scrub: true,
        }
    });
    newGenAITl
        .to(
            newGenAIChars,
            {
                opacity: 1,
                color: "#6adb2b",
                duration: dataFlowDuration * 0.6,
                ease: "power2.inOut",
                stagger: { each: dataFlowDuration / newGenAIChars.length },
            },
        ).to(
            newGenAIChars,
            {
                color: (index, target) => target.closest("strong") ? "#6adb2b" : "#fff",
                duration: dataFlowDuration * 0.6,
                ease: "power2.inOut",
                stagger: { each: dataFlowDuration / newGenAIChars.length },
            },
            0.4 + (dataFlowDuration * 0.4)
        )

}

// Start polling
initDataFlowText();


/* ── Output-signal "settle" morph ────────────────────────────────────────
   Snap-morph the garbled red Output meter into the clean green square wave
   (shape + colour) fast, when `.trigger` scrolls into view. Driven
   by the `svglink:inlined` event that common/svg-anim.js fires once each
   meter's <svg> tiles exist — no async race, no MutationObserver. Both scroll
   tiles morph in lockstep, so the seamless loop keeps running underneath. */
(() => {
    "use strict";

    /** Mix a hex colour toward white (amt 0→1) → "r, g, b" string. */
    function lighten(hex, amt) {
        let h = hex.replace("#", "");
        if (h.length === 3) h = h.split("").map((c) => c + c).join("");
        const num = parseInt(h.slice(0, 6), 16);
        const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
        const m = (c) => Math.round(c + (255 - c) * amt);
        return `${m(r)}, ${m(g)}, ${m(b)}`;
    }
    /** Hex → "r, g, b" string. */
    const hexRgb = (hex) => lighten(hex, 0);

    // Clean green square-wave targets (same 252×132 viewBox as the red asset).
    const MORPH_FILL_D = "M0 121.8L6.46 7.71997H12.92H19.38H25.85H32.31L38.77 121.8H45.23H51.69H58.15H64.62L71.08 7.71997H77.54H84H90.46H96.92L103.38 121.8H109.85H116.31H122.77H129.23L135.69 7.71997H142.15H148.62H155.08H161.54L168 121.8H174.46H180.92H187.38H193.85L200.31 7.71997H206.77H213.23H219.69H226.15L232.62 121.8H239.08H245.54H252V128H0V121.8Z";
    const MORPH_LINE_D = "M0 121.8L6.46 7.71997H12.92H19.38H25.85H32.31L38.77 121.8H45.23H51.69H58.15H64.62L71.08 7.71997H77.54H84H90.46H96.92L103.38 121.8H109.85H116.31H122.77H129.23L135.69 7.71997H142.15H148.62H155.08H161.54L168 121.8H174.46H180.92H187.38H193.85L200.31 7.71997H206.77H213.23H219.69H226.15L232.62 121.8H239.08H245.54H252";

    function setupOutputMorph(el, sourceStroke) {
        if (el.dataset.morphInit === "1") return;
        if (typeof gsap === "undefined" || typeof MorphSVGPlugin === "undefined") {
            console.warn("[dataflow] morph skipped — gsap / MorphSVGPlugin not loaded");
            return;
        }
        el.dataset.morphInit = "1";
        gsap.registerPlugin(MorphSVGPlugin);
        if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

        const GREEN = "#7FB53F";
        const GLOW_STROKE = `rgb(${lighten(GREEN, 0.5)})`; // matches the trace tint svg-anim builds
        // Offset-first shape (matching the source filter) so GSAP only tweens the
        // rgb channels — a colour-first form makes it misread the colour tokens as
        // x/y offsets and drag the glow sideways mid-scrub.
        const GLOW_FILTER =
            `drop-shadow(0 0 3px rgba(${hexRgb(GREEN)}, 0.75)) drop-shadow(0 0 8px rgba(${hexRgb(GREEN)}, 0.45))`;

        const trigger = document.querySelector(".trigger") || el;
        // Fast snap (not scroll-scrubbed): when the trigger reaches view, play a
        // quick time-based morph and hold; reverse it on scroll back up.
        const MORPH_DUR = 0.4; // seconds — lower = snappier
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger,
                start: "top 60%",
                toggleActions: "play none none reverse",
            },
        });

        el.querySelectorAll(".svglink-track > svg").forEach((svg) => {
            const fill = svg.querySelector('path[fill^="url("]');
            const line = svg.querySelector(`path[stroke="${sourceStroke}"]`);
            const glow = svg.querySelector("path.svglink-trace");
            const stops = svg.querySelectorAll("linearGradient stop");

            if (fill) tl.to(fill, { morphSVG: MORPH_FILL_D, duration: MORPH_DUR, ease: "power2.out" }, 0);
            if (line) tl.to(line, { morphSVG: MORPH_LINE_D, attr: { stroke: GREEN }, duration: MORPH_DUR, ease: "power2.out" }, 0);
            if (glow)
                tl.to(glow, { morphSVG: MORPH_LINE_D, attr: { stroke: GLOW_STROKE }, filter: GLOW_FILTER, duration: MORPH_DUR, ease: "power2.out" }, 0);
            stops.forEach((s) => tl.to(s, { attr: { "stop-color": GREEN }, duration: MORPH_DUR, ease: "power2.out" }, 0));
        });

        if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    }

    /** Opt-in (data-morph="output") or auto-detect the red Output meter. */
    const isOutputMeter = (el, url) =>
        el.dataset.morph === "output" || /red/i.test(url || "");

    // Primary path: react to each meter as svg-anim.js finishes building it.
    document.addEventListener("svglink:inlined", (e) => {
        const { el, url, base } = e.detail || {};
        if (el && isOutputMeter(el, url)) setupOutputMorph(el, base);
    });

    // Fallback: catch meters already inlined before this listener attached
    // (e.g. if this script evaluates after svg-anim.js's fetches resolve).
    function scanExisting() {
        document.querySelectorAll(".svglink-scroller").forEach((el) => {
            if (el.dataset.morphInit === "1") return;
            const url = el.getAttribute("svglink");
            if (!isOutputMeter(el, url)) return;
            // Source line path still carries the base hex stroke; glows use url()/rgb().
            const lp = el.querySelector('.svglink-track > svg path[stroke^="#"]');
            setupOutputMorph(el, lp ? lp.getAttribute("stroke") : "#ff0000");
        });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", scanExisting);
    } else {
        scanExisting();
    }
})();


