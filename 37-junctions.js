// v29b junctions: blends every road/trail end into the place it meets (square, Market Lane, glades, zone villages, street
// plazas) with soft ground patches, low edging stones and a few entrance props. Everything is non-solid, deterministic,
// and merged into a handful of meshes (one per material). Only top-level name: JNX.
const JNX = (() => {
  const dum = new T.Object3D(),
    bins = {},
    pm = {},
    hash = (a, b) => {
      const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
  let blob = null,
    sfx = ""; // v43: "|s<i>" while building zone street i's pieces, so each street gets its own meshes (OPENR.move)
  const put = (key, geo, x, y, z, yaw, sx, sy, sz) => {
    key += sfx;
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    dum.position.set(x, y, z);
    dum.rotation.set(0, yaw || 0, 0);
    dum.scale.set(sx || 1, sy || 1, sz || 1);
    dum.updateMatrix();
    g.applyMatrix4(dum.matrix);
    (bins[key] || (bins[key] = [])).push(g);
  };
  const flush = () => {
    for (const bk in bins) {
      const L = bins[bk],
        key = bk.split("|")[0];
      let n = 0;
      L.forEach((g) => (n += g.attributes.position.count));
      const pos = new Float32Array(n * 3),
        nor = new Float32Array(n * 3),
        uv = new Float32Array(n * 2);
      let o = 0;
      L.forEach((g) => {
        const c = g.attributes.position.count;
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
        o += c;
      });
      const G = new T.BufferGeometry();
      G.setAttribute("position", new T.BufferAttribute(pos, 3));
      G.setAttribute("normal", new T.BufferAttribute(nor, 3));
      G.setAttribute("uv", new T.BufferAttribute(uv, 2));
      let mat;
      if (key[0] === "p") {
        // soft ground patch: tinted, radial alpha
        const c = +key.slice(1);
        mat =
          pm[c] ||
          (pm[c] = new T.MeshToonMaterial({
            color: c,
            map: blob,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            gradientMap: GR,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -4,
          }));
      } else if (key === "glow") mat = new T.MeshBasicMaterial({ color: 0xffc860 });
      else mat = M(+key);
      const m = new T.Mesh(G, mat);
      m.userData.jnx = 1;
      m.userData.jnxk = bk.split("|")[1] || ""; // v45: "s<i>" street, "z<zone>" village, "t<i>" trail, "" the rest
      if (key[0] === "p") m.renderOrder = 1;
      S.add(m);
    }
  };
  const run = () => {
    // radial alpha texture for the patches
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const cx = cv.getContext("2d"),
      gr = cx.createRadialGradient(32, 32, 4, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.55, "rgba(255,255,255,0.8)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = gr;
    cx.fillRect(0, 0, 64, 64);
    blob = new T.CanvasTexture(cv);
    const PL = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      BX = new T.BoxGeometry(1, 1, 1),
      PB = B(1, 1, 1),
      CYL = Cy(1, 1, 1, 8),
      SPH = Sp(1, 8);
    const WOOD = 0x5a4030,
      STONE = 0x8a8a92,
      DARK = 0x2a2a30,
      HUBD = 0x6a5240,
      ZD = { frost: 0xaab4c8, ember: 0x4a3430, marsh: 0x4a5238 };
    // patch centred (x,z), long axis along (dx,dz)
    // v29c: ground patches switched off (they read as big orange smears under the sunset light)
    const patch = () => {};
    // one edging stone row along a road between s0..s1 at sideways offset off
    const stones = (R, s0, s1, off, step) => {
      s0 = Math.max(0, s0);
      s1 = Math.min(R.L, s1);
      for (let s = s0, i = 0; s <= s1; s += step, i++) {
        const [x, z] = rdAt(R, s),
          a = rdAt(R, s - 1.5),
          b = rdAt(R, s + 1.5),
          l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
          hx = (b[0] - a[0]) / l,
          hz = (b[1] - a[1]) / l,
          h = hash(s, off),
          o = off + (h - 0.5) * 0.5;
        put(
          "" + STONE,
          BX,
          OX + x - hz * o,
          0.17,
          OZ + z + hx * o,
          Math.atan2(-hz, hx) + (h - 0.5) * 0.4,
          1 + h * 0.6,
          0.34 + h * 0.12,
          0.7,
        );
      }
    };
    // straight row of stones from (x0,z0) to (x1,z1) (world)
    const row = (x0, z0, x1, z1, step) => {
      const l = Math.hypot(x1 - x0, z1 - z0),
        n = Math.max(1, Math.floor(l / step));
      for (let i = 0; i <= n; i++) {
        const t = i / n,
          h = hash(x0 + i, z0 + t * 7);
        put(
          "" + STONE,
          BX,
          x0 + (x1 - x0) * t,
          0.17,
          z0 + (z1 - z0) * t,
          Math.atan2(-(z1 - z0), x1 - x0) + (h - 0.5) * 0.4,
          1 + h * 0.6,
          0.34 + h * 0.12,
          0.7,
        );
      }
    };
    const lamp = (x, z) => {
      put("" + DARK, CYL, x, 1.7, z, 0, 0.13, 3.4, 0.13);
      put("" + DARK, PB, x, 3.45, z, 0, 0.7, 0.12, 0.7);
      put("glow", SPH, x, 3.2, z, 0, 0.3, 0.38, 0.3);
    };
    const sign = (x, z, yaw) => {
      put("" + WOOD, CYL, x, 1.4, z, 0, 0.12, 2.8, 0.12);
      put("" + WOOD, PB, x, 2.5, z, yaw + 0.15, 1.7, 0.4, 0.1);
      put("" + WOOD, PB, x, 1.95, z, yaw - 0.35, 1.5, 0.36, 0.1);
    };
    // gate pair across a path at (x,z) heading (dx,dz), half gap hw; stone pillars with lantern caps
    const gateway = (x, z, dx, dz, hw) => {
      [-1, 1].forEach((k) => {
        const px = x - dz * hw * k,
          pz = z + dx * hw * k;
        put("" + STONE, PB, px, 1.6, pz, 0, 0.95, 3.2, 0.95);
        put("" + STONE, PB, px, 3.3, pz, 0, 1.3, 0.3, 1.3);
        put("glow", SPH, px, 3.75, pz, 0, 0.26, 0.34, 0.26);
      });
    };
    // beside the road at (x,z): lamp on one side, sign on the other
    const side = (x, z, dx, dz, off, yaw) => {
      lamp(x - dz * off, z + dx * off);
      sign(x + dz * off, z - dx * off, yaw);
    };
    const end = (R, atEnd) => {
      const s = atEnd ? R.L : 0,
        [x, z] = rdAt(R, s),
        a = rdAt(R, s - 1.5),
        b = rdAt(R, s + 1.5),
        l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
        hx = ((b[0] - a[0]) / l) * (atEnd ? 1 : -1),
        hz = ((b[1] - a[1]) / l) * (atEnd ? 1 : -1);
      return { x: OX + x, z: OZ + z, hx, hz };
    };
    // v29c: edging stones off (pale blocks along the roads looked out of place); row() is still used at zone villages
    const both = () => {};

    // ---- town hub: Gloomway mouth at the square, Market Lane plaza, the two forks, glade ends ----
    patch(OX, OZ - 21, 0, -1, 20, SW * 2 + 12, HUBD);
    gateway(OX, OZ - 23, 0, -1, SW + 2.4);
    for (const sg of [-1, 1]) {
      // v29c: no edging stones along Gloomway (they cluttered the main street)
      // plaza lamps at the four diagonals
      lamp(OX + sg * 11.5, OZ + MLZ - 11.5);
      lamp(OX + sg * 11.5, OZ + MLZ + 11.5);
    }
    sign(OX + SW + 3, OZ + MLZ + MLR + 5, -0.5);
    sign(OX - SW - 3, OZ + MLZ - MLR - 5, 2.6);
    // forks (Hollow east, Ashen west): blend where the road leaves Gloomway; stones start past the junction
    [0, 1].forEach((i) => {
      const R = RDS[i],
        sg = i ? -1 : 1;
      patch(OX + sg * (SW + 6), OZ + (i ? AZ : HZ), sg, 0, 18, RDW * 2 + 8, HUBD);
      both(R, 14, 42, RDW + 0.5);
      lamp(OX + sg * (SW + 3), OZ + (i ? AZ : HZ) + RDW + 2);
      sign(OX + sg * (SW + 3), OZ + (i ? AZ : HZ) - RDW - 2, sg > 0 ? 0.3 : 2.9);
      // glade end, where the trail takes over
      const e = end(R, 1);
      patch(e.x + e.hx * 6, e.z + e.hz * 6, e.hx, e.hz, 22, RDW * 2 + 8, HUBD);
      both(R, R.L - 34, R.L - 4, RDW + 0.5);
      side(e.x + e.hx * 2, e.z + e.hz * 2, e.hx, e.hz, RDW + 2.5, Math.atan2(-e.hz, e.hx));
    });

    // ---- trails between zones ----
    TRL.forEach((t, ti) => {
      sfx = "|t" + ti; // v45: each trail's pieces in their own meshes (the re-layout puts the old trails away)
      const a = end(t, 0),
        z = end(t, 1);
      patch(
        a.x - a.hx * 2,
        a.z - a.hz * 2,
        a.hx,
        a.hz,
        22,
        RDW * 2 + 8,
        t.c0 === 0x2f5f4c ? HUBD : t.c0 === 0x9fb0c8 ? ZD.frost : HUBD,
      );
      patch(
        z.x + z.hx * 2,
        z.z + z.hz * 2,
        z.hx,
        z.hz,
        22,
        RDW * 2 + 8,
        t.c1 === 0x9fb0c8 ? ZD.frost : t.c1 === 0x3a2a2c ? ZD.ember : ZD.marsh,
      );
      both(t, 10, 36, RDW + 0.5);
      both(t, t.L - 36, t.L - 6, RDW + 0.5);
      gateway(z.x - z.hx * 4, z.z - z.hz * 4, z.hx, z.hz, RDW + 2);
      sfx = "";
    });

    // ---- zone villages: the short walk out to each street's loading arch ----
    // v45: each village's pieces go in their own meshes ("|z<zone>"), so the re-layout (64a-zonemove.js) can move them
    // with their land (a mesh whose box sits inside a moving land is shifted with it)
    ZRD.forEach((t) => {
      if (t.i === undefined) {
        // in-zone link (trail end into the village)
        const a = end(t, 0),
          z = end(t, 1);
        sfx = "|z" + t.zk;
        patch(a.x, a.z, a.hx, a.hz, 20, RDW * 2 + 6, ZD[t.zk]);
        patch(z.x, z.z, z.hx, z.hz, 20, RDW * 2 + 6, ZD[t.zk]);
        sfx = "";
        return;
      }
      const c = ZCEN[t.zk],
        mx = t.mo[0],
        mz = t.mo[1],
        r = ZVR[t.zk],
        ex = c[0] + mx * r,
        ez = c[1] + mz * r;
      // village edge -> stub walk: blend patch, edge stones, posts and lamp
      sfx = "|z" + t.zk;
      patch(ex + mx * 2, ez + mz * 2, mx, mz, 16, ZSW * 2 + 9, ZD[t.zk]);
      sfx = "";
      if (0)
        for (const sg of [-1, 1])
          row(
            ex - mz * sg * (ZSW + 0.5),
            ez + mx * sg * (ZSW + 0.5),
            ex + mx * ZSB - mz * sg * (ZSW + 0.5),
            ez + mz * ZSB + mx * sg * (ZSW + 0.5),
            1.8,
          );
      // v40b: no extra gate pillars / lamp / sign here (the loading arch already has walls and lamps; they crowded
      // the way in), and none at the street start either
      // street start (just beyond its entry arch) and the landmark plaza end
      const X = t.X;
      sfx = "|s" + t.i;
      patch(X, -8, 0, -1, 16, RDW * 2 + 8, ZD[t.zk]);
      both(t, 8, 34, RDW + 0.5);
      patch(X, -ZSL + ZCR + 3, 0, -1, 20, RDW * 2 + 10, ZD[t.zk]);
      const L = t.L;
      both(t, L - ZCR - 30, L - ZCR - 3, RDW + 0.5);
      gateway(X, -ZSL + ZCR + 4, 0, -1, RDW + 2.2);
      sfx = "";
    });
    flush();
  };
  try {
    run();
  } catch (e) {
    console.warn("junctions skipped", e);
  }
  return { run };
})();
