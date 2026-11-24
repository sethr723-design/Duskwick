// DUSKWICK - 19-levelup.js: v21 level-up ceremony and earned spells.
// Loaded in order by index.html as plain scripts; they share one global scope.
// lvup() (06) pushes every new level onto P.lvq. Once you're back exploring, each one plays a short ceremony: a pillar
// of light, the new level number, what grew (max HP, spellbook slots), a full heal, and +1 spell lesson (P.lessons).
// Lessons are spent with Wren the spellwright (the spell shop in 07-gear-ui.js) on any card of your school for free;
// that is how new cards are earned (quests hand out their own, and glimmers buy the rest).
const LVU = { el: null, busy: 0, lv: 0 };
// the spells a level-L character of your school could pick: not owned, not quest rewards, newest first
function lvPool(L) {
  return Object.keys(SPL)
    .filter((k) => {
      const s = SPL[k];
      return clsOK(k) && !has(k) && s.q == null && (s.lv || 99) <= L;
    })
    .sort((a, b) => (SPL[b].lv || 0) - (SPL[a].lv || 0) || (SPL[a].rl ? 1 : 0) - (SPL[b].rl ? 1 : 0))
    .slice(0, 3);
}
function lvStyle() {
  if ($("lvcss")) return;
  const st = document.createElement("style");
  st.id = "lvcss";
  st.textContent =
    "#lvup{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;" +
    "background:radial-gradient(ellipse at center,rgba(60,40,10,.55),rgba(8,6,20,.88));opacity:0;transition:opacity .5s;" +
    "font-family:system-ui;color:#fff6dc;padding:16px;box-sizing:border-box}" +
    "#lvup.on{opacity:1}" +
    "#lvup .lvbox{text-align:center;max-width:640px;width:100%}" +
    "#lvup .lvk{font:800 15px system-ui;letter-spacing:.5em;color:#ffd34d;opacity:0;transform:translateY(10px);" +
    "transition:all .6s}#lvup .lvk.on{opacity:1;transform:none}" +
    "#lvup .lvn{font:900 120px Fraunces,Georgia,serif;line-height:1;color:#ffe9a8;text-shadow:0 0 30px #ffb830," +
    "0 0 70px rgba(255,170,40,.6);transform:scale(0);transition:transform .7s cubic-bezier(.2,1.6,.4,1)}" +
    "#lvup .lvn.on{transform:scale(1)}" +
    "#lvup .lvs{margin:14px auto 6px;max-width:420px}" +
    "#lvup .lvs div{opacity:0;transform:translateX(-14px);transition:all .45s;padding:5px 0;font:600 15px system-ui;" +
    "border-bottom:1px solid rgba(255,211,77,.18)}#lvup .lvs div.on{opacity:1;transform:none}" +
    "#lvup .lvs b{color:#ffd34d}" +
    "#lvup .lvh{font:800 13px system-ui;letter-spacing:.2em;text-transform:uppercase;color:#e8c777;margin:16px 0 8px;" +
    "opacity:0;transition:opacity .5s}#lvup .lvh.on{opacity:1}" +
    "#lvup .lvc{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}" +
    "#lvup .lcard{width:150px;border-radius:12px;border:2px solid #6a5424;background:linear-gradient(#2e2216,#17110c);" +
    "padding:8px;cursor:pointer;opacity:0;transform:translateY(30px) rotate(-4deg);transition:all .5s;color:#fff6dc;" +
    "font:inherit;text-align:center}" +
    "#lvup .lcard.on{opacity:1;transform:none}#lvup .lcard:hover{border-color:#ffd34d;transform:translateY(-6px);" +
    "box-shadow:0 0 22px rgba(255,211,77,.45)}" +
    "#lvup .lcard img{width:100%;aspect-ratio:1;border-radius:8px;display:block}" +
    "#lvup .lcard b{display:block;font:800 14px Fraunces,Georgia,serif;margin:6px 0 2px}" +
    "#lvup .lcard small{display:block;font-size:11.5px;color:#d8cba8;line-height:1.3}" +
    "#lvup .lcard .pp{color:#ffd34d;font-weight:800}" +
    "#lvup .lcard.pick{border-color:#ffd34d;transform:scale(1.12);box-shadow:0 0 40px #ffd34d}" +
    "#lvup .lcard.gone{opacity:0;transform:scale(.8)}" +
    "#lvup .lgo{margin-top:16px;opacity:0;transition:opacity .5s}#lvup .lgo.on{opacity:1}" +
    "#lvup .lvnote{opacity:0;transition:opacity .6s;font:600 15px system-ui;max-width:440px;margin:0 auto}#lvup .lvnote.on{opacity:1}#lvup .lvnote b{color:#ffd34d}#lvup .lvpeek{display:flex;gap:8px;justify-content:center;margin:10px 0 4px}#lvup .lvpeek img{width:54px;height:54px;border-radius:8px;border:1px solid #6a5424;opacity:.85}#lvup .lvnote small{display:block;color:#d8cba8;font-size:12px}";
  document.head.appendChild(st);
}
// play the ceremony for the oldest level still waiting
function lvShow() {
  if (LVU.busy || !P || !(P.lvq || []).length) return;
  if (typeof SLOT === "undefined" || SLOT < 0 || mode !== "explore" || paused) return; // try again from the timer
  lvStyle();
  LVU.busy = 1;
  const L = P.lvq[0];
  LVU.lv = L;
  paused = true;
  jend();
  g.hp = mhp();
  // light and sparks around you
  const wp = W.position.clone(),
    col = 0xffd34d;
  pillar(wp, col, 1.1, 14, 2200);
  shock(wp, col, 3.6, 900);
  setTimeout(() => shock(wp, 0xffffff, 2.2, 700), 350);
  glowBurst(wp.clone().setY(1.6), col, 6, 1200);
  puff(wp.clone().setY(1.4), "heal", 30, 3.5, 1.2, 1.2);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 6.283;
    mote(new T.Vector3(wp.x + Math.cos(a) * 2.6, 0.3, wp.z + Math.sin(a) * 2.6), {
      c: col,
      v: [-Math.cos(a) * 1.5, 3 + Math.random() * 2.5, -Math.sin(a) * 1.5],
      l: 1.4,
      s: 0.4,
    });
  }
  // the card
  const d = document.createElement("div");
  d.id = "lvup";
  d.innerHTML =
    '<div class="lvbox"><div class="lvk">Level up</div><div class="lvn">' +
    L +
    '</div><div class="lvs"></div><div class="lvh"></div><div class="lvc"></div>' +
    '<div class="lgo"></div></div>';
  document.body.appendChild(d);
  LVU.el = d;
  const q = (s) => d.querySelector(s),
    at = (ms, f) => setTimeout(() => LVU.el === d && f(), ms);
  requestAnimationFrame(() => d.classList.add("on"));
  at(250, () => q(".lvk").classList.add("on"));
  at(600, () => q(".lvn").classList.add("on"));
  // what grew
  const tank = P.role === "tank",
    hpUp = Math.round(10 * (tank ? 1.4 : 1)),
    dm = (l) => Math.min(10, 5 + Math.floor(l / 2)),
    pool = lvPool(L),
    lines = ["Max HP <b>" + mhp() + "</b> (+" + hpUp + ")", "Health <b>fully restored</b>"];
  if (dm(L) > dm(L - 1)) lines.push("Spellbook <b>" + dm(L) + " slots</b> (+1)");
  if (P.lvl >= lcap()) lines.push("<b>Level cap reached</b> · continue the ★ story to grow further");
  lines.forEach((h, i) => {
    const e = document.createElement("div");
    e.innerHTML = h;
    q(".lvs").appendChild(e);
    at(1300 + i * 320, () => e.classList.add("on"));
  });
  const t2 = 1300 + lines.length * 320 + 300;
  // v32 Spell Paths (45-spellpaths.js): a new spell or a rune choice instead of a spell lesson
  if (typeof SPATH !== "undefined" && SPATH.cer(L, q, at, t2)) return ui();
  // v21: no picking here - the level gives you a spell lesson to spend with Wren the spellwright
  q(".lvh").textContent = "+1 spell lesson";
  at(t2, () => q(".lvh").classList.add("on"));
  const nt = document.createElement("div");
  nt.className = "lvnote";
  nt.innerHTML =
    "Visit <b>Wren the spellwright</b> in Lamplight Square to learn a new spell with it." +
    (pool.length
      ? '<div class="lvpeek">' +
        pool.map((k) => '<img alt="" title="' + SPL[k].n + '" src="' + ART[k] + '">').join("") +
        "</div><small>" +
        pool.map((k) => SPL[k].n).join(" · ") +
        " and more are waiting.</small>"
      : "<small>Nothing new for your school yet; keep the lesson for later.</small>");
  q(".lvc").appendChild(nt);
  at(t2 + 300, () => nt.classList.add("on"));
  const b = document.createElement("button");
  b.className = "pb";
  b.textContent = "Continue";
  b.onclick = lvClose;
  q(".lgo").appendChild(b);
  at(t2 + 700, () => q(".lgo").classList.add("on"));
  ui();
}
function lvClose() {
  const d = LVU.el;
  if (!d) return;
  LVU.el = null;
  if (P.lvq && P.lvq[0] === LVU.lv && typeof SPATH !== "undefined")
    P.lvq.shift(); // v32: no spell lessons
  else if (P.lvq && P.lvq[0] === LVU.lv) {
    P.lvq.shift();
    P.lessons = (P.lessons || 0) + 1; // spent at Wren's (07-gear-ui.js, the spell shop)
    toast("Spell lesson ready: visit Wren the spellwright", "#ffd34d");
    // the first lesson comes with the quest that walks you to Wren (and tracks him on the map)
    const wq = QS.findIndex((q) => q.wren);
    if (wq >= 0 && P.qa[wq] == null && !P.done[wq]) {
      qacc(wq);
      P.trk = wq;
      toast('New quest: "' + QS[wq].n + '"', "#ffd34d");
    }
  }
  sv();
  d.classList.remove("on");
  setTimeout(() => d.remove(), 500);
  if ($("panel").style.display !== "flex") paused = false;
  LVU.busy = 0;
  ui();
}
// Enter / Space continues
addEventListener("keydown", (e) => {
  if (!LVU.el) return;
  if ((e.key === "Enter" || e.key === " ") && LVU.el.querySelector(".lgo.on")) lvClose();
  e.stopPropagation();
});
// waiting levels (after a battle, or left over from last session) play once you're free to watch
setInterval(lvShow, 1200);
