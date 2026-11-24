// DUSKWICK - 49-foefury.js (v35, loads LAST): livelier foes and spell hits. Only top-level name: FURY.
// 1) New signature moves (FMV.M), each with its own pose and effect, appended to the kits in FMV.K (24, 27, 33):
//    Grasping Shadows (tendrils from the ground), Feather Volley (a fan of darts), Ground Pound (cracks race out),
//    Fire Pillars, Shadow Spears (rain from above), Rime Spikes (a line of ice bursting toward you), Cinder Lash
//    (a spinning tail ring). Effects take the move's element colour, so one effect reads differently per foe.
//    Guests replay them through 24's 'fmv' messages (same ids on every client).
// 2) New poses for gloom-type rigs (bd/hd/arms/wings: gloom, 27 new foes, 33 swamp foes, 34 bosses) and beasts
//    (legs/hd/tail), added by wrapping FMV.poseG / FMV.poseB: hurt, pound, conjure, volley, spin, stomp, lash.
// 3) Foes flinch when hurt (the "hurt" pose, stronger for big hits) unless they're mid-attack.
// 4) Every spell hit gets a small accent in its element (fire embers, ice shards, a storm fork, leaves, a spirit rune),
//    on top of the spell's own effect. Wraps dmg (after 29's wrap). Throttled per foe, thinned on Low quality.
const FURY = (() => {
  if (typeof FMV === "undefined" || !FMV.M || !FMV.K) return {};
  const LOW = typeof GFX !== "undefined" && GFX === "low",
    V = (x, y, z) => new T.Vector3(x, y, z),
    up = (p, y) => p.clone().setY(y == null ? 1.4 : y),
    R = Math.random,
    quiet = () => typeof SFXO !== "undefined" && SFXO && SFXO.quiet;
  // ---------- 1) moves ----------
  const NEW = {
    gshadow: {
      n: "Grasping Shadows",
      ic: "🖐",
      el: "spirit",
      tg: "one",
      p: 1.25,
      w: 1.6,
      cd: 3,
      an: "conjure",
      fx: "tendrils",
      rng: 1,
    },
    fvolley: {
      n: "Feather Volley",
      ic: "🪶",
      el: "storm",
      tg: "one",
      p: 1.35,
      w: 1.6,
      cd: 2,
      an: "volley",
      fx: "volley",
      rng: 1,
    },
    gpound: { n: "Ground Pound", ic: "💢", el: "heal", tg: "all", p: 0.75, w: 1.5, cd: 3, an: "pound", fx: "pound" },
    fpillar: {
      n: "Fire Pillars",
      ic: "🔥",
      el: "fire",
      tg: "all",
      p: 0.7,
      w: 1.5,
      cd: 3,
      an: "conjure",
      fx: "pillars",
      bn: 1,
    },
    sspear: {
      n: "Shadow Spears",
      ic: "🗡",
      el: "spirit",
      tg: "all",
      p: 0.75,
      w: 1.6,
      cd: 2,
      an: "conjure",
      fx: "spears",
    },
    rspike: {
      n: "Rime Spikes",
      ic: "❄",
      el: "ice",
      tg: "one",
      p: 1.35,
      w: 1.6,
      cd: 2,
      an: "stomp",
      fx: "spikeline",
      rng: 1,
      ch: 0.5,
    },
    clash: {
      n: "Cinder Lash",
      ic: "🌀",
      el: "fire",
      tg: "all",
      p: 0.6,
      w: 1.5,
      cd: 3,
      an: "lash",
      fx: "lashring",
      bn: 1,
    },
    // element variants for the newer foe kinds (same effects, their own colours and names)
    gslam: {
      n: "Glacier Slam",
      ic: "💢",
      el: "ice",
      tg: "all",
      p: 0.75,
      w: 1.4,
      cd: 3,
      an: "pound",
      fx: "pound",
      ch: 0.3,
    },
    lpillar: {
      n: "Magma Pillars",
      ic: "🌋",
      el: "fire",
      tg: "all",
      p: 0.7,
      w: 1.4,
      cd: 3,
      an: "conjure",
      fx: "pillars",
      bn: 1,
    },
    pvolley: {
      n: "Flame Feathers",
      ic: "🪶",
      el: "fire",
      tg: "one",
      p: 1.3,
      w: 1.5,
      cd: 2,
      an: "volley",
      fx: "volley",
      rng: 1,
      bn: 1,
    },
    groot: {
      n: "Root Grab",
      ic: "🌿",
      el: "heal",
      tg: "one",
      p: 1.2,
      w: 1.5,
      cd: 3,
      an: "conjure",
      fx: "tendrils",
      rng: 1,
    },
    bgrasp: {
      n: "Bog Grasp",
      ic: "🖐",
      el: "heal",
      tg: "one",
      p: 1.2,
      w: 1.5,
      cd: 3,
      an: "conjure",
      fx: "tendrils",
      rng: 1,
    },
    kspear: { n: "Bone Spears", ic: "🦴", el: "spirit", tg: "all", p: 0.7, w: 1.4, cd: 3, an: "conjure", fx: "spears" },
    mpound: { n: "Mire Stomp", ic: "💢", el: "heal", tg: "all", p: 0.75, w: 1.4, cd: 3, an: "pound", fx: "pound" },
    wvolley: {
      n: "Wisp Volley",
      ic: "👻",
      el: "spirit",
      tg: "one",
      p: 1.3,
      w: 1.5,
      cd: 2,
      an: "volley",
      fx: "volley",
      rng: 1,
    },
  };
  Object.keys(NEW).forEach((k) => {
    if (!FMV.M[k]) FMV.M[k] = Object.assign({ id: k }, NEW[k]);
  });
  const ADD = {
    g1: "gshadow",
    g2: "fvolley",
    g3: "gpound",
    g4: "fpillar",
    g5: "sspear",
    wolf: "rspike",
    hound: "clash",
    b_warden: "sspear",
    b_fiend: "fpillar",
    b_tyrant: "gpound",
    b_matri: "rspike",
    b_kiln: "clash",
    fgolem: "gslam",
    lgolem: "lpillar",
    phoenix: "pvolley",
    gnome: "groot",
    bogl: "bgrasp",
    skel: "kspear",
    bogm: "mpound",
    mwisp: "wvolley",
  };
  Object.keys(ADD).forEach((k) => {
    const L = FMV.K[k];
    if (Array.isArray(L) && FMV.M[ADD[k]] && L.indexOf(ADD[k]) < 0) L.push(ADD[k]);
  });

  // ---------- 2) poses ----------
  const prog = (u) => (u.fp && u.fp.ph ? Math.min(1, (performance.now() - u.fp.t0) / (u.fp.ms || 700)) : 0);
  const pg0 = FMV.poseG;
  FMV.poseG = function (u, an, wu, st, su, tr, now) {
    const bd = u.bd,
      hd = u.hd,
      A = Array.isArray(u.arms) ? u.arms : [],
      arm = (fx, fz, fc) =>
        A.forEach((a, n) => {
          if (!a || !a.rotation) return;
          a.rotation.x += fx(n);
          if (fz) a.rotation.z += (n ? 1 : -1) * fz(n);
          const c = fc && a.userData && a.userData.cl;
          if (c && c.rotation) c.rotation.x += fc(n);
        }),
      B = (x, y, z) => {
        if (!bd) return;
        bd.rotation.x += x || 0;
        bd.rotation.y += y || 0;
        bd.rotation.z += z || 0;
      },
      Hx = (v) => hd && hd.rotation && (hd.rotation.x += v),
      Sq = (a) => bd && bd.scale.set(bd.scale.x * (1 + a * 0.6), bd.scale.y * (1 - a), bd.scale.z * (1 + a * 0.6)),
      Y = (v) => bd && (bd.position.y += v),
      wings = (v) =>
        Array.isArray(u.wings) && u.wings.forEach((w, n) => w && w.rotation && (w.rotation.y += (n ? 1 : -1) * v));
    switch (an) {
      case "hurt": {
        const k = (u.fp && u.fp.k) || 1,
          s = st * k;
        arm(
          () => -0.7 * s,
          () => 0.8 * s,
          () => -0.5 * s,
        );
        B(-0.45 * s, 0, tr * 0.08 * s);
        Hx(-0.55 * s);
        Sq(0.14 * s);
        return;
      }
      case "pound":
        arm(
          () => -2.9 * wu + 0.7 * st,
          () => 0.25 * wu - 0.1 * st,
          () => -0.4 * wu + 0.6 * st,
        );
        B(-0.4 * wu + 0.75 * st);
        Hx(-0.3 * wu + 0.4 * st);
        Sq(-0.16 * wu + 0.26 * st);
        Y(0.3 * wu - 0.15 * st);
        return;
      case "conjure":
        arm(
          () => 0.35 * wu - 2.8 * st + tr * 0.05 * su,
          () => 0.9 * wu + 0.3 * st,
          () => 0.7 * su,
        );
        B(0.2 * wu - 0.3 * st);
        Hx(0.2 * wu - 0.65 * st);
        Sq(0.12 * wu - 0.1 * st);
        Y(0.35 * st);
        wings(0.5 * su);
        return;
      case "volley":
        arm(
          (n) => (-1.7 + Math.sin(now * 0.035 + n * Math.PI) * 0.9) * su,
          () => 0.3 * su,
          (n) => Math.max(0, Math.sin(now * 0.035 + n * Math.PI)) * 0.9 * su,
        );
        B(-0.15 * su, Math.sin(now * 0.035) * 0.15 * su);
        Hx(-0.2 * su);
        wings(Math.sin(now * 0.03) * 0.9 * su);
        Y(0.25 * su);
        return;
      case "spin": {
        const p = prog(u);
        B(0, -0.7 * wu + p * Math.PI * 2 * (u.fp && u.fp.ph ? 1 : 0));
        arm(
          () => -1.2 * su,
          () => 1.2 * su,
        );
        return;
      }
    }
    return pg0.apply(this, arguments);
  };
  const pb0 = FMV.poseB;
  FMV.poseB = function (u, an, wu, st, su, tr, now) {
    const Lg = u.L || [],
      hd = u.hd,
      leg = (front, back) =>
        Lg.forEach((l, i) => {
          if (l && l.rotation) l.rotation.x += i < 2 ? front : back;
        }),
      Hx = (v) => hd && hd.rotation && (hd.rotation.x += v),
      Hy = (v) => hd && hd.rotation && (hd.rotation.y += v),
      tail = (v) => u.tail && (u.tail.rotation.y += v),
      tailX = (v) => u.tail && (u.tail.rotation.x += v);
    switch (an) {
      case "hurt": {
        const s = st * ((u.fp && u.fp.k) || 1);
        Hx(-0.55 * s);
        Hy(tr * 0.12 * s);
        leg(-0.35 * s, 0.3 * s);
        tailX(0.5 * s);
        return;
      }
      case "stomp":
        leg(-1.3 * wu + 0.6 * st, 0.35 * wu - 0.2 * st);
        Hx(-0.7 * wu + 0.6 * st);
        tail(tr * 0.3 * su);
        return;
      case "lash": {
        const p = prog(u);
        leg(0.2 * su, -0.25 * su);
        Hy(-0.5 * wu + Math.sin(p * Math.PI * 2) * 0.6 * st);
        tail(-1.2 * wu + Math.sin(p * Math.PI * 3) * 1.6 * (u.fp && u.fp.ph ? 1 - p : 0));
        tailX(-0.4 * su);
        return;
      }
      case "conjure":
      case "volley":
        Hx(-0.6 * su + tr * 0.03 * su);
        leg(-0.2 * su, 0.1 * su);
        return;
      case "pound":
        return FMV.poseB.call(this, u, "stomp", wu, st, su, tr, now);
      case "spin":
        return FMV.poseB.call(this, u, "lash", wu, st, su, tr, now);
    }
    return pb0.apply(this, arguments);
  };

  // ---------- 1b) effects ----------
  // a toon mesh material in the move's colour (dark body, glowing edge)
  const tmat = (col, dark) =>
    new T.MeshToonMaterial({
      color: dark ? new T.Color(col).multiplyScalar(0.25) : col,
      gradientMap: GR,
      emissive: col,
      emissiveIntensity: dark ? 0.55 : 0.9,
    });
  const imp = (p, c, big) =>
    c.em(() => {
      big = big || 0;
      shock(p, c.col, 1.3 + big, 380);
      glowBurst(up(p), c.col, 2 + big * 1.5, 320);
      puff(up(p), c.el, 6 + Math.round(6 * big), 3, 0.5, 0.9);
    });
  const shake = (c, v) => {
    if (!c.q) shk = Math.max(shk, v);
  };
  Object.assign(FMV.F, {
    // tendrils curl up out of a rune under each target and clutch inward
    tendrils: (P, c) =>
      Promise.all(
        P.map((p, j) =>
          wait(j * 90).then(() => {
            c.em(() => rune(p, c.el, 1.3, 1000, c.col));
            const g2 = new T.Group(),
              geo = new T.ConeGeometry(0.13, 2.4, 7, 4),
              mt = tmat(c.col, 1),
              N = LOW ? 4 : 6,
              TT = [];
            geo.translate(0, 1.2, 0);
            for (let i = 0; i < N; i++) {
              const a = (i / N) * 6.283 + R(),
                m = new T.Mesh(geo, mt);
              m.position.set(p.x + Math.cos(a) * 0.9, 0, p.z + Math.sin(a) * 0.9);
              m.userData = { a, d: R() * 0.25 };
              m.scale.set(1, 0.01, 1);
              g2.add(m);
              TT.push(m);
            }
            let hitDone = false;
            c.em(() =>
              tmp2(g2, 1000, (k) => {
                TT.forEach((m) => {
                  const u = m.userData,
                    t = Math.max(0, Math.min(1, (k - u.d * 0.4) / 0.3)),
                    out = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1,
                    e = 1 - Math.pow(1 - t, 3);
                  m.scale.set(out, 0.01 + e * out, out);
                  // lean in toward the target as they rise (rotation about the tangent)
                  const lean = 0.25 + e * 0.55 + Math.sin(k * 20 + u.a) * 0.06;
                  m.rotation.set(Math.sin(u.a) * lean, 0, -Math.cos(u.a) * lean);
                });
                if (!hitDone && k > 0.32) {
                  hitDone = true;
                  imp(p, c, 0.3);
                  shake(c, 0.3);
                }
              }),
            );
            return wait(340); // the hit lands as they close; they fade on their own
          }),
        ),
      ).then(() => {}),
    // a fan of darts per target, arriving one after another
    volley: (P, c) =>
      Promise.all(
        P.map((p) => {
          const n = LOW ? 3 : 5;
          return Promise.all(
            Array.from({ length: n }, (_, i) =>
              wait(i * 75).then(() => {
                const s = new T.Sprite(AM(SP[c.el]));
                s.scale.setScalar(0.65);
                const side = (i - (n - 1) / 2) * 0.55,
                  a = c.H.clone().add(V(side * 0.5, 0, 0)),
                  b = up(p, 1.1 + R() * 0.6).add(V(side * 0.35, 0, (R() - 0.5) * 0.4));
                return c
                  .em(() =>
                    shoot(s, a, b, 300, 0.4 + Math.abs(side) * 0.5, (pos) => {
                      if (R() < 0.5) c.em(() => mote(pos, { c: c.col, s: 0.25, l: 0.25, gr: -0.6 }));
                    }),
                  )
                  .then(() => c.em(() => glowBurst(b, c.col, 1.2, 200)));
              }),
            ),
          ).then(() => imp(p, c, 0.35));
        }),
      ).then(() => {}),
    // the foe slams the ground: a ring at its feet, then cracks of dust and stone race to each target
    pound: async (P, c) => {
      c.em(() => {
        shock(c.src, c.col, 2.4, 420);
        shock(c.src, 0xffffff, 1.4, 260, 0.2, 0.6);
        smoke(c.src.clone().setY(0.2), 0x8a7a68, LOW ? 3 : 6, 1.2);
      });
      shake(c, 0.8);
      await Promise.all(
        P.map((p) => {
          const a = c.src.clone().setY(0.2),
            b = p.clone().setY(0.2),
            q = a.clone();
          let last = 0;
          return tw(320, (k) => {
            q.lerpVectors(a, b, k);
            if (k - last > 0.12) {
              last = k;
              c.em(() => {
                puff(q.clone(), c.el, 2, 1.6, 0.5, 1);
                shock(q, c.col, 0.6, 260, 0.14, 0.7);
              });
            }
          }).then(() => {
            c.em(() => fling(up(p, 0.4), LOW ? 3 : 6, 2.4, { rock: 1, col: 0x6a5a4a, em: 0x1a1008, sz: 0.2, ms: 800 }));
            imp(p, c, 0.6);
          });
        }),
      );
    },
    // a rune flares under each target, then a column of the element erupts
    pillars: (P, c) =>
      Promise.all(
        P.map((p, j) =>
          wait(j * 110).then(async () => {
            c.em(() => rune(p, c.el, 1.4, 700, c.col));
            await wait(380);
            c.em(() => {
              pillar(p, c.col, 0.9, 7, 750);
              pillar(p, 0xffffff, 0.45, 7, 450, { shrink: 1 });
              if (c.el === "fire") {
                embers(p, 0xffa040, LOW ? 6 : 14, 1);
                decal(p.x, p.z, "scorch", 1.2);
              } else puff(up(p, 1), c.el, 10, 3, 0.7, 1);
            });
            imp(p, c, 0.7);
            shake(c, 0.45);
          }),
        ),
      ).then(() => {}),
    // spears rain down around each target and stick in the ground
    spears: (P, c) =>
      Promise.all(
        P.map((p, j) => {
          const g2 = new T.Group(),
            geo = new T.ConeGeometry(0.12, 2.6, 6),
            mt = tmat(c.col, 1),
            N = LOW ? 3 : 5,
            SS = [];
          for (let i = 0; i < N; i++) {
            const a = R() * 6.283,
              r = i ? 0.5 + R() * 0.8 : 0,
              m = new T.Mesh(geo, mt);
            m.rotation.set(Math.PI + (R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.3); // point down
            m.userData = { x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r, d: (i / N) * 0.35, land: 0 };
            m.position.set(m.userData.x, 14, m.userData.z);
            g2.add(m);
            SS.push(m);
          }
          let first = false;
          return wait(j * 80).then(() => {
            c.em(() =>
              tmp2(g2, 1100, (k) => {
                SS.forEach((m) => {
                  const u = m.userData,
                    t = Math.max(0, Math.min(1, (k - u.d) / 0.22));
                  m.position.y = 14 - t * t * 13.1;
                  if (t >= 1 && !u.land) {
                    u.land = 1;
                    c.em(() => {
                      shock(V(u.x, 0, u.z), c.col, 0.7, 260);
                      puff(V(u.x, 0.4, u.z), c.el, 3, 1.5, 0.4, 0.8);
                    });
                    if (!first) {
                      first = true;
                      imp(p, c, 0.4);
                      shake(c, 0.35);
                    }
                  }
                  const out = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
                  m.scale.setScalar(Math.max(0.01, out));
                });
              }),
            );
            return wait(260); // the first spear lands about now; the rest finish on their own
          });
        }),
      ).then(() => {}),
    // ice bursts out of the ground in a line from the foe to the target
    spikeline: async (P, c) => {
      const list = [];
      P.forEach((p) => {
        const a = c.src.clone(),
          d = p.clone().sub(a),
          L = d.length() || 1,
          n = Math.max(4, Math.round(L / (LOW ? 1.6 : 1.1)));
        for (let i = 1; i <= n; i++) {
          const k = i / n,
            q = a.clone().addScaledVector(d, k),
            sd = (i % 2 ? 1 : -1) * 0.35;
          list.push([q.x - (d.z / L) * sd, q.z + (d.x / L) * sd, k * 0.9, 0.5 + k * 0.8]);
        }
      });
      c.em(() => spikes(list, 1100));
      await wait(560);
      P.forEach((p) => {
        c.em(() => {
          fling(up(p, 1), LOW ? 3 : 6, 2.2, { ms: 700 });
          decal(p.x, p.z, "frost", 1);
        });
        imp(p, c, 0.5);
      });
      shake(c, 0.4);
    },
    // a whirling ring of the element spreads from the foe; everyone it reaches is hit
    lashring: async (P, c) => {
      const n = LOW ? 10 : 18;
      c.em(() => shock(c.src, c.col, 4, 520));
      await tw(380, (k) =>
        c.em(() => {
          const a = k * 6.283 * 1.5,
            r = 0.8 + k * 3.2;
          for (let i = 0; i < 2; i++) {
            const b = a + i * Math.PI;
            puff(V(c.src.x + Math.cos(b) * r, 0.6, c.src.z + Math.sin(b) * r), c.el, 1, 1.4, 0.45, 1);
          }
        }),
      );
      c.em(() => {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.283;
          mote(V(c.src.x, 0.7, c.src.z), {
            t: SP[c.el],
            c: 0xffffff,
            v: [Math.cos(a) * 8, 0.6, Math.sin(a) * 8],
            l: 0.45,
            s: 0.8,
            gr: 1.2,
            dr: 0.5,
          });
        }
      });
      P.forEach((p) => imp(p, c, 0.4));
      shake(c, 0.5);
    },
  });

  // ---------- 3 + 4) hurt flinch and spell-hit accents ----------
  const last = new WeakMap();
  function accent(f, el, frac) {
    const p = f.m.position,
      ch = chest(f),
      big = Math.min(1, frac * 3);
    switch (el) {
      case "fire":
        embers(ch, 0xffa040, LOW ? 4 : 8 + Math.round(8 * big), 0.6);
        glowBurst(ch, 0xff7a2a, 1.6 + big, 260);
        if (!LOW) smoke(ch, 0x3a2a24, 2, 0.9);
        break;
      case "ice":
        fling(ch, LOW ? 3 : 5 + Math.round(4 * big), 2 + big, { ms: 650 });
        vshock(ch, 0xdff8ff, 1 + big * 0.6, 260);
        break;
      case "storm": {
        const a = ch.clone().add(V((R() - 0.5) * 3, 6 + R() * 2, (R() - 0.5) * 3));
        zap(a, ch, 0xbfe4ff, 220, { forks: LOW ? 0 : 1, w: 0.04 + big * 0.03 });
        burst(ch, 0xeaf6ff, LOW ? 4 : 8, 4, { l: 0.3 });
        break;
      }
      case "heal":
        burst(ch, 0x7dff9a, LOW ? 5 : 10 + Math.round(6 * big), 3, { lift: 1, l: 0.8 });
        if (!LOW) rune(p, "heal", 1 + big * 0.5, 600, 0x7dff9a);
        break;
      case "spirit":
        if (!LOW) rune(p, "spirit", 1 + big * 0.5, 600, 0xc9a0ff);
        burst(ch, 0xc9a0ff, LOW ? 5 : 9 + Math.round(6 * big), 3.4, { l: 0.6 });
        break;
      default:
        glowBurst(ch, 0xffffff, 1.4, 220);
    }
  }
  function flinch(f, frac) {
    const o = f.m,
      u = o && o.userData;
    if (!u || !(u.gl || u.L)) return;
    if (u.fp && u.fp.an !== "hurt") return; // mid-attack: don't break the move
    FMV.pose(o, "hurt", 1, 420 + Math.round(240 * Math.min(1, frac * 3)));
    u.fp.k = 0.6 + Math.min(0.9, frac * 3);
  }
  if (typeof dmg === "function") {
    const d0 = dmg;
    dmg = function (f, n, el, raw) {
      const h0 = f && f.hp;
      const r = d0.apply(this, arguments);
      try {
        if (f && f.m && h0 > 0 && f.hp < h0 && !quiet()) {
          const frac = (h0 - f.hp) / Math.max(1, f.max || h0);
          if (f.hp > 0) flinch(f, frac);
          const now = performance.now();
          if (el && !raw && now - (last.get(f) || 0) > 140) {
            last.set(f, now);
            accent(f, el, frac);
          }
        }
      } catch (e) {}
      return r;
    };
  }
  // ---------- 5) v35b boss signatures: every road boss (33, kits rb0..rb10) and street-dungeon boss (34, dkb0..2)
  // gets one big move that unlocks below half health (phase two), most with an effect of its own ----------
  const half = (f) => f.hp < f.max * 0.5,
    fall = (k) => k * k,
    // a line of ice spikes from a to b, offset sideways by off
    spikeRow = (list, a, b, off, d0) => {
      const d = b.clone().sub(a),
        L = d.length() || 1,
        n = Math.max(4, Math.round(L / (LOW ? 1.6 : 1.1)));
      for (let i = 1; i <= n; i++) {
        const k = i / n,
          q = a.clone().addScaledVector(d, k),
          sd = off + (i % 2 ? 0.25 : -0.25);
        list.push([q.x - (d.z / L) * sd, q.z + (d.x / L) * sd, (d0 || 0) + k * 0.9, 0.5 + k * 0.9]);
      }
    };
  // a falling object (group) that drops from y0 onto p in ms, then calls land(); the caller fades/removes it
  const drop = (o, p, y0, ms) => {
    o.position.set(p.x, y0, p.z);
    return tw(ms, (k) => (o.position.y = y0 * (1 - fall(k))));
  };
  Object.assign(FMV.F, {
    // two rows of ice racing side by side toward each target
    twinspikes: async (P, c) => {
      const list = [];
      P.forEach((p) => {
        spikeRow(list, c.src, p, -0.9, 0);
        spikeRow(list, c.src, p, 0.9, 0.12);
      });
      c.em(() => spikes(list, 1200));
      await wait(600);
      P.forEach((p) => {
        c.em(() => {
          fling(up(p, 1), LOW ? 4 : 8, 2.6, { ms: 750 });
          decal(p.x, p.z, "frost", 1.3);
        });
        imp(p, c, 0.8);
      });
      shake(c, 0.6);
    },
    // the ice breaks in a ring around each target and spears up
    icering: async (P, c) => {
      const list = [];
      P.forEach((p) => {
        const n = LOW ? 6 : 10;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.283;
          list.push([p.x + Math.cos(a) * 1.2, p.z + Math.sin(a) * 1.2, (i % 2) * 0.1, 0.8 + (i % 3) * 0.2]);
        }
        list.push([p.x, p.z, 0.25, 1.3]);
        c.em(() => shock(p, 0xdff8ff, 1.6, 320, 0.15, 0.8));
      });
      await wait(200);
      c.em(() => spikes(list, 1100));
      await wait(240);
      P.forEach((p) => {
        c.em(() => {
          puff(up(p, 0.5), "ice", 8, 3, 0.6, 1);
          decal(p.x, p.z, "frost", 1.4);
        });
        imp(p, c, 0.6);
      });
      shake(c, 0.55);
    },
    // a rune lights under each target, then lightning strikes it from the sky
    skybolt: (P, c) =>
      Promise.all(
        P.map((p, j) =>
          wait(j * 130).then(async () => {
            c.em(() => rune(p, "storm", 1.3, 750, c.col));
            await wait(340);
            const a = up(p, 13).add(V((R() - 0.5) * 2, 0, (R() - 0.5) * 2));
            c.em(() => {
              zap(a, up(p, 0.2), c.col, 300, { w: 0.09, forks: LOW ? 1 : 3, end: 4 });
              shock(p, 0xffffff, 1.8, 300);
              burst(up(p, 0.6), 0xeaf6ff, LOW ? 6 : 14, 5, { l: 0.4 });
            });
            if (!c.q && typeof lightAt === "function") lightAt(p, c.col, 3, 260);
            imp(p, c, 0.8);
            shake(c, 0.5);
          }),
        ),
      ).then(() => {}),
    // a huge jaw trap springs shut on the target
    jawtrap: (P, c) =>
      Promise.all(
        P.map(async (p) => {
          const g2 = new T.Group(),
            geo = new T.TorusGeometry(1.1, 0.12, 8, 24, Math.PI),
            tg = new T.ConeGeometry(0.09, 0.32, 6),
            mt = new T.MeshToonMaterial({ color: 0x8a8e98, gradientMap: GR, emissive: c.col, emissiveIntensity: 0.15 }),
            jaws = [-1, 1].map((s) => {
              const j = new T.Group(),
                ring = new T.Mesh(geo, mt);
              j.add(ring);
              for (let i = 1; i < 8; i++) {
                const a = (i / 8) * Math.PI,
                  t = new T.Mesh(tg, mt);
                t.position.set(Math.cos(a) * 0.98, Math.sin(a) * 0.98, 0);
                t.rotation.z = a + Math.PI / 2; // teeth point inward
                j.add(t);
              }
              j.userData.s = s;
              g2.add(j);
              return j;
            });
          g2.position.set(p.x, 0.05, p.z);
          g2.rotation.y = Math.atan2(p.x - c.src.x, p.z - c.src.z) + Math.PI / 2;
          let snapped = false;
          c.em(() =>
            tmp2(g2, 1300, (k) => {
              const t = k < 0.3 ? 0 : Math.min(1, (k - 0.3) / 0.07),
                out = k > 0.82 ? 1 - (k - 0.82) / 0.18 : 1;
              jaws.forEach((j) => (j.rotation.x = j.userData.s * (1.45 * (1 - t) + 0.06)));
              g2.scale.setScalar(Math.max(0.01, out));
              if (!snapped && t >= 1) {
                snapped = true;
                c.em(() => {
                  slash(up(p, 1));
                  shock(p, 0xffffff, 1.2, 240);
                });
              }
            }),
          );
          await wait(430);
          imp(p, c, 0.6);
          shake(c, 0.6);
        }),
      ).then(() => {}),
    // globs of lava arc out and splash around each target
    lavarain: (P, c) =>
      Promise.all(
        P.map((p) =>
          Promise.all(
            Array.from({ length: LOW ? 2 : 3 }, (_, i) =>
              wait(i * 110).then(() => {
                const s = new T.Sprite(AM(SP.fire));
                s.scale.setScalar(1.2);
                const b = p.clone().add(V((R() - 0.5) * 1.6, 0.2, (R() - 0.5) * 1.6));
                return c
                  .em(() =>
                    shoot(s, c.H.clone(), b, 520, 3.5, (pos) => {
                      if (R() < 0.6) c.em(() => mote(pos, { c: 0xffa040, s: 0.4, l: 0.4, gr: -0.6 }));
                    }),
                  )
                  .then(() =>
                    c.em(() => {
                      decal(b.x, b.z, "scorch", 0.9);
                      puff(up(b, 0.4), "fire", 4, 2.2, 0.5, 1);
                      embers(b, 0xffa040, LOW ? 3 : 6, 0.5);
                    }),
                  );
              }),
            ),
          ).then(() => imp(p, c, 0.6)),
        ),
      ).then(() => shake(c, 0.5)),
    // a giant anvil drops out of the sky
    anvil: (P, c) =>
      Promise.all(
        P.map(async (p) => {
          const g2 = new T.Group(),
            mt = new T.MeshToonMaterial({ color: 0x3a3a44, gradientMap: GR, emissive: c.col, emissiveIntensity: 0.25 }),
            part = (geo, x, y, z) => {
              const m = new T.Mesh(geo, mt);
              m.position.set(x, y, z);
              g2.add(m);
              return m;
            };
          part(new T.BoxGeometry(1.5, 0.45, 1.0), 0, 0.23, 0);
          part(new T.BoxGeometry(0.8, 0.6, 0.6), 0, 0.75, 0);
          part(new T.BoxGeometry(2.0, 0.5, 1.05), 0, 1.3, 0);
          part(new T.ConeGeometry(0.42, 1.1, 10), 1.5, 1.3, 0).rotation.z = -Math.PI / 2;
          g2.rotation.y = R() * 6.283;
          c.em(() => rune(p, c.el, 1.4, 800, c.col)); // its shadow / warning
          await wait(320);
          let landed = false;
          c.em(() =>
            tmp2(g2, 1400, (k) => {
              const t = Math.min(1, k / 0.27);
              g2.position.set(p.x, 16 * (1 - fall(t)), p.z);
              if (k > 0.75) g2.position.y = -((k - 0.75) / 0.25) * 2.2; // sinks into the ground
              if (!landed && t >= 1) {
                landed = true;
                c.em(() => {
                  shock(p, c.col, 2.6, 420);
                  shock(p, 0xffffff, 1.5, 260, 0.2, 0.7);
                  fling(up(p, 0.4), LOW ? 4 : 8, 3, { rock: 1, col: 0x5a4a3a, em: 0x1a1008, sz: 0.22, ms: 900 });
                  if (c.el === "fire") decal(p.x, p.z, "scorch", 1.5);
                });
              }
            }),
          );
          await wait(380);
          imp(p, c, 1);
          shake(c, 1);
        }),
      ).then(() => {}),
    // a drowned bell falls over the target and tolls three times
    belldrop: (P, c) =>
      Promise.all(
        P.map(async (p) => {
          const g2 = new T.Group(),
            mt = new T.MeshToonMaterial({
              color: 0x5a7a6a,
              gradientMap: GR,
              emissive: c.col,
              emissiveIntensity: 0.25,
              side: T.DoubleSide,
            }),
            body = new T.Mesh(new T.CylinderGeometry(0.6, 1.35, 2.0, 24, 1, true), mt),
            cap = new T.Mesh(new T.SphereGeometry(0.6, 20, 10, 0, 6.283, 0, Math.PI / 2), mt),
            lip = new T.Mesh(new T.TorusGeometry(1.35, 0.1, 8, 28), mt);
          body.position.y = 1.0;
          cap.position.y = 2.0;
          lip.position.y = 0.02;
          lip.rotation.x = Math.PI / 2;
          g2.add(body, cap, lip);
          let landed = false;
          c.em(() =>
            tmp2(g2, 1500, (k) => {
              const t = Math.min(1, k / 0.22);
              g2.position.set(p.x, 12 * (1 - fall(t)), p.z);
              if (k > 0.8) {
                const e = (k - 0.8) / 0.2;
                g2.position.y = e * 6;
                g2.scale.setScalar(Math.max(0.01, 1 - e));
              } else g2.rotation.z = landed ? Math.sin(k * 60) * 0.04 * (0.8 - k) : 0;
              if (!landed && t >= 1) landed = true;
            }),
          );
          await wait(330);
          for (let i = 0; i < 3; i++) {
            c.em(() => {
              shock(p, c.col, 1.8 + i * 0.8, 420, 0.2);
              vshock(up(p, 1.2), c.col, 1.6 + i * 0.5, 300);
            });
            if (i === 0) {
              imp(p, c, 0.7);
              shake(c, 0.7);
            }
            await wait(200);
          }
        }),
      ).then(() => {}),
    // great chunks of ice fall around each target and shatter
    icefall: (P, c) =>
      Promise.all(
        P.map((p, j) =>
          wait(j * 90).then(async () => {
            const n = LOW ? 2 : 4;
            for (let i = 0; i < n; i++) {
              const a = R() * 6.283,
                r = i ? 0.6 + R() * 0.9 : 0,
                q = V(p.x + Math.cos(a) * r, 0, p.z + Math.sin(a) * r),
                m = new T.Mesh(
                  new T.IcosahedronGeometry(0.55 + R() * 0.25, 0),
                  new T.MeshToonMaterial({
                    color: 0xdff8ff,
                    gradientMap: GR,
                    emissive: 0x2a7ab8,
                    emissiveIntensity: 0.7,
                  }),
                );
              m.rotation.set(R() * 3, R() * 3, 0);
              c.em(() => {
                FXP.add(m);
                drop(m, q, 14, 300).then(() => {
                  if (m.parent) m.parent.remove(m);
                  m.geometry.dispose();
                  m.material.dispose();
                  c.em(() => {
                    fling(q.clone().setY(0.5), LOW ? 3 : 6, 2.4, { ms: 700 });
                    shock(q, 0xdff8ff, 1, 280);
                    decal(q.x, q.z, "frost", 0.9);
                  });
                });
              });
              if (i === 0) {
                await wait(300);
                imp(p, c, 0.7);
                shake(c, 0.6);
              } else await wait(110);
            }
          }),
        ),
      ).then(() => {}),
  });
  const BOSSM = {
    rb0: [
      "rbtwin",
      { n: "Twin Rime Lines", ic: "❄", el: "ice", tg: "one", p: 1.7, an: "stomp", fx: "twinspikes", rng: 1, ch: 0.5 },
    ],
    rb1: [
      "rblurk",
      { n: "Shatter the Ice", ic: "🧊", el: "ice", tg: "all", p: 0.85, an: "pound", fx: "icering", ch: 0.4 },
    ],
    rb2: ["rbrune", { n: "Rune Lightning", ic: "⚡", el: "storm", tg: "all", p: 0.85, an: "conjure", fx: "skybolt" }],
    rb3: ["rbtrap", { n: "The BIG Trap", ic: "🪤", el: "ice", tg: "one", p: 1.8, an: "slam", fx: "jawtrap", ch: 1 }],
    rb4: ["rblava", { n: "Lava Rain", ic: "🌋", el: "fire", tg: "all", p: 0.8, an: "spit", fx: "lavarain", bn: 2 }],
    rb5: [
      "rbgate",
      { n: "Gatebreaker Slam", ic: "💢", el: "fire", tg: "all", p: 0.85, an: "pound", fx: "pound", bn: 1 },
    ],
    rb6: ["rbanvil", { n: "Anvil Drop", ic: "🔨", el: "fire", tg: "one", p: 1.9, an: "pound", fx: "anvil", bn: 1 }],
    rb7: ["rbroot", { n: "Grasping Garden", ic: "🌿", el: "heal", tg: "all", p: 0.8, an: "conjure", fx: "tendrils" }],
    rb8: [
      "rbbell",
      {
        n: "The Great Bell",
        ic: "🔔",
        el: "spirit",
        tg: "one",
        p: 1.8,
        an: "shake",
        fx: "belldrop",
        pp: 1,
        ppn: "Deafened",
      },
    ],
    rb9: ["rbshell", { n: "Shell Quake", ic: "🐢", el: "heal", tg: "all", p: 0.85, an: "pound", fx: "pound" }],
    rb10: [
      "rblant",
      { n: "Lantern Swarm", ic: "🏮", el: "spirit", tg: "all", p: 0.8, an: "volley", fx: "volley", rng: 1 },
    ],
    dkb0: ["dkice", { n: "Avalanche", ic: "🏔", el: "ice", tg: "all", p: 0.9, an: "roar", fx: "icefall", ch: 0.5 }],
    dkb1: [
      "dkforge",
      { n: "Forge Eruption", ic: "🌋", el: "fire", tg: "all", p: 0.9, an: "conjure", fx: "pillars", bn: 2 },
    ],
    dkb2: [
      "dkhands",
      { n: "Hands of the Drowned", ic: "🖐", el: "spirit", tg: "all", p: 0.85, an: "conjure", fx: "tendrils" },
    ],
  };
  Object.keys(BOSSM).forEach((k) => {
    const [id, m] = BOSSM[k],
      L = FMV.K[k];
    if (!Array.isArray(L)) return;
    if (!FMV.M[id]) FMV.M[id] = Object.assign({ id, w: 4, cd: 3, c: half }, m);
    if (L.indexOf(id) < 0) L.push(id);
  });
  return { NEW, ADD, BOSSM, accent, flinch };
})();
