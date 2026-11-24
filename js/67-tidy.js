// v44 Tidy (loads LAST, after 66): only top-level name TIDY. One cleanup pass once the whole world is in place.
// Older scenery (03's instanced trees, pines, spires, crystals, dead trunks, rocks) was placed before later files built
// or moved buildings on top of it (Market Lane shops, 61's village town planner, 64's street move), so some of it
// stands inside walls. On the first explore frame (after 61/64 have run, before anything lazy matters) this:
//  - takes every visible baked building (03 bake(), userData.bk; footprint <= 30, height >= 1.5, not dungeons z > 300)
//    as an oriented box (its own local bounds, rotation and scale),
//  - squashes (scale 0) every instance of a round scenery InstancedMesh (cone/cylinder/sphere/poly shapes, height >= 0.8;
//    never boxes/planes/circles/tori, never userData.lus/evo/fin) whose middle reaches into a building, plus the other
//    parts standing on that exact spot (trunk + foliage layers of one tree),
//  - keeps 03's occluder entries (OCC.mx) squashed too, so the camera fade never brings them back, and drops the
//    camera-blocker (CB) / small solid sitting on a removed spot.
// No save fields, no NET; the result is the same for every player (same world, same rules). TIDY.stats = counts.
// TIDY.scan() (console) lists scenery still inside buildings: [{x, z, depth, place}].
const TIDY = (() => {
  const SHAPES = /^(Cone|Cylinder|Sphere|Icosahedron|Dodecahedron|Octahedron|Tetrahedron|Buffer)Geometry$/;
  const ZM = new T.Matrix4().makeScale(0, 0, 0);
  const stats = { buildings: 0, removed: 0, parts: 0, cb: 0, solids: 0 };

  function hiddenUp(o) {
    for (let p = o; p && p !== S; p = p.parent)
      if (!p.visible && !(p.name && /^(zone:|reach|wilds:|luster:)/.test(p.name))) return true;
    return false;
  }
  function tagged(o) {
    for (let p = o; p && p !== S; p = p.parent) {
      const u = p.userData || {};
      if (u.lus || u.evo || u.fin || u.bk) return true;
    }
    return false;
  }

  // ---------- building footprints ----------
  function buildings() {
    const out = [],
      pos = new T.Vector3(),
      q = new T.Quaternion(),
      sc = new T.Vector3(),
      eu = new T.Euler();
    S.traverse((o) => {
      if (!o.userData || !o.userData.bk || hiddenUp(o)) return;
      const b = new T.Box3();
      o.children.forEach((c) => {
        if (!c.isMesh || !c.geometry) return;
        if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
        c.updateMatrix();
        b.union(c.geometry.boundingBox.clone().applyMatrix4(c.matrix));
      });
      if (b.isEmpty()) return;
      o.matrixWorld.decompose(pos, q, sc);
      const sx = Math.abs(sc.x) || 1,
        sz = Math.abs(sc.z) || 1;
      if ((b.max.y - b.min.y) * sc.y < 1.5) return;
      if ((b.max.x - b.min.x) * sx > 30 || (b.max.z - b.min.z) * sz > 30) return;
      if (pos.z > 300) return;
      out.push({ o, x: pos.x, z: pos.z, ry: eu.setFromQuaternion(q, "YXZ").y, sx, sz, b });
    });
    return out;
  }
  // how far (x, z) is inside building B (negative = outside by that much)
  function depth(B, x, z) {
    const dx = x - B.x,
      dz = z - B.z,
      c = Math.cos(-B.ry),
      s = Math.sin(-B.ry),
      lx = (dx * c - dz * s) / B.sx,
      lz = (dx * s + dz * c) / B.sz,
      b = B.b;
    const px = Math.max(b.min.x - lx, 0, lx - b.max.x),
      pz = Math.max(b.min.z - lz, 0, lz - b.max.z);
    if (px || pz) return -Math.hypot(px * B.sx, pz * B.sz);
    return Math.min(lx - b.min.x, b.max.x - lx, lz - b.min.z, b.max.z - lz) * Math.min(B.sx, B.sz);
  }
  function grid(L) {
    const G = new Map();
    L.forEach((B, i) => {
      const k = Math.floor(B.x / 16) + "," + Math.floor(B.z / 16);
      (G.get(k) || G.set(k, []).get(k)).push(i);
    });
    return (x, z, f) => {
      const cx = Math.floor(x / 16),
        cz = Math.floor(z / 16);
      for (let a = -1; a <= 1; a++)
        for (let c = -1; c <= 1; c++) {
          const l = G.get(cx + a + "," + (cz + c));
          if (l) for (const i of l) if (f(L[i]) === true) return true;
        }
      return false;
    };
  }

  // ---------- round scenery instances ----------
  function instances() {
    const out = [],
      m4 = new T.Matrix4(),
      bx = new T.Box3();
    S.traverse((o) => {
      if (!o.isInstancedMesh || !o.geometry || tagged(o) || hiddenUp(o)) return;
      if (!SHAPES.test(o.geometry.type)) return;
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      o.updateMatrixWorld();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4);
        m4.premultiply(o.matrixWorld);
        bx.copy(g.boundingBox).applyMatrix4(m4);
        const sx = bx.max.x - bx.min.x,
          sz = bx.max.z - bx.min.z,
          h = bx.max.y - Math.max(0, bx.min.y);
        if (!isFinite(sx) || sx < 0.05 || h < 0.8 || bx.min.y > 3 || sx > 20 || sz > 20) continue;
        out.push({ m: o, i, x: (bx.min.x + bx.max.x) / 2, z: (bx.min.z + bx.max.z) / 2, r: 0.45 * Math.min(sx, sz) });
      }
    });
    return out;
  }
  function inside(near, it) {
    let d = -1e9;
    near(it.x, it.z, (B) => {
      d = Math.max(d, depth(B, it.x, it.z) + it.r * 0.9);
    });
    return d;
  }

  function squash(L) {
    const done = new Set(),
      spots = [];
    const key = (it) => it.m.uuid + "|" + it.i;
    const touched = new Set();
    L.forEach((it) => {
      if (done.has(key(it))) return;
      done.add(key(it));
      it.m.setMatrixAt(it.i, ZM);
      touched.add(it.m);
      spots.push(it);
    });
    touched.forEach((m) => (m.instanceMatrix.needsUpdate = true));
    // occluder entries keep their instance matrices to restore after a camera fade: keep those squashed too
    if (typeof OCC !== "undefined")
      for (const o of OCC) {
        if (!o.ms) continue;
        o.ms.forEach((m, j) => {
          if (m.isInstancedMesh && done.has(m.uuid + "|" + o.i)) o.mx[j] = ZM.clone();
        });
      }
    // camera blockers / small solids on a removed spot
    const at = (a) => spots.some((s) => Math.hypot(s.x - a.x, s.z - a.z) < 0.6);
    if (typeof CB !== "undefined")
      for (let i = CB.length - 1; i >= 0; i--) {
        const c = CB[i];
        if (c && !c.hs && (c.r || 0) <= 2.5 && at(c)) {
          CB.splice(i, 1);
          stats.cb++;
        }
      }
    for (let i = solids.length - 1; i >= 0; i--) {
      const s = solids[i];
      if (s && s.r <= 1.6 && at(s)) {
        solids.splice(i, 1);
        stats.solids++;
      }
    }
    return done.size;
  }

  function run() {
    S.updateMatrixWorld(true);
    const BL = buildings();
    stats.buildings = BL.length;
    const near = grid(BL),
      IT = instances();
    const hit = IT.filter((it) => inside(near, it) > 0.2);
    stats.removed = hit.length;
    // the other parts of the same plant/rock: instances of other meshes on that exact spot
    const sp = new Map();
    hit.forEach((h) => sp.set(Math.round(h.x * 2) + "," + Math.round(h.z * 2), h));
    const all = hit.slice();
    IT.forEach((it) => {
      if (hit.includes(it)) return;
      const k = Math.round(it.x * 2) + "," + Math.round(it.z * 2),
        h = sp.get(k);
      if (h && Math.hypot(h.x - it.x, h.z - it.z) < 0.35) {
        all.push(it);
        stats.parts++;
      }
    });
    squash(all);
  }

  function scan() {
    S.updateMatrixWorld(true);
    const BL = buildings(),
      near = grid(BL);
    return instances()
      .map((it) => ({ x: Math.round(it.x), z: Math.round(it.z), depth: +inside(near, it).toFixed(2) }))
      .filter((r) => r.depth > 0.2)
      .map((r) => {
        try {
          r.place = zoneAt(r.x, r.z) === "hub" ? hubAt(r.x, r.z) : zoneAt(r.x, r.z);
        } catch (e) {}
        return r;
      });
  }

  let doneRun = false,
    bootT = 0;
  function frame(now) {
    if (doneRun) return;
    requestAnimationFrame(frame);
    // a character must be in the world (the title screen also runs in "explore") and the page fully loaded (61 runs
    // its town planner on window load)
    if (typeof mode === "undefined" || mode !== "explore" || document.body.classList.contains("ttl")) return;
    if (typeof SLOT === "undefined" || SLOT < 0 || document.readyState !== "complete") return;
    if (!bootT) bootT = now + 1500;
    if (now < bootT) return;
    doneRun = true;
    try {
      run();
    } catch (e) {
      console.error(e);
    }
  }
  requestAnimationFrame(frame);

  return { stats, scan, run, done: () => doneRun };
})();
