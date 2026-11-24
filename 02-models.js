// DUSKWICK - 02-models.js: Models: the wizard, NPCs (person), foes, ALLY table, SPL spell table, summon meshes, card art.
// Loaded in order by index.html as plain scripts; they share one global scope.
// ---------- models ----------
const W = new T.Group(),
  wa = (g, c, x, y, z, rx, rz) => {
    const m = mk(g, c, x, y, z, 1);
    m.rotation.set(rx || 0, 0, rz || 0);
    W.add(m);
    return m;
  };
// v13 looks: robe, hat and wand styles (picked at Pip's mirror, saved in P.look). Every style is one or more groups
// (outlines are added inside the group, so hiding a group hides its outlines too). applyLook() shows the chosen ones.
// role "robe"/"hat"/"cape" parts take the dye/gear colours in applyCos(); glow parts take the lantern's colour in tint().
const LOOKS = {
    robe: [
      { n: "Apprentice robe", c: 0, d: "The robe every lamplighter starts in." },
      {
        n: "Moonlit robe",
        c: 140,
        cl: "spirit",
        d: "Long and layered, with a sash and runes stitched round the hem.",
      },
      {
        n: "Battlemage coat",
        c: 180,
        cl: "pyre",
        d: "A fitted coat with split tails, a bandolier and steel pauldrons.",
      },
      {
        n: "Starweaver robe",
        c: 240,
        cl: "gale",
        d: "Woven with stars that glow, bell sleeves and a hood down the back.",
      },
    ],
    hat: [
      { n: "Pointed hat", c: 0, d: "The classic, bent at the tip." },
      { n: "Battlemage hat", c: 90, cl: "pyre", d: "A wide brim, a slouched crown and a red feather." },
      { n: "Greenwood hood", c: 70, cl: "verdant", d: "A deep cowl with a long point." },
      { n: "Crescent hat", c: 160, cl: "rime", d: "Tall and straight, crowned with a glowing moon." },
      { n: "Starweaver cap", c: 110, cl: "gale", d: "A soft slouched cap with a golden tassel." },
    ],
    wand: [
      { n: "Lantern staff", c: 0, d: "Your lantern on a pole. Reliable." },
      { n: "Crescent staff", c: 200, cl: "rime", d: "A crystal held in silver prongs." },
      { n: "Greenwood staff", c: 150, cl: "verdant", d: "A living branch curled round a seed of light." },
      { n: "Starweaver wand", c: 120, cl: "gale", d: "A short wand with a star at the tip." },
      { n: "Moonlit sceptre", c: 260, cl: "spirit", d: "Silver and gold, with a crescent round the light." },
    ],
  },
  lg = (k, i, par) => {
    const g = new T.Group(),
      s = LOOKS[k][i];
    (s.g || (s.g = [])).push(g);
    g.userData.lk = [k, i]; // lets wizPaint (09-party.js) find style groups on a clone of W
    (par || W).add(g);
    return g;
  },
  // mesh into a style group (role: which dye it takes)
  pm = (p, g, c, x, y, z, rx, rz, role, ry) => {
    const m = mk(g, c, x, y, z, 1);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    if (role) m.userData.role = role;
    p.add(m);
    return m;
  },
  // fabric (HATT) mesh: woven texture with glowing stars, tints true with dyes
  pf = (p, g, x, y, z, u, v, role, ds) => {
    const m = new T.Mesh(g, HATT.mat(u, v));
    m.position.set(x, y, z);
    m.userData.role = role;
    if (ds) m.material.side = T.DoubleSide;
    p.add(m);
    return m;
  },
  // glowing focus (crystal, gem, star): coloured by tint() to match the lantern
  pg = (p, g, x, y, z) => {
    const m = mk(g, 0xffd27a, x, y, z, 1);
    m.material.emissive.setHex(0xaa7a22);
    m.userData.glow = 1;
    p.add(m);
    return m;
  },
  TAU = Math.PI * 2;
// v47 clean look: sculpted (lathe) profiles [radius, y] shared by the robe styles: an A-line skirt with a soft flare,
// a torso with rounded shoulders, and a shoulder mantle
const WPRO = {
  skirt: [
    [0.0001, 0.02],
    [0.88, 0],
    [0.86, 0.08],
    [0.79, 0.32],
    [0.67, 0.68],
    [0.56, 1.0],
    [0.5, 1.25],
    [0.47, 1.4],
  ],
  torso: [
    [0.0001, 1.05],
    [0.5, 1.1],
    [0.56, 1.35],
    [0.55, 1.65],
    [0.49, 1.93],
    [0.36, 2.12],
    [0.18, 2.21],
    [0.0001, 2.23],
  ],
  mantle: [
    [1.0, 1.78],
    [0.98, 1.86],
    [0.9, 2.02],
    [0.78, 2.14],
    [0.6, 2.24],
    [0.4, 2.3],
    [0.28, 2.33],
    [0.26, 2.4],
  ],
};
// --- robe 0: apprentice (the original) ---
{
  const g = lg("robe", 0);
  pm(g, Lt(WPRO.skirt), 0x35408f, 0, 0, 0);
  pm(g, Lt(WPRO.torso), 0x35408f, 0, 0, 0);
  pm(g, new T.TorusGeometry(0.86, 0.065, 10, 40), 0xd9a441, 0, 0.08, 0, Math.PI / 2);
  pm(g, Cy(0.58, 0.6, 0.18, 28), 0x6b3a1a, 0, 1.24, 0);
  pm(g, B(0.22, 0.2, 0.06), 0xd9a441, 0, 1.24, 0.61);
  pm(g, Sp(0.15, 12), 0x6b3a1a, 0.5, 1.06, 0.3);
  // v47 clean look: gold trim down the front opening and a second band above the hem
  [-0.14, 0.14].forEach((x) =>
    pm(g, B(0.06, 1.18, 0.035), 0xd9a441, x, 0.66, Math.sqrt(0.67 * 0.67 - x * x) + 0.02, -0.3),
  );
  pm(g, new T.TorusGeometry(0.8, 0.035, 8, 40), 0xd9a441, 0, 0.32, 0, Math.PI / 2);
}
// --- robe 1: scholar's robe (long layered skirt, front panel, sash in the cape colour, rune hem) ---
{
  const g = lg("robe", 1);
  // v47 clean look: one sculpted layered skirt and a rounded torso (were three straight cylinders)
  pm(
    g,
    Lt([
      [0.0001, 0.02],
      [0.88, 0],
      [0.86, 0.08],
      [0.8, 0.45],
      [0.75, 0.82],
      [0.74, 1.08],
      [0.64, 1.3],
      [0.56, 1.42],
    ]),
    0x35408f,
    0,
    0,
    0,
    0,
    0,
    "robe",
  );
  pm(g, Lt(WPRO.torso), 0x35408f, 0, 0, 0, 0, 0, "robe").scale.set(1.12, 1, 1.12);
  pm(g, B(0.36, 1.95, 0.05), 0x2a2430, 0, 1.0, 0.76, -0.16);
  pm(g, B(0.05, 1.95, 0.06), 0xd9a441, -0.19, 1.0, 0.77, -0.16);
  pm(g, B(0.05, 1.95, 0.06), 0xd9a441, 0.19, 1.0, 0.77, -0.16);
  [0.45, 0.95, 1.45].forEach((y) =>
    pm(g, new T.OctahedronGeometry(0.06), 0xffd34d, 0, y, 0.86 - y * 0.16).material.emissive.setHex(0x664400),
  );
  pm(g, new T.TorusGeometry(0.85, 0.05, 6, 22), 0xd9a441, 0, 0.06, 0, Math.PI / 2);
  pm(g, new T.TorusGeometry(0.8, 0.035, 6, 22), 0xd9a441, 0, 0.3, 0, Math.PI / 2);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    if (Math.abs(Math.sin(a / 2)) < 0.2) continue;
    const r = pm(g, B(0.08, 0.08, 0.02), 0xffd34d, Math.sin(a) * 0.835, 0.18, Math.cos(a) * 0.835, 0.16, 0, 0, a);
    r.material.emissive.setHex(0x664400);
    r.rotation.z = Math.PI / 4;
  }
  pm(g, new T.TorusGeometry(0.72, 0.1, 6, 20), 0x7a2a5a, 0, 1.3, 0, Math.PI / 2, 0, "cape");
  pm(g, B(0.16, 0.7, 0.05), 0x7a2a5a, 0.42, 0.95, 0.6, -0.1, 0.18, "cape");
  pm(g, B(0.16, 0.55, 0.05), 0x7a2a5a, 0.56, 1.0, 0.5, -0.1, 0.3, "cape");
  pm(g, Sp(0.1, 8), 0xd9a441, 0.36, 1.3, 0.66);
}
// --- robe 2: battlemage coat (fitted, split tails, legs, bandolier, pauldrons on the arms) ---
{
  const g = lg("robe", 2);
  pm(g, Cy(0.5, 0.72, 1.0, 14), 0x35408f, 0, 1.7, 0, 0, 0, "robe");
  const tl = new T.CylinderGeometry(0.72, 0.92, 1.0, 18, 1, true, 0.55, TAU - 1.1);
  pm(g, tl, 0x35408f, 0, 0.75, 0, 0, 0, "robe").material.side = T.DoubleSide;
  pm(g, Cy(0.6, 0.66, 0.6, 14), 0x2a2430, 0, 0.95, 0);
  pm(g, Cy(0.75, 0.75, 0.2, 16), 0x4a2e1a, 0, 1.24, 0);
  pm(g, B(0.24, 0.22, 0.06), 0xc0c8d8, 0, 1.24, 0.76);
  pm(g, B(0.16, 0.16, 0.06), 0xc0c8d8, -0.5, 1.24, 0.57, 0, 0, 0, -0.7);
  pm(g, B(0.12, 1.15, 0.05), 0x4a2e1a, 0, 1.72, 0.61, -0.28, 0.72);
  [-0.22, 0, 0.22].forEach((t, i) => {
    const v = pm(
      g,
      Cy(0.05, 0.05, 0.16, 6),
      [0xd94a4a, 0x3aa8ff, 0x7dff9a][i],
      t * 1.1 - 0.02,
      1.72 + t * 0.85,
      0.66,
      -0.28,
    );
    v.material.emissive.setHex([0x551010, 0x103a66, 0x105522][i]);
  });
  pm(g, B(0.14, 0.6, 0.06), 0xd9a441, -0.05, 1.95, 0.5, -0.28);
}
// --- robe 3: starweaver (star-woven robe, bell sleeves, hood down the back) ---
{
  const g = lg("robe", 3);
  // v47 clean look: sculpted skirt and torso (were a cone and a cylinder)
  pf(g, Lt(WPRO.skirt), 0, 0, 0, 4, 2, "robe");
  pf(g, Lt(WPRO.torso), 0, 0, 0, 3, 1, "robe");
  pm(g, new T.TorusGeometry(0.86, 0.06, 10, 40), 0xc0c8d8, 0, 0.08, 0, Math.PI / 2);
  pm(g, new T.TorusGeometry(0.56, 0.06, 10, 36), 0xc0c8d8, 0, 1.24, 0, Math.PI / 2);
  pg(g, new T.OctahedronGeometry(0.1), 0, 1.24, 0.62);
  const hd = pf(g, new T.SphereGeometry(0.45, 14, 8, 0, TAU, 0, Math.PI / 2), 0, 2.1, -0.55, 2, 1, "robe", 1);
  hd.rotation.x = -1.9;
  hd.scale.set(1, 1, 0.7);
  pm(g, new T.TorusGeometry(0.14, 0.04, 6, 12, Math.PI * 1.4), 0xd9d9e8, 0, 1.68, 0.58, 0, 0.9).material.emissive.setHex(
    0x444466,
  );
}
// v47 clean look: a sculpted shoulder mantle (was a straight cylinder) with its clasp gem on the front edge
wa(Lt(WPRO.mantle), 0x7a2a5a, 0, 0, 0).material.side = T.DoubleSide;
wa(Sp(0.09, 6), 0x7ad8ff, 0, 2.06, 0.86).material.emissive.setHex(0x2a7a9a);
wa(new T.TorusGeometry(0.4, 0.1, 6, 14), 0xe8e0f0, 0, 2.25, 0, Math.PI / 2, 0);
wa(Sp(0.42, 12), 0xf1c9a5, 0, 2.55, 0);
wa(Sp(0.07, 6), 0xe8b890, 0, 2.5, 0.42);
const EYES = [-0.15, 0.15].map((x) => {
  const e = wa(Sp(0.075, 8), 0x1a1424, x, 2.6, 0.37);
  e.userData.nol = 1;
  const h = mk(Sp(0.025, 5), 0xffffff, 0.025, 0.03, 0.06, 1);
  h.userData.nol = 1;
  h.material.emissive.setHex(0x888888);
  e.add(h);
  return e;
});
[-0.13, 0.13].forEach((x) => {
  const b = wa(Sp(0.07, 6), 0xff9a9a, x * 1.9, 2.47, 0.32);
  b.scale.set(1, 0.5, 0.4);
  b.userData.nol = 1;
  b.material.transparent = true;
  b.material.opacity = 0.55;
});
wa(B(0.16, 0.03, 0.03), 0xe8e0f0, -0.15, 2.71, 0.4, 0, 0.2);
wa(B(0.16, 0.03, 0.03), 0xe8e0f0, 0.15, 2.71, 0.4, 0, -0.2);
// v47 clean look: a soft rounded beard and a curled moustache (was a downward cone), hair round the back and sides
// and a fringe under the hat brim. ap tags set here: wizLook hides "beard" parts and colours "brow" parts.
{
  const bd = wa(new T.SphereGeometry(0.3, 28, 20), 0xe8e0f0, 0, 2.2, 0.3);
  bd.scale.set(1.1, 1.35, 0.6);
  bd.userData.ap = "beard";
  [-1, 1].forEach((s) => {
    const m = wa(new T.SphereGeometry(0.09, 20, 14), 0xe8e0f0, s * 0.1, 2.43, 0.4, 0, s * 0.35);
    m.scale.set(1.5, 0.6, 0.7);
    m.userData.ap = "beard";
  });
  const hb = wa(new T.SphereGeometry(0.455, 32, 18, Math.PI - 0.5, Math.PI + 1.0, 0.95, 1.15), 0xe8e0f0, 0, 2.55, -0.01);
  hb.userData.ap = "brow";
  hb.material.side = T.DoubleSide;
  [-0.2, 0, 0.2].forEach((x) => {
    const f = wa(new T.SphereGeometry(0.1, 20, 14), 0xe8e0f0, x, 2.84, 0.32 - Math.abs(x) * 0.25, 0, -x * 1.2);
    f.scale.set(1.6, 0.7, 0.8);
    f.userData.ap = "brow";
  });
}
// hat: soft brim + a smooth cone that bends over at the tip (stacked tapered segments joined by spheres, no stepped seams)
{
  const H0 = lg("hat", 0),
    hm = (g, x, y, z, u, v) => pf(H0, g, x, y, z, u, v, "hat");
  // v47 clean look: a brim that curls up at the edge, and one smooth crown that swells, tapers and bends over at the
  // tip (was four stacked segments joined by spheres, which showed seams)
  const br = hm(
    Lt(
      [
        [0.0001, 0.03],
        [0.6, 0.03],
        [0.86, 0.0],
        [0.98, 0.04],
        [1.03, 0.11],
      ],
      40,
    ),
    0,
    2.86,
    0,
    3,
    3,
  );
  br.material.side = T.DoubleSide;
  br.rotation.z = 0.05;
  br.rotation.x = -0.04;
  const rim = hm(new T.TorusGeometry(1.02, 0.04, 8, 40), 0, 2.97, 0, 6, 1);
  rim.rotation.x = Math.PI / 2 - 0.04;
  rim.rotation.y = 0.05;
  const HH = 1.9,
    cg = Lt(
      [
        [0.6, 0],
        [0.56, 0.2],
        [0.46, 0.5],
        [0.33, 0.95],
        [0.2, 1.4],
        [0.09, 1.75],
        [0.0001, HH],
      ],
      32,
      48,
    ),
    cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const t = Math.max(0, cp.getY(i) / HH);
    cp.setX(i, cp.getX(i) + 0.5 * Math.pow(t, 2.4));
    cp.setY(i, cp.getY(i) - 0.22 * Math.pow(t, 3));
  }
  GEOX.sn(cg);
  hm(cg, 0, 2.88, 0, 3, 2);
  const px = 0.5,
    py = 2.88 + HH - 0.22;
  const tip = hm(new T.SphereGeometry(0.09, 10, 8), px + 0.03, py, 0, 1, 1);
  tip.material.emissive.setHex(0xffe6a0);
  tip.material.emissiveMap = null;
  tip.material.emissiveIntensity = 0.6;
  pm(H0, Cy(0.6, 0.6, 0.12, 16), 0xd9a441, 0, 2.97, 0);
  pm(H0, new T.OctahedronGeometry(0.12), 0xffd34d, 0, 2.97, 0.6).material.emissive.setHex(0x886600);
}
// --- hat 1: wanderer's hat (wide brim, slouched crown, feather) ---
{
  const g = lg("hat", 1);
  const br = pf(g, new T.CylinderGeometry(1.38, 1.4, 0.06, 32), 0, 2.86, 0, 4, 4, "hat");
  br.rotation.set(-0.08, 0, 0.06);
  pf(g, new T.TorusGeometry(1.37, 0.05, 6, 32), 0, 2.86, 0, 8, 1, "hat").rotation.set(Math.PI / 2 - 0.08, 0, 0.06);
  pf(g, Cy(0.42, 0.6, 0.55, 18), 0, 3.15, 0, 3, 1, "hat");
  const cr = new T.CylinderGeometry(0.12, 0.42, 0.42, 16);
  cr.translate(0, 0.21, 0);
  pf(g, cr, 0, 3.4, 0, 2, 1, "hat").rotation.z = 0.55;
  pf(g, Sp(0.13, 10), -0.19, 3.75, 0, 1, 1, "hat");
  pm(g, Cy(0.605, 0.6, 0.14, 18), 0x4a2e1a, 0, 2.97, 0);
  pm(g, B(0.16, 0.16, 0.05), 0xd9a441, 0.42, 2.97, 0.43, 0, 0, 0, Math.PI / 4);
  const fe = pm(g, Sp(0.14, 8), 0xd94a4a, 0.5, 3.35, 0.32, 0, -0.5);
  fe.scale.set(0.45, 2.6, 0.12);
  fe.rotation.y = 0.7;
  pm(g, B(0.015, 0.68, 0.015), 0xf2e0c0, 0.5, 3.35, 0.34, 0, -0.5);
  // v18: a size smaller, shrunk about the brim so it still sits on the head
  g.scale.setScalar(0.8);
  g.position.y = 2.86 * 0.2;
}
// --- hat 2: hood (open-faced cowl with a long point and a clasp) ---
{
  const g = lg("hat", 2),
    gap = 2.0;
  pf(
    g,
    new T.SphereGeometry(0.56, 20, 12, Math.PI / 2 + gap / 2, TAU - gap, 0, Math.PI * 0.64),
    0,
    2.56,
    -0.03,
    3,
    2,
    "hat",
    1,
  );
  const pt = new T.ConeGeometry(0.26, 0.9, 12);
  pt.translate(0, 0.45, 0);
  pf(g, pt, 0, 2.9, -0.32, 2, 1, "hat").rotation.x = -1.25;
  pf(g, Cy(0.62, 0.88, 0.3, 18), 0, 2.12, -0.02, 3, 1, "hat");
  pm(g, Sp(0.08, 8), 0xd9a441, 0, 2.15, 0.82);
}
// --- hat 3: crescent hat (tall straight cone, glowing moon on top, stars on the band) ---
{
  const g = lg("hat", 3);
  pf(g, new T.CylinderGeometry(0.95, 0.98, 0.08, 28), 0, 2.86, 0, 3, 3, "hat");
  pf(g, new T.TorusGeometry(0.94, 0.045, 6, 28), 0, 2.86, 0, 6, 1, "hat").rotation.x = Math.PI / 2;
  pf(g, Cn(0.58, 1.9, 22), 0, 3.82, 0, 4, 2, "hat");
  pm(g, Cy(0.57, 0.6, 0.14, 18), 0xc0c8d8, 0, 2.97, 0);
  [-0.6, 0, 0.6].forEach((a) => {
    const s = pm(g, new T.OctahedronGeometry(0.07), 0xfff2b0, Math.sin(a) * 0.6, 2.97, Math.cos(a) * 0.6);
    s.material.emissive.setHex(0x887744);
  });
  const mo = pm(g, new T.TorusGeometry(0.2, 0.06, 8, 16, Math.PI * 1.35), 0xfff2b0, 0, 4.98, 0, 0, 2.59);
  mo.material.emissive.setHex(0xffe6a0);
  mo.material.emissiveIntensity = 0.7;
  mo.userData.nol = 1;
}
// --- hat 4: scholar's cap (soft slouched cap with a tassel) ---
{
  const g = lg("hat", 4);
  pf(g, Cy(0.45, 0.45, 0.14, 18), 0, 2.86, 0, 3, 1, "hat");
  const cp = pf(g, Sp(0.62, 18), 0.08, 3.0, -0.04, 3, 2, "hat");
  cp.scale.set(1, 0.32, 1);
  cp.rotation.z = -0.18;
  pm(g, Cy(0.46, 0.46, 0.05, 18), 0xd9a441, 0, 2.8, 0);
  pm(g, Sp(0.07, 8), 0x2a2430, 0.04, 3.2, -0.02);
  pm(g, Cy(0.015, 0.015, 0.45, 4), 0xd9a441, 0.38, 3.0, 0.2, 0, 0.5);
  pm(g, Cn(0.07, 0.2, 8), 0xd9a441, 0.5, 2.78, 0.26);
}
// cape hangs from a pivot at the shoulders so it can sway and stream out behind you when you run
const CAPE = new T.Group();
CAPE.position.set(0, 2.15, -0.62);
W.add(CAPE);
{
  // v47 clean look: a curved cloth cape wrapping the back (was a flat slab), flaring toward the hem
  // narrower arc (its side edges used to stick out past the skirt like flat boards) and long enough to reach the hem
  const cg = new T.CylinderGeometry(0.6, 0.98, 1.82, 24, 4, true, Math.PI - 0.72, 1.44);
  cg.translate(0, -0.86, 0.62);
  const cm = mk(cg, 0x7a2a5a, 0, 0, 0, 1);
  cm.material.side = T.DoubleSide;
  CAPE.add(cm);
  CAPE.rotation.x = 0.25;
}
W.rotation.order = "YXZ";
const arm = (x) => {
  const g = new T.Group();
  g.position.set(x, 2.0, 0.04);
  g.add(
    mk(Sp(0.2, 8), 0x35408f, 0, 0, 0, 1),
    mk(Cy(0.15, 0.19, 0.95, 8), 0x35408f, 0, -0.5, 0, 1),
    mk(Cy(0.18, 0.18, 0.12, 8), 0xd9a441, 0, -0.86, 0, 1),
    mk(Sp(0.15, 8), 0xf1c9a5, 0, -1.02, 0.03, 1),
  );
  W.add(g);
  return g;
};
const AL = arm(-0.7),
  AR = arm(0.7);
// v9: the staff is gripped at the outside of the hand and leans out a touch, so it clears the belt, robe, hat brim and boots
// (it used to run straight down through the belt and the hat brim). It stops short of the ground, and the lantern sits above the brim.
const STF = new T.Group();
STF.position.set(0.18, -1.0, 0.1);
STF.rotation.z = -0.12;
AR.add(STF);
const LY = 2.3;
// wand 0: lantern staff (the original). Each wand style sets o = where the lantern glow + light sit (STF space).
{
  const g = lg("wand", 0, STF);
  LOOKS.wand[0].o = [0, LY, 0];
  pm(g, Cy(0.05, 0.06, 2.7, 6), 0x8a5a2b, 0, 0.75, 0);
  pm(g, Cy(0.075, 0.075, 0.22, 8), 0xd9a441, 0, 0, 0);
  pm(g, Cn(0.24, 0.3, 6), 0x222222, 0, LY + 0.36, 0);
  pm(g, B(0.34, 0.42, 0.34), 0x3a2a18, 0, LY, 0);
  pm(g, B(0.26, 0.34, 0.26), 0xffd27a, 0, LY, 0).material.emissive.setHex(0xaa7a22);
}
// wand 1: crystal staff (dark pole, silver rings, prongs cradling a floating crystal)
{
  const g = lg("wand", 1, STF);
  LOOKS.wand[1].o = [0, LY, 0];
  pm(g, Cy(0.045, 0.06, 2.5, 8), 0x3a2a4a, 0, 0.7, 0);
  [-0.35, 0, 0.7, 1.4].forEach((y) => pm(g, Cy(0.075, 0.075, 0.07, 8), 0xc0c8d8, 0, y, 0));
  pm(g, Cy(0.09, 0.05, 0.22, 8), 0xc0c8d8, 0, 2.02, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU,
      p = new T.Group();
    p.position.set(0, 2.08, 0);
    p.rotation.y = a;
    g.add(p);
    pm(p, B(0.05, 0.42, 0.05), 0xc0c8d8, 0.14, 0.18, 0, 0, -0.45);
    pm(p, B(0.04, 0.22, 0.04), 0xc0c8d8, 0.21, 0.45, 0, 0, 0.35);
  }
  const cr = pg(g, new T.OctahedronGeometry(0.2), 0, LY, 0);
  cr.scale.set(1, 1.7, 1);
}
// wand 2: gnarled staff (crooked branch, knots, twigs curling round a seed of light, two leaves)
{
  const g = lg("wand", 2, STF);
  LOOKS.wand[2].o = [0, LY, 0];
  let px = 0,
    py = -0.45;
  [
    [0.07, 0.06, 0.8, 0.05],
    [0.06, 0.055, 0.7, -0.08],
    [0.055, 0.05, 0.6, 0.06],
    [0.05, 0.045, 0.45, -0.04],
  ].forEach(([r0, r1, h, a]) => {
    const sg = new T.CylinderGeometry(r1, r0, h, 7);
    sg.translate(0, h / 2, 0);
    pm(g, sg, 0x5a3a20, px, py, 0, 0, -a);
    px += Math.sin(a) * h;
    py += Math.cos(a) * h;
    pm(g, Sp(r1 * 1.4, 7), 0x5a3a20, px, py, 0);
  });
  for (let i = 0; i < 3; i++) {
    const t = pm(
      g,
      new T.TorusGeometry(0.17, 0.028, 5, 10, Math.PI * 1.1),
      0x5a3a20,
      px,
      LY - 0.05,
      0,
      0,
      0,
      0,
      (i / 3) * TAU,
    );
    t.rotation.x = 0;
    t.rotation.order = "YXZ";
    t.rotation.z = -0.3;
  }
  pg(g, Sp(0.12, 10), px, LY, 0);
  [0.6, -0.4].forEach((a, i) => {
    const l = pm(g, Sp(0.12, 8), 0x3aa86b, px + (i ? -0.12 : 0.14), 1.5 + i * 0.35, 0.04, 0, a);
    l.scale.set(0.5, 1.2, 0.15);
  });
}
// wand 3: starling wand (short, held forward, star tip)
{
  const g = lg("wand", 3, STF);
  g.rotation.x = 0.85;
  const L3 = 1.15;
  LOOKS.wand[3].o = [0, Math.cos(0.85) * L3, Math.sin(0.85) * L3];
  pm(g, Cy(0.028, 0.045, 1.3, 8), 0x2a1a14, 0, 0.45, 0);
  pm(g, Cy(0.055, 0.055, 0.34, 8), 0x7a2a5a, 0, 0, 0);
  pm(g, Sp(0.07, 8), 0xd9a441, 0, -0.2, 0);
  pm(g, Cy(0.05, 0.05, 0.04, 8), 0xd9a441, 0, 0.18, 0);
  const st = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU,
      r = i % 2 ? 0.07 : 0.17;
    st[i ? "lineTo" : "moveTo"](Math.sin(a) * r, Math.cos(a) * r);
  }
  const sg = new T.ExtrudeGeometry(st, { depth: 0.05, bevelEnabled: false });
  sg.translate(0, 0, -0.025);
  pg(g, sg, 0, L3, 0);
}
// wand 4: moon sceptre (silver shaft, gold rings, crescent round the light)
{
  const g = lg("wand", 4, STF);
  LOOKS.wand[4].o = [0, 1.62, 0];
  pm(g, Cy(0.04, 0.05, 1.9, 8), 0xc0c8d8, 0, 0.45, 0);
  pm(g, Sp(0.08, 8), 0xd9a441, 0, -0.52, 0);
  [-0.12, 0.12, 1.2].forEach((y) => pm(g, Cy(0.07, 0.07, 0.06, 8), 0xd9a441, 0, y, 0));
  pm(g, Cn(0.11, 0.18, 8), 0xd9a441, 0, 1.3, 0, Math.PI);
  pm(g, new T.TorusGeometry(0.27, 0.05, 6, 18, Math.PI * 1.5), 0xd9d9e8, 0, 1.62, 0, 0, Math.PI * 0.75);
  pg(g, Sp(0.11, 10), 0, 1.62, 0);
}
const orb = new T.Sprite(AM(GLT, false));
orb.scale.setScalar(1.7);
orb.position.set(0, LY, 0);
orb.userData.orb = 1;
STF.add(orb);
const lamp = new T.PointLight(0xffc27a, 1.3, 16);
lamp.position.set(0, LY, 0);
STF.add(lamp);
const FL = mk(B(0.4, 0.25, 0.6), 0x3a2418, -0.3, 0.12, 0.35, 1),
  FR = mk(B(0.4, 0.25, 0.6), 0x3a2418, 0.3, 0.12, 0.35, 1);
