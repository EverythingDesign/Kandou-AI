function sectionTextAnimation(headingWrap, triggerElement, triggerStart, triggerEnd, endColor = "#ffffff") {

    const headingEl = typeof headingWrap === "string" ? document.querySelector(headingWrap) : headingWrap;

    if (!headingEl) return;
    const heading = /^(H[1-6])$/i.test(headingEl.tagName)
        ? headingEl
        : headingEl.querySelector("h1, h2, h3, h4, h5, h6, [role='heading']");

    if (!heading) return;

    const startColor = "#6adb2b";
    let retries = 0;
    const maxRetries = 100; // Wait up to 2 seconds (100 * 20ms)

    function start() {
        let chars = heading.querySelectorAll(".char");
        let words = heading.querySelectorAll(".word");

        if (chars.length === 0) {
            if (retries < maxRetries) {
                retries++;
                setTimeout(start, 20);
                return;
            }
            // Fallback: if text never splits, animate the heading itself
            chars = [heading];
        }

        // Initial state setup (hide chars immediately so they don't flash before ScrollTrigger)
        gsap.set(headingEl, { opacity: 1 });
        gsap.set(chars, { opacity: 0 });
        gsap.set(words, { opacity: 1 });

        if (typeof ScrollTrigger !== "undefined") {
            gsap.registerPlugin(ScrollTrigger);
        }

        // Set up the ScrollTrigger timeline
        const master = gsap.timeline({
            scrollTrigger: {
                trigger: triggerElement || headingEl,
                start: triggerStart || "top center",
                end: triggerEnd || undefined,
                toggleActions: "play none none none"
            }
        });

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

    }

    start();
}

window.sectionTextAnimation = sectionTextAnimation;