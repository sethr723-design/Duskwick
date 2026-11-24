// DUSKWICK - 10-battle-flow.js: Allies, foes (intent, foeAct, hurt), walk-ins, turn flow (turn/play/endTurn), win/lose, gather/frame/fight/leave, chests, dungeons, travel.
// Loaded in order by index.html as plain scripts; they share one global scope.
// v21: NPC helpers (party bots from the Dev page and on-call companion cards) don't join fights for now
const NPCJOIN = false;
// v21 foe levels: a foe's level comes from its tier and where it lives (dungeons use the dungeon's level). HP and hit
// strength follow the level, so a Lv 1 street gloomling is a quick fight and deep-zone foes are real threats.
function foeLv(f) {
  if (f.lv) return f.lv;
  const t = Math.max(1, Math.min(5, f.t | 0 || 1));
  let lv = [1, 3, 5, 7, 10][t - 1];
  if (g && g.zlv) lv = Math.max(lv, g.zlv + (t >= 4 ? 1 : 0));
  return lv;
}
const foeHp = (lv) => Math.round(48 + 22 * lv);
// ---- allies ----
const freeSlot = () =>
  [1, 2, 3].find((i) => !g.allies.some((a) => a.slot === i) && !(g.heroes || []).some((h) => h.slot === i)) || -1;
function addAlly(t, slot) {
  const A = ALLY[t];
  let hp = A.hp + (t === "aegis" ? 15 * (P.fc || 0) : 0);
  if (P.cls === "rime" && (t === "aegis" || t === "golem" || t === "titan")) hp *= 1.4;
  if (P.role === "summoner" && !A.comp) hp *= 1.4;
  if (!A.comp && P.sig) hp *= 1.25;
  hp = Math.round(hp * (1 + (A.comp ? 0.1 : 0.05) * (P.lvl - 1)));
  const m = sumMesh(A.mdl || t),
    p = SLA[slot];
  // big late-game summons: scaled up, glowing in their own colour, with a halo so they read as something special
  if (A.sc) {
    m.userData.body.scale.setScalar(A.sc);
    m.traverse((q) => {
      if (q.isMesh && q.material && q.material.emissive && !q.userData.nol) {
        q.material = q.material.clone();
        q.material.emissive.setHex(A.tn);
        q.material.emissiveIntensity = 0.55;
      }
    });
    const hl = new T.Sprite(
      new T.SpriteMaterial({
        map: GLT,
        color: A.tn,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    hl.scale.setScalar(3.6 * A.sc);
    m.add(hl);
  }
  m.position.set(p[0], A.y, p[1]);
  BG.add(m);
  const s = { t, hp, max: hp, m, slot, label: A.n };
  g.allies.push(s);
  deco(s, ELC[A.el], A.comp ? null : A.el);
  return s;
}
function killA(s, quiet) {
  if (!quiet) puff(s.m.position.clone().setY(1), ALLY[s.t].el, 14, 3, 0.7, 1);
  BG.remove(s.m);
  undeco(s);
  g.allies = g.allies.filter((q) => q !== s);
}
async function summon(t) {
  let slot = freeSlot();
  if (slot < 0 && !g.allies.length) {
    $("log").textContent = "Every pad is taken by your party. No room for a summon.";
    P.summons++;
    return;
  }
  if (slot < 0) {
    const old = g.allies.find((a) => !ALLY[a.t].comp) || g.allies[0];
    slot = old.slot;
    killA(old);
  }
  const s = addAlly(t, slot),
    m = s.m,
    p = SLA[slot],
    col = EHX[ALLY[t].el];
  P.summons++;
  m.scale.setScalar(0.01);
  // v9: the summon arrives in a pillar of light over its rune, with motes swirling in from the edge of the pad
  const pp = new T.Vector3(p[0], 0, p[1]);
  pillar(pp, col, 0.9, 10, 750);
  rune(pp, ALLY[t].el, 1.7, 950, col);
  shock(pp, col, 2.8, 520);
  shock(pp, 0xffffff, 1.4, 380);
  glowBurst(pp.clone().setY(1.4), col, 4, 450);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * 6.283;
    mote(new T.Vector3(p[0] + Math.cos(a) * 2.3, 0.3, p[1] + Math.sin(a) * 2.3), {
      c: col,
      v: [-Math.cos(a) * 2.6, 2 + Math.random() * 2, -Math.sin(a) * 2.6],
      l: 0.7,
      s: 0.35,
    });
  }
  puff(new T.Vector3(p[0], 1, p[1]), ALLY[t].el, 22, 3.5, 0.9, 1.1);
  await tw(450, (k) => m.scale.setScalar(0.01 + (k < 0.8 ? (k / 0.8) * 1.15 : 1.15 - ((k - 0.8) / 0.2) * 0.15)));
  if (g.allies.length >= 3) P.fullh = (P.fullh || 0) + 1;
}
// an ally's turn
async function act(s) {
  const f = tgt(),
    t = s.t;
  s.act = 1;
  const pa = g.actor;
  g.actor = "ally";
  try {
    await act0(s, f, t);
  } finally {
    g.actor = pa;
    s.act = 0;
  }
}
async function act0(s, f, t) {
  if (t === "sprite") {
    healP(12);
    await wait(350);
  } else if (t === "witch") {
    const c = [
      { r: g.hp / mhp(), h: (n) => healP(n) },
      ...g.allies.map((a) => ({ r: a.hp / a.max, h: (n) => healA(a, n) })),
    ].sort((p, q) => p.r - q.r)[0];
    c.h(Math.round(12 * lvS()));
    await wait(380);
  } else if (t === "owl") {
    g.bonus = (g.bonus || 0) + 1;
    puff(s.m.position.clone(), "storm", 10, 2, 0.7, 0.8);
    $("log").textContent = "The Lantern Owl hoots: +1 pip next turn.";
    await wait(350);
  } else if (t === "golem") {
    healA(s, 6);
    await wait(250);
  } else if (t === "drake" && f) {
    puff(s.m.position.clone(), "fire", 12, 4, 0.6, 1);
    await wait(200);
    alive().forEach((q) => {
      dmg(q, 9, "fire");
      q.st.burn = Math.max(q.st.burn, 1);
      puff(q.m.position.clone().setY(1.5), "fire", 8, 3, 0.6, 1);
    });
    await resolve();
  } else if (t === "phoenix" && f) {
    puff(s.m.position.clone(), "fire", 24, 6, 0.8, 1.4);
    ring(s.m.position.x, 0xff5a1a, 10, 500, s.m.position.z);
    await wait(250);
    flashScr("#ff6a2a", 0.3);
    alive().forEach((q) => {
      dmg(q, 16, "fire");
      q.st.burn = Math.max(q.st.burn, 2);
      puff(q.m.position.clone().setY(1.5), "fire", 14, 4, 0.7, 1.2);
      decal(q.m.position.x, q.m.position.z, "scorch", 1.4);
    });
    await resolve();
  } else if (t === "roc" && f) {
    g.bonus = (g.bonus || 0) + 1;
    puff(s.m.position.clone(), "storm", 16, 3, 0.7, 1);
    await SFX.chain(alive(), s.m.position.clone());
    alive().forEach((q) => dmg(q, 10, "storm"));
    $("log").textContent = "The Storm Roc screeches: lightning on every foe, +1 pip next turn.";
    await resolve();
  } else if (f && t !== "aegis") {
    const m = s.m,
      p0 = m.position.clone(),
      to = f.m.position.clone();
    to.x -= 1.3;
    to.y = p0.y;
    await tw(260, (k) => m.position.lerpVectors(p0, to, k));
    const n = { blade: 18 + 4 * (P.ws || 0), wisp: 14, wolf: 16, squire: 10, pup: 12, epup: 12, titan: 16 }[t] || 10,
      el = ALLY[t].el;
    dmg(f, n, el, !!ALLY[t].comp);
    if (t === "titan") {
      f.st.chill = Math.max(f.st.chill, 1);
      shk = 0.5;
      ring(f.m.position.x, 0x9fe8ff, 3, 400, f.m.position.z);
      decal(f.m.position.x, f.m.position.z, "frost", 1.6);
    }
    if (t === "blade") slash(f.m.position);
    else if (t === "wisp") link(m.position, f.m.position.clone().setY(2));
    if (t === "wisp" && Math.random() < 0.4) {
      f.stun = true;
      $("log").textContent = "The " + f.label + " is stunned!";
    }
    if (t === "wolf" || (t === "pup" && Math.random() < 0.35)) f.st.chill = Math.max(f.st.chill, 1);
    if (t === "epup") f.st.burn = Math.max(f.st.burn, 2);
    puff(f.m.position.clone().setY(2), el, 10, 4, 0.6, 0.9);
    await resolve();
    await tw(220, (k) => m.position.lerpVectors(to, p0, k));
  }
  s.act = 0;
}
// ---- foes ----
const fname = (f) =>
  f.nm
    ? f.nm
    : f.min === "ember"
      ? "Emberling"
      : f.min === "knight"
        ? "Gloom Knight"
        : f.kind === "wolf"
          ? f.big
            ? "Alpha Frost Wolf"
            : "Frost Wolf"
          : f.kind === "hound"
            ? f.big
              ? "Alpha Ember Hound"
              : "Ember Hound"
            : NAMES[f.t - 1] + (f.boss ? " (boss)" : "");
function newFoe(sp, slot) {
  const f = Object.assign({ st: { burn: 0, chill: 0 }, stun: false, slot, foe: 1, hex: 0 }, sp);
  f.lv = foeLv(f);
  let hp = foeHp(f.lv);
  hp = f.min
    ? Math.round(g.bossHp * 0.26)
    : f.boss
      ? Math.round(hp * 1.9)
      : Math.round(hp * g.hm * (f.pack ? 0.85 : 1) * (f.big ? 1.25 : 1));
  if (f.hp0) hp = f.hp0;
  if (f.el) hp = Math.round(hp * 1.6);
  f.hp = f.max = hp;
  f.arm = f.el === "armored";
  const m = mkFoe(f.kind, f.mt || f.t, f.big, f.hc);
  m.scale.setScalar(
    (f.kind === "gloom" ? (f.t === 5 && !f.min ? 1.5 : 1 + 0.08 * ((f.mt || f.t) - 1)) : f.big ? 1.35 : 1.05) *
      (f.min ? 0.85 : 1) *
      (g.nf > 2 ? 0.9 : 1) *
      (f.bsc || 1),
  );
  const p = SLE[slot];
  m.position.set(p[0], 0, p[1]);
  m.rotation.y = f.kind === "gloom" ? -0.9 : -1.35;
  BG.add(m);
  f.m = m;
  f.th = (f.kind === "gloom" ? 3.3 : 2.4) * m.scale.x + 0.3;
  f.label = fname(f);
  if (f.el) {
    f.label = AFX[f.el][0] + " " + f.label;
    const au = new T.Sprite(
      new T.SpriteMaterial({
        map: GLT,
        color: 0xffb830,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    au.scale.setScalar(f.kind === "gloom" ? 4.2 : 3.6);
    au.position.y = 1.5;
    m.add(au);
  }
  deco(f, f.el ? "#ffd34d" : "#ff8a7a");
  g.foes.push(f);
  return f;
}
function intent(f) {
  const i = g.foes.indexOf(f),
    t = f.t,
    base = (6 + 2.3 * foeLv(f) + Math.random() * 3) * g.dm * (f.min ? 0.5 : 1) * (f.boss ? 0.85 : 1);
  let ab = "hit",
    mul = 1;
  const bs = g.foes.find((q) => q.boss && q.hp > 0 && q.hp < q.max);
  const reg = f.kind === "gloom" && !f.boss && !f.min,
    cyc = (g.turn + i) % 3;
  if (f.min === "knight" && bs && (g.turn + i) % 2 === 0) ab = "ward";
  else if (f.boss && g.turn % (f.t === 5 ? 2 : 3) === 0) {
    ab = "all";
    mul = 0.7;
  } else if (f.kind === "wolf" && cyc === 1 && alive().filter((q) => q.kind === "wolf").length > 1) {
    ab = "howl";
    mul = 0;
  } else if (reg && t === 3 && cyc === 1) {
    ab = "guard";
    mul = 0;
  } else if (reg && t === 2 && cyc === 1) {
    ab = "drain";
    mul = 0.8;
  } else if (f.kind === "hound" && cyc === 2) {
    ab = "ignite";
    mul = 0.9;
  } else if (cyc === 0) {
    ab = "smash";
    mul = 1.6;
  }
  if (f.buff) {
    mul *= f.buff;
    f.buff = 0;
  }
  if (f.el === "frenzied") mul *= 1.3;
  f.it = { ab, d: Math.round(base * mul) };
  f.itx =
    {
      ward: "WARD",
      all: "ALL " + f.it.d,
      howl: "HOWL",
      guard: "GUARD",
      drain: "DRAIN " + f.it.d,
      ignite: "IGNITE " + f.it.d,
      smash: "SMASH " + f.it.d,
    }[ab] || String(f.it.d);
}
// attacks wind up (squash down and back), then spring forward stretched
async function lunge(f, to) {
  const m = f.m,
    x0 = m.position.clone(),
    p = to.clone();
  p.x += 1.6;
  p.y = 0;
  const b = m.scale.x;
  await tw(170, (k) => {
    m.scale.set(b * (1 + 0.15 * k), b * (1 - 0.17 * k), b * (1 + 0.15 * k));
    m.position.x = x0.x + 0.35 * k;
  });
  f.run = 1;
  const x1 = m.position.clone();
  await tw(240, (k) => {
    m.position.lerpVectors(x1, p, Math.sin(k * 1.57));
    const e = 1 - k;
    m.scale.set(b * (1 + 0.15 * e - 0.07 * k), b * (1 - 0.17 * e + 0.14 * k), b * (1 + 0.15 * e - 0.07 * k));
  });
  m.scale.setScalar(b);
  return x0;
}
async function back(f, x0) {
  const m = f.m,
    p = m.position.clone();
  await tw(300, (k) => m.position.lerpVectors(p, x0, Math.sin(k * 1.57)));
  m.position.copy(x0);
  f.run = 0;
}
// the foe trembles while the block ring closes; the result decides how hard its hit lands
async function blockQ(f) {
  if (P.noqt) return 0;
  const m = f.m,
    x0 = m.position.x,
    b = m.scale.x;
  let done = 0;
  const p = qte("blk", W).then((r) => {
    done = 1;
    return r;
  });
  await new Promise((r) => {
    (function s() {
      if (done || (mode !== "battle" && mode !== "guest")) {
        m.position.x = x0;
        m.scale.setScalar(b);
        r();
        return;
      }
      m.position.x = x0 + (Math.random() - 0.5) * 0.14;
      m.scale.set(b * 1.08, b * 0.9, b * 1.08);
      requestAnimationFrame(s);
    })();
  });
  return p;
}
const vamp = (f, dd) => {
  if (f.el === "vampiric" && dd > 0 && f.hp > 0) {
    const h = Math.round(dd * 0.5);
    f.hp = Math.min(f.max, f.hp + h);
    popNum(f.m.position, "+" + h, "#7dff9a", "DRINKS");
    ui();
  }
};
function hurt(tg, d, f, lab) {
  if (g.sanct) d = Math.round(d * 0.6);
  if (!tg) {
    d =
      DEV.on && DEV.god
        ? 0
        : Math.max(1, Math.round(d * (1 - (gst().def || 0) / 100) * (P.role === "tank" ? 0.85 : 1)));
    const me = me0();
    let ab = 0;
    if (me && me.sh > 0) {
      ab = Math.min(me.sh, d);
      me.sh -= ab;
      d -= ab;
      P.absorbed = (P.absorbed || 0) + ab;
    }
    popNum(W.position, d, "#ff5a4a", ab ? "SHIELD -" + ab : lab || "", d >= 25);
    if (g.thorns && f && f.hp > 0 && d + ab > 0) dmg(f, Math.round((d + ab) * 0.5), schEl(), 1);
  } else popNum(tg.m.position, d, "#ffb0a0");
  if (tg) {
    tg.hp -= d;
    puff(tg.m.position.clone(), ALLY[tg.t].el, 10, 3, 0.5, 0.8);
    if (ALLY[tg.t].taunt && f) {
      ring(tg.m.position.x, 0x9fe8ff, 1.8, 350, tg.m.position.z);
      if (tg.t === "aegis") {
        dmg(f, 8, "ice");
        f.st.chill = Math.max(f.st.chill, 1);
      }
    }
    if (tg.hp <= 0) killA(tg);
  } else {
    g.hp = Math.max(0, g.hp - d);
    hit(W, 0xaa2222);
    g.lowR = Math.min(g.lowR == null ? 1 : g.lowR, g.hp / mhp());
    if (g.hp <= 0 && me0()) downHero(me0());
    // v24: foes with a moveset (24-foemoves.js) put their own burn/frostbite on, per move
    const own = f && f.it && f.it.mv;
    if (f && !own && (f.kind === "hound" || f.min === "ember")) g.pst.burn = f.it && f.it.ab === "ignite" ? 3 : 2;
    if (f && !own && f.kind === "wolf" && Math.random() < 0.3) {
      g.pst.chill = 1;
      toast("Frostbite: -1 pip next turn");
    }
  }
  return d;
}
async function foeAct(f) {
  if (f.hp <= 0) return;
  f.guard = 0;
  f.acted = 1;
  if (f.st.burn > 0) {
    f.st.burn--;
    f.hp = Math.max(0, f.hp - 6);
    puff(f.m.position.clone().setY(2), "fire", 12, 3, 0.7, 0.9);
    $("log").textContent = "Burn scorches the " + f.label + " for 6.";
    ui();
    await wait(350);
    if (f.hp <= 0) {
      await die(f);
      return;
    }
  }
  if (f.stun) {
    f.stun = false;
    $("log").textContent = "The " + f.label + " is stunned and loses its turn.";
    await wait(450);
    return;
  }
  let d = f.it.d;
  if (f.st.chill > 0) {
    d = Math.round(d * 0.65);
    f.st.chill--;
  }
  if (f.hex) {
    d = Math.round(d * 0.5);
    f.hex = 0;
  }
  // v24: per-kind movesets (24-foemoves.js) run the move; kinds without one fall through to the old abilities
  if (typeof fmRun === "function" && (await fmRun(f, d))) return;
  if (f.it.ab === "ward") {
    const b = g.foes.find((q) => q.boss && q.hp > 0);
    if (b) {
      b.hp = Math.min(b.max, b.hp + Math.round(b.max * 0.08));
      puff(b.m.position.clone().setY(2), "heal", 14, 3, 0.8, 1);
      $("log").textContent = "The Gloom Knight wards the Warden, mending it.";
    }
    await wait(450);
    return;
  }
  if (f.it.ab === "howl") {
    const m = f.m,
      b = m.scale.x;
    await tw(500, (k) => {
      m.scale.set(b, b * (1 + Math.sin(k * 3.14) * 0.15), b);
      m.rotation.x = -Math.sin(k * 3.14) * 0.35;
    });
    m.rotation.x = 0;
    ring(m.position.x, 0x9fe8ff, 5, 600, m.position.z);
    alive()
      .filter((q) => q !== f && q.kind === "wolf")
      .forEach((q) => {
        if (q.acted) q.buff = 1.4;
        else if (q.it) {
          q.it.d = Math.round(q.it.d * 1.4);
          q.itx = q.itx.replace(/\d+/, q.it.d);
        }
        puff(q.m.position.clone().setY(2.5), "ice", 8, 2, 0.7, 0.8);
      });
    $("log").textContent = "The " + f.label + " howls! The pack's next bites hit 40% harder.";
    ui();
    await wait(250);
    return;
  }
  if (f.it.ab === "guard") {
    f.guard = 1;
    const m = f.m,
      b = m.scale.x;
    await tw(380, (k) =>
      m.scale.set(
        b * (1 + 0.12 * Math.sin(k * 3.14)),
        b * (1 - 0.1 * Math.sin(k * 3.14)),
        b * (1 + 0.12 * Math.sin(k * 3.14)),
      ),
    );
    ring(m.position.x, 0x7dff9a, 2.5, 450, m.position.z);
    puff(m.position.clone().setY(1.5), "heal", 12, 2, 0.7, 0.9);
    $("log").textContent = "The " + f.label + " hardens its mossy hide. It takes half damage until it acts again.";
    ui();
    await wait(250);
    return;
  }
  const BL = ["", "BLOCK", "PARRY!"],
    bm = (gr) => (gr === 2 ? 0.25 : gr === 1 ? 0.6 : 1);
  if (f.it.ab === "all") {
    // v15: the whole party is the target: wide camera, and every player gets their own block ring
    const n = ++QN,
      rem = g.heroes.filter((h) => h.remote && !h.left && !h.down);
    focSet(null, f.m.position, 1, "The " + f.label + " targets everyone!");
    fatkSend(f, null, 1, n);
    await wait(300);
    const [gr, ...rg] = await Promise.all([blockQ(f), ...rem.map((h) => remoteBlock(h, n))]),
      x0 = await lunge(f, new T.Vector3(f.m.position.x - 2.5, 0, f.m.position.z));
    shk = 0.9;
    ring(0, 0xff5a4a, 9, 500, 0);
    $("log").textContent =
      "The " +
      f.label +
      " unleashes a blast on everyone for " +
      d +
      "!" +
      (gr ? " You " + (gr === 2 ? "parry" : "block") + " it." : "");
    if (gr) P.blocks = (P.blocks || 0) + 1;
    if (!iAmDown()) vamp(f, hurt(null, Math.round(d * bm(gr)), gr === 2 ? null : f, BL[gr]));
    g.heroes.forEach((h) => {
      if (h.local || h.down) return;
      const k = rem.indexOf(h);
      hurtHero(h, Math.round(d * bm(k >= 0 ? rg[k] : 0)), f);
    });
    [...g.allies].forEach((a) => hurt(a, d, f));
    ui();
    await back(f, x0);
    return;
  }
  // v11: foes choose among every hero still standing (tanks draw three times the attention) and the allies; a Challenge forces it
  const opts = [];
  if (!iAmDown()) opts.push({ w: P.role === "tank" ? 6 : 2 });
  g.heroes.forEach((h) => {
    if (!h.local && !h.down) opts.push({ w: h.role === "tank" ? 6 : 2, h });
  });
  g.allies.forEach((s) => opts.push({ w: ALLY[s.t].taunt || 1, s }));
  const tz = g.taunt && g.heroes.find((h) => h.id === g.taunt && !h.down);
  let tg;
  if (tz) tg = tz.local ? { w: 1 } : { w: 1, h: tz };
  else {
    if (!opts.length) return;
    let r = Math.random() * opts.reduce((a, o) => a + o.w, 0);
    tg = opts[0];
    for (const o of opts) {
      if ((r -= o.w) <= 0) {
        tg = o;
        break;
      }
    }
    if (f.it.ab === "drain" && !iAmDown()) tg = { w: 2 };
  }
  // v15: make the target obvious (camera on them, a red ring, a banner), and whoever is hit blocks: you here, another
  // player on their own screen (they answer with 'qr'), bots and summons don't
  const n = ++QN,
    tpos = tg.s ? tg.s.m.position : tg.h ? tg.h.m.position : W.position;
  focSet(tpos, f.m.position, 0, "The " + f.label + " targets " + (tg.s ? tg.s.label : tg.h ? tg.h.name : "you") + "!");
  fatkSend(f, tg.s ? "" : tg.h ? tg.h.id : P.id, 0, n);
  await wait(300);
  const gr = tg.s ? 0 : tg.h ? (tg.h.remote && !tg.h.left ? await remoteBlock(tg.h, n) : 0) : await blockQ(f);
  if (mode !== "battle") return;
  if (gr && !tg.h) P.blocks = (P.blocks || 0) + 1;
  const x0 = await lunge(f, tg.s ? tg.s.m.position : tg.h ? tg.h.m.position : W.position),
    dd = tg.h
      ? hurtHero(tg.h, Math.round(d * bm(gr)), f)
      : hurt(tg.s, Math.round(d * bm(gr)), gr === 2 ? null : f, BL[gr]);
  vamp(f, dd);
  let ms =
    "The " +
    f.label +
    " hits " +
    (tg.s ? "your " + tg.s.label : tg.h ? tg.h.name : "you") +
    " for " +
    dd +
    "." +
    (gr === 1 ? " Blocked!" : "");
  if (gr === 2) {
    dmg(f, Math.round(10 * lvS()), undefined, 1);
    slash(f.m.position);
    ms =
      (tg.h ? tg.h.name + " parries" : "You parry") +
      " the " +
      f.label +
      "! Only " +
      dd +
      " gets through, and " +
      (tg.h ? "they strike" : "you strike") +
      " back.";
    $("log").textContent = ms;
    shk = 0.3;
    ui();
    await back(f, x0);
    return;
  }
  if (f.it.ab === "drain" && !tg.s && !tg.h) {
    g.pst.drain = 1;
    ms = "The " + f.label + " drains you for " + dd + " and steals a pip from your next turn!";
    link(W.position.clone().setY(2), f.m.position.clone().setY(2));
  }
  if (f.it.ab === "ignite" && !tg.s && !tg.h) {
    ms = "The " + f.label + " ignites you for " + dd + ". You burn for 3 turns!";
    puff(W.position.clone().setY(1.5), "fire", 16, 3, 0.7, 1);
  }
  $("log").textContent = ms;
  shk = f.it.ab === "smash" ? 0.8 : 0.3;
  ui();
  await back(f, x0);
}
// ---- walk-ins: street foes keep patrolling during a fight. One that wanders close joins at the end of the round,
// but only if there is a free foe pad and the fight would stay fair for your level (a "threat budget"); otherwise it holds back and waits.
const thr = (f) => (f.t || 1) * (f.big ? 1.5 : 1) * (f.elite || f.el ? 1.4 : 1) * (f.min ? 0.5 : 1),
  budget = () => (1.6 + P.lvl) * (1 + 0.8 * (partyN() - 1)),
  JR = 11; // v11: a bigger party can take on more
function canJoin(f, solo) {
  if (!g || mode !== "battle" || g.boss || !cur || f.dead || g.party.includes(f)) return false;
  if (zoneAt(f.hx, f.hz) !== zoneAt(cur.hx, cur.hz)) return false;
  const a = alive(),
    pend = solo ? [] : foes.filter((q) => q !== f && (q.wait || q.hidq) && !q.dead && !g.party.includes(q));
  if (a.length + pend.length >= 4) return false;
  if (g.hp < mhp() * 0.35) return false;
  return a.reduce((s, q) => s + thr(q), 0) + pend.reduce((s, q) => s + thr(q), 0) + thr(f) <= budget() + 0.01;
}
function battlePatrol(dt, s) {
  const c = BG.position;
  for (const f of foes) {
    if (f.dead || f.hidq || !f.o.visible || g.party.includes(f)) continue;
    const q = f.o.position;
    if (Math.abs(q.x - c.x) > 70 || Math.abs(q.z - c.z) > 70) continue;
    const d = Math.hypot(q.x - c.x, q.z - c.z);
    let mf = false;
    if (f.wait || f.hold) {
      if (f.hold && canJoin(f)) {
        f.hold = 0;
        f.wait = 1;
      }
      let df = Math.atan2(c.x - q.x, c.z - q.z) - f.o.rotation.y;
      df = Math.atan2(Math.sin(df), Math.cos(df));
      f.o.rotation.y += df * Math.min(1, dt * 5);
    } else if (d < JR && !f.boss) {
      if (canJoin(f)) {
        f.wait = 1;
        toast("A " + fname(f) + " is coming to join the fight!", "#ff8a7a");
      } else f.hold = 1;
    } else mf = patrol(f, dt);
    if (f.kind !== "gloom") animBeast(f.o, s, mf);
    else animGloom(f.o, s, mf, f.hx);
  }
}
async function joinFoe(f) {
  const used = alive().map((q) => q.slot),
    slot = [0, 1, 2, 3].find((i) => !used.includes(i));
  if (slot == null) return;
  g.party.push(f);
  f.wait = f.hold = 0;
  const from = BG.worldToLocal(f.o.position.clone());
  from.y = 0;
  if (f.o.visible) {
    f.o.visible = false;
    g.hid.push(f.o);
  }
  f.hidq = 0;
  const nf = newFoe({ kind: f.kind, t: f.t, big: f.big, el: f.elite, hc: f.hc, pack: 1 }, slot),
    to = nf.m.position.clone(),
    r1 = nf.m.rotation.y;
  nf.m.position.copy(from);
  nf.m.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  nf.run = 1;
  intent(nf);
  $("log").textContent = "A " + nf.label + " walks into the fight!";
  ui();
  await tw(Math.min(1500, 300 + from.distanceTo(to) * 90), (k) => {
    nf.m.position.lerpVectors(from, to, k);
    if (k > 0.8) nf.m.rotation.y = angTo(nf.m.rotation.y, r1, 0.2);
  });
  nf.m.position.copy(to);
  nf.m.rotation.y = r1;
  nf.run = 0;
  ui();
}
async function reinforce() {
  if (g.boss) return;
  const c = foes
    .filter((f) => (f.wait || f.hidq) && !f.dead && !g.party.includes(f))
    .sort((a, b) => (b.wait ? 1 : 0) - (a.wait ? 1 : 0));
  for (const f of c) {
    if (!alive().length || alive().length >= 4) break;
    if (canJoin(f, 1)) await joinFoe(f);
    else if (f.wait) {
      f.wait = 0;
      f.hold = 1;
    }
  }
}
// ---- turn flow ----
function draw() {
  let d = P.deck.filter(useOK);
  if (!d.length) {
    clsStart();
    d = P.deck.filter(useOK);
  }
  if (!d.length) d = ["sprite"];
  const n = 4 + P.hs,
    out = [];
  let pool = [];
  for (let i = 0; i < n; i++) {
    if (!pool.length) pool = d.slice();
    out.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  }
  const hand = out.map((k) => {
    const o = Object.assign({ k }, SPL[k]);
    if (o.sch) o.a = schEl();
    return o;
  });
  // v13: each companion on call (Book > Party) that isn't already fighting is an extra 1-pip Companion card
  // v21: switched off for now (NPCJOIN) - NPCs took a pad and other players never saw them
  (NPCJOIN ? P.comp || [] : [])
    .filter((k) => ALLY[k] && compOK(k) && !g.allies.some((a) => a.t === k))
    .forEach((k) => {
      const A = ALLY[k];
      hand.push({
        k: "comp:" + k,
        comp: k,
        art: { fire: "blade", ice: "wolf", storm: "wisp", heal: "sprite", spirit: "sprite" }[A.el] || "sprite",
        n: A.n,
        c: 1,
        ty: "sum",
        a: A.el,
        t: "Companion: " + (A.d || "fights beside you"),
      });
    });
  return hand;
}
function turn() {
  g.turn++;
  g.sanct = 0;
  g.taunt = null;
  g.thorns = 0;
  g.focus = 0;
  if (g.bond) g.bond--;
  if (iAmDown()) $("log").textContent = "You are knocked out. End the turn and let your party fight on.";
  g.en = Math.max(
    0,
    Math.min(
      5 + (P.focus || 0),
      g.en + 2 + (P.cls === "gale" ? 1 : 0) + (g.bonus || 0) - (g.pst.chill ? 1 : 0) - (g.pst.drain ? 1 : 0),
    ),
  );
  g.bonus = 0;
  g.pst.chill = 0;
  g.pst.drain = 0;
  g.lastEl = null;
  sigTurn(); // v20 Verdant petals
  g.foes.forEach((f) => (f.acted = 0));
  g.ended = 0;
  g.pq = [];
  g.hand = draw();
  alive().forEach(intent);
  g.busy = false;
  g.tt = TT;
  g.tAt = performance.now(); // keyboard End turn waits a moment so a held/mashed Space can't skip the new turn
  ui();
}
// turn timer: 45 seconds to play your cards; it pauses during animations and timed-hit rings, then ends your turn for you
const TT = 45;
// v17: with other players it is one shared round clock. The host's clock keeps running while they wait for the others
// (g.wait) and is sent in 'bstate' (tt); guests count down from it and end their turn when it runs out.
function tmrTick(dt) {
  const el = $("tmr");
  let left, // seconds left to choose, -1 while the round plays out
    rdy = "", // "1/2 ✓" when other players share the clock
    co = false;
  if (mode === "guest") {
    const G = GUEST,
      s = G && G.s;
    if (!s) return;
    co = true;
    left = G.tt == null || G.tt < 0 ? -1 : Math.max(0, G.tt - (performance.now() - G.ttAt) / 1000);
    if (left === 0 && !G.ended && !G.down) guestEnd();
    rdy = s.heroes.filter((h) => h.rd || h.down).length + "/" + s.heroes.length + " ✓";
  } else {
    co = coopB();
    if ((P.notimer && !co) || g.prac) {
      // v18: no clock in the practice fight (Oona takes her time explaining)
      el.className = "off";
      el.dataset.t = "";
      return;
    }
    const choosing = (!g.busy || g.wait) && !g.intro;
    if (choosing && !QT && g.tt > 0) {
      g.tt -= dt;
      if (g.tt <= 0) {
        g.tt = 0;
        if (!g.ended) endTurn();
      }
    }
    left = choosing ? g.tt || 0 : -1;
    if (co) rdy = g.heroes.filter((h) => !h.left && (heroReady(h) || h.down)).length + "/" + g.heroes.length + " ✓";
  }
  const t = left < 0 ? -1 : Math.ceil(left),
    k = t + rdy;
  if (el.dataset.t != k) {
    el.dataset.t = k;
    el.className = t >= 0 && t <= 10 ? "low" : "";
    el.querySelector("span").textContent =
      t < 0 ? (co ? "Round playing out" : "Foes acting") : "⏳ " + t + "s" + (co ? "  ·  " + rdy : "");
    el.title = co ? "Shared round clock: when it runs out, everyone still choosing ends their turn" : "";
    el.querySelector("i").style.width = Math.max(0, (Math.max(0, left) / TT) * 100) + "%";
  }
}
function ui() {
  $("hp").style.width = (g.hp / mhp()) * 100 + "%";
  $("hpt").textContent = "HP " + g.hp + "/" + mhp() + (g.pst && g.pst.burn && mode === "battle" ? "  Burning" : "");
  $("gold").textContent = "✦ " + P.gold;
  $("gold").title = "Glimmers, the lamplighters' coin";
  $("pname").textContent = P.name || "Lampwick";
  $("lvn").textContent = P.lvl;
  $("lvl").style.setProperty("--xp", (P.xp / need()) * 360 + "deg");
  {
    const rz = zcur === "dun" ? DUN[dunIdx(W.position.x)].z : zcur === "tower" ? "hub" : zcur;
    $("ttl").textContent = (P.cls ? CL[P.cls][1] + "  -  " : "") + RN[rk(rz)] + " of " + ZN[rz];
  }
  $("sums").textContent = "";
  {
    const me = me0();
    if (mode === "battle" && me && (me.sh || me.down))
      $("hpt").textContent += me.down ? "  Knocked out" : "  Shield " + me.sh;
  }
  if (mode === "guest") return guestUI();
  $("aus").innerHTML =
    mode === "battle"
      ? '<div class="side a">Your team</div>' +
        (g.heroes || [])
          .filter((h) => !h.local)
          .map(
            (h) =>
              '<div class="au"><span class="sl a">' +
              (h.slot + 1) +
              '</span><div class="ub"><b>' +
              h.name +
              ' <span style="color:' +
              ROLE[h.role].col +
              ';font-size:11px">' +
              ROLE[h.role].tag +
              (h.bot ? " (bot)" : "") +
              '</span></b><div class="bar"><i style="width:' +
              Math.max(0, (h.hp / h.max) * 100) +
              '%"></i></div><div class="sub">' +
              (h.down ? "Knocked out" : h.hp + "/" + h.max) +
              (h.sh ? "  Shield " + h.sh : "") +
              (h.remote ? (heroReady(h) ? '  <span style="color:#7dff9a">✓ Ready</span>' : "  Choosing...") : "") +
              "</div></div></div>",
          )
          .join("") +
        [...g.allies]
          .sort((a, b) => a.slot - b.slot)
          .map(
            (s) =>
              '<div class="au"><span class="sl a">' +
              (s.slot + 1) +
              '</span><div class="ub"><b>' +
              s.label +
              '</b><div class="bar"><i style="width:' +
              Math.max(0, (s.hp / s.max) * 100) +
              '%"></i></div><div class="sub">' +
              Math.max(0, s.hp) +
              "/" +
              s.max +
              "</div></div></div>",
          )
          .join("")
      : "";
  if (mode !== "battle") return;
  const E = $("eus");
  E.innerHTML = '<div class="side e">Foes</div>';
  const tf = tgt();
  g.foes.forEach((f, i) => {
    if (f.hp <= 0) return;
    const st = f.st,
      b = document.createElement("button");
    b.className = "fu" + (f === tf ? " tg" : "");
    b.innerHTML =
      '<span class="sl e">' +
      (f.slot + 1) +
      '</span><span class="lvl ev"><span>' +
      foeLv(f) +
      '</span></span><div class="ub"><b>' +
      f.label +
      '</b><div class="bar"><i style="width:' +
      (f.hp / f.max) * 100 +
      '%"></i></div><div class="sub">' +
      f.hp +
      "/" +
      f.max +
      (st.burn ? "  Burn " + st.burn : "") +
      (st.chill ? "  Chill " + st.chill : "") +
      (f.stun ? "  Stun" : "") +
      (f.hex ? "  Hexed" : "") +
      (f.guard ? "  Guarded" : "") +
      (f.it ? "  Next: " + (f.mvn ? f.mvn + " " : "") + f.itx : "") +
      (weakTxt(f) ? '<br><span style="color:#ffd27a">' + weakTxt(f).trim() + "</span>" : "") +
      (f.el ? '<br><span style="color:#ffb830">Elite: ' + AFX[f.el][1] + "</span>" : "") +
      "</div></div>";
    b.onclick = () => {
      g.tgt = i;
      ui();
    };
    E.appendChild(b);
    flash(f.m, st.chill > 0 ? 0x103a66 : st.burn > 0 ? 0x331100 : 0);
  });
  $("en").innerHTML =
    'Pips <span class="pips">' +
    "◆".repeat(g.en) +
    "◇".repeat(Math.max(0, 5 + (P.focus || 0) - g.en)) +
    "</span>" +
    sigHud();
  $("end").disabled = g.busy;
  $("flee").disabled = g.busy || g.boss || g.prac; // v18: no fleeing the Primer's practice fight
  $("flee").textContent = g.boss || g.prac ? "No escape" : "Flee " + Math.round(fleeCh() * 100) + "%";
  const h = $("hand"),
    full = freeSlot() < 0;
  h.innerHTML = "";
  g.hand.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "card " + c.ty;
    b.style.borderColor = ELC[c.a];
    b.innerHTML =
      '<span class="ty">' +
      ({ sum: "✦ SUMMON", sup: "✚ SPELL" }[c.ty] || "⚔ ATTACK") +
      '</span><span class="k">' +
      (i + 1) +
      '</span><span class="c">' +
      cc(c) +
      '</span><img class="art" alt="" src="' +
      ART[c.art || c.k] +
      '"><h3>' +
      c.n +
      "</h3><small>" +
      c.t +
      (c.ty === "sum" && full ? "<em>replaces an ally</em>" : "") +
      "</small>" +
      cardRangeH(c);
    b.disabled = g.busy || g.en < cc(c) || iAmDown();
    b.onclick = () => play(i);
    h.appendChild(b);
  });
}
async function play(i) {
  if (mode === "guest") return guestPlay(i);
  const c = g.hand[i];
  if (!c || g.busy || mode !== "battle" || g.en < cc(c)) return;
  if (iAmDown()) {
    $("log").textContent = "You are knocked out and cannot cast.";
    return;
  }
  // v15: with another player in the fight, cards are readied and only play out once everyone has ended their turn
  if (coopB()) {
    if (g.ended) return;
    g.en -= cc(c);
    g.hand.splice(i, 1);
    P.casts++;
    (g.pq || (g.pq = [])).push({ c, ti: g.tgt });
    banner(c.n, c.ty);
    castT = 0.6;
    castGlyph(c.a);
    $("log").textContent =
      "Readied: " + g.pq.map((q) => q.c.n).join(", ") + ". Cards play out once everyone has ended their turn.";
    ui();
    qchk();
    return;
  }
  g.busy = true;
  g.en -= cc(c);
  g.hand.splice(i, 1);
  P.casts++;
  const f = tgt();
  NET.send("act", { b: g.id, k: c.k, tgt: g.tgt });
  ui();
  await castCard(c, f);
  await resolve();
  if (!alive().length) return win();
  g.busy = false;
  ui();
  qchk();
}
// the effect of one of your cards on foe f (used straight away when solo, and when a shared round plays out)
async function castCard(c, f) {
  // Spellweave: an attack of a different school than your previous attack this turn hits 20% harder
  g.wv = 1;
  let wvt = "";
  if (c.ty === "atk") {
    if (g.lastEl && g.lastEl !== c.a) {
      g.wv = 1.2;
      wvt = "  Spellweave! +20%";
    }
    g.lastEl = c.a;
  }
  $("log").textContent =
    (c.ty === "sum"
      ? "You summon " + c.n + "."
      : c.ty === "sup"
        ? "You cast " + c.n + "."
        : "You cast " + c.n + (c.aoe ? " on every foe." : " at the " + f.label + ".")) + wvt;
  banner(c.n + (wvt ? " ✦" : ""), c.ty);
  castT = 0.6;
  castGlyph(c.a);
  // v20 timed hit on attack cards picks the spot in the card's damage range: missed = low end (70%), good = 100%,
  // perfect = high end (135%, +5% per Perfect in a row up to +20%). Timed hits switched off count as good.
  g.qm = 1;
  let gr = 1;
  if (c.ty === "atk") {
    gr = P.noqt ? 1 : await qte("atk", c.aoe ? W : f.m, c); // v22: card = charge-up + longer ring
    if (gr === 2) {
      P.perf = (P.perf || 0) + 1;
      g.combo = (g.combo || 0) + 1;
      g.qm = QMUL[2] + 0.05 * Math.min(4, g.combo - 1);
      $("log").textContent += "  Perfect!" + (g.combo > 1 ? " Combo x" + g.combo : "");
      const p = (c.aoe ? W : f.m).position;
      ring(p.x, 0xffe066, 3.2, 450, p.z);
      ring(p.x, 0xffffff, 1.8, 300, p.z);
      flashScr("#fff3c0", 0.18);
      await hold(70); // a beat of hit-stop before the spell goes
    } else {
      g.combo = 0;
      g.qm = QMUL[gr];
      $("log").textContent += gr === 1 ? "  Good timing." : "  Missed the timing: a weak hit.";
    }
  }
  bfxSend(
    0,
    c.a,
    c.ty === "atk" ? (c.aoe ? alive() : [f]).filter(Boolean).map((q) => g.foes.indexOf(q)) : [],
    c.ty === "sup" && c.a === "heal",
    P.id,
    c.k,
    c.ty === "atk" && !P.noqt ? gr : -1,
  );
  const a0 = alive().length;
  g.aoeCast = !!c.aoe;
  sigBefore(c);
  if (c.ty === "sum") await summon(c.comp || c.k);
  else await CFX[c.k](f);
  g.wv = 1;
  g.qm = 1;
  g.aoeCast = 0;
  await sigAfter(c, f, gr);
  g.wild = 0;
  if (c.ty === "atk") {
    g.focus = 0;
    if (c.aoe && a0 >= 3) P.multi = (P.multi || 0) + 1;
    if (a0 - alive().length >= 3) P.wild = (P.wild || 0) + 1;
  }
}
async function endTurn() {
  if (mode === "guest") return guestEnd();
  if (g.busy || mode !== "battle") return;
  g.busy = true;
  g.ended = 1;
  ui();
  NET.send("act", { b: g.id, k: "end" });
  // v15 shared rounds: wait for every other player to end their turn, then your readied cards play out first
  if (coopB()) {
    // v17: the round clock keeps running for everyone (tmrTick); when it runs out, whoever is still choosing is done.
    // The wall-clock limit only matters if this window stops drawing frames (the clock then stands still).
    const dl = performance.now() + Math.max(0, g.tt || 0) * 1000 + 1500;
    g.wait = 1;
    for (;;) {
      const wt = g.heroes.filter((h) => h.remote && !h.left && !heroReady(h));
      if (!wt.length || mode !== "battle" || g.tt <= 0 || performance.now() > dl) break;
      $("log").textContent = "Waiting for " + wt.map((h) => h.name).join(", ") + " to end their turn...";
      await new Promise((r) => setTimeout(r, 200));
    }
    g.wait = 0;
    if (mode !== "battle") return;
    // anyone who ran out the clock just loses the rest of their turn (their readied cards still play)
    g.heroes.forEach((h) => {
      if (h.remote && !h.left && !heroReady(h)) h.q.push({ k: "end" });
    });
    $("log").textContent = "Everyone is ready. The round plays out!";
    await wait(400);
  }
  {
    const pq = g.pq || [];
    g.pq = [];
    for (const q of pq) {
      if (!alive().length || iAmDown() || mode !== "battle") break;
      if (g.foes[q.ti] && g.foes[q.ti].hp > 0) g.tgt = q.ti;
      const f = tgt();
      banner(q.c.n, q.c.ty);
      castT = 0.6;
      castGlyph(q.c.a);
      $("log").textContent = "You cast " + q.c.n + ".";
      await castCard(q.c, f);
      await resolve();
    }
    if (!alive().length) return win();
  }
  // v11: the rest of the party takes its turn (bots decide for themselves; networked players' queued actions play out)
  for (const h of [...g.heroes]) {
    if (h.local || h.down || !alive().length) continue;
    await heroTurn(h);
  }
  if (!alive().length) return win();
  for (const s of [...g.allies].sort((a, b) => a.slot - b.slot)) {
    if (!alive().length) break;
    if (g.allies.includes(s)) await act(s);
  }
  if (!alive().length) return win();
  for (const f of [...g.foes]) {
    if (f.hp > 0) {
      await foeAct(f);
      await resolve();
      if (partyDown()) return lose();
    }
  }
  if (!alive().length) return win();
  if (g.pst.burn > 0 && !iAmDown()) {
    g.pst.burn--;
    if (!(DEV.on && DEV.god)) g.hp = Math.max(0, g.hp - 5);
    puff(W.position.clone().setY(1.4), "fire", 10, 2, 0.6, 0.8);
    $("log").textContent = "You burn for 5.";
    if (g.hp <= 0) downHero(me0());
    if (partyDown()) return lose();
    await wait(300);
  }
  await reinforce();
  turn();
}
const fleeCh = () => {
  const a = alive();
  if (!a.length) return 1;
  const mt = Math.max(...a.map((f) => f.t));
  return Math.max(
    0.15,
    Math.min(
      0.9,
      0.6 -
        0.08 * (mt - 1) -
        0.05 * (a.length - 1) +
        0.02 * P.lvl +
        0.1 * (P.boots || 0) +
        (P.cls === "gale" ? 0.1 : 0) +
        (gst().flee || 0) / 100,
    ),
  );
};
async function flee() {
  if (mode === "guest") return guestLeave();
  if (g.busy || mode !== "battle") return;
  if (g.boss || g.prac) {
    $("log").textContent = g.prac ? 'Oona: "No running off mid-lesson!"' : "This foe will not let you run!";
    return;
  }
  g.busy = true;
  ui();
  if (Math.random() < fleeCh()) {
    $("log").textContent = "You slip away!";
    await wait(500);
    const now = performance.now();
    g.party.forEach((f) => (f.cool = now + 6000));
    const o = cur.o.position,
      dx = saved.x - o.x,
      dz = saved.z - o.z,
      dl = Math.hypot(dx, dz) || 1,
      nx = saved.x + (dx / dl) * 5,
      nz = saved.z + (dz / dl) * 5;
    if (okp(nx, nz)) {
      saved.x = nx;
      saved.z = nz;
    }
    leave();
    return;
  }
  $("log").textContent = "You fail to escape!";
  await wait(500);
  for (const f of alive().slice(0, 2)) {
    await foeAct(f);
    await resolve();
    if (partyDown()) return lose();
  }
  if (!alive().length) return win();
  turn();
}
function clearAll() {
  (g.heroes || []).forEach((h) => {
    if (h.local) return;
    if (h.m.parent) h.m.parent.remove(h.m);
    undeco(h);
  });
  g.heroes = [];
  [...g.allies].forEach((s) => killA(s, 1));
  (g.foes || []).forEach((f) => {
    if (f.m.parent) f.m.parent.remove(f.m);
    undeco(f);
  });
  g.foes = [];
  g.allies = [];
}
async function win() {
  $("log").textContent = "Victory!";
  g.busy = true;
  vicT = 1.1;
  puff(W.position.clone().setY(2.6), "heal", 16, 3, 0.9, 0.8);
  ring(W.position.x, 0xffd34d, 4, 600, W.position.z);
  await wait(900);
  if (g.prac) {
    // v18 practice fight: no spoils or kill count, a full heal and a little gold, then back to where you started
    clearAll();
    g.hp = mhp();
    P.gold += 15;
    sv();
    toast("Practice won! Oona slips you ✦15 for the lesson.", "#ffd34d");
    leave();
    return;
  }
  const list = g.foes.slice();
  P.wins = (P.wins || 0) + 1; // v21
  if ((g.lowR == null ? 1 : g.lowR) >= 0.5) P.flaw = (P.flaw || 0) + 1;
  NET.send("fdead", { i: g.party.map((f) => foes.indexOf(f)).filter((i) => i >= 0) });
  g.party.forEach((f) => {
    f.dead = 1;
    f.rt = f.tw || f.dun != null ? Infinity : performance.now() + 30000;
    S.remove(f.o);
  });
  g.hp = Math.min(mhp(), Math.max(1, g.hp)); // v21: no free heal after a win (a level up refills you)
  clearAll();
  reward(list);
  leave(1);
}
function lose() {
  netBend(false);
  mode = "over";
  clearAll();
  $("overt").textContent = "The dark wins this round";
  $("over").style.display = "flex";
}
$("again").onclick = () => {
  g.hp = mhp();
  saved.set(OX, 0, OZ + 9);
  theme("hub");
  ptcd = 0;
  $("over").style.display = "none";
  leave();
  snap = true;
};
// who fights: nearby foes join, harder areas bring extra pack-mates, bosses bring leveled minions
const zkey = (f) => {
  const z = zoneAt(f.hx, f.hz);
  return z !== "hub" ? z : Math.abs(f.hx - OX) > 12 ? "road" : "street";
};
function gather(f0) {
  const z = zkey(f0),
    cap = Math.min(4, ({ street: 2, road: 3, frost: 3, ember: 4, tower: 4, dun: 3 }[z] || 3) + partyN() - 1);
  // v18 Primer practice fight (16-tutorial.js): one tame gloomling, nobody else joins
  if (f0.prac) {
    // never resist the player's own element (Gloomlings resist storm, which made a Gale's first fight a slog);
    // the first one is weak to it, so the WEAK badge gets shown off too
    const pe = CLE[P.cls] || "fire";
    return {
      cap: 2,
      rein: 0,
      list: [],
      sp: [
        { kind: "gloom", t: 1, nm: "Practice Gloomling", hp0: 70, wk: { [pe]: WK_W } },
        { kind: "gloom", t: 1, nm: "Practice Gloomling", hp0: 70, hc: 0x9a7ae0, wk: { [pe]: 1 } },
      ],
    };
  }
  if (f0.dboss)
    return { cap: 3, rein: 0, list: [f0], sp: f0.bsp.map((o) => Object.assign({}, o)), bossHp: f0.bsp[0].hp0 };
  if (f0.boss && f0.t === 4)
    return {
      cap: 3,
      rein: 0,
      list: [f0],
      sp: [
        { kind: "gloom", t: 4, boss: 1 },
        { kind: "gloom", t: 4, mt: 2, hc: 0xff6a2a, min: "ember" },
        { kind: "gloom", t: 4, mt: 2, hc: 0xff6a2a, min: "ember" },
      ],
    };
  if (f0.boss)
    return {
      cap: 4,
      rein: 0,
      list: [f0],
      sp: [
        { kind: "gloom", t: 5, boss: 1 },
        ...[0, 1, 2].map(() => ({ kind: "gloom", t: 5, mt: 3, hc: 0x3a3a7a, min: "knight" })),
      ],
    };
  // v14 dungeons: the whole room fights together (every living foe whose home is in the same room joins)
  if (f0.dun != null) {
    const D = DUN[f0.dun],
      room = (f) =>
        D.R.reduce(
          (b, c, k) => (Math.hypot(f.hx - c[0], f.hz - c[1]) < Math.hypot(f.hx - D.R[b][0], f.hz - D.R[b][1]) ? k : b),
          0,
        ),
      r0 = room(f0),
      list = [f0].concat(
        foes.filter((f) => f !== f0 && !f.dead && !f.dboss && f.dun === f0.dun && room(f) === r0).slice(0, 3),
      );
    return {
      cap: Math.max(cap, list.length),
      rein: 0,
      list,
      sp: list.map((f) => ({ kind: f.kind, t: f.t, big: f.big, el: f.elite, hc: f.hc })),
    };
  }
  // nearby foes and pack-mates pile in only while the fight stays fair for your level (see budget())
  const q = f0.o.position,
    B = budget();
  let tot = thr(f0);
  const list = [f0];
  foes
    .filter(
      (f) =>
        f !== f0 &&
        !f.dead &&
        !f.boss &&
        f.o.visible &&
        zoneAt(f.hx, f.hz) === zoneAt(f0.hx, f0.hz) &&
        Math.hypot(f.o.position.x - q.x, f.o.position.z - q.z) < 8,
    )
    .sort((a, b) => a.o.position.distanceTo(q) - b.o.position.distanceTo(q))
    .forEach((f) => {
      if (list.length < cap && tot + thr(f) <= B + 0.01) {
        list.push(f);
        tot += thr(f);
      }
    });
  const sp = list.map((f) => ({ kind: f.kind, t: f.t, big: f.big, el: f.elite, hc: f.hc })),
    extra =
      {
        street: Math.random() < 0.3 ? 1 : 0,
        road: (Math.random() * 2) | 0,
        frost: 1 + ((Math.random() * 2) | 0),
        ember: 1 + ((Math.random() * 3) | 0),
        tower: 1 + ((Math.random() * 2) | 0),
        dun: 0,
      }[z] || 0;
  for (let i = 0; i < extra && sp.length < cap; i++) {
    const e = { kind: f0.kind, t: Math.max(1, f0.t - (Math.random() < 0.5 ? 1 : 0)), pack: 1, hc: f0.hc };
    if (tot + thr(e) > B + 0.01) break;
    sp.push(e);
    tot += thr(e);
  }
  return { cap, rein: 0, list, sp };
}
// where to drop the battle frame: centred on the street (or plaza/floor) and lined up along the road.
// v13: frames snap to designated battle spots BSP apart (a battlefield is about 17 across), so fights can't overlap.
const BSP = 20;
function frame(f) {
  const p = W.position,
    q = f.o.position,
    z = zoneAt(q.x, q.z);
  let cx = (p.x + q.x) / 2,
    cz = (p.z + q.z) / 2,
    ax = q.x - p.x,
    az = q.z - p.z;
  // v14 trails: like the town roads, snap onto the trail's centreline at a battle spot and line the fight up along it
  const th = z !== "dun" && z !== "tower" ? trOn(cx, cz, TRW + 4) : null,
    zc0 = ZCEN[z]; // v45: live zone centres (03 moves them with the re-layout)
  if (th && (!zc0 || Math.hypot(cx - zc0[0], cz - zc0[1]) > ZR - 12)) {
    const [x, q2, hx, hz] = rdAt(th.t, Math.max(12, Math.min(th.t.L - 12, Math.round(th.s / BSP) * BSP))),
      d = ax * hx + az * hz < 0 ? -1 : 1;
    cx = OX + x;
    cz = OZ + q2;
    ax = hx * d;
    az = hz * d;
  } else if (z === "hub") {
    const lx = cx - OX,
      rh = Math.abs(lx) >= 12 ? rdHit(lx, cz - OZ) : null;
    if (Math.abs(lx) < 12) {
      cx = OX;
      ax = 0;
      az = az < 0 ? -1 : 1;
      // v13: battle spots every BSP along Gloomway, so two fights never overlap
      cz = OZ - 22 - Math.round((OZ - 22 - cz) / BSP) * BSP;
      cz = Math.min(OZ - 22, Math.max(OZ - SL + 2, cz));
    } else if (rh && !rh.g) {
      // v12: snap onto the winding road's centreline and line the fight up along it (v13: at a fixed battle spot)
      const [x, q, hx, hz] = rdAt(rh.R, Math.max(10, Math.min(rh.R.L - 4, Math.round(rh.s / BSP) * BSP))),
        d = ax * hx + az * hz < 0 ? -1 : 1;
      cx = OX + x;
      cz = OZ + q;
      ax = hx * d;
      az = hz * d;
    } else if (rh) {
      const gx = OX + rh.R.gx,
        gz = OZ + rh.R.gz;
      cx = gx + (cx - gx) * 0.3;
      cz = gz + (cz - gz) * 0.3;
    }
  } else if (z === "tower") {
    const t = TF.reduce((a, c) => (Math.abs(c.z - q.z) < Math.abs(a.z - q.z) ? c : a));
    cx = t.x;
    cz = t.z;
  } else if (z === "dun") {
    const D = DUN[dunIdx(q.x)],
      rm = D.R.reduce((a, c) => (Math.hypot(c[0] - q.x, c[1] - q.z) < Math.hypot(a[0] - q.x, a[1] - q.z) ? c : a));
    cx = rm[0];
    cz = rm[1];
  } else {
    // v45: live zone centre (03 ZCEN, moved with the re-layout)
    const [zc, zz] = ZCEN[z] || [z === "marsh" ? MWX : z === "frost" ? 600 : -600, -400];
    // v13: open zones use a grid of battle spots BSP apart
    cx = zc + Math.round((cx - zc) / BSP) * BSP;
    cz = zz + Math.round((cz - zz) / BSP) * BSP;
    const d = Math.hypot(cx - zc, cz - zz),
      m = ZR - 12;
    if (d > m) {
      cx = zc + ((cx - zc) / d) * m;
      cz = zz + ((cz - zz) / d) * m;
    }
  }
  // v13: a battlefield (about 8.5 round) never spills into a safe zone: push it straight out of any it touches
  if (z !== "tower" && z !== "dun")
    for (let n = 0; n < 3; n++)
      BSAFE().forEach(([sx, sz, sr]) => {
        const dx = cx - sx,
          dz = cz - sz,
          d = Math.hypot(dx, dz),
          m = sr + 8.6;
        if (d >= m) return;
        const ux = d > 0.01 ? dx / d : ax / (Math.hypot(ax, az) || 1),
          uz = d > 0.01 ? dz / d : az / (Math.hypot(ax, az) || 1);
        cx = sx + ux * m;
        cz = sz + uz * m;
      });
  const l = Math.hypot(ax, az) || 1;
  return { x: cx, z: cz, r: Math.atan2(-az / l, ax / l) };
}
// the round safe zones (green rings): Lamplight Square, Market Lane, zone plazas, glade camps, dungeon landings
const BSAFE = () => [[OX, OZ, 18.5], [OX, OZ + MLZ, MLR + 0.5], ...SAFEC];
const CV = new T.Vector3(),
  CT = new T.Vector3(),
  BTV = new T.Vector3();
// seamless engage: nothing teleports. The camera glides from the street view to the battle view, you walk to your spot,
// the battle foes start exactly where the street foes stood (pack-mates run in from up the road) and companions jog in from behind
const camFrom = new T.Vector3(),
  lookFrom = new T.Vector3(),
  LK = new T.Vector3();
let camK = 1;
const angTo = (a, b, k) => {
  let d = b - a;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return a + d * k;
};
async function fight(f0) {
  // v18: the Primer's practice fight is in the Lamplighters' Vault (16-tutorial.js), always solo
  const fr = f0.prac ? { x: f0.o.position.x, z: f0.o.position.z, r: 0 } : frame(f0);
  // v13: someone else's battle already holds this spot (or one overlapping it): join the nearest one if it has room
  if (NET.online && !f0.prac) {
    let best = null,
      bd = 1e9;
    const now = performance.now();
    OPENB.forEach((o, b) => {
      if (now - o.t > BSTALE) return;
      const d = Math.hypot(o.s.x - fr.x, o.s.z - fr.z);
      if (d < BSP - 1 && d < bd) {
        bd = d;
        best = [b, o];
      }
    });
    if (best) {
      f0.cool = now + 4000;
      if (best[1].s.open) guestJoin(best[0], best[1]);
      else toast("A full battle already holds this spot. Wait for it to end.", "#ffb04a");
      return;
    }
  }
  const G = gather(f0);
  flashScr("#ff8a3d", 0.18);
  $("panel").style.display = "none";
  paused = false;
  mode = "battle";
  cur = f0;
  document.body.classList.remove("exp");
  jend();
  saved.copy(W.position);
  const wp = W.position.clone(),
    wr = W.rotation.y;
  camFrom.copy(C.position);
  lookFrom.set(wp.x, 2.2, wp.z);
  camK = 0;
  BG.position.set(fr.x, 0, fr.z);
  BG.rotation.y = fr.r;
  BG.updateMatrixWorld(true);
  FXP = BG;
  SFXO = null; // v20: drop any street-battle replay still playing
  BG.add(W);
  {
    const lp = BG.worldToLocal(wp.clone());
    W.position.set(lp.x, 0, lp.z);
  }
  W.rotation.y = wr - fr.r;
  S.updateMatrixWorld();
  camBlkInit(fr.x, fr.z); // v18: walls and gates the battle camera must stay in front of
  RW.position.set(SLA[0][0], 0.1, SLA[0][1]);
  RW.visible = RT.visible = RG.visible = PG.visible = true;
  size();
  // hide houses between the camera and the fight, and other street foes standing in it
  g.hid = [];
  CV.set(0, BH, BD);
  BG.localToWorld(CV);
  const sx = CV.x - fr.x,
    sz = CV.z - fr.z,
    sl = sx * sx + sz * sz;
  // v9: anything tall inside the wedge the battle camera can swing through (drag lets it turn about 60 degrees each way)
  // is cleared too: trees, pines, spires and giant mushrooms as well as houses, so nothing blocks the fight
  occClearCam();
  const inWedge = (x, z, r) => {
    BTV.set(x, 0, z);
    BG.worldToLocal(BTV);
    const lx = BTV.x,
      lz = BTV.z;
    return (
      Math.hypot(lx, lz) < 9.5 + r || (lz > -3 && lz < BD * 1.6 + 8 && Math.abs(lx) < 8 + Math.max(0, lz) * 1.25 + r)
    );
  };
  HOUSES.forEach((h) => {
    const t = Math.max(0, Math.min(1, ((h.x - fr.x) * sx + (h.z - fr.z) * sz) / sl));
    const lx2 = h.x - fr.x,
      lz2 = h.z - fr.z,
      fwd = (lx2 * sx + lz2 * sz) / Math.sqrt(sl);
    if (
      (Math.hypot(lx2 - sx * t, lz2 - sz * t) < 6.2 + 2.5 * ((h.s || 1) - 1) ||
        (Math.hypot(lx2, lz2) < 10.5 + 2.5 * ((h.s || 1) - 1) && fwd > -2) ||
        inWedge(h.x, h.z, 3)) &&
      h.o.visible
    ) {
      h.o.visible = false;
      g.hid.push(h.o);
    }
  });
  OCC.forEach((o) => {
    if (Math.abs(o.x - fr.x) > 70 || Math.abs(o.z - fr.z) > 70) return;
    if (inWedge(o.x, o.z, o.r)) {
      o.hb = 1;
      occSet(o);
    }
  });
  // foes standing right in the battle area step aside (hidden) and may walk in later; the rest keep patrolling and can wander in
  foes.forEach((f) => {
    f.ring.visible = false;
    f.wait = f.hold = f.hidq = 0;
    const inF = G.list.includes(f);
    if (f.o.visible && (inF || Math.hypot(f.o.position.x - fr.x, f.o.position.z - fr.z) < 7.5)) {
      f.o.visible = false;
      g.hid.push(f.o);
      if (!inF && !f.boss && !f.dead) f.hidq = 1;
    }
  });
  Object.assign(g, {
    party: G.list,
    cap: G.cap,
    rein: G.rein,
    adds: 0,
    boss: !!f0.boss,
    nf: G.sp.length,
    hm: [1, 0.75, 0.62, 0.55][G.sp.length - 1],
    dm: f0.boss ? 1 : [1, 0.72, 0.6, 0.52][G.sp.length - 1],
    bossHp: G.bossHp || (f0.t === 5 ? 520 : 340),
    // v21: the least a foe here can be (dungeons: the dungeon's level)
    zlv:
      f0.dun != null && DUN[f0.dun]
        ? DUN[f0.dun].lv
        : { frost: 3, ember: 4, marsh: 6, tower: 7 }[zoneAt(f0.hx, f0.hz)] || 0,
    foes: [],
    allies: [],
    hand: [],
    tgt: 0,
    turn: 0,
    bonus: 0,
    busy: true,
    intro: 1,
    lastEl: null,
    pst: { burn: 0, chill: 0, drain: 0 },
    en: (P.pc || 0) + (P.bless ? 2 : 0) + (gst().pip || 0),
  });
  P.bless = 0;
  // v11 party: you are hero 1 on pad 1; others join through heroJoin (bots in dev mode now, networked players later)
  Object.assign(g, {
    heroes: [localHero()],
    id: P.id + ":" + Date.now().toString(36),
    sanct: 0,
    taunt: null,
    thorns: 0,
    bond: 0,
    focus: 0,
    aoeCast: 0,
    actor: null,
    lowR: 1,
    cs: { n: 0 }, // v20 school signature meter (Heat / Static / Petals)
    wild: 0,
    combo: 0,
    prac: f0.prac ? 1 : 0, // v18 Primer practice fight: you can't be knocked out
  });
  if (!f0.prac) NET.send("battle", { b: g.id, x: +fr.x.toFixed(1), z: +fr.z.toFixed(1), open: 3, boss: !!f0.boss });
  G.sp.forEach((sp, i) => newFoe(sp, i));
  if (NPCJOIN && DEV.on && DEV.bots && !f0.prac) addBots(Math.min(3, DEV.bots)); // v18: never in the practice fight
  const ins = g.foes.map((f, i) => {
    const src = G.list[i],
      to = f.m.position.clone(),
      s1 = f.m.scale.x,
      r1 = f.m.rotation.y;
    let from,
      s0 = s1;
    if (src) {
      from = BG.worldToLocal(src.o.position.clone());
      from.y = 0;
      s0 = src.o.scale.x;
    } else from = new T.Vector3(13 + i * 1.6, 0, to.z + (Math.random() - 0.5) * 3);
    f.m.position.copy(from);
    f.m.scale.setScalar(s0);
    f.run = 1;
    return { f, from, to, s0, s1, r1, ra: Math.atan2(to.x - from.x, to.z - from.z) };
  });
  // v13: companions no longer jog in on their own; they wait as Companion cards in your hand (see draw())
  const cm = [],
    al = cm
      .map((k) => {
        const sl = freeSlot();
        if (sl < 0) return null;
        const s = addAlly(k, sl),
          to = s.m.position.clone();
        s.act = 1;
        const from = new T.Vector3(to.x - 9, to.y, to.z);
        s.m.position.copy(from);
        return { s, from, to };
      })
      .filter(Boolean);
  $("log").textContent =
    (g.foes.length > 1 ? g.foes.length + " foes attack!" : "A " + g.foes[0].label + " attacks!") +
    (cm.length ? " Companions rally: " + cm.map((k) => ALLY[k].n).join(", ") + "." : "");
  ui();
  const w0 = W.position.clone(),
    w1 = new T.Vector3(SLA[0][0], 0, SLA[0][1]),
    wr0 = W.rotation.y,
    wra = Math.atan2(w1.x - w0.x, w1.z - w0.z),
    far = w0.distanceTo(w1) > 0.4;
  ring(0, 0xff8a3d, 7, 700, 0);
  await tw(700, (k) => {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    W.position.lerpVectors(w0, w1, e);
    W.rotation.y =
      far && k < 0.75 ? angTo(wr0, wra, Math.min(1, k * 4)) : angTo(far ? wra : wr0, 0.9, Math.max(0, (k - 0.6) / 0.4));
    ins.forEach((q) => {
      q.f.m.position.lerpVectors(q.from, q.to, e);
      q.f.m.scale.setScalar(q.s0 + (q.s1 - q.s0) * e);
      q.f.m.rotation.y = k < 0.75 ? angTo(q.f.m.rotation.y, q.ra, 0.3) : angTo(q.ra, q.r1, (k - 0.75) / 0.25);
    });
    al.forEach((q) => q.s.m.position.lerpVectors(q.from, q.to, e));
  });
  ins.forEach((q) => {
    q.f.m.position.copy(q.to);
    q.f.m.rotation.y = q.r1;
    q.f.run = 0;
  });
  al.forEach((q) => (q.s.act = 0));
  W.rotation.y = 0.9;
  g.intro = 0;
  if (mode !== "battle") return;
  turn();
}
// stay = remain where the fight happened (after a win); otherwise go back to the spot saved when it began (flee)
function leave(stay) {
  netBend(!!stay);
  mode = "explore";
  FXP = S;
  const wp = new T.Vector3();
  W.getWorldPosition(wp);
  const wr = W.rotation.y + BG.rotation.y;
  S.add(W);
  if (stay && okp(wp.x, wp.z)) W.position.set(wp.x, 0, wp.z);
  else W.position.copy(saved);
  W.position.y = 0;
  W.rotation.y = wr;
  W.rotation.x = 0;
  RW.visible = RT.visible = RG.visible = PG.visible = false;
  (g.hid || []).forEach((o) => (o.visible = true));
  g.hid = [];
  OCCH.forEach((o) => {
    if (o.hb) {
      o.hb = 0;
      occSet(o);
    }
  });
  foes.forEach((f) => {
    f.wait = f.hold = f.hidq = 0;
  });
  if (g.foes) clearAll();
  document.body.classList.add("exp");
  snap = false;
  camK = 1;
  g.busy = false;
  g.intro = 0;
  grace = performance.now() + 2500;
  ui();
  size();
  // v18: leaving the Primer's practice fight (won or fled) takes you out of the Vault, back where you started
  if (g.prac) {
    g.prac = 0;
    if (typeof pracEnd === "function") pracEnd();
  }
}
$("flee").onclick = flee;
$("end").onclick = endTurn;
$("spd").onclick = () => setSpd(SPD === 1 ? 2 : 1);
// v9: dev "win now" (button in the battle bar, or K)
function devWin() {
  if (!DEV.on || mode !== "battle" || !g || g.busy || g.intro) return;
  g.busy = true;
  ui();
  alive().forEach((f) => {
    f.hp = 0;
    f.hq = 1;
  });
  resolve().then(() => {
    if (mode === "battle") win();
  });
}
$("dwin").onclick = devWin;
// v9: fullscreen (button above the Bag, Book > Options, or F while exploring)
const fsOK = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled),
  fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFS() {
  const d = document,
    e = d.documentElement;
  try {
    const r = fsOn()
      ? (d.exitFullscreen || d.webkitExitFullscreen).call(d)
      : (e.requestFullscreen || e.webkitRequestFullscreen).call(e);
    if (r && r.catch) r.catch(() => toast("Fullscreen was blocked by the browser"));
  } catch (err) {
    toast("Fullscreen is not available here");
  }
}
["fullscreenchange", "webkitfullscreenchange"].forEach((ev) =>
  document.addEventListener(ev, () => {
    document.body.classList.toggle("fs", fsOn());
    setTimeout(size, 60);
  }),
);
$("fsb").onclick = (e) => {
  e.stopPropagation();
  toggleFS();
};
if (!fsOK()) $("fsb").style.display = "none";
addEventListener("keydown", (e) => {
  if ((e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) || e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === "f" && mode === "explore" && !paused && $("chars").style.display === "none") {
    toggleFS();
    return;
  }
  if (!DEV.on) return;
  if (k === "k" && mode === "battle") devWin();
  else if (
    k === "`" &&
    mode === "explore" &&
    $("chars").style.display === "none" &&
    $("cls").style.display !== "flex" &&
    !$("cust")
  ) {
    if ($("panel").style.display === "flex") $("pc").click();
    panel("book", "dev");
  } else if (k === "n" && mode === "explore") {
    DEV.nc = DEV.nc ? 0 : 1;
    devSv();
    toast("DEV: noclip " + (DEV.nc ? "on" : "off"), "#d08aff");
  }
});
// ===================== v13 WALK-IN BATTLES (multiplayer) =====================
// The player who starts a fight runs it (the host). While it lasts the host sends a 'bstate' snapshot a few times a
// second. Anyone exploring who walks onto that battlefield joins it as a guest (mode "guest"): they send 'bjoin', the
// host puts them on a free pad (heroJoin), and the guest's screen mirrors the host's foes and party. Guests play cards
// from their own hand any time during the round ('act', resolved by the host when the round plays out) and finish
// with End turn ('end'); the host waits for them. 'bend' closes it for everyone; winners share the spoils.
// a battle counts as over if no snapshot came for BSTALE ms (a host in a background window only sends every ~2 s)
const BSTALE = 10000;
const OPENB = new Map(); // battle id -> { host, s: last snapshot, t: when it arrived, skip }
let GUEST = null, // the battle you are a guest in
  bstT = 0;
const escH = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
// host: snapshot of the fight for everyone else
function netBattle(dt) {
  if (!NET.online || mode !== "battle" || !g.id || !g.foes || g.prac) return; // v18: the practice fight is solo
  if ((bstT -= dt) > 0) return;
  bstT = g.busy && !g.wait ? 0.1 : 0.3; // v17: faster while things move, so guests see lunges and walk-ins smoothly
  NET.send("bstate", {
    b: g.id,
    tt: (!g.busy || g.wait) && !g.intro ? +(g.tt || 0).toFixed(1) : -1, // v17: shared round clock (-1 = playing out)
    x: +BG.position.x.toFixed(2),
    z: +BG.position.z.toFixed(2),
    r: +BG.rotation.y.toFixed(3),
    turn: g.turn,
    log: String($("log").textContent || "").slice(0, 160),
    open: (g.heroes || []).length < 4 && !g.intro,
    fi: (g.party || []).map((f) => foes.indexOf(f)).filter((i) => i >= 0), // street foes this fight holds
    foes: g.foes.map((f) => ({
      kind: f.kind,
      mt: f.mt || f.t,
      lv: foeLv(f),
      big: f.big ? 1 : 0,
      hc: f.hc,
      hp: Math.max(0, Math.round(f.hp)),
      max: f.max,
      label: f.label,
      x: +f.m.position.x.toFixed(2),
      z: +f.m.position.z.toFixed(2),
      ry: +f.m.rotation.y.toFixed(2),
      s: +f.m.scale.x.toFixed(2),
      db: f.dboss ? f.di : undefined, // v14: a dungeon boss, so guests get the clear too
      wt: weakTxt(f) || undefined, // v23: weakness line for the guest's foe list
      wl: f.wl || undefined, // v23: last hit's WEAK!/RESIST label
      mn: f.mvn || undefined, // v24: the move it is about to use (24-foemoves.js)
      nx: f.itx || undefined, // v24: its short intent text
    })),
    heroes: (g.heroes || []).map((h) => ({
      id: h.id,
      name: h.name,
      role: h.role,
      hp: Math.max(0, Math.round(h.hp)),
      max: h.max,
      down: h.down ? 1 : 0,
      slot: h.slot,
      rd: heroReady(h) ? 1 : 0, // v15: has ended their turn this round
    })),
    // v18: summons and companions on the pads, so everyone in (or watching) the fight sees them, not just the host
    al: (g.allies || []).map((u) => ({ t: u.t, slot: u.slot, hp: Math.max(0, Math.round(u.hp)) })),
  });
}
// ---- shared street foes ----
// world owner: a few times a second, where every foe near any player is, and which foes are dead
let fwT = 0;
function netFoes(dt) {
  if (!NET.online || !netOwner()) return;
  if (mode !== "explore") ownerFoeTick(dt); // your walk() isn't running, but the world still has to move
  if ((fwT -= dt) > 0) return;
  fwT = 0.25;
  const pts = [W.getWorldPosition(new T.Vector3())];
  PEERS.forEach((p) => pts.push(p.o.position));
  const a = [],
    d = [];
  foes.forEach((f, i) => {
    if (f.dead) return d.push(i);
    const q = f.o.position;
    if (!pts.some((p) => Math.abs(p.x - q.x) < 90 && Math.abs(p.z - q.z) < 90)) return;
    a.push(i, Math.round(q.x * 10), Math.round(q.z * 10), Math.round(f.o.rotation.y * 100));
  });
  NET.send("fw", { a, d });
}
function ownerFoeTick(dt) {
  for (const f of foes) if (!f.dead && !foeHeld(f) && f.o.visible) patrol(f, dt);
}
// a foe standing in someone else's battle (their 'bstate' lists it) is hidden and still until that battle ends
function foeHeld(f) {
  const h = f.nbT && performance.now() - f.nbT < 1500;
  if (h && !f.nbH) {
    f.nbH = 1;
    f.o.visible = false;
    if (f.ring) f.ring.visible = false;
  } else if (!h && f.nbH) {
    f.nbH = 0;
    if (!f.dead) f.o.visible = true;
  }
  return !!h;
}
function netKill(f) {
  f.dead = 1;
  f.deadAt = performance.now();
  f.rt = netOwner() ? (f.tw || f.dun != null ? Infinity : performance.now() + 30000) : Infinity;
  S.remove(f.o);
  if (f.ring) f.ring.visible = false;
}
function netRevive(f) {
  if (mode === "battle" && g.party && g.party.includes(f)) return;
  if (f.edHid) return; // v46: removed in the world editor
  if (f.deadAt && performance.now() - f.deadAt < 3000) return; // the owner hasn't heard about that win yet
  f.dead = 0;
  f.pi = 0;
  f.o.position.set(f.nx != null ? f.nx : f.hx, 0, f.nz != null ? f.nz : f.hz);
  f.o.visible = true;
  S.add(f.o);
  f.cool = performance.now() + 2500;
  f.fade = 0;
  f.o.scale.setScalar(0.01);
}
// follower: glide to the owner's latest position for this foe
function netFoeMove(f, dt) {
  if (f.nt == null) return false;
  const q = f.o.position,
    dx = f.nx - q.x,
    dz = f.nz - q.z,
    dl = Math.hypot(dx, dz);
  if (dl > 12) {
    q.x = f.nx;
    q.z = f.nz;
  } else {
    const k = Math.min(1, dt * 6);
    q.x += dx * k;
    q.z += dz * k;
  }
  let df = f.nr - f.o.rotation.y;
  df = Math.atan2(Math.sin(df), Math.cos(df));
  f.o.rotation.y += df * Math.min(1, dt * 8);
  return dl > 0.05;
}
NET.on("fw", (m) => {
  if (!m || !Array.isArray(m.a) || !Array.isArray(m.d) || netOwner()) return;
  const dead = new Set(m.d);
  foes.forEach((f, i) => {
    const dd = dead.has(i);
    if (dd && !f.dead && !(mode === "battle" && g.party && g.party.includes(f))) netKill(f);
    else if (!dd && f.dead) netRevive(f);
  });
  const now = performance.now();
  for (let k = 0; k + 3 < m.a.length; k += 4) {
    const f = foes[m.a[k]];
    if (!f) continue;
    f.nx = m.a[k + 1] / 10;
    f.nz = m.a[k + 2] / 10;
    f.nr = m.a[k + 3] / 100;
    f.nt = now;
  }
});
// whoever wins a fight tells everyone which street foes fell
NET.on("fdead", (m) => {
  if (!m || !Array.isArray(m.i)) return;
  m.i.forEach((i) => {
    const f = foes[i];
    if (f && !f.dead) netKill(f);
  });
});
function netBend(win) {
  if (g && g.id) NET.send("bend", { b: g.id, win: !!win });
  if (g) g.id = null;
}
// host: a guest left (or disconnected) mid-fight
function heroDrop(id) {
  if (mode !== "battle" || !g.heroes) return;
  const h = g.heroes.find((x) => x.id === id && x.remote);
  if (!h) return;
  h.left = 1;
  if (h.m.parent) h.m.parent.remove(h.m);
  undeco(h);
  g.heroes = g.heroes.filter((x) => x !== h);
  $("log").textContent = h.name + " leaves the battle.";
  ui();
}
NET.on("bleave", (d, from) => {
  if (g && d && d.b === g.id) heroDrop(from);
});
NET.on("bye", (d, from) => heroDrop(from));
NET.on("bstate", (s, from) => {
  if (!s || !s.b || !Array.isArray(s.foes) || !Array.isArray(s.heroes)) return;
  const o = OPENB.get(s.b) || {};
  o.host = from;
  o.s = s;
  o.t = performance.now();
  OPENB.set(s.b, o);
  (Array.isArray(s.fi) ? s.fi : []).forEach((i) => foes[i] && (foes[i].nbT = o.t));
  if (mode === "guest" && GUEST && GUEST.b === s.b) guestState(s);
  else ghostSync(o);
});
NET.on("bend", (d) => {
  if (!d) return;
  if (OPENB.get(d.b)) ghostDrop(OPENB.get(d.b));
  OPENB.delete(d.b);
  if (mode === "guest" && GUEST && GUEST.b === d.b)
    guestExit(d.win, d.win ? "Victory! The party shares the spoils." : "");
});
// every frame: walk onto an open battlefield to join it; while a guest, run the battle camera
function guestTick() {
  if (!NET.online) return;
  const now = performance.now();
  for (const [b, o] of OPENB)
    if (now - o.t > BSTALE) {
      ghostDrop(o);
      OPENB.delete(b);
    }
  if (mode === "explore" && !paused && SLOT >= 0 && performance.now() > grace) {
    for (const [b, o] of OPENB) {
      if (o.skip || !o.s.open) continue;
      if (Math.hypot(W.position.x - o.s.x, W.position.z - o.s.z) < 8.5) {
        guestJoin(b, o);
        break;
      }
    }
  } else if (mode === "guest" && GUEST) {
    if (now - GUEST.t > BSTALE + 5000) return guestExit(false, "Lost touch with that battle.");
    if (GUEST.slot < 0 && now - GUEST.t0 > 5000) return guestExit(false, "That battle is full.");
    CV.set(Math.sin(bYaw) * BD * bZoom, BH * bZoom, Math.cos(bYaw) * BD * bZoom);
    CT.set(0, 1, 0);
    focApply(CV, CT); // v15: point at whoever a foe is about to hit
    BG.localToWorld(CV);
    BG.localToWorld(CT);
    C.position.lerp(CV, 0.15);
    LK.lerp(CT, 0.18);
    C.lookAt(LK);
  }
  guestAnim();
}
function guestHand() {
  return draw().filter((c) => !c.comp); // companions answer only to the host's battle code
}
function guestJoin(b, o) {
  const s = o.s,
    now = performance.now();
  GUEST = {
    b,
    host: o.host,
    s,
    t: now,
    t0: now,
    turn: s.turn,
    en: Math.min(5, 2 + (gst().pip || 0)),
    ended: 0,
    down: 0,
    tgt: 0,
    slot: -1,
    fm: [],
  };
  NET.send("bjoin", Object.assign({ b }, pubProfile()));
  ghostDrop(o); // you get the full view now
  saved.copy(W.position);
  mode = "guest";
  $("panel").style.display = "none";
  jend();
  document.body.classList.remove("exp");
  BG.position.set(s.x, 0, s.z);
  BG.rotation.y = s.r;
  BG.updateMatrixWorld(true);
  BG.add(W);
  FXP = BG; // v17: spell effects use battlefield coords here too (they used to land near the world origin)
  SFXO = null; // v20: drop any street-battle replay still playing
  W.position.set(SLA[1][0], 0, SLA[1][1]);
  W.rotation.set(0, 0.9, 0);
  RW.visible = RG.visible = PG.visible = true;
  RT.visible = false;
  RW.position.set(SLA[1][0], 0.1, SLA[1][1]);
  g.hand = guestHand();
  guestFoes(s);
  $("log").textContent = "You join the battle!";
  size();
  ui();
}
function guestFoes(s) {
  syncFoes(BG, GUEST.fm, s);
  syncAllies(BG, GUEST.am || (GUEST.am = []), s);
}
// v18: summon models for a snapshot's allies (al), kept in am (reused while the same summon holds the pad)
function syncAllies(par, am, s) {
  const al = (s.al || []).filter((a) => ALLY[a.t] && SLA[a.slot]);
  al.forEach((a, i) => {
    const A = ALLY[a.t];
    let m = am[i];
    if (!m || m.userData.ak !== a.t) {
      if (m) par.remove(m);
      m = sumMesh(A.mdl || a.t);
      if (A.sc && m.userData.body) m.userData.body.scale.setScalar(A.sc);
      m.userData.ak = a.t;
      par.add(m);
      am[i] = m;
    }
    const p = SLA[a.slot];
    m.position.x = p[0];
    m.position.z = p[1];
    m.userData.ay = A.y;
    m.visible = a.hp > 0;
  });
  for (let i = al.length; i < am.length; i++) if (am[i]) par.remove(am[i]);
  am.length = al.length;
}
// foe models for a snapshot, kept in fm (reused while the kind stays the same), parented to par
function syncFoes(par, fm, s) {
  s.foes.forEach((f, i) => {
    let m = fm[i];
    const k = f.kind + ":" + f.mt + ":" + f.big;
    if (!m || m.userData.fk !== k) {
      if (m) par.remove(m);
      m = mkFoe(f.kind, f.mt, f.big, f.hc);
      m.userData.fk = k;
      par.add(m);
      fm[i] = m;
    }
    // v15: new models start on their spot; after that guestAnim glides them to each snapshot's spot
    if (!m.userData.tp) {
      m.position.set(f.x, 0, f.z);
      m.rotation.y = f.ry;
    }
    m.userData.tp = { x: f.x, z: f.z, ry: f.ry };
    m.scale.setScalar(f.s);
    m.visible = f.hp > 0;
  });
  for (let i = s.foes.length; i < fm.length; i++) if (fm[i]) par.remove(fm[i]);
  fm.length = s.foes.length;
}
// someone else's battle seen from the street: its foes on their spots and a ring marking where to walk in to join
const GRING = new T.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.45, depthWrite: false }),
  GRINGF = new T.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.35, depthWrite: false });
