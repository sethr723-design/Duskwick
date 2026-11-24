// v30 Lamp Memories (loads LAST, after 39-together): only top-level name MEMO.
// Each of the eight snuffed lamps (LAMPS, 03-world.js; relit in 11-explore.js) remembers the townsperson who once kept
// it. Standing at a burning lamp whose memory you haven't heard plays it: a pale ghost of the keeper rises beside the
// post, says what they let go dark, and drifts off toward the Gloomspire as motes. After each one a small voice in the
// dark adds a line, and together the lines tell who has been snuffing the lamps. With all eight heard, a little
// gloomling waits by the First Lamp stone in the square; light its wick and it follows you (Hush, cosmetic, solo).
// Saves: P.memo = { 0..7: 1 heard, hush: 1 } (made on first use, no DEFP). Book > Lore gets a "Lamp Memories" section.
// No lights, no NET messages, nothing added to the scene until it is needed (ghosts are removed when done).
const MEMO = (() => {
  const MEM = [
    {
      n: "Bram, the baker",
      t: "Forty winters I lit this one before the ovens. The night Hesta died I let it gutter. One dark corner, I thought. Where's the harm.",
      w: "It was so warm here, while it still remembered him.",
      h: "on Gloomway, just outside the square",
    },
    {
      n: "Tamsin, nine years old",
      t: "Mam said if I kept it burning, Da's boat would find the way home. I kept it two whole years. Then I stopped believing, and stopped coming.",
      w: "Every lamp remembers whoever loved it. Did you know?",
      h: "further up Gloomway",
    },
    {
      n: "Wendel, a carter",
      t: "My brother and I had words under this lamp. Small words. We never spoke again. I take the long way round now, so I needn't pass it.",
      w: "In the dark I can hear them. All the remembering.",
      h: "along the Hollow Road",
    },
    {
      n: "Sister Maud",
      t: "Every dusk I lit it and asked for the sun back. One dusk I simply didn't. Nobody noticed. That was the worst of it.",
      w: "Nobody notices me either.",
      h: "along the Ashen Trail",
    },
    {
      n: "Pell, an apprentice lamplighter",
      t: "I was frightened of the dark, so I became a lamplighter. I never told anyone I was frightened still. Not even Oona.",
      w: "I think I was a fear once. Somebody's. I've forgotten whose.",
      h: "at the far end of the Hollow Road",
    },
    {
      n: "Ysolde, keeper of the springs",
      t: "The night the springs froze I hung this lamp for the wolves, so they could find home. I waited until my hands went numb. They didn't come.",
      w: "So I put the lamps out, one by one, to listen.",
      h: "in Frostfen",
    },
    {
      n: "Cole, a charcoal-burner",
      t: "We fed the Ember everything. Father's tools. Mother's chair. Near enough my own name. I can't recall it now. I'm sure it was a good one.",
      w: "I'm sorry. I only borrowed them. You can have them back.",
      h: "in the Cinderwaste",
    },
    {
      n: "Ilka, who had a wolf",
      t: "Ash was my wolf. When the cold came he looked at me like a stranger. I lit this so he'd know my face again, if he ever looked back.",
      w: "Come and find me where the first lamp burns. Please.",
      h: "on the edge of Frostfen",
    },
  ];
  const FIN = [
    [
      "",
      "Beside the First Lamp sits a gloomling no bigger than a cat. It doesn't hiss. It holds out its cupped claws: inside lies a cold, burnt-out wick.",
    ],
    [
      "The small shadow",
      "I was a fear, once. The fear of being forgotten. Whoever carried me let me go, and I didn't know where to go.",
    ],
    [
      "The small shadow",
      "The lamps remember. In the dark you can hear it: every keeper, every name. I put them out so I could listen. I wanted to be remembered too.",
    ],
    ["The small shadow", "You listened instead. You heard every one of them. ...Will you remember me?"],
  ];
  const HX = OX - 13,
    HZ = OZ - 4; // where the small shadow waits: beside the First Lamp stone (LS[0]), clear of its read radius
  const ms = () => (P.memo = P.memo || {});
  const heard = () => MEM.filter((m, i) => ms()[i]).length;
  const cls = (c) => document.body.classList.contains(c);
  const on = () => typeof SLOT !== "undefined" && SLOT >= 0 && !!P && typeof mode !== "undefined";
  const live = () => on() && mode === "explore" && !paused && !cls("cut") && !cls("ttl");
  const busyNear = () => !!(window.__np || window.__ln || window.__ch);
  const typing = (e) => e.target && /^(input|textarea|select)$/i.test(e.target.tagName || "");
  const nowMs = () => performance.now();
  const dW = (x, z) => Math.hypot(W.position.x - x, W.position.z - z);

  // ---------- page bits: caption card, soft vignette, E hint ----------
  const css = document.createElement("style");
  css.textContent =
    "#memo{position:fixed;left:50%;bottom:13%;transform:translateX(-50%);width:min(560px,calc(100% - 32px));z-index:60;" +
    "text-align:center;pointer-events:none;opacity:0;transition:opacity .9s;padding:18px 26px;border-radius:18px;" +
    "background:radial-gradient(ellipse farthest-side at 50% 50%,rgba(16,9,30,.86) 0%,rgba(16,9,30,.74) 62%,rgba(16,9,30,0) 100%)}" +
    "body.memo #tut{opacity:.06!important;pointer-events:none!important;transition:opacity .6s}" +
    "#memo.on{opacity:1;pointer-events:auto;cursor:pointer}" +
    "#memo .mn{font:700 13px/1.2 Fraunces,Georgia,serif;letter-spacing:.14em;text-transform:uppercase;color:#ffe2a0;" +
    "text-shadow:0 0 12px #ffb84a88;margin-bottom:6px;min-height:1px}" +
    "#memo .mt{font:italic 19px/1.5 Fraunces,Georgia,serif;color:#fff6e4;text-shadow:0 1px 3px #000,0 0 18px #2a1640}" +
    "#memo .mw{margin-top:12px;font:italic 15px/1.45 Fraunces,Georgia,serif;color:#c9a8ff;opacity:0;transition:opacity 1.6s;" +
    "text-shadow:0 1px 3px #000,0 0 14px #6a3ac0}" +
    "#memo .mw.on{opacity:1}" +
    "#memo .mb{margin-top:14px;display:none}" +
    "#memo .mb button{font:700 14px Fraunces,Georgia,serif;padding:8px 18px;border-radius:10px;border:1px solid #ffd27a;" +
    "background:linear-gradient(180deg,#5a3a1a,#2e1c0c);color:#ffe2a0;cursor:pointer;box-shadow:0 0 16px #ffb84a55}" +
    "#memv{position:fixed;inset:0;z-index:59;pointer-events:none;opacity:0;transition:opacity 1.4s;" +
    "background:radial-gradient(ellipse at 50% 55%,transparent 45%,rgba(26,12,48,.55) 100%)}" +
    "#memv.on{opacity:1}" +
    "#memh{position:fixed;left:50%;bottom:22%;transform:translateX(-50%);padding:8px 16px;border-radius:10px;" +
    "background:rgba(20,12,40,.82);color:#d9c2ff;font:600 16px system-ui,sans-serif;border:1px solid #b48aff88;" +
    "z-index:50;display:none;cursor:pointer}";
  document.head.appendChild(css);
  const cap = document.createElement("div");
  cap.id = "memo";
  cap.innerHTML =
    '<div class="mn"></div><div class="mt"></div><div class="mw"></div><div class="mb"><button></button></div>';
  const vig = document.createElement("div");
  vig.id = "memv";
  const hint = document.createElement("div");
  hint.id = "memh";
  document.body.append(vig, cap, hint);
  const q = (s) => cap.querySelector(s);
  let capT = 0, // when the current caption auto-closes (ms)
    capCb = null; // run when the caption is clicked through / closes
  function say(nm, txt, wh, dur, cb, btn) {
    q(".mn").textContent = nm || "";
    q(".mt").textContent = txt;
    q(".mw").textContent = wh || "";
    q(".mw").classList.remove("on");
    q(".mb").style.display = btn ? "block" : "none";
    if (btn) {
      q(".mb button").textContent = btn;
      q(".mb button").onclick = (e) => {
        e.stopPropagation();
        capClose();
      };
    }
    cap.classList.add("on");
    vig.classList.add("on");
    document.body.classList.add("memo");
    capT = btn ? Infinity : nowMs() + dur;
    capCb = cb || null;
    if (wh) setTimeout(() => q(".mw").classList.add("on"), 3200);
  }
  function capClose() {
    capT = 0;
    cap.classList.remove("on");
    vig.classList.remove("on");
    document.body.classList.remove("memo");
    const cb = capCb;
    capCb = null;
    if (cb) cb();
  }
  cap.onclick = () => {
    if (q(".mb").style.display !== "block") capClose();
  };

  // ---------- a soft bell (own tiny AudioContext; quiet, follows the music mute/volume) ----------
  let AC = null;
  function bell(notes, gap, dur) {
    try {
      const st = typeof MUS !== "undefined" && MUS.st;
      if (st && st.m) return;
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      const v = 0.09 * (st && st.v != null ? st.v : 0.6);
      notes.forEach((f, i) => {
        const o = AC.createOscillator(),
          o2 = AC.createOscillator(),
          g = AC.createGain(),
          t = AC.currentTime + i * gap;
        o.type = "sine";
        o2.type = "triangle";
        o.frequency.value = f;
        o2.frequency.value = f * 2.01;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(v, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const g2 = AC.createGain();
        g2.gain.value = 0.25;
        o.connect(g);
        o2.connect(g2);
        g2.connect(g);
        g.connect(AC.destination);
        o.start(t);
        o2.start(t);
        o.stop(t + dur + 0.05);
        o2.stop(t + dur + 0.05);
      });
    } catch (e) {}
  }

  // ---------- the keeper's ghost ----------
  const GMat = (c, o) =>
    new T.MeshBasicMaterial({
      color: c,
      transparent: true,
      opacity: o,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
  function ghost(L) {
    const o = new T.Group(),
      mats = [GMat(0xffe6b0, 0), GMat(0xfff4dc, 0), GMat(0xffd894, 0)];
    const robe = new T.Mesh(Cn(0.55, 1.7, 14), mats[0]);
    robe.position.y = 0.85;
    const head = new T.Mesh(Sp(0.27, 14), mats[1]);
    head.position.y = 1.95;
    const hood = new T.Mesh(Cn(0.34, 0.5, 14), mats[2]);
    hood.position.y = 2.25;
    const glow = new T.Sprite(AM(GLT));
    glow.material.color.setHex(0xffd894);
    glow.material.opacity = 0;
    glow.scale.setScalar(3.4);
    glow.position.y = 1.4;
    o.add(robe, head, hood, glow);
    // stand beside the post, on the side facing you
    const a = Math.atan2(W.position.x - L.x, W.position.z - L.z);
    o.position.set(L.x + Math.cos(a) * 1.3 + Math.sin(a) * 0.5, 0, L.z - Math.sin(a) * 1.3 + Math.cos(a) * 0.5);
    o.rotation.y = a;
    o.scale.setScalar(1.25);
    S.add(o);
    return { o, mats, glow, t0: nowMs(), L, spawn: 0 };
  }
  let GH = null;
  const GDUR = 10500;
  function ghostTick() {
    if (!GH) return;
    const t = nowMs() - GH.t0,
      fIn = Math.min(1, t / 1400),
      fOut = Math.max(0, Math.min(1, (GDUR - t) / 2200)),
      k = Math.min(fIn, fOut);
    GH.mats[0].opacity = 0.55 * k;
    GH.mats[1].opacity = 0.75 * k;
    GH.mats[2].opacity = 0.6 * k;
    GH.glow.material.opacity = 0.9 * k * (0.85 + 0.15 * Math.sin(t / 260));
    GH.o.position.y = 0.15 + 0.12 * Math.sin(t / 700) + (1 - fOut) * 1.2;
    // while it stands there a few motes rise off it; dissolving, many peel off and drift toward the Gloomspire
    const dis = t > GDUR - 2600;
    if (t > 600 && t - GH.spawn > (dis ? 90 : 340)) {
      GH.spawn = t;
      const p = GH.o.position.clone();
      p.y += 0.6 + Math.random() * 1.6;
      const dx = OX - p.x,
        dz = OZ + TCZ - p.z,
        dl = Math.hypot(dx, dz) || 1;
      const sp = dis ? 1.6 : 0.25;
      mote(p, {
        c: 0xffe2a0,
        v: [(dx / dl) * sp, (dis ? 1.2 : 0.6) + Math.random(), (dz / dl) * sp],
        l: 2.4,
        s: 0.35,
        gr: -0.2,
      });
    }
    if (t > GDUR) {
      S.remove(GH.o);
      GH.mats.forEach((m) => m.dispose());
      GH.glow.material.dispose();
      GH = null;
    }
  }
  function memory(i) {
    const m = MEM[i],
      L = LAMPS.find((l) => l.i === i);
    ms()[i] = 1;
    sv();
    if (L) GH = ghost(L);
    bell([523.25, 659.25, 783.99], 0.22, 2.4);
    const n = heard();
    say(m.n, "“" + m.t + "”", "a small voice, somewhere in the dark: “" + m.w + "”", 11000, () => {
      if (n === MEM.length && !ms().hush)
        toast("Every lamp remembers. Something small is waiting by the First Lamp in the square.", "#c9a8ff");
      else if (n === 4) toast("You feel watched, kindly. Lamp memories: " + n + " / " + MEM.length, "#c9a8ff");
      else toast("Lamp memory heard: " + n + " / " + MEM.length + "  (Book > Lore)", "#c9a8ff");
    });
  }

  // ---------- the small shadow (Hush) ----------
  let H = null;
  function hushMake() {
    const o = new T.Group(),
      body = new T.Mesh(Sp(0.42, 16), M(0x2b2140));
    body.scale.set(1, 0.9, 0.95);
    body.position.y = 0.42;
    const eyeM = new T.MeshBasicMaterial({ color: 0xd8ccff }),
      e1 = new T.Mesh(Sp(0.07, 8), eyeM),
      e2 = e1.clone();
    e1.position.set(-0.14, 0.52, 0.35);
    e2.position.set(0.14, 0.52, 0.35);
    // two little ear-tufts and cupped claws holding a wick
    const tuftM = M(0x241a36),
      t1 = new T.Mesh(Cn(0.1, 0.3, 8), tuftM),
      t2 = t1.clone();
    t1.position.set(-0.2, 0.86, 0);
    t1.rotation.z = 0.35;
    t2.position.set(0.2, 0.86, 0);
    t2.rotation.z = -0.35;
    const paws = new T.Mesh(Sp(0.13, 10), tuftM);
    paws.scale.set(1.6, 0.6, 1);
    paws.position.set(0, 0.3, 0.38);
    const wick = new T.Mesh(Cy(0.02, 0.025, 0.16, 6), new T.MeshBasicMaterial({ color: 0x1a1420 }));
    wick.position.set(0, 0.42, 0.42);
    const flame = new T.Sprite(AM(GLT));
    flame.material.color.setHex(0xffc864);
    flame.scale.setScalar(0.7);
    flame.position.set(0, 0.56, 0.42);
    flame.visible = false;
    const eyeGlow = new T.Sprite(AM(GLT));
    eyeGlow.material.color.setHex(0x9a7aff);
    eyeGlow.material.opacity = 0.5;
    eyeGlow.scale.setScalar(1.1);
    eyeGlow.position.set(0, 0.55, 0.3);
    o.add(body, e1, e2, t1, t2, paws, wick, flame, eyeGlow);
    o.position.set(HX, 0, HZ);
    o.rotation.y = Math.atan2(OX - HX, OZ - HZ);
    o.visible = false;
    S.add(o);
    const h = { o, body, flame, eyeGlow, parts: [body, t1, t2, paws, wick] };
    if (ms().hush) litLook(h);
    return h;
  }
  function litLook(h) {
    h.flame.visible = true;
    h.body.material = M(0x5a3f86);
    h.eyeGlow.material.color.setHex(0xffd894);
  }
  // before the finale: from 4 memories on, a pair of eyes watches from beside the First Lamp, gone when you come close
  function hushTick(s, dt) {
    const n = heard(),
      hu = ms().hush;
    if (!hu && n < 4) {
      if (H) H.o.visible = false;
      return;
    }
    if (!H) H = hushMake();
    const o = H.o,
      inHub = typeof zoneAt === "function" && zoneAt(W.position.x, W.position.z) === "hub";
    if (hu) {
      // follows you about (explore only), bobbing a little behind your left shoulder
      const ok = on() && mode === "explore" && !cls("ttl") && W.visible !== false;
      o.visible = ok;
      if (!ok) return;
      const ry = W.rotation.y,
        tx = W.position.x + Math.sin(ry + 2.4) * 1.6,
        tz = W.position.z + Math.cos(ry + 2.4) * 1.6,
        d = Math.hypot(tx - o.position.x, tz - o.position.z);
      if (d > 25) o.position.set(tx, 0, tz);
      else {
        const f = 1 - Math.exp(-dt * 3.2);
        o.position.x += (tx - o.position.x) * f;
        o.position.z += (tz - o.position.z) * f;
      }
      o.position.y = 1.15 + 0.18 * Math.sin(s * 2.1);
      const want = Math.atan2(W.position.x - o.position.x, W.position.z - o.position.z);
      o.rotation.y += Math.atan2(Math.sin(want - o.rotation.y), Math.cos(want - o.rotation.y)) * Math.min(1, dt * 4);
      H.flame.scale.setScalar(0.62 + 0.1 * Math.sin(s * 11) + 0.05 * Math.sin(s * 23));
      return;
    }
    // waiting; it turns to look at you once you come near
    o.position.y = 0.04 * Math.sin(s * 1.7);
    if (dW(HX, HZ) < 9) {
      const want = Math.atan2(W.position.x - HX, W.position.z - HZ);
      o.rotation.y += Math.atan2(Math.sin(want - o.rotation.y), Math.cos(want - o.rotation.y)) * Math.min(1, dt * 3);
    }
    if (n >= MEM.length) {
      o.visible = inHub;
      H.parts.forEach((p) => (p.visible = true));
      H.eyeGlow.material.opacity = 0.45 + 0.15 * Math.sin(s * 2);
    } else {
      // only the eyes, and only from afar
      const far = dW(HX, HZ) > 13;
      o.visible = inHub && far && Math.sin(s * 0.6) > -0.3;
      H.parts.forEach((p) => (p.visible = false));
      H.eyeGlow.material.opacity = 0.35;
    }
  }
  const canFinale = () => H && !ms().hush && heard() >= MEM.length && !FX && dW(HX, HZ) < 3.2;
  let FX = 0; // finale running
  function finale() {
    FX = 1;
    let k = 0;
    const next = () => {
      if (k < FIN.length) {
        const [nm, tx] = FIN[k],
          last = k === FIN.length - 1;
        k++;
        say(nm, tx, "", 9000, next, last ? "Light its wick" : "");
        if (k === 1) bell([392, 466.16, 587.33], 0.3, 3);
      } else kindle();
    };
    next();
  }
  function kindle() {
    ms().hush = 1;
    const p = H.o.position.clone();
    litLook(H);
    puff(new T.Vector3(p.x, 0.9, p.z + 0.2), "fire", 14, 1.6, 0.9, 0.7);
    ring(p.x, 0xffd27a, 3, 700, p.z);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * 6.28;
      mote(new T.Vector3(p.x, 0.6, p.z), {
        c: 0xffe2a0,
        v: [Math.cos(a) * 2.2, 2 + Math.random() * 2, Math.sin(a) * 2.2],
        l: 2.2,
        s: 0.4,
      });
    }
    bell([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.16, 3.2);
    sv();
    // the reward waits until the last line has had its moment (a level-up would cover it)
    say(
      "",
      "The wick catches. The little shadow doesn't shrink away, the way gloom does in lamplight. It glows.",
      "The gloom grows from forgotten things. You remembered one.",
      9000,
      () => {
        FX = 0;
        const xp = 4 * (15 + 6 * (P.lvl || 1)),
          gd = 60;
        P.xp += xp;
        P.gold += gd;
        toast("Hush will walk with you now.  +" + xp + " XP  +" + gd + " ✦", "#ffd27a");
        try {
          lvup();
        } catch (e) {}
        try {
          ui();
        } catch (e) {}
        sv();
      },
    );
  }

  // ---------- Book > Lore: Lamp Memories ----------
  const panel0 = panel;
  panel = function (k, id) {
    panel0.apply(this, arguments);
    try {
      if (k !== "book" || BOOKL.last !== "lore") return;
      const L = $("pl");
      if (!L) return;
      const n = heard();
      L.insertAdjacentHTML("beforeend", '<div class="sec">Lamp Memories (' + n + " / " + MEM.length + ")</div>");
      MEM.forEach((m, i) => {
        const r = document.createElement("div");
        r.className = "row";
        r.innerHTML = ms()[i]
          ? "<div><b>" + m.n + "</b><small>“" + m.t + '”<br><i style="color:#c9a8ff">“' + m.w + "”</i></small></div>"
          : "<div><b>???</b><small>A snuffed lamp still keeps its memory " +
            m.h +
            ". Relight it and stand close.</small></div>";
        L.appendChild(r);
      });
      if (ms().hush) {
        const r = document.createElement("div");
        r.className = "row";
        r.innerHTML =
          "<div><b>Hush</b><small>Once somebody's fear of being forgotten. Now it carries a small flame and follows you. You remembered it.</small></div>";
        L.appendChild(r);
      } else if (n >= MEM.length) {
        L.insertAdjacentHTML(
          "beforeend",
          '<small style="display:block;margin-top:6px;color:#c9a8ff">Something small waits by the First Lamp in Lamplight Square.</small>',
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ---------- townsfolk speech bubbles (03 bubble()) close while a memory is being told ----------
  const bubble0 = bubble;
  bubble = function (e, d, lines, y, range, s) {
    return bubble0.call(this, e, cls("memo") ? range + 2 : d, lines, y, range, s);
  };

  // ---------- keys, frame ----------
  addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || !e.key || typing(e)) return;
    if (e.key.toLowerCase() !== "e" || !live() || busyNear() || !canFinale()) return;
    if (typeof keys === "object") keys.e = 0;
    finale();
  });
  hint.onclick = () => {
    if (live() && canFinale()) finale();
  };
  let last = nowMs(),
    poll = 0,
    hintOn = false;
  function frame() {
    requestAnimationFrame(frame);
    if (!on() || typeof W === "undefined") return;
    const t = nowMs(),
      dt = Math.min(0.1, (t - last) / 1000),
      s = t / 1000;
    last = t;
    ghostTick();
    hushTick(s, dt);
    if (capT && t > capT) capClose();
    if (t - poll < 150) return;
    poll = t;
    // a burning lamp whose memory you haven't heard: stand close to hear it
    if (live() && !GH && !capT && !FX)
      for (const L of LAMPS) {
        if (L.lit && !ms()[L.i] && MEM[L.i] && dW(L.x, L.z) < 3) {
          memory(L.i);
          break;
        }
      }
    const sh = live() && !busyNear() && canFinale();
    if (sh !== hintOn) {
      hintOn = sh;
      hint.textContent = "Press E: kneel beside the small shadow";
      hint.style.display = sh ? "block" : "none";
    }
  }
  requestAnimationFrame(frame);
  return { MEM, heard, play: memory, hush: () => H, version: 30 };
})();
