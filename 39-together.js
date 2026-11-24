// v29 TOGETHER: co-op extras for playing with friends. Only top-level name: TOGETHER.
//  1. Emotes   keys 1-4 (or the ☺ button, bottom right) wave / cheer / bow / dance; speech-bubble icon over the head, sent to
//              everyone as NET "emo".
//  2. Lantern Bond   while fighting beside another real player every cast fills a shared-feeling meter (combo when you both
//              act within 6 s). Higher bond = bigger victory bonus (5-20% XP + glimmers) and at 100 the host of the fight can
//              fire a once-per-battle Lantern Finale (hits every foe, heals you). NET messages already used by combat are
//              watched ("act", "bfx"), nothing new is sent for it.
//  3. Great Lamp   stand at the fountain in the square and press E; when two players do it within 6 s (NET "glamp") a short
//              firework celebration plays and each of them gets a reward once per real-world day (P.tg.lamp).
//  4. High-fives   E (or H) next to another player; when both do it within 3 s (NET "hf") they clap, sparks fly and each
//              gets "High-Five Glow": +10% XP and glimmers on the next victory (10 minutes).
// Everything is wraps + listeners: no edits to other files. Solo play (no NET link) shows none of the prompts.
// P.tg is made on first use (old saves just don't have it), so there is no DEFP entry.
const TOGETHER = (() => {
  const nowMs = () => performance.now();
  const on = () => typeof SLOT !== "undefined" && SLOT >= 0 && !!P && typeof mode !== "undefined";
  const cls = (c) => document.body.classList.contains(c);
  const live = () => on() && mode === "explore" && !paused && !cls("cut") && !cls("ttl");
  const tgs = () => (P.tg = P.tg || {});
  const pname = (id) => {
    const p = PEERS.get(id);
    return (p && p.pr && p.pr.name) || "A friend";
  };
  const busyNear = () => !!(window.__np || window.__ln || window.__ch);
  const typing = (e) => e.target && /^(input|textarea|select)$/i.test(e.target.tagName || "");
  const dayKey = () => new Date().toISOString().slice(0, 10);

  // ---------- emotes + speech bubbles ----------
  const EM = {
    wave: { i: "👋", n: "Wave", d: 1.6 },
    cheer: { i: "🎉", n: "Cheer", d: 1.5 },
    bow: { i: "🙇", n: "Bow", d: 1.7 },
    dance: { i: "💃", n: "Dance", d: 2.6 },
    five: { i: "🙌", n: "High-five", d: 1.2 },
  };
  const EK = ["wave", "cheer", "bow", "dance"];
  const anims = [],
    bubs = [];
  const bubTex = {};
  function bubble(o, em, h) {
    if (!bubTex[em]) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const x = c.getContext("2d");
      x.fillStyle = "rgba(255,248,230,.95)";
      x.strokeStyle = "#7a5a2a";
      x.lineWidth = 5;
      x.beginPath();
      x.arc(64, 58, 48, 0, 7);
      x.fill();
      x.stroke();
      x.beginPath();
      x.moveTo(50, 98);
      x.lineTo(64, 120);
      x.lineTo(78, 98);
      x.fill();
      x.font = "64px sans-serif";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(em, 64, 62);
      bubTex[em] = new T.CanvasTexture(c);
    }
    const old = bubs.findIndex((b) => b.o === o);
    if (old >= 0) {
      S.remove(bubs[old].s);
      bubs[old].s.material.dispose();
      bubs.splice(old, 1);
    }
    const s = new T.Sprite(new T.SpriteMaterial({ map: bubTex[em], transparent: true, depthTest: false }));
    s.scale.set(1.7, 1.7, 1);
    s.renderOrder = 50;
    S.add(s);
    bubs.push({ s, o, t: nowMs(), d: 2400, h: h || (o === W ? 4.5 : 4.0) });
  }
  function startAnim(o, k) {
    if (!o || !EM[k]) return;
    const i = anims.findIndex((a) => a.o === o);
    if (i >= 0) endAnim(anims.splice(i, 1)[0]);
    anims.push({ o, k, t: nowMs(), d: EM[k].d * 1000, y0: o.position.y, x0: o.position.x, z0: o.position.z, ord: o.rotation.order });
    o.rotation.order = "YXZ";
  }
  function endAnim(a) {
    a.o.rotation.x = a.o.rotation.z = 0;
    a.o.rotation.order = a.ord || "XYZ";
    a.o.position.y = a.y0;
  }
  function animTick() {
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i],
        o = a.o,
        u = (nowMs() - a.t) / a.d;
      // you walked off, or the wizard is gone from the world: stop
      const gone = !o.parent || (o === W && (mode !== "explore" || Math.hypot(o.position.x - a.x0, o.position.z - a.z0) > 0.4));
      if (u >= 1 || gone) {
        endAnim(a);
        anims.splice(i, 1);
        continue;
      }
      const s = Math.sin(u * Math.PI);
      let y = 0;
      o.rotation.x = o.rotation.z = 0;
      if (a.k === "wave") o.rotation.z = Math.sin(u * 30) * 0.16 * s;
      else if (a.k === "cheer") y = Math.abs(Math.sin(u * Math.PI * 3)) * 0.8;
      else if (a.k === "bow") o.rotation.x = s * 0.75;
      else if (a.k === "dance") {
        o.rotation.y += 0.13;
        o.rotation.z = Math.sin(u * 28) * 0.14;
        y = Math.abs(Math.sin(u * Math.PI * 7)) * 0.35;
      } else if (a.k === "five") {
        o.rotation.z = -s * 0.3;
        y = Math.abs(Math.sin(u * Math.PI * 2)) * 0.5;
      }
      o.position.y = a.y0 + y;
    }
    for (let i = bubs.length - 1; i >= 0; i--) {
      const b = bubs[i],
        u = (nowMs() - b.t) / b.d;
      if (u >= 1 || !b.o.parent) {
        S.remove(b.s);
        b.s.material.dispose();
        bubs.splice(i, 1);
        continue;
      }
      const base = b.o.position;
      b.s.position.set(base.x, b.h + u * 0.6, base.z);
      b.s.material.opacity = u > 0.75 ? (1 - u) * 4 : 1;
      b.s.scale.setScalar(1.7 * Math.min(1, u * 8 + 0.3));
    }
  }
  let lastEmo = 0;
  function emote(k) {
    if (!live() || !EM[k] || nowMs() - lastEmo < 900) return;
    lastEmo = nowMs();
    startAnim(W, k);
    bubble(W, EM[k].i);
    if (NET.online) NET.send("emo", { k });
  }
  const peerEmo = {};
  NET.on("emo", (d, from) => {
    const p = PEERS.get(from);
    if (!p || !d || typeof d.k !== "string" || !EM[d.k] || d.k === "five") return;
    if (nowMs() - (peerEmo[from] || 0) < 700) return;
    peerEmo[from] = nowMs();
    startAnim(p.o, d.k);
    bubble(p.o, EM[d.k].i);
  });

  // ---------- Lantern Bond ----------
  const BD = { v: 0, used: 0, team: false, key: "", lastMe: 0, lastOt: 0, teamAt: 0, flash: 0 };
  const guestB = () => (typeof GUEST !== "undefined" && GUEST ? GUEST.b : "");
  function teamNow() {
    if (!on()) return false;
    if (mode === "guest") return true;
    return mode === "battle" && typeof coopB === "function" && !!g && coopB();
  }
  function bondHit(who) {
    if (!BD.team) return;
    const t = nowMs(),
      mine = who === "me";
    if (t - (mine ? BD.lastMe : BD.lastOt) < 500) return;
    let add = 7;
    if (t - (mine ? BD.lastOt : BD.lastMe) < 6000) {
      add += 10;
      BD.flash = t;
    }
    if (mine) BD.lastMe = t;
    else BD.lastOt = t;
    const was = BD.v;
    BD.v = Math.min(100, BD.v + add);
    if (was < 100 && BD.v >= 100 && mode === "battle" && !BD.used) toast("Lantern Bond is full! Fire the Lantern Finale!", "#ffd34d");
  }
  const send0 = NET.send;
  NET.send = function (type, data) {
    if ((type === "bfx" || (type === "act" && data && data.k !== "end")) && BD.team) bondHit("me");
    return send0.apply(NET, arguments);
  };
  NET.on("bfx", () => bondHit("other"));
  NET.on("act", (a) => a && a.k !== "end" && bondHit("other"));

  const css = document.createElement("style");
  css.textContent =
    "#tgm{position:fixed;top:76px;left:50%;transform:translateX(-50%);z-index:30;display:none;text-align:center;font:12px Georgia,serif;color:#ffe9b0;pointer-events:none;text-shadow:0 1px 3px #000}" +
    "#tgm .bar{width:190px;height:10px;margin:3px auto;border:1px solid #c9a24a;border-radius:6px;background:#1a1220;overflow:hidden}" +
    "#tgm .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff9a3d,#ffd34d,#fff2b0);transition:width .3s}" +
    "#tgm.hot .bar{box-shadow:0 0 12px #ffd34d}" +
    "#tgf{pointer-events:auto;margin-top:4px;padding:6px 14px;border:1px solid #ffd34d;border-radius:8px;background:linear-gradient(#5a3a10,#2a1a08);color:#fff2b0;font:bold 13px Georgia,serif;cursor:pointer;display:none;box-shadow:0 0 14px #ffd34d88}" +
    "#tgp{position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:30;display:none;padding:5px 12px;border-radius:8px;background:rgba(20,12,34,.85);border:1px solid #c9a24a;color:#ffe9b0;font:13px Georgia,serif;pointer-events:none}" +
    "#tgb{position:fixed;right:12px;bottom:170px;z-index:30;display:none;font:18px sans-serif;text-align:right}" +
    "#tgb button{width:38px;height:38px;margin:2px;border-radius:50%;border:1px solid #c9a24a;background:rgba(20,12,34,.88);cursor:pointer;font-size:19px;padding:0}" +
    "#tgb .row{display:none}#tgb.open .row{display:block}" +
    "body.cut #tgm,body.cut #tgp,body.cut #tgb,body.ttl #tgm,body.ttl #tgp,body.ttl #tgb{display:none!important}";
  document.head.appendChild(css);
  const meter = document.createElement("div");
  meter.id = "tgm";
  meter.innerHTML =
    '<div>✦ Lantern Bond <b id="tgv">0</b>%</div><div class="bar"><i id="tgi"></i></div><button id="tgf">✦ Lantern Finale</button>';
  document.body.appendChild(meter);
  const hint = document.createElement("div");
  hint.id = "tgp";
  document.body.appendChild(hint);
  const bar = document.createElement("div");
  bar.id = "tgb";
  bar.innerHTML =
    '<div class="row">' +
    EK.map((k, n) => '<button data-k="' + k + '" title="' + EM[k].n + " (" + (n + 1) + ')">' + EM[k].i + "</button>").join("") +
    '</div><button id="tgo" title="Emotes (keys 1-4)">☺</button>';
  document.body.appendChild(bar);
  bar.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "tgo") bar.classList.toggle("open");
    else emote(b.dataset.k);
    b.blur();
  };
  $("tgf").onclick = () => finale();
  async function finale() {
    if (mode !== "battle" || !g || g.busy || g.ended || BD.used || BD.v < 100) return;
    if (typeof alive !== "function" || typeof resolve !== "function") return;
    BD.used = 1;
    g.busy = true;
    toast("LANTERN FINALE!", "#ffd34d");
    ring(W.position.x, 0xffd34d, 9, 900, W.position.z);
    puff(W.position.clone().setY(2.4), "spirit", 40, 6, 1.2, 1.4);
    puff(W.position.clone().setY(2.4), "fire", 24, 5, 1, 1.1);
    try {
      alive().forEach((f) => dmg(f, 16 + 2 * (P.lvl || 1), "spirit", true));
      if (typeof healP === "function") healP(10 + 2 * (P.lvl || 1));
    } catch (e) {}
    NET.send("tgfin", {});
    ui();
    await resolve();
    if (!alive().length) return win();
    g.busy = false;
    ui();
  }
  NET.on("tgfin", (d, from) => {
    if (BD.team) toast(pname(from) + " unleashed a Lantern Finale!", "#ffd34d");
  });
  $("tgf") && ($("tgf").onmousedown = (e) => e.stopPropagation());

  // reward bonus (host / solo path via reward, guests via guestExit)
  let hfBuff = 0; // timestamp the glow ends
  function bonus(list) {
    const team = nowMs() - BD.teamAt < 30000,
      glow = hfBuff > nowMs();
    const pct = (team ? 0.05 + 0.15 * (BD.v / 100) : 0) + (glow ? 0.1 : 0);
    if (pct <= 0 || !list || !list.length) return;
    let xx = 0,
      gx = 0;
    list.forEach((f) => {
      const m = (f.min ? 0.5 : 1) * (f.el ? 2 : 1),
        fl = f.lv || f.t || 1;
      xx += Math.round(xpFor(fl) * m);
      gx += Math.round((4 + 5 * fl) * m);
    });
    const bx = Math.max(1, Math.round(xx * pct)),
      bg = Math.max(1, Math.round(gx * pct));
    P.xp += bx;
    P.gold += bg;
    toast(
      (team && glow ? "Bond + Glow" : team ? "Lantern Bond " + Math.round(BD.v) + "%" : "High-Five Glow") +
        ": +" + bx + " XP  +" + bg + " ✦",
      "#ffd34d",
    );
    hfBuff = 0;
    BD.v = 0;
    BD.teamAt = 0;
    try {
      lvup();
    } catch (e) {}
    sv();
  }
  const reward0 = reward;
  reward = function (list) {
    const r = reward0.apply(this, arguments);
    try {
      bonus(list);
    } catch (e) {
      console.error(e);
    }
    return r;
  };
  const gexit0 = guestExit;
  guestExit = function (won) {
    const s = GUEST && GUEST.s,
      list = s && won ? s.foes.slice() : null;
    const r = gexit0.apply(this, arguments);
    try {
      bonus(list);
    } catch (e) {
      console.error(e);
    }
    return r;
  };

  // ---------- Great Lamp (the fountain) ----------
  const lampP = new Map();
  let lampMe = 0,
    lampToast = 0,
    cer = null;
  const nearLamp = () => Math.hypot(W.position.x - OX, W.position.z - OZ) < 7.5;
  function lampPress() {
    lampMe = nowMs();
    lampP.set("me", lampMe);
    ring(OX, 0xffd34d, 4, 700, OZ);
    puff(new T.Vector3(OX, 3, OZ), "fire", 8, 3, 0.9, 0.9);
    NET.send("glamp", {});
    if (!lampCheck()) toast("You raise your light to the Great Lamp... a friend must light it with you within 6 seconds.", "#ffd34d");
  }
  NET.on("glamp", (d, from) => {
    lampP.set(from, nowMs());
    if (!lampCheck() && nowMs() - lampToast > 15000 && on()) {
      lampToast = nowMs();
      toast(pname(from) + " is lighting the Great Lamp! Go to the fountain and press E.", "#ffd34d");
    }
  });
  function lampCheck() {
    const t = nowMs();
    if (!lampMe || t - lampMe > 6000) return false;
    const who = [...lampP.entries()].filter(([k, v]) => k !== "me" && t - v < 6000);
    if (!who.length) return false;
    lampMe = 0;
    lampP.clear();
    celebrate(who.length + 1);
    return true;
  }
  function celebrate(n) {
    const glow = new T.Sprite(
      new T.SpriteMaterial({ map: GLT, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }),
    );
    glow.scale.setScalar(16);
    glow.position.set(OX, 4, OZ);
    S.add(glow);
    cer = { t: nowMs(), glow, next: 0 };
    toast("The Great Lamp blazes! " + n + " lamplighters together.", "#ffd34d");
    const day = dayKey(),
      tg = tgs();
    if (tg.lamp !== day) {
      tg.lamp = day;
      const gd = 40 + 4 * (P.lvl || 1),
        xp = 2 * xpFor(P.lvl || 1);
      P.gold += gd;
      P.xp += xp;
      toast("Today's blessing: +" + xp + " XP  +" + gd + " ✦", "#9affc8");
      try {
        lvup();
      } catch (e) {}
      sv();
    } else toast("Its daily gift is already yours, but the light is lovely.", "#c9b8ff");
  }
  const FK = ["fire", "ice", "storm", "heal", "spirit"];
  function cerTick() {
    if (!cer) return;
    const t = nowMs() - cer.t,
      D = 9000;
    if (t > D) {
      S.remove(cer.glow);
      cer.glow.material.dispose();
      cer = null;
      return;
    }
    cer.glow.material.opacity = Math.min(1, t / 600, (D - t) / 1500) * (0.8 + 0.2 * Math.sin(t / 120));
    if (t > cer.next) {
      cer.next = t + 320;
      const c = new T.Vector3(OX + (Math.random() - 0.5) * 18, 8 + Math.random() * 7, OZ + (Math.random() - 0.5) * 18);
      puff(c, FK[(Math.random() * FK.length) | 0], 20, 7, 1.2, 1.2);
    }
  }
  NET.on("bye", (d, from) => lampP.delete(from));

  // ---------- high-five ----------
  let hfMe = 0;
  const hfIn = new Map(),
    hfDone = new Map();
  const peerDist = (p) => Math.hypot(p.o.position.x - W.position.x, p.o.position.z - W.position.z);
  function nearPeer() {
    let best = null,
      bd = 5.5;
    PEERS.forEach((p, id) => {
      const d = peerDist(p);
      if (d < bd) {
        bd = d;
        best = id;
      }
    });
    return best;
  }
  function hfFire(id) {
    const p = PEERS.get(id),
      t = nowMs();
    if (!p || t - (hfDone.get(id) || 0) < 4000) return;
    hfDone.set(id, t);
    hfMe = 0;
    hfIn.delete(id);
    const mid = new T.Vector3((p.o.position.x + W.position.x) / 2, 3.2, (p.o.position.z + W.position.z) / 2);
    puff(mid, "heal", 16, 4, 0.9, 0.9);
    puff(mid, "fire", 10, 3.5, 0.7, 0.7);
    ring(mid.x, 0xffd34d, 3, 600, mid.z);
    startAnim(W, "five");
    startAnim(p.o, "five");
    bubble(p.o, "🙌");
    toast("High-five with " + pname(id) + "!", "#ffd34d");
    if (t - (hfDone.get("buff") || 0) > 60000) {
      hfDone.set("buff", t);
      hfBuff = t + 10 * 60000;
      toast("High-Five Glow: +10% XP and glimmers on your next victory.", "#9affc8");
    }
  }
  function hfPress() {
    const id = nearPeer();
    if (id == null) return false;
    hfMe = nowMs();
    startAnim(W, "five");
    bubble(W, "🙌");
    NET.send("hf", {});
    const v = hfIn.get(id);
    if (v && hfMe - v < 3000) hfFire(id);
    else toast("Hand raised... " + pname(id) + " needs to raise theirs too.", "#c9b8ff");
    return true;
  }
  NET.on("hf", (d, from) => {
    const p = PEERS.get(from);
    if (!p) return;
    hfIn.set(from, nowMs());
    if (hfMe && nowMs() - hfMe < 3000 && peerDist(p) < 8) hfFire(from);
    else if (on() && peerDist(p) < 8) bubble(p.o, "🙌");
  });
  NET.on("bye", (d, from) => {
    hfIn.delete(from);
    hfDone.delete(from);
  });

  // ---------- keys ----------
  addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || !e.key || typing(e) || !on()) return;
    const k = e.key.toLowerCase();
    if (k >= "1" && k <= "4" && k.length === 1) return void emote(EK[+k - 1]);
    if (!live() || !NET.online) return;
    if (k === "h") return void hfPress();
    if (k !== "e" || busyNear()) return;
    try {
      if (typeof SOC !== "undefined" && SOC.nearDoor() >= 0) return;
    } catch (er) {}
    if ((nearLamp() && (lampPress(), 1)) || hfPress()) if (typeof keys === "object") keys.e = 0;
  });

  // ---------- frame + HUD poll ----------
  let last = 0,
    hintTxt = "";
  function frame() {
    requestAnimationFrame(frame);
    if (!on() || typeof W === "undefined") return;
    animTick();
    cerTick();
    const t = nowMs();
    if (t - last < 200) return;
    last = t;
    // bond meter
    const team = teamNow();
    if (team) {
      const key = mode + ":" + (guestB() || (g && g.id) || "");
      if (!BD.team || key !== BD.key) {
        if (key !== BD.key) {
          BD.v = 0;
          BD.used = 0;
        }
        BD.key = key;
      }
      BD.teamAt = t;
    }
    BD.team = team;
    meter.style.display = team ? "block" : "none";
    if (team) {
      $("tgv").textContent = Math.round(BD.v);
      $("tgi").style.width = BD.v + "%";
      meter.classList.toggle("hot", BD.v >= 100 || t - BD.flash < 1500);
      $("tgf").style.display = BD.v >= 100 && !BD.used && mode === "battle" && g && !g.busy ? "inline-block" : "none";
    }
    // prompts + emote button
    const lv = live();
    bar.style.display = lv ? "block" : "none";
    let txt = "";
    if (lv && NET.online && !busyNear()) {
      if (nearLamp()) txt = "Press E: light the Great Lamp with a friend";
      else {
        const id = nearPeer();
        if (id != null) txt = "Press E (or H): high-five " + pname(id);
      }
    }
    if (txt !== hintTxt) {
      hintTxt = txt;
      hint.textContent = txt;
      hint.style.display = txt ? "block" : "none";
    }
  }
  requestAnimationFrame(frame);
  return { emote, bond: BD, version: 29 };
})();