function ghostSync(o) {
  const s = o.s;
  if (!o.grp) {
    o.grp = new T.Group();
    o.fm = [];
    o.ring = new T.Mesh(new T.RingGeometry(8.1, 8.5, 56), GRING);
    o.ring.rotation.x = -Math.PI / 2;
    o.ring.position.y = 0.12;
    o.grp.add(o.ring);
    // the same rune circle and pads you see in your own fights (copies share the originals' meshes)
    [RG, PG].forEach((src) => {
      const c = src.clone(true);
      c.visible = true;
      o.grp.add(c);
    });
    S.add(o.grp);
  }
  o.grp.position.set(s.x, 0, s.z);
  o.grp.rotation.y = s.r;
  o.ring.material = s.open ? GRING : GRINGF;
  syncFoes(o.grp, o.fm, s);
  // v20: spectators see hits land too (foes flinch and pop a number)
  const near = Math.hypot(W.position.x - s.x, W.position.z - s.z) < 70;
  s.foes.forEach((f, i) => {
    const pv = o.ph && o.ph[i],
      m = o.fm[i];
    if (near && pv && m && pv.k === f.kind && f.hp < pv.hp) {
      hit(m, 0x885533);
      inPar(o.grp, () => popNum(m.position, pv.hp - f.hp, "#ffd27a", f.wl, f.wl === "WEAK!", wkLc(f.wl)));
    }
  });
  o.ph = s.foes.map((f) => ({ hp: f.hp, k: f.kind }));
  syncAllies(o.grp, o.am || (o.am = []), s); // v18
}
function ghostDrop(o) {
  if (o && o.grp) S.remove(o.grp);
  if (o) o.grp = null;
}
function guestState(s) {
  const prev = GUEST.s;
  GUEST.s = s;
  GUEST.t = performance.now();
  GUEST.tt = typeof s.tt === "number" ? s.tt : -1;
  GUEST.ttAt = GUEST.t;
  // v17: show hits as they land on this screen too (foes and the other players flash and pop a number)
  if (prev && prev.foes)
    s.foes.forEach((f, i) => {
      const o = prev.foes[i],
        m = GUEST.fm[i];
      if (o && m && f.hp < o.hp && o.kind === f.kind) {
        popNum(m.position, o.hp - f.hp, "#ffd27a", f.wl, f.wl === "WEAK!", wkLc(f.wl));
        hit(m, 0x885533);
      }
    });
  if (prev && prev.heroes)
    s.heroes.forEach((h) => {
      const o = prev.heroes.find((x) => x.id === h.id),
        p = PEERS.get(h.id);
      if (!o || h.id === P.id || !p) return;
      const q = SLA[h.slot] || SLA[0];
      if (h.hp < o.hp) hit(p.o, 0xaa2222);
      else if (h.hp > o.hp) pillar(new T.Vector3(q[0], 0, q[1]), 0x9affc0, 0.8, 6, 600);
    });
  const me = s.heroes.find((h) => h.id === P.id);
  if (me) {
    if (me.slot !== GUEST.slot) {
      GUEST.slot = me.slot;
      const p = SLA[me.slot] || SLA[1];
      W.position.set(p[0], 0, p[1]);
      RW.position.set(p[0], 0.1, p[1]);
    }
    if (me.hp < g.hp) {
      popNum(W.position, g.hp - me.hp, "#ff9a8a");
      hit(W, 0xaa2222);
    }
    g.hp = me.hp;
    GUEST.down = me.down;
  }
  if (s.turn !== GUEST.turn) {
    GUEST.turn = s.turn;
    GUEST.ended = 0;
    GUEST.pend = [];
    GUEST.en = Math.min(5 + (P.focus || 0), GUEST.en + 2 + (P.cls === "gale" ? 1 : 0));
    g.hand = guestHand();
  }
  guestFoes(s);
  if (s.log) $("log").textContent = s.log;
  ui();
}
function guestUI() {
  const s = GUEST && GUEST.s;
  if (!s) return;
  const rl = (r) => ROLE[r] || ROLE.damage;
  $("aus").innerHTML =
    '<div class="side a">Your team</div>' +
    s.heroes
      .filter((h) => h.id !== P.id)
      .map(
        (h) =>
          '<div class="au"><span class="sl a">' +
          ((h.slot | 0) + 1) +
          '</span><div class="ub"><b>' +
          escH(h.name) +
          ' <span style="color:' +
          rl(h.role).col +
          ';font-size:11px">' +
          rl(h.role).tag +
          '</span></b><div class="bar"><i style="width:' +
          Math.max(0, (h.hp / (h.max || 1)) * 100) +
          '%"></i></div><div class="sub">' +
          (h.down ? "Knocked out" : (h.hp | 0) + "/" + (h.max | 0)) +
          (h.rd ? '  <span style="color:#7dff9a">✓ Ready</span>' : "  Choosing...") +
          "</div></div></div>",
      )
      .join("");
  if (!s.foes[GUEST.tgt] || s.foes[GUEST.tgt].hp <= 0)
    GUEST.tgt = Math.max(
      0,
      s.foes.findIndex((f) => f.hp > 0),
    );
  const E = $("eus");
  E.innerHTML = '<div class="side e">Foes</div>';
  s.foes.forEach((f, i) => {
    if (f.hp <= 0) return;
    const b = document.createElement("button");
    b.className = "fu" + (i === GUEST.tgt ? " tg" : "");
    b.innerHTML =
      '<span class="sl e">' +
      (i + 1) +
      '</span><span class="lvl ev"><span>' +
      (f.lv | 0) +
      '</span></span><div class="ub"><b>' +
      escH(f.label) +
      '</b><div class="bar"><i style="width:' +
      (f.hp / (f.max || 1)) * 100 +
      '%"></i></div><div class="sub">' +
      (f.hp | 0) +
      "/" +
      (f.max | 0) +
      (f.nx ? "  Next: " + escH((f.mn ? f.mn + " " : "") + f.nx) : "") + // v24
      (f.wt ? '<br><span style="color:#ffd27a">' + escH(String(f.wt).trim()) + "</span>" : "") +
      "</div></div>";
    b.onclick = () => {
      GUEST.tgt = i;
      ui();
    };
    E.appendChild(b);
  });
  $("en").innerHTML =
    'Pips <span class="pips">' +
    "◆".repeat(GUEST.en) +
    "◇".repeat(Math.max(0, 5 + (P.focus || 0) - GUEST.en)) +
    "</span>";
  $("end").disabled = !!GUEST.ended || !!GUEST.down;
  $("flee").disabled = false;
  $("flee").textContent = "Leave battle";
  const h = $("hand");
  h.innerHTML = "";
  g.hand.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "card " + c.ty;
    b.style.borderColor = ELC[c.a];
    b.innerHTML =
      '<span class="ty">' +
      ({ sum: "✦ SUMMON", sup: "✚ SPELL" }[c.ty] || "⚔ ATTACK") +
      '</span><span class="k">' +
      (i + 1) +
      '</span><span class="c">' +
      cc(c) +
      '</span><img class="art" alt="" src="' +
      ART[c.art || c.k] +
      '"><h3>' +
      c.n +
      "</h3><small>" +
      c.t +
      "</small>" +
      cardRangeH(c);
    b.disabled = !!GUEST.ended || !!GUEST.down || GUEST.en < cc(c) || !!GUEST.qb;
    b.onclick = () => play(i);
    h.appendChild(b);
  });
}
async function guestPlay(i) {
  const c = g.hand[i];
  if (!GUEST || !c || GUEST.ended || GUEST.down || GUEST.qb || GUEST.en < cc(c)) return;
  GUEST.en -= cc(c);
  g.hand.splice(i, 1);
  P.casts++;
  banner(c.n, c.ty);
  castT = 0.6;
  castGlyph(c.a);
  // v31: attacks are only readied now. Once everyone has ended their turn the host cues each one ('cue') and you charge
  // it up and take the timed hit then, with everyone watching (ct = "time it when cued").
  if (c.ty === "atk") (GUEST.pend || (GUEST.pend = [])).push(c);
  NET.send("act", { b: GUEST.b, k: c.k, tgt: GUEST.tgt, ct: c.ty === "atk" ? 1 : 0 });
  $("log").textContent =
    "Readied " +
    c.n +
    "." +
    (c.ty === "atk"
      ? " You charge it up when the round plays out."
      : " It plays out once everyone has ended their turn.");
  ui();
  qchk();
  if (GUEST.endQ) guestEnd();
}
function guestEnd() {
  if (!GUEST || GUEST.ended) return;
  if (GUEST.qb) {
    GUEST.endQ = 1; // finish the timed hit first, then end
    return;
  }
  GUEST.endQ = 0;
  GUEST.ended = 1;
  NET.send("act", { b: GUEST.b, k: "end" });
  $("log").textContent = "Turn ended. Waiting for the round to play out...";
  ui();
}
function guestLeave() {
  if (!GUEST) return;
  NET.send("bleave", { b: GUEST.b });
  guestExit(false, "You leave the battle.");
}
function guestExit(win, msg) {
  if (!GUEST) return;
  const s = GUEST.s,
    o = OPENB.get(GUEST.b);
  if (o) o.skip = 1; // don't walk straight back into it
  GUEST.fm.forEach((m) => m && BG.remove(m));
  (GUEST.am || []).forEach((m) => m && BG.remove(m)); // v18 the host's allies
  GUEST = null;
  mode = "explore";
  FXP = S;
  S.add(W);
  W.position.copy(saved);
  W.position.y = 0;
  W.rotation.x = 0;
  RW.visible = RT.visible = RG.visible = PG.visible = false;
  document.body.classList.add("exp");
  g.hand = [];
  g.hp = Math.max(1, g.hp);
  if (win && s) {
    let xx = 0,
      gx = 0;
    s.foes.forEach((f) => {
      xx += xpFor(f.lv | 0);
      gx += 4 + 5 * (f.lv | 0);
    });
    P.kills += s.foes.length;
    P.wins = (P.wins || 0) + 1; // v21
    s.foes.forEach((f) => bestRec(f.label));
    streetWin(s.x, s.z, s.foes.length); // v15 street quests
    P.xp += xx;
    P.gold += gx;
    s.foes.forEach((f) => f.db != null && DUN[f.db] && dunWin(f.db));
    toast("+" + xx + " XP  +" + gx + " ✦");
    lvup();
    qchk();
    sv();
  }
  if (msg) toast(msg);
  snap = true;
  grace = performance.now() + 2500;
  size();
  ui();
}
// ===================== v15 SHARED ROUNDS, BLOCKS AND TARGET CAMERA (multiplayer) =====================
// With another player in a fight, cards are readied and nothing lands until everyone has pressed End turn (play/endTurn).
// When a foe attacks, the host sends 'fatk' (who it targets); every screen points the camera at the target (or pulls back
// wide for a hit on everyone) and shows a red ring and banner. The targeted player gets the block ring on their own
// screen and answers with 'qr' (0 miss, 1 block, 2 parry); the host waits up to 4.5 s for it. 'bfx' lets guests see the
// spells the host and other heroes cast.
const coopB = () => mode === "battle" && !!g.heroes && g.heroes.some((h) => h.remote && !h.left);
function heroReady(h) {
  if (h.local) return !!g.ended;
  if (h.remote) return h.q.some((a) => a.k === "end");
  return true;
}
// v20: sent for every cast while online (not only with a guest in the fight), so people watching from the street see
// it too. k = the spell (its real animation is replayed), gr = the caster's timed-hit grade (-1 = none).
function bfxSend(hs, el, tg, heal, id, k, gr) {
  if (!NET.online || !g || !g.id || g.prac) return;
  NET.send("bfx", { b: g.id, hs, el, tg, heal: heal ? 1 : 0, id: id || "", k: k || "", gr: gr == null ? -1 : gr });
}
let QN = 0;
const QWAIT = new Map();
function fatkSend(f, tid, all, n) {
  if (!NET.online || !g.id || !coopB()) return;
  NET.send("fatk", { b: g.id, fi: g.foes.indexOf(f), tid, all: all ? 1 : 0, n, lb: f.label });
}
function remoteBlock(h, n) {
  return new Promise((res) => {
    const k = n + ":" + h.id,
      t = setTimeout(() => {
        QWAIT.delete(k);
        res(0);
      }, 4500);
    QWAIT.set(k, (gr) => {
      clearTimeout(t);
      QWAIT.delete(k);
      res(gr === 2 ? 2 : gr === 1 ? 1 : 0);
    });
  });
}
NET.on("qr", (d, from) => {
  const cb = d && g && d.b === g.id && QWAIT.get(d.n + ":" + from);
  if (cb) cb(d.gr | 0);
});
// camera focus on whoever a foe is about to hit (positions are battlefield-local). focApply bends the battle camera.
let BFOC = null,
  focEnd = 0;
