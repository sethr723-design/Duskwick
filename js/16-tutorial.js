// DUSKWICK - 16-tutorial.js: v17 the Lamplighter's Primer. A short run of tip cards for a new character: moving,
// talking, a guided practice fight (v18: cards, pips, what each card does, aiming, timed hits, ending a turn, blocking,
// your school; each card waits for you to do it and glows round that part of the screen), the Book, spoils and
// fighting in a party. Written for every class: the school card reads CD / ROLE for whatever P.cls is. Progress is P.tut (saved);
// characters that are already under way skip it, and Book > Options > Lamplighter's Primer replays it.
// It only watches game state (a 250 ms poll), so no other file has to call into it.
const TUTS = [
  {
    w: "x",
    t: "Welcome, lamplighter",
    b: () =>
      "The sun slipped behind the Gloomspire long ago, and Duskwick has lived by lamplight ever since. Every lamp holds the gloom back, and you are the newest keeper of them." +
      "<br><br><b>Move</b> with W A S D or the arrow keys (the stick on touch screens). Hold <b>Shift</b> to run. <b>Drag</b> to look around, and use the <b>wheel</b> to zoom." +
      "<br><br><i>Soot, the square's lamp-cat, will keep an eye on you.</i>",
    go: (s) => Math.hypot(W.position.x - s.x, W.position.z - s.z) > 6,
    on: (s) => {
      s.x = W.position.x;
      s.z = W.position.z;
    },
  },
  {
    w: "x",
    t: "The people of the square",
    b: () =>
      "Walk up to someone and press <b>E</b> to talk. A gold <b>!</b> over a head means they have work for you." +
      "<br><br>Oona keeps the first lamp. Find her and take her quest: the lamps on Gloomway are guttering.",
    go: () => Object.keys(P.qa || {}).some((k) => P.qa[k] != null) || Object.keys(P.done || {}).length > 0,
  },
  // ---- v18: a guided practice fight. A tame gloomling (it can't knock you out); each card waits for you to do the
  // thing it describes, and hi = the part of the screen it glows round ----
  {
    w: "x",
    t: "A practice fight",
    b: () =>
      "Before Oona sends you up Gloomway, she'll take you down to the <b>Lamplighters' Vault</b> to try your spells on two tame <b>practice gloomlings</b>. They can't knock you out, and she'll coach you through each step." +
      "<br><br>It takes about a minute, and you'll be brought back here after.",
    act: ["Start practice fight", () => tutPrac()],
    go: () => mode === "battle",
  },
  // say = Oona's own words introducing the idea (typed out as she speaks, plain text); b = what to do
  {
    w: "b",
    demo: "field",
    t: "The battlefield",
    hi: "#eus > :not(.side)",
    say: () =>
      "Here we are! That's you on the glowing pad, and those are my gloomlings across the circle. A fight goes in turns: you act, then your foes act, back and forth.",
    clk: 1, // v29: done when you click what it points at (the glowing foe list)
    b: () =>
      "Every foe is listed here with its <b>health bar</b>. Bring it to zero and you win. Your own health is on your side of the field." +
      "<br><br><b>Click a foe</b> in the glowing list to carry on (that also makes it your target).",
  },
  {
    w: "b",
    demo: "cards",
    t: "Your spell cards",
    hi: "#hand .card:not([disabled])", // the cards you can cast right now
    say: () =>
      "A lamplighter fights with spells, and your spells are these cards along the bottom. Cards you don't cast stay in your hand (up to 7), and you draw more every turn. Press Discard (or right-click a card) to throw one away and make room.",
    b: () =>
      "These are your <b>spell cards</b>. Each one shows its <b>pip cost</b> ◆ in the corner, its name, and what it does underneath." +
      "<br><br><b>Click a card</b> (or press its number, 1-9) to cast it at the foe.",
    go: (s) => P.casts > s.c,
    on: (s) => (s.c = P.casts),
  },
  {
    w: "b",
    demo: "pips",
    t: "Pips",
    hi: "#en .pips", // your pips; each card's cost glows (css) rather than getting a box round it
    css:
      "#hand .card .c{color:#ffe066!important;text-shadow:0 0 6px #ffd27a,0 0 14px #ffb040;" +
      "animation:tutG 1s ease-in-out infinite}@keyframes tutG{50%{text-shadow:0 0 2px #ffd27a}}",
    say: () =>
      "See those little diamonds? Pips. Think of them as lamp oil: every spell burns some, you get more each turn, and whatever you don't burn, you keep.",
    b: () =>
      "Casting spends <b>pips</b> ◆ (shown here). You gain 2 each turn" +
      (P.cls === "gale" ? " (3 for you: Gale gets an extra one)" : "") +
      ", and pips you don't spend carry over, up to 5." +
      "<br><br>Cards that cost more than you have are dimmed: save up for your big spells." +
      "<br><br><b>Click your pips</b> (glowing) to carry on.",
    clk: 1,
  },
  {
    w: "b",
    demo: "kinds",
    t: "What your cards do",
    // v29: you click each card's line below; that card glows in your hand. Done once every line has been clicked
    hi: (s) => (s.k == null ? "#tut .tr:not(.seen)" : "#hand .card:nth-child(" + (s.k + 1) + "), #tut .tr:not(.seen)"),
    bind: (s, el) => {
      const rows = [...el.querySelectorAll(".tr")];
      s.n = rows.length;
      s.seen = {};
      rows.forEach((r, j) => {
        r.onclick = () => {
          rows.forEach((q) => q.classList.toggle("on", q === r));
          r.classList.add("seen");
          s.k = +r.dataset.i;
          s.seen[j] = 1;
          s.t1 = performance.now(); // let the last card glow a moment before moving on
        };
      });
    },
    go: (s) => !s.n || (Object.keys(s.seen || {}).length >= s.n && performance.now() - s.t1 > 1500),
    say: () =>
      "Not every card is a punch. Some strike your foes, some call a friend to fight beside you, and some guard your side. Let's look at what you're holding.",
    b: () => {
      const ty = { atk: "Attack", sum: "Summon", sup: "Support" },
        tip = {
          atk: "hits foes",
          sum: "calls an ally onto a pad beside you; it fights every turn",
          sup: "shields, heals or strengthens your side",
        },
        seen = {},
        rows = (g.hand || [])
          .map((c, i) => [c, i])
          .filter(([c]) => c && !seen[c.n] && (seen[c.n] = 1))
          .slice(0, 5)
          .map(
            ([c, i]) =>
              '<span class="tr" data-i="' +
              i +
              '"><b>' +
              c.n +
              "</b> (" +
              c.c +
              "◆, " +
              (ty[c.ty] || "Spell") +
              "): " +
              (c.t || "") +
              "</span>",
          )
          .join(""),
        kinds = [...new Set((g.hand || []).map((c) => c.ty))].filter((k) => tip[k]);
      return (
        "Every card is one of three kinds: " +
        kinds.map((k) => "<b>" + ty[k] + "</b> " + tip[k]).join("; ") +
        ".<br><br>In your hand now (<b>click each one</b> to find it in your hand):<br>" +
        (rows || "<i>(your hand is empty: end your turn to draw more)</i>")
      );
    },
  },
  {
    w: "b",
    demo: "aim",
    t: "Aim, then time it",
    hi: "#eus > :not(.side), #hand .card:not([disabled])", // the foe list (click to aim) and castable cards
    say: () =>
      "Now a proper lamplighter's trick. When you cast, a gold ring closes in on your target. Catch it just as it meets, and your spell lands harder. Try it!",
    b: () =>
      "With several foes, <b>click one</b> (or press <b>Tab</b>) to choose your target." +
      "<br><br>Now cast another card. When the <b>gold ring</b> closes on the foe, press <b>Space</b> or click as it meets the inner circle: <b>Good</b> hits normally, <b>Perfect</b> 35% harder, and a miss only 70%." +
      "<br><br><i>Out of pips? End your turn and try it next turn.</i>",
    go: (s) => P.casts > s.c || g.ended,
    on: (s) => (s.c = P.casts),
  },
  {
    w: "b",
    demo: "end",
    t: "Ending your turn",
    hi: "#end",
    say: () =>
      "When you've cast all you mean to, end your turn and let the gloom take its go. Any pips you saved will be waiting for you.",
    b: () =>
      "Spent what you want to? Press <b>End turn</b> (or Space / Enter). Your allies act, then the foes." +
      "<br><br>The <b>⏳ clock</b> gives you 45 seconds to choose. <b>X</b> doubles battle speed.",
    go: () => g.ended,
  },
  {
    w: "b",
    look: false, // the foe is about to attack: keep the camera on the fight
    t: "Block!",
    hi: "#log", // where the foe's move is announced
    say: () =>
      "Its turn now! Watch what it's planning, shown over its head. When it lunges, the ring comes for you instead. Time it, and you'll block the worst of it.",
    b: () =>
      "The foe's turn. The number over its head shows what it's about to do (<b>SMASH</b> hits harder)." +
      "<br><br>When it lunges, a ring closes over <b>you</b>: press <b>Space</b> as it meets to <b>block</b> and take less damage. A <b>Perfect</b> parries and strikes back.",
    go: () => !g.ended,
  },
  {
    w: "b",
    demo: "school",
    t: () => "Your school: " + ((CL[P.cls] || [0, "Lamplighter"])[1] || "Lamplighter"),
    say: () =>
      "Lovely work! One last thing: every school of magic has its own job. Yours is " +
      ((CL[P.cls] || [0, "Lamplighter"])[1] || "Lamplighter") +
      ", and here's what that means.",
    b: () => {
      const r = ROLE[P.role] || ROLE.damage,
        tip =
          {
            damage:
              "Pick one foe and burn it down. Finish the weakest first: fewer foes means fewer hits on your party.",
            aoe: "Your storms hit every foe at once, so you shine when the field is crowded.",
            tank: "Foes come for you first. Stand in front, shield friends, and use Challenge to pull attacks your way.",
            healer:
              "Keep everyone standing. Your heals reach the whole party, and Rekindle brings back a knocked-out friend.",
            summoner:
              "Call allies onto the pads beside you. They fight, soak hits, and grow stronger with your spirit spells.",
          }[P.role] || "";
      return (
        (CD[P.cls] || "") +
        '<br><br><b style="color:' +
        r.col +
        '">' +
        r.n +
        " (" +
        r.tag +
        ")</b>: " +
        tip +
        "<br><br>Now <b>cast your cards</b> and finish the gloomlings off. <b>Flee</b> (F) works in most fights, but never against a boss."
      );
    },
    hi: "#hand .card:not([disabled])", // v29: no button; the Primer moves on when the fight ends
  },
  {
    w: "x",
    t: "Your Book",
    b: () =>
      "Press <b>B</b> to open your Book: quests (and which one the gold arrow tracks), your spells and deck, party and companions, lore you have found, travel and options." +
      "<br><br><b>I</b> opens your bag of gear. <b>Esc</b> closes any page.",
    // counts only once any page that was already open (say, Oona's dialogue) has closed and a new one opens
    go: (s) => {
      const op = $("panel").style.display === "flex";
      if (!op) s.cl = 1;
      return op && s.cl;
    },
  },
  {
    w: "x",
    t: "Into the gloom",
    b: () =>
      "Follow the gold arrow north up Gloomway. Gloomlings grow from the shadows people leave behind. Walk into one to start a fight." +
      "<br><br>The sidewalks are lit by the lamps and <b>safe</b>: nothing follows you onto them.",
    go: () => mode === "battle" || mode === "guest",
  },
  {
    w: "x",
    t: "Spoils of the street",
    b: () =>
      "Wins bring <b>XP</b> (the ring around your level) and glimmers (✦), the lamplighters' coin. Your level cap rises as you finish the ★ story quests, and each level unlocks new spells: see Book > Spells." +
      "<br><br>Spend glimmers on Market Lane, and visit Wren the spellwright each time you level up to learn a new spell. Mira patches up anyone who's hurt, and Pip the tailor will dye your robes.",
  },
  {
    w: "x",
    t: "No lamplighter walks alone",
    b: () =>
      "Other lamplighters can walk into your fight's ring to join you, and you into theirs. In a shared fight everyone readies cards, and the round plays out once all have pressed End turn, on one shared clock." +
      "<br><br>Bulwarks draw the blows, Menders keep the party lit, Strikers and Evokers clear the field, Wispcallers fill the pads." +
      "<br><br>That's the Primer. Keep the lamps burning.",
  },
];
const tutTurn = () => (mode === "guest" ? GUEST && GUEST.turn : g && g.turn);
let tutI = -1, // step on screen (-1 = none)
  tutS = {}, // that step's own scratch state
  tutSlot = -2;
