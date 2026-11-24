// DUSKWICK - 07-gear-ui.js: Gear and shops, the Book/panel UI (panel()), options, dev tab.
// Loaded in order by index.html as plain scripts; they share one global scope.
// ---------- gear: six slots, five rarities, rolled stats ----------
// v37 bulk sell in the bag: select mode on/off and the picked item ids (not saved)
const BSEL = { on: 0, ids: new Set(), sure: 0 };
const RAR = [
    { n: "Common", c: "#d8dbe8" },
    { n: "Uncommon", c: "#7dff9a" },
    { n: "Rare", c: "#6fb8ff" },
    { n: "Epic", c: "#c38bff" },
    { n: "Legendary", c: "#ffb040" },
  ],
  RM = [1, 1.3, 1.7, 2.2, 2.9],
  INVMAX = 30;
const GSL = ["staff", "hat", "robe", "charm", "ring", "boots"],
  GSN = { staff: "Staff", hat: "Hat", robe: "Robe", charm: "Charm", ring: "Ring", boots: "Boots" };
const STN = {
  hp: ["Max HP", ""],
  pow: ["Spell power", "%"],
  def: ["Ward (damage taken)", "%"],
  crit: ["Crit chance", "%"],
  fire: ["Fire damage", "%"],
  ice: ["Ice damage", "%"],
  storm: ["Storm damage", "%"],
  heal: ["Healing", "%"],
  spirit: ["Spirit damage", "%"],
  pip: ["Starting pips", ""],
  flee: ["Flee chance", "%"],
};
const GB = {
  staff: { b: ["Oak Staff", "Lantern Rod", "Willow Wand", "Crook", "Scepter"], m: "pow", k: 4 },
  hat: { b: ["Pointed Hat", "Hood", "Cowl", "Circlet"], m: "hp", k: 8 },
  robe: { b: ["Robe", "Vestments", "Greatcoat", "Mantle"], m: "def", k: 2 },
  charm: { b: ["Charm", "Amulet", "Locket", "Talisman"], m: "heal", k: 6 },
  ring: { b: ["Ring", "Band", "Signet"], m: "crit", k: 2 },
  boots: { b: ["Boots", "Slippers", "Treads"], m: "flee", k: 3 },
};
const GEL = {
  fire: ["Ember", "Cinder", "Blazing", "Smouldering"],
  ice: ["Rime", "Frost", "Glacial", "Wintry"],
  storm: ["Gale", "Thunder", "Crackling", "Stormcaller's"],
  heal: ["Mossy", "Dawnlit", "Verdant", "Mending"],
  spirit: ["Haunted", "Wispbound", "Ghostly", "Soulwoven"],
};
const GSUF = [
  " of the Lamplighter",
  " of the Fox",
  " of Dusk",
  " of the Wolf",
  " of Warding",
  " of the Long Night",
  " of Embers",
  " of the Ninth Lamp",
  " of Small Mercies",
  " of the Hollow Road",
];
const LEG = {
  staff: "Dawnbrand",
  hat: "Crown of the Last Lamp",
  robe: "Warden's Mantle",
  charm: "Heart of the Ember",
  ring: "Ring of the Long Dusk",
  boots: "Wispwalkers",
};
const pick = (a) => a[(Math.random() * a.length) | 0];
function genItem(sl, lv, r, el) {
  sl = sl || pick(GSL);
  el = el || pick(["fire", "ice", "storm", "heal", "spirit"]);
  r = Math.max(0, Math.min(4, r || 0));
  lv = Math.max(1, lv || 1);
  const gb = GB[sl],
    st = {},
    m = RM[r],
    sc = 1 + 0.09 * (lv - 1), // v25b: gear stats grow a little slower per level (was 0.12)
    add2 = (k, v) => {
      if (v > 0) st[k] = (st[k] || 0) + v;
    };
  add2(gb.m, Math.max(1, Math.round(gb.k * sc * m)));
  const pool = ["hp", "pow", "def", "crit", "heal", "flee"].filter((k) => k !== gb.m),
    af = { hp: 6, pow: 3, def: 1.5, crit: 1.5, heal: 4, flee: 2 };
  if (r >= 1) add2(el === "heal" ? "heal" : el, Math.max(2, Math.round(5 * sc * (0.7 + r * 0.25))));
  for (let i = 1; i < r; i++) {
    const k = pool.splice((Math.random() * pool.length) | 0, 1)[0];
    add2(k, Math.max(1, Math.round(af[k] * sc * (0.7 + r * 0.25))));
  }
  if (r >= 3 && (sl === "charm" || sl === "staff") && Math.random() < 0.6) add2("pip", 1);
  const n = r === 4 ? LEG[sl] : (r >= 1 ? pick(GEL[el]) + " " : "") + pick(gb.b) + (r >= 2 ? pick(GSUF) : "");
  const it = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    s: sl,
    n,
    r,
    lv,
    el,
    st,
    v: Math.round((8 + lv * 5) * m * m * 0.6),
  };
  // v18: robes, hats and staffs can come in one of Pip's styles (rarer gear more often). The style belongs to a school
  // but anyone can wear it; it shows while the item is worn. lk0 = the style it came with (Pip can put it back free).
  const lkk = { robe: "robe", hat: "hat", staff: "wand" }[sl];
  if (lkk && Math.random() < [0.1, 0.22, 0.4, 0.6, 0.8][r]) {
    it.lk = it.lk0 = 1 + Math.floor(Math.random() * (LOOKS[lkk].length - 1));
    it.v = Math.round(it.v * 1.25);
  }
  return it;
}
// v18: "Battlemage coat (Pyre style)" for an item that carries a style, or ""
const itemStyle = (it) => {
  const k = it && { robe: "robe", hat: "hat", staff: "wand" }[it.s],
    s = k && it.lk != null && LOOKS[k][it.lk];
  return s ? s.n + (s.cl && CL[s.cl] ? " (" + (s.zn ? s.zn + " " : "") + CL[s.cl][1] + " style)" : "") : "";
};
function gst() {
  const t = {};
  if (P.gear)
    GSL.forEach((s) => {
      const it = P.gear[s];
      if (it) for (const k in it.st) t[k] = (t[k] || 0) + it.st[k];
    });
  if (t.def) t.def = Math.min(50, t.def);
  if (t.crit) t.crit = Math.min(50, t.crit);
  return t;
}
const statTxt = (st, sep) =>
  Object.keys(STN)
    .filter((k) => st[k])
    .map((k) => "+" + st[k] + STN[k][1] + " " + STN[k][0])
    .join(sep || ", ");
