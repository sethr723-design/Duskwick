// v40 Smoother progression (loads LAST): only top-level name FLOW.
// - Stored light: XP earned while at the story's level cap is banked (P.flow.b) instead of thrown away, and paid out
//   the moment a ★ quest raises the cap.
// - Lamplight's Pull: while you are below the level the next ★ story step asks for, all XP gains +50%.
// - Chapters: the ★ quest line is split into five chapters. The quest tracker shows the chapter, its progress and how
//   far the next level is; finishing a chapter shows a card with what opened up.
// Wraps lvup (06), qdone (06, after 41-dawn's wrap) and trk (11). State in lazy P.flow {b, ch}. No scene objects.
const FLOW = (() => {
  const CH = [
    { n: "The Guttering Lamps", q: [0, 8, 1, 2], u: ["The Gloomway portcullis", "The Hollow Road gate, east"] },
    { n: "The Hollow Road", q: [9, 10], u: ["Frostfen and its streets"] },
    { n: "The Silent Fen", q: [5, 11, 12], u: ["The Ashen Trail", "The Cinderwaste and its streets"] },
    { n: "Hunger Wearing Fire", q: [6, 13, 3], u: ["The Gloomspire's chains are broken"] },
    { n: "The Gloomspire", q: [4, 7, 14], u: [] },
  ];
  const ROM = ["I", "II", "III", "IV", "V"],
    PULL = 0.5;
  let lp = null,
    lpN = "",
    lastXP = null,
    lastLv = null;

  const st = () => {
    if (!P.flow) P.flow = { b: 0, ch: {} };
    if (!P.flow.ch) P.flow.ch = {};
    return P.flow;
  };
  const chDone = (c) => CH[c].q.every((i) => P.done[i]);
  // new character / switched slot: chapters already finished are marked quietly, XP tracking restarts
  function sync() {
    const id = (P.name || "") + "|" + (P.cls || "");
    if (lp === P && lpN === id) return;
    lp = P;
    lpN = id;
    lastXP = P.xp;
    lastLv = P.lvl;
    const s = st();
    CH.forEach((c, k) => {
      if (chDone(k)) s.ch[k] = 1;
    });
  }
  // the chapter you are in: the first one with an unfinished quest (-1 when the story is done)
  const curCh = () => CH.findIndex((c, k) => !chDone(k));
  // the level the next ★ step wants (0 when it wants nothing above you)
  function want() {
    const i = qMain();
    if (i < 0) return 0;
    const q = QS[i];
    let t = q.lv || 0;
    if (i === 4) t = Math.max(t, q.k); // "Rising light": reach level k
    return t > P.lvl ? Math.min(t, lcap()) : 0;
  }
  const needAt = (l) => {
    const L = P.lvl;
    P.lvl = l;
    const n = need();
    P.lvl = L;
    return n;
  };

  // ---------- lvup wrap: catch-up bonus, bank over-cap XP, release it when the cap rises ----------
  const lv0 = lvup;
  lvup = function () {
    sync();
    const s = st();
    // Lamplight's Pull on whatever XP arrived since the last call
    if (lastLv === P.lvl && lastXP != null && P.xp > lastXP && P.lvl < lcap()) {
      const w = want();
      if (w) {
        const b = Math.round((P.xp - lastXP) * PULL);
        if (b > 0) {
          P.xp += b;
          toast("Lamplight's Pull: +" + b + " XP (until Lv " + w + ")", "#ffd34d");
        }
      }
    }
    // work out what the cap would throw away and bank it
    let l = P.lvl,
      x = P.xp;
    const cap = lcap();
    while (x >= needAt(l) && l < cap) {
      x -= needAt(l);
      l++;
    }
    if (l >= cap && x > needAt(l)) s.b = (s.b || 0) + (x - needAt(l));
    const r = lv0.apply(this, arguments);
    if (s.b > 0 && P.lvl < lcap()) {
      const b = s.b;
      s.b = 0;
      P.xp += b;
      toast("Stored light released: +" + b + " XP", "#ffd34d");
      lv0.apply(this, arguments);
    }
    lastXP = P.xp;
    lastLv = P.lvl;
    return r;
  };

  // ---------- chapter card ----------
  let card = null,
    cardT = 0;
  function css() {
    if (document.getElementById("flcss")) return;
    const e = document.createElement("style");
    e.id = "flcss";
    e.textContent =
      "#fcard{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%) scale(.92);z-index:40;min-width:min(340px,86vw);" +
      "max-width:90vw;box-sizing:border-box;padding:18px 26px 16px;text-align:center;color:#ece9ff;cursor:pointer;" +
      "background:radial-gradient(ellipse at top,rgba(70,52,24,.96),rgba(18,13,30,.96) 70%);border:1px solid #ffd34d;" +
      "border-radius:14px;box-shadow:0 0 40px rgba(255,200,90,.35),0 8px 30px rgba(0,0,0,.6);opacity:0;" +
      "transition:opacity .5s,transform .5s}" +
      "#fcard.on{opacity:1;transform:translate(-50%,-50%) scale(1)}" +
      "#fcard small{display:block;font:700 11px system-ui;letter-spacing:.3em;text-transform:uppercase;color:#c9b8ff}" +
      "#fcard h2{margin:4px 0 10px;font:800 28px Fraunces,Georgia,serif;color:#ffe9b0;text-shadow:0 0 18px rgba(255,190,90,.6)}" +
      "#fcard ul{list-style:none;margin:0 0 10px;padding:0;font-size:13px;line-height:1.6}" +
      "#fcard li::before{content:'\\2726  ';color:#ffd34d}" +
      "#fcard .nx{font-size:12px;color:#b9b3e6;border-top:1px solid rgba(255,211,77,.3);padding-top:8px}" +
      "#fcard .nx b{color:#ffd34d}#fcard .tap{font-size:10px;color:#8f88b8;margin-top:6px}" +
      "body.cut #fcard{display:none}" +
      "#qtrk .flch{display:flex;justify-content:space-between;gap:6px;font:700 10px system-ui;letter-spacing:.06em;" +
      "color:#c9b8ff;text-transform:uppercase;border-bottom:1px solid rgba(138,122,216,.4);padding-bottom:3px;margin-bottom:3px}" +
      "#qtrk .flch i{font-style:normal;color:#ffd34d;letter-spacing:1px}" +
      "#qtrk .flxp{color:#9fd6ff;font-size:10px;display:block;margin-top:2px}";
    document.head.appendChild(e);
  }
  function hide() {
    if (!card) return;
    const c = card;
    card = null;
    c.classList.remove("on");
    setTimeout(() => c.remove(), 500);
  }
  function show(k, lines) {
    css();
    hide();
    const d = document.createElement("div"),
      nx = CH[k + 1];
    d.id = "fcard";
    d.innerHTML =
      "<small>Chapter " +
      ROM[k] +
      " complete</small><h2>" +
      CH[k].n +
      "</h2>" +
      (lines.length ? "<ul>" + lines.map((t) => "<li>" + t + "</li>").join("") + "</ul>" : "") +
      (nx ? '<div class="nx">Next: <b>Chapter ' + ROM[k + 1] + " - " + nx.n + "</b></div>" : "") +
      '<div class="tap">Click to continue</div>';
    d.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      hide();
    });
    document.body.appendChild(d);
    card = d;
    requestAnimationFrame(() => d.classList.add("on"));
    clearTimeout(cardT);
    cardT = setTimeout(hide, 9000);
  }

  // ---------- qdone wrap: chapter finished? ----------
  const qd0 = qdone;
  qdone = function (i) {
    sync();
    const was = !!P.done[i],
      cap0 = lcap(),
      r = qd0.apply(this, arguments);
    if (was || !QS[i] || !QS[i].m) return r;
    const s = st(),
      k = CH.findIndex((c) => c.q.includes(i));
    if (k < 0 || s.ch[k] || !chDone(k)) return r;
    s.ch[k] = 1;
    sv();
    if (k === CH.length - 1) return r; // the last chapter ends in the Dawn epilogue (41-dawn)
    const lines = CH[k].u.slice(),
      cap1 = lcap();
    if (cap1 > cap0) lines.push("Level cap raised to " + cap1);
    CH[k].q.forEach((j) => {
      if (QSR[j]) lines.push("Earned: " + QSR[j].n);
    });
    setTimeout(() => show(k, lines), 700);
    return r;
  };

  // ---------- trk wrap: chapter line on the quest tracker ----------
  let lineH = "";
  const tk0 = trk;
  trk = function () {
    const r = tk0.apply(this, arguments);
    try {
      sync();
      const el = $("qtrk");
      if (!el || !el.innerHTML) return r;
      const k = curCh();
      let h = "";
      if (k >= 0) {
        const c = CH[k],
          dots = c.q.map((i) => (P.done[i] ? "●" : "○")).join("");
        h = "<span>Chapter " + ROM[k] + " · " + c.n + "</span><i>" + dots + "</i>";
      }
      let xp = "";
      const s = st(),
        cap = lcap();
      if (P.lvl >= cap && P.lvl < 20)
        xp = "Lv " + P.lvl + " is the cap · the ★ story raises it" + (s.b ? " (" + s.b + " XP stored)" : "");
      else if (P.lvl < 20) {
        xp = Math.max(0, need() - P.xp) + " XP to Lv " + (P.lvl + 1);
        const w = want();
        if (w) xp += " · +50% XP until Lv " + w;
      }
      const full = h + "|" + xp;
      let ln = el.querySelector(".flch"),
        xl = el.querySelector(".flxp");
      if (!ln && h) {
        ln = document.createElement("div");
        ln.className = "flch";
        el.insertBefore(ln, el.firstChild);
        lineH = "";
      }
      if (!xl && xp) {
        xl = document.createElement("small");
        xl.className = "flxp";
        el.appendChild(xl);
        lineH = "";
      }
      if (full !== lineH) {
        lineH = full;
        if (ln) ln.innerHTML = h;
        if (xl) xl.textContent = xp;
      }
    } catch (e) {}
    return r;
  };

  css();
  return { CH, curCh, want, show };
})();
