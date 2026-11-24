// DUSKWICK - 62-reach.js (v41, loads LAST): the Starfall Reach, a post-story frontier for levels 10-20.
// Through the Starfall Gate on Mirewick's east rim (opens once the Gloom Warden has fallen, quest 7, and you are Lv 10)
// lies a long highland in four stretches, each harder than the last:
//   Wayfarer's Rest (safe camp, Ysolde the quest giver) -> Thistle Downs (Lv 11) -> The Hushwood (Lv 14)
//   -> Starfall Ridge (Lv 17) -> the Crater of the Fallen Star (Lv 20 boss).
// Each stretch ends in a warden glade. A ward across the path to the next stretch breaks once that warden is beaten AND
// you reach the next stretch's level, so the way forward opens as you grow. Ysolde's side quest chain walks you through.
// How it fits in (same tricks as 34-dungeons.js):
//   - Stands in open "frost" ground (x 1780..2020, z -360..-1140), clear of the street dungeons (z -1700) and streets.
//   - Walkable via a window.__edWalk wrap (circles + paths); themes TH.reach0..3; theme/ambient wrapped to hold the look,
//     hide WX and show the area name in #zplate / #zcard.
//   - Foes are ordinary world foes appended to `foes` (fixed order, after every other file's foes) with preset levels
//     (spec lv), tagged f.rch / f.ra (area) / f.rg (warden guard) / f.rwd (warden). Normal foes respawn like street
//     foes; wardens come back after 3 minutes. gather / frame / fight / reward / qWhere are wrapped for them.
//   - Quests are APPENDED to QS (never reorder), giver key "reach" (NPC kind "q", id "reach": Ysolde in the camp).
// Progress: lazy P.reach {k: kills per area, w: wardens beaten, c: chests opened, an: announced}. No DEFP field.
// Only top-level name: REACH. Console: REACH.go(k) puts you at stretch k (0 camp .. 4 crater).
const REACH = {};
(() => {
  const PI = Math.PI,
    S2 = Math.sin;
  // every static piece of the Reach lives in one holder, shown only while the camera is near (instanced scenery has
  // frustum culling off, so it would otherwise be drawn from anywhere in the world)
  const H = new T.Group();
  H.name = "reach";
  H.visible = false;
  S.add(H);
  // ---------- small helpers (same conventions as 33/34) ----------
  let sd = 62041;
  const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647,
    r2 = (a, b) => a + rn() * (b - a);
  const sm = (par, geo, mat, x, y, z) => {
    const m = new T.Mesh(geo, typeof mat === "number" ? M(mat) : mat);
    m.position.set(x || 0, y || 0, z || 0);
    par.add(m);
    return m;
  };
  const EMC = {};
  const emat = (c, e, i) => {
    const k = c + ":" + e + ":" + (i || 1);
    if (EMC[k]) return EMC[k];
    const m = M(c, 1);
    m.emissive.setHex(e);
    m.emissiveIntensity = i || 1;
    return (EMC[k] = m);
  };
  const gsp = (par, c, s, x, y, z) => {
    const sp = new T.Sprite(AM(GLT));
    sp.material.color.setHex(c);
    sp.scale.setScalar(s);
    sp.position.set(x || 0, y || 0, z || 0);
    par.add(sp);
    return sp;
  };
  const flatMat = (c, f) => {
    const m = M(c, 1);
    m.polygonOffset = true;
    m.polygonOffsetFactor = f || -2;
    m.polygonOffsetUnits = f || -2;
    return m;
  };
  function label(txt, col, w) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const x = c.getContext("2d");
    x.font = "800 36px Georgia,serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.lineJoin = "round";
    x.lineWidth = 9;
    x.strokeStyle = "rgba(10,6,20,.9)";
    x.strokeText(txt, 256, 48);
    x.fillStyle = col;
    x.fillText(txt, 256, 48);
    const sp = new T.Sprite(
      new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }),
    );
    sp.scale.set(w || 5.6, (w || 5.6) * 0.1875, 1);
    sp.renderOrder = 3;
    return sp;
  }
  const SWT = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d"),
      gr = x.createRadialGradient(128, 128, 0, 128, 128, 126);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.55, "rgba(255,230,190,.75)");
    gr.addColorStop(1, "rgba(160,110,200,0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 256);
    x.translate(128, 128);
    x.strokeStyle = "rgba(40,20,60,.5)";
    x.lineWidth = 9;
    for (let a = 0; a < 5; a++) {
      x.beginPath();
      for (let t = 0; t < 1; t += 0.02) {
        const r = t * 124,
          an = (a * 2 * PI) / 5 + t * 6;
        x.lineTo(Math.cos(an) * r, Math.sin(an) * r);
      }
      x.stroke();
    }
    return new T.CanvasTexture(c);
  })();
  // a swirling door (PT entry: walk() teleports you when you step into it)
  function swirl(x, y, z, ry, col, r, n, to, lock) {
    const m = new T.Mesh(
      new T.CircleGeometry(r, 36),
      new T.MeshBasicMaterial({ map: SWT, color: col, transparent: true, side: T.DoubleSide, depthWrite: false }),
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    S.add(m);
    const gl = new T.Sprite(AM(GLT));
    gl.material.color.setHex(col);
    gl.scale.setScalar(r * 3);
    gl.position.set(x, y, z);
    S.add(gl);
    const q = {
      x: x + Math.sin(ry) * 0.6,
      z: z + Math.cos(ry) * 0.6,
      to,
      n,
      lock,
      r: m,
      g: gl,
      col,
      ry,
      sw: 1,
      rad: 1.9,
    };
    PT.push(q);
    return q;
  }

  // ---------- state ----------
  const st = () => {
    if (!P.reach) P.reach = {};
    const s = P.reach;
    if (!s.k) s.k = [0, 0, 0, 0];
    if (!s.w) s.w = [0, 0, 0, 0];
    if (!s.c) s.c = {};
    return s;
  };

  // ---------- themes ----------
  const STARS =
    "radial-gradient(1.5px 1.5px at 12% 20%,#fff 99%,transparent),radial-gradient(1.5px 1.5px at 38% 8%,#fff 99%,transparent)," +
    "radial-gradient(2px 2px at 64% 26%,#fff 99%,transparent),radial-gradient(1.5px 1.5px at 82% 12%,#fff 99%,transparent)," +
    "radial-gradient(1.5px 1.5px at 52% 40%,#fff 99%,transparent),radial-gradient(1.5px 1.5px at 24% 34%,#fff 99%,transparent),";
  TH.reach0 = [
    0x5a3a5a,
    "radial-gradient(circle at 75% 20%,#ffe8c0 0 16px,rgba(255,220,170,.28) 17px 52px,transparent 54px)," +
      "linear-gradient(#140a2a 0%,#3a1e4e 40%,#8a4a6a 72%,#e09a6a 100%)",
    0xffd8c0,
    0x3a2a40,
    0xffb880,
  ];
  TH.reach1 = [
    0x16302e,
    "radial-gradient(circle at 20% 15%,#d8fff4 0 10px,rgba(180,255,230,.2) 11px 36px,transparent 38px)," +
      "linear-gradient(#020a0c 0%,#0a2026 45%,#1a4440 80%,#3a7064 100%)",
    0x9fe0d0,
    0x10241f,
    0x7ad8c0,
  ];
  TH.reach2 = [
    0x3a3a6a,
    STARS + "linear-gradient(#04041a 0%,#14164a 45%,#3a3a80 78%,#7a76b8 100%)",
    0xc8d0ff,
    0x24244a,
    0xe8e0ff,
  ];
  TH.reach3 = [
    0x2a1a4a,
    STARS +
      "radial-gradient(circle at 50% 30%,rgba(255,220,150,.4),transparent 42%)," +
      "linear-gradient(#06021a 0%,#20104a 50%,#5a3a7a 85%,#c08a6a 100%)",
    0xffe0c0,
    0x2a1a40,
    0xffd8a0,
  ];

  // ---------- layout ----------
  const CAMP = [1900, -400, 24];
  // foes: [kind, tier, hc]. Kinds from 33 (mwisp/skel/bogm) fall back to a tinted gloom if missing.
  const AR = [
    {
      n: "Thistle Downs",
      sub: "Heather and standing stones",
      lv: 11,
      need: 10,
      th: "reach0",
      col: 0xd8a0ff,
      tc: "#e6c8ff",
      gc: 0x5a5440,
      bc: 0x302a26,
      pc: 0x7a6a50,
      C: [
        [1900, -470, 36],
        [1955, -525, 30],
        [1845, -528, 30],
        [1900, -588, 22],
      ],
      K: [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
      ],
      foes: [
        ["wolf", 3],
        ["gnome", 3, 0xb08aff],
        ["gloom", 3, 0x8a5ad8],
        ["mwisp", 3],
        ["wolf", 3],
        ["gnome", 3, 0xb08aff],
        ["gloom", 3, 0x8a5ad8],
        ["mwisp", 3],
        ["wolf", 3],
      ],
      guards: [
        ["wolf", 3],
        ["gnome", 3, 0xb08aff],
      ],
      b: {
        kind: "wolf",
        n: "Thornmane the Elder",
        hm: 3,
        die: "The old wolf lies down in the heather, and the Downs go quiet.",
        say: "Thornmane lifts his scarred head. The heather bristles around him.",
      },
    },
    {
      n: "The Hushwood",
      sub: "Where sound goes to sleep",
      lv: 14,
      need: 13,
      th: "reach1",
      col: 0x6affd8,
      tc: "#b8ffe8",
      gc: 0x1f3a32,
      bc: 0x12201c,
      pc: 0x3a3a2e,
      C: [
        [1900, -680, 34],
        [1958, -735, 30],
        [1842, -740, 30],
        [1900, -800, 22],
      ],
      K: [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
      ],
      foes: [
        ["skel", 3],
        ["bogm", 3],
        ["hound", 3],
        ["gloom", 3, 0x2a8a8a],
        ["mwisp", 3],
        ["skel", 3],
        ["bogm", 3],
        ["hound", 3],
        ["gloom", 3, 0x2a8a8a],
      ],
      guards: [
        ["skel", 3],
        ["mwisp", 3],
      ],
      b: {
        kind: "skel",
        n: "Sir Hollowmere",
        hm: 3,
        die: "The Hushed Knight's armour falls empty. Birdsong creeps back into the wood.",
        say: "A knight in moss-grown armour turns toward you without a sound.",
      },
    },
    {
      n: "Starfall Ridge",
      sub: "Stone, starlight and thin air",
      lv: 17,
      need: 16,
      th: "reach2",
      col: 0xb0c0ff,
      tc: "#d8e0ff",
      gc: 0x5e5e70,
      bc: 0x2c2c3c,
      pc: 0x8a8698,
      C: [
        [1900, -895, 34],
        [1958, -950, 30],
        [1842, -955, 30],
        [1900, -1015, 22],
      ],
      K: [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
      ],
      foes: [
        ["fgolem", 3],
        ["lgolem", 3],
        ["phoenix", 3],
        ["gnome", 3, 0xffe08a],
        ["gloom", 3, 0xd0c0ff],
        ["fgolem", 3],
        ["lgolem", 3],
        ["phoenix", 3],
        ["gnome", 3, 0xffe08a],
      ],
      guards: [
        ["fgolem", 3],
        ["gnome", 3, 0xffe08a],
      ],
      b: {
        kind: "lgolem",
        n: "The Ridge Colossus",
        hm: 3,
        die: "The Colossus cracks down the middle and settles into the mountain for good.",
        say: "The mountainside stands up. It has a face.",
      },
    },
    {
      n: "Crater of the Fallen Star",
      sub: "The end of the Reach",
      lv: 20,
      need: 18,
      th: "reach3",
      col: 0xffd890,
      tc: "#ffe6b0",
      gc: 0x3a2e3a,
      bc: 0x1e1622,
      pc: 0x5a4a4a,
      C: [[1900, -1092, 28]],
      K: [],
      foes: [],
      guards: [
        ["phoenix", 3],
        ["gnome", 3, 0xffe08a],
      ],
      b: {
        kind: "phoenix",
        n: "Astrael, the Fallen Star",
        hm: 3.6,
        die: "The star's fire gutters... and settles into a warm, quiet glow. It is only light now.",
        say: "Something in the crater opens its eyes, and the whole sky leans in to look.",
      },
    },
  ];
  // the warden glade of each stretch is its last circle; the gate path joins it to the next stretch's first circle
  AR.forEach((A, k) => {
    A.i = k;
    A.wg = A.C[A.C.length - 1];
    if (k > 0) {
      const g = AR[k - 1].wg,
        n0 = A.C[0],
        z1 = g[1] - g[2] + 1,
        z2 = n0[1] + n0[2] - 1;
      A.gate = { x: g[0], z1, z2, zm: (z1 + z2) / 2, hw: 5 };
    }
  });
  const ZB = [-628, -841.5, -1050.5]; // stretch boundaries (the gate wards)
  const areaAt = (z) => (z > ZB[0] ? 0 : z > ZB[1] ? 1 : z > ZB[2] ? 2 : 3);
  const BOX = [1770, 2030, -1140, -360];
  const inR = (x, z) => x > BOX[0] && x < BOX[1] && z > BOX[2] && z < BOX[3];
  REACH.inR = inR;
  REACH.AR = AR;
  const gateOpen = (k) => {
    try {
      const s = st();
      return !!s.w[k - 1] && P.lvl >= AR[k].need;
    } catch (e) {
      return false;
    }
  };
  REACH.gateOpen = gateOpen;
  // ---------- walking ----------
  const seg = (x, z, ax, az, bx, bz) => {
    const dx = bx - ax,
      dz = bz - az,
      l2 = dx * dx + dz * dz || 1,
      t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    return Math.hypot(x - ax - dx * t, z - az - dz * t);
  };
  const CAPS = [[CAMP[0], CAMP[1], AR[0].C[0][0], AR[0].C[0][1], 6]];
  AR.forEach((A) => A.K.forEach(([a, b]) => CAPS.push([A.C[a][0], A.C[a][1], A.C[b][0], A.C[b][1], 6])));
  // m = margin (scenery placement ignores the wards and widens everything by m)
  function walkM(x, z, m, gates) {
    if (!inR(x, z)) return false;
    if (Math.hypot(x - CAMP[0], z - CAMP[1]) <= CAMP[2] - 0.6 + m) return true;
    for (const A of AR) for (const [cx, cz, r] of A.C) if (Math.hypot(x - cx, z - cz) <= r - 0.6 + m) return true;
    for (const c of CAPS) if (seg(x, z, c[0], c[1], c[2], c[3]) <= c[4] + m) return true;
    for (let k = 1; k < AR.length; k++) {
      const G = AR[k].gate;
      if (Math.abs(x - G.x) <= G.hw + m && z <= G.z1 + 1 && z >= G.z2 - 1) return !gates || z > G.zm || gateOpen(k);
    }
    return false;
  }
  {
    const ew0 = window.__edWalk;
    window.__edWalk = (x, z) => (ew0 && ew0(x, z)) || walkM(x, z, 0, 1);
  }
  SAFEC.push([CAMP[0], CAMP[1], CAMP[2]]);
  safeRing(CAMP[0], CAMP[1], CAMP[2]);

  // ---------- ground ----------
  {
    const bands = [
      [BOX[3], ZB[0]],
      [ZB[0], ZB[1]],
      [ZB[1], ZB[2]],
      [ZB[2], BOX[2]],
    ];
    bands.forEach(([z0, z1], k) => {
      const m = new T.Mesh(new T.PlaneGeometry(BOX[1] - BOX[0] + 40, z0 - z1 + 0.5), M(AR[k].bc, 1));
      m.rotation.x = -PI / 2;
      m.position.set((BOX[0] + BOX[1]) / 2, -0.06, (z0 + z1) / 2);
      H.add(m);
    });
    const disc = (x, z, r, c, f) => {
      const m = new T.Mesh(new T.CircleGeometry(r, 44), flatMat(c, f));
      m.rotation.x = -PI / 2;
      m.position.set(x, 0, z);
      H.add(m);
    };
    disc(CAMP[0], CAMP[1], CAMP[2] + 1.2, 0x6a5a48, -2);
    AR.forEach((A) => A.C.forEach(([x, z, r]) => disc(x, z, r + 1.4, A.gc, -2)));
    const strip = (ax, az, bx, bz, w, c) => {
      const L = Math.hypot(bx - ax, bz - az),
        m = new T.Mesh(new T.PlaneGeometry(w, L + w), flatMat(c, -4));
      m.rotation.x = -PI / 2;
      m.rotation.z = Math.atan2(bx - ax, bz - az);
      m.position.set((ax + bx) / 2, 0.01, (az + bz) / 2);
      H.add(m);
    };
    strip(CAMP[0], CAMP[1], AR[0].C[0][0], AR[0].C[0][1], 9, AR[0].pc);
    AR.forEach((A) => A.K.forEach(([a, b]) => strip(A.C[a][0], A.C[a][1], A.C[b][0], A.C[b][1], 8, A.pc)));
    for (let k = 1; k < AR.length; k++) {
      const G = AR[k].gate;
      strip(G.x, G.z1 + 3, G.x, G.z2 - 3, G.hw * 2 - 1, AR[k].pc);
    }
  }

  // ---------- scenery (instanced, fixed seed) ----------
  const IL = {}; // key -> {geo, col, em, list}
  const put = (key, geo, col, em, q) => {
    const e = IL[key] || (IL[key] = { geo, col, em, list: [] });
    e.list.push(q);
  };
  const GLOWI = []; // instanced glowing meshes that pulse
  let G_FIR, G_BUSH, G_ROCK, G_CROWN;
  try {
    G_FIR = GEOX.fir(2.2, 9);
    G_BUSH = GEOX.bush(1);
    G_ROCK = GEOX.rock(1.2);
    G_CROWN = GEOX.bush(1.7);
  } catch (e) {
    G_FIR = new T.ConeGeometry(2.2, 9, 7);
    G_BUSH = new T.IcosahedronGeometry(1, 0);
    G_ROCK = new T.DodecahedronGeometry(1.2, 0);
    G_CROWN = new T.IcosahedronGeometry(1.7, 0);
  }
  const G_TRUNK = Cy(0.28, 0.42, 2.6, 7),
    G_STONE = B(1.1, 3.2, 0.7),
    G_DOT = Sp(0.18, 6),
    G_CAP = Sp(0.36, 8),
    G_STEM = Cy(0.08, 0.11, 0.45, 6),
    G_XTAL = new T.OctahedronGeometry(0.6, 0);
  function tree(style, x, z, s, ry) {
    if (style === 0) {
      // Downs: round-crowned tree, heather bush, or a standing stone
      const p = rn();
      if (p < 0.45) {
        put("trunk0", G_TRUNK, 0x3a2a24, 0, [x, 1.3 * s, z, s, ry]);
        put("crown0", G_CROWN, 0x4a5a3c, 0, [x, 3.4 * s, z, s, ry, 0, 1.1, 0.9, 1.1]);
      } else if (p < 0.85) put("heath", G_BUSH, 0x6a4a7a, 0, [x, 0.4 * s, z, s * 1.3, ry, 0, 1.2, 0.7, 1.2]);
      else put("stone", G_STONE, 0x7a7a82, 0, [x, 1.5 * s, z, s, ry, r2(-0.12, 0.12)]);
    } else if (style === 1) {
      // Hushwood: tall dark firs and ferns
      if (rn() < 0.75) {
        put("trunk1", G_TRUNK, 0x2a1e18, 0, [x, 1.3 * s, z, s * 1.2, ry]);
        put("fir1", G_FIR, 0x1c3a30, 0, [x, (2.2 + 4.5) * s, z, s, ry]);
      } else put("fern", G_BUSH, 0x2a5a40, 0, [x, 0.35 * s, z, s, ry, 0, 1.3, 0.6, 1.3]);
    } else {
      // Ridge / crater: boulders, crystals, dead pines
      const p = rn();
      if (p < 0.6) put("rock2", G_ROCK, 0x7a7a90, 0, [x, 0.6 * s, z, s * r2(1, 2.4), ry, r2(0, 0.5)]);
      else if (p < 0.8) {
        put("trunk2", G_TRUNK, 0x3a3440, 0, [x, 1.3 * s, z, s, ry]);
        put("fir2", G_FIR, 0x3a3a50, 0, [x, (2.2 + 4.5) * s * 0.8, z, s * 0.8, ry]);
      } else put("xtal", G_XTAL, 0xc8d0ff, 0x6a7aff, [x, 1.2 * s, z, s, ry, r2(-0.3, 0.3), 1, 2.6, 1]);
    }
  }
  const styleOf = (k) => (k === 0 ? 0 : k === 1 ? 1 : 2);
  // a band of scenery round every circle, outside anything walkable
  const band = (cx, cz, r, style, dens) => {
    const n = Math.round((2 * PI * r) / dens);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * PI + r2(-0.1, 0.1),
        d = r + r2(2.5, 14),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (walkM(x, z, 1.8, 0)) continue;
      tree(style, x, z, r2(0.8, 1.4), r2(0, 6.28));
    }
    for (let i = 0; i < n * 0.6; i++) {
      const a = r2(0, 2 * PI),
        d = r + r2(14, 30),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (walkM(x, z, 6, 0) || !inR(x, z)) continue;
      tree(style, x, z, r2(1, 1.8), r2(0, 6.28));
    }
  };
  band(CAMP[0], CAMP[1], CAMP[2], 0, 3.2);
  AR.forEach((A, k) => A.C.forEach(([x, z, r]) => band(x, z, r, styleOf(k), k === 1 ? 2.2 : 3)));
  // the gate paths get a row either side
  for (let k = 1; k < AR.length; k++) {
    const G = AR[k].gate;
    for (let z = G.z1; z >= G.z2; z -= 3.2)
      [-1, 1].forEach((sg) => {
        const x = G.x + sg * (G.hw + r2(2.5, 6));
        if (!walkM(x, z, 1.8, 0)) tree(styleOf(k - 1), x, z, r2(0.8, 1.2), r2(0, 6.28));
      });
  }
  // inside the meadows: a few props near the rim (never on a path or in the middle where fights stand)
  const nearPath = (x, z) => CAPS.some((c) => seg(x, z, c[0], c[1], c[2], c[3]) < c[4] + 2.5);
  AR.forEach((A, k) =>
    A.C.forEach(([cx, cz, r], ci) => {
      if (ci === A.C.length - 1) return; // keep warden glades clear
      for (let j = 0; j < 6; j++) {
        const a = r2(0, 2 * PI),
          d = r * r2(0.8, 0.92),
          x = cx + Math.cos(a) * d,
          z = cz + Math.sin(a) * d;
        if (nearPath(x, z)) continue;
        if (k === 0) {
          if (j % 2) put("stone", G_STONE, 0x7a7a82, 0, [x, 1.5, z, r2(0.8, 1.1), a, r2(-0.1, 0.1)]);
          else put("heath", G_BUSH, 0x6a4a7a, 0, [x, 0.4, z, 1.2, a, 0, 1.2, 0.7, 1.2]);
          for (let t = 0; t < 4; t++)
            put("thistle", G_DOT, 0xd8b0ff, 0xb070ff, [x + r2(-1.6, 1.6), 0.55, z + r2(-1.6, 1.6), r2(0.8, 1.3)]);
          solids.push({ x, z, r: 0.9 });
        } else if (k === 1) {
          for (let t = 0; t < 3; t++) {
            const mx = x + r2(-1.2, 1.2),
              mz = z + r2(-1.2, 1.2),
              s = r2(0.8, 1.6);
            put("stem", G_STEM, 0xe8e0d0, 0, [mx, 0.22 * s, mz, s]);
            put("cap", G_CAP, 0x8affe0, 0x2affc0, [mx, 0.48 * s, mz, s, 0, 0, 1, 0.5, 1]);
          }
        } else {
          put("rock2", G_ROCK, 0x7a7a90, 0, [x, 0.5, z, r2(0.8, 1.3), a]);
          put("xtal", G_XTAL, 0xc8d0ff, 0x6a7aff, [x + 1, 0.9, z, r2(0.7, 1.1), a, 0.2, 1, 2.6, 1]);
          solids.push({ x, z, r: 1.2 });
        }
      }
    }),
  );
  Object.keys(IL).forEach((k) => {
    const e = IL[k],
      m = inst(e.geo, e.col, e.list, e.em);
    if (!m) return;
    S.remove(m);
    H.add(m);
    if (e.em) GLOWI.push(m);
  });

  // ---------- the camp: Wayfarer's Rest ----------
  {
    const o = new T.Group();
    o.position.set(CAMP[0], 0, CAMP[1]);
    [PI / 4, (3 * PI) / 4, (5 * PI) / 4, (7 * PI) / 4].forEach((a, i) => {
      const x = Math.cos(a) * 15,
        z = Math.sin(a) * 15,
        t = sm(o, Cn(2.6, 3, 4), i % 2 ? 0x8a6a4a : 0x6a5a7a, x, 1.5, z);
      t.rotation.y = PI / 4 - a;
      sm(o, B(0.12, 3.4, 0.12), 0x3a2a20, x, 1.7, z);
      solids.push({ x: CAMP[0] + x, z: CAMP[1] + z, r: 2.3 });
    });
    // campfire (no light: emissive + glow)
    sm(o, Cy(1.2, 1.3, 0.3, 10), 0x4a4044, 0, 0.15, -4);
    for (let k = 0; k < 5; k++) {
      const l = sm(o, Cy(0.12, 0.14, 1.6, 5), 0x3a2418, Math.cos(k * 1.26) * 0.4, 0.45, -4 + Math.sin(k * 1.26) * 0.4);
      l.rotation.set(0.9, k * 1.26, 0);
    }
    sm(
      o,
      Cn(0.55, 1.4, 7),
      new T.MeshBasicMaterial({
        color: 0xffa040,
        transparent: true,
        opacity: 0.6,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
      0,
      1.0,
      -4,
    );
    gsp(o, 0xffa050, 5, 0, 1.1, -4);
    solids.push({ x: CAMP[0], z: CAMP[1] - 4, r: 1.4 });
    // logs to sit on
    [
      [-2.6, -4, 0],
      [2.6, -4, 0],
      [0, -6.6, PI / 2],
    ].forEach(([x, z, r]) => sm(o, Cy(0.32, 0.32, 2.2, 8), 0x5a3a26, x, 0.32, z).rotation.set(0, r, PI / 2));
    // lantern posts round the rim (not on the north path or the south portal)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 2 * PI + PI / 8;
      if (Math.abs(Math.sin(a)) > 0.9) continue;
      const x = Math.cos(a) * (CAMP[2] - 2.5),
        z = Math.sin(a) * (CAMP[2] - 2.5);
      sm(o, Cy(0.1, 0.13, 3.2, 6), 0x2a2030, x, 1.6, z);
      sm(o, B(0.4, 0.5, 0.4), emat(0xffe0a0, 0xffb040, 1.3), x, 3.35, z);
      gsp(o, 0xffc870, 2.4, x, 3.35, z);
      solids.push({ x: CAMP[0] + x, z: CAMP[1] + z, r: 0.4 });
    }
    // signboard listing the stretches
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 320;
    const x = c.getContext("2d");
    x.fillStyle = "#3a2a22";
    x.fillRect(0, 0, 512, 320);
    x.strokeStyle = "#c8a060";
    x.lineWidth = 8;
    x.strokeRect(6, 6, 500, 308);
    x.textAlign = "center";
    x.fillStyle = "#ffe6b0";
    x.font = "800 40px Georgia,serif";
    x.fillText("THE STARFALL REACH", 256, 58);
    x.font = "700 30px Georgia,serif";
    AR.forEach((A, k) => {
      x.fillStyle = A.tc;
      x.fillText(k + 1 + ".  " + A.n + "   Lv " + A.lv, 256, 120 + k * 50);
    });
    const sg = new T.Mesh(new T.PlaneGeometry(3.6, 2.25), new T.MeshLambertMaterial({ map: new T.CanvasTexture(c) }));
    sg.position.set(-8, 2.4, 6);
    sg.rotation.y = PI / 6;
    o.add(sg);
    sm(o, B(0.18, 2.6, 0.18), 0x3a2a20, -8 - 1.5 * Math.cos(PI / 6), 1.3, 6 + 1.5 * Math.sin(PI / 6));
    sm(o, B(0.18, 2.6, 0.18), 0x3a2a20, -8 + 1.5 * Math.cos(PI / 6), 1.3, 6 - 1.5 * Math.sin(PI / 6));
    solids.push({ x: CAMP[0] - 8, z: CAMP[1] + 6, r: 1.2 });
    H.add(o);
    const lb = label("WAYFARER'S REST", "#ffe6b0", 6);
    lb.position.set(CAMP[0], 6.5, CAMP[1] + CAMP[2] - 2);
    H.add(lb);
  }
  // Ysolde, the quest giver (NPC kind "q", giver key "reach")
  try {
    NNAME.qreach = ["Ysolde", "Wayfarer's Rest"];
    QGN.reach = ["Ysolde", "Ysolde, the Wayfarer"];
    const x = CAMP[0] + 7.5,
      z = CAMP[1] + 1,
      ry = Math.atan2(-7.5, 13),
      o = person({ robe: 0x4a3a6a, trim: 0xffd27a, hat: "hood", hc: 0x2a2040, prop: "lamp", skin: 0xe8b890 });
    const mkr = new T.Sprite(AM(SP.storm));
    mkr.scale.setScalar(1.5);
    mkr.position.y = 4.2;
    o.add(mkr);
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    S.add(o);
    solids.push({ x, z, r: 1.1 });
    const n = { o, kind: "q", id: "reach", qg: "reach", mkr, x, z, ry };
    NPCS.push(n);
    npcPlate(n);
  } catch (e) {
    console.warn("reach: Ysolde", e);
  }

  // ---------- doors: the Starfall Gate in Mirewick and the way back from the camp ----------
  const GATE = { x: MWX + 33, z: MWZ };
  REACH.GATE = GATE;
  {
    const o = new T.Group();
    o.position.set(GATE.x, 0, GATE.z);
    [-1, 1].forEach((s) => {
      sm(o, Cy(0.5, 0.65, 5, 8), 0x5a6a70, 0, 2.5, s * 2.7);
      sm(o, B(1.2, 0.5, 1.2), 0x4a5a60, 0, 0.25, s * 2.7);
      sm(o, G_XTAL, emat(0xffe6b0, 0xffb060, 1.2), 0, 5.6, s * 2.7).scale.set(0.6, 1.3, 0.6);
      solids.push({ x: GATE.x, z: GATE.z + s * 2.7, r: 0.7 });
    });
    sm(o, B(0.9, 0.6, 6.6), 0x4a5a60, 0, 5.15, 0);
    sm(o, G_XTAL, emat(0xfff0c8, 0xffc070, 1.5), 0, 6.4, 0).scale.set(0.9, 1.6, 0.9);
    gsp(o, 0xffd890, 4, 0, 6.4, 0);
    S.add(o);
    const lb = label("STARFALL GATE  ·  Lv 10+", "#ffe6b0");
    lb.position.set(GATE.x, 7.6, GATE.z);
    S.add(lb);
  }
  swirl(GATE.x, 2.3, GATE.z, -PI / 2, 0xffd890, 1.9, "The Starfall Reach (Lv 10+)", [CAMP[0], CAMP[1] + 14, PI], () =>
    !P.done[7]
      ? "The gate's starlight is cold. It wakes only once the Gloom Warden has fallen."
      : P.lvl < 10
        ? "The starlight pushes you back. Reach level 10 first."
        : null,
  );
  swirl(CAMP[0], 2.3, CAMP[1] + CAMP[2] - 2, PI, 0xffd890, 1.8, "Back to Mirewick", [GATE.x - 5, GATE.z, -PI / 2]);

  // ---------- wards between the stretches ----------
  const WARDS = [];
  for (let k = 1; k < AR.length; k++) {
    const A = AR[k],
      G = A.gate,
      o = new T.Group();
    o.position.set(G.x, 0, G.zm);
    [-1, 1].forEach((s) => {
      sm(o, Cy(0.45, 0.6, 5.5, 8), 0x4a4a58, s * (G.hw + 0.7), 2.75, 0);
      sm(o, G_XTAL, emat(A.col, A.col, 1.1), s * (G.hw + 0.7), 6, 0).scale.set(0.5, 1.2, 0.5);
      gsp(o, A.col, 2.6, s * (G.hw + 0.7), 6, 0);
      solids.push({ x: G.x + s * (G.hw + 0.7), z: G.zm, r: 0.7 });
    });
    H.add(o);
    const lb = label(A.n.toUpperCase() + "  ·  Lv " + A.lv, A.tc, 6.4);
    lb.position.set(G.x, 7.4, G.zm);
    H.add(lb);
    const w = new T.Mesh(
      new T.PlaneGeometry(G.hw * 2, 5.4),
      new T.MeshBasicMaterial({
        color: A.col,
        transparent: true,
        opacity: 0.45,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    w.position.set(G.x, 2.7, G.zm);
    H.add(w);
    WARDS[k] = w;
  }

  // ---------- the crater: a fallen star ----------
  let CORE = null;
  {
    const [cx, cz, r] = AR[3].C[0],
      o = new T.Group();
    o.position.set(cx, 0, cz);
    const ch = new T.Mesh(new T.CircleGeometry(r * 0.55, 32), flatMat(0x1a1218, -6));
    ch.rotation.x = -PI / 2;
    ch.position.y = 0.02;
    o.add(ch);
    const core = new T.Group();
    core.position.set(0, 4.2, -r + 7);
    sm(core, new T.OctahedronGeometry(1.5, 0), emat(0xfff0c8, 0xffc060, 1.6), 0, 0, 0).scale.set(1, 1.5, 1);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 2 * PI;
      sm(core, G_XTAL, emat(0xffe0a0, 0xffa040, 1.3), Math.cos(a) * 2.6, S2(k) * 0.6, Math.sin(a) * 2.6).scale.set(
        0.4,
        0.9,
        0.4,
      );
    }
    gsp(core, 0xffd890, 12, 0, 0, 0);
    o.add(core);
    CORE = core;
    solids.push({ x: cx, z: cz - r + 7, r: 2.2 });
    H.add(o);
  }

  // ---------- foes (appended to `foes` in a fixed order, after everything else) ----------
  const okKind = (k) => {
    if (k === "wolf" || k === "hound" || k === "gloom") return true;
    try {
      if (typeof NFK !== "undefined" && NFK[k]) return true;
      return typeof RDX !== "undefined" && RDX.isMine && RDX.isMine(k);
    } catch (e) {
      return false;
    }
  };
  const fix = ([k, t, hc]) => (okKind(k) ? [k, t, hc] : ["gloom", Math.min(3, t), hc || 0x6a4ac8]);
  const wf = (kind, t, x, z, hc, big, ex) => {
    const o = mkFoe(kind, t, big || 0, hc || undefined);
    o.position.set(x, 0, z);
    S.add(o);
    const f = Object.assign({ o, t, kind, big: big || 0, hx: x, hz: z, w: null, wt: 0, dead: 0, rt: 0 }, ex);
    if (hc) f.hc = hc;
    foes.push(f);
    foeSetup(f);
    if (f.au) f.au.visible = false;
    f.elite = null;
    return f;
  };
  const WARD = []; // the four wardens
  AR.forEach((A, k) => {
    A.fs = [];
    const meadows = A.C.length > 1 ? A.C.slice(0, -1) : A.C;
    A.foes.forEach((sp, j) => {
      const [kind, t, hc] = fix(sp),
        c = meadows[j % meadows.length],
        a = j * 2.4 + k,
        d = c[2] * (0.32 + ((j * 7) % 5) * 0.06),
        f = wf(kind, t, c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d, hc, 0, {
          rch: 1,
          ra: k,
          rc: c,
          rlv: A.lv + (j % 3 === 2 ? 1 : 0),
        });
      A.fs.push(f);
    });
    const [gx, gz, gr] = A.wg;
    A.gs = A.guards.map((sp, j) => {
      const [kind, t, hc] = fix(sp),
        f = wf(kind, t, gx + (j ? 6 : -6), gz + 3, hc, 0, { rch: 1, ra: k, rc: A.wg, rg: k, rlv: A.lv + 1 });
      A.fs.push(f);
      return f;
    });
    const bk = fix([A.b.kind, 4]),
      b = wf(bk[0], 4, gx, gz - Math.min(6, gr * 0.3), bk[2], 1, { rch: 1, ra: k, rc: A.wg, rwd: k, nm: A.b.n });
    b.boss = true;
    b.path = null;
    b.R = 5;
    if (b.ring) b.ring.scale.setScalar(5);
    b.o.rotation.y = 0;
    b.elite = null;
    WARD[k] = b;
    A.bf = b;
    A.bsp = {
      kind: bk[0],
      t: 4,
      big: 1,
      boss: 1,
      nm: A.b.n,
      hc: bk[2],
      lv: k === 3 ? 20 : A.lv + 2,
      bsc: 1.2,
      rch: 1,
      ra: k,
      rwd: k,
    };
    A.bsp.hp0 = Math.round(foeHp(A.bsp.lv) * A.b.hm);
  });
  REACH.WARD = WARD;

  // ---------- boss personalities (48-bossdread: intro cutscene, taunts, dressing) ----------
  try {
    if (typeof BDX !== "undefined" && BDX.BOSS) {
      Object.assign(BDX.BOSS, {
        "Thornmane the Elder": {
          ep: "Grey King of the Downs",
          c: 0xd8a0ff,
          sg: "runes",
          md: "roar",
          el: "storm",
          w: "Every wolf on the Downs has gone quiet. Something old is pacing in the glade.",
          t: ["The heather remembers every pup you scattered.", "Run, little lamp. I like it when they run."],
          e: "THE WHOLE PACK HOWLS WITH ME!",
        },
        "Sir Hollowmere": {
          ep: "The Hushed Knight",
          c: 0x6affd8,
          sg: "lanterns",
          md: "creep",
          el: "spirit",
          w: "Your footsteps stop making a sound. The wood is holding its breath.",
          t: ["...", "Silence is the last oath I have left."],
          e: "THEN LET THE HUSH BE BROKEN!",
        },
        "The Ridge Colossus": {
          ep: "The Mountain That Walks",
          c: 0xb0c0ff,
          sg: "shards",
          md: "stomp",
          el: "ice",
          w: "Pebbles bounce on the path. Then boulders. The ridge is breathing.",
          t: ["I WAS HERE BEFORE YOUR LAMPS.", "I WILL BE HERE AFTER."],
          e: "THE MOUNTAIN FALLS ON YOU!",
        },
        "Astrael, the Fallen Star": {
          ep: "Light Without a Lamp",
          c: 0xffd890,
          sg: "crown",
          md: "regal",
          el: "fire",
          w: "The crater glows like a hearth. Something in it is very, very bright, and very angry.",
          t: ["I fell so far. Do you know how cold it is down here?", "Your little lantern is a candle to me."],
          e: "THEN BURN WITH ME, ALL OF YOU!",
        },
      });
      WARD.forEach((b) => {
        try {
          BDX.dress(b.o, b.nm, b, true);
        } catch (e) {}
      });
    }
  } catch (e) {
    console.warn("reach: bossdread", e);
  }

  // ---------- battles ----------
  const spec = (f) => {
    const s = { kind: f.kind, t: f.t, big: f.big, hc: f.hc, lv: f.rlv, rch: 1, ra: f.ra };
    if (f.elite) s.el = f.elite;
    return s;
  };
  const wardLive = (k) => WARD[k] && !WARD[k].dead;
  const ga0 = gather;
  gather = function (f0) {
    if (!f0 || !f0.rch) return ga0.apply(this, arguments);
    const A = AR[f0.ra];
    if ((f0.rwd != null || f0.rg != null) && (wardLive(f0.ra) || f0.rwd != null)) {
      const bl = wardLive(f0.ra),
        list = (bl ? [A.bf] : []).concat(A.gs.filter((f) => !f.dead)).slice(0, 3);
      if (!list.length) list.push(f0);
      return {
        cap: Math.max(2, list.length),
        rein: 0,
        list,
        sp: list.map((f) => (f === A.bf ? Object.assign({}, A.bsp) : spec(f))),
        bossHp: bl ? A.bsp.hp0 : undefined,
      };
    }
    const cap = Math.min(3, 1 + partyN()),
      list = [f0]
        .concat(
          foes.filter(
            (f) =>
              f !== f0 &&
              f.rch &&
              !f.dead &&
              f.ra === f0.ra &&
              f.rwd == null &&
              f.rg == null &&
              Math.hypot(f.o.position.x - f0.o.position.x, f.o.position.z - f0.o.position.z) < 10,
          ),
        )
        .slice(0, cap);
    return { cap: Math.max(2, list.length), rein: 0, list, sp: list.map(spec) };
  };
  const fr0 = frame;
  frame = function (f) {
    if (!f || !f.rch) return fr0.apply(this, arguments);
    const p = W.position,
      q = f.o.position,
      c = f.rc;
    let cx = (p.x + q.x) / 2,
      cz = (p.z + q.z) / 2;
    const ax = q.x - p.x,
      az = q.z - p.z,
      d = Math.hypot(cx - c[0], cz - c[1]),
      m = Math.max(4, c[2] - 9);
    if (d > m) {
      cx = c[0] + ((cx - c[0]) / d) * m;
      cz = c[1] + ((cz - c[1]) / d) * m;
    }
    const dc = Math.hypot(cx - CAMP[0], cz - CAMP[1]),
      mc = CAMP[2] + 8.6;
    if (dc < mc) {
      cx = CAMP[0] + ((cx - CAMP[0]) / (dc || 1)) * mc;
      cz = CAMP[1] + ((cz - CAMP[1]) / (dc || 1)) * mc;
    }
    const l = Math.hypot(ax, az) || 1;
    return { x: cx, z: cz, r: Math.atan2(-az / l, ax / l) };
  };
  const fi0 = fight;
  fight = function (f0) {
    if (f0 && f0.rch && f0.rg != null && wardLive(f0.ra)) f0 = WARD[f0.ra];
    if (f0 && f0.rch && f0.rwd != null && !f0.dead) {
      try {
        toast(AR[f0.ra].b.say, AR[f0.ra].tc);
      } catch (e) {}
    }
    return fi0.call(this, f0);
  };
  // ---------- rewards: kill counts per stretch, warden first-kill prizes ----------
  const rw0 = reward;
  reward = function (list) {
    const r = rw0.apply(this, arguments);
    try {
      const mine = (list || []).filter((f) => f && f.rch && !f.min);
      if (!mine.length) return r;
      const s = st();
      mine.forEach((f) => {
        if (f.ra != null) s.k[f.ra] = (s.k[f.ra] || 0) + 1;
        if (f.rwd != null) {
          const A = AR[f.rwd],
            first = !s.w[f.rwd];
          s.w[f.rwd] = (s.w[f.rwd] || 0) + 1;
          toast(A.b.die, A.tc);
          if (first) {
            const gd = 220 + 120 * f.rwd;
            P.gold += gd;
            giveItem(genItem(null, Math.min(20, A.lv + 1), f.rwd === 3 ? 4 : 3));
            if (f.rwd < 3) {
              const N = AR[f.rwd + 1];
              toast(
                "The ward to " +
                  N.n +
                  " weakens! +" +
                  gd +
                  " ✦" +
                  (P.lvl < N.need ? "  (it opens at Lv " + N.need + ")" : ""),
                "#c38bff",
              );
            } else toast("The Starfall Reach is conquered! +" + gd + " ✦ and a Legendary prize", "#ffd34d");
          }
        }
      });
      if (typeof qchk === "function") qchk();
      sv();
    } catch (e) {}
    return r;
  };

  // ---------- quests (APPENDED to QS: never reorder) ----------
  const RQ = [
    {
      n: "Starlight Past the Mire",
      d: "Defeat 8 foes on the Thistle Downs",
      kill: 8,
      a: 0,
      lv: 10,
      s: "You came through the gate! Good. The Downs were safe pasture once. Now the wolves won't let a soul through. Thin them out for me?",
    },
    {
      n: "Thornmane the Elder",
      d: "Defeat Thornmane in the warden's glade at the end of the Downs",
      w: 0,
      lv: 11,
      s: "The pack has a king: an old grey wolf the size of a cart. While he holds the glade, the ward to the Hushwood won't break.",
      sr: { n: "Thornmane's Mantle", sl: "robe", el: "storm", r: 3, d: "the Grey King of the Downs" },
    },
    {
      n: "Into the Hushwood",
      d: "Defeat 10 foes in the Hushwood",
      kill: 10,
      a: 1,
      lv: 13,
      s: "The Hushwood swallows sound. Things walk there that should have stayed buried. Clear a way through.",
    },
    {
      n: "The Hushed Knight",
      d: "Defeat Sir Hollowmere at the heart of the Hushwood",
      w: 1,
      lv: 14,
      s: "A knight swore to guard the wood forever. He kept that oath long after he stopped being alive. Release him.",
      sr: { n: "Hollowmere's Lantern-staff", sl: "staff", el: "spirit", r: 3, d: "the Hushed Knight" },
    },
    {
      n: "Up the Starfall Ridge",
      d: "Defeat 10 foes on Starfall Ridge",
      kill: 10,
      a: 2,
      lv: 16,
      s: "Above the trees the stone is cracked with starlight, and the stone has started to get up and walk. Mind your footing.",
    },
    {
      n: "The Ridge Colossus",
      d: "Defeat the Ridge Colossus",
      w: 2,
      lv: 17,
      s: "The ridge itself is guarding the crater. Knock it down, and the way to the fallen star is open.",
      sr: { n: "Colossus Heartstone", sl: "ring", el: "ice", r: 3, d: "the Mountain That Walks" },
    },
    {
      n: "Where the Star Fell",
      d: "Calm Astrael, the Fallen Star, in the crater",
      w: 3,
      lv: 18,
      s: "It's no gloom, whatever's in that crater. It's light, lamplighter. Lost and furious. You of all people can bring it home.",
      sr: { n: "Crown of the Fallen Star", sl: "hat", el: "fire", r: 4, d: "the end of the Starfall Reach" },
    },
  ];
  const QI = [];
  RQ.forEach((r, j) => {
    const q = {
      n: r.n,
      d: r.d,
      st: r.kill ? () => st().k[r.a] || 0 : () => (st().w[r.w] ? 1 : 0),
      k: r.kill || 1,
      g: 100 + 15 * r.lv,
      x: 120 + 30 * r.lv,
      z: "marsh",
      gv: "reach",
      lv: r.lv,
      req: [j ? QI[j - 1] : 7],
      s: r.s,
    };
    if (!r.kill) q.abs = 1;
    const i = QS.push(q) - 1;
    QI.push(i);
    if (r.sr) QSR[i] = r.sr;
  });
  REACH.QI = QI;
  // quest arrow: inside the Reach, at the stretch / warden; outside, toward the Starfall Gate
  const qTarget = (j) => {
    const r = RQ[j];
    if (r.kill) {
      const c = AR[r.a].C[0];
      return [c[0], c[1]];
    }
    const b = WARD[r.w];
    return [b.hx, b.hz];
  };
  setInterval(() => {
    try {
      RQ.forEach((r, j) => {
        const t = qTarget(j);
        QPOS[QI[j]] = ["frost", t[0], t[1]];
      });
    } catch (e) {}
  }, 1000);
  {
    const qw0 = qWhere;
    qWhere = function (i) {
      const r = qw0.apply(this, arguments);
      try {
        if (r == null || !QI.includes(i)) return r;
        const p = W.position;
        if (inR(p.x, p.z)) {
          // past a closed ward: point at it (it tells you what opens it)
          return r;
        }
        const sp = zsIdx(p.x, p.z);
        if (sp >= 0) return zsP(ZSX0 + sp * ZSDX, 2); // v43: the street start, wherever the street stands
        if (zcur === "marsh") return [GATE.x - 1, GATE.z];
        // v45 re-layout (64a): Frostfen -> its trail back to Wispwood Glade, Cinderwaste -> the Mire Causeway
        if (typeof ZMV !== "undefined" && ZMV.on) {
          if (zcur === "frost") return ZMV.tr[0][ZMV.tr[0].length - 1].slice();
          if (zcur === "ember") return ZMV.tr[2][0].slice();
        }
        if (zcur === "frost") return [624, -392];
        if (zcur === "ember") return [-600, -370];
        if (zcur === "hub") return [OX + RDS[0].gx + 13.6, OZ + RDS[0].gz];
      } catch (e) {}
      return r;
    };
  }

  // ---------- treasure: one hidden chest per stretch ----------
  const CH = [
    [0, 1, 1],
    [1, 2, -1],
    [2, 1, 1],
  ].map(([k, ci, sg], i) => {
    const A = AR[k],
      [cx, cz, r] = A.C[ci],
      x = cx + sg * (r - 3.5),
      z = cz,
      c = new T.Group(),
      wood = k === 0 ? 0x5a3a2a : k === 1 ? 0x2e3a2a : 0x5a5a6a;
    sm(c, B(1.4, 0.7, 0.9), wood, 0, 0.35, 0);
    [0.15, 0.6].forEach((y) => sm(c, B(1.46, 0.1, 0.94), 0xd8b04a, 0, y, 0));
    const lid = new T.Group();
    lid.position.set(0, 0.7, -0.45);
    c.add(lid);
    sm(lid, B(1.42, 0.32, 0.92), wood, 0, 0.16, 0.45);
    sm(lid, B(1.48, 0.08, 0.96), 0xd8b04a, 0, 0.3, 0.45);
    const gl = gsp(c, 0xffd27a, 3.2, 0, 0.9, 0);
    c.position.set(x, 0, z);
    c.rotation.y = sg > 0 ? -PI / 2 : PI / 2;
    H.add(c);
    solids.push({ x, z, r: 0.9 });
    return { i, k, x, z, o: c, lid, gl, open: 0 };
  });
  function openC(c) {
    const now = performance.now();
    if (P.inv && P.inv.length >= INVMAX) {
      if (!(now < c.fullT)) {
        c.fullT = now + 3000;
        toast("Your bag is full. Make room, then open the chest.", "#ff8a6a");
      }
      return;
    }
    st().c[c.i] = 1;
    c.open = 1;
    tw(500, (k) => (c.lid.rotation.x = -1.9 * Math.sin(k * 1.57)))
      .then(() => {
        c.gl.visible = false;
        return wait(900);
      })
      .then(() => tw(450, (k) => c.o.scale.setScalar(Math.max(0.01, 1 - k))))
      .then(() => {
        c.o.visible = false;
      });
    puff(new T.Vector3(c.x, 1.2, c.z), "heal", 18, 3, 0.9, 1);
    const gd = Math.round((90 + 40 * c.k) * (1 + 0.1 * P.lvl));
    P.gold += gd;
    toast("Hidden Reach treasure! +" + gd + " ✦", "#ffd27a");
    giveItem(genItem(null, AR[c.k].lv, Math.max(2, rollR(3))));
    ui();
    sv();
  }
  let lastP = null;
  function syncChests() {
    if (lastP === P) return;
    lastP = P;
    const s = st();
    CH.forEach((c) => {
      c.open = s.c[c.i] ? 1 : 0;
      c.o.visible = !c.open;
      c.o.scale.setScalar(1);
      c.lid.rotation.x = 0;
      c.gl.visible = !c.open;
    });
  }

  // ---------- each frame: look, name plate, wards, chests, glow ----------
  let cth = null,
    curA = -2,
    wardT = 0,
    eT = 0,
    nearT = 0,
    peHooked = 0;
  window.addEventListener("keydown", (e) => {
    if ((e.key === "e" || e.key === "E") && !e.repeat) eT = performance.now();
  });
  const th0 = theme;
  theme = function (z) {
    cth = null;
    return th0.apply(this, arguments);
  };
  const a0 = ambient;
  ambient = function (dt, s, p) {
    a0.apply(this, arguments);
    try {
      tick(dt, s, p);
    } catch (e) {}
  };
  function plate(nm, sub) {
    if (mode !== "explore") return;
    const zp = $("zplate");
    if (zp && zp.textContent !== nm) {
      zp.textContent = nm;
      const zc = $("zcard");
      if (zc) {
        zc.innerHTML = nm + "<small>" + sub + "</small>";
        zc.className = "";
        void zc.offsetWidth;
        zc.classList.add("go");
      }
    }
  }
  function tick(dt, s, p) {
    if (!p) return;
    {
      const cx = Math.max(BOX[0], Math.min(BOX[1], C.position.x)),
        cz = Math.max(BOX[2], Math.min(BOX[3], C.position.z));
      H.visible = Math.hypot(C.position.x - cx, C.position.z - cz) < 260;
    }
    syncChests();
    // wardens come back slowly (3 minutes after a win, out of sight)
    WARD.forEach((b) => {
      if (b.dead && b.rt < Infinity && !b.rtx) {
        b.rtx = 1;
        b.rt = Math.max(b.rt, performance.now() + 180000);
      } else if (!b.dead) b.rtx = 0;
    });
    const inside = inR(p.x, p.z);
    if (!inside) {
      if (curA !== -2) {
        curA = -2;
        if (cth) {
          cth = null;
          lastTh = themeKey(p.x, p.z);
          th0(lastTh);
        }
      }
      return;
    }
    const k = areaAt(p.z),
      A = AR[k],
      now = performance.now();
    if (cth !== A.th) {
      th0(A.th);
      cth = A.th;
    }
    lastTh = themeKey(p.x, p.z); // so walk() doesn't put Frostfen's look back
    if (typeof WX !== "undefined" && WX) WX.visible = false;
    const incamp = Math.hypot(p.x - CAMP[0], p.z - CAMP[1]) < CAMP[2] + 1;
    if (incamp) plate("Wayfarer's Rest", "The Starfall Reach  ·  Safe zone");
    else plate(A.n, A.sub + "  ·  Lv " + A.lv + (k === 3 ? "" : "-" + (A.lv + 1)));
    curA = k;
    // wards
    for (let j = 1; j < AR.length; j++) {
      const w = WARDS[j],
        open = gateOpen(j);
      w.visible = !open;
      if (!open) w.material.opacity = 0.36 + 0.14 * S2(s * 2.4 + j);
      const G = AR[j].gate;
      if (!open && mode === "explore" && Math.abs(p.x - G.x) < G.hw + 1 && Math.abs(p.z - G.zm) < 3.5 && now > wardT) {
        wardT = now + 4000;
        const pv = AR[j - 1],
          need = [];
        if (!st().w[j - 1]) need.push("defeat " + pv.b.n);
        if (P.lvl < AR[j].need) need.push("reach Lv " + AR[j].need);
        toast("A ward of starlight bars the way to " + AR[j].n + ": " + need.join(" and ") + ".", "#c9b8ff");
      }
    }
    // pulsing glows, the star's slow turn
    const pu = 0.8 + 0.3 * S2(s * 2.2);
    GLOWI.forEach((m) => (m.material.emissiveIntensity = pu));
    if (CORE) {
      CORE.rotation.y = s * 0.4;
      CORE.position.y = 4.2 + S2(s * 1.3) * 0.35;
    }
    // chests
    if (mode !== "explore" || paused) return;
    let near = null;
    for (const c of CH) {
      if (c.open) continue;
      const dd = Math.hypot(p.x - c.x, p.z - c.z);
      if (dd < 2.8) near = c;
      else if (dd < 8 && now > nearT) {
        nearT = now + 9000;
        toast("Something glints in the grass: a chest (press E beside it)", "#ffd27a");
      }
      c.gl.scale.setScalar(3.2 + S2(s * 6) * 0.5);
    }
    REACH.nearCh = near;
    if (near) {
      const el = window.__pe;
      if (el) {
        if (!peHooked) {
          peHooked = 1;
          el.addEventListener("click", () => {
            if (REACH.nearCh) eT = performance.now();
          });
        }
        el.style.display = "block";
        el.textContent = "Press E to open the chest";
      }
      if (now - eT < 400) {
        eT = 0;
        openC(near);
      }
    }
  }

  // ---------- the news: once the Reach opens for you ----------
  setInterval(() => {
    try {
      if (typeof SLOT === "undefined" || SLOT < 0 || mode !== "explore") return;
      if (!P.done || !P.done[7] || P.lvl < 10) return;
      const s = st();
      if (s.an) return;
      s.an = 1;
      sv();
      toast(
        "Old Maud: \"Something's shining past Mirewick's east edge, dearie. A gate made of starlight.\"",
        "#9affc8",
      );
      setTimeout(() => toast("The Starfall Reach is open: Mirewick, east rim (Lv 10-20)", "#ffd34d"), 2500);
    } catch (e) {}
  }, 2000);

  // ---------- console helpers ----------
  REACH.go = (k) => {
    k = k | 0;
    if (k <= 0) return tp({ to: [CAMP[0], CAMP[1] + 10, PI] });
    const A = AR[Math.min(3, k - 1)],
      c = A.C[0];
    tp({ to: [c[0], c[1] + c[2] - 6, PI] });
  };
})();