function focSet(p, fp, wide, txt) {
  const now = performance.now();
  BFOC = { p: p && !wide ? p.clone() : null, f: fp.clone(), wide: !!wide, until: now + 1900 };
  if (wide) ring(0, 0xff5a4a, 9, 700, 0);
  else if (p) {
    ring(p.x, 0xff4a4a, 2.6, 900, p.z);
    pillar(p.clone().setY(0), 0xff5a4a, 0.9, 6, 900);
  }
  if (txt) {
    banner("⚠ " + txt, "atk");
    $("log").textContent = txt;
  }
}
function focApply(CV, CT) {
  if (!BFOC) return false;
  if (performance.now() > BFOC.until) {
    BFOC = null;
    focEnd = performance.now() + 900;
    return false;
  }
  const f = BFOC.f,
    p = BFOC.p;
  if (!p) {
    // the whole party: pull back and up so everyone is in view
    CV.set(Math.sin(bYaw) * BD * 1.3, BH * 1.5, Math.cos(bYaw) * BD * 1.3);
    CT.set(0, 0.6, 0);
  } else {
    // over the target's shoulder, looking at the foe coming for them
    const dx = p.x - f.x,
      dz = p.z - f.z,
      l = Math.hypot(dx, dz) || 1;
    CV.set(p.x + (dx / l) * 5.4 - (dz / l) * 1.8, 3.4, p.z + (dz / l) * 5.4 + (dx / l) * 1.8);
    CT.set(p.x + (f.x - p.x) * 0.35, 1.3, p.z + (f.z - p.z) * 0.35);
  }
  return true;
}
const focOn = () => !!BFOC || performance.now() < focEnd;
// v18: the focus shots swing the camera outside the wedge fight() clears, into town walls and gate arches. At the start
// of each fight the solid pieces near it are listed once (g.cbk); every frame the camera is pulled in front of the
// first one between it and what it looks at. Ground layers, glows, the battlefield and the wizard are left out.
const CBRC = new T.Raycaster(),
  CBV = new T.Vector3(),
  CBS = new T.Sphere();
