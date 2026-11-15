/* ==========================================================================
   DALJORD CREATIONS · scene/world.js
   The real-time 3D world behind every page (three.js r128).

   Presets
     "shield"  home page: the DJ shield assembles from particles sampled from
               the logo, then materialises as a solid neon-edged object.
     "word"    inner pages: the page word (body data-word) is built from
               particles that scatter away from the cursor.

   Shared world: sunset sky, mountain ridges, neon grid floor, embers and
   warp streaks that stretch with scroll speed.

   API: DJ.World.create({ canvas, dim, preset, word, hero }) returns
        { ok, load(onProgress), start(), burst(), setPreset(preset, word) }
   ========================================================================== */
window.DJ = window.DJ || {};

DJ.World = (function () {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 4);
  const easeBack = t => { t = clamp(t, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  function create(opts) {
    const { canvas, dim } = opts;
    if (!window.THREE) return fail();
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
    catch (e) { return fail(); }

    const small = Math.min(innerWidth, innerHeight) < 700;
    const DPR = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75);
    renderer.setPixelRatio(DPR);
    renderer.setClearColor(0x070418, 1);

    const scene = new THREE.Scene();
    const HORIZON = new THREE.Color(0x3a1050);
    scene.fog = new THREE.Fog(HORIZON, 30, 150);
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 600);
    const CAM_Z = 8.6;
    camera.position.set(0, 1.9, CAM_Z);

    /* ---------------- sky ---------------- */
    const skyU = { uSun: { value: new THREE.Vector3(0, .045, -1).normalize() } };
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `
        varying vec3 vD; uniform vec3 uSun;
        void main(){
          float y = vD.y;
          vec3 c = mix(vec3(1.,.47,.15), vec3(.62,.13,.45), smoothstep(-.01,.07,y));
          c = mix(c, vec3(.17,.06,.34), smoothstep(.06,.2,y));
          c = mix(c, vec3(.027,.016,.094), smoothstep(.18,.55,y));
          c = mix(c, vec3(.05,.02,.1), smoothstep(0.,-.05,y));
          float d = distance(vD, uSun);
          float disc = smoothstep(.05,.045,d);
          float bands = step(.5, fract((vD.y - uSun.y)*90.));
          float cut = mix(1., bands, smoothstep(.0,-.06, vD.y-uSun.y));
          c += vec3(1.,.5,.3)*disc*cut*.75 + vec3(1.,.4,.25)*(exp(-d*9.)*.45 + exp(-d*30.)*.35)*smoothstep(-.03,.02,y);
          gl_FragColor = vec4(c,1.);
        }`
    })));

    /* ---------------- stars ---------------- */
    {
      const n = small ? 700 : 1400, p = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const th = Math.random() * Math.PI * 2, el = .1 + Math.pow(Math.random(), .8) * 1.35;
        p.set([Math.cos(th) * Math.cos(el) * 300, Math.sin(el) * 300, Math.sin(th) * Math.cos(el) * 300], i * 3);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdcd8ff, size: 1.3, sizeAttenuation: false, transparent: true, opacity: .85, fog: false, depthWrite: false })));
    }

    /* ---------------- mountains ---------------- */
    function ridge(seed, dist, height, col, W) {
      const sh = new THREE.Shape(); sh.moveTo(-W / 2, -2);
      for (let i = 0; i <= 220; i++) {
        const x = -W / 2 + W * i / 220;
        let y = 0, a = 1, f = 1 / 38;
        for (let o = 0; o < 5; o++) { y += a * Math.sin(x * f + seed * (o + 1) * 1.7) * Math.cos(x * f * .53 + seed * o); a *= .5; f *= 2.1; }
        const valley = Math.exp(-Math.pow(x / (W * .14), 2));
        sh.lineTo(x, height * (.25 + Math.abs(y) * .9) * (1 - valley * .55));
      }
      sh.lineTo(W / 2, -2); sh.lineTo(-W / 2, -2);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: col }));
      m.position.set(0, -.2, -dist); scene.add(m);
    }
    ridge(1.3, 140, 22, 0x2a0d47, 520);
    ridge(2.7, 95, 14, 0x1a0a35, 380);
    ridge(4.1, 62, 8, 0x0f0726, 260);

    /* ---------------- neon floor ---------------- */
    const floorU = { uOff: { value: 0 }, uSunX: { value: 0 }, uFogCol: { value: HORIZON }, uPulse: { value: 0 } };
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShaderMaterial({
      uniforms: floorU, fog: false, extensions: { derivatives: true },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `
        varying vec3 vW; uniform float uOff; uniform float uSunX; uniform vec3 uFogCol; uniform float uPulse;
        void main(){
          vec2 g = vec2(vW.x, vW.z + uOff) / 2.2;
          float l = max(1.-smoothstep(0., fwidth(g.x)*1.5, .5-abs(fract(g.x)-.5)), 1.-smoothstep(0., fwidth(g.y)*1.5, .5-abs(fract(g.y)-.5)));
          float dist = length(vW.xz - cameraPosition.xz);
          vec3 lc = mix(vec3(1.,.27,.84), vec3(.21,.9,1.), smoothstep(-20.,20.,vW.x));
          float ring = exp(-pow(dist - uPulse*60., 2.)*.08) * step(.001, uPulse) * (1.-uPulse);
          vec3 c = vec3(.03,.015,.07) + lc * l * (.62 + ring*3.) * exp(-dist*.035) * (.45 + .55*smoothstep(3., 16., dist));
          c += vec3(1.,.45,.2) * exp(-pow((vW.x-uSunX)/(1.2+max(0.,-vW.z)*.06),2.)) * smoothstep(5.,-40.,vW.z) * .55;
          c = mix(c, uFogCol*.9, smoothstep(30., 140., dist));
          gl_FragColor = vec4(c,1.);
        }`
    }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);

    /* ---------------- lights + environment ---------------- */
    const envScene = new THREE.Scene(); envScene.background = new THREE.Color(0x0c0822);
    [[0xff46d6, -6, 2, 2, 4], [0x36e6ff, 6, 2, 2, 4], [0xff8a2a, 0, 0, -8, 6], [0x6a5cff, 0, 8, 0, 6], [0xffffff, 3, 5, 6, 1.5]].forEach(([c, x, y, z, s]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); envScene.add(m);
    });
    const envMap = new THREE.PMREMGenerator(renderer).fromScene(envScene, .04).texture;
    scene.add(new THREE.AmbientLight(0x4a3a8a, .5));
    const pl1 = new THREE.PointLight(0xff46d6, 2.2, 14); pl1.position.set(-3, 2.5, 3); scene.add(pl1);
    const pl2 = new THREE.PointLight(0x36e6ff, 2.2, 14); pl2.position.set(3, 2.5, 3); scene.add(pl2);
    const rim = new THREE.DirectionalLight(0xff8a2a, 1.4); rim.position.set(0, 1, -6); scene.add(rim);

    /* ---------------- shared textures ---------------- */
    const radial = (stops, size = 256) => {
      const c = document.createElement("canvas"); c.width = c.height = size;
      const g = c.getContext("2d"), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(c);
    };
    const glowTex = radial([[0, "rgba(255,120,230,.55)"], [.35, "rgba(110,80,255,.25)"], [1, "rgba(0,0,0,0)"]]);
    const flashTex = radial([[0, "rgba(255,255,255,1)"], [.2, "rgba(160,230,255,.6)"], [1, "rgba(0,0,0,0)"]]);
    const dotTex = radial([[0, "rgba(255,255,255,1)"], [.25, "rgba(255,255,255,.6)"], [1, "rgba(255,255,255,0)"]], 64);

    /* ---------------- hero group ---------------- */
    const hero = new THREE.Group(); scene.add(hero);
    const tilt = new THREE.Group(); hero.add(tilt);

    /* --- solid shield --- */
    const P = [[-.98, .6], [-.47, .94], [.47, .94], [.98, .6], [.98, -.38], [.35, -.75], [0, -.98], [-.35, -.75], [-.98, -.38]];
    const S = 1.25;
    const mkShape = s => { const sh = new THREE.Shape(); P.forEach(([x, y], i) => i ? sh.lineTo(x * s, y * s) : sh.moveTo(x * s, y * s)); sh.closePath(); return sh; };
    const solid = new THREE.Group(); tilt.add(solid);
    const slabGeo = new THREE.ExtrudeGeometry(mkShape(S * 1.07), { depth: .34, bevelEnabled: true, bevelThickness: .07, bevelSize: .06, bevelSegments: 4, curveSegments: 4 });
    slabGeo.translate(0, 0, -.45);
    const slab = new THREE.Mesh(slabGeo, new THREE.MeshStandardMaterial({ color: 0x1d1838, metalness: 1, roughness: .26, envMap, envMapIntensity: 1.25 }));
    solid.add(slab);
    const neonMat = (op) => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uO: { value: op }, uT: { value: 0 } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 vP; uniform float uO; uniform float uT;
        void main(){ float a = atan(vP.y, vP.x); vec3 c = mix(vec3(1.,.27,.84), vec3(.21,.9,1.), smoothstep(-.6,.6, vP.x + .25*sin(a*2.+uT)));
          gl_FragColor = vec4(c*1.6, uO); }`
    });
    const ring = (o, i, z, op) => { const sh = mkShape(o); sh.holes.push(mkShape(i)); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), neonMat(op)); m.position.z = z; return m; };
    const frontRing = ring(S * 1.075, S * 1.045, .04, 1), backRing = ring(S * 1.075, S * 1.05, -.52, .6);
    solid.add(frontRing, backRing);
    const logoU = { map: { value: null }, uO: { value: 0 }, uScan: { value: -2 } };
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(S * 2.06, S * 2.06), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: logoU,
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 vU; uniform sampler2D map; uniform float uO; uniform float uScan;
        void main(){ vec3 c = texture2D(map, vU).rgb; float m = max(c.r, max(c.g, c.b)); float a = smoothstep(.015, .1, m);
          float scan = exp(-pow((vU.y - uScan)*14., 2.));
          gl_FragColor = vec4(c*.92 + vec3(.6,.95,1.)*scan*a*.45, a*uO); }`
    }));
    logo.position.z = .03; solid.add(logo);

    /* --- hologram rings behind the shield --- */
    const halos = [];
    [[1.45, 1.43, -1.1, .45], [1.8, 1.785, -1.8, .28], [2.2, 2.19, -2.6, .16]].forEach(([o, i, z, op], k) => {
      const m = ring(S * o, S * i, z, op); m.userData = { base: op, spin: (k % 2 ? -1 : 1) * (.05 + .03 * k) }; hero.add(m); halos.push(m);
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    glow.scale.set(9, 9, 1); glow.position.z = -2.4; hero.add(glow);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    flash.scale.set(6, 6, 1); flash.position.z = .4; tilt.add(flash);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = .02; scene.add(pool);

    /* ---------------- particle morph system ---------------- */
    const N = small ? 5200 : 9000;
    const pGeo = new THREE.BufferGeometry();
    const aTarget = new Float32Array(N * 3), aScatter = new Float32Array(N * 3), aColor = new Float32Array(N * 3), aRand = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = 5 + Math.random() * 12, th = Math.random() * Math.PI * 2, ph = (Math.random() - .5) * 1.6;
      aScatter.set([Math.cos(th) * Math.cos(ph) * r, 1 + Math.sin(ph) * r * .6, Math.sin(th) * Math.cos(ph) * r - 4], i * 3);
      aRand[i] = Math.random();
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(aTarget, 3));
    pGeo.setAttribute("aTarget", new THREE.BufferAttribute(aTarget, 3));
    pGeo.setAttribute("aScatter", new THREE.BufferAttribute(aScatter, 3));
    pGeo.setAttribute("aColor", new THREE.BufferAttribute(aColor, 3));
    pGeo.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
    const pU = {
      uMorph: { value: 0 }, uTime: { value: 0 }, uBurst: { value: 0 }, uFade: { value: 1 }, uSize: { value: 26 },
      uPR: { value: DPR }, uMouse: { value: new THREE.Vector3(99, 99, 0) }, uMouseOn: { value: 0 }, uRepel: { value: .9 }, uUnit: { value: 1 }
    };
    const particles = new THREE.Points(pGeo, new THREE.ShaderMaterial({
      uniforms: pU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec3 aTarget; attribute vec3 aScatter; attribute vec3 aColor; attribute float aRand;
        uniform float uMorph, uTime, uBurst, uFade, uSize, uPR, uMouseOn, uRepel, uUnit; uniform vec3 uMouse;
        varying vec3 vC; varying float vA;
        void main(){
          float k = clamp(uMorph*1.6 - aRand*.6, 0., 1.); k = k*k*(3.-2.*k);
          vec3 sc = aScatter * uUnit;
          float ang = uTime*(.08+.12*aRand) + (1.-k)*2.5;
          sc.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * sc.xz;
          vec3 p = mix(sc, aTarget, k);
          p += vec3(sin(uTime*1.3+aRand*40.), cos(uTime*1.1+aRand*30.), sin(uTime*.9+aRand*20.)) * .02 * k * uUnit;
          vec3 dir = normalize(aTarget + vec3(aRand-.5, fract(aRand*7.)-.5, fract(aRand*13.)-.5)*1.6 + vec3(0.,0.,.01));
          p += (dir * uBurst * (1.2 + aRand*4.) + vec3(0., 0., uBurst*aRand*2.)) * uUnit;
          vec2 d = p.xy - uMouse.xy; float l = length(d);
          float f = smoothstep(uRepel, 0., l) * uMouseOn * k;
          p.xy += normalize(d + 1e-4) * f * .55 * uUnit; p.z += f * .8 * uUnit;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * uPR * (.6 + aRand*.8) / max(.5, -mv.z) * (1. + f*1.6);
          vC = aColor * (1. + f*1.4 + uBurst*.6);
          vA = uFade * (.45 + .55*k);
        }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        void main(){ float r = length(gl_PointCoord - .5); if (r > .5) discard; gl_FragColor = vec4(vC, smoothstep(.5, .05, r) * vA); }`
    }));
    particles.frustumCulled = false;
    tilt.add(particles);

    function fillTargets(points) {
      for (let i = 0; i < N; i++) {
        const q = points[(Math.random() * points.length) | 0];
        aTarget.set([q[0], q[1], q[2]], i * 3);
        aColor.set([q[3], q[4], q[5]], i * 3);
      }
      pGeo.attributes.aTarget.needsUpdate = true; pGeo.attributes.aColor.needsUpdate = true;
    }

    function sampleLogo(img) {
      const R = 220, c = document.createElement("canvas"); c.width = c.height = R;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0, R, R);
      const d = g.getImageData(0, 0, R, R).data, pts = [], half = S * 1.03;
      for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
        const o = (y * R + x) * 4, r = d[o] / 255, gg = d[o + 1] / 255, b = d[o + 2] / 255, m = Math.max(r, gg, b);
        if (m < .2) continue;
        const boost = 1.15 / Math.max(.45, m);
        pts.push([(x / R * 2 - 1) * half, (1 - y / R * 2) * half, -.12 - Math.random() * .12, r * boost, gg * boost, b * boost]);
      }
      return pts;
    }

    function sampleWord(word) {
      const W = 1600, H = 420, c = document.createElement("canvas"); c.width = W; c.height = H;
      const g = c.getContext("2d");
      let fs = 320; g.font = `800 ${fs}px Unbounded, "Arial Black", Arial, sans-serif`;
      const tw = g.measureText(word).width; fs = Math.min(320, fs * (W * .94) / tw);
      g.font = `800 ${fs}px Unbounded, "Arial Black", Arial, sans-serif`;
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText(word, W / 2, H / 2);
      const d = g.getImageData(0, 0, W, H).data, pts = [], step = 3;
      const width = g.measureText(word).width, pal = [[1, .27, .84], [.61, .42, 1], [.21, .9, 1]];
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
        if (d[(y * W + x) * 4 + 3] < 128) continue;
        const u = clamp((x - (W - width) / 2) / width, 0, 1);
        const a = u < .5 ? pal[0] : pal[1], b = u < .5 ? pal[1] : pal[2], t = u < .5 ? u * 2 : u * 2 - 1;
        const sparkle = Math.random() < .05 ? 1.6 : 1;
        pts.push([(x - W / 2) / width, -(y - H / 2) / width, (Math.random() - .5) * .04,
          (a[0] + (b[0] - a[0]) * t) * sparkle, (a[1] + (b[1] - a[1]) * t) * sparkle, (a[2] + (b[2] - a[2]) * t) * sparkle]);
      }
      return pts;
    }

    /* ---------------- embers ---------------- */
    const EN = small ? 220 : 480;
    const eg = new THREE.BufferGeometry(), ep = new Float32Array(EN * 3), ec = new Float32Array(EN * 3), es = new Float32Array(EN);
    const pal = [0xff8a2a, 0x36e6ff, 0xff46d6, 0xffd1a0].map(c => new THREE.Color(c));
    for (let i = 0; i < EN; i++) { ep.set([(Math.random() - .5) * 30, Math.random() * 12, -Math.random() * 26 + 5], i * 3); const c = pal[i % 4]; ec.set([c.r, c.g, c.b], i * 3); es[i] = .15 + Math.random() * .45; }
    eg.setAttribute("position", new THREE.BufferAttribute(ep, 3)); eg.setAttribute("color", new THREE.BufferAttribute(ec, 3));
    scene.add(new THREE.Points(eg, new THREE.PointsMaterial({ size: .09, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

    /* ---------------- warp streaks ---------------- */
    const WN = small ? 260 : 520;
    const wg = new THREE.BufferGeometry(), wp = new Float32Array(WN * 6), wc = new Float32Array(WN * 6), wz = new Float32Array(WN);
    const wx = new Float32Array(WN), wy = new Float32Array(WN);
    for (let i = 0; i < WN; i++) {
      let x, y; do { x = (Math.random() - .5) * 40; y = Math.random() * 18 - 3; } while (Math.abs(x) < 2.5 && Math.abs(y - 2) < 2);
      wx[i] = x; wy[i] = y; wz[i] = -Math.random() * 90;
      const c = pal[i % 3]; wc.set([c.r, c.g, c.b, c.r * .1, c.g * .1, c.b * .1], i * 6);
    }
    wg.setAttribute("position", new THREE.BufferAttribute(wp, 3)); wg.setAttribute("color", new THREE.BufferAttribute(wc, 3));
    const warpMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const warp = new THREE.LineSegments(wg, warpMat); warp.frustumCulled = false; scene.add(warp);

    /* ---------------- post processing ---------------- */
    let composer = null;
    if (THREE.EffectComposer && THREE.UnrealBloomPass) {
      try {
        composer = new THREE.EffectComposer(renderer);
        composer.addPass(new THREE.RenderPass(scene, camera));
        composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), small ? .62 : .72, .5, .66));
      } catch (e) { composer = null; }
    }

    /* ---------------- state ---------------- */
    let preset = opts.preset || "word", word = opts.word || "DJ";
    let logoImg = null, introT = -1, burstT = -1, running = true, started = false;
    const L = { x: 0, y: 1.85, s: 1 };
    const ptr = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), plane = new THREE.Plane(), hit = new THREE.Vector3(), nrm = new THREE.Vector3();
    let mouseActive = 0, fovKick = 0, shake = 0, floorOff = 0;
    const sd = new THREE.Vector3();

    function layout() {
      const w = innerWidth, h = innerHeight, a = w / h;
      renderer.setSize(w, h, false); camera.aspect = a; camera.updateProjectionMatrix();
      if (composer) { composer.setPixelRatio(Math.min(DPR, 1.25)); composer.setSize(w, h); }
      const visH = 2 * Math.tan(THREE.MathUtils.degToRad(19)) * CAM_Z, visW = visH * a;
      if (preset === "shield") {
        if (a > 1.05) { L.x = Math.min(visW * .24, 3.6); L.y = 1.85; L.s = Math.min(1, .55 + a * .25); }
        else { L.x = 0; L.y = 2.95; L.s = clamp(a * 1.1, .62, .85); }
        pU.uSize.value = 26; pU.uRepel.value = .9; pU.uUnit.value = 1;
      } else {
        const ww = Math.min(visW * (a > 1.05 ? .78 : .92), 9.5);
        L.s = ww; L.x = a > 1.05 ? visW * .06 : 0; L.y = a > 1.05 ? 3.25 : 3.15;
        pU.uSize.value = a > 1.05 ? 30 : 24; pU.uRepel.value = .9 / ww; pU.uUnit.value = 1 / ww;
      }
    }

    function applyPreset() {
      const isShield = preset === "shield";
      solid.visible = isShield; halos.forEach(h => h.visible = isShield); glow.visible = isShield; pool.visible = isShield;
      if (isShield && logoImg) fillTargets(sampleLogo(logoImg));
      if (!isShield) fillTargets(sampleWord(word));
      layout();
    }

    /* ---------------- input ---------------- */
    addEventListener("pointermove", e => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; mouseActive = 1; }, { passive: true });
    document.addEventListener("pointerleave", () => mouseActive = 0);
    addEventListener("resize", layout);
    document.addEventListener("click", e => { if (e.target.closest("[data-hero]") && !e.target.closest("a,button")) burst(); });

    function burst() { if (reduced) return; burstT = 0; shake = 1; }

    /* ---------------- loop ---------------- */
    const clock = new THREE.Clock();
    document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running && started) { clock.getDelta(); requestAnimationFrame(tick); } });

    function tick() {
      if (!running) return;
      requestAnimationFrame(tick);
      const raw = clock.getDelta(), dt = Math.min(raw, .05), t = clock.elapsedTime;
      if (introT >= 0) introT += Math.min(raw, .25);
      const isShield = preset === "shield";
      const vel = DJ.scroll ? DJ.scroll.vel : 0, speed = Math.min(Math.abs(vel), 60);
      const docH = document.documentElement.scrollHeight - innerHeight;
      const pg = Math.max(0, scrollY) / Math.max(1, docH);
      const ph = Math.min(scrollY / innerHeight, 2);
      const mid = sstep(0, .14, pg) * (1 - sstep(.84, .99, pg));
      const k = reduced ? .2 : 1;

      /* camera: tilt to the stars mid-page, warp kick with scroll speed, shake on burst */
      cur.x += (ptr.x - cur.x) * .05; cur.y += (ptr.y - cur.y) * .05;
      shake *= .9;
      fovKick += ((reduced ? 0 : Math.min(speed * .35, 14)) - fovKick) * .08;
      camera.fov = 38 + fovKick; camera.updateProjectionMatrix();
      camera.position.x = cur.x * .35 * k + (Math.random() - .5) * shake * .12;
      camera.position.y = 1.9 + mid * 2.2 * k - cur.y * .15 * k + (Math.random() - .5) * shake * .12;
      camera.lookAt(camera.position.x * .4, 1.6 + mid * 7 * k, 0);

      /* intro + burst timing */
      const it = reduced ? 1 : easeOut(introT / 2.6);
      let bp = 0;
      if (burstT >= 0) { burstT += Math.min(raw, .05); bp = burstT < .28 ? easeOut(burstT / .28) : 1 - easeOut((burstT - .28) / 1.5); if (burstT > 2) burstT = -1; }
      const out = sstep(0, 1.1, ph);
      pU.uMorph.value = reduced ? 1 : clamp(introT / 2.4, 0, 1);
      pU.uBurst.value = Math.max(bp * (isShield ? 1 : 1.3), out * 1.6);
      pU.uTime.value = t;

      /* hero placement */
      hero.visible = ph < 1.7; pool.visible = isShield && ph < 1.7;
      hero.position.set(L.x + out * (L.x > 0 ? 1.2 : 0), L.y + out * 2 + (reduced ? 0 : Math.sin(t * .9) * .08), -out * 3);
      if (isShield) {
        hero.scale.setScalar(L.s);
        const mat = introT - 2.2;
        const pop = reduced ? 1 : (mat < 0 ? 0 : easeBack(mat / .7));
        const hide = burstT >= 0 ? (burstT < 1.4 ? 0 : easeBack((burstT - 1.4) / .5)) : 1;
        solid.scale.setScalar(Math.max(.0001, pop * hide * (1 - out * .3)));
        flash.material.opacity = reduced ? 0 : Math.max(0, 1 - Math.abs(mat - .1) * 3) * .9 + (burstT >= 0 && burstT < .3 ? (1 - burstT / .3) * .8 : 0);
        logoU.uO.value = (reduced ? 1 : clamp((introT - 2.3) / .6, 0, 1)) * (1 - out * .6);
        logoU.uScan.value = reduced ? -2 : 1.4 - ((t * .35) % 2.2);
        const f = reduced ? 1 : clamp(mat * 4, 0, 1);
        frontRing.material.uniforms.uO.value = f; backRing.material.uniforms.uO.value = f * .6;
        frontRing.material.uniforms.uT.value = backRing.material.uniforms.uT.value = t * .6;
        halos.forEach((h, i) => { h.rotation.z += h.userData.spin * dt * (reduced ? 0 : 1 + bp * 8); h.material.uniforms.uO.value = h.userData.base * it * (1 - out); h.material.uniforms.uT.value = t * .4 + i; });
        glow.material.opacity = .9 * it * (1 - out);
        pool.position.set(hero.position.x, .02, hero.position.z); pool.material.opacity = .55 * it * (1 - out);
        pU.uFade.value = (pop > .9 && hide > .9 ? .55 : 1) * (1 - out * .5);
        let spin = 0; if (burstT >= 0) spin = easeOut(burstT / 1.9) * Math.PI * 2;
        tilt.rotation.y = cur.x * .42 * k + (1 - it) * -1.2 + spin + (reduced ? 0 : Math.sin(t * .5) * .05);
        tilt.rotation.x = cur.y * .28 * k + out * .4;
      } else {
        hero.scale.setScalar(L.s);
        pU.uFade.value = (1 - out * .6);
        tilt.rotation.y = cur.x * .22 * k + (reduced ? 0 : Math.sin(t * .4) * .04);
        tilt.rotation.x = cur.y * .14 * k;
      }

      /* mouse in particle space (for repulsion) */
      v2.set(ptr.x, -ptr.y); ray.setFromCamera(v2, camera);
      tilt.getWorldPosition(hit); camera.getWorldDirection(nrm);
      plane.setFromNormalAndCoplanarPoint(nrm.negate(), hit);
      if (ray.ray.intersectPlane(plane, hit)) { particles.worldToLocal(hit); pU.uMouse.value.copy(hit); }
      pU.uMouseOn.value += ((reduced ? 0 : mouseActive * (scrollY < innerHeight ? 1 : 0)) - pU.uMouseOn.value) * .1;

      /* sun + floor */
      const sunX = isShield ? L.x - 2.1 * L.s : 0;
      sd.set(sunX - camera.position.x, 0, -CAM_Z).normalize(); sd.y = .045; sd.normalize();
      skyU.uSun.value.lerp(sd, .08);
      floorOff += (reduced ? 0 : (1.2 + speed * .9)) * dt;
      floorU.uOff.value = floorOff; floorU.uSunX.value = sunX * 1.2;
      floorU.uPulse.value = burstT >= 0 ? clamp(burstT / 1.6, 0, 1) : 0;

      /* embers */
      if (!reduced) {
        const a = eg.attributes.position.array;
        for (let i = 0; i < EN; i++) { a[i * 3 + 1] += es[i] * dt * (1 + speed * .05); a[i * 3] += Math.sin(t * .6 + i) * dt * .08; if (a[i * 3 + 1] > 12) a[i * 3 + 1] = 0; }
        eg.attributes.position.needsUpdate = true;
      }

      /* warp streaks: always drifting, stretch with scroll speed */
      const len = .15 + speed * .45, wv = (2 + speed * 2.4) * dt * (reduced ? 0 : 1);
      warpMat.opacity += ((reduced ? 0 : clamp(.15 + speed * .05, 0, .9)) - warpMat.opacity) * .1;
      for (let i = 0; i < WN; i++) {
        wz[i] += wv; if (wz[i] > CAM_Z + 2) wz[i] -= 95;
        wp.set([wx[i], wy[i], wz[i], wx[i], wy[i], wz[i] - len], i * 6);
      }
      wg.attributes.position.needsUpdate = true;

      /* reading overlay */
      dim.style.opacity = (Math.min(1, ph * 1.2) * .22 + mid * .52).toFixed(3);
      if (composer) composer.render(); else renderer.render(scene, camera);
    }

    /* ---------------- loading ---------------- */
    function load(onProgress) {
      onProgress && onProgress(.2);
      const fonts = document.fonts ? Promise.race([document.fonts.load('800 100px "Unbounded"'), new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
      const img = new Promise(res => {
        if (!DJ.brandTexture) return res(null);
        const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = DJ.brandTexture;
      });
      return Promise.all([img.then(i => { onProgress && onProgress(.6); return i; }), fonts]).then(([im]) => {
        logoImg = im;
        if (im) { const tex = new THREE.Texture(im); tex.needsUpdate = true; tex.anisotropy = 4; logoU.map.value = tex; }
        applyPreset();
        onProgress && onProgress(.9);
      });
    }

    function start() { if (started) return; started = true; introT = reduced ? 9 : 0; clock.getDelta(); tick(); }
    function setPreset(p, w) { preset = p; word = w || word; introT = reduced ? 9 : 0; burstT = -1; applyPreset(); }

    return { ok: true, load, start, burst, setPreset };
  }

  function fail() {
    document.documentElement.classList.add("no-webgl");
    return { ok: false, load: () => Promise.resolve(), start() {}, burst() {}, setPreset() {} };
  }

  return { create };
})();
