// DUSKWICK - 65-meadows.js (v43, loads LAST): the look of the hub's East / West Lane and the two meadows.
// Only top-level name: MEADOW. The lanes and meadows themselves (where you can walk, names, levels, wall gaps, the two
// square houses moved out beside the lanes) are in 03-world.js: HLN, HMD, hlHit, hmIn, hlOpen, SQH / SQOUT.
// Runs once on window load (after the editor's BASE snapshot, the town wall and 61's town planner), so everything here
// is appended to the scene and never shifts saved editor builds:
//  1) Clearing: scenery that now stands on walkable lane / meadow ground is put away. Instanced pieces are squashed to
//     zero scale (like 61), small plain meshes hidden, and the solids / colliders under them dropped. Never touched:
//     anything within 3 of a lamp, lore stone, chest, NPC, foe or portal, any house, the town wall, ground sheets.
//  2) Ground: dirt lanes with grass verges (road ribbons) and soft-edged meadow grass (radial-alpha discs).
//  3) Props (fixed hash, the same for everybody): lantern posts along the lanes (emissive heads, no lights), wildflowers
//     and grass tufts in the meadows, a few boulders (solids) and a bench at each meadow's heart, name boards at the
//     lane mouths, and a faint ward across a lane's glade end while that glade is still behind a story ward.
// No foes, no save fields, no NET. MEADOW.stats = what the clearing did.
const MEADOW = { stats: null };
(() => {
  const LOW = typeof GFX !== "undefined" && GFX === "low";
  const hs = (x, z, k) => {
    const h = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
    return h - Math.floor(h);
  };
  // walkable new ground, local coords, with margin m (lane always counted open here)
  const onNew = (lx, lz, m) => {
    for (const t of HLN) {
      const q = rdNear(t, lx, lz);
      if (q && q.d <= t.w + m) return true;
    }
    return HMD.some((c) => Math.hypot(lx - c[0], lz - c[1]) <= c[2] + m);
  };
  const flat = (c, f) => {
    const m = M(c, 1);
    m.polygonOffset = true;
    m.polygonOffsetFactor = m.polygonOffsetUnits = f;
    m.userData.dtx = "ground";
    return m;
  };

  // ---------------------------------------------------------------------------------------------------------------
  // 1. clearing
  // ---------------------------------------------------------------------------------------------------------------
  function clearing(G) {
    const keep = new Set(),
      keepAt = [];
    const grab = (o) => o && o.isObject3D && o.traverse((c) => keep.add(c));
    const lists = [LAMPS, LS, CHESTS, NPCS, foes, PT, HOUSES];
    lists.forEach((L) =>
      (L || []).forEach((e) => {
        if (!e) return;
        for (const k in e) grab(e[k]);
        const p = e.o && e.o.position ? e.o.position : e;
        if (typeof p.x === "number" && typeof p.z === "number") keepAt.push([p.x, p.z]);
      }),
    );
    grab(W);
    grab(G);
    if (typeof BG !== "undefined") grab(BG);
    const kept = (x, z) => keepAt.some((p) => Math.abs(p[0] - x) < 3 && Math.abs(p[1] - z) < 3);
    const gone = [];
    let inst = 0,
      mesh = 0;
    const m4 = new T.Matrix4(),
      v = new T.Vector3(),
      zero = new T.Matrix4().makeScale(0, 0, 0),
      bx = new T.Box3();
    const inArea = (x, z) => {
      const lx = x - OX,
        lz = z - OZ;
      if (RDS.some((R) => Math.hypot(lx - R.gx, lz - R.gz) < 22)) return false; // glades and their camps
      return Math.abs(lx) > 30 && Math.abs(lx) < 300 && lz < 12 && lz > -230;
    };
    S.updateMatrixWorld(true);
    const rec = (o) => {
      if (keep.has(o) || (o.userData && (o.userData.lus || o.userData.wdr || o.userData.mdw))) return;
      if (o.isLight || o.isSprite || o.isPoints) return;
      if (o.isInstancedMesh) {
        let ch = 0;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m4);
          m4.premultiply(o.matrixWorld);
          v.setFromMatrixPosition(m4);
          if (!inArea(v.x, v.z) || !onNew(v.x - OX, v.z - OZ, 1) || kept(v.x, v.z)) continue;
          // big pieces (hills, ground patches) stay
          const sc = Math.max(m4.elements[0], m4.elements[5], m4.elements[10]);
          if (sc > 9) continue;
          o.setMatrixAt(i, zero);
          gone.push([v.x, v.z]);
          ch = 1;
          inst++;
        }
        if (ch) o.instanceMatrix.needsUpdate = true;
        return;
      }
      if (o.isMesh && o.geometry && o.visible) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        bx.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        const sx = bx.max.x - bx.min.x,
          sy = bx.max.y - bx.min.y,
          sz = bx.max.z - bx.min.z,
          x = (bx.min.x + bx.max.x) / 2,
          z = (bx.min.z + bx.max.z) / 2;
        // (raised parts, like a gatehouse's top over the lane, are left alone)
        if (
          sx < 10 &&
          sz < 10 &&
          sy > 0.4 &&
          bx.min.y < 2 &&
          inArea(x, z) &&
          onNew(x - OX, z - OZ, 0.5) &&
          !kept(x, z)
        ) {
          o.visible = false;
          o.userData.mdwHid = 1;
          gone.push([x, z]);
          mesh++;
          return;
        }
      }
      for (let i = 0; i < o.children.length; i++) rec(o.children[i]);
    };
    rec(S);
    // solids / colliders that stood under something put away (house colliders carry hs and are kept)
    const near = (x, z, r) => gone.some((p) => Math.abs(p[0] - x) < r + 1.2 && Math.abs(p[1] - z) < r + 1.2);
    let sol = 0,
      cb = 0;
    for (let i = solids.length - 1; i >= 0; i--) {
      const s = solids[i];
      if (inArea(s.x, s.z) && onNew(s.x - OX, s.z - OZ, 0) && near(s.x, s.z, s.r || 1) && !kept(s.x, s.z)) {
        solids.splice(i, 1);
        sol++;
      }
    }
    for (let i = CB.length - 1; i >= 0; i--) {
      const c = CB[i];
      if (c.hs || typeof c.x !== "number") continue;
      if (inArea(c.x, c.z) && onNew(c.x - OX, c.z - OZ, 0) && near(c.x, c.z, c.r || 1) && !kept(c.x, c.z)) {
        CB.splice(i, 1);
        cb++;
      }
    }
    MEADOW.stats = { instances: inst, meshes: mesh, solids: sol, colliders: cb };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // 2. ground
  // ---------------------------------------------------------------------------------------------------------------
  const SOFT = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d"),
      g = x.createRadialGradient(64, 64, 0, 64, 64, 63);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.72, "rgba(255,255,255,.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  })();
  function ground(G) {
    // meadow grass: soft-edged discs a little wider than the walkable circle
    HMD.forEach(([x, z, r], k) => {
      const m = new T.MeshLambertMaterial({
        color: k % 2 ? 0x4f7a3e : 0x5a8444,
        map: SOFT,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      m.userData.dtx = 0;
      const d = new T.Mesh(new T.CircleGeometry(r + 8, 40), m);
      d.rotation.x = -Math.PI / 2;
      d.position.set(OX + x, 0.02, OZ + z);
      d.renderOrder = -1;
      G.add(d);
    });
    // lanes: grass verges, then the dirt on top
    const verge = flat(0x4a6e38, -3),
      dirt = flat(0x8a7356, -5),
      ruts = flat(0x6e5a44, -6);
    HLN.forEach((t) => {
      [
        [-t.w, t.w, 0.03, verge],
        [-3.4, 3.4, 0.04, dirt],
        [-1.9, -1.3, 0.05, ruts],
        [1.3, 1.9, 0.05, ruts],
      ].forEach(([a, b, y, mt]) => {
        const r = rdRibbon(t, a, b, y, mt, 6);
        S.remove(r);
        G.add(r);
      });
    });
  }

  // ---------------------------------------------------------------------------------------------------------------
  // 3. props
  // ---------------------------------------------------------------------------------------------------------------
  const IQ = new T.Object3D();
  function inst(G, geo, mat, L) {
    if (!L.length) return;
    const im = new T.InstancedMesh(geo, mat, L.length);
    L.forEach((q, i) => {
      IQ.position.set(q[0], q[1], q[2]);
      IQ.rotation.set(q[5] || 0, q[4] || 0, 0);
      const s = q[3] || 1;
      IQ.scale.set(s * (q[6] || 1), s * (q[7] || 1), s * (q[8] || 1));
      IQ.updateMatrix();
      im.setMatrixAt(i, IQ.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false; // r128 culls instanced meshes by the first instance; the hub is never far
    G.add(im);
  }
  function label(txt) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const x = c.getContext("2d");
    x.font = "800 40px Georgia,serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.lineWidth = 9;
    x.strokeStyle = "rgba(20,12,6,.9)";
    x.strokeText(txt, 256, 48);
    x.fillStyle = "#ffe2a0";
    x.fillText(txt, 256, 48);
    const sp = new T.Sprite(
      new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }),
    );
    sp.scale.set(5, 0.94, 1);
    return sp;
  }
  const WARD = [];
  // distance from a local point to the lane on its side of town (cx = that side's meadow x)
  const laneD = (cx, lx, lz) => {
    const q = rdNear(HLN[cx > 0 ? 0 : 1], lx, lz);
    return q ? q.d : 1e9;
  };
  function props(G) {
    const posts = [],
      heads = [],
      flowers = [[], [], []],
      tufts = [],
      rocks = [];
    // lantern posts along each lane, alternating sides, clear of the square and the wall gap
    HLN.forEach((t) => {
      let side = 1;
      for (let s = 34; s < t.L - 20; s += 30) {
        const [x, z, hx, hz] = rdAt(t, s),
          o = side * (t.w + 0.9),
          wx = OX + x - hz * o,
          wz = OZ + z + hx * o;
        side = -side;
        if (Math.abs(x) < 42) continue;
        posts.push([wx, 1.6, wz, 1]);
        heads.push([wx, 3.35, wz, 1]);
        solids.push({ x: wx, z: wz, r: 0.4 });
      }
    });
    // meadows: flowers and tufts scattered over the grass (not on a lane), boulders near the rim
    const FC = [0xffd27a, 0xd8a0ff, 0xff9a8a];
    HMD.forEach(([cx, cz, r], k) => {
      const n = Math.round(r * r * (LOW ? 0.08 : 0.16));
      for (let i = 0; i < n; i++) {
        const a = hs(cx, cz, i * 3 + 1) * 6.283,
          d = Math.sqrt(hs(cx, cz, i * 3 + 2)) * (r - 1),
          lx = cx + Math.cos(a) * d,
          lz = cz + Math.sin(a) * d;
        if (laneD(cx, lx, lz) < 7.5) continue;
        const x = OX + lx,
          z = OZ + lz,
          p = hs(x, z, 9);
        if (p < 0.55) flowers[i % 3].push([x, 0.32, z, 0.8 + p * 0.6]);
        else tufts.push([x, 0.35, z, 0.7 + p * 0.5, p * 6.283]);
      }
      // two or three boulders on the rim
      for (let j = 0; j < 3; j++) {
        const a = hs(cx, cz, 40 + j) * 6.283,
          lx = cx + Math.cos(a) * (r - 4),
          lz = cz + Math.sin(a) * (r - 4);
        if (laneD(cx, lx, lz) < 10) continue;
        const s = 0.9 + hs(lx, lz, 5) * 0.8;
        rocks.push([OX + lx, 0.5 * s, OZ + lz, s, a, 0.3]);
        solids.push({ x: OX + lx, z: OZ + lz, r: 1.2 * s });
      }
    });
    inst(G, Cy(0.09, 0.12, 3.2, 6), M(0x3a2c22, 1), posts);
    const hm = M(0xffd27a, 1);
    hm.emissive.setHex(0xffb040);
    hm.emissiveIntensity = 1.2;
    inst(G, Sp(0.26, 8), hm, heads);
    FC.forEach((c, k) => {
      const m = M(c, 1);
      m.emissive.setHex(c);
      m.emissiveIntensity = 0.25;
      inst(G, Sp(0.16, 6), m, flowers[k]);
    });
    inst(G, Cn(0.18, 0.8, 5), M(0x6a9a4a, 1), tufts);
    let rg;
    try {
      rg = GEOX.rock(1.2);
    } catch (e) {
      rg = new T.DodecahedronGeometry(1.2, 0);
    }
    inst(G, rg, M(0x7a7682, 1), rocks);
    // a bench at the heart of the middle meadow on each side
    [HMD[1], HMD[4]].forEach(([cx, cz]) => {
      const b = new T.Group(),
        wd = M(0x6a4a30, 1);
      const seat = new T.Mesh(B(2.6, 0.14, 0.7), wd);
      seat.position.y = 0.55;
      const back = new T.Mesh(B(2.6, 0.6, 0.1), wd);
      back.position.set(0, 0.95, -0.32);
      b.add(seat, back);
      [-1.1, 1.1].forEach((x) => {
        const l = new T.Mesh(B(0.14, 0.55, 0.6), wd);
        l.position.set(x, 0.27, 0);
        b.add(l);
      });
      b.position.set(OX + cx + 6, 0, OZ + cz + 6);
      b.rotation.y = Math.atan2(-6, -6);
      G.add(b);
      solids.push({ x: OX + cx + 6, z: OZ + cz + 6, r: 1.2 });
    });
    // name boards where each lane leaves the square
    HLN.forEach((t) => {
      const [x, z, hx, hz] = rdAt(t, 6),
        sd = t.g ? 1 : -1,
        wx = OX + x - hz * (t.w + 0.6) * sd,
        wz = OZ + z + hx * (t.w + 0.6) * sd;
      const p = new T.Mesh(B(0.18, 3, 0.18), M(0x3a2c22, 1));
      p.position.set(wx, 1.5, wz);
      G.add(p);
      solids.push({ x: wx, z: wz, r: 0.4 });
      const lb = label(t.n.toUpperCase());
      lb.position.set(wx, 3.4, wz);
      G.add(lb);
    });
    // the glade-end ward (shown while hlOpen says no)
    HLN.forEach((t) => {
      const [x, z, hx, hz] = rdAt(t, t.L - 40),
        m = new T.Mesh(
          new T.PlaneGeometry(t.w * 2 + 1, 3.2),
          new T.MeshBasicMaterial({
            color: 0xb070ff,
            transparent: true,
            opacity: 0.35,
            side: T.DoubleSide,
            depthWrite: false,
            blending: T.AdditiveBlending,
          }),
        );
      m.position.set(OX + x, 1.6, OZ + z);
      m.rotation.y = Math.atan2(hx, hz);
      m.visible = false;
      G.add(m);
      WARD.push({ t, m });
    });
  }

  function build() {
    const G = new T.Group();
    G.name = "meadows";
    G.userData.mdw = 1;
    try {
      clearing(G);
    } catch (e) {
      console.warn("meadows: clearing", e);
    }
    try {
      ground(G);
      props(G);
    } catch (e) {
      console.warn("meadows: build", e);
    }
    S.add(G);
    MEADOW.G = G;
    setInterval(() => {
      for (const w of WARD) {
        const lk = LKON && !hlOpen(w.t);
        w.m.visible = lk;
        if (lk) w.m.material.opacity = 0.25 + 0.12 * Math.sin(performance.now() / 400);
      }
    }, 120);
  }
  if (document.readyState === "complete") setTimeout(build, 0);
  else addEventListener("load", () => setTimeout(build, 0));
})();
