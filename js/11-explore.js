// DUSKWICK - 11-explore.js: Exploring: themes, quest helper, minimap, patrol(), walk() (movement, interact, camera), main loop.
// Loaded in order by index.html as plain scripts; they share one global scope.
// ---------- exploring ----------
const TH = {
  hub: [
    0x6a4278, // v14: warmer, lighter fog and ground bounce around the lantern
    "radial-gradient(circle at 80% 17%,#fff7d6 0 20px,rgba(255,247,214,.32) 21px 64px,transparent 66px),linear-gradient(#1c1238 0%,#4e2e66 42%,#a34f72 70%,#f0a070 100%)",
    0xffd8b0,
    0x5a4878,
    0xffc08a,
  ],
  frost: [
    0x4a5c80,
    "radial-gradient(circle at 22% 14%,#eef4ff 0 14px,rgba(220,235,255,.22) 15px 44px,transparent 46px),linear-gradient(#060c22 0%,#16264a 45%,#3a5480 78%,#6f86ac 100%)",
    0x8fa6cc,
    0x232c48,
    0x9ab4e0,
  ],
  marsh: [
    0x1f4a48,
    "radial-gradient(circle at 70% 16%,#d8ffe8 0 12px,rgba(170,255,220,.22) 13px 40px,transparent 42px),linear-gradient(#04100f 0%,#0c2a2c 45%,#1f5a54 78%,#5aa890 100%)",
    0x9fe8d0,
    0x16302c,
    0x7fe0c0,
  ],
  ember: [0x4a1810, "linear-gradient(#1a0505,#6a1a10 55%,#ff8a3a)", 0xff9a60, 0x401010, 0xff7a3a],
  tower: [0x1a1030, "linear-gradient(#07040f,#241447 60%,#5a2a7a)", 0xb9a0ff, 0x1a1030, 0x9a80ff],
  dun0: [0x0c1a12, "linear-gradient(#030806,#0c1e14 60%,#1a3a24)", 0xa8ffc8, 0x1a2a20, 0x7dffb0],
  dun1: [0x0c1424, "linear-gradient(#03060e,#0e1a30 60%,#1e3456)", 0xb8dcff, 0x1a2238, 0x8ad0ff],
  dun2: [0x1c0a06, "linear-gradient(#0a0302,#2a0c06 60%,#5a1a0a)", 0xffb080, 0x2a1010, 0xff8a3d],
};
let lastTh = ""; // v14: theme of the last frame walked (trails cross zones without a portal)
// every number and colour a zone's look is made of (theme() applies one, themeMix() blends two along a trail)
function thP(z) {
  const t = TH[z] || TH.hub,
    dn = z.startsWith("dun"),
    L = dn
      ? [0.78, 0.42, 0.2]
      : {
          hub: [0.88, 0.6, 0.2], // v14 town brighter than the wilds; v29c toned down (was 1.05/.7/.3, washed out)
          frost: [0.6, 0.34, 0.1],
          ember: [0.8, 0.55, 0.16],
          marsh: [0.62, 0.4, 0.14],
          tower: [0.8, 0.5, 0.16],
        }[z] || [0.8, 0.55, 0.16];
  return {
    fog: t[0],
    sky: t[1],
    hl: t[2],
    gc: t[3],
    sun: t[4],
    L,
    dn,
    // v34: outdoor view distance raised ~30% (dungeons unchanged)
    near: dn ? 20 : z === "frost" || z === "marsh" ? 34 : z === "hub" ? 54 : 44,
    far: dn ? 72 : z === "frost" || z === "marsh" ? 96 : z === "hub" ? 142 : 125,
    mc: {
      hub: [0x24163a, 0x352254],
      frost: [0x4a6c94, 0x6f90b8],
      ember: [0x1c0806, 0x34120c],
      marsh: [0x0e2422, 0x1c3c38],
      tower: [0x24163a, 0x352254],
    }[z] || [0x24163a, 0x352254],
  };
}
// the sky behind the canvas: a second layer fades in over it while you walk a trail
let skyB = null,
  skyA0 = "",
  skyB0 = "";
function skySet(a, b, k) {
  if (!skyB) {
    skyB = document.createElement("div");
    skyB.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0";
    R.domElement.style.position = "relative"; // keeps the canvas painted above the fading layer
    stage.insertBefore(skyB, R.domElement);
  }
  if (a !== skyA0) stage.style.background = skyA0 = a;
  if (b && b !== skyB0) skyB.style.background = skyB0 = b;
  skyB.style.opacity = b ? k.toFixed(3) : "0";
}
const thC2 = new T.Color();
function themeApply(A, B, k) {
  const mix = (a, b, o) => o.setHex(a).lerp(thC2.setHex(B ? b : a), B ? k : 0),
    num = (a, b) => (B ? a + (b - a) * k : a);
  mix(A.fog, B && B.fog, S.fog.color);
  HL.intensity = num(A.L[0], B && B.L[0]);
  sun.intensity = num(A.L[1], B && B.L[1]);
  AMB.intensity = num(A.L[2], B && B.L[2]);
  S.fog.near = num(A.near, B && B.near);
  S.fog.far = num(A.far, B && B.far);
  mix(A.hl, B && B.hl, HL.color);
  mix(A.gc, B && B.gc, HL.groundColor);
  mix(A.sun, B && B.sun, sun.color);
  MTG.visible = !A.dn;
  MTN.forEach(([m, l]) => mix(A.mc[l], B && B.mc[l], m.color));
  skySet(A.sky, B && B.sky, k);
}
function theme(z) {
  themeApply(thP(z), null, 0);
}
// v14 trails: blend zone a's look into zone b's (k 0..1)
function themeMix(a, b, k) {
  themeApply(thP(a), thP(b), k);
}
const fclear = (i) => foes.filter((f) => f.tw === i + 1).every((f) => f.dead);
// chests: always a piece of gear (Uncommon or better) plus gold, scaled to the zone
function openChest(c) {
  c.open = 1;
  P.chest = P.chest || {};
  P.chest[c.i] = 1;
  const z = zoneAt(c.x, c.z),
    zb = { hub: 0, frost: 1, ember: 1.5, marsh: 2, tower: 2, dun: 1.8 }[z] || 0;
  // the chest pops open, then shrinks away for good (opened chests used to linger and look like a fresh one)
  tw(500, (k) => {
    c.lid.rotation.x = -1.9 * Math.sin(k * 1.57);
  })
    .then(() => {
      c.gl.visible = false;
      return wait(700);
    })
    .then(() => tw(450, (k) => c.o.scale.setScalar(Math.max(0.01, 1 - k))))
    .then(() => {
      c.o.visible = false;
    });
  puff(new T.Vector3(c.x, 1.2, c.z), "heal", 18, 3, 0.9, 1);
  ring(c.x, 0xffd27a, 3, 500, c.z);
  const gd = Math.round((20 + Math.random() * 15) * (1 + zb) * (1 + 0.1 * P.lvl));
  P.gold += gd;
  const n = Object.keys(P.chest).length;
  toast("Treasure chest! +" + gd + " ✦  (" + n + "/" + CHESTS.length + " found)", "#ffd27a");
  giveItem(genItem(null, P.lvl + (zb >= 1.5 ? 1 : 0), Math.max(1, rollR(zb + 1.5))));
  ui();
  sv();
}
// snuffed lamps: light them all for a rare reward
function setLamp(L) {
  L.s.material.color.setHex(L.lit ? 0xffd27a : 0x8a5aff);
  L.s.material.opacity = L.lit ? 0.95 : 0.6;
  L.s.scale.setScalar(L.lit ? 2.6 : 1.6);
  L.cg.material = M(L.lit ? 0xffe29a : 0x3a3450);
}
function relight(L) {
  L.lit = 1;
  P.lit = P.lit || {};
  P.lit[L.i] = 1;
  setLamp(L);
  puff(new T.Vector3(L.x, 3.3, L.z), "fire", 16, 2.5, 0.8, 1);
  ring(L.x, 0xffd27a, 2.5, 450, L.z);
  const xp = 15 + 6 * P.lvl,
    n = Object.keys(P.lit).filter((k) => k !== "all").length;
  P.xp += xp;
  P.gold += 8;
  toast("Lamp relit! +" + xp + " XP  (" + n + "/" + LAMPS.length + " burning again)", "#ffd27a");
  if (n >= LAMPS.length && !P.lit.all) {
    P.lit.all = 1;
    toast("Every snuffed lamp burns again! Oona sends a gift.", "#c38bff");
    giveItem(genItem(null, P.lvl + 1, 3));
  }
  lvup();
  ui();
  sv();
}
function refreshFinds() {
  CHESTS.forEach((c) => {
    c.open = !!(P.chest && P.chest[c.i]);
    c.lid.rotation.x = 0;
    c.gl.visible = !c.open;
    c.o.visible = !c.open;
    c.o.scale.setScalar(1);
  });
  LAMPS.forEach((L) => {
    L.lit = !!(P.lit && P.lit[L.i]);
    setLamp(L);
  });
}
// dungeons: foes come back each time you enter; the boss hall opens once the halls are clear; first clear pays a big bonus
function dunReset(i) {
  foes
    .filter((f) => f.dun === i && !f.edHid)
    .forEach((f) => {
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
    });
}
const dunPre = (i) => foes.filter((f) => f.dun === i && !f.dboss).every((f) => f.dead),
  dunBoss = (i) => foes.filter((f) => f.dun === i && f.dboss).every((f) => f.dead);
