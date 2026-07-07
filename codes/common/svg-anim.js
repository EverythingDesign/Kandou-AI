
(() => {
  "use strict";

  const SELECTOR = "[svglink]";
  let counter = 0;

  /* NOTE: the stylesheet for .svglink-scroller / -track / -trace lives in
     Webflow's custom CSS (site/page <head>), not here. */

  /** Rewrite internal ids + their references so duplicate copies don't clash. */
  function uniquifyIds(markup, suffix) {
    const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    for (const id of ids) {
      const next = `${id}_${suffix}`;
      markup = markup
        .split(`id="${id}"`).join(`id="${next}"`)   // the definition
        .split(`#${id})`).join(`#${next})`)          // url(#id)
        .split(`#${id}"`).join(`#${next}"`);         // href="#id"
    }
    return markup;
  }

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
  function hexRgb(hex) {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const num = parseInt(h.slice(0, 6), 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }

  /** Extracts the top waveform path coordinates and strips the closing box shape. */
  function cleanWaveformPath(d, vbWidth, vbHeight) {
    const commands = d.match(/[a-df-z][^a-df-z]*/ig);
    if (!commands) return d;

    let currentY = 0;
    let cutIdx = -1;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      const type = cmd[0].toUpperCase();
      const coords = (cmd.slice(1).match(/-?[\d.]+/g) || []).map(Number);

      if (type === 'M' || type === 'L') {
        currentY = coords[1];
      } else if (type === 'V') {
        currentY = coords[0];
      }

      if (currentY > vbHeight + 10) {
        cutIdx = i;
      }
    }

    if (cutIdx === -1) return d;

    // Scan forward from cutIdx + 1 to find the first coordinate in the normal view area
    let startIdx = cutIdx + 1;
    for (let i = cutIdx + 1; i < commands.length; i++) {
      const cmd = commands[i];
      const type = cmd[0].toUpperCase();
      const coords = (cmd.slice(1).match(/-?[\d.]+/g) || []).map(Number);

      let y = currentY;
      if (type === 'M' || type === 'L') {
        y = coords[1];
      } else if (type === 'V') {
        y = coords[0];
      }

      if (y <= vbHeight) {
        // Skip purely vertical line going up (which closes the right box side)
        if (type === 'L' || type === 'M') {
          startIdx = i;
          break;
        }
      }
    }

    if (startIdx >= commands.length) return d;

    const waveform = commands.slice(startIdx).filter(c => c[0].toUpperCase() !== 'Z');

    // Convert first coordinate to Move (M) command and cap X coordinates to [0, vbWidth]
    for (let i = 0; i < waveform.length; i++) {
      const cmd = waveform[i];
      const type = cmd[0].toUpperCase();
      const coords = (cmd.slice(1).match(/-?[\d.]+/g) || []).map(Number);

      if (type === 'M' || type === 'L') {
        let x = coords[0];
        let y = coords[1];
        if (x > vbWidth) x = vbWidth;
        if (x < 0) x = 0;
        waveform[i] = `${i === 0 ? 'M' : type}${x} ${y}`;
      } else if (type === 'H') {
        let x = coords[0];
        if (x > vbWidth) x = vbWidth;
        if (x < 0) x = 0;
        waveform[i] = `H${x}`;
      }
    }

    return waveform.join('');
  }

  /** Separate fill and stroke paths. Clean stroke to remove side/bottom lines. Add bottom stroke & glow trace. */
  function processSvgPaths(svg, base, glowOn, id) {
    const vbAttr = svg.getAttribute("viewBox") || "0 0 260 117";
    const vb = vbAttr.split(/\s+/).map(Number);
    const vbWidth = vb[2] || 260;
    const vbHeight = vb[3] || 117;

    const paths = svg.querySelectorAll("path");
    paths.forEach(src => {
      const d = src.getAttribute("d");
      const hasFill = src.getAttribute("fill") && src.getAttribute("fill") !== "none";
      const hasStroke = src.getAttribute("stroke") && src.getAttribute("stroke") !== "none";

      if (hasFill && hasStroke) {
        // Keep the original path completely untouched (fill + stroke are preserved)

        // Add the glowing trace by cloning the path and cleaning it to only follow the top waveform.
        if (glowOn) {
          // Create a fading gradient so the glow fades out at the left/right boundaries of the SVG
          const defs = svg.querySelector("defs") || svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "defs"));
          const gradId = `glow-grad-${id}`;

          if (!defs.querySelector(`#${gradId}`)) {
            const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
            grad.setAttribute("id", gradId);
            grad.setAttribute("x1", "0%");
            grad.setAttribute("y1", "0%");
            grad.setAttribute("x2", "100%");
            grad.setAttribute("y2", "0%");

            const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            s1.setAttribute("offset", "0%");
            s1.setAttribute("stop-color", `rgb(${lighten(base, 0.5)})`);
            s1.setAttribute("stop-opacity", "0");

            const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            s2.setAttribute("offset", "2%");
            s2.setAttribute("stop-color", `rgb(${lighten(base, 0.5)})`);
            s2.setAttribute("stop-opacity", "1");

            const s3 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            s3.setAttribute("offset", "98%");
            s3.setAttribute("stop-color", `rgb(${lighten(base, 0.5)})`);
            s3.setAttribute("stop-opacity", "1");

            const s4 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            s4.setAttribute("offset", "100%");
            s4.setAttribute("stop-color", `rgb(${lighten(base, 0.5)})`);
            s4.setAttribute("stop-opacity", "0");

            grad.appendChild(s1);
            grad.appendChild(s2);
            grad.appendChild(s3);
            grad.appendChild(s4);
            defs.appendChild(grad);
          }

          const glow = src.cloneNode(false);
          glow.removeAttribute("id");
          glow.setAttribute("fill", "none");
          glow.setAttribute("stroke", `url(#${gradId})`);
          glow.setAttribute("stroke-width", "1");
          glow.setAttribute("stroke-linecap", "round");
          glow.setAttribute("stroke-linejoin", "round");
          glow.setAttribute("pathLength", "100");        // normalize length → dash in %
          glow.setAttribute("stroke-dasharray", "8 92"); // one ~8%-long lit segment
          glow.classList.add("svglink-trace");
          glow.style.filter =
            `drop-shadow(0 0 3px rgba(${hexRgb(base)}, 0.75)) drop-shadow(0 0 8px rgba(${hexRgb(base)}, 0.45))`;


          const cleanedD = cleanWaveformPath(d, vbWidth, vbHeight);
          glow.setAttribute("d", cleanedD);

          src.parentNode.insertBefore(glow, src.nextSibling);
        }
      } else if (hasStroke) {
        // If the SVG is already split in Figma (stroke-only path):
        // Just add the glow trace to it directly.
        if (glowOn) {
          const glow = src.cloneNode(false);
          glow.removeAttribute("id");
          glow.setAttribute("fill", "none");
          glow.setAttribute("stroke", `rgb(${lighten(base, 0.5)})`);
          glow.setAttribute("stroke-width", "1");
          glow.setAttribute("stroke-linecap", "round");
          glow.setAttribute("stroke-linejoin", "round");
          glow.setAttribute("pathLength", "100");
          glow.setAttribute("stroke-dasharray", "8 92");
          glow.classList.add("svglink-trace");
          glow.style.filter =
            `drop-shadow(0 0 3px rgba(${hexRgb(base)}, 0.75)) drop-shadow(0 0 8px rgba(${hexRgb(base)}, 0.45))`;
          src.parentNode.appendChild(glow);
        }
      }
    });
  }

  /* ── Output-signal "settle" morph ────────────────────────────────────────
     Scrub-morph the garbled red Output meter into the clean green square wave
     (shape + colour) as `.trigger` scrolls from the viewport bottom (top
     bottom) to the top (top top). Called straight after the meter is built, so
     its <svg> tiles already exist — no async race, no MutationObserver. Both
     scroll tiles morph in lockstep, so the seamless loop + horizontal scroll
     keep running underneath. */

  // Clean green square-wave targets (same 252×132 viewBox as the red asset).
  const MORPH_FILL_D = "M0 121.8L6.46 7.71997H12.92H19.38H25.85H32.31L38.77 121.8H45.23H51.69H58.15H64.62L71.08 7.71997H77.54H84H90.46H96.92L103.38 121.8H109.85H116.31H122.77H129.23L135.69 7.71997H142.15H148.62H155.08H161.54L168 121.8H174.46H180.92H187.38H193.85L200.31 7.71997H206.77H213.23H219.69H226.15L232.62 121.8H239.08H245.54H252V128H0V121.8Z";
  const MORPH_LINE_D = "M0 121.8L6.46 7.71997H12.92H19.38H25.85H32.31L38.77 121.8H45.23H51.69H58.15H64.62L71.08 7.71997H77.54H84H90.46H96.92L103.38 121.8H109.85H116.31H122.77H129.23L135.69 7.71997H142.15H148.62H155.08H161.54L168 121.8H174.46H180.92H187.38H193.85L200.31 7.71997H206.77H213.23H219.69H226.15L232.62 121.8H239.08H245.54H252";

  function setupOutputMorph(el, sourceStroke) {
    if (el.dataset.morphInit === "1") return;
    if (typeof gsap === "undefined" || typeof MorphSVGPlugin === "undefined") {
      console.warn("[svglink] morph skipped — gsap / MorphSVGPlugin not loaded");
      return;
    }
    el.dataset.morphInit = "1";
    gsap.registerPlugin(MorphSVGPlugin);
    if (typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

    const GREEN = "#7FB53F";
    const GLOW_STROKE = `rgb(${lighten(GREEN, 0.5)})`; // matches the trace tint utils builds
    // Same offset-first shape utils builds the source filter in, so GSAP only
    // tweens the rgb channels — a color-first form makes it misread the colour
    // tokens as x/y offsets and drag the glow sideways mid-scrub.
    const GLOW_FILTER =
      `drop-shadow(0 0 3px rgba(${hexRgb(GREEN)}, 0.75)) drop-shadow(0 0 8px rgba(${hexRgb(GREEN)}, 0.45))`;

    const trigger = document.querySelector(".trigger") || el;
    const tl = gsap.timeline({
      scrollTrigger: { trigger, start: "top bottom", end: "top center", scrub: true },
    });

    el.querySelectorAll(".svglink-track > svg").forEach((svg) => {
      const fill = svg.querySelector('path[fill^="url("]');
      const line = svg.querySelector(`path[stroke="${sourceStroke}"]`);
      const glow = svg.querySelector("path.svglink-trace");
      const stops = svg.querySelectorAll("linearGradient stop");

      // svglink-trace animates dashoffset → +100, sweeping the lit segment
      // right→left; reverse it so the glow travels left→right on this meter.
      if (glow) glow.style.animationDirection = "reverse";

      if (fill) tl.to(fill, { morphSVG: MORPH_FILL_D, ease: "none" }, 0);
      if (line) tl.to(line, { morphSVG: MORPH_LINE_D, attr: { stroke: GREEN }, ease: "none" }, 0);
      if (glow)
        tl.to(glow, { morphSVG: MORPH_LINE_D, attr: { stroke: GLOW_STROKE }, filter: GLOW_FILTER, ease: "none" }, 0);
      stops.forEach((s) => tl.to(s, { attr: { "stop-color": GREEN }, ease: "none" }, 0));
    });

    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }

  /** Parse an SVG string into a fill-the-box <svg> node. */
  function svgFromMarkup(markup) {
    const tpl = document.createElement("template");
    tpl.innerHTML = markup;
    const svg = tpl.content.querySelector("svg");
    if (!svg) return null;
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    return svg;
  }

  async function inlineOne(el) {
    const url = el.getAttribute("svglink");
    if (!url || el.dataset.svgInlined === "1" || el.querySelector("svg")) return;
    el.dataset.svgInlined = "1"; // claim up front so a re-run can't double-fetch

    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw = (await res.text()).trim();
      if (!/<svg[\s>]/i.test(raw)) throw new Error("not an SVG");

      const id = ++counter;
      const track = document.createElement("div");
      track.className = "svglink-track";

      // glow that runs along the path (unless disabled); tint from stroke colour
      const glowOn = el.getAttribute("data-glow") !== "off";
      const sm = raw.match(/stroke="(#[0-9a-fA-F]{3,8})"/i);
      const base = sm ? sm[1] : "#ffffff";
      if (glowOn) {
        const gs = parseFloat(el.getAttribute("data-glow-speed"));
        if (Number.isFinite(gs) && gs > 0) el.style.setProperty("--svglink-glow", `${gs}s`);
      }

      // two identical tiles → translate by one tile → seamless infinite loop
      for (let copy = 0; copy < 2; copy++) {
        const svg = svgFromMarkup(uniquifyIds(raw, `m${id}_${copy}`));
        if (!svg) throw new Error("inject failed");
        processSvgPaths(svg, base, glowOn, id);
        track.appendChild(svg);
      }

      const speed = parseFloat(el.getAttribute("data-speed"));
      if (Number.isFinite(speed) && speed > 0) {
        el.style.setProperty("--svglink-speed", `${speed}s`);
      }

      el.classList.add("svglink-scroller");
      el.replaceChildren(track);

      // Opt-in (data-morph) or auto-detect the red Output meter → settle morph.
      if (el.dataset.morph === "output" || /red/i.test(url)) {
        setupOutputMorph(el, base);
      }

    } catch (err) {
      el.dataset.svgInlined = ""; // release so a later refresh() can retry
      console.warn(`[svglink] failed for`, url, err);
    }
  }

  /** Inline + animate every not-yet-processed [svglink] on the page. */
  function refresh(root = document) {
    root.querySelectorAll(SELECTOR).forEach(inlineOne);
  }



  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      refresh();
    });
  } else {
    refresh();
  }

  // public hook for CMS-rendered / dynamically added meters
  window.SvgLink = { refresh };
})();
