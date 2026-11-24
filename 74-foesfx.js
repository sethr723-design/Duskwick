// DUSKWICK - 74-foesfx.js (v49): enemy attack sounds. Loaded in order by index.html as plain scripts; they share one
// global scope. Only top-level name: FOESFX. Loads LAST.
// How it works:
//  - Every foe kind has its own procedural voice (VO: growl, hiss, screech, rattle, gurgle, clank...; pitch, length and
//    a second layer), played on the move's wind-up. Bosses (and alphas) use the same voice lower, longer and louder.
//  - Every move makes a sound on release and another when it lands, picked by its effect (FX: slash, bite, heavy,
//    projectile, breath, quake, drain...) and coloured by its element, then pitched by the foe's voice, so the same
//    move sounds different on a golem and on an imp.
//  - Hooks (wraps, no rewrites): `FMV.pose` (remembers which foe model is acting; "hurt" flinches ignored),
//    `FMV.wind` (wind-up voice + charge hum) and `FMV.fx` (release + impact when its promise resolves). These run on
//    the host, on guests (from 'fmv') and for street spectators (quieter), so no NET changes. `mkFoe` is wrapped to tag
//    models with their kind (`userData.sfk/sft/sfb`) for guests, who have no foe objects.
//  - Own AudioContext; volume follows the Spell sounds slider (`FLAIR.cfg.v`, Book > Options > Game). Silent when 0
//    or the tab is hidden.
const FOESFX = (() => {
  const RN = Math.random,
    vol = () => (typeof FLAIR !== "undefined" && FLAIR && FLAIR.cfg && FLAIR.cfg.v != null ? +FLAIR.cfg.v : 0.7);
  let AC = null,
    OUT = null,
    NZ = null,
    VB = null,
    LV = 1; // level of the sound being built (spectators are quieter)
  function ac() {
    if (!(vol() > 0) || document.hidden) return null;
    try {
      if (!AC) {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        const cp = AC.createDynamicsCompressor();
        // v49d: gentler compression plus make-up gain (the old -18 dB / 5:1 with nothing after it was far too quiet)
        cp.threshold.value = -10;
        cp.knee.value = 8;
        cp.ratio.value = 3;
        cp.attack.value = 0.003;
        cp.release.value = 0.2;
        OUT = AC.createGain();
        const mk = AC.createGain();
        mk.gain.value = 2.2;
        OUT.connect(cp);
        cp.connect(mk);
        mk.connect(AC.destination);
        const n = AC.sampleRate * 2;
        NZ = AC.createBuffer(1, n, AC.sampleRate);
        const d = NZ.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = RN() * 2 - 1;
        const L = (AC.sampleRate * 1.4) | 0,
          ir = AC.createBuffer(2, L, AC.sampleRate);
        for (let c = 0; c < 2; c++) {
          const q = ir.getChannelData(c);
          for (let i = 0; i < L; i++) q[i] = (RN() * 2 - 1) * Math.pow(1 - i / L, 2.4);
        }
        VB = AC.createConvolver();
        VB.buffer = ir;
        const vg = AC.createGain();
        vg.gain.value = 0.32;
        VB.connect(vg);
        vg.connect(OUT);
      }
      if (AC.state === "suspended") AC.resume();
      OUT.gain.value = vol();
      return AC;
    } catch (e) {
      return null;
    }
  }
  const at = (d) => AC.currentTime + 0.01 + Math.max(0, d || 0),
    cl = (v, a, b) => Math.max(a, Math.min(b, v));
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
    g.gain.linearRampToValueAtTime(Math.max(0.0002, v * LV), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.02, dur));
    return g;
  }
  // filtered noise: o = { f0, f1, q, ty, v, a, wet, tr (tremolo rate) }
  function nz(d, dur, o) {
    if (!ac()) return;
    const t = at(d),
      s = AC.createBufferSource(),
      f = AC.createBiquadFilter();
    s.buffer = NZ;
    s.loop = true;
    f.type = o.ty || "bandpass";
    f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(cl(o.f0, 20, 16000), t);
    f.frequency.exponentialRampToValueAtTime(cl(o.f1 || o.f0, 20, 16000), t + dur);
    const g = envG(t, Math.min(o.a || 0.01, dur * 0.9), o.v || 0.3, dur);
    s.connect(f);
    let last = f;
    if (o.tr) last = trem(f, t, dur, o.tr, o.trd || 0.8);
    last.connect(g);
    out(g, o.wet);
    s.start(t, RN() * 1.5);
    s.stop(t + dur + 0.05);
  }
  function trem(node, t, dur, rate, depth) {
    const tg = AC.createGain(),
      l = AC.createOscillator(),
      lg = AC.createGain();
    tg.gain.value = 1 - depth / 2;
    l.frequency.value = rate;
    lg.gain.value = depth / 2;
    l.connect(lg);
    lg.connect(tg.gain);
    l.start(t);
    l.stop(t + dur + 0.05);
    node.connect(tg);
    return tg;
  }
  // oscillator: o = { f0, f1, ty, v, a, vib, vr, lp, q, wet, det, tr, trd }
  function tone(d, dur, o) {
    if (!ac()) return;
    const t = at(d),
      os = AC.createOscillator();
    os.type = o.ty || "sine";
    os.frequency.setValueAtTime(cl(o.f0, 20, 16000), t);
    if (o.f1) os.frequency.exponentialRampToValueAtTime(cl(o.f1, 20, 16000), t + dur);
    if (o.det) os.detune.value = o.det;
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
    let last = os;
    if (o.lp) {
      const f = AC.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cl(o.lp, 40, 16000);
      f.Q.value = o.q || 0.8;
      os.connect(f);
      last = f;
    }
    if (o.tr) last = trem(last, t, dur, o.tr, o.trd || 0.7);
    const g = envG(t, Math.min(o.a || 0.01, dur * 0.9), o.v || 0.2, dur);
    last.connect(g);
    out(g, o.wet);
    os.start(t);
    os.stop(t + dur + 0.05);
  }

  // ===================================================================================================================
  // VOICES: (d delay, f pitch, len seconds, w reverb send)
  // ===================================================================================================================
  const VOX = {
    growl: (d, f, L, w) => {
      tone(d, L, { ty: "sawtooth", f0: f * 1.1, f1: f * 0.8, lp: f * 6, v: 0.22, a: 0.06, tr: 26, trd: 0.8, wet: w });
      tone(d, L, { ty: "square", f0: f * 0.55, f1: f * 0.45, lp: f * 3, v: 0.1, a: 0.08, tr: 19, wet: w });
      nz(d, L, { f0: f * 4, f1: f * 2.5, q: 2, v: 0.12, a: 0.06, tr: 26, wet: w });
    },
    snarl: (d, f, L, w) => {
      tone(d, L, { ty: "sawtooth", f0: f * 0.8, f1: f * 1.25, lp: f * 9, v: 0.2, a: 0.03, tr: 34, trd: 0.9, wet: w });
      nz(d, L, { f0: f * 6, f1: f * 10, q: 3, v: 0.16, a: 0.03, tr: 34, wet: w });
      tone(d + L * 0.7, L * 0.5, { ty: "sawtooth", f0: f * 1.3, f1: f * 0.7, lp: f * 7, v: 0.14, tr: 30, wet: w });
    },
    hiss: (d, f, L, w) => {
      nz(d, L, { ty: "highpass", f0: 2600, f1: 4800, q: 0.7, v: 0.22, a: L * 0.3, wet: w });
      nz(d, L * 0.8, { f0: f * 8, f1: f * 12, q: 6, v: 0.1, a: 0.05, wet: w });
    },
    screech: (d, f, L, w) => {
      tone(d, L, { ty: "square", f0: f * 1.5, f1: f, vib: f * 0.06, vr: 13, lp: f * 4, v: 0.11, a: 0.02, wet: w });
      tone(d, L, { ty: "sawtooth", f0: f * 2.3, f1: f * 1.6, det: 18, lp: f * 5, v: 0.07, a: 0.02, wet: w });
      nz(d, L * 0.6, { f0: f * 3, f1: f * 2, q: 4, v: 0.08, wet: w });
    },
    rumble: (d, f, L, w) => {
      tone(d, L, { ty: "sine", f0: f, f1: f * 0.7, v: 0.34, a: L * 0.25, wet: w });
      tone(d, L, { ty: "triangle", f0: f * 1.5, f1: f * 1.1, v: 0.14, a: L * 0.3, tr: 9, wet: w });
      nz(d, L, { ty: "lowpass", f0: 260, f1: 90, q: 0.8, v: 0.3, a: L * 0.3, tr: 11, trd: 0.5, wet: w });
    },
    rattle: (d, f, L, w) => {
      const n = Math.max(5, Math.round(L / 0.045));
      for (let i = 0; i < n; i++)
        nz(d + i * 0.045 + RN() * 0.015, 0.035, { f0: f * (0.7 + RN() * 0.7), q: 7, v: 0.32, wet: w });
      tone(d, 0.06, { ty: "square", f0: f * 0.2, f1: f * 0.15, lp: 1200, v: 0.06 });
    },
    gurgle: (d, f, L, w) => {
      tone(d, L, { ty: "sine", f0: f * 1.3, f1: f, vib: f * 0.5, vr: 17, v: 0.24, a: 0.06, wet: w });
      nz(d, L, { ty: "lowpass", f0: 500, f1: 220, q: 3, v: 0.16, tr: 14, wet: w });
      const n = Math.round(4 + L * 6);
      for (let i = 0; i < n; i++) {
        const b = f * (4 + RN() * 6);
        tone(d + RN() * L, 0.06, { ty: "sine", f0: b, f1: b * 1.9, v: 0.09, wet: w });
      }
    },
    whisper: (d, f, L, w) => {
      nz(d, L, { f0: f, f1: f * 1.7, q: 6, v: 0.2, a: L * 0.4, wet: w + 0.35 });
      nz(d + 0.05, L, { f0: f * 2.3, f1: f * 1.3, q: 8, v: 0.13, a: L * 0.4, wet: w + 0.35 });
    },
    moan: (d, f, L, w) => {
      tone(d, L, { ty: "sine", f0: f, f1: f * 0.82, vib: f * 0.04, vr: 4.5, v: 0.26, a: L * 0.3, wet: w + 0.4 });
      tone(d, L, { ty: "triangle", f0: f * 1.5, f1: f * 1.2, det: 12, v: 0.1, a: L * 0.35, wet: w + 0.4 });
      nz(d, L, { f0: f * 3, f1: f * 2, q: 3, v: 0.08, a: L * 0.4, wet: w + 0.4 });
    },
    roar: (d, f, L, w) => {
      tone(d, L, { ty: "sawtooth", f0: f * 1.3, f1: f * 0.7, lp: f * 9, v: 0.24, a: 0.08, tr: 22, trd: 0.5, wet: w });
      tone(d, L, { ty: "sawtooth", f0: f * 0.65, f1: f * 0.4, lp: f * 4, v: 0.16, a: 0.1, det: -14, wet: w });
      nz(d, L, { f0: 700, f1: 220, q: 0.9, v: 0.24, a: 0.1, tr: 22, trd: 0.5, wet: w });
    },
    clank: (d, f, L, w) => {
      [1, 2.76, 5.4, 8.93].forEach((m, i) =>
        tone(d, L * (1 - i * 0.18), { ty: "sine", f0: f * m, v: 0.16 / (1 + i * 0.6), a: 0.002, wet: w + 0.2 }),
      );
      nz(d, 0.05, { ty: "highpass", f0: 3000, v: 0.2 });
    },
    squeak: (d, f, L, w) => {
      tone(d, 0.09, { ty: "sine", f0: f, f1: f * 1.6, v: 0.16, a: 0.01, wet: w });
      tone(d + 0.12, 0.08, { ty: "sine", f0: f * 1.2, f1: f * 1.9, v: 0.12, a: 0.01, wet: w });
    },
    chitter: (d, f, L, w) => {
      const n = Math.max(4, Math.round(L / 0.055));
      for (let i = 0; i < n; i++)
        tone(d + i * 0.055, 0.04, { ty: "square", f0: f * (1 + RN() * 0.4), lp: f * 3, v: 0.07, a: 0.003, wet: w });
    },
    yip: (d, f, L, w) => {
      tone(d, 0.13, { ty: "triangle", f0: f * 1.3, f1: f * 0.8, lp: f * 5, v: 0.2, a: 0.01, wet: w });
      nz(d, 0.1, { f0: f * 3, q: 3, v: 0.08 });
      tone(d + 0.17, 0.11, { ty: "triangle", f0: f * 1.4, f1: f * 0.9, lp: f * 5, v: 0.15, a: 0.01, wet: w });
    },
    crackle: (d, f, L, w) => {
      const n = Math.round(8 + L * 14);
      for (let i = 0; i < n; i++)
        nz(d + RN() * L, 0.012 + RN() * 0.02, { ty: "highpass", f0: 1800 + RN() * 3000, v: 0.2 + RN() * 0.2 });
    },
    chime: (d, f, L, w) => {
      const b = Math.max(f, 400);
      [1, 2.4, 3.9].forEach((m, i) =>
        tone(d + i * 0.03, L * 1.4, { ty: "sine", f0: b * m, v: 0.09 / (1 + i), a: 0.004, wet: w + 0.5 }),
      );
    },
    giggle: (d, f, L, w) => {
      [1.45, 1.32, 1.22, 1.12, 1.04].forEach((m, i) =>
        tone(d + i * 0.085, 0.07, { ty: "sine", f0: f * m, f1: f * m * 0.85, vib: f * 0.05, vr: 20, v: 0.12, wet: w }),
      );
    },
  };
  // voice per foe key: v = [main, second], f = pitch, len = wind-up length
  const VO = {
    g1: { v: ["whisper", "giggle"], f: 620, len: 0.45 }, // Gloomling
    g2: { v: ["screech"], f: 760, len: 0.35 }, // Dusk Imp
    g3: { v: ["rumble", "growl"], f: 85, len: 0.7 }, // Moss brute
    g4: { v: ["roar", "crackle"], f: 150, len: 0.6 }, // Cinder Fiend
    g5: { v: ["moan", "whisper"], f: 105, len: 1.0 }, // Gloom Warden
    wolf: { v: ["snarl"], f: 170, len: 0.5 },
    hound: { v: ["growl", "crackle"], f: 115, len: 0.55 },
    m_knight: { v: ["clank"], f: 320, len: 0.4 },
    m_ember: { v: ["crackle", "squeak"], f: 950, len: 0.3 },
    m_mite: { v: ["chitter"], f: 1400, len: 0.3 },
    m_cub: { v: ["yip"], f: 700, len: 0.25 },
    fgolem: { v: ["rumble", "chime"], f: 70, len: 0.8 },
    lgolem: { v: ["rumble", "crackle"], f: 52, len: 0.8 },
    phoenix: { v: ["screech", "crackle"], f: 1150, len: 0.5 },
    gnome: { v: ["chitter", "giggle"], f: 880, len: 0.35 },
    bogl: { v: ["hiss", "gurgle"], f: 260, len: 0.45 },
    skel: { v: ["rattle"], f: 1900, len: 0.4 },
    bogm: { v: ["gurgle", "rumble"], f: 75, len: 0.8 },
    mwisp: { v: ["whisper", "chime"], f: 1500, len: 0.5 },
    rb0: { v: ["snarl", "snarl"], f: 130, len: 0.6, d2: 1.12 }, // Rimefang Twin-Maw: two heads, two snarls
    rb1: { v: ["gurgle", "moan"], f: 70, len: 0.9 }, // The Lake Lurker
    rb2: { v: ["clank", "rumble"], f: 180, len: 0.7 }, // Runebound Sentinel
    rb3: { v: ["growl", "giggle"], f: 140, len: 0.6 }, // Grumm the Trapper
    rb4: { v: ["roar", "gurgle"], f: 80, len: 0.9 }, // Magmaw
    rb5: { v: ["rumble", "clank"], f: 60, len: 0.9 }, // The Obsidian Gatekeeper
    rb6: { v: ["clank", "rumble"], f: 110, len: 0.9 }, // The Anvil Colossus
    rb7: { v: ["giggle", "hiss"], f: 420, len: 0.6 }, // Granny Hollowroot
    rb8: { v: ["chime", "moan"], f: 220, len: 1.1 }, // The Drowned Bellringer
    rb9: { v: ["rumble", "growl"], f: 65, len: 0.8 }, // Old Mossback
    rb10: { v: ["whisper", "chime"], f: 520, len: 0.9 }, // The Lantern Mother
    dkb0: { v: ["roar", "chime"], f: 95, len: 1.0 }, // frost dungeon boss
    dkb1: { v: ["roar", "crackle"], f: 75, len: 1.0 }, // ember dungeon boss
    dkb2: { v: ["gurgle", "roar"], f: 68, len: 1.0 }, // marsh dungeon boss
  };
  // a foe model -> { k voice key, s pitch scale, l level, w reverb }
  function who(o) {
    if (!o) return null;
    const u = o.userData || (o.userData = {});
    if (u.sfx && typeof u.sfx === "object") return u.sfx;
    let k = null,
      boss = 0,
      big = 0;
    const f = typeof g !== "undefined" && g && Array.isArray(g.foes) ? g.foes.find((q) => q && q.m === o) : null;
    if (f) {
      boss = f.boss ? 1 : 0;
      big = f.big ? 1 : 0;
      const kd = String(f.kind || "");
      if (f.rbi != null) k = "rb" + f.rbi;
      else if (/^(rb|dkb)\d+$/.test(kd)) k = kd;
      else if (f.min && VO["m_" + f.min]) k = "m_" + f.min;
      else if (kd === "gloom") k = "g" + cl(f.t | 0 || 1, 1, 5);
      else k = kd;
    } else if (u.sfk) {
      const kd = u.sfk;
      k = kd === "gloom" ? "g" + cl(u.sft || 1, 1, 5) : kd;
      boss = /^(rb|dkb)\d+$/.test(kd) || (kd === "gloom" && u.sft >= 5) ? 1 : 0;
      big = u.sfb ? 1 : 0;
    } else return null;
    if (/^(rb|dkb)\d+$/.test(k)) boss = 1;
    const r = {
      k: VO[k] ? k : "g1",
      s: boss ? 0.8 : big ? 0.9 : 1,
      l: boss ? 1.3 : big ? 1.12 : 1,
      w: boss ? 0.35 : 0.12,
    };
    if (f) u.sfx = r;
    return r;
  }
  function voice(id, d, lenMul) {
    const p = VO[id.k] || VO.g1,
      f = p.f * id.s * (0.96 + RN() * 0.08),
      L = p.len * (lenMul || 1) * (id.s < 1 ? 1.3 : 1),
      lv = LV;
    LV = lv * id.l;
    try {
      VOX[p.v[0]] && VOX[p.v[0]](d, f, L, id.w);
      if (p.v[1] && VOX[p.v[1]]) VOX[p.v[1]](d + L * 0.25, f * (p.d2 || 1), L * 0.8, id.w);
    } finally {
      LV = lv;
    }
  }

  // ===================================================================================================================
  // ATTACKS: release (r) and impact (h) per effect group, coloured by element. pm = pitch from the foe's voice.
  // ===================================================================================================================
  const FX = {
    rake: "slash",
    emberhit: "slash",
    bite: "bite",
    jawtrap: "bite",
    bash: "heavy",
    pound: "heavy",
    boulder: "heavy",
    anvil: "anvil",
    belldrop: "bell",
    pillars: "quake",
    spikeline: "quake",
    twinspikes: "quake",
    magma: "quake",
    icering: "nova",
    bolt: "proj",
    fireball: "proj",
    flare: "proj",
    skybolt: "zap",
    spit: "spit",
    frostpuff: "puff",
    volley: "volley",
    spears: "volley",
    breath: "breath",
    flamewave: "breath",
    blizzard: "breath",
    gust: "gust",
    lavarain: "rain",
    icefall: "rain",
    meteor: "meteor",
    eclipse: "nova",
    nova: "nova",
    firecrash: "crash",
    icecrash: "crash",
    shadowcrash: "crash",
    drain: "drain",
    tendrils: "drain",
    fear: "fear",
    spores: "spores",
    thorns: "thorns",
    lashring: "lash",
    guard: "guard",
    mend: "heal",
    regrow: "heal",
    kindle: "buff",
    stoke: "buff",
    howl: "howl",
    summon: "summon",
  };
  // element splash on a hit
  function elHit(el, d, big, pm) {
    big = big || 0;
    const v = 1 + big * 0.5;
    if (el === "fire") {
      nz(d, 0.45 + big * 0.3, { ty: "lowpass", f0: 2200, f1: 300, q: 0.7, v: 0.3 * v, a: 0.01, wet: 0.2 });
      VOX.crackle(d + 0.03, 0, 0.35 + big * 0.2, 0);
    } else if (el === "ice") {
      [1, 1.47, 2.13, 3.05].forEach((m, i) =>
        tone(d + i * 0.012, 0.35, { ty: "sine", f0: 1700 * m * pm, v: 0.06 * v, a: 0.002, wet: 0.4 }),
      );
      nz(d, 0.18, { ty: "highpass", f0: 4000, f1: 2500, v: 0.22 * v });
    } else if (el === "storm") {
      tone(d, 0.16, { ty: "sawtooth", f0: 1400 * pm, f1: 140, lp: 5000, v: 0.14 * v });
      nz(d, 0.22, { ty: "highpass", f0: 2500, f1: 900, v: 0.28 * v, wet: 0.3 });
    } else if (el === "spirit") {
      tone(d, 0.5, { ty: "sine", f0: 420 * pm, f1: 110, vib: 18, vr: 9, v: 0.16 * v, wet: 0.5 });
      nz(d, 0.4, { f0: 900, f1: 300, q: 2, v: 0.14 * v, wet: 0.5 });
    } else if (el === "heal") {
      nz(d, 0.25, { f0: 3000, f1: 1500, q: 1.5, v: 0.14 * v });
      tone(d, 0.2, { ty: "triangle", f0: 260 * pm, f1: 120, v: 0.16 * v });
    }
    if (big) thud(d, pm, big);
  }
  function thud(d, pm, big) {
    big = big || 0;
    tone(d, 0.35 + big * 0.25, { ty: "sine", f0: 110 * pm, f1: 38, v: 0.4 + big * 0.15, a: 0.003 });
    nz(d, 0.25 + big * 0.2, { ty: "lowpass", f0: 900, f1: 120, v: 0.32 + big * 0.1, a: 0.003 });
  }
  function whoosh(d, pm, L, up) {
    nz(d, L || 0.18, { f0: (up ? 600 : 2400) * pm, f1: (up ? 2400 : 600) * pm, q: 1.4, v: 0.2, a: (L || 0.18) * 0.6 });
  }
  // charge hum for casts / area moves, by element
  function charge(el, d, pm, L) {
    const ty = { fire: "sawtooth", ice: "sine", storm: "square", spirit: "triangle", heal: "sine" }[el] || "triangle",
      f = { fire: 180, ice: 520, storm: 260, spirit: 140, heal: 330 }[el] || 200;
    tone(d, L, { ty, f0: f * pm, f1: f * pm * 2.4, lp: 2400, v: 0.08, a: L * 0.8, vib: 6, vr: 7, wet: 0.3 });
    if (el === "storm") nz(d, L, { ty: "highpass", f0: 3000, v: 0.05, a: L * 0.8, tr: 23 });
    if (el === "fire") nz(d, L, { ty: "lowpass", f0: 300, f1: 1400, v: 0.1, a: L * 0.8 });
  }
  const R = {
    slash: {
      r: (e, pm) => whoosh(0, pm, 0.14),
      h: (e, pm, b) => (nz(0, 0.09, { ty: "highpass", f0: 3500 * pm, f1: 1800, v: 0.3 }), elHit(e, 0.02, b, pm)),
    },
    bite: {
      r: (e, pm) => whoosh(0, pm, 0.12, 1),
      h: (e, pm, b) => {
        [0, 0.07].forEach((d) => {
          tone(d, 0.05, { ty: "square", f0: 260 * pm, f1: 90, lp: 1600, v: 0.18 });
          nz(d, 0.04, { f0: 2400, q: 2, v: 0.3 });
        });
        elHit(e, 0.05, b, pm);
      },
    },
    heavy: { r: (e, pm) => whoosh(0, pm * 0.5, 0.28, 1), h: (e, pm, b) => (thud(0, pm, 1 + b), elHit(e, 0.02, 0, pm)) },
    anvil: {
      r: (e, pm) => whoosh(0, pm * 0.5, 0.3, 1),
      h: (e, pm, b) => (thud(0, pm, 2), VOX.clank(0, 260 * pm, 0.9, 0.3), elHit(e, 0.03, 0, pm)),
    },
    bell: {
      r: (e, pm) => whoosh(0, pm * 0.4, 0.4),
      h: (e, pm, b) => (thud(0, pm, 1.5), VOX.chime(0, 180 * pm, 1.4, 0.4), VOX.clank(0, 140 * pm, 1.2, 0.4)),
    },
    quake: {
      r: (e, pm) => VOX.rumble(0, 50 * pm, 0.5, 0.1),
      h: (e, pm, b) => {
        thud(0, pm * 0.8, 2 + b);
        for (let i = 0; i < 5; i++) nz(0.05 + i * 0.07, 0.08, { ty: "lowpass", f0: 1400, f1: 300, v: 0.2 });
        elHit(e, 0.04, 0, pm);
      },
    },
    proj: {
      r: (e, pm) => (tone(0, 0.22, { ty: "triangle", f0: 300 * pm, f1: 900 * pm, v: 0.12 }), whoosh(0.02, pm, 0.3, 1)),
      h: (e, pm, b) => elHit(e, 0, b + 0.4, pm),
    },
    zap: {
      r: (e, pm) => charge("storm", 0, pm, 0.2),
      h: (e, pm, b) => (
        nz(0, 0.5, { ty: "highpass", f0: 1800, f1: 400, v: 0.4, wet: 0.5 }), thud(0.02, pm, 1), elHit("storm", 0, b, pm)
      ),
    },
    spit: {
      r: (e, pm) => (
        nz(0, 0.12, { f0: 1500 * pm, f1: 500, q: 3, v: 0.25 }),
        tone(0, 0.08, { ty: "sine", f0: 500 * pm, f1: 200, v: 0.12 })
      ),
      h: (e, pm, b) => (nz(0, 0.15, { ty: "lowpass", f0: 1200, f1: 300, q: 2, v: 0.28 }), elHit(e, 0.02, b, pm)),
    },
    puff: {
      r: (e, pm) => nz(0, 0.35, { f0: 2500, f1: 1000, q: 0.8, v: 0.2, a: 0.1 }),
      h: (e, pm, b) => elHit(e, 0, b, pm),
    },
    volley: {
      r: (e, pm) => {
        for (let i = 0; i < 5; i++) whoosh(i * 0.07, pm * (0.9 + RN() * 0.3), 0.12, 1);
      },
      h: (e, pm, b) => {
        for (let i = 0; i < 5; i++) nz(i * 0.06, 0.06, { ty: "highpass", f0: 2200 + RN() * 1500, v: 0.25 });
        elHit(e, 0.1, b, pm);
      },
    },
    breath: {
      r: (e, pm) => {
        const f = e === "fire" ? [900, 300] : e === "ice" ? [3500, 1500] : [1500, 600];
        nz(0, 0.9, {
          f0: f[0] * pm,
          f1: f[1] * pm,
          q: 0.6,
          v: 0.3,
          a: 0.15,
          tr: e === "fire" ? 12 : 0,
          trd: 0.4,
          wet: 0.25,
        });
        if (e === "fire") VOX.crackle(0.1, 0, 0.8, 0);
      },
      h: (e, pm, b) => elHit(e, 0, b, pm),
    },
    gust: {
      r: (e, pm) => (
        nz(0, 0.7, { f0: 400, f1: 1800, q: 1.2, v: 0.28, a: 0.25, wet: 0.2 }),
        nz(0.3, 0.5, { f0: 1800, f1: 500, q: 1.2, v: 0.2 })
      ),
      h: (e, pm, b) => elHit(e, 0, b, pm),
    },
    rain: {
      r: (e, pm) => charge(e, 0, pm, 0.3),
      h: (e, pm, b) => {
        for (let i = 0; i < 8; i++) {
          const d = i * 0.06 + RN() * 0.05;
          if (e === "ice") tone(d, 0.2, { ty: "sine", f0: 1800 + RN() * 1800, v: 0.06, wet: 0.3 });
          nz(d, 0.1, { ty: "lowpass", f0: 1600, f1: 300, v: 0.22 });
        }
        elHit(e, 0.2, b, pm);
      },
    },
    meteor: {
      r: (e, pm) => (nz(0, 0.7, { f0: 3000, f1: 300, q: 1, v: 0.3, a: 0.5 }), charge("fire", 0, pm, 0.5)),
      h: (e, pm, b) => (thud(0, pm * 0.7, 3), elHit(e, 0, 1, pm)),
    },
    nova: {
      r: (e, pm) => charge(e, 0, pm, 0.35),
      h: (e, pm, b) => (nz(0, 0.6, { f0: 300, f1: 2500, q: 0.8, v: 0.25, wet: 0.5 }), elHit(e, 0.02, b + 0.5, pm)),
    },
    crash: { r: (e, pm) => whoosh(0, pm, 0.25, 1), h: (e, pm, b) => (thud(0, pm, 1.5 + b), elHit(e, 0, 1, pm)) },
    drain: {
      r: (e, pm) => tone(0, 0.6, { ty: "sine", f0: 600 * pm, f1: 150 * pm, vib: 25, vr: 7, v: 0.12, a: 0.2, wet: 0.5 }),
      h: (e, pm, b) => {
        for (let i = 0; i < 3; i++) tone(i * 0.14, 0.12, { ty: "sine", f0: 160 * pm, f1: 90, v: 0.2, wet: 0.3 });
        nz(0, 0.5, { f0: 300, f1: 1200, q: 4, v: 0.12, wet: 0.5 });
      },
    },
    fear: {
      r: (e, pm) => (
        tone(0, 0.9, { ty: "sine", f0: 220 * pm, f1: 233 * pm, v: 0.12, a: 0.3, wet: 0.6 }),
        tone(0, 0.9, { ty: "sine", f0: 311 * pm, f1: 330 * pm, v: 0.1, a: 0.3, wet: 0.6 })
      ),
      h: (e, pm, b) => VOX.whisper(0, 700 * pm, 0.6, 0.3),
    },
    spores: {
      r: (e, pm) => {
        for (let i = 0; i < 6; i++) nz(i * 0.06, 0.1, { f0: 800 + RN() * 600, q: 2, v: 0.18 });
      },
      h: (e, pm, b) => nz(0, 0.6, { f0: 1200, f1: 400, q: 0.8, v: 0.18, a: 0.2, wet: 0.3 }),
    },
    thorns: {
      r: (e, pm) => nz(0, 0.25, { f0: 600, f1: 2000, q: 2, v: 0.2 }),
      h: (e, pm, b) => {
        for (let i = 0; i < 4; i++) nz(i * 0.05, 0.07, { f0: 2500 + RN() * 1500, q: 4, v: 0.28 });
        elHit(e, 0.1, b, pm);
      },
    },
    lash: {
      r: (e, pm) => whoosh(0, pm, 0.3, 1),
      h: (e, pm, b) => (
        nz(0, 0.05, { ty: "highpass", f0: 4000, v: 0.4 }),
        nz(0.02, 0.4, { f0: 1500, f1: 300, q: 1.5, v: 0.2 }),
        elHit(e, 0.03, b, pm)
      ),
    },
    guard: { r: (e, pm) => VOX.clank(0, 220 * pm, 0.5, 0.2), h: null },
    heal: { r: (e, pm) => VOX.chime(0, 520 * pm, 0.8, 0.3), h: null },
    buff: { r: (e, pm) => (charge(e, 0, pm, 0.5), VOX.crackle(0.1, 0, 0.4, 0)), h: null },
    howl: { r: null, h: null, howl: 1 }, // the foe's own voice, long
    summon: {
      r: (e, pm) => (charge("spirit", 0, pm, 0.6), VOX.chime(0.4, 300 * pm, 0.6, 0.4)),
      h: (e, pm) => thud(0, pm, 0.5),
    },
  };

  // ===================================================================================================================
  // HOOKS
  // ===================================================================================================================
  let cur = null; // { o, t } the foe model that last started a move pose
  const fresh = () => (cur && performance.now() - cur.t < 1500 ? cur.o : null),
    pmOf = (id) => (id ? cl(Math.pow(((VO[id.k] || VO.g1).f * id.s) / 200, 0.22), 0.6, 1.8) : 1);
  function safe(fn) {
    try {
      fn();
    } catch (e) {
      console.warn("foesfx", e);
    }
    LV = 1;
  }
  function wind(M, o) {
    if (!M || !ac()) return;
    const id = who(fresh());
    LV = o && o.par ? 0.35 : 1;
    const big = M.tg === "all" || (M.p || 0) >= 1.6;
    if (id) voice(id, 0, big ? 1.25 : 1);
    if (M.rng || M.tg === "all" || M.tg === "debuff" || M.tg === "summon" || M.tg === "heal")
      charge(M.el, id ? 0.1 : 0, pmOf(id), 0.4);
    else if (!id) whoosh(0, 1, 0.15, 1);
  }
  function release(M, o) {
    if (!M || !ac()) return null;
    const id = who(fresh()),
      pm = pmOf(id),
      rc = R[FX[M.fx]] || R.slash,
      lv = o && o.q ? 0.35 : 1;
    LV = lv;
    if (rc.howl && id) voice(id, 0, 2.2);
    else if (rc.r) rc.r(M.el, pm);
    const b = M.tg === "all" ? 0.6 : (M.p || 0) >= 1.6 ? 0.5 : 0;
    return rc.h ? () => safe(() => ((LV = lv), rc.h(M.el, pm, b * (id && id.s < 1 ? 1.4 : 1)))) : null;
  }
  (function hook() {
    if (typeof FMV === "undefined" || !FMV) return;
    const p0 = FMV.pose;
    FMV.pose = function (o, an, ph, ms) {
      if (o && an && an !== "hurt") cur = { o, t: performance.now() };
      return p0.apply(this, arguments);
    };
    const w0 = FMV.wind;
    FMV.wind = function (M, src, o) {
      safe(() => wind(M, o));
      return w0.apply(this, arguments);
    };
    const f0 = FMV.fx;
    FMV.fx = function (M, src, P, o) {
      let hit = null;
      safe(() => (hit = release(M, o)));
      const r = f0.apply(this, arguments);
      if (hit && r && r.then) r.then(hit, hit);
      return r;
    };
  })();
  if (typeof mkFoe === "function") {
    const mk0 = mkFoe;
    mkFoe = function (kind, t, big) {
      const o = mk0.apply(this, arguments);
      try {
        if (o && o.userData) {
          o.userData.sfk = String(kind);
          o.userData.sft = t | 0;
          o.userData.sfb = big ? 1 : 0;
        }
      } catch (e) {}
      return o;
    };
  }
  // console: FOESFX.test("wolf", "bite") plays a foe's wind-up and one of its moves
  function test(k, mv) {
    const id = { k: VO[k] ? k : "g1", s: /^(rb|dkb)/.test(k) ? 0.8 : 1, l: 1, w: 0.15 };
    if (!ac()) return "sound off";
    voice(id, 0, 1);
    const M = typeof FMV !== "undefined" && FMV.M[mv];
    if (M) {
      const tm = (VO[id.k].len || 0.5) * 1000 + 300;
      setTimeout(() => {
        cur = { o: { userData: { sfx: id } }, t: performance.now() };
        const h = release(M, {});
        if (h) setTimeout(h, 350);
      }, tm);
    }
    return id.k;
  }
  // used by 76-castsfx.js: the synth pieces, the context (null when sound is off) and the level of the next sounds
  const ctx = () => (ac() ? { AC, OUT, VB } : null),
    lv = (v) => (LV = v == null ? 1 : v);
  return { VO, VOX, FX, R, who, test, voice, nz, tone, elHit, thud, whoosh, charge, ctx, lv };
})();
