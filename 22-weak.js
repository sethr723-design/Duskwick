// v23 foe weaknesses, made readable: a small badge floats above each foe's battle plate showing what it is WEAK to
// (pink) and what it RESISTs (slate). The table itself (WKT, weakOf, weakTxt) lives in 08-battle.js next to dmg().
// This wraps tagUpd/undeco (02-models.js) instead of editing them: deco() calls the global tagUpd, so it gets the wrapper.
// Bestiary (Book > Quests > Bestiary, 07): weakness line for a foe name, shown once you've beaten one
function wkName(nm) {
  const gi = NAMES.indexOf(nm),
    db = DUN.find((d) => d.boss.nm === nm),
    sp =
      gi >= 0
        ? { kind: "gloom", t: gi + 1 }
        : db
          ? db.boss
          : /Frost Wolf$/.test(nm)
            ? { kind: "wolf" }
            : /Ember Hound$/.test(nm)
              ? { kind: "hound" }
              : { Emberling: { min: "ember" }, "Kiln Imp": { min: "ember" }, "Gloom Knight": { min: "knight" } }[nm] ||
                (DUN.find((d) => d.mins && d.mins.nm === nm) || {}).mins;
  return sp ? String(weakTxt(sp)).trim() : "";
}
(() => {
  const up0 = tagUpd,
    un0 = undeco;
  function badge(e) {
    const w = weakOf(e);
    if (!w) return null;
    const a = Object.keys(w).filter((k) => w[k] > 1),
      b = Object.keys(w).filter((k) => w[k] < 1);
    if (!a.length && !b.length) return null;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 40;
    const x = c.getContext("2d");
    x.textBaseline = "middle";
    x.font = "800 17px system-ui";
    const parts = [];
    if (a.length) parts.push(["WEAK ", a.map((k) => WKI[k] || k).join(""), "#ff5ab4"]);
    if (b.length) parts.push(["RESIST ", b.map((k) => WKI[k] || k).join(""), "#a9b6c9"]);
    const wd = parts.map((p) => x.measureText(p[0] + p[1]).width + 16),
      tot = wd.reduce((s, v) => s + v, 0) + (parts.length - 1) * 6;
    let px = Math.max(2, 128 - tot / 2);
    parts.forEach((p, i) => {
      x.fillStyle = "rgba(20,8,16,.82)";
      x.beginPath();
      x.moveTo(px + 10, 3);
      x.arcTo(px + wd[i], 3, px + wd[i], 37, 10);
      x.arcTo(px + wd[i], 37, px, 37, 10);
      x.arcTo(px, 37, px, 3, 10);
      x.arcTo(px, 3, px + wd[i], 3, 10);
      x.fill();
      x.strokeStyle = p[2];
      x.lineWidth = 2;
      x.stroke();
      x.fillStyle = p[2];
      x.textAlign = "left";
      x.fillText(p[0], px + 8, 21);
      x.fillStyle = "#fff";
      x.fillText(p[1], px + 8 + x.measureText(p[0]).width, 21);
      px += wd[i] + 6;
    });
    const tx = new T.CanvasTexture(c),
      sp = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false }));
    sp.scale.set(2.2, 0.34, 1);
    sp.renderOrder = 5;
    BG.add(sp);
    return sp;
  }
  tagUpd = function (e) {
    up0(e);
    if (!e || !e.foe || !e.tag) return;
    if (e.wkb === undefined) e.wkb = badge(e);
    const s = e.wkb;
    if (!s) return;
    s.position.copy(e.tag.position);
    s.position.y += 0.5;
    s.visible = e.tag.visible !== false && e.hp > 0;
  };
  undeco = function (e) {
    un0(e);
    if (e && e.wkb) {
      if (e.wkb.parent) e.wkb.parent.remove(e.wkb);
      e.wkb.material.map.dispose();
      e.wkb.material.dispose();
    }
    if (e) e.wkb = null; // null (not undefined): a late tagUpd must not rebuild it
  };
})();
