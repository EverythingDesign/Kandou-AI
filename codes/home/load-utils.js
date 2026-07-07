(() => {
    "use strict";

    const isMobileInitial = window.innerWidth <= 1023;

    function cleanResponsiveElements() {
        const width = window.innerWidth;

        if (width <= 1023) {
            // Remove big-screen wraps on mobile/tablet (1023px and below)
            const targets = document.querySelectorAll(
                ".floating-card_wrap_input.is-big-screen, .floating-card_wrap_output.is-big-screen, .home-hero-visual-desktop"
            );
            targets.forEach(el => el.remove());
        } else {
            // Remove small-screen wraps on desktop (1024px and above)
            const targets = document.querySelectorAll(
                ".floating-card_wrap_output.is-small-screen, .home-hero-visual-mobile"
            );
            targets.forEach(el => el.remove());
        }
    }

    function checkBreakpointResize() {
        const isMobileNow = window.innerWidth <= 1023;
        if (isMobileNow !== isMobileInitial) {
            window.location.reload();
        }
    }

    // Run as early as possible
    cleanResponsiveElements();

    // Also run on DOMContentLoaded just in case elements are not fully parsed yet
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", cleanResponsiveElements);
    }

    window.addEventListener("resize", checkBreakpointResize);
})();
