// DUSKWICK - 35-music.js (v27): procedural background music made with WebAudio (no audio files, original tunes).
// Only top-level name: MUS. One mood per place (zoneAt: hub/frost/ember/marsh/tower/dun; zone streets use their zone)
// plus battle and boss. Moods crossfade (each has its own bus). Notes are scheduled a little ahead by a timer
// (lookahead), the state is polled every 0.5 s, and the AudioContext is suspended while muted or the tab is hidden.
// Settings: localStorage "duskwick_music" = {v: volume 0..1, m: muted, t: title theme, w: victory theme}. Shown in
// Book > Options > Game. v28: title screen themes (TTH) and victory jingles (VJ), both picked there.
const MUS = (() => {
  const KEY = "duskwick_music";
  const st = { v: 0.6, m: 0, t: "lamp", w: "fanfare" };
  try {
    Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch (e) {}
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: st.v, m: st.m, t: st.t, w: st.w }));
    } catch (e) {}
  };

  // ---- scales, instruments, moods ----
  const SC = {
    aeo: [0, 2, 3, 5, 7, 8, 10],
    dor: [0, 2, 3, 5, 7, 9, 10],
    phr: [0, 1, 3, 5, 7, 8, 10],
    hmi: [0, 2, 3, 5, 7, 8, 11],
    ion: [0, 2, 4, 5, 7, 9, 11],
    lyd: [0, 2, 4, 6, 7, 9, 11],
  };
  // lead voices: w = wave, g = level, a = attack, dec = pluck decay (else sustain + rel), cut = lowpass, f2/g2 = partial
  // v28b (less robotic): fenv = filter opens this many times wider on the attack and settles over ft s, uni = a second
  // copy detuned by this many cents (chorus), vib = delayed vibrato depth in cents, scoop = slide up into the note
  // from this many cents below, br = breath noise level on the attack
  const LEAD = {
    box: { w: "triangle", g: 0.12, a: 0.004, dec: 0.45, f2: 4, g2: 0.1 },
    bell: { w: "sine", g: 0.11, a: 0.004, dec: 0.9, f2: 2.76, g2: 0.3 },
    reed: { w: "square", g: 0.05, a: 0.05, rel: 0.18, cut: 1000, fenv: 1.8, ft: 0.15, vib: 12, scoop: 30 },
    flute: { w: "sine", g: 0.12, a: 0.08, rel: 0.3, f2: 2, g2: 0.08, vib: 14, scoop: 20, br: 0.025 },
    sq: { w: "square", g: 0.045, a: 0.006, rel: 0.07, cut: 1500, fenv: 2.2, ft: 0.1, uni: 8, vib: 8 },
    saw: { w: "sawtooth", g: 0.045, a: 0.006, rel: 0.09, cut: 1400, fenv: 2.4, ft: 0.1, uni: 10, vib: 8 },
    brass: { w: "sawtooth", g: 0.065, a: 0.035, rel: 0.28, cut: 800, fenv: 3.2, ft: 0.18, uni: 9, vib: 16, scoop: 45 },
    harp: { w: "triangle", g: 0.08, a: 0.003, dec: 0.75, f2: 2, g2: 0.18 },
  };
  // bpm, bar = 8th-note steps per bar, root = pad MIDI root (bass an octave down, lead lo semitones above root+12),
  // prog = chord (scale degree) per bar, dens = chance of a lead note per step, bass: x root, f fifth, o octave, . rest,
  // perc: k kick, s snare, h hat, t tick; sp = occasional sound; echo = delay in steps, fb = echo feedback
  const MOODS = {
    hub: {
      bpm: 88,
      bar: 6,
      root: 50,
      sc: "aeo",
      prog: [0, 5, 2, 6],
      dens: 0.34,
      lead: "box",
      lo: 0,
      pad: { w: "sawtooth", cut: 800, g: 0.04, det: 6 },
      bass: "x..f..",
      bI: { w: "triangle", g: 0.13 },
      perc: { t: "x....." },
      echo: 3,
      fb: 0.3,
    },
    frost: {
      bpm: 64,
      bar: 8,
      root: 52,
      sc: "dor",
      prog: [0, 2, 6, 3],
      dens: 0.22,
      lead: "bell",
      lo: 12,
      pad: { w: "triangle", cut: 2000, g: 0.05, det: 4 },
      bass: "x.......",
      bI: { w: "sine", g: 0.14 },
      sp: "spark",
      echo: 3,
      fb: 0.45,
    },
    ember: {
      bpm: 72,
      bar: 8,
      root: 45,
      sc: "phr",
      prog: [0, 1, 0, 6],
      dens: 0.3,
      lead: "reed",
      lo: 12,
      pad: { w: "sawtooth", cut: 600, g: 0.04, det: 8 },
      bass: "x...x.f.",
      bI: { w: "sawtooth", g: 0.08, cut: 400 },
      perc: { k: "x......." },
      kg: 0.25,
      echo: 2,
      fb: 0.25,
    },
    marsh: {
      bpm: 76,
      bar: 6,
      root: 48,
      sc: "hmi",
      prog: [0, 5, 3, 4],
      dens: 0.28,
      lead: "flute",
      lo: 0,
      pad: { w: "triangle", cut: 1400, g: 0.05, det: 14 },
      bass: "x..o..",
      bI: { w: "triangle", g: 0.13 },
      sp: "frog",
      echo: 3,
      fb: 0.35,
    },
    tower: {
      bpm: 58,
      bar: 8,
      root: 47,
      sc: "hmi",
      prog: [0, 3, 5, 4],
      dens: 0.18,
      lead: "flute",
      lo: 0,
      pad: { w: "square", cut: 500, g: 0.035, det: 5 },
      bass: "x.......",
      bI: { w: "sine", g: 0.15 },
      sp: "toll",
      echo: 4,
      fb: 0.4,
    },
    dun: {
      bpm: 60,
      bar: 8,
      root: 42,
      sc: "aeo",
      prog: [0, 5, 0, 4],
      dens: 0.12,
      lead: "bell",
      lo: 12,
      pad: { w: "sawtooth", cut: 420, g: 0.045, det: 9 },
      bass: "x.......",
      bI: { w: "triangle", g: 0.14 },
      sp: "drip",
      echo: 3,
      fb: 0.5,
    },
    battle: {
      bpm: 136,
      bar: 8,
      root: 45,
      sc: "aeo",
      prog: [0, 5, 6, 4],
      dens: 0.5,
      lead: "sq",
      lo: 0,
      fast: 1,
      pad: { w: "sawtooth", cut: 1200, g: 0.025, det: 7 },
      bass: "xoxoxoxo",
      bI: { w: "sawtooth", g: 0.07, cut: 600 },
      perc: { k: "x...x...", s: "..x...x.", h: "xxxxxxxx" },
      kg: 0.45,
      echo: 3,
      fb: 0.2,
    },
    boss: {
      bpm: 148,
      bar: 8,
      root: 50,
      sc: "hmi",
      prog: [0, 5, 3, 4],
      dens: 0.55,
      lead: "saw",
      lo: 0,
      fast: 1,
      pad: { w: "sawtooth", cut: 1000, g: 0.03, det: 10 },
      bass: "xxoxxxox",
      bI: { w: "sawtooth", g: 0.08, cut: 500 },
      perc: { k: "x..x.x..", s: "..x...x.", h: "x.x.x.x." },
      kg: 0.5,
      sp: "toll",
      echo: 3,
      fb: 0.2,
    },
    // v28 title screen themes
    tlamp: {
      bpm: 96,
      bar: 6,
      root: 53,
      sc: "ion",
      prog: [0, 3, 4, 0, 5, 3, 1, 4],
      dens: 0.36,
      lead: "box",
      lo: 0,
      pad: { w: "triangle", cut: 1600, g: 0.045, det: 6 },
      bass: "x..f..",
      bI: { w: "triangle", g: 0.13 },
      perc: { t: "x..x.." },
      echo: 3,
      fb: 0.3,
    },
    tnoct: {
      bpm: 66,
      bar: 8,
      root: 50,
      sc: "aeo",
      prog: [0, 5, 3, 4],
      dens: 0.24,
      lead: "flute",
      lo: 0,
      pad: { w: "sawtooth", cut: 700, g: 0.04, det: 9 },
      bass: "x...f...",
      bI: { w: "sine", g: 0.15 },
      echo: 4,
      fb: 0.45,
    },
    tstar: {
      bpm: 80,
      bar: 8,
      root: 55,
      sc: "lyd",
      prog: [0, 1, 5, 4],
      dens: 0.3,
      lead: "bell",
      lo: 12,
      pad: { w: "triangle", cut: 2200, g: 0.05, det: 5 },
      bass: "x.......",
      bI: { w: "sine", g: 0.14 },
      sp: "spark",
      echo: 3,
      fb: 0.45,
    },
    // v29 prologue score: one mood per chapter of the story, following the shots (see introMood). now = the melody
    // starts at once (shots are short)
    idawn: {
      bpm: 76,
      bar: 6,
      root: 53,
      sc: "ion",
      prog: [0, 3, 4, 0],
      dens: 0.3,
      lead: "box",
      lo: 0,
      now: 1,
      pad: { w: "triangle", cut: 1800, g: 0.045, det: 5 },
      bass: "x..f..",
      bI: { w: "triangle", g: 0.12 },
      sp: "spark",
      echo: 3,
      fb: 0.35,
      rv: 0.4,
    },
    ilore: {
      bpm: 72,
      bar: 6,
      root: 50,
      sc: "aeo",
      prog: [0, 5, 6, 4],
      dens: 0.3,
      lead: "flute",
      lo: 0,
      now: 1,
      pad: { w: "triangle", cut: 1200, g: 0.045, det: 8 },
      bass: "x..f..",
      bI: { w: "triangle", g: 0.12 },
      echo: 3,
      fb: 0.4,
      rv: 0.42,
    },
    // the gloom creeps in: a low, slowly beating drone (minor chord rubbing against the one a half step up), tolls
    igloom: {
      bpm: 50,
      bar: 8,
      root: 38,
      sc: "phr",
      prog: [0, 1, 0, 1],
      dens: 0.08,
      lead: "bell",
      lo: 12,
      now: 1,
      pad: { w: "sawtooth", cut: 350, g: 0.06, det: 18 },
      bass: "x.......",
      bI: { w: "sine", g: 0.16 },
      sp: "toll",
      echo: 4,
      fb: 0.5,
      rv: 0.5,
    },
    // the gloomlings come out: a crooked little music-box waltz, out of tune with itself, plucked bass
    icreep: {
      bpm: 108,
      bar: 6,
      root: 45,
      sc: "hmi",
      prog: [0, 4, 5, 4],
      dens: 0.45,
      lead: "box",
      lo: 12,
      now: 1,
      pad: { w: "triangle", cut: 900, g: 0.04, det: 24 },
      bass: "x.fx.f",
      bI: { w: "triangle", g: 0.11 },
      perc: { t: "x..x.." },
      sp: "drip",
      echo: 3,
      fb: 0.35,
      rv: 0.4,
    },
    // the First Lamp: hope coming back, a warm hymn that swells
    ihope: {
      bpm: 70,
      bar: 8,
      root: 53,
      sc: "ion",
      prog: [0, 4, 5, 3],
      dens: 0.32,
      lead: "flute",
      lo: 0,
      now: 1,
      pad: { w: "sawtooth", cut: 1400, g: 0.045, det: 7 },
      bass: "x...f...",
      bI: { w: "sine", g: 0.14 },
      sp: "spark",
      echo: 3,
      fb: 0.4,
      rv: 0.42,
    },
    // v29 the Primer: Oona's lesson in the Lamplighters' Vault (the practice fight and its cutscene). Light and curious
    prac: {
      bpm: 104,
      bar: 8,
      root: 53,
      sc: "ion",
      prog: [0, 5, 3, 4],
      dens: 0.4,
      lead: "box",
      lo: 0,
      now: 1,
      pad: { w: "triangle", cut: 1600, g: 0.04, det: 6 },
      bass: "x.o.x.o.",
      bI: { w: "triangle", g: 0.11 },
      perc: { t: "..x...x." },
      echo: 3,
      fb: 0.3,
      rv: 0.3,
    },
  };
  // v28b feel: sw = swing (off-beat 8ths land this part of a step late), rv = reverb send (default 0.32)
  Object.entries({ hub: 0.1, marsh: 0.12, tlamp: 0.08, ember: 0.05, tnoct: 0.04, frost: 0.03, dun: 0.03 }).forEach(
    ([k, v]) => (MOODS[k].sw = v),
  );
  MOODS.battle.rv = MOODS.boss.rv = 0.14;
  MOODS.icreep.sw = 0.14;
  MOODS.prac.sw = 0.12;
  // v28 choices (Book > Options > Game): title theme -> mood ("" = silence), victory jingles as [semitones above C4,
  // start step, length in steps, loudness] played on lead voice `i` at `sd` seconds a step. v28b: `hm` = a quieter
  // harmony line, `rit` = how much the last steps slow down, `ch` = closing chord (semitones above C3), strummed on a
  // harp over a soft pad, with a few twinkles after; `drum` = timpani roll leading in
  const TTH = {
    lamp: ["Lamplight Waltz", "tlamp"],
    noct: ["Dusk Nocturne", "tnoct"],
    star: ["Starfall", "tstar"],
    town: ["Town tune", "hub"],
    off: ["Silence", ""],
  };
  const VJ = {
    fanfare: {
      n: "Lamplighter's Fanfare",
      i: "brass",
      sd: 0.13,
      rit: 0.6,
      ch: [0, 7, 12, 16, 19],
      notes: [
        [7, 0, 1, 0.75],
        [7, 1, 1, 0.7],
        [7, 2, 1, 0.8],
        [12, 3, 3, 1.05],
        [9, 6, 1, 0.8],
        [11, 7, 1, 0.85],
        [12, 8, 8, 1.1],
      ],
      hm: [
        [4, 0, 1],
        [4, 1, 1],
        [4, 2, 1],
        [7, 3, 3],
        [5, 6, 1],
        [7, 7, 1],
        [4, 8, 8],
      ],
    },
    chimes: {
      n: "Starlit Chimes",
      i: "bell",
      sd: 0.14,
      rit: 0.5,
      ch: [0, 7, 12, 16, 19],
      notes: [
        [24, 0, 1, 0.7],
        [19, 1, 1, 0.6],
        [16, 2, 1, 0.65],
        [12, 3, 1, 0.6],
        [14, 4, 1, 0.7],
        [16, 5, 1, 0.75],
        [19, 6, 2, 0.85],
        [21, 8, 1, 0.7],
        [19, 9, 1, 0.75],
        [24, 10, 6, 1],
      ],
      hm: [
        [16, 6, 2],
        [12, 10, 6],
      ],
    },
    hearth: {
      n: "Hearth Song",
      i: "flute",
      sd: 0.18,
      rit: 0.7,
      ch: [-12, -5, 0, 4, 7],
      notes: [
        [7, 0, 2, 0.75],
        [9, 2, 1, 0.7],
        [11, 3, 1, 0.75],
        [12, 4, 3, 0.95],
        [16, 7, 1, 0.8],
        [14, 8, 1, 0.75],
        [11, 9, 1, 0.7],
        [12, 10, 6, 1],
      ],
      hm: [
        [4, 4, 3],
        [7, 7, 3],
        [4, 10, 6],
      ],
    },
    drums: {
      n: "War Drums",
      i: "brass",
      sd: 0.11,
      rit: 0.4,
      ch: [0, 7, 12, 19],
      drum: 1,
      notes: [
        [0, 4, 1, 0.8],
        [0, 5, 1, 0.85],
        [7, 6, 2, 0.95],
        [12, 8, 8, 1.1],
      ],
      hm: [
        [-5, 4, 1],
        [-5, 5, 1],
        [4, 6, 2],
        [7, 8, 8],
      ],
    },
    off: { n: "Silence", notes: [] },
  };
  if (!TTH[st.t]) st.t = "lamp";
  if (!VJ[st.w]) st.w = "fanfare";

  // ---- audio graph ----
  let ac = null,
    master = null,
    noise = null,
    rv = null, // v28b: shared reverb (a convolver every bus sends to)
    cur = null, // the playing bus
    tickI = 0,
    pend = "",
    pendN = 0;
  const vg = (v) => v * v * 0.6; // slider -> gain (quieter low end)
  const on = () => !st.m && st.v > 0.001;
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rng = (s) => () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const deg = (M, d) => Math.floor(d / 7) * 12 + SC[M.sc][((d % 7) + 7) % 7];

  function build() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0;
    const cp = ac.createDynamicsCompressor();
    cp.threshold.value = -16;
    cp.ratio.value = 4;
    master.connect(cp);
    cp.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    const r = rng(7);
    for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
    // v28b reverb: a 2.6 s stereo tail of noise that fades and darkens, like a stone hall
    const n = Math.floor(ac.sampleRate * 2.6),
      ir = ac.createBuffer(2, n, ac.sampleRate),
      r2 = rng(9);
    for (let c = 0; c < 2; c++) {
      const x = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const k = i / n;
        lp += (r2() * 2 - 1 - lp) * (0.9 - 0.75 * k);
        x[i] = lp * Math.pow(1 - k, 2.5);
      }
    }
    rv = ac.createConvolver();
    rv.buffer = ir;
    rv.connect(master);
  }
  // route node into dest through a stereo panner (p = -1 left .. 1 right) where the browser has one
  function pn(node, p, dest) {
    if (p && ac.createStereoPanner) {
      const s = ac.createStereoPanner();
      s.pan.value = Math.max(-1, Math.min(1, p));
      node.connect(s);
      s.connect(dest);
    } else node.connect(dest);
  }

  // a melody phrase over the whole progression: sparse array indexed bar*steps+step -> scale degree
  function gen(M, seed) {
    const r = rng(seed),
      bar = M.bar,
      P = M.prog.length,
      half = bar / 2,
      ph = [];
    let prev = 2 + Math.floor(r() * 3);
    for (let b = 0; b < P; b++) {
      const ch = M.prog[b];
      for (let s = 0; s < bar; s++) {
        const i = b * bar + s,
          strong = s % half === 0;
        if (b === P - 1 && s >= half) {
          if (s === half) ph[i] = prev > 4 ? 7 : 0; // cadence home
          continue;
        }
        if (r() > (strong ? M.dens + 0.35 : M.dens * (s % 2 ? 0.7 : 1.1))) continue;
        let d;
        if (strong) {
          const c = [ch, ch + 2, ch + 4, ch + 7, ch + 9, ch + 11, ch - 3, ch - 5]
            .filter((x) => x >= 0 && x <= 11)
            .sort((a, b2) => Math.abs(a - prev) - Math.abs(b2 - prev));
          d = c[r() < 0.25 && c.length > 1 ? 1 : 0];
        } else d = prev + [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)];
        prev = d = Math.max(0, Math.min(11, d));
        ph[i] = d;
      }
    }
    return ph;
  }

  function newBus(name) {
    const M = MOODS[name],
      sd = 30 / M.bpm, // one 8th note
      inp = ac.createGain(),
      out = ac.createGain(),
      dl = ac.createDelay(2),
      fb = ac.createGain(),
      lp = ac.createBiquadFilter(),
      wet = ac.createGain(),
      sg = ac.createGain();
    dl.delayTime.value = Math.min(1.9, M.echo * sd);
    fb.gain.value = M.fb;
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    wet.gain.value = 0.25;
    sg.gain.value = M.rv == null ? 0.32 : M.rv;
    out.connect(sg);
    sg.connect(rv);
    inp.connect(out);
    inp.connect(dl);
    dl.connect(lp);
    lp.connect(fb);
    fb.connect(dl);
    lp.connect(wet);
    wet.connect(out);
    out.connect(master);
    out.gain.value = 0;
    const seed = name.length * 977 + name.charCodeAt(0) * 31;
    return {
      name,
      M,
      sd,
      inp,
      out,
      nodes: [inp, out, dl, fb, lp, wet, sg],
      t: ac.currentTime + 0.08,
      n: 0,
      seed,
      A: gen(M, seed),
      B: gen(M, seed + 1),
      r: rng(seed + 5),
    };
  }

  // one note. g = peak level (loudness; defaults to I.g), pan = stereo place
  function tone(B, t, f, dur, I, g, pan) {
    const o = ac.createOscillator(),
      gn = ac.createGain(),
      a = I.a || 0.01,
      pk = g == null ? I.g : g,
      os = [o], // every oscillator of this note
      base = [0]; // and its resting detune
    o.type = I.w;
    o.frequency.value = f;
    let head = gn;
    if (I.cut) {
      // louder notes are brighter; fenv makes the attack bloom then settle
      const fl = ac.createBiquadFilter(),
        c = I.cut * (0.75 + 0.35 * Math.min(1.3, pk / I.g));
      fl.type = "lowpass";
      fl.frequency.setValueAtTime(c * (I.fenv || 1), t);
      if (I.fenv) fl.frequency.setTargetAtTime(c, t + a, I.ft || 0.12);
      fl.connect(gn);
      head = fl;
    }
    o.connect(head);
    if (I.uni) {
      const u = ac.createOscillator(),
        h = ac.createGain();
      u.type = I.w;
      u.frequency.value = f;
      u.detune.value = I.uni;
      h.gain.value = 0.6;
      u.connect(h);
      h.connect(head);
      os.push(u);
      base.push(I.uni);
    }
    if (I.f2) {
      const o2 = ac.createOscillator(),
        g2 = ac.createGain();
      o2.frequency.value = f * I.f2;
      g2.gain.value = I.g2;
      o2.connect(g2);
      g2.connect(head);
      os.push(o2);
      base.push(0);
    }
    pn(gn, pan || 0, B.inp);
    if (I.scoop)
      os.forEach((x, i) => {
        x.detune.setValueAtTime(base[i] - I.scoop, t);
        x.detune.linearRampToValueAtTime(base[i], t + 0.06);
      });
    if (I.vib && dur > 0.25) {
      // vibrato creeps in once the note is held, like a singer or a horn player
      const l = ac.createOscillator(),
        lg = ac.createGain();
      l.frequency.value = 4.8 + Math.random() * 0.8;
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(0, t + 0.18);
      lg.gain.linearRampToValueAtTime(I.vib, t + 0.5);
      l.connect(lg);
      os.forEach((x) => lg.connect(x.detune));
      os.push(l);
    }
    if (I.br) hit(B, t, 2200, "bandpass", 0.09, (I.br * pk) / I.g);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(pk, t + a);
    let end;
    if (I.dec) {
      gn.gain.setTargetAtTime(0, t + a, I.dec);
      end = t + a + I.dec * 6;
    } else {
      const h = Math.max(a, dur),
        rel = I.rel || 0.08;
      gn.gain.setTargetAtTime(0, t + h, rel);
      end = t + h + rel * 6;
    }
    os.forEach((x) => {
      x.start(t);
      x.stop(end);
    });
  }

  // a soft held chord: MIDI notes ms, spread left to right, slightly out of tune with each other like real players
  function chord(B, t, ms, len, P, atk, g) {
    const fl = ac.createBiquadFilter(),
      gn = ac.createGain(),
      end = t + len * 2.6;
    fl.type = "lowpass";
    fl.frequency.setValueAtTime(P.cut * 0.5, t);
    fl.frequency.linearRampToValueAtTime(P.cut, t + len * 0.6);
    fl.connect(gn);
    gn.connect(B.inp);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(g == null ? P.g : g, t + len * atk);
    gn.gain.setTargetAtTime(0, t + len, Math.max(0.3, len * 0.25));
    ms.forEach((m, i) => {
      const o = ac.createOscillator();
      o.type = P.w;
      o.frequency.value = mf(m);
      o.detune.value = (i - 1) * P.det + (Math.random() - 0.5) * 6;
      pn(o, (i / Math.max(1, ms.length - 1) - 0.5) * 0.7, fl);
      o.start(t);
      o.stop(end);
    });
  }
  // the bar's pad chord, each note moved by octaves to sit near the middle (smooth voice leading, no big jumps)
  function pad(B, t, ch, len) {
    const M = B.M,
      c = M.root + 5;
    chord(
      B,
      t,
      [0, 2, 4].map((k) => {
        let m = M.root + deg(M, ch + k);
        while (m - c > 6) m -= 12;
        while (c - m > 6) m += 12;
        return m;
      }),
      len,
      M.pad,
      0.35,
    );
  }

  function hit(B, t, f, type, dec, g) {
    // noise drum: bandpass/highpass filtered burst
    const s = ac.createBufferSource(),
      fl = ac.createBiquadFilter(),
      gn = ac.createGain();
    s.buffer = noise;
    fl.type = type;
    fl.frequency.value = f;
    s.connect(fl);
    fl.connect(gn);
    gn.connect(B.inp);
    gn.gain.setValueAtTime(g, t);
    gn.gain.exponentialRampToValueAtTime(0.0005, t + dec);
    s.start(t, B.r() * 0.5);
    s.stop(t + dec + 0.02);
  }

  function sweep(B, t, w, f0, f1, ft, dec, g) {
    // pitched blip that glides f0 -> f1 (kick, drip, frog)
    const o = ac.createOscillator(),
      gn = ac.createGain();
    o.type = w;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + ft);
    o.connect(gn);
    gn.connect(B.inp);
    gn.gain.setValueAtTime(g, t);
    gn.gain.exponentialRampToValueAtTime(0.0005, t + dec);
    o.start(t);
    o.stop(t + dec + 0.02);
  }

  function step(B, t) {
    const M = B.M,
      bar = M.bar,
      n = B.n,
      s = n % bar,
      bi = Math.floor(n / bar),
      P = M.prog.length,
      sec = Math.floor(bi / P) % 4, // form A A B A
      b = bi % P,
      loop = Math.floor(bi / (P * 4)),
      ch = M.prog[b],
      sd = B.sd,
      r = B.r,
      // v28b humanizing: swing on off-beats, a few ms of looseness, louder strong beats, a swell through each phrase
      sw = s % 2 ? (M.sw || 0) * sd : 0,
      hu = () => (r() - 0.5) * (M.fast ? 0.01 : 0.022),
      arc = 0.9 + 0.12 * Math.sin((Math.PI * (b * bar + s)) / (P * bar));
    if (s === 0 && b === 0 && sec === 0 && loop > 0) B.B = gen(M, B.seed + loop * 7 + 1); // a fresh B part each loop
    if (s === 0) pad(B, t + Math.abs(hu()), ch, bar * sd);
    // bass
    const bc = M.bass[s];
    if (bc && bc !== ".") {
      let l = 1;
      while (s + l < bar && M.bass[s + l] === ".") l++;
      const m = M.root - 12 + deg(M, ch + (bc === "f" ? 4 : 0)) + (bc === "o" ? 12 : 0);
      tone(B, t + sw + hu() * 0.5, mf(m), l * sd * 0.95, M.bI, M.bI.g * (s === 0 ? 1 : 0.8) * (0.9 + r() * 0.15));
    }
    // lead (the calm moods open with a few bars of pads only)
    if (M.fast || M.now || loop > 0 || sec > 0) {
      const ph = sec === 2 ? B.B : B.A,
        d = ph[b * bar + s];
      if (d != null) {
        let l = 1;
        while (l < 4 && s + l < bar && ph[b * bar + s + l] == null) l++;
        const I = LEAD[M.lead],
          v = (s % (bar / 2) === 0 ? 1 : 0.78) * (0.85 + r() * 0.25) * arc;
        // sustained voices play legato (each note runs into the next); plucked ones ring on their own
        tone(
          B,
          t + sw + hu(),
          mf(M.root + 12 + M.lo + deg(M, d)),
          l * sd * (I.dec ? 0.92 : 1.02),
          I,
          I.g * v,
          (r() - 0.5) * 0.3,
        );
      }
    }
    // percussion
    const pc = M.perc || {};
    if (pc.k && pc.k[s] === "x") sweep(B, t + hu() * 0.3, "sine", 140, 42, 0.12, 0.3, (M.kg || 0.4) * (s ? 0.85 : 1));
    if (pc.s && pc.s[s] === "x") hit(B, t + hu() * 0.4, 1800, "bandpass", 0.13, 0.22 * (0.85 + r() * 0.3));
    else if (pc.s && s % 2 && r() < 0.12) hit(B, t + sw, 1800, "bandpass", 0.08, 0.05); // ghost note
    if (pc.h && pc.h[s] === "x") hit(B, t + sw, 7000, "highpass", 0.035, (s % 2 ? 0.03 : 0.055) * (0.7 + r() * 0.6));
    if (pc.t && pc.t[s] === "x") sweep(B, t + sw, "triangle", 950, 900, 0.02, 0.05, 0.05 * (0.7 + r() * 0.5));
    // occasional sounds
    if (s === 0 && M.sp) {
      const r = B.r,
        at = t + Math.floor(r() * bar) * sd;
      if (M.sp === "spark" && r() < 0.6)
        tone(B, at, mf(M.root + 24 + deg(M, Math.floor(r() * 7))), sd, LEAD.bell, 0.035);
      else if (M.sp === "drip" && r() < 0.5) sweep(B, at, "sine", 1700 + r() * 500, 800, 0.07, 0.12, 0.05);
      else if (M.sp === "frog" && r() < 0.35) {
        sweep(B, at, "square", 95, 150, 0.09, 0.12, 0.025);
        sweep(B, at + 0.18, "square", 95, 150, 0.09, 0.12, 0.02);
      } else if (M.sp === "toll" && b % 2 === 0)
        tone(B, t, mf(M.root - 12), bar * sd, { w: "sine", g: 0.12, a: 0.005, dec: 1.6, f2: 2.76, g2: 0.25 });
    }
  }

  function tick() {
    if (!ac || !cur || ac.state !== "running") return;
    const now = ac.currentTime;
    if (cur.t < now - 0.2) cur.t = now + 0.05; // timer was starved: skip ahead instead of a burst of notes
    while (cur.t < now + 0.45) {
      step(cur, cur.t);
      cur.t += cur.sd;
      cur.n++;
    }
  }

  function switchTo(name) {
    if (!ac || (cur && cur.name === name)) return;
    const now = ac.currentTime,
      fade = name === "battle" || name === "boss" ? 0.9 : 2.5,
      old = cur;
    if (old) {
      old.out.gain.cancelScheduledValues(now);
      old.out.gain.setValueAtTime(old.out.gain.value, now);
      old.out.gain.setTargetAtTime(0, now, fade / 3);
      setTimeout(() => old.nodes.forEach((x) => x.disconnect()), fade * 1000 + 4000);
    }
    cur = newBus(name);
    cur.out.gain.setValueAtTime(0, now);
    cur.out.gain.setTargetAtTime(1, now, fade / 3);
  }
  // v28: fade the playing tune out to silence (title theme "Silence", and while a victory jingle plays)
  function fadeOut(fade) {
    if (!ac || !cur) return;
    const now = ac.currentTime,
      old = cur;
    cur = null;
    old.out.gain.cancelScheduledValues(now);
    old.out.gain.setValueAtTime(old.out.gain.value, now);
    old.out.gain.setTargetAtTime(0, now, fade / 3);
    setTimeout(() => old.nodes.forEach((x) => x.disconnect()), fade * 1000 + 4000);
  }

  // ---- v28 victory jingles: a one-shot on its own little bus (echo included) ----
  let holdUntil = 0, // no tune until then (the jingle has the stage)
    prevT = "", // a title theme being previewed from the Options page ...
    prevUntil = 0; // ... until then
  function jingle(key) {
    const J = VJ[key];
    if (!J || !J.notes.length || !ac || !on() || ac.state !== "running") return 0;
    const t0 = ac.currentTime + 0.12,
      inp = ac.createGain(),
      dl = ac.createDelay(1),
      fb = ac.createGain(),
      out = ac.createGain(),
      sg = ac.createGain();
    dl.delayTime.value = J.sd * 3;
    fb.gain.value = 0.2;
    inp.connect(out);
    inp.connect(dl);
    dl.connect(fb);
    fb.connect(dl);
    fb.connect(out);
    out.gain.value = 1.4;
    out.connect(master);
    sg.gain.value = 0.45; // plenty of hall: it should ring out
    out.connect(sg);
    sg.connect(rv);
    const B = { inp, r: rng(11) },
      I = LEAD[J.i],
      sd = J.sd,
      last = Math.max(...J.notes.map(([, s, l]) => s + l)),
      rit = J.rit || 0.5,
      tAt = (s) => t0 + sd * (s + (rit * s * s) / (2 * last)), // steps stretch towards the end (ritardando)
      hu = () => (Math.random() - 0.5) * 0.016,
      cs = J.notes[J.notes.length - 1][1],
      tc = tAt(cs),
      tEnd = tAt(last);
    J.notes.forEach(([n, s, l, v]) =>
      tone(B, tAt(s) + hu(), mf(60 + n), (tAt(s + l) - tAt(s)) * 0.97, I, I.g * (v || 0.85), 0.08),
    );
    (J.hm || []).forEach(([n, s, l]) =>
      tone(B, tAt(s) + hu(), mf(60 + n), (tAt(s + l) - tAt(s)) * 0.97, I, I.g * 0.42, -0.22),
    );
    // closing chord: strummed upwards on a harp, a soft pad swelling under it, then a few twinkles drifting down
    const ch = J.ch || [];
    ch.forEach((n, k) =>
      tone(
        B,
        tc + 0.035 * k + hu(),
        mf(48 + n),
        1,
        LEAD.harp,
        0.07 * (0.8 + (0.3 * k) / ch.length),
        (k / ch.length - 0.5) * 0.8,
      ),
    );
    if (ch.length)
      chord(
        B,
        tc - 0.05,
        ch.slice(0, 3).map((n) => 48 + n),
        tEnd - tc + 0.6,
        { w: "triangle", cut: 1600, det: 7 },
        0.3,
        0.05,
      );
    [0.5, 0.78, 1.1].forEach((d, k) =>
      tone(
        B,
        tEnd - 0.4 + d,
        mf(72 + (ch.length > k ? ch[ch.length - 1 - k] : 12)),
        0.5,
        LEAD.bell,
        0.03 - k * 0.006,
        0.4 - k * 0.4,
      ),
    );
    // timpani: a roll that grows into the last note (War Drums) or one soft stroke under the chord
    const timp = (t, gl) => {
      sweep(B, t, "sine", 105, 68, 0.25, 0.9, gl);
      hit(B, t, 400, "lowpass", 0.25, gl * 0.25);
    };
    if (J.drum) for (let k = 0; k < 8; k++) timp(tAt(k * 0.5) + hu(), 0.08 + k * 0.03);
    timp(tc, J.drum ? 0.4 : 0.25);
    const len = tEnd - t0 + 1.8;
    setTimeout(() => [inp, dl, fb, out, sg].forEach((x) => x.disconnect()), len * 1000 + 3000);
    return len;
  }
  function victory() {
    if (!ac || !on() || st.w === "off") return;
    fadeOut(0.35);
    const len = jingle(st.w);
    if (len) holdUntil = performance.now() + (len + 0.4) * 1000;
  }
  // the battle code sets vicT when a fight is won (solo, host or guest): play the jingle on that edge
  let lastV = 0;
  setInterval(() => {
    let v = 0;
    try {
      v = typeof vicT === "number" ? vicT : 0;
    } catch (e) {}
    if (v > 0 && lastV <= 0) victory();
    lastV = v;
  }, 100);

  // what should be playing now
  // v29 the prologue's music follows its shots (14-intro ISHOTS, TI.k). 46-gloomfall swaps in its gloom shots
  // (GFALL.shots = [gloom creeps in, gloomlings rise, gloomlings skitter, First Lamp, lamps rise]); without it the old
  // shot 4 is the gloom one. Before the gloom: dawn, then the falling-out story; after it: hope
  function introMood() {
    const k = TI.k,
      sh = ISHOTS[k],
      gs = (typeof GFALL !== "undefined" && GFALL.shots) || [],
      gi = gs.indexOf(sh);
    if (gi >= 0) return ["igloom", "icreep", "icreep", "ihope", "ihope"][gi] || "ihope";
    const g0 = gs.length ? ISHOTS.indexOf(gs[0]) : 4;
    return k === 0 ? "idawn" : k < g0 ? "ilore" : k === g0 ? "igloom" : "ihope";
  }
  function want() {
    try {
      if (performance.now() < holdUntil) return "";
      if (performance.now() < prevUntil) return prevT;
      if (typeof TI !== "undefined" && TI.on && TI.mode === "intro" && st.t !== "off") return introMood();
      if (typeof TI !== "undefined" && TI.on && (TI.mode === "title" || TI.mode === "intro"))
        return (TTH[st.t] || TTH.lamp)[1];
      // the Primer's practice fight and Oona's welcome in the Vault (16-tutorial.js shows PRAC.g only then)
      // v47 polish: the practice fight itself plays the battle tune; "prac" stays for the Vault talk around it
      if (typeof PRAC !== "undefined" && PRAC.g && PRAC.g.visible && mode !== "battle") return "prac";
      if (mode === "battle" || mode === "guest") {
        const fs = (g && g.foes) || [];
        return fs.some((f) => f && (f.boss || f.dboss)) ? "boss" : "battle";
      }
      if (cur && (mode === "over" || mode === "cut")) return cur.name;
      const z = zoneAt(W.position.x, W.position.z);
      return MOODS[z] ? z : "hub";
    } catch (e) {
      return cur ? cur.name : "hub";
    }
  }

  function poll() {
    if (!ac || !on() || ac.state !== "running") return;
    const w = want();
    if (!w) return fadeOut(1.5);
    if (!cur) return switchTo(w);
    if (w === cur.name) return (pendN = 0);
    if (w === "battle" || w === "boss" || w[0] === "i" || w === "prac" || performance.now() < prevUntil)
      return switchTo(w); // fights, prologue shots and the Vault switch at once
    pendN = w === pend ? pendN + 1 : 1; // places must hold for two polls (no flapping at a border)
    pend = w;
    if (pendN >= 2) switchTo(w);
  }

  function start() {
    if (!on() || document.hidden) return;
    try {
      if (!ac) build();
    } catch (e) {
      return;
    }
    if (ac.state !== "running") ac.resume();
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(vg(st.v), ac.currentTime, 0.4);
    if (!tickI) tickI = setInterval(tick, 100);
    poll();
  }

  function stop(hard) {
    if (tickI) clearInterval(tickI);
    tickI = 0;
    if (!ac) return;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(0, ac.currentTime, 0.1);
    const a = ac;
    setTimeout(
      () => {
        if (!tickI && a.state === "running") a.suspend();
      },
      hard ? 0 : 500,
    );
  }

  const apply = () => (on() ? start() : stop());
  function setVol(v) {
    st.v = Math.max(0, Math.min(1, +v || 0));
    save();
    if (ac && on() && tickI) master.gain.setTargetAtTime(vg(st.v), ac.currentTime, 0.08);
    else apply();
  }
  function setMute(m) {
    st.m = m ? 1 : 0;
    save();
    apply();
  }

  // browsers only allow sound after a click / key / touch
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    window.addEventListener(
      ev,
      () => {
        if (on() && (!ac || ac.state !== "running" || !tickI)) start();
      },
      true,
    ),
  );
  document.addEventListener("visibilitychange", () => (document.hidden ? stop(1) : on() && ac && start()));
  setInterval(poll, 500);

  // ---- Book > Options > Game: music on/off and volume ----
  if (typeof panel === "function") {
    const panel0 = panel;
    panel = function (k, id) {
      panel0(k, id);
      try {
        if (k !== "book" || BOOKL.last !== "optgame") return;
        const L = $("pl");
        if (!L) return;
        L.insertAdjacentHTML("beforeend", '<div class="sec">Music</div>');
        const r1 = document.createElement("div"),
          r2 = document.createElement("div"),
          b1 = document.createElement("button"),
          sl = document.createElement("input"),
          lb = document.createElement("span");
        r1.className = r2.className = "row";
        r1.innerHTML = "<div><b>Music</b><small>Gentle tunes that change with the place and the fight</small></div>";
        r1.title = "Each place has its own tune; battles and bosses have their own too. Saved in this browser.";
        b1.className = "pb";
        b1.textContent = st.m ? "Off" : "On";
        b1.onclick = () => {
          setMute(!st.m);
          b1.textContent = st.m ? "Off" : "On";
        };
        r1.appendChild(b1);
        r2.innerHTML = "<div><b>Music volume</b><small>Drag to change</small></div>";
        sl.type = "range";
        sl.min = 0;
        sl.max = 100;
        sl.value = Math.round(st.v * 100);
        sl.style.cssText = "width:120px;vertical-align:middle";
        lb.style.cssText = "display:inline-block;width:42px;text-align:right";
        lb.textContent = sl.value + "%";
        sl.oninput = () => {
          lb.textContent = sl.value + "%";
          setVol(sl.value / 100);
        };
        sl.onkeydown = (e) => e.stopPropagation(); // arrow keys mustn't walk you around
        const w = document.createElement("span");
        w.appendChild(sl);
        w.appendChild(lb);
        r2.appendChild(w);
        L.appendChild(r1);
        L.appendChild(r2);
        // v28: title screen theme and victory jingle, each a button that steps through the choices and plays a taste
        const pick = (title, sub, tip, list, get, set) => {
          const r = document.createElement("div"),
            b = document.createElement("button"),
            ks = Object.keys(list);
          r.className = "row";
          r.title = tip;
          r.innerHTML = "<div><b>" + title + "</b><small>" + sub + "</small></div>";
          b.className = "pb";
          b.style.minWidth = "150px";
          const lab = () => (b.textContent = (list[get()].n || list[get()][0]) + " \u25B8");
          lab();
          b.onclick = () => {
            set(ks[(ks.indexOf(get()) + 1) % ks.length]);
            save();
            lab();
          };
          r.appendChild(b);
          L.appendChild(r);
        };
        pick(
          "Title screen theme",
          "Click to change; plays a short taste",
          "The tune on the title screen and during the prologue. Saved in this browser.",
          TTH,
          () => st.t,
          (k) => {
            st.t = k;
            if (on()) start();
            prevT = TTH[k][1];
            prevUntil = performance.now() + 9000;
            poll();
          },
        );
        pick(
          "Victory theme",
          "Click to change; plays it once",
          "The jingle that plays when you win a battle. Saved in this browser.",
          VJ,
          () => st.w,
          (k) => {
            st.w = k;
            if (on()) start();
            prevUntil = 0;
            if (k !== "off") victory();
          },
        );
      } catch (e) {}
    };
  }

  return {
    st,
    MOODS,
    TTH,
    VJ,
    setVol,
    setMute,
    victory,
    now: () => cur && cur.name,
    play: (n) => MOODS[n] && switchTo(n),
  };
})();
