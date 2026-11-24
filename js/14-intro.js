// DUSKWICK - 14-intro.js: title screen and the prologue (how the gloom spread).
// Loaded last. It owns the camera while paused through titleCam(), which the main loop calls.
// ---------- title + prologue ----------
(() => {
  const css = document.createElement("style");
  css.textContent = `
#title,#intro{position:absolute;inset:0;z-index:9;display:none;flex-direction:column;align-items:center;color:#ffe9b0;text-align:center}
#title{justify-content:space-between;padding:9vh 16px 7vh;background:radial-gradient(ellipse at 50% 38%,transparent 30%,rgba(8,5,20,.55) 80%),linear-gradient(rgba(8,5,20,.55),transparent 35%,transparent 60%,rgba(8,5,20,.8))}
#title h1{margin:0;font:800 clamp(46px,11vw,112px)/1 Fraunces,Georgia,serif;letter-spacing:.04em;background:linear-gradient(#fff6d8,#ffd27a 55%,#c9743a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #1a1208) drop-shadow(0 0 28px rgba(255,170,80,.45));animation:tglow 4s ease-in-out infinite}
#title .tsub{font:700 clamp(11px,1.6vw,14px) system-ui;letter-spacing:.42em;text-transform:uppercase;color:#d8c8ff;margin-top:10px;text-shadow:0 2px 4px #000}
#title .tbtns{display:flex;flex-direction:column;gap:10px;width:min(260px,80vw)}
#title .tbtns .pb{min-height:46px;font:800 17px Fraunces,Georgia,serif;letter-spacing:.06em;background:linear-gradient(#3a2a52,#1c1430);border:1px solid var(--gd);color:#ffe9b0;box-shadow:0 0 0 2px #1a1208,0 6px 16px rgba(0,0,0,.5);transition:transform .15s,box-shadow .15s}
#title .tbtns .pb:hover,#title .tbtns .pb:focus-visible{transform:translateY(-2px);box-shadow:0 0 0 2px #1a1208,0 0 18px rgba(255,200,110,.45)}
#title .tbtns .pb.main{background:linear-gradient(#e6b84a,#a8741a);color:#2a1a05;border-color:#ffe29a}
#title .tft{font:600 11px system-ui;color:#a89cd8;letter-spacing:.08em;text-shadow:0 1px 3px #000}
@keyframes tglow{50%{filter:drop-shadow(0 3px 0 #1a1208) drop-shadow(0 0 40px rgba(255,170,80,.7))}}
#intro{z-index:10;justify-content:flex-end;cursor:pointer;background:transparent}
#intro::before,#intro::after{content:'';position:absolute;left:0;right:0;height:11vh;background:#000;transition:height 1s}
#intro::before{top:0}#intro::after{bottom:0}
#intro .itx{position:relative;z-index:1;max-width:min(760px,92vw);margin-bottom:15vh;font:500 clamp(17px,2.4vw,24px)/1.55 Georgia,serif;color:#f6ead0;text-shadow:0 2px 4px #000,0 0 18px #000;opacity:0}
#intro .itx.on{animation:itx 1.4s ease-out forwards}
#intro .itx.end{font:800 clamp(28px,5vw,48px) Fraunces,Georgia,serif;color:#ffd27a}
@keyframes itx{from{opacity:0;transform:translateY(10px);filter:blur(4px)}to{opacity:1;transform:none;filter:none}}
#intro .iskip{position:absolute;right:14px;top:calc(11vh + 10px);z-index:2;background:rgba(20,14,30,.75);border:1px solid #8a7ad8;color:#d8c8ff;padding:4px 12px;min-height:30px;font-size:13px}
#intro .idots{display:none!important;position:absolute;bottom:calc(11vh + 14px);left:0;right:0;z-index:1;display:flex;justify-content:center;gap:6px}
#intro .idots i{width:7px;height:7px;border-radius:50%;background:rgba(255,233,176,.25)}#intro .idots i.on{background:#ffd27a}
#ifade{position:absolute;inset:0;background:#000;z-index:11;pointer-events:none;opacity:0;transition:opacity .7s}
body.ttl .hud,body.ttl #mmw,body.ttl #gold,body.ttl #book,body.ttl #bag,body.ttl #fsb,body.ttl #hint,body.ttl #joy,body.ttl #run,body.ttl #zcard,body.ttl #toasts{display:none!important}
body.ttl #chars{background:radial-gradient(ellipse at center,rgba(10,8,28,.55),rgba(10,8,28,.9))}
#chars .pbox h2{font-size:26px;text-align:center;color:#ffd27a;margin-bottom:2px}
#chars .csub{text-align:center;font:600 11px system-ui;letter-spacing:.3em;text-transform:uppercase;color:#b9b3e6;margin-bottom:10px}
#slots .row{border:1px solid #4a3a20;border-radius:12px;padding:10px 12px;margin:8px 0;background:linear-gradient(#2e2216,#1a120a);border-left:5px solid var(--cc,#4a3a20)}
#slots .row.emp{border-style:dashed;border-left-width:1px;opacity:.85}
#slots .row b{font:800 16px Fraunces,Georgia,serif;color:#ffe9b0}
#slots .cbadge{flex:none;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 15px Fraunces,Georgia,serif;color:#1a1208;background:radial-gradient(circle at 35% 30%,#fff,var(--cc,#888) 60%);box-shadow:0 0 12px var(--cc,transparent)}
#slots .row.emp .cbadge{background:#2a2016;color:#8a7a5a;box-shadow:none;border:1px dashed #6a5424}
`;
  document.head.appendChild(css);
  const stg = $("stage");
  const ttl = document.createElement("div");
  ttl.id = "title";
  ttl.innerHTML =
    '<div><h1>Duskwick</h1><div class="tsub">The lamps are all that hold the dark</div></div>' +
    '<div class="tbtns"><button class="pb main" id="tplay">Play</button><button class="pb" id="tpro">Prologue</button></div>' +
    '<div class="tft"></div>';
  stg.appendChild(ttl);
  const itr = document.createElement("div");
  itr.id = "intro";
  itr.innerHTML = '<button class="pb iskip">Skip ▸▸</button><div class="itx"></div><div class="idots"></div>';
  stg.appendChild(itr);
  const fade = document.createElement("div");
  fade.id = "ifade";
  stg.appendChild(fade);
})();
// shots: camera moves from a to b while looking at l (world coords), text shown over it
const IOZ = OZ,
  SPZ = OZ + TCZ;
