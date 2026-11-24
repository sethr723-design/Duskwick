// DUSKWICK - 12-start.js: Start: character slots, new character, startGame, input bindings.
// Loaded in order by index.html as plain scripts; they share one global scope.
// ---------- start ----------
const newG = () => ({
  hp: mhp(),
  en: 0,
  sums: [],
  allies: [],
  foes: [],
  hand: [],
  busy: false,
  turn: 0,
  pst: { burn: 0, chill: 0 },
  hid: [],
});
g = newG();
W.position.set(OX, 0, OZ + 9);
W.rotation.y = Math.PI;
saved.copy(W.position);
tint();
theme("hub");
applyCos();
const mkBtn = (t, dis, fn) => {
  const b = document.createElement("button");
  b.className = "pb";
  b.textContent = t;
  b.disabled = dis;
  b.onclick = fn;
  return b;
};
function showChars() {
  paused = true;
  mode = "explore";
  if (typeof TI !== "undefined") {
    // keep the slow title orbit going behind the slots (14-intro.js)
    TI.on = 1;
    TI.mode = "title";
    document.body.classList.add("ttl");
  }
  const L = $("slots");
  L.innerHTML = "";
  for (let i = 0; i < 3; i++) {
    const d = ld(i),
      r = document.createElement("div");
    r.className = "row" + (d ? "" : " emp");
    const info = document.createElement("div"),
      nm = document.createElement("b"),
      sm = document.createElement("small"),
      bdg = document.createElement("div");
    bdg.className = "cbadge";
    const cc = d && d.cls && CL[d.cls] ? "#" + CL[d.cls][0].toString(16).padStart(6, "0") : "";
    if (cc) r.style.setProperty("--cc", cc);
    bdg.textContent = d ? d.lvl : "+";
    r.appendChild(bdg);
    info.appendChild(nm);
    info.appendChild(sm);
    r.appendChild(info);
    if (d) {
      nm.textContent = d.name;
      sm.textContent =
        "Lv " + d.lvl + " " + (d.cls ? CL[d.cls][1] : "New") + "   ✦" + d.gold + "   Foes slain " + d.kills;
      const bx = document.createElement("div");
      bx.style.cssText = "display:flex;gap:6px;flex:none";
      const del = mkBtn("Delete", false, null);
      del.style.background = "#5a2a2a";
      del.onclick = () => {
        if (del.dataset.arm) {
          try {
            localStorage.removeItem(SK(i));
          } catch (e) {}
          showChars();
        } else {
          del.dataset.arm = "1";
          del.textContent = "Confirm?";
          setTimeout(() => {
            del.dataset.arm = "";
            del.textContent = "Delete";
          }, 3000);
        }
      };
      bx.appendChild(mkBtn("Play", false, () => startGame(i)));
      bx.appendChild(del);
      r.appendChild(bx);
    } else {
      nm.textContent = "Empty slot";
      sm.textContent = "Create a new lamplighter";
      r.appendChild(mkBtn("New", false, () => newChar(i)));
    }
    L.appendChild(r);
  }
  $("chars").style.display = "flex";
}
// v21 character creator in steps: 1 Name (own field, checked against your other characters and anyone online),
// 2 School (the #cls panel, with Back), 3 Look (custOpen, with Back), then Begin. The name is kept in NCN and written
// into the save right before the game starts.
let NCN = "";
const ncTaken = (n) => {
  const lo = n.toLowerCase();
  for (let j = 0; j < 3; j++) {
    if (j === SLOT) continue;
    const d = ld(j);
    if (d && String(d.name || "").toLowerCase() === lo) return true;
  }
  return (
    typeof PEERS !== "undefined" && [...PEERS.values()].some((p) => p.pr && String(p.pr.name).toLowerCase() === lo)
  );
};
function newChar(i) {
  SLOT = i;
  P = DEFP();
  NCN = "";
  $("chars").style.display = "none";
  ncName();
}
function ncName() {
  $("cls").style.display = "none";
  let ov = $("ncw");
  if (ov) ov.remove();
  ov = document.createElement("div");
  ov.id = "ncw";
  ov.style.cssText =
    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,8,28,.74);" +
    "z-index:8;padding:16px;color:#fff";
  ov.innerHTML =
    '<div class="pbox" style="max-width:420px"><small style="color:#b9b3e6;letter-spacing:.2em">STEP 1 OF 3</small>' +
    '<h2>Name your lamplighter</h2><p class="lore" style="margin:0 0 8px">Since the Dawn Ember was lost, Duskwick ' +
    "has lived under an endless sunset. Lamplighters keep the town's lamps lit, and the lamps keep the gloom away.</p>" +
    '<input id="ncn" maxlength="12" placeholder="Name (2-12 letters)" autocomplete="off" spellcheck="false" ' +
    'style="width:100%;box-sizing:border-box;margin:4px 0;padding:9px 10px;border-radius:8px;border:1px solid ' +
    'var(--gd);background:#120c08;color:#ffe9b0;font:16px system-ui;-webkit-user-select:text;user-select:text">' +
    '<small id="ncerr" style="display:block;min-height:18px;color:#ff8a7a"></small>' +
    '<div style="display:flex;gap:8px;justify-content:space-between;margin-top:6px"></div></div>';
  document.body.appendChild(ov);
  const inp = ov.querySelector("#ncn"),
    err = ov.querySelector("#ncerr"),
    bar = ov.querySelector(".pbox > div:last-child");
  inp.value = NCN;
  const next = () => {
    const n = inp.value.replace(/\s+/g, " ").trim();
    if (n.length < 2) return (err.textContent = "Please enter a name (at least 2 letters).");
    if (!/^[\p{L}\p{N} '\-]+$/u.test(n)) return (err.textContent = "Letters, numbers, spaces, ' and - only.");
    if (ncTaken(n)) return (err.textContent = "Name is already taken");
    NCN = n;
    P.name = n;
    ov.remove();
    $("nm").value = n;
    $("nm").style.display = "none";
    clsList();
    $("cls").style.display = "flex";
  };
  // the field keeps its keys to itself, so nothing else in the game reacts to your typing
  ["keydown", "keyup", "keypress"].forEach((t) =>
    inp.addEventListener(t, (e) => {
      e.stopPropagation();
      if (t === "keydown" && e.key === "Enter") next();
      if (t === "keydown" && e.key === "Escape") back();
    }),
  );
  inp.addEventListener("input", () => {
    NCN = inp.value;
    err.textContent = "";
  });
  const back = () => {
    ov.remove();
    showChars();
  };
  bar.appendChild(mkBtn("◂ Back", false, back));
  const nb = mkBtn("Next ▸", false, next);
  nb.style.background = "#3a6a3a";
  bar.appendChild(nb);
  setTimeout(() => inp.focus(), 60);
}
// step 2 (the school list built in 07-gear-ui.js) gets a header and a Back button to the name
(() => {
  const bx = $("cls").querySelector(".pbox"),
    st = document.createElement("small");
  st.style.cssText = "color:#b9b3e6;letter-spacing:.2em";
  st.textContent = "STEP 2 OF 3 · CHOOSE YOUR SCHOOL";
  bx.insertBefore(st, bx.firstChild);
  const bk = mkBtn("◂ Back to name", false, ncName);
  bk.style.cssText = "margin-top:10px;width:100%;background:#2a2450;border:1px solid #6a5ac8";
  bx.appendChild(bk);
})();
// v18 character customizer: shown after you pick a class. A turnable preview (its own small renderer and a clone of
// the wizard, so nothing is added to the world) beside rows of choices: skin, hair and beard colour, beard style, eyes,
// height, and free starting robe / hat / cape colours (Pip's dyes). Saved in P.app and P.dye. done() runs on Begin.
function custOpen(done) {
  P.app = Object.assign({ skin: 0, hair: 0, beard: 0, eyes: 0, ht: 1 }, P.app);
  P.dye = P.dye || {};
  // v21: a new character starts dressed in their school's colour (the nearest dye to it): robe, hat and cape
  // (dyeAuto = which school picked them, so going Back and choosing another school recolours until you pick yourself)
  if ((!Object.keys(P.dye).length || P.dyeAuto) && P.cls && CL[P.cls] && P.dyeAuto !== P.cls) {
    P.dyeAuto = P.cls;
    const c = CL[P.cls][0],
      d2 = (h) =>
        (((h >> 16) & 255) - ((c >> 16) & 255)) ** 2 +
        (((h >> 8) & 255) - ((c >> 8) & 255)) ** 2 +
        ((h & 255) - (c & 255)) ** 2,
      best = DYES.reduce((a, h) => (d2(h) < d2(a) ? h : a), DYES[0]);
    P.dye = { robe: best, hat: best, cape: best };
  }
  const ov = document.createElement("div");
  ov.id = "cust";
  ov.style.cssText =
    "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,8,28,.74);" +
    "z-index:6;padding:16px;color:#fff";
  const box = document.createElement("div");
  box.className = "pbox";
  // v18: always side by side: the choices scroll on their own on the left, the preview stands still on the right
  // (they used to stack, and the pinned preview slid over the choices)
  box.style.cssText =
    "display:flex;flex-wrap:nowrap;gap:14px;align-items:flex-start;max-width:820px;width:100%;" +
    "max-height:92vh;overflow:hidden;text-align:left";
  ov.appendChild(box);
  // ---- preview ----
  const nar = innerWidth < 640,
    PW = Math.round(
      nar ? Math.max(110, Math.min(170, innerWidth * 0.36)) : Math.min(260, Math.max(180, innerHeight * 0.45)),
    ),
    PH = Math.round(Math.min(PW / 0.73, innerHeight * 0.8)),
    pr = new T.WebGLRenderer({ antialias: true, alpha: true });
  pr.setPixelRatio(Math.min(devicePixelRatio, 2));
  pr.setSize(PW, PH);
  const cv = pr.domElement;
  cv.style.cssText =
    "border-radius:12px;background:radial-gradient(circle at 50% 40%,#43386e,#14102a);cursor:grab;touch-action:none;flex:none";
  const pv = document.createElement("div");
  pv.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;flex:none;order:2";
  const hn = document.createElement("small");
  hn.style.color = "#b9b3e6";
  hn.textContent = "Drag to turn";
  pv.appendChild(cv);
  pv.appendChild(hn);
  box.appendChild(pv);
  const sc = new T.Scene();
  sc.add(new T.HemisphereLight(0xfff0e0, 0x302848, 0.95));
  const dl = new T.DirectionalLight(0xffe6c0, 0.85);
  dl.position.set(3, 6, 6);
  sc.add(dl);
  const cam = new T.PerspectiveCamera(28, PW / PH, 0.1, 60);
  cam.position.set(0, 2.1, 10.5);
  cam.lookAt(0, 1.75, 0);
  const o = W.clone(true),
    kill = [];
  o.traverse((m) => {
    if (m.isLight) kill.push(m);
    else if (m.material) m.material = m.material.clone();
  });
  kill.forEach((m) => m.parent.remove(m));
  o.userData = { wiz: 1 };
  o.position.set(0, 0, 0);
  o.rotation.set(0, 0, 0);
  o.visible = true;
  sc.add(o);
  const paint = () => wizPaint(o, pubLook());
  paint();
  let alive = true,
    last = performance.now(),
    ry = 0.35,
    drag = null;
  cv.onpointerdown = (e) => {
    drag = e.clientX;
    cv.setPointerCapture(e.pointerId);
    cv.style.cursor = "grabbing";
  };
  cv.onpointermove = (e) => {
    if (drag == null) return;
    ry += (e.clientX - drag) * 0.012;
    drag = e.clientX;
  };
  cv.onpointerup = cv.onpointercancel = () => {
    drag = null;
    cv.style.cursor = "grab";
  };
  (function tick(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // v47 polish: no auto-spin; it only turns while you drag it
    o.rotation.y = ry;
    wizAnim(o, now / 1000, dt, 0, 0);
    pr.render(sc, cam);
    requestAnimationFrame(tick);
  })(last);
  // ---- choices ----
  const opts = document.createElement("div");
  opts.style.cssText =
    "display:flex;flex-direction:column;gap:6px;min-width:0;flex:1;order:1;overflow-y:auto;" +
    "max-height:calc(92vh - 36px);padding-right:4px";
  box.appendChild(opts);
  const hex = (c) => "#" + c.toString(16).padStart(6, "0"),
    close = () => {
      alive = false;
      o.traverse((m) => m.material && m.material.dispose());
      pr.dispose();
      pr.forceContextLoss();
      ov.remove();
    };
  let dk = "robe"; // which piece the colour row is dyeing
  function draw() {
    opts.innerHTML =
      '<small style="color:#b9b3e6;letter-spacing:.2em">STEP 3 OF 3</small><h2 style="margin:0">Your look</h2>';
    const row = (label, items) => {
      const r = document.createElement("div"),
        lb = document.createElement("small"),
        bx = document.createElement("div");
      lb.style.color = "#b9b3e6";
      lb.textContent = label;
      bx.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-top:3px";
      items.forEach((b) => bx.appendChild(b));
      r.appendChild(lb);
      r.appendChild(bx);
      opts.appendChild(r);
    };
    // a round colour swatch (col null = "your gear's colour", drawn crossed)
    const sw = (col, name, on, fn) => {
      const b = document.createElement("button");
      b.title = name;
      b.setAttribute("aria-label", name);
      b.style.cssText =
        "width:24px;height:24px;border-radius:50%;cursor:pointer;padding:0;border:2px solid " +
        (on ? "#ffd27a" : "rgba(255,255,255,.25)") +
        ";box-shadow:" +
        (on ? "0 0 0 2px #ffd27a55" : "none") +
        ";background:" +
        (col == null ? "repeating-linear-gradient(45deg,#3a3456 0 5px,#5a5480 5px 10px)" : hex(col));
      b.onclick = () => {
        fn();
        paint();
        draw();
      };
      return b;
    };
    const tb = (t, on, fn) => {
      const b = mkBtn((on ? "✓ " : "") + t, false, () => {
        fn();
        paint();
        draw();
      });
      b.style.padding = "4px 10px";
      if (on) b.style.outline = "2px solid #ffd27a";
      return b;
    };
    const pick = (k, label, text) =>
      row(
        label + ": " + APPO[k][P.app[k]][0],
        APPO[k].map(([n, c], i) =>
          text ? tb(n, P.app[k] === i, () => (P.app[k] = i)) : sw(c, n, P.app[k] === i, () => (P.app[k] = i)),
        ),
      );
    pick("skin", "Skin");
    pick("hair", "Hair and beard");
    pick("beard", "Beard", 1);
    pick("eyes", "Eyes");
    pick("ht", "Height", 1);
    // starting colours: free now, Pip charges to change them later
    // v18: one row for all three, with tabs for which piece you're colouring (saves scrolling)
    const DK = { robe: "Robe", hat: "Hat", cape: "Cape" },
      k = dk;
    row(
      "Colours",
      Object.keys(DK).map((q) => tb(DK[q], q === dk, () => (dk = q))),
    );
    row(
      DK[k] + " colour" + (P.dye[k] == null ? ": from your gear" : ""),
      [
        sw(null, "Gear colour", P.dye[k] == null, () => {
          delete P.dye[k];
          delete P.dyeAuto;
        }),
      ].concat(
        DYES.map((h) =>
          sw(h, hex(h), P.dye[k] === h, () => {
            P.dye[k] = h;
            delete P.dyeAuto;
          }),
        ),
      ),
    );
    const ft = document.createElement("small");
    ft.style.color = "#b9b3e6";
    ft.textContent = "Colours are free now. Later, Pip the tailor can re-dye them for a fee.";
    opts.appendChild(ft);
    const acts = document.createElement("div");
    acts.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:4px";
    acts.appendChild(
      mkBtn("Surprise me", false, () => {
        const r = (n) => Math.floor(Math.random() * n);
        Object.keys(APPO).forEach((k) => (P.app[k] = r(APPO[k].length)));
        ["robe", "hat", "cape"].forEach((k) => (P.dye[k] = DYES[r(DYES.length)]));
        delete P.dyeAuto;
        paint();
        draw();
      }),
    );
    acts.appendChild(
      mkBtn("Back", false, () => {
        close();
        $("cls").style.display = "flex";
      }),
    );
    const go = mkBtn("Begin", false, () => {
      close();
      done();
    });
    go.style.background = "#3a6a3a";
    acts.appendChild(go);
    opts.appendChild(acts);
  }
  draw();
  document.body.appendChild(ov);
}
const svPos = () => {
  try {
    if (SLOT >= 0 && mode === "explore" && !paused) {
      const x = W.position.x,
        z = W.position.z,
        z0 = zoneAt(x, z);
      // v46: saved even off walkable ground (startGame finds the nearest walkable spot); not while a saved spot that
      // wasn't walkable yet is still waiting, so standing at the stand-in spot doesn't overwrite it
      const w = startGame.want;
      if (z0 !== "dun" && z0 !== "tower" && !(w && Math.hypot(x - w.at[0], z - w.at[1]) < 3)) {
        // v43: always saved in the OLD layout (a spot on a moved zone street is turned back into the street's old
        // frame), so the save loads right whether or not the streets are moved
        let sx = x,
          sz = z,
          sr = W.rotation.y;
        const si = typeof ZSF !== "undefined" && ZSF.on ? zsIdx(x, z) : -1;
        if (si >= 0) {
          [sx, sz] = zsL(si, x, z);
          sr -= ZSF[si].ry;
        } else if (typeof ZMV !== "undefined" && ZMV.on) [sx, sz] = zmL(x, z); // v45: a moved land, back to the old layout
        P.pos = [Math.round(sx * 10) / 10, Math.round(sz * 10) / 10, Math.round(sr * 100) / 100];
        sv();
      }
    }
  } catch (e) {}
};
setInterval(svPos, 4000);
// v46: a saved spot that wasn't walkable at Play: step onto it once it is (within 20 s, if you haven't walked off)
setInterval(() => {
  const w = startGame.want;
  if (!w) return;
  if (SLOT < 0 || mode !== "explore" || performance.now() - w.t > 20000) return void (startGame.want = null);
  if (Math.hypot(W.position.x - w.at[0], W.position.z - w.at[1]) > 3) return void (startGame.want = null);
  const x = w.q[0], // (already in today's layout: startGame moved it)
    z = w.q[1];
  if (!okp(x, z)) return;
  startGame.want = null;
  W.position.x = x;
  W.position.z = z;
  W.rotation.y = w.q[2];
  saved.copy(W.position);
  snap = true;
}, 250);
addEventListener("beforeunload", svPos);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) svPos();
});
function startGame(i) {
  SLOT = i;
  startGame.want = null;
  const d = ld(i);
  if (d) P = d;
  // v21: story quest 2 now counts battles won instead of summons; anyone partway through it starts counting from now
  if (!P.q2v21) {
    P.q2v21 = 1;
    if (P.qa && P.qa[2] != null && !(P.done && P.done[2])) P.qa[2] = P.wins || 0;
  }
  const hp0 = P.hp; // v21: HP carries over between sessions
  P.hpLoad = 1; // (until the new battle state exists, saving mustn't copy the last character's HP)
  ["chars", "cls", "over", "panel"].forEach((k) => ($(k).style.display = "none"));
  if (typeof titleOff === "function") titleOff();
  // spells are owned per character now: new characters get their class starters; older saves keep the class spells already in their deck
  if (!P.deck) P.deck = [];
  if (!P.seen) P.seen = {};
  if (!P.lib) {
    P.lib = {};
    P.deck.forEach((k) => {
      if (SPL[k] && clsOK(k)) P.lib[k] = 1;
    });
    Object.keys(SPL).forEach((k) => {
      if (SPL[k].q != null && clsOK(k) && splOK(k)) P.lib[k] = 1;
    });
  }
  if (!P.cls || !CL[P.cls]) P.cls = "pyre";
  syncRole(); // v12: role always follows the class (old saves move to their class's role)
  clsStart();
  unl(1);
  SLK.forEach((L) => {
    L.was = undefined;
    L.told = 0;
  });
  gatesInit();
  if (!P.id) P.id = "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); // stable id for party play
  if (!P.g0) {
    P.g0 = 1;
    if (!P.gear) P.gear = {};
    if (!P.inv) P.inv = [];
    const el = CLE[P.cls] || "fire";
    // v33: starter gear is always your own school's staff + neutral robe/boots, in the default looks (no style rolls)
    const plain = (it) => {
      delete it.lk;
      delete it.lk0;
      delete it.zl;
      return it;
    };
    const st = plain(genItem("staff", 1, 1, el, P.cls));
    st.n = "Apprentice's " + { fire: "Ember", ice: "Rime", storm: "Gale", heal: "Thorn", spirit: "Wisp" }[el] + " Rod";
    P.gear.staff = P.gear.staff || st;
    P.gear.robe =
      P.gear.robe || Object.assign(plain(genItem("robe", 1, 0, null, "n")), { n: "Patched Lamplighter Robe" });
    P.gear.boots = P.gear.boots || Object.assign(plain(genItem("boots", 1, 0, null, "n")), { n: "Worn Boots" });
  }
  if (mode === "battle") leave();
  g = newG();
  if (typeof hp0 === "number" && hp0 > 0) g.hp = Math.min(mhp(), hp0);
  delete P.hpLoad;
  mode = "explore";
  cur = null;
  setSpd(P.spd || 1);
  foes.forEach((f) => {
    if (f.edHid) return; // v46: removed in the world editor (13): stays gone
    if (f.dead) {
      f.dead = 0;
      S.add(f.o);
    }
    f.o.visible = true;
    f.pi = 0;
    f.o.position.set(f.hx, 0, f.hz);
    f.cool = 0;
  });
  foes.forEach(rollElite);
  refreshFinds();
  {
    let sp = [OX, OZ + 9, Math.PI];
    let q = P.pos;
    // v43: saves keep the old layout; with the zone streets moved, a street spot is turned into its street's frame
    // (one that no longer stands on ground, e.g. behind a removed return arch, falls back to that street's start)
    if (Array.isArray(q) && q.length === 3 && typeof ZSF !== "undefined" && ZSF.on) {
      const si = zsIdxO(q[0], q[1]);
      if (si >= 0 && si < ZSF.length) {
        const p = zsW(si, q[0], q[1]);
        q = [p[0], p[1], q[2] + ZSF[si].ry];
        if (!okp(q[0], q[1])) {
          const s0 = zsW(si, ZRD[si].X, -9);
          q = [s0[0], s0[1], Math.PI + ZSF[si].ry];
        }
      }
    }
    // v45: with the lands re-laid out (03 ZMV), an old-layout spot in Frostfen / Cinderwaste is shifted to its new place
    if (Array.isArray(q) && q.length === 3 && typeof ZMV !== "undefined" && ZMV.on) {
      const p = zmW(q[0], q[1]);
      q = [p[0], p[1], q[2]];
    }
    if (Array.isArray(q) && q.length === 3 && q.every((v) => typeof v === "number" && isFinite(v))) {
      const z0 = zoneAt(q[0], q[1]);
      if (z0 !== "dun" && z0 !== "tower") {
        if (okp(q[0], q[1])) sp = q;
        else {
          // v46: the saved spot isn't walkable right now (world edits that go on a few seconds after load: reshaped or
          // widened roads, moved pieces): stand on the nearest walkable ground, then step onto the saved spot itself
          // as soon as it becomes walkable (startGame's spawn retry below)
          let best = null;
          for (let r = 1.5; r <= 40 && !best; r += 1.5)
            for (let a = 0; a < 24; a++) {
              const x = q[0] + Math.cos((a / 24) * 6.283) * r,
                z = q[1] + Math.sin((a / 24) * 6.283) * r;
              if (okp(x, z)) {
                best = [x, z, q[2]];
                break;
              }
            }
          if (best) sp = best;
          startGame.want = { q, t: performance.now(), at: [sp[0], sp[1]] };
          console.warn("spawn: saved spot not walkable yet", q, "-> standing at", sp);
        }
      }
    }
    W.position.set(sp[0], 0, sp[1]);
    W.rotation.y = sp[2];
    saved.copy(W.position);
    tint();
    applyCos();
    theme(themeKey(sp[0], sp[1]));
  }
  document.body.classList.add("exp");
  snap = true;
  ptcd = 0;
  zt = "";
  lastZl = "";
  trkH = "";
  lastPs = -1;
  paused = false;
  grace = performance.now() + 2500;
  if (!Object.keys(P.qa).length) toast("Oona in the square has an important task for you (gold !)", "#ffd34d");
  applyCos();
  setLines();
  occClearCam();
  ui();
  qchk();
  sv();
}
devSv();
paused = true;
showChars();
ui();
// v47 polish: the old #boot cover is gone; index.html now starts with 70-loadgate's #ldg cover from the first frame
// open index.html#dev for a small testing hook (teleport, levels); harmless otherwise
if (location.hash === "#dev")
  setInterval(() => {
    const c = document.body.dataset.dw;
    if (!c) return;
    delete document.body.dataset.dw;
    let r;
    try {
      r = eval(c);
    } catch (e) {
      r = "ERR " + e;
    }
    try {
      document.body.dataset.dwr = JSON.stringify(r === undefined ? null : r);
    } catch (e) {
      document.body.dataset.dwr = String(r);
    }
  }, 50);

// v34: Book > Options > Game: Save & Exit (saves, then reloads to the title screen)
(() => {
  const panel0 = panel;
  panel = function (k, id) {
    panel0(k, id);
    try {
      if (k !== "book" || BOOKL.last !== "optgame") return;
      const L = $("pl");
      if (!L) return;
      const r = document.createElement("div"),
        b = document.createElement("button");
      r.className = "row";
      r.innerHTML =
        "<div><b>Save &amp; Exit</b><small>Save your progress and go back to the title screen</small></div>";
      b.className = "pb";
      b.textContent = "Save & Exit";
      b.onclick = () => {
        if (mode === "battle" || mode === "guest") return toast("Finish the battle first.", "#ffb04a");
        try {
          sv();
        } catch (e) {
          console.error(e);
        }
        location.reload();
      };
      r.appendChild(b);
      L.insertBefore(r, L.firstChild);
    } catch (e) {
      console.error(e);
    }
  };
})();
