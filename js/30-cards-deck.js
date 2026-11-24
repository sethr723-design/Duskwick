// DUSKWICK - 30-cards-deck.js (v25b): cards you keep between turns (hand up to 7, with Discard) and deck gear.
// Loaded after 29-deathfx.js; wraps globals from 07 (genItem, gIcon, equip, unequip) and 10 (draw, ui).
// - The hand persists through a battle: each turn you draw your normal count (4 + P.hs) but never past DKS.max.
//   A per-battle draw pile (DKS.pile) is reshuffled from your deck when it runs out. The hand is local only (host
//   and guest alike), so multiplayer messages are unchanged: played cards still go out as 'act'.
// - Deck gear: a 7th gear slot "deck". Its st.deck is your deck size (dmax() in 06 asks deckSlots()). Rare+ deck items
//   carry bonus cards (it.cards) from your school, possibly above your level, that join the draw pool while worn.
//   Characters without one get a "Worn Spell Satchel" sized like the old level formula (dkEnsure), so saves keep working.

const DKS = { key: null, pile: [], disc: 0, max: 7 },
  DKP = 0.12, // chance a random gear drop is a deck item
  DKNM = ["Spell Satchel", "Card Case", "Spell Pouch", "Grimoire", "Codex"],
  DKIC = {};

GSL.push("deck");
GSN.deck = "Deck";
STN.deck = ["Deck slots", ""];

// deck size for an item of level lv and rarity r
const dkSize = (lv, r) => Math.min(16, 5 + Math.floor((Math.max(1, lv) - 1) / 3) + r + (r >= 4 ? 1 : 0));

// a card from your school that may be above your level (bonus cards on deck gear)
function dkCardOK(k) {
  const s = SPL[k];
  if (!s || s.rl || s.q != null || s.st || !s.cl) return false;
  return s.ty === "sum" ? !!ALLY[k] : typeof CFX[k] === "function";
}
function dkRollCards(lv, n) {
  if (n <= 0) return [];
  const mine = (k) => SPL[k].cl === P.cls || SPL[k].cl === "all",
    keys = Object.keys(SPL).filter((k) => dkCardOK(k) && mine(k));
  let c = keys.filter((k) => (SPL[k].lv || 1) >= lv - 2 && (SPL[k].lv || 1) <= lv + 3);
  if (c.length < n) c = keys.filter((k) => (SPL[k].lv || 1) <= lv + 3);
  const out = [];
  while (out.length < n && c.length) out.push(c.splice((Math.random() * c.length) | 0, 1)[0]);
  return out;
}
function dkGen(lv, r, el) {
  el = el || pick(["fire", "ice", "storm", "heal", "spirit"]);
  r = Math.max(0, Math.min(4, r || 0));
  lv = Math.max(1, lv || 1);
  const m = RM[r],
    n =
      r === 4
        ? "Codex of the Last Lamp"
        : (r >= 1 ? pick(GEL[el]) + " " : "") +
          DKNM[Math.min(3, r + (Math.random() < 0.5 ? 0 : 1))] +
          (r >= 2 ? pick(GSUF) : "");
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    s: "deck",
    n,
    r,
    lv,
    el,
    st: { deck: dkSize(lv, r) },
    cards: dkRollCards(lv, r >= 2 ? r - 1 : 0),
    v: Math.round((8 + lv * 5) * m * m * 0.6),
  };
}
// every character has a deck item; old saves and new characters get one sized like the old formula
function dkEnsure() {
  if (typeof P === "undefined" || !P) return;
  if (!P.gear) P.gear = {};
  if (P.gear.deck) return;
  P.gear.deck = {
    id: "dk" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    s: "deck",
    n: "Worn Spell Satchel",
    r: 0,
    lv: 1,
    el: CLE[P.cls] || "fire",
    st: { deck: Math.min(10, 5 + Math.floor((P.lvl || 1) / 2)) },
    cards: [],
    v: 5,
  };
}
function deckSlots() {
  dkEnsure();
  const d = P.gear && P.gear.deck;
  return Math.max(1, (d && d.st && d.st.deck) || 5);
}
// bonus cards of the worn deck item that you can cast right now (your school, or bought with school points)
const dkBonus = () =>
  ((P.gear && P.gear.deck && P.gear.deck.cards) || []).filter(
    (k) => dkCardOK(k) && (SPL[k].cl === P.cls || SPL[k].cl === "all" || !!(P.tpx && P.tpx[k])),
  );