function dunWin(i) {
  const D = DUN[i];
  P.dun = P.dun || {};
  const first = !P.dun[i];
  P.dun[i] = (P.dun[i] || 0) + 1;
  if (first) {
    const gd = 120 + 80 * i;
    P.gold += gd;
    toast(D.n + " cleared for the first time! +" + gd + " ✦ and an Epic reward", "#c38bff");
    giveItem(genItem(null, P.lvl + 1, 3));
  } else toast(D.n + " cleared again (" + P.dun[i] + "x)", "#ffd27a");
}
const zoneName = (x, z) => {
  const q = zoneAt(x, z);
  return q === "dun"
    ? DUN[dunIdx(x)].n
    : {
        hub: "Lamplight Square",
        frost: "Frostfen",
        ember: "Cinderwaste",
        marsh: "Mirewick Marsh",
        tower: "Gloomspire",
      }[q];
};
const themeKey = (x, z) => {
  const q = zoneAt(x, z);
  return q === "dun" ? "dun" + dunIdx(x) : q;
};
// v14: where a trail leaves its first zone (sA) and enters its last (sB), and which looks it blends between (ta -> tb)
function trSpan(t) {
  const ctr = ZCEN, // v45: live zone centres (moved by the re-layout)
    w = (s) => {
      const q = rdAt(t, s);
      return [OX + q[0], OZ + q[1]];
    },
    p0 = w(0),
    p1 = w(t.L);
  t.ta = zoneAt(p0[0], p0[1]);
  t.tb = zoneAt(p1[0], p1[1]);
  const c0 = ctr[t.ta],
    c1 = ctr[t.tb];
  t.sA = 0;
  if (c0) while (t.sA < t.L && Math.hypot(w(t.sA)[0] - c0[0], w(t.sA)[1] - c0[1]) < ZR) t.sA += 1;
  t.sB = t.L;
  if (c1) while (t.sB > t.sA && Math.hypot(w(t.sB)[0] - c1[0], w(t.sB)[1] - c1[1]) < ZR) t.sB -= 1;
}
// ---------- v14 zone loading ----------
// The far places (Frostfen, Cinderwaste, Mirewick, each trail, the Gloomspire floors, each dungeon) are switched off
// while the camera is far from them and back on as you near them, so the renderer skips thousands of objects you could
// never see through the fog anyway. Static world pieces are moved into one holder Group per place (after the editor's
// BASE snapshot, which keeps its own references) and the holder is shown or hidden. Their own visible flags are left to
// the game. Never moved: anything holding a light (the light pool needs a fixed light count), foes, NPCs, portals,
// chests, lamps, weather, fireflies, the battle frame and the mountain backdrop. Lamplight itself is never switched off.
const ZCUL = [];
const zcKey = (x, z) => {
  const si = zsIdxO(x, z); // v16: each zone street is its own place (v43: pieces are still built at the old coords)
  if (si >= 0) return "st" + si;
  const q = zoneAt(x, z);
  if (q === "dun") return "dun" + dunIdx(x);
  if (q === "tower") return "tower";
  for (const [k, cx, cz] of [
    ["frost", 600, -400],
    ["ember", -600, -400],
    ["marsh", MWX, MWZ],
  ])
    if (Math.hypot(x - cx, z - cz) < ZR + 45) return k;
  const t = trOn(x, z, 45);
  return t ? "tr" + t.i : null;
};
function zoneCullInit() {
  if (ZCUL.length) return;
  const skip = new Set(),
    sk = (o) => o && skip.add(o);
  foes.forEach((f) => sk(f.o));
  NPCS.forEach((n) => [n.o, n.mkr, n.qm, n.np].forEach(sk));
  PT.forEach((q) => [q.r, q.g].forEach(sk));
  CHESTS.forEach((c) => sk(c.o));
  LAMPS.forEach((L) => [L.s, L.cg].forEach(sk));
  [BG, FF, WX, MTG, W].forEach(sk);
  const range = (a, b) => S.children.slice(a || 0, b == null ? S.children.length : b),
    cand = range(window.__w0, window.__w1).concat(range(window.__t0)),
    box = new T.Box3(),
    v = new T.Vector3(),
    sz = new T.Vector3(),
    mx = new T.Matrix4(),
    by = {};
  cand.forEach((o) => {
    if (skip.has(o) || o.isLight || o.parent !== S) return;
    let lit = false;
    o.traverse((c) => {
      if (c.isLight) lit = true;
    });
    if (lit) return;
    if (o.isInstancedMesh) {
      box.makeEmpty();
      for (let k = 0; k < o.count; k++) {
        o.getMatrixAt(k, mx);
        v.setFromMatrixPosition(mx);
        if (v.lengthSq() > 0) box.expandByPoint(v);
      }
    } else box.setFromObject(o);
    if (box.isEmpty()) return;
    box.getSize(sz);
    box.getCenter(v);
    // spans more than one place: always drawn (v16: a zone street's long pieces still load with their street)
    if (Math.max(sz.x, sz.z) > (zsIdxO(v.x, v.z) >= 0 ? 460 : 240)) return;
    const k = zcKey(v.x, v.z);
    if (!k) return;
    if (!by[k]) by[k] = { k, list: [], b: [1e9, -1e9, 1e9, -1e9] };
    const G = by[k];
    G.list.push(o);
    G.b[0] = Math.min(G.b[0], box.min.x);
    G.b[1] = Math.max(G.b[1], box.max.x);
    G.b[2] = Math.min(G.b[2], box.min.z);
    G.b[3] = Math.max(G.b[3], box.max.z);
  });
  Object.values(by).forEach((G) => {
    const h = new T.Group();
    h.name = "zone:" + G.k;
    S.add(h);
    G.list.forEach((o) => {
      S.remove(o);
      h.add(o);
    });
    G.h = h;
    G.on = true;
    ZCUL.push(G); // v43: a street's holder ("st<i>") is turned into its moved frame later by OPENR.move (64)
  });
}
// a place is drawn while the camera is within 150 of its bounds (the thickest fog ends at 110)
function zoneCullTick() {
  const x = C.position.x,
    z = C.position.z;
  for (const G of ZCUL) {
    const b = G.b,
      dx = Math.max(b[0] - x, 0, x - b[1]),
      dz = Math.max(b[2] - z, 0, z - b[3]),
      on = dx * dx + dz * dz < 150 * 150;
    if (on !== G.on) G.h.visible = G.on = on;
  }
}
function towerReset() {
  foes
    .filter((f) => f.tw && !f.edHid)
    .forEach((f) => {
      // v30: the Warden and his knights stay at rest until you've read the Last Lamp stone beside them
      // (foe deaths aren't saved, so after a reload they're put back to rest here)
      if (f.tw === 3 && P.warden > 0 && !(P.done && P.done[14])) {
        if (!f.dead) {
          f.dead = 1;
          f.rt = Infinity;
          S.remove(f.o);
        }
        return;
      }
      if (f.dead) {
        f.dead = 0;
        S.add(f.o);
      }
      f.o.position.set(f.hx, 0, f.hz);
    });
}
function tp(q) {
  if (q.lock) {
    const m = q.lock();
    if (m) {
      if (!q.warned) {
        q.warned = 1;
        toast(m);
        setTimeout(() => {
          q.warned = 0;
        }, 3000);
      }
      return;
    }
  }
  W.position.set(q.to[0], 0, q.to[1]);
  if (q.dy != null) {
    // v18 shop doors: turn you and the camera together, so the keys you're holding keep walking you the same way
    // (out of the door) instead of flipping the camera and walking you straight back in
    W.rotation.y += q.dy;
    yaw += q.dy;
  } else {
    W.rotation.y = q.to[2] || 0;
    yaw = W.rotation.y + Math.PI;
  }
  snap = true;
  theme(themeKey(q.to[0], q.to[1]));
  ptcd = performance.now() + 1500;
  grace = performance.now() + 2500;
  if (q.on) q.on();
  // v46c: no arrival burst for portals you walk through (it read as a loading flash); other teleports keep it
  if (!PT.includes(q)) puff(W.position.clone().setY(1.5), "storm", 16, 4, 0.8, 1);
}
const joy = $("joy"),
  knob = $("knob"),
  RC = new T.Raycaster(),
  MP = new T.Vector2();
