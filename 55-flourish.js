// v39 Flourish (loads LAST, after 54): only top-level name FLOUR. Feel and look:
//  1. Photo mode (P while exploring): paused = true + body classes "cut snap", free orbit camera (drag / wheel / WASD /
//     Q E), filters (CSS filter on the canvas, re-applied with ctx.filter when saving), vignette, hide-the-wizard, FOV,
//     and "Take picture" (Space) which saves a PNG straight after a render (R.render is wrapped for that).
//  2. Hop (Space while exploring on foot): a little jump; while running it becomes a forward leap (okp-checked).
//     Applied as a y offset after walk() each frame through WONDR.pre, so walk() resets it next frame.
//  3. Sky wonders: aurora curtains over Frostfen (3 additive ribbons kept north of the camera inside C.far, fog off)
//     and the odd shooting star across the sky outdoors.
//  4. Footprints in Frostfen snow and Mirewick mud (pool of 48 flat planes, fading).
//  5. Sprint camera: the FOV widens a touch while running (offset added/removed so other FOV changes are kept).
//  6. Soft screen vignette (div right after the canvas, under the HUD).
// Settings: localStorage duskwick_flourish {vig, sky, fov, prints, hop}; Book > Options > Display rows.
const FLOUR = (() => {
  const KEY = "duskwick_flourish",
    cfg = { vig: 1, sky: 1, fov: 1, prints: 1, hop: 1 };
  try {
    Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch (e) {}
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cfg));
    } catch (e) {}
  };
  const cls = (c) => document.body.classList.contains(c);
  const on = () => typeof SLOT !== "undefined" && SLOT >= 0 && typeof P === "object" && !!P && !!P.name;
  const live = () => on() && mode === "explore" && !paused && !cls("cut") && !cls("ttl");
  const typing = (e) => e.target && /^(input|textarea|select)$/i.test(e.target.tagName || "");
  const low = () => typeof GFX !== "undefined" && GFX === "low";
  const fishing = () => typeof ANGLE === "object" && ANGLE.busy();
  const inDun2 = (z) => Math.abs(z + 1700) < 260;
  const CV = R.domElement;

  // ===================================================================================================================
  // page bits
  // ===================================================================================================================
  const css = document.createElement("style");
  css.textContent =
    "#flvig{position:absolute;inset:0;pointer-events:none;transition:opacity 1s;" +
    "background:radial-gradient(ellipse 75% 70% at 50% 48%,transparent 58%,rgba(12,6,26,.42) 100%)}" +
    "#snapv{position:fixed;inset:0;pointer-events:none;z-index:69;display:none;" +
    "background:radial-gradient(ellipse 70% 65% at 50% 50%,transparent 45%,rgba(0,0,0,.6) 100%)}" +
    "#snapf{position:fixed;inset:0;pointer-events:none;z-index:72;background:#fff;opacity:0;transition:opacity .5s}" +
    "body.snap #memh,body.snap #angh,body.snap #angc,body.snap #wdlb,body.snap #tut,body.snap #rnchip{display:none!important}" +
    "#snapui{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:71;display:none;max-width:calc(100% - 32px);" +
    "padding:10px 12px;border-radius:14px;background:rgba(14,9,26,.86);border:1px solid #ffd27a55;color:#f0e6d6;" +
    "font:600 12px system-ui,sans-serif;box-shadow:0 6px 30px #000a}" +
    "#snapui .r{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center}" +
    "#snapui .r+.r{margin-top:8px}" +
    "#snapui button{font:600 12px system-ui,sans-serif;padding:5px 10px;border-radius:8px;border:1px solid #ffd27a44;" +
    "background:#2a1c3a;color:#f0e6d6;cursor:pointer}" +
    "#snapui button.on{background:#6a4a1a;border-color:#ffd27a;color:#ffe9b8}" +
    "#snapui button.big{background:linear-gradient(180deg,#7a5a2a,#4a3010);border-color:#ffd27a;color:#fff1c8;padding:6px 16px}" +
    "#snapui small{opacity:.65;font-weight:400}" +
    "#snapui input{width:90px;vertical-align:middle}";
  document.head.appendChild(css);
  const vig = document.createElement("div");
  vig.id = "flvig";
  CV.after(vig);
  const snapV = document.createElement("div");
  snapV.id = "snapv";
  const flash = document.createElement("div");
  flash.id = "snapf";
  const UI = document.createElement("div");
  UI.id = "snapui";
  document.body.append(snapV, flash, UI);
  const vigSync = () => (vig.style.opacity = cfg.vig && !cls("snap") ? 1 : 0);
  vigSync();

  // ===================================================================================================================
  // 1. PHOTO MODE
  // ===================================================================================================================
  const FILT = [
    ["Natural", ""],
    ["Golden hour", "sepia(.35) saturate(1.4) contrast(1.06) brightness(1.06)"],
    ["Moonlight", "grayscale(.45) sepia(.25) hue-rotate(185deg) saturate(1.3) brightness(.92) contrast(1.12)"],
    ["Storybook", "saturate(1.7) contrast(1.12) brightness(1.04)"],
    ["Dreamy", "saturate(1.35) brightness(1.12) contrast(.88) blur(.6px)"],
    ["Ember", "sepia(.55) saturate(2.1) hue-rotate(-18deg) contrast(1.05)"],
    ["Noir", "grayscale(1) contrast(1.4) brightness(.95)"],
  ];
  let PH = null;
  const PK = {};
  function uiBuild() {
    UI.innerHTML =
      '<div class="r">' +
      FILT.map((f, i) => '<button data-f="' + i + '">' + f[0] + "</button>").join("") +
      '</div><div class="r"><button data-t="vig">Vignette</button><button data-t="me">Hide wizard</button>' +
      '<span>FOV <input type="range" min="25" max="95" step="1"></span>' +
      '<button class="big" data-t="shot">📷 Take picture</button><button data-t="x">Exit</button></div>' +
      '<div class="r"><small>Drag to orbit · wheel to zoom · WASD move · Q / E down / up · Space takes the picture · P or Esc leaves</small></div>';
    UI.querySelectorAll("button").forEach((b) => {
      b.onpointerdown = (e) => e.stopPropagation();
      b.onclick = (e) => {
        e.stopPropagation();
        b.blur();
        if (b.dataset.f != null) PH.f = +b.dataset.f;
        else if (b.dataset.t === "vig") PH.vig = !PH.vig;
        else if (b.dataset.t === "me") PH.me = !PH.me;
        else if (b.dataset.t === "shot") return shoot();
        else if (b.dataset.t === "x") return photoOff();
        uiSync();
      };
    });
    const sl = UI.querySelector("input");
    sl.oninput = () => (PH.fov = +sl.value);
    sl.onpointerdown = (e) => e.stopPropagation();
    sl.onkeydown = (e) => e.stopPropagation();
  }
  function uiSync() {
    UI.querySelectorAll("button[data-f]").forEach((b) => b.classList.toggle("on", +b.dataset.f === PH.f));
    UI.querySelector('[data-t="vig"]').classList.toggle("on", PH.vig);
    UI.querySelector('[data-t="me"]').classList.toggle("on", PH.me);
    UI.querySelector("input").value = PH.fov;
    CV.style.filter = FILT[PH.f][1];
    snapV.style.display = PH.vig ? "block" : "none";
    W.visible = !PH.me;
  }
  function photoOn() {
    fovReset();
    const cp = C.position,
      f = W.position.clone().add(new T.Vector3(0, 1.6, 0)),
      d = cp.distanceTo(f);
    PH = {
      pz: paused,
      fov0: C.fov,
      fov: Math.round(C.fov),
      f: 0,
      vig: 1,
      me: 0,
      foc: f,
      home: f.clone(),
      dist: Math.max(3, Math.min(30, d)),
      yaw: Math.atan2(cp.x - f.x, cp.z - f.z),
      pit: Math.asin(Math.max(-0.95, Math.min(0.95, (cp.y - f.y) / Math.max(0.01, d)))),
      wv: W.visible,
    };
    paused = true;
    document.body.classList.add("cut", "snap");
    vigSync();
    uiBuild();
    UI.style.display = "block";
    uiSync();
  }
  function photoOff() {
    if (!PH) return;
    paused = PH.pz;
    document.body.classList.remove("cut", "snap");
    UI.style.display = "none";
    snapV.style.display = "none";
    CV.style.filter = "";
    W.visible = PH.wv !== false;
    C.fov = PH.fov0;
    C.updateProjectionMatrix();
    PH = null;
    for (const k in PK) PK[k] = 0;
    if (typeof keys === "object") for (const k in keys) keys[k] = 0;
    vigSync();
  }
  let shotReq = 0;
  function shoot() {
    shotReq = 1;
  }
  function capture() {
    shotReq = 0;
    try {
      const w = CV.width,
        h = CV.height,
        c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      x.filter = FILT[PH.f][1] || "none";
      x.drawImage(CV, 0, 0);
      x.filter = "none";
      if (PH.vig) {
        const q = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.62);
        q.addColorStop(0, "rgba(0,0,0,0)");
        q.addColorStop(1, "rgba(0,0,0,.6)");
        x.fillStyle = q;
        x.fillRect(0, 0, w, h);
      }
      x.font = "italic " + Math.round(h * 0.026) + "px Fraunces, Georgia, serif";
      x.fillStyle = "rgba(255,233,184,.75)";
      x.textAlign = "right";
      x.fillText("Duskwick", w - h * 0.03, h - h * 0.03);
      const d = new Date(),
        p2 = (n) => String(n).padStart(2, "0"),
        nm =
          "duskwick-" +
          d.getFullYear() +
          p2(d.getMonth() + 1) +
          p2(d.getDate()) +
          "-" +
          p2(d.getHours()) +
          p2(d.getMinutes()) +
          p2(d.getSeconds()) +
          ".png";
      c.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = nm;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 2000);
      }, "image/png");
      flash.style.transition = "none";
      flash.style.opacity = 0.85;
      requestAnimationFrame(() => {
        flash.style.transition = "opacity .5s";
        flash.style.opacity = 0;
      });
      if (typeof WONDR === "object") {
        WONDR.tone(2400, 0, 0.05, "square", 0.05);
        WONDR.tone(1200, 0.06, 0.08, "square", 0.04);
      }
    } catch (e) {
      console.error(e);
    }
  }
  // post-render: the drawing buffer is still readable straight after render()
  {
    const r1 = R.render;
    R.render = function () {
      const out = r1.apply(this, arguments);
      if (shotReq && PH) capture();
      return out;
    };
  }
  let drag = null;
  addEventListener(
    "pointerdown",
    (e) => {
      if (!PH || (e.target && e.target.closest && e.target.closest("#snapui"))) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    },
    true,
  );
  addEventListener(
    "pointermove",
    (e) => {
      if (!PH || !drag || e.pointerId !== drag.id) return;
      PH.yaw -= (e.clientX - drag.x) * 0.006;
      PH.pit = Math.max(-0.45, Math.min(1.35, PH.pit + (e.clientY - drag.y) * 0.005));
      drag.x = e.clientX;
      drag.y = e.clientY;
    },
    true,
  );
  addEventListener("pointerup", () => (drag = null), true);
  addEventListener(
    "wheel",
    (e) => {
      if (!PH) return;
      PH.dist = Math.max(1.5, Math.min(40, PH.dist * (1 + e.deltaY * 0.001)));
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    { capture: true, passive: false },
  );

  // ===================================================================================================================
  // 2. HOP / LEAP
  // ===================================================================================================================
  let HOP = null; // {vy, y, lp: leap dir or null}
  function hop() {
    if (HOP || !cfg.hop || (typeof MNT === "object" && MNT.on) || fishing()) return;
    const lp = typeof run !== "undefined" && run && mv;
    HOP = { vy: lp ? 8.2 : 7.4, y: 0, lp: lp ? W.rotation.y : null };
    if (typeof WONDR === "object") WONDR.tone(lp ? 420 : 520, 0, 0.12, "sine", 0.05, lp ? 760 : 880);
  }
  function hopTick(dt) {
    if (!HOP) return;
    if (mode !== "explore" || paused) {
      HOP = null;
      return;
    }
    HOP.vy -= 24 * dt;
    HOP.y += HOP.vy * dt;
    const p = W.position;
    if (HOP.lp != null) {
      const nx = p.x + Math.sin(HOP.lp) * 6.5 * dt,
        nz = p.z + Math.cos(HOP.lp) * 6.5 * dt;
      const nc = DEV.on && DEV.nc;
      if (
        nc ||
        (okp(nx, nz) &&
          !solids.some((o) => Math.abs(o.x - nx) < o.r + 0.5 && Math.hypot(o.x - nx, o.z - nz) < o.r + 0.5))
      ) {
        p.x = nx;
        p.z = nz;
      }
    }
    if (HOP.y <= 0) {
      const big = HOP.lp != null;
      HOP = null;
      if (!low()) puff(p.clone().setY(0.2), "spirit", big ? 4 : 2, 1.2, 0.4, 0.5);
      if (typeof WONDR === "object") WONDR.tone(110, 0, 0.12, "sine", big ? 0.2 : 0.12, 70);
      return;
    }
    p.y += HOP.y;
  }

  // ===================================================================================================================
  // 3. SKY WONDERS
  // ===================================================================================================================
  let AUR = null,
    aurK = 0;
  function aurBuild() {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 128;
    const x = c.getContext("2d"),
      q = x.createLinearGradient(0, 0, 0, 128);
    q.addColorStop(0, "rgba(160,90,255,0)");
    q.addColorStop(0.35, "rgba(150,110,255,.35)");
    q.addColorStop(0.7, "rgba(90,255,190,.85)");
    q.addColorStop(0.92, "rgba(120,255,170,.5)");
    q.addColorStop(1, "rgba(120,255,170,0)");
    x.fillStyle = q;
    x.fillRect(0, 0, 4, 128);
    const tx = new T.CanvasTexture(c);
    const g0 = new T.Group();
    g0.userData.wdr = 1;
    g0.userData.lus = 1;
    const R0 = [];
    const seg = low() ? 24 : 48;
    [
      [0, 0, 1, 0x9affd8],
      [-40, 14, 0.8, 0xb8a0ff],
      [50, -10, 0.7, 0x8affb0],
    ].forEach(([ox, oz, s, col], i) => {
      const geo = new T.PlaneGeometry(260 * s, 46 * s, seg, 1);
      const m = new T.Mesh(
        geo,
        new T.MeshBasicMaterial({
          map: tx,
          color: col,
          transparent: true,
          opacity: 0,
          blending: T.AdditiveBlending,
          depthWrite: false,
          side: T.DoubleSide,
          fog: false,
        }),
      );
      m.position.set(ox, i * 6, oz);
      m.renderOrder = -0.5;
      m.frustumCulled = false;
      m.userData.dtx = 0;
      m.userData.base = Float32Array.from(geo.attributes.position.array);
      m.userData.ph = i * 2.1;
      g0.add(m);
      R0.push(m);
    });
    g0.visible = false;
    S.add(g0);
    AUR = { g: g0, R: R0 };
  }
  function aurTick(s, dt) {
    const cp = C.position,
      want =
        cfg.sky &&
        (mode === "explore" || mode === "battle" || mode === "guest") &&
        zoneAt(cp.x, cp.z) === "frost" &&
        !inDun2(cp.z)
          ? 1
          : 0;
    aurK += (want - aurK) * Math.min(1, dt * 0.8);
    if (aurK < 0.01 && !want) {
      if (AUR) AUR.g.visible = false;
      return;
    }
    if (!AUR) aurBuild();
    const g0 = AUR.g,
      far = Math.max(60, Math.min(230, C.far * 0.8)),
      k = far / 230;
    g0.visible = true;
    g0.position.set(cp.x, cp.y + far * 0.42, cp.z - far * 0.92);
    g0.scale.setScalar(k);
    g0.rotation.x = -0.25;
    AUR.R.forEach((m) => {
      m.material.opacity = aurK * (0.55 + 0.25 * Math.sin(s * 0.4 + m.userData.ph));
      const a = m.geometry.attributes.position,
        b = m.userData.base,
        ph = m.userData.ph;
      for (let i = 0; i < a.count; i++) {
        const x = b[i * 3];
        a.array[i * 3 + 2] = Math.sin(x * 0.03 + s * 0.35 + ph) * 18 + Math.sin(x * 0.011 - s * 0.2) * 26;
        a.array[i * 3 + 1] = b[i * 3 + 1] + Math.sin(x * 0.05 + s * 0.6 + ph) * 3;
      }
      a.needsUpdate = true;
    });
  }
  // shooting stars (cosmetic) across the upper sky
  let SS = null,
    ssNext = performance.now() + 20000;
  const TRL = [];
  let SSM = null;
  const ssMat = () =>
    new T.SpriteMaterial({
      map: GLT,
      color: 0xe8f0ff,
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
  function ssTick(now, dt) {
    for (let i = TRL.length - 1; i >= 0; i--) {
      const t = TRL[i];
      t.userData.l -= dt;
      t.material.opacity = Math.max(0, t.userData.l / 0.5) * 0.8;
      if (t.userData.l <= 0) {
        S.remove(t);
        t.material.dispose();
        TRL.splice(i, 1);
      }
    }
    const cp = C.position;
    if (!SS) {
      if (now < ssNext) return;
      ssNext = now + 15000 + Math.random() * 25000;
      const z = zoneAt(cp.x, cp.z);
      if (!cfg.sky || mode !== "explore" || z === "dun" || z === "tower" || inDun2(cp.z) || low()) return;
      const far = Math.max(60, Math.min(220, C.far * 0.75)),
        a = Math.random() * 6.283,
        h = new T.Sprite((SSM = SSM || ssMat()));
      h.scale.setScalar(far * 0.02);
      const st = new T.Vector3(
        cp.x + Math.cos(a) * far * 0.8,
        cp.y + far * (0.45 + Math.random() * 0.2),
        cp.z + Math.sin(a) * far * 0.8,
      );
      const dir = new T.Vector3(Math.cos(a + 1.6 + Math.random()), -0.35, Math.sin(a + 1.6 + Math.random()))
        .normalize()
        .multiplyScalar(far * 0.55);
      h.position.copy(st);
      S.add(h);
      SS = { h, st, dir, t0: now, far };
      return;
    }
    const k = (now - SS.t0) / 900;
    SS.h.position.copy(SS.st).addScaledVector(SS.dir, k);
    const t = new T.Sprite(ssMat());
    t.position.copy(SS.h.position);
    t.scale.setScalar(SS.far * 0.012);
    t.userData.l = 0.5;
    S.add(t);
    TRL.push(t);
    if (k >= 1) {
      S.remove(SS.h);
      SS = null;
    }
  }

  // ===================================================================================================================
  // 4. FOOTPRINTS
  // ===================================================================================================================
  const FP = [];
  let fpT = 0,
    fpSide = 1,
    fpGeo = null;
  function printTick(dt) {
    for (const m of FP) {
      if (!m.visible) continue;
      m.userData.l -= dt;
      m.material.opacity = Math.max(0, Math.min(1, m.userData.l / 3)) * m.userData.o;
      if (m.userData.l <= 0) m.visible = false;
    }
    if (!cfg.prints || !live() || !(typeof mv !== "undefined" && mv) || (typeof MNT === "object" && MNT.on) || HOP)
      return;
    const p = W.position,
      z = zoneAt(p.x, p.z);
    if (z !== "frost" && z !== "marsh") return;
    if ((fpT -= dt) > 0) return;
    fpT = typeof run !== "undefined" && run ? 0.26 : 0.38;
    fpSide = -fpSide;
    const a = W.rotation.y,
      x = p.x + Math.cos(a) * 0.22 * fpSide,
      zz = p.z - Math.sin(a) * 0.22 * fpSide;
    let m = FP.find((q) => !q.visible);
    if (!m) {
      if (FP.length < (low() ? 24 : 48)) {
        fpGeo = fpGeo || new T.CircleGeometry(0.5, 10);
        m = new T.Mesh(
          fpGeo,
          new T.MeshBasicMaterial({ color: 0x5a6a80, transparent: true, opacity: 0.4, depthWrite: false }),
        );
        m.rotation.x = -Math.PI / 2;
        m.scale.set(0.28, 0.46, 1);
        m.userData.dtx = 0;
        m.userData.wdr = 1;
        m.renderOrder = 1;
        S.add(m);
        FP.push(m);
      } else m = FP.reduce((a2, b2) => (a2.userData.l < b2.userData.l ? a2 : b2));
    }
    m.visible = true;
    m.material.color.setHex(z === "frost" ? 0x6a7c98 : 0x2a2014);
    m.userData.o = z === "frost" ? 0.42 : 0.35;
    m.userData.l = z === "frost" ? 9 : 6;
    m.position.set(x, 0.05, zz);
    m.rotation.z = a;
  }

  // ===================================================================================================================
  // 5. SPRINT CAMERA (FOV offset)
  // ===================================================================================================================
  let fo = 0,
    fApplied = 0;
  function fovReset() {
    if (fApplied) {
      C.fov -= fApplied;
      C.updateProjectionMatrix();
    }
    fApplied = fo = 0;
  }
  function fovTick(dt) {
    if (mode !== "explore" || PH) return fovReset();
    const tgt = cfg.fov && !paused && typeof run !== "undefined" && run && mv ? 6 : 0;
    fo += (tgt - fo) * Math.min(1, dt * 3.5);
    if (Math.abs(fo - fApplied) > 0.02) {
      C.fov += fo - fApplied;
      fApplied = fo;
      C.updateProjectionMatrix();
    }
  }

  // ===================================================================================================================
  // frame (pre-render, after walk())
  // ===================================================================================================================
  let lastT = performance.now();
  const off = new T.Vector3();
  function pre() {
    const now = performance.now(),
      dt = Math.min(0.1, (now - lastT) / 1000),
      s = now / 1000;
    lastT = now;
    if (!on() || typeof W === "undefined") return;
    if (PH) {
      if (mode !== "explore") return photoOff();
      const sp = (PK.shift ? 14 : 6) * dt,
        fx = -Math.sin(PH.yaw),
        fz = -Math.cos(PH.yaw);
      if (PK.w) PH.foc.add(off.set(fx * sp, 0, fz * sp));
      if (PK.s) PH.foc.add(off.set(-fx * sp, 0, -fz * sp));
      if (PK.a) PH.foc.add(off.set(fz * sp, 0, -fx * sp));
      if (PK.d) PH.foc.add(off.set(-fz * sp, 0, fx * sp));
      if (PK.e) PH.foc.y += sp;
      if (PK.q) PH.foc.y -= sp;
      // keep the camera within reach of where you stand
      off.subVectors(PH.foc, PH.home);
      if (off.length() > 35) PH.foc.copy(PH.home).add(off.setLength(35));
      PH.foc.y = Math.max(0.3, Math.min(30, PH.foc.y));
      const cp = Math.cos(PH.pit);
      C.position.set(
        PH.foc.x + Math.sin(PH.yaw) * cp * PH.dist,
        Math.max(0.25, PH.foc.y + Math.sin(PH.pit) * PH.dist),
        PH.foc.z + Math.cos(PH.yaw) * cp * PH.dist,
      );
      C.lookAt(PH.foc);
      if (Math.abs(C.fov - PH.fov) > 0.01) {
        C.fov = PH.fov;
        C.updateProjectionMatrix();
      }
      if (C.far < S.fog.far + 14) {
        C.far = S.fog.far + 14;
        C.updateProjectionMatrix();
      }
    } else {
      hopTick(dt);
      fovTick(dt);
    }
    try {
      aurTick(s, dt);
      ssTick(now, dt);
      printTick(dt);
    } catch (e) {
      console.error(e);
    }
  }
  if (typeof WONDR === "object") WONDR.pre(pre);

  // ===================================================================================================================
  // keys (capture phase)
  // ===================================================================================================================
  addEventListener(
    "keydown",
    (e) => {
      if (!e.key || typing(e)) return;
      const k = e.key.toLowerCase();
      if (PH) {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (k === "escape" || (k === "p" && !e.repeat)) return photoOff();
        if (k === " " && !e.repeat) return shoot();
        if (k >= "1" && k <= "7") {
          PH.f = +k - 1;
          return uiSync();
        }
        PK[k] = 1;
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (k === "p" && live() && !fishing() && $("chars").style.display === "none") {
        e.preventDefault();
        e.stopImmediatePropagation();
        return photoOn();
      }
      if (k === " " && live() && !fishing() && !(typeof WONDR === "object" && WONDR.busy())) {
        e.preventDefault();
        hop();
      }
    },
    true,
  );
  addEventListener(
    "keyup",
    (e) => {
      if (e.key) PK[e.key.toLowerCase()] = 0;
    },
    true,
  );
  addEventListener("blur", () => {
    for (const k in PK) PK[k] = 0;
  });

  // ===================================================================================================================
  // Book > Options > Display
  // ===================================================================================================================
  const ROWS = [
    ["vig", "Screen vignette", "A soft dark edge round the screen"],
    ["sky", "Sky wonders", "Auroras over Frostfen and shooting stars"],
    ["fov", "Sprint camera", "The view widens a little while you run"],
    ["prints", "Footprints", "Tracks in Frostfen snow and Mirewick mud"],
    ["hop", "Hop with Space", "Space hops; while running it's a leap"],
  ];
  const panel0 = panel;
  panel = function (k) {
    panel0.apply(this, arguments);
    try {
      if (k !== "book" || BOOKL.last !== "optdisp") return;
      const L = $("pl");
      if (!L) return;
      L.insertAdjacentHTML(
        "beforeend",
        '<div class="sec">Flourishes</div><small style="display:block;margin-bottom:6px;color:#c9b8a0">Press P while exploring for Photo mode.</small>',
      );
      ROWS.forEach(([key, t, d]) => {
        const r = document.createElement("div"),
          b = document.createElement("button");
        r.className = "row";
        r.innerHTML = "<div><b>" + t + "</b><small>" + d + "</small></div>";
        b.className = "pb";
        const sync = () => (b.textContent = cfg[key] ? "On" : "Off");
        sync();
        b.onclick = () => {
          cfg[key] = cfg[key] ? 0 : 1;
          save();
          sync();
          vigSync();
          b.blur();
        };
        r.appendChild(b);
        L.appendChild(r);
      });
    } catch (e) {
      console.error(e);
    }
  };

  return { cfg, photo: () => (PH ? photoOff() : photoOn()), hop, shoot };
})();
