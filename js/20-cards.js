// DUSKWICK - 20-cards.js: v21 earned cards - what they do (the cards themselves are in SPL, 02-models.js).
// Loaded in order by index.html as plain scripts; they share one global scope.
// Three per school, opened by level and picked at a level up (19-levelup.js) or bought at Wren's. Each one reuses an
// existing spell animation, so spectators and guests see it too (SFXK), and its damage is in CDMG so the card shows a
// range and other players' copies hit the same.
Object.assign(CDMG, {
  cinder: () => 28,
  firebrand: () => 50,
  ashstorm: () => 26,
  arc: () => 22,
  ball: () => 50,
  squall: () => 28,
  spike: () => 28,
  glacial: () => 54,
  hail: () => 32,
  sap: () => 22,
  snare: () => 44,
  overgrow: () => 30,
  siphon: (n, al) => 20 + 4 * al,
  plance: (n, al) => 44 + 5 * al,
  requiem: (n, al) => 32 + 5 * al,
});
const stunMaybe = (f, ch, verb) => {
  if (f.hp > 0 && Math.random() < ch) {
    f.stun = true;
    $("log").textContent = "The " + f.label + " is " + verb + "!";
  }
};
Object.assign(CFX, {
  // Pyre
  cinder: async (f) => {
    await SFX.ember(f);
    dmg(f, 28, "fire");
    f.st.burn = Math.max(f.st.burn, 2);
  },
  firebrand: async (f) => {
    const hot = f.st.burn > 0;
    await SFX.meteor(f);
    dmg(f, hot ? 75 : 50, "fire");
    f.st.burn = Math.max(f.st.burn, 2);
  },
  ashstorm: async () => {
    const a = alive();
    await SFX.wave();
    a.forEach((f) => {
      dmg(f, 26, "fire");
      f.st.burn = Math.max(f.st.burn, 2);
    });
  },
  // Gale
  arc: async (f) => {
    await SFX.spark(f);
    dmg(f, 22, "storm");
    stunMaybe(f, 0.2, "stunned");
  },
  ball: async (f) => {
    await SFX.thunder(f);
    dmg(f, 50, "storm");
    stunMaybe(f, 0.45, "stunned");
  },
  squall: async () => {
    const a = alive();
    await SFX.chain(a);
    a.forEach((f) => dmg(f, 28, "storm"));
  },
  // Rimeward
  spike: async (f) => {
    const cold = f.st.chill > 0;
    await SFX.lance(f, 0);
    dmg(f, cold ? 42 : 28, "ice");
    f.st.chill = Math.max(f.st.chill, 1);
  },
  glacial: async (f) => {
    await SFX.lance(f, 1);
    dmg(f, 54, "ice");
    f.st.chill = Math.max(f.st.chill, 2);
  },
  hail: async () => {
    const a = alive();
    await SFX.blizzard();
    a.forEach((f) => {
      dmg(f, 32, "ice");
      f.st.chill = Math.max(f.st.chill, 1);
    });
  },
  // Verdant
  sap: async (f) => {
    await SFX.thorn(f);
    dmg(f, 22, "heal");
    healP(10);
  },
  snare: async (f) => {
    await SFX.briar(f);
    dmg(f, 44, "heal");
    stunMaybe(f, 0.3, "rooted in place");
  },
  overgrow: async () => {
    const a = alive();
    await SFX.bloom();
    a.forEach((f) => dmg(f, 30, "heal"));
    partyHeal(14, 14);
  },
  // Wispcaller
  siphon: async (f) => {
    await SFX.shade(f);
    dmg(f, 20 + 4 * nAll(), "spirit");
    healP(8);
  },
  plance: async (f) => {
    await SFX.haunt(f);
    dmg(f, 44 + 5 * nAll(), "spirit");
  },
  requiem: async () => {
    const a = alive(),
      n = nAll();
    await SFX.wail();
    a.forEach((f) => dmg(f, 32 + 5 * n, "spirit"));
  },
});
Object.assign(SFXK, {
  cinder: (f) => SFX.ember(f),
  firebrand: (f) => SFX.meteor(f),
  ashstorm: () => SFX.wave(),
  arc: (f) => SFX.spark(f),
  ball: (f) => SFX.thunder(f),
  squall: (f, L) => SFX.chain(L),
  spike: (f) => SFX.lance(f, 0),
  glacial: (f) => SFX.lance(f, 1),
  hail: () => SFX.blizzard(),
  sap: (f) => SFX.thorn(f),
  snare: (f) => SFX.briar(f),
  overgrow: () => SFX.bloom(),
  siphon: (f) => SFX.shade(f),
  plance: (f) => SFX.haunt(f),
  requiem: () => SFX.wail(),
});
