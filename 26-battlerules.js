// DUSKWICK - 26-battlerules.js (v25): a battle holds only the foes you could see standing there.
// - No random extra pack-mates, no unseen boss minions (v25b: the ones standing beside the boss come), no walk-ins from the street, no "call for help" summons.
// - Gloomspire floors: the fight is every guardian still standing on that floor (like a dungeon room), nothing else.
// - Chests: with a full bag the chest stays shut (nothing is sold); make room and open it again.
// Only wraps existing globals (gather, canJoin, openChest, FMV moves); adds no top-level names.
(() => {
  // v25b: boss minions stand beside their boss in the world (32-bosses.js: f.mb = boss, f.msp = battle spec)
  const spec = (f) =>
    f.msp
      ? Object.assign({}, f.msp)
      : f.boss && !f.dboss
        ? { kind: f.kind, t: f.t, boss: 1 }
        : { kind: f.kind, t: f.t, big: f.big, el: f.elite, hc: f.hc, nm: f.nm };
  const g0 = gather;
  gather = function (f0) {
    if (f0.prac) return g0(f0); // the Primer's practice fight is scripted (16-tutorial.js)
    if (f0.tw && !f0.dboss) {
      const list = [f0].concat(foes.filter((f) => f !== f0 && f.tw === f0.tw && !f.dead)).slice(0, 4);
      return { cap: Math.max(2, list.length), rein: 0, list, sp: list.map(spec) };
    }
    const G = g0(f0);
    // only the foes actually standing in the fight: drop random extras and unseen minions
    G.sp = G.sp.slice(0, Math.max(1, G.list.length));
    if (f0.boss) {
      const mins = foes.filter((m) => m.mb === f0 && !m.dead).slice(0, 3);
      G.list = [f0].concat(mins);
      G.sp = G.sp.slice(0, 1).concat(mins.map(spec));
    }
    G.sp.forEach((s, i) => {
      const f = G.list[i];
      if (f && f.nm && !s.nm && !s.boss) s.nm = f.nm;
    });
    // v34: never pull in a foe standing behind a locked gate
    if (!f0.boss) {
      const keep = G.list.map((f, i) => i === 0 || !gateBlk(f));
      G.list = G.list.filter((f, i) => keep[i]);
      G.sp = G.sp.filter((s, i) => keep[i] !== false);
    }
    G.cap = Math.max(G.list.length, Math.min(G.cap, 4));
    return G;
  };
  // v34: a locked gate (story ward, SLK) lies on the line from you to the foe -> no fight through it
  const gateBlk = (f) => {
    if (!LKON || (DEV.on && DEV.nw)) return false;
    const a = W.position,
      b = f.o.position,
      n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.8) + 1;
    for (let i = 0; i <= n; i++) {
      const x = a.x + ((b.x - a.x) * i) / n,
        z = a.z + ((b.z - a.z) * i) / n;
      if (zoneAt(x, z) !== "hub") continue;
      const lx = x - OX;
      if (!lockOK(lx, z - OZ, Math.abs(lx))) return true;
    }
    return false;
  };
  const fi0 = fight;
  fight = function (f0) {
    if (!f0.prac && !f0.tw && gateBlk(f0)) {
      f0.cool = performance.now() + 1500;
      return;
    }
    return fi0.apply(this, arguments);
  };
  // v34: a wandering foe that reaches a battlefield it can't join (all of them now) slips away and respawns later
  const BFR = 12.5; // > JR (11) in battlePatrol, so it goes before it would stop and wait
  const fixed = (f) => f.tw || f.dun != null || f.d2 != null || f.boss || f.dboss || f.mb || f.rbw != null || f.prac;
  const bfs = () => {
    const now = performance.now(),
      L = [];
    if ((mode === "battle" || mode === "guest") && BG) L.push(BG.position);
    if (typeof OPENB !== "undefined")
      OPENB.forEach((o) => {
        if (o && o.s && now - o.t < BSTALE) L.push(o.s);
      });
    return L;
  };
  const vanish = (f) => {
    f.dead = 1;
    f.deadAt = performance.now();
    f.rt = performance.now() + 30000;
    f.hold = f.wait = 0;
    S.remove(f.o);
    if (f.ring) f.ring.visible = false;
  };
  const nearBf = (f, L) => {
    const q = f.o.position;
    return L.some((c) => Math.abs(c.x - q.x) < BFR && Math.abs(c.z - q.z) < BFR && Math.hypot(c.x - q.x, c.z - q.z) < BFR);
  };
  const inFight = (f) => mode === "battle" && g && g.party && g.party.includes(f);
  const pt0 = patrol;
  patrol = function (f, dt) {
    if (!f.dead && !fixed(f) && !inFight(f) && f.path) {
      const L = bfs();
      if (L.length && nearBf(f, L)) {
        vanish(f);
        return false;
      }
    }
    const mf = pt0(f, dt);
    if (!f.dead) sep(f, dt);
    return mf;
  };
  // v34: foes keep a little room from each other and from NPCs instead of walking through them
  const rad = (f) => 0.8 + (f.big ? 0.6 : 0) + (f.boss || f.dboss ? 0.9 : 0);
  const sep = (f, dt) => {
    const q = f.o.position,
      ra = rad(f);
    if (Math.abs(q.x - W.position.x) > 90 || Math.abs(q.z - W.position.z) > 90) return; // only near you (cheap)
    let px = 0,
      pz = 0;
    const push = (x, z, md) => {
      const dx = q.x - x,
        dz = q.z - z;
      if (Math.abs(dx) > md || Math.abs(dz) > md) return;
      const d = Math.hypot(dx, dz);
      if (d >= md) return;
      if (d < 1e-3) {
        px += md * 0.5;
        return;
      }
      px += (dx / d) * (md - d);
      pz += (dz / d) * (md - d);
    };
    for (const o of foes) if (o !== f && !o.dead && o.o.visible) push(o.o.position.x, o.o.position.z, ra + rad(o));
    if (typeof NPCS !== "undefined") for (const n of NPCS) push(n.x, n.z, ra + 0.9);
    if (!px && !pz) return;
    const k = Math.min(1, dt * 6),
      nx = q.x + px * k,
      nz = q.z + pz * k;
    if (okp(nx, nz)) {
      q.x = nx;
      q.z = nz;
    }
  };
  const bp0 = battlePatrol;
  battlePatrol = function (dt, s) {
    if (netOwner())
      for (const f of foes)
        if ((f.hold || f.wait) && !f.dead && !fixed(f) && !inFight(f)) vanish(f);
    return bp0(dt, s);
  };
  // street foes no longer wander into a fight already under way (they wait at the edge instead)
  canJoin = () => false;
  // bosses no longer call in helpers mid-fight
  Object.keys(FMV.M).forEach((k) => {
    if (FMV.M[k].tg === "summon") FMV.M[k].c = () => false;
  });
  const oc0 = openChest;
  openChest = function (c) {
    if (P.inv && P.inv.length >= INVMAX) {
      toast("Your bag is full. Make room, then open the chest.", "#ff8a6a");
      return;
    }
    oc0(c);
  };
})();
