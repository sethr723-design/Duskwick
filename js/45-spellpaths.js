// DUSKWICK - 45-spellpaths.js (v32): Spell Paths. Loaded in order by index.html as plain scripts (one global scope).
// Only top-level name: SPATH. Animations, models and card art live in 44-spellfx.js (SPFX).
// Every school now has five signature spells instead of a dozen look-alike cards, one per role beat (a cheap opener, a
// workhorse, a big set-piece, a utility spell and an ultimate). They unlock by level (Lv 1, 1, 3, 5, 8) and are added to
// your deck for free. Every other level asks you to carve a RUNE into one of them: two choices, each a real trade-off
// (more damage or a status, one foe or all, a pip now or a shield...). Each spell takes two runes (tier I, then tier II),
// so a Lv 14 lamplighter has made ten choices and no two builds need be alike. Runes can be reshaped at Book > Spells
// for glimmers.
// How it plugs in:
//  - SPL gets the 25 kit cards (cl = school, st: 1 so you own them, lv gates them through splOK). The card's name, cost,
//    text and aoe are rewritten from your runes (refresh). Old school/role cards are retired (cl/rl set to "old", so
//    clsOK hides them everywhere); their effects stay in CFX for party bots. Monster-summon cards (33-roads) stay.
//  - Runes: P.runes[k] = "" | "a" | "b" | "aa" | "ab" | "ba" | "bb" (tier I, tier II). Steps per school in STEPS.
//  - CFX[k] plays SPFX.A[fx] and then the effect with a local context; SFXK[k] replays the animation for others.
//  - Co-op: the "act" message carries rn (your runes) through a NET.send wrap; heroAction is wrapped so the host plays a
//    remote player's kit spell with their runes, their power and their timing grade.
//  - Summons: lwisp / revn are new ALLY types (models in SPFX); summon, act0, sumMesh and sumIdle0 are wrapped.
//  - Level-up: 19-levelup.js calls SPATH.cer() for the ceremony (new spell / rune choice) and no longer hands out
//    spell lessons. Rune steps left over from before (old saves past those levels) are offered one at a time.
const SPATH = (() => {
  const R = Math.random,
    log = (t) => ($("log").textContent = t),
    // ---------- status helpers ----------
    burn = (f, n) => f && f.hp > 0 && (f.st.burn = Math.max(f.st.burn || 0, n)),
    addB = (f, n) => f && f.hp > 0 && (f.st.burn = Math.min(4, (f.st.burn || 0) + n)),
    chill = (f, n) => f && f.hp > 0 && (f.st.chill = Math.max(f.st.chill || 0, n)),
    soft = (f) => f && f.hp > 0 && (f.hex = 1),
    stun = (f, ch, verb) => {
      if (f && f.hp > 0 && R() < ch) {
        f.stun = true;
        log("The " + f.label + " is " + (verb || "stunned") + "!");
      }
    },
    flags = (rn) => {
      rn = rn || "";
      return { rn, a1: rn[0] === "a", b1: rn[0] === "b", a2: rn[1] === "a", b2: rn[1] === "b" };
    },
    runeOf = (k) => (P && P.runes && P.runes[k]) || "",
    J = (a) => a.filter(Boolean).join(", ");
  if (!RUNE.spirit) RUNE.spirit = new T.CanvasTexture(runeCanvas("#c9a0ff", 256));
  // ---------- the new summons ----------
  ALLY.lwisp = { n: "Lantern Wisp", hp: 24, el: "spirit", y: 1.5, th: 2.6 };
  ALLY.revn = { n: "Revenant Knight", hp: 60, el: "spirit", y: 0, th: 3.6, taunt: 4 };
  ALLY.pfang = { n: "Hearthfang", hp: 50, el: "fire", y: 0, th: 3 }; // v48 Pyre's Lv 10 summon (model in SPFX)
  // v48b every other school's Lv 10 beast (models in 72-bestiary BESTIA)
  ALLY.gcat = { n: "Galecat", hp: 40, el: "storm", y: 0, th: 2.9 };
  ALLY.rhorn = { n: "Rimehorn", hp: 75, el: "ice", y: 0, th: 3.8, taunt: 4 };
  ALLY.mback = { n: "Mossback", hp: 55, el: "heal", y: 0, th: 3.1 };
  ALLY.sfox = { n: "Soulfox", hp: 32, el: "spirit", y: 0, th: 2.7 };
  const BEASTK = ["gcat", "rhorn", "mback", "sfox"];
  // ===================================================================================================================
  // THE KIT. card(r) -> { n, c, t, aoe }; dm(r, n, al) -> base damage per target (card range); eff(x) after the animation.
  // x: f, L, r, hit(f, n, el) -> dealt, heal(n), party(nh, na), shield(n), shieldAll(n), hurt(n), pips(n, why),
  //    bonus(n), focus(m), taunt(), local, allies (local only)
  // ===================================================================================================================
  const K = {},
    ORDER = [];
  const def = (o) => {
    K[o.k] = o;
    ORDER.push(o.k);
  };
  // ---------------- PYRE: the Striker. One foe, burned down fast ----------------
  def({
    k: "pcinder",
    cl: "pyre",
    lv: 1,
    ty: "atk",
    el: "fire",
    col: "#ff9a4a",
    n: "Cinderbolt",
    runes: [
      [
        2,
        ["Twin Cinders", "Two bolts of 8, each adds +1 Burn (stacks to 4)"],
        ["Searing Cinder", "One bolt of 18, no Burn"],
      ],
      [9, ["Kindling", "Hit a foe that's already burning: get 1◆ back"], ["Overheat", "+12 damage, but you take 5"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Twin Cinders" : r.b1 ? "Searing Cinder" : "Cinderbolt",
      c: 1,
      t: J([
        r.a1
          ? "Two bolts of " + (8 + (r.b2 ? 6 : 0)) + ", +1 Burn each"
          : (r.b1 ? 18 : 12) + (r.b2 ? 12 : 0) + " fire damage" + (r.b1 ? "" : ", Burn 1"),
        r.a2 && "1◆ back if it was burning",
        r.b2 && "you take 5",
      ]),
    }),
    dm: (r) => (r.a1 ? 16 + (r.b2 ? 12 : 0) : (r.b1 ? 18 : 12) + (r.b2 ? 12 : 0)),
    eff: async (x) => {
      const f = x.f,
        hot = f.st.burn > 0,
        ov = x.r.b2 ? 1 : 0;
      if (x.r.a1) {
        x.hit(f, 8 + 6 * ov);
        addB(f, 1);
        x.hit(f, 8 + 6 * ov);
        addB(f, 1);
      } else {
        x.hit(f, (x.r.b1 ? 18 : 12) + 12 * ov);
        if (!x.r.b1) burn(f, 1);
      }
      if (ov) x.hurt(5);
      if (x.r.a2 && hot) x.pips(1, "KINDLING");
    },
  });
  def({
    k: "plash",
    cl: "pyre",
    lv: 1,
    ty: "atk",
    el: "fire",
    col: "#ff7a2a",
    n: "Flame Lash",
    runes: [
      [
        4,
        ["Lashback", "The whip cracks on to a second foe for half"],
        ["Brand", "Brands the foe: your Path spells hit it 20% harder"],
      ],
      [
        11,
        ["Backdraft", "Uses up the foe's Burn: +12 damage per stack"],
        ["Spread", "The foe's Burn spreads to every foe"],
      ],
    ],
    card: (r) => ({
      n: r.a1 ? "Lashback Whip" : r.b1 ? "Branding Lash" : "Flame Lash",
      c: 2,
      t: J([
        "26 fire damage",
        r.a1 && "13 to a second foe",
        r.b1 && "Brands it (+20%)",
        r.a2 && "+12 per Burn (uses it up)",
        r.b2 && "its Burn spreads to all",
      ]),
    }),
    dm: () => 26,
    eff: async (x) => {
      const f = x.f;
      let n = 26;
      if (x.r.a2 && f.st.burn > 0) {
        n += 12 * f.st.burn;
        f.st.burn = 0;
      }
      const bn = f.st.burn || 0;
      x.hit(f, n);
      if (x.r.b1 && f.hp > 0) f.brand = 1;
      if (x.r.a1) {
        const f2 = x.L.find((q) => q !== f && q.hp > 0);
        if (f2) x.hit(f2, 13);
      }
      if (x.r.b2 && bn > 0) x.L.forEach((q) => burn(q, bn));
    },
  });
  def({
    k: "pphoenix",
    cl: "pyre",
    lv: 3,
    ty: "atk",
    el: "fire",
    col: "#ff5a2a",
    n: "Phoenix Dive",
    runes: [
      [
        6,
        ["Rebirth", "The phoenix comes back to you: heal 14"],
        ["Raking Talons", "Dives through every foe: 26 each, Burn 1"],
      ],
      [
        13,
        ["Pyre Wings", "+1 Burn on every foe"],
        ["Heart of Flame", "+24 damage (+12 each with Talons), costs 1◆ more"],
      ],
    ],
    card: (r) => ({
      n: r.b1 ? "Raking Phoenix" : r.a1 ? "Phoenix Reborn" : "Phoenix Dive",
      c: 3 + (r.b2 ? 1 : 0),
      aoe: r.b1 ? 1 : 0,
      t: J([
        r.b1 ? 26 + (r.b2 ? 12 : 0) + " to every foe, Burn 1" : 48 + (r.b2 ? 24 : 0) + " fire damage, Burn 2",
        r.a1 && "heal you 14",
        r.a2 && "+1 Burn on all",
      ]),
    }),
    dm: (r) => (r.b1 ? 26 + (r.b2 ? 12 : 0) : 48 + (r.b2 ? 24 : 0)),
    eff: async (x) => {
      if (x.r.b1)
        x.L.forEach((q) => {
          x.hit(q, 26 + (x.r.b2 ? 12 : 0));
          burn(q, 1);
        });
      else {
        x.hit(x.f, 48 + (x.r.b2 ? 24 : 0));
        burn(x.f, 2);
      }
      if (x.r.a1) x.heal(14);
      if (x.r.a2) x.L.forEach((q) => addB(q, 1));
    },
  });
  def({
    k: "pkindle",
    cl: "pyre",
    lv: 5,
    ty: "sup",
    el: "fire",
    col: "#ff3a2a",
    n: "Kindle Heart",
    runes: [
      [
        7,
        ["Fan the Flames", "Also sets Burn 1 on every foe"],
        ["Blood Pact", "+100% instead of +50%, but costs you 8 HP"],
      ],
      [14, ["Second Wind", "Also gives 1◆ right now"], ["White Heat", "+30% more on top"]],
    ],
    card: (r) => {
      const m = (r.b1 ? 100 : 50) + (r.b2 ? 30 : 0);
      return {
        n: r.b1 ? "Blood Pact" : r.a1 ? "Fanned Heart" : "Kindle Heart",
        c: 1,
        t: J([
          "Your next attack this turn hits +" + m + "%",
          r.a1 && "Burn 1 on all foes",
          r.b1 && "costs 8 HP",
          r.a2 && "+1◆ now",
        ]),
      };
    },
    eff: async (x) => {
      x.focus(1 + ((x.r.b1 ? 100 : 50) + (x.r.b2 ? 30 : 0)) / 100);
      if (x.r.b1) x.hurt(8);
      if (x.r.a1) x.L.forEach((q) => burn(q, 1));
      if (x.r.a2) x.pips(1, "SECOND WIND");
      if (x.local) log("Your heart blazes: your next attack this turn hits harder.");
    },
  });
  def({
    k: "psun",
    cl: "pyre",
    lv: 8,
    ty: "atk",
    el: "fire",
    col: "#ffd27a",
    n: "Sunfall",
    runes: [
      [10, ["Solar Flare", "Falls on every foe: 70 each, Burn 2"], ["Supernova", "200 to one foe, but you take 15"]],
      [12, ["Dawnbreak", "Its light heals the party 20"], ["Scorched Earth", "Burn 3 on every foe"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Solar Flare" : r.b1 ? "Supernova" : "Sunfall",
      c: 5,
      aoe: r.a1 ? 1 : 0,
      t: J([
        r.a1 ? "70 to every foe, Burn 2" : (r.b1 ? 200 : 140) + " fire damage, Burn 4",
        r.b1 && "you take 15",
        r.a2 && "heal party 20",
        r.b2 && "Burn 3 on all",
      ]),
    }),
    dm: (r) => (r.a1 ? 70 : r.b1 ? 200 : 140),
    eff: async (x) => {
      if (x.r.a1)
        x.L.forEach((q) => {
          x.hit(q, 70);
          burn(q, 2);
        });
      else {
        x.hit(x.f, x.r.b1 ? 200 : 140);
        burn(x.f, 4);
      }
      if (x.r.b1) x.hurt(15);
      if (x.r.a2) x.party(20, 12);
      if (x.r.b2) x.L.forEach((q) => burn(q, 3));
    },
  });
  // v48: a sixth Pyre spell, a summon with no runes (so no new rune steps); its attack is fangAct below
  def({
    k: "pfang",
    cl: "pyre",
    lv: 10,
    ty: "sum",
    el: "fire",
    col: "#ff6a1a",
    n: "Hearthfang",
    runes: [],
    card: () => ({ n: "Hearthfang", c: 4, t: "Ally: 50 HP, pounces on a foe for 18 a turn, Burn 1" }),
    eff: async () => {},
  });
  // v48b: one beast summon per school at Lv 10, no runes (acts: catAct / hornAct / mossAct / foxAct)
  [
    [
      "gcat",
      "gale",
      "storm",
      "#8aa6ff",
      "Galecat",
      4,
      "Ally: 40 HP, its thunder-roar hits every foe for 9 a turn, 20% stun",
    ],
    ["rhorn", "rime", "ice", "#9fe8ff", "Rimehorn", 4, "Ally: 75 HP, draws attacks, stamps a foe for 14 and Chills it"],
    ["mback", "verdant", "heal", "#7dff9a", "Mossback", 4, "Ally: 55 HP, heals the party 8 a turn (allies 6)"],
    [
      "sfox",
      "spirit",
      "spirit",
      "#c9a0ff",
      "Soulfox",
      3,
      "Ally: 32 HP, dashes through a foe for 14, mends other allies 5",
    ],
  ].forEach(([k, cl, el, col, n, c, t]) =>
    def({ k, cl, lv: 10, ty: "sum", el, col, n, runes: [], card: () => ({ n, c, t }), eff: async () => {} }),
  );
  // ---------------- GALE: the Evoker. Every foe at once, stuns ----------------
  def({
    k: "gspark",
    cl: "gale",
    lv: 1,
    ty: "atk",
    el: "storm",
    col: "#ffe066",
    n: "Static Spark",
    runes: [
      [2, ["Fork", "Arcs on to every other foe for 6"], ["Jolt", "16 to one foe, 30% stun, no arc"]],
      [9, ["Static Charge", "+1◆ next turn"], ["Conductor", "+10 against a stunned foe"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Forked Spark" : r.b1 ? "Jolt" : "Static Spark",
      c: 1,
      aoe: r.a1 ? 1 : 0,
      t: J([
        r.b1 ? "16 storm damage, 30% stun" : "10 storm damage, arcs to " + (r.a1 ? "every foe" : "one more") + " for 6",
        r.a2 && "+1◆ next turn",
        r.b2 && "+10 vs stunned",
      ]),
    }),
    dm: (r) => (r.b1 ? 16 : 10),
    eff: async (x) => {
      const f = x.f,
        cb = (q) => (x.r.b2 && q.stun ? 10 : 0);
      if (x.r.b1) {
        x.hit(f, 16 + cb(f));
        stun(f, 0.3);
      } else {
        x.hit(f, 10 + cb(f));
        const rest = x.L.filter((q) => q !== f && q.hp > 0);
        (x.r.a1 ? rest : rest.slice(0, 1)).forEach((q) => x.hit(q, 6 + cb(q)));
      }
      if (x.r.a2) x.bonus(1);
    },
  });
  def({
    k: "ggust",
    cl: "gale",
    lv: 1,
    ty: "atk",
    el: "storm",
    col: "#d8fff0",
    n: "Gust Ring",
    runes: [
      [
        4,
        ["Cyclone", "22 to every foe, costs 3◆"],
        ["Downdraft", "10 to every foe, and each hits 50% softer next time"],
      ],
      [11, ["Eye of the Storm", "You gain a 15 shield"], ["Updraft", "25% stun on each foe"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Cyclone" : r.b1 ? "Downdraft" : "Gust Ring",
      c: r.a1 ? 3 : 2,
      aoe: 1,
      t: J([
        (r.a1 ? 22 : r.b1 ? 10 : 14) + " to every foe",
        r.b1 && "they hit 50% softer",
        r.a2 && "15 shield",
        r.b2 && "25% stun each",
      ]),
    }),
    dm: (r) => (r.a1 ? 22 : r.b1 ? 10 : 14),
    eff: async (x) => {
      const n = x.r.a1 ? 22 : x.r.b1 ? 10 : 14;
      x.L.forEach((q) => {
        x.hit(q, n);
        if (x.r.b1) soft(q);
        if (x.r.b2) stun(q, 0.25, "tossed off balance");
      });
      if (x.r.a2) x.shield(15);
    },
  });
  def({
    k: "gthunder",
    cl: "gale",
    lv: 3,
    ty: "atk",
    el: "storm",
    col: "#fff3a0",
    n: "Thunderhead",
    runes: [
      [
        6,
        ["Double Strike", "The cloud strikes every foe twice, 14 each"],
        ["Focused Bolt", "One foe takes 64, 50% stun"],
      ],
      [13, ["Charged Air", "+1◆ right now"], ["Rolling Thunder", "Stun chance +20%"]],
    ],
    card: (r) => {
      const st = (r.b1 ? 50 : 25) + (r.b2 ? 20 : 0);
      return {
        n: r.a1 ? "Twin Thunderhead" : r.b1 ? "Focused Bolt" : "Thunderhead",
        c: 3,
        aoe: r.b1 ? 0 : 1,
        t: J([
          r.a1 ? "14 to every foe, twice" : r.b1 ? "64 storm damage" : "24 to every foe",
          st + "% stun",
          r.a2 && "+1◆ now",
        ]),
      };
    },
    dm: (r) => (r.a1 ? 28 : r.b1 ? 64 : 24),
    eff: async (x) => {
      const st = (x.r.b1 ? 0.5 : 0.25) + (x.r.b2 ? 0.2 : 0);
      if (x.r.b1) {
        x.hit(x.f, 64);
        stun(x.f, st);
      } else
        x.L.forEach((q) => {
          x.hit(q, x.r.a1 ? 14 : 24);
          if (x.r.a1) x.hit(q, 14);
          stun(q, st);
        });
      if (x.r.a2) x.pips(1, "CHARGED AIR");
    },
  });
  def({
    k: "gtail",
    cl: "gale",
    lv: 5,
    ty: "sup",
    el: "storm",
    col: "#fff6a0",
    n: "Tailwind",
    runes: [
      [7, ["Swift", "+1◆ right now instead of +2 next turn"], ["Gale Shield", "Also a 15 shield"]],
      [14, ["Quickening", "Draw a card"], ["Eye of the Storm", "Your next attack this turn hits +40%"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Swift Wind" : r.b1 ? "Gale Shield" : "Tailwind",
      c: 1,
      t: J([
        r.a1 ? "+1◆ now" : "+2◆ next turn",
        r.b1 && "15 shield",
        r.a2 && "draw a card",
        r.b2 && "next attack +40%",
      ]),
    }),
    eff: async (x) => {
      if (x.r.a1) x.pips(1, "SWIFT");
      else x.bonus(2);
      if (x.r.b1) x.shield(15);
      if (x.r.b2) x.focus(1.4);
      if (x.r.a2) x.draw();
      if (x.local) log(x.r.a1 ? "The wind quickens: +1 pip." : "A tailwind rises: +2 pips next turn.");
    },
  });
  def({
    k: "gsky",
    cl: "gale",
    lv: 8,
    ty: "atk",
    el: "storm",
    col: "#ffffff",
    n: "Skybreaker",
    runes: [
      [10, ["Maelstrom", "45 to every foe, and every foe is stunned"], ["Judgement", "160 to one foe, always stuns"]],
      [12, ["Static Field", "+2◆ next turn"], ["Ion Surge", "+20 damage"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Maelstrom" : r.b1 ? "Judgement" : "Skybreaker",
      c: 5,
      aoe: r.b1 ? 0 : 1,
      t: J([
        r.b1
          ? 160 + (r.b2 ? 20 : 0) + " storm damage, stun"
          : (r.a1 ? 45 : 60) + (r.b2 ? 20 : 0) + " to every foe, " + (r.a1 ? "all stunned" : "40% stun"),
        r.a2 && "+2◆ next turn",
      ]),
    }),
    dm: (r) => (r.b1 ? 160 : r.a1 ? 45 : 60) + (r.b2 ? 20 : 0),
    eff: async (x) => {
      const up = x.r.b2 ? 20 : 0;
      if (x.r.b1) {
        x.hit(x.f, 160 + up);
        stun(x.f, 1);
      } else
        x.L.forEach((q) => {
          x.hit(q, (x.r.a1 ? 45 : 60) + up);
          stun(q, x.r.a1 ? 1 : 0.4);
        });
      if (x.r.a2) x.bonus(2);
    },
  });
  // ---------------- RIME: the Warden. Shields, taunts, cold ----------------
  def({
    k: "rshard",
    cl: "rime",
    lv: 1,
    ty: "atk",
    el: "ice",
    col: "#bfeeff",
    n: "Frost Shard",
    runes: [
      [
        2,
        ["Splinter", "Shatters over every foe: 8 each, Chill 1"],
        ["Rime Shell", "10 damage, and you gain a 12 shield"],
      ],
      [9, ["Deep Cold", "Chill 2 instead of 1"], ["Glacial Edge", "+10 against a Chilled foe"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Splinter Shard" : r.b1 ? "Rime Shell" : "Frost Shard",
      c: 1,
      aoe: r.a1 ? 1 : 0,
      t: J([
        (r.a1 ? "8 to every foe" : (r.b1 ? 10 : 14) + " ice damage") + ", Chill " + (r.a2 ? 2 : 1),
        r.b1 && "12 shield",
        r.b2 && "+10 vs Chilled",
      ]),
    }),
    dm: (r) => (r.a1 ? 8 : r.b1 ? 10 : 14),
    eff: async (x) => {
      const ch = x.r.a2 ? 2 : 1,
        e = (q) => (x.r.b2 && q.st.chill > 0 ? 10 : 0);
      (x.r.a1 ? x.L : [x.f]).forEach((q) => {
        x.hit(q, (x.r.a1 ? 8 : x.r.b1 ? 10 : 14) + e(q));
        chill(q, ch);
      });
      if (x.r.b1) x.shield(12);
    },
  });
  def({
    k: "rwall",
    cl: "rime",
    lv: 1,
    ty: "sup",
    el: "ice",
    col: "#8fe0ff",
    n: "Glacier Wall",
    runes: [
      [
        4,
        ["Bulwark", "Shields every hero 20 instead (no taunt)"],
        ["Spiked Wall", "Foes that strike you take half of it back"],
      ],
      [11, ["Permafrost", "+15 shield"], ["Cold Snap", "Chill 1 on every foe"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Glacier Bulwark" : r.b1 ? "Spiked Wall" : "Glacier Wall",
      c: 2,
      t: J([
        r.a1
          ? "Shield every hero " + (20 + (r.a2 ? 15 : 0))
          : "Shield yourself " + (r.b1 ? 22 : 30) + (r.a2 ? 15 : 0) + ", every foe must attack you",
        r.b1 && "they take half back",
        r.b2 && "Chill 1 on all foes",
      ]),
    }),
    eff: async (x) => {
      const pf = x.r.a2 ? 15 : 0;
      if (x.r.a1) x.shieldAll(20 + pf);
      else {
        x.shield((x.r.b1 ? 22 : 30) + pf);
        x.taunt();
        if (x.r.b1) x.thorns();
      }
      if (x.r.b2) x.L.forEach((q) => chill(q, 1));
      if (x.local && !x.r.a1) log("The wall rises. Every foe must come for you this round.");
    },
  });
  def({
    k: "rhammer",
    cl: "rime",
    lv: 3,
    ty: "atk",
    el: "ice",
    col: "#9fe8ff",
    n: "Frozen Hammer",
    runes: [
      [
        6,
        ["Earthshatter", "Ice spikes hit every other foe for 18"],
        ["Crushing Blow", "58 damage, 60% stun, costs 4◆"],
      ],
      [13, ["Hoarfrost", "Gain a shield of half the damage dealt"], ["Frozen Solid", "Always stuns a Chilled foe"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Earthshatter" : r.b1 ? "Crushing Hammer" : "Frozen Hammer",
      c: r.b1 ? 4 : 3,
      t: J([
        (r.b1 ? 58 : 40) + " ice damage, " + (r.b1 ? 60 : 40) + "% stun",
        r.a1 && "18 to every other foe",
        r.a2 && "shield = half the damage",
        r.b2 && "Chilled = always stuns",
      ]),
    }),
    dm: (r) => (r.b1 ? 58 : 40),
    eff: async (x) => {
      const f = x.f,
        cold = f.st.chill > 0,
        d = x.hit(f, x.r.b1 ? 58 : 40);
      stun(f, x.r.b2 && cold ? 1 : x.r.b1 ? 0.6 : 0.4, "frozen in place");
      if (x.r.a1) x.L.forEach((q) => q !== f && x.hit(q, 18));
      if (x.r.a2 && d > 0) x.shield(Math.round(d / 2));
    },
  });
  def({
    k: "rring",
    cl: "rime",
    lv: 5,
    ty: "atk",
    el: "ice",
    col: "#dff8ff",
    n: "Frostbite Ring",
    runes: [
      [
        7,
        ["Frozen Ground", "You gain a 5 shield for each foe it hits"],
        ["Bitter Cold", "18 to every foe, but Chill 1"],
      ],
      [14, ["Taunting Frost", "Every foe must attack you this round"], ["Brittle", "+8 against Chilled foes"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Frozen Ground" : r.b1 ? "Bitter Ring" : "Frostbite Ring",
      c: 2,
      aoe: 1,
      t: J([
        (r.b1 ? 18 : 12) + " to every foe, Chill " + (r.b1 ? 1 : 2),
        r.a1 && "5 shield per foe",
        r.a2 && "they must attack you",
        r.b2 && "+8 vs Chilled",
      ]),
    }),
    dm: (r) => (r.b1 ? 18 : 12),
    eff: async (x) => {
      let n = 0;
      x.L.forEach((q) => {
        const c0 = q.st.chill > 0;
        x.hit(q, (x.r.b1 ? 18 : 12) + (x.r.b2 && c0 ? 8 : 0));
        chill(q, x.r.b1 ? 1 : 2);
        n++;
      });
      if (x.r.a1 && n) x.shield(5 * n);
      if (x.r.a2) x.taunt();
    },
  });
  def({
    k: "ravatar",
    cl: "rime",
    lv: 8,
    ty: "atk",
    el: "ice",
    col: "#6fb8f0",
    n: "Avatar of Winter",
    runes: [
      [10, ["Eternal Winter", "Chill 3 on every foe"], ["Glacier Heart", "You gain 30 more shield"]],
      [12, ["Shatterstorm", "+25 against Chilled foes"], ["Frozen Time", "40% stun on each foe"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Eternal Winter" : r.b1 ? "Glacier Heart" : "Avatar of Winter",
      c: 5,
      aoe: 1,
      t: J([
        "45 to every foe, shield every hero 30" + (r.b1 ? " (you +30)" : "") + ", they must attack you",
        r.a1 && "Chill 3 on all",
        r.a2 && "+25 vs Chilled",
        r.b2 && "40% stun each",
      ]),
    }),
    dm: () => 45,
    eff: async (x) => {
      x.L.forEach((q) => {
        x.hit(q, 45 + (x.r.a2 && q.st.chill > 0 ? 25 : 0));
        if (x.r.a1) chill(q, 3);
        if (x.r.b2) stun(q, 0.4, "frozen in time");
      });
      x.shieldAll(30);
      if (x.r.b1) x.shield(30);
      x.taunt();
    },
  });
  // ---------------- VERDANT: the Mender. Heals, roots, keeps everyone standing ----------------
  def({
    k: "vseed",
    cl: "verdant",
    lv: 1,
    ty: "atk",
    el: "heal",
    col: "#8dffa8",
    n: "Thornseed",
    runes: [
      [2, ["Leech Seed", "Heals the whole party 5 instead of you 6"], ["Thorn Burst", "16 damage, but heals only 3"]],
      [9, ["Deep Roots", "+6 healing"], ["Briar", "30% chance to root (stun)"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Leech Seed" : r.b1 ? "Thorn Burst" : "Thornseed",
      c: 1,
      t: J([
        (r.b1 ? 16 : 10) + " life damage",
        r.a1 ? "heal the party " + (5 + (r.a2 ? 6 : 0)) : "heal you " + ((r.b1 ? 3 : 6) + (r.a2 ? 6 : 0)),
        r.b2 && "30% root",
      ]),
    }),
    dm: (r) => (r.b1 ? 16 : 10),
    eff: async (x) => {
      x.hit(x.f, x.r.b1 ? 16 : 10);
      const h = (x.r.a1 ? 5 : x.r.b1 ? 3 : 6) + (x.r.a2 ? 6 : 0);
      if (x.r.a1) x.party(h, h);
      else x.heal(h);
      if (x.r.b2) stun(x.f, 0.3, "rooted in place");
    },
  });
  def({
    k: "vrain",
    cl: "verdant",
    lv: 1,
    ty: "sup",
    el: "heal",
    col: "#9affc0",
    n: "Renewing Rain",
    runes: [
      [
        4,
        ["Downpour", "Heals 30, costs 3◆"],
        ["Soothing Mist", "Heals 14, but clears your Burn and Chill and shields everyone 10"],
      ],
      [11, ["Bloom", "Also 10 to every foe"], ["Overflow", "Also a 10 shield on every hero"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Downpour" : r.b1 ? "Soothing Mist" : "Renewing Rain",
      c: r.a1 ? 3 : 2,
      t: J([
        "Heal every hero " + (r.a1 ? 30 : r.b1 ? 14 : 20) + " and allies " + (r.a1 ? 16 : r.b1 ? 8 : 10),
        r.b1 && "clears Burn/Chill, 10 shield",
        r.a2 && "10 to every foe",
        r.b2 && "+10 shield each",
      ]),
    }),
    eff: async (x) => {
      const n = x.r.a1 ? 30 : x.r.b1 ? 14 : 20;
      x.party(n, x.r.a1 ? 16 : x.r.b1 ? 8 : 10);
      if (x.r.b1) {
        x.cleanse();
        x.shieldAll(10);
      }
      if (x.r.b2) x.shieldAll(10);
      if (x.r.a2) x.L.forEach((q) => x.hit(q, 10));
    },
  });
  def({
    k: "vvine",
    cl: "verdant",
    lv: 3,
    ty: "atk",
    el: "heal",
    col: "#5ad87a",
    n: "Wildvine Grasp",
    runes: [
      [6, ["Strangle", "50 damage, but no healing"], ["Lifeweb", "Every foe: 18 each, 25% root, heal the party 10"]],
      [13, ["Rooted", "Always roots"], ["Sap Drain", "Heal you half the damage dealt"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Strangling Vines" : r.b1 ? "Lifeweb" : "Wildvine Grasp",
      c: 3,
      aoe: r.b1 ? 1 : 0,
      t: J([
        r.b1 ? "18 to every foe" : (r.a1 ? 50 : 34) + " life damage",
        (r.a2 ? 100 : r.b1 ? 25 : 40) + "% root",
        !r.a1 && "heal the party " + (r.b1 ? 10 : 8),
        r.b2 && "heal you half the damage",
      ]),
    }),
    dm: (r) => (r.b1 ? 18 : r.a1 ? 50 : 34),
    eff: async (x) => {
      const ch = x.r.a2 ? 1 : x.r.b1 ? 0.25 : 0.4;
      let d = 0;
      (x.r.b1 ? x.L : [x.f]).forEach((q) => {
        d += x.hit(q, x.r.b1 ? 18 : x.r.a1 ? 50 : 34);
        stun(q, ch, "rooted in place");
      });
      if (!x.r.a1) x.party(x.r.b1 ? 10 : 8, x.r.b1 ? 10 : 8);
      if (x.r.b2 && d > 0) x.heal(Math.round(d / 2));
    },
  });
  def({
    k: "vgrove",
    cl: "verdant",
    lv: 5,
    ty: "sup",
    el: "heal",
    col: "#bfffe0",
    n: "Sanctuary Grove",
    runes: [
      [
        7,
        ["Hallowed Ground", "Also heals every hero 12"],
        ["Barkskin", "Shields every hero 22 instead of the damage cut"],
      ],
      [
        14,
        ["Second Chance", "Revives a fallen hero at 40% (or heals you 20)"],
        ["Thornwood", "Foes that strike you take half of it back"],
      ],
    ],
    card: (r) => ({
      n: r.a1 ? "Hallowed Grove" : r.b1 ? "Barkskin" : "Sanctuary Grove",
      c: 2,
      t: J([
        r.b1 ? "Shield every hero 22" : "Your team takes 40% less damage this round",
        r.a1 && "heal every hero 12",
        r.a2 && "revive a fallen hero (40%)",
        r.b2 && "attackers take half back",
      ]),
    }),
    eff: async (x) => {
      if (x.r.b1) x.shieldAll(22);
      else x.sanct();
      if (x.r.a1) x.party(12, 8);
      if (x.r.a2) {
        if (!x.revive(0.4)) x.heal(20);
      }
      if (x.r.b2) x.thorns();
    },
  });
  def({
    k: "vheart",
    cl: "verdant",
    lv: 8,
    ty: "sup",
    el: "heal",
    col: "#fff0a0",
    n: "Heart of the Grove",
    runes: [
      [10, ["Wrath of the Grove", "Also 40 to every foe"], ["Evergreen", "+20 healing and a 20 shield on every hero"]],
      [12, ["Blossom", "Allies heal 30 more"], ["Ancient Roots", "35% root on every foe"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Wrath of the Grove" : r.b1 ? "Evergreen Heart" : "Heart of the Grove",
      c: 5,
      t: J([
        "Revive every fallen hero (50%), heal everyone " + (r.b1 ? 60 : 40),
        r.a1 && "40 to every foe",
        r.b1 && "20 shield each",
        r.a2 && "allies +30",
        r.b2 && "35% root each",
      ]),
    }),
    eff: async (x) => {
      x.reviveAll(0.5);
      x.party(r0(x).h, r0(x).h + (x.r.a2 ? 30 : 0));
      if (x.r.b1) x.shieldAll(20);
      if (x.r.a1) x.L.forEach((q) => x.hit(q, 40));
      if (x.r.b2) x.L.forEach((q) => stun(q, 0.35, "rooted in place"));
    },
  });
  const r0 = (x) => ({ h: x.r.b1 ? 60 : 40 });
  // ---------------- SPIRIT: the Wispcaller. Allies do the fighting ----------------
  def({
    k: "swisp",
    cl: "spirit",
    lv: 1,
    ty: "atk",
    el: "spirit",
    col: "#c9a0ff",
    n: "Wisp Bolt",
    runes: [
      [
        2,
        ["Echo", "+6 per ally instead of +3 (each ally sends a wisp)"],
        ["Soul Spark", "A flat 14, allies don't matter"],
      ],
      [9, ["Kindred", "Heals each of your allies 6"], ["Haunt", "The foe hits 50% softer next time"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Echoing Wisp" : r.b1 ? "Soul Spark" : "Wisp Bolt",
      c: 1,
      t: J([
        r.b1 ? "14 spirit damage" : "8 spirit damage, +" + (r.a1 ? 6 : 3) + " per ally",
        r.a2 && "heal allies 6",
        r.b2 && "it hits 50% softer",
      ]),
    }),
    dm: (r, n, al) => (r.b1 ? 14 : 8 + (r.a1 ? 6 : 3) * al),
    eff: async (x) => {
      const al = x.nAl();
      x.hit(x.f, x.r.b1 ? 14 : 8 + (x.r.a1 ? 6 : 3) * al);
      if (x.r.a2) x.allies().forEach((s) => healA(s, 6));
      if (x.r.b2) soft(x.f);
    },
  });
  def({
    k: "lwisp",
    cl: "spirit",
    lv: 1,
    ty: "sum",
    el: "spirit",
    col: "#c9a0ff",
    n: "Lantern Wisp",
    runes: [
      [
        4,
        ["Brighter Lantern", "The wisp also heals you 5 each turn"],
        ["Twin Lanterns", "Calls two wisps (16 HP, zap 9 each)"],
      ],
      [11, ["Lantern of Souls", "Zaps every foe for 6 instead"], ["Ember Soul", "+8 to its zap"]],
    ],
    card: (r) => {
      const z = r.a2 ? 6 + (r.b2 ? 4 : 0) : (r.b1 ? 9 : 12) + (r.b2 ? 8 : 0);
      return {
        n: r.b1 ? "Twin Lanterns" : r.a1 ? "Brighter Lantern" : "Lantern Wisp",
        c: 3,
        t: J([
          (r.b1 ? "Allies: two wisps, " + 16 : "Ally: " + 24) +
            " HP, zap " +
            (r.a2 ? "every foe for " : "") +
            z +
            " a turn",
          r.a1 && "heals you 5 a turn",
        ]),
      };
    },
    eff: async () => {},
  });
  def({
    k: "revn",
    cl: "spirit",
    lv: 3,
    ty: "sum",
    el: "spirit",
    col: "#b58aff",
    n: "Revenant Knight",
    runes: [
      [6, ["Vanguard", "95 HP instead of 60"], ["Reaper", "Strikes for 26 instead of 16"]],
      [
        13,
        ["Oathkeeper", "Arrives with a 15 shield for every hero"],
        ["Cleave", "Its strikes also hit every other foe for half"],
      ],
    ],
    card: (r) => ({
      n: r.a1 ? "Revenant Vanguard" : r.b1 ? "Revenant Reaper" : "Revenant Knight",
      c: 4,
      t: J([
        "Ally: " + (r.a1 ? 95 : 60) + " HP, draws attacks, strikes " + (r.b1 ? 26 : 16),
        r.a2 && "shields heroes 15",
        r.b2 && "cleaves for half",
      ]),
    }),
    eff: async () => {},
  });
  def({
    k: "slink",
    cl: "spirit",
    lv: 5,
    ty: "sup",
    el: "spirit",
    col: "#d8b0ff",
    n: "Spirit Link",
    runes: [
      [
        7,
        ["Empower", "Allies also hit 50% harder for 2 rounds; costs 3◆"],
        ["Soul Feast", "Allies heal 20 before they act"],
      ],
      [14, ["Command", "Costs 1◆ less"], ["Chorus", "Then the target foe hits 50% softer"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Empowering Link" : r.b1 ? "Soul Feast" : "Spirit Link",
      c: Math.max(1, (r.a1 ? 3 : 2) - (r.a2 ? 1 : 0)),
      t: J([
        "Every ally acts right now",
        r.a1 && "+50% for 2 rounds",
        r.b1 && "allies heal 20 first",
        r.b2 && "target hits 50% softer",
      ]),
    }),
    eff: async (x) => {
      if (x.r.a1) x.bond(2);
      if (x.r.b1) x.allies().forEach((s) => healA(s, 20));
      await x.rally();
      if (x.r.b2) soft(x.f);
    },
  });
  def({
    k: "sproc",
    cl: "spirit",
    lv: 8,
    ty: "atk",
    el: "spirit",
    col: "#a070ff",
    n: "Night Procession",
    runes: [
      [10, ["Restless Dead", "A Lantern Wisp joins the end of the line"], ["Requiem", "+10 per ally instead of +6"]],
      [12, ["Soul Harvest", "Heals each of your allies 20"], ["Dread", "Every foe hits 50% softer next time"]],
    ],
    card: (r) => ({
      n: r.a1 ? "Restless Procession" : r.b1 ? "Requiem" : "Night Procession",
      c: 5,
      aoe: 1,
      t: J([
        "30 to every foe, +" + (r.b1 ? 10 : 6) + " per ally",
        r.a1 && "calls a Lantern Wisp",
        r.a2 && "heal allies 20",
        r.b2 && "all hit 50% softer",
      ]),
    }),
    dm: (r, n, al) => 30 + (r.b1 ? 10 : 6) * al,
    eff: async (x) => {
      const al = x.nAl();
      x.L.forEach((q) => {
        x.hit(q, 30 + (x.r.b1 ? 10 : 6) * al);
        if (x.r.b2) soft(q);
      });
      if (x.r.a2) x.allies().forEach((s) => healA(s, 20));
      if (x.r.a1) await x.call("lwisp");
    },
  });
  // which animation plays for each card (same key)
  ORDER.forEach((k) => (K[k].fx = k));
  // rune steps per school, in level order
  const STEPS = {};
  ORDER.forEach((k) => {
    const d = K[k];
    d.runes.forEach((rr, ti) => (STEPS[d.cl] = STEPS[d.cl] || []).push({ k, ti, lv: rr[0], A: rr[1], B: rr[2] }));
  });
  Object.values(STEPS).forEach((L) => L.sort((a, b) => a.lv - b.lv));
  // ===================================================================================================================
  // CONTEXTS
  // ===================================================================================================================
  const heroPos = (h) => (h.local ? W.position : h.m.position);
  function common(d, f, r) {
    return { k: d.k, d, r, f, L: alive().slice(), el: d.el };
  }
  // your own cast
  function ctxL(d, f) {
    const x = common(d, f, flags(runeOf(d.k))),
      h = me0();
    return Object.assign(x, {
      local: 1,
      hit: (q, n, e) => {
        if (!q || q.hp <= 0) return 0;
        const h0 = q.hp;
        if (q.brand && (e || d.el) === "fire") n *= 1.2;
        dmg(q, n, e || d.el);
        return h0 - q.hp;
      },
      heal: (n) => healP(n),
      party: (nh, na) => partyHeal(nh, na == null ? Math.round(nh * 0.6) : na),
      shield: (n) => h && addShield(h, n),
      shieldAll: (n) => g.heroes.forEach((q) => !q.down && addShield(q, n)),
      hurt: (n) => {
        g.hp = Math.max(1, g.hp - n);
        popNum(W.position, n, "#ff6a5a", "RECOIL");
        ui();
      },
      pips: (n, why) => {
        g.en = Math.min(5 + (P.focus || 0), g.en + n);
        popNum(W.position, "+" + n + "◆", "#ffe066", why || "");
        ui();
      },
      bonus: (n) => {
        g.bonus = (g.bonus || 0) + n;
        popNum(W.position, "+" + n + "◆", "#ffe066", "NEXT TURN");
      },
      focus: (m) => (g.focus = Math.max(1, g.focus || 1) * m),
      taunt: () => (g.taunt = P.id),
      thorns: () => (g.thorns = 1),
      sanct: () => (g.sanct = 1),
      bond: (n) => (g.bond = Math.max(g.bond || 0, n)),
      cleanse: () => {
        g.pst.burn = 0;
        g.pst.chill = 0;
      },
      revive: (fr) => {
        const dn = g.heroes.find((q) => q.down);
        if (!dn) return false;
        reviveHero(dn, fr);
        return true;
      },
      reviveAll: (fr) => g.heroes.filter((q) => q.down).forEach((q) => reviveHero(q, fr)),
      nAl: () => nAll(),
      allies: () => g.allies.slice(),
      rally: async () => {
        for (const s of [...g.allies].sort((a, b) => a.slot - b.slot)) {
          if (!alive().length) break;
          if (g.allies.includes(s)) await act(s);
        }
      },
      call: async (t) => {
        if (freeSlot() >= 0) await summon(t);
      },
      draw: () => {
        const dk = P.deck.filter(useOK).filter((k) => k !== d.k);
        if (!dk.length || g.hand.length >= (typeof DKS !== "undefined" ? DKS.max : 7)) return;
        const k = dk[(R() * dk.length) | 0],
          o = Object.assign({ k }, SPL[k]);
        if (o.sch) o.a = schEl();
        g.hand.push(o);
        popNum(W.position, "", "#ffe066", "+1 CARD");
        ui();
      },
    });
  }
  // the host playing a remote player's spell: their level, role and timing grade set the numbers
  function ctxR(d, h, f, qg, r, aoe) {
    const x = common(d, f, r),
      pw = 1 + 0.08 * ((h.lvl || 1) - 1),
      hm = h.role === "healer" ? 1.4 : 1,
      rm = (h.role === "damage" && !aoe) || (h.role === "aoe" && aoe) ? 1.25 : 1,
      mul = (pw * rm * QMUL[qg == null ? 1 : qg]) / lvS(),
      hh = (q, n) => {
        if (q.down) return;
        if (q.local) return healP(n);
        const h0 = q.hp;
        q.hp = Math.min(q.max, q.hp + n);
        popNum(q.m.position, "+" + (q.hp - h0), "#7dff9a");
      },
      sh = (q, n) => {
        if (q.down) return;
        if (q.local) return addShield(q, n);
        q.sh = (q.sh || 0) + Math.round(n * pw);
        popNum(q.m.position, "+" + Math.round(n * pw), "#8ad0ff", "SHIELD");
      };
    return Object.assign(x, {
      local: 0,
      hit: (q, n, e) => {
        if (!q || q.hp <= 0) return 0;
        const h0 = q.hp;
        dmg(q, Math.round(n * mul), e || d.el, 1);
        return h0 - q.hp;
      },
      heal: (n) => hh(h, Math.round(n * pw * hm)),
      party: (nh, na) => {
        g.heroes.forEach((q) => hh(q, Math.round(nh * pw * hm)));
        g.allies.forEach((s) => healA(s, na == null ? Math.round(nh * 0.6) : na));
      },
      shield: (n) => sh(h, n),
      shieldAll: (n) => g.heroes.forEach((q) => sh(q, n)),
      hurt: (n) => {
        h.hp = Math.max(1, h.hp - n);
        popNum(h.m.position, n, "#ff6a5a", "RECOIL");
      },
      pips: () => {},
      bonus: () => {},
      focus: () => {},
      taunt: () => (g.taunt = h.id),
      thorns: () => {},
      sanct: () => (g.sanct = 1),
      bond: () => {},
      cleanse: () => {},
      revive: (fr) => {
        const dn = g.heroes.find((q) => q.down);
        if (!dn) return false;
        reviveHero(dn, fr);
        return true;
      },
      reviveAll: (fr) => g.heroes.filter((q) => q.down).forEach((q) => reviveHero(q, fr)),
      nAl: () => 0,
      allies: () => [],
      rally: async () => {},
      call: async () => {},
      draw: () => {},
    });
  }
  // run an animation as cast by someone else (SFXO steers lanternAt / charge / casterP; alive() reads o.L)
  async function runAs(o, fn) {
    const s0 = SFXO,
      f0 = FXP;
    SFXO = o;
    try {
      await fn();
    } catch (e) {
      console.warn("spell path fx", e);
    } finally {
      if (SFXO === o) SFXO = s0;
      FXP = f0;
    }
  }
  const play = async (d, x) => {
    try {
      await SPFX.A[d.fx](x);
    } catch (e) {
      console.warn("spell path fx", d.k, e);
    }
  };
  // ===================================================================================================================
  // REGISTER THE CARDS (and retire the old ones)
  // ===================================================================================================================
  const KEEP = { cwisp: 1, cbogl: 1, cskel: 1, cbogm: 1, cdrown: 1 };
  Object.keys(SPL).forEach((k) => {
    if (K[k] || KEEP[k]) return;
    const s = SPL[k];
    if (s.rl) s.rl = "old";
    else s.cl = "old";
    s.old = 1;
    delete s.q; // their quests no longer hand out a retired card
  });
  function refresh(k) {
    const d = K[k],
      s = SPL[k];
    if (!d || !s) return;
    const c = d.card(flags(runeOf(k)));
    s.n = c.n;
    s.c = c.c;
    s.t = c.t;
    s.aoe = c.aoe ? 1 : 0;
  }
  const refreshAll = () => ORDER.forEach(refresh);
  ORDER.forEach((k) => {
    const d = K[k],
      c = d.card(flags(""));
    SPL[k] = { n: c.n, c: c.c, t: c.t, a: d.el, ty: d.ty, lv: d.lv, cl: d.cl, st: 1, aoe: c.aoe ? 1 : 0, vx: 1 };
    if (d.dm) CDMG[k] = (n, al) => d.dm(flags(runeOf(k)), n, al);
    if (d.ty !== "sum") {
      CFX[k] = async (f) => {
        const x = ctxL(d, f);
        await play(d, x);
        await d.eff(x);
      };
      SFXK[k] = (f, L) => SPFX.A[d.fx]({ f: f || L[0], L: L || [f], r: flags("") });
    }
    CCOL[k] = d.col;
    if (SPFX.ART2[k]) CARTX[k] = SPFX.ART2[k];
    try {
      ART[k] = cardArt(k).toDataURL();
    } catch (e) {}
  });
  // ===================================================================================================================
  // SUMMONS: Lantern Wisp and Revenant Knight
  // ===================================================================================================================
  const sm0 = summon;
  summon = async function (t) {
    const d = K[t];
    if (!d || d.ty !== "sum") return sm0(t);
    const r = flags(runeOf(t)),
      n = t === "lwisp" && r.b1 && freeSlot() >= 0 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      if (i && freeSlot() < 0) break;
      const slot = freeSlot();
      if (slot >= 0) SPFX.A.sumIn(new T.Vector3(SLA[slot][0], 0, SLA[slot][1]), EHX[d.el] || 0xc9a0ff);
      await sm0(t);
      const s = g.allies.filter((a) => a.t === t).pop();
      if (!s) continue;
      s.rx = r;
      const k = t === "lwisp" ? (r.b1 ? 16 / 24 : 1) : r.a1 ? 95 / 60 : 1;
      s.max = s.hp = Math.round(s.max * k);
    }
    if (t === "revn" && r.a2)
      g.heroes.forEach((q) => {
        if (!q.down) addShield(q, 15);
      });
  };
  const a00 = act0;
  act0 = async function (s, f, t) {
    if (t === "lwisp") return wispAct(s, f);
    if (t === "revn") return revAct(s, f);
    if (t === "pfang") return fangAct(s, f);
    if (t === "gcat") return catAct(s);
    if (t === "rhorn") return hornAct(s, f);
    if (t === "mback") return mossAct(s);
    if (t === "sfox") return foxAct(s, f);
    return a00(s, f, t);
  };
  // Galecat: rears up and roars, lightning forks from its jaws to every foe
  async function catAct(s) {
    const tg = alive();
    if (!tg.length) return;
    const m = s.m,
      ud = m.userData;
    await tw(260, (k) => (ud.rise = ud.jk = k));
    const p = m.position.clone().setY(2.6);
    shk = 0.35;
    tg.forEach((q) => {
      zap(p, chest(q), 0xbcd4ff, 300, { w: 0.05, forks: 2, jit: 0.6, end: 2 });
      glowBurst(chest(q), 0xbcd4ff, 2.6, 320);
    });
    await wait(160);
    tg.forEach((q) => {
      dmg(q, 9, "storm");
      stun(q, 0.2);
    });
    await resolve();
    await tw(260, (k) => (ud.rise = ud.jk = 1 - k));
  }
  // Rimehorn: rears, then stamps; the ground cracks and ice bursts under the foe
  async function hornAct(s, f) {
    if (!f || f.hp <= 0) return;
    const m = s.m,
      ud = m.userData;
    await tw(320, (k) => (ud.rise = Math.sin((k * Math.PI) / 2)));
    await tw(110, (k) => (ud.rise = 1 - k));
    shk = 0.55;
    const c = chest(f);
    shock(m.position.clone().setY(0), 0x9fe8ff, 3, 420);
    shock(f.m.position.clone().setY(0), 0x9fe8ff, 2.4, 420);
    burst(c, 0xcff4ff, 18, 5, { s: 0.3 });
    fling(c, 6, 4, { col: 0xdff8ff, em: 0x6ac8ff, sz: 0.12 });
    glowBurst(c, 0x9fe8ff, 3.5, 360);
    dmg(f, 14, "ice");
    chill(f, 1);
    await resolve();
  }
  // Mossback: rises on its hind legs, flowers open round it and the party is healed
  async function mossAct(s) {
    const m = s.m,
      ud = m.userData,
      p = m.position.clone().setY(0);
    await tw(320, (k) => (ud.rise = k * 0.7));
    SPFX.flowers(p, 9);
    glowBurst(p.clone().setY(2), 0x9affc0, 3, 420);
    partyHeal(8, 6);
    await wait(260);
    await tw(260, (k) => (ud.rise = 0.7 * (1 - k)));
  }
  // Soulfox: crouches, streaks through the foe in a blur of spirit light, springs back
  async function foxAct(s, f) {
    if (!f || f.hp <= 0) return;
    const m = s.m,
      ud = m.userData,
      p0 = m.position.clone(),
      to = f.m.position.clone().setY(p0.y),
      past = to.clone().add(new T.Vector3(1.6, 0, 0));
    await tw(160, (k) => (ud.ck = k));
    await tw(220, (k) => {
      m.position.lerpVectors(p0, to, k);
      ud.ck = 1 - k;
      ud.lp = Math.sin(k * Math.PI * 0.5);
    });
    const c = chest(f);
    glowBurst(c, 0xd8b0ff, 3.5, 360);
    burst(c, 0xc9a0ff, 16, 5, { s: 0.3 });
    dmg(f, 14, "spirit");
    g.allies.forEach((a) => a !== s && healA(a, 5));
    await tw(120, (k) => m.position.lerpVectors(to, past, k));
    await resolve();
    await tw(300, (k) => {
      m.position.lerpVectors(past, p0, k);
      m.position.y = p0.y + Math.sin(k * Math.PI) * 1.2;
      ud.lp = Math.sin(k * Math.PI) * 0.5;
    });
    ud.lp = ud.ck = 0;
  }
  // Hearthfang: crouch, leap in an arc onto the foe with its jaws open, bite in a burst of fire, bound back
  async function fangAct(s, f) {
    if (!f || f.hp <= 0) return;
    const m = s.m,
      ud = m.userData,
      p0 = m.position.clone(),
      to = f.m.position.clone();
    to.x -= 1.8;
    to.y = p0.y;
    await tw(240, (k) => (ud.ck = k));
    await tw(340, (k) => {
      m.position.lerpVectors(p0, to, k);
      m.position.y = p0.y + Math.sin(k * Math.PI) * 1.6;
      ud.ck = 1 - Math.min(1, k * 3);
      ud.lp = Math.sin(k * Math.PI);
      ud.jk = k;
    });
    ud.lp = 0;
    shk = 0.5;
    const c = chest(f);
    glowBurst(c, 0xffb050, 4.5, 380);
    burst(c, 0xff7a2a, 20, 6, { s: 0.35 });
    shock(f.m.position.clone().setY(0), 0xff8a3d, 2.6, 420);
    dmg(f, 18, "fire");
    burn(f, 1);
    await resolve();
    await tw(160, (k) => (ud.jk = 1 - k));
    await tw(300, (k) => {
      m.position.lerpVectors(to, p0, k);
      m.position.y = p0.y + Math.sin(k * Math.PI) * 0.9;
      ud.lp = Math.sin(k * Math.PI) * 0.5;
    });
    ud.lp = ud.ck = ud.jk = 0;
  }
  async function wispAct(s, f) {
    const r = s.rx || flags(""),
      tg = r.a2 ? alive() : [f].filter((q) => q && q.hp > 0);
    if (!tg.length) return;
    const p = s.m.position.clone(),
      ud = s.m.userData;
    if (ud.halo) await tw(220, (k) => ud.halo.scale.setScalar(1.6 + k * 1.6));
    tg.forEach((q) => {
      zap(p, chest(q), 0xc9a0ff, 260, { w: 0.035, forks: 0, jit: 0.5, end: 2 });
      glowBurst(chest(q), 0xc9a0ff, 2.4, 300);
    });
    if (ud.halo) ud.halo.scale.setScalar(1.6);
    await wait(150);
    const n = r.a2 ? 6 + (r.b2 ? 4 : 0) : (r.b1 ? 9 : 12) + (r.b2 ? 8 : 0);
    tg.forEach((q) => dmg(q, n, "spirit"));
    if (r.a1) healP(5);
    await resolve();
  }
  async function revAct(s, f) {
    if (!f || f.hp <= 0) return;
    const r = s.rx || flags(""),
      m = s.m,
      sw = m.userData.sw,
      p0 = m.position.clone(),
      to = f.m.position.clone();
    to.x -= 1.5;
    to.y = p0.y;
    await tw(280, (k) => {
      m.position.lerpVectors(p0, to, k);
      if (sw) sw.rotation.x = 0.3 - k * 1.9; // raise the blade
    });
    if (sw) await tw(140, (k) => (sw.rotation.x = -1.6 + k * 3.2));
    shk = 0.45;
    slash(f.m.position);
    vshock(chest(f), 0xc9a0ff, 1.5, 280);
    burst(chest(f), 0xc9a0ff, 12, 5, { s: 0.3 });
    const n = r.b1 ? 26 : 16;
    dmg(f, n, "spirit");
    if (r.b2)
      alive().forEach((q) => {
        if (q === f) return;
        dmg(q, Math.round(n / 2), "spirit");
        glowBurst(chest(q), 0xc9a0ff, 2, 260);
      });
    await resolve();
    await tw(240, (k) => {
      m.position.lerpVectors(to, p0, k);
      if (sw) sw.rotation.x = 1.6 - k * 1.3;
    });
  }
  const sh0 = sumMesh;
  sumMesh = function (t) {
    if (t === "lwisp") return SPFX.lanternWisp();
    if (t === "revn") return SPFX.revenant();
    if (t === "pfang") return SPFX.hearthfang();
    if (BEASTK.includes(t) && typeof BESTIA !== "undefined") return BESTIA.summon(t);
    return sh0.apply(this, arguments);
  };
  const si0 = sumIdle0;
  sumIdle0 = function (u, i, s) {
    if (BEASTK.includes(u.t) && typeof BESTIA !== "undefined") return BESTIA.idle(u, i, s);
    if (u.t === "lwisp" || u.t === "revn" || u.t === "pfang") return SPFX.idle(u, i, s);
    return si0.apply(this, arguments);
  };
  // ===================================================================================================================
  // CO-OP: your runes ride along with your card, and the host plays remote kit spells properly
  // ===================================================================================================================
  const ns0 = NET.send;
  NET.send = function (t, d) {
    if (t === "act" && d && K[d.k] && d.rn == null) d.rn = runeOf(d.k);
    return ns0.apply(this, arguments);
  };
  const ha0 = heroAction;
  heroAction = async function (h, a) {
    const d = K[a && a.k];
    if (!d || h.local) return ha0.apply(this, arguments);
    if (h.down || !alive().length) return;
    const r = flags(a.rn),
      cd = d.card(r),
      el = d.el,
      f = g.foes[a.tgt] && g.foes[a.tgt].hp > 0 ? g.foes[a.tgt] : alive()[0];
    log(h.name + " casts " + cd.n + ".");
    banner(h.name + ": " + cd.n, d.ty);
    h.cT = 0.6;
    glowBurst(h.m.position.clone().setY(2), EHX[el] || 0xffd27a, 2, 400);
    await wait(220);
    if (d.ty === "atk" && a.ct && h.remote && a.gr == null) a.gr = await remoteCharge(h, a, el, f);
    if (!alive().length || mode !== "battle") return;
    const qg = d.ty === "atk" && a.gr != null ? Math.max(0, Math.min(2, a.gr | 0)) : 1,
      list = cd.aoe ? alive() : [f].filter(Boolean);
    bfxSend(
      h.slot,
      el,
      d.ty === "atk" ? list.map((q) => g.foes.indexOf(q)) : [],
      d.ty === "sup" && el === "heal",
      h.id,
      a.k,
      d.ty === "atk" && a.gr != null ? qg : -1,
    );
    if (d.ty === "atk" && a.gr != null && qg !== 1)
      popNum(
        h.m.position,
        qg === 2 ? "★" : "",
        qg === 2 ? "#ffe066" : "#bbb",
        qg === 2 ? "PERFECT!" : "MISSED",
        qg === 2,
      );
    const x = ctxR(d, h, f, qg, r, cd.aoe);
    if (d.ty === "sum") {
      // their summon lives on their screen; here it lands one spirit strike
      await heroBolt(h, f, el);
      x.hit(f, 12);
    } else {
      x.L = list.length ? list : alive();
      await runAs({ src: h.m.position.clone().setY(2.2), src0: h.m.position.clone(), L: x.L }, () => SPFX.A[d.fx](x));
      await d.eff(x);
    }
    await resolve();
    ui();
  };
  // ===================================================================================================================
  // PROGRESSION: unlocks, rune steps, the level-up ceremony, leftover choices, Book > Spells
  // ===================================================================================================================
  const kit = (cls) => ORDER.filter((k) => K[k].cl === (cls || P.cls));
  const steps = () => STEPS[P.cls] || [];
  const stepDone = (s) => runeOf(s.k).length > s.ti;
  const pending = () => steps().filter((s) => s.lv <= P.lvl && !stepDone(s));
  function pick(s, ab) {
    if (!P.runes) P.runes = {};
    const cur = runeOf(s.k);
    if (cur.length !== s.ti) return;
    P.runes[s.k] = cur + ab;
    refresh(s.k);
    sv();
  }
  // a kit spell you just reached goes straight into your deck (once; you can take it out again)
  function unlockNew(quiet) {
    if (!P.spxs) P.spxs = {};
    const out = [];
    kit().forEach((k) => {
      if (!useOK(k) || P.spxs[k]) return;
      P.spxs[k] = 1;
      out.push(k);
      if (!P.deck.includes(k)) {
        if (P.deck.filter(useOK).length < dmax()) P.deck.push(k);
        else if (!quiet) toast(SPL[k].n + " learned: make room for it in Book > Spells", ELC[SPL[k].a]);
      }
    });
    return out;
  }
  const cardHTML = (k, top, sub, cls) =>
    '<button class="lcard ' +
    (cls || "") +
    '"><img alt="" src="' +
    ART[k] +
    '"><b>' +
    top +
    "</b><small>" +
    sub +
    "</small></button>";
  // called from lvShow (19-levelup.js) after the "what grew" lines; builds the rest of the ceremony
  function cer(L, q, at, t2) {
    unlockNew(1);
    // only what this level brings: with several levels queued, later ones get their own ceremony
    const news = kit().filter((k) => SPL[k].lv === L),
      st = pending().filter((s) => s.lv <= L)[0],
      box = q(".lvc"),
      go = q(".lgo"),
      hd = q(".lvh");
    const cont = () => {
      if (go.firstChild) return;
      const b = document.createElement("button");
      b.className = "pb";
      b.textContent = "Continue";
      b.onclick = lvClose;
      go.appendChild(b);
      at(150, () => go.classList.add("on"));
    };
    if (news.length) {
      hd.textContent = "New spell" + (news.length > 1 ? "s" : "");
      at(t2, () => hd.classList.add("on"));
      news.forEach((k, i) => {
        const w = document.createElement("div");
        w.innerHTML = cardHTML(k, SPL[k].n, '<span class="pp">◆' + SPL[k].c + "</span> " + SPL[k].t);
        const b = w.firstChild;
        b.style.cursor = "default";
        box.appendChild(b);
        at(t2 + 200 + i * 200, () => b.classList.add("on"));
      });
      at(t2 + 600, cont);
      return true;
    }
    if (st) {
      // v37: the choice itself lives in the rune menu. Only the very first one brings a button straight there.
      hd.innerHTML = 'A rune is ready for <b style="color:#ffd34d">' + K[st.k].n + "</b>";
      at(t2, () => hd.classList.add("on"));
      const nt = document.createElement("div"),
        first = !P.rmenu;
      P.rmenu = 1; // offered once per character, whether or not the button is used
      nt.className = "lvnote";
      nt.innerHTML = first
        ? "Runes reshape your spells. Carve them in the <b>Rune menu</b>.<small>Later on, open it yourself with <b>U</b>, the ✦ Runes button, or Book &gt; Spells.</small>"
        : "Carve it when you're ready: press <b>U</b> or the ✦ Runes button.";
      box.appendChild(nt);
      at(t2 + 200, () => nt.classList.add("on"));
      if (first) {
        at(t2 + 500, () => {
          if (go.firstChild) return;
          const b = document.createElement("button");
          b.className = "pb";
          b.textContent = "Open the Rune menu";
          b.onclick = () => {
            lvClose();
            setTimeout(rmShow, 520);
          };
          go.appendChild(b);
          at(150, () => go.classList.add("on"));
        });
      } else at(t2 + 500, cont);
      return true;
    }
    hd.textContent = "Every spell grows 8% stronger";
    at(t2, () => hd.classList.add("on"));
    at(t2 + 300, cont);
    return true;
  }
  // v37 RUNE MENU: a small side panel (U key, the "Runes" chip, or Book > Spells). Rune choices no longer pop up on
  // their own: the very first level-up that brings one offers a button into this menu (P.rmenu remembers it, per
  // character, so changing school doesn't bring the popups back); after that the chip just shows how many wait.
  function rmCss() {
    if ($("rmcss")) return;
    const st = document.createElement("style");
    st.id = "rmcss";
    st.textContent =
      "#rnm{position:fixed;right:12px;top:70px;width:min(390px,calc(100vw - 24px));max-height:calc(100vh - 170px);" +
      "z-index:60;display:flex;flex-direction:column;border-radius:14px;border:2px solid #6a5424;" +
      "background:linear-gradient(rgba(40,28,16,.96),rgba(20,14,10,.96));color:#fff6dc;font:13px system-ui;" +
      "box-shadow:0 10px 40px rgba(0,0,0,.6);transform:translateX(30px);opacity:0;transition:all .25s}" +
      "#rnm.on{transform:none;opacity:1}" +
      "#rnm .rh{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(255,211,77,.2)}" +
      "#rnm .rh b{font:800 16px Fraunces,Georgia,serif;color:#ffd34d;flex:1}" +
      "#rnm .rh small{color:#d8cba8}#rnm .rx{background:none;border:0;color:#d8cba8;font:700 18px system-ui;cursor:pointer}" +
      "#rnm .rl{overflow:auto;padding:6px 10px 10px}" +
      "#rnm .rs{display:flex;gap:9px;padding:8px 0;border-bottom:1px solid rgba(255,211,77,.12)}" +
      "#rnm .rs img{width:42px;height:42px;border-radius:8px;border:1px solid #6a5424;flex:none}" +
      "#rnm .rs.lk{opacity:.45}#rnm .rs>div{flex:1;min-width:0}" +
      "#rnm .rn{font:800 13.5px Fraunces,Georgia,serif}#rnm .rn i{color:#ffd34d;font-style:normal}" +
      "#rnm .rt{color:#d8cba8;font-size:11.5px;line-height:1.3;margin:2px 0 4px}" +
      "#rnm .rr{font-size:11.5px;margin-top:3px;color:#b9b3e6}#rnm .rr .on{color:#ffd34d;font-weight:800}" +
      "#rnm .ro{display:flex;gap:6px;margin-top:4px}" +
      "#rnm .ro button{flex:1;text-align:left;border-radius:9px;border:1px solid #8a6a2a;cursor:pointer;" +
      "background:linear-gradient(#3a2a16,#22180e);color:#fff6dc;padding:5px 7px;font:11px/1.25 system-ui}" +
      "#rnm .ro button b{display:block;color:#ffd34d;font-size:12px}" +
      "#rnm .ro button:hover{border-color:#ffd34d;box-shadow:0 0 12px rgba(255,211,77,.45)}" +
      "#rnm .ro button.sure{border-color:#ffd34d;background:linear-gradient(#5a4016,#2a1c0c)}" +
      "#rnm .rnew{animation:rnglow 1.6s ease-in-out infinite}" +
      "@keyframes rnglow{50%{box-shadow:0 0 0 2px rgba(255,211,77,.5),0 0 14px rgba(255,211,77,.5)}}" +
      "#rnchip{position:absolute;right:12px;bottom:calc(108px + env(safe-area-inset-bottom,0px));z-index:2;" +
      "display:none;animation:rnglow 1.6s ease-in-out infinite}body.exp #rnchip.on{display:block}";
    document.head.appendChild(st);
  }
  const rmOpen = () => !!$("rnm");
  function rmClose() {
    const d = $("rnm");
    if (!d) return;
    d.id = "";
    d.classList.remove("on");
    setTimeout(() => d.remove(), 260);
  }
  function rmShow() {
    if (!P || !P.cls) return;
    if (typeof mode !== "undefined" && mode !== "explore") return void toast("Carve runes outside battle", "#ffd34d");
    rmCss();
    let d = $("rnm");
    if (!d) {
      d = document.createElement("div");
      d.id = "rnm";
      document.body.appendChild(d);
      requestAnimationFrame(() => d.classList.add("on"));
    }
    rmDraw(d);
  }
  function rmDraw(d) {
    const pn = pending().length;
    let h =
      '<div class="rh"><b>Runes</b><small>' +
      (pn ? pn + " to carve" : "all carved") +
      ' · U</small><button class="rx" title="Close (U / Esc)">✕</button></div><div class="rl">';
    kit().forEach((kk) => {
      const dd = K[kk],
        rn = runeOf(kk),
        ok = P.lvl >= dd.lv;
      h +=
        '<div class="rs' +
        (ok ? "" : " lk") +
        '"><img alt="" src="' +
        ART[kk] +
        '"><div><div class="rn">' +
        SPL[kk].n +
        " <i>◆" +
        SPL[kk].c +
        "</i>" +
        (ok ? "" : ' <small style="color:#b9b3e6">Lv ' + dd.lv + "</small>") +
        '</div><div class="rt">' +
        SPL[kk].t +
        "</div>";
      dd.runes.forEach((rr, ti) => {
        const c = rn[ti],
          tag = "Rune " + (ti ? "II" : "I");
        if (c) {
          const o = c === "a" ? rr[1] : rr[2];
          h +=
            '<div class="rr">' +
            tag +
            ': <span class="on" title="' +
            o[1].replace(/"/g, "") +
            '">' +
            o[0] +
            "</span></div>";
        } else if (!ok || P.lvl < rr[0]) h += '<div class="rr">' + tag + ": unlocks at Lv " + rr[0] + "</div>";
        else if (rn.length < ti) h += '<div class="rr">' + tag + ": carve rune I first</div>";
        else {
          h += '<div class="rr">' + tag + ': choose one (the other is gone)</div><div class="ro">';
          ["a", "b"].forEach((ab) => {
            const o = ab === "a" ? rr[1] : rr[2],
              nc = dd.card(flags(rn + ab));
            h +=
              '<button class="rnew" data-k="' +
              kk +
              '" data-ti="' +
              ti +
              '" data-ab="' +
              ab +
              '" title="' +
              ("Becomes " + nc.n + " (◆" + nc.c + "): " + nc.t).replace(/"/g, "") +
              '"><b>' +
              o[0] +
              "</b><span>" +
              o[1] +
              "</span></button>";
          });
          h += "</div>";
        }
      });
      h += "</div></div>";
    });
    d.innerHTML = h + "</div>";
    d.querySelector(".rx").onclick = rmClose;
    d.querySelectorAll(".ro button").forEach((b) => {
      b.onclick = () => {
        // two clicks: the first marks it, the second carves it (a rune can't be undone without reshaping)
        if (!b.classList.contains("sure")) {
          d.querySelectorAll(".ro button.sure").forEach((o) => {
            o.classList.remove("sure");
            o.lastChild.textContent = o.dataset.t;
          });
          b.classList.add("sure");
          b.dataset.t = b.lastChild.textContent;
          b.lastChild.textContent = "Click again to carve";
          return;
        }
        const s = steps().find((q) => q.k === b.dataset.k && q.ti === +b.dataset.ti);
        if (!s) return;
        pick(s, b.dataset.ab);
        const sp = SPL[s.k];
        toast(sp.n + ": " + (b.dataset.ab === "a" ? s.A : s.B)[0], ELC[sp.a]);
        if (typeof FLAIR !== "undefined") FLAIR.carve(sp.a);
        rmDraw(d);
        chip();
        ui();
      };
    });
  }
  // the little "Runes" button that shows while a choice waits
  function chip() {
    try {
      rmCss();
      let c = $("rnchip");
      if (!c) {
        c = document.createElement("button");
        c.id = "rnchip";
        c.className = "pb";
        c.onclick = () => (rmOpen() ? rmClose() : rmShow());
        ($("stage") || document.body).appendChild(c);
      }
      const n = typeof SLOT !== "undefined" && SLOT >= 0 && P && P.cls ? pending().length : 0;
      c.textContent = "✦ Runes · " + n;
      c.title = n + " rune choice" + (n > 1 ? "s" : "") + " waiting (U)";
      c.classList.toggle("on", n > 0 && mode === "explore");
      if (rmOpen() && mode !== "explore") rmClose();
    } catch (e) {}
  }
  setInterval(chip, 1000);
  addEventListener("keydown", (e) => {
    const k = (e.key || "").toLowerCase();
    if (e.repeat || typeof SLOT === "undefined" || SLOT < 0) return;
    if (k === "escape" && rmOpen()) return rmClose();
    if (k !== "u" || mode !== "explore" || LVU.el) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (rmOpen()) rmClose();
    else if (!paused) rmShow();
  });
  // start of a session: retire old cards from the deck, own the kit, add what you've reached, apply runes
  const sg0 = startGame;
  startGame = function () {
    const r = sg0.apply(this, arguments);
    try {
      if (!P.runes) P.runes = {};
      // retired cards bought with school points go back (the points are free again), and "A Page from Wren", given
      // with the old spell lessons, can be handed in by anyone who already took it
      Object.keys(P.tpx || {}).forEach((k) => SPL[k] && SPL[k].old && delete P.tpx[k]);
      const wq = QS.findIndex((q) => q.wren);
      if (wq >= 0 && P.qa && P.qa[wq] != null && !(P.done && P.done[wq])) P.wrenL = Math.max(P.wrenL || 0, 1);
      P.deck = (P.deck || []).filter(useOK);
      kit().forEach((k) => (P.lib[k] = 1));
      unlockNew(1);
      refreshAll();
      if (!P.spx0) {
        P.spx0 = 1;
        if (P.lvl > 1)
          setTimeout(() => toast("Your spells were reforged into Spell Paths: see Book > Spells", "#ffd34d"), 3000);
      }
      sv();
      ui();
    } catch (e) {
      console.warn("spell paths start", e);
    }
    return r;
  };
  // Book > Spells: the paths, the runes you carved, and a way to reshape them
  const reshapeFee = () => 30 * P.lvl;
  const p0 = panel;
  panel = function (k) {
    p0.apply(this, arguments);
    try {
      if (k !== "book" || BOOKL.last !== "spells") return;
      const Lst = $("pl");
      if (!Lst || !P.cls) return;
      const sec = document.createElement("div");
      let h = '<div class="sec">Spell Paths: ' + CL[P.cls][1] + "</div>";
      kit().forEach((kk) => {
        const d = K[kk],
          rn = runeOf(kk),
          ok = P.lvl >= d.lv;
        h +=
          '<div class="row"><img alt="" src="' +
          ART[kk] +
          '"><div><b>' +
          SPL[kk].n +
          ' <span style="color:#ffd34d">◆' +
          SPL[kk].c +
          "</span>" +
          (ok ? "" : ' <span style="color:#b9b3e6;font-size:11px">Lv ' + d.lv + "</span>") +
          "</b><small>" +
          SPL[kk].t +
          "<br>" +
          d.runes
            .map((rr, ti) => {
              const c = rn[ti],
                L2 = (o, on) =>
                  '<span title="' +
                  o[1].replace(/"/g, "") +
                  '" style="' +
                  (on
                    ? "color:#ffd34d;font-weight:800"
                    : c
                      ? "opacity:.35;text-decoration:line-through"
                      : "color:#d8cba8") +
                  '">' +
                  o[0] +
                  "</span>";
              return "Lv " + rr[0] + ": " + L2(rr[1], c === "a") + " / " + L2(rr[2], c === "b");
            })
            .join(" · ") +
          "</small></div></div>";
      });
      sec.innerHTML = h;
      {
        const pn = pending().length,
          row = document.createElement("div"),
          b = document.createElement("button");
        row.className = "row";
        row.innerHTML =
          "<div><b>Rune menu</b><small>" +
          (pn ? pn + " rune choice" + (pn > 1 ? "s" : "") + " waiting." : "Every rune you can carve is carved.") +
          " Also opens with U while exploring.</small></div>";
        b.className = "pb";
        b.textContent = pn ? "Carve runes (" + pn + ")" : "View runes";
        b.onclick = () => {
          $("pc").click();
          setTimeout(rmShow, 60);
        };
        row.appendChild(b);
        sec.appendChild(row);
      }
      const anyR = kit().some((kk) => runeOf(kk));
      if (anyR) {
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML =
          "<div><b>Reshape runes</b><small>Clears every rune you have carved for your school; choose them again in the Rune menu. Costs" +
          reshapeFee() +
          " " +
          CUR.n +
          ".</small></div>";
        const b = document.createElement("button");
        b.className = "pb";
        b.textContent = "Reshape (" + CUR.ic + reshapeFee() + ")";
        b.disabled = P.gold < reshapeFee();
        b.onclick = () => {
          if (P.gold < reshapeFee()) return;
          if (!b.dataset.sure) {
            b.dataset.sure = 1;
            b.textContent = "Click again to reshape";
            return;
          }
          P.gold -= reshapeFee();
          kit().forEach((kk) => delete P.runes[kk]);
          refreshAll();
          sv();
          toast("Your runes fade. Choose them anew.", "#ffd34d");
          panel("book", "spells");
        };
        row.appendChild(b);
        sec.appendChild(row);
      }
      Lst.insertBefore(sec, Lst.children[1] || null);
    } catch (e) {
      console.warn("spell paths book", e);
    }
  };
  return { K, STEPS, cer, refresh, refreshAll, pending, runeOf, flags, unlockNew, menu: rmShow, menuClose: rmClose };
})();
