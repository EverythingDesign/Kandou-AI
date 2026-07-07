const sectionTrigger = document.querySelector("#dataflow");
const container = document.querySelector("#h-data-container");
const triggerGroup = document.querySelectorAll("[trigger-group='home']");
const rivSrc = "https://cdn.prod.website-files.com/69d76d29d92505bbfe2e7d5f/6a4cd9078594b6c1a567ceaf_kandou_-_homepage_8.riv";

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
        { el: sectionTrigger, from: -1, to: 0, start: "top center", end: "top top" },   // #dataflow: closed ⇄ open
        { el: triggerGroup[0], from: 0, to: 1, start: "top center", end: "top top" },   // group[0]: open ⇄ inside/data flow
        { el: triggerGroup[1], from: 1, to: 2, start: "top center", end: "top top" },   // group[1]: inside ⇄ closing/closed
    ];

    steps.forEach(({ el, from, to, start, end }) => {
        if (!el) return;
        ScrollTrigger.create({
            trigger: el,
            start: start,
            end: end,
            onEnter: () => setStep(to),
            onEnterBack: () => setStep(to),
            onLeaveBack: () => setStep(from),
            // markers: true,
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

    const dataFlowDuration = 1;
    const dataFlowHeading1 = gsap.timeline({
        scrollTrigger: {
            trigger: sectionTrigger,
            start: "top center",
            end: "top top",
            // toggleActions: "play none none reverse"
            scrub: true,
        }
    });

    dataFlowHeading1.to(
        "#home-hero",
        {
            opacity: 0,
            duration: 0.4,
            ease: "power2.inOut",
        },
        0
    ).to(
        h1Chars,
        {
            opacity: 1,
            color: "#6adb2b",
            duration: dataFlowDuration * 0.6,
            ease: "power2.inOut",
            stagger: { each: dataFlowDuration / h1Chars.length },
        },
        0
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
            trigger: triggerGroup[1],
            start: "top bottom",
            end: "top center",
            toggleActions: "play none none reverse",
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
        0.5
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
}

// Start polling
initDataFlowText();


