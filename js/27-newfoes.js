// DUSKWICK - 27-newfoes.js (v25): new zone foes.
//   Frost Golem (fgolem, Frostfen streets), Lava Golem (lgolem) and Corrupted Phoenix (phoenix) on the Cinderwaste
//   streets, Gnomes (gnome: Frost Gnome in Frostfen, Bog Gnome in Mirewick; colour by hc).
// Each kind has its own model (built here: mkFoe is wrapped), idle/walk animation (animBeast/animGloom wrapped; the
// models set userData.gl so 24-foemoves' move poses work on their bd/hd/arms/wings), moveset (FMV.K/FMV.M),
// weaknesses (WKT) and bestiary line (wkName wrapped).
// The foes themselves are appended to `foes` here, after every other foe, in a fixed order (multiplayer matches foes
// by index), and their scene children are added after the editor's BASE snapshot.
// Only top-level name: NFK.
const NFK = {
  fgolem: { n: "Frost Golem", th: 3.5, ss: 0.9 },
  lgolem: { n: "Lava Golem", th: 3.5, ss: 0.9 },
  phoenix: { n: "Corrupted Phoenix", th: 3.7, ss: 0.85 },
  gnome: { n: "Gnome", th: 2.1, ss: 1 },
};
(() => {
  const GN = { [0x6ab0ff]: "Frost Gnome", [0x4a8a3a]: "Bog Gnome" },
    nmOf = (kind, hc) => (kind === "gnome" ? GN[hc] || "Gloom Gnome" : NFK[kind].n);
  // ---------- models ----------
  const grp = (par, x, y, z) => {
    const g = new T.Group();
    g.position.set(x || 0, y || 0, z || 0);
    par.add(g);
    return g;
  };
  function part(u, par, geo, c, x, y, z, glow, gi) {
    const m = mk(geo, c, x, y, z, glow ? 1 : 0);
    if (glow) {
      m.material.emissive.setHex(glow);
      m.material.emissiveIntensity = gi || 1;
      u.gm.push(m.material);
    }
    par.add(m);
    return m;
  }
  function golem(kind) {
    const fr = kind === "fgolem",
      o = new T.Group(),
      u = o.userData,
      body = fr ? 0x9cc8e8 : 0x2e2424,
      dark = fr ? 0x5a88b0 : 0x1a1414,
      gc = fr ? 0x6ad8ff : 0xff5a12;
    Object.assign(u, { gl: 1, nk: kind, gm: [], lg: [], arms: [], ph: Math.random() * 6 });
    [-1, 1].forEach((sd) => {
      const l = grp(o, sd * 0.42, 1.1, 0);
      part(u, l, B(0.6, 1.1, 0.7), dark, 0, -0.55, 0);
      part(u, l, B(0.7, 0.25, 0.85), body, 0, -1.0, 0.06);
      u.lg.push(l);
    });
    const bd = (u.bd = grp(o, 0, 1.1, 0));
    part(u, bd, B(1.2, 0.45, 0.9), dark, 0, 0.15, 0);
    part(u, bd, B(1.7, 1.25, 1.1), body, 0, 0.9, 0);
    part(u, bd, Sp(0.28, 10), gc, 0, 0.95, 0.55, gc, 1.2);
    [-1, 1].forEach((sd) => part(u, bd, Sp(0.48, 8), body, sd * 0.98, 1.35, 0));
    const hd = (u.hd = grp(bd, 0, 1.55, 0.05));
    part(u, hd, B(0.72, 0.6, 0.66), body, 0, 0.25, 0);
    part(u, hd, B(0.8, 0.12, 0.22), dark, 0, 0.44, 0.28);
    [-1, 1].forEach((sd) => part(u, hd, B(0.15, 0.08, 0.05), gc, sd * 0.17, 0.3, 0.34, gc, 1.4));
    [-1, 1].forEach((sd) => {
      const a = grp(bd, sd * 1.08, 1.32, 0);
      part(u, a, B(0.5, 0.9, 0.5), body, 0, -0.45, 0);
      part(u, a, B(0.56, 0.8, 0.56), dark, 0, -1.15, 0.05);
      part(u, a, B(0.78, 0.62, 0.78), body, 0, -1.72, 0.08);
      if (!fr) part(u, a, Sp(0.14, 6), 0xffa02a, 0, -2.06, 0.1, 0xff6a12, 1.3); // magma drip
      u.arms.push(a);
    });
    if (fr) {
      // ice crystals on the shoulders, back and head
      [
        [-0.95, 1.75, 0, 0.3],
        [-1.1, 1.6, -0.2, 0.7],
        [0.95, 1.8, 0, -0.3],
        [1.1, 1.6, -0.2, -0.7],
        [0, 1.4, -0.6, 0],
        [-0.4, 1.2, -0.6, 0.3],
        [0.4, 1.2, -0.6, -0.3],
      ].forEach(([x, y, z, r], i) => {
        const c = part(u, bd, Cn(0.16, 0.6 + (i % 3) * 0.2, 5), 0xdff4ff, x, y, z, 0x3a9ad0, 0.6);
        c.rotation.z = r;
        c.rotation.x = z ? -0.5 : 0;
      });
      const cr = part(u, hd, Cn(0.12, 0.45, 5), 0xdff4ff, 0, 0.7, 0, 0x3a9ad0, 0.6);
      cr.rotation.x = -0.2;
    } else {
      // glowing cracks down the chest and obsidian shards on the back
      [
        [-0.4, 0.9, 0.3],
        [0.35, 0.75, -0.4],
        [0.05, 0.45, 0.15],
      ].forEach(([x, y, r]) => {
        const k = part(u, bd, B(0.07, 0.8, 0.03), 0xffa02a, x, y, 0.56, 0xff5a12, 1.2);
        k.rotation.z = r;
      });
      [-0.45, 0, 0.45].forEach((x, i) => {
        const s = part(u, bd, Cn(0.2, 0.9 - i * 0.1, 4), 0x120c10, x, 1.5, -0.45);
        s.rotation.x = -0.6;
      });
    }
    return o;
  }
  function phoenix() {
    const o = new T.Group(),
      u = o.userData;
    Object.assign(u, { gl: 1, nk: "phoenix", gm: [], arms: [], wings: [], ph: Math.random() * 6 });
    const bd = (u.bd = grp(o, 0, 1.5, 0)),
      by = part(u, bd, Sp(0.55, 12), 0x2a1030, 0, 0, 0);
    by.scale.set(0.9, 0.85, 1.3);
    part(u, bd, Sp(0.36, 10), 0xff6a2a, 0, -0.12, 0.28, 0xff4a12, 1.1);
    const hd = (u.hd = grp(bd, 0, 0.42, 0.62));
    part(u, hd, Sp(0.3, 10), 0x351540, 0, 0, 0);
    const bk = part(u, hd, Cn(0.1, 0.42, 5), 0xffb02a, 0, -0.04, 0.36, 0xaa5a0a, 0.6);
    bk.rotation.x = Math.PI / 2;
    [-1, 1].forEach((sd) => part(u, hd, Sp(0.05, 6), 0xff2a8a, sd * 0.15, 0.07, 0.22, 0xff2a8a, 1.6));
    [0, 1, 2, 3].forEach((i) => {
      const c = part(
        u,
        hd,
        Cn(0.06, 0.5 - i * 0.06, 4),
        i % 2 ? 0xff6a2a : 0xb04aff,
        0,
        0.22,
        -0.1 - i * 0.1,
        i % 2 ? 0xff4a12 : 0x8a2aff,
        1.2,
      );
      c.rotation.x = -0.5 - i * 0.25;
    });
    [-1, 1].forEach((sd) => {
      const w = grp(bd, sd * 0.42, 0.15, 0);
      for (let i = 0; i < 5; i++) {
        const f = part(
          u,
          w,
          B(0.55, 0.05, 0.34 - i * 0.03),
          i % 2 ? 0x3a1448 : 0x22102c,
          sd * (0.3 + i * 0.42),
          -i * 0.03,
          -i * 0.06,
        );
        f.rotation.y = sd * i * 0.08;
        const e = part(
          u,
          w,
          B(0.5, 0.04, 0.06),
          i < 3 ? 0xb04aff : 0xff6a2a,
          sd * (0.3 + i * 0.42),
          -i * 0.03 - 0.02,
          -0.2 - i * 0.07,
          i < 3 ? 0x8a2aff : 0xff4a12,
          1.3,
        );
        e.rotation.y = sd * i * 0.08;
      }
      const tp = part(u, w, Cn(0.12, 0.6, 5), 0xff6a2a, sd * 2.35, 0, -0.35, 0xff4a12, 1.4);
      tp.rotation.z = (-sd * Math.PI) / 2;
      u.wings.push(w);
    });
    [-1, 1].forEach((sd) => {
      const a = grp(bd, sd * 0.2, -0.4, 0.05);
      part(u, a, Cy(0.05, 0.04, 0.6, 5), 0x8a6a2a, 0, -0.3, 0);
      [-1, 0, 1].forEach((k) => {
        const c = part(u, a, Cn(0.04, 0.18, 4), 0x1a1010, k * 0.06, -0.62, 0.07);
        c.rotation.x = 2.4;
      });
      u.arms.push(a);
    });
    const tl = (u.tail = grp(bd, 0, -0.05, -0.62));
    [-0.25, 0, 0.25].forEach((y, i) => {
      const c = part(
        u,
        tl,
        Cn(0.16, 1.4, 5),
        i === 1 ? 0xb04aff : 0xff4a1a,
        (i - 1) * 0.18,
        0,
        -0.65,
        i === 1 ? 0x8a2aff : 0xff3a0a,
        1.2,
      );
      c.rotation.x = -Math.PI / 2 - 0.25 + y;
    });
    const au = new T.Sprite(AM(GLT));
    au.material.color.setHex(0x9a3aff);
    au.scale.setScalar(2.8);
    bd.add(au);
    return o;
  }
  function gnome(hc) {
    const o = new T.Group(),
      u = o.userData,
      coat = hc === 0x6ab0ff ? 0x3a5a8a : hc === 0x4a8a3a ? 0x5a4a2a : 0x5a3a6a,
      hat = hc || 0xb0302a;
    Object.assign(u, { gl: 1, nk: "gnome", gm: [], lg: [], arms: [], ph: Math.random() * 6 });
    [-1, 1].forEach((sd) => {
      const l = grp(o, sd * 0.15, 0.28, 0);
      part(u, l, Cy(0.07, 0.08, 0.2, 6), 0x3a3a4a, 0, -0.12, 0);
      part(u, l, B(0.16, 0.1, 0.26), 0x2a1a12, 0, -0.24, 0.05);
      u.lg.push(l);
    });
    const bd = (u.bd = grp(o, 0, 0.25, 0));
    part(u, bd, Cy(0.3, 0.42, 0.62, 8), coat, 0, 0.32, 0);
    part(u, bd, Cy(0.36, 0.38, 0.08, 8), 0x2a1a12, 0, 0.2, 0);
    part(u, bd, B(0.12, 0.1, 0.04), 0xd8b040, 0, 0.2, 0.37);
    const hd = (u.hd = grp(bd, 0, 0.66, 0));
    part(u, hd, Sp(0.25, 10), 0xe8b898, 0, 0.15, 0);
    part(u, hd, Sp(0.09, 8), 0xe8908a, 0, 0.12, 0.25);
    const bdr = part(u, hd, Cn(0.25, 0.48, 8), 0xe8e8e8, 0, -0.08, 0.12);
    bdr.rotation.x = Math.PI + 0.25;
    [-1, 1].forEach((sd) => part(u, hd, Sp(0.04, 6), 0x7aff6a, sd * 0.09, 0.2, 0.22, 0x5aff4a, 1.6));
    part(u, hd, Cy(0.3, 0.31, 0.05, 10), hat, 0, 0.32, 0);
    const ht = part(u, hd, Cn(0.27, 0.78, 8), hat, 0, 0.72, -0.02);
    ht.rotation.z = 0.18;
    ht.rotation.x = -0.12;
    [-1, 1].forEach((sd, n) => {
      const a = grp(bd, sd * 0.36, 0.52, 0);
      part(u, a, Cy(0.08, 0.09, 0.38, 6), coat, 0, -0.18, 0);
      part(u, a, Sp(0.08, 6), 0xe8b898, 0, -0.4, 0);
      if (n) {
        // a pickaxe held forward in the right hand
        const p = grp(a, 0, -0.4, 0.05);
        const h = part(u, p, Cy(0.025, 0.025, 0.8, 5), 0x7a5a3a, 0, 0, 0.3);
        h.rotation.x = Math.PI / 2;
        const hh = part(u, p, B(0.5, 0.06, 0.08), 0x8a8a9a, 0, 0, 0.68);
        hh.rotation.z = 0.1;
      }
      u.arms.push(a);
    });
    return o;
  }
  const mk0 = mkFoe;
  mkFoe = function (kind, t, big, hc) {
    if (!NFK[kind]) return mk0(kind, t, big, hc);
    const o = kind === "phoenix" ? phoenix() : kind === "gnome" ? gnome(hc) : golem(kind);
    o.scale.setScalar(NFK[kind].ss * (big ? 1.2 : 1));
    return o;
  };
  // ---------- animation (idle / walk). Sets every value 24-foemoves' poses add to, each frame ----------
  function anim(o, s, m) {
    const u = o.userData,
      j = u.ph,
      bd = u.bd,
      hd = u.hd,
      S2 = Math.sin;
    bd.scale.set(1, 1, 1);
    if (u.nk === "phoenix") {
      bd.position.y = 1.5 + S2(s * 2 + j) * 0.18;
      bd.rotation.set(m ? 0.25 : 0.05 + S2(s * 2 + j) * 0.04, 0, S2(s * 1.1 + j) * 0.05);
      const fl = S2(s * (m ? 9 : 5) + j);
      u.wings.forEach((w, n) => w.rotation.set(0, 0, (n ? 1 : -1) * (0.2 + fl * 0.55)));
      hd.rotation.set(S2(s * 1.5 + j) * 0.1, S2(s * 0.6 + j) * 0.3, 0);
      u.tail.rotation.set(S2(s * 2 + j) * 0.12, S2(s * 1.4 + j) * 0.2, 0);
      u.arms.forEach((a, n) => a.rotation.set(0.3 + S2(s * 2 + j + n) * 0.1, 0, 0));
    } else {
      const gn = u.nk === "gnome",
        ph = s * (m ? (gn ? 11 : 5) : 1.2) + j,
        y0 = gn ? 0.25 : 1.1;
      bd.position.y = y0 + (m ? Math.abs(S2(ph)) * (gn ? 0.1 : 0.08) : S2(s * 1.6 + j) * 0.02);
      bd.rotation.set(
        m ? (gn ? 0.12 : 0.08) : 0.03,
        m ? 0 : S2(s * 0.6 + j) * (gn ? 0.15 : 0.06),
        m ? S2(ph) * 0.06 : 0,
      );
      hd.rotation.set(
        S2(s * 1.1 + j) * 0.06,
        S2(s * (gn ? 0.9 : 0.4) + j) * (gn ? 0.35 : 0.25),
        gn ? S2(s * 1.3 + j) * 0.06 : 0,
      );
      u.arms.forEach((a, n) => {
        const sd = n ? 1 : -1;
        a.rotation.set(
          m
            ? S2(ph + n * Math.PI) * (gn ? 0.7 : 0.5)
            : gn && n
              ? -0.35 + S2(s * 2 + j) * 0.08
              : S2(s * 1.2 + j + n) * 0.05,
          0,
          sd * (gn ? 0.15 : 0.1),
        );
      });
      u.lg.forEach((l, n) => (l.rotation.x = m ? S2(ph + n * Math.PI) * 0.45 : 0));
    }
    const pu = 0.75 + 0.35 * S2(s * (u.nk === "phoenix" ? 6 : 3) + j);
    u.gm.forEach((mt) => (mt.emissiveIntensity = pu));
  }
  const ab0 = animBeast,
    ag0 = animGloom;
  animBeast = function (o, s, m) {
    const u = o && o.userData;
    if (u && u.frz) return; // frozen by a death effect (29-deathfx.js)
    if (u && u.nk) {
      anim(o, s, m);
      if (u.fp) FMV.over(o);
      return;
    }
    ab0(o, s, m);
  };
  animGloom = function (o, s, m, i) {
    const u = o && o.userData;
    if (u && u.frz) return;
    if (u && u.nk) {
      anim(o, s, m);
      if (u.fp) FMV.over(o);
      return;
    }
    ag0(o, s, m, i);
  };
  // ---------- battle: name, plate height, facing ----------
  const nf0 = newFoe;
  newFoe = function (sp, slot) {
    if (sp && NFK[sp.kind] && !sp.nm) sp = Object.assign({}, sp, { nm: nmOf(sp.kind, sp.hc) });
    const f = nf0(sp, slot);
    if (NFK[f.kind]) {
      f.m.rotation.y = -0.9;
      f.th = NFK[f.kind].th * f.m.scale.x + 0.3;
    }
    return f;
  };
  // ---------- weaknesses + bestiary ----------
  Object.assign(WKT, {
    fgolem: { fire: WK_W, storm: WK_W, ice: WK_R }, // ice cracks in heat and under lightning
    lgolem: { ice: WK_W, fire: WK_R, heal: WK_R }, // quenched by frost; growth just burns
    phoenix: { ice: WK_W, spirit: WK_W, fire: WK_R }, // corrupted: spirit light pulls the gloom out of it
    gnome: { storm: WK_W, fire: WK_W, heal: WK_R }, // small, tough, at home among roots
  });
  const wk0 = wkName;
  wkName = function (nm) {
    const k = Object.keys(NFK).find((k) => nm === NFK[k].n) || (/Gnome$/.test(nm) ? "gnome" : null);
    return k ? String(weakTxt({ kind: k })).trim() : wk0(nm);
  };
  // ---------- movesets (same fields as 24-foemoves.js; only existing poses and effects are used) ----------
  const hurt = (f) => f.hp < f.max * 0.7,
    mate = (f) => g.foes.some((q) => q !== f && q.hp > 0),
    anyHurt = () => g.foes.some((q) => q.hp > 0 && q.hp < q.max * 0.8),
    NM = {
      // Frost Golem
      gfist: { n: "Glacier Fist", ic: "👊", el: "ice", tg: "one", p: 1.2, w: 3, an: "slam", fx: "bash", ch: 0.3 },
      gshard: {
        n: "Ice Shards",
        ic: "❄",
        el: "ice",
        tg: "one",
        p: 1.3,
        w: 2,
        cd: 2,
        an: "cast",
        fx: "frostpuff",
        rng: 1,
        ch: 0.5,
      },
      gshell: { n: "Frozen Shell", ic: "🛡", el: "ice", tg: "self", w: 1.5, cd: 3, an: "guard", fx: "guard", gd: 1 },
      gstomp: {
        n: "Permafrost Stomp",
        ic: "🌨",
        el: "ice",
        tg: "all",
        p: 0.65,
        w: 1.5,
        cd: 3,
        an: "slam",
        fx: "blizzard",
        ch: 0.5,
      },
      // Lava Golem
      lfist: { n: "Molten Fist", ic: "👊", el: "fire", tg: "one", p: 1.15, w: 3, an: "slam", fx: "emberhit", bn: 2 },
      lhurl: {
        n: "Magma Hurl",
        ic: "☄",
        el: "fire",
        tg: "one",
        p: 1.5,
        w: 2,
        cd: 2,
        an: "slam",
        fx: "fireball",
        rng: 1,
        bn: 1,
      },
      lskin: { n: "Obsidian Skin", ic: "🛡", el: "fire", tg: "self", w: 1.5, cd: 3, an: "guard", fx: "guard", gd: 1 },
      lquake: {
        n: "Lava Quake",
        ic: "🌋",
        el: "fire",
        tg: "all",
        p: 0.7,
        w: 1.5,
        cd: 3,
        an: "slam",
        fx: "magma",
        bn: 1,
      },
      // Corrupted Phoenix
      ptalon: { n: "Blackfire Talons", ic: "🐾", el: "fire", tg: "one", p: 1.1, w: 3, an: "claw", fx: "rake", bn: 1 },
      pdive: {
        n: "Ashfall Dive",
        ic: "💥",
        el: "fire",
        tg: "one",
        p: 1.7,
        w: 2,
        cd: 3,
        an: "pounce",
        fx: "firecrash",
        bn: 2,
      },
      pwings: {
        n: "Ashen Wings",
        ic: "🔥",
        el: "fire",
        tg: "all",
        p: 0.6,
        w: 1.5,
        cd: 3,
        an: "flap",
        fx: "flamewave",
        bn: 1,
      },
      pshriek: {
        n: "Gloomfire Shriek",
        ic: "💀",
        el: "spirit",
        tg: "debuff",
        p: 0.4,
        w: 1.2,
        cd: 3,
        an: "roar",
        fx: "fear",
        pp: 1,
        ppn: "Dread",
      },
      preborn: {
        n: "Rebirth Flame",
        ic: "▲",
        el: "fire",
        tg: "self",
        w: 1.5,
        cd: 5,
        an: "roar",
        fx: "kindle",
        hl: 0.15,
        bf: 1.3,
        c: hurt,
      },
      // Gnome
      gpoke: { n: "Pickaxe Poke", ic: "⛏", el: "heal", tg: "one", p: 1.0, w: 3, an: "claw", fx: "rake" },
      gbomb: {
        n: "Mushroom Bomb",
        ic: "🍄",
        el: "heal",
        tg: "debuff",
        p: 0.4,
        w: 1.5,
        cd: 3,
        an: "cast",
        fx: "spores",
        pp: 1,
        ppn: "Spores",
      },
      gstab: {
        n: "Sneaky Stab",
        ic: "🗡",
        el: "spirit",
        tg: "one",
        p: 1.6,
        w: 1.5,
        cd: 3,
        an: "pounce",
        fx: "shadowcrash",
      },
      gmend: {
        n: "Gnomish Tonic",
        ic: "✚",
        el: "heal",
        tg: "heal",
        hl: 0.1,
        w: 2,
        cd: 3,
        an: "cast",
        fx: "mend",
        c: anyHurt,
      },
      grally: {
        n: "Rally Cry",
        ic: "📣",
        el: "heal",
        tg: "pack",
        who: "any",
        bf: 1.3,
        w: 1.2,
        cd: 3,
        an: "howl",
        fx: "stoke",
        c: mate,
      },
    };
  Object.keys(NM).forEach((k) => (FMV.M[k] = Object.assign({ id: k }, NM[k])));
  Object.assign(FMV.K, {
    fgolem: ["gfist", "gshard", "gshell", "gstomp"],
    lgolem: ["lfist", "lhurl", "lskin", "lquake"],
    phoenix: ["ptalon", "pdive", "pwings", "pshriek", "preborn"],
    gnome: ["gpoke", "gbomb", "gstab", "gmend", "grally"],
  });
  // ---------- placing them on the zone streets (fixed order, no randomness) ----------
  const PLACE = {
    frost: [
      ["fgolem", 3, 0.42, 0],
      ["gnome", 2, 0.7, 0x6ab0ff],
    ],
    ember: [
      ["lgolem", 4, 0.42, 0],
      ["phoenix", 4, 0.75, 0],
    ],
    marsh: [
      ["gnome", 3, 0.35, 0x4a8a3a],
      ["gnome", 3, 0.62, 0x4a8a3a],
    ],
  };
  ZRD.forEach((t) => {
    if (!t.n || !PLACE[t.zk]) return;
    PLACE[t.zk].forEach(([kind, tt, fr, hc], k) => {
      const [lx, lz, hx, hz] = rdAt(t, t.L * fr),
        of = k % 2 ? 2.5 : -2.5,
        x = OX + lx - hz * of,
        z = OZ + lz + hx * of,
        o = mkFoe(kind, tt, 0, hc || undefined);
      o.position.set(x, 0, z);
      S.add(o);
      const f = {
        o,
        t: tt,
        kind,
        big: 0,
        hx: x,
        hz: z,
        w: null,
        wt: 0,
        dead: 0,
        rt: Infinity,
        tw: 0,
        nm: nmOf(kind, hc),
      };
      if (hc) f.hc = hc;
      foes.push(f);
      foeSetup(f);
    });
  });
})();
