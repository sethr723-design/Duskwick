// DUSKWICK - 51-spellflair.js (v37): sound and extra punch for the Spell Paths kit (45-spellpaths.js / 44-spellfx.js).
// Loaded in order by index.html as plain scripts; they share one global scope. Only top-level name: FLAIR. Loads LAST.
// How it works:
//  - Every kit animation SPFX.A[k] is wrapped. While one is playing (`on` > 0), the shared battle helpers from
//    08-battle.js (charge, shoot, zap, shock, flashScr, cloud, spikes, fling, pillar) are wrapped to also make a sound
//    that fits the spell's element, so the sounds land exactly when the visuals do. Outside a kit spell they behave as
//    before (no sound).
//  - Each spell also has a signature (SIG[k]): its own sounds on a timeline, plus a few extra visuals (a fire line for
//    Flame Lash, heartbeats for Kindle Heart, wind streaks for Tailwind...).
//  - Extra visuals for every spell: a casting sigil under the caster on charge, an element splash on each ground
//    impact, and a camera "punch" (a quick FOV squeeze) on the big hits.
//  - Sounds are procedural WebAudio (own AudioContext, compressor + small reverb), no files. Setting duskwick_sfx {v}
//    (0 = off), Book > Options > Game > Spell sounds. Silent when watching from the street (SFXO.quiet) or tab hidden.
const FLAIR = (() => {
  const KEY = "duskwick_sfx",
    cfg = { v: 0.7 };
  try {
    Object.assign(cfg, JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch (e) {}
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cfg));
    } catch (e) {}
  };
  const RN = Math.random,
    sp = () => (typeof SPD !== "undefined" && SPD > 0 ? SPD : 1),
    quiet = () => typeof SFXO !== "undefined" && SFXO && SFXO.quiet,
    low = () => typeof GFX !== "undefined" && GFX === "low";
  // ===================================================================================================================
  // AUDIO
  // ===================================================================================================================
  let AC = null,
    OUT = null,
    NZ = null,
    VB = null;
  function ac() {
    if (!(cfg.v > 0) || document.hidden || quiet()) return null;
    try {
      if (!AC) {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        const cp = AC.createDynamicsCompressor();
        cp.threshold.value = -16;
        cp.knee.value = 12;
        cp.ratio.value = 5;
        cp.attack.value = 0.004;
        cp.release.value = 0.2;
        OUT = AC.createGain();
        OUT.connect(cp);
        cp.connect(AC.destination);
        const n = AC.sampleRate * 2;
        NZ = AC.createBuffer(1, n, AC.sampleRate);
        const d = NZ.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = RN() * 2 - 1;
        // a small hall: decaying noise impulse
        const L = (AC.sampleRate * 1.6) | 0,
          ir = AC.createBuffer(2, L, AC.sampleRate);
        for (let c = 0; c < 2; c++) {
          const q = ir.getChannelData(c);
          for (let i = 0; i < L; i++) q[i] = (RN() * 2 - 1) * Math.pow(1 - i / L, 2.6);
        }
        VB = AC.createConvolver();
        VB.buffer = ir;
        const vg = AC.createGain();
        vg.gain.value = 0.35;
        VB.connect(vg);
        vg.connect(OUT);
      }
      if (AC.state === "suspended") AC.resume();
      OUT.gain.value = cfg.v * 0.9;
      return AC;
    } catch (e) {
      return null;
    }
  }
  const at = (d) => AC.currentTime + 0.01 + Math.max(0, d || 0) / sp();
  function out(node, wet) {
    node.connect(OUT);
    if (wet) {
      const s = AC.createGain();
      s.gain.value = wet;
      node.connect(s);
      s.connect(VB);
    }
  }
  function envG(t, a, v, dur) {
    const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.02, dur));
    return g;
  }
  // filtered noise: o = { f0, f1, q, ty, v, a, wet, rate }
  function nz(d, dur, o) {
    if (!ac()) return;
    const t = at(d);
    dur /= sp();
    const s = AC.createBufferSource(),
      f = AC.createBiquadFilter();
    s.buffer = NZ;
    s.loop = true;
    s.playbackRate.value = o.rate || 1;
    f.type = o.ty || "bandpass";
    f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1 || o.f0), t + dur);
    const g = envG(t, Math.min(o.a || 0.01, dur * 0.9), o.v || 0.3, dur);
    s.connect(f);
    f.connect(g);
    out(g, o.wet);
    s.start(t, RN() * 1.5);
    s.stop(t + dur + 0.05);
  }
  // an oscillator: o = { f0, f1, ty, v, a, vib, vr, lp, lpt, q, wet, det }
  function tone(d, dur, o) {
    if (!ac()) return;
    const t = at(d);
    dur /= sp();
    const os = AC.createOscillator();
    os.type = o.ty || "sine";
    os.frequency.setValueAtTime(o.f0, t);
    if (o.f1) os.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    if (o.det) os.detune.value = o.det;
    let last = os;
    if (o.vib) {
      const l = AC.createOscillator(),
        lg = AC.createGain();
      l.frequency.value = o.vr || 6;
      lg.gain.value = o.vib;
      l.connect(lg);
      lg.connect(os.frequency);
      l.start(t);
      l.stop(t + dur + 0.05);
    }
    if (o.lp) {
      const f = AC.createBiquadFilter();
      f.type = o.lpt || "lowpass";
      f.frequency.value = o.lp;
      f.Q.value = o.q || 0.7;
      os.connect(f);
      last = f;
    }
    const g = envG(t, Math.min(o.a || 0.005, dur * 0.9), o.v || 0.2, dur);
    last.connect(g);
    out(g, o.wet);
    os.start(t);
    os.stop(t + dur + 0.05);
  }
  // ---------- the sound library (d = delay in seconds, v = loudness ~1) ----------
  const SND = {
    boom: (d, v = 1) => {
      tone(d, 1.0, { f0: 110, f1: 30, v: 0.55 * v });
      nz(d, 0.8, { ty: "lowpass", f0: 900, f1: 70, v: 0.45 * v, wet: 0.5 });
      nz(d, 0.12, { ty: "highpass", f0: 2500, v: 0.22 * v });
    },
    thump: (d, v = 1) => {
      tone(d, 0.28, { f0: 160, f1: 48, v: 0.4 * v });
      nz(d, 0.18, { ty: "lowpass", f0: 1200, f1: 200, v: 0.22 * v });
    },
    crack: (d, v = 1) => {
      nz(d, 0.08, { ty: "highpass", f0: 3000, v: 0.45 * v });
      nz(d + 0.02, 0.25, { ty: "bandpass", f0: 1800, f1: 400, q: 2, v: 0.22 * v, wet: 0.4 });
    },
    zzt: (d, dur = 0.25, v = 1) => {
      tone(d, dur, { f0: 90 + RN() * 40, ty: "sawtooth", v: 0.1 * v, vib: 40, vr: 47, lp: 3000 });
      nz(d, dur, { ty: "highpass", f0: 4000, v: 0.1 * v });
    },
    thunder: (d, v = 1) => {
      SND.crack(d, v);
      nz(d + 0.05, 2.6, { ty: "lowpass", f0: 520, f1: 60, v: 0.5 * v, a: 0.05, wet: 0.7, rate: 0.6 });
      tone(d + 0.05, 1.8, { f0: 70, f1: 34, v: 0.28 * v });
    },
    rumble: (d, dur, v = 1) =>
      nz(d, dur, { ty: "lowpass", f0: 180, f1: 90, v: 0.4 * v, a: dur * 0.5, wet: 0.5, rate: 0.5 }),
    whoosh: (d, dur, v = 1, f0 = 400, f1 = 2400) => nz(d, dur, { f0, f1, q: 1.4, v: 0.35 * v, a: dur * 0.6, wet: 0.3 }),
    roar: (d, dur, v = 1) => {
      nz(d, dur, { ty: "lowpass", f0: 500, f1: 1500, v: 0.32 * v, a: dur * 0.4, wet: 0.3 });
      for (let i = 0; i < dur * 14; i++)
        nz(d + RN() * dur, 0.03, { ty: "highpass", f0: 2000 + RN() * 3000, v: 0.1 * v });
    },
    chime: (d, f, v = 1, dur = 1.2) => {
      tone(d, dur, { f0: f, v: 0.14 * v, wet: 0.6 });
      tone(d, dur * 0.6, { f0: f * 2.76, v: 0.05 * v, wet: 0.6 });
      tone(d, dur * 0.4, { f0: f * 5.4, v: 0.025 * v, wet: 0.6 });
    },
    sparkle: (d, n, v = 1, base = 1800) => {
      for (let i = 0; i < n; i++) SND.chime(d + i * 0.05 + RN() * 0.04, base * (1 + RN() * 1.2), 0.5 * v, 0.5);
    },
    shatter: (d, v = 1) => {
      nz(d, 0.35, { ty: "highpass", f0: 3500, f1: 6000, v: 0.28 * v, wet: 0.4 });
      SND.sparkle(d, 5, v, 2400);
    },
    choir: (d, dur, f = 220, v = 1) =>
      [1, 1.5, 2, 1.26].forEach((m, i) =>
        tone(d + i * 0.04, dur, {
          f0: f * m,
          ty: "sawtooth",
          v: 0.045 * v,
          a: dur * 0.4,
          lp: 800 + i * 250,
          q: 4,
          lpt: "bandpass",
          vib: 3,
          vr: 5 + i,
          wet: 0.8,
          det: (i - 1.5) * 8,
        }),
      ),
    creak: (d, dur, v = 1) =>
      tone(d, dur, {
        f0: 70,
        f1: 115,
        ty: "sawtooth",
        v: 0.14 * v,
        vib: 18,
        vr: 9,
        lp: 700,
        q: 6,
        lpt: "bandpass",
        a: 0.05,
      }),
    screech: (d, v = 1) => {
      tone(d, 0.7, {
        f0: 1500,
        f1: 850,
        ty: "sawtooth",
        v: 0.07 * v,
        vib: 90,
        vr: 24,
        lp: 2500,
        q: 3,
        lpt: "bandpass",
        a: 0.04,
        wet: 0.6,
      });
      tone(d, 0.18, { f0: 900, f1: 2100, ty: "square", v: 0.035 * v, lp: 3000 });
    },
    whip: (d, v = 1) => {
      SND.whoosh(d - 0.15, 0.17, v * 0.8, 300, 3000);
      nz(d, 0.05, { ty: "highpass", f0: 2500, v: 0.55 * v });
      SND.crack(d, v * 0.8);
    },
    heart: (d, v = 1) => {
      SND.thump(d, v);
      SND.thump(d + 0.22, v * 0.7);
    },
    hiss: (d, dur, v = 1) => nz(d, dur, { ty: "highpass", f0: 5000, f1: 3000, v: 0.12 * v, a: 0.2, wet: 0.3 }),
    rain: (d, dur, v = 1) => nz(d, dur, { f0: 3500, f1: 3000, q: 0.6, v: 0.18 * v, a: dur * 0.3, wet: 0.3 }),
    howl: (d, dur, v = 1) => {
      nz(d, dur, { f0: 300, f1: 900, q: 6, v: 0.35 * v, a: dur * 0.4, wet: 0.5 });
      nz(d, dur, { f0: 600, f1: 1400, q: 8, v: 0.2 * v, a: dur * 0.5 });
    },
    bell: (d, f = 196, v = 1) =>
      [1, 2, 2.4, 3, 4.2].forEach((m, i) =>
        tone(d, 3.5 - i * 0.5, { f0: f * m, v: [0.2, 0.09, 0.07, 0.045, 0.03][i] * v, wet: 0.9 }),
      ),
    woo: (d, dur, v = 1) => tone(d, dur, { f0: 520, f1: 300, v: 0.12 * v, vib: 25, vr: 5, a: 0.08, wet: 0.8 }),
    chord: (d, dur, root, v = 1) =>
      [1, 1.25, 1.5, 2].forEach((m, i) =>
        tone(d + i * 0.06, dur, { f0: root * m, ty: "triangle", v: 0.055 * v, a: dur * 0.3, wet: 0.7 }),
      ),
    rise: (d, dur, f0, f1, v = 1, ty = "sine") =>
      tone(d, dur, { f0, f1, ty, v: 0.09 * v, a: dur * 0.8, lp: 1600, wet: 0.4 }),
    pop: (d, v = 1) => tone(d, 0.09, { f0: 620, f1: 180, v: 0.2 * v }),
    grind: (d, dur, v = 1) => {
      nz(d, dur, { f0: 250, f1: 500, q: 3, v: 0.3 * v, a: 0.05, rate: 0.4 });
      SND.creak(d, dur, 0.6 * v);
    },
    rubble: (d, v = 1) => {
      for (let i = 0; i < 6; i++) nz(d + RN() * 0.4, 0.07, { ty: "lowpass", f0: 600 + RN() * 600, v: 0.18 * v });
    },
  };
  // charging the lantern, by element (s = seconds)
  const CHG = {
    fire: (s) => {
      SND.roar(0, s + 0.1, 0.7);
      SND.rise(0, s, 160, 420, 0.8, "sawtooth");
    },
    storm: (s) => {
      SND.zzt(0, s, 0.8);
      SND.rise(0, s, 300, 950, 0.7, "square");
    },
    ice: (s) => {
      SND.hiss(0, s + 0.2, 0.9);
      for (let i = 0; i < 4; i++) SND.chime((i * s) / 4, 1320 * Math.pow(1.19, i), 0.6, 0.6);
    },
    heal: (s) => {
      SND.chord(0, s + 0.4, 392, 0.8);
      SND.sparkle(s * 0.5, 3, 0.5, 2000);
    },
    spirit: (s) => {
      SND.choir(0, s + 0.4, 196, 0.8);
      SND.woo(0, s + 0.2, 0.6);
    },
  };
  // a ground impact, by element
  const HIT = {
    fire: (v) => {
      SND.thump(0, v);
      SND.roar(0, 0.4, v * 0.8);
    },
    storm: (v) => {
      SND.crack(0, v);
      SND.zzt(0, 0.15, v * 0.6);
    },
    ice: (v) => {
      SND.thump(0, v * 0.8);
      SND.shatter(0, v * 0.8);
    },
    heal: (v) => {
      SND.thump(0, v * 0.6);
      SND.creak(0, 0.2, v * 0.5);
      SND.sparkle(0, 2, v * 0.5, 1500);
    },
    spirit: (v) => {
      SND.thump(0, v * 0.6);
      SND.woo(0, 0.4, v * 0.8);
    },
  };
  // something flying, by element (s = seconds)
  const FLY = {
    fire: (s) => SND.roar(0, s, 0.7),
    storm: (s) => SND.zzt(0, s, 0.9),
    ice: (s) => {
      tone(0, s, { f0: 2400, f1: 1500, v: 0.05, vib: 30, vr: 11, wet: 0.5 });
      SND.hiss(0, s, 0.7);
    },
    heal: (s) => SND.whoosh(0, s, 0.6, 300, 1200),
    spirit: (s) => SND.woo(0, s + 0.1, 0.9),
  };
  // ===================================================================================================================
  // VISUAL EXTRAS
  // ===================================================================================================================
  let on = 0,
    cur = null,
    mute = 0; // mute > 0: helper calls made by FLAIR itself (no sound, no extra splash)
  const live = () => on > 0 && !mute,
    el = () => (cur && cur.el) || "fire",
    col = () => (typeof EHX !== "undefined" && EHX[el()]) || 0xffd27a,
    TH = {},
    thr = (k, ms) => {
      const n = performance.now();
      if (n - (TH[k] || 0) < ms) return false;
      TH[k] = n;
      return true;
    },
    later = (s, f) =>
      setTimeout(
        () => {
          try {
            f();
          } catch (e) {}
        },
        (s * 1000) / sp(),
      ),
    self = (f) => {
      mute++;
      try {
        return f();
      } finally {
        mute--;
      }
    },
    V3 = (x, y, z) => new T.Vector3(x, y, z),
    meG = () => casterP().clone().setY(0);
  // camera punch: a quick FOV squeeze that springs back (own rAF loop, only while it runs)
  let pk = 0,
    pApplied = 0,
    pSet = null,
    pRun = 0;
  function punch(a) {
    if (quiet() || typeof C === "undefined" || typeof mode === "undefined" || mode === "explore") return;
    pk = Math.max(pk, Math.min(7, a));
    if (pRun) return;
    pRun = 1;
    let t0 = performance.now();
    (function s() {
      const n = performance.now(),
        dt = Math.min(0.05, (n - t0) / 1000);
      t0 = n;
      // if something else (a resize) set the FOV since our last frame, that is the new base
      const base = pSet != null && C.fov !== pSet ? C.fov : C.fov - pApplied;
      pk *= Math.pow(0.0025, dt); // fast decay
      pApplied = pk > 0.05 ? -pk : 0;
      C.fov = pSet = base + pApplied;
      C.updateProjectionMatrix();
      if (pApplied) requestAnimationFrame(s);
      else pRun = 0;
    })();
  }
  // a casting circle under the caster, with element motes spiralling up
  function sigil(e, ms, c) {
    if (low()) return;
    const p = meG(),
      cc = c || (EHX && EHX[e]) || 0xffd27a,
      L = (ms || 280) + 700;
    self(() => {
      rune(p, e, 1.5, L, cc);
      shock(p, cc, 1.4, 500, 0.12, 0.6);
    });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283;
      mote(V3(p.x + Math.cos(a) * 1.3, 0.2, p.z + Math.sin(a) * 1.3), {
        c: cc,
        v: [-Math.sin(a) * 1.4 - Math.cos(a) * 0.4, 1.6 + RN() * 1.6, Math.cos(a) * 1.4 - Math.sin(a) * 0.4],
        g: -0.3,
        l: 0.9,
        s: 0.22,
        gr: -0.6,
      });
    }
  }
  // an element splash where a blast hits the ground
  function splash(p, r) {
    if (low() || !thr("spl", 110)) return;
    const e = el(),
      c = col(),
      q = p.clone().setY(0.25),
      n = 10;
    self(() => {
      if (e === "fire")
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.283;
          mote(q, {
            t: SP.fire,
            v: [Math.cos(a) * r * 1.6, 0.8, Math.sin(a) * r * 1.6],
            g: 0,
            dr: 2.2,
            l: 0.55,
            s: 0.9,
          });
        }
      else if (e === "storm")
        for (let i = 0; i < 4; i++) {
          const a = RN() * 6.283;
          zap(q, V3(q.x + Math.cos(a) * r, 0.1, q.z + Math.sin(a) * r), c, 200, { w: 0.025, forks: 0, end: 1.2 });
        }
      else if (e === "ice") fling(q.clone().setY(0.4), 7, 3 + r * 0.3, { sz: 0.1, ms: 700 });
      else if (e === "heal") burst(q, 0x9aff9a, 12, 3 + r * 0.4, { g: 1, s: 0.3, lift: 1 });
      else
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.283;
          mote(q, {
            t: WGT,
            c,
            v: [Math.cos(a) * r * 0.9, 1.5 + RN(), Math.sin(a) * r * 0.9],
            g: -0.6,
            l: 0.8,
            s: 0.45,
            o: 0.7,
          });
        }
    });
  }
  // a line of flame on the ground from a to b (Flame Lash)
  function fireLine(a, b) {
    if (low()) return;
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const p = a
        .clone()
        .lerp(b, 0.25 + (i / n) * 0.75)
        .setY(0.2);
      later(i * 0.025, () =>
        mote(p, { t: SP.fire, v: [(RN() - 0.5) * 0.4, 1.2 + RN(), (RN() - 0.5) * 0.4], g: -0.4, l: 0.9, s: 0.75 }),
      );
    }
  }
  // speed streaks rushing past a point (Tailwind)
  function streaks(p, n) {
    if (low()) return;
    for (let i = 0; i < n; i++)
      later(i * 0.04, () =>
        mote(V3(p.x + 2.5, 0.4 + RN() * 2.4, p.z + (RN() - 0.5) * 2.2), {
          c: 0xf4fff8,
          v: [-9, 0, 0],
          g: 0,
          l: 0.45,
          s: 0.12 + RN() * 0.1,
          o: 0.8,
        }),
      );
  }
  // a heartbeat pulse at the caster's chest (Kindle Heart)
  const beat = (c) =>
    self(() => {
      const p = meG().setY(1.45);
      vshock(p, c, 1.5, 300);
      glowBurst(p, c, 2.6, 260);
    });
  // ===================================================================================================================
  // SIGNATURES: per spell sounds on a timeline (seconds, from the start of the animation) and a few extra visuals
  // ===================================================================================================================
  const SIG = {
    pcinder: (x) => {
      SND.whoosh(0.2, 0.3, 0.8, 300, 1500);
      if (x.r.a1) SND.whoosh(0.31, 0.3, 0.7, 350, 1700);
    },
    plash: (x) => {
      SND.whoosh(0.24, 0.32, 0.9, 200, 1400);
      SND.whip(0.55, 1.2);
      later(0.56, () => punch(2.5));
      if (x.f) later(0.6, () => fireLine(meG(), x.f.m.position.clone().setY(0)));
    },
    pphoenix: () => {
      SND.screech(0.3, 1);
      SND.roar(0.26, 1.7, 0.5);
      SND.screech(1.05, 1.2);
      SND.whoosh(0.95, 0.45, 1, 250, 2200);
    },
    pkindle: () => {
      SND.roar(0, 0.9, 0.45);
      SND.heart(0.55, 1);
      SND.heart(1.0, 1.25);
      later(0.55, () => beat(0xff6a2a));
      later(1.0, () => beat(0xffa040));
    },
    psun: () => {
      SND.choir(0.32, 1.0, 262, 1);
      SND.rise(0.32, 0.9, 200, 800, 1, "sawtooth");
      SND.whoosh(1.22, 0.52, 1.2, 200, 1800);
    },
    gspark: () => SND.zzt(0, 0.5, 0.6),
    ggust: () => {
      SND.howl(0.2, 1.0, 1);
      SND.whoosh(0.22, 0.9, 1, 200, 1200);
      later(0.5, () => punch(1.5));
    },
    gthunder: () => SND.rain(0.26, 1.7, 1),
    gtail: () => {
      SND.howl(0, 1.0, 0.6);
      SND.whoosh(0, 1.0, 0.8, 300, 2000);
      SND.sparkle(1.0, 4, 0.7, 2200);
      streaks(meG(), 18);
    },
    gsky: () => {
      SND.howl(0.32, 1.2, 1.3);
      SND.thunder(1.38, 1.4);
    },
    rwall: () => {
      SND.grind(0.22, 0.5, 1.1);
      SND.shatter(1.2, 0.8);
    },
    rhammer: () => {
      SND.hiss(0.26, 0.5, 1);
      SND.chime(0.3, 880, 0.7, 0.8);
      SND.whoosh(0.76, 0.23, 1.3, 150, 900);
      SND.boom(0.99, 1.1);
      later(0.99, () => punch(4.5));
    },
    rring: () => {
      SND.whoosh(0.24, 0.52, 0.9, 2000, 6000);
      SND.hiss(0.24, 0.6, 1);
    },
    ravatar: () => {
      SND.rumble(0.32, 1.0, 1.4);
      SND.grind(0.32, 1.0, 1);
      SND.rubble(2.7, 1.2);
    },
    vseed: () => {
      SND.pop(0.56);
      SND.creak(0.58, 0.35, 1);
    },
    vrain: () => {
      SND.rain(0.22, 1.5, 0.8);
      SND.chord(0.22, 1.6, 330, 0.8);
    },
    vvine: () => {
      SND.creak(0.24, 0.6, 1.2);
      SND.creak(0.3, 0.5, 0.9);
      SND.thump(0.83, 1);
      SND.rubble(0.84, 0.6);
      later(0.83, () => punch(2));
    },
    vgrove: () => {
      SND.chord(0.22, 1.6, 294, 0.9);
      SND.creak(0.22, 0.4, 0.7);
      SND.sparkle(0.6, 4, 0.6, 1800);
    },
    vheart: () => {
      SND.creak(0.32, 1.1, 1.3);
      SND.rumble(0.32, 1.1, 0.8);
      SND.choir(1.42, 1.6, 262, 1.2);
      SND.chord(1.42, 1.8, 523, 1);
      SND.sparkle(1.5, 6, 0.8, 2000);
    },
    swisp: () => SND.woo(0.2, 0.45, 1),
    slink: () => {
      SND.choir(0.22, 0.9, 175, 0.9);
      for (let i = 0; i < 4; i++) SND.chime(0.22 + i * 0.09, 900 + i * 120, 0.5, 0.4);
    },
    sproc: () => {
      SND.bell(0.3, 147, 1.2);
      SND.choir(0.5, 1.8, 147, 1);
      for (let t = 0.4; t < 2.1; t += 0.26) SND.thump(t, 0.25);
    },
  };
  // ===================================================================================================================
  // HOOKS on the shared battle helpers (08-battle.js); only act while a kit spell plays
  // ===================================================================================================================
  const wrap = (name, f) => {
    try {
      const o = window[name];
      if (typeof o !== "function") return;
      window[name] = f(o);
    } catch (e) {}
  };
  const safe = (f) => {
    try {
      f();
    } catch (e) {}
  };
  wrap(
    "charge",
    (o) =>
      function (e, ms, c) {
        if (live())
          safe(() => {
            (CHG[e] || CHG.fire)((ms || 280) / 1000);
            sigil(e, ms, c);
          });
        return o.apply(this, arguments);
      },
  );
  wrap(
    "shoot",
    (o) =>
      async function (ob, a, b, ms) {
        if (live())
          safe(() => {
            (FLY[el()] || FLY.fire)((ms || 300) / 1000);
            self(() => vshock(a, col(), 0.9, 220));
          });
        const was = live(),
          r = await o.apply(this, arguments);
        if (was && live() && thr("arr", 60)) safe(() => HIT[el()](0.7));
        return r;
      },
  );
  wrap(
    "zap",
    (o) =>
      function (a, b, c, ms) {
        if (live() && thr("zap", 80))
          safe(() => {
            if (el() === "spirit") SND.woo(0, 0.3, 0.5);
            else if (a.distanceTo(b) > 5) {
              SND.thunder(0, 0.8);
              punch(1.8);
            } else SND.zzt(0, Math.min(0.4, (ms || 200) / 1000), 0.7);
          });
        return o.apply(this, arguments);
      },
  );
  wrap(
    "shock",
    (o) =>
      function (p, c, r) {
        if (live() && thr("shk", 70))
          safe(() => {
            HIT[el()](Math.max(0.4, Math.min(1.4, (r || 2) / 4)));
            if (r >= 5) punch(r * 0.4);
            splash(p, Math.min(3, (r || 2) * 0.5));
          });
        return o.apply(this, arguments);
      },
  );
  wrap(
    "flashScr",
    (o) =>
      function (c, a) {
        if (live())
          safe(() => {
            const h = String(c || "").replace("#", ""),
              lum =
                h.length >= 6
                  ? (parseInt(h.slice(0, 2), 16) + parseInt(h.slice(2, 4), 16) + parseInt(h.slice(4, 6), 16)) / 765
                  : 0.5;
            if (lum > 0.6 && (a || 0.55) >= 0.6) {
              SND.boom(0, (a || 0.55) * 1.3);
              punch(5.5);
            } else if (lum < 0.15 && (a || 0.55) >= 0.3) SND.rumble(0, 1.2, 0.8);
          });
        return o.apply(this, arguments);
      },
  );
  wrap(
    "cloud",
    (o) =>
      function (c, r, ms) {
        if (live()) safe(() => SND.rumble(0, Math.min(2.5, (ms || 1500) / 1000), 0.7));
        return o.apply(this, arguments);
      },
  );
  wrap(
    "spikes",
    (o) =>
      function () {
        if (live() && thr("spk", 150))
          safe(() => {
            SND.shatter(0.05, 0.9);
            SND.grind(0, 0.2, 0.6);
          });
        return o.apply(this, arguments);
      },
  );
  wrap(
    "fling",
    (o) =>
      function (p, n, s, op) {
        if (live() && thr("fl", 120)) safe(() => (op && op.rock ? SND.rubble(0, 0.9) : SND.sparkle(0, 3, 0.6, 2600)));
        return o.apply(this, arguments);
      },
  );
  wrap(
    "pillar",
    (o) =>
      function (p, c, r, h, ms) {
        if (live() && thr("pil", 200))
          safe(() => {
            SND.rise(0, ((ms || 600) / 1000) * 0.6, 420, 900, 0.6);
            SND.chime(0.05, 1046, 0.4, 0.8);
          });
        return o.apply(this, arguments);
      },
  );
  // ===================================================================================================================
  // WRAP THE KIT ANIMATIONS
  // ===================================================================================================================
  function wrapA(k, e) {
    const a0 = SPFX.A[k];
    if (typeof a0 !== "function" || a0.flair) return;
    const f = async function (x) {
      on++;
      const c0 = cur;
      cur = { k, el: e };
      try {
        if (!mute && !quiet()) safe(() => SIG[k] && SIG[k](x || { r: {} }));
        return await a0.apply(this, arguments);
      } finally {
        on--;
        cur = c0;
      }
    };
    f.flair = 1;
    SPFX.A[k] = f;
  }
  try {
    if (typeof SPATH !== "undefined" && typeof SPFX !== "undefined")
      Object.keys(SPATH.K).forEach((k) => wrapA(SPATH.K[k].fx || k, SPATH.K[k].el));
    // the Wispcaller's summons arriving
    if (SPFX.A.sumIn && !SPFX.A.sumIn.flair) {
      const s0 = SPFX.A.sumIn;
      SPFX.A.sumIn = function () {
        safe(() => {
          if (quiet()) return;
          SND.choir(0, 0.9, 220, 0.8);
          SND.woo(0.1, 0.6, 0.8);
          SND.sparkle(0.3, 3, 0.5, 1600);
        });
        return s0.apply(this, arguments);
      };
      SPFX.A.sumIn.flair = 1;
    }
  } catch (e) {
    console.warn("spell flair", e);
  }
  // a rune carved in the rune menu (45-spellpaths.js)
  function carve(e) {
    safe(() => {
      [0, 0.09, 0.18, 0.3].forEach((d, i) => SND.chime(d, 660 * Math.pow(1.26, i), 0.9, 1.4));
      SND.rise(0, 0.5, 300, 900, 0.6);
      const p = W.position.clone(),
        c = (EHX && EHX[e]) || 0xffd34d;
      glowBurst(p.clone().setY(1.6), c, 4, 700);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * 6.283;
        mote(V3(p.x + Math.cos(a) * 1.6, 0.3, p.z + Math.sin(a) * 1.6), {
          c,
          v: [-Math.cos(a) * 0.8, 2.5 + RN() * 1.5, -Math.sin(a) * 0.8],
          g: -0.4,
          l: 1.1,
          s: 0.3,
        });
      }
    });
  }
  // ===================================================================================================================
  // Book > Options > Game: spell sound volume
  // ===================================================================================================================
  if (typeof panel === "function") {
    const p0 = panel;
    panel = function (k) {
      p0.apply(this, arguments);
      try {
        if (k !== "book" || BOOKL.last !== "optgame") return;
        const L = $("pl");
        if (!L) return;
        const r = document.createElement("div"),
          sl = document.createElement("input"),
          lb = document.createElement("span"),
          w = document.createElement("span");
        r.className = "row";
        r.innerHTML =
          "<div><b>Spell sounds</b><small>Whooshes, booms and chimes for your spells (0% = off)</small></div>";
        sl.type = "range";
        sl.min = 0;
        sl.max = 100;
        sl.value = Math.round(cfg.v * 100);
        sl.style.cssText = "width:120px;vertical-align:middle";
        lb.style.cssText = "display:inline-block;width:42px;text-align:right";
        lb.textContent = sl.value + "%";
        sl.oninput = () => {
          lb.textContent = sl.value + "%";
          cfg.v = sl.value / 100;
          save();
        };
        sl.onchange = () => SND.chime(0, 880, 1, 0.8);
        sl.onkeydown = (e) => e.stopPropagation();
        w.appendChild(sl);
        w.appendChild(lb);
        r.appendChild(w);
        L.appendChild(r);
      } catch (e) {}
    };
  }
  return { SND, SIG, cfg, punch, carve, play: (k, x) => SPFX.A[k] && SPFX.A[k](x) };
})();
