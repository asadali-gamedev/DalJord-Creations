/* ==========================================================================
   DALJORD CREATIONS · core/layout.js
   Builds the shared header and footer from DJ.site, runs the boot loader on
   the first visit, plays the curtain transition between pages and drives the
   navigation (mobile menu, active link, hide on scroll, progress bar).
   ========================================================================== */
window.DJ = window.DJ || {};

DJ.layout = (function () {
  const site = DJ.site;
  const body = document.body;
  const base = body.dataset.base || "";
  const page = body.dataset.page || "home";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const url = (p) => (/^(https?:|mailto:|#)/.test(p) ? p : base + p);
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  const icons = {
    arrowUp: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
  };

  /* ---------- header ---------- */
  function header() {
    const links = site.nav.map((n, i) => `
      <li><a href="${url(n.href)}"${n.page === page ? ' aria-current="page"' : ""}><span class="nav__num">0${i + 1}</span>${n.label}</a></li>`).join("");
    const el = document.createElement("header");
    el.className = "nav";
    el.innerHTML = `
      <div class="nav__in">
        <a class="brand" href="${url("index.html")}" aria-label="${site.name} home">
          <img src="${url("assets/images/brand/icon-180.png")}" alt="" width="40" height="40"><span>${site.name}</span>
        </a>
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav-links"><span class="menu-btn__icon" aria-hidden="true"></span><span>Menu</span></button>
        <nav aria-label="Main"><ul class="nav__links" id="nav-links">${links}</ul></nav>
      </div>
      <div class="scroll-progress" aria-hidden="true"></div>`;
    body.prepend(el);
    return el;
  }

  /* ---------- footer ---------- */
  function footer() {
    const el = document.createElement("footer");
    el.className = "footer";
    const games = (DJ.games || []).map(g => `<li><a href="${g.store.url}" target="_blank" rel="noopener">${g.short || g.title}</a></li>`).join("");
    const explore = site.nav.filter(n => n.page !== "home").map(n => `<li><a href="${url(n.href)}">${n.label}</a></li>`).join("");
    const social = (site.social || []).map(s => `<li><a href="${s.href}" target="_blank" rel="noopener">${s.label}</a></li>`).join("");
    const legal = (site.legal || []).map(l => `<a href="${url(l.href)}">${l.label}</a>`).join(" · ");
    el.innerHTML = `
      <div class="wrap">
        <div class="footer__cta">
          <h2>Ready to play something new?</h2>
          <a class="btn btn--main" data-magnetic href="${url("games/index.html")}"><span class="btn__label">Browse our games</span></a>
        </div>
        <div class="footer__grid">
          <div class="footer__about">
            <a class="brand" href="${url("index.html")}"><img src="${url("assets/images/brand/icon-180.png")}" alt="" width="40" height="40"><span>${site.name}</span></a>
            <p>${site.description}</p>
          </div>
          <div><h3>Explore</h3><ul>${explore}</ul></div>
          <div><h3>Play</h3><ul>${games}</ul></div>
          <div><h3>Contact</h3><ul><li><a href="mailto:${site.email}">Email the studio</a></li>${social}</ul></div>
        </div>
      </div>
      <div class="footer__word" aria-hidden="true">DALJORD</div>
      <div class="wrap footer__bottom">
        <span>© ${new Date().getFullYear()} ${site.name}. ${site.tagline}.</span>
        ${legal ? `<span>${legal}</span>` : ""}
        <button class="to-top" type="button">${icons.arrowUp}Back to top</button>
      </div>`;
    body.appendChild(el);
    el.querySelector(".to-top").addEventListener("click", () => scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));
    const word = el.querySelector(".footer__word");
    if (!DJ.performance.mobile && !reduced) word.parentElement.addEventListener("pointermove", e => {
      const r = word.getBoundingClientRect();
      word.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      word.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    });
    return el;
  }

  /* ---------- nav behaviour ---------- */
  function navBehaviour(nav) {
    const btn = nav.querySelector(".menu-btn");
    const bar = nav.querySelector(".scroll-progress");
    const links = nav.querySelector(".nav__links"), mobileMenu = matchMedia("(max-width: 860px)");
    const setOpen = (o) => {
      body.classList.toggle("menu-open", o); btn.setAttribute("aria-expanded", String(o));
      if (DJ.world && DJ.world.setCovered) DJ.world.setCovered(o);
      document.dispatchEvent(new CustomEvent("dj:menu", { detail: { open: o } }));
      links.inert = mobileMenu.matches && !o;
      document.querySelectorAll("main.page,footer.footer").forEach(el => el.inert = o);
      if (o) nav.classList.remove("is-hidden");
    };
    mobileMenu.addEventListener("change", () => setOpen(false));
    setOpen(false);
    btn.addEventListener("click", () => setOpen(!body.classList.contains("menu-open")));
    nav.querySelectorAll(".nav__links a").forEach(a => a.addEventListener("click", () => setOpen(false)));
    addEventListener("keydown", e => {
      if (!body.classList.contains("menu-open")) return;
      if (e.key === "Escape") { setOpen(false); btn.focus(); }
      if (e.key === "Tab") {
        const controls = [...nav.querySelectorAll("a,button")], first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    let lastY = scrollY;
    const onScroll = () => {
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      nav.classList.toggle("is-solid", y > 30);
      nav.classList.toggle("is-hidden", y > lastY + 4 && y > innerHeight * .9 && !body.classList.contains("menu-open"));
      if (y < lastY - 4) nav.classList.remove("is-hidden");
      lastY = y;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    };
    let scrollFrame = 0;
    addEventListener("scroll", () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; onScroll(); }); }, { passive: true });
    onScroll();
  }

  /* ---------- curtain transitions ---------- */
  function curtain() {
    const el = document.createElement("div");
    el.className = "curtain";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "<span></span>".repeat(5);
    body.appendChild(el);
    if (reduced || DJ.performance.mobile) return el;
    document.addEventListener("click", e => {
      const a = e.target.closest("a");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target === "_blank" || a.hasAttribute("download") || a.dataset.noTransition !== undefined) return;
      if (a.protocol !== location.protocol || a.host !== location.host) return;
      if (a.pathname === location.pathname && a.hash) return;
      if (!/\.html?$|\/$/.test(a.pathname)) return;
      e.preventDefault();
      el.classList.remove("is-reveal");
      el.classList.add("is-cover");
      DJ.world && DJ.world.burst && DJ.world.burst();
      setTimeout(() => { location.href = a.href; }, 680);
    });
    addEventListener("pageshow", e => { if (e.persisted) el.classList.remove("is-cover"); });
    return el;
  }

  /* ---------- boot loader (first visit in a session) ---------- */
  function boot() {
    const first = !store.get("dj-booted") && !reduced && !DJ.performance.mobile;
    if (!first) return { first: false, progress() {}, finish: () => Promise.resolve() };
    store.set("dj-booted", "1");
    const el = document.createElement("div");
    el.className = "boot";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="boot__inner">
        <img class="boot__icon" src="${url("assets/images/brand/icon-180.png")}" alt="">
        <div class="boot__count">000</div>
        <div class="boot__bar"><i></i></div>
        <div class="boot__msg">Powering up the studio</div>
      </div>`;
    body.appendChild(el);
    const count = el.querySelector(".boot__count"), fill = el.querySelector(".boot__bar i"), msg = el.querySelector(".boot__msg");
    const lines = ["Powering up the studio", "Charging the neon", "Loading the games", "Work hard. Play harder."];
    let target = 0, shown = 0, done = null;
    const t0 = performance.now();
    (function tick() {
      shown += (target - shown) * .12;
      const minTime = Math.min(1, (performance.now() - t0) / 1400);
      const v = Math.min(shown, minTime * 100);
      count.textContent = String(Math.round(v)).padStart(3, "0");
      fill.style.width = v + "%";
      msg.textContent = lines[Math.min(lines.length - 1, Math.floor(v / 26))];
      if (v >= 99.5 && done) { done(); return; }
      requestAnimationFrame(tick);
    })();
    return {
      first: true,
      progress(p) { target = Math.max(target, p * 100); },
      finish() {
        target = 100;
        return new Promise(r => { done = () => { el.classList.add("is-done"); setTimeout(() => el.remove(), 950); r(); }; });
      }
    };
  }

  function init() {
    document.documentElement.classList.add("js");
    const nav = header();
    footer();
    navBehaviour(nav);
    const c = curtain();
    const b = boot();
    if (!b.first && !reduced && !DJ.performance.mobile) c.classList.add("is-reveal");
    return { boot: b, curtain: c, base, page, url };
  }

  return { init, url };
})();
