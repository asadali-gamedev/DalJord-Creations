/* Shared rendering budgets. Hardware hints are optional; measured frame times
   in world.js can lower the budget when a device struggles or heats up. */
window.DJ = window.DJ || {};

DJ.performance = (function () {
  const mobile = matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const memory = navigator.deviceMemory || 0, cores = navigator.hardwareConcurrency || 0;
  const constrained = (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4) || !!(navigator.connection && navigator.connection.saveData);
  const tier = constrained || reduced ? "low" : mobile ? "mobile" : "high";
  const budgets = {
    high: { dpr: 1.75, pixels: 3200000, particles: 9000, stars: 1400, embers: 480, streaks: 520, bloom: true },
    mobile: { dpr: 1.25, pixels: 1000000, particles: 2800, stars: 400, embers: 100, streaks: 100, bloom: false },
    low: { dpr: 1, pixels: 500000, particles: 1400, stars: 220, embers: 48, streaks: 48, bloom: false }
  };
  document.documentElement.dataset.quality = tier;
  document.documentElement.classList.toggle("mobile-device", mobile);
  return Object.assign({ mobile, reduced, tier }, budgets[tier]);
})();
