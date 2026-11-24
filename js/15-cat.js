// DUSKWICK - 15-cat.js: v17 Soot, the lamp-cat of Lamplight Square. Replaces the simple critter cat (CRIT, built in
// world()) with a detailed rigged model: tabby fur painted onto canvas textures, layered eyes with slit pupils that
// blink, pyramid ears with pink insides, whiskers, a white bib and socks, a 12-bone tail, two-bone legs and a brass
// lantern charm on the collar. Only the cat's own group is refilled, so no scene-child indices change (editor builds).
// 05-ambient still walks her around the square; catAnim (called from there) adds the walk cycle and her idle poses:
// sitting, grooming, lying like a sphinx, and purring (little hearts) when you stand close.
(() => {
  const c = CRIT.find((q) => q.kind === "cat");
  if (!c) return;
  const o = c.o;
  o.children.slice().forEach((ch) => o.remove(ch));

  // ---- fur textures ----
  const canv = (w, h, fn) => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    fn(cv.getContext("2d"), w, h);
    const t = new T.CanvasTexture(cv);
    t.anisotropy = 4;
    return t;
  };
  const BASE = "#625a72",
    DARK = "#2d2738",
    LITE = "#9a90a8",
    WHITE = 0xf3ede4;
  // fine fur strokes everywhere, so the surface never looks like flat plastic
  const fur = (x, w, h, n) => {
    for (let i = 0; i < n; i++) {
      const px = Math.random() * w,
        py = Math.random() * h;
      x.strokeStyle = Math.random() < 0.5 ? "rgba(20,14,30,.16)" : "rgba(255,245,255,.1)";
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + (Math.random() - 0.5) * 2, py + 3 + Math.random() * 4);
      x.stroke();
    }
  };
  // body sphere is turned so its poles run along the spine: canvas rows = rings round the body (tabby stripes),
  // column 0.75 = the spine, column 0.25 = the belly
  const bodyT = canv(256, 256, (x, w, h) => {
    const gr = x.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, BASE);
    gr.addColorStop(0.25, LITE);
    gr.addColorStop(0.5, BASE);
    gr.addColorStop(0.75, "#4c4458");
    gr.addColorStop(1, BASE);
    x.fillStyle = gr;
    x.fillRect(0, 0, w, h);
    x.fillStyle = DARK;
    for (let r = 0; r < 9; r++) {
      const y0 = 22 + r * 25 + (r % 2) * 4;
      x.beginPath();
      // each stripe is a wavy band that is widest along the spine and fades out before the belly
      for (let i = 0; i <= 64; i++) {
        const u = i / 64,
          k = Math.max(0, Math.cos((u - 0.75) * Math.PI * 2)),
          y = y0 + Math.sin(u * 18 + r) * 2.5 - k * 3;
        if (k < 0.15) continue;
        x.lineTo(u * w, y);
      }
      for (let i = 64; i >= 0; i--) {
        const u = i / 64,
          k = Math.max(0, Math.cos((u - 0.75) * Math.PI * 2));
        if (k < 0.15) continue;
        x.lineTo(u * w, y0 + Math.sin(u * 18 + r) * 2.5 + k * 6);
      }
      x.closePath();
      x.globalAlpha = 0.75;
      x.fill();
    }
    x.globalAlpha = 0.55;
    x.fillRect(w * 0.72, 0, w * 0.06, h); // the dark line down the spine
    x.globalAlpha = 1;
    fur(x, w, h, 2600);
  });
  // head sphere (poles up/down): column 0.25 faces forward. The tabby "M" on the forehead and cheek stripes
  const headT = canv(256, 128, (x, w, h) => {
    x.fillStyle = BASE;
    x.fillRect(0, 0, w, h);
    const g2 = x.createRadialGradient(w * 0.25, h * 0.62, 2, w * 0.25, h * 0.62, w * 0.12);
    g2.addColorStop(0, LITE);
    g2.addColorStop(1, "rgba(154,144,168,0)");
    x.fillStyle = g2;
    x.fillRect(0, 0, w, h);
    x.strokeStyle = DARK;
    x.lineCap = "round";
    x.lineWidth = 3.5;
    const fx = w * 0.25;
    [
      [-16, 18, -10, 40],
      [-6, 12, -4, 38],
      [6, 12, 4, 38],
      [16, 18, 10, 40],
    ].forEach(([a, b, c2, d]) => {
      x.beginPath();
      x.moveTo(fx + a, b);
      x.quadraticCurveTo(fx + (a + c2) / 2 + (a < 0 ? 3 : -3), (b + d) / 2, fx + c2, d);
      x.stroke();
    });
    x.lineWidth = 2.5;
    [-1, 1].forEach((sg) => {
      for (let k = 0; k < 2; k++) {
        x.beginPath();
        x.moveTo(fx + sg * 28, 64 + k * 9);
        x.quadraticCurveTo(fx + sg * 40, 60 + k * 9, fx + sg * 50, 66 + k * 10);
        x.stroke();
      }
    });
    for (let k = 0; k < 5; k++) {
      x.beginPath();
      x.moveTo(w * 0.75 - 20 + k * 10, 4);
      x.lineTo(w * 0.75 - 22 + k * 11, 34);
      x.stroke();
    }
    fur(x, w, h, 1400);
  });
  const tailT = canv(64, 256, (x, w, h) => {
    x.fillStyle = BASE;
    x.fillRect(0, 0, w, h);
    x.fillStyle = DARK;
    for (let r = 0; r < 10; r++) x.fillRect(0, 8 + r * 25, w, 9);
    fur(x, w, h, 500);
  });
  const toon = (o2) => new T.MeshToonMaterial(Object.assign({ gradientMap: GR }, o2));
  const mBody = toon({ color: 0xffffff, map: bodyT }),
    mHead = toon({ color: 0xffffff, map: headT }),
    mTail = toon({ color: 0xffffff, map: tailT }),
    mFur = toon({ color: 0x5a5268 }),
    mLite = toon({ color: 0x9089a0 }),
    mWhite = toon({ color: WHITE }),
    mPink = toon({ color: 0xe8a0ac }),
    mNose = toon({ color: 0xc87888 }),
    mPad = toon({ color: 0x8a5a66 }),
    mIris = toon({ color: 0xb8ff6a, emissive: 0x456a12, emissiveIntensity: 0.6 }),
    mPupil = new T.MeshBasicMaterial({ color: 0x0a0610 }),
    mShine = new T.MeshBasicMaterial({ color: 0xffffff }),
    mCollar = toon({ color: 0x8a2a4a }),
    mBrass = toon({ color: 0xd9a441, emissive: 0x3a2a08 }),
    mFlame = new T.MeshBasicMaterial({ color: 0xffc27a });
  const SPH = (r, ws, hs) => new T.SphereGeometry(r, ws || 28, hs || 20);
  const add2 = (par, geo, mat, x, y, z, sx, sy, sz, nol) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (sx) m.scale.set(sx, sy, sz);
    if (nol) m.userData.nol = 1;
    par.add(m);
    return m;
  };
  const grp = (par, x, y, z) => {
    const q = new T.Group();
    q.position.set(x || 0, y || 0, z || 0);
    par.add(q);
    return q;
  };

  // ---- body (origin = the hip pivot, so sitting is a single rotation) ----
  const rig = grp(o),
    bd = grp(rig, 0, 0.32, -0.2);
  {
    const torso = add2(bd, SPH(0.15, 36, 28), mBody, 0, 0.045, 0.17, 0.95, 1.8, 0.92);
    torso.rotation.x = Math.PI / 2;
    [-1, 1].forEach((sg) => add2(bd, SPH(0.1), mFur, sg * 0.068, 0.01, 0.0, 0.85, 1.15, 1.25)); // haunches
    add2(bd, SPH(0.13), mLite, 0, -0.045, 0.2, 0.9, 0.55, 1.55); // soft belly
    add2(bd, SPH(0.105), mFur, 0, 0.12, 0.43, 1, 1.05, 1); // neck
    add2(bd, SPH(0.1), mWhite, 0, 0.0, 0.43, 1, 1.15, 0.8); // white bib
    // a ruff of chest fur: little white tufts
    for (let i = 0; i < 7; i++) {
      const a = (i / 6 - 0.5) * 2.2,
        t = add2(bd, new T.ConeGeometry(0.022, 0.07, 6), mWhite, Math.sin(a) * 0.075, -0.06, 0.47 + Math.cos(a) * 0.03);
      t.rotation.x = Math.PI - 0.4;
      t.rotation.z = -a * 0.3;
    }
  }

  // ---- collar and the lantern charm ----
  {
    const col = grp(bd, 0, 0.115, 0.445);
    col.rotation.x = Math.PI / 2 - 0.75;
    add2(col, new T.TorusGeometry(0.098, 0.016, 8, 32), mCollar);
    const ch = grp(bd, 0, 0.02, 0.535);
    add2(ch, new T.CylinderGeometry(0.004, 0.004, 0.025, 6), mBrass, 0, 0.022, 0, 0, 0, 0, 1);
    add2(ch, new T.CylinderGeometry(0.012, 0.018, 0.012, 8), mBrass, 0, 0.01, 0);
    add2(ch, SPH(0.016, 12, 10), mFlame, 0, -0.008, 0, 1, 1.25, 1, 1);
    [-1, 1].forEach((sg) =>
      add2(ch, new T.CylinderGeometry(0.0025, 0.0025, 0.03, 4), mBrass, sg * 0.016, -0.008, 0, 0, 0, 0, 1),
    );
    add2(ch, new T.CylinderGeometry(0.018, 0.01, 0.01, 8), mBrass, 0, -0.027, 0);
    const halo = new T.Sprite(AM(GLT));
    halo.material.color.setHex(0xffb060);
    halo.scale.setScalar(0.14);
    halo.position.set(0, -0.008, 0.01);
    halo.userData.nol = 1;
    ch.add(halo);
    c.flame = halo;
  }

  // ---- head ----
  const hd = grp(bd, 0, 0.2, 0.52),
    hi = grp(hd); // hi carries the cat's own head moves; 05-ambient turns hd to look at you
  add2(hi, SPH(0.13, 36, 28), mHead, 0, 0, 0, 1.1, 0.95, 1.0).rotation.y = 0;
  [-1, 1].forEach((sg) => add2(hi, SPH(0.07), mFur, sg * 0.078, -0.045, 0.045, 1.1, 0.9, 1)); // cheeks
  [-1, 1].forEach((sg) => add2(hi, SPH(0.045), mWhite, sg * 0.03, -0.058, 0.108, 1.05, 0.85, 1)); // muzzle pads
  add2(hi, SPH(0.034), mWhite, 0, -0.088, 0.085, 1, 0.8, 1); // chin
  add2(hi, SPH(0.03), mWhite, 0, -0.02, 0.118, 0.8, 1.3, 0.7); // white blaze between the eyes
  add2(hi, SPH(0.018, 12, 10), mNose, 0, -0.03, 0.143, 1.35, 0.8, 0.8, 1); // nose
  const eyes = [-1, 1].map((sg) => {
    const e = grp(hi, sg * 0.056, 0.012, 0.1);
    e.rotation.y = sg * 0.38;
    add2(e, SPH(0.031, 20, 16), mIris, 0, 0, 0, 1, 0.95, 0.55, 1);
    add2(e, SPH(0.028, 12, 10), mPupil, 0, 0, 0.012, 0.22, 0.88, 0.3, 1);
    add2(e, SPH(0.007, 8, 6), mShine, 0.009, 0.012, 0.02, 1, 1, 1, 1);
    add2(e, SPH(0.004, 6, 4), mShine, -0.008, -0.008, 0.019, 1, 1, 1, 1);
    // upper lid line: a thin dark crescent that sits just over each eye
    const lid = add2(e, new T.TorusGeometry(0.03, 0.0045, 4, 16, Math.PI), mPupil, 0, 0.002, 0.008, 1, 1, 0.6, 1);
    lid.rotation.z = 0;
    return e;
  });
  const ears = [-1, 1].map((sg) => {
    const e = grp(hi, sg * 0.075, 0.095, -0.01);
    e.rotation.set(-0.1, 0, -sg * 0.32);
    const ou = add2(e, new T.ConeGeometry(0.058, 0.115, 4), mFur, 0, 0.05, 0, 1, 1, 0.42);
    ou.rotation.y = Math.PI / 4;
    const inn = add2(e, new T.ConeGeometry(0.04, 0.085, 4), mPink, 0, 0.043, 0.013, 1, 1, 0.3, 1);
    inn.rotation.y = Math.PI / 4;
    const tuft = add2(e, new T.ConeGeometry(0.014, 0.05, 5), mWhite, sg * -0.01, 0.03, 0.02, 1, 1, 1, 1);
    tuft.rotation.z = sg * 0.3;
    return e;
  });
  // whiskers: three a side, fanning out from the muzzle
  {
    const v = [];
    [-1, 1].forEach((sg) =>
      [-0.012, 0.0, 0.012].forEach((dy, k) => {
        v.push(sg * 0.05, -0.06 + dy, 0.12, sg * 0.2, -0.05 + dy * 2.6 - 0.012 + k * 0.006, 0.1 - k * 0.015);
      }),
    );
    const wg = new T.BufferGeometry();
    wg.setAttribute("position", new T.Float32BufferAttribute(v, 3));
    const wh = new T.LineSegments(wg, new T.LineBasicMaterial({ color: 0xf6f0ff, transparent: true, opacity: 0.75 }));
    wh.userData.nol = 1;
    hi.add(wh);
  }

  // ---- legs: two bones each, white socks and paw pads ----
  const leg = (x, y, z, front) => {
    const up = grp(bd, x, y, z),
      L1 = front ? 0.15 : 0.17,
      L2 = front ? 0.15 : 0.165,
      r0 = front ? 0.04 : 0.052;
    add2(up, new T.CylinderGeometry(r0, 0.034, L1, 14), front ? mFur : mFur, 0, -L1 / 2, 0);
    add2(up, SPH(r0, 14, 10), mFur, 0, 0, 0);
    const lo = grp(up, 0, -L1, 0);
    add2(lo, SPH(0.034, 12, 10), mFur, 0, 0, 0);
    add2(lo, new T.CylinderGeometry(0.032, 0.03, L2 - 0.03, 12), mFur, 0, -(L2 - 0.03) / 2, 0);
    const sock = add2(lo, new T.CylinderGeometry(0.032, 0.034, 0.06, 12), mWhite, 0, -L2 + 0.05, 0);
    sock.userData.k = 1;
    const paw = grp(lo, 0, -L2 + 0.02, 0.012);
    add2(paw, SPH(0.042, 16, 12), mWhite, 0, 0, 0, 1, 0.62, 1.3);
    [-1, 0, 1].forEach((k) => add2(paw, SPH(0.011, 8, 6), mPad, k * 0.017, -0.022, 0.038, 1, 0.5, 1, 1));
    return { up, lo, paw, front };
  };
  const legs = [
    leg(-0.066, -0.02, 0.38, 1), // front left
    leg(0.066, -0.02, 0.38, 1), // front right
    leg(-0.078, 0.0, 0.0, 0), // back left
    leg(0.078, 0.0, 0.0, 0), // back right
  ];

  // ---- tail: 12 bones, thinning to a dark tip ----
  const tailR = grp(bd, 0, 0.085, -0.09),
    tail = [];
  {
    let par = tailR;
    for (let i = 0; i < 12; i++) {
      const b = grp(par, 0, i ? 0.058 : 0, 0),
        r1 = 0.038 - i * 0.0018,
        r2 = 0.038 - (i + 1) * 0.0018;
      const m = add2(b, new T.CylinderGeometry(r2, r1, 0.062, 12), i > 9 ? mFur : mTail, 0, 0.029, 0);
      m.material = i > 9 ? toon({ color: 0x2d2738 }) : mTail;
      add2(b, SPH(r1, 12, 8), i > 9 ? m.material : mFur, 0, 0, 0);
      tail.push(b);
      par = b;
    }
    add2(par, SPH(0.017, 10, 8), toon({ color: 0x2d2738 }), 0, 0.058, 0);
  }

  outline(rig);
  o.scale.setScalar(1.12);
  // 05-ambient's cat code turns pt.hd and sways pt.t; the new rig keeps both names
  c.pt = { hd, t: tailR };
  c.rig = { bd, hd, hi, eyes, ears, legs, tail, tailR };
  c.cs = {
    ph: 0,
    mv: 0,
    sit: 0,
    loaf: 0,
    groom: 0,
    pose: "stand",
    still: 0,
    blink: 2,
    ear: 1.5,
    px: o.position.x,
    pz: o.position.z,
    hearts: [],
    ht: 0,
  };
  c.anim = catAnim;
})();