// bag details line for a deck item
function dkTxt(it) {
  if (!it || it.s !== "deck") return "";
  const b = (it.cards || []).filter((k) => SPL[k]);
  return (
    '<br><span style="color:#ffd27a">Deck: holds ' +
    ((it.st && it.st.deck) || 0) +
    " cards. Your hand keeps up to " +
    DKS.max +
    ".</span>" +
    (b.length
      ? '<br><span style="color:#c9b8ff">Bonus cards (added to your draws while worn): ' +
        b.map((k) => SPL[k].n + " (lv " + (SPL[k].lv || 1) + ")").join(", ") +
        "</span>"
      : "")
  );
}

// ---- gear wraps ----
{
  const g0 = genItem;
  genItem = function (sl, lv, r, el) {
    if (!sl) sl = Math.random() < DKP ? "deck" : pick(GSL.filter((s) => s !== "deck"));
    return sl === "deck" ? dkGen(lv, r, el) : g0(sl, lv, r, el);
  };
  const i0 = gIcon;
  gIcon = function (it) {
    return it && it.s === "deck" ? dkIcon(it) : i0(it);
  };
  const e0 = equip;
  equip = function (it) {
    const r = e0.apply(this, arguments);
    if (it && it.s === "deck") {
      // a bigger deck: fill the new slots with cards you own (highest level first)
      if (!P.deck) P.deck = [];
      Object.keys(P.lib || {})
        .filter(useOK)
        .sort((a, b) => (SPL[b].lv || 5) - (SPL[a].lv || 5))
        .forEach((k) => {
          if (P.deck.filter(useOK).length < dmax() && !P.deck.includes(k)) P.deck.push(k);
        });
      toast("Deck size: " + dmax() + " cards", RAR[it.r].c);
      sv();
    }
    return r;
  };
  const u0 = unequip;
  unequip = function (s) {
    if (s === "deck") {
      toast("You always carry a deck. Equip another one to swap it.", "#c9b8ff");
      return;
    }
    return u0.apply(this, arguments);
  };
}
// a little book / satchel for the deck slot (cached by rarity and element)
function dkIcon(it) {
  const key = it.r + "|" + (it.el || "");
  if (DKIC[key]) return DKIC[key];
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d"),
    em = it.r < 0,
    rc = em ? "#4a4030" : RAR[it.r].c,
    ec = em ? "#5a5040" : ELC[it.el] || "#ffd27a";
  const q = x.createRadialGradient(32, 28, 2, 32, 32, 32);
  q.addColorStop(0, em ? "rgba(90,80,60,.25)" : rc + "55");
  q.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = q;
  x.fillRect(0, 0, 64, 64);
  x.lineJoin = x.lineCap = "round";
  x.strokeStyle = "#120a04";
  x.lineWidth = 3;
  // two fanned cards behind the book
  [
    [-0.35, 20],
    [0.3, 44],
  ].forEach(([a, cx]) => {
    x.save();
    x.translate(cx, 26);
    x.rotate(a);
    x.beginPath();
    x.rect(-8, -14, 16, 24);
    x.fillStyle = em ? "#3a3226" : "#2b2152";
    x.fill();
    x.stroke();
    x.restore();
  });
  // the book
  x.beginPath();
  x.rect(14, 22, 36, 34);
  x.fillStyle = em ? "#3a3226" : "#6a3a2a";
  x.fill();
  x.stroke();
  x.fillStyle = em ? "#2e281e" : "#e8dcc0";
  x.fillRect(46, 25, 3, 28);
  x.beginPath();
  x.arc(31, 39, 7, 0, 7);
  x.fillStyle = ec;
  x.fill();
  x.stroke();
  if (!em) {
    x.fillStyle = "rgba(255,255,255,.7)";
    x.beginPath();
    x.arc(29, 37, 2, 0, 7);
    x.fill();
  }
  if (!em && it.r >= 3) {
    x.fillStyle = rc;
    [
      [10, 12],
      [54, 10],
      [8, 50],
    ].forEach(([a, b]) => {
      x.beginPath();
      for (let i = 0; i < 8; i++) {
        const r2 = i % 2 ? 1.5 : 4.5,
          an = (i * Math.PI) / 4;
        x.lineTo(a + Math.cos(an) * r2, b + Math.sin(an) * r2);
      }
      x.fill();
    });
  }
  return (DKIC[key] = c.toDataURL());
}

