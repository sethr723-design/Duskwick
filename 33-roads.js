// DUSKWICK - 33-roads.js (v26): the zone streets come alive.
//  1) Road bosses: every zone street (ZSTR) has its own mini boss standing in its dead-end plaza, each with a model,
//     moveset, weaknesses and voice of its own (kinds "rb0".."rb10"; battle spec on the world foe as f.bsp, f.rbi = street).
//  2) Swamp foes for Mirewick: Bog Gloomling (bogl), Mire Skeleton (skel), Bog Monster (bogm), Will-o'-Wisp (mwisp).
//     Mirewick's old wolves/hounds/gloomlings are re-skinned into them at load (same foe objects, so indices are kept).
//  3) A road-warden NPC near the end of every street (kind "r", id = street index), and three new ★ quests
//     ("Roads of ...": reach the end of every street of a zone) that the next story step now requires.
//     Progress is P.rdv (street -> 1), bosses beaten P.rdb (street -> count).
//  4) Scenery after the editor's BASE snapshot: rolling hills along every street, a side clearing on each street's widest
//     bend (t.pk, walkable via zsWalk in 03), burned houses on the Cinderwaste streets, willows / ponds / fireflies in
//     Mirewick and its streets, drifting embers in the Cinderwaste. Held in per-place groups shown only when near.
//  5) Five monster-summon cards, one per school (cwisp, cbogl, cskel, cbogm, cdrown): the monster appears, charges the
//     foe and strikes. Bought from Wren / picked at a level up from Lv 5; your first road boss win also teaches yours.
// Foes are appended to `foes` in a fixed order (multiplayer matches foes by index). Only top-level name: RDX.
const RDX = {};
(() => {
  const S2 = Math.sin,
    PI = Math.PI;
  // ---------- model helpers (same conventions as 27-newfoes.js) ----------
  const grp = (par, x, y, z) => {
    const q = new T.Group();
    q.position.set(x || 0, y || 0, z || 0);
    par.add(q);
    return q;
  };
  function part(u, par, geo, c, x, y, z, glow, gi) {
    const m = mk(geo, c, x, y, z, glow ? 1 : 0);
    if (glow) {
      m.material.emissive.setHex(glow);
      m.material.emissiveIntensity = gi || 1;
      u.gm.push(m.material);
    }
    par.add(m);
    return m;
  }
  const rot = (m, x, y, z) => {
    m.rotation.set(x || 0, y || 0, z || 0);
    return m;
  };
  const gsp = (par, c, s, x, y, z) => {
    const sp = new T.Sprite(AM(GLT));
    sp.material.color.setHex(c);
    sp.scale.setScalar(s);
    sp.position.set(x || 0, y || 0, z || 0);
    par.add(sp);
    return sp;
  };
  const flame = (c, op) =>
    new T.MeshBasicMaterial({
      color: c,
      transparent: true,
      opacity: op || 0.6,
      blending: T.AdditiveBlending,
      depthWrite: false,
    });
  function base(o, opt) {
    const u = o.userData;
    Object.assign(
      u,
      { gl: 1, rbm: 1, gm: [], arms: [], lg: [], spin: [], ph: Math.random() * 6, y0: 1, fl: 0, h: 2.5 },
      opt,
    );
    return u;
  }
  // ================= swamp foes =================
  function mBogl() {
    const o = new T.Group(),
      u = base(o, { y0: 0.55, h: 1.7 }),
      sk = 0x2f4a2a;
    [-1, 1].forEach((sd) => {
      const l = grp(o, sd * 0.25, 0.4, 0);
      part(u, l, Cy(0.09, 0.12, 0.38, 6), 0x23331d, 0, -0.19, 0);
      part(u, l, B(0.24, 0.08, 0.32), 0x23331d, 0, -0.38, 0.06);
      u.lg.push(l);
    });
    const bd = (u.bd = grp(o, 0, u.y0, 0));
    part(u, bd, Sp(0.5, 12), sk, 0, 0, 0).scale.set(1, 0.85, 1);
    part(u, bd, Sp(0.36, 10), 0x6a8a4a, 0, -0.08, 0.22).scale.set(1, 0.9, 0.7);
    [
      [-0.3, 0.2, -0.3],
      [0.25, 0.3, -0.35],
      [0.05, 0.4, -0.2],
    ].forEach(([x, y, z]) => part(u, bd, Sp(0.1, 6), 0x1c2c18, x, y, z));
    const hd = (u.hd = grp(bd, 0, 0.36, 0.15));
    part(u, hd, Sp(0.38, 12), 0x34522e, 0, 0, 0).scale.set(1.25, 0.8, 1);
    part(u, hd, B(0.52, 0.06, 0.05), 0x0a0a08, 0, -0.1, 0.33);
    [-0.15, -0.05, 0.05, 0.15].forEach((x) => rot(part(u, hd, Cn(0.025, 0.08, 4), 0xe8e0c8, x, -0.13, 0.34), PI));
    [-1, 1].forEach((sd) => part(u, hd, Sp(0.09, 8), 0xd8ff5a, sd * 0.17, 0.12, 0.28, 0xb8ff3a, 1.4));
    const an = grp(hd, 0, 0.28, 0);
    rot(part(u, an, Cy(0.02, 0.025, 0.6, 4), 0x23331d, 0, 0.28, 0.1), 0.45);
    part(u, an, Sp(0.1, 8), 0x9affd0, 0, 0.55, 0.32, 0x5affb0, 1.6);
    gsp(an, 0x7affc0, 1.2, 0, 0.55, 0.32);
    [-1, 1].forEach((sd) => {
      const a = grp(bd, sd * 0.45, 0.1, 0.05);
      part(u, a, Cy(0.06, 0.08, 0.5, 6), sk, 0, -0.25, 0);
      part(u, a, Sp(0.09, 6), 0x23331d, 0, -0.52, 0);
      u.arms.push(a);
    });
    return o;
  }
  function mSkel() {
    const o = new T.Group(),
      u = base(o, { y0: 1.0, h: 2.5 }),
      bn = 0xd8d0b8,
      ms = 0x4a6a34;
    [-1, 1].forEach((sd) => {
      const l = grp(o, sd * 0.18, 1.0, 0);
      part(u, l, Cy(0.05, 0.05, 0.92, 5), bn, 0, -0.46, 0);
      part(u, l, Sp(0.07, 6), bn, 0, -0.48, 0);
      part(u, l, B(0.14, 0.06, 0.26), bn, 0, -0.95, 0.06);
      u.lg.push(l);
    });
    const bd = (u.bd = grp(o, 0, u.y0, 0));
    part(u, bd, B(0.42, 0.14, 0.2), bn, 0, 0.02, 0);
    part(u, bd, B(0.5, 0.36, 0.06), 0x2a3a22, 0, -0.12, 0.08);
    part(u, bd, Cy(0.05, 0.05, 0.72, 5), bn, 0, 0.42, -0.05);
    for (let i = 0; i < 4; i++) part(u, bd, B(0.5 - i * 0.05, 0.05, 0.3), bn, 0, 0.42 + i * 0.12, 0.02);
    part(u, bd, Sp(0.16, 6), ms, 0.15, 0.62, 0.12).scale.set(1, 0.45, 0.8);
    part(u, bd, Sp(0.12, 6), ms, -0.18, 0.5, 0.1).scale.set(1, 0.5, 0.8);
    const hd = (u.hd = grp(bd, 0, 0.96, 0));
    part(u, hd, Sp(0.22, 10), bn, 0, 0.05, 0).scale.set(1, 1.1, 1.05);
    part(u, hd, B(0.24, 0.08, 0.2), bn, 0, -0.14, 0.06);
    [-1, 1].forEach((sd) => part(u, hd, Sp(0.055, 6), 0x5affd8, sd * 0.08, 0.06, 0.19, 0x2affc0, 1.6));
    part(u, hd, Sp(0.2, 8), ms, 0, 0.18, -0.02).scale.set(1.1, 0.4, 1.1);
    [-1, 1].forEach((sd, n) => {
      const a = grp(bd, sd * 0.32, 0.8, 0);
      part(u, a, Cy(0.04, 0.04, 0.45, 5), bn, 0, -0.22, 0);
      part(u, a, Cy(0.035, 0.035, 0.45, 5), bn, 0, -0.62, 0.04);
      part(u, a, Sp(0.06, 6), bn, 0, -0.88, 0.06);
      if (n) {
        const sw = grp(a, 0, -0.88, 0.08);
        rot(part(u, sw, B(0.08, 0.95, 0.025), 0x7a5a3a, 0, 0, 0.5), PI / 2);
        rot(part(u, sw, B(0.3, 0.05, 0.06), 0x4a3a2a, 0, 0, 0.05), PI / 2);
      }
      u.arms.push(a);
    });
    return o;
  }
  function mBogm() {
    const o = new T.Group(),
      u = base(o, { y0: 0.9, h: 3.1 }),
      mud = 0x3a3424,
      mo = 0x3d4a2c;
    [-1, 1].forEach((sd) => {
      const l = grp(o, sd * 0.5, 0.9, 0);
      part(u, l, Cy(0.26, 0.32, 0.9, 7), mud, 0, -0.45, 0);
      u.lg.push(l);
    });
    const bd = (u.bd = grp(o, 0, u.y0, 0));
    part(u, bd, Sp(1.0, 14), mo, 0, 0.6, 0).scale.set(1.15, 1, 1);
    part(u, bd, Sp(0.95, 12), 0x4f6a34, 0, 0.95, -0.05).scale.set(1.1, 0.7, 1);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283;
      part(u, bd, Cy(0.03, 0.05, 0.9 + (i % 3) * 0.3, 4), 0x2a3a1c, Math.cos(a) * 0.95, 0.1, Math.sin(a) * 0.85);
    }
    for (let i = 0; i < 6; i++)
      rot(
        part(u, bd, Cy(0.025, 0.035, 0.9 + (i % 2) * 0.4, 4), 0x8a9a4a, -0.4 + i * 0.16, 1.75, -0.2 + (i % 3) * 0.1),
        i % 2 ? 0.25 : -0.2,
        0,
        -0.3 + i * 0.12,
      );
    part(u, bd, Cy(0.04, 0.06, 0.25, 6), 0xe8e0d0, 0.75, 1.35, 0.3);
    part(u, bd, Sp(0.2, 8), 0xc8442f, 0.75, 1.5, 0.3).scale.set(1, 0.5, 1);
    const hd = (u.hd = grp(bd, 0, 1.15, 0.6));
    [-1, 1].forEach((sd) => part(u, hd, Sp(0.12, 8), 0xffd84a, sd * 0.26, 0, 0.3, 0xffb020, 1.4));
    part(u, hd, B(0.8, 0.12, 0.15), 0x1c2414, 0, 0.16, 0.3);
    part(u, hd, B(0.6, 0.12, 0.08), 0x0a0c06, 0, -0.38, 0.38);
    [-1, 1].forEach((sd) => {
      const a = grp(bd, sd * 1.05, 1.0, 0);
      part(u, a, Cy(0.18, 0.24, 1.4, 7), mo, 0, -0.7, 0);
      part(u, a, Sp(0.3, 8), 0x2a3a1c, 0, -1.45, 0.05);
      [-1, 0, 1].forEach((k) => rot(part(u, a, Cn(0.05, 0.22, 4), 0x1c1408, k * 0.12, -1.7, 0.15), 2.6));
      u.arms.push(a);
    });
    return o;
  }
  function mWisp() {
    const o = new T.Group(),
      u = base(o, { y0: 1.4, fl: 0.25, h: 2.3 });
    const bd = (u.bd = grp(o, 0, u.y0, 0));
    part(u, bd, Sp(0.32, 12), 0xd8ff8a, 0, 0, 0, 0xbaff6a, 1.6);
    const fm = new T.Mesh(Cn(0.42, 1.2, 10), flame(0x9aff5a, 0.55));
    fm.position.y = 0.3;
    bd.add(fm);
    gsp(bd, 0xbaff6a, 3.4, 0, 0.1, 0);
    part(u, bd, B(0.36, 0.04, 0.36), 0x2a2438, 0, -0.45, 0);
    [-1, 1].forEach((sd) => part(u, bd, Cy(0.015, 0.015, 0.5, 3), 0x2a2438, sd * 0.17, -0.22, 0));
    const hd = (u.hd = grp(bd, 0, 0.05, 0.12));
    [-1, 1].forEach((sd) => part(u, hd, Sp(0.06, 6), 0x0a0a10, sd * 0.11, 0.05, 0.22));
    part(u, hd, B(0.12, 0.03, 0.02), 0x0a0a10, 0, -0.08, 0.27);
    [-1, 1].forEach((sd) => {
      const a = grp(bd, sd * 0.3, 0, 0);
      const t = new T.Mesh(Cn(0.1, 0.6, 6), flame(0x9aff5a, 0.5));
      t.position.set(sd * 0.2, -0.25, 0);
      t.rotation.z = sd * 2.4;
      a.add(t);
      u.arms.push(a);
    });
    const sp = grp(o, 0, u.y0, 0);
    [0, 1, 2].forEach((k) =>
      part(
        u,
        sp,
        Sp(0.07, 6),
        0xeaffb0,
        Math.cos(k * 2.1) * 0.8,
        k * 0.15 - 0.2,
        Math.sin(k * 2.1) * 0.8,
        0xbaff6a,
        1.5,
      ),
    );
    u.spin.push([sp, 1.6]);
    return o;
  }
  // ================= road bosses =================
  const M0 = [
    function twinMaw() {
      const o = new T.Group(),
        u = base(o, { y0: 1.4, h: 3.1 }),
        fur = 0xdfe8f4;
      [
        [-0.5, 0.75, 1],
        [0.5, 0.75, 1],
        [-0.5, -0.75, 0],
        [0.5, -0.75, 0],
      ].forEach(([x, z, fr]) => {
        const l = grp(o, x, 1.4, z);
        part(u, l, Cy(0.17, 0.12, 1.3, 7), fur, 0, -0.65, 0);
        part(u, l, Sp(0.19, 8), 0xc8d4e4, 0, -1.3, 0.06);
        (fr ? u.arms : u.lg).push(l);
      });
      const bd = (u.bd = grp(o, 0, u.y0, 0));
      part(u, bd, Sp(0.8, 14), fur, 0, 0, 0).scale.set(1, 0.85, 1.7);
      part(u, bd, Sp(0.7, 12), 0xf4f8ff, 0, 0.1, 0.9).scale.set(1.25, 1, 0.8);
      for (let i = 0; i < 7; i++)
        rot(
          part(
            u,
            bd,
            Cn(0.14, 0.6 + (i % 3) * 0.2, 5),
            0xbfe8ff,
            i % 2 ? 0.15 : -0.15,
            0.68,
            0.9 - i * 0.3,
            0x3a8ad8,
            0.7,
          ),
          -0.6,
        );
      const tl = (u.tail = grp(bd, 0, 0.2, -1.3));
      rot(part(u, tl, Cn(0.24, 1.5, 7), fur, 0, 0.2, -0.6), -PI / 2 + 0.4);
      rot(part(u, tl, Cn(0.12, 0.5, 5), 0xbfe8ff, 0, 0.47, -1.25, 0x3a8ad8, 0.7), -PI / 2 + 0.4);
      u.heads = [-1, 1].map((sd) => {
        const h = grp(bd, sd * 0.42, 0.5, 1.3);
        h.rotation.y = sd * 0.35;
        part(u, h, Sp(0.42, 12), fur, 0, 0, 0).scale.set(1, 0.9, 1.15);
        part(u, h, B(0.36, 0.28, 0.6), 0xc8d4e4, 0, -0.08, 0.45);
        part(u, h, Sp(0.07, 6), 0x101018, 0, 0.02, 0.76);
        [-1, 1].forEach((e) => {
          part(u, h, Cn(0.12, 0.36, 5), fur, e * 0.2, 0.4, -0.02);
          part(u, h, Sp(0.07, 6), 0xff3a2a, e * 0.15, 0.12, 0.33, 0xff2a1a, 1.6);
          rot(part(u, h, Cn(0.04, 0.2, 4), 0xffffff, e * 0.1, -0.27, 0.66), PI);
        });
        part(u, h, B(0.3, 0.08, 0.46), 0xb0bccc, 0, -0.26, 0.42);
        return h;
      });
      u.hd = u.heads[0];
      return o;
    },
    function lakeLurker() {
      const o = new T.Group(),
        u = base(o, { y0: 0, h: 4 }),
        sc = 0x3a6a8a;
      part(u, o, Cy(1.25, 1.25, 0.05, 20), 0x10202e, 0, 0.03, 0);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * 6.283;
        part(
          u,
          o,
          new T.DodecahedronGeometry(0.42 + (i % 3) * 0.08),
          0xdff4ff,
          Math.cos(a) * 1.35,
          0.15,
          Math.sin(a) * 1.35,
        );
      }
      const bd = (u.bd = grp(o, 0, 0, 0));
      [
        [0, 0.3, 0, 0.62],
        [0, 1.0, -0.22, 0.56],
        [0, 1.7, -0.12, 0.5],
        [0, 2.3, 0.15, 0.45],
        [0, 2.8, 0.45, 0.4],
      ].forEach(([x, y, z, r], k) => {
        part(u, bd, Sp(r, 12), sc, x, y, z);
        part(u, bd, Sp(r * 0.8, 10), 0xbfd8e0, x, y - 0.05, z + r * 0.35).scale.set(0.9, 0.9, 0.6);
        rot(part(u, bd, Cn(0.12, 0.5, 4), 0x9fe0ff, 0, y + 0.1, z - r, 0x2a6aa8, 0.6), -0.9);
      });
      const hd = (u.hd = grp(bd, 0, 3.15, 0.75));
      part(u, hd, B(0.72, 0.45, 0.95), sc, 0, 0, 0);
      const jw = grp(hd, 0, -0.26, 0.1);
      part(u, jw, B(0.62, 0.12, 0.82), 0x2a4a62, 0, 0, 0.05);
      for (let i = 0; i < 5; i++) {
        rot(part(u, hd, Cn(0.04, 0.16, 4), 0xffffff, -0.25 + i * 0.125, -0.28, 0.4), PI);
        part(u, jw, Cn(0.035, 0.14, 4), 0xffffff, -0.22 + i * 0.11, 0.1, 0.4);
      }
      [-1, 1].forEach((sd) => {
        part(u, hd, Sp(0.09, 8), 0x8ad0ff, sd * 0.3, 0.12, 0.3, 0x3aa8ff, 1.6);
        rot(part(u, hd, Cn(0.18, 0.6, 5), 0x9fe0ff, sd * 0.45, 0.05, -0.25, 0x2a6aa8, 0.5), 0, 0, (-sd * PI) / 2);
        rot(part(u, hd, Cn(0.06, 0.4, 5), 0xdff4ff, sd * 0.18, 0.35, -0.1), -0.5);
      });
      [-1, 1].forEach((sd) => {
        const a = grp(bd, sd * 0.55, 2.0, 0);
        rot(part(u, a, B(0.9, 0.05, 0.5), 0x9fe0ff, sd * 0.4, -0.2, 0, 0x2a6aa8, 0.4), 0, 0, sd * 0.5);
        u.arms.push(a);
      });
      return o;
    },
    function sentinel() {
      const o = new T.Group(),
        u = base(o, { y0: 1.5, fl: 0.2, h: 4 }),
        st = 0x7a8498,
        rn = 0x6fd3ff;
      const bd = (u.bd = grp(o, 0, u.y0, 0));
      part(u, bd, B(1.3, 2.2, 0.8), st, 0, 0.4, 0);
      [-1, 1].forEach((sd) => part(u, bd, B(0.12, 1.6, 0.02), rn, sd * 0.38, 0.4, 0.41, 0x2a8ad8, 1.2));
      part(u, bd, B(0.6, 0.08, 0.02), rn, 0, -0.2, 0.41, 0x2a8ad8, 1.2);
      part(u, bd, new T.OctahedronGeometry(0.34), 0x9fe8ff, 0, 0.65, 0.45, 0x2a8ad8, 1.4);
      part(u, bd, B(1.42, 0.2, 0.9), 0xf2f6ff, 0, 1.56, 0);
      gsp(bd, 0x8ad0ff, 2.6, 0, 0.65, 0.5);
      const hd = (u.hd = grp(bd, 0, 1.95, 0));
      part(u, hd, B(0.9, 0.5, 0.62), 0x8a94a8, 0, 0, 0);
      part(u, hd, B(0.42, 0.1, 0.05), rn, 0, 0.02, 0.32, 0x2a8ad8, 1.6);
      part(u, hd, B(0.95, 0.12, 0.66), 0xf2f6ff, 0, 0.3, 0);
      [-1, 1].forEach((sd) => {
        const a = grp(bd, sd * 1.25, 0.9, 0);
        part(u, a, Sp(0.18, 6), 0x6a7890, 0, -0.1, 0);
        part(u, a, B(0.62, 0.72, 0.62), 0x6a7890, 0, -0.65, 0.1);
        part(u, a, B(0.64, 0.08, 0.05), rn, 0, -0.55, 0.42, 0x2a8ad8, 1.2);
        u.arms.push(a);
      });
      const sp = grp(o, 0, 1.6, 0);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * 6.283;
        part(u, sp, B(0.25, 0.42, 0.1), 0x8a94a8, Math.cos(a) * 1.9, (k % 2) * 0.4, Math.sin(a) * 1.9);
        part(u, sp, B(0.08, 0.26, 0.11), rn, Math.cos(a) * 1.9, (k % 2) * 0.4, Math.sin(a) * 1.9, 0x2a8ad8, 1.3);
      }
      u.spin.push([sp, 0.7]);
      return o;
    },
    function grumm() {
      const o = new T.Group(),
        u = base(o, { y0: 1.0, h: 3.4 }),
        fur = 0xe8eef4,
        skin = 0x8a9aaa;
      [-1, 1].forEach((sd) => {
        const l = grp(o, sd * 0.45, 1.0, 0);
        part(u, l, Cy(0.3, 0.26, 1.0, 8), fur, 0, -0.5, 0);
        part(u, l, B(0.5, 0.2, 0.75), skin, 0, -0.95, 0.12);
        u.lg.push(l);
      });
      const bd = (u.bd = grp(o, 0, u.y0, 0));
      part(u, bd, Sp(1.0, 14), fur, 0, 1.0, 0).scale.set(1, 1.15, 0.85);
      part(u, bd, Sp(0.75, 12), 0xcfd8e4, 0, 0.85, 0.35).scale.set(1, 1.1, 0.6);
      part(u, bd, Cy(0.62, 0.72, 0.28, 12), 0xb0302a, 0, 1.95, 0);
      rot(part(u, bd, B(0.26, 0.75, 0.06), 0xb0302a, 0.32, 1.55, 0.62), 0.1, 0, 0.15);
      part(u, bd, Cy(0.92, 0.95, 0.16, 14), 0x5a3a1a, 0, 0.55, 0);
      part(u, bd, B(0.22, 0.2, 0.06), 0xc8a040, 0, 0.55, 0.92);
      const hd = (u.hd = grp(bd, 0, 2.3, 0.12));
      part(u, hd, Sp(0.5, 12), fur, 0, 0, 0).scale.set(1, 0.95, 0.95);
      part(u, hd, B(0.56, 0.42, 0.12), skin, 0, -0.06, 0.42);
      [-1, 1].forEach((sd) => {
        part(u, hd, Sp(0.06, 6), 0x8ad0ff, sd * 0.13, 0.04, 0.49, 0x3aa8ff, 1.5);
        rot(part(u, hd, Cn(0.06, 0.32, 5), 0xffffff, sd * 0.18, -0.12, 0.5), 0, 0, sd * 0.2);
        rot(part(u, hd, Cn(0.1, 0.55, 6), 0xcfc8b0, sd * 0.42, 0.35, 0), 0, 0, -sd * 0.8);
      });
      part(u, hd, B(0.3, 0.06, 0.04), 0x2a2a3a, 0, -0.18, 0.49);
      [-1, 1].forEach((sd, n) => {
        const a = grp(bd, sd * 1.0, 1.75, 0);
        part(u, a, Cy(0.28, 0.24, 1.4, 8), fur, 0, -0.7, 0);
        part(u, a, Sp(0.3, 8), skin, 0, -1.45, 0.05);
        if (n) {
          const c = grp(a, 0, -1.45, 0.15);
          rot(part(u, c, B(0.18, 1.9, 0.12), 0x7a5a3a, 0, 0, 0.8), PI / 2);
          rot(part(u, c, B(0.22, 0.12, 0.2), 0x5a5a6a, 0, 0, 1.5), PI / 2);
          rot(part(u, c, Cy(0.1, 0.1, 0.3, 6), 0x7a5a3a, 0, 0.1, 1.7), PI / 2);
        }
        u.arms.push(a);
      });
      return o;
    },
    function magmaw() {
      const o = new T.Group(),
        u = base(o, { y0: 0.95, h: 2.7 }),
        cr = 0x2a1e1e,
        lv = 0xff5a12;
      [-1, 1].forEach((sd) => {
        const l = grp(o, sd * 0.85, 0.65, -0.5);
        part(u, l, Sp(0.48, 10), cr, 0, 0, 0).scale.set(0.8, 1, 1.3);
        part(u, l, B(0.5, 0.15, 0.8), cr, sd * 0.1, -0.55, 0.4);
        u.lg.push(l);
      });
      const bd = (u.bd = grp(o, 0, u.y0, 0));
      part(u, bd, Sp(1.1, 16), cr, 0, 0, 0).scale.set(1.3, 0.85, 1.15);
      part(u, bd, Sp(0.85, 12), 0xff6a1a, 0, -0.35, 0.3, 0xff4a0a, 1.1).scale.set(1.15, 0.6, 1);
      [
        [-0.6, 0.5, 0.6, 0.4],
        [0.5, 0.6, 0.55, -0.5],
        [0.1, 0.8, 0.2, 1.2],
        [-0.9, 0.2, -0.3, 0.2],
        [0.9, 0.25, -0.2, -0.3],
        [0, 0.7, -0.7, 0.9],
      ].forEach(([x, y, z, r]) => rot(part(u, bd, B(0.07, 0.75, 0.04), 0xffa02a, x, y, z, lv, 1.3), 0.4, r, r));
      [-1, 1].forEach((sd) => {
        part(u, bd, Cy(0.16, 0.22, 0.35, 7), 0x1a1414, sd * 0.4, 0.85, -0.45);
        part(u, bd, Cy(0.14, 0.14, 0.04, 7), 0xff7a2a, sd * 0.4, 1.03, -0.45, lv, 1.4);
        gsp(bd, 0xff7a3a, 1.2, sd * 0.4, 1.2, -0.45);
      });
      gsp(bd, 0xff6a2a, 3.6, 0, -0.2, 0.6);
      const hd = (u.hd = grp(bd, 0, 0.3, 0.95));
      part(u, hd, Sp(0.75, 12), cr, 0, 0, 0).scale.set(1.35, 0.55, 0.9);
      part(u, hd, B(1.25, 0.08, 0.65), 0xff4a0a, 0, -0.22, 0.12, 0xff3a0a, 1.4);
      part(u, hd, B(1.4, 0.18, 0.9), 0x3a2626, 0, -0.36, 0.05);
      [-1, 1].forEach((sd) => {
        part(u, hd, Sp(0.22, 10), 0xffd84a, sd * 0.45, 0.42, 0.05, 0xffa020, 1.2);
        part(u, hd, B(0.06, 0.2, 0.04), 0x100808, sd * 0.45, 0.42, 0.26);
      });
      [-1, 1].forEach((sd) => {
        const a = grp(bd, sd * 0.85, -0.2, 0.6);
        part(u, a, Cy(0.18, 0.2, 0.7, 7), cr, 0, -0.35, 0);
        part(u, a, Sp(0.22, 8), cr, 0, -0.72, 0.08).scale.set(1.2, 0.5, 1.3);
        u.arms.push(a);
      });
      return o;
    },
    function gatekeeper() {
      const o = new T.Group(),
        u = base(o, { y0: 1.3, h: 3.6 }),
        ob = 0x1e1620,
        fl = 0xff6a1a;
      [-1, 1].forEach((sd) => {
        const l = grp(o, sd * 0.28, 1.3, 0);
        part(u, l, Cy(0.17, 0.15, 1.3, 7), 0x161018, 0, -0.65, 0);
        part(u, l, B(0.32, 0.25, 0.52), 0x161018, 0, -1.2, 0.08);
        rot(part(u, l, Cn(0.08, 0.3, 4), 0x2a2030, 0, -0.6, 0.18), PI / 2);
        u.lg.push(l);
      });
      const bd = (u.bd = grp(o, 0, u.y0, 0));
      part(u, bd, B(1.1, 1.25, 0.62), ob, 0, 0.65, 0);
      part(u, bd, B(0.06, 0.85, 0.02), 0xff3a2a, 0, 0.7, 0.32, 0xd8200a, 1.3);
      part(u, bd, B(0.6, 0.9, 0.05), 0x5a1010, 0, -0.2, 0.33);
      rot(part(u, bd, B(1.25, 2.1, 0.06), 0x3a0a0a, 0, 0.2, -0.38), 0.1);
      [-1, 1].forEach((sd) => {
        part(u, bd, Sp(0.36, 10), ob, sd * 0.72, 1.22, 0).scale.set(1, 0.7, 1);
        rot(part(u, bd, Cn(0.08, 0.45, 4), 0x2a2030, sd * 0.85, 1.5, 0), 0, 0, -sd * 0.5);
      });
      const hd = (u.hd = grp(bd, 0, 1.6, 0));
      part(u, hd, B(0.52, 0.62, 0.56), 0x161018, 0, 0, 0);
      part(u, hd, B(0.42, 0.07, 0.02), fl, 0, 0.05, 0.29, 0xff4a0a, 1.8);
      [-1, 1].forEach((sd) => rot(part(u, hd, Cn(0.07, 0.5, 4), 0x161018, sd * 0.28, 0.32, 0), 0, 0, -sd * 0.7));
      const pl = new T.Mesh(Cn(0.16, 0.7, 7), flame(fl, 0.7));
      pl.position.y = 0.6;
      hd.add(pl);
      gsp(hd, 0xff6a2a, 1.6, 0, 0.6, 0);
      [-1, 1].forEach((sd, n) => {
        const a = grp(bd, sd * 0.75, 1.05, 0);
        part(u, a, Cy(0.14, 0.13, 1.1, 7), ob, 0, -0.55, 0);
        part(u, a, B(0.26, 0.3, 0.26), 0x161018, 0, -1.15, 0);
        if (!n) {
          part(u, a, B(0.12, 1.7, 1.05), 0x120c12, -0.2, -0.9, 0.3);
          part(u, a, B(0.02, 1.0, 0.08), 0xff3a2a, -0.27, -0.9, 0.3, 0xd8200a, 1.2);
        } else {
          part(u, a, Cy(0.04, 0.04, 3.2, 5), 0x3a2a2a, 0, -0.7, 0.2);
          part(u, a, B(0.06, 0.6, 0.5), 0x2a2030, 0, 0.75, 0.42);
          part(u, a, Cn(0.06, 0.4, 4), 0x2a2030, 0, 1.05, 0.2);
        }
        u.arms.push(a);
      });
      return o;
    },
    function anvil() {
      const o = new T.Group(),
        u = base(o, { y0: 1.1, h: 3.7 }),
        bz = 0x8a5a2a,
        ir = 0x3a3440;
      [-1, 1].forEach((sd) => {
        const l = grp(o, sd * 0.5, 1.1, 0);
        part(u, l, Cy(0.3, 0.36, 1.1, 8), bz, 0, -0.55, 0);
        part(u, l, B(0.62, 0.25, 0.82), ir, 0, -1.0, 0.1);
        u.lg.push(l);
      });
      const bd = (u.bd = grp(o, 0, u.y0, 0));
      part(u, bd, Cy(0.9, 0.8, 1.4, 12), bz, 0, 0.8, 0);
      [0.3, 1.3].forEach((y) => part(u, bd, Cy(0.93, 0.93, 0.1, 12), ir, 0, y, 0));
      part(u, bd, B(0.72, 0.6, 0.1), 0xff6a12, 0, 0.8, 0.86, 0xff4a0a, 1.4);
      [-0.24, 0, 0.24].forEach((x) => part(u, bd, B(0.06, 0.62, 0.04), ir, x, 0.8, 0.93));
      gsp(bd, 0xff7a3a, 2.4, 0, 0.8, 1);
      [-1, 1].forEach((sd) => {
        part(u, bd, Cy(0.15, 0.15, 1.1, 7), ir, sd * 0.42, 1.9, -0.5);
        part(u, bd, Cy(0.13, 0.13, 0.04, 7), 0xffa02a, sd * 0.42, 2.46, -0.5, 0xff6a0a, 1.5);
        gsp(bd, 0xffa050, 1.4, sd * 0.42, 2.6, -0.5);
      });
      const hd = (u.hd = grp(bd, 0, 1.75, 0));
      part(u, hd, B(0.5, 0.3, 0.4), ir, 0, 0, 0);
      part(u, hd, B(1.05, 0.26, 0.46), ir, 0, 0.28, 0);
      rot(part(u, hd, Cn(0.13, 0.45, 6), ir, 0.74, 0.28, 0), 0, 0, -PI / 2);
      [-1, 1].forEach((sd) => part(u, hd, B(0.12, 0.06, 0.02), 0xffb040, sd * 0.12, 0.05, 0.21, 0xff8a20, 1.8));
      [-1, 1].forEach((sd, n) => {
        const a = grp(bd, sd * 1.05, 1.3, 0);
        part(u, a, Cy(0.22, 0.2, 0.8, 8), bz, 0, -0.4, 0);
        part(u, a, Sp(0.22, 8), ir, 0, -0.82, 0);
        part(u, a, Cy(0.2, 0.18, 0.7, 8), bz, 0, -1.2, 0);
        if (n) {
          part(u, a, B(0.85, 0.45, 0.45), ir, 0, -1.7, 0);
          part(u, a, B(0.86, 0.1, 0.46), 0xff8a2a, 0, -1.92, 0, 0xff5a0a, 1);
        } else [-1, 1].forEach((k) => rot(part(u, a, B(0.06, 0.6, 0.06), ir, k * 0.08, -1.75, 0.08), 0.2 * k));
        u.arms.push(a);
      });
      return o;
    },
    function granny() {
      const o = new T.Group(),
        u = base(o, { y0: 0.2, h: 3.4 }),
        sk = 0x9ab07a;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.283 + 0.3;
        rot(part(u, o, Cn(0.09, 0.8, 5), 0x4a3424, Math.cos(a) * 0.85, 0.2, Math.sin(a) * 0.85), 0, -a, PI / 2 - 0.3);
      }
      const bd = (u.bd = grp(o, 0, u.y0, 0));
      part(u, bd, Cn(0.85, 2.0, 10), 0x2e2a3a, 0, 0.9, 0);
      part(u, bd, Sp(0.48, 10), 0x2e2a3a, 0, 1.65, -0.3);
      part(u, bd, Cy(0.55, 0.75, 0.3, 10), 0x4a3a5a, 0, 1.62, 0);
      const hd = (u.hd = grp(bd, 0, 2.0, 0.25));
      part(u, hd, Sp(0.32, 12), sk, 0, 0, 0);
      rot(part(u, hd, Cn(0.07, 0.45, 6), sk, 0, -0.06, 0.42), PI / 2 + 0.25);
      part(u, hd, Sp(0.045, 5), 0x6a8a4a, 0.05, -0.02, 0.5);
      [-1, 1].forEach((sd) => part(u, hd, Sp(0.05, 6), 0xd8ff5a, sd * 0.11, 0.07, 0.27, 0xb8ff3a, 1.8));
      part(u, hd, B(0.2, 0.04, 0.03), 0x1a1010, 0, -0.17, 0.27);
      for (let i = 0; i < 7; i++) part(u, hd, Cy(0.02, 0.01, 0.7, 3), 0xb8b8c0, -0.24 + i * 0.08, -0.25, -0.22);
      part(u, hd, Cy(0.68, 0.68, 0.05, 16), 0x1e1a2a, 0, 0.24, 0);
      rot(part(u, hd, Cn(0.33, 1.05, 10), 0x1e1a2a, 0.1, 0.74, -0.05), -0.15, 0, 0.3);
      part(u, hd, Cy(0.34, 0.34, 0.1, 12), 0x6a3a8a, 0, 0.32, 0);
      [-1, 1].forEach((sd, n) => {
        const a = grp(bd, sd * 0.55, 1.6, 0.1);
        part(u, a, Cy(0.1, 0.2, 0.8, 7), 0x2e2a3a, 0, -0.4, 0);
        part(u, a, Sp(0.1, 6), sk, 0, -0.85, 0);
        if (n) {
          part(u, a, Cy(0.04, 0.05, 2.5, 5), 0x4a3424, 0, -0.5, 0.15);
          part(u, a, Sp(0.12, 8), 0xe8e0d0, 0, 0.8, 0.15);
          part(u, a, B(0.18, 0.24, 0.18), 0x7dff5a, 0, 0.55, 0.32, 0x4aff2a, 1.5);
          gsp(a, 0x9aff6a, 1.6, 0, 0.55, 0.32);
        }
        u.arms.push(a);
      });
      const sp = grp(o, 0, 1.8, 0);
      [0, 1, 2].forEach((k) => {
        part(u, sp, Sp(0.1, 6), 0x9aff6a, Math.cos(k * 2.1) * 1.15, 0, Math.sin(k * 2.1) * 1.15, 0x5aff3a, 1.6);
        gsp(sp, 0x9aff6a, 0.9, Math.cos(k * 2.1) * 1.15, 0, Math.sin(k * 2.1) * 1.15);
      });
      u.spin.push([sp, 1.1]);
      return o;
    },
    function bellringer() {
      const o = new T.Group(),
        u = base(o, { y0: 0.9, fl: 0.18, h: 3.1 }),
        bn = 0xd8d0b8,
        rb = 0x2a4a48;
      const bd = (u.bd = grp(o, 0, u.y0, 0));
      part(u, bd, Cn(0.72, 2.0, 9), rb, 0, 0.4, 0);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * 6.283;
        rot(
          part(u, bd, Cy(0.02, 0.04, 0.9 + (i % 3) * 0.3, 3), 0x3a6a3a, Math.cos(a) * 0.62, -0.7, Math.sin(a) * 0.62),
          0,
          0,
          i % 2 ? 0.1 : -0.1,
        );
        if (i % 2) part(u, bd, Sp(0.06, 5), 0xc8c0a8, Math.cos(a) * 0.45, 0.2 + (i % 3) * 0.3, Math.sin(a) * 0.45);
      }
      part(u, bd, Cy(0.5, 0.52, 0.08, 10), 0x6a5a3a, 0, 0.55, 0);
      gsp(bd, 0x5fe0c0, 3.2, 0, 0.8, 0);
      const hd = (u.hd = grp(bd, 0, 1.55, 0.05));
      part(u, hd, Sp(0.4, 10), 0x1e3634, 0, 0, -0.05).scale.set(1, 1.15, 1);
      part(u, hd, Sp(0.26, 10), bn, 0, -0.03, 0.14);
      [-1, 1].forEach((sd) => part(u, hd, Sp(0.06, 6), 0x5fe0c0, sd * 0.09, 0.02, 0.36, 0x2affc0, 1.8));
      part(u, hd, B(0.18, 0.07, 0.12), bn, 0, -0.22, 0.2);
      [-1, 1].forEach((sd, n) => {
        const a = grp(bd, sd * 0.5, 1.2, 0.1);
        part(u, a, Cy(0.12, 0.2, 0.8, 7), rb, 0, -0.4, 0);
        part(u, a, Sp(0.08, 6), bn, 0, -0.85, 0);
        if (n) {
          part(u, a, Cy(0.015, 0.015, 0.5, 3), 0x6a5a3a, 0, -1.1, 0.1);
          part(u, a, Cn(0.45, 0.7, 12), 0xa8803a, 0, -1.65, 0.2);
          part(u, a, Cy(0.47, 0.47, 0.06, 12), 0x8a6a2a, 0, -2.0, 0.2);
          part(u, a, Sp(0.1, 6), 0x5a4a2a, 0, -2.08, 0.2);
        }
        u.arms.push(a);
      });
      return o;
    },
    function mossback() {
      const o = new T.Group(),
        u = base(o, { y0: 1.0, h: 3.2 }),
        sk = 0x5a6a4a;
      [
        [-1.0, 0.8, 1],
        [1.0, 0.8, 1],
        [-1.0, -0.8, 0],
        [1.0, -0.8, 0],
      ].forEach(([x, z, fr]) => {
        const l = grp(o, x, 0.85, z);
        part(u, l, Cy(0.35, 0.42, 0.85, 8), sk, 0, -0.42, 0);
        (fr ? u.arms : u.lg).push(l);
      });
      const bd = (u.bd = grp(o, 0, u.y0, 0));
      part(u, bd, Sp(1.6, 16), 0x3e5a34, 0, 0.3, 0).scale.set(1, 0.55, 1.15);
      part(u, bd, B(2.6, 0.3, 3.0), 0x7a7a5a, 0, -0.1, 0);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * 6.283;
        part(u, bd, Cy(0.38, 0.42, 0.1, 6), 0x5a7a44, Math.cos(a) * 0.85, 0.95 - 0.1, Math.sin(a) * 1.0).rotation.set(
          Math.sin(a) * 0.4,
          0,
          -Math.cos(a) * 0.4,
        );
      }
      part(u, bd, B(1.0, 0.15, 1.0), 0x8a9a80, 0, 1.18, 0);
      [-0.4, 0.4].forEach((x) => [-0.4, 0.4].forEach((z) => part(u, bd, Cy(0.06, 0.06, 0.8, 5), 0x8a9a80, x, 1.6, z)));
      rot(part(u, bd, Cn(0.85, 0.55, 4), 0x2a3a30, 0, 2.25, 0), 0, PI / 4);
      part(u, bd, Sp(0.2, 10), 0x7dffe0, 0, 1.55, 0, 0x2aa88a, 1.6);
      gsp(bd, 0x5fe0c0, 2.4, 0, 1.55, 0);
      const hd = (u.hd = grp(bd, 0, 0.3, 1.75));
      rot(part(u, hd, Cy(0.3, 0.36, 0.6, 8), sk, 0, 0, -0.2), PI / 2);
      part(u, hd, Sp(0.45, 10), sk, 0, 0.05, 0.3).scale.set(1, 0.8, 1.2);
      [-1, 1].forEach((sd) => part(u, hd, Sp(0.07, 6), 0x7dffe0, sd * 0.26, 0.17, 0.62, 0x2aa88a, 1.6));
      part(u, hd, B(0.3, 0.12, 0.2), 0x3a4a2a, 0, -0.08, 0.78);
      rot(part(u, hd, Cn(0.18, 0.5, 6), 0x4f6a34, 0, -0.38, 0.5), PI);
      rot(part(u, bd, Cn(0.18, 0.6, 6), sk, 0, -0.1, -1.75), -PI / 2);
      return o;
    },
    function lanternMother() {
      const o = new T.Group(),
        u = base(o, { y0: 1.6, fl: 0.3, h: 3.7 }),
        cl = 0x1a1626;
      const bd = (u.bd = grp(o, 0, u.y0, 0));
      part(u, bd, Cn(0.95, 2.4, 9), cl, 0, -0.2, 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.283;
        rot(part(u, bd, Cn(0.14, 0.5, 4), cl, Math.cos(a) * 0.85, -1.45, Math.sin(a) * 0.85), PI);
      }
      const hd = (u.hd = grp(bd, 0, 1.15, 0));
      part(u, hd, Sp(0.46, 10), 0x221c30, 0, 0, 0).scale.set(1, 1.15, 1);
      part(u, hd, Sp(0.3, 8), 0x050408, 0, -0.05, 0.22).scale.set(1, 1.1, 0.6);
      [-1, 1].forEach((sd) => part(u, hd, Sp(0.07, 6), 0xffd27a, sd * 0.12, 0, 0.38, 0xffaa30, 2));
      [-1, 1].forEach((sd, n) => {
        const a = grp(bd, sd * 0.62, 0.8, 0.1);
        part(u, a, Cy(0.06, 0.04, 1.4, 5), 0x2a2438, 0, -0.7, 0);
        [-1, 0, 1].forEach((k) => rot(part(u, a, Cn(0.03, 0.22, 4), 0x2a2438, k * 0.06, -1.5, 0.04), PI));
        if (!n) {
          part(u, a, Cy(0.012, 0.012, 0.5, 3), 0x2a2438, 0, -1.8, 0);
          part(u, a, B(0.22, 0.3, 0.22), 0xffd98a, 0, -2.15, 0, 0xd99a2a, 1.5);
          gsp(a, 0xffd27a, 1.6, 0, -2.15, 0);
        }
        u.arms.push(a);
      });
      const sp = grp(o, 0, 1.8, 0);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * 6.283,
          x = Math.cos(a) * 1.7,
          z = Math.sin(a) * 1.7,
          y = (k % 2) * 0.35;
        part(u, sp, Cy(0.012, 0.012, 0.6, 3), 0x2a2438, x, y + 0.45, z);
        part(u, sp, B(0.22, 0.3, 0.22), 0xffd98a, x, y, z, 0xd99a2a, 1.4);
        part(u, sp, Cn(0.17, 0.15, 4), 0x2a2438, x, y + 0.22, z);
        gsp(sp, 0xffd27a, 1.3, x, y, z);
      }
      u.spin.push([sp, 0.5]);
      return o;
    },
  ];
  // ---------- foe kind table ----------
  // n name, wk weaknesses, sc model scale in the world
  const SWK = {
    bogl: { n: "Bog Gloomling", wk: { heal: WK_W, storm: WK_R }, mdl: mBogl },
    skel: { n: "Mire Skeleton", wk: { fire: WK_W, spirit: WK_R }, mdl: mSkel },
    bogm: { n: "Bog Monster", wk: { fire: WK_W, heal: WK_R }, mdl: mBogm },
    mwisp: { n: "Will-o'-Wisp", wk: { ice: WK_W, fire: WK_R }, mdl: mWisp },
  };
  // the road bosses, one per ZSTR street (same order)
  const RB = [
    {
      n: "Rimefang Twin-Maw",
      wk: { fire: WK_W, ice: WK_R },
      v: [260, "sine"],
      a: [
        "Two mouths, little light. And both of them are hungry.",
        "Grrr... grrr. (Both heads growl, slightly out of time.)",
      ],
      h: ["The left head bites. The right head bites harder!"],
      d: ["We... disagree... about this fight..."],
    },
    {
      n: "The Lake Lurker",
      wk: { storm: WK_W, ice: WK_R },
      v: [70, "sine"],
      a: ["Blub. You walked on my roof. Nobody walks on my roof.", "The fishing holes were MY idea. Mine!"],
      h: ["The ice cracks... and so do you!"],
      d: ["Back... under... the nice cold dark..."],
    },
    {
      n: "Runebound Sentinel",
      wk: { heal: WK_W, storm: WK_R },
      v: [120, "square"],
      a: [
        "INTRUDER. THE STONES REMEMBER. THE STONES DO NOT FORGIVE.",
        "WARD ACTIVE. LIGHT DETECTED. LIGHT... UNWELCOME.",
      ],
      h: ["RUNES FAILING. REDIRECTING ALL POWER TO PUNCHING."],
      d: ["WARD... RELEASED... THE STONES... MAY... SLEEP..."],
    },
    {
      n: "Grumm the Trapper",
      wk: { fire: WK_W, ice: WK_R },
      v: [90, "triangle"],
      a: ["Grumm catch wolves. Grumm catch sleds. Grumm catch YOU.", "Little lamp-person! Grumm put you in the sack!"],
      h: ["Grumm not like this! Grumm get the BIG trap!"],
      d: ["Grumm... go home now... Grumm sorry about the sleds..."],
    },
    {
      n: "Magmaw",
      wk: { ice: WK_W, fire: WK_R },
      v: [60, "sawtooth"],
      a: ["BRRRRAP. (It belches a cloud of sparks at you.)", "Ribbit. RIBBIT. You look crunchy."],
      h: ["BRRRRAAAAP! Hot hot hot hot!"],
      d: ["Ribbit... fizzle... hsssss..."],
    },
    {
      n: "The Obsidian Gatekeeper",
      wk: { storm: WK_W, fire: WK_R },
      v: [100, "square"],
      a: [
        "None shall pass the Obsidian Gate. Not you. Not your little lamp.",
        "Turn back, lamplighter. The gate has eaten braver flames.",
      ],
      h: ["You chip my armour... but the gate stands!"],
      d: ["The gate... is open... pass, then... and be worthy of it..."],
    },
    {
      n: "The Anvil Colossus",
      wk: { ice: WK_W, fire: WK_R },
      v: [150, "square"],
      a: ["CLANG. CLANG. NEW METAL. NEW METAL FOR THE FORGE.", "THE STEPS ARE FOR WORKERS. YOU ARE NOT WORKING."],
      h: ["FURNACE OVERHEATING. THAT IS FINE. THAT IS GOOD."],
      d: ["Clang... clang..... cl....ang..."],
    },
    {
      n: "Granny Hollowroot",
      wk: { fire: WK_W, heal: WK_R },
      v: [380, "triangle"],
      a: [
        "Ooh, a visitor! Come in, come in, dearie. The cauldron's just about to boil.",
        "Wipe your feet! I've only just mudded the floors.",
      ],
      h: ["Tsk! Kids these days. No respect for their elders!"],
      d: ["Fine... take the path... but you're not getting my soup recipe..."],
    },
    {
      n: "The Drowned Bellringer",
      wk: { heal: WK_W, spirit: WK_R },
      v: [110, "sine"],
      a: [
        "The bell tolls under the water, lamplighter. It tolls for you.",
        "Hush. Listen. Every toll is a name the bog has kept.",
      ],
      h: ["Ring, bell, ring! Call them all up from the deep!"],
      d: ["The last toll... the bell... falls silent... at last..."],
    },
    {
      n: "Old Mossback",
      wk: { storm: WK_W, heal: WK_R },
      v: [55, "triangle"],
      a: [
        "Hmmmm. Slow down, little light. The shrine has waited... a long time.",
        "I have carried this shrine three hundred years. I can carry you too. Under me.",
      ],
      h: ["Hmmm. Now I am... a little... cross."],
      d: ["Hmmmm... rest now... the shrine is yours to keep..."],
    },
    {
      n: "The Lantern Mother",
      wk: { ice: WK_W, spirit: WK_R },
      v: [420, "sine"],
      a: [
        "Another lost little light. Come, join my lanterns. They never go out.",
        "Follow the glow, child. Everyone follows the glow.",
      ],
      h: ["You would snuff MY lights? I will hang yours with the others!"],
      d: ["My lanterns... go dark... one... by... one..."],
    },
  ];
  const ZBL = { frost: [5, 420], ember: [6, 500], marsh: [7, 580] }; // [level, hp] of a road boss in each zone
  // ---------- mkFoe / animation / battle hooks ----------
  const mk0 = mkFoe;
  mkFoe = function (kind, t, big, hc) {
    const K = SWK[kind],
      bi = /^rb\d+$/.test(kind || "") ? +kind.slice(2) : -1;
    if (!K && bi < 0) return mk0(kind, t, big, hc);
    const o = K ? K.mdl() : M0[bi]();
    o.scale.setScalar((K ? 1 : 1.1) * (big ? 1.2 : 1));
    return o;
  };
  RDX.isMine = (k) => !!SWK[k] || /^rb\d+$/.test(k || "");
  function anim(o, s, m) {
    const u = o.userData,
      j = u.ph,
      bd = u.bd,
      hd = u.hd,
      ph = s * (m ? 7 : 1.2) + j;
    bd.scale.set(1, 1, 1);
    bd.position.y = u.y0 + (u.fl ? S2(s * 2 + j) * u.fl : m ? Math.abs(S2(ph)) * 0.08 : S2(s * 1.6 + j) * 0.03);
    bd.rotation.set(
      m ? 0.08 : 0.02 + S2(s * 0.9 + j) * 0.02,
      m ? 0 : S2(s * 0.5 + j) * 0.08,
      m ? S2(ph) * 0.05 : S2(s * 0.7 + j) * 0.02,
    );
    if (hd) hd.rotation.set(S2(s * 1.1 + j) * 0.07, S2(s * 0.6 + j) * 0.25, S2(s * 0.8 + j) * 0.04);
    if (u.heads)
      u.heads.forEach((h, n) => {
        if (h === hd) return;
        h.rotation.set(S2(s * 1.4 + j + 2) * 0.1, (n ? 0.35 : -0.35) + S2(s * 0.8 + j + n) * 0.25, 0);
      });
    if (u.heads && hd) hd.rotation.y += -0.35;
    u.arms.forEach((a, n) => {
      const sd = n % 2 ? 1 : -1;
      a.rotation.set(
        m ? S2(ph + n * PI) * 0.55 : S2(s * 1.2 + j + n) * 0.06,
        0,
        sd * (u.fl ? 0.15 + S2(s * 1.5 + j) * 0.08 : 0.06),
      );
    });
    u.lg.forEach((l, n) => (l.rotation.x = m ? S2(ph + n * PI + (u.arms.length > 2 ? 0 : PI / 2)) * 0.5 : 0));
    if (u.tail) u.tail.rotation.set(S2(s * 2 + j) * 0.1, S2(s * (m ? 8 : 2.5) + j) * 0.35, 0);
    u.spin.forEach(([q, v]) => (q.rotation.y = s * v + j));
    const pu = 0.75 + 0.35 * S2(s * 3 + j);
    u.gm.forEach((mt) => (mt.emissiveIntensity = pu * 1.2));
  }
  RDX.anim = anim;
  const ab0 = animBeast,
    ag0 = animGloom;
  animBeast = function (o, s, m) {
    const u = o && o.userData;
    if (u && u.rbm) {
      if (u.frz) return;
      anim(o, s, m);
      if (u.fp) FMV.over(o);
      return;
    }
    ab0(o, s, m);
  };
  animGloom = function (o, s, m, i) {
    const u = o && o.userData;
    if (u && u.rbm) {
      if (u.frz) return;
      anim(o, s, m);
      if (u.fp) FMV.over(o);
      return;
    }
    ag0(o, s, m, i);
  };
  const nf0 = newFoe;
  newFoe = function (sp, slot) {
    if (sp && SWK[sp.kind] && !sp.nm) sp = Object.assign({}, sp, { nm: SWK[sp.kind].n });
    const f = nf0(sp, slot);
    if (RDX.isMine(f.kind)) {
      f.m.rotation.y = -0.9;
      f.th = (f.m.userData.h || 2.5) * f.m.scale.x + 0.3;
    }
    return f;
  };
  Object.keys(SWK).forEach((k) => (WKT[k] = SWK[k].wk));
  RB.forEach((r, i) => (WKT["rb" + i] = r.wk));
  const wk0 = wkName;
  wkName = function (nm) {
    const k =
      Object.keys(SWK).find((q) => SWK[q].n === nm) ||
      (RB.findIndex((r) => r.n === nm) >= 0 ? "rb" + RB.findIndex((r) => r.n === nm) : null);
    return k ? String(weakTxt({ kind: k })).trim() : wk0(nm);
  };
  // ---------- movesets ----------
  const hurt = (f) => f.hp < f.max * 0.7,
    mate = (f) => g.foes.some((q) => q !== f && q.hp > 0);
  const NM = {
    // Bog Gloomling
    blash: { n: "Slime Lash", ic: "🐸", el: "heal", tg: "one", p: 1.0, w: 3, an: "claw", fx: "rake" },
    blure: {
      n: "Lure Glow",
      ic: "💡",
      el: "spirit",
      tg: "debuff",
      p: 0.3,
      w: 1.3,
      cd: 3,
      an: "glare",
      fx: "fear",
      pp: 1,
      ppn: "Dazed",
    },
    bspit: { n: "Mud Spit", ic: "💧", el: "heal", tg: "one", p: 1.2, w: 2, cd: 2, an: "spit", fx: "spit", rng: 1 },
    // Mire Skeleton
    kslash: { n: "Rusty Slash", ic: "🗡", el: "spirit", tg: "one", p: 1.1, w: 3, an: "claw", fx: "rake" },
    kbone: {
      n: "Bone Throw",
      ic: "🦴",
      el: "spirit",
      tg: "one",
      p: 1.3,
      w: 2,
      cd: 2,
      an: "cast",
      fx: "boulder",
      rng: 1,
    },
    kchill: {
      n: "Grave Chill",
      ic: "❄",
      el: "ice",
      tg: "one",
      p: 1.2,
      w: 1.5,
      cd: 3,
      an: "cast",
      fx: "frostpuff",
      rng: 1,
      ch: 0.45,
    },
    krattle: {
      n: "Rattle",
      ic: "💀",
      el: "spirit",
      tg: "pack",
      who: "any",
      bf: 1.3,
      w: 1.2,
      cd: 3,
      an: "shake",
      fx: "stoke",
      c: mate,
    },
    // Bog Monster
    mslam: { n: "Muck Slam", ic: "👊", el: "heal", tg: "one", p: 1.3, w: 3, an: "slam", fx: "bash" },
    mgas: {
      n: "Swamp Gas",
      ic: "☁",
      el: "heal",
      tg: "debuff",
      p: 0.45,
      w: 1.5,
      cd: 3,
      an: "roar",
      fx: "spores",
      pp: 1,
      ppn: "Choking",
    },
    mengulf: { n: "Engulf", ic: "🌀", el: "heal", tg: "one", p: 1.7, w: 1.5, cd: 3, an: "pounce", fx: "shadowcrash" },
    msoak: {
      n: "Soak Up",
      ic: "✚",
      el: "heal",
      tg: "self",
      w: 1.3,
      cd: 4,
      an: "guard",
      fx: "regrow",
      hl: 0.15,
      c: hurt,
    },
    // Will-o'-Wisp
    wflare: { n: "Wisp Flare", ic: "🔥", el: "fire", tg: "one", p: 1.2, w: 3, an: "cast", fx: "flare", rng: 1, bn: 1 },
    wlost: {
      n: "Lead Astray",
      ic: "🌫",
      el: "spirit",
      tg: "debuff",
      p: 0.35,
      w: 1.3,
      cd: 3,
      an: "glare",
      fx: "fear",
      pp: 1,
      ppn: "Lost",
    },
    wflick: { n: "Flicker", ic: "🛡", el: "fire", tg: "self", w: 1.2, cd: 3, an: "guard", fx: "guard", gd: 1 },
  };
  const BM = [
    {
      a: { n: "Double Bite", ic: "🐺", el: "ice", tg: "one", p: 1.3, w: 3, an: "bite", fx: "bite", ch: 0.35 },
      b: { n: "Twin Howl", ic: "🌨", el: "ice", tg: "all", p: 0.7, w: 1.5, cd: 3, an: "howl", fx: "blizzard", ch: 0.5 },
      c: { n: "Rime Pounce", ic: "💥", el: "ice", tg: "one", p: 1.8, w: 1.5, cd: 3, an: "pounce", fx: "icecrash" },
      d: { n: "Frenzy of Two", ic: "▲", el: "ice", tg: "self", w: 1.2, cd: 4, an: "roar", fx: "stoke", bf: 1.4 },
    },
    {
      a: { n: "Coil Crush", ic: "🐍", el: "ice", tg: "one", p: 1.25, w: 3, an: "slam", fx: "bash" },
      b: {
        n: "Ice Spit",
        ic: "❄",
        el: "ice",
        tg: "one",
        p: 1.4,
        w: 2,
        cd: 2,
        an: "spit",
        fx: "frostpuff",
        rng: 1,
        ch: 0.6,
      },
      c: {
        n: "Frozen Wave",
        ic: "🌊",
        el: "ice",
        tg: "all",
        p: 0.7,
        w: 1.5,
        cd: 3,
        an: "breath",
        fx: "breath",
        ch: 0.4,
      },
      d: { n: "Sink Below", ic: "🛡", el: "ice", tg: "self", w: 1.4, cd: 3, an: "guard", fx: "guard", gd: 1 },
    },
    {
      a: { n: "Rune Fist", ic: "👊", el: "storm", tg: "one", p: 1.25, w: 3, an: "slam", fx: "bash" },
      b: { n: "Runic Pulse", ic: "⚡", el: "storm", tg: "all", p: 0.7, w: 1.5, cd: 3, an: "cast", fx: "nova" },
      c: {
        n: "Stone Volley",
        ic: "🪨",
        el: "storm",
        tg: "one",
        p: 1.5,
        w: 2,
        cd: 2,
        an: "cast",
        fx: "boulder",
        rng: 1,
      },
      d: {
        n: "Ward of Old Stones",
        ic: "🛡",
        el: "storm",
        tg: "self",
        w: 1.3,
        cd: 4,
        an: "guard",
        fx: "guard",
        gd: 1,
        hl: 0.08,
      },
    },
    {
      a: { n: "Runner Smash", ic: "🛷", el: "ice", tg: "one", p: 1.35, w: 3, an: "slam", fx: "bash" },
      b: {
        n: "Snowball Barrage",
        ic: "☃",
        el: "ice",
        tg: "all",
        p: 0.6,
        w: 1.5,
        cd: 3,
        an: "cast",
        fx: "blizzard",
        ch: 0.4,
      },
      c: {
        n: "Bear Trap",
        ic: "🪤",
        el: "ice",
        tg: "debuff",
        p: 0.45,
        w: 1.3,
        cd: 3,
        an: "cast",
        fx: "bite",
        pp: 1,
        ppn: "Trapped",
      },
      d: { n: "Yeti Roar", ic: "📣", el: "ice", tg: "self", w: 1.2, cd: 4, an: "roar", fx: "howl", bf: 1.4 },
    },
    {
      a: { n: "Tongue Lash", ic: "👅", el: "fire", tg: "one", p: 1.2, w: 3, an: "bite", fx: "emberhit", bn: 1 },
      b: {
        n: "Magma Belch",
        ic: "🌋",
        el: "fire",
        tg: "all",
        p: 0.7,
        w: 1.5,
        cd: 3,
        an: "breath",
        fx: "flamewave",
        bn: 1,
      },
      c: {
        n: "Lava Glob",
        ic: "☄",
        el: "fire",
        tg: "one",
        p: 1.5,
        w: 2,
        cd: 2,
        an: "spit",
        fx: "fireball",
        rng: 1,
        bn: 1,
      },
      d: { n: "Belly Flop", ic: "💥", el: "fire", tg: "all", p: 0.8, w: 1.2, cd: 4, an: "pounce", fx: "magma" },
    },
    {
      a: { n: "Halberd Sweep", ic: "🪓", el: "fire", tg: "one", p: 1.3, w: 3, an: "slam", fx: "rake", bn: 1 },
      b: { n: "Obsidian Wall", ic: "🛡", el: "fire", tg: "self", w: 1.5, cd: 3, an: "guard", fx: "guard", gd: 1 },
      c: {
        n: "Gate of Flame",
        ic: "🔥",
        el: "fire",
        tg: "all",
        p: 0.75,
        w: 1.5,
        cd: 3,
        an: "cast",
        fx: "flamewave",
        bn: 1,
      },
      d: {
        n: "None Shall Pass",
        ic: "💀",
        el: "spirit",
        tg: "debuff",
        p: 0.4,
        w: 1.2,
        cd: 3,
        an: "roar",
        fx: "fear",
        pp: 1,
        ppn: "Dread",
      },
    },
    {
      a: { n: "Hammerfall", ic: "🔨", el: "fire", tg: "one", p: 1.45, w: 3, an: "slam", fx: "firecrash", bn: 1 },
      b: {
        n: "Spark Shower",
        ic: "✨",
        el: "fire",
        tg: "all",
        p: 0.65,
        w: 1.5,
        cd: 3,
        an: "shake",
        fx: "meteor",
        bn: 1,
      },
      c: {
        n: "Bellows Blast",
        ic: "💨",
        el: "fire",
        tg: "one",
        p: 1.3,
        w: 2,
        cd: 2,
        an: "breath",
        fx: "breath",
        bn: 2,
      },
      d: {
        n: "Stoke the Furnace",
        ic: "▲",
        el: "fire",
        tg: "self",
        w: 1.2,
        cd: 4,
        an: "roar",
        fx: "kindle",
        hl: 0.1,
        bf: 1.3,
      },
    },
    {
      a: { n: "Cane Whack", ic: "🦯", el: "heal", tg: "one", p: 1.15, w: 3, an: "claw", fx: "rake" },
      b: {
        n: "Bubbling Brew",
        ic: "🧪",
        el: "heal",
        tg: "debuff",
        p: 0.45,
        w: 1.5,
        cd: 3,
        an: "cast",
        fx: "spores",
        pp: 1,
        ppn: "Toad-Tongue",
      },
      c: { n: "Root Snare", ic: "🌿", el: "heal", tg: "all", p: 0.7, w: 1.5, cd: 3, an: "cast", fx: "thorns" },
      d: {
        n: "Old Wives' Remedy",
        ic: "✚",
        el: "heal",
        tg: "self",
        w: 1.2,
        cd: 4,
        an: "cast",
        fx: "mend",
        hl: 0.15,
        c: hurt,
      },
      e: { n: "Hex Bolt", ic: "🔮", el: "spirit", tg: "one", p: 1.4, w: 2, cd: 2, an: "cast", fx: "bolt", rng: 1 },
    },
    {
      a: { n: "Drowning Grasp", ic: "🌊", el: "spirit", tg: "one", p: 1.3, w: 3, an: "drain", fx: "drain" },
      b: { n: "Bell Toll", ic: "🔔", el: "spirit", tg: "all", p: 0.7, w: 2, cd: 2, an: "shake", fx: "eclipse" },
      c: {
        n: "Funeral Knell",
        ic: "💀",
        el: "spirit",
        tg: "debuff",
        p: 0.4,
        w: 1.3,
        cd: 3,
        an: "roar",
        fx: "fear",
        pp: 1,
        ppn: "Dread",
      },
      d: {
        n: "Tide Shroud",
        ic: "🛡",
        el: "spirit",
        tg: "self",
        w: 1.2,
        cd: 4,
        an: "guard",
        fx: "guard",
        gd: 1,
        hl: 0.08,
      },
    },
    {
      a: { n: "Shell Bash", ic: "🐢", el: "heal", tg: "one", p: 1.3, w: 3, an: "charge", fx: "bash" },
      b: { n: "Shrine Light", ic: "✨", el: "heal", tg: "all", p: 0.65, w: 1.5, cd: 3, an: "cast", fx: "nova" },
      c: { n: "Withdraw", ic: "🛡", el: "heal", tg: "self", w: 1.4, cd: 3, an: "guard", fx: "guard", gd: 1 },
      d: {
        n: "Moss Regrowth",
        ic: "🌿",
        el: "heal",
        tg: "self",
        w: 1.2,
        cd: 4,
        an: "roar",
        fx: "regrow",
        hl: 0.15,
        c: hurt,
      },
      e: { n: "Snapping Beak", ic: "💥", el: "heal", tg: "one", p: 1.6, w: 1.5, cd: 3, an: "bite", fx: "bite" },
    },
    {
      a: { n: "Lantern Swing", ic: "🏮", el: "fire", tg: "one", p: 1.25, w: 3, an: "claw", fx: "emberhit", bn: 1 },
      b: { n: "Wisp Storm", ic: "👻", el: "spirit", tg: "all", p: 0.7, w: 1.5, cd: 3, an: "cast", fx: "eclipse" },
      c: {
        n: "Lead Them Astray",
        ic: "🌫",
        el: "spirit",
        tg: "debuff",
        p: 0.4,
        w: 1.3,
        cd: 3,
        an: "glare",
        fx: "fear",
        pp: 1,
        ppn: "Lost",
      },
      d: { n: "Snuff", ic: "🕯", el: "spirit", tg: "one", p: 1.6, w: 1.5, cd: 3, an: "drain", fx: "drain" },
    },
  ];
  Object.keys(NM).forEach((k) => (FMV.M[k] = Object.assign({ id: k }, NM[k])));
  Object.assign(FMV.K, {
    bogl: ["blash", "blure", "bspit"],
    skel: ["kslash", "kbone", "kchill", "krattle"],
    bogm: ["mslam", "mgas", "mengulf", "msoak"],
    mwisp: ["wflare", "wlost", "wflick"],
  });
  BM.forEach((set, i) => {
    FMV.K["rb" + i] = Object.keys(set).map((k) => {
      const id = "rb" + i + k;
      FMV.M[id] = Object.assign({ id }, set[k]);
      return id;
    });
  });
  const kit0 = FMV.kit;
  FMV.kit = (f) => (f && f.rbi != null && FMV.K["rb" + f.rbi] ? FMV.K["rb" + f.rbi] : kit0(f));
  // ---------- 1b) v26c: no more stray Cinder Fiends on the zone streets ----------
  // Zone foe lists in 03 hold some ["gloom", 4]; foeSetup takes any gloom t4 for a boss (a Cinder Fiend look and fight)
  // and 32-bosses.js gave each two fiery Emberling minions, then the deal put them on every zone street. Out in the
  // zones they become ordinary local foes (same objects and order): the "boss" turns into the zone's big foe and its
  // Emberlings into the zone's pack foes, detached from it (m.mb = a dead dummy so 32's minion code leaves them alone).
  const reskin = (f, k, t) => {
    const o2 = mkFoe(k, t, f.big);
    o2.position.copy(f.o.position);
    o2.rotation.y = f.o.rotation.y;
    o2.visible = f.o.visible;
    if (f.au) o2.add(f.au);
    const par = f.o.parent;
    if (par) {
      par.remove(f.o);
      par.add(o2);
    }
    f.o = o2;
    f.s0 = o2.scale.x;
    f.kind = k;
    f.t = t;
    f.nm = NFK[k] ? NFK[k].n : SWK[k] ? SWK[k].n : f.nm;
    delete f.hc;
    f.R = 3 + t * 0.3 + (f.big ? 0.6 : 0);
    if (f.ring) f.ring.scale.setScalar(f.R);
  };
  const cvLoop = (f) => {
    const ok = (p) => okp(p[0], p[1]) && !safe(p[0], p[1]) && clr(p[0], p[1]),
      kept = [];
    [
      [f.hx + 4.5, f.hz],
      [f.hx, f.hz + 4.5],
      [f.hx - 4.5, f.hz],
      [f.hx, f.hz - 4.5],
    ]
      .filter(ok)
      .forEach((p) => {
        if (!kept.length || legOK(kept[kept.length - 1], p)) kept.push(p);
      });
    f.path = kept.length > 1 ? kept : null;
    f.pi = 0;
  };
  const CVB = { frost: ["fgolem", 4], ember: ["lgolem", 4], marsh: ["bogm", 4] },
    CVM = { frost: ["wolf", 3], ember: ["hound", 3], marsh: ["skel", 3] },
    CV = [];
  foes.slice().forEach((b) => {
    if (!b.o || !b.boss || b.dboss || b.kind !== "gloom" || b.tw || b.dun != null || b.d2) return;
    const z = zoneAt(b.hx, b.hz);
    if (!CVB[z]) return;
    reskin(b, CVB[z][0], CVB[z][1]);
    b.boss = false;
    b.elite = null;
    cvLoop(b);
    foes.forEach((m) => {
      if (m.mb !== b) return;
      reskin(m, CVM[z][0], CVM[z][1]);
      delete m.msp;
      delete m.min;
      m.mb = { dead: 1 };
      m.cv = 1;
      m.elite = null;
      cvLoop(m);
      CV.push(m);
    });
  });
  // 32 keeps their street timer off (rt = Infinity), so they come back here, out of sight
  setInterval(() => {
    if (typeof mode === "undefined" || mode !== "explore") return;
    const now = performance.now();
    CV.forEach((m) => {
      if (!m.dead) return void (m.cvT = 0);
      if (!m.cvT) m.cvT = now + 45000;
      if (now < m.cvT || Math.hypot(W.position.x - m.hx, W.position.z - m.hz) < 25) return;
      m.cvT = 0;
      m.dead = 0;
      m.pi = 0;
      m.o.position.set(m.hx, 0, m.hz);
      m.o.visible = true;
      if (m.s0) m.o.scale.setScalar(m.s0);
      S.add(m.o);
      m.cool = now + 2500;
      m.fade = 0;
    });
  }, 1000);
  // ---------- 2) Mirewick's foes become swamp foes (same objects and order) ----------
  {
    let n = 0;
    foes.forEach((f) => {
      if (!f.o || f.dun != null || f.boss || f.mb || f.tw || f.prac || f.nm || NFK[f.kind] || RDX.isMine(f.kind))
        return;
      if (zoneAt(f.hx, f.hz) !== "marsh") return;
      const t = f.t | 0 || 1,
        k = t <= 1 ? "bogl" : t === 2 ? (n % 2 ? "mwisp" : "skel") : t === 3 ? (n % 2 ? "skel" : "bogm") : "bogm";
      n++;
      const o2 = mkFoe(k, t, f.big);
      o2.position.copy(f.o.position);
      o2.rotation.y = f.o.rotation.y;
      o2.visible = f.o.visible;
      if (f.au) o2.add(f.au);
      const par = f.o.parent;
      if (par) {
        par.remove(f.o);
        par.add(o2);
      }
      f.o = o2;
      f.s0 = o2.scale.x;
      f.kind = k;
      f.nm = SWK[k].n;
      delete f.hc;
    });
  }
  // ---------- 1) the road bosses, and a guard in each side clearing ----------
  const newWorldFoe = (kind, t, x, z, ex) => {
    const o = mkFoe(kind, t, 0);
    o.position.set(x, 0, z);
    S.add(o);
    const f = Object.assign({ o, t, kind, big: 0, hx: x, hz: z, w: null, wt: 0, dead: 0, rt: Infinity, tw: 0 }, ex);
    foes.push(f);
    foeSetup(f);
    return f;
  };
  const BOSS = [];
  ZRD.forEach((t) => {
    if (!t.n || t.i == null || !RB[t.i]) return;
    const i = t.i,
      R = RB[i],
      [lv, hp] = ZBL[t.zk] || [6, 480],
      f = newWorldFoe("rb" + i, 4, t.X, -ZSL - 1, { nm: R.n });
    f.boss = true;
    f.path = null;
    f.R = 5;
    f.ring.scale.setScalar(5);
    f.elite = null;
    if (f.au) f.au.visible = false;
    f.rbw = 1;
    f.rbi = i;
    f.bsp = { kind: "rb" + i, t: 4, boss: 1, nm: R.n, hp0: hp, lv, rbi: i, bsc: 1.05 };
    // v26b: stays put in its plaza (foeSetup may have nudged it toward the road)
    f.hx = t.X;
    f.hz = -ZSL - 1; // v32: inside its own battle circle (was -5, 16 behind the fight)
    f.o.position.set(f.hx, 0, f.hz);
    BOSS.push(f);
  });
  // v26b: some road bosses bring minions (standing beside them, like 32-bosses.js: f.mb = boss, f.msp = battle spec);
  // the rest are one-on-one duels. Appended after the bosses in a fixed order.
  const RBM = [
    [
      { kind: "wolf", t: 2, min: "cub", nm: "Rime Cub" },
      { kind: "wolf", t: 2, min: "cub", nm: "Rime Cub" },
    ],
    [
      { kind: "gnome", t: 3, hc: 0x6ab0ff, min: "rbm", nm: "Frost Gnome" },
      { kind: "gnome", t: 3, hc: 0x6ab0ff, min: "rbm", nm: "Frost Gnome" },
    ],
    [], // Runebound Sentinel: a duel
    [{ kind: "fgolem", t: 3, min: "rbm", nm: "Grumm's Pet Golem" }],
    [
      { kind: "gloom", t: 4, mt: 2, hc: 0xff6a2a, min: "ember", nm: "Emberling" },
      { kind: "gloom", t: 4, mt: 2, hc: 0xff6a2a, min: "ember", nm: "Emberling" },
    ],
    [], // Obsidian Gatekeeper: a duel
    [
      { kind: "lgolem", t: 4, min: "rbm", nm: "Slag Golem" },
      { kind: "lgolem", t: 4, min: "rbm", nm: "Slag Golem" },
    ],
    [
      { kind: "bogl", t: 2, min: "rbm", nm: "Granny's Gloomling" },
      { kind: "bogl", t: 2, min: "rbm", nm: "Granny's Gloomling" },
    ],
    [
      { kind: "skel", t: 3, min: "rbm", nm: "Drowned Choirboy" },
      { kind: "skel", t: 3, min: "rbm", nm: "Drowned Choirboy" },
    ],
    [], // Old Mossback: a duel
    [
      { kind: "mwisp", t: 2, min: "rbm", nm: "Lost Light" },
      { kind: "mwisp", t: 2, min: "rbm", nm: "Lost Light" },
      { kind: "mwisp", t: 2, min: "rbm", nm: "Lost Light" },
    ],
  ];
  const MOFF = [
    [-4, -1.5],
    [4, -1.5],
    [0, -6],
  ];
  const RMIN = [];
  BOSS.forEach((b) => {
    (RBM[b.rbi] || []).forEach((sp, k) => {
      const t = ZRD[b.rbi],
        m = newWorldFoe(sp.kind, Math.min(3, sp.t), t.X + MOFF[k][0], -ZSL + MOFF[k][1], { nm: sp.nm });
      if (sp.hc) m.hc = sp.hc;
      m.o.scale.multiplyScalar(0.85);
      m.s0 = m.o.scale.x;
      m.mb = b;
      m.msp = Object.assign({}, sp);
      m.min = sp.min;
      m.path = null;
      m.boss = false;
      m.elite = null;
      if (m.au) m.au.visible = false;
      RMIN.push(m);
    });
  });
  // minions come back with their boss, never on their own street timer
  setInterval(() => {
    if (typeof mode === "undefined" || mode !== "explore") return;
    const now = performance.now();
    RMIN.forEach((m) => {
      if (!m.dead) return;
      m.rt = Infinity;
      if (m.mb.dead || Math.hypot(W.position.x - m.hx, W.position.z - m.hz) < 25) return;
      m.dead = 0;
      m.pi = 0;
      m.o.position.set(m.hx, 0, m.hz);
      m.o.visible = true;
      if (m.s0) m.o.scale.setScalar(m.s0);
      S.add(m.o);
      m.cool = now + 2500;
      m.fade = 0;
    });
  }, 1000);
  const PKF = { frost: ["fgolem", 3], ember: ["lgolem", 4], marsh: ["bogm", 3] };
  ZRD.forEach((t) => {
    if (!t.n || !t.pk || !PKF[t.zk]) return;
    const [k, tt] = PKF[t.zk],
      sg = Math.sign(t.pk[0] - t.X - ZSA(t.i)) || 1,
      ex = NFK[k] ? { nm: NFK[k].n } : { nm: SWK[k].n };
    newWorldFoe(k, tt, t.pk[0] + sg * 3, t.pk[1] + 2, ex).pkg = 1;
  });
  // a road boss fight is the boss (its own spec) and whichever of its minions are standing, not the Cinder Fiend's
  const ga0 = gather;
  gather = function (f0) {
    if (f0 && f0.rbw) {
      const mins = RMIN.filter((m) => m.mb === f0 && !m.dead);
      return {
        cap: Math.max(2, 1 + mins.length),
        rein: 0,
        list: [f0].concat(mins),
        sp: [Object.assign({}, f0.bsp)].concat(mins.map((m) => Object.assign({}, m.msp))),
        bossHp: f0.bsp.hp0,
      };
    }
    return ga0(f0);
  };
  // v26b: a road boss fight happens in the middle of its plaza (not out on the road), lined up across the plaza so the
  // landmark stands behind the fight; and on any zone street the battle circle and pads sit above the plaza / clearing
  // ground (which used to hide them)
  const fr1 = frame;
  frame = function (f) {
    const b = f && (f.rbw ? f : f.mb && f.mb.rbw ? f.mb : null);
    if (!b) return fr1(f);
    // v32: 4 south of the plaza centre (v28 had 11: the circle hung off the plaza's south edge, 16 from the boss, and
    // the camera stood out on the road). The boss and its minions now stand inside the circle, the centrepieces (all at
    // 11+ north) stay clear behind it, and the camera stands in the plaza mouth looking straight at the landmark.
    const fr = { x: ZRD[b.rbi].X, z: -ZSL + 4, r: 0 }; // r 0: the battle camera stands south, looking at the landmark
    return ZSF.on ? zsFr(b.rbi, fr) : fr; // v43: in the street's moved frame
  };
  // v28: the battle circle, pads, target rings and foe/ally sigils win the depth test against the layered plaza and
  // clearing ground (those use polygon offsets up to about -7, which used to make the battlefield flicker or vanish)
  const ovl = (m) => {
    if (!m || !m.material) return;
    m.material.polygonOffset = true;
    m.material.polygonOffsetFactor = -14;
    m.material.polygonOffsetUnits = -40;
  };
  [RW, RT].forEach(ovl);
  RG.traverse(ovl);
  PG.traverse(ovl);
  if (typeof deco === "function") {
    const dc0 = deco;
    deco = function (e) {
      const r = dc0.apply(this, arguments);
      if (e && e.sig) ovl(e.sig);
      return r;
    };
  }
  const fi1 = fight;
  fight = function (f0) {
    const q = f0 && f0.o && f0.o.position,
      up = q && zsIdx(q.x, q.z) >= 0 ? 0.07 : 0;
    RG.position.y = up;
    PG.position.y = up;
    return fi1(f0);
  };
  // v26b: street foes re-dealt now the streets wind. The old deal (03 + 27) bunched them and 28's waypoints, 6 apart at
  // the old offset, cut the bends onto the sidewalks; some got no route at all and just stood. Each street's foes are
  // spread evenly from the arch to just short of the warden and the plaza, in alternating lanes 2.2 either side of the
  // centre line, and walk a dense route (a point every 3) that follows the curve. Fixed order, no randomness.
  {
    const ok = (p) => okp(p[0], p[1]) && !safe(p[0], p[1]) && clr(p[0], p[1]),
      at = (t, s, of) => {
        const [px, pz, hx, hz] = rdAt(t, s);
        return [OX + px - hz * of, OZ + pz + hx * of];
      };
    ZRD.forEach((t) => {
      if (!t.n) return;
      const list = foes
        .filter(
          (f) =>
            f.o &&
            !f.boss &&
            (!f.mb || f.cv) &&
            !f.rbw &&
            !f.pkg &&
            !f.tw &&
            f.dun == null &&
            zsIdx(f.hx, f.hz) === t.i &&
            Math.hypot(f.hx - t.pk[0], f.hz - t.pk[1]) > t.pk[2],
        )
        .map((f) => {
          const q = rdNear(t, f.hx - OX, f.hz - OZ);
          return [f, q ? q.s : 0];
        })
        .sort((a, b) => a[1] - b[1] || foes.indexOf(a[0]) - foes.indexOf(b[0]));
      if (!list.length) return;
      const s0 = 34,
        s1 = t.L - 40,
        sp = (s1 - s0) / list.length,
        half = Math.max(9, Math.min(26, sp * 1.1));
      list.forEach(([f], k) => {
        const s = s0 + sp * (k + 0.5),
          of = k % 2 ? 2.2 : -2.2,
          home = at(t, s, of);
        f.hx = home[0];
        f.hz = home[1];
        f.o.position.set(home[0], 0, home[1]);
        const pts = [];
        for (let u = Math.max(20, s - half); u <= Math.min(t.L - 34, s + half) + 0.01; u += 3) pts.push(at(t, u, of));
        let h = 0;
        pts.forEach((p, i) => {
          if (Math.hypot(p[0] - home[0], p[1] - home[1]) < Math.hypot(pts[h][0] - home[0], pts[h][1] - home[1])) h = i;
        });
        let i0 = h,
          i1 = h;
        while (i0 > 0 && ok(pts[i0 - 1])) i0--;
        while (i1 < pts.length - 1 && ok(pts[i1 + 1])) i1++;
        const run = pts.slice(i0, i1 + 1);
        if (run.length >= 3) {
          f.path = run.concat(run.slice(1, -1).reverse());
          f.pi = h - i0;
        } else f.path = [at(t, s - 4, of), at(t, s + 4, of)];
      });
    });
  }
  // the first win over each road boss: a trophy toast, and your school's monster card the first time you beat any of them
  const CARD = { pyre: "cwisp", gale: "cbogl", rime: "cskel", verdant: "cbogm", spirit: "cdrown" };
  const rw0 = reward;
  reward = function (list) {
    rw0(list);
    try {
      let any = 0;
      list.forEach((f) => {
        if (f.rbi == null || f.min) return;
        any = 1;
        if (!P.rdb) P.rdb = {};
        const first = !P.rdb[f.rbi];
        P.rdb[f.rbi] = (P.rdb[f.rbi] || 0) + 1;
        if (first) {
          P.gold += 60;
          toast("Road boss defeated: " + RB[f.rbi].n + "! +60 ✦", "#ffd34d");
          const k = CARD[P.cls];
          if (k && SPL[k] && !(P.lib && P.lib[k])) learn(k);
        }
      });
      if (any) {
        const now = performance.now();
        BOSS.forEach((b) => b.dead && b.rt < Infinity && (b.rt = Math.max(b.rt, now + 150000)));
        sv();
      }
    } catch (e) {}
  };
  // boss voice lines (the 32-bosses.js speech box only knows its own bosses)
  {
    let AC = null,
      box = null,
      tmr = 0,
      tok = 0,
      bid = null,
      said = {};
    const blip = (v) => {
      try {
        AC = AC || new (window.AudioContext || window.webkitAudioContext)();
        if (AC.state === "suspended") AC.resume();
        const t0 = AC.currentTime,
          o = AC.createOscillator(),
          gn = AC.createGain();
        o.type = v[1];
        o.frequency.setValueAtTime(v[0] * (0.85 + Math.random() * 0.4), t0);
        o.frequency.exponentialRampToValueAtTime(v[0] * (0.7 + Math.random() * 0.2), t0 + 0.07);
        gn.gain.setValueAtTime(0.0001, t0);
        gn.gain.exponentialRampToValueAtTime(0.07, t0 + 0.008);
        gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
        o.connect(gn).connect(AC.destination);
        o.start(t0);
        o.stop(t0 + 0.09);
      } catch (e) {}
    };
    const say = (name, txt, v) => {
      if (!box) {
        box = document.createElement("div");
        box.style.cssText =
          "position:fixed;left:50%;top:12%;transform:translateX(-50%);max-width:min(560px,92vw);z-index:60;" +
          "background:linear-gradient(180deg,rgba(18,30,36,.94),rgba(10,16,24,.94));border:2px solid #5fe0c0;" +
          "border-radius:14px;padding:10px 16px 12px;color:#e6fff8;font:600 16px/1.4 system-ui,sans-serif;" +
          "box-shadow:0 6px 28px rgba(0,0,0,.6),0 0 18px rgba(95,224,192,.3);cursor:pointer;transition:opacity .3s";
        box.onclick = () => {
          box.style.opacity = 0;
          document.body.classList.remove("bsay");
        };
        document.body.appendChild(box);
      }
      const my = ++tok;
      clearTimeout(tmr);
      document.body.classList.add("bsay"); // v30: the Primer card (16) steps aside while a boss speaks
      box.innerHTML = '<div style="color:#9fffe0;font-weight:800;margin-bottom:2px"></div><div></div>';
      box.firstChild.textContent = name;
      box.style.opacity = 1;
      const el = box.lastChild;
      let i = 0;
      (function type() {
        if (my !== tok) return;
        i++;
        el.textContent = txt.slice(0, i);
        const ch = txt[i - 1];
        if (i % 2 && /[a-z0-9]/i.test(ch || "")) blip(v);
        if (i < txt.length) setTimeout(type, /[.,!?]/.test(ch) ? 140 : 32);
        else
          tmr = setTimeout(() => {
            if (my !== tok) return;
            box.style.opacity = 0;
            document.body.classList.remove("bsay");
          }, 2800);
      })();
    };
    const pick = (a) => a[(Math.random() * a.length) | 0];
    setInterval(() => {
      if (typeof mode === "undefined" || mode !== "battle" || !g || !g.foes) return void (bid = null);
      const b = g.foes.find((f) => f.rbi != null && !f.min);
      if (!b) return;
      const L = RB[b.rbi];
      if (bid !== g.id) {
        bid = g.id;
        said = { t: performance.now() };
      }
      if (!said.a && performance.now() - said.t > 900) {
        said.a = 1;
        say(L.n, pick(L.a), L.v);
      } else if (said.a && !said.h && b.hp > 0 && b.hp < b.max * 0.5) {
        said.h = 1;
        say(L.n, pick(L.h), L.v);
      } else if (said.a && !said.d && b.hp <= 0) {
        said.d = 1;
        say(L.n, pick(L.d), L.v);
      }
    }, 150);
  }
  // ---------- 3) road wardens, road visits and the "Roads of ..." story quests ----------
  const NPCD = [
    {
      n: "Hunter Sigrid",
      ti: "Rimefang Row",
      sp: { robe: 0x6a7a90, trim: 0xe8f4ff, hat: "fur", hc: 0xd8ccb8, prop: "rod", skin: 0xf1c9a5 },
      l: [
        "Quiet. Hear that? Two growls, one beast. The Twin-Maw dens past this bend.",
        "One head watches while the other sleeps, so you'll never catch it napping. Fire makes both heads flinch.",
        "Bring it down and Rimefang Row is safe for the trappers again.",
      ],
    },
    {
      n: "Old Fisher Pell",
      ti: "Frozen Lake Way",
      sp: { robe: 0x4a5a7a, trim: 0xc8d8f0, hat: "cap", hc: 0x2a3a5a, prop: "rod", skin: 0xe8b898 },
      l: [
        "Forty years I've fished this lake. Then something started fishing back.",
        "It hides under the ice by the hut and comes up when you cut a hole. Lightning cracks it out of its shell.",
        "Do an old man a favour? I'd like my fishing holes back.",
      ],
    },
    {
      n: "Runereader Ylva",
      ti: "Rimestone Way",
      sp: { robe: 0x3a4a6a, trim: 0x8ad0ff, hat: "hood", hc: 0x2a3450, prop: "lamp", skin: 0xf6d8bc },
      l: [
        "The standing stones were a ward once, to keep the cold out. Now the cold keeps them.",
        "Their sentinel wakes for anything with a light. Growing things crack old stone: use roots, not storms.",
        "If you calm it, the ward may finally sleep.",
      ],
    },
    {
      n: "Musher Tobb",
      ti: "Sled Camp Lane",
      sp: { robe: 0x7a4a2a, trim: 0xe8dcc8, hat: "fur", hc: 0xb89a7a, prop: "hammer", skin: 0xd9a47a },
      l: [
        "Lost three sleds and a whole crate of jerky. Footprints the size of doors.",
        "That's Grumm. He's a yeti with a trapper's hat and a grudge against sleds. Not a bad sort, just... grabby.",
        "Warm him up a bit, if you take my meaning. Fire. Lots of it.",
      ],
    },
    {
      n: "Ashwalker Dunn",
      ti: "Crater Climb",
      sp: { robe: 0x5a3a2a, trim: 0xffb040, hat: "band", hc: 0xff7a2a, prop: "cane", skin: 0xb07a52 },
      l: [
        "Mind your boots, the ground here's warmer than it looks.",
        "Up by the crater lives Magmaw: a toad the size of a cart, full of lava and bad manners.",
        "Frost puts its fire out. Whatever you do, don't stand in front of it when it burps.",
      ],
    },
    {
      n: "Sentry Maro",
      ti: "Obsidian Gate Road",
      sp: { robe: 0x3a2a3a, trim: 0xff6a3a, hat: "cap", hc: 0x2a1a2a, prop: "rod", skin: 0xc89a7a },
      l: [
        "I was the last guard on this road. The Gatekeeper took my post. And my lunch.",
        "Its armour drinks fire. But lightning? Lightning runs right through plate.",
        "Open that gate, lamplighter. The road beyond should belong to the living.",
      ],
    },
    {
      n: "Kit the Apprentice",
      ti: "Ember Steps",
      sp: {
        robe: 0x6a3a22,
        trim: 0xffb040,
        hat: "band",
        hc: 0xd88a3a,
        apron: 0x4a3426,
        prop: "hammer",
        skin: 0xe8b898,
      },
      l: [
        "Master built the Colossus to work the great forge. Then the gloom got into its furnace.",
        "Now it thinks everything is metal. Including me. Including you.",
        "Cool its furnace with ice and it might stop. Please don't break it too badly. It was nice once.",
      ],
    },
    {
      n: "Hedge-girl Wynn",
      ti: "Witchway",
      sp: { robe: 0x4a5a3a, trim: 0xc8ff8a, hat: "hood", hc: 0x3a4a2a, prop: "cane", skin: 0xf1c9a5 },
      l: [
        "Granny Hollowroot was a kind witch. Then the gloom soured her soup, and her temper.",
        "She heals herself with old remedies, so hit hard. Her roots hate fire.",
        "And whatever she offers you to drink: don't.",
      ],
    },
    {
      n: "Brother Osric",
      ti: "Drowned Row",
      sp: { robe: 0x2a3a3a, trim: 0x5fe0c0, hat: "hood", hc: 0x1e2a2a, prop: "lamp", skin: 0xe8c8a8 },
      l: [
        "The chapel sank in a single night. The bellringer never left his rope.",
        "Now he tolls for the drowned, and every toll pulls at your spirit. Only living light can quiet him.",
        "Bring heal-magic, lamplighter. Let him rest.",
      ],
    },
    {
      n: "Keeper Lio",
      ti: "Shrine Walk",
      sp: { robe: 0x3a5a4a, trim: 0x9fffe8, hat: "cap", hc: 0x2a4a3a, prop: "lamp", skin: 0xd9a47a },
      l: [
        "The shrine is not ON the turtle. The shrine IS the turtle. Old Mossback has carried it for centuries.",
        "The gloom made him grumpy. He hides in his shell and heals with moss. Storms rattle him out.",
        "Be gentle if you can. He's older than Duskwick.",
      ],
    },
    {
      n: "Lamplighter Ansel",
      ti: "Lantern Bog",
      sp: { robe: 0x2a3a6a, trim: 0xffd27a, hat: "cap", hc: 0x1a2a4a, prop: "lamp", skin: 0xe8b898 },
      l: [
        "Another lamplighter! Thank the Ember. I followed a light into the bog and lost my way for a week.",
        "The Lantern Mother hangs every lost light she catches in that tree. Mine almost joined them.",
        "Ice dims her lanterns. Her spirit-tricks won't work on spirit-folk. Good luck.",
      ],
    },
  ];
  const nearL = [
    "The road's still dangerous at its end. Watch yourself.",
    "You've walked this road. Thank you, lamplighter.",
  ];
  NPCD.forEach((d, i) => {
    const t = ZRD[i];
    if (!t || !t.n) return;
    NNAME["r" + i] = [d.n, d.ti];
    const x = t.X - 6.6,
      z = -ZSL + 30,
      o = person(d.sp),
      mkr = new T.Sprite(AM(SP.heal));
    mkr.scale.setScalar(1.3);
    mkr.position.y = 4.2;
    o.add(mkr);
    o.position.set(x, 0, z);
    o.rotation.y = PI / 2;
    S.add(o);
    solids.push({ x, z, r: 1.0 });
    const n = { o, kind: "r", id: i, rd: i, mkr, x, z, ry: PI / 2 };
    NPCS.push(n);
    npcPlate(n);
  });
  // the talk box for road wardens (NPC kind "r" has no Book panel: panel(undefined) is caught here)
  let dl = null;
  function rdTalk(n) {
    const d = NPCD[n.rd],
      first = !(P.rdt && P.rdt[n.rd]),
      lines = first ? d.l.slice() : [P.rdb && P.rdb[n.rd] ? nearL[1] : d.l[1]];
    if (!dl) {
      dl = document.createElement("div");
      dl.style.cssText =
        "position:fixed;left:50%;bottom:14%;transform:translateX(-50%);width:min(560px,92vw);z-index:65;" +
        "background:linear-gradient(180deg,rgba(40,30,18,.96),rgba(20,14,10,.96));border:2px solid #c9a24a;" +
        "border-radius:14px;padding:12px 16px;color:#fff6dc;font:600 16px/1.45 system-ui,sans-serif;cursor:pointer;" +
        "box-shadow:0 6px 28px rgba(0,0,0,.6)";
      document.body.appendChild(dl);
    }
    let k = 0;
    const show = () => {
      dl.innerHTML =
        '<div style="color:#ffd27a;font-weight:800"></div><div style="font-size:12px;color:#c8b890;margin-bottom:4px"></div>' +
        '<div></div><div style="text-align:right;font-size:12px;color:#c8b890;margin-top:6px"></div>';
      dl.children[0].textContent = d.n;
      dl.children[1].textContent = d.ti + " warden";
      dl.children[2].textContent = lines[k];
      dl.children[3].textContent = k < lines.length - 1 ? "click to continue ▸" : "click to close";
    };
    show();
    dl.style.display = "block";
    paused = true;
    dl.onclick = () => {
      k++;
      if (k < lines.length) return show();
      dl.style.display = "none";
      paused = false;
      talkN = null;
      if (first) {
        P.rdt = P.rdt || {};
        P.rdt[n.rd] = 1;
        P.gold += 25;
        toast("+25 ✦ for listening to " + d.n, "#ffd34d");
        visit(n.rd);
        sv();
      }
    };
  }
  const pn0 = panel;
  panel = function (k, id) {
    if (k === undefined && talkN && talkN.rd != null) return rdTalk(talkN);
    return pn0.apply(this, arguments);
  };
  // reaching a street's end plaza (or talking to its warden) counts as walking it
  const zoneOf = (zk) => ZRD.filter((t) => t.n && t.zk === zk);
  const ZNM = { frost: "Frostfen", ember: "the Cinderwaste", marsh: "Mirewick" };
  function visit(i) {
    if (!P.rdv) P.rdv = {};
    if (P.rdv[i]) return;
    P.rdv[i] = 1;
    const zk = ZSTR[i][0],
      all = zoneOf(zk),
      n = all.filter((t) => P.rdv[t.i]).length;
    toast("Road walked: " + ZSTR[i][1] + " (" + n + "/" + all.length + " in " + ZNM[zk] + ")", "#9fffe0");
    try {
      qchk();
    } catch (e) {}
    sv();
  }
  setInterval(() => {
    if (typeof SLOT === "undefined" || SLOT < 0 || typeof mode === "undefined" || mode !== "explore") return;
    const p = W.position,
      si = zsIdx(p.x, p.z);
    const c = zsP(ZSX0 + si * ZSDX, -ZSL); // v43: the plaza wherever the street stands
    if (si >= 0 && Math.hypot(p.x - c[0], p.z - c[1]) < ZCR + 3) visit(si);
  }, 500);
  // the quests (appended to QS: never reorder) and the story steps that now wait on them
  const RQ = [
    { zk: "frost", req: [10], gate: 12, ch: 2, n: "Roads of Frostfen" },
    { zk: "ember", req: [12], gate: 3, ch: 3, n: "Roads of the Cinderwaste" },
    { zk: "marsh", req: [7], gate: 14, ch: -1, n: "Roads of Mirewick" },
  ];
  const RQS = {
    frost: [
      "Frostfen has four roads out through the arches, and something nasty waits at the end of every one.",
      "Walk each of them to its end. The road wardens will tell you what lives there.",
      "I won't send you down the Ashen Trail until you know this land. - Brenna",
    ],
    ember: [
      "The Cinderwaste's three roads all climb toward something burning.",
      "Walk them to the end, every one. Learn the ash before you face the Fiend.",
      "- Vesna",
    ],
    marsh: [
      "Mirewick's four roads wind deep into the bog. Folk have been lost on every one.",
      "Walk them all to their ends, dearie. Then the last stone of the Gloomspire will make sense.",
      "- Old Maud",
    ],
  };
  const RQD = {
    frost: "You've walked all of Frostfen. Now the Ashen Trail.",
    ember: "Every road in the ash. You're ready for the Fiend.",
    marsh: "Back from every road, and all your toes still on. Well done, dearie.",
  };
  RQ.forEach((r) => {
    const all = zoneOf(r.zk),
      i =
        QS.push({
          n: r.n,
          d: "Reach the end of every road in " + ZNM[r.zk] + " (" + all.length + ")",
          st: () => all.filter((t) => P.rdv && P.rdv[t.i]).length,
          k: all.length,
          abs: 1,
          g: 80,
          x: 90,
          z: r.zk,
          m: 1,
          req: r.req,
          s: RQS[r.zk].slice(0, 2).join(" "),
        }) - 1;
    r.qi = i;
    STORY[i] = RQS[r.zk];
    SDONE[i] = RQD[r.zk];
    if (QS[r.gate]) QS[r.gate].req = (QS[r.gate].req || []).concat([i]);
    if (r.ch >= 0 && STCH[r.ch]) STCH[r.ch][2].splice(STCH[r.ch][2].length - 1, 0, i);
    else STCH.push(["Mirewick", "Lv 6+", [i]]);
  });
  // the quest arrow points at the nearest road of that zone you haven't walked yet
  setInterval(() => {
    if (typeof SLOT === "undefined" || SLOT < 0) return;
    RQ.forEach((r) => {
      const t = zoneOf(r.zk).find((q) => !(P.rdv && P.rdv[q.i])) || zoneOf(r.zk)[0];
      if (t) QPOS[r.qi] = [t.zk].concat(zsP(t.X, -ZSL + 18)); // v43: wherever the street stands
    });
  }, 1000);
  // ---------- 4) scenery (after BASE: these scene children never shift saved editor builds) ----------
  let sd = 4471;
  const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647,
    rr2 = (a, b) => a + rn() * (b - a);
  const HOLD = []; // [group, x, z, radius]
  const holder = (x, z, r) => {
    const h = new T.Group();
    S.add(h);
    HOLD.push([h, x, z, r]);
    return h;
  };
  const vp = (t, s, of) => {
    const [px, pz, hx, hz] = rdAt(t, s);
    return [OX + px - hz * of, OZ + pz + hx * of, hx, hz];
  };
  const instTo = (h, geo, col, list, em) => {
    const m = inst(geo, col, list, em);
    if (m) {
      S.remove(m);
      h.add(m);
    }
    return m;
  };
  const flatMat = (c, em) => {
    const m = M(c, 1);
    m.polygonOffset = true;
    m.polygonOffsetFactor = -3;
    m.polygonOffsetUnits = -3;
    if (em) m.emissive.setHex(em);
    return m;
  };
  const disc = (h, r, c, x, y, z, em) => {
    const m = new T.Mesh(new T.CircleGeometry(r, 32), flatMat(c, em));
    m.rotation.x = -PI / 2;
    m.position.set(x, y, z);
    h.add(m);
    return m;
  };
  const glowAt = (h, c, s, x, y, z) => gsp(h, c, s, x, y, z);
  // a weeping willow (one baked child)
  function willow(h, x, z, s, ry) {
    const o = new T.Group(),
      u = { gm: [] };
    rot(part(u, o, Cy(0.35, 0.6, 4.2, 7), 0x3a2f28, 0, 2.1, 0), 0, 0, 0.12);
    rot(part(u, o, Cy(0.18, 0.3, 2.2, 6), 0x3a2f28, 0.9, 4.3, 0), 0, 0, -0.6);
    rot(part(u, o, Cy(0.16, 0.28, 2, 6), 0x3a2f28, -0.7, 4.4, 0.3), 0, 0, 0.7);
    part(u, o, Sp(2.6, 10), 0x3d5a2c, 0.2, 5.4, 0).scale.set(1.2, 0.6, 1.2);
    part(u, o, Sp(2.0, 9), 0x4a6a34, -0.6, 5.9, 0.4).scale.set(1.1, 0.55, 1.1);
    for (let k = 0; k < 22; k++) {
      const a = (k / 22) * 6.283,
        r = 2.2 + (k % 3) * 0.5,
        L = 2.6 + (k % 4) * 0.6;
      part(
        u,
        o,
        B(0.12, L, 0.5),
        k % 2 ? 0x5a7a3a : 0x4a6a30,
        Math.cos(a) * r,
        5.2 - L / 2,
        Math.sin(a) * r,
      ).rotation.y = -a;
    }
    o.position.set(x, 0, z);
    o.rotation.y = ry || 0;
    o.scale.setScalar(s || 1);
    h.add(bake(o));
  }
  // a pond: teal water, a reed rim and lily pads (flat; sits outside walkable ground unless noted)
  function pond(h, x, z, r, lil) {
    disc(h, r + 0.8, 0x2a3a24, x, 0.03, z);
    disc(h, r, 0x2f8a7a, x, 0.05, z, 0x0a3a30);
    const L = [],
      Rd = [];
    for (let k = 0; k < (lil || 6); k++) {
      const a = rn() * 6.283,
        d = rn() * r * 0.8;
      L.push([x + Math.cos(a) * d, 0.07, z + Math.sin(a) * d, rr2(0.5, 1), rn() * 6]);
    }
    for (let k = 0; k < r * 5; k++) {
      const a = rn() * 6.283;
      Rd.push([
        x + Math.cos(a) * (r + rr2(-0.2, 0.6)),
        0.6,
        z + Math.sin(a) * (r + rr2(-0.2, 0.6)),
        1,
        0,
        0,
        1,
        rr2(0.8, 1.6),
        1,
      ]);
    }
    instTo(h, Cy(0.5, 0.5, 0.03, 10), 0x4a8a3a, L);
    instTo(h, Cy(0.04, 0.06, 1.2, 4), 0x7a8a3a, Rd);
    if (lil)
      instTo(
        h,
        Sp(0.12, 6),
        0xffb0d8,
        L.slice(0, 3).map((q) => [q[0] + 0.15, 0.12, q[2], 1]),
        0x5a2a4a,
      );
  }
  // a burned-out house (one baked child): broken charred walls, fallen roof beams, a lone chimney, embers
  function ruin(h, x, z, ry, s) {
    const o = new T.Group(),
      u = { gm: [] },
      ch = 0x2a2220,
      ch2 = 0x3a302a,
      W2 = 6,
      D2 = 5;
    part(u, o, B(W2 + 0.6, 0.35, D2 + 0.6), 0x4a3a34, 0, 0.17, 0);
    // walls: back full-ish, sides broken, front with a door gap
    [
      [0, -D2 / 2, W2, 2.8, 0],
      [-W2 / 2, -0.8, 3.2, 2.2, 1],
      [-W2 / 2, 1.7, 1.6, 1.1, 1],
      [W2 / 2, -1.2, 2.4, 1.5, 1],
      [-2.0, D2 / 2, 2.0, 2.4, 0],
      [2.2, D2 / 2, 1.6, 1.2, 0],
    ].forEach(([px, pz, L, hh, sdw], k) => {
      part(u, o, sdw ? B(0.35, hh, L) : B(L, hh, 0.35), k % 2 ? ch : ch2, px, hh / 2 + 0.3, pz);
      part(u, o, sdw ? B(0.4, 0.2, L * 0.7) : B(L * 0.7, 0.2, 0.4), 0x1a1414, px, hh + 0.35, pz);
    });
    part(u, o, B(1, 4.6, 1), 0x4a3a34, W2 / 2 - 0.8, 2.6, -D2 / 2 + 0.6);
    part(u, o, B(1.15, 0.3, 1.15), 0x2a2220, W2 / 2 - 0.8, 4.95, -D2 / 2 + 0.6);
    [
      [-0.5, 1.2, 0.5, 0.9, 0.4],
      [1.0, 0.8, -0.6, -0.7, 1.4],
      [-1.6, 0.6, -1.0, 0.3, -0.2],
    ].forEach(([px, py, pz, rx, ryy]) => rot(part(u, o, B(0.3, 0.3, 6.5), 0x1a1210, px, py, pz), rx * 0.4, ryy, 0.3));
    for (let k = 0; k < 6; k++)
      part(u, o, B(0.3, 0.12, 0.3), 0xff7a2a, -2 + (k % 3) * 1.6, 0.4, -1 + Math.floor(k / 3) * 1.8, 0xff4a0a, 1.3);
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    o.scale.setScalar(s || 1);
    h.add(bake(o));
    const c = Math.cos(ry),
      sn = Math.sin(ry);
    [
      [-1, -0.5],
      [1.6, 1.3],
    ].forEach(([lx, lz]) => glowAt(h, 0xff7a3a, 2.4, x + lx * c + lz * sn, 0.8, z - lx * sn + lz * c));
    const sm = new T.Sprite(
      new T.SpriteMaterial({ map: GLT, color: 0x2a2224, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    sm.scale.set(5, 7, 1);
    sm.position.set(x + (W2 / 2 - 0.8) * c * (s || 1), 7.5, z - (W2 / 2 - 0.8) * sn * (s || 1));
    h.add(sm);
  }
  // an ice formation (one baked child)
  function iceSpires(h, x, z, s) {
    const o = new T.Group(),
      u = { gm: [] };
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * 6.283,
        hh = 2 + (k % 3) * 1.4;
      rot(
        part(
          u,
          o,
          Cn(0.5 + (k % 2) * 0.3, hh, 5),
          0xbfe8ff,
          Math.cos(a) * 1.3,
          hh / 2,
          Math.sin(a) * 1.3,
          0x2a6aa8,
          0.4,
        ),
        Math.sin(a) * 0.3,
        0,
        -Math.cos(a) * 0.3,
      );
    }
    rot(part(u, o, Cn(0.9, 5, 6), 0xdff4ff, 0, 2.5, 0, 0x2a6aa8, 0.5), 0, 0.3, 0);
    o.position.set(x, 0, z);
    o.scale.setScalar(s || 1);
    h.add(bake(o));
    glowAt(h, 0x8ad0ff, 5, x, 2.5, z);
  }
  const GRC = { frost: 0xe6ecf6, ember: 0x2e2224, marsh: 0x3e4a32 },
    DRT = { frost: 0xc8d0e0, ember: 0x5a4440, marsh: 0x5a5a3a };
  const FF = []; // particle clouds: {pts, base, n, c: [x, z], r, k (0 fireflies, 1 embers)}
  function cloud(h, cx, cz, list, col, kind) {
    const n = list.length,
      geo = new T.BufferGeometry(),
      pos = new Float32Array(n * 3);
    list.forEach((p, k) => pos.set(p, k * 3));
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    const pts = new T.Points(
      geo,
      new T.PointsMaterial({
        map: GLT,
        color: col,
        size: kind ? 0.55 : 0.7,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    pts.frustumCulled = false;
    h.add(pts);
    FF.push({ pts, base: pos.slice(), n, ph: list.map(() => rn() * 6.283), kind });
  }
  ZRD.forEach((t) => {
    if (!t.n) return;
    const zk = t.zk,
      sg = Math.sign(t.pk[0] - t.X - ZSA(t.i)) || 1,
      h = holder(t.X, -ZSL / 2, 260);
    // v43: built at the old street coords; OPENR.move (64) turns the holder into the street's moved frame and sets
    // userData.zc = the centre the distance cull below reads
    h.userData.zsi = t.i;
    // rolling hills beyond the trees, and a ridge further out
    const HL = [];
    for (let s = 14; s < t.L - 20; s += rr2(16, 26))
      [-1, 1].forEach((side) => {
        const far = rn() < 0.5,
          of = far ? rr2(72, 96) : rr2(36, 60),
          sx = far ? rr2(16, 28) : rr2(7, 14),
          sy = far ? rr2(6, 13) : rr2(2, 5.5),
          [x, z] = vp(t, s, side * of),
          q = rdNear(t, x - OX, z - OZ);
        if (q && q.d < RDW + sx + 3) return;
        if (Math.hypot(x - t.pk[0], z - t.pk[1]) < t.pk[2] + sx + 3) return;
        if (Math.hypot(x - t.X, z + ZSL) < ZCR + sx + 8) return;
        HL.push([x, -sy * 0.3, z, 1, rn() * 3, 0, sx, sy, sx * rr2(0.7, 1.3)]);
      });
    instTo(h, Sp(1, 14), GRC[zk], HL);
    if (zk === "frost")
      instTo(
        h,
        Sp(1, 10),
        0xffffff,
        HL.filter((q) => q[7] > 4).map((q) => [
          q[0],
          q[1] + q[7] * 0.55,
          q[2],
          1,
          q[4],
          0,
          q[6] * 0.55,
          q[7] * 0.5,
          q[8] * 0.55,
        ]),
      );
    // the side clearing
    const [px, pz, r] = t.pk;
    disc(h, r + 0.5, DRT[zk], px, 0.068, pz);
    const fx = px + sg * 6.5;
    if (zk === "frost") {
      iceSpires(h, px + sg * (r + 3.5), pz - 2, 1.1);
      disc(h, 3.2, 0xbfe4f8, px - sg * 1, 0.08, pz - 3, 0x1a3a5a);
      const o = new T.Group(),
        u = { gm: [] };
      [0, 1, 2, 3].forEach((k) =>
        part(u, o, new T.DodecahedronGeometry(0.7 - k * 0.12), 0x8a94a8, 0, 0.5 + k * 0.85, 0),
      );
      o.position.set(fx, 0, pz + 5);
      h.add(bake(o));
      solids.push({ x: fx, z: pz + 5, r: 0.9 });
    } else if (zk === "ember") {
      ruin(h, px + sg * (r - 3.5), pz - 1, sg > 0 ? -PI / 2 : PI / 2, 0.9);
      solids.push({ x: px + sg * (r - 3.5), z: pz - 1, r: 3.4 });
      disc(h, 2.5, 0xff6a1a, px - sg * 2, 0.08, pz + 4, 0xff3a0a);
      glowAt(h, 0xff7a3a, 4, px - sg * 2, 0.6, pz + 4);
    } else {
      pond(h, px + sg * 3, pz - 2, 4.2, 8);
      willow(h, px + sg * (r + 3), pz + 4, 1, rn() * 6);
      // a short boardwalk across the pond's near edge
      const o = new T.Group(),
        u = { gm: [] };
      for (let k = 0; k < 7; k++) part(u, o, B(2.2, 0.12, 0.5), 0x6b4a2b, 0, 0.12, -1.8 + k * 0.6);
      o.position.set(px + sg * 0.5, 0, pz - 2);
      h.add(bake(o));
    }
    // zone-specific roadside pieces
    if (zk === "ember") {
      [0.22, 0.5, 0.78].forEach((fr, k) => {
        const side = k % 2 ? 1 : -1,
          [x, z, hx, hz] = vp(t, t.L * fr, side * 25),
          q = rdNear(t, x - OX, z - OZ);
        if (q && q.d < 18) return;
        ruin(h, x, z, Math.atan2(side * hz, -side * hx), rr2(0.9, 1.15)); // front (+z) toward the road
      });
      const E = [];
      for (let k = 0; k < 140; k++) {
        const [x, z] = vp(t, rn() * t.L, rr2(-30, 30));
        E.push([x, rr2(0, 9), z]);
      }
      cloud(h, t.X, -ZSL / 2, E, 0xff8a3a, 1);
    } else if (zk === "marsh") {
      for (let s = 30; s < t.L - 30; s += rr2(34, 50)) {
        const side = rn() < 0.5 ? -1 : 1,
          [x, z] = vp(t, s, side * rr2(17, 22)),
          q = rdNear(t, x - OX, z - OZ);
        if (!q || q.d > 15) willow(h, x, z, rr2(0.8, 1.15), rn() * 6);
        const [x2, z2] = vp(t, s + 15, -side * rr2(22, 30)),
          q2 = rdNear(t, x2 - OX, z2 - OZ);
        if (!q2 || q2.d > 18) pond(h, x2, z2, rr2(3, 5.5), 6);
      }
      const F = [];
      for (let k = 0; k < 160; k++) {
        const [x, z] = vp(t, rn() * t.L, rr2(-26, 26));
        F.push([x, rr2(0.6, 4), z]);
      }
      for (let k = 0; k < 30; k++) F.push([px + rr2(-r, r), rr2(0.6, 3), pz + rr2(-r, r)]);
      cloud(h, t.X, -ZSL / 2, F, 0xc8ff6a, 0);
    } else {
      const F = [];
      for (let k = 0; k < 120; k++) {
        const [x, z] = vp(t, rn() * t.L, rr2(-30, 30));
        F.push([x, rr2(0, 10), z]);
      }
      cloud(h, t.X, -ZSL / 2, F, 0xeaf4ff, 2);
    }
  });
  // Mirewick village: willows and ponds round the outside of its wall, lanterns and puddles inside, fireflies
  {
    const [cx, cz] = ZCEN.marsh,
      h = holder(cx, cz, 220),
      gates = ZRD.filter((t) => t.n && t.zk === "marsh").map((t) => Math.atan2(t.mo[1], t.mo[0])),
      open = (a, w) =>
        gates.some((q) => Math.abs(Math.atan2(Math.sin(a - q), Math.cos(a - q))) < w) ||
        Math.abs(Math.atan2(Math.sin(a - PI), Math.cos(a - PI))) < w + 0.1,
      clear = (x, z, r) => clr(x, z, r) && !trOn(x, z, RDW + 3);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * 6.283 + rr2(-0.1, 0.1);
      if (open(a, 0.32)) continue;
      const r = rr2(56, 68),
        x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r;
      if (clear(x, z, 3)) willow(h, x, z, rr2(1, 1.35), rn() * 6);
      const a2 = a + 0.2,
        r2 = rr2(70, 86),
        x2 = cx + Math.cos(a2) * r2,
        z2 = cz + Math.sin(a2) * r2;
      if (k % 2 === 0 && clear(x2, z2, 6) && !open(a2, 0.3)) pond(h, x2, z2, rr2(4, 7), 9);
    }
    // inside: lantern posts on the rim (glow sprites only) and shallow puddles with lily pads
    const LP = [];
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * 6.283 + 0.13;
      if (open(a, 0.28)) continue;
      const x = cx + Math.cos(a) * 36.5,
        z = cz + Math.sin(a) * 36.5;
      if (!clr(x, z, 1.5)) continue;
      LP.push([x, z]);
      solids.push({ x, z, r: 0.35 });
      glowAt(h, 0x9affc8, 2.6, x, 3.3, z);
    }
    instTo(
      h,
      Cy(0.1, 0.13, 3.4, 6),
      0x2a2438,
      LP.map(([x, z]) => [x, 1.7, z, 1]),
    );
    instTo(
      h,
      B(0.42, 0.55, 0.42),
      0x9fffe0,
      LP.map(([x, z]) => [x, 3.3, z, 1]),
      0x2aa88a,
    );
    instTo(
      h,
      Cn(0.36, 0.3, 4),
      0x2a2438,
      LP.map(([x, z]) => [x, 3.75, z, 1, PI / 4]),
    );
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * 6.283 + 0.4,
        r = rr2(24, 32),
        x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r;
      if (open(a, 0.3) || !clr(x, z, 3)) continue;
      disc(h, 2.2, 0x2f8a7a, x, 0.04, z, 0x0a3a30);
      instTo(
        h,
        Cy(0.45, 0.45, 0.03, 10),
        0x4a8a3a,
        [0, 1, 2].map((j) => [x + rr2(-1.3, 1.3), 0.06, z + rr2(-1.3, 1.3), 1]),
      );
    }
    // low mist
    for (let k = 0; k < 14; k++) {
      const a = rn() * 6.283,
        r = rr2(10, 70),
        sm = new T.Sprite(
          new T.SpriteMaterial({ map: GLT, color: 0x6a9a8a, transparent: true, opacity: 0.18, depthWrite: false }),
        );
      sm.scale.set(rr2(14, 24), 3, 1);
      sm.position.set(cx + Math.cos(a) * r, 0.8, cz + Math.sin(a) * r);
      h.add(sm);
    }
    const F = [];
    for (let k = 0; k < 260; k++) {
      const a = rn() * 6.283,
        r = Math.sqrt(rn()) * 85;
      F.push([cx + Math.cos(a) * r, rr2(0.6, 5), cz + Math.sin(a) * r]);
    }
    cloud(h, cx, cz, F, 0xc8ff6a, 0);
  }
  // fireflies wander, embers rise, snow drifts down; groups far from the camera are hidden
  {
    const now0 = performance.now();
    (function tick() {
      requestAnimationFrame(tick);
      const cp = C.position,
        s = (performance.now() - now0) / 1000;
      HOLD.forEach(([q, x, z, r]) => {
        const zc = q.userData.zc; // v43: moved street holder
        q.visible = zc ? Math.hypot(cp.x - zc[0], cp.z - zc[1]) < r + 200 : Math.hypot(cp.x - x, cp.z - z) < r + 200;
      });
      FF.forEach((c) => {
        if (!c.pts.parent || !c.pts.parent.visible) return;
        const a = c.pts.geometry.attributes.position,
          A = a.array,
          b = c.base;
        for (let k = 0; k < c.n; k++) {
          const o = k * 3,
            p = c.ph[k];
          if (c.kind === 0) {
            A[o] = b[o] + Math.sin(s * 0.5 + p) * 1.6;
            A[o + 1] = b[o + 1] + Math.sin(s * 0.9 + p * 2) * 0.6;
            A[o + 2] = b[o + 2] + Math.cos(s * 0.4 + p) * 1.6;
          } else if (c.kind === 1) {
            A[o] = b[o] + Math.sin(s * 0.7 + p) * 0.8;
            A[o + 1] = (b[o + 1] + s * (0.8 + (p % 1))) % 10;
            A[o + 2] = b[o + 2] + Math.cos(s * 0.6 + p) * 0.8;
          } else {
            A[o] = b[o] + Math.sin(s * 0.3 + p) * 1.2;
            A[o + 1] = 10 - ((10 - b[o + 1] + s * (0.6 + (p % 1) * 0.5)) % 10);
            A[o + 2] = b[o + 2] + Math.cos(s * 0.5 + p) * 1.2;
          }
        }
        a.needsUpdate = true;
        if (c.kind === 0) c.pts.material.opacity = 0.75 + 0.25 * Math.sin(s * 3);
      });
    })();
  }
  // ---------- 5) monster-summon cards ----------
  const CS = {
    cwisp: {
      n: "Wisp Swarm",
      c: 3,
      t: "Will-o'-Wisps sweep through: 22 fire to all foes, Burn 1",
      a: "fire",
      cl: "pyre",
      aoe: 1,
      mk: "mwisp",
      col: 0xbaff6a,
      cc: "#baff6a",
    },
    cbogl: {
      n: "Gloomling Ambush",
      c: 3,
      t: "A Bog Gloomling leaps out: 48 storm damage, may stun",
      a: "storm",
      cl: "gale",
      mk: "bogl",
      col: 0xffe066,
      cc: "#ffe066",
    },
    cskel: {
      n: "Skeleton Charge",
      c: 3,
      t: "A Mire Skeleton charges: 44 ice damage, Chill 2",
      a: "ice",
      cl: "rime",
      mk: "skel",
      col: 0x8fe0ff,
      cc: "#8fe0ff",
    },
    cbogm: {
      n: "Call the Bog Monster",
      c: 3,
      t: "The Bog Monster slams: 40 damage, heals your party 12",
      a: "heal",
      cl: "verdant",
      mk: "bogm",
      col: 0x8dffa8,
      cc: "#8dffa8",
    },
    cdrown: {
      n: "Raise the Drowned",
      c: 3,
      t: "Drowned skeletons rise: 26 spirit to all foes, +4 per ally",
      a: "spirit",
      cl: "spirit",
      aoe: 1,
      mk: "skel",
      col: 0xc9a0ff,
      cc: "#c9a0ff",
    },
  };
  Object.keys(CS).forEach((k) => {
    const c = CS[k];
    SPL[k] = { n: c.n, c: c.c, t: c.t, a: c.a, ty: "atk", lv: 5, cl: c.cl };
    if (c.aoe) SPL[k].aoe = 1;
    CCOL[k] = c.cc;
  });
  Object.assign(CDMG, {
    cwisp: () => 22,
    cbogl: () => 48,
    cskel: () => 44,
    cbogm: () => 40,
    cdrown: (n, al) => 26 + 4 * al,
  });
  // card pictures: the monster's silhouette over the attack burst
  const sil = {
    mwisp: (x, c) => {
      x.fillStyle = c;
      x.beginPath();
      x.moveTo(0, -42);
      x.quadraticCurveTo(26, -6, 16, 18);
      x.quadraticCurveTo(0, 30, -16, 18);
      x.quadraticCurveTo(-26, -6, 0, -42);
      x.fill();
      x.fillStyle = "#101018";
      [-7, 7].forEach((e) => {
        x.beginPath();
        x.arc(e, 2, 4, 0, 7);
        x.fill();
      });
    },
    bogl: (x, c) => {
      x.fillStyle = "#2f4a2a";
      x.beginPath();
      x.ellipse(0, 12, 26, 22, 0, 0, 7);
      x.fill();
      x.beginPath();
      x.ellipse(0, -10, 24, 16, 0, 0, 7);
      x.fill();
      x.strokeStyle = "#2f4a2a";
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(0, -24);
      x.quadraticCurveTo(10, -46, 22, -40);
      x.stroke();
      x.fillStyle = c;
      x.beginPath();
      x.arc(22, -40, 6, 0, 7);
      x.fill();
      x.fillStyle = "#d8ff5a";
      [-9, 9].forEach((e) => {
        x.beginPath();
        x.arc(e, -12, 4, 0, 7);
        x.fill();
      });
      x.fillStyle = "#0a0a08";
      x.fillRect(-14, -3, 28, 3);
    },
    skel: (x, c) => {
      x.fillStyle = "#e8e0c8";
      x.beginPath();
      x.arc(0, -26, 14, 0, 7);
      x.fill();
      x.fillRect(-6, -14, 12, 6);
      for (let i = 0; i < 4; i++) x.fillRect(-14 + i * 1.5, -4 + i * 8, 28 - i * 3, 3);
      x.fillRect(-2, -8, 4, 40);
      x.fillStyle = c;
      [-5, 5].forEach((e) => {
        x.beginPath();
        x.arc(e, -27, 3.5, 0, 7);
        x.fill();
      });
    },
    bogm: (x, c) => {
      x.fillStyle = "#3d4a2c";
      x.beginPath();
      x.ellipse(0, 6, 34, 30, 0, 0, 7);
      x.fill();
      x.fillRect(-46, -2, 14, 34);
      x.fillRect(32, -2, 14, 34);
      x.strokeStyle = "#8a9a4a";
      x.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        x.beginPath();
        x.moveTo(-12 + i * 6, -22);
        x.lineTo(-16 + i * 8, -40);
        x.stroke();
      }
      x.fillStyle = "#ffd84a";
      [-11, 11].forEach((e) => {
        x.beginPath();
        x.arc(e, -4, 5, 0, 7);
        x.fill();
      });
    },
  };
  Object.keys(CS).forEach((k) => {
    const c = CS[k];
    CARTX[k] = (x) => {
      x.save();
      sil[c.mk](x, c.cc);
      if (k === "cdrown") {
        x.translate(24, 10);
        x.scale(0.6, 0.6);
        sil.skel(x, c.cc);
      }
      x.restore();
    };
    try {
      ART[k] = cardArt(k).toDataURL();
    } catch (e) {}
  });
  // the monster appears on a rune by your pad, charges each target in turn, strikes, and fades out
  async function sumAtk(kind, list, el, col, hit) {
    const par = FXP,
      p0 = new T.Vector3(SLA[0][0] + 0.9, 0, SLA[0][1] + 1.3),
      m = mkFoe(kind, 2, 0),
      sc = kind === "bogm" ? 0.85 : 1;
    m.position.copy(p0);
    m.scale.setScalar(0.01);
    // v34 fix: only tint materials that have an emissive (contact shadows / glow sprites added by later files use
    // MeshBasicMaterial; calling emissive.setHex on them threw and left the battle stuck on "busy")
    if (kind === "skel" && el === "spirit")
      m.traverse((q) => {
        if (q.isMesh && q.material && !Array.isArray(q.material) && q.material.emissive) {
          q.material = q.material.clone();
          q.material.emissive.setHex(0x5a2a9a);
          q.material.emissiveIntensity = 0.6;
        }
      });
    par.add(m);
    try {
      await sumRun(m, kind, list, el, col, hit, sc, p0);
    } catch (e) {
      // never leave the turn hanging: land any hits that didn't happen, then clean up
      console.warn("summon card", kind, e);
      if (hit) list.forEach((f) => f && f.hp > 0 && !f._sh && hit(f));
    } finally {
      list.forEach((f) => f && delete f._sh);
      if (m.parent) m.parent.remove(m);
    }
  }
  async function sumRun(m, kind, list, el, col, hit, sc, p0) {
    try {
      pillar(p0, col, 0.8, 7, 650);
      shock(p0, col, 2.4, 480);
      glowBurst(p0.clone().setY(1.2), col, 3, 420);
    } catch (e) {}
    puff(p0.clone().setY(1), el === "spirit" ? "spirit" : el, 16, 3, 0.8, 1);
    const t0 = performance.now(),
      an = (mv) => animGloom(m, (performance.now() - t0) / 1000, mv, 0); // the wrapper also plays FMV poses
    await tw(320, (k) => {
      m.scale.setScalar(sc * (k < 0.8 ? (k / 0.8) * 1.15 : 1.15 - ((k - 0.8) / 0.2) * 0.15));
      an(0);
    });
    let from = m.position.clone();
    for (const f of list) {
      if (!f || !f.m) continue;
      const to = f.m.position.clone(),
        dir = to.clone().sub(from).setY(0),
        L = dir.length() || 1;
      dir.multiplyScalar(1 / L);
      const stand = to.clone().sub(dir.clone().multiplyScalar(1.5));
      stand.y = 0;
      m.rotation.y = Math.atan2(dir.x, dir.z);
      await tw(Math.min(420, 160 + L * 40), (k) => {
        m.position.lerpVectors(from, stand, k);
        m.position.y = (m.userData.fl ? 0.2 : 0) + Math.sin(k * PI) * 0.7;
        an(1);
      });
      FMV.pose(m, "slam", 1, 420);
      await tw(140, () => an(0));
      puff(to.clone().setY(1.4), el === "spirit" ? "spirit" : el, 12, 4, 0.6, 1);
      try {
        shock(to.clone().setY(0.1), col, 1.8, 320);
      } catch (e) {}
      f._sh = 1;
      if (hit) hit(f);
      shk = 0.35;
      await tw(200, () => an(0));
      from = m.position.clone();
    }
    await tw(260, (k) => {
      m.scale.setScalar(sc * (1 - k) + 0.01);
      an(0);
    });
    puff(m.position.clone().setY(1), el === "spirit" ? "spirit" : el, 10, 2, 0.6, 0.8);
  }
  RDX.sumAtk = sumAtk;
  Object.assign(CFX, {
    cwisp: async () => {
      const a = alive();
      await sumAtk("mwisp", a, "fire", CS.cwisp.col, (f) => {
        dmg(f, 22, "fire");
        f.st.burn = Math.max(f.st.burn, 1);
      });
    },
    cbogl: async (f) => {
      await sumAtk("bogl", [f], "storm", CS.cbogl.col, (q) => {
        dmg(q, 48, "storm");
        if (q.hp > 0 && Math.random() < 0.3) {
          q.stun = true;
          $("log").textContent = "The " + q.label + " is stunned!";
        }
      });
    },
    cskel: async (f) => {
      await sumAtk("skel", [f], "ice", CS.cskel.col, (q) => {
        dmg(q, 44, "ice");
        q.st.chill = Math.max(q.st.chill, 2);
      });
    },
    cbogm: async (f) => {
      await sumAtk("bogm", [f], "heal", CS.cbogm.col, (q) => dmg(q, 40, "heal"));
      try {
        partyHeal(12, 12);
      } catch (e) {
        healP(12);
      }
    },
    cdrown: async () => {
      const a = alive(),
        n = nAll();
      await sumAtk("skel", a, "spirit", CS.cdrown.col, (q) => dmg(q, 26 + 4 * n, "spirit"));
    },
  });
  // what other players watching the fight see
  Object.assign(SFXK, {
    cwisp: (f, L) => sumAtk("mwisp", L || [f], "fire", CS.cwisp.col),
    cbogl: (f) => sumAtk("bogl", [f], "storm", CS.cbogl.col),
    cskel: (f) => sumAtk("skel", [f], "ice", CS.cskel.col),
    cbogm: (f) => sumAtk("bogm", [f], "heal", CS.cbogm.col),
    cdrown: (f, L) => sumAtk("skel", L || [f], "spirit", CS.cdrown.col),
  });
})();
