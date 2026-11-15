/* ==========================================================================
   DALJORD CREATIONS · main.js
   Starts every page: layout, content, motion, the 3D world and the boot
   sequence. Page behaviour is configured on <body>:
     data-page     which nav item is current (home, games, projects, ...)
     data-base     path back to the site root ("" on the home page, "../" in folders)
     data-preset   "shield" for the 3D logo, "word" for a particle word
     data-word     the word built from particles on inner pages
   ========================================================================== */
(function () {
  const body = document.body, root = document.documentElement;
  const L = DJ.layout.init();

  DJ.render.all();

  /* live numbers: <b data-stat="games"> and <b data-stat="projects"> */
  document.querySelectorAll("[data-stat]").forEach(el => {
    const n = { games: (DJ.games || []).length, projects: (DJ.projects || []).length }[el.dataset.stat];
    if (n != null) el.textContent = n;
  });
  DJ.chainDemo.all();
  DJ.motion.init();
  DJ.motion.cursor();

  /* copy-to-clipboard buttons: <button data-copy="text" data-copy-out="#id"> */
  document.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
    const out = document.querySelector(b.dataset.copyOut);
    try { await navigator.clipboard.writeText(b.dataset.copy); if (out) out.textContent = "Copied to your clipboard"; }
    catch (e) { if (out) out.textContent = "Couldn’t copy automatically. Select the address above instead."; }
    if (out) setTimeout(() => out.textContent = "", 3000);
  }));

  /* the 3D world */
  const canvas = document.querySelector(".stage"), dim = document.querySelector(".stage-dim");
  const fallback = document.querySelector(".stage-fallback");
  if (fallback) fallback.style.backgroundImage = `url("${L.url("assets/images/scenes/industrial-sunset.webp")}")`;
  const world = DJ.world = DJ.World.create({
    canvas, dim,
    preset: body.dataset.preset || "word",
    word: body.dataset.word || "DJ",
    hero: document.querySelector("[data-hero]")
  });
  if (!world.ok) {
    const d = () => dim.style.opacity = Math.min(.82, .35 + scrollY / innerHeight * .6).toFixed(3);
    addEventListener("scroll", d, { passive: true }); d();
  }

  /* boot */
  const safety = new Promise(r => setTimeout(r, 6000));
  Promise.race([world.load(p => L.boot.progress(p)), safety])
    .then(() => L.boot.finish())
    .then(() => {
      root.classList.add("ready");
      world.start();
      DJ.motion.start();
    });
})();
