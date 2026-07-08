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


// Expose globally to prevent esbuild tree-shaking
window.homeEntranceAnimation = homeEntranceAnimation;
