// v53 Frostfen content pass (loads LAST, after 78): only top-level name FROSTPASS.
// Three new Frostfen villagers, each a quest giver (NPC kind "q", giver keys ftobin / filka / fmaren in QGN):
//   Tobin the ice-fisher: "Thin Ice" (catch 3 fish, P.fish.c) -> "Grandfather's Lantern" (find it out on the ice)
//   Ilka the wolf-tender: "Scent of Home" (3 fur tufts) -> "Where the Pup Went" (follow glowing pawprints to Nip;
//     Nip then sits beside Ilka for good)
//   Sister Maren: "Cold Wicks" (relight 4 wick-posts) -> "The Long Night" (wave defence: shadows drift at the wicks,
//     walk into them to burn them away, E at a wick to rekindle; keep 3 of 4 burning for NL seconds)
// Plus 3 hidden Frozen Caches on the outskirts (loot, bonus for all three).
// Quests are APPENDED to QS (after 73): never reorder. Every scene object is built at runtime on the first frame
// after the page is complete and 64a's re-layout has moved Frostfen (live ZCEN / VILL.Z), so nothing shifts the
// editor's BASE snapshot. Spots are picked deterministically from the live world (okp + WONDR.clear), never
// Math.random. State in lazy P.frp {t, w, c, lan, pup, night}. Solo / local only: no NET, no lights.
const FROSTPASS = (() => {
  const NL = 75; // seconds of the Long Night
  const GV = {
    ftobin: {
      nm: ["Tobin", "Tobin, the ice-fisher"],
      sub: "Ice-fisher",
      sp: { robe: 0x5a6a7a, trim: 0xc8d8e8, hat: "fur", hc: 0x8a7a6a, prop: "rod", skin: 0xe8c4a0, beard: 0xd8d8e0 },
      hi: "Fish don't care about the Gloom, lamplighter. That's what I like about 'em. Pull up a crate.",
      hi2: "Grandfather's lantern is back on its hook. Some nights I swear it lights itself.",
      last: "T2",
    },
    filka: {
      nm: ["Ilka", "Ilka, the wolf-tender"],
      sub: "Wolf-tender",
      sp: { robe: 0x4a6a9a, trim: 0xe8f0ff, hat: "hood", hc: 0x6a8ab8, skin: 0xf0c8a8, w: 0.85 },
      hi: "Shh, you'll scare them. The wolves were ours, you know, before the cold. Some of them still remember.",
      hi2: "Nip says hello. Well, he says 'yip', but it means hello.",
      last: "I2",
    },
    fmaren: {
      nm: ["Sister Maren", "Sister Maren, keeper of the wicks"],
      sub: "Hearth-lamps",
      sp: { robe: 0x7a5a3a, trim: 0xffd27a, hat: "hood", hc: 0x5a3a24, prop: "lamp", skin: 0xd8a882 },
      hi: "Every lamp is a promise, child. Frostfen let too many of ours go cold.",
      hi2: "The wicks have burned every night since. The children sleep sound. You did that.",
      last: "M2",
    },
  };
  Object.keys(GV).forEach((k) => {
    QGN[k] = GV[k].nm;
    NNAME["q" + k] = [GV[k].nm[0], GV[k].sub];
  });

  const F = () => {
    const f = (P.frp = P.frp || {});
    f.t = f.t || {};
    f.w = f.w || {};
    f.c = f.c || {};
    return f;
  };
  const cnt = (o) => Object.keys(o || {}).filter((k) => o[k]).length;
  const acc = (i) => !!P && P.qa && P.qa[i] != null && !P.done[i];
  const QI = {};
  const O = {}; // scene objects, filled by build()
  const at = (o) => (o ? ["frost", o.x, o.z] : null);

  // ---------- quests (APPENDED to QS) ----------
  const Q = [
    {
      id: "T1",
      gv: "ftobin",
      n: "Thin Ice",
      d: "Catch 3 fish (the ice holes bite best), then return to Tobin",
      st: () => (P.fish && P.fish.c) || 0,
      k: 3,
      g: 40,
      x: 60,
      lv: 3,
      rq: [10],
      s: "My hands are too stiff for the line these days. Catch me three fish. Any water will do, but the ice holes bite best. My granddaughter has a fever, and fish broth is all she'll take.",
      done: "Tobin: Three fat ones! Broth tonight, and maybe a smile out of her. Bless your lamp.",
    },
    {
      id: "T2",
      gv: "ftobin",
      n: "Grandfather's Lantern",
      d: "Find the old lantern frozen into the far edge of Frostfen, then return to Tobin",
      st: () => (F().lan ? 1 : 0),
      abs: 1,
      k: 1,
      g: 70,
      x: 110,
      lv: 3,
      rq: ["T1"],
      wh: () => O.lan && at(O.lan.hint),
      s: "My grandfather was the last lamplighter Frostfen had. The night the ice came, he went out to the far edge to keep his lamp lit, and the ice took him and it both. Lately I see a glimmer out there at dusk. Bring the lantern home, would you?",
      done: "Tobin: That's it. Still warm, somehow. He'd want a lamplighter to carry its light. Take this, made from its glass.",
      sr: { n: "Tobin's Ice-Lantern", sl: "charm", el: "ice", r: 3, d: "bringing his grandfather's lantern home" },
    },
    {
      id: "I1",
      gv: "filka",
      n: "Scent of Home",
      d: "Gather 3 tufts of blue wolf fur from the brambles outside the village, then return to Ilka",
      st: () => cnt(F().t),
      abs: 1,
      k: 3,
      g: 40,
      x: 60,
      lv: 3,
      rq: [10],
      wh: () => {
        const f = F(),
          L = (O.tufts || []).filter((o, k) => !f.t[k]);
        return L.length ? at(nearest(L)) : null;
      },
      s: "When the wolves forgot us, they left tufts of fur on the brambles out past the houses. If I can gather their scent, I can teach the pups at the den to remember our hands. Bring me three tufts? They shine blue when the light hits them.",
      done: "Ilka: They still smell like home. Thank you. Now... there's something else.",
    },
    {
      id: "I2",
      gv: "filka",
      n: "Where the Pup Went",
      d: "Follow the glowing pawprints out of the village and find Nip, then return to Ilka",
      st: () => (F().pup ? 1 : 0),
      abs: 1,
      k: 1,
      g: 70,
      x: 110,
      lv: 4,
      rq: ["I1"],
      wh: () => O.pr0 && at(O.pr0),
      s: "Nip, the littlest of the den, went off after the scent last night and never came back. His pawprints glow in lamplight. Follow them out from the village and bring him home, please.",
      done: "Ilka: Nip! You silly thing! Thank you, lamplighter. Wear this. The pups will know you're a friend.",
      sr: { n: "Wolf-tender's Hood", sl: "hat", el: "spirit", r: 3, d: "bringing Nip home" },
    },
    {
      id: "M1",
      gv: "fmaren",
      n: "Cold Wicks",
      d: "Relight the 4 old wick-posts outside the village, then return to Sister Maren",
      st: () => cnt(F().w),
      abs: 1,
      k: 4,
      g: 50,
      x: 70,
      lv: 3,
      rq: [10],
      wh: () => {
        const f = F(),
          L = (O.posts || []).filter((o, k) => !f.w[k]);
        return L.length ? at(nearest(L)) : null;
      },
      s: "The founders ringed Frostfen with wick-posts, little lamps to keep the dark at the door. Only one ring is left standing, out past the houses, and every wick in it is cold. Relight all four for me.",
      done: "Maren: I saw them from my window. Four little stars. But the Gloom will have noticed them too.",
    },
    {
      id: "M2",
      gv: "fmaren",
      n: "The Long Night",
      d: "Keep at least 3 wicks burning until the dawn bell (press E at a wick to begin), then return to Sister Maren",
      st: () => (F().night ? 1 : 0),
      abs: 1,
      k: 1,
      g: 90,
      x: 140,
      lv: 4,
      rq: ["M1"],
      wh: () => O.ring && at(O.ring),
      s: "Tonight the Gloom will come for those wicks. It always does once they burn again. Stand with them until the dawn bell rings. Walk into the shadows and your lantern will burn them away, and if a wick gutters, rekindle it. Keep at least three burning. Press E at any wick when you're ready.",
      done: "Maren: You held. I heard the bell and I wept, child. Take this shawl. I wove it by those wicks' light.",
      sr: { n: "Hearthkeeper's Shawl", sl: "robe", el: "heal", r: 3, d: "surviving the Long Night", st: { pip: 1 } },
    },
  ];
  const QD = {};
  try {
    Q.forEach((q) => {
      const o = {
        n: q.n,
        d: q.d,
        st: q.st,
        k: q.k,
        g: q.g,
        x: q.x,
        z: "frost",
        gv: q.gv,
        lv: q.lv,
        req: q.rq.map((r) => (typeof r === "number" ? r : QI[r])),
        s: q.s,
      };
      if (q.abs) o.abs = 1;
      if (q.wh)
        o.wh = () => {
          try {
            return q.wh();
          } catch (e) {
            return null;
          }
        };
      const i = QS.push(o) - 1;
      QI[q.id] = i;
      QD[i] = q;
      if (q.sr) QSR[i] = q.sr;
    });
  } catch (e) {
    console.error("79-frostpass quests", e);
  }

  // ---------- helpers ----------
  const hsh = (v) => {
    const s = Math.sin(v * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  function nearest(L) {
    const p = W.position;
    let b = null,
      bd = 1e9;
    L.forEach((o) => {
      const d = Math.hypot(o.x - p.x, o.z - p.z);
      if (d < bd) {
        bd = d;
        b = o;
      }
    });
    return b;
  }
  const clr = (x, z, r) => {
    try {
      return typeof WONDR !== "object" || WONDR.clear(x, z, r);
    } catch (e) {
      return true;
    }
  };
  const onTrail = (x, z) => {
    try {
      return typeof trOn === "function" && !!trOn(x, z);
    } catch (e) {
      return false;
    }
  };
  const walk = (x, z) => {
    try {
      return !!okp(x, z);
    } catch (e) {
      return false;
    }
  };
  // far enough from NPCs (rN), portals (rP) and lamps / lore stones / chests (rO)
  function clearOf(x, z, rN, rP, rO) {
    for (const n of NPCS) if (Math.hypot(n.x - x, n.z - z) < rN) return false;
    for (const q of PT) if (Math.hypot(q.x - x, q.z - z) < rP) return false;
    for (const L of [CHESTS, LS, LAMPS]) for (const o of L) if (Math.hypot(o.x - x, o.z - z) < rO) return false;
    return true;
  }
  const lineOK = (a, b) => {
    for (let k = 1; k < 6; k++) if (!walk(a.x + ((b.x - a.x) * k) / 6, a.z + ((b.z - a.z) * k) / 6)) return false;
    return true;
  };
  const glint = (par, c, s, y) => {
    const g = new T.Sprite(AM(GLT));
    g.material.color.setHex(c);
    g.scale.setScalar(s);
    g.position.y = y;
    par.add(g);
    return g;
  };
  const place = (g, x, z, ry) => {
    g.position.set(x, 0, z);
    g.rotation.y = ry || 0;
    g.userData.lus = 1;
    g.userData.frp = 1;
    S.add(g);
    return g;
  };
  const snd = (fn) => {
    try {
      if (typeof WONDR === "object") fn(WONDR);
    } catch (e) {}
  };
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const say = (t, c) => toast(t, c || "#bfe4ff");

  // ---------- models ----------
  function mkNpc(id, s, f0) {
    const G = GV[id],
      o = person(G.sp);
    const mkr = new T.Sprite(AM(SP.storm));
    mkr.scale.setScalar(1.5);
    mkr.position.y = 4.2;
    o.add(mkr);
    const ry = Math.atan2(f0.x - s.x, f0.z - s.z);
    o.position.set(s.x, 0, s.z);
    o.rotation.y = ry;
    S.add(o);
    solids.push({ x: s.x, z: s.z, r: 1.1 });
    const n = { o, kind: "q", id, qg: id, mkr, x: s.x, z: s.z, ry };
    NPCS.push(n);
    npcPlate(n);
    return n;
  }
  function mkPost(x, z) {
    const g = new T.Group();
    g.add(mk(Cy(0.14, 0.18, 2.8), 0x4a3828, 0, 1.4, 0));
    g.add(mk(B(0.7, 0.12, 0.7), 0x3a2a20, 0, 2.86, 0));
    const glass = new T.Mesh(Cy(0.22, 0.26, 0.5), M(0x9a8a7a, 1));
    glass.position.y = 3.17;
    g.add(glass);
    g.add(mk(Cn(0.36, 0.34), 0x3a2a20, 0, 3.6, 0));
    const fl = new T.Sprite(AM(SP.fire));
    fl.position.y = 3.2;
    g.add(fl);
    const gl = glint(g, 0xffb860, 3.6, 3.2);
    place(g, x, z);
    solids.push({ x, z, r: 0.45 });
    return { g, glass, fl, gl, x, z, h: -1 };
  }
  function setPost(p, h) {
    if (p.h === h) return;
    p.h = h;
    p.fl.visible = p.gl.visible = h > 0;
    p.fl.scale.setScalar(0.5 + 0.4 * h);
    p.gl.scale.setScalar(1.6 + 0.8 * h);
    p.glass.material.emissive.setHex(h > 0 ? 0xffa040 : 0x000000);
    p.glass.material.emissiveIntensity = 0.25 + 0.25 * h;
  }
  function mkCache(x, z, ry) {
    const g = new T.Group();
    g.add(mk(B(1.3, 0.6, 0.85), 0x5a3a26, 0, 0.3, 0));
    g.add(mk(B(1.36, 0.1, 0.9), 0x9a8a5a, 0, 0.5, 0));
    const lid = new T.Group();
    lid.position.set(0, 0.6, -0.42);
    lid.add(mk(B(1.3, 0.26, 0.85), 0x6a4630, 0, 0.13, 0.42));
    g.add(lid);
    const ice = new T.Mesh(
      new T.IcosahedronGeometry(1, 1),
      new T.MeshLambertMaterial({ color: 0xbfe4ff, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    ice.position.y = 0.5;
    ice.scale.set(1.15, 0.8, 0.95);
    g.add(ice);
    const gl = glint(g, 0xbfe8ff, 2.2, 1.3);
    place(g, x, z, ry);
    solids.push({ x, z, r: 0.8 });
    return { g, lid, ice, gl, x, z, op: -1 };
  }
  function setCache(c, op) {
    if (c.op === op) return;
    c.op = op;
    c.ice.visible = c.gl.visible = !op;
    c.lid.rotation.x = op ? -1.1 : 0;
  }
  function mkTuft(x, z, ry) {
    const g = new T.Group();
    for (let k = 0; k < 3; k++) {
      const b = mk(Cy(0.03, 0.04, 1.1, 5), 0x4a3a2a, 0, 0.45, 0);
      b.rotation.set(0.5 * Math.cos(k * 2.1), k * 2.1, 0.5 * Math.sin(k * 2.1));
      g.add(b);
    }
    [
      [0.18, 0.7, 0.05],
      [-0.15, 0.55, 0.12],
      [0.02, 0.85, -0.12],
    ].forEach(([a, b, c]) => g.add(mk(Sp(0.14), 0x9ab8e8, a, b, c)));
    const gl = glint(g, 0x8ab8ff, 1.8, 0.7);
    place(g, x, z, ry);
    return { g, gl, x, z };
  }
  function mkLantern(x, z, ry) {
    const g = new T.Group(),
      L = new T.Group();
    L.add(mk(Cy(0.24, 0.28, 0.55), 0xb08a40, 0, 0.27, 0));
    const gs = new T.Mesh(Sp(0.2), M(0xffe0a0, 1));
    gs.material.emissive.setHex(0xffb040);
    gs.material.emissiveIntensity = 0.6;
    gs.position.y = 0.32;
    L.add(gs);
    L.add(mk(Cn(0.3, 0.25), 0x8a6a30, 0, 0.66, 0));
    const hd = mk(new T.TorusGeometry(0.17, 0.03, 6, 12), 0x8a6a30, 0, 0.88, 0);
    L.add(hd);
    L.rotation.z = 0.7;
    L.position.y = 0.12;
    g.add(L);
    g.add(mk(Sp(0.7), 0xe8f0fa, 0.25, -0.35, 0.1)); // snow heaped over it
    const gl = glint(g, 0xffd27a, 2.4, 0.6);
    place(g, x, z, ry);
    return { g, gl, x, z };
  }
  function mkPup() {
    const g = new T.Group(),
      c = 0xd8e2f0,
      d = 0x8a9ab8;
    const body = mk(Sp(0.42), c, 0, 0.55, 0);
    body.scale.set(0.85, 0.8, 1.25);
    g.add(body);
    const head = new T.Group();
    head.position.set(0, 0.92, 0.5);
    g.add(head);
    head.add(mk(Sp(0.3), c));
    const sn = mk(Sp(0.15), 0xf0f4fa, 0, -0.06, 0.27);
    sn.scale.set(1, 0.8, 1.3);
    head.add(sn);
    head.add(mk(Sp(0.05), 0x1a1a24, 0, -0.03, 0.46));
    [-1, 1].forEach((s) => {
      head.add(mk(Sp(0.045), 0x10101a, s * 0.12, 0.08, 0.25));
      const e = mk(Cn(0.1, 0.26), d, s * 0.15, 0.28, -0.02);
      e.rotation.z = -s * 0.25;
      head.add(e);
      [-1, 1].forEach((f) => g.add(mk(Cy(0.07, 0.06, 0.42), c, s * 0.18, 0.21, f * 0.3)));
    });
    const tail = new T.Group();
    tail.position.set(0, 0.7, -0.5);
    const tm = mk(Cn(0.1, 0.48), d, 0, 0.2, -0.1);
    tm.rotation.x = -0.6;
    tail.add(tm);
    g.add(tail);
    g.userData.hd = head;
    g.userData.tl = tail;
    return g;
  }

  // ---------- build (runtime, once) ----------
  let built = 0,
    cx = 0,
    cz = 0,
    NPC = {};
  function build() {
    const c = ZCEN.frost;
    cx = c[0];
    cz = c[1];
    const VR = (typeof ZVR === "object" && ZVR.frost) || 46;
    const vz = typeof VILL === "object" && VILL.Z && VILL.Z.frost;
    const tw = vz && vz.town;
    let f0 = (tw && tw.f0) || { x: cx, z: cz };
    if (Math.hypot(f0.x - cx, f0.z - cz) > 40) f0 = { x: cx, z: cz };

    // three villagers on the plaza rim (61's free rim spots), facing the square
    let rim = ((tw && tw.rim) || []).filter((s) => Math.hypot(s.x - f0.x, s.z - f0.z) < 40);
    const ring = (o, rs, n) => {
      const L = [];
      rs.forEach((r) => {
        for (let k = 0; k < n; k++) {
          const a = (k / n) * 2 * Math.PI + r;
          L.push({ x: o.x + Math.cos(a) * r, z: o.z + Math.sin(a) * r });
        }
      });
      return L;
    };
    rim = rim.concat(ring(f0, [19, 22, 25, 28], 40));
    rim.forEach((s) => (s.h = hsh(s.x * 0.31 + s.z * 0.17)));
    const ns = [];
    for (const relax of [0, 1])
      for (const s of rim.slice().sort((a, b) => a.h - b.h)) {
        if (ns.length >= 3) break;
        if (!walk(s.x, s.z) || !clr(s.x, s.z, relax ? 0.8 : 1.3)) continue;
        if (!clearOf(s.x, s.z, relax ? 3.5 : 5, relax ? 6 : 9, relax ? 2.5 : 3.5)) continue;
        if (ns.some((u) => Math.hypot(u.x - s.x, u.z - s.z) < (relax ? 5 : 9))) continue;
        ns.push(s);
      }
    while (ns.length < 3) ns.push({ x: f0.x + 20 + ns.length * 3, z: f0.z });
    ["ftobin", "filka", "fmaren"].forEach((id, k) => (NPC[id] = mkNpc(id, ns[k], f0)));

    // candidate spots out in the wilds round the village, in a fixed hashed order
    const cand = [];
    for (let r = 58; r <= 128; r += 5) {
      const n = Math.floor((2 * Math.PI * r) / 7);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * 2 * Math.PI + r * 0.37,
          x = cx + Math.cos(a) * r,
          z = cz + Math.sin(a) * r;
        cand.push({ x, z, r, h: hsh(x * 0.13 + z * 0.71) });
      }
    }
    cand.sort((a, b) => a.h - b.h);
    const good = cand.filter(
      (s) => walk(s.x, s.z) && clr(s.x, s.z, 2) && !onTrail(s.x, s.z) && clearOf(s.x, s.z, 14, 14, 9),
    );

    // the wick ring: 4 posts 8.5 round an anchor, as near the village as fits
    let RG = null;
    const byR = good.filter((s) => s.r >= VR + 8 && s.r <= VR + 40).sort((a, b) => a.r - b.r);
    for (const strict of [1, 0]) {
      for (const s of byR) {
        for (const a0 of [0, Math.PI / 4]) {
          const posts = [0, 1, 2, 3].map((k) => ({
            x: s.x + Math.cos(a0 + (k * Math.PI) / 2) * 8.5,
            z: s.z + Math.sin(a0 + (k * Math.PI) / 2) * 8.5,
          }));
          if (
            posts.every(
              (p) => walk(p.x, p.z) && (!strict || (clr(p.x, p.z, 1.2) && !onTrail(p.x, p.z) && lineOK(s, p))),
            )
          ) {
            RG = { x: s.x, z: s.z, posts };
            break;
          }
        }
        if (RG) break;
      }
      if (RG) break;
    }
    if (!RG) {
      const x = cx + VR + 14,
        z = cz;
      RG = {
        x,
        z,
        posts: [0, 1, 2, 3].map((k) => ({ x: x + Math.cos(k * 1.5708) * 8.5, z: z + Math.sin(k * 1.5708) * 8.5 })),
      };
    }
    O.ring = { x: RG.x, z: RG.z };
    O.posts = RG.posts.map((p) => mkPost(p.x, p.z));

    // 8 secret spots, spread out: lantern (farthest), 3 caches, Nip, 3 tufts (nearest)
    let pick = [];
    for (const sp of [28, 20, 13, 8]) {
      pick = [];
      for (const s of good) {
        if (Math.hypot(s.x - RG.x, s.z - RG.z) < 22) continue;
        if (pick.some((u) => Math.hypot(u.x - s.x, u.z - s.z) < sp)) continue;
        pick.push(s);
        if (pick.length >= 8) break;
      }
      if (pick.length >= 8) break;
    }
    if (!pick.length) pick.push({ x: cx - 80, z: cz, r: 80 });
    for (let n = pick.length; pick.length < 8; ) {
      const b = pick[pick.length % n];
      pick.push({ x: b.x + 3, z: b.z + 3, r: b.r });
    }
    pick.sort((a, b) => b.r - a.r);
    const ry = (s) => hsh(s.x + s.z) * 6.28;
    const L0 = pick[0];
    O.lan = mkLantern(L0.x, L0.z, ry(L0));
    {
      const a = hsh(L0.x * 3.1) * 6.28; // the quest arrow only gets you close: the glint does the rest
      O.lan.hint = { x: L0.x + Math.cos(a) * 9, z: L0.z + Math.sin(a) * 9 };
    }
    O.caches = pick.slice(1, 4).map((s) => mkCache(s.x, s.z, ry(s)));
    O.tufts = pick.slice(5, 8).map((s) => mkTuft(s.x, s.z, ry(s)));

    // Nip out in the snow, and the trail of glowing pawprints leading there from the village edge
    const ps = pick[4];
    O.pupW = place(mkPup(), ps.x, ps.z, ry(ps));
    O.pupW.x = ps.x;
    O.pupW.z = ps.z;
    {
      const dx = ps.x - cx,
        dz = ps.z - cz,
        D = Math.hypot(dx, dz) || 1,
        ux = dx / D,
        uz = dz / D,
        d0 = Math.min(VR + 4, D - 6);
      O.pr0 = { x: cx + ux * d0, z: cz + uz * d0 };
      const G = new T.Group(),
        geo = new T.CircleGeometry(0.16, 8);
      geo.rotateX(-Math.PI / 2);
      const mat = new T.MeshBasicMaterial({
        color: 0x8ab0ff,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });
      const hd = Math.atan2(ux, uz);
      for (let d = d0, k = 0; d < D - 1.5; d += 1.4, k++) {
        const sd = k % 2 ? 0.28 : -0.28,
          x = cx + ux * d - uz * sd,
          z = cz + uz * d + ux * sd;
        if (!walk(x, z)) continue;
        const m = new T.Mesh(geo, mat);
        m.position.set(x, 0.05, z);
        m.scale.set(1, 1, 1.4);
        m.rotation.y = hd;
        G.add(m);
      }
      G.userData.lus = 1;
      S.add(G);
      O.prints = G;
      O.prMat = mat;
    }
    // Nip at home, beside Ilka (shown once found)
    {
      const n = NPC.filka;
      let x = n.x,
        z = n.z;
      for (const a of [1.3, -1.3, 2.2, -2.2]) {
        const tx = n.x + Math.sin(n.ry + a) * 1.7,
          tz = n.z + Math.cos(n.ry + a) * 1.7;
        if (walk(tx, tz)) {
          x = tx;
          z = tz;
          break;
        }
      }
      O.pupH = place(mkPup(), x, z, n.ry);
      O.pupH.x = x;
      O.pupH.z = z;
    }
    built = 1;
    vis();
  }

  // ---------- state -> scene ----------
  function vis() {
    if (!built || !P) return;
    const f = F();
    O.tufts.forEach((o, k) => (o.g.visible = acc(QI.I1) && !f.t[k]));
    O.lan.g.visible = acc(QI.T2) && !f.lan;
    O.pupW.visible = O.prints.visible = acc(QI.I2) && !f.pup;
    O.pupH.visible = !!f.pup;
    O.caches.forEach((c, k) => setCache(c, !!f.c[k]));
    if (!NG) O.posts.forEach((p, k) => setPost(p, f.w[k] || P.done[QI.M1] ? 3 : 0));
  }

  // ---------- actions ----------
  function openCache(k) {
    const f = F(),
      c = O.caches[k];
    f.c[k] = 1;
    setCache(c, 1);
    puff(V3(c.x, 1, c.z), "ice", 18, 4, 0.8, 1);
    snd((w) => w.chime([660, 880, 1100], 0.07, 0.8));
    const gd = 35 + 15 * cnt(f.c);
    P.gold += gd;
    giveItem(genItem(null, Math.max(3, P.lvl), 2));
    const n = cnt(f.c);
    say("Frozen Cache cracked open! +" + gd + " ✦  (" + n + " / 3 found)");
    if (n === 3 && !f.call) {
      f.call = 1;
      P.gold += 120;
      giveItem(genItem(null, Math.max(3, P.lvl), 3));
      say("All three Frozen Caches found! +120 ✦ and a Rare find", "#ffd34d");
    }
    sv();
    ui();
  }
  function takeTuft(k) {
    const f = F(),
      o = O.tufts[k];
    f.t[k] = 1;
    o.g.visible = false;
    puff(V3(o.x, 0.8, o.z), "ice", 10, 2.5, 0.6, 0.7);
    snd((w) => w.chime([740, 990], 0.06, 0.5));
    say("Tuft of wolf fur (" + cnt(f.t) + " / 3)");
    qchk();
    sv();
  }
  function takeLantern() {
    F().lan = 1;
    O.lan.g.visible = false;
    puff(V3(O.lan.x, 0.8, O.lan.z), "fire", 14, 3, 0.8, 0.8);
    snd((w) => w.chime([523, 659, 784, 1047], 0.09, 1));
    say("You dig the old lantern out of the ice. Its glass is still warm. Take it to Tobin.");
    qchk();
    sv();
  }
  function takePup() {
    F().pup = 1;
    puff(V3(O.pupW.x, 1, O.pupW.z), "heal", 14, 3, 0.7, 0.8);
    snd((w) => w.chime([880, 1175, 880], 0.08, 0.4));
    say("Nip yips, licks your chin, and bounds off home toward Ilka!");
    vis();
    qchk();
    sv();
  }
  function patPup() {
    puff(V3(O.pupH.x, 1.3, O.pupH.z), "heal", 6, 1.5, 0.6, 0.5);
    snd((w) => w.chime([988, 1319], 0.06, 0.3));
    O.pupH.userData.hap = performance.now() + 1500;
  }
  function lightPost(k) {
    const f = F(),
      p = O.posts[k];
    f.w[k] = 1;
    setPost(p, 3);
    puff(V3(p.x, 3.2, p.z), "fire", 12, 2.5, 0.7, 0.8);
    snd((w) => w.chime([440, 660], 0.08, 0.7));
    say("Wick relit (" + cnt(f.w) + " / 4)");
    qchk();
    sv();
  }

  // ---------- the Long Night ----------
  let NG = null,
    hud = null;
  function hudSet(t) {
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "frpn";
      hud.style.cssText =
        "position:fixed;left:50%;top:64px;transform:translateX(-50%);padding:8px 18px;border-radius:12px;background:rgba(14,10,34,.85);color:#ffe2a8;font:600 16px system-ui,sans-serif;border:1px solid #ffd27a88;z-index:40;pointer-events:none;display:none;text-align:center";
      document.body.appendChild(hud);
    }
    hud.style.display = t ? "block" : "none";
    if (t) hud.innerHTML = t;
  }
  function mkWisp(x, z) {
    const g = new T.Group();
    const dk = new T.Sprite(
      new T.SpriteMaterial({ map: GLT, color: 0x1a0828, transparent: true, depthWrite: false, opacity: 0.95 }),
    );
    dk.scale.setScalar(2.4);
    g.add(dk);
    const core = new T.Sprite(AM(GLT));
    core.material.color.setHex(0x9a5aff);
    core.scale.setScalar(1.1);
    g.add(core);
    [-1, 1].forEach((s) => {
      const e = new T.Sprite(AM(GLT));
      e.material.color.setHex(0xffe0ff);
      e.scale.setScalar(0.28);
      e.position.set(s * 0.22, 0.12, 0.3);
      g.add(e);
    });
    g.position.set(x, 1.3, z);
    g.userData.lus = 1;
    S.add(g);
    return g;
  }
  function dropWisp(w) {
    S.remove(w.g);
    w.g.traverse((o) => o.material && o.material.dispose());
  }
  function nightStart() {
    NG = { t: 0, sp: 3, ws: [], hp: [3, 3, 3, 3], cd: [0, 0, 0, 0], P: P };
    O.posts.forEach((p) => setPost(p, 3));
    say("The Long Night begins! Keep the wicks burning until the dawn bell.", "#ffd27a");
    say("Walk into the shadows to burn them away. E at a wick rekindles it.", "#c9b8ff");
    snd((w) => w.chime([220, 196, 175], 0.25, 1.4));
  }
  function nightEnd(win, why) {
    if (!NG) return;
    NG.ws.forEach(dropWisp);
    const lit = NG.hp.filter((h) => h > 0).length;
    NG = null;
    hudSet("");
    if (win) {
      F().night = 1;
      O.posts.forEach((p) => {
        setPost(p, 3);
        puff(V3(p.x, 3.4, p.z), "fire", 16, 4, 1, 1);
      });
      puff(V3(O.ring.x, 2, O.ring.z), "heal", 30, 6, 1.2, 1.2);
      snd((w) => w.chime([523, 659, 784, 1047, 1319], 0.12, 1.6));
      say("The dawn bell rings over Frostfen! " + lit + " wicks still burn. Return to Sister Maren.", "#ffd34d");
      qchk();
      sv();
    } else {
      say(why + " Press E at a wick to try again.", "#ff9a7a");
      snd((w) => w.chime([330, 247, 196], 0.18, 1));
      vis();
    }
  }
  function nightTick(dt, now) {
    const N = NG;
    if (N.P !== P) return nightEnd(false, "The night slipped away.");
    const p = W.position;
    if (Math.hypot(p.x - O.ring.x, p.z - O.ring.z) > 45)
      return nightEnd(false, "You left the wick ring and the Gloom took it.");
    for (const f of foes)
      if (!f.dead && f.o && Math.hypot(f.o.position.x - O.ring.x, f.o.position.z - O.ring.z) < 70)
        f.cool = Math.max(f.cool || 0, now + 1500);
    N.t += dt;
    const k = Math.min(1, N.t / NL);
    // spawn
    N.sp -= dt;
    if (N.sp <= 0 && N.t < NL - 1) {
      N.sp = N.t > NL - 12 ? 0.6 : 2.2 - 1.4 * k;
      const a = Math.random() * 6.283,
        r = 24 + Math.random() * 6;
      const live = N.hp.map((h, i) => (h > 0 ? i : -1)).filter((i) => i >= 0);
      if (live.length)
        N.ws.push({
          g: mkWisp(O.ring.x + Math.cos(a) * r, O.ring.z + Math.sin(a) * r),
          tg: live[Math.floor(Math.random() * live.length)],
          ph: Math.random() * 6,
        });
    }
    // move, burn, strike
    const sp = 2.4 + 1.6 * k;
    for (let i = N.ws.length - 1; i >= 0; i--) {
      const w = N.ws[i],
        q = w.g.position;
      if (N.hp[w.tg] <= 0) {
        let b = -1,
          bd = 1e9;
        N.hp.forEach((h, j) => {
          const d = Math.hypot(O.posts[j].x - q.x, O.posts[j].z - q.z);
          if (h > 0 && d < bd) {
            bd = d;
            b = j;
          }
        });
        if (b < 0) break;
        w.tg = b;
      }
      const t = O.posts[w.tg],
        dx = t.x - q.x,
        dz = t.z - q.z,
        d = Math.hypot(dx, dz) || 1;
      w.ph += dt * 4;
      q.x += (dx / d) * sp * dt + Math.cos(w.ph) * dt * 0.8;
      q.z += (dz / d) * sp * dt + Math.sin(w.ph) * dt * 0.8;
      q.y = 1.3 + Math.sin(w.ph * 0.7) * 0.3;
      if (Math.hypot(p.x - q.x, p.z - q.z) < 2.8) {
        puff(q.clone(), "spirit", 8, 3, 0.5, 0.7);
        snd((s) => s.tone(900 + Math.random() * 300, 0, 0.18, "triangle", 0.05));
        dropWisp(w);
        N.ws.splice(i, 1);
        continue;
      }
      if (d < 1.1) {
        N.hp[w.tg]--;
        setPost(t, N.hp[w.tg]);
        puff(V3(t.x, 3.1, t.z), "spirit", 10, 2, 0.6, 0.8);
        snd((s) => s.tone(140, 0, 0.35, "sawtooth", 0.05, 90));
        if (N.hp[w.tg] === 0) say("A wick has gone out! Press E beside it to relight it.", "#ff9a7a");
        dropWisp(w);
        N.ws.splice(i, 1);
      }
    }
    if (N.hp.every((h) => h <= 0)) return nightEnd(false, "The Gloom swallowed every wick.");
    if (N.t >= NL) {
      const lit = N.hp.filter((h) => h > 0).length;
      return lit >= 3
        ? nightEnd(true)
        : nightEnd(false, "The bell rang with only " + lit + " wick" + (lit === 1 ? "" : "s") + " burning.");
    }
    const left = Math.ceil(NL - N.t);
    hudSet(
      "<b>The Long Night</b> &nbsp;·&nbsp; dawn in " +
        Math.floor(left / 60) +
        ":" +
        String(left % 60).padStart(2, "0") +
        " &nbsp;·&nbsp; " +
        N.hp
          .map(
            (h) => '<span style="color:' + (h > 0 ? ["", "#ff8a4a", "#ffb04a", "#ffe08a"][h] : "#555") + '">●</span>',
          )
          .join(" "),
    );
  }
  function rekindle(k) {
    NG.hp[k] = 3;
    NG.cd[k] = performance.now() + 5000;
    setPost(O.posts[k], 3);
    puff(V3(O.posts[k].x, 3.2, O.posts[k].z), "fire", 10, 2.5, 0.6, 0.8);
    snd((w) => w.chime([523, 784], 0.06, 0.5));
  }

  // ---------- E targets + prompt ----------
  let cur = null;
  const cls = (c) => document.body.classList.contains(c);
  const live = () =>
    typeof SLOT !== "undefined" &&
    SLOT >= 0 &&
    !!P &&
    mode === "explore" &&
    !paused &&
    !cls("cut") &&
    !cls("ttl") &&
    typeof TI === "object" &&
    !TI.mode;
  const busy = () => !!(window.__np || window.__ln || window.__ch);
  function target() {
    const p = W.position,
      f = F(),
      L = [];
    const tr = (o, txt, fn, r) => {
      const d = Math.hypot(o.x - p.x, o.z - p.z);
      if (d < (r || 2.8)) L.push({ d, txt, fn });
    };
    O.caches.forEach((c, k) => !f.c[k] && tr(c, "Press E to crack the Frozen Cache", () => openCache(k)));
    O.tufts.forEach((o, k) => o.g.visible && tr(o, "Press E to pick the tuft of wolf fur", () => takeTuft(k)));
    if (O.lan.g.visible) tr(O.lan, "Press E to dig out the old lantern", takeLantern);
    if (O.pupW.visible) tr(O.pupW, "Press E to scoop up Nip", takePup);
    if (O.pupH.visible) tr(O.pupH, "Press E to pat Nip", patPup, 2.4);
    const now = performance.now(),
      canNight = acc(QI.M2) && !f.night && P.done[QI.M1];
    O.posts.forEach((o, k) => {
      if (NG) {
        if (NG.hp[k] < 3 && now > NG.cd[k])
          tr(o, NG.hp[k] ? "Press E to rekindle the wick" : "Press E to relight the wick", () => rekindle(k), 3.2);
      } else if (acc(QI.M1) && !f.w[k]) tr(o, "Press E to relight the wick-post", () => lightPost(k), 3.2);
      else if (canNight) tr(o, "Press E to begin the Long Night", nightStart, 3.2);
    });
    L.sort((a, b) => a.d - b.d);
    return L[0] || null;
  }
  function act() {
    const c = cur;
    cur = null;
    if (c) c.fn();
  }
  addEventListener(
    "keydown",
    (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.key || "").toLowerCase() !== "e") return;
      if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName || "")) return;
      if (!cur || !live() || busy()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (typeof keys === "object") keys.e = 0;
      act();
    },
    true,
  );
  if (typeof WONDR === "object")
    WONDR.pre(() => {
      const el = window.__pe;
      if (!el) return;
      if (!el.__frp) {
        el.__frp = 1;
        el.addEventListener("click", () => {
          if (cur && live() && !busy()) act();
        });
      }
      if (!cur || busy() || !live()) return;
      el.style.display = "block";
      el.textContent = cur.txt;
    });

  // ---------- greetings + hand-in lines ----------
  {
    const panel0 = panel;
    panel = function (k, id) {
      const r = panel0.apply(this, arguments);
      try {
        const G = k === "q" && GV[id];
        if (G) {
          const el = document.querySelector("#pl .dlg p") || document.querySelector(".dlg p");
          if (el && el.textContent === "Well met, lamplighter.") el.textContent = P.done[QI[G.last]] ? G.hi2 : G.hi;
        }
      } catch (e) {}
      return r;
    };
    const qd0 = qdone;
    qdone = function (i) {
      const r = qd0.apply(this, arguments);
      try {
        if (QD[i] && QD[i].done) say(QD[i].done);
        vis();
      } catch (e) {}
      return r;
    };
  }

  // ---------- frame ----------
  let t0 = 0,
    lastT = 0,
    lastV = 0,
    P0 = null,
    err = 0;
  function tick(ts) {
    if (!built) {
      if (typeof SLOT === "undefined" || SLOT < 0 || document.readyState !== "complete") return;
      if (!t0) t0 = ts;
      const moved = !(typeof ZMV === "object" && ZMV.live) || ZMV.on;
      if (ts - t0 < (moved ? 3000 : 15000)) return;
      build();
      return;
    }
    const dt = Math.min(0.05, (ts - (lastT || ts)) / 1000);
    lastT = ts;
    if (P !== P0) {
      P0 = P;
      if (NG) nightEnd(false, "The night slipped away.");
      vis();
    }
    if (ts - lastV > 300) {
      lastV = ts;
      vis();
    }
    // glints and pups
    const s = ts / 1000,
      wv = 0.75 + 0.25 * Math.sin(s * 3);
    O.caches.forEach((c) => c.gl.visible && (c.gl.material.opacity = wv));
    O.tufts.forEach((o) => o.g.visible && (o.gl.material.opacity = wv));
    if (O.lan.g.visible) O.lan.gl.material.opacity = 0.6 + 0.4 * Math.sin(s * 2.2);
    if (O.prints.visible) O.prMat.opacity = 0.5 + 0.25 * Math.sin(s * 2);
    [O.pupW, O.pupH].forEach((g) => {
      if (!g.visible) return;
      const hap = (g.userData.hap || 0) > ts;
      g.userData.tl.rotation.y = Math.sin(s * (hap ? 22 : 9)) * (hap ? 0.8 : 0.45);
      g.userData.hd.rotation.x = Math.sin(s * 1.7) * 0.08 - (hap ? 0.2 : 0);
      g.position.y = hap ? Math.abs(Math.sin(s * 10)) * 0.25 : 0;
    });
    if (O.posts.some((p) => p.h > 0)) {
      O.posts.forEach(
        (p, k) => p.h > 0 && p.fl.scale.setScalar((0.5 + 0.4 * p.h) * (0.92 + 0.08 * Math.sin(s * 11 + k))),
      );
    }
    if (NG && mode === "explore" && !paused) nightTick(dt, performance.now());
    cur = live() ? target() : null;
  }
  function frame(ts) {
    requestAnimationFrame(frame);
    try {
      tick(ts);
    } catch (e) {
      if (err++ < 3) console.error("79-frostpass", e);
    }
  }
  requestAnimationFrame(frame);

  return {
    QI,
    O,
    NPC,
    built: () => !!built,
    night: () => NG,
    // console helper: FROSTPASS.go("ring" | "lan" | "pupW" | "pr0") teleports there (dev checks)
    go: (k) => {
      const o = k === "ring" ? O.ring : O[k] || (O[k + "s"] && O[k + "s"][0]);
      if (o) W.position.set(o.x + 2, 0, o.z + 2);
    },
  };
})();