// ---- hand: kept between turns, drawn from a per-battle pile ----
const dkKey = () => (mode === "guest" && GUEST ? "g:" + GUEST.b : "h:" + (g.id || ""));
function dkPool() {
  dkEnsure();
  if (!P.deck) P.deck = [];
  let d = P.deck.filter(useOK);
  if (!d.length) {
    clsStart();
    d = P.deck.filter(useOK);
  }
  d = d.slice(0, dmax());
  dkBonus().forEach((k) => {
    if (!d.includes(k)) d.push(k);
  });
  if (!d.length) d = ["sprite"];
  return d;
}
function dkCard(k) {
  const o = Object.assign({ k }, SPL[k]);
  if (o.sch) o.a = schEl();
  if (!has(k)) o.dkb = 1; // a bonus card from your deck item
  return o;
}
{
  const d0 = draw;
  draw = function () {
    const key = dkKey(),
      fresh = key !== DKS.key;
    if (fresh) {
      DKS.key = key;
      DKS.pile = [];
      DKS.disc = 0;
    }
    const hand = fresh ? [] : (g.hand || []).filter((c) => !c.comp),
      comps = NPCJOIN ? d0().filter((c) => c.comp) : [], // companion cards are re-dealt every turn as before
      pool = dkPool(),
      n = fresh ? DKS.max : Math.min(4 + (P.hs || 0), DKS.max - hand.length); // first turn: a full hand of 7
    for (let i = 0; i < n; i++) {
      let k = null;
      for (let t = 0; t < 40 && !k; t++) {
        if (!DKS.pile.length) DKS.pile = pool.slice();
        const q = DKS.pile.splice((Math.random() * DKS.pile.length) | 0, 1)[0];
        if (SPL[q] && pool.includes(q)) k = q;
      }
      if (k) hand.push(dkCard(k));
    }
    return hand.concat(comps);
  };
}
const dkCanDisc = () =>
  mode === "battle"
    ? !g.busy && !g.ended
    : mode === "guest"
      ? !!GUEST && !!GUEST.s && !GUEST.ended && !GUEST.qb && !GUEST.down
      : false;
function dkDiscard(i) {
  if (!dkCanDisc()) return;
  const c = g.hand[i];
  if (!c) return;
  g.hand.splice(i, 1);
  DKS.disc = 0;
  $("log").textContent = "Discarded " + c.n + ". You'll draw into the free space next turn.";
  ui();
}
// Discard button beside End turn, the hand counter after the pips, right-click to discard, discard mode on the cards
function dkHandUI() {
  let b = $("dkd");
  if (!b) {
    const end = $("end");
    if (!end) return;
    b = document.createElement("button");
    b.className = "pb";
    b.id = "dkd";
    b.title = "Discard a card from your hand to make room (or right-click a card)";
    b.onclick = () => {
      DKS.disc = DKS.disc ? 0 : 1;
      ui();
    };
    end.parentNode.insertBefore(b, end);
    const st = document.createElement("style");
    st.textContent =
      "#dkd.on{background:linear-gradient(#c8443a,#7a1a14);color:#fff}" +
      ".card.dkx{opacity:1!important;cursor:pointer!important;outline:2px dashed #ff6a5a;outline-offset:2px}" +
      ".card .dkb{display:block;color:#ffd27a;font:700 9px system-ui;margin-top:2px}" +
      ".dkh{margin-left:10px;font-size:12px;color:#b9b3e6}.dkh.full{color:#ffb070}";
    document.head.appendChild(st);
  }
  const inB = (mode === "battle" && g.hand) || (mode === "guest" && GUEST && GUEST.s);
  if (!inB) {
    DKS.disc = 0;
    b.style.display = "none";
    return;
  }
  const can = dkCanDisc(),
    n = g.hand.length;
  if (!can || !n) DKS.disc = 0;
  b.style.display = "";
  b.disabled = !can || !n;
  b.textContent = DKS.disc ? "Cancel" : "Discard";
  b.classList.toggle("on", !!DKS.disc);
  const full = n >= DKS.max;
  $("en").insertAdjacentHTML(
    "beforeend",
    '<span class="dkh' +
      (full ? " full" : "") +
      '">Hand ' +
      n +
      "/" +
      DKS.max +
      (DKS.disc ? "  ·  pick a card to discard" : full ? "  ·  full: discard to draw new cards" : "") +
      "</span>",
  );
  $("hand")
    .querySelectorAll(".card")
    .forEach((el, i) => {
      const c = g.hand[i];
      if (!c) return;
      el.oncontextmenu = (e) => {
        e.preventDefault();
        dkDiscard(i);
      };
      if (c.dkb) {
        const s = el.querySelector("small");
        if (s) s.insertAdjacentHTML("beforeend", '<span class="dkb">✦ deck bonus</span>');
      }
      if (DKS.disc && can) {
        el.disabled = false;
        el.classList.add("dkx");
        el.title = "Discard " + c.n;
        el.onclick = () => dkDiscard(i);
      }
    });
}
{
  const u0 = ui;
  ui = function () {
    const r = u0.apply(this, arguments);
    try {
      dkHandUI();
    } catch (e) {
      console.warn("deck hand ui", e);
    }
    return r;
  };
}
