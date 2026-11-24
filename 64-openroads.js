// DUSKWICK - 64-openroads.js (v43, loads LAST): joining the zone streets onto their villages ("open world" plan).
// Only top-level name: OPENR.
// The world is still BUILT with the streets in their old row far east (x >= ZSX0); OPENR.move() (below) moves every
// street piece beside its village at DOMContentLoaded (after the editor boot) and sets ZSF.on, which switches the
// queries in 03 to the moved layout. Live since phase 8 (ZSMOVE true in 03); with ZSMOVE false it only runs with
// developer mode + localStorage duskwick_zsmove = "1". It also joins each street to its village (walk-through arches,
// return arches taken down, scenery on the joins cleared, ground sheets trimmed).
// F4 (developer mode): a top-down map of the layout (street footprints, arches, trails, town roads, villages, the
// Reach), what the move did (OPENR.moved) and checks (walk-check speckle, holder boxes; red clash dots only while the
// move is off). Console: OPENR.show() / OPENR.hide().
const OPENR = {};
(() => {
  const NS = ZSTR.length;
  const ZCOL = { frost: "#9fd8ff", ember: "#ff9a5a", marsh: "#a8e070" };
  let cv = null,
    on = false,
    clash = null,
    walk = null;
  // phase 2 check: run the moved-layout queries (zsIdxM + zsWalkS in the street's frame, as zsWalk does with ZSMOVE on)
  // over each street's area. Cells they call walkable for street i are kept as [x, z, i]; wrong = cells they give to a
  // different street than the one whose ground it is (should stay 0).
  function walkGrid() {
    if (walk) return walk;
    walk = { c: [], wrong: 0 };
    try {
      for (let i = 0; i < NS; i++) {
        const b = ZSBOX[i];
        for (let x = b[0]; x <= b[1]; x += 3)
          for (let z = b[2]; z <= b[3]; z += 3) {
            const o = zsL(i, x, z);
            if (!zsWalkS(i, o[0], o[1])) continue;
            const si = zsIdxM(x, z);
            if (si === i) walk.c.push([x, z, i]);
            else if (si >= 0) walk.wrong++;
          }
      }
    } catch (e) {
      console.error(e);
    }
    return walk;
  }
  // new street footprint: centreline (mapped from the old ZRD polyline), side clearing, end plaza
  const line = (i) => ZRD[i].p.map(([x, z]) => zsW(i, x + OX, z + OZ));
  function clashes() {
    if (clash) return clash;
    clash = [];
    if (ZSF.on) return clash; // live: okp already reads the moved streets, so every street spot would "clash"
    const lk = LKON;
    LKON = false;
    try {
      for (let i = 0; i < NS; i++) {
        const t = ZRD[i],
          pts = [];
        // old-frame sample points over the walkable street: centreline and edges, side clearing, plaza
        for (let k = 0; k < t.p.length; k += 2) {
          const [px, pz] = t.p[k],
            q = t.p[Math.min(t.p.length - 1, k + 1)],
            a = Math.atan2(q[0] - px, q[1] - pz),
            nx = Math.cos(a),
            nz = -Math.sin(a);
          for (const o of [-RDW, 0, RDW]) pts.push([px + OX + nx * o, pz + OZ + nz * o]);
        }
        for (let a = 0; a < 6.28; a += 0.5) {
          pts.push([t.pk[0] + Math.cos(a) * t.pk[2] * 0.8, t.pk[1] + Math.sin(a) * t.pk[2] * 0.8]);
          pts.push([t.cul[0] + Math.cos(a) * ZCR * 0.8, t.cul[1] + Math.sin(a) * ZCR * 0.8]);
        }
        for (const [ox, oz] of pts) {
          if (-oz < 14) continue; // the first steps meet the village walk on purpose
          const [x, z] = zsW(i, ox, oz);
          if (okp(x, z) || trOn(x, z)) clash.push([x, z, i]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      LKON = lk;
    }
    return clash;
  }
  // ---------- phase 4: the move (runs once, only when ZSMOVE is on) ----------
  // The world is built in the old layout (streets in a row at x >= ZSX0). At DOMContentLoaded, after the editor boot
  // (its builds and world edits are applied to the old layout first, so they ride along), every street piece is turned
  // into its street's frame beside its village, then ZSF.on switches the queries (zsIdx / zoneAt / zsWalk / zrOn / safe)
  // to the moved layout. Foe order and foe data stay identical on every machine (deterministic). A piece belongs to
  // street i when zsIdxO says so for its old spot; anything already in the new layout is never in that area, so
  // nothing can be moved twice. Moved:
  //  - zone-loading holders "zone:st<i>" (bounds too, old ones kept in G.b0) and 33's street holders (userData.zsi)
  //  - direct scene children by position (or by box centre when they sit at the origin; boxes wider than 460 are
  //    world-wide merged meshes and stay, see 37-junctions in phase 5); instanced meshes per instance
  //  - foes (model even when it is out of the scene, home hx/hz, patrol path), solids, CB, SMK, OCC (saved instance
  //    matrices), LAMPS, CHESTS, LS, HOUSES, NPCS (ry), PT (spot, ry, and a `to` that lands on a street), SAFEC
  // OPENR.moved = counts per kind (shown on the F4 map).
  OPENR.moved = null;
  // test switch: with developer mode on, localStorage duskwick_zsmove = "1" runs the move at load too (solo testing only:
  // every player in a multiplayer world must agree, or foes stand in different places)
  const want = () => {
    if (ZSMOVE) return true;
    try {
      return !!(DEV && DEV.on) && localStorage.getItem("duskwick_zsmove") === "1";
    } catch (e) {
      return false;
    }
  };
  OPENR.move = () => {
    if (ZSF.on || !want()) return;
    const N = (OPENR.moved = { holders: 0, objects: 0, instances: 0, foes: 0, data: 0, portals: 0, stay: 0 });
    const TM = [],
      TQ = [],
      v = new T.Vector3(),
      box = new T.Box3(),
      sz = new T.Vector3(),
      m4 = new T.Matrix4(),
      mi = new T.Matrix4(),
      yax = new T.Vector3(0, 1, 0);
    for (let i = 0; i < NS; i++) {
      const p = zsW(i, 0, 0);
      TM.push(new T.Matrix4().makeRotationY(ZSF[i].ry).setPosition(p[0], 0, p[1]));
      TQ.push(new T.Quaternion().setFromAxisAngle(yax, ZSF[i].ry));
    }
    const at = (x, z) => {
      const i = zsIdxO(x, z);
      return i >= 0 && i < NS ? i : -1;
    };
    // an object directly in S (unrotated parent): turn it about the street frame
    const moveObj = (o, i) => {
      o.userData.zso = i; // street it belongs to (the joins clearing reads it)
      const p = zsW(i, o.position.x, o.position.z);
      o.position.set(p[0], o.position.y, p[1]);
      o.quaternion.premultiply(TQ[i]);
      o.updateMatrixWorld(true);
    };
    // {x, z} records (returns the street index or -1)
    const movXZ = (e) => {
      if (!e || typeof e.x !== "number") return -1;
      const i = at(e.x, e.z);
      if (i < 0) return -1;
      const p = zsW(i, e.x, e.z);
      e.x = p[0];
      e.z = p[1];
      N.data++;
      return i;
    };
    // 0) phase 6, the joins. Each village arch (a PT named after its street) becomes a walk-through arch (wk: no
    // teleport; 05-ambient hides its swirl while unlocked), so you walk out of the village straight onto the street.
    // Each street's own "Back to <village>" arch (gateArch parts tagged userData.zga = its PT index, solids ga) would
    // stand right behind the village arch, so it is taken down: hidden, its pillar solids dropped, its PT made a
    // lock-free walk-through (never fires). The street's ground sheet loses the 80 behind its start.
    const SN = new Set(ZSTR.map((s) => s[1])),
      dropA = new Set();
    PT.forEach((q) => {
      if (q.gid == null) return;
      const hide = () => {
        // street arches have no lock, so 05-ambient never touches their swirl: put it away here
        if (q.r) q.r.visible = false;
        if (q.g) q.g.visible = false;
      };
      if (SN.has(q.n)) {
        q.wk = 1;
        hide();
        N.arches = (N.arches || 0) + 1;
      } else if (/^Back to /.test(q.n || "") && at(q.x, q.z) >= 0) {
        q.wk = 1;
        q.lock = null;
        q.zgone = 1;
        hide();
        dropA.add(q.gid);
      }
    });
    S.traverse((o) => {
      const u = o.userData;
      if (!u) return;
      if (u.zga != null && dropA.has(u.zga)) o.visible = false;
      if (u.zgp && o.isMesh && !u.zgpT) {
        u.zgpT = 1;
        o.geometry.dispose();
        // phase 8: 150 wide (was 240: neighbouring streets' sheets would overlap and flicker), each street a hair
        // lower than the last and pushed back in depth, so village / zone ground always wins where they meet
        const si = Math.round((o.position.x - ZSX0) / ZSDX);
        o.geometry = new T.PlaneGeometry(150, ZSL + 64);
        o.position.z = (-6 - ZSL - 70) / 2;
        o.position.y = -0.03 - 0.004 * Math.max(0, si);
        if (o.material) {
          if (o.material.map) {
            o.material.map.repeat.y *= (ZSL + 64) / (ZSL + 150); // same texel size
            o.material.map.repeat.x *= 150 / 240;
          }
          o.material.polygonOffset = true;
          o.material.polygonOffsetFactor = 2;
          o.material.polygonOffsetUnits = 2;
        }
      }
    });
    for (let k = solids.length - 1; k >= 0; k--) if (dropA.has(solids[k].ga)) solids.splice(k, 1);
    N.dropped = dropA.size;
    // 1) holders
    const done = new Set(),
      MI = new Map(); // world-wide instanced mesh -> {instance index: street}
    ZCUL.forEach((G) => {
      const m = /^st(\d+)$/.exec(G.k);
      if (!m || +m[1] >= NS) return;
      const i = +m[1];
      zsHold(G.h, i);
      G.h.userData.zsh = i; // (13's editor reads zsh / zso / zsm / f.zso to keep its edits in the old layout)
      G.b0 = G.b;
      G.b = zsBoxW(i, G.b);
      done.add(G.h);
      N.holders++;
    });
    S.children.forEach((o) => {
      const i = o.userData ? o.userData.zsi : null;
      if (i == null || i >= NS) return;
      zsHold(o, i);
      o.userData.zsh = i;
      o.userData.zc = zsW(i, ZRD[i].X, -ZSL / 2);
      done.add(o);
      N.holders++;
    });
    // 2) foes (their models may be out of the scene while dead)
    foes.forEach((f) => {
      if (!f || typeof f.hx !== "number") return;
      const i = at(f.hx, f.hz);
      if (i < 0) return;
      const p = zsW(i, f.hx, f.hz);
      f.hx = p[0];
      f.hz = p[1];
      f.zso = i;
      if (f.path) f.path = f.path.map((q) => zsW(i, q[0], q[1]));
      if (Array.isArray(f.path0)) f.path0 = f.path0.map((q) => zsW(i, q[0], q[1])); // the editor's "reset" route
      if (f.o) {
        moveObj(f.o, i);
        done.add(f.o);
      }
      N.foes++;
    });
    // 3) everything else standing directly in the scene
    [W, BG, typeof FF !== "undefined" ? FF : null, typeof WX !== "undefined" ? WX : null, MTG].forEach(
      (o) => o && o.isObject3D && done.add(o),
    );
    S.updateMatrixWorld(true);
    S.children.slice().forEach((o) => {
      if (done.has(o) || o.isCamera || /^zone:/.test(o.name || "")) return;
      if (o.isInstancedMesh) {
        // per instance (world-wide tree / rock / bush meshes); the mesh itself stays put
        mi.copy(o.matrix).invert();
        let n = 0;
        for (let k = 0; k < o.count; k++) {
          o.getMatrixAt(k, m4);
          m4.premultiply(o.matrix);
          v.setFromMatrixPosition(m4);
          if (m4.elements[0] === 0 && m4.elements[5] === 0) continue; // squashed (hidden) instance
          const i = at(v.x, v.z);
          if (i < 0) continue;
          m4.premultiply(TM[i]).premultiply(mi);
          o.setMatrixAt(k, m4);
          let own = MI.get(o);
          if (!own) MI.set(o, (own = o.userData.zsm = {}));
          own[k] = i; // which street this instance now belongs to (for the clearing below)
          n++;
        }
        if (n) {
          o.instanceMatrix.needsUpdate = true;
          o.frustumCulled = false;
          N.instances += n;
        }
        return;
      }
      let x = o.position.x,
        z = o.position.z;
      if (Math.abs(x) + Math.abs(z) < 1 && !o.isLight) {
        box.setFromObject(o);
        if (box.isEmpty()) return;
        box.getSize(sz);
        box.getCenter(v);
        if (Math.max(sz.x, sz.z) > 460) {
          if (box.max.x > ZSX0 - 110) N.stay++; // reaches into the old streets: left for phase 5
          return;
        }
        x = v.x;
        z = v.z;
      }
      const i = at(x, z);
      if (i < 0) return;
      moveObj(o, i);
      N.objects++;
    });
    // 4) registries
    solids.forEach(movXZ);
    CB.forEach(movXZ);
    SMK.forEach(movXZ);
    LAMPS.forEach(movXZ);
    CHESTS.forEach(movXZ);
    LS.forEach(movXZ);
    HOUSES.forEach(movXZ);
    NPCS.forEach((n) => {
      const i = movXZ(n);
      if (i >= 0) n.ry = (n.ry || 0) + ZSF[i].ry;
    });
    OCC.forEach((o) => {
      const i = movXZ(o);
      if (i < 0) return;
      o.ms.forEach((m, j) => {
        // only meshes moved per instance above (direct children); a mesh inside a moved holder keeps local matrices
        if (!m.isInstancedMesh || !o.mx[j] || m.parent !== S) return;
        mi.copy(m.matrix).invert();
        o.mx[j].premultiply(m.matrix).premultiply(TM[i]).premultiply(mi);
      });
    });
    PT.forEach((q) => {
      const i = movXZ(q);
      if (i >= 0) {
        q.ry = (q.ry || 0) + ZSF[i].ry;
        N.portals++;
      }
      if (Array.isArray(q.to)) {
        const k = at(q.to[0], q.to[1]);
        if (k >= 0) {
          const p = zsW(k, q.to[0], q.to[1]);
          q.to = [p[0], p[1], (q.to[2] || 0) + ZSF[k].ry].concat(q.to.slice(3));
        }
      }
    });
    SAFEC.forEach((c) => {
      const i = at(c[0], c[1]);
      if (i < 0) return;
      const p = zsW(i, c[0], c[1]);
      c[0] = p[0];
      c[1] = p[1];
      N.data++;
    });
    // 5) phase 5: points kept by later files (quest arrow targets [zone, x, z], Wonders vistas, street-dungeon doors)
    for (const k in QPOS) {
      const q = QPOS[k];
      if (!Array.isArray(q) || typeof q[1] !== "number") continue;
      const i = at(q[1], q[2]);
      if (i < 0) continue;
      const p = zsW(i, q[1], q[2]);
      q[1] = p[0];
      q[2] = p[1];
      N.data++;
    }
    if (typeof WONDR !== "undefined" && WONDR.VIS) WONDR.VIS.forEach(movXZ);
    if (typeof DUN2 !== "undefined" && DUN2.list)
      DUN2.list.forEach((D) => {
        [D.door, D.out].forEach((q) => {
          if (!q) return;
          const i = at(q[0], q[1]);
          if (i < 0) return;
          const p = zsW(i, q[0], q[1]);
          q[0] = p[0];
          q[1] = p[1];
          if (q.length > 2) q[2] = (q[2] || 0) + ZSF[i].ry;
          N.data++;
        });
      });
    ZSF.on = 1;
    clash = walk = null;
    try {
      clearJoins(MI, N);
    } catch (e) {
      console.error("OPENR joins", e);
    }
    console.log("OPENR: streets moved", N);
  };
  // phase 6: scenery standing on somebody else's walkable ground after the move is put away (instanced pieces squashed
  // to zero scale, small plain meshes hidden, the solids / colliders under them dropped): village / wilds trees on a
  // moved street, and a street's own trees or rocks that landed on a village, trail or another street. Only inside the
  // streets' world boxes (+20). Owner of a piece: its street holder ("zone:st<i>", userData.zsi), userData.zso (moved
  // scene child) or MI (moved instance); -1 = not a street piece. Never touched: lamps, lore stones, chests, NPCs,
  // foes, portals, houses (and anything within 3 of them), arches, hills (instances scaled > 9), flat ground pieces.
  function clearJoins(MI, N) {
    const keep = new Set(),
      keepAt = [];
    const grab = (o) => o && o.isObject3D && o.traverse((c) => keep.add(c));
    [LAMPS, LS, CHESTS, NPCS, foes, PT, HOUSES].forEach((L) =>
      (L || []).forEach((e) => {
        if (!e) return;
        for (const k in e) grab(e[k]);
        const p = e.o && e.o.position ? e.o.position : e;
        if (typeof p.x === "number" && typeof p.z === "number") keepAt.push([p.x, p.z]);
      }),
    );
    grab(W);
    if (typeof BG !== "undefined") grab(BG);
    const kept = (x, z) => keepAt.some((p) => Math.abs(p[0] - x) < 3 && Math.abs(p[1] - z) < 3),
      inBox = (x, z) => ZSBOX.some((b) => x >= b[0] - 20 && x <= b[1] + 20 && z >= b[2] - 20 && z <= b[3] + 20),
      OFF = [
        [0, 0],
        [1.2, 0],
        [-1.2, 0],
        [0, 1.2],
        [0, -1.2],
      ];
    // walkable ground near (x, z) that is not this owner's (own -1: any street's ground counts as foreign)
    const foreign = (x, z, own) => {
      for (const [dx, dz] of OFF) {
        const px = x + dx,
          pz = z + dz;
        if (!okp(px, pz)) continue;
        const si = zsIdx(px, pz);
        if (own < 0 ? si >= 0 : si !== own) return true;
      }
      return false;
    };
    const gone = [],
      G = new Set(),
      m4 = new T.Matrix4(),
      v = new T.Vector3(),
      zero = new T.Matrix4().makeScale(0, 0, 0),
      bx = new T.Box3();
    let cl = 0;
    const lk = LKON;
    LKON = false;
    try {
      S.updateMatrixWorld(true);
      const rec = (o, own) => {
        if (keep.has(o)) return;
        const u = o.userData || {};
        if (u.lus || u.wdr || u.mdw || u.jnx || u.zga != null) return;
        if (u.zsi != null) own = u.zsi;
        else if (u.zso != null) own = u.zso;
        else {
          const m = /^zone:st(\d+)$/.exec(o.name || "");
          if (m) own = +m[1];
        }
        if (o.isLight || o.isSprite || o.isPoints) return;
        if (o.isInstancedMesh) {
          const mm = MI.get(o);
          let ch = 0;
          for (let k = 0; k < o.count; k++) {
            o.getMatrixAt(k, m4);
            if (m4.elements[0] === 0 && m4.elements[5] === 0) continue;
            m4.premultiply(o.matrixWorld);
            v.setFromMatrixPosition(m4);
            if (!inBox(v.x, v.z)) continue;
            if (Math.max(Math.abs(m4.elements[0]), Math.abs(m4.elements[5]), Math.abs(m4.elements[10])) > 9) continue;
            const ow = mm && mm[k] != null ? mm[k] : own;
            if (kept(v.x, v.z) || !foreign(v.x, v.z, ow)) continue;
            o.setMatrixAt(k, zero);
            G.add(o.uuid + ":" + k);
            gone.push([v.x, v.z]);
            ch = 1;
            cl++;
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
          if (sx < 10 && sz < 10 && sy > 0.4 && bx.min.y < 2 && inBox(x, z) && !kept(x, z) && foreign(x, z, own)) {
            o.visible = false;
            u.zjHid = 1;
            gone.push([x, z]);
            cl++;
            return;
          }
        }
        for (let i = 0; i < o.children.length; i++) rec(o.children[i], own);
      };
      S.children.slice().forEach((o) => rec(o, -1));
      // solids / colliders that stood under something put away, on walkable ground (house colliders carry hs: kept)
      const near = (x, z, r) => gone.some((p) => Math.abs(p[0] - x) < r + 1.2 && Math.abs(p[1] - z) < r + 1.2);
      let sol = 0;
      for (let k = solids.length - 1; k >= 0; k--) {
        const s = solids[k];
        if (inBox(s.x, s.z) && near(s.x, s.z, s.r || 1) && okp(s.x, s.z) && !kept(s.x, s.z)) {
          solids.splice(k, 1);
          sol++;
        }
      }
      for (let k = CB.length - 1; k >= 0; k--) {
        const c = CB[k];
        if (c.hs || typeof c.x !== "number") continue;
        if (inBox(c.x, c.z) && near(c.x, c.z, c.r || 1) && okp(c.x, c.z) && !kept(c.x, c.z)) {
          CB.splice(k, 1);
          sol++;
        }
      }
      // tree hiding (OCC) must not bring a cleared piece back
      OCC.forEach((o) => {
        const ms = [],
          mx = [];
        o.ms.forEach((m, j) => {
          if (m.userData && m.userData.zjHid) return;
          if (m.isInstancedMesh && G.has(m.uuid + ":" + o.i)) o.mx[j].copy(zero);
          ms.push(m);
          mx.push(o.mx[j]);
        });
        o.ms = ms;
        o.mx = mx;
      });
      N.cleared = cl;
      N.clearedSolids = sol;
    } finally {
      LKON = lk;
    }
  }
  if (want()) {
    const go = () => {
      try {
        OPENR.move();
      } catch (e) {
        console.error("OPENR.move", e);
      }
    };
    if (document.readyState === "loading") addEventListener("DOMContentLoaded", go);
    else go();
  }
  function draw() {
    const W0 = Math.min(innerWidth, innerHeight * 1.6) - 40,
      H0 = Math.min(innerHeight - 40, W0 / 1.6),
      dpr = Math.min(2, devicePixelRatio || 1);
    cv.style.width = W0 + "px";
    cv.style.height = H0 + "px";
    cv.width = W0 * dpr;
    cv.height = H0 * dpr;
    const X = cv.getContext("2d");
    X.setTransform(dpr, 0, 0, dpr, 0, 0);
    // world box shown
    const B = [-1000, 1400, -820, 60],
      sc = Math.min(W0 / (B[1] - B[0]), H0 / (B[3] - B[2])),
      ox = (W0 - (B[1] - B[0]) * sc) / 2,
      oz = (H0 - (B[3] - B[2]) * sc) / 2,
      mx = (x) => ox + (x - B[0]) * sc,
      mz = (z) => oz + (z - B[2]) * sc;
    X.fillStyle = "rgba(12,10,26,.94)";
    X.fillRect(0, 0, W0, H0);
    // hub band, tower line, the Reach
    X.fillStyle = "rgba(255,210,122,.06)";
    X.fillRect(mx(-300), mz(B[2]), 600 * sc, (B[3] - B[2]) * sc);
    X.fillStyle = "rgba(200,180,255,.08)";
    X.fillRect(mx(1770), mz(-820), 260 * sc, 880 * sc);
    X.strokeStyle = "rgba(255,255,255,.12)";
    X.setLineDash([4, 4]);
    X.beginPath();
    X.moveTo(mx(B[0]), mz(-800));
    X.lineTo(mx(B[1]), mz(-800));
    X.stroke();
    X.setLineDash([]);
    const poly = (pts, col, w) => {
      X.strokeStyle = col;
      X.lineWidth = w;
      X.lineCap = X.lineJoin = "round";
      X.beginPath();
      pts.forEach(([x, z], k) => (k ? X.lineTo(mx(x), mz(z)) : X.moveTo(mx(x), mz(z))));
      X.stroke();
    };
    const circ = (x, z, r, col, fill, dash) => {
      X.beginPath();
      X.arc(mx(x), mz(z), Math.max(1.5, r * sc), 0, 7);
      if (dash) X.setLineDash(dash);
      if (fill) {
        X.fillStyle = col;
        X.fill();
      } else {
        X.strokeStyle = col;
        X.lineWidth = 1;
        X.stroke();
      }
      X.setLineDash([]);
    };
    const txt = (s, x, z, col, f, al) => {
      X.font = f || "600 11px system-ui";
      X.textAlign = al || "center";
      X.lineWidth = 3;
      X.strokeStyle = "rgba(8,6,20,.9)";
      X.strokeText(s, x, z);
      X.fillStyle = col;
      X.fillText(s, x, z);
    };
    // town: square, Gloomway, the two roads
    circ(OX, OZ, 18, "rgba(255,210,122,.5)", 1);
    poly(
      [
        [OX, OZ],
        [OX, OZ + PZ],
      ],
      "rgba(255,210,122,.5)",
      Math.max(2, SW * 2 * sc),
    );
    RDS.forEach((r) =>
      poly(
        r.p.map(([x, z]) => [x + OX, z + OZ]),
        "rgba(255,210,122,.4)",
        Math.max(2, RDW * 2 * sc),
      ),
    );
    // v43 hub meadows and lanes (03 HMD / HLN), plus the lamps, lore stones and chests near them
    if (typeof HMD !== "undefined") {
      HMD.forEach(([x, z, r]) => circ(OX + x, OZ + z, r, "rgba(120,200,90,.35)", 1));
      HLN.forEach((t) =>
        poly(
          t.p.map(([x, z]) => [x + OX, z + OZ]),
          "#c8e08a",
          Math.max(2, t.w * 2 * sc),
        ),
      );
      [LAMPS, LS, CHESTS].forEach((L, k) =>
        (L || []).forEach((e) => {
          if (Math.abs(e.x - OX) < 300 && e.z - OZ < 20 && e.z - OZ > -240)
            circ(e.x, e.z, 2, ["#ffd27a", "#8affc8", "#ff9a5a"][k], 1);
        }),
      );
    }
    // trails
    TRL.forEach((t) =>
      poly(
        t.p.map(([x, z]) => [x + OX, z + OZ]),
        "rgba(220,220,240,.45)",
        Math.max(2, TRW * 2 * sc),
      ),
    );
    // villages: walkable ring + old outer-wilds edge
    for (const k in ZCEN) {
      const [x, z] = ZCEN[k];
      circ(x, z, ZVR[k], ZCOL[k] + "55", 1);
      circ(x, z, ZR, ZCOL[k] + "66", 0, [3, 4]);
    }
    if (REACH && REACH.GATE) {
      circ(REACH.GATE.x, REACH.GATE.z, 4, "#e6c8ff", 1);
      txt("Starfall Gate", mx(REACH.GATE.x) + 6, mz(REACH.GATE.z) + 4, "#e6c8ff", "600 10px system-ui", "left");
    }
    txt("Starfall Reach", mx(1900), mz(-760), "#c8b8ff", "600 11px system-ui");
    txt("hub", mx(0), mz(40), "#ffd27a99", "600 11px system-ui");
    // the new streets
    for (let i = 0; i < NS; i++) {
      const t = ZRD[i],
        col = ZCOL[t.zk],
        L = line(i);
      poly(L, col + "40", Math.max(3, (RDW * 2 + 20) * sc)); // its scenery band
      poly(L, col, Math.max(2, RDW * 2 * sc));
      const pk = zsW(i, t.pk[0], t.pk[1]),
        cu = zsW(i, t.cul[0], t.cul[1]);
      circ(pk[0], pk[1], t.pk[2], col, 1);
      circ(cu[0], cu[1], ZCR, col, 1);
      // today's arch spot on the village rim
      const g = zsGate(t);
      circ(g[0], g[1], 3, "#ffffff", 1);
      const ex = mx(cu[0]),
        ez = mz(cu[1]),
        dx = ZSF[i].d[0],
        dz = ZSF[i].d[1];
      txt(
        i + " " + ZSTR[i][1],
        ex + dx * 16,
        ez + dz * 16 + 4,
        col,
        "700 11px system-ui",
        dx > 0.3 ? "left" : dx < -0.3 ? "right" : "center",
      );
    }
    // phase 3: each street's zone-loading holder (11 ZCUL "st<i>") in its moved frame, dashed; off = box centre outside
    // that street's moved area box (ZSBOX)
    const HB = { n: 0, off: 0 };
    (typeof ZCUL !== "undefined" ? ZCUL : []).forEach((G) => {
      const m = /^st(\d+)$/.exec(G.k);
      if (!m || +m[1] >= NS) return;
      const i = +m[1],
        b = zsBoxW(i, G.b0 || G.b),
        zb = ZSBOX[i],
        cx = (b[0] + b[1]) / 2,
        cz = (b[2] + b[3]) / 2;
      HB.n++;
      if (cx < zb[0] || cx > zb[1] || cz < zb[2] || cz > zb[3]) HB.off++;
      X.strokeStyle = ZCOL[ZRD[i].zk] + "aa";
      X.lineWidth = 1;
      X.setLineDash([2, 3]);
      X.strokeRect(mx(b[0]), mz(b[2]), (b[1] - b[0]) * sc, (b[3] - b[2]) * sc);
      X.setLineDash([]);
    });
    const WG = walkGrid();
    X.fillStyle = "rgba(255,255,255,.55)";
    WG.c.forEach(([x, z]) => X.fillRect(mx(x) - 0.6, mz(z) - 0.6, 1.2, 1.2));
    const C0 = clashes();
    C0.forEach(([x, z]) => circ(x, z, 2.5, "#ff3a3a", 1));
    // you
    if (typeof W !== "undefined") {
      let p = [W.position.x, W.position.z];
      const si = zsIdxO(p[0], p[1]);
      if (si >= 0) p = zsW(si, p[0], p[1]); // on a street today: where that spot would be
      circ(p[0], p[1], 5, "#ffffff", 1);
      circ(p[0], p[1], 9, "#ffffff", 0);
    }
    // legend
    const lx = 14;
    let ly = 22;
    txt(
      ZSF.on ? "Street plan (LIVE)" : "Street plan (preview, not live yet)",
      lx,
      ly,
      "#ffe9b0",
      "800 15px Georgia,serif",
      "left",
    );
    ly += 18;
    txt(
      (ZSF.on
        ? "Coloured = each street, joined to its village"
        : "Coloured = where each street would stand, joined to its village") + ". Faint band = its scenery.",
      lx,
      ly,
      "#d8d0f0",
      "500 11px system-ui",
      "left",
    );
    ly += 15;
    txt(
      "White dots = the arches on the village rims. Grey = trails, gold = town roads, dashed = old zone edge.",
      lx,
      ly,
      "#d8d0f0",
      "500 11px system-ui",
      "left",
    );
    ly += 15;
    txt(
      C0.length
        ? C0.length + " red spots: a new street runs onto ground that is walkable today"
        : "No clashes with anything walkable today",
      lx,
      ly,
      C0.length ? "#ff8a8a" : "#9affb8",
      "700 11px system-ui",
      "left",
    );
    ly += 15;
    txt(
      "White speckle = ground the moved-layout walk check accepts (" +
        WG.c.length +
        " cells" +
        (WG.wrong ? ", " + WG.wrong + " given to the wrong street" : ", none misassigned") +
        ")",
      lx,
      ly,
      WG.wrong ? "#ff8a8a" : "#d8d0f0",
      "500 11px system-ui",
      "left",
    );
    ly += 15;
    txt(
      "Dashed boxes = street scenery holders moved with their street (" +
        HB.n +
        " of " +
        NS +
        " found" +
        (HB.off ? ", " + HB.off + " off their street" : "") +
        ")" +
        (ZSF.on ? " - LIVE" : ""),
      lx,
      ly,
      HB.n < NS || HB.off ? "#ff8a8a" : "#d8d0f0",
      "500 11px system-ui",
      "left",
    );
    ly += 15;
    const MV = OPENR.moved;
    txt(
      MV
        ? "Moved: " +
            MV.holders +
            " holders, " +
            MV.objects +
            " scene objects, " +
            MV.instances +
            " instances, " +
            MV.foes +
            " foes, " +
            MV.portals +
            " portals, " +
            MV.data +
            " records; joins: " +
            (MV.arches || 0) +
            " walk-through arches, " +
            (MV.dropped || 0) +
            " return arches down, " +
            (MV.cleared || 0) +
            " pieces cleared" +
            (MV.stay ? "; " + MV.stay + " world-wide meshes still reach the old streets (phase 5)" : "")
        : "The move is off (ZSMOVE false in 03-world.js): streets still stand in their old row",
      lx,
      ly,
      MV && MV.stay ? "#ffc88a" : "#d8d0f0",
      "500 11px system-ui",
      "left",
    );
    ly += 15;
    if (typeof MEADOW !== "undefined" && MEADOW.stats) {
      const s = MEADOW.stats;
      txt(
        "Hub: green = meadows + East / West Lane (live). Cleared from them: " +
          s.instances +
          " instanced pieces, " +
          s.meshes +
          " meshes, " +
          s.solids +
          " solids, " +
          s.colliders +
          " colliders. Dots: lamps / lore stones / chests.",
        lx,
        ly,
        "#c8e08a",
        "500 11px system-ui",
        "left",
      );
      ly += 15;
    }
    txt("F4 or Esc to close", lx, ly, "#a8a0c8", "500 11px system-ui", "left");
  }
  // ---------- v45 re-layout preview (LAYOUT-PLAN.md, 03 ZMV): Shift+F4 ----------
  // Draws the planned world: Cinderwaste east of town, Frostfen south, the new trail routes (ZMV.tr) and Mirewick as it
  // is. The zone streets stay in their own row behind teleport arches (ZSMOVE off), so only the arches on the village
  // rims are drawn. Red dots = planned walkable ground (new trails, moved villages) that lands on ground walkable today
  // which stays where it is (not a moving land, not a trail). Nothing in the world moves for this.
  let plan = false,
    pclash = null;
  const planTr = () => ZMV.tr.map((cp) => mkRd(cp.map(([x, z]) => [x - OX, z - OZ])));
  function planClash() {
    if (pclash) return pclash;
    pclash = { bad: [], ok: 0 };
    const lk = LKON;
    LKON = false;
    try {
      const pts = [];
      planTr().forEach((t) => {
        for (let k = 0; k < t.p.length; k += 2) {
          if (t.s[k] < 20 || t.s[k] > t.L - 20) continue; // the ends meet a glade or a village on purpose
          const [px, pz] = t.p[k],
            q = t.p[Math.min(t.p.length - 1, k + 1)],
            a = Math.atan2(q[0] - px, q[1] - pz),
            nx = Math.cos(a),
            nz = -Math.sin(a);
          for (const o of [-TRW, 0, TRW]) pts.push([px + OX + nx * o, pz + OZ + nz * o]);
        }
      });
      for (const k in ZMV.d) {
        const c = ZMV.c0[k],
          d = ZMV.d[k];
        for (let r = 6; r < ZVR[k]; r += 8)
          for (let a = 0; a < 6.28; a += 6 / r)
            pts.push([c[0] + d[0] + Math.cos(a) * r, c[1] + d[1] + Math.sin(a) * r]);
      }
      for (const [x, z] of pts) {
        let bad = false;
        if (okp(x, z) && !zmAt(x, z) && !trOn(x, z)) bad = true;
        if (bad) pclash.bad.push([x, z]);
        else pclash.ok++;
      }
    } catch (e) {
      console.error("OPENR plan", e);
    } finally {
      LKON = lk;
    }
    return pclash;
  }
  function drawPlan() {
    const W0 = Math.min(innerWidth, innerHeight * 1.6) - 40,
      H0 = Math.min(innerHeight - 40, W0 / 1.6),
      dpr = Math.min(2, devicePixelRatio || 1);
    cv.style.width = W0 + "px";
    cv.style.height = H0 + "px";
    cv.width = W0 * dpr;
    cv.height = H0 * dpr;
    const X = cv.getContext("2d");
    X.setTransform(dpr, 0, 0, dpr, 0, 0);
    const B = [-450, 1400, -820, 220],
      sc = Math.min(W0 / (B[1] - B[0]), H0 / (B[3] - B[2])),
      ox = (W0 - (B[1] - B[0]) * sc) / 2,
      oz = (H0 - (B[3] - B[2]) * sc) / 2,
      mx = (x) => ox + (x - B[0]) * sc,
      mz = (z) => oz + (z - B[2]) * sc;
    X.fillStyle = "rgba(12,10,26,.94)";
    X.fillRect(0, 0, W0, H0);
    const poly = (pts, col, w) => {
      X.strokeStyle = col;
      X.lineWidth = w;
      X.lineCap = X.lineJoin = "round";
      X.beginPath();
      pts.forEach(([x, z], k) => (k ? X.lineTo(mx(x), mz(z)) : X.moveTo(mx(x), mz(z))));
      X.stroke();
    };
    const circ = (x, z, r, col, fill, dash) => {
      X.beginPath();
      X.arc(mx(x), mz(z), Math.max(1.5, r * sc), 0, 7);
      if (dash) X.setLineDash(dash);
      if (fill) {
        X.fillStyle = col;
        X.fill();
      } else {
        X.strokeStyle = col;
        X.lineWidth = 1;
        X.stroke();
      }
      X.setLineDash([]);
    };
    const rect = (x0, x1, z0, z1, col) => {
      X.strokeStyle = col;
      X.lineWidth = 1;
      X.setLineDash([3, 3]);
      X.strokeRect(mx(x0), mz(z0), (x1 - x0) * sc, (z1 - z0) * sc);
      X.setLineDash([]);
    };
    const txt = (s, x, z, col, f, al) => {
      X.font = f || "600 11px system-ui";
      X.textAlign = al || "center";
      X.lineWidth = 3;
      X.strokeStyle = "rgba(8,6,20,.9)";
      X.strokeText(s, x, z);
      X.fillStyle = col;
      X.fillText(s, x, z);
    };
    // the town (unchanged), the editor builds' area, the shop rooms, the tower line
    circ(OX, OZ, 18, "rgba(255,210,122,.5)", 1);
    poly(
      [
        [OX, OZ],
        [OX, OZ + PZ],
      ],
      "rgba(255,210,122,.5)",
      Math.max(2, SW * 2 * sc),
    );
    RDS.forEach((r) =>
      poly(
        r.p.map(([x, z]) => [x + OX, z + OZ]),
        "rgba(255,210,122,.4)",
        Math.max(2, RDW * 2 * sc),
      ),
    );
    rect(-70, 70, -370, -240, "rgba(255,210,122,.5)");
    txt("your builds", mx(0), mz(-226), "#ffd27a99", "500 10px system-ui");
    rect(-250, 400, 162, 178, "rgba(200,200,220,.45)");
    txt("shop rooms", mx(75), mz(196), "#c8c8dc99", "500 10px system-ui");
    txt("Lamplight Square", mx(OX), mz(OZ + 40), "#ffd27a", "700 12px Georgia,serif");
    // old spots of the moving lands (faint, dashed)
    for (const k in ZMV.c0) circ(ZMV.c0[k][0], ZMV.c0[k][1], ZR, ZCOL[k] + "44", 0, [2, 5]);
    // new trails
    planTr().forEach((t, k) => {
      const L = t.p.map(([x, z]) => [x + OX, z + OZ]);
      poly(L, "rgba(220,220,240,.55)", Math.max(2, TRW * 2 * sc));
      const m = L[Math.floor(L.length / 2)];
      txt(TRL[k] ? TRL[k].n : "trail", mx(m[0]) + 8, mz(m[1]), "#e8e8f8", "500 10px system-ui", "left");
    });
    // villages at their planned spots (Mirewick stays)
    for (const k in ZCEN) {
      const d = ZMV.d[k] || [0, 0],
        x = ZCEN[k][0] + d[0],
        z = ZCEN[k][1] + d[1];
      circ(x, z, ZR, ZCOL[k] + "66", 0, [3, 4]);
      circ(x, z, ZVR[k], ZCOL[k] + "88", 1);
      txt(
        { frost: "Frostfen", ember: "Cinderwaste", marsh: "Mirewick" }[k],
        mx(x),
        mz(z) + 4,
        "#fff",
        "700 12px Georgia,serif",
      );
    }
    // each street's teleport arch on its (shifted) village rim; the streets themselves stay in their own row
    for (let i = 0; i < NS; i++) {
      const t = ZRD[i],
        d = ZMV.d[t.zk] || [0, 0],
        g = zsGate(t),
        x = g[0] + d[0],
        z = g[1] + d[1];
      circ(x, z, 3, "#ffffff", 1);
      txt(
        ZSTR[i][1],
        mx(x) + t.mo[0] * 8,
        mz(z) + t.mo[1] * 8 + 4,
        ZCOL[t.zk],
        "600 10px system-ui",
        t.mo[0] > 0.3 ? "left" : t.mo[0] < -0.3 ? "right" : "center",
      );
    }
    const PC = planClash();
    PC.bad.forEach(([x, z]) => circ(x, z, 2.5, "#ff3a3a", 1));
    if (typeof W !== "undefined") {
      circ(W.position.x, W.position.z, 5, "#ffffff", 1);
      circ(W.position.x, W.position.z, 9, "#ffffff", 0);
    }
    const lx = 14;
    let ly = 22;
    txt(
      ZMV.on ? "World re-layout (LIVE)" : "World re-layout plan (preview, nothing has moved)",
      lx,
      ly,
      "#ffe9b0",
      "800 15px Georgia,serif",
      "left",
    );
    ly += 18;
    [
      "Cinderwaste east of town, Frostfen south of town, Mirewick unchanged. Faint dashed rings = where the two lands stand today.",
      "Grey = the new trails (Wispwood Glade south to Frostfen, east to Cinderwaste; the causeway from Cinderwaste to Mirewick).",
      "White dots = the street teleport arches on each village rim (the streets stay in their own row, reached through them).",
    ].forEach((s) => {
      txt(s, lx, ly, "#d8d0f0", "500 11px system-ui", "left");
      ly += 15;
    });
    txt(
      PC.bad.length
        ? PC.bad.length + " red spots: planned ground lands on something walkable today that stays put"
        : "No clashes with anything that stays put (" + PC.ok + " spots checked)",
      lx,
      ly,
      PC.bad.length ? "#ff8a8a" : "#9affb8",
      "700 11px system-ui",
      "left",
    );
    ly += 15;
    txt("Shift+F4 or Esc to close, F4 for the street plan", lx, ly, "#a8a0c8", "500 11px system-ui", "left");
  }
  OPENR.planClashes = () => planClash().bad.slice();
  OPENR.show = (pl) => {
    plan = !!pl && typeof ZMV !== "undefined";
    if (!cv) {
      cv = document.createElement("canvas");
      cv.style.cssText =
        "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:60;border:1px solid #ffd27a66;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.6);pointer-events:none";
      document.body.appendChild(cv);
    }
    on = true;
    cv.style.display = "block";
    plan ? drawPlan() : draw();
  };
  OPENR.hide = () => {
    on = false;
    if (cv) cv.style.display = "none";
  };
  OPENR.clashes = () => clashes().slice();
  addEventListener("keydown", (e) => {
    if (e.code === "F4" && typeof DEV !== "undefined" && DEV.on) {
      e.preventDefault();
      // F4 = street plan, Shift+F4 = v45 re-layout plan; the same key again closes, the other one switches
      on && plan === e.shiftKey ? OPENR.hide() : OPENR.show(e.shiftKey);
    } else if (e.code === "Escape" && on) OPENR.hide();
  });
  addEventListener("resize", () => on && (plan ? drawPlan() : draw()));
})();
