// DUSKWICK - 06-profile-quests.js: Profile & saves (DEFP, P, sv/ld), classes CL, ROLE table, story/quests QS, rewards, levelling.
// Loaded in order by index.html as plain scripts; they share one global scope.
// ---------- profile ----------
let talkN = null,
  lastZl = "",
  sealT = 0,
  mmF = 0,
  trkH = "",
  grace = 0,
  vicT = 0,
  blinkT = 2,
  g,
  paused = false,
  BD = 12,
  BH = 5.5,
  mode = "explore",
  cur = null,
  snap = true,
  yaw = 0,
  camH = 7,
  camD = 11,
  dr = null,
  jv = { x: 0, y: 0 },
  zt = "",
  ptcd = 0,
  castT = 0,
  mv = 0,
  run = 0,
  runT = 0,
  zcur = "hub",
  trT = 0,
  lastPs = -1;
const saved = new T.Vector3(),
  keys = {};
const DEFP = () => ({
  name: "Lampwick",
  cls: null,
  lvl: 1,
  xp: 0,
  gold: 0,
  lens: 0,
  cloak: 0,
  hs: 0,
  sig: 0,
  kills: 0,
  casts: 0,
  boss: 0,
  summons: 0,
  wins: 0, // v21 battles won (story quest "Hold the Line")
  pc: 0,
  ws: 0,
  fc: 0,
  wolf: 0,
  hound: 0,
  warden: 0,
  alpha: 0,
  packs: 0,
  rep: { hub: 0, frost: 0, ember: 0 },
  own: {},
  eq: { robe: "default", hat: "default", cape: "default", trail: "none" },
  friends: [], // v19 [{id, n}] other players you added (Book > Friends); v20 also lv, cls, seen (last time online)
  hp: null, // v21 current HP (null = full)
  lvq: [], // v21 levels whose level-up ceremony hasn't played yet
  lessons: 0, // v21 spell lessons (one per level) to spend at Wren's for a free spell
  fwant: [], // v20 lower-case names you added while they were offline (a friend request goes out when they appear)
  look: { robe: 0, hat: 0, wand: 0 },
  lookOwn: {},
  app: { skin: 0, hair: 0, beard: 0, eyes: 0, ht: 1 }, // v18 character customizer (indices into APPO)
  bless: 0,
  boots: 0,
  focus: 0,
  tome: 0,
  qa: {},
  done: {},
  rdy: {},
  deck: null,
  comp: [],
  seen: null,
  vis: {},
  lore: {},
  spd: 1,
  inv: [],
  gear: {},
  stk: {},
  g0: 0,
  chest: {},
  lit: {},
  runes: {}, // v32 Spell Paths (45-spellpaths.js): spell key -> runes carved ("a"/"b" tier I, then tier II)
  spxs: {}, // v32: kit spells already added to your deck when reached
  spx0: 0, // v32: 1 once this character has seen the Spell Paths rework
  dawn: 0, // v30: 1 once the epilogue (41-dawn.js) has played; the dawn glow then stays on the horizon
  qhold: [], // v30: quests whose special reward is being kept by the giver until the bag has room (QS indexes)
  noqt: 0,
  dun: {},
  tpx: {}, // v13: spells from other schools bought with school points (key -> 1); a reset at Sage Ilsa clears it
  best: {}, // v15 bestiary: foe name -> how many you've defeated
  bestR: {}, // v15 bestiary families already rewarded (index -> 1)
  sk: {}, // v15 foes defeated on each named street (street name -> count), for the street quests
  tut: 0, // v17 Lamplighter's Primer: 0 = not started, 1.. = step reached, 99 = finished/skipped
  mounts: [], // v22 mounts you own (keys into MOUNTS, 21-mounts.js)
  mt: null, // v22 the mount you ride (null = none picked)
  ride: 0, // v22 1 = you were riding when you last saved
  rdv: {}, // v26 zone streets whose end plaza you reached (ZSTR index -> 1), 33-roads.js
  rdb: {}, // v26 road bosses beaten (ZSTR index -> count), 33-roads.js
  rdt: {}, // v26 road wardens you've talked to (ZSTR index -> 1), 33-roads.js
});
let P = DEFP(),
  SLOT = -1;
const SK = (i) => "duskwick3_" + i,
  ld = (i) => {
    try {
      const t = localStorage.getItem(SK(i));
      return t ? Object.assign(DEFP(), JSON.parse(t)) : null;
    } catch (e) {
      return null;
    }
  };
// v21 the currency: glimmers, the little star-shaped flames lamplighters trade in (still P.gold in saves)
const CUR = { n: "glimmers", N: "Glimmers", ic: "✦" };
const sv = () => {
  if (SLOT < 0) return;
  // v21: your HP is kept between sessions (it only refills on a level up, a draught or after a defeat)
  if (g && g.hp > 0 && !P.hpLoad) P.hp = Math.round(g.hp);
  try {
    localStorage.setItem(SK(SLOT), JSON.stringify(P));
  } catch (e) {
    // v46: say so (once) instead of failing quietly: progress and your spot aren't being kept
    if (!sv.warned) {
      sv.warned = 1;
      console.error("save failed", e);
      try {
        toast("Couldn't save: the browser's storage for this page is full or blocked", "#ff8a6a");
      } catch (e2) {}
    }
  }
};
try {
  if (!localStorage.getItem(SK(0)) && localStorage.getItem("duskwick2"))
    localStorage.setItem(SK(0), JSON.stringify(Object.assign(DEFP(), JSON.parse(localStorage.getItem("duskwick2")))));
} catch (e) {}
const mhp = () =>
    Math.round(
      (100 + 10 * (P.lvl - 1) + 20 * P.cloak + (P.cls === "rime" ? 20 : 0) + (gst().hp || 0) + lbst()) *
        (P.role === "tank" ? 1.4 : 1),
    ),
  need = () => Math.round((90 + 70 * (P.lvl - 1) + 12 * (P.lvl - 1) ** 2) * 1.25), // v25b: levels come 25% slower
  // v21: XP for beating a foe of level lv (foes far below you are worth less)
  xpFor = (lv) => Math.round((10 + 8 * Math.max(1, lv)) * (lv < P.lvl - 3 ? 0.4 : lv < P.lvl - 1 ? 0.75 : 1));
