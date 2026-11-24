// DUSKWICK - 80-polish.js (v47 polish pass). Loads after 79. Only top-level name: POLISH.
// Small fixes from Polish.md that need a late hook.
// 1) Moon in the sky: the zone skies (TH[z][1], 11-explore + 62-reach) painted the moon as a CSS radial-gradient on the
//    stage background, so it stuck to the screen and turned with the camera. Here each moon is cut out of its sky string
//    and becomes a fog-free sprite at a fixed world direction (kept inside C.far, follows the camera's position only),
//    so it stays put in the sky. themeApply is wrapped to fade each zone's moon with its sky (trail blends included).
//    Added at runtime on the first render (never before the editor's BASE snapshot). No save fields, no NET.
const POLISH = (() => {
  // ---------- 1) moon ----------
  const RX =
    /^radial-gradient\(circle at (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%,(#[0-9a-f]{6}) 0 (\d+)px,(rgba\([^)]*\)) \d+px (\d+)px,transparent \d+px\),/i;
  const MOONS = []; // { sky (stripped string), x, y, col, core, glow, gpx, spr, w }
  for (const key in TH) {
    const t = TH[key];
    if (!t || typeof t[1] !== "string") continue;
    const m = t[1].match(RX);
    if (!m) continue;
    t[1] = t[1].slice(m[0].length);
    MOONS.push({ key, sky: t[1], x: +m[1], y: +m[2], col: m[3], core: +m[4], glow: m[5], gpx: +m[6], spr: null, w: 0 });
  }
  const D = 300; // inside C.far (340)
  function moonTex(o) {
    const N = 256,
      cv = document.createElement("canvas");
    cv.width = cv.height = N;
    const x = cv.getContext("2d"),
      h = N / 2,
      rc = (h * o.core) / o.gpx;
    const gg = x.createRadialGradient(h, h, rc * 0.9, h, h, h);
    gg.addColorStop(0, o.glow);
    gg.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = gg;
    x.fillRect(0, 0, N, N);
    const cg = x.createRadialGradient(h - rc * 0.25, h - rc * 0.25, rc * 0.1, h, h, rc);
    cg.addColorStop(0, "#ffffff");
    cg.addColorStop(0.7, o.col);
    cg.addColorStop(1, o.col);
    x.fillStyle = cg;
    x.beginPath();
    x.arc(h, h, rc, 0, Math.PI * 2);
    x.fill();
    // a few soft craters
    x.fillStyle = "rgba(0,0,30,.07)";
    [
      [0.3, -0.2, 0.22],
      [-0.25, 0.3, 0.16],
      [0.05, 0.45, 0.1],
      [-0.4, -0.3, 0.12],
    ].forEach(([a, b, r]) => {
      x.beginPath();
      x.arc(h + a * rc, h + b * rc, r * rc, 0, Math.PI * 2);
      x.fill();
    });
    const tx = new T.CanvasTexture(cv);
    return tx;
  }
  function build() {
    MOONS.forEach((o) => {
      const mat = new T.SpriteMaterial({
        map: moonTex(o),
        transparent: true,
        depthWrite: false,
        fog: false,
        opacity: 0,
      });
      const s = new T.Sprite(mat);
      // screen spot -> fixed world heading: the old CSS moon sat x% across, y% down; north (-z) is the middle
      const az = ((o.x - 50) * 0.9 * Math.PI) / 180,
        el = ((14 + (50 - o.y) * 0.12) * Math.PI) / 180;
      o.dir = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
      const rCore = D * Math.tan((0.95 * Math.PI) / 180) * (o.core / 20);
      const sz = (2 * rCore * o.gpx) / o.core;
      o.sz = sz;
      s.scale.set(sz, sz, 1);
      s.renderOrder = -5;
      s.frustumCulled = false;
      s.visible = false;
      s.userData.polishMoon = 1;
      o.spr = s;
      S.add(s);
    });
  }
  // ---------- 3) a sandstone sidewalk ring round Lamplight Square ----------
  // Gloomway's sidewalks stopped at local z -16.5 and the square's door walks were separate patches with grass between,
  // so nothing met. One flat ring (r 18.9..22.8, just above the cobbles) joins them all. Runtime piece (after BASE).
  function squareRing() {
    const N = 256,
      cv = document.createElement("canvas");
    cv.width = cv.height = N;
    const x = cv.getContext("2d");
    x.fillStyle = "#6c645e";
    x.fillRect(0, 0, N, N);
    for (let r = 0; r < 8; r++)
      for (let q = 0; q < 4; q++) {
        x.fillStyle = ["#c2b8aa", "#b4aa9c", "#ccc2b4"][(r + q) % 3];
        x.fillRect(q * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28);
      }
    const t = new T.CanvasTexture(cv);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(12, 12);
    t.anisotropy = 4;
    const m = new T.Mesh(
      new T.RingGeometry(18.9, 22.8, 120, 1),
      new T.MeshLambertMaterial({ map: t, color: 0xd8d0ec }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(OX, 0.075, OZ);
    m.name = "polish:sqring";
    m.userData.own = 1;
    S.add(m);
  }
  let built = false;
  function pre() {
    if (!built) {
      built = true;
      try {
        build();
      } catch (e) {
        console.warn("POLISH: moon", e);
      }
      try {
        squareRing();
      } catch (e) {
        console.warn("POLISH: square ring", e);
      }
    }
    for (let i = 0; i < MOONS.length; i++) {
      const o = MOONS[i],
        s = o.spr;
      if (!s) continue;
      s.visible = o.w > 0.01;
      if (!s.visible) continue;
      s.material.opacity = o.w;
      // 11 skyFit pulls C.far in to the fog's end: sit just inside it (behind the shrunk mountain ring), same look
      const d = Math.max(20, C.far - 3);
      s.scale.set((o.sz * d) / D, (o.sz * d) / D, 1);
      s.position.copy(C.position).addScaledVector(o.dir, d);
    }
  }
  if (typeof WONDR !== "undefined" && WONDR.pre) WONDR.pre(pre);
  const find = (sky) => {
    if (!sky) return null;
    for (let i = 0; i < MOONS.length; i++) if (sky.endsWith(MOONS[i].sky)) return MOONS[i];
    return null;
  };
  if (typeof themeApply === "function" && MOONS.length) {
    const ta0 = themeApply;
    themeApply = function (A, B, k) {
      const out = ta0.apply(this, arguments);
      try {
        for (let i = 0; i < MOONS.length; i++) MOONS[i].w = 0;
        const a = find(A && A.sky),
          b = B ? find(B.sky) : null;
        if (a) a.w += B ? 1 - k : 1;
        if (b) b.w += k;
      } catch (e) {}
      return out;
    };
    // 12-start already ran theme("hub") with the old sky string (moon painted in): put the current look on again
    try {
      theme(typeof lastTh === "string" && lastTh && lastTh !== "mix" && TH[lastTh] ? lastTh : "hub");
    } catch (e) {}
  }

  // ---------- 2) battle HUD ----------
  // The foe list (#eus, top right) is hidden in solo/host battles; each foe gets a small tag over its head instead
  // (name, HP bar, Burn/Chill/Stun/Hex/Guard chips, next move; click = aim). The player plate (#lcol) moves to the
  // bottom left, just above the hand. Cards in the hand never shrink into each other.
  const css = document.createElement("style");
  css.textContent =
    "body.pbat #eus{display:none!important}" +
    "body.pbat #lcol{position:fixed;left:8px;top:auto;bottom:var(--pbb,170px);z-index:4;width:min(290px,34%)}" +
    "#hand{gap:8px}#hand .card{flex-shrink:0!important;min-width:0}" +
    "#hand .card h3,#hand .card small{overflow-wrap:anywhere}" +
    "#ftags{position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden}" +
    "#ftags .ft{position:absolute;transform:translate(-50%,-100%);min-width:92px;max-width:150px;padding:3px 6px 4px;" +
    "border-radius:8px;background:rgba(14,10,30,.78);border:1px solid rgba(255,233,176,.25);color:#f3efff;" +
    "font:700 11px system-ui;text-align:center;pointer-events:auto;cursor:pointer;white-space:nowrap}" +
    "#ftags .ft.tg{border-color:#ffd34d;box-shadow:0 0 10px rgba(255,211,77,.55)}" +
    "#ftags .ft b{display:block;font:800 11px Fraunces,Georgia,serif;overflow:hidden;text-overflow:ellipsis}" +
    "#ftags .fb{height:6px;margin:2px 0 1px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}" +
    "#ftags .fb i{display:block;height:100%;background:linear-gradient(90deg,#c83a3a,#ff7a5a)}" +
    "#ftags .fh{font:600 10px system-ui;opacity:.85}" +
    "#ftags .chips{display:flex;flex-wrap:wrap;justify-content:center;gap:3px;margin-top:2px}" +
    "#ftags .chips span{padding:0 5px;border-radius:7px;font:800 10px/15px system-ui;color:#140e06}" +
    "#ftags .nx{margin-top:2px;font:600 10px system-ui;color:#ffd27a;white-space:normal}";
  document.head.appendChild(css);
  let tagBox = null;
  const tags = new Map(),
    tv = new T.Vector3();
  const chip = (t, c) => '<span style="background:' + c + '">' + t + "</span>";
  function tagHtml(f) {
    const st = f.st || {};
    let ch = "";
    if (st.burn) ch += chip("🔥 " + st.burn, "#ff9a4a");
    if (st.chill) ch += chip("❄ " + st.chill, "#8ad0ff");
    if (f.stun) ch += chip("✦ Stun", "#ffe066");
    if (f.hex) ch += chip("Hex", "#c9a0ff");
    if (f.guard) ch += chip("🛡 Guard", "#c8c8d8");
    if (f.el && typeof AFX !== "undefined" && AFX[f.el]) ch += chip("Elite", "#ffb830");
    const nx = f.it ? (f.mvn ? f.mvn + " " : "") + (f.itx || "") : "";
    return (
      "<b>" +
      f.label +
      '</b><div class="fb"><i style="width:' +
      Math.max(0, (f.hp / f.max) * 100) +
      '%"></i></div><div class="fh">' +
      f.hp +
      " / " +
      f.max +
      "</div>" +
      (ch ? '<div class="chips">' + ch + "</div>" : "") +
      (nx ? '<div class="nx">Next: ' + nx + "</div>" : "")
    );
  }
  function headY(f) {
    if (f._pty == null) {
      try {
        const bx = new T.Box3().setFromObject(f.m),
          h = bx.max.y - f.m.position.y;
        f._pty = isFinite(h) && h > 0.3 && h < 30 ? h + 0.35 : 2.6;
      } catch (e) {
        f._pty = 2.6;
      }
    }
    return f._pty;
  }
  function hud() {
    const bl = $("bdxl"); // 48's boss intro letterbox
    const on =
      typeof mode !== "undefined" && mode === "battle" && g && g.foes && !g.intro && !(bl && bl.classList.contains("on"));
    document.body.classList.toggle("pbat", mode === "battle");
    if (mode === "battle") {
      const bui = $("bui");
      document.body.style.setProperty("--pbb", (bui ? bui.offsetHeight : 160) + 6 + "px");
    }
    if (!on) {
      if (tagBox) tagBox.style.display = "none";
      return;
    }
    if (!tagBox) {
      tagBox = document.createElement("div");
      tagBox.id = "ftags";
      stage.appendChild(tagBox);
    }
    tagBox.style.display = "";
    const w = stage.clientWidth,
      h = stage.clientHeight,
      tf = typeof tgt === "function" ? tgt() : null,
      seen = new Set();
    g.foes.forEach((f, i) => {
      if (!f || f.hp <= 0 || !f.m || !f.m.visible) return;
      seen.add(f);
      let el = tags.get(f);
      if (!el) {
        el = document.createElement("div");
        el.className = "ft";
        el.onpointerdown = (e) => e.stopPropagation();
        el.onclick = () => {
          const j = g.foes.indexOf(f);
          if (j >= 0 && f.hp > 0) {
            g.tgt = j;
            ui();
          }
        };
        tagBox.appendChild(el);
        tags.set(f, el);
      }
      const ht = tagHtml(f);
      if (el._h !== ht) el.innerHTML = el._h = ht;
      el.classList.toggle("tg", f === tf);
      tv.copy(f.m.position);
      tv.y += headY(f);
      tv.project(C);
      if (tv.z > 1 || tv.z < -1) return (el.style.display = "none");
      el.style.display = "";
      el.style.left = (((tv.x + 1) / 2) * w).toFixed(1) + "px";
      el.style.top = (((1 - tv.y) / 2) * h).toFixed(1) + "px";
    });
    tags.forEach((el, f) => {
      if (!seen.has(f)) {
        el.remove();
        tags.delete(f);
      }
    });
  }
  if (typeof WONDR !== "undefined" && WONDR.pre)
    WONDR.pre(() => {
      try {
        hud();
      } catch (e) {}
    });

  return { MOONS };
})();
