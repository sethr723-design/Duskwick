// DUSKWICK - 25-questgivers.js: v24 quest givers.
// Loaded in order by index.html as plain scripts; they share one global scope. No top-level names (all in the IIFE).
// Oona keeps only urgent work (story quests). Side quests come from a giver in each place: Tamsin of the Lamplighters'
// Guild on Market Lane, Brenna in Frostfen, Vesna in Cinderwaste and Old Maud in Mirewick. Who gives what is qGv() in
// 06-profile-quests.js; the talk panel is the quest-giver branch at the end of panel() (07). Each giver is an NPC of
// kind "q" whose id is its giver key, so npcGv(), the quest marks (05/11) and the tracker (qWhere, 11) find it.
// Added here, after 13-editor.js took its BASE snapshot, so the new scene children don't shift saved editor builds.
// The old zone quest boards stay as scenery beside their giver but are no longer NPCs (no plate, mark or E prompt).
(() => {
  // retire the boards: out of NPCS, and strip the name plate / quest mark / floating marker off the board mesh
  for (let i = NPCS.length - 1; i >= 0; i--) {
    const n = NPCS[i];
    if (n.kind !== "b") continue;
    [n.np, n.qm, n.mkr].forEach((m) => m && n.o.remove(m));
    NPCS.splice(i, 1);
  }
  Object.assign(NNAME, {
    qlane: ["Tamsin", "Lamplighters' Guild"],
    qfrost: ["Brenna", "Frostfen quests"],
    qember: ["Vesna", "Cinderwaste quests"],
    qmarsh: ["Old Maud", "Mirewick quests"],
  });
  // Market Lane east rim at 15 degrees: between the doors of Sage Ilsa's (0) and Pip's (30) shops, which stand at r 24.
  // Hesper's stable is on the west rim (180).
  const a = (Math.PI / 180) * 15;
  [
    // Tamsin: guild coat, lamp on a pole, faces the middle of the plaza
    {
      id: "lane",
      x: OX + Math.cos(a) * 12.5,
      z: OZ + MLZ + Math.sin(a) * 12.5,
      ry: Math.atan2(-Math.cos(a), -Math.sin(a)),
      sp: { robe: 0x2a4a7a, trim: 0xffd27a, hat: "cap", hc: 0x1a2a4a, prop: "lamp", skin: 0xd9a47a, brow: 0x3a2a1a },
    },
    // Brenna: Frostfen's headwoman in furs, beside the old board (east of it)
    {
      id: "frost",
      x: 610.9,
      z: -378.4,
      ry: 0,
      sp: { robe: 0x6a8aa8, trim: 0xe8f4ff, hat: "fur", hc: 0xe8dcc8, prop: "rod", skin: 0xf1c9a5, w: 0.95 },
    },
    // Vesna: Korr's daughter, forge apron and hammer, beside the old board (east of it)
    {
      id: "ember",
      x: -589.1,
      z: -378.4,
      ry: 0,
      sp: {
        robe: 0x7a3a22,
        trim: 0xffb040,
        hat: "band",
        hc: 0xff7a2a,
        apron: 0x4a3426,
        prop: "hammer",
        skin: 0xb07a52,
      },
    },
    // Old Maud: the bog-warden, hooded, with a cane, beside the Mirewick board (west of it)
    {
      id: "marsh",
      x: MWX + 7.4,
      z: MWZ + 16,
      ry: 0,
      sp: { robe: 0x3a5a3a, trim: 0x9affc8, hat: "hood", hc: 0x2a3a2a, prop: "cane", skin: 0xf6d8bc },
    },
  ].forEach(({ id, x, z, ry, sp }) => {
    const o = person(sp);
    const mkr = new T.Sprite(AM(SP.storm));
    mkr.scale.setScalar(1.5);
    mkr.position.y = 4.2;
    o.add(mkr);
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    S.add(o);
    solids.push({ x, z, r: 1.1 });
    const n = { o, kind: "q", id, qg: id, mkr, x, z, ry };
    NPCS.push(n);
    npcPlate(n);
  });
})();
