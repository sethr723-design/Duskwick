// DUSKWICK - 08-battle.js: Battle core: pads, timed hits (qte), damage (dmg), heals, spell visuals (SFX) and spell effects (CFX).
// Loaded in order by index.html as plain scripts; they share one global scope.
// ---------- battle ----------
const PCH = matchMedia("(pointer:fine)").matches ? "   WASD move, Shift runs, drag or Q/E to turn" : "";
const ELC = { fire: "#ff8a3d", ice: "#7fd8ff", storm: "#ffe066", heal: "#7dff9a", spirit: "#c9a0ff" },
  EHX = { fire: 0xff8a3d, ice: 0x9fe8ff, storm: 0xfff06a, heal: 0x7dff9a, spirit: 0xc9a0ff };
// formation slots in the battle frame (x along the street, z across it): friends on the left, foes on the right
// staggered along the street AND in depth, so no two slots line up behind each other from the camera (they used to hide each other)
// slots sit on the battle circle itself: your team on the left arc, foes on the right arc
const SLA = [Math.PI - 0.3, Math.PI + 0.55, Math.PI - 0.95, Math.PI + 1.2].map((a) => [
    Math.cos(a) * 5.9,
    Math.sin(a) * 5.9,
  ]),
  SLE = SLA.map(([x, z]) => [-x, z]);
[
  ["a", SLA],
  ["e", SLE],
].forEach(([k, L]) =>
  L.forEach(([x, z], i) => {
    const m = new T.Mesh(
      new T.PlaneGeometry(2.7, 2.7),
      new T.MeshBasicMaterial({ map: padTex(k === "e", i + 1), transparent: true, depthWrite: false, opacity: 0.3 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.075, z);
    m.renderOrder = 1;
    PG.add(m);
    PADS[k].push(m);
  }),
);
function padUpd(s) {
  const tf = tgt();
  PADS.a.forEach((m, i) => {
    const on = i === 0 || g.allies.some((a) => a.slot === i) || (g.heroes || []).some((h) => h.slot === i);
    m.material.opacity = on ? 0.85 + 0.15 * Math.sin(s * 3 + i) : 0.3;
    m.scale.setScalar(on ? 1 : 0.9);
  });
  PADS.e.forEach((m, i) => {
    const f = g.foes.find((q) => q.slot === i && q.hp > 0 && !q.gone),
      on = !!f,
      t = f && f === tf;
    m.material.opacity = on ? (t ? 1 : 0.85 + 0.15 * Math.sin(s * 3 + i)) : 0.3;
    m.scale.setScalar(t ? 1.1 : on ? 1 : 0.9);
  });
}
// v20: while a spell is replayed for someone else's cast (a party member on the host's screen, the host's spells on a
// guest's screen, or a battle watched from the street), SFXO says who casts it (src = their lantern, src0 = their feet)
// and which foes it hits (L). The SFX read it through alive(), lanternAt(), casterP() and sfxAl(). See sfxAs (10).
let SFXO = null;
const alive = () => (SFXO ? SFXO.L : g.foes.filter((f) => f.hp > 0));
const casterP = () => (SFXO ? SFXO.src0 : W.position),
  sfxAl = () => (SFXO ? [] : g.allies || []);
const tgt = () => {
  let f = g.foes[g.tgt];
  if (!f || f.hp <= 0) {
    f = alive()[0];
    g.tgt = g.foes.indexOf(f);
  }
  return f;
};
const lvS = () => 1 + 0.08 * (P.lvl - 1);
// timed hits and blocks: a ring closes onto a target circle over whoever is acting; press Space/Enter or click as it lines up.
// 2 = perfect, 1 = good, 0 = missed (or pressed too early). Never a penalty: a miss is just a normal hit.
let QT = null;
const QV = new T.Vector3();
// v22: a player's own attack (card passed as the 3rd argument) gets a charge-up: 1 s of gathering before the ring
// shows, then the ring closes over ~2.9 s, easing in so it is moving about as fast as the old ring when it meets.
// Perfect/good are judged in milliseconds (±85 / ±190, close to the old ring's feel at that speed). The school's
// charge animation (CHG, 23-castfx.js) builds over the whole wait and releases on the press. Blocks keep the old timing.
function qte(kind, obj, card) {
  if (P.noqt || (mode !== "battle" && mode !== "guest")) return Promise.resolve(0); // v15: guests block too
  const lg = kind === "atk" && !!card,
    PRE = lg ? 1000 : 0,
    HIT = 2900; // long mode: ms after PRE when the ring meets the circle
  return new Promise((res) => {
    const el = $("qte"),
      sh = el.querySelector(".sh"),
      lb = el.querySelector(".lb");
    // v18: follow the target every frame (the battle camera swings to whoever is acting and foes lunge, so a spot
    // worked out once at the start drifted off them)
    let yo = kind === "atk" ? 1.6 : 1.4;
    if (obj !== W) {
      // a foe: aim at its middle (bosses and big beasts stand much taller than a wolf)
      obj.updateWorldMatrix(true, true);
      const bx = new T.Box3().setFromObject(obj);
      obj.getWorldPosition(QV);
      if (!bx.isEmpty()) yo = Math.max(0.8, Math.min(6, (bx.max.y - QV.y) * 0.55));
    }
    const place = () => {
      obj.updateWorldMatrix(true, false);
      obj.getWorldPosition(QV);
      QV.y += yo;
      C.updateMatrixWorld();
      QV.project(C);
      const rc = R.domElement.getBoundingClientRect();
      el.style.left = rc.left + ((QV.x + 1) / 2) * rc.width + "px";
      el.style.top = rc.top + ((1 - QV.y) / 2) * rc.height + "px";
    };
    place();
    const D = kind === "atk" ? 900 : 820,
      T0 = performance.now();
    el.className = kind;
    el.style.display = "block";
    lb.textContent = lg
      ? "Gathering power…"
      : kind === "atk"
        ? "Space / click as the ring meets!"
        : "BLOCK! Space / click";
    let cg = null;
    // v31: the host tells everyone in the fight when it charges, so their screens show it on its wizard too
    const tell = lg && mode === "battle" && typeof coopB === "function" && coopB() && g.id;
    if (lg && typeof CHG !== "undefined") {
      try {
        cg = CHG.start(card);
        if (tell) NET.send("chg", { b: g.id, id: P.id, k: card.k, el: cg.el });
      } catch (e) {
        cg = null;
      }
    }
    if (lg) sh.style.opacity = 0;
    const fin = (gr) => {
      if (!QT) return;
      QT = null;
      if (cg) CHG.stop(cg, gr);
      if (tell) NET.send("chgx", { b: g.id, id: P.id, gr });
      el.className = kind + " res";
      lb.textContent =
        gr === 2 ? (kind === "atk" ? "PERFECT!" : "PARRY!") : gr === 1 ? (kind === "atk" ? "Good!" : "Blocked") : "";
      lb.style.color = gr === 2 ? "#ffe066" : gr === 1 ? "#bff0ff" : "#fff";
      setTimeout(
        () => {
          if (!QT) {
            el.style.display = "none";
            lb.style.color = "";
          }
        },
        gr ? 520 : 60,
      );
      res(gr);
    };
    QT = {
      press: () => {
        if (lg) {
          const t = performance.now() - T0 - PRE;
          if (t < 0) return; // still gathering: the ring isn't out yet, so an early press is ignored
          const d = Math.abs(t - HIT);
          fin(d < 85 ? 2 : d < 190 ? 1 : 0);
          return;
        }
        const k = (performance.now() - T0) / D,
          d = Math.abs(k - 0.8);
        fin(d < 0.065 ? 2 : d < 0.15 ? 1 : 0);
      },
    };
    (function step() {
      if (!QT) return;
      if (lg) {
        if (mode !== "battle" && mode !== "guest") return fin(0); // the battle ended under us
        const t = performance.now() - T0 - PRE;
        if (cg) cg.k = t < 0 ? 0.15 * (1 + t / PRE) : 0.15 + 0.85 * Math.min(1, t / HIT);
        if (t >= HIT + 260) return fin(0);
        place();
        if (t < 0) {
          sh.style.opacity = 0;
        } else {
          lb.textContent = "Space / click as the ring meets!";
          // eased close: slow at first, ~0.16 px/ms when it meets (the old ring was ~0.21)
          const u = Math.min(1, t / HIT),
            s = Math.max(18, t <= HIT ? 62 + 150 * (1 - u * u * u) : 62 - 0.156 * (t - HIT));
          sh.style.width = sh.style.height = s + "px";
          sh.style.opacity = t > HIT ? 1 - (t - HIT) / 260 : Math.min(1, t / 250);
        }
        requestAnimationFrame(step);
        return;
      }
      const k = (performance.now() - T0) / D;
      if (k >= 1) {
        fin(0);
        return;
      }
      place();
      const s = Math.max(18, 62 + 150 * (1 - k / 0.8));
      sh.style.width = sh.style.height = s + "px";
      sh.style.opacity = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
      requestAnimationFrame(step);
    })();
  });
}
addEventListener(
  "keydown",
  (e) => {
    if (QT && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) QT.press();
    }
  },
  true,
);
addEventListener(
  "pointerdown",
  (e) => {
    if (QT) {
      e.preventDefault();
      e.stopPropagation();
      QT.press();
    }
  },
  true,
);
// elites: some street foes roll a trait. They glow gold, have more HP and drop better loot
const AFX = {
  armored: ["Armored", "takes 25% less damage"],
  vampiric: ["Vampiric", "heals from its hits"],
  frenzied: ["Frenzied", "hits 30% harder"],
};
// floating combat numbers (rise, pop and fade above whoever was hit or healed)
function popNum(p, n, col, lab, big, lc) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const x = c.getContext("2d");
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.lineJoin = "round";
  if (lab) {
    let fs = 28; // v23: long combined labels ("CRIT! WEAK! MELT +30") shrink to fit
    x.font = "900 " + fs + "px system-ui";
    while (x.measureText(lab).width > 240 && fs > 13) x.font = "900 " + --fs + "px system-ui";
    x.lineWidth = 6;
    x.strokeStyle = "#1a0a10";
    x.strokeText(lab, 128, 28);
    x.fillStyle = lc || "#fff3b0"; // v23: lc = label colour (pink WEAK!, slate RESIST)
    x.fillText(lab, 128, 28);
  }
  x.font = "900 " + (big ? 74 : 58) + "px Georgia,serif";
  x.lineWidth = 10;
  x.strokeStyle = "#1a0a10";
  x.strokeText(n, 128, 84);
  x.fillStyle = col;
  x.fillText(n, 128, 84);
  const tx = new T.CanvasTexture(c),
    sp = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthTest: false, depthWrite: false }));
  sp.renderOrder = 9;
  const x0 = p.x + (Math.random() - 0.5) * 1.2,
    z0 = p.z + 0.6,
    y0 = 2.4 + Math.random() * 0.7,
    s0 = big ? 2.7 : 2.1;
  sp.position.set(x0, y0, z0);
  tmp(sp, 1000, (k) => {
    sp.position.y = y0 + k * 1.7;
    const pk = k < 0.12 ? k / 0.12 : 1,
      pop = big && k < 0.25 ? (0.25 - k) * 1.6 : 0;
    sp.scale.set(s0 * (0.5 + 0.5 * pk + pop), s0 * 0.5 * (0.5 + 0.5 * pk + pop), 1);
    sp.material.opacity = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
  }).then(() => tx.dispose());
}
// v23 elemental weaknesses: every foe kind takes WEAK (x1.5) from some schools and RESISTs (x0.6) others.
// Lookup order: tinted variant (hc) > minion type (min) > beast kind > gloom tier ("g" + t). A foe's own `wk`
// (dungeon bosses in DUN) is laid on top of that, element by element. Heal-school damage is the "heal" element.
const WK_W = 1.5,
  WK_R = 0.6;