function camBlkInit(cx, cz) {
  const L = [];
  S.traverse((m) => {
    if (!m.isMesh || m.isInstancedMesh || !m.geometry || m.userData.ol) return;
    const mt = m.material;
    if (!mt || mt.transparent || mt.blending === T.AdditiveBlending) return;
    for (let p = m; p; p = p.parent) if (p === BG || p === W) return;
    if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    CBS.copy(m.geometry.boundingSphere).applyMatrix4(m.matrixWorld);
    if (CBS.radius < 0.6 || Math.hypot(CBS.center.x - cx, CBS.center.z - cz) > 46 + CBS.radius) return;
    const bb = m.geometry.boundingBox;
    if ((bb.max.y - bb.min.y) * m.matrixWorld.getMaxScaleOnAxis() < 1.2) return; // floors, roads, rugs
    m.userData.cbTop = bb.max.y * m.matrixWorld.getMaxScaleOnAxis() + m.matrixWorld.elements[13]; // v28: about how high it reaches
    L.push(m);
  });
  g.cbk = L;
  g.cbr = 1; // v28: eased clip distance (camClip)
  g.cbt = 0;
}
function camClip(CV, CT) {
  const L = g.cbk;
  if (!L || !L.length) return;
  CBV.subVectors(CV, CT);
  const len = CBV.length();
  if (len < 1) return;
  CBV.divideScalar(len);
  CBRC.set(CT, CBV);
  CBRC.far = len;
  let best = len;
  for (const m of L) {
    let on = true;
    for (let p = m; p && on; p = p.parent) on = p.visible;
    if (!on) continue;
    const h = CBRC.intersectObject(m, false);
    // v28: only hits that truly block count: low props (fences, crates, rocks, roots, under 2.4 high) and the far side of
    // something the camera already sits behind are skipped, so the camera no longer catches on every small thing
    for (const x of h) {
      if (x.distance >= best) break;
      if (x.point.y < 1.2 || (m.userData.cbTop || 9) < 2.4) continue;
      if (x.face && x.face.normal) {
        CBS.center.copy(x.face.normal).transformDirection(m.matrixWorld);
        if (CBS.center.dot(CBV) > 0.05) continue; // a back face: the ray is leaving the mesh, not entering it
      }
      best = x.distance;
      break;
    }
  }
  // v28: ease toward the clipped distance instead of snapping: in quickly, back out slowly, so a post or branch
  // sweeping past while you drag the view no longer jerks the camera in and out
  const now = performance.now(),
    dt = Math.min(0.1, Math.max(0, (now - (g.cbt || now)) / 1000)),
    want = best < len ? Math.max(1.5, best - 0.7) / len : 1;
  g.cbt = now;
  let r = g.cbr == null ? 1 : g.cbr;
  r += (want - r) * Math.min(1, dt * (want < r ? 12 : 2.5));
  if (want < r && r - want > 0.35) r = want + 0.35; // never lag far inside a wall
  g.cbr = r;
  if (r < 0.999) CV.copy(CT).addScaledVector(CBV, len * r);
}
// guest: a foe is attacking someone in this battle
NET.on("fatk", async (d) => {
  if (!d || mode !== "guest" || !GUEST || d.b !== GUEST.b) return;
  const s = GUEST.s,
    fm = GUEST.fm[d.fi],
    fp = fm ? fm.position : new T.Vector3(0, 0, -6);
  let p = null,
    who = "everyone";
  if (!d.all) {
    if (d.tid === P.id) {
      p = W.position;
      who = "you";
    } else {
      const h = s && s.heroes.find((x) => x.id === d.tid);
      if (h) {
        const q = SLA[h.slot] || SLA[0];
        p = new T.Vector3(q[0], 0, q[1]);
        who = h.name;
      }
    }
    if (!p) return; // it is going for a summon
  }
  focSet(p, fp, d.all, "The " + (d.lb || "foe") + " targets " + escH(who) + "!");
  if (d.all ? !GUEST.down : d.tid === P.id) {
    await wait(300);
    const gr = await blockQ({ m: fm || new T.Object3D() });
    if (gr) P.blocks = (P.blocks || 0) + 1;
    NET.send("qr", { b: d.b, n: d.n, gr });
  }
});
// ===================== v31 SHARED CHARGE-UPS =====================
// Rounds go: everyone readies cards and ends their turn, then the round plays out and each attack is charged up in
// turn, on every screen. The host cues a guest's attack ('cue'); that guest charges it and takes the timed hit, and
// answers with 'qr' (n = "c<number>"). 'chg' / 'chgx' tell everyone else to show / release a charge on that wizard.
NET.on("cue", async (d) => {
  if (!d || mode !== "guest" || !GUEST || d.b !== GUEST.b || d.to !== P.id) return;
  const pd = GUEST.pend || [],
    i = pd.findIndex((c) => c.k === d.k),
    c = i >= 0 ? pd.splice(i, 1)[0] : Object.assign({ k: d.k }, SPL[d.k] || {});
  if (!c.n) return NET.send("qr", { b: d.b, n: d.n, gr: 1 });
  for (let w = 0; QT && w < 20; w++) await wait(100); // a block ring still up: let it finish
  if (!GUEST) return;
  banner(c.n, "atk");
  $("log").textContent = "Your turn to charge " + c.n + "!";
  castT = 0.6;
  castGlyph(c.a);
  const m = !c.aoe && GUEST.fm[d.tgt],
    gr = P.noqt ? 1 : await qte("atk", m && m.visible !== false ? m : W, c);
  if (gr === 2) P.perf = (P.perf || 0) + 1;
  NET.send("qr", { b: d.b, n: d.n, gr });
});
NET.on("chg", (d) => {
  if (!d || mode !== "guest" || !GUEST || d.b !== GUEST.b || d.id === P.id || typeof CHG === "undefined") return;
  const p = PEERS.get(d.id);
  if (!p || !p.o) return;
  const h = GUEST.s && GUEST.s.heroes.find((x) => x.id === d.id);
  if (h) $("log").textContent = escH(h.name) + " is charging " + ((SPL[d.k] || {}).n || "a spell") + "...";
  try {
    CHG.start(Object.assign({ k: d.k }, SPL[d.k] || {}), {
      obj: p.o,
      el: d.el,
      auto: 1,
      id: d.id,
      hold: () => (p.cT = 0.3),
    });
  } catch (e) {}
});
NET.on("chgx", (d) => {
  if (!d || mode !== "guest" || !GUEST || d.b !== GUEST.b || d.id === P.id || typeof CHG === "undefined") return;
  const h = CHG.cur();
  if (h && h.id === d.id) CHG.stop(h, d.gr | 0);
});
// ===================== v20 SPELL REPLAYS (guests and street spectators) =====================
// A 'bfx' replays the caster's real spell animation: on a guest's screen in the battle frame, and for anyone exploring
// near someone else's fight on that ghost battlefield (FXP is pointed at its group for the replay, so the battlefield
// coords line up). Replays queue one after another (SFXO is one global) and drop when too many pile up.
const SFXK = {
  ember: (f) => SFX.ember(f),
  meteor: (f) => SFX.meteor(f),
  wave: () => SFX.wave(),
  inferno: () => SFX.inferno(),
  sunbrand: (f) => SFX.sunbrand(f),
  shard: (f) => SFX.lance(f, 0),
  lance: (f) => SFX.lance(f, 1),
  nova: () => SFX.nova(),
  blizzard: () => SFX.blizzard(),
  zero: (f) => SFX.zero(f),
  spark: (f) => SFX.spark(f),
  thunder: (f) => SFX.thunder(f),
  chain: (f, L) => SFX.chain(L),
  tempest: () => SFX.tempest(),
  skyfall: (f) => SFX.skyfall(f),
  lampfall: () => SFX.lampfall(),
  thorn: (f) => SFX.thorn(f),
  briar: (f) => SFX.briar(f),
  bloom: () => SFX.bloom(),
  shade: (f) => SFX.shade(f),
  haunt: (f) => SFX.haunt(f),
  wail: () => SFX.wail(),
  pierce: (f, L, e) => SFX.pierce(f, e),
  execute: (f, L, e) => SFX.execute(f, e),
  scatter: (f, L, e) => SFX.scatter(e),
  cascade: (f, L, e) => SFX.cascade(e),
  starfall: (f, L, e) => SFX.starfall(e),
};
// play spell k as cast by someone else. o = { src (their lantern), src0 (their feet), L (foes hit), me, quiet, par }.
// Returns false when k has no animation of its own (the caller draws a plain bolt instead).
async function sfxAs(o, k, el) {
  const run = SFXK[k];
  if (!run || !o.L || !o.L.length) return false;
  const prev = FXP,
    s0 = SFXO;
  if (o.par) FXP = o.par;
  SFXO = o;
  try {
    await run(o.L[0], o.L, SP[el] ? el : "fire");
  } catch (e) {
    console.warn("spell replay", k, e);
  } finally {
    if (SFXO === o) SFXO = s0;
    if (o.par && FXP === o.par) FXP = prev;
  }
  return true;
}
// a stand-in foe for a replay: the guest / ghost model plus what the spell effects read
const fakeFoe = (m, s) =>
  m && m.visible !== false ? { m, st: {}, kind: s ? s.kind : "", label: s ? s.label : "foe", hp: 1, max: 1 } : null;
