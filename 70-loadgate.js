// DUSKWICK - 70-loadgate.js (v46): loading screen. Loads LAST. Only top-level name: LOADG.
// Boot: a full-screen cover (#ldg) stays over the title until the page is complete (every script, image and the
// DOMContentLoaded / load builds: editor boot, 64a land move, 61 villages), fonts are ready, the packed glTF models
// are parsed (43 GLTF.busy), then every shader in the scene is compiled (R.compile) and every texture is uploaded to
// the GPU (one off-screen render of small quads into a 4x4 target, through 53's plain render R.__r0).
// Play: startGame is wrapped; the cover comes back ("Lighting the way") until the first-explore jobs are done
// (67 TIDY.done, 69 WAYF.built), the scene is warmed again (new pieces near the player) and a few frames settle.
// Keys are swallowed while it is up. Never locks the game: each wait gives up after a time limit.
// Skipped while the prologue (14 TI.mode) plays. No save fields, no scene objects, no NET.
const LOADG = (() => {
  const css = document.createElement("style");
  css.textContent = `
#ldg{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;
background:radial-gradient(ellipse at 50% 42%,#1d2140 0%,#0b0c18 70%);color:#f3e2b4;font-family:Georgia,serif;
transition:opacity .6s ease;user-select:none}
#ldg.out{opacity:0;pointer-events:none}
#ldg .lt{font-size:42px;letter-spacing:6px;text-shadow:0 0 18px rgba(255,200,110,.45)}
#ldg .ls{margin-top:10px;font-size:15px;opacity:.8;min-height:20px}
#ldg .lb{margin-top:22px;width:min(360px,80vw);height:8px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;
box-shadow:0 0 0 1px rgba(243,226,180,.25)}
#ldg .lf{height:100%;width:0;background:linear-gradient(90deg,#c8873a,#ffd98a);transition:width .25s ease}
#ldg .ll{margin-top:28px;width:22px;height:34px;border-radius:6px 6px 10px 10px;background:#ffcf7a;
box-shadow:0 0 22px 8px rgba(255,190,90,.45);animation:ldgf 1.4s ease-in-out infinite}
@keyframes ldgf{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}`;
  document.head.appendChild(css);
  // v47 polish: index.html already has #ldg up from the first frame (replaces the old #boot), so it is reused
  let el = document.getElementById("ldg");
  if (!el) {
    el = document.createElement("div");
    el.id = "ldg";
    el.innerHTML =
      '<div class="lt">DUSKWICK</div><div class="ls"></div><div class="lb"><div class="lf"></div></div><div class="ll"></div>';
    (document.body || document.documentElement).appendChild(el);
  }
  const $s = el.querySelector(".ls"),
    $f = el.querySelector(".lf");
  let up = true,
    job = 0; // bumps on every new wait so an older one stops
  const say = (t, k) => {
    $s.textContent = t;
    $f.style.width = Math.round(Math.max(0, Math.min(1, k)) * 100) + "%";
  };
  const show = () => {
    up = true;
    el.classList.remove("out");
    el.style.display = "flex";
  };
  const hide = () => {
    up = false;
    el.classList.add("out");
    setTimeout(() => {
      if (!up) el.style.display = "none";
    }, 650);
  };
  // swallow game keys while covered (capture phase, before the game's own listeners)
  addEventListener(
    "keydown",
    (e) => {
      if (!up) return;
      e.stopImmediatePropagation();
      e.preventDefault();
    },
    true,
  );

  // ---------- GPU warm-up ----------
  const TK = [
    "map",
    "emissiveMap",
    "alphaMap",
    "normalMap",
    "bumpMap",
    "gradientMap",
    "lightMap",
    "aoMap",
    "specularMap",
    "roughnessMap",
    "metalnessMap",
    "displacementMap",
  ];
  function texList() {
    const seen = new Set(),
      out = [];
    const addT = (t) => {
      if (!t || !t.isTexture || seen.has(t) || t.isCubeTexture || t.isVideoTexture || t.isDataTexture3D) return;
      if (t.isDataTexture2DArray || t.isCompressedTexture) return;
      seen.add(t);
      try {
        const p = R.properties.get(t);
        if (p && p.__webglInit) return; // already on the GPU
      } catch (e) {}
      if (t.image === undefined || t.image === null) return;
      out.push(t);
    };
    const addM = (m) => {
      if (!m) return;
      if (Array.isArray(m)) return m.forEach(addM);
      for (let i = 0; i < TK.length; i++) addT(m[TK[i]]);
      if (m.uniforms)
        for (const k in m.uniforms) {
          const v = m.uniforms[k] && m.uniforms[k].value;
          if (v && v.isTexture) addT(v);
        }
    };
    S.traverse((o) => addM(o.material));
    if (S.background && S.background.isTexture) addT(S.background);
    return out;
  }
  let RT = null,
    OC = null;
  function upload(list) {
    const r0 = R.__r0;
    if (!r0 || !list.length) return;
    if (!RT) RT = new T.WebGLRenderTarget(4, 4);
    if (!OC) OC = new T.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    const sc = new T.Scene(),
      geo = new T.PlaneGeometry(0.01, 0.01),
      mats = [];
    list.forEach((t) => {
      const m = new T.MeshBasicMaterial({ map: t });
      m.userData.dtx = 0;
      mats.push(m);
      const q = new T.Mesh(geo, m);
      q.frustumCulled = false;
      q.position.z = -1;
      sc.add(q);
    });
    const prev = R.getRenderTarget();
    try {
      R.setRenderTarget(RT);
      r0(sc, OC);
    } catch (e) {
      console.warn("LOADG: texture warm-up", e);
    }
    R.setRenderTarget(prev);
    mats.forEach((m) => m.dispose());
    geo.dispose();
  }
  function compile() {
    try {
      R.compile(S, C);
    } catch (e) {
      console.warn("LOADG: shader warm-up", e);
    }
  }
  // warm-up in steps over a few frames so the bar moves; calls done() at the end
  function warm(id, k0, k1, label, done) {
    const list = texList(),
      n = list.length,
      STEP = 48;
    let i = 0,
      stage = 0;
    const step = () => {
      if (id !== job) return;
      if (stage === 0) {
        say(label + " - preparing shaders", k0);
        stage = 1;
        return requestAnimationFrame(step);
      }
      if (stage === 1) {
        compile();
        stage = 2;
        return requestAnimationFrame(step);
      }
      if (i < n) {
        upload(list.slice(i, i + STEP));
        i += STEP;
        say(label + " - textures " + Math.min(i, n) + " / " + n, k0 + (k1 - k0) * (Math.min(i, n) / n));
        return requestAnimationFrame(step);
      }
      done();
    };
    requestAnimationFrame(step);
  }

  // ---------- boot: cover the title until everything has loaded ----------
  const BOOT_MAX = 30000,
    START_MAX = 20000;
  function bootWait() {
    const id = ++job,
      t0 = performance.now();
    say("Gathering the lamps...", 0.02);
    const tick = () => {
      if (id !== job) return;
      const el = performance.now() - t0,
        page = document.readyState === "complete",
        fonts = !document.fonts || document.fonts.status === "loaded",
        mdl = !(typeof GLTF !== "undefined" && GLTF.busy && GLTF.busy());
      if (el > BOOT_MAX) console.warn("LOADG: gave up waiting", { page, fonts, mdl });
      if ((page && fonts && mdl) || el > BOOT_MAX) {
        // two frames for anything the load handlers queued with setTimeout(0)
        return setTimeout(
          () =>
            warm(id, 0.6, 1, "Lighting the world", () => {
              say("Ready", 1);
              setTimeout(() => id === job && hide(), 150);
            }),
          120,
        );
      }
      const left = typeof GLTF !== "undefined" && GLTF.pending ? GLTF.pending() : 0;
      if (!page) say("Building the world...", 0.1 + Math.min(0.3, el / 20000));
      else if (!mdl) say("Waking the models" + (left ? " (" + left + " left)" : "") + "...", 0.45);
      else say("Inking the letters...", 0.55);
      setTimeout(tick, 100);
    };
    tick();
  }
  bootWait();

  // ---------- play: cover the world until its late jobs are done ----------
  function startWait() {
    const id = ++job,
      t0 = performance.now();
    show();
    say("Lighting the way...", 0.05);
    const intro = () => (typeof TI !== "undefined" && TI && TI.mode) || document.body.classList.contains("ttl");
    let settle = 0;
    const tick = () => {
      if (id !== job) return;
      const el = performance.now() - t0;
      if (el > 200 && intro()) return hide(); // the prologue / title took over: nothing to cover
      const tidy = typeof TIDY === "undefined" || !TIDY.done || TIDY.done(),
        way = typeof WAYF === "undefined" || !WAYF.built || WAYF.built(),
        mdl = !(typeof GLTF !== "undefined" && GLTF.busy && GLTF.busy());
      if (el > START_MAX) console.warn("LOADG: gave up waiting", { tidy, way, mdl });
      if ((tidy && way && mdl) || el > START_MAX) {
        if (!settle) settle = performance.now() + 700; // lazy chunks near the player (42/63) get a moment to fill in
        if (performance.now() >= settle || el > START_MAX)
          return warm(id, 0.7, 1, "Setting the scene", () => {
            say("Ready", 1);
            setTimeout(() => id === job && hide(), 200);
          });
      }
      say(
        !tidy ? "Tidying the streets..." : !way ? "Placing signposts and bridges..." : "Settling in...",
        0.1 + Math.min(0.55, el / 6000),
      );
      setTimeout(tick, 100);
    };
    setTimeout(tick, 50);
  }
  if (typeof startGame === "function") {
    const sg0 = startGame;
    startGame = function () {
      const out = sg0.apply(this, arguments);
      try {
        startWait();
      } catch (e) {
        console.error(e);
        hide();
      }
      return out;
    };
  }

  return { show, hide, isUp: () => up, warm: () => warm(++job, 0, 1, "Warming up", hide), texList };
})();
