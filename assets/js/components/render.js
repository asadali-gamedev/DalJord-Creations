/* ==========================================================================
   DALJORD CREATIONS · components/render.js
   Turns the data files (assets/js/data) into page sections.
   Place an empty element with one of these attributes in any page:

   data-render="game-cards"      tilting game cards
   data-render="coverflow"       3D game showcase with drag, arrows and keys
   data-render="project-stack"   sticky stacking project cards
   data-render="board"           development pipeline board
   data-render="timeline"        studio updates (data-limit="1" for the latest only)
   ========================================================================== */
window.DJ = window.DJ || {};

DJ.render = (function () {
  const u = p => DJ.layout.url(p);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const icon = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.6 2.3a1.3 1.3 0 0 0-.6 1.1v17.2c0 .5.2.9.6 1.1L14 12 4.6 2.3Zm10.6 10.9 2.6 2.6-11 6.3 8.4-8.9Zm4-2.4c.8.5.8 1.9 0 2.4l-1.9 1.1-2.7-2.3 2.7-2.3 1.9 1.1ZM6.8 1.9l11 6.3-2.6 2.6-8.4-8.9Z"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/></svg>'
  };
  const stageColor = { concept: "var(--ember)", early: "var(--violet)", development: "var(--cyan)", released: "var(--lime)" };
  const game = id => (DJ.games || []).find(g => g.id === id);

  function storeBtn(g, extra = "") {
    return `<a class="btn btn--store ${extra}" style="--bc:${g.color}" href="${esc(g.store.url)}" target="_blank" rel="noopener" data-magnetic>${icon.play}<span class="btn__label">Get it on ${esc(g.store.name)}</span></a>`;
  }

  /* ---------- game cards ---------- */
  function gameCards(el) {
    el.classList.add("games-grid");
    el.innerHTML = DJ.games.map((g, i) => `
      <article class="game-card" style="--c:${g.color};--d:${i * .1}s" data-tilt data-reveal>
        <div class="game-card__cover">
          <img src="${u(g.image)}" alt="${esc(g.imageAlt)}" width="512" height="512" loading="lazy">
          <span class="chip chip--live game-card__badge">${esc(g.status)}</span>
          <span class="game-card__glare"></span>
        </div>
        <div class="game-card__body">
          <h3>${esc(g.title)}</h3>
          <div class="game-card__meta">${esc(g.genre)} · ${esc(g.platform)}</div>
          <p>${esc(g.summary)}</p>
          ${storeBtn(g)}
        </div>
      </article>`).join("");
  }

  /* ---------- coverflow ---------- */
  function coverflow(el) {
    const G = DJ.games;
    el.classList.add("flow");
    el.innerHTML = `
      <div class="flow__stage" role="region" aria-roledescription="carousel" aria-label="Our games" tabindex="0" data-cursor="Drag">
        <div class="flow__reflect"></div>
        ${G.map((g, i) => `<figure class="flow__item" style="--c:${g.color}" data-i="${i}" aria-hidden="true"><img src="${u(g.image)}" alt="" width="512" height="512"></figure>`).join("")}
      </div>
      <div class="flow__dots">${G.map((g, i) => `<button type="button" aria-label="Show ${esc(g.title)}" data-i="${i}"></button>`).join("")}</div>
      <div class="flow__panel">
        <div aria-live="polite">
          <span class="chip chip--live" data-f="status"></span>
          <h3 data-f="title"></h3>
          <p data-f="summary"></p>
        </div>
        <div class="flow__controls">
          <button class="flow__arrow" type="button" data-dir="-1" aria-label="Previous game">${icon.left}</button>
          <button class="flow__arrow" type="button" data-dir="1" aria-label="Next game">${icon.right}</button>
          <span data-f="store" style="min-width:240px"></span>
        </div>
      </div>`;
    const stage = el.querySelector(".flow__stage"), items = [...el.querySelectorAll(".flow__item")], dots = [...el.querySelectorAll(".flow__dots button")];
    const f = n => el.querySelector(`[data-f="${n}"]`);
    let active = 1 % G.length, drag = null, auto;
    function paint(offset = 0) {
      const w = stage.clientWidth, gap = Math.min(w * .3, 330);
      items.forEach((it, i) => {
        let d = i - active + offset;
        const n = G.length; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
        const ad = Math.abs(d);
        it.style.transform = `translate(-50%,-50%) translateX(${d * gap}px) translateZ(${-ad * 260}px) rotateY(${-d * 38}deg) scale(${1 - ad * .08})`;
        it.style.zIndex = 10 - Math.round(ad * 2);
        it.style.filter = `brightness(${1 - Math.min(ad, 1.5) * .45}) saturate(${1 - Math.min(ad, 1) * .3})`;
        it.style.transition = drag ? "none" : "";
      });
      const g = G[active];
      stage.style.setProperty("--rc", g.color + "88");
      el.querySelector(".flow__reflect").style.background = `radial-gradient(closest-side, ${g.color}88, transparent)`;
      dots.forEach((b, i) => b.setAttribute("aria-current", String(i === active)));
    }
    function select(i) {
      active = (i + G.length) % G.length;
      const g = G[active];
      f("status").textContent = `${g.status} on ${g.store.name}`;
      f("title").textContent = g.title;
      f("summary").textContent = `${g.genre}. ${g.summary}`;
      f("store").innerHTML = storeBtn(g);
      DJ.motion && DJ.motion.scramble && (delete f("title").dataset.done, DJ.motion.scramble(f("title")));
      paint();
    }
    el.querySelectorAll(".flow__arrow").forEach(b => b.addEventListener("click", () => { select(active + +b.dataset.dir); restart(); }));
    dots.forEach(b => b.addEventListener("click", () => { select(+b.dataset.i); restart(); }));
    items.forEach(it => it.addEventListener("click", () => { if (!moved) select(+it.dataset.i); }));
    stage.addEventListener("keydown", e => { if (e.key === "ArrowLeft") select(active - 1); if (e.key === "ArrowRight") select(active + 1); });
    let moved = false;
    stage.addEventListener("pointerdown", e => { drag = { x: e.clientX }; moved = false; stage.setPointerCapture(e.pointerId); stop(); });
    stage.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) moved = true; paint(dx / Math.min(stage.clientWidth * .3, 330)); });
    const end = e => { if (!drag) return; const dx = e.clientX - drag.x; drag = null; if (Math.abs(dx) > 40) { const steps = Math.round(dx / Math.min(stage.clientWidth * .3, 330)) || Math.sign(dx); select(active - steps); } else paint(); restart(); };
    stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function stop() { clearInterval(auto); }
    function restart() { stop(); if (!reduced) auto = setInterval(() => select(active + 1), 5200); }
    stage.addEventListener("mouseenter", stop); stage.addEventListener("mouseleave", restart);
    addEventListener("resize", () => paint());
    select(active); restart();
  }

  /* ---------- project stack ---------- */
  function track(stage) {
    const idx = DJ.stages.findIndex(s => s.id === stage);
    return `<div class="track" aria-label="Development stage: ${esc(DJ.stages[idx].label)}">
      <div class="track__bar">${DJ.stages.map((s, i) => `<span class="${i <= idx ? "on" : ""}"></span>`).join("")}</div>
      <div class="track__labels" aria-hidden="true">${DJ.stages.map((s, i) => `<span class="${i === idx ? "on" : ""}">${esc(s.label)}</span>`).join("")}</div>
    </div>`;
  }
  function projectStack(el) {
    el.classList.add("stack"); el.setAttribute("data-stack", "");
    el.innerHTML = DJ.projects.map(p => {
      const locked = !p.image;
      const art = locked
        ? `<div class="proj__art"><div class="lockbox">${icon.lock}<span class="glitch" data-scramble>Classified</span><span>Revealed when it’s ready</span></div></div>`
        : `<div class="proj__art"><img src="${u(p.image)}" alt="${esc(p.imageAlt)}" loading="lazy" data-py="50"></div>`;
      return `
      <div class="stack__item">
        <article class="proj${locked ? " proj--locked" : ""}" id="${esc(p.id)}" style="--c:${p.color}">
          ${art}
          <div class="proj__body">
            <div><span class="chip chip--${p.stage === "early" ? "early" : p.stage}">${esc(p.statusLabel)}</span></div>
            <h3>${esc(p.title)}</h3>
            <div class="proj__genre">${esc(p.genre)}</div>
            <p>${esc(p.summary)}</p>
            <ul class="pillars" aria-label="Focus">${p.pillars.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
            ${track(p.stage)}
          </div>
        </article>
      </div>`;
    }).join("");
  }

  /* ---------- pipeline board ---------- */
  function board(el) {
    el.classList.add("board");
    el.innerHTML = DJ.stages.map((s, i) => {
      const list = s.id === "released"
        ? DJ.games.map(g => `<a class="ticket" href="${esc(g.store.url)}" target="_blank" rel="noopener"><img src="${u(g.image)}" alt="" width="40" height="40"><span><b>${esc(g.short || g.title)}</b><small>${esc(g.genre)}</small></span></a>`)
        : DJ.projects.filter(p => p.stage === s.id).map(p => `<a class="ticket" href="#${esc(p.id)}">${p.image ? `<img src="${u(p.image)}" alt="" width="40" height="40">` : `<i>?</i>`}<span><b>${esc(p.title)}</b><small>${esc(p.genre)}</small></span></a>`);
      return `<section class="board__col" style="--sc:${stageColor[s.id]};--d:${i * .08}s" data-reveal aria-label="${esc(s.label)}">
        <h3>${esc(s.label)}<span>${list.length}</span></h3><p>${esc(s.text)}</p>${list.join("") || '<p class="muted" style="font-size:.9rem">Nothing here right now.</p>'}</section>`;
    }).join("");
  }

  /* ---------- updates timeline ---------- */
  function timeline(el) {
    const limit = +el.dataset.limit || Infinity;
    const posts = DJ.updates.slice(0, limit);
    const fmt = d => { try { return new Date(d + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return d; } };
    el.classList.add("timeline");
    if (limit !== Infinity) el.classList.add("timeline--compact");
    el.innerHTML = posts.map(p => {
      const g = game(p.game);
      return `
      <article class="post" data-reveal>
        <div>
          <span class="chip chip--development">${esc(p.category)}</span>
          ${p.date ? `<p class="muted" style="margin-top:1rem">${fmt(p.date)}</p>` : ""}
          ${g ? `<a class="post__game" href="${esc(g.store.url)}" target="_blank" rel="noopener"><img src="${u(g.image)}" alt="" width="54" height="54"><span>${esc(g.title)}</span></a>` : ""}
        </div>
        <div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.summary)}</p>
          ${p.points && p.points.length ? `<ul>${p.points.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        </div>
      </article>`;
    }).join("") + (limit === Infinity ? `
      <article class="post post--next" data-reveal>
        <div><h3 style="font-size:1.3rem">More updates on the way</h3><p class="muted" style="margin-top:.6rem">Patch notes, milestones and announcements land here as soon as they’re confirmed.</p></div>
      </article>` : "");
  }

  const map = { "game-cards": gameCards, coverflow, "project-stack": projectStack, board, timeline };
  function all(root = document) {
    root.querySelectorAll("[data-render]").forEach(el => { const fn = map[el.dataset.render]; if (fn && !el.dataset.rendered) { fn(el); el.dataset.rendered = 1; } });
  }
  return { all, icon };
})();
