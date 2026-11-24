// DUSKWICK - 46-gloomfall.js: v33 prologue scene "the gloom takes the town" (loads LAST, after 43/models.js).
// Only top-level name: GFALL. Replaces the prologue's Mirewick shot (ISHOTS[4]) with three shots on Gloomway:
// the lamps gutter and shadow pools spread over the cobbles, glowing eyes open in them, gloomlings claw their way up
// and skitter about giggling, one snuffs a lamp. The next shot ("Only the lamps hold it back") flares the lamps and
// the gloomlings shriek and sink back into the dark. Uses the shot hooks in 14-intro.js (sh.d / sh.go / sh.tick,
// TI.stop). Everything lives in one group added to S at runtime and removed when the prologue moves on or ends.
// Cosmetic and local only: Math.random is fine here (no world geometry, solids or foes are placed).
const GFALL = (() => {
  if (typeof ISHOTS === "undefined" || !ISHOTS[4]) return {};
  // v33b: staged on Gloomway, the main street, between the square's mouth (local z -18) and Market Lane (MLZ - MLR = -56).
  // CX/CZ = the middle of that stretch; the street runs north (z decreasing) along x = OX, half-width SW.
  const CX = OX,
    CZ = OZ - 38,
    HX = 7.5, // half-width the gloomlings skitter in
    HZ2 = 17; // half-length of the stretch
  // shadow pools on the street (offsets from CX/CZ); 0 is the close-up one, nearest the square
  const POOLS = [
    [4, 12],
    [-5, 9],
    [-6, -2],
    [3, 3],
    [6, -8],
    [-3, -12],
    [5, -16],
    [-6, 15],
  ];
  // where the light comes from in the flare shot (the square's mouth)
  const FX = CX,
    FZ = CZ + 30;
  const DSKY = "linear-gradient(#020106 0%,#0b0618 48%,#22102e 82%,#3a1838 100%)";
  const DFOG = new T.Color(0x0c0716),
    DHL = new T.Color(0x4a3a7a),
    _p = new T.Vector3();
  const sm = (k) => {
    k = Math.max(0, Math.min(1, k));
    return k * k * (3 - 2 * k);
  };
  const cl = (k) => Math.max(0, Math.min(1, k));
  const back = (k) => {
    k = cl(k);
    const c = 1.9;
    return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
  };
  const angTo = (a, b, k) => {
    let d = b - a;
    while (d > Math.PI) d -= 6.283;
    while (d < -Math.PI) d += 6.283;
    return a + d * k;
  };
  // ragged shadow-pool texture: a dark core with blobby, smoky edges
  const PTX = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    const blob = (bx, by, r, a) => {
      const q = x.createRadialGradient(bx, by, 0, bx, by, r);
      q.addColorStop(0, "rgba(6,2,14," + a + ")");
      q.addColorStop(0.55, "rgba(18,6,34," + a * 0.8 + ")");
      q.addColorStop(0.85, "rgba(46,14,80," + a * 0.3 + ")");
      q.addColorStop(1, "rgba(46,14,80,0)");
      x.fillStyle = q;
      x.beginPath();
      x.arc(bx, by, r, 0, 7);
      x.fill();
    };
    blob(64, 64, 46, 0.95);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283 + Math.sin(i * 3.1) * 0.4,
        d = 26 + ((i * 7) % 5) * 3;
      blob(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 16 + ((i * 5) % 4) * 3, 0.75);
    }
    const t = new T.CanvasTexture(c);
    return t;
  })();

  // ---------- sound: giggles, hiss, shriek, a low rumble (own tiny AudioContext, follows the music mute/volume) ----------
  let AC = null,
    NB = null,
    lastG = 0;
  function au() {
    const st = typeof MUS !== "undefined" && MUS.st;
    if (st && st.m) return null;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      if (!NB) {
        NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
        const d = NB.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return { ac: AC, v: st && st.v != null ? st.v : 0.6 };
    } catch (e) {
      return null;
    }
  }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function giggle(force) {
    const now = performance.now();
    if (!force && now - lastG < 650) return;
    lastG = now;
    const A = au();
    if (!A) return;
    const { ac } = A,
      n = 4 + Math.floor(Math.random() * 3),
      base = 950 + Math.random() * 500,
      gap = 0.075 + Math.random() * 0.03;
    for (let i = 0; i < n; i++) {
      const t = ac.currentTime + i * gap,
        o = ac.createOscillator(),
        g = ac.createGain(),
        f = base * (1 - i * 0.06) * (0.92 + Math.random() * 0.16);
      o.type = "triangle";
      o.frequency.setValueAtTime(f * 1.15, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.7, t + 0.07);
      env(g, t, 0.01, 0.05 * A.v, 0.07);
      o.connect(g);
      g.connect(ac.destination);
      o.start(t);
      o.stop(t + 0.1);
    }
  }
  function hiss(len) {
    const A = au();
    if (!A) return;
    const { ac } = A,
      t = ac.currentTime,
      L = len || 0.8;
    const s = ac.createBufferSource(),
      bp = ac.createBiquadFilter(),
      g = ac.createGain();
    s.buffer = NB;
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.exponentialRampToValueAtTime(1600, t + L);
    bp.Q.value = 0.9;
    env(g, t, 0.06, 0.12 * A.v, L);
    s.connect(bp);
    bp.connect(g);
    g.connect(ac.destination);
    s.start(t);
    s.stop(t + L + 0.1);
    // a low growl under it
    const o = ac.createOscillator(),
      lp = ac.createBiquadFilter(),
      g2 = ac.createGain();
    o.type = "sawtooth";
    o.frequency.value = 70 + Math.random() * 20;
    lp.type = "lowpass";
    lp.frequency.value = 380;
    env(g2, t, 0.1, 0.06 * A.v, L);
    o.connect(lp);
    lp.connect(g2);
    g2.connect(ac.destination);
    o.start(t);
    o.stop(t + L + 0.2);
  }
  function shriek() {
    const A = au();
    if (!A) return;
    const { ac } = A;
    for (let i = 0; i < 4; i++) {
      const t = ac.currentTime + i * 0.07 + Math.random() * 0.05,
        o = ac.createOscillator(),
        lp = ac.createBiquadFilter(),
        g = ac.createGain(),
        f = 500 + Math.random() * 300;
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 3.2, t + 0.25);
      o.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.6);
      lp.type = "lowpass";
      lp.frequency.value = 2400;
      env(g, t, 0.03, 0.03 * A.v, 0.55);
      o.connect(lp);
      lp.connect(g);
      g.connect(ac.destination);
      o.start(t);
      o.stop(t + 0.7);
    }
  }
  function rumble() {
    const A = au();
    if (!A) return;
    const { ac } = A,
      t = ac.currentTime,
      o = ac.createOscillator(),
      g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(48, t);
    o.frequency.linearRampToValueAtTime(38, t + 4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 * A.v, t + 1.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + 5.2);
  }
  function snuffS() {
    const A = au();
    if (!A) return;
    const { ac } = A,
      t = ac.currentTime,
      s = ac.createBufferSource(),
      lp = ac.createBiquadFilter(),
      g = ac.createGain();
    s.buffer = NB;
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1800, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.4);
    env(g, t, 0.01, 0.14 * A.v, 0.4);
    s.connect(lp);
    lp.connect(g);
    g.connect(ac.destination);
    s.start(t);
    s.stop(t + 0.5);
  }

  // ---------- the cast ----------
  let H = null,
    G = [],
    LT = [],
    SN = null; // holder group, gloomlings, the square's lamp lights, the lamp that gets snuffed
  let wT = 0;
  // v33c: things hidden while the scene runs (street foes, the real Oona), the founding shots' Oona + her coal,
  // the houses that rise again, and the meshes the camera clearance check looks at
  const HID = [],
    OB = [];
  let ONPC = null,
    OON = null,
    COAL = null,
    HS = [];
  function build() {
    if (H) return;
    H = new T.Group();
    H.name = "gfall";
    H.userData.lus = 1;
    S.add(H);
    POOLS.forEach(([dx, dz], i) => {
      const x = CX + dx,
        z = CZ + dz;
      const pm = new T.Mesh(
        new T.PlaneGeometry(1, 1),
        new T.MeshBasicMaterial({
          map: PTX,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        }),
      );
      pm.rotation.x = -Math.PI / 2;
      pm.position.set(x, 0.07, z);
      pm.renderOrder = 2;
      pm.scale.setScalar(0.01);
      H.add(pm);
      const eyes = new T.Group();
      [-1, 1].forEach((sd) => {
        const e = new T.Sprite(
          new T.SpriteMaterial({
            map: WGT,
            color: 0xffc23a,
            transparent: true,
            depthWrite: false,
            blending: T.AdditiveBlending,
          }),
        );
        e.position.x = sd * 0.14;
        e.scale.set(0.22, 0.22, 1);
        eyes.add(e);
      });
      eyes.position.set(x, 0.3, z);
      eyes.visible = false;
      H.add(eyes);
      let o = null;
      try {
        o = mkFoe("gloom", 1);
        o.scale.multiplyScalar(0.9 + ((i * 37) % 10) / 45);
        o.position.set(x, -2, z);
        o.visible = false;
        H.add(o);
      } catch (e) {
        o = null;
      }
      G.push({
        i,
        px: x,
        pz: z,
        pm,
        eyes,
        o,
        st: "hide",
        r: 0,
        y: -2,
        x,
        z,
        tx: x,
        tz: z,
        wt: 0,
        hop: 0,
        mv: 0,
        ry: 0,
      });
    });
    // lamp lights (static pool lights) along the street and in the square, dimmed and flickered while the gloom is in
    S.traverse((o) => {
      if (!o.isPointLight || !o.userData.pool) return;
      o.getWorldPosition(_p);
      const d = Math.hypot(_p.x - CX, _p.z - (CZ + 18));
      if (d < 48) LT.push({ l: o, i0: o.intensity, x: _p.x, y: _p.y, z: _p.z, out: 0, bo: 1 });
    });
    // v33c: street foes near the scene step out of it (they made the shots look busy); put back by stop()
    HID.length = 0;
    foes.forEach((f) => {
      if (f.o && f.o.visible && Math.hypot(f.o.position.x - CX, f.o.position.z - (CZ + 10)) < 70) {
        f.o.visible = false;
        HID.push(f.o);
      }
    });
    // the real Oona (with her name plate and quest mark) hides, so she isn't standing there long before her time
    ONPC = NPCS.find((n) => n.kind === "q" && n.id === "hub") || null;
    if (ONPC && ONPC.o.visible) {
      ONPC.o.visible = false;
      HID.push(ONPC.o);
    }
    try {
      // v33d: Oona's grandmother lights the First Lamp (lore stone 0): Oona's look, a deeper robe, a silver hat,
      // a little slighter and shorter
      OON = person(Object.assign({}, NSPEC.qhub, { robe: 0x1f5e5a, hc: 0xb8b8c4, w: 0.92 }));
      OON.scale.set(1, 0.94, 1);
      OON.userData.ph = OON.userData.ph || 0; // personBody reads it
      OON.userData.bt = 2;
      OON.visible = false;
      H.add(OON);
      // a coal of the Dawn Ember in her raised hand (child of the right arm, so it follows it)
      COAL = new T.Sprite(
        new T.SpriteMaterial({
          map: WGT,
          color: 0xffb040,
          transparent: true,
          depthWrite: false,
          blending: T.AdditiveBlending,
        }),
      );
      COAL.scale.set(0.9, 0.9, 1);
      if (OON.userData.AR) {
        COAL.position.set(0, -0.85, 0.15);
        OON.userData.AR.add(COAL);
      } else {
        COAL.position.set(0.4, 1.6, 0.45);
        OON.add(COAL);
      }
    } catch (e) {
      OON = null;
    }
    // houses of the square, Gloomway and Market Lane: they rise again in the founding shot
    HS = HOUSES.filter((h) => h.o && Math.hypot(h.x - OX, h.z - (OZ - 30)) < 75).map((h) => ({
      h,
      s: h.s || 1,
      vis: h.o.visible,
      d: 0,
      up: 0,
    }));
    // solid meshes near the scene, for the camera clearance check (pick())
    OB.length = 0;
    S.traverse((o) => {
      if (!o.isMesh || o.isSprite || o === H || !o.geometry) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.transparent || m.blending === T.AdditiveBlending) return;
      for (let p = o; p; p = p.parent) if (!p.visible || p === H) return;
      if (o.isInstancedMesh) return void OB.push(o); // instances are spread anywhere; let the raycast sort them out
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const bs = o.geometry.boundingSphere;
      if (!bs) return;
      // the sphere's centre in the world (merged meshes sit at the origin with world-space vertices)
      o.updateMatrixWorld();
      _p.copy(bs.center).applyMatrix4(o.matrixWorld);
      const r = bs.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) * (o.parent && o.parent !== S ? 2 : 1);
      if (Math.hypot(_p.x - CX, _p.z - (CZ + 18)) < 62 + r) OB.push(o);
    });
    // the lamp a gloomling snuffs: a street lamp ahead of the third shot's camera, east side, mid-stretch
    SN = LT.filter((L) => Math.abs(L.x - CX) < 15 && Math.abs(L.z - CZ) < HZ2 + 4).reduce((a, L) => {
      const d = Math.hypot(L.x - (CX + 6), L.z - (CZ - 4));
      return !a || d < a.d ? Object.assign(L, { d }) : a;
    }, null);
  }
  function houses(on) {
    // on = 1: every house back as it was; 0: hidden (they rise again in the founding shot)
    HS.forEach((e) => {
      e.h.o.visible = on ? e.vis : false;
      e.h.o.scale.setScalar(e.s);
      e.up = 0;
    });
  }
  function stop() {
    if (!H) return;
    LT.forEach((L) => (L.l.intensity = L.i0));
    houses(1);
    HID.forEach((o) => (o.visible = true));
    HID.length = 0;
    OB.length = 0;
    HS = [];
    OON = COAL = ONPC = null; // the coal's material goes with the WGT sprites below
    S.remove(H);
    H.traverse((o) => {
      // only our own pool/eye materials; foe models share geometry through 36-detail's cache, so leave theirs alone
      if (o.isSprite && o.material && o.material.map === WGT) o.material.dispose();
      if (o.isMesh && o.material && o.material.map === PTX) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    G.forEach((g) => g.o && (g.o.userData.lusS = null));
    H = null;
    G = [];
    LT = [];
    SN = null;
  }
  TI.stop = stop;

  // how far the gloom has taken the square (0 = the town's own look, 1 = nearly black)
  // fr (optional) = how far you can see: the founding shots pull the fog right in, then push it back out
  function dark(k, s, fr) {
    const A = thP("hub");
    S.fog.color.setHex(A.fog).lerp(DFOG, k);
    HL.intensity = A.L[0] * (1 - 0.7 * k);
    sun.intensity = A.L[1] * (1 - 0.82 * k);
    AMB.intensity = A.L[2] * (1 - 0.5 * k);
    S.fog.near = fr ? fr * 0.25 : A.near * (1 - 0.6 * k);
    S.fog.far = fr || A.far * (1 - 0.45 * k);
    HL.color.setHex(A.hl).lerp(DHL, k);
    skySet(A.sky, DSKY, k);
    LT.forEach((L, n) => {
      let f = L.full ? 1 : 1 - 0.72 * k; // full = freshly lit in the founding shots: no dimming, no guttering
      if (!L.full && k > 0.15 && Math.sin(s * 23 + n * 7) * Math.sin(s * 9.7 + n * 3) > 0.55) f *= 0.3; // guttering
      L.l.intensity = L.out ? 0 : L.i0 * f * L.bo;
    });
  }
  function wisps(dt, rate) {
    wT -= dt;
    if (wT > 0) return;
    wT = rate;
    const g = G[Math.floor(Math.random() * G.length)];
    if (!g || g.r < 0.6) return;
    const a = Math.random() * 6.283,
      d = Math.random() * g.r * 0.4;
    _p.set(g.px + Math.cos(a) * d, 0.2, g.pz + Math.sin(a) * d);
    mote(_p, {
      c: 0x1a0c2a,
      nb: 1,
      s: 0.9 + Math.random() * 0.8,
      v: [0, 0.8 + Math.random() * 0.6, 0],
      g: 0,
      gr: 1.4,
      l: 1.6,
      o: 0.7,
      fi: 0.25,
    });
    if (Math.random() < 0.35)
      mote(_p, { c: 0x8a4aff, s: 0.18, v: [Math.random() - 0.5, 1.4, Math.random() - 0.5], g: 0, gr: -0.6, l: 1.1 });
  }
  function burst(x, z, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      _p.set(x + Math.cos(a) * 0.4, 0.2, z + Math.sin(a) * 0.4);
      mote(_p, {
        c: 0x140820,
        nb: 1,
        s: 0.7 + Math.random() * 0.6,
        v: [Math.cos(a) * 1.6, 1 + Math.random() * 1.4, Math.sin(a) * 1.6],
        g: 0.5,
        dr: 1.5,
        gr: 1,
        l: 1.2,
        o: 0.8,
      });
    }
  }
  // per-frame pose for the whole cast
  function pose(dt, s) {
    G.forEach((g) => {
      g.pm.scale.setScalar(Math.max(0.01, g.r * (1 + 0.05 * Math.sin(s * 2 + g.i))));
      g.pm.rotation.z = s * 0.15 + g.i;
      if (g.eyes.visible) {
        const bl = (s * 0.9 + g.i * 0.37) % 1 < 0.06 ? 0.15 : 1; // blink now and then
        g.eyes.children.forEach((e) => e.scale.set(0.22, 0.22 * bl, 1));
        g.eyes.position.y = 0.3 + Math.sin(s * 1.7 + g.i) * 0.04;
        g.eyes.lookAt(C.position.x, g.eyes.position.y, C.position.z);
      }
      if (!g.o) return;
      g.o.visible = g.st !== "hide";
      if (!g.o.visible) return;
      g.o.position.set(g.x, g.y + g.hop, g.z);
      g.o.rotation.y = angTo(g.o.rotation.y, g.ry, Math.min(1, dt * 10));
      try {
        animGloom(g.o, s, g.mv, g.i);
      } catch (e) {}
    });
  }
  // the gloom shots start from the town as it stands: houses up, lamps burning, our Oona off stage
  function reset() {
    houses(1);
    LT.forEach((L) => ((L.out = 0), (L.full = 0), (L.bo = 1)));
    if (OON) OON.visible = false;
  }
  function face(g, x, z) {
    g.ry = Math.atan2(x - g.x, z - g.z);
  }
  function setRisen(g) {
    g.st = "up";
    g.y = 0;
    g.r = 3;
    g.eyes.visible = false;
  }
  // rise out of the pool (k 0..1): shakes as it claws up, overshoots a little
  function rise(g, k, s) {
    if (g.st === "hide") {
      g.st = "rise";
      g.eyes.visible = false;
      burst(g.px, g.pz, 8);
    }
    g.y = -1.4 * (1 - back(k));
    // v33c: a slow wriggle as it claws up (was a fast 0.06 jitter that read as violent shaking)
    const sh = (1 - k) * 0.015;
    g.x = g.px + Math.sin(s * 9 + g.i) * sh;
    g.z = g.pz + Math.cos(s * 11 + g.i) * sh;
    if (k >= 1) g.st = "up";
  }
  // skitter between random spots in the square, hopping, pausing to twitch and giggle
  function skitter(g, dt, s) {
    if (g.wt > 0) {
      g.wt -= dt;
      g.mv = 0;
      g.hop *= 0.8;
      return;
    }
    const dx = g.tx - g.x,
      dz = g.tz - g.z,
      d = Math.hypot(dx, dz);
    if (d < 0.35) {
      // a new spot somewhere on the street stretch, not right next to this one
      let x, z;
      do {
        x = CX + (Math.random() * 2 - 1) * HX;
        z = CZ + (Math.random() * 2 - 1) * HZ2;
      } while (Math.hypot(x - g.x, z - g.z) < 3);
      g.tx = x;
      g.tz = z;
      g.wt = 0.25 + Math.random() * 0.9;
      if (Math.random() < 0.4) giggle();
      return;
    }
    const sp = 4.2 + (g.i % 3) * 0.8;
    g.x += (dx / d) * sp * dt;
    g.z += (dz / d) * sp * dt;
    face(g, g.tx, g.tz);
    g.hop = Math.abs(Math.sin(s * 9 + g.i)) * 0.2;
    g.mv = 1;
  }
  // v33c: camera clearance. Each shot lists a few camera paths; the first whose start, middle and end all see the
  // look point without a solid mesh in the way is used (beams, signs, eaves). Falls back to the first.
  const RC = new T.Raycaster(),
    _q = new T.Vector3(),
    _d = new T.Vector3();
  function seen(p, l) {
    _q.fromArray(p);
    _d.fromArray(l).sub(_q);
    const len = _d.length();
    if (len < 0.5) return true;
    RC.set(_q, _d.normalize());
    RC.near = 0.05;
    RC.far = len - 1.2;
    return RC.intersectObjects(OB, false).length === 0;
  }
  function pick(sh, cands) {
    let c = cands[0];
    try {
      for (const k of cands) {
        const m = k.a.map((v, i) => (v + k.b[i]) / 2);
        if (seen(k.a, k.l) && seen(m, k.l) && seen(k.b, k.l)) {
          c = k;
          break;
        }
      }
    } catch (e) {}
    sh.a = c.a;
    sh.b = c.b;
    sh.l = c.l;
  }

  // ---------- the shots ----------
  const S1 = {
    d: 8.5,
    // from the square's mouth, looking up Gloomway
    a: [CX + 6, 9, CZ + 33],
    b: [CX + 3, 6, CZ + 25],
    l: [CX, 1, CZ - 4],
    t: "And in the long dusk, the gloom crept into Duskwick itself. The lamps guttered. The shadows grew long, and then they grew hungry.",
    go() {
      build();
      reset();
      pick(this, [
        { a: [CX + 6, 9, CZ + 33], b: [CX + 3, 6, CZ + 25], l: [CX, 1, CZ - 4] },
        { a: [CX + 1.5, 3.2, CZ + 30], b: [CX + 1, 3, CZ + 24], l: [CX, 1, CZ - 4] },
        { a: [CX - 4, 7, CZ - 27], b: [CX - 2.5, 5, CZ - 21], l: [CX, 1, CZ + 6] },
      ]);
      G.forEach((g) => {
        g.st = "hide";
        g.r = 0;
        g.eyes.visible = false;
      });
      rumble();
    },
    tick(tk, dt, s) {
      dark(0.62 * sm(tk / 7), s);
      G.forEach((g) => {
        g.r = 3 * sm((tk - 0.8 - g.i * 0.45) / 2.4);
        // a few pairs of eyes open late in the shot, a taste of what's coming
        g.eyes.visible = tk > 5.6 + (g.i % 4) * 0.4 && g.i % 3 === 1;
      });
      wisps(dt, 0.07);
      pose(dt, s);
    },
  };
  const P0 = G0pos();
  function G0pos() {
    return [CX + POOLS[0][0], CZ + POOLS[0][1]];
  }
  const S2 = {
    d: 8,
    a: [P0[0] - 4.2, 1.6, P0[1] + 3.4],
    b: [P0[0] - 3, 1.05, P0[1] + 2.5],
    l: [P0[0], 0.6, P0[1]],
    t: "Out of every shadow they came: gloomlings, grown from fears, grudges and forgotten things.",
    go() {
      build();
      reset();
      // the close-up: the first path, turned about the pool until nothing stands in the way
      const L = [P0[0], 0.6, P0[1]],
        A0 = [-4.2, 1.6, 3.4],
        B0 = [-3, 1.05, 2.5];
      pick(
        this,
        [0, 0.7, -0.7, 1.4, -1.4, 2.4, -2.4, 3.14].map((r) => {
          const c = Math.cos(r),
            sn = Math.sin(r),
            rot = (v) => [P0[0] + v[0] * c - v[2] * sn, v[1], P0[1] + v[0] * sn + v[2] * c];
          return { a: rot(A0), b: rot(B0), l: L };
        }),
      );
      G.forEach((g) => {
        g.st = "hide";
        g.r = 3;
        g.eyes.visible = false;
        g.y = -2;
        g.x = g.px;
        g.z = g.pz;
      });
      G[0].r = 3.4;
      this.f = {};
    },
    tick(tk, dt, s) {
      const f = this.f,
        g = G[0];
      dark(0.62 + 0.1 * sm(tk / 6), s);
      wisps(dt, 0.09);
      // eyes open in the dark... stare... then it claws up
      g.eyes.visible = tk > 0.9 && tk < 2.7;
      if (tk > 2.7) {
        if (!f.h) {
          f.h = 1;
          hiss(0.9);
        }
        rise(g, (tk - 2.7) / 1.7, s);
        face(g, C.position.x, C.position.z);
        g.o && (g.o.rotation.y = g.ry);
      }
      if (tk > 5.4 && !f.g) {
        f.g = 1;
        giggle(1);
      }
      // more eyes behind it
      [3, 4, 6].forEach((n, j) => (G[n].eyes.visible = tk > 3.2 + j * 0.5));
      pose(dt, s);
    },
  };
  const S3 = {
    d: 10,
    // west side of the street near the square, looking north along it
    a: [CX - 7, 6, CZ + 25],
    b: [CX - 5, 4.2, CZ + 19],
    l: [CX, 1, CZ - 4],
    t: "They skittered over the cobbles and giggled in the alleys, and snuffed every lamp they could reach. Wherever a lamp goes out, the gloom grows.",
    go() {
      build();
      this.f = { snuff: 0 };
      const sg = SN
        ? G.reduce((a, g) => (Math.hypot(g.px - SN.x, g.pz - SN.z) < Math.hypot(a.px - SN.x, a.pz - SN.z) ? g : a))
        : null;
      this.sg = sg && sg !== G[0] ? sg : null;
      reset();
      const L = SN ? [(CX + SN.x) / 2, 1.4, (CZ + SN.z) / 2] : [CX, 1, CZ - 4];
      pick(this, [
        { a: [CX - 7, 6, CZ + 25], b: [CX - 5, 4.2, CZ + 19], l: L },
        { a: [CX - 5, 3.2, CZ + 24], b: [CX - 4, 3, CZ + 19], l: L },
        { a: [CX + 6, 3.2, CZ + 24], b: [CX + 4.5, 3, CZ + 19], l: L },
        { a: [CX - 5, 5, CZ - 27], b: [CX - 4, 4, CZ - 22], l: [CX, 1, CZ + 4] },
      ]);
      G.forEach((g, n) => {
        g.r = 3;
        g.eyes.visible = false;
        g.wt = 0;
        g.x = g.px;
        g.z = g.pz;
        g.tx = g.x;
        g.tz = g.z;
        g.y = -2;
        g.st = "hide";
        // rise order: the lamp-snuffer first, then the rest
        g.rt = g === this.sg ? 0.2 : 0.5 + ((n * 3) % G.length) * 0.32;
      });
      setRisen(G[0]);
      G[0].rt = -9;
    },
    tick(tk, dt, s) {
      const f = this.f,
        sg = this.sg;
      dark(0.72 + 0.2 * sm((tk - (f.st || 99)) / 1.2), s);
      wisps(dt, 0.1);
      G.forEach((g) => {
        if (tk < g.rt) return;
        if (g.st === "hide" || g.st === "rise") {
          if (g.st === "hide" && Math.random() < 0.6) giggle();
          rise(g, (tk - g.rt) / 1.0, s);
          return;
        }
        if (g === sg && (!f.snuff || f.lp < 0.7)) {
          // run to the lamp, crouch, leap up at it, and it goes out
          const lx = SN.x + (CX - SN.x) * 0.06,
            lz = SN.z + (CZ - SN.z) * 0.06;
          g.tx = lx;
          g.tz = lz;
          const d = Math.hypot(lx - g.x, lz - g.z);
          if (d > 0.4) {
            g.wt = 0;
            skitter(g, dt, s);
            g.tx = lx;
            g.tz = lz;
          } else {
            f.lp = (f.lp || 0) + dt;
            g.mv = 0;
            g.hop = Math.sin(Math.min(1, f.lp / 0.7) * Math.PI) * 1.6;
            if (f.lp > 0.35 && !f.snuff) {
              f.snuff = 1;
              f.st = tk;
              SN.out = 1;
              snuffS();
              setTimeout(() => giggle(1), 250);
              for (let i = 0; i < 14; i++) {
                _p.set(SN.x, SN.y, SN.z);
                mote(_p, {
                  c: 0x120818,
                  nb: 1,
                  s: 0.6 + Math.random() * 0.7,
                  v: [Math.random() - 0.5, 0.6 + Math.random(), Math.random() - 0.5],
                  g: -0.2,
                  gr: 1.6,
                  l: 1.8,
                  o: 0.75,
                });
              }
            }
          }
          return;
        }
        skitter(g, dt, s);
      });
      if (!sg && tk > 5 && !f.st) f.st = tk; // no lamp to snuff: still let the dark deepen
      pose(dt, s);
    },
  };
  // ---------- v33c: the founding. Oona's grandmother (OON) lights the First Lamp, and Duskwick rises again around its lamps ----------
  // the First Lamp = the square's lamp post at angle 0.62 (radius 16.5), beside Oona's usual spot and notice board
  const FLA = 0.62,
    OUTX = Math.cos(FLA),
    OUTZ = Math.sin(FLA),
    FLX = OX + OUTX * 16.5,
    FLZ = OZ + OUTZ * 16.5,
    O0 = [OX + OUTX * 8.5, OZ + OUTZ * 8.5], // where Oona starts
    O1 = [OX + OUTX * 15.1, OZ + OUTZ * 15.1]; // where she stops, just short of the post
  let L1 = null; // that lamp's light (if it has one)
  function firstLamp() {
    L1 = LT.reduce((a, L) => {
      const d = Math.hypot(L.x - FLX, L.z - FLZ);
      return d < 4 && (!a || d < a.dd) ? Object.assign(L, { dd: d }) : a;
    }, null);
    return L1 ? [L1.x, L1.y, L1.z] : [FLX, 3.3, FLZ];
  }
  function chime() {
    const A = au();
    if (!A) return;
    const { ac } = A;
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => {
      const t = ac.currentTime + i * 0.11,
        o = ac.createOscillator(),
        g = ac.createGain();
      o.type = "sine";
      o.frequency.value = f;
      env(g, t, 0.02, 0.08 * A.v, 1.4);
      o.connect(g);
      g.connect(ac.destination);
      o.start(t);
      o.stop(t + 1.6);
    });
  }
  function lampOn(L, tk) {
    L.out = 0;
    L.full = 1;
    L.t0 = tk;
    try {
      puff(new T.Vector3(L.x, L.y, L.z), "fire", 6, 1.6, 0.7, 0.7);
    } catch (e) {}
  }
  function oonaAt(x, z, ry) {
    if (!OON) return;
    OON.visible = true;
    OON.position.set(x, 0, z);
    OON.rotation.y = ry;
  }
  // flee from (fx, fz), sinking back into the pool
  function flee(g, fx, fz, dt, s, t) {
    const dx = g.x - fx,
      dz = g.z - fz,
      d = Math.hypot(dx, dz) || 1;
    g.x += (dx / d) * 6.5 * dt;
    g.z += (dz / d) * 6.5 * dt;
    g.ry = Math.atan2(dx, dz);
    g.mv = 1;
    g.hop = Math.abs(Math.sin(s * 10 + g.i)) * 0.18;
    if (t > 0.4) g.y -= dt * 1.6;
    if (g.y < -1.6) g.st = "hide";
    g.r = Math.max(0, g.r - dt * 2.2);
  }
  const OWALK = Math.atan2(OUTX, OUTZ); // Oona faces out toward the post
  const F1 = {
    d: 9,
    // starting values only: go() picks the real camera (14-intro reads sh.l before go runs)
    a: [O0[0] - OUTZ * 6, 2.4, O0[1] + OUTX * 6],
    b: [O0[0] - OUTZ * 5, 2.1, O0[1] + OUTX * 5],
    l: [FLX, 2, FLZ],
    t: "Then Oona's grandmother carried a single coal of the Dawn Ember into the dark square, and lit the First Lamp.",
    go() {
      build();
      this.f = {};
      const mx = (O0[0] + O1[0]) / 2,
        mz = (O0[1] + O1[1]) / 2,
        lp = firstLamp(),
        L = [(mx + lp[0]) / 2 + 0.4, 2, (mz + lp[2]) / 2],
        px = -OUTZ, // sideways from her walk
        pz = OUTX;
      pick(this, [
        { a: [mx + px * 6, 2.4, mz + pz * 6], b: [mx + px * 5 + OUTX, 2.1, mz + pz * 5 + OUTZ], l: L },
        { a: [mx - px * 6, 2.4, mz - pz * 6], b: [mx - px * 5 + OUTX, 2.1, mz - pz * 5 + OUTZ], l: L },
        {
          a: [O0[0] - OUTX * 4 + px * 2, 3, O0[1] - OUTZ * 4 + pz * 2],
          b: [O0[0] - OUTX * 2, 2.6, O0[1] - OUTZ * 2],
          l: L,
        },
      ]);
      houses(0);
      LT.forEach((L) => ((L.out = 1), (L.full = 0), (L.bo = 1), (L.t0 = 0)));
      G.forEach((g) => ((g.st = "hide"), (g.r = 0), (g.eyes.visible = false)));
      if (OON) {
        OON.userData.bt = 2;
        if (OON.userData.AR) OON.userData.AR.rotation.x = 0;
      }
      if (COAL) COAL.visible = true;
      oonaAt(O0[0], O0[1], OWALK);
    },
    tick(tk, dt, s) {
      const f = this.f,
        lit = f.lit || 0;
      // close, black fog; it opens a little once the lamp is lit
      dark(0.95 - 0.12 * sm((tk - lit) / 2) * (lit ? 1 : 0), s, 12 + (lit ? 10 * sm((tk - lit) / 2.5) : 0));
      const w = cl((tk - 0.5) / 4),
        e = sm(w),
        walking = tk > 0.5 && tk < 4.5;
      oonaAt(O0[0] + (O1[0] - O0[0]) * e, O0[1] + (O1[1] - O0[1]) * e, OWALK);
      if (OON) {
        OON.position.y = walking ? Math.abs(Math.sin(tk * 7)) * 0.05 : 0;
        try {
          personBody(OON, s, dt, walking ? 1 : 0, tk * 7);
          personLife(OON, s, dt);
        } catch (err) {}
        // raise the coal to the lamp, hold it there, then lower the arm
        const ar = OON.userData.AR;
        if (ar)
          ar.rotation.x =
            -2.5 * sm((tk - 4.5) / 0.9) * (1 - sm((tk - 7.2) / 1)) + Math.sin(tk * 7) * 0.15 * (walking ? 1 : 0);
      }
      if (COAL) {
        const pu = 0.85 + 0.25 * Math.sin(s * 6) + 0.6 * sm((tk - 4.6) / 1);
        COAL.scale.set(pu, pu, 1);
        COAL.visible = !lit || tk - lit < 0.25;
        if (!lit && Math.random() < 0.3) {
          COAL.getWorldPosition(_p);
          mote(_p, {
            c: 0xffa040,
            s: 0.12,
            v: [Math.random() * 0.4 - 0.2, 0.8, Math.random() * 0.4 - 0.2],
            g: 0,
            l: 0.8,
          });
        }
      }
      if (tk > 5.6 && !lit) {
        f.lit = tk;
        const lp = firstLamp();
        if (L1) lampOn(L1, tk);
        L1 && (L1.bo = 3);
        try {
          puff(new T.Vector3(lp[0], lp[1], lp[2]), "fire", 22, 2.6, 1, 1.1);
          ring(lp[0], 0xffd27a, 6, 900, lp[2]);
        } catch (err) {}
        chime();
      }
      if (L1 && lit) L1.bo = 1 + 2 * Math.max(0, 1 - (tk - lit) / 1.5);
    },
  };
  const F2 = {
    d: 10,
    a: [OX + 6, 8, OZ + 13],
    b: [OX + 3, 24, OZ + 9],
    l: [OX, 0, OZ - 22],
    t: "From that one flame she lit the next, and the next. Street by street, Duskwick rose again around its lamps, and the gloom fled before them.",
    go() {
      build();
      this.f = {};
      // a crane shot from the square up Gloomway (few obstacles up there; a second side in case)
      pick(this, [
        { a: [OX + 6, 8, OZ + 13], b: [OX + 3, 24, OZ + 9], l: [OX, 0, OZ - 22] },
        { a: [OX - 6, 8, OZ + 13], b: [OX - 3, 24, OZ + 9], l: [OX, 0, OZ - 22] },
      ]);
      firstLamp();
      houses(0);
      HS.forEach((e) => (e.d = Math.hypot(e.h.x - FLX, e.h.z - FLZ)));
      LT.forEach((L) => ((L.out = L === L1 ? 0 : 1), (L.full = L === L1 ? 1 : 0), (L.bo = 1), (L.t0 = -9)));
      // the gloomlings are still out on the street
      G.forEach((g) => {
        g.st = "up";
        g.y = 0;
        g.r = 3;
        g.eyes.visible = false;
        g.x = g.px;
        g.z = g.pz;
        g.tx = g.x;
        g.tz = g.z;
        g.wt = Math.random() * 0.6;
        g.fl = 0;
      });
      if (OON) {
        if (OON.userData.AR) OON.userData.AR.rotation.x = 0;
        if (COAL) COAL.visible = false;
      }
      oonaAt(O1[0], O1[1], OWALK + Math.PI); // turned back toward the town
    },
    tick(tk, dt, s) {
      const f = this.f,
        A = thP("hub"),
        q = sm((tk - 0.3) / 6.5),
        R = 4 + 95 * sm((tk - 0.3) / 7); // how far the light has spread from the First Lamp
      if (tk > 7.4) dark(0, s);
      else dark(0.9 * (1 - q), s, 16 + (A.far - 16) * q);
      LT.forEach((L) => {
        if (L.out && Math.hypot(L.x - FLX, L.z - FLZ) < R) lampOn(L, tk);
        if (!L.out) L.bo = 1 + 1.4 * Math.max(0, 1 - (tk - L.t0) / 0.8);
      });
      HS.forEach((e) => {
        if (R < e.d) return;
        if (!e.up) {
          // a puff of gold where it rises
          for (let i = 0; i < 6; i++) {
            _p.set(e.h.x + (Math.random() - 0.5) * 6, 0.4, e.h.z + (Math.random() - 0.5) * 6);
            mote(_p, { c: 0xffd27a, s: 0.5, v: [0, 1.5 + Math.random(), 0], g: 0, gr: -0.5, l: 1.2 });
          }
        }
        e.up = Math.min(1, e.up + dt / 1.1);
        e.h.o.visible = e.vis;
        e.h.o.scale.set(e.s, e.s * Math.max(0.02, back(e.up)), e.s);
      });
      G.forEach((g) => {
        if (g.st === "hide") return;
        if (!g.fl && R > Math.hypot(g.x - FLX, g.z - FLZ) - 4) {
          g.fl = tk;
          if (!f.sh) {
            f.sh = 1;
            shriek();
          }
        }
        if (g.fl) flee(g, FLX, FLZ, dt, s, tk - g.fl);
        else skitter(g, dt, s);
      });
      if (OON) {
        try {
          personBody(OON, s, dt, 0, 0);
          personLife(OON, s, dt);
        } catch (err) {}
      }
      pose(dt, s);
    },
  };
  // "Only the lamps hold it back": the town is itself again; everything of ours is put away
  const OLD5 = ISHOTS[5];
  if (OLD5) {
    const g5 = OLD5.go;
    OLD5.go = function () {
      stop();
      if (g5) g5.call(this);
    };
  }
  // the last shot ("You are the newest of them") starts clean
  const LAST = ISHOTS[ISHOTS.length - 1];
  if (LAST && LAST !== OLD5) {
    const g0 = LAST.go;
    LAST.go = function () {
      stop();
      if (g0) g0.call(this);
    };
  }
  // swap the Mirewick shot for the three gloom shots and the two founding shots
  ISHOTS.splice(4, 1, S1, S2, S3, F1, F2);
  return { stop, build, giggle, shots: [S1, S2, S3, F1, F2] };
})();
