// DUSKWICK - 76-castsfx.js (v49c): charge-up / casting sounds and summon sounds. Loaded in order by index.html as plain
// scripts; they share one global scope. Only top-level name: CASTSFX. Loads LAST (after 74-foesfx.js, whose synth it
// uses: FOESFX.ctx/tone/nz/voice/R/VOX, so the volume is the same Spell sounds slider).
//  - Charge-up: CHG.start (23) is wrapped. While the lantern gathers power a held hum plays in the caster's school
//    (fire roar, ice glass, storm buzz, heal chord, spirit choir); its pitch, brightness and loudness follow the
//    build-up (h.kk), with element sparkles on top. CHG.stop releases it: PERFECT = bright flare, Good = whoosh and
//    burst, missed = a fizzle. Other players' charges (opt.auto) play quieter.
//  - Summons: `summon(t)` is wrapped (outermost): a rising pillar sound, then the creature's own cry (ALLY voices are
//    added to FOESFX.VO as "a:<t>"). `act0(s, f, t)` is wrapped: the creature cries and strikes, and every `dmg` /
//    `healP` / `healA` while it acts plays its hit (bite, slash, heavy, zap, burst...) in its element.
//  - Monster-summon cards (33: cwisp/cbogl/cskel/cbogm/cdrown, in CFX and SFXK): arrival + the monster's voice, and a
//    cry + hit on each "slam" pose (FMV.pose wrap), so watchers hear it too.
const CASTSFX = (() => {
  if (typeof FOESFX === "undefined") return {};
  const F = FOESFX,
    RN = Math.random,
    cl = (v, a, b) => Math.max(a, Math.min(b, v)),
    safe = (fn) => {
      try {
        fn();
      } catch (e) {
        console.warn("castsfx", e);
      }
      F.lv(1);
    },
    TH = {},
    thr = (k, ms) => {
      const n = performance.now();
      if (n - (TH[k] || 0) < ms) return false;
      TH[k] = n;
      return true;
    };
  // ===================================================================================================================
  // CHARGE-UP HUM
  // ===================================================================================================================
  const HUM = {
    fire: {
      w: ["sawtooth", "sawtooth"],
      m: [1, 1.5],
      det: 8,
      f0: 70,
      f1: 190,
      lp0: 300,
      lp1: 2200,
      vib: 3,
      vr: 5,
      nz: { ty: "lowpass", f0: 300, f1: 1600, v: 0.7 },
      wet: 0.2,
      rf: 330,
    },
    ice: {
      w: ["sine", "triangle"],
      m: [1, 2.01],
      det: 4,
      f0: 520,
      f1: 1250,
      lp0: 3000,
      lp1: 6000,
      vib: 8,
      vr: 6,
      nz: { ty: "highpass", f0: 4500, f1: 3000, v: 0.3 },
      wet: 0.4,
      rf: 1320,
    },
    storm: {
      w: ["square", "sawtooth"],
      m: [1, 1.007],
      det: 0,
      f0: 95,
      f1: 310,
      lp0: 700,
      lp1: 3200,
      vib: 14,
      vr: 31,
      nz: { ty: "highpass", f0: 3000, f1: 5000, v: 0.25 },
      wet: 0.2,
      rf: 660,
    },
    heal: {
      w: ["triangle", "triangle", "sine"],
      m: [1, 1.5, 2],
      det: 3,
      f0: 196,
      f1: 392,
      lp0: 1500,
      lp1: 3000,
      vib: 3,
      vr: 4.5,
      nz: { ty: "bandpass", f0: 2500, f1: 3500, v: 0.15 },
      wet: 0.5,
      rf: 784,
    },
    spirit: {
      w: ["sine", "sine", "triangle"],
      m: [1, 1.498, 0.5],
      det: 10,
      f0: 130,
      f1: 300,
      lp0: 900,
      lp1: 2000,
      vib: 5,
      vr: 4,
      nz: { ty: "bandpass", f0: 600, f1: 1200, v: 0.2 },
      wet: 0.6,
      rf: 523,
    },
  };
  let NB = null; // own noise buffer for the held hum
  function hum(h) {
    const X = F.ctx();
    if (!X) return null;
    const { AC, OUT, VB } = X,
      P = HUM[h.el] || HUM.fire,
      t = AC.currentTime;
    if (!NB) {
      NB = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
      const d = NB.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = RN() * 2 - 1;
    }
    const mg = AC.createGain(),
      ws = AC.createGain(),
      lp = AC.createBiquadFilter(),
      lfo = AC.createOscillator();
    mg.gain.setValueAtTime(0.0001, t);
    ws.gain.value = P.wet;
    mg.connect(OUT);
    mg.connect(ws);
    ws.connect(VB);
    lp.type = "lowpass";
    lp.frequency.value = P.lp0;
    lp.Q.value = 1.2;
    lp.connect(mg);
    lfo.frequency.value = P.vr;
    const os = P.w.map((ty, i) => {
      const o = AC.createOscillator(),
        og = AC.createGain(),
        vg = AC.createGain();
      o.type = ty;
      o.frequency.value = P.f0 * P.m[i];
      o.detune.value = (i - (P.w.length - 1) / 2) * P.det;
      vg.gain.value = P.vib * P.m[i];
      lfo.connect(vg);
      vg.connect(o.frequency);
      og.gain.value = 0.5 / P.w.length;
      o.connect(og);
      og.connect(lp);
      o.start(t);
      return o;
    });
    const ns = AC.createBufferSource(),
      nf = AC.createBiquadFilter(),
      ng = AC.createGain();
    ns.buffer = NB;
    ns.loop = true;
    nf.type = P.nz.ty;
    nf.frequency.value = P.nz.f0;
    nf.Q.value = 0.9;
    ng.gain.value = P.nz.v;
    ns.connect(nf);
    nf.connect(ng);
    ng.connect(mg);
    ns.start(t, RN());
    lfo.start(t);
    return { AC, P, mg, lp, os, nf, lfo, ns, lvl: h.auto ? 0.45 : 1, end: 0 };
  }
  function humSet(H, h) {
    const { AC, P } = H,
      t = AC.currentTime,
      k = cl(h.kk || 0, 0, 1),
      e = k * k;
    H.os.forEach((o, i) => o.frequency.setTargetAtTime(P.f0 * Math.pow(P.f1 / P.f0, k) * P.m[i], t, 0.05));
    H.lp.frequency.setTargetAtTime(P.lp0 + (P.lp1 - P.lp0) * e, t, 0.06);
    H.nf.frequency.setTargetAtTime(P.nz.f0 + (P.nz.f1 - P.nz.f0) * k, t, 0.08);
    const v = Math.min(1, 0.6 + 0.4 * (h.p || 0)) * H.lvl * vol() * (0.05 + 0.16 * k);
    H.mg.gain.setTargetAtTime(Math.max(0.0001, v), t, 0.05);
  }
  const vol = () => 1; // the master gain in FOESFX already carries the slider
  function humEnd(H, fast) {
    if (!H || H.end) return;
    H.end = 1;
    try {
      const t = H.AC.currentTime,
        d = fast ? 0.06 : 0.14;
      H.mg.gain.cancelScheduledValues(t);
      H.mg.gain.setTargetAtTime(0.0001, t, d / 3);
      H.os.forEach((o) => o.stop(t + d + 0.1));
      H.ns.stop(t + d + 0.1);
      H.lfo.stop(t + d + 0.1);
    } catch (e) {}
  }
  // sparkles on top of the hum, by element (k = build-up)
  function sparkle(el, k, lvl) {
    F.lv(lvl);
    if (el === "ice") F.tone(0, 0.3, { ty: "sine", f0: 1600 + RN() * 2200 * (0.5 + k), v: 0.05, a: 0.003, wet: 0.5 });
    else if (el === "storm")
      F.nz(0, 0.03 + RN() * 0.04, { ty: "highpass", f0: 2500 + RN() * 3000, v: 0.12 + 0.18 * k });
    else if (el === "fire") F.nz(0, 0.015 + RN() * 0.02, { ty: "highpass", f0: 1800 + RN() * 2500, v: 0.1 + 0.15 * k });
    else if (el === "heal")
      F.tone(0, 0.5, { ty: "sine", f0: [784, 988, 1175, 1568][(RN() * 4) | 0], v: 0.035, a: 0.01, wet: 0.6 });
    else F.tone(0, 0.6, { ty: "sine", f0: 300 + RN() * 400, f1: 200, vib: 12, vr: 6, v: 0.03, a: 0.1, wet: 0.7 });
    F.lv(1);
  }
  // release into the spell (gr 2 PERFECT, 1 Good, 0 missed)
  function release(el, gr, p, lvl) {
    const P = HUM[el] || HUM.fire,
      b = P.rf;
    F.lv(lvl);
    if (gr === 2) {
      [1, 1.5, 2, 3].forEach((m, i) =>
        F.tone(i * 0.025, 0.9, { ty: "sine", f0: b * m, v: 0.09 / (1 + i * 0.5), a: 0.003, wet: 0.6 }),
      );
      F.whoosh(0, 1, 0.28, 1);
      F.elHit(el, 0.02, 0.4 + 0.6 * p, 1);
      F.nz(0, 0.5, { f0: 400, f1: 4000, q: 0.7, v: 0.2, a: 0.02, wet: 0.5 });
    } else if (gr === 1) {
      F.tone(0, 0.5, { ty: "sine", f0: b, v: 0.07, a: 0.004, wet: 0.5 });
      F.whoosh(0, 1, 0.22, 1);
      F.elHit(el, 0.02, 0.2 * p, 1);
    } else {
      F.tone(0, 0.45, { ty: "triangle", f0: P.f0 * 2, f1: 60, v: 0.12, a: 0.005 });
      F.nz(0, 0.35, { ty: "lowpass", f0: 1400, f1: 200, v: 0.18, a: 0.01 });
    }
    F.lv(1);
  }
  if (typeof CHG !== "undefined" && CHG && CHG.start) {
    const H = new Map(); // charge handle -> hum
    const s0 = CHG.start,
      st0 = CHG.stop,
      k0 = CHG.kill;
    CHG.start = function (c, opt) {
      H.forEach((x) => humEnd(x, 1));
      H.clear();
      const h = s0.apply(this, arguments);
      safe(() => {
        const x = h && hum(h);
        if (!x) return;
        H.set(h, x);
        let last = performance.now(),
          acc = 0;
        (function tick() {
          if (x.end) return;
          const cur = CHG.cur && CHG.cur();
          if (cur !== h || h.rel || performance.now() - h.t0 > 12000) {
            humEnd(x, 0);
            H.delete(h);
            return;
          }
          const n = performance.now(),
            dt = Math.min(0.1, (n - last) / 1000);
          last = n;
          humSet(x, h);
          acc += dt * (2 + 9 * (h.kk || 0));
          while (acc >= 1) {
            acc--;
            sparkle(h.el, h.kk || 0, x.lvl);
          }
          requestAnimationFrame(tick);
        })();
      });
      return h;
    };
    CHG.stop = function (h, gr) {
      const ok = h && h === (CHG.cur && CHG.cur()) && !h.rel;
      const r = st0.apply(this, arguments);
      if (ok)
        safe(() => {
          const x = H.get(h);
          humEnd(x, 1);
          H.delete(h);
          release(h.el, gr | 0, h.p || 0, h.auto ? 0.45 : 1);
        });
      return r;
    };
    CHG.kill = function () {
      H.forEach((x) => humEnd(x, 1));
      H.clear();
      return k0.apply(this, arguments);
    };
  }

  // ===================================================================================================================
  // SUMMONS
  // ===================================================================================================================
  // ALLY voices (v = FOESFX.VOX recipes, plus "hoot" below) and their hit (FOESFX.R group)
  const AV = {
    blade: { v: ["clank"], f: 620, len: 0.3, h: "slash" },
    aegis: { v: ["chime", "clank"], f: 700, len: 0.5, h: "heavy" },
    wisp: { v: ["whisper", "chitter"], f: 1600, len: 0.4, h: "zap" },
    sprite: { v: ["chime", "giggle"], f: 1200, len: 0.4, h: "proj" },
    golem: { v: ["rumble"], f: 75, len: 0.7, h: "heavy" },
    wolf: { v: ["snarl", "whisper"], f: 200, len: 0.5, h: "bite" },
    drake: { v: ["roar", "crackle"], f: 220, len: 0.6, h: "breath" },
    owl: { v: ["hoot"], f: 420, len: 0.5, h: "zap" },
    squire: { v: ["clank", "growl"], f: 420, len: 0.35, h: "slash" },
    witch: { v: ["giggle"], f: 600, len: 0.5, h: "drain" },
    pup: { v: ["yip"], f: 820, len: 0.25, h: "bite" },
    epup: { v: ["yip", "crackle"], f: 650, len: 0.3, h: "bite" },
    phoenix: { v: ["screech", "crackle"], f: 1250, len: 0.6, h: "meteor" },
    titan: { v: ["rumble", "chime"], f: 55, len: 0.9, h: "quake" },
    roc: { v: ["screech"], f: 650, len: 0.6, h: "zap" },
    familiar: { v: ["chitter", "chime"], f: 1200, len: 0.35, h: "zap" },
    lwisp: { v: ["whisper", "chime"], f: 1100, len: 0.5, h: "nova" },
    revn: { v: ["clank", "moan"], f: 200, len: 0.6, h: "slash" },
    pfang: { v: ["growl", "crackle"], f: 130, len: 0.6, h: "bite" },
    gcat: { v: ["roar", "hiss"], f: 260, len: 0.6, h: "zap" },
    rhorn: { v: ["roar", "chime"], f: 110, len: 0.8, h: "heavy" },
    mback: { v: ["rumble", "growl"], f: 60, len: 0.8, h: "heavy" },
    sfox: { v: ["yip", "whisper"], f: 900, len: 0.4, h: "bite" },
  };
  F.VOX.hoot = (d, f, L, w) => {
    F.tone(d, 0.22, { ty: "sine", f0: f, f1: f * 0.92, v: 0.2, a: 0.05, wet: w + 0.3 });
    F.tone(d + 0.3, 0.32, { ty: "sine", f0: f * 0.95, f1: f * 0.85, v: 0.18, a: 0.06, wet: w + 0.3 });
    F.nz(d, 0.2, { f0: f * 2, q: 4, v: 0.04 });
  };
  Object.keys(AV).forEach((t) => (F.VO["a:" + t] = AV[t]));
  const idA = (t) => ({ k: AV[t] ? "a:" + t : "g1", s: 1, l: 1, w: 0.15 }),
    pmA = (t) => cl(Math.pow(((AV[t] && AV[t].f) || 200) / 200, 0.22), 0.6, 1.8),
    elA = (t) => (typeof ALLY !== "undefined" && ALLY[t] && ALLY[t].el) || "spirit";
  // a summon (or monster card) arriving: a rising pillar, a flash on landing, then its cry
  function arrive(el, id, lvl) {
    if (!F.ctx()) return;
    F.lv(lvl || 1);
    F.charge(el, 0, 1, 0.45);
    F.whoosh(0, 1, 0.4, 1);
    const b = (HUM[el] || HUM.spirit).rf;
    [1, 1.5, 2].forEach((m, i) => F.tone(0.42 + i * 0.03, 0.8, { ty: "sine", f0: b * m, v: 0.07, a: 0.004, wet: 0.6 }));
    F.thud(0.42, 1, 0.3);
    if (id) F.voice(id, 0.55, 1);
    F.lv(1);
  }
  if (typeof summon === "function") {
    const sm0 = summon;
    summon = async function (t) {
      safe(() => arrive(elA(t), AV[t] ? idA(t) : null));
      return sm0.apply(this, arguments);
    };
  }
  let actT = null; // the summon acting right now
  if (typeof act0 === "function") {
    const a0 = act0;
    act0 = async function (s, f, t) {
      const pv = actT;
      actT = t;
      safe(() => {
        if (!F.ctx()) return;
        if (AV[t]) F.voice(idA(t), 0, 0.8);
        const R = F.R[(AV[t] && AV[t].h) || "slash"];
        if (R && R.r && f) setTimeout(() => safe(() => R.r(elA(t), pmA(t))), 120);
      });
      try {
        return await a0.apply(this, arguments);
      } finally {
        actT = pv;
      }
    };
  }
  function allyHit(t, el) {
    if (!thr("ah", 90)) return;
    const R = F.R[(AV[t] && AV[t].h) || "slash"];
    safe(() => (R && R.h ? R.h(el || elA(t), pmA(t), 0) : F.elHit(el || elA(t), 0, 0.3, pmA(t))));
  }
  if (typeof dmg === "function") {
    const d0 = dmg;
    dmg = function (q, n, el) {
      if (actT) allyHit(actT, el);
      return d0.apply(this, arguments);
    };
  }
  const healHook = (name) => {
    if (typeof window[name] !== "function") return;
    const h0 = window[name];
    window[name] = function () {
      if (actT && thr("ahl", 150))
        safe(() => {
          F.VOX.chime(0, 880 * pmA(actT), 0.7, 0.3);
          F.nz(0, 0.4, { f0: 2500, f1: 4500, q: 1, v: 0.08, wet: 0.5 });
        });
      return h0.apply(this, arguments);
    };
  };
  healHook("healP");
  healHook("healA");

  // ===================================================================================================================
  // MONSTER-SUMMON CARDS (33)
  // ===================================================================================================================
  const MC = {
    cwisp: { k: "mwisp", el: "fire", h: "proj" },
    cbogl: { k: "bogl", el: "storm", h: "zap" },
    cskel: { k: "skel", el: "ice", h: "slash" },
    cbogm: { k: "bogm", el: "heal", h: "heavy" },
    cdrown: { k: "skel", el: "spirit", h: "drain" },
  };
  let mon = null;
  const idM = (c) => ({ k: c.k, s: 1, l: 1, w: 0.2 }),
    pmM = (c) => cl(Math.pow(((F.VO[c.k] && F.VO[c.k].f) || 200) / 200, 0.22), 0.6, 1.8);
  [typeof CFX !== "undefined" ? CFX : null, typeof SFXK !== "undefined" ? SFXK : null].forEach((T0, wi) => {
    if (!T0) return;
    Object.keys(MC).forEach((k) => {
      const o = T0[k];
      if (typeof o !== "function") return;
      T0[k] = async function () {
        const c = MC[k],
          pv = mon;
        mon = { c, lvl: wi ? 0.6 : 1 };
        safe(() => arrive(c.el, idM(c), mon.lvl));
        try {
          return await o.apply(this, arguments);
        } finally {
          mon = pv;
        }
      };
    });
  });
  if (typeof FMV !== "undefined" && FMV && FMV.pose) {
    const p0 = FMV.pose;
    FMV.pose = function (o, an, ph) {
      if (mon && an === "slam" && ph && o && o.userData && o.userData.sfk === mon.c.k) {
        const m = mon;
        safe(() => {
          if (!F.ctx()) return;
          F.voice(idM(m.c), 0, 0.5);
          const R = F.R[m.c.h] || F.R.heavy;
          setTimeout(() => safe(() => (F.lv(m.lvl), R.h && R.h(m.c.el, pmM(m.c), 0.3))), 140);
        });
      }
      return p0.apply(this, arguments);
    };
  }
  return { HUM, AV, MC, arrive, release };
})();
