// v40 Village tidy-up (loads LAST, after 60): only top-level name VILL.
// The three zone villages (Frostfen, Cinderwaste, Mirewick) get:
//  - a tidy centre: the lava pools (with their solids and fire sprites) inside Cinderwaste's ring, Mirewick's glowing
//    puddles inside its ring and its old north-south boardwalk (posts, lanterns) are hidden;
//  - a walk-in Outfitter (03's window.__vshop: same building, door and room as the Market Lane shops) on the plaza rim,
//    keeper NPC kind "s" with SHOPS/SGEAR entries vfrost/vember/vmarsh (zone gear) plus that zone's mount (21's
//    MNT.rows with zn); the spot is picked at load from free ground (deterministic: the world is);
//  - a level plaque by every street gate ("Lv N+") and by every dungeon door, and a signpost in the plaza listing the
//    village's streets and dungeons, easiest first.
// Zone foes keep up with you: street floors rise along each zone's streets (SFL), and foes in the zones are never more
// than one level under you (wraps foeLv, 10; dungeon interiors, tower, hub and preset levels are left alone).
// Side quests pay at least ~18% of a level in XP when handed in (wraps qdone).
// Runs once, after BASE (adds scene children at the end). No save fields.
const VILL = (() => {
  const Z = {
    frost: {
      x: 600,
      z: -400,
      n: "Frostfen",
      fl: 3,
      el: "ice",
      sl: ["robe", "hat", "boots"],
      title: "OUTFITTER",
      wall: 0x9fb4c8,
      roof: 0x2f4a6a,
      keeper: "Tova",
      line: "Warm wool, sharp ice, and a ram that never slips.",
      spec: { robe: 0x3a5a8a, trim: 0xeaf4ff, hat: "fur", hc: 0xeaf4ff, apron: 0xd8dce8, prop: "mug" },
    },
    ember: {
      x: -600,
      z: -400,
      n: "Cinderwaste",
      fl: 4,
      el: "fire",
      sl: ["staff", "robe", "charm"],
      title: "OUTFITTER",
      wall: 0x8a5a4a,
      roof: 0x3a1a14,
      keeper: "Brann",
      line: "Fireproof cloth, forge-warm iron. Mind the sparks.",
      spec: { robe: 0x6a2a1a, trim: 0xffb040, hat: "band", hc: 0xc9402a, apron: 0x3a2a2a, prop: "hammer" },
    },
    marsh: {
      x: typeof MWX !== "undefined" ? MWX : 1020,
      z: typeof MWZ !== "undefined" ? MWZ : -400,
      n: "Mirewick",
      fl: 6,
      el: "spirit",
      sl: ["hat", "boots", "ring"],
      title: "OUTFITTER",
      wall: 0x6a7a70,
      roof: 0x24382e,
      keeper: "Fenna",
      line: "Reed-woven, bog-proof, and blessed by the old shrine.",
      spec: { robe: 0x2f5a44, trim: 0x9affc8, hat: "hood", hc: 0x24382e, apron: 0x6a5a3a, prop: "lamp" },
    },
  };
  const ZK = Object.keys(Z),
    RING = 47; // inside the village wall

  // street floor levels: each zone's streets climb by one, in ZSTR order
  const SFL = {};
  {
    const rank = {};
    ZSTR.forEach((s, i) => {
      const z = s[0];
      rank[z] = rank[z] || 0;
      SFL[i] = (Z[z] ? Z[z].fl : 3) + rank[z]++;
    });
  }

  // ---------- small helpers ----------
  const B3 = new T.Box3(),
    V3 = new T.Vector3();
  function each(fn) {
    // top-level scene children and the zone-cull holders' children
    S.children.slice().forEach((c) => {
      if (c.name && c.name.startsWith("zone:")) c.children.slice().forEach((d) => fn(d));
      else fn(c);
    });
  }
  const colOf = (o) => {
    let c = null;
    o.traverse((m) => {
      if (c == null && m.material && m.material.color) c = m.material.color.getHex();
    });
    return c;
  };
  function dropSolids(x, z, rmax) {
    for (let i = solids.length - 1; i >= 0; i--) {
      const s = solids[i];
      if (Math.hypot(s.x - x, s.z - z) < 0.5 && (!rmax || s.r <= rmax)) solids.splice(i, 1);
    }
  }
  const keep = new Set();
  function protect() {
    keep.clear();
    keep.add(W);
    try {
      foes.forEach((f) => f && f.o && keep.add(f.o));
    } catch (e) {}
    NPCS.forEach((n) => n.o && keep.add(n.o));
    try {
      CHESTS.forEach((c) => c.o && keep.add(c.o));
    } catch (e) {}
    try {
      // story lamps are loose pieces (pole, cap, glass, glow sprite) standing on L.x/L.z; lore stones are groups
      LAMPS.forEach((L) => [L.s, L.cg].forEach((o) => o && keep.add(o)));
      each((o) => {
        if (LAMPS.some((L) => Math.abs(o.position.x - L.x) < 0.01 && Math.abs(o.position.z - L.z) < 0.01)) keep.add(o);
      });
      LS.forEach((l) => l.s && l.s.parent && keep.add(l.s.parent));
    } catch (e) {}
  }
  // a text board (canvas) on a thin plank; faces +z
  function board(lines, w, h, bg, fg) {
    const c = document.createElement("canvas"),
      px = 64;
    c.width = Math.round(w * px);
    c.height = Math.round(h * px);
    const x = c.getContext("2d");
    x.fillStyle = bg || "#3a2614";
    x.fillRect(0, 0, c.width, c.height);
    x.strokeStyle = "rgba(255,210,120,.55)";
    x.lineWidth = 4;
    x.strokeRect(4, 4, c.width - 8, c.height - 8);
    x.fillStyle = fg || "#ffe9b0";
    x.textAlign = "center";
    x.textBaseline = "middle";
    const L = [].concat(lines),
      fs = Math.min(c.height / (L.length * 1.25), 30);
    x.font = "800 " + Math.round(fs) + "px Georgia, serif";
    L.forEach((t, i) => x.fillText(t, c.width / 2, c.height / 2 + (i - (L.length - 1) / 2) * fs * 1.2, c.width - 14));
    const tx = new T.CanvasTexture(c);
    tx.anisotropy = 4;
    const g = new T.Group(),
      pl = new T.Mesh(B(w + 0.1, h + 0.1, 0.08), M(0x4a2f1b)),
      fr = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshLambertMaterial({ map: tx })),
      bk = fr.clone();
    fr.material.userData.dtx = 0;
    fr.position.z = 0.045;
    bk.position.z = -0.045;
    bk.rotation.y = Math.PI;
    g.add(pl, fr, bk);
    return g;
  }
  const facing = (fx, fz, tx, tz) => Math.atan2(tx - fx, tz - fz);

  // ---------- 1. tidy the village centres ----------
  function tidy() {
    protect();
    const hid = [];
    const E = Z.ember,
      Mw = Z.marsh;
    each((o) => {
      if (keep.has(o) || !o.visible) return;
      B3.setFromObject(o);
      if (B3.isEmpty()) return;
      const s = B3.getSize(V3),
        cx = (B3.min.x + B3.max.x) / 2,
        cz = (B3.min.z + B3.max.z) / 2,
        col = colOf(o);
      // Cinderwaste: lava pools (flat 0xff6a1a discs) and their fire sprites inside the ring
      if (Math.hypot(cx - E.x, cz - E.z) < RING) {
        if (o.isMesh && col === 0xff6a1a && s.y < 0.3 && s.x > 4) {
          hid.push(o);
          dropSolids(cx, cz);
        }
      }
      // Mirewick: glowing puddles (0x3fb09a discs) and the old boardwalk (0x5a4030 plank strip, 0x3a2a1e posts)
      if (Math.hypot(cx - Mw.x, cz - Mw.z) < RING) {
        if (o.isMesh && col === 0x3fb09a && s.y < 0.3 && s.x > 5) hid.push(o);
        if (o.isMesh && col === 0x5a4030 && s.z > 50 && Math.abs(cx - Mw.x) < 1) hid.push(o);
        if (o.isMesh && col === 0x3a2a1e && s.y < 1.6 && Math.abs(Math.abs(cx - Mw.x) - 2) < 0.6) {
          hid.push(o);
          dropSolids(cx, cz, 0.6);
        }
      }
    });
    // the sprites over hidden pools / boardwalk lanterns: same spot, glow only
    const spots = hid.map((o) => {
      B3.setFromObject(o);
      return [(B3.min.x + B3.max.x) / 2, (B3.min.z + B3.max.z) / 2];
    });
    each((o) => {
      if (!o.isSprite || !o.visible) return;
      const p = o.position;
      const nearE = Math.hypot(p.x - E.x, p.z - E.z) < RING,
        nearM = Math.hypot(p.x - Mw.x, p.z - Mw.z) < RING;
      if (!nearE && !nearM) return;
      if (spots.some(([x, z]) => Math.hypot(p.x - x, p.z - z) < 1.2)) hid.push(o);
      // boardwalk lanterns stand on the posts at x+2
      else if (nearM && Math.abs(p.x - Mw.x - 2) < 0.4 && o.scale.x > 2.8 && o.scale.x < 3.6) hid.push(o);
    });
    hid.forEach((o) => {
      o.visible = false;
      o.userData.vhid = 1;
    });
    // 13-editor's __mireTidy redraws Mirewick's loose posts as instances: squash the boardwalk ones
    let ni = 0;
    const m4 = new T.Matrix4(),
      p3 = new T.Vector3(),
      zero = new T.Matrix4().makeScale(0, 0, 0);
    S.traverse((o) => {
      if (!o.isInstancedMesh || !o.material || !o.material.color || o.material.color.getHex() !== 0x3a2a1e) return;
      let ch = 0;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4);
        p3.setFromMatrixPosition(m4).applyMatrix4(o.matrixWorld);
        if (Math.abs(Math.abs(p3.x - Mw.x) - 2) < 0.4 && Math.abs(p3.z - Mw.z) < 40) {
          o.setMatrixAt(i, zero);
          ch = 1;
          ni++;
        }
      }
      if (ch) o.instanceMatrix.needsUpdate = true;
    });
    // v40b: the safe-ring ward posts (03: instanced 0.09/0.12 posts + 0x7dffb0 crystals + a Points glow, one every
    // ~4.2 around each ring) are thinned to every other one, and none stand within 6 of a portal or door
    const near = (x, z) => PT.some((q) => Math.hypot(q.x - x, q.z - z) < 6);
    const wardHide = new Set();
    S.children.forEach((o) => {
      if (!o.isInstancedMesh || !o.material || !o.material.color) return;
      const gp = o.geometry.parameters || {},
        post = o.material.color.getHex() === 0x2a2438 && gp.height === 1.2 && gp.radiusTop === 0.09,
        gem = o.material.color.getHex() === 0x7dffb0 && o.geometry.type === "OctahedronGeometry";
      if (!post && !gem) return;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4);
        p3.setFromMatrixPosition(m4);
        const key = Math.round(p3.x * 2) + "," + Math.round(p3.z * 2);
        if (i % 2 === 1 || near(p3.x, p3.z)) {
          o.setMatrixAt(i, zero);
          wardHide.add(key);
          ni++;
        }
      }
      o.instanceMatrix.needsUpdate = true;
    });
    S.children.forEach((o) => {
      if (!o.isPoints || !o.material || !o.material.color || o.material.color.getHex() !== 0x7dffb0) return;
      const a = o.geometry.attributes.position;
      for (let i = 0; i < a.count; i++)
        if (wardHide.has(Math.round(a.getX(i) * 2) + "," + Math.round(a.getZ(i) * 2))) a.setY(i, -50);
      a.needsUpdate = true;
    });
    for (let i = solids.length - 1; i >= 0; i--) {
      const s = solids[i];
      if (s.r === 0.3 && wardHide.has(Math.round(s.x * 2) + "," + Math.round(s.z * 2))) solids.splice(i, 1);
    }
    // big scenery crowding a village portal (e.g. the rock + lava spill right behind Crater Climb's arch): any
    // solid of r >= 2 within 6 of a village portal goes, with the loose pieces standing on it
    protect();
    PT.forEach((p) => {
      if (!ZK.some((k) => Math.hypot(p.x - Z[k].x, p.z - Z[k].z) < RING + 14)) return;
      for (let i = solids.length - 1; i >= 0; i--) {
        const s = solids[i];
        if (s.r < 2 || s.r > 5 || Math.hypot(s.x - p.x, s.z - p.z) > 6) continue;
        solids.splice(i, 1);
        each((o) => {
          if (keep.has(o) || !o.visible) return;
          B3.setFromObject(o);
          if (B3.isEmpty()) return;
          // never the arch itself (its bounds hold the portal)
          if (p.x > B3.min.x && p.x < B3.max.x && p.z > B3.min.z && p.z < B3.max.z) return;
          const c = B3.getCenter(V3),
            sz = B3.getSize(new T.Vector3());
          // nor the portal's own swirl/glow (centred on it)
          if (o === p.r || o === p.g || Math.hypot(c.x - p.x, c.z - p.z) < 3.2) return;
          if (Math.max(sz.x, sz.z) < 12 && Math.hypot(c.x - s.x, c.z - s.z) < s.r + 1.5) {
            o.visible = false;
            o.userData.vhid = 1;
            ni++;
          }
        });
      }
    });
    // Frostfen's four extra plaza lamp posts (03 lampost: 0.08/0.1 x 3.2 pole, cap box, glow sprite at y 3.4)
    const F = Z.frost;
    each((o) => {
      if (!o.visible) return;
      const p = o.position;
      if (Math.hypot(p.x - F.x, p.z - F.z) > 22) return;
      const gp = (o.geometry && o.geometry.parameters) || {};
      const pole = o.isMesh && gp.height === 3.2 && gp.radiusTop === 0.08,
        cap = o.isMesh && gp.width === 0.36 && gp.height === 0.1 && Math.abs(p.y - 3.25) < 0.01,
        glow = o.isSprite && (Math.abs(p.y - 3.4) < 0.01 || Math.abs(p.y - 4.6) < 0.01) && Math.abs(o.scale.x - 2.3) < 0.01; // v47: glow now at 4.6
      if (pole || cap || glow) {
        o.visible = false;
        o.userData.vhid = 1;
        ni++;
        if (pole) dropSolids(p.x, p.z, 0.5);
      }
    });
    return hid.length + ni;
  }

  // ---------- 2. outfitters ----------
  const VS = {}; // shop id -> zone key
  function freeAngle(zk, R) {
    const C = Z[zk],
      gates = PT.filter((p) => Math.hypot(p.x - C.x, p.z - C.z) < RING + 6),
      foot = 9.5;
    let best = null;
    for (let d = 0; d < 360; d += 6) {
      const a = (d * Math.PI) / 180,
        r = R + 6,
        x = C.x + Math.cos(a) * r,
        z = C.z + Math.sin(a) * r;
      if (!okp(x, z)) continue;
      let cl = 99;
      solids.forEach((s) => {
        // tiny solids (ward posts, story lamps, barrels) don't count: the town planner moves or thins them
        if (s.r > 6 || s.r < 0.6) return;
        cl = Math.min(cl, Math.hypot(s.x - x, s.z - z) - s.r);
      });
      gates.forEach((p) => (cl = Math.min(cl, Math.hypot(p.x - x, p.z - z) - 4)));
      NPCS.forEach((n) => (cl = Math.min(cl, Math.hypot(n.x - x, n.z - z) - 3)));
      // keep the whole building out of the lanes from the plaza to every portal (arches stand at r ~54)
      PT.forEach((p) => {
        const L = Math.hypot(p.x - C.x, p.z - C.z);
        if (L > RING + 14 || L < 1) return;
        cl = Math.min(cl, segD(x, z, C.x + ((p.x - C.x) / L) * 16, C.z + ((p.z - C.z) / L) * 16, p.x, p.z) - 0.5);
      });
      (typeof DUN !== "undefined" ? DUN : []).forEach((D) => {
        if (D.door) cl = Math.min(cl, Math.hypot(D.door[0] - x, D.door[1] - z) - 6);
      });
      if (cl < foot) continue;
      if (!best || cl > best.cl) best = { d, cl };
    }
    return best ? best.d : null;
  }
  function outfitters() {
    if (typeof window.__vshop !== "function") return;
    ZK.forEach((zk) => {
      const C = Z[zk],
        id = "v" + zk,
        // nearest free ring first (plaza edge), then a little further out
        R = [18, 21, 24].find((r) => freeAngle(zk, r) != null) || 18,
        d = freeAngle(zk, R);
      if (d == null) return;
      // hide loose decor where the building will stand
      protect();
      const a = (d * Math.PI) / 180,
        bx = C.x + Math.cos(a) * (R + 5.8),
        bz = C.z + Math.sin(a) * (R + 5.8);
      each((o) => {
        if (keep.has(o) || !o.visible || o.isSprite) return;
        B3.setFromObject(o);
        if (B3.isEmpty()) return;
        const s = B3.getSize(V3);
        if (Math.max(s.x, s.z) > 9) return;
        const cx = (B3.min.x + B3.max.x) / 2,
          cz = (B3.min.z + B3.max.z) / 2;
        if (Math.hypot(cx - bx, cz - bz) < 9) {
          o.visible = false;
          o.userData.vhid = 1;
          dropSolids(cx, cz, 2);
        }
      });
      const res = window.__vshop({ x: C.x, z: C.z, r: R, d, back: C.n }, "outfit", C.title, C.wall, C.roof);
      // the building is solid (the village is open ground, unlike Market Lane's rim)
      const ry = Math.atan2(-Math.cos(a), -Math.sin(a)),
        cs = Math.cos(ry),
        sn = Math.sin(ry);
      for (let lx = -6.4; lx <= 6.41; lx += 2.56)
        for (let lz = -5.4; lz <= 4.21; lz += 2.4)
          solids.push({ x: bx + lx * cs + lz * sn, z: bz - lx * sn + lz * cs, r: 1.7 });
      // keeper
      const [kx, kz] = res.keep,
        o = person(C.spec);
      o.position.set(kx, 0, kz);
      o.rotation.y = 0;
      S.add(o);
      solids.push({ x: kx, z: kz, r: 1.1 });
      NNAME["s" + id] = [C.keeper, "Outfitter · gear & mounts"];
      // every NPC needs a floating marker (11's walk() bobs n.mkr each frame)
      const mkr = new T.Sprite(AM(SP.heal));
      mkr.scale.setScalar(1.5);
      mkr.position.y = 4.2;
      o.add(mkr);
      const n = { o, kind: "s", id, mkr, x: kx, z: kz, ry: 0 };
      NPCS.push(n);
      try {
        npcPlate(n);
      } catch (e) {}
      SHOPS[id] = { n: C.keeper, z: zk, l: C.line, i: ["heal", "page", "boots"].filter((k) => IT[k]) };
      SGEAR[id] = { sl: C.sl, el: C.el };
      VS[id] = zk;
      C.shop = { d, x: bx, z: bz, room: res.room };
    });
  }
  // ---------- 2b. town planner: every village becomes one coherent little town ----------
  // Clear lanes run from the plaza to every portal / dungeon door. Houses stand in rows facing the plaza (existing
  // village houses are moved there, new ones from 03's kit fill the rest, Mirewick gets its first). Story lamps,
  // lore stones and chests that sat in a lane or a house spot move to the plaza rim, and loose decor in a lane goes.
  // Deterministic (fixed slot order, no Math.random), so every player sees the same town.
  // v42 Frostfen is laid out by hand (local to the village centre). Its cobbled square is NOT at the centre: it is
  // 03's r 15 disc at local (-5, 15) (SAFEC [595, -385, 15]), so `fc`/`pr` = square centre/radius, and houses,
  // NPCs and the rim face that. `slots` = house fronts (bodies extend away from the square), `pin` = [old x, old z,
  // slot] keeps the Lodge on its spot, `st` = paved streets as polylines (each starts just inside the square, branches
  // start on another street): Mire road, NE lane to Rimefang Row, Rimestone Way, Sled Camp Lane, the Frostfen Trail,
  // the den lane, High Street north to Frozen Lake Way, and a spur to the Outfitter's door. With `st` set, the
  // lanes the planner keeps clear are these streets.
  const TOWN = {
    frost: {
      n: 8,
      wall: [0xd8dce8, 0x9fb4c8, 0xc8d4e8],
      roof: [0x2f4a6a, 0x3a4a7a, 0x4a5a8a],
      fc: [-5, 15],
      pr: 15,
      slots: [
        [7.9, 30.3],
        [-5, 35],
        [-17.9, 30.3],
        [-28.9, 12.9],
        [-9, -32],
        [35, -15],
      ],
      pin: [[-19, 9, 3]],
      st: [
        [
          [8.6, 11.7],
          [24.5, 7.4],
        ],
        [
          [21, 8.2],
          [26, -10],
          [30.8, -28.6],
        ],
        [
          [7.9, 20.5],
          [29.7, 29.7],
        ],
        [
          [-18.3, 19.3],
          [-34.1, 24.5],
        ],
        [
          [-17.2, 8.1],
          [-39, -4],
        ],
        [
          [-28, 2.1],
          [-32.5, -12],
        ],
        [
          [-7, 1.5],
          [-8, -16],
          [-23.3, -34.9],
        ],
        [
          [-8, -14.5],
          [4.9, -15.2],
        ],
      ],
    },
    ember: { n: 7, wall: [0x8a5a4a, 0x9a6a4a, 0x7a4a3a], roof: [0x3a1a14, 0x5a2a1a, 0x4a2418] },
    marsh: { n: 6, wall: [0x6a7a70, 0x7a6a50, 0x5a6a5a], roof: [0x24382e, 0x3a4a2a, 0x2a3a34] },
  };
  const HCB = 5.4; // house block radius (03: cb(x, z, 3.6 * HSC))
  const segD = (x, z, ax, az, bx, bz) => {
    const dx = bx - ax,
      dz = bz - az,
      L2 = dx * dx + dz * dz || 1,
      t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return Math.hypot(x - ax - dx * t, z - az - dz * t);
  };
  // collision (solids r <= 2.5 and small CB blocks) whose centre lies inside a box: removed / moved by (dx, dz)
  const inBox = (x, z, b) => x > b.min.x - 0.3 && x < b.max.x + 0.3 && z > b.min.z - 0.3 && z < b.max.z + 0.3;
  function clearBox(b) {
    for (let i = solids.length - 1; i >= 0; i--)
      if (solids[i].r <= 2.5 && inBox(solids[i].x, solids[i].z, b)) solids.splice(i, 1);
    for (let i = CB.length - 1; i >= 0; i--)
      if (!CB[i].hs && CB[i].r <= 2.5 && inBox(CB[i].x, CB[i].z, b)) CB.splice(i, 1);
  }
  function moveBox(x0, z0, x1, z1, b) {
    [...solids, ...CB].forEach((s) => {
      if (s.hs || s.r > 2.5 || !inBox(s.x, s.z, b)) return;
      s.x += x1 - x0;
      s.z += z1 - z0;
    });
  }
  function town() {
    ZK.forEach((zk) => {
      const C = Z[zk],
        TW = TOWN[zk],
        VR = typeof ZVR !== "undefined" && ZVR[zk] ? ZVR[zk] : 46,
        maxR = VR - 6,
        ports = PT.filter((p) => Math.hypot(p.x - C.x, p.z - C.z) < VR + 14 && p.n !== C.title),
        // lanes start at the plaza edge (r 20; the plaza itself is open ground) and run to each portal
        // the square houses face (v42: Frostfen's sits off-centre)
        F0 = TW.fc ? { x: C.x + TW.fc[0], z: C.z + TW.fc[1] } : C,
        lanes = TW.st
          ? [].concat(
              ...TW.st.map((L) => L.slice(1).map((b, k) => [C.x + L[k][0], C.z + L[k][1], C.x + b[0], C.z + b[1]])),
            )
          : ports.map((p) => {
              const L = Math.hypot(p.x - C.x, p.z - C.z) || 1;
              return [C.x + ((p.x - C.x) / L) * 20, C.z + ((p.z - C.z) / L) * 20, p.x, p.z];
            }),
        laneD = (x, z) => Math.min(99, ...lanes.map((l) => segD(x, z, ...l))),
        portD = (x, z) => Math.min(99, ...ports.map((p) => Math.hypot(p.x - x, p.z - z))),
        npcs = NPCS.filter((n) => Math.hypot(n.x - C.x, n.z - C.z) < VR + 6),
        npcD = (x, z) => Math.min(99, ...npcs.map((n) => Math.hypot(n.x - x, n.z - z))),
        shopD = (x, z) => (C.shop ? Math.hypot(C.shop.x - x, C.shop.z - z) : 99),
        cdist = (x, z) => Math.hypot(x - C.x, z - C.z);
      protect();
      const houses = HOUSES.filter((h) => h.o && cdist(h.o.position.x, h.o.position.z) < VR + 4);
      houses.forEach((h) => keep.add(h.o));
      try {
        (typeof WELLS !== "undefined" ? WELLS : []).forEach((w) => keep.add(w));
      } catch (e) {}
      LS.forEach((l) => l.s && l.s.parent && keep.add(l.s.parent));
      // big fixed scenery (rock mounds, ponds, dens) inside the village: houses keep clear of it
      const big = [];
      each((o) => {
        if (!o.visible || keep.has(o) || o.userData.vill) return;
        B3.setFromObject(o);
        if (B3.isEmpty()) return;
        const c = B3.getCenter(V3),
          s = B3.getSize(new T.Vector3()),
          w = Math.max(s.x, s.z);
        if (w < 4 || w > 26 || cdist(c.x, c.z) > VR + 4) return;
        big.push([c.x, c.z, w / 2]);
      });
      const bigD = (x, z) => Math.min(99, ...big.map(([bx, bz, r]) => Math.hypot(bx - x, bz - z) - r));

      // --- house slots: rows at r 29 and maxR (when there is room for two), every ~12 along the row
      // (the outer row only fills gaps, never straight behind an inner house, so rows may sit close)
      const rows = maxR - 28 >= 6 ? [28, maxR] : [Math.min(28, maxR)],
        slots = [];
      if (!TW.slots)
        rows.forEach((r) => {
          const n = Math.floor((2 * Math.PI * r) / 7.5); // fine candidates; picks keep 14.5 apart
          for (let k = 0; k < n; k++) {
            const a = (k / n) * 2 * Math.PI + (r === rows[0] ? 0 : Math.PI / n),
              x = C.x + Math.cos(a) * r,
              z = C.z + Math.sin(a) * r;
            if (laneD(x, z) < HCB + 4 || portD(x, z) < 12 || npcD(x, z) < HCB + 3) continue;
            if (shopD(x, z) < HCB + 9 || bigD(x, z) < HCB + 0.5) continue;
            if (![0, 1, 2, 3].every((q) => okp(x + Math.cos(q * 1.57) * 4.5, z + Math.sin(q * 1.57) * 4.5))) continue;
            // never on (or right beside) a trail road crossing the village
            const onTr = (px, pz) => typeof trOn === "function" && trOn(px, pz);
            if (
              [0, 1, 2, 3, 4, 5, 6, 7].some((q) => onTr(x + Math.cos(q * 0.785) * 8.5, z + Math.sin(q * 0.785) * 8.5))
            )
              continue;
            slots.push({ x, z, a, r });
          }
        });
      // inner row first, greedy round the ring so houses spread evenly with yards between them; the outer row only
      // where it doesn't stand straight behind an inner house
      slots.sort((p, q) => p.r - q.r || p.a - q.a);
      const pick = (TW.slots || []).map(([lx, lz]) => ({
        x: C.x + lx,
        z: C.z + lz,
        a: Math.atan2(lz, lx),
        r: Math.hypot(lx, lz),
      }));
      slots.forEach((s) => {
        if (TW.slots || pick.length >= TW.n) return;
        if (pick.some((p) => Math.hypot(p.x - s.x, p.z - s.z) < 13)) return;
        if (s.r > rows[0] && pick.some((p) => Math.abs(Math.atan2(Math.sin(p.a - s.a), Math.cos(p.a - s.a))) < 0.32))
          return;
        // nor behind the outfitter (its doors would face the shop's back wall)
        if (C.shop) {
          const sa = Math.atan2(C.shop.z - C.z, C.shop.x - C.x);
          if (Math.abs(Math.atan2(Math.sin(sa - s.a), Math.cos(sa - s.a))) < 0.55) return;
        }
        pick.push(s);
      });

      // --- move a house (group, CB block, chimney smoke) to a slot, front facing the plaza
      const moveHouse = (h, s) => {
        const o = h.o,
          ry = Math.atan2(F0.x - s.x, F0.z - s.z);
        o.updateMatrixWorld(true);
        const inv = new T.Matrix4().copy(o.matrixWorld).invert(),
          ox = o.position.x,
          oz = o.position.z;
        const smk = SMK.filter((m) => Math.hypot(m.x - ox, m.z - oz) < 7).map((m) => [
          m,
          new T.Vector3(m.x, m.y, m.z).applyMatrix4(inv),
        ]);
        // sprites/props standing on the old spot (signs, flower boxes added outside the bake) go with it
        o.position.set(s.x, 0, s.z);
        o.rotation.y = ry;
        o.updateMatrixWorld(true);
        smk.forEach(([m, v]) => {
          v.applyMatrix4(o.matrixWorld);
          m.x = v.x;
          m.y = v.y;
          m.z = v.z;
        });
        CB.forEach((c) => {
          if (c.hs === h || (Math.abs(c.x - ox) < 0.01 && Math.abs(c.z - oz) < 0.01)) {
            c.x = s.x;
            c.z = s.z;
          }
        });
        h.x = s.x;
        h.z = s.z;
        s.h = h;
        s.ry = ry;
      };
      const old = houses.map((h) => [h.o.position.x, h.o.position.z]);
      // pinned houses first (old spot -> slot), then the rest take the nearest free slots
      (TW.pin || []).forEach(([ox, oz, si]) => {
        const h = houses.find((q) => Math.hypot(q.o.position.x - C.x - ox, q.o.position.z - C.z - oz) < 1.5);
        if (h && pick[si] && !pick[si].h) {
          moveHouse(h, pick[si]);
          C.lodge = h;
        }
      });
      houses.forEach((h) => {
        if (pick.some((s) => s.h === h)) return;
        let bi = -1,
          bd = 1e9;
        pick.forEach((s, i) => {
          if (s.h) return;
          const d = Math.hypot(s.x - h.o.position.x, s.z - h.o.position.z);
          if (d < bd) {
            bd = d;
            bi = i;
          }
        });
        if (bi >= 0) moveHouse(h, pick[bi]);
      });
      // new houses from the kit fill the rest (kit builds at the origin; then moved like any other)
      const holder = S.getObjectByName("zone:" + zk);
      pick.forEach((s, k) => {
        if (s.h || !window.__edKit || !window.__edKit.house) return;
        const n0 = HOUSES.length;
        window.__edKit.house({ i: 3 + k, wall: TW.wall[k % 3], roof: TW.roof[k % 3], tall: k % 3 === 1 });
        const h = HOUSES[n0];
        if (!h) return;
        h.o.userData.vill = 2; // not a sign (resign skips it)
        if (holder) holder.attach(h.o);
        moveHouse(h, s);
      });

      // --- loose decor in a lane, by a portal or where a house now stands goes (not ground decals, NPC props,
      // houses, lamps/stones/chests (moved below), wells, signs or the arches themselves)
      const lampMesh = new Set(),
        LMP = LAMPS.filter((L) => cdist(L.x, L.z) < VR + 4),
        STN = LS.filter((l) => cdist(l.x, l.z) < VR + 4 && l.s && l.s.parent),
        CHS = CHESTS.filter((c) => c.o && cdist(c.x, c.z) < VR + 4);
      each((o) => {
        if (!o.visible) return;
        LMP.forEach((L) => {
          if (Math.abs(o.position.x - L.x) < 0.01 && Math.abs(o.position.z - L.z) < 0.01) lampMesh.add(o);
        });
      });
      pick.forEach((s) => s.h && keep.add(s.h.o));
      each((o) => {
        if (!o.visible || keep.has(o) || lampMesh.has(o) || o.userData.vill || o.userData.vhid) return;
        if (STN.some((l) => l.s.parent === o) || CHS.some((c) => c.o === o)) return;
        B3.setFromObject(o);
        if (B3.isEmpty()) return;
        const c = B3.getCenter(V3),
          s = B3.getSize(new T.Vector3());
        if (s.y < 0.45 || Math.max(s.x, s.z) > 7 || cdist(c.x, c.z) > VR + 2 || cdist(c.x, c.z) < 12) return;
        if (ports.some((p) => p.x > B3.min.x && p.x < B3.max.x && p.z > B3.min.z && p.z < B3.max.z)) return;
        const inLane = laneD(c.x, c.z) < 5.5 || portD(c.x, c.z) < 7,
          onHouse = pick.some((p) => p.h && Math.hypot(p.x - c.x, p.z - c.z) < HCB + (TW.slots ? 2.5 : 1.5));
        if (npcD(c.x, c.z) < 4) {
          // an NPC's own prop (quest board, stall) in a lane flips to the NPC's other side
          if (!inLane) return;
          const n = npcs.reduce((a, b) =>
              Math.hypot(a.x - c.x, a.z - c.z) < Math.hypot(b.x - c.x, b.z - c.z) ? a : b,
            ),
            nx = 2 * n.x - c.x,
            nz = 2 * n.z - c.z;
          if (laneD(nx, nz) < 5.5 || !okp(nx, nz)) return;
          moveBox(c.x, c.z, nx, nz, B3);
          o.position.x += nx - c.x;
          o.position.z += nz - c.z;
          return;
        }
        if (inLane || onHouse) {
          o.visible = false;
          o.userData.vhid = 1;
          clearBox(B3);
        }
      });
      // collision left over in a lane with nothing visible to show for it (from pieces hidden earlier) goes too
      for (let i = solids.length - 1; i >= 0; i--) {
        const s = solids[i];
        if (s.r > 2.5 || laneD(s.x, s.z) > s.r + 1.5 || portD(s.x, s.z) < 5 || npcD(s.x, s.z) < 2) continue;
        if (C.shop && Math.hypot(C.shop.x - s.x, C.shop.z - s.z) < 10) continue;
        if (cdist(s.x, s.z) < 20) continue;
        // story lamps, lore stones and chests are moved (with their collision) just below
        if ([...LMP, ...STN, ...CHS].some((m) => Math.hypot(m.x - s.x, m.z - s.z) < 0.3)) continue;
        // flat lava/ice discs with collision go with it
        each((o) => {
          if (!o.visible || keep.has(o) || o.userData.vill) return;
          B3.setFromObject(o);
          if (B3.isEmpty()) return;
          const sz = B3.getSize(V3);
          if (Math.max(sz.x, sz.z) > 7) return;
          if (s.x > B3.min.x - 0.3 && s.x < B3.max.x + 0.3 && s.z > B3.min.z - 0.3 && s.z < B3.max.z + 0.3) {
            o.visible = false;
            o.userData.vhid = 1;
          }
        });
        solids.splice(i, 1);
      }
      for (let i = CB.length - 1; i >= 0; i--) {
        const c = CB[i];
        if (c.hs || c.r > 2.5 || laneD(c.x, c.z) > c.r + 1.5 || cdist(c.x, c.z) < 20) continue;
        CB.splice(i, 1);
      }

      // --- story lamps, lore stones and chests in the way move to free spots on the plaza rim
      // (houses face the plaza: keep each front walk, doorstep to plaza edge, clear)
      const doorD = (x, z) => {
        let d = 99;
        pick.forEach((p) => {
          if (!p.h) return;
          const L = Math.hypot(F0.x - p.x, F0.z - p.z) || 1,
            ux = (F0.x - p.x) / L,
            uz = (F0.z - p.z) / L,
            pe = TW.pr ? TW.pr + 1 : 16;
          d = Math.min(d, segD(x, z, p.x + ux * HCB, p.z + uz * HCB, F0.x - ux * pe, F0.z - uz * pe));
        });
        return d;
      };
      const rim = [];
      for (const r of TW.pr ? [TW.pr + 2, TW.pr + 4.5] : [22, 24.5])
        for (let k = 0; k < 60; k++) {
          const a = (k / 60) * 2 * Math.PI + (r > (TW.pr ? TW.pr + 3 : 23) ? 0.05 : 0),
            x = F0.x + Math.cos(a) * r,
            z = F0.z + Math.sin(a) * r;
          if (laneD(x, z) < 6 || portD(x, z) < 9 || npcD(x, z) < 4.5 || shopD(x, z) < 10 || !okp(x, z)) continue;
          if (pick.some((p) => p.h && Math.hypot(p.x - x, p.z - z) < HCB + 2.5)) continue;
          if (doorD(x, z) < 3.5 || bigD(x, z) < 1.5) continue;
          rim.push({ x, z });
        }
      const used = [];
      const spot = (x0, z0) => {
        let best = null,
          bd = 1e9;
        rim.forEach((s) => {
          if (used.some((u) => Math.hypot(u.x - s.x, u.z - s.z) < 6)) return;
          if (solids.some((q) => q.r < 4 && Math.hypot(q.x - s.x, q.z - s.z) < q.r + 1.2)) return;
          const d = Math.hypot(s.x - x0, s.z - z0);
          if (d < bd) {
            bd = d;
            best = s;
          }
        });
        if (best) used.push(best);
        return best;
      };
      const inWay = (x, z) =>
        laneD(x, z) < 6 ||
        portD(x, z) < 9 ||
        shopD(x, z) < 10 ||
        doorD(x, z) < 3 ||
        pick.some((p) => p.h && Math.hypot(p.x - x, p.z - z) < HCB + 2);
      const moveSol = (x0, z0, x1, z1, rmax) =>
        solids.forEach((s) => {
          if (s.r <= rmax && Math.hypot(s.x - x0, s.z - z0) < 0.3) {
            s.x = x1;
            s.z = z1;
          }
        });
      LMP.forEach((L) => {
        if (!inWay(L.x, L.z)) return;
        const s = spot(L.x, L.z);
        if (!s) return;
        const dx = s.x - L.x,
          dz = s.z - L.z;
        lampMesh.forEach((o) => {
          if (Math.abs(o.position.x - L.x) < 0.01 && Math.abs(o.position.z - L.z) < 0.01) {
            o.position.x += dx;
            o.position.z += dz;
          }
        });
        [L.s, L.cg].forEach((o) => {
          if (o && !lampMesh.has(o)) {
            o.position.x += dx;
            o.position.z += dz;
          }
        });
        moveSol(L.x, L.z, s.x, s.z, 0.5);
        L.x = s.x;
        L.z = s.z;
      });
      STN.forEach((l) => {
        if (!inWay(l.x, l.z)) return;
        const s = spot(l.x, l.z);
        if (!s) return;
        const g0 = l.s.parent;
        g0.position.x += s.x - l.x;
        g0.position.z += s.z - l.z;
        g0.rotation.y = Math.atan2(C.x - s.x, C.z - s.z);
        moveSol(l.x, l.z, s.x, s.z, 1);
        l.x = s.x;
        l.z = s.z;
      });
      CHS.forEach((c) => {
        if (!inWay(c.x, c.z)) return;
        const s = spot(c.x, c.z);
        if (!s) return;
        c.o.position.x += s.x - c.x;
        c.o.position.z += s.z - c.z;
        moveSol(c.x, c.z, s.x, s.z, 1);
        c.x = s.x;
        c.z = s.z;
      });
      C.town = { pick: pick.filter((p) => p.h), lanes, rim, slots, f0: F0 };
    });
  }

  // ---------- 2b'. v42 paved streets (TOWN[zk].st) and Frostfen's finishing touches ----------
  // Streets are paved with the square's own cobbles: a clone of 03's square disc material (same map and repeat) and
  // UVs worked out the way that disc maps them, so street and square line up stone for stone and overlaps (street
  // ends under the square, branches on a street, joints) can't show. One merged mesh: strips cut every ~2 units (so
  // lamp light spreads like it does on the square), a disc at every bend, drawn a hair under the square.
  function pave(zk) {
    const C = Z[zk],
      TW = TOWN[zk];
    if (!TW.st) return;
    const F0 = (C.town && C.town.f0) || C,
      pr = TW.pr || 15,
      hw = 3.2;
    let sq = null;
    each((o) => {
      const gp = (o.isMesh && o.geometry && o.geometry.type === "CircleGeometry" && o.geometry.parameters) || null;
      if (!sq && gp && Math.abs(gp.radius - pr) < 0.01 && Math.hypot(o.position.x - F0.x, o.position.z - F0.z) < 0.5)
        sq = o;
    });
    let mat, uvOf, Y;
    if (sq) {
      mat = sq.material.clone();
      const cx = sq.position.x,
        cz = sq.position.z,
        R = sq.geometry.parameters.radius;
      uvOf = (x, z) => [((x - cx) / R + 1) / 2, ((cz - z) / R + 1) / 2];
      Y = sq.position.y - 0.004;
    } else {
      mat = new T.MeshLambertMaterial({ color: 0xc8a898 });
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -2;
      uvOf = (x, z) => [x / 4, -z / 4];
      Y = 0.035;
    }
    mat.side = T.DoubleSide;
    const pos = [],
      uv = [],
      idx = [],
      vtx = (x, z) => {
        const [u, v] = uvOf(x, z);
        pos.push(x, Y, z);
        uv.push(u, v);
        return pos.length / 3 - 1;
      },
      strip = (ax, az, bx, bz) => {
        const L = Math.hypot(bx - ax, bz - az) || 1,
          n = Math.max(1, Math.ceil(L / 2)),
          nx = (-(bz - az) / L) * hw,
          nz = ((bx - ax) / L) * hw;
        let p = [vtx(ax + nx, az + nz), vtx(ax - nx, az - nz)];
        for (let i = 1; i <= n; i++) {
          const x = ax + ((bx - ax) * i) / n,
            z = az + ((bz - az) * i) / n,
            q = [vtx(x + nx, z + nz), vtx(x - nx, z - nz)];
          idx.push(p[0], q[0], p[1], p[1], q[0], q[1]);
          p = q;
        }
      },
      disc = (x, z) => {
        const c = vtx(x, z),
          N = 16,
          rim = [];
        for (let k = 0; k < N; k++)
          rim.push(vtx(x + Math.cos((k / N) * 6.2832) * hw, z + Math.sin((k / N) * 6.2832) * hw));
        for (let k = 0; k < N; k++) idx.push(c, rim[k], rim[(k + 1) % N]);
      };
    TW.st.forEach((L) => {
      const P = L.map(([x, z]) => [C.x + x, C.z + z]);
      for (let k = 1; k < P.length; k++) strip(P[k - 1][0], P[k - 1][1], P[k][0], P[k][1]);
      for (let k = 1; k < P.length - 1; k++) disc(P[k][0], P[k][1]);
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setAttribute(
      "normal",
      new T.Float32BufferAttribute(
        new Array(pos.length).fill(0).map((v, i) => (i % 3 === 1 ? 1 : 0)),
        3,
      ),
    );
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    const m = new T.Mesh(geo, mat);
    m.name = "vill:streets:" + zk;
    m.userData.vill = 2;
    if (sq) m.renderOrder = sq.renderOrder;
    (S.getObjectByName("zone:" + zk) || S).add(m);
  }
  // Frostfen: the quest board, healer and quest giver turn to face the plaza; Yara stands behind her stall; the
  // "FROSTFEN LODGE" board and its log pile follow the Lodge to its new spot
  function dressFrost() {
    const C = Z.frost,
      Q = (C.town && C.town.f0) || C; // the square
    NPCS.forEach((n) => {
      if (n.kind === "s" || Math.hypot(n.x - Q.x, n.z - Q.z) > 30) return;
      const ry = Math.atan2(Q.x - n.x, Q.z - n.z);
      n.o.rotation.y = ry;
      if (n.ry != null) n.ry = ry;
    });
    const at = (o, x, z, y) =>
      Math.abs(o.position.x - x) < 0.02 &&
      Math.abs(o.position.z - z) < 0.02 &&
      (y == null || Math.abs(o.position.y - y) < 0.02);
    const unhide = (o) => {
      o.visible = true;
      delete o.userData.vhid;
    };
    // Yara: just behind the counter, looking over it at the plaza
    let stall = null;
    each((o) => {
      if (!stall && o.isGroup && at(o, C.x - 12, C.z + 5)) stall = o;
    });
    const ya = NPCS.find((n) => n.id === "yara" && n.kind === "s");
    if (stall && ya) {
      // the stall turns to face the square; Yara stands behind it
      stall.rotation.y = Math.atan2(Q.x - stall.position.x, Q.z - stall.position.z);
      const L = Math.hypot(stall.position.x - Q.x, stall.position.z - Q.z) || 1,
        nx = stall.position.x + ((stall.position.x - Q.x) / L) * 1.8,
        nz = stall.position.z + ((stall.position.z - Q.z) / L) * 1.8;
      solids.forEach((s) => {
        if (Math.abs(s.x - ya.x) < 0.05 && Math.abs(s.z - ya.z) < 0.05 && s.r <= 1.2) {
          s.x = nx;
          s.z = nz;
        }
      });
      ya.x = nx;
      ya.z = nz;
      ya.o.position.set(nx, 0, nz);
      ya.ry = Math.atan2(Q.x - nx, Q.z - nz);
      ya.o.rotation.y = ya.ry;
    }
    const h = C.lodge;
    if (!h) return;
    const o = h.o,
      ry = o.rotation.y,
      p0 = o.position.clone();
    // the Lodge's front in its own frame (measured unrotated, at the origin)
    o.position.set(0, 0, 0);
    o.rotation.y = 0;
    o.updateMatrixWorld(true);
    B3.setFromObject(o);
    const fz = B3.max.z,
      hx = B3.max.x;
    o.position.copy(p0);
    o.rotation.y = ry;
    o.updateMatrixWorld(true);
    const cs = Math.cos(ry),
      sn = Math.sin(ry),
      w = (lx, lz) => [p0.x + lx * cs + lz * sn, p0.z - lx * sn + lz * cs];
    each((m) => {
      if (at(m, C.x - 15, C.z + 9, 4.8)) {
        const [x, z] = w(0, fz + 0.2);
        m.position.set(x, 5.6, z);
        m.rotation.y = ry;
        unhide(m);
      }
    });
    for (let i = 0; i < 5; i++)
      each((m) => {
        if (!m.isMesh || !at(m, C.x - 16 + i * 0.5, C.z + 12)) return;
        const [x, z] = w(hx + 1, 1.2 - i * 0.5);
        m.position.set(x, 0.3 + (i % 2) * 0.4, z);
        m.rotation.order = "YXZ";
        m.rotation.set(0, ry, Math.PI / 2);
        unhide(m);
      });
  }

  // ---------- 2c. townsfolk: a few villagers per town walk between their front doors and the plaza ----------
  const FOLK = [];
  const FSPEC = {
    frost: [
      { robe: 0x3a5a8a, hat: "fur", hc: 0xeaf4ff, prop: "mug" },
      { robe: 0x6a7a9a, hat: "hood", hc: 0x2a3a5a, prop: "sack", beard: 0xdedede },
      { robe: 0x2f6a8a, hat: "cap", hc: 0xd8dce8 },
      { robe: 0x8a6a9a, hat: "fur", hc: 0xe8dcc8, prop: "cane" },
    ],
    ember: [
      { robe: 0x6a2a1a, hat: "band", hc: 0xffb040, prop: "hammer", apron: 0x3a2a2a },
      { robe: 0x8a4a2a, hat: "round", hc: 0x3a2010, prop: "sack", belly: 1 },
      { robe: 0x5a3a3a, hat: "hood", hc: 0x2a1a14 },
      { robe: 0xa0502a, hat: "cap", hc: 0x4a2418, prop: "mug" },
    ],
    marsh: [
      { robe: 0x2f5a44, hat: "hood", hc: 0x24382e, prop: "lamp" },
      { robe: 0x5a6a3a, hat: "round", hc: 0x3a4a2a, prop: "cane", beard: 0x9a9a8a },
      { robe: 0x3a4a5a, hat: "cap", hc: 0x2a3a34 },
    ],
  };
  const SKN = [0xf1c9a5, 0xd9a47a, 0xb07a52, 0x8a5a3a, 0xf6d8bc];
  function folk() {
    ZK.forEach((zk) => {
      const C = Z[zk],
        tw = C.town;
      if (!tw || !tw.pick.length) return;
      // spots: each house's doorstep, plaza points, the rim
      const doors = tw.pick.map((p) => ({ x: p.x + Math.sin(p.ry) * (HCB + 1), z: p.z + Math.cos(p.ry) * (HCB + 1) })),
        plaza = [];
      for (let k = 0; k < 10; k++) {
        const a = k * 0.628 + 0.3,
          r = 8 + (k % 3) * 3;
        plaza.push({ x: (tw.f0 || C).x + Math.cos(a) * r, z: (tw.f0 || C).z + Math.sin(a) * r });
      }
      FSPEC[zk].forEach((sp, k) => {
        const o = person(
          Object.assign(
            { w: 0.88 + 0.07 * (k % 3), trim: [0xe8e0d0, 0xffd27a, 0xb89aff][k % 3], skin: SKN[(k + 2) % 5] },
            sp,
          ),
        );
        o.scale.setScalar(0.76 + 0.05 * (k % 3));
        const d = doors[k % doors.length];
        o.position.set(d.x, 0, d.z);
        o.userData.vill = 2;
        S.add(o);
        FOLK.push({ o, zk, home: d, doors, plaza, w: null, pause: 1 + k * 1.3, out: false });
      });
    });
  }
  let flT = 0;
  function folkTick(now) {
    requestAnimationFrame(folkTick);
    const dt = Math.min(0.05, (now - (flT || now)) / 1000);
    flT = now;
    if (!FOLK.length || typeof mode === "undefined" || mode !== "explore" || paused) return;
    const p = W.position,
      s = now / 1000;
    for (const v of FOLK) {
      const C = Z[v.zk],
        q = v.o.position,
        far = Math.hypot(p.x - C.x, p.z - C.z) > 110;
      v.o.visible = !far;
      if (far) continue;
      const dpl = Math.hypot(p.x - q.x, p.z - q.z);
      let moving = false;
      if (v.pause > 0) v.pause -= dt;
      else if (dpl > 1.8) {
        if (!v.w || Math.hypot(v.w.x - q.x, v.w.z - q.z) < 0.4) {
          // door -> plaza -> (plaza | a door) : never straight from door to door, so nobody walks through a house
          const atDoor = v.doors.some((d) => Math.hypot(d.x - q.x, d.z - q.z) < 1);
          if (atDoor || Math.random() < 0.55) v.w = v.plaza[(Math.random() * v.plaza.length) | 0];
          else v.w = Math.random() < 0.5 ? v.home : v.doors[(Math.random() * v.doors.length) | 0];
          v.pause = 1.5 + Math.random() * 4;
        } else {
          const dx = v.w.x - q.x,
            dz = v.w.z - q.z,
            l = Math.hypot(dx, dz) || 1;
          q.x += (dx / l) * 1.25 * dt;
          q.z += (dz / l) * 1.25 * dt;
          moving = true;
          let df = Math.atan2(dx, dz) - v.o.rotation.y;
          df = Math.atan2(Math.sin(df), Math.cos(df));
          v.o.rotation.y += df * 0.15;
        }
      } else {
        let df = Math.atan2(p.x - q.x, p.z - q.z) - v.o.rotation.y;
        df = Math.atan2(Math.sin(df), Math.cos(df));
        v.o.rotation.y += df * 0.1;
      }
      const u = v.o.userData;
      v.ws = (v.ws || 0) + ((moving ? 1 : 0) - (v.ws || 0)) * Math.min(1, dt * 6);
      v.st = (v.st || 0) + dt * 7 * v.ws;
      const ph = v.st + q.x;
      let chat = null;
      if (!moving)
        for (const o of FOLK)
          if (o !== v && o.zk === v.zk && Math.hypot(o.o.position.x - q.x, o.o.position.z - q.z) < 3.5) chat = o;
      const lk = dpl < 7 ? [p.x, p.z] : chat ? [chat.o.position.x, chat.o.position.z] : null;
      if (lk) {
        let a = Math.atan2(lk[0] - q.x, lk[1] - q.z) - v.o.rotation.y;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        u.look = a;
        if (chat && !moving) v.o.rotation.y += a * Math.min(1, dt * 2) * 0.5;
      } else u.look = moving ? 0 : Math.sin(s * 0.3 + q.x) * 0.5;
      const talk = chat && Math.sin(s * 0.8 + q.x * 0.3) > 0;
      u.nod = (chat && !talk) || dpl < 2.5;
      try {
        personLife(v.o, s, dt);
        personBody(v.o, s, dt, v.ws, ph);
        const gest = talk ? Math.max(0, Math.sin(s * 3.1 + q.x)) : 0;
        if (u.AL && u.AR) {
          u.AL.rotation.x = Math.sin(ph) * 0.5 * v.ws - 0.9 * gest;
          u.AR.rotation.x = -Math.sin(ph) * 0.5 * v.ws - 0.6 * gest;
        }
      } catch (e) {}
      q.y = Math.abs(Math.sin(ph)) * 0.07 * v.ws;
    }
  }
  // the outfitter's page: the usual Goods/Gear tabs, then this zone's mount
  if (typeof panel === "function") {
    const pn0 = panel;
    panel = function (k, id) {
      const r = pn0.apply(this, arguments);
      try {
        if (k === "shop" && VS[id] && MNT && MNT.rows) {
          const L = $("pl");
          L.insertAdjacentHTML("beforeend", '<div class="sec">Mounts of ' + Z[VS[id]].n + "</div>");
          MNT.rows(L, 1, () => panel("shop", id), VS[id]);
        }
      } catch (e) {}
      return r;
    };
  }

  // ---------- 3. level tags and signposts ----------
  // v40b: nothing stands in the walkways. Each street's level hangs as a small tag under its arch's name board
  // (name board: 6 x 1.5 at y 6.6, ~1.3 toward the village); the village has one compact signpost on the plaza rim.
  const dunLv = (n) => {
    const m = /Lv (\d+)/.exec(n || "");
    return m ? +m[1] : 0;
  };
  function tag(p, C, lv) {
    const ax = C.x - p.x,
      az = C.z - p.z,
      L = Math.hypot(ax, az) || 1,
      g = new T.Group(),
      b = board(["Lv " + lv], 1.5, 0.55);
    g.add(b);
    [-0.55, 0.55].forEach((x) => g.add(mk(Cy(0.025, 0.025, 0.5, 4), 0x2a2438, x, 0.52, 0, 1)));
    g.position.set(p.x + (ax / L) * 1.4, 5.5, p.z + (az / L) * 1.4);
    g.rotation.y = facing(p.x, p.z, C.x, C.z);
    g.userData.vill = 1;
    S.add(g);
  }
  function plaques() {
    ZK.forEach((zk) => {
      const C = Z[zk],
        list = [];
      ZSTR.forEach((s, i) => {
        if (s[0] !== zk) return;
        const p = PT.find((q) => q.n === s[1] && Math.hypot(q.x - C.x, q.z - C.z) < RING + 10);
        if (!p) return;
        tag(p, C, stLv(i));
        list.push([stLv(i), s[1], p.x, p.z]);
      });
      PT.forEach((p) => {
        if (!/\(dungeon/.test(p.n || "") || Math.hypot(p.x - C.x, p.z - C.z) > RING + 10) return;
        list.push([dunLv(p.n), p.n.replace(/\s*\(dungeon.*$/, ""), p.x, p.z]);
      });
      if (C.shop) list.push([0, "Outfitter", C.shop.x, C.shop.z]);
      list.sort((a, b) => a[0] - b[0]);
      // a spot on the plaza rim, as far as possible from people, doors and anything solid
      let best = null;
      for (const r of [15, 16.5, 13.5])
        for (let k = 0; k < 36; k++) {
          const a = (k / 36) * Math.PI * 2,
            x = C.x + Math.cos(a) * r,
            z = C.z + Math.sin(a) * r;
          if (!okp(x, z)) continue;
          let cl = 99;
          solids.forEach((s) => (cl = Math.min(cl, Math.hypot(s.x - x, s.z - z) - s.r)));
          NPCS.forEach((n) => (cl = Math.min(cl, Math.hypot(n.x - x, n.z - z) - 3)));
          PT.forEach((p) => (cl = Math.min(cl, Math.hypot(p.x - x, p.z - z) - 6)));
          // and out of the lanes to the portals (town planner)
          if (C.town) C.town.lanes.forEach((l) => (cl = Math.min(cl, segD(x, z, ...l) - 5)));
          if (!best || cl > best.cl) best = { x, z, cl };
        }
      if (!best) return;
      const sx = best.x,
        sz = best.z,
        g = new T.Group(),
        H = 1.7 + list.length * 0.4;
      g.add(mk(Cy(0.07, 0.09, H, 8), 0x4a2f1b, 0, H / 2, 0, 1));
      g.add(mk(Sp(0.11, 8), 0xffd27a, 0, H + 0.06, 0, 1));
      list.forEach(([lv, nm, tx, tz], j) => {
        const t = nm + (lv ? "  " + lv : ""),
          w = Math.min(2.6, 0.7 + t.length * 0.085),
          arm = board([t], w, 0.32),
          p = new T.Group();
        arm.position.set(w / 2 + 0.08, 0, 0);
        p.add(arm);
        p.position.y = H - 0.25 - j * 0.4;
        p.rotation.y = Math.atan2(tx - sx, tz - sz) - Math.PI / 2;
        g.add(p);
      });
      g.position.set(sx, 0, sz);
      g.userData.vill = 1;
      S.add(g);
      const so = { x: sx, z: sz, r: 0.35 };
      solids.push(so);
      signSol.push(so);
    });
  }
  // the street signs show the area's current level, so they are redrawn when a story chapter finishes
  const signSol = [];
  function resign() {
    S.children
      .filter((c) => c.userData.vill === 1) // signs only (town houses and townsfolk are vill 2)
      .forEach((c) => {
        S.remove(c);
        c.traverse((m) => {
          if (m.material && m.material.map) m.material.map.dispose();
        });
      });
    signSol.splice(0).forEach((s) => {
      const i = solids.indexOf(s);
      if (i >= 0) solids.splice(i, 1);
    });
    plaques();
  }

  // ---------- 4. area levels: fixed per place, raised by the story ----------
  // Each place has a fixed level (zone streets: SFL; elsewhere the old tier/zone level). Every finished story chapter
  // (56-flow's FLOW.CH) raises every outdoor area by one. Your own level never changes a foe's level.
  // Dungeon interiors, the tower and preset levels (f.lv) are left alone.
  const story = () => {
    try {
      return FLOW.CH.filter((c) => c.q.every((i) => P.done[i])).length;
    } catch (e) {
      return 0;
    }
  };
  const stLv = (i) => Math.min(20, SFL[i] + story());
  if (typeof foeLv === "function") {
    const fl0 = foeLv;
    foeLv = function (f) {
      if (f && f.lv) return f.lv;
      let lv = fl0.apply(this, arguments);
      try {
        if (typeof BG === "undefined" || !g) return lv;
        const bx = BG.position.x,
          bz = BG.position.z,
          zn = zoneAt(bx, bz);
        // outdoors only: not the tower (z < -800), street dungeons (far north) or hub dungeons (z > 300)
        if (zn === "tower" || bz < -800 || bz > 300) return lv;
        const up = ((f && f.t) | 0) >= 4 || (f && f.boss) ? 1 : 0,
          si = Z[zn] ? zsIdx(bx, bz) : -1,
          base = si >= 0 && SFL[si] != null ? SFL[si] + up : Z[zn] ? Math.max(lv, Z[zn].fl + up) : lv;
        lv = Math.min(20, base + story());
      } catch (e) {}
      return lv;
    };
  }

  // ---------- 5. harder fights pay more ----------
  // reward (06) already pays by foe level and cuts XP for foes well under you; on top of that, every level a foe
  // stands above you adds 15% XP and glimmer (max +75%).
  const harder = (lv) => Math.min(1.75, 1 + 0.15 * Math.max(0, lv - P.lvl));
  {
    const rw0 = reward;
    reward = function (list) {
      let bx = 0,
        bg = 0;
      try {
        (list || []).forEach((f) => {
          const fl = f.lv || f.t || 1,
            k = harder(fl) - 1;
          if (k <= 0) return;
          const m = (f.min ? 0.5 : 1) * (f.el ? 2 : 1);
          bx += (10 + 8 * fl) * m * k;
          bg += (4 + 5 * fl) * m * k;
        });
      } catch (e) {}
      const r = rw0.apply(this, arguments);
      bx = Math.round(bx);
      bg = Math.round(bg);
      if (bx > 0) {
        P.xp += bx;
        P.gold += bg;
        toast("Tough fight bonus: +" + bx + " XP  +" + bg + " ✦", "#ffb35c");
        lvup();
        sv();
      }
      return r;
    };
  }

  // ---------- 6. quests pay by how hard they are ----------
  // A quest's level = its own lv, or its land's floor (+ story), or ★ = the level the story wants. It pays at least
  // 12% of your current level's XP (★ 25%), +15% per level the quest stands above you (max 1.8x), less when it's
  // far under you (min 0.5x).
  {
    const qd0 = qdone;
    qdone = function (i) {
      const q = QS[i],
        was = !!P.done[i],
        n0 = need(),
        lv0 = P.lvl;
      const r = qd0.apply(this, arguments);
      try {
        if (!was && q && P.done[i] && q.dn == null && !q.rl) {
          let ql = q.lv || 0;
          if (!ql && q.m) ql = (typeof FLOW !== "undefined" && FLOW.want && FLOW.want()) || lv0;
          if (!ql) ql = (Z[q.z] ? Z[q.z].fl : 1) + story();
          const mult = Math.max(0.5, Math.min(1.8, 1 + 0.15 * (ql - lv0))),
            want = Math.round(n0 * (q.m ? 0.25 : 0.12) * mult),
            extra = want - (q.x || 0),
            gx = Math.max(0, Math.round((20 + 12 * lv0) * mult - (q.g || 0)));
          if (extra > 5) {
            P.xp += extra;
            P.gold += gx;
            toast("Quest reward matched to your level: +" + extra + " XP" + (gx ? "  +" + gx + " ✦" : ""), "#c9b8ff");
            lvup();
            sv();
            ui();
          }
        }
      } catch (e) {}
      return r;
    };
  }

  // ---------- build (after everything else has run its load passes) ----------
  let built = 0;
  function build() {
    if (built) return;
    built = 1;
    try {
      VILL.hidden = tidy();
    } catch (e) {
      console.error("VILL tidy", e);
    }
    try {
      outfitters();
    } catch (e) {
      console.error("VILL outfitters", e);
    }
    try {
      town();
    } catch (e) {
      console.error("VILL town", e);
    }
    try {
      ZK.forEach(pave);
      dressFrost();
    } catch (e) {
      console.error("VILL streets", e);
    }
    try {
      folk();
      requestAnimationFrame(folkTick);
    } catch (e) {
      console.error("VILL folk", e);
    }
    let sn = story();
    try {
      plaques();
    } catch (e) {
      console.error("VILL plaques", e);
    }
    // redraw the level signs when the story moves on (or another character is loaded)
    setInterval(() => {
      const n = story();
      if (n === sn) return;
      sn = n;
      try {
        resign();
      } catch (e) {}
    }, 2000);
  }
  if (document.readyState === "complete") setTimeout(build, 0);
  else addEventListener("load", () => setTimeout(build, 0));
  return { Z, SFL, VS, build, story, stLv, harder };
})();