FL.userData.foot = FR.userData.foot = 1;
W.add(FL, FR);
// limb tags survive W.clone(), so other players' wizards (wizFor) can find their own arms/feet/cape to animate
[
  [AL, "AL"],
  [AR, "AR"],
  [FL, "FL"],
  [FR, "FR"],
  [CAPE, "CAPE"],
].forEach(([m, k]) => (m.userData.pt = k));
// style parts that ride on the arms and feet (these exist only now)
[FL, FR].forEach((f) => {
  const g = lg("robe", 2, f);
  pm(g, Cy(0.15, 0.13, 0.75, 8), 0x2a2430, 0, 0.42, -0.08);
  pm(g, Cy(0.17, 0.17, 0.12, 8), 0x3a2418, 0, 0.18, -0.06);
});
[AL, AR].forEach((a, i) => {
  const g = lg("robe", 2, a),
    t = i ? -0.25 : 0.25;
  pm(g, new T.SphereGeometry(0.32, 14, 8, 0, TAU, 0, Math.PI / 2), 0xa8b0c0, 0, 0, 0, 0, t);
  pm(g, new T.TorusGeometry(0.31, 0.035, 6, 18), 0xd9a441, 0, 0, 0, Math.PI / 2, t);
  pm(g, Cy(0.2, 0.22, 0.2, 8), 0x4a2e1a, 0, -0.78, 0);
  const s = lg("robe", 3, a);
  pf(s, Cy(0.19, 0.36, 0.42, 12), 0, -0.68, 0.02, 2, 1, "robe");
  pm(s, new T.TorusGeometry(0.35, 0.035, 6, 16), 0xc0c8d8, 0, -0.89, 0.02, Math.PI / 2);
});
// LPRV = a style Pip is holding up against you (preview only)
let LPRV = null;
// v18: styles ride on gear. The robe / hat / staff you wear shows its own style (item.lk) when it has one; Pip can
// restyle it. Without one (or with nothing equipped in that slot) your old P.look choice shows.
const LKSL = { robe: "robe", hat: "hat", wand: "staff" },
  lookItem = (k) => (typeof P !== "undefined" && P.gear ? P.gear[LKSL[k]] : null),
  lookBase = (k) => {
    const it = lookItem(k),
      i = it && it.lk != null ? it.lk : typeof P !== "undefined" && P.look ? P.look[k] | 0 : 0;
    return LOOKS[k][i] ? i : 0;
  };
const ORB0 = new T.Vector3(0, LY, 0),
  lookOf = (k) => (LPRV && LPRV.k === k ? LPRV.i : lookBase(k));
function applyLook() {
  Object.keys(LOOKS).forEach((k) => {
    const on = lookOf(k);
    LOOKS[k].forEach((s, i) => (s.g || []).forEach((g) => (g.visible = i === on)));
  });
  ORB0.fromArray(LOOKS.wand[lookOf("wand")].o);
  orb.position.copy(ORB0);
  lamp.position.copy(ORB0);
}
// ---- v18 rig: the wizard gets joints like Soot the cat. A neck pivot (WHEAD) carries the face, beard and every hat
// style, so the head nods, turns and tilts with its hat on. Each arm gets an elbow (WELB): the forearm, cuff, a hand
// with a thumb, the staff, and any style parts below the elbow (moved into twin style groups, so styles still switch).
// The boots are rounded with soles and roll heel-to-toe. Joints are tagged (userData.pt) so other players' clones
// animate the same way through wizRig(). Built before outline(W) so the outlines follow the new parents.
const WHEAD = new T.Group();
WHEAD.position.set(0, 2.22, 0);
WHEAD.userData.pt = "HEAD";
W.add(WHEAD);
W.children.slice().forEach((c) => {
  if (c === WHEAD) return;
  const hat = c.userData.lk && c.userData.lk[0] === "hat",
    face = c.isMesh && !c.userData.foot && (c.position.y >= 2.12 || c.material.color.getHex() === 0xe8e0f0);
  if (!hat && !face) return;
  W.remove(c);
  c.position.y -= 2.22;
  WHEAD.add(c);
});
EYES.forEach((e) => (e.userData.pt = "EY"));
const WELB = [AL, AR].map((a, i) => {
  const e = new T.Group(),
    sg = i ? 1 : -1,
    kids = a.children.slice(),
    sl = kids[1]; // the plain sleeve: split at the elbow
  e.position.set(0, -0.5, 0.02);
  e.userData.pt = i ? "ER" : "EL";
  a.add(e);
  sl.geometry = Cy(0.15, 0.17, 0.54);
  sl.position.y = -0.25;
  e.add(mk(Sp(0.17, 10), 0x35408f, 0, 0, 0, 1));
  // v47 clean look: the forearm sleeve flares into a soft bell at the wrist (was a straight cylinder)
  {
    const bs = mk(
      Lt(
        [
          [0.235, -0.5],
          [0.245, -0.46],
          [0.21, -0.36],
          [0.18, -0.2],
          [0.17, 0.01],
        ],
        28,
      ),
      0x35408f,
      0,
      0,
      0,
      1,
    );
    bs.material.side = T.DoubleSide;
    e.add(bs);
    const cr = mk(new T.TorusGeometry(0.238, 0.035, 8, 32), 0xd9a441, 0, -0.485, 0, 1);
    cr.rotation.x = Math.PI / 2;
    e.add(cr);
  }
  const down = (m) => {
    m.position.y += 0.5;
    m.position.z -= 0.02;
  };
  kids.forEach((c) => {
    if (c === sl) return;
    if (c.userData.lk) {
      const low = c.children.filter((m) => m.position.y < -0.45);
      if (!low.length) return;
      const tw = lg(c.userData.lk[0], c.userData.lk[1], e);
      low.forEach((m) => {
        c.remove(m);
        down(m);
        tw.add(m);
      });
    } else if (c.position.y < -0.45) {
      a.remove(c);
      down(c);
      e.add(c);
    }
  });
  e.add(mk(Sp(0.065, 8), 0xf1c9a5, -sg * 0.1, -0.48, 0.1, 1)); // thumb, on the inside of the hand
  return e;
});
STF.userData.pt = "STF";
// v21 grip: the staff's grip ring (STF origin) now sits inside the closed fist - between the palm (hand ball at
// y -0.52) and the curled fingers (y -0.6, in front) - instead of 0.18 out to the side, where it floated beside the hand
// v47 polish: held at the front of the fist (z .2, clear of the sleeve) and leaning out more (top clears the hat brim)
STF.position.set(0.04, -0.57, 0.2);
STF.rotation.z = -0.17;
[FL, FR].forEach((f) => {
  // v47 clean look: chunkier storybook boots with a broad sole and a turned-down cuff
  const g = new T.SphereGeometry(0.25, 20, 14);
  g.scale(0.95, 0.56, 1.38);
  g.translate(0, 0, 0.05);
  f.geometry = g;
  f.add(mk(B(0.43, 0.06, 0.68), 0x1a120c, 0, -0.115, 0.05, 1)); // sole
  const cuff = mk(new T.TorusGeometry(0.15, 0.05, 10, 24), 0x5a3a22, 0, 0.12, -0.12, 1);
  cuff.rotation.x = Math.PI / 2;
  f.add(cuff);
});
// ---- v18 quality pass (like Soot): painted fabric folds, skin and beard strands, layered eyes, ears, fuller brows,
// fingers, and every round part rebuilt smoother. All before outline(W), so outlines match.
{
  const canv = (w, h, fn) => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    fn(cv.getContext("2d"), w, h);
    const t = new T.CanvasTexture(cv);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  // robe and cape cloth: soft vertical folds (light / shade bands), a fine weave and flecks. Near-white, so dyes tint true.
  // v47 clean look: smooth painted folds (cosine light/shade, no weave or flecks), lighter at the shoulders
  const foldT = canv(256, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 32; i++) {
      const v = Math.round(224 + 24 * (0.5 + 0.5 * Math.cos((i / 32) * Math.PI * 2 * 4)));
      g.addColorStop(i / 32, "rgb(" + v + "," + v + "," + (v + 4 > 255 ? 255 : v + 4) + ")");
    }
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    const v = x.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, "rgba(255,255,255,.12)");
    v.addColorStop(0.5, "rgba(255,255,255,0)");
    v.addColorStop(1, "rgba(30,20,50,.1)");
    x.fillStyle = v;
    x.fillRect(0, 0, w, h);
    // crease lines running down each fold
    x.strokeStyle = "rgba(40,30,60,.08)";
    x.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const px = ((i + 0.5) / 4) * w;
      x.beginPath();
      x.moveTo(px, 0);
      x.bezierCurveTo(px + 6, h * 0.35, px - 6, h * 0.65, px + 2, h);
      x.stroke();
    }
  });
  foldT.repeat.set(2, 1);
  // face: warm skin, rosy cheeks and a soft shade under the brow (sphere column 0.25 faces forward)
  const faceT = canv(256, 128, (x, w, h) => {
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, w, h);
    [-1, 1].forEach((s) => {
      const cx = w * (0.25 + s * 0.075),
        cy = h * 0.6,
        g = x.createRadialGradient(cx, cy, 1, cx, cy, w * 0.06);
      g.addColorStop(0, "rgba(255,120,120,.45)");
      g.addColorStop(1, "rgba(255,120,120,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
    });
    const sh = x.createLinearGradient(0, h * 0.25, 0, h * 0.5);
    sh.addColorStop(0, "rgba(120,70,60,.12)");
    sh.addColorStop(1, "rgba(120,70,60,0)");
    x.fillStyle = sh;
    x.fillRect(0, 0, w, h * 0.5);
  });
  // beard and brows: long wavy locks (v47: fewer, broader, softer strands over a top-lit gradient)
  const hairT = canv(128, 256, (x, w, h) => {
    const hg = x.createLinearGradient(0, 0, 0, h);
    hg.addColorStop(0, "#fbfaff");
    hg.addColorStop(1, "#d8d4e4");
    x.fillStyle = hg;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 42; i++) {
      const px = Math.random() * w;
      x.strokeStyle = i % 3 ? "rgba(90,80,120,.13)" : "rgba(255,255,255,.55)";
      x.lineWidth = 2 + Math.random() * 2;
      x.beginPath();
      x.moveTo(px, 0);
      x.bezierCurveTo(px + 5, h * 0.3, px - 5, h * 0.7, px + Math.random() * 4, h);
      x.stroke();
    }
  });
  hairT.repeat.set(3, 1);
  // 1) rebuild low-poly spheres, cylinders, cones and rings smoother (a part whose geometry was scaled when built is
  // left alone; one that was shifted is shifted back into place). Faceted pieces (4-6 sided cones, gems) stay.
  const b0 = new T.Box3(),
    b1 = new T.Box3(),
    v0 = new T.Vector3(),
    v1 = new T.Vector3(),
    s0 = new T.Vector3(),
    s1 = new T.Vector3();
  W.traverse((m) => {
    if (!m.isMesh || !m.geometry.parameters) return;
    const g = m.geometry,
      p = g.parameters;
    let n = null;
    if (g.type === "SphereGeometry" && p.widthSegments < 28)
      n = new T.SphereGeometry(p.radius, 28, 20, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    else if (g.type === "CylinderGeometry" && p.radialSegments < 24 && p.radialSegments > 5)
      n = new T.CylinderGeometry(
        p.radiusTop,
        p.radiusBottom,
        p.height,
        28,
        p.heightSegments,
        p.openEnded,
        p.thetaStart,
        p.thetaLength,
      );
    else if (g.type === "ConeGeometry" && p.radialSegments < 24 && p.radialSegments > 6)
      n = new T.ConeGeometry(p.radius, p.height, 28, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
    else if (g.type === "TorusGeometry" && (p.radialSegments < 10 || p.tubularSegments < 32))
      n = new T.TorusGeometry(p.radius, p.tube, 10, Math.max(36, p.tubularSegments), p.arc);
    if (!n) return;
    g.computeBoundingBox();
    n.computeBoundingBox();
    b0.copy(g.boundingBox).getSize(s0);
    b1.copy(n.boundingBox).getSize(s1);
    if (Math.abs(s0.y - s1.y) > 0.03 * Math.max(s1.y, 0.01) + 0.002) return; // scaled when built: keep
    b0.getCenter(v0);
    b1.getCenter(v1);
    if (Math.abs(v0.y - v1.y) > 0.002) n.translate(0, v0.y - v1.y, 0);
    m.geometry = n;
  });
  // 2) painted cloth on the plain robe / cape pieces (the woven hat fabric keeps its own)
  const cloth = ptex("cloth");
  W.traverse((m) => {
    if (m.isMesh && m.material.map === cloth) {
      m.material.map = foldT;
      m.material.needsUpdate = true;
    }
  });
  const skin = 0xf1c9a5,
    hair = 0xe8e0f0,
    hm = (geo, c, x, y, z, par) => {
      const m = mk(geo, c, x, y, z, 1);
      (par || WHEAD).add(m);
      return m;
    };
  // 3) the head: painted face, beard strands, fuller brows, ears and a moustache
  WHEAD.children.forEach((m) => {
    if (!m.isMesh) return;
    const c = m.material.color.getHex(),
      p = m.geometry.parameters || {};
    if (c === skin && p.radius > 0.4) {
      m.material.map = faceT;
      m.material.needsUpdate = true;
    } else if (c === hair) {
      m.material.map = hairT;
      m.material.needsUpdate = true;
      if (m.geometry.type === "BoxGeometry" && p.height < 0.05) {
        // the brows: soft tufts instead of sticks
        m.geometry = new T.SphereGeometry(0.06, 16, 10);
        m.scale.set(1.55, 0.5, 0.6);
      }
    }
  });
  [-1, 1].forEach((s) => {
    const e = hm(new T.SphereGeometry(0.09, 20, 14), skin, s * 0.41, 0.31, 0.02);
    e.scale.set(0.45, 1, 0.8);
    e.rotation.y = s * 0.3;
    hm(new T.SphereGeometry(0.05, 14, 10), 0xe0a888, s * 0.43, 0.31, 0.04).scale.set(0.35, 0.85, 0.6);
  });
  // 4) layered eyes: white, iris (the old eye), pupil, two glints and an upper lid. They squash together to blink.
  EYES.forEach((e) => {
    e.material.color.setHex(0x3a5aa8);
    e.material.emissive.setHex(0x0a1a3a);
    e.scale.set(1, 1, 0.6);
    const add3 = (geo, mat, x, y, z) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.userData.nol = 1;
      e.add(m);
      return m;
    };
    add3(new T.SphereGeometry(0.095, 20, 14), new T.MeshBasicMaterial({ color: 0xfaf6ff }), 0, 0, 0.02).scale.set(
      1.1,
      1,
      0.35,
    );
    add3(new T.SphereGeometry(0.042, 16, 12), new T.MeshBasicMaterial({ color: 0x0a0610 }), 0, -0.004, 0.058);
    add3(new T.SphereGeometry(0.012, 8, 6), new T.MeshBasicMaterial({ color: 0xffffff }), -0.022, -0.022, 0.075);
    const lid = add3(
      new T.TorusGeometry(0.094, 0.012, 6, 20, Math.PI),
      new T.MeshBasicMaterial({ color: 0x1e1634 }),
      0,
      0.006,
      0.02,
    );
    lid.scale.set(1.05, 1, 0.5);
  });
  // 5) fingers: three curled fingers on each hand (the thumb is already there)
  WELB.forEach((e) => {
    const hand = e.children.find(
      (m) => m.isMesh && m.material.color.getHex() === skin && (m.geometry.parameters || {}).radius > 0.12,
    );
    if (!hand) return;
    hand.scale.set(1, 0.9, 1.1);
    for (let k = 0; k < 3; k++) {
      const f = hm(new T.CylinderGeometry(0.038, 0.042, 0.14, 12), skin, (k - 1) * 0.07, -0.6, 0.09, e);
      f.rotation.x = 0.75;
      hm(new T.SphereGeometry(0.038, 12, 8), skin, (k - 1) * 0.07, -0.655, 0.145, e);
    }
  });
  // 6) v18 character customizer: a smile that shows without the full beard, and every part it can change is tagged
  // (userData.ap) for wizLook()
  const mo = hm(new T.TorusGeometry(0.055, 0.014, 6, 16, Math.PI), 0x6a2a2a, 0, 0.17, 0.405);
  mo.rotation.z = Math.PI;
  mo.userData.nol = 1;
  mo.userData.ap = "mouth";
  mo.visible = false;
  W.traverse((m) => {
    if (!m.isMesh || m.userData.ap) return;
    const c = m.material.color.getHex();
    if (c === skin) m.userData.ap = "skin";
    else if (c === 0xe8b890 || c === 0xe0a888) m.userData.ap = "skin2";
    else if (c === hair && m.parent === WHEAD) m.userData.ap = m.geometry.type === "SphereGeometry" ? "brow" : "beard";
  });
  EYES.forEach((e) => (e.userData.ap = "iris"));
}
// v18 character customizer options (P.app holds an index per option; 0 / height 1 = the classic look)
const APPO = {
  skin: [
    ["Rosy", 0xf1c9a5],
    ["Fair", 0xf8e0cc],
    ["Tan", 0xd9a77a],
    ["Bronze", 0xb57a50],
    ["Umber", 0x8a5a3a],
    ["Deep", 0x5e3a26],
  ],
  hair: [
    ["Snow", 0xe8e0f0],
    ["Ash", 0x9a96a6],
    ["Chestnut", 0x6a4028],
    ["Raven", 0x2a2230],
    ["Ginger", 0xc8642a],
    ["Golden", 0xe0b860],
  ],
  beard: [
    ["Full beard", 0],
    ["Short beard", 1],
    ["Clean-shaven", 2],
  ],
  eyes: [
    ["Blue", 0x3a5aa8],
    ["Green", 0x3a9a5a],
    ["Amber", 0xc8882a],
    ["Violet", 0x7a4ac8],
    ["Brown", 0x6a4028],
    ["Grey", 0x8a8aa0],
  ],
  ht: [
    ["Short", 0.92],
    ["Medium", 1],
    ["Tall", 1.08],
  ],
};
// paint a wizard (W or a clone) with an appearance; also leaves its height factor in o.userData.ht
function wizLook(o, a) {
  a = a || {};
  const v = (k, d) => (APPO[k][a[k] == null ? d : a[k]] || APPO[k][d])[1],
    sk = v("skin", 0),
    s2 = new T.Color(sk).multiplyScalar(0.9).getHex(),
    hc = v("hair", 0),
    bd = v("beard", 0),
    ey = v("eyes", 0),
    // hide or show a part together with its outline (outline() adds a twin mesh sharing the geometry)
    vis = (m, on) => {
      m.visible = on;
      if (m.parent) m.parent.children.forEach((q) => q.userData.ol && q.geometry === m.geometry && (q.visible = on));
    };
  o.userData.ht = v("ht", 1);
  o.traverse((m) => {
    const u = m.userData;
    if (!u || !u.ap || !m.material) return;
    if (u.ap === "skin") m.material.color.setHex(sk);
    else if (u.ap === "skin2") m.material.color.setHex(s2);
    else if (u.ap === "brow") m.material.color.setHex(hc);
    else if (u.ap === "beard") {
      m.material.color.setHex(hc);
      vis(m, bd === 0 || (bd === 1 && m.geometry.type === "TorusGeometry"));
    } else if (u.ap === "mouth") m.visible = bd !== 0;
    else if (u.ap === "iris") {
      m.material.color.setHex(ey);
      if (m.material.emissive) m.material.emissive.setHex(new T.Color(ey).multiplyScalar(0.2).getHex());
    }
  });
}
// a wizard's joints (W or a clone of it): the tagged parts, the robe style groups (they sway) and the eyes (blink)
function rigParts(o) {
  const p = { RB: [], EY: [] };
  o.traverse((m) => {
    const u = m.userData;
    if (!u) return;
    if (u.pt === "EY") p.EY.push(m);
    else if (u.pt) p[u.pt] = m;
    if (u.lk && u.lk[0] === "robe" && m.parent === o) p.RB.push(m);
  });
  return p;
}
// the v18 joints, shared by your wizard (animW) and other players' (wizAnim). w = 0..1 walking, c = cast pose 0..1,
// v = victory pose 0..1, st = blink state for clones (your own wizard blinks in animW).
function wizRig(p, s, dt, w, run, c, v, st) {
  const ph = s * (run ? 15 : 11),
    sw = Math.sin(ph),
    id = 1 - w,
    k = Math.min(1, dt * 6);
  if (p.HEAD) {
    // idle: glance about and tilt a little; walking: small nods in step; casting: chin up toward the spell
    const H = p.HEAD.rotation;
    const gl = typeof mode !== "undefined" && mode !== "explore" ? 0.15 : 1; // in a fight, eyes stay on the foes
    H.y += ((Math.sin(s * 0.37) * 0.3 + Math.sin(s * 0.13) * 0.15) * id * (1 - c) * gl - H.y) * k;
    H.x += (-0.3 * c - 0.2 * v + Math.sin(ph * 2) * 0.04 * w + Math.sin(s * 0.8) * 0.03 * id - H.x) * k;
    H.z += (Math.sin(s * 0.55) * 0.06 * id + sw * 0.03 * w - H.z) * k;
  }
  // elbows bend more as each arm swings forward, and straighten out to cast or cheer
  const eb = (fw) => -(0.2 + 0.5 * fw * w) * (1 - 0.6 * Math.max(c, v));
  if (p.EL) p.EL.rotation.x = eb(Math.max(0, -sw));
  if (p.ER) {
    p.ER.rotation.x = eb(Math.max(0, sw));
    if (p.STF) p.STF.rotation.x = -p.ER.rotation.x; // the staff stays upright in the hand
  }
  // boots roll toe-down as they lift
  if (p.FL) p.FL.rotation.x = 0.45 * Math.max(0, Math.cos(ph)) * w;
  if (p.FR) p.FR.rotation.x = 0.45 * Math.max(0, -Math.cos(ph)) * w;
  // the robe swings a little with each step
  // v47 polish: no side-to-side robe rock (it read as the whole body swaying, on foot and on mounts)
  p.RB.forEach((g) => (g.rotation.z = 0));
  if (st && p.EY.length) {
    st.bl = (st.bl == null ? 2 : st.bl) - dt;
    const b = st.bl < 0.12;
    p.EY.forEach((e) => (e.scale.y = b ? 0.12 : 1));
    if (st.bl < 0) st.bl = 2 + Math.random() * 3.5;
  }
}
// v47 clean look: storybook proportions, a slightly bigger head (hats and beard ride along in WHEAD)
WHEAD.scale.setScalar(1.1);
W.traverse((m) => {
  if (m.isMesh) m.userData.c0 = m.material.color.getHex();
});
outline(W);
const WPT = rigParts(W);
WPT.w = 0;
applyLook();
S.add(W);
// v18: the wizard leans by tilting about its feet, which pushed the robe's hem (about 0.9 out) under the ground.
// Whatever sets W's height adds this lift so the lowest edge stays on the ground.
// v46: + the walk-on deck under the player (03 BDECK: raised bridges)
const wGround = () =>
  0.9 * Math.abs(Math.sin(W.rotation.x)) + (typeof BDECK !== "undefined" ? BDECK.h(W.position.x, W.position.z) : 0);
function animW(s, dt) {
  const w = mv > 0,
    ph = s * (run ? 15 : 11);
  castT = Math.max(0, castT - dt);
  vicT = Math.max(0, vicT - dt);
  AL.rotation.x = w ? Math.sin(ph) * 0.7 : Math.sin(s * 1.5) * 0.05;
  AL.rotation.z = -0.1;
  AR.rotation.z = 0.1;
  AR.rotation.x =
    castT > 0
      ? -1.9 * Math.sin(Math.min(1, castT / 0.6) * 3.14)
      : w
        ? -Math.sin(ph) * 0.45
        : Math.sin(s * 1.5 + 1) * 0.05;
  // casting: the free hand sweeps up too and the body rocks back a little
  if (castT > 0) {
    const k = Math.sin(Math.min(1, castT / 0.6) * 3.14);
    AL.rotation.x = -1.2 * k;
    AL.rotation.z = -0.1 - 0.5 * k;
  }
  // victory: both arms up, a little hop and a spin
  if (vicT > 0) {
    const k = Math.sin(Math.min(1, vicT / 1.1) * 3.14);
    AL.rotation.x = AR.rotation.x = -2.6 * k;
    AL.rotation.z = -0.1 - 0.4 * k;
    AR.rotation.z = 0.1 + 0.4 * k;
    W.position.y = Math.abs(Math.sin(vicT * 9)) * 0.5 * k;
  }
  FL.position.z = 0.35 + (w ? Math.sin(ph) * 0.35 : 0);
  FR.position.z = 0.35 - (w ? Math.sin(ph) * 0.35 : 0);
  FL.position.y = 0.12 + (w ? Math.max(0, Math.cos(ph)) * 0.15 : 0);
  FR.position.y = 0.12 + (w ? Math.max(0, -Math.cos(ph)) * 0.15 : 0);
  // lean into a run, breathe while idle, cape streams back with speed
  W.rotation.x += ((run ? 0.16 : w ? 0.06 : castT > 0 ? -0.08 : 0) - W.rotation.x) * Math.min(1, dt * 8);
  const br = w ? 0 : Math.sin(s * 2.2) * 0.012,
    ps = 0.78 * (W.userData.ht || 1); // v50: was 0.84; v18: height from the character customizer
  W.scale.set(ps * (1 - br * 0.5), ps * (1 + br), ps * (1 - br * 0.5));
  CAPE.rotation.x +=
    ((run ? 1.0 : w ? 0.55 : 0.25 + Math.sin(s * 1.3) * 0.04) + (w ? Math.sin(ph * 2) * 0.08 : 0) - CAPE.rotation.x) *
    Math.min(1, dt * 6);
  CAPE.rotation.z = w ? Math.sin(ph) * 0.06 : Math.sin(s * 0.9) * 0.03;
  // blink every few seconds
  blinkT -= dt;
  const bl = blinkT < 0.12;
  EYES.forEach((e) => (e.scale.y = bl ? 0.12 : 1));
  if (blinkT < 0) blinkT = 2 + Math.random() * 3.5;
  // v18 joints: head, elbows, boot roll and robe sway (walking eases in and out so the elbows don't snap)
  WPT.w += ((w ? 1 : 0) - WPT.w) * Math.min(1, dt * 8);
  wizRig(
    WPT,
    s,
    dt,
    WPT.w,
    run,
    castT > 0 ? Math.sin(Math.min(1, castT / 0.6) * 3.14) : 0,
    vicT > 0 ? Math.sin(Math.min(1, vicT / 1.1) * 3.14) : 0,
  );
}
const HUES = [0x7a5cd6, 0xd94a4a, 0x3aa86b, 0xe0702a, 0x5a2a8a],
  NAMES = ["Gloomling", "Dusk Imp", "Moss Brute", "Cinder Fiend", "Gloom Warden"];
