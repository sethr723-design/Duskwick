// DUSKWICK - 24-foemoves.js (v24): every foe kind has its own moveset. Each move has an element, power (x the foe's
// base hit), a target pattern, a weight and a cooldown, its own wind-up/strike pose (procedural, on top of the idle
// animation, using the parts mkFoe builds) and its own effect. The chosen move shows on the foe's plate (a "NEXT" badge
// and the short intent text) before it lands, so players can react.
// Hooks (no rewrites): `intent`, `animGloom`, `animBeast`, `tagUpd`, `undeco` are wrapped here; foeAct (10) calls
// fmRun(f, d) right after burn/stun/chill/hex and stops if it handled the turn. Kinds without a kit fall back to the old
// intent/foeAct code. Host decides; guests and street spectators replay pose + effect from 'fmv' messages.
// Only top-level names: FMV, fmRun.
//
// Fields: n name, ic icon, el element (visual + log), tg one|all|debuff|self|pack|heal|summon, p power, w weight,
// cd cooldown (turns it rests after use), an pose, fx effect, rng ranged (no lunge), c(f) condition,
// on-hit (local player only): bn burn turns, ch frostbite chance (-1 pip), pp dread chance (-1 pip), ppn its name;
// lf lifesteal fraction; self: gd guard (half damage), hl heal fraction, bf next-hit multiplier; pack: bf, who;
// heal: hl, who ("boss" = the boss first); summon: sp (foe spec).
const FMV = {
  M: {},
  K: {
    g1: ["sclaw", "gbolt", "dread", "sip"],
    g2: ["rake", "dbolt", "gust", "sdrain"],
    g3: ["slam", "hide", "spore", "boulder"],
    g4: ["sear", "fball", "fwave", "kindle"],
    g5: ["scourge", "dnova", "crown"],
    wolf: ["bite", "howl", "fbreath", "hams"],
    hound: ["pounce", "hbreath", "ignite"],
    b_warden: ["scourge", "dnova", "crown", "callknight", "eclipse"],
    b_fiend: ["sear", "fball", "fwave", "meteor", "callember"],
    b_tyrant: ["slam", "boulder", "spore", "quake", "regrow"],
    b_matri: ["bite", "fbreath", "howl", "bliz", "callcub"],
    b_kiln: ["pounce", "hbreath", "ignite", "magma", "callimp"],
    m_knight: ["bash", "ward", "shwall"],
    m_ember: ["spit", "flare", "stoke"],
    m_mite: ["nibble", "puffm", "mend"],
    m_cub: ["nip", "yip", "pant"],
  },
  // signature moves for tinted (hc), elite and alpha (big) street foes
  SIG: {
    g1: ["npounce"],
    g2: ["edive"],
    g3: ["bramble"],
    g4: ["cburst"],
    wolf: ["apounce"],
    hound: ["icharge"],
  },
};
(() => {
  const hurtc = (f) => f.hp < f.max * 0.85,
    half = (f) => f.hp < f.max * 0.5,
    room = (f) => (f.nsum || 0) < 2 && g.foes.filter((q) => q.hp > 0).length < 4,
    mate = (who) => (f) => g.foes.some((q) => q !== f && q.hp > 0 && (who !== "wolf" || q.kind === "wolf")),
    bossHurt = () => g.foes.some((q) => q.boss && q.hp > 0 && q.hp < q.max * 0.9),
    anyHurt = () => g.foes.some((q) => q.hp > 0 && q.hp < q.max * 0.8);
  const L = {
    // ---- Gloomling (t1) ----
    sclaw: { n: "Shadow Claw", ic: "🐾", el: "spirit", tg: "one", p: 1.1, w: 3, an: "claw", fx: "rake" },
    gbolt: { n: "Gloom Bolt", ic: "☄", el: "spirit", tg: "one", p: 1.4, w: 2, cd: 2, an: "cast", fx: "bolt", rng: 1 },
    dread: {
      n: "Dread Gaze",
      ic: "💀",
      el: "spirit",
      tg: "debuff",
      p: 0.4,
      w: 1.5,
      cd: 3,
      an: "glare",
      fx: "fear",
      pp: 1,
      ppn: "Dread",
    },
    sip: {
      n: "Soul Sip",
      ic: "🩸",
      el: "spirit",
      tg: "one",
      p: 0.9,
      w: 2,
      cd: 3,
      an: "drain",
      fx: "drain",
      rng: 1,
      lf: 0.6,
      c: hurtc,
    },
    npounce: {
      n: "Night Pounce",
      ic: "💥",
      el: "spirit",
      tg: "one",
      p: 1.8,
      w: 2,
      cd: 4,
      an: "pounce",
      fx: "shadowcrash",
    },
    // ---- Dusk Imp (t2) ----
    rake: { n: "Raking Talons", ic: "🐾", el: "spirit", tg: "one", p: 1.1, w: 3, an: "claw", fx: "rake" },
    dbolt: { n: "Dusk Bolt", ic: "☄", el: "spirit", tg: "one", p: 1.4, w: 2, cd: 2, an: "cast", fx: "bolt", rng: 1 },
    gust: { n: "Wing Gust", ic: "🌀", el: "storm", tg: "all", p: 0.6, w: 1.5, cd: 3, an: "flap", fx: "gust" },
    sdrain: {
      n: "Soul Drain",
      ic: "🩸",
      el: "spirit",
      tg: "one",
      p: 0.85,
      w: 2,
      cd: 3,
      an: "drain",
      fx: "drain",
      rng: 1,
      lf: 0.5,
      pp: 1,
      ppn: "Drained",
    },
    edive: {
      n: "Eclipse Dive",
      ic: "💥",
      el: "spirit",
      tg: "one",
      p: 1.8,
      w: 2,
      cd: 4,
      an: "pounce",
      fx: "shadowcrash",
    },
    // ---- Moss Brute (t3) ----
    slam: { n: "Club Slam", ic: "🔨", el: "heal", tg: "one", p: 1.15, w: 3, an: "slam", fx: "bash" },
    hide: { n: "Mossy Hide", ic: "🛡", el: "heal", tg: "self", w: 1.5, cd: 3, an: "guard", fx: "guard", gd: 1 },
    spore: {
      n: "Spore Cloud",
      ic: "🍄",
      el: "heal",
      tg: "debuff",
      p: 0.45,
      w: 1.5,
      cd: 3,
      an: "shake",
      fx: "spores",
      pp: 1,
      ppn: "Spores",
    },
    boulder: {
      n: "Boulder Toss",
      ic: "🪨",
      el: "heal",
      tg: "one",
      p: 1.6,
      w: 1.5,
      cd: 3,
      an: "slam",
      fx: "boulder",
      rng: 1,
    },
    bramble: { n: "Bramble Burst", ic: "🌿", el: "heal", tg: "all", p: 0.75, w: 2, cd: 4, an: "roar", fx: "thorns" },
    // ---- Cinder Fiend (t4) ----
    sear: { n: "Searing Claw", ic: "🔥", el: "fire", tg: "one", p: 1.0, w: 3, an: "claw", fx: "rake", bn: 2 },
    fball: { n: "Fireball", ic: "☄", el: "fire", tg: "one", p: 1.4, w: 2, cd: 2, an: "cast", fx: "fireball", rng: 1 },
    fwave: {
      n: "Flame Wave",
      ic: "🔥",
      el: "fire",
      tg: "all",
      p: 0.6,
      w: 1.5,
      cd: 3,
      an: "slam",
      fx: "flamewave",
      bn: 1,
    },
    kindle: { n: "Kindle", ic: "▲", el: "fire", tg: "self", w: 1, cd: 4, an: "roar", fx: "kindle", bf: 1.5, hl: 0.06 },
    cburst: { n: "Cinder Burst", ic: "🌋", el: "fire", tg: "all", p: 0.8, w: 2, cd: 4, an: "roar", fx: "magma", bn: 2 },
    // ---- Gloom Warden (t5 boss) ----
    scourge: { n: "Royal Scourge", ic: "⚔", el: "spirit", tg: "one", p: 1.2, w: 2, an: "slam", fx: "rake" },
    dnova: { n: "Dusk Nova", ic: "✹", el: "spirit", tg: "all", p: 0.7, w: 3, cd: 1, an: "cast", fx: "nova" },
    crown: {
      n: "Crown of Night",
      ic: "👑",
      el: "spirit",
      tg: "debuff",
      p: 0.4,
      w: 1.5,
      cd: 3,
      an: "glare",
      fx: "fear",
      pp: 1,
      ppn: "Night's dread",
    },
    callknight: {
      n: "Call the Guard",
      ic: "☖",
      el: "spirit",
      tg: "summon",
      w: 2,
      cd: 4,
      an: "roar",
      fx: "summon",
      c: room,
      sp: { kind: "gloom", t: 5, mt: 3, hc: 0x3a3a7a, min: "knight" },
    },
    eclipse: {
      n: "Eclipse",
      ic: "🌑",
      el: "spirit",
      tg: "all",
      p: 1.15,
      w: 3,
      cd: 5,
      an: "cast",
      fx: "eclipse",
      c: half,
    },
    // ---- tower Cinder Fiend boss ----
    meteor: {
      n: "Meteor Rain",
      ic: "☄",
      el: "fire",
      tg: "all",
      p: 0.9,
      w: 2.5,
      cd: 4,
      an: "cast",
      fx: "meteor",
      bn: 1,
    },
    callember: {
      n: "Stoke the Embers",
      ic: "☖",
      el: "fire",
      tg: "summon",
      w: 2,
      cd: 4,
      an: "roar",
      fx: "summon",
      c: room,
      sp: { kind: "gloom", t: 4, mt: 2, hc: 0xff6a2a, min: "ember" },
    },
    // ---- Mossbound Tyrant (dungeon boss) ----
    quake: { n: "Thorn Quake", ic: "🌿", el: "heal", tg: "all", p: 0.8, w: 2, cd: 3, an: "slam", fx: "thorns" },
    regrow: {
      n: "Overgrowth",
      ic: "✚",
      el: "heal",
      tg: "self",
      w: 2,
      cd: 4,
      an: "roar",
      fx: "regrow",
      hl: 0.1,
      gd: 1,
      c: hurtc,
    },
    // ---- Frost Wolf ----
    bite: { n: "Bite", ic: "🦷", el: "ice", tg: "one", p: 1.1, w: 3, an: "bite", fx: "bite", ch: 0.3 },
    howl: {
      n: "Pack Howl",
      ic: "📣",
      el: "ice",
      tg: "pack",
      who: "wolf",
      bf: 1.4,
      w: 2,
      cd: 3,
      an: "howl",
      fx: "howl",
      c: mate("wolf"),
    },
    fbreath: {
      n: "Frost Breath",
      ic: "❄",
      el: "ice",
      tg: "all",
      p: 0.6,
      w: 1.5,
      cd: 3,
      an: "breath",
      fx: "breath",
      ch: 0.5,
    },
    hams: { n: "Hamstring", ic: "🐾", el: "ice", tg: "one", p: 1.5, w: 1.5, cd: 2, an: "pounce", fx: "rake", ch: 1 },
    apounce: {
      n: "Alpha Pounce",
      ic: "💥",
      el: "ice",
      tg: "one",
      p: 1.9,
      w: 2,
      cd: 4,
      an: "pounce",
      fx: "icecrash",
      ch: 1,
    },
    // ---- Rimefang Matriarch ----
    bliz: {
      n: "Blizzard Howl",
      ic: "🌨",
      el: "ice",
      tg: "all",
      p: 0.9,
      w: 2.5,
      cd: 4,
      an: "howl",
      fx: "blizzard",
      ch: 1,
    },
    callcub: {
      n: "Call the Pack",
      ic: "☖",
      el: "ice",
      tg: "summon",
      w: 2,
      cd: 4,
      an: "howl",
      fx: "summon",
      c: room,
      sp: { kind: "wolf", t: 2, min: "cub", nm: "Rime Cub" },
    },
    // ---- Ember Hound ----
    pounce: { n: "Ember Pounce", ic: "🐾", el: "fire", tg: "one", p: 1.1, w: 3, an: "pounce", fx: "emberhit", bn: 2 },
    hbreath: {
      n: "Flame Breath",
      ic: "🔥",
      el: "fire",
      tg: "all",
      p: 0.6,
      w: 1.5,
      cd: 3,
      an: "breath",
      fx: "breath",
      bn: 1,
    },
    ignite: { n: "Searing Bite", ic: "🦷", el: "fire", tg: "one", p: 0.95, w: 2, cd: 2, an: "bite", fx: "bite", bn: 3 },
    icharge: {
      n: "Inferno Charge",
      ic: "💥",
      el: "fire",
      tg: "one",
      p: 1.9,
      w: 2,
      cd: 4,
      an: "charge",
      fx: "firecrash",
      bn: 2,
    },
    // ---- Kiln Mother ----
    magma: {
      n: "Magma Eruption",
      ic: "🌋",
      el: "fire",
      tg: "all",
      p: 0.95,
      w: 2.5,
      cd: 4,
      an: "roar",
      fx: "magma",
      bn: 2,
    },
    callimp: {
      n: "Wake the Kiln",
      ic: "☖",
      el: "fire",
      tg: "summon",
      w: 2,
      cd: 4,
      an: "roar",
      fx: "summon",
      c: room,
      sp: { kind: "gloom", t: 4, mt: 2, hc: 0xff6a2a, min: "ember", nm: "Kiln Imp" },
    },
    // ---- minions ----
    bash: { n: "Shield Bash", ic: "🛡", el: "spirit", tg: "one", p: 1.1, w: 3, an: "slam", fx: "bash" },
    ward: {
      n: "Warding Oath",
      ic: "✚",
      el: "heal",
      tg: "heal",
      who: "boss",
      hl: 0.08,
      w: 4,
      cd: 2,
      an: "cast",
      fx: "mend",
      c: bossHurt,
    },
    shwall: { n: "Shield Wall", ic: "🛡", el: "spirit", tg: "self", w: 1.2, cd: 3, an: "guard", fx: "guard", gd: 1 },
    spit: { n: "Ember Spit", ic: "🔥", el: "fire", tg: "one", p: 1.0, w: 3, an: "spit", fx: "spit", rng: 1, bn: 2 },
    flare: { n: "Flare", ic: "✹", el: "fire", tg: "all", p: 0.5, w: 1.5, cd: 3, an: "cast", fx: "flare" },
    stoke: {
      n: "Stoke",
      ic: "▲",
      el: "fire",
      tg: "pack",
      who: "any",
      bf: 1.25,
      w: 1.5,
      cd: 3,
      an: "cast",
      fx: "stoke",
      c: mate("any"),
    },
    nibble: { n: "Nibble", ic: "🦷", el: "heal", tg: "one", p: 1.0, w: 3, an: "bite", fx: "bite" },
    puffm: {
      n: "Spore Puff",
      ic: "🍄",
      el: "heal",
      tg: "debuff",
      p: 0.4,
      w: 1.5,
      cd: 3,
      an: "shake",
      fx: "spores",
      pp: 1,
      ppn: "Spores",
    },
    mend: { n: "Mend Moss", ic: "✚", el: "heal", tg: "heal", hl: 0.1, w: 2, cd: 3, an: "cast", fx: "mend", c: anyHurt },
    nip: { n: "Nip", ic: "🦷", el: "ice", tg: "one", p: 1.0, w: 3, an: "bite", fx: "bite" },
    yip: {
      n: "Yip",
      ic: "📣",
      el: "ice",
      tg: "pack",
      who: "wolf",
      bf: 1.25,
      w: 1.5,
      cd: 3,
      an: "howl",
      fx: "howl",
      c: mate("wolf"),
    },
    pant: {
      n: "Frost Pant",
      ic: "❄",
      el: "ice",
      tg: "one",
      p: 0.8,
      w: 1.5,
      cd: 2,
      an: "breath",
      fx: "frostpuff",
      rng: 1,
      ch: 1,
    },
  };
  Object.keys(L).forEach((k) => (FMV.M[k] = Object.assign({ id: k }, L[k])));
})();

