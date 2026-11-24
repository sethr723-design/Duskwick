// DUSKWICK - 47-schoolgear.js: v33 school gear, neutral gear and zone-themed looks (loads LAST, after 43-gltf).
// Only top-level name: SGR.
// - Every new robe/hat/staff/charm/ring/boots carries it.sc: a school key (pyre/gale/rime/verdant/spirit) or "n".
//   School gear: only that school can wear it (equip wrap); it always has its element, rolls ~12% stronger and adds the
//   school's perk stat. Worn school gear of another school (after a school change at Sage Ilsa) gives no stats (gst wrap).
//   Neutral gear: anyone can wear it; no element, the element stat becomes HP / power / ward. Items from before v33 have
//   no sc and count as neutral. Deck items (30-cards-deck) are left alone.
// - Drops: 35% neutral, 45% your school, 20% another school. Shop stock alternates your school / neutral.
// - 15 zone looks appended to LOOKS (02): one per school per zone (Frostfen, Cinderwaste, Mirewick), spread over
//   robe/hat/staff. Any robe/hat/staff (school or neutral) dropped in a zone may roll one of that zone's looks
//   (it.zl = 1). All are on sale at Pip's mirror like the v13 styles; finding one marks it owned (P.zlook[k+i], made
//   lazily, so restyling to it is free; 07's own() checks it). Starter gear has no style. Built after outline(W), so each
//   group is outlined itself; hats go in WHEAD (y - 2.22), staffs in STF, robes on W.
const SGR = (() => {
  const SCH = ["pyre", "gale", "rime", "verdant", "spirit"],
    PERK = { pyre: "crit", gale: "pow", rime: "def", verdant: "heal", spirit: "hp" },
    PERKV = { crit: 1.5, pow: 3, def: 1.5, heal: 4, hp: 6 },
    LEGS = {
      pyre: " of the Pyre",
      gale: " of the Gale",
      rime: " of the Rime",
      verdant: " of the Grove",
      spirit: " of the Wisps",
    },
    NPRE = ["Sturdy", "Traveller's", "Lamplit", "Steadfast", "Well-worn", "Tinker's", "Honest", "Plain"],
    ZN = { frost: "Frostfen", ember: "Cinderwaste", marsh: "Mirewick" },
    LKK = { robe: "robe", hat: "hat", staff: "wand" },
    ZLC = [0.12, 0.2, 0.32, 0.45, 0.6]; // chance by rarity that gear dropped in a zone comes in a zone look
  const isS = (sc) => !!(sc && sc !== "n" && CL[sc]),
    ok = (it) => !it || !isS(it.sc) || it.sc === P.cls,
    sName = (sc) => (CL[sc] ? CL[sc][1] : "?"),
    sCol = (sc) => "#" + (CL[sc] ? CL[sc][0] : 0xd8d0b8).toString(16).padStart(6, "0");

  // ---------------- zone looks ----------------
  const V3 = (a) => new T.Vector3(a[0], a[1], a[2]),
    Y1 = new T.Vector3(0, 1, 0);
  // a thin rod from a to b
  const rod = (p, c, a, b, r) => {
    const v = V3(b).sub(V3(a)),
      m = mk(Cy(r, r, v.length(), 5), c, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 1);
    m.quaternion.setFromUnitVectors(Y1, v.normalize());
    p.add(m);
    return m;
  };
  const glass = (m, op) => {
    m.material.transparent = true;
    m.material.opacity = op;
    m.material.depthWrite = false;
    m.userData.nol = 1;
    return m;
  };
  const em = (m, h, k) => {
    if (m.material.emissive) m.material.emissive.setHex(h);
    if (k != null) m.material.emissiveIntensity = k;
    return m;
  };
  const cap = (g) => {
    const m = pf(g, new T.SphereGeometry(0.56, 18, 10, 0, TAU, 0, Math.PI / 2), 0, 2.8, 0, 3, 2, "hat");
    m.scale.y = 0.75;
    return m;
  };
  const ZL = [
    // ---- robes ----
    {
      k: "robe",
      z: "frost",
      cl: "pyre",
      n: "Hearthfire coat",
      d: "A Frostfen coat with a thick fur collar and hem, buttoned with live embers.",
      b(g) {
        pm(g, Cy(0.5, 0.72, 1.0, 16), 0x35408f, 0, 1.7, 0, 0, 0, "robe");
        pm(g, Cy(0.72, 0.9, 1.15, 18), 0x35408f, 0, 0.62, 0, 0, 0, "robe");
        pm(g, new T.TorusGeometry(0.5, 0.16, 8, 18), 0xf2ece0, 0, 2.12, 0, Math.PI / 2);
        pm(g, new T.TorusGeometry(0.9, 0.12, 8, 22), 0xf2ece0, 0, 0.08, 0, Math.PI / 2);
        pm(g, B(0.2, 1.95, 0.1), 0xf2ece0, 0, 1.08, 0.76, -0.2);
        pm(g, Cy(0.75, 0.77, 0.16, 18), 0x4a2e1a, 0, 1.24, 0);
        [1.45, 1.75].forEach((y) =>
          [-1, 1].forEach((s) => em(pm(g, Sp(0.06, 8), 0xff6a2a, s * 0.17, y, 0.71 - (y - 1.2) * 0.2), 0xcc3300)),
        );
      },
    },
    {
      k: "robe",
      z: "ember",
      cl: "gale",
      n: "Aurora duster",
      d: "A long split duster from the Cinderwaste, with an ash capelet and a lightning bolt pin.",
      b(g) {
        pm(g, Cy(0.5, 0.7, 1.0, 16), 0x35408f, 0, 1.7, 0, 0, 0, "robe");
        const sk = new T.CylinderGeometry(0.7, 0.95, 1.25, 18, 1, true, 0.4, TAU - 0.8);
        pm(g, sk, 0x35408f, 0, 0.62, 0, 0, 0, "robe").material.side = T.DoubleSide;
        pm(g, Cy(0.58, 0.64, 1.0, 12), 0x3a3440, 0, 0.7, 0);
        pm(g, new T.CylinderGeometry(0.55, 0.98, 0.55, 18), 0x6a6470, 0, 1.95, 0);
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * TAU;
          em(pm(g, new T.OctahedronGeometry(0.05), 0xfff06a, Math.sin(a) * 0.98, 1.67, Math.cos(a) * 0.98), 0x8a7a10);
        }
        pm(g, Cy(0.73, 0.75, 0.14, 18), 0x2a2430, 0, 1.24, 0);
        const bs = new T.Shape();
        [
          [0.05, 0.16],
          [-0.06, 0.0],
          [0.01, 0.0],
          [-0.05, -0.16],
          [0.07, 0.03],
          [0.0, 0.03],
        ].forEach(([x, y], i) => bs[i ? "lineTo" : "moveTo"](x, y));
        const bg = new T.ExtrudeGeometry(bs, { depth: 0.04, bevelEnabled: false });
        em(pm(g, bg, 0xfff06a, -0.24, 1.62, 0.62, -0.2), 0x8a7a10);
      },
    },
    {
      k: "robe",
      z: "marsh",
      cl: "rime",
      n: "Icicle robe",
      d: "A pale Mirewick robe under a veil of cold mist, its hem worn to tatters, a frost lantern at the hip.",
      b(g) {
        pm(g, Cy(0.5, 0.68, 1.0, 16), 0x35408f, 0, 1.7, 0, 0, 0, "robe");
        pm(g, Cy(0.68, 0.86, 1.2, 18), 0x35408f, 0, 0.65, 0, 0, 0, "robe");
        const vl = pm(g, new T.CylinderGeometry(0.72, 0.94, 1.1, 18, 1, true), 0xd8eef8, 0, 0.75, 0);
        vl.material.side = T.DoubleSide;
        glass(vl, 0.4);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU,
            h = 0.28 + ((i * 7) % 5) * 0.05;
          pm(g, B(0.17, h, 0.03), 0xc8dce8, Math.sin(a) * 0.9, 0.2 - h / 2 + 0.12, Math.cos(a) * 0.9, 0, 0, 0, a);
        }
        pm(g, new T.TorusGeometry(0.71, 0.07, 6, 20), 0xbfe6f5, 0, 1.24, 0, Math.PI / 2);
        pm(g, B(0.2, 0.06, 0.2), 0x9ab0c0, 0.72, 1.12, 0.22);
        pg(g, B(0.15, 0.2, 0.15), 0.72, 0.98, 0.22);
        pm(g, Cn(0.12, 0.12, 6), 0x9ab0c0, 0.72, 1.18, 0.22);
      },
    },
    {
      k: "robe",
      z: "marsh",
      cl: "verdant",
      n: "Evergreen cloak",
      d: "Mirewick moss grown thick over the shoulders and hem, with mushrooms and a lily-pad clasp.",
      b(g) {
        pm(g, Cy(0.5, 0.7, 1.0, 16), 0x35408f, 0, 1.7, 0, 0, 0, "robe");
        pm(g, Cy(0.7, 0.88, 1.2, 18), 0x35408f, 0, 0.62, 0, 0, 0, "robe");
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU,
            r = 0.13 + ((i * 5) % 3) * 0.03;
          pm(g, Sp(r, 8), i % 2 ? 0x4a7a2a : 0x3a6a24, Math.sin(a) * 0.56, 2.02, Math.cos(a) * 0.56);
          pm(g, Sp(r * 0.9, 8), i % 2 ? 0x3a6a24 : 0x4a7a2a, Math.sin(a) * 0.88, 0.1, Math.cos(a) * 0.88);
        }
        [
          [0.9, 0.3],
          [2.2, 0.24],
          [4.1, 0.34],
        ].forEach(([a, y]) => {
          const x = Math.sin(a) * 0.86,
            z = Math.cos(a) * 0.86;
          pm(g, Cy(0.03, 0.04, 0.14, 6), 0xe8dcc0, x, y, z);
          pm(g, new T.SphereGeometry(0.09, 10, 6, 0, TAU, 0, Math.PI / 2), 0xd8603a, x, y + 0.06, z);
        });
        pm(g, Cy(0.73, 0.75, 0.14, 18), 0x5a3a20, 0, 1.24, 0);
        pm(g, Cy(0.16, 0.16, 0.03, 14), 0x3aa86b, 0, 1.24, 0.78, Math.PI / 2);
        em(pm(g, Sp(0.06, 8), 0xff9ad0, 0.05, 1.27, 0.81), 0x66223a);
      },
    },
    {
      k: "robe",
      z: "frost",
      cl: "spirit",
      n: "Wraith shroud",
      d: "A flared Frostfen shroud with a ghostly outer layer and frozen runes that drift round you.",
      b(g) {
        pm(g, Cy(0.5, 0.68, 1.0, 16), 0x35408f, 0, 1.7, 0, 0, 0, "robe");
        pm(g, Cy(0.66, 1.0, 1.25, 20), 0x35408f, 0, 0.62, 0, 0, 0, "robe");
        const gh = pm(g, new T.CylinderGeometry(0.56, 1.08, 1.9, 20, 1, true), 0xcfe8ff, 0, 1.05, 0);
        gh.material.side = T.DoubleSide;
        glass(gh, 0.28);
        pm(g, Cy(0.42, 0.55, 0.35, 16), 0xe8f4ff, 0, 2.12, 0);
        pm(g, new T.TorusGeometry(1.0, 0.05, 6, 24), 0xe8f4ff, 0, 0.04, 0, Math.PI / 2);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + 0.3;
          pg(g, new T.OctahedronGeometry(0.07), Math.sin(a) * 1.15, 0.55 + i * 0.22, Math.cos(a) * 1.15);
        }
      },
    },
    // ---- hats (built at head height, then shifted into WHEAD) ----
    {
      k: "hat",
      z: "ember",
      cl: "pyre",
      n: "Hearthfire crown",
      d: "An iron Cinderwaste crown with ember-tipped horns and a coal set in the brow.",
      b(g) {
        cap(g);
        pm(g, Cy(0.58, 0.6, 0.22, 18), 0x3a3a40, 0, 2.9, 0);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          pm(g, Sp(0.035, 6), 0xb0b0b8, Math.sin(a) * 0.6, 2.9, Math.cos(a) * 0.6);
          if (i % 2) pm(g, Cn(0.05, 0.18, 6), 0x4a4a52, Math.sin(a) * 0.56, 3.08, Math.cos(a) * 0.56);
        }
        [-1, 1].forEach((s) => {
          pm(g, Cn(0.1, 0.5, 8), 0x2a2226, s * 0.45, 3.18, 0, 0, -s * 0.55);
          em(pm(g, Sp(0.05, 6), 0xff7a3d, s * 0.58, 3.4, 0), 0xff5a1a, 0.8);
        });
        pg(g, new T.OctahedronGeometry(0.13), 0, 2.93, 0.62);
      },
    },
    {
      k: "hat",
      z: "marsh",
      cl: "gale",
      n: "Aurora hat",
      d: "A floppy Mirewick hat with tiny lanternflies buzzing on wires round the crown.",
      b(g) {
        const br = pf(g, new T.CylinderGeometry(1.22, 1.25, 0.06, 30), 0, 2.86, 0, 4, 4, "hat");
        br.rotation.set(0.06, 0, -0.05);
        pf(g, Cy(0.48, 0.6, 0.6, 18), 0, 3.17, 0, 3, 1, "hat");
        pf(g, Sp(0.5, 16), 0.04, 3.45, 0, 2, 1, "hat").scale.set(1, 0.35, 1);
        pm(g, Cy(0.61, 0.61, 0.12, 18), 0x3a5a3a, 0, 2.95, 0);
        [0.6, 2.0, 3.5, 5.0].forEach((a, i) => {
          const s = Math.sin(a),
            c = Math.cos(a),
            tip = [s * 0.95, 3.5 + (i % 2) * 0.15, c * 0.95];
          rod(g, 0x2a2a20, [s * 0.6, 3.0, c * 0.6], tip, 0.012);
          pg(g, Sp(0.065, 8), tip[0], tip[1], tip[2]);
        });
        pm(g, Cn(0.03, 0.5, 5), 0x6a8a3a, -0.5, 3.2, 0.2, 0, 0.3);
        pm(g, Cn(0.03, 0.4, 5), 0x6a8a3a, -0.55, 3.15, 0.05, 0, 0.45);
      },
    },
    {
      k: "hat",
      z: "frost",
      cl: "rime",
      n: "Icicle crown",
      d: "A ring of Frostfen icicles that never melt, over a soft cap, with a frozen gem at the brow.",
      b(g) {
        cap(g);
        pm(g, new T.TorusGeometry(0.6, 0.06, 6, 22), 0xdff4ff, 0, 2.95, 0, Math.PI / 2);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU,
            h = i === 0 ? 0.7 : 0.35 + ((i * 4) % 5) * 0.06,
            ic = pm(g, Cn(0.07, h, 6), 0xbfe8ff, Math.sin(a) * 0.62, 2.98 + h / 2, Math.cos(a) * 0.62);
          ic.rotation.set(Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15);
          em(ic, 0x3a7aa0, 0.5);
          ic.material.transparent = true;
          ic.material.opacity = 0.88;
        }
        pg(g, new T.OctahedronGeometry(0.1), 0, 2.98, 0.64);
      },
    },
    {
      k: "hat",
      z: "ember",
      cl: "verdant",
      n: "Evergreen circlet",
      d: "A wreath of Cinderwaste twigs, still glowing at the cracks, with one stubborn flower in bloom.",
      b(g) {
        pm(g, new T.TorusGeometry(0.6, 0.075, 6, 22), 0x2a1e18, 0, 2.92, 0, Math.PI / 2);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU;
          rod(
            g,
            0x3a2a20,
            [Math.sin(a) * 0.6, 2.93, Math.cos(a) * 0.6],
            [Math.sin(a + 0.25) * 0.72, 3.2, Math.cos(a + 0.25) * 0.72],
            0.025,
          );
          if (i % 2) em(pm(g, Sp(0.03, 6), 0xff7a3d, Math.sin(a) * 0.62, 2.96, Math.cos(a) * 0.62), 0xff5a1a, 0.8);
        }
        const fx = 0.32,
          fy = 3.08,
          fz = 0.52;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU,
            pt = pm(g, Sp(0.08, 8), 0xffe0f0, fx + Math.sin(a) * 0.09, fy + Math.cos(a) * 0.09, fz);
          pt.scale.set(1, 1, 0.35);
        }
        pg(g, Sp(0.055, 8), fx, fy, fz + 0.03);
        [-0.6, 0.6].forEach((r) => {
          const lf = pm(g, Sp(0.08, 8), 0x5ad87a, fx + r * 0.25, fy - 0.12, fz - 0.02, 0, r);
          lf.scale.set(0.5, 1.2, 0.2);
        });
      },
    },
    {
      k: "hat",
      z: "marsh",
      cl: "spirit",
      n: "Wraith cowl",
      d: "A sodden Mirewick hood with weed in its folds and a tarnished bell that rings for the lost.",
      b(g) {
        pf(
          g,
          new T.SphereGeometry(0.56, 20, 12, Math.PI / 2 + 1.0, TAU - 2.0, 0, Math.PI * 0.64),
          0,
          2.56,
          -0.03,
          3,
          2,
          "hat",
          1,
        );
        const pt = new T.ConeGeometry(0.26, 1.1, 12);
        pt.translate(0, 0.55, 0);
        pf(g, pt, 0, 2.9, -0.32, 2, 1, "hat").rotation.x = -1.45;
        pf(g, Cy(0.62, 0.88, 0.3, 18), 0, 2.12, -0.02, 3, 1, "hat");
        pm(g, Cy(0.05, 0.12, 0.16, 10), 0x8a9a7a, 0, 2.94, -1.38);
        pg(g, Sp(0.045, 8), 0, 2.84, -1.38);
        [-0.5, 0.5, 0].forEach((x, i) =>
          pm(g, B(0.03, 0.45, 0.02), 0x3a5a3a, x, 2.3 - (i === 2 ? 0.1 : 0), i === 2 ? -0.58 : 0.25),
        );
        pm(g, Sp(0.08, 8), 0x8a9a7a, 0, 2.15, 0.82);
      },
    },
    // ---- staffs (STF space; o = where the lantern glow sits) ----
    {
      k: "wand",
      z: "marsh",
      cl: "pyre",
      n: "Hearthfire torch",
      o: [0, LY, 0],
      d: "A reed-bound Mirewick torch, its marsh-flame kept in an iron cage.",
      b(g) {
        pm(g, Cy(0.05, 0.065, 2.6, 8), 0x4a3a24, 0, 0.75, 0);
        [0.3, 0.9, 1.5, 1.9].forEach((y) =>
          pm(g, new T.TorusGeometry(0.068, 0.02, 5, 10), 0x8a8a4a, 0, y, 0, Math.PI / 2),
        );
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU;
          pm(g, B(0.03, 0.5, 0.03), 0x2a2a2e, Math.sin(a) * 0.15, LY, Math.cos(a) * 0.15);
        }
        [-0.25, 0.25].forEach((d) =>
          pm(g, new T.TorusGeometry(0.15, 0.025, 5, 14), 0x2a2a2e, 0, LY + d, 0, Math.PI / 2),
        );
        pg(g, Sp(0.11, 10), 0, LY - 0.04, 0);
        pg(g, Cn(0.08, 0.26, 8), 0, LY + 0.12, 0);
      },
    },
    {
      k: "wand",
      z: "frost",
      cl: "gale",
      n: "Aurora rod",
      o: [0, LY, 0],
      d: "A silver Frostfen rod wrapped in three ribbons of northern light.",
      b(g) {
        pm(g, Cy(0.04, 0.05, 2.4, 8), 0xdfe6f0, 0, 0.7, 0);
        pm(g, Cy(0.07, 0.07, 0.3, 8), 0x2a3a5a, 0, 0, 0);
        pm(g, Cn(0.09, 0.2, 8), 0xdfe6f0, 0, 2.05, 0, Math.PI);
        [0x7dffc0, 0x6fd3ff, 0xb58aff].forEach((c, i) => {
          const r = pm(
            g,
            new T.TorusGeometry(0.2 + i * 0.06, 0.022, 6, 20, Math.PI * 1.2),
            c,
            0,
            LY,
            0,
            i * 0.7,
            i * 1.1,
            0,
            i * 1.3,
          );
          em(r, c, 0.6);
          glass(r, 0.8);
        });
        pg(g, Sp(0.1, 10), 0, LY, 0);
      },
    },
    {
      k: "wand",
      z: "ember",
      cl: "rime",
      n: "Icicle spire",
      o: [0, LY, 0],
      d: "Black Cinderwaste glass, cold to the touch, cradling a crystal of winter.",
      b(g) {
        pm(g, Cy(0.045, 0.06, 2.5, 6), 0x1a1620, 0, 0.7, 0);
        [-0.3, 0.5, 1.3].forEach((y) => pm(g, Cy(0.07, 0.07, 0.07, 6), 0x9ab8c8, 0, y, 0));
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU,
            s = pm(g, new T.OctahedronGeometry(0.1), 0x241e2c, Math.sin(a) * 0.2, LY - 0.05, Math.cos(a) * 0.2);
          s.scale.set(0.6, 2.2, 0.6);
          s.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
          em(s, 0x1a2a3a);
        }
        pg(g, new T.OctahedronGeometry(0.15), 0, LY + 0.05, 0).scale.set(1, 1.6, 1);
      },
    },
    {
      k: "wand",
      z: "frost",
      cl: "verdant",
      n: "Evergreen bough",
      o: [0, LY, 0],
      d: "A Frostfen pine bough, snow on its needles, with a glowing cone at the tip.",
      b(g) {
        pm(g, Cy(0.05, 0.07, 2.6, 7), 0x4a3020, 0, 0.75, 0);
        [0.5, 0.95, 1.4, 1.8].forEach((y, i) => {
          const s = i % 2 ? -1 : 1;
          pm(g, Cn(0.14, 0.32, 7), 0x2f6a3a, s * 0.13, y, 0, 0, -s * 0.9);
          pm(g, Sp(0.05, 6), 0xf4f8ff, s * 0.16, y + 0.06, 0);
        });
        pm(g, Cn(0.2, 0.32, 8), 0x2f6a3a, 0, LY - 0.22, 0, Math.PI);
        pg(g, Sp(0.12, 10), 0, LY, 0).scale.set(0.8, 1.25, 0.8);
        pm(g, Sp(0.06, 6), 0xf4f8ff, 0, LY - 0.12, 0.12);
      },
    },
    {
      k: "wand",
      z: "ember",
      cl: "spirit",
      n: "Wraith censer",
      o: [0.44, 1.33, 0],
      d: "A crooked Cinderwaste staff swinging a bronze censer of ghost-light.",
      b(g) {
        pm(g, Cy(0.045, 0.055, 2.3, 8), 0x2a2228, 0, 0.65, 0);
        pm(g, new T.TorusGeometry(0.22, 0.04, 6, 14, Math.PI), 0x2a2228, 0.22, 1.8, 0);
        [1.72, 1.64, 1.56].forEach((y, i) =>
          pm(g, new T.TorusGeometry(0.035, 0.012, 4, 8), 0x8a8a90, 0.44, y, 0, 0, 0, 0, i % 2 ? Math.PI / 2 : 0),
        );
        pm(g, new T.SphereGeometry(0.15, 12, 8, 0, TAU, Math.PI / 2, Math.PI / 2), 0x6a5a40, 0.44, 1.3, 0);
        pm(g, Cn(0.13, 0.14, 10), 0x6a5a40, 0.44, 1.45, 0);
        pg(g, Sp(0.09, 10), 0.44, 1.33, 0);
      },
    },
  ];
  ZL.forEach((l) => {
    const i = LOOKS[l.k].length;
    LOOKS[l.k].push({ n: l.n, c: 320, cl: l.cl, zn: ZN[l.z], zl: 1, d: l.d });
    if (l.o) LOOKS[l.k][i].o = l.o;
    l.i = i;
    try {
      const g = lg(l.k, i, l.k === "hat" ? WHEAD : l.k === "wand" ? STF : W);
      l.b(g);
      if (l.k === "hat") g.position.y = -2.22;
      outline(g);
      g.visible = false;
    } catch (e) {
      console.warn("zone look", l.n, e);
    }
  });

  // ---------------- gear rules ----------------
  let shop = 0; // > 0 while stock() rolls: alternates your school / neutral
  const zoneNow = () => {
    const p = mode === "explore" ? W.position : saved;
    return typeof zoneAt === "function" ? zoneAt(p.x, p.z) : "hub";
  };
  const g0 = genItem;
  genItem = function (sl, lv, r, el, sc) {
    if (sl === "deck") return g0(sl, lv, r, el);
    if (!sl) {
      const it = g0(null, lv, r, el); // let the deck wrap decide deck vs. gear first
      if (it.s === "deck" || !GB[it.s]) return it;
      sl = it.s;
    }
    const me = typeof P !== "undefined" && CL[P.cls] ? P.cls : null;
    if (sc == null) {
      if (shop) sc = shop++ % 2 && me ? me : "n";
      else {
        const x = Math.random();
        sc = x < 0.35 ? "n" : x < 0.8 && me ? me : pick(SCH);
      }
    }
    if (!isS(sc)) {
      // neutral: no element; the element stat turns into HP, spell power or ward
      const it = g0(sl, lv, r, "fire"),
        v = it.st.fire || 0;
      delete it.st.fire;
      if (v) {
        const k = pick(["hp", "pow", "def"]),
          a = Math.max(1, Math.round(v * { hp: 1.2, pow: 0.6, def: 0.3 }[k]));
        it.st[k] = (it.st[k] || 0) + a;
      }
      if (it.r >= 1 && it.r < 4) {
        const pf0 = GEL.fire.find((w) => it.n.indexOf(w + " ") === 0);
        if (pf0) it.n = pick(NPRE) + it.n.slice(pf0.length);
      }
      it.el = null;
      it.sc = "n";
      return zroll(it);
    }
    const e = CLE[sc],
      it = g0(sl, lv, r, e),
      k1 = 1 + 0.09 * (it.lv - 1);
    it.sc = sc;
    if (!it.st[e]) it.st[e] = Math.max(2, Math.round(4 * k1)); // even Common school gear has its element
    for (const k in it.st) if (k !== "pip") it.st[k] = Math.max(1, Math.round(it.st[k] * 1.12));
    const pk = PERK[sc];
    it.st[pk] = (it.st[pk] || 0) + Math.max(1, Math.round(PERKV[pk] * k1 * (0.6 + it.r * 0.2)));
    if (it.r === 4) it.n += LEGS[sc];
    it.v = Math.round(it.v * 1.15);
    return zroll(it);
  };
  // zone look: any robe / hat / staff (school or neutral) dropped in a zone may come in one of that zone's looks
  function zroll(it) {
    const lk = LKK[it.s],
      z = shop ? "" : zoneNow(),
      c = lk ? ZL.filter((l) => l.k === lk && l.z === z) : [];
    if (c.length && Math.random() < ZLC[it.r]) {
      it.lk = it.lk0 = pick(c).i;
      it.zl = 1;
      it.v = Math.round(it.v * 1.2);
    }
    return lkName(it);
  }
  // v34: gear that carries a look is always named after that look ("Hearthfire coat" -> "Hearthfire Coat"), so a
  // school's set reads as one family (Hearthfire coat / crown / torch). Legendaries keep their own names.
  function lkName(it) {
    const k = it && LKK[it.s],
      s = k && it.lk != null && LOOKS[k][it.lk];
    if (s && it.r < 4) it.n = s.n.replace(/(^|\s)(\w)/g, (a, b, c) => b + c.toUpperCase());
    return it;
  }
  if (typeof startGame === "function") {
    const sg0 = startGame;
    startGame = function () {
      const r = sg0.apply(this, arguments),
        fix = () => {
          try {
            (P.inv || []).forEach(lkName);
            if (P.gear) Object.keys(P.gear).forEach((s) => P.gear[s] && lkName(P.gear[s]));
          } catch (e) {
            console.warn(e);
          }
        };
      fix();
      Promise.resolve(r).then(fix);
      return r;
    };
  }
  const st0 = stock;
  stock = function () {
    shop = 1;
    try {
      return st0.apply(this, arguments);
    } finally {
      shop = 0;
    }
  };
  const e0 = equip;
  equip = function (it) {
    if (it && !ok(it)) {
      toast("Only a " + sName(it.sc) + " can wear " + it.n + ".", "#ff8a7a");
      return;
    }
    return e0.apply(this, arguments);
  };
  // worn gear of another school (after a school change) sleeps: no stats
  const gs0 = gst;
  gst = function () {
    if (!P.gear) return gs0();
    const off = GSL.filter((s) => P.gear[s] && !ok(P.gear[s]));
    if (!off.length) return gs0();
    const keep = off.map((s) => [s, P.gear[s]]);
    off.forEach((s) => (P.gear[s] = Object.assign({}, P.gear[s], { st: {} })));
    try {
      return gs0();
    } finally {
      keep.forEach(([s, it]) => (P.gear[s] = it));
    }
  };
  const gv0 = giveItem;
  giveItem = function (it) {
    const n0 = (P.inv || []).length,
      r = gv0.apply(this, arguments);
    if (it && it.zl && it.lk != null && (P.inv || []).length > n0) {
      const k = LKK[it.s],
        s = k && LOOKS[k][it.lk];
      P.zlook = P.zlook || {};
      if (s && !P.zlook[k + it.lk]) {
        P.zlook[k + it.lk] = 1;
        toast("New " + s.zn + " look: " + s.n + "! Restyling to it at Pip's is now free.", "#ff8ad0");
      }
    }
    return r;
  };

  // ---------------- labels (called from 07's Bag, shop and Pip pages) ----------------
  // a small corner mark for the Bag grid
  const badge = (it) => {
    if (!it || it.s === "deck") return "";
    const s = isS(it.sc);
    return (
      '<i style="position:absolute;left:3px;top:1px;font:800 10px system-ui;font-style:normal;color:' +
      (s ? sCol(it.sc) : "#a8a090") +
      (s && !ok(it) ? ";opacity:.45" : "") +
      '" title="' +
      (s ? sName(it.sc) + " gear" : "Neutral gear") +
      '">' +
      (s ? "◆" : "◇") +
      "</i>"
    );
  };
  const txt = (it) => {
    if (!it || it.s === "deck") return "";
    if (!isS(it.sc)) return '<br><span style="color:#d8d0b8">◇ Neutral gear: any school can wear it.</span>';
    const pk = STN[PERK[it.sc]][0];
    return (
      '<br><span style="color:' +
      sCol(it.sc) +
      '">◆ ' +
      sName(it.sc) +
      " gear: only a " +
      sName(it.sc) +
      " can wear it. Stronger rolls, always carries its element, bonus " +
      pk +
      "." +
      (ok(it) ? "" : ' <b style="color:#ff8a7a">You are not a ' + sName(it.sc) + ": it gives you nothing.</b>") +
      "</span>"
    );
  };
  return { ZL, ZN, ok, badge, txt, isS };
})();
