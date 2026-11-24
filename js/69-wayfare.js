// v45 Wayfare (loads LAST, after 67-tidy): only top-level name WAYF. Clear, storybook ways between the lands.
// Built once on the first explore frame (a character in the world, page fully loaded, +2.6 s so 61/64/67 are done),
// entirely from live data (PT, ZCEN/ZVR, TRL, RDS, ZRD through zsW when ZSF.on, okp, WONDR.clear), so it follows the
// zones wherever 03 puts them:
//  1. path clean-up: round scenery instances (trees, pines, spires, rocks, bushes) whose middle stands on Gloomway (SW),
//     the town roads RDS (RDW), the trails TRL (TRW), the in-zone links or the zone streets ZRD (RDW) are squashed like
//     67-tidy does (OCC.mx too); camera blockers / small solids on those exact spots go with them. Plazas, glades,
//     village rings, street discs and anything beside a lamp / chest / NPC / portal are left alone.
//  2. bridges: where a path crosses water (03's WTX streams, blue/teal pools, lava) and no deck is there yet, a plank
//     bridge (stone over lava) with rails; and halfway along each trail between two lands, a small brook (stream, marsh
//     water or lava) crossing it under its own bridge. Visual only: okp and solids are untouched.
//  3. arches: a stone arch with the land's name board over each trail where it enters a land (TRL sB / sA), unless a
//     portal already stands there.
//  4. signposts: fingerposts with plank arms that point the way and name the destination (one canvas atlas, arrow
//     shaped, land-coloured band) at the Gloomway forks, the glade ends of the town roads and every trail end in a land.
//  5. edge guides: glowing-rune waystones along the trails in the wilds (between 03's lamps) and small lantern posts on
//     the trail stretches inside a land (where 03 put no lamps).
// Everything is merged into one mesh per material per 200-unit area (userData.lus/wayf, no lights, no solids, glow is
// MeshBasic), fewer pieces on Low. Skips the editor build area south of the square, dungeons, the tower and the Reach.
// No save fields, no NET. WAYF.stats = counts, WAYF.placed = what went where, WAYF.scan() = small solids still standing
// inside a path (diagnostic only, nothing is dropped).
const WAYF = (() => {
  const stats = {
    cleared: 0,
    parts: 0,
    solids: 0,
    cb: 0,
    brookCleared: 0,
    bridges: 0,
    brooks: 0,
    arches: 0,
    posts: 0,
    arms: 0,
    guides: 0,
    blocked: 0,
    ms: 0,
  };
  const placed = [],
    brooks = [],
    wetPaths = new Set();
  const LOW = typeof GFX !== "undefined" && GFX === "low";
  const ZM = new T.Matrix4().makeScale(0, 0, 0);
  const SHAPES = /^(Cone|Cylinder|Sphere|Icosahedron|Dodecahedron|Octahedron|Tetrahedron|Buffer)Geometry$/;
  const LAND = { hub: "LAMPLIGHT SQUARE", frost: "FROSTFEN", ember: "CINDERWASTE", marsh: "MIREWICK" };
  const LCOL = { hub: 0xffd98a, frost: 0x8ad0ff, ember: 0xff7a3d, marsh: 0x5fe0c0, spire: 0xb48aff };
  const STONE = { hub: 0x8a849c, frost: 0x9fb4c8, ember: 0x5a4440, marsh: 0x6a7a70 };
  const WSTONE = { hub: 0x6a6e66, frost: 0x8e9aac, ember: 0x3e3236, marsh: 0x4e5646 };
  const WOOD = 0x6b4a2b,
    WOODD = 0x4a3020,
    DARK = 0x3a3450,
    POLE = 0x5a4030,
    IRON = 0x2a2438,
    WARM = 0xffd98a;

  // ---------- small helpers ----------
  const hiddenUp = (o) => {
    for (let p = o; p && p !== S; p = p.parent)
      if (!p.visible && !(p.name && /^(zone:|reach|wilds:|luster:)/.test(p.name))) return true;
    return false;
  };
  const tagged = (o, keys) => {
    for (let p = o; p && p !== S; p = p.parent) {
      const u = p.userData || {};
      for (const k of keys) if (u[k]) return true;
    }
    return false;
  };
  const segD = (a, b, x, z) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      l2 = dx * dx + dz * dz || 1e-9;
    let t = ((x - a[0]) * dx + (z - a[1]) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
  };
  const clr = (x, z, r) => {
    try {
      return typeof WONDR === "undefined" || !WONDR.clear || WONDR.clear(x, z, r);
    } catch (e) {
      return true;
    }
  };
  // places this pass never touches: dungeons (z > 300 / the street dungeons far north), the tower, the Reach, and the
  // user's own editor builds south of the square
  const skipAt = (x, z) => {
    if (z > 300 || z < -1250) return true;
    if (Math.abs(x - OX) < 300 && z < -800) return true;
    if (typeof REACH !== "undefined" && REACH.inR && REACH.inR(x, z)) return true;
    if (Math.abs(x - OX) < 160 && z > -370 && z < -240) return true;
    return false;
  };
  const zsOn = () => typeof ZSF !== "undefined" && !!ZSF.on;
  // the land (ZCEN key) whose centre is nearest within r, else "hub"; read live (zones can move at DOMContentLoaded)
  const landAt = (x, z, r) => {
    let best = "hub",
      bd = r == null ? ZR : r;
    for (const k in ZCEN) {
      const d = Math.hypot(x - ZCEN[k][0], z - ZCEN[k][1]);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  };

  // ---------- paths (world coords) ----------
  function mkPath(n, kind, w, pts, extra) {
    const s = [0];
    for (let k = 1; k < pts.length; k++)
      s.push(s[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    return Object.assign({ n, kind, w, pts, s, L: s[s.length - 1] }, extra || {});
  }
  // point + heading at distance s along a path
  function at(p, s) {
    s = Math.max(0, Math.min(p.L, s));
    let lo = 0,
      hi = p.s.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (p.s[m] <= s) lo = m;
      else hi = m;
    }
    const a = p.pts[lo],
      b = p.pts[hi],
      l = p.s[hi] - p.s[lo] || 1,
      t = (s - p.s[lo]) / l;
    // heading smoothed over a few units so curves don't jitter
    const a2 = p.pts[Math.max(0, lo - 1)],
      b2 = p.pts[Math.min(p.pts.length - 1, hi + 1)],
      hl = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b2[0] - a2[0]) / hl, (b2[1] - a2[1]) / hl];
  }
  function paths() {
    const L = [],
      gw = [];
    for (let z = OZ - 18; z >= OZ + PZ + PR; z -= 3) gw.push([OX, z]);
    L.push(mkPath("Gloomway", "street", SW, gw));
    RDS.forEach((rd, i) =>
      L.push(
        mkPath(
          RDSEC[i][0],
          "road",
          RDW,
          rd.p.map(([x, z]) => [OX + x, OZ + z]),
          { rd, i },
        ),
      ),
    );
    // trails: p.t is this file's own span record {n, ta, tb, sA, sB, src}, worked out here from live ZCEN (the zones
    // may have been moved in place at DOMContentLoaded, so 11's trSpan / 03's zoneAt literals can't be trusted)
    TRL.forEach((t, i) => {
      const p = mkPath(
        t.n,
        "trail",
        TRW,
        t.p.map(([x, z]) => [OX + x, OZ + z]),
        { i },
      );
      const e0 = p.pts[0],
        e1 = p.pts[p.pts.length - 1],
        ta = landAt(e0[0], e0[1], ZR + 40),
        tb = landAt(e1[0], e1[1], ZR + 40),
        inZ = (k, s) => {
          const q = at(p, s);
          return ZCEN[k] && Math.hypot(q[0] - ZCEN[k][0], q[1] - ZCEN[k][1]) < ZR;
        };
      let sA = 0,
        sB = p.L;
      while (sA < p.L && inZ(ta, sA)) sA += 1;
      while (sB > sA && inZ(tb, sB)) sB -= 1;
      p.t = { n: t.n, ta, tb, sA, sB, src: t };
      L.push(p);
    });
    ZRD.forEach((t, i) => {
      const mv = zsOn() && t.n && i < ZSF.length;
      const pts = t.p.map(([x, z]) => (mv ? zsW(i, OX + x, OZ + z) : [OX + x, OZ + z]));
      L.push(mkPath(t.n || "link", t.n ? "zstreet" : "link", RDW, pts, { t, i }));
    });
    return L;
  }
  // segment grid: q(x, z) -> { d: how far inside the nearest path (w - distance), dist, p } or null
  function pathGrid(L) {
    const G = new Map(),
      CS = 10;
    L.forEach((p) => {
      for (let k = 0; k < p.pts.length - 1; k++) {
        const a = p.pts[k],
          b = p.pts[k + 1],
          x0 = Math.floor((Math.min(a[0], b[0]) - p.w - 1) / CS),
          x1 = Math.floor((Math.max(a[0], b[0]) + p.w + 1) / CS),
          z0 = Math.floor((Math.min(a[1], b[1]) - p.w - 1) / CS),
          z1 = Math.floor((Math.max(a[1], b[1]) + p.w + 1) / CS);
        for (let cx = x0; cx <= x1; cx++)
          for (let cz = z0; cz <= z1; cz++) {
            const key = cx + "," + cz;
            (G.get(key) || G.set(key, []).get(key)).push({ a, b, p });
          }
      }
    });
    return (x, z) => {
      const l = G.get(Math.floor(x / CS) + "," + Math.floor(z / CS));
      if (!l) return null;
      let best = null;
      for (const sg of l) {
        const dist = segD(sg.a, sg.b, x, z),
          d = sg.p.w - dist;
        if (!best || d > best.d) best = { d, dist, p: sg.p };
      }
      return best;
    };
  }
  // circles left alone by the clean-up (plazas, glades, villages, street discs, beside lamps / chests / NPCs / portals)
  function plazas() {
    const out = [
      [OX, OZ, 21],
      [OX, OZ + MLZ, MLR + 2],
      [OX, OZ + PZ, PR + 4],
      [OX, OZ + TCZ, 22],
    ];
    RDS.forEach((rd) => {
      rd.cn.forEach((c) => out.push([OX + c[0], OZ + c[1], RCP + 2]));
      out.push([OX + rd.gx, OZ + rd.gz, 19]);
    });
    for (const k in ZCEN) out.push([ZCEN[k][0], ZCEN[k][1], ZVR[k] + ZSB + 2]);
    ZRD.forEach((t, i) => {
      if (!t.n) return;
      const f = (x, z) => (zsOn() && i < ZSF.length ? zsW(i, x, z) : [x, z]),
        a = f(t.X, 0),
        b = f(t.X, -ZSL),
        c = f(t.pk[0], t.pk[1]);
      out.push([a[0], a[1], 11], [b[0], b[1], ZCR + 3], [c[0], c[1], t.pk[2] + 2]);
    });
    const lists = [NPCS, LS, PT];
    if (typeof LAMPS !== "undefined") lists.push(LAMPS);
    if (typeof CHESTS !== "undefined") lists.push(CHESTS);
    lists.forEach((A) => {
      if (Array.isArray(A)) A.forEach((o) => o && o.x != null && out.push([o.x, o.z, 2]));
    });
    return out;
  }

  // ---------- 1. path clean-up (squash like 67-tidy) ----------
  const done = new Set();
  function squash(list) {
    const spots = [],
      touched = new Set();
    let n = 0;
    list.forEach((it) => {
      const k = it.m.uuid + "|" + it.i;
      if (done.has(k)) return;
      done.add(k);
      it.m.setMatrixAt(it.i, ZM);
      touched.add(it.m);
      spots.push(it);
      n++;
    });
    if (!n) return 0;
    touched.forEach((m) => (m.instanceMatrix.needsUpdate = true));
    // occluder entries keep instance matrices to restore after a camera fade: keep those squashed too
    if (typeof OCC !== "undefined")
      for (const o of OCC) {
        if (!o || !o.ms) continue;
        o.ms.forEach((m, j) => {
          if (m && m.isInstancedMesh && done.has(m.uuid + "|" + o.i) && o.mx) o.mx[j] = ZM.clone();
        });
      }
    const atSpot = (a) => spots.some((s) => Math.abs(s.x - a.x) < 0.6 && Math.hypot(s.x - a.x, s.z - a.z) < 0.6);
    if (typeof CB !== "undefined")
      for (let i = CB.length - 1; i >= 0; i--) {
        const c = CB[i];
        if (c && !c.hs && (c.r || 0) <= 2.5 && atSpot(c)) {
          CB.splice(i, 1);
          stats.cb++;
        }
      }
    for (let i = solids.length - 1; i >= 0; i--) {
      const s = solids[i];
      if (s && s.r <= 1.6 && atSpot(s)) {
        solids.splice(i, 1);
        stats.solids++;
      }
    }
    return n;
  }
  function instances() {
    const out = [],
      m4 = new T.Matrix4(),
      bx = new T.Box3();
    S.traverse((o) => {
      if (!o.isInstancedMesh || !o.geometry || !SHAPES.test(o.geometry.type)) return;
      if (tagged(o, ["lus", "evo", "fin", "bk", "wayf"]) || hiddenUp(o)) return;
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4);
        m4.premultiply(o.matrixWorld);
        bx.copy(g.boundingBox).applyMatrix4(m4);
        const sx = bx.max.x - bx.min.x,
          sz = bx.max.z - bx.min.z,
          h = bx.max.y - Math.max(0, bx.min.y);
        if (!isFinite(sx) || sx < 0.05 || h < 0.5 || bx.min.y > 3 || sx > 20 || sz > 20) continue;
        out.push({ m: o, i, x: (bx.min.x + bx.max.x) / 2, z: (bx.min.z + bx.max.z) / 2, r: 0.45 * Math.min(sx, sz) });
      }
    });
    return out;
  }
  function cleanup(IT, near, PLZ) {
    const hit = IT.filter((it) => {
      if (skipAt(it.x, it.z)) return false;
      const q = near(it.x, it.z);
      if (!q || q.d < 0.4) return false;
      return !PLZ.some((c) => Math.abs(it.x - c[0]) < c[2] && Math.hypot(it.x - c[0], it.z - c[1]) < c[2]);
    });
    // the other parts of the same plant / rock: instances of other meshes on that exact spot
    const sp = new Map();
    hit.forEach((h) => sp.set(Math.round(h.x * 2) + "," + Math.round(h.z * 2), h));
    const hs = new Set(hit),
      all = hit.slice();
    let parts = 0;
    IT.forEach((it) => {
      if (hs.has(it)) return;
      const h = sp.get(Math.round(it.x * 2) + "," + Math.round(it.z * 2));
      if (h && Math.hypot(h.x - it.x, h.z - it.z) < 0.35) {
        all.push(it);
        parts++;
      }
    });
    stats.cleared += hit.length;
    stats.parts += parts;
    squash(all);
  }
  // small solids still inside a path (diagnostic: they may be lamps, gates or wards on purpose, so nothing is dropped)
  function blocked(near, PLZ) {
    return solids
      .filter((s) => {
        if (!s || s.r > 1.6 || skipAt(s.x, s.z)) return false;
        const q = near(s.x, s.z);
        if (!q || q.d < 0.8) return false;
        return !PLZ.some((c) => Math.hypot(s.x - c[0], s.z - c[1]) < c[2]);
      })
      .map((s) => ({ x: Math.round(s.x), z: Math.round(s.z), r: s.r, path: near(s.x, s.z).p.n }));
  }

  // ---------- scene index: small things standing about, ground sheets, water, existing decks ----------
  let IDX = null;
  function index() {
    const TH = new Map(),
      CS = 8,
      gnd = [],
      wat = [],
      deck = [],
      zmb = [],
      bb = new T.Box3(),
      m4 = new T.Matrix4(),
      hsl = {},
      wtx = typeof WTX !== "undefined" ? WTX : [];
    const thing = (b) => {
      const h = b.max.y - b.min.y,
        ex = Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
      if (!isFinite(ex) || ex < 0.05 || ex > 14 || h < 0.25 || b.min.y > 4) return;
      const x = (b.min.x + b.max.x) / 2,
        z = (b.min.z + b.max.z) / 2,
        k = Math.floor(x / CS) + "," + Math.floor(z / CS);
      (TH.get(k) || TH.set(k, []).get(k)).push(x, z, Math.max(0.15, ex / 2));
    };
    S.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
      if (tagged(o, ["lus", "wayf"]) || hiddenUp(o)) return;
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      if (g.boundingBox.isEmpty()) return;
      // the re-layout session's river bridges (userData.zmb): count as decks, and their rivers get no second bridge
      // (64a also tags its new ground discs / meadow base zmb: flat wide pieces are ground, the rest bridge parts;
      // its rivers are never treated as water here)
      if (tagged(o, ["zmb"])) {
        if (o.isInstancedMesh) return;
        bb.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
        if (!isFinite(bb.min.x)) return;
        const zx = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z),
          zy = bb.max.y - bb.min.y;
        if (zy < 0.12 || zx > 60) {
          if (zx > 12 && zy < 1.5) gnd.push({ o, b: bb.clone() });
        } else {
          deck.push(bb.clone());
          zmb.push([(bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2]);
        }
        return;
      }
      if (o.isInstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          o.getMatrixAt(i, m4);
          m4.premultiply(o.matrixWorld);
          bb.copy(g.boundingBox).applyMatrix4(m4);
          thing(bb);
        }
        return;
      }
      bb.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
      const ex = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z),
        hy = bb.max.y - bb.min.y;
      if (!isFinite(ex)) return;
      const mt = Array.isArray(o.material) ? o.material[0] : o.material;
      if (mt && mt.color && hy < 0.5 && bb.max.y < 0.6 && ex > 2.5 && ex < 140) {
        let wet = !!(mt.map && wtx.indexOf(mt.map) >= 0),
          lava = false;
        if (!wet && !mt.isMeshBasicMaterial && !(mt.transparent && mt.opacity < 0.95)) {
          mt.color.getHSL(hsl);
          wet = hsl.h > 0.46 && hsl.h < 0.7 && hsl.s > 0.4 && hsl.l > 0.2 && hsl.l < 0.72;
          const e = mt.emissive;
          lava = !!(e && e.r > 0.5 && e.g < 0.45 && e.b < 0.2 && hsl.h < 0.12 && hsl.s > 0.6);
        }
        if (wet || lava) {
          wat.push({
            o,
            b: bb.clone(),
            lava,
            y: (bb.min.y + bb.max.y) / 2,
            inv: new T.Matrix4().copy(o.matrixWorld).invert(),
          });
          return;
        }
      }
      if (hy < 1.5 && ex > 12) gnd.push({ o, b: bb.clone() });
      if (hy >= 0.12 && hy < 0.8 && bb.max.y > 0.1 && bb.max.y < 0.8 && ex >= 2.5 && ex <= 40) deck.push(bb.clone());
      thing(bb);
    });
    IDX = {
      gnd,
      wat,
      deck,
      zmb,
      zmbNear: (x, z, r) => zmb.some((c) => Math.hypot(c[0] - x, c[1] - z) < r),
      thingAt(x, z, r) {
        const cx = Math.floor(x / CS),
          cz = Math.floor(z / CS);
        for (let a = -2; a <= 2; a++)
          for (let c = -2; c <= 2; c++) {
            const l = TH.get(cx + a + "," + (cz + c));
            if (l)
              for (let i = 0; i < l.length; i += 3) if (Math.hypot(l[i] - x, l[i + 1] - z) < l[i + 2] + r) return true;
          }
        return false;
      },
    };
  }
  const rc = new T.Raycaster(),
    DN = new T.Vector3(0, -1, 0),
    _o = new T.Vector3(),
    _v = new T.Vector3();
  function groundY(x, z) {
    let y = -1e9;
    rc.set(_o.set(x, 30, z), DN);
    rc.far = 40;
    for (const gd of IDX.gnd) {
      const b = gd.b;
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      const h = rc.intersectObject(gd.o, false);
      if (h.length && h[0].point.y < 2 && h[0].point.y > y) y = h[0].point.y;
    }
    return y > -1e8 ? y : 0;
  }
  function wetAt(x, z) {
    for (const w of IDX.wat) {
      const b = w.b;
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      _v.set(x, w.y, z).applyMatrix4(w.inv);
      const g = w.o.geometry,
        pr = g.parameters || {},
        t = g.type;
      if (t === "CircleGeometry") {
        if (Math.hypot(_v.x, _v.y) <= pr.radius) return w;
      } else if (t === "PlaneGeometry") {
        if (Math.abs(_v.x) <= pr.width / 2 && Math.abs(_v.y) <= pr.height / 2) return w;
      } else if (t === "CylinderGeometry") {
        if (Math.hypot(_v.x, _v.z) <= Math.max(pr.radiusTop, pr.radiusBottom)) return w;
      } else {
        const gb = g.boundingBox,
          flatZ = gb.max.z - gb.min.z < gb.max.y - gb.min.y,
          c = flatZ ? _v.y : _v.z,
          lo = flatZ ? gb.min.y : gb.min.z,
          hi = flatZ ? gb.max.y : gb.max.z;
        if (_v.x >= gb.min.x && _v.x <= gb.max.x && c >= lo && c <= hi) return w;
      }
    }
    return null;
  }
  const hasDeck = (x, z) =>
    IDX.deck.some((b) => x >= b.min.x - 0.5 && x <= b.max.x + 0.5 && z >= b.min.z - 0.5 && z <= b.max.z + 0.5);

  // ---------- merged geometry bins ----------
  const bins = {},
    LBLG = [],
    CELLS = [],
    CELLK = new Map(),
    busy = [];
  let AREA = "0_0";
  const areaOf = (x, z) => Math.floor(x / 200) + "_" + Math.floor(z / 200);
  const _q = new T.Quaternion(),
    _p = new T.Vector3(),
    _s = new T.Vector3(),
    UP = new T.Vector3(0, 1, 0);
  const X = (x, y, z, yaw, sx, sy, sz) =>
    new T.Matrix4().compose(_p.set(x, y, z), _q.setFromAxisAngle(UP, yaw || 0), _s.set(sx || 1, sy || 1, sz || 1));
  const BXG = new T.BoxGeometry(1, 1, 1),
    CYG = new T.CylinderGeometry(1, 1, 1, LOW ? 6 : 8),
    CNG = new T.ConeGeometry(1, 1, 4),
    OCG = new T.OctahedronGeometry(1),
    PLG = new T.PlaneGeometry(1, 1);
  // YOFF = ground height under the piece being built (set by seat), so posts / stones / arches stand on the ground
  // instead of at y 0 (the ground between places sits lower, e.g. 64a's meadow base or the old wilds planes)
  let YOFF = 0;
  const seat = (x, z) => {
    AREA = areaOf(x, z);
    YOFF = Math.max(-0.8, Math.min(0.3, groundY(x, z)));
  };
  function put(mk, geo, m4) {
    const gg = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!gg.attributes.normal) gg.computeVertexNormals();
    gg.applyMatrix4(YOFF ? new T.Matrix4().makeTranslation(0, YOFF, 0).multiply(m4) : m4);
    const k = mk + "|" + AREA;
    (bins[k] || (bins[k] = [])).push(gg);
    return gg;
  }
  const busyAt = (x, z, r) => busy.some((b) => Math.hypot(b[0] - x, b[1] - z) < b[2] + r);
  // a label cell in the atlas: {t, sub, col, tip: 1 arrow right, -1 arrow left, 0 plain board}
  function cellOf(L) {
    const k = L.t + "|" + (L.sub || "") + "|" + L.col + "|" + L.tip;
    if (!CELLK.has(k)) {
      CELLK.set(k, CELLS.length);
      CELLS.push(L);
    }
    return CELLK.get(k);
  }
  function label(L, m4) {
    LBLG.push({ g: put("lbl", PLG, m4), cell: cellOf(L) });
  }
  function drawCell(g, cx, cy, L) {
    const W = 512,
      tp = L.tip ? 64 : 0,
      l = L.tip < 0 ? tp : 8,
      r = L.tip > 0 ? W - tp : W - 8,
      col = "#" + (L.col >>> 0).toString(16).padStart(6, "0");
    g.save();
    g.translate(cx * W, cy * 128);
    const shape = () => {
      g.beginPath();
      g.moveTo(l, 12);
      g.lineTo(r, 12);
      if (L.tip > 0) g.lineTo(W - 6, 64);
      g.lineTo(r, 116);
      g.lineTo(l, 116);
      if (L.tip < 0) g.lineTo(6, 64);
      g.closePath();
    };
    shape();
    const wd = g.createLinearGradient(0, 12, 0, 116);
    wd.addColorStop(0, "#5a3a1c");
    wd.addColorStop(1, "#33200e");
    g.fillStyle = wd;
    g.fill();
    g.save();
    shape();
    g.clip();
    g.strokeStyle = "rgba(0,0,0,.25)";
    g.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      g.beginPath();
      g.moveTo(0, 12 + i * 26 + Math.sin(i + cx) * 3);
      g.bezierCurveTo(170, 12 + i * 26 - 4, 340, 12 + i * 26 + 4, W, 12 + i * 26);
      g.stroke();
    }
    g.fillStyle = col;
    if (L.tip > 0) g.fillRect(l, 12, 26, 104);
    else if (L.tip < 0) g.fillRect(r - 26, 12, 26, 104);
    else {
      g.fillRect(l, 12, 22, 104);
      g.fillRect(r - 22, 12, 22, 104);
    }
    g.restore();
    shape();
    g.lineJoin = "round";
    g.lineWidth = 6;
    g.strokeStyle = "#c9a24a";
    g.stroke();
    const x0 = L.tip > 0 ? l + 34 : L.tip < 0 ? l + 10 : l + 30,
      x1 = L.tip > 0 ? r - 6 : L.tip < 0 ? r - 34 : r - 30,
      mx = (x0 + x1) / 2,
      mw = x1 - x0;
    let fs = L.sub ? 46 : 54;
    g.font = "800 " + fs + "px Georgia,serif";
    while (g.measureText(L.t).width > mw && fs > 18) g.font = "800 " + (fs -= 2) + "px Georgia,serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const ty = L.sub ? 52 : 66;
    g.fillStyle = "rgba(0,0,0,.55)";
    g.fillText(L.t, mx + 3, ty + 3);
    g.fillStyle = "#ffe29a";
    g.fillText(L.t, mx, ty);
    if (L.sub) {
      let f2 = 26;
      g.font = "italic 600 " + f2 + "px Georgia,serif";
      while (g.measureText(L.sub).width > mw && f2 > 14) g.font = "italic 600 " + (f2 -= 2) + "px Georgia,serif";
      g.fillStyle = "#e8d2a0";
      g.fillText(L.sub, mx, 95);
    }
    g.restore();
  }
  function flush() {
    let atlas = null;
    if (CELLS.length) {
      const rows = Math.ceil(CELLS.length / 2);
      let H = 128;
      while (H < rows * 128) H *= 2;
      const cv = document.createElement("canvas");
      cv.width = 1024;
      cv.height = H;
      const g = cv.getContext("2d");
      CELLS.forEach((L, i) => drawCell(g, i % 2, (i / 2) | 0, L));
      const tx = new T.CanvasTexture(cv);
      tx.anisotropy = 4;
      atlas = new T.MeshBasicMaterial({ map: tx, alphaTest: 0.5 });
      atlas.userData.dtx = 0;
      LBLG.forEach(({ g: geo, cell }) => {
        const uv = geo.attributes.uv,
          c = cell % 2,
          r = (cell / 2) | 0;
        for (let k = 0; k < uv.count; k++)
          uv.setXY(k, (c + uv.getX(k)) / 2, 1 - (r * 128 + (1 - uv.getY(k)) * 128) / H);
      });
    }
    const glow = {};
    for (const bk in bins) {
      const L = bins[bk],
        [mk, area] = bk.split("|");
      let n = 0;
      L.forEach((gg) => (n += gg.attributes.position.count));
      const pos = new Float32Array(n * 3),
        nor = new Float32Array(n * 3),
        uv = new Float32Array(n * 2);
      let o = 0;
      L.forEach((gg) => {
        const c = gg.attributes.position.count;
        pos.set(gg.attributes.position.array, o * 3);
        nor.set(gg.attributes.normal.array, o * 3);
        if (gg.attributes.uv) uv.set(gg.attributes.uv.array, o * 2);
        o += c;
      });
      const G = new T.BufferGeometry();
      G.setAttribute("position", new T.BufferAttribute(pos, 3));
      G.setAttribute("normal", new T.BufferAttribute(nor, 3));
      G.setAttribute("uv", new T.BufferAttribute(uv, 2));
      G.computeBoundingSphere();
      let mat;
      if (mk === "lbl") mat = atlas;
      else if (mk[0] === "g") {
        const c = +mk.slice(1);
        mat = glow[c] || (glow[c] = new T.MeshBasicMaterial({ color: c }));
      } else mat = M(+mk.slice(1));
      if (!mat) continue;
      const m = new T.Mesh(G, mat);
      m.name = "wayf:" + area;
      m.userData.lus = 1;
      m.userData.wayf = 1;
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      S.add(m);
    }
  }

  // ---------- 2. bridges and brooks ----------
  function bridge(p, s0, s1, stone, zk) {
    s0 = Math.max(0.5, s0);
    s1 = Math.min(p.L - 0.5, s1);
    const len = s1 - s0;
    if (len < 2) return;
    const mid = at(p, (s0 + s1) / 2);
    AREA = areaOf(mid[0], mid[1]);
    YOFF = 0; // the deck lies on the road surface
    const hw = p.w + 0.35,
      st = STONE[zk] || STONE.hub,
      top = (s) => 0.2 + 0.1 * Math.sin(Math.PI * Math.min(1, Math.max(0, (s - s0) / len))),
      step = stone ? 1.2 : 0.6;
    // deck: planks (or slabs) across the path, following its curve
    for (let s = s0 + step / 2, k = 0; s < s1; s += step, k++) {
      const [x, z, hx, hz] = at(p, s),
        yaw = Math.atan2(-hz, hx),
        y = top(s);
      if (stone) put("c" + st, BXG, X(x, y - 0.11, z, yaw, step * 0.96, 0.22, hw * 2));
      else put("c" + (k % 3 === 1 ? WOODD : WOOD), BXG, X(x, y - 0.06, z, yaw, step * 0.86, 0.12, hw * 2 - 0.1));
    }
    // rails (wood) or parapets (stone) on both sides
    const n = Math.max(2, Math.round(len / (LOW ? 3 : 2.2)));
    [-1, 1].forEach((sd) => {
      let prev = null;
      for (let k = 0; k <= n; k++) {
        const s = s0 + (len * k) / n,
          [x, z, hx, hz] = at(p, s),
          px = x - hz * hw * sd,
          pz = z + hx * hw * sd,
          y = top(s),
          end = k === 0 || k === n;
        if (stone) put("c" + DARK, BXG, X(px, y + 0.42, pz, Math.atan2(-hz, hx), 0.62, 0.85 + (end ? 0.3 : 0), 0.62));
        else put("c" + WOODD, BXG, X(px, y + (end ? 0.65 : 0.5), pz, Math.atan2(-hz, hx), 0.2, end ? 1.3 : 1.0, 0.2));
        if (end) put("g" + WARM, BXG, X(px, y + (stone ? 1.2 : 1.42), pz, 0, 0.2, 0.26, 0.2));
        if (prev) {
          const dx = px - prev[0],
            dz = pz - prev[1],
            d = Math.hypot(dx, dz),
            yaw = Math.atan2(-dz, dx),
            mx = (px + prev[0]) / 2,
            mz = (pz + prev[1]) / 2,
            my = (y + prev[2]) / 2;
          if (stone) {
            put("c" + st, BXG, X(mx, my + 0.3, mz, yaw, d + 0.1, 0.6, 0.45));
            put("c" + DARK, BXG, X(mx, my + 0.66, mz, yaw, d + 0.15, 0.12, 0.6));
          } else {
            put("c" + WOOD, BXG, X(mx, my + 0.95, mz, yaw, d, 0.12, 0.14));
            put("c" + WOOD, BXG, X(mx, my + 0.5, mz, yaw, d, 0.09, 0.1));
            put("c" + WOODD, BXG, X(mx, my - 0.12, mz, yaw, d, 0.22, 0.3)); // side beam under the deck edge
          }
        }
        prev = [px, pz, y];
      }
    });
    busy.push([mid[0], mid[1], len / 2 + 4]);
    stats.bridges++;
    placed.push({ what: stone ? "stone bridge" : "bridge", path: p.n, x: Math.round(mid[0]), z: Math.round(mid[1]) });
  }
  // a water / lava canvas for a brook: soft banks across (u), fading ends along (v), ripples
  function brookTex(kind) {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 256;
    const g = cv.getContext("2d"),
      C3 = {
        stream: ["#1c4a6a", "#2f78a8", "rgba(190,235,255,.5)"],
        marsh: ["#1e4a40", "#2f7a68", "rgba(170,230,200,.4)"],
        lava: ["#7a1a08", "#ff7a1a", "rgba(255,230,120,.7)"],
      }[kind];
    const gx = g.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, C3[0]);
    gx.addColorStop(0.5, C3[1]);
    gx.addColorStop(1, C3[0]);
    g.fillStyle = gx;
    g.fillRect(0, 0, 64, 256);
    g.strokeStyle = C3[2];
    g.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      const y = (i * 97) % 256,
        x = 8 + ((i * 37) % 40);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 6, y + 5, x + 12 + (i % 3) * 3, y + 1);
      g.stroke();
    }
    g.globalCompositeOperation = "destination-in";
    const a1 = g.createLinearGradient(0, 0, 64, 0);
    a1.addColorStop(0, "rgba(0,0,0,0)");
    a1.addColorStop(0.18, "rgba(0,0,0,1)");
    a1.addColorStop(0.82, "rgba(0,0,0,1)");
    a1.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = a1;
    g.fillRect(0, 0, 64, 256);
    const a2 = g.createLinearGradient(0, 0, 0, 256);
    a2.addColorStop(0, "rgba(0,0,0,0)");
    a2.addColorStop(0.16, "rgba(0,0,0,1)");
    a2.addColorStop(0.84, "rgba(0,0,0,1)");
    a2.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = a2;
    g.fillRect(0, 0, 64, 256);
    return new T.CanvasTexture(cv); // not pushed onto WTX (that would scroll it and count it as old water next time)
  }
  function brook(p, s, kind, zk, IT) {
    const [x, z, hx, hz] = at(p, s),
      half = p.w + 10,
      wid = 4.2,
      hw = p.w + 0.35,
      n = Math.ceil((half * 2) / 1.5),
      pos = [],
      uv = [],
      idx = [];
    for (let k = 0; k <= n; k++) {
      const t = -half + (2 * half * k) / n,
        far = Math.min(1, Math.max(0, (Math.abs(t) - hw) / 3)),
        mo = Math.sin(t * 0.3 + s) * 0.9 * far,
        cx = x - hz * t + hx * mo,
        cz = z + hx * t + hz * mo;
      [-1, 1].forEach((j) => {
        const px = cx + hx * j * (wid / 2),
          pz = cz + hz * j * (wid / 2);
        pos.push(px, groundY(px, pz) + 0.03, pz);
        uv.push(j < 0 ? 0 : 1, k / n);
      });
      if (k) {
        const q = (k - 1) * 2;
        idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
      }
    }
    const G = new T.BufferGeometry();
    G.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    G.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    G.setIndex(idx);
    G.computeVertexNormals();
    // keep the strip facing up whichever way it was wound
    if (G.attributes.normal.getY(0) < 0) {
      for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
      G.setIndex(idx);
      G.computeVertexNormals();
    }
    const mat = new T.MeshLambertMaterial({
      map: brookTex(kind),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
      emissive: kind === "lava" ? 0xff4a10 : 0x0a1a28,
      emissiveIntensity: kind === "lava" ? 0.9 : 0.4,
    });
    mat.userData.dtx = 0;
    const m = new T.Mesh(G, mat);
    m.name = "wayf:brook";
    m.renderOrder = 1;
    m.userData.lus = 1;
    m.userData.wayf = 1;
    S.add(m);
    // bank stones (outside the path) and nothing growing in the water
    AREA = areaOf(x, z);
    YOFF = 0; // bank stones carry their own ground height
    if (!LOW)
      for (let t = hw + 1.5; t < half - 1; t += 2.6)
        [-1, 1].forEach((sd) =>
          [-1, 1].forEach((j) => {
            const far = Math.min(1, Math.max(0, (t - hw) / 3)),
              mo = Math.sin(sd * t * 0.3 + s) * 0.9 * far,
              tt = sd * t,
              bx = x - hz * tt + hx * (mo + j * (wid / 2 + 0.3)),
              bz = z + hx * tt + hz * (mo + j * (wid / 2 + 0.3)),
              hsh = Math.abs(Math.sin(bx * 12.9 + bz * 78.2)) % 1;
            put(
              "c" + (kind === "lava" ? 0x2a2024 : WSTONE[zk] || WSTONE.hub),
              BXG,
              X(bx, groundY(bx, bz) + 0.12, bz, hsh * 3, 0.5 + hsh * 0.4, 0.26 + hsh * 0.1, 0.4 + hsh * 0.3),
            );
          }),
        );
    const wet = IT.filter((it) => {
      const dx = it.x - x,
        dz = it.z - z,
        along = dx * -hz + dz * hx,
        side = dx * hx + dz * hz;
      return Math.abs(along) < half && Math.abs(side) < wid / 2 + 1.4 + it.r * 0.5;
    });
    stats.brookCleared += squash(wet);
    stats.brooks++;
    // for 68-atlas: where the brook crosses (world), the trail's heading there, its kind and half length
    brooks.push({ x, z, hx, hz, kind, half, trail: p.n });
    bridge(p, s - wid / 2 - 1.6, s + wid / 2 + 1.6, kind === "lava", zk);
  }
  function waterBridges(PATHS) {
    if (!IDX.wat.length) return;
    let made = 0;
    PATHS.forEach((p) => {
      const runs = [],
        step = 1.5;
      let run = null;
      for (let s = 2; s <= p.L - 2; s += step) {
        const [x, z, hx, hz] = at(p, s);
        let hit = null;
        if (!skipAt(x, z)) {
          const o = p.w + 2.5,
            w0 = wetAt(x, z),
            w1 = w0 ? null : wetAt(x - hz * o, z + hx * o),
            w2 = w1 ? wetAt(x + hz * o, z - hx * o) : null;
          hit = w0 || (w1 && w2 ? w1 : null);
        }
        if (hit) {
          if (!run) run = { s0: s, s1: s, lava: false };
          run.s1 = s;
          if (hit.lava) run.lava = true;
        } else if (run) {
          runs.push(run);
          run = null;
        }
      }
      if (run) runs.push(run);
      if (runs.length) wetPaths.add(p); // a path that already crosses water gets no made-up brook
      // join runs a few units apart, then bridge each that has no deck yet
      const joined = [];
      runs.forEach((r) => {
        const last = joined[joined.length - 1];
        if (last && r.s0 - last.s1 < 6) {
          last.s1 = r.s1;
          last.lava = last.lava || r.lava;
        } else joined.push(Object.assign({}, r));
      });
      joined.forEach((r) => {
        if (made >= 10 || r.s1 - r.s0 > 80) return;
        const c = at(p, (r.s0 + r.s1) / 2);
        if (hasDeck(c[0], c[1]) || busyAt(c[0], c[1], 2)) return;
        if (IDX.zmbNear(c[0], c[1], (r.s1 - r.s0) / 2 + p.w + 12)) return; // the re-layout session bridged it
        bridge(p, r.s0 - 2.5, r.s1 + 2.5, r.lava, landAt(c[0], c[1]));
        made++;
      });
    });
  }
  // halfway between two lands, each trail crosses a little brook
  function landBrooks(PATHS, IT) {
    PATHS.forEach((p) => {
      if (p.kind !== "trail") return;
      const t = p.t;
      if (t.ta === t.tb || t.sB == null || t.sB - t.sA < 40) return;
      // a trail that already crosses a river (03 water or the re-layout session's zmb bridges) needs no extra brook
      if (wetPaths.has(p) || p.pts.some((q, k) => k % 4 === 0 && IDX.zmbNear(q[0], q[1], p.w + 30))) return;
      // 64a's list of its river crossings [x, z, hx, hz, trail]: any one on this trail means it has its river already
      if (
        typeof ZMOVE !== "undefined" &&
        Array.isArray(ZMOVE.cross) &&
        ZMOVE.cross.some(
          (c) =>
            c &&
            (c[4] === p.n ||
              c[4] === p.i ||
              p.pts.some((q, k) => k % 4 === 0 && Math.hypot(q[0] - c[0], q[1] - c[1]) < p.w + 20)),
        )
      )
        return;
      const mid = (t.sA + t.sB) / 2;
      let best = null;
      for (let s = mid - 20; s <= mid + 20; s += 2) {
        const [x, z] = at(p, s),
          a = at(p, s - 6),
          b = at(p, s + 6),
          turn = Math.abs(Math.atan2(a[2] * b[3] - a[3] * b[2], a[2] * b[2] + a[3] * b[3]));
        if (skipAt(x, z) || busyAt(x, z, 20)) continue;
        // rails and banks must not run into lamps / signs standing beside the trail
        let hits = 0;
        for (const o of [-1, 1])
          for (const dd of [-4, 0, 4]) {
            const c = at(p, s + dd);
            if (IDX.thingAt(c[0] - c[3] * (p.w + 0.35) * o, c[1] + c[2] * (p.w + 0.35) * o, 0.6)) hits++;
          }
        const sc = turn * 4 + hits + Math.abs(s - mid) * 0.02;
        if (!best || sc < best.sc) best = { s, sc };
      }
      if (!best) return;
      const ends = [t.ta, t.tb],
        kind = ends.includes("ember") ? "lava" : ends.includes("marsh") ? "marsh" : "stream",
        zk = ends.includes("ember") ? "ember" : t.tb;
      brook(p, best.s, kind, zk, IT);
    });
  }

  // ---------- 3. land arches ----------
  function arch(p, s, zk) {
    const [x, z, hx, hz] = at(p, s),
      yaw = Math.atan2(-hz, hx),
      off = p.w + 1.7,
      st = STONE[zk] || STONE.hub,
      gc = LCOL[zk] || WARM,
      H = 6.4;
    seat(x - hz * off, z + hx * off);
    const y1 = YOFF;
    seat(x + hz * off, z - hx * off);
    YOFF = Math.min(YOFF, y1); // the lower pillar's ground (the other just stands a little deeper)
    AREA = areaOf(x, z);
    [-1, 1].forEach((k) => {
      const px = x - hz * off * k,
        pz = z + hx * off * k;
      put("c" + st, BXG, X(px, H / 2, pz, yaw, 1.6, H, 1.6));
      put("c" + DARK, BXG, X(px, 0.25, pz, yaw, 2.0, 0.5, 2.0));
      put("c" + DARK, BXG, X(px, H + 0.15, pz, yaw, 2.0, 0.3, 2.0));
      put("c" + st, CNG, X(px, H + 0.9, pz, yaw + Math.PI / 4, 0.95, 1.2, 0.95));
      // a lantern on each face of the pillar, toward both ways along the trail
      [-1, 1].forEach((f) => {
        put("c" + IRON, BXG, X(px + hx * 0.92 * f, 3.95, pz + hz * 0.92 * f, yaw, 0.3, 0.08, 0.3));
        put("g" + WARM, BXG, X(px + hx * 0.92 * f, 3.7, pz + hz * 0.92 * f, yaw, 0.22, 0.32, 0.22));
      });
    });
    const span = off * 2 + 1.6;
    put("c" + st, BXG, X(x, H - 0.4, z, yaw, 1.3, 1.0, span));
    put("c" + DARK, BXG, X(x, H + 0.25, z, yaw, 1.6, 0.3, span + 0.6));
    put("c" + st, BXG, X(x, H + 0.75, z, yaw, 1.0, 0.8, 1.4));
    put("g" + gc, OCG, X(x, H + 1.65, z, yaw, 0.45, 0.6, 0.45));
    // the land's name board on both faces of the lintel
    const L = { t: LAND[zk] || zk.toUpperCase(), sub: "", col: gc, tip: 0 },
      bw = 6.2;
    [-1, 1].forEach((f) => {
      const bx = x + hx * 0.69 * f,
        bz = z + hz * 0.69 * f;
      put("c" + WOODD, BXG, X(x + hx * 0.66 * f, H - 0.4, z + hz * 0.66 * f, yaw, 0.05, (bw / 4) * 0.86, bw * 0.99));
      label(L, X(bx, H - 0.4, bz, yaw + (f > 0 ? Math.PI / 2 : -Math.PI / 2), bw, bw / 4, 1));
    });
    busy.push([x, z, off + 3]);
    stats.arches++;
    placed.push({ what: "arch", land: zk, path: p.n, x: Math.round(x), z: Math.round(z) });
  }
  function arches(PATHS) {
    PATHS.forEach((p) => {
      if (p.kind !== "trail" || p.t.sB == null) return;
      const t = p.t,
        ends = [];
      if (ZCEN[t.tb]) ends.push([t.sB, t.tb]);
      if (ZCEN[t.ta]) ends.push([t.sA, t.ta]);
      ends.forEach(([s0, zk]) => {
        for (const dd of [0, 4, -4, 8, -8, 12, -12, 16]) {
          const s = s0 + dd;
          if (s < 6 || s > p.L - 6) continue;
          const [x, z, hx, hz] = at(p, s),
            off = p.w + 1.7;
          if (skipAt(x, z) || busyAt(x, z, off + 2)) continue;
          if (PT.some((q) => q && q.x != null && Math.hypot(q.x - x, q.z - z) < 20)) break; // a gate already stands here
          const ok = [-1, 1].every((k) => {
            const px = x - hz * off * k,
              pz = z + hx * off * k;
            return !IDX.thingAt(px, pz, 1.1) && clr(px, pz, 0.9);
          });
          if (ok) {
            arch(p, s, zk);
            break;
          }
        }
      });
    });
  }

  // ---------- 4. signposts ----------
  function post(x, z, arms, zk) {
    seat(x, z);
    put("c" + DARK, BXG, X(x, 0.15, z, 0, 0.55, 0.3, 0.55));
    put("c" + POLE, CYG, X(x, 1.65, z, 0, 0.13, 3.3, 0.13));
    put("c" + (LCOL[zk] || WARM), CNG, X(x, 3.5, z, Math.PI / 4, 0.24, 0.42, 0.24));
    const L = 2.5,
      h = L / 4;
    arms.slice(0, 3).forEach((a, j) => {
      const yaw = Math.atan2(-a.hz, a.hx),
        y = 2.95 - j * 0.72,
        m0 = X(x, y, z, yaw);
      put("c" + WOOD, BXG, m0.clone().multiply(X(0.14 + L * 0.43, 0, 0, 0, L * 0.86, h * 0.8, 0.07)));
      label({ t: a.t, sub: a.sub, col: a.col, tip: 1 }, m0.clone().multiply(X(0.14 + L / 2, 0, 0.045, 0, L, h, 1)));
      label(
        { t: a.t, sub: a.sub, col: a.col, tip: -1 },
        m0.clone().multiply(X(0.14 + L / 2, 0, -0.045, Math.PI, L, h, 1)),
      );
      stats.arms++;
    });
    busy.push([x, z, 2]);
    stats.posts++;
    placed.push({ what: "signpost", x: Math.round(x), z: Math.round(z), arms: arms.map((a) => a.t) });
  }
  // a post spot: off walkable ground, beside (not on) any path, clear of scenery, lamps and other new pieces
  function spotOK(x, z, r, near) {
    if (skipAt(x, z)) return false;
    try {
      if (okp(x, z)) return false;
    } catch (e) {}
    const q = near(x, z);
    if (q && q.d > -0.6) return false;
    return !IDX.thingAt(x, z, r) && clr(x, z, r) && !busyAt(x, z, r + 1);
  }
  const dirTo = (x, z, tx, tz) => {
    const l = Math.hypot(tx - x, tz - z) || 1;
    return { hx: (tx - x) / l, hz: (tz - z) / l };
  };
  const landName = (zk) => LAND[zk] || "LAMPLIGHT SQUARE";
  // spots that 37-junctions already dresses with a lamp / sign (same formulas), so new posts keep their distance
  function jnxSpots() {
    RDS.forEach((rd, i) => {
      const sg = i ? -1 : 1,
        fz = OZ + (i ? AZ : HZ);
      busy.push([OX + sg * (SW + 3), fz + RDW + 2, 1.2], [OX + sg * (SW + 3), fz - RDW - 2, 1.2]);
      const p = rdAt(rd, rd.L),
        a = rdAt(rd, rd.L - 1.5),
        l = Math.hypot(p[0] - a[0], p[1] - a[1]) || 1,
        hx = (p[0] - a[0]) / l,
        hz = (p[1] - a[1]) / l,
        ex = OX + p[0] + hx * 2,
        ez = OZ + p[1] + hz * 2,
        off = RDW + 2.5;
      busy.push([ex - hz * off, ez + hx * off, 1.2], [ex + hz * off, ez - hx * off, 1.2]);
    });
    TRL.forEach((t) => {
      const p = rdAt(t, t.L - 4);
      [-1, 1].forEach((k) => busy.push([OX + p[0] - p[3] * (RDW + 2) * k, OZ + p[1] + p[2] * (RDW + 2) * k, 1.4]));
    });
  }
  function signposts(PATHS, near) {
    const trails = PATHS.filter((p) => p.kind === "trail");
    const trailFrom = (x, z) => trails.find((p) => Math.hypot(p.pts[0][0] - x, p.pts[0][1] - z) < 30);
    // a) the Gloomway forks: the branch's land, the Gloomspire up the street, the square back down it
    PATHS.filter((p) => p.kind === "road").forEach((p) => {
      const rd = p.rd,
        sd = rd.sd,
        fz = OZ + rd.p[0][1],
        gl = [OX + rd.gx, OZ + rd.gz],
        tr = trailFrom(gl[0], gl[1]),
        dz = tr ? tr.t.tb : null,
        arms = [
          {
            hx: sd,
            hz: 0,
            t: dz ? landName(dz) : hubAt(gl[0], gl[1]).toUpperCase(),
            sub: p.n,
            col: LCOL[dz] || WARM,
          },
          { hx: 0, hz: -1, t: "GLOOMSPIRE", sub: "Gloomway", col: LCOL.spire },
          { hx: 0, hz: 1, t: "LAMPLIGHT SQUARE", sub: OZ + MLZ > fz ? "via Market Lane" : "Gloomway", col: WARM },
        ],
        cand = [
          [-sd * (SW + 1.4), 0],
          [-sd * (SW + 1.4), -4],
          [-sd * (SW + 1.4), 4],
          [-sd * (SW + 1.4), -8],
          [-sd * (SW + 1.4), 8],
          [sd * (SW + 1.4), -(RDW + 1.8)],
          [sd * (SW + 1.4), RDW + 1.8],
        ];
      for (const [ox, oz] of cand)
        if (spotOK(OX + ox, fz + oz, 0.8, near)) {
          post(OX + ox, fz + oz, arms, "hub");
          break;
        }
    });
    // b) the glade ends of the town roads: on to the land, back to the square, and the glade's dungeon door
    PATHS.filter((p) => p.kind === "road").forEach((p) => {
      const rd = p.rd,
        gl = [OX + rd.gx, OZ + rd.gz],
        tr = trailFrom(gl[0], gl[1]),
        dz = tr ? tr.t.tb : null,
        dn =
          typeof DUN !== "undefined"
            ? DUN.find((D) => D && D.door && Math.hypot(D.door[0] - gl[0], D.door[1] - gl[1]) < 30)
            : null;
      outer: for (const s of [p.L - 8, p.L - 12, p.L - 4, p.L - 16])
        for (const sd of [-1, 1]) {
          const [x, z, hx, hz] = at(p, s),
            o = (p.w + 1.4) * sd,
            px = x - hz * o,
            pz = z + hx * o;
          if (!spotOK(px, pz, 0.8, near)) continue;
          const arms = [
            {
              hx,
              hz,
              t: dz ? landName(dz) : hubAt(gl[0], gl[1]).toUpperCase(),
              sub: tr ? tr.n : hubAt(gl[0], gl[1]),
              col: LCOL[dz] || WARM,
            },
            { hx: -hx, hz: -hz, t: "LAMPLIGHT SQUARE", sub: p.n, col: WARM },
          ];
          if (dn)
            arms.push(
              Object.assign(dirTo(px, pz, dn.door[0], dn.door[1]), {
                t: dn.n.toUpperCase(),
                sub: "Dungeon, Lv " + dn.lv,
                col: dn.col || 0x7dff9a,
              }),
            );
          post(px, pz, arms, dz || "hub");
          break outer;
        }
    });
    // c) every trail end in a land: on along the trail, into the village, and to the land's other trail ends
    trails.forEach((p) => {
      const t = p.t;
      [
        [0, t.ta, t.tb],
        [1, t.tb, t.ta],
      ].forEach(([atEnd, zk, other]) => {
        if (!ZCEN[zk]) return;
        const c = ZCEN[zk],
          ring = ZVR[zk] + ZSB + 2,
          sAt = (d) => (atEnd ? p.L - d : d);
        let d0 = 0;
        while (d0 < p.L / 2) {
          const q = at(p, sAt(d0));
          if (Math.hypot(q[0] - c[0], q[1] - c[1]) >= ring) break;
          d0 += 1;
        }
        d0 = Math.max(d0 + 3, 10);
        for (const d of [d0, d0 + 3, d0 + 6, d0 - 3, d0 + 9]) {
          let ok = false;
          for (const sd of [-1, 1]) {
            const [x, z, hx0, hz0] = at(p, sAt(d)),
              hx = atEnd ? -hx0 : hx0, // pointing out of this land along the trail
              hz = atEnd ? -hz0 : hz0,
              o = (p.w + 1.4) * sd,
              px = x - hz0 * o,
              pz = z + hx0 * o;
            if (!spotOK(px, pz, 0.8, near)) continue;
            const arms = [
              { hx, hz, t: landName(other), sub: t.n, col: LCOL[other] || WARM },
              Object.assign(dirTo(px, pz, c[0], c[1]), { t: landName(zk), sub: "Village", col: LCOL[zk] }),
            ];
            trails.forEach((q) => {
              if (q === p) return;
              const qt = q.t;
              [
                [qt.ta, q.pts[0], qt.tb],
                [qt.tb, q.pts[q.pts.length - 1], qt.ta],
              ].forEach(([qz, e, far]) => {
                if (qz === zk && far !== zk)
                  arms.push(
                    Object.assign(dirTo(px, pz, e[0], e[1]), { t: landName(far), sub: qt.n, col: LCOL[far] || WARM }),
                  );
              });
            });
            post(px, pz, arms, zk);
            ok = true;
            break;
          }
          if (ok) break;
        }
      });
    });
  }

  // ---------- 5. edge guides ----------
  function waystone(x, z, hx, hz, sd, zk) {
    seat(x, z);
    const yaw = Math.atan2(-hz, hx),
      h = Math.abs(Math.sin(x * 12.9898 + z * 78.233)) % 1,
      c = WSTONE[zk] || WSTONE.hub,
      m0 = X(x, 0, z, yaw + (h - 0.5) * 0.3);
    put("c" + c, BXG, m0.clone().multiply(X(0, 0.07, 0, 0, 0.85, 0.14, 0.66)));
    put("c" + c, BXG, m0.clone().multiply(X(0, 0.45, 0, 0, 0.5, 0.78 + h * 0.2, 0.36)));
    put("c" + c, CNG, m0.clone().multiply(X(0, 0.92 + h * 0.2, 0, Math.PI / 4, 0.36, 0.2, 0.26)));
    // a glowing rune on the face toward the trail
    put("g" + (LCOL[zk] || WARM), BXG, m0.clone().multiply(X(0, 0.5, -sd * 0.19, 0, 0.16, 0.26, 0.03)));
    stats.guides++;
  }
  function lantern(x, z, zk) {
    seat(x, z);
    put("c" + (WSTONE[zk] || WSTONE.hub), BXG, X(x, 0.1, z, 0, 0.45, 0.2, 0.45));
    put("c" + IRON, CYG, X(x, 0.9, z, 0, 0.07, 1.6, 0.07));
    put("c" + IRON, BXG, X(x, 1.74, z, 0, 0.32, 0.06, 0.32));
    put("g" + WARM, BXG, X(x, 1.56, z, 0, 0.2, 0.28, 0.2));
    put("c" + IRON, CNG, X(x, 1.9, z, Math.PI / 4, 0.22, 0.24, 0.22));
    stats.guides++;
  }
  function guides(PATHS, near) {
    PATHS.forEach((p) => {
      if (p.kind !== "trail") return;
      const t = p.t,
        lands = [t.ta, t.tb].filter((k) => ZCEN[k]),
        inLand = (x, z) => lands.some((k) => Math.hypot(x - ZCEN[k][0], z - ZCEN[k][1]) < ZR + 2),
        inVill = (x, z) => lands.some((k) => Math.hypot(x - ZCEN[k][0], z - ZCEN[k][1]) < ZVR[k] + ZSB + 4);
      let k = 0;
      for (let s = 14; s < p.L - 10; ) {
        const [x, z, hx, hz] = at(p, s);
        if (skipAt(x, z) || inVill(x, z)) {
          s += 4;
          continue;
        }
        const land = inLand(x, z),
          step = (land ? 20 : 30) * (LOW ? 1.7 : 1),
          zk = s < p.L / 2 ? t.ta : t.tb,
          zz = LAND[zk] ? zk : "hub",
          first = k % 2 ? 1 : -1;
        let put1 = false;
        for (const sd of [first, -first]) {
          const o = (p.w + (land ? 1.1 : 1.7)) * sd,
            px = x - hz * o,
            pz = z + hx * o;
          if (!spotOK(px, pz, 0.55, near) || busyAt(px, pz, 6)) continue;
          if (land) lantern(px, pz, zz);
          else waystone(px, pz, hx, hz, sd, zz);
          put1 = true;
          k++;
          break;
        }
        s += put1 ? step : 4;
      }
    });
  }

  // ---------- run ----------
  let built = false;
  let SCAN = null;
  function run() {
    if (built) return stats;
    built = true;
    const t0 = performance.now();
    S.updateMatrixWorld(true);
    let PATHS = [],
      near = () => null,
      PLZ = [],
      IT = [];
    const step = (n, f) => {
      try {
        f();
      } catch (e) {
        console.warn("wayfare: " + n + " skipped", e);
      }
    };
    step("paths", () => {
      PATHS = paths();
      near = pathGrid(PATHS);
      PLZ = plazas();
      SCAN = () => blocked(near, PLZ);
    });
    if (!PATHS.length) return stats;
    step("clean-up", () => {
      IT = instances();
      cleanup(IT, near, PLZ);
    });
    step("index", index);
    if (!IDX) return stats;
    step("junction spots", jnxSpots);
    step("water bridges", () => waterBridges(PATHS));
    step("brooks", () => landBrooks(PATHS, IT));
    step("arches", () => arches(PATHS));
    step("signposts", () => signposts(PATHS, near));
    step("guides", () => guides(PATHS, near));
    step("flush", flush);
    step("scan", () => (stats.blocked = SCAN().length));
    stats.ms = Math.round(performance.now() - t0);
    return stats;
  }

  let bootT = 0;
  function frame(now) {
    if (built) return;
    requestAnimationFrame(frame);
    // a character must be in the world (the title screen also runs in "explore") and the page fully loaded
    if (typeof mode === "undefined" || mode !== "explore" || document.body.classList.contains("ttl")) return;
    if (typeof SLOT === "undefined" || SLOT < 0 || document.readyState !== "complete") return;
    if (!bootT) bootT = now + 2600; // after 67-tidy (+1.5 s)
    if (now < bootT) return;
    try {
      run();
    } catch (e) {
      console.error(e);
    }
  }
  requestAnimationFrame(frame);

  return { stats, placed, brooks, run, built: () => built, scan: () => (SCAN ? SCAN() : []) };
})();
