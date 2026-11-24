// DUSKWICK - 78-castpose.js (v52): casting animations while charging up. Loaded in order by index.html as plain scripts
// (one global scope). Only top-level name: CPOSE. Loads LAST (after 77-ko).
//  - Wizards: CHG.start/stop/kill (23) are wrapped. While a spell charges, the caster (your W, a party member's model,
//    or another player's clone) holds a body pose made for that spell (WZ[card key].p -> PO: bolt, lash, spread,
//    overhead, heft, crouch, cradle, plant, spin, point, beckon) for the whole build-up, and a gathering prop made for
//    that spell forms around them (a fireball in the free hand, a coiling whip of flame, wings of fire, a small sun
//    overhead, sparks arcing between the hands, a thunderhead, an ice hammer, a row of ghost lanterns...). Old/bot cards
//    fall back to their school (FB). Poses blend over the walk/cast rig after it runs (a WONDR.pre hook, right before
//    each render) and ease out on release; props rush into the lantern on a hit, fizzle on a miss.
//  - Creatures: FMV.pose/wind/fx (24) are wrapped. When a foe winds up a move, a gathering effect made for its kind
//    (CR, keyed like FOESFX.who: g1-g5, wolf, hound, golems, phoenix, gnome, swamp kinds, minions; road and dungeon
//    bosses get a rune circle in the move's element) builds on it until it strikes (pose phase 1 or its fx). Melee
//    moves get a shorter, tighter version plus dust. Guests and street spectators see it through the same 'fmv' replay.
// Sprites/motes and a couple of small additive meshes only: no lights, no onBeforeCompile, no save fields, no NET.
const CPOSE = (() => {
  const RN = Math.random,
    r2 = () => RN() * 2 - 1,
    cl = (v, a, b) => Math.max(a, Math.min(b, v)),
    ez = (x) => (x = cl(x, 0, 1)) * x * (3 - 2 * x),
    lr = (a, b, t) => a + (b - a) * t,
    qual = () => (typeof GFX !== "undefined" ? (GFX === "low" ? 0.4 : GFX === "med" ? 0.7 : 1) : 1),
    COL = { fire: 0xff8a3d, ice: 0xa8dcff, storm: 0xffe066, heal: 0x7dff9a, spirit: 0xc39bff },
    UP = new T.Vector3(0, 1, 0),
    ZX = new T.Vector3(0, 0, 1),
    V = new T.Vector3(),
    V2 = new T.Vector3(),
    RT = new T.Vector3(),
    T1 = new T.Vector3(), // anchor lookups only (they run lazily in the middle of tickRig's V/V2 use)
    T2 = new T.Vector3();
  // ---------------------------------------------------------------- textures
  const LEAF = cvT(64, 64, (x) => {
    x.translate(32, 32);
    x.rotate(0.6);
    x.fillStyle = "#5fc24a";
    x.beginPath();
    x.ellipse(0, 0, 11, 26, 0, 0, 7);
    x.fill();
    x.strokeStyle = "#c8f5a0";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, -24);
    x.lineTo(0, 24);
    x.stroke();
  });
  const LANT = cvT(64, 64, (x) => {
    const q = x.createRadialGradient(32, 34, 0, 32, 34, 31);
    q.addColorStop(0, "rgba(255,240,255,1)");
    q.addColorStop(0.3, "rgba(200,160,255,.75)");
    q.addColorStop(1, "rgba(150,100,255,0)");
    x.fillStyle = q;
    x.fillRect(0, 0, 64, 64);
    x.fillStyle = "rgba(60,40,90,.9)";
    x.fillRect(24, 14, 16, 4);
    x.fillRect(22, 46, 20, 4);
    x.fillStyle = "rgba(255,250,255,.95)";
    x.fillRect(27, 20, 10, 24);
  });
  const STAR = cvT(64, 64, (x) => {
    x.translate(32, 32);
    const q = x.createRadialGradient(0, 0, 0, 0, 0, 30);
    q.addColorStop(0, "rgba(255,255,255,1)");
    q.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = q;
    x.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 6.283,
        r = i % 2 ? 6 : 30;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.fill();
  });
  const BUB = cvT(64, 64, (x) => {
    x.strokeStyle = "rgba(255,255,255,.85)";
    x.lineWidth = 4;
    x.beginPath();
    x.arc(32, 32, 24, 0, 7);
    x.stroke();
    x.fillStyle = "rgba(255,255,255,.25)";
    x.beginPath();
    x.arc(32, 32, 22, 0, 7);
    x.fill();
    x.fillStyle = "rgba(255,255,255,.9)";
    x.beginPath();
    x.arc(24, 23, 5, 0, 7);
    x.fill();
  });
  const TX = (k) =>
    k === "glow"
      ? GLT
      : k === "flk"
        ? FLK
        : k === "leaf"
          ? LEAF
          : k === "lant"
            ? LANT
            : k === "star"
              ? STAR
              : k === "bub"
                ? BUB
                : SP[k] || WGT;
  // ---------------------------------------------------------------- wizard poses
  // (k build-up 0..1, t seconds) -> al/ar = [x, z] upper arms (x < 0 raises forward; AL z < 0 / AR z > 0 = outward),
  // el/er elbows (< 0 bends), hx head tilt (< 0 = chin up), ln lean (> 0 forward)
  const S = Math.sin;
  const PO = {
    bolt: (k, t) => ({
      ar: [-0.95 - 0.55 * k, 0.12],
      er: -0.25,
      al: [-1.2 - 0.1 * k, 0.5],
      el: -1.45 - 0.15 * k + 0.05 * S(t * 30) * k,
      hx: -0.08,
      ln: 0.08 * k,
    }),
    lash: (k, t) => ({
      ar: [0.4 + 0.3 * k, 0.45 + 0.3 * S(t * (5 + 6 * k))],
      er: -0.6,
      al: [-1.35, -0.15],
      el: -0.2,
      hx: 0.05,
      ln: -0.05 * k,
    }),
    spread: (k, t) => ({
      al: [-0.45 - 0.5 * k, -0.55 - 0.85 * k + 0.05 * S(t * 2)],
      ar: [-0.45 - 0.5 * k, 0.55 + 0.85 * k - 0.05 * S(t * 2)],
      el: -0.15,
      er: -0.15,
      hx: -0.3 * k,
      ln: -0.09 * k,
    }),
    overhead: (k, t) => ({
      al: [-1.0 - 1.7 * k, -0.2 + 0.06 * S(t * 2.2)],
      ar: [-1.1 - 1.7 * k, 0.2 + 0.06 * S(t * 2.2)],
      el: -0.25,
      er: -0.2,
      hx: -0.45 * k,
      ln: -0.1 * k,
    }),
    heft: (k, t) => ({
      ar: [-2.2 - 0.7 * k, 0.05],
      er: -1.1 - 0.5 * k,
      al: [-2.1 - 0.7 * k, 0.35],
      el: -1.2 - 0.5 * k + 0.04 * S(t * 25) * k,
      hx: -0.3 * k,
      ln: -0.14 * k,
    }),
    crouch: (k, t) => ({
      al: [-0.35, -0.8 - 0.3 * S(t * 5) * k],
      ar: [-0.45, 0.8 + 0.3 * S(t * 5 + 1.5) * k],
      el: -0.3,
      er: -0.3,
      hx: 0.2 * k,
      ln: 0.2 * k,
    }),
    cradle: (k, t) => ({
      al: [-1.05 + 0.05 * S(t * 3), 0.6],
      el: -1.25,
      ar: [-0.95 + 0.05 * S(t * 3), -0.3],
      er: -1.0,
      hx: 0.22,
      ln: 0.04,
    }),
    plant: (k) => ({ ar: [-0.45, 0.1], er: -0.05, al: [-0.6 - 1.7 * k, -0.35], el: -0.15, hx: -0.2 * k, ln: 0.05 }),
    spin: (k, t) => ({
      ar: [-2.5, 0.1 + 0.45 * S(t * (7 + 8 * k))],
      er: -0.15,
      al: [-0.5, -0.95],
      el: -0.2,
      hx: -0.35 * k,
      ln: -0.05,
    }),
    point: (k, t) => ({
      ar: [-1.45, 0.05],
      er: -0.08,
      al: [-1.3, 0.55],
      el: -0.55,
      hx: -0.05,
      ln: 0.1 * k + 0.01 * S(t * 30) * k,
    }),
    beckon: (k, t) => ({
      ar: [-0.4, 0.12],
      er: -0.4,
      al: [-1.0, -0.3 + 0.28 * S(t * 4)],
      el: -0.9 + 0.2 * Math.cos(t * 4),
      hx: 0.1,
      ln: 0.03,
    }),
  };
  // ---------------------------------------------------------------- per-spell charge looks (25 kit attack cards)
  // prop types: glow (sprite at an anchor, grows), orbit (sprites circling an anchor), wing (fans behind the shoulders),
  // row (sprites appearing in a line behind), cloud (dark puffs + flashes), mesh (hammer/shard), arc (crackling line
  // between two anchors), rune (ground circle), conv (motes flying into an anchor), rise (motes rising from a ring),
  // drift (motes shed at an anchor), spiral (motes climbing a helix between two anchors).
  // Wizard anchors: ft feet, hl free hand, hr staff hand, md between the hands, ln lantern, tip in front of the lantern,
  // hd above the hat, cl cloud spot, up high overhead, up2 just over the head (behind), bk shoulders.
  const WZ = {
    pcinder: {
      p: "bolt",
      fx: [
        { ty: "glow", at: "hl", t: "fire", c: 0xffffff, s: [0.25, 1.0], tr: 10 },
        { ty: "orbit", at: "hl", n: [3, 4], r: [0.55, 0.3], w: 6, t: "glow", c: 0xffb050, s: 0.18, tr: 4 },
      ],
    },
    plash: {
      p: "lash",
      fx: [
        { ty: "orbit", at: "ln", n: [5, 8], r: [0.8, 0.45], w: 9, t: "fire", c: 0xffffff, s: 0.4, tr: 8 },
        { ty: "spiral", from: "hr", to: "ln", r: 0.35, t: "fire", c: 0xffc080, rate: 26, s: 0.28, w: 2.2 },
      ],
    },
    pphoenix: {
      p: "spread",
      fx: [
        { ty: "wing", t: "fire", c: 0xffffff, n: 7, s: 0.6 },
        { ty: "glow", at: "hd", t: "glow", c: 0xffb040, s: [0.3, 1.2] },
        { ty: "rise", r: 1.2, t: "fire", c: 0xffd080, rate: 14, s: 0.35, vy: 2, l: 0.6 },
      ],
    },
    psun: {
      p: "overhead",
      fx: [
        { ty: "glow", at: "up", t: "glow", c: 0xffd060, s: [0.3, 3.0], pu: 0.06 },
        { ty: "glow", at: "up", t: "fire", c: 0xffffff, s: [0.2, 1.8] },
        { ty: "conv", to: "up", r: 2.6, h: 1.5, t: "fire", c: 0xffc070, rate: 24, s: 0.35, l: 0.7 },
        { ty: "rune", t: "fire", c: 0xffc060, r: 2.2, o: 0.6 },
      ],
    },
    gspark: {
      p: "cradle",
      fx: [
        { ty: "arc", a: "hl", b: "hr", c: 0xfff4a0, j: 0.12 },
        { ty: "arc", a: "hl", b: "hr", c: 0xbfe8ff, j: 0.16 },
        { ty: "glow", at: "md", t: "glow", c: 0xffe066, s: [0.2, 0.8] },
        { ty: "drift", at: "md", t: "star", c: 0xfff4c0, rate: 14, s: 0.16, sp: 2.5, vy: 0, g: 0, l: 0.25 },
      ],
    },
    ggust: {
      p: "crouch",
      fx: [
        { ty: "orbit", at: "ft", y: 0.35, n: [8, 12], r: [2.6, 1.3], w: 7, t: "wgt", c: 0xe6f6ff, s: 0.5, tr: 6 },
        { ty: "orbit", at: "ft", y: 1.2, n: [5, 8], r: [2.0, 1.0], w: -8, t: "wgt", c: 0xcfeaff, s: 0.35 },
        { ty: "rise", r: 2, t: "leaf", c: 0xd8f0c0, nb: 1, rate: 8, s: 0.2, vy: 1.6, sp: 0.8, l: 1 },
      ],
    },
    gthunder: {
      p: "spin",
      fx: [
        { ty: "cloud", at: "cl", c: 0x3a4458, n: 7, r: 1.3, s: 1.3, fl: 4 },
        { ty: "arc", a: "ln", b: "cl", c: 0xfff4a0, j: 0.3, fk: 0.35 },
      ],
    },
    gsky: {
      p: "overhead",
      fx: [
        { ty: "glow", at: "up", t: "storm", c: 0xffffff, s: [0.3, 1.8] },
        { ty: "arc", a: "ln", b: "up", c: 0xfff4a0, j: 0.35 },
        { ty: "arc", a: "ln", b: "up", c: 0xbfe8ff, j: 0.45, fk: 0.5 },
        { ty: "rise", r: 1.6, t: "glow", c: 0xffe066, rate: 26, s: 0.22, vy: 4.5, l: 0.6 },
      ],
    },
    rshard: {
      p: "point",
      fx: [
        { ty: "mesh", g: "shard", at: "tip", s: 1, c: 0xcfeeff },
        { ty: "conv", to: "tip", rc: 1, r: 1.2, h: 1.2, t: "flk", c: 0xeaf6ff, rate: 18, s: 0.2, l: 0.4 },
      ],
    },
    rhammer: {
      p: "heft",
      fx: [
        { ty: "mesh", g: "hammer", at: "up2", s: 1, c: 0xbfe8ff },
        { ty: "conv", to: "up2", rc: 1, r: 1.6, h: 1.2, t: "flk", c: 0xffffff, rate: 22, s: 0.25, l: 0.45 },
        { ty: "rune", t: "ice", c: 0xa8dcff, r: 1.8, o: 0.5 },
      ],
    },
    rring: {
      p: "crouch",
      fx: [
        { ty: "orbit", at: "ft", y: 0.3, n: [10, 14], r: [2.8, 1.5], w: 2.5, t: "flk", c: 0xeaf6ff, s: 0.45 },
        { ty: "rune", t: "ice", c: 0xbfe8ff, r: 2.4, o: 0.7 },
        {
          ty: "drift",
          at: "ft",
          t: "wgt",
          c: 0xdff2ff,
          nb: 1,
          rate: 10,
          s: 0.8,
          sp: 1.2,
          vy: 0.1,
          l: 1.0,
          gr: 0.8,
          o: 0.35,
          j: 1.5,
        },
      ],
    },
    ravatar: {
      p: "spread",
      fx: [
        { ty: "wing", t: "flk", c: 0xe8f6ff, n: 6, s: 0.55 },
        { ty: "orbit", at: "ft", y: 1.5, n: [6, 8], r: [1.6, 0.9], w: 1.8, t: "ice", c: 0xffffff, s: 0.4, bob: 0.3 },
        { ty: "rise", r: 1.4, t: "flk", c: 0xffffff, rate: 18, s: 0.18, vy: 1.4, l: 1 },
      ],
    },
    vseed: {
      p: "cradle",
      fx: [
        { ty: "glow", at: "md", t: "heal", c: 0xffffff, s: [0.15, 0.7] },
        { ty: "orbit", at: "md", n: [3, 4], r: [0.6, 0.35], w: 3, t: "leaf", c: 0xffffff, nb: 1, s: 0.22 },
        { ty: "conv", to: "md", r: 1.8, h: 0.3, t: "glow", c: 0x9dff7a, rate: 12, s: 0.15, l: 0.7 },
      ],
    },
    vvine: {
      p: "plant",
      fx: [
        { ty: "spiral", from: "ft", to: "hl", r: 0.9, t: "leaf", c: 0xffffff, nb: 1, rate: 22, s: 0.24, w: 0.9 },
        { ty: "glow", at: "hl", t: "glow", c: 0x7dff9a, s: [0.2, 0.9] },
        { ty: "rune", t: "heal", c: 0x8dffa8, r: 1.8, o: 0.55 },
      ],
    },
    swisp: {
      p: "beckon",
      fx: [
        {
          ty: "orbit",
          at: "hl",
          n: [1, 2],
          r: [0.7, 0.45],
          w: 4.5,
          t: "spirit",
          c: 0xffffff,
          s: 0.45,
          tr: 14,
          bob: 0.2,
        },
        { ty: "glow", at: "hl", t: "glow", c: 0xc39bff, s: [0.15, 0.6] },
      ],
    },
    sproc: {
      p: "spread",
      fx: [
        { ty: "row", t: "lant", c: 0xffffff, n: 5, s: 0.7 },
        { ty: "rise", r: 1.6, t: "glow", c: 0xb48cff, rate: 12, s: 0.25, vy: 0.9, l: 1.2 },
      ],
    },
  };
  // old/bot cards: [single target, area] look of their school
  const FB = {
    fire: ["pcinder", "pphoenix"],
    ice: ["rshard", "rring"],
    storm: ["gspark", "gthunder"],
    heal: ["vseed", "vvine"],
    spirit: ["swisp", "sproc"],
  };
  // ---------------------------------------------------------------- creature wind-ups
  // anchors: ft feet, md body middle, hd head (or near the top), hn/hn2 hands or claws (else the middle), top above it
  const DUST = { ty: "rise", r: 1, t: "wgt", c: 0x8a7a60, nb: 1, rate: 12, s: 0.45, vy: 0.4, sp: 1.5, l: 0.5, o: 0.6 };
  const CR = {
    g1: [
      { ty: "conv", to: "hn", r: 2.2, h: 2, t: "wgt", c: 0x2a1050, nb: 1, rate: 16, s: 0.45, l: 0.45 },
      { ty: "conv", to: "hn2", r: 2.2, h: 2, t: "wgt", c: 0x2a1050, nb: 1, rate: 16, s: 0.45, l: 0.45 },
      { ty: "glow", at: "hd", t: "glow", c: 0xb070ff, s: [0.4, 1.1] },
    ],
    g2: [
      { ty: "orbit", at: "md", n: [5, 5], r: [1.6, 1.0], w: 7, t: "fire", c: 0xff7a90, s: 0.35, tr: 8 },
      {
        ty: "drift",
        at: "hd",
        t: "wgt",
        c: 0x553366,
        nb: 1,
        rate: 8,
        s: 0.5,
        sp: 1.2,
        vy: 0.6,
        l: 0.7,
        gr: 0.8,
        o: 0.5,
      },
      { ty: "glow", at: "hd", t: "glow", c: 0xff6aa0, s: [0.3, 0.9] },
    ],
    g3: [
      { ty: "rise", r: 1.6, t: "wgt", c: 0x6b5a3e, nb: 1, rate: 16, s: 0.32, vy: 1.6, g: 0.6, l: 1.2 },
      {
        ty: "orbit",
        at: "md",
        y: -0.3,
        n: [4, 4],
        r: [1.8, 1.2],
        w: 2.5,
        t: "wgt",
        c: 0x7a6a50,
        nb: 1,
        s: 0.45,
        bob: 0.4,
      },
      { ty: "drift", at: "md", t: "wgt", c: 0x9dff7a, rate: 10, s: 0.18, sp: 1.5, vy: 0.5, l: 1 },
      { ty: "rune", t: "heal", c: 0x6aa04a, r: 1.6, o: 0.4 },
    ],
    g4: [
      { ty: "spiral", from: "ft", to: "top", r: 1.4, t: "fire", c: 0xffffff, rate: 24, s: 0.5, w: 1.2 },
      { ty: "glow", at: "hn", t: "fire", c: 0xffffff, s: [0.4, 1.2] },
      { ty: "glow", at: "hn2", t: "fire", c: 0xffffff, s: [0.4, 1.2] },
      { ty: "rise", r: 1.2, t: "wgt", c: 0xffa040, rate: 14, s: 0.12, vy: 2.5, sp: 0.8, l: 0.9 },
    ],
    g5: [
      { ty: "rune", t: "spirit", c: 0xb080ff, r: 2.6, o: 0.8 },
      { ty: "orbit", at: "top", y: 0.3, n: [6, 6], r: [0.9, 0.7], w: 2, t: "glow", c: 0xc39bff, s: 0.45 },
      { ty: "conv", to: "hd", r: 3, h: 3, t: "wgt", c: 0x1a0830, nb: 1, rate: 22, s: 0.6, l: 0.6 },
      { ty: "rise", r: 2.6, t: "wgt", c: 0xa070ff, rate: 18, s: 0.25, vy: 3, l: 0.8 },
    ],
    wolf: [
      {
        ty: "drift",
        at: "hd",
        t: "wgt",
        c: 0xdff2ff,
        nb: 1,
        rate: 16,
        s: 0.5,
        sp: 0.5,
        vy: 0.3,
        l: 0.9,
        gr: 1.4,
        o: 0.55,
      },
      { ty: "rise", r: 1.4, t: "flk", c: 0xeaf6ff, rate: 14, s: 0.2, vy: 0.8, sp: 0.6, l: 1.1 },
      { ty: "glow", at: "hd", t: "glow", c: 0x9fe0ff, s: [0.3, 0.9] },
      { ty: "rune", t: "ice", c: 0xbfe8ff, r: 1.5, o: 0.35 },
    ],
    hound: [
      { ty: "glow", at: "hd", t: "fire", c: 0xffffff, s: [0.5, 1.4], tr: 10 },
      {
        ty: "drift",
        at: "hd",
        t: "wgt",
        c: 0x3a3030,
        nb: 1,
        rate: 10,
        s: 0.6,
        sp: 0.4,
        vy: 1.2,
        l: 1,
        gr: 1.2,
        o: 0.5,
      },
      { ty: "drift", at: "hd", t: "wgt", c: 0xffa040, rate: 12, s: 0.14, sp: 1, vy: -0.5, g: 3, l: 0.6 },
      { ty: "rise", r: 1.2, t: "fire", c: 0xffffff, rate: 8, s: 0.45, vy: 1.4, l: 0.5 },
    ],
    fgolem: [
      { ty: "orbit", at: "md", n: [6, 6], r: [2, 1.4], w: 2.2, t: "flk", c: 0xe8f6ff, s: 0.5, bob: 0.5 },
      { ty: "rune", t: "ice", c: 0xa8dcff, r: 2, o: 0.6 },
      { ty: "rise", r: 2, t: "flk", c: 0xffffff, rate: 16, s: 0.18, vy: 1.2, l: 1 },
    ],
    lgolem: [
      { ty: "rise", r: 1.6, t: "fire", c: 0xffffff, rate: 20, s: 0.6, vy: 2.2, sp: 0.3, g: -0.5, l: 0.6 },
      { ty: "drift", at: "md", t: "wgt", c: 0xff6a1a, rate: 14, s: 0.16, sp: 2, vy: 2.5, g: 4, l: 0.9 },
      { ty: "glow", at: "md", t: "glow", c: 0xff6a1a, s: [0.8, 2.2] },
      { ty: "rune", t: "fire", c: 0xff8a3d, r: 2, o: 0.5 },
    ],
    phoenix: [
      { ty: "orbit", at: "md", n: [8, 8], r: [1.8, 1.2], w: 4, t: "fire", c: 0xffffff, s: 0.6, tr: 5 },
      { ty: "rise", r: 1.4, t: "fire", c: 0xffd080, rate: 16, s: 0.4, vy: 2.4, l: 0.6 },
      { ty: "glow", at: "hd", t: "glow", c: 0xffc040, s: [0.4, 1.2] },
    ],
    gnome: [
      { ty: "orbit", at: "top", y: 0.2, n: [5, 5], r: [0.8, 0.6], w: 5, t: "star", c: 0xfff0a0, s: 0.35, tr: 5 },
      { ty: "drift", at: "md", t: "star", c: 0xc8e0ff, rate: 8, s: 0.2, sp: 1.2, vy: 0.6, l: 0.8 },
    ],
    bogl: [
      { ty: "rise", r: 1.4, t: "bub", c: 0x8fbf6a, nb: 1, rate: 14, s: 0.3, vy: 1.1, l: 0.9, gr: 0.5 },
      { ty: "drift", at: "hn", t: "wgt", c: 0x4a5a2a, nb: 1, rate: 8, s: 0.25, vy: -0.4, g: 3, l: 0.6 },
      { ty: "rune", t: "heal", c: 0x5f7a3a, r: 1.6, o: 0.35 },
    ],
    skel: [
      { ty: "glow", at: "hd", t: "spirit", c: 0x7dffa0, s: [0.4, 1], tr: 8 },
      { ty: "drift", at: "md", t: "wgt", c: 0xe8e0c8, nb: 1, rate: 8, s: 0.15, sp: 0.5, vy: -0.2, g: 2, l: 0.8 },
      { ty: "conv", to: "hd", r: 2, h: 2, t: "wgt", c: 0x7dffa0, rate: 14, s: 0.25, l: 0.5 },
    ],
    mwisp: [
      { ty: "orbit", at: "md", n: [4, 4], r: [1.2, 0.6], w: 9, t: "spirit", c: 0x9fffd0, s: 0.35, tr: 10 },
      { ty: "glow", at: "md", t: "glow", c: 0x9fffd0, s: [0.6, 1.6] },
    ],
    m_knight: [
      { ty: "glow", at: "md", t: "star", c: 0xe0e8ff, s: [0.4, 1.2] },
      { ty: "rise", r: 1.2, t: "wgt", c: 0x8a7a60, nb: 1, rate: 10, s: 0.4, vy: 0.5, sp: 1, l: 0.6 },
    ],
    m_ember: [
      { ty: "glow", at: "md", t: "fire", c: 0xffffff, s: [0.3, 0.9], tr: 8 },
      { ty: "rise", r: 0.8, t: "wgt", c: 0xffa040, rate: 10, s: 0.12, vy: 2, sp: 0.6, l: 0.7 },
    ],
    m_mite: [{ ty: "drift", at: "md", t: "wgt", c: 0x9dff7a, rate: 12, s: 0.16, sp: 1.2, vy: 0.5, l: 0.9 }],
    m_cub: [
      {
        ty: "drift",
        at: "hd",
        t: "wgt",
        c: 0xdff2ff,
        nb: 1,
        rate: 10,
        s: 0.35,
        sp: 0.4,
        vy: 0.3,
        l: 0.7,
        gr: 1.2,
        o: 0.5,
      },
    ],
  };
  CR.bogm = CR.bogl;
  const BOSS = (col, el) => [
    { ty: "rune", t: el, c: col, r: 2.8, o: 0.85 },
    { ty: "rise", r: 2.8, t: "wgt", c: col, rate: 26, s: 0.3, vy: 3.2, l: 0.9 },
    { ty: "conv", to: "hd", r: 3.2, h: 3, t: "wgt", c: col, rate: 20, s: 0.4, l: 0.55 },
    { ty: "glow", at: "hd", t: "glow", c: col, s: [0.6, 1.8] },
  ];
  const DEF = (col) => [
    { ty: "conv", to: "hd", r: 1.8, h: 2, t: "wgt", c: col, rate: 16, s: 0.3, l: 0.45 },
    { ty: "glow", at: "hd", t: "glow", c: col, s: [0.3, 1.0] },
  ];
  // ---------------------------------------------------------------- the effect rig (shared by wizards and creatures)
  // r: { par, g (group in par), sz, q, col, el, list, st[], k, t0, rel, gr, fd (fade ms), rp (release anchor), anc(n, out) }
  const live = [];
  function mkMesh(kind, col) {
    const m = () =>
      new T.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: T.AdditiveBlending,
      });
    const g2 = new T.Group();
    if (kind === "hammer") {
      const hd = new T.Mesh(new T.BoxGeometry(1.25, 0.7, 0.7), m()),
        hh = new T.Mesh(new T.BoxGeometry(0.95, 0.5, 0.5), m()),
        hl = new T.Mesh(new T.CylinderGeometry(0.07, 0.09, 1.7, 8), m());
      hl.position.y = -0.95;
      g2.add(hd, hh, hl);
    } else {
      const a = new T.ConeGeometry(0.2, 1.2, 6),
        b = new T.ConeGeometry(0.11, 0.7, 5);
      a.rotateX(Math.PI / 2);
      b.rotateX(Math.PI / 2);
      b.translate(0.14, 0.05, -0.15);
      g2.add(new T.Mesh(a, m()), new T.Mesh(b, m()));
    }
    g2.traverse((o) => (o.frustumCulled = false));
    return g2;
  }
  const sprM = (e, col) => smat(TX(e.t), e.c == null ? col : e.c, e.nb ? { blending: T.NormalBlending } : null);
  function build(r) {
    r.st = r.list.map((e) => {
      const s = { acc: 0, a: RN() * 6.283, ph: RN() };
      const spr = (n) => {
        s.sp = [];
        for (let i = 0; i < n; i++) {
          const m = new T.Sprite(sprM(e, r.col));
          m.material.opacity = 0;
          m.frustumCulled = false;
          r.g.add(m);
          s.sp.push(m);
        }
      };
      const nq = (n) => Math.max(1, Math.round(lr(n[0], n[1], r.p) * (r.q < 1 ? r.q + 0.25 : 1)));
      if (e.ty === "glow") spr(1);
      else if (e.ty === "orbit") spr(nq(e.n));
      else if (e.ty === "wing") spr(2 * Math.max(3, Math.round(e.n * (r.q < 1 ? 0.7 : 1))));
      else if (e.ty === "row") spr(e.n);
      else if (e.ty === "cloud") {
        spr(Math.max(3, Math.round(e.n * (r.q < 1 ? 0.7 : 1))));
        s.off = s.sp.map(() => [RN() * 6.283, 0.4 + RN() * 0.6, r2() * 0.3]);
      } else if (e.ty === "mesh") {
        s.m = mkMesh(e.g, e.c == null ? r.col : e.c);
        r.g.add(s.m);
      } else if (e.ty === "arc") {
        const geo = new T.BufferGeometry();
        geo.setAttribute("position", new T.BufferAttribute(new Float32Array(9 * 3), 3));
        s.l = new T.Line(
          geo,
          new T.LineBasicMaterial({
            color: e.c == null ? r.col : e.c,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: T.AdditiveBlending,
          }),
        );
        s.l.frustumCulled = false;
        r.g.add(s.l);
      } else if (e.ty === "rune") {
        s.m = new T.Mesh(PL1, bmat({ map: RUNE[e.t] || RUNE.heal, color: e.c == null ? r.col : e.c, opacity: 0 }));
        s.m.rotation.x = -Math.PI / 2;
        s.m.frustumCulled = false;
        r.g.add(s.m);
      }
      return s;
    });
  }
  function dispose(r) {
    const i = live.indexOf(r);
    if (i >= 0) live.splice(i, 1);
    if (r.g.parent) r.g.parent.remove(r.g);
    r.g.traverse((o) => {
      if (o.material) o.material.dispose();
      if (o.geometry && o.geometry !== PL1) o.geometry.dispose();
    });
  }
  // emit motes in the rig's frame (FXP pointed at its parent for the call)
  function em(r, p, o) {
    const pv = FXP;
    FXP = r.par;
    try {
      mote(p, o);
    } finally {
      FXP = pv;
    }
  }
  function emitN(r, s, key, rate, dt, fn) {
    s[key] = (s[key] || 0) + rate * dt;
    let n = 0;
    while (s[key] >= 1 && n++ < 6) {
      s[key]--;
      fn();
    }
    if (s[key] > 1) s[key] = 0;
  }
  function tickRig(r, dt, now) {
    if (!r.par || !r.g.parent) return dispose(r);
    const rk = r.rel ? cl((now - r.rel) / r.fd, 0, 1) : 0;
    if (rk >= 1) return dispose(r);
    const k = r.k,
      sz = r.sz,
      fade = 1 - rk,
      I = (0.35 + 0.65 * ez(k * 1.4)) * fade,
      D = r.rel ? 0 : r.q * r.I * (0.3 + 0.7 * k),
      AC = {};
    // anchors in the rig's frame, worked out once per frame
    const A = (n) => {
      if (AC[n]) return AC[n];
      const v = new T.Vector3();
      r.anc(n, v);
      r.par.worldToLocal(v);
      if (n === "ft") v.y = 0.1;
      return (AC[n] = v);
    };
    const fw = r.fw ? r.fw() : ZX,
      rt = RT.crossVectors(UP, fw).normalize(),
      RP = r.gr && r.rel ? A(r.rp) : null;
    const rush = (m) => {
      if (RP) m.position.lerp(RP, ez(rk));
    };
    r.list.forEach((e, i) => {
      const s = r.st[i],
        col = e.c == null ? r.col : e.c;
      if (e.ty === "glow") {
        const m = s.sp[0],
          p = A(e.at);
        m.position.copy(p);
        rush(m);
        m.scale.setScalar(lr(e.s[0], e.s[1], k) * sz * (1 + (e.pu || 0.12) * Math.sin(now * 0.012 * (1 + k))));
        m.material.opacity = (e.o || 1) * I;
        if (e.tr)
          emitN(r, s, "tr", e.tr * D, dt, () =>
            em(r, V.copy(p).add(V2.set(r2(), r2(), r2()).multiplyScalar(0.2 * sz)), {
              t: TX(e.t),
              c: col,
              s: m.scale.x * 0.35,
              v: [r2() * 0.3, 0.6, r2() * 0.3],
              l: 0.4,
              gr: -0.6,
            }),
          );
      } else if (e.ty === "orbit") {
        const c = A(e.at),
          rr = (Array.isArray(e.r) ? lr(e.r[0], e.r[1], k) : e.r) * sz,
          n = s.sp.length;
        s.a += (e.w || 2) * dt * (0.7 + 0.8 * k);
        s.sp.forEach((m, j) => {
          const a = s.a + (j / n) * 6.283;
          m.position.set(
            c.x + Math.cos(a) * rr,
            c.y + (e.y || 0) * sz + (e.bob ? Math.sin(a * 2 + j) * e.bob * sz : 0),
            c.z + Math.sin(a) * rr,
          );
          rush(m);
          m.scale.setScalar(e.s * sz * (0.6 + 0.5 * k));
          m.material.opacity = (e.o || 1) * I;
          if (e.tr)
            emitN(r, s, "t" + j, (e.tr * D) / Math.max(1, n * 0.5), dt, () =>
              em(r, m.position, { t: TX(e.t), c: col, nb: e.nb, s: e.s * sz * 0.5, l: 0.35, gr: -0.6 }),
            );
        });
      } else if (e.ty === "wing") {
        const B = A("bk"),
          n = s.sp.length / 2,
          L = 2.2 * sz;
        s.sp.forEach((m, j) => {
          const sd = j < n ? 1 : -1,
            u = ((j % n) + 1) / n,
            ang = 0.15 + (0.35 + 0.75 * k) * u,
            fl = Math.sin(now * 0.006 + u * 2) * 0.15 * u * sz,
            d = L * u * (0.45 + 0.55 * k);
          m.position
            .copy(B)
            .addScaledVector(rt, sd * d * Math.cos(ang))
            .addScaledVector(UP, d * Math.sin(ang) * 0.8 + fl)
            .addScaledVector(fw, -0.35 * u * sz);
          rush(m);
          m.scale.setScalar(e.s * sz * (1.1 - 0.5 * u) * (0.6 + 0.5 * k));
          m.material.opacity = I * cl((k - u * 0.5) * 4, 0, 1);
        });
      } else if (e.ty === "row") {
        const B = A("ft")
            .clone()
            .addScaledVector(fw, -1.5 * sz),
          n = s.sp.length;
        s.sp.forEach((m, j) => {
          const ap = cl((k - j / (n + 1)) * 5, 0, 1);
          m.position
            .copy(B)
            .addScaledVector(rt, (j - (n - 1) / 2) * 0.95 * sz)
            .addScaledVector(UP, (1.7 + 0.15 * Math.sin(now * 0.003 + j * 1.3)) * sz);
          rush(m);
          m.scale.setScalar(e.s * sz * (0.5 + 0.5 * ap));
          m.material.opacity = I * ap * (0.8 + 0.2 * Math.sin(now * 0.02 + j * 2));
        });
      } else if (e.ty === "cloud") {
        const c = A(e.at);
        s.a += dt * 0.8;
        s.sp.forEach((m, j) => {
          const o = s.off[j],
            a = o[0] + s.a,
            rr = e.r * sz * o[1] * (0.6 + 0.4 * k);
          m.position.set(c.x + Math.cos(a) * rr, c.y + o[2] * sz, c.z + Math.sin(a) * rr);
          m.scale.setScalar(e.s * sz * (0.5 + 0.8 * k));
          m.material.opacity = 0.75 * I;
        });
        if (e.fl)
          emitN(r, s, "fl", e.fl * D, dt, () =>
            em(r, V.copy(c).add(V2.set(r2() * e.r * sz, r2() * 0.3, r2() * e.r * sz)), {
              c: RN() < 0.5 ? 0xffffff : 0xfff4a0,
              s: 1.4 * sz,
              l: 0.12,
              gr: 0.5,
            }),
          );
      } else if (e.ty === "mesh") {
        const m = s.m,
          sc = e.s * sz * ez(k * 1.15) * (1 + 0.03 * Math.sin(now * 0.03) * k) * (r.gr && r.rel ? 1 + 0.3 * rk : 1);
        m.position.copy(A(e.at));
        m.scale.setScalar(Math.max(0.001, sc));
        if (e.g === "shard") {
          m.quaternion.setFromUnitVectors(ZX, fw);
          m.rotateZ(now * 0.004);
        } else
          m.rotation.set(-0.25, Math.atan2(fw.x, fw.z) + 0.2 * Math.sin(now * 0.002), 0.08 * Math.sin(now * 0.003));
        m.traverse((o) => o.material && (o.material.opacity = 0.6 * I));
      } else if (e.ty === "arc") {
        const a = A(e.a),
          b = A(e.b),
          l = s.l;
        if (r.rel || RN() < (e.fk || 0)) l.visible = false;
        else {
          l.visible = true;
          if (RN() < 0.5) {
            const ps = l.geometry.attributes.position,
              j = e.j * sz * (0.5 + k);
            for (let q = 0; q < 9; q++) {
              const t = q / 8,
                jj = q && q < 8 ? j : 0;
              ps.setXYZ(q, lr(a.x, b.x, t) + r2() * jj, lr(a.y, b.y, t) + r2() * jj, lr(a.z, b.z, t) + r2() * jj);
            }
            ps.needsUpdate = true;
          }
        }
        l.material.opacity = I * (0.6 + 0.4 * RN());
      } else if (e.ty === "rune") {
        const p = A(e.at || "ft");
        s.m.position.set(p.x, 0.14 + i * 0.004, p.z);
        s.m.rotation.z += dt * (0.5 + 2 * k);
        s.m.scale.setScalar((e.r || 2) * sz * 2 * (0.4 + 0.6 * ez(k * 1.3)));
        s.m.material.opacity = (e.o || 0.7) * I;
      } else if (e.ty === "conv") {
        emitN(r, s, "e", e.rate * D, dt, () => {
          const to = A(e.to),
            c0 = e.rc ? to : A("ft"),
            a = RN() * 6.283,
            rr = e.r * sz * (0.7 + 0.3 * RN()),
            l = e.l || 0.5;
          V.set(
            c0.x + Math.cos(a) * rr,
            e.rc ? c0.y + r2() * e.h * sz : 0.2 + RN() * e.h * sz,
            c0.z + Math.sin(a) * rr,
          );
          em(r, V, {
            t: TX(e.t),
            c: col,
            nb: e.nb,
            s: e.s * sz,
            v: V2.copy(to)
              .sub(V)
              .multiplyScalar(SPD / l),
            l,
            g: 0,
            gr: e.gr == null ? -0.6 : e.gr,
            fi: 0.25,
            o: e.o,
          });
        });
      } else if (e.ty === "rise") {
        emitN(r, s, "e", e.rate * D, dt, () => {
          const c = A(e.at || "ft"),
            a = RN() * 6.283,
            rr = e.r * sz * Math.sqrt(RN());
          V.set(c.x + Math.cos(a) * rr, c.y + 0.1, c.z + Math.sin(a) * rr);
          em(r, V, {
            t: TX(e.t),
            c: col,
            nb: e.nb,
            s: e.s * sz * (0.7 + 0.6 * RN()),
            v: [r2() * (e.sp || 0.3), e.vy * sz * (0.7 + 0.6 * RN()), r2() * (e.sp || 0.3)],
            l: e.l || 0.8,
            g: e.g == null ? -0.3 : e.g,
            gr: e.gr == null ? -0.4 : e.gr,
            sp: e.t === "leaf" || e.t === "flk" ? 2 : 0,
            o: e.o,
          });
        });
      } else if (e.ty === "drift") {
        emitN(r, s, "e", e.rate * D, dt, () => {
          const c = A(e.at),
            j = (e.j || 0.25) * sz;
          V.set(c.x + r2() * j, c.y + r2() * j * 0.5, c.z + r2() * j);
          em(r, V, {
            t: TX(e.t),
            c: col,
            nb: e.nb,
            s: e.s * sz * (0.7 + 0.6 * RN()),
            v: [r2() * (e.sp || 0.3), (e.vy || 0) * sz, r2() * (e.sp || 0.3)],
            l: e.l || 0.6,
            g: e.g || 0,
            gr: e.gr == null ? -0.4 : e.gr,
            o: e.o,
          });
        });
      } else if (e.ty === "spiral") {
        s.ph += dt * (e.w || 1) * (0.7 + 0.6 * k);
        emitN(r, s, "e", e.rate * D, dt, () => {
          const F = A(e.from),
            Tt = A(e.to),
            u = (s.ph + RN() * 0.15) % 1,
            a = u * 12 + now * 0.002,
            rr = e.r * sz * (1 - u * 0.7);
          V.lerpVectors(F, Tt, u).add(V2.set(Math.cos(a) * rr, 0, Math.sin(a) * rr));
          em(r, V, {
            t: TX(e.t),
            c: col,
            nb: e.nb,
            s: e.s * sz,
            v: [0, 0.3, 0],
            l: 0.55,
            g: 0,
            gr: -0.5,
            sp: e.t === "leaf" ? 2 : 0,
          });
        });
      }
    });
  }
  function rig(o) {
    const r = Object.assign({ k: 0, rel: 0, gr: 1, I: 1, p: 0.5, t0: performance.now() }, o);
    r.g = new T.Group();
    r.g.userData.lus = 1;
    r.par.add(r.g);
    build(r);
    live.push(r);
    return r;
  }
  // ---------------------------------------------------------------- wizards
  let wz = null; // { ch (CHG handle), obj, pt, pose, r (rig), t0, rel }
  const partsOf = (o) => (o === W ? WPT : o.__pt || (o.__pt = rigParts(o)));
  function lanOf(o) {
    if (o === W) return orb;
    if (o.__lan === undefined) {
      o.__lan = null;
      o.traverse((m) => {
        if (!o.__lan && m.userData && m.userData.orb === 1) o.__lan = m;
      });
    }
    return o.__lan;
  }
  function wizAnc(obj, pt) {
    return (n, out) => {
      if (n === "hl" || n === "hr") {
        const e = n === "hl" ? pt.EL : pt.ER;
        if (e) return e.localToWorld(out.set(0, -0.55, 0));
        return obj.localToWorld(out.set(n === "hl" ? 0.6 : -0.6, 1.8, 0.5));
      }
      if (n === "md") {
        const a = pt.EL ? pt.EL.localToWorld(T1.set(0, -0.55, 0)) : obj.localToWorld(T1.set(0.6, 1.8, 0.5)),
          b = pt.ER ? pt.ER.localToWorld(T2.set(0, -0.55, 0)) : obj.localToWorld(T2.set(-0.6, 1.8, 0.5));
        return out.copy(a).add(b).multiplyScalar(0.5);
      }
      if (n === "ln" || n === "tip") {
        const ln = lanOf(obj);
        if (ln) ln.getWorldPosition(out);
        else obj.localToWorld(out.set(0, 3.8, 0.4));
        if (n === "tip") out.add(obj.localToWorld(T1.set(0, 0, 0.9)).sub(obj.getWorldPosition(T2)));
        return out;
      }
      const L = {
        ft: [0, 0, 0],
        hd: [0, 4.9, 0.1],
        cl: [0, 6.8, 0.2],
        up: [0, 7.2, 0.7],
        up2: [0, 6.1, -0.3],
        bk: [0, 2.8, -0.5],
      }[n] || [0, 2.4, 0];
      return obj.localToWorld(out.set(L[0], L[1], L[2]));
    };
  }
  function lookOf(c, el) {
    const k = c && c.k;
    if (k && WZ[k]) return WZ[k];
    const f = FB[el] || FB.spirit;
    return WZ[f[c && c.aoe ? 1 : 0]];
  }
  function wizStart(ch, c, opt) {
    if (!ch) return;
    wizEnd(1);
    const obj = (opt && opt.obj) || W,
      pt = partsOf(obj),
      lk = lookOf(c, ch.el),
      par = typeof FXP !== "undefined" && FXP ? FXP : S;
    const fwF = () => {
      const p = obj.getWorldPosition(new T.Vector3()),
        q = obj.localToWorld(new T.Vector3(0, 0, 1));
      par.worldToLocal(p);
      par.worldToLocal(q);
      q.sub(p);
      q.y = 0;
      return q.lengthSq() > 1e-6 ? q.normalize() : ZX.clone();
    };
    wz = {
      ch,
      obj,
      pt,
      pose: PO[lk.p] || PO.bolt,
      t0: performance.now(),
      rel: 0,
      r: rig({
        par,
        sz: 1,
        q: ch.q || qual(),
        p: ch.p == null ? 0.5 : ch.p,
        col: COL[ch.el] || 0xc39bff,
        el: ch.el,
        list: lk.fx,
        fd: 320,
        rp: "ln",
        anc: wizAnc(obj, pt),
        fw: fwF,
      }),
    };
  }
  function wizRel(gr) {
    if (!wz || wz.rel) return;
    wz.rel = performance.now();
    wz.r.rel = wz.rel;
    wz.r.gr = gr ? 1 : 0;
  }
  function wizEnd() {
    if (!wz) return;
    dispose(wz.r);
    wz = null;
  }
  function applyPose(w, now) {
    const pt = w.pt,
      t = (now - w.t0) / 1000,
      wt = ez((now - w.t0) / 260) * (w.rel ? 1 - ez((now - w.rel) / 300) : 1);
    if (!pt || !pt.AL || !pt.AR || wt <= 0) return;
    const P = w.pose(w.r.k, t),
      bl = (o, key, v) => (o[key] += (v - o[key]) * wt);
    bl(pt.AL.rotation, "x", P.al[0]);
    bl(pt.AL.rotation, "z", P.al[1]);
    bl(pt.AR.rotation, "x", P.ar[0]);
    bl(pt.AR.rotation, "z", P.ar[1]);
    if (pt.EL && P.el != null) bl(pt.EL.rotation, "x", P.el);
    if (pt.ER && P.er != null) {
      bl(pt.ER.rotation, "x", P.er);
      if (pt.STF) pt.STF.rotation.x = -pt.ER.rotation.x;
    }
    if (pt.HEAD) {
      bl(pt.HEAD.rotation, "x", P.hx || 0);
      bl(pt.HEAD.rotation, "y", 0);
    }
    if (P.ln != null) bl(w.obj.rotation, "x", P.ln);
    w.obj.updateMatrixWorld(true);
  }
  // ---------------------------------------------------------------- creatures
  const CC = new Map(); // foe model -> rig
  let pend = null; // { o, t } model whose wind-up pose just started
  function boxOf(o) {
    const u = o.userData || (o.userData = {});
    if (!u.__cpb) {
      o.updateWorldMatrix(true, true);
      const b = new T.Box3().setFromObject(o),
        p = o.getWorldPosition(new T.Vector3());
      u.__cpb = b.isEmpty() ? { h: 2.2 } : { h: cl(b.max.y - p.y, 0.8, 14) };
    }
    return u.__cpb;
  }
  function keyOf(o) {
    try {
      const id = typeof FOESFX !== "undefined" && FOESFX.who ? FOESFX.who(o) : null;
      if (id && id.k) return id.k;
    } catch (e) {}
    const u = o.userData || {};
    if (u.sfk) return u.sfk === "gloom" ? "g" + cl(u.sft || 1, 1, 5) : u.sfk;
    return "";
  }
  function crAnc(o, H) {
    const u = o.userData || {};
    const arm = (i, out) => {
      const a = u.arms && u.arms[i];
      if (!a) return null;
      const c = a.userData && a.userData.cl;
      return c ? c.getWorldPosition(out) : a.localToWorld(out.set(0, -0.9, 0));
    };
    return (n, out) => {
      if (n === "hd") {
        if (u.hd && u.hd.isObject3D) return u.hd.getWorldPosition(out);
        return o.getWorldPosition(out).add(T1.set(0, H * 0.85, 0));
      }
      if (n === "hn" || n === "hn2") {
        if (arm(n === "hn" ? 0 : 1, out)) return out;
        return o.getWorldPosition(out).add(T1.set(0, H * 0.55, 0));
      }
      o.getWorldPosition(out);
      if (n === "md") out.y += H * 0.5;
      else if (n === "top") out.y += H * 1.05;
      return out;
    };
  }
  function crStart(o, M, opt) {
    if (!o || !M || !o.parent) return;
    crEnd(o, 0, 1);
    const H = boxOf(o).h,
      k = keyOf(o),
      el = SP[M.el] ? M.el : "spirit",
      col = (typeof EHX !== "undefined" && EHX[el]) || COL[el] || 0xc9a0ff,
      boss = /^(rb|dkb)\d+$/.test(k),
      melee = !(M.rng || M.tg === "all" || M.tg === "debuff" || M.tg === "summon" || M.tg === "heal"),
      base = boss ? BOSS(col, RUNE[el] ? el : "spirit") : CR[k] || DEF(col),
      list = melee ? base.concat([DUST]) : base;
    let par = (opt && opt.par) || (typeof FXP !== "undefined" && FXP) || S;
    const r = rig({
      par,
      sz: cl(H / 2.6, 0.6, boss ? 3.2 : 2.4),
      q: qual() * (opt && opt.q ? 0.6 : 1),
      p: boss ? 1 : 0.6,
      I: melee ? 0.55 : 1,
      col,
      el,
      list,
      fd: 220,
      rp: "hd",
      anc: crAnc(o, H),
      dur: melee ? 700 : 1000,
      obj: o,
    });
    CC.set(o, r);
  }
  function crEnd(o, gr, now) {
    const r = CC.get(o);
    if (!r) return;
    CC.delete(o);
    if (now) return dispose(r);
    if (!r.rel) {
      r.rel = performance.now();
      r.gr = gr ? 1 : 0;
    }
  }
  // ---------------------------------------------------------------- per-frame tick (right before each render)
  let last = performance.now();
  function tick() {
    const now = performance.now(),
      dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!live.length && !wz) return;
    const fight = typeof mode !== "undefined" && (mode === "battle" || mode === "guest");
    if (wz) {
      if (!fight || !wz.obj.parent) wizEnd(1);
      else {
        const cur = CHG.cur && CHG.cur();
        if (!wz.rel) {
          if (cur === wz.ch && !wz.ch.rel) wz.r.k = cur.kk || 0;
          else wizRel(wz.ch.rel ? 1 : 0); // released inside CHG (watching someone else: auto release) or dropped
        }
        applyPose(wz, now);
        if (wz.rel && now - wz.rel > 340) wz = null;
      }
    }
    CC.forEach((r, o) => {
      if (!o.parent || (!fight && typeof mode !== "undefined" && mode !== "explore")) return crEnd(o, 0, 1);
      r.k = cl((now - r.t0) / r.dur, 0, 1);
      if (now - r.t0 > 3500) crEnd(o, 0);
    });
    for (let i = live.length - 1; i >= 0; i--)
      try {
        tickRig(live[i], dt, now);
      } catch (e) {
        console.warn("castpose", e);
        dispose(live[i]);
      }
  }
  if (typeof WONDR !== "undefined" && WONDR.pre) WONDR.pre(tick);
  else
    (function f() {
      tick();
      requestAnimationFrame(f);
    })();
  // ---------------------------------------------------------------- hooks
  const safe = (fn) => {
    try {
      fn();
    } catch (e) {
      console.warn("castpose", e);
    }
  };
  if (typeof CHG !== "undefined" && CHG.start) {
    const s0 = CHG.start,
      st0 = CHG.stop,
      k0 = CHG.kill;
    CHG.start = function (c, opt) {
      const h = s0.apply(this, arguments);
      safe(() => wizStart(h, c, opt));
      return h;
    };
    CHG.stop = function (h, gr) {
      safe(() => wz && wz.ch === h && wizRel(gr));
      return st0.apply(this, arguments);
    };
    CHG.kill = function () {
      safe(() => wz && wizRel(0));
      return k0.apply(this, arguments);
    };
  }
  if (typeof FMV !== "undefined" && FMV) {
    const p0 = FMV.pose,
      w0 = FMV.wind,
      f0 = FMV.fx;
    FMV.pose = function (o, an, ph) {
      safe(() => {
        if (!o || !an || an === "hurt") return;
        if (ph) crEnd(o, 1);
        else pend = { o, t: performance.now() };
      });
      return p0.apply(this, arguments);
    };
    FMV.wind = function (M, src, o) {
      safe(() => {
        let m = pend && performance.now() - pend.t < 250 ? pend.o : null;
        pend = null;
        if (!m && src && typeof g !== "undefined" && g && Array.isArray(g.foes)) {
          const f = g.foes.find((q) => q && q.m && q.m.position.distanceTo(src) < 0.6);
          m = f && f.m;
        }
        if (m) crStart(m, M, { par: o && o.par, q: o && o.q });
      });
      return w0.apply(this, arguments);
    };
    FMV.fx = function (M, src) {
      safe(() =>
        CC.forEach((r, m) => {
          if (!src || m.position.distanceTo(src) < 1.5) crEnd(m, 1);
        }),
      );
      return f0.apply(this, arguments);
    };
  }
  return { PO, WZ, CR, FB, live: () => live.length };
})();