// v15 light boosts (Toontown-style): every finished ★ story quest and dungeon quest adds +5 max HP for good, and every
// finished bestiary family adds +10. Worked out from the save, so old characters get theirs straight away.
function lbst() {
  let n = 0;
  for (const i in P.done) if (P.done[i] && QS[i] && (QS[i].m || QS[i].dn != null)) n += 5;
  for (const i in P.bestR || {}) if (P.bestR[i]) n += 10;
  return n;
}
// v15 bestiary families: defeat one of each to finish a family (gold + a light boost)
const BESTF = [
  ["Street Gloom", ["Gloomling", "Dusk Imp", "Moss Brute"], 60],
  ["Frostfen Pack", ["Frost Wolf", "Alpha Frost Wolf"], 90],
  ["Cinder Pack", ["Ember Hound", "Alpha Ember Hound"], 110],
  ["Dungeon Lords", DUN.map((d) => d.boss.nm), 180],
  ["Great Foes", ["Cinder Fiend", "Gloom Warden", "Emberling", "Gloom Knight"], 220],
];
// count a defeated foe in the bestiary (name without the elite prefix or "(boss)")
function bestRec(nm) {
  if (!nm) return;
  nm = String(nm)
    .replace(" (boss)", "")
    .replace(/^(Armored|Vampiric|Frenzied) /, "");
  if (!P.best) P.best = {};
  if (!P.bestR) P.bestR = {};
  const first = !P.best[nm];
  P.best[nm] = (P.best[nm] || 0) + 1;
  if (first && BESTF.some((f) => f[1].includes(nm))) toast("New in your bestiary: " + nm, "#9affc8");
  BESTF.forEach((f, i) => {
    if (P.bestR[i] || !f[1].every((n) => P.best[n])) return;
    P.bestR[i] = 1;
    P.gold += f[2];
    toast("Bestiary family complete: " + f[0] + "!  +" + f[2] + " ✦  +10 max HP", "#ffd34d");
  });
}
// v15: the named street a world point is on (town road sections and the zones' streets), or null
function streetAt(x, z) {
  if (zoneAt(x, z) === "hub") {
    const h = rdHit(x - OX, z - OZ);
    return h && !h.g ? RDSEC[h.i][rdSec(h.R, h.s)] : null;
  }
  return zsName(x, z);
}
// count a won fight's foes toward its street's quest
function streetWin(x, z, n) {
  const sn = streetAt(x, z);
  if (!sn || !n) return;
  if (!P.sk) P.sk = {};
  P.sk[sn] = (P.sk[sn] || 0) + n;
}
// levels follow the story: each chapter of the ★ quest line raises the cap (extra XP waits until then)
const lcap = () => (P.done[7] ? 20 : P.done[3] ? 6 : P.done[13] ? 5 : P.done[10] ? 4 : P.done[2] ? 3 : 2);
// v12: each element is one class, and the class decides the role (CLR). No separate role pick any more.
const CL = {
  pyre: [0xff7a3d, "Pyre"],
  gale: [0xfff06a, "Gale"],
  rime: [0x6fd3ff, "Rimeward"],
  verdant: [0x5ad87a, "Verdant"],
  spirit: [0xb58aff, "Wispcaller"],
};
const CLR = { pyre: "damage", gale: "aoe", rime: "tank", verdant: "healer", spirit: "summoner" };
const CLE = { pyre: "fire", gale: "storm", rime: "ice", verdant: "heal", spirit: "spirit" };
const CD = {
  pyre: "Striker. Fire burns hottest on one foe: single-target spells hit 25% harder.",
  gale: "Evoker. Storms strike every foe at once: every-foe spells hit 25% harder, plus one extra pip each turn.",
  rime: "Bulwark. Ice holds the line: Frost Aegis has +40% HP, and you gain +20 max HP.",
  verdant: "Mender. Life magic mends the party: your heals are 20% stronger and your life spells mend as they strike.",
  spirit: "Wispcaller. Spirits fight at your side: your spirit spells grow stronger with every ally you have.",
};
// keep P.role matching the class (old saves that picked a different role are moved over here)
const syncRole = () => {
  if (P.cls && CLR[P.cls]) P.role = CLR[P.cls];
};
// v11 ROLES: what you do for the team, chosen on top of your school (Pyre / Rimeward / Gale decides the element of your
// spells; the role decides how you fight). Built for parties of up to four, Wizard101 / Toontown style, and fine solo.
const ROLE = {
  damage: {
    n: "Striker",
    tag: "Damage",
    col: "#ff7a5a",
    d: "Single-target attacks hit 25% harder. Role spells: Piercing Ray, Hunter's Focus, Lightbreaker.",
  },
  aoe: {
    n: "Evoker",
    tag: "AOE",
    col: "#ffb040",
    d: "Spells that hit every foe deal 25% more. Role spells: Scattershot, Cascade, Starfall.",
  },
  healer: {
    n: "Mender",
    tag: "Healer",
    col: "#7dff9a",
    d: "Healing is 40% stronger and your heals reach the whole party. Role spells: Renewal, Sanctuary, Rekindle.",
  },
  summoner: {
    n: "Conjurer",
    tag: "Summoner",
    col: "#c38bff",
    d: "Summons cost 1 pip less, have 40% more HP and hit 40% harder. Role spells: Lantern Familiar, Rally, Soulbond.",
  },
  tank: {
    n: "Bulwark",
    tag: "Tank",
    col: "#8ad0ff",
    d: "40% more max HP, take 15% less damage, and foes go for you first. Role spells: Challenge, Bulwark, Thornguard.",
  },
};
const schEl = () => CLE[P.cls] || "fire";
function tint() {
  const st = P.gear && P.gear.staff,
    c =
      st && st.r && st.el
        ? { fire: 0xff7a3d, ice: 0x6fd3ff, storm: 0xfff06a, heal: 0x7dff9a, spirit: 0xb58aff }[st.el]
        : CL[P.cls] && CL[P.cls][0];
  if (c) {
    orb.material.color.setHex(c);
    lamp.color.setHex(c);
    // wand crystals/gems/stars glow in the same colour
    W.traverse((m) => {
      if (!m.userData.glow) return;
      m.material.color.setHex(c);
      m.material.emissive.setHex(c).multiplyScalar(0.55);
    });
  }
}
function toast(m, col) {
  const d = document.createElement("div");
  d.textContent = m;
  if (col)
    d.style.cssText =
      "background:linear-gradient(#2a2016,#17110c);color:" +
      col +
      ";border:1px solid " +
      col +
      ";box-shadow:0 0 12px " +
      col +
      "66";
  $("toasts").appendChild(d);
  setTimeout(() => d.remove(), 3400);
}
const RANKS = [0, 40, 120, 260, 500],
  RN = ["Stranger", "Friend", "Trusted", "Champion", "Legend"],
  ZN = { hub: "Lamplight", frost: "Frostfen", ember: "Cinderwaste", marsh: "Mirewick" };
const rk = (z) => {
    const v = P.rep[z] || 0;
    let r = 0;
    RANKS.forEach((t, i) => {
      if (v >= t) r = i;
    });
    return r;
  },
  disc = (z) => 1 - 0.05 * rk(z);
function addRep(z, n) {
  if (!ZN[z]) z = "hub";
  const b = rk(z);
  P.rep[z] = (P.rep[z] || 0) + n;
  if (rk(z) > b) toast(ZN[z] + " reputation: " + RN[rk(z)] + "!");
}
const COS = [
  { k: "robe_crimson", s: "robe", n: "Crimson robe", col: 0xa83232, c: 120 },
  { k: "robe_verdant", s: "robe", n: "Verdant robe", col: 0x2f8a56, c: 120 },
  { k: "robe_sun", s: "robe", n: "Sunset robe", col: 0xd9822b, c: 160, z: "hub", r: 1 },
  { k: "robe_night", s: "robe", n: "Midnight robe", col: 0x1c1f4a, c: 220, z: "hub", r: 2 },
  { k: "hat_gold", s: "hat", n: "Gilded hat", col: 0xffd27a, c: 100 },
  { k: "hat_rose", s: "hat", n: "Rose hat", col: 0xff9ad0, c: 100 },
  { k: "hat_mint", s: "hat", n: "Frostmint hat", col: 0x9affc8, c: 140, z: "frost", r: 1 },
  { k: "cape_teal", s: "cape", n: "Teal cape", col: 0x2a8a8a, c: 90 },
  { k: "cape_gold", s: "cape", n: "Gold cape", col: 0xc9a02a, c: 130, z: "ember", r: 1 },
  { k: "cape_blaze", s: "cape", n: "Blaze cape", col: 0xd9402a, c: 180, z: "ember", r: 2 },
  { k: "tr_fire", s: "trail", n: "Ember trail", t: "fire", c: 150, z: "ember", r: 1 },
  { k: "tr_ice", s: "trail", n: "Frost trail", t: "ice", c: 150, z: "frost", r: 1 },
  { k: "tr_star", s: "trail", n: "Star trail", t: "storm", c: 300, z: "hub", r: 3 },
];
const DEFC = { robe: 0x35408f, hat: 0x2a3170, cape: 0x7a2a5a };
// your look comes from your gear: robe, hat, charm (cape) and boots take the colour of their element, rarer pieces are brighter;
// Epic and Legendary robes glow faintly, and your lantern burns in your staff's element
const ELK = { fire: 0xb83a2a, ice: 0x2f6ab8, storm: 0xd0a82a, heal: 0x2f9a5a, spirit: 0x6a3ab8 };
const gearCol = (s) => {
  const it = P.gear && P.gear[s];
  if (!it || !it.r) return null;
  const c = new T.Color(ELK[it.el] || 0x8a6a4a);
  c.multiplyScalar(Math.min(1, 0.5 + 0.13 * it.r));
  return c.getHex();
};
// Pip's dyes (paid) override the gear colour per piece
const DYES = [
    0x1c1f4a, 0x35408f, 0x2a8a8a, 0x2f8a56, 0xc9a02a, 0xd9822b, 0xa83232, 0x7a2a5a, 0xff9ad0, 0xe8e0f0, 0x2a2430,
    0x6b4a2b,
  ],
  DYEP = { robe: "Robe", hat: "Hat", cape: "Cape", boots: "Boots" };
// PRV = a colour Pip is holding up against you (preview only, nothing is bought until you press Buy)
let PRV = null,
  MIRR = false,
  TSEL = ["robe"];