// a little heart for purring (drawn once)
const CATHT = (() => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const x = cv.getContext("2d");
  x.fillStyle = "#ff8fb0";
  x.strokeStyle = "#5a1a3a";
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(32, 54);
  x.bezierCurveTo(4, 34, 8, 8, 32, 20);
  x.bezierCurveTo(56, 8, 60, 34, 32, 54);
  x.fill();
  x.stroke();
  return new T.CanvasTexture(cv);
})();
const lerpK = (a, b, k) => a + (b - a) * k;
// called every frame by 05-ambient for the cat (after it has moved her): walk cycle, poses, blinking, purring
function catAnim(c, dt, s, d) {
  const R = c.rig,
    cs = c.cs,
    q = c.o.position;
  if (!R || !cs) return;
  dt = Math.min(dt, 0.05);
  const sp = Math.hypot(q.x - cs.px, q.z - cs.pz) / Math.max(dt, 0.001);
  cs.px = q.x;
  cs.pz = q.z;
  cs.mv += ((sp > 0.25 ? 1 : 0) - cs.mv) * Math.min(1, dt * 8);
  const mv = cs.mv;
  // poses while she stands still: sit a moment, then sometimes groom or stretch out like a sphinx
  if (mv > 0.5) {
    cs.still = 0;
    cs.pose = "stand";
  } else {
    cs.still += dt;
    if (cs.pose === "stand" && cs.still > 0.8) cs.pose = d < 4 || Math.random() < 0.7 ? "sit" : "loaf";
    else if (cs.pose === "sit" && cs.still > 4 && Math.random() < dt * 0.25) cs.pose = d < 4 ? "loaf" : "groom";
    else if (cs.pose === "groom" && Math.random() < dt * 0.3) cs.pose = "sit";
    else if (cs.pose === "loaf" && d > 6 && Math.random() < dt * 0.1) cs.pose = "sit";
  }
  const k = Math.min(1, dt * 4);
  cs.sit = lerpK(cs.sit, cs.pose === "sit" || cs.pose === "groom" ? 1 : 0, k);
  cs.loaf = lerpK(cs.loaf, cs.pose === "loaf" ? 1 : 0, k);
  cs.groom = lerpK(cs.groom, cs.pose === "groom" ? 1 : 0, k);
  const st = cs.sit,
    lf = cs.loaf,
    gm = cs.groom,
    rest = Math.min(1, st + lf);
  cs.ph += dt * Math.min(sp, 2.5) * 9;
  const ph = cs.ph;
  // body: hips drop when sitting, the whole cat lowers for the sphinx pose, a soft bob in the walk and breathing
  const br = Math.sin(s * 2.4) * 0.012;
  R.bd.position.y = 0.32 - 0.22 * st - 0.19 * lf + Math.abs(Math.sin(ph)) * 0.012 * mv;
  R.bd.rotation.x = -0.62 * st + 0.04 * lf;
  R.bd.rotation.z = Math.sin(ph) * 0.03 * mv;
  R.bd.scale.set(1 + br * 0.5, 1 + br, 1);
  // legs (front left/right, back left/right): diagonal pairs swing together
  R.legs.forEach((L, i) => {
    const off = i === 0 || i === 3 ? 0 : Math.PI,
      sw = Math.sin(ph + off) * mv,
      lift = Math.max(0, Math.cos(ph + off)) * mv;
    let u, l;
    if (L.front) {
      u = 0.1 + sw * 0.45 + 0.62 * st - 1.55 * lf;
      l = -0.1 + lift * 0.7 + 0.1 * lf;
      if (i === 1 && gm > 0.01) {
        // grooming: the right forepaw comes up to the face
        u = lerpK(u, -1.6 + Math.sin(s * 9) * 0.12, gm);
        l = lerpK(l, -1.7, gm);
      }
    } else {
      u = -0.35 + sw * 0.4 - 0.78 * st - 1.25 * lf;
      l = 0.6 + lift * 0.5 + 0.2 * st + 1.6 * lf;
    }
    L.up.rotation.x = u;
    L.lo.rotation.x = l;
    L.paw.rotation.x = -(u + l + R.bd.rotation.x); // paws stay flat on the ground
  });
  // head: level out while sitting, tilt and lick while grooming, little nods in the walk
  R.hi.rotation.x = 0.5 * st - 0.05 * lf + 0.35 * gm + Math.sin(s * 9) * 0.06 * gm + Math.sin(ph * 2) * 0.03 * mv;
  R.hi.rotation.z = 0.35 * gm + Math.sin(s * 0.7) * 0.05 * (1 - mv);
  // tail: up with a hooked tip while walking, low and swishing standing, curled round her paws when resting
  R.tailR.rotation.x = lerpK(lerpK(-1.35, -0.45, mv), -2.45, rest);
  R.tailR.rotation.z = Math.sin(s * 1.6) * 0.25 * (1 - rest);
  R.tail.forEach((b, i) => {
    const w = Math.sin(s * 2.2 - i * 0.5);
    b.rotation.x = i ? lerpK(lerpK(0.06, i > 7 ? 0.28 : -0.02, mv), 0.0, rest) : 0;
    b.rotation.z = i ? lerpK(w * 0.1, 0.24 + Math.sin(s * 1.3 + i * 0.3) * (i > 8 ? 0.15 : 0.01), rest) : 0;
  });
  // blinking and ear twitches
  cs.blink -= dt;
  const bl = cs.blink < 0.11 ? 0.08 : st > 0.9 && d < 3 ? 0.55 : 1; // half-closed, content eyes when you're near
  R.eyes.forEach((e) => (e.scale.y += (bl - e.scale.y) * Math.min(1, dt * 25)));
  if (cs.blink < 0) cs.blink = 2 + Math.random() * 4;
  cs.ear -= dt;
  const tw = cs.ear < 0.15;
  R.ears.forEach((e, i) => (e.rotation.x = -0.1 - (tw && i === (cs.ei | 0) ? 0.5 : 0)));
  if (cs.ear < 0) {
    cs.ear = 1.5 + Math.random() * 4;
    cs.ei = Math.random() < 0.5 ? 0 : 1;
  }
  if (c.flame) c.flame.material.opacity = 0.75 + Math.sin(s * 7) * 0.15;
  // purring: hearts drift up while you stand close and she is settled
  cs.ht -= dt;
  if (d < 3 && rest > 0.7 && mode === "explore" && cs.ht < 0) {
    cs.ht = 1.1 + Math.random() * 0.8;
    const h = new T.Sprite(new T.SpriteMaterial({ map: CATHT, transparent: true, depthWrite: false }));
    h.scale.setScalar(0.16);
    h.position.set((Math.random() - 0.5) * 0.25, 0.7, 0.25);
    c.o.add(h);
    cs.hearts.push({ h, t: 0 });
  }
  for (let i = cs.hearts.length - 1; i >= 0; i--) {
    const H = cs.hearts[i];
    H.t += dt;
    H.h.position.y += dt * 0.35;
    H.h.position.x += Math.sin(H.t * 4) * dt * 0.08;
    H.h.material.opacity = Math.max(0, 1 - H.t / 1.6);
    if (H.t > 1.6) {
      c.o.remove(H.h);
      H.h.material.dispose();
      cs.hearts.splice(i, 1);
    }
  }
}
