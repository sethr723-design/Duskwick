// v44 The world wakes with the story (loads LAST, after 64): only top-level name EVOLVE.
// The places you have helped look it. Everything is read from finished ★ chapters (FLOW.CH via DUSKLIFT.chapters(),
// 0..5); no save fields, no NET, solo cosmetic (each player sees their own progress).
//  - Windows: every baked building (03 bake(), userData.bk) in Lamplight Square / Gloomway or inside a zone village has
//    its lit-window mesh (colour 0xffe9a0) swapped for the dark-window material until that place has woken. The hub
//    lights outward from the square, a little more each chapter; a village shows a quarter lit until it is restored.
//  - Gloom stains: soft dark-violet patches on the ground (one instanced mesh per place). The hub's recede from the
//    square with each chapter (gone at 4); a village's fade away when it is restored.
//  - Townsfolk: a village's walking folk (61, person models with userData.vill = 2) stay indoors (scaled to nothing,
//    61's own tick keeps moving them) until it is restored, all but one.
//  - Lantern garlands: strung between a restored village's houses round its plaza, and across Gloomway, more spans per
//    chapter, nearest the square first. Instanced lanterns (MeshBasicMaterial, no lights) + one LineSegments of rope.
//  - A place waking while you play gets a toast + chime and its windows light one by one, nearest the plaza first.
// Restored: frost after 3 chapters (its ★ quests are in chapter III), ember after 4, marsh after 4.
// Built on the first explore frame (after the editor's BASE snapshot and 61's town planner). Groups carry
// userData.lus/evo, so WONDR.clear and LUSTER skip them. Console: EVOLVE.test(n) previews n chapters, EVOLVE.test()
// goes back to the real count.
const EVOLVE = (() => {
  const LITC = 0xffe9a0,
    HUBF = [0.3, 0.45, 0.6, 0.75, 0.9, 1], // share of hub windows lit at 0..5 chapters
    GW = [-24, -40, -120, -152, -168, -182, -212, -228], // Gloomway garland spans (local z), nearest the square first
    PL = {
      hub: { n: "Lamplight Square", at: 0 },
      frost: { n: "Frostfen", at: 3 },
      ember: { n: "The Cinderwaste", at: 4 },
      marsh: { n: "Mirewick", at: 4 },
    },
    VK = ["frost", "ember", "marsh"];
  let force = null;
  const low = () => typeof GFX !== "undefined" && GFX === "low";
  const on = () => typeof SLOT !== "undefined" && SLOT >= 0 && typeof P === "object" && !!P && !!P.name && !!P.done;
  const chapters = () => {
    if (force != null) return force;
    try {
      return Math.min(5, DUSKLIFT.chapters ? DUSKLIFT.chapters() : 0);
    } catch (e) {
      return 0;
    }
  };
  const restored = (k, n) => n >= PL[k].at;
  const vc = (k) => (typeof VILL !== "undefined" && VILL.Z && VILL.Z[k]) || null;
  const plaza = (k) => {
    if (k === "hub") return { x: OX, z: OZ };
    const C = vc(k);
    return C ? (C.town && C.town.f0) || C : null;
  };
  // which place a world point belongs to (null = leave it alone)
  function placeOf(x, z) {
    if (Math.abs(x - OX) < 48 && z < OZ + 26 && z > OZ - 300) return "hub";
    for (const k of VK) {
      const C = vc(k);
      if (C && Math.hypot(x - C.x, z - C.z) < 62) return k;
    }
    return null;
  }
  // fixed-seed stream
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash2 = (x, z) => {
    const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };

  // ---------- data built once ----------
  const WIN = { hub: [], frost: [], ember: [], marsh: [] }; // {m, mat, x, z, d, lit}
  const ST = {}; // place -> {im, mat, list:[{x,z}], shown}
  const GAR = {}; // place -> {g, spans:[{im0, im1, l0, l1}], lan: InstancedMesh, rope: LineSegments, shown}
  const FOLK = { frost: [], ember: [], marsh: [] }; // {o, s}
  const DRK = () => M(0x23253e);

  function findWindows() {
    S.updateMatrixWorld(true);
    S.traverse((o) => {
      if (!o.isMesh || !o.parent || !o.parent.userData || !o.parent.userData.bk) return;
      const mt = o.material;
      if (!mt || Array.isArray(mt) || !mt.color || mt.color.getHex() !== LITC) return;
      const p = o.parent,
        v = new T.Vector3().setFromMatrixPosition(p.matrixWorld),
        k = placeOf(v.x, v.z);
      if (!k) return;
      const c = plaza(k) || v;
      WIN[k].push({
        m: o,
        mat: mt,
        h: p,
        x: v.x,
        z: v.z,
        d: Math.hypot(v.x - c.x, v.z - c.z) + hash2(v.x, v.z) * 6,
        lit: true,
      });
    });
    for (const k in WIN) WIN[k].sort((a, b) => a.d - b.d);
  }

  // ---------- gloom stains ----------
  let stTex = null;
  function stainTex() {
    if (stTex) return stTex;
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const x = cv.getContext("2d"),
      r = rng(77);
    const blob = (cx, cy, rad, a) => {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, "rgba(18,6,30," + a + ")");
      g.addColorStop(0.55, "rgba(34,12,54," + a * 0.6 + ")");
      g.addColorStop(1, "rgba(40,16,60,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
    };
    // v47 clean look: one smooth round fade (was a lumpy cluster of dark blots)
    blob(64, 64, 62, 0.75);
    for (let i = 0; i < 3; i++) {
      const a = r() * 6.283;
      blob(64 + Math.cos(a) * 12, 64 + Math.sin(a) * 12, 40, 0.25);
    }
    stTex = new T.CanvasTexture(cv);
    return stTex;
  }
  function stainSpots(k) {
    const r = rng(9157 + k.length * 31 + k.charCodeAt(0)),
      out = [],
      lk = typeof LKON !== "undefined" ? LKON : null;
    if (lk != null) LKON = false;
    try {
      const N = k === "hub" ? 26 : 12;
      for (let t = 0; t < 4000 && out.length < N; t++) {
        let x, z;
        if (k === "hub") {
          if (r() < 0.3) {
            const a = r() * 6.283,
              d = 8 + r() * 9;
            x = OX + Math.cos(a) * d;
            z = OZ + Math.sin(a) * d;
          } else {
            x = OX + (r() - 0.5) * 16;
            z = OZ - 20 - r() * 220;
          }
        } else {
          const C = vc(k);
          if (!C) break;
          const a = r() * 6.283,
            d = 8 + r() * 32;
          x = C.x + Math.cos(a) * d;
          z = C.z + Math.sin(a) * d;
        }
        if (!okp(x, z) || placeOf(x, z) !== k) continue;
        if (typeof PT !== "undefined" && PT.some((q) => Math.hypot(q.x - x, q.z - z) < 4)) continue;
        if (out.some((q) => Math.hypot(q.x - x, q.z - z) < 7)) continue;
        out.push({ x, z, s: 2.4 + r() * 2.6, a: r() * 6.283 });
      }
    } catch (e) {
      console.error(e);
    }
    if (lk != null) LKON = lk;
    // the hub's gloom recedes from the square: farthest first, so trimming .count drops the nearest ones
    const c = plaza(k);
    if (c) out.sort((a, b) => Math.hypot(b.x - c.x, b.z - c.z) - Math.hypot(a.x - c.x, a.z - c.z));
    return out;
  }
  function buildStains(k) {
    const list = stainSpots(k);
    if (!list.length) return;
    const mat = new T.MeshBasicMaterial({
      map: stainTex(),
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -6,
    });
    mat.userData.dtx = 0;
    const im = new T.InstancedMesh(new T.CircleGeometry(1, 20), mat, list.length),
      d = new T.Object3D();
    list.forEach((p, i) => {
      d.position.set(p.x, 0.07 + (i % 5) * 0.004, p.z);
      d.rotation.set(-Math.PI / 2, 0, p.a);
      d.scale.set(p.s, p.s, 1);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    });
    im.renderOrder = 1;
    im.frustumCulled = false;
    im.userData.lus = im.userData.evo = 1;
    S.add(im);
    mat.opacity = 0.42;
    ST[k] = { im, mat, list, shown: list.length, op: 0.42 };
  }

  // ---------- lantern garlands ----------
  const LCOL = [0xffc860, 0xff8a5a, 0xffe9a0, 0x9fd0ff, 0xc8a0ff, 0xff7a9a];
  function spans(k) {
    const S2 = [];
    const span = (a, b, sag) => S2.push({ a, b, sag });
    if (k === "hub") {
      GW.forEach((lz) => {
        const z = OZ + lz;
        let xo = 10.4;
        if (!okp(OX + xo, z) || !okp(OX - xo, z)) xo = 9.6;
        if (!okp(OX + xo, z) || !okp(OX - xo, z)) return;
        span(new T.Vector3(OX - xo, 6.1, z), new T.Vector3(OX + xo, 6.1, z), 1.1);
      });
      return S2;
    }
    const C = vc(k),
      tw = C && C.town,
      c = plaza(k);
    if (!tw || !tw.pick || !c) return S2;
    // the houses standing on the town planner's slots, by angle round the plaza
    const hs = [];
    const seen = new Set();
    WIN[k].forEach((w) => {
      if (seen.has(w.h)) return;
      seen.add(w.h);
      if (tw.pick.some((p) => Math.hypot(p.x - w.x, p.z - w.z) < 7)) hs.push(w.h);
    });
    hs.sort(
      (a, b) => Math.atan2(a.position.z - c.z, a.position.x - c.x) - Math.atan2(b.position.z - c.z, b.position.x - c.x),
    );
    const corners = (h) => {
      const s = h.scale.x || 1;
      return [-1, 1].map((sd) =>
        new T.Vector3(sd * 2.3 * s, 0, 2.6 * s).applyAxisAngle(new T.Vector3(0, 1, 0), h.rotation.y).add(h.position),
      );
    };
    for (let i = 0; i < hs.length; i++) {
      const A = corners(hs[i]),
        B = corners(hs[(i + 1) % hs.length]);
      if (hs.length < 2 || (hs.length === 2 && i === 1)) break;
      let best = null;
      A.forEach((a) =>
        B.forEach((b) => {
          const d = a.distanceTo(b);
          if (!best || d < best.d) best = { a, b, d };
        }),
      );
      if (!best || best.d < 5 || best.d > 26) continue;
      best.a.y = best.b.y = 5.0;
      span(best.a, best.b, 1.3);
    }
    return S2;
  }
  function buildGarlands(k) {
    const L = spans(k);
    if (!L.length) return;
    const per = low() ? 5 : 8,
      seg = 8,
      g = new T.Group();
    g.userData.lus = g.userData.evo = 1;
    const lmat = new T.MeshBasicMaterial({ color: 0xffffff });
    lmat.userData.dtx = 0;
    const lan = new T.InstancedMesh(new T.SphereGeometry(0.17, 8, 6), lmat, L.length * per),
      rp = [],
      d = new T.Object3D(),
      col = new T.Color(),
      at = (s, t) => new T.Vector3().lerpVectors(s.a, s.b, t).add(new T.Vector3(0, -s.sag * 4 * t * (1 - t), 0));
    let poles = null;
    if (k === "hub") {
      poles = new T.InstancedMesh(Cy(0.09, 0.11, 6.4, 6), M(0x2a2438), L.length * 2);
      poles.userData.lus = 1;
    }
    L.forEach((s, i) => {
      for (let j = 0; j < seg; j++) {
        const p0 = at(s, j / seg),
          p1 = at(s, (j + 1) / seg);
        rp.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      }
      for (let j = 0; j < per; j++) {
        const p = at(s, (j + 0.5) / per);
        d.position.set(p.x, p.y - 0.22, p.z);
        d.rotation.set(0, 0, 0);
        d.scale.set(1, 1.25, 1);
        d.updateMatrix();
        lan.setMatrixAt(i * per + j, d.matrix);
        lan.setColorAt(i * per + j, col.setHex(LCOL[(i * 3 + j) % LCOL.length]));
      }
      if (poles)
        [s.a, s.b].forEach((e, q) => {
          d.position.set(e.x, 3.2, e.z);
          d.scale.set(1, 1, 1);
          d.updateMatrix();
          poles.setMatrixAt(i * 2 + q, d.matrix);
        });
    });
    const rg = new T.BufferGeometry();
    rg.setAttribute("position", new T.Float32BufferAttribute(rp, 3));
    const rope = new T.LineSegments(rg, new T.LineBasicMaterial({ color: 0x2a2030 }));
    lan.frustumCulled = rope.frustumCulled = false;
    g.add(lan, rope);
    if (poles) {
      poles.frustumCulled = false;
      g.add(poles);
    }
    S.add(g);
    GAR[k] = { g, lan, rope, poles, per, seg, n: L.length, shown: -1 };
  }
  // show the first c spans
  function garShow(k, c) {
    const G = GAR[k];
    if (!G || G.shown === c) return;
    G.shown = c;
    G.lan.count = c * G.per;
    G.rope.geometry.setDrawRange(0, c * G.seg * 2);
    if (G.poles) G.poles.count = c * 2;
    G.g.visible = c > 0;
  }

  function findFolk() {
    S.children.forEach((o) => {
      if (!o.userData || o.userData.vill !== 2 || !o.userData.bd || o.userData.bk) return;
      let best = null,
        bd = 1e9;
      VK.forEach((k) => {
        const C = vc(k);
        if (!C) return;
        const d = Math.hypot(o.position.x - C.x, o.position.z - C.z);
        if (d < bd) (bd = d), (best = k);
      });
      if (best && bd < 120) FOLK[best].push({ o, s: o.scale.x });
    });
  }

  // ---------- applying a state ----------
  const Q = []; // staggered window lights {t, w}
  function litCount(k, n) {
    const N = WIN[k].length;
    if (k === "hub") return Math.round(N * HUBF[Math.max(0, Math.min(5, n))]);
    return restored(k, n) ? N : Math.round(N * 0.25);
  }
  function setWin(w, lit) {
    w.lit = lit;
    w.m.material = lit ? w.mat : DRK();
  }
  function apply(n, live) {
    const now = performance.now();
    for (const k in WIN) {
      const c = litCount(k, n);
      let q = 0;
      WIN[k].forEach((w, i) => {
        const want = i < c;
        if (want === w.lit) return;
        if (want && live) Q.push({ t: now + 600 + q++ * 260, w });
        else setWin(w, want);
      });
    }
    // stains
    for (const k in ST) {
      const s = ST[k];
      const c = k === "hub" ? Math.round(s.list.length * Math.max(0, 1 - n / 4)) : restored(k, n) ? 0 : s.list.length;
      if (live && c < s.shown)
        for (let i = c; i < s.shown; i++) {
          const p = s.list[i];
          try {
            puff(new T.Vector3(p.x, 0.5, p.z), "spirit", low() ? 3 : 7, p.s * 0.6, 1.2, 1);
          } catch (e) {}
        }
      s.target = c;
      if (!live || c >= s.shown) {
        s.fade = 0;
        s.mat.opacity = s.op;
        s.shown = c;
        s.im.count = c;
      } else s.fade = now; // fade the whole patch set, then trim
    }
    // garlands
    if (GAR.hub) garShow("hub", Math.min(GAR.hub.n, Math.round(n * 1.8)));
    VK.forEach((k) => GAR[k] && garShow(k, restored(k, n) ? GAR[k].n : 0));
    // folk
    VK.forEach((k) => {
      const out = restored(k, n);
      FOLK[k].forEach((f, i) => f.o.scale.setScalar(out || i === 0 ? f.s : 0.0001));
    });
  }

  // ---------- frame ----------
  let built = false,
    bootT = 0,
    who = "",
    curN = -1,
    poll = 0;
  function build() {
    built = true;
    findWindows();
    ["hub"].concat(VK).forEach((k) => {
      try {
        buildStains(k);
      } catch (e) {
        console.error(e);
      }
      try {
        buildGarlands(k);
      } catch (e) {
        console.error(e);
      }
    });
    findFolk();
  }
  function chime(f, st, d) {
    try {
      if (typeof WONDR !== "undefined" && WONDR.chime) WONDR.chime(f, st, d);
    } catch (e) {}
  }
  function announce(n0, n) {
    const msgs = [];
    VK.forEach((k) => {
      if (!restored(k, n0) && restored(k, n))
        msgs.push(PL[k].n + " breathes again: the gloom lifts, its windows glow and its folk are back out.");
    });
    if (n > n0)
      msgs.unshift("Light spreads from Lamplight Square: more windows glow and lanterns go up along Gloomway.");
    msgs.forEach((m, i) =>
      setTimeout(
        () => {
          try {
            toast(m, "#ffe2a0");
          } catch (e) {}
          chime([523, 659, 784, 1047], 0.12, 1.6);
        },
        1200 + i * 3200,
      ),
    );
  }
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!on() || typeof W === "undefined" || typeof mode === "undefined") return;
    if (!built) {
      if (mode !== "explore" || document.body.classList.contains("ttl")) return;
      if (!bootT) bootT = now + 1500;
      if (now < bootT) return;
      try {
        build();
      } catch (e) {
        console.error(e);
      }
      return;
    }
    // staggered window lights
    for (let i = Q.length - 1; i >= 0; i--) {
      if (now < Q[i].t) continue;
      const w = Q[i].w;
      Q.splice(i, 1);
      setWin(w, true);
      try {
        if (Math.hypot(W.position.x - w.x, W.position.z - w.z) < 90)
          mote(new T.Vector3(w.x, 4.5, w.z), { c: 0xffd27a, v: [0, 1.6, 0], l: 1.1, s: 0.9 });
      } catch (e) {}
    }
    // stain fades (live restores)
    for (const k in ST) {
      const s = ST[k];
      if (!s.fade) continue;
      const f = Math.min(1, (now - s.fade) / 2500);
      s.mat.opacity = s.op * (1 - f);
      if (f >= 1) {
        s.fade = 0;
        s.shown = s.target;
        s.im.count = s.target;
        s.mat.opacity = s.op;
      }
    }
    // only draw a place's extras near it
    if (now - poll < 250) return;
    poll = now;
    const px = W.position.x,
      pz = W.position.z;
    for (const k in PL) {
      const c = k === "hub" ? { x: OX, z: OZ - 120 } : plaza(k);
      if (!c) continue;
      const near = Math.hypot(px - c.x, pz - c.z) < (k === "hub" ? 300 : 220);
      if (ST[k]) ST[k].im.visible = near && ST[k].shown > 0;
      if (GAR[k]) GAR[k].g.visible = near && GAR[k].shown > 0;
    }
    const id = (P.name || "") + "|" + (P.cls || "") + "|" + (typeof SLOT !== "undefined" ? SLOT : ""),
      n = chapters();
    if (id !== who) {
      who = id;
      curN = n;
      Q.length = 0;
      apply(n, false);
      return;
    }
    if (n !== curN) {
      const n0 = curN;
      curN = n;
      const live = mode === "explore" && n > n0 && force == null;
      apply(n, live || (force != null && n > n0));
      if (n > n0) announce(n0, n);
    }
  }
  requestAnimationFrame(frame);

  return {
    WIN,
    ST,
    GAR,
    FOLK,
    chapters,
    test: (n) => {
      force = n == null ? null : Math.max(0, Math.min(5, n | 0));
      return chapters();
    },
  };
})();
