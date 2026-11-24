// DUSKWICK - 36-detail.js (v28b): surface detail on foes and summons. Loads LAST so its mkFoe wrap sits outside every
// other file's mkFoe wrap (27 new foes, 33 road bosses/swamp foes, 34 dungeon bosses). No top-level names.
// dtChar (01-core.js) gives a model fur/hide, stone, wood, leaf or a light grain sampled in its own space.
// Townsfolk get theirs inside person() (02-models.js).
// v28c: every character model (foes, summons, townsfolk) also gets its round parts rebuilt smoother, like the wizard's
// v18 pass (02-models.js): low-poly spheres, cylinders, cones and rings get more segments. A part whose geometry was
// scaled, rotated or bent when built is left alone; one that was only shifted is shifted back into place. Faceted
// pieces (4-6 sided cones and cylinders, gems, crystals) stay faceted. Rebuilt geometry is cached by shape, so the many
// copies of one foe share it, and an outline twin (same geometry) is swapped along with its mesh. Townsfolk also get
// ears. Low quality skips the smoothing.
(() => {
  const SMOOTH = typeof GFX === "undefined" || GFX !== "low",
    HI = typeof GFX === "undefined" || GFX === "high",
    done = new WeakMap(), // original geometry -> rebuilt geometry (or null = keep)
    byKey = new Map(), // shape key -> rebuilt geometry (shared between models)
    b0 = new T.Box3(),
    s0 = new T.Vector3(),
    s1 = new T.Vector3(),
    c0 = new T.Vector3(),
    c1 = new T.Vector3(),
    f0 = new T.Vector3(),
    f1 = new T.Vector3(),
    l0 = new T.Vector3(),
    l1 = new T.Vector3();
  // segment counts by size (local radius): big parts get the most
  const seg = (r, big, mid, sm) => {
    const n = r >= 0.3 ? big : r >= 0.1 ? mid : sm;
    return HI ? n : Math.max(8, Math.round(n * 0.75));
  };
  function rebuild(g) {
    const p = g.parameters;
    if (!p) return null;
    if (g.type === "SphereGeometry") {
      const w = seg(p.radius, 26, 18, 12);
      if (p.widthSegments >= w) return null;
      return [
        "S",
        [p.radius, w, Math.max(6, Math.round(w * 0.7)), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength],
        (a) => new T.SphereGeometry(...a),
      ];
    }
    if (g.type === "CylinderGeometry") {
      if (p.radialSegments <= 6) return null;
      const n = seg(Math.max(p.radiusTop, p.radiusBottom), 24, 16, 12);
      if (p.radialSegments >= n) return null;
      return [
        "Y",
        [p.radiusTop, p.radiusBottom, p.height, n, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength],
        (a) => new T.CylinderGeometry(...a),
      ];
    }
    if (g.type === "ConeGeometry") {
      if (p.radialSegments <= 6) return null;
      const n = seg(p.radius, 24, 16, 12);
      if (p.radialSegments >= n) return null;
      return [
        "C",
        [p.radius, p.height, n, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength],
        (a) => new T.ConeGeometry(...a),
      ];
    }
    if (g.type === "TorusGeometry") {
      const rs = HI ? 10 : 8,
        ts = HI ? 32 : 24;
      if (p.radialSegments >= rs && p.tubularSegments >= ts) return null;
      return [
        "T",
        [p.radius, p.tube, Math.max(rs, p.radialSegments), Math.max(ts, p.tubularSegments), p.arc],
        (a) => new T.TorusGeometry(...a),
      ];
    }
    return null;
  }
  // the first and last vertex of a built-in sphere/cylinder/cone/torus don't depend on the segment count, so comparing
  // them (plus the bounding box) tells a part that was only moved from one that was scaled, rotated or bent
  function smoothGeo(g) {
    if (done.has(g)) return done.get(g);
    let out = null;
    const rb = rebuild(g);
    if (rb && g.attributes.position && g.attributes.position.count > 1) {
      const n = rb[2](rb[1]),
        pa = g.attributes.position,
        pb = n.attributes.position;
      g.computeBoundingBox();
      n.computeBoundingBox();
      b0.copy(g.boundingBox).getSize(s0);
      b0.getCenter(c0);
      b0.copy(n.boundingBox).getSize(s1);
      b0.getCenter(c1);
      f0.fromBufferAttribute(pa, 0);
      f1.fromBufferAttribute(pb, 0);
      l0.fromBufferAttribute(pa, pa.count - 1);
      l1.fromBufferAttribute(pb, pb.count - 1);
      f0.sub(f1); // the shift
      l0.sub(l1);
      const big = Math.max(s1.x, s1.y, s1.z, 0.01),
        e = 0.004 * big + 1e-4;
      const ok =
        f0.distanceTo(l0) < e &&
        Math.abs(s0.y - s1.y) < 0.03 * Math.max(s1.y, 0.01) + 0.002 &&
        Math.abs(s0.x - s1.x) < 0.15 * Math.max(s1.x, 0.01) + 0.002 &&
        Math.abs(s0.z - s1.z) < 0.15 * Math.max(s1.z, 0.01) + 0.002 &&
        c0.sub(c1).distanceTo(f0) < 0.1 * big + 0.002;
      if (ok) {
        const r4 = (v) => Math.round(v * 1e4) / 1e4,
          k = rb[0] + rb[1].map(r4).join(",") + "|" + r4(f0.x) + "," + r4(f0.y) + "," + r4(f0.z);
        out = byKey.get(k);
        if (!out) {
          if (f0.lengthSq() > 1e-10) n.translate(f0.x, f0.y, f0.z);
          n.computeBoundingSphere();
          byKey.set(k, (out = n));
        } else n.dispose();
      } else n.dispose();
    }
    done.set(g, out);
    return out;
  }
  function smooth(root) {
    if (!SMOOTH || !root || root.userData.smo || (typeof W !== "undefined" && root === W)) return root;
    root.userData.smo = 1;
    root.traverse((m) => {
      if (!m.isMesh || m.isInstancedMesh || !m.geometry) return;
      const n = smoothGeo(m.geometry);
      if (n) m.geometry = n; // outline twins share the old geometry, so they map to the same new one
    });
    return root;
  }
  // townsfolk: ears on the head pivot, in a copy of the head's skin material (a painted face map on the head, e.g. the
  // tutorial's Oona, must not land on them)
  function ears(o) {
    const u = o.userData;
    if (!u || !u.hd || !u.ey || u.ears) return;
    const head = u.hd.children.find(
      (m) => m.isMesh && m.geometry.type === "SphereGeometry" && Math.abs(m.geometry.parameters.radius - 0.38) < 0.01,
    );
    if (!head) return;
    u.ears = 1;
    const em = head.material.clone();
    em.map = null;
    [-1, 1].forEach((s) => {
      const e = new T.Mesh(new T.SphereGeometry(0.075, 14, 10), em);
      e.position.set(head.position.x + s * 0.365, head.position.y - 0.01, head.position.z + 0.02);
      e.scale.set(0.42, 1, 0.75);
      e.rotation.y = s * 0.35;
      u.hd.add(e);
    });
  }
  if (typeof mkFoe === "function") {
    const mf0 = mkFoe;
    mkFoe = function () {
      const o = mf0.apply(this, arguments);
      return dtChar(smooth(o));
    };
  }
  if (typeof sumMesh === "function") {
    const sm0 = sumMesh;
    sumMesh = function () {
      return dtChar(smooth(sm0.apply(this, arguments)));
    };
  }
  if (typeof person === "function") {
    const pe0 = person;
    person = function () {
      const o = pe0.apply(this, arguments);
      ears(o);
      return smooth(o);
    };
  }
  // the street, road and dungeon foes were built before this file loaded; the 01-core load pass has tagged their
  // materials as world surfaces by then, and dtChar switches them to their own space. Townsfolk and NPCs built in
  // world() (any model dtChar tagged) get their smoothing and ears here too.
  const pass = () => {
    try {
      foes.forEach((f) => f && f.o && dtChar(smooth(f.o)));
    } catch (e) {}
    try {
      const L = [];
      S.traverse((o) => o.userData && o.userData.dtc && !o.userData.smo && L.push(o));
      L.forEach((o) => {
        ears(o);
        smooth(o);
      });
    } catch (e) {}
  };
  if (document.readyState === "complete") pass();
  else window.addEventListener("load", pass);
})();