function tutEl() {
  let el = $("tut");
  if (el) return el;
  const st = document.createElement("style");
  st.textContent =
    "#tut{position:absolute;z-index:6;width:min(360px,calc(100% - 32px));left:50%;top:130px;transform:translateX(-50%);" +
    "background:linear-gradient(180deg,rgba(38,26,58,.94),rgba(20,14,34,.94));border:1px solid #c9a24a;border-radius:14px;" +
    "box-shadow:0 6px 22px rgba(0,0,0,.5);padding:12px 14px 10px;color:#f3ecff;font:13px/1.45 system-ui;pointer-events:auto;" +
    "transition:opacity .3s}" +
    "#tut.bat{left:14px;top:auto;bottom:calc(210px + env(safe-area-inset-bottom,0px));transform:none;width:min(320px,calc(100% - 32px))}" +
    "#tut h4{margin:0 0 6px;font:800 15px Fraunces,Georgia,serif;color:#ffd98a}#tut h4 small{float:right;font:600 10px system-ui;color:#b8a8d8;letter-spacing:.08em}" +
    "#tut .tb{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}" +
    "#tut button{border:1px solid #6a5424;background:#2a1e12;color:#ffe9b0;border-radius:8px;padding:4px 10px;font:700 12px system-ui;cursor:pointer}" +
    "#tut button.sk{background:none;border-color:transparent;color:#a898c8}#tut i{color:#cfc2ee}" +
    "#tut button.ac{background:linear-gradient(#e6b84a,#b8841a);color:#2a1a05;border-color:#6a4a10}" +
    "@keyframes tutP{50%{outline-color:rgba(255,210,122,.25)}}" +
    "#tut .who{font:800 11px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#7fe0d0;margin-bottom:4px;" +
    "display:flex;align-items:center;gap:7px}" +
    "#tut .pt{width:22px;height:22px;border-radius:50%;flex:none;border:2px solid #ffd27a;" +
    "background:radial-gradient(circle at 50% 70%,#f1c9a5 0 34%,transparent 35%),linear-gradient(#1d4f55 0 45%,#2f8a86 46%)}" +
    "#tut .say{margin:0 0 8px;font:italic 14px/1.5 Georgia,serif;color:#fff4dc;cursor:pointer;min-height:2.9em}" +
    "#tut .ins{transition:opacity .4s}#tut .ins.wait{opacity:0}" +
    "#tut .tr{display:block;padding:1px 4px;border-radius:5px}#tut .tr.on{background:rgba(255,210,122,.18)}" +
    "#tut .tr{cursor:pointer}#tut .tr.seen b::after{content:' \\2713';color:#7dff9a}" +
    "#tut .dw{align-self:center;font:italic 11px system-ui;color:#a898c8}" +
    "#tut.hide{opacity:0;pointer-events:none}body.bsay #tut{opacity:.06;pointer-events:none}@media (max-width:600px){#tut{top:auto;bottom:calc(160px + env(safe-area-inset-bottom,0px))}}";
  document.head.appendChild(st);
  el = document.createElement("div");
  el.id = "tut";
  el.className = "hide";
  stage.appendChild(el);
  return el;
}
function tutShow(i) {
  const s = TUTS[i],
    el = tutEl();
  tutI = i;
  tutS = {};
  if (s.on) s.on(tutS);
  const tt = typeof s.t === "function" ? s.t() : s.t,
    // v18: in the practice fight, the battle cards are Oona calling down from her dais (and she gestures as she talks)
    oo = s.w === "b" && g && g.prac,
    say = oo && s.say ? s.say() : "",
    nb = s.act ? "Not now" : s.go || s.clk || s.w === "b" ? "" : i === TUTS.length - 1 ? "Done" : "Got it";
  if (oo) {
    PRAC.talk = 2.4 + say.length * 0.028;
    // the camera turns to her while she speaks (not when a foe is about to strike), and she acts the card out
    PRAC.look = s.look === false ? 0 : performance.now() + 900 + say.length * 16;
    if (s.demo) setTimeout(() => pracDemo(s.demo), 500);
  }
  el.innerHTML =
    (oo ? '<div class="who"><i class="pt"></i>Oona, from the dais</div>' : "") +
    (say ? '<p class="say">"<span></span>"</p>' : "") +
    "<h4>" +
    tt +
    "<small>PRIMER " +
    (i + 1) +
    "/" +
    TUTS.length +
    '</small></h4><div class="ins">' +
    s.b() +
    '</div><div class="tb"><button class="sk">Skip primer</button>' +
    // v29: a card that waits for you to do something (go / clk) and every battle card has no Next/OK button: you
    // do the thing it points at. Only plain info cards keep "Got it"
    (nb ? '<button class="nx">' + nb + "</button>" : '<span class="dw">Do it to carry on</span>') +
    (s.act ? '<button class="ac">' + s.act[0] + "</button>" : "") +
    "</div>";
  el.querySelector(".sk").onclick = () => tutEnd(true);
  if (nb) el.querySelector(".nx").onclick = () => tutNext();
  if (s.act) el.querySelector(".ac").onclick = s.act[1];
  // v29: the Primer's buttons never take keyboard focus, so Space / Enter (timed hits, End turn) can't press them
  el.querySelectorAll("button").forEach((b) => {
    b.tabIndex = -1;
    b.onmousedown = (e) => e.preventDefault();
  });
  if (s.bind) s.bind(tutS, el);
  // v18: Oona's words type out as she speaks, then the instructions fade in under them (a click shows it all at once)
  clearInterval(tutTy);
  if (say) {
    const sp = el.querySelector(".say span"),
      ins = el.querySelector(".ins");
    ins.classList.add("wait");
    let n = 0;
    const done = () => {
      clearInterval(tutTy);
      sp.textContent = say;
      ins.classList.remove("wait");
      PRAC.talk = Math.min(PRAC.talk, 0.6);
      if (PRAC.look) PRAC.look = Math.min(PRAC.look, performance.now() + 1200);
    };
    tutTy = setInterval(() => {
      n += 2;
      sp.textContent = say.slice(0, n);
      if (n >= say.length) done();
    }, 32);
    el.querySelector(".say").onclick = done;
  }
}
let tutTy = 0;
// ---- v18 the Lamplighters' Vault: the practice fight's own hall, far from everything (z 1500 is past the dungeons).
// Built the first time it's needed (so after the editor's BASE snapshot) and only shown while you're in it. No lights:
// braziers and the great lantern are glowing materials and sprites, so the light pool is untouched. Oona watches from
// a dais behind the battlefield (in view of the battle camera) and "speaks" the Primer's battle cards.
const VLX = 0,
  VLZ = 1500;