function rollR(b) {
  const x = Math.random();
  return x < 0.008 + 0.01 * b ? 4 : x < 0.04 + 0.025 * b ? 3 : x < 0.14 + 0.05 * b ? 2 : x < 0.42 + 0.06 * b ? 1 : 0;
}
const GIC = {};
function gIcon(it) {
  const key = it.s + "|" + it.r + "|" + (it.el || "");
  if (GIC[key]) return GIC[key];
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d"),
    em = it.r < 0,
    rc = em ? "#4a4030" : RAR[it.r].c,
    ec = em ? "#5a5040" : ELC[it.el] || "#ffd27a";
  const q = x.createRadialGradient(32, 28, 2, 32, 32, 32);
  q.addColorStop(0, em ? "rgba(90,80,60,.25)" : rc + "55");
  q.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = q;
  x.fillRect(0, 0, 64, 64);
  x.lineJoin = x.lineCap = "round";
  x.strokeStyle = "#120a04";
  x.lineWidth = 3;
  const F = (col) => {
    x.fillStyle = em ? "#3a3226" : col;
    x.fill();
    x.stroke();
  };
  if (it.s === "staff") {
    x.beginPath();
    x.moveTo(16, 56);
    x.lineTo(44, 14);
    x.lineWidth = 6;
    x.strokeStyle = "#120a04";
    x.stroke();
    x.lineWidth = 3.5;
    x.strokeStyle = em ? "#3a3226" : "#9a6a3a";
    x.stroke();
    x.strokeStyle = "#120a04";
    x.lineWidth = 3;
    x.beginPath();
    x.arc(46, 12, 8, 0, 7);
    F(ec);
    if (!em) {
      x.fillStyle = "rgba(255,255,255,.7)";
      x.beginPath();
      x.arc(43, 9, 2.5, 0, 7);
      x.fill();
    }
  } else if (it.s === "hat") {
    x.beginPath();
    x.moveTo(10, 48);
    x.quadraticCurveTo(32, 54, 54, 48);
    x.lineTo(50, 42);
    x.lineTo(36, 12);
    x.quadraticCurveTo(30, 4, 22, 10);
    x.lineTo(28, 14);
    x.lineTo(16, 42);
    x.closePath();
    F(em ? 0 : "#3a3a8a");
    if (!em) {
      x.fillStyle = ec;
      x.fillRect(18, 38, 28, 5);
    }
  } else if (it.s === "robe") {
    x.beginPath();
    x.moveTo(24, 10);
    x.lineTo(40, 10);
    x.lineTo(54, 26);
    x.lineTo(46, 30);
    x.lineTo(44, 56);
    x.lineTo(20, 56);
    x.lineTo(18, 30);
    x.lineTo(10, 26);
    x.closePath();
    F("#5a3a8a");
    if (!em) {
      x.strokeStyle = ec;
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(32, 12);
      x.lineTo(32, 54);
      x.stroke();
    }
  } else if (it.s === "charm") {
    x.strokeStyle = em ? "#3a3226" : "#d9a441";
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(14, 6);
    x.quadraticCurveTo(32, 30, 50, 6);
    x.stroke();
    x.strokeStyle = "#120a04";
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(32, 22);
    x.lineTo(46, 38);
    x.lineTo(32, 56);
    x.lineTo(18, 38);
    x.closePath();
    F(ec);
  } else if (it.s === "ring") {
    x.lineWidth = 9;
    x.strokeStyle = "#120a04";
    x.beginPath();
    x.ellipse(32, 38, 16, 13, 0, 0, 7);
    x.stroke();
    x.lineWidth = 5;
    x.strokeStyle = em ? "#3a3226" : "#e8c060";
    x.stroke();
    x.lineWidth = 3;
    x.strokeStyle = "#120a04";
    x.beginPath();
    x.moveTo(32, 12);
    x.lineTo(41, 22);
    x.lineTo(32, 30);
    x.lineTo(23, 22);
    x.closePath();
    F(ec);
  } else {
    x.beginPath();
    x.moveTo(20, 8);
    x.lineTo(36, 8);
    x.lineTo(36, 40);
    x.lineTo(54, 46);
    x.lineTo(54, 56);
    x.lineTo(16, 56);
    x.lineTo(18, 40);
    x.closePath();
    F("#6a4a2a");
    if (!em) {
      x.fillStyle = ec;
      x.fillRect(19, 14, 16, 4);
    }
  }
  if (!em && it.r >= 3) {
    x.fillStyle = rc;
    [
      [10, 12],
      [54, 54],
      [8, 50],
    ].forEach(([a, b]) => {
      x.beginPath();
      for (let i = 0; i < 8; i++) {
        const r2 = i % 2 ? 1.5 : 4.5,
          an = (i * Math.PI) / 4;
        x.lineTo(a + Math.cos(an) * r2, b + Math.sin(an) * r2);
      }
      x.fill();
    });
  }
  return (GIC[key] = c.toDataURL());
}
function giveItem(it, quiet) {
  if (!P.inv) P.inv = [];
  if (P.inv.length >= INVMAX) {
    P.gold += it.v;
    toast("Bag full: sold " + it.n + " for ✦" + it.v);
    return;
  }
  P.inv.push(it);
  if (!quiet)
    toast(
      "Found: " + it.n + " (" + RAR[it.r].n + ")" + (itemStyle(it) ? " in a style: " + itemStyle(it) : ""),
      RAR[it.r].c,
    );
}
// loot after a won battle: harder zones, packs, alphas and bosses drop more and better
function loot(list) {
  const mt = Math.max(...list.map((f) => f.t)),
    boss = list.some((f) => f.boss && !f.min),
    big = list.some((f) => f.big),
    zb = { hub: 0, frost: 1, ember: 1.5, tower: 2, dun: 1.8 }[zoneAt(saved.x, saved.z)] || 0,
    b = (mt - 1) * 0.6 + zb;
  const lv = Math.max(1, P.lvl + (Math.random() < 0.3 ? 1 : 0));
  let n = boss ? 2 : big ? 1 : Math.random() < 0.32 + 0.1 * list.length ? 1 : 0;
  for (let i = 0; i < n; i++) {
    let r = rollR(b + (boss ? 3 : big ? 1.5 : 0));
    if (boss && i === 0) r = Math.max(r, mt >= 5 ? 4 : 3);
    else if (big) r = Math.max(r, 2);
    giveItem(genItem(null, lv, r));
  }
  list.filter((f) => f.el).forEach(() => giveItem(genItem(null, lv, Math.max(2, rollR(b + 1.5)))));
}
// v22 gear preview: a small 3D copy of your wizard beside the Bag, made the same way as the character creator's
// (a light-free W clone painted by wizPaint from pubLook, so it matches how other players see you). Its own scene and
// lights (nothing is added to the world). One renderer, made when the Bag opens and freed as soon as the Bag closes
// or another page replaces it. GPV = { pr, cv, wrap, lb, sc, cam, o, ry, drag, last }.
let GPV = null;
// your look as if `it` were worn in its slot (null = as you are now)
function gpvLook(it) {
  if (!it || !P.gear) return pubLook();
  const old = P.gear[it.s];
  P.gear[it.s] = it;
  try {
    return pubLook();
  } finally {
    P.gear[it.s] = old;
  }
}
function gpvKill() {
  const v = GPV;
  if (!v) return;
  GPV = null;
  v.o.traverse((m) => m.material && m.material.dispose()); // geometry is shared with W, so it stays
  v.pr.dispose();
  v.pr.forceContextLoss();
  v.wrap.remove();
}
function gpvSet(it) {
  if (!GPV) return;
  wizPaint(GPV.o, gpvLook(it));
  GPV.lb.textContent = it ? "Trying on: " + it.n : "Drag to turn";
}
function gpvShow(host, it) {
  if (!GPV) {
    const PW = innerWidth < 640 ? 104 : 150,
      PH = Math.round(PW / 0.62),
      pr = new T.WebGLRenderer({ antialias: true, alpha: true });
    pr.setPixelRatio(Math.min(devicePixelRatio, 2));
    pr.setSize(PW, PH);
    const cv = pr.domElement,
      wrap = document.createElement("div"),
      lb = document.createElement("small");
    cv.style.cssText =
      "border-radius:10px;background:radial-gradient(circle at 50% 40%,#43386e,#14102a);cursor:grab;" +
      "touch-action:none;display:block";
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:3px;flex:none;width:" + PW + "px";
    lb.style.cssText = "color:#b9b3e6;text-align:center;font-size:10px;line-height:1.2;min-height:2.4em";
    wrap.appendChild(cv);
    wrap.appendChild(lb);
    const sc = new T.Scene();
    sc.add(new T.HemisphereLight(0xfff0e0, 0x302848, 0.95));
    const dl = new T.DirectionalLight(0xffe6c0, 0.85);
    dl.position.set(3, 6, 6);
    sc.add(dl);
    const cam = new T.PerspectiveCamera(28, PW / PH, 0.1, 60);
    cam.position.set(0, 2.1, 10.5);
    cam.lookAt(0, 1.75, 0);
    const o = W.clone(true),
      kill = [];
    o.traverse((m) => {
      if (m.isLight) kill.push(m);
      else if (m.material) m.material = m.material.clone();
    });
    kill.forEach((m) => m.parent.remove(m));
    o.userData = { wiz: 1 };
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.visible = true;
    sc.add(o);
    const v = (GPV = { pr, cv, wrap, lb, sc, cam, o, ry: 0.35, drag: null, last: performance.now() });
    cv.onpointerdown = (e) => {
      v.drag = e.clientX;
      cv.setPointerCapture(e.pointerId);
      cv.style.cursor = "grabbing";
    };
    cv.onpointermove = (e) => {
      if (v.drag == null) return;
      v.ry += (e.clientX - v.drag) * 0.012;
      v.drag = e.clientX;
    };
    cv.onpointerup = cv.onpointercancel = () => {
      v.drag = null;
      cv.style.cursor = "grab";
    };
    const tick = (now) => {
      if (GPV !== v) return;
      // the Bag closed, or another page was drawn without the preview: free it
      if (!wrap.isConnected || $("panel").style.display === "none") return gpvKill();
      const dt = Math.min(0.05, (now - v.last) / 1000);
      v.last = now;
      // v47 polish: no auto-spin; it only turns while you drag it
      o.rotation.y = v.ry;
      wizAnim(o, now / 1000, dt, 0, 0);
      pr.render(sc, cam);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  host.appendChild(GPV.wrap);
  gpvSet(it);
}
function equip(it) {
  const s = it.s,
    old = P.gear[s],
    h0 = mhp();
  P.inv = P.inv.filter((q) => q.id !== it.id);
  P.gear[s] = it;
  if (old) P.inv.push(old);
  const dh = mhp() - h0;
  g.hp = Math.max(1, Math.min(mhp(), g.hp + Math.max(0, dh)));
  applyCos();
  sv();
  ui();
}
function unequip(s) {
  const it = P.gear[s];
  if (!it || P.inv.length >= INVMAX) return;
  P.gear[s] = null;
  P.inv.push(it);
  g.hp = Math.min(g.hp, mhp());
  applyCos();
  sv();
  ui();
}
const findItem = (id) =>
  id && ((P.inv || []).find((q) => q.id === id) || GSL.map((s) => P.gear[s]).find((q) => q && q.id === id));
// shop gear stock re-rolls each time you level up
const SGEAR = {
  bram: { sl: ["staff", "hat", "boots"], el: null },
  yara: { sl: ["robe", "charm", "hat"], el: "ice" },
  forge: { sl: ["staff", "ring", "robe"], el: "fire" },
};
function stock(id) {
  if (!P.stk) P.stk = {};
  const s = P.stk[id];
  if (s && s.lv === P.lvl) return s.items;
  const sg = SGEAR[id],
    z = SHOPS[id].z;
  const items = sg.sl.map((sl, i) =>
    genItem(
      sl,
      P.lvl,
      i === 2 && rk(z) >= 2 ? 3 : 1 + (Math.random() < 0.4 ? 1 : 0),
      sg.el && Math.random() < 0.7 ? sg.el : null,
    ),
  );
  P.stk[id] = { lv: P.lvl, items };
  sv();
  return items;
}
function travel(t) {
  if (mode !== "explore") return;
  $("panel").style.display = "none";
  paused = false;
  tp({ to: t.to });
}
function setSpd(v) {
  SPD = P.spd = v;
  document.body.style.setProperty("--spd", v);
  $("spd").textContent = v + "x";
  sv();
}
// sub-page picked in each big shop (Wren's schools, Goods / Gear), and which panel was last drawn (to keep its scroll)
const SUBP = {};
let PKEY = null;
// v20 Book layout: [group, label, pages] (Dev is added under Options while developer mode is on)
const BOOKG = [
  [
    "quests",
    "📜 Quests",
    [
      ["quests", "Quests"],
      ["progress", "Progress"],
      ["bestiary", "Bestiary"],
    ],
  ],
  [
    "spells",
    "✦ Spells",
    [
      ["spells", "Spellbook"],
      ["party", "Companions"],
    ],
  ],
  ["friends", "☺ Friends", null],
  [
    "travel",
    "🗺 World",
    [
      ["travel", "Travel"],
      ["lore", "Lore"],
    ],
  ],
  [
    "options",
    "⚙ Options",
    [
      ["options", "Battle"],
      ["optdisp", "Display"],
      ["optgame", "Game"],
    ],
  ],
];
const BOOKL = {}, // group -> last page opened in it (and .last = the last page overall)
  BOOKO = {}; // folded sections: key -> open
function panel(k, id) {
  const L = $("pl"),
    TB = $("tabs"),
    BOX = $("panel").querySelector(".pbox"),
    pk = k + ":" + (k === "bag" ? "" : id) + ":" + (SUBP[k + ":" + id] || ""),
    keep = $("panel").style.display === "flex" && PKEY === pk ? BOX.scrollTop : 0;
  PKEY = pk;
  L.innerHTML = "";
  TB.innerHTML = "";
  MIRR = k === "cos";
  if (!MIRR && (PRV || LPRV)) {
    PRV = LPRV = null;
    applyCos();
  }
  if (!MIRR) {
    C.clearViewOffset();
    C.aspect = (R.domElement.clientWidth || 1) / (R.domElement.clientHeight || 1);
    C.updateProjectionMatrix();
    mirrClear();
  }
  $("panel").classList.toggle("mirror", MIRR);
  const btn = (t, dis, fn) => {
    const b = document.createElement("button");
    b.className = "pb";
    b.textContent = t;
    b.disabled = dis;
    b.onclick = fn;
    return b;
  };
  const row = (h, b) => {
    const r = document.createElement("div");
    r.className = "row";
    r.innerHTML = h;
    if (b) r.appendChild(b);
    L.appendChild(r);
  };
  const sec = (t) => L.insertAdjacentHTML("beforeend", '<div class="sec">' + t + "</div>");
  // sub-pages for big shops: tab buttons along the top; returns the page being shown
  const subp = (pages) => {
    const sk = k + ":" + id;
    if (!pages.some((p) => p[0] === SUBP[sk])) SUBP[sk] = pages[0][0];
    PKEY = k + ":" + id + ":" + SUBP[sk];
    pages.forEach(([pid, t]) => {
      const b = document.createElement("button");
      b.textContent = t;
      if (pid === SUBP[sk]) b.className = "on";
      b.onclick = () => {
        SUBP[sk] = pid;
        panel(k, id);
      };
      TB.appendChild(b);
    });
    return SUBP[sk];
  };
  // quest card: IMPORTANT (story) or SIDE tag, rewards, a progress bar, and Track / Turn in / Accept
  const qcard = (i) => {
    const q = QS[i],
      a = P.qa[i] != null,
      dn = P.done[i],
      rd = a && !dn && prog(i) >= q.k,
      tk = trkI() === i,
      r = document.createElement("div");
    r.className = "qc" + (q.m ? " imp" : "") + (tk && a && !dn ? " trk" : "") + (dn ? " dn" : "");
    r.innerHTML =
      "<div><b>" +
      (q.m ? '<span class="tag">IMPORTANT</span>' : '<span class="tag s">SIDE</span>') +
      q.n +
      "</b><small>" +
      q.d +
      "  ·  " +
      q.g +
      " ✦" +
      (q.x ? ", " + q.x + " XP" : "") +
      "  ·  " +
      ZN[q.z] +
      "  ·  " +
      qGiver(qGv(q)) +
      "</small>" +
      (QSR[i] && !dn ? '<small style="color:#ffb040">★ Special reward: ' + qsrTxt(i) + "</small>" : "") +
      (a && !dn
        ? '<div class="qp"><i style="width:' +
          Math.min(100, (prog(i) / q.k) * 100) +
          '%"></i></div><small>' +
          prog(i) +
          " / " +
          q.k +
          (rd ? "  ·  return to " + qGiver(qGv(q)) : "") +
          "</small>" +
          (rd && qBagFull(i)
            ? '<small style="color:#ffb040">Your bag is full: ' +
              QSR[i].n +
              " will be kept for you until you make room</small>"
            : "")
        : "") +
      "</div>";
    let b = null;
    if (!dn) {
      // v24: the Book only views and tracks; accepting and turning in happen by talking to the quest's giver
      if (rd)
        b =
          k === "book"
            ? btn("Return to " + qGiver(qGv(q)), true)
            : q.m
              ? null
              : btn("Turn in", false, () => {
                  qturn(i);
                  re();
                });
      else if (a)
        b = btn(tk ? "Untrack" : "Track", false, () => {
          P.trk = tk ? -1 : i; // -1 = you chose to track nothing
          sv();
          re();
        });
      else if (!q.m && k === "book")
        b = btn("Ask " + qGiver(qGv(q)), true); // v15: quests are only taken by talking to their giver
      else if (!q.m)
        b = btn("Accept", false, () => {
          qacc(i);
          if (P.atrk) P.trk = i; // auto-track only if the player turned it on in Options
          sv();
          re();
        });
    }
    if (b) r.appendChild(b);
    L.appendChild(r);
  };
  const re = () => panel(k, id),
    qrow = (i, give) => {
      const q = QS[i],
        a = P.qa[i] != null,
        dn = P.done[i],
        rd = a && !dn && prog(i) >= q.k;
      row(
        "<div><b>" +
          (q.m ? "★ " : "") +
          q.n +
          "</b><small>" +
          q.d +
          (a && !dn ? " (" + prog(i) + "/" + q.k + ")" : "") +
          "  Reward " +
          q.g +
          " ✦" +
          (q.x ? ", " + q.x + " XP" : "") +
          (give ? "" : "  · " + ZN[q.z]) +
          "</small></div>" +
          (dn ? "<span>Done</span>" : ""),
        dn
          ? null
          : a
            ? rd
              ? btn("Turn in", false, () => {
                  qturn(i);
                  re();
                })
              : null
            : btn("Accept", false, () => {
                qacc(i);
                re();
              }),
      );
    };
  if (k === "shop") {
    const sh = SHOPS[id],
      d = disc(sh.z);
    $("pt").textContent =
      sh.n + ': "' + sh.l + '"   ✦' + P.gold + (d < 1 ? "   (" + Math.round((1 - d) * 100) + "% friend discount)" : "");
    const pg = SGEAR[id]
      ? subp([
          ["goods", "Goods"],
          ["gear", "Gear"],
        ])
      : "goods";
    if (pg === "goods")
      sh.i.forEach((key) => {
        const it = IT[key],
          c = Math.round(it.c() * d),
          can = it.ok();
        row(
          "<div><b>" + it.n + "</b><small>" + it.d + "</small></div>",
          btn(can ? "✦" + c : "Maxed", !can || P.gold < c, () => {
            P.gold -= c;
            it.buy();
            sv();
            ui();
            re();
          }),
        );
      });
    if (pg === "gear") {
      row(
        "<div><b>Gear for sale</b><small>New stock every time you level up. Compare and equip it in your Bag.</small></div>",
      );
      stock(id).forEach((it, j) => {
        const c = Math.round(it.v * 4 * d),
          sold = it.sold,
          eq = P.gear[it.s];
        row(
          '<img alt="" src="' +
            gIcon(it) +
            '"><div><b style="color:' +
            RAR[it.r].c +
            '">' +
            it.n +
            "</b><small>" +
            RAR[it.r].n +
            " " +
            GSN[it.s] +
            ", Lv " +
            it.lv +
            ": " +
            statTxt(it.st) +
            (itemStyle(it) ? "<br>Style: " + itemStyle(it) : "") +
            (typeof SGR === "object" ? SGR.txt(it) : "") + // v33 school / neutral gear (47-schoolgear.js)
            (eq ? "<br>Wearing: " + eq.n + " (" + statTxt(eq.st) + ")" : "") +
            "</small></div>",
          btn(sold ? "Sold" : "✦" + c, !!sold || P.gold < c || P.inv.length >= INVMAX, () => {
            P.gold -= c;
            it.sold = 1;
            const cp = Object.assign({}, it);
            delete cp.sold;
            giveItem(cp, 1);
            toast("Bought " + it.n, RAR[it.r].c);
            sv();
            ui();
            re();
          }),
        );
      });
    }
  } else if (k === "spells") {
    // v21 Wren's spell shop: a wallet bar, a word from Wren, then the pages laid out as cards. Spell lessons (one per
    // level up) teach any card of your own school for free; glimmers buy them; school points buy other schools' cards.
    // v24: Wren is the giver of "A Page from Wren", so talking to him hands it in once it's ready
    if (talkN && talkN.kind === "w")
      QS.forEach((q, i) => {
        if (qGv(q) === "wren" && P.rdy[i] && !P.done[i]) qturn(i);
      });
    const cn = P.cls ? CL[P.cls][1] : "lamplighter",
      tl = tpLeft(),
      ls = P.lessons || 0;
    $("pt").textContent = "Wren the spellwright";
    const others = Object.keys(CL).filter((c) => c !== P.cls),
      pg = subp(
        [
          ["mine", P.cls ? CL[P.cls][1] : "Yours"],
          ["all", "Any school"],
        ].concat(others.map((c) => [c, CL[c][1]])),
      );
    L.insertAdjacentHTML(
      "beforeend",
      '<div class="wallet"><span title="Glimmers: the lamplighters\' coin">' +
        CUR.ic +
        " " +
        P.gold +
        " <small>" +
        CUR.n +
        '</small></span><span title="School points: one per ★ story quest and class quest">◇ ' +
        tl +
        ' <small>school points</small></span><span class="' +
        (ls ? "hot" : "") +
        '" title="One for every level you gain">✎ ' +
        ls +
        " <small>spell lesson" +
        (ls === 1 ? "" : "s") +
        "</small></span></div>",
    );
    L.insertAdjacentHTML(
      "beforeend",
      '<div class="dlg"><span class="spk">Wren</span><p>' +
        // v21 "A Page from Wren": the first visit, he explains how pages are paid for
        (pg === "mine" && QS.some((q, i) => q.wren && P.qa[i] != null && !P.done[i] && !P.rdy[i])
          ? '"Oona sent you? Good. Here is how it works, ' +
            cn +
            ". Pages of your own school I sell for " +
            CUR.n +
            " (" +
            CUR.ic +
            "), and every time you grow I owe you a lesson: one page, free. Pages from the other four schools " +
            "won't answer to coin. For those you need school points (◇), earned on the ★ story and your class " +
            'trials. Go on, pick one."'
          : pg === "mine"
            ? ls
              ? "\"You've grown, " +
                cn +
                ". I can see it in your lantern. You've " +
                ls +
                " lesson" +
                (ls === 1 ? "" : "s") +
                " owed: pick a page and I'll teach it to you, no charge.\""
              : '"A ' +
                cn +
                ", are you? Your own school's pages are yours for " +
                CUR.n +
                ", or come back each time you grow and I'll teach you one for free.\""
            : pg === "all"
              ? '"These answer to anyone with a steady hand."'
              : "\"Another school's pages won't answer to coin. They want proof: school points, earned on the ★ story and your class trials.\"") +
        "</p></div>",
    );
    const lvOf = (s) => s.lv || (s.q === 7 ? 10 : 5),
      sc = pg === "mine" ? P.cls : pg,
      ks = Object.keys(SPL)
        .filter((k2) => {
          const s = SPL[k2];
          return sc === P.cls ? (s.rl ? s.rl === P.role : s.cl === sc) : !s.rl && s.cl === sc;
        })
        .sort((a, b) => lvOf(SPL[a]) - lvOf(SPL[b]));
    const learnMsg = (s, k2) => {
      toast(
        "Learned " + s.n + (P.deck.includes(k2) ? " (added to your spellbook)" : " (add it in Book > Spells)"),
        ELC[s.a],
      );
      P.wrenL = (P.wrenL || 0) + 1; // v21 quest "A Page from Wren"
      qchk();
      QS.forEach((q, i) => {
        if (qGv(q) === "wren" && P.rdy[i] && !P.done[i]) qturn(i); // v24: handed straight back to Wren
      });
    };
    const grid = document.createElement("div");
    grid.className = "spgrid";
    ks.forEach((k2) => {
      const s = SPL[k2],
        own = has(k2) && clsOK(k2),
        ok = splOK(k2),
        off = offSchool(k2),
        c = splPrice(k2),
        tc = tpCost(k2),
        inD = P.deck.includes(k2),
        el = s.sch ? schEl() : s.a,
        tr = TIER(s),
        rg = s.ty === "atk" && CDMG[k2] ? cardRange(Object.assign({ k: k2 }, s, { a: el })) : null,
        card = document.createElement("div");
      card.className = "spc" + (own ? " own" : !ok || (s.q != null && !P.done[s.q]) ? " lock" : "");
      card.style.setProperty("--ec", ELC[el] || "#e8c777");
      card.innerHTML =
        '<div class="spa"><img alt="" src="' +
        ART[k2] +
        '"><span class="spp">' +
        "◆".repeat(Math.min(5, s.c)) +
        '</span><span class="spt">' +
        tr[0] +
        "</span>" +
        (own ? '<span class="sprib">' + (inD ? "In spellbook" : "Owned") + "</span>" : "") +
        '</div><b class="spn">' +
        s.n +
        '</b><span class="spk2">' +
        (s.ty === "sum" ? "Summon" : s.ty === "sup" ? "Support" : s.aoe ? "Attack · all foes" : "Attack") +
        (rg ? " · ⚔ " + rg[0] + "–" + rg[1] : "") +
        '</span><small class="spd">' +
        s.t +
        "</small>" +
        (own
          ? ""
          : '<small class="spr">' +
            (s.q != null && !P.done[s.q] ? needTxt(s) : !ok ? "Unlocks at level " + s.lv : "") +
            "</small>");
      const bar = document.createElement("div");
      bar.className = "spb";
      if (!own && ok) {
        if (off)
          bar.appendChild(
            btn("◇" + tc, tl < tc, () => {
              tpBuy(k2);
              learnMsg(s, k2);
              sv();
              ui();
              re();
            }),
          );
        else if (s.q != null) bar.appendChild(btn("Quest reward", true));
        else {
          if (ls) {
            const lb = btn("✎ Learn", false, () => {
              P.lessons = Math.max(0, (P.lessons || 0) - 1);
              learn(k2, 1);
              learnMsg(s, k2);
              sv();
              ui();
              re();
            });
            lb.className = "pb lesson";
            bar.appendChild(lb);
          }
          bar.appendChild(
            btn(CUR.ic + c, P.gold < c, () => {
              P.gold -= c;
              learn(k2, 1);
              learnMsg(s, k2);
              sv();
              ui();
              re();
            }),
          );
        }
      }
      card.appendChild(bar);
      grid.appendChild(card);
    });
    L.appendChild(grid);
    L.insertAdjacentHTML(
      "beforeend",
      '<small style="color:#b9b3e6;display:block;margin-top:8px">New spells join your spellbook while there\'s room; ' +
        "swap them in Book > Spells. Friends of Lamplight get a discount. Sage Ilsa in Market Lane can refund school " +
        "points (deep cards, level 7+, cost ◇2).</small>",
    );
  } else if (k === "school") {
    // v13 Sage Ilsa: change school (fee) and refund school points (fee)
    const fee = schoolFee(),
      rf = tpResetFee(),
      sp = tpSpent();
    $("pt").textContent = "Sage Ilsa   ✦" + P.gold + "   ◇" + tpLeft();
    L.innerHTML =
      '<div class="dlg"><span class="spk">Ilsa</span><p>"Every lamplighter answers to one school. Changing that is no small thing, and my time isn\'t free. The pages you bought won\'t answer to a new school, so I take them back and pay you what you spent: glimmers for your own school\'s pages, school points for the rest."</p></div>';
    const cb = clsBought().reduce((n, k2) => n + splPrice(k2), 0);
    if (cb || sp)
      row(
        "<div><b>Refund on change: ✦" +
          cb +
          (sp ? " and ◇" + sp : "") +
          "</b><small>Your bought cards leave your library. Starters and quest rewards are not refunded.</small></div>",
      );
    sec("Change school   ✦" + fee);
    Object.keys(CL).forEach((c) => {
      const cur = P.cls === c;
      row(
        '<div><b style="color:#' +
          CL[c][0].toString(16).padStart(6, "0") +
          '">' +
          CL[c][1] +
          " · " +
          ROLE[CLR[c]].tag +
          "</b><small>" +
          CD[c] +
          "</small></div>",
        btn(cur ? "Your school" : "✦" + fee, cur || P.gold < fee, () => {
          if (mode === "battle") return;
          P.gold -= fee;
          const tpBack = tpSpent(),
            back = clsRefund(); // bought cards leave, gold and school points come back
          P.cls = c;
          setRole(CLR[c]); // the class brings its role and starters with it
          g.hp = Math.min(g.hp, mhp());
          tint();
          toast("You now walk the " + CL[c][1] + " school", "#" + CL[c][0].toString(16).padStart(6, "0"));
          if (back || tpBack)
            toast("Refunded ✦" + back + (tpBack ? " and ◇" + tpBack : "") + " for your old cards", "#ffd34d");
          sv();
          ui();
          re();
        }),
      );
    });
    sec("Refund school points   ✦" + rf);
    row(
      "<div><b>Refund all ◇" +
        sp +
        " spent</b><small>Every other-school card you bought with points leaves your library, and the points come back to spend again at Wren's.</small></div>",
      btn("✦" + rf, !sp || P.gold < rf, () => {
        P.gold -= rf;
        tpReset();
        toast("School points refunded: ◇" + tpLeft() + " to spend", "#c9b8ff");
        sv();
        ui();
        re();
      }),
    );
  } else if (k === "bag") {
    const sel = id,
      gs = gst();
    $("pt").textContent = P.name + "'s Bag   ✦" + P.gold;
    L.insertAdjacentHTML(
      "beforeend",
      '<div class="gstat">HP ' +
        g.hp +
        "/" +
        mhp() +
        (statTxt(gs) ? "  ·  " + statTxt(gs, "  ·  ") : "  ·  No gear bonuses yet") +
        "</div>",
    );
    const sl = document.createElement("div");
    sl.className = "gslots";
    GSL.forEach((s) => {
      const it = P.gear[s],
        b = document.createElement("button");
      b.className = "gs" + (it && sel === it.id ? " sel" : "");
      if (it) b.style.borderColor = RAR[it.r].c;
      b.innerHTML =
        '<img alt="" src="' +
        gIcon(it || { s, r: -1 }) +
        '"><div><span>' +
        GSN[s] +
        '</span><b style="color:' +
        (it ? RAR[it.r].c : "#8a7a5a") +
        '">' +
        (it ? it.n : "Empty") +
        "</b></div>";
      b.onclick = () => {
        if (it) panel("bag", it.id);
      };
      if (it) {
        // v22: hovering a worn piece shows you as you are now (compare with the item you picked)
        b.onmouseenter = () => gpvSet(it);
        b.onmouseleave = () => gpvSet(findItem(sel) || null);
      }
      sl.appendChild(b);
    });
    // v22: slots + inventory on the left, the 3D preview (gpvShow) on the right
    const row = document.createElement("div"),
      lc = document.createElement("div"),
      pIt = findItem(sel) || null, // the selected item shows on the model (worn ones look as you are now)
      pv = (x) => () => gpvSet(x || pIt);
    // wrap-reverse: side by side when there's room; on narrow screens the preview wraps onto its own line ABOVE the
    // list (flex-end = the top under wrap-reverse), centred
    row.style.cssText = "display:flex;flex-wrap:wrap-reverse;gap:10px;align-items:flex-end;justify-content:center";
    lc.style.cssText = "flex:1 1 300px;min-width:0";
    row.appendChild(lc);
    L.appendChild(row);
    lc.appendChild(sl);
    lc.insertAdjacentHTML(
      "beforeend",
      '<small style="color:#b9b3e6">Inventory ' +
        P.inv.length +
        "/" +
        INVMAX +
        (BSEL.on
          ? "  ·  tap items to pick them for selling, then Sell selected.</small>"
          : "  ·  tap an item to inspect, equip or sell. Foes drop gear; bosses and alphas drop the best.</small>"),
    );
    // v37 bulk sell: a select mode with quick picks by rarity
    [...BSEL.ids].forEach((id) => P.inv.some((q) => q.id === id) || BSEL.ids.delete(id));
    {
      const bar = document.createElement("div"),
        picked = P.inv.filter((q) => BSEL.ids.has(q.id)),
        worth = picked.reduce((a, q) => a + (q.v || 0), 0),
        redo = () => panel("bag", BSEL.on ? null : sel);
      bar.className = "acts";
      bar.style.cssText = "flex-wrap:wrap;margin:6px 0 0";
      bar.appendChild(
        btn(BSEL.on ? "Done selecting" : "Select to sell", !P.inv.length && !BSEL.on, () => {
          BSEL.on = BSEL.on ? 0 : 1;
          BSEL.ids.clear();
          BSEL.sure = 0;
          redo();
        }),
      );
      if (BSEL.on) {
        RAR.forEach((rr, ri) => {
          const of = P.inv.filter((q) => q.r === ri);
          if (!of.length) return;
          const all = of.every((q) => BSEL.ids.has(q.id)),
            b = btn((all ? "− " : "+ ") + rr.n + " (" + of.length + ")", false, () => {
              of.forEach((q) => (all ? BSEL.ids.delete(q.id) : BSEL.ids.add(q.id)));
              BSEL.sure = 0;
              redo();
            });
          b.style.color = rr.c;
          bar.appendChild(b);
        });
        bar.appendChild(
          btn("All", false, () => {
            const all = P.inv.every((q) => BSEL.ids.has(q.id));
            P.inv.forEach((q) => (all ? BSEL.ids.delete(q.id) : BSEL.ids.add(q.id)));
            BSEL.sure = 0;
            redo();
          }),
        );
        const sb = btn(
          picked.length
            ? BSEL.sure
              ? "Click again to sell " + picked.length + " for ✦" + worth
              : "Sell selected (" + picked.length + ") ✦" + worth
            : "Sell selected",
          !picked.length,
          () => {
            if (!BSEL.sure) {
              BSEL.sure = 1;
              return redo();
            }
            P.inv = P.inv.filter((q) => !BSEL.ids.has(q.id));
            P.gold += worth;
            toast("Sold " + picked.length + " item" + (picked.length > 1 ? "s" : "") + " for ✦" + worth, "#ffd34d");
            BSEL.ids.clear();
            BSEL.sure = 0;
            BSEL.on = 0;
            sv();
            ui();
            panel("bag");
          },
        );
        if (picked.length) sb.style.cssText += ";background:#ffd34d;color:#2a1a05";
        bar.appendChild(sb);
      }
      lc.appendChild(bar);
    }
    const gr = document.createElement("div");
    gr.className = "ggrid";
    for (let i = 0; i < INVMAX; i++) {
      const it = P.inv[i],
        b = document.createElement("button");
      b.className = "gi" + (it ? "" : " em") + (it && (BSEL.on ? BSEL.ids.has(it.id) : sel === it.id) ? " sel" : "");
      if (it) {
        b.style.borderColor = RAR[it.r].c;
        b.innerHTML =
          '<img alt="" src="' +
          gIcon(it) +
          '"><small>' +
          it.lv +
          "</small>" +
          (typeof SGR === "object" ? SGR.badge(it) : "");
        b.title = it.n + (BSEL.on ? " · ✦" + it.v : "");
        if (BSEL.on && BSEL.ids.has(it.id))
          b.insertAdjacentHTML(
            "beforeend",
            '<i style="position:absolute;left:3px;top:1px;font:800 12px system-ui;color:#ffd34d;font-style:normal">✓</i>',
          );
        b.onclick = () => {
          if (!BSEL.on) return panel("bag", it.id);
          BSEL.ids.has(it.id) ? BSEL.ids.delete(it.id) : BSEL.ids.add(it.id);
          BSEL.sure = 0;
          panel("bag");
        };
        b.onmouseenter = pv(it); // hover tries it on
        b.onmouseleave = pv(null);
      } else b.disabled = true;
      gr.appendChild(b);
    }
    lc.appendChild(gr);
    gpvShow(row, pIt);
    const it = findItem(sel);
    if (it) {
      const on = P.gear[it.s] && P.gear[it.s].id === it.id,
        cmp = on ? null : P.gear[it.s],
        dv = document.createElement("div");
      dv.className = "gdet";
      const keys = Object.keys(STN).filter((k2) => it.st[k2] || (cmp && cmp.st[k2]));
      dv.innerHTML =
        '<h4 style="color:' +
        RAR[it.r].c +
        '">' +
        it.n +
        '</h4><small style="color:#b9b3e6">' +
        RAR[it.r].n +
        " " +
        GSN[it.s] +
        "  ·  item level " +
        it.lv +
        (on ? "  ·  equipped" : "") +
        (itemStyle(it)
          ? '<br><span style="color:#ff8ad0">Style: ' +
            itemStyle(it) +
            ". Shows while you wear it; anyone can wear it. Pip can restyle it.</span>"
          : "") +
        (typeof dkTxt === "function" ? dkTxt(it) : "") + // v25b deck items (30-cards-deck.js)
        (typeof SGR === "object" ? SGR.txt(it) : "") + // v33 school / neutral gear (47-schoolgear.js)
        '</small><div style="margin-top:4px">' +
        keys
          .map((k2) => {
            const a = it.st[k2] || 0,
              b2 = cmp ? cmp.st[k2] || 0 : a,
              df = a - b2;
            return (
              "<div>" +
              (a ? "+" + a + STN[k2][1] + " " : '<span class="dn">none </span>') +
              STN[k2][0] +
              (cmp && df
                ? ' <span class="' + (df > 0 ? "up" : "dn") + '">(' + (df > 0 ? "+" : "") + df + ")</span>"
                : "") +
              "</div>"
            );
          })
          .join("") +
        "</div>" +
        (cmp ? '<small style="color:#b9b3e6">Compared with your ' + cmp.n + "</small>" : "");
      const ac = document.createElement("div");
      ac.className = "acts";
      if (on)
        ac.appendChild(
          btn("Unequip", P.inv.length >= INVMAX, () => {
            unequip(it.s);
            panel("bag", it.id);
          }),
        );
      else {
        ac.appendChild(
          btn("Equip", false, () => {
            equip(it);
            panel("bag", it.id);
          }),
        );
        ac.appendChild(
          btn("Sell ✦" + it.v, false, () => {
            P.inv = P.inv.filter((q) => q.id !== it.id);
            P.gold += it.v;
            sv();
            ui();
            panel("bag");
          }),
        );
      }
      dv.appendChild(ac);
      L.appendChild(dv);
    }
    const junk = P.inv.filter((q) => q.r === 0);
    if (junk.length)
      L.appendChild(
        btn("Sell all Common items (" + junk.length + ") ✦" + junk.reduce((a, q) => a + q.v, 0), false, () => {
          P.gold += junk.reduce((a, q) => a + q.v, 0);
          P.inv = P.inv.filter((q) => q.r > 0);
          sv();
          ui();
          panel("bag");
        }),
      );
  } else if (k === "cos") {
    const c = Math.round(60 * disc("hub"));
    $("pt").textContent = "Pip the tailor   ✦" + P.gold;
    P.dye = P.dye || {};
    // try before you buy: tapping a swatch only previews it on you (the camera swings round to show you); Buy makes it stick
    L.innerHTML =
      '<div class="dlg"><span class="spk">Pip</span><p>"Your gear sets your colours: robe, hat, charm (your cape) and boots take their element, rarer pieces shine brighter. Tap a colour and I\'ll hold it up against you. Like it? It\'s ✦' +
      c +
      ' to dye."</p></div>';
    // v13 styles: robe cut, hat and wand. Owned styles switch for free; new ones preview first, then buy once.
    P.look = P.look || { robe: 0, hat: 0, wand: 0 };
    P.lookOwn = P.lookOwn || {};
    // v18: styles live on gear. Picking one restyles the robe / hat / staff you're wearing (the style it came with,
    // lk0, is free to put back); with nothing worn in that slot it's your everyday look (P.look).
    const own = (k, i) => {
        const it = lookItem(k);
        // v33: zone looks you've found on gear (P.zlook, 47-schoolgear.js) count as owned
        return i === 0 || P.lookOwn[k + i] || (it && it.lk0 === i) || (P.zlook && P.zlook[k + i]);
      },
      setLk = (k, i) => {
        const it = lookItem(k);
        if (it) it.lk = i;
        else P.look[k] = i;
      },
      LKN = { robe: "Robe style", hat: "Hat", wand: "Staff / wand" };
    Object.keys(LOOKS).forEach((k) => {
      const cur = lookOf(k),
        s = LOOKS[k][cur],
        pc = Math.round(s.c * disc("hub")),
        wi = lookItem(k),
        r = document.createElement("div");
      r.className = "qc" + (LPRV && LPRV.k === k ? " trk" : "");
      r.innerHTML =
        "<div><b>" +
        LKN[k] +
        ": " +
        s.n +
        "</b><small>" +
        (wi ? "On your " + wi.n + ". " : "") +
        (s.cl && CL[s.cl] ? "[" + (s.zn ? s.zn + " · " : "") + CL[s.cl][1] + " style, anyone can wear it] " : "") +
        s.d +
        (own(k, cur) ? "" : " ✦" + pc + " to restyle, or find gear that comes in it.") +
        "</small></div>";
      const bx = document.createElement("div");
      bx.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;flex:2";
      LOOKS[k].forEach((t, i) =>
        bx.appendChild(
          btn((i === cur ? "✓ " : "") + t.n + (own(k, i) ? "" : " ✦" + Math.round(t.c * disc("hub"))), false, () => {
            if (own(k, i)) {
              LPRV = null;
              setLk(k, i);
              sv();
            } else LPRV = { k, i };
            applyCos();
            re();
          }),
        ),
      );
      if (!own(k, cur)) {
        bx.appendChild(
          btn("Buy ✦" + pc, P.gold < pc, () => {
            P.gold -= pc;
            P.lookOwn[k + cur] = 1;
            setLk(k, cur);
            LPRV = null;
            toast(s.n + " is yours!", "#ff8ad0");
            applyCos();
            sv();
            ui();
            re();
          }),
        );
        bx.appendChild(
          btn("Cancel", false, () => {
            LPRV = null;
            applyCos();
            re();
          }),
        );
      }
      r.appendChild(bx);
      L.appendChild(r);
    });
    if (PRV) {
      const hx = PRV.h == null ? null : "#" + PRV.h.toString(16).padStart(6, "0"),
        todo = PRV.ps.filter((s) => (P.dye[s] != null ? P.dye[s] : null) !== PRV.h),
        pc = PRV.h == null ? 0 : c * todo.length,
        r = document.createElement("div");
      r.className = "qc trk";
      r.innerHTML =
        "<div><b>Previewing: " +
        PRV.ps.map((s) => DYEP[s]).join(", ") +
        " " +
        (hx
          ? '<span class="sw" style="display:inline-block;width:16px;height:16px;vertical-align:middle;background:' +
            hx +
            '"></span>'
          : "in gear colour") +
        "</b><small>" +
        (PRV.h == null
          ? "Back to the colour your gear gives (free)."
          : !todo.length
            ? "Already wearing this."
            : P.gold < pc
              ? "You need ✦" + pc + "."
              : "✦" + pc + " to keep it.") +
        "</small></div>";
      const ac = document.createElement("div");
      ac.style.cssText = "display:flex;gap:6px;flex:none";
      ac.appendChild(
        btn(PRV.h == null ? "Use gear colour" : "Buy ✦" + pc, PRV.h != null && (P.gold < pc || !todo.length), () => {
          const q = PRV;
          PRV = null;
          if (q.h == null) q.ps.forEach((s) => delete P.dye[s]);
          else {
            P.gold -= pc;
            todo.forEach((s) => (P.dye[s] = q.h));
            toast(todo.map((s) => DYEP[s]).join(", ") + " dyed!", "#ff8ad0");
          }
          applyCos();
          sv();
          ui();
          re();
        }),
      );
      ac.appendChild(
        btn("Cancel", false, () => {
          PRV = null;
          applyCos();
          re();
        }),
      );
      r.appendChild(ac);
      L.appendChild(r);
    }
    const setSel = (a) => {
      TSEL = a;
      if (PRV) {
        PRV.ps = TSEL.slice();
        applyCos();
      }
      re();
    };
    const pick = document.createElement("div");
    pick.className = "qc";
    pick.innerHTML = "<div><b>Dye which pieces?</b><small>Tap one or more</small></div>";
    const pb = document.createElement("div");
    pb.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;flex:2";
    Object.keys(DYEP).forEach((s) =>
      pb.appendChild(
        btn((TSEL.includes(s) ? "✓ " : "") + DYEP[s] + (P.dye[s] != null ? " (dyed)" : ""), false, () => {
          const a = TSEL.includes(s) ? TSEL.filter((x) => x !== s) : TSEL.concat(s);
          if (a.length) setSel(a);
        }),
      ),
    );
    pb.appendChild(btn("All", false, () => setSel(Object.keys(DYEP))));
    pick.appendChild(pb);
    L.appendChild(pick);
    const sw = document.createElement("div");
    sw.className = "qc";
    sw.innerHTML = "<div><b>" + TSEL.map((s) => DYEP[s]).join(", ") + "</b><small>✦" + c + " per piece</small></div>";
    const bx = document.createElement("div");
    bx.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;flex:2";
    DYES.forEach((h) => {
      const b = document.createElement("button");
      b.className = "sw" + (PRV && PRV.h === h ? " on" : "");
      b.style.background = "#" + h.toString(16).padStart(6, "0");
      b.title = "Preview";
      b.onclick = () => {
        PRV = { ps: TSEL.slice(), h };
        applyCos();
        re();
      };
      bx.appendChild(b);
    });
    bx.appendChild(
      btn("Gear colour", false, () => {
        PRV = { ps: TSEL.slice(), h: null };
        applyCos();
        re();
      }),
    );
    sw.appendChild(bx);
    L.appendChild(sw);
  } else if (k === "heal") {
    const nm = { hub: "Mira", frost: "Brother Tolle", ember: "Reka" }[id],
      c = Math.round((4 + 2 * P.lvl) * disc(id)),
      full = g.hp >= mhp(),
      bc = Math.round(40 * disc(id));
    $("pt").textContent = nm + ' the healer: "Rest. The dark can wait."   ✦' + P.gold;
    row(
      "<div><b>Mend your wounds</b><small>HP " + g.hp + "/" + mhp() + ". Restores all HP.</small></div>",
      btn(full ? "Full" : "✦" + c, full || P.gold < c, () => {
        P.gold -= c;
        g.hp = mhp();
        sv();
        ui();
        re();
      }),
    );
    row(
      "<div><b>Blessing of Light</b><small>Your next battle starts with +2 pips." +
        (P.bless ? " (active)" : "") +
        "</small></div>",
      btn(P.bless ? "Active" : "✦" + bc, !!P.bless || P.gold < bc, () => {
        P.gold -= bc;
        P.bless = 1;
        sv();
        re();
      }),
    );
  } else if (k === "lore") {
    const l = LORE[id];
    $("pt").textContent = l[0];
    L.innerHTML = '<p class="lore">' + l[1] + "</p>";
  } else if (k === "book") {
    // v20: five groups along the top, each with its own small row of pages (the tab bar stays put while you scroll)
    let tab = id || BOOKL.last || "quests";
    if (tab === "dev" && !DEV.on) tab = "options";
    const grp = BOOKG.find((G) => G[0] === tab || (G[2] && G[2].some((s) => s[0] === tab))) || BOOKG[0];
    BOOKL[grp[0]] = tab;
    BOOKL.last = tab;
    PKEY = "book:" + tab + ":";
    $("pt").textContent = P.name + "'s Book";
    BOOKG.forEach((G) => {
      const b = document.createElement("button");
      b.textContent = G[1];
      if (G === grp) b.className = "on";
      b.onclick = () => panel("book", BOOKL[G[0]] || G[0]);
      TB.appendChild(b);
    });
    const subs = (grp[2] || []).concat(grp[0] === "options" && DEV.on ? [["dev", "Dev"]] : []);
    if (subs.length) {
      const sb = document.createElement("div");
      sb.className = "tsub";
      subs.forEach(([t, n]) => {
        const b = document.createElement("button");
        b.textContent = n;
        if (t === tab) b.className = "on";
        b.onclick = () => panel("book", t);
        sb.appendChild(b);
      });
      TB.appendChild(sb);
    }
    // a section you can fold away; remembers open/closed for this visit
    const fold = (key, title, def, fn) => {
      const d = document.createElement("details");
      d.className = "fold";
      d.open = BOOKO[key] != null ? BOOKO[key] : def;
      d.ontoggle = () => (BOOKO[key] = d.open);
      d.innerHTML = '<summary class="sec">' + title + "</summary>";
      const n0 = L.childNodes.length;
      fn();
      [...L.childNodes].slice(n0).forEach((n) => d.appendChild(n));
      L.appendChild(d);
    };
    const hd = (t) =>
      L.insertAdjacentHTML(
        "beforeend",
        '<div style="font:800 11px system-ui;letter-spacing:.12em;text-transform:uppercase;color:#e8c777;margin:10px 0 2px">' +
          t +
          "</div>",
      );
    if (tab === "quests") {
      const mq = qMain();
      if (mq >= 0 && P.qa[mq] == null) {
        const q = QS[mq];
        L.insertAdjacentHTML(
          "beforeend",
          '<div class="qc imp"><div><b><span class="tag">IMPORTANT</span>' +
            q.n +
            "</b><small>" +
            (qOpen(mq)
              ? "Talk to " + qGiver(qGv(q)) + " to begin (look for the gold !)"
              : "Reach level " + q.lv + ", then talk to " + qGiver(qGv(q))) +
            "</small></div></div>",
        );
      } else if (mq < 0)
        L.insertAdjacentHTML(
          "beforeend",
          '<div class="qc imp"><div><b>The story is complete</b><small>The Dawn Ember\'s light is home. Side quests, dungeons and rematches remain.</small></div></div>',
        );
      // v15 story chapters: the ★ quest line as a journey through the world (Wizard101-style world arc)
      const chDone = STCH.filter((c) => c[2].every((i) => P.done[i])).length;
      fold("chap", "Story chapters (" + chDone + "/" + STCH.length + ")", false, () =>
        STCH.forEach(([nm, lv, qs], ci) => {
          const nd = qs.filter((i) => P.done[i]).length,
            all = nd === qs.length,
            on = !all && qs.some((i) => P.done[i] || P.qa[i] != null || qOpen(i)),
            nxt = qs.find((i) => !P.done[i]);
          L.insertAdjacentHTML(
            "beforeend",
            '<div class="qc' +
              (on ? " imp" : "") +
              '" style="opacity:' +
              (all || on ? 1 : 0.55) +
              '"><div><b>' +
              (all ? "✓ " : on ? "★ " : "🔒 ") +
              "Chapter " +
              (ci + 1) +
              ": " +
              nm +
              ' <span style="color:#b9b3e6;font-size:11px">' +
              lv +
              "</span></b><small>" +
              (all
                ? "Complete (" + qs.length + "/" + qs.length + ")"
                : nd +
                  "/" +
                  qs.length +
                  " done" +
                  (on && nxt != null ? "  ·  Next: " + QS[nxt].n : "  ·  Finish the chapter before to begin")) +
              "</small></div></div>",
          );
        }),
      );
      const cur = QS.map((q, i) => i)
          .filter((i) => P.qa[i] != null && !P.done[i])
          .sort((a, b) => (QS[b].m ? 1 : 0) - (QS[a].m ? 1 : 0)),
        av = QS.map((q, i) => i).filter((i) => !QS[i].m && P.qa[i] == null && !P.done[i] && qOpen(i)),
        dn = QS.map((q, i) => i).filter((i) => P.done[i]);
      sec("Current (" + cur.length + ")");
      if (!cur.length) L.insertAdjacentHTML("beforeend", '<small style="color:#b9b3e6">No quests in progress.</small>');
      cur.forEach((i) => qcard(i));
      if (av.length) fold("side", "Side quests available (" + av.length + ")", true, () => av.forEach((i) => qcard(i)));
      fold("qdone", "Completed (" + dn.length + ")", false, () =>
        L.insertAdjacentHTML(
          "beforeend",
          '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
            (dn.length
              ? dn
                  .map(
                    (i) =>
                      '<span style="font-size:11px;padding:2px 8px;border-radius:8px;border:1px solid ' +
                      (QS[i].m ? "#c9a24a" : "#5a4a8a") +
                      ';color:#c9bfa0">✓ ' +
                      QS[i].n +
                      "</span>",
                  )
                  .join("")
              : '<small style="color:#b9b3e6">Nothing yet.</small>') +
            "</div>",
        ),
      );
    } else if (tab === "bestiary") {
      // v15: every foe you've beaten, by family. Finish a family for gold and a permanent +10 max HP.
      row(
        "<div><b>Light boosts: +" +
          lbst() +
          " max HP</b><small>Every ★ story quest and dungeon quest adds +5, every finished bestiary family adds +10.</small></div>",
      );
      const bd = (n) => (n >= 50 ? " 🥇" : n >= 25 ? " 🥈" : n >= 10 ? " 🥉" : "");
      BESTF.forEach(([nm, list, gold], i) => {
        const got = list.filter((n) => (P.best || {})[n]).length;
        fold(
          "best" + i,
          nm + " (" + got + "/" + list.length + ")" + (P.bestR && P.bestR[i] ? "  ✓" : ""),
          false,
          () => {
            list.forEach((n) => {
              const c = (P.best || {})[n] || 0;
              row(
                "<div><b>" +
                  (c ? n + bd(c) : "???") +
                  "</b><small>" +
                  (c ? "Defeated " + c + "x" : "Not met yet") +
                  (c && typeof wkName === "function" && wkName(n)
                    ? '<br><span style="color:#ffd27a">' + wkName(n) + "</span>" // v23 weaknesses (22-weak.js)
                    : "") +
                  "</small></div>",
              );
            });
            if (!(P.bestR && P.bestR[i]))
              L.insertAdjacentHTML(
                "beforeend",
                '<small style="color:#e8c777">Defeat one of each: +' + gold + " ✦ and +10 max HP</small>",
              );
          },
        );
      });
      L.insertAdjacentHTML(
        "beforeend",
        '<small style="display:block;margin-top:8px;color:#b9b3e6">Badges: 🥉 10 defeated, 🥈 25, 🥇 50.</small>',
      );
    } else if (tab === "progress") {
      {
        const nc = Object.keys(P.chest || {}).length,
          nl = Object.keys(P.lit || {}).filter((k) => k !== "all").length;
        row(
          "<div><b>Treasure chests: " +
            nc +
            " / " +
            CHESTS.length +
            "</b><small>Golden glints off the beaten path: the roads, the glades, both zones and the Gloomspire. Each holds gear.</small></div>",
        );
        row(
          "<div><b>Snuffed lamps: " +
            nl +
            " / " +
            LAMPS.length +
            "</b><small>Something has put out lamps around Duskwick (they flicker purple). Walk up to relight one" +
            (nl >= LAMPS.length ? ". All burning: thank you!" : ". Light them all for a gift.") +
            "</small></div>",
        );
        DUN.forEach((D, i) =>
          row(
            "<div><b>Dungeon: " +
              D.n +
              " (Lv " +
              D.lv +
              ")</b><small>" +
              (P.dun && P.dun[i]
                ? "Cleared " + P.dun[i] + "x. Foes return each time you go in."
                : "Swirling door at " + D.where + ". First clear: big bonus and an Epic reward.") +
              "</small></div>",
          ),
        );
      }
      Object.keys(ZN).forEach((z) => {
        const r = rk(z),
          nx = RANKS[r + 1];
        row(
          "<div><b>" +
            ZN[z] +
            " reputation</b><small>" +
            RN[r] +
            "  (" +
            (P.rep[z] || 0) +
            (nx ? " / " + nx : " max") +
            ")</small></div>",
        );
      });
    } else if (tab === "options" || tab === "optdisp" || tab === "optgame") {
      // v20: three short pages instead of one long list; the full explanation is on hover (title)
      const opt = (t, d, tip, b) => {
        row("<div><b>" + t + "</b><small>" + d + "</small></div>", b);
        L.lastChild.title = tip || "";
      };
      const flip = (key, after) => () => {
        P[key] = P[key] ? 0 : 1;
        if (after) after();
        sv();
        re();
      };
      if (tab === "options") {
        opt(
          "Battle speed",
          "Faster battle animations (X in battle)",
          "",
          btn(SPD + "x", false, () => {
            setSpd(SPD === 1 ? 2 : 1);
            re();
          }),
        );
        opt(
          "Turn timer",
          "45 seconds per turn, then it ends",
          "",
          btn(P.notimer ? "Off" : "On", false, flip("notimer")),
        );
        opt(
          "Timed hits and blocks",
          "Space / click as the ring closes",
          "Attacks hit harder and foes' hits are blocked when you press Space or click as the ring closes",
          btn(P.noqt ? "Off" : "On", false, flip("noqt")),
        );
      } else if (tab === "optdisp") {
        opt(
          "Graphics",
          "Lower is smoother on laptops",
          "Fewer pixels and fewer lit fires. Low also turns off edge smoothing the next time you open the game.",
          btn({ high: "High", med: "Medium", low: "Low" }[GFX], false, () => {
            setGfx({ high: "med", med: "low", low: "high" }[GFX]);
            lpT = 0;
            re();
          }),
        );
        opt(
          "Glow",
          "How strongly spells and lanterns shine",
          "Spells, lanterns, sparks and glowing eyes. Soft is easiest on the eyes.",
          btn({ soft: "Soft", med: "Medium", bright: "Bright" }[GLOW], false, () => {
            setGlow({ soft: "med", med: "bright", bright: "soft" }[GLOW]);
            re();
          }),
        );
        opt(
          "Ground markers",
          "Safe-zone rings, edge lines, foe rings",
          "The green safe-zone rings, sidewalk edge lines and the red/green rings around foes",
          btn(P.nolines ? "Off" : "On", false, flip("nolines", setLines)),
        );
        if (fsOK())
          opt(
            "Fullscreen",
            "Also F while exploring; Esc leaves",
            "",
            btn(fsOn() ? "On" : "Off", false, () => {
              toggleFS();
              setTimeout(re, 250);
            }),
          );
      } else {
        opt(
          "Auto-track quests",
          "New and next quests get tracked for you",
          "On: a quest you accept becomes the tracked one, and when you turn in the tracked quest the next one is picked for you. Off: you choose with Track / Untrack in the Quests page.",
          btn(P.atrk ? "On" : "Off", false, flip("atrk")),
        );
        opt(
          "Lamplighter's Primer",
          "Replay the tutorial",
          "Moving, the Book, cards and pips, timed hits and blocks, and fighting beside a party",
          btn("Replay", false, () => {
            $("panel").style.display = "none";
            tutStart(1);
          }),
        );
        opt(
          "Developer mode",
          "Testing tools (Dev page, or press `)",
          "God mode, noclip, teleports, levels, glimmers, gear, quest skips, and a Win button (K) in battle",
          btn(DEV.on ? "On" : "Off", false, () => {
            DEV.on = DEV.on ? 0 : 1;
            devSv();
            panel("book", DEV.on ? "dev" : "optgame");
          }),
        );
        opt(
          "Switch character",
          "Save and go to character select",
          "",
          btn("Switch", false, () => {
            sv();
            $("panel").style.display = "none";
            showChars();
          }),
        );
      }
    } else if (tab === "dev") {
      const tg = (k, t, d) =>
          row(
            "<div><b>" + t + "</b><small>" + d + "</small></div>",
            btn(DEV[k] ? "On" : "Off", false, () => {
              DEV[k] = DEV[k] ? 0 : 1;
              devSv();
              re();
            }),
          ),
        done = (m) => {
          toast("DEV: " + m, "#d08aff");
          sv();
          ui();
          re();
        };
      L.insertAdjacentHTML(
        "beforeend",
        '<small style="color:#d08aff">Developer tools. Saved in this browser. Turn off in Options.</small>',
      );
      fold("dcheat", "Cheats", true, () => {
        tg("god", "God mode", "You take no damage in battle (burns included)");
        tg("pf", "Peaceful", "Foes never start a fight when you step into their ring");
        tg("nc", "Noclip", "Walk through walls, houses and off the paths");
        tg("nw", "Ignore gloom wards", "Walk through the purple story gloom without doing its quest");
        tg("fps", "FPS counter", "Show frames per second next to the DEV badge");
        row(
          "<div><b>Move speed</b><small>Multiplies walking and running speed</small></div>",
          btn(DEV.sp + "x", false, () => {
            DEV.sp = DEV.sp >= 3 ? 1 : DEV.sp + 1;
            devSv();
            re();
          }),
        );
        row(
          "<div><b>Party bots (switched off)</b><small>Test heroes that joined every battle. Turned off for now (NPCJOIN in 10-battle-flow.js); this setting is kept for later.</small></div>",
          btn(String(DEV.bots || 0), false, () => {
            DEV.bots = ((DEV.bots || 0) + 1) % 4;
            devSv();
            re();
          }),
        );
      });
      fold("dchar", "Character", false, () => {
        const bx = document.createElement("div");
        bx.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;padding:4px 0";
        const lv = (d) => {
          P.lvl = Math.max(1, Math.min(20, d));
          P.xp = 0;
          g.hp = mhp();
          unl();
          done("level " + P.lvl);
        };
        [
          ["Lv -1", () => lv(P.lvl - 1)],
          ["Lv +1", () => lv(P.lvl + 1)],
          ["Lv 10", () => lv(10)],
          ["Lv 20", () => lv(20)],
          [
            "+1000 ✦",
            () => {
              P.gold += 1000;
              done("+1000 glimmers");
            },
          ],
          [
            "Full heal",
            () => {
              g.hp = mhp();
              done("healed");
            },
          ],
          [
            "Rare gear",
            () => {
              giveItem(genItem(null, P.lvl, 2));
              done("rare item");
            },
          ],
          [
            "Epic gear",
            () => {
              giveItem(genItem(null, P.lvl, 3));
              done("epic item");
            },
          ],
          [
            "Legendary gear",
            () => {
              giveItem(genItem(null, P.lvl, 4));
              done("legendary item");
            },
          ],
          [
            "Learn class spells",
            () => {
              Object.keys(SPL)
                .filter(clsOK)
                .forEach((k) => learn(k, 1));
              done("all " + (P.cls ? CL[P.cls][1] : "") + " spells learned (level/quest locks still apply)");
            },
          ],
        ].forEach(([t, f]) => bx.appendChild(btn(t, false, f)));
        L.appendChild(bx);
      });
      fold("dquest", "Quests & world", false, () => {
        const bx = document.createElement("div");
        bx.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;padding:4px 0";
        [
          [
            "Finish story step",
            () => {
              const mq = qMain();
              if (mq < 0) return done("story already complete");
              if (P.qa[mq] == null) qacc(mq);
              qdone(mq);
              const dq = dunQSkip(); // dungeons the story has reached count as cleared (their gates open)
              done('finished "' + QS[mq].n + '"' + (dq ? " and " + dq + " dungeon(s)" : ""));
            },
          ],
          [
            "Finish whole story",
            () => {
              let n = 0,
                mq;
              while ((mq = qMain()) >= 0 && n < 40) {
                if (P.qa[mq] == null) qacc(mq);
                qdone(mq);
                n += 1 + dunQSkip();
              }
              done("story complete (" + n + " quests)");
            },
          ],
          [
            "Unlock fast travel",
            () => {
              P.vis = Object.assign(P.vis || {}, { ge: 1, gw: 1, frost: 1, ember: 1 });
              done("fast travel unlocked");
            },
          ],
          [
            "Respawn foes",
            () => {
              foes.forEach((f) => {
                if (f.dead && !f.edHid) {
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
              done("foes respawned");
            },
          ],
          [
            "Reset chests & lamps",
            () => {
              P.chest = {};
              P.lit = {};
              refreshFinds();
              done("chests and lamps reset");
            },
          ],
        ].forEach(([t, f]) => bx.appendChild(btn(t, false, f)));
        L.appendChild(bx);
      });
      fold("dtp", "Teleport", false, () => {
        const bx = document.createElement("div");
        bx.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;padding:4px 0";
        [
          ["Lamplight Square", [OX, OZ + 9, Math.PI]],
          ["Market Lane", [OX, OZ + MLZ + 8, Math.PI]],
          ["Gloomway (middle)", [OX, OZ - 160, Math.PI]],
          ["Gloomway end plaza", [OX, OZ + PZ + 8, Math.PI]],
          ["Hollow Road", [...RMAP(70, 6.6).slice(0, 2), -Math.PI / 2 + RMAP(70, 6.6)[2]]],
          ["Wispwood Glade", [OX + RDS[0].gx + 4, OZ + RDS[0].gz, -Math.PI / 2]],
          ["Ashen Trail", [...RMAP(-70, -6.6).slice(0, 2), Math.PI / 2 + RMAP(-70, -6.6)[2]]],
          ["Cinder Hollow", [OX + RDS[1].gx - 4, OZ + RDS[1].gz, Math.PI / 2]],
          ["Frostfen", [ZCEN.frost[0], ZCEN.frost[1] + 24, Math.PI]], // v45: live centres (re-layout)
          ["Cinderwaste", [ZCEN.ember[0], ZCEN.ember[1] + 24, Math.PI]],
          ...TF.map((f, i) => ["Gloomspire " + (i + 1), [f.x, f.z + 6.5, Math.PI], towerReset]),
          ...DUN.map((D, i) => [D.n, [D.bx, D.ez, Math.PI], () => dunReset(i)]),
          ...DUN.map((D, i) => [
            D.n.split(" ").pop() + " boss hall",
            [D.bx, D.R[2][1] + 6, Math.PI],
            () => dunReset(i),
          ]),
        ].forEach(([t, to, on]) =>
          bx.appendChild(
            btn(t, false, () => {
              $("panel").style.display = "none";
              paused = false;
              talkN = null;
              tp({ to, on });
            }),
          ),
        );
        L.appendChild(bx);
      });
      L.insertAdjacentHTML(
        "beforeend",
        '<small style="color:#b9b3e6">Hotkeys while dev mode is on: ` opens this tab, K wins the current battle, N toggles noclip.</small>',
      );
    } else if (tab === "spells") {
      P.deck = P.deck.filter(useOK);
      const d = P.deck;
      fold(
        "clsrole",
        "Class & role: " + (P.cls ? CL[P.cls][1] : "none") + (ROLE[P.role] ? " · " + ROLE[P.role].n : ""),
        false,
        () => {
          row(
            "<div><b>Class: " +
              (P.cls ? CL[P.cls][1] : "none") +
              "</b><small>" +
              (P.cls ? CD[P.cls] : "") +
              " Your school's cards are learned at Wren's with spell lessons (one per level) or glimmers; other schools' cards cost school points (◇" +
              tpLeft() +
              " left). To change school, see Sage Ilsa in Market Lane (for a fee).</small></div>",
          );
          {
            const R = ROLE[P.role];
            row(
              "<div><b>Role: " +
                (R ? '<span style="color:' + R.col + '">' + R.n + "</span> (" + R.tag + ")" : "none") +
                "</b><small>" +
                (R ? R.d : "") +
                " Your class decides your role. Switching class keeps the spells you have earned for each one.</small></div>",
            );
          }
        },
      );
      row(
        "<div><b>Spellbook " +
          d.length +
          "/" +
          dmax() +
          "</b><small>Your hand is drawn from these. More slots open as you level. Buy new spells from Wren the spellwright in Lamplight Square.</small></div>",
      );
      const own = Object.keys(SPL).filter(useOK);
      own.forEach((k) => {
        const s = SPL[k],
          inD = d.includes(k),
          tr = TIER(s);
        row(
          '<img alt="" src="' +
            ART[k] +
            '"><div><b>' +
            s.n +
            ' <span style="color:#ffd34d">◆' +
            s.c +
            '</span> <span style="font-size:10px;color:#c9b8ff">' +
            tr[0] +
            "</span></b><small>" +
            (s.ty === "sum" ? "Summon. " : s.ty === "sup" ? "Support. " : "") +
            s.t +
            "</small></div>",
          inD
            ? btn("Remove", d.length <= 2, () => {
                d.splice(d.indexOf(k), 1);
                sv();
                re();
              })
            : btn("Add", d.length >= dmax(), () => {
                d.push(k);
                sv();
                re();
              }),
        );
      });
      const nx = Object.keys(SPL)
        .filter((k) => clsOK(k) && !has(k))
        .sort((a, b) => (SPL[a].lv || 99) - (SPL[b].lv || 99));
      if (nx.length)
        fold("tolearn", "Still to learn (" + nx.length + ")", false, () =>
          L.insertAdjacentHTML(
            "beforeend",
            '<small style="color:#b9b3e6">' +
              nx.map((k) => SPL[k].n + (splOK(k) ? " (at Wren's now)" : " (" + needTxt(SPL[k]) + ")")).join(", ") +
              "</small>",
          ),
        );
    } else if (tab === "party") {
      row(
        "<div><b>Companions (resting for now)</b><small>Companions don't join battles at the moment; your party " +
          "pads are kept for real players and your own summons. The ones you've met wait here for later.</small></div>",
      );
      Object.keys(ALLY)
        .filter((k) => ALLY[k].comp)
        .forEach((k) => {
          const a = ALLY[k],
            ok = compOK(k),
            on = P.comp.includes(k);
          row(
            "<div><b>" +
              a.n +
              "</b><small>" +
              a.d +
              ", " +
              a.hp +
              " HP" +
              (ok ? "" : "  · Locked: " + needTxt(a)) +
              "</small></div>",
            ok
              ? btn(on ? "On call" : "Resting", !on && P.comp.length >= 3, () => {
                  on ? P.comp.splice(P.comp.indexOf(k), 1) : P.comp.push(k);
                  sv();
                  re();
                })
              : btn("Locked", true),
          );
        });
    } else if (tab === "friends")
      socialTab(L, row, btn); // v19, 18-social.js
    else if (tab === "lore")
      LORE.forEach((l, i) =>
        row(
          "<div><b>" +
            (P.lore[i] ? l[0] : "???") +
            "</b><small>" +
            (P.lore[i] ? l[1].slice(0, 72) + "..." : "A lore stone waits " + l[2] + ".") +
            "</small></div>",
          P.lore[i] ? btn("Read", false, () => panel("lore", i)) : null,
        ),
      );
    else
      TRV.forEach((t) => {
        const ok = !t.v || P.vis[t.v];
        row(
          "<div><b>" +
            t.n +
            "</b><small>" +
            (ok ? "Travel there instantly" : "Visit once to unlock") +
            "</small></div>",
          btn(ok ? "Go" : "Locked", !ok, () => travel(t)),
        );
      });
  } else {
    // quest giver: story quests come one at a time, with dialogue; finished story quests are handed back here
    // v24: z is the giver key (qGv): Oona, Tamsin, Brenna, Vesna or Old Maud
    const z = id,
      mq = qMain(),
      spk = qGiver(z);
    $("pt").textContent = (QGN[z] || QGN.hub)[1];
    // a special reward named under the offer / hand-in, with the full-bag warning when it can't be carried
    const srNote = (i) => {
      if (!QSR[i] || P.done[i]) return;
      const full = P.qa[i] != null && prog(i) >= QS[i].k && qBagFull(i);
      L.insertAdjacentHTML(
        "beforeend",
        '<div class="qc imp"><div><b style="color:#ffb040">★ Special reward: ' +
          qsrTxt(i) +
          "</b><small>" +
          (full
            ? '<span style="color:#ffb040">Your bag is full, so I\'ll keep ' +
              QSR[i].n +
              " for you until you make room. Hand the quest in whenever you like.</span>"
            : "For " + QSR[i].d + ". Made for you when you hand the quest in.") +
          "</small></div></div>",
      );
    };
    const dlg = (lines, last) => {
      const d = document.createElement("div");
      d.className = "dlg";
      const i = Math.min(DLGI, lines.length - 1);
      d.innerHTML = '<span class="spk">' + spk + "</span><p>" + lines[i] + "</p>";
      const a = document.createElement("div");
      a.className = "da";
      if (i < lines.length - 1)
        a.appendChild(
          btn("Next ▶", false, () => {
            DLGI++;
            re();
          }),
        );
      else if (last) a.appendChild(last);
      d.appendChild(a);
      L.appendChild(d);
    };
    const rs = QS.findIndex((q, i) => q.m && qGv(q) === z && P.qa[i] != null && !P.done[i] && prog(i) >= q.k);
    if (rs >= 0) {
      dlg(
        [(SDONE[rs] || "Well done, lamplighter.").replace(/^\([^)]*\)\s*/, "")], // old board notes: "(Under the note:)"
        btn("Complete: " + QS[rs].n, false, () => {
          DLGI = 0;
          qturn(rs); // v30: with a full bag the quest still completes; the reward waits in P.qhold
          re();
        }),
      );
      srNote(rs);
    } else if (mq >= 0 && qGv(QS[mq]) === z && P.qa[mq] == null) {
      const q = QS[mq];
      if (qOpen(mq))
        dlg(
          (STORY[mq] || [q.s]).filter((l) => !/^- /.test(l)), // drop the old board notes' "- Brenna" signatures
          btn("Accept: " + q.n, false, () => {
            DLGI = 0;
            qacc(mq);
            if (P.atrk) P.trk = mq;
            sv();
            re();
          }),
        );
      else dlg(["You're not ready for what comes next. Reach level " + q.lv + ", then come back to me."]);
      srNote(mq);
    } else if (mq >= 0 && P.qa[mq] != null && qGv(QS[mq]) === z)
      dlg(['"' + QS[mq].d + ".\" Come back to me when it's done."]);
    else if (z !== "hub")
      dlg([
        {
          lane: "The Guild keeps the town's smaller troubles. Oona has enough on her plate. What can you take on?",
          frost: "Frostfen remembers its friends, lamplighter. There's always work while the cold holds.",
          ember: "Father's at the forge, so his errands come through me. Mind the hounds out there.",
          marsh: "Mind the water, dearie. The bog keeps what it takes, unless someone takes it back.",
        }[z] || "Well met, lamplighter.",
      ]);
    else if (mq >= 0) dlg(["Your next important task waits with " + qGiver(qGv(QS[mq])) + "."]);
    else dlg(["The light is home. Thank you, lamplighter."]);
    if (rs >= 0 || (mq >= 0 && qGv(QS[mq]) === z && P.qa[mq] != null)) qcard(rs >= 0 ? rs : mq);
    const sq = QS.map((q, i) => i).filter(
      (i) => !QS[i].m && qGv(QS[i]) === z && !P.done[i] && (qOpen(i) || P.qa[i] != null),
    );
    if (sq.length) {
      sec("Side quests");
      sq.forEach((i) => qcard(i));
    }
  }
  $("panel").classList.toggle("talk", !!talkN && k !== "book" && k !== "bag" && k !== "lore");
  BOX.classList.toggle("wide", k === "spells"); // v21: Wren's card grid gets a wider page
  BOX.style.width = k === "bag" ? "min(720px,100%)" : ""; // v22: room for the Bag's 3D preview beside the gear
  $("panel").style.display = "flex";
  BOX.scrollTop = keep; // buying, adding a spell or turning in a quest no longer jumps you back to the top
  paused = true;
}
$("pc").onclick = () => {
  $("panel").style.display = "none";
  paused = false;
  talkN = null;
  MIRR = false;
  C.clearViewOffset();
  C.aspect = (R.domElement.clientWidth || 1) / (R.domElement.clientHeight || 1);
  C.updateProjectionMatrix();
  mirrClear();
  $("panel").classList.remove("mirror");
  if (PRV || LPRV) {
    PRV = LPRV = null;
    applyCos();
  }
};
$("px").onclick = () => $("pc").onclick(); // the corner ✕ does the same as Close
// talking: the camera swings in beside the person you are talking to, and you turn to face them
const TKV = new T.Vector3(),
  TKL = new T.Vector3();
// at Pip's: anything small standing between the mirror camera and you (shopkeepers, townsfolk, stalls, lamps) steps out of view
let MHID = [],
  MIRRH = 0,
  MIRRY = 0; // v47 polish: drag on the world view at Pip's mirror to turn yourself
function mirrClear() {
  MHID.forEach((o) => (o.visible = true));
  MHID = [];
  MIRRH = 0;
  MIRRY = 0;
}
{
  let mx = null;
  R.domElement.addEventListener("pointerdown", (e) => {
    if (MIRRH) mx = e.clientX;
  });
  addEventListener("pointermove", (e) => {
    if (mx == null || !MIRRH) return;
    MIRRY += (e.clientX - mx) * 0.012;
    mx = e.clientX;
  });
  addEventListener("pointerup", () => (mx = null));
}
function mirrHide(a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    L2 = dx * dx + dz * dz || 1;
  S.children.forEach((o) => {
    if (
      o === W ||
      o === BG ||
      o === FF ||
      o === MTG ||
      o === WX ||
      !o.visible ||
      o.isInstancedMesh ||
      o.isPoints ||
      o.isLight
    )
      return;
    if (o.isMesh && o.geometry) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (o.geometry.boundingSphere.radius * Math.max(o.scale.x, o.scale.z) > 5) return;
    }
    const px = o.position.x - a.x,
      pz = o.position.z - a.z,
      t = (px * dx + pz * dz) / L2;
    if (t < -0.05 || t > 0.82) return;
    const ex = px - dx * t,
      ez = pz - dz * t;
    if (ex * ex + ez * ez < 5) {
      o.visible = false;
      MHID.push(o);
    }
  });
}
function talkCam() {
  const n = talkN,
    p = W.position;
  let dx = p.x - n.x,
    dz = p.z - n.z;
  const l = Math.hypot(dx, dz) || 1;
  dx /= l;
  dz /= l;
  // at Pip's: a "mirror" view. The camera swings out to your side and you turn to show off the colour (your back for a cape)
  // v9: a dressing-room view. On wide screens Pip's panel sits on the right and you stand whole (hat tip to boots) in the
  // left part of the screen; on tall screens the panel stays at the bottom and you are framed in the space above it.
  // The camera distance comes from the field of view so the framing holds at any window size.
  if (MIRR) {
    let ux = -dx * 0.35 + dz,
      uz = -dz * 0.35 - dx;
    const ul = Math.hypot(ux, uz) || 1;
    ux /= ul;
    uz /= ul;
    const por = C.aspect < 1,
      th = Math.tan((C.fov * Math.PI) / 360),
      md = por ? 9.5 / th : 3.6 / th;
    TKV.set(p.x + ux * md, 2.8, p.z + uz * md);
    TKL.set(p.x, por ? 1.7 : 1.9, p.z);
    C.position.lerp(TKV, 0.08);
    C.lookAt(TKL);
    {
      const w = R.domElement.clientWidth || 1,
        h = R.domElement.clientHeight || 1;
      if (por) C.setViewOffset(w, h * 1.5, 0, h * 0.5, w, h);
      else C.setViewOffset(w * 1.44, h, w * 0.44, 0, w, h);
    }
    if (!MIRRH) {
      MIRRH = 1;
      mirrClear();
      mirrHide(TKV, p);
    }
    const t = performance.now() / 1000,
      yw = Math.atan2(ux, uz) + (PRV && PRV.ps.includes("cape") ? Math.PI : 0)  + MIRRY; // v47 polish: no idle sway at Pip's mirror, drag to turn
    let d2 = yw - W.rotation.y;
    d2 = Math.atan2(Math.sin(d2), Math.cos(d2));
    W.rotation.y += d2 * 0.08;
    return;
  }
  TKV.set(n.x + dx * 5.2 - dz * 2.6, 3.4, n.z + dz * 5.2 + dx * 2.6);
  TKL.set(n.x + dx * 1.4, 2.3, n.z + dz * 1.4);
  C.position.lerp(TKV, 0.06);
  C.lookAt(TKL);
  let df = Math.atan2(n.x - p.x, n.z - p.z) - W.rotation.y;
  df = Math.atan2(Math.sin(df), Math.cos(df));
  W.rotation.y += df * 0.15;
}
$("book").onclick = () => {
  if (mode === "explore" && !paused) panel("book");
};
$("bag").onclick = () => {
  if (mode === "explore" && !paused) panel("bag");
};
// v21 step 2 of a new character: one card per school with its insignia. Built when the step opens (it used to be
// built as this file loaded, before CSIG in 10-battle-flow.js existed, which left the list empty).
function clsList() {
  const L = $("cl");
  L.innerHTML = "";
  L.className = "sgrid";
  const hx = (c) => "#" + c.toString(16).padStart(6, "0");
  Object.keys(CL).forEach((k) => {
    const R = ROLE[CLR[k]],
      col = hx(CL[k][0]),
      sg = typeof CSIG !== "undefined" && CSIG[k],
      starts = Object.keys(SPL)
        .filter((s) => SPL[s].st && (SPL[s].cl === k || SPL[s].cl === "all" || SPL[s].rl === CLR[k]))
        .map((s) => SPL[s].n),
      card = document.createElement("div");
    card.className = "scard";
    card.style.setProperty("--sc", col);
    // the school's insignia: its symbol in a ringed badge, with a soft halo in the school's colour
    const cv = document.createElement("canvas");
    cv.width = cv.height = 160;
    const x = cv.getContext("2d"),
      gr = x.createRadialGradient(80, 80, 20, 80, 80, 80);
    gr.addColorStop(0, col + "66");
    gr.addColorStop(1, col + "00");
    x.fillStyle = gr;
    x.fillRect(0, 0, 160, 160);
    x.strokeStyle = col + "88";
    x.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      x.beginPath();
      x.moveTo(80 + Math.cos(a) * 62, 80 + Math.sin(a) * 62);
      x.lineTo(80 + Math.cos(a) * 74, 80 + Math.sin(a) * 74);
      x.stroke();
    }
    x.beginPath();
    x.arc(80, 80, 66, 0, 7);
    x.stroke();
    if (typeof SOC !== "undefined" && SOC.icon) SOC.icon(x, k, 80, 80, 50);
    card.appendChild(cv);
    const tx = document.createElement("div");
    tx.className = "stx";
    tx.innerHTML =
      "<b>" +
      CL[k][1] +
      '</b><span class="srole" style="color:' +
      R.col +
      '">' +
      R.n +
      " · " +
      R.tag +
      "</span><small>" +
      CD[k] +
      "</small>" +
      (sg ? '<small><b style="color:' + sg.col + '">' + sg.n + ":</b> " + sg.d + "</small>" : "") +
      '<small class="sst">Starts with: ' +
      starts.join(", ") +
      "</small>";
    card.appendChild(tx);
    const b = document.createElement("button");
    b.className = "pb";
    b.textContent = "Choose " + CL[k][1];
    b.onclick = () => {
      const nm = ((typeof NCN === "string" && NCN.trim()) || $("nm").value.trim() || "Lampwick").slice(0, 12);
      P.name = nm;
      P.cls = k;
      P.role = CLR[k];
      $("cls").style.display = "none";
      const go = () => {
        // v21: write the finished character (name, school, look) into the slot first, so startGame loads exactly this
        P.name = nm;
        P.cls = k;
        P.role = CLR[k];
        sv();
        startGame(SLOT);
        toast("You are a " + CL[k][1] + " " + R.n + ". Oona has role quests for you.", R.col);
        if (typeof tutNew === "function") tutNew(); // v21: begin in the Lamplighters' Vault (16-tutorial.js)
      };
      // v18: pick your look next (12-start.js), then every new character watches the prologue (skippable with Esc /
      // Skip) before stepping into the square
      custOpen(() => {
        if (typeof playIntro === "function") playIntro(go);
        else go();
      });
    };
    card.appendChild(b);
    L.appendChild(card);
  });
}
