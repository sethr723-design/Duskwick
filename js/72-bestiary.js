// DUSKWICK - 72-bestiary.js (v48b): painted beasts. Loads LAST. Only top-level name: BESTIA.
// One builder (make(spec)) for four-legged creatures in the style of Hearthfang (44): a single painted body lathe, a
// long-snouted head with a hinged jaw and glowing eyes, flame-lick ears / ruffs / mane, jointed legs (hip > thigh >
// knee > paw), a tail of linked tufts, plus per-creature parts (crystal antlers, ice spines, leaves and flowers, three
// spirit tails...). Skins are SPFX's painted fur/tuft maps (44 `skin`/`skinM`), extra palettes added to SPFX.SKD here.
// Every group's meshes are merged per material after building, so a beast is ~40 draw calls, not ~200.
//  - Foes: `beast(kind)` (02) is replaced for SPEC kinds wolf (Frostfen) and hound (Cinderwaste); one template per kind
//    is built once and cloned (fresh materials per copy, shared geometry and textures). The result keeps 02's interface
//    (userData L = 4 hip pivots with rest 0, hd, tail, run) so animBeast / FMV.poseB / every mkFoe wrap still work.
//    World foes built before this file loaded are swapped in place (same scene-child index, f.o / f.s0 / f.au carried).
//    animBeast is wrapped for the tail wave, panting jaw, ear twitches and glow flicker.
//  - Summons (45): BESTIA.summon(t) builds one, BESTIA.idle(u, i, s) animates it (pose knobs ck / lp / jk like
//    Hearthfang). Keys: gcat Galecat (storm), rhorn Rimehorn (ice), mback Mossback (verdant), sfox Soulfox (spirit).
// Don't put object refs in a template's userData (Object3D.clone JSON-copies userData); link() fills it per copy.
const BESTIA = (() => {
  const PI = Math.PI,
    V = (x, y, z) => new T.Vector3(x, y, z),
    UP = V(0, 1, 0),
    X = SPFX,
    lickG = X.lickG,
    bend = X.bend,
    toon = (c, em, ei) =>
      new T.MeshToonMaterial({
        color: c,
        gradientMap: GR,
        emissive: em || 0,
        emissiveIntensity: ei == null ? 0.7 : ei,
      }),
    flat = (g) => g.rotateX(PI / 2), // a y-lathe laid along +z
    LtS = (p, s) => GEOX.sn(Lt(p, s)), // v48d: seam-free smooth normals
    glowS = (col, s) => {
      const q = new T.Sprite(smat(WGT, col));
      q.scale.setScalar(s);
      return q;
    };
  // ---------- extra painted skins (see 44 SKD for the fields) ----------
  const cool = { fl: "rgba(255,255,255,.18)", fd: "rgba(20,30,60,.2)" };
  // v48e: natural markings per creature (44 skin `pat`), no swirl marks
  Object.assign(X.SKD, {
    // frost wolf: slate-blue saddle and darker stripes over pale fur, white belly
    frostfur: Object.assign(
      {
        c: ["#3e4c6c", "#6a84ac", "#a8c0e0", "#dceaff"],
        g: ["#000000", "#000000", "#000000", "#000000"],
        belly: "#f2f8ff",
        pat: [
          { t: "saddle", c: "rgba(30,40,70,.55)", w: 0.24 },
          { t: "stripe", c: "rgba(30,40,70,.25)", n: 5 },
          { t: "mottle", n: 20, a: 0.07 },
        ],
        fur: 1400,
        seed: 51,
        ec: 0xbfefff,
      },
      cool,
    ),
    // Rimehorn: fawn-dappled back (rows of pale spots) on frosted blue-grey, white belly
    stagfur: Object.assign(
      {
        c: ["#56688c", "#7c94bc", "#a4bcdc", "#cddcf2"],
        g: ["#000000", "#000000", "#000000", "#000000"],
        belly: "#f4f8ff",
        pat: [
          { t: "saddle", c: "rgba(40,50,80,.35)", w: 0.18 },
          { t: "spot", c: "rgba(255,255,255,.75)", n: 46 },
          { t: "mottle", n: 16, a: 0.06 },
        ],
        fur: 1000,
        seed: 57,
        ec: 0xbfefff,
      },
      cool,
    ),
    frosttuft: Object.assign(
      {
        c: ["#4e6288", "#8ea8d4", "#d0e4ff", "#ffffff"],
        g: ["#000000", "#000814", "#2a5a8a", "#c8f0ff"],
        fur: 800,
        seed: 53,
        ec: 0xbfefff,
      },
      cool,
    ),
    // ember hound: charcoal with a black saddle and coals glowing through the belly fur
    emberfur: {
      c: ["#140c0c", "#22140f", "#341a10", "#462414"],
      g: ["#000000", "#000000", "#000000", "#000000"],
      belly: "#5a2a14",
      pat: [
        { t: "saddle", c: "rgba(0,0,0,.6)", w: 0.22 },
        { t: "ember", c: "rgba(255,110,30,.55)", n: 14 },
        { t: "speckle", n: 120, a: 0.18 },
      ],
      fur: 1200,
      seed: 61,
      fl: "rgba(255,140,60,.07)",
      fd: "rgba(0,0,0,.25)",
      ec: 0xff7a2a,
    },
    embertuft: {
      c: ["#160a08", "#4a1608", "#ff5a10", "#ffd060"],
      g: ["#000000", "#0c0300", "#b0400c", "#ffd890"],
      fur: 700,
      seed: 63,
      ec: 0xffa040,
    },
    // Galecat: lynx spots and rosettes on indigo, faint bars over the haunches, pale belly
    stormfur: {
      c: ["#22224c", "#343f7c", "#5060b0", "#7484d8"],
      g: ["#000000", "#000000", "#000000", "#000000"],
      belly: "#c4d0ff",
      pat: [
        { t: "saddle", c: "rgba(10,10,40,.35)", w: 0.2 },
        { t: "spot", c: "rgba(12,12,40,.6)", n: 40 },
        { t: "spot", c: "rgba(12,12,40,.55)", n: 18, r: 1 },
        { t: "stripe", c: "rgba(12,12,40,.22)", n: 4 },
      ],
      fur: 1300,
      seed: 71,
      fl: "rgba(200,210,255,.14)",
      fd: "rgba(10,10,40,.2)",
      ec: 0xbcd4ff,
    },
    stormtuft: {
      c: ["#262666", "#4656bc", "#8aa6ff", "#f2f8ff"],
      g: ["#000000", "#080c2a", "#4a68e0", "#e8f4ff"],
      fur: 700,
      seed: 73,
      fl: "rgba(200,210,255,.14)",
      fd: "rgba(10,10,40,.2)",
      ec: 0xbcd4ff,
    },
    // Mossback: shaggy moss with lighter lichen patches and seed flecks, a darker back
    mossfur: {
      c: ["#26341a", "#3a5222", "#54722e", "#73923e"],
      g: ["#000000", "#000000", "#000000", "#000000"],
      belly: "#a8b878",
      pat: [
        { t: "saddle", c: "rgba(15,25,8,.4)", w: 0.25 },
        { t: "mottle", n: 34, a: 0.14 },
        { t: "speckle", n: 160, a: 0.22 },
      ],
      fur: 1600,
      seed: 81,
      fl: "rgba(220,255,160,.16)",
      fd: "rgba(10,25,5,.24)",
      ec: 0xb8ff80,
    },
    // leaves: a midrib and veins
    leaf: {
      c: ["#24501a", "#36822a", "#76bc48", "#ccff88"],
      g: ["#000000", "#020600", "#1e5a0c", "#a8ff68"],
      pat: [{ t: "barb", c: "rgba(230,255,190,.45)" }],
      fur: 200,
      seed: 83,
      ec: 0xb8ff80,
    },
    // Soulfox: fox-dark back and a pale chest, a scatter of faint star flecks
    spiritfur: {
      c: ["#281846", "#462874", "#7450ac", "#b48ee4"],
      g: ["#06001a", "#0e0426", "#26104c", "#44207a"],
      belly: "#e6d6ff",
      pat: [
        { t: "saddle", c: "rgba(20,5,45,.5)", w: 0.2 },
        { t: "speckle", n: 90, a: 0.35 },
      ],
      fur: 1000,
      seed: 91,
      fl: "rgba(230,210,255,.15)",
      fd: "rgba(20,5,40,.2)",
      ec: 0xd8b8ff,
    },
    spirittuft: {
      c: ["#361866", "#7448c0", "#bea0ff", "#ffffff"],
      g: ["#0a0020", "#2c1066", "#9670ff", "#ffffff"],
      fur: 600,
      seed: 93,
      ec: 0xd8b8ff,
    },
  });
  // ---------- creatures ----------
  // fur/tuft skins, ef/et glow, eye/glow colours, claw (+clawE), fang, proportions (leg, bulk, len, neck, snout, head),
  // ears flame|wolf|lynx|round|fox, ruff (cheek licks), mane (scale, 0 none), spine licks|crystal|leaves, antler,
  // chin tuft|icicle, tail plume|fox3|stub (+links), tip fire|spark|wisp, fires [[y, z, s]], sparks, hoof, ghost,
  // collar (charm colour), aura, foe (angry brows, slit pupils), ol (outline, default on)
  const SPEC = {
    wolf: {
      fur: "frostfur",
      tuft: "frosttuft",
      ef: 0.7,
      et: 0.9,
      eye: 0xdff8ff,
      glow: 0x7ad8ff,
      claw: 0xdff4ff,
      clawE: 0x3a8aba,
      fang: 0xffffff,
      ears: "wolf",
      snout: 1.1,
      mane: 0.95,
      spine: "crystal",
      chin: "icicle",
      tail: "plume",
      aura: 0x7ad8ff,
      foe: 1,
    },
    hound: {
      fur: "emberfur",
      tuft: "embertuft",
      ef: 1,
      et: 1.1,
      eye: 0xffd070,
      glow: 0xff7a2a,
      claw: 0x3a2418,
      clawE: 0xff5a10,
      fang: 0xfff0d0,
      ears: "flame",
      bulk: 1.05,
      mane: 1.15,
      spine: "licks",
      chin: "tuft",
      tail: "plume",
      tip: "fire",
      fires: [
        [2.3, 0.55, 1.9],
        [2.0, -0.35, 1.4],
      ],
      aura: 0xff5a10,
      foe: 1,
    },
    gcat: {
      fur: "stormfur",
      tuft: "stormtuft",
      ef: 0.9,
      et: 1.1,
      eye: 0xf0f8ff,
      glow: 0x9ab8ff,
      claw: 0xe8f0ff,
      clawE: 0x6a8aff,
      fang: 0xffffff,
      ears: "lynx",
      ruff: 5,
      snout: 0.72,
      len: 0.95,
      leg: 1.05,
      bulk: 0.9,
      mane: 1.2,
      tail: "plume",
      links: 5,
      tip: "spark",
      sparks: 1,
      collar: 0xbcd4ff,
      aura: 0x7a9aff,
    },
    rhorn: {
      fur: "stagfur",
      tuft: "frosttuft",
      ef: 0.75,
      et: 0.95,
      eye: 0xe0faff,
      glow: 0x8ae0ff,
      ears: "wolf",
      earS: 0.75,
      antler: 1,
      chin: "icicle",
      mane: 0.85,
      spine: "crystal",
      tail: "stub",
      snout: 1.25,
      neck: 1.3,
      leg: 1.2,
      bulk: 1.15,
      len: 1.05,
      hoof: 0x2a3a5a,
      ruff: 2,
      aura: 0x8ae0ff,
    },
    mback: {
      fur: "mossfur",
      tuft: "leaf",
      ef: 0.8,
      et: 1,
      eye: 0xfff6c0,
      glow: 0xb8ff80,
      claw: 0xd8c8a0,
      clawE: 0x2a2a10,
      fang: 0xf0ead0,
      ears: "round",
      ruff: 3,
      snout: 0.7,
      bulk: 1.45,
      leg: 0.85,
      len: 0.95,
      neck: 0.6,
      head: 1.2,
      mane: 0.9,
      spine: "leaves",
      tail: "stub",
      collar: 0xffb0d8,
      aura: 0x9aff70,
    },
    sfox: {
      fur: "spiritfur",
      tuft: "spirittuft",
      ef: 1,
      et: 1.2,
      eye: 0xffffff,
      glow: 0xd8b0ff,
      claw: 0xf0e0ff,
      clawE: 0x9a70ff,
      fang: 0xffffff,
      ears: "fox",
      ruff: 3,
      snout: 1.15,
      bulk: 0.8,
      leg: 0.95,
      len: 0.9,
      mane: 0.7,
      tail: "fox3",
      tip: "wisp",
      ghost: 1,
      ol: false,
      aura: 0xb48aff,
    },
  };
  // ---------- geometry merge (per group, per material) ----------
  function mergeG(gs) {
    let nv = 0,
      ni = 0;
    gs.forEach((g) => {
      nv += g.attributes.position.count;
      ni += g.index ? g.index.count : g.attributes.position.count;
    });
    const P = new Float32Array(nv * 3),
      N = new Float32Array(nv * 3),
      U = new Float32Array(nv * 2),
      I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let v = 0,
      k = 0;
    gs.forEach((g) => {
      const p = g.attributes.position,
        n = g.attributes.normal,
        uv = g.attributes.uv,
        c = p.count;
      P.set(p.array.subarray(0, c * 3), v * 3);
      if (n) N.set(n.array.subarray(0, c * 3), v * 3);
      if (uv) U.set(uv.array.subarray(0, c * 2), v * 2);
      if (g.index) for (let i = 0; i < g.index.count; i++) I[k++] = g.index.array[i] + v;
      else for (let i = 0; i < c; i++) I[k++] = v + i;
      v += c;
      g.dispose();
    });
    const o = new T.BufferGeometry();
    o.setAttribute("position", new T.BufferAttribute(P, 3));
    o.setAttribute("normal", new T.BufferAttribute(N, 3));
    o.setAttribute("uv", new T.BufferAttribute(U, 2));
    o.setIndex(new T.BufferAttribute(I, 1));
    o.computeBoundingSphere();
    return o;
  }
  function mergeAll(root) {
    const groups = [];
    root.traverse((o) => {
      if (!o.isMesh && !o.isSprite) groups.push(o);
    });
    groups.forEach((grp) => {
      const bins = new Map();
      grp.children.forEach((m) => {
        if (!m.isMesh || !m.geometry.attributes.position) return;
        const key = m.material.uuid + (m.userData.nol ? "|n" : "");
        if (!bins.has(key)) bins.set(key, []);
        bins.get(key).push(m);
      });
      bins.forEach((L) => {
        if (L.length < 2) return;
        const gs = L.map((m) => {
            m.updateMatrix();
            return m.geometry.clone().applyMatrix4(m.matrix);
          }),
          out = new T.Mesh(mergeG(gs), L[0].material);
        if (L[0].userData.nol) out.userData.nol = 1;
        L.forEach((m) => {
          grp.remove(m);
          m.geometry.dispose();
        });
        grp.add(out);
      });
    });
  }
  // ---------- the builder ----------
  function make(sp) {
    const o = new T.Group(),
      b = new T.Group(),
      nm = (q, n) => ((q.name = n), q);
    b.rotation.order = "YXZ"; // summons pitch about their own side axis after turning to the foes
    o.add(nm(b, "bxB"));
    const mf = X.skinM(sp.fur, sp.ef == null ? 0.9 : sp.ef),
      mt = X.skinM(sp.tuft, sp.et == null ? 1.05 : sp.et),
      clawM = toon(sp.claw || 0xffd860, sp.clawE == null ? 0xffa020 : sp.clawE, sp.clawE == null ? 1 : 0.6),
      fangM = toon(sp.fang || 0xffd860, 0x2a2a2a, 0.3),
      nose = toon(0x1e0a10, 0, 0),
      ice = toon(0xd8f6ff, 0x5ab8ff, 0.55),
      eyeM = new T.MeshBasicMaterial({ color: sp.eye || 0xfff2b8 });
    mf.userData.bxk = "f";
    mt.userData.bxk = "t";
    if (sp.ghost)
      [mf, mt].forEach((m) => {
        m.transparent = true;
        m.opacity = 0.84;
      });
    const Lg = sp.leg || 1,
      bk = sp.bulk || 1,
      ln = sp.len || 1,
      nk = sp.neck || 1,
      sn = sp.snout || 1,
      sq = Math.sqrt(bk),
      add = (par, g, m, x, y, z) => {
        const q = new T.Mesh(g, m);
        q.position.set(x || 0, y || 0, z || 0);
        par.add(q);
        return q;
      };
    // ---- torso ----
    const ty = 1.3 * Lg + (bk - 1) * 0.3;
    const torso = add(
      b,
      flat(
        LtS(
          [
            [0.001, 0],
            [0.3 * bk, 0.08 * ln],
            [0.4 * bk, 0.32 * ln],
            [0.35 * bk, 0.82 * ln],
            [0.42 * bk, 1.25 * ln],
            [0.52 * bk, 1.62 * ln],
            [0.46 * bk, 1.95 * ln],
            [0.2 * bk, 2.12 * ln],
            [0.001, 2.15 * ln],
          ],
          28,
        ),
      ),
      mf,
      0,
      ty,
      -1.05 * ln,
    );
    torso.rotation.x = -0.1;
    torso.scale.set(0.8, 1, 1);
    // ---- neck ----
    const nb = V(0, ty + 0.25 * bk, 0.8 * ln);
    const neck = add(
      b,
      LtS(
        [
          [0.36 * bk, 0],
          [0.32 * bk, 0.3 * nk],
          [0.27 * bk, 0.6 * nk],
          [0.25 * bk, 0.78 * nk],
        ],
        20,
      ),
      mf,
      nb.x,
      nb.y,
      nb.z,
    );
    neck.rotation.x = 0.75;
    neck.scale.set(0.85, 1, 1);
    // ---- head ----
    const hd = nm(new T.Group(), "bxHd");
    hd.position.set(0, nb.y + 0.57 * nk + 0.05, nb.z + 0.53 * nk + 0.08);
    hd.scale.setScalar(sp.head || 1);
    b.add(hd);
    add(hd, new T.SphereGeometry(0.34, 22, 16), mf).scale.set(0.92, 0.85, 1);
    const snout = add(
      hd,
      flat(
        LtS(
          [
            [0.24, 0],
            [0.22, 0.2],
            [0.17, 0.4],
            [0.12, 0.55],
            [0.001, 0.6],
          ],
          20,
        ),
      ),
      mf,
      0,
      -0.06,
      0.12,
    );
    snout.scale.set(1, 0.78, sn);
    add(hd, new T.SphereGeometry(0.075, 12, 10), nose, 0, -0.03, 0.12 + 0.56 * sn).scale.set(1.25, 0.8, 1);
    const jaw = nm(new T.Group(), "bxJaw");
    jaw.position.set(0, -0.18, 0.1);
    hd.add(jaw);
    add(
      jaw,
      flat(
        LtS(
          [
            [0.17, 0],
            [0.15, 0.25],
            [0.08, 0.48],
            [0.001, 0.52],
          ],
          16,
        ),
      ),
      mf,
    ).scale.set(1, 0.42, sn);
    const mg = nm(glowS(sp.glow || 0xffa040, 0.7), "bxMg");
    mg.position.set(0, -0.12, 0.12 + 0.3 * sn);
    hd.add(mg);
    [-1, 1].forEach((s) => {
      const fg = add(hd, new T.ConeGeometry(0.025, 0.11, 6), fangM, s * 0.08, -0.2, 0.12 + 0.38 * sn);
      fg.rotation.x = PI;
    });
    // eyes (slit pupils on foes), brows, cheek ruffs
    [-1, 1].forEach((s, k) => {
      const e = add(hd, new T.SphereGeometry(0.062, 12, 10), eyeM, s * 0.16, 0.06, 0.26);
      e.scale.set(1, 0.8, 1);
      e.userData.nol = 1;
      if (sp.foe) {
        const pu = add(hd, new T.SphereGeometry(0.03, 8, 6), nose, s * 0.165, 0.06, 0.315);
        pu.scale.set(0.4, 1.3, 0.4);
        pu.userData.nol = 1;
      }
      const eg = nm(glowS(sp.glow || 0xffc860, 0.36), "bxEy" + k);
      eg.position.copy(e.position);
      hd.add(eg);
      const br = add(hd, lickG(0.05, 0.3, -0.8, "z"), mt, s * 0.14, 0.16, 0.22);
      br.rotation.set(sp.foe ? -1.3 : -1.05, 0, -s * (sp.foe ? -0.25 : 0.5));
      const nr = sp.ruff == null ? 4 : sp.ruff;
      for (let j = 0; j < nr; j++) {
        const c = add(hd, lickG(0.08, 0.42 - j * 0.04, -0.5, "z"), mt, s * 0.26, -0.12 + j * 0.08, -0.04);
        c.rotation.set(-1.5 - j * 0.15, 0, -s * (0.55 + j * 0.12));
      }
    });
    if (sp.chin === "tuft") add(hd, lickG(0.07, 0.3, 0.5, "z"), mt, 0, -0.26, 0.22).rotation.x = PI - 0.35;
    if (sp.chin === "icicle")
      for (let j = -1; j <= 1; j++) {
        const c = add(hd, new T.ConeGeometry(0.035, 0.24 - Math.abs(j) * 0.07, 5), ice, j * 0.06, -0.34, 0.2);
        c.rotation.x = PI;
      }
    // ears on pivots (twitch / flatten)
    const es = sp.earS || 1;
    [-1, 1].forEach((s, k) => {
      const p = nm(new T.Group(), "bxE" + k);
      p.position.set(s * 0.19, 0.24, -0.06);
      p.scale.setScalar(es);
      const ty2 = sp.ears || "flame";
      if (ty2 === "round") {
        add(p, new T.SphereGeometry(0.14, 14, 10), mf, s * 0.05, 0.04, 0).scale.set(1, 1, 0.45);
        add(p, new T.SphereGeometry(0.08, 10, 8), mt, s * 0.05, 0.04, 0.05).scale.set(1, 1, 0.3);
      } else if (ty2 === "fox") {
        add(p, lickG(0.18, 0.7, -0.25, "z", 0.38), mt).rotation.z = -s * 0.45;
        add(p, lickG(0.1, 0.45, -0.3, "z", 0.3), mf, s * 0.03, 0.02, 0.04).rotation.z = -s * 0.45;
      } else {
        add(p, lickG(ty2 === "lynx" ? 0.11 : 0.13, ty2 === "lynx" ? 0.62 : 0.58, -0.45, "z", 0.5), mt).rotation.z =
          -s * (ty2 === "lynx" ? 0.18 : 0.32);
        if (ty2 === "flame") add(p, lickG(0.05, 0.3, -0.6, "z"), mt, s * 0.05, 0.02, 0.04).rotation.z = -s * 0.7;
        if (ty2 === "lynx") add(p, lickG(0.028, 0.32, -0.2, "z"), mt, -s * 0.11, 0.55, -0.05).rotation.z = -s * 0.1;
      }
      hd.add(p);
    });
    // crystal antlers: a bent beam with three tines, turned outward
    if (sp.antler)
      [-1, 1].forEach((s) => {
        const a = new T.Group();
        a.position.set(s * 0.17, 0.27, -0.08);
        a.rotation.z = -s * 0.42;
        add(a, lickG(0.055, 1.0, -0.45, "z"), ice);
        [0.32, 0.55, 0.78].forEach((y, j) => {
          const t = add(a, lickG(0.035, 0.42 - j * 0.08, 0.6, "z"), ice, 0, y, -0.45 * y * y);
          t.rotation.set(0.5 + j * 0.15, 0, s * (j % 2 ? 0.5 : -0.35));
        });
        hd.add(a);
      });
    // ---- mane: rings of licks round the neck base ----
    const ms = sp.mane == null ? 1 : sp.mane;
    if (ms > 0)
      for (let ring = 0; ring < 2; ring++) {
        const n = ring ? 11 : 15,
          c = V(0, nb.y + 0.15 + ring * 0.16, nb.z + 0.15 + ring * 0.12),
          rr = (ring ? 0.3 : 0.4) * bk;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.283 + ring * 0.3,
            h = ((ring ? 0.5 : 0.62) + Math.sin(i * 2.7) * 0.1) * ms,
            m = add(b, lickG(ring ? 0.1 : 0.12, h, -0.5, "z"), mt);
          m.quaternion.setFromUnitVectors(UP, V(Math.cos(a) * 0.85, Math.sin(a) * 0.85 + 0.25, -0.75).normalize());
          m.position.set(c.x + Math.cos(a) * rr * 0.85, c.y + Math.sin(a) * rr, c.z);
        }
      }
    // chest fluff
    for (let i = 0; i < 5; i++) {
      const m = add(b, lickG(0.09, 0.42 * ms + 0.1, 0.4, "z"), mt, (i - 2) * 0.1 * bk, ty - 0.15, 1.12 * ln);
      m.rotation.set(PI - 0.5, 0, (i - 2) * 0.2);
    }
    // ---- spine ----
    const top = ty + 0.36 * bk;
    if (sp.spine === "licks")
      for (let i = 0; i < 7; i++) {
        const m = add(
          b,
          lickG(0.06, 0.26 + Math.sin(i * 1.3) * 0.08, -0.6, "z"),
          mt,
          0,
          top + i * 0.012,
          (-0.75 + i * 0.22) * ln,
        );
        m.rotation.x = -0.65;
      }
    if (sp.spine === "crystal")
      for (let i = 0; i < 7; i++) {
        const h = 0.28 + Math.sin((i / 6) * PI) * 0.3,
          m = add(
            b,
            new T.ConeGeometry(0.08, h, 5).translate(0, h / 2, 0),
            ice,
            i % 2 ? 0.05 : -0.05,
            top - 0.05,
            (-0.8 + i * 0.25) * ln,
          );
        m.rotation.set(-0.55, 0, i % 2 ? -0.25 : 0.25);
      }
    if (sp.spine === "leaves") {
      const petal = toon(0xffb0d8, 0x6a2a4a, 0.35),
        heart = toon(0xffe066, 0xaa7a00, 0.6);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * 6.283,
          z = (-0.8 + (i % 6) * 0.3) * ln,
          x = (i < 6 ? -1 : 1) * 0.18 * bk,
          m = add(b, lickG(0.12, 0.42, 0.25, "z", 0.3), mt, x, top - 0.08, z);
        m.rotation.set(-0.9, a, (i < 6 ? 1 : -1) * 0.4);
      }
      [
        [-0.12, -0.4],
        [0.15, 0.05],
        [-0.05, 0.45],
        [0.1, -0.75],
      ].forEach(([x, z]) => {
        const f = new T.Group();
        f.position.set(x * bk, top + 0.06, z * ln);
        for (let j = 0; j < 5; j++) {
          const q = add(
            f,
            new T.SphereGeometry(0.06, 8, 6),
            petal,
            Math.cos((j / 5) * 6.283) * 0.07,
            0,
            Math.sin((j / 5) * 6.283) * 0.07,
          );
          q.scale.set(1.2, 0.4, 0.8);
          q.rotation.y = (-j / 5) * 6.283;
        }
        add(f, new T.SphereGeometry(0.045, 8, 6), heart, 0, 0.02, 0);
        b.add(f);
      });
    }
    // collar with a glowing charm
    if (sp.collar) {
      const col = add(
        b,
        new T.TorusGeometry(0.27 * bk, 0.035, 8, 26),
        toon(0x4a2a22, 0x1a0800, 0.3),
        0,
        nb.y + 0.25 * nk,
        nb.z + 0.3 * nk,
      );
      col.rotation.x = -0.75;
      const ch = add(
        b,
        new T.OctahedronGeometry(0.07),
        toon(sp.collar, sp.collar, 0.8),
        0,
        nb.y + 0.02,
        nb.z + 0.52 * nk,
      );
      ch.scale.y = 1.4;
      const cg = glowS(sp.collar, 0.5);
      cg.position.copy(ch.position);
      b.add(cg);
    }
    // ---- legs: hip (animated, rest 0) > th (rest angle) > knee > paw (kept level) ----
    const rests = { f: [0.15, -0.25], b: [-0.35, 0.75] };
    const leg = (x, z, y, front, i) => {
      const hip = nm(new T.Group(), "bxH" + i),
        th = nm(new T.Group(), "bxT" + i),
        [r0, k0] = front ? rests.f : rests.b;
      hip.position.set(x, y, z);
      th.rotation.x = r0;
      hip.add(th);
      const ug = LtS(
        front
          ? [
              [0.17 * sq, 0],
              [0.16 * sq, 0.3 * Lg],
              [0.11 * sq, 0.62 * Lg],
            ]
          : [
              [0.25 * sq, 0],
              [0.2 * sq, 0.3 * Lg],
              [0.11 * sq, 0.62 * Lg],
            ],
        16,
      );
      ug.rotateX(PI);
      add(th, ug, mf);
      const kn = nm(new T.Group(), "bxK" + i);
      kn.position.y = -0.6 * Lg;
      kn.rotation.x = k0;
      th.add(kn);
      const lg2 = LtS(
        [
          [0.1 * sq, 0],
          [0.08 * sq, 0.25 * Lg],
          [0.07 * sq, 0.5 * Lg],
        ],
        12,
      );
      lg2.rotateX(PI);
      add(kn, lg2, mf);
      const paw = nm(new T.Group(), "bxP" + i);
      paw.position.y = -0.5 * Lg;
      paw.rotation.x = -(r0 + k0);
      kn.add(paw);
      if (sp.hoof) {
        add(paw, new T.CylinderGeometry(0.08 * sq, 0.12 * sq, 0.16, 12), toon(sp.hoof, 0x0a1a3a, 0.3), 0, -0.02, 0);
      } else {
        add(paw, new T.SphereGeometry(0.13 * sq, 14, 10), mf, 0, -0.02, 0.05).scale.set(1, 0.55, 1.35);
        for (let c = -1; c <= 1; c++) {
          const cl = add(
            paw,
            bend(new T.ConeGeometry(0.03, 0.14, 6).translate(0, 0.07, 0), 3, "z"),
            clawM,
            c * 0.06 * sq,
            -0.05,
            0.2 * sq,
          );
          cl.rotation.x = PI / 2 + 0.3;
        }
      }
      const tf = add(paw, lickG(0.06, 0.3, -0.5, "z"), mt, 0, 0.32 * Lg, -0.06);
      tf.rotation.x = -2.3;
      b.add(hip);
    };
    [-1, 1].forEach((s, k) => {
      leg(s * 0.26 * sq, 0.72 * ln, 1.22 * Lg, 1, k);
      leg(s * 0.27 * sq, -0.75 * ln, 1.13 * Lg, 0, 2 + k);
    });
    // ---- tail ----
    const tl = nm(new T.Group(), "bxTl");
    tl.position.set(0, ty + 0.12, -1.0 * ln);
    tl.rotation.x = sp.tail === "stub" ? 0.9 : 0.7;
    b.add(tl);
    let li = 0;
    const chain = (par, n, wide, ghost) => {
      for (let i = 0; i < n; i++) {
        const sg = nm(new T.Group(), "bxN" + li++);
        sg.position.z = i ? -0.3 : 0;
        par.add(sg);
        par = sg;
        const r = (0.1 + Math.sin((i / (n - 1)) * PI * 0.85) * 0.13) * wide;
        add(sg, new T.SphereGeometry(r, 12, 10), i < n / 2 && !ghost ? mf : mt, 0, 0, -0.12).scale.set(1, 1, 1.6);
        const m = 3 + Math.min(i, 3);
        for (let j = 0; j < m; j++) {
          const a = (j / m) * 6.283 + i * 1.1,
            t = add(
              sg,
              lickG(r * 0.7, r * 2.6 + i * 0.06, -0.6, "z"),
              mt,
              Math.cos(a) * r * 0.6,
              Math.sin(a) * r * 0.6,
              -0.1,
            );
          t.quaternion.setFromUnitVectors(UP, V(Math.cos(a) * 0.8, Math.sin(a) * 0.8, -1).normalize());
        }
      }
      return par;
    };
    const tipAt = (par, k) => {
      if (!sp.tip) return;
      const q =
        sp.tip === "fire"
          ? new T.Sprite(AM(SP.fire))
          : glowS(sp.tip === "spark" ? 0xd8e8ff : sp.glow || 0xd8b0ff, sp.tip === "spark" ? 0.8 : 0.9);
      if (sp.tip === "fire") q.scale.setScalar(0.9);
      q.position.z = -0.45;
      par.add(nm(q, "bxTip" + k));
    };
    if (sp.tail === "stub") {
      add(tl, new T.SphereGeometry(0.16 * bk, 12, 10), mf, 0, 0, -0.1).scale.set(1, 1, 1.3);
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * 6.283,
          t = add(tl, lickG(0.08, 0.32, -0.5, "z"), mt, Math.cos(a) * 0.08, Math.sin(a) * 0.08, -0.15);
        t.quaternion.setFromUnitVectors(UP, V(Math.cos(a) * 0.7, Math.sin(a) * 0.7 + 0.3, -1).normalize());
      }
    } else if (sp.tail === "fox3") {
      [-0.55, 0, 0.55].forEach((ry, k) => {
        const r = new T.Group();
        r.rotation.set(k === 1 ? 0.15 : -0.05, ry, 0);
        tl.add(r);
        tipAt(chain(r, 5, 1.05, 1), k);
      });
    } else tipAt(chain(tl, sp.links || 6, 1), 0);
    // flames riding the back (ember hound)
    (sp.fires || []).forEach(([y, z, s], k) => {
      const f = nm(new T.Sprite(AM(SP.fire)), "bxF" + k);
      f.scale.setScalar(s);
      f.position.set(0, y * Lg, z * ln);
      b.add(f);
    });
    // storm sparks that flicker round the body
    if (sp.sparks)
      for (let k = 0; k < 5; k++) {
        const q = nm(glowS(0xdce8ff, 0.35), "bxS" + k);
        q.position.set(0, ty, 0);
        b.add(q);
      }
    const au = nm(glowS(sp.aura || 0xff6a1a, 2.6), "bxAu");
    au.position.y = ty + 0.1;
    au.material.opacity = 0.45;
    b.add(au);
    mergeAll(o);
    if (sp.ol !== false) outlineN(o, 0.025);
    return o;
  }
  // v48d outline: a twin pushed out along its normals (01's outline() scales each mesh about its own origin, which for
  // merged meshes is the group's origin, so the shell slid sideways and showed as dark slivers on manes and spines)
  const INF = new WeakMap();
  function outlineN(root, d) {
    const a = [];
    root.traverse((q) => {
      if (q.isMesh && !q.userData.nol && !q.userData.ol) a.push(q);
    });
    a.forEach((m) => {
      let g = INF.get(m.geometry);
      if (!g) {
        g = m.geometry.clone();
        const p = g.attributes.position,
          n = g.attributes.normal;
        if (n)
          for (let i = 0; i < p.count; i++)
            p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
        g.computeBoundingSphere();
        INF.set(m.geometry, g);
      }
      const o = new T.Mesh(g, OLM);
      o.userData.ol = 1;
      o.position.copy(m.position);
      o.quaternion.copy(m.quaternion);
      o.scale.copy(m.scale);
      m.parent.add(o);
    });
  }
  // fill userData with live refs (per copy)
  function link(o, kind) {
    const g = (n) => o.getObjectByName(n),
      L = [],
      legs = [],
      links = [],
      mats = { f: [], t: [] },
      tips = [],
      sparks = [],
      fires = [];
    for (let i = 0; i < 4; i++) {
      const hip = g("bxH" + i),
        th = g("bxT" + i),
        kn = g("bxK" + i),
        paw = g("bxP" + i);
      L.push(hip);
      legs.push({ hip, th, kn, paw, front: i < 2, r0: th.rotation.x, k0: kn.rotation.x });
    }
    o.traverse((q) => {
      if (/^bxN\d+$/.test(q.name)) {
        q.userData.rx = q.rotation.x;
        links.push(q);
      }
      if (/^bxTip/.test(q.name)) tips.push(q);
      if (/^bxS\d/.test(q.name)) sparks.push(q);
      if (/^bxF\d/.test(q.name)) fires.push(q);
      if (
        q.material &&
        q.material.userData &&
        mats[q.material.userData.bxk] &&
        !mats[q.material.userData.bxk].includes(q.material)
      )
        mats[q.material.userData.bxk].push(q.material);
    });
    o.userData = {
      bx: kind,
      L,
      tail: g("bxTl"),
      hd: g("bxHd"),
      run: 0,
      body: g("bxB"),
      jaw: g("bxJaw"),
      mg: g("bxMg"),
      ears: [g("bxE0"), g("bxE1")],
      eyes: [g("bxEy0"), g("bxEy1")],
      legs,
      links,
      tips,
      sparks,
      fires,
      au: g("bxAu"),
      mats,
      ck: 0,
      lp: 0,
      jk: 0,
      ph: Math.random() * 6,
    };
    return o;
  }
  // ---------- shared motion (tail wave, jaw, ears, glow) ----------
  function life(u, s, run) {
    const j = u.ph,
      jk = u.jk || 0;
    u.links.forEach((l, k) => {
      const kk = k % 6;
      l.rotation.y = Math.sin(s * (run ? 9 : 3.2) - kk * 0.55 + j + Math.floor(k / 5)) * (0.12 + kk * 0.03);
      l.rotation.x = l.userData.rx - 0.1 + Math.sin(s * 1.6 - kk * 0.5 + j) * 0.05 + (u.lp || 0) * 0.12;
    });
    if (u.jaw) u.jaw.rotation.x = 0.04 + Math.max(0, Math.sin(s * 7 + j)) * 0.07 * (1 - jk) + jk * 0.6;
    if (u.mg) {
      u.mg.material.opacity = 0.25 + jk * 0.75;
      u.mg.scale.setScalar(0.6 + jk * 0.8);
    }
    u.ears.forEach((e, k) => {
      if (e) e.rotation.x = -Math.pow(Math.max(0, Math.sin(s * 1.3 + k * 2.1 + j)), 14) * 0.5 - (u.ck || 0) * 0.6;
    });
    u.mats.t.forEach(
      (m) =>
        (m.emissiveIntensity =
          (m.userData.e0 = m.userData.e0 || m.emissiveIntensity) *
          (1 + Math.sin(s * 9 + j) * 0.12 + Math.sin(s * 23 + j) * 0.05)),
    );
    u.mats.f.forEach(
      (m) =>
        (m.emissiveIntensity =
          (m.userData.e0 = m.userData.e0 || m.emissiveIntensity) * (1 + Math.sin(s * 5 + j) * 0.1)),
    );
    u.tips.forEach((t, k) => {
      t.material.rotation = s * 3 + k;
      t.scale.setScalar((t.userData.s0 = t.userData.s0 || t.scale.x) * (1 + Math.sin(s * 11 + k) * 0.13));
    });
    u.fires.forEach((f, k) => (f.material.rotation = Math.sin(s * 3 + k) * 0.2));
    u.eyes.forEach((e) => e && e.scale.setScalar(0.34 + Math.sin(s * 4 + j) * 0.04 + jk * 0.2));
    u.sparks.forEach((q) => {
      q.visible = Math.random() < 0.3;
      if (q.visible) {
        q.position.set((Math.random() - 0.5) * 1.2, 1.2 + Math.random() * 1.2, (Math.random() - 0.5) * 2.2);
        q.material.rotation = Math.random() * 6;
      }
    });
  }
  // ---------- foes ----------
  const TPL = {};
  function foeModel(kind) {
    const t = TPL[kind] || (TPL[kind] = make(SPEC[kind])),
      o = t.clone(),
      mm = new Map();
    // fresh materials per foe (death fades / hit flashes must not touch every copy); geometry and textures stay shared
    o.traverse((q) => {
      if (!q.material || q.userData.ol) return;
      if (!mm.has(q.material)) mm.set(q.material, q.material.clone());
      q.material = mm.get(q.material);
    });
    return link(o, kind);
  }
  const beast0 = beast;
  beast = function (kind, t) {
    if (kind === "wolf" || kind === "hound")
      try {
        return foeModel(kind);
      } catch (e) {
        console.warn("bestia foe", kind, e);
      }
    return beast0.apply(this, arguments);
  };
  const ab0 = animBeast;
  animBeast = function (o, s, m) {
    ab0.apply(this, arguments);
    const u = o && o.userData;
    if (u && u.bx) life(u, s, m);
  };
  // world foes built before this file loaded: swap their models in place (same scene-child index)
  let swapped = 0;
  try {
    foes.forEach((f) => {
      if ((f.kind !== "wolf" && f.kind !== "hound") || !f.o || f.o.userData.bx) return;
      const o0 = f.o,
        o2 = mkFoe(f.kind, f.mt || f.t, f.big, f.hc);
      if (!o2.userData.bx) return;
      o2.position.copy(o0.position);
      o2.rotation.copy(o0.rotation);
      o2.scale.copy(o0.scale);
      o2.visible = o0.visible;
      if (f.au && f.au.parent === o0) o2.add(f.au);
      const par = o0.parent;
      if (par) {
        const i = par.children.indexOf(o0);
        par.children[i] = o2;
        o2.parent = par;
        o0.parent = null;
      }
      f.o = o2;
      if (f.m === o0) f.m = o2;
      f.s0 = o2.scale.x;
      swapped++;
    });
  } catch (e) {
    console.warn("bestia swap", e);
  }
  // ---------- summons (45) ----------
  function summon(t) {
    const o = link(make(SPEC[t]), t);
    o.userData.body.rotation.y = PI / 2;
    return o;
  }
  // per-frame idle for a summon: stance, crouch (ck) / leap (lp) poses, head look, then the shared life()
  function idle(u, i, s) {
    const ud = u.m.userData,
      b = ud.body;
    if (!b) return;
    const ck = ud.ck || 0,
      lp = ud.lp || 0,
      br = Math.sin(s * 2.4 + i);
    b.rotation.y = PI / 2; // face the foes (+x)
    b.position.y = -ck * 0.26 + br * 0.015 + (ud.rise || 0) * 0.5;
    b.rotation.x = ck * 0.12 - lp * 0.3 - (ud.rise || 0) * 0.55;
    ud.legs.forEach((L) => {
      const rs = (ud.rise || 0) * (L.front ? -0.9 : 0.3);
      L.hip.rotation.x = (L.front ? 0.3 : -0.25) * ck + (L.front ? -1.0 : 0.9) * lp + rs;
      L.kn.rotation.x =
        L.k0 + (L.front ? -0.6 : 0.5) * ck + (L.front ? 0.5 : -0.4) * lp + (L.front ? -0.5 : 0) * (ud.rise || 0);
      L.paw.rotation.x = -(L.r0 + L.hip.rotation.x + L.kn.rotation.x) + lp * 0.4;
    });
    ud.hd.rotation.y = Math.sin(s * 0.6 + i) * 0.25 * (1 - ck);
    ud.hd.rotation.x = Math.sin(s * 0.9 + i) * 0.06 + ck * 0.22 - lp * 0.2 - (ud.rise || 0) * 0.35;
    if (ud.tail) ud.tail.rotation.y = Math.sin(s * 2 + i) * 0.15;
    ud.au.material.opacity = 0.4 + Math.sin(s * 3 + i) * 0.1 + (ud.jk || 0) * 0.3;
    life(ud, s, 0);
  }
  // ===================================================================================================================
  // GLOOM FOES: same rig (animGloom and every pose keep working). v48e: the shared gloom skin canvases (02 gloom.tx) are
  // repainted in place as a mottled, fleshy hide (no swirls, the old vein/crack lines gone), so every gloom changes at
  // once; their glow map keeps only a few soft glowing patches that pulse with the core.
  // ===================================================================================================================
  Object.assign(X.SKD, {
    // gloom: smoky, fleshy hide, darker underneath, soft blotches and pores
    ghide: {
      c: ["#7e7e88", "#aeaeb8", "#d8d8e0", "#f2f2f6"],
      g: ["#000000", "#000000", "#000000", "#000000"],
      pat: [
        { t: "mottle", n: 44, a: 0.13 },
        { t: "speckle", n: 140, a: 0.14 },
        { t: "ember", c: "rgba(255,255,255,.1)", n: 8 },
      ],
      fur: 300,
      seed: 101,
      fl: "rgba(255,255,255,.1)",
      fd: "rgba(0,0,0,.14)",
    },
    // bosses and every other plain model: neutral greyscale paintings that multiply each part's own colour; bossPaint
    // picks one per part (stone for grey parts, moss for green ones, hide for the rest)
    phide: {
      c: ["#a4a4ae", "#c8c8d0", "#e4e4ea", "#f8f8fc"],
      g: ["#000000", "#000000", "#000000", "#000000"],
      pat: [{ t: "mottle", n: 30, a: 0.1 }],
      fur: 800,
      seed: 111,
      fl: "rgba(255,255,255,.13)",
      fd: "rgba(0,0,0,.14)",
    },
    pstone: {
      c: ["#a0a0a8", "#c4c4cc", "#e0e0e6", "#f4f4f8"],
      g: ["#000000", "#000000", "#000000", "#000000"],
      pat: [
        { t: "mottle", n: 34, a: 0.12 },
        { t: "speckle", n: 280, a: 0.24 },
      ],
      fur: 0,
      seed: 113,
    },
    pmoss: {
      c: ["#9a9a9a", "#c2c2c2", "#e0e0e0", "#f6f6f6"],
      g: ["#000000", "#000000", "#000000", "#000000"],
      pat: [
        { t: "mottle", n: 42, a: 0.16 },
        { t: "speckle", n: 140, a: 0.2 },
      ],
      fur: 1000,
      seed: 117,
      fl: "rgba(255,255,255,.14)",
      fd: "rgba(0,0,0,.18)",
    },
  });
  let gskin = 0;
  function gloomSkin() {
    if (gskin) return;
    if (!gloom.tx) gloom(1);
    const tx = gloom.tx,
      s = X.skin("ghide");
    [
      [tx.map, s.c],
      [tx.em, s.e],
    ].forEach(([dst, src]) => {
      const c = dst.image,
        x = c.getContext("2d");
      x.clearRect(0, 0, c.width, c.height);
      x.drawImage(src.image, 0, 0, c.width, c.height);
      dst.needsUpdate = true;
    });
    gskin = 1;
  }
  // v48d: no spikes. The jagged spine ridge + shoulder spikes, tier-2 brow nubs, tier-3+ elbow spikes and the tail barb
  // are removed; blocky or faceted parts become smooth ones: the brow becomes two soft ridges over round sockets, horns
  // become curved tapering lathes, arm cylinders become capsules, tail cones become teardrops, box feet become rounded
  // pads, the Moss Brute's faceted moss becomes soft lumps. Parts are found by material / geometry type / spot in 02's
  // gloom() and swapped together with their outline twin (same geometry, same position). New geometry is cached and
  // shared (never mutate it).
  const GSM = {},
    gsm = (k, f) => GSM[k] || (GSM[k] = f()),
    near = (m, x, y, z) => Math.abs(m.position.x - x) + Math.abs(m.position.y - y) + Math.abs(m.position.z - z) < 0.03,
    twins = (m, g0) =>
      m.parent.children.filter(
        (c) => c !== m && c.userData.ol && c.geometry === g0 && c.position.distanceTo(m.position) < 1e-4,
      ),
    swapG = (m, g) => {
      twins(m, m.geometry).forEach((c) => (c.geometry = g));
      m.geometry = g;
    },
    dropM = (m) => {
      twins(m, m.geometry).forEach((c) => m.parent.remove(c));
      m.parent.remove(m);
    },
    kids = (p) => p.children.filter((c) => c.isMesh && !c.userData.ol),
    horn = (r, h) => {
      const g = LtS(
        [
          [r, 0],
          [r * 0.82, h * 0.3],
          [r * 0.5, h * 0.65],
          [r * 0.2, h * 0.9],
          [0.001, h],
        ],
        16,
      );
      bend(g, -0.25 / h, "z");
      return g.translate(0, -h / 2, 0);
    },
    capsule = (rt, rb, h) =>
      LtS(
        [
          [0.001, -h / 2 - rb * 0.5],
          [rb * 0.75, -h / 2 - rb * 0.35],
          [rb, -h / 2 + rb * 0.1],
          [((rb + rt) / 2) * 1.04, 0],
          [rt, h / 2 - rt * 0.1],
          [rt * 0.75, h / 2 + rt * 0.35],
          [0.001, h / 2 + rt * 0.5],
        ],
        16,
      ),
    teardrop = (r, h) =>
      LtS(
        [
          [0.001, -h / 2 - r * 0.45],
          [r * 0.8, -h / 2 - r * 0.2],
          [r, -h / 2 + r * 0.3],
          [r * 0.65, 0],
          [r * 0.3, h * 0.28],
          [0.001, h / 2],
        ],
        16,
      );
  function smoothGloom(o) {
    const u = o.userData,
      hd = u.hd,
      bd = u.bd,
      brow = kids(hd).find(
        (m) => !m.geometry.index && m.material.map && m.material !== u.skin && near(m, 0, 0.15, 0.45),
      ),
      dkm = brow && brow.material;
    if (brow)
      swapG(
        brow,
        gsm("brow", () => {
          const L = [];
          [-1, 1].forEach((s) => {
            const b = new T.SphereGeometry(0.16, 16, 10);
            b.scale(1.15, 0.38, 0.55);
            b.rotateZ(s * 0.45);
            b.rotateX(0.25);
            b.translate(s * 0.2, 0.06, 0.05);
            const so = new T.SphereGeometry(0.15, 16, 10);
            so.scale(1.4, 0.75, 0.45);
            so.rotateZ(s * 0.3);
            so.translate(s * 0.2, -0.1, -0.02);
            L.push(b, so);
          });
          return mergeG(L);
        }),
      );
    kids(bd).forEach((m) => {
      const p = m.geometry.parameters;
      if (dkm && m.material === dkm && !m.geometry.index && near(m, 0, 1.55, -0.55)) dropM(m);
      else if (m.geometry.type === "IcosahedronGeometry")
        swapG(
          m,
          gsm("moss" + p.radius, () => new T.SphereGeometry(p.radius * 0.95, 14, 10)),
        );
    });
    kids(hd).forEach((m) => {
      const p = m.geometry.parameters;
      if (dkm && m.material === dkm && m.geometry.type === "ConeGeometry")
        swapG(
          m,
          gsm("horn" + p.radius + "|" + p.height, () => horn(p.radius, p.height)),
        );
    });
    u.arms.forEach((g) => {
      const fa = g.userData.fa;
      kids(g)
        .concat(fa ? kids(fa) : [])
        .forEach((m) => {
          const p = m.geometry.parameters;
          if (m.material === u.skin && m.geometry.type === "CylinderGeometry")
            swapG(
              m,
              gsm("cap" + p.radiusTop + "|" + p.radiusBottom + "|" + p.height, () =>
                capsule(p.radiusTop, p.radiusBottom, p.height),
              ),
            );
          else if (dkm && m.material === dkm && m.geometry.type === "ConeGeometry") dropM(m);
        });
    });
    const tl = u.tail,
      t2 = tl && tl.userData.t2;
    [tl, t2].forEach(
      (p) =>
        p &&
        kids(p).forEach((m) => {
          const q = m.geometry.parameters;
          if (m.material === u.skin && m.geometry.type === "ConeGeometry")
            swapG(
              m,
              gsm("td" + q.radius + "|" + q.height, () => teardrop(q.radius, q.height)),
            );
          else if (dkm && m.material === dkm && !m.geometry.index) dropM(m);
        }),
    );
    (u.feet || []).forEach((f) => {
      const p = f.geometry.parameters;
      if (f.geometry.type === "BoxGeometry")
        swapG(
          f,
          gsm("ft" + p.width + "|" + p.height + "|" + p.depth, () => {
            const g = new T.SphereGeometry(0.5, 20, 14);
            g.scale(p.width, p.height * 1.2, p.depth);
            return g;
          }),
        );
    });
  }
  // v47 polish (Polish.md, Gloomlings): leaner, less round torso; shoulder + elbow joints so the arms meet the body; the
  // tail root and mid joint filled so the tail reads as one piece; the chest core + ribs brought out in front of the belly
  // (it was buried inside it) with bone-pale ribs; eyes become glowing sockets (no eyeball/slit pupil). Positions and
  // scales are changed on each part and its outline twin together; new geometry is cached/shared, never mutated.
  const PGM = {};
  function shapeGloom(o) {
    const u = o.userData,
      bd = u.bd,
      hd = u.hd;
    const both = (m, f) => {
      twins(m, m.geometry).forEach(f);
      f(m);
    };
    const findB = (fn) => kids(bd).find(fn);
    const ball = (r) => PGM["b" + r] || (PGM["b" + r] = new T.SphereGeometry(r, 16, 12));
    const add = (p, g, mat, x, y, z) => {
      const m = new T.Mesh(g, mat);
      m.position.set(x, y, z);
      p.add(m);
      return m;
    };
    // torso: narrower, taller, flatter front-to-back
    const torso = findB((m) => m.material === u.skin && near(m, 0.04, 1.1, 0.05)),
      upper = findB((m) => m.material === u.skin && near(m, 0.12, 1.84, -0.2)),
      belly = findB((m) => m.material !== u.skin && near(m, 0, 0.95, 0.62)),
      ribs = findB((m) => m.material !== u.skin && near(m, 0, 1.12, 0.78));
    if (torso) both(torso, (m) => m.scale.set(m.scale.x * 0.86, m.scale.y * 1.14, m.scale.z * 0.8));
    if (upper) both(upper, (m) => m.scale.set(m.scale.x * 0.88, m.scale.y * 0.95, m.scale.z * 0.82));
    if (belly) both(belly, (m) => m.scale.set(m.scale.x * 0.85, m.scale.y, m.scale.z * 0.7));
    // chest core + ribcage out in front of the belly, ribs pale bone
    if (u.core) both(u.core, (m) => (m.position.z = 1.0));
    if (u.cs) u.cs.position.z = 1.14;
    if (ribs) {
      if (!PGM.bone) PGM.bone = new T.MeshToonMaterial({ color: 0xe6dccb, gradientMap: GR });
      both(ribs, (m) => {
        m.position.z = 0.96;
        m.scale.set(1.05, 1.05, 1.05);
      });
      ribs.material = PGM.bone;
    }
    // arms: pulled in to the shoulder, with a shoulder ball and an elbow ball (skin)
    u.arms.forEach((g) => {
      const s = Math.sign(g.position.x) || 1;
      g.position.x = s * (Math.abs(g.position.x) - 0.1);
      add(g, ball(0.27), u.skin, 0, -0.02, 0);
      if (g.userData.fa) add(g.userData.fa, ball(0.14), u.skin, 0, 0, 0);
    });
    // tail: closer to the back, root and mid joint filled
    const tl = u.tail;
    if (tl) {
      tl.position.z = -0.68;
      add(tl, ball(0.22), u.skin, 0, 0, -0.05);
      if (tl.userData.t2) add(tl.userData.t2, ball(0.14), u.skin, 0, 0, 0);
    }
    // eyes: no eyeball or pupil; a flat glow sitting deep in the socket, plus the halo
    (u.eyes || []).forEach((e) => {
      e.children.forEach((c) => {
        if (!c.isMesh) return;
        if (c.geometry.type === "BoxGeometry") c.visible = false; // slit pupil (+ its outline)
        else
          both(c, (m) => {
            m.scale.set(1.05, 0.85, 0.3);
            m.rotation.z = 0;
            m.position.z = -0.04;
          });
      });
      if (c0(e)) c0(e).scale.set(0.5, 0.45, 1);
    });
  }
  const c0 = (e) => e.children.find((c) => c.isSprite);
  function dressGloom(o) {
    const u = o && o.userData;
    if (!u || !u.gl || u.nk || !u.coreM || !u.skin || !u.hd || !u.arms || u.gsm) return o;
    gloomSkin();
    u.gsm = 1;
    smoothGloom(o);
    try {
      shapeGloom(o);
    } catch (e) {
      console.warn("bestia shapeGloom", e);
    }
    if ((u.t || 1) >= 4) bossPaint(o);
    return o;
  }
  // ===================================================================================================================
  // PAINTED HIDES for everything without its own painted model (road rb0..10, street-dungeon dkb0..2, Cinder Fiend /
  // Gloom Warden, 27's golems / gnome / phoenix, 33's swamp foes, every summon with no map yet). v48e: only a colour map,
  // never glow: a neutral greyscale painting (darker underneath, soft blotches; stone = flecked, moss = shaggy, hide =
  // soft fur strokes) that multiplies the part's own colour, so every model keeps its own colours and looks fuller.
  // Parts that glow, carry a map, are see-through/additive or skin-toned stay as they were. A model's own materials are
  // changed in place (so anything holding them still works); materials shared through M()'s cache are cloned.
  // ===================================================================================================================
  const BOSSK = /^(rb\d+|dkb\d|fgolem|lgolem|phoenix|gnome|bogl|skel|bogm|mwisp)$/;
  function bossPaint(o) {
    if (!o || o.userData.bxp) return o;
    o.userData.bxp = 1;
    const shared = new Set(Object.values(MC)),
      hsl = {},
      done = new Map();
    o.traverse((q) => {
      if (!q.isMesh || q.userData.ol) return;
      const m = q.material;
      if (!m || Array.isArray(m) || m.map || m.transparent || m.blending === T.AdditiveBlending) return;
      if (!(m.isMeshToonMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshStandardMaterial))
        return;
      if (m.emissive && m.emissiveIntensity >= 0.8 && m.emissive.getHex() > 0x202020) return;
      m.color.getHSL(hsl);
      // skin tones (faces, hands) stay clean
      if (hsl.h > 0.02 && hsl.h < 0.12 && hsl.s > 0.25 && hsl.s < 0.75 && hsl.l > 0.5 && hsl.l < 0.85) return;
      if (!done.has(m)) {
        const c = shared.has(m) ? m.clone() : m;
        c.map = X.skin(hsl.s < 0.16 ? "pstone" : hsl.h > 0.18 && hsl.h < 0.45 ? "pmoss" : "phide").c;
        c.needsUpdate = true;
        done.set(m, c);
      }
      q.material = done.get(m);
    });
    return o;
  }
  const mk1 = mkFoe;
  mkFoe = function (kind) {
    const o = mk1.apply(this, arguments);
    try {
      if (kind === "gloom") dressGloom(o);
      else if (BOSSK.test(kind || "")) bossPaint(o);
    } catch (e) {
      console.warn("bestia dress", kind, e);
    }
    return o;
  };
  // v48d: every summon / companion model gets the painted hide too (models that already carry maps, like the new
  // beasts, the Hearthfang and the cloth-textured companions, are left as they are by bossPaint's own checks)
  if (typeof sumMesh === "function") {
    const sm1 = sumMesh;
    sumMesh = function () {
      const o = sm1.apply(this, arguments);
      try {
        let mapped = 0;
        o.traverse((q) => q.material && q.material.map && !q.isSprite && (mapped = 1));
        if (!mapped) bossPaint(o);
      } catch (e) {
        console.warn("bestia summon paint", e);
      }
      return o;
    };
  }
  // world foes already built
  try {
    foes.forEach((f) => {
      if (!f.o) return;
      if (f.kind === "gloom") dressGloom(f.o);
      else if (BOSSK.test(f.kind || "")) bossPaint(f.o);
    });
  } catch (e) {
    console.warn("bestia dress world", e);
  }
  return { SPEC, make, link, summon, idle, life, mergeG, dressGloom, bossPaint, swapped: () => swapped };
})();
