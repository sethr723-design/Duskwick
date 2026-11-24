// DUSKWICK - 44-spellfx.js (v32): the animations, models and card pictures for the Spell Paths kit (45-spellpaths.js).
// Loaded in order by index.html as plain scripts; they share one global scope. Only top-level name: SPFX.
// Every animation takes x = { f (target), L (foes hit), r (rune flags a1/b1/a2/b2) } and only reads positions, so the
// same code plays for your own cast, another player's cast (SFXO set: lanternAt/charge/casterP follow their wizard) and
// a spectator's replay. Effects are added under FXP (the battle frame) through tmp2, which disposes them, so every model
// here gets its own fresh materials and geometries (never the shared M() ones).
const SPFX = (() => {
  const PI = Math.PI,
    V = (x, y, z) => new T.Vector3(x, y, z),
    R = Math.random,
    eo = (k) => 1 - Math.pow(1 - k, 3),
    eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    toon = (c, em, ei) =>
      new T.MeshToonMaterial({
        color: c,
        gradientMap: GR,
        emissive: em || 0,
        emissiveIntensity: ei == null ? 0.7 : ei,
      }),
    glass = (c, op) => bmat({ color: c, opacity: op == null ? 0.5 : op }),
    spr = (map, col, s) => {
      const q = new T.Sprite(smat(map, col));
      q.scale.setScalar(s);
      return q;
    },
    me = () => casterP().clone().setY(0),
    // who a team spell lands on: the heroes still standing (and allies), or just the caster in someone else's replay
    heroes = () =>
      SFXO
        ? [SFXO.src0.clone().setY(0)]
        : g.heroes.filter((h) => !h.down).map((h) => (h.local ? W.position : h.m.position).clone().setY(0)),
    team = () => (SFXO ? heroes() : heroes().concat(g.allies.map((s) => s.m.position.clone().setY(0)))),
    mid = (L) => L.reduce((a, p) => a.add(p), V(0, 0, 0)).divideScalar(Math.max(1, L.length)),
    foeAt = (f) => f.m.position.clone().setY(0),
    // foes sit on +x of the battle frame, heroes on -x: "toward the foes" from anywhere
    fwd = V(1, 0, 0);
  // ---------- textures ----------
  const GHT = cvT(128, 128, (x) => {
      const q = x.createRadialGradient(64, 54, 4, 64, 64, 62);
      q.addColorStop(0, "rgba(255,255,255,1)");
      q.addColorStop(0.5, "rgba(220,200,255,.75)");
      q.addColorStop(1, "rgba(160,120,255,0)");
      x.fillStyle = q;
      x.beginPath();
      x.moveTo(30, 60);
      x.quadraticCurveTo(30, 14, 64, 14);
      x.quadraticCurveTo(98, 14, 98, 60);
      x.lineTo(98, 112);
      for (let i = 0; i < 4; i++) x.quadraticCurveTo(90 - i * 17, 96, 81 - i * 17, 112);
      x.closePath();
      x.fill();
      x.fillStyle = "rgba(30,10,60,.9)";
      [50, 78].forEach((e) => {
        x.beginPath();
        x.ellipse(e, 52, 7, 10, 0, 0, 7);
        x.fill();
      });
      x.beginPath();
      x.ellipse(64, 78, 8, 11, 0, 0, 7);
      x.fill();
    }),
    LEAF = cvT(64, 64, (x) => {
      x.translate(32, 32);
      x.rotate(0.6);
      const q = x.createLinearGradient(-20, 0, 20, 0);
      q.addColorStop(0, "#3a9a4a");
      q.addColorStop(1, "#b8ff8a");
      x.fillStyle = q;
      x.beginPath();
      x.moveTo(0, -26);
      x.quadraticCurveTo(20, -4, 0, 26);
      x.quadraticCurveTo(-20, -4, 0, -26);
      x.fill();
      x.strokeStyle = "rgba(20,70,30,.8)";
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(0, -22);
      x.lineTo(0, 22);
      x.stroke();
    }),
    PETAL = cvT(64, 64, (x) => {
      const q = x.createRadialGradient(32, 32, 2, 32, 32, 30);
      q.addColorStop(0, "#fff6fb");
      q.addColorStop(0.6, "#ffb0d8");
      q.addColorStop(1, "rgba(255,140,200,0)");
      x.fillStyle = q;
      x.beginPath();
      x.ellipse(32, 32, 14, 28, 0.4, 0, 7);
      x.fill();
    }),
    STREAK = cvT(16, 128, (x) => {
      const q = x.createLinearGradient(0, 0, 0, 128);
      q.addColorStop(0, "rgba(255,255,255,0)");
      q.addColorStop(0.5, "rgba(255,255,255,1)");
      q.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = q;
      x.fillRect(4, 0, 8, 128);
    }),
    // a swirl of wind bands for the Gale rings and the Skybreaker funnel
    SWIRL = cvT(256, 64, (x) => {
      for (let i = 0; i < 6; i++) {
        const y = 6 + i * 10,
          q = x.createLinearGradient(0, 0, 256, 0);
        q.addColorStop(0, "rgba(255,255,255,0)");
        q.addColorStop(0.3 + i * 0.05, "rgba(255,255,255," + (0.35 + (i % 2) * 0.4) + ")");
        q.addColorStop(1, "rgba(255,255,255,0)");
        x.strokeStyle = q;
        x.lineWidth = 2 + (i % 3);
        x.beginPath();
        x.moveTo(0, y);
        x.bezierCurveTo(80, y - 6, 170, y + 8, 256, y);
        x.stroke();
      }
    });
  SWIRL.wrapS = SWIRL.wrapT = T.RepeatWrapping;
  // ---------- small kit ----------
  // a mote trail behind something moving
  const trail = (p, col, s, t) =>
    mote(p, { t, c: col, v: [(R() - 0.5) * 0.6, R() * 0.4, (R() - 0.5) * 0.6], g: -0.6, l: 0.45, s, gr: -0.8 });
  // a tube that grows along a curve (drawRange on its index); returns the mesh
  function vineMesh(pts, r, mat, seg) {
    const geo = new T.TubeGeometry(new T.CatmullRomCurve3(pts), seg || 48, r, 6, false),
      m = new T.Mesh(geo, mat);
    m.userData.n = geo.index.count;
    geo.setDrawRange(0, 0);
    return m;
  }
  const grow = (m, k) => m.geometry.setDrawRange(0, Math.floor((m.userData.n * Math.max(0, Math.min(1, k))) / 3) * 3);
  // fly a model along a curve, facing where it goes
  async function flyPath(o, pts, ms, each) {
    const cv = new T.CatmullRomCurve3(pts);
    FXP.add(o);
    await tw(ms, (k) => {
      const e = eio(k);
      o.position.copy(cv.getPoint(e));
      o.lookAt(cv.getPoint(Math.min(1, e + 0.02)));
      if (each) each(o.position, k);
    });
  }
  const drop = (o) => {
    if (o.parent) o.parent.remove(o);
    disp(o);
  };
  // little flowers that pop up at a spot and fade
  function flowers(p, n, col) {
    const gr = new T.Group(),
      pm = toon(col || 0xffb0d8, 0x6a2a4a, 0.5),
      cm = toon(0xffe066, 0xaa7a00, 0.6),
      pg = new T.SphereGeometry(0.09, 8, 6),
      cg = new T.SphereGeometry(0.06, 8, 6),
      F = [];
    for (let i = 0; i < n; i++) {
      const fl = new T.Group(),
        a = (i / n) * 6.283 + R(),
        d = 0.5 + R() * 0.9;
      for (let j = 0; j < 5; j++) {
        const q = new T.Mesh(pg, pm),
          b = (j / 5) * 6.283;
        q.position.set(Math.cos(b) * 0.1, 0, Math.sin(b) * 0.1);
        q.scale.set(1.2, 0.35, 0.7);
        q.rotation.y = -b;
        fl.add(q);
      }
      fl.add(new T.Mesh(cg, cm));
      fl.position.set(p.x + Math.cos(a) * d, 0.12, p.z + Math.sin(a) * d);
      fl.userData.d = R() * 0.3;
      gr.add(fl);
      F.push(fl);
    }
    return tmp2(gr, 1600, (k) => {
      F.forEach((fl) => {
        const t = Math.max(0, Math.min(1, (k - fl.userData.d) / 0.25)),
          o = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
        fl.scale.setScalar(Math.max(0.01, eo(t) * o));
        fl.rotation.y = k * 2;
      });
    });
  }
  // a short-lived point of light under the battle frame (uses FLT, the one flash light)
  const flash = (p, col, I, ms) => lightAt(p, col, I, ms);
  // ---------- v48 painted skins (fur, feathers, hides) ----------
  // v48e: no more swirl marks. Each skin is a colour map plus a matching glow map (emissiveMap), painted from one seeded
  // stream: a root (v 0) to tip (v 1) gradient, an optional lighter belly, natural markings (`pat`, see below) and soft
  // fur strokes. On a lathe v runs root to tip and u goes round; a body lathe laid along +z has its belly at u 0/1 (the
  // canvas's left and right edges) and its back at u 0.5 (the middle). Textures are cached (disp() only frees materials
  // and geometry); materials are made fresh per model.
  // pat entries: {t, c (colour), n (count), w (width), a (alpha)}
  //   saddle  darker band down the back (u 0.5), w = half width (0..0.5)
  //   stripe  n tapered wavy bands round the back, fading toward the belly
  //   spot    n soft spots over the back half (rosette when r: 1)
  //   mottle  n big soft light/dark patches
  //   speckle n tiny light/dark flecks
  //   barb    a feather / leaf vane: shaft down u 0.25 and 0.75 with faint barbs
  //   scallop rows of small overlapping feather / scale edges
  //   ember   n soft patches that also GLOW (the only pattern that touches the glow map)
  const SKD = {
      // Hearthfang: ember-dark saddle over red-orange fur, gold belly, faint darker stripes over the haunches
      fur: {
        c: ["#7a1206", "#c8300c", "#f2581a", "#ff8a2a"],
        g: ["#000000", "#000000", "#100300", "#1c0800"],
        belly: "#ffc04a",
        pat: [
          { t: "saddle", c: "rgba(70,6,0,.5)", w: 0.2 },
          { t: "stripe", c: "rgba(90,8,0,.32)", n: 7 },
          { t: "mottle", n: 26, a: 0.08 },
        ],
        fur: 1300,
        seed: 11,
      },
      // flame tufts (mane, tail, ears, brows): red roots, white-gold glowing tips
      tuft: {
        c: ["#a81c08", "#ff5214", "#ffa032", "#ffe68a"],
        g: ["#000000", "#1a0600", "#9a4410", "#ffe0a0"],
        fur: 800,
        seed: 23,
      },
      // phoenix feathers: shaft and barbs, hotter toward the tip
      plume: {
        c: ["#b8240a", "#ff6418", "#ffb442", "#fff2b8"],
        g: ["#2a0800", "#5a1c00", "#c86c1a", "#fff0c8"],
        pat: [{ t: "barb", c: "rgba(255,240,190,.55)" }],
        fur: 300,
        seed: 37,
      },
      // phoenix body: scalloped little feathers, pale breast
      pbody: {
        c: ["#c8380c", "#ff7020", "#ffa040", "#ffcc6a"],
        g: ["#3a1000", "#4a1800", "#6a2400", "#8a3a08"],
        belly: "#ffe28e",
        pat: [{ t: "scallop", c: "rgba(255,230,170,.35)" }],
        fur: 500,
        seed: 41,
      },
    },
    SKC = {};
  function skin(k) {
    if (SKC[k]) return SKC[k];
    const o = SKD[k],
      N = 256;
    const paint = (glow) =>
      cvT(N, N, (x) => {
        let sd = o.seed;
        const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647,
          W = (f) => [-N, 0, N].forEach(f), // draw wrapped across the u seam
          blob = (px, py, r, col) =>
            W((ox) => {
              const q = x.createRadialGradient(px + ox, py, 0, px + ox, py, r);
              q.addColorStop(0, col);
              q.addColorStop(1, col.replace(/[\d.]+\)$/, "0)"));
              x.fillStyle = q;
              x.fillRect(px + ox - r, py - r, r * 2, r * 2);
            });
        // base: root colour at the bottom of the canvas (v 0), tip colour at the top (v 1)
        const q = x.createLinearGradient(0, N, 0, 0);
        const cs = glow ? o.g : o.c;
        cs.forEach((c, i) => q.addColorStop(i / (cs.length - 1), c));
        x.fillStyle = q;
        x.fillRect(0, 0, N, N);
        // a lighter belly band along both edges (u 0/1)
        if (o.belly && !glow) {
          const b = x.createLinearGradient(0, 0, N, 0);
          b.addColorStop(0, o.belly);
          b.addColorStop(0.2, "rgba(255,190,80,0)");
          b.addColorStop(0.8, "rgba(255,190,80,0)");
          b.addColorStop(1, o.belly);
          x.fillStyle = b;
          x.fillRect(0, 0, N, N);
        }
        x.lineCap = "round";
        (o.pat || []).forEach((p) => {
          const n = p.n || 0;
          if (p.t === "saddle") {
            if (glow) return;
            const w = p.w || 0.2,
              b = x.createLinearGradient(0, 0, N, 0);
            b.addColorStop(Math.max(0, 0.5 - w), p.c.replace(/[\d.]+\)$/, "0)"));
            b.addColorStop(0.5, p.c);
            b.addColorStop(Math.min(1, 0.5 + w), p.c.replace(/[\d.]+\)$/, "0)"));
            x.fillStyle = b;
            x.fillRect(0, 0, N, N);
          } else if (p.t === "stripe") {
            for (let i = 0; i < n; i++) {
              const y = ((i + 0.5) / n) * N + (rn() - 0.5) * 10,
                span = N * (0.22 + rn() * 0.12),
                wv = (rn() - 0.5) * 8,
                w = 3 + rn() * 4;
              if (glow) continue;
              x.strokeStyle = p.c;
              for (let j = 0; j < 16; j++) {
                const t0 = j / 16 - 0.5,
                  t1 = (j + 1) / 16 - 0.5;
                x.lineWidth = Math.max(0.5, w * Math.pow(1 - Math.abs(t0 + t1), 0.8));
                x.beginPath();
                x.moveTo(N / 2 + t0 * 2 * span, y + Math.sin(t0 * 6) * wv);
                x.lineTo(N / 2 + t1 * 2 * span, y + Math.sin(t1 * 6) * wv);
                x.stroke();
              }
            }
          } else if (p.t === "spot") {
            for (let i = 0; i < n; i++) {
              const px = N / 2 + (rn() - 0.5) * N * 0.7,
                py = rn() * N,
                r = 3 + rn() * 6;
              if (glow) continue;
              if (p.r) {
                x.strokeStyle = p.c;
                x.lineWidth = 1.6;
                x.beginPath();
                x.arc(px, py, r, 0.3, 5.6);
                x.stroke();
              } else blob(px, py, r, p.c);
            }
          } else if (p.t === "mottle") {
            for (let i = 0; i < n; i++) {
              const px = rn() * N,
                py = rn() * N,
                r = 14 + rn() * 30,
                lt = rn() < 0.5;
              if (glow) continue;
              blob(px, py, r, lt ? "rgba(255,255,255," + (p.a || 0.1) + ")" : "rgba(0,0,0," + (p.a || 0.1) + ")");
            }
          } else if (p.t === "speckle") {
            for (let i = 0; i < n; i++) {
              const px = rn() * N,
                py = rn() * N,
                r = 0.6 + rn() * 1.4,
                lt = rn() < 0.5;
              if (glow) continue;
              x.fillStyle = lt ? "rgba(255,255,255," + (p.a || 0.3) + ")" : "rgba(0,0,0," + (p.a || 0.3) + ")";
              x.beginPath();
              x.arc(px, py, r, 0, 7);
              x.fill();
            }
          } else if (p.t === "barb") {
            if (glow) return;
            x.strokeStyle = p.c;
            [N / 4, (3 * N) / 4].forEach((sx) => {
              x.lineWidth = 2.2;
              x.beginPath();
              x.moveTo(sx, N);
              x.lineTo(sx, 0);
              x.stroke();
              x.lineWidth = 0.8;
              for (let y = N; y > 0; y -= 7)
                [-1, 1].forEach((d) => {
                  x.beginPath();
                  x.moveTo(sx, y);
                  x.lineTo(sx + d * 26, y - 14);
                  x.stroke();
                });
            });
          } else if (p.t === "scallop") {
            if (glow) return;
            x.strokeStyle = p.c;
            x.lineWidth = 1.4;
            for (let row = 0, y = 6; y < N; row++, y += 11)
              for (let xx = (row % 2) * 7 - 14; xx < N + 14; xx += 14) {
                x.beginPath();
                x.arc(xx, y, 7, 0.15, PI - 0.15);
                x.stroke();
              }
          } else if (p.t === "ember") {
            for (let i = 0; i < n; i++) {
              const edge = rn() < 0.5,
                px = edge ? rn() * N * 0.25 : N - rn() * N * 0.25,
                py = rn() * N,
                r = 6 + rn() * 12;
              blob(px, py, r, glow ? "rgba(255,255,255,.55)" : p.c);
            }
          }
        });
        // fur: short soft strokes running up the lathe, some lighter, some darker (colour map only)
        for (let i = 0; i < (o.fur || 0); i++) {
          const px = rn() * N,
            py = rn() * N,
            l = 5 + rn() * 9,
            w = 1 + rn() * 1.6,
            lt = rn() < 0.55,
            sw = (rn() - 0.5) * 4;
          if (glow) continue;
          x.strokeStyle = lt ? o.fl || "rgba(255,210,120,.16)" : o.fd || "rgba(90,10,0,.18)";
          x.lineWidth = w;
          W((ox) => {
            if (px + ox < -16 || px + ox > N + 16) return;
            x.beginPath();
            x.moveTo(px + ox, py);
            x.quadraticCurveTo(px + ox + sw, py - l * 0.5, px + ox + sw * 0.5, py - l);
            x.stroke();
          });
        }
      });
    const c = paint(0),
      e = paint(1);
    c.wrapS = e.wrapS = T.RepeatWrapping;
    return (SKC[k] = { c, e });
  }
  const skinM = (k, ei, ds) => {
    const s = skin(k),
      m = new T.MeshToonMaterial({
        color: 0xffffff,
        map: s.c,
        emissive: SKD[k].ec || 0xffc860,
        emissiveMap: s.e,
        emissiveIntensity: ei == null ? 1 : ei,
        gradientMap: GR,
      });
    m.userData.dtx = 0;
    if (ds) m.side = T.DoubleSide;
    return m;
  };
  // bend a geometry: x (or z) += k * y^2 above y 0
  const bend = (g, k, ax) => {
    const p = g.attributes.position,
      z = ax === "z";
    for (let i = 0; i < p.count; i++) {
      const y = Math.max(0, p.getY(i)),
        d = k * y * y;
      if (z) p.setZ(i, p.getZ(i) + d);
      else p.setX(i, p.getX(i) + d);
    }
    GEOX.sn(g);
    return g;
  };
  // a flame lick / tuft / feather: a teardrop lathe from y 0 to h (widest low, needle tip), fl < 1 flattens it on z
  // (feathers), then bent by k along ax
  // v48d: a lathe with seam-free smooth normals (no lighting line down the seam, no dark pinch at the poles)
  const LtS = (p, s) => GEOX.sn(Lt(p, s));
  const lickG = (r, h, k, ax, fl) => {
    const g = Lt(
      [
        [0.001, 0],
        [r * 0.75, h * 0.1],
        [r, h * 0.3],
        [r * 0.62, h * 0.62],
        [r * 0.22, h * 0.88],
        [0.001, h],
      ],
      GFX === "low" ? 6 : 10,
      16,
    );
    if (fl) g.scale(1, 1, fl);
    return bend(g, k || 0, ax);
  };
  // ===================================================================================================================
  // MODELS
  // ===================================================================================================================
  // v48 the phoenix: one smooth painted body, a hooked beak and glowing eyes, a swept crest of flame licks, wings built
  // from layered feathers (the primaries sit on a "hand" that lags behind each flap) and a fan of streaming tail plumes
  function mkPhoenix(sc) {
    const o = new T.Group(),
      b = new T.Group();
    o.add(b);
    const mb = skinM("pbody", 1),
      mf = skinM("plume", 1.1, 1),
      mt = skinM("tuft", 1.1),
      gold = toon(0xffd860, 0xc87a10, 0.8),
      eyeM = new T.MeshBasicMaterial({ color: 0xfff6c8 });
    // body: a teardrop from the tail root (z -0.62) to the breast, laid along +z
    const tg = LtS(
      [
        [0.001, 0],
        [0.16, 0.1],
        [0.3, 0.42],
        [0.4, 0.78],
        [0.36, 1.05],
        [0.2, 1.24],
        [0.001, 1.3],
      ],
      24,
    );
    tg.rotateX(PI / 2);
    const torso = new T.Mesh(tg, mb);
    torso.position.z = -0.62;
    torso.scale.set(0.82, 0.8, 1);
    b.add(torso);
    // head and neck
    const hd = new T.Group();
    hd.position.set(0, 0.36, 0.66);
    b.add(hd);
    const skull = new T.Mesh(new T.SphereGeometry(0.22, 18, 14), mb);
    skull.scale.set(0.9, 0.95, 1.12);
    hd.add(skull);
    const neck = new T.Mesh(
      LtS(
        [
          [0.21, 0],
          [0.22, 0.18],
          [0.16, 0.38],
        ],
        16,
      ),
      mb,
    );
    neck.position.set(0, -0.32, -0.16);
    neck.rotation.x = 0.5;
    hd.add(neck);
    const bg = bend(new T.ConeGeometry(0.075, 0.32, 12).translate(0, 0.16, 0), 1.5, "z");
    bg.rotateX(PI / 2);
    const beak = new T.Mesh(bg, gold);
    beak.position.set(0, -0.02, 0.2);
    hd.add(beak);
    [-1, 1].forEach((s) => {
      const e = new T.Mesh(new T.SphereGeometry(0.042, 10, 8), eyeM);
      e.position.set(s * 0.12, 0.05, 0.15);
      hd.add(e);
      const eg = spr(WGT, 0xffd27a, 0.3);
      eg.position.copy(e.position);
      hd.add(eg);
      // cheek feathers sweeping back
      for (let j = 0; j < 2; j++) {
        const c = new T.Mesh(lickG(0.05, 0.3 - j * 0.06, -0.6, "z"), mt);
        c.position.set(s * 0.15, -0.04 - j * 0.07, 0.02);
        c.rotation.set(-1.75 + j * 0.2, 0, -s * 0.5);
        hd.add(c);
      }
    });
    // crest: five licks sweeping back off the crown
    for (let i = 0; i < 5; i++) {
      const c = new T.Mesh(lickG(0.065, 0.62 - Math.abs(i - 2) * 0.1, -1.1, "z"), mt);
      c.position.set((i - 2) * 0.05, 0.15, -0.02 - Math.abs(i - 2) * 0.03);
      c.rotation.set(-0.3 - Math.abs(i - 2) * 0.14, 0, (i - 2) * -0.2);
      hd.add(c);
    }
    // a feather: flattened lick lying in the wing plane, pointing back (-z) and turned outward by a (0 back .. PI/2 out)
    const feather = (s, len, a, wid) => {
      const g = lickG(wid || 0.11, len, -s * 0.22, "x", 0.22);
      g.rotateX(-PI / 2);
      const m = new T.Mesh(g, mf);
      m.rotation.y = -s * a;
      return m;
    };
    const wings = [-1, 1].map((s) => {
      const p = new T.Group();
      p.position.set(s * 0.26, 0.16, 0.12);
      // the leading edge of the wing
      const eg = LtS(
        [
          [0.07, 0],
          [0.075, 0.4],
          [0.04, 0.82],
        ],
        12,
      );
      eg.rotateZ(-s * (PI / 2));
      p.add(new T.Mesh(eg, mb));
      // coverts along the arm, short and swept back
      for (let i = 0; i < 5; i++) {
        const f = feather(s, 0.5 + i * 0.07, 0.22 + i * 0.07, 0.12);
        f.position.set(s * (0.08 + i * 0.14), 0.015, 0.04);
        p.add(f);
      }
      // the hand: long primaries fanning out, lagging behind the flap (flapP)
      const tip = new T.Group();
      tip.position.set(s * 0.8, 0, 0.03);
      for (let i = 0; i < 6; i++) {
        const f = feather(s, 0.85 + i * 0.11, 0.45 + i * 0.21, 0.12);
        f.position.set(s * i * 0.05, -0.01 - i * 0.004, 0);
        tip.add(f);
      }
      const gl = spr(WGT, 0xffa040, 1.5);
      gl.position.set(s * 0.5, 0, -0.3);
      tip.add(gl);
      p.add(tip);
      p.userData.tip = tip;
      p.userData.s = s;
      b.add(p);
      return p;
    });
    // tail: a fan of long plumes that curl up at the ends
    const tail = [];
    for (let i = 0; i < 5; i++) {
      const g = lickG(0.11, 1.35 - Math.abs(i - 2) * 0.18, 0.22, "z", 0.3);
      g.rotateX(-PI / 2);
      const t = new T.Mesh(g, mf);
      t.position.set((i - 2) * 0.06, 0.02, -0.52);
      t.rotation.y = (i - 2) * 0.22;
      b.add(t);
      tail.push(t);
    }
    const halo = spr(WGT, 0xff8a3a, 3.4);
    b.add(halo);
    const fire = new T.Sprite(AM(SP.fire));
    fire.scale.setScalar(2);
    fire.position.z = -0.8;
    b.add(fire);
    o.scale.setScalar(sc || 1);
    o.userData = { wings, tail, fire, halo, hd, mats: [mb, mf, mt] };
    return o;
  }
  const flapP = (o, t, sp) => {
    const u = o.userData,
      ph = t * (sp || 14);
    u.wings.forEach((w) => {
      const s = w.userData.s || 1;
      w.rotation.z = -s * Math.sin(ph) * 0.75;
      if (w.userData.tip) w.userData.tip.rotation.z = -s * Math.sin(ph - 0.9) * 0.55;
    });
    u.tail.forEach((q, i) => (q.rotation.x = Math.sin(ph * 0.5 + i) * 0.12));
    if (u.mats) u.mats[1].emissiveIntensity = 1.05 + Math.sin(ph * 2.3) * 0.15;
    u.fire.material.rotation = t * 6;
  };
  // the small sun of Sunfall: a hot core, a corona, turning rays and flares in orbit
  function mkSun(r) {
    const o = new T.Group(),
      core = new T.Mesh(new T.SphereGeometry(r, 24, 18), new T.MeshBasicMaterial({ color: 0xfff2c0 })),
      shell = new T.Mesh(new T.SphereGeometry(r * 1.12, 24, 18), glass(0xff9a3a, 0.55)),
      cor = spr(WGT, 0xffb050, r * 6),
      cor2 = spr(WGT, 0xff6a1a, r * 9),
      rays = spr(RAYT, 0xffd27a, r * 7),
      fl = [];
    o.add(cor2, cor, rays, shell, core);
    for (let i = 0; i < 6; i++) {
      const s = new T.Sprite(AM(SP.fire));
      s.scale.setScalar(r * 1.4);
      s.userData.a = (i / 6) * 6.283;
      o.add(s);
      fl.push(s);
    }
    o.userData = { rays, fl, r, shell };
    return o;
  }
  // an ice war-hammer: a frosted haft wrapped in leather, a great crystal head with spiked faces
  function mkHammer() {
    const o = new T.Group(),
      piv = new T.Group();
    o.add(piv);
    const ice = toon(0xd8f4ff, 0x3a9ad8, 0.75),
      dark = toon(0x2a4a7a, 0x0a2040, 0.4),
      haft = new T.Mesh(new T.CylinderGeometry(0.11, 0.13, 3.6, 10), toon(0x6a5a8a, 0x1a1030, 0.3));
    haft.position.y = 1.8;
    piv.add(haft);
    for (let i = 0; i < 4; i++) {
      const w = new T.Mesh(new T.TorusGeometry(0.14, 0.035, 6, 12), dark);
      w.rotation.x = PI / 2;
      w.position.y = 0.3 + i * 0.18;
      piv.add(w);
    }
    const head = new T.Mesh(new T.BoxGeometry(1.9, 0.95, 0.95), ice);
    head.position.y = 3.7;
    piv.add(head);
    [-1, 1].forEach((s) => {
      const cap = new T.Mesh(new T.CylinderGeometry(0.55, 0.62, 0.16, 6), dark);
      cap.rotation.z = PI / 2;
      cap.position.set(s * 1.0, 3.7, 0);
      piv.add(cap);
      for (let j = 0; j < 4; j++) {
        const sp = new T.Mesh(new T.ConeGeometry(0.12, 0.5, 5), ice),
          a = (j / 4) * 6.283 + 0.78;
        sp.position.set(s * 1.25, 3.7 + Math.cos(a) * 0.3, Math.sin(a) * 0.3);
        sp.rotation.z = (-s * PI) / 2;
        piv.add(sp);
      }
    });
    const top = new T.Mesh(new T.OctahedronGeometry(0.4, 0), ice);
    top.scale.set(0.8, 1.6, 0.8);
    top.position.y = 4.55;
    piv.add(top);
    const gl = spr(WGT, 0x9fe8ff, 4.5);
    gl.position.y = 3.7;
    piv.add(gl);
    o.userData = { piv, gl };
    return o;
  }
  // the winter colossus: a hulking ice giant, rune-lit eyes, crystal spines on its back, arms that slam the ground
  function mkColossus() {
    const o = new T.Group(),
      b = new T.Group();
    o.add(b);
    const ice = toon(0xcfeeff, 0x2a7ac8, 0.55),
      deep = toon(0x6ab0e8, 0x1a4a8a, 0.6),
      snow = toon(0xffffff, 0x8ab0d0, 0.25),
      eye = new T.MeshBasicMaterial({ color: 0xbff8ff });
    const torso = new T.Mesh(new T.DodecahedronGeometry(1.6, 1), ice);
    torso.scale.set(1.2, 1.15, 0.85);
    torso.position.y = 3.6;
    b.add(torso);
    const belly = new T.Mesh(new T.DodecahedronGeometry(1.1, 0), deep);
    belly.position.set(0, 2.5, 0.25);
    b.add(belly);
    const head = new T.Mesh(new T.BoxGeometry(1.2, 1.0, 1.0), ice);
    head.position.set(0, 5.4, 0.35);
    head.rotation.x = 0.15;
    b.add(head);
    const brow = new T.Mesh(new T.BoxGeometry(1.35, 0.25, 0.4), snow);
    brow.position.set(0, 5.75, 0.75);
    b.add(brow);
    [-1, 1].forEach((s) => {
      const e = new T.Mesh(new T.BoxGeometry(0.24, 0.12, 0.05), eye);
      e.position.set(s * 0.28, 5.45, 0.87);
      b.add(e);
      const eg = spr(WGT, 0x9fe8ff, 0.9);
      eg.position.copy(e.position);
      b.add(eg);
    });
    // shoulders, arms and fists (each arm swings from the shoulder pivot)
    const arms = [-1, 1].map((s) => {
      const sh = new T.Mesh(new T.IcosahedronGeometry(0.8, 0), snow);
      sh.position.set(s * 2.0, 4.5, 0);
      b.add(sh);
      const p = new T.Group();
      p.position.set(s * 2.1, 4.4, 0);
      const ua = new T.Mesh(new T.CylinderGeometry(0.42, 0.5, 2.1, 8), ice);
      ua.position.y = -1.05;
      p.add(ua);
      const fa = new T.Mesh(new T.CylinderGeometry(0.5, 0.36, 1.8, 8), deep);
      fa.position.y = -2.7;
      p.add(fa);
      const fist = new T.Mesh(new T.DodecahedronGeometry(0.72, 0), ice);
      fist.position.y = -3.8;
      p.add(fist);
      for (let j = 0; j < 3; j++) {
        const k = new T.Mesh(new T.ConeGeometry(0.15, 0.55, 5), snow);
        k.position.set((j - 1) * 0.3, -3.6, 0.6);
        k.rotation.x = PI / 2;
        p.add(k);
      }
      b.add(p);
      return p;
    });
    for (let j = 0; j < 7; j++) {
      const c = new T.Mesh(new T.ConeGeometry(0.3, 1.6 + (j % 3) * 0.5, 5), deep),
        a = (j - 3) * 0.32;
      c.position.set(Math.sin(a) * 1.4, 4.4 + Math.cos(a) * 0.9, -0.9);
      c.rotation.set(-0.7, 0, -a);
      b.add(c);
    }
    const gl = spr(WGT, 0x6fd3ff, 9);
    gl.position.y = 3.5;
    b.add(gl);
    o.userData = { b, arms, head };
    return o;
  }
  // the grove heart: a great tree that grows in seconds, branches, leafy crowns and glowing fruit
  function mkTree() {
    const o = new T.Group(),
      bark = toon(0x6a4a2a, 0x1a0a00, 0.25),
      leaf = toon(0x5ad87a, 0x1a6a2a, 0.55),
      leaf2 = toon(0x8aff9a, 0x2a8a3a, 0.65),
      trunk = new T.Mesh(new T.CylinderGeometry(0.35, 0.8, 5, 10), bark);
    trunk.position.y = 2.5;
    o.add(trunk);
    const roots = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 6.283,
        r = new T.Mesh(new T.ConeGeometry(0.3, 1.8, 6), bark);
      r.position.set(Math.cos(a) * 0.8, 0.25, Math.sin(a) * 0.8);
      r.rotation.set(Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25);
      o.add(r);
      roots.push(r);
    }
    const crowns = [],
      br = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.283 + 0.3,
        h = 3.6 + (i % 3) * 0.6,
        bb = new T.Mesh(new T.CylinderGeometry(0.08, 0.2, 2.2, 6), bark);
      bb.position.set(Math.cos(a) * 0.9, h, Math.sin(a) * 0.9);
      bb.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
      o.add(bb);
      br.push(bb);
      const c = new T.Mesh(new T.IcosahedronGeometry(1.1 + (i % 2) * 0.3, 1), i % 2 ? leaf : leaf2);
      c.position.set(Math.cos(a) * 1.9, h + 0.9, Math.sin(a) * 1.9);
      o.add(c);
      crowns.push(c);
    }
    const top = new T.Mesh(new T.IcosahedronGeometry(1.7, 1), leaf2);
    top.position.y = 6.2;
    o.add(top);
    crowns.push(top);
    const fruit = [];
    for (let i = 0; i < 9; i++) {
      const s = spr(WGT, 0xfff0a0, 0.8),
        a = R() * 6.283;
      s.position.set(Math.cos(a) * (1.4 + R()), 4.2 + R() * 2.4, Math.sin(a) * (1.4 + R()));
      o.add(s);
      fruit.push(s);
    }
    o.userData = { trunk, crowns, br, roots, fruit };
    return o;
  }
  // a lantern ghost for Night Procession
  function mkMarcher(col) {
    const o = new T.Group(),
      gh = spr(GHT, col, 1.7),
      ln = spr(WGT, 0xffd27a, 0.9),
      lf = new T.Sprite(AM(SP.fire));
    gh.position.y = 1.4;
    ln.position.set(0.55, 0.95, 0);
    lf.scale.setScalar(0.45);
    lf.position.copy(ln.position);
    o.add(gh, ln, lf);
    o.userData = { gh, ln };
    return o;
  }
  // ===================================================================================================================
  // ANIMATIONS
  // ===================================================================================================================
  const A = {};
  // ---------- PYRE (Striker) ----------
  // Cinderbolt: the lantern spits a spinning comet wrapped in a ring of flame; it bursts into a flower of fire
  async function comet(a, b, big, arc) {
    const o = new T.Group(),
      c1 = new T.Sprite(AM(SP.fire)),
      c2 = spr(WGT, 0xfff0c0, 0.9 * big),
      rg = new T.Mesh(new T.TorusGeometry(0.32 * big, 0.06 * big, 6, 18), glass(0xffa040, 0.9));
    c1.scale.setScalar(1.5 * big);
    o.add(c1, c2, rg);
    await shoot(o, a, b, 320, arc, (p, k) => {
      c1.material.rotation = k * 14;
      rg.rotation.set(k * 20, k * 13, 0);
      trail(p, null, 0.9 * big, SP.fire);
      if (R() < 0.5) mote(p, { c: 0xffb050, v: [(R() - 0.5) * 2, 1 + R(), (R() - 0.5) * 2], g: -0.5, l: 0.7, s: 0.18 });
    });
    // the flame flower: six petals of fire fanning out
    for (let i = 0; i < 6; i++) {
      const an = (i / 6) * 6.283;
      mote(b, {
        t: SP.fire,
        v: [Math.cos(an) * 3 * big, 1.5, Math.sin(an) * 3 * big],
        g: 2,
        dr: 2.5,
        l: 0.5,
        s: 1.1 * big,
      });
    }
    glowBurst(b, 0xffa040, 4.5 * big, 380);
    burst(b, 0xffb050, 18, 6 * big, { g: 4 });
    embers(b, 0xff8a3d, 8, 0.8);
  }
  A.pcinder = async (x) => {
    const f = x.f,
      a = await charge("fire", 220),
      b = chest(f),
      big = x.r.b1 ? 1.35 : 1;
    if (x.r.a1) {
      const o = b.clone().add(V(0, 0.4, 0.5));
      await Promise.all([comet(a, b, 0.85, 1.8), wait(110).then(() => comet(a, o, 0.85, 0.6))]);
    } else await comet(a, b, big, 1.3);
    shk = 0.35 * big;
    shock(foeAt(f), 0xff8a3d, 2.2 * big, 420);
    decal(b.x, b.z, "scorch", 1.3 * big);
    flash(b, 0xff8a3d, 6, 420);
    if (x.r.b2) {
      const p = me();
      smoke(p.clone().setY(1), 0x3a2a2a, 3, 0.8);
      burst(p.clone().setY(1.2), 0xff6a2a, 8, 2, { s: 0.25 });
    }
    await wait(100);
  };
  // Flame Lash: a whip of fire uncoils from the lantern, cracks across the foe and leaves a burning line
  A.plash = async (x) => {
    const f = x.f,
      a = await charge("fire", 240),
      b = chest(f),
      ctl = a
        .clone()
        .lerp(b, 0.45)
        .add(V(0, 3.2, -1.6)),
      cv = new T.QuadraticBezierCurve3(a, ctl, b),
      N = 22,
      o = new T.Group(),
      F = [];
    for (let i = 0; i < N; i++) {
      const s = new T.Sprite(AM(SP.fire));
      s.scale.setScalar(0.01);
      o.add(s);
      F.push(s);
    }
    const cord = vineMesh(cv.getPoints(30), 0.07, glass(0xffd080, 0.9), 40);
    o.add(cord);
    await tmp2(o, 560, (k) => {
      const reach = Math.min(1, k / 0.55),
        crack = k > 0.55 ? (k - 0.55) / 0.45 : 0;
      grow(cord, reach);
      F.forEach((s, i) => {
        const u = i / (N - 1);
        if (u > reach) return void s.scale.setScalar(0.01);
        const p = cv.getPoint(u);
        // the lash snaps: a wave runs down the cord as it cracks
        p.y += Math.sin(u * 9 - k * 30) * 0.25 * (1 - u) * (1 - crack);
        s.position.copy(p);
        s.scale.setScalar((0.55 + u * 0.6) * (1 - crack * 0.7));
        s.material.rotation = k * 8 + i;
      });
      cord.material.opacity = 0.9 * (1 - crack);
    });
    shk = 0.5;
    flashScr("#ffb060", 0.25);
    vshock(b, 0xffe0a0, 1.6, 260);
    glowBurst(b, 0xff8a3d, 4, 360);
    burst(b, 0xffc070, 20, 7, { g: 5, s: 0.35 });
    if (x.r.a1 && x.L.length > 1) {
      const f2 = x.L.find((q) => q !== f);
      if (f2) {
        zap(b, chest(f2), 0xff8a3d, 260, { w: 0.06, forks: 0, jit: 0.6 });
        glowBurst(chest(f2), 0xff8a3d, 3, 300);
      }
    }
    if (x.r.b1) rune(foeAt(f), "fire", 1.6, 900, 0xff5a1a);
    if (x.r.b2) x.L.forEach((q) => q !== f && embers(chest(q), 0xff7a2a, 8, 0.6));
    if (x.r.a2) pillar(foeAt(f), 0xff9a3a, 0.9, 5, 480, { shrink: 1 });
    decal(b.x, b.z, "scorch", 1.6);
    flash(b, 0xff8a3d, 7, 450);
    await wait(120);
  };
  // Phoenix Dive: a phoenix bursts from the lantern, climbs over the field, folds its wings and dives through the foe
  A.pphoenix = async (x) => {
    const a = await charge("fire", 260),
      L = x.r.b1 ? x.L : [x.f],
      ph = mkPhoenix(x.r.b2 ? 1.25 : 1),
      p0 = me(),
      hi = V(p0.x + 1, 7.5, p0.z - 3),
      pts = [a, a.clone().add(V(0.5, 2.5, -1)), hi];
    L.forEach((f, i) => {
      const c = chest(f);
      pts.push(c.clone().add(V(-2.2, 2.6 + i * 0.3, 0)), c);
    });
    const end = pts[pts.length - 1].clone();
    pts.push(end.clone().add(V(4, 1.5, 0)), end.clone().add(V(6, 7, -2)));
    flashScr("#3a1004", 0.2);
    let hit = 0;
    await flyPath(ph, pts, 1500 + L.length * 180, (p, k) => {
      flapP(ph, k * 1.5, k > 0.45 && k < 0.85 ? 4 : 14);
      trail(p, null, 1.4, SP.fire);
      if (R() < 0.6) mote(p, { c: 0xffd27a, v: [(R() - 0.5) * 2, R() * 2, (R() - 0.5) * 2], g: -1, l: 0.6, s: 0.25 });
      // a blast each time it passes through a foe
      const near = L[Math.min(L.length - 1, hit)];
      if (near && hit < L.length && p.distanceTo(chest(near)) < 0.8) {
        hit++;
        const c = chest(near);
        shk = 0.7;
        glowBurst(c, 0xffb050, 6, 420);
        shock(foeAt(near), 0xff8a3d, 3, 480);
        burst(c, 0xffa040, 26, 8, { g: 5, s: 0.45 });
        fling(c, 6, 4, { col: 0xffc070, em: 0xff5a00, sz: 0.12 });
        decal(c.x, c.z, "scorch", 1.8);
        flash(c, 0xff8a3d, 8, 420);
      }
    });
    drop(ph);
    // Rebirth: the phoenix falls apart into feathers of light that drift down onto you
    if (x.r.a1) {
      const p = me();
      pillar(p, 0xffc070, 1, 6, 700);
      for (let i = 0; i < 14; i++)
        mote(V(p.x + (R() - 0.5) * 2, 4 + R() * 2, p.z + (R() - 0.5) * 2), {
          t: SP.fire,
          v: [(R() - 0.5) * 0.5, -1.6, (R() - 0.5) * 0.5],
          g: 0,
          l: 1.1,
          s: 0.5,
          sp: 3,
        });
    }
    if (x.r.a2) x.L.forEach((f) => embers(foeAt(f), 0xff7a2a, 10, 1));
    await wait(120);
  };
  // Kindle Heart: a crown of flame circles the wizard and sinks into a heart of fire in their chest
  A.pkindle = async (x) => {
    const p = me(),
      o = new T.Group(),
      F = [],
      heart = spr(WGT, 0xff6a2a, 0.5),
      hf = new T.Sprite(AM(SP.fire));
    for (let i = 0; i < 8; i++) {
      const s = new T.Sprite(AM(SP.fire));
      s.scale.setScalar(0.7);
      o.add(s);
      F.push(s);
    }
    hf.scale.setScalar(0.6);
    o.add(heart, hf);
    o.position.copy(p);
    rune(p, "fire", 1.8, 1100, x.r.b1 ? 0xff2a2a : 0xff9a4a);
    await tmp2(o, 900, (k) => {
      const r = 1.3 * (1 - eo(Math.max(0, k - 0.5) * 2)),
        y = 2.6 - k * 1.1;
      F.forEach((s, i) => {
        const an = k * 9 + (i / 8) * 6.283;
        s.position.set(Math.cos(an) * r, y + Math.sin(an * 2) * 0.1, Math.sin(an) * r);
        s.material.rotation = k * 6;
      });
      const hk = Math.max(0, (k - 0.55) / 0.45);
      heart.position.y = hf.position.y = 1.45;
      heart.scale.setScalar(0.4 + hk * 2.4 + Math.sin(k * 40) * 0.15 * hk);
      hf.scale.setScalar(0.4 + hk * 0.9);
    });
    pillar(p, x.r.b1 ? 0xff3a2a : 0xff9a3a, 0.8, 6, 600);
    vshock(p.clone().setY(1.45), 0xffc070, 1.6, 320);
    if (x.r.b1) burst(p.clone().setY(1.4), 0xaa1010, 12, 3, { s: 0.3 });
    if (x.r.a1) x.L.forEach((f) => embers(foeAt(f), 0xff7a2a, 8, 0.8));
    flash(p, 0xff8a3d, 5, 500);
    await wait(80);
  };
  // Sunfall: the sky dims, a small sun gathers high over the foe, sinks, and bursts across the ground
  A.psun = async (x) => {
    const f = x.f,
      aoe = x.r.a1,
      c = aoe ? mid(x.L.map(foeAt)) : foeAt(f),
      sun = mkSun(aoe ? 1.4 : 1.1),
      u = sun.userData,
      a = await charge("fire", 320);
    flashScr("#1a0602", 0.45);
    rune(c, "fire", aoe ? 4.5 : 3, 2300, 0xff7a2a);
    sun.position.set(c.x, 13, c.z);
    sun.scale.setScalar(0.01);
    FXP.add(sun);
    // gather: streams of fire rise from the lantern and the ground into it
    await tw(900, (k) => {
      sun.scale.setScalar(0.01 + eo(k));
      u.rays.material.rotation = k * 2;
      u.fl.forEach((s, i) => {
        const an = u.fl[i].userData.a + k * 4;
        s.position.set(Math.cos(an) * u.r * 1.2, Math.sin(an * 1.3) * u.r, Math.sin(an) * u.r * 1.2);
        s.material.rotation = k * 5 + i;
      });
      if (R() < 0.7) {
        const from = R() < 0.5 ? a : V(c.x + (R() - 0.5) * 8, 0.3, c.z + (R() - 0.5) * 8),
          to = sun.position;
        mote(from, {
          t: SP.fire,
          v: [(to.x - from.x) * 1.1, (to.y - from.y) * 1.1, (to.z - from.z) * 1.1],
          g: 0,
          l: 0.85,
          s: 0.6,
          gr: -0.6,
        });
      }
    });
    // fall
    await tw(520, (k) => {
      const e = k * k;
      sun.position.y = 13 - e * 12.2;
      u.rays.material.rotation += 0.15;
      sun.scale.setScalar(1 + k * 0.4);
      if (R() < 0.8) trail(sun.position, null, 2.2, SP.fire);
    });
    drop(sun);
    shk = 1.4;
    flashScr("#fff0c0", 0.85);
    await hold(80);
    const R0 = aoe ? 7 : 5;
    shock(c, 0xffffff, R0 * 0.6, 360);
    shock(c, 0xff8a3d, R0, 700);
    shock(c, 0xffd27a, R0 * 0.7, 520, 0.4);
    pillar(c, 0xffb050, aoe ? 2.4 : 1.6, 14, 800, { shrink: 1 });
    glowBurst(c.clone().setY(2), 0xffe0a0, aoe ? 16 : 11, 700);
    (aoe ? x.L : [f]).forEach((q) => {
      const p = chest(q);
      burst(p, 0xffa040, 30, 10, { g: 6, s: 0.6 });
      fling(foeAt(q).setY(0.5), 7, 6, { rock: 1, col: 0x3a2014, em: 0x551800 });
      decal(p.x, p.z, "scorch", 2.6);
    });
    embers(c, 0xff7a2a, 26, aoe ? 5 : 3);
    smoke(c, 0x2a1e1e, 8, 2.2);
    flash(c.clone().setY(1), 0xffa040, 14, 900);
    if (x.r.a2) heroes().forEach((p) => pillar(p, 0xffe9a0, 0.9, 7, 800));
    if (x.r.b2) x.L.forEach((q) => embers(foeAt(q), 0xff5a1a, 12, 1.2));
    await wait(260);
  };
  // ---------- GALE (Evoker) ----------
  // Static Spark: a crackling ball leaps from the lantern and hops from foe to foe
  A.gspark = async (x) => {
    const a = await charge("storm", 200),
      f = x.f,
      hops = x.r.a1 ? x.L.slice() : x.r.b1 ? [f] : [f, ...x.L.filter((q) => q !== f).slice(0, 1)];
    if (hops[0] !== f) hops.sort((p, q) => (p === f ? -1 : q === f ? 1 : 0));
    let from = a;
    for (let i = 0; i < hops.length; i++) {
      const b = chest(hops[i]),
        ball = new T.Group(),
        bs = new T.Sprite(AM(SP.storm)),
        bg = spr(WGT, 0xffffff, 0.7);
      bs.scale.setScalar(i ? 0.9 : x.r.b1 ? 1.6 : 1.2);
      ball.add(bs, bg);
      await shoot(ball, from, b, i ? 160 : 230, i ? 1.6 : 0.8, (p, k) => {
        bs.material.rotation = k * 20;
        if (R() < 0.5)
          zap(p, p.clone().add(V((R() - 0.5) * 1.2, (R() - 0.5) * 1.2, (R() - 0.5) * 1.2)), 0xfff06a, 90, {
            w: 0.02,
            forks: 0,
          });
      });
      zap(b.clone().add(V(0, 3, 0)), b, 0xfff06a, 160, { w: 0.04, forks: 1 });
      glowBurst(b, 0xfff06a, i ? 2.5 : 3.5, 280);
      burst(b, 0xffffa0, 12, 6, { s: 0.25, l: 0.4 });
      shk = 0.25;
      from = b;
    }
    if (x.r.b1) vshock(chest(f), 0xffffff, 1.8, 300);
    await wait(80);
  };
  // Gust Ring: blades of wind (spinning rings of streaked air) sweep out across the foes, leaves and dust whirling
  A.ggust = async (x) => {
    const p = me(),
      a = await charge("storm", 220, 0xd8fff0),
      big = x.r.a1 ? 1.3 : 1,
      tg = mid(x.L.map(foeAt)),
      o = new T.Group(),
      rings = [];
    for (let i = 0; i < 3; i++) {
      const m = new T.Mesh(
        new T.CylinderGeometry(1, 1, 0.9, 32, 1, true),
        bmat({ map: SWIRL, color: 0xe8fff4, opacity: 0 }),
      );
      m.position.y = 0.6 + i * 0.7;
      m.userData.d = i * 0.12;
      o.add(m);
      rings.push(m);
    }
    o.position.copy(p);
    await tmp2(o, 900, (k) => {
      o.position.lerpVectors(p, tg, eio(Math.min(1, k * 1.15)));
      rings.forEach((m) => {
        const t = Math.max(0, k - m.userData.d);
        m.scale.set(1.2 + t * 3.5 * big, 1, 1.2 + t * 3.5 * big);
        m.rotation.y = -k * 18;
        m.material.map.offset.x = -k * 3;
        m.material.opacity = Math.min(1, t * 4) * (1 - k) * 0.9;
      });
      if (R() < 0.8)
        mote(o.position.clone().add(V((R() - 0.5) * 4, R() * 2, (R() - 0.5) * 4)), {
          t: R() < 0.5 ? LEAF : null,
          c: 0xd8ffe8,
          v: [(R() - 0.5) * 5, 1 + R() * 2, (R() - 0.5) * 5],
          g: 1,
          l: 0.7,
          s: 0.35,
          sp: 6,
        });
    });
    x.L.forEach((f) => {
      const c = chest(f);
      burst(c, 0xe8fff4, 10, 5, { s: 0.3, l: 0.45 });
      vshock(c, 0xd8fff0, 1.3 * big, 300);
      if (x.r.b1) rune(foeAt(f), "storm", 1.2, 700, 0x9ab0ff);
    });
    shk = 0.35 * big;
    await wait(100);
  };
  // Thunderhead: a churning storm cloud gathers over the field, rain sheets down, and bolts strike each foe in turn
  A.gthunder = async (x) => {
    const one = x.r.b1,
      L = one ? [x.f] : x.L,
      c = one ? foeAt(x.f) : mid(L.map(foeAt)),
      top = c.clone().setY(7.5),
      tw2 = x.r.a1 ? 2 : 1;
    await charge("storm", 260);
    flashScr("#05061a", 0.4);
    const cl = cloud(top, one ? 2.6 : 4.2, 1900),
      glow = spr(WGT, 0x9ab0ff, 6);
    glow.position.copy(top);
    FXP.add(glow);
    // rain and inner flicker while it builds
    await tw(600, (k) => {
      glow.material.opacity = 0.2 + R() * 0.5 * k;
      for (let i = 0; i < 3; i++)
        mote(V(c.x + (R() - 0.5) * 8, 7, c.z + (R() - 0.5) * 6), {
          t: STREAK,
          c: 0xbfd8ff,
          v: [0.6, -14, 0],
          g: 0,
          l: 0.45,
          s: 0.5,
          o: 0.6,
        });
    });
    for (let w = 0; w < tw2; w++)
      for (const f of L) {
        const b = chest(f);
        zap(top.clone().add(V((R() - 0.5) * 2, 0, (R() - 0.5) * 2)), foeAt(f).setY(0.1), 0xfff06a, 260, {
          w: one ? 0.09 : 0.06,
          end: 4,
        });
        flashScr("#f8f4ff", 0.25);
        glow.material.opacity = 1;
        shock(foeAt(f), 0xfff06a, one ? 3.2 : 2.2, 380);
        burst(b, 0xffffa0, 14, 7, { s: 0.3 });
        decal(b.x, b.z, "scorch", 1.2);
        flash(b, 0xfff06a, 9, 280);
        shk = one ? 0.9 : 0.55;
        await wait(one ? 200 : 140);
      }
    await cl;
    drop(glow);
  };
  // Tailwind: a spiral of wind lifts the wizard's robes; glowing feathers wheel round them and the lantern brightens
  A.gtail = async (x) => {
    const p = me(),
      o = new T.Group(),
      F = [];
    for (let i = 0; i < 10; i++) {
      const s = new T.Sprite(smat(LEAF, i % 2 ? 0xfff6a0 : 0xe8fff4));
      s.scale.setScalar(0.45);
      s.userData.a = (i / 10) * 6.283;
      o.add(s);
      F.push(s);
    }
    const col = new T.Mesh(
      new T.CylinderGeometry(0.9, 1.4, 4, 24, 1, true),
      bmat({ map: SWIRL, color: 0xe8fff4, opacity: 0 }),
    );
    col.position.y = 2;
    o.add(col);
    o.position.copy(p);
    await tmp2(o, 1000, (k) => {
      F.forEach((s, i) => {
        const an = s.userData.a + k * 10,
          r = 1.2 - k * 0.3;
        s.position.set(Math.cos(an) * r, 0.3 + k * 3 + Math.sin(an * 2) * 0.2, Math.sin(an) * r);
        s.material.rotation = an;
        s.material.opacity = k > 0.8 ? (1 - k) / 0.2 : 1;
      });
      col.rotation.y = -k * 12;
      col.material.map.offset.y = k * 2;
      col.material.opacity = Math.sin(k * PI) * 0.6;
    });
    await charge("storm", 200);
    if (x.r.b1) bubbleOn(p, 0xd8fff0);
    vshock(p.clone().setY(1.5), 0xfff06a, 1.8, 320);
  };
  // a quick shield bubble round someone
  function bubbleOn(p, col) {
    const s = new T.Mesh(new T.SphereGeometry(1.3, 20, 14), glass(col, 0.3));
    s.position.copy(p).setY(1.2);
    return tmp2(s, 700, (k) => {
      s.scale.setScalar(0.4 + eo(Math.min(1, k * 2)) * 0.7);
      s.material.opacity = 0.35 * (1 - k);
    });
  }
  // Skybreaker: the sky tears open into a spinning funnel, a spear of lightning drops through it, then the storm
  // spills out across every foe
  A.gsky = async (x) => {
    const one = x.r.b1,
      L = one ? [x.f] : x.L,
      c = one ? foeAt(x.f) : mid(L.map(foeAt)),
      fun = new T.Mesh(
        new T.CylinderGeometry(4.5, 0.6, 12, 32, 6, true),
        bmat({ map: SWIRL, color: 0xd8e8ff, opacity: 0 }),
      );
    await charge("storm", 320);
    flashScr("#02030e", 0.55);
    fun.position.set(c.x, 9, c.z);
    FXP.add(fun);
    const cl = cloud(c.clone().setY(15), 6, 2600);
    await tw(800, (k) => {
      fun.rotation.y = -k * 14;
      fun.material.map.offset.set(k * 4, -k * 2);
      fun.material.opacity = 0.75 * k;
      fun.scale.set(0.4 + k * 0.6, 1, 0.4 + k * 0.6);
      if (R() < 0.5)
        zap(
          V(c.x + (R() - 0.5) * 6, 14, c.z + (R() - 0.5) * 6),
          V(c.x + (R() - 0.5) * 3, 9, c.z + (R() - 0.5) * 3),
          0xbfd8ff,
          90,
          { w: 0.03, forks: 1 },
        );
    });
    // the spear
    const sp = new T.Group(),
      core = new T.Mesh(new T.OctahedronGeometry(0.5, 0), new T.MeshBasicMaterial({ color: 0xffffff })),
      sg = spr(WGT, 0xfff06a, 5);
    core.scale.set(0.6, 6, 0.6);
    sp.add(core, sg);
    await shoot(sp, c.clone().setY(16), c.clone().setY(1.5), 260, 0, (p) => trail(p, 0xfff6c0, 1.2));
    shk = 1.6;
    flashScr("#ffffff", 0.9);
    await hold(90);
    shock(c, 0xffffff, one ? 4 : 7, 420);
    shock(c, 0xfff06a, one ? 6 : 9, 760);
    pillar(c, 0xfff6c0, one ? 1.2 : 2, 16, 700, { shrink: 1 });
    glowBurst(c.clone().setY(2), 0xffffff, 12, 600);
    flash(c.clone().setY(2), 0xfff06a, 16, 800);
    decal(c.x, c.z, "scorch", one ? 3 : 5);
    if (!one)
      L.forEach((f, i) =>
        wait(i * 70).then(() => {
          zap(c.clone().setY(1.5), chest(f), 0xfff06a, 320, { w: 0.07, end: 3.5 });
          burst(chest(f), 0xffffa0, 18, 8, { s: 0.35 });
          shock(foeAt(f), 0xfff06a, 2.4, 420);
        }),
      );
    else fling(c.clone().setY(0.5), 10, 6, { rock: 1, col: 0x2a2840, em: 0x3a3a8a });
    await tw(500, (k) => (fun.material.opacity = 0.75 * (1 - k)));
    drop(fun);
    await cl;
  };
  // ---------- RIME (Warden) ----------
  // Frost Shard: a spinning cluster of crystal flies out and bursts into frost
  A.rshard = async (x) => {
    const f = x.f,
      a = await charge("ice", 200),
      b = chest(f),
      o = new T.Group(),
      ice = toon(0xe8fbff, 0x3a9ad8, 0.8);
    for (let i = 0; i < 3; i++) {
      const m = new T.Mesh(new T.OctahedronGeometry(0.22, 0), ice);
      m.scale.set(0.7, 2, 0.7);
      m.rotation.z = (i - 1) * 0.5;
      m.position.x = (i - 1) * 0.12;
      o.add(m);
    }
    o.add(spr(WGT, 0x9fe8ff, 1.4));
    await shoot(o, a, b, 300, 0.9, (p, k) => {
      o.rotation.set(k * 4, k * 18, 0);
      if (R() < 0.7)
        mote(p, { t: FLK, c: 0xdff8ff, v: [R() - 0.5, R() * 0.5, R() - 0.5], g: 0.5, l: 0.6, s: 0.3, sp: 4 });
    });
    shk = 0.3;
    fling(b, x.r.a1 ? 12 : 7, 4, { sz: 0.12 });
    vshock(b, 0xdff8ff, 1.4, 300);
    glowBurst(b, 0x9fe8ff, 3.5, 320);
    const q = foeAt(f);
    spikes(
      [0, 1, 2, 3, 4].map((i) => {
        const an = (i / 5) * 6.283;
        return [q.x + Math.cos(an) * 0.9, q.z + Math.sin(an) * 0.9, i / 5, 0.45];
      }),
      700,
    );
    decal(b.x, b.z, "frost", 1.4);
    if (x.r.a1) x.L.forEach((q2) => q2 !== f && wait(120).then(() => vshock(chest(q2), 0xdff8ff, 1, 260)));
    if (x.r.b1) bubbleOn(me(), 0x8ad0ff);
    await wait(80);
  };
  // Glacier Wall: slabs of ice burst out of the ground in an arc before the wizard; frost mist rolls off them
  A.rwall = async (x) => {
    const p = me(),
      o = new T.Group(),
      ice = toon(0xd8f4ff, 0x2a7ac8, 0.6),
      top = toon(0xffffff, 0x8ab0d0, 0.3),
      S2 = [];
    for (let i = 0; i < 5; i++) {
      const an = (i - 2) * 0.42,
        h = 2.2 + (i % 2) * 0.7 + (2 - Math.abs(i - 2)) * 0.4,
        sl = new T.Group(),
        m = new T.Mesh(new T.BoxGeometry(1.1, h, 0.55), ice),
        t = new T.Mesh(new T.ConeGeometry(0.62, 0.8, 4), top);
      m.position.y = h / 2;
      t.position.y = h + 0.3;
      t.rotation.y = PI / 4;
      sl.add(m, t);
      sl.position.set(p.x + Math.cos(an) * 2.2, 0, p.z + Math.sin(an) * 2.2);
      sl.rotation.set((R() - 0.5) * 0.15, -an + PI / 2, (R() - 0.5) * 0.15);
      sl.userData = { h, d: Math.abs(i - 2) * 0.08 };
      o.add(sl);
      S2.push(sl);
    }
    const gl = spr(WGT, 0x8ad0ff, 6);
    gl.position.set(p.x + 2, 1.4, p.z);
    o.add(gl);
    await charge("ice", 220);
    shk = 0.5;
    shock(p, 0x9fe8ff, 3.4, 520);
    smoke(p.clone().add(V(2, 0.2, 0)), 0xdfefff, 6, 1.6);
    await tmp2(o, 1300, (k) => {
      S2.forEach((sl) => {
        const u = sl.userData,
          t = Math.max(0, Math.min(1, (k - u.d) / 0.18)),
          out = k > 0.75 ? (k - 0.75) / 0.25 : 0;
        sl.position.y = -u.h * (1 - eo(t)) - out * u.h * 1.1;
        sl.scale.setScalar(1 - out * 0.2);
      });
      gl.material.opacity = Math.sin(k * PI) * 0.8;
      if (k > 0.75 && R() < 0.4) fling(o.children[(R() * 5) | 0].position.clone().setY(1), 2, 2, { sz: 0.1, ms: 600 });
    });
    if (!x.r.a1) {
      // the challenge: a roar ring rolls out toward the foes
      ring(p.x, 0x8ad0ff, 9, 520, p.z);
      x.L.forEach((f) => rune(foeAt(f), "ice", 1.2, 700, 0x8ad0ff));
    } else heroes().forEach((q) => bubbleOn(q, 0x8ad0ff));
    if (x.r.b1)
      spikes(
        [0, 1, 2, 3, 4, 5].map((i) => [p.x + 2.4 + (i % 2) * 0.5, p.z + (i - 2.5) * 0.7, i / 6, 0.35]),
        800,
      );
  };
  // Frozen Hammer: a great ice hammer forms over the foe, rears back and comes down, ice spikes ringing out
  A.rhammer = async (x) => {
    const f = x.f,
      q = foeAt(f),
      hm = mkHammer(),
      u = hm.userData,
      big = x.r.b1 ? 1.25 : 1;
    await charge("ice", 260);
    hm.position.set(q.x - 3.4, 0, q.z);
    hm.scale.setScalar(0.01);
    FXP.add(hm);
    // forming: frost gathers into the hammer
    await tw(500, (k) => {
      hm.scale.setScalar(0.01 + eo(k) * big);
      u.piv.rotation.z = 0.4 + k * 0.6; // reared back over the shoulder
      if (R() < 0.7)
        mote(hm.position.clone().add(V(1, 3.5, 0)), {
          t: FLK,
          c: 0xdff8ff,
          v: [(R() - 0.5) * 3, (R() - 0.5) * 3, (R() - 0.5) * 3],
          g: 0,
          l: 0.5,
          s: 0.3,
          gr: -1,
        });
    });
    await tw(230, (k) => (u.piv.rotation.z = 1.0 - k * k * 2.55));
    shk = 1.1 * big;
    flashScr("#dff8ff", 0.4);
    await hold(60);
    shock(q, 0xdff8ff, 3.5 * big, 520);
    shock(q, 0x6fd3ff, 5 * big, 700);
    vshock(chest(f), 0xffffff, 2, 300);
    fling(chest(f), 14, 6, { sz: 0.16 });
    decal(q.x, q.z, "frost", 2.4 * big);
    flash(chest(f), 0x9fe8ff, 9, 500);
    const sp = [];
    for (let i = 0; i < 10; i++) {
      const an = (i / 10) * 6.283;
      sp.push([q.x + Math.cos(an) * 1.6, q.z + Math.sin(an) * 1.6, i / 10, 0.6 + (i % 2) * 0.2]);
    }
    if (x.r.a1)
      x.L.forEach((f2) => {
        if (f2 === f) return;
        const p2 = foeAt(f2);
        for (let i = 0; i < 4; i++) sp.push([p2.x + (R() - 0.5) * 1.4, p2.z + (R() - 0.5) * 1.4, 0.3 + R() * 0.4, 0.7]);
      });
    spikes(sp, 900);
    await tw(400, (k) => {
      hm.scale.setScalar(big * (1 - k));
      u.gl.material.opacity = 1 - k;
    });
    drop(hm);
    if (x.r.a2) bubbleOn(me(), 0x8ad0ff);
  };
  // Frostbite Ring: a ring of frost races out from the wizard and icicles erupt round every foe
  A.rring = async (x) => {
    const p = me(),
      a = await charge("ice", 240);
    shock(p, 0xdff8ff, 3, 380);
    const rg = new T.Mesh(new T.RingGeometry(0.9, 1.2, 48), glass(0xbfeeff, 0.9));
    rg.rotation.x = -PI / 2;
    rg.position.set(p.x, 0.2, p.z);
    await tmp2(rg, 520, (k) => {
      rg.scale.setScalar(1 + eo(k) * 11);
      rg.material.opacity = 0.9 * (1 - k * 0.7);
      if (R() < 0.7) {
        const an = R() * 6.283,
          r = 1 + eo(k) * 11;
        mote(V(p.x + Math.cos(an) * r, 0.3, p.z + Math.sin(an) * r), {
          t: FLK,
          c: 0xdff8ff,
          v: [0, 1.5, 0],
          g: 0,
          l: 0.6,
          s: 0.4,
          sp: 3,
        });
      }
    });
    const sp = [];
    x.L.forEach((f) => {
      const q = foeAt(f);
      for (let i = 0; i < 7; i++) {
        const an = (i / 7) * 6.283 + R() * 0.3;
        sp.push([q.x + Math.cos(an) * 1.3, q.z + Math.sin(an) * 1.3, R() * 0.3, x.r.b1 ? 0.75 : 0.55]);
      }
      decal(q.x, q.z, "frost", 1.8);
      vshock(chest(f), 0xdff8ff, 1.2, 280);
    });
    spikes(sp, 850);
    shk = 0.45;
    if (x.r.a2) ring(p.x, 0x8ad0ff, 8, 480, p.z);
    await wait(150);
  };
  // Avatar of Winter: an ice colossus climbs out of the ground behind the wizard, raises both fists and slams the
  // field; every foe is speared by ice and the party is wrapped in frost armour, then the giant crumbles into snow
  A.ravatar = async (x) => {
    const p = me(),
      co = mkColossus(),
      u = co.userData,
      at = p.clone().add(V(-3.2, 0, -1.4));
    co.position.set(at.x, -7.5, at.z);
    co.rotation.y = PI / 2;
    co.scale.setScalar(0.8);
    FXP.add(co);
    await charge("ice", 320);
    flashScr("#04101a", 0.45);
    rune(at, "ice", 3.6, 2600, 0x6fd3ff);
    // rise, shedding snow
    await tw(1000, (k) => {
      co.position.y = -7.5 * (1 - eo(k));
      shk = 0.25;
      if (R() < 0.8) smoke(at.clone().setY(0.3), 0xeaf4ff, 1, 1.6);
      u.arms.forEach((m, i) => (m.rotation.x = -k * 2.6));
    });
    // slam
    await tw(260, (k) => u.arms.forEach((m) => (m.rotation.x = -2.6 + k * k * 1.9))); // down in front of it
    shk = 1.5;
    flashScr("#e8fbff", 0.7);
    await hold(80);
    const fp = at.clone().add(V(2.6, 0, 0));
    shock(fp, 0xffffff, 6, 520);
    shock(fp, 0x6fd3ff, 11, 900);
    flash(fp.clone().setY(1), 0x9fe8ff, 14, 800);
    const sp = [];
    x.L.forEach((f, j) => {
      const q = foeAt(f);
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * 6.283;
        sp.push([q.x + Math.cos(an) * 1.2, q.z + Math.sin(an) * 1.2, 0.2 + j * 0.08, 0.9]);
      }
      sp.push([q.x, q.z, 0.25 + j * 0.08, 1.6]);
      decal(q.x, q.z, "frost", 2.4);
      fling(chest(f), 8, 5, { sz: 0.14 });
    });
    spikes(sp, 1100);
    heroes().forEach((q) => {
      bubbleOn(q, 0x8ad0ff);
      pillar(q, 0x9fe8ff, 0.9, 6, 700);
    });
    await wait(500);
    // crumble
    await tw(700, (k) => {
      co.scale.setScalar(0.8 * (1 - k * 0.9));
      co.position.y = -k * 3;
      if (R() < 0.9) fling(at.clone().setY(3 + R() * 2), 2, 3, { sz: 0.2, ms: 700 });
    });
    smoke(at.clone().setY(0.5), 0xffffff, 8, 2);
    drop(co);
  };
  // ---------- VERDANT (Mender) ----------
  // Thornseed: a seed is lobbed onto the foe and a crown of thorny shoots bursts up round it
  A.vseed = async (x) => {
    const f = x.f,
      q = foeAt(f),
      a = await charge("heal", 200),
      seed = new T.Group(),
      sm = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), toon(0x7a5a2a, 0x2a4a10, 0.5));
    sm.scale.set(1, 1.3, 1);
    seed.add(sm, spr(WGT, 0x9aff9a, 1));
    await shoot(seed, a, q.clone().setY(0.3), 360, 2.4, (p, k) => {
      sm.rotation.z = k * 10;
      if (R() < 0.5) mote(p, { t: LEAF, c: 0xffffff, v: [R() - 0.5, R(), R() - 0.5], g: 2, l: 0.6, s: 0.25, sp: 5 });
    });
    const o = new T.Group(),
      vm = toon(0x3a8a3a, 0x0a3a10, 0.4),
      tm = toon(0xc8e89a, 0x3a5a10, 0.4),
      Sh = [],
      n = x.r.b1 ? 9 : 6;
    for (let i = 0; i < n; i++) {
      const an = (i / n) * 6.283,
        s = new T.Group(),
        st = new T.Mesh(new T.ConeGeometry(0.13, 1.8, 6), vm);
      st.position.y = 0.9;
      s.add(st);
      for (let j = 0; j < 3; j++) {
        const th = new T.Mesh(new T.ConeGeometry(0.05, 0.25, 4), tm);
        th.position.set(0.1, 0.4 + j * 0.45, 0);
        th.rotation.z = -1.2;
        s.add(th);
      }
      s.position.set(q.x + Math.cos(an) * 0.7, 0, q.z + Math.sin(an) * 0.7);
      s.rotation.set(Math.sin(an) * 0.5, -an, -Math.cos(an) * 0.5);
      s.scale.setScalar(0.01);
      o.add(s);
      Sh.push(s);
    }
    shk = 0.3;
    burst(chest(f), 0x9aff9a, 12, 5, { s: 0.3 });
    await tmp2(o, 900, (k) => {
      const e = k < 0.25 ? eo(k / 0.25) : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      Sh.forEach((s) => s.scale.setScalar(Math.max(0.01, e * (x.r.b1 ? 1.2 : 1))));
    });
    const hp = me();
    // the life it drew comes back as motes to you (or the whole party with Leech Seed)
    (x.r.a1 ? heroes() : [hp]).forEach((t) => {
      for (let i = 0; i < 8; i++)
        mote(chest(f), { c: 0x9aff9a, v: [(t.x - q.x) * 1.4, 1.5 + R(), (t.z - q.z) * 1.4], g: 2.2, l: 0.7, s: 0.3 });
      wait(500).then(() => glowBurst(t.clone().setY(1.3), 0x9aff9a, 2.5, 300));
    });
  };
  // Renewing Rain: a canopy of leaves gathers overhead and a soft green rain falls; flowers open at every hero's feet
  A.vrain = async (x) => {
    const T0 = team(),
      c = mid(T0),
      big = x.r.a1,
      o = new T.Group(),
      Lf = [];
    await charge("heal", 220);
    for (let i = 0; i < 26; i++) {
      const s = new T.Sprite(smat(LEAF, i % 3 ? 0x9affc0 : 0xfff6a0, { blending: T.NormalBlending }));
      s.scale.setScalar(0.6 + R() * 0.4);
      s.userData = { a: R() * 6.283, d: R() * 3.4, y: (R() - 0.5) * 0.6 };
      o.add(s);
      Lf.push(s);
    }
    const gl = spr(WGT, 0x9affc0, 7);
    o.add(gl);
    o.position.set(c.x, 5.8, c.z);
    await tmp2(o, 1500, (k) => {
      const f = k < 0.2 ? k / 0.2 : k > 0.85 ? (1 - k) / 0.15 : 1;
      Lf.forEach((s) => {
        const u = s.userData;
        u.a += 0.01;
        s.position.set(Math.cos(u.a) * u.d * (0.5 + f * 0.5), u.y, Math.sin(u.a) * u.d * (0.5 + f * 0.5));
        s.material.opacity = f;
        s.material.rotation = u.a * 2;
      });
      gl.material.opacity = 0.5 * f;
      if (k > 0.15 && k < 0.85)
        for (let i = 0; i < (big ? 4 : 2); i++)
          mote(V(c.x + (R() - 0.5) * 6, 5.5, c.z + (R() - 0.5) * 5), {
            t: STREAK,
            c: 0x9affc0,
            v: [0, -9, 0],
            g: 0,
            l: 0.6,
            s: 0.35,
            o: 0.7,
          });
      if (k > 0.4 && R() < 0.15) {
        const t = T0[(R() * T0.length) | 0];
        mote(t.clone().setY(0.4), {
          t: PETAL,
          c: 0xffffff,
          v: [R() - 0.5, 1.5, R() - 0.5],
          g: -0.4,
          l: 1,
          s: 0.35,
          sp: 3,
        });
      }
    });
    T0.forEach((t) => {
      flowers(t, 5, x.r.b1 ? 0xbfe8ff : 0xffb0d8);
      pillar(t, 0x9affc0, 0.8, 5, 700);
      if (x.r.b1) bubbleOn(t, 0x9affc0);
    });
    if (x.r.a2) x.L.forEach((f) => flowers(foeAt(f), 4, 0xff8ac0));
  };
  // Wildvine Grasp: thick thorny vines tear out of the ground, coil up round the foe and squeeze
  A.vvine = async (x) => {
    const L = x.r.b1 ? x.L : [x.f];
    await charge("heal", 240);
    const o = new T.Group(),
      vm = toon(0x3a7a2a, 0x0a3a0a, 0.35),
      tm = toon(0xd8f0a0, 0x3a5a10, 0.4),
      V2 = [],
      Th = [];
    L.forEach((f) => {
      const q = foeAt(f),
        h = f.th ? Math.min(3.2, f.th - 0.4) : 2.4;
      for (let v = 0; v < 3; v++) {
        const pts = [],
          a0 = (v / 3) * 6.283;
        for (let i = 0; i <= 14; i++) {
          const t = i / 14,
            an = a0 + t * 9,
            r = 1.6 - t * 0.7;
          pts.push(V(q.x + Math.cos(an) * r, -0.5 + t * h, q.z + Math.sin(an) * r));
        }
        const m = vineMesh(pts, x.r.a1 ? 0.13 : 0.1, vm, 64);
        o.add(m);
        V2.push(m);
        for (let j = 3; j < 14; j += 3) {
          const th = new T.Mesh(new T.ConeGeometry(0.06, 0.32, 4), tm);
          th.position.copy(pts[j]);
          th.lookAt(V(q.x, pts[j].y, q.z));
          th.rotateX(-PI / 2);
          th.scale.setScalar(0.01);
          th.userData.t = j / 14;
          o.add(th);
          Th.push(th);
        }
      }
      decal(q.x, q.z, "scorch", 1.4);
    });
    shk = 0.35;
    await tmp2(o, 1300, (k) => {
      const gk = eo(Math.min(1, k / 0.45)),
        sq = k > 0.45 && k < 0.8 ? Math.sin((k - 0.45) * 40) * 0.05 : 0,
        out = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
      V2.forEach((m) => {
        grow(m, gk);
        m.scale.set(1 - sq, 1, 1 - sq);
      });
      Th.forEach((th) => th.scale.setScalar(Math.max(0.01, (gk > th.userData.t ? 1 : 0) * out)));
      if (k > 0.45 && k < 0.47) {
        shk = 0.6;
        L.forEach((f) => {
          burst(chest(f), 0x9aff9a, 16, 5, { s: 0.3 });
          vshock(chest(f), 0x9aff9a, 1.4, 260);
        });
      }
      o.children.forEach((c) => c.material && (c.material.opacity = out));
    });
    if (!x.r.a1) heroes().forEach((t) => glowBurst(t.clone().setY(1.3), 0x9aff9a, 2.5, 320));
  };
  // Sanctuary Grove: saplings spring up in a ring round the team and a dome of leaf-light closes over them
  A.vgrove = async (x) => {
    const T0 = team(),
      c = mid(T0),
      r = Math.max(3.4, ...T0.map((p) => Math.hypot(p.x - c.x, p.z - c.z) + 1.4)),
      o = new T.Group(),
      Tr = [],
      bark = toon(0x6a4a2a, 0x1a0a00, 0.2),
      lf = toon(x.r.b1 ? 0xa8c890 : 0x5ad87a, 0x1a6a2a, 0.5);
    await charge("heal", 220);
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * 6.283,
        t = new T.Group(),
        tr = new T.Mesh(new T.CylinderGeometry(0.07, 0.12, 1.4, 6), bark),
        cr = new T.Mesh(new T.IcosahedronGeometry(0.55, 0), lf);
      tr.position.y = 0.7;
      cr.position.y = 1.6;
      t.add(tr, cr);
      t.position.set(c.x + Math.cos(an) * r, 0, c.z + Math.sin(an) * r);
      t.scale.setScalar(0.01);
      t.userData.d = i * 0.04;
      o.add(t);
      Tr.push(t);
    }
    const dome = new T.Mesh(new T.SphereGeometry(r, 28, 14, 0, 6.283, 0, PI / 2), glass(0x9affc0, 0));
    dome.position.copy(c);
    o.add(dome);
    rune(c, "heal", r, 1500, 0xbfffe0);
    await tmp2(o, 1500, (k) => {
      Tr.forEach((t) => {
        const e = Math.max(0, Math.min(1, (k - t.userData.d) / 0.25)),
          out = k > 0.82 ? 1 - (k - 0.82) / 0.18 : 1;
        t.scale.setScalar(Math.max(0.01, eo(e) * out));
      });
      dome.material.opacity = Math.sin(Math.min(1, k * 1.1) * PI) * 0.22;
      dome.scale.y = Math.min(1, k * 2.5);
      if (R() < 0.3)
        mote(V(c.x + (R() - 0.5) * r * 1.6, 0.2, c.z + (R() - 0.5) * r * 1.6), {
          t: LEAF,
          c: 0xffffff,
          v: [0, 1.4, 0],
          g: -0.2,
          l: 1.1,
          s: 0.3,
          sp: 3,
        });
    });
    if (x.r.a1) T0.forEach((t) => pillar(t, 0x9affc0, 0.8, 5, 600));
  };
  // Heart of the Grove: a great tree grows behind the party, its crown bursts with light and petals pour down
  A.vheart = async (x) => {
    const p = me(),
      at = p.clone().add(V(-3.6, 0, -0.8)),
      tr = mkTree(),
      u = tr.userData;
    tr.position.copy(at);
    FXP.add(tr);
    tr.scale.setScalar(0.01);
    await charge("heal", 320);
    flashScr("#04140a", 0.3);
    rune(at, "heal", 3.4, 2800, 0x9affc0);
    shk = 0.3;
    // grow: trunk up, roots out, crowns pop one after another
    await tw(1100, (k) => {
      const e = eo(k);
      tr.scale.set(0.3 + e * 0.7, Math.max(0.01, e), 0.3 + e * 0.7);
      u.crowns.forEach((c, i) =>
        c.scale.setScalar(Math.max(0.01, eo(Math.max(0, Math.min(1, (k - 0.4 - i * 0.06) / 0.3))))),
      );
      u.fruit.forEach((s) => (s.material.opacity = Math.max(0, k - 0.6) * 2.5));
      if (R() < 0.6)
        mote(at.clone().add(V((R() - 0.5) * 2, 0.2, (R() - 0.5) * 2)), {
          t: LEAF,
          c: 0xffffff,
          v: [(R() - 0.5) * 2, 3, (R() - 0.5) * 2],
          g: 0.6,
          l: 1,
          s: 0.3,
          sp: 4,
        });
    });
    flashScr("#f0ffe0", 0.45);
    glowBurst(at.clone().setY(5.5), 0xfff6c0, 12, 800);
    flash(at.clone().setY(4), 0x9affc0, 12, 1200);
    const T0 = team();
    // petals and gold light rain onto the party
    await tw(1100, (k) => {
      u.fruit.forEach((s, i) => s.scale.setScalar(0.8 + Math.sin(k * 20 + i) * 0.25));
      for (let i = 0; i < 3; i++) {
        const t = T0[(R() * T0.length) | 0];
        mote(V(t.x + (R() - 0.5) * 3, 5 + R() * 2, t.z + (R() - 0.5) * 3), {
          t: R() < 0.6 ? PETAL : null,
          c: R() < 0.5 ? 0xffffff : 0xfff0a0,
          v: [(R() - 0.5) * 0.6, -2.4, (R() - 0.5) * 0.6],
          g: 0,
          l: 1.6,
          s: 0.35,
          sp: 3,
        });
      }
    });
    T0.forEach((t) => {
      pillar(t, 0xfff0b0, 1, 8, 900);
      flowers(t, 6);
      if (x.r.b1) bubbleOn(t, 0x9affc0);
    });
    if (x.r.a1 || x.r.b2)
      x.L.forEach((f) => {
        const q = foeAt(f);
        spikesGreen(q);
        if (x.r.a1) burst(chest(f), 0x9aff9a, 14, 6, { s: 0.3 });
      });
    await wait(300);
    await tw(600, (k) => tr.scale.setScalar(Math.max(0.01, 1 - k)));
    drop(tr);
  };
  // roots bursting up round a foe (green spikes)
  function spikesGreen(q) {
    const o = new T.Group(),
      m = toon(0x5a3a1a, 0x1a2a00, 0.3),
      R2 = [];
    for (let i = 0; i < 6; i++) {
      const an = (i / 6) * 6.283,
        r = new T.Mesh(new T.ConeGeometry(0.18, 1.6, 6), m);
      r.position.set(q.x + Math.cos(an) * 0.9, 0, q.z + Math.sin(an) * 0.9);
      r.rotation.set(-Math.sin(an) * 0.5, 0, Math.cos(an) * 0.5);
      r.scale.setScalar(0.01);
      o.add(r);
      R2.push(r);
    }
    return tmp2(o, 900, (k) => {
      const e = k < 0.3 ? eo(k / 0.3) : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      R2.forEach((r) => {
        r.scale.setScalar(Math.max(0.01, e));
        r.position.y = e * 0.6;
      });
    });
  }
  // ---------- SPIRIT (Wispcaller) ----------
  // Wisp Bolt: a little ghost loops out of the lantern and dives wailing into the foe (with Echo, every ally sends one)
  async function wisp(a, b, s) {
    const o = new T.Group(),
      gh = spr(GHT, 0xd8c0ff, 1.1 * s),
      gl = spr(WGT, 0xa070ff, 1.4 * s);
    o.add(gl, gh);
    const side = V((R() - 0.5) * 3, 2 + R(), (R() - 0.5) * 3),
      cv = new T.CatmullRomCurve3([
        a,
        a.clone().lerp(b, 0.35).add(side),
        a.clone().lerp(b, 0.7).sub(side.clone().multiplyScalar(0.5)),
        b,
      ]);
    FXP.add(o);
    await tw(420, (k) => {
      o.position.copy(cv.getPoint(eio(k)));
      gh.material.rotation = Math.sin(k * 12) * 0.3;
      if (R() < 0.6) mote(o.position, { t: GHT, c: 0x9a70ff, v: [0, 0.3, 0], g: 0, l: 0.4, s: 0.6 * s, o: 0.5 });
    });
    drop(o);
    vshock(b, 0xc9a0ff, 1.2 * s, 300);
    burst(b, 0xc9a0ff, 10, 4, { s: 0.3 });
  }
  A.swisp = async (x) => {
    const f = x.f,
      b = chest(f),
      a = await charge("spirit", 200, 0xa070ff),
      sh = [wisp(a, b, x.r.b1 ? 1.4 : 1.1)];
    if (x.r.a1 && !SFXO)
      g.allies.forEach((s, i) => sh.push(wait(80 * (i + 1)).then(() => wisp(s.m.position.clone().setY(1.6), b, 0.7))));
    await Promise.all(sh);
    glowBurst(b, 0xa070ff, 3.5, 320);
    shk = 0.25;
    if (x.r.b2) rune(foeAt(f), "storm", 1.4, 800, 0xb07aff);
    if (x.r.a2 && !SFXO) g.allies.forEach((s) => glowBurst(s.m.position.clone().setY(1.4), 0xc9a0ff, 2, 300));
  };
  // Spirit Link: chains of ghost-light run from the wizard to every ally and pulse; the allies flare as they act
  A.slink = async (x) => {
    const p = casterP().clone().setY(1.6),
      L = SFXO ? [] : g.allies.map((s) => s.m.position.clone().setY(1.2));
    await charge("spirit", 220, 0xa070ff);
    rune(me(), "storm", 1.8, 1000, 0xb07aff);
    L.forEach((q, i) => {
      zap(p, q, 0xc9a0ff, 700, { w: 0.03, jit: 0.4, forks: 0, end: 2 });
      wait(i * 90).then(() => {
        pillar(q.clone().setY(0), 0xc9a0ff, 0.7, 4, 600);
        glowBurst(q, 0xc9a0ff, 3, 400);
      });
    });
    if (!L.length) vshock(p, 0xc9a0ff, 1.5, 300);
    await wait(500);
  };
  // Night Procession: purple fog rolls in, a bell tolls, and a line of lantern-bearing ghosts marches through the foes
  A.sproc = async (x) => {
    const L = x.L,
      c = mid(L.map(foeAt)),
      n = 7,
      M2 = [];
    await charge("spirit", 300, 0xa070ff);
    flashScr("#0a0418", 0.5);
    smoke(c.clone().setY(0.2), 0x3a2a5a, 10, 2.6);
    shock(c, 0xc9a0ff, 7, 900, 0.2, 0.6);
    const z0 = c.z - 3.2;
    for (let i = 0; i < n; i++) {
      const m = mkMarcher(i % 2 ? 0xd8c0ff : 0xbfe0ff);
      m.position.set(c.x - 9 - i * 1.6, 0, z0 + (i % 3) * 3.2);
      m.userData.x0 = m.position.x;
      m.userData.ph = R() * 6;
      FXP.add(m);
      M2.push(m);
    }
    const hit = new Set();
    await tw(1700, (k) => {
      M2.forEach((m) => {
        const u = m.userData;
        m.position.x = u.x0 + k * 22;
        m.position.y = Math.sin(k * 14 + u.ph) * 0.15;
        u.gh.material.opacity = Math.min(1, k * 5, (1 - k) * 5) * 0.9;
        u.ln.material.opacity = u.gh.material.opacity;
        if (R() < 0.15)
          mote(m.position.clone().setY(1.4), { t: GHT, c: 0x7a50cc, v: [-1, 0.2, 0], g: 0, l: 0.5, s: 0.9, o: 0.4 });
      });
      L.forEach((f) => {
        if (hit.has(f)) return;
        const q = foeAt(f);
        if (M2.some((m) => Math.abs(m.position.x - q.x) < 0.6)) {
          hit.add(f);
          vshock(chest(f), 0xc9a0ff, 1.6, 320);
          burst(chest(f), 0xc9a0ff, 14, 5, { s: 0.35 });
          shk = 0.3;
        }
      });
    });
    M2.forEach(drop);
    if (x.r.a2 && !SFXO) g.allies.forEach((s) => pillar(s.m.position.clone().setY(0), 0xc9a0ff, 0.7, 4, 600));
  };
  // a summon's arrival flourish for the Wispcaller's new allies
  A.sumIn = async (p, col) => {
    const q = p.clone().setY(0);
    smoke(q.clone().setY(0.3), 0x3a2a5a, 5, 1.4);
    for (let i = 0; i < 10; i++) {
      const an = (i / 10) * 6.283;
      mote(V(q.x + Math.cos(an) * 2, 0.4, q.z + Math.sin(an) * 2), {
        t: GHT,
        c: col,
        v: [-Math.cos(an) * 3, 1.8, -Math.sin(an) * 3],
        g: 0,
        l: 0.6,
        s: 0.8,
        o: 0.6,
      });
    }
  };
  // ===================================================================================================================
  // SUMMON MODELS (built by sumMesh for ALLY types lwisp / revn; idles in SPFX.idle)
  // ===================================================================================================================
  function lanternWisp() {
    const o = new T.Group(),
      b = new T.Group();
    o.add(b);
    const iron = toon(0x2a2438, 0x0a0614, 0.3),
      core = new T.Mesh(new T.SphereGeometry(0.2, 14, 10), new T.MeshBasicMaterial({ color: 0xf0e0ff })),
      glassM = new T.Mesh(new T.CylinderGeometry(0.26, 0.26, 0.5, 12, 1, true), glass(0xc9a0ff, 0.35));
    b.add(core, glassM);
    [-0.27, 0.27].forEach((y) => {
      const r = new T.Mesh(new T.TorusGeometry(0.28, 0.035, 6, 16), iron);
      r.rotation.x = PI / 2;
      r.position.y = y;
      b.add(r);
    });
    for (let i = 0; i < 4; i++) {
      const an = (i / 4) * 6.283 + 0.78,
        bar = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.56, 4), iron);
      bar.position.set(Math.cos(an) * 0.27, 0, Math.sin(an) * 0.27);
      b.add(bar);
    }
    const cap = new T.Mesh(new T.ConeGeometry(0.3, 0.26, 8), iron);
    cap.position.y = 0.42;
    b.add(cap);
    const hook = new T.Mesh(new T.TorusGeometry(0.09, 0.02, 6, 12), iron);
    hook.position.y = 0.62;
    b.add(hook);
    const face = spr(GHT, 0xffffff, 0.42),
      halo = spr(WGT, 0xa070ff, 1.6),
      fl = new T.Sprite(AM(SP.spirit || SP.storm));
    fl.scale.setScalar(0.7);
    b.add(halo, fl, face);
    // a wispy ghost tail trailing under the lantern
    const tail = [];
    for (let i = 0; i < 4; i++) {
      const t = spr(GHT, 0x9a70ff, 0.5 - i * 0.08);
      t.material.opacity = 0.55 - i * 0.1;
      t.position.y = -0.4 - i * 0.18;
      b.add(t);
      tail.push(t);
    }
    o.userData = { body: b, face, fl, halo, tail, core };
    return o;
  }
  function revenant() {
    const o = new T.Group(),
      b = new T.Group();
    o.add(b);
    const steel = toon(0x8a8ca8, 0x2a1a5a, 0.45),
      dark = toon(0x2a2438, 0x14082a, 0.35),
      gold = toon(0xd9a441, 0x5a3a00, 0.4),
      ghostM = glass(0x9a70ff, 0.45);
    // ghostly lower body: a fading drift of spirit instead of legs
    const drift = new T.Mesh(new T.ConeGeometry(0.55, 1.4, 12, 1, true), ghostM);
    drift.rotation.x = PI;
    drift.position.y = 0.75;
    b.add(drift);
    const tasset = new T.Mesh(new T.CylinderGeometry(0.42, 0.55, 0.45, 10), dark);
    tasset.position.y = 1.45;
    b.add(tasset);
    const chestM = new T.Mesh(new T.CylinderGeometry(0.55, 0.42, 0.85, 10), steel);
    chestM.position.y = 2.05;
    chestM.scale.z = 0.75;
    b.add(chestM);
    const belt = new T.Mesh(new T.TorusGeometry(0.44, 0.05, 6, 16), gold);
    belt.rotation.x = PI / 2;
    belt.position.y = 1.65;
    b.add(belt);
    [-1, 1].forEach((s) => {
      const pa = new T.Mesh(new T.SphereGeometry(0.3, 12, 8, 0, 6.283, 0, PI / 2), steel);
      pa.position.set(s * 0.6, 2.4, 0);
      pa.rotation.z = -s * 0.4;
      b.add(pa);
      const arm = new T.Mesh(new T.CylinderGeometry(0.12, 0.1, 0.7, 8), dark);
      arm.position.set(s * 0.68, 1.95, 0);
      b.add(arm);
    });
    const helm = new T.Mesh(new T.SphereGeometry(0.33, 14, 10), steel);
    helm.position.y = 2.8;
    helm.scale.set(0.95, 1.1, 1);
    b.add(helm);
    const visor = new T.Mesh(new T.BoxGeometry(0.42, 0.07, 0.1), new T.MeshBasicMaterial({ color: 0x14082a }));
    visor.position.set(0, 2.82, 0.31);
    b.add(visor);
    [-1, 1].forEach((s) => {
      const e = spr(WGT, 0xd8b0ff, 0.28);
      e.position.set(s * 0.1, 2.82, 0.36);
      b.add(e);
    });
    const plume = new T.Mesh(new T.ConeGeometry(0.1, 0.7, 6), glass(0xc9a0ff, 0.8));
    plume.position.set(0, 3.25, -0.1);
    plume.rotation.x = -0.5;
    b.add(plume);
    // the sword arm: a pivot so it can swing
    const sw = new T.Group();
    sw.position.set(0.72, 1.65, 0.1);
    const blade = new T.Mesh(new T.BoxGeometry(0.1, 1.5, 0.03), toon(0xe8e0ff, 0x6a4aaa, 0.8)),
      guard = new T.Mesh(new T.BoxGeometry(0.4, 0.07, 0.1), gold),
      grip = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.28, 6), dark);
    blade.position.y = 0.95;
    guard.position.y = 0.17;
    sw.add(blade, guard, grip);
    const bg = spr(WGT, 0xa070ff, 1.2);
    bg.position.y = 0.95;
    sw.add(bg);
    sw.rotation.x = 0.3;
    b.add(sw);
    // a kite shield on the other arm
    const shd = new T.Mesh(new T.CylinderGeometry(0.42, 0.05, 0.9, 3), steel);
    shd.rotation.set(PI / 2, 0, PI);
    shd.scale.set(1, 1, 0.15);
    shd.position.set(-0.72, 1.85, 0.25);
    b.add(shd);
    const emb = spr(WGT, 0xc9a0ff, 0.5);
    emb.position.set(-0.72, 1.9, 0.33);
    b.add(emb);
    const aura = spr(WGT, 0x7a50cc, 3.2);
    aura.position.y = 1.8;
    b.add(aura);
    o.userData = { body: b, sw, drift };
    return o;
  }
  // v48 Hearthfang (Pyre's Lv 10 summon): a lean hearth-hound of living flame. One painted body lathe (deep red haunches,
  // orange chest, gold belly and glowing flame curls), a long-snouted head with an opening jaw, glowing eyes, tall
  // flame-tuft ears and cheek ruffs, a mane of licks, jointed legs with gold claws, a six-link plume tail that trails
  // its sway, and an ember lantern on its collar. Faces +z; idle turns it to the foes. Pose knobs in userData:
  // ck (crouch 0..1), lp (leap 0..1), jk (jaw 0..1), set by its attack in 45.
  function hearthfang() {
    const o = new T.Group(),
      b = new T.Group();
    b.rotation.order = "YXZ"; // pitch about its own side axis after turning to the foes
    o.add(b);
    const mf = skinM("fur", 0.9),
      mt = skinM("tuft", 1.05),
      gold = toon(0xffd860, 0xffa020, 1),
      nose = toon(0x3a0c06, 0, 0),
      iron = toon(0x4a2a22, 0x1a0800, 0.3),
      eyeM = new T.MeshBasicMaterial({ color: 0xfff2b8 });
    const flat = (g) => g.rotateX(PI / 2); // a y-lathe laid along +z
    // torso: tail root at z -1.05, tucked waist, deep chest
    const torso = new T.Mesh(
      flat(
        LtS(
          [
            [0.001, 0],
            [0.3, 0.08],
            [0.4, 0.32],
            [0.35, 0.82],
            [0.42, 1.25],
            [0.52, 1.62],
            [0.46, 1.95],
            [0.2, 2.12],
            [0.001, 2.15],
          ],
          28,
        ),
      ),
      mf,
    );
    torso.position.set(0, 1.3, -1.05);
    torso.rotation.x = -0.1;
    torso.scale.set(0.8, 1, 1);
    b.add(torso);
    // neck, leaning forward and up from the chest
    const neck = new T.Mesh(
      LtS(
        [
          [0.36, 0],
          [0.32, 0.3],
          [0.27, 0.6],
          [0.25, 0.78],
        ],
        20,
      ),
      mf,
    );
    neck.position.set(0, 1.55, 0.8);
    neck.rotation.x = 0.75;
    neck.scale.set(0.85, 1, 1);
    b.add(neck);
    // ---- head ----
    const hd = new T.Group();
    hd.position.set(0, 2.15, 1.38);
    b.add(hd);
    const skull = new T.Mesh(new T.SphereGeometry(0.34, 22, 16), mf);
    skull.scale.set(0.92, 0.85, 1);
    hd.add(skull);
    const snout = new T.Mesh(
      flat(
        LtS(
          [
            [0.24, 0],
            [0.22, 0.2],
            [0.17, 0.4],
            [0.12, 0.55],
            [0.001, 0.6],
          ],
          20,
        ),
      ),
      mf,
    );
    snout.position.set(0, -0.06, 0.12);
    snout.scale.set(1, 0.78, 1);
    hd.add(snout);
    const nz = new T.Mesh(new T.SphereGeometry(0.075, 12, 10), nose);
    nz.scale.set(1.25, 0.8, 1);
    nz.position.set(0, -0.03, 0.68);
    hd.add(nz);
    // the jaw hangs from a hinge under the cheeks, with a glow of fire inside the mouth
    const jaw = new T.Group();
    jaw.position.set(0, -0.18, 0.1);
    hd.add(jaw);
    const jg = flat(
      LtS(
        [
          [0.17, 0],
          [0.15, 0.25],
          [0.08, 0.48],
          [0.001, 0.52],
        ],
        16,
      ),
    );
    const jm = new T.Mesh(jg, mf);
    jm.scale.set(1, 0.42, 1);
    jaw.add(jm);
    const mg = spr(WGT, 0xffa040, 0.7);
    mg.position.set(0, -0.12, 0.42);
    hd.add(mg);
    [-1, 1].forEach((s) => {
      const fg = new T.Mesh(new T.ConeGeometry(0.025, 0.11, 6), gold);
      fg.rotation.x = PI;
      fg.position.set(s * 0.08, -0.2, 0.5);
      hd.add(fg);
    });
    // eyes, brows, cheek ruffs
    const eyes = [];
    [-1, 1].forEach((s) => {
      const e = new T.Mesh(new T.SphereGeometry(0.062, 12, 10), eyeM);
      e.scale.set(1, 0.8, 1);
      e.position.set(s * 0.16, 0.06, 0.26);
      hd.add(e);
      const eg = spr(WGT, 0xffc860, 0.36);
      eg.position.copy(e.position);
      hd.add(eg);
      eyes.push(eg);
      const br = new T.Mesh(lickG(0.05, 0.3, -0.8, "z"), mt);
      br.position.set(s * 0.14, 0.16, 0.22);
      br.rotation.set(-1.05, 0, -s * 0.5);
      hd.add(br);
      for (let j = 0; j < 4; j++) {
        const c = new T.Mesh(lickG(0.08, 0.42 - j * 0.04, -0.5, "z"), mt);
        c.position.set(s * 0.26, -0.12 + j * 0.08, -0.04);
        c.rotation.set(-1.5 - j * 0.15, 0, -s * (0.55 + j * 0.12));
        hd.add(c);
      }
    });
    const chin = new T.Mesh(lickG(0.07, 0.3, 0.5, "z"), mt);
    chin.position.set(0, -0.26, 0.22);
    chin.rotation.x = PI - 0.35;
    hd.add(chin);
    // tall ears on pivots so they can twitch and flatten
    const ears = [-1, 1].map((s) => {
      const p = new T.Group();
      p.position.set(s * 0.19, 0.24, -0.06);
      const e = new T.Mesh(lickG(0.13, 0.58, -0.45, "z", 0.5), mt);
      e.rotation.z = -s * 0.32;
      p.add(e);
      const ti = new T.Mesh(lickG(0.05, 0.3, -0.6, "z"), mt);
      ti.position.set(s * 0.05, 0.02, 0.04);
      ti.rotation.z = -s * 0.7;
      p.add(ti);
      hd.add(p);
      return p;
    });
    // ---- mane: two rings of licks round the neck base, sweeping back ----
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 11 : 15,
        c = V(0, 1.7 + ring * 0.16, 0.95 + ring * 0.12),
        rr = ring ? 0.3 : 0.4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283 + ring * 0.3,
          h = (ring ? 0.5 : 0.62) + Math.sin(i * 2.7) * 0.1,
          m = new T.Mesh(lickG(ring ? 0.1 : 0.12, h, -0.5, "z"), mt);
        m.quaternion.setFromUnitVectors(UPV, V(Math.cos(a) * 0.85, Math.sin(a) * 0.85 + 0.25, -0.75).normalize());
        m.position.set(c.x + Math.cos(a) * rr * 0.85, c.y + Math.sin(a) * rr, c.z);
        b.add(m);
      }
    }
    // chest fluff and a ridge of small flames along the spine
    for (let i = 0; i < 5; i++) {
      const m = new T.Mesh(lickG(0.09, 0.42, 0.4, "z"), mt);
      m.position.set((i - 2) * 0.1, 1.15, 1.12);
      m.rotation.set(PI - 0.5, 0, (i - 2) * 0.2);
      b.add(m);
    }
    for (let i = 0; i < 7; i++) {
      const m = new T.Mesh(lickG(0.06, 0.26 + Math.sin(i * 1.3) * 0.08, -0.6, "z"), mt);
      m.position.set(0, 1.66 + i * 0.012, -0.75 + i * 0.22);
      m.rotation.x = -0.65;
      b.add(m);
    }
    // ember-lantern collar
    const col = new T.Mesh(new T.TorusGeometry(0.27, 0.035, 8, 26), iron);
    col.position.set(0, 1.9, 1.12);
    col.rotation.x = -0.75;
    b.add(col);
    const lan = new T.Group();
    lan.position.set(0, 1.62, 1.33);
    const cage = new T.Mesh(new T.CylinderGeometry(0.06, 0.07, 0.14, 6, 1, true), gold);
    cage.material.side = T.DoubleSide;
    const lcap = new T.Mesh(new T.ConeGeometry(0.08, 0.07, 6), iron);
    lcap.position.y = 0.1;
    const lg = spr(WGT, 0xffd070, 0.55);
    lan.add(cage, lcap, lg);
    b.add(lan);
    // ---- legs: hip pivot > knee pivot > paw (kept level) ----
    const legs = [];
    const leg = (x, z, y, front) => {
      const hip = new T.Group();
      hip.position.set(x, y, z);
      const ug = LtS(
        front
          ? [
              [0.17, 0],
              [0.16, 0.3],
              [0.11, 0.62],
            ]
          : [
              [0.25, 0],
              [0.2, 0.3],
              [0.11, 0.62],
            ],
        16,
      );
      ug.rotateX(PI);
      hip.add(new T.Mesh(ug, mf));
      const kn = new T.Group();
      kn.position.y = -0.6;
      hip.add(kn);
      const lg2 = LtS(
        [
          [0.1, 0],
          [0.08, 0.25],
          [0.07, 0.5],
        ],
        12,
      );
      lg2.rotateX(PI);
      kn.add(new T.Mesh(lg2, mf));
      const paw = new T.Group();
      paw.position.y = -0.5;
      kn.add(paw);
      const pd = new T.Mesh(new T.SphereGeometry(0.13, 14, 10), mf);
      pd.scale.set(1, 0.55, 1.35);
      pd.position.set(0, -0.02, 0.05);
      paw.add(pd);
      for (let c = -1; c <= 1; c++) {
        const cl = new T.Mesh(bend(new T.ConeGeometry(0.03, 0.14, 6).translate(0, 0.07, 0), 3, "z"), gold);
        cl.rotation.x = PI / 2 + 0.3;
        cl.position.set(c * 0.06, -0.05, 0.2);
        paw.add(cl);
      }
      // a flame tuft at the wrist / hock
      const tf = new T.Mesh(lickG(0.06, 0.3, -0.5, "z"), mt);
      tf.position.set(0, 0.32, -0.06);
      tf.rotation.x = -2.3;
      paw.add(tf);
      b.add(hip);
      const L = { hip, kn, paw, front };
      legs.push(L);
      return L;
    };
    [-1, 1].forEach((s) => {
      leg(s * 0.26, 0.72, 1.22, 1);
      leg(s * 0.27, -0.75, 1.13, 0);
    });
    // ---- tail: six links, each a core plus a ring of licks, ending in a live flame ----
    const tail = [];
    let par = new T.Group();
    par.position.set(0, 1.42, -1.0);
    par.rotation.x = 0.7;
    b.add(par);
    for (let i = 0; i < 6; i++) {
      const sg = new T.Group();
      sg.position.z = i ? -0.3 : 0;
      par.add(sg);
      par = sg;
      tail.push(sg);
      const r = 0.1 + Math.sin((i / 5) * PI * 0.85) * 0.13,
        core = new T.Mesh(new T.SphereGeometry(r, 12, 10), i < 3 ? mf : mt);
      core.scale.set(1, 1, 1.6);
      core.position.z = -0.12;
      sg.add(core);
      const n = 3 + Math.min(i, 3);
      for (let j = 0; j < n; j++) {
        const a = (j / n) * 6.283 + i * 1.1,
          t = new T.Mesh(lickG(r * 0.7, r * 2.6 + i * 0.06, -0.6, "z"), mt);
        t.quaternion.setFromUnitVectors(UPV, V(Math.cos(a) * 0.8, Math.sin(a) * 0.8, -1).normalize());
        t.position.set(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, -0.1);
        sg.add(t);
      }
    }
    const tip = new T.Sprite(AM(SP.fire));
    tip.scale.setScalar(0.9);
    tip.position.z = -0.45;
    par.add(tip);
    const aura = spr(WGT, 0xff6a1a, 2.6);
    aura.position.y = 1.4;
    aura.material.opacity = 0.5;
    b.add(aura);
    o.userData = { body: b, hd, jaw, mg, ears, eyes, legs, tail, tip, aura, mats: [mf, mt], ck: 0, lp: 0, jk: 0 };
    return o;
  }
  function idle(u, i, s) {
    const ud = u.m.userData,
      b = ud.body;
    if (!b) return;
    if (u.t === "lwisp") {
      b.position.y = Math.sin(s * 2.2 + i) * 0.15;
      b.rotation.y = Math.sin(s * 0.8 + i) * 0.5;
      b.rotation.z = Math.sin(s * 1.6 + i) * 0.12;
      ud.fl.material.rotation = s * 2;
      ud.halo.material.opacity = 0.6 + Math.sin(s * 5 + i) * 0.25;
      ud.face.position.y = Math.sin(s * 3) * 0.03;
      ud.tail.forEach((t, k) => (t.position.x = Math.sin(s * 3 - k * 0.8) * 0.08 * (k + 1)));
    } else if (u.t === "revn") {
      b.position.y = 0.2 + Math.sin(s * 1.5 + i) * 0.1;
      b.rotation.y = PI / 2 + Math.sin(s * 0.7 + i) * 0.12; // face the foes (+x)
      if (!u.act) ud.sw.rotation.x = 0.3 + Math.sin(s * 1.2) * 0.08;
      ud.drift.scale.set(1 + Math.sin(s * 4) * 0.06, 1, 1 + Math.cos(s * 4) * 0.06);
    } else if (u.t === "pfang") {
      const ck = ud.ck || 0,
        lp = ud.lp || 0,
        jk = ud.jk || 0,
        br = Math.sin(s * 2.4 + i);
      b.rotation.y = PI / 2; // face the foes (+x)
      b.position.y = -ck * 0.26 + br * 0.015;
      b.rotation.x = ck * 0.12 - lp * 0.3;
      // legs: rest stance, bent deeper in the crouch, front reaching and back kicking in the leap
      ud.legs.forEach((L) => {
        const h = (L.front ? 0.15 : -0.35) + (L.front ? 0.3 : -0.25) * ck + (L.front ? -1.0 : 0.9) * lp,
          n = (L.front ? -0.25 : 0.75) + (L.front ? -0.6 : 0.5) * ck + (L.front ? 0.5 : -0.4) * lp;
        L.hip.rotation.x = h;
        L.kn.rotation.x = n;
        L.paw.rotation.x = -(h + n) + lp * 0.4;
      });
      // head looks about, lowers in the crouch; the jaw pants and opens to bite
      ud.hd.rotation.y = Math.sin(s * 0.6 + i) * 0.25 * (1 - ck);
      ud.hd.rotation.x = Math.sin(s * 0.9 + i) * 0.06 + ck * 0.22 - lp * 0.2;
      ud.jaw.rotation.x = 0.04 + Math.max(0, Math.sin(s * 7 + i)) * 0.07 * (1 - jk) + jk * 0.6;
      ud.mg.material.opacity = 0.25 + jk * 0.75;
      ud.mg.scale.setScalar(0.6 + jk * 0.8);
      ud.ears.forEach((e, k) => {
        e.rotation.x = -Math.pow(Math.max(0, Math.sin(s * 1.3 + k * 2.1 + i)), 14) * 0.5 - ck * 0.6;
      });
      // tail: each link swings a little later than the one before, so the sway rolls down it
      ud.tail.forEach((t, k) => {
        t.rotation.y = Math.sin(s * 3.2 - k * 0.55 + i) * (0.12 + k * 0.03) * (1 + ck);
        t.rotation.x = -0.1 + Math.sin(s * 1.6 - k * 0.5) * 0.05 + lp * 0.12;
      });
      // the fire breathes
      ud.mats[1].emissiveIntensity = 0.95 + Math.sin(s * 9 + i) * 0.12 + Math.sin(s * 23 + i) * 0.05;
      ud.mats[0].emissiveIntensity = 0.85 + Math.sin(s * 5 + i) * 0.1;
      ud.tip.material.rotation = s * 3;
      ud.tip.scale.setScalar(0.85 + Math.sin(s * 11) * 0.12);
      ud.eyes.forEach((e) => e.scale.setScalar(0.34 + Math.sin(s * 4 + i) * 0.04 + jk * 0.2));
      ud.aura.material.opacity = 0.4 + Math.sin(s * 3 + i) * 0.1 + jk * 0.3;
    }
  }
  // ===================================================================================================================
  // CARD PICTURES (CARTX: drawn on a 128 canvas, origin at the centre, over the type backdrop)
  // ===================================================================================================================
  const ART2 = (() => {
    const G = (x, r, a, b) => {
        const q = x.createRadialGradient(0, 0, 0, 0, 0, r);
        q.addColorStop(0, a);
        q.addColorStop(1, b);
        x.fillStyle = q;
        x.beginPath();
        x.arc(0, 0, r, 0, 7);
        x.fill();
      },
      flame = (x, cx, cy, w, h, f) => {
        x.beginPath();
        x.moveTo(cx, cy - h);
        x.quadraticCurveTo(cx + w, cy - h * 0.35, cx + w * 0.7, cy - w * 0.2);
        x.quadraticCurveTo(cx, cy + w * 0.8, cx - w * 0.7, cy - w * 0.2);
        x.quadraticCurveTo(cx - w, cy - h * 0.35, cx, cy - h);
        x.fillStyle = f;
        x.fill();
      },
      bolt = (x, s, f) => {
        x.beginPath();
        [
          [10, -50],
          [-14, -4],
          [2, -4],
          [-10, 50],
          [18, -8],
          [3, -8],
        ].forEach((p, i) => (i ? x.lineTo(p[0] * s, p[1] * s) : x.moveTo(p[0] * s, p[1] * s)));
        x.closePath();
        x.fillStyle = f;
        x.fill();
        x.strokeStyle = "#a07a00";
        x.lineWidth = 2;
        x.stroke();
      },
      crystal = (x, cx, cy, w, h, f) => {
        x.beginPath();
        x.moveTo(cx, cy - h);
        x.lineTo(cx + w, cy);
        x.lineTo(cx, cy + h * 0.5);
        x.lineTo(cx - w, cy);
        x.closePath();
        x.fillStyle = f;
        x.fill();
        x.strokeStyle = "#2a7ab8";
        x.lineWidth = 2;
        x.stroke();
      },
      leaf = (x, cx, cy, s, r, f) => {
        x.save();
        x.translate(cx, cy);
        x.rotate(r);
        x.beginPath();
        x.moveTo(0, -s);
        x.quadraticCurveTo(s * 0.8, 0, 0, s);
        x.quadraticCurveTo(-s * 0.8, 0, 0, -s);
        x.fillStyle = f;
        x.fill();
        x.restore();
      },
      ghost = (x, cx, cy, s, f) => {
        x.save();
        x.translate(cx, cy);
        x.scale(s, s);
        x.fillStyle = f;
        x.beginPath();
        x.moveTo(-18, 6);
        x.quadraticCurveTo(-18, -26, 0, -26);
        x.quadraticCurveTo(18, -26, 18, 6);
        x.lineTo(18, 26);
        for (let i = 0; i < 4; i++) x.quadraticCurveTo(13 - i * 9, 18, 9 - i * 9, 26);
        x.closePath();
        x.fill();
        x.fillStyle = "#2a1450";
        [-7, 7].forEach((e) => {
          x.beginPath();
          x.ellipse(e, -6, 4, 6, 0, 0, 7);
          x.fill();
        });
        x.restore();
      };
    return {
      pcinder: (x) => {
        G(x, 34, "rgba(255,240,180,.95)", "rgba(255,120,30,0)");
        flame(x, -6, 26, 16, 54, "#ff7a2a");
        flame(x, -6, 22, 9, 36, "#ffe066");
        x.strokeStyle = "#ffd080";
        x.lineWidth = 4;
        x.beginPath();
        x.ellipse(-4, 6, 26, 10, -0.5, 0, 7);
        x.stroke();
      },
      plash: (x) => {
        x.strokeStyle = "#ff6a1a";
        x.lineWidth = 10;
        x.lineCap = "round";
        x.beginPath();
        x.moveTo(-46, 40);
        x.bezierCurveTo(-10, -50, 20, 40, 46, -36);
        x.stroke();
        x.strokeStyle = "#ffe066";
        x.lineWidth = 4;
        x.stroke();
        G(x, 18, "rgba(255,255,220,1)", "rgba(255,160,40,0)");
      },
      pphoenix: (x) => {
        G(x, 50, "rgba(255,200,90,.6)", "rgba(255,80,0,0)");
        x.fillStyle = "#ff7a2a";
        [-1, 1].forEach((s) => {
          x.beginPath();
          x.moveTo(0, -4);
          x.quadraticCurveTo(s * 30, -46, s * 58, -30);
          x.lineTo(s * 40, -16);
          x.lineTo(s * 52, -6);
          x.quadraticCurveTo(s * 24, 4, 0, 10);
          x.fill();
        });
        flame(x, 0, 52, 12, 40, "#ff5a1a");
        x.fillStyle = "#ffd27a";
        x.beginPath();
        x.ellipse(0, -4, 11, 20, 0, 0, 7);
        x.fill();
        x.beginPath();
        x.arc(0, -26, 8, 0, 7);
        x.fill();
      },
      // v48b beasts (models in 72-bestiary): a face-on head for each, in its school's colours
      gcat: (x) => {
        G(x, 52, "rgba(170,200,255,.55)", "rgba(80,100,255,0)");
        x.fillStyle = "#4a5ac0";
        [-1, 1].forEach((s) => {
          x.beginPath();
          x.moveTo(s * 14, -18);
          x.lineTo(s * 30, -54);
          x.lineTo(s * 36, -12);
          x.fill();
          x.strokeStyle = "#f0f6ff";
          x.lineWidth = 2;
          x.beginPath();
          x.moveTo(s * 30, -54);
          x.lineTo(s * 28, -66);
          x.stroke();
        });
        x.fillStyle = "#5060b0";
        x.beginPath();
        x.ellipse(0, 4, 36, 32, 0, 0, 7);
        x.fill();
        x.fillStyle = "#c4d0ff";
        x.beginPath();
        x.ellipse(0, 20, 18, 14, 0, 0, 7);
        x.fill();
        x.fillStyle = "#f0f8ff";
        [-1, 1].forEach((s) => {
          x.beginPath();
          x.ellipse(s * 14, -2, 6, 4, 0, 0, 7);
          x.fill();
        });
        x.save();
        x.translate(30, 28);
        x.scale(0.4, 0.4);
        bolt(x, 1, "#f0f6ff");
        x.restore();
      },
      rhorn: (x) => {
        G(x, 52, "rgba(190,240,255,.55)", "rgba(80,180,255,0)");
        x.strokeStyle = "#dff8ff";
        x.lineCap = "round";
        [-1, 1].forEach((s) => {
          x.lineWidth = 5;
          x.beginPath();
          x.moveTo(s * 10, -16);
          x.quadraticCurveTo(s * 34, -40, s * 30, -60);
          x.stroke();
          x.lineWidth = 3;
          [
            [22, -30, 40, -36],
            [28, -44, 46, -52],
            [16, -24, 18, -46],
          ].forEach(([a, b2, c, d]) => {
            x.beginPath();
            x.moveTo(s * a, b2);
            x.lineTo(s * c, d);
            x.stroke();
          });
        });
        x.fillStyle = "#7a92b8";
        x.beginPath();
        x.moveTo(-20, -14);
        x.quadraticCurveTo(0, -26, 20, -14);
        x.quadraticCurveTo(16, 30, 0, 46);
        x.quadraticCurveTo(-16, 30, -20, -14);
        x.fill();
        x.fillStyle = "#e0faff";
        [-1, 1].forEach((s) => {
          x.beginPath();
          x.ellipse(s * 9, -2, 4, 3, 0, 0, 7);
          x.fill();
        });
      },
      mback: (x) => {
        G(x, 52, "rgba(170,255,140,.5)", "rgba(60,180,60,0)");
        x.fillStyle = "#3a5222";
        [-1, 1].forEach((s) => {
          x.beginPath();
          x.arc(s * 28, -26, 12, 0, 7);
          x.fill();
        });
        x.fillStyle = "#54722e";
        x.beginPath();
        x.ellipse(0, 6, 40, 34, 0, 0, 7);
        x.fill();
        x.fillStyle = "#c4d48c";
        x.beginPath();
        x.ellipse(0, 20, 16, 12, 0, 0, 7);
        x.fill();
        x.fillStyle = "#1e0a10";
        x.beginPath();
        x.ellipse(0, 14, 6, 4, 0, 0, 7);
        x.fill();
        for (let i = 0; i < 7; i++) flame(x, -30 + i * 10, -22, 6, 18, i % 2 ? "#76bc48" : "#ccff88");
        x.fillStyle = "#ffb0d8";
        for (let j = 0; j < 5; j++) {
          x.beginPath();
          x.arc(18 + Math.cos(j * 1.257) * 5, -30 + Math.sin(j * 1.257) * 5, 4, 0, 7);
          x.fill();
        }
        x.fillStyle = "#ffe066";
        x.beginPath();
        x.arc(18, -30, 3, 0, 7);
        x.fill();
      },
      sfox: (x) => {
        G(x, 52, "rgba(210,180,255,.55)", "rgba(140,90,255,0)");
        [-0.6, 0, 0.6].forEach((a) => {
          x.save();
          x.translate(0, 30);
          x.rotate(a + PI);
          flame(x, 0, -6, 10, 52, "rgba(190,160,255,.85)");
          x.restore();
        });
        x.fillStyle = "#7450ac";
        [-1, 1].forEach((s) => {
          x.beginPath();
          x.moveTo(s * 8, -20);
          x.lineTo(s * 34, -50);
          x.lineTo(s * 32, -8);
          x.fill();
        });
        x.beginPath();
        x.moveTo(-30, -14);
        x.quadraticCurveTo(0, -30, 30, -14);
        x.quadraticCurveTo(14, 20, 0, 30);
        x.quadraticCurveTo(-14, 20, -30, -14);
        x.fill();
        x.fillStyle = "#ffffff";
        [-1, 1].forEach((s) => {
          x.beginPath();
          x.ellipse(s * 11, -6, 5, 3, s * 0.4, 0, 7);
          x.fill();
        });
      },
      // Hearthfang: a flame-hound's head in profile, ears up, mane of licks, a glowing eye
      pfang: (x) => {
        G(x, 52, "rgba(255,170,70,.55)", "rgba(255,60,0,0)");
        for (let i = 0; i < 6; i++)
          flame(x, -26 + i * 6, 40 - i * 2, 9, 34 + (i % 2) * 10, i % 2 ? "#ff7a2a" : "#ffb040");
        x.fillStyle = "#e8481a";
        x.beginPath();
        x.moveTo(-30, 30);
        x.quadraticCurveTo(-34, -10, -10, -22);
        x.lineTo(-4, -48);
        x.lineTo(6, -22);
        x.quadraticCurveTo(24, -20, 50, 2);
        x.quadraticCurveTo(44, 12, 22, 12);
        x.quadraticCurveTo(8, 22, 0, 36);
        x.closePath();
        x.fill();
        x.strokeStyle = "#ffd84a";
        x.lineWidth = 3;
        x.lineCap = "round";
        x.beginPath();
        x.moveTo(-18, 22);
        x.bezierCurveTo(-24, 6, -8, 0, -14, -10);
        x.stroke();
        x.fillStyle = "#3a0c06";
        x.beginPath();
        x.arc(48, 3, 4, 0, 7);
        x.fill();
        x.save();
        x.translate(10, -10);
        G(x, 9, "rgba(255,250,210,1)", "rgba(255,200,80,0)");
        x.restore();
      },
      pkindle: (x) => {
        G(x, 44, "rgba(255,90,40,.6)", "rgba(255,40,0,0)");
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * 6.283;
          flame(x, Math.cos(a) * 36, Math.sin(a) * 36 + 8, 7, 18, "#ffa040");
        }
        x.fillStyle = "#ff3a2a";
        x.beginPath();
        x.moveTo(0, 22);
        x.bezierCurveTo(-34, -2, -18, -30, 0, -12);
        x.bezierCurveTo(18, -30, 34, -2, 0, 22);
        x.fill();
        flame(x, 0, 6, 7, 20, "#ffe066");
      },
      psun: (x) => {
        x.strokeStyle = "#ffd27a";
        x.lineWidth = 4;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * 6.283;
          x.beginPath();
          x.moveTo(Math.cos(a) * 30, Math.sin(a) * 30 - 8);
          x.lineTo(Math.cos(a) * (46 + (i % 2) * 10), Math.sin(a) * (46 + (i % 2) * 10) - 8);
          x.stroke();
        }
        x.translate(0, -8);
        G(x, 30, "#fffbe0", "#ff8a1a");
        x.translate(0, 8);
        x.fillStyle = "#5a2a14";
        x.fillRect(-48, 44, 96, 8);
      },
      gspark: (x) => {
        G(x, 30, "rgba(255,255,220,1)", "rgba(255,220,60,0)");
        bolt(x, 0.7, "#fffbe0");
        x.strokeStyle = "#ffe066";
        x.lineWidth = 3;
        [
          [-40, -30],
          [40, 20],
          [-30, 40],
        ].forEach(([a, b]) => {
          x.beginPath();
          x.moveTo(0, 0);
          x.lineTo(a * 0.5, b * 0.3);
          x.lineTo(a, b);
          x.stroke();
        });
      },
      ggust: (x) => {
        x.strokeStyle = "#e8fff4";
        x.lineCap = "round";
        [36, 24, 12].forEach((r, i) => {
          x.lineWidth = 6 - i;
          x.beginPath();
          x.arc(0, 0, r, -2.6 + i, 1.4 + i);
          x.stroke();
        });
        leaf(x, 34, -30, 9, 0.8, "#8adf9a");
        leaf(x, -38, 26, 8, -0.4, "#b8ff8a");
      },
      gthunder: (x) => {
        x.fillStyle = "#3a3a6a";
        [
          [-22, -26, 22],
          [8, -32, 26],
          [30, -20, 18],
          [-4, -16, 24],
        ].forEach(([a, b, r]) => {
          x.beginPath();
          x.arc(a, b, r, 0, 7);
          x.fill();
        });
        x.save();
        x.translate(0, 14);
        bolt(x, 0.65, "#fff6a0");
        x.restore();
      },
      gtail: (x) => {
        x.strokeStyle = "#e8fff4";
        x.lineWidth = 5;
        x.beginPath();
        for (let i = 0; i < 60; i++) {
          const t = i / 60,
            a = t * 12;
          x.lineTo(Math.cos(a) * (8 + t * 30), 46 - t * 90);
        }
        x.stroke();
        leaf(x, 10, -20, 12, 0.5, "#fff6a0");
        leaf(x, -16, 6, 10, -0.6, "#e8fff4");
      },
      gsky: (x) => {
        x.fillStyle = "rgba(60,60,110,.9)";
        x.beginPath();
        x.moveTo(-56, -50);
        x.lineTo(56, -50);
        x.lineTo(8, 30);
        x.lineTo(-8, 30);
        x.closePath();
        x.fill();
        x.fillStyle = "#ffffff";
        x.beginPath();
        x.moveTo(-5, -44);
        x.lineTo(5, -44);
        x.lineTo(2, 52);
        x.lineTo(-2, 52);
        x.fill();
        x.translate(0, 48);
        G(x, 14, "#ffffff", "rgba(255,240,100,0)");
      },
      rshard: (x) => {
        G(x, 34, "rgba(230,250,255,.9)", "rgba(100,200,255,0)");
        crystal(x, 0, 6, 12, 48, "#e8fbff");
        crystal(x, -18, 14, 8, 30, "#bfeeff");
        crystal(x, 18, 16, 8, 28, "#bfeeff");
      },
      rwall: (x) => {
        [
          [-34, 26, 40],
          [-12, 34, 54],
          [12, 34, 60],
          [34, 26, 44],
        ].forEach(([a, w, h]) => {
          x.fillStyle = "#d8f4ff";
          x.fillRect(a - 10, 44 - h, 20, h);
          x.fillStyle = "#ffffff";
          x.beginPath();
          x.moveTo(a - 12, 44 - h);
          x.lineTo(a, 30 - h);
          x.lineTo(a + 12, 44 - h);
          x.fill();
          x.strokeStyle = "#2a7ab8";
          x.lineWidth = 2;
          x.strokeRect(a - 10, 44 - h, 20, h);
        });
      },
      rhammer: (x) => {
        x.save();
        x.rotate(-0.6);
        x.fillStyle = "#6a5a8a";
        x.fillRect(-4, -10, 8, 64);
        x.fillStyle = "#d8f4ff";
        x.fillRect(-30, -34, 60, 28);
        x.strokeStyle = "#2a7ab8";
        x.lineWidth = 3;
        x.strokeRect(-30, -34, 60, 28);
        x.restore();
        G(x, 16, "rgba(255,255,255,.8)", "rgba(150,220,255,0)");
      },
      rring: (x) => {
        x.strokeStyle = "#bfeeff";
        x.lineWidth = 6;
        x.beginPath();
        x.ellipse(0, 18, 46, 18, 0, 0, 7);
        x.stroke();
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * 6.283;
          crystal(x, Math.cos(a) * 40, 18 + Math.sin(a) * 15, 5, 20, "#e8fbff");
        }
      },
      ravatar: (x) => {
        x.fillStyle = "#cfeeff";
        x.beginPath();
        x.ellipse(0, 10, 34, 36, 0, 0, 7);
        x.fill();
        x.fillRect(-16, -44, 32, 26);
        x.fillStyle = "#6ab0e8";
        x.fillRect(-56, -10, 20, 44);
        x.fillRect(36, -10, 20, 44);
        x.fillStyle = "#bff8ff";
        x.fillRect(-10, -34, 7, 4);
        x.fillRect(3, -34, 7, 4);
      },
      vseed: (x) => {
        x.fillStyle = "#3a8a3a";
        for (let i = 0; i < 6; i++) {
          const a = -PI / 2 + (i - 2.5) * 0.35;
          x.save();
          x.rotate(a + PI / 2);
          x.beginPath();
          x.moveTo(-5, 40);
          x.lineTo(0, -6);
          x.lineTo(5, 40);
          x.fill();
          x.restore();
        }
        x.fillStyle = "#7a5a2a";
        x.beginPath();
        x.ellipse(0, 34, 10, 13, 0, 0, 7);
        x.fill();
      },
      vrain: (x) => {
        for (let i = 0; i < 7; i++) leaf(x, -36 + i * 12, -30 + (i % 2) * 8, 10, i, i % 2 ? "#8adf9a" : "#b8ff8a");
        x.strokeStyle = "#9affc0";
        x.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
          x.beginPath();
          x.moveTo(-40 + i * 11, -6 + (i % 3) * 6);
          x.lineTo(-44 + i * 11, 14 + (i % 3) * 6);
          x.stroke();
        }
        x.fillStyle = "#ffb0d8";
        x.beginPath();
        x.arc(0, 40, 8, 0, 7);
        x.fill();
      },
      vvine: (x) => {
        x.strokeStyle = "#3a7a2a";
        x.lineWidth = 9;
        x.lineCap = "round";
        x.beginPath();
        for (let i = 0; i < 50; i++) {
          const t = i / 50;
          x.lineTo(Math.sin(t * 12) * (34 - t * 18), 50 - t * 100);
        }
        x.stroke();
        x.fillStyle = "#d8f0a0";
        for (let i = 0; i < 6; i++) {
          x.beginPath();
          x.arc(Math.sin(i * 2) * 26, 40 - i * 16, 3, 0, 7);
          x.fill();
        }
      },
      vgrove: (x) => {
        x.strokeStyle = "rgba(154,255,192,.8)";
        x.lineWidth = 4;
        x.beginPath();
        x.arc(0, 30, 46, PI, 0);
        x.stroke();
        for (let i = 0; i < 5; i++) {
          const a = -PI + (i / 4) * PI,
            cx = Math.cos(a) * 40,
            cy = 30 + Math.sin(a) * 10 + 10;
          x.fillStyle = "#6a4a2a";
          x.fillRect(cx - 2, cy - 4, 4, 14);
          x.fillStyle = "#5ad87a";
          x.beginPath();
          x.arc(cx, cy - 8, 9, 0, 7);
          x.fill();
        }
      },
      vheart: (x) => {
        x.fillStyle = "#6a4a2a";
        x.beginPath();
        x.moveTo(-10, 54);
        x.lineTo(-5, -4);
        x.lineTo(5, -4);
        x.lineTo(10, 54);
        x.fill();
        [
          [-24, -18, 22],
          [24, -18, 22],
          [0, -34, 26],
        ].forEach(([a, b, r]) => {
          x.fillStyle = "#5ad87a";
          x.beginPath();
          x.arc(a, b, r, 0, 7);
          x.fill();
        });
        x.fillStyle = "#fff0a0";
        [
          [-20, -20],
          [16, -12],
          [4, -40],
          [26, -28],
        ].forEach(([a, b]) => {
          x.beginPath();
          x.arc(a, b, 4, 0, 7);
          x.fill();
        });
      },
      swisp: (x) => {
        G(x, 40, "rgba(200,160,255,.6)", "rgba(120,60,255,0)");
        ghost(x, 0, 0, 1.3, "#ece0ff");
      },
      lwisp: (x) => {
        G(x, 42, "rgba(200,160,255,.7)", "rgba(120,60,255,0)");
        x.strokeStyle = "#2a2438";
        x.lineWidth = 5;
        x.strokeRect(-20, -24, 40, 48);
        x.beginPath();
        x.moveTo(-24, -24);
        x.lineTo(0, -44);
        x.lineTo(24, -24);
        x.stroke();
        ghost(x, 0, 2, 0.7, "#f6eeff");
      },
      revn: (x) => {
        x.fillStyle = "#8a8ca8";
        x.beginPath();
        x.arc(0, -26, 16, 0, 7);
        x.fill();
        x.fillRect(-22, -10, 44, 34);
        x.fillStyle = "#14082a";
        x.fillRect(-12, -28, 24, 4);
        x.fillStyle = "#d8b0ff";
        x.fillRect(-8, -28, 4, 4);
        x.fillRect(4, -28, 4, 4);
        x.fillStyle = "rgba(154,112,255,.6)";
        x.beginPath();
        x.moveTo(-22, 24);
        x.lineTo(22, 24);
        x.lineTo(0, 56);
        x.fill();
        x.fillStyle = "#e8e0ff";
        x.fillRect(30, -46, 6, 70);
      },
      slink: (x) => {
        x.strokeStyle = "#c9a0ff";
        x.lineWidth = 4;
        [
          [-40, 30],
          [40, 30],
          [0, -44],
        ].forEach(([a, b]) => {
          x.beginPath();
          x.moveTo(0, 6);
          x.lineTo(a, b);
          x.stroke();
          x.fillStyle = "#ece0ff";
          x.beginPath();
          x.arc(a, b, 8, 0, 7);
          x.fill();
        });
        G(x, 14, "#ffffff", "rgba(160,120,255,0)");
      },
      sproc: (x) => {
        for (let i = 0; i < 4; i++) ghost(x, -42 + i * 28, 10 - (i % 2) * 10, 0.6, i % 2 ? "#ece0ff" : "#d8e8ff");
        x.fillStyle = "#ffd27a";
        for (let i = 0; i < 4; i++) {
          x.beginPath();
          x.arc(-32 + i * 28, 16 - (i % 2) * 10, 4, 0, 7);
          x.fill();
        }
      },
    };
  })();
  return {
    A,
    idle,
    lanternWisp,
    revenant,
    hearthfang,
    SKD,
    skin,
    skinM,
    bend,
    lickG,
    ART2,
    bubbleOn,
    flowers,
    spikesGreen,
  };
})();
