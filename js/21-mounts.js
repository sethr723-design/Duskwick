// v22 mounts: rideable beasts bought at Hesper's stable on Market Lane.
// Everything lives here; the hooks elsewhere are one-liners: DEFP mounts/mt/ride + pubLook().mt (06), walk() speed via
// mountSp() and the NPC kind "m" -> panel("stable") (11), mountTick() from the main loop (11).
// A mount is its own scene object that follows its rider (never a child of W, so W.clone() for other players stays clean).
// Scene children are only added here, i.e. after the editor's BASE snapshot (13), so saved builds keep their indices.
const MOUNTS = {
  pony: {
    n: "Duskmane Pony",
    d: "A shaggy dusk-blue pony with a lantern on a pole. Steady and sure.",
    c: 300,
    lv: 1,
    sp: 1.4,
    h: 1.0,
  },
  ram: {
    n: "Emberhorn Ram",
    d: "A woolly ram whose curled horns smoulder like banked coals.",
    c: 900,
    lv: 6,
    sp: 1.6,
    h: 0.95,
  },
  moth: {
    n: "Gloamwing Moth",
    d: "A great soft moth drawn to lamplight. It hovers, and it is fast.",
    c: 2000,
    lv: 12,
    sp: 1.8,
    h: 1.3,
    fly: 1,
  },
  // v40 area mounts, sold only by each zone village's outfitter (zn). b = the model they're built on, tint = colour
  // swaps on that model (61-villages.js sells them; Hesper's stable keeps the three above).
  rimeram: {
    n: "Rimecoat Ram",
    d: "A Frostfen ram with a coat like fresh snow and horns rimed in blue ice.",
    c: 650,
    lv: 4,
    sp: 1.5,
    h: 0.95,
    zn: "frost",
    b: "ram",
    sw: "#e8f2ff",
    tint: { 0xd8ccb4: 0xeef4ff, 0x2a2026: 0x3a4a6a },
  },
  cinderpony: {
    n: "Cinderhoof Pony",
    d: "Soot-black and quick, with a mane of glowing embers. Born in the Cinderwaste.",
    c: 800,
    lv: 5,
    sp: 1.55,
    h: 1.0,
    zn: "ember",
    b: "pony",
    sw: "#2a1a18",
    tint: { 0x2c3452: 0x2a1a18, 0xe8d9b0: 0xff8a3d },
  },
  bogmoth: {
    n: "Bogwing Moth",
    d: "A broad green moth from the Mirewick reeds. It hums low over the water.",
    c: 1400,
    lv: 7,
    sp: 1.7,
    h: 1.3,
    fly: 1,
    zn: "marsh",
    b: "moth",
    sw: "#4a7a5a",
    tint: { 0x5a4a7a: 0x3a5a44, 0x4a3a66: 0x2f4a3a, 0x8a76c0: 0x6ab08a, 0xc9a0ff: 0x9affc8 },
  },
};
const MNT = { on: 0, o: null, k: null, w: 0, pp: null, peer: new Map(), st: null, btn: null, bk: "" };
(() => {
  // ---------- models (forward = +z, feet on y = 0) ----------
  const glow = (g, c, x, y, z) => {
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: c }));
    m.position.set(x, y, z);
    return m;
  };
  const halo = (c, s, x, y, z) => {
    const h = new T.Sprite(AM(GLT));
    h.material.color.setHex(c);
    h.scale.setScalar(s);
    h.position.set(x, y, z);
    return h;
  };
  const blob = (r, c, x, y, z, sx, sy, sz) => {
    const m = mk(Sp(r, 12), c, x, y, z);
    m.scale.set(sx, sy, sz);
    return m;
  };
  const ember = (c, e) => {
    const m = M(c, 1);
    m.emissive.setHex(e);
    m.emissiveIntensity = 0.7;
    return m;
  };
  function leg(I, x, y, z, len, r, c, hc) {
    const p = new T.Group();
    p.position.set(x, y, z);
    p.add(mk(Cy(r, r * 0.8, len, 7), c, 0, -len / 2, 0));
    p.add(mk(Cy(r * 0.95, r * 1.1, 0.14, 7), hc, 0, -len + 0.07, 0));
    I.add(p);
    I.userData.legs.push(p);
  }
  function saddle(I, y, z, col) {
    I.add(mk(B(0.95, 0.05, 0.9), 0x3a2a6a, 0, y - 0.06, z));
    I.add(mk(B(0.97, 0.03, 0.06), 0xd9a35a, 0, y - 0.05, z + 0.43));
    I.add(mk(B(0.97, 0.03, 0.06), 0xd9a35a, 0, y - 0.05, z - 0.43));
    I.add(mk(B(0.74, 0.14, 0.7), col, 0, y + 0.04, z));
    I.add(mk(B(0.5, 0.2, 0.12), col, 0, y + 0.12, z - 0.32));
  }
  function pony(I) {
    const C = 0x2c3452,
      MN = 0xe8d9b0,
      HF = 0x1a1420;
    I.add(blob(0.6, C, 0, 1.0, 0, 0.78, 0.72, 1.45));
    I.add(blob(0.45, C, 0, 1.08, 0.62, 0.9, 0.95, 0.9));
    const nk = new T.Group();
    nk.position.set(0, 1.25, 0.78);
    nk.rotation.x = 0.6;
    nk.userData.r0 = 0.6;
    nk.add(mk(Cy(0.2, 0.28, 0.85, 8), C, 0, 0.4, 0));
    nk.add(mk(B(0.36, 0.38, 0.7), C, 0, 0.85, 0.2));
    nk.add(mk(B(0.3, 0.3, 0.16), HF, 0, 0.8, 0.52));
    nk.add(mk(B(0.1, 0.8, 0.3), MN, 0, 0.45, -0.18));
    nk.add(mk(Cn(0.07, 0.22, 5), C, 0.12, 1.12, 0.05));
    nk.add(mk(Cn(0.07, 0.22, 5), C, -0.12, 1.12, 0.05));
    nk.add(glow(Sp(0.045, 6), 0xffe29a, 0.19, 0.93, 0.28));
    nk.add(glow(Sp(0.045, 6), 0xffe29a, -0.19, 0.93, 0.28));
    I.add(nk);
    I.userData.head = nk;
    leg(I, 0.27, 0.82, 0.58, 0.82, 0.1, C, HF);
    leg(I, -0.27, 0.82, 0.58, 0.82, 0.1, C, HF);
    leg(I, 0.27, 0.82, -0.55, 0.82, 0.1, C, HF);
    leg(I, -0.27, 0.82, -0.55, 0.82, 0.1, C, HF);
    const tl = new T.Group();
    tl.position.set(0, 1.15, -0.85);
    const t = mk(Cy(0.06, 0.17, 0.85, 6), MN, 0, -0.36, -0.14);
    t.rotation.x = 0.35;
    tl.add(t);
    I.add(tl);
    I.userData.tail = tl;
    saddle(I, 1.46, -0.05, 0x6a2a2a);
    // the lamplighter's pole: a little lantern swinging over the rump
    I.add(mk(Cy(0.025, 0.03, 1.15, 5), 0x3a2418, 0.3, 1.95, -0.62));
    I.add(mk(B(0.04, 0.04, 0.32), 0x3a2418, 0.3, 2.5, -0.48));
    const ln = new T.Group();
    ln.position.set(0.3, 2.48, -0.34);
    ln.add(mk(B(0.17, 0.03, 0.17), 0x2a1a10, 0, -0.08, 0));
    ln.add(mk(B(0.17, 0.03, 0.17), 0x2a1a10, 0, -0.32, 0));
    ln.add(glow(B(0.12, 0.2, 0.12), 0xffc46a, 0, -0.2, 0));
    ln.add(halo(0xffb04a, 1.1, 0, -0.2, 0));
    I.add(ln);
    I.userData.lamp = ln;
  }
  function ram(I) {
    const WL = 0xd8ccb4,
      FC = 0x2a2026,
      HF = 0x14101a;
    I.add(blob(0.7, WL, 0, 1.0, 0, 0.95, 0.82, 1.25));
    [
      [0.32, 1.32, 0.35],
      [-0.32, 1.3, 0.1],
      [0.28, 1.28, -0.45],
      [-0.26, 1.34, -0.4],
      [0, 0.9, 0.7],
    ].forEach(([x, y, z]) => I.add(blob(0.32, WL, x, y, z, 1, 0.8, 1)));
    const hd = new T.Group();
    hd.position.set(0, 1.22, 0.85);
    hd.userData.r0 = 0;
    hd.add(mk(B(0.38, 0.42, 0.55), FC, 0, 0, 0.14));
    hd.add(blob(0.24, WL, 0, 0.2, -0.02, 1.2, 0.7, 1));
    const hm = ember(0xff7a3d, 0xff4a10);
    [1, -1].forEach((sd) => {
      const h = new T.Mesh(new T.TorusGeometry(0.2, 0.065, 6, 14, Math.PI * 1.55), hm);
      h.position.set(sd * 0.25, 0.14, 0.02);
      h.rotation.set(0, sd * Math.PI * 0.5, 0.4);
      hd.add(h);
      hd.add(glow(Sp(0.045, 6), 0xffb347, sd * 0.2, 0.06, 0.34));
    });
    hd.add(halo(0xff6a20, 1.4, 0, 0.15, 0));
    I.add(hd);
    I.userData.head = hd;
    leg(I, 0.34, 0.66, 0.5, 0.64, 0.11, FC, HF);
    leg(I, -0.34, 0.66, 0.5, 0.64, 0.11, FC, HF);
    leg(I, 0.34, 0.66, -0.5, 0.64, 0.11, FC, HF);
    leg(I, -0.34, 0.66, -0.5, 0.64, 0.11, FC, HF);
    const tl = new T.Group();
    tl.position.set(0, 1.05, -0.88);
    tl.add(blob(0.16, WL, 0, 0, -0.06, 1, 1.3, 1));
    I.add(tl);
    I.userData.tail = tl;
    saddle(I, 1.5, -0.02, 0x4a2a1a);
    I.userData.ember = hd;
  }
  function moth(I) {
    const FZ = 0x5a4a7a,
      AB = 0x4a3a66,
      CO = 0xe8dcc8,
      WG = 0x8a76c0;
    I.add(blob(0.45, FZ, 0, 1.4, 0.15, 0.9, 0.85, 1.1));
    I.add(blob(0.4, AB, 0, 1.3, -0.68, 0.85, 0.8, 1.6));
    [-0.45, -0.75, -1.05].forEach((z, i) => {
      const r = mk(Cy(0.3 - i * 0.05, 0.3 - i * 0.05, 0.07, 10), 0xc9a0ff, 0, 1.3, z);
      r.rotation.x = Math.PI / 2;
      I.add(r);
    });
    I.add(blob(0.36, CO, 0, 1.48, 0.58, 1.1, 0.9, 0.8));
    const hd = new T.Group();
    hd.position.set(0, 1.5, 0.86);
    hd.userData.r0 = 0;
    hd.add(mk(Sp(0.27, 10), 0x3a2e55, 0, 0, 0));
    [1, -1].forEach((sd) => {
      hd.add(glow(Sp(0.13, 8), 0x9affe0, sd * 0.17, 0.05, 0.12));
      const an = new T.Group();
      an.position.set(sd * 0.1, 0.2, 0.1);
      an.rotation.set(-0.5, 0, -sd * 0.45);
      an.add(mk(Cy(0.015, 0.015, 0.55, 4), 0x2a2040, 0, 0.27, 0));
      const fe = mk(Cn(0.09, 0.32, 5), 0xd8c8a0, 0, 0.42, 0.02);
      fe.scale.z = 0.3;
      an.add(fe);
      an.add(glow(Sp(0.04, 6), 0xffe29a, 0, 0.58, 0));
      hd.add(an);
    });
    hd.add(halo(0x9affe0, 1.0, 0, 0.05, 0.15));
    I.add(hd);
    I.userData.head = hd;
    // two pairs of wings on pivots at the shoulders (flapped about z)
    const wm = M(WG, 1);
    wm.side = T.DoubleSide;
    I.userData.wings = [];
    [
      [1, 0.25, 1.15, 0.62],
      [-1, 0.25, 1.15, 0.62],
      [1, -0.2, 0.8, 0.5],
      [-1, -0.2, 0.8, 0.5],
    ].forEach(([sd, z, sz, sw]) => {
      const pv = new T.Group();
      pv.position.set(sd * 0.32, 1.55, z);
      const w = new T.Mesh(Cy(1, 1, 0.03, 16), wm);
      w.scale.set(sz * 0.85, 1, sw);
      w.position.set(sd * sz * 0.85, 0, -0.05);
      pv.add(w);
      const sp = glow(Cy(0.16, 0.16, 0.04, 10), 0xffd27a, sd * sz * 0.95, 0.01, -0.02);
      pv.add(sp);
      pv.add(mk(Cy(0.27, 0.27, 0.035, 10), 0x3a2e55, sd * sz * 0.95, 0.005, -0.02));
      pv.userData.sd = sd;
      I.add(pv);
      I.userData.wings.push(pv);
    });
    // small dangling legs
    [0.3, 0.05, -0.2].forEach((z) =>
      [1, -1].forEach((sd) => {
        const l = mk(Cy(0.025, 0.02, 0.4, 4), 0x2a2040, sd * 0.22, 1.02, z);
        l.rotation.z = sd * 0.35;
        I.add(l);
      }),
    );
    saddle(I, 1.82, 0.0, 0x5a3a6a);
  }
  const BUILD = { pony, ram, moth };
  function mountMesh(k) {
    const G = new T.Group(),
      I = new T.Group();
    I.userData = { legs: [], k };
    const A = MOUNTS[k] || {};
    (BUILD[k] || BUILD[A.b])(I);
    // v40 area mounts: recolour the base model (materials from M() are shared, so swap in copies)
    if (A.tint)
      I.traverse((m) => {
        const mt = m.material;
        if (!mt || !mt.color) return;
        const to = A.tint[mt.color.getHex()];
        if (to == null) return;
        m.material = mt.clone();
        m.material.color.setHex(to);
      });
    G.add(I);
    G.userData = { I, k, ph: 0 };
    G.traverse((m) => {
      if (m.isMesh) m.castShadow = true;
    });
    return G;
  }
  // w = 0..1 how much it moves, sp = gait speed; returns the seat bob (the rider follows it)
  function mountAnim(G, s, dt, w, sp) {
    const I = G.userData.I,
      u = I.userData,
      A = MOUNTS[u.k];
    G.userData.ph += dt * (6 + 6 * sp) * Math.max(0.15, w);
    const ph = G.userData.ph;
    u.legs.forEach((l, i) => (l.rotation.x = Math.sin(ph + [0, Math.PI, Math.PI, 0][i]) * 0.65 * w));
    if (u.head) u.head.rotation.x = u.head.userData.r0 + Math.sin(ph * 2) * 0.07 * w + Math.sin(s * 1.3) * 0.04;
    if (u.tail) u.tail.rotation.z = Math.sin(s * 2.3) * 0.25;
    if (u.lamp) u.lamp.rotation.x = Math.sin(ph) * 0.25 * w + Math.sin(s * 1.7) * 0.06;
    if (u.wings)
      u.wings.forEach((p, i) => {
        const f = Math.sin(s * (w > 0.3 ? 16 : 7) + (i > 1 ? 0.6 : 0));
        p.rotation.z = p.userData.sd * (0.15 + f * (0.35 + 0.25 * w));
      });
    const bob = A.fly ? 0.12 * Math.sin(s * 3) + 0.15 * w : Math.abs(Math.sin(ph)) * 0.09 * w;
    I.position.y = bob;
    I.rotation.x = A.fly ? 0.12 * w : 0;
    return bob;
  }
  // ---------- riding ----------
  const owns = (k) => (P.mounts || []).includes(k);
  function rideBlock() {
    if (mode !== "explore" || SLOT < 0) return "Not now.";
    if (!P.mt || !owns(P.mt) || !MOUNTS[P.mt])
      return "You have no mount yet. Hesper's stable on Market Lane sells them.";
    const x = W.position.x,
      z = W.position.z,
      zn = zoneAt(x, z);
    if (zn === "dun" || zn === "tower") return "Mounts can't come in here.";
    if (shopIn(x, z)) return "Leave your mount outside the shop.";
    return "";
  }
  function hideMine() {
    if (MNT.o) MNT.o.visible = false;
  }
  function seat(F1, F2) {
    if (!F1 || !F2) return;
    F1.position.z = F2.position.z = 0.35;
    F1.position.y = F2.position.y = 0.12;
  }
  function mountOn(quiet) {
    MNT.on = 1;
    P.ride = 1;
    if (!quiet) {
      puff(W.position.clone().setY(0.8), "heal", 8, 2, 0.6, 0.8);
      toast("Riding the " + MOUNTS[P.mt].n + "  (R to get off)", "#ffd27a");
      sv();
    }
  }
  function mountOff(msg) {
    if (!MNT.on) return;
    MNT.on = 0;
    hideMine();
    W.position.y = wGround();
    if (msg !== false) {
      P.ride = 0;
      sv();
    }
    if (msg) toast(msg, "#c9b8ff");
  }
  function mountToggle() {
    if (MNT.on) return mountOff();
    const r = rideBlock();
    if (r) return toast(r, "#ffb08a");
    mountOn();
  }
  window.mountToggle = mountToggle;
  window.mountSp = () => (MNT.on && MOUNTS[P.mt] ? MOUNTS[P.mt].sp : 1);
  window.mountPub = () => (MNT.on && mode === "explore" ? P.mt : 0);
  function pickMount(k) {
    const was = MNT.on;
    P.mt = k;
    sv();
    if (was) {
      puff(W.position.clone().setY(0.8), "heal", 6, 2, 0.5, 0.8);
      toast("Now riding the " + MOUNTS[k].n, "#ffd27a");
    }
  }
  addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "r" || e.repeat || mode !== "explore" || paused || SLOT < 0) return;
    const tg = e.target && e.target.tagName;
    if (tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT") return;
    if ($("chars").style.display !== "none") return;
    mountToggle();
  });
  // HUD button next to Run (shown once you own a mount)
  function hudBtn() {
    if (MNT.btn) return MNT.btn;
    const r = $("run");
    if (!r) return null;
    const b = document.createElement("button");
    b.className = "pb";
    b.id = "ridebtn";
    b.title = "Ride or get off your mount (R)";
    b.style.display = "none";
    b.onclick = () => {
      if (mode === "explore" && !paused) mountToggle();
      b.blur();
    };
    r.after(b);
    return (MNT.btn = b);
  }
  // ---------- the stable: Hesper, a display pony and a hay bale on Market Lane's west rim ----------
  NNAME.mstable = ["Hesper", "Stable & mounts"];
  {
    const ml = (d, r) => {
      const a = (d * Math.PI) / 180;
      return [OX + Math.cos(a) * r, OZ + MLZ + Math.sin(a) * r];
    };
    const [x, z] = ml(180, 11.5),
      ry = Math.PI / 2,
      o = person({ robe: 0x5a4a2a, trim: 0xd9a35a, hat: "round", hc: 0x3a2a18, apron: 0x8a6a3a, prop: "lamp" });
    const mkr = new T.Sprite(AM(SP.heal));
    mkr.scale.setScalar(1.5);
    mkr.position.y = 4.2;
    o.add(mkr);
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    S.add(o);
    solids.push({ x, z, r: 1.1 });
    const n = { o, kind: "m", id: "stable", mkr, x, z, ry };
    NPCS.push(n);
    npcPlate(n);
    const [px, pz] = ml(166, 12),
      st = mountMesh("pony");
    st.position.set(px, 0, pz);
    st.rotation.y = 0.35;
    S.add(st);
    solids.push({ x: px, z: pz, r: 1.2 });
    MNT.st = st;
    const [hx, hz] = ml(154, 12.8),
      hay = new T.Group();
    hay.add(mk(B(1.1, 0.6, 0.7), 0xc9a24a, 0, 0.3, 0));
    hay.add(mk(B(1.12, 0.06, 0.72), 0x8a6a2a, 0.25, 0.3, 0));
    hay.add(mk(B(1.12, 0.06, 0.72), 0x8a6a2a, -0.25, 0.3, 0));
    hay.position.set(hx, 0, hz);
    hay.rotation.y = 0.6;
    S.add(hay);
    solids.push({ x: hx, z: hz, r: 0.7 });
  }
  // ---------- per frame (called from the main loop after animW) ----------
  window.mountTick = (dt, s) => {
    // a different character was loaded: forget the old ride, pick up this one's saved state
    if (MNT.pp !== P) {
      MNT.pp = P;
      MNT.on = 0;
      hideMine();
      MNT.auto = 1;
    }
    if (MNT.auto && SLOT >= 0 && mode === "explore" && !paused) {
      MNT.auto = 0;
      if (P.ride && !rideBlock()) mountOn(1);
    }
    if (MNT.on) {
      if (mode !== "explore")
        mountOff(); // a battle or cutscene started: hop off
      else if (SLOT < 0)
        mountOff(false); // back at the character slots: keep the saved ride state
      else {
        const r = rideBlock(); // teleported into a dungeon, the tower or a shop room
        if (r) mountOff(r);
      }
    }
    if (MNT.on) {
      if (!MNT.o || MNT.k !== P.mt) {
        if (MNT.o) S.remove(MNT.o);
        MNT.o = mountMesh(P.mt);
        MNT.k = P.mt;
        S.add(MNT.o);
      }
      const G = MNT.o;
      G.visible = true;
      G.position.set(W.position.x, 0, W.position.z);
      G.rotation.y = W.rotation.y;
      MNT.w += ((mv ? 1 : 0) - MNT.w) * Math.min(1, dt * 6);
      const bob = mountAnim(G, s, dt, MNT.w, run ? 1 : 0.5);
      W.position.y = MOUNTS[P.mt].h + bob + wGround();
      W.rotation.x = 0.02;
      seat(FL, FR);
      AL.rotation.x = AR.rotation.x = -0.55;
      if (MNT.k === "ram" && MNT.w > 0.5 && Math.random() < dt * 4)
        puff(G.userData.I.userData.ember.getWorldPosition(new T.Vector3()), "fire", 1, 0.6, 0.5, 0.5);
    }
    // other players' mounts
    PEERS.forEach((p, id) => {
      const k = p.pr && p.pr.ap && p.pr.ap.mt,
        ride = k && MOUNTS[k] && p.o.visible;
      let e = MNT.peer.get(id);
      if (ride) {
        if (!e || e.k !== k) {
          if (e) S.remove(e.o);
          e = { k, o: mountMesh(k), w: 0 };
          MNT.peer.set(id, e);
          S.add(e.o);
        }
        e.o.position.set(p.o.position.x, 0, p.o.position.z);
        e.o.rotation.y = p.o.rotation.y;
        e.w = p.ws || 0;
        const bob = mountAnim(e.o, s, dt, e.w > 0.15 ? e.w : 0, 0.7);
        p.o.position.y = MOUNTS[k].h + bob;
        p.o.rotation.x = 0.02;
        const pt = p.o.__pt;
        if (pt) {
          seat(pt.FL, pt.FR);
          if (pt.AL && pt.AR && !(p.cT > 0)) pt.AL.rotation.x = pt.AR.rotation.x = -0.55;
        }
        p.rid = 1;
      } else if (e) {
        S.remove(e.o);
        MNT.peer.delete(id);
        if (p.rid) p.o.position.y = 0;
        p.rid = 0;
      }
    });
    MNT.peer.forEach((e, id) => {
      if (!PEERS.has(id)) {
        S.remove(e.o);
        MNT.peer.delete(id);
      }
    });
    // the stable's display pony idles (only when you're near enough to see it)
    if (
      MNT.st &&
      mode === "explore" &&
      Math.abs(W.position.x - MNT.st.position.x) + Math.abs(W.position.z - MNT.st.position.z) < 60
    )
      mountAnim(MNT.st, s, dt, 0, 0);
    // HUD button
    const b = hudBtn();
    if (b) {
      const show = mode === "explore" && SLOT >= 0 && (P.mounts || []).length > 0,
        key = (show ? 1 : 0) + ":" + MNT.on;
      if (key !== MNT.bk) {
        MNT.bk = key;
        b.style.display = show ? "" : "none";
        b.textContent = MNT.on ? "Get off" : "Ride";
      }
    }
  };
  // ---------- stable shop + Book > World > Mounts (drawn after panel() lays out its empty page) ----------
  const wg = BOOKG.find((G) => G[0] === "travel");
  if (wg && wg[2]) wg[2].push(["mounts", "Mounts"]);
  const swatch = { pony: "#2c3452", ram: "#d8ccb4", moth: "#8a76c0" };
  // shop: list for sale (Hesper: the mounts without zn; a village outfitter passes its zone as zn). Book: owned ones.
  function rows(L, shop, re, zn) {
    const row = (h, b) => {
      const r = document.createElement("div");
      r.className = "row";
      r.innerHTML = h;
      if (b) r.appendChild(b);
      L.appendChild(r);
    };
    const btn = (t, dis, fn) => {
      const b = document.createElement("button");
      b.className = "pb";
      b.textContent = t;
      b.disabled = dis;
      b.onclick = fn;
      return b;
    };
    Object.keys(MOUNTS).forEach((k) => {
      const A = MOUNTS[k],
        own = owns(k),
        act = P.mt === k;
      if (!shop && !own) return;
      if (shop && (A.zn || "") !== (zn || "")) return;
      const info =
        '<div style="display:flex;gap:10px;align-items:center"><i style="flex:none;width:26px;height:26px;border-radius:50%;background:' +
        (swatch[k] || A.sw || "#888") +
        ';border:2px solid #e8c777"></i><div><b>' +
        A.n +
        (act ? "  ·  riding" : "") +
        "</b><small>" +
        A.d +
        "  ·  Speed x" +
        A.sp +
        (shop && !own ? "  ·  Needs level " + A.lv : "") +
        "</small></div></div>";
      let b;
      if (own)
        b = btn(act ? "Chosen" : "Choose", act, () => {
          pickMount(k);
          re();
        });
      else {
        const lvOk = P.lvl >= A.lv;
        b = btn(lvOk ? CUR.ic + A.c : "Lv " + A.lv, !lvOk || P.gold < A.c, () => {
          if (P.gold < A.c || owns(k)) return;
          P.gold -= A.c;
          P.mounts = (P.mounts || []).concat(k);
          if (!P.mt) P.mt = k;
          sv();
          ui();
          toast("You bought the " + A.n + "! Press R (or Ride) to mount up.", "#ffd27a");
          re();
        });
      }
      row(info, b);
    });
    if (!shop && !(P.mounts || []).length)
      row(
        "<div><b>No mounts yet</b><small>Hesper keeps a stable on Market Lane, by Bram's Goods. Each zone village's outfitter sells a mount of its own.</small></div>",
      );
    if ((P.mounts || []).length)
      row(
        "<div><b>" +
          (MNT.on ? "Riding" : "On foot") +
          "</b><small>Press R or the Ride button to get on or off. Mounts stay outside dungeons and shops, and you hop off when a fight starts.</small></div>",
        btn(MNT.on ? "Get off" : "Ride", false, () => {
          $("pc").click();
          mountToggle();
        }),
      );
  }
  MNT.rows = rows; // v40: village outfitters (61-villages.js) list their zone's mounts with it
  const panel0 = panel;
  panel = function (k, id) {
    panel0(k, id);
    const L = $("pl");
    if (k === "stable") {
      $("pt").textContent = 'Hesper: "Every lamplighter walks. The good ones ride."   ' + CUR.ic + P.gold;
      rows(L, 1, () => panel("stable", id));
    } else if (k === "book" && BOOKL.last === "mounts") rows(L, 0, () => panel("book", "mounts"));
  };
})();
