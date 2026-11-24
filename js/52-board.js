// v38 The Lamplighter's Board (loads LAST): only top-level name BOARD.
//  1. Daily bounties: three small goals a day (seeded by date + character name, so a reload doesn't change them),
//     one free swap a day, a reward for each and a bonus satchel (glimmers + a Rare-or-better piece of gear) for
//     finishing all three. Finishing every bounty on consecutive days builds a streak (+10% bonus per day, max +50%).
//  2. Deeds: lifetime milestones read from the counters the game already keeps (P.kills, P.perf, P.packs, P.boss,
//     P.alpha, P.chest, P.lvl) plus best Perfect combo and bounties done. Each tier pays glimmers once.
// Progress is found by polling those counters every 250 ms (so guest wins in co-op count too), plus a wrap of
// reward() for elites. State lives in lazy P.bd (no DEFP). Book > Quests > Bounties shows it all. No scene objects.
const BOARD = (() => {
  const on = () => typeof SLOT !== "undefined" && SLOT >= 0 && typeof P === "object" && !!P && !!P.name;
  const dayKey = () => {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  };
  const prevDay = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  };
  const bd = () => {
    if (!P.bd) P.bd = { day: "", list: [], swap: 0, streak: 0, sday: "", tot: 0, cmb: 0, zv: {}, deeds: {}, seen: 0 };
    return P.bd;
  };
  const lv = () => Math.max(1, P.lvl || 1);
  const ZN = { hub: "around Duskwick", frost: "Frostfen", ember: "the Cinderwaste", marsh: "Mirewick", tower: "the Gloomspire" };
  const zoneHere = () => {
    try {
      const p = mode !== "explore" && typeof BG === "object" ? BG.position : W.position;
      let z = zoneAt(p.x, p.z);
      return z === "dun" ? "hub" : z;
    } catch (e) {
      return "hub";
    }
  };

  // ---------- seeded picks ----------
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed || 1;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));

  // bounty kinds: n = goal, txt(b) = label, ok() = can be offered
  const KIND = {
    kill: { w: 3, mk: (r) => ({ n: ri(r, 8, 14) }), t: (b) => "Snuff " + b.n + " gloom-touched foes anywhere" },
    zone: {
      w: 3,
      ok: () => Object.keys(bd().zv).length > 0,
      mk: (r) => {
        const zs = Object.keys(bd().zv);
        return { n: ri(r, 5, 9), z: zs[Math.floor(r() * zs.length)] };
      },
      t: (b) => "Defeat " + b.n + " foes " + (b.z === "hub" ? "around Duskwick" : "in " + (ZN[b.z] || b.z)),
    },
    perf: { w: 2, mk: (r) => ({ n: ri(r, 6, 12) }), t: (b) => "Land " + b.n + " Perfect timings" },
    combo: { w: 1, mk: (r) => ({ n: ri(r, 3, 4) }), t: (b) => "Reach a Perfect combo of x" + b.n + " in one battle" },
    pack: { w: 2, mk: (r) => ({ n: ri(r, 2, 3) }), t: (b) => "Win " + b.n + " battles against 3 or more foes" },
    elite: { w: 1, ok: () => lv() >= 3, mk: () => ({ n: 1 }), t: () => "Defeat an elite foe (the ones with a coloured aura)" },
  };
  function roll(r, avoid) {
    const ks = Object.keys(KIND).filter((k) => !avoid.includes(k) && (!KIND[k].ok || KIND[k].ok()));
    let tot = ks.reduce((a, k) => a + KIND[k].w, 0),
      x = r() * tot;
    let k = ks[ks.length - 1];
    for (const q of ks) {
      x -= KIND[q].w;
      if (x < 0) {
        k = q;
        break;
      }
    }
    return Object.assign({ k, c: 0, done: 0 }, KIND[k].mk(r));
  }
  function fresh() {
    const B = bd(),
      day = dayKey();
    if (B.day === day) return false;
    const r = rng(hash(day + "|" + P.name + "|" + (P.cls || "")));
    B.list = [];
    for (let i = 0; i < 3; i++) B.list.push(roll(r, B.list.map((b) => b.k)));
    B.day = day;
    B.swap = 0;
    B.paid = 0;
    if (B.sday && B.sday !== prevDay() && B.sday !== day) B.streak = 0; // missed a day
    return true;
  }
  const bGold = () => 25 + 5 * lv(),
    bXp = () => Math.round(1.5 * xpFor(lv()));

  // ---------- sounds (own context, follows Book > Options > Game > Spell sounds) ----------
  let AC = null;
  function chime(notes) {
    try {
      let v = 0.6;
      try {
        const s = JSON.parse(localStorage.getItem("duskwick_sfx") || "{}");
        if (typeof s.v === "number") v = s.v;
      } catch (e) {}
      if (v <= 0) return;
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      const t0 = AC.currentTime + 0.02;
      notes.forEach((f, i) => {
        const o = AC.createOscillator(),
          g2 = AC.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        const t = t0 + i * 0.09;
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(0.16 * v, t + 0.015);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        o.connect(g2).connect(AC.destination);
        o.start(t);
        o.stop(t + 1);
      });
    } catch (e) {}
  }

  // ---------- progress ----------
  let pend = [],
    pendT = 0;
  function bump(k, amt, test) {
    if (!on()) return;
    fresh();
    const B = bd();
    B.list.forEach((b) => {
      if (b.done || b.k !== k || (test && !test(b))) return;
      const was = b.c;
      b.c = k === "combo" ? Math.max(b.c, amt) : b.c + amt;
      b.c = Math.min(b.n, b.c);
      if (b.c === was) return;
      if (b.c >= b.n) complete(b);
      else if (pend.indexOf(b) < 0) pend.push(b);
    });
  }
  function complete(b) {
    const B = bd();
    b.done = 1;
    B.tot = (B.tot || 0) + 1;
    const gd = bGold(),
      xp = bXp();
    P.gold += gd;
    P.xp += xp;
    toast("Bounty done: " + KIND[b.k].t(b) + "   +" + xp + " XP  +" + gd + " ✦", "#ffd27a");
    chime([660, 880, 1320]);
    if (B.list.every((q) => q.done) && !B.paid) {
      B.paid = 1;
      const day = dayKey();
      B.streak = B.sday === prevDay() ? (B.streak || 0) + 1 : B.sday === day ? B.streak || 1 : 1;
      B.sday = day;
      const mul = 1 + 0.1 * Math.min(5, B.streak - 1),
        bg = Math.round((60 + 10 * lv()) * mul);
      P.gold += bg;
      setTimeout(() => {
        toast(
          "All of today's bounties done! Board satchel: +" + bg + " ✦" + (B.streak > 1 ? "  (" + B.streak + "-day streak)" : ""),
          "#9affc8",
        );
        chime([523, 659, 784, 1047, 1319]);
        try {
          giveItem(genItem(null, lv(), Math.max(2, rollR(3))));
        } catch (e) {
          console.error(e);
        }
        try {
          ui();
        } catch (e) {}
      }, 1400);
    }
    try {
      lvup();
    } catch (e) {}
    try {
      ui();
    } catch (e) {}
    sv();
  }
  function flushPend() {
    if (!pend.length || performance.now() - pendT < 3500) return;
    pendT = performance.now();
    const b = pend.shift();
    if (!b.done) toast("Bounty: " + KIND[b.k].t(b) + "  (" + b.c + "/" + b.n + ")", "#e8d9a8");
    pend = pend.filter((q) => !q.done);
  }

  // elites (and packs) from the host's own wins; guests' packs are found from the kill delta below
  const reward0 = reward;
  reward = function (list) {
    const r = reward0.apply(this, arguments);
    try {
      if (on() && Array.isArray(list)) {
        const el = list.filter((f) => f && f.el && !f.min).length;
        if (el) bump("elite", el);
      }
    } catch (e) {
      console.error(e);
    }
    return r;
  };

  // ---------- deeds ----------
  const chests = () => Object.keys(P.chest || {}).length;
  const DEEDS = [
    { k: "kill", n: "Gloom Snuffer", d: "foes defeated", v: () => P.kills || 0, t: [25, 100, 300, 1000] },
    { k: "perf", n: "Steady Hand", d: "Perfect timings", v: () => P.perf || 0, t: [10, 50, 200, 600] },
    { k: "cmb", n: "In the Rhythm", d: "best Perfect combo", v: () => bd().cmb || 0, t: [3, 5, 8] },
    { k: "pack", n: "Pack Breaker", d: "battles won against 3+ foes", v: () => P.packs || 0, t: [5, 25, 100] },
    { k: "alpha", n: "Giant Slayer", d: "big foes felled", v: () => P.alpha || 0, t: [1, 5, 20] },
    { k: "boss", n: "Crownbreaker", d: "bosses beaten", v: () => P.boss || 0, t: [1, 5, 15] },
    { k: "chest", n: "Treasure Seeker", d: "chests found", v: chests, t: [3, 10, 25] },
    { k: "lvl", n: "Rising Light", d: "level reached", v: () => P.lvl || 1, t: [5, 10, 15, 20] },
    { k: "bty", n: "Board Regular", d: "bounties finished", v: () => bd().tot || 0, t: [3, 15, 50, 150] },
    { k: "stk", n: "Faithful Flame", d: "best daily streak", v: () => bd().best || 0, t: [2, 5, 10] },
  ];
  const DG = [40, 120, 300, 700];
  const RN = ["I", "II", "III", "IV"];
  function deedTier(D) {
    const v = D.v();
    let n = 0;
    while (n < D.t.length && v >= D.t[n]) n++;
    return n;
  }
  function deedCheck(quiet) {
    const B = bd();
    B.best = Math.max(B.best || 0, B.streak || 0);
    const got = [];
    DEEDS.forEach((D) => {
      const have = B.deeds[D.k] || 0,
        now = deedTier(D);
      for (let i = have; i < now; i++) got.push([D, i]);
      if (now > have) B.deeds[D.k] = now;
    });
    if (!got.length) return;
    const gd = got.reduce((a, x) => a + DG[x[1]], 0);
    P.gold += gd;
    if (got.length > 2 || quiet)
      toast(got.length + " Deeds earned (Book > Quests > Bounties)   +" + gd + " ✦", "#c9b8ff");
    else
      got.forEach(([D, i]) => toast("Deed earned: " + D.n + " " + RN[i] + "   +" + DG[i] + " ✦", "#c9b8ff"));
    chime([784, 988, 1175, 1568]);
    try {
      ui();
    } catch (e) {}
    sv();
  }

  // ---------- poll ----------
  let who = null,
    base = {};
  function snap() {
    base = { kills: P.kills || 0, perf: P.perf || 0, packs: P.packs || 0, combo: 0 };
  }
  setInterval(() => {
    try {
      if (!on()) return;
      if (who !== P) {
        who = P;
        snap();
        const isNew = fresh();
        deedCheck(true);
        if (isNew || !bd().seen) {
          bd().seen = 1;
          setTimeout(() => on() && toast("New bounties on the Board: Book > Quests > Bounties", "#ffd27a"), 4000);
        }
        return;
      }
      if (fresh()) toast("A new day: fresh bounties on the Board.", "#ffd27a");
      const B = bd();
      const dk = (P.kills || 0) - base.kills;
      if (dk > 0) {
        const z = zoneHere();
        B.zv[z] = 1;
        bump("kill", dk);
        bump("zone", dk, (b) => b.z === z);
      }
      const dp = (P.perf || 0) - base.perf;
      if (dp > 0) bump("perf", dp);
      const dpk = (P.packs || 0) - base.packs;
      if (dpk > 0) bump("pack", dpk);
      // guests don't run reward(): count a 3+ foe guest win from its kill delta
      if (dk >= 3 && dpk <= 0 && mode === "explore" && typeof GUEST !== "undefined" && !GUEST && base.guest) bump("pack", 1);
      base.guest = mode === "guest";
      if (mode === "battle" && typeof g === "object" && g.combo > 0) {
        if (g.combo > B.cmb) B.cmb = g.combo;
        bump("combo", g.combo);
      }
      base.kills = P.kills || 0;
      base.perf = P.perf || 0;
      base.packs = P.packs || 0;
      deedCheck();
      flushPend();
    } catch (e) {
      console.error(e);
    }
  }, 250);

  // ---------- Book > Quests > Bounties ----------
  const qg = BOOKG.find((G) => G[0] === "quests");
  if (qg && qg[2]) qg[2].push(["board", "Bounties"]);
  function page(L) {
    fresh();
    const B = bd();
    const row = (h, b) => {
      const r = document.createElement("div");
      r.className = "row";
      r.innerHTML = h;
      if (b) r.appendChild(b);
      L.appendChild(r);
    };
    const btn = (t, dis, fn) => {
      const b = document.createElement("button");
      b.className = "pb";
      b.textContent = t;
      b.disabled = dis;
      b.onclick = fn;
      return b;
    };
    const bar = (c, n, col) =>
      '<div style="height:5px;background:#0006;border-radius:3px;margin-top:4px;overflow:hidden"><div style="height:100%;width:' +
      Math.round((100 * c) / n) +
      "%;background:" +
      col +
      '"></div></div>';
    const left = B.list.filter((b) => !b.done).length;
    L.insertAdjacentHTML(
      "beforeend",
      '<div class="sec">Today\'s bounties' +
        (B.streak > 0 ? " · " + B.streak + "-day streak" : "") +
        "</div><small style=\"display:block;margin-bottom:6px;color:#c9b8a0\">Each pays +" +
        bXp() +
        " XP +" +
        bGold() +
        " ✦. Finish all three for the Board satchel (glimmers + Rare-or-better gear)" +
        (left ? "" : ": claimed! New bounties tomorrow") +
        ". One free swap a day.</small>",
    );
    B.list.forEach((b, i) => {
      const sw =
        !b.done && !B.swap && !B.paid
          ? btn("Swap", false, () => {
              const r = rng(hash(B.day + "|swap|" + i + "|" + P.name));
              B.list[i] = roll(
                r,
                B.list.map((q) => q.k),
              );
              B.swap = 1;
              sv();
              panel("book", "board");
            })
          : null;
      row(
        "<div style=\"flex:1\"><b" +
          (b.done ? ' style="color:#9affc8"' : "") +
          ">" +
          (b.done ? "✔ " : "") +
          KIND[b.k].t(b) +
          "</b><small>" +
          b.c +
          " / " +
          b.n +
          "</small>" +
          bar(b.c, b.n, b.done ? "#9affc8" : "#ffd27a") +
          "</div>",
        sw,
      );
    });
    const earned = DEEDS.reduce((a, D) => a + (B.deeds[D.k] || 0), 0),
      all = DEEDS.reduce((a, D) => a + D.t.length, 0);
    L.insertAdjacentHTML("beforeend", '<div class="sec">Deeds (' + earned + " / " + all + ")</div>");
    DEEDS.forEach((D) => {
      const n = B.deeds[D.k] || 0,
        v = D.v(),
        nx = D.t[n];
      row(
        '<div style="flex:1"><b' +
          (n ? ' style="color:#c9b8ff"' : "") +
          ">" +
          D.n +
          (n ? " " + RN[n - 1] : "") +
          "</b><small>" +
          (nx != null
            ? v + " / " + nx + " " + D.d + " · next tier +" + DG[n] + " ✦"
            : "All tiers earned (" + v + " " + D.d + ")") +
          "</small>" +
          bar(nx != null ? Math.min(v, nx) : 1, nx != null ? nx : 1, "#c9b8ff") +
          "</div>",
      );
    });
  }
  const panel0 = panel;
  panel = function (k, id) {
    panel0.apply(this, arguments);
    try {
      if (k === "book" && BOOKL.last === "board" && on()) page($("pl"));
    } catch (e) {
      console.error(e);
    }
  };

  return { KIND, DEEDS, fresh, bump, deedCheck, state: () => bd() };
})();
