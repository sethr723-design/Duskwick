// DUSKWICK - 17-hubfolk.js: v19 more townsfolk strolling Lamplight Square.
// Loaded in order by index.html as plain scripts; they share one global scope.
// Added here (after 13-editor.js took its BASE snapshot) so the new scene children don't shift the indices that saved
// editor builds point at. They join VIL, so 05-ambient walks them (stroll, chat in pairs, look at you) and 11-explore
// keeps you from walking through them.
(() => {
  const SKN = [0xf1c9a5, 0xd9a47a, 0xb07a52, 0x8a5a3a, 0xf6d8bc];
  [
    { robe: 0x3a5a9a, hat: "cap", hc: 0x2a3a6a, prop: "mug" },
    { robe: 0x9a6a2a, hat: "round", hc: 0x4a3010, apron: 0xe8e0d0, prop: "sack", beard: 0x8a6a4a, belly: 1 },
    { robe: 0x7a3a6a, hat: "hood", hc: 0x5a2a4a, prop: "cane", beard: 0xdedede },
    { robe: 0x2f7a6a, hat: "fur", hc: 0xe8dcc8, brow: 0x3a2a1a },
    { robe: 0xb0503a, hat: "band", hc: 0xffd27a, prop: "mug" },
    { robe: 0x5a4a8a, hat: "wizard", hc: 0x2a2050, prop: "cane" },
  ].forEach((sp, k) => {
    const o = person(
      Object.assign({ w: 0.88 + 0.07 * (k % 3), trim: [0xe8e0d0, 0xffd27a, 0xb89aff][k % 3], skin: SKN[k % 5] }, sp),
    );
    o.scale.setScalar(0.76 + 0.05 * (k % 3));
    const a = k * 1.05 + 1.1,
      r = 6 + (k % 3) * 2.5;
    o.position.set(OX + Math.cos(a) * r, 0, OZ + Math.sin(a) * r);
    o.rotation.y = a + Math.PI;
    S.add(o);
    VIL.push({ o, w: null, wt: 0, pause: 1 + k * 0.7 });
  });
})();