const WKT = {
  g1: { heal: WK_W, spirit: WK_W }, // Gloomling: a wisp of shadow. Light undoes it (v30: no storm resist; it made a Gale's whole first street a slog)
  g2: { storm: WK_W, spirit: WK_R }, // Dusk Imp: crackles under storm, slips out of spirit grips
  g3: { fire: WK_W, heal: WK_R }, // Moss Brute: dry moss burns, growth magic feeds it
  g4: { ice: WK_W, fire: WK_R }, // Cinder Fiend: made of embers
  g5: { fire: WK_W, spirit: WK_W, storm: WK_R }, // Gloom Warden: old wards burn and answer to spirits; a storm-cloak
  wolf: { fire: WK_W, ice: WK_R }, // Frost Wolf
  hound: { ice: WK_W, fire: WK_R }, // Ember Hound
  mite: { fire: WK_W, heal: WK_R }, // Moss Mite
  cub: { fire: WK_W, ice: WK_R }, // Rime Cub
  ember: { ice: WK_W, fire: WK_R }, // Emberling / Kiln Imp
  knight: { storm: WK_W, ice: WK_R }, // Gloom Knight: lightning arcs through plate; frost just rimes the armour
};
// tinted gloom variants take their tint's element (ember-orange gloom = ember, moss-green = brute/mite)
const WKTI = { [0xff6a2a]: "ember", [0x2e7a3a]: "g3", [0x6aaa4a]: "mite" };
const WKI = { fire: "🔥", storm: "⚡", ice: "❄", heal: "🌿", spirit: "👻" };
const wkLc = (t) => (t === "WEAK!" ? "#ff5ab4" : t === "RESIST" ? "#a9b6c9" : 0); // popup label colours
const weakOf = (f) => {
  if (!f) return null;
  const b = WKT[(f.hc && WKTI[f.hc]) || (f.min && WKT[f.min] && f.min) || (f.kind === "gloom" ? "g" + f.t : f.kind)];
  return b || f.wk ? Object.assign({}, b, f.wk) : null;
};
const weakTxt = (f) => {
  const w = weakOf(f);
  if (!w) return "";
  const nm = (k) => (WKI[k] || "") + " " + k,
    a = Object.keys(w).filter((k) => w[k] > 1),
    b = Object.keys(w).filter((k) => w[k] < 1);
  return (a.length ? "  Weak: " + a.map(nm).join(", ") : "") + (b.length ? "  Resists: " + b.map(nm).join(", ") : "");
};
function dmg(f, n, el, raw) {
  if (!f || f.hp <= 0) return;
  const gs = gst();
  let mul = raw ? lvS() : lvS() + 0.1 * P.lens + (gs.pow || 0) / 100 + (gs[el] || 0) / 100,
    tag = "";
  // v11 roles: Conjurer summons and Soulbond boost allies; Strikers boost single-target casts, Evokers boost every-foe casts
  if (g.actor === "ally") {
    if (P.role === "summoner") mul *= 1.4;
    if (g.bond) mul *= 1.5;
  } else if (!raw) {
    if (P.role === "damage" && !g.aoeCast) mul *= 1.25;
    if (P.role === "aoe" && g.aoeCast) mul *= 1.25;
    if (g.focus) mul *= g.focus;
  }
  const wk = weakOf(f),
    wm = (wk && wk[el]) || 1,
    wt = wm > 1 ? "WEAK!" : wm < 1 ? "RESIST" : "";
  mul *= wm;
  if (!raw && g.wv > 1) mul *= g.wv;
  // v20: timing sets where in the card's range the hit lands (miss 70%, good 100%, perfect 135% and up)
  if (!raw && g.qm) mul *= g.qm;
  if (!raw && g.wild && el === "fire") mul *= 1.5; // Pyre: Wildfire
  let shat = 0;
  if (!raw && el === "ice" && P.cls === "rime" && g.actor !== "ally" && f.st.chill > 0) {
    mul *= 1.35; // Rimeward: Shatter
    shat = 1;
  }
  if (f.arm && !raw) mul *= 0.75;
  const crit = !raw && Math.random() < (gs.crit || 0) / 100;
  if (crit) mul *= 1.6;
  if (f.guard) {
    mul *= 0.5;
    tag = "GUARDED";
  }
  let d = Math.round(n * mul),
    ex = "";
  if (el === "fire" && f.st.chill > 0) {
    f.st.chill = 0;
    d += 30;
    ex = "MELT +30";
  }
  if (el === "storm" && f.st.burn > 0) {
    f.st.burn = 0;
    d += 20;
    f.stun = true;
    ex = "OVERLOAD +20";
  }
  if (shat) {
    ex = ex ? "SHATTER! " + ex : "SHATTER!";
    fling(chest(f), 10, 5);
    vshock(chest(f), 0xdff8ff, 2, 320);
  }
  if (!raw && g.wild && el === "fire") ex = ex ? "WILDFIRE " + ex : "WILDFIRE!";
  if (!raw && g.actor !== "ally") P.bigHit = Math.max(P.bigHit || 0, d);
  f.hp = Math.max(0, f.hp - d);
  f.hq = 1;
  f.wl = wt; // v23: guests get the WEAK/RESIST label with the next battle snapshot
  popNum(
    f.m.position,
    d,
    ELC[el] || "#fff",
    [crit && "CRIT!", wt, ex || tag].filter(Boolean).join(" "),
    crit || !!ex || wm > 1,
    wkLc(wt),
  );
}
// ===================== v20 damage ranges =====================
// Every attack card has a range: a missed timing ring lands the low end, a perfect one the high end (a Perfect combo
// pushes past it). CDMG is each card's base damage (n = foes standing, al = your allies); QMUL is miss / good / perfect.
const QMUL = [0.7, 1, 1.35];
const CDMG = {
  ember: () => 10,
  meteor: () => 70 + 15 * (P.tome || 0),
  wave: () => 12,
  inferno: () => 40,
  sunbrand: () => 150,
  shard: () => 18,
  lance: () => 32,
  nova: () => 14,
  blizzard: () => 34,
  zero: () => 120,
  spark: () => 12,
  thunder: () => 26,
  chain: () => 20,
  tempest: () => 42,
  skyfall: () => 130,
  lampfall: () => 55,
  thorn: () => 12,
  briar: () => 26,
  bloom: () => 14,
  shade: (n, al) => 10 + 3 * al,
  haunt: () => 24,
  wail: (n, al) => 16 + 4 * al,
  pierce: () => 34,
  execute: () => 48,
  scatter: () => 14,
  cascade: (n) => 20 + 8 * n,
  starfall: () => 38,
};
// [low, high] for an attack card in your hand right now (before weaknesses, Spellweave and crits), or null
function cardRange(c) {
  if (!c || c.ty !== "atk" || !CDMG[c.k]) return null;
  const guest = mode === "guest",
    n = guest && GUEST && GUEST.s ? GUEST.s.foes.filter((f) => f.hp > 0).length : g.foes ? alive().length : 1,
    al = guest ? 0 : (g.allies || []).length,
    gs = gst(),
    el = c.a;
  let mul = guest ? lvS() : lvS() + 0.1 * (P.lens || 0) + (gs.pow || 0) / 100 + (gs[el] || 0) / 100;
  if ((P.role === "damage" && !c.aoe) || (P.role === "aoe" && c.aoe)) mul *= 1.25;
  const b = CDMG[c.k](Math.max(1, n), al) * mul;
  return [Math.max(1, Math.round(b * QMUL[0])), Math.round(b * QMUL[2])];
}
function cardRangeH(c) {
  const r = cardRange(c);
  return r
    ? '<span class="dr" title="Missed timing - Perfect timing (before weaknesses and crits)">⚔ ' +
        r[0] +
        "–" +
        r[1] +
        "</span>"
    : "";
}
{
  const st = document.createElement("style");
  st.textContent =
    ".card .dr{display:block;margin-top:2px;font:800 11px system-ui;color:#ffd27a;text-shadow:0 1px 2px #000;letter-spacing:.02em}" +
    "#en .sig{display:inline-block;margin-left:8px;font:700 12px system-ui;padding:1px 7px;border-radius:9px;background:rgba(0,0,0,.35);border:1px solid currentColor;vertical-align:middle}" +
    "#en .sig.full{animation:sigp .8s ease-in-out infinite alternate}" +
    "@keyframes sigp{from{box-shadow:0 0 2px currentColor}to{box-shadow:0 0 12px currentColor}}";
  document.head.appendChild(st);
}
const healP = (n) => {
  if (iAmDown()) return;
  n = Math.round(n * (1 + (gst().heal || 0) / 100) * (P.role === "healer" ? 1.4 : 1) * (P.cls === "verdant" ? 1.2 : 1));
  const h0 = g.hp;
  g.hp = Math.min(mhp(), g.hp + n);
  if (mode === "battle") P.healed = (P.healed || 0) + (g.hp - h0);
  puff(W.position.clone().setY(1.2), "heal", 10, 2.5, 1, 0.8);
  if (mode === "battle") popNum(W.position, "+" + (g.hp - h0), "#7dff9a");
};
const healA = (s, n) => {
  n = Math.round(n * (1 + (gst().heal || 0) / 100) * (P.role === "healer" ? 1.4 : 1) * (P.cls === "verdant" ? 1.2 : 1));
  const h0 = s.hp;
  s.hp = Math.min(s.max, s.hp + n);
  if (mode === "battle") P.healed = (P.healed || 0) + (s.hp - h0);
  puff(s.m.position.clone(), "heal", 6, 2, 0.8, 0.7);
  popNum(s.m.position, "+" + n, "#7dff9a");
};
// a rune circle flares under you as you cast, in the spell's colour
function castGlyph(el) {
  const m = new T.Mesh(
    new T.PlaneGeometry(3.4, 3.4),
    new T.MeshBasicMaterial({
      map: RUNE[el] || RUNE.heal,
      transparent: true,
      opacity: 0,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(W.position.x, 0.14, W.position.z);
  tmp(m, 900, (k) => {
    m.rotation.z = k * 3;
    m.material.opacity = k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82;
    m.scale.setScalar(0.5 + k * 0.7);
  });
}
// lingering ground marks: scorch after fire, rime after ice
const DECT = {};
function decal(x, z, kind, r) {
  if (!DECT[kind]) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g2 = c.getContext("2d"),
      q = g2.createRadialGradient(64, 64, 4, 64, 64, 62);
    if (kind === "scorch") {
      q.addColorStop(0, "rgba(20,8,4,.9)");
      q.addColorStop(0.6, "rgba(40,16,8,.6)");
      q.addColorStop(1, "rgba(40,16,8,0)");
      g2.fillStyle = q;
      g2.fillRect(0, 0, 128, 128);
      g2.fillStyle = "rgba(255,120,40,.8)";
      for (let i = 0; i < 14; i++) {
        g2.beginPath();
        g2.arc(64 + (Math.random() - 0.5) * 70, 64 + (Math.random() - 0.5) * 70, 1 + Math.random() * 2.5, 0, 7);
        g2.fill();
      }
    } else {
      q.addColorStop(0, "rgba(220,245,255,.85)");
      q.addColorStop(0.7, "rgba(150,210,255,.4)");
      q.addColorStop(1, "rgba(150,210,255,0)");
      g2.fillStyle = q;
      g2.fillRect(0, 0, 128, 128);
      g2.strokeStyle = "rgba(255,255,255,.9)";
      g2.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9;
        g2.beginPath();
        g2.moveTo(64, 64);
        g2.lineTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50);
        g2.stroke();
      }
    }
    DECT[kind] = new T.CanvasTexture(c);
  }
  const m = new T.Mesh(
    new T.PlaneGeometry(r * 2, r * 2),
    new T.MeshBasicMaterial({
      map: DECT[kind],
      transparent: true,
      depthWrite: false,
      blending: kind === "scorch" ? T.NormalBlending : T.AdditiveBlending,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.random() * 6;
  m.position.set(x, 0.11 + Math.random() * 0.01, z);
  tmp(m, 3800 * SPD, (k) => {
    m.material.opacity = k < 0.05 ? k / 0.05 : 1 - Math.max(0, (k - 0.5) / 0.5);
  });
}
function ring(x, col, max, ms, z) {
  const r = new T.Mesh(
    new T.RingGeometry(0.3, 0.7, 24),
    new T.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.9,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
  r.rotation.x = -Math.PI / 2;
  r.position.set(x, 0.1, z || 0);
  FXP.add(r);
  return tw(ms, (k) => {
    r.scale.setScalar(1 + k * max);
    r.material.opacity = 0.9 * (1 - k);
  }).then(() => {
    if (r.parent) r.parent.remove(r);
    r.material.dispose();
  });
}
function banner(t, ty) {
  const b = $("castb");
  b.innerHTML = "<small>" + ({ sum: "✦ SUMMON", sup: "✚ SPELL" }[ty] || "⚔ ATTACK") + "</small>" + t;
  b.className = ty;
  void b.offsetWidth;
  b.classList.add("go");
}
function flashScr(c, a) {
  if (SFXO && SFXO.quiet) return; // watching from the street: no full-screen flashes
  a = a || 0.55;
  const f = $("fl");
  f.style.background = c;
  f.style.opacity = a;
  tw(320, (k) => {
    f.style.opacity = a * (1 - k);
  });
}
const tmp = (o, ms, f) => {
  FXP.add(o);
  return tw(ms, f).then(() => {
    if (o.parent) o.parent.remove(o);
    if (o.material) o.material.dispose();
  });
};
function slash(p) {
  const sp = new T.Sprite(AM(SP.slash));
  sp.scale.setScalar(4);
  sp.position.set(p.x - 0.2, 2, p.z + 0.5);
  return tmp(sp, 280, (k) => {
    sp.material.opacity = 1 - k;
    sp.material.rotation = -0.8 + k * 1.6;
    sp.scale.setScalar(4 + k * 1.5);
  });
}
function link(a, b) {
  const g2 = new T.Group(),
    sm = AM(SP.storm);
  for (let i = 0; i <= 7; i++) {
    const m = new T.Sprite(sm),
      k = i / 7;
    m.position.set(
      a.x + (b.x - a.x) * k,
      a.y + (b.y - a.y) * k + (i % 7 ? (Math.random() - 0.5) * 0.9 : 0),
      a.z + (b.z - a.z) * k,
    );
    m.scale.setScalar(0.9);
    g2.add(m);
  }
  return tmp(g2, 300, (k) => {
    sm.opacity = Math.random() < 0.6 ? 1 - k : 0.2;
  });
}
// (v8 spell effects, kept for reference; v9 uses the SFX kit below)
async function fxV8(el, L, fast) {
  const a = W.position,
    f = L[0];
  if (!f) return;
  const b = f.m.position,
    tp2 = new T.Vector3(b.x, 1.8, b.z),
    F = FXP;
  if (el === "nova") {
    ring(a.x, 0x9fe8ff, 13, 650, a.z);
    const sp = [];
    L.forEach((f) => {
      const q = f.m.position;
      decal(q.x, q.z, "frost", 2);
      for (let i = 0; i < 4; i++) {
        const m = new T.Mesh(Cn(0.4, 2, 5), M(0x9fe8ff, 1));
        m.material.emissive.setHex(0x2a6a9a);
        m.position.set(q.x + (Math.random() - 0.5) * 1.8, 0, q.z + (Math.random() - 0.5) * 1.8);
        m.scale.set(1, 0.01, 1);
        F.add(m);
        sp.push(m);
      }
    });
    await tw(600, (k) =>
      sp.forEach((m, i) => {
        const t = Math.max(0, Math.min(1, k * 1.6 - (i % 4) * 0.12));
        m.scale.y = Math.sin(t * 1.57) * 1.1 + 0.01;
        m.position.y = m.scale.y * 0.9;
      }),
    );
    shk = 0.55;
    flashScr("#9fe8ff");
    L.forEach((f) => puff(f.m.position.clone().setY(1.6), "ice", 14, 5, 0.8, 1.1));
    await wait(150);
    sp.forEach((m) => {
      F.remove(m);
      m.material.dispose();
    });
    return;
  }
  if (el === "lance") {
    const m = new T.Mesh(Cn(0.25, 1.8, 6), M(0xbfeeff, 1)),
      p0 = new T.Vector3(a.x + 0.8, 1.8, a.z);
    m.material.emissive.setHex(0x3a8ac8);
    m.rotation.z = -Math.PI / 2;
    await tmp(m, 320, (k) => {
      m.position.lerpVectors(p0, tp2, k);
      if (Math.random() < 0.4) puff(m.position, "ice", 1, 0.6, 0.4, 0.6);
    });
    shk = 0.4;
    puff(tp2, "ice", 22, 5, 0.8, 1.1);
    decal(b.x, b.z, "frost", 1.5);
    return;
  }
  if (el === "storm" || el === "chain") {
    shk = 0.7;
    flashScr("#fffbe0");
    const sm = AM(SP.storm),
      gr = new T.Group();
    const bolt = (bz, x0, y0, x1, y1, n, jit) => {
      let px = x0,
        py = y0;
      for (let i = 0; i <= n; i++) {
        const m = new T.Sprite(sm);
        m.position.set(px, py, bz);
        m.scale.setScalar(i % 3 ? 1.1 : 1.5);
        gr.add(m);
        px = x0 + ((x1 - x0) * (i + 1)) / n + (i < n - 1 ? (Math.random() - 0.5) * jit : 0);
        py = y0 + ((y1 - y0) * (i + 1)) / n;
      }
    };
    L.forEach((f, i) => {
      const q = f.m.position;
      bolt(q.z, q.x + (Math.random() - 0.5), 9, q.x, 1.5, 10, 1.6);
      if (el === "storm") {
        bolt(q.z, q.x - 1.5, 9, q.x - 0.3, 1.5, 9, 1.8);
        bolt(q.z, q.x + 1.8, 8.5, q.x + 0.4, 1.5, 9, 1.8);
      }
      puff(q.clone().setY(1.8), "storm", el === "chain" ? 12 : 26, 6, 0.8, 1.4);
      if (i) link(L[i - 1].m.position.clone().setY(1.8), q.clone().setY(1.8));
    });
    F.add(gr);
    FLT.position.set(b.x, 4, b.z + 2);
    await tw(450, (k) => {
      sm.opacity = Math.random() < 0.6 ? 1 : 0.2;
      FLT.intensity = 7 * (1 - k);
    });
    F.remove(gr);
    FLT.intensity = 0;
    return;
  }
  if (el === "bolt") {
    const sp = new T.Sprite(AM(SP.fire)),
      p0 = new T.Vector3(a.x + 0.8, 1.8, a.z);
    sp.scale.setScalar(1.6);
    await tmp(sp, 300, (k) => {
      sp.position.lerpVectors(p0, tp2, k);
      if (Math.random() < 0.5) puff(sp.position, "fire", 1, 0.6, 0.4, 0.7);
    });
    shk = 0.3;
    puff(tp2, "fire", 16, 4, 0.7, 1);
    decal(b.x, b.z, "scorch", 1.2);
    return;
  }
  if (el === "wave") {
    ring(a.x, 0xff8a3d, 14, 600, a.z);
    ring(a.x, 0xffe0a0, 9, 450, a.z);
    for (let i = 0; i < 8; i++)
      puff(new T.Vector3(a.x + 1 + i * 1.3, 0.6, a.z + (Math.random() - 0.5) * 3), "fire", 3, 2.5, 0.6, 1.1);
    await wait(380);
    shk = 0.6;
    flashScr("#ff8a3d");
    L.forEach((f) => {
      puff(f.m.position.clone().setY(1.4), "fire", 16, 5, 0.8, 1.3);
      decal(f.m.position.x, f.m.position.z, "scorch", 1.6);
    });
    return;
  }
  const rock = new T.Mesh(new T.IcosahedronGeometry(1.1, 0), M(0xff5a1a, 1)),
    gl = new T.Sprite(AM(SP.fire));
  rock.material.emissive.setHex(0xff3300);
  gl.scale.setScalar(5);
  rock.add(gl);
  await tmp(rock, fast ? 420 : 700, (k) => {
    rock.position.set(b.x + 6 - 6 * k, 11 - 9.2 * k, b.z);
    rock.rotation.x = k * 8;
    rock.rotation.z = k * 5;
    puff(rock.position, "fire", 1, 1.4, 0.6, 1.2);
  });
  shk = 1.1;
  flashScr("#ff8a3d");
  ring(b.x, 0xff8a3d, 6, 550, b.z);
  ring(b.x, 0xffe0a0, 3.2, 330, b.z);
  puff(tp2, "fire", 40, 7, 1, 1.8);
  decal(b.x, b.z, "scorch", 2.6);
}
// ===================== v9 spell effects =====================
// Every cast first draws motes of light into your staff's lantern (it swells and flares), and the spell leaves from the
// lantern. Fire = comets, falling stars and a miniature dawn; ice = crystal lances, spike fields, storms and a prison of ice;
// storm = real forking lightning out of gathering clouds; Lampfall drops burning lanterns from the sky.
const UPV = new T.Vector3(0, 1, 0),
  ZV = new T.Vector3(0, 0, 1),
  SEGG = new T.CylinderGeometry(1, 1, 1, 5, 1, true),
  PL1 = new T.PlaneGeometry(1, 1),
  BL = T.AdditiveBlending;
const cvT = (w, h, fn) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  fn(c.getContext("2d"), w, h);
  return new T.CanvasTexture(c);
};
const SWV = cvT(128, 128, (x) => {
  const q = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  q.addColorStop(0, "rgba(255,255,255,0)");
  q.addColorStop(0.6, "rgba(255,255,255,0)");
  q.addColorStop(0.8, "rgba(255,255,255,1)");
  q.addColorStop(0.9, "rgba(255,255,255,.45)");
  q.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = q;
  x.fillRect(0, 0, 128, 128);
});
const BEAMT = cvT(8, 128, (x) => {
  const q = x.createLinearGradient(0, 0, 0, 128);
  q.addColorStop(0, "rgba(255,255,255,0)");
  q.addColorStop(0.5, "rgba(255,255,255,.5)");
  q.addColorStop(1, "rgba(255,255,255,1)");
  x.fillStyle = q;
  x.fillRect(0, 0, 8, 128);
});
const FLK = cvT(64, 64, (x) => {
  x.translate(32, 32);
  const q = x.createRadialGradient(0, 0, 0, 0, 0, 30);
  q.addColorStop(0, "rgba(255,255,255,.9)");
  q.addColorStop(1, "rgba(200,235,255,0)");
  x.fillStyle = q;
  x.beginPath();
  x.arc(0, 0, 30, 0, 7);
  x.fill();
  x.strokeStyle = "#fff";
  x.lineWidth = 3;
  x.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    x.rotate(Math.PI / 3);
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(0, -24);
    x.moveTo(0, -13);
    x.lineTo(-6, -19);
    x.moveTo(0, -13);
    x.lineTo(6, -19);
    x.stroke();
  }
});
const RAYT = cvT(256, 256, (x) => {
  x.translate(128, 128);
  for (let i = 0; i < 16; i++) {
    x.rotate(Math.PI / 8);
    const L = i % 2 ? 90 : 124,
      q = x.createLinearGradient(0, 0, 0, -L);
    q.addColorStop(0, "rgba(255,255,255,.95)");
    q.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = q;
    x.beginPath();
    x.moveTo(-7, 0);
    x.lineTo(0, -L);
    x.lineTo(7, 0);
    x.fill();
  }
});
const EYET = cvT(128, 64, (x) => {
  const q = x.createRadialGradient(64, 32, 4, 64, 32, 62);
  q.addColorStop(0, "rgba(190,140,255,.9)");
  q.addColorStop(1, "rgba(120,60,220,0)");
  x.fillStyle = q;
  x.fillRect(0, 0, 128, 64);
  x.fillStyle = "#e8dcff";
  x.strokeStyle = "#2a0a4a";
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(8, 32);
  x.quadraticCurveTo(64, -6, 120, 32);
  x.quadraticCurveTo(64, 70, 8, 32);
  x.fill();
  x.stroke();
  x.fillStyle = "#6a2ac8";
  x.beginPath();
  x.arc(64, 32, 17, 0, 7);
  x.fill();
  x.fillStyle = "#120424";
  x.beginPath();
  x.ellipse(64, 32, 5, 15, 0, 0, 7);
  x.fill();
});
const bmat = (o) =>
  new T.MeshBasicMaterial(Object.assign({ transparent: true, depthWrite: false, blending: BL, side: T.DoubleSide }, o));
const smat = (map, col, o) =>
  new T.SpriteMaterial(
    Object.assign({ map, color: col == null ? 0xffffff : col, transparent: true, depthWrite: false, blending: BL }, o),
  );
function disp(o) {
  o.traverse((m) => {
    if (m.material) m.material.dispose();
    if (m.geometry && m.geometry !== SEGG && m.geometry !== PL1) m.geometry.dispose();
  });
}
const tmp2 = (o, ms, f) => {
  FXP.add(o);
  return tw(ms, f).then(() => {
    if (o.parent) o.parent.remove(o);
    disp(o);
  });
};
const hold = (ms) => new Promise((r) => setTimeout(r, ms)); // a short hit-stop beat before a big impact
function lanternAt() {
  if (SFXO && !SFXO.me) return SFXO.src.clone();
  const v = new T.Vector3();
  orb.getWorldPosition(v);
  return FXP === S ? v : BG.worldToLocal(v);
}
const chest = (f) => f.m.position.clone().setY(1.5 * Math.max(0.8, f.m.scale.x));
function lightAt(p, col, I, ms) {
  if (SFXO && SFXO.quiet) return Promise.resolve();
  FLT.color.setHex(col);
  FLT.position.set(p.x, p.y + 1.5, p.z);
  return tw(ms, (k) => {
    FLT.intensity = I * (1 - k) * (1 - k);
  }).then(() => {
    FLT.intensity = 0;
  });
}
function shock(p, col, r, ms, y, op) {
  const m = new T.Mesh(PL1, bmat({ map: SWV, color: col, opacity: op || 1 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(p.x, y == null ? 0.16 : y, p.z);
  return tmp2(m, ms, (k) => {
    const e = 1 - Math.pow(1 - k, 3);
    m.scale.setScalar(0.4 + r * 2 * e);
    m.material.opacity = (op || 1) * (1 - k * k);
  });
}
function vshock(p, col, r, ms) {
  const s = new T.Sprite(smat(SWV, col));
  s.position.copy(p);
  return tmp2(s, ms, (k) => {
    const e = 1 - Math.pow(1 - k, 3);
    s.scale.setScalar(0.3 + r * 2 * e);
    s.material.opacity = 1 - k;
  });
}
function pillar(p, col, r, h, ms, o) {
  o = o || {};
  const m = new T.Mesh(
    new T.CylinderGeometry(r, r * 1.2, h, 24, 1, true),
    bmat({ map: BEAMT, color: col, opacity: 0 }),
  );
  m.position.set(p.x, h / 2, p.z);
  return tmp2(m, ms, (k) => {
    m.material.opacity = (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88) * (o.op || 1);
    const w = o.shrink ? Math.max(0.05, 1 - k * 0.95) : k < 0.12 ? 0.3 + (k / 0.12) * 0.7 : 1 + (k - 0.12) * 0.25;
    m.scale.set(w, 1, w);
    m.rotation.y = k * 4;
  });
}
function glowBurst(p, col, s, ms) {
  const g2 = new T.Sprite(smat(WGT, col));
  g2.position.copy(p);
  return tmp2(g2, ms, (k) => {
    g2.scale.setScalar(s * (0.3 + Math.sqrt(k) * 0.9));
    g2.material.opacity = 1 - k;
  });
}
function burst(p, col, n, sp, o) {
  o = o || {};
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283,
      u = Math.random() * 2 - 1,
      r = Math.sqrt(1 - u * u),
      v = sp * (0.4 + Math.random() * 0.8);
    mote(p, {
      c: col,
      t: o.t,
      v: [Math.cos(a) * r * v, Math.abs(u) * v + (o.lift || 0), Math.sin(a) * r * v],
      g: o.g != null ? o.g : 6,
      dr: o.dr != null ? o.dr : 1.5,
      l: (o.l || 0.7) * (0.6 + Math.random() * 0.6),
      s: (o.s || 0.45) * (0.6 + Math.random() * 0.8),
      sp: o.t === FLK ? 4 : 0,
    });
  }
}
function embers(p, col, n, r) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283,
      d = Math.random() * (r || 1);
    mote(new T.Vector3(p.x + Math.cos(a) * d, p.y + Math.random() * 0.5, p.z + Math.sin(a) * d), {
      c: col,
      v: [(Math.random() - 0.5) * 0.8, 1.2 + Math.random() * 2.2, (Math.random() - 0.5) * 0.8],
      g: -0.6,
      l: 1 + Math.random() * 0.8,
      s: 0.16 + Math.random() * 0.2,
      gr: -0.5,
    });
  }
}
function smoke(p, col, n, sz) {
  for (let i = 0; i < n; i++)
    mote(p.clone().add(new T.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 0.6, (Math.random() - 0.5) * 1.2)), {
      t: SMT,
      c: col,
      nb: 1,
      v: [(Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 1.2],
      g: -0.3,
      dr: 1,
      l: 1.2 + Math.random() * 0.6,
      s: (sz || 1.4) * (0.7 + Math.random() * 0.6),
      gr: 1.4,
      o: 0.7,
    });
}
function rune(p, el, r, ms, col) {
  const m = new T.Mesh(PL1, bmat({ map: RUNE[el] || RUNE.heal, color: col == null ? 0xffffff : col, opacity: 0 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(p.x, 0.15, p.z);
  return tmp2(m, ms, (k) => {
    m.rotation.z = k * 4;
    m.material.opacity = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
    m.scale.setScalar(r * 2 * (0.6 + k * 0.5));
  });
}
// flung shards / rocks with gravity and a bounce off the ground
function fling(p, n, sp, o) {
  o = o || {};
  const g2 = new T.Group(),
    mt = new T.MeshToonMaterial({
      color: o.col || 0xdff8ff,
      gradientMap: GR,
      emissive: o.em == null ? 0x2a7ab8 : o.em,
      emissiveIntensity: 0.6,
    }),
    geo = o.rock ? new T.DodecahedronGeometry(o.sz || 0.22, 0) : new T.OctahedronGeometry(o.sz || 0.16, 0),
    D = [],
    st = o.rock ? 1 : 2.2,
    T0 = (o.ms || 900) / 1000;
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(geo, mt),
      a = Math.random() * 6.283,
      v = sp * (0.4 + Math.random() * 0.8);
    m.position.copy(p);
    m.userData = {
      v: new T.Vector3(Math.cos(a) * v, 1.5 + Math.random() * sp, Math.sin(a) * v),
      r: new T.Vector3(Math.random() * 12, Math.random() * 12, 0),
    };
    g2.add(m);
    D.push(m);
  }
  return tmp2(g2, o.ms || 900, (k) => {
    const t = k * T0;
    D.forEach((m) => {
      const u = m.userData;
      m.position.set(p.x + u.v.x * t, Math.max(0.08, p.y + u.v.y * t - 9 * t * t), p.z + u.v.z * t);
      m.rotation.set(u.r.x * t, u.r.y * t, 0);
      const s = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
      m.scale.set(s, st * s, s);
    });
  }).then(() => geo.dispose());
}
// ice spikes bursting out of the ground: list of [x,z,delay 0-1,scale]
function spikes(list, ms) {
  const g2 = new T.Group(),
    mt = new T.MeshToonMaterial({ color: 0xdff8ff, gradientMap: GR, emissive: 0x2a7ab8, emissiveIntensity: 0.8 }),
    geo = new T.ConeGeometry(0.35, 2, 5);
  const S2 = list.map(([x, z, d, s]) => {
    const m = new T.Mesh(geo, mt);
    m.position.set(x, 0, z);
    m.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6, (Math.random() - 0.5) * 0.5);
    m.scale.set(s, 0.01, s);
    m.userData = { d, s };
    g2.add(m);
    return m;
  });
  return tmp2(g2, ms, (k) => {
    S2.forEach((m) => {
      const u = m.userData,
        t = Math.max(0, Math.min(1, (k - u.d * 0.5) / 0.22)),
        out = k > 0.82 ? 1 - (k - 0.82) / 0.18 : 1,
        e = 1 - Math.pow(1 - t, 3);
      m.scale.set(u.s * out, u.s * e * out + 0.01, u.s * out);
      m.position.y = m.scale.y * 0.9 - 0.2;
    });
  }).then(() => geo.dispose());
}
// lightning: a jagged core and a soft coloured sheath, re-rolled every few frames, with forks
function zPts(a, b, n, jit) {
  const out = [a.clone()];
  for (let i = 1; i < n; i++) {
    const k = i / n,
      p = a.clone().lerp(b, k),
      j = jit * Math.sin(k * Math.PI);
    p.x += (Math.random() - 0.5) * j;
    p.y += (Math.random() - 0.5) * j * 0.6;
    p.z += (Math.random() - 0.5) * j;
    out.push(p);
  }
  out.push(b.clone());
  return out;
}
function zGeo(g2, pts, w, mc, mg) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i],
      b = pts[i + 1],
      L = a.distanceTo(b);
    if (L < 0.001) continue;
    const d = b.clone().sub(a).normalize();
    [
      [w, mc],
      [w * 3.4, mg],
    ].forEach(([r, mt]) => {
      const c = new T.Mesh(SEGG, mt);
      c.scale.set(r, L, r);
      c.position.copy(a).lerp(b, 0.5);
      c.quaternion.setFromUnitVectors(UPV, d);
      g2.add(c);
    });
  }
}
function zap(a, b, col, ms, o) {
  o = o || {};
  const g2 = new T.Group(),
    mc = bmat({ color: 0xffffff }),
    mg = bmat({ color: col, opacity: 0.5 }),
    D = a.distanceTo(b),
    w = o.w || 0.05,
    n = o.n || Math.max(6, Math.round(D * 1.6)),
    jit = o.jit || Math.min(2.2, D * 0.18);
  const gl = new T.Sprite(smat(WGT, col));
  gl.position.copy(b);
  gl.scale.setScalar(o.end || 3);
  g2.add(gl);
  let lastR = -1;
  const roll = () => {
    for (let i = g2.children.length - 1; i >= 0; i--) if (g2.children[i].isMesh) g2.remove(g2.children[i]);
    const P2 = zPts(a, b, n, jit);
    zGeo(g2, P2, w, mc, mg);
    for (let f = 0; f < (o.forks == null ? 2 : o.forks); f++) {
      const i = 1 + Math.floor(Math.random() * (P2.length - 2)),
        s = P2[i],
        e = s.clone().add(new T.Vector3((Math.random() - 0.5) * 3, -Math.random() * 2.2, (Math.random() - 0.5) * 3));
      zGeo(g2, zPts(s, e, 4, 0.8), w * 0.6, mc, mg);
    }
  };
  roll();
  FXP.add(g2);
  return tw(ms, (k) => {
    const r = Math.floor((k * ms) / 55);
    if (r !== lastR) {
      lastR = r;
      roll();
    }
    const fl = (Math.random() < 0.75 ? 1 : 0.35) * (1 - k * 0.7);
    mc.opacity = fl;
    mg.opacity = 0.5 * fl;
    gl.material.opacity = fl;
  }).then(() => {
    FXP.remove(g2);
    mc.dispose();
    mg.dispose();
    gl.material.dispose();
  });
}
// a dark storm cloud that gathers, churns and fades
function cloud(c, r, ms) {
  const g2 = new T.Group(),
    S2 = [];
  for (let i = 0; i < 16; i++) {
    const s = new T.Sprite(
      new T.SpriteMaterial({
        map: SMT,
        color: i % 3 ? 0x2a2440 : 0x4a4070,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    );
    const a = Math.random() * 6.283,
      d = Math.random() * r;
    s.position.set(Math.cos(a) * d, (Math.random() - 0.5) * 0.8, Math.sin(a) * d);
    s.userData = { s: 2.5 + Math.random() * 2.5, a, d };
    g2.add(s);
    S2.push(s);
  }
  g2.position.copy(c);
  return tmp2(g2, ms, (k) => {
    const f = k < 0.2 ? k / 0.2 : k > 0.8 ? (1 - k) / 0.2 : 1;
    S2.forEach((s) => {
      const u = s.userData;
      u.a += 0.012;
      s.scale.setScalar(u.s * (0.6 + 0.4 * f));
      s.material.opacity = 0.85 * f;
      s.position.x = Math.cos(u.a) * u.d;
      s.position.z = Math.sin(u.a) * u.d;
    });
  });
}
async function shoot(o, a, b, ms, arc, emit) {
  FXP.add(o);
  await tw(ms, (k) => {
    o.position.lerpVectors(a, b, k);
    o.position.y += Math.sin(k * Math.PI) * arc;
    if (emit) emit(o.position, k);
  });
  if (o.parent) o.parent.remove(o);
  disp(o);
}
// gather power into the lantern; returns where the lantern is (the spell leaves from there)
async function charge(el, ms, col) {
  ms = ms || 280;
  col = col || EHX[el] || 0xffd27a;
  const c = lanternAt(),
    L = ms / 1000 / SPD,
    other = SFXO && !SFXO.me; // someone else's lantern: gather the light, but leave your own staff alone
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * 6.283,
      r = 1.4 + Math.random() * 1.4,
      p = c.clone().add(new T.Vector3(Math.cos(a) * r, (Math.random() - 0.4) * 2, Math.sin(a) * r));
    mote(p, {
      c: col,
      v: c
        .clone()
        .sub(p)
        .divideScalar(L * 0.9),
      l: L,
      s: 0.35,
      gr: -0.7,
      fi: 0.2,
    });
  }
  if (other) {
    const gl = new T.Sprite(smat(WGT, col));
    gl.position.copy(c);
    await tmp2(gl, ms, (k) => gl.scale.setScalar(0.8 + k * k * 2.6));
    glowBurst(c, col, 4, 300);
    return c.clone();
  }
  lamp.color.setHex(col);
  await tw(ms, (k) => {
    orb.scale.setScalar(1.7 + k * k * 2.6);
    lamp.intensity = 1.3 + k * k * 5;
  });
  const c2 = lanternAt();
  glowBurst(c2, col, 4, 300);
  tw(320, (k) => {
    orb.scale.setScalar(1.7 + 2.6 * (1 - k));
    lamp.intensity = 1.3 + 5 * (1 - k);
  }).then(() => {
    orb.scale.setScalar(1.7);
    lamp.intensity = 1.3;
    tint();
  });
  return c2;
}
function hail(o) {
  const m = new T.Mesh(
    new T.OctahedronGeometry(0.3, 0),
    new T.MeshToonMaterial({ color: 0xdff8ff, gradientMap: GR, emissive: 0x2a7ab8, emissiveIntensity: 0.6 }),
  );
  m.scale.set(0.8, 2.2, 0.8);
  const a = new T.Vector3(o.x + 3, 9, o.z - 1.5);
  m.quaternion.setFromUnitVectors(UPV, a.clone().sub(o).normalize());
  shoot(m, a, o.clone().setY(0.2), 240, 0).then(() => {
    fling(o.clone().setY(0.3), 5, 3);
    shock(o, 0xbfeeff, 1.2, 300);
  });
}
const center = (L) => L.reduce((a, f) => a.add(f.m.position), new T.Vector3()).divideScalar(Math.max(1, L.length));
const SFX = {
  // Ember Bolt: a comet from the lantern, trailing flame, bursting into embers and scorch
  ember: async (f) => {
    const a = await charge("fire", 240),
      b = chest(f),
      core = new T.Group(),
      c1 = new T.Sprite(AM(SP.fire)),
      c2 = new T.Sprite(smat(WGT, 0xfff0c0));
    c1.scale.setScalar(1.5);
    c2.scale.setScalar(0.9);
    core.add(c1, c2);
    await shoot(core, a, b, 340, 1.4, (p, k) => {
      c1.material.rotation = k * 12;
      mote(p, {
        t: SP.fire,
        v: [Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5],
        g: -1.5,
        l: 0.45,
        s: 0.9,
        gr: -0.8,
      });
      if (Math.random() < 0.5)
        mote(p, {
          c: 0xffb050,
          v: [(Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2],
          g: -0.5,
          l: 0.8,
          s: 0.2,
        });
    });
    shk = 0.4;
    glowBurst(b, 0xffa040, 5, 380);
    shock(f.m.position, 0xff8a3d, 2.4, 420);
    burst(b, 0xffb050, 22, 7, { g: 4 });
    embers(b, 0xff8a3d, 10, 0.8);
    decal(b.x, b.z, "scorch", 1.4);
    lightAt(b, 0xff8a3d, 6, 450);
    await wait(120);
  },
  // Meteor: a fire rune marks the spot, the sky dims, a burning star falls trailing smoke, then rock, flame and a shockwave
  meteor: async (f, fast) => {
    if (!fast) await charge("fire", 260);
    const b = f.m.position.clone(),
      tp = chest(f);
    rune(b, "fire", 2.6, fast ? 700 : 1000, 0xff9a4a);
    flashScr("#1a0505", 0.35);
    const rock = new T.Group(),
      rm = new T.Mesh(
        new T.IcosahedronGeometry(1, 1),
        new T.MeshToonMaterial({ color: 0x5a2a14, gradientMap: GR, emissive: 0xff3300, emissiveIntensity: 0.6 }),
      ),
      g1 = new T.Sprite(AM(SP.fire)),
      g2 = new T.Sprite(smat(WGT, 0xffd080));
    g1.scale.setScalar(4.2);
    g2.scale.setScalar(3);
    rock.add(rm, g1, g2);
    const a = new T.Vector3(b.x + 9, 16, b.z - 4),
      e = new T.Vector3(b.x, 0.6, b.z);
    await shoot(rock, a, e, fast ? 420 : 640, 0, (p, k) => {
      rm.rotation.x = k * 9;
      rm.rotation.z = k * 6;
      mote(p, {
        t: SP.fire,
        v: [Math.random() - 0.5, Math.random(), Math.random() - 0.5],
        g: -1,
        l: 0.5,
        s: 2.2,
        gr: -0.6,
      });
      mote(p, {
        t: SMT,
        c: 0x3a2a2a,
        nb: 1,
        v: [Math.random() - 0.5, 0.5, Math.random() - 0.5],
        g: -0.2,
        l: 1,
        s: 1.6,
        gr: 1.5,
        o: 0.6,
      });
    });
    shk = 1.2;
    flashScr("#ffb060", 0.7);
    lightAt(tp, 0xff8a3d, 10, 700);
    await hold(70);
    shock(b, 0xff8a3d, 5.5, 600);
    shock(b, 0xffe0a0, 3, 380);
    pillar(b, 0xff9a3a, 1.2, 7, 520, { shrink: 1 });
    glowBurst(tp, 0xffc070, 9, 500);
    burst(tp, 0xffa040, 36, 10, { g: 7, s: 0.6 });
    fling(e, 9, 6, { rock: 1, col: 0x3a2014, em: 0x551800 });
    embers(b, 0xff7a2a, 18, 2);
    smoke(b, 0x2a1e1e, 6, 2);
    decal(b.x, b.z, "scorch", 3);
    await wait(220);
  },
  // Ember Wave: a rolling wall of flame sweeps across the field, scorching the ground and catching every foe it passes
  wave: async () => {
    await charge("fire", 220);
    const L = alive(),
      x0 = casterP().x + 0.8,
      x1 = Math.max(...L.map((f) => f.m.position.x)) + 2.5,
      wall = new T.Group(),
      F = [],
      hitS = new Set();
    for (let i = 0; i < 9; i++) {
      const s = new T.Sprite(AM(SP.fire));
      s.position.set(0, 1.1, -6 + i * 1.5);
      s.scale.setScalar(2.6);
      wall.add(s);
      F.push(s);
    }
    wall.position.x = x0;
    FXP.add(wall);
    await tw(760, (k) => {
      const x = x0 + (x1 - x0) * k;
      wall.position.x = x;
      F.forEach((s, i) => {
        s.scale.set(2.2 + Math.sin(k * 20 + i) * 0.4, 2.8 + Math.sin(k * 14 + i * 2) * 0.6, 1);
        s.material.rotation = Math.sin(k * 10 + i) * 0.3;
        s.material.opacity = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
      });
      if (Math.random() < 0.7)
        mote(new T.Vector3(x - 0.4, 0.3, -6 + Math.random() * 12), {
          t: SP.fire,
          v: [-1, 1.5, 0],
          g: -1,
          l: 0.6,
          s: 1.2,
        });
      if (Math.random() < 0.2) decal(x, -5 + Math.random() * 10, "scorch", 0.9);
      L.forEach((f) => {
        if (!hitS.has(f) && x >= f.m.position.x) {
          hitS.add(f);
          burst(chest(f), 0xffa040, 14, 6);
          shock(f.m.position, 0xff8a3d, 1.8, 350);
          lightAt(chest(f), 0xff8a3d, 5, 300);
        }
      });
    });
    FXP.remove(wall);
    disp(wall);
    shk = 0.6;
    flashScr("#ff8a3d", 0.4);
  },
  // Inferno: the ground under every foe glows with a fire rune, then erupts in columns of flame
  inferno: async () => {
    await charge("fire", 320);
    const L = alive();
    flashScr("#2a0800", 0.4);
    L.forEach((f) => rune(f.m.position, "fire", 2.2, 1300, 0xff7a2a));
    await wait(300);
    shk = 0.9;
    L.forEach((f) => {
      const p = f.m.position;
      pillar(p, 0xff7a2a, 1.1, 9, 900);
      pillar(p, 0xffe0a0, 0.5, 9, 700);
      shock(p, 0xff8a3d, 3, 600);
      decal(p.x, p.z, "scorch", 2.2);
    });
    lightAt(center(L), 0xff6a20, 9, 900);
    await tw(800, (k) => {
      L.forEach((f) => {
        const p = f.m.position;
        for (let j = 0; j < 2; j++)
          mote(new T.Vector3(p.x + (Math.random() - 0.5) * 1.6, 0.2, p.z + (Math.random() - 0.5) * 1.6), {
            t: SP.fire,
            v: [(Math.random() - 0.5) * 1.5, 7 + Math.random() * 5, (Math.random() - 0.5) * 1.5],
            g: 2,
            l: 0.7,
            s: 1.6,
            gr: -0.5,
          });
      });
    });
    flashScr("#ff8a3d", 0.5);
    L.forEach((f) => {
      burst(chest(f), 0xffa040, 18, 8);
      embers(f.m.position, 0xff7a2a, 10, 1.2);
    });
    await wait(150);
  },
  // Sunbrand: a small sun is born above the foe, drinking in light, then falls as a lance of dawn
  sunbrand: async (f) => {
    await charge("fire", 360, 0xffe090);
    const b = f.m.position.clone(),
      hi = new T.Vector3(b.x, 7.2, b.z),
      sun = new T.Group(),
      core = new T.Mesh(new T.SphereGeometry(1, 20, 14), new T.MeshBasicMaterial({ color: 0xfff4c0 })),
      cor = new T.Sprite(smat(WGT, 0xffd070)),
      ray = new T.Sprite(smat(RAYT, 0xffe090));
    sun.add(core, cor, ray);
    sun.position.copy(hi);
    sun.scale.setScalar(0.01);
    FXP.add(sun);
    flashScr("#fff0b0", 0.25);
    lightAt(hi, 0xffe0a0, 8, 1500);
    await tw(900, (k) => {
      sun.scale.setScalar(0.2 + k * 1.1);
      cor.scale.setScalar(5);
      ray.scale.setScalar(9);
      ray.material.rotation = k * 2;
      cor.material.opacity = 0.8 + 0.2 * Math.sin(k * 30);
      if (Math.random() < 0.8) {
        const a = Math.random() * 6.283,
          r = 5 + Math.random() * 3,
          p = hi.clone().add(new T.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 4, Math.sin(a) * r));
        mote(p, { c: 0xffd27a, v: hi.clone().sub(p).multiplyScalar(2.2), l: 0.45, s: 0.4, gr: -0.6 });
      }
    });
    await tw(220, (k) => {
      sun.position.y = 7.2 - 5.8 * k * k;
      sun.scale.setScalar(1.3 - k * 0.6);
    });
    FXP.remove(sun);
    disp(sun);
    shk = 1.4;
    flashScr("#ffffff", 0.95);
    await hold(90);
    pillar(b, 0xfff0b0, 2.2, 30, 900);
    pillar(b, 0xffffff, 0.9, 30, 700);
    shock(b, 0xffe0a0, 7, 800);
    shock(b, 0xffffff, 4, 500);
    vshock(chest(f), 0xffe0a0, 5, 500);
    burst(chest(f), 0xffe090, 46, 12, { g: 3, s: 0.55, l: 1 });
    embers(b, 0xffd27a, 24, 3);
    decal(b.x, b.z, "scorch", 3.4);
    lightAt(b, 0xfff0c0, 12, 900);
    await wait(350);
  },
  // Frost Shard / Ice Lance: a spinning crystal spear trailing snowflakes and mist, shattering on impact
  lance: async (f, big) => {
    const a = await charge("ice", 220),
      b = chest(f),
      sc = big ? 1 : 0.7,
      o = new T.Group(),
      m = new T.Mesh(
        new T.OctahedronGeometry(0.35, 0),
        new T.MeshToonMaterial({ color: 0xdff8ff, gradientMap: GR, emissive: 0x3a9ad8, emissiveIntensity: 0.7 }),
      ),
      gl = new T.Sprite(smat(WGT, 0x9fe8ff));
    m.scale.set(sc, sc, 4 * sc);
    gl.scale.setScalar(2.2 * sc);
    o.add(m, gl);
    o.quaternion.setFromUnitVectors(ZV, b.clone().sub(a).normalize());
    await shoot(o, a, b, big ? 260 : 220, 0.3, (p, k) => {
      m.rotation.z = k * 10;
      mote(p, {
        t: FLK,
        c: 0xeafcff,
        v: [(Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.8],
        g: 1,
        l: 0.6,
        s: 0.35,
        sp: 3,
      });
      if (Math.random() < 0.4) mote(p, { t: SMT, c: 0xcfeeff, v: [0, 0.3, 0], l: 0.6, s: 0.8, gr: 1, o: 0.5 });
    });
    shk = big ? 0.55 : 0.35;
    glowBurst(b, 0xbfeeff, big ? 5 : 3.5, 350);
    fling(b, big ? 14 : 9, big ? 6 : 4.5);
    shock(f.m.position, 0x9fe8ff, big ? 2.6 : 1.8, 400);
    burst(b, 0xeafcff, big ? 18 : 10, 6, { t: FLK, g: 3, s: 0.4 });
    smoke(f.m.position.clone().setY(0.4), 0xd8f0ff, 4, 1.4);
    decal(b.x, b.z, "frost", big ? 1.8 : 1.3);
    lightAt(b, 0x9fe8ff, 6, 400);
    await wait(100);
  },
  // Frost Nova: a ring of frost rolls out from you and a trail of ice spikes races to every foe, then shatters
  nova: async () => {
    await charge("ice", 240);
    const L = alive(),
      w = casterP().clone();
    shock(w, 0xbfeeff, 10, 700);
    shock(w, 0xffffff, 6, 450);
    flashScr("#bfeeff", 0.3);
    const list = [];
    L.forEach((f) => {
      const q = f.m.position,
        dx = q.x - w.x,
        dz = q.z - w.z,
        d = Math.hypot(dx, dz),
        n = Math.max(3, Math.round(d / 1.1));
      for (let i = 2; i <= n; i++) {
        const k = i / n;
        list.push([
          w.x + dx * k + (Math.random() - 0.5) * 0.6,
          w.z + dz * k + (Math.random() - 0.5) * 0.6,
          k * 0.8,
          0.45 + k * 0.4,
        ]);
      }
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * 6.283;
        list.push([q.x + Math.cos(a) * 1.1, q.z + Math.sin(a) * 1.1, 0.85, 1.1 + Math.random() * 0.4]);
      }
    });
    spikes(list, 1100);
    await tw(700, (k) => {
      if (Math.random() < 0.6)
        mote(new T.Vector3(w.x + Math.random() * 14, 0.3, w.z + (Math.random() - 0.5) * 10), {
          t: FLK,
          c: 0xffffff,
          v: [0, 0.8 + Math.random(), 0],
          g: -0.2,
          l: 1,
          s: 0.35,
          sp: 2,
        });
    });
    shk = 0.6;
    L.forEach((f) => {
      const b = chest(f);
      burst(b, 0xeafcff, 14, 6, { t: FLK, g: 3, s: 0.4 });
      fling(b, 8, 4);
      decal(f.m.position.x, f.m.position.z, "frost", 2);
    });
    lightAt(w, 0x9fe8ff, 6, 600);
    await wait(250);
  },
  // Blizzard: a whirling snowstorm settles over the foes, hail spears down, frost fog rolls through
  blizzard: async () => {
    await charge("ice", 300);
    const L = alive(),
      c = center(L);
    flashScr("#cfe8ff", 0.35);
    const vg = new T.Group(),
      fl = [];
    for (let i = 0; i < 70; i++) {
      const s = new T.Sprite(smat(i % 3 ? FLK : WGT, i % 3 ? 0xffffff : 0xbfe0ff, { opacity: 0 }));
      s.userData = {
        a: Math.random() * 6.283,
        r: 1 + Math.random() * 6,
        y: Math.random() * 6,
        v: 1.5 + Math.random() * 2.5,
        s: 0.25 + Math.random() * 0.5,
      };
      vg.add(s);
      fl.push(s);
    }
    vg.position.set(c.x, 0, c.z);
    FXP.add(vg);
    const fog = new T.Sprite(
      new T.SpriteMaterial({ map: SMT, color: 0xdff0ff, transparent: true, depthWrite: false, opacity: 0 }),
    );
    fog.scale.set(16, 7, 1);
    fog.position.set(c.x, 2.5, c.z);
    FXP.add(fog);
    let nh = 0;
    await tw(1300, (k) => {
      const fd = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1;
      fl.forEach((s) => {
        const u = s.userData;
        u.a += 0.06 * u.v;
        u.y -= 0.03 * u.v;
        if (u.y < 0) u.y += 6;
        s.position.set(Math.cos(u.a) * u.r, u.y, Math.sin(u.a) * u.r);
        s.scale.setScalar(u.s);
        s.material.opacity = fd;
        s.material.rotation += 0.1;
      });
      fog.material.opacity = 0.45 * fd;
      if (k * 10 > nh && nh < 9) {
        nh++;
        const q = L[nh % L.length].m.position;
        hail(new T.Vector3(q.x + (Math.random() - 0.5) * 2, 0, q.z + (Math.random() - 0.5) * 2));
      }
    });
    FXP.remove(vg);
    disp(vg);
    FXP.remove(fog);
    disp(fog);
    shk = 0.6;
    L.forEach((f) => {
      burst(chest(f), 0xeafcff, 12, 5, { t: FLK, g: 2, s: 0.4 });
      decal(f.m.position.x, f.m.position.z, "frost", 2.4);
      smoke(f.m.position.clone().setY(0.3), 0xe0f4ff, 3, 1.6);
    });
  },
  // Absolute Zero: frost creeps in, a crystal prison grows around the foe, holds... and bursts into a hundred shards
  zero: async (f) => {
    await charge("ice", 320);
    const b = f.m.position.clone(),
      s = f.m.scale.x,
      h = (f.kind === "gloom" ? 3.4 : 2.6) * s + 0.6;
    flashScr("#bfeeff", 0.3);
    rune(b, "ice", 2.4, 1600, 0xbfeeff);
    await tw(350, (k) => {
      for (let j = 0; j < 3; j++) {
        const a = Math.random() * 6.283,
          r = 3.2 * (1 - k) + 0.5;
        mote(new T.Vector3(b.x + Math.cos(a) * r, 0.2 + Math.random() * h, b.z + Math.sin(a) * r), {
          t: FLK,
          c: 0xffffff,
          v: [-Math.cos(a) * 3, 0, -Math.sin(a) * 3],
          l: 0.4,
          s: 0.35,
        });
      }
    });
    const cg = new T.Group(),
      cm = bmat({ color: 0xbfeeff, opacity: 0.35, side: T.FrontSide }),
      ce = new T.MeshToonMaterial({
        color: 0xeafcff,
        gradientMap: GR,
        emissive: 0x4ab0ff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.6,
      }),
      bg = new T.Mesh(new T.OctahedronGeometry(1, 0), cm);
    bg.scale.set(1.4 * s + 0.5, h * 0.6, 1.4 * s + 0.5);
    bg.position.y = h * 0.5;
    cg.add(bg);
    for (let i = 0; i < 7; i++) {
      const m = new T.Mesh(new T.ConeGeometry(0.35, 1.8, 5), ce),
        a = (i / 7) * 6.283;
      m.position.set(Math.cos(a) * (1.1 * s + 0.3), 0.6, Math.sin(a) * (1.1 * s + 0.3));
      m.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      cg.add(m);
    }
    cg.position.set(b.x, 0, b.z);
    cg.scale.setScalar(0.01);
    FXP.add(cg);
    await tw(380, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      cg.scale.set(e, e, e);
    });
    shk = 0.5;
    flashScr("#eafcff", 0.6);
    lightAt(b.clone().setY(2), 0x9fe8ff, 7, 700);
    await wait(380);
    FXP.remove(cg);
    disp(cg);
    shk = 1.1;
    flashScr("#ffffff", 0.8);
    await hold(60);
    const mid = b.clone().setY(h * 0.5);
    fling(mid, 22, 7);
    shock(b, 0xbfeeff, 4.5, 600);
    shock(b, 0xffffff, 2.6, 400);
    vshock(mid, 0xdff8ff, 3.5, 450);
    burst(mid, 0xeafcff, 30, 9, { t: FLK, g: 3, s: 0.5 });
    smoke(b.clone().setY(0.4), 0xe0f4ff, 6, 2);
    decal(b.x, b.z, "frost", 3);
    await wait(200);
  },
  // Spark: a crackling arc straight from the lantern
  spark: async (f) => {
    const a = await charge("storm", 200),
      b = chest(f);
    flashScr("#fffbe0", 0.25);
    zap(a, b, 0xffe066, 260, { w: 0.045, forks: 1, end: 2.5 });
    await wait(60);
    shk = 0.35;
    burst(b, 0xfff3a0, 18, 8, { g: 9, s: 0.3, l: 0.4 });
    shock(f.m.position, 0xffe066, 1.6, 300);
    lightAt(b, 0xfff0a0, 6, 300);
    await wait(200);
  },
  // Thunderclap: a cloud boils up over the foe and drops a forked bolt, with a thunderclap ring
  thunder: async (f) => {
    await charge("storm", 220);
    const b = chest(f),
      top = new T.Vector3(f.m.position.x, 6.8, f.m.position.z);
    cloud(top, 2.2, 1200);
    await wait(320);
    flashScr("#ffffff", 0.6);
    shk = 0.8;
    zap(top, f.m.position.clone().setY(0.2), 0xffe066, 320, { w: 0.08, forks: 3, end: 4 });
    await wait(50);
    shock(f.m.position, 0xfff0a0, 3.4, 500);
    shock(f.m.position, 0xffffff, 1.8, 300);
    burst(b, 0xfff3a0, 26, 9, { g: 9, s: 0.35, l: 0.5 });
    smoke(f.m.position.clone().setY(0.3), 0x5a5070, 4, 1.4);
    lightAt(b, 0xfff0a0, 10, 450);
    await wait(140);
    zap(top.clone().add(new T.Vector3(1, 0, 0)), b, 0xffe066, 200, { w: 0.05, forks: 1 });
    await wait(220);
  },
  // Chain Lightning: one bolt that leaps from foe to foe (a Storm Roc throws it from itself)
  chain: async (L, from) => {
    let a = from || (await charge("storm", 220));
    flashScr("#fffbe0", 0.3);
    for (const f of L) {
      const b = chest(f);
      zap(a, b, 0xffe066, 330, { w: 0.05, forks: 1, end: 2.6 });
      burst(b, 0xfff3a0, 12, 7, { g: 9, s: 0.3, l: 0.4 });
      shock(f.m.position, 0xffe066, 1.4, 300);
      lightAt(b, 0xfff0a0, 6, 250);
      shk = 0.35;
      await wait(110);
      a = b;
    }
    await wait(220);
  },
  // Tempest: the sky darkens, wind howls across the field, bolts rake the foes, then strike them all at once
  tempest: async () => {
    await charge("storm", 300);
    const L = alive(),
      c = center(L),
      top = c.clone().setY(7.4);
    flashScr("#1a1630", 0.4);
    cloud(top, 5, 2000);
    const wind = setInterval(() => {
      for (let i = 0; i < 3; i++)
        mote(new T.Vector3(c.x - 8, 0.5 + Math.random() * 4, c.z + (Math.random() - 0.5) * 10), {
          c: 0xdde4ff,
          v: [14, Math.random() - 0.5, 0],
          l: 0.5,
          s: 0.25,
          gr: 0,
        });
    }, 40);
    try {
      await wait(350);
      for (let i = 0; i < 7; i++) {
        const q = L[Math.floor(Math.random() * L.length)].m.position,
          o = new T.Vector3(q.x + (Math.random() - 0.5) * 3, 0, q.z + (Math.random() - 0.5) * 3);
        zap(top.clone().add(new T.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 4)), o, 0xffe066, 200, {
          w: 0.06,
          forks: 2,
          end: 3,
        });
        shock(o, 0xfff0a0, 1.6, 300);
        shk = 0.5;
        flashScr("#fffbe0", 0.25);
        await wait(90);
      }
    } finally {
      clearInterval(wind);
    }
    flashScr("#ffffff", 0.7);
    shk = 1;
    L.forEach((f) => {
      zap(
        top.clone().add(new T.Vector3((Math.random() - 0.5) * 3, 0, 0)),
        f.m.position.clone().setY(0.2),
        0xffe066,
        360,
        { w: 0.09, forks: 3, end: 4 },
      );
      burst(chest(f), 0xfff3a0, 18, 9, { g: 9, s: 0.35, l: 0.5 });
      shock(f.m.position, 0xffffff, 2.6, 450);
    });
    lightAt(c.clone().setY(2), 0xfff0a0, 12, 500);
    await wait(380);
  },
  // Skyfall: the sky goes black, power gathers, then a pillar of storm light and a great bolt come down together
  skyfall: async (f) => {
    await charge("storm", 340);
    const b = f.m.position.clone(),
      top = b.clone().setY(14);
    flashScr("#0a0818", 0.55);
    cloud(top.clone().setY(8), 4, 1700);
    rune(b, "storm", 3, 1500, 0xfff3a0);
    await tw(600, (k) => {
      for (let j = 0; j < 2; j++) {
        const a = Math.random() * 6.283,
          p = new T.Vector3(b.x + Math.cos(a) * 6, 1 + Math.random() * 6, b.z + Math.sin(a) * 6);
        mote(p, { c: 0xfff3a0, v: b.clone().setY(2).sub(p).multiplyScalar(2.4), l: 0.4, s: 0.3 });
      }
    });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * 6.283;
      zap(new T.Vector3(b.x + Math.cos(a) * 6, 9, b.z + Math.sin(a) * 6), b.clone().setY(1.5), 0xffe066, 300, {
        w: 0.05,
        forks: 1,
      });
    }
    await wait(140);
    shk = 1.5;
    flashScr("#ffffff", 1);
    await hold(90);
    pillar(b, 0xfff6c0, 2.4, 30, 900);
    pillar(b, 0xffffff, 1, 30, 650);
    zap(top, b.clone().setY(0.1), 0xffffff, 400, { w: 0.16, forks: 4, end: 6 });
    shock(b, 0xfff0a0, 7.5, 800);
    shock(b, 0xffffff, 4, 500);
    vshock(chest(f), 0xfff3a0, 5, 500);
    burst(chest(f), 0xfff3a0, 40, 12, { g: 9, s: 0.45, l: 0.6 });
    smoke(b.clone().setY(0.3), 0x5a5070, 6, 2);
    decal(b.x, b.z, "scorch", 3);
    lightAt(b.clone().setY(2), 0xffffff, 14, 700);
    await wait(380);
  },
  // Lampfall: burning lanterns fall out of the dark onto every foe and burst into lamplight
  lampfall: async () => {
    await charge("storm", 320, 0xffd27a);
    const L = alive();
    flashScr("#1a1208", 0.4);
    await Promise.all(L.map((f, i) => wait(i * 140).then(() => SFX.lantern(f))));
    flashScr("#ffd27a", 0.6);
    shk = 1;
    await wait(150);
  },
  lantern: async (f) => {
    const b = f.m.position.clone(),
      o = new T.Group(),
      fm = new T.MeshToonMaterial({ color: 0x2a2018, gradientMap: GR }),
      gm2 = new T.MeshBasicMaterial({ color: 0xffe9a0 }),
      bx = (w, h, d, y, m) => {
        const q = new T.Mesh(new T.BoxGeometry(w, h, d), m || fm);
        q.position.y = y;
        o.add(q);
        return q;
      };
    bx(0.9, 0.12, 0.9, 0);
    bx(0.7, 1, 0.7, -0.6, gm2);
    bx(0.9, 0.12, 0.9, -1.15);
    const cap = new T.Mesh(new T.ConeGeometry(0.6, 0.5, 4), fm);
    cap.position.y = 0.32;
    cap.rotation.y = Math.PI / 4;
    o.add(cap);
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([a, c]) => {
      const p = new T.Mesh(new T.BoxGeometry(0.08, 1.1, 0.08), fm);
      p.position.set(a * 0.38, -0.6, c * 0.38);
      o.add(p);
    });
    const gl = new T.Sprite(smat(WGT, 0xffd27a));
    gl.scale.setScalar(4);
    gl.position.y = -0.6;
    o.add(gl);
    o.scale.setScalar(1.3);
    rune(b, "storm", 1.8, 900, 0xffd27a);
    const a = new T.Vector3(b.x + (Math.random() - 0.5) * 2, 15, b.z + (Math.random() - 0.5) * 2),
      e = new T.Vector3(b.x, 1.6, b.z);
    await shoot(o, a, e, 560, 0, (p, k) => {
      o.rotation.z = Math.sin(k * 14) * 0.25;
      o.rotation.y = k * 3;
      mote(p.clone().setY(p.y - 0.8), {
        c: 0xffd27a,
        v: [Math.random() - 0.5, 1.5, Math.random() - 0.5],
        g: -0.5,
        l: 0.6,
        s: 0.35,
      });
    });
    glowBurst(e, 0xffe9a0, 8, 500);
    shock(b, 0xffd27a, 4, 550);
    pillar(b, 0xffe9a0, 1, 10, 600, { shrink: 1 });
    burst(e, 0xffd27a, 30, 9, { g: 4, s: 0.45, l: 0.8 });
    embers(b, 0xffd27a, 14, 1.5);
    fling(e, 10, 5, { col: 0xffe9a0, em: 0xaa7a22 });
    lightAt(e, 0xffd27a, 9, 500);
    shk = 0.7;
  },
  // Mending Light: a soft pillar of green-gold light and motes spiralling up around you and your allies
  mend: async () => {
    await charge("heal", 220);
    const w = W.position.clone();
    pillar(w, 0x9affc0, 1.3, 8, 900);
    rune(w, "heal", 2.2, 1000, 0xbfffd0);
    shock(w, 0x7dff9a, 3, 500);
    healP(28);
    g.allies.forEach((s) => {
      healA(s, 12);
      pillar(s.m.position, 0x9affc0, 0.8, 6, 700);
    });
    await tw(800, (k) => {
      [w, ...g.allies.map((s) => s.m.position)].forEach((p) => {
        if (Math.random() < 0.6) {
          const a = Math.random() * 6.283;
          mote(new T.Vector3(p.x + Math.cos(a) * 0.9, 0.2, p.z + Math.sin(a) * 0.9), {
            c: Math.random() < 0.5 ? 0x9affc0 : 0xffe9a0,
            v: [-Math.sin(a) * 1.2, 2 + Math.random() * 1.5, Math.cos(a) * 1.2],
            g: -0.3,
            l: 1,
            s: 0.3,
            gr: -0.3,
          });
        }
      });
    });
  },
  // Dusk Hex: a violet eye opens over the foe and shadow drains into it
  hex: async (f) => {
    await charge("ice", 200, 0xb89aff);
    const b = f.m.position.clone(),
      eye = new T.Sprite(new T.SpriteMaterial({ map: EYET, transparent: true, depthWrite: false, opacity: 0 }));
    f.hex = 1;
    rune(b, "storm", 2.3, 1100, 0xb07aff);
    eye.position.copy(b).setY((f.th || 3) + 0.6);
    FXP.add(eye);
    await tw(800, (k) => {
      const o = k < 0.2 ? k / 0.2 : 1;
      eye.scale.set(2.4 * o, 1.3 * o * (k > 0.55 && k < 0.62 ? 0.1 : 1), 1);
      eye.material.opacity = k > 0.8 ? (1 - k) / 0.2 : 1;
      for (let j = 0; j < 2; j++) {
        const a = Math.random() * 6.283,
          p = new T.Vector3(b.x + Math.cos(a) * 2.6, 0.3 + Math.random() * 2.5, b.z + Math.sin(a) * 2.6);
        mote(p, { c: 0x6a3ac8, v: [-Math.cos(a) * 3.5, 0, -Math.sin(a) * 3.5], l: 0.6, s: 0.5, gr: -0.6 });
      }
    });
    FXP.remove(eye);
    eye.material.dispose();
    flashScr("#3a1a6a", 0.4);
    burst(b.clone().setY(1.5), 0xb07aff, 16, 4, { g: 1, s: 0.45 });
    shock(b, 0x8a5aff, 2.2, 400);
  },
};
// card effects: f = the selected target (the visuals run first, then the damage lands)
const CFX = {
  spark: async (f) => {
    await SFX.spark(f);
    dmg(f, 12, "storm");
  },
  nova: async () => {
    const a = alive();
    await SFX.nova();
    a.forEach((f) => {
      dmg(f, 14, "ice");
      f.st.chill = 2;
    });
  },
  lance: async (f) => {
    await SFX.lance(f, 1);
    dmg(f, 32, "ice");
    f.st.chill = Math.max(f.st.chill, 1);
  },
  meteor: async (f) => {
    await SFX.meteor(f);
    dmg(f, 70 + 15 * (P.tome || 0), "fire");
    f.st.burn = 3;
  },
  wave: async () => {
    const a = alive();
    await SFX.wave();
    a.forEach((f) => {
      dmg(f, 12, "fire");
      f.st.burn = Math.max(f.st.burn, 2);
    });
  },
  chain: async () => {
    const a = alive();
    await SFX.chain(a);
    a.forEach((f) => dmg(f, 20, "storm"));
  },
  lampfall: async () => {
    const a = alive();
    await SFX.lampfall();
    a.forEach((f) => dmg(f, 55, "storm"));
  },
  mend: async () => {
    await SFX.mend();
  },
  hex: async (f) => {
    await SFX.hex(f);
  },
  // class spells bought from Wren
  ember: async (f) => {
    await SFX.ember(f);
    dmg(f, 10, "fire");
    f.st.burn = Math.max(f.st.burn, 1);
  },
  inferno: async () => {
    const a = alive();
    await SFX.inferno();
    a.forEach((f) => {
      dmg(f, 40, "fire");
      f.st.burn = Math.max(f.st.burn, 3);
    });
  },
  sunbrand: async (f) => {
    await SFX.sunbrand(f);
    dmg(f, 150, "fire");
    f.st.burn = Math.max(f.st.burn, 4);
  },
  shard: async (f) => {
    await SFX.lance(f, 0);
    dmg(f, 18, "ice");
    f.st.chill = Math.max(f.st.chill, 1);
  },
  blizzard: async () => {
    const a = alive();
    await SFX.blizzard();
    a.forEach((f) => {
      dmg(f, 34, "ice");
      f.st.chill = 2;
    });
  },
  zero: async (f) => {
    await SFX.zero(f);
    dmg(f, 120, "ice");
    if (f.hp > 0) {
      f.stun = true;
      $("log").textContent = "The " + f.label + " is frozen solid!";
    }
  },
  thunder: async (f) => {
    await SFX.thunder(f);
    dmg(f, 26, "storm");
    if (f.hp > 0 && Math.random() < 0.35) {
      f.stun = true;
      $("log").textContent = "The " + f.label + " is stunned!";
    }
  },
  tempest: async () => {
    const a = alive();
    await SFX.tempest();
    a.forEach((f) => dmg(f, 42, "storm"));
  },
  skyfall: async (f) => {
    await SFX.skyfall(f);
    dmg(f, 130, "storm");
    if (f.hp > 0) f.stun = true;
  },
};
