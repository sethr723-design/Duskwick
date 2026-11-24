// DUSKWICK - 63-wilds.js (v43, loads LAST): make the whole world feel as joined-up as the Starfall Reach.
// Only top-level name: WILDS.
//  1) Mist crossings: stepping into a loading arch, door or swirl (any PT entry walk() teleports you through) no longer
//     cuts straight to the other side. A veil in the current fog colour thickens for a moment, you come out on the far
//     side, and the mist (now in the new place's fog colour) thins away. Other tp() callers (Book travel, friends,
//     dungeon line-ups) are untouched. The lock check runs once, exactly like tp() in 11-explore.js.
//  2) Edge woods: like the Reach's scenery bands, the empty ground just past every walkable edge (village rims, streets,
//     roads, trails) gets a band of zone-styled scenery, so the edge reads as woods/rocks instead of an invisible wall.
//     Low shrubs and stones 2.4-5 out, trees and big rocks 5-15 out. Only fills GAPS: every spot must pass WONDR.clear
//     (solids + existing tall scenery), so places that are already dressed stay as they are. Never on anything walkable
//     (locked roads/trails count as walkable, LKON off while sampling), so no gameplay change and no solids.
//     Built lazily in 64-unit chunks near the camera (a few ms per frame), hidden by distance/facing like 42's verges.
//     Fixed hash placement: the same for everybody. Skips the Reach (own bands), dungeons, tower, shop rooms, the
//     inside of the town wall and the editor build area. Thinner on Low.
// Setting duskwick_wilds {m: mist, e: edge woods} (both on by default); WILDS.set("m"|"e", 0|1) from the console.
const WILDS = {};
(() => {
  const LOW = typeof GFX !== "undefined" && GFX === "low";
  let cfg = { m: 1, e: 1 };
  try {
    Object.assign(cfg, JSON.parse(localStorage.getItem("duskwick_wilds") || "{}"));
  } catch (e) {}
  cfg.m = 0; // v46c: the mist veil over portal crossings is gone (portals cut straight across again)
  WILDS.cfg = cfg;
  WILDS.set = (k, v) => {
    cfg[k] = v ? 1 : 0;
    try {
      localStorage.setItem("duskwick_wilds", JSON.stringify(cfg));
    } catch (e) {}
    if (k === "e") for (const g of CH.values()) if (g) g.visible = false;
  };

  // =================================================================================================================
  // 1. MIST CROSSINGS
  // =================================================================================================================
  const veil = document.createElement("div");
  veil.style.cssText = "position:fixed;inset:0;pointer-events:none;opacity:0;z-index:1;will-change:opacity";
  const fogCss = () => "#" + (S.fog ? S.fog.color.getHexString() : "000000");
  const paint = () => {
    const c = fogCss();
    veil.style.background = "radial-gradient(ellipse at 50% 58%," + c + "d0 0%," + c + "f2 45%," + c + " 80%)";
  };
  const attach = () => {
    if (veil.parentNode) return;
    const cv = R && R.domElement;
    if (cv && cv.parentNode) cv.parentNode.insertBefore(veil, cv.nextSibling);
    else document.body.appendChild(veil);
  };
  let busy = 0;
  const tp0 = tp;
  tp = function (q) {
    if (!q) return;
    if (busy) return;
    if (!cfg.m || !PT.includes(q) || mode !== "explore") return tp0(q);
    // same lock handling as tp() (evaluated once: some locks, like the dungeon door line-up, move you when they say no)
    if (q.lock) {
      const m = q.lock();
      if (m) {
        if (!q.warned) {
          q.warned = 1;
          toast(m);
          setTimeout(() => {
            q.warned = 0;
          }, 3000);
        }
        return;
      }
    }
    busy = 1;
    attach();
    paint();
    veil.style.transition = "opacity .3s ease-in";
    veil.style.opacity = "1";
    const go = Object.assign({}, q, { lock: null });
    setTimeout(() => {
      try {
        if (mode === "explore") tp0(go);
      } catch (e) {
        console.error(e);
      }
      // the far side's fog colour is set by theme() inside tp(); let one frame pass, then thin the mist
      requestAnimationFrame(() => {
        paint();
        veil.style.transition = "opacity .7s ease-out";
        veil.style.opacity = "0";
        setTimeout(() => (busy = 0), 250);
      });
    }, 300);
  };

  // =================================================================================================================
  // 2. EDGE WOODS
  // =================================================================================================================
  const hs = (x, z, k) => {
    const h = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
    return h - Math.floor(h);
  };
  // places that stay as they are
  const bare = (x, z) => {
    if (z > 100 || z < -800) return 1; // shop rooms, old dungeons, tower
    if (Math.abs(x) > 1400 && Math.abs(x) < 2900 && z < -1300) return 1; // street dungeons
    if (REACH && REACH.inR && REACH.inR(x, z)) return 1; // the Reach has its own bands
    if (x > 1740 && x < 2060 && z < -330 && z > -1170) return 1;
    const lx = x - OX,
      lz = z - OZ;
    if (Math.abs(lx) < 44 && lz > -322 && lz < 34) return 1; // inside the town wall
    if (Math.abs(lx) < 70 && z > -385 && z < -225) return 1; // the editor builds south of the square
    return 0;
  };
  // ---- kinds: shared geometry + material ----
  let G = null;
  const MAT = {};
  function geos() {
    if (G) return G;
    let fir, bush, rock;
    try {
      fir = GEOX.fir(2.2, 9);
      bush = GEOX.bush(1);
      rock = GEOX.rock(1.2);
    } catch (e) {
      fir = new T.ConeGeometry(2.2, 9, 7);
      bush = new T.IcosahedronGeometry(1, 0);
      rock = new T.DodecahedronGeometry(1.2, 0);
    }
    return (G = { fir, bush, rock, trunk: Cy(0.28, 0.42, 2.6, 7), reed: Cn(0.12, 1.6, 5) });
  }
  const mat = (c, em) => {
    const k = c + ":" + (em || 0);
    if (MAT[k]) return MAT[k];
    const m = M(c, 1);
    if (em) {
      m.emissive.setHex(em);
      m.emissiveIntensity = 0.8;
    }
    return (MAT[k] = m);
  };
  // entry: [x, y, z, s, ry, rx, sx, sy, sz]
  function dress(B, zk, near, x, z, r1, r2) {
    const put = (g, c, q, em) => {
      const k = g + ":" + c + ":" + (em || 0);
      (B[k] || (B[k] = { g, c, em, L: [] })).L.push(q);
    };
    const s = 0.8 + r2 * 0.7,
      ry = r1 * 6.283;
    if (zk === "frost") {
      if (near) {
        if (r1 < 0.6) put("bush", 0xdde8ef, [x, 0.35 * s, z, s, ry, 0, 1.2, 0.65, 1.2]);
        else put("rock", 0xa8c4d6, [x, 0.4 * s, z, s * 0.8, ry, r2]);
      } else if (r1 < 0.72) {
        put("trunk", 0x3a2e2a, [x, 1.3 * s, z, s, ry]);
        put("fir", 0x5a7e8c, [x, 6.7 * s, z, s, ry]);
        put("fir", 0xeef6fa, [x, 8.4 * s, z, s * 0.5, ry]); // snow cap
      } else put("rock", 0xbcd6e6, [x, 0.7 * s, z, s * 1.8, ry, r2 * 0.5, 1, 0.8, 1]);
    } else if (zk === "ember") {
      if (near) {
        if (r1 < 0.16) put("rock", 0x3a1c12, [x, 0.35 * s, z, s * 0.7, ry, r2], 0xff5a1a);
        else put("rock", 0x2e262a, [x, 0.4 * s, z, s * 0.9, ry, r2]);
      } else if (r1 < 0.45) {
        put("trunk", 0x2a1f1b, [x, 2.9 * s, z, s, ry, (r2 - 0.5) * 0.25, 0.8, 2.2, 0.8]); // dead tree
        put("bush", 0x3a302c, [x, 5.9 * s, z, s * 0.7, ry, 0, 1.1, 0.7, 1.1]);
      } else put("rock", 0x2a2226, [x, 1.6 * s, z, s * 1.3, ry, (r2 - 0.5) * 0.3, 0.9, 2.2, 0.9]); // basalt spire
    } else if (zk === "marsh") {
      if (near) {
        if (r1 < 0.55) {
          for (let k = 0; k < 4; k++)
            put("reed", 0x7a8a4a, [x + (hs(x, z, 20 + k) - 0.5) * 1.6, 0.8 * s, z + (hs(x, z, 30 + k) - 0.5) * 1.6, s]);
        } else put("rock", 0x4c5648, [x, 0.35 * s, z, s * 0.8, ry, r2]);
      } else if (r1 < 0.6) {
        put("trunk", 0x3d3426, [x, 1.3 * s, z, s * 1.1, ry]);
        put("bush", 0x4f6a3e, [x, 3.6 * s, z, s * 1.7, ry, 0, 1.3, 0.9, 1.3]); // willow crown
        put("bush", 0x5a7444, [x, 2.4 * s, z, s * 1.5, ry + 1, 0, 1.25, 1.1, 1.25]); // drape
      } else {
        put("trunk", 0x2c241c, [x, 1.3 * s, z, s, ry]);
        put("fir", 0x2f4a3a, [x, 6.7 * s * 0.85, z, s * 0.85, ry]);
      }
    } else {
      // hub roads and anything else: oaks, firs, shrubs, field stones
      if (near) {
        if (r1 < 0.6) put("bush", 0x3d5a32, [x, 0.4 * s, z, s, ry, 0, 1.2, 0.75, 1.2]);
        else put("rock", 0x6e6c74, [x, 0.4 * s, z, s * 0.8, ry, r2]);
      } else if (r1 < 0.5) {
        put("trunk", 0x4a3426, [x, 1.3 * s, z, s, ry]);
        put("bush", 0x3f5e35, [x, 3.6 * s, z, s * 1.8, ry, 0, 1.1, 0.9, 1.1]);
      } else if (r1 < 0.9) {
        put("trunk", 0x3a2a20, [x, 1.3 * s, z, s, ry]);
        put("fir", 0x2b4a3a, [x, 6.7 * s, z, s, ry]);
      } else put("bush", 0x35502e, [x, 0.8 * s, z, s * 1.6, ry, 0, 1.2, 0.8, 1.2]);
    }
  }
  // ---- chunks ----
  const CS = 64,
    ST = LOW ? 2.6 : 2,
    PAD = Math.ceil(16 / ST),
    PN = LOW ? 0.14 : 0.22, // chance a near cell gets something
    PF = LOW ? 0.18 : 0.3, // chance a far cell gets a tree / big rock
    CH = new Map(),
    Q = [];
  const IQ = new T.Object3D();
  function* build(key, cx, cz) {
    const n = Math.ceil(CS / ST) + PAD * 2,
      x0 = cx * CS - PAD * ST,
      z0 = cz * CS - PAD * ST,
      D = new Float32Array(n * n),
      B = {};
    // walk grid (0 = walkable) one row per step
    for (let i = 0; i < n; i++) {
      const lk = LKON;
      LKON = false; // locked roads still count as roads
      try {
        for (let j = 0; j < n; j++) {
          const x = x0 + i * ST,
            z = z0 + j * ST;
          D[i * n + j] = okp(x, z) || trOn(x, z) ? 0 : 1e4;
        }
      } catch (e) {
      } finally {
        LKON = lk;
      }
      yield;
    }
    // chamfer distance (in cells) to the nearest walkable cell
    const S2 = 1.4142;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        let v = D[i * n + j];
        if (!v) continue;
        if (i > 0) {
          v = Math.min(v, D[(i - 1) * n + j] + 1);
          if (j > 0) v = Math.min(v, D[(i - 1) * n + j - 1] + S2);
          if (j < n - 1) v = Math.min(v, D[(i - 1) * n + j + 1] + S2);
        }
        if (j > 0) v = Math.min(v, D[i * n + j - 1] + 1);
        D[i * n + j] = v;
      }
    for (let i = n - 1; i >= 0; i--)
      for (let j = n - 1; j >= 0; j--) {
        let v = D[i * n + j];
        if (!v) continue;
        if (i < n - 1) {
          v = Math.min(v, D[(i + 1) * n + j] + 1);
          if (j > 0) v = Math.min(v, D[(i + 1) * n + j - 1] + S2);
          if (j < n - 1) v = Math.min(v, D[(i + 1) * n + j + 1] + S2);
        }
        if (j < n - 1) v = Math.min(v, D[i * n + j + 1] + 1);
        D[i * n + j] = v;
      }
    yield;
    const clr = typeof WONDR !== "undefined" && WONDR.clear ? WONDR.clear : null;
    for (let i = PAD; i < n - PAD; i++) {
      for (let j = PAD; j < n - PAD; j++) {
        const d = D[i * n + j] * ST;
        if (d < 2.4 || d > 15) continue;
        let x = x0 + i * ST,
          z = z0 + j * ST;
        const near = d < 5;
        if (hs(x, z, 1) > (near ? PN : PF)) continue;
        x += (hs(x, z, 2) - 0.5) * ST * 0.8;
        z += (hs(x, z, 3) - 0.5) * ST * 0.8;
        if (bare(x, z)) continue;
        if (PT.some((q) => Math.abs(q.x - x) < 8 && Math.abs(q.z - z) < 8)) continue;
        try {
          // v44: trees keep a wider berth so their crowns don't grow into the old forest's trees
          if (clr && !clr(x, z, near ? 1.3 : 3)) continue;
        } catch (e) {}
        dress(B, zoneAt(x, z), near, x, z, hs(x, z, 4), hs(x, z, 5));
      }
      if (i % 6 === 0) yield;
    }
    const gp = new T.Group();
    gp.name = "wilds:" + key;
    gp.userData.lus = 1; // other files' scene scans (53 WONDR.clear, 42) skip it
    gp.userData.c = [cx * CS + CS / 2, cz * CS + CS / 2];
    const g = geos();
    for (const k in B) {
      const e = B[k],
        im = new T.InstancedMesh(g[e.g], mat(e.c, e.em), e.L.length);
      e.L.forEach((q, i) => {
        IQ.position.set(q[0], q[1], q[2]);
        IQ.rotation.set(q[5] || 0, q[4] || 0, 0);
        const s = q[3] || 1;
        IQ.scale.set(s * (q[6] || 1), s * (q[7] || 1), s * (q[8] || 1));
        IQ.updateMatrix();
        im.setMatrixAt(i, IQ.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = false; // r128 culls instanced meshes wrongly; chunks are hidden by distance instead
      im.userData.lus = 1;
      gp.add(im);
    }
    gp.visible = false;
    S.add(gp);
    CH.set(key, gp);
  }
  const V1 = new T.Vector3(),
    V2 = new T.Vector3();
  function chunks() {
    const px = C.position.x,
      pz = C.position.z,
      R0 = 100,
      R1 = 118;
    const on = cfg.e && W.visible !== false;
    if (on) {
      let add = 0;
      for (let a = Math.floor((px - R0) / CS); a <= Math.floor((px + R0) / CS); a++)
        for (let b = Math.floor((pz - R0) / CS); b <= Math.floor((pz + R0) / CS); b++) {
          const k = a + "," + b;
          if (CH.has(k)) continue;
          if (Math.hypot(a * CS + CS / 2 - px, b * CS + CS / 2 - pz) > R0 + CS * 0.71) continue;
          CH.set(k, null);
          Q.push([k, a, b]);
          add = 1;
        }
      const d2 = (e) => (e[1] * CS + CS / 2 - px) ** 2 + (e[2] * CS + CS / 2 - pz) ** 2;
      if (add) Q.sort((p, q) => d2(q) - d2(p)); // nearest last (popped first)
    }
    C.getWorldDirection(V2);
    V2.y = 0;
    V2.normalize();
    for (const gp of CH.values()) {
      if (!gp) continue;
      const c = gp.userData.c,
        d = Math.hypot(c[0] - px, c[1] - pz);
      let v = on && d < R1 + CS * 0.5;
      if (v && d > CS) {
        V1.set(c[0] - px, 0, c[1] - pz).normalize();
        if (V1.dot(V2) < -0.55) v = false;
      }
      gp.visible = v;
    }
  }
  let job = null,
    fr = 0,
    ready = false;
  function tick() {
    requestAnimationFrame(tick);
    if (!ready || typeof C === "undefined") return;
    if (++fr % 20 === 0) chunks();
    if (!cfg.e) return;
    const t0 = performance.now();
    while (performance.now() - t0 < 4) {
      if (!job) {
        const e = Q.pop();
        if (!e) break;
        job = build(e[0], e[1], e[2]);
      }
      try {
        if (job.next().done) job = null;
      } catch (err) {
        console.error(err);
        job = null;
      }
    }
  }
  // start once the world (incl. 61's town planner and the editor builds) has settled
  const boot = () => setTimeout(() => (ready = true), 1500);
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot);
  requestAnimationFrame(tick);
  WILDS.CH = CH;
})();