const ISHOTS = [
  {
    a: [0, 5, SPZ + 75],
    b: [0, 9, SPZ + 50],
    l: [0, 16, SPZ],
    t: "Long ago, Duskwick faced the sunrise. Pilgrims walked Sunward Street to the Sun Tower, where the Dawn Ember burned and kept the whole valley warm.",
  },
  {
    a: [-574, 10, -372],
    b: [-582, 8, -424],
    l: [-600, 2, -400],
    t: "Then the charcoal-burners of Cinder Hollow wanted the Ember brighter. They fed it everything they had. The fire grew hungry, and the Ember split in two.",
  },
  {
    a: [18, 26, SPZ + 46],
    b: [-18, 32, SPZ + 42],
    l: [0, 26, SPZ],
    t: "The sun slipped behind the tower and never rose again. The Ember's keeper, the Warden, carried what was left to the top and sealed the doors. The Sun Tower became the Gloomspire.",
  },
  {
    a: [626, 9, -378],
    b: [614, 7, -426],
    l: [600, 2, -400],
    t: "With the Ember gone, the warmth went too. Frostfen's hot springs froze in a single night, and its loyal wolves forgot whose they were.",
  },
  {
    a: [MWX + 26, 8, -380],
    b: [MWX + 14, 6, -428],
    l: [MWX, 2, -400],
    t: "And in the long dusk the gloom crept in: shadows grown from fears, grudges and forgotten things. Wherever a lamp goes out, the gloom grows.",
  },
  {
    a: [12, 5, IOZ + 12],
    b: [5, 3, IOZ + 6],
    l: [0, 2.5, IOZ],
    t: "Only the lamps hold it back. Each is a cutting of the Ember's flame, and the people who keep them lit are called lamplighters.",
  },
  { a: [0, 3, IOZ + 10], b: [0, 15, IOZ + 30], l: [0, 1, IOZ], t: "You are the newest of them.", end: 1 },
];
const TI = { on: 0, mode: "", k: 0, tk: 0, done: null, keep: null };
const ITIME = 7.5;
const _v0 = new T.Vector3(),
  _v1 = new T.Vector3();