// add effects to a given parent for one synchronous call
function inPar(par, fn) {
  const prev = FXP;
  FXP = par;
  try {
    return fn();
  } finally {
    FXP = prev;
  }
}
let RSQ = Promise.resolve(),
  RSN = 0;
function rshowQ(fn) {
  if (RSN > 3) return;
  RSN++;
  RSQ = RSQ.then(fn)
    .catch((e) => console.warn(e))
    .then(() => RSN--);
}
// a plain bolt to each foe (spells with no animation of their own)
function plainBolts(a, ms, el, col) {
  const par = FXP;
  ms.forEach((m) => {
    const o = new T.Sprite(AM(SP[el])),
      b = m.position.clone().setY(1.6);
    o.scale.setScalar(1.5);
    shoot(o, a, b, 420, 1.4).then(() =>
      inPar(par, () => {
        puff(b, el, 10, 3, 0.5, 0.9);
        shock(m.position.clone().setY(0.2), col, 1.8, 320);
      }),
    );
  });
}
NET.on("bfx", (d) => {
  if (!d || !d.b) return;
  if (mode === "guest" && GUEST && d.b === GUEST.b) return rshowQ(() => guestFx(d));
  if (mode !== "explore") return;
  const o = OPENB.get(d.b);
  if (o && o.grp && o.s && Math.hypot(W.position.x - o.s.x, W.position.z - o.s.z) < 70) rshowQ(() => ghostFx(d, o));
});
// guest: a hero's spell lands (their real spell from their pad, or a healing pillar)
async function guestFx(d) {
  if (!GUEST) return;
  // v17: the caster raises their staff first (you, or the other player's wizard), then the spell flies
  const el = SP[d.el] ? d.el : "storm",
    col = EHX[el] || 0xffd27a,
    me = d.id === P.id;
  let q = SLA[d.hs] || SLA[0];
  if (me) {
    castT = 0.6;
    castGlyph(el);
    q = [W.position.x, W.position.z];
  } else {
    const p = d.id && PEERS.get(d.id);
    if (p) p.cT = 0.6;
    const h = GUEST.s && GUEST.s.heroes.find((x) => x.id === d.id);
    if (h && SLA[h.slot]) q = SLA[h.slot];
    if (h) banner(escH(h.name) + " casts", d.heal ? "sup" : "atk");
  }
  const src0 = new T.Vector3(q[0], 0, q[1]);
  if (d.gr === 2 || d.gr === 0)
    popNum(src0, d.gr === 2 ? "★" : "", d.gr === 2 ? "#ffe066" : "#bbb", d.gr === 2 ? "PERFECT!" : "MISSED");
  if (d.heal) {
    glowBurst(src0.clone().setY(2), col, 2, 400);
    await wait(220);
    if (!GUEST) return;
    pillar(src0, 0x9affc0, 1, 7, 700);
    ring(q[0], 0x9affc0, 4, 500, q[1]);
    await wait(300);
    return;
  }
  const idx = Array.isArray(d.tg) ? d.tg : [],
    L = idx.map((i) => fakeFoe(GUEST.fm[i], GUEST.s && GUEST.s.foes[i])).filter(Boolean);
  if (!L.length) {
    glowBurst(src0.clone().setY(2), col, 2, 400); // a support spell or a summon
    pillar(src0, col, 0.9, 6, 600);
    await wait(300);
    return;
  }
  if (d.k && (await sfxAs({ src: src0.clone().setY(2.2), src0, L, me }, d.k, el))) return;
  glowBurst(src0.clone().setY(2), col, 2, 400);
  await wait(220);
  if (GUEST)
    plainBolts(
      src0.clone().setY(2.2),
      L.map((f) => f.m),
      el,
      col,
    );
  await wait(450);
}
// street spectator: replay a spell on someone else's ghost battlefield (quiet: no screen flashes or battle light)
async function ghostFx(d, o) {
  if (!o.grp || mode !== "explore") return;
  const el = SP[d.el] ? d.el : "storm",
    col = EHX[el] || 0xffd27a,
    q = SLA[d.hs] || SLA[0],
    src0 = new T.Vector3(q[0], 0, q[1]),
    p = d.id && PEERS.get(d.id);
  if (p) p.cT = 0.6;
  inPar(o.grp, () => {
    rune(src0, el, 1.7, 800, col);
    if (d.gr === 2) popNum(src0, "★", "#ffe066", "PERFECT!", 1);
  });
  if (d.heal) {
    inPar(o.grp, () => {
      pillar(src0, 0x9affc0, 1, 7, 700);
      ring(q[0], 0x9affc0, 4, 500, q[1]);
    });
    await wait(400);
    return;
  }
  const L = (Array.isArray(d.tg) ? d.tg : []).map((i) => fakeFoe(o.fm && o.fm[i], o.s.foes[i])).filter(Boolean);
  if (!L.length) {
    inPar(o.grp, () => pillar(src0, col, 0.9, 6, 600));
    await wait(300);
    return;
  }
  if (d.k && (await sfxAs({ src: src0.clone().setY(2.2), src0, L, quiet: 1, par: o.grp }, d.k, el))) return;
  inPar(o.grp, () =>
    plainBolts(
      src0.clone().setY(2.2),
      L.map((f) => f.m),
      el,
      col,
    ),
  );
  await wait(450);
}
// guest and ghost battlefields: foe models glide to each snapshot's spot and keep their idle animation
let gAnimT = 0;
function guestAnim() {
  const now = performance.now(),
    dt = Math.min(0.1, (now - (gAnimT || now)) / 1000),
    s = now / 1000;
  gAnimT = now;
  const run = (fm) =>
    fm.forEach((m, i) => {
      const u = m && m.userData;
      if (!u || !u.tp) return;
      const dx = u.tp.x - m.position.x,
        dz = u.tp.z - m.position.z,
        k = Math.min(1, dt * 10);
      m.position.x += dx * k;
      m.position.z += dz * k;
      let dr = u.tp.ry - m.rotation.y;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      m.rotation.y += dr * k;
      const mv = Math.hypot(dx, dz) > 0.08;
      if (u.L) animBeast(m, s, mv);
      else if (u.gl) animGloom(m, s, mv, i);
    });
  if (mode === "guest" && GUEST) run(GUEST.fm);
  for (const o of OPENB.values()) if (o.grp && o.fm) run(o.fm);
  // v18: the host's summons hover (fliers bob) on guest and ghost battlefields
  const bob = (am) =>
    (am || []).forEach((m, i) => {
      if (!m) return;
      const y = m.userData.ay || 0;
      m.position.y = y + (y > 0.5 ? Math.sin(s * 2 + i) * 0.15 : 0);
    });
  if (mode === "guest" && GUEST) bob(GUEST.am);
  for (const o of OPENB.values()) if (o.grp) bob(o.am);
}
// ===================== v20 SCHOOL SIGNATURES =====================
// Each school has its own battle mechanic, fed by attack cards of its element (a Perfect timed hit feeds it double).
// The meter sits next to your pips (sigHud); g.cs.n is the count, reset every fight.
const CSIG = {
  pyre: {
    n: "Heat",
    col: "#ff8a3d",
    max: 5,
    d: "Fire attacks build Heat (+1, +2 on a Perfect). At 5 Heat your next fire attack is a Wildfire: +50% damage and Burn 2 on every foe.",
  },
  gale: {
    n: "Static",
    col: "#ffe066",
    max: 3,
    d: "Storm attacks build Static (+1, +2 on a Perfect). At 3 it discharges on its own: lightning arcs into every foe.",
  },
  rime: {
    n: "Frost Armor",
    col: "#9fe8ff",
    d: "Ice attacks freeze a shield onto you (6, or 12 on a Perfect). Ice hits on a Chilled foe Shatter for +35%.",
  },
  verdant: {
    n: "Petals",
    col: "#7dff9a",
    max: 4,
    d: "Life attacks grow Petals (+1, +2 on a Perfect). Each round they heal your whole party 3 per petal, then one falls.",
  },
  spirit: {
    n: "Echo",
    col: "#c9a0ff",
    d: "Spirit attacks may Echo: a ghost repeats the hit for half. 20% chance, +15% per ally, +25% on a Perfect.",
  },
};
const sigOn = (c) => !!(c && c.ty === "atk" && CSIG[P.cls] && c.a === CLE[P.cls] && mode === "battle" && g.cs);
const echoCh = (gr) => Math.min(0.9, 0.2 + 0.15 * Math.min(3, (g.allies || []).length) + (gr === 2 ? 0.25 : 0));
function sigHud() {
  const s = CSIG[P.cls];
  if (!s || !g.cs || mode !== "battle") return "";
  const n = g.cs.n || 0,
    v = s.max
      ? "●".repeat(Math.min(n, s.max)) + "○".repeat(Math.max(0, s.max - n))
      : P.cls === "spirit"
        ? Math.round(echoCh(0) * 100) + "%"
        : "❄";
  return (
    '<span class="sig' +
    (s.max && n >= s.max ? " full" : "") +
    '" style="color:' +
    s.col +
    '" title="' +
    escH(s.d) +
    '">' +
    s.n +
    " " +
    v +
    "</span>"
  );
}
// Pyre: a full Heat bar turns the next fire attack into a Wildfire
function sigBefore(c) {
  g.wild = 0;
  if (!sigOn(c) || P.cls !== "pyre" || g.cs.n < 5) return;
  g.wild = 1;
  const p = W.position.clone().setY(0);
  pillar(p, 0xff7a2a, 1.3, 9, 900);
  pillar(p, 0xffe0a0, 0.6, 9, 700);
  shock(p, 0xff8a3d, 3.4, 520);
  embers(p.clone().setY(0.3), 0xffa040, 22, 1.3);
  popNum(W.position, "", "#ff8a3d", "WILDFIRE!", 1);
  $("log").textContent += "  Wildfire!";
}
async function sigAfter(c, f, gr) {
  if (!sigOn(c)) return;
  const cs = g.cs,
    gain = gr === 2 ? 2 : 1,
    me = W.position;
  if (P.cls === "pyre") {
    if (g.wild) {
      g.wild = 0;
      cs.n = 0;
      flashScr("#ff8a3d", 0.3);
      alive().forEach((q) => {
        q.st.burn = Math.max(q.st.burn, 2);
        shock(q.m.position, 0xff8a3d, 2.6, 520);
        embers(q.m.position.clone(), 0xff7a2a, 14, 1.2);
        decal(q.m.position.x, q.m.position.z, "scorch", 2);
      });
      $("log").textContent = "Wildfire! Every foe catches alight.";
      await wait(320);
    } else {
      const was = cs.n;
      cs.n = Math.min(5, cs.n + gain);
      embers(me.clone().setY(0.4), 0xff8a3d, 4 + 3 * gain, 0.7);
      if (cs.n >= 5 && was < 5) {
        popNum(me, "", "#ff8a3d", "HEAT FULL", 1);
        ring(me.x, 0xff8a3d, 2.6, 500, me.z);
      }
    }
  } else if (P.cls === "gale") {
    cs.n += gain;
    const a = lanternAt();
    burst(a, 0xfff3a0, 6 * gain, 4, { g: 6, s: 0.25, l: 0.35 });
    if (cs.n >= 3) {
      cs.n = 0;
      const L = alive();
      if (!L.length) return;
      $("log").textContent = "Static discharge! Lightning arcs into every foe.";
      popNum(me, "", "#ffe066", "DISCHARGE!", 1);
      flashScr("#fffbe0", 0.35);
      for (const q of L) {
        zap(a, chest(q), 0xffe066, 280, { w: 0.05, forks: 2, end: 2.6 });
        burst(chest(q), 0xfff3a0, 12, 7, { g: 9, s: 0.3, l: 0.4 });
        shock(q.m.position, 0xffe066, 1.6, 300);
        shk = 0.4;
        await wait(90);
      }
      L.forEach((q) => dmg(q, 10, "storm"));
      await wait(200);
    }
  } else if (P.cls === "rime") {
    const h = me0();
    if (h && !h.down) addShield(h, gr === 2 ? 12 : 6);
  } else if (P.cls === "verdant") {
    const was = cs.n;
    cs.n = Math.min(4, cs.n + gain);
    // petals drift back from the foe to you
    const b = f && f.m ? chest(f) : me.clone().setY(2);
    for (let i = 0; i < 3 + 2 * gain; i++) {
      const pt = new T.Sprite(AM(SP.heal));
      pt.scale.setScalar(0.6);
      wait(i * 60).then(() =>
        shoot(pt, b.clone(), me.clone().setY(1.5), 480, 1.8 + Math.random(), (p) => {
          if (Math.random() < 0.4) mote(p, { c: 0xc8ffd4, v: [0, 0.4, 0], l: 0.5, s: 0.25 });
        }),
      );
    }
    if (cs.n >= 4 && was < 4) popNum(me, "", "#7dff9a", "IN FULL BLOOM", 1);
  } else if (P.cls === "spirit") {
    if (Math.random() >= echoCh(gr)) return;
    const L = (c.aoe ? alive() : [f]).filter((q) => q && q.hp > 0);
    if (!L.length || !CDMG[c.k]) return;
    const n = CDMG[c.k](L.length, (g.allies || []).length) * 0.5;
    $("log").textContent += "  Echo!";
    popNum(me, "", "#c9a0ff", "ECHO!", 1);
    const a = lanternAt();
    await Promise.all(
      L.map((q) => {
        const o = new T.Group(),
          s1 = new T.Sprite(AM(SP.spirit)),
          s2 = new T.Sprite(smat(WGT, 0xe0c8ff));
        s1.scale.setScalar(1.6);
        s2.scale.setScalar(1);
        o.add(s1, s2);
        return shoot(o, a, chest(q), 420, 2.2, (p, k) => {
          s1.material.rotation = k * 9;
          mote(p, { c: 0xb48aff, v: [0, 0.3, 0], l: 0.5, s: 0.5, gr: -0.6 });
        }).then(() => {
          vshock(chest(q), 0xc9a0ff, 2, 360);
          burst(chest(q), 0xd0b0ff, 12, 5, { g: 2, s: 0.35 });
        });
      }),
    );
    L.forEach((q) => dmg(q, Math.round(n), "spirit"));
    await wait(150);
  }
}
// Verdant: at the start of each round the petals heal the whole party, then one falls
function sigTurn() {
  if (P.cls !== "verdant" || !g.cs || !(g.cs.n > 0) || mode !== "battle") return;
  const n = g.cs.n;
  partyHeal(3 * n, 3 * n);
  embers(W.position.clone().setY(0.3), 0x9affc0, 6 + 3 * n, 1);
  g.cs.n--;
}