function jm(e) {
  const r = joy.getBoundingClientRect();
  let dx = e.clientX - r.left - r.width / 2,
    dy = e.clientY - r.top - r.height / 2;
  const l = Math.hypot(dx, dy),
    m = 44;
  if (l > m) {
    dx *= m / l;
    dy *= m / l;
  }
  jv = { x: dx / m, y: dy / m };
  knob.style.transform = "translate(" + dx + "px," + dy + "px)";
}
function jend() {
  jv = { x: 0, y: 0 };
  knob.style.transform = "";
}
joy.addEventListener("pointerdown", (e) => {
  joy.setPointerCapture(e.pointerId);
  jm(e);
});
joy.addEventListener("pointermove", (e) => {
  if (joy.hasPointerCapture(e.pointerId)) jm(e);
});
joy.addEventListener("pointerup", jend);
joy.addEventListener("pointercancel", jend);
$("run").onclick = () => {
  runT = !runT;
  $("run").classList.toggle("on", runT);
};
const cycle = () => {
  const a = alive();
  if (a.length < 2) return;
  const i = a.indexOf(tgt());
  g.tgt = g.foes.indexOf(a[(i + 1) % a.length]);
  ui();
};
stage.addEventListener("pointerdown", (e) => {
  if (mode === "guest" && e.target === R.domElement) bdr = { id: e.pointerId, x: e.clientX, y: e.clientY };
  if (mode === "battle") {
    if (e.target !== R.domElement) return;
    bdr = { id: e.pointerId, x: e.clientX, y: e.clientY };
    const r = R.domElement.getBoundingClientRect();
    MP.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
    RC.setFromCamera(MP, C);
    const a = alive(),
      h = RC.intersectObjects(
        a.map((f) => f.m),
        true,
      )[0];
    if (h) {
      const f = a.find((f) => {
        for (let q = h.object; q; q = q.parent) if (q === f.m) return true;
      });
      if (f) {
        g.tgt = g.foes.indexOf(f);
        ui();
      }
    }
    return;
  }
  if (mode !== "explore" || joy.contains(e.target) || paused) return;
  dr = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
// in battle, drag to swing the camera around the circle and use the wheel to zoom; it stays where you leave it
let bdr = null,
  bYaw = 0,
  bZoom = 1;
stage.addEventListener("pointermove", (e) => {
  if (bdr && e.pointerId === bdr.id && (mode === "battle" || mode === "guest")) {
    bYaw = Math.max(-1.1, Math.min(1.1, bYaw - (e.clientX - bdr.x) * 0.006));
    bZoom = Math.max(0.6, Math.min(1.5, bZoom + (e.clientY - bdr.y) * 0.004));
    bdr.x = e.clientX;
    bdr.y = e.clientY;
    return;
  }
});
addEventListener("pointerup", (e) => {
  if (bdr && e.pointerId === bdr.id) bdr = null;
});
stage.addEventListener("pointermove", (e) => {
  if (!dr || e.pointerId !== dr.id) return;
  yaw -= (e.clientX - dr.x) * 0.008;
  camH = Math.min(13, Math.max(3.5, camH + (e.clientY - dr.y) * 0.04));
  dr.x = e.clientX;
  dr.y = e.clientY;
});
const dend = (e) => {
  if (dr && e.pointerId === dr.id) dr = null;
};
stage.addEventListener("pointerup", dend);
stage.addEventListener("pointercancel", dend);
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = 1;
  if (k === "e" && (window.__ln || window.__ch || window.__np) && mode === "explore" && !paused) {
    keys[k] = 0;
    if (!e.repeat) window.__eK = 1;
  }
  if (k === "tab" && mode === "battle") {
    e.preventDefault();
    cycle();
  }
  if (k === "x" && mode === "battle") setSpd(SPD === 1 ? 2 : 1);
  if ((mode === "battle" && g && !g.busy) || mode === "guest") {
    if (k >= "1" && k <= "9") {
      const i = +k - 1;
      if (g.hand[i]) play(i);
    } else if (k === " " || k === "enter") {
      e.preventDefault();
      // a held key, or a press left over from skipping a cutscene, must not throw the fresh turn away
      if (!e.repeat && (mode === "guest" || !g.intro) && performance.now() - ((g && g.tAt) || 0) > 900) endTurn();
    } else if (k === "f") flee();
  }
  // v47 polish: Esc opens the Book on Options, Tab on Quests (either closes the Book when it is open).
  // Only when nothing else is up that Esc belongs to (map, fishing, rune menu, photo mode, cutscenes, menus).
  const bookOpen = $("panel").style.display === "flex";
  const freeKey = () =>
    mode === "explore" &&
    !paused &&
    !e.repeat &&
    $("chars").style.display === "none" &&
    $("cls").style.display !== "flex" &&
    !document.body.classList.contains("cut") &&
    !(typeof CUT !== "undefined" && CUT) &&
    !$("rnm") &&
    !(typeof ATLAS !== "undefined" && ATLAS.isOpen && ATLAS.isOpen()) &&
    !(typeof ANGLE !== "undefined" && ANGLE.busy && ANGLE.busy()) &&
    !(e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
  if (k === "escape") {
    if (bookOpen) $("pc").click();
    else if (freeKey()) panel("book", "options");
    else $("pc").click();
  }
  if (k === "tab" && mode === "explore") {
    if (bookOpen) {
      e.preventDefault();
      $("pc").click();
    } else if (freeKey()) {
      e.preventDefault();
      panel("book", "quests");
    }
  }
  if (
    (k === "i" || k === "b") &&
    mode === "explore" &&
    !e.repeat &&
    $("chars").style.display === "none" &&
    $("cls").style.display !== "flex"
  ) {
    if (!paused) panel(k === "i" ? "bag" : "book");
    else if ($("panel").style.display === "flex") $("pc").click();
  }
});
stage.addEventListener(
  "wheel",
  (e) => {
    if (mode === "explore" && !paused) {
      camD = Math.min(18, Math.max(6, camD + e.deltaY * 0.01));
      e.preventDefault();
    } else if (mode === "battle" || mode === "guest") {
      bZoom = Math.max(0.6, Math.min(1.5, bZoom + e.deltaY * 0.001));
      e.preventDefault();
    }
  },
  { passive: false },
);
addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = 0));
addEventListener("blur", () => {
  for (const k in keys) keys[k] = 0;
});
// ---------- quest helper: where the tracked quest wants you to go (in the zone you are in now; otherwise the way out toward it) ----------
const nearTF = (z) => TF.reduce((a, c) => (Math.abs(c.z - z) < Math.abs(a.z - z) ? c : a));
const QPOS = {
  0: ["hub", OX, OZ - 50],
  1: ["hub", OX, OZ - 50],
  2: ["hub", OX, OZ - 50],
  3: ["hub", OX, OZ + PZ],
  5: ["frost", 598, -412],
  6: ["ember", -602, -412],
  7: ["tower", 0, -1021],
  8: ["hub", OX - 8.5, OZ - 8.5],
  9: ["hub", OX + RDS[0].gx, OZ + RDS[0].gz],
  10: ["hub", OX + RDS[0].gx + 13.6, OZ + RDS[0].gz],
  11: ["frost", 626.5, -424],
  12: ["hub", OX + RDS[1].gx - 13.6, OZ + RDS[1].gz],
  13: ["ember", -588, -430],
  14: ["tower", -7, -1015],
  16: ["hub", OX, OZ - 50],
  17: ["frost", 598, -427],
  18: ["ember", -602, -412],
};
DUN.forEach((D, i) => (QPOS[18 + 1 + i] = [D.z, D.door[0], D.door[1]]));
// v15 street quests point at the middle of their street
QS.forEach((q, i) => {
  if (q.wh) QPOS[i] = typeof q.wh === "function" ? q.wh() : q.wh; // v21 quests that name a place (or a person)
  if (!q.sk) return;
  const t = ZRD.find((r) => r.n === q.sk);
  if (t) {
    const [lx, lz] = rdAt(t, t.L * 0.6);
    QPOS[i] = [t.zk, OX + lx, OZ + lz];
    return;
  }
  RDSEC.forEach((secs, ri) => {
    const si = secs.indexOf(q.sk);
    if (si < 0) return;
    const R = RDS[ri],
      a = [0, R.cs[0], R.cs[2]][si],
      b = [R.cs[0], R.cs[2], R.L][si],
      [lx, lz] = rdAt(R, (a + b) / 2);
    QPOS[i] = ["hub", OX + lx, OZ + lz];
  });
});
// v16: zone streets and shop rooms are their own places, reached through loading arches / doors. Point at the way out
// of the one you are in, or the way into the one the target is in; null when no detour is needed.
function placeRoute(tz0, tx, tz) {
  const p = W.position,
    sp = zsIdx(p.x, p.z),
    st = zsIdx(tx, tz),
    hp = shopIn(p.x, p.z),
    ht = shopIn(tx, tz);
  if (hp && hp !== ht) return hp.door;
  if (sp >= 0 && sp !== st) return zsP(ZSX0 + sp * ZSDX, 2); // v43: the street start, wherever the street stands
  if (ht && ht !== hp && zcur === "hub") {
    const q = PT.find((o) => o.to && shopIn(o.to[0], o.to[1]) === ht);
    return q ? [q.x, q.z] : null;
  }
  if (st >= 0 && st !== sp && ZSTR[st][0] === zcur) return zsGate(ZRD[st]);
  return null;
}
function qWhere(i) {
  const q = QS[i];
  const a = P.qa[i] != null && !P.rdy[i];
  // v22: before a quest and once it is ready to hand in (every quest, not just story ones), point at the giver herself
  // v24: the giver is found by its giver key (qGv / npcGv, 06): Oona, Tamsin, Brenna, Vesna, Old Maud or Wren
  const gk = qGv(q),
    gn = !a && NPCS.find((n) => npcGv(n) === gk);
  let t = a
    ? QPOS[i]
    : gn
      ? [zoneAt(gn.x, gn.z), gn.x, gn.z]
      : {
          hub: ["hub", OX + 11, OZ + 7.6],
          frost: ["frost", 608, -378],
          ember: ["ember", -592, -378],
          marsh: ["marsh", MWX + 10, MWZ + 16],
        }[gk];
  // v25: Hollow whispers points at the nearest glade lore stone (2 or 3) you haven't read yet, where it really stands
  if (a && q.n === "Hollow whispers") {
    // v34: skip a stone behind a still-locked gate (the west glade waits on the Ashen Trail ice wall); if that's the
    // only one left, point at what opens it (the Rimefang Matriarch's den in Frostfen)
    const p = W.position,
      un = LS.filter((L) => (L.i === 2 || L.i === 3) && !P.lore[L.i]),
      lk = (L) => !lockOK(L.x - OX, L.z - OZ, Math.abs(L.x - OX)),
      L = un
        .filter((L) => !lk(L))
        .sort((u, v) => Math.hypot(u.x - p.x, u.z - p.z) - Math.hypot(v.x - p.x, v.z - p.z))[0];
    if (L) t = [zoneAt(L.x, L.z), L.x, L.z];
    else if (un.length) t = gOpen("frost") ? ["frost", 566, -416.2] : ["hub", DUN[0].door[0], DUN[0].door[1]];
  }
  if (a && i === 10 && !gOpen("frost")) t = ["hub", DUN[0].door[0], DUN[0].door[1]];
  if (a && i === 12 && !gOpen("ashen")) t = ["frost", 566, -416.2];
  if (a && i === 3 && P.lvl < 4) return null;
  if (!t || (!qOpen(i) && P.qa[i] == null)) return null;
  const zc = zcur,
    p = W.position;
  if (zc === "dun") {
    const D = DUN[dunIdx(p.x)];
    return [D.bx, D.bz + D.R[0][2] - 1.2];
  }
  if (zc === "tower") {
    const f = nearTF(p.z);
    if (t[0] === "tower") {
      const tf = nearTF(t[2]);
      return tf === f ? [t[1], t[2]] : tf.z < f.z ? [f.x, f.z - 11.5] : [f.x, f.z + 11.5];
    }
    return [f.x, f.z + 11.5];
  }
  const pr = placeRoute(t[0], t[1], t[2]);
  if (pr) return pr;
  if (t[0] === zc) return [t[1], t[2]];
  if (zc === "frost" || zc === "ember") return [zc === "frost" ? 600 : -600, -370];
  return t[0] === "frost"
    ? [OX + RDS[0].gx + 13.6, OZ + RDS[0].gz]
    : t[0] === "ember"
      ? [OX + RDS[1].gx - 13.6, OZ + RDS[1].gz]
      : t[0] === "tower"
        ? [OX, OZ + TCZ + 10.2]
        : null;
}
let QTG = null;
// the tracked quest: the one you picked with Track in your Book, else the current story quest, else any active one
const trkI = () => {
  const t = P.trk;
  if (t === -1) return -2; // the player chose to track nothing
  if (t != null && P.qa[t] != null && !P.done[t]) return t;
  const mq = qMain();
  return mq >= 0 && P.qa[mq] != null ? mq : QS.findIndex((q, i) => P.qa[i] != null && !P.done[i]);
};
function trk(mq, qi) {
  let h = "";
  const i = qi >= 0 ? qi : qi === -2 ? -2 : mq;
  QTG = null;
  if (i === -2) h = "<b>No quest tracked</b><small>Pick one with Track in your Book (B)</small>";
  else if (i >= 0) {
    const q = QS[i],
      a = P.qa[i] != null;
    QTG = qWhere(i);
    const tg = q.m ? '<span class="tag">IMPORTANT</span>' : "";
    if (a)
      h =
        "<b>" +
        tg +
        q.n +
        "</b><small>" +
        q.d +
        "  <em>" +
        prog(i) +
        "/" +
        q.k +
        "</em></small>" +
        (P.rdy[i]
          ? '<small style="color:#7dff9a">Done! Return to ' +
            qGiver(qGv(q)) +
            "</small>" +
            (qBagFull(i) ? '<small style="color:#ff8a6a">Bag full: make room for ' + QSR[i].n + "</small>" : "")
          : "");
    else
      h =
        "<b>" +
        tg +
        "Next: " +
        q.n +
        "</b><small>" +
        (qOpen(i) ? "Talk to " + qGiver(qGv(q)) + " to begin" : "Reach level " + q.lv + " first") +
        "</small>";
    if (QTG) h += '<small style="color:#ffd34d">Follow the gold star on your map</small>';
  } else h = "<b>★ The story is complete</b><small>Try the dungeons, chests and snuffed lamps.</small>";
  if (h !== trkH) {
    trkH = h;
    $("qtrk").innerHTML = h;
  }
}
// NPC quest marks: a gold "!" over a quest giver when it has work for you, a "?" when something is ready to turn in
function npcQ(n) {
  const z = npcGv(n);
  if (!z) return "";
  if (QS.some((q, i) => qGv(q) === z && P.rdy[i] && !P.done[i])) return "?";
  return QS.some((q, i) => qGv(q) === z && qOpen(i) && P.qa[i] == null && !q.wren) ? "!" : "";
}
// ---------- minimap: the walkable ground of the zone you are in, turned so "up" is where the camera faces ----------
const MMC = $("mm"),
  MMX = MMC.getContext("2d"),
  MMR = {};