// ---- picking a move (host) ----
FMV.kit = (f) => {
  let k = null;
  if (f.min) k = "m_" + f.min;
  else if (f.boss)
    k = f.dboss
      ? { gloom: "b_tyrant", wolf: "b_matri", hound: "b_kiln" }[f.kind]
      : f.t === 5
        ? "b_warden"
        : f.t === 4
          ? "b_fiend"
          : null;
  if (!k || !FMV.K[k]) k = f.kind === "gloom" ? "g" + Math.max(1, Math.min(5, f.t | 0 || 1)) : f.kind;
  let L = FMV.K[k];
  if (!L) return null;
  if (!f.min && !f.boss && (f.big || f.hc || f.el) && FMV.SIG[k]) L = L.concat(FMV.SIG[k]);
  return L;
};
// the short intent text on the plate (icon + number), and the badge above it carries the move name
FMV.txt = (f) => {
  const M = f.it && FMV.M[f.it.mv];
  if (!M) return f.itx || "";
  const d = f.it.d;
  return (
    M.ic +
    " " +
    ({
      one: String(d),
      all: "ALL " + d,
      debuff: "ALL " + d,
      self: M.gd ? "GUARD" : "BUFF",
      pack: "PACK",
      heal: "HEAL",
      summon: "CALL",
    }[M.tg] || String(d))
  );
};
FMV.pick = (f) => {
  const L = FMV.kit(f);
  if (!L) return false;
  const c = f.mcd || (f.mcd = {}),
    T0 = g.turn | 0;
  if (!f.mcdi) {
    // big moves start half-rested, so a fight doesn't open with every nuke at once
    f.mcdi = 1;
    L.forEach((id) => {
      const m = FMV.M[id];
      if (m && m.cd) c[id] = T0 + Math.floor(m.cd / 2);
    });
  }
  let ok = g.prac
    ? [L[0]]
    : L.filter((id) => {
        const m = FMV.M[id];
        if (!m || (c[id] || 0) > T0) return false;
        try {
          return !m.c || m.c(f);
        } catch (e) {
          return false;
        }
      });
  if (!ok.length) ok = [L[0]];
  let r = Math.random() * ok.reduce((s, id) => s + (FMV.M[id].w || 1), 0),
    id = ok[0];
  for (const k of ok)
    if ((r -= FMV.M[k].w || 1) <= 0) {
      id = k;
      break;
    }
  const M = FMV.M[id];
  if (M.cd) c[id] = T0 + M.cd + 1;
  // same base hit as the old intent(): specials trade frequency (cooldowns) for power
  const base = (6 + 2.3 * foeLv(f) + Math.random() * 3) * g.dm * (f.min ? 0.5 : 1) * (f.boss ? 0.85 : 1);
  let mul = M.p || 0;
  if (mul) {
    if (f.buff) {
      mul *= f.buff;
      f.buff = 0;
    }
    if (f.el === "frenzied") mul *= 1.3;
  }
  f.it = { ab: "mv", mv: id, d: Math.round(base * mul) };
  f.mvn = M.n;
  f.itx = FMV.txt(f);
  return true;
};