function titleCam(dt, s) {
  if (!TI.on) return;
  if (TI.mode === "title") {
    const r = 21,
      an = s * 0.07;
    C.position.set(OX + Math.sin(an) * r, 7.5 + Math.sin(s * 0.21) * 1.2, OZ + Math.cos(an) * r);
    C.lookAt(OX, 3, OZ);
    return;
  }
  // prologue
  const sh = ISHOTS[TI.k];
  if (!sh) return;
  TI.tk += dt;
  const D = sh.d || ITIME, // v33: a shot may set its own length (d) and animate itself (tick)
    e = Math.min(1, TI.tk / D),
    q = e * e * (3 - 2 * e);
  _v0.fromArray(sh.a).lerp(_v1.fromArray(sh.b), q);
  C.position.copy(_v0);
  C.lookAt(sh.l[0], sh.l[1], sh.l[2]);
  if (sh.tick)
    try {
      sh.tick(TI.tk, dt, s);
    } catch (err) {
      console.warn("intro shot", err);
    }
  if (TI.tk > D + (sh.end ? 1.5 : 0)) introNext();
}
function introShot(k) {
  TI.k = k;
  TI.tk = 0;
  const sh = ISHOTS[k],
    it = document.querySelector("#intro .itx");
  W.position.set(sh.l[0], 0, sh.l[2]); // keeps townsfolk/weather near the shot
  try {
    theme(themeKey(sh.l[0], sh.l[2]));
  } catch (e) {}
  if (sh.go)
    try {
      sh.go(); // v33: shot set-up (46-gloomfall.js)
    } catch (e) {
      console.warn("intro shot", e);
    }
  it.className = "itx";
  it.textContent = sh.t;
  void it.offsetWidth;
  it.className = "itx on" + (sh.end ? " end" : "");
  document.querySelectorAll("#intro .idots i").forEach((d, i) => d.classList.toggle("on", i === k));
}
let _ifT = 0;
function introNext() {
  if (_ifT) return;
  if (TI.k + 1 >= ISHOTS.length) return introEnd();
  const f = $("ifade");
  f.style.opacity = 1;
  _ifT = setTimeout(() => {
    _ifT = 0;
    introShot(TI.k + 1);
    f.style.opacity = 0;
  }, 650);
}
function introEnd() {
  if (TI.mode !== "intro") return;
  clearTimeout(_ifT);
  _ifT = 0;
  const f = $("ifade");
  f.style.opacity = 1;
  setTimeout(() => {
    $("intro").style.display = "none";
    if (TI.stop)
      try {
        TI.stop(); // v33: shots clean up after themselves (46-gloomfall.js)
      } catch (e) {}
    W.visible = true;
    W.position.copy(TI.keep.p);
    W.rotation.y = TI.keep.r;
    try {
      theme(themeKey(W.position.x, W.position.z));
    } catch (e) {}
    try {
      localStorage.setItem("duskwick_intro_seen", "1");
    } catch (e) {}
    const d = TI.done;
    TI.done = null;
    TI.mode = "title";
    f.style.opacity = 0;
    if (d) d();
  }, 700);
}
function playIntro(done) {
  TI.on = 1;
  TI.mode = "intro";
  TI.done = done || showTitle;
  TI.keep = { p: W.position.clone(), r: W.rotation.y };
  paused = true;
  mode = "explore";
  document.body.classList.add("ttl");
  ["title", "chars", "cls"].forEach((k) => ($(k).style.display = "none"));
  W.visible = false;
  const it = $("intro");
  it.querySelector(".idots").innerHTML = ISHOTS.map(() => "<i></i>").join("");
  it.style.display = "flex";
  introShot(0);
}
function showTitle() {
  TI.on = 1;
  TI.mode = "title";
  paused = true;
  mode = "explore";
  document.body.classList.add("ttl");
  ["chars", "cls", "intro"].forEach((k) => ($(k).style.display = "none"));
  $("title").style.display = "flex";
  setTimeout(() => $("tplay").focus(), 50);
}
function titleOff() {
  TI.on = 0;
  TI.mode = "";
  document.body.classList.remove("ttl");
  $("title").style.display = "none";
  $("intro").style.display = "none";
}
$("tplay").onclick = () => {
  $("title").style.display = "none";
  showChars();
};
$("tpro").onclick = () => playIntro(showTitle);
$("intro").addEventListener("click", (e) => {
  if (e.target.classList.contains("iskip")) introEnd();
  else introNext();
});
addEventListener(
  "keydown",
  (e) => {
    if (TI.mode !== "intro" || $("intro").style.display !== "flex") return;
    if (e.key === "Escape") introEnd();
    else if (e.key === " " || e.key === "Enter") introNext();
    else return;
    e.preventDefault();
    e.stopPropagation();
  },
  true,
);
// character select: a back button to the title
(() => {
  const bx = document.querySelector("#chars .pbox");
  const sub = document.createElement("div");
  sub.className = "csub";
  sub.textContent = "Choose your lamplighter";
  bx.insertBefore(sub, $("slots"));
  const bk = mkBtn("◂ Back to title", false, showTitle);
  bk.style.cssText = "margin-top:10px;width:100%;background:#2a2450;border:1px solid #6a5ac8";
  bx.appendChild(bk);
})();
showTitle();