TH.dunV = [0x1a1208, "linear-gradient(#050302,#1c1208 60%,#3a2410)", 0xffd8a0, 0x2a1c10, 0xffc07a];
const PRAC = { g: null, oona: null, ret: null, talk: 0, raf: 0, fl: [] };
function vaultBuild() {
  if (PRAC.g) return;
  const g = new T.Group(),
    a = (geo, c, x, y, z, ry) => {
      const m = mk(geo, c, x, y, z, 1);
      if (ry) m.rotation.y = ry;
      g.add(m);
      return m;
    },
    glow = (x, y, z, s, c) => {
      const sp = new T.Sprite(AM(GLT));
      sp.material.color.setHex(c || 0xffb060);
      sp.scale.setScalar(s);
      sp.position.set(x, y, z);
      g.add(sp);
      return sp;
    },
    flat = (geo, c, rz, x, z) => {
      const m = new T.Mesh(geo, new T.MeshLambertMaterial({ color: c }));
      m.rotation.set(-Math.PI / 2, 0, rz || 0);
      m.position.set(x || 0, 0.02, z || 0);
      g.add(m);
    },
    em = (m, c) => {
      m.material.emissive.setHex(c);
      return m;
    };
  g.position.set(VLX, 0, VLZ);
  // floor: worn flagstones with brass inlay rings and a sunburst
  a(new T.CylinderGeometry(24, 24, 0.4, 56), 0x5a5470, 0, -0.2, 0);
  [
    [4, 0.2],
    [9.2, 0.35],
    [14.5, 0.25],
  ].forEach(([r, w]) => flat(new T.RingGeometry(r - w, r, 64), 0xc9963a));
  for (let i = 0; i < 12; i++) {
    const an = (i / 12) * Math.PI * 2;
    flat(new T.PlaneGeometry(0.2, 4.8), 0xb08a3a, an, Math.sin(an) * 6.6, Math.cos(an) * 6.6);
  }
  // a ring of pillars with walls between, banners on every other pillar
  const N = 14;
  for (let i = 0; i < N; i++) {
    const an = (i / N) * Math.PI * 2,
      x = Math.sin(an) * 21.5,
      z = Math.cos(an) * 21.5;
    a(new T.CylinderGeometry(0.9, 1.1, 9, 16), 0x8a849c, x, 4.5, z);
    a(B(2.4, 0.6, 2.4), 0x5a5470, x, 0.3, z, an);
    a(B(2.2, 0.5, 2.2), 0x5a5470, x, 9.1, z, an);
    const bn = an + Math.PI / N,
      wl = 2 * 23 * Math.sin(Math.PI / N) + 0.3;
    a(B(wl, 10, 1), 0x3a3450, Math.sin(bn) * 23, 5, Math.cos(bn) * 23, bn);
    if (i % 2 === 0) {
      a(B(1.7, 4, 0.12), 0x7a2a5a, Math.sin(bn) * 22.4, 6, Math.cos(bn) * 22.4, bn);
      a(B(1.75, 0.22, 0.16), 0xd9a441, Math.sin(bn) * 22.35, 4.1, Math.cos(bn) * 22.35, bn);
      em(a(new T.OctahedronGeometry(0.3), 0xffd27a, Math.sin(bn) * 22.3, 6.6, Math.cos(bn) * 22.3), 0x886622);
    }
  }
  // braziers round the floor
  for (let i = 0; i < 8; i++) {
    const an = ((i + 0.5) / 8) * Math.PI * 2,
      x = Math.sin(an) * 17,
      z = Math.cos(an) * 17;
    a(new T.CylinderGeometry(0.22, 0.34, 1.7, 10), 0x2a2438, x, 0.85, z);
    a(new T.CylinderGeometry(0.9, 0.5, 0.5, 14), 0x3a3048, x, 1.9, z);
    em(a(new T.ConeGeometry(0.55, 1.1, 10), 0xffa040, x, 2.6, z), 0xff8a20);
    const f = glow(x, 2.7, z, 4.2);
    f.userData.s = 4.2;
    PRAC.fl.push(f);
  }
  // the great lantern hanging over the middle
  a(new T.CylinderGeometry(0.05, 0.05, 10, 6), 0x2a2438, 0, 19, 0);
  a(B(1.7, 2.1, 1.7), 0x2a2438, 0, 13, 0);
  em(a(B(1.3, 1.7, 1.3), 0xffd27a, 0, 13, 0), 0xd9a441);
  glow(0, 13, 0, 14, 0xffc070);
  // Oona's dais behind the battlefield, a lamp post beside her
  a(new T.CylinderGeometry(2.6, 2.9, 0.8, 28), 0x5a5470, 0, 0.4, -12);
  a(new T.CylinderGeometry(2.62, 2.62, 0.12, 28), 0xc9963a, 0, 0.82, -12);
  a(B(2, 0.4, 1), 0x5a5470, 0, 0.2, -9.2);
  a(new T.CylinderGeometry(0.1, 0.12, 3.4, 8), 0x2a2438, 1.9, 2.5, -12.4);
  em(a(B(0.5, 0.6, 0.5), 0xffd98a, 1.9, 4.3, -12.4), 0xd99a2a);
  glow(1.9, 4.3, -12.4, 3);
  const o = person(NSPEC.qhub);
  oonaDress(o);
  o.position.set(0, 0.88, -12);
  g.add(o);
  PRAC.oona = o;
  g.visible = false;
  S.add(g);
  PRAC.g = g;
}
// v18: a finer Oona for the Vault: her round parts rebuilt smoother, a woven robe with folds and an embroidered gold
// hem, the starry woven hat fabric, a painted face with rosy cheeks, and gold trim with a soft sheen
function oonaDress(o) {
  const cv = (w, h, fn) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    fn(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  const robeT = cv(256, 256, (x, w, h) => {
    const gr = x.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? "#cdd4d6" : "#f6f8f8");
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(0,0,0,.06)";
    for (let i = 0; i < w; i += 3) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, h);
      x.moveTo(0, i);
      x.lineTo(w, i);
      x.stroke();
    }
    // embroidered hem: a gold band with a row of little lamps between two thin lines
    x.fillStyle = "#e8c060";
    x.fillRect(0, h - 34, w, 22);
    x.fillRect(0, h - 40, w, 3);
    x.fillRect(0, h - 9, w, 3);
    x.fillStyle = "#8a5a1a";
    for (let i = 0; i < 8; i++) {
      const cx = (i + 0.5) * (w / 8);
      x.beginPath();
      x.moveTo(cx, h - 31);
      x.lineTo(cx + 6, h - 23);
      x.lineTo(cx, h - 15);
      x.lineTo(cx - 6, h - 23);
      x.closePath();
      x.fill();
    }
    for (let i = 0; i < 700; i++) {
      x.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.3)";
      x.fillRect(Math.random() * w, Math.random() * (h - 44), 1 + Math.random() * 2, 1);
    }
  });
  robeT.repeat.set(2, 1);
  const faceT = cv(256, 128, (x, w, h) => {
    x.fillStyle = "#fff";
    x.fillRect(0, 0, w, h);
    [-1, 1].forEach((s) => {
      const cx = w * (0.25 + s * 0.075),
        cy = h * 0.6,
        q = x.createRadialGradient(cx, cy, 1, cx, cy, w * 0.06);
      q.addColorStop(0, "rgba(255,120,120,.5)");
      q.addColorStop(1, "rgba(255,120,120,0)");
      x.fillStyle = q;
      x.fillRect(0, 0, w, h);
    });
  });
  const b0 = new T.Box3(),
    b1 = new T.Box3(),
    v0 = new T.Vector3(),
    v1 = new T.Vector3(),
    s0 = new T.Vector3(),
    s1 = new T.Vector3();
  let face = null;
  o.traverse((m) => {
    if (!m.isMesh || !m.material || !m.material.color || m.userData.ol) return;
    const c = m.material.color.getHex(),
      gm = m.geometry,
      p = gm.parameters || {};
    // smoother round parts (shifted ones put back in place; ones scaled when built left alone)
    let n = null;
    if (gm.type === "SphereGeometry" && p.widthSegments < 24)
      n = new T.SphereGeometry(p.radius, 24, 18, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    else if (gm.type === "CylinderGeometry" && p.radialSegments < 20 && p.radialSegments > 5)
      n = new T.CylinderGeometry(
        p.radiusTop,
        p.radiusBottom,
        p.height,
        24,
        p.heightSegments,
        p.openEnded,
        p.thetaStart,
        p.thetaLength,
      );
    else if (gm.type === "ConeGeometry" && p.radialSegments < 20 && p.radialSegments > 6)
      n = new T.ConeGeometry(p.radius, p.height, 24, p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
    if (n) {
      gm.computeBoundingBox();
      n.computeBoundingBox();
      gm.boundingBox.getSize(s0);
      n.boundingBox.getSize(s1);
      if (Math.abs(s0.y - s1.y) <= 0.03 * Math.max(s1.y, 0.01) + 0.002) {
        b0.copy(gm.boundingBox).getCenter(v0);
        b1.copy(n.boundingBox).getCenter(v1);
        if (Math.abs(v0.y - v1.y) > 0.002) n.translate(0, v0.y - v1.y, 0);
        // keep the outline twin (same geometry) in step
        if (m.parent) m.parent.children.forEach((q) => q.userData.ol && q.geometry === gm && (q.geometry = n));
        m.geometry = n;
      }
    }
    if (c === NSPEC.qhub.robe) {
      m.material.map = robeT;
      m.material.needsUpdate = true;
    } else if (c === NSPEC.qhub.hc) {
      m.material = HATT.mat(3, 2);
      m.material.color.setHex(NSPEC.qhub.hc);
    } else if (c === NSPEC.qhub.trim && m.material.emissive) {
      m.material.emissive.setHex(0x5a3a08);
    } else if (
      c === 0xf1c9a5 &&
      (m.geometry.parameters || {}).radius > ((face && face.geometry.parameters.radius) || 0)
    )
      face = m;
  });
  if (face) {
    face.material.map = faceT;
    face.material.needsUpdate = true;
  }
}
// Oona idles on her dais, and bobs, leans in and turns about while she's talking (PRAC.talk); the braziers flicker
function pracLoop() {
  if (PRAC.raf) return;
  let last = performance.now();
  const st = (now) => {
    if (!PRAC.g || !PRAC.g.visible) {
      PRAC.raf = 0;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000),
      s = now / 1000,
      o = PRAC.oona,
      k = PRAC.talk > 0 ? 1 : 0;
    last = now;
    PRAC.talk = Math.max(0, PRAC.talk - dt);
    o.position.y = 0.88 + Math.abs(Math.sin(s * 9)) * 0.07 * k;
    o.rotation.y = Math.sin(s * 0.7) * 0.15 + Math.sin(s * 5) * 0.14 * k;
    PRAC.bow = Math.max(0, (PRAC.bow || 0) - dt);
    o.rotation.x = -0.07 * k + (PRAC.bow > 0 ? 0.4 * Math.sin((1 - PRAC.bow / 1.2) * Math.PI) : 0);
    personLife(o, s, dt);
    PRAC.fl.forEach((f, i) => f.scale.setScalar(f.userData.s * (0.9 + 0.12 * Math.sin(s * 9 + i * 1.7))));
    PRAC.raf = requestAnimationFrame(st);
  };
  PRAC.raf = requestAnimationFrame(st);
}
// a line of Oona's in the cutscene (null hides the box). Waits long enough to read; Space / click skips.
async function oonaSay(t) {
  let el = CSO.querySelector(".osp");
  if (!el) {
    const st = document.createElement("style");
    st.textContent =
      "#cso .osp{position:absolute;left:50%;bottom:15%;transform:translateX(-50%);width:min(560px,calc(100% - 32px));" +
      "background:linear-gradient(180deg,rgba(38,26,58,.95),rgba(20,14,34,.95));border:1px solid #c9a24a;border-radius:14px;" +
      "padding:12px 16px;color:#f3ecff;font:15px/1.5 system-ui;z-index:4;opacity:0;transition:opacity .3s;pointer-events:none}" +
      "#cso .osp>b{display:block;color:#7fe0d0;font:800 14px Fraunces,Georgia,serif;margin-bottom:2px}" +
      "#cso .osp span b{color:#ffd98a}";
    document.head.appendChild(st);
    el = document.createElement("div");
    el.className = "osp";
    el.innerHTML = "<b>Oona</b><span></span>";
    CSO.appendChild(el);
  }
  if (!t) {
    el.style.opacity = 0;
    return;
  }
  el.querySelector("span").innerHTML = t;
  el.style.opacity = 1;
  PRAC.talk = 2.2;
  await csW(1500 + t.length * 40);
}
// the Primer's practice fight: fade into the Vault, Oona's welcome, then the fight (solo, see fight() / gather())
async function tutPrac() {
  if (mode !== "explore" || paused || CUT) return;
  vaultBuild();
  PRAC.ret = [W.position.x, W.position.z, W.rotation.y];
  mode = "cut";
  CUT = { skip: false, shk: 0 };
  mv = 0;
  for (const k in keys) keys[k] = false;
  CSP.copy(C.position);
  CSLK.copy(W.position).setY(2.2);
  document.body.classList.add("cut");
  CSO.className = "on";
  csCap("");
  requestAnimationFrame(() => CSO.classList.add("in"));
  const fd = CSO.querySelector(".fd");
  fd.style.opacity = 1;
  await new Promise((r) => setTimeout(r, 450));
  // into the Vault, facing Oona's dais
  PRAC.g.visible = true;
  pracLoop();
  W.position.set(VLX + 2, 0, VLZ + 7);
  W.rotation.y = Math.PI;
  saved.copy(W.position);
  theme("dunV");
  CSP.set(VLX + 10, 4.5, VLZ + 16);
  CSLK.set(VLX, 2, VLZ - 4);
  fd.style.opacity = 0;
  csCap("The Lamplighters' Vault", "A practice fight", "Oona's lesson");
  await csCam(csV(VLX + 6, 3.4, VLZ + 9), csV(VLX, 2.2, VLZ - 6), 2600);
  csCap("");
  await csCam(csV(VLX + 2.4, 3.6, VLZ - 4.5), csV(VLX, 3.2, VLZ - 12), 1600);
  const nm = escH(P.name || "lamplighter");
  for (const line of [
    "There you are, " +
      nm +
      "! Welcome to the <b>Lamplighters' Vault</b>. Every keeper of the lamps learns their spells down here.",
    "I keep a pair of little gloomlings in here for practice. They can sting, but they <b>can't knock you out</b>, so try everything.",
    "I'll call out what to do from up here on the dais. Watch for the <b>glowing</b> parts of your screen.",
    "Ready? Light it up!",
  ])
    await oonaSay(line);
  oonaSay(null);
  await csCam(csV(VLX, 5, VLZ + 13), csV(VLX, 1, VLZ), 1100);
  CSO.classList.remove("in");
  document.body.classList.remove("cut");
  setTimeout(() => {
    if (!CUT) CSO.className = "";
  }, 700);
  CUT = null;
  mode = "explore";
  const o = new T.Object3D();
  o.position.set(VLX, 0, VLZ);
  fight({ prac: 1, o, kind: "gloom", t: 1, hx: VLX, hz: VLZ });
}
// v18: while Oona talks in the practice fight the camera turns to her dais (BG-local coords: the battlefield sits on
// the Vault's centre, unrotated, so her dais is at z -12). Called from the battle camera in 11-explore.js.
function pracCam(CV, CT) {
  if (!g || !g.prac || mode !== "battle" || !(PRAC.look > performance.now())) return false;
  CV.set(2.8, 3.9, -5);
  CT.set(0, 3, -12);
  return true;
}
// ---- Oona's demonstrations: she acts out each card in front of her while she explains it (Vault-local coords) ----
const pv3 = (x, y, z) => new T.Vector3(x, y, z),
  OFR = pv3(0, 3.3, -10.9); // just in front of Oona, toward the camera
let PDIA = null; // a gold diamond texture for pips (drawn once)
function pSpr(col, s, p, map) {
  const sp = new T.Sprite(map ? new T.SpriteMaterial({ map, transparent: true, depthWrite: false }) : AM(GLT));
  if (!map) sp.material.color.setHex(col);
  sp.scale.setScalar(s);
  sp.position.copy(p);
  PRAC.g.add(sp);
  return sp;
}
function pKill(o) {
  if (!o) return;
  PRAC.g.remove(o);
  if (o.material) o.material.dispose();
}
async function pFly(o, to, ms) {
  const a = o.position.clone();
  await tw(ms, (k) => o.position.lerpVectors(a, to, k * k * (3 - 2 * k)));
}
async function pFade(o, ms, a0, a1) {
  await tw(ms, (k) => (o.material.opacity = a0 + (a1 - a0) * k));
}
function pRing(p, col, r0, r1, ms, flat) {
  const m = new T.Mesh(
    new T.RingGeometry(0.82, 1, 40),
    new T.MeshBasicMaterial({ color: col, transparent: true, blending: T.AdditiveBlending, depthWrite: false }),
  );
  if (flat) m.rotation.x = -Math.PI / 2;
  m.position.copy(p);
  PRAC.g.add(m);
  return tw(ms, (k) => {
    m.scale.setScalar(r0 + (r1 - r0) * k);
    m.material.opacity = flat ? 1 - k : 1;
  }).then(() => m);
}
function pBurst(p, col) {
  const s = pSpr(col, 0.4, p);
  return tw(380, (k) => {
    s.scale.setScalar(0.4 + 2.6 * k);
    s.material.opacity = 1 - k;
  }).then(() => pKill(s));
}
async function pracDemo(k) {
  if (!PRAC.g || !PRAC.g.visible) return;
  const G = PRAC.g;
  try {
    if (k === "field") {
      // a gold ring sweeps out from her feet across the floor
      pKill(await pRing(pv3(0, 0.95, -12), 0xffd27a, 0.5, 6, 1400, 1));
    } else if (k === "cards") {
      // your own hand's cards fan up out of her lamp, then fade
      const L = new T.TextureLoader(),
        cs = (g.hand || []).slice(0, 3).map((c, i) => {
          const s = pSpr(0, 0.2, OFR, L.load(ART[c.art || c.k]));
          s.material.opacity = 0;
          return s;
        });
      await Promise.all(
        cs.map(async (s, i) => {
          await wait(i * 160);
          const to = pv3((i - (cs.length - 1) / 2) * 1.05, 4.1 - Math.abs(i - 1) * 0.15, -10.6);
          tw(400, (q) => {
            s.material.opacity = q;
            s.scale.set(0.2 + 0.7 * q, 0.2 + 0.95 * q, 1);
          });
          await pFly(s, to, 500);
        }),
      );
      await wait(2200);
      await Promise.all(cs.map((s) => pFade(s, 400, 1, 0)));
      cs.forEach(pKill);
    } else if (k === "pips") {
      // two pips pop out of the lamp and hang there like drops of lamp oil
      if (!PDIA) {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const x = c.getContext("2d");
        x.fillStyle = "#ffd34d";
        x.strokeStyle = "#5a3a08";
        x.lineWidth = 4;
        x.beginPath();
        x.moveTo(32, 4);
        x.lineTo(56, 32);
        x.lineTo(32, 60);
        x.lineTo(8, 32);
        x.closePath();
        x.fill();
        x.stroke();
        PDIA = new T.CanvasTexture(c);
      }
      const ps = [0, 1].map(() => pSpr(0, 0.1, OFR, PDIA));
      await Promise.all(
        ps.map(async (s, i) => {
          await wait(i * 350);
          tw(300, (q) => s.scale.setScalar(0.1 + 0.5 * q));
          await pFly(s, pv3(i ? 0.5 : -0.5, 4.2, -10.7), 450);
        }),
      );
      await wait(2200);
      await Promise.all(ps.map((s) => pFade(s, 400, 1, 0)));
      ps.forEach(pKill);
    } else if (k === "kinds") {
      // attack: a red bolt flies off; summon: a violet wisp circles her; support: a green shield swells round her
      const r = pSpr(0xff5a3a, 0.9, OFR);
      await pFly(r, pv3(3.5, 3, -6), 500);
      await pBurst(r.position, 0xff5a3a);
      pKill(r);
      const w = pSpr(0xb58aff, 0.8, OFR);
      await tw(1200, (q) =>
        w.position.set(Math.sin(q * 6.28) * 1.4, 3.1 + Math.sin(q * 12) * 0.2, -12 + Math.cos(q * 6.28) * 1.4),
      );
      pKill(w);
      const sh = new T.Mesh(
        new T.SphereGeometry(1.6, 24, 16),
        new T.MeshBasicMaterial({
          color: 0x7dff9a,
          transparent: true,
          opacity: 0,
          blending: T.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sh.position.set(0, 2.2, -12);
      G.add(sh);
      await tw(500, (q) => (sh.material.opacity = 0.35 * q));
      await wait(700);
      await tw(400, (q) => (sh.material.opacity = 0.35 * (1 - q)));
      pKill(sh);
    } else if (k === "aim") {
      // a gold ring closes on a little target orb; she catches it just right
      const t = pSpr(0xb58aff, 0.7, pv3(0, 3.4, -10.6)),
        rg = await pRing(pv3(0, 3.4, -10.55), 0xffd27a, 2.2, 0.45, 1100);
      pKill(rg);
      PRAC.talk = Math.max(PRAC.talk, 0.8);
      await pBurst(t.position, 0xffe066);
      pKill(t);
    } else if (k === "end") {
      PRAC.bow = 1.2; // a little bow: your turn's done, over to them
    } else if (k === "block") {
      // a dark bolt flies at her and splashes off a shield she raises
      const sh = new T.Mesh(
        new T.SphereGeometry(1.7, 24, 16),
        new T.MeshBasicMaterial({
          color: 0x8ad0ff,
          transparent: true,
          opacity: 0,
          blending: T.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sh.position.set(0, 2.3, -12);
      G.add(sh);
      tw(300, (q) => (sh.material.opacity = 0.4 * q));
      const b = pSpr(0x8a4aff, 0.9, pv3(3, 3, -5));
      await pFly(b, pv3(0.6, 2.6, -10.6), 600);
      await pBurst(b.position, 0x8ad0ff);
      pKill(b);
      await tw(400, (q) => (sh.material.opacity = 0.4 * (1 - q)));
      pKill(sh);
    } else if (k === "school") {
      const col = (CL[P.cls] || [0xffd27a])[0],
        o = pSpr(col, 1, OFR);
      await tw(1600, (q) => o.position.set(Math.sin(q * 9) * 1.1, 2.4 + q * 1.8, -12 + Math.cos(q * 9) * 1.1));
      await pBurst(o.position, col);
      pKill(o);
    }
  } catch (e) {
    console.warn("oona demo", e);
  }
}
// out of the Vault (called by leave() in 10-battle-flow.js when the practice fight ends, won or fled)
function pracEnd() {
  const r = PRAC.ret;
  if (PRAC.g) PRAC.g.visible = false;
  if (!r) return;
  PRAC.ret = null;
  if (PRAC.newc) {
    // v21: a brand-new lamplighter climbs out of the Vault into the village for the first time
    PRAC.newc = 0;
    vaultExit();
  }
  W.position.set(r[0], 0, r[1]);
  W.rotation.y = r[2];
  saved.copy(W.position);
  theme(themeKey(r[0], r[1]));
  snap = true;
}
// v21 new characters begin in the Vault: straight into Oona's welcome and the practice fight (the Primer jumps to its
// practice card), then up the stairs to Lamplight Square through a short lore card. Called by the class picker.
function tutNew() {
  if (SLOT < 0 || !P.cls) return;
  P.tut = 3; // TUTS[2] = "A practice fight"
  sv();
  PRAC.newc = 1;
  let n = 0;
  const go = () => {
    if (mode === "explore" && !paused && !CUT) tutPrac();
    else if (++n < 40) setTimeout(go, 150);
  };
  setTimeout(go, 30);
}
// the climb out: a dark card with a few lines of lore, the place name and the controls, while the world loads behind it
function vaultExit() {
  const d = document.createElement("div");
  d.id = "vexit";
  d.style.cssText =
    "position:fixed;inset:0;z-index:65;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "gap:14px;background:radial-gradient(ellipse at center,#1c1430,#05040a);color:#f6ead0;text-align:center;" +
    "padding:24px;opacity:1;transition:opacity .9s;cursor:pointer;font-family:Georgia,serif";
  d.innerHTML =
    '<p style="max-width:620px;font:500 clamp(16px,2.2vw,21px)/1.6 Georgia,serif;opacity:0;transition:opacity 1.2s">' +
    "You climb the Vault's long stair. Oil-smoke and rain drift down to meet you, and somewhere above, a lamp " +
    "is guttering.</p>" +
    '<div style="font:800 clamp(30px,6vw,56px) Fraunces,Georgia,serif;color:#ffd27a;opacity:0;transition:opacity 1.2s;' +
    'text-shadow:0 0 30px rgba(255,170,60,.5)">Lamplight Square</div>' +
    '<small style="font:600 13px system-ui;letter-spacing:.12em;color:#b9b3e6;opacity:0;transition:opacity 1s">' +
    "WASD to move · SHIFT to run · E to talk · B for your Book</small>";
  document.body.appendChild(d);
  const ps = d.children;
  paused = true;
  setTimeout(() => (ps[0].style.opacity = 1), 150);
  setTimeout(() => (ps[1].style.opacity = 1), 1300);
  setTimeout(() => (ps[2].style.opacity = 1), 2100);
  let done = 0;
  const end = () => {
    if (done) return;
    done = 1;
    d.style.opacity = 0;
    if ($("panel").style.display !== "flex") paused = false;
    setTimeout(() => d.remove(), 950);
    toast("Oona in the square has an important task for you (gold !)", "#ffd34d");
  };
  d.onclick = end;
  setTimeout(end, 4600);
}
// v18: glow round the part of the screen the current card talks about. It's a live style rule rather than a class,
// because the battle redraws the hand and foe list on every update (a class on a card would be wiped).
let tutHiSel = "";
function tutHi(sel, css) {
  if (sel + (css || "") === tutHiSel) return;
  tutHiSel = sel + (css || "");
  let st = $("tuths");
  if (!st) {
    st = document.createElement("style");
    st.id = "tuths";
    document.head.appendChild(st);
  }
  st.textContent = sel
    ? sel +
      "{outline:3px solid #ffd27a!important;outline-offset:3px;border-radius:10px;" +
      "animation:tutP 1s ease-in-out infinite}" +
      (css || "")
    : css || "";
}
function tutNext() {
  const n = tutI + 1;
  if (n >= TUTS.length) return tutEnd(false);
  P.tut = n + 1;
  sv();
  tutShow(n);
}
function tutEnd(skip) {
  tutI = -1;
  P.tut = 99;
  sv();
  const el = $("tut");
  if (el) el.className = "hide";
  tutHi("");
  toast(skip ? "Primer skipped. Replay it any time from Book > Options." : "Primer complete. Keep the lamps burning!");
}
// start (or restart with force) from the first card
function tutStart(force) {
  if (SLOT < 0) return;
  if (force || !P.tut) {
    P.tut = 1;
    sv();
  }
  if (P.tut >= 1 && P.tut <= TUTS.length) tutShow(P.tut - 1);
}
setInterval(() => {
  if (SLOT !== tutSlot) {
    // a different character: hide the old card, and characters already under way skip the primer
    tutSlot = SLOT;
    tutI = -1;
    const el = $("tut");
    if (el) el.className = "hide";
    if (SLOT >= 0 && !P.tut && (P.lvl > 1 || P.kills > 0 || Object.keys(P.done || {}).length)) {
      P.tut = 99;
      sv();
    }
  }
  if (SLOT < 0 || !P.cls || P.tut >= 99) return;
  const inB = mode === "battle" || mode === "guest",
    calm = mode === "explore" && !paused && $("chars").style.display === "none";
  if (tutI < 0) {
    if (!calm && !inB) return;
    tutStart(false);
    if (tutI < 0) return;
  }
  let s = TUTS[tutI];
  // left the fight before the battle cards were done: move on to the after-battle cards
  if (s.w === "b" && !inB && mode === "explore") {
    const k = TUTS.findIndex((q, j) => j > tutI && q.w === "x");
    if (k < 0) return tutEnd(false);
    P.tut = k + 1;
    sv();
    tutShow(k);
    s = TUTS[k];
  }
  const el = tutEl(),
    // the Book card stays up until the Book opens; otherwise hide behind open pages and cutscenes
    vis = (s.w === "b" ? inB : calm) && !(mode === "battle" && g && g.intro);
  el.className = vis ? (inB ? "bat" : "") : "hide";
  tutHi(vis && s.hi ? (typeof s.hi === "function" ? s.hi(tutS) : s.hi) : "", vis ? s.css : "");
  if (vis && s.tick) s.tick(tutS, el);
  if ((s.go && s.go(tutS)) || (s.clk && tutS.clk)) tutNext();
}, 250);
// v29: a "clk" card is done when you click (press on) what it glows round. Checked on the press itself, in the capture
// phase, because the battle redraws the foe list and hand right after a click
document.addEventListener(
  "pointerdown",
  (e) => {
    const s = TUTS[tutI],
      el = $("tut");
    if (!s || !s.clk || !el || el.className === "hide" || !e.target.closest) return;
    const sel = typeof s.hi === "function" ? s.hi(tutS) : s.hi;
    if (sel && e.target.closest(sel)) tutS.clk = 1;
  },
  true,
);