// ---- poses: wind-up (ph 0, holds until the strike) and strike/return (ph 1, ms long) on the foe's parts ----
FMV.pose = (o, an, ph, ms) => {
  if (!o || !o.userData) return;
  o.userData.fp = { an, ph: ph ? 1 : 0, t0: performance.now(), ms: ms || 700 };
};
// runs right after animGloom/animBeast set the idle pose; only touches values those set every frame (so nothing drifts)
FMV.over = (o) => {
  const u = o.userData,
    p = u.fp,
    now = performance.now(),
    t = now - p.t0;
  let wu, st, su;
  if (!p.ph) {
    if (t > 5000) return void (u.fp = null);
    const k = Math.min(1, t / 260);
    wu = su = k * k * (3 - 2 * k);
    st = 0;
  } else {
    const k = t / p.ms;
    if (k >= 1) return void (u.fp = null);
    wu = Math.max(0, 1 - k / 0.2);
    st = k < 0.2 ? k / 0.2 : Math.max(0, 1 - (k - 0.2) / 0.8);
    su = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  }
  const tr = Math.sin(now * 0.04),
    an = p.an;
  try {
    if (u.gl) FMV.poseG(u, an, wu, st, su, tr, now);
    else if (u.L) FMV.poseB(u, an, wu, st, su, tr, now);
  } catch (e) {
    u.fp = null; // a part the model doesn't have: drop the pose quietly
  }
};
// gloom creatures: bd (body), hd (head), arms[] (shoulder pivots, talons in userData.cl), wings[], tail. Any may be missing.
FMV.poseG = (u, an, wu, st, su, tr, now) => {
  const bd = u.bd,
    hd = u.hd,
    A = Array.isArray(u.arms) ? u.arms : [],
    arm = (fx, fz, fc) =>
      A.forEach((a, n) => {
        if (!a || !a.rotation) return;
        const sd = n ? 1 : -1;
        a.rotation.x += fx(n);
        if (fz) a.rotation.z += sd * fz(n);
        const c = fc && a.userData && a.userData.cl;
        if (c && c.rotation) c.rotation.x += fc(n);
      }),
    B = (x, y, z) => {
      if (!bd) return;
      bd.rotation.x += x || 0;
      bd.rotation.y += y || 0;
      bd.rotation.z += z || 0;
    },
    Hx = (v) => hd && (hd.rotation.x += v),
    Sq = (a) => bd && bd.scale.set(bd.scale.x * (1 + a * 0.6), bd.scale.y * (1 - a), bd.scale.z * (1 + a * 0.6));
  switch (an) {
    case "slam":
      arm(
        () => -2.6 * wu - 0.7 * st,
        () => 0.15 * wu,
      );
      B(-0.3 * wu + 0.5 * st);
      Hx(-0.25 * wu + 0.3 * st);
      Sq(-0.1 * wu + 0.12 * st);
      break;
    case "cast":
      arm(
        (n) => -1.7 * su - 0.5 * st + tr * 0.04 * su,
        () => 0.5 * su,
        () => 0.6 * su,
      );
      B(-0.15 * su);
      Hx(-0.3 * su);
      break;
    case "glare":
      arm(
        () => -0.4 * su,
        () => 0.8 * su,
      );
      Hx(-0.15 * su + tr * 0.04 * su);
      Sq(-0.06 * su);
      break;
    case "drain":
      arm(
        () => -1.4 * su + tr * 0.06 * su,
        () => -0.1 * su,
        () => 0.7 * su,
      );
      B(0.25 * su);
      Hx(0.15 * su);
      break;
    case "guard":
      arm(
        () => -1.3 * su,
        () => -0.9 * su,
      );
      Sq(0.1 * su);
      Hx(0.3 * su);
      break;
    case "roar":
    case "howl":
      arm(
        () => -0.6 * su,
        () => 1.1 * su,
        () => 0.8 * su,
      );
      B(-0.3 * su, 0, tr * 0.05 * su);
      Hx(-0.7 * su);
      break;
    case "shake":
      arm(
        () => -0.3 * su,
        (n) => (0.6 + tr * 0.35 * (n ? 1 : -1)) * su,
      );
      B(0, 0, tr * 0.18 * su);
      break;
    case "flap":
      arm(
        () => -1.0 * su,
        () => 0.4 * su,
      );
      if (Array.isArray(u.wings))
        u.wings.forEach((w, n) => w && (w.rotation.y += (n ? 1 : -1) * Math.sin(now * 0.03) * 0.9 * su));
      if (bd) bd.position.y += 0.4 * su;
      break;
    case "bite":
    case "spit":
    case "breath":
      B(-0.15 * wu + 0.3 * st);
      Hx(-0.45 * wu + 0.55 * st);
      break;
    case "pounce":
    case "charge":
      arm(
        () => 0.5 * wu - 1.6 * st,
        () => 0.2 * st,
        () => 0.8 * st,
      );
      B(-0.35 * wu + 0.6 * st);
      Sq(0.15 * wu - 0.1 * st);
      break;
    default: // claw: the right arm leads, rises high, then rakes down and forward
      arm(
        (n) => (-2.0 * wu - 0.6 * st) * (n ? 1 : 0.55),
        () => 0.35 * wu,
        () => 0.9 * st - 0.4 * wu,
      );
      B(-0.25 * wu + 0.4 * st, 0.3 * wu - 0.4 * st);
      Hx(-0.25 * wu + 0.25 * st);
  }
};
// beasts (wolf/hound): L[] legs (0,1 front, 2,3 back), hd (head), tail
FMV.poseB = (u, an, wu, st, su, tr, now) => {
  const Lg = u.L || [],
    hd = u.hd,
    leg = (front, back) =>
      Lg.forEach((l, i) => {
        if (l && l.rotation) l.rotation.x += i < 2 ? front : back;
      }),
    Hx = (v) => hd && (hd.rotation.x += v),
    tail = (v) => u.tail && (u.tail.rotation.y += v);
  switch (an) {
    case "pounce":
      leg(0.4 * wu - 1.0 * st, -0.4 * wu + 0.9 * st);
      Hx(-0.3 * wu + 0.2 * st);
      tail(tr * 0.3 * su);
      break;
    case "charge":
      Lg.forEach((l, i) => l && (l.rotation.x += Math.sin(now * 0.025 + (i % 3 ? 3.14 : 0)) * 0.8 * su));
      Hx(0.35 * su);
      break;
    case "howl":
    case "roar":
      Hx(-0.9 * su + tr * 0.04 * su);
      leg(-0.25 * su, 0.1 * su);
      tail(tr * 0.4 * su);
      break;
    case "breath":
    case "cast":
      Hx(-0.5 * wu + 0.35 * st + tr * 0.03 * st);
      leg(0.25 * wu - 0.1 * st, 0);
      break;
    default: // bite: rear back, snap down
      Hx(-0.5 * wu + 0.6 * st);
      leg(0.15 * wu - 0.3 * st, 0);
  }
};