const dyeOf = (k) => (PRV && PRV.ps.includes(k) ? PRV.h : P.dye && P.dye[k] != null ? P.dye[k] : null);
function applyCos() {
  const dc = (k) => {
      const d = dyeOf(k);
      return d != null ? d : gearCol(k === "cape" ? "charm" : k);
    },
    mp = { robe: dc("robe"), hat: dc("hat"), cape: dc("cape") },
    rr = P.gear && P.gear.robe ? P.gear.robe.r : 0;
  applyLook();
  wizLook(W, P.app); // v18: skin, hair, beard, eyes and height from the character customizer
  W.traverse((m) => {
    if (!m.isMesh || m.userData.c0 == null) return;
    const c0 = m.userData.c0,
      role = m.userData.role || (c0 === 0x35408f ? "robe" : c0 === 0x7a2a5a ? "cape" : null);
    if (!role) return;
    m.material.color.setHex(mp[role] != null ? mp[role] : DEFC[role]);
    const e = m.material.emissive;
    if (!e) return;
    if (m.userData.em0 == null) m.userData.em0 = e.getHex();
    const dy = dyeOf(role);
    if (dy != null) {
      e.setHex(dy);
      m.material.emissiveIntensity = 0.3;
    } else if (role === "robe") {
      e.setHex(rr >= 3 ? ELK[P.gear.robe.el] || 0 : 0);
      m.material.emissiveIntensity = rr >= 4 ? 0.35 : 0.18;
    } else e.setHex(m.userData.em0);
    m.material.userData.e0 = e.getHex();
  });
  const bc = dc("boots");
  [FL, FR].forEach((f) => {
    f.material.color.setHex(bc != null ? bc : 0x3a2418);
    if (f.material.emissive) {
      const d = dyeOf("boots");
      f.material.emissive.setHex(d != null ? d : 0);
      f.material.emissiveIntensity = d != null ? 0.3 : 1;
    }
  });
  tint();
}
// v13: your look as other players need it (styles, final colours, robe glow, lantern colour). Sent with pubProfile;
// wizPaint (09-party.js) applies it to a clone of the wizard, mirroring applyCos/applyLook/tint above.
function pubLook() {
  const dy = (k) => (P.dye && P.dye[k] != null ? P.dye[k] : null),
    dc = (k) => {
      const d = dy(k);
      return d != null ? d : gearCol(k === "cape" ? "charm" : k);
    },
    rb = P.gear && P.gear.robe,
    st = P.gear && P.gear.staff;
  return {
    lk: { robe: lookBase("robe"), hat: lookBase("hat"), wand: lookBase("wand") }, // v18: the worn gear's styles
    ap: P.app || null, // v18: the character customizer's appearance
    c: { robe: dc("robe"), hat: dc("hat"), cape: dc("cape"), boots: dc("boots") },
    d: { robe: dy("robe"), hat: dy("hat"), cape: dy("cape"), boots: dy("boots") },
    re: rb && rb.r >= 3 ? ELK[rb.el] || 0 : 0,
    ri: rb && rb.r >= 4 ? 0.35 : 0.18,
    gl:
      st && st.r && st.el
        ? { fire: 0xff7a3d, ice: 0x6fd3ff, storm: 0xfff06a, heal: 0x7dff9a, spirit: 0xb58aff }[st.el]
        : (CL[P.cls] || [0xffc27a])[0],
    mt: typeof mountPub === "function" ? mountPub() : 0, // v22: the mount you're riding right now (21-mounts.js)
  };
}
// ---------- story & quests ----------
// LORE[i] is read at lore stone i (positions in world())
const LORE = [
  [
    "The First Lamp",
    "When the sun slipped behind the Gloomspire and never rose again, Duskwick learned to live by lamplight. The first lamp was lit on this spot by Oona's grandmother, from a single coal of the Dawn Ember. Every lamp in town is a cutting of that flame. Keep them burning and the gloom keeps its distance.",
    "by Lamplight Square",
  ],
  [
    "Sunward Street",
    "Gloomway was once Sunward Street, the road pilgrims walked to the Sun Tower. The gloomlings did not come from the tower. They grew from the shadows people left behind when the lights went out: fears, grudges, forgotten things. Light a lamp and they shrink. Forget one and they grow.",
    "at the end of Gloomway Street",
  ],
  [
    "The Wisps",
    "The wisps of Wispwood are the spirits of lamps that burned out with honor. They drift east toward Frostfen, where the last warm light once lived. Follow them far enough, travelers say, and you will hear old hearth-songs under the ice.",
    "in Wispwood Glade",
  ],
  [
    "The Hungry Fire",
    "Before the Long Dusk, Cinder Hollow was a charcoal-burners' camp. When the sun failed, the burners tried to make a new one by feeding the Dawn Ember everything they had. The fire grew hungry. Its hunger walked out of the hollow on two legs and called itself the Cinder Fiend.",
    "in Cinder Hollow",
  ],
  [
    "What the Ice Remembers",
    "Frostfen was a hot-spring village, warm all year. When the Dawn Ember was stolen its warmth went with it, and the springs froze in a single night. The wolves were the village's guardians. The cold did not make them cruel. It made them forget whose they were.",
    "in the frozen ruins of Frostfen",
  ],
  [
    "Ash and Memory",
    "Korr's grandfather forged the Ember's cradle. He swore the Fiend never took all of it: it took the half that burns. The half that lights was carried up the Gloomspire by its keeper, the Warden, who vowed no hand would misuse it again. The vow hardened around him like stone.",
    "among the bones of the Cinderwaste",
  ],
  [
    "The Last Lamp",
    "Here the Warden kept the light so long he forgot it was meant to be shared. With him at rest, the Ember's light is free again. It is small, no bigger than a lamp flame, but every lamp in Duskwick was once that small. Carry it down. The dusk is long, but it is not forever.",
    "atop the Gloomspire",
  ],
];
// quests: req = quests that must be done first, lv = level needed, m = main story; indexes 0-7 keep old saves working
const QS = [
  {
    n: "Clear the street",
    d: "Defeat 3 foes",
    st: () => P.kills,
    k: 3,
    g: 40,
    x: 40,
    z: "hub",
    m: 1,
    s: "The lamps on Gloomway are guttering and gloomlings slip out of every shadow. Thin their numbers, lamplighter.",
  },
  {
    n: "Spark practice",
    d: "Cast 6 spells",
    st: () => P.casts,
    k: 6,
    g: 35,
    x: 30,
    z: "hub",
    m: 1,
    req: [8],
    s: "A steady hand makes a steady light. Practice your spellwork on whatever crawls out of the dark.",
  },
  {
    // v21: was "Summon 4 creatures", which only a Wispcaller can do now that summons are earned later
    n: "Hold the Line",
    d: "Win 4 battles",
    st: () => P.wins || 0,
    k: 4,
    g: 50,
    x: 50,
    z: "hub",
    m: 1,
    req: [1],
    s: "One fight is luck. Four is a lamplighter. Win four battles and the gates are yours.",
  },
  {
    n: "Cinder hunt",
    d: "Defeat the Cinder Fiend at the end of Gloomway",
    st: () => P.boss,
    k: 1,
    g: 120,
    x: 150,
    z: "hub",
    m: 1,
    req: [13],
    lv: 4,
    s: "Now you know what the Fiend is: hunger wearing fire. It waits at the end of Gloomway with its Emberlings. End it.",
  },
  {
    n: "Rising light",
    d: "Reach level 5",
    st: () => P.lvl,
    k: 5,
    g: 150,
    x: 0,
    abs: 1,
    z: "hub",
    m: 1,
    req: [3],
    s: "The Gloomspire seal answers only to a strong light. Grow stronger.",
  },
  {
    n: "Wolf cull",
    d: "Defeat 4 Frost Wolves",
    st: () => P.wolf || 0,
    k: 4,
    g: 90,
    x: 90,
    z: "frost",
    m: 1,
    req: [10],
    s: "The wolves have forgotten us. Calm them, and their spirits may run beside you.",
  },
  {
    n: "Ember hunt",
    d: "Defeat 3 Ember Hounds",
    st: () => P.hound || 0,
    k: 3,
    g: 110,
    x: 110,
    z: "ember",
    m: 1,
    req: [12],
    s: "The hounds are sparks of the Fiend's hunger. Put them out, and a drake may answer your call.",
  },
  {
    n: "Gloomspire",
    d: "Defeat the Gloom Warden atop the tower",
    st: () => P.warden || 0,
    k: 1,
    g: 300,
    x: 300,
    z: "hub",
    m: 1,
    req: [4],
    s: "Climb the Gloomspire. The Warden guards what is left of the Dawn Ember, and his knights guard him.",
  },
  {
    n: "The First Lamp",
    d: "Read the lore stone by Lamplight Square",
    st: () => (P.lore[0] ? 1 : 0),
    k: 1,
    abs: 1,
    g: 20,
    x: 30,
    z: "hub",
    m: 1,
    req: [0],
    s: "Before you go further, read the old stone by the square. Know what you are protecting.",
  },
  {
    n: "Into the Wispwood",
    d: "Walk the Hollow Road east to Wispwood Glade",
    st: () => (P.vis.ge ? 1 : 0),
    k: 1,
    abs: 1,
    g: 40,
    x: 60,
    z: "hub",
    m: 1,
    req: [2],
    lv: 2,
    s: "The road east leads toward Frostfen. Scout it as far as the glade.",
  },
  {
    n: "The Frozen Gate",
    d: "Clear the roots (Mossy Catacombs), then pass the Frostfen gate",
    st: () => (P.vis.frost ? 1 : 0),
    k: 1,
    abs: 1,
    g: 50,
    x: 60,
    z: "hub",
    m: 1,
    req: [9],
    lv: 3,
    s: "Frostfen has gone silent, and roots from the catacombs under Wispwood Glade choke its gate. Kill what nests below, then pass the gate and find out why.",
  },
  {
    n: "What the Ice Remembers",
    d: "Read the lore stone in the frozen ruins",
    st: () => (P.lore[4] ? 1 : 0),
    k: 1,
    abs: 1,
    g: 40,
    x: 60,
    z: "frost",
    m: 1,
    req: [5],
    s: "The ruins to the south-east remember the warm days. Read what they say.",
  },
  {
    n: "The Ashen Trail",
    d: "Break the ice (Rimefang Den), then reach the Cinderwaste",
    st: () => (P.vis.ember ? 1 : 0),
    k: 1,
    abs: 1,
    g: 60,
    x: 70,
    z: "hub",
    m: 1,
    req: [11],
    lv: 4,
    s: "Frostfen lost its warmth to fire. A wall of ice fed by the Rimefang Matriarch seals the Ashen Trail. Bring her down, then follow the trail west to where that fire went.",
  },
  {
    n: "Ash and Memory",
    d: "Read the lore stone in the Cinderwaste",
    st: () => (P.lore[5] ? 1 : 0),
    k: 1,
    abs: 1,
    g: 50,
    x: 70,
    z: "ember",
    m: 1,
    req: [6],
    s: "Korr says the bones south of the forge hide a stone with the Ember's true story.",
  },
  {
    n: "The Last Lamp",
    d: "Read the stone atop the Gloomspire",
    st: () => (P.lore[6] ? 1 : 0),
    k: 1,
    abs: 1,
    g: 250,
    x: 200,
    z: "hub",
    m: 1,
    req: [7],
    s: "The Warden is at rest. Read the last stone and bring the light home.",
  },
  {
    n: "Hollow whispers",
    d: "Read the lore stones in both glades (the west glade opens when the Ashen Trail's ice wall falls)",
    st: () => (P.lore[2] ? 1 : 0) + (P.lore[3] ? 1 : 0),
    k: 2,
    abs: 1,
    g: 60,
    x: 60,
    z: "hub",
    req: [9],
    s: "The glades east and west both keep a stone. The west one lies past the Ashen Trail's ice wall, so it may have to wait. The old stories matter.",
  },
  {
    n: "Street sweeper",
    d: "Defeat 12 foes",
    st: () => P.kills,
    k: 12,
    g: 70,
    x: 70,
    z: "hub",
    req: [0],
    lv: 2,
    s: "Keep Gloomway clear and the lamps stay lit.",
  },
  {
    n: "Alpha hunt",
    d: "Defeat 2 alpha beasts",
    st: () => P.alpha || 0,
    k: 2,
    g: 140,
    x: 140,
    z: "frost",
    req: [5],
    lv: 4,
    s: "Pack leaders are bigger and meaner. Bring two of them down.",
  },
  {
    n: "Pack breaker",
    d: "Win 3 battles against 3 or more foes",
    st: () => P.packs || 0,
    k: 3,
    g: 160,
    x: 160,
    z: "ember",
    req: [6],
    lv: 5,
    s: "Out here they hunt in packs. Win against the odds.",
  },
  {
    n: "The Mossy Catacombs",
    d: "Clear the dungeon under Wispwood Glade",
    st: () => (P.dun && P.dun[0] ? 1 : 0),
    dn: 0, // v14: finishing this quest any way (incl. Dev skips) counts the dungeon as cleared
    k: 1,
    abs: 1,
    g: 120,
    x: 140,
    z: "hub",
    req: [9],
    lv: 2,
    s: "Something big and mossy has nested in the old catacombs. The swirling door is at the north edge of Wispwood Glade.",
  },
  {
    n: "Rimefang Den",
    d: "Clear the den in north-west Frostfen",
    st: () => (P.dun && P.dun[1] ? 1 : 0),
    dn: 1,
    k: 1,
    abs: 1,
    g: 200,
    x: 220,
    z: "frost",
    req: [10],
    lv: 4,
    s: "The wolf den hides a cave that runs deep under the ice. The pack matriarch rules it.",
  },
  {
    n: "Kiln Depths",
    d: "Clear the depths under the Cinderwaste",
    st: () => (P.dun && P.dun[2] ? 1 : 0),
    dn: 2,
    k: 1,
    abs: 1,
    g: 260,
    x: 280,
    z: "ember",
    req: [12],
    lv: 5,
    s: "An old kiln door in the north-east of the waste leads down into the heat. Something is still feeding the fires.",
  },
  // v11 role quests (rl = only for that role; the second of each pair teaches the role's signature spell)
  {
    n: "Striker: Sharp Eye",
    d: "Land 12 Perfect timed hits",
    st: () => P.perf || 0,
    k: 12,
    g: 80,
    x: 90,
    z: "hub",
    rl: "damage",
    lv: 2,
    s: "A Striker wins fights before they start. Time your casts to the ring until Perfect comes easy.",
  },
  {
    n: "Striker: Giant-slayer",
    d: "Deal 120 or more damage in a single hit",
    st: () => Math.min(120, P.bigHit || 0),
    k: 120,
    abs: 1,
    g: 180,
    x: 200,
    z: "hub",
    rl: "damage",
    req: [22],
    lv: 5,
    s: "Big foes fall to one perfect blow. Land one, and I'll teach you Lightbreaker.",
  },
  {
    n: "Evoker: Crowd Control",
    d: "Hit 3 or more foes with one spell, 8 times",
    st: () => P.multi || 0,
    k: 8,
    g: 80,
    x: 90,
    z: "hub",
    rl: "aoe",
    lv: 2,
    s: "An Evoker answers a crowd with a storm. Catch three of them at once, again and again.",
  },
  {
    n: "Evoker: Wildfire",
    d: "Defeat 3 foes with a single spell, twice",
    st: () => P.wild || 0,
    k: 2,
    g: 180,
    x: 200,
    z: "hub",
    rl: "aoe",
    req: [24],
    lv: 5,
    s: "Clear a whole pack in one cast. Do it twice and Starfall is yours.",
  },
  {
    n: "Mender: Field Medic",
    d: "Restore 400 HP with healing",
    st: () => P.healed || 0,
    k: 400,
    g: 80,
    x: 90,
    z: "hub",
    rl: "healer",
    lv: 2,
    s: "A Mender keeps the lamps of other people burning. Heal, and keep healing.",
  },
  {
    n: "Mender: Steady Hands",
    d: "Win 4 battles without dropping below half HP",
    st: () => P.flaw || 0,
    k: 4,
    g: 180,
    x: 200,
    z: "hub",
    rl: "healer",
    req: [26],
    lv: 5,
    s: "The best healing is the hurt that never lands. Stay above half, and learn Rekindle.",
  },
  {
    n: "Conjurer: Menagerie",
    d: "Summon 15 creatures",
    st: () => P.summons || 0,
    k: 15,
    g: 80,
    x: 90,
    z: "hub",
    rl: "summoner",
    lv: 2,
    s: "A Conjurer never fights alone. Call your creatures into the light.",
  },
  {
    n: "Conjurer: Full House",
    d: "Have three allies on the field at once, 5 times",
    st: () => P.fullh || 0,
    k: 5,
    g: 180,
    x: 200,
    z: "hub",
    rl: "summoner",
    req: [28],
    lv: 5,
    s: "Fill every pad beside you. Five times, and I'll show you Soulbond.",
  },
  {
    n: "Bulwark: Iron Will",
    d: "Block or parry 15 attacks",
    st: () => P.blocks || 0,
    k: 15,
    g: 80,
    x: 90,
    z: "hub",
    rl: "tank",
    lv: 2,
    s: "A Bulwark stands in front. Meet the blows: block them, parry them.",
  },
  {
    n: "Bulwark: Shield Wall",
    d: "Soak up 300 damage with shields",
    st: () => P.absorbed || 0,
    k: 300,
    g: 180,
    x: 200,
    z: "hub",
    rl: "tank",
    req: [30],
    lv: 5,
    s: "Let your shields drink the hurt meant for others. Soak enough and Thornguard is yours.",
  },
  // v15 street quests (32+): clear one named street. Only foes beaten on that street count (P.sk); taken from the
  // street's giver (Oona for the town roads, each zone's quest board for its streets)
  ...[
    [
      "Hollow Road",
      "hub",
      2,
      [2],
      5,
      60,
      "Gloomlings lurk past the Hollow Road gate. Clear the first stretch for the carts.",
    ],
    [
      "Millstream Way",
      "hub",
      2,
      [2],
      6,
      75,
      "The miller can't reach his own mill. Thin out whatever's prowling Millstream Way.",
    ],
    [
      "Pumpkin Patch Lane",
      "hub",
      3,
      [2],
      6,
      90,
      "The pumpkin farmer is besieged. Sweep Pumpkin Patch Lane before the harvest rots.",
    ],
    [
      "Ashen Trail",
      "hub",
      4,
      [12],
      6,
      110,
      "Now the ice is gone, the Ashen Trail needs walking. Clear its first stretch.",
    ],
    [
      "Kiln Row",
      "hub",
      4,
      [12],
      7,
      125,
      "The charcoal kilns went cold when the gloom moved in. Drive it out of Kiln Row.",
    ],
    ["Watchtower Rise", "hub", 5, [12], 7, 140, "Light the way to the old watchtower: clear Watchtower Rise."],
    [
      "Sled Camp Lane",
      "frost",
      3,
      null,
      5,
      100,
      "The sled-hunters fled their camp. Clear Sled Camp Lane so they can come back.",
    ],
    [
      "Rimefang Row",
      "frost",
      4,
      null,
      6,
      120,
      "The trapper hasn't come down Rimefang Row in days. Clear the way to his cabin.",
    ],
    ["Frozen Lake Way", "frost", 4, null, 6, 120, "Ice fishers need the lake road. Clear Frozen Lake Way."],
    [
      "Rimestone Way",
      "frost",
      4,
      null,
      7,
      140,
      "Something circles the rime-stones at night. Clear Rimestone Way to the stones.",
    ],
    ["Ember Steps", "ember", 4, null, 6, 140, "Korr's ore comes down the Ember Steps. Keep them clear."],
    [
      "Crater Climb",
      "ember",
      5,
      null,
      7,
      160,
      "Hounds den along the Crater Climb. Thin the pack all the way to the rim.",
    ],
    [
      "Obsidian Gate Road",
      "ember",
      5,
      null,
      7,
      170,
      "The road to the obsidian gate is overrun. Clear it, stone to stone.",
    ],
    ["Lantern Bog", "marsh", 5, null, 7, 180, "The bog lanterns keep going out. Clear Lantern Bog so they can be lit."],
    ["Shrine Walk", "marsh", 5, null, 7, 180, "Pilgrims can't reach the sunken shrine. Clear Shrine Walk."],
    ["Drowned Row", "marsh", 5, null, 8, 200, "The drowned ruins stir. Clear Drowned Row to the old stones."],
    [
      "Witchway",
      "marsh",
      6,
      null,
      8,
      220,
      "The bog-witch wants a word, if anyone can reach her hut. Clear the Witchway.",
    ],
  ].map(([sn, z, lv, req, k, g, s]) => ({
    n: "Clear " + sn,
    d: "Defeat " + k + " foes on " + sn,
    st: () => (P.sk && P.sk[sn]) || 0,
    k,
    g,
    x: g,
    z,
    lv,
    req: req || undefined,
    sk: sn,
    s,
  })),
];
// v21 quests, appended (saves keep progress by index, so these only ever go on the end). School trials (cl = only
// that school sees it) each hand over a card (card: sets that spell's q, so it's earned here, not at a level up).
const QS21 = [
  {
    n: "Pyre Trial: Perfect Flame",
    d: "Land 15 Perfect timed hits",
    st: () => P.perf || 0,
    k: 15,
    g: 160,
    x: 220,
    z: "hub",
    cl: "pyre",
    lv: 8,
    card: "ashstorm",
    s: "A Pyre's fire answers to timing. Strike true fifteen times and I'll teach you to call down an Ashstorm.",
  },
  {
    n: "Gale Trial: Many Strikes",
    d: "Hit three or more foes with one spell 8 times",
    st: () => P.multi || 0,
    k: 8,
    g: 160,
    x: 220,
    z: "hub",
    cl: "gale",
    lv: 8,
    card: "squall",
    s: "Lightning never picks just one. Catch a crowd in your storm eight times, and the Squall is yours.",
  },
  {
    n: "Rimeward Trial: Unmoved",
    d: "Block or parry 20 attacks",
    st: () => P.blocks || 0,
    k: 20,
    g: 200,
    x: 260,
    z: "frost",
    cl: "rime",
    lv: 10,
    card: "hail",
    s: "Ice holds. Meet twenty blows without giving ground and the Hailstorm will answer you.",
  },
  {
    n: "Verdant Trial: Deep Roots",
    d: "Win 6 battles without falling below half health",
    st: () => P.flaw || 0,
    k: 6,
    g: 180,
    x: 240,
    z: "hub",
    cl: "verdant",
    lv: 9,
    card: "overgrow",
    s: "A garden that wilts can't feed anyone. Win six fights standing tall and learn Overgrowth.",
  },
  {
    n: "Wispcaller Trial: The Choir",
    d: "Summon 20 creatures",
    st: () => P.summons || 0,
    k: 20,
    g: 180,
    x: 240,
    z: "hub",
    cl: "spirit",
    lv: 9,
    card: "requiem",
    s: "The dead sing louder in company. Call twenty spirits to your side and I'll teach you the Requiem.",
  },
  {
    n: "Lamplighter's Round",
    d: "Defeat 15 foes",
    st: () => P.kills || 0,
    k: 15,
    g: 60,
    x: 70,
    z: "hub",
    lv: 2,
    s: "Every gloomling you send back to the dark is one less at somebody's door. Fifteen should do for tonight.",
  },
  {
    n: "Pack Breaker",
    d: "Win 5 battles against three or more foes",
    st: () => P.packs || 0,
    k: 5,
    g: 110,
    x: 130,
    z: "hub",
    lv: 3,
    s: "They've started moving in packs. Show them that doesn't help.",
  },
  {
    n: "Wolf Warden",
    d: "Defeat 12 wolves",
    st: () => P.wolf || 0,
    k: 12,
    g: 120,
    x: 150,
    z: "frost",
    lv: 4,
    wh: ["frost", 600, -400],
    s: "The rimefang packs are bolder every night. Thin them before they reach the sled camps.",
  },
  {
    n: "Hound Hunter",
    d: "Defeat 12 cinder hounds",
    st: () => P.hound || 0,
    k: 12,
    g: 140,
    x: 170,
    z: "ember",
    lv: 5,
    wh: ["ember", -600, -400],
    s: "Korr's miners won't go out while the hounds roam. Bring down a dozen.",
  },
  {
    n: "Deep Delver",
    d: "Clear dungeons 3 times",
    st: () => Object.values(P.dun || {}).reduce((a, b) => a + (+b || 0), 0),
    k: 3,
    g: 200,
    x: 240,
    z: "hub",
    lv: 5,
    s: "The deep places refill as fast as we empty them. Clear them, again and again.",
  },
  {
    n: "A Page from Wren",
    d: "Learn a spell at Wren the spellwright's",
    st: () => P.wrenL || 0,
    k: 1,
    g: 30,
    x: 40,
    z: "hub",
    lv: 2,
    wren: 1, // given to you with your first spell lesson (19-levelup.js)
    wh: () => {
      const n = NPCS.find((q) => q.kind === "w");
      return n ? ["hub", n.x, n.z] : null;
    },
    s: "You've grown, and growing earns a lesson. Take it to Wren the spellwright: he'll teach you a page of your school.",
  },
];
QS21.forEach((q) => {
  const i = QS.push(q) - 1;
  if (q.card && SPL[q.card]) SPL[q.card].q = i;
});
// v15 story chapters (Book > Quests): the ★ quests in story order, grouped by the part of the world they take you to
const STCH = [
  ["Lamplight Square", "Lv 1-2", [0, 8, 1, 2]],
  ["The Hollow Road", "Lv 2-3", [9, 10]],
  ["Frostfen", "Lv 3-4", [5, 11, 12]],
  ["The Cinderwaste", "Lv 4-5", [6, 13, 3]],
  ["The Gloomspire", "Lv 5+", [4, 7, 14]],
];
// story dialogue: what the giver says when handing out each IMPORTANT quest, and when you bring it back
const STORY = {
  0: [
    "So you're the new lamplighter. Good. Duskwick needs every one of you.",
    "The lamps on Gloomway are guttering, and gloomlings slip out of every shadow.",
    "Head through the gate north of the square. Thin their numbers, then come back to me.",
  ],
  8: [
    "Before you go further, there's something you should see.",
    "My grandmother lit the very first lamp beside this square, from a single coal of the Dawn Ember. The old stone there remembers it.",
    "Read it. Know what you're protecting.",
  ],
  1: [
    "Your light flickers when you cast. That's normal, at first.",
    "Practise on whatever crawls out of the dark. Six good casts.",
    "A steady hand makes a steady light.",
  ],
  2: [
    "One lucky fight doesn't make a lamplighter.",
    "Go out and win four battles. Any foes, anywhere: show me you can hold the line.",
    "Do this and I'll have the gates opened: the old portcullis on Gloomway, and the Hollow Road gate east.",
  ],
  9: [
    "The Hollow Road runs east toward Frostfen. We've had no word from there in weeks.",
    "Scout it as far as Wispwood Glade. There's a safe camp by the gate.",
    "Then come back and tell me what you saw.",
  ],
  10: [
    "Wisps, and a gate choked with roots. Frostfen went silent the night the ice came.",
    "Those roots grow up from the old catacombs under the glade. Something big nests down there. Kill it and the gate is yours.",
    "Then pass it, and find out what happened to them.",
  ],
  5: [
    "To whoever reads this: the wolves were our guardians once. The cold made them forget whose they were.",
    "Calm four of them. Their spirits may run beside you afterwards.",
    "- Brenna, Frostfen",
  ],
  11: [
    "The old ruins south-east of the village remember the warm days.",
    "There's a lore stone among the broken columns. Read it, and you'll understand what was taken from us.",
    "- Brenna",
  ],
  12: [
    "Frostfen lost its warmth to fire. That fire had to go somewhere: west, down the Ashen Trail.",
    "But the Matriarch's winter froze the trail shut behind a wall of ice. Her den is in the north-west of the village.",
    "Bring her down and the ice will break. Then follow the trail into the Cinderwaste.",
  ],
  6: [
    "Korr here. Hounds are sparks off the Fiend's hunger. Put out three.",
    "Ice works. Fire just feeds them.",
    "- Korr, at the forge",
  ],
  13: [
    "My grandfather forged the Ember's cradle. He swore the Fiend never took all of it.",
    "The bones south of my forge hide a stone with the true story. Read it.",
    "Then you'll know what you're really fighting. - Korr",
  ],
  3: [
    "You know what the Fiend is now: hunger wearing fire. It waits at the end of Gloomway.",
    "The seal on the last stretch of the street is broken. Its Emberlings burn, so bring ice.",
    "End it, lamplighter.",
  ],
  4: ["The Gloomspire seal answers only to a strong light.", "Grow stronger. Reach level 5.", "Then we climb."],
  7: [
    "The Warden guards what's left of the Dawn Ember at the top of the Gloomspire.",
    "His knights mend him. Strike hard, and don't let them stall you.",
    "Bring the light home.",
  ],
  14: ["One stone remains, atop the Gloomspire.", "Read it. Then bring the light home, where it belongs."],
};
const SDONE = {
  0: "Three fewer shadows on Gloomway. You'll do.",
  8: "Now you know. Every lamp in town is a cutting of that first flame.",
  1: "Steadier already. Good.",
  2: "Done. The gates on the Hollow Road and the far street are opening. Go carefully.",
  9: "A frozen gate past the glade? Then Frostfen is in trouble.",
  10: "You made it through, and the village still stands. Thank the lamps.",
  5: "(Scratched under the note:) The howling is quieter. Thank you.",
  11: "(Under the note:) Now you know. The ice remembers. Help us.",
  12: "The Cinderwaste... so the old stories were true.",
  6: "(Korr's scrawl:) Three fewer sparks. A drake may answer your call now.",
  13: "(Korr:) Now you know. Hunger wearing fire. Tell Oona.",
  3: "The Fiend is gone, and the Gloomspire's chains with it. Duskwick breathes easier tonight.",
  4: "Your light is strong enough now. The seal will answer.",
  7: "You did it. The Warden rests at last.",
  14: "The dusk is long, but it isn't forever. Thank you, lamplighter.",
};
let DLGI = 0;
const qOpen = (i) => {
  const q = QS[i];
  if (q.rl && q.rl !== P.role) return false;
  if (q.cl && q.cl !== P.cls) return false; // v21 school trials
  return !P.done[i] && (q.req || []).every((r) => P.done[r]) && P.lvl >= (q.lv || 1);
};
const prog = (i) => (P.qa[i] == null ? 0 : Math.min(QS[i].k, QS[i].st() - (QS[i].abs ? 0 : P.qa[i])));
// v24 quest givers. Every quest has exactly one NPC who hands it out and takes it back (no Book turn-ins).
// q.z stays the quest's zone (Book label, reputation); qGv(q) is its giver key:
//   hub = Oona (urgent work only: story ★ quests and the story dungeon), lane = Tamsin on Market Lane (town side
//   quests, role quests, school trials), frost = Brenna, ember = Vesna, marsh = Old Maud (each zone's side + story
//   quests), wren = Wren (his own "A Page from Wren"). A quest can override with gv:. The NPCs are js/25-questgivers.js.
const QGN = {
  hub: ["Oona", "Oona, keeper of the lamps"],
  lane: ["Tamsin", "Tamsin, the Lamplighters' Guild"],
  frost: ["Brenna", "Brenna, Frostfen's headwoman"],
  ember: ["Vesna", "Vesna, Korr's daughter"],
  marsh: ["Old Maud", "Old Maud, the bog-warden"],
  wren: ["Wren", "Wren the spellwright"],
};
const qGv = (q) => q.gv || (q.wren ? "wren" : q.z !== "hub" ? q.z : q.m || q.dn != null ? "hub" : "lane"),
  npcGv = (n) => n.qg || (n.kind === "q" ? n.id : n.kind === "w" ? "wren" : ""),
  qGiver = (z) => (QGN[z] || QGN.hub)[0];
