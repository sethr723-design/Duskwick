// DUSKWICK - 32-bosses.js (v25b)
// 1) Zone streets (the ones reached through loading arches, x >= ZSX0): the battlefield used to be snapped to the zone's
//    open-ground grid, i.e. far away near the village. It now stays on the street: centred on the road (not the
//    sidewalks) at a battle spot BSP apart, lined up along the street. Wraps `frame`.
// 2) Boss minions stand beside their boss in the world (dungeon halls, the Gloomspire top, street bosses) and fight with
//    it (26-battlerules.js gathers `foes` with f.mb === boss, using f.msp as their battle spec). Walking into a minion
//    starts the boss fight. Appended to `foes` after 27-newfoes.js in a fixed order (multiplayer matches by index).
// 3) Boss dialogue: a speech box with typed text and a little voice (WebAudio blips, each boss its own pitch) when a
//    boss fight opens, when the boss drops below half HP, and when it falls. Polls game state; no hooks.
// No top-level names.
(() => {
  // ---------- 1) battlefields on zone streets ----------
  const fr0 = frame;
  frame = function (f) {
    const q = f.o.position,
      p = W.position,
      zi = zsIdx(q.x, q.z);
    if (zi < 0) return fr0(f);
    // v43: worked out in the street's old coords, turned into its moved frame when the streets are moved
    const mv = ZSF.on,
      P0 = mv ? zsL(zi, p.x, p.z) : [p.x, p.z],
      Q0 = mv ? zsL(zi, q.x, q.z) : [q.x, q.z];
    const t = ZRD[zi],
      cx = (P0[0] + Q0[0]) / 2,
      cz = (P0[1] + Q0[1]) / 2,
      n = rdNear(t, cx - OX, cz - OZ),
      s = Math.max(14, Math.min(t.L - 14, Math.round((n ? n.s : -cz) / BSP) * BSP)),
      [x, z, hx, hz] = rdAt(t, s),
      d = (Q0[0] - P0[0]) * hx + (Q0[1] - P0[1]) * hz < 0 ? -1 : 1,
      ax = hx * d,
      az = hz * d,
      fr = { x: OX + x, z: OZ + z, r: Math.atan2(-az, ax) };
    return mv ? zsFr(zi, fr) : fr;
  };
  // ---------- 2) minions beside their bosses ----------
  const KN = { kind: "gloom", t: 5, mt: 3, hc: 0x3a3a7a, min: "knight" },
    EM = { kind: "gloom", t: 4, mt: 2, hc: 0xff6a2a, min: "ember" },
    OFF = [
      [-3.4, 1.2],
      [3.4, 1.2],
      [0, 3.6],
    ];
  const MINS = [];
  foes.slice().forEach((b) => {
    if (!b.boss) return;
    const list = b.dboss ? [b.bsp[1], b.bsp[2]].filter(Boolean) : b.t === 5 ? [KN, KN, KN] : [EM, EM];
    list.forEach((sp0, k) => {
      const sp = Object.assign({}, sp0),
        x = b.hx + OFF[k][0],
        z = b.hz + OFF[k][1],
        o = mkFoe(sp.kind, sp.mt || sp.t, sp.big, sp.hc);
      o.scale.multiplyScalar(0.85);
      o.position.set(x, 0, z);
      S.add(o);
      // world t stays below 4 so foeSetup doesn't take a gloom minion for a boss; the battle uses f.msp
      const f = {
        o,
        t: Math.min(3, sp.t),
        kind: sp.kind,
        big: sp.big,
        hc: sp.hc,
        hx: x,
        hz: z,
        w: null,
        wt: 0,
        dead: 0,
        rt: Infinity,
      };
      f.tw = b.tw || 0; // Gloomspire top: towerReset brings them back with the Warden
      f.mb = b;
      f.msp = sp;
      f.min = sp.min;
      if (sp.nm) f.nm = sp.nm;
      foes.push(f);
      foeSetup(f);
      f.boss = false;
      f.elite = null; // minions never roll elite traits
      MINS.push(f);
    });
  });
  // walking into a minion starts its boss's fight
  const fight0 = fight;
  fight = function (f0) {
    return fight0(f0 && f0.mb && !f0.mb.dead ? f0.mb : f0);
  };
  // dungeon / street minions come back when their boss is back (not on their own street timer)
  setInterval(() => {
    if (typeof mode === "undefined" || mode !== "explore") return;
    const now = performance.now();
    MINS.forEach((m) => {
      if (!m.dead || m.tw) return;
      m.rt = Infinity;
      if (m.mb.dead || Math.hypot(W.position.x - m.hx, W.position.z - m.hz) < 25) return;
      m.dead = 0;
      m.pi = 0;
      m.o.position.set(m.hx, 0, m.hz);
      m.o.visible = true;
      if (m.s0) m.o.scale.setScalar(m.s0);
      S.add(m.o);
      m.cool = now + 2500;
      m.fade = 0;
    });
  }, 1000);
  // ---------- 3) boss dialogue + voice ----------
  const LINES = {
    warden: {
      v: [95, "square"],
      a: ["So. A lamplighter climbs my spire, carrying a little flame. How sweet.", "Guards! Snuff out this candle."],
      h: ["You burn brighter than I thought... No matter. Every flame gutters in the end!"],
      d: ["The dusk... was never mine to keep... Take your sunrise, lamplighter..."],
    },
    fiend: {
      v: [170, "sawtooth"],
      a: ["Hah! Fresh kindling, walking right up to me!", "Ooh, a lantern! I LOVE lanterns. They pop."],
      h: ["Hot enough for you yet?! Embers, burn them!"],
      d: ["Snuffed... by a lamplighter... how embarrassing..."],
    },
    "Mossbound Tyrant": {
      v: [80, "triangle"],
      a: ["Grrrooowth... You trample my moss. Now my moss tramples YOU."],
      h: ["Roots... deeper... I will NOT be pruned!"],
      d: ["Back... to the soil... it was nice... and damp..."],
    },
    "Rimefang Matriarch": {
      v: [310, "sine"],
      a: ["Awoooo! You smell of smoke and lamp-oil. My pups are hungry."],
      h: ["The cold does not forgive, little light. Neither do I!"],
      d: ["The pack... will remember you... aooo..."],
    },
    "Kiln Mother": {
      v: [140, "sawtooth"],
      a: ["Who stokes MY kiln? Come closer, little spark. Closer..."],
      h: ["Grrr! My little imps, bake them!"],
      d: ["The fire... goes out... so cold..."],
    },
  };
  const key = (f) => (LINES[f.nm] ? f.nm : f.t === 5 && !f.dboss ? "warden" : f.nm ? null : "fiend");
  let AC = null;
  function blip(v) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      const t0 = AC.currentTime,
        o = AC.createOscillator(),
        gn = AC.createGain();
      o.type = v[1];
      o.frequency.setValueAtTime(v[0] * (0.85 + Math.random() * 0.4), t0);
      o.frequency.exponentialRampToValueAtTime(v[0] * (0.7 + Math.random() * 0.2), t0 + 0.07);
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(0.07, t0 + 0.008);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      o.connect(gn).connect(AC.destination);
      o.start(t0);
      o.stop(t0 + 0.09);
    } catch (e) {}
  }
  let box = null,
    tmr = 0,
    tok = 0;
  function say(name, txt, v) {
    if (!box) {
      box = document.createElement("div");
      box.style.cssText =
        "position:fixed;left:50%;top:12%;transform:translateX(-50%);max-width:min(560px,92vw);z-index:60;" +
        "background:linear-gradient(180deg,rgba(36,18,44,.94),rgba(20,10,28,.94));border:2px solid #c9a24a;" +
        "border-radius:14px;padding:10px 16px 12px;color:#f3e6ff;font:600 16px/1.4 system-ui,sans-serif;" +
        "box-shadow:0 6px 28px rgba(0,0,0,.6),0 0 18px rgba(201,162,74,.35);cursor:pointer;transition:opacity .3s;" +
        "pointer-events:auto";
      box.onclick = () => {
        box.style.opacity = 0;
        document.body.classList.remove("bsay");
      };
      document.body.appendChild(box);
    }
    const my = ++tok;
    clearTimeout(tmr);
    document.body.classList.add("bsay"); // v30: the Primer card (16) steps aside while a boss speaks
    box.innerHTML =
      '<div style="color:#ffd27a;font-weight:800;letter-spacing:.04em;margin-bottom:2px">' +
      name +
      '</div><div class="bdt"></div>';
    box.style.opacity = 1;
    box.style.display = "block";
    const el = box.querySelector(".bdt");
    let i = 0;
    (function type() {
      if (my !== tok) return;
      i++;
      el.textContent = txt.slice(0, i);
      const ch = txt[i - 1];
      if (i % 2 && /[a-z0-9]/i.test(ch || "")) blip(v);
      if (i < txt.length) setTimeout(type, /[.,!?]/.test(ch) ? 140 : 32);
      else
        tmr = setTimeout(() => {
          if (my !== tok) return;
          box.style.opacity = 0;
          document.body.classList.remove("bsay");
        }, 2800);
    })();
  }
  const pick = (a) => a[(Math.random() * a.length) | 0];
  let bid = null,
    said = {};
  setInterval(() => {
    if (typeof mode === "undefined" || mode !== "battle" || !g || !g.foes) {
      bid = null; // the box fades on its own timer, so a defeat line still finishes after the win
      return;
    }
    const b = g.foes.find((f) => f.boss);
    if (!b) return;
    const k = key(b),
      L = k && LINES[k];
    if (!L) return;
    const nm = b.nm || String(b.label || "").replace(/ \(boss\)$/, "");
    if (bid !== g.id) {
      bid = g.id;
      said = { t: performance.now() };
    }
    if (!said.a && performance.now() - said.t > 900) {
      said.a = 1;
      say(nm, pick(L.a), L.v);
    } else if (said.a && !said.h && b.hp > 0 && b.hp < b.max * 0.5) {
      said.h = 1;
      say(nm, pick(L.h), L.v);
    } else if (said.a && !said.d && b.hp <= 0) {
      said.d = 1;
      say(nm, pick(L.d), L.v);
    }
  }, 150);
})();