const MMB = {
  hub: [OX + RDS[1].gx - 24, OX + RDS[0].gx + 24, OZ + TCZ - 6, OZ + 32],
  frost: [600 - ZR - 6, 600 + ZR + 6, -400 - ZR - 6, -400 + ZR + 6],
  ember: [-600 - ZR - 6, -600 + ZR + 6, -400 - ZR - 6, -400 + ZR + 6],
  tower: [-16, 16, -1036, -884],
  marsh: [MWX - ZR - 6, MWX + ZR + 6, -400 - ZR - 6, -400 + ZR + 6],
};
function mmRaster(k) {
  // v45: zone boxes follow the live centres (the re-layout moves Frostfen / Cinderwaste at load); a raster made for an
  // old centre is rebuilt
  const zc = typeof ZCEN === "object" && ZCEN[k],
    zb = zc && [zc[0] - ZR - 6, zc[0] + ZR + 6, zc[1] - ZR - 6, zc[1] + ZR + 6];
  if (MMR[k] && (!zb || (MMR[k].b[0] === zb[0] && MMR[k].b[2] === zb[2]))) return MMR[k];
  let b = zb || MMB[k],
    D = null;
  if (!b && k.startsWith("st")) {
    const X = ZSX0 + +k.slice(2) * ZSDX; // v16: a zone street's own map
    b = [X - 56, X + 56, -ZSL - 26, 16]; // v26: wide enough for the winding street and its side clearing
    if (ZSF.on) b = zsBoxW(+k.slice(2), b); // v43: the street's box where it stands now (okp reads the moved ground)
  } else if (!b) {
    D = DUN[+k.slice(3)];
    b = [D.bx - 24, D.bx + 24, D.R[2][1] - D.R[2][2] - 2, D.bz + D.R[0][2] + 2];
  }
  const o0 = D && D.open;
  if (D) D.open = true;
  LKON = false;
  const S2 = k === "hub" ? 1.5 : 2, // v12: the hub is much bigger now, so its map is drawn a little coarser
    w = Math.ceil((b[1] - b[0]) * S2),
    h = Math.ceil((b[3] - b[2]) * S2),
    c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d"),
    im = x.createImageData(w, h),
    d = im.data,
    // v45 storybook colours (match 68-atlas): walkable ground tinted by the land it is in, safe ground warm gold
    zk0 = k.startsWith("st") ? ZSTR[+k.slice(2)][0] : k,
    gc = { hub: [176, 214, 128], frost: [244, 248, 250], ember: [158, 118, 90], marsh: [150, 176, 112] }[zk0] || [
      196, 180, 150,
    ];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const wx = b[0] + (i + 0.5) / S2,
        wz = b[2] + (j + 0.5) / S2;
      if (!okp(wx, wz)) continue;
      const o = (j * w + i) * 4,
        sf = safe(wx, wz);
      d[o] = sf ? 255 : gc[0];
      d[o + 1] = sf ? 228 : gc[1];
      d[o + 2] = sf ? 160 : gc[2];
      d[o + 3] = 235;
    }
  if (D) D.open = o0;
  LKON = true;
  x.putImageData(im, 0, 0);
  x.fillStyle = "rgba(176,62,46,.95)";
  HOUSES.forEach((H) => {
    if (H.x < b[0] || H.x > b[1] || H.z < b[2] || H.z > b[3]) return;
    x.save();
    x.translate((H.x - b[0]) * S2, (H.z - b[2]) * S2);
    x.rotate(-H.o.rotation.y);
    const hs = H.s || 1; // v16: houses are bigger
    x.fillRect(-2.5 * hs * S2, -2.5 * hs * S2, 5 * hs * S2, 5 * hs * S2);
    x.restore();
  });
  return (MMR[k] = { c, b });
}
function mmDraw(p) {
  const zk = zsIdx(p.x, p.z) >= 0 ? "st" + zsIdx(p.x, p.z) : themeKey(p.x, p.z),
    M = mmRaster(zk),
    W2 = MMC.width,
    cx = W2 / 2,
    R0 = 40,
    sc = cx / R0,
    X = MMX,
    cy = Math.cos(yaw),
    sy = Math.sin(yaw);
  X.setTransform(1, 0, 0, 1, 0, 0);
  X.clearRect(0, 0, W2, W2);
  X.save();
  X.beginPath();
  X.arc(cx, cx, cx, 0, 7);
  X.clip();
  // v45: the wild ground around the paths, coloured by the land (storybook look, see 68-atlas)
  const zk0 = zk.startsWith("st") ? ZSTR[+zk.slice(2)][0] : zk;
  X.fillStyle = zk.startsWith("dun")
    ? "#0a0812"
    : { hub: "#4a7a3e", frost: "#9cb2c4", ember: "#3e2a22", marsh: "#33503a", tower: "#2a2240" }[zk0] || "#3a4a3a";
  X.fillRect(0, 0, W2, W2);
  // v34 perf: ground + roads are drawn north-up into a cached canvas around you (rebuilt after you walk ~10 or every
  // 2 s); each frame only rotates that one image, so turning the camera is smooth
  const B = MMBC,
    now = performance.now();
  if (B.k !== zk || B.w !== W2 || Math.abs(p.x - B.x) > 10 || Math.abs(p.z - B.z) > 10 || now - B.t > 2000) {
    const sd = Math.ceil(2 * (cx * 1.42 + 12 * sc));
    if (B.c.width !== sd) B.c.width = B.c.height = sd;
    B.k = zk;
    B.w = W2;
    B.x = p.x;
    B.z = p.z;
    B.t = now;
    mmBase(B.c.getContext("2d"), zk, M, p, sc, sd);
  }
  X.save();
  X.translate(cx, cx);
  X.rotate(yaw);
  X.translate((B.x - p.x) * sc, (B.z - p.z) * sc);
  X.drawImage(B.c, -B.c.width / 2, -B.c.height / 2);
  X.restore();
  mmMarks(p, zk, X, W2, cx, R0, sc, cy, sy);
}
const MMBC = { c: document.createElement("canvas"), k: null, x: 0, z: 0, t: 0, w: 0 };
function mmBase(X, zk, M, p, sc, sd) {
  X.setTransform(1, 0, 0, 1, 0, 0);
  X.clearRect(0, 0, sd, sd);
  X.save();
  X.translate(sd / 2, sd / 2);
  X.scale(sc, sc);
  X.translate(-p.x, -p.z);
  X.drawImage(M.c, M.b[0], M.b[2], M.b[1] - M.b[0], M.b[3] - M.b[2]);
  // v14 trails between zones (outside every zone's map raster)
  if (!zk.startsWith("dun") && zk !== "tower") {
    X.lineCap = X.lineJoin = "round";
    X.lineWidth = TRW * 2;
    // v21 perf: each road's outline is built once (Path2D) instead of re-walking every point on every redraw
    const p2 = (t) => {
      if (!t.__p2) {
        t.__p2 = new Path2D();
        t.p.forEach(([x, z], k) => (k ? t.__p2.lineTo(OX + x, OZ + z) : t.__p2.moveTo(OX + x, OZ + z)));
      }
      return t.__p2;
    };
    TRL.forEach((t) => {
      X.strokeStyle = trLock(t) ? "rgba(106,90,112,.75)" : "rgba(214,182,128,.95)";
      X.stroke(p2(t));
    });
    // v15 zone streets and their cul-de-sacs
    X.lineWidth = RDW * 2;
    X.strokeStyle = X.fillStyle = "rgba(200,170,122,.95)";
    ZRD.forEach((t) => {
      // v43: a moved street is drawn in its frame (own cached path)
      const mv = ZSF.on && t.i != null && t.i < ZSF.length;
      if (mv && !t.__p2m) {
        t.__p2m = new Path2D();
        t.p.forEach(([x, z], k) => {
          const q = zsW(t.i, OX + x, OZ + z);
          if (k) t.__p2m.lineTo(q[0], q[1]);
          else t.__p2m.moveTo(q[0], q[1]);
        });
      }
      X.stroke(mv ? t.__p2m : p2(t));
      if (t.cul) {
        const cu = mv ? zsW(t.i, t.cul[0], t.cul[1]) : t.cul,
          s0 = mv ? zsW(t.i, t.X, 0) : [t.X, 0];
        X.beginPath();
        X.arc(cu[0], cu[1], ZCR, 0, 7);
        X.fill();
        X.beginPath();
        X.arc(s0[0], s0[1], 9, 0, 7);
        X.fill();
      }
      // v16: the short walk out to the street's arch in the village
      if (t.mo) {
        const c = ZCEN[t.zk],
          g = zsGate(t),
          r0 = ZVR[t.zk] - 4;
        X.lineWidth = ZSW * 2;
        X.beginPath();
        X.moveTo(c[0] + t.mo[0] * r0, c[1] + t.mo[1] * r0);
        X.lineTo(g[0], g[1]);
        X.stroke();
        X.lineWidth = RDW * 2;
      }
    });
  }
  X.restore();
}
function mmMarks(p, zk, X, W2, cx, R0, sc, cy, sy) {
  const pt = (x, z) => {
      const dx = x - p.x,
        dz = z - p.z;
      return [cx + (dx * cy - dz * sy) * sc, cx + (dx * sy + dz * cy) * sc];
    },
    inR = (x, z, m) => Math.hypot(x - p.x, z - p.z) < R0 * (m || 1);
  const dot = (x, z, r, f, s) => {
    const [a, b] = pt(x, z);
    X.beginPath();
    X.arc(a, b, r, 0, 7);
    X.fillStyle = f;
    X.fill();
    if (s) {
      X.strokeStyle = s;
      X.lineWidth = 2;
      X.stroke();
    }
  };
  const zq = zoneAt(p.x, p.z);
  PT.forEach((q) => {
    if (q.__z == null) q.__z = zoneAt(q.x, q.z); // portals never move
    if (inR(q.x, q.z) && q.__z === zq) {
      const lk = q.lock && q.lock();
      if (q.wk && !lk) return; // open arches on trails are just road
      dot(q.x, q.z, 7, lk ? "#6a5a70" : q.sw ? "#c9a0ff" : "#8ad0ff", "#fff");
    }
  });
  foes.forEach((f) => {
    if (f.dead || !f.o.visible) return;
    const q = f.o.position;
    if (!inR(q.x, q.z)) return;
    dot(q.x, q.z, f.boss ? 8 : 5, f.boss ? "#b04aff" : f.elite ? "#ffb830" : "#ff4a3a", "#1a0a10");
  });
  NPCS.forEach((n) => {
    if (!inR(n.x, n.z)) return;
    const k = n.kind,
      qs = n.qs;
    const [a, b] = pt(n.x, n.z);
    X.beginPath();
    X.arc(a, b, 7, 0, 7);
    X.fillStyle = { q: "#ffd34d", b: "#ffd34d", s: "#ff9a3d", h: "#7dff9a", c: "#ff8ad0", w: "#b89aff" }[k] || "#fff";
    X.fill();
    X.strokeStyle = "#1a1208";
    X.lineWidth = 2;
    X.stroke();
    X.fillStyle = "#1a1208";
    X.font = "900 11px system-ui";
    X.textAlign = "center";
    X.textBaseline = "middle";
    X.fillText(qs || { s: "$", h: "+", c: "~" }[k] || "", a, b + 1);
  });
  if (QTG) {
    let [a, b] = pt(QTG[0], QTG[1]);
    const dx = a - cx,
      dy = b - cx,
      l = Math.hypot(dx, dy),
      mx = cx - 14;
    if (l > mx) {
      a = cx + (dx / l) * mx;
      b = cx + (dy / l) * mx;
    }
    X.save();
    X.translate(a, b);
    X.rotate(performance.now() / 900);
    X.beginPath();
    for (let i = 0; i < 10; i++) {
      const an = (i * Math.PI) / 5 - Math.PI / 2,
        r = i % 2 ? 5 : 12;
      X.lineTo(Math.cos(an) * r, Math.sin(an) * r);
    }
    X.closePath();
    X.fillStyle = "#ffd34d";
    X.fill();
    X.strokeStyle = "#5a3a00";
    X.lineWidth = 2;
    X.stroke();
    X.restore();
  }
  {
    const r = W.rotation.y,
      fx = Math.sin(r),
      fz = Math.cos(r),
      ax = fx * cy - fz * sy,
      az = fx * sy + fz * cy,
      an = Math.atan2(az, ax);
    X.save();
    X.translate(cx, cx);
    X.rotate(an);
    X.beginPath();
    X.moveTo(13, 0);
    X.lineTo(-8, 8);
    X.lineTo(-4, 0);
    X.lineTo(-8, -8);
    X.closePath();
    X.fillStyle = "#fff";
    X.fill();
    X.strokeStyle = "#2a3170";
    X.lineWidth = 2.5;
    X.stroke();
    X.restore();
  }
  X.restore();
  {
    const [a, b] = pt(p.x, p.z - 1);
    const dx = a - cx,
      dy = b - cx,
      l = Math.hypot(dx, dy) || 1,
      nx = cx + (dx / l) * (cx - 13),
      ny = cx + (dy / l) * (cx - 13);
    X.beginPath();
    X.arc(nx, ny, 11, 0, 7);
    X.fillStyle = "#1a1208";
    X.fill();
    X.fillStyle = "#ffd34d";
    X.font = "900 14px Georgia,serif";
    X.textAlign = "center";
    X.textBaseline = "middle";
    X.fillText("N", nx, ny + 1);
  }
}
function patrol(f, dt) {
  if (!f.path) return false;
  if (f.pi >= f.path.length) f.pi = 0;
  const q = f.o.position,
    w = f.path[f.pi],
    tx = w[0] - q.x,
    tz = w[1] - q.z,
    tl = Math.hypot(tx, tz);
  if (tl < 0.25) {
    // v46b: a waypoint can hold the foe there (world editor patrol waits): w[2] = seconds, or with w[3] = "n" until you
    // come within w[2], "f" until you are farther than w[2]
    if (w[2] > 0) {
      if (f.pwi !== f.pi) {
        f.pwi = f.pi;
        f.pwt = 0;
      }
      f.pwt += dt;
      const pd = typeof W !== "undefined" ? Math.hypot(W.position.x - q.x, W.position.z - q.z) : 1e9,
        hold = w[3] === "n" ? pd > w[2] : w[3] === "f" ? pd < w[2] : f.pwt < w[2];
      if (hold) return false;
    }
    f.pwi = -1;
    f.pi = (f.pi + 1) % f.path.length;
    return false;
  }
  const st = Math.min(tl, (f.kind === "gloom" ? 1.2 : 1.6) * dt);
  q.x += (tx / tl) * st;
  q.z += (tz / tl) * st;
  let df = Math.atan2(tx, tz) - f.o.rotation.y;
  df = Math.atan2(Math.sin(df), Math.cos(df));
  f.o.rotation.y += df * Math.min(1, dt * 6);
  return true;
}
// houses between you and the camera fade to see-through (each house gets its own copy of its materials the first time)
let camFr = 0;
const FADE = new Set();
function houseFade(dt) {
  FADE.forEach((h) => {
    const want = h.cf === camFr ? 0.2 : 1;
    if (!h.mats) {
      h.mats = [];
      h.o.traverse((m) => {
        if (m.isMesh) {
          m.material = m.material.clone();
          h.mats.push(m.material);
        }
      });
    }
    h.op += (want - h.op) * Math.min(1, dt * 9);
    if (Math.abs(h.op - want) < 0.02) h.op = want;
    const tr = h.op < 0.99;
    h.mats.forEach((m) => {
      m.transparent = tr;
      m.opacity = h.op;
      m.depthWrite = !tr;
    });
    if (h.op >= 1) FADE.delete(h);
  });
}
function occClearCam() {
  OCCH.forEach((o) => {
    if (o.hc) {
      o.hc = 0;
      occSet(o);
    }
  });
  FADE.forEach((h) => {
    h.op = 1;
    if (h.mats)
      h.mats.forEach((m) => {
        m.transparent = false;
        m.opacity = 1;
        m.depthWrite = true;
      });
  });
  FADE.clear();
}
const CAMV = new T.Vector3(),
  VIS = {
    "Wispwood Glade": "ge",
    "Cinder Hollow": "gw",
    Frostfen: "frost",
    Cinderwaste: "ember",
    "Mirewick Marsh": "marsh",
  };
