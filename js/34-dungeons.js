// DUSKWICK - 34-dungeons.js (v27): three street dungeons, one per zone.
//   Rimehollow Caves (Frostfen, door in the side clearing of Frozen Lake Way), The Sunken Forge (Cinderwaste, Ember
//   Steps) and The Drowned Crypt (Mirewick, Drowned Row). Each is two halls of themed foes, a ward over the corridor to
//   the deep hall that breaks once both halls are clear, a boss with its own model, moveset, weaknesses and lines, and a
//   treasure chest that appears when the boss falls. Exits lead back to the street door.
// How it fits in without touching other files:
//   - The interiors stand far out in open "frost"/"ember" ground (x = +-1700 / 2300, z = -1700), NOT at z > 300, so none
//     of the old DUN code (dunIdx, the dungeon camera clamp, frame/gather's DUN branches) ever sees them.
//   - Walkable via window.__edWalk (okp asks it first), wrapped here.
//   - Foes are ordinary world foes appended to `foes` (fixed order, after every other file's foes). Each hall's foes
//     share f.tw = 9000 + 10 * dungeon + hall, so they never respawn on the street timer, never roll elites, and 28's
//     patrol rewrite skips them. f.d2 = dungeon, f.d2r = hall. gather / frame / fight are wrapped for them.
//   - Look: TH gets dunF / dunE / dunM (dungeon lighting); theme / ambient are wrapped so the dungeon look, the name
//     plate and no-weather hold while you are inside.
//   - Bosses are foe kinds dkb0..dkb2 (mkFoe, animBeast/animGloom, newFoe, FMV.kit, WKT, wkName wrapped).
// Progress: P.dun2[d] = times cleared (made on first use; first clear pays a bonus). Console helpers: DUN2.go(d) puts
// you at a street door, DUN2.enter(d) inside. Only top-level name: DUN2.
const DUN2 = {};
(() => {
  const PI = Math.PI,
    S2 = Math.sin;
  // ---------- small helpers (same conventions as 27/33) ----------
  const grp = (par, x, y, z) => {
    const q = new T.Group();
    q.position.set(x || 0, y || 0, z || 0);
    par.add(q);
    return q;
  };
  function part(u, par, geo, c, x, y, z, glow, gi) {
    const m = mk(geo, c, x, y, z, glow ? 1 : 0);
    if (glow) {
      m.material.emissive.setHex(glow);
      m.material.emissiveIntensity = gi || 1;
      if (u) u.gm.push(m.material);
    }
    par.add(m);
    return m;
  }
  const rot = (m, x, y, z) => {
    m.rotation.set(x || 0, y || 0, z || 0);
    return m;
  };
  const gsp = (par, c, s, x, y, z) => {
    const sp = new T.Sprite(AM(GLT));
    sp.material.color.setHex(c);
    sp.scale.setScalar(s);
    sp.position.set(x || 0, y || 0, z || 0);
    par.add(sp);
    return sp;
  };
  const flame = (c, op) =>
    new T.MeshBasicMaterial({
      color: c,
      transparent: true,
      opacity: op || 0.6,
      blending: T.AdditiveBlending,
      depthWrite: false,
    });
  // shared emissive materials for scenery (shared so bake() merges them)
  const EMC = {};
  const emat = (c, e, i) => {
    const k = c + ":" + e + ":" + (i || 1);
    if (EMC[k]) return EMC[k];
    const m = M(c, 1);
    m.emissive.setHex(e);
    m.emissiveIntensity = i || 1;
    return (EMC[k] = m);
  };
  const sm = (par, geo, mat, x, y, z) => {
    const m = new T.Mesh(geo, typeof mat === "number" ? M(mat) : mat);
    m.position.set(x || 0, y || 0, z || 0);
    par.add(m);
    return m;
  };
  // fixed-seed stream for scenery (world generation stays deterministic)
  let sd = 34027;
  const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647,
    r2 = (a, b) => a + rn() * (b - a);
  function label(txt, col) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const x = c.getContext("2d");
    x.font = "800 38px Georgia,serif";
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
    sp.scale.set(5.6, 1.05, 1);
    sp.renderOrder = 3;
    return sp;
  }
  const SWT = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d"),
      gr = x.createRadialGradient(128, 128, 0, 128, 128, 126);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.55, "rgba(200,190,255,.75)");
    gr.addColorStop(1, "rgba(80,60,160,0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, 256, 256);
    x.translate(128, 128);
    x.strokeStyle = "rgba(20,10,40,.55)";
    x.lineWidth = 9;
    for (let a = 0; a < 4; a++) {
      x.beginPath();
      for (let t = 0; t < 1; t += 0.02) {
        const r = t * 124,
          an = (a * PI) / 2 + t * 7;
        x.lineTo(Math.cos(an) * r, Math.sin(an) * r);
      }
      x.stroke();
    }
    return new T.CanvasTexture(c);
  })();
  // a swirling door (PT entry: walk() teleports you when you step into it)
  function swirl(x, y, z, ry, col, r, n, to, lock, on) {
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
      on,
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
  // ---------- themes (keys start with "dun": dungeon lighting, short fog, no mountain ring) ----------
  TH.dunF = [0x0e1a2c, "linear-gradient(#02050c,#0a1a30 60%,#1a3a5a)", 0xc8e8ff, 0x1a2a40, 0x9ad8ff];
  TH.dunE = [0x1e0c06, "linear-gradient(#080201,#2a0e04 60%,#6a2208)", 0xffb070, 0x2a1208, 0xff7a2a];
  TH.dunM = [0x0a1a14, "linear-gradient(#020806,#08201a 60%,#14403a)", 0x9fe8c8, 0x14261e, 0x6affc0];
  // ---------- the three dungeons ----------
  // f: [hall, kind, tier, dx, dz, hc]; g: boss-hall guards [kind, tier, dx, hc]; foe level = lv, boss lv + 1
  const MARSHOK = (k) => {
    try {
      return typeof RDX !== "undefined" && RDX.isMine && RDX.isMine(k);
    } catch (e) {
      return false;
    }
  };
  // marsh foes come from 33-roads.js; if a kind is ever missing there, a moss-green gloom stands in
  const mf = (h, k, t, dx, dz) => (MARSHOK(k) ? [h, k, t, dx, dz] : [h, "gloom", t, dx, dz, 0x2e7a3a]),
    mg = (k, t, dx) => (MARSHOK(k) ? [k, t, dx] : ["gloom", t, dx, 0x2e7a3a]);
  const DD = [
    {
      n: "Rimehollow Caves",
      zk: "frost",
      st: "Frozen Lake Way",
      lv: 5,
      bx: 1700,
      bz: -1700,
      col: 0x8ad0ff,
      floor: 0xa8bcd4,
      wall: 0x3e5a7e,
      vd: 0x050a14,
      th: "dunF",
      tc: "#bfe6ff",
      rr: [16, 17, 19],
      f: [
        [0, "fgolem", 3, -5, -4],
        [0, "gnome", 2, 5, -5, 0x6ab0ff],
        [1, "wolf", 3, -6, 1],
        [1, "gnome", 3, 6, -1, 0x6ab0ff],
        [1, "fgolem", 3, 0, -7],
      ],
      g: [
        ["gnome", 3, -6, 0x6ab0ff],
        ["wolf", 3, 6],
      ],
      b: {
        n: "Skarn the Hoarfrost Wyrm",
        hp: 560,
        wk: { fire: WK_W, storm: WK_W, ice: WK_R },
        say: [
          "Little warm thing... you have walked into my winter.",
          "Every lamp that came down here is ice now. Yours will be too.",
        ],
        die: "The cold... lets go... of me...",
        ward: "The frost ward cracks and falls away. The deep cave is open!",
      },
    },
    {
      n: "The Sunken Forge",
      zk: "ember",
      st: "Ember Steps",
      lv: 6,
      bx: -1700,
      bz: -1700,
      col: 0xff8a3d,
      floor: 0x6a4a40,
      wall: 0x2e1c18,
      vd: 0x0a0402,
      th: "dunE",
      tc: "#ffc08a",
      rr: [16, 17, 19],
      f: [
        [0, "lgolem", 4, -5, -4],
        [0, "hound", 3, 5, -5],
        [1, "phoenix", 4, -6, 1],
        [1, "hound", 3, 6, -1],
        [1, "lgolem", 4, 0, -7],
      ],
      g: [
        ["phoenix", 4, -6],
        ["hound", 4, 6],
      ],
      b: {
        n: "Hargrim the Last Forgemaster",
        hp: 650,
        wk: { ice: WK_W, storm: WK_W, fire: WK_R },
        say: [
          "The fires of the deep forge burn for no one but me. Get out of my smithy!",
          "I'll beat you flat on my anvil and quench you in slag!",
        ],
        die: "The forge... goes... cold...",
        ward: "The cinder ward gutters out. The deep forge is open!",
      },
    },
    {
      n: "The Drowned Crypt",
      zk: "marsh",
      st: "Drowned Row",
      lv: 7,
      bx: 2300,
      bz: -1700,
      col: 0x6affc0,
      floor: 0x4a5a4e,
      wall: 0x223028,
      vd: 0x030806,
      th: "dunM",
      tc: "#a8ffd8",
      rr: [16, 17, 19],
      f: [
        mf(0, "skel", 2, -5, -4),
        mf(0, "bogl", 2, 5, -5),
        mf(1, "mwisp", 3, -6, 1),
        mf(1, "skel", 3, 6, -1),
        mf(1, "bogm", 3, 0, -7),
        [1, "gloom", 3, 0, 4, 0x2e7a3a],
      ],
      g: [mg("skel", 3, -6), mg("mwisp", 3, 6)],
      b: {
        n: "The Drowned Abbess",
        hp: 740,
        wk: { fire: WK_W, heal: WK_W, spirit: WK_R },
        say: [
          "Hush, child. The bells rang for you long ago. Come down and rest with us.",
          "The water is cold only for a moment...",
        ],
        die: "The bells... are... silent...",
        ward: "The drowned ward sinks away. The deep crypt is open!",
      },
    },
  ];
  DUN2.list = DD;
  // ---------- layout: three round halls in a row going north, joined by corridors (like the v14 dungeons) ----------
  DD.forEach((D, d) => {
    D.i = d;
    D.cw = 4;
    const en = (r) => Math.sqrt((r + 0.6) ** 2 - D.cw * D.cw),
      GL = 14,
      [r0, r1, r2_] = D.rr,
      z1 = D.bz - (en(r0) + GL + en(r1)),
      z2 = z1 - (en(r1) + GL + en(r2_));
    D.R = [
      [D.bx, D.bz, r0],
      [D.bx, z1, r1],
      [D.bx, z2, r2_],
    ];
    D.C = [
      [D.bz - en(r0) + 0.3, z1 + en(r1) - 0.3],
      [z1 - en(r1) + 0.3, z2 + en(r2_) - 0.3],
    ];
    D.ez = D.bz + r0 - 5.5; // where the door drops you
    D.bb = [D.bx - r2_ - 3, D.bx + r2_ + 3, z2 - r2_ - 3, D.bz + r0 + 3]; // x0, x1, z0, z1
    D.open = false;
    D.fs = [];
    D.chestOpen = 0;
    // the street door: on the far rim of the street's side clearing (t.pk), facing the clearing
    const t = ZRD.find((q) => q.n === D.st) || ZRD.find((q) => q.n && q.zk === D.zk);
    D.t = t;
    const [px, pz, pr] = t.pk;
    D.door = [px, pz - pr + 0.3];
    D.out = [px, pz - pr + 5.6, 0];
  });
  const inB = (D, x, z) => x > D.bb[0] && x < D.bb[1] && z > D.bb[2] && z < D.bb[3];
  const dAt = (x, z) => {
    for (let i = 0; i < DD.length; i++) if (inB(DD[i], x, z)) return i;
    return -1;
  };
  DUN2.at = dAt;
  function walkIn(D, x, z) {
    for (const [cx, cz, r] of D.R) if (Math.hypot(x - cx, z - cz) <= r - 0.6) return true;
    if (Math.abs(x - D.bx) > D.cw - 0.7) return false;
    if (z < D.C[0][0] + 1.5 && z > D.C[0][1] - 1.5) return true;
    if (z < D.C[1][0] + 1.5 && z > D.C[1][1] - 1.5) return D.open || z > D.C[1][0] - 1.4;
    return false;
  }
  {
    const ew0 = window.__edWalk;
    window.__edWalk = (x, z) => {
      if (ew0 && ew0(x, z)) return true;
      const d = dAt(x, z);
      return d >= 0 && walkIn(DD[d], x, z);
    };
  }
  // ---------- building the interiors ----------
  const cobT = {};
  const cob = (n) => cobT[n] || (cobT[n] = cobble(n));
  function decor(D, o, r, k) {
    // themed dressing around the walls of hall k (o is centred on the hall)
    const zk = D.zk;
    for (let p = 0; p < 10; p++) {
      const a = (p / 10) * 6.283 + 0.3;
      if (Math.abs(Math.cos(a)) > 0.75) continue;
      const px = Math.sin(a) * (r - 1.8),
        pz = Math.cos(a) * (r - 1.8),
        q = grp(o, px, 0, pz);
      q.rotation.y = a;
      if (zk === "frost") {
        if (p % 2) {
          [
            [0, 0, 2.1],
            [0.45, 0.2, 1.4],
            [-0.4, 0.1, 1.6],
            [0.15, -0.4, 1.1],
            [-0.2, 0.45, 0.9],
          ].forEach(([X, Z, h], j) => {
            const m = sm(q, new T.OctahedronGeometry(0.45, 0), emat(0x9fe0ff, 0x2a6aa8, 0.6), X, h * 0.55, Z);
            m.scale.set(0.6, h, 0.6);
            m.rotation.y = j;
          });
        } else {
          sm(q, Sp(1, 10), 0xe6eef8, 0, -0.25, 0).scale.set(1.3, 0.55, 1.1);
          sm(q, Sp(0.6, 8), 0xffffff, 0.5, 0, 0.2).scale.set(1, 0.6, 1);
        }
      } else if (zk === "ember") {
        if (p % 3 === 0) {
          // anvil on a block
          sm(q, B(1.0, 0.7, 0.8), 0x3a3034, 0, 0.35, 0);
          sm(q, B(1.3, 0.25, 0.6), 0x2a2428, 0, 0.82, 0);
          sm(q, Cn(0.3, 0.6, 4), 0x2a2428, 0.9, 0.82, 0).rotation.z = -PI / 2;
          sm(q, B(0.5, 0.08, 0.2), emat(0xff8a3a, 0xff4a0a, 1.2), 0.1, 0.98, 0);
        } else if (p % 3 === 1) {
          // brazier
          sm(q, Cy(0.55, 0.35, 0.9, 10), 0x2a2024, 0, 0.45, 0);
          sm(q, Cy(0.5, 0.5, 0.12, 10), emat(0xff6a1a, 0xff3a0a, 1.4), 0, 0.92, 0);
          sm(q, Cn(0.35, 0.9, 7), flame(0xff9a3a, 0.55), 0, 1.4, 0);
          gsp(q, 0xff7a3a, 3, 0, 1.3, 0);
        } else {
          // collapsed beam and rubble
          rot(sm(q, B(0.4, 0.4, 3.2), 0x2a1a12, 0, 0.6, 0), 0.35, 0, 0.2);
          [
            [0.5, 0.2],
            [-0.6, -0.5],
            [0.2, -0.9],
          ].forEach(([X, Z]) => sm(q, new T.DodecahedronGeometry(0.4, 0), 0x4a3a36, X, 0.25, Z));
        }
      } else {
        if (p % 2) {
          // sarcophagus
          sm(q, B(1.2, 0.8, 2.3), 0x5a6a60, 0, 0.4, 0);
          sm(q, B(1.35, 0.18, 2.45), 0x46564c, 0, 0.88, 0);
          sm(q, Sp(0.3, 8), 0x3a6a3a, 0.3, 1.0, 0.6).scale.set(1, 0.5, 1);
          sm(q, Cy(0.05, 0.05, 0.3, 5), 0xe8e0c8, -0.4, 1.12, -0.7);
          sm(q, Sp(0.07, 6), emat(0xc8ffd8, 0x5affb0, 1.4), -0.4, 1.32, -0.7);
        } else {
          // headstones over a murky puddle
          sm(q, B(0.8, 1.1, 0.22), 0x6a7a70, 0, 0.55, 0);
          sm(q, Cy(0.4, 0.4, 0.22, 10, 1), 0x6a7a70, 0, 1.1, 0).rotation.x = PI / 2;
          sm(q, B(0.6, 0.8, 0.2), 0x5a6a60, 0.9, 0.4, 0.4).rotation.z = 0.25;
          const w = sm(
            q,
            new T.CircleGeometry(1.2, 16),
            new T.MeshBasicMaterial({ color: 0x1a4a3a, transparent: true, opacity: 0.75, depthWrite: false }),
            -0.2,
            0.07,
            -0.9,
          );
          w.rotation.x = -PI / 2;
        }
      }
      solids.push({ x: o.position.x + px, z: o.position.z + pz, r: 1.2 });
    }
    // a few floor features near the middle (kept off the centre where the battle stands)
    if (zk === "frost") {
      const ice = new T.MeshBasicMaterial({ color: 0xbfe4f8, transparent: true, opacity: 0.55, depthWrite: false });
      [
        [-r * 0.45, -r * 0.2],
        [r * 0.4, r * 0.3],
      ].forEach(([X, Z]) => (sm(o, new T.CircleGeometry(2.4, 20), ice, X, 0.07, Z).rotation.x = -PI / 2));
    } else if (zk === "ember") {
      const lava = emat(0xff6a1a, 0xff3a0a, 1.3);
      for (let j = 0; j < 4; j++) {
        const a = j * 1.57 + 0.6 + k,
          m = sm(o, B(0.25, 0.06, r * 0.5), lava, Math.sin(a) * r * 0.55, 0.06, Math.cos(a) * r * 0.55);
        m.rotation.y = a + 0.4;
      }
    } else {
      const mud = new T.MeshBasicMaterial({ color: 0x163a2e, transparent: true, opacity: 0.7, depthWrite: false });
      [
        [-r * 0.5, r * 0.15],
        [r * 0.45, -r * 0.25],
        [r * 0.1, r * 0.55],
      ].forEach(([X, Z]) => (sm(o, new T.CircleGeometry(2 + rn(), 18), mud, X, 0.07, Z).rotation.x = -PI / 2));
    }
  }
  function pillar(D, o, x, z) {
    // a column by the wall with a torch facing the middle (x, z are relative to o)
    const zk = D.zk,
      a = Math.atan2(x, z),
      ix = -Math.sin(a) * 0.7,
      iz = -Math.cos(a) * 0.7;
    if (zk === "frost") {
      sm(o, Cy(0.55, 0.75, 6.5, 8), 0x9ab8d8, x, 3.25, z);
      sm(o, new T.OctahedronGeometry(0.6, 0), emat(0xdff4ff, 0x3a8ad8, 0.8), x, 6.9, z).scale.set(1, 1.6, 1);
    } else if (zk === "ember") {
      sm(o, Cy(0.6, 0.7, 6.5, 8), D.wall, x, 3.25, z);
      [1.4, 4.6].forEach((y) => sm(o, Cy(0.68, 0.68, 0.22, 8), 0x5a4a44, x, y, z));
    } else {
      sm(o, Cy(0.55, 0.7, 6.5, 8), D.wall, x, 3.25, z);
      sm(o, Sp(0.5, 8), 0x2e5a3a, x + ix * 0.4, 5.6, z + iz * 0.4).scale.set(1.3, 0.5, 1.3);
    }
    sm(o, B(0.3, 0.4, 0.3), 0x2a2438, x + ix * 0.95, 4.6, z + iz * 0.95);
    gsp(o, D.col, 2.4, x + ix, 5, z + iz);
  }
  function buildInside(D) {
    const fm = new T.MeshLambertMaterial({ map: cob(5), color: D.floor }),
      wm = new T.MeshLambertMaterial({ map: cob(8), color: D.wall, side: T.BackSide }),
      cwm = new T.MeshLambertMaterial({ map: cob(4), color: D.wall });
    const zMid = (D.bb[2] + D.bb[3]) / 2,
      gnd = new T.Mesh(
        new T.PlaneGeometry(D.bb[1] - D.bb[0] + 60, D.bb[3] - D.bb[2] + 60),
        new T.MeshBasicMaterial({ color: D.vd }),
      );
    gnd.rotation.x = -PI / 2;
    gnd.position.set(D.bx, -0.45, zMid);
    S.add(gnd);
    D.R.forEach(([x, z, r], k) => {
      const fl = new T.Mesh(Cy(r + 0.7, r + 0.7, 0.4, 40), fm);
      fl.position.set(x, -0.15, z);
      S.add(fl);
      const gh = Math.asin(D.cw / (r + 0.6)),
        segs =
          k === 0
            ? [[PI + gh, 2 * PI - 2 * gh]]
            : k === 2
              ? [[gh, 2 * PI - 2 * gh]]
              : [
                  [gh, PI - 2 * gh],
                  [PI + gh, PI - 2 * gh],
                ];
      segs.forEach(([a, l]) => {
        const w = new T.Mesh(new T.CylinderGeometry(r + 0.6, r + 0.6, 8, 40, 1, true, a, l), wm);
        w.position.set(x, 4, z);
        S.add(w);
      });
      const o = new T.Group();
      o.position.set(x, 0, z);
      for (let p = 0; p < 8; p++) {
        const a = ((p + 0.5) / 8) * 6.283;
        if (Math.abs(Math.cos(a)) > 0.8) continue;
        const px = Math.sin(a) * (r - 0.3),
          pz = Math.cos(a) * (r - 0.3);
        pillar(D, o, px, pz);
        solids.push({ x: x + px, z: z + pz, r: 0.8 });
        cb(x + px, z + pz, 0.7, 6.5);
      }
      const rg = new T.Mesh(
        new T.RingGeometry(r * 0.5, r * 0.5 + 0.35, 48),
        new T.MeshBasicMaterial({
          color: D.col,
          transparent: true,
          opacity: 0.35,
          side: T.DoubleSide,
          depthWrite: false,
        }),
      );
      rg.rotation.x = -PI / 2;
      rg.position.set(0, 0.08, 0);
      o.add(rg);
      decor(D, o, r, k);
      S.add(bake(o));
    });
    D.C.forEach(([z1, z2]) => {
      const L = z1 - z2 + 1.4,
        zc = (z1 + z2) / 2,
        H = D.cw,
        o = new T.Group();
      o.position.set(D.bx, 0, zc);
      sm(o, B(H * 2 + 0.2, 0.4, L), fm, 0, -0.15, 0);
      [-1, 1].forEach((s) => {
        const w = sm(o, new T.PlaneGeometry(L, 6), cwm, s * (H + 0.05), 3, 0);
        w.rotation.y = (-s * PI) / 2;
        for (let zz = z2; zz <= z1; zz += 2) cb(D.bx + s * (H + 0.6), zz, 0.7, 6);
        for (let zz = z2 + 2.5; zz < z1 - 1; zz += 5) {
          sm(o, B(0.2, 0.5, 0.2), 0x2a2438, s * (H - 0.1), 3, zz - zc);
          gsp(o, D.col, 1.8, s * (H - 0.3), 3.3, zz - zc);
        }
      });
      [z1, z2].forEach((zz) => sm(o, B(H * 2 + 0.8, 0.8, 0.9), D.wall, 0, 5.7, zz - zc));
      S.add(bake(o));
    });
    // the ward over the corridor to the deep hall
    D.seal = new T.Mesh(
      new T.PlaneGeometry(D.cw * 2, 5.6),
      new T.MeshBasicMaterial({
        color: D.col,
        transparent: true,
        opacity: 0.5,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    D.seal.position.set(D.bx, 2.8, D.C[1][0] - 1.6);
    S.add(D.seal);
    // ways out: by the entrance (always open) and behind the boss (once it has fallen)
    const [, , r0] = D.R[0],
      [, z2, r2_] = D.R[2];
    swirl(D.bx, 2.2, D.bz + r0 - 0.6, PI, D.col, 1.6, "Leave " + D.n, D.out.slice());
    swirl(D.bx, 2.2, z2 - r2_ + 1, 0, D.col, 1.8, "Leave " + D.n, D.out.slice(), () =>
      D.bossF && !D.bossF.dead ? "Defeat " + D.b.n + " to open the way out." : null,
    );
    // the safe landing by the entrance
    SAFEC.push([D.bx, D.ez + 1, 4.5]);
    safeRing(D.bx, D.ez + 1, 4.5);
    // the boss's treasure chest (shown once the boss is down)
    const c = new T.Group(),
      wood = D.zk === "frost" ? 0x6a6a8a : D.zk === "ember" ? 0x3a2a24 : 0x4a3a2a,
      gold = 0xd8b04a;
    sm(c, B(1.4, 0.7, 0.9), wood, 0, 0.35, 0);
    [0.15, 0.6].forEach((y) => sm(c, B(1.46, 0.1, 0.94), gold, 0, y, 0));
    const lid = grp(c, 0, 0.7, -0.45);
    sm(lid, B(1.42, 0.32, 0.92), wood, 0, 0.16, 0.45);
    sm(lid, B(1.48, 0.08, 0.96), gold, 0, 0.3, 0.45);
    sm(c, B(0.22, 0.26, 0.08), emat(0xffd84a, 0xffa020, 0.8), 0, 0.62, 0.47);
    const cgl = gsp(c, 0xffd27a, 3.2, 0, 0.9, 0);
    c.position.set(D.bx, 0, z2 - r2_ + 5.5);
    c.visible = false;
    S.add(c);
    D.ch = { o: c, lid, gl: cgl, x: D.bx, z: z2 - r2_ + 5.5 };
  }
  function buildDoor(D) {
    const [px, dz] = D.door,
      o = new T.Group(),
      zk = D.zk;
    o.position.set(px, 0, dz);
    // the mound the door is cut into
    const mc = zk === "frost" ? 0xe2eaf4 : zk === "ember" ? 0x3a2a26 : 0x3e4a32;
    sm(o, Sp(1, 14), mc, 0, -0.6, -4.2).scale.set(7.5, 5.2, 4.6);
    if (zk === "frost") {
      // an arch of ice blocks with icicles
      [-1, 1].forEach((s) => {
        for (let k = 0; k < 4; k++)
          rot(sm(o, B(1.1, 1.05, 1.1), 0xbfe0f4, s * 2.3, 0.55 + k * 1.05, 0), 0, 0.15 * (k % 2 ? 1 : -1), 0);
        solids.push({ x: px + s * 2.3, z: dz, r: 0.75 });
      });
      sm(o, B(5.8, 1, 1.3), 0xd8eeff, 0, 4.6, 0);
      for (let k = 0; k < 7; k++)
        rot(sm(o, Cn(0.14, 0.7 + (k % 3) * 0.3, 5), emat(0xdff4ff, 0x3a8ad8, 0.5), -2.4 + k * 0.8, 3.8, 0.45), PI);
      sm(o, new T.OctahedronGeometry(0.5, 0), emat(0x9fe0ff, 0x2a6aa8, 0.9), 0, 5.5, 0.2).scale.set(1, 1.7, 1);
    } else if (zk === "ember") {
      // a mine adit: timber posts and lintel, rocks around, rails leading out
      [-1, 1].forEach((s) => {
        sm(o, B(0.45, 4.4, 0.45), 0x4a2e1a, s * 2.2, 2.2, 0);
        solids.push({ x: px + s * 2.2, z: dz, r: 0.6 });
        for (let k = 0; k < 3; k++)
          sm(o, new T.DodecahedronGeometry(0.75, 0), 0x4a3a36, s * (3.2 + k * 0.5), 0.5 + k * 1.1, -0.4);
      });
      sm(o, B(5.4, 0.5, 0.55), 0x4a2e1a, 0, 4.5, 0);
      rot(sm(o, B(0.3, 0.3, 2.6), 0x3a2414, 1.2, 4.9, -0.3), 0, 0.5, 0.2);
      [-0.6, 0.6].forEach((x) => sm(o, B(0.12, 0.08, 5.2), 0x6a6a72, x, 0.08, 2.4));
      for (let k = 0; k < 6; k++) sm(o, B(1.6, 0.06, 0.25), 0x3a2414, 0, 0.05, 0.4 + k * 0.9);
      sm(o, Cy(0.18, 0.18, 0.35, 8), emat(0xffb060, 0xff7a2a, 1.4), 2.2, 3.6, 0.35);
      gsp(o, 0xff8a3a, 2.6, 2.2, 3.6, 0.5);
    } else {
      // a crypt facade: stone front, columns, a pediment and a green lamp
      sm(o, B(7, 4.6, 0.8), 0x4a564e, 0, 2.3, -0.5);
      [-1, 1].forEach((s) => {
        sm(o, Cy(0.35, 0.42, 4.4, 8), 0x6a766e, s * 2.5, 2.2, 0.2);
        solids.push({ x: px + s * 2.5, z: dz + 0.2, r: 0.55 });
      });
      const pd = sm(o, Cn(4.2, 1.6, 4), 0x5a665e, 0, 5.4, -0.3);
      pd.rotation.y = PI / 4;
      pd.scale.set(1, 1, 0.25);
      sm(o, Sp(0.35, 8), 0xe8e0c8, 0, 4.9, 0.2);
      [
        [-0.12, 0.1],
        [0.12, 0.1],
      ].forEach(([x, y]) => sm(o, Sp(0.07, 6), emat(0x9affd0, 0x5affb0, 1.6), x, 4.9 + y, 0.5));
      for (let k = 0; k < 5; k++) sm(o, Cy(0.03, 0.03, 0.8 + (k % 2) * 0.5, 4), 0x2e4a2a, -3 + k * 1.5, 4.2, 0.0);
      sm(o, Sp(0.2, 8), emat(0xc8ffd8, 0x5affb0, 1.4), -2.5, 3.3, 0.7);
      gsp(o, 0x6affc0, 2.6, -2.5, 3.3, 0.8);
    }
    S.add(bake(o));
    const lab = label(D.n.toUpperCase() + "  ·  Lv " + D.lv, D.tc);
    lab.position.set(px, 6.6, dz + 0.4);
    S.add(lab);
    D.doorPT = swirl(
      px,
      2.2,
      dz + 0.3,
      0,
      D.col,
      1.6,
      D.n + " (dungeon, Lv " + D.lv + ")",
      [D.bx, D.ez, PI],
      () => (P.lvl < D.lv ? "The way in will not open for you yet. Reach level " + D.lv + "." : null),
      () => reset(D),
    );
  }
  DD.forEach((D) => {
    buildInside(D);
    buildDoor(D);
  });
  // ================= boss models =================
  function base(o, opt) {
    const u = o.userData;
    Object.assign(
      u,
      { gl: 1, d2m: 1, gm: [], arms: [], lg: [], spin: [], ph: Math.random() * 6, y0: 1, fl: 0, h: 3 },
      opt,
    );
    return u;
  }
  function mWyrm() {
    const o = new T.Group(),
      u = base(o, { y0: 1.5, h: 3.6 }),
      sc = 0xd8e8f8,
      ic = 0x9fe0ff;
    [
      [-0.7, 0.9, 1],
      [0.7, 0.9, 1],
      [-0.7, -0.9, 0],
      [0.7, -0.9, 0],
    ].forEach(([x, z, fr]) => {
      const l = grp(o, x, 1.5, z);
      part(u, l, Cy(0.22, 0.15, 1.4, 7), sc, 0, -0.7, 0);
      part(u, l, Sp(0.24, 8), 0xb8cce0, 0, -1.4, 0.08).scale.set(1, 0.6, 1.3);
      [-1, 0, 1].forEach((k) => rot(part(u, l, Cn(0.05, 0.22, 4), 0x2a3a5a, k * 0.12, -1.45, 0.38), PI / 2));
      (fr ? u.arms : u.lg).push(l);
    });
    const bd = (u.bd = grp(o, 0, u.y0, 0));
    part(u, bd, Sp(0.95, 14), sc, 0, 0, 0).scale.set(1, 0.85, 1.8);
    part(u, bd, Sp(0.8, 12), 0xa8c8e0, 0, -0.25, 0.3).scale.set(0.95, 0.7, 1.5);
    for (let i = 0; i < 7; i++)
      rot(part(u, bd, Cn(0.18, 0.7 + (i % 3) * 0.25, 5), ic, 0, 0.75, 1.3 - i * 0.42, 0x3a8ad8, 0.8), -0.5);
    // neck and head
    rot(part(u, bd, Cy(0.38, 0.55, 1.2, 8), sc, 0, 0.55, 1.55), 0.9);
    const hd = (u.hd = grp(bd, 0, 1.0, 2.05));
    part(u, hd, Sp(0.5, 12), sc, 0, 0, 0).scale.set(1, 0.8, 1.3);
    part(u, hd, B(0.5, 0.3, 0.7), 0xc8dcef, 0, -0.05, 0.6);
    part(u, hd, B(0.44, 0.12, 0.6), 0xa8bcd0, 0, -0.26, 0.52);
    [-1, 1].forEach((e) => {
      part(u, hd, Sp(0.08, 6), 0x3affff, e * 0.22, 0.12, 0.42, 0x2affff, 1.8);
      rot(part(u, hd, Cn(0.09, 0.8, 5), ic, e * 0.28, 0.35, -0.25, 0x3a8ad8, 0.9), -1.1, 0, e * 0.3);
      rot(part(u, hd, Cn(0.04, 0.18, 4), 0xffffff, e * 0.14, -0.22, 0.85), PI);
    });
    gsp(hd, 0x9ad8ff, 1.6, 0, -0.15, 1.0);
    // tail
    const tl = (u.tail = grp(bd, 0, 0.05, -1.65));
    rot(part(u, tl, Cn(0.42, 1.6, 8), sc, 0, 0, -0.75), -PI / 2);
    rot(part(u, tl, Cn(0.2, 1.1, 6), sc, 0, 0.05, -1.9), -PI / 2 + 0.15);
    rot(part(u, tl, new T.OctahedronGeometry(0.28, 0), ic, 0, 0.15, -2.5, 0x3a8ad8, 1), 0, 0.4, 0);
    // three ice shards circling it
    const ss = grp(o, 0, 2.2, 0);
    [0, 1, 2].forEach((k) => {
      const m = part(
        u,
        ss,
        new T.OctahedronGeometry(0.22, 0),
        0xdff4ff,
        Math.cos(k * 2.1) * 1.9,
        k * 0.25,
        Math.sin(k * 2.1) * 1.9,
        0x3a8ad8,
        1.2,
      );
      m.scale.set(0.7, 1.8, 0.7);
    });
    u.spin.push([ss, 1.3]);
    return o;
  }
  function mForge() {
    const o = new T.Group(),
      u = base(o, { y0: 1.3, h: 3.5 }),
      ir = 0x4a4248,
      dk = 0x2a2428;
    [-1, 1].forEach((sd) => {
      const l = grp(o, sd * 0.45, 1.3, 0);
      part(u, l, Cy(0.28, 0.32, 1.0, 8), dk, 0, -0.55, 0);
      part(u, l, B(0.55, 0.3, 0.75), 0x1c181a, 0, -1.15, 0.1);
      u.lg.push(l);
    });
    const bd = (u.bd = grp(o, 0, u.y0, 0));
    part(u, bd, Cy(0.95, 0.85, 1.5, 10), ir, 0, 0.75, 0);
    part(u, bd, Cy(1.0, 1.0, 0.22, 10), 0x5a4a3a, 0, 0.05, 0);
    part(u, bd, B(0.75, 0.6, 0.12), 0xff7a2a, 0, 0.75, 0.88, 0xff4a0a, 1.6);
    for (let k = 0; k < 4; k++) part(u, bd, B(0.08, 0.62, 0.06), dk, -0.27 + k * 0.18, 0.75, 0.95);
    gsp(bd, 0xff7a3a, 2.2, 0, 0.75, 1.0);
    [-1, 1].forEach((sd) => {
      part(u, bd, Sp(0.45, 10), dk, sd * 1.0, 1.4, 0).scale.set(1, 0.75, 1);
      part(u, bd, Cy(0.14, 0.18, 1.0, 8), dk, sd * 0.45, 1.85, -0.6);
      const f = new T.Mesh(Cn(0.2, 0.7, 7), flame(0xff9a3a, 0.6));
      f.position.set(sd * 0.45, 2.6, -0.6);
      bd.add(f);
      gsp(bd, 0xff8a3a, 1.4, sd * 0.45, 2.6, -0.6);
    });
    const hd = (u.hd = grp(bd, 0, 1.85, 0.15));
    part(u, hd, Sp(0.45, 12), dk, 0, 0, 0).scale.set(1, 0.95, 1);
    part(u, hd, B(0.55, 0.08, 0.1), 0xffb060, 0, 0.02, 0.42, 0xff6a1a, 1.8);
    part(u, hd, Cy(0.5, 0.5, 0.08, 12), 0x3a3034, 0, 0.18, 0);
    rot(part(u, hd, Cn(0.3, 0.9, 6), 0xff6a1a, 0, -0.55, 0.3, 0xff3a0a, 1.4), PI + 0.3);
    [-1, 1].forEach((sd) => rot(part(u, hd, Cn(0.08, 0.4, 5), 0x8a7a6a, sd * 0.42, 0.25, 0), 0, 0, -sd * 0.7));
    // right arm: the great hammer; left arm: tongs holding a glowing ingot
    [-1, 1].forEach((sd, n) => {
      const a = grp(bd, sd * 1.25, 1.35, 0);
      part(u, a, Cy(0.2, 0.24, 0.9, 8), ir, 0, -0.45, 0);
      part(u, a, Sp(0.28, 8), dk, 0, -1.0, 0.05);
      if (n) {
        const h = grp(a, 0, -1.05, 0.2);
        rot(part(u, h, Cy(0.07, 0.07, 1.8, 6), 0x4a2e1a, 0, 0, 0.6), PI / 2);
        part(u, h, B(0.55, 0.5, 0.75), dk, 0, 0, 1.5);
        part(u, h, B(0.57, 0.12, 0.77), 0xff6a1a, 0, -0.2, 1.5, 0xff3a0a, 1.2);
      } else {
        const tg = grp(a, 0, -1.1, 0.2);
        [-1, 1].forEach((k) => rot(part(u, tg, Cy(0.03, 0.03, 0.9, 4), dk, k * 0.08, 0, 0.4), PI / 2));
        part(u, tg, B(0.3, 0.14, 0.18), 0xffc060, 0, 0, 0.85, 0xff7a1a, 1.8);
      }
      u.arms.push(a);
    });
    const ss = grp(o, 0, 1.8, 0);
    for (let k = 0; k < 5; k++)
      part(
        u,
        ss,
        Sp(0.07, 5),
        0xffc070,
        Math.cos(k * 1.26) * 1.7,
        (k % 3) * 0.4,
        Math.sin(k * 1.26) * 1.7,
        0xff6a1a,
        1.8,
      );
    u.spin.push([ss, 1.8]);
    return o;
  }
  function mAbbess() {
    const o = new T.Group(),
      u = base(o, { y0: 1.45, fl: 0.22, h: 3.6 }),
      rb = 0x22302a;
    const bd = (u.bd = grp(o, 0, u.y0, 0));
    part(u, bd, Cn(0.95, 2.1, 12), rb, 0, -0.2, 0);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * 6.283;
      rot(part(u, bd, Cn(0.16, 0.5, 4), 0x18221e, Math.cos(a) * 0.82, -1.3, Math.sin(a) * 0.82), PI);
      part(u, bd, B(0.06, 1.2 + (k % 3) * 0.3, 0.02), 0x2e5a2a, Math.cos(a + 0.3) * 0.7, -0.4, Math.sin(a + 0.3) * 0.7);
    }
    part(u, bd, Sp(0.48, 10), rb, 0, 0.85, 0).scale.set(1.25, 0.8, 0.9);
    part(u, bd, B(0.12, 0.7, 0.04), 0xc8a85a, 0, 0.5, 0.42);
    part(u, bd, B(0.36, 0.1, 0.04), 0xc8a85a, 0, 0.7, 0.43);
    const hd = (u.hd = grp(bd, 0, 1.35, 0.05));
    part(u, hd, Sp(0.42, 12), 0x1a2622, 0, 0, 0).scale.set(1, 1.1, 1);
    rot(part(u, hd, Cn(0.3, 0.55, 8), 0x1a2622, 0, 0.42, -0.12), -0.35);
    part(u, hd, Sp(0.3, 10), 0x060a08, 0, -0.04, 0.2).scale.set(1, 1.1, 0.7);
    [-1, 1].forEach((sd) => part(u, hd, Sp(0.06, 6), 0x9affd0, sd * 0.11, 0.02, 0.4, 0x5affb0, 2));
    const halo = grp(hd, 0, 0.15, -0.4);
    part(u, halo, new T.TorusGeometry(0.5, 0.035, 6, 24), 0xc8e8a0, 0, 0, 0, 0x8affa0, 1.2);
    u.spin.push([halo, 0.8]);
    [-1, 1].forEach((sd, n) => {
      const a = grp(bd, sd * 0.6, 0.95, 0.05);
      rot(part(u, a, Cn(0.22, 0.95, 8), rb, 0, -0.42, 0), 0, 0, -sd * 0.12);
      part(u, a, Sp(0.1, 6), 0xd8d0b8, 0, -0.95, 0.05);
      if (n) {
        const b = grp(a, 0, -1.05, 0.1);
        part(u, b, Cy(0.04, 0.04, 0.3, 5), 0x4a3a2a, 0, 0.05, 0);
        part(u, b, Cn(0.22, 0.38, 10), 0x9a7a3a, 0, -0.25, 0);
        part(u, b, Sp(0.06, 6), 0x5a4a2a, 0, -0.45, 0);
      } else {
        const ch = grp(a, 0, -1.0, 0.1);
        for (let k = 0; k < 4; k++)
          rot(
            part(u, ch, new T.TorusGeometry(0.07, 0.02, 4, 8), 0x5a5a62, 0, -0.12 - k * 0.12, 0),
            0,
            k % 2 ? PI / 2 : 0,
            0,
          );
        part(u, ch, Sp(0.14, 8), 0xc8ffd8, 0, -0.65, 0, 0x5affb0, 1.8);
        gsp(ch, 0x6affc0, 1.8, 0, -0.65, 0);
      }
      u.arms.push(a);
    });
    const ss = grp(o, 0, 1.7, 0);
    [0, 1, 2].forEach((k) => {
      part(u, ss, Sp(0.16, 8), 0xe8e0c8, Math.cos(k * 2.1) * 1.6, k * 0.3, Math.sin(k * 2.1) * 1.6);
      part(
        u,
        ss,
        Sp(0.05, 5),
        0x9affd0,
        Math.cos(k * 2.1) * 1.6,
        k * 0.3 + 0.02,
        Math.sin(k * 2.1) * 1.6 + 0.14,
        0x5affb0,
        2,
      );
    });
    u.spin.push([ss, -0.9]);
    return o;
  }
  const BM = [mWyrm, mForge, mAbbess];
  const isB = (k) => /^dkb\d$/.test(k || "") && !!BM[+String(k).slice(3)];
  const mk0 = mkFoe;
  mkFoe = function (kind, t, big, hc) {
    if (!isB(kind)) return mk0(kind, t, big, hc);
    const o = BM[+kind.slice(3)]();
    o.scale.setScalar(1.2 * (big ? 1.2 : 1));
    return o;
  };
  function anim(o, s, m) {
    const u = o.userData,
      j = u.ph,
      bd = u.bd,
      hd = u.hd,
      ph = s * (m ? 7 : 1.2) + j;
    bd.scale.set(1, 1, 1);
    bd.position.y = u.y0 + (u.fl ? S2(s * 2 + j) * u.fl : m ? Math.abs(S2(ph)) * 0.08 : S2(s * 1.6 + j) * 0.03);
    bd.rotation.set(
      m ? 0.08 : 0.02 + S2(s * 0.9 + j) * 0.02,
      m ? 0 : S2(s * 0.5 + j) * 0.08,
      m ? S2(ph) * 0.05 : S2(s * 0.7 + j) * 0.02,
    );
    if (hd) hd.rotation.set(S2(s * 1.1 + j) * 0.07, S2(s * 0.6 + j) * 0.25, S2(s * 0.8 + j) * 0.04);
    u.arms.forEach((a, n) => {
      const sd = n % 2 ? 1 : -1;
      a.rotation.set(
        m ? S2(ph + n * PI) * 0.55 : S2(s * 1.2 + j + n) * 0.06,
        0,
        sd * (u.fl ? 0.15 + S2(s * 1.5 + j) * 0.08 : 0.06),
      );
    });
    u.lg.forEach((l, n) => (l.rotation.x = m ? S2(ph + n * PI + PI / 2) * 0.5 : 0));
    if (u.tail) u.tail.rotation.set(S2(s * 2 + j) * 0.1, S2(s * (m ? 8 : 2.5) + j) * 0.35, 0);
    u.spin.forEach(([q, v]) => (q.rotation.y = s * v + j));
    const pu = 0.75 + 0.35 * S2(s * 3 + j);
    u.gm.forEach((mt) => (mt.emissiveIntensity = pu * 1.2));
  }
  const ab0 = animBeast,
    ag0 = animGloom;
  animBeast = function (o, s, m) {
    const u = o && o.userData;
    if (u && u.d2m) {
      if (u.frz) return;
      anim(o, s, m);
      if (u.fp) FMV.over(o);
      return;
    }
    ab0(o, s, m);
  };
  animGloom = function (o, s, m, i) {
    const u = o && o.userData;
    if (u && u.d2m) {
      if (u.frz) return;
      anim(o, s, m);
      if (u.fp) FMV.over(o);
      return;
    }
    ag0(o, s, m, i);
  };
  const nf0 = newFoe;
  newFoe = function (sp, slot) {
    const f = nf0(sp, slot);
    if (isB(f.kind)) {
      f.m.rotation.y = -0.9;
      f.th = (f.m.userData.h || 3) * f.m.scale.x + 0.3;
    }
    return f;
  };
  DD.forEach((D, d) => (WKT["dkb" + d] = D.b.wk));
  const wk0 = wkName;
  wkName = function (nm) {
    const d = DD.findIndex((D) => D.b.n === nm);
    return d >= 0 ? String(weakTxt({ kind: "dkb" + d })).trim() : wk0(nm);
  };
  // ---------- boss movesets (same fields as 24/27/33; only existing poses and effects) ----------
  const hurt = (f) => f.hp < f.max * 0.7;
  const BMV = [
    {
      a: { n: "Frostbite Fangs", ic: "🦷", el: "ice", tg: "one", p: 1.25, w: 3, an: "bite", fx: "bite", ch: 0.4 },
      b: {
        n: "Glacial Breath",
        ic: "🌨",
        el: "ice",
        tg: "all",
        p: 0.7,
        w: 1.5,
        cd: 3,
        an: "roar",
        fx: "blizzard",
        ch: 0.6,
      },
      c: {
        n: "Icicle Rain",
        ic: "❄",
        el: "ice",
        tg: "one",
        p: 1.5,
        w: 2,
        cd: 2,
        an: "cast",
        fx: "frostpuff",
        rng: 1,
        ch: 0.5,
      },
      d: { n: "Tail Sweep", ic: "💥", el: "ice", tg: "all", p: 0.55, w: 2, cd: 2, an: "slam", fx: "bash" },
      e: {
        n: "Rime Carapace",
        ic: "🛡",
        el: "ice",
        tg: "self",
        w: 1.3,
        cd: 4,
        an: "guard",
        fx: "guard",
        gd: 1,
        hl: 0.08,
        c: hurt,
      },
      f: {
        n: "Whiteout Howl",
        ic: "🌫",
        el: "ice",
        tg: "debuff",
        p: 0.4,
        w: 1.2,
        cd: 3,
        an: "roar",
        fx: "fear",
        pp: 1,
        ppn: "Frostbitten",
      },
    },
    {
      a: { n: "Hammerfall", ic: "🔨", el: "fire", tg: "one", p: 1.35, w: 3, an: "slam", fx: "emberhit", bn: 2 },
      b: {
        n: "Bellows Blast",
        ic: "🔥",
        el: "fire",
        tg: "all",
        p: 0.7,
        w: 1.5,
        cd: 3,
        an: "roar",
        fx: "flamewave",
        bn: 1,
      },
      c: {
        n: "Molten Pour",
        ic: "☄",
        el: "fire",
        tg: "one",
        p: 1.6,
        w: 2,
        cd: 3,
        an: "cast",
        fx: "fireball",
        rng: 1,
        bn: 2,
      },
      d: { n: "Anvil Quake", ic: "🌋", el: "fire", tg: "all", p: 0.6, w: 1.5, cd: 2, an: "slam", fx: "magma" },
      e: {
        n: "Temper Steel",
        ic: "🛡",
        el: "fire",
        tg: "self",
        w: 1.3,
        cd: 4,
        an: "guard",
        fx: "guard",
        gd: 1,
        bf: 1.3,
      },
      f: {
        n: "Stoke the Furnace",
        ic: "▲",
        el: "fire",
        tg: "self",
        w: 1.2,
        cd: 5,
        an: "roar",
        fx: "kindle",
        hl: 0.12,
        bf: 1.3,
        c: hurt,
      },
    },
    {
      a: { n: "Grave Grasp", ic: "🖐", el: "spirit", tg: "one", p: 1.25, w: 3, an: "drain", fx: "drain" },
      b: {
        n: "Toll of the Deep",
        ic: "🔔",
        el: "spirit",
        tg: "all",
        p: 0.7,
        w: 1.5,
        cd: 2,
        an: "shake",
        fx: "eclipse",
      },
      c: { n: "Drowning Tide", ic: "🌊", el: "spirit", tg: "one", p: 1.6, w: 2, cd: 3, an: "cast", fx: "bolt", rng: 1 },
      d: {
        n: "Mire Curse",
        ic: "🧪",
        el: "heal",
        tg: "debuff",
        p: 0.4,
        w: 1.3,
        cd: 3,
        an: "cast",
        fx: "spores",
        pp: 1,
        ppn: "Waterlogged",
      },
      e: { n: "Last Rites", ic: "✚", el: "heal", tg: "self", w: 1.2, cd: 4, an: "cast", fx: "mend", hl: 0.15, c: hurt },
      f: {
        n: "Funeral Knell",
        ic: "💀",
        el: "spirit",
        tg: "debuff",
        p: 0.35,
        w: 1.1,
        cd: 3,
        an: "roar",
        fx: "fear",
        pp: 1,
        ppn: "Dread",
      },
    },
  ];
  BMV.forEach((set, d) => {
    FMV.K["dkb" + d] = Object.keys(set).map((k) => {
      const id = "dkb" + d + k;
      FMV.M[id] = Object.assign({ id }, set[k]);
      return id;
    });
  });
  const kit0 = FMV.kit;
  FMV.kit = (f) => (f && isB(f.kind) && FMV.K[f.kind] ? FMV.K[f.kind] : kit0(f));
  // ---------- the foes (appended to `foes` in a fixed order, after everything else) ----------
  const wf = (kind, t, x, z, hc, ex) => {
    const o = mkFoe(kind, t, 0, hc || undefined);
    o.position.set(x, 0, z);
    S.add(o);
    const f = Object.assign({ o, t, kind, big: 0, hx: x, hz: z, w: null, wt: 0, dead: 0, rt: Infinity }, ex);
    if (hc) f.hc = hc;
    foes.push(f);
    foeSetup(f);
    if (f.au) f.au.visible = false;
    f.elite = null;
    return f;
  };
  DD.forEach((D, d) => {
    D.f.forEach(([k, kind, t, dx, dz, hc]) => {
      const [cx, cz] = D.R[k],
        f = wf(kind, t, cx + dx * 1.3, cz + dz * 1.3 - (k ? 0 : 3), hc, { tw: 9000 + d * 10 + k, d2: d, d2r: k });
      D.fs.push(f);
    });
    D.pre = D.fs.slice();
    const [bx, bz] = D.R[2];
    D.gs = D.g.map(([kind, t, dx, hc]) => {
      const f = wf(kind, t, bx + dx, bz - 2, hc, { tw: 9000 + d * 10 + 2, d2: d, d2r: 2, d2g: 1 });
      D.fs.push(f);
      return f;
    });
    const b = wf("dkb" + d, 4, bx, bz - 5, 0, { tw: 9000 + d * 10 + 2, d2: d, d2r: 2, nm: D.b.n });
    b.boss = true;
    b.path = null;
    b.R = 5;
    if (b.ring) b.ring.scale.setScalar(5);
    b.o.rotation.y = 0;
    b.d2bw = 1;
    D.bossF = b;
    D.fs.push(b);
    D.bsp = { kind: "dkb" + d, t: 4, boss: 1, nm: D.b.n, hp0: D.b.hp, lv: D.lv + 1, bsc: 1.15, d2: d, d2b: 1 };
  });
  // ---------- battles: a hall fights together; the deep hall is the boss and its guards ----------
  const spec = (f) => {
    const D = DD[f.d2],
      s = { kind: f.kind, t: f.t, big: f.big, hc: f.hc, lv: D.lv, d2: f.d2 };
    if (f.nm) s.nm = f.nm;
    return s;
  };
  const ga0 = gather;
  gather = function (f0) {
    if (!f0 || f0.d2 == null) return ga0(f0);
    const D = DD[f0.d2];
    if (f0.d2r === 2) {
      const bl = !D.bossF.dead,
        list = (bl ? [D.bossF] : []).concat(D.gs.filter((f) => !f.dead && f !== D.bossF)).slice(0, 4);
      if (!list.length) list.push(f0);
      return {
        cap: Math.max(2, list.length),
        rein: 0,
        list,
        sp: list.map((f) => (f === D.bossF ? Object.assign({}, D.bsp) : spec(f))),
        bossHp: bl ? D.bsp.hp0 : undefined,
      };
    }
    const list = [f0].concat(foes.filter((f) => f !== f0 && !f.dead && f.d2 === f0.d2 && f.d2r === f0.d2r)).slice(0, 4);
    return { cap: Math.max(2, list.length), rein: 0, list, sp: list.map(spec) };
  };
  const fr0 = frame;
  frame = function (f) {
    if (!f || f.d2 == null) return fr0(f);
    const c = DD[f.d2].R[f.d2r] || DD[f.d2].R[0];
    return { x: c[0], z: c[1], r: PI / 2 }; // lined up along the dungeon (north-south)
  };
  const fi0 = fight;
  fight = function (f0) {
    if (f0 && f0.d2 != null) {
      const D = DD[f0.d2];
      if (f0.d2r === 2 && !D.bossF.dead) {
        f0 = D.bossF;
        const k = (P.dun2 && P.dun2[D.i]) || 0;
        toast(D.b.n + ': "' + D.b.say[k % D.b.say.length] + '"', D.tc);
      }
    }
    return fi0(f0);
  };
  // ---------- rewards: first clear pays a bonus; every clear opens the chest ----------
  const rw0 = reward;
  reward = function (list) {
    rw0(list);
    try {
      const b = list.find((f) => f.d2b && !f.min);
      if (!b) return;
      const D = DD[b.d2];
      P.dun2 = P.dun2 || {};
      const first = !P.dun2[D.i];
      P.dun2[D.i] = (P.dun2[D.i] || 0) + 1;
      toast(D.b.n + ': "' + D.b.die + '"', D.tc);
      if (first) {
        const gd = 150 + 60 * D.i;
        P.gold += gd;
        toast(D.n + " cleared for the first time! +" + gd + " ✦ and an Epic reward", "#c38bff");
        giveItem(genItem(null, P.lvl + 1, 3));
      } else toast(D.n + " cleared again (" + P.dun2[D.i] + "x). The treasure chest waits behind.", "#ffd27a");
      ui();
      sv();
    } catch (e) {}
  };
  function openC(D) {
    const now = performance.now();
    if (P.inv && P.inv.length >= INVMAX) {
      if (!(now < D.fullT)) {
        D.fullT = now + 3000;
        toast("Your bag is full. Make room, then open the chest.", "#ff8a6a");
      }
      return;
    }
    D.chestOpen = 1;
    const c = D.ch;
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
    ring(c.x, 0xffd27a, 3, 500, c.z);
    const gd = Math.round((60 + 25 * D.i) * (1 + 0.1 * P.lvl));
    P.gold += gd;
    toast(D.n + " treasure! +" + gd + " ✦", "#ffd27a");
    giveItem(genItem(null, P.lvl + 1, Math.max(2, rollR(3))));
    ui();
    sv();
  }
  // ---------- walking in: the dungeon resets (unless another player is already inside) ----------
  function peersIn(D) {
    try {
      for (const p of PEERS.values()) if (inB(D, p.tx, p.tz)) return true;
    } catch (e) {}
    return false;
  }
  function reset(D) {
    if (!peersIn(D)) {
      D.fs.forEach((f) => {
        if (f.edHid) return; // v46: removed in the world editor
        if (f.dead) {
          f.dead = 0;
          S.add(f.o);
        }
        f.o.visible = true;
        f.pi = 0;
        f.fade = null;
        f.o.scale.setScalar(f.s0);
        f.o.position.set(f.hx, 0, f.hz);
        f.cool = 0;
        f.sup = 0;
        f.rt = Infinity;
      });
      D.chestOpen = 0;
      const c = D.ch;
      c.o.visible = false;
      c.o.scale.setScalar(1);
      c.lid.rotation.x = 0;
      c.gl.visible = true;
    }
    D.open = D.pre.every((f) => f.dead);
    toast("The halls of " + D.n + " stir. Clear both halls to break the ward over the deep hall.", D.tc);
  }
  // ---------- each frame: look, name plate, ward, chest ----------
  const th0 = theme;
  theme = function (z) {
    DUN2.cth = null;
    th0(z);
  };
  let cur = -1,
    sealT = 0,
    nearT = 0,
    eT = 0,
    peHooked = 0;
  window.addEventListener("keydown", (e) => {
    if ((e.key === "e" || e.key === "E") && !e.repeat) eT = performance.now();
  });
  const a0 = ambient;
  ambient = function (dt, s, p) {
    a0(dt, s, p);
    try {
      tick(dt, s, p);
    } catch (e) {}
  };
  function tick(dt, s, p) {
    if (!p) return;
    const d = dAt(p.x, p.z);
    if (d !== cur) {
      cur = d;
      if (d < 0 && DUN2.cth) {
        DUN2.cth = null;
        lastTh = themeKey(p.x, p.z);
        th0(lastTh);
      }
    }
    if (d < 0) return;
    const D = DD[d],
      now = performance.now();
    if (DUN2.cth !== D.th) {
      th0(D.th);
      DUN2.cth = D.th;
    }
    lastTh = themeKey(p.x, p.z); // so walk() doesn't put the open-zone look back
    if (typeof WX !== "undefined" && WX) WX.visible = false;
    // the name plate under the minimap (walk() shows the zone's name; put the dungeon's there)
    if (mode === "explore") {
      const zp = $("zplate");
      if (zp && zp.textContent !== D.n) {
        zp.textContent = D.n;
        const zc = $("zcard");
        if (zc) zc.innerHTML = D.n + "<small>Dungeon  ·  Lv " + D.lv + "</small>";
      }
    }
    // the ward over the deep hall
    const open = D.pre.every((f) => f.dead);
    if (open !== D.open) {
      D.open = open;
      if (open && mode === "explore") toast(D.b.ward, "#c9b8ff");
    }
    D.seal.visible = !open;
    if (!open) D.seal.material.opacity = 0.38 + 0.14 * Math.sin(s * 2.4);
    if (
      !open &&
      mode === "explore" &&
      Math.abs(p.x - D.bx) < D.cw &&
      Math.abs(p.z - (D.C[1][0] - 1.6)) < 2.4 &&
      now > sealT
    ) {
      sealT = now + 4000;
      toast("A ward seals the deep hall. Defeat every foe in the first two halls first.", "#c9b8ff");
    }
    // the chest appears when the boss is down
    const c = D.ch,
      show = D.bossF.dead && !D.chestOpen;
    if (show && !c.o.visible) {
      c.o.visible = true;
      c.o.scale.setScalar(1);
      c.lid.rotation.x = 0;
      c.gl.visible = true;
      if (mode === "explore") puff(new T.Vector3(c.x, 1, c.z), "heal", 14, 3, 0.8, 1);
    }
    if (show) c.gl.scale.setScalar(3.2 + Math.sin(s * 6) * 0.5);
    if (show && mode === "explore" && !paused) {
      const dd = Math.hypot(p.x - c.x, p.z - c.z),
        el = window.__pe;
      DUN2.nearCh = dd < 2.8 ? D : null;
      if (dd < 2.8) {
        if (el) {
          if (!peHooked) {
            peHooked = 1;
            el.addEventListener("click", () => {
              if (DUN2.nearCh) eT = performance.now();
            });
          }
          el.style.display = "block";
          el.textContent = "Press E to open the chest";
        }
        if (now - eT < 400) {
          eT = 0;
          openC(D);
        }
      } else if (dd < 7 && now > nearT) {
        nearT = now + 8000;
        toast("The treasure chest of " + D.n + " (press E beside it to open)", "#ffd27a");
      }
    } else DUN2.nearCh = null;
  }
  // ---------- console helpers for testing ----------
  DUN2.go = (d) => {
    const D = DD[d | 0];
    if (D) tp({ to: zsP(D.out[0], D.out[1]).concat([D.out[2] || 0]) }); // v43: the door wherever its street stands
  };
  DUN2.enter = (d) => {
    const D = DD[d | 0];
    if (D) tp({ to: [D.bx, D.ez, PI], on: () => reset(D) });
  };
})();
