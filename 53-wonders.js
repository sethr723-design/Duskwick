// v39 Wonders of the Dusk (loads LAST, after 52): only top-level name WONDR.
//  Vistas: 18 scenic places (street landmark plazas, zone villages, hub plazas/glades). Reaching one plays a short
//  orbiting camera shot with a title card (paused = true, body class "cut"), then pays XP + glimmers.
//  v44: Lost Embers and Falling Stars were removed (old saves may still carry P.wd.e / P.wd.st; they are ignored).
// Saves: lazy P.wd = { v: {i: 1} }. The Vistas deed is pushed onto BOARD.DEEDS. Book > World > Wonders.
// Scene objects are made lazily on the first explore frame (after the editor's BASE snapshot) and never culled by zone
// holders (own distance check). R.render is wrapped: WONDR.pre(fn) runs fn right before each render (used by 54/55).
const WONDR = (() => {
  const cls = (c) => document.body.classList.contains(c);
  const on = () => typeof SLOT !== "undefined" && SLOT >= 0 && typeof P === "object" && !!P && !!P.name;
  const live = () => on() && mode === "explore" && !paused && !cls("cut") && !cls("ttl");
  const dW = (x, z) => Math.hypot(W.position.x - x, W.position.z - z);
  const lv = () => Math.max(1, P.lvl || 1);
  const wd = () => {
    if (!P.wd) P.wd = { e: {}, v: {}, st: 0 };
    P.wd.e = P.wd.e || {};
    P.wd.v = P.wd.v || {};
    return P.wd;
  };
  const low = () => typeof GFX !== "undefined" && GFX === "low";

  // ---------- render hook (pre-render callbacks) ----------
  const PRE = [];
  {
    const r0 = R.render.bind(R);
    R.render = function (sc, cam) {
      for (let i = 0; i < PRE.length; i++)
        try {
          PRE[i]();
        } catch (e) {
          console.error(e);
        }
      return r0(sc, cam);
    };
    R.__r0 = r0; // v46: plain render without the hooks (70-loadgate's texture warm-up)
  }

  // ---------- sounds (own context, follows Book > Options > Game > Spell sounds) ----------
  let AC = null;
  const vol = () => {
    try {
      const s = JSON.parse(localStorage.getItem("duskwick_sfx") || "{}");
      return typeof s.v === "number" ? s.v : 0.7;
    } catch (e) {
      return 0.7;
    }
  };
  function ac() {
    const v = vol();
    if (v <= 0 || document.hidden) return null;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      return AC;
    } catch (e) {
      return null;
    }
  }
  function tone(f, t, len, type, g0, f2) {
    const A = ac();
    if (!A) return;
    const o = A.createOscillator(),
      g2 = A.createGain(),
      t0 = A.currentTime + 0.02 + (t || 0);
    o.type = type || "triangle";
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + len);
    g2.gain.setValueAtTime(0, t0);
    g2.gain.linearRampToValueAtTime((g0 || 0.14) * vol(), t0 + 0.012);
    g2.gain.exponentialRampToValueAtTime(0.0008, t0 + len);
    o.connect(g2).connect(A.destination);
    o.start(t0);
    o.stop(t0 + len + 0.05);
  }
  const chime = (ns, gap, len) => ns.forEach((f, i) => tone(f, i * (gap || 0.08), len || 0.9));
  function whoosh(len) {
    const A = ac();
    if (!A) return;
    const n = A.sampleRate * len,
      b = A.createBuffer(1, n, A.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = A.createBufferSource(),
      f = A.createBiquadFilter(),
      g2 = A.createGain(),
      t0 = A.currentTime + 0.02;
    s.buffer = b;
    f.type = "bandpass";
    f.frequency.setValueAtTime(2400, t0);
    f.frequency.exponentialRampToValueAtTime(300, t0 + len);
    f.Q.value = 2;
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.exponentialRampToValueAtTime(0.22 * vol(), t0 + len * 0.7);
    g2.gain.exponentialRampToValueAtTime(0.0008, t0 + len);
    s.connect(f).connect(g2).connect(A.destination);
    s.start(t0);
  }

  // ---------- textures / materials ----------
  function beamTex() {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 128;
    const x = c.getContext("2d"),
      q = x.createLinearGradient(0, 0, 0, 128);
    q.addColorStop(0, "rgba(255,255,255,0)");
    q.addColorStop(0.55, "rgba(255,255,255,.45)");
    q.addColorStop(1, "rgba(255,255,255,1)");
    x.fillStyle = q;
    x.fillRect(0, 0, 4, 128);
    return new T.CanvasTexture(c);
  }
  let BTX = null;
  const addM = (c, o) =>
    new T.MeshBasicMaterial({
      color: c,
      transparent: true,
      opacity: o == null ? 1 : o,
      blending: T.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
  const glowS = (c, s, o) => {
    const m = new T.Sprite(
      new T.SpriteMaterial({
        map: GLT,
        color: c,
        transparent: true,
        opacity: o == null ? 1 : o,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    m.scale.setScalar(s);
    return m;
  };
  function beam(c, h, r) {
    BTX = BTX || beamTex();
    const m = new T.Mesh(
      new T.CylinderGeometry(r * 0.55, r, h, 12, 1, true),
      new T.MeshBasicMaterial({
        color: c,
        map: BTX,
        transparent: true,
        opacity: 0.22,
        blending: T.AdditiveBlending,
        depthWrite: false,
        side: T.DoubleSide,
        fog: false,
      }),
    );
    m.position.y = h / 2;
    m.userData.dtx = 0;
    return m;
  }

  // ---------- clear-ground test: tall scenery footprints on an 8-unit grid (built once) ----------
  let OCC = null;
  const CELL = 8;
  function occBuild() {
    OCC = new Map();
    const skip = new Set();
    try {
      skip.add(W);
      foes.forEach((f) => f && f.o && skip.add(f.o));
      (typeof VIL !== "undefined" ? VIL : []).forEach((v) => v && v.o && skip.add(v.o));
      (typeof NPCS !== "undefined" ? NPCS : []).forEach((n) =>
        ["o", "m", "g", "mdl"].forEach((k) => n && n[k] && n[k].isObject3D && skip.add(n[k])),
      );
      if (typeof BG !== "undefined") skip.add(BG);
    } catch (e) {}
    const bx = new T.Box3(),
      m4 = new T.Matrix4();
    const put = (b) => {
      if (b.max.y < 0.45 || b.min.y > 3.2) return; // flat ground sheets / things hanging overhead
      const sx = b.max.x - b.min.x,
        sz = b.max.z - b.min.z;
      if (sx > 46 || sz > 46 || !isFinite(sx)) return; // ground discs, mountain ring...
      const x = (b.min.x + b.max.x) / 2,
        z = (b.min.z + b.max.z) / 2,
        r = Math.max(0.3, Math.max(sx, sz) * 0.45);
      for (let a = Math.floor((x - r) / CELL); a <= Math.floor((x + r) / CELL); a++)
        for (let c = Math.floor((z - r) / CELL); c <= Math.floor((z + r) / CELL); c++) {
          const k = a + "," + c;
          let L = OCC.get(k);
          if (!L) OCC.set(k, (L = []));
          L.push(x, z, r);
        }
    };
    S.updateMatrixWorld(true);
    const rec = (o) => {
      if (skip.has(o) || (o.userData && (o.userData.lus || o.userData.wdr))) return;
      if (o.isMesh && o.geometry && !o.isSkinnedMesh) {
        const gm = o.geometry;
        if (!gm.boundingBox) gm.computeBoundingBox();
        if (gm.boundingBox && !gm.boundingBox.isEmpty()) {
          if (o.isInstancedMesh) {
            for (let i = 0; i < o.count; i++) {
              o.getMatrixAt(i, m4);
              m4.premultiply(o.matrixWorld);
              put(bx.copy(gm.boundingBox).applyMatrix4(m4));
            }
          } else put(bx.copy(gm.boundingBox).applyMatrix4(o.matrixWorld));
        }
      }
      for (let i = 0; i < o.children.length; i++) rec(o.children[i]);
    };
    rec(S);
  }
  function clear(x, z, r) {
    if (!OCC) occBuild();
    r = r || 1;
    for (const o of solids) if (Math.abs(o.x - x) < o.r + r && Math.hypot(o.x - x, o.z - z) < o.r + r) return false;
    const L = OCC.get(Math.floor(x / CELL) + "," + Math.floor(z / CELL));
    if (L) for (let i = 0; i < L.length; i += 3) if (Math.hypot(L[i] - x, L[i + 1] - z) < L[i + 2] + r) return false;
    return true;
  }

  // seeded stream (fixed seeds: the same spots for everybody)
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  // ===================================================================================================================
  // 2. VISTAS
  // ===================================================================================================================
  const LMN = {
    den: "the Wolf Den",
    lake: "the Frozen Lake",
    stones: "the Rimestones",
    camp: "the Sled Camp",
    crater: "the Crater",
    gate: "the Obsidian Gate",
    forge: "the Ember Forge",
    witch: "the Witch's Hut",
    chapel: "the Sunken Chapel",
    shrine: "the Orb Shrine",
    lantern: "the Lantern Tree",
  };
  const VIS = [
    {
      n: "Market Lane",
      s: "Where Duskwick still haggles under the lamps",
      x: OX,
      z: OZ + MLZ,
      r: 9,
      h: "the plaza halfway up Gloomway",
    },
    {
      n: "Foot of the Gloomspire",
      s: "The tower that swallowed the sun",
      x: OX,
      z: OZ + PZ,
      r: 10,
      h: "the far end of Gloomway",
      ty: 14,
    },
    {
      n: "Hollow Glade",
      s: "The end of the Hollow Road",
      x: OX + RDS[0].gx,
      z: OZ + RDS[0].gz,
      r: 9,
      h: "where the Hollow Road ends",
    },
    {
      n: "Ashen Glade",
      s: "The end of the Ashen Trail",
      x: OX + RDS[1].gx,
      z: OZ + RDS[1].gz,
      r: 9,
      h: "where the Ashen Trail ends",
    },
    {
      n: "Frostfen",
      s: "The village that keeps its fires low",
      x: ZCEN.frost[0],
      z: ZCEN.frost[1],
      r: 10,
      h: "the heart of Frostfen",
    },
    {
      n: "The Cinderwaste",
      s: "Ash on the wind, embers underfoot",
      x: ZCEN.ember[0],
      z: ZCEN.ember[1],
      r: 10,
      h: "the heart of the Cinderwaste",
    },
    {
      n: "Mirewick",
      s: "Lanterns on stilts above the drowned",
      x: ZCEN.marsh[0],
      z: ZCEN.marsh[1],
      r: 10,
      h: "the heart of Mirewick",
    },
  ];
  ZSTR.forEach((s, i) =>
    VIS.push({
      n: s[1],
      s: LMN[s[3]] ? "At " + LMN[s[3]] : "The end of the road",
      x: ZSX0 + i * ZSDX,
      z: -ZSL,
      r: 12,
      h: "the far end of " + s[1],
      ty: 3,
    }),
  );
  const css = document.createElement("style");
  css.textContent =
    "#wdlb{position:fixed;inset:0;pointer-events:none;z-index:70;opacity:0;transition:opacity .8s}" +
    "#wdlb.on{opacity:1}" +
    "#wdlb:before,#wdlb:after{content:'';position:absolute;left:0;right:0;height:11vh;background:#05030a}" +
    "#wdlb:before{top:0}#wdlb:after{bottom:0}" +
    "#wdlb .t{position:absolute;left:0;right:0;bottom:14vh;text-align:center;font:700 34px/1.1 Fraunces,Georgia,serif;" +
    "color:#ffe9b8;letter-spacing:.06em;text-shadow:0 2px 6px #000,0 0 26px #ffb84a88;opacity:0;transform:translateY(8px);" +
    "transition:opacity 1.2s .5s,transform 1.2s .5s}" +
    "#wdlb .s{display:block;margin-top:8px;font:italic 17px Fraunces,Georgia,serif;color:#e6d4ff;letter-spacing:.02em}" +
    "#wdlb .k{display:block;font:700 12px system-ui,sans-serif;letter-spacing:.3em;color:#ffc860;margin-bottom:8px}" +
    "#wdlb.on .t{opacity:1;transform:none}" +
    "#wdlb .sk{position:absolute;right:18px;bottom:3vh;font:600 12px system-ui,sans-serif;color:#bba;pointer-events:auto;" +
    "cursor:pointer;opacity:.7}";
  document.head.appendChild(css);
  const LB = document.createElement("div");
  LB.id = "wdlb";
  LB.innerHTML = '<div class="t"></div><div class="sk">click to skip</div>';
  document.body.appendChild(LB);
  let VC = null; // running vista shot
  function vistaStart(i) {
    const V = VIS[i];
    wd().v[i] = 1;
    sv();
    const p = W.position,
      a0 = Math.atan2(p.x - V.x, p.z - V.z);
    VC = { i, V, t0: performance.now(), d: 6200, a0, pz: paused };
    paused = true;
    document.body.classList.add("cut");
    LB.querySelector(".t").innerHTML =
      '<span class="k">VISTA DISCOVERED</span>' + V.n + '<span class="s">' + V.s + "</span>";
    LB.classList.add("on");
    chime([392, 523, 659, 784, 1047], 0.22, 2.4);
  }
  function vistaEnd() {
    if (!VC) return;
    const V = VC.V;
    VC = null;
    paused = false;
    document.body.classList.remove("cut");
    LB.classList.remove("on");
    if (typeof keys === "object") for (const k in keys) keys[k] = 0;
    const xp = 2 * xpFor(lv()),
      gd = 25;
    P.xp += xp;
    P.gold += gd;
    toast("Vista: " + V.n + "   +" + xp + " XP  +" + gd + " ✦  (" + vistaCount() + " / " + VIS.length + ")", "#e6d4ff");
    try {
      lvup();
    } catch (e) {}
    try {
      ui();
    } catch (e) {}
    sv();
  }
  LB.querySelector(".sk").onclick = () => vistaEnd();
  const vistaCount = () => VIS.filter((V, i) => wd().v[i]).length;
  const easeIO = (k) => k * k * (3 - 2 * k);
  PRE.push(() => {
    if (!VC) return;
    const k = Math.min(1, (performance.now() - VC.t0) / VC.d),
      e = easeIO(k),
      V = VC.V,
      a = VC.a0 + 0.35 - e * 1.9,
      rad = 26 - 6 * e,
      h = 13 - 5 * e;
    C.position.set(V.x + Math.sin(a) * rad, h, V.z + Math.cos(a) * rad);
    C.lookAt(V.x, V.ty || 2.5, V.z);
    if (k >= 1) vistaEnd();
  });

  // ===================================================================================================================
  // frame
  // ===================================================================================================================
  let built = false,
    bootT = 0,
    last = performance.now(),
    poll = 0;
  function build() {
    built = true;
    if (BOARD && Array.isArray(BOARD.DEEDS))
      BOARD.DEEDS.push({
        k: "vist",
        n: "Far Wanderer",
        d: "Vistas seen",
        v: () => vistaCount(),
        t: [3, 9, VIS.length],
      });
    try {
      ui();
    } catch (e) {}
  }
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now(),
      dt = Math.min(0.1, (now - last) / 1000),
      s = now / 1000;
    last = now;
    if (!on() || typeof W === "undefined") return;
    if (!built) {
      if (mode !== "explore" || cls("ttl")) return;
      if (!bootT) bootT = now + 1200;
      if (now < bootT) return;
      try {
        build();
      } catch (e) {
        console.error(e);
      }
      return;
    }
    if (now - poll < 200) return;
    poll = now;
    // v42: the "Vista discovered" fly-around no longer starts on its own when you reach a new place (turned off for
    // now; set WONDR.vauto = 1 in the console to bring it back). WONDR.vista(i) still plays one by hand.
    if (!VC && WONDR.vauto && live()) {
      const vv = wd().v;
      for (let i = 0; i < VIS.length; i++) {
        const V = VIS[i];
        if (vv[i] || dW(V.x, V.z) > V.r) continue;
        // a foe standing guard (a road boss in its plaza) must be beaten or gone first
        if (
          foes.some((f) => !f.dead && f.o && f.o.visible && Math.hypot(f.o.position.x - V.x, f.o.position.z - V.z) < 24)
        )
          continue;
        vistaStart(i);
        break;
      }
    }
  }
  requestAnimationFrame(frame);
  addEventListener(
    "keydown",
    (e) => {
      if (VC && (e.key === "Escape" || e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        e.stopImmediatePropagation();
        vistaEnd();
      }
    },
    true,
  );

  // ===================================================================================================================
  // Book > World > Wonders
  // ===================================================================================================================
  const tg = BOOKG.find((G) => G[0] === "travel");
  if (tg && tg[2]) tg[2].push(["wonders", "Wonders"]);
  function page(L) {
    const D = wd();
    const row = (h) => {
      const r = document.createElement("div");
      r.className = "row";
      r.innerHTML = h;
      L.appendChild(r);
    };
    L.insertAdjacentHTML("beforeend", '<div class="sec">Vistas (' + vistaCount() + " / " + VIS.length + ")</div>");
    VIS.forEach((V, i) =>
      row(
        D.v[i]
          ? '<div><b style="color:#e6d4ff">' + V.n + "</b><small>" + V.s + "</small></div>"
          : "<div><b>???</b><small>Somewhere worth seeing: " + V.h + ".</small></div>",
      ),
    );
  }
  const panel0 = panel;
  panel = function (k, id) {
    panel0.apply(this, arguments);
    try {
      if (k === "book" && BOOKL.last === "wonders" && on()) page($("pl"));
    } catch (e) {
      console.error(e);
    }
  };

  return {
    VIS,
    clear,
    pre: (f) => PRE.push(f),
    chime,
    tone,
    whoosh,
    beam,
    glowS,
    rng,
    hash,
    vista: (i) => vistaStart(i | 0),
    busy: () => !!VC,
    state: () => wd(),
  };
})();
