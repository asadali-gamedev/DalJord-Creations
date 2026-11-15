/* ==========================================================================
   DALJORD CREATIONS · core/motion.js
   Every non-3D animation on the site. Opt in with data attributes:

   data-split             cinematic word entrance (use on hero h1)
   data-text-reveal       masked word reveal when a heading enters the viewport
   data-reveal            fade up    data-reveal="clip"  image wipe    data-reveal="zoom"
   data-marquee           endless band that speeds up and skews with scroll
   data-magnetic          button leans toward the cursor
   data-tilt              card tilts in 3D under the cursor (with .game-card__glare)
   data-words             paragraph lights up word by word while scrolling
   data-stack             children shrink as the next card slides over
   data-py                image drifts at a different speed (parallax)
   data-cursor="Label"    custom cursor shows a label over this element
   ========================================================================== */
window.DJ = window.DJ || {};

DJ.motion = (function () {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const mobile = DJ.performance.mobile;
  const scroll = DJ.scroll = { y: scrollY, vel: 0, dir: 1 };
  const tickers = new Set();
  let lastY = scrollY, lastT = performance.now(), frame = 0;
  const visible = new WeakMap();
  const elementTickers = new Map();
  function wake() { if (!reduced && !document.hidden && !frame) frame = requestAnimationFrame(loop); }
  const visibility = new IntersectionObserver(entries => entries.forEach(e => {
    visible.set(e.target, e.isIntersecting);
    e.target.classList.toggle("motion-offscreen", !e.isIntersecting);
    const callbacks = elementTickers.get(e.target);
    if (callbacks) callbacks.forEach(fn => e.isIntersecting ? tickers.add(fn) : tickers.delete(fn));
    if (e.isIntersecting) wake();
  }), { rootMargin: "80px" });

  /* One shared animation loop for everything here. */
  function loop(t) {
    frame = 0;
    if (document.hidden) return;
    const dt = Math.min(50, Math.max(1, t - lastT)); lastT = t;
    const y = scrollY;
    const v = (y - lastY) / dt * 16.7; lastY = y;
    scroll.vel += (v - scroll.vel) * (1 - Math.pow(.88, dt / 16.7));
    if (Math.abs(scroll.vel) < .01) scroll.vel = 0;
    scroll.y = y;
    if (v) scroll.dir = Math.sign(v);
    if (!document.body.classList.contains("menu-open")) tickers.forEach(fn => fn(t, dt));
    if ((!document.body.classList.contains("menu-open") && tickers.size) || scroll.vel) frame = requestAnimationFrame(loop);
  }
  addEventListener("scroll", wake, { passive: true });
  document.addEventListener("dj:menu", e => { if (!e.detail.open) { lastT = performance.now(); wake(); } });
  wake();
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(frame); frame = 0;
    document.documentElement.classList.toggle("page-hidden", document.hidden);
    if (!document.hidden && !reduced) { lastT = performance.now(); lastY = scrollY; scroll.vel = 0; wake(); }
  });

  const tick = (el, fn) => {
    if (!visible.has(el)) { visible.set(el, false); visibility.observe(el); }
    const w = (t, dt) => { if (!el.isConnected) { tickers.delete(w); elementTickers.delete(el); visibility.unobserve(el); return; } fn(t, dt); };
    if (!elementTickers.has(el)) elementTickers.set(el, new Set());
    elementTickers.get(el).add(w);
    if (visible.get(el)) { tickers.add(w); wake(); }
  };
  const io = (cb, opts) => new IntersectionObserver(es => es.forEach(e => e.isIntersecting && cb(e.target, e)), opts || { rootMargin: "0px 0px -12% 0px" });

  /* ---------- text choreography ---------- */
  // Build each word once. Only transform and opacity animate; the actual copy
  // stays intact, and explicit line breaks and nested emphasis are preserved.
  function prepareText(el) {
    if (el.classList.contains("text-reveal")) return;
    if (reduced) { el.classList.add("is-in"); return; }
    const copy = el.cloneNode(true);
    copy.querySelectorAll("br").forEach(br => br.replaceWith(" "));
    el.setAttribute("aria-label", copy.textContent.replace(/\s+/g, " ").trim());
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let index = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).filter(Boolean).forEach(word => {
        if (/^\s+$/.test(word)) { fragment.appendChild(document.createTextNode(word)); return; }
        const mask = document.createElement("span"), ink = document.createElement("span");
        mask.className = "text-word"; mask.setAttribute("aria-hidden", "true");
        ink.className = "text-word__ink"; ink.textContent = word;
        ink.style.setProperty("--word-i", Math.min(index++, 10));
        mask.appendChild(ink); fragment.appendChild(mask);
      });
      node.replaceWith(fragment);
    });
    el.classList.add("text-reveal");
  }

  function split(root) {
    root.querySelectorAll("[data-split]").forEach(el => {
      prepareText(el);
      el.classList.add("is-split");
    });
  }
  function playSplit(root) {
    const ob = io(el => { el.classList.add("is-in"); ob.unobserve(el); });
    root.querySelectorAll(".is-split:not(.is-in)").forEach(el => ob.observe(el));
  }

  function revealText(el) {
    el.classList.remove("text-reveal", "is-in");
    prepareText(el);
    el.classList.add("is-in");
  }

  /* ---------- reveals ---------- */
  function reveals(root) {
    const ob = io(el => { el.classList.add("is-in"); ob.unobserve(el); });
    root.querySelectorAll("[data-reveal]:not(.is-in)").forEach(el => {
      if (reduced) el.classList.add("is-in");
      else if (!el.closest("[data-hero]")) ob.observe(el);
    });
    const text = io(el => { el.classList.add("is-in"); text.unobserve(el); });
    root.querySelectorAll("[data-text-reveal]").forEach(el => { prepareText(el); if (!reduced) text.observe(el); });
    const lp = io(el => el.classList.add("is-in"));
    root.querySelectorAll(".loop").forEach(el => lp.observe(el));
  }

  /* ---------- marquee ---------- */
  function marquees(root) {
    root.querySelectorAll("[data-marquee]").forEach(m => {
      const track = m.querySelector(".marquee__track");
      const item = track.firstElementChild;
      for (let i = 0; i < 3; i++) track.appendChild(item.cloneNode(true)).setAttribute("aria-hidden", "true");
      if (reduced) return;
      const dir = m.dataset.marquee === "reverse" ? 1 : -1;
      let x = 0, skew = 0, width = 1;
      new ResizeObserver(entries => { width = entries[0].contentRect.width || 1; }).observe(item);
      tick(m, (t, dt) => {
        const w = width;
        const boost = Math.min(Math.abs(scroll.vel) * .35, 14);
        x += dir * (0.7 + boost) * (dt / 16.7) * (scroll.dir < 0 ? -1 : 1);
        if (x <= -w) x += w; if (x > 0) x -= w;
        skew += ((mobile ? 0 : Math.max(-12, Math.min(12, scroll.vel * .5))) - skew) * .1;
        track.style.transform = `translate3d(${x}px,0,0) skewX(${-skew}deg)`;
      });
    });
  }

  /* ---------- magnetic buttons ---------- */
  function magnetic(root) {
    if (!fine || reduced) return;
    root.querySelectorAll("[data-magnetic]").forEach(el => {
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transition = "transform .15s ease-out, box-shadow .35s, background .25s, border-color .25s, color .25s";
        el.style.transform = `translate(${x * .28}px, ${y * .38}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transition = ""; el.style.transform = ""; });
    });
  }

  /* ---------- 3D tilt ---------- */
  function tilt(root) {
    if (!fine || reduced) return;
    root.querySelectorAll("[data-tilt]").forEach(card => {
      const glare = card.querySelector(".game-card__glare");
      card.addEventListener("pointermove", e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transition = "transform .12s ease-out, box-shadow .5s, border-color .4s";
        card.style.transform = `rotateY(${(x - .5) * 18}deg) rotateX(${(.5 - y) * 16}deg) translateZ(12px)`;
        if (glare) { glare.style.setProperty("--gx", x * 100 + "%"); glare.style.setProperty("--gy", y * 100 + "%"); }
      });
      card.addEventListener("pointerleave", () => { card.style.transition = ""; card.style.transform = ""; });
    });
  }

  /* ---------- scroll-lit words ---------- */
  function words(root) {
    root.querySelectorAll("[data-words]").forEach(el => {
      const hot = (el.dataset.words || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
      const label = el.textContent.trim();
      el.setAttribute("aria-label", label);
      el.innerHTML = label.split(/\s+/).map(w => `<span class="w${hot.includes(w.toLowerCase().replace(/[^a-z]/g, "")) ? " hot" : ""}" aria-hidden="true">${w}</span>`).join(" ");
      const ws = [...el.querySelectorAll(".w")];
      if (reduced) { ws.forEach(w => w.classList.add("on")); return; }
      let previous = -1;
      tick(el, () => {
        const r = el.getBoundingClientRect();
        const p = (innerHeight * .82 - r.top) / (r.height + innerHeight * .35);
        const n = Math.floor(Math.max(0, Math.min(1, p)) * ws.length * 1.05);
        if (n !== previous) { ws.forEach((w, i) => w.classList.toggle("on", i < n)); previous = n; }
      });
    });
  }

  /* ---------- sticky stack ---------- */
  function stacks(root) {
    if (reduced || mobile) return;
    root.querySelectorAll("[data-stack]").forEach(stack => {
      const items = [...stack.children];
      items.forEach((it, i) => it.style.setProperty("--i", i));
      tick(stack, () => {
        if (innerWidth <= 860) { items.forEach(it => it.style.transform = ""); return; }
        items.forEach((it, i) => {
          const next = items[i + 1];
          if (!next) return;
          const a = it.getBoundingClientRect(), b = next.getBoundingClientRect();
          const p = Math.max(0, Math.min(1, 1 - (b.top - a.top) / a.height));
          it.style.transform = `scale(${1 - p * .06})`;
          it.style.filter = `brightness(${1 - p * .45})`;
        });
      });
    });
  }

  /* ---------- parallax ---------- */
  function parallax(root) {
    if (reduced || mobile) return;
    const els = [...root.querySelectorAll("[data-py]")];
    if (!els.length) return;
    els.forEach(img => tick(img, () => {
      const r = img.parentElement.getBoundingClientRect();
      const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      img.style.setProperty("--py", (t * -(parseFloat(img.dataset.py) || 40)).toFixed(1) + "px");
    }));
  }

  /* ---------- cursor ---------- */
  function cursor() {
    if (!fine || reduced) return;
    const dot = document.createElement("div"), ring = document.createElement("div");
    dot.className = "cursor-dot"; ring.className = "cursor-ring";
    dot.setAttribute("aria-hidden", "true"); ring.setAttribute("aria-hidden", "true");
    document.body.append(dot, ring);
    let mx = -100, my = -100, rx = -100, ry = -100;
    addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY;
      document.documentElement.classList.add("has-cursor");
      const t = e.target.closest && e.target.closest("a,button,[data-cursor],canvas.arena-canvas,.flow__stage,input,label");
      ring.classList.toggle("is-hover", !!t);
      const label = t && t.dataset ? t.dataset.cursor : "";
      if (label) ring.dataset.label = label; else delete ring.dataset.label;
    }, { passive: true });
    addEventListener("pointerdown", () => ring.classList.add("is-down"));
    addEventListener("pointerup", () => ring.classList.remove("is-down"));
    document.addEventListener("mouseleave", () => document.documentElement.classList.remove("has-cursor"));
    tickers.add(() => {
      rx += (mx - rx) * .18; ry += (my - ry) * .18;
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    });
    wake();
  }

  function init(root = document) {
    split(root); reveals(root); marquees(root); magnetic(root); tilt(root); words(root); stacks(root); parallax(root);
    root.querySelectorAll(".loop,.lockbox,.hero,.game-card,.chip").forEach(el => visibility.observe(el));
  }
  function start(root = document) {
    playSplit(root);
    root.querySelectorAll("[data-hero] [data-reveal]").forEach(el => el.classList.add("is-in"));
  }

  return { init, start, cursor, tickers, revealText };
})();