// ---- effects. fx(M, src, P, o): src = foe's feet, P = target spots (battlefield-local), o.par = parent (ghost
// battlefield), o.q = quiet (street spectator: no flashes or shake). Resolves when the hit lands. ----
FMV.fx = (M, src, P, o) => {
  o = o || {};
  const par = o.par || FXP,
    em = (fn) => {
      const pv = FXP;
      FXP = par;
      try {
        return fn();
      } finally {
        FXP = pv;
      }
    },
    el = SP[M.el] ? M.el : "spirit",
    c = { el, col: EHX[el] || 0xc9a0ff, em, q: !!o.q, src: src.clone(), H: src.clone().setY(2.1) },
    run = FMV.F[M.fx] || FMV.F.rake;
  return Promise.resolve()
    .then(() =>
      run(
        (P || []).map((p) => p.clone().setY(0)),
        c,
      ),
    )
    .catch((e) => console.warn("foe fx", M.fx, e));
};
// wind-up tell: light gathers on the foe (ranged/casts), or a quick glint (melee)
FMV.wind = (M, src, o) => {
  o = o || {};
  const par = o.par || FXP,
    pv = FXP,
    el = SP[M.el] ? M.el : "spirit",
    col = EHX[el] || 0xc9a0ff,
    H = src.clone().setY(2.1);
  FXP = par;
  try {
    if (M.rng || M.tg === "all" || M.tg === "debuff" || M.tg === "summon" || M.tg === "heal") {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * 6.283,
          r = 1.2 + Math.random(),
          p = H.clone().add(new T.Vector3(Math.cos(a) * r, (Math.random() - 0.3) * 1.5, Math.sin(a) * r));
        mote(p, { c: col, v: H.clone().sub(p).multiplyScalar(2.2), l: 0.45, s: 0.35, gr: -0.7, fi: 0.2 });
      }
      glowBurst(H, col, 2.2, 500);
    } else glowBurst(H, 0xffffff, 1.2, 220);
  } finally {
    FXP = pv;
  }
};
FMV.F = (() => {
  const V = (x, y, z) => new T.Vector3(x, y, z),
    up = (p, y) => p.clone().setY(y == null ? 1.4 : y),
    imp = (p, c, big) =>
      c.em(() => {
        big = big || 0;
        shock(p, c.col, 1.3 + big, 380);
        glowBurst(up(p), c.col, 2 + big * 1.5, 320);
        puff(up(p), c.el, 8 + Math.round(6 * big), 3, 0.5, 0.9);
      }),
    shake = (c, v) => {
      if (!c.q) shk = Math.max(shk, v);
    },
    // one projectile per target; resolves when the last lands
    bolt = (P, c, sz, ms, arc, after, tex) =>
      Promise.all(
        P.map((p, i) =>
          wait(i * 70).then(() => {
            const s = tex ? tex() : new T.Sprite(AM(SP[c.el]));
            if (s.isSprite) s.scale.setScalar(sz);
            return c
              .em(() =>
                shoot(s, c.H.clone(), up(p), ms, arc, (pos) => {
                  if (Math.random() < 0.6) c.em(() => mote(pos, { c: c.col, s: sz * 0.4, l: 0.35, gr: -0.6 }));
                }),
              )
              .then(() => {
                imp(p, c, 0.5);
                if (after) c.em(() => after(p));
              });
          }),
        ),
      ),
    // breath cone: motes stream from the head toward the targets
    cone = async (P, c, ms) => {
      if (!P.length) return;
      await tw(ms, () =>
        c.em(() => {
          for (let j = 0; j < 3; j++) {
            const p = P[(Math.random() * P.length) | 0],
              to = up(p, 1 + Math.random() * 0.8),
              v = to.sub(c.H),
              dl = v.length() || 1;
            v.multiplyScalar(9 / dl).add(
              V((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 2),
            );
            mote(c.H.clone(), { t: SP[c.el], c: 0xffffff, v, l: dl / 9, s: 0.7, gr: 1.4, dr: 0.3 });
          }
        }),
      );
    },
    // ground wave rolling from the foe to each target
    wave = (P, c, ms, el, after) =>
      Promise.all(
        P.map((p) => {
          const a = c.src.clone().setY(0.3),
            b = p.clone().setY(0.3),
            q = a.clone();
          return tw(ms, (k) => {
            q.lerpVectors(a, b, k);
            c.em(() => puff(q.clone(), el || c.el, 1, 1.5, 0.5, 1.1));
          }).then(() => {
            imp(p, c, 0.6);
            if (after) c.em(() => after(p));
          });
        }),
      );
  return {
    rake: async (P, c) => {
      P.forEach((p) =>
        c.em(() => {
          slash(p);
          slash(p.clone().add(V(0.35, 0, 0.3)));
        }),
      );
      P.forEach((p) => imp(p, c, 0));
    },
    bite: async (P, c) => {
      P.forEach((p) =>
        c.em(() => {
          glowBurst(up(p, 1.6), 0xffffff, 1.5, 200);
          slash(p);
          burst(up(p, 1.5), c.col, 10, 4, { l: 0.45 });
        }),
      );
      P.forEach((p) => imp(p, c, 0));
    },
    bash: async (P, c) => {
      P.forEach((p) =>
        c.em(() => {
          ring(p.x, 0xffffff, 2.5, 320, p.z);
          slash(p);
        }),
      );
      P.forEach((p) => imp(p, c, 0.5));
      shake(c, 0.5);
    },
    bolt: (P, c) => bolt(P, c, 1.3, 380, 1.0),
    spit: (P, c) => bolt(P, c, 0.9, 320, 0.8, (p) => decal(p.x, p.z, "scorch", 0.8)),
    frostpuff: (P, c) => bolt(P, c, 1.0, 360, 0.5, (p) => decal(p.x, p.z, "frost", 0.9)),
    fireball: (P, c) => bolt(P, c, 2.0, 480, 1.6, (p) => decal(p.x, p.z, "scorch", 1.3)),
    boulder: (P, c) =>
      bolt(
        P,
        c,
        1,
        540,
        2.6,
        (p) => {
          for (let i = 0; i < 10; i++)
            mote(up(p, 0.5), {
              c: 0x6a5a48,
              nb: 1,
              v: [(Math.random() - 0.5) * 5, 2 + Math.random() * 3, (Math.random() - 0.5) * 5],
              g: 9,
              l: 0.7,
              s: 0.35,
              gr: 0,
            });
          shake(c, 0.7);
        },
        () => new T.Mesh(new T.DodecahedronGeometry(0.5, 0), new T.MeshLambertMaterial({ color: 0x6a5a48 })),
      ),
    drain: async (P, c) => {
      P.forEach((p) =>
        c.em(() => {
          link(up(p, 1.5), c.H.clone());
          for (let i = 0; i < 14; i++) {
            const a = up(p, 1 + Math.random()),
              v = c.H.clone().sub(a).multiplyScalar(1.8);
            mote(a, { c: 0xff3a5a, v, l: 0.55, s: 0.4, gr: -0.5, fi: 0.15 });
          }
        }),
      );
      await wait(260);
      P.forEach((p) => imp(p, c, 0));
      c.em(() => puff(c.H.clone(), "heal", 8, 2, 0.6, 0.8));
    },
    fear: async (P, c) => {
      if (!c.q) flashScr("#2a0a3a", 0.25);
      P.forEach((p) =>
        c.em(() => {
          vshock(up(p, 1.5), 0x8a4aff, 1.4, 500);
          ring(p.x, 0x6a2a9a, 2.5, 600, p.z);
          for (let i = 0; i < 8; i++)
            mote(up(p, 0.4 + Math.random()), {
              c: 0x6a2aaa,
              v: [(Math.random() - 0.5) * 1.2, 2.5, (Math.random() - 0.5) * 1.2],
              l: 0.9,
              s: 0.5,
              gr: 0.6,
            });
        }),
      );
      await wait(250);
      P.forEach((p) => imp(p, c, 0));
    },
    spores: async (P, c) => {
      P.forEach((p) =>
        c.em(() => {
          glowBurst(up(p, 1.2), 0x9ad86a, 2.6, 600);
          for (let i = 0; i < 12; i++)
            mote(up(p, 0.3 + Math.random() * 1.5), {
              c: 0x9ad86a,
              nb: 1,
              o: 0.7,
              v: [(Math.random() - 0.5) * 1.6, 0.6 + Math.random(), (Math.random() - 0.5) * 1.6],
              l: 1.3,
              s: 0.45,
              gr: 0.8,
              fi: 0.2,
            });
        }),
      );
      await wait(300);
      P.forEach((p) => imp(p, c, 0));
    },
    gust: async (P, c) => {
      c.em(() => ring(c.src.x, c.col, 4, 400, c.src.z));
      P.forEach((p) =>
        c.em(() => {
          for (let i = 0; i < 10; i++) {
            const v = up(p, 0.8 + Math.random() * 1.4)
              .sub(c.H)
              .multiplyScalar(3);
            mote(c.H.clone(), { c: 0xe8f4ff, v, l: 0.35, s: 0.5, gr: 0.6, sp: 8 });
          }
        }),
      );
      await wait(260);
      P.forEach((p) => imp(p, c, 0.2));
    },
    flare: async (P, c) => {
      c.em(() => vshock(c.H.clone(), c.col, 2.5, 380));
      if (!c.q) flashScr("#ff8a3d", 0.18);
      await wait(150);
      P.forEach((p) => imp(p, c, 0.2));
    },
    nova: async (P, c) => {
      c.em(() => {
        vshock(c.H.clone(), c.col, 3.5, 450);
        glowBurst(c.H.clone(), c.col, 6, 400);
      });
      if (!c.q) flashScr("#c9a0ff", 0.25);
      await wait(200);
      P.forEach((p) => imp(p, c, 0.8));
      shake(c, 0.8);
    },
    eclipse: async (P, c) => {
      if (!c.q) flashScr("#14061f", 0.55);
      c.em(() => glowBurst(c.H.clone().add(V(0, 2.5, 0)), 0x8a4aff, 9, 900));
      await wait(250);
      await Promise.all(
        P.map((p, i) =>
          wait(i * 80).then(() => {
            const s = new T.Sprite(AM(SP.spirit));
            s.scale.setScalar(2.2);
            return c
              .em(() => shoot(s, up(p, 9), up(p, 0.6), 340, 0))
              .then(() => {
                imp(p, c, 1);
                c.em(() => vshock(up(p, 1.2), 0x8a4aff, 2, 450));
              });
          }),
        ),
      );
      shake(c, 1);
    },
    meteor: async (P, c) => {
      await Promise.all(
        P.map((p, i) =>
          wait(i * 120).then(() => {
            const s = new T.Sprite(AM(SP.fire));
            s.scale.setScalar(2.4);
            return c
              .em(() =>
                shoot(s, p.clone().add(V(-4, 12, -1)), up(p, 0.6), 420, 0, (pos) =>
                  c.em(() => puff(pos.clone(), "fire", 1, 1, 0.4, 1)),
                ),
              )
              .then(() => {
                imp(p, c, 1);
                c.em(() => decal(p.x, p.z, "scorch", 1.4));
                shake(c, 0.6);
              });
          }),
        ),
      );
    },
    blizzard: async (P, c) => {
      if (!P.length) return;
      await tw(600, () =>
        c.em(() => {
          for (let j = 0; j < 3; j++) {
            const p = P[(Math.random() * P.length) | 0],
              a = c.H.clone().add(V((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3)),
              v = up(p, 0.5 + Math.random() * 2).sub(a);
            const dl = v.length() || 1;
            v.multiplyScalar(11 / dl);
            mote(a, { t: SP.ice, c: 0xffffff, v, l: dl / 11, s: 0.5, sp: 6 });
          }
        }),
      );
      P.forEach((p) => {
        imp(p, c, 0.8);
        c.em(() => decal(p.x, p.z, "frost", 1.4));
      });
      shake(c, 0.6);
    },
    breath: async (P, c) => {
      await cone(P, c, 480);
      P.forEach((p) => {
        imp(p, c, 0.3);
        c.em(() => decal(p.x, p.z, c.el === "fire" ? "scorch" : "frost", 1));
      });
    },
    flamewave: (P, c) => wave(P, c, 380, "fire", (p) => decal(p.x, p.z, "scorch", 1.2)),
    thorns: (P, c) =>
      wave(P, c, 360, "heal", (p) => {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * 6.283;
          mote(p.clone().add(V(Math.cos(a) * 0.7, 0.2, Math.sin(a) * 0.7)), {
            t: SP.slash,
            c: 0x7dff9a,
            v: [0, 4, 0],
            g: 6,
            l: 0.5,
            s: 0.8,
            gr: 0,
          });
        }
        shake(c, 0.5);
      }),
    magma: (P, c) => {
      c.em(() => shock(c.src, 0xff5a1a, 3, 500));
      return wave(P, c, 420, "fire", (p) => {
        pillar(p, 0xff6a2a, 0.8, 5, 500);
        decal(p.x, p.z, "scorch", 1.5);
        shake(c, 0.8);
      });
    },
    shadowcrash: async (P, c) => {
      P.forEach((p) => {
        imp(p, c, 1);
        c.em(() => {
          vshock(up(p, 1.2), 0x8a4aff, 2.2, 420);
          slash(p);
        });
      });
      shake(c, 0.8);
    },
    icecrash: async (P, c) => {
      P.forEach((p) => {
        imp(p, c, 1);
        c.em(() => {
          ring(p.x, 0x9fe8ff, 3, 420, p.z);
          decal(p.x, p.z, "frost", 1.6);
        });
      });
      shake(c, 0.8);
    },
    firecrash: async (P, c) => {
      P.forEach((p) => {
        imp(p, c, 1);
        c.em(() => {
          ring(p.x, 0xff5a1a, 3, 420, p.z);
          decal(p.x, p.z, "scorch", 1.6);
        });
      });
      shake(c, 0.8);
    },
    emberhit: async (P, c) => {
      P.forEach((p) => {
        imp(p, c, 0.3);
        c.em(() => decal(p.x, p.z, "scorch", 0.9));
      });
    },
    // support moves (P = the foes they touch)
    guard: async (P, c) =>
      c.em(() => {
        shock(c.src, c.col, 2, 450);
        glowBurst(c.H.clone(), c.col, 3.5, 450);
        ring(c.src.x, c.col, 2.5, 450, c.src.z);
      }),
    kindle: async (P, c) =>
      c.em(() => {
        pillar(c.src, 0xff7a2a, 1, 7, 700);
        ring(c.src.x, 0xff5a1a, 3, 500, c.src.z);
        for (let i = 0; i < 12; i++)
          mote(c.src.clone().add(V((Math.random() - 0.5) * 1.6, 0.3, (Math.random() - 0.5) * 1.6)), {
            t: SP.fire,
            c: 0xffffff,
            v: [0, 3 + Math.random() * 2, 0],
            l: 0.7,
            s: 0.7,
          });
      }),
    regrow: async (P, c) =>
      c.em(() => {
        pillar(c.src, 0x9affc0, 1.1, 7, 750);
        puff(c.H.clone(), "heal", 14, 3, 0.8, 1);
        shock(c.src, 0x7dff9a, 2.4, 500);
      }),
    howl: async (P, c) => {
      for (let i = 0; i < 3; i++) {
        c.em(() => vshock(c.H.clone(), c.col, 1.6 + i, 500));
        await wait(140);
      }
      P.forEach((p) => c.em(() => puff(up(p, 2.5), c.el, 8, 2, 0.7, 0.8)));
    },
    stoke: async (P, c) =>
      P.forEach((p) =>
        c.em(() => {
          link(c.H.clone(), up(p, 2));
          puff(up(p, 2), "fire", 8, 2, 0.6, 0.9);
        }),
      ),
    mend: async (P, c) => {
      P.forEach((p) =>
        c.em(() => {
          link(c.H.clone(), up(p, 2));
          pillar(p, 0x9affc0, 0.9, 6, 600);
          puff(up(p, 2), "heal", 10, 2, 0.7, 0.9);
        }),
      );
      await wait(200);
    },
    summon: async (P, c) => {
      P.forEach((p) =>
        c.em(() => {
          pillar(p, c.col, 1, 9, 800);
          rune(p, c.el, 1.8, 900, c.col);
          shock(p, c.col, 2.4, 500);
        }),
      );
      await wait(250);
    },
  };
})();

// ---- multiplayer: the host tells guests and street spectators what each foe does (pose + effect) ----
FMV.send = (f, M, ph, pts, ms) => {
  if (!NET.online || !g || !g.id || g.prac) return;
  NET.send("fmv", {
    b: g.id,
    fi: g.foes.indexOf(f),
    mv: M.id,
    ph: ph ? 1 : 0,
    ms: ms || 0,
    p: (pts || []).map((v) => [+v.x.toFixed(2), +v.z.toFixed(2)]),
  });
};
NET.on("fmv", (d) => {
  const M = d && d.b && FMV.M[d.mv];
  if (!M) return;
  const pts = (Array.isArray(d.p) ? d.p : []).slice(0, 8).map((a) => new T.Vector3(+a[0] || 0, 0, +a[1] || 0)),
    ms = Math.max(200, Math.min(2000, +d.ms || 700));
  if (mode === "guest" && GUEST && d.b === GUEST.b) {
    const m = GUEST.fm[d.fi];
    if (!m) return;
    FMV.pose(m, M.an, d.ph, ms);
    if (!d.ph) {
      FMV.wind(M, m.position);
      if (M.tg !== "one" && M.tg !== "all" && M.tg !== "debuff") banner(M.ic + " " + escH(M.n), "atk");
    } else FMV.fx(M, m.position.clone(), pts, {});
    return;
  }
  if (mode !== "explore") return;
  const o = OPENB.get(d.b);
  if (!o || !o.grp || !o.fm || !o.s || Math.hypot(W.position.x - o.s.x, W.position.z - o.s.z) > 70) return;
  const m = o.fm[d.fi];
  if (!m) return;
  FMV.pose(m, M.an, d.ph, ms);
  if (!d.ph) FMV.wind(M, m.position, { par: o.grp });
  else FMV.fx(M, m.position.clone(), pts, { par: o.grp, q: 1 });
});

// ---- running a move (host). Same targeting / block / parry rules as the old foeAct. ----
FMV.BL = ["", "BLOCK", "PARRY!"];
FMV.bm = (gr) => (gr === 2 ? 0.25 : gr === 1 ? 0.6 : 1);
// every spot an area move touches: you (if standing), the other heroes, the summons
FMV.pts = () => {
  const L = [];
  if (!iAmDown()) L.push(W.position);
  g.heroes.forEach((h) => !h.local && !h.down && h.m && L.push(h.m.position));
  g.allies.forEach((s) => L.push(s.m.position));
  return L;
};
// on-hit effects for the local player
FMV.st = (M, gr) => {
  if (gr === 2 || iAmDown() || !g.pst) return "";
  let t = "";
  if (M.bn) {
    const n = M.bn - (gr ? 1 : 0);
    if (n > 0) {
      g.pst.burn = Math.max(g.pst.burn || 0, n);
      t += " You burn for " + n + " turn" + (n > 1 ? "s" : "") + "!";
    }
  }
  if (M.ch && Math.random() < M.ch * (gr ? 0.5 : 1)) {
    g.pst.chill = 1;
    t += " Frostbite: -1 pip next turn.";
    toast("Frostbite: -1 pip next turn");
  }
  if (M.pp && Math.random() < (gr ? 0.5 : 1)) {
    g.pst.drain = 1;
    t += " " + (M.ppn || "Dread") + ": -1 pip next turn.";
    toast((M.ppn || "Dread") + ": -1 pip next turn");
  }
  return t;
};
FMV.lifesteal = (f, M, dd) => {
  if (!M.lf || dd <= 0 || f.hp <= 0) return "";
  const h = Math.max(1, Math.round(dd * M.lf));
  f.hp = Math.min(f.max, f.hp + h);
  popNum(f.m.position, "+" + h, "#7dff9a", "DRAINS");
  return " It drinks " + h + " HP.";
};
// pounce / charge: a hop (or a low rush) instead of the plain lunge
FMV.dash = async (f, to, hop) => {
  const m = f.m,
    x0 = m.position.clone(),
    p = to.clone(),
    b = m.scale.x;
  p.x += 1.6;
  p.y = 0;
  await tw(200, (k) => {
    m.scale.set(b * (1 + 0.12 * k), b * (1 - 0.2 * k), b * (1 + 0.12 * k));
    m.position.x = x0.x + 0.4 * k;
  });
  f.run = 1;
  const x1 = m.position.clone();
  await tw(300, (k) => {
    m.position.lerpVectors(x1, p, k);
    m.position.y = Math.sin(k * Math.PI) * hop;
    m.scale.set(b * 0.94, b * 1.12, b * 0.94);
  });
  m.position.y = 0;
  m.scale.setScalar(b);
  return x0;
};
// ranged/cast: a small rock back on the heels while the spell leaves
FMV.recoil = (f) => {
  const m = f.m,
    x = m.position.x;
  return tw(260, (k) => (m.position.x = x + Math.sin(k * Math.PI) * 0.35)).then(() => (m.position.x = x));
};
FMV.one = async (f, d, M) => {
  const opts = [];
  if (!iAmDown()) opts.push({ w: P.role === "tank" ? 6 : 2 });
  g.heroes.forEach((h) => {
    if (!h.local && !h.down) opts.push({ w: h.role === "tank" ? 6 : 2, h });
  });
  g.allies.forEach((s) => opts.push({ w: ALLY[s.t].taunt || 1, s }));
  const tz = g.taunt && g.heroes.find((h) => h.id === g.taunt && !h.down);
  let tg;
  if (tz) tg = tz.local ? { w: 1 } : { w: 1, h: tz };
  else {
    if (!opts.length) return;
    let r = Math.random() * opts.reduce((a, o) => a + o.w, 0);
    tg = opts[0];
    for (const o of opts)
      if ((r -= o.w) <= 0) {
        tg = o;
        break;
      }
  }
  const n = ++QN,
    tpos = tg.s ? tg.s.m.position : tg.h ? tg.h.m.position : W.position,
    nm = tg.s ? tg.s.label : tg.h ? tg.h.name : "you";
  focSet(tpos, f.m.position, 0, M.ic + " The " + f.label + " readies " + M.n + " at " + nm + "!");
  fatkSend(f, tg.s ? "" : tg.h ? tg.h.id : P.id, 0, n);
  FMV.send(f, M, 0, [tpos]);
  FMV.pose(f.m, M.an, 0);
  FMV.wind(M, f.m.position);
  await wait(300);
  const gr = tg.s ? 0 : tg.h ? (tg.h.remote && !tg.h.left ? await remoteBlock(tg.h, n) : 0) : await blockQ(f);
  if (mode !== "battle") return;
  if (gr && !tg.h) P.blocks = (P.blocks || 0) + 1;
  const ms = M.rng ? 650 : 800;
  FMV.pose(f.m, M.an, 1, ms);
  FMV.send(f, M, 1, [tpos], ms);
  let x0 = null;
  if (!M.rng)
    x0 =
      M.an === "pounce" || M.an === "charge"
        ? await FMV.dash(f, tpos, M.an === "pounce" ? 1.6 : 0.4)
        : await lunge(f, tpos);
  else FMV.recoil(f);
  await FMV.fx(M, f.m.position, [tpos]);
  if (mode !== "battle") return;
  const raw = Math.round(d * FMV.bm(gr)),
    dd = tg.h ? hurtHero(tg.h, raw, f) : hurt(tg.s, raw, gr === 2 ? null : f, FMV.BL[gr]);
  vamp(f, dd);
  let ms2 =
    "The " +
    f.label +
    "'s " +
    M.n +
    " hits " +
    (tg.s ? "your " + tg.s.label : nm) +
    " for " +
    dd +
    "." +
    (gr === 1 ? " Blocked!" : "");
  if (gr === 2) {
    dmg(f, Math.round(10 * lvS()), undefined, 1);
    slash(f.m.position);
    ms2 =
      (tg.h ? tg.h.name + " parries" : "You parry") +
      " the " +
      f.label +
      "'s " +
      M.n +
      "! Only " +
      dd +
      " gets through, and " +
      (tg.h ? "they strike" : "you strike") +
      " back.";
  } else {
    ms2 += FMV.lifesteal(f, M, dd);
    if (!tg.s && !tg.h) ms2 += FMV.st(M, gr);
  }
  $("log").textContent = ms2;
  shk = Math.max(shk, M.p >= 1.5 ? 0.8 : 0.3);
  ui();
  if (x0) await back(f, x0);
  else await wait(250);
};
FMV.all = async (f, d, M) => {
  const n = ++QN,
    rem = g.heroes.filter((h) => h.remote && !h.left && !h.down),
    pts = FMV.pts();
  focSet(null, f.m.position, 1, M.ic + " The " + f.label + " unleashes " + M.n + " on everyone!");
  fatkSend(f, null, 1, n);
  FMV.send(f, M, 0, pts);
  FMV.pose(f.m, M.an, 0);
  FMV.wind(M, f.m.position);
  await wait(300);
  const [gr, ...rg] = await Promise.all([iAmDown() ? 0 : blockQ(f), ...rem.map((h) => remoteBlock(h, n))]);
  if (mode !== "battle") return;
  const ms = 900;
  FMV.pose(f.m, M.an, 1, ms);
  FMV.send(f, M, 1, pts, ms);
  let x0 = null;
  if (M.an === "slam" || M.an === "pounce") x0 = await lunge(f, new T.Vector3(f.m.position.x - 2.5, 0, f.m.position.z));
  else FMV.recoil(f);
  await FMV.fx(M, f.m.position, pts);
  if (mode !== "battle") return;
  shk = Math.max(shk, M.p >= 0.8 ? 0.9 : 0.5);
  if (gr) P.blocks = (P.blocks || 0) + 1;
  let mine = 0;
  if (!iAmDown() && d > 0) {
    mine = hurt(null, Math.round(d * FMV.bm(gr)), gr === 2 ? null : f, FMV.BL[gr]);
    vamp(f, mine);
  }
  g.heroes.forEach((h) => {
    if (h.local || h.down || d <= 0) return;
    const k = rem.indexOf(h);
    hurtHero(h, Math.round(d * FMV.bm(k >= 0 ? rg[k] : 0)), f);
  });
  if (d > 0) [...g.allies].forEach((a) => hurt(a, d, f));
  let t =
    "The " +
    f.label +
    "'s " +
    M.n +
    " hits everyone for " +
    d +
    "!" +
    (gr ? " You " + (gr === 2 ? "parry" : "block") + " it." : "");
  t += FMV.lifesteal(f, M, mine);
  t += FMV.st(M, gr);
  $("log").textContent = t;
  ui();
  if (x0) await back(f, x0);
  else await wait(300);
};
FMV.sup = async (f, M) => {
  const fp = f.m.position;
  banner(M.ic + " " + M.n, "atk");
  $("log").textContent = "The " + f.label + " uses " + M.n + "!";
  // who it touches (decided before the wind-up, so spectators see the same thing)
  let pts = [],
    tgt = null,
    slot = -1,
    mates = [];
  if (M.tg === "pack") {
    mates = g.foes.filter((q) => q !== f && q.hp > 0 && (M.who !== "wolf" || q.kind === "wolf"));
    pts = mates.map((q) => q.m.position);
  } else if (M.tg === "heal") {
    const live = g.foes.filter((q) => q.hp > 0);
    tgt = (M.who === "boss" && live.find((q) => q.boss)) || live.sort((a, b) => a.hp / a.max - b.hp / b.max)[0] || f;
    pts = [tgt.m.position];
  } else if (M.tg === "summon") {
    const used = g.foes.filter((q) => q.hp > 0).map((q) => q.slot);
    slot = [0, 1, 2, 3].find((i) => !used.includes(i));
    if (slot == null) slot = -1;
    if (slot >= 0) pts = [new T.Vector3(SLE[slot][0], 0, SLE[slot][1])];
  }
  FMV.send(f, M, 0, pts);
  FMV.pose(f.m, M.an, 0);
  FMV.wind(M, fp);
  await wait(380);
  if (mode !== "battle") return;
  FMV.pose(f.m, M.an, 1, 800);
  FMV.send(f, M, 1, pts, 800);
  await FMV.fx(M, fp, pts);
  if (mode !== "battle") return;
  let t = "";
  if (M.tg === "self") {
    if (M.gd) f.guard = 1;
    if (M.hl) {
      const h = Math.round(f.max * M.hl);
      f.hp = Math.min(f.max, f.hp + h);
      popNum(fp, "+" + h, "#7dff9a", M.n.toUpperCase());
    }
    if (M.bf) f.buff = Math.max(f.buff || 0, M.bf);
    t =
      "The " +
      f.label +
      " uses " +
      M.n +
      "." +
      (M.gd ? " It takes half damage until it acts again." : "") +
      (M.bf ? " Its next attack hits " + Math.round((M.bf - 1) * 100) + "% harder." : "") +
      (M.hl && !M.gd ? " It mends itself." : "");
  } else if (M.tg === "pack") {
    mates.forEach((q) => {
      if (q.acted || !q.it || !(q.it.d > 0)) q.buff = Math.max(q.buff || 0, M.bf);
      else {
        q.it.d = Math.round(q.it.d * M.bf);
        q.itx = FMV.M[q.it.mv] ? FMV.txt(q) : String(q.itx || "").replace(/\d+/, q.it.d);
      }
    });
    t =
      "The " +
      f.label +
      " uses " +
      M.n +
      "! Its allies' next attacks hit " +
      Math.round((M.bf - 1) * 100) +
      "% harder.";
  } else if (M.tg === "heal" && tgt) {
    const h = Math.round(tgt.max * M.hl);
    tgt.hp = Math.min(tgt.max, tgt.hp + h);
    popNum(tgt.m.position, "+" + h, "#7dff9a", "MENDED");
    t = "The " + f.label + "'s " + M.n + " mends " + (tgt === f ? "itself" : "the " + tgt.label) + " for " + h + ".";
  } else if (M.tg === "summon") {
    if (slot < 0 || !M.sp) t = "The " + f.label + " calls out, but nothing answers.";
    else {
      const sp = Object.assign({ pack: 1 }, M.sp);
      if (sp.min && !g.bossHp) sp.hp0 = Math.round(foeHp(foeLv(f)) * 0.4);
      const nf = newFoe(sp, slot),
        b = nf.m.scale.x;
      nf.acted = 1; // arrives ready for next round
      f.nsum = (f.nsum || 0) + 1;
      intent(nf);
      nf.m.scale.setScalar(0.01);
      t = "The " + f.label + " uses " + M.n + "! A " + nf.label + " joins the fight.";
      ui();
      await tw(420, (k) =>
        nf.m.scale.setScalar(0.01 + (b - 0.01) * (k < 0.8 ? (k / 0.8) * 1.1 : 1.1 - ((k - 0.8) / 0.2) * 0.1)),
      );
      nf.m.scale.setScalar(b);
    }
  }
  $("log").textContent = t;
  ui();
  await wait(280);
};
// called by foeAct (10) after burn/stun/chill/hex; true = the move was handled here
async function fmRun(f, d) {
  const M = f && f.it && FMV.M[f.it.mv];
  if (!M) return false;
  try {
    if (M.tg === "one") await FMV.one(f, d, M);
    else if (M.tg === "all" || M.tg === "debuff") await FMV.all(f, d, M);
    else await FMV.sup(f, M);
  } catch (e) {
    console.warn("foe move", M.id, e);
  }
  return true;
}

// ---- wrappers: intent picks from the moveset; poses ride on the idle animations; a NEXT badge above the plate ----
(() => {
  const i0 = intent,
    ag0 = animGloom,
    ab0 = animBeast,
    up0 = tagUpd,
    un0 = undeco;
  intent = function (f) {
    if (!FMV.pick(f)) {
      f.mvn = null;
      i0(f);
    }
  };
  animGloom = function (o, s, m, i) {
    ag0(o, s, m, i);
    if (o && o.userData && o.userData.fp) FMV.over(o);
  };
  animBeast = function (o, s, m) {
    ab0(o, s, m);
    if (o && o.userData && o.userData.fp) FMV.over(o);
  };
  function draw(e, M) {
    const ib = e.ib,
      x = ib.c.getContext("2d"),
      col = ELC[M.el] || "#ffb0a0",
      txt = M.ic + " " + M.n + (e.it.d > 0 ? "  " + (M.tg === "all" || M.tg === "debuff" ? "ALL " : "") + e.it.d : "");
    x.clearRect(0, 0, 320, 44);
    x.font = "800 18px system-ui";
    x.textBaseline = "middle";
    const lw = x.measureText("NEXT ").width,
      tw2 = Math.min(300 - lw, x.measureText(txt).width),
      w = lw + tw2 + 20,
      px = 160 - w / 2;
    x.fillStyle = "rgba(24,6,12,.85)";
    x.beginPath();
    x.moveTo(px + 11, 3);
    x.arcTo(px + w, 3, px + w, 41, 11);
    x.arcTo(px + w, 41, px, 41, 11);
    x.arcTo(px, 41, px, 3, 11);
    x.arcTo(px, 3, px + w, 3, 11);
    x.fill();
    x.strokeStyle = col;
    x.lineWidth = 2;
    x.stroke();
    x.textAlign = "left";
    x.fillStyle = "#ffb0a0";
    x.fillText("NEXT ", px + 10, 23);
    x.fillStyle = col;
    x.fillText(txt, px + 10 + lw, 23, tw2);
    ib.tx.needsUpdate = true;
  }
  tagUpd = function (e) {
    up0(e);
    if (!e || !e.foe || !e.tag || e.ib === null) return;
    const M = e.it && FMV.M[e.it.mv];
    if (!M || !(e.hp > 0)) {
      if (e.ib) e.ib.sp.visible = false;
      return;
    }
    if (!e.ib) {
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = 44;
      const tx = new T.CanvasTexture(c),
        sp = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false }));
      sp.scale.set(2.6, 0.36, 1);
      sp.renderOrder = 5;
      BG.add(sp);
      e.ib = { c, tx, sp, k: "" };
    }
    const ib = e.ib,
      k = M.id + "|" + e.it.d;
    if (ib.k !== k) {
      ib.k = k;
      draw(e, M);
    }
    ib.sp.position.copy(e.tag.position);
    ib.sp.position.y += e.wkb ? 0.88 : 0.5;
    ib.sp.visible = e.tag.visible !== false;
    ib.sp.material.opacity = e.acted ? 0.45 : 1;
  };
  undeco = function (e) {
    un0(e);
    if (e && e.ib) {
      if (e.ib.sp.parent) e.ib.sp.parent.remove(e.ib.sp);
      e.ib.tx.dispose();
      e.ib.sp.material.dispose();
    }
    if (e) e.ib = null; // null: a late tagUpd must not rebuild it
  };
})();
