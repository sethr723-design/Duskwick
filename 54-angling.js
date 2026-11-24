// v39 Angling (loads after 53-wonders): only top-level name ANGLE.
// Fishing spots are found once on the first explore frame: pond water discs (33-roads, CircleGeometry ~0x2f8a7a),
// ice-fishing holes and frozen ponds (03 Frozen Lake Way, ~0x10202e / ~0xbfe4f8), the square's fountain (solo only:
// online it is the Great Lamp, 39), plus two Cinder Wells built here in the Cinderwaste village (WONDR.clear spots,
// solid). Near one, "Press E to fish": cast, wait for the bite, press again in time, then the reel: hold E / Space /
// the mouse to keep the green catch zone over the fish until the meter fills. Five fish per water (common to
// legendary) plus junk; weights, records and counts in lazy P.fish = { c, s: {name: {n, b}} }. Pays glimmers + XP,
// first catches pay double, legendaries add gear. Book > World > Angler's Log. No NET messages, no lights.
const ANGLE = (() => {
  const cls = (c) => document.body.classList.contains(c);
  const on = () => typeof SLOT !== "undefined" && SLOT >= 0 && typeof P === "object" && !!P && !!P.name;
  const live = () => on() && mode === "explore" && !paused && !cls("cut") && !cls("ttl");
  const busyNear = () => !!(window.__np || window.__ln || window.__ch);
  const typing = (e) => e.target && /^(input|textarea|select)$/i.test(e.target.tagName || "");
  const lv = () => Math.max(1, P.lvl || 1);
  const low = () => typeof GFX !== "undefined" && GFX === "low";
  const fd = () => {
    if (!P.fish) P.fish = { c: 0, s: {} };
    P.fish.s = P.fish.s || {};
    return P.fish;
  };

  // ---------- fish ----------
  const RC = ["#e8e0d0", "#8affa0", "#7ab8ff", "#ffb84a"],
    RN = ["Common", "Uncommon", "Rare", "Legendary"];
  // [name, rarity, min lb, max lb, difficulty 1-5, value, colour]
  const FISH = {
    still: {
      n: "Still water",
      w: "ponds along the roads and streets",
      f: [
        ["Dusk Minnow", 0, 0.1, 0.4, 1, 6, 0x9a8a70],
        ["Lamplit Perch", 0, 0.5, 2.2, 2, 10, 0xd8a050],
        ["Copper Carp", 1, 2, 8, 3, 22, 0xc87a3a],
        ["Moonscale Trout", 2, 3, 9, 4, 45, 0xc8d8ff],
        ["Old Whiskers", 3, 22, 41, 5, 130, 0x6a5a40],
      ],
    },
    fount: {
      n: "The fountain",
      w: "Lamplight Square's fountain (when playing solo)",
      f: [
        ["Wishing Minnow", 0, 0.1, 0.3, 1, 8, 0x8ad0ff],
        ["Penny Dace", 0, 0.3, 1.2, 2, 12, 0xd8b060],
        ["Coin Carp", 1, 2, 6, 3, 30, 0xffd27a],
        ["Glimmerfin", 2, 1, 4, 4, 55, 0xb8f0ff],
        ["The Lamp-Eel", 3, 8, 15, 5, 150, 0xffe9a0],
      ],
    },
    frost: {
      n: "Frozen water",
      w: "ice holes and frozen ponds in Frostfen",
      f: [
        ["Glassfin", 0, 0.2, 0.8, 1, 8, 0xd8f0ff],
        ["Rime Smelt", 0, 0.3, 1, 2, 10, 0xa8c8e8],
        ["Frost Pike", 1, 4, 12, 3, 26, 0x6a9ac8],
        ["Aurora Char", 2, 3, 10, 4, 50, 0x8affd0],
        ["Old Icejaw", 3, 30, 55, 5, 140, 0xe8f8ff],
      ],
    },
    ember: {
      n: "Cinder wells",
      w: "the glowing Cinder Wells in the Cinderwaste",
      f: [
        ["Ash Guppy", 0, 0.1, 0.5, 1, 8, 0x5a5050],
        ["Cinder Eel", 0, 1, 3, 2, 12, 0xff7a3a],
        ["Magma Koi", 1, 2, 7, 3, 28, 0xff5a2a],
        ["Phoenix-tail", 2, 2, 6, 4, 55, 0xffb84a],
        ["The Ember King", 3, 18, 34, 5, 150, 0xffe070],
      ],
    },
    marsh: {
      n: "Bog water",
      w: "the ponds around Mirewick",
      f: [
        ["Bog Loach", 0, 0.3, 1, 1, 8, 0x6a7a4a],
        ["Mudskip", 0, 0.2, 0.8, 2, 10, 0x8a7a5a],
        ["Lantern Angler", 1, 2, 6, 3, 28, 0x9aff9a],
        ["Wisp Gar", 2, 3, 9, 4, 52, 0xb8ffe0],
        ["The Drowned Bellfish", 3, 20, 38, 5, 150, 0x7a9a8a],
      ],
    },
  };
  const JUNK = [
    ["Soggy Boot", "Somebody walked home with one wet foot."],
    ["Bent Lantern Hook", "Still warm, somehow."],
    ["Snuffed Wick", "It smells of somebody's kitchen."],
    ["Tangle of Weed", "Green, slimy, proud of itself."],
  ];

  // ---------- spots ----------
  const SP = []; // {x, z, r, y, w: water key, walk: stand on it, nm}
  const near = (a, b, t) => {
    const x = a.getHex ? a.getHex() : a;
    return (
      Math.abs(((x >> 16) & 255) - ((b >> 16) & 255)) < t &&
      Math.abs(((x >> 8) & 255) - ((b >> 8) & 255)) < t &&
      Math.abs((x & 255) - (b & 255)) < t
    );
  };
  const waterOf = (x, z) => {
    const q = zoneAt(x, z);
    return q === "frost" ? "frost" : q === "ember" ? "ember" : q === "marsh" ? "marsh" : "still";
  };
  function addSpot(s) {
    if (SP.some((o) => Math.hypot(o.x - s.x, o.z - s.z) < Math.max(1.2, o.r * 0.5))) return;
    SP.push(s);
  }
  function findSpots() {
    const v = new T.Vector3();
    S.updateMatrixWorld(true);
    S.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.material || !o.material.color) return;
      const gp = o.geometry.parameters || {},
        ty = o.geometry.type,
        c = o.material.color;
      const sc = Math.max(Math.abs(o.matrixWorld.elements[0]), Math.abs(o.matrixWorld.elements[10]), 0.001);
      if (ty === "CircleGeometry" && gp.radius >= 2.4 && gp.radius <= 10 && near(c, 0x2f8a7a, 22)) {
        o.getWorldPosition(v);
        addSpot({ x: v.x, z: v.z, r: gp.radius * sc, y: v.y + 0.03, w: waterOf(v.x, v.z) });
      } else if (
        ty === "CylinderGeometry" &&
        Math.abs(gp.radiusTop - 0.7) < 0.01 &&
        gp.height < 0.1 &&
        near(c, 0x10202e, 18)
      ) {
        o.getWorldPosition(v);
        addSpot({ x: v.x, z: v.z, r: 0.7, y: v.y + 0.05, w: "frost", hole: 1 });
      } else if (
        ty === "CylinderGeometry" &&
        gp.radiusTop >= 9 &&
        gp.radiusTop <= 14 &&
        gp.height < 0.1 &&
        near(c, 0xbfe4f8, 20)
      ) {
        o.getWorldPosition(v);
        addSpot({ x: v.x, z: v.z, r: gp.radiusTop * sc, y: v.y + 0.04, w: "frost", walk: 1 });
      }
    });
    addSpot({ x: OX, z: OZ, r: 2.1, y: 0.86, w: "fount", fount: 1 });
    wells();
  }
  // two Cinder Wells in the Cinderwaste village: a stone ring round a glowing magma pool (solid)
  function wells() {
    const [cx, cz] = ZCEN.ember,
      r = WONDR.rng(WONDR.hash("cinderwell")),
      got = [];
    for (let t = 0; t < 900 && got.length < 2; t++) {
      const a = r() * 6.283,
        d = 16 + r() * 24,
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (!okp(x, z) || !WONDR.clear(x, z, 3.2)) continue;
      let ok = 0;
      for (let k = 0; k < 8; k++) if (okp(x + Math.cos(k * 0.785) * 3, z + Math.sin(k * 0.785) * 3)) ok++;
      if (ok < 6 || got.some((q) => Math.hypot(q[0] - x, q[1] - z) < 20)) continue;
      if (PT.some((q) => Math.hypot(q.x - x, q.z - z) < 7)) continue;
      got.push([x, z]);
    }
    got.forEach(([x, z]) => {
      const g0 = new T.Group();
      g0.userData.wdr = 1;
      g0.userData.lus = 1;
      const st = new T.Mesh(new T.CylinderGeometry(1.75, 1.95, 0.55, 18, 1, true), M(0x4a4048, 1));
      st.material.side = T.DoubleSide;
      st.position.y = 0.27;
      const rim = new T.Mesh(new T.TorusGeometry(1.78, 0.2, 6, 18), M(0x5a5058));
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = 0.55;
      const lava = new T.Mesh(new T.CircleGeometry(1.6, 24), new T.MeshBasicMaterial({ color: 0xff6a20 }));
      lava.rotation.x = -Math.PI / 2;
      lava.position.y = 0.32;
      lava.material.userData.dtx = 0;
      const gl = WONDR.glowS(0xff7a2a, 4.5, 0.7);
      gl.position.y = 0.9;
      g0.add(st, rim, lava, gl);
      for (let k = 0; k < 7; k++) {
        const b = new T.Mesh(new T.DodecahedronGeometry(0.28 + (k % 3) * 0.08, 0), M(0x3a3438));
        const a = (k / 7) * 6.283 + 0.3;
        b.position.set(Math.cos(a) * 2.15, 0.15, Math.sin(a) * 2.15);
        b.rotation.set(k, k * 2, 0);
        g0.add(b);
      }
      g0.position.set(x, 0, z);
      g0.userData.lava = lava;
      g0.userData.gl = gl;
      S.add(g0);
      solids.push({ x, z, r: 1.9 });
      WELLS.push(g0);
      addSpot({ x, z, r: 1.6, y: 0.34, w: "ember", well: 1 });
    });
  }
  const WELLS = [];

  // ---------- page bits ----------
  const css = document.createElement("style");
  css.textContent =
    "#angh{position:fixed;left:50%;bottom:22%;transform:translateX(-50%);padding:8px 16px;border-radius:10px;" +
    "background:rgba(10,24,40,.85);color:#9fe0ff;font:600 16px system-ui,sans-serif;border:1px solid #7ad0ff88;" +
    "z-index:50;display:none;cursor:pointer;white-space:nowrap}" +
    "#angh.bite{color:#fff;background:rgba(200,60,30,.9);border-color:#ffd27a;font-size:22px;animation:angb .25s infinite alternate}" +
    "@keyframes angb{from{transform:translateX(-50%) scale(1)}to{transform:translateX(-50%) scale(1.12)}}" +
    "#angr{position:fixed;left:50%;bottom:16%;transform:translateX(-50%);width:min(380px,calc(100% - 32px));z-index:61;" +
    "display:none;padding:12px 14px 10px;border-radius:14px;background:rgba(8,16,30,.88);border:1px solid #7ad0ff66;" +
    "box-shadow:0 6px 30px #0008;user-select:none;touch-action:none}" +
    "#angr .tr{position:relative;height:34px;border-radius:9px;overflow:hidden;" +
    "background:linear-gradient(180deg,#0d3a5a,#06203a);box-shadow:inset 0 2px 8px #000a}" +
    "#angr .zn{position:absolute;top:3px;bottom:3px;border-radius:7px;background:rgba(120,255,160,.28);" +
    "border:2px solid #8affa0;box-sizing:border-box;transition:background .15s}" +
    "#angr .zn.in{background:rgba(120,255,160,.5);box-shadow:0 0 12px #8affa0}" +
    "#angr .fs{position:absolute;top:7px;width:30px;height:20px;margin-left:-15px}" +
    "#angr .pg{height:8px;margin-top:8px;border-radius:4px;background:#0008;overflow:hidden}" +
    "#angr .pg div{height:100%;width:30%;background:linear-gradient(90deg,#ffd27a,#8affa0);transition:width .08s}" +
    "#angr .tx{font:600 12px system-ui,sans-serif;color:#9fc8e0;text-align:center;margin-top:6px}" +
    "#angc{position:fixed;left:50%;top:26%;transform:translate(-50%,-10px);z-index:62;pointer-events:none;opacity:0;" +
    "transition:opacity .4s,transform .4s;text-align:center;padding:14px 26px;border-radius:16px;" +
    "background:radial-gradient(ellipse at 50% 50%,rgba(10,20,36,.92),rgba(10,20,36,.78));border:1px solid #7ad0ff55;min-width:240px}" +
    "#angc.on{opacity:1;transform:translate(-50%,0)}" +
    "#angc .k{font:700 11px system-ui,sans-serif;letter-spacing:.25em}" +
    "#angc .n{font:700 26px Fraunces,Georgia,serif;margin:4px 0;text-shadow:0 2px 6px #000}" +
    "#angc .d{font:14px system-ui,sans-serif;color:#d8e6f0}" +
    "#angc .b{font:700 13px system-ui,sans-serif;color:#ffd27a;margin-top:6px}";
  document.head.appendChild(css);
  const hint = document.createElement("div");
  hint.id = "angh";
  const RL = document.createElement("div");
  RL.id = "angr";
  const fishSvg =
    '<svg class="fs" viewBox="0 0 30 20"><path d="M2 10 Q10 1 20 6 L28 1 L26 10 L28 19 L20 14 Q10 19 2 10Z" fill="#ffb84a" stroke="#5a2a0a" stroke-width="1.2"/><circle cx="8" cy="9" r="1.6" fill="#1a0a00"/></svg>';
  RL.innerHTML =
    '<div class="tr"><div class="zn"></div>' +
    fishSvg +
    '</div><div class="pg"><div></div></div><div class="tx">Hold E / Space / mouse to raise the net · let go to drop it</div>';
  const card = document.createElement("div");
  card.id = "angc";
  document.body.append(hint, RL, card);
  const zEl = RL.querySelector(".zn"),
    fEl = RL.querySelector(".fs"),
    pEl = RL.querySelector(".pg div");

  // ---------- rod, line, bobber ----------
  let ROD = null;
  function rodMake() {
    const g0 = new T.Group();
    g0.userData.wdr = 1;
    g0.userData.lus = 1;
    const pole = new T.Mesh(new T.CylinderGeometry(0.025, 0.05, 2.8, 6), M(0x6b4a2b));
    pole.position.y = 1.4;
    const tip = new T.Object3D();
    tip.position.y = 2.8;
    const reel = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.08, 10), M(0x8a8a9a));
    reel.rotation.z = Math.PI / 2;
    reel.position.set(0.06, 0.45, 0);
    g0.add(pole, tip, reel);
    const bob = new T.Group();
    const b1 = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), new T.MeshBasicMaterial({ color: 0xff3a2a })),
      b2 = new T.Mesh(
        new T.SphereGeometry(0.135, 10, 8, 0, 6.283, Math.PI / 2, Math.PI / 2),
        new T.MeshBasicMaterial({ color: 0xf8f0e0 }),
      );
    bob.add(b1, b2);
    bob.userData.wdr = 1;
    const lg = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]),
      line = new T.Line(lg, new T.LineBasicMaterial({ color: 0xe8e8f0, transparent: true, opacity: 0.7 }));
    line.frustumCulled = false;
    line.userData.wdr = 1;
    S.add(g0, bob, line);
    ROD = { g: g0, tip, bob, line };
  }
  function rodShow(v) {
    if (!ROD) rodMake();
    ROD.g.visible = ROD.bob.visible = ROD.line.visible = v;
  }
  const RIPS = [];
  function ripple(x, y, z, big) {
    const m = new T.Mesh(
      new T.RingGeometry(0.15, 0.24, 24),
      new T.MeshBasicMaterial({
        color: 0xdff4ff,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y + 0.02, z);
    m.userData = { t: 0, l: big ? 1.4 : 1, s: big ? 6 : 3.5 };
    S.add(m);
    RIPS.push(m);
  }
  function ripTick(dt) {
    for (let i = RIPS.length - 1; i >= 0; i--) {
      const m = RIPS[i],
        u = m.userData;
      u.t += dt;
      const k = u.t / u.l;
      m.scale.setScalar(1 + k * u.s);
      m.material.opacity = 0.7 * (1 - k);
      if (k >= 1) {
        S.remove(m);
        m.geometry.dispose();
        m.material.dispose();
        RIPS.splice(i, 1);
      }
    }
  }

  // ---------- state machine ----------
  // F = { st: "cast"|"wait"|"bite"|"reel", sp, t0, ... }
  let F = null;
  const held = { e: 0, sp: 0, m: 0 };
  const holding = () => held.e || held.sp || held.m;
  let curSpot = null;
  function pick(sp) {
    const tb = FISH[sp.w].f,
      r = Math.random(),
      lb = Math.min(0.03, lv() * 0.0015);
    if (r < 0.06) return { junk: JUNK[Math.floor(Math.random() * JUNK.length)] };
    const x = Math.random();
    const rar = x < 0.025 + lb ? 3 : x < 0.125 + lb * 2 ? 2 : x < 0.39 ? 1 : 0;
    const opts = tb.filter((f) => f[1] === rar);
    const f = opts[Math.floor(Math.random() * opts.length)];
    const k = Math.pow(Math.random(), 1.6);
    return { f, lb: Math.round((f[2] + (f[3] - f[2]) * k) * 10) / 10 };
  }
  function target(sp) {
    const p = W.position;
    if (sp.walk) {
      const a = W.rotation.y;
      return new T.Vector3(p.x + Math.sin(a) * 2.6, sp.y, p.z + Math.cos(a) * 2.6);
    }
    const dx = sp.x - p.x,
      dz = sp.z - p.z,
      d = Math.hypot(dx, dz) || 1,
      inset = sp.hole ? 0 : Math.min(sp.r * 0.55, sp.r - 0.4, 2.6);
    return new T.Vector3(
      sp.x - (dx / d) * (sp.r - Math.max(0, inset)) * (sp.hole ? 0 : 1),
      sp.y,
      sp.z - (dz / d) * (sp.r - Math.max(0, inset)) * (sp.hole ? 0 : 1),
    );
  }
  function start(sp) {
    rodShow(true);
    const tg = target(sp);
    F = {
      st: "cast",
      sp,
      t0: performance.now(),
      tg,
      pos: W.position.clone(),
      face: Math.atan2(tg.x - W.position.x, tg.z - W.position.z),
    };
    if (sp.walk) {
      const h = new T.Mesh(
        new T.CircleGeometry(0.55, 16),
        new T.MeshBasicMaterial({ color: 0x10202e, depthWrite: false }),
      );
      h.rotation.x = -Math.PI / 2;
      h.position.set(tg.x, sp.y + 0.01, tg.z);
      h.material.userData.dtx = 0;
      S.add(h);
      F.hole = h;
    }
    hint.style.display = "none";
    WONDR.whoosh(0.45);
  }
  function stop(msg, col) {
    if (!F) return;
    if (F.hole) {
      S.remove(F.hole);
      F.hole.geometry.dispose();
      F.hole.material.dispose();
    }
    F = null;
    rodShow(false);
    RL.style.display = "none";
    hint.classList.remove("bite");
    hint.style.display = "none";
    held.e = held.sp = held.m = 0;
    if (typeof keys === "object") for (const k in keys) keys[k] = 0;
    if (msg) toast(msg, col || "#9fc8e0");
  }
  function bite() {
    F.st = "bite";
    F.t0 = performance.now();
    F.win = 900 + (F.catch.f ? (5 - F.catch.f[4]) * 60 : 200);
    hint.textContent = "!  Press E  !";
    hint.classList.add("bite");
    hint.style.display = "block";
    ripple(F.tg.x, F.sp.y, F.tg.z, true);
    puff(
      new T.Vector3(F.tg.x, F.sp.y + 0.1, F.tg.z),
      F.sp.w === "ember" ? "fire" : "ice",
      low() ? 3 : 7,
      1.6,
      0.5,
      0.5,
    );
    WONDR.tone(1320, 0, 0.18, "square", 0.08);
    WONDR.tone(1760, 0.09, 0.22, "square", 0.08);
  }
  function hook() {
    hint.classList.remove("bite");
    hint.style.display = "none";
    const c = F.catch;
    if (c.junk) return land();
    const d = c.f[4];
    F.st = "reel";
    F.t0 = performance.now();
    F.w = Math.max(0.15, 0.3 - 0.028 * d);
    F.zx = 0.5 - F.w / 2;
    F.zv = 0;
    F.fx = 0.5;
    F.ft = 0.5;
    F.fn = 0;
    F.pr = 0.3;
    RL.style.display = "block";
    WONDR.tone(440, 0, 0.3, "sawtooth", 0.05, 660);
  }
  function reelTick(dt, now) {
    const d = F.catch.f[4];
    // the fish darts to a new spot now and then (more often and further for harder fish)
    if (now > F.fn) {
      F.fn = now + (1500 - d * 190) * (0.5 + Math.random());
      const j = 0.18 + d * 0.09;
      F.ft = Math.max(0.03, Math.min(0.97, F.fx + (Math.random() * 2 - 1) * j * (Math.random() < 0.3 ? 1.8 : 1)));
    }
    const sp = 0.18 + d * 0.09,
      df = F.ft - F.fx;
    F.fx += Math.sign(df) * Math.min(Math.abs(df), sp * dt * (0.6 + Math.min(1, Math.abs(df) * 4)));
    F.zv += (holding() ? 2.8 : -2.4) * dt;
    F.zv = Math.max(-1.3, Math.min(1.3, F.zv));
    F.zx += F.zv * dt;
    if (F.zx < 0) {
      F.zx = 0;
      F.zv = Math.max(0, F.zv) * 0.2;
    }
    if (F.zx > 1 - F.w) {
      F.zx = 1 - F.w;
      F.zv = Math.min(0, F.zv) * -0.3;
    }
    const inz = F.fx >= F.zx && F.fx <= F.zx + F.w;
    F.pr += inz ? (0.34 - d * 0.025) * dt : -(0.17 + d * 0.03) * dt;
    zEl.style.left = F.zx * 100 + "%";
    zEl.style.width = F.w * 100 + "%";
    zEl.classList.toggle("in", inz);
    fEl.style.left = F.fx * 100 + "%";
    fEl.style.transform = "scaleX(" + (df < 0 ? 1 : -1) + ")";
    pEl.style.width = Math.max(0, Math.min(1, F.pr)) * 100 + "%";
    // the bobber thrashes about on the water
    ROD.bob.position.set(F.tg.x + (F.fx - 0.5) * 1.2, F.sp.y + Math.abs(Math.sin(now / 90)) * 0.06, F.tg.z);
    if (Math.random() < dt * 5) ripple(ROD.bob.position.x, F.sp.y, ROD.bob.position.z);
    if (F.pr >= 1) land();
    else if (F.pr <= 0) {
      WONDR.tone(330, 0, 0.4, "triangle", 0.1, 160);
      stop("It got away...", "#8a9ab8");
    }
  }
  function land() {
    const c = F.catch,
      sp = F.sp,
      D = fd();
    const bp = new T.Vector3(F.tg.x, sp.y + 0.3, F.tg.z);
    puff(bp, sp.w === "ember" ? "fire" : "ice", low() ? 4 : 10, 2.2, 0.6, 0.6);
    ripple(F.tg.x, sp.y, F.tg.z, true);
    stop();
    let k, n, d, b, col;
    if (c.junk) {
      const gd = 3 + Math.floor(Math.random() * 5);
      P.gold += gd;
      k = "JUNK";
      n = c.junk[0];
      d = c.junk[1];
      b = "+" + gd + " ✦";
      col = "#b8a890";
      WONDR.tone(220, 0, 0.3, "triangle", 0.1, 180);
    } else {
      const f = c.f,
        nm = f[0],
        rec = D.s[nm] || (D.s[nm] = { n: 0, b: 0 }),
        first = !rec.n,
        best = c.lb > rec.b;
      rec.n++;
      if (best) rec.b = c.lb;
      D.c = (D.c || 0) + 1;
      let gd = Math.round(f[5] * (0.8 + (0.5 * (c.lb - f[2])) / Math.max(0.1, f[3] - f[2]))),
        xp = Math.round(xpFor(lv()) * [0.4, 0.7, 1.2, 3][f[1]]);
      if (first) {
        gd *= 2;
        xp *= 2;
      }
      if (nm === "Coin Carp") gd += 20;
      P.gold += gd;
      P.xp += xp;
      k = RN[f[1]].toUpperCase() + (first ? "  ·  NEW SPECIES" : best && rec.n > 1 ? "  ·  NEW RECORD" : "");
      n = nm;
      d = c.lb + " lb" + (rec.n > 1 ? "  (best " + rec.b + " lb, caught " + rec.n + ")" : "");
      b = "+" + xp + " XP  +" + gd + " ✦";
      col = RC[f[1]];
      if (f[1] >= 3) {
        WONDR.chime([523, 659, 784, 1047, 1319, 1568], 0.11, 1.8);
        setTimeout(() => {
          try {
            giveItem(genItem(null, lv(), 3));
          } catch (e) {}
        }, 1200);
        b += "  + a treasure in its belly!";
      } else WONDR.chime(f[1] >= 2 ? [659, 880, 1175, 1568] : [659, 880, 1175], 0.08, 1);
      for (let i = 0; i < (low() ? 6 : 14); i++)
        mote(W.position.clone().setY(2), {
          c: f[6],
          v: [(Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3],
          l: 1.1,
          s: 0.3,
          g: -4,
        });
    }
    card.innerHTML =
      '<div class="k" style="color:' +
      col +
      '">' +
      k +
      '</div><div class="n" style="color:' +
      col +
      '">' +
      n +
      '</div><div class="d">' +
      d +
      '</div><div class="b">' +
      b +
      "</div>";
    card.classList.add("on");
    clearTimeout(card._t);
    card._t = setTimeout(() => card.classList.remove("on"), 3400);
    try {
      lvup();
    } catch (e) {}
    try {
      ui();
    } catch (e) {}
    sv();
  }

  // ---------- frame ----------
  let built = false,
    bootT = 0,
    last = performance.now(),
    poll = 0;
  const tipV = new T.Vector3();
  WONDR.pre(() => {
    if (!F) return;
    // stand still facing the water while fishing
    const p = W.position;
    p.x = F.pos.x;
    p.z = F.pos.z;
    W.rotation.y = F.face;
    ROD.g.position.set(p.x + Math.sin(F.face + 0.5) * 0.45, p.y + 0.55, p.z + Math.cos(F.face + 0.5) * 0.45);
    ROD.g.rotation.set(0, F.face, 0);
    ROD.g.rotateX(F.st === "reel" ? 0.55 + Math.sin(performance.now() / 70) * 0.06 : F.st === "cast" ? 0.2 : 0.75);
    ROD.g.updateMatrixWorld(true);
    ROD.tip.getWorldPosition(tipV);
    const a = ROD.line.geometry.attributes.position;
    a.setXYZ(0, tipV.x, tipV.y, tipV.z);
    a.setXYZ(1, ROD.bob.position.x, ROD.bob.position.y, ROD.bob.position.z);
    a.needsUpdate = true;
  });
  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now(),
      dt = Math.min(0.1, (now - last) / 1000),
      s = now / 1000;
    last = now;
    if (!on() || typeof W === "undefined") return;
    if (!built) {
      if (mode !== "explore" || cls("ttl") || !WONDR) return;
      if (!bootT) bootT = now + 2000;
      if (now < bootT) return;
      built = true;
      try {
        findSpots();
      } catch (e) {
        console.error(e);
      }
      return;
    }
    ripTick(dt);
    WELLS.forEach((g0) => {
      g0.userData.lava.material.color.setHSL(
        0.05 + Math.sin(s * 1.3 + g0.position.x) * 0.012,
        1,
        0.5 + Math.sin(s * 2) * 0.05,
      );
      g0.userData.gl.material.opacity = 0.55 + 0.2 * Math.sin(s * 2.4 + g0.position.z);
      if (!low() && Math.random() < dt * 1.5 && mode === "explore")
        puff(
          new T.Vector3(g0.position.x + (Math.random() - 0.5) * 2, 0.5, g0.position.z + (Math.random() - 0.5) * 2),
          "fire",
          1,
          0.8,
          0.8,
          0.5,
        );
    });
    if (F) {
      if (mode !== "explore" || cls("cut")) return stop();
      if (typeof keys === "object") keys.e = 0;
      // keep nearby foes calm while you fish
      for (const f of foes)
        if (!f.dead && f.o && Math.hypot(f.o.position.x - W.position.x, f.o.position.z - W.position.z) < 30)
          f.cool = Math.max(f.cool || 0, now + 1500);
      const k = (now - F.t0) / 1000;
      if (F.st === "cast") {
        const e = Math.min(1, k / 0.6);
        ROD.tip.getWorldPosition(tipV);
        ROD.bob.position.lerpVectors(tipV, F.tg, e);
        ROD.bob.position.y += Math.sin(e * Math.PI) * 2;
        if (e >= 1) {
          ROD.bob.position.copy(F.tg);
          ripple(F.tg.x, F.sp.y, F.tg.z);
          WONDR.tone(520, 0, 0.12, "sine", 0.1, 260);
          F.st = "wait";
          F.t0 = now;
          F.wt = 2000 + Math.random() * 5000;
          F.nib = now + 800 + Math.random() * 1200;
          F.catch = pick(F.sp);
          hint.textContent = "Waiting for a bite...  (move or Esc to stop)";
          hint.style.display = "block";
        }
      } else if (F.st === "wait") {
        ROD.bob.position.y = F.sp.y + Math.sin(s * 2.5) * 0.03;
        if (now > F.nib && now - F.t0 < F.wt - 400) {
          F.nib = now + 700 + Math.random() * 1500;
          ROD.bob.position.y -= 0.06;
          ripple(F.tg.x, F.sp.y, F.tg.z);
          WONDR.tone(900, 0, 0.06, "sine", 0.04);
        }
        if (now - F.t0 > F.wt) bite();
      } else if (F.st === "bite") {
        ROD.bob.position.y = F.sp.y - 0.12 + Math.sin(s * 30) * 0.04;
        if (now - F.t0 > F.win) {
          WONDR.tone(300, 0, 0.3, "triangle", 0.08, 200);
          stop("Too slow! It stole the bait.", "#8a9ab8");
        }
      } else if (F.st === "reel") reelTick(dt, now);
      return;
    }
    if (now - poll < 150) return;
    poll = now;
    curSpot = null;
    if (live() && !busyNear() && !(WONDR.busy && WONDR.busy())) {
      const p = W.position;
      let bd = 1e9;
      for (const sp of SP) {
        if (sp.fount && typeof NET === "object" && NET && NET.online) continue;
        const d = Math.hypot(p.x - sp.x, p.z - sp.z) - sp.r;
        if (d < 2.4 && d < bd && (sp.walk || d > -0.6)) {
          bd = d;
          curSpot = sp;
        }
      }
    }
    if (curSpot) {
      hint.textContent = "Press E to fish  ·  " + FISH[curSpot.w].n;
      hint.style.display = "block";
    } else hint.style.display = "none";
  }
  requestAnimationFrame(frame);
  hint.onclick = () => {
    if (F && F.st === "bite") hook();
    else if (!F && curSpot && live()) start(curSpot);
  };

  // ---------- keys / pointer (capture phase: fishing gets E and Space first) ----------
  const MOVE = { w: 1, a: 1, s: 1, d: 1, arrowup: 1, arrowdown: 1, arrowleft: 1, arrowright: 1 };
  addEventListener(
    "keydown",
    (e) => {
      if (!e.key || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (F) {
        if (k === "escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
          return stop();
        }
        if (k === "e" || k === " ") {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (k === "e") held.e = 1;
          else held.sp = 1;
          if (!e.repeat && F.st === "bite") hook();
          return;
        }
        if (MOVE[k]) {
          if (F.st === "cast" || F.st === "wait") stop();
          else {
            e.stopImmediatePropagation();
            e.preventDefault();
          }
        }
        return;
      }
      if (k === "e" && !e.repeat && curSpot && live() && !busyNear()) {
        e.stopImmediatePropagation();
        if (typeof keys === "object") keys.e = 0;
        start(curSpot);
      }
    },
    true,
  );
  addEventListener(
    "keyup",
    (e) => {
      if (!e.key) return;
      const k = e.key.toLowerCase();
      if (k === "e") held.e = 0;
      if (k === " ") held.sp = 0;
    },
    true,
  );
  addEventListener(
    "pointerdown",
    (e) => {
      if (F && F.st === "reel") {
        held.m = 1;
        e.preventDefault();
      } else if (
        F &&
        F.st === "bite" &&
        e.target &&
        (e.target.id === "stage" || (e.target.closest && e.target.closest("#stage")))
      )
        hook();
    },
    true,
  );
  addEventListener("pointerup", () => (held.m = 0), true);
  addEventListener("pointercancel", () => (held.m = 0), true);
  addEventListener("blur", () => (held.e = held.sp = held.m = 0));

  // ---------- Book > World > Angler's Log ----------
  const tg = BOOKG.find((G) => G[0] === "travel");
  if (tg && tg[2]) tg[2].push(["fish", "Angler's Log"]);
  function page(L) {
    const D = fd();
    const all = Object.values(FISH).reduce((a, w) => a + w.f.length, 0),
      got = Object.values(FISH).reduce((a, w) => a + w.f.filter((f) => D.s[f[0]] && D.s[f[0]].n).length, 0);
    L.insertAdjacentHTML(
      "beforeend",
      '<div class="sec">Angler\'s Log (' +
        got +
        " / " +
        all +
        " species · " +
        (D.c || 0) +
        ' caught)</div><small style="display:block;margin-bottom:6px;color:#c9b8a0">Stand by water and press E to cast. When the float dips, press E fast, then hold E, Space or the mouse to keep the green net over the fish. Every water has its own fish; the first of each kind pays double.</small>',
    );
    Object.keys(FISH).forEach((wk) => {
      const W0 = FISH[wk];
      L.insertAdjacentHTML(
        "beforeend",
        '<div class="sec" style="font-size:13px">' + W0.n + ' <small style="opacity:.7">· ' + W0.w + "</small></div>",
      );
      W0.f.forEach((f) => {
        const r = D.s[f[0]],
          row = document.createElement("div");
        row.className = "row";
        row.innerHTML =
          r && r.n
            ? '<div><b style="color:' +
              RC[f[1]] +
              '">' +
              f[0] +
              "</b><small>" +
              RN[f[1]] +
              " · best " +
              r.b +
              " lb · caught " +
              r.n +
              "</small></div>"
            : '<div><b style="opacity:.6">???</b><small>' + RN[f[1]] + " · not caught yet</small></div>";
        L.appendChild(row);
      });
    });
  }
  const panel0 = panel;
  panel = function (k, id) {
    panel0.apply(this, arguments);
    try {
      if (k === "book" && BOOKL.last === "fish" && on()) page($("pl"));
    } catch (e) {
      console.error(e);
    }
  };

  return { FISH, SP, start: () => curSpot && start(curSpot), stop, busy: () => !!F, state: () => fd() };
})();
