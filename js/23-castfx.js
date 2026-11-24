// DUSKWICK - 23-castfx.js: v23 school-themed spell charging around the caster while the timed-hit ring runs (qte, 08).
// CHG.start(card) -> handle; qte sets h.k (0..1 build-up) every frame; CHG.stop(h, grade) releases it into the spell
// (a burst at the lantern, then the normal SFX/RFX play) and CHG.kill() drops it at once. Strength (CHG.pow) comes from
// the card's base damage (CDMG) or pip cost: a stronger spell = a bigger, brighter, denser charge.
// Only sprites (puff/mote, additive ones follow GLOWU) and a few pooled meshes: no lights, no onBeforeCompile.
// Only top-level name: CHG.
const CHG = (() => {
  const EL = { fire: 1, ice: 1, storm: 1, heal: 1, spirit: 1 };
  const COL = { fire: 0xff8a3d, ice: 0xa8dcff, storm: 0x9fd8ff, heal: 0x7dff9a, spirit: 0xc39bff };
  const elOf = (c) => (c && EL[c.a] ? c.a : schEl());
  const qual = () => (GFX === "low" ? 0.4 : GFX === "med" ? 0.7 : 1);
  const RL = 280; // ms the release takes (orbiters rush into the lantern, ground pieces fade)
  function pow(c) {
    let b = 0,
      pip = 1;
    try {
      if (c && CDMG[c.k])
        b = CDMG[c.k](Math.max(1, (g.foes || []).filter((f) => f.hp > 0).length), (g.allies || []).length);
    } catch (e) {}
    try {
      pip = cc(c) || 1;
    } catch (e) {
      pip = (c && c.c) || 1;
    }
    const pd = b > 0 ? Math.log(b / 8) / Math.log(150 / 8) : 0,
      pp = (pip - 1) / 4;
    return Math.max(0.08, Math.min(1, Math.max(pd, pp)));
  }
  // ---- textures ----
  const LEAF = cvT(64, 64, (x) => {
    x.translate(32, 32);
    x.rotate(0.6);
    x.fillStyle = "#5fc24a";
    x.beginPath();
    x.ellipse(0, 0, 11, 26, 0, 0, 7);
    x.fill();
    x.strokeStyle = "#c8f5a0";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, -24);
    x.lineTo(0, 24);
    x.stroke();
  });
  const FROST = cvT(128, 128, (x) => {
    const q = x.createRadialGradient(64, 64, 10, 64, 64, 63);
    q.addColorStop(0, "rgba(200,235,255,.12)");
    q.addColorStop(0.72, "rgba(190,230,255,.5)");
    q.addColorStop(0.9, "rgba(240,250,255,.9)");
    q.addColorStop(1, "rgba(200,235,255,0)");
    x.fillStyle = q;
    x.fillRect(0, 0, 128, 128);
    x.strokeStyle = "rgba(255,255,255,.85)";
    x.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      const a = i * 0.349 + (i % 3) * 0.1,
        r0 = 20 + (i % 4) * 6,
        r1 = 57,
        mid = (r0 + r1) / 2;
      x.beginPath();
      x.moveTo(64 + Math.cos(a) * r0, 64 + Math.sin(a) * r0);
      x.lineTo(64 + Math.cos(a + 0.08) * mid, 64 + Math.sin(a + 0.08) * mid);
      x.lineTo(64 + Math.cos(a) * r1, 64 + Math.sin(a) * r1);
      x.stroke();
    }
  });
  // orbiters per school: sprites that circle the caster while rising (falling for snow) and leave a trail of motes.
  // n = [count at weakest, count at strongest], r0 -> r1 radius over a lap, w = turn speed, up = climb per second.
  const ORB = {
    fire: {
      t: SP.fire,
      n: [3, 9],
      r0: 1.0,
      r1: 0.45,
      w: 3.2,
      up: 1.5,
      s: 0.55,
      tr: { t: SP.fire, l: 0.45, s: 0.3, g: -1.2 },
    },
    storm: {
      t: WGT,
      c: 0xd8f0ff,
      n: [4, 10],
      r0: 1.5,
      r1: 0.55,
      w: 6.5,
      up: 1.9,
      s: 0.35,
      tr: { c: 0x8fd0ff, l: 0.28, s: 0.22 },
    },
    spirit: {
      t: SP.spirit,
      n: [3, 8],
      r0: 1.25,
      r1: 1.0,
      w: 1.7,
      up: 0.75,
      s: 0.55,
      wob: 0.25,
      tr: { c: 0xb48cff, l: 0.7, s: 0.28, g: -0.4 },
    },
    heal: {
      t: LEAF,
      nb: 1,
      n: [3, 7],
      r0: 1.1,
      r1: 0.6,
      w: 1.4,
      up: 0.9,
      s: 0.32,
      tr: { c: 0x8dffa8, l: 0.5, s: 0.16, g: -0.3 },
    },
    ice: { t: FLK, c: 0xe8f6ff, n: [2, 6], r0: 1.3, r1: 1.3, w: 0.9, up: -0.6, s: 0.3 },
  };
  // ---- pooled pieces (built on first use, reused every cast) ----
  let root = null,
    rune,
    frost,
    glow,
    VN = [],
    ARC = [],
    cur = null;
  const V = new T.Vector3(),
    V2 = new T.Vector3(),
    CA = new T.Color(),
    CB = new T.Color();
  function build() {
    root = new T.Group();
    rune = new T.Mesh(PL1, bmat({ map: RUNE.heal, opacity: 0 }));
    rune.rotation.x = -Math.PI / 2;
    rune.position.y = 0.15;
    frost = new T.Mesh(PL1, bmat({ map: FROST, opacity: 0 }));
    frost.rotation.x = -Math.PI / 2;
    frost.position.y = 0.13;
    glow = new T.Sprite(smat(GLT, 0xffffff, { opacity: 0 }));
    root.add(rune, frost, glow);
    const vm = new T.MeshLambertMaterial({ color: 0x3f8a36, emissive: 0x0c2a0a, transparent: true });
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * 6.283 + (i % 2) * 0.3,
        r0 = 0.95 + 0.03 * ((i * 37) % 5),
        h = 1.3 + 0.25 * ((i * 53) % 4),
        turn = 1.6 + 0.3 * (i % 3),
        dir = i % 2 ? 1 : -1,
        pts = [];
      for (let j = 0; j <= 8; j++) {
        const t = j / 8,
          a = a0 + dir * turn * t,
          r = r0 * (1 - 0.45 * t);
        pts.push(new T.Vector3(Math.cos(a) * r, t * h, Math.sin(a) * r));
      }
      const e = pts[8],
        a = a0 + dir * (turn + 1.6); // a little curl at the tip
      pts.push(new T.Vector3(e.x * 0.8 + Math.cos(a) * 0.15, e.y + 0.12, e.z * 0.8 + Math.sin(a) * 0.15));
      pts.push(new T.Vector3(e.x * 0.7, e.y + 0.03, e.z * 0.7));
      const cv = new T.CatmullRomCurve3(pts),
        m = new T.Mesh(new T.TubeGeometry(cv, 28, 0.045, 5, false), vm);
      m.userData.cv = cv;
      m.visible = false;
      m.frustumCulled = false;
      root.add(m);
      VN.push(m);
    }
    for (let i = 0; i < 3; i++) {
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.BufferAttribute(new Float32Array(9 * 3), 3));
      const l = new T.Line(
        geo,
        new T.LineBasicMaterial({ color: 0xdff4ff, transparent: true, depthWrite: false, blending: BL }),
      );
      l.visible = false;
      l.frustumCulled = false;
      l.userData.t = 0;
      root.add(l);
      ARC.push(l);
    }
  }
  // v31: the caster can be any wizard model (your own W, a party member's model on the host's battlefield, or another
  // player's clone on a guest's screen). Its staff orb is found once (userData.orb) and cached; models without one
  // (bot townsfolk) charge from a point above their head.
  function lanOf(o) {
    if (o === W) return orb;
    if (o.__lan === undefined) {
      o.__lan = null;
      o.traverse((m) => {
        if (!o.__lan && m.userData && m.userData.orb) o.__lan = m;
      });
    }
    return o.__lan;
  }
  // the caster's feet in the frame the effects live in (FXP)
  function feet(h, out) {
    h.obj.getWorldPosition(out);
    if (FXP !== S) FXP.worldToLocal(out);
    out.y = 0;
    return out;
  }
  // where the staff's lantern is, in the frame the effects live in (FXP), relative to the caster
  function lanLocal(out) {
    const h = cur,
      o = h ? h.obj : W,
      ln = lanOf(o);
    if (ln) ln.getWorldPosition(out);
    else o.getWorldPosition(out).y += 2.3;
    if (FXP !== S) FXP.worldToLocal(out);
    return out.sub(root.position);
  }
  // opt: { obj (caster model, default W), el (school, default the card's), auto (drive the build-up from the clock, the
  // same curve as the timed-hit ring: for watching someone else charge), hold (called every frame, e.g. to keep their
  // staff raised), id (who is charging) }
  function start(c, opt) {
    kill();
    if (!root) build();
    opt = opt || {};
    const el = opt.el && EL[opt.el] ? opt.el : elOf(c),
      p = pow(c),
      q = qual(),
      o = ORB[el];
    const h = {
      el,
      p,
      q,
      k: 0,
      kk: 0,
      t: performance.now(),
      t0: performance.now(),
      rad: 1.0 + 0.7 * p,
      sc: 0.7 + 0.7 * p,
      acc: {},
      orbs: [],
      rel: 0,
      obj: opt.obj || W,
      auto: !!opt.auto,
      hold: opt.hold || null,
      id: opt.id || "",
    };
    cur = h; // lanLocal/feet read it
    feet(h, root.position);
    FXP.add(root);
    rune.material.map = RUNE[el] || RUNE.heal;
    rune.material.color.setHex(0xffffff);
    rune.material.opacity = 0;
    frost.visible = el === "ice";
    frost.material.opacity = 0;
    glow.material.color.setHex(COL[el]);
    glow.material.opacity = 0;
    const nv = el === "heal" ? Math.max(2, Math.round((3 + 5 * p) * (q < 1 ? 0.6 : 1))) : 0;
    VN.forEach((m, i) => {
      m.visible = i < nv;
      m.geometry.setDrawRange(0, 0);
      m.material.opacity = 1;
    });
    ARC.forEach((l) => (l.visible = false));
    const n = Math.max(1, Math.round((o.n[0] + (o.n[1] - o.n[0]) * p) * (q < 1 ? q + 0.2 : 1)));
    for (let i = 0; i < n; i++) {
      const m = new T.Sprite(smat(o.t, o.c == null ? 0xffffff : o.c, o.nb ? { blending: T.NormalBlending } : null));
      m.material.opacity = 0;
      root.add(m);
      h.orbs.push({ m, a: (i / n) * 6.283, f: i / n, ph: Math.random() * 6.283, acc: {} });
    }
    cur = h;
    requestAnimationFrame(() => tick(h));
    return h;
  }
  // emit about `rate` particles a second through fn (fractional carry-over per key)
  function emit(h, key, rate, dt, fn) {
    h.acc[key] = (h.acc[key] || 0) + rate * dt;
    while (h.acc[key] >= 1) {
      h.acc[key]--;
      fn();
    }
  }
  const rnd2 = () => Math.random() * 2 - 1;
  function ringPt(h, r, y) {
    const a = Math.random() * 6.283;
    return V2.set(root.position.x + Math.cos(a) * r, y, root.position.z + Math.sin(a) * r);
  }
  function tick(h) {
    if (h !== cur) return;
    if (mode !== "battle" && mode !== "guest") return kill();
    const now = performance.now(),
      dt = Math.min(0.05, (now - h.t) / 1000);
    h.t = now;
    const rk = h.rel ? Math.min(1, (now - h.rel) / RL) : 0;
    if (rk >= 1) return kill();
    if (!h.obj.parent) return kill(); // the caster left the battle
    if (h.auto && !h.rel) {
      // watching someone else: same build-up curve as qte (1 s gathering, then 2.9 s of ring)
      const t = now - h.t0 - 1000;
      h.k = t < 0 ? 0.15 * (1 + t / 1000) : 0.15 + 0.85 * Math.min(1, t / 2900);
      if (t > 6500) stop(h, 1); // no word on how it went: release it anyway
    }
    if (h.hold)
      try {
        h.hold();
      } catch (e) {}
    h.kk += (Math.min(1, h.k) - h.kk) * Math.min(1, dt * 6); // smoothed build-up
    const k = h.kk,
      p = h.p,
      el = h.el,
      fade = 1 - rk,
      I = (0.3 + 0.7 * k) * fade,
      D = (0.35 + 0.65 * p) * (0.25 + 0.75 * k) * h.q * (h.rel ? 0 : 1),
      o = ORB[el];
    feet(h, root.position);
    const L = lanLocal(V);
    // lantern glow: swells with the charge; fire runs from orange to white-hot
    const pulse = 1 + 0.12 * Math.sin(now * 0.012 * (1 + k));
    glow.position.copy(L);
    glow.scale.setScalar((0.5 + (0.8 + 1.8 * p) * k) * pulse * (1 + rk * 0.6));
    glow.material.opacity = Math.min(1, 0.35 + 0.65 * k) * fade;
    if (el === "fire") glow.material.color.copy(CA.setHex(0xff6a1a).lerp(CB.setHex(0xfff0c8), k));
    // rune circle under the caster spins up; frost spreads out in a ring for ice
    rune.rotation.z += dt * (0.6 + 2.5 * k);
    rune.scale.setScalar((1.6 + 1.6 * p) * (0.55 + 0.45 * k));
    rune.material.opacity = (0.15 + 0.6 * k) * fade;
    if (frost.visible) {
      frost.scale.setScalar(h.rad * 2 * (0.3 + 1.9 * k) * (0.8 + 0.5 * p));
      frost.material.opacity = 0.85 * Math.min(1, k * 3) * fade;
      frost.rotation.z += dt * 0.15;
    }
    // vines grow up and curl
    VN.forEach((m, i) => {
      if (!m.visible) return;
      const g2 = Math.max(0, Math.min(1, k * 1.15 - i * 0.04));
      m.geometry.setDrawRange(0, Math.floor(28 * g2) * 30);
      m.scale.setScalar(h.rad * (0.85 + 0.25 * p));
      m.material.opacity = fade;
      if (g2 > 0.05 && !h.rel)
        emit(h, "v" + i, 2.2 * h.q * (0.5 + p), dt, () => {
          m.userData.cv.getPoint(g2, V2).multiplyScalar(m.scale.x).add(root.position);
          mote(V2, {
            t: LEAF,
            nb: 1,
            s: 0.18 + 0.12 * p,
            v: [rnd2() * 0.3, 0.4, rnd2() * 0.3],
            l: 1.1,
            g: 0.3,
            sp: 2,
            gr: 0.3,
          });
        });
    });
    // orbiters
    h.orbs.forEach((b) => {
      b.a += o.w * dt * (0.7 + 0.6 * k) * (el === "storm" ? 1 + k : 1);
      b.f += (dt * Math.abs(o.up) * (0.7 + 0.5 * k)) / 2.6;
      if (b.f >= 1) {
        b.f -= 1;
        b.a = Math.random() * 6.283;
      }
      const f = b.f,
        y = o.up > 0 ? 0.15 + f * 2.6 : 3.3 - f * 3.1,
        r = (o.r0 + (o.r1 - o.r0) * f) * h.rad + (o.wob ? o.wob * Math.sin(now * 0.004 + b.ph) : 0);
      b.m.position.set(Math.cos(b.a) * r, y, Math.sin(b.a) * r);
      if (rk) b.m.position.lerp(L, rk);
      b.m.material.opacity = Math.sin(Math.PI * f) * I;
      b.m.scale.setScalar(o.s * h.sc * (0.7 + 0.5 * k));
      if (o.tr && !h.rel)
        emit(b, "tr", 14 * h.q * (0.4 + 0.6 * k), dt, () => {
          V2.copy(b.m.position).add(root.position);
          mote(V2, { t: o.tr.t, c: o.tr.c, s: o.tr.s * h.sc, l: o.tr.l, g: o.tr.g || 0, gr: -0.6 });
        });
    });
    // school extras
    if (el === "fire") {
      emit(h, "fl", 26 * D, dt, () => {
        const P2 = ringPt(h, h.rad * 0.9, 0.2);
        mote(P2, {
          t: SP.fire,
          s: 0.4 + 0.5 * p,
          v: [rnd2() * 0.4, 1.8 + 1.5 * k, rnd2() * 0.4],
          l: 0.5,
          g: -1,
          gr: -0.6,
        });
      });
      emit(h, "em", 20 * D, dt, () => {
        const P2 = ringPt(h, h.rad * Math.random(), 0.3);
        mote(P2, {
          c: 0xffb050,
          s: 0.12,
          v: [rnd2() * 0.8, 2 + 1.5 * Math.random(), rnd2() * 0.8],
          l: 1,
          g: -0.5,
          dr: 0.5,
        });
      });
    } else if (el === "ice") {
      emit(h, "sn", 40 * D, dt, () => {
        const P2 = ringPt(h, h.rad * 1.6 * Math.sqrt(Math.random()), 3.5 + Math.random());
        mote(P2, {
          t: FLK,
          c: 0xeaf6ff,
          s: 0.12 + 0.13 * Math.random(),
          v: [rnd2() * 0.3, -1.2, rnd2() * 0.3],
          l: 2.2,
          g: 0.2,
          sp: 1.5,
          gr: 0,
        });
      });
      emit(h, "fs", 14 * D, dt, () => {
        const P2 = ringPt(h, frost.scale.x * 0.45, 0.2);
        mote(P2, { c: 0xd8f2ff, s: 0.2, v: [0, 0.4, 0], l: 0.4, gr: 0.5 });
      });
    } else if (el === "storm") {
      emit(h, "sk", 25 * D, dt, () => {
        const P2 = ringPt(h, h.rad * 1.2, 0.2 + Math.random() * 1.8);
        mote(P2, { c: 0xe6f6ff, s: 0.18, v: [rnd2() * 4, rnd2() * 4, rnd2() * 4], l: 0.25, g: 3 });
      });
      const na = h.q < 0.5 ? 1 : h.q < 1 ? 2 : 3;
      ARC.forEach((l, i) => {
        l.userData.t -= dt;
        if (l.userData.t <= 0) l.visible = false;
        if (i >= na || h.rel || Math.random() > 8 * D * dt) return;
        // a forked crackle from the lantern down to a spot around the caster
        const a = Math.random() * 6.283,
          r = h.rad * (0.8 + 0.6 * Math.random()),
          ex = Math.cos(a) * r,
          ey = Math.random() * 0.8,
          ez = Math.sin(a) * r,
          ps = l.geometry.attributes.position;
        for (let j = 0; j < 9; j++) {
          const t = j / 8,
            jit = j && j < 8 ? 0.25 * (0.5 + p) : 0;
          ps.setXYZ(
            j,
            L.x + (ex - L.x) * t + rnd2() * jit,
            L.y + (ey - L.y) * t + rnd2() * jit,
            L.z + (ez - L.z) * t + rnd2() * jit,
          );
        }
        ps.needsUpdate = true;
        l.visible = true;
        l.userData.t = 0.07;
      });
      ARC.forEach((l) => (l.material.opacity = I));
    } else if (el === "heal") {
      emit(h, "lf", 12 * D, dt, () => {
        const P2 = ringPt(h, h.rad * 0.9, 0.1);
        mote(P2, { t: LEAF, nb: 1, s: 0.25, v: [rnd2() * 0.6, 1.2, rnd2() * 0.6], l: 1.4, g: -0.2, sp: 2, gr: 0.2 });
      });
      emit(h, "hs", 14 * D, dt, () => {
        const P2 = ringPt(h, h.rad * Math.random(), 0.2);
        mote(P2, { c: 0x8dffa8, s: 0.16, v: [0, 0.9 + Math.random(), 0], l: 1, g: -0.2 });
      });
    } else {
      emit(h, "ws", 16 * D, dt, () => {
        const P2 = ringPt(h, h.rad * Math.random(), 0.2);
        mote(P2, {
          c: 0xc8a8ff,
          s: 0.3,
          v: [rnd2() * 0.2, 0.8 + Math.random(), rnd2() * 0.2],
          l: 1.3,
          g: -0.3,
          fi: 0.3,
        });
      });
    }
    requestAnimationFrame(() => tick(h));
  }
  // release into the spell: a flare at the lantern (grade 2 brightest), or a puff of smoke on a missed timing
  function stop(h, gr) {
    if (!h || h !== cur || h.rel) return;
    h.rel = performance.now();
    const p = h.p,
      q = h.q,
      L = lanLocal(V).add(root.position).clone();
    if (gr) {
      puff(L, h.el, Math.max(3, Math.round((6 + 16 * p) * q)), 2.5 + 3 * p, 0.6, 0.5 + 0.6 * p);
      ring(root.position.x, COL[h.el], 1.5 + 3 * p, 380, root.position.z);
      mote(L, { c: COL[h.el], s: 1.5 + 2 * p, l: 0.3, gr: 0.8 });
      if (gr === 2) mote(L, { c: 0xffffff, s: 1 + 1.5 * p, l: 0.25, gr: 1 });
    } else {
      for (let i = 0; i < 4; i++)
        mote(L, {
          c: 0x777777,
          nb: 1,
          s: 0.45,
          o: 0.6,
          v: [rnd2() * 0.6, 0.8, rnd2() * 0.6],
          l: 0.7,
          g: -0.6,
          gr: 0.8,
        });
      puff(L, h.el, 3, 1.5, 0.4, 0.4);
    }
  }
  function kill() {
    cur = null;
    if (!root) return;
    if (root.parent) root.parent.remove(root);
    for (let i = root.children.length - 1; i >= 0; i--) {
      const m = root.children[i];
      if (m.isSprite && m !== glow) {
        root.remove(m);
        m.material.dispose();
      }
    }
    VN.forEach((m) => (m.visible = false));
    ARC.forEach((l) => (l.visible = false));
  }
  return { start, stop, kill, pow, cur: () => cur };
})();
