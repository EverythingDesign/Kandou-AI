
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
          glow.setAttribute("pathLength", "100");         // normalize path to 100 → dash reads as %
          glow.setAttribute("stroke-dasharray", "8 92"); // one ~8%-long lit segment
          glow.style.animationDirection = "reverse";     // glow travels left→right
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
          glow.setAttribute("pathLength", "100");         // normalize path to 100 → dash reads as %
          glow.setAttribute("stroke-dasharray", "8 92");
          glow.style.animationDirection = "reverse";      // glow travels left→right
          glow.classList.add("svglink-trace");
          glow.style.filter =
            `drop-shadow(0 0 3px rgba(${hexRgb(base)}, 0.75)) drop-shadow(0 0 8px rgba(${hexRgb(base)}, 0.45))`;
          src.parentNode.appendChild(glow);
        }
      }
    });
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

      // Meter is built — notify listeners (e.g. home/dataflow-anim.js) so
      // page-specific behaviour (the Output settle morph) can hook in.
      el.dispatchEvent(new CustomEvent("svglink:inlined", {
        bubbles: true,
        detail: { el, url, base },
      }));

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
