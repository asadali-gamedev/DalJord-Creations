/* ==========================================================================
   DALJORD CREATIONS · components/chain-demo.js
   A small browser game inspired by Chain Reactor: Tap Puzzle.
   Add <div data-chain-demo></div> to any page to place it.
   Tune difficulty in LEVELS: [orbs on screen, orbs needed].
   ========================================================================== */
window.DJ = window.DJ || {};

DJ.chainDemo = (function () {
  const LEVELS = [[10, 3], [14, 6], [18, 9], [24, 14], [30, 20], [36, 26], [42, 33], [50, 42]];
  const COLS = ["#36e6ff", "#ff46d6", "#ff8a2a", "#9b6bff", "#7dff9a"];
  const CALLS = [[5, "Nice"], [10, "Combo"], [16, "Huge"], [24, "Unreal"], [34, "Legendary"]];

  function mount(host) {
    host.innerHTML = `
      <div class="arena">
        <canvas class="arena-canvas" tabindex="0" aria-label="Chain reaction demo. Use the arrow keys to aim and Enter or Space to drop a blast." data-cursor="Tap"></canvas>
        <div class="arena__hud" aria-hidden="true">
          <span>Level <b data-h="lvl">1</b></span>
          <span><b data-h="caught">0</b> of <b data-h="target">3</b> caught</span>
          <span class="is-dim">Best <b data-h="best">1</b></span>
        </div>
        <div class="arena__panel">
          <div><h3 data-h="title">Ready?</h3><p data-h="text"></p><button class="btn btn--main" type="button" data-h="btn"><span class="btn__label">Start</span></button></div>
        </div>
      </div>
      <p class="arena__note" aria-live="polite" data-h="status">On a keyboard, aim with the arrow keys and press Enter.</p>`;
    const $ = n => host.querySelector(`[data-h="${n}"]`);
    const arena = host.querySelector(".arena"), cvs = host.querySelector("canvas"), ctx = cvs.getContext("2d"), panel = host.querySelector(".arena__panel");
    let W = 0, H = 0, S = 0, level = 0, best = 1, orbs = [], blasts = [], pops = [], sparks = [], state = "idle", caught = 0, target = 3, lastCall = 0;
    let aim = { x: .5, y: .5 }, showAim = false, visible = false, raf = 0, last = 0, callout = null;
    try { best = +localStorage.getItem("dj-chain-best") || 1; } catch (e) {}
    $("best").textContent = best;
    const sprites = {};
    const sprite = c => {
      if (sprites[c]) return sprites[c];
      const s = document.createElement("canvas"); s.width = s.height = 64; const g = s.getContext("2d");
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "#fff"); gr.addColorStop(.18, c); gr.addColorStop(.45, c + "55"); gr.addColorStop(1, c + "00");
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return sprites[c] = s;
    };
    const ease = t => 1 - Math.pow(1 - t, 3);

    function size() {
      const r = arena.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      const ow = W, oh = H; W = r.width; H = r.height; S = Math.min(W, H);
      cvs.width = W * dpr; cvs.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ow) orbs.forEach(o => { o.x *= W / ow; o.y *= H / oh; });
      draw();
    }
    function setup() {
      const [n, t] = LEVELS[Math.min(level, LEVELS.length - 1)], extra = Math.max(0, level - LEVELS.length + 1);
      const count = n + extra * 4; target = Math.min(count - 2, t + extra * 4);
      orbs = []; blasts = []; pops = []; sparks = []; caught = 0; lastCall = 0;
      const r = Math.max(5, S * .014), sp = S * .16;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2, v = sp * (.6 + Math.random() * .6);
        orbs.push({ x: r + Math.random() * (W - 2 * r), y: r + 40 + Math.random() * (H - 2 * r - 40), vx: Math.cos(a) * v, vy: Math.sin(a) * v, r, c: COLS[i % COLS.length], dead: false });
      }
      $("lvl").textContent = level + 1; $("caught").textContent = 0; $("target").textContent = target;
    }
    function message(title, text, btn) { $("title").textContent = title; $("text").textContent = text; $("btn").querySelector(".btn__label").textContent = btn; panel.inert = false; panel.classList.remove("is-hidden"); }
    function begin() { panel.classList.add("is-hidden"); panel.inert = true; state = "aim"; $("status").textContent = "Tap the arena to drop your blast."; cvs.focus({ preventScroll: true }); }
    $("btn").addEventListener("click", () => {
      if (state === "aim" || state === "run") return;
      if (state === "won") level++;
      if (state === "won" || state === "lost") setup();
      begin();
    });
    const blastAt = (x, y, c, user) => blasts.push({ x, y, r: 0, max: S * (user ? .095 : .085), t: 0, c });
    function fire(x, y) { if (state !== "aim") return; state = "run"; showAim = false; blastAt(x, y, "#ffffff", true); $("status").textContent = "Chain running"; }
    cvs.addEventListener("pointerdown", e => { const r = cvs.getBoundingClientRect(); fire(e.clientX - r.left, e.clientY - r.top); });
    cvs.addEventListener("pointermove", e => { const r = cvs.getBoundingClientRect(); aim.x = (e.clientX - r.left) / W; aim.y = (e.clientY - r.top) / H; showAim = e.pointerType === "mouse"; });
    cvs.addEventListener("pointerleave", () => showAim = false);
    cvs.addEventListener("keydown", e => {
      const k = e.key, st = .04;
      if (k.startsWith("Arrow")) {
        e.preventDefault(); showAim = true;
        if (k === "ArrowLeft") aim.x = Math.max(0, aim.x - st); if (k === "ArrowRight") aim.x = Math.min(1, aim.x + st);
        if (k === "ArrowUp") aim.y = Math.max(0, aim.y - st); if (k === "ArrowDown") aim.y = Math.min(1, aim.y + st);
      }
      if (k === "Enter" || k === " ") { e.preventDefault(); if (state === "aim") fire(aim.x * W, aim.y * H); else if (!panel.classList.contains("is-hidden")) $("btn").click(); }
    });

    function update(dt) {
      for (const o of orbs) {
        if (o.dead) continue;
        o.x += o.vx * dt; o.y += o.vy * dt;
        if (o.x < o.r || o.x > W - o.r) { o.vx *= -1; o.x = Math.min(Math.max(o.x, o.r), W - o.r); }
        if (o.y < o.r || o.y > H - o.r) { o.vy *= -1; o.y = Math.min(Math.max(o.y, o.r), H - o.r); }
      }
      for (const b of blasts) {
        b.t += dt;
        b.r = b.t < .22 ? b.max * ease(b.t / .22) : b.t < 1.22 ? b.max : b.max * (1 - (b.t - 1.22) / .3);
        if (b.t < 1.22) for (const o of orbs) {
          if (o.dead) continue;
          const dx = o.x - b.x, dy = o.y - b.y;
          if (dx * dx + dy * dy < (b.r + o.r) ** 2) {
            o.dead = true; caught++; $("caught").textContent = caught;
            blastAt(o.x, o.y, o.c); pops.push({ x: o.x, y: o.y, t: 0, n: caught });
            for (let s = 0; s < 10; s++) { const a = Math.random() * Math.PI * 2, v = S * (.2 + Math.random() * .5); sparks.push({ x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, c: o.c }); }
            const call = CALLS.filter(c => caught >= c[0]).pop();
            if (call && call[0] > lastCall) { lastCall = call[0]; callout = { text: call[1], t: 0 }; arena.classList.remove("is-shake"); void arena.offsetWidth; arena.classList.add("is-shake"); }
          }
        }
      }
      for (const s of sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .94; s.vy *= .94; }
      blasts = blasts.filter(b => b.t < 1.52); pops = pops.filter(p => (p.t += dt) < .9); sparks = sparks.filter(s => s.t < .6);
      if (callout && (callout.t += dt) > 1.1) callout = null;
      if (state === "run" && !blasts.length) {
        if (caught >= target) {
          state = "won"; best = Math.max(best, level + 2); $("best").textContent = best;
          try { localStorage.setItem("dj-chain-best", best); } catch (e) {}
          message("Level cleared", `You caught ${caught} orbs. The next level adds more orbs and a higher target.`, "Next level");
          $("status").textContent = `Level ${level + 1} cleared with ${caught} orbs.`;
        } else {
          state = "lost"; message("So close", `You caught ${caught} of the ${target} you needed. Try a different spot.`, "Try again");
          $("status").textContent = `Caught ${caught} of ${target}. Try again.`;
        }
      }
    }
    function draw() {
      if (!W) return;
      const bg = ctx.createRadialGradient(W / 2, H * .55, 0, W / 2, H * .55, Math.max(W, H) * .75);
      bg.addColorStop(0, "#1a1046"); bg.addColorStop(1, "#070418"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(124,100,255,.08)"; ctx.lineWidth = 1; const gs = S / 10;
      ctx.beginPath(); for (let x = gs / 2; x < W; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, H); } for (let y = gs / 2; y < H; y += gs) { ctx.moveTo(0, y); ctx.lineTo(W, y); } ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      for (const b of blasts) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(1, b.r));
        g.addColorStop(0, b.c + "30"); g.addColorStop(.8, b.c + "22"); g.addColorStop(1, b.c + "66");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0, b.r), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = b.c + "cc"; ctx.lineWidth = 2; ctx.stroke();
      }
      for (const s of sparks) { const z = (1 - s.t / .6) * S * .025; ctx.drawImage(sprite(s.c), s.x - z / 2, s.y - z / 2, z, z); }
      for (const o of orbs) { if (o.dead) continue; const s = o.r * 5; ctx.drawImage(sprite(o.c), o.x - s / 2, o.y - s / 2, s, s); }
      ctx.globalCompositeOperation = "source-over";
      ctx.textAlign = "center"; ctx.font = `700 ${Math.round(S * .034)}px Unbounded, Arial, sans-serif`;
      for (const p of pops) { ctx.fillStyle = `rgba(236,233,255,${1 - p.t / .9})`; ctx.fillText("+" + p.n, p.x, p.y - 14 - p.t * 24); }
      if (callout) {
        const p = callout.t / 1.1, sc = 1 + ease(Math.min(1, p * 4)) * .2;
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc);
        ctx.font = `800 ${Math.round(S * .12)}px Unbounded, Arial, sans-serif`;
        ctx.globalAlpha = 1 - Math.max(0, p - .6) / .4;
        const g = ctx.createLinearGradient(-S * .3, 0, S * .3, 0); g.addColorStop(0, "#ff46d6"); g.addColorStop(1, "#36e6ff");
        ctx.fillStyle = g; ctx.shadowColor = "#ff46d6"; ctx.shadowBlur = 30; ctx.fillText(callout.text, 0, S * .04);
        ctx.restore();
      }
      if (state === "aim" && showAim) {
        const x = aim.x * W, y = aim.y * H, r = S * .095;
        ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.setLineDash([5, 6]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
      }
    }
    function loop(ts) {
      if (!visible) { raf = 0; return; }
      const dt = Math.min((ts - (last || ts)) / 1000, .04); last = ts;
      update(dt); draw(); raf = requestAnimationFrame(loop);
    }
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) { last = 0; raf = requestAnimationFrame(loop); } }).observe(arena);
    new ResizeObserver(size).observe(arena);
    size(); setup();
    $("text").textContent = `Catch ${target} of ${orbs.length} orbs with a single blast.`;
  }

  function all(root = document) { root.querySelectorAll("[data-chain-demo]").forEach(h => { if (!h.dataset.mounted) { h.dataset.mounted = 1; mount(h); } }); }
  return { all };
})();
