// DUSKWICK - 50-bossfinery.js (v36, loads LAST, after 49): fancier boss models. Only top-level name: FINERY.
// Wraps mkFoe (outermost) for the road bosses rb0..rb10 (33) and street-dungeon bosses dkb0..2 (34), and dresses the
// world copies already standing (foes with f.kind rb*/dkb*). Every model gets:
//   - bevelled, softly rounded edges on its boxy parts (glow strips and thin parts stay crisp), and
//   - hand-placed detail added to its existing part groups (u.bd body, u.hd head, u.arms, u.lg legs, u.heads,
//     u.tail), so it moves with the boss's own animation: fur manes and tufts, claws, eyelids and pupils, fins and
//     barbels, moss, rivets, pipes, gauges, armour trim, wings for the wyrm, a veil and rosary for the abbess...
// New glowing parts join u.gm, so they pulse with the boss. New lit materials get dtChar-style surface detail and the
// luster rim light. Geometry is cached by shape and shared; materials are per model. Nothing is added to the scene.
// Thinner on Low quality.
const FINERY = (() => {
  if (typeof mkFoe !== "function") return {};
  const LOW = typeof GFX !== "undefined" && GFX === "low",
    PI = Math.PI,
    TAU = PI * 2,
    UPY = new T.Vector3(0, 1, 0),
    GC = new Map(),
    geo = (k, fn) => GC.get(k) || (GC.set(k, fn()), GC.get(k)),
    sg = (r, w) =>
      geo("s" + r + "," + (w || 16), () => new T.SphereGeometry(r, w || 16, Math.max(8, Math.round((w || 16) * 0.7)))),
    hs = (r, w) => geo("h" + r + "," + w, () => new T.SphereGeometry(r, w || 16, 8, 0, TAU, 0, PI / 2)),
    cy = (a, b, h, n) => geo("y" + [a, b, h, n], () => new T.CylinderGeometry(a, b, h, n || 16)),
    cn = (r, h, n) => geo("c" + [r, h, n], () => new T.ConeGeometry(r, h, n || 12)),
    // a cone whose base sits at the origin (for tufts, claws, spikes aimed with aim())
    cb = (r, h, n) =>
      geo("b" + [r, h, n], () => {
        const g = new T.ConeGeometry(r, h, n || 10);
        g.translate(0, h / 2, 0);
        return g;
      }),
    to = (R, t, a, n) => geo("t" + [R, t, a, n], () => new T.TorusGeometry(R, t, 8, n || 28, a || TAU)),
    oc = (r) => geo("o" + r, () => new T.OctahedronGeometry(r, 0)),
    rk = (r) => geo("r" + r, () => (typeof GEOX !== "undefined" ? GEOX.rock(r) : new T.DodecahedronGeometry(r, 0))),
    bu = (r) => geo("u" + r, () => (typeof GEOX !== "undefined" ? GEOX.bush(r) : new T.IcosahedronGeometry(r, 1))),
    DK = { stone: "cstone", wood: "cwood", leaf: "cleaf" };
  // ---------- rounded / bevelled boxes ----------
  function rbox(w, h, d) {
    return geo("x" + [w, h, d], () => {
      const r = Math.min(0.12, Math.min(w, h, d) * 0.22),
        g = new T.BoxGeometry(w, h, d, 4, 4, 4),
        p = g.attributes.position,
        H = [w / 2, h / 2, d / 2],
        v = [0, 0, 0],
        c = [0, 0, 0];
      for (let i = 0; i < p.count; i++) {
        v[0] = p.getX(i);
        v[1] = p.getY(i);
        v[2] = p.getZ(i);
        for (let a = 0; a < 3; a++) {
          // the quarter grid lines move out to where the bevel starts
          if (Math.abs(Math.abs(v[a]) - H[a] / 2) < 1e-4) v[a] = Math.sign(v[a]) * (H[a] - r);
          c[a] = Math.max(-(H[a] - r), Math.min(H[a] - r, v[a]));
        }
        const dx = v[0] - c[0],
          dy = v[1] - c[1],
          dz = v[2] - c[2],
          l = Math.hypot(dx, dy, dz);
        if (l > 1e-6) p.setXYZ(i, c[0] + (dx / l) * r, c[1] + (dy / l) * r, c[2] + (dz / l) * r);
        else p.setXYZ(i, v[0], v[1], v[2]);
      }
      if (typeof GEOX !== "undefined") GEOX.sn(g);
      else g.computeVertexNormals();
      g.computeBoundingSphere();
      return g;
    });
  }
  function bevel(o) {
    const swap = new Map(),
      bb = new T.Box3(),
      sz = new T.Vector3();
    o.traverse((m) => {
      if (!m.isMesh || m.userData.fin || !m.geometry || m.geometry.type !== "BoxGeometry") return;
      const g = m.geometry,
        p = g.parameters;
      if (!p || Math.min(p.width, p.height, p.depth) < 0.14) return;
      const mt = m.material;
      if (mt && mt.emissive && mt.emissive.getHex() > 0x101010 && mt.emissiveIntensity >= 0.8) return; // glow strips
      if (!swap.has(g)) {
        g.computeBoundingBox();
        bb.copy(g.boundingBox).getSize(sz);
        const ok = Math.abs(sz.x - p.width) + Math.abs(sz.y - p.height) + Math.abs(sz.z - p.depth) < 0.003;
        swap.set(g, ok ? rbox(p.width, p.height, p.depth) : null);
      }
      const n = swap.get(g);
      if (n) m.geometry = n;
    });
  }
  // ---------- part helpers (U = the model being dressed, MT = its material cache) ----------
  let U = null,
    MT = null;
  function mat(col, o) {
    const k = [col, o.g, o.gi, o.op, o.ds, o.nb].join("|");
    if (MT.has(k)) return MT.get(k);
    let m;
    if (o.nb) {
      m = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: o.op || 0.7, depthWrite: false });
      if (o.add) m.blending = T.AdditiveBlending;
    } else {
      m = new T.MeshToonMaterial({ color: col, gradientMap: GR });
      if (o.g != null) {
        m.emissive.setHex(o.g);
        m.emissiveIntensity = o.gi || 1;
        if (U.gm) U.gm.push(m);
      }
      if (o.op) {
        m.transparent = true;
        m.opacity = o.op;
        m.depthWrite = false;
      }
      if (o.g == null && !o.op && typeof DTX !== "undefined" && DTX.hide && typeof dtKind === "function") {
        const d = dtKind(col);
        if (d) {
          m.userData.dtx = DK[d] || "hide";
          m.userData.dto = 1;
        }
      }
    }
    if (o.ds) m.side = T.DoubleSide;
    MT.set(k, m);
    return m;
  }
  function P(par, g, col, x, y, z, o) {
    o = o || {};
    const m = new T.Mesh(g, mat(col, o));
    m.position.set(x || 0, y || 0, z || 0);
    if (o.r) m.rotation.set(o.r[0] || 0, o.r[1] || 0, o.r[2] || 0);
    if (o.s != null) typeof o.s === "number" ? m.scale.setScalar(o.s) : m.scale.set(o.s[0], o.s[1], o.s[2]);
    m.userData.fin = 1;
    if (o.nb) m.userData.nol = 1;
    par.add(m);
    return m;
  }
  const aim = (m, x, y, z) => (m.quaternion.setFromUnitVectors(UPY, new T.Vector3(x, y, z).normalize()), m);
  // a tuft / claw / spike whose base sits at (x,y,z), pointing along (dx,dy,dz)
  const T1 = (par, x, y, z, dx, dy, dz, len, r, col, o) =>
    aim(P(par, cb(r, len, (o && o.n) || 10), col, x, y, z, o), dx, dy, dz);
  const glow = (par, col, s, x, y, z) => {
    if (LOW || typeof GLT === "undefined") return null;
    const sp = new T.Sprite(AM(GLT));
    sp.material.color.setHex(col);
    sp.scale.setScalar(s);
    sp.position.set(x || 0, y || 0, z || 0);
    sp.userData.fin = 1;
    par.add(sp);
    return sp;
  };
  const grp = (par, x, y, z) => {
    const q = new T.Group();
    q.position.set(x || 0, y || 0, z || 0);
    q.userData.fin = 1;
    par.add(q);
    return q;
  };
  const N = (hi, lo) => (LOW ? lo : hi); // fewer repeats on Low
  // a ring of n items around (cx, y, cz) at radius r: fn(x, z, angle, k)
  const ring = (n, cx, y, cz, r, fn, a0) => {
    for (let k = 0; k < n; k++) {
      const a = (a0 || 0) + (k / n) * TAU;
      fn(cx + Math.cos(a) * r, cz + Math.sin(a) * r, a, k);
    }
  };
  const pupils = (hd, xs, y, z, r, col) =>
    xs.forEach((x) => P(hd, sg(r, 10), col || 0x0a0608, x, y, z, { s: [0.5, 1.4, 0.5] }));
  const brows = (hd, xs, y, z, r, col, tilt) =>
    xs.forEach((x) => P(hd, sg(r, 12), col, x, y, z, { s: [1.4, 0.42, 0.7], r: [0, 0, Math.sign(x) * (tilt || 0.3)] }));
  const claws = (par, y, z, col, sp, len) =>
    [-1, 0, 1].forEach((k) =>
      T1(par, k * (sp || 0.09), y, z, k * 0.15, -0.2, 1, len || 0.2, 0.045, col || 0xe8e0d0, { n: 8 }),
    );
  const studs = (par, n, y, r, col, s) => ring(n, 0, y, 0, r, (x, z) => P(par, sg(s || 0.045, 8), col, x, y, z));

  // ================= road bosses (33) =================
  const RBD = [
    // 0 Rimefang Twin-Maw: frost manes, sculpted muzzles, spiked collars, claws, shoulder crystals
    (u) => {
      const fur = 0xdfe8f4,
        fur2 = 0xf4f8ff,
        ice = 0xbfe8ff,
        bd = u.bd;
      (u.heads || []).forEach((h) => {
        P(h, sg(0.25), fur2, 0, -0.1, 0.5, { s: [0.8, 0.62, 1.35] });
        P(h, sg(0.06, 12), 0x101018, 0, 0.0, 0.79, { s: [1.3, 0.8, 0.9] });
        brows(h, [-0.15, 0.15], 0.21, 0.29, 0.1, fur, 0.35);
        pupils(h, [-0.15, 0.15], 0.12, 0.39, 0.03);
        [-1, 1].forEach((s) => {
          P(h, cn(0.07, 0.24), 0xd8a0b0, s * 0.2, 0.38, 0.02, { s: [1, 1, 0.45] });
          T1(h, s * 0.33, -0.08, 0.1, s, -0.3, -0.6, 0.36, 0.1, fur2);
          T1(h, s * 0.36, 0.1, -0.05, s, 0.2, -0.8, 0.3, 0.09, fur);
        });
        // spiked iron collar round the neck
        P(h, to(0.36, 0.06), 0x3a3a48, 0, -0.08, -0.32);
        ring(
          N(8, 5),
          0,
          0,
          0,
          0.4,
          (x, y2, a) =>
            T1(h, x, -0.08 + Math.sin(a) * 0.4 - 0, -0.32, Math.cos(a), Math.sin(a), 0, 0.16, 0.04, 0x8a8e98),
          0,
        );
      });
      // a frost mane round the shoulders and a fringe of belly fur
      ring(N(14, 8), 0, 0, 0, 1, (x, z, a, k) => {
        const dy = Math.cos(a),
          dx = Math.sin(a);
        T1(bd, dx * 0.62, 0.1 + dy * 0.55, 0.85, dx, dy, -0.7, 0.55, 0.15, k % 2 ? fur2 : fur);
      });
      for (let i = 0; i < N(7, 4); i++)
        T1(bd, i % 2 ? 0.25 : -0.25, -0.55, -0.9 + i * 0.3, 0, -1, -0.3, 0.36, 0.1, fur2);
      [-1, 1].forEach((s) => {
        [0, 1, 2].forEach((k) =>
          aim(
            P(bd, oc(0.12 + k * 0.03), ice, s * (0.5 + k * 0.1), 0.6 + k * 0.08, 0.5 - k * 0.15, {
              g: 0x3a8ad8,
              gi: 0.8,
              s: [0.6, 1.8, 0.6],
            }),
            s * 0.5,
            1,
            0,
          ),
        );
      });
      u.arms.concat(u.lg).forEach((l) => claws(l, -1.36, 0.22, 0xe8e0d0, 0.08, 0.18));
    },
    // 1 The Lake Lurker: frilled head crest, barbels, icicle fangs, side fins, scales, water ripples
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        fin = 0x9fe0ff,
        sc2 = 0x2a5a78,
        SEG = [
          [0, 0.3, 0, 0.62],
          [0, 1.0, -0.22, 0.56],
          [0, 1.7, -0.12, 0.5],
          [0, 2.3, 0.15, 0.45],
          [0, 2.8, 0.45, 0.4],
        ];
      SEG.forEach(([, y, z, r], k) => {
        [-1, 1].forEach((s) => {
          for (let j = 0; j < N(3, 1); j++)
            P(bd, sg(r * 0.24, 12), sc2, s * r * 0.82, y - 0.15 + j * 0.15, z + r * 0.3, { s: [0.45, 0.8, 1] });
        });
        if (k === 1 || k === 3)
          [-1, 1].forEach((s) =>
            aim(
              P(bd, cn(0.32, 0.9, 14), fin, s * (r + 0.25), y, z, {
                g: 0x2a6aa8,
                gi: 0.4,
                op: 0.75,
                ds: 1,
                s: [1, 1, 0.14],
              }),
              s,
              0.3,
              -0.4,
            ),
          );
      });
      ring(N(5, 3), 0, 0, 0, 1, (x, z, a, k) => {
        const t = -0.9 + k * 0.45;
        aim(
          P(hd, cn(0.16, 0.7, 12), fin, Math.sin(t) * 0.2, 0.2, -0.45, {
            g: 0x2a6aa8,
            gi: 0.45,
            op: 0.8,
            ds: 1,
            s: [1, 1, 0.12],
          }),
          Math.sin(t),
          1,
          -0.7,
        );
      });
      brows(hd, [-0.3, 0.3], 0.22, 0.3, 0.12, 0x3a6a8a, 0.4);
      pupils(hd, [-0.3, 0.3], 0.12, 0.38, 0.035);
      [-1, 1].forEach((s) => {
        aim(P(hd, cy(0.025, 0.008, 1.0, 6), 0x5a8aa8, s * 0.36, -0.55, 0.55), s * 0.5, -1, 0.15);
        aim(P(hd, cy(0.02, 0.006, 0.7, 6), 0x5a8aa8, s * 0.3, -0.42, 0.25), s * 0.7, -1, -0.2);
      });
      for (let i = 0; i < N(6, 3); i++)
        T1(hd, -0.3 + i * 0.12, -0.24, 0.3 - (i % 2) * 0.15, 0, -1, 0, 0.2 + (i % 3) * 0.08, 0.035, 0xdff4ff, { n: 8 });
      // ripples on the water round the hole
      [1.55, 2.0].forEach((R, k) =>
        P(u.root, to(R, 0.035, TAU, 40), 0xbfe4ff, 0, 0.07, 0, { nb: 1, op: 0.35 - k * 0.12, r: [PI / 2, 0, 0] }),
      );
    },
    // 2 Runebound Sentinel: boulder pauldrons with moss, cracks, crystal cluster, knuckle spikes, a rune ring below
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        rn = 0x6fd3ff;
      [-1, 1].forEach((s) => {
        P(bd, rk(0.42), 0x8a94a8, s * 0.85, 1.38, 0, { s: [1.15, 0.8, 1], r: [0, s, 0] });
        P(bd, bu(0.26), 0x4a7a3a, s * 0.85, 1.66, 0.02, { s: [1.25, 0.4, 1.2] });
        P(bd, bu(0.12), 0x5a8a44, s * 0.4, -0.6, 0.38, { s: [1.3, 0.5, 0.5] });
      });
      P(hd, bu(0.18), 0x4a7a3a, 0.22, 0.4, -0.05, { s: [1.3, 0.45, 1.1] });
      [
        [0.25, 0.95, 0.4],
        [-0.38, -0.3, -0.5],
        [0.42, 0.1, 0.9],
      ].forEach(([x, y, r]) => P(bd, rbox(0.035, 0.5, 0.02), 0x2a2e38, x, y, 0.405, { r: [0, 0, r] }));
      [
        [-0.2, 0.55, 0.12],
        [0.22, 0.78, 0.1],
        [0.05, 0.4, 0.09],
      ].forEach(([x, y, r]) =>
        P(bd, oc(r), 0x9fe8ff, x, y, 0.47, { g: 0x2a8ad8, gi: 1.3, s: [0.7, 1.6, 0.7], r: [0, 0, x * 2] }),
      );
      const halo = grp(hd, 0, 0.05, -0.5);
      P(halo, to(0.62, 0.03), rn, 0, 0, 0, { g: 0x2a8ad8, gi: 1.2 });
      ring(N(8, 4), 0, 0, 0, 0.62, (x, z) => P(halo, rbox(0.06, 0.12, 0.03), rn, x, z, 0, { g: 0x2a8ad8, gi: 1.4 }));
      u.arms.forEach((a) =>
        [-0.18, 0, 0.18].forEach((x) => T1(a, x, -0.75, 0.42, 0, 0, 1, 0.2, 0.06, 0x6a7890, { n: 8 })),
      );
      const rg = grp(u.root, 0, 0.12, 0);
      P(rg, to(1.15, 0.035, TAU, 40), rn, 0, 0, 0, { g: 0x2a8ad8, gi: 1.1, r: [PI / 2, 0, 0] });
      ring(N(6, 3), 0, 0, 0, 1.15, (x, z) => P(rg, rbox(0.14, 0.05, 0.08), rn, x, 0, z, { g: 0x2a8ad8, gi: 1.3 }));
      u.spin.push([rg, -0.6]);
    },
    // 3 Grumm the Trapper: shaggy shoulder and head tufts, fur cuffs and boots, backpack, belt trap and chain
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        fur = 0xe8eef4,
        fur2 = 0xcfd8e4;
      [-1, 1].forEach((s) =>
        ring(N(6, 3), 0, 0, 0, 1, (x, z, a, k) =>
          T1(
            bd,
            s * (0.78 + Math.cos(a) * 0.15),
            1.72 + Math.sin(a) * 0.1,
            Math.sin(a) * 0.25,
            s * 0.6,
            1,
            Math.sin(a) * 0.3,
            0.45,
            0.14,
            k % 2 ? fur : fur2,
          ),
        ),
      );
      [-0.15, 0, 0.15].forEach((x, k) => T1(hd, x, 0.4, -0.05, x * 2, 1, -0.4, 0.38 + (k % 2) * 0.1, 0.12, fur));
      for (let i = 0; i < N(5, 3); i++) T1(hd, -0.2 + i * 0.1, -0.3, 0.42, (i - 2) * 0.2, -1, 0.2, 0.3, 0.07, fur2);
      brows(hd, [-0.13, 0.13], 0.13, 0.46, 0.08, fur2, 0.4);
      pupils(hd, [-0.13, 0.13], 0.04, 0.54, 0.025);
      [-1, 1].forEach((s) => P(hd, to(0.09, 0.03), 0xc8a040, s * 0.35, 0.28, 0, { r: [0, 0, -s * 0.8 + PI / 2] }));
      u.arms.forEach((a) => P(a, to(0.3, 0.1), fur, 0, -1.25, 0, { r: [PI / 2, 0, 0] }));
      u.lg.forEach((l) => P(l, to(0.32, 0.11), fur, 0, -0.78, 0, { r: [PI / 2, 0, 0] }));
      // the sack on his back and its straps
      P(bd, sg(0.55, 18), 0x8a6a3a, 0, 1.3, -0.85, { s: [1, 1.1, 0.75] });
      P(bd, to(0.18, 0.05), 0x5a3a1a, 0, 1.85, -0.85, { r: [PI / 2, 0, 0] });
      [-1, 1].forEach((s) => P(bd, rbox(0.1, 1.0, 0.05), 0x5a3a1a, s * 0.4, 1.4, 0.78, { r: [-0.25, 0, 0] }));
      // a little jaw trap and a chain hanging from the belt
      const tr = grp(bd, 0.6, 0.35, 0.8);
      [-1, 1].forEach((s) => P(tr, to(0.17, 0.035, PI, 14), 0x8a8e98, 0, 0, 0, { r: [s * 0.25, 0, 0] }));
      for (let k = 0; k < 3; k++)
        P(bd, to(0.05, 0.015, TAU, 12), 0x6a6e78, 0.6, 0.48 + k * 0.07, 0.8, { r: [0, k % 2 ? PI / 2 : 0, 0] });
    },
    // 4 Magmaw: heavy eyelids, slit pupils, warts, a glowing throat sac, webbed toes, lava drips, vent rims
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        cr = 0x2a1e1e,
        lv = 0xff5a12;
      [-1, 1].forEach((s) => {
        P(hd, hs(0.25, 18), cr, s * 0.45, 0.44, 0.05, { r: [-0.35, 0, 0] });
        P(hd, rbox(0.04, 0.22, 0.03), 0x100808, s * 0.45, 0.4, 0.27);
        P(bd, to(0.17, 0.05), 0x1a1414, s * 0.4, 1.03, -0.45, { r: [PI / 2, 0, 0] });
      });
      for (let k = 0; k < N(16, 8); k++) {
        const a = k * 2.399,
          e = -0.2 + ((k * 0.37) % 1) * 1.2,
          x = Math.cos(a) * Math.cos(e) * 1.43,
          y = Math.sin(e) * 0.93,
          z = Math.sin(a) * Math.cos(e) * 1.27,
          hot = k % 4 === 0;
        P(bd, sg(0.06 + (k % 3) * 0.03, 10), hot ? 0xffa02a : 0x3a2a2a, x, y, z, hot ? { g: lv, gi: 1.2 } : undefined);
      }
      P(bd, sg(0.5, 20), 0xff6a1a, 0, -0.32, 1.12, { g: 0xff4a0a, gi: 0.7, s: [1.25, 0.7, 0.75] });
      for (let k = 0; k < N(4, 2); k++)
        P(bd, sg(0.07, 10), 0xffa02a, -0.45 + k * 0.3, -0.82, 0.2 + (k % 2) * 0.3, {
          g: lv,
          gi: 1.5,
          s: [0.7, 1.6, 0.7],
        });
      u.lg.concat(u.arms).forEach((l, n) => {
        const y = n < u.lg.length ? -0.58 : -0.75,
          z = n < u.lg.length ? 0.7 : 0.3;
        [-1, 0, 1].forEach((k) => {
          T1(l, k * 0.14, y, z, k * 0.5, -0.1, 1, 0.3, 0.07, cr);
          P(l, sg(0.04, 8), 0xffa02a, k * 0.14 + k * 0.15 * 0.3, y - 0.03, z + 0.29, { g: lv, gi: 1.3 });
        });
      });
    },
    // 5 The Obsidian Gatekeeper: layered pauldrons with ember trim, gorget, belt and buckle, crest, knee guards,
    // a tattered cape hem and a glowing shield emblem
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        ob = 0x1e1620,
        fl = 0xff6a1a;
      [-1, 1].forEach((s) => {
        P(bd, sg(0.42, 18), ob, s * 0.78, 1.1, 0, { s: [1.05, 0.42, 1.1] });
        P(bd, sg(0.36, 18), 0x2a2030, s * 0.86, 0.96, 0, { s: [1, 0.38, 1.05] });
        P(bd, to(0.41, 0.025), fl, s * 0.78, 1.05, 0, { g: 0xff4a0a, gi: 1, r: [PI / 2, 0, 0] });
      });
      P(bd, cy(0.34, 0.42, 0.2, 20), ob, 0, 1.33, 0);
      P(bd, rbox(1.16, 0.16, 0.68), 0x2a2030, 0, 0.05, 0);
      P(bd, rbox(0.2, 0.18, 0.05), 0xc8a040, 0, 0.05, 0.35);
      P(bd, oc(0.12), 0xff3a2a, 0, 0.98, 0.33, { g: 0xd8200a, gi: 1.6, s: [1, 1.5, 0.5] });
      for (let i = 0; i < N(6, 3); i++)
        T1(bd, -0.5 + i * 0.2, -0.8, -0.42, 0, -1, -0.15, 0.3 + (i % 2) * 0.15, 0.1, 0x3a0a0a, { n: 6 });
      P(hd, rbox(0.07, 0.16, 0.62), 0x2a2030, 0, 0.36, 0);
      [-1, 1].forEach((s) => P(hd, rbox(0.06, 0.34, 0.3), 0x2a2030, s * 0.28, -0.12, 0.12));
      u.lg.forEach((l) => {
        P(l, sg(0.17, 14), ob, 0, -0.65, 0.12, { s: [1, 0.8, 0.7] });
        T1(l, 0, -0.6, 0.22, 0, 0.2, 1, 0.16, 0.05, 0x2a2030, { n: 6 });
      });
      const sh = u.arms[0];
      if (sh) {
        P(sh, to(0.3, 0.04), fl, -0.27, -0.9, 0.3, { g: 0xff4a0a, gi: 1.2, r: [0, PI / 2, 0] });
        P(sh, oc(0.12), 0xff3a2a, -0.28, -0.9, 0.3, { g: 0xd8200a, gi: 1.6 });
        ring(N(8, 4), 0, 0, 0, 1, (x, z, a) =>
          P(sh, sg(0.04, 8), 0x8a7a6a, -0.27, -0.9 + Math.sin(a) * 0.72, 0.3 + Math.cos(a) * 0.42),
        );
      }
    },
    // 6 The Anvil Colossus: rivet rows, back pipes, a pressure gauge, chimney rims, a hammer with glowing runes
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        bz = 0x8a5a2a,
        ir = 0x3a3440;
      [0.3, 1.3].forEach((y) => studs(bd, N(18, 9), y, 0.95, 0x6a5040, 0.045));
      [-1, 1].forEach((s) => {
        P(bd, to(0.32, 0.065, PI, 20), bz, s * 0.42, 1.38, -0.82, { r: [0, PI / 2, 0] });
        P(bd, to(0.17, 0.045), ir, s * 0.42, 2.46, -0.5, { r: [PI / 2, 0, 0] });
        P(bd, cy(0.08, 0.08, 0.5, 12), bz, s * 0.42, 0.95, -0.98);
      });
      const gg = grp(bd, -0.5, 1.12, 0.74);
      gg.rotation.y = -0.5;
      P(gg, cy(0.16, 0.16, 0.06, 24), 0x6a5040, 0, 0, 0, { r: [PI / 2, 0, 0] });
      P(gg, cy(0.13, 0.13, 0.02, 24), 0xeae0c8, 0, 0, 0.035, { r: [PI / 2, 0, 0] });
      P(gg, rbox(0.02, 0.11, 0.01), 0xff3a2a, 0.02, 0.03, 0.05, { g: 0xd8200a, gi: 1.2, r: [0, 0, -0.6] });
      P(hd, to(0.07, 0.02), 0xffb040, 0, -0.18, 0.2, { g: 0xff8a20, gi: 1 });
      const hm = u.arms[1];
      if (hm) {
        [-1, 1].forEach((s) => P(hm, rbox(0.02, 0.3, 0.32), 0xffa02a, s * 0.44, -1.62, 0, { g: 0xff5a0a, gi: 1.3 }));
        ring(N(6, 3), 0, 0, 0, 1, (x, z, a, k) => P(hm, sg(0.04, 8), ir, -0.36 + k * 0.144, -1.46, 0.23));
      }
      u.lg.forEach((l) => P(l, hs(0.3, 16), ir, 0, -1.0, 0.42, { s: [1, 0.7, 0.6], r: [PI / 2, 0, 0] }));
    },
    // 7 Granny Hollowroot: shawl, patched robe, hem, rope belt with pouches and herbs, hat buckle, a bubbling cauldron
    (u) => {
      const bd = u.bd,
        hd = u.hd;
      P(bd, to(0.5, 0.13), 0x5a4a6a, 0, 1.48, 0, { r: [PI / 2, 0, 0], s: [1, 1.05, 1] });
      T1(bd, 0, 1.4, -0.45, 0, -1, -0.25, 0.6, 0.28, 0x5a4a6a, { n: 4 });
      [
        [0.33, 0.62, 0.43, 0.6, 0x6a4a3a],
        [-0.3, 0.3, 0.55, -0.5, 0x3a5a4a],
        [0.1, 0.0, 0.68, 0.1, 0x7a5a2a],
      ].forEach(([x, y, z, ry, c]) => P(bd, rbox(0.24, 0.22, 0.03), c, x, y, z, { r: [-0.4, ry, 0] }));
      P(bd, to(0.84, 0.06, TAU, 36), 0x3a2a4a, 0, -0.08, 0, { r: [PI / 2, 0, 0] });
      P(bd, to(0.36, 0.035), 0x7a5a3a, 0, 1.1, 0, { r: [PI / 2, 0, 0] });
      [-1, 1].forEach((s) => P(bd, sg(0.11, 12), 0x6a4a2a, s * 0.32, 0.98, 0.15, { s: [1, 1.2, 0.8] }));
      for (let k = 0; k < N(3, 2); k++)
        T1(bd, -0.12 + k * 0.12, 1.06, 0.33, (k - 1) * 0.3, -1, 0.2, 0.25, 0.06, 0x4a8a3a, { n: 6 });
      P(hd, rbox(0.12, 0.1, 0.04), 0xc8a040, 0, 0.32, 0.34);
      P(hd, sg(0.06, 10), 0x6a3a8a, -0.06, 1.25, -0.13); // a bobble on the hat's tip
      pupils(hd, [-0.11, 0.11], 0.07, 0.31, 0.02);
      const ca = grp(u.root, 1.35, 0, 0.45);
      P(ca, sg(0.45, 20), 0x2a2a30, 0, 0.45, 0, { s: [1, 0.85, 1] });
      P(ca, to(0.38, 0.05), 0x3a3a44, 0, 0.78, 0, { r: [PI / 2, 0, 0] });
      P(ca, cy(0.35, 0.35, 0.03, 24), 0x7dff5a, 0, 0.76, 0, { g: 0x4aff2a, gi: 1.3 });
      [0, 1, 2].forEach((k) =>
        P(ca, sg(0.07 - k * 0.015, 10), 0x9aff6a, Math.cos(k * 2.1) * 0.18, 0.8 + k * 0.05, Math.sin(k * 2.1) * 0.18, {
          g: 0x5aff3a,
          gi: 1.5,
        }),
      );
      ring(3, 0, 0, 0, 0.3, (x, z) => P(ca, cy(0.04, 0.03, 0.2, 8), 0x2a2a30, x, 0.06, z));
      glow(ca, 0x9aff6a, 1.6, 0, 0.9, 0);
    },
    // 8 The Drowned Bellringer: hood rim, tattered hem, barnacles, a starfish, arm chains, a banded bell
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        rb = 0x1e3634;
      P(hd, to(0.3, 0.05), 0x2a4a48, 0, -0.02, 0.24);
      ring(N(11, 6), 0, 0, 0, 0.68, (x, z, a, k) =>
        T1(bd, x, -0.6, z, x * 0.2, -1, z * 0.2, 0.3 + (k % 3) * 0.15, 0.1, rb, { n: 6 }),
      );
      for (let k = 0; k < N(12, 6); k++) {
        const a = k * 2.2,
          y = -0.3 + ((k * 0.43) % 1) * 1.0,
          r = (0.72 * (1.4 - y)) / 2; // the robe cone's radius at that height
        T1(bd, Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(a), 0.4, Math.sin(a), 0.08, 0.05, 0xc8c0a8, { n: 8 });
      }
      const st = grp(bd, 0.32, 1.1, 0.25);
      st.rotation.set(-0.6, 0.4, 0);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU;
        T1(st, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0.14, 0.04, 0xe08a5a, { n: 6 });
      }
      u.arms.forEach((a) => {
        for (let k = 0; k < 3; k++)
          P(a, to(0.06, 0.018, TAU, 12), 0x5a5a62, 0, -0.5 - k * 0.1, 0.12, { r: [0, k % 2 ? PI / 2 : 0, 0] });
      });
      const br = u.arms[1];
      if (br) {
        P(br, to(0.33, 0.03), 0xc8a040, 0, -1.55, 0.2, { r: [PI / 2, 0, 0] });
        P(br, to(0.43, 0.025), 0xc8a040, 0, -1.9, 0.2, { r: [PI / 2, 0, 0] });
      }
      [0, 1, 2].forEach((k) => glow(bd, 0x5fe0c0, 1.2, Math.cos(k * 2.1) * 0.6, -0.7, Math.sin(k * 2.1) * 0.6));
    },
    // 9 Old Mossback: moss clumps, ferns and mushrooms on the shell, hanging vines, shrine lanterns and prayer
    // flags, foot claws, a hooked beak and brows
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        at = (a, e) => [1.6 * Math.cos(e) * Math.cos(a), 0.3 + 0.88 * Math.sin(e), 1.84 * Math.cos(e) * Math.sin(a)];
      for (let k = 0; k < N(7, 4); k++) {
        const [x, y, z] = at(k * 0.9 + 0.3, 0.5 + (k % 2) * 0.25);
        P(bd, bu(0.28 + (k % 3) * 0.06), k % 2 ? 0x4a7a3a : 0x5a8a44, x, y, z, { s: [1, 0.45, 1] });
      }
      for (let k = 0; k < N(5, 3); k++) {
        const a = k * 1.25 + 0.8,
          [x, y, z] = at(a, 0.3);
        [-1, 0, 1].forEach((j) =>
          T1(bd, x, y, z, Math.cos(a) + j * 0.4, 1.2, Math.sin(a) - j * 0.4, 0.45, 0.08, 0x3a8a3a, {
            n: 4,
            s: [1, 1, 0.3],
          }),
        );
      }
      [
        [2.0, 0.6, 0xd94a6a, 0],
        [3.6, 0.45, 0x7dffe0, 1],
        [5.0, 0.7, 0xd94a6a, 0],
      ].forEach(([a, e, c, gl]) => {
        const [x, y, z] = at(a, e);
        P(bd, cy(0.04, 0.05, 0.2, 8), 0xeae0d0, x, y + 0.1, z);
        P(bd, hs(0.13, 14), c, x, y + 0.2, z, gl ? { g: 0x2aa88a, gi: 1.3 } : undefined);
      });
      for (let k = 0; k < N(10, 5); k++) {
        const x = -1.25 + (k % 5) * 0.62,
          z = k < 5 ? 1.5 : -1.5;
        P(bd, cy(0.02, 0.015, 0.45 + (k % 3) * 0.15, 5), 0x3a6a2a, x, -0.45 - (k % 3) * 0.07, z);
      }
      [
        [0.52, 0.52],
        [-0.52, -0.52],
      ].forEach(([x, z]) => {
        P(bd, cy(0.01, 0.01, 0.3, 4), 0x2a2a20, x, 2.0, z);
        P(bd, rbox(0.12, 0.16, 0.12), 0xffd98a, x, 1.78, z, { g: 0xd99a2a, gi: 1.4 });
        glow(bd, 0xffd27a, 0.9, x, 1.78, z);
      });
      [0xd94a4a, 0xe8c04a, 0x4a8ad9, 0x4ad98a, 0xeae0d0].forEach((c, k) =>
        P(bd, rbox(0.12, 0.16, 0.012), c, -0.36 + k * 0.18, 1.95 - Math.sin((k / 4) * PI) * 0.06, 0.42, { ds: 1 }),
      );
      P(bd, cy(0.006, 0.006, 0.8, 4), 0x2a2a20, 0, 2.03, 0.42, { r: [0, 0, PI / 2] });
      u.arms.concat(u.lg).forEach((l) => claws(l, -0.82, 0.33, 0x2a2a20, 0.12, 0.2));
      brows(hd, [-0.26, 0.26], 0.27, 0.6, 0.1, 0x4f6a34, 0.3);
      T1(hd, 0, -0.02, 0.82, 0, -1, 0.5, 0.2, 0.08, 0x3a4a2a, { n: 8 });
    },
    // 10 The Lantern Mother: capelet, hood peak and glowing trim, a crown of candles, little lanterns on the hem,
    // trailing ribbons
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        cl = 0x221c30;
      P(bd, cn(0.78, 0.75, 18), cl, 0, 0.72, 0);
      T1(hd, 0, 0.3, -0.12, 0, 1, -0.9, 0.5, 0.16, cl, { n: 10 });
      P(hd, to(0.32, 0.025), 0xffd27a, 0, -0.02, 0.27, { g: 0xffaa30, gi: 0.7 });
      ring(N(5, 3), 0, 0, 0, 0.26, (x, z) => {
        P(hd, cy(0.035, 0.035, 0.16, 10), 0xeae0c8, x, 0.44, z * 0.8 - 0.05);
        P(hd, cn(0.03, 0.09, 8), 0xffd27a, x, 0.57, z * 0.8 - 0.05, { nb: 1, op: 0.9, add: 1 });
        glow(hd, 0xffd27a, 0.45, x, 0.58, z * 0.8 - 0.05);
      });
      ring(N(6, 3), 0, 0, 0, 0.78, (x, z) => {
        P(bd, cy(0.008, 0.008, 0.35, 4), 0x2a2438, x, -1.12, z);
        P(bd, rbox(0.1, 0.14, 0.1), 0xffd98a, x, -1.35, z, { g: 0xd99a2a, gi: 1.4 });
        glow(bd, 0xffd27a, 0.7, x, -1.35, z);
      });
      [-1, 1].forEach((s) =>
        P(bd, rbox(0.14, 1.6, 0.02), 0x3a2a5a, s * 0.3, -0.5, -0.82, { op: 0.8, r: [0.35, s * 0.2, s * 0.1] }),
      );
    },
  ];

  // ================= street-dungeon bosses (34) =================
  // a wing for the wyrm: finger bones from the shoulder and a translucent membrane between them
  function wing(par, s) {
    const w = grp(par, s * 0.75, 0.55, 0.2),
      tips = [
        [2.3, 1.1, -0.3],
        [2.5, 0.25, -1.0],
        [1.7, -0.35, -1.6],
        [0.25, -0.25, -1.25],
      ];
    w.scale.x = s;
    w.rotation.z = 0.3 * s;
    const pos = [];
    for (let i = 0; i < tips.length - 1; i++) pos.push(0, 0, 0, ...tips[i], ...tips[i + 1]);
    const g = geo("wing", () => {
      const b = new T.BufferGeometry();
      b.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      b.computeVertexNormals();
      return b;
    });
    P(w, g, 0xbfe8ff, 0, 0, 0, { g: 0x2a6aa8, gi: 0.35, op: 0.6, ds: 1 });
    tips.slice(0, 3).forEach(([x, y, z], k) => {
      const L = Math.hypot(x, y, z),
        m = P(w, cy(0.05 - k * 0.01, 0.03, L, 8), 0xd8e8f8, x / 2, y / 2, z / 2);
      aim(m, x, y, z);
      if (!k) T1(w, x, y, z, x, y + 0.5, z, 0.3, 0.06, 0x9fe0ff, { n: 8 });
    });
    return w;
  }
  const DKD = [
    // 0 Skarn the Hoarfrost Wyrm: wings, a crown of horns, neck frills, icicle beard, scale rows, tail crystals
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        ic = 0x9fe0ff;
      // not set as u.wings: this rig's animation doesn't reset them each frame, so 24's flap poses would drift them
      wing(bd, -1);
      wing(bd, 1);
      [-1, 1].forEach((s) => {
        T1(hd, s * 0.18, 0.3, -0.45, s * 0.3, 0.5, -1, 0.55, 0.07, ic, { g: 0x3a8ad8, gi: 0.6, n: 12 });
        T1(hd, s * 0.4, 0.05, -0.2, s, 0.1, -0.6, 0.35, 0.05, ic, { g: 0x3a8ad8, gi: 0.6, n: 10 });
      });
      brows(hd, [-0.22, 0.22], 0.22, 0.38, 0.11, 0xc8dcef, 0.4);
      pupils(hd, [-0.22, 0.22], 0.12, 0.48, 0.03, 0x0a2a3a);
      for (let i = 0; i < N(5, 3); i++)
        T1(hd, -0.16 + i * 0.08, -0.32, 0.5 + (i % 2) * 0.12, 0, -1, 0.1, 0.22 + (i % 3) * 0.08, 0.035, 0xdff4ff, {
          n: 8,
        });
      for (let i = 0; i < N(5, 3); i++) {
        const k = i / 4;
        T1(bd, 0, 0.95 + k * 0.5, 1.25 + k * 0.6, 0, 1, -0.6, 0.35 - k * 0.1, 0.08, ic, {
          g: 0x3a8ad8,
          gi: 0.7,
          n: 6,
          s: [0.4, 1, 1],
        });
      }
      [-1, 1].forEach((s) => {
        for (let i = 0; i < N(7, 4); i++)
          P(bd, sg(0.16, 12), 0xb8cce0, s * 0.82, 0.18 - (i % 2) * 0.12, -1.3 + i * 0.42, { s: [0.35, 0.75, 1.15] });
      });
      if (u.tail)
        [-0.45, -0.95, -1.45].forEach((z, k) =>
          T1(u.tail, 0, 0.3 - k * 0.08, z, 0, 1, -0.4, 0.3 - k * 0.05, 0.07, ic, { g: 0x3a8ad8, gi: 0.8, n: 6 }),
        );
    },
    // 1 Hargrim the Last Forgemaster: braided beard rings, leather apron with a tool, rivet rows, shoulder plates
    // with runes, chimney rims, a runed hammer
    (u) => {
      const bd = u.bd,
        hd = u.hd,
        dk = 0x2a2428;
      [-1, 1].forEach((s) => {
        for (let k = 0; k < 4; k++)
          P(hd, sg(0.07 - k * 0.008, 12), 0x8a5a2a, s * 0.22, -0.3 - k * 0.14, 0.36 + k * 0.03);
        P(hd, to(0.055, 0.02), 0xc8a040, s * 0.22, -0.86, 0.47, { r: [PI / 2, 0, 0] });
        P(bd, sg(0.48, 18), dk, s * 1.02, 1.55, 0, { s: [1.05, 0.4, 1.1] });
        P(bd, rbox(0.3, 0.04, 0.03), 0xff7a2a, s * 1.02, 1.6, 0.42, { g: 0xff4a0a, gi: 1.3 });
        P(bd, to(0.17, 0.045), 0x3a3034, s * 0.45, 2.35, -0.6, { r: [PI / 2, 0, 0] });
      });
      P(bd, rbox(0.8, 0.75, 0.05), 0x5a3a24, 0, -0.32, 1.02, { r: [0.06, 0, 0] });
      P(bd, rbox(0.3, 0.22, 0.03), 0x4a2e1a, 0.18, -0.4, 1.06);
      P(bd, rbox(0.05, 0.36, 0.03), 0x8a8e98, -0.22, -0.35, 1.07, { r: [0, 0, 0.3] });
      [0.2, 1.35].forEach((y) => studs(bd, N(16, 8), y, 0.92, 0x6a5a4a, 0.045));
      const hm = u.arms[1];
      if (hm)
        [-1, 1].forEach((s) => P(hm, rbox(0.02, 0.34, 0.5), 0xffa02a, s * 0.29, -1.05, 1.7, { g: 0xff5a0a, gi: 1.4 }));
    },
    // 2 The Drowned Abbess: a long veil, rosary with a glowing pendant, lace collar, drowned lilies, sleeve cuffs,
    // candles floating round her
    (u) => {
      const bd = u.bd,
        hd = u.hd;
      P(
        hd,
        geo("veil", () => new T.ConeGeometry(0.62, 1.6, 24, 1, true)),
        0xb8d8c8,
        0,
        -0.45,
        -0.12,
        { op: 0.35, ds: 1 },
      );
      for (let k = 0; k <= N(12, 6); k++) {
        const t = -1.3 + (k / N(12, 6)) * 2.6;
        P(bd, sg(0.035, 8), 0xc8c0a8, Math.sin(t) * 0.33, 1.08 - (1 - Math.cos(t)) * 0.4, 0.42 + Math.cos(t) * 0.04);
      }
      P(bd, oc(0.07), 0x9affd0, 0, 0.5, 0.47, { g: 0x5affb0, gi: 1.6, s: [1, 1.5, 0.6] });
      P(bd, to(0.36, 0.05), 0xd8d0b8, 0, 1.12, 0.02, { r: [PI / 2, 0, 0] });
      ring(N(12, 6), 0, 1.06, 0.02, 0.4, (x, z) => P(bd, sg(0.05, 8), 0xd8d0b8, x, 1.06, z));
      [
        [0.42, -0.3, 0.6],
        [-0.45, 0.0, 0.52],
        [0.1, -0.85, 0.82],
      ].forEach(([x, y, z]) => {
        const fl = grp(bd, x, y, z);
        fl.rotation.x = -0.4;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * TAU;
          P(fl, sg(0.06, 10), 0xf0e0e8, Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0, {
            s: [1, 0.55, 0.25],
            r: [0, 0, a],
          });
        }
        P(fl, sg(0.03, 8), 0xe8c04a, 0, 0, 0.02);
      });
      u.arms.forEach((a) => P(a, to(0.2, 0.04), 0x8aa880, 0, -0.88, 0.03, { r: [PI / 2, 0, 0] }));
      const cg = grp(u.root, 0, 1.0, 0);
      ring(3, 0, 0, 0, 1.35, (x, z, a, k) => {
        P(cg, cy(0.04, 0.04, 0.2, 10), 0xeae0c8, x, k * 0.25, z);
        P(cg, cn(0.03, 0.1, 8), 0x9affd0, x, 0.15 + k * 0.25, z, { nb: 1, op: 0.9, add: 1 });
        glow(cg, 0x6affc0, 0.6, x, 0.16 + k * 0.25, z);
      });
      u.spin.push([cg, 0.6]);
    },
  ];

  // ---------- dressing ----------
  function dress(o, kind) {
    if (!o || !o.userData || o.userData.fin) return o;
    const m = /^(rb|dkb)(\d+)$/.exec(kind || ""),
      fn = m && (m[1] === "rb" ? RBD : DKD)[+m[2]];
    if (!fn || !o.userData.bd) return o;
    o.userData.fin = 1;
    U = o.userData;
    U.root = o;
    MT = new Map();
    if (!Array.isArray(U.arms)) U.arms = [];
    if (!Array.isArray(U.lg)) U.lg = [];
    if (!Array.isArray(U.spin)) U.spin = [];
    // the luster rim light the model already has (to give the new parts the same)
    let rim = null;
    o.traverse((q) => {
      if (!rim && q.isMesh && q.material && q.material.userData && q.material.userData.rim != null)
        rim = q.material.userData;
    });
    try {
      bevel(o);
      fn(U);
    } catch (e) {
      console.warn("finery", kind, e);
    }
    delete U.root; // userData is JSON-copied on clone; don't keep a self-reference
    if (rim && typeof LUSTER !== "undefined" && LUSTER.rimTag) LUSTER.rimTag(o, rim.rim, rim.rimK, rim.rimP);
    U = MT = null;
    return o;
  }
  const mk0 = mkFoe;
  mkFoe = function (kind) {
    const o = mk0.apply(this, arguments);
    try {
      dress(o, kind);
    } catch (e) {}
    return o;
  };
  // the road and dungeon bosses standing in the world were built before this file loaded
  try {
    foes.forEach((f) => f && f.o && /^(rb|dkb)\d+$/.test(f.kind || "") && dress(f.o, f.kind));
  } catch (e) {}
  return { dress, rbox, RBD, DKD };
})();