// v24 special rewards for multi-step quests (story chapter finales, two-objective quests, long hunts and dungeon
// runs): a named gear piece made at hand-in, scaled to your level. If the bag is full the giver keeps it for you
// (the quest stays ready) instead of anything being sold.
const QSR = {
  2: { n: "Oona's Lantern Rod", sl: "staff", el: "fire", r: 3, d: "end of chapter 1" },
  15: { n: "Wispwood Circlet", sl: "hat", el: "spirit", r: 3, d: "both glade stones" },
  12: { n: "Matriarch's Fang", sl: "charm", el: "ice", r: 3, d: "end of the Frostfen chapter" },
  3: { n: "Fiendbane Signet", sl: "ring", el: "fire", r: 3, d: "end of the Cinderwaste chapter" },
  14: { n: "Lantern of the Dawn", sl: "staff", el: "heal", r: 4, d: "the end of the story", st: { pip: 1 } },
  48: { n: "Bog-witch's Treads", sl: "boots", el: "spirit", r: 3, d: "Mirewick's last street" },
  55: { n: "Packbreaker Mantle", sl: "robe", el: "storm", r: 3, d: "five pack fights" },
  56: { n: "Rimefang Pelt", sl: "robe", el: "ice", r: 3, d: "twelve wolves" },
  57: { n: "Houndmaster's Band", sl: "ring", el: "fire", r: 3, d: "twelve hounds" },
  58: { n: "Delver's Lamp-charm", sl: "charm", el: "heal", r: 3, d: "three dungeon runs", st: { pip: 1 } },
};
const qsrTxt = (i) => {
  const s = QSR[i];
  return s ? s.n + " (" + ["Common", "Uncommon", "Rare", "Epic", "Legendary"][s.r] + " " + s.sl + ")" : "";
};
function qsrItem(i) {
  const s = QSR[i],
    it = genItem(s.sl, Math.max(P.lvl, QS[i].lv || 1), s.r, s.el); // genItem is in 07, called at hand-in time
  it.n = s.n;
  it.uq = 1;
  delete it.lk;
  delete it.lk0;
  for (const k in s.st || {}) it.st[k] = (it.st[k] || 0) + s.st[k];
  it.v = Math.round(it.v * 1.5);
  return it;
}
const qBagFull = (i) => !!QSR[i] && (P.inv || []).length >= INVMAX;
// hand a ready quest back to its giver (the only way to finish one, besides Dev skips). v30: a full bag no longer
// blocks it (that could stall the ★ story): the quest completes and the giver keeps the special reward in P.qhold,
// which qhGive() hands over as soon as there's room.
function qturn(i) {
  if (P.done[i]) return false;
  const full = qBagFull(i),
    it = QSR[i] && !full && qsrItem(i);
  qdone(i);
  if (it) {
    giveItem(it, 1);
    toast("Special reward: " + it.n + " (" + RAR[it.r].n + ")", RAR[it.r].c);
    sv();
  } else if (full) {
    (P.qhold = P.qhold || []).push(i);
    toast(
      "Your bag is full: " + qGiver(qGv(QS[i])) + " will keep " + QSR[i].n + " for you. Make room and it's yours.",
      "#ffb040",
    );
    sv();
  }
  return true;
}
function qhGive() {
  if (!P.qhold || !P.qhold.length || (P.inv || []).length >= INVMAX) return;
  const i = P.qhold.shift(),
    it = qsrItem(i);
  giveItem(it, 1);
  toast("Kept for you: " + it.n + " (" + RAR[it.r].n + ")", RAR[it.r].c);
  sv();
}
function qchk() {
  qhGive();
  QS.forEach((q, i) => {
    if (P.qa[i] != null && !P.done[i] && !P.rdy[i] && prog(i) >= q.k) {
      P.rdy[i] = 1;
      toast('Quest ready: "' + q.n + '" - return to ' + qGiver(qGv(q)), q.m ? "#ffd34d" : null);
      sv();
    }
  });
}
function qacc(i) {
  const q = QS[i];
  P.qa[i] = q.abs ? 0 : q.st();
  sv();
  qchk();
}
function qdone(i) {
  const q = QS[i];
  P.done[i] = 1;
  // v14: a dungeon quest finished (also by a Dev skip) marks its dungeon cleared, so the gates tied to it open
  if (q.dn != null) {
    P.dun = P.dun || {};
    if (!P.dun[q.dn]) P.dun[q.dn] = 1;
  }
  // turning in the tracked quest: with auto-track off nothing new is tracked until you pick one (Track in the Book)
  if (P.trk === i) P.trk = P.atrk ? null : -1;
  P.gold += q.g;
  P.xp += q.x;
  addRep(q.z, 15);
  toast("Quest complete: " + q.n);
  if (q.m || q.dn != null) toast("Your light grows: +5 max HP", "#ffd34d");
  if (tpQ(q)) toast("+1 school point: spend it at Wren's on a card from any school", "#c9b8ff");
  lvup();
  unl();
  qchk();
  sv();
  ui();
  const nx = qMain();
  if (q.m && nx >= 0 && P.qa[nx] == null)
    toast("Important: " + qGiver(qGv(QS[nx])) + " has your next story quest (" + QS[nx].n + ")", "#ffd34d");
}
// v14 Dev skips: the story runs through gates that need a cleared dungeon, so skipping the story also finishes every
// dungeon quest that is open by then (which marks the dungeon cleared). Returns how many it finished.
function dunQSkip() {
  let n = 0;
  QS.forEach((q, i) => {
    if (q.dn == null || P.done[i] || !(q.req || []).every((r) => P.done[r])) return;
    if (P.qa[i] == null) P.qa[i] = 0;
    qdone(i);
    n++;
  });
  return n;
}
// next story step (for hints and the Book)
const qMain = () => {
  const a = QS.findIndex((q, i) => q.m && P.qa[i] != null && !P.done[i]);
  if (a >= 0) return a;
  return QS.findIndex((q, i) => q.m && !P.done[i] && (q.req || []).every((r) => P.done[r]));
};
// spells and companions unlock by level or by quest
const splOK = (k) => {
    const s = SPL[k];
    return P.lvl >= (s.lv || 1) && (s.q == null || P.done[s.q]);
  },
  compOK = (k) => {
    const a = ALLY[k];
    return P.lvl >= (a.lv || 1) && (a.q == null || P.done[a.q]);
  };
