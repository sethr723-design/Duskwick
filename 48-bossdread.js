// DUSKWICK - 48-bossdread.js (v34) — loads LAST
// Boss presence: every boss and road mini boss gets
//  1) dressing on its model (world + battle): a turning rune sigil under its feet, rising motes in its colour and a
//     signature piece (floating crown, orbiting shards, runes, ghost lanterns or a crown of fire). It flares when the boss
//     notices you, burns hotter when it is enraged (< 25% HP) and breaks apart when it falls.
//  2) a personality: epithet, temperament (roar / stomp / regal / creep), a warning line when you walk close in the
//     world, taunts every few rounds and an enrage line.
//  3) an intro cutscene when its fight opens (wraps `turn`: the first round waits for it). Letterbox, low shot, the
//     temperament's beat (shake, rings, sound) and a title card. Full the first time (`P.bseen`, made lazily), short after.
//     Click / Space / Esc skips. Camera through the `pracCam` hook (BG-local coords), handed back with camK = 0.
// Only top-level name: BDX. Parts are children of the boss root, fresh materials, no lights, `userData.lus = 1`.
const BDX = (() => {
  const V3 = (x, y, z) => new T.Vector3(x, y, z),
    now = () => performance.now(),
    S2 = Math.sin,
    TAU = Math.PI * 2;
  // ---------- personalities ----------
  // c colour, sg signature, md temperament, el puff kind, ep epithet, w warning, t taunts, e enrage line
  const BOSS = {
    warden: {
      ep: "Warden of the Gloomspire",
      c: 0x8a6cff,
      sg: "crown",
      md: "regal",
      el: "spirit",
      w: "The air at the top of the spire turns heavy. Something old is watching you climb.",
      t: ["Your light flickers. I can hear it.", "Kneel, lamplighter. The dusk is patient. I am not."],
      e: "Enough games. Let the spire go DARK!",
    },
    fiend: {
      ep: "Gorger of Lamplight",
      c: 0xff6a2a,
      sg: "flames",
      md: "roar",
      el: "fire",
      w: "Somewhere ahead, something is crunching on lamp glass... and giggling.",
      t: ["Pop! Ha! Missed one!", "More! Give me more light to eat!"],
      e: "I'm STARVING! Give me that lantern!",
    },
    "Mossbound Tyrant": {
      ep: "Lord of the Rotting Grove",
      c: 0x6ad04a,
      sg: "runes",
      md: "stomp",
      el: "heal",
      w: "The moss underfoot is warm. And it is moving.",
      t: ["Every step you take, my roots take two.", "Rot is patient. Rot always wins."],
      e: "THE GROVE RISES WITH ME!",
    },
    "Rimefang Matriarch": {
      ep: "Mother of the Long Winter",
      c: 0x9ad8ff,
      sg: "shards",
      md: "roar",
      el: "ice",
      w: "A howl rolls down the cave. The pups go quiet. Mother is awake.",
      t: ["Your breath steams, little light. I can follow it anywhere.", "The pack eats tonight."],
      e: "AWOOOOO! The whole winter howls with me!",
    },
    "Kiln Mother": {
      ep: "Queen of the Cinder Brood",
      c: 0xff8a3a,
      sg: "crown",
      md: "roar",
      el: "fire",
      w: "The walls tick with heat. Somewhere deeper, a great kiln breathes.",
      t: ["My brood is always hungry. Be a dear and hold still.", "You'll fire up nicely."],
      e: "INTO THE KILN WITH YOU!",
    },
    "Rimefang Twin-Maw": {
      ep: "Two Hungers, One Pelt",
      c: 0xa8e4ff,
      sg: "shards",
      md: "roar",
      el: "ice",
      w: "Two sets of tracks lead up the road... but only one beast made them.",
      t: ["Left head: Mine! Right head: MINE!", "We always share. You'll be split nicely."],
      e: "BOTH HEADS. NO MORE SHARING.",
    },
    "The Lake Lurker": {
      ep: "The Thing Beneath the Ice",
      c: 0x5ab8d8,
      sg: "shards",
      md: "creep",
      el: "ice",
      w: "The ice groans under your boots. Something knocks back from below.",
      t: ["Blub. Blub. You're standing on a crack, you know.", "The dark water is lovely. Come see."],
      e: "THE WHOLE LAKE IS MY MOUTH!",
    },
    "Runebound Sentinel": {
      ep: "The Stone That Remembers",
      c: 0x7ab0ff,
      sg: "runes",
      md: "stomp",
      el: "storm",
      w: "Old runes on the stones ahead begin to glow, one by one, as you approach.",
      t: ["THREAT LEVEL: SMALL. RESPONSE LEVEL: LARGE.", "THE STONES HAVE COUNTED YOUR STEPS."],
      e: "ALL WARDS OVERRIDDEN. MAXIMUM PUNCHING.",
    },
    "Grumm the Trapper": {
      ep: "Collector of Things That Wander",
      c: 0xd8a85a,
      sg: "shards",
      md: "stomp",
      el: "slash",
      w: "Snapped traps line the road. Someone has been very busy. Someone big.",
      t: [
        "Grumm has a sack with your name on it! Grumm can't read, but still!",
        "Hold still! Grumm is gentle! Mostly!",
      ],
      e: "GRUMM ANGRY NOW. GRUMM BRING ALL THE TRAPS!",
    },
    Magmaw: {
      ep: "The Belching Pit",
      c: 0xff5a1a,
      sg: "flames",
      md: "roar",
      el: "fire",
      w: "The ground ahead bubbles. A wet, enormous croak shakes the rocks.",
      t: ["Ribbit. (Sparks rain down.)", "BRRAP! (That one smelled like sulphur.)"],
      e: "BRRRRRRRAAAAAAAP!!",
    },
    "The Obsidian Gatekeeper": {
      ep: "None Shall Pass",
      c: 0xc05aff,
      sg: "crown",
      md: "regal",
      el: "spirit",
      w: "A black gate looms ahead. Beside it, a figure has not moved in a hundred years. Until now.",
      t: [
        "The gate has stood ten thousand years. You will not stand ten minutes.",
        "Kneel and I may let you crawl back.",
      ],
      e: "THE GATE IS SHUT. FOREVER.",
    },
    "The Anvil Colossus": {
      ep: "The Forge That Walks",
      c: 0xffa040,
      sg: "runes",
      md: "stomp",
      el: "fire",
      w: "CLANG... CLANG... The steps shudder in time with a giant hammer.",
      t: ["MEASURING YOU FOR THE MOULD.", "TOO SOFT. NEEDS MORE HEAT."],
      e: "FURNACE AT FULL. YOU WILL BE RE-FORGED.",
    },
    "Granny Hollowroot": {
      ep: "Witch of the Sinking Hut",
      c: 0x9adf5a,
      sg: "lanterns",
      md: "creep",
      el: "heal",
      w: "Smells like soup. Very good soup. Very... suspicious soup.",
      t: ["Eat up, dearie, you're skin and bones!", "Granny's got a spot in the pot just your size."],
      e: "THAT'S IT! NO PUDDING FOR YOU! EVER!",
    },
    "The Drowned Bellringer": {
      ep: "Who Tolls for the Drowned",
      c: 0x6ae0c8,
      sg: "lanterns",
      md: "creep",
      el: "spirit",
      w: "Far under the bog, a bell tolls once. Then again. Closer.",
      t: ["Can you hear it? Your name, in the bell.", "One more toll, and you'll stay with us."],
      e: "EVERY BELL! EVERY NAME! RING!",
    },
    "Old Mossback": {
      ep: "Bearer of the Sunken Shrine",
      c: 0x8ac860,
      sg: "runes",
      md: "stomp",
      el: "heal",
      w: "What you took for a hill... just breathed out.",
      t: ["Hmmmm. You are... very... fast. That is rude.", "Three hundred years. You are a blink."],
      e: "Hmmmm. NOW... I AM... ANGRY.",
    },
    "The Lantern Mother": {
      ep: "Shepherd of Lost Lights",
      c: 0xffd27a,
      sg: "lanterns",
      md: "regal",
      el: "spirit",
      w: "Soft lights bob through the reeds, beckoning. They look like little lanterns. They look like lamplighters.",
      t: ["Shh, child. The glow will hold you.", "I have room for one more lantern. Yours."],
      e: "YOU WILL HANG WITH MY LIGHTS FOREVER!",
    },
    "Skarn the Hoarfrost Wyrm": {
      ep: "Breath of the Frozen Deep",
      c: 0xbfe8ff,
      sg: "shards",
      md: "roar",
      el: "ice",
      w: "The cave breathes out. Frost races across the walls toward you.",
      t: [
        "I have frozen kings in this hoard. You are not a king.",
        "Your little fire. I could put it out with a sigh.",
      ],
      e: "THE DEEP WINTER COMES WITH ME!",
    },
    "Hargrim the Last Forgemaster": {
      ep: "Keeper of the Dying Furnace",
      c: 0xff7a2a,
      sg: "flames",
      md: "stomp",
      el: "fire",
      w: "Hammer blows ring through the forge. Slow. Heavy. Grieving.",
      t: ["Every forgemaster before me fell here. I will not be the last to fall.", "Your steel is weak. Mine is old."],
      e: "THE FURNACE WILL NOT GO OUT. NOT WHILE I STAND!",
    },
    "The Drowned Abbess": {
      ep: "She Who Sings Beneath",
      c: 0x7ae0ff,
      sg: "lanterns",
      md: "regal",
      el: "spirit",
      w: "A hymn drifts up through the flooded stones. The candles below all lean toward you.",
      t: ["Pray, lamplighter. It will not help, but pray.", "The water keeps every vow. And every voice."],
      e: "LET THE DEEP TAKE ITS TITHE!",
    },
  };
  // which BOSS entry a foe uses (battle foe or world foe)
  function bkey(f) {
    if (!f) return null;
    const sp = Array.isArray(f.bsp) ? f.bsp[0] : f.bsp;
    const nm = f.nm || (sp && sp.nm);
    if (nm && BOSS[nm]) return nm;
    if (f.kind === "gloom" && f.t === 5 && !f.min) return "warden";
    if (f.kind === "gloom" && f.t >= 4 && f.boss && !f.min && !nm) return "fiend";
    return null;
  }
  // ---------- shared textures / geometry ----------
  function cvs(n, draw) {
    const c = document.createElement("canvas");
    c.width = c.height = n;
    draw(c.getContext("2d"), n);
    const t = new T.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }
  const SIGT = cvs(256, (x, n) => {
    const m = n / 2;
    x.strokeStyle = "#fff";
    x.fillStyle = "#fff";
    x.shadowColor = "#fff";
    x.shadowBlur = 8;
    [0.96, 0.82, 0.5].forEach((r, i) => {
      x.lineWidth = i === 1 ? 2 : 4;
      x.beginPath();
      x.arc(m, m, m * r, 0, TAU);
      x.stroke();
    });
    // star between the inner rings
    x.lineWidth = 3;
    x.beginPath();
    for (let i = 0; i <= 7; i++) {
      const a = (i * 3 * TAU) / 7 - Math.PI / 2;
      x[i ? "lineTo" : "moveTo"](m + Math.cos(a) * m * 0.8, m + S2(a) * m * 0.8);
    }
    x.stroke();
    // glyph ticks around the band
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU,
        r = m * 0.89;
      x.save();
      x.translate(m + Math.cos(a) * r, m + S2(a) * r);
      x.rotate(a + Math.PI / 2);
      const k = i % 4;
      x.fillRect(-1.5, -7, 3, 14);
      if (k === 1) x.fillRect(-6, -7, 12, 3);
      if (k === 2) x.fillRect(-6, 4, 12, 3);
      if (k === 3) {
        x.beginPath();
        x.arc(0, 0, 5, 0, TAU);
        x.stroke();
      }
      x.restore();
    }
  });
  const RUNT = cvs(64, (x, n) => {
    x.strokeStyle = "#fff";
    x.lineWidth = 5;
    x.shadowColor = "#fff";
    x.shadowBlur = 6;
    x.beginPath();
    x.moveTo(32, 8);
    x.lineTo(32, 56);
    x.moveTo(32, 18);
    x.lineTo(50, 30);
    x.moveTo(32, 30);
    x.lineTo(14, 42);
    x.moveTo(20, 10);
    x.lineTo(44, 10);
    x.stroke();
  });
  const GEO = {
    plane: new T.PlaneGeometry(1, 1),
    spike: new T.ConeGeometry(0.11, 0.55, 5),
    band: new T.TorusGeometry(0.5, 0.05, 6, 24),
    shard: new T.OctahedronGeometry(0.26, 0),
    lamp: new T.CylinderGeometry(0.12, 0.15, 0.32, 6),
    cap: new T.ConeGeometry(0.17, 0.16, 6),
  };
  const add = (c) =>
    new T.MeshBasicMaterial({
      color: c,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      side: T.DoubleSide,
      fog: true,
    });
  const spr = (c, s) => {
    const m = new T.Sprite(
      new T.SpriteMaterial({ map: GLT, color: c, transparent: true, depthWrite: false, blending: T.AdditiveBlending }),
    );
    m.scale.setScalar(s);
    return m;
  };
  const tag = (o) => {
    o.userData.lus = 1;
    o.userData.dtx = 0;
    return o;
  };
  // ---------- dressing ----------
  const LIVE = []; // { root, g, k, B, h, w, sig, motes, sp: [[obj, fn]], f, world, flare, enr, die }
  function size(root) {
    const b = new T.Box3().setFromObject(root),
      sc = root.getWorldScale(V3(0, 0, 0)).x || 1;
    if (b.isEmpty()) return [3, 1];
    const h = (b.max.y - b.min.y) / sc,
      w = Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2 / sc;
    return [Math.max(1.6, Math.min(9, h)), Math.max(0.7, Math.min(4.5, w))];
  }
  function dress(root, k, f, world) {
    if (!root || root.userData.bdx) return null;
    const B = BOSS[k];
    if (!B) return null;
    root.userData.bdx = 1;
    const [h, w] = size(root),
      g0 = tag(new T.Group()),
      col = new T.Color(B.c),
      D = { root, g: g0, k, B, h, w, f, world, sp: [], flare: 0, enr: 0, die: 0, ph: Math.random() * 10, col };
    g0.name = "bdx";
    // sigil
    const sm = add(B.c);
    sm.map = SIGT;
    sm.opacity = 0.55;
    const sig = tag(new T.Mesh(GEO.plane, sm));
    sig.rotation.x = -Math.PI / 2;
    sig.position.y = 0.07;
    sig.scale.setScalar(w * 2.2 + 2.2);
    sig.renderOrder = 2;
    g0.add(sig);
    D.sig = sig;
    // motes
    D.motes = [];
    for (let i = 0; i < 7; i++) {
      const m = tag(spr(B.c, 0.35));
      m.userData.o = Math.random();
      g0.add(m);
      D.motes.push(m);
    }
    // signature
    SIG[B.sg](D, g0);
    root.add(g0);
    LIVE.push(D);
    return D;
  }
  const SIG = {
    crown(D, g0) {
      const cg = tag(new T.Group()),
        dark = new T.MeshStandardMaterial({
          color: 0x1a1424,
          roughness: 0.4,
          metalness: 0.7,
          emissive: D.B.c,
          emissiveIntensity: 0.35,
        }),
        tip = add(D.B.c);
      tip.opacity = 0.9;
      dark.userData.dtx = 0;
      const R = Math.min(0.75, 0.3 + D.w * 0.18);
      const band = tag(new T.Mesh(GEO.band, dark));
      band.rotation.x = Math.PI / 2;
      band.scale.setScalar(R * 2);
      cg.add(band);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU,
          big = i % 2 === 0,
          s = tag(new T.Mesh(GEO.spike, dark));
        s.position.set(Math.cos(a) * R, big ? 0.32 : 0.22, S2(a) * R);
        s.scale.set(1, big ? 1.3 : 0.9, 1);
        s.rotation.z = -Math.cos(a) * 0.18;
        s.rotation.x = S2(a) * 0.18;
        cg.add(s);
        const t = tag(spr(D.B.c, 0.22));
        t.position.set(s.position.x, s.position.y + (big ? 0.38 : 0.27), s.position.z);
        cg.add(t);
      }
      const halo = tag(spr(D.B.c, R * 3.2));
      halo.material.opacity = 0.35;
      halo.position.y = 0.25;
      cg.add(halo);
      cg.position.y = D.h + 0.35;
      g0.add(cg);
      D.sp.push([
        cg,
        (o, s, D) => {
          o.rotation.y = s * 0.4;
          o.position.y = D.h + 0.35 + S2(s * 1.3 + D.ph) * 0.08;
          halo.material.opacity = 0.3 + 0.25 * D.flare + 0.1 * S2(s * 2);
        },
      ]);
    },
    shards(D, g0) {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const m = new T.MeshStandardMaterial({
          color: D.B.c,
          emissive: D.B.c,
          emissiveIntensity: 0.9,
          roughness: 0.2,
          metalness: 0.3,
          transparent: true,
          opacity: 0.9,
        });
        m.userData.dtx = 0;
        const o = tag(new T.Mesh(GEO.shard, m));
        o.scale.set(0.7 + (i % 3) * 0.25, 1.4 + (i % 2) * 0.6, 0.7);
        g0.add(o);
        const a0 = (i / n) * TAU;
        D.sp.push([
          o,
          (o, s, D) => {
            const sp = 0.5 + D.enr * 0.9,
              a = a0 + s * sp,
              r = D.w + 0.7 + S2(s * 0.7 + i) * 0.15;
            o.position.set(Math.cos(a) * r, D.h * (0.45 + 0.18 * S2(s * 1.1 + i * 1.7)), S2(a) * r);
            o.rotation.set(s * 1.3 + i, s * 0.9, s * 0.7 + i);
          },
        ]);
      }
    },
    runes(D, g0) {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const m = add(D.B.c);
        m.map = RUNT;
        const o = tag(new T.Mesh(GEO.plane, m));
        o.scale.setScalar(0.65);
        g0.add(o);
        const a0 = (i / n) * TAU;
        D.sp.push([
          o,
          (o, s, D) => {
            const a = a0 + s * (0.35 + D.enr * 0.8),
              r = D.w + 0.9;
            o.position.set(Math.cos(a) * r, D.h * 0.55 + S2(s * 1.4 + i) * 0.3, S2(a) * r);
            o.rotation.y = -a + Math.PI / 2;
            m.opacity = (0.55 + 0.35 * S2(s * 3 + i * 1.3)) * (0.7 + D.flare * 0.6);
          },
        ]);
      }
    },
    lanterns(D, g0) {
      const n = 4;
      for (let i = 0; i < n; i++) {
        const lg = tag(new T.Group()),
          frm = new T.MeshStandardMaterial({ color: 0x2a2230, roughness: 0.6, metalness: 0.5 });
        frm.userData.dtx = 0;
        const glass = new T.MeshBasicMaterial({ color: D.B.c, transparent: true, opacity: 0.75 });
        lg.add(tag(new T.Mesh(GEO.lamp, glass)));
        const cap = tag(new T.Mesh(GEO.cap, frm));
        cap.position.y = 0.24;
        lg.add(cap);
        const gl = tag(spr(D.B.c, 1.1));
        gl.material.opacity = 0.6;
        lg.add(gl);
        g0.add(lg);
        const a0 = (i / n) * TAU;
        D.sp.push([
          lg,
          (o, s, D) => {
            const a = a0 + s * 0.22,
              r = D.w + 1.1 + S2(s * 0.5 + i) * 0.2;
            o.position.set(Math.cos(a) * r, D.h * 0.72 + S2(s * 1.2 + i * 2) * 0.25, S2(a) * r);
            o.rotation.z = S2(s * 1.7 + i) * 0.25;
            gl.material.opacity = 0.45 + 0.25 * S2(s * 5 + i * 3) + 0.3 * D.flare;
          },
        ]);
      }
    },
    flames(D, g0) {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const o = tag(spr(i % 3 ? D.B.c : 0xffe08a, 0.6));
        g0.add(o);
        const a0 = (i / n) * TAU;
        D.sp.push([
          o,
          (o, s, D) => {
            const a = a0 + s * 0.6,
              r = Math.min(0.9, 0.35 + D.w * 0.2),
              fl = 0.5 + 0.3 * S2(s * 9 + i * 2.1) + 0.2 * S2(s * 13 + i);
            o.position.set(Math.cos(a) * r, D.h + 0.15 + fl * 0.25, S2(a) * r);
            o.scale.set(0.45 * (1 + D.enr * 0.5), 0.8 * fl * (1 + D.enr * 0.7) + 0.2, 1);
            o.material.opacity = 0.6 + 0.3 * D.flare;
          },
        ]);
      }
    },
  };
  // ---------- per-frame ----------
  const RED = new T.Color(0xff3a2a),
    TMP = new T.Color(),
    WP = V3(0, 0, 0);
  let lastT = now();
  function tick() {
    requestAnimationFrame(tick);
    const t = now(),
      dt = Math.min(0.05, (t - lastT) / 1000),
      s = t / 1000;
    lastT = t;
    for (let i = LIVE.length - 1; i >= 0; i--) {
      const D = LIVE[i],
        r = D.root;
      if (!r.parent) {
        // battle meshes leave with clearAll; drop them (world roots come back, keep those)
        if (!D.world && ++D.gone > 120) LIVE.splice(i, 1);
        continue;
      }
      D.gone = 0;
      if (!r.visible) continue;
      if (D.world) {
        r.getWorldPosition(WP);
        const far = WP.distanceTo(C.position) > 95;
        D.g.visible = !far;
        if (far) continue;
      }
      const f = D.f;
      // battle state: enrage under 25% HP, break apart on death
      if (!D.world && f) {
        if (f.hp <= 0 || f.gone) D.die = Math.min(1, D.die + dt * 1.4);
        else D.enr += ((f.hp < f.max * 0.25 ? 1 : 0) - D.enr) * Math.min(1, dt * 2);
      }
      D.flare = Math.max(0, D.flare - dt * 0.8);
      const k = 1 - D.die;
      D.g.visible = k > 0.01;
      if (!D.g.visible) continue;
      TMP.copy(D.col).lerp(RED, D.enr * 0.6);
      D.sig.material.color.copy(TMP);
      D.sig.rotation.z = s * (0.25 + D.enr * 0.9) + D.ph;
      D.sig.material.opacity = (0.4 + 0.12 * S2(s * 2 + D.ph) + D.flare * 0.5 + D.enr * 0.2) * k;
      D.sig.scale.setScalar((D.w * 2.2 + 2.2) * (1 + D.flare * 0.15) * (0.6 + 0.4 * k));
      D.motes.forEach((m, n) => {
        const q = (m.userData.o + s * (0.18 + D.enr * 0.3)) % 1,
          a = n * 0.9 + s * 0.5;
        m.position.set(Math.cos(a) * D.w * 0.9, q * D.h * 1.15, S2(a) * D.w * 0.9);
        m.material.color.copy(TMP);
        m.material.opacity = S2(q * Math.PI) * 0.8 * k;
      });
      D.sp.forEach(([o, fn]) => {
        fn(o, s, D);
        if (D.die > 0) {
          // break apart: fly outward and fall
          o.position.multiplyScalar(1 + D.die * 1.5);
          o.position.y -= D.die * D.die * D.h * 0.6;
          o.scale.multiplyScalar(Math.max(0.01, k));
        }
      });
    }
  }
  requestAnimationFrame(tick);
  // ---------- dress world bosses now, battle bosses as they are made ----------
  function dressWorld() {
    foes.forEach((f) => {
      if (!f || !f.o || f.min || f.mb) return;
      if (!(f.boss || f.rbw || f.d2bw || f.dboss)) return;
      const k = bkey(f);
      if (k) dress(f.o, k, f, true);
    });
  }
  try {
    dressWorld();
  } catch (e) {
    console.warn("bossdread: dressing", e);
  }
  const nf0 = newFoe;
  newFoe = function (sp, slot) {
    const f = nf0.apply(this, arguments);
    try {
      if (f && f.boss && !f.min) {
        const k = bkey(f);
        if (k) {
          f.m.scale.multiplyScalar(1.1); // a little bigger than in the street: they mean it now
          f.th = (f.th || 3) * 1.1;
          f.bdx = dress(f.m, k, f, false);
        }
      }
    } catch (e) {
      console.warn("bossdread: battle dressing", e);
    }
    return f;
  };
  // ---------- sound ----------
  let AC = null;
  function ac() {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      return AC;
    } catch (e) {
      return null;
    }
  }
  function noise(a, len) {
    const b = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource();
    s.buffer = b;
    return s;
  }
  function env(a, gn, t0, pk, at, len) {
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(pk, t0 + at);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  }
  function osc(a, type, f0, f1, t0, len, pk, dst) {
    const o = a.createOscillator(),
      gn = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + len);
    env(a, gn, t0, pk, Math.min(0.08, len * 0.2), len);
    o.connect(gn).connect(dst || a.destination);
    o.start(t0);
    o.stop(t0 + len + 0.05);
  }
  const SND = {
    roar(a, t0) {
      const n = noise(a, 1.4),
        lp = a.createBiquadFilter(),
        gn = a.createGain();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(900, t0);
      lp.frequency.exponentialRampToValueAtTime(180, t0 + 1.3);
      env(a, gn, t0, 0.32, 0.06, 1.35);
      n.connect(lp).connect(gn).connect(a.destination);
      n.start(t0);
      osc(a, "sawtooth", 110, 42, t0, 1.2, 0.12);
      osc(a, "square", 74, 36, t0 + 0.05, 1.1, 0.05);
    },
    stomp(a, t0) {
      [0, 0.5, 1].forEach((d, i) => {
        osc(a, "sine", 90 - i * 8, 30, t0 + d, 0.45, 0.45);
        const n = noise(a, 0.2),
          lp = a.createBiquadFilter(),
          gn = a.createGain();
        lp.type = "lowpass";
        lp.frequency.value = 400;
        env(a, gn, t0 + d, 0.2, 0.01, 0.2);
        n.connect(lp).connect(gn).connect(a.destination);
        n.start(t0 + d);
      });
    },
    regal(a, t0) {
      [55, 82.4, 110, 130.8].forEach((f, i) => osc(a, i % 2 ? "triangle" : "sawtooth", f, f * 0.98, t0, 2.2, 0.07));
      const n = noise(a, 1.6),
        bp = a.createBiquadFilter(),
        gn = a.createGain();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(300, t0);
      bp.frequency.exponentialRampToValueAtTime(1600, t0 + 1.5);
      env(a, gn, t0, 0.06, 0.8, 1.6);
      n.connect(bp).connect(gn).connect(a.destination);
      n.start(t0);
    },
    creep(a, t0) {
      osc(a, "sine", 220, 140, t0, 1.6, 0.08);
      osc(a, "sine", 227, 150, t0, 1.6, 0.08);
      for (let i = 0; i < 7; i++) osc(a, "triangle", 500 + i * 70, 640 + i * 70, t0 + 0.5 + i * 0.09, 0.07, 0.05);
    },
    rumble(a, t0) {
      osc(a, "sine", 60, 38, t0, 1.4, 0.18);
      osc(a, "triangle", 45, 30, t0 + 0.1, 1.2, 0.08);
    },
  };
  function play(k) {
    const a = ac();
    if (!a) return;
    try {
      SND[k](a, a.currentTime + 0.02);
    } catch (e) {}
  }
  // ---------- overlay: letterbox, title card, small line box ----------
  const css = document.createElement("style");
  css.textContent =
    "#bdxl{position:fixed;inset:0;z-index:55;pointer-events:none;opacity:0;transition:opacity .35s}" +
    "#bdxl.on{opacity:1;pointer-events:auto;cursor:pointer}" +
    "#bdxl::before,#bdxl::after{content:'';position:absolute;left:0;right:0;height:0;background:#000;transition:height .5s}" +
    "#bdxl::before{top:0}#bdxl::after{bottom:0}#bdxl.on::before,#bdxl.on::after{height:10vh}" +
    "#bdxl .vg{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.65));opacity:0;transition:opacity .6s}" +
    "#bdxl.dim .vg{opacity:1}" +
    "#bdxt{position:absolute;left:0;right:0;bottom:14vh;text-align:center;opacity:0;transform:scale(1.25);transition:opacity .25s,transform .45s cubic-bezier(.2,1.4,.4,1)}" +
    "#bdxt.on{opacity:1;transform:scale(1)}" +
    "#bdxt .n{font:900 clamp(26px,5.6vw,58px)/1.05 Georgia,serif;letter-spacing:.06em;color:#fff;text-transform:uppercase;" +
    "text-shadow:0 0 18px var(--bc),0 0 4px var(--bc),0 4px 0 rgba(0,0,0,.6)}" +
    "#bdxt .e{font:italic 600 clamp(14px,2.2vw,20px)/1.4 Georgia,serif;color:var(--bc);letter-spacing:.12em;margin-top:6px;" +
    "text-shadow:0 2px 6px #000}" +
    "#bdxt .r{width:min(520px,70vw);height:2px;margin:10px auto 0;background:linear-gradient(90deg,transparent,var(--bc),transparent)}" +
    "#bdxs{position:absolute;right:16px;bottom:calc(10vh + 8px);font:600 12px system-ui,sans-serif;color:#aaa;opacity:.8}" +
    "#bdxw{position:fixed;left:50%;top:20%;transform:translateX(-50%);max-width:min(520px,90vw);z-index:58;pointer-events:none;" +
    "font:italic 600 16px/1.45 Georgia,serif;color:#e8dcff;text-align:center;padding:8px 14px;opacity:0;transition:opacity .6s;" +
    "text-shadow:0 2px 8px #000,0 0 14px rgba(0,0,0,.9)}" +
    "#bdxw.on{opacity:1}#bdxw b{display:block;font:800 13px system-ui,sans-serif;letter-spacing:.14em;color:var(--bc);font-style:normal}";
  document.head.appendChild(css);
  const lb = document.createElement("div");
  lb.id = "bdxl";
  lb.innerHTML =
    '<div class="vg"></div><div id="bdxt"><div class="n"></div><div class="e"></div><div class="r"></div></div>' +
    '<div id="bdxs">click to skip</div>';
  document.body.appendChild(lb);
  const wbox = document.createElement("div");
  wbox.id = "bdxw";
  document.body.appendChild(wbox);
  const hex = (c) => "#" + c.toString(16).padStart(6, "0");
  let wt = 0;
  function line(name, txt, c, ms) {
    wbox.style.setProperty("--bc", hex(c));
    wbox.innerHTML = (name ? "<b>" + name + "</b>" : "") + txt;
    wbox.classList.add("on");
    clearTimeout(wt);
    wt = setTimeout(() => wbox.classList.remove("on"), ms || 4200);
  }
  // ---------- intro cutscene ----------
  let CAM = null; // { cv, ct } in BG-local coords while an intro runs
  let skip = 0;
  const pc0 = typeof pracCam === "function" ? pracCam : () => false;
  pracCam = function (CV, CT) {
    if (CAM && mode === "battle") {
      CV.copy(CAM.cv);
      CV.x += (Math.random() - 0.5) * shk;
      CV.y += (Math.random() - 0.5) * shk;
      CT.copy(CAM.ct);
      return true;
    }
    return pc0(CV, CT);
  };
  lb.addEventListener("click", () => (skip = 1));
  window.addEventListener(
    "keydown",
    (e) => {
      if (!CAM) return;
      if (e.code === "Space" || e.code === "Escape" || e.code === "Enter") {
        skip = 1;
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  function intro(b, k, full) {
    const B = BOSS[k],
      D = b.bdx,
      bp = b.m.position.clone(),
      sc = b.m.scale.x,
      // v47 polish: frame the boss's real height (the stored D.h could aim the camera above it, at the HP bar)
      hb = (() => {
        try {
          const bx = new T.Box3().setFromObject(b.m),
            h = bx.max.y - Math.max(0, bx.min.y);
          if (isFinite(h) && h > 0.5 && h < 40) return h;
        } catch (e) {}
        return (D ? D.h : 3) * sc;
      })(),
      pl = V3(SLA[0][0], 0, SLA[0][1]),
      dir = pl.clone().sub(bp).setY(0).normalize(),
      side = V3(-dir.z, 0, dir.x),
      len = full ? 5200 : 2400,
      beat = full ? 1500 : 250,
      nm = b.nm || String(b.label || "").replace(/ \(boss\)$/, "");
    const t = lb.querySelector("#bdxt");
    t.style.setProperty("--bc", hex(B.c));
    t.querySelector(".n").textContent = nm;
    t.querySelector(".e").textContent = "— " + B.ep + " —";
    t.classList.remove("on");
    lb.classList.add("on");
    lb.classList.toggle("dim", B.md === "creep");
    lb.querySelector("#bdxs").style.display = full ? "" : "none";
    skip = 0;
    CAM = { cv: V3(0, 0, 0), ct: V3(0, 0, 0) };
    // v47 polish: look at the body (was .85 / .6 of the height) from further out (was hb * 1.1 + 5.5)
    const lookUp = bp.clone().setY(hb * 0.62),
      lookMid = bp.clone().setY(hb * 0.48),
      R = hb * 1.6 + 8.5;
    const at = (a, r, y) =>
      bp
        .clone()
        .addScaledVector(dir, Math.cos(a) * r)
        .addScaledVector(side, S2(a) * r)
        .setY(y);
    const beats = { stomp: [0, 480, 960], roar: [0], regal: [0], creep: [0, 700] }[B.md] || [0];
    const fired = {};
    const t0 = now();
    return new Promise((res) => {
      (function step() {
        const e = now() - t0;
        if (mode !== "battle" || !g || !g.foes || skip || e >= len) {
          CAM = null;
          t.classList.remove("on");
          lb.classList.remove("on", "dim");
          if (mode === "battle") {
            camFrom.copy(C.position);
            lookFrom.copy(LK);
            camK = 0; // the battle camera glides home from wherever the intro left it
          }
          return res();
        }
        // camera
        if (full && e < beat) {
          const q = ease(e / beat),
            r = hb * 1.1 + 6.5 - q * 1.2;
          CAM.cv.copy(at(0.55, r, 0.5 + q * 0.3));
          CAM.ct.copy(lookUp);
        } else {
          const q = ease(Math.min(1, (e - (full ? beat : 0)) / (len - (full ? beat : 0) - 300)));
          CAM.cv.copy(at(0.95 - q * 0.6, R * (1.08 - q * 0.12), hb * 0.55 + 1.2 + q * 0.6));
          CAM.ct.copy(full && e < beat + 300 ? lookUp : lookMid);
        }
        // temperament beats
        beats.forEach((d, i) => {
          const at2 = beat + d;
          if (e >= at2 && !fired[i]) {
            fired[i] = 1;
            // v47 polish: every boss fight opens with a roar and a camera quake
            if (i === 0) {
              play(B.md === "roar" ? "roar" : B.md);
              if (B.md !== "roar") setTimeout(() => play("roar"), 120);
              shk = Math.max(shk, 0.8);
            }
            if (D) D.flare = 1;
            if (B.md === "stomp") {
              shk = Math.max(shk, 0.5 + i * 0.15);
              ring(bp.x, B.c, 6 + i * 2, 650, bp.z);
              puff(bp.clone().setY(0.3), B.el, 8, 3, 0.6, 1);
            } else if (B.md === "roar") {
              shk = Math.max(shk, 0.75);
              ring(bp.x, B.c, 10, 900, bp.z);
              ring(bp.x, 0xffffff, 6, 500, bp.z);
              puff(bp.clone().setY(hb * 0.7), B.el, 18, 5, 0.9, 1.3);
            } else if (B.md === "regal") {
              shk = Math.max(shk, 0.25);
              ring(bp.x, B.c, 13, 1600, bp.z);
              puff(bp.clone().setY(hb + 0.5), B.el, 12, 1.6, 1.4, 1.1);
            } else {
              shk = Math.max(shk, 0.2);
              ring(bp.x, B.c, 4, 1200, bp.z);
              puff(bp.clone().setY(hb * 0.5), B.el, 6, 1.2, 1.2, 1.2);
            }
          }
        });
        if (e >= beat + 120) t.classList.add("on");
        if (e >= len - 600) t.classList.remove("on");
        requestAnimationFrame(step);
      })();
    });
  }
  const turn0 = turn;
  turn = function () {
    try {
      if (noIntro && mode === "battle" && g && g.turn === 0) {
        noIntro = 0; // the Warden's walk-up cutscene already introduced this fight
        g.bint = 1;
      }
      if (mode === "battle" && g && g.boss && g.turn === 0 && !g.prac && !g.bint) {
        const b = g.foes.find((f) => f.boss && !f.min),
          k = bkey(b);
        if (b && k && BOSS[k]) {
          g.bint = 1;
          P.bseen = P.bseen || {};
          const full = !P.bseen[k];
          P.bseen[k] = 1;
          if (full && typeof sv === "function") sv();
          const id = g.id,
            self = this,
            args = arguments;
          intro(b, k, full).then(() => {
            if (mode === "battle" && g.id === id && g.turn === 0) turn0.apply(self, args);
          });
          return;
        }
      }
    } catch (e) {
      console.warn("bossdread: intro", e);
      CAM = null;
    }
    return turn0.apply(this, arguments);
  };
  // ---------- battle taunts / enrage, world warnings ----------
  let bid = null,
    lastTurn = 0,
    enr = 0;
  const warned = {};
  setInterval(() => {
    if (typeof mode === "undefined") return;
    if (mode === "battle" && g && g.foes) {
      const b = g.foes.find((f) => f.boss && !f.min),
        k = bkey(b),
        B = k && BOSS[k];
      if (!B || CAM) return;
      if (bid !== g.id) {
        bid = g.id;
        lastTurn = g.turn;
        enr = 0;
      }
      const nm = b.nm || String(b.label || "").replace(/ \(boss\)$/, "");
      if (!enr && b.hp > 0 && b.hp < b.max * 0.25) {
        enr = 1;
        shk = Math.max(shk, 0.5);
        if (b.bdx) b.bdx.flare = 1;
        play(B.md === "creep" ? "creep" : "roar");
        line(nm, B.e, B.c, 3200);
        return;
      }
      if (g.turn !== lastTurn) {
        lastTurn = g.turn;
        if (g.turn >= 2 && g.turn % 3 === 0 && b.hp > 0 && !document.body.classList.contains("bsay"))
          line(nm, B.t[(g.turn / 3) % B.t.length | 0], B.c, 3400);
      }
      return;
    }
    if (mode !== "explore" || paused || document.body.classList.contains("cut")) return;
    const t = now();
    LIVE.forEach((D) => {
      if (!D.world || !D.f || D.f.dead || !D.root.visible || !D.root.parent) return;
      D.root.getWorldPosition(WP);
      const d = Math.hypot(WP.x - W.position.x, WP.z - W.position.z);
      if (d < 24 && !(warned[D.k] > t)) {
        warned[D.k] = t + 120000;
        D.flare = 1;
        play("rumble");
        line("", D.B.w, D.B.c, 4800);
      }
    });
  }, 400);
  // ---------- the Gloom Warden: walk-up cutscene on the Gloomspire top ----------
  // Plays once per character (lazy P.wcut) the first time you come within WR of the living Warden, then starts the
  // fight. Uses the 04-gates cutscene rig (mode "cut", CUT, CSO, CSP/CSLK, csCam/csGo/csCap/csQuake/csW).
  // BDX.warden() in the console replays it.
  let noIntro = 0,
    wBusy = 0;
  const WR = 14,
    wardenF = () => foes.find((f) => f.tw === 3 && f.kind === "gloom" && f.t === 5 && !f.min && !f.mb);
  function wvoice(txt) {
    const a = ac();
    if (!a) return;
    let t = a.currentTime + 0.02;
    for (let i = 0; i < txt.length; i += 2) {
      if (!/[a-z]/i.test(txt[i])) {
        t += 0.06;
        continue;
      }
      const f0 = 78 + Math.random() * 30;
      osc(a, "square", f0, f0 * 0.72, t, 0.07, 0.035);
      osc(a, "sawtooth", f0 / 2, f0 * 0.36, t, 0.08, 0.03);
      t += 0.055;
    }
  }
  function flashScr(col, ms) {
    const d = document.createElement("div");
    d.style.cssText =
      "position:fixed;inset:0;z-index:31;pointer-events:none;background:" +
      col +
      ";opacity:.85;transition:opacity " +
      ms +
      "ms";
    document.body.appendChild(d);
    requestAnimationFrame(() => requestAnimationFrame(() => (d.style.opacity = 0)));
    setTimeout(() => d.remove(), ms + 80);
  }
  async function wardenCut(f, force) {
    if (wBusy || CUT || mode !== "explore") return;
    f = f || wardenF();
    if (!f || f.dead || !f.o.parent) return;
    wBusy = 1;
    P.wcut = 1;
    P.bseen = P.bseen || {};
    P.bseen.warden = 1;
    if (typeof sv === "function") sv();
    // --- enter cutscene mode (like runCut) ---
    mode = "cut";
    CUT = { skip: false, shk: 0 };
    mv = 0;
    for (const k in keys) keys[k] = false;
    jv.x = jv.y = 0;
    CSP.copy(C.position);
    CSLK.copy(W.position).setY(W.position.y + 2.2);
    document.body.classList.add("cut");
    CSO.className = "on";
    csCap("");
    requestAnimationFrame(() => CSO.classList.add("in"));
    const o = f.o,
      wp = o.position.clone(),
      pp = W.position.clone().setY(0),
      d = wp.clone().sub(pp).setY(0),
      dist = d.length() || 1;
    d.multiplyScalar(1 / dist);
    const sd = V3(-d.z, 0, d.x),
      s0 = o.scale.x,
      [hh] = size(o),
      h = hh * s0,
      D = LIVE.find((q) => q.root === o),
      knights = foes.filter((m) => m.mb === f && !m.dead && m.o.parent),
      at = (back, side, y) => wp.clone().addScaledVector(d, -back).addScaledVector(sd, side).setY(y);
    // a holder for the cutscene's own sprites (removed at the end)
    const hold = new T.Group();
    S.add(hold);
    const swirl = [];
    for (let i = 0; i < 26; i++) {
      const m = new T.Sprite(
        new T.SpriteMaterial({
          map: GLT,
          color: i % 3 ? 0x1a0a2a : 0x6a3aff,
          transparent: true,
          depthWrite: false,
          opacity: 0,
        }),
      );
      if (!(i % 3)) m.material.blending = T.AdditiveBlending;
      m.userData = { a: (i / 26) * TAU, r: 7 + (i % 5), y: 0.5 + (i % 7) * 0.6, s: 1.2 + (i % 4) * 0.5 };
      hold.add(m);
      swirl.push(m);
    }
    const eyes = knights.map((m) => {
      const e = new T.Group();
      [-0.18, 0.18].forEach((x) => {
        const s = spr(0xff3a6a, 0.01);
        s.position.x = x;
        e.add(s);
      });
      const [kh] = size(m.o);
      e.position.copy(m.o.position).setY(kh * m.o.scale.x * 0.82);
      e.lookAt(pp.clone().setY(e.position.y));
      hold.add(e);
      return e;
    });
    const t0 = now();
    let gloomK = 0,
      rise = 0,
      live = 1;
    // keep the Warden and knights breathing while the scene runs
    (function life() {
      if (!live) return;
      const s = (now() - t0) / 1000;
      try {
        animGloom(o, s, rise > 0 && rise < 1 ? 1 : 0, f.hx);
        knights.forEach((m, i) => animGloom(m.o, s, 0, m.hx + i));
      } catch (e) {}
      swirl.forEach((m) => {
        const u = m.userData,
          a = u.a + s * (0.8 + gloomK * 1.4),
          r = u.r * (1 - gloomK * 0.75) + 1;
        m.position.set(wp.x + Math.cos(a) * r, u.y + gloomK * h * 0.4, wp.z + S2(a) * r);
        m.scale.setScalar(u.s * (0.6 + gloomK));
        m.material.opacity = Math.min(1, gloomK * 1.6) * (1 - rise * 0.6) * 0.85;
      });
      requestAnimationFrame(life);
    })();
    try {
      // 1) over the shoulder: the throne at the top of the spire, quiet
      await csGo(pp.clone().addScaledVector(d, -5).addScaledVector(sd, 1.6).setY(4.2), wp.clone().setY(h * 0.6), 1500);
      csCap("The top of the Gloomspire", "", "Floor of the Warden");
      await csW(1300);
      csCap("");
      // 2) the dark gathers: low dolly toward the Warden while the gloom spirals in and it unfolds
      CSP.copy(at(Math.min(9, dist * 0.7), 3, 0.9));
      CSLK.copy(wp.clone().setY(h * 0.75));
      play("rumble");
      const sc0 = s0;
      await csCam(at(Math.min(6.5, dist * 0.5), 1.4, 0.8), wp.clone().setY(h * 0.85), 2600, (k) => k);
      await csTw(1400, (k) => {
        gloomK = Math.min(1, gloomK + 0.02);
        rise = k;
        const e = k < 0.7 ? (k / 0.7) * 1.12 : 1.12 - ((k - 0.7) / 0.3) * 0.12;
        o.scale.setScalar(sc0 * (0.8 + 0.2 * e));
        if (D) D.flare = Math.max(D.flare, k);
      });
      gloomK = 1;
      o.scale.setScalar(sc0);
      csQuake(0.6);
      csFx(() => puff(wp.clone().setY(h * 0.5), "spirit", 26, 5, 1, 1.4));
      // 3) wide: the knights' eyes ignite one by one
      await csGo(at(Math.min(10, dist * 0.8), -3.5, 5.2), wp.clone().setY(h * 0.35), 900);
      for (let i = 0; i < eyes.length; i++) {
        const e = eyes[i];
        csFx(() => {
          const a = ac();
          if (a) osc(a, "triangle", 300 + i * 60, 160, a.currentTime + 0.01, 0.25, 0.06);
        });
        await csTw(380, (k) => e.children.forEach((s) => s.scale.setScalar(0.05 + 0.5 * Math.sin(k * Math.PI * 0.5))));
      }
      if (!eyes.length) await csW(500);
      // 4) close on the Warden: it speaks
      await csGo(at(4.2 + h * 0.25, 0.9, h * 0.8), wp.clone().setY(h * 0.78), 900);
      const L1 = "So. The last lamplighter climbs my spire.",
        L2 = "Every lamp you lit on the way up... I let you light. So I could watch them go out.";
      csCap(L1, "", "The Gloom Warden");
      csFx(() => wvoice(L1));
      await csCam(at(3.8 + h * 0.25, 0.6, h * 0.78), null, 2900, (k) => k);
      csCap(L2, "", "The Gloom Warden");
      csFx(() => wvoice(L2));
      await csCam(at(3.4 + h * 0.25, 0.3, h * 0.76), null, 3600, (k) => k);
      csCap("");
      // 5) the roar: pull back hard, quake, flash, title
      csFx(() => {
        play("roar");
        play("regal");
        flashScr("#2a0a4a", 700);
        ring(wp.x, 0x8a6cff, 18, 1200, wp.z);
        ring(wp.x, 0xffffff, 9, 600, wp.z);
        puff(wp.clone().setY(h * 0.7), "spirit", 30, 7, 1, 1.6);
      });
      csQuake(1.4);
      if (D) D.flare = 1;
      await csCam(
        at(Math.min(11, dist * 0.85), 2.5, h * 0.6 + 2.5),
        wp.clone().setY(h * 0.6),
        700,
        (k) => 1 - Math.pow(1 - k, 3),
      );
      csCap("The Gloom Warden", "Master of the Endless Dusk", "Boss");
      await csW(2600);
    } catch (e) {
      console.warn("bossdread: warden cutscene", e);
    }
    // --- leave cutscene mode, straight into the fight ---
    live = 0;
    o.scale.setScalar(s0);
    S.remove(hold);
    hold.traverse((q) => q.material && q.material.dispose());
    csCap("");
    CSO.classList.remove("in");
    document.body.classList.remove("cut");
    setTimeout(() => {
      if (!CUT) CSO.className = "";
    }, 700);
    CUT = null;
    mode = "explore";
    MTG.visible = true;
    snap = false;
    wBusy = 0;
    if (!f.dead && !force) {
      noIntro = 1;
      try {
        fight(f);
      } catch (e) {
        noIntro = 0;
        console.warn("bossdread: warden fight", e);
      }
      if (mode !== "battle") noIntro = 0;
    } else grace = performance.now() + 1500;
  }
  setInterval(() => {
    if (typeof mode === "undefined" || mode !== "explore" || paused || CUT || wBusy) return;
    if (P.wcut) return;
    const f = wardenF();
    if (!f || f.dead || !f.o.parent || !f.o.visible || foeHeld(f)) return;
    const q = f.o.position;
    if (Math.hypot(q.x - W.position.x, q.z - W.position.z) < WR && Math.abs(q.z - W.position.z) < 40) wardenCut(f);
  }, 250);
  return { BOSS, LIVE, bkey, dress, intro, redress: dressWorld, warden: () => wardenCut(null, 1) };
})();
