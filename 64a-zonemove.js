// DUSKWICK - 64a-zonemove.js (v45, loads just before 64-openroads.js): the world re-layout (LAYOUT-PLAN.md).
// Only top-level name: ZMOVE.
// The world is still BUILT in the old layout (Frostfen east, Cinderwaste west). At DOMContentLoaded, after the editor
// boot (its builds and world edits are applied to the old layout first, so they ride along) and before OPENR.move,
// ZMOVE.move() shifts each moving land (03 ZMV: Frostfen south of town, Cinderwaste east of town; no turn) and sets
// ZMV.on, which switches zoneAt to the moved layout. Saves and editor data keep the old layout (12 converts P.pos).
// A piece belongs to a moving land when its OLD spot is within ZMV.r of the land's old centre (zmAt). Both lands are
// picked from the same snapshot before anything moves (Cinderwaste lands where Frostfen stood), so nothing moves twice.
// Moved: the "zone:frost" / "zone:ember" holders (and their cull bounds), direct scene children by position (box centre
// for pieces at the origin; boxes wider than 460 are world-wide meshes and stay), world-wide instanced meshes per
// instance, foes (home, patrol, path0, model), solids, CB, SMK, OCC, LAMPS, CHESTS, LS, HOUSES, NPCS, PT (+ `to`),
// SAFEC, QPOS, quest map targets (QS wh), Book travel spots (TRV), the old dungeon doors (DUN door/out), WONDR.VIS,
// VILL.Z. Then the live data is updated in place: ZCEN, the in-zone links in ZRD, TRL (new routes from ZMV.tr, same
// names and locks), so every reader (minimap, atlas, wayfare) sees the new world.
// Old trail pieces inside a moving land (ribbons, lamps, signs, verge trees within 30 of an old trail and outside the
// village itself) are put away instead of moved; their solids / colliders are dropped. The new trails are walkable
// at once (TRL); their look (ribbons, river, bridges) is phase 4.
// Runs when ZMV.live (03, true since v45) or with localStorage duskwick_zmove = "1". ZMOVE.dress() (phase 4) then
// builds the look: new trail roads, blended ground, rivers + bridges, cliffs, lock arches at the new road mouths.
// Console: ZMOVE.moved (counts), ZMOVE.go() (run it now if it has not run).
const ZMOVE = {};
(() => {
  const want = () => {
    if (ZMV.live) return true;
    try {
      return localStorage.getItem("duskwick_zmove") === "1"; // test switch (solo only until ZMV.live)
    } catch (e) {
      return false;
    }
  };
  // The two lock arches don't shift with a land: dress() carries the Frostfen arch to Wispwood Glade's south exit and
  // the Cinderwaste arch to where the Frostfen one stood. Worked out NOW (at load, before the editor boot) from the
  // untouched arches, as one matrix each: ZMOVE.rel[k] = {q PT, a arch group, m/inv old->new, ry turn, pil pillar
  // solids}. The arch group is tagged userData.zmr = k so the editor treats it as a moved frame (200 + k), like a land.
  ZMOVE.rel = [];
  if (want()) {
    const qF = PT.find((q) => q.n === "Frostfen (needs Lv 3)"),
      qC = PT.find((q) => q.n === "Cinderwaste (needs Lv 4)");
    if (qF && qC) {
      const rec = (q) => {
        const a = q.gem && q.gem.parent;
        return {
          q,
          a,
          x: q.x,
          z: q.z,
          ry0: a ? a.rotation.y : q.ry || 0,
          pil: solids.filter((s) => s.r === 0.6 && Math.hypot(s.x - q.x, s.z - q.z) < 2.9),
        };
      };
      const F = rec(qF),
        Cw = rec(qC),
        to = (R, nx, nz, nry, k) => {
          R.ry = nry - R.ry0;
          R.m = new T.Matrix4()
            .makeTranslation(nx, 0, nz)
            .multiply(new T.Matrix4().makeRotationY(R.ry))
            .multiply(new T.Matrix4().makeTranslation(-R.x, 0, -R.z));
          R.inv = R.m.clone().invert();
          if (R.a) R.a.userData.zmr = k;
          ZMOVE.rel.push(R);
        };
      to(F, OX + RDS[0].gx, OZ + RDS[0].gz + 13.6, 0, 0);
      to(Cw, F.x, F.z, F.ry0, 1);
    }
  }
  ZMOVE.moved = null;
  ZMOVE.move = () => {
    if (ZMV.on || !want()) return;
    const N = (ZMOVE.moved = {
      holders: 0,
      objects: 0,
      instances: 0,
      foes: 0,
      data: 0,
      portals: 0,
      hidden: 0,
      squashed: 0,
      dropped: 0,
    });
    const v = new T.Vector3(),
      box = new T.Box3(),
      sz = new T.Vector3(),
      m4 = new T.Matrix4(),
      mi = new T.Matrix4(),
      zero = new T.Matrix4().makeScale(0, 0, 0),
      TM = {};
    for (const k in ZMV.d) TM[k] = new T.Matrix4().makeTranslation(ZMV.d[k][0], 0, ZMV.d[k][1]);
    // old trail geometry (before TRL is rewritten), bounds padded so the 30 test works near the ends
    const OLDT = (ZMOVE.oldT = TRL.map((t) => ({
      p: t.p,
      s: t.s,
      L: t.L,
      bb: [t.bb[0] - 20, t.bb[1] + 20, t.bb[2] - 20, t.bb[3] + 20],
    })));
    const at = (x, z) => zmAt(x, z);
    // an old-layout spot in a moving land that belongs to an old trail (not the village itself)
    const trailBit = (x, z, k) => {
      const c = ZMV.c0[k];
      if (Math.hypot(x - c[0], z - c[1]) <= ZVR[k]) return false;
      // v46b: a street's walk out of the village (its arch, swirl, side walls, paving) is never a trail bit: a Cinderwaste
      // street arch stood within 30 of the old Cinder Trail and was hidden, leaving its swirl working unseen
      if (ZRD.some((t) => t.n && t.zk === k && zsStub(t, x, z, 4))) return false;
      return OLDT.some((t) => {
        const q = rdNear(t, x - OX, z - OZ);
        return !!q && q.d < 30;
      });
    };
    const shiftXZ = (e, k) => {
      e.x += ZMV.d[k][0];
      e.z += ZMV.d[k][1];
    };
    // {x, z} records: moved (returns the land) or, with drop, removed from their list when they are trail bits
    const movXZ = (e) => {
      if (!e || typeof e.x !== "number" || typeof e.z !== "number") return null;
      const k = at(e.x, e.z);
      if (!k) return null;
      shiftXZ(e, k);
      N.data++;
      return k;
    };
    const dropOrMove = (L) => {
      for (let i = L.length - 1; i >= 0; i--) {
        const e = L[i];
        if (!e || typeof e.x !== "number" || e.ed) continue; // editor solids stay with their builds
        const k = at(e.x, e.z);
        if (!k) continue;
        if ((e.r == null || e.r <= 1.7) && !e.hs && trailBit(e.x, e.z, k)) {
          L.splice(i, 1);
          N.dropped++;
          continue;
        }
        shiftXZ(e, k);
        N.data++;
      }
    };
    // [x, z, ...] arrays (shifted in place)
    const movArr = (a, ix) => {
      ix = ix || 0;
      if (!Array.isArray(a) || typeof a[ix] !== "number") return null;
      const k = at(a[ix], a[ix + 1]);
      if (!k) return null;
      a[ix] += ZMV.d[k][0];
      a[ix + 1] += ZMV.d[k][1];
      N.data++;
      return k;
    };
    const done = new Set();
    [W, BG, typeof FF !== "undefined" ? FF : null, typeof WX !== "undefined" ? WX : null, MTG].forEach(
      (o) => o && o.isObject3D && done.add(o),
    );
    S.updateMatrixWorld(true);
    // 1) zone-loading holders: old trail pieces inside are put away, the rest moves with the holder
    ZCUL.forEach((G) => {
      const k = G.k;
      if (!ZMV.d[k]) return;
      G.h.children.forEach((c) => {
        box.setFromObject(c);
        if (box.isEmpty()) return;
        box.getCenter(v);
        box.getSize(sz);
        if (Math.max(sz.x, sz.z) < 60 && trailBit(v.x, v.z, k)) {
          c.visible = false;
          c.userData.zmHid = 1;
          N.hidden++;
        }
        // the land's big ground sheet sits under any town ground it now overlaps (Frostfen meets the hub's grass)
        const gp = c.geometry && c.geometry.parameters;
        if (c.isMesh && c.geometry.type === "PlaneGeometry" && gp && gp.width >= 400 && c.material) {
          c.position.y = -0.5;
          c.material.polygonOffset = true;
          c.material.polygonOffsetFactor = 4;
          c.material.polygonOffsetUnits = 8;
        }
      });
      G.h.position.x += ZMV.d[k][0];
      G.h.position.z += ZMV.d[k][1];
      G.h.updateMatrixWorld(true);
      G.h.userData.zmh = k;
      G.b0 = G.b0 || G.b.slice();
      G.b = [G.b[0] + ZMV.d[k][0], G.b[1] + ZMV.d[k][0], G.b[2] + ZMV.d[k][1], G.b[3] + ZMV.d[k][1]];
      done.add(G.h);
      N.holders++;
    });
    // 2) foes (their models may be out of the scene while dead)
    foes.forEach((f) => {
      if (f && f.edi != null) {
        [f.o, f.ring].forEach((o) => o && done.add(o)); // editor foes stay with their builds
        return;
      }
      if (!f || typeof f.hx !== "number") return;
      const k = at(f.hx, f.hz);
      if (!k) return;
      const [dx, dz] = ZMV.d[k];
      f.hx += dx;
      f.hz += dz;
      f.zm = k;
      if (f.path) f.path = f.path.map((q) => [q[0] + dx, q[1] + dz].concat(q.slice(2)));
      if (Array.isArray(f.path0)) f.path0 = f.path0.map((q) => [q[0] + dx, q[1] + dz].concat(q.slice(2)));
      if (f.o) {
        f.o.position.x += dx;
        f.o.position.z += dz;
        f.o.updateMatrixWorld(true);
        done.add(f.o);
      }
      N.foes++;
    });
    // 3) everything else standing directly in the scene
    const MI = new Map(); // instanced mesh -> {instance: "hide" | land}
    S.children.slice().forEach((o) => {
      // editor builds (userData.ei) are rebuilt from their saved spots on every edit, so they keep today's coords
      if (done.has(o) || o.isCamera || /^zone:/.test(o.name || "") || o.userData.ei !== undefined) return;
      if (o.isInstancedMesh) {
        mi.copy(o.matrix).invert();
        let n = 0;
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m4);
          if (m4.elements[0] === 0 && m4.elements[5] === 0) continue; // already squashed
          m4.premultiply(o.matrix);
          v.setFromMatrixPosition(m4);
          const k = at(v.x, v.z);
          if (!k) continue;
          let own = MI.get(o);
          if (!own) MI.set(o, (own = o.userData.zmm = {})); // 13's world edits read zmm[i]
          if (trailBit(v.x, v.z, k)) {
            o.setMatrixAt(i, zero);
            own[i] = "hide";
            N.squashed++;
          } else {
            m4.premultiply(TM[k]).premultiply(mi);
            o.setMatrixAt(i, m4);
            own[i] = k;
            N.instances++;
          }
          n++;
        }
        if (n) {
          o.instanceMatrix.needsUpdate = true;
          o.frustumCulled = false;
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
        if (Math.max(sz.x, sz.z) > 460) return; // world-wide merged mesh
        x = v.x;
        z = v.z;
      }
      const k = at(x, z);
      if (!k) return;
      if (!o.isLight && trailBit(x, z, k) && !(o.userData && o.userData.jnx)) {
        o.visible = false;
        o.userData.zmHid = 1;
        N.hidden++;
        return;
      }
      o.position.x += ZMV.d[k][0];
      o.position.z += ZMV.d[k][1];
      o.updateMatrixWorld(true);
      o.userData.zmo = k;
      // 33-roads' distance-culled holders read userData.zc (else their load-time centre): give the moved centre
      o.userData.zc = [x + ZMV.d[k][0], z + ZMV.d[k][1]];
      N.objects++;
    });
    // 4) registries
    dropOrMove(solids);
    dropOrMove(CB);
    SMK.forEach(movXZ);
    LAMPS.forEach(movXZ);
    CHESTS.forEach(movXZ);
    LS.forEach(movXZ);
    HOUSES.forEach(movXZ);
    NPCS.forEach(movXZ);
    OCC.forEach((o) => {
      if (typeof o.x !== "number") return;
      const k = at(o.x, o.z);
      if (!k) return;
      o.ms.forEach((m, j) => {
        // only instanced meshes handled per instance above (direct children); meshes in a holder keep local matrices
        if (!m.isInstancedMesh || !o.mx[j] || m.parent !== S) return;
        const own = MI.get(m),
          w = own ? own[o.i] : null;
        if (w === "hide") o.mx[j].copy(zero);
        else if (w) {
          mi.copy(m.matrix).invert();
          o.mx[j].premultiply(m.matrix).premultiply(TM[k]).premultiply(mi);
        }
      });
      shiftXZ(o, k);
      N.data++;
    });
    PT.forEach((q) => {
      if (movXZ(q)) N.portals++;
      if (Array.isArray(q.to)) movArr(q.to); // e.g. a street's "Back to Frostfen" arch lands at the moved village
    });
    SAFEC.forEach((c) => movArr(c));
    // 5) points kept elsewhere
    for (const k in QPOS) movArr(QPOS[k], 1);
    QS.forEach((q) => q && movArr(q.wh, 1));
    if (typeof TRV !== "undefined") TRV.forEach((t) => t && movArr(t.to));
    DUN.forEach((D) => [D.door, D.out].forEach((a) => movArr(a)));
    if (typeof WONDR !== "undefined" && WONDR.VIS) WONDR.VIS.forEach(movXZ);
    // prologue shots of a moving land (camera a -> b looking at l, [x, y, z]) follow it
    if (typeof ISHOTS !== "undefined")
      ISHOTS.forEach((sh) => {
        const k = sh && Array.isArray(sh.l) && at(sh.l[0], sh.l[2]);
        if (!k) return;
        [sh.a, sh.b, sh.l].forEach((p) => {
          if (!Array.isArray(p)) return;
          p[0] += ZMV.d[k][0];
          p[2] += ZMV.d[k][1];
        });
        N.data++;
      });
    if (typeof VILL !== "undefined" && VILL.Z)
      for (const k in ZMV.d) {
        const Z = VILL.Z[k];
        if (Z && typeof Z.x === "number" && at(Z.x, Z.z) === k) shiftXZ(Z, k);
      }
    // 6) live layout data, in place
    for (const k in ZMV.d) {
      ZCEN[k][0] = ZMV.c0[k][0] + ZMV.d[k][0];
      ZCEN[k][1] = ZMV.c0[k][1] + ZMV.d[k][1];
    }
    ZRD.forEach((t) => {
      if (t.n || !ZMV.d[t.zk]) return; // named streets stay in their own row; in-zone links shift with their village
      const [dx, dz] = ZMV.d[t.zk];
      t.p = t.p.map((q) => [q[0] + dx, q[1] + dz]);
      t.bb = [t.bb[0] + dx, t.bb[1] + dx, t.bb[2] + dz, t.bb[3] + dz];
    });
    ZMV.tr.forEach((cp, i) => {
      const t = TRL[i];
      if (!t) return;
      Object.assign(t, mkRd(cp.map(([x, z]) => [x - OX, z - OZ])), { cp: cp.map((q) => q.slice()) });
      delete t.sA;
      delete t.sB;
      delete t.ta;
      delete t.tb;
    });
    TRL[0].z1 = ZCEN.frost;
    TRL[1].z1 = ZCEN.ember;
    TRL[2].z0 = ZCEN.ember;
    TRL[2].z1 = ZCEN.marsh;
    ZMV.on = 1;
    TRL.forEach((t) => {
      try {
        trSpan(t);
      } catch (e) {}
    });
    console.log("ZMOVE: lands moved", JSON.stringify(N));
  };
  // ---------- phase 4: the look of the new layout (runs right after the move; everything added after BASE) ----------
  // 1) old trail pieces anywhere else (ribbons, lamps, signs, verge trees, the two seam strips, 37's trail-end stones)
  //    are put away, their solids / colliders dropped; 2) scenery standing on the new trails is cleared; 3) ground:
  //    the town's grass sheet and each land's square sheet become discs, a blended meadow lies under everything and a
  //    soft ring hides each disc's edge; 4) the new trails get road, sidewalks, curbs, lamp posts and end signs;
  //    5) a river runs between town and both lands (and between Cinderwaste and Mirewick) with a bridge where each trail
  //    crosses; cliff rocks ring the lava land; 6) the Frostfen arch moves to Wispwood Glade's south exit and the
  //    Cinderwaste arch to its east exit (where the trails to them now leave). New pieces carry userData.zmb.
  // River routes (world): [x, z] control points, smoothed like the trails.
  ZMOVE.RIV = [
    [
      [-330, -178],
      [-200, -182],
      [-80, -177],
      [40, -186],
      [150, -196],
      [260, -188],
      [340, -200],
      [370, -240],
      [367, -330],
      [375, -430],
      [366, -520],
      [372, -620],
      [364, -730],
    ],
    [
      [790, -700],
      [800, -600],
      [792, -500],
      [798, -398],
      [790, -300],
      [800, -200],
      [794, -120],
    ],
  ];
  ZMOVE.dressed = null;
  ZMOVE.dress = () => {
    if (!ZMV.on || ZMOVE.dressed) return;
    const N = (ZMOVE.dressed = { hidden: 0, squashed: 0, dropped: 0, cleared: 0, bridges: 0 });
    const OLDT = ZMOVE.oldT || [],
      v = new T.Vector3(),
      box = new T.Box3(),
      sz = new T.Vector3(),
      m4 = new T.Matrix4(),
      zero = new T.Matrix4().makeScale(0, 0, 0),
      gone = new Set(); // "uuid:instance" squashed here (for OCC)
    // things that are never put away
    const keep = new Set();
    const grab = (o) => o && o.isObject3D && o.traverse((c) => keep.add(c));
    ["W", "BG", "FF", "WX", "MTG"].forEach((n) => {
      try {
        grab(eval(n));
      } catch (e) {}
    });
    foes.forEach((f) => f && grab(f.o));
    NPCS.forEach((n) => n && [n.o, n.mkr, n.qm, n.np].forEach(grab));
    PT.forEach((q) => q && [q.r, q.g, q.gem && q.gem.parent].forEach(grab));
    LAMPS.forEach((L) => L && [L.s, L.cg, L.o].forEach(grab));
    CHESTS.forEach((c) => c && grab(c.o));
    LS.forEach((l) => l && grab(l.o));
    const core = (x, z) => {
      for (const k in ZCEN) if (Math.hypot(x - ZCEN[k][0], z - ZCEN[k][1]) < ZVR[k] + 4) return true;
      // v46b: and each street's walk out to its arch (never cleared or hidden)
      return ZRD.some((t) => t.n && ZCEN[t.zk] && zsStub(t, x, z, 4));
    };
    // the town's own roads (Hollow Road / Ashen Trail), both glades and Gloomway are never cleared: the old trails start
    // at the glade exits, so a 30 band round them would reach back over Cinder Hollow / Wispwood Glade and the road ends
    const town = (x, z) => {
      const lx = x - OX,
        lz = z - OZ;
      if (Math.abs(lx) < 44 && lz < 40 && lz > -330) return true;
      for (const R of RDS) {
        if (Math.hypot(lx - R.gx, lz - R.gz) < 22) return true;
        const q = rdNear(R, lx, lz);
        if (q && q.d < RDW + 5) return true;
      }
      return false;
    };
    // did the move carry this piece (holder zmh / child zmo)? Those had their trail bits put away by the move already
    const movedO = (o) => {
      for (let p = o; p && p !== S; p = p.parent) if (p.userData && (p.userData.zmh || p.userData.zmo)) return true;
      return false;
    };
    // near an OLD trail (past its first 6), not moved, outside villages and the town's own roads / glades.
    // mv: true = moved piece (skip), false = not moved, undefined = unknown (records: skip the old land circles, whose
    // trail-bit records the move already dropped and whose other records now stand at their new spots)
    const nearOld = (x, z, w, mv) => {
      if (mv || (mv === undefined && zmAt(x, z)) || core(x, z) || town(x, z)) return false;
      for (const t of OLDT) {
        const q = rdNear(t, x - OX, z - OZ);
        if (q && q.d < w && q.s > 6) return true;
      }
      return false;
    };
    // on a NEW trail's walkable band (past its first 3)
    const onNew = (x, z, w) => {
      if (town(x, z)) return false;
      for (const t of TRL) {
        const q = rdNear(t, x - OX, z - OZ);
        if (q && q.d < w && q.s > 3) return true;
      }
      return false;
    };
    // an old trail's road strip / curb (rdRibbon, world coords, not moved): every sampled vertex lies on one old trail
    const ribbonOld = (o) => {
      const p = o.geometry && o.geometry.attributes && o.geometry.attributes.position;
      if (!p || p.count < 8 || Math.abs(o.position.x) + Math.abs(o.position.z) > 1 || movedO(o)) return false;
      return OLDT.some((t) => {
        for (const f of [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]) {
          const i = Math.min(p.count - 1, Math.floor(f * (p.count - 1))),
            q = rdNear(t, p.getX(i) - OX, p.getZ(i) - OZ);
          if (!q || q.d > RDW + 1.5) return false;
        }
        return true;
      });
    };
    const hide = (o) => {
      o.visible = false;
      o.userData.zmHid = 1;
      N.hidden++;
    };
    // one pass over the scene's own pieces and the zone holders' children
    const visit = (o, fnInst, fnObj) => {
      if (keep.has(o)) return;
      const u = o.userData || {};
      if (u.zmb || u.lus || u.zmHid || u.ei !== undefined) return; // ei = editor builds
      if (o.isInstancedMesh) return fnInst(o);
      fnObj(o);
    };
    const pieces = [];
    S.children.forEach((o) => {
      if (/^zone:/.test(o.name || "")) o.children.forEach((c) => pieces.push(c));
      else pieces.push(o);
    });
    S.updateMatrixWorld(true);
    // 1) + 2)
    pieces.forEach((o) =>
      visit(
        o,
        (im) => {
          let ch = 0;
          const hm = movedO(im),
            zmm = im.userData.zmm;
          for (let i = 0; i < im.count; i++) {
            im.getMatrixAt(i, m4);
            if (m4.elements[0] === 0 && m4.elements[5] === 0) continue;
            m4.premultiply(im.matrixWorld);
            v.setFromMatrixPosition(m4);
            if (Math.max(Math.abs(m4.elements[0]), Math.abs(m4.elements[5]), Math.abs(m4.elements[10])) > 9) continue;
            const mv = hm || !!(zmm && zmm[i] != null);
            if (nearOld(v.x, v.z, 30, mv) || (onNew(v.x, v.z, TRW + 1.5) && !core(v.x, v.z))) {
              im.setMatrixAt(i, zero);
              gone.add(im.uuid + ":" + i);
              ch = 1;
              N.squashed++;
            }
          }
          if (ch) {
            im.instanceMatrix.needsUpdate = true;
            im.frustumCulled = false;
          }
        },
        (m) => {
          if (m.isLight || m.isCamera) return;
          const u = m.userData || {};
          if (u.jnx) {
            if (/^t\d/.test(u.jnxk || "")) hide(m); // 37's old trail-end stones and patches
            return;
          }
          const gp = m.geometry && m.geometry.parameters;
          if (m.isMesh && m.geometry.type === "PlaneGeometry" && gp && gp.width === 54 && gp.height === 420) {
            hide(m); // the old grass / snow / ash seam strips beside the town
            return;
          }
          if (m.isMesh && ribbonOld(m)) return hide(m);
          box.setFromObject(m);
          if (box.isEmpty()) return;
          box.getSize(sz);
          box.getCenter(v);
          if (Math.max(sz.x, sz.z) > 60) return;
          if (nearOld(v.x, v.z, 30, movedO(m))) return hide(m);
          // small things standing on a new trail
          if (Math.max(sz.x, sz.z) < 7 && box.min.y < 2 && onNew(v.x, v.z, TRW + 1) && !core(v.x, v.z)) {
            hide(m);
            N.cleared++;
          }
        },
      ),
    );
    for (const L of [solids, CB])
      for (let i = L.length - 1; i >= 0; i--) {
        const e = L[i];
        if (!e || typeof e.x !== "number" || e.hs || e.ed || (e.r != null && e.r > 1.7)) continue;
        if (nearOld(e.x, e.z, 30) || (onNew(e.x, e.z, TRW) && !core(e.x, e.z))) {
          L.splice(i, 1);
          N.dropped++;
        }
      }
    // tree hiding (OCC) must not bring a put-away piece back
    OCC.forEach((o) => {
      const ms = [],
        mx = [];
      o.ms.forEach((m, j) => {
        if (m.userData && m.userData.zmHid) return;
        if (m.isInstancedMesh && gone.has(m.uuid + ":" + o.i) && o.mx[j]) o.mx[j].copy(zero);
        ms.push(m);
        mx.push(o.mx[j]);
      });
      o.ms = ms;
      o.mx = mx;
    });
    // 3) ground
    const BIO = [
      { c: [OX, OZ - 100], r: 340, col: new T.Color(0x2f5f4c) }, // town grass
      { k: "frost", r: 215, col: new T.Color(0x9fb0c8) },
      { k: "ember", r: 215, col: new T.Color(0x3a2a2c) },
      { k: "marsh", r: 215, col: new T.Color(0x1d3a36) },
    ];
    BIO.forEach((b) => b.k && (b.c = ZCEN[b.k]));
    const tmpC = new T.Color();
    const bioCol = (x, z, out) => {
      out.setRGB(0, 0, 0);
      let ws = 0.04;
      out.copy(BIO[0].col).multiplyScalar(0.04);
      BIO.forEach((b) => {
        const d = Math.hypot(x - b.c[0], z - b.c[1]),
          w = Math.exp(-Math.max(0, d - b.r * 0.85) / 38);
        out.r += b.col.r * w;
        out.g += b.col.g * w;
        out.b += b.col.b * w;
        ws += w;
      });
      return out.multiplyScalar(1.15 / ws);
    };
    const speck = tex((x) => {
      x.fillStyle = "#c8c8c8";
      x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 600; i++) {
        x.fillStyle = ["#a8a8a8", "#e2e2e2", "#b8b8b8", "#d6d6d6"][i % 4];
        x.fillRect((i * 37) % 128, (i * 71 + (i >> 3)) % 128, 2 + (i % 3), 2);
      }
    }, 1);
    const tag = (o) => {
      o.userData.zmb = 1;
      return o;
    };
    // the discs: the town's 680 square grass sheet and each land's 420 square sheet keep their material, new geometry
    pieces.forEach((m) => {
      const gp = m.isMesh && m.geometry && m.geometry.type === "PlaneGeometry" && m.geometry.parameters;
      if (!gp || m.userData.zmHid) return;
      let r = 0;
      if (gp.width === 680 && gp.height === 680) r = 340;
      else if (gp.width === 420 && gp.height === 420) r = 210;
      if (!r) return;
      m.geometry.dispose();
      m.geometry = new T.CircleGeometry(r, 96);
      if (r === 210 && Math.abs(m.position.x - ZCEN.marsh[0]) < 5) m.position.y = -0.42; // under Cinderwaste's edge
    });
    // the meadow under everything (vertex-coloured blend of the four grounds)
    {
      const X0 = -440,
        X1 = 1320,
        Z0 = -920,
        Z1 = 300,
        sx = Math.round((X1 - X0) / 10),
        szn = Math.round((Z1 - Z0) / 10),
        g = new T.PlaneGeometry(X1 - X0, Z1 - Z0, sx, szn),
        p = g.attributes.position,
        col = [];
      for (let i = 0; i < p.count; i++) {
        // plane is in XY; after the -90 degree X turn, world z = -y
        bioCol((X0 + X1) / 2 + p.getX(i), (Z0 + Z1) / 2 - p.getY(i), tmpC);
        col.push(tmpC.r, tmpC.g, tmpC.b);
      }
      g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
      const t = speck.clone();
      t.needsUpdate = true;
      t.repeat.set((X1 - X0) / 8, (Z1 - Z0) / 8);
      const m = new T.Mesh(
        g,
        new T.MeshLambertMaterial({
          map: t,
          vertexColors: true,
          polygonOffset: true,
          polygonOffsetFactor: 6,
          polygonOffsetUnits: 12,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set((X0 + X1) / 2, -0.62, (Z0 + Z1) / 2);
      m.name = "zm:meadow";
      S.add(tag(m));
    }
    // soft rings over each disc's edge (radial alpha, vertex-coloured from the same blend)
    {
      const rc = document.createElement("canvas");
      rc.width = rc.height = 256;
      const rx = rc.getContext("2d");
      const ring = (R, wIn, wOut) => {
        const out = R + wOut,
          gr = rx.createRadialGradient(128, 128, 0, 128, 128, 128);
        rx.clearRect(0, 0, 256, 256);
        gr.addColorStop(0, "#000");
        gr.addColorStop(Math.max(0, (R - wIn) / out), "#000");
        gr.addColorStop(R / out, "#d8d8d8");
        gr.addColorStop(1, "#000");
        rx.fillStyle = gr;
        rx.fillRect(0, 0, 256, 256);
        const am = new T.CanvasTexture(rc);
        am.needsUpdate = true;
        const img = document.createElement("canvas");
        img.width = img.height = 256;
        img.getContext("2d").drawImage(rc, 0, 0);
        am.image = img;
        return am;
      };
      BIO.forEach((b) => {
        const R = b.r,
          wIn = 34,
          wOut = 40,
          g = new T.RingGeometry(R - wIn, R + wOut, 128, 2),
          p = g.attributes.position,
          col = [];
        for (let i = 0; i < p.count; i++) {
          bioCol(b.c[0] + p.getX(i), b.c[1] - p.getY(i), tmpC);
          col.push(tmpC.r, tmpC.g, tmpC.b);
        }
        g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
        const m = new T.Mesh(
          g,
          new T.MeshLambertMaterial({
            vertexColors: true,
            alphaMap: ring(R, wIn, wOut),
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -2,
          }),
        );
        m.material.userData.dtx = 0;
        m.rotation.x = -Math.PI / 2;
        m.position.set(b.c[0], -0.2, b.c[1]);
        m.renderOrder = -1;
        S.add(tag(m));
      });
    }
    // 4) the new trails
    const fsw2 = tex((x) => {
      x.fillStyle = "#6a6070";
      x.fillRect(0, 0, 128, 128);
      for (let r = 0; r < 2; r++)
        for (let q = 0; q < 4; q++) {
          x.fillStyle = ["#a89c94", "#9c9088", "#b4a8a0"][(r + q) % 3];
          x.fillRect(q * 32 + (r % 2) * 16 + 2, r * 64 + 2, 28, 60);
        }
    }, 1);
    const dirt2 = tex((x) => {
      x.fillStyle = "#6a5240";
      x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 700; i++) {
        x.fillStyle = ["#5a4434", "#7a6050", "#806a52", "#4e3a2c"][i % 4];
        x.fillRect((i * 53) % 128, (i * 29 + (i >> 2)) % 128, 2 + (i % 2), 2);
      }
    }, 1);
    const lerpHex = (a, b, f) => tmpC.setHex(a).lerp(new T.Color(b), f).getHex();
    const ZT = { frost: [0xd8dcf0, 0xd0d8ec], ember: [0xf0d0c0, 0xecd0c0], marsh: [0xb0a080, 0xa8a088] },
      HUB = [0xe6ddd0, 0xdcd4cc];
    const offs = (m, r) => {
      m.material.polygonOffset = true;
      m.material.polygonOffsetFactor = -r;
      m.material.polygonOffsetUnits = -r * 2;
      return tag(m);
    };
    const RIV = ZMOVE.RIV.map((cp) => mkRd(cp.map(([x, z]) => [x - OX, z - OZ])));
    ZMOVE.RIVR = RIV; // v46b: the river roads, so the world editor (13) can bend them
    const cross = []; // [x, z, hx, hz, trail index]
    TRL.forEach((t, ti) => {
      RIV.forEach((r) => {
        for (let a = 0; a < t.p.length - 1; a++) {
          const p1 = t.p[a],
            p2 = t.p[a + 1];
          for (let b = 0; b < r.p.length - 1; b++) {
            const q1 = r.p[b],
              q2 = r.p[b + 1],
              d = (p2[0] - p1[0]) * (q2[1] - q1[1]) - (p2[1] - p1[1]) * (q2[0] - q1[0]);
            if (Math.abs(d) < 1e-9) continue;
            const u = ((q1[0] - p1[0]) * (q2[1] - q1[1]) - (q1[1] - p1[1]) * (q2[0] - q1[0])) / d,
              w = ((q1[0] - p1[0]) * (p2[1] - p1[1]) - (q1[1] - p1[1]) * (p2[0] - p1[0])) / d;
            if (u < 0 || u > 1 || w < 0 || w > 1) continue;
            const l = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
            cross.push([
              OX + p1[0] + (p2[0] - p1[0]) * u,
              OZ + p1[1] + (p2[1] - p1[1]) * u,
              (p2[0] - p1[0]) / l,
              (p2[1] - p1[1]) / l,
              ti,
            ]);
          }
        }
      });
    });
    ZMOVE.cross = cross;
    const nearCross = (x, z, r) => cross.some((c) => Math.hypot(c[0] - x, c[1] - z) < r);
    const zkEnd = (t) => {
      const e = rdAt(t, t.L),
        x = OX + e[0],
        z = OZ + e[1];
      let best = "frost",
        bd = 1e9;
      for (const k in ZCEN) {
        const d = Math.hypot(x - ZCEN[k][0], z - ZCEN[k][1]);
        if (d < bd) {
          bd = d;
          best = k;
        }
      }
      return best;
    };
    const lampP = [],
      lampH = [];
    TRL.forEach((t, ti) => {
      const zb = zkEnd(t),
        za = ti === 2 ? "ember" : null, // the causeway starts in Cinderwaste
        A = za ? ZT[za] : HUB,
        Bc = ZT[zb],
        NS6 = 6;
      for (let k = 0; k < NS6; k++) {
        const s0 = 1.2 + ((t.L - 1.2) * k) / NS6,
          s1 = 1.2 + ((t.L - 1.2) * (k + 1)) / NS6,
          f = (k + 0.5) / NS6,
          rd = dirt2.clone(),
          sw = fsw2.clone();
        rd.needsUpdate = sw.needsUpdate = true;
        offs(
          rdRibbon(t, -5, 5, 0.012, new T.MeshLambertMaterial({ map: rd, color: lerpHex(A[0], Bc[0], f) }), 10, s0, s1),
          3,
        );
        const sm = new T.MeshLambertMaterial({ map: sw, color: lerpHex(A[1], Bc[1], f) });
        offs(rdRibbon(t, 5, RDW, 0.07, sm, 3.6, s0, s1), 5);
        tag(rdRibbon(t, -RDW, -5, 0.07, sm, 3.6, s0, s1));
      }
      const cm = new T.MeshLambertMaterial({ color: 0x4a4560 });
      offs(rdRibbon(t, 4.82, 5.18, 0.1, cm, 1, 1.2), 6);
      tag(rdRibbon(t, -5.18, -4.82, 0.1, cm, 1, 1.2));
      // lamp posts every 13, alternating sides, not inside a village or on a bridge
      for (let s = 9, k = 0; s < t.L - 6; s += 13, k++) {
        const [lx, lz, hx, hz] = rdAt(t, s),
          o = k % 2 ? RDW + 0.5 : -RDW - 0.5,
          x = OX + lx - hz * o,
          z = OZ + lz + hx * o;
        let inV = false;
        for (const zk in ZCEN) if (Math.hypot(x - ZCEN[zk][0], z - ZCEN[zk][1]) < ZVR[zk] + 14) inV = true;
        if (inV || nearCross(x, z, 16)) continue;
        lampP.push([x, z]);
        solids.push({ x, z, r: 0.3 });
      }
      // a signpost at each end, facing the walker
      [
        [12, 0],
        [t.L - 12, Math.PI],
      ].forEach(([s, flip]) => {
        const [lx, lz, hx, hz] = rdAt(t, s),
          px = OX + lx - hz * (RDW + 1.4),
          pz = OZ + lz + hx * (RDW + 1.4),
          c = document.createElement("canvas");
        c.width = 512;
        c.height = 128;
        const x = c.getContext("2d");
        x.fillStyle = "#6b4a2b";
        x.fillRect(0, 0, 512, 128);
        x.strokeStyle = "#3a2614";
        x.lineWidth = 10;
        x.strokeRect(5, 5, 502, 118);
        x.fillStyle = "#f4e6c8";
        x.font = "700 54px Georgia,serif";
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.fillText(t.n.toUpperCase(), 256, 66, 480);
        const bd = new T.Mesh(
          new T.PlaneGeometry(3.4, 0.85),
          new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), side: T.DoubleSide }),
        );
        bd.material.userData.dtx = 0;
        const g = new T.Group();
        g.add(bd);
        bd.position.y = 3.1;
        const post = mk(B(0.16, 3.1, 0.16), 0x6b4a2b, 0, 1.55, 0, 1);
        g.add(post);
        g.position.set(px, 0, pz);
        g.rotation.y = Math.atan2(-hx, -hz) + flip;
        S.add(tag(g));
        solids.push({ x: px, z: pz, r: 0.3 });
      });
    });
    if (lampP.length) {
      const pole = new T.InstancedMesh(Cy(0.11, 0.15, 4.2, 8), M(0x2a2630, 1), lampP.length),
        head = new T.InstancedMesh(
          new T.SphereGeometry(0.32, 10, 8),
          new T.MeshBasicMaterial({ color: 0xffd890 }),
          lampP.length,
        ),
        dm = new T.Object3D();
      head.material.userData.dtx = 0;
      lampP.forEach(([x, z], i) => {
        dm.position.set(x, 2.1, z);
        dm.updateMatrix();
        pole.setMatrixAt(i, dm.matrix);
        dm.position.set(x, 4.35, z);
        dm.updateMatrix();
        head.setMatrixAt(i, dm.matrix);
      });
      pole.frustumCulled = head.frustumCulled = false;
      S.add(tag(pole), tag(head));
      const gm = AM(GLT);
      lampP.forEach(([x, z]) => {
        const s = new T.Sprite(gm);
        s.scale.setScalar(2.6);
        s.position.set(x, 4.35, z);
        S.add(tag(s));
      });
    }
    // 5) rivers, bridges, cliffs
    const water = new T.MeshPhongMaterial({
        color: 0x2f6f8f,
        emissive: 0x0a2232,
        specular: 0x9fd0ff,
        shininess: 70,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -4,
      }),
      bank = new T.MeshLambertMaterial({
        color: 0x4a4430,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      });
    water.userData.dtx = 0;
    RIV.forEach((r) => {
      tag(rdRibbon(r, -7, 7, 0.03, water, 8));
      tag(rdRibbon(r, 7, 10.5, 0.02, bank, 4));
      tag(rdRibbon(r, -10.5, -7, 0.02, bank, 4));
    });
    cross.forEach(([x, z, hx, hz, ti]) => {
      const g = new T.Group(),
        stone = ti === 1, // the Crater road gets a stone bridge, the others wooden
        L = 26,
        Wd = RDW * 2 + 1.2;
      if (stone) {
        g.add(mk(B(Wd, 0.36, L), 0x8a849c, 0, 0.14, 0, 1));
        [-1, 1].forEach((sd) => {
          g.add(mk(B(0.9, 1.1, L), 0x6a6478, sd * (Wd / 2 + 0.45), 0.55, 0, 1));
          [-1, 1].forEach((e) =>
            g.add(mk(B(1.4, 1.8, 1.4), 0x5a5470, sd * (Wd / 2 + 0.45), 0.9, e * (L / 2 - 0.7), 1)),
          );
        });
        [-1, 1].forEach((e) => g.add(mk(B(Wd + 3, 0.6, 1.4), 0x5a5470, 0, -0.05, e * 8.6, 1)));
      } else {
        for (let k = 0; k < 13; k++)
          g.add(mk(B(Wd, 0.22, 1.8), k % 2 ? 0x8a6a44 : 0x7a5a38, 0, 0.12, -L / 2 + 1 + k * 2, 1));
        [-1, 1].forEach((sd) => {
          g.add(mk(B(0.22, 0.22, L), 0x5a4028, sd * (Wd / 2 + 0.2), 1.05, 0, 1));
          for (let k = 0; k <= 6; k++)
            g.add(mk(B(0.3, 1.2, 0.3), 0x5a4028, sd * (Wd / 2 + 0.2), 0.6, -L / 2 + k * (L / 6), 1));
        });
      }
      g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(hx, hz);
      g.userData.deck = [Wd + 0.6, L, stone ? 0.32 : 0.23]; // v46: walk-on deck (03 BDECK), follows editor moves
      S.add(tag(g));
      BDECK.add(g);
      N.bridges++;
    });
    // cliff rocks round the lava land, gaps where the trails come in
    {
      const c = ZCEN.ember,
        gaps = TRL.map((t) => [rdAt(t, 0), rdAt(t, t.L)])
          .flat()
          .map(([lx, lz]) => [OX + lx, OZ + lz])
          .filter(([x, z]) => Math.hypot(x - c[0], z - c[1]) < 90)
          .map(([x, z]) => Math.atan2(z - c[1], x - c[0])),
        pts = [];
      for (let k = 0; k < 120; k++) {
        const a = (k / 120) * Math.PI * 2;
        if (gaps.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.32)) continue;
        const h = Math.sin(k * 12.9898) * 43758.5453,
          f = h - Math.floor(h),
          r = 156 + f * 18;
        pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 2.4 + f * 3.2, k]);
      }
      const im = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), M(0x2e2628, 1), pts.length),
        dm = new T.Object3D();
      pts.forEach(([x, z, s, k], i) => {
        dm.position.set(x, s * 0.35, z);
        dm.rotation.set(k * 0.7, k * 1.3, k * 0.4);
        dm.scale.set(s * 1.3, s * 1.1, s);
        dm.updateMatrix();
        im.setMatrixAt(i, dm.matrix);
      });
      im.frustumCulled = false;
      S.add(tag(im));
    }
    // 6) the lock arches: carried by the load-time move ZMOVE.rel (relative, so an editor edit applied at boot - arch,
    // pillar solids and doorway - rides along instead of being thrown away)
    const qF = ZMOVE.rel[0] && ZMOVE.rel[0].q;
    if (ZMOVE.rel.length === 2) {
      const V = new T.Vector3();
      ZMOVE.rel.forEach(({ q, a, m, ry, pil }) => {
        if (a) {
          a.applyMatrix4(m);
          a.updateMatrixWorld(true);
        }
        [q.r, q.g].forEach((o) => {
          if (!o) return;
          V.set(o.position.x, 0, o.position.z).applyMatrix4(m);
          o.position.x = V.x;
          o.position.z = V.z;
          if (!o.isSprite) o.rotation.y += ry;
        });
        pil.forEach((s) => {
          V.set(s.x, 0, s.z).applyMatrix4(m);
          s.x = V.x;
          s.z = V.z;
        });
        V.set(q.x, 0, q.z).applyMatrix4(m);
        q.x = V.x;
        q.z = V.z;
        if (q.ry != null) q.ry += ry;
      });
      // 04-gates' roots across the Frostfen arch: put them in the arch (and again whenever the gate is rebuilt)
      const G = typeof GTS !== "undefined" ? GTS.find((o) => o.id === "frost") : null;
      if (G) {
        const aF = ZMOVE.rel[0].a;
        const put = () => {
          if (!G.o || !G.o.g) return;
          G.o.g.position.set(qF.x, G.o.g.position.y, qF.z);
          G.o.g.rotation.y = Math.PI / 2 + (aF ? aF.rotation.y : 0);
        };
        put();
        if (!G.__zm) {
          G.__zm = 1;
          const r0 = G.reset;
          G.reset = function () {
            const out = r0.apply(this, arguments);
            put();
            return out;
          };
        }
      }
    }
    console.log("ZMOVE: dressed", JSON.stringify(N));
  };
  ZMOVE.go = () => {
    try {
      ZMOVE.move();
    } catch (e) {
      console.error("ZMOVE.move failed (world left half-moved, reload without the switch):", e);
      ZMOVE.err = e;
      document.title = "ZMOVE ERROR: " + (e && e.message);
      return;
    }
    try {
      ZMOVE.dress();
    } catch (e) {
      console.error("ZMOVE.dress failed (lands moved, look unfinished):", e);
      ZMOVE.err = e;
    }
  };
  if (want()) {
    console.log("ZMOVE: switch on, the lands will move at DOMContentLoaded");
    if (document.readyState === "loading") addEventListener("DOMContentLoaded", ZMOVE.go);
    else ZMOVE.go();
  } else console.log('ZMOVE: off (to test: localStorage.duskwick_zmove = "1", then reload)');
})();