const needTxt = (o) => (o.q != null ? "Quest: " + QS[o.q].n : "Reach level " + o.lv),
  // v25b: deck size comes from the worn deck item (deckSlots, 30-cards-deck.js)
  dmax = () => (typeof deckSlots === "function" ? deckSlots() : Math.min(10, 5 + Math.floor(P.lvl / 2)));
// your class decides which spells you can learn; you own the starters for your class and whatever you buy from Wren.
// v13: cards from other schools can be bought with school points (P.tpx) and stay usable whatever your class.
const clsOK = (k) => {
    const s = SPL[k];
    if (!s) return false;
    if (s.rl) return s.rl === P.role;
    const c = s.cl;
    return !!c && (c === "all" || c === P.cls || !!(P.tpx && P.tpx[k]));
  },
  has = (k) => !!(P.lib && P.lib[k]),
  useOK = (k) => has(k) && clsOK(k) && splOK(k);
const splPrice = (k) => {
  const s = SPL[k];
  return Math.round((30 + 28 * (s.lv || 5) + 12 * s.c) * disc("hub"));
};
// v13 school points: one for every ★ story quest and every class (role) quest finished. Worked out from P.done, so
// old saves get theirs and a reset simply refunds them. Cards from deep levels (7+) cost two.
const tpQ = (q) => !!(q.m || q.rl),
  tpEarned = () => QS.reduce((n, q, i) => n + (P.done[i] && tpQ(q) ? 1 : 0), 0),
  tpCost = (k) => ((SPL[k].lv || 5) >= 7 ? 2 : 1),
  tpSpent = () => Object.keys(P.tpx || {}).reduce((n, k) => n + (SPL[k] ? tpCost(k) : 0), 0),
  tpLeft = () => Math.max(0, tpEarned() - tpSpent()),
  offSchool = (k) => {
    const s = SPL[k];
    return !s.rl && !!s.cl && s.cl !== "all" && s.cl !== P.cls;
  },
  schoolFee = () => 100 + 50 * P.lvl,
  tpResetFee = () => 50 + 25 * P.lvl;