// the "Press E" line for an NPC: their name from the plate list, or what they offer
function npcTalkTxt(n) {
  const nn = NNAME[n.kind + n.id];
  return nn ? "Press E to talk to " + nn[0] : n.kind === "b" ? "Press E to read the quest board" : "Press E to talk";
}
function walk(dt, s) {
  let x = jv.x + (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0),
    z = jv.y + (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  const l = Math.hypot(x, z);
  if (l > 1) {
    x /= l;
    z /= l;
  }
  const p = W.position;
  yaw += ((keys.q ? 1 : 0) - (keys.e ? 1 : 0)) * 1.8 * dt;
  {
    const c = Math.cos(yaw),
      n = Math.sin(yaw),
      wx = c * x + n * z,
      wz = -n * x + c * z;
    x = wx;
    z = wz;
  }
  mv = l > 0.08 ? 1 : 0;
  run = mv && (keys.shift || runT) ? 1 : 0;
  // wading into story gloom: you slow down as you push in, instead of hitting an invisible wall at full speed
  let wf = 1;
  if (mv && zcur === "hub" && !(DEV.on && DEV.nw))
    for (const L of SLK) {
      if (L.t()) continue;
      const [lx, lz, ry] = L.w,
        dd = ry ? Math.abs(p.x - OX - lx) : Math.abs(p.z - OZ - lz),
        side = ry ? Math.abs(p.z - OZ - lz) < RDW + 1 : Math.abs(p.x - OX - lx) < SW + 1,
        into = ry ? x * Math.sign(lx) > 0 : z * Math.sign(lz) > 0;
      if (side && into && dd < 4) wf = Math.min(wf, 0.3 + (0.7 * dd) / 4);
    }
  if (mv) {
    const nc = DEV.on && DEV.nc,
      // v14: the roads between zones are quicker going (x1.4). v17: across their whole width, sidewalks included
      // (it used to be the dirt only, so stepping onto the sidewalk felt like a slowdown)
      sp =
        (run ? 11.5 : 7) *
        dt *
        (nc ? 1 : wf) *
        (DEV.on ? DEV.sp : 1) *
        ((trOn(p.x, p.z) || zrOn(p.x, p.z, RDW + 0.5)) && zoneAt(p.x, p.z) !== "dun" ? 1.4 : 1) *
        (window.mountSp ? mountSp() : 1), // v22: riding a mount (21-mounts.js)
      nx = p.x + x * sp,
      nz = p.z + z * sp;
    if (nc || okp(nx, nz)) {
      p.x = nx;
      p.z = nz;
    } else if (okp(nx, p.z)) p.x = nx;
    else if (okp(p.x, nz)) p.z = nz;
    W.rotation.y = Math.atan2(x, z);
    if (!nc)
      solids.forEach((o) => {
        const dx = p.x - o.x,
          dz = p.z - o.z;
        if (Math.abs(dx) > o.r + 0.5 || Math.abs(dz) > o.r + 0.5) return;
        const d = Math.hypot(dx, dz),
          m = o.r + 0.5;
        if (d < m && d > 0) {
          p.x = o.x + (dx / d) * m;
          p.z = o.z + (dz / d) * m;
        }
      });
    VIL.forEach((v) => {
      const o = v.o.position,
        dx = p.x - o.x,
        dz = p.z - o.z,
        d = Math.hypot(dx, dz);
      if (d < 1.3 && d > 0) {
        p.x = o.x + (dx / d) * 1.3;
        p.z = o.z + (dz / d) * 1.3;
      }
    });
    p.y = Math.abs(Math.sin(s * (run ? 15 : 11))) * 0.12 + wGround();
  } else p.y = wGround();
  const now = performance.now(),
    ps = safe(p.x, p.z);
  if (ps !== lastPs) {
    lastPs = ps;
    $("zplate").classList.toggle("safe", !!ps);
    $("safev").classList.toggle("on", !!ps);
  }
  // foes walk their patrol routes; step inside a red ring and the fight starts
  // respawns only happen out of sight (30+ away from you) and fade in; a foe whose ring you are already standing in when it
  // appears, or when a grace period ends (after battles and teleports), stays calm until you step out of its ring
  // v13 multiplayer: only the world owner (see netOwner) moves and respawns foes; the others follow its snapshots, and
  // foes held in someone else's battle are hidden until it ends
  const own = netOwner();
  for (const f of foes) {
    if (foeHeld(f)) continue;
    if (f.dead) {
      f.ring.visible = false;
      if (own && now > f.rt && Math.hypot(p.x - f.hx, p.z - f.hz) > 30) {
        f.dead = 0;
        f.pi = 0;
        f.o.position.set(f.hx, 0, f.hz);
        f.o.visible = true;
        S.add(f.o);
        f.cool = now + 2500;
        f.fade = 0;
        f.o.scale.setScalar(0.01);
        rollElite(f);
      }
      continue;
    }
    if (f.fade != null) {
      f.fade = Math.min(1, f.fade + dt * 1.5);
      f.o.scale.setScalar(Math.max(0.01, f.s0 * f.fade));
      if (f.fade >= 1) f.fade = null;
    }
    const q = f.o.position,
      d = Math.hypot(p.x - q.x, p.z - q.z);
    if (d > 80) {
      f.ring.visible = false;
      continue;
    }
    const hot = !ps && !(f.cool && now < f.cool) && now > grace && !f.sup && !(DEV.on && DEV.pf);
    if (f.sup && d > f.R + 1.2) f.sup = 0;
    if (d < f.R && !hot && !ps) f.sup = 1;
    // v36: a foe the world owner hasn't reported for 3 s (its tab is hidden or paused, or it is too far away to send it)
    // walks its own route here instead of freezing; the owner's next update pulls it back into line
    const lo = own || f.nt == null || now - f.nt > 3000,
      mf = lo ? patrol(f, dt) : netFoeMove(f, dt);
    if (lo && !f.path && !f.boss) f.o.rotation.y += Math.sin(s * 0.45 + f.hx) * dt * 0.7; // nowhere to walk: at least look about
    f.ring.visible = d < 40 && !P.nolines;
    f.ring.position.set(q.x, 0.2, q.z);
    f.ring.material.color.setHex(hot ? 0xff5a4a : 0x5aff9a);
    f.ring.material.opacity = hot ? 0.45 : 0.18;
    if (f.kind !== "gloom") animBeast(f.o, s, mf);
    else if (d < 45) animGloom(f.o, s, mf, f.hx);
    if (hot && d < f.R) {
      fight(f);
      return;
    }
  }
  // NPCs talk when you press E (or tap the prompt) near them, instead of popping up on touch
  window.__np = null;
  {
    let nd = 3.8;
    for (const n of NPCS) {
      const d = Math.hypot(p.x - n.x, p.z - n.z);
      n.mkr.position.y = 5 + Math.sin(s * 3) * 0.15;
      npcAnim(n, d, s, p);
      if (d < nd) {
        nd = d;
        window.__np = n;
      }
    }
    const n = window.__np;
    if (n && window.__eK) {
      window.__eK = 0;
      window.__np = null;
      if (window.__pe) window.__pe.style.display = "none";
      DLGI = 0;
      talkN = n;
      panel({ q: "q", s: "shop", c: "cos", h: "heal", b: "q", w: "spells", a: "school", m: "stable" }[n.kind], n.id);
      return;
    }
  }
  window.__ln = null;
  for (const L of LS) {
    const d = Math.hypot(p.x - L.x, p.z - L.z);
    L.s.material.opacity = P.lore[L.i] ? 0.4 : 0.75 + 0.25 * Math.sin(s * 3);
    if (d < 2.7) {
      window.__ln = L;
      if (window.__eK) {
        window.__eK = 0;
        if (window.__pe) window.__pe.style.display = "none";
        P.lore[L.i] = 1;
        qchk();
        sv();
        panel("lore", L.i);
        return;
      }
    }
  }
  // v11: treasure chests open with E (or a tap on the prompt) instead of on touch
  window.__ch = null;
  if (!window.__ln)
    for (const c of CHESTS) {
      if (c.open || !c.o.visible) continue;
      if (Math.abs(p.x - c.x) < 3 && Math.abs(p.z - c.z) < 3 && Math.hypot(p.x - c.x, p.z - c.z) < 2.8) {
        window.__ch = c;
        c.gl.scale.setScalar(3.2 + Math.sin(s * 6) * 0.5);
        if (window.__eK) {
          window.__eK = 0;
          window.__ch = null;
          openChest(c);
        }
        break;
      }
    }
  if (!window.__ln && !window.__ch && !window.__np) window.__eK = 0;
  {
    let el = window.__pe;
    if (!el) {
      el = window.__pe = document.createElement("div");
      el.id = "epr"; // hidden during cutscenes by the body.cut rule in 04-gates.js
      el.style.cssText =
        "position:fixed;left:50%;bottom:22%;transform:translateX(-50%);padding:8px 16px;border-radius:10px;background:rgba(20,12,40,.82);color:#ffd27a;font:600 16px system-ui,sans-serif;border:1px solid #ffd27a88;pointer-events:auto;cursor:pointer;z-index:50;display:none";
      el.onclick = () => {
        window.__eK = 1;
      };
      document.body.appendChild(el);
    }
    const on = !!(window.__ln || window.__ch || window.__np);
    el.style.display = on ? "block" : "none";
    if (window.__ln) el.textContent = P.lore[window.__ln.i] ? "Press E to read again" : "Press E to read the stone";
    else if (window.__ch) el.textContent = "Press E to open the chest";
    else if (window.__np) el.textContent = npcTalkTxt(window.__np);
  }
  for (const L of LAMPS) {
    if (L.lit) continue;
    L.s.material.opacity = 0.45 + 0.3 * Math.sin(s * 5 + L.i);
    L.s.scale.setScalar(1.4 + 0.3 * Math.sin(s * 3 + L.i));
    if (Math.hypot(p.x - L.x, p.z - L.z) < 2.6) relight(L);
  }
  for (const q of PT) {
    if (now > ptcd && Math.hypot(p.x - q.x, p.z - q.z) < (q.rad || 2.2)) {
      // v14 walk-through arches (trails): only speak up while locked, never teleport
      if (q.wk) {
        if (q.lock && q.lock()) tp(q);
        continue;
      }
      tp(q);
      return;
    }
  }
  // v14: walking a trail blends the sky, fog and light from one zone into the next; elsewhere the zone's own look
  {
    const th = trOn(p.x, p.z);
    let mixed = false;
    if (th) {
      const t = th.t;
      if (t.sB == null) trSpan(t);
      if (th.s > t.sA && th.s < t.sB) {
        const k0 = (th.s - t.sA) / (t.sB - t.sA);
        themeMix(t.ta, t.tb, k0 * k0 * (3 - 2 * k0));
        // from town the street has already turned the fog to the far zone's colour by the glade (see below)
        if (t.ta === "hub") S.fog.color.setHex(TH[t.tb][0]);
        lastTh = "mix";
        mixed = true;
      }
    }
    if (!mixed) {
      const tk = themeKey(p.x, p.z);
      if (tk !== lastTh) {
        lastTh = tk;
        theme(tk);
      }
    }
  }
  {
    const F =
      window.__fb ||
      (window.__fb = {
        h: new T.Color(TH.hub[0]),
        e: new T.Color(TH.frost[0]),
        w: new T.Color(TH.ember[0]),
        n: new T.Color(TH.tower[0]),
        c: new T.Color(),
      });
    if (zoneAt(p.x, p.z) === "hub") {
      const lx = p.x - OX,
        lz = p.z - OZ,
        ax = Math.abs(lx);
      let to = null,
        k = 0;
      const rh = ax >= SW ? rdHit(lx, lz) : null,
        th = trOn(p.x, p.z);
      if (th) {
        to = th.i === 1 ? F.w : F.e;
        k = 1;
      } else if (rh) {
        // v12: the fog shifts toward Frostfen / Cinderwaste blue or red the further you get down a road
        to = rh.i ? F.w : F.e;
        k = Math.min(1, rh.s / rh.R.L);
      } else if (lz < -14) {
        to = F.n;
        k = Math.min(1, (-lz - 14) / (-PZ - 14));
      }
      k = k * k * (3 - 2 * k);
      F.c.copy(F.h);
      if (to) F.c.lerp(to, k);
      S.fog.color.copy(F.c);
    }
  }
  const zn = (zcur = zoneAt(p.x, p.z)),
    di = dunIdx(p.x),
    trh = zn !== "dun" && zn !== "tower" ? trOn(p.x, p.z) : null,
    zc0 = ZCEN[zn], // v45: live zone centres
    trz = !!trh && (!zc0 || Math.hypot(p.x - zc0[0], p.z - zc0[1]) > ZR),
    zl = trz
      ? trh.t.n
      : {
          hub: shopIn(p.x, p.z) ? shopIn(p.x, p.z).title : hubAt(p.x, p.z), // v16: inside a shop's room
          frost: zsName(p.x, p.z) || "Frostfen", // v15: the zone's named streets
          ember: zsName(p.x, p.z) || "Cinderwaste",
          marsh: zsName(p.x, p.z) || "Mirewick Marsh",
          tower: "Gloomspire, floor " + (1 + Math.round((-900 - p.z) / 60)),
          dun: DUN[di].n,
        }[zn],
    nq = PT.find((q) => Math.hypot(p.x - q.x, p.z - q.z) < 6);
  if (VIS[zl] && !P.vis[VIS[zl]]) {
    P.vis[VIS[zl]] = 1;
    toast("Discovered: " + zl + " (fast travel unlocked)");
    qchk();
    sv();
  }
  // zone name plate under the minimap, and a big title card whenever you walk into a new area
  if (zl !== lastZl) {
    lastZl = zl;
    $("zplate").textContent = zl;
    const zc = $("zcard");
    zc.innerHTML =
      zl +
      "<small>" +
      (zn === "dun"
        ? "Dungeon  ·  Lv " + DUN[di].lv
        : ps
          ? "Safe zone"
          : trz
            ? "The open road"
            : shopIn(p.x, p.z)
              ? "Market Lane"
              : {
                  hub: "Duskwick",
                  frost: "The Frozen Fen",
                  ember: "The Burning Waste",
                  marsh: "The Drowned Marsh",
                  tower: "The Gloomspire",
                }[zn]) +
      "</small>";
    zc.className = ps ? "sf" : "";
    void zc.offsetWidth;
    zc.classList.add("go");
  }
  if (zn === "hub")
    for (const L of SLK) {
      if (L.t()) continue;
      const [lx, lz, ry] = L.w,
        dd = ry ? Math.abs(p.x - OX - lx) : Math.abs(p.z - OZ - lz),
        side = ry ? Math.abs(p.z - OZ - lz) < RDW + 1 : Math.abs(p.x - OX - lx) < SW + 1;
      if (dd < 2.2 && side && !L.told) {
        L.told = 1;
        toast(L.n, "#c9b8ff");
      } else if (dd > 12) L.told = 0;
    }
  if (zn === "dun") {
    const D = DUN[di];
    if (!D.open && Math.abs(p.x - D.bx) < D.cw && Math.abs(p.z - (D.C[1][0] - 1.6)) < 2.4 && now > sealT) {
      sealT = now + 4000;
      toast("A gloom ward seals the inner hall. Defeat every foe in these halls first.", "#c9b8ff");
    }
  }
  // v21 perf: the quest tracker (and its map target) only needs refreshing a few times a second
  if (mmF % 8 === 0) trk(qMain(), trkI());
  const txt = window.__ln
    ? P.lore[window.__ln.i]
      ? ">> Press E to read again"
      : ">> Press E to read the stone"
    : window.__ch
      ? ">> Press E to open the chest"
      : window.__np
        ? ">> " + npcTalkTxt(window.__np)
        : nq && nq.n
          ? ">> " + nq.n
          : PCH.trim();
  if (txt !== zt) {
    zt = txt;
    $("hint").textContent = txt;
  }
  mmDraw(p); // v34: cheap now (cached base layer), so every frame for smooth turning
  // camera (v9): trees, pines, spires and giant mushrooms in the way are hidden, and houses in the way fade to see-through,
  // so the camera keeps its normal angle instead of hopping up into a top-down view. Only solid landmarks (towers, walls,
  // the windmill, pillars) still pull the camera in a little, and never lift it over the top.
  const hx = p.x,
    hy = p.y + 2.2,
    hz = p.z,
    dx = Math.sin(yaw) * camD,
    dz = Math.cos(yaw) * camD,
    dy = camH - 2.2,
    L2 = dx * dx + dz * dz;
  let tb = 1,
    lift = 0,
    hb = 0;
  camFr++;
  for (const o of CB) {
    const ox = o.x - hx,
      oz = o.z - hz,
      lim = camD + o.r + 1.5;
    if (ox > lim || ox < -lim || oz > lim || oz < -lim) continue;
    const soft = o.oc || o.hs,
      r = o.r + (soft ? 0.9 : 0.35),
      b = ox * dx + oz * dz,
      c = ox * ox + oz * oz - r * r,
      ds = b * b - L2 * c;
    if (ds < 0) continue;
    if (soft) {
      const t0 = (b - Math.sqrt(ds)) / L2,
        t1 = (b + Math.sqrt(ds)) / L2;
      if (t1 > 0 && t0 < 1.05 && hy + dy * Math.max(0, t0) < o.h + 0.6) {
        if (o.oc) {
          o.oc.hc = 1;
          o.oc.cf = camFr;
          occSet(o.oc);
        } else {
          o.hs.cf = camFr;
          FADE.add(o.hs);
        }
      }
      continue;
    }
    if (c < 0) continue;
    const t = (b - Math.sqrt(ds)) / L2;
    if (t > 0 && t < tb && hy + dy * t < o.h) {
      tb = t;
      hb = o.h;
    }
  }
  OCCH.forEach((o) => {
    if (o.hc && o.cf !== camFr) {
      o.hc = 0;
      occSet(o);
    }
  });
  houseFade(dt);
  if (zn === "dun") {
    // v17: walk the line from your head to the camera and stop it before the first spot that is inside a wall
    // (rooms: walls at r + 0.6; corridors: walls 2.8 either side; walls are 8 high). Covers corridors and doorways,
    // which the old room-only check missed, and keeps a margin so the near plane never pokes through.
    const D = DUN[dunIdx(hx)],
      M = 0.75,
      air = (x, z, y) => {
        if (y > 8.4) return true;
        for (const [cx, cz, r] of D.R) if (Math.hypot(x - cx, z - cz) <= r + 0.6 - M) return true;
        if (Math.abs(x - D.bx) > D.cw - M) return false;
        return D.C.some(([z0, z1]) => z <= z0 + 1 && z >= z1 - 1);
      },
      n = Math.ceil(camD / 0.25);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      if (t >= tb) break;
      if (!air(hx + dx * t, hz + dz * t, hy + dy * t)) {
        tb = Math.max(0.04, t - 0.4 / camD);
        break;
      }
    }
  }
  if (zn === "tower") {
    const f = TF.reduce((a, c) => (Math.abs(c.z - p.z) < Math.abs(a.z - p.z) ? c : a)),
      ex = hx - f.x,
      ez = hz - f.z,
      R = 13.4,
      b = ex * dx + ez * dz,
      c = ex * ex + ez * ez - R * R,
      ds = b * b - L2 * c;
    if (ds > 0) {
      const t = (-b + Math.sqrt(ds)) / L2;
      if (t < tb) tb = Math.max(0, t);
    }
  }
  const kc = Math.max(zn === "dun" ? 0.06 : 0.3, tb - (zn === "dun" ? 0 : 0.06)),
    tx = hx + dx * kc,
    // v22: in dungeons a camera pulled in by a wall also rises, so it looks down over you instead of into your back
    ty = Math.max(hy + Math.max(0.8, dy * kc) + (zn === "dun" && tb < 1 ? (1 - tb) * 3.5 : 0), lift),
    tz = hz + dz * kc;
  CAMV.set(tx, ty, tz);
  if (snap) {
    C.position.copy(CAMV);
    snap = false;
  } else C.position.lerp(CAMV, tb < 1 ? (zn === "dun" ? 0.55 : 0.3) : 0.12);
  C.lookAt(p.x, p.y + 2.2, p.z);
}
// battle camera distance is worked out from the field of view so all eight slots always fit on screen
function size() {
  const w = stage.clientWidth || 1,
    h = stage.clientHeight || 1;
  R.setSize(w, h, false);
  C.aspect = w / h;
  C.fov = w / h < 1 ? 60 : w / h > 1.3 ? 40 : 44;
  const hf = Math.atan(Math.tan((C.fov * Math.PI) / 360) * C.aspect);
  // v47 polish: pulled further back and up (was 8.8 / 12..30, BH 3 + BD * .36)
  BD = Math.min(36, Math.max(15, 11 / Math.tan(hf)));
  BH = 3.4 + BD * 0.42;
  C.updateProjectionMatrix();
}
new ResizeObserver(size).observe(stage);
size();
// point-light pool: three.js shades every surface against every visible point light, however far away, so only the
// nearest few tagged lights (userData.pool: fires, fountain) stay on. The visible count never changes while the
// quality setting stays the same, so materials never recompile when lights swap.
let LPL = [],
  lpT = 0;