// gloom creatures are rigged: body (squash/stretch), head (tilt), eye groups (blink), shoulder-pivot arms, wing and tail pivots, feet
// v23: meaner look, second pass. Asymmetric hunch (one shoulder higher, head sunk forward between them), a 256px skin
// texture (greyscale so every tint keeps its colour: smoky mottling, soot fading darker toward the feet, pores, veins
// and jagged cracks) whose emissive map makes the cracks glow in the foe's colour; a glowing core caged by ribs in the
// chest; deep-set slanted eyes with an additive halo; a split jaw (hd.userData.jw) with uneven teeth and an underbite;
// elbowed arms (arm.userData.fa = forearm pivot, .cl = talon pivot) with layered talons; a jagged spine ridge; a
// two-part whip tail (tail.userData.t2) that trails off into smoke wisps. Higher tiers get more/longer spines, extra
// horns, tusks, elbow spikes and a bigger core. Small pieces are merged into one mesh each; textures and sprite
// materials are shared by every foe; per-foe materials are only the pulsing skin/core.
function gloom(t, hc) {
  const h = hc || HUES[t - 1],
    o = new T.Group(),
    dk = 0x20162e,
    bd = new T.Group();
  o.add(bd);
  // shared textures (built once, cached on the function so no new global names)
  const tx =
    gloom.tx ||
    (gloom.tx = (() => {
      const R = Math.random,
        N = 256,
        cv = (fn, n, rep) => {
          const c = document.createElement("canvas");
          c.width = c.height = n || N;
          fn(c.getContext("2d"));
          const q = new T.CanvasTexture(c);
          if (rep) {
            q.wrapS = q.wrapT = T.RepeatWrapping;
            q.repeat.set(2, 1);
          }
          return q;
        },
        wrap = (f) => {
          for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) f(ox, oy);
        },
        walk = (n, step, turn, sx, sy) => {
          let px = sx == null ? R() * N : sx,
            py = sy == null ? R() * N : sy,
            an = R() * 6.3;
          const v = [[px, py]];
          for (let k = 0; k < n; k++) {
            an += (R() - 0.5) * turn;
            px += Math.cos(an) * step * (0.6 + R() * 0.8);
            py += Math.sin(an) * step * (0.6 + R() * 0.8);
            v.push([px, py]);
          }
          return v;
        },
        veins = [],
        cracks = [];
      for (let i = 0; i < 14; i++) veins.push(walk(20, 9, 1.0));
      for (let i = 0; i < 12; i++) {
        const c = walk(9, 8, 2.4);
        cracks.push(c);
        const b = c[2 + Math.floor(R() * 5)];
        cracks.push(walk(4, 6, 2.6, b[0], b[1]));
      }
      const lines = (x, L, col, w, dx, dy) => {
        x.strokeStyle = col;
        x.lineWidth = w;
        x.lineCap = x.lineJoin = "round";
        L.forEach((v) =>
          wrap((ox, oy) => {
            x.beginPath();
            v.forEach(([px, py], k) =>
              k
                ? x.lineTo(px + ox + (dx || 0), py + oy + (dy || 0))
                : x.moveTo(px + ox + (dx || 0), py + oy + (dy || 0)),
            );
            x.stroke();
          }),
        );
      };
      const blob = (x, px, py, r, c, a) =>
        wrap((ox, oy) => {
          const q = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
          q.addColorStop(0, "rgba(" + c + "," + a + ")");
          q.addColorStop(1, "rgba(" + c + ",0)");
          x.fillStyle = q;
          x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2);
        });
      const map = cv(
        (x) => {
          x.fillStyle = "#e8e8e8";
          x.fillRect(0, 0, N, N);
          // smoky mottling
          // v47 clean look: fewer, broader, gentler patches; no grain or pores
          for (let i = 0; i < 34; i++)
            blob(x, R() * N, R() * N, 20 + R() * 40, R() < 0.6 ? "0,0,0" : "255,255,255", 0.07 + R() * 0.08);
          // soot: darker toward the bottom of each part (canvas top = top of a sphere)
          const sg = x.createLinearGradient(0, 0, 0, N);
          sg.addColorStop(0, "rgba(255,255,255,.08)");
          sg.addColorStop(0.55, "rgba(0,0,0,0)");
          sg.addColorStop(1, "rgba(10,5,15,.32)");
          x.fillStyle = sg;
          x.fillRect(0, 0, N, N);
          lines(x, veins, "rgba(30,18,40,.18)", 5);
          lines(x, veins, "rgba(30,18,40,.26)", 2);
          lines(x, cracks, "rgba(15,8,20,.5)", 3.5);
          lines(x, cracks, "rgba(255,255,255,.25)", 1, 1.5, 1.5);
        },
        N,
        1,
      );
      const em = cv(
        (x) => {
          x.fillStyle = "#000";
          x.fillRect(0, 0, N, N);
          lines(x, veins, "rgba(255,255,255,.12)", 6);
          lines(x, veins, "rgba(255,255,255,.4)", 1.5);
          lines(x, cracks, "rgba(255,255,255,.22)", 9);
          lines(x, cracks, "rgba(255,255,255,.55)", 4);
          lines(x, cracks, "#fff", 1.6);
        },
        N,
        1,
      );
      // soft smoke puff for the tail wisps (white; each sprite material tints it)
      const smoke = cv((x) => {
        for (let i = 0; i < 16; i++) {
          const an = R() * 6.3,
            d = R() * 12,
            r = 8 + R() * 12,
            px = 32 + Math.cos(an) * d,
            py = 32 + Math.sin(an) * d,
            q = x.createRadialGradient(px, py, 0, px, py, r);
          q.addColorStop(0, "rgba(255,255,255,.35)");
          q.addColorStop(1, "rgba(255,255,255,0)");
          x.fillStyle = q;
          x.fillRect(0, 0, 64, 64);
        }
      }, 64);
      return { map, em, smoke, spr: {} };
    })());
  const hcol = new T.Color(h),
    eyeC = t === 5 ? 0xe0b0ff : t === 4 ? 0xff7a30 : 0xffd84a,
    coreCol = hcol.clone().lerp(new T.Color(eyeC), 0.45).offsetHSL(0, 0.1, 0.12),
    coreC = coreCol.getHex(),
    smokeC = hcol.clone().lerp(new T.Color(0x0a0610), 0.6).getHex(),
    ei0 = 0.35 + 0.1 * t,
    toon = (o2) => new T.MeshToonMaterial(Object.assign({ gradientMap: GR }, o2)),
    skin = toon({
      color: h,
      map: tx.map,
      emissiveMap: tx.em,
      emissive: hcol.clone().lerp(coreCol, 0.4).multiplyScalar(0.7),
      emissiveIntensity: ei0,
    }),
    dkm = toon({ color: new T.Color(dk).lerp(hcol, 0.15), map: tx.map }),
    belm = toon({ color: hcol.clone().lerp(new T.Color(0x0e0a14), 0.5), map: tx.map }),
    bone = toon({ color: t >= 4 ? 0xf0e0c0 : 0xe6dccb }),
    eyeM = toon({ color: eyeC, emissive: eyeC, emissiveIntensity: 0.9 }),
    coreM = toon({ color: coreC, emissive: coreC, emissiveIntensity: 1 }),
    mawM = toon({ color: 0x1a0606, emissive: t >= 4 ? 0xcc3300 : 0x8a1800, emissiveIntensity: 0.6 + 0.08 * t }),
    sprM = (k, o2) =>
      tx.spr[k] || (tx.spr[k] = new T.SpriteMaterial(Object.assign({ transparent: true, depthWrite: false }, o2))),
    glowM = sprM("e" + eyeC, { map: GLT, color: eyeC, opacity: 0.6, blending: T.AdditiveBlending }),
    coreG = sprM("c" + coreC, { map: GLT, color: coreC, opacity: 0.7, blending: T.AdditiveBlending }),
    smokeM = sprM("s" + smokeC, { map: tx.smoke, color: smokeC, opacity: 0.75 });
  // c: a colour (own material, as before) or a shared Material
  const a = (g, c, x, y, z, rx, rz, p) => {
    const m = c.isMaterial ? new T.Mesh(g, c) : mk(g, c, 0, 0, 0, 1);
    m.position.set(x, y, z);
    m.rotation.set(rx || 0, 0, rz || 0);
    (p || bd).add(m);
    return m;
  };
  const grp = (x, y, z, p) => {
    const q = new T.Group();
    q.position.set(x, y, z);
    (p || bd).add(q);
    return q;
  };
  const spr = (m, x, y, z, sx, sy, p) => {
    const q = new T.Sprite(m);
    q.position.set(x, y, z);
    q.scale.set(sx, sy || sx, 1);
    p.add(q);
    return q;
  };
  // merge small pieces ([geometry, x, y, z, rx, ry, rz]) into one geometry = one draw call
  const mrg = (L) => {
    const pos = [],
      nor = [],
      uv = [],
      mt = new T.Matrix4(),
      e = new T.Euler(),
      qq = new T.Quaternion(),
      v = new T.Vector3(),
      one = new T.Vector3(1, 1, 1);
    L.forEach(([g0, x, y, z, rx, ry, rz]) => {
      const g = g0.index ? g0.toNonIndexed() : g0;
      g.applyMatrix4(mt.compose(v.set(x, y, z), qq.setFromEuler(e.set(rx || 0, ry || 0, rz || 0)), one));
      pos.push(...g.attributes.position.array);
      nor.push(...g.attributes.normal.array);
      uv.push(...g.attributes.uv.array);
      if (g !== g0) g.dispose();
      g0.dispose();
    });
    const out = new T.BufferGeometry();
    out.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    out.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    out.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    return out;
  };
  const big = t >= 3 ? 0.25 : 0;
  // asymmetric hunched torso: the right shoulder hump rides higher, darker belly
  a(Sp(1, 20), skin, 0.04, 1.1, 0.05, 0.3, -0.06).scale.set(1 + big, 1.0, 1.0);
  a(Sp(0.62, 16), skin, 0.12, 1.84, -0.2, 0, -0.12).scale.set(1.35 + big, 0.85, 1.05);
  const bel = a(Sp(0.62, 14), belm, 0, 0.95, 0.62, 0.3);
  bel.scale.set(1, 1.1, 0.45);
  bel.userData.nol = 1;
  // glowing core in the chest, caged by ribs, with a halo (pulses in animGloom)
  const core = a(Sp(0.17 + 0.025 * t, 12), coreM, 0, 1.12, 0.84);
  core.userData.nol = 1;
  const cs = spr(coreG, 0, 1.12, 1.0, 0.9 + 0.15 * t, 0, bd);
  {
    const L = [];
    [-0.13, 0, 0.13].forEach((y, k) => {
      const g = new T.TorusGeometry(0.3 - Math.abs(y) * 0.5, 0.03, 4, 10, Math.PI);
      L.push([g, 0, y, 0, Math.PI / 2 + (k - 1) * 0.15, 0, 0]);
    });
    a(mrg(L), dkm, 0, 1.12, 0.78).userData.nol = 1;
  }
  // jagged spine ridge (more and longer spines on higher tiers, each kinked a little) + uneven shoulder spikes
  {
    const n = 3 + t,
      L = [],
      cy = 1.55,
      cz = -0.55;
    for (let k = 0; k < n; k++) {
      const f = k / (n - 1),
        ph = 0.25 + f * 1.5,
        r = 0.96 + 0.35 * Math.max(0, 1 - ph / 1.2),
        hg = (0.42 + 0.08 * t) * (k % 2 ? 0.62 : 1) * (1 - 0.3 * f),
        ny = Math.cos(ph),
        nz = -Math.sin(ph);
      L.push([
        Cn(0.1 + 0.02 * t, hg, 5),
        (k % 2 ? 0.05 : -0.04) + 0.06 * (1 - f),
        1.1 + ny * (r + hg * 0.35) - cy,
        0.05 + nz * (r + hg * 0.35) - cz,
        -(ph + 0.2),
        0,
        k % 2 ? 0.22 : -0.18,
      ]);
    }
    [-1, 1].forEach((s) => {
      const hg = (0.35 + 0.06 * t) * (s > 0 ? 1.2 : 0.9);
      L.push([Cn(0.09 + 0.015 * t, hg, 5), s * 0.74 + 0.08, (s > 0 ? 2.08 : 1.95) - cy, -0.15 - cz, -0.3, 0, -s * 0.7]);
      if (t >= 2)
        L.push([Cn(0.07, hg * 0.6, 4), s * 0.95 + 0.08, (s > 0 ? 1.95 : 1.82) - cy, -0.05 - cz, -0.1, 0, -s * 1.05]);
    });
    a(mrg(L), dkm, 0, cy, cz);
  }
  const hd = grp(0.05, 1.88, 0.75);
  a(Sp(0.58, 18), skin, 0, 0, 0, 0, 0, hd).scale.set(1.05, 0.9, 1.08);
  // horns sweep back and out, longer with tier; tier 3+ a second pair, tier 4+ back horns
  [-1, 1].forEach((s) => {
    a(Cn(0.12 + 0.03 * Math.min(t, 3), 0.5 + t * 0.12, 8), dkm, s * 0.33, 0.38, 0, -0.45, -s * 0.55, hd);
    if (t >= 3) a(Cn(0.08, 0.3, 6), dkm, s * 0.46, 0.1, -0.1, -0.2, -s * 1.2, hd);
    if (t >= 4) a(Cn(0.07, 0.38, 5), dkm, s * 0.2, 0.42, -0.28, -1.0, -s * 0.3, hd);
  });
  // brow ridge, deep eye sockets and (tier 2+) brow nubs: one mesh
  {
    const L = [],
      ox = 0,
      oy = 0.15,
      oz = 0.45;
    [-1, 1].forEach((s) => {
      L.push([B(0.3, 0.09, 0.14), s * 0.2 - ox, 0.21 - oy, 0.5 - oz, 0.25, 0, s * 0.45]);
      const so = Sp(0.15, 10);
      so.scale(1.4, 0.75, 0.45);
      L.push([so, s * 0.2 - ox, 0.05 - oy, 0.43 - oz, 0, 0, s * 0.3]);
      if (t >= 2) L.push([Cn(0.05, 0.16, 4), s * 0.32 - ox, 0.27 - oy, 0.42 - oz, -0.3, 0, -s * 0.4]);
    });
    a(mrg(L), dkm, ox, oy, oz, 0, 0, hd);
  }
  // deep-set, slanted glowing eyes with slit pupils and an additive halo (eye groups blink in animGloom)
  const eyes = [-1, 1].map((s) => {
    const e = grp(s * 0.2, 0.05, 0.47, hd);
    const ey = a(Sp(0.11, 10), eyeM, 0, 0, 0, 0, s * 0.3, e);
    ey.scale.set(1.35, 0.5, 0.7);
    ey.userData.nol = 1;
    const pu = a(B(0.022, 0.065, 0.02), 0x120818, 0, 0, 0.078, 0, s * 0.3, e);
    pu.userData.nol = 1;
    spr(glowM, 0, 0, 0.1, 0.62, 0.4, e);
    return e;
  });
  // split jaw: glowing throat, crooked upper teeth on the head; the lower jaw (underbite, fangs, tusks) hinges open
  const mo = a(Sp(0.2, 10), mawM, 0, -0.24, 0.42, 0, 0, hd);
  mo.scale.set(1.3, 0.6, 0.5);
  mo.userData.nol = 1;
  {
    const L = [],
      hs = [0.16, 0.09, 0.13, 0.07, 0.12, 0.1, 0.15],
      nt = 5 + Math.min(t, 2);
    for (let k = 0; k < nt; k++) {
      const x = -0.2 + (0.4 * k) / (nt - 1),
        hg = k === nt - 1 ? 0.15 : hs[k];
      L.push([
        Cn(0.028, hg, 4),
        x,
        -0.15 - hg / 2,
        0.53 - Math.abs(x) * 0.25,
        Math.PI + 0.15,
        0,
        (k % 2 ? 1 : -1) * 0.12,
      ]);
    }
    a(mrg(L), bone, 0, 0, 0, 0, 0, hd).userData.nol = 1;
  }
  const jw = grp(0, -0.2, 0.12, hd);
  a(Sp(0.3, 14), skin, 0, -0.1, 0.24, 0, 0, jw).scale.set(1.15, 0.42, 0.95);
  {
    const L = [];
    [-1, 1].forEach((s) => {
      L.push([Cn(0.036, 0.14 + 0.02 * t, 4), s * 0.14, 0.02, 0.4, -0.15, 0, s * 0.08]);
      if (t >= 3) L.push([Cn(0.045, 0.26, 5), s * 0.26, -0.02, 0.34, -0.35, 0, -s * 0.5]);
    });
    [-0.06, 0, 0.06].forEach((x, k) => L.push([Cn(0.022, [0.06, 0.08, 0.05][k], 4), x, -0.01, 0.43, -0.1, 0, 0]));
    a(mrg(L), bone, 0, 0, 0, 0, 0, jw).userData.nol = 1;
  }
  hd.userData.jw = jw;
  // long elbowed arms: shoulder pivot (one shoulder higher), forearm pivot, layered talons in their own pivot
  const ax = 0.95 + big,
    cl = 0.36 + 0.07 * t,
    arms = [-1, 1].map((s) => {
      const g = grp(s * ax + 0.04, s > 0 ? 1.74 : 1.64, 0.35);
      a(Cy(0.16, 0.12, 0.8, 8), skin, s * 0.08, -0.38, 0, 0, s * 0.15, g);
      if (t >= 3) a(Cn(0.07, 0.28, 5), dkm, s * 0.15, -0.74, -0.14, -2.2, 0, g);
      const fa = grp(s * 0.14, -0.76, 0, g);
      a(Cy(0.12, 0.08, 0.95, 8), skin, 0, -0.47, 0, 0, 0, fa);
      a(Sp(0.15, 8), dkm, 0, -0.95, 0.03, 0, 0, fa).userData.nol = 1;
      const c = grp(0, -1.0, 0.06, fa),
        L = [];
      for (let k = -1; k <= 1; k++)
        L.push([
          Cn(0.05, cl * (k ? 0.85 : 1), 5),
          k * 0.09,
          -0.04 - cl * 0.44,
          0.03 + cl * 0.24,
          Math.PI - 0.5,
          0,
          -k * 0.15,
        ]);
      // second layer: two shorter talons behind, and a hooked thumb spur
      [-0.05, 0.05].forEach((x) =>
        L.push([Cn(0.035, cl * 0.6, 4), x, -0.02 - cl * 0.28, -0.03 + cl * 0.08, Math.PI - 0.25, 0, -x * 2]),
      );
      L.push([Cn(0.04, cl * 0.55, 4), -s * 0.12, -0.02 - cl * 0.24, -0.04 - cl * 0.06, Math.PI + 0.4, 0, s * 0.4]);
      a(mrg(L), bone, 0, 0, 0, 0, 0, c);
      g.userData.cl = c;
      g.userData.fa = fa;
      return g;
    });
  // clawed feet (toe talons are children of each foot so they follow its steps)
  const feet = [-1, 1].map((s) => {
    const f = a(B(0.46, 0.22, 0.58), dkm, s * 0.42, 0.11, 0.32),
      tl = 0.22 + 0.03 * t,
      L = [];
    for (let k = -1; k <= 1; k++) L.push([Cn(0.05, tl, 5), k * 0.14, -0.04, 0.29 + tl / 2, Math.PI / 2, 0, 0]);
    const toes = a(mrg(L), bone, 0, 0, 0, 0, 0, f);
    toes.userData.nol = 1;
    return f;
  });
  // two-part whip tail with a jagged barb, trailing off into smoke wisps
  const tail = grp(0, 0.6, -0.85);
  a(Cn(0.2, 0.8, 8), skin, 0, -0.05, -0.4, -Math.PI / 2.2, 0, tail);
  const t2 = grp(0, -0.1, -0.78, tail);
  a(Cn(0.12, 0.6, 6), skin, 0, -0.02, -0.3, -Math.PI / 2.1, 0, t2).userData.nol = 1;
  a(
    mrg([
      [Cn(0.06, 0.32, 4), 0, 0, 0, -Math.PI / 2, 0.5, 0],
      [Cn(0.06, 0.32, 4), 0, 0, 0, -Math.PI / 2, -0.5, 0],
      [Cn(0.05, 0.26, 4), 0, 0.05, 0, -Math.PI / 2 + 0.6, 0, 0],
    ]),
    dkm,
    0,
    -0.05,
    -0.62,
    0,
    0,
    t2,
  );
  tail.userData.t2 = t2;
  tail.userData.wp = [spr(smokeM, 0, 0.05, -0.8, 0.7, 0, t2), spr(smokeM, 0, 0.15, -1.1, 0.5, 0, t2)];
  let wings = null;
  if (t === 2)
    wings = [-1, 1].map((s) => {
      const g = grp(s * 0.35, 1.97, -0.55);
      a(Cn(0.9, 1.5, 3), 0x4a1d3a, s * 0.55, 0, -0.1, 0, -s * 0.9, g);
      a(Cy(0.03, 0.03, 1.5, 4), dk, s * 0.55, 0.05, -0.05, 0, -s * 0.9, g);
      return g;
    });
  if (t >= 3) {
    // armoured shoulder knobs
    a(Sp(0.42, 10), dkm, -0.91, 1.8, 0.15);
    a(Sp(0.42, 10), dkm, 0.99, 1.9, 0.15);
    // moss brute: mossy tufts and little toadstools growing on its back
    if (t === 3) {
      [
        [-0.5, 1.7, -0.7],
        [0.4, 1.5, -0.8],
        [0, 2.0, -0.55],
      ].forEach(([x, y, z]) => a(new T.IcosahedronGeometry(0.28, 0), 0x3a8a4a, x, y, z));
      [
        [0.55, 1.85, -0.55],
        [-0.3, 1.45, -0.9],
      ].forEach(([x, y, z]) => {
        a(Cy(0.04, 0.05, 0.2, 5), 0xeae0d0, x, y, z);
        a(new T.SphereGeometry(0.13, 8, 5, 0, 6.3, 0, 1.6), 0xd94a6a, x, y + 0.1, z);
      });
    }
  }
  let fl = null;
  if (t >= 4) {
    fl = new T.Sprite(AM(t === 5 ? SP.storm : SP.fire));
    fl.scale.setScalar(2.4);
    fl.position.set(0, 3.4, 0.4);
    o.add(fl);
  }
  if (t === 4)
    for (let k = 0; k < 4; k++) {
      const c = a(
        Cn(0.1, 0.5, 4),
        0xff7a2a,
        Math.cos(k * 1.57 + 0.8) * 0.4,
        0.55,
        Math.sin(k * 1.57 + 0.8) * 0.3,
        0,
        0,
        hd,
      );
      c.material.emissive.setHex(0xcc3300);
    }
  if (t === 5) {
    a(Cy(0.62, 0.62, 0.28, 10), 0xc9a24a, 0, 0.6, 0, 0, 0, hd);
    for (let i = 0; i < 5; i++)
      a(Cn(0.1, 0.4, 4), 0xc9a24a, Math.cos(i * 1.26) * 0.55, 0.9, Math.sin(i * 1.26) * 0.55, 0, 0, hd);
    // the Warden wears a tattered royal mantle
    const cp = grp(0, 2.05, -0.6);
    const cg = new T.ConeGeometry(1.25, 2.2, 8, 1, true, Math.PI * 0.6, Math.PI * 0.8);
    cg.translate(0, -1, 0);
    const cm = a(cg, 0x2a1a4a, 0, 0, 0, 0, 0, cp);
    cm.material.side = T.DoubleSide;
    cm.userData.nol = 1;
    o.userData.cape = cp;
  }
  Object.assign(o.userData, {
    gl: 1,
    bd,
    hd,
    eyes,
    arms,
    feet,
    tail,
    wings,
    fl,
    t,
    bt: Math.random() * 3,
    hy: 0,
    hz: 0,
    cr: 0,
    core,
    cs,
    csb: 0.9 + 0.15 * t,
    skin,
    coreM,
    ei0,
  });
  return outline(o);
}
// gloom idle / walk animation; mvg: moving. v23: breathing and a pulsing core (the cracks in the skin pulse with it), a
// low asymmetric sway, a twitchy head that holds a glare then snaps to a new angle, a jaw that snarls open now and then,
// arms hanging forward with flexing, twitching talons, a whip tail shedding smoke, and a lunge-ready crouch (arms up,
// jaw open, faster pulse) when the player is within 14 on the street or whenever it is in a battle
function animGloom(o, s, mvg, i) {
  const u = o.userData;
  if (!u.gl) return;
  const j = i || 0,
    ph = s * (mvg ? 8 : 2) + j,
    hsh = (n) => {
      const v = Math.sin(n * 12.9898 + j * 78.233) * 43758.55;
      return v - Math.floor(v);
    };
  // crouch target: in a battle (not a direct child of the scene) always; on the street when the wizard is close
  let ct = 0.6;
  if (o.parent === S)
    ct = typeof W !== "undefined" && Math.hypot(o.position.x - W.position.x, o.position.z - W.position.z) < 14 ? 1 : 0;
  if (mvg) ct *= 0.4;
  u.cr = (u.cr || 0) + (ct - (u.cr || 0)) * 0.06;
  const cr = u.cr;
  const sq = mvg ? Math.abs(Math.sin(ph)) * 0.08 : Math.sin(s * (2.6 + cr) + j) * 0.035;
  u.bd.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
  u.bd.position.y = (mvg ? Math.abs(Math.sin(ph)) * 0.12 : 0) - 0.16 * cr;
  u.bd.rotation.x = (mvg ? 0.16 : 0.05) + 0.18 * cr + Math.sin(s * 2.6 + j) * 0.02;
  u.bd.rotation.z = 0.04 + Math.sin(s * (mvg ? 8 : 1.1) + j) * (mvg ? 0.06 : 0.05 * (1 - 0.5 * cr));
  u.bd.rotation.y = mvg ? 0 : Math.sin(s * 0.7 + j) * 0.08 * (1 - 0.6 * cr);
  // core + skin cracks pulse (faster when crouched)
  const pu = 0.5 + 0.5 * Math.sin(s * (3 + 3 * cr) + j);
  if (u.core) {
    u.core.scale.setScalar(1 + 0.12 * pu);
    u.cs.scale.setScalar(u.csb * (0.85 + 0.3 * pu + 0.15 * cr));
    u.coreM.emissiveIntensity = 0.7 + 0.6 * pu;
    u.skin.emissiveIntensity = u.ei0 * (0.7 + 0.5 * pu + 0.3 * cr);
  }
  // twitchy head
  const hs = s * 1.3 + j * 0.37,
    k = Math.floor(hs),
    am = mvg ? 0 : 1 - 0.7 * cr,
    ty = (hsh(k) - 0.5) * 0.9 * am,
    tz = (hsh(k + 0.5) - 0.5) * 0.35 * am,
    jit = hs - k < 0.08 && !mvg ? Math.sin(s * 70) * 0.04 : 0;
  u.hy = (u.hy || 0) + (ty - (u.hy || 0)) * 0.3;
  u.hz = (u.hz || 0) + (tz - (u.hz || 0)) * 0.3;
  u.hd.rotation.y = u.hy + jit;
  u.hd.rotation.z = u.hz - 0.06 + Math.sin(s * 1.3 + j) * 0.04;
  u.hd.rotation.x = 0.15 - 0.3 * cr + Math.sin(s * 1.7 + j) * 0.05 - (mvg ? 0.1 : 0);
  // jaw: snarls open now and then, hangs open when crouched, growl tremor
  const jw = u.hd.userData.jw;
  if (jw) {
    const sp = (s * 0.4 + j * 0.21) % 1,
      sn = sp < 0.18 ? Math.sin((sp / 0.18) * Math.PI) : 0;
    jw.rotation.x = 0.04 + 0.45 * sn + 0.28 * cr + Math.sin(s * 31) * 0.02 * cr + (mvg ? 0.1 : 0);
  }
  u.arms.forEach((g, n) => {
    const sd = n ? 1 : -1;
    g.rotation.x = mvg
      ? -0.2 + Math.sin(ph + n * 3.14) * 0.7
      : -0.3 - 0.5 * cr + Math.sin(s * 2 + n) * 0.12 * (1 - 0.5 * cr);
    g.rotation.z = sd * (0.12 + 0.12 * cr + Math.sin(s * 1.5 + n) * 0.08);
    const fa = g.userData.fa;
    if (fa)
      fa.rotation.x = mvg
        ? -0.4 - Math.max(0, Math.sin(ph + n * 3.14)) * 0.4
        : -0.55 - 0.35 * cr + Math.sin(s * 1.6 + n) * 0.06;
    const c = g.userData.cl;
    if (c) {
      const f = Math.max(0, Math.sin(s * 2.3 + n * 1.9 + j)),
        tw = s * 0.9 + n * 0.5 + j,
        twk = tw - Math.floor(tw) < 0.05 && hsh(Math.floor(tw) + n) > 0.4 ? Math.sin(s * 60) * 0.25 : 0;
      c.rotation.x = -0.2 + f * f * (mvg ? 0.3 : 0.8 - 0.5 * cr) + twk;
    }
  });
  u.feet.forEach((f, n) => {
    f.position.z = 0.32 + (mvg ? Math.sin(ph + n * 3.14) * 0.25 : (n ? 0.14 : -0.1) * cr);
    f.position.y = 0.11 + 0.16 * cr + (mvg ? Math.max(0, Math.cos(ph + n * 3.14)) * 0.12 : 0);
  });
  // whip tail: the tip lags the base; smoke wisps rise and shrink away
  const tf = s * (mvg ? 6 : 2.5 + 1.5 * cr) + j;
  u.tail.rotation.y = Math.sin(tf) * 0.5 + Math.sin(s * 7.3 + j) * 0.08;
  const td = u.tail.userData;
  if (td.t2) td.t2.rotation.y = Math.sin(tf - 0.9) * 0.6;
  if (td.wp)
    td.wp.forEach((w, n) => {
      const f = (s * 0.5 + n * 0.5 + j) % 1,
        b = n ? 0.5 : 0.7;
      w.position.set(Math.sin(s * 2 + n * 2) * 0.08, 0.05 + f * 0.45, -0.8 - n * 0.3 - f * 0.2);
      w.scale.setScalar(b * (0.5 + f) * (f < 0.85 ? 1 : (1 - f) / 0.15));
    });
  if (u.wings)
    u.wings.forEach((w, n) => {
      const sd = n ? 1 : -1;
      w.rotation.y = sd * (-0.2 + Math.sin(s * 9 + j) * 0.55);
    });
  if (u.cape) u.cape.rotation.x = 0.1 + Math.sin(s * 1.4) * 0.08;
  if (u.fl) (u.fl.material.rotation = Math.sin(s * 3) * 0.2), u.fl.scale.setScalar(2.4 + Math.sin(s * 7) * 0.25);
  u.bt -= 1 / 60;
  const bl = u.bt < 0.1;
  u.eyes.forEach((e) => (e.scale.y = bl ? 0.1 : 1));
  if (u.bt < 0) u.bt = 2 + Math.random() * 4;
}
function beast(kind, t) {
  const pal = { wolf: [0xa9c4d8, 0xeaf4ff, 0x9fe8ff], hound: [0x4a2a2a, 0xe0702a, 0xffb040] }[kind],
    c = pal[0],
    c2 = pal[1],
    o = new T.Group(),
    a = (g, col, x, y, z, p) => {
      const m = mk(g, col, x, y, z, 1);
      (p || o).add(m);
      return m;
    };
  a(Sp(1, 12), c, 0, 1.15, 0).scale.set(0.8, 0.7, 1.35);
  a(Sp(0.6, 10), c2, 0, 0.95, 0.3).scale.set(0.8, 0.5, 1.1);
  a(Sp(0.75, 10), c, 0, 1.45, 0.7).scale.set(0.85, 0.8, 0.9);
  const hd = new T.Group();
  hd.position.set(0, 1.6, 1.25);
  o.add(hd);
  a(Sp(0.5, 20), c, 0, 0, 0, hd);
  // v28c sculpted head: a rounded muzzle with a pale underjaw, cheek tufts, cupped ears, slit pupils with glints and
  // a scowling brow (the old cone snout, pyramid ears and plain eye balls)
  a(Sp(0.3, 18), c, 0, -0.1, 0.55, hd).scale.set(0.82, 0.68, 1.4);
  a(Sp(0.24, 16), c2, 0, -0.2, 0.6, hd).scale.set(0.78, 0.5, 1.32);
  a(Sp(0.09, 12), 0x111111, 0, -0.05, 0.98, hd).scale.set(1.25, 0.8, 0.9);
  const ear = kind === "wolf" ? 0xd8a0a8 : 0x8a3020;
  [-1, 1].forEach((s) => {
    const e = a(Cn(0.17, 0.48, 12), c, s * 0.26, 0.45, -0.1, hd);
    e.scale.z = 0.55;
    e.rotation.z = -s * 0.18;
    const ie = a(Cn(0.1, 0.32, 12), ear, s * 0.26, 0.42, -0.04, hd);
    ie.scale.z = 0.35;
    ie.rotation.z = -s * 0.18;
    const ck = a(Cn(0.13, 0.38, 10), c2, s * 0.42, -0.12, 0.05, hd);
    ck.rotation.set(-0.5, 0, s * 1.9);
    const ey = a(Sp(0.08, 16), pal[2], s * 0.2, 0.12, 0.42, hd);
    ey.material.emissive.setHex(0x555555);
    const pu = mk(Sp(0.035, 10), 0x0a0a12, 0, 0, 0.062, 1);
    pu.scale.set(0.45, 1.5, 0.5);
    ey.add(pu);
    const gl = new T.Mesh(Sp(0.016, 8), new T.MeshBasicMaterial({ color: 0xffffff }));
    gl.position.set(-0.025, 0.03, 0.07);
    gl.userData.nol = 1;
    ey.add(gl);
    const br = a(Sp(0.12, 14), c, s * 0.2, 0.22, 0.38, hd);
    br.scale.set(1.2, 0.4, 0.6);
    br.rotation.z = s * 0.35;
  });
  a(Cn(0.05, 0.16, 8), 0xffffff, -0.1, -0.3, 0.85, hd).rotation.x = Math.PI;
  a(Cn(0.05, 0.16, 8), 0xffffff, 0.1, -0.3, 0.85, hd).rotation.x = Math.PI;
  // neck ruff: a fan of fur tufts around the throat and shoulders
  const UP = new T.Vector3(0, 1, 0);
  for (let k = 0; k < 9; k++) {
    const an = -2.1 + (k / 8) * 4.2,
      tf = a(Cn(0.17, 0.55, 10), k % 2 ? c2 : c, Math.sin(an) * 0.6, 1.45 + Math.cos(an) * 0.55, 0.8);
    tf.quaternion.setFromUnitVectors(UP, new T.Vector3(Math.sin(an), Math.cos(an), -0.7).normalize());
  }
  for (let i = 0; i < 5; i++) {
    const r = a(Cn(0.14, 0.5, 4), kind === "wolf" ? pal[2] : 0xff7a2a, 0, 1.78 - i * 0.03, 1.0 - i * 0.5);
    r.material.emissive.setHex(kind === "wolf" ? 0x2a6a9a : 0x992200);
  }
  const leg = (x, z) => {
    const p = new T.Group();
    p.position.set(x, 1, z);
    a(Sp(0.2, 14), c, 0, -0.08, 0, p).scale.set(1, 1.35, 1.15); // haunch
    a(Cy(0.14, 0.1, 0.95, 12), c, 0, -0.47, 0, p);
    a(Sp(0.18, 14), c2, 0, -0.95, 0.08, p).scale.set(0.78, 0.45, 1.05); // paw
    for (let k = -1; k <= 1; k++) a(Cn(0.03, 0.12, 6), 0xe8e0d0, k * 0.075, -0.99, 0.27, p).rotation.x = Math.PI / 2;
    o.add(p);
    return p;
  };
  const L = [leg(-0.5, 0.75), leg(0.5, 0.75), leg(-0.5, -0.75), leg(0.5, -0.75)],
    tail = new T.Group();
  tail.position.set(0, 1.35, -1.3);
  o.add(tail);
  // v28c bushy tail: a full cone, a fluffed root and a pale tip
  a(Cn(0.22, 1, 12), c, 0, 0, -0.5, tail).rotation.x = -Math.PI / 2;
  a(Sp(0.22, 14), c, 0, 0, -0.18, tail).scale.set(1, 1, 1.6);
  a(Cn(0.12, 0.34, 10), c2, 0, 0, -1.08, tail).rotation.x = -Math.PI / 2;
  if (kind === "hound") {
    for (const [y, z, sc] of [
      [2.2, 0.5, 2.2],
      [2.0, -0.3, 1.6],
    ]) {
      const f = new T.Sprite(AM(SP.fire));
      f.scale.setScalar(sc);
      f.position.set(0, y, z);
      o.add(f);
    }
  }
  o.userData = { L, tail, hd, run: 0 };
  return outline(o);
}
const NSPEC = {
  qhub: { robe: 0x2f8a86, trim: 0xffd27a, hat: "wizard", hc: 0x1d4f55, prop: "lamp" },
  sbram: {
    robe: 0x8a5a2f,
    apron: 0xe8e0d0,
    hat: "round",
    hc: 0x5a3a1a,
    belly: 1,
    beard: 0x6b3a1a,
    w: 1.15,
    prop: "sack",
  },
  ctailor: { robe: 0xa83a6a, trim: 0xffd27a, hat: "cap", hc: 0xffd27a, w: 0.92, prop: "scissors" },
  hhub: { robe: 0xe8e0f0, trim: 0x7dff9a, hat: "hood", hc: 0xe8e0f0, prop: "cross" },
  hfrost: { robe: 0xdde8f5, trim: 0x9fe8ff, hat: "hood", hc: 0xcfe0f0, prop: "cross" },
  hember: { robe: 0xe8d0c0, trim: 0xffb040, hat: "hood", hc: 0xe0a070, prop: "cross" },
  whub: { robe: 0x4a2a8a, trim: 0xb89aff, hat: "wizard", hc: 0x2a1a4a, prop: "lamp" },
  ahub: { robe: 0x1f4a5a, trim: 0xe8d8a0, hat: "wizard", hc: 0x12303a, prop: "lamp" }, // v13 Sage Ilsa (change school)
  syara: { robe: 0x7a5aa8, trim: 0xeaf4ff, hat: "fur", hc: 0xeaf4ff, prop: "mug" },
  sforge: {
    robe: 0x7a3a2a,
    apron: 0x3a2a2a,
    hat: "band",
    hc: 0xc9402a,
    skin: 0xc89870,
    beard: 0x2a1a10,
    w: 1.3,
    prop: "hammer",
  },
};
// v19 townsfolk cloth: greyscale canvases tinted by each material's colour. "robe" has soft folds, a front seam and an
// embroidered hem (cuffs on sleeves), "top" a collar and buttons down the front (u = 0 is the front of a cylinder),
// "felt" for hats, "apron" a stitched pocket. Built once each; every person gets its own materials sharing them.
const PTXC = {};
function pclothTex(kind) {
  if (PTXC[kind]) return PTXC[kind];
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d"),
    R2 = Math.random;
  // v47 clean look: smooth cloth (no weave grid or flecks), a soft top-lit gradient, broad gentle folds
  x.fillStyle = "#ececec";
  x.fillRect(0, 0, 256, 256);
  {
    const vg = x.createLinearGradient(0, 0, 0, 256);
    vg.addColorStop(0, "rgba(255,255,255,.12)");
    vg.addColorStop(1, "rgba(20,10,40,.1)");
    x.fillStyle = vg;
    x.fillRect(0, 0, 256, 256);
  }
  if (kind === "felt") {
    // felt: a hint of soft nap only
    for (let i = 0; i < 6; i++) {
      x.fillStyle = i % 2 ? "rgba(0,0,0,.04)" : "rgba(255,255,255,.06)";
      x.fillRect(0, i * 43, 256, 20);
    }
  }
  if (kind === "robe" || kind === "top")
    for (let i = 0; i < 256; i++) {
      const v = Math.sin((i / 256) * Math.PI * 2 * (kind === "robe" ? 5 : 4));
      x.fillStyle = v > 0 ? "rgba(255,255,255," + v * 0.09 + ")" : "rgba(0,0,0," + -v * 0.12 + ")";
      x.fillRect(i, 0, 1, 256);
    }
  const dash = (y, col) => {
    x.fillStyle = col;
    for (let i = 0; i < 256; i += 8) x.fillRect(i, y, 4, 2);
  };
  if (kind === "robe") {
    x.fillStyle = "rgba(0,0,0,.35)";
    x.fillRect(0, 0, 3, 256);
    x.fillRect(253, 0, 3, 256);
    x.fillStyle = "rgba(0,0,0,.26)";
    x.fillRect(0, 204, 256, 34);
    x.fillStyle = "rgba(255,255,255,.55)";
    x.fillRect(0, 204, 256, 3);
    x.fillRect(0, 235, 256, 3);
    x.strokeStyle = "rgba(255,255,255,.5)";
    x.lineWidth = 2;
    x.beginPath();
    for (let i = 0; i <= 256; i += 16) {
      x.moveTo(i, 221);
      x.lineTo(i + 8, 211);
      x.lineTo(i + 16, 221);
      x.lineTo(i + 8, 231);
      x.closePath();
    }
    x.stroke();
    dash(196, "rgba(0,0,0,.3)");
    x.fillStyle = "rgba(255,255,255,.1)";
    x.fillRect(0, 238, 256, 18);
  } else if (kind === "top") {
    x.fillStyle = "rgba(0,0,0,.28)";
    x.fillRect(0, 0, 256, 22);
    x.fillStyle = "rgba(255,255,255,.4)";
    x.fillRect(0, 22, 256, 2);
    x.fillStyle = "rgba(0,0,0,.3)";
    x.fillRect(0, 0, 4, 256);
    x.fillRect(252, 0, 4, 256);
    [60, 120, 180, 236].forEach((y) =>
      [0, 256].forEach((bx) => {
        x.fillStyle = "rgba(40,30,20,.75)";
        x.beginPath();
        x.arc(bx, y, 7, 0, 7);
        x.fill();
        x.fillStyle = "rgba(255,255,255,.6)";
        x.beginPath();
        x.arc(bx + 2, y - 2, 2.5, 0, 7);
        x.fill();
      }),
    );
  } else if (kind === "felt") {
    x.fillStyle = "rgba(0,0,0,.3)";
    x.fillRect(0, 214, 256, 30);
    dash(210, "rgba(255,255,255,.35)");
    dash(247, "rgba(255,255,255,.35)");
  } else if (kind === "apron") {
    x.strokeStyle = "rgba(0,0,0,.35)";
    x.lineWidth = 2;
    x.setLineDash([6, 4]);
    x.strokeRect(70, 132, 116, 64);
    x.strokeRect(10, 10, 236, 236);
    x.setLineDash([]);
    x.fillStyle = "rgba(0,0,0,.08)";
    x.fillRect(72, 134, 112, 60);
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return (PTXC[kind] = t);
}
function person(sp) {
  const g = new T.Group(),
    bd = new T.Group(), // v19: everything sits in a body group so it can lean and breathe while g turns
    hdg = new T.Group(), // v19: the head (and hat) pivot at the neck, so it can look around and nod
    w = sp.w || 1,
    A = (geo, c, x, y, z, p, rx, rz, kind) => {
      const m = kind
        ? new T.Mesh(geo, new T.MeshToonMaterial({ color: c, map: pclothTex(kind), gradientMap: GR }))
        : mk(geo, c, 0, 0, 0, 1);
      m.position.set(x, y, z);
      m.rotation.set(rx || 0, 0, rz || 0);
      (p || bd).add(m);
      return m;
    },
    HY = 2.05,
    AH = (geo, c, x, y, z, rx, rz, kind) => A(geo, c, x, y - HY, z, hdg, rx, rz, kind),
    sk = sp.skin || 0xf1c9a5,
    hc = sp.hc || 0x444444;
  g.add(bd);
  bd.scale.setScalar(0.93); // v50: villagers a touch smaller (the group's own scale stays free for callers)
  hdg.position.y = HY;
  bd.add(hdg);
  // v47 clean look: sculpted A-line skirt and a torso with rounded shoulders (were a cone and a cylinder)
  const rb = A(
    Lt(
      [
        [0.0001, 0.02],
        [0.82, 0],
        [0.8, 0.08],
        [0.72, 0.4],
        [0.6, 0.85],
        [0.52, 1.2],
        [0.48, 1.35],
      ].map(([r, y]) => [r * w, y]),
    ),
    sp.robe,
    0,
    0,
    0,
    null,
    0,
    0,
    "robe",
  );
  const ch = A(
    Lt(
      [
        [0.0001, 1.05],
        [0.5, 1.1],
        [0.55, 1.38],
        [0.53, 1.65],
        [0.47, 1.88],
        [0.33, 2.03],
        [0.17, 2.1],
        [0.0001, 2.12],
      ].map(([r, y]) => [r * w, y]),
    ),
    sp.robe,
    0,
    0,
    0,
    null,
    0,
    0,
    "top",
  );
  if (sp.belly) ch.scale.set(1.15, 1, 1.3);
  A(new T.TorusGeometry(0.8 * w, 0.06, 10, 40), sp.trim || 0xd9a441, 0, 0.08, 0, null, Math.PI / 2);
  if (sp.apron) A(B(0.7 * w, 1.15, 0.06), sp.apron, 0, 1.15, (sp.belly ? 0.74 : 0.58) * w, null, -0.1, 0, "apron");
  const bw = sp.belly ? 1.15 : 1;
  A(Cy(0.57 * w * bw, 0.59 * w * bw, 0.16, 28), 0x6b3a1a, 0, 1.2, 0).scale.z = sp.belly ? 1.3 : 1;
  A(B(0.2, 0.17, 0.05), 0xd9a441, 0, 1.2, 0.59 * w * bw * (sp.belly ? 1.3 : 1)).material.emissive.setHex(0x3a2a08);
  AH(Sp(0.38, 12), sk, 0, 2.3, 0);
  AH(Sp(0.06, 6), 0xe0a880, 0, 2.27, 0.38);
  const ey = [-0.13, 0.13].map((x) => AH(Sp(0.058, 6), 0x1a1424, x, 2.35, 0.33));
  ey.forEach((e) => {
    const gl = mk(Sp(0.018, 4), 0xffffff, 0.018, 0.02, 0.045, 1); // catch-light
    gl.material.emissive.setHex(0xaaaaaa);
    e.add(gl);
    // v47 clean look: an eye white behind the pupil (a child, so it blinks with it)
    const wh = new T.Mesh(new T.SphereGeometry(0.08, 16, 12), new T.MeshBasicMaterial({ color: 0xf6f2fa }));
    wh.position.set(0, 0, 0.012); // the pupil pokes through its front as a dark iris disc
    wh.scale.set(1.1, 1, 0.4);
    e.add(wh);
  });
  [-0.2, 0.2].forEach((x) => (AH(Sp(0.075, 8), 0xf0a08a, x, 2.22, 0.3).scale.z = 0.4)); // rosy cheeks
  if (!sp.beard) AH(new T.TorusGeometry(0.075, 0.016, 4, 8, Math.PI), 0x7a3a2a, 0, 2.2, 0.355, 0, Math.PI); // smile
  if (sp.brow) [-0.13, 0.13].forEach((x) => AH(B(0.13, 0.035, 0.03), sp.brow, x, 2.46, 0.35, 0, x > 0 ? -0.15 : 0.15));
  if (sp.beard) {
    // v47 clean look: a soft rounded beard and moustache (was a downward cone)
    AH(new T.SphereGeometry(0.25, 24, 16), sp.beard, 0, 2.07, 0.24).scale.set(1.1, 1.3, 0.62);
    [-1, 1].forEach((s) =>
      AH(new T.SphereGeometry(0.075, 16, 12), sp.beard, s * 0.08, 2.24, 0.34, 0, s * 0.35).scale.set(1.5, 0.6, 0.7),
    );
  }
  if (sp.hat === "wizard") {
    AH(Cy(0.7, 0.7, 0.06, 14), hc, 0, 2.6, 0);
    AH(Cn(0.45, 1, 10), hc, 0, 3.11, 0, 0, 0, "felt"); // v47 polish: cone base sits into the brim (was 3.15: a gap)
  } else if (sp.hat === "round") {
    AH(Cy(0.62, 0.62, 0.06, 14), hc, 0, 2.6, 0);
    AH(Cy(0.38, 0.38, 0.32, 12), hc, 0, 2.78, 0, 0, 0, "felt");
  } else if (sp.hat === "hood") {
    const hd = AH(
      new T.SphereGeometry(0.47, 14, 10, Math.PI / 2 + 0.95, 2 * Math.PI - 1.9, 0, 2.3),
      hc,
      0,
      2.33,
      -0.04,
      0,
      0,
      "felt",
    );
    hd.material.side = T.DoubleSide;
    hd.scale.set(1, 1.05, 1);
    AH(Cn(0.3, 0.6, 8), hc, 0, 2.78, -0.3, -0.6, 0, "felt");
  } else if (sp.hat === "cap") {
    AH(new T.SphereGeometry(0.42, 10, 6, 0, 6.3, 0, 1.5), hc, 0, 2.4, 0, 0, 0, "felt");
    AH(Sp(0.08, 6), 0xff6a8a, 0, 2.85, 0);
  } else if (sp.hat === "fur") {
    AH(Sp(0.44, 10), hc, 0, 2.64, -0.02, 0, 0, "felt").scale.set(1, 0.7, 1);
    AH(new T.TorusGeometry(0.4, 0.12, 6, 14), hc, 0, 2.56, 0, Math.PI / 2, 0, "felt");
  } else if (sp.hat === "band") {
    AH(new T.TorusGeometry(0.39, 0.06, 6, 14), hc, 0, 2.5, 0, Math.PI / 2, 0);
  }
  // v47 clean look: hair showing under the hat (a band round the back and sides; a full cap without a covering hat;
  // none under a hood), a collar in the trim colour, boots peeking out under the hem, a slightly bigger head
  if (sp.hat !== "hood") {
    const hcol = sp.hair || sp.beard || 0x6a4028,
      cover = sp.hat === "wizard" || sp.hat === "round" || sp.hat === "cap" || sp.hat === "fur";
    AH(new T.SphereGeometry(0.405, 24, 14, Math.PI - 0.35, Math.PI + 0.7, 0.72, 1.33), hcol, 0, 2.3, -0.01);
    if (!cover) AH(new T.SphereGeometry(0.405, 24, 10, 0, Math.PI * 2, 0, 0.78), hcol, 0, 2.3, -0.01);
  }
  A(new T.TorusGeometry(0.31 * w, 0.075, 10, 28), sp.trim || 0xd9a441, 0, 2.03, 0, null, Math.PI / 2);
  // v47 polish: boots set lower and further out so the toes show cleanly under the hem (they cut through it)
  [-0.24, 0.24].forEach((bx) => {
    const bt = A(new T.SphereGeometry(0.2, 16, 12), 0x3a2418, bx * w, 0.07, 0.8 * w);
    bt.scale.set(0.9, 0.5, 1.2);
  });
  hdg.scale.setScalar(1.1);
  const arm = (x) => {
    const a = new T.Group();
    a.position.set(x * w, 1.95, 0);
    a.add(mk(Sp(0.17, 8), sp.robe, 0, 0, 0, 1));
    // v47 polish: a shoulder pad that reaches in to the torso, so the arm is joined to the body
    a.add(mk(Sp(0.24, 12), sp.robe, -Math.sign(x) * 0.07, 0.02, 0, 1));
    A(Cy(0.13, 0.17, 0.9, 8), sp.robe, 0, -0.45, 0, a, 0, 0, "robe");
    a.add(mk(Sp(0.15, 12), sk, 0, -0.97, 0.03, 1));
    a.add(mk(Cy(0.18, 0.18, 0.1, 16), sp.trim || 0xd9a441, 0, -0.87, 0, 1)); // v47 cuff
    bd.add(a);
    return a;
  };
  const AL = arm(-0.66), // v29: a touch wider so sleeves hang beside the chest, not inside it
    AR = arm(0.66),
    add2 = (m, p) => {
      (p || AR).add(m);
      return m;
    };
  // v47 polish: poles sit in front of the hand (z .24), not down the middle of the sleeve, and lean out a touch
  const SZ = 0.24;
  if (sp.prop === "lamp") {
    add2(mk(Cy(0.04, 0.05, 2.8, 6), 0x8a5a2b, 0.06, -0.2, SZ, 1)).rotation.z = -0.06;
    add2(mk(B(0.3, 0.36, 0.3), 0xffd27a, 0.14, 1.3, SZ, 1)).material.emissive.setHex(0xaa7a22);
    const s2 = new T.Sprite(AM(GLT, false));
    s2.scale.setScalar(1.6);
    s2.position.set(0.14, 1.3, SZ);
    AR.add(s2);
  }
  if (sp.prop === "cross") {
    add2(mk(Cy(0.04, 0.05, 2.6, 6), 0xe8e0f0, 0.06, -0.1, SZ, 1)).rotation.z = -0.06;
    add2(mk(B(0.12, 0.5, 0.08), 0xffffff, 0.14, 1.4, SZ, 1)).material.emissive.setHex(0x55aa77);
    add2(mk(B(0.4, 0.12, 0.08), 0xffffff, 0.14, 1.45, SZ, 1)).material.emissive.setHex(0x55aa77);
    const s2 = new T.Sprite(AM(SP.heal));
    s2.scale.setScalar(1.6);
    s2.position.set(0.14, 1.45, SZ);
    AR.add(s2);
  }
  if (sp.prop === "hammer") {
    add2(mk(Cy(0.05, 0.05, 1.2, 6), 0x6b4a2b, 0, -0.4, SZ, 1));
    add2(mk(B(0.55, 0.3, 0.3), 0x777788, 0, 0.25, SZ, 1));
  }
  if (sp.prop === "scissors") {
    add2(mk(B(0.05, 0.55, 0.03), 0xcccccc, -0.05, -0.7, 0.15, 1)).rotation.z = 0.25;
    add2(mk(B(0.05, 0.55, 0.03), 0xcccccc, 0.05, -0.7, 0.15, 1)).rotation.z = -0.25;
    const tp = mk(new T.TorusGeometry(0.34, 0.05, 6, 14), 0xffd27a, 0, 2.0, 0, 1);
    tp.rotation.x = Math.PI / 2;
    bd.add(tp);
  }
  if (sp.prop === "sack") add2(mk(Sp(0.28, 8), 0xb8a070, 0, -1.1, 0.1, 1), AL);
  if (sp.prop === "mug") add2(mk(Cy(0.1, 0.09, 0.2, 8), 0xd9a441, 0, -1.0, 0.15, 1));
  if (sp.prop === "spear") {
    add2(mk(Cy(0.04, 0.05, 3.4, 6), 0x6b4a2b, 0, -0.4, SZ, 1));
    add2(mk(Cn(0.11, 0.45, 4), 0xc0c8d8, 0, 1.5, SZ, 1));
    add2(mk(B(0.3, 0.06, 0.06), 0xd9a441, 0, 1.25, SZ, 1));
    // v47 polish: the shield is strapped to the forearm at the hand (it floated at the elbow)
    const sh = mk(Cy(0.42, 0.42, 0.08, 12), 0x8a3a2a, -0.06, -0.8, 0.3, 1);
    sh.rotation.x = Math.PI / 2;
    AL.add(sh);
    hdg.add(mk(Cy(0.36, 0.4, 0.3, 10), 0x8a849c, 0, 2.62 - HY, 0, 1));
  }
  if (sp.prop === "cane") {
    add2(mk(Cy(0.04, 0.04, 1.3, 6), 0x6b4a2b, 0, -1.4, 0.12, 1));
    add2(mk(new T.TorusGeometry(0.1, 0.035, 5, 8, Math.PI), 0x6b4a2b, -0.1, -0.75, 0.12, 1));
  }
  if (sp.prop === "rod") {
    const r = mk(Cy(0.025, 0.035, 3.2, 5), 0x8a5a2b, 0, -0.9, 1.3, 1);
    r.rotation.x = 1.1;
    add2(r);
  }
  if (sp.prop === "pick") {
    add2(mk(Cy(0.04, 0.04, 1.3, 6), 0x6b4a2b, 0, -1.0, 0.2, 1));
    const ph = mk(Cn(0.06, 0.9, 4), 0x777788, 0, -0.4, 0.2, 1);
    ph.rotation.z = Math.PI / 2;
    add2(ph);
    hdg.add(mk(Sp(0.1, 6), 0xffd27a, 0, 2.72 - HY, 0.3, 1));
  }
  if (sp.prop === "ladder") {
    const ld = new T.Group();
    [-0.35, 0.35].forEach((x) => ld.add(mk(B(0.08, 3.6, 0.08), 0x8a5a2b, x, 1.8, 0, 1)));
    for (let k = 0; k < 7; k++) ld.add(mk(B(0.7, 0.06, 0.06), 0x8a5a2b, 0, 0.3 + k * 0.5, 0, 1));
    ld.position.set(0.9, 0, -0.5);
    ld.rotation.z = -0.12;
    bd.add(ld);
  }
  g.userData = { AL, AR, ey, bd, hd: hdg, rb, bt: Math.random() * 4, ph: Math.random() * 6.3, look: 0, nod: 0 };
  return dtChar(g, 1); // v28b: cloth weave / surface detail (01-core.js)
}
// blink, breathing and the head: it eases toward u.look (yaw relative to the body, set by whoever animates the
// person), nods while u.nod is set, and otherwise drifts a little. Safe on old-style people without bd/hd.
function personLife(o, s, dt) {
  const u = o.userData;
  if (!u.ey) return;
  u.bt -= dt;
  const bl = u.bt < 0.12;
  u.ey.forEach((e) => (e.scale.y = bl ? 0.15 : 1));
  if (u.bt < 0) u.bt = 2 + Math.random() * 4;
  const ph = u.ph || 0;
  if (u.hd) {
    const ly = Math.max(-0.9, Math.min(0.9, u.look || 0)),
      k = Math.min(1, dt * 5);
    u.hd.rotation.y += (ly - u.hd.rotation.y) * k;
    const nx = u.nod ? Math.max(0, Math.sin(s * 5 + ph)) * 0.14 : Math.sin(s * 0.9 + ph) * 0.035;
    u.hd.rotation.x += (nx - u.hd.rotation.x) * Math.min(1, dt * 8);
    u.hd.rotation.z = Math.sin(s * 0.7 + ph) * 0.045;
  }
  if (u.bd) u.bd.position.y = Math.sin(s * 2 + ph) * 0.012;
}
// v19 walk/idle body language for a person: w = 0..1 walking, ph = stride phase. Leans into the stride, the robe
// swings and the arms swing opposite; standing, they shift their weight from foot to foot.
function personBody(o, s, dt, w, ph) {
  const u = o.userData;
  if (!u.bd) return;
  const k = Math.min(1, dt * 6),
    sw = Math.sin(ph) * w;
  u.bd.rotation.x += (0.09 * w - u.bd.rotation.x) * k;
  u.bd.rotation.z = sw * 0.05 + (1 - w) * Math.sin(s * 0.45 + u.ph) * 0.025;
  if (u.rb) u.rb.rotation.z = -sw * 0.07;
}
function npcAnim(n, d, s, p) {
  const u = n.o.userData;
  if (!u.AL) return;
  const i = n.x * 0.1,
    near = d < 9;
  let df = (near ? Math.atan2(p.x - n.x, p.z - n.z) : n.ry) - n.o.rotation.y;
  df = Math.atan2(Math.sin(df), Math.cos(df));
  n.o.rotation.y += df * 0.05;
  // v19: the head leads (it looks at you before the body has turned); far away they glance about now and then
  u.look = near ? df : Math.sin(s * 0.13 + i) > 0.4 ? Math.sin(s * 0.37 + i) * 0.6 : 0;
  u.nod = d < 6;
  const wave = d < 6 && !n.still,
    // a slow idle cycle: now and then they stretch or rest a hand on the hip. v22: wrapped into 0..1 (JS % keeps the
    // sign, so NPCs at negative x, e.g. all of Cinderwaste, sat stuck in the stretch branch and flailed their arms)
    cyc = (((s * 0.05 + i * 0.37) % 1) + 1) % 1,
    stretch = !near && cyc < 0.04 ? Math.sin((cyc / 0.04) * Math.PI) : 0,
    hip = !near && cyc > 0.5 && cyc < 0.62 ? Math.sin(((cyc - 0.5) / 0.12) * Math.PI) : 0;
  u.AL.rotation.x = Math.sin(s * 1.4 + i) * 0.06 - 2.6 * stretch;
  u.AL.rotation.z = -0.55 * hip;
  u.AR.rotation.x = wave ? -2.4 + Math.sin(s * 7) * 0.3 : Math.sin(s * 1.4 + i + 1) * 0.06 - 2.6 * stretch;
  n.o.scale.y = n.o.scale.x * (1 + Math.sin(s * 2 + i) * 0.008); // v46: keeps its size (talker scale, editor grow)
  personBody(n.o, s, 1 / 60, 0, 0);
  if (u.bd && stretch) u.bd.rotation.x = -0.08 * stretch;
  personLife(n.o, s, 1 / 60);
}
function mkFoe(kind, t, big, hc) {
  const o = kind === "gloom" ? gloom(t, hc) : beast(kind, t);
  o.scale.setScalar(kind === "gloom" ? (t === 5 ? 1.4 : 0.6 + 0.07 * t) : big ? 1 : 0.72);
  return o;
}
function animBeast(o, s, m) {
  const u = o.userData;
  if (!u.L) return;
  const ph = s * (m ? 10 : 0);
  u.L.forEach((l, i) => {
    l.rotation.x = m ? Math.sin(ph + (i % 3 === 0 ? 0 : 3.14)) * 0.7 : Math.sin(s * 1.5 + i) * 0.03;
  });
  u.tail.rotation.y = Math.sin(s * (m ? 9 : 4)) * 0.45;
  u.hd.rotation.x = Math.sin(s * (m ? 10 : 1.8)) * 0.06;
}
// allies: summons (y = hover height) and companions (comp:1, unlocked by level lv or quest q)
const ALLY = {
  blade: { n: "Ember Blade", hp: 22, el: "fire", y: 1.6 },
  aegis: { n: "Frost Aegis", hp: 40, el: "ice", y: 1.6, taunt: 4 },
  wisp: { n: "Storm Wisp", hp: 18, el: "storm", y: 1.6 },
  sprite: { n: "Glow Sprite", hp: 20, el: "heal", y: 1.6 },
  golem: { n: "Moss Golem", hp: 60, el: "heal", y: 0.75, taunt: 4 },
  wolf: { n: "Wolf Spirit", hp: 30, el: "ice", y: 0, th: 1.9 },
  drake: { n: "Cinder Drake", hp: 28, el: "fire", y: 1.7 },
  owl: { n: "Lantern Owl", hp: 24, el: "storm", y: 1.9 },
  squire: { n: "Lantern Squire", hp: 55, el: "fire", y: 0, th: 2.5, comp: 1, lv: 2, d: "Strikes your target for 10" },
  witch: { n: "Hedge Witch", hp: 42, el: "heal", y: 0, th: 2.6, comp: 1, q: 2, d: "Heals the most hurt friend for 12" },
  pup: { n: "Frost Pup", hp: 48, el: "ice", y: 0, th: 1.9, comp: 1, q: 5, d: "Bites for 12 and may Chill" },
  epup: { n: "Ember Pup", hp: 48, el: "fire", y: 0, th: 1.9, comp: 1, q: 6, d: "Bites for 12 and Burns" },
  // late-game summons (v14: each has its own model in sumMesh; mdl/sc/tn would reuse a base model, bigger and recoloured)
  phoenix: { n: "Blazing Phoenix", hp: 46, el: "fire", y: 2.1 },
  titan: { n: "Glacier Titan", hp: 95, el: "ice", y: 1.06, taunt: 4 },
  roc: { n: "Storm Roc", hp: 40, el: "storm", y: 2.2 },
  familiar: { n: "Lantern Familiar", hp: 26, el: "storm", y: 1.8 },
};
// spellbook: ty atk / sum / sup; cl = the class that can learn it (all = everyone); st = a free starter for that class;
// the rest are bought from Wren the spellwright once you reach lv, or granted by finishing quest q; aoe hits every foe
const SPL = {
  // Pyre
  ember: { n: "Ember Bolt", c: 1, t: "10 fire damage, Burn 1", a: "fire", ty: "atk", lv: 1, cl: "pyre", st: 1 },
  blade: { n: "Ember Blade", c: 2, t: "Ally: slashes 18 a turn", a: "fire", ty: "sum", lv: 2, cl: "pyre" },
  meteor: { n: "Meteor", c: 3, t: "70 damage, Burn 3", a: "fire", ty: "atk", lv: 2, cl: "pyre" },
  wave: { n: "Ember Wave", c: 2, t: "12 to all foes, Burn 2", a: "fire", ty: "atk", lv: 4, aoe: 1, cl: "pyre" },
  drake: { n: "Cinder Drake", c: 3, t: "Ally: 9 to all foes + Burn", a: "fire", ty: "sum", q: 6, cl: "pyre" },
  phoenix: {
    n: "Blazing Phoenix",
    c: 4,
    t: "Ally: 16 to all foes + Burn 2",
    a: "fire",
    ty: "sum",
    lv: 7,
    cl: "pyre",
    ab: "drake",
  },
  inferno: {
    n: "Inferno",
    c: 4,
    t: "40 to all foes, Burn 3",
    a: "fire",
    ty: "atk",
    lv: 9,
    aoe: 1,
    cl: "pyre",
    ab: "wave",
  },
  sunbrand: {
    n: "Sunbrand",
    c: 5,
    t: "150 fire damage, Burn 4",
    a: "fire",
    ty: "atk",
    lv: 11,
    cl: "pyre",
    ab: "meteor",
  },
  // Rimeward
  nova: { n: "Frost Nova", c: 2, t: "14 to all foes, Chill 2", a: "ice", ty: "atk", lv: 3, aoe: 1, cl: "rime" },
  aegis: { n: "Frost Aegis", c: 2, t: "Ally: draws attacks, 40 HP", a: "ice", ty: "sum", lv: 2, cl: "rime" },
  shard: {
    n: "Frost Shard",
    c: 1,
    t: "18 ice damage, Chill 1",
    a: "ice",
    ty: "atk",
    lv: 1,
    cl: "rime",
    st: 1,
    ab: "lance",
  },
  lance: { n: "Ice Lance", c: 2, t: "32 ice damage, Chill 1", a: "ice", ty: "atk", lv: 3, cl: "rime" },
  wolf: { n: "Wolf Spirit", c: 2, t: "Ally: bites 16 + Chill", a: "ice", ty: "sum", q: 5, cl: "rime" },
  hex: { n: "Dusk Hex", c: 1, t: "Target hits 50% softer", a: "ice", ty: "sup", lv: 6, cl: "rime" },
  titan: {
    n: "Glacier Titan",
    c: 4,
    t: "Ally: 95 HP, taunts, slams 16 + Chill",
    a: "ice",
    ty: "sum",
    lv: 7,
    cl: "rime",
    ab: "golem",
  },
  blizzard: {
    n: "Blizzard",
    c: 4,
    t: "34 to all foes, Chill 2",
    a: "ice",
    ty: "atk",
    lv: 9,
    aoe: 1,
    cl: "rime",
    ab: "nova",
  },
  zero: {
    n: "Absolute Zero",
    c: 5,
    t: "120 ice damage, Freeze (stun)",
    a: "ice",
    ty: "atk",
    lv: 11,
    cl: "rime",
    ab: "hex",
  },
  // Gale
  spark: { n: "Spark", c: 1, t: "12 storm damage", a: "storm", ty: "atk", lv: 1, cl: "gale", st: 1 },
  wisp: { n: "Storm Wisp", c: 2, t: "Ally: zaps 14, may stun", a: "storm", ty: "sum", lv: 2, cl: "gale" },
  thunder: {
    n: "Thunderclap",
    c: 2,
    t: "26 storm damage, may stun",
    a: "storm",
    ty: "atk",
    lv: 2,
    cl: "gale",
    ab: "spark",
  },
  chain: { n: "Chain Lightning", c: 3, t: "20 to all foes", a: "storm", ty: "atk", lv: 5, aoe: 1, cl: "gale" },
  owl: { n: "Lantern Owl", c: 2, t: "Ally: +1 pip each turn", a: "storm", ty: "sum", lv: 6, cl: "gale" },
  roc: {
    n: "Storm Roc",
    c: 4,
    t: "Ally: zaps all foes 10, +1 pip",
    a: "storm",
    ty: "sum",
    lv: 7,
    cl: "gale",
    ab: "owl",
  },
  tempest: { n: "Tempest", c: 4, t: "42 to all foes", a: "storm", ty: "atk", lv: 9, aoe: 1, cl: "gale", ab: "chain" },
  skyfall: {
    n: "Skyfall",
    c: 5,
    t: "130 storm damage, stun",
    a: "storm",
    ty: "atk",
    lv: 11,
    cl: "gale",
    ab: "lampfall",
  },
  // v12 Verdant (life element, healer): every strike also mends
  thorn: {
    n: "Thorn Dart",
    c: 1,
    t: "12 life damage, heal you 6",
    a: "heal",
    ty: "atk",
    lv: 1,
    cl: "verdant",
    st: 1,
    ab: "shard",
  },
  briar: {
    n: "Briar Lash",
    c: 2,
    t: "26 life damage, heal the party 8",
    a: "heal",
    ty: "atk",
    lv: 3,
    cl: "verdant",
    ab: "lance",
  },
  bloom: {
    n: "Bloomburst",
    c: 3,
    t: "14 to all foes, heal the party 10",
    a: "heal",
    ty: "atk",
    lv: 5,
    aoe: 1,
    cl: "verdant",
    ab: "nova",
  },
  // v12 Wispcaller (spirit element, summoner): hits harder the more allies you have
  shade: {
    n: "Spirit Bolt",
    c: 1,
    t: "10 spirit damage, +3 for each ally",
    a: "spirit",
    ty: "atk",
    lv: 1,
    cl: "spirit",
    st: 1,
    ab: "spark",
  },
  haunt: {
    n: "Haunting",
    c: 2,
    t: "24 spirit damage, the foe hits 50% softer",
    a: "spirit",
    ty: "atk",
    lv: 3,
    cl: "spirit",
    ab: "hex",
  },
  wail: {
    n: "Banshee Wail",
    c: 3,
    t: "16 to all foes, +4 for each ally",
    a: "spirit",
    ty: "atk",
    lv: 5,
    aoe: 1,
    cl: "spirit",
    ab: "chain",
  },
  // v21 earned cards: three more per school, filling the levels between the old ones (effects in 20-cards.js)
  cinder: { n: "Cinder Lash", c: 2, t: "28 fire damage, Burn 2", a: "fire", ty: "atk", lv: 3, cl: "pyre", ab: "ember" },
  firebrand: {
    n: "Firebrand",
    c: 3,
    t: "50 fire damage, +25 if it's already burning",
    a: "fire",
    ty: "atk",
    lv: 6,
    cl: "pyre",
    ab: "meteor",
  },
  ashstorm: {
    n: "Ashstorm",
    c: 3,
    t: "26 to all foes, Burn 2",
    a: "fire",
    ty: "atk",
    lv: 8,
    aoe: 1,
    cl: "pyre",
    ab: "inferno",
  },
  arc: { n: "Arc Bolt", c: 2, t: "22 storm damage, may stun", a: "storm", ty: "atk", lv: 3, cl: "gale", ab: "spark" },
  ball: {
    n: "Ball Lightning",
    c: 3,
    t: "50 storm damage, likely to stun",
    a: "storm",
    ty: "atk",
    lv: 6,
    cl: "gale",
    ab: "thunder",
  },
  squall: { n: "Squall", c: 3, t: "28 to all foes", a: "storm", ty: "atk", lv: 8, aoe: 1, cl: "gale", ab: "chain" },
  spike: {
    n: "Rime Spike",
    c: 2,
    t: "28 ice damage, +14 if it's Chilled",
    a: "ice",
    ty: "atk",
    lv: 4,
    cl: "rime",
    ab: "shard",
  },
  glacial: {
    n: "Glacial Bolt",
    c: 3,
    t: "54 ice damage, Chill 2",
    a: "ice",
    ty: "atk",
    lv: 8,
    cl: "rime",
    ab: "lance",
  },
  hail: {
    n: "Hailstorm",
    c: 4,
    t: "32 to all foes, Chill 1",
    a: "ice",
    ty: "atk",
    lv: 10,
    aoe: 1,
    cl: "rime",
    ab: "blizzard",
  },
  sap: {
    n: "Sap Drain",
    c: 2,
    t: "22 life damage, heal you 10",
    a: "heal",
    ty: "atk",
    lv: 4,
    cl: "verdant",
    ab: "thorn",
  },
  snare: {
    n: "Vine Snare",
    c: 3,
    t: "44 life damage, may root (stun)",
    a: "heal",
    ty: "atk",
    lv: 7,
    cl: "verdant",
    ab: "briar",
  },
  overgrow: {
    n: "Overgrowth",
    c: 4,
    t: "30 to all foes, heal the party 14",
    a: "heal",
    ty: "atk",
    lv: 9,
    aoe: 1,
    cl: "verdant",
    ab: "bloom",
  },
  siphon: {
    n: "Soul Siphon",
    c: 2,
    t: "20 spirit damage +4 per ally, heal you 8",
    a: "spirit",
    ty: "atk",
    lv: 4,
    cl: "spirit",
    ab: "shade",
  },
  plance: {
    n: "Phantom Lance",
    c: 3,
    t: "44 spirit damage +5 per ally",
    a: "spirit",
    ty: "atk",
    lv: 7,
    cl: "spirit",
    ab: "haunt",
  },
  requiem: {
    n: "Requiem",
    c: 4,
    t: "32 to all foes +5 per ally",
    a: "spirit",
    ty: "atk",
    lv: 9,
    aoe: 1,
    cl: "spirit",
    ab: "wail",
  },
  // every class
  sprite: { n: "Glow Sprite", c: 2, t: "Ally: heals you 12 a turn", a: "heal", ty: "sum", lv: 3, cl: "all" },
  mend: { n: "Mending Light", c: 2, t: "Heal you 28, allies 12", a: "heal", ty: "sup", lv: 3, cl: "all" },
  golem: { n: "Moss Golem", c: 3, t: "Ally: 60 HP, taunts, regrows", a: "heal", ty: "sum", lv: 4, cl: "all" },
  lampfall: { n: "Lampfall", c: 5, t: "55 to all foes", a: "storm", ty: "atk", q: 7, aoe: 1, cl: "all" },
  // v11 role spells (rl = the role that can use them; sch = takes your school's element; q = earned from that role's quest)
  pierce: {
    n: "Piercing Ray",
    c: 2,
    t: "34 damage in your element, ignores Guard and Armoured",
    a: "fire",
    sch: 1,
    ty: "atk",
    lv: 1,
    rl: "damage",
    st: 1,
    ab: "lance",
  },
  focus: {
    n: "Hunter's Focus",
    c: 1,
    t: "Your next attack this turn hits +60%",
    a: "heal",
    ty: "sup",
    lv: 3,
    rl: "damage",
    ab: "hex",
  },
  execute: {
    n: "Lightbreaker",
    c: 3,
    t: "48 damage, double on a foe under 40% HP",
    a: "fire",
    sch: 1,
    ty: "atk",
    q: 23,
    rl: "damage",
    ab: "sunbrand",
  },
  scatter: {
    n: "Scattershot",
    c: 2,
    t: "14 to all foes in your element",
    a: "fire",
    sch: 1,
    ty: "atk",
    lv: 1,
    aoe: 1,
    rl: "aoe",
    st: 1,
    ab: "wave",
  },
  cascade: {
    n: "Cascade",
    c: 3,
    t: "20 to all foes, +8 more for each foe it hits",
    a: "fire",
    sch: 1,
    ty: "atk",
    lv: 4,
    aoe: 1,
    rl: "aoe",
    ab: "chain",
  },
  starfall: {
    n: "Starfall",
    c: 4,
    t: "38 to all foes plus your element's effect",
    a: "fire",
    sch: 1,
    ty: "atk",
    q: 25,
    aoe: 1,
    rl: "aoe",
    ab: "lampfall",
  },
  renew: {
    n: "Renewal",
    c: 2,
    t: "Heal every hero 22 and every ally 12, put out burns",
    a: "heal",
    ty: "sup",
    lv: 1,
    rl: "healer",
    st: 1,
    ab: "mend",
  },
  sanct: {
    n: "Sanctuary",
    c: 2,
    t: "Your whole team takes 40% less damage this round",
    a: "heal",
    ty: "sup",
    lv: 3,
    rl: "healer",
    ab: "golem",
  },
  rekindle: {
    n: "Rekindle",
    c: 3,
    t: "Revive a fallen hero at half HP, or heal the most hurt hero 60",
    a: "heal",
    ty: "sup",
    q: 27,
    rl: "healer",
    ab: "sprite",
  },
  familiar: {
    n: "Lantern Familiar",
    c: 1,
    t: "Ally: pecks 10 a turn, cheap to call",
    a: "storm",
    ty: "sum",
    lv: 1,
    rl: "summoner",
    st: 1,
    ab: "owl",
  },
  rally: { n: "Rally", c: 2, t: "Every ally acts right now", a: "heal", ty: "sup", lv: 3, rl: "summoner", ab: "roc" },
  bond: {
    n: "Soulbond",
    c: 3,
    t: "Allies hit 50% harder for 2 rounds and heal 20",
    a: "heal",
    ty: "sup",
    q: 29,
    rl: "summoner",
    ab: "titan",
  },
  taunt: {
    n: "Challenge",
    c: 1,
    t: "Every foe must attack you this round; gain a 20 shield",
    a: "ice",
    ty: "sup",
    lv: 1,
    rl: "tank",
    st: 1,
    ab: "aegis",
  },
  bulwark: { n: "Bulwark", c: 2, t: "Shield every hero for 30", a: "ice", ty: "sup", lv: 3, rl: "tank", ab: "golem" },
  thorns: {
    n: "Thornguard",
    c: 2,
    t: "Shield 25, and hit back half the damage you take this round",
    a: "ice",
    ty: "sup",
    q: 31,
    rl: "tank",
    ab: "hex",
  },
};
// spell tiers: what the shop calls each band of levels (higher tiers get a gold frame on the card)
const TIER = (s) => {
  const l = s.lv || (s.q === 7 ? 10 : 5);
  return l >= 10 ? ["Archmage", 3] : l >= 7 ? ["Master", 2] : l >= 4 ? ["Adept", 1] : ["Novice", 0];
};
// ---- summons: proper little creatures/objects instead of primitives ----
// shared helpers: a rune circle texture (ground sigil + card backdrop) and a wing texture for the Glow Sprite
function runeCanvas(col, sz) {
  const c = document.createElement("canvas");
  c.width = c.height = sz || 128;
  const x = c.getContext("2d"),
    R = c.width / 2;
  x.translate(R, R);
  x.strokeStyle = col;
  x.fillStyle = col;
  x.lineWidth = R * 0.05;
  x.beginPath();
  x.arc(0, 0, R * 0.94, 0, 7);
  x.stroke();
  x.lineWidth = R * 0.025;
  x.beginPath();
  x.arc(0, 0, R * 0.78, 0, 7);
  x.stroke();
  for (let i = 0; i < 12; i++) {
    x.save();
    x.rotate((i * Math.PI) / 6);
    x.fillRect(-R * 0.02, -R * 0.93, R * 0.04, R * 0.13);
    if (i % 2) {
      x.beginPath();
      x.arc(0, -R * 0.86, R * 0.045, 0, 7);
      x.fill();
    }
    x.restore();
  }
  x.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = ((i * Math.PI * 4) / 6) * 1.0 - Math.PI / 2;
    x.lineTo(Math.cos(a * 1) * R * 0.74, Math.sin(a * 1) * R * 0.74);
  }
  x.stroke();
  x.beginPath();
  for (let i = 0; i <= 6; i++) {
    const a = (i * Math.PI * 2) / 6 + Math.PI / 6;
    x.lineTo(Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.74);
  }
  x.stroke();
  return c;
}
const RUNE = {};
["#ff9a4a", "#8fe0ff", "#ffe066", "#8dffa8"].forEach((c, i) => {
  RUNE[["fire", "ice", "storm", "heal"][i]] = new T.CanvasTexture(runeCanvas(c, 256));
});
const WINGT = (() => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const x = c.getContext("2d"),
    q = x.createLinearGradient(0, 0, 0, 128);
  q.addColorStop(0, "rgba(220,255,230,.95)");
  q.addColorStop(1, "rgba(120,255,170,.35)");
  x.fillStyle = q;
  x.beginPath();
  x.ellipse(32, 64, 28, 62, 0, 0, 7);
  x.fill();
  x.strokeStyle = "rgba(255,255,255,.9)";
  x.lineWidth = 2;
  x.beginPath();
  x.moveTo(32, 124);
  x.lineTo(32, 10);
  x.moveTo(32, 80);
  x.lineTo(10, 40);
  x.moveTo(32, 70);
  x.lineTo(54, 34);
  x.stroke();
  return new T.CanvasTexture(c);
})();
function sumMesh(t) {
  const o = new T.Group(),
    body = new T.Group();
  o.add(body);
  const ud = { body };
  o.userData = ud;
  const am = (g, c, x, y, z, em, p) => {
    const m = mk(g, c, x, y, z, 1);
    if (em) m.material.emissive.setHex(em);
    (p || body).add(m);
    return m;
  };
  const spr = (k, s, x, y, z, p) => {
    const g = new T.Sprite(AM(SP[k]));
    g.scale.setScalar(s);
    g.position.set(x || 0, y || 0, z || 0);
    (p || o).add(g);
    return g;
  };
  if (t === "blade") {
    // tapered, bevelled blade with a glowing fuller, curled guard, wrapped grip, gem pommel
    const sh = new T.Shape();
    sh.moveTo(-0.14, 0);
    sh.lineTo(-0.16, 1.15);
    sh.quadraticCurveTo(-0.12, 1.45, 0, 1.75);
    sh.quadraticCurveTo(0.12, 1.45, 0.16, 1.15);
    sh.lineTo(0.14, 0);
    sh.lineTo(-0.14, 0);
    const bg = new T.ExtrudeGeometry(sh, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 1,
      curveSegments: 6,
    });
    bg.translate(0, 0, -0.02);
    am(bg, 0xffe6c0, 0, -0.3, 0, 0x993300);
    am(B(0.05, 1.25, 0.13), 0xfff2c0, 0, 0.32, 0, 0xff8a20).userData.nol = 1;
    const gd = am(new T.TorusGeometry(0.42, 0.07, 6, 14, Math.PI), 0xd9a441, 0, -0.22, 0, 0x442200);
    gd.rotation.z = Math.PI;
    gd.scale.y = 0.45;
    am(new T.OctahedronGeometry(0.12), 0xff5a1a, 0, -0.36, 0.05, 0xcc3300);
    am(Cy(0.065, 0.065, 0.42, 8), 0x5a2e14, 0, -0.62, 0);
    for (let i = 0; i < 3; i++)
      am(new T.TorusGeometry(0.07, 0.02, 4, 8), 0xd9a441, 0, -0.48 - i * 0.13, 0).rotation.x = Math.PI / 2;
    am(new T.OctahedronGeometry(0.11), 0xffb040, 0, -0.9, 0, 0xaa5500);
    outline(o);
    spr("fire", 2.2, 0, 0.4, 0, body);
    ud.orb = [0, 1, 2].map((k) => {
      const s = spr("fire", 0.55);
      s.userData.k = k;
      return s;
    });
  } else if (t === "aegis") {
    // kite shield with bevel, inner face, crystal heart and four orbiting ice shards
    const sh = new T.Shape();
    sh.moveTo(0, 0.9);
    sh.quadraticCurveTo(0.55, 0.85, 0.72, 0.6);
    sh.lineTo(0.6, -0.15);
    sh.quadraticCurveTo(0.35, -0.7, 0, -1);
    sh.quadraticCurveTo(-0.35, -0.7, -0.6, -0.15);
    sh.lineTo(-0.72, 0.6);
    sh.quadraticCurveTo(-0.55, 0.85, 0, 0.9);
    const g1 = new T.ExtrudeGeometry(sh, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 2,
      curveSegments: 8,
    });
    g1.translate(0, 0, -0.06);
    am(g1, 0x6fb8f0, 0, 0, 0, 0x123a66);
    const g2 = new T.ShapeGeometry(sh, 8);
    const fc = am(g2, 0xd8f4ff, 0, 0, 0.13, 0x2a6a9a);
    fc.scale.setScalar(0.78);
    fc.userData.nol = 1;
    const cr = am(new T.OctahedronGeometry(0.24), 0xeafcff, 0, 0.05, 0.24, 0x4ac0ff);
    cr.scale.set(1, 1.5, 0.7);
    [
      [-0.38, 0.45],
      [0.38, 0.45],
      [-0.3, -0.35],
      [0.3, -0.35],
    ].forEach(([x, y]) => (am(Sp(0.06, 6), 0xffffff, x, y, 0.18, 0x6ab8e8).userData.nol = 1));
    outline(o);
    spr("ice", 2.4, 0, 0, -0.2, body);
    ud.shards = [0, 1, 2, 3].map((k) => {
      const m = am(new T.OctahedronGeometry(0.13), 0xbfeeff, 0, 0, 0, 0x3a8ac8, o);
      m.scale.set(1, 2, 1);
      return m;
    });
  } else if (t === "wisp") {
    // a crackling spirit: faceted core, soft shell, big eyes, trailing tail
    am(new T.IcosahedronGeometry(0.34, 1), 0xfff6b0, 0, 0, 0, 0xd0b030);
    [-0.12, 0.12].forEach((x) => {
      am(Sp(0.085, 8), 0x1a1206, x, 0.06, 0.3).scale.set(1, 1.35, 0.6);
      am(Sp(0.03, 5), 0xffffff, x + 0.03, 0.1, 0.35).userData.nol = 1;
    });
    outline(o);
    const shell = new T.Mesh(
      Sp(0.52, 14),
      new T.MeshBasicMaterial({
        color: 0xffe066,
        transparent: true,
        opacity: 0.22,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    body.add(shell);
    ud.tail = [0, 1, 2, 3, 4].map((i) => {
      const m = new T.Mesh(
        Sp(0.22 - i * 0.035, 8),
        new T.MeshBasicMaterial({
          color: 0xfff2a0,
          transparent: true,
          opacity: 0.75 - i * 0.13,
          blending: T.AdditiveBlending,
          depthWrite: false,
        }),
      );
      o.add(m);
      return m;
    });
    ud.zap = [0, 1].map(() => spr("storm", 0.7));
    ud.orbs = [0, 1, 2].map(() => am(Sp(0.08, 6), 0xffe066, 0, 0, 0, 0xaa8800, o));
  } else if (t === "golem") {
    // mossy stone golem: blocky body, glowing eyes, moss mantle
    am(B(0.95, 0.8, 0.62), 0x7a7390, 0, 0, 0);
    am(B(0.62, 0.5, 0.5), 0x7a7390, 0, 0.64, 0);
    am(B(1.02, 0.14, 0.68), 0x3a8a4a, 0, 0.42, 0, 0x0a2a12);
    [-1, 1].forEach((s) => {
      am(B(0.3, 0.72, 0.3), 0x6a6382, s * 0.66, -0.06, 0);
      am(Sp(0.07, 6), 0x9affc0, s * 0.14, 0.68, 0.26, 0x3aaa6a).userData.nol = 1;
      am(Sp(0.12, 6), 0x4f9466, s * 0.3, 0.92, 0.1);
    });
    outline(o);
    spr("heal", 1.6, 0, 0.3, 0, body);
  } else if (t === "wolf" || t === "pup" || t === "epup") {
    // spirit wolf (glowing) and companion pups reuse the wolf / hound models at small size
    const b = beast(t === "epup" ? "hound" : "wolf");
    b.scale.setScalar(t === "wolf" ? 0.6 : 0.55);
    if (t === "wolf")
      b.traverse((m) => {
        if (m.material && m.material.emissive) m.material.emissive.setHex(0x1a4a7a);
      });
    body.add(b);
    ud.beast = b;
  } else if (t === "drake") {
    am(Sp(0.4, 10), 0xe0702a, 0, 0, 0, 0x551a00).scale.set(1, 0.8, 1.5);
    am(Sp(0.24, 8), 0xe0702a, 0, 0.25, 0.55, 0x551a00);
    am(Cn(0.12, 0.3, 5), 0xffd27a, 0, 0.25, 0.82, 0x663300).rotation.x = Math.PI / 2;
    [-1, 1].forEach((s) => {
      am(Sp(0.05, 5), 0xffee66, s * 0.1, 0.32, 0.72, 0xaa8800).userData.nol = 1;
      am(Cn(0.05, 0.2, 4), 0x3a1a0a, s * 0.12, 0.48, 0.5);
    });
    am(Cn(0.15, 0.8, 5), 0xe0702a, 0, -0.05, -0.85, 0x551a00).rotation.x = -Math.PI / 2;
    outline(o);
    const wm = new T.MeshBasicMaterial({ color: 0xff9a4a, side: T.DoubleSide, transparent: true, opacity: 0.85 }),
      wg = new T.BufferGeometry();
    wg.setAttribute("position", new T.Float32BufferAttribute([0, 0, -0.3, 1.1, 0.2, -0.1, 0, 0, 0.35], 3));
    ud.wings = [-1, 1].map((s) => {
      const w = new T.Mesh(wg, wm);
      w.scale.x = s;
      w.position.y = 0.15;
      body.add(w);
      return w;
    });
    spr("fire", 1.6, 0, 0, 0, body);
    body.rotation.y = Math.PI / 2;
  } else if (t === "owl") {
    am(Sp(0.32, 10), 0x8a6a4a, 0, 0, 0).scale.set(1, 1.15, 0.9);
    am(Sp(0.22, 8), 0xe8d8b0, 0, -0.05, 0.16).scale.set(1, 1.2, 0.5);
    [-1, 1].forEach((s) => {
      am(Sp(0.1, 8), 0xffe066, s * 0.12, 0.16, 0.24, 0xaa8800);
      am(Sp(0.045, 5), 0x111111, s * 0.12, 0.16, 0.32).userData.nol = 1;
      am(Cn(0.06, 0.16, 4), 0x5a3a2a, s * 0.16, 0.36, 0);
    });
    am(Cn(0.04, 0.1, 4), 0xd9a441, 0, 0.06, 0.32).rotation.x = Math.PI / 2;
    outline(o);
    const wm = new T.MeshBasicMaterial({ color: 0x6a4a30, side: T.DoubleSide }),
      wg = new T.PlaneGeometry(0.5, 0.3);
    wg.translate(0.25, 0, 0);
    ud.wings = [-1, 1].map((s) => {
      const p = new T.Group();
      p.position.set(s * 0.28, 0, 0);
      const w = new T.Mesh(wg, wm);
      w.scale.x = s;
      p.add(w);
      body.add(p);
      return p;
    });
    am(B(0.14, 0.18, 0.14), 0xffd27a, 0, -0.45, 0.05, 0xaa7a22);
    spr("storm", 1.1, 0, -0.45, 0, body);
  } else if (t === "phoenix") {
    // v14 Blazing Phoenix: a firebird with feathered flame wings, a crest and a long burning tail
    am(Sp(0.42, 12), 0xff5a1a, 0, 0, 0, 0x8a1a00).scale.set(0.9, 0.85, 1.5);
    am(Sp(0.3, 10), 0xffe0b0, 0, -0.08, 0.28, 0x6a3000).scale.set(0.8, 0.9, 0.9);
    am(Cy(0.12, 0.2, 0.45, 8), 0xff6a1a, 0, 0.3, 0.55, 0x8a1a00).rotation.x = -0.7;
    const hd = am(Sp(0.24, 10), 0xff7a2a, 0, 0.5, 0.75, 0x8a2a00);
    am(Cn(0.08, 0.3, 6), 0xffd23a, 0, 0.46, 1.02, 0x8a5a00).rotation.x = Math.PI / 2;
    [-1, 1].forEach((s) => {
      am(Sp(0.05, 6), 0xffffff, s * 0.12, 0.56, 0.93, 0xffee88).userData.nol = 1;
      am(Sp(0.025, 5), 0x1a0800, s * 0.13, 0.57, 0.97).userData.nol = 1;
    });
    [-0.35, 0, 0.35].forEach((a, i) => {
      const c = am(Cn(0.07, 0.45 - Math.abs(a) * 0.4, 5), i === 1 ? 0xfff0a0 : 0xffb040, 0, 0.78, 0.66, 0xaa5500);
      c.rotation.set(-0.5, 0, a);
    });
    outline(o);
    const fm = [0xffe9a0, 0xffb040, 0xff7a20, 0xff4a10].map(
      (c) => new T.MeshBasicMaterial({ color: c, side: T.DoubleSide, transparent: true, opacity: 0.92 }),
    );
    ud.wings = [-1, 1].map((s) => {
      const p = new T.Group();
      p.position.set(s * 0.3, 0.12, 0.1);
      for (let i = 0; i < 6; i++) {
        const g2 = new T.BufferGeometry(),
          L = 1.1 + i * 0.22,
          a = 0.15 - i * 0.2;
        g2.setAttribute(
          "position",
          new T.Float32BufferAttribute(
            [0, 0, 0.12, Math.cos(a) * L, Math.sin(a) * L * 0.5, -0.25 - i * 0.07, 0, 0, -0.18],
            3,
          ),
        );
        const w = new T.Mesh(g2, fm[Math.min(3, i >> 1)]);
        w.scale.x = s;
        p.add(w);
      }
      body.add(p);
      return p;
    });
    ud.tail = [-0.3, 0, 0.3].map((a, i) => {
      const t2 = am(Cn(0.12, 1.3 - Math.abs(a), 6), i === 1 ? 0xffb040 : 0xff5a1a, 0, -0.05, -0.95, 0xaa3300);
      t2.material.transparent = true;
      t2.material.opacity = 0.9;
      t2.rotation.set(-Math.PI / 2 + 0.25, 0, 0);
      t2.position.x = a * 0.6;
      t2.userData.a = a;
      return t2;
    });
    ud.hd = hd;
    spr("fire", 2.6, 0, 0, 0, body);
    ud.orb = [0, 1, 2, 3].map((k) => {
      const s = spr("fire", 0.5);
      s.userData.k = k;
      return s;
    });
    body.rotation.y = Math.PI / 2;
  } else if (t === "titan") {
    // v14 Glacier Titan: a hulking ice giant with a crystal crown, crystal-studded fists and orbiting hail
    const ice = 0x6fb8f0,
      dk = 0x3a7ab8;
    [-1, 1].forEach((s) => {
      am(B(0.36, 0.55, 0.4), dk, s * 0.3, -0.72, 0, 0x0a2a4a);
      am(B(0.44, 0.16, 0.52), 0x9fd8ff, s * 0.3, -0.98, 0.04, 0x1a4a7a);
    });
    am(B(1.3, 0.95, 0.8), ice, 0, 0, 0, 0x123a66);
    am(B(1.0, 0.4, 0.86), 0x9fd8ff, 0, 0.32, 0.02, 0x1a4a7a);
    am(B(0.6, 0.5, 0.55), 0x9fd8ff, 0, 0.72, 0.05, 0x1a4a7a);
    [-1, 1].forEach((s) => {
      am(Sp(0.075, 6), 0xffffff, s * 0.14, 0.76, 0.33, 0x8ae0ff).userData.nol = 1;
      am(new T.OctahedronGeometry(0.22), 0xdff8ff, s * 0.62, 0.48, 0, 0x3a8ac8).scale.set(1, 1.6, 1);
    });
    [-0.22, 0, 0.22].forEach((x0, i) => {
      const c = am(new T.OctahedronGeometry(0.11), 0xeafcff, x0, 1.06 + (i === 1 ? 0.08 : 0), 0.04, 0x4ac0ff);
      c.scale.set(0.8, i === 1 ? 2.6 : 2, 0.8);
    });
    [
      [-0.3, 0.1, 0.42],
      [0.25, -0.2, 0.42],
      [0.05, 0.25, -0.42],
    ].forEach(([x0, y0, z0]) =>
      am(new T.OctahedronGeometry(0.12), 0xeafcff, x0, y0, z0, 0x3a8ac8).scale.set(1, 1.8, 1),
    );
    ud.arms = [-1, 1].map((s) => {
      const p = new T.Group();
      p.position.set(s * 0.82, 0.3, 0);
      am(B(0.36, 0.8, 0.38), ice, 0, -0.4, 0, 0x123a66, p);
      am(B(0.5, 0.42, 0.5), 0x9fd8ff, 0, -0.95, 0.04, 0x1a4a7a, p);
      [-0.12, 0.12].forEach((z0) =>
        am(new T.OctahedronGeometry(0.09), 0xeafcff, s * 0.12, -0.92, z0 + 0.2, 0x4ac0ff, p).scale.set(1, 1.7, 1),
      );
      body.add(p);
      p.userData.s = s;
      return p;
    });
    outline(o);
    spr("ice", 2.8, 0, 0.2, -0.2, body);
    ud.shards = [0, 1, 2].map(() => {
      const m = am(new T.OctahedronGeometry(0.16), 0xbfeeff, 0, 0, 0, 0x3a8ac8, o);
      m.scale.set(1, 2, 1);
      return m;
    });
  } else if (t === "roc") {
    // v14 Storm Roc: a great golden eagle, white-headed, with storm-charged wings and lightning in its talons
    am(Sp(0.38, 12), 0xb8862a, 0, 0, 0, 0x2a1a00).scale.set(0.95, 1.2, 1.05);
    am(Sp(0.24, 10), 0xf4ead0, 0, -0.05, 0.2, 0x2a2a1a).scale.set(0.9, 1.3, 0.6);
    const hd = am(Sp(0.24, 10), 0xfaf4e4, 0, 0.5, 0.1, 0x2a2a2a);
    am(Cn(0.07, 0.24, 5), 0xffc83a, 0, 0.46, 0.36, 0x6a4a00).rotation.x = Math.PI / 2 + 0.5;
    [-1, 1].forEach((s) => {
      am(Sp(0.05, 6), 0xffe066, s * 0.12, 0.55, 0.28, 0xaa8800).userData.nol = 1;
      am(Sp(0.022, 5), 0x111111, s * 0.13, 0.55, 0.32).userData.nol = 1;
      am(B(0.12, 0.03, 0.1), 0x6a4a1a, s * 0.11, 0.62, 0.27).rotation.z = s * -0.4;
      [-0.06, 0.06].forEach((z0) => am(Cn(0.025, 0.14, 4), 0xffd23a, s * 0.12 + z0, -0.5, 0.08, 0x6a4a00));
    });
    outline(o);
    const wm = [0x8a5a1a, 0xb8862a, 0xe8c060].map(
      (c) => new T.MeshToonMaterial({ color: c, gradientMap: GR, side: T.DoubleSide }),
    );
    ud.wings = [-1, 1].map((s) => {
      const p = new T.Group();
      p.position.set(s * 0.3, 0.15, 0);
      for (let i = 0; i < 5; i++) {
        const w = new T.Mesh(new T.PlaneGeometry(0.9 - i * 0.08, 0.2), wm[i % 3]);
        w.geometry.translate((0.9 - i * 0.08) / 2, 0, 0);
        w.position.set(0, -i * 0.02, -i * 0.07);
        w.rotation.set(-Math.PI / 2, 0, s * 0.12 * i); // laid flat, each feather swept a little further back
        w.scale.x = s;
        p.add(w);
      }
      const z = spr("storm", 0.7, s * 0.85, 0, 0, p);
      z.userData.z = 1;
      body.add(p);
      return p;
    });
    const tf = new T.Mesh(new T.CircleGeometry(0.4, 8, -0.6, 1.2), wm[1]);
    tf.rotation.set(1.2, 0, -Math.PI / 2);
    tf.position.set(0, -0.35, -0.3);
    body.add(tf);
    ud.hd = hd;
    spr("storm", 1.8, 0, 0, 0, body);
    ud.zap = [0, 1, 2].map(() => spr("storm", 0.6));
  } else if (t === "familiar") {
    // v14 Lantern Familiar: a round little lamp-bird carrying a lantern on a chain
    am(Sp(0.24, 10), 0xd9a060, 0, 0, 0, 0x2a1400).scale.set(1, 1.05, 0.95);
    am(Sp(0.15, 8), 0xf4e2bc, 0, -0.04, 0.13).scale.set(1, 1.1, 0.5);
    [-1, 1].forEach((s) => {
      am(Sp(0.075, 8), 0xffe066, s * 0.09, 0.08, 0.19, 0xaa8800);
      am(Sp(0.032, 5), 0x111111, s * 0.09, 0.08, 0.25).userData.nol = 1;
      am(Cn(0.045, 0.14, 4), 0x8a5a30, s * 0.12, 0.28, 0).rotation.z = s * -0.3;
    });
    am(Cn(0.03, 0.08, 4), 0xd9a441, 0, 0.02, 0.25).rotation.x = Math.PI / 2;
    outline(o);
    const wm = new T.MeshBasicMaterial({ color: 0xb8804a, side: T.DoubleSide }),
      wg = new T.PlaneGeometry(0.34, 0.2);
    wg.translate(0.17, 0, 0);
    ud.wings = [-1, 1].map((s) => {
      const p = new T.Group();
      p.position.set(s * 0.2, 0.02, 0);
      const w = new T.Mesh(wg, wm);
      w.scale.x = s;
      p.add(w);
      body.add(p);
      return p;
    });
    const lp = new T.Group();
    lp.position.set(0, -0.22, 0.05);
    am(Cy(0.008, 0.008, 0.2, 4), 0x5a3a10, 0, -0.1, 0, 0, lp);
    am(Cn(0.09, 0.07, 6), 0x3a2a18, 0, -0.22, 0, 0, lp);
    am(Cy(0.07, 0.07, 0.16, 6), 0xffe9a0, 0, -0.34, 0, 0xffb040, lp).userData.nol = 1;
    am(Cy(0.08, 0.08, 0.03, 6), 0x3a2a18, 0, -0.43, 0, 0, lp);
    spr("fire", 0.55, 0, -0.34, 0, lp);
    body.add(lp);
    ud.lamp = lp;
    spr("storm", 0.9, 0, 0, 0, body);
  } else if (t === "squire" || t === "witch") {
    const p = person(
      t === "squire"
        ? { robe: 0x8a3a2a, trim: 0xffd27a, hat: "band", hc: 0xc9a24a, prop: "lamp" }
        : { robe: 0x3a6a3a, trim: 0x9affc0, hat: "wizard", hc: 0x2a4a2a, prop: "cross" },
    );
    p.scale.setScalar(0.72);
    body.add(p);
    ud.p = p;
  } else {
    // a tiny fairy: dress, head with eyes and hair, halo, four translucent wings
    am(Cn(0.24, 0.45, 10), 0x9affc0, 0, -0.2, 0, 0x1a6a3a);
    am(Sp(0.14, 10), 0xb8ffc8, 0, 0.06, 0, 0x1a5a3a);
    am(Sp(0.15, 12), 0xfbe6d6, 0, 0.32, 0);
    am(new T.SphereGeometry(0.165, 12, 8, 0, 6.283, 0, 1.5), 0x2a8a5a, 0, 0.35, -0.02);
    [-0.055, 0.055].forEach((x) => (am(Sp(0.025, 5), 0x1a1206, x, 0.33, 0.135).userData.nol = 1));
    [-1, 1].forEach((s) => {
      const a = am(Cy(0.03, 0.035, 0.28, 5), 0xfbe6d6, s * 0.16, -0.02, 0);
      a.rotation.z = s * 0.5;
    });
    outline(o);
    am(new T.TorusGeometry(0.13, 0.025, 6, 16), 0xfff6b0, 0, 0.6, 0, 0xccaa40).rotation.x = Math.PI / 2;
    const wm = new T.MeshBasicMaterial({
        map: WINGT,
        transparent: true,
        side: T.DoubleSide,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
      wg = new T.PlaneGeometry(0.36, 0.72);
    wg.translate(0, 0.36, 0);
    ud.wings = [
      [-1, 0.1, 0.7],
      [1, 0.1, 0.7],
      [-1, -0.05, 0.45],
      [1, -0.05, 0.45],
    ].map(([s, y, sc]) => {
      const p = new T.Group();
      p.position.set(s * 0.05, y, -0.1);
      const w = new T.Mesh(wg, wm);
      w.scale.setScalar(sc);
      w.rotation.z = -s * (sc > 0.6 ? 1.1 : 2.1);
      p.add(w);
      body.add(p);
      p.userData.s = s;
      return p;
    });
    spr("heal", 1.5, 0, 0.1, 0, body);
  }
  return o;
}
// per-ally idle animation (u = ally record, i = index, s = seconds)
function sumIdle(u, i, s) {
  const A = ALLY[u.t];
  if (A && A.mdl) return sumIdle0({ m: u.m, t: A.mdl, act: u.act }, i, s);
  return sumIdle0(u, i, s);
}
function sumIdle0(u, i, s) {
  const ud = u.m.userData,
    b = ud.body;
  if (u.t === "blade") {
    b.rotation.y = s * 1.6;
    b.rotation.z = Math.sin(s * 1.3 + i) * 0.18;
    (ud.orb || []).forEach((e) => {
      const a = s * 3 + e.userData.k * 2.094;
      e.position.set(Math.cos(a) * 0.55, 0.3 + Math.sin(s * 4 + e.userData.k) * 0.35, Math.sin(a) * 0.55);
    });
  } else if (u.t === "aegis") {
    b.rotation.y = Math.PI / 2 + Math.sin(s * 0.9 + i) * 0.25;
    b.rotation.x = Math.sin(s * 1.1) * 0.06;
    (ud.shards || []).forEach((m, k) => {
      const a = s * 1.4 + k * 1.571;
      m.position.set(Math.cos(a) * 0.95, Math.sin(a * 2) * 0.25, Math.sin(a) * 0.95);
      m.rotation.y = s * 3;
    });
  } else if (u.t === "wisp") {
    b.rotation.y = Math.PI / 2 + Math.sin(s * 2) * 0.4;
    b.position.set(Math.sin(s * 1.7) * 0.18, Math.sin(s * 3.4) * 0.12, 0);
    (ud.tail || []).forEach((m, k) =>
      m.position.set(
        b.position.x - (k + 1) * 0.22 * Math.cos(s * 2 - k * 0.4) * 0.4 - (k + 1) * 0.12,
        b.position.y + Math.sin(s * 3 - k * 0.7) * 0.08 * (k + 1),
        -(k + 1) * 0.2,
      ),
    );
    (ud.zap || []).forEach((z) => {
      z.visible = Math.random() < 0.35;
      z.position.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.6);
      z.material.rotation = Math.random() * 6;
    });
    (ud.orbs || []).forEach((q, k) =>
      q.position.set(Math.cos(s * 3 + k * 2.1) * 0.7, Math.sin(s * 2 + k) * 0.25, Math.sin(s * 3 + k * 2.1) * 0.7),
    );
  } else if (u.t === "sprite") {
    b.rotation.y = 0.5 + Math.sin(s * 0.8 + i) * 0.4;
    (ud.wings || []).forEach((p) => {
      p.rotation.y = p.userData.s * (0.35 + Math.sin(s * 18) * 0.45);
    });
    if (Math.random() < 0.05) puff(u.m.position.clone().add(new T.Vector3(0, -0.2, 0)), "heal", 1, 0.4, 0.8, 0.35);
  } else if (u.t === "golem") {
    b.position.y = Math.abs(Math.sin(s * 1.5 + i)) * 0.05;
    b.rotation.y = 0.5 + Math.sin(s * 0.7 + i) * 0.12;
  } else if (u.t === "phoenix") {
    // slow, mighty wingbeats; the tail plumes ripple and sparks circle it
    const fl = Math.sin(s * 3.2 + i);
    ud.wings.forEach((w, k) => {
      w.rotation.z = (k ? -1 : 1) * (0.15 + fl * 0.55);
      w.rotation.y = (k ? 1 : -1) * 0.15;
    });
    b.position.y = -fl * 0.12;
    b.rotation.y = Math.PI / 2 + Math.sin(s * 0.7 + i) * 0.15;
    b.rotation.z = Math.sin(s * 1.1) * 0.06;
    ud.tail.forEach((q, k) => (q.rotation.y = q.userData.a + Math.sin(s * 4 - k) * 0.18));
    if (ud.hd) ud.hd.rotation.y = Math.sin(s * 1.3) * 0.3;
    ud.orb.forEach((e) => {
      const a = s * 2.2 + e.userData.k * 1.571;
      e.position.set(Math.cos(a) * 1.1, Math.sin(s * 3 + e.userData.k) * 0.4, Math.sin(a) * 1.1);
    });
    if (Math.random() < 0.08) puff(u.m.position.clone().add(new T.Vector3(0, -0.3, 0)), "fire", 1, 0.6, 0.7, 0.45);
  } else if (u.t === "titan") {
    // heavy breathing, arms swinging (raised to slam while it acts), hail orbiting
    const br = Math.sin(s * 1.2 + i);
    b.position.y = br * 0.04;
    b.rotation.y = 0.5 + Math.sin(s * 0.5 + i) * 0.1;
    ud.arms.forEach((p) => {
      p.rotation.x = u.act ? -2.4 : Math.sin(s * 1.2 + i + p.userData.s) * 0.12;
      p.rotation.z = p.userData.s * (0.08 + br * 0.04);
    });
    ud.shards.forEach((m, k) => {
      const a = s * 1.1 + k * 2.094;
      m.position.set(Math.cos(a) * 1.4, 0.9 + Math.sin(a * 2) * 0.3, Math.sin(a) * 1.4);
      m.rotation.y = s * 2.5;
    });
  } else if (u.t === "roc") {
    // broad soaring beats with a glide, head turning, sparks jumping off its wings
    const fl = Math.sin(s * 4 + i);
    ud.wings.forEach((w, k) => (w.rotation.z = (k ? -1 : 1) * (0.1 + fl * 0.5)));
    b.position.y = -fl * 0.1;
    b.rotation.y = 0.9 + Math.sin(s * 0.6 + i) * 0.15;
    if (ud.hd) ud.hd.rotation.y = Math.sin(s * 0.9) * 0.4;
    (ud.zap || []).forEach((z) => {
      z.visible = Math.random() < 0.3;
      z.position.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.3) * 0.8, (Math.random() - 0.5) * 0.8);
      z.material.rotation = Math.random() * 6;
    });
  } else if (u.t === "familiar") {
    // quick little flutter, bobbing, its lantern swinging on the chain
    ud.wings.forEach((w, k) => (w.rotation.z = (k ? -1 : 1) * Math.sin(s * 16) * 0.7));
    b.position.y = Math.sin(s * 3 + i) * 0.08;
    b.rotation.y = 0.5 + Math.sin(s * 1.2 + i) * 0.3;
    ud.lamp.rotation.z = Math.sin(s * 3 + i - 0.6) * 0.35;
    ud.lamp.rotation.x = Math.sin(s * 2.3) * 0.15;
  } else if (ud.wings) {
    ud.wings.forEach((w, k) => (w.rotation.z = (k ? -1 : 1) * Math.sin(s * (u.t === "owl" ? 9 : 6)) * 0.6));
    if (u.t === "owl") b.rotation.y = 0.5 + Math.sin(s + i) * 0.2;
    else b.rotation.y = Math.PI / 2 + Math.sin(s * 0.8 + i) * 0.15;
  } else if (ud.beast) {
    ud.beast.rotation.y = Math.PI / 2;
    animBeast(ud.beast, s, u.act);
  } else if (ud.p) {
    ud.p.rotation.y = 1;
    const q = ud.p.userData;
    q.AL.rotation.x = Math.sin(s * 1.4 + i) * 0.06;
    q.AR.rotation.x = u.act ? -1.8 : Math.sin(s * 1.4 + i + 1) * 0.06;
  }
}
// ---- card art: one picture per card (attacks on a burst, summons standing in a rune circle, support on a soft halo) ----
const CCOL = {
  spark: "#ffe066",
  nova: "#8fe0ff",
  meteor: "#ff8a3d",
  lance: "#bfeeff",
  chain: "#ffe066",
  wave: "#ff8a3d",
  mend: "#8dffa8",
  hex: "#b89aff",
  lampfall: "#ffd27a",
  blade: "#ff9a4a",
  aegis: "#8fe0ff",
  wisp: "#ffe066",
  sprite: "#8dffa8",
  golem: "#8dffa8",
  wolf: "#8fe0ff",
  drake: "#ff9a4a",
  owl: "#ffe066",
  ember: "#ff9a4a",
  phoenix: "#ff5a2a",
  inferno: "#ff5a1a",
  sunbrand: "#ffd27a",
  shard: "#bfeeff",
  titan: "#6fb8f0",
  blizzard: "#dff8ff",
  zero: "#9fe8ff",
  thunder: "#fff3a0",
  roc: "#ffd23a",
  tempest: "#fff06a",
  skyfall: "#ffffff",
};
// spells that borrow another card's picture get recoloured; higher tiers get a gold frame and stars
const CTINT = {
  ember: "rgba(255,90,20,.45)",
  phoenix: "rgba(255,40,0,.35)",
  inferno: "rgba(255,40,0,.3)",
  sunbrand: "rgba(255,240,160,.35)",
  shard: "rgba(120,200,255,.25)",
  titan: "rgba(60,140,230,.5)",
  blizzard: "rgba(255,255,255,.3)",
  zero: "rgba(90,200,255,.55)",
  thunder: "rgba(255,255,200,.25)",
  roc: "rgba(255,200,40,.4)",
  tempest: "rgba(200,220,255,.3)",
  skyfall: "rgba(160,200,255,.4)",
  // v21 earned cards borrow a picture and get their own tint
  cinder: "rgba(255,60,0,.35)",
  firebrand: "rgba(255,200,60,.35)",
  ashstorm: "rgba(90,60,60,.4)",
  arc: "rgba(120,200,255,.3)",
  ball: "rgba(255,120,255,.3)",
  squall: "rgba(160,220,255,.35)",
  spike: "rgba(200,240,255,.35)",
  glacial: "rgba(40,120,220,.4)",
  hail: "rgba(180,200,230,.4)",
  sap: "rgba(200,255,120,.3)",
  snare: "rgba(40,140,60,.4)",
  overgrow: "rgba(255,180,220,.3)",
  siphon: "rgba(120,60,200,.35)",
  plance: "rgba(255,255,255,.3)",
  requiem: "rgba(60,20,90,.45)",
};
function cardArt(k0) {
  const own = !!CARTX[k0], // v14: cards with their own picture don't borrow (or tint) another card's
    c = cardArt0(own ? k0 : SPL[k0].ab || k0, k0),
    x = c.getContext("2d"),
    tr = TIER(SPL[k0])[1];
  if (CTINT[k0] && !own) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = "source-atop";
    x.fillStyle = CTINT[k0];
    x.fillRect(0, 0, 128, 128);
    x.globalCompositeOperation = "source-over";
  }
  if (k0 === "ember") {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = "destination-over";
    const q = x.createRadialGradient(64, 64, 0, 64, 64, 60);
    q.addColorStop(0, "rgba(255,160,60,.7)");
    q.addColorStop(1, "rgba(255,80,0,0)");
    x.fillStyle = q;
    x.fillRect(0, 0, 128, 128);
    x.globalCompositeOperation = "source-over";
  }
  if (tr >= 2) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.strokeStyle = tr >= 3 ? "#ffe9a0" : "#d9a441";
    x.lineWidth = tr >= 3 ? 6 : 4;
    x.shadowColor = "#ffd27a";
    x.shadowBlur = 10;
    x.strokeRect(4, 4, 120, 120);
    x.shadowBlur = 0;
    x.fillStyle = "#ffe066";
    x.strokeStyle = "#5a3a10";
    x.lineWidth = 1.5;
    for (let j = 0; j < tr; j++) {
      const cx = 64 + (j - (tr - 1) / 2) * 16,
        cy = 114;
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 3 : 7,
          a = (i * Math.PI) / 5 - Math.PI / 2;
        x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      x.closePath();
      x.fill();
      x.stroke();
    }
  }
  return c;
}
function cardArt0(k, k0) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d"),
    ty = SPL[k0].ty,
    col = CCOL[k0] || CCOL[k];
  const glow = (r, a, b) => {
    const q = x.createRadialGradient(0, 0, 0, 0, 0, r);
    q.addColorStop(0, a);
    q.addColorStop(1, b);
    x.fillStyle = q;
    x.beginPath();
    x.arc(0, 0, r, 0, 7);
    x.fill();
  };
  const poly = (pts, f, s, w) => {
    x.beginPath();
    pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
    x.closePath();
    if (f) {
      x.fillStyle = f;
      x.fill();
    }
    if (s) {
      x.strokeStyle = s;
      x.lineWidth = w || 3;
      x.stroke();
    }
  };
  const dot = (a, b, r, f) => {
    x.fillStyle = f;
    x.beginPath();
    x.arc(a, b, r, 0, 7);
    x.fill();
  };
  x.translate(64, 64);
  if (ty === "sum") {
    x.globalAlpha = 0.9;
    x.drawImage(runeCanvas(col, 128), -64, -64);
    x.globalAlpha = 1;
  } else if (ty === "sup") {
    x.globalAlpha = 0.5;
    glow(62, col, "rgba(0,0,0,0)");
    x.globalAlpha = 1;
  } else {
    x.save();
    x.fillStyle = col;
    x.globalAlpha = 0.4;
    for (let i = 0; i < 12; i++) {
      x.rotate(Math.PI / 6);
      x.beginPath();
      x.moveTo(-9, 0);
      x.lineTo(0, -63);
      x.lineTo(9, 0);
      x.fill();
    }
    x.restore();
    x.globalAlpha = 1;
  }
  x.lineJoin = "round";
  x.lineCap = "round";
  if (k === "spark") {
    glow(40, "rgba(255,250,200,.9)", "rgba(255,220,60,0)");
    poly(
      [
        [14, -54],
        [-18, -2],
        [2, -2],
        [-14, 54],
        [22, -6],
        [3, -6],
      ],
      "#fffbe0",
      "#e0a800",
      4,
    );
  } else if (k === "nova") {
    glow(30, "rgba(230,252,255,.95)", "rgba(90,200,255,0)");
    x.strokeStyle = "#eafcff";
    x.lineWidth = 6;
    for (let i = 0; i < 6; i++) {
      x.rotate(Math.PI / 3);
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(0, -52);
      x.moveTo(0, -26);
      x.lineTo(-13, -40);
      x.moveTo(0, -26);
      x.lineTo(13, -40);
      x.moveTo(0, -42);
      x.lineTo(-8, -52);
      x.moveTo(0, -42);
      x.lineTo(8, -52);
      x.stroke();
    }
  } else if (k === "meteor" || k === "lampfall") {
    const q = x.createLinearGradient(58, -58, -6, 6);
    q.addColorStop(0, "rgba(255,90,20,0)");
    q.addColorStop(1, "rgba(255,200,80,.95)");
    poly(
      [
        [64, -40],
        [-20, -4],
        [4, 22],
        [40, -64],
      ],
      q,
    );
    glow(36, "rgba(255,220,120,.9)", "rgba(255,80,0,0)");
    if (k === "meteor") {
      x.fillStyle = "#6a3018";
      x.strokeStyle = "#2a1008";
      x.lineWidth = 3;
      x.beginPath();
      x.arc(-6, 10, 22, 0, 7);
      x.fill();
      x.stroke();
      [
        [-14, 4, 5],
        [2, 16, 4],
        [-4, 0, 3],
      ].forEach(([a, b, r]) => dot(a, b, r, "#ff6a1a"));
    } else {
      poly(
        [
          [-20, -6],
          [8, -6],
          [12, 30],
          [-24, 30],
        ],
        "#ffe9a0",
        "#8a5a10",
      );
      x.fillStyle = "#3a2a18";
      x.fillRect(-24, -12, 36, 6);
      x.fillRect(-24, 30, 36, 6);
      [
        [30, -40],
        [40, 10],
        [-40, -30],
        [20, 44],
      ].forEach(([a, b]) => dot(a, b, 4, "#fffbe0"));
    }
  } else if (k === "ember") {
    glow(40, "rgba(255,230,150,.95)", "rgba(255,90,0,0)");
    x.rotate(0.7);
    poly(
      [
        [0, -50],
        [16, -14],
        [20, 14],
        [0, 34],
        [-20, 14],
        [-16, -14],
      ],
      "#ff7a2a",
      "#7a2008",
      3,
    );
    poly(
      [
        [0, -26],
        [9, 0],
        [0, 22],
        [-9, 0],
      ],
      "#ffe9a0",
    );
  } else if (k === "lance") {
    x.rotate(0.75);
    glow(28, "rgba(210,245,255,.9)", "rgba(90,190,255,0)");
    poly(
      [
        [0, -60],
        [9, -18],
        [4, 52],
        [-4, 52],
        [-9, -18],
      ],
      "#dff8ff",
      "#4ab0e0",
      3,
    );
    x.strokeStyle = "#ffffff";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, -50);
    x.lineTo(0, 40);
    x.stroke();
  } else if (k === "chain") {
    glow(50, "rgba(255,245,160,.6)", "rgba(255,220,60,0)");
    x.strokeStyle = "#fffbe0";
    x.lineWidth = 5;
    const P = [
      [-50, -30],
      [-20, -6],
      [-30, 18],
      [6, 10],
      [0, 40],
      [30, 22],
      [52, 46],
    ];
    x.beginPath();
    P.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
    x.stroke();
    x.strokeStyle = "#ffd23a";
    x.lineWidth = 2;
    x.stroke();
    [
      [-50, -30],
      [6, 10],
      [52, 46],
    ].forEach(([a, b]) => {
      dot(a, b, 9, "rgba(255,240,140,.6)");
      dot(a, b, 4, "#fff");
    });
  } else if (k === "wave") {
    glow(30, "rgba(255,220,140,.8)", "rgba(255,100,20,0)");
    [38, 26, 14].forEach((r, i) => {
      x.strokeStyle = ["#ff5a1a", "#ff9a3a", "#ffe0a0"][i];
      x.lineWidth = 10 - i * 2;
      x.beginPath();
      x.arc(-30, 30, r + 20, -1.4, 0.2);
      x.stroke();
    });
  } else if (k === "mend") {
    glow(44, "rgba(220,255,225,.95)", "rgba(80,255,140,0)");
    poly(
      [
        [-10, -38],
        [10, -38],
        [10, -10],
        [38, -10],
        [38, 10],
        [10, 10],
        [10, 38],
        [-10, 38],
        [-10, 10],
        [-38, 10],
        [-38, -10],
        [-10, -10],
      ],
      "#eafff0",
      "#3aaa6a",
      3,
    );
    [
      [-40, -40],
      [42, -30],
      [34, 44],
    ].forEach(([a, b]) => dot(a, b, 3, "#fff"));
  } else if (k === "hex") {
    glow(46, "rgba(200,170,255,.8)", "rgba(120,80,220,0)");
    x.strokeStyle = "#e8dcff";
    x.lineWidth = 4;
    x.beginPath();
    x.ellipse(0, 0, 40, 22, 0, 0, 7);
    x.stroke();
    dot(0, 0, 14, "#6a3ac8");
    dot(0, 0, 6, "#120a24");
    for (let i = 0; i < 8; i++) {
      x.save();
      x.rotate((i * Math.PI) / 4);
      x.beginPath();
      x.moveTo(0, -30);
      x.lineTo(0, -52);
      x.stroke();
      x.restore();
    }
  } else if (k === "blade") {
    x.rotate(-0.75);
    glow(26, "rgba(255,200,120,.8)", "rgba(255,120,40,0)");
    poly(
      [
        [-6, 10],
        [-7, -40],
        [0, -58],
        [7, -40],
        [6, 10],
      ],
      "#ffeccc",
      "#8a4a10",
    );
    x.fillStyle = "#ff9a3a";
    x.fillRect(-1.5, -40, 3, 46);
    x.fillStyle = "#d9a441";
    x.strokeStyle = "#5a3a10";
    x.beginPath();
    x.moveTo(-22, 10);
    x.quadraticCurveTo(0, 20, 22, 10);
    x.lineTo(22, 16);
    x.quadraticCurveTo(0, 26, -22, 16);
    x.closePath();
    x.fill();
    x.stroke();
    x.fillStyle = "#5a2e14";
    x.fillRect(-4, 18, 8, 22);
    dot(0, 44, 6, "#ffb040");
  } else if (k === "aegis") {
    glow(40, "rgba(200,240,255,.7)", "rgba(90,180,255,0)");
    x.fillStyle = "#6fb8f0";
    x.strokeStyle = "#eafcff";
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(0, -44);
    x.quadraticCurveTo(28, -42, 36, -30);
    x.lineTo(30, 8);
    x.quadraticCurveTo(18, 34, 0, 48);
    x.quadraticCurveTo(-18, 34, -30, 8);
    x.lineTo(-36, -30);
    x.quadraticCurveTo(-28, -42, 0, -44);
    x.fill();
    x.stroke();
    poly(
      [
        [0, -22],
        [10, -2],
        [0, 22],
        [-10, -2],
      ],
      "#eafcff",
    );
  } else if (k === "wisp") {
    glow(34, "rgba(255,245,170,.95)", "rgba(255,220,60,0)");
    [
      [-26, 18, 8],
      [-38, 26, 6],
      [-48, 32, 4],
    ].forEach(([a, b, r]) => dot(a, b, r, "rgba(255,240,150,.7)"));
    x.fillStyle = "#fff6b0";
    x.strokeStyle = "#c8a020";
    x.lineWidth = 3;
    x.beginPath();
    x.arc(0, 0, 20, 0, 7);
    x.fill();
    x.stroke();
    x.fillStyle = "#1a1206";
    [-7, 7].forEach((e) => {
      x.beginPath();
      x.ellipse(e, -2, 4, 6, 0, 0, 7);
      x.fill();
    });
    [-6, 8].forEach((e) => dot(e, -4, 1.6, "#fff"));
    x.strokeStyle = "#ffe066";
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(24, -18);
    x.lineTo(32, -24);
    x.lineTo(30, -14);
    x.lineTo(40, -20);
    x.stroke();
  } else if (k === "sprite") {
    glow(36, "rgba(220,255,225,.9)", "rgba(80,255,140,0)");
    x.fillStyle = "rgba(210,255,225,.85)";
    [-1, 1].forEach((s) => {
      x.beginPath();
      x.ellipse(s * 16, -10, 10, 24, s * 0.6, 0, 7);
      x.fill();
      x.beginPath();
      x.ellipse(s * 14, 12, 7, 15, s * 1.9, 0, 7);
      x.fill();
    });
    poly(
      [
        [0, 0],
        [13, 28],
        [-13, 28],
      ],
      "#9affc0",
    );
    dot(0, -8, 10, "#fbe6d6");
    x.fillStyle = "#2a8a5a";
    x.beginPath();
    x.arc(0, -11, 10, Math.PI, 0);
    x.fill();
    x.strokeStyle = "#fff6b0";
    x.lineWidth = 2.5;
    x.beginPath();
    x.ellipse(0, -25, 9, 3, 0, 0, 7);
    x.stroke();
  } else if (k === "golem") {
    glow(38, "rgba(200,255,210,.6)", "rgba(80,200,120,0)");
    poly(
      [
        [-26, -4],
        [26, -4],
        [24, 36],
        [-24, 36],
      ],
      "#8a849c",
      "#3a3450",
    );
    poly(
      [
        [-16, -34],
        [16, -34],
        [16, -6],
        [-16, -6],
      ],
      "#8a849c",
      "#3a3450",
    );
    poly(
      [
        [-30, -8],
        [30, -8],
        [28, 2],
        [-28, 2],
      ],
      "#3a8a4a",
    );
    [-7, 7].forEach((e) => dot(e, -22, 3.5, "#9affc0"));
    poly(
      [
        [-40, -2],
        [-28, -2],
        [-28, 30],
        [-40, 30],
      ],
      "#7a7390",
      "#3a3450",
    );
    poly(
      [
        [28, -2],
        [40, -2],
        [40, 30],
        [28, 30],
      ],
      "#7a7390",
      "#3a3450",
    );
  } else if (k === "wolf") {
    glow(40, "rgba(200,240,255,.8)", "rgba(90,180,255,0)");
    poly(
      [
        [-30, -34],
        [-14, -10],
        [14, -10],
        [30, -34],
        [24, 6],
        [10, 30],
        [-10, 30],
        [-24, 6],
      ],
      "#cfe4f2",
      "#4a7aa0",
    );
    poly(
      [
        [-8, 18],
        [8, 18],
        [0, 32],
      ],
      "#1a2a3a",
    );
    [-11, 11].forEach((e) => dot(e, 4, 4, "#9fe8ff"));
  } else if (k === "drake") {
    glow(38, "rgba(255,210,140,.8)", "rgba(255,100,30,0)");
    poly(
      [
        [-6, 0],
        [-54, -36],
        [-30, 6],
      ],
      "#ffb070",
      "#8a3a10",
      2,
    );
    poly(
      [
        [6, 0],
        [54, -36],
        [30, 6],
      ],
      "#ffb070",
      "#8a3a10",
      2,
    );
    x.fillStyle = "#e0702a";
    x.strokeStyle = "#5a2008";
    x.lineWidth = 3;
    x.beginPath();
    x.ellipse(0, 8, 16, 26, 0, 0, 7);
    x.fill();
    x.stroke();
    dot(0, -22, 11, "#e0702a");
    [-4, 4].forEach((e) => dot(e, -24, 2.5, "#ffee66"));
  } else if (k === "owl") {
    glow(36, "rgba(255,245,170,.85)", "rgba(255,220,60,0)");
    x.fillStyle = "#8a6a4a";
    x.strokeStyle = "#3a2a1a";
    x.lineWidth = 3;
    x.beginPath();
    x.ellipse(0, 4, 26, 34, 0, 0, 7);
    x.fill();
    x.stroke();
    poly(
      [
        [-22, -24],
        [-14, -44],
        [-6, -28],
      ],
      "#5a3a2a",
    );
    poly(
      [
        [22, -24],
        [14, -44],
        [6, -28],
      ],
      "#5a3a2a",
    );
    [-11, 11].forEach((e) => {
      dot(e, -8, 10, "#ffe066");
      dot(e, -8, 4, "#111");
    });
    poly(
      [
        [-4, 4],
        [4, 4],
        [0, 12],
      ],
      "#d9a441",
    );
  }
  if (CARTX[k]) CARTX[k](x, { glow, poly, dot });
  return c;
}
// ---- v14 unique card art for the cards that used to borrow (and recolour) an older card's picture ----
// each draws on a 128px canvas with the origin in the middle, over the burst / rune circle / halo cardArt0 already laid
const CARTX = (() => {
  const ln = (x, pts, c, w) => {
      x.strokeStyle = c;
      x.lineWidth = w;
      x.beginPath();
      pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
      x.stroke();
    },
    fs = (x, f, s, w) => {
      if (f) {
        x.fillStyle = f;
        x.fill();
      }
      if (s) {
        x.strokeStyle = s;
        x.lineWidth = w || 3;
        x.stroke();
      }
    },
    // a flame / teardrop: base at (cx, cy), tip h above it
    flame = (x, cx, cy, w, h, f, s, lw) => {
      x.beginPath();
      x.moveTo(cx, cy - h);
      x.quadraticCurveTo(cx + w, cy - h * 0.35, cx + w * 0.7, cy - w * 0.2);
      x.quadraticCurveTo(cx, cy + w * 0.8, cx - w * 0.7, cy - w * 0.2);
      x.quadraticCurveTo(cx - w, cy - h * 0.35, cx, cy - h);
      fs(x, f, s, lw);
    },
    star = (x, cx, cy, ro, ri, n, f, s, w) => {
      x.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const r = i % 2 ? ri : ro,
          a = (i * Math.PI) / n - Math.PI / 2;
        x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      x.closePath();
      fs(x, f, s, w);
    },
    ell = (x, cx, cy, rx, ry, rot, f, s, w) => {
      x.beginPath();
      x.ellipse(cx, cy, rx, ry, rot || 0, 0, 7);
      fs(x, f, s, w);
    },
    flake = (x, cx, cy, r, c) => {
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        ln(
          x,
          [
            [cx - Math.cos(a) * r, cy - Math.sin(a) * r],
            [cx + Math.cos(a) * r, cy + Math.sin(a) * r],
          ],
          c,
          2,
        );
      }
    },
    shieldP = (x, s) => {
      x.beginPath();
      x.moveTo(0, -44 * s);
      x.quadraticCurveTo(28 * s, -42 * s, 36 * s, -30 * s);
      x.lineTo(30 * s, 8 * s);
      x.quadraticCurveTo(18 * s, 34 * s, 0, 48 * s);
      x.quadraticCurveTo(-18 * s, 34 * s, -30 * s, 8 * s);
      x.lineTo(-36 * s, -30 * s);
      x.quadraticCurveTo(-28 * s, -42 * s, 0, -44 * s);
    },
    ghost = (x, sx, sy, f, s) => {
      x.save();
      x.scale(sx, sy);
      x.beginPath();
      x.arc(0, -12, 24, Math.PI, 0);
      x.lineTo(24, 30);
      for (let i = 0; i < 4; i++) x.quadraticCurveTo(18 - i * 12, 40 - (i % 2) * 14, 12 - i * 12, 30);
      x.lineTo(-24, 30);
      x.closePath();
      x.restore();
      fs(x, f, s, 3);
    };
  return {
    // ---- Pyre ----
    phoenix: (x, h) => {
      h.glow(50, "rgba(255,220,140,.9)", "rgba(255,80,0,0)");
      [-1, 1].forEach((s) => {
        for (let i = 4; i >= 0; i--)
          h.poly(
            [
              [s * 6, -6 + i * 2],
              [s * (22 + i * 8), -46 + i * 13],
              [s * (12 + i * 5), 4 + i * 2],
            ],
            ["#ff4a10", "#ff8a2a", "#ffb050", "#ffd27a", "#fff0b0"][i],
            "#7a2008",
            2,
          );
      });
      x.save();
      x.translate(0, 18);
      x.rotate(Math.PI);
      flame(x, -9, 0, 6, 30, "#ff6a1a", "#7a2008", 2);
      flame(x, 9, 0, 6, 30, "#ff6a1a", "#7a2008", 2);
      flame(x, 0, 0, 8, 40, "#ffb040", "#7a2008", 2);
      x.restore();
      ell(x, 0, 2, 10, 20, 0, "#ff7a2a", "#7a2008", 3);
      flame(x, 0, -28, 6, 20, "#ffe9a0", "#c85a10", 2);
      h.dot(0, -22, 8, "#ffb050");
      h.poly(
        [
          [4, -24],
          [14, -20],
          [4, -17],
        ],
        "#ffe066",
      );
      h.dot(2, -24, 2, "#fff");
    },
    inferno: (x, h) => {
      h.glow(54, "rgba(255,190,90,.85)", "rgba(255,60,0,0)");
      for (let i = 0; i < 10; i++) {
        x.save();
        x.rotate(i * 0.628);
        flame(x, 0, -18, 10, 30 + (i % 2) * 14, i % 2 ? "#ff5a1a" : "#ffa040", "#7a2008", 2);
        x.restore();
      }
      h.glow(26, "rgba(255,255,230,1)", "rgba(255,200,80,0)");
      h.dot(0, 0, 9, "#fff4c0");
    },
    sunbrand: (x, h) => {
      h.glow(56, "rgba(255,240,180,.95)", "rgba(255,170,40,0)");
      x.save();
      for (let i = 0; i < 16; i++) {
        x.rotate(Math.PI / 8);
        h.poly(
          [
            [-3, -28],
            [0, i % 2 ? -46 : -58],
            [3, -28],
          ],
          "#ffe9a0",
        );
      }
      x.restore();
      h.dot(0, -4, 25, "#ffd27a");
      ell(x, 0, -4, 25, 25, 0, null, "#fff6c8", 3);
      h.poly(
        [
          [-6, -30],
          [6, -30],
          [4, 40],
          [0, 56],
          [-4, 40],
        ],
        "#fffbe0",
        "#b07a20",
        3,
      );
      ln(
        x,
        [
          [0, -26],
          [0, 44],
        ],
        "#ffd27a",
        2,
      );
      x.fillStyle = "#d9a441";
      x.fillRect(-20, -37, 40, 7);
      x.fillStyle = "#7a3a14";
      x.fillRect(-3, -54, 6, 17);
      h.dot(0, -56, 5, "#ff7a2a");
    },
    // ---- Rimeward ----
    shard: (x, h) => {
      h.glow(34, "rgba(220,248,255,.9)", "rgba(90,190,255,0)");
      [-0.55, 0, 0.55].forEach((a, i) => {
        x.save();
        x.rotate(a + 0.6);
        h.poly(
          [
            [0, -54 + (i === 1 ? -4 : 6)],
            [8, -26],
            [0, -8],
            [-8, -26],
          ],
          "#dff8ff",
          "#4ab0e0",
          3,
        );
        ln(
          x,
          [
            [0, -48],
            [0, -12],
          ],
          "#fff",
          1.5,
        );
        x.restore();
      });
      [
        [-34, 30],
        [30, 36],
        [40, -10],
      ].forEach(([a, b]) => flake(x, a, b, 5, "#eafcff"));
    },
    titan: (x, h) => {
      h.glow(46, "rgba(200,240,255,.7)", "rgba(60,140,230,0)");
      [-1, 1].forEach((s) =>
        h.poly(
          [
            [s * 30, -6],
            [s * 46, -2],
            [s * 48, 30],
            [s * 32, 34],
          ],
          "#5a9ad8",
          "#1a3a6a",
        ),
      );
      h.poly(
        [
          [-30, -8],
          [30, -8],
          [26, 42],
          [-26, 42],
        ],
        "#6fb8f0",
        "#1a3a6a",
      );
      h.poly(
        [
          [-15, -36],
          [15, -36],
          [17, -8],
          [-17, -8],
        ],
        "#9fd8ff",
        "#1a3a6a",
      );
      [
        [-12, -52, -6],
        [0, -60, 0],
        [12, -52, 6],
      ].forEach(([a, b, c]) =>
        h.poly(
          [
            [c - 6, -36],
            [a, b],
            [c + 6, -36],
          ],
          "#eafcff",
          "#4a9ad8",
          2,
        ),
      );
      [-6, 6].forEach((e) => {
        h.dot(e, -22, 5, "rgba(200,250,255,.6)");
        h.dot(e, -22, 2.5, "#fff");
      });
      h.poly(
        [
          [-30, -8],
          [-20, -18],
          [-12, -8],
        ],
        "#dff8ff",
      );
      h.poly(
        [
          [30, -8],
          [20, -18],
          [12, -8],
        ],
        "#dff8ff",
      );
      ln(
        x,
        [
          [-14, 6],
          [-4, 18],
          [-10, 30],
        ],
        "#dff8ff",
        2,
      );
    },
    blizzard: (x, h) => {
      h.glow(52, "rgba(240,252,255,.8)", "rgba(150,210,255,0)");
      for (let j = 0; j < 3; j++) {
        const pts = [];
        for (let t = 0; t < 40; t++) {
          const r = 4 + t * 1.35,
            a = t * 0.24 + j * 2.094;
          pts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        ln(x, pts, "rgba(235,250,255,.9)", 5 - j);
      }
      [
        [-40, -34, 7],
        [36, -40, 6],
        [44, 26, 8],
        [-30, 40, 6],
        [6, 50, 5],
        [-52, 4, 5],
      ].forEach(([a, b, r]) => flake(x, a, b, r, "#fff"));
    },
    zero: (x, h) => {
      h.glow(54, "rgba(200,240,255,.9)", "rgba(60,170,255,0)");
      const hx = [0, 1, 2, 3, 4, 5].map((i) => [Math.cos(i * 1.047 + 0.52) * 42, Math.sin(i * 1.047 + 0.52) * 42]);
      h.poly(hx, "rgba(205,240,255,.9)", "#3a90d0", 4);
      hx.forEach((p) => ln(x, [[0, 0], p], "rgba(255,255,255,.55)", 1.5));
      x.save();
      for (let i = 0; i < 6; i++) {
        x.rotate(Math.PI / 3);
        ln(
          x,
          [
            [0, 0],
            [0, -26],
          ],
          "#2a7ab8",
          4,
        );
        ln(
          x,
          [
            [-8, -22],
            [0, -14],
            [8, -22],
          ],
          "#2a7ab8",
          3,
        );
      }
      x.restore();
      h.dot(0, 0, 6, "#eafcff");
      ln(
        x,
        [
          [18, -36],
          [10, -20],
          [22, -10],
        ],
        "#fff",
        2,
      );
    },
    // ---- Gale ----
    thunder: (x, h) => {
      h.glow(46, "rgba(255,250,200,.85)", "rgba(255,220,60,0)");
      [52, 40].forEach((r) => {
        x.strokeStyle = "rgba(255,240,160,.8)";
        x.lineWidth = 3;
        x.beginPath();
        x.arc(0, 8, r, -0.5, 0.5);
        x.stroke();
        x.beginPath();
        x.arc(0, 8, r, Math.PI - 0.5, Math.PI + 0.5);
        x.stroke();
      });
      h.poly(
        [
          [4, -16],
          [-12, 12],
          [0, 12],
          [-8, 50],
          [18, 4],
          [5, 4],
          [14, -16],
        ],
        "#fffbe0",
        "#e0a800",
        3,
      );
      [
        [-18, -28, 15],
        [4, -34, 19],
        [24, -26, 13],
        [-4, -22, 14],
      ].forEach(([a, b, r]) => h.dot(a, b, r, "#5a5470"));
      [
        [-14, -32, 8],
        [6, -40, 9],
      ].forEach(([a, b, r]) => h.dot(a, b, r, "#7a7490"));
    },
    roc: (x, h) => {
      h.glow(46, "rgba(255,240,170,.85)", "rgba(255,200,40,0)");
      [-1, 1].forEach((s) =>
        h.poly(
          [
            [s * 6, -8],
            [s * 60, -34],
            [s * 52, -20],
            [s * 60, -12],
            [s * 44, -6],
            [s * 50, 4],
            [s * 18, 8],
          ],
          "#c8a040",
          "#5a3a10",
          2,
        ),
      );
      h.poly(
        [
          [-8, 20],
          [8, 20],
          [16, 42],
          [-16, 42],
        ],
        "#a8802a",
        "#5a3a10",
        2,
      );
      ell(x, 0, 2, 12, 22, 0, "#e8c060", "#5a3a10", 3);
      h.dot(0, -22, 9, "#f0d080");
      h.poly(
        [
          [-2, -20],
          [12, -15],
          [-1, -13],
        ],
        "#ffd23a",
        "#5a3a10",
        1.5,
      );
      h.dot(-3, -24, 2.2, "#111");
      ln(
        x,
        [
          [-4, 24],
          [-12, 36],
          [-4, 36],
          [-10, 52],
        ],
        "#fff06a",
        3,
      );
      ln(
        x,
        [
          [6, 24],
          [12, 34],
          [6, 36],
          [12, 48],
        ],
        "#fff06a",
        2.5,
      );
    },
    tempest: (x, h) => {
      h.glow(52, "rgba(230,240,255,.7)", "rgba(160,190,255,0)");
      for (let i = 0; i < 8; i++)
        ell(x, (i % 2 ? 4 : -4) + i * 1.5, -44 + i * 12, 44 - i * 5, 6, 0, null, "rgba(225,235,255,.85)", 4 - i * 0.3);
      ln(
        x,
        [
          [-46, -20],
          [-36, -4],
          [-44, 2],
          [-32, 22],
        ],
        "#fff06a",
        3,
      );
      ln(
        x,
        [
          [44, -30],
          [36, -12],
          [46, -8],
          [34, 14],
        ],
        "#fff06a",
        3,
      );
      [
        [-20, 44],
        [24, 40],
        [0, 54],
      ].forEach(([a, b]) => h.dot(a, b, 3, "#fff"));
    },
    skyfall: (x, h) => {
      const q = x.createLinearGradient(0, -50, 0, 44);
      q.addColorStop(0, "rgba(255,255,255,.2)");
      q.addColorStop(1, "rgba(255,250,200,1)");
      x.fillStyle = q;
      x.fillRect(-14, -46, 28, 90);
      x.fillStyle = "#fff";
      x.fillRect(-4, -46, 8, 90);
      [
        [-28, -48, 18],
        [0, -54, 22],
        [28, -48, 18],
      ].forEach(([a, b, r]) => h.dot(a, b, r, "#3a3460"));
      ell(x, 0, 46, 44, 10, 0, "rgba(255,240,140,.85)", "#fff", 2);
      x.save();
      x.translate(0, 44);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + 0.3 + i * 0.42;
        ln(
          x,
          [
            [Math.cos(a) * 18, Math.sin(a) * 8],
            [Math.cos(a) * 48, Math.sin(a) * 26],
          ],
          "#fff06a",
          3,
        );
      }
      x.restore();
    },
    // ---- Verdant ----
    thorn: (x, h) => {
      h.glow(40, "rgba(210,255,200,.85)", "rgba(80,220,100,0)");
      x.save();
      x.rotate(0.7);
      x.beginPath();
      x.moveTo(0, -56);
      x.quadraticCurveTo(12, -10, 9, 30);
      x.lineTo(-9, 30);
      x.quadraticCurveTo(-7, -10, 0, -56);
      fs(x, "#8ad860", "#2a5a1a", 3);
      ln(
        x,
        [
          [0, -48],
          [1, 24],
        ],
        "#d8ffb0",
        2,
      );
      [-1, 1].forEach((s) =>
        [0, 18].forEach((y) =>
          h.poly(
            [
              [s * 6, y - 14],
              [s * 18, y - 22],
              [s * 7, y - 4],
            ],
            "#6ab840",
            "#2a5a1a",
            1.5,
          ),
        ),
      );
      ell(x, 12, 36, 12, 5, 0.6, "#5ad87a", "#1a5a2a", 2);
      ell(x, -12, 38, 10, 4, -0.6, "#5ad87a", "#1a5a2a", 2);
      x.restore();
    },
    briar: (x, h) => {
      h.glow(46, "rgba(200,255,200,.7)", "rgba(60,200,90,0)");
      x.beginPath();
      x.moveTo(-44, 46);
      x.bezierCurveTo(-60, -10, 40, 30, 20, -20);
      x.bezierCurveTo(10, -44, 40, -56, 46, -40);
      x.strokeStyle = "#2a6a2a";
      x.lineWidth = 9;
      x.stroke();
      x.strokeStyle = "#7ad87a";
      x.lineWidth = 3;
      x.stroke();
      [
        [-40, 20, 2.6],
        [-26, 6, 2.2],
        [0, 12, 1.2],
        [22, -2, 0.4],
        [18, -32, 2.8],
        [34, -48, 1.6],
      ].forEach(([a, b, r]) => {
        x.save();
        x.translate(a, b);
        x.rotate(r);
        h.poly(
          [
            [-4, 0],
            [0, -12],
            [4, 0],
          ],
          "#e8ffd0",
          "#2a5a1a",
          1.5,
        );
        x.restore();
      });
      ell(x, -10, 24, 10, 5, 0.5, "#5ad87a", "#1a5a2a", 2);
      ell(x, 30, 10, 9, 4, -0.8, "#5ad87a", "#1a5a2a", 2);
      h.dot(46, -40, 7, "#ff7a9a");
      h.dot(46, -40, 3, "#ffd0dc");
    },
    bloom: (x, h) => {
      h.glow(54, "rgba(220,255,225,.9)", "rgba(80,255,140,0)");
      x.save();
      for (let i = 0; i < 12; i++) {
        x.rotate(Math.PI / 6);
        ln(
          x,
          [
            [0, -34],
            [0, -58],
          ],
          "rgba(220,255,200,.7)",
          2,
        );
      }
      for (let i = 0; i < 8; i++) {
        x.rotate(Math.PI / 4);
        ell(x, 0, -22, 11, 22, 0, i % 2 ? "#c8ffd4" : "#9af0b0", "#2a8a4a", 2);
      }
      x.restore();
      h.dot(0, 0, 13, "#ffe9a0");
      [0, 1, 2, 3, 4, 5].forEach((i) => h.dot(Math.cos(i) * 7, Math.sin(i) * 7, 2, "#c8a020"));
    },
    // ---- Wispcaller ----
    shade: (x, h) => {
      h.glow(44, "rgba(240,225,255,.85)", "rgba(150,90,255,0)");
      [
        [-30, 30, 6],
        [-42, 40, 4],
        [-52, 48, 3],
      ].forEach(([a, b, r]) => h.dot(a, b, r, "rgba(210,180,255,.7)"));
      x.save();
      x.rotate(0.6);
      flame(x, 0, 30, 24, 76, "#c9a0ff", "#5a2aa8", 3);
      flame(x, 0, 24, 13, 44, "#f0e4ff");
      [-6, 6].forEach((e) => ell(x, e, 8, 3.5, 6, 0, "#2a0a4a"));
      x.restore();
    },
    haunt: (x, h) => {
      h.glow(50, "rgba(225,205,255,.8)", "rgba(130,70,230,0)");
      [-1, 1].forEach((s) => ell(x, s * 30, 4, 16, 6, s * -0.5, "rgba(220,200,255,.85)", "#6a3ac8", 2));
      ghost(x, 1, 1, "rgba(232,218,255,.95)", "#6a3ac8");
      [-9, 9].forEach((e) => ell(x, e, -12, 5, 8, 0, "#2a0a4a"));
      ell(x, 0, 6, 5, 7, 0, "#2a0a4a");
      [
        [-40, -36],
        [40, -30],
        [34, 40],
      ].forEach(([a, b]) => h.dot(a, b, 3, "#e8dcff"));
    },
    wail: (x, h) => {
      h.glow(54, "rgba(225,205,255,.75)", "rgba(130,70,230,0)");
      [40, 50, 60].forEach((r, i) => {
        x.strokeStyle = "rgba(220,190,255," + (0.9 - i * 0.25) + ")";
        x.lineWidth = 4 - i;
        x.beginPath();
        x.arc(0, 0, r, -0.6, 0.6);
        x.stroke();
        x.beginPath();
        x.arc(0, 0, r, Math.PI - 0.6, Math.PI + 0.6);
        x.stroke();
      });
      ghost(x, 0.95, 1.15, "rgba(232,218,255,.95)", "#6a3ac8");
      [-9, 9].forEach((e) => ell(x, e, -18, 4, 7, e > 0 ? -0.3 : 0.3, "#2a0a4a"));
      ell(x, 0, 8, 8, 15, 0, "#2a0a4a");
    },
    // ---- role cards (they take your school's element, so their art stays gold / neutral) ----
    pierce: (x, h) => {
      h.glow(40, "rgba(255,245,220,.8)", "rgba(255,180,90,0)");
      x.strokeStyle = "#a89070";
      x.lineWidth = 7;
      x.beginPath();
      x.arc(0, 0, 28, 0.5, Math.PI * 2 - 0.3);
      x.stroke();
      x.save();
      x.rotate(0.75);
      h.poly(
        [
          [-4, 60],
          [4, 60],
          [3, -46],
          [0, -62],
          [-3, -46],
        ],
        "#fff4e0",
        "#e08a3a",
        2,
      );
      x.restore();
      [
        [18, -18],
        [-20, 22],
      ].forEach(([a, b]) => {
        h.dot(a, b, 9, "rgba(255,230,170,.7)");
        h.dot(a, b, 4, "#fff");
      });
      ln(
        x,
        [
          [26, -4],
          [34, 2],
          [30, 10],
        ],
        "#fff",
        2,
      );
    },
    focus: (x, h) => {
      h.glow(46, "rgba(255,235,170,.7)", "rgba(255,190,80,0)");
      ell(x, 0, 0, 36, 36, 0, null, "#ffd27a", 4);
      ell(x, 0, 0, 16, 16, 0, null, "#ffe9a0", 3);
      [
        [0, -54, 0, -24],
        [0, 24, 0, 54],
        [-54, 0, -24, 0],
        [24, 0, 54, 0],
      ].forEach(([a, b, c, d]) =>
        ln(
          x,
          [
            [a, b],
            [c, d],
          ],
          "#ffd27a",
          4,
        ),
      );
      h.dot(0, 0, 6, "#ff5a3a");
      h.dot(0, 0, 2.5, "#fff");
    },
    execute: (x, h) => {
      h.glow(50, "rgba(255,235,200,.85)", "rgba(255,120,60,0)");
      x.save();
      x.translate(0, 38);
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + 0.15 + i * 0.35;
        ln(
          x,
          [
            [Math.cos(a) * 14, Math.sin(a) * 6],
            [Math.cos(a) * 46, Math.sin(a) * 22],
          ],
          "#ffd27a",
          2.5,
        );
      }
      x.restore();
      h.poly(
        [
          [-22, 38],
          [-4, 30],
          [-8, 52],
          [-26, 50],
        ],
        "#8a7a9a",
        "#3a2a4a",
        2,
      );
      h.poly(
        [
          [22, 38],
          [4, 30],
          [8, 52],
          [26, 50],
        ],
        "#8a7a9a",
        "#3a2a4a",
        2,
      );
      h.poly(
        [
          [-11, -40],
          [11, -40],
          [13, 10],
          [0, 32],
          [-13, 10],
        ],
        "#fff0d0",
        "#a05a20",
        3,
      );
      ln(
        x,
        [
          [0, -36],
          [0, 22],
        ],
        "#ffb050",
        2.5,
      );
      x.fillStyle = "#d9a441";
      x.fillRect(-24, -46, 48, 7);
      x.fillStyle = "#5a2e14";
      x.fillRect(-4, -62, 8, 16);
    },
    scatter: (x, h) => {
      h.glow(40, "rgba(255,230,170,.7)", "rgba(255,170,60,0)");
      for (let i = 0; i < 7; i++) {
        x.save();
        x.translate(0, 40);
        x.rotate(-0.95 + i * 0.317);
        ln(
          x,
          [
            [0, -14],
            [0, -70 + (i % 2) * 10],
          ],
          "#ffe9a0",
          3,
        );
        h.poly(
          [
            [-6, -66 + (i % 2) * 10],
            [0, -82 + (i % 2) * 10],
            [6, -66 + (i % 2) * 10],
          ],
          "#ffd27a",
          "#8a5a10",
          1.5,
        );
        x.restore();
      }
      h.dot(0, 40, 10, "#fff4c0");
    },
    cascade: (x, h) => {
      h.glow(52, "rgba(255,230,170,.6)", "rgba(255,170,60,0)");
      x.strokeStyle = "rgba(255,240,190,.8)";
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(-36, -36);
      x.quadraticCurveTo(-30, -10, -8, -6);
      x.quadraticCurveTo(14, 0, 24, 28);
      x.stroke();
      [
        [-36, -36, 9],
        [-8, -6, 14],
        [24, 28, 21],
      ].forEach(([a, b, r]) => {
        star(x, a, b, r * 1.5, r * 0.6, 8, "#ffd27a", "#a06010", 1.5);
        h.dot(a, b, r * 0.45, "#fff");
      });
    },
    starfall: (x, h) => {
      h.glow(52, "rgba(255,240,200,.6)", "rgba(255,190,90,0)");
      [
        [-28, 20, 1.1],
        [20, 34, 0.8],
        [30, -12, 1],
        [-10, -34, 0.7],
      ].forEach(([a, b, s]) => {
        const q = x.createLinearGradient(a + 40 * s, b - 40 * s, a, b);
        q.addColorStop(0, "rgba(255,220,140,0)");
        q.addColorStop(1, "rgba(255,240,190,.95)");
        x.strokeStyle = q;
        x.lineWidth = 8 * s;
        x.beginPath();
        x.moveTo(a + 40 * s, b - 40 * s);
        x.lineTo(a, b);
        x.stroke();
        star(x, a, b, 12 * s, 5 * s, 5, "#fff4c0", "#c88a20", 1.5);
      });
    },
    renew: (x, h) => {
      h.glow(50, "rgba(220,255,225,.9)", "rgba(80,255,140,0)");
      for (let i = 0; i < 6; i++) {
        const a = i * 1.047,
          px = Math.cos(a) * 42,
          py = Math.sin(a) * 42;
        x.fillStyle = "#eafff0";
        x.fillRect(px - 2, py - 7, 4, 14);
        x.fillRect(px - 7, py - 2, 14, 4);
      }
      x.beginPath();
      x.moveTo(0, 30);
      x.quadraticCurveTo(-4, 4, 2, -14);
      x.strokeStyle = "#2a8a4a";
      x.lineWidth = 5;
      x.stroke();
      ell(x, -14, -10, 15, 7, -0.6, "#7ae890", "#1a6a3a", 2);
      ell(x, 16, -18, 15, 7, 0.6, "#9af0b0", "#1a6a3a", 2);
      ell(x, 0, 32, 18, 5, 0, "#5a3a20");
    },
    sanct: (x, h) => {
      h.glow(54, "rgba(220,255,240,.6)", "rgba(120,255,200,0)");
      x.beginPath();
      x.arc(0, 28, 48, Math.PI, 0);
      x.closePath();
      fs(x, "rgba(190,255,230,.35)", "#bfffe0", 4);
      ln(
        x,
        [
          [-30, -4],
          [-18, -12],
        ],
        "rgba(255,255,255,.8)",
        3,
      );
      [-22, 0, 22].forEach((px, i) => {
        h.dot(px, 6 - (i === 1 ? 4 : 0), 6, "#2a4a3a");
        h.poly(
          [
            [px - 8, 26],
            [px, 10 - (i === 1 ? 4 : 0)],
            [px + 8, 26],
          ],
          "#2a4a3a",
        );
      });
      star(x, 0, -26, 8, 3, 4, "#fff", null);
    },
    rekindle: (x, h) => {
      h.glow(50, "rgba(255,240,190,.9)", "rgba(255,180,60,0)");
      x.fillStyle = "#3a2a18";
      x.fillRect(-20, -30, 40, 6);
      x.fillRect(-16, 34, 32, 6);
      x.strokeStyle = "#3a2a18";
      x.lineWidth = 3;
      x.beginPath();
      x.arc(0, -34, 9, Math.PI, 0);
      x.stroke();
      h.poly(
        [
          [-16, -24],
          [16, -24],
          [14, 34],
          [-14, 34],
        ],
        "rgba(255,233,160,.55)",
        "#8a5a10",
        2,
      );
      flame(x, 0, 24, 9, 34, "#ff9a3a");
      flame(x, 0, 22, 5, 20, "#fff4c0");
      [
        [-30, -40, 3],
        [26, -46, 2.5],
        [34, -20, 2],
        [-34, -12, 2],
      ].forEach(([a, b, r]) => h.dot(a, b, r, "#ffd27a"));
    },
    familiar: (x, h) => {
      h.glow(40, "rgba(255,240,180,.85)", "rgba(255,200,80,0)");
      [-1, 1].forEach((s) => ell(x, s * 22, -6, 8, 16, s * 0.5, "#b8804a", "#4a2a14", 2));
      ell(x, 0, -8, 18, 20, 0, "#d9a060", "#4a2a14", 3);
      ell(x, 0, -2, 11, 12, 0, "#f0dcb0");
      [-1, 1].forEach((s) => {
        h.poly(
          [
            [s * 14, -22],
            [s * 12, -36],
            [s * 5, -26],
          ],
          "#8a5a30",
        );
        h.dot(s * 7, -14, 6, "#ffe066");
        h.dot(s * 7, -14, 2.5, "#111");
      });
      h.poly(
        [
          [-3, -8],
          [3, -8],
          [0, -3],
        ],
        "#d9a441",
      );
      ln(
        x,
        [
          [0, 12],
          [0, 20],
        ],
        "#5a3a10",
        2,
      );
      x.fillStyle = "#ffd27a";
      x.strokeStyle = "#7a5a20";
      x.lineWidth = 2;
      x.fillRect(-8, 20, 16, 18);
      x.strokeRect(-8, 20, 16, 18);
      h.dot(0, 29, 5, "#fff4c0");
    },
    rally: (x, h) => {
      h.glow(48, "rgba(225,200,255,.75)", "rgba(160,100,255,0)");
      ln(
        x,
        [
          [-24, 54],
          [-24, -52],
        ],
        "#7a5a3a",
        5,
      );
      h.dot(-24, -54, 5, "#ffd27a");
      h.poly(
        [
          [-22, -48],
          [36, -40],
          [22, -26],
          [36, -10],
          [-22, -14],
        ],
        "#c38bff",
        "#4a2a7a",
        3,
      );
      star(x, 2, -30, 9, 4, 5, "#ffe9a0", "#7a5a10", 1);
      [
        [44, 10, 54, 6],
        [42, 22, 54, 24],
        [40, 34, 50, 40],
      ].forEach(([a, b, c, d]) =>
        ln(
          x,
          [
            [a, b],
            [c, d],
          ],
          "#e8dcff",
          3,
        ),
      );
    },
    bond: (x, h) => {
      h.glow(50, "rgba(225,200,255,.8)", "rgba(160,100,255,0)");
      ell(x, -14, 6, 22, 22, 0, null, "#c38bff", 7);
      ell(x, 14, 6, 22, 22, 0, null, "#ffd27a", 7);
      x.strokeStyle = "#c38bff";
      x.lineWidth = 7;
      x.beginPath();
      x.arc(-14, 6, 22, -0.6, 0.6);
      x.stroke();
      x.beginPath();
      x.moveTo(0, -30);
      x.bezierCurveTo(-4, -40, -18, -38, -14, -26);
      x.lineTo(0, -14);
      x.lineTo(14, -26);
      x.bezierCurveTo(18, -38, 4, -40, 0, -30);
      fs(x, "#ff8ad0", "#7a1a4a", 2);
    },
    taunt: (x, h) => {
      h.glow(48, "rgba(255,210,180,.7)", "rgba(255,130,80,0)");
      [40, 52].forEach((r) => {
        x.strokeStyle = "rgba(255,170,120,.85)";
        x.lineWidth = 3;
        x.beginPath();
        x.arc(0, 0, r, -0.7, 0.7);
        x.stroke();
        x.beginPath();
        x.arc(0, 0, r, Math.PI - 0.7, Math.PI + 0.7);
        x.stroke();
      });
      shieldP(x, 0.72);
      fs(x, "#6fb8f0", "#ff8a5a", 4);
      x.fillStyle = "#fff4e0";
      x.fillRect(-4, -20, 8, 24);
      h.dot(0, 14, 4.5, "#fff4e0");
    },
    bulwark: (x, h) => {
      h.glow(52, "rgba(200,235,255,.7)", "rgba(90,170,255,0)");
      [
        [-26, -4, 0.62],
        [26, -4, 0.62],
        [0, 6, 0.8],
      ].forEach(([px, py, s]) => {
        x.save();
        x.translate(px, py);
        shieldP(x, s);
        fs(x, "#8fc8f0", "#1a4a7a", 3);
        ln(
          x,
          [
            [0, -30 * s],
            [0, 34 * s],
          ],
          "#eafcff",
          2.5,
        );
        x.restore();
      });
    },
    thorns: (x, h) => {
      h.glow(50, "rgba(200,235,255,.7)", "rgba(90,170,255,0)");
      for (let i = 0; i < 12; i++) {
        x.save();
        x.rotate((i * Math.PI) / 6);
        h.poly(
          [
            [-6, -28],
            [0, -52],
            [6, -28],
          ],
          "#dff8ff",
          "#2a5a8a",
          2,
        );
        x.restore();
      }
      h.dot(0, 0, 32, "#6fa8d8");
      ell(x, 0, 0, 32, 32, 0, null, "#1a4a7a", 4);
      ell(x, 0, 0, 22, 22, 0, null, "#bfe4ff", 2);
      h.dot(0, 0, 9, "#eafcff");
    },
  };
})();
// background burst / circle colour for the cards above
Object.assign(CCOL, {
  thorn: "#8dffa8",
  briar: "#6ae08a",
  bloom: "#b8ffc8",
  shade: "#c9a0ff",
  haunt: "#b48aff",
  wail: "#d0b0ff",
  pierce: "#ffc890",
  focus: "#ffd27a",
  execute: "#ff9a6a",
  scatter: "#ffd27a",
  cascade: "#ffb860",
  starfall: "#ffe0a0",
  renew: "#8dffa8",
  sanct: "#bfffe0",
  rekindle: "#ffe0a0",
  familiar: "#ffd27a",
  rally: "#c38bff",
  bond: "#c38bff",
  taunt: "#ff9a6a",
  bulwark: "#8fc8f0",
  thorns: "#8fc8f0",
});
Object.assign(CTINT, {
  pierce: "rgba(255,120,90,.35)",
  focus: "rgba(255,210,120,.4)",
  execute: "rgba(255,90,60,.4)",
  scatter: "rgba(255,180,60,.35)",
  cascade: "rgba(255,160,40,.35)",
  starfall: "rgba(255,220,140,.35)",
  renew: "rgba(120,255,160,.3)",
  sanct: "rgba(160,255,220,.4)",
  rekindle: "rgba(255,230,160,.4)",
  familiar: "rgba(255,210,120,.35)",
  rally: "rgba(200,150,255,.35)",
  bond: "rgba(190,130,255,.45)",
  taunt: "rgba(140,210,255,.35)",
  bulwark: "rgba(140,200,255,.45)",
  thorns: "rgba(120,180,255,.4)",
  thorn: "rgba(90,230,120,.45)",
  briar: "rgba(70,200,100,.5)",
  bloom: "rgba(140,255,170,.4)",
  shade: "rgba(180,120,255,.5)",
  haunt: "rgba(150,90,240,.45)",
  wail: "rgba(190,140,255,.5)",
});
Object.keys(SPL).forEach((k) => (ART[k] = cardArt(k).toDataURL()));
// ground sigil + floating name/HP tag over every ally and foe so the field reads at a glance
function deco(e, col, rk) {
  if (rk) {
    const sg = new T.Mesh(
      new T.PlaneGeometry(2, 2),
      new T.MeshBasicMaterial({
        map: RUNE[rk],
        transparent: true,
        opacity: 0.85,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    sg.rotation.x = -Math.PI / 2;
    BG.add(sg);
    e.sig = sg;
  }
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const tx = new T.CanvasTexture(c),
    tg = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false }));
  tg.scale.set(2.6, 0.65, 1);
  tg.renderOrder = 5;
  BG.add(tg);
  Object.assign(e, { tag: tg, tc: c, tt: tx, col, lk: null });
  tagUpd(e);
}
// tags are tinted by side (teal = your team, crimson = foes) and carry the slot number that matches the glowing pad underfoot
function tagUpd(e) {
  const k = e.hp + "|" + e.sel + "|" + (e.itx || "") + "|" + e.slot;
  if (e.lk === k) return;
  e.lk = k;
  const x = e.tc.getContext("2d"),
    c = e.sel ? "#ffd34d" : e.col;
  x.clearRect(0, 0, 256, 64);
  x.fillStyle = e.foe ? "rgba(58,10,16,.86)" : "rgba(8,36,50,.86)";
  x.beginPath();
  x.moveTo(14, 6);
  x.arcTo(250, 6, 250, 58, 12);
  x.arcTo(250, 58, 6, 58, 12);
  x.arcTo(6, 58, 6, 6, 12);
  x.arcTo(6, 6, 250, 6, 12);
  x.fill();
  x.strokeStyle = c;
  x.lineWidth = e.sel ? 5 : 3;
  x.stroke();
  x.textBaseline = "middle";
  let iw = 0;
  x.fillStyle = e.foe ? "#c8341a" : "#1a8ac0";
  x.beginPath();
  x.arc(30, 32, 17, 0, 7);
  x.fill();
  x.strokeStyle = "rgba(255,255,255,.85)";
  x.lineWidth = 2;
  x.stroke();
  x.fillStyle = "#fff";
  x.font = "900 20px system-ui";
  x.textAlign = "center";
  x.fillText(String(e.slot + 1), 30, 33);
  if (e.itx) {
    x.textAlign = "right";
    x.fillStyle = "#ffb0a0";
    x.font = "800 17px system-ui";
    iw = x.measureText(e.itx).width + 10;
    x.fillText(e.itx, 242, 23);
  }
  // the name shrinks to fit beside the intent text instead of running underneath it
  const nm = (e.sel ? "▶ " : "") + e.label;
  let fs = 20;
  x.font = "800 " + fs + "px system-ui";
  while (x.measureText(nm).width > 192 - iw && fs > 10) {
    fs--;
    x.font = "800 " + fs + "px system-ui";
  }
  x.fillStyle = c;
  x.textAlign = "left";
  x.fillText(nm, 54, 23);
  x.fillStyle = "rgba(0,0,0,.5)";
  x.fillRect(54, 40, 188, 10);
  x.fillStyle = e.foe ? "#ff6a5a" : "#7dff9a";
  x.fillRect(54, 40, (188 * Math.max(0, e.hp)) / e.max, 10);
  e.tt.needsUpdate = true;
}
function undeco(e) {
  [e.sig, e.tag].forEach((o) => {
    if (o) {
      if (o.parent) o.parent.remove(o);
      o.material.dispose();
    }
  });
}
