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

        const master = gsap.timeline();

        // Initial state setup
        gsap.set(headingEl, { opacity: 1 });
        gsap.set(chars, { opacity: 0 });
        gsap.set(words, { opacity: 1 });

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

        // 3. Make secondary opacity 1 after heading finishes
        if (secondaryEl) {
            master.to(
                secondaryEl,
                {
                    opacity: 1,
                    duration: 0.5,
                    ease: "power1.out",
                },
                ">"
            );
        }
    }

    start();
}





// Expose globally to prevent esbuild tree-shaking
window.homeEntranceAnimation = homeEntranceAnimation;