function lightPool(dt) {
  if ((lpT -= dt) > 0) return;
  lpT = 0.3;
  if (!LPL.length) S.traverse((o) => o.isPointLight && o.userData.pool && LPL.push(o));
  const n = GFXQ[GFX].lp,
    c = C.position;
  LPL.forEach((l) => (l.userData.d = l.position.distanceToSquared(c)));
  LPL.sort((a, b) => a.userData.d - b.userData.d).forEach((l, i) => (l.visible = i < n));
}
// far plane follows the fog (nothing past the fog's end can be seen), and the fog-free mountain ring is shrunk about
// the camera so it fits inside it while looking exactly the same from where the camera stands
function skyFit() {
  const cf = S.fog.far + 14;
  if (Math.abs(C.far - cf) > 1) {
    C.far = cf;
    C.updateProjectionMatrix();
  }
  const cp = C.position,
    k = Math.min(1, (C.far - 4) / (275 + Math.hypot(MTC.x - cp.x, MTC.z - cp.z)));
  MTG.scale.setScalar(k);
  MTG.userData.gd.material.color.copy(S.fog.color);
  MTG.position.copy(MTC).sub(cp).multiplyScalar(k).add(cp);
}
let last = 0,
  fpsN = 0,
  fpsT = 0;
(function loop(t) {
  requestAnimationFrame(loop);
  const s = t / 1000,
    dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (DEV.on) {
    fpsN++;
    if (t - fpsT > 1000) {
      $("fps").textContent = DEV.fps ? " " + Math.round((fpsN * 1000) / (t - fpsT)) + " fps" : "";
      fpsN = 0;
      fpsT = t;
    }
  }
  upd(dt);
  orb.position.y = ORB0.y + Math.sin(s * 3) * 0.06;
  PT.forEach((q) => {
    if (q.sw) q.r.rotation.z = -s * 1.6;
    else q.r.rotation.y = s;
  });
  ffm.opacity = 0.75 + 0.25 * Math.sin(s * 2);
  FF.rotation.y = Math.sin(s * 0.1) * 0.05;
  if (mode === "explore") {
    if (!paused) walk(dt, s);
    else {
      mv = 0;
      if (talkN && $("panel").style.display === "flex") talkCam();
      if (window.titleCam) titleCam(dt, s); // title screen / prologue camera (14-intro.js)
    }
    ambient(dt, s, W.position);
  } else if (mode === "battle") {
    mv = g.intro ? 1 : 0;
    ambient(dt, s, saved);
    RG.rotation.y += dt * 0.12;
    if (!g.intro) W.position.y = (1 + Math.sin(s * 2)) * 0.03 + wGround(); // v18: bob above the ground, never into it
    g.allies.forEach((u, i) => {
      const p = SLA[u.slot],
        A = ALLY[u.t],
        fl = A.y > 0.5;
      if (!u.act) u.m.position.set(p[0], A.y + (fl ? Math.sin(s * 2 + i) * 0.15 : 0), p[1]);
      sumIdle(u, i, s);
      if (u.sig) {
        u.sig.position.set(p[0], 0.12, p[1]);
        u.sig.rotation.z = s * 0.6;
        u.sig.material.opacity = 0.6 + 0.25 * Math.sin(s * 3 + i);
      }
      u.tag.position.set(u.m.position.x, fl ? u.m.position.y + 1.3 * (A.sc || 1) : A.th || 2.3, u.m.position.z);
      u.sel = 0;
      tagUpd(u);
    });
    const tf = tgt();
    g.foes.forEach((f, i) => {
      if (f.gone) return;
      if (!g.busy && f.kind === "gloom") f.m.position.y = Math.sin(s * 2.4 + i) * 0.07;
      if (f.m.userData.L) animBeast(f.m, s, f.run);
      if (f.m.userData.gl) animGloom(f.m, s, f.run, i);
      if (f.st.burn > 0 && Math.random() < 0.15)
        puff(f.m.position.clone().setY(1 + Math.random() * 2.5), "fire", 1, 1, 0.5, 0.7);
      f.tag.position.set(f.m.position.x, f.th, f.m.position.z);
      f.sel = f === tf ? 1 : 0;
      tagUpd(f);
    });
    // v18: face the foe you're aiming at (the wizard used to stand turned off to the side)
    if (tf && !g.intro && !vicT) {
      const want = Math.atan2(tf.m.position.x - W.position.x, tf.m.position.z - W.position.z);
      let d = want - W.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      W.rotation.y += d * Math.min(1, dt * 6);
    }
    if (tf) {
      RT.position.set(tf.m.position.x, 0.1, tf.m.position.z);
      RT.material.opacity = 0.5 + 0.3 * Math.sin(s * 5);
    }
    RT.visible = !!tf;
    padUpd(s);
    tmrTick(dt);
    if (!g.intro) battlePatrol(dt, s);
    CV.set(
      Math.sin(bYaw) * BD * bZoom + (Math.random() - 0.5) * shk,
      BH * bZoom + (Math.random() - 0.5) * shk,
      Math.cos(bYaw) * BD * bZoom,
    );
    CT.set(0, 1, 0);
    const fo = (typeof pracCam === "function" && pracCam(CV, CT)) || focApply(CV, CT); // v18: Oona talking // v15: point at whoever a foe is about to hit (or pull back for a hit on everyone)
    BG.localToWorld(CV);
    BG.localToWorld(CT);
    camClip(CV, CT); // v18: never sit inside a wall or gate (10-battle-flow.js)
    if (camK < 1) {
      camK = Math.min(1, camK + (dt * SPD) / 0.95);
      const e = 1 - Math.pow(1 - camK, 3);
      C.position.lerpVectors(camFrom, CV, e);
      C.position.y += Math.sin(camK * Math.PI) * 1.5;
      LK.lerpVectors(lookFrom, CT, e);
      C.lookAt(LK);
    } else if (fo || focOn()) {
      const k = Math.min(1, dt * 9);
      C.position.lerp(CV, k);
      LK.lerp(CT, k);
      C.lookAt(LK);
    } else {
      C.position.copy(CV);
      LK.copy(CT);
      C.lookAt(CT);
    }
  } else if (mode === "guest") {
    // v17: a guest in someone else's battle stands still on their pad (walk() isn't running, so clear its walk flag)
    mv = 0;
    run = 0;
    W.position.y = (1 + Math.sin(s * 2)) * 0.03 + wGround();
    // v18: a guest faces the foe they're aiming at too
    {
      const fm = GUEST && GUEST.fm && (GUEST.fm[GUEST.tgt] || GUEST.fm.find((m) => m && m.visible));
      if (fm) {
        let d = Math.atan2(fm.position.x - W.position.x, fm.position.z - W.position.z) - W.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        W.rotation.y += d * Math.min(1, dt * 6);
      }
    }
    RG.rotation.y += dt * 0.12;
    ambient(dt, s, saved);
    tmrTick(dt);
  } else if (mode === "cut") cutCam(dt, s);
  gateTick(dt, s);
  netTick(dt);
  if (mode === "battle") partyTick(s);
  animW(s, dt);
  if (window.mountTick) mountTick(dt, s); // v22: mounts follow their riders (21-mounts.js)
  if (mv && mode === "explore" && P.eq && P.eq.trail !== "none") {
    trT -= dt;
    if (trT <= 0) {
      trT = 0.07;
      puff(W.position.clone().setY(0.3), COS.find((c) => c.k === P.eq.trail).t, 1, 0.8, 0.7, 0.8);
    }
  }
  if (window.__edT) window.__edT();
  guestTick();
  lightPool(dt);
  skyFit();
  shopTick();
  zoneCullTick();
  R.render(S, C);
})(0);