function tpBuy(k) {
  if (!P.tpx) P.tpx = {};
  P.tpx[k] = 1;
  if (!has(k)) learn(k, 1);
  else if (P.deck.filter(useOK).length < dmax() && !P.deck.includes(k)) P.deck.push(k);
}
// refund every school point: other-school cards bought with them leave your library (unless they are now your school's)
function tpReset() {
  Object.keys(P.tpx || {}).forEach((k) => {
    delete P.tpx[k];
    if (SPL[k] && !clsOK(k) && P.lib) delete P.lib[k];
  });
  P.deck = (P.deck || []).filter(useOK);
}
// cards you bought with gold from your current school (and role): not starters, not quest rewards
const clsBought = () =>
  Object.keys(P.lib || {}).filter((k) => {
    const s = SPL[k];
    if (!s || s.st || s.q != null || (P.tpx && P.tpx[k])) return false;
    return s.rl ? s.rl === P.role : s.cl === P.cls;
  });
// changing school: every card you paid for leaves your library and is paid back (gold for your school's cards,
// school points for other-school cards). Call before P.cls changes. Returns the gold refunded.
function clsRefund() {
  let gold = 0;
  clsBought().forEach((k) => {
    gold += splPrice(k);
    delete P.lib[k];
  });
  Object.keys(P.tpx || {}).forEach((k) => {
    delete P.tpx[k];
    if (P.lib) delete P.lib[k];
  });
  P.deck = (P.deck || []).filter((k) => P.lib && P.lib[k]);
  P.gold += gold;
  return gold;
}
function learn(k, quiet) {
  if (!P.lib) P.lib = {};
  if (P.lib[k]) return;
  P.lib[k] = 1;
  if (!P.deck) P.deck = [];
  if (clsOK(k) && P.deck.filter(useOK).length < dmax() && !P.deck.includes(k)) P.deck.push(k);
  if (!quiet) toast("Learned " + SPL[k].n + "!", ELC[SPL[k].a]);
}
// starters for your class, and a deck rebuilt from what you own (used on a new character, old saves and attunement swaps)
function clsStart() {
  if (!P.lib) P.lib = {};
  Object.keys(SPL).forEach((k) => {
    const s = SPL[k];
    if ((s.st || (s.q != null && splOK(k))) && clsOK(k)) P.lib[k] = 1;
  });
  P.deck = (P.deck || []).filter(useOK);
  Object.keys(SPL)
    .filter(useOK)
    .sort((a, b) => (SPL[b].lv || 5) - (SPL[a].lv || 5))
    .forEach((k) => {
      if (P.deck.length < dmax() && !P.deck.includes(k)) P.deck.push(k);
    });
}
function unl(quiet) {
  if (!P.seen) P.seen = {};
  if (!P.deck) P.deck = [];
  if (!P.comp) P.comp = [];
  if (!P.lib) P.lib = {};
  // quest spells for your class are handed to you; level spells show up at Wren's (a toast tells you once)
  Object.keys(SPL).forEach((k) => {
    const s = SPL[k];
    if (!clsOK(k) || !splOK(k) || P.seen[k + "@" + P.cls]) return;
    P.seen[k + "@" + P.cls] = 1;
    if (has(k)) return;
    if (s.q != null) learn(k, quiet);
    else if (!quiet) toast("New spell at Wren's: " + s.n + " (Lamplight Square)", ELC[s.a]);
  });
  Object.keys(ALLY).forEach((k) => {
    if (!ALLY[k].comp || !compOK(k) || P.seen[k]) return;
    P.seen[k] = 1;
    if (P.comp.length < 3) P.comp.push(k);
    if (!quiet) toast("New companion: " + ALLY[k].n + " (see Book > Party)");
  });
}
function lvup() {
  let up = 0;
  while (P.xp >= need() && P.lvl < lcap()) {
    P.xp -= need();
    P.lvl++;
    up++;
    if (!P.lvq) P.lvq = [];
    P.lvq.push(P.lvl); // v21: each new level brings a ceremony and a spell to choose (19-levelup.js)
  }
  if (P.xp >= need() && P.lvl >= lcap()) {
    P.xp = need();
    if (P.capT !== P.lvl) {
      P.capT = P.lvl;
      toast("Level " + P.lvl + " is the cap for now. Continue the ★ story to grow stronger.", "#ffd34d");
    }
  }
  if (up) {
    g.hp = mhp();
    unl(1);
    if (typeof lvShow === "function") setTimeout(lvShow, 900);
    else toast("Level up! You are now Lv " + P.lvl);
  }
}
// rewards for a whole battle: every foe counts for kills, quests and reputation; minions give half
function reward(list) {
  let gx = 0,
    xx = 0;
  list.forEach((f) => {
    const m = (f.min ? 0.5 : 1) * (f.el ? 2 : 1);
    P.kills++;
    try {
      bestRec(fname(f));
    } catch (e) {}
    addRep(f.kind === "wolf" ? "frost" : f.kind === "hound" ? "ember" : "hub", Math.round((3 + 2 * f.t) * m));
    if (f.dboss) dunWin(f.di);
    if (!f.min) {
      if (f.boss && f.t === 4 && !f.dboss) P.boss++;
      if (f.t === 5) {
        P.warden = (P.warden || 0) + 1;
        gx += 200;
        toast("The Gloom Warden falls! +200 glimmers");
      }
      if (f.big) P.alpha = (P.alpha || 0) + 1;
    }
    if (f.kind === "wolf") P.wolf = (P.wolf || 0) + 1;
    if (f.kind === "hound") P.hound = (P.hound || 0) + 1;
    const fl = f.lv || f.t; // v21: rewards follow the foe's level
    gx += Math.round((4 + 5 * fl + ((Math.random() * 6) | 0)) * m);
    xx += Math.round(xpFor(fl) * m);
  });
  if (list.length >= 3) P.packs = (P.packs || 0) + 1;
  try {
    streetWin(BG.position.x, BG.position.z, list.filter((f) => !f.min).length); // v15 street quests
  } catch (e) {}
  P.gold += gx;
  P.xp += xx;
  toast("+" + xx + " XP  +" + gx + " ✦");
  loot(list);
  lvup();
  qchk();
  sv();
}
const IT = {
  heal: {
    n: "Healing draught",
    d: "Restore all HP",
    c: () => 15,
    ok: () => g.hp < mhp(),
    buy: () => {
      g.hp = mhp();
    },
  },
  cloak: {
    n: "Sturdy cloak",
    d: "+20 max HP (max 3)",
    c: () => 50 + 35 * P.cloak,
    ok: () => P.cloak < 3,
    buy: () => {
      P.cloak++;
      g.hp += 20;
    },
  },
  page: {
    n: "Spare page",
    d: "+1 card in hand (max 2)",
    c: () => 90 + 90 * P.hs,
    ok: () => P.hs < 2,
    buy: () => {
      P.hs++;
    },
  },
  sigil: {
    n: "Summoning sigil",
    d: "Summons enter with +25% HP",
    c: () => 150,
    ok: () => !P.sig,
    buy: () => {
      P.sig = 1;
    },
  },
  crystal: {
    n: "Pip crystal",
    d: "Start each battle with +1 pip (max 2)",
    c: () => 120 + 80 * P.pc,
    ok: () => P.pc < 2,
    buy: () => {
      P.pc++;
    },
  },
  charm: {
    n: "Frost charm",
    d: "Rimeward: Frost Aegis +15 HP (max 3)",
    c: () => 60 + 40 * P.fc,
    ok: () => P.fc < 3,
    buy: () => {
      P.fc++;
    },
  },
  lens: {
    n: "Spark lens",
    d: "+10% spell damage (max 5)",
    c: () => 60 + 45 * P.lens,
    ok: () => P.lens < 5,
    buy: () => {
      P.lens++;
    },
  },
  stone: {
    n: "Ember whetstone",
    d: "Pyre: Ember Blade slashes +4 (max 3)",
    c: () => 80 + 60 * P.ws,
    ok: () => P.ws < 3,
    buy: () => {
      P.ws++;
    },
  },
  boots: {
    n: "Swift boots",
    d: "+10% flee chance (max 3)",
    c: () => 70 + 50 * (P.boots || 0),
    ok: () => (P.boots || 0) < 3,
    buy: () => {
      P.boots = (P.boots || 0) + 1;
    },
  },
  focus: {
    n: "Focus tonic",
    d: "Bank one more pip (max 6)",
    c: () => 200,
    ok: () => !P.focus,
    buy: () => {
      P.focus = 1;
    },
  },
  tome: {
    n: "Ember tome",
    d: "Pyre: Meteor +15 damage (max 3)",
    c: () => 110 + 70 * (P.tome || 0),
    ok: () => (P.tome || 0) < 3,
    buy: () => {
      P.tome = (P.tome || 0) + 1;
    },
  },
};
const SHOPS = {
  bram: { n: "Bram", z: "hub", l: "Fine wares, fair prices.", i: ["heal", "cloak", "page", "boots"] },
  yara: {
    n: "Yara",
    z: "frost",
    l: "Furs and frost-charms for travelers.",
    i: ["sigil", "crystal", "charm", "focus", "heal"],
  },
  forge: { n: "Korr", z: "ember", l: "Hot iron, honest prices.", i: ["lens", "stone", "tome", "heal"] },
};
const TRV = [
  { n: "Lamplight Square", to: [OX, OZ + 9, Math.PI] },
  { n: "Market Lane", to: [OX, OZ + MLZ + 8, Math.PI] },
  { n: "Wispwood Glade", to: [OX + RDS[0].gx + 4, OZ + RDS[0].gz, -Math.PI / 2], v: "ge" },
  { n: "Cinder Hollow", to: [OX + RDS[1].gx - 4, OZ + RDS[1].gz, Math.PI / 2], v: "gw" },
  { n: "Frostfen", to: [600, -376, Math.PI], v: "frost" },
  { n: "Cinderwaste", to: [-600, -376, Math.PI], v: "ember" },
  { n: "Mirewick Marsh", to: [MWX, MWZ + 24, Math.PI], v: "marsh" },
];
