// DUSKWICK - 09-party.js: v11 party combat + NET multiplayer seam, heroes, bots, role spells, role picker.
// Loaded in order by index.html as plain scripts; they share one global scope.
// ===================== v11 PARTY COMBAT (built to be multiplayer) =====================
// A battle holds up to four HEROES on the friendly pads: you (always pad 1), other players, or test bots. Summons and
// companions take whatever pads are left. Each round every hero acts, then the allies, then the foes. Foes choose among
// every hero (tanks draw more attacks; a Challenge forces it), and foe HP, pack size and walk-ins grow with the party,
// Toontown / Wizard101 style. A downed hero sits out until a Mender revives them; the battle is lost only when every
// hero is down. Nothing here assumes you are alone: the solo game is simply a party of one.
//
// NETWORK SEAM. There is no transport yet. Attach one with NET.connect({send(msg){...}}) and pass every incoming message
// to NET.recv(msg) (also reachable as window.DUSKWICK_NET). Messages are small JSON objects {type, from, at, data}:
//   hello / pos   who is around and where they stand (shown as other wizards walking the world)
//   battle        a battle started at x,z with open pads (b = battle id), so others can walk in
//   bjoin         a profile asking to join battle b      act   a battle action {b, k: spell key | 'end', tgt}
// Each character has a stable P.id. The world layout is fixed-seed, so every client builds the same map.
const NET = (() => {
  const H = {},
    api = {
      transport: null,
      get online() {
        return !!api.transport;
      },
      connect(t) {
        api.transport = t;
        api.send("hello", pubProfile());
      },
      send(type, data) {
        const m = { type, from: P && P.id, at: Date.now(), data };
        if (api.transport)
          try {
            api.transport.send(m);
          } catch (e) {
            console.warn("NET send failed", e);
          }
        return m;
      },
      recv(m) {
        if (!m || !m.type || m.from === (P && P.id)) return;
        (H[m.type] || []).forEach((f) => {
          try {
            f(m.data, m.from);
          } catch (e) {
            console.error(e);
          }
        });
      },
      on(type, f) {
        (H[type] = H[type] || []).push(f);
      },
      peersNear: () => [],
    };
  return api;
})();
window.DUSKWICK_NET = NET;
// v13 transport: when the game is served by server.js (start-server.bat) it links up on its own once a character is
// in the world. Opened by double-click (file://) it stays solo. Down: Server-Sent Events. Up: small POSTs.
const NETCID = Math.random().toString(36).slice(2) + Date.now().toString(36);
let netTry = 0;
// the server names one connected game the world owner: it runs the street monsters and everyone else follows it
NET.owner = null;
NET.on("owner", (d) => (NET.owner = d && d.c));
const netOwner = () => !NET.online || NET.owner === NETCID;
function netLink() {
  if (netTry || !/^https?:$/.test(location.protocol) || !window.EventSource) return;
  netTry = 1;
  const es = new EventSource("net/events?c=" + NETCID);
  es.onmessage = (e) => {
    try {
      NET.recv(JSON.parse(e.data));
    } catch (er) {}
  };
  es.onopen = () => {
    if (NET.online) return NET.send("hello", pubProfile()); // the stream came back after a server restart
    NET.connect({
      send: (m) =>
        fetch("net/send?c=" + NETCID, { method: "POST", body: JSON.stringify(m), keepalive: true }).catch(() => {}),
    });
    toast("Connected to the test server", "#9affc8");
  };
}
const pubProfile = () => ({
  id: P.id,
  name: P.name || "Lampwick",
  cls: P.cls,
  role: P.role,
  lvl: P.lvl,
  eq: P.eq,
  ap: pubLook(),
});
// v13: another player's wizard = a clone of yours (own materials, no lantern light so the scene's light count stays
// fixed), painted with their look. Falls back to a plain townsperson for bots and old clients that send no look.
function wizFor(pr) {
  if (!pr || !pr.ap)
    return person({ robe: (CL[pr && pr.cls] || [0x5a3aa8])[0], hat: "wizard", hc: 0x2a1a4a, trim: 0xffd27a });
  const o = W.clone(true),
    kill = [];
  o.userData = { wiz: 1 };
  o.traverse((m) => {
    if (m.isLight) kill.push(m);
    else if (m.material) m.material = m.material.clone();
  });
  kill.forEach((m) => m.parent.remove(m));
  o.position.set(0, 0, 0);
  o.rotation.set(0, 0, 0);
  o.scale.setScalar(0.78);
  o.visible = true;
  wizPaint(o, pr.ap);
  return o;
}
function wizPaint(o, ap) {
  const lk = ap.lk || {},
    on = (k) => (LOOKS[k][lk[k] | 0] ? lk[k] | 0 : 0),
    c = ap.c || {},
    d = ap.d || {};
  wizLook(o, ap.ap); // v18: their skin, hair, beard, eyes and height
  o.scale.setScalar(0.78 * (o.userData.ht || 1)); // v50: was 0.84, matches W
  o.traverse((m) => {
    const u = m.userData;
    if (u.lk) m.visible = u.lk[1] === on(u.lk[0]);
    if (u.orb) {
      m.position.fromArray(LOOKS.wand[on("wand")].o);
      m.material.color.setHex(ap.gl);
    }
    if (!m.isMesh || !m.material.color) return;
    if (u.glow) {
      m.material.color.setHex(ap.gl);
      m.material.emissive.setHex(ap.gl).multiplyScalar(0.55);
      return;
    }
    if (u.foot) {
      m.material.color.setHex(c.boots != null ? c.boots : 0x3a2418);
      if (m.material.emissive) {
        m.material.emissive.setHex(d.boots != null ? d.boots : 0);
        m.material.emissiveIntensity = d.boots != null ? 0.3 : 1;
      }
      return;
    }
    if (u.c0 == null) return;
    const role = u.role || (u.c0 === 0x35408f ? "robe" : u.c0 === 0x7a2a5a ? "cape" : null);
    if (!role) return;
    m.material.color.setHex(c[role] != null ? c[role] : DEFC[role]);
    const e = m.material.emissive;
    if (!e) return;
    if (d[role] != null) {
      e.setHex(d[role]);
      m.material.emissiveIntensity = 0.3;
    } else if (role === "robe") {
      e.setHex(ap.re || 0);
      m.material.emissiveIntensity = ap.ri || 0.18;
    } else if (u.em0 != null) e.setHex(u.em0);
  });
}
// v17: walk cycle and casting pose for another player's wizard (a W clone). w = 0..1 how much they walk,
// ck = cast timer (0.6 s counting down). Plain townsperson fallbacks only blink.
function wizAnim(o, s, dt, w, ck) {
  if (!o.__pt) o.__pt = rigParts(o); // v18: includes the head, elbows, staff, robe styles and eyes
  const p = o.__pt;
  if (!p.AL || !p.AR) return personLife(o, s, dt);
  const ph = s * 11,
    sw = Math.sin(ph) * w,
    c = ck > 0 ? Math.sin(Math.min(1, ck / 0.6) * Math.PI) : 0;
  p.AL.rotation.x = sw * 0.7 + Math.sin(s * 1.5) * 0.05 * (1 - w) - 1.2 * c;
  p.AL.rotation.z = -0.1 - 0.5 * c;
  p.AR.rotation.x = c ? -1.9 * c : -sw * 0.45 + Math.sin(s * 1.5 + 1) * 0.05 * (1 - w);
  p.AR.rotation.z = 0.1;
  if (p.FL && p.FR) {
    p.FL.position.z = 0.35 + sw * 0.35;
    p.FR.position.z = 0.35 - sw * 0.35;
    p.FL.position.y = 0.12 + Math.max(0, Math.cos(ph)) * 0.15 * w;
    p.FR.position.y = 0.12 + Math.max(0, -Math.cos(ph)) * 0.15 * w;
  }
  if (p.CAPE) p.CAPE.rotation.x += (0.25 + 0.3 * w - p.CAPE.rotation.x) * Math.min(1, dt * 6);
  o.rotation.x += ((c ? -0.08 : 0.06 * w) - o.rotation.x) * Math.min(1, dt * 8);
  wizRig(p, s, dt, w, 0, c, 0, o.__rs || (o.__rs = {})); // v18 joints, same as your own wizard
}
// other players walking the world (only ever filled by a connected transport)
const PEERS = new Map();
function peerUp(id, pr) {
  let p = PEERS.get(id);
  if (!p && pr) {
    const o = wizFor(pr);
    S.add(o);
    p = { id, pr, o, tx: o.position.x, tz: o.position.z, ry: 0, seen: performance.now(), apk: JSON.stringify(pr.ap) };
    PEERS.set(id, p);
  }
  if (p && pr) {
    p.pr = pr;
    // they changed clothes, dyes or gear: repaint (or swap a plain fallback model for a real one)
    const k = JSON.stringify(pr.ap);
    if (k !== p.apk) {
      p.apk = k;
      if (pr.ap && p.o.userData.wiz) wizPaint(p.o, pr.ap);
      else if (pr.ap) {
        const o = wizFor(pr);
        o.position.copy(p.o.position);
        S.remove(p.o);
        S.add(o);
        p.o = o;
      }
    }
  }
  return p;
}
NET.on("hello", (pr, from) => {
  const p = peerUp(from, pr);
  if (p) p.seen = performance.now();
});
NET.on("pos", (d, from) => {
  const p = peerUp(from, d.pr);
  if (!p) return;
  const now = performance.now();
  if (!p.placed) {
    p.o.position.set(d.x, 0, d.z);
    p.placed = 1;
  }
  p.tx = d.x;
  p.tz = d.z;
  p.ry = d.ry;
  p.seen = now;
  // v15: keep a short history stamped in our own clock (sender time + the smallest offset seen), and draw them a moment
  // in the past, gliding between the two updates around that moment. That replaces the old "dash, then stand" stutter.
  let t = now;
  if (typeof d.t === "number") {
    const off = now - d.t;
    p.off = p.off == null || off < p.off ? off : p.off + 0.2; // creep up slowly so a one-off fast packet can't stick
    t = d.t + p.off;
  }
  const B = p.buf || (p.buf = []);
  if (B.length && t <= B[B.length - 1].t) t = B[B.length - 1].t + 1;
  B.push({ t, x: d.x, z: d.z, ry: d.ry });
  if (B.length > 12) B.shift();
});
// where a peer should be drawn right now (interpolated about NETD ms in the past)
const NETD = 320;
function peerAt(p, now) {
  const B = p.buf;
  if (!B || !B.length) return null;
  const rt = now - NETD;
  if (rt <= B[0].t) return B[0];
  for (let i = B.length - 1; i > 0; i--) {
    const a = B[i - 1],
      b = B[i];
    if (rt >= a.t && rt <= b.t) {
      if (Math.hypot(b.x - a.x, b.z - a.z) > 15) return b; // a teleport: no sliding across the map
      const k = (rt - a.t) / (b.t - a.t || 1);
      let dr = b.ry - a.ry;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, ry: a.ry + dr * k };
    }
  }
  return B[B.length - 1];
}
NET.on("bye", (d, from) => {
  const p = PEERS.get(from);
  if (p) {
    S.remove(p.o);
    PEERS.delete(from);
  }
});
NET.peersNear = (x, z, r) =>
  [...PEERS.values()].filter((p) => Math.hypot(p.o.position.x - x, p.o.position.z - z) < (r || 14)).map((p) => p.pr);
let netT = 0;
function netTick(dt) {
  if (!NET.online) {
    if (SLOT >= 0) netLink();
    return;
  }
  const now = performance.now();
  PEERS.forEach((p, id) => {
    // players who close the game send 'bye' (the server does it for them); this only clears ones that went silent
    if (now - p.seen > 120000) {
      S.remove(p.o);
      PEERS.delete(id);
      return;
    }
    // a guest in your battle already stands on their pad as a hero model; don't draw them twice
    p.o.visible = !(mode === "battle" && g.heroes && g.heroes.some((h) => h.remote && h.id === id));
    const q = p.o.position,
      at = peerAt(p, now),
      px = q.x,
      pz = q.z;
    if (at && Math.hypot(at.x - q.x, at.z - q.z) > 15) q.set(at.x, 0, at.z);
    else if (at) {
      // follow the interpolated spot closely (a light smoothing only hides tiny clock wobbles)
      const k = Math.min(1, dt * 18);
      q.x += (at.x - q.x) * k;
      q.z += (at.z - q.z) * k;
      let dr = at.ry - p.o.rotation.y;
      dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      p.o.rotation.y += dr * Math.min(1, dt * 12);
    }
    const sp = Math.hypot(q.x - px, q.z - pz) / Math.max(dt, 0.001);
    // v17: smooth "is walking" so tiny network wobbles don't make them jog on the spot
    p.ws = (p.ws || 0) + ((sp > 1.2 ? 1 : 0) - (p.ws || 0)) * Math.min(1, dt * 6);
    p.wk = (p.wk || 0) + dt * Math.min(sp, 12) * 1.4;
    q.y = p.ws > 0.5 ? Math.abs(Math.sin(p.wk)) * 0.1 * p.ws : Math.max(0, q.y - dt);
    p.cT = Math.max(0, (p.cT || 0) - dt);
    if (p.o.visible) wizAnim(p.o, now / 1000, dt, p.ws < 0.15 ? 0 : p.ws, p.cT);
  });
  netT -= dt;
  if (netT <= 0) {
    netT = 0.25;
    netPos();
  }
  netBattle(dt);
  netFoes(dt);
}
// where you are for other players: your spot on the street (in a fight, where you stand on the battlefield)
let netLast = 0;
function netPos() {
  if (!NET.online || SLOT < 0) return;
  let x = W.position.x,
    z = W.position.z,
    ry = W.rotation.y;
  if (mode === "battle" || mode === "guest") {
    const v = W.getWorldPosition(new T.Vector3());
    x = v.x;
    z = v.z;
    ry += BG.rotation.y;
  } else if (mode !== "explore") {
    x = saved.x;
    z = saved.z;
  }
  netLast = performance.now();
  NET.send("pos", {
    x: +x.toFixed(2),
    z: +z.toFixed(2),
    ry: +ry.toFixed(2),
    t: Math.round(netLast),
    pr: pubProfile(),
  });
}
// background windows stop drawing frames, so a slow timer keeps you on everyone else's map while you're idle
// (and keeps your battle and, if you run the world, the street foes going for everyone else)
setInterval(() => {
  if (performance.now() - netLast <= 1500) return; // frames are running: netTick handles it
  netPos();
  if (NET.online && netOwner() && mode === "explore") ownerFoeTick(2);
  bstT = 0;
  netBattle(0);
  fwT = 0;
  netFoes(0);
}, 2000);
// ---- heroes ----
const partyN = () =>
  mode === "battle" && g && g.heroes && g.heroes.length
    ? g.heroes.length
    : 1 + (DEV.on ? DEV.bots || 0 : 0) + NET.peersNear(W.position.x, W.position.z).length;
const me0 = () => g && g.heroes && g.heroes[0];
const iAmDown = () => {
  const h = me0();
  return !!(h && h.down);
};
function localHero() {
  return {
    id: P.id,
    name: P.name || "Lampwick",
    role: P.role,
    cls: P.cls,
    lvl: P.lvl,
    local: 1,
    slot: 0,
    sh: 0,
    down: 0,
    get hp() {
      return g.hp;
    },
    set hp(v) {
      g.hp = v;
    },
    get max() {
      return mhp();
    },
    m: W,
  };
}
const partyDown = () => !g.heroes || !g.heroes.length || g.heroes.every((h) => h.down || h.hp <= 0);
function heroJoin(pr, kind) {
  if (!g || mode !== "battle" || !g.heroes || g.heroes.length >= 4 || g.heroes.some((h) => h.id === pr.id)) return null;
  let slot = [1, 2, 3].find((i) => !g.heroes.some((h) => h.slot === i) && !g.allies.some((a) => a.slot === i));
  if (slot == null) {
    const s = g.allies.find((a) => !ALLY[a.t].comp) || g.allies[0];
    if (!s) return null;
    slot = s.slot;
    killA(s);
  }
  pr = Object.assign({}, pr, {
    name: String(pr.name || "Wizard")
      .replace(/[<>&"']/g, "")
      .slice(0, 24),
  });
  const n0 = g.heroes.length,
    role = ROLE[pr.role] ? pr.role : "damage",
    max = Math.round((100 + 10 * ((pr.lvl || 1) - 1)) * (role === "tank" ? 1.4 : 1));
  const m = wizFor(pr),
    p = SLA[slot];
  m.position.set(p[0], 0, p[1]);
  m.rotation.y = 0.9;
  BG.add(m);
  const h = {
    id: pr.id,
    name: pr.name || "Wizard",
    role,
    cls: pr.cls || "pyre",
    lvl: pr.lvl || 1,
    slot,
    hp: max,
    max,
    sh: 0,
    down: 0,
    m,
    bot: kind === "bot",
    remote: kind === "remote",
    q: [],
  };
  h.label = h.name + " · " + ROLE[role].tag;
  deco(h, ROLE[role].col);
  g.heroes.push(h);
  // party scaling: every extra hero makes the foes tougher (and lets more of them walk in, see budget())
  const k = (1 + 0.6 * n0) / (1 + 0.6 * (n0 - 1));
  g.foes.forEach((f) => {
    if (f.hp > 0) {
      f.max = Math.round(f.max * k);
      f.hp = Math.round(f.hp * k);
    }
  });
  pillar(m.position.clone().setY(0), 0x9fe8ff, 0.9, 8, 700);
  puff(m.position.clone().setY(1.5), "heal", 16, 3, 0.8, 1);
  $("log").textContent = h.name + " (" + ROLE[role].n + ") joins the battle!";
  ui();
  return h;
}
function downHero(h) {
  if (h.down) return;
  h.down = 1;
  h.sh = 0;
  if (h.local) $("log").textContent = "You are knocked out! A Mender can Rekindle you.";
  else {
    h.m.rotation.z = 1.4;
    h.m.position.y = 0.35;
    $("log").textContent = h.name + " is knocked out!";
  }
  ui();
}
function reviveHero(h, frac) {
  h.down = 0;
  if (h.local) {
    g.hp = Math.max(1, Math.round(mhp() * frac));
  } else {
    h.hp = Math.max(1, Math.round(h.max * frac));
    h.m.rotation.z = 0;
    h.m.position.y = 0;
  }
  const p = h.local ? W.position : h.m.position;
  pillar(p.clone().setY(0), 0xffe6a8, 1, 8, 800);
  popNum(p, "+" + h.hp, "#7dff9a", "REVIVED", 1);
  ui();
}
function hurtHero(h, d, f) {
  if (g.sanct) d = Math.round(d * 0.6);
  if (h.role === "tank") d = Math.round(d * 0.85);
  const a = Math.min(h.sh || 0, d);
  h.sh -= a;
  d -= a;
  h.hp = Math.max(g.prac ? 1 : 0, h.hp - d); // v18: nobody goes down in the Primer's practice fight
  popNum(h.m.position, d, "#ff9a8a", a ? "SHIELD -" + a : "");
  hit(h.m, 0xaa2222);
  if (h.hp <= 0) downHero(h);
  return d;
}
function addShield(h, n) {
  n = Math.round(n * lvS());
  h.sh = (h.sh || 0) + n;
  const p = h.local ? W.position : h.m.position;
  shock(p.clone().setY(0.2), 0x8ad0ff, 2.2, 500);
  glowBurst(p.clone().setY(1.4), 0x8ad0ff, 3, 450);
  popNum(p, "+" + n, "#8ad0ff", "SHIELD");
  ui();
}
function partyHeal(nh, na) {
  g.heroes.forEach((h) => {
    if (h.down) return;
    if (h.local) healP(nh);
    else {
      const n = Math.round(nh * (P.role === "healer" ? 1.4 : 1)),
        h0 = h.hp;
      h.hp = Math.min(h.max, h.hp + n);
      if (mode === "battle") P.healed = (P.healed || 0) + (h.hp - h0);
      popNum(h.m.position, "+" + (h.hp - h0), "#7dff9a");
      pillar(h.m.position.clone().setY(0), 0x9affc0, 0.8, 6, 700);
    }
  });
  g.allies.forEach((s) => healA(s, na));
}
// what other heroes do on their turn. Bots pick for themselves; networked players' actions arrive through NET 'act'
// and wait in h.q. The resolver works from the spell data, so any spell a remote player casts has an effect here.
const numOf = (t) => parseInt((String(t).match(/\d+/) || [0])[0], 10) || 0;
function heroBolt(h, f, el) {
  const o = new T.Sprite(AM(SP[el] || SP.storm));
  o.scale.setScalar(1.5);
  const a = h.m.position.clone().setY(2.2),
    b = f.m.position.clone().setY(1.6);
  return shoot(o, a, b, 420, 1.4).then(() => puff(b, el, 8, 3, 0.5, 0.9));
}
function botPick(h) {
  const up = g.heroes.filter((x) => !x.down).sort((a, b) => a.hp / a.max - b.hp / b.max),
    dn = g.heroes.find((x) => x.down),
    a = alive();
  if (h.role === "healer") {
    if (dn) return { k: "rekindle", to: dn.id };
    if (up[0] && up[0].hp / up[0].max < 0.65) return { k: "renew" };
  }
  if (h.role === "tank" && !g.taunt && g.turn % 2 === 1) return { k: "taunt" };
  if (h.role === "tank" && up.some((x) => x.hp / x.max < 0.5)) return { k: "bulwark" };
  if (h.role === "aoe" && a.length > 1) return { k: a.length > 2 && h.lvl >= 4 ? "cascade" : "scatter" };
  if (h.role === "summoner") return { k: "familiar", tgt: g.foes.indexOf(a[0]) };
  const f = a.slice().sort((x, y) => x.hp - y.hp)[0];
  return { k: f && f.hp < f.max * 0.4 && h.lvl >= 5 ? "execute" : "pierce", tgt: g.foes.indexOf(f) };
}
async function heroAction(h, a) {
  const s = SPL[a.k];
  if (!s || h.down || !alive().length) return;
  const el = CLE[h.cls] || "fire",
    pw = 1 + 0.08 * (h.lvl - 1),
    hm = h.role === "healer" ? 1.4 : 1;
  const f = g.foes[a.tgt] && g.foes[a.tgt].hp > 0 ? g.foes[a.tgt] : alive()[0];
  $("log").textContent = h.name + " casts " + s.n + ".";
  banner(h.name + ": " + s.n, s.ty);
  h.cT = 0.6; // v17: they raise their staff (partyTick), and a beat later the spell flies
  glowBurst(h.m.position.clone().setY(2), EHX[el] || 0xffd27a, 2, 400);
  await wait(220);
  if (a.k === "taunt") {
    g.taunt = h.id;
    h.sh += Math.round(20 * pw);
    shock(h.m.position.clone().setY(0.2), 0x8ad0ff, 2.4, 500);
    $("log").textContent = h.name + " challenges every foe!";
    await wait(350);
  } else if (a.k === "bulwark") {
    g.heroes.forEach((x) => {
      if (!x.down) x.sh = (x.sh || 0) + Math.round(30 * pw);
    });
    ring(h.m.position.x, 0x8ad0ff, 5, 500, h.m.position.z);
    await wait(350);
  } else if (a.k === "thorns") {
    h.sh += Math.round(25 * pw);
    await wait(250);
  } else if (a.k === "rekindle") {
    const d = g.heroes.find((x) => x.id === a.to && x.down) || g.heroes.find((x) => x.down);
    if (d) reviveHero(d, 0.5);
    await wait(400);
  } else if (a.k === "sanct") {
    g.sanct = 1;
    ring(0, 0x9affc0, 8, 600, 0);
    await wait(300);
  } else if (s.a === "heal" && s.ty === "sup") {
    const n = Math.round((numOf(s.t) || 22) * pw * hm);
    g.heroes.forEach((x) => {
      if (x.down) return;
      if (x.local) {
        const h0 = g.hp;
        g.hp = Math.min(mhp(), g.hp + n);
        popNum(W.position, "+" + (g.hp - h0), "#7dff9a");
      } else {
        const h0 = x.hp;
        x.hp = Math.min(x.max, x.hp + n);
        popNum(x.m.position, "+" + (x.hp - h0), "#7dff9a");
      }
    });
    pillar(h.m.position.clone().setY(0), 0x9affc0, 1, 7, 700);
    bfxSend(h.slot, "heal", [], 1, h.id);
    await wait(350);
  } else if (s.ty === "atk" || s.ty === "sum") {
    // v31: a player's attack readied this round is charged up now, on their screen (cue) and everyone else's
    if (s.ty === "atk" && a.ct && h.remote && a.gr == null) a.gr = await remoteCharge(h, a, el, f);
    if (!alive().length || mode !== "battle") return;
    const list = s.aoe ? alive() : [f].filter(Boolean),
      // v20: a player's own timed hit (sent with the card) sets where in the card's range it lands; bots hit "good"
      qg = s.ty === "atk" && a.gr != null ? Math.max(0, Math.min(2, a.gr | 0)) : 1,
      base = s.ty === "sum" ? 12 : CDMG[a.k] ? CDMG[a.k](list.length, 0) : numOf(s.t) || 20,
      rm =
        (h.role === "damage" && !s.aoe) || (h.role === "aoe" && s.aoe)
          ? 1.25
          : h.role === "summoner" && s.ty === "sum"
            ? 1.4
            : 1;
    bfxSend(
      h.slot,
      el,
      list.map((q) => g.foes.indexOf(q)),
      0,
      h.id,
      a.k,
      s.ty === "atk" && a.gr != null ? qg : -1,
    );
    if (s.ty === "atk" && a.gr != null && qg !== 1)
      popNum(
        h.m.position,
        qg === 2 ? "★" : "",
        qg === 2 ? "#ffe066" : "#bbb",
        qg === 2 ? "PERFECT!" : "MISSED",
        qg === 2,
      );
    // v20: their spell plays with its real animation from their own lantern (it used to be a plain bolt)
    const src0 = h.m.position.clone(),
      shown = s.ty === "atk" && (await sfxAs({ src: src0.clone().setY(2.2), src0, L: list }, a.k, el));
    if (!shown) await Promise.all(list.map((q) => heroBolt(h, q, el)));
    list.forEach((q) => dmg(q, Math.round((base * pw * rm * QMUL[qg]) / lvS()), el, 1));
    await resolve();
  } else await wait(250);
  ui();
}
// v31: cue a remote player's readied attack: they charge it and take the timed hit on their own screen while this
// screen (and every other guest, via 'chg') shows the charge building on their wizard. Resolves with their grade
// (good if they never answer).
function remoteCharge(h, a, el, f) {
  const n = "c" + ++QN,
    c = Object.assign({ k: a.k }, SPL[a.k] || {});
  NET.send("cue", { b: g.id, n, to: h.id, k: a.k, tgt: f ? g.foes.indexOf(f) : -1 });
  NET.send("chg", { b: g.id, id: h.id, k: a.k, el });
  $("log").textContent = h.name + " is charging " + (c.n || "a spell") + "...";
  let cg = null;
  try {
    if (typeof CHG !== "undefined") cg = CHG.start(c, { obj: h.m, el, auto: 1, id: h.id, hold: () => (h.cT = 0.3) });
  } catch (e) {}
  return new Promise((res) => {
    const k = n + ":" + h.id,
      done = (gr) => {
        clearTimeout(t);
        QWAIT.delete(k);
        if (cg) CHG.stop(cg, gr);
        NET.send("chgx", { b: g.id, id: h.id, gr });
        res(gr);
      },
      t = setTimeout(() => done(1), 9000);
    QWAIT.set(k, (gr) => done(gr === 2 ? 2 : gr === 1 ? 1 : 0));
  });
}
async function heroTurn(h) {
  if (h.remote) {
    // v13: play out what they cast this round, then wait (up to 30 s) until they press End turn
    const t0 = performance.now();
    for (;;) {
      while (h.q.length && alive().length) {
        const a = h.q.shift();
        if (a.k === "end") return;
        await heroAction(h, a);
      }
      if (!alive().length || h.down || h.left || mode !== "battle" || performance.now() - t0 > 30000) return;
      $("log").textContent = "Waiting for " + h.name + " to finish their turn...";
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  await heroAction(h, botPick(h));
}
NET.on("act", (a, from) => {
  if (!g || mode !== "battle" || !g.heroes || a.b !== g.id) return;
  const h = g.heroes.find((x) => x.id === from);
  if (h && h.remote) {
    h.q.push(a);
    if (a.k === "end") ui(); // shows them as ready
  }
});
NET.on("bjoin", (pr, from) => {
  if (g && mode === "battle" && pr && pr.b === g.id) heroJoin(Object.assign({}, pr, { id: from }), "remote");
});
const BOTN = ["Brisk", "Tamsin", "Odo", "Wynn", "Pell", "Marlo"],
  BOTR = ["healer", "tank", "aoe", "summoner", "damage"];
function addBots(n) {
  for (let i = 0; i < n; i++) {
    let r = BOTR[(i + (P.role === "healer" ? 1 : 0)) % BOTR.length];
    if (r === P.role) r = BOTR[(i + 2) % 5];
    heroJoin(
      {
        id: "bot" + i + "-" + Date.now(),
        name: BOTN[(i * 2 + g.turn) % BOTN.length],
        // v12: the class follows from the role (each element is one class)
        cls: Object.keys(CLR).find((c) => CLR[c] === r) || "pyre",
        role: r,
        lvl: P.lvl,
      },
      "bot",
    );
  }
}
function partyTick(s) {
  if (!g.heroes) return;
  g.heroes.forEach((h) => {
    if (h.local || !h.tag) return;
    h.tag.position.set(h.m.position.x, 2.95, h.m.position.z);
    h.sel = 0;
    tagUpd(h);
    if (!h.down) {
      h.m.position.y = Math.abs(Math.sin(s * 2 + h.slot)) * 0.04;
      h.cT = Math.max(0, (h.cT || 0) - 0.016);
      wizAnim(h.m, s, 0.016, 0, h.cT);
    }
  });
}
// ---- v12 life (Verdant) and spirit (Wispcaller) spell visuals ----
async function orbShot(f, el, col, sc) {
  sc = sc || 1;
  const a = await charge(el, 220),
    b = chest(f),
    o = new T.Group(),
    s1 = new T.Sprite(AM(SP[el])),
    s2 = new T.Sprite(smat(WGT, col));
  s1.scale.setScalar(1.4 * sc);
  s2.scale.setScalar(0.9 * sc);
  o.add(s1, s2);
  await shoot(o, a, b, 360, 1.2, (p, k) => {
    s1.material.rotation = k * 10;
  });
  burst(b, col, 14 + 6 * sc, 7, { g: 6, s: 0.3, l: 0.45 });
  shock(f.m.position, col, 1.8 * sc, 320);
  lightAt(b, col, 5, 300);
  await wait(160);
}
async function fieldBurst(el, col, big) {
  await charge(el, 240);
  flashScr(ELC[el], 0.25);
  alive().forEach((f) => {
    shock(f.m.position, col, big ? 3.2 : 2.4, 500);
    burst(chest(f), col, big ? 18 : 12, 6, { g: 5, s: 0.3, l: 0.5 });
  });
  shk = big ? 0.5 : 0.25;
  await wait(450);
}
// ---- the role spells ----
const RFX = {
  hit: {
    fire: (f) => SFX.ember(f),
    ice: (f) => SFX.lance(f, 0),
    storm: (f) => SFX.spark(f),
    heal: (f) => orbShot(f, "heal", 0x7dff9a),
    spirit: (f) => orbShot(f, "spirit", 0xc9a0ff),
  },
  big: {
    fire: (f) => SFX.meteor(f),
    ice: (f) => SFX.lance(f, 1),
    storm: (f) => SFX.thunder(f),
    heal: (f) => orbShot(f, "heal", 0x7dff9a, 1.6),
    spirit: (f) => orbShot(f, "spirit", 0xc9a0ff, 1.6),
  },
  aoe: {
    fire: () => SFX.wave(),
    ice: () => SFX.nova(),
    storm: () => SFX.chain(alive()),
    heal: () => fieldBurst("heal", 0x7dff9a),
    spirit: () => fieldBurst("spirit", 0xc9a0ff),
  },
  bigaoe: {
    fire: () => SFX.inferno(),
    ice: () => SFX.blizzard(),
    storm: () => SFX.tempest(),
    heal: () => fieldBurst("heal", 0x7dff9a, 1),
    spirit: () => fieldBurst("spirit", 0xc9a0ff, 1),
  },
};
// v12 class spells for Verdant and Wispcaller
const nAll = () => (g.allies ? g.allies.length : 0);
Object.assign(CFX, {
  thorn: async (f) => {
    await SFX.thorn(f);
    dmg(f, 12, "heal");
    healP(6);
  },
  briar: async (f) => {
    await SFX.briar(f);
    dmg(f, 26, "heal");
    partyHeal(8, 8);
  },
  bloom: async () => {
    const a = alive();
    await SFX.bloom();
    a.forEach((f) => dmg(f, 14, "heal"));
    ring(0, 0x9affc0, 8, 600, 0);
    partyHeal(10, 10);
  },
  shade: async (f) => {
    await SFX.shade(f);
    dmg(f, 10 + 3 * nAll(), "spirit");
  },
  haunt: async (f) => {
    await SFX.haunt(f);
    dmg(f, 24, "spirit");
    if (f.hp > 0) f.hex = 1;
  },
  wail: async () => {
    const a = alive(),
      n = nAll();
    await SFX.wail();
    a.forEach((f) => dmg(f, 16 + 4 * n, "spirit"));
  },
});
function meFx(col) {
  const p = W.position.clone();
  pillar(p.clone().setY(0), col, 1.1, 7, 700);
  rune(p, "heal", 2, 800, col);
  glowBurst(p.clone().setY(1.6), col, 4, 450);
}
Object.assign(CFX, {
  pierce: async (f) => {
    const e = schEl();
    await SFX.pierce(f, e);
    const g0 = f.guard,
      a0 = f.arm;
    f.guard = 0;
    f.arm = false;
    dmg(f, 34, e);
    f.guard = g0;
    f.arm = a0;
  },
  focus: async () => {
    await SFX.focus();
    g.focus = 1.6;
    $("log").textContent = "Your next attack this turn hits 60% harder.";
  },
  execute: async (f) => {
    const e = schEl();
    await SFX.execute(f, e);
    dmg(f, f.hp < f.max * 0.4 ? 96 : 48, e);
  },
  scatter: async () => {
    const e = schEl(),
      a = alive();
    await SFX.scatter(e);
    a.forEach((f) => dmg(f, 14, e));
  },
  cascade: async () => {
    const e = schEl(),
      a = alive();
    await SFX.cascade(e);
    a.forEach((f) => dmg(f, 20 + 8 * a.length, e));
  },
  starfall: async () => {
    const e = schEl(),
      a = alive();
    await SFX.starfall(e);
    a.forEach((f) => {
      dmg(f, 38, e);
      if (f.hp <= 0) return;
      if (e === "fire") f.st.burn = Math.max(f.st.burn, 2);
      else if (e === "ice") f.st.chill = Math.max(f.st.chill, 2);
      else if (Math.random() < 0.35) f.stun = true;
    });
  },
  renew: async () => {
    await SFX.renew();
    partyHeal(22, 12);
    g.pst.burn = 0;
  },
  sanct: async () => {
    await SFX.sanct();
    g.sanct = 1;
    $("log").textContent = "Sanctuary: your team takes 40% less damage this round.";
  },
  rekindle: async () => {
    await charge("heal", 260);
    const d = g.heroes.find((h) => h.down && !h.local);
    if (d) {
      await SFX.rekindle(d.m.position, 1);
      reviveHero(d, 0.5);
      return;
    }
    const t = g.heroes.filter((h) => !h.down).sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
    if (!t || t.local) {
      await SFX.rekindle(W.position);
      healP(60);
    } else {
      await SFX.rekindle(t.m.position);
      const n = Math.round(60 * 1.4),
        h0 = t.hp;
      t.hp = Math.min(t.max, t.hp + n);
      P.healed = (P.healed || 0) + (t.hp - h0);
      popNum(t.m.position, "+" + (t.hp - h0), "#7dff9a");
    }
  },
  rally: async () => {
    await SFX.rally();
    for (const s of [...g.allies].sort((a, b) => a.slot - b.slot)) {
      if (!alive().length) break;
      if (g.allies.includes(s)) await act(s);
    }
  },
  bond: async () => {
    await SFX.bond();
    g.bond = 2;
    g.allies.forEach((s) => healA(s, 20));
    $("log").textContent = "Soulbond: your allies hit 50% harder for 2 rounds.";
  },
  taunt: async () => {
    await SFX.taunt();
    g.taunt = P.id;
    addShield(me0(), 20);
    $("log").textContent = "You challenge every foe. They must come for you this round.";
  },
  bulwark: async () => {
    await SFX.bulwark();
    g.heroes.forEach((h) => {
      if (!h.down) addShield(h, 30);
    });
  },
  thorns: async () => {
    await SFX.thorns();
    g.thorns = 1;
    addShield(me0(), 25);
    $("log").textContent = "Thornguard: foes that strike you this round take half of it back.";
  },
});
// ---- v14 spell animations of their own for the Verdant, Wispcaller and role cards (they used to share orbs / bursts) ----
Object.assign(
  SFX,
  (() => {
    const hp = (h) => (h.local ? W.position : h.m.position),
      team = () =>
        SFXO ? [SFXO.src0] : [...g.heroes.filter((h) => !h.down).map(hp), ...g.allies.map((s) => s.m.position)],
      // a wailing ghost picture for the Wispcaller spells
      GH = cvT(128, 128, (x) => {
        const q = x.createRadialGradient(64, 56, 6, 64, 64, 62);
        q.addColorStop(0, "rgba(235,220,255,.95)");
        q.addColorStop(1, "rgba(150,90,255,0)");
        x.fillStyle = q;
        x.fillRect(0, 0, 128, 128);
        x.fillStyle = "rgba(240,230,255,.95)";
        x.beginPath();
        x.arc(64, 46, 28, Math.PI, 0);
        x.lineTo(92, 100);
        for (let i = 0; i < 4; i++) x.quadraticCurveTo(85 - i * 14, 116 - (i % 2) * 18, 78 - i * 14, 100);
        x.lineTo(36, 100);
        x.closePath();
        x.fill();
        x.fillStyle = "#2a0a4a";
        [52, 76].forEach((e) => {
          x.beginPath();
          x.ellipse(e, 46, 6, 9, 0, 0, 7);
          x.fill();
        });
        x.beginPath();
        x.ellipse(64, 70, 7, 11, 0, 0, 7);
        x.fill();
      }),
      ghostSpr = (p, sc) => {
        const s = new T.Sprite(new T.SpriteMaterial({ map: GH, transparent: true, depthWrite: false, opacity: 0 }));
        s.position.copy(p);
        s.scale.setScalar(sc);
        FXP.add(s);
        return s;
      },
      kill = (o) => {
        if (o.parent) o.parent.remove(o);
        disp(o);
      },
      // a translucent bubble (shields, sanctuary dome)
      bubble = (p, col, r, ms, dome) => {
        const m = new T.Mesh(
          dome ? new T.SphereGeometry(1, 24, 10, 0, 6.283, 0, Math.PI / 2) : new T.SphereGeometry(1, 20, 14),
          bmat({ color: col, opacity: 0, side: T.FrontSide }),
        );
        m.position.copy(p);
        return tmp2(m, ms, (k) => {
          const e = Math.min(1, k / 0.2);
          m.scale.setScalar(r * (0.3 + 0.7 * (1 - Math.pow(1 - e, 3))));
          m.material.opacity = (k < 0.2 ? e : k > 0.75 ? (1 - k) / 0.25 : 1) * (0.28 + Math.sin(k * 30) * 0.05);
          m.rotation.y = k * 2;
        });
      },
      // a ring that closes in instead of rolling out
      inRing = (p, col, r, ms) => {
        const m = new T.Mesh(PL1, bmat({ map: SWV, color: col }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(p.x, 0.17, p.z);
        return tmp2(m, ms, (k) => {
          m.scale.setScalar(0.4 + r * 2 * (1 - k));
          m.material.opacity = k < 0.15 ? k / 0.15 : 1 - k * 0.6;
        });
      },
      // a straight glowing beam from a to b that flashes on and thins away
      beam = (a, b, col, w, ms) => {
        const g2 = new T.Group(),
          d = b.clone().sub(a),
          L = d.length();
        [
          [w, 0xffffff, 1],
          [w * 3.2, col, 0.55],
        ].forEach(([r, c, op]) => {
          const m = new T.Mesh(SEGG, bmat({ color: c, opacity: op }));
          m.scale.set(r, L, r);
          g2.add(m);
        });
        g2.position.copy(a).lerp(b, 0.5);
        g2.quaternion.setFromUnitVectors(UPV, d.normalize());
        return tmp2(g2, ms, (k) => {
          const s = k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9;
          g2.children.forEach((m, i) => {
            m.scale.x = m.scale.z = (i ? w * 3.2 : w) * s;
          });
        });
      },
      // a star / spark sprite falling from the sky onto p, with a streak behind it
      fallStar = (p, col, tex, delay, sc) =>
        wait(delay).then(() => {
          const a = new T.Vector3(p.x - 4 - Math.random() * 2, 11 + Math.random() * 3, p.z + (Math.random() - 0.5) * 3),
            o = new T.Group(),
            s1 = new T.Sprite(smat(tex, col)),
            s2 = new T.Sprite(smat(WGT, 0xffffff));
          s1.scale.setScalar(1.4 * sc);
          s2.scale.setScalar(0.8 * sc);
          o.add(s1, s2);
          return shoot(o, a, p.clone().setY(0.6), 300, 0, (q, k) => {
            s1.material.rotation = k * 8;
            mote(q, { c: col, v: [0, 0.4, 0], l: 0.35, s: 0.7 * sc, gr: -0.8 });
          }).then(() => {
            shock(p, col, 1.6 * sc, 380);
            glowBurst(p.clone().setY(1), col, 3 * sc, 300);
            burst(p.clone().setY(0.8), col, 8, 5, { g: 6, s: 0.3, l: 0.4 });
          });
        });
    return {
      // Thorn Dart: a curved green thorn flies in, splinters, and a leaf of life drifts back to you
      thorn: async (f) => {
        const a = await charge("heal", 220),
          b = chest(f),
          o = new T.Group(),
          m = new T.Mesh(
            new T.ConeGeometry(0.12, 0.9, 6),
            new T.MeshToonMaterial({ color: 0x8ad860, gradientMap: GR, emissive: 0x1a6a1a, emissiveIntensity: 0.6 }),
          );
        m.rotation.x = Math.PI / 2;
        o.add(m, new T.Sprite(smat(WGT, 0x9affa0)));
        o.children[1].scale.setScalar(1.2);
        o.quaternion.setFromUnitVectors(ZV, b.clone().sub(a).normalize());
        await shoot(o, a, b, 260, 0.6, (p, k) => {
          m.rotation.y = k * 14;
          if (Math.random() < 0.6)
            mote(p, {
              c: 0x7ad860,
              v: [(Math.random() - 0.5) * 1.5, Math.random(), (Math.random() - 0.5) * 1.5],
              g: 2,
              l: 0.5,
              s: 0.25,
            });
        });
        shk = 0.3;
        fling(b, 8, 4, { col: 0x8ad860, em: 0x1a5a1a, sz: 0.12 });
        burst(b, 0x9affa0, 14, 6, { g: 5, s: 0.3, l: 0.45 });
        shock(f.m.position, 0x7dff9a, 1.8, 360);
        lightAt(b, 0x7dff9a, 5, 300);
        const lf = new T.Sprite(AM(SP.heal));
        lf.scale.setScalar(0.9);
        shoot(lf, b, casterP().clone().setY(1.4), 420, 1.5, (p) => {
          if (Math.random() < 0.5) mote(p, { c: 0xbfffd0, v: [0, 0.6, 0], l: 0.5, s: 0.25 });
        });
        await wait(160);
      },
      // Briar Lash: a thorned vine whips out of the lantern, coils round the foe and bursts into thorns
      briar: async (f) => {
        const a = await charge("heal", 240),
          b = chest(f),
          mid = a.clone().lerp(b, 0.5),
          cv = new T.CatmullRomCurve3([
            a,
            mid.clone().add(new T.Vector3(0, 2.6, 1.6)),
            b.clone().add(new T.Vector3(-0.8, 0.8, -0.9)),
            b.clone().add(new T.Vector3(0.7, 0.2, 0.7)),
            b.clone().add(new T.Vector3(0, -0.4, -0.7)),
          ]),
          geo = new T.TubeGeometry(cv, 60, 0.1, 5),
          vine = new T.Mesh(
            geo,
            new T.MeshToonMaterial({ color: 0x3a9a3a, gradientMap: GR, emissive: 0x0a3a0a, emissiveIntensity: 0.7 }),
          ),
          N = geo.index.count;
        geo.setDrawRange(0, 0);
        FXP.add(vine);
        await tw(300, (k) => {
          geo.setDrawRange(0, Math.floor(N * k));
          const p = cv.getPoint(k);
          if (Math.random() < 0.7) mote(p, { c: 0x9affa0, v: [0, 0.8, 0], l: 0.5, s: 0.3 });
        });
        shk = 0.45;
        flashScr("#2a6a2a", 0.25);
        fling(b, 12, 5, { col: 0xc8f0a0, em: 0x2a5a1a, sz: 0.13 });
        burst(b, 0x7dff9a, 20, 7, { g: 5, s: 0.35, l: 0.5 });
        shock(f.m.position, 0x5ad87a, 2.4, 420);
        lightAt(b, 0x5ad87a, 6, 380);
        await tw(260, (k) => geo.setDrawRange(Math.floor(N * k), N));
        kill(vine);
        team().forEach((p) => embers(p.clone().setY(0.3), 0x9affc0, 6, 0.8));
        await wait(120);
      },
      // Bloomburst: a giant flower opens over the foes and showers them with pollen; petals drift onto your team
      bloom: async () => {
        await charge("heal", 260);
        const L = alive(),
          c = center(L).setY(0.25),
          fl = new T.Group(),
          pm = new T.MeshToonMaterial({
            color: 0xc8ffd4,
            gradientMap: GR,
            emissive: 0x2a8a4a,
            emissiveIntensity: 0.5,
            side: T.DoubleSide,
            transparent: true,
          }),
          pg = new T.SphereGeometry(1, 10, 6);
        const pets = [];
        for (let i = 0; i < 10; i++) {
          const pv = new T.Group(),
            m = new T.Mesh(pg, pm);
          m.scale.set(0.9, 0.08, 2.2);
          m.position.z = 2.1;
          pv.rotation.y = (i / 10) * 6.283;
          pv.add(m);
          fl.add(pv);
          pets.push(pv);
        }
        const core = new T.Mesh(
          new T.SphereGeometry(0.9, 12, 8),
          new T.MeshToonMaterial({ color: 0xffe9a0, gradientMap: GR, emissive: 0xaa8820, transparent: true }),
        );
        core.scale.y = 0.5;
        fl.add(core);
        fl.position.copy(c);
        FXP.add(fl);
        rune(c, "heal", 4, 1300, 0x9affc0);
        await tw(500, (k) => {
          const e = 1 - Math.pow(1 - k, 3);
          fl.scale.setScalar(0.2 + e * 0.8);
          pets.forEach((pv) => (pv.children[0].rotation.x = -1.3 * (1 - e)));
          fl.rotation.y = k * 1.2;
        });
        flashScr("#9affc0", 0.25);
        shk = 0.3;
        L.forEach((f) => {
          burst(chest(f), 0xffe9a0, 14, 6, { g: 3, s: 0.3, l: 0.6 });
          shock(f.m.position, 0x9affc0, 2.2, 450);
        });
        burst(c.clone().setY(1), 0xffe9a0, 30, 8, { g: 2, s: 0.35, l: 0.9, lift: 2 });
        await tw(380, (k) => {
          fl.scale.setScalar(1 + k * 0.3);
          pm.opacity = 1 - k;
          core.material.opacity = 1 - k;
        });
        kill(fl);
        team().forEach((p) => embers(p.clone().setY(2.5), 0xc8ffd4, 8, 1.2));
      },
      // Spirit Bolt: a wisp leaves each of your allies and joins a spiralling soul-flame
      shade: async (f) => {
        const a0 = lanternAt();
        await Promise.all(
          sfxAl().map((s) => {
            const w = new T.Sprite(AM(SP.spirit));
            w.scale.setScalar(0.7);
            return shoot(w, s.m.position.clone(), a0, 260, 1, (p) =>
              mote(p, { c: 0xc9a0ff, v: [0, 0.3, 0], l: 0.4, s: 0.3 }),
            );
          }),
        );
        const a = await charge("spirit", 200),
          b = chest(f),
          o = new T.Group(),
          s1 = new T.Sprite(AM(SP.spirit)),
          s2 = new T.Sprite(smat(WGT, 0xe0c8ff));
        const sc = 1 + 0.15 * sfxAl().length;
        s1.scale.setScalar(1.4 * sc);
        s2.scale.setScalar(0.8 * sc);
        o.add(s1, s2);
        const side = new T.Vector3(0, 0, 1);
        await shoot(o, a, b, 380, 0.8, (p, k) => {
          s1.material.rotation = -k * 12;
          const r = Math.sin(k * Math.PI) * 0.7;
          p.addScaledVector(side, Math.sin(k * 18) * r);
          p.y += Math.cos(k * 18) * r * 0.6;
          mote(p, { c: 0xb48aff, v: [0, 0.2, 0], l: 0.45, s: 0.45 * sc, gr: -0.6 });
        });
        burst(b, 0xc9a0ff, 16, 6, { g: 3, s: 0.35, l: 0.5 });
        shock(f.m.position, 0xa070ff, 2, 360);
        lightAt(b, 0xa070ff, 5, 300);
        await wait(140);
      },
      // Haunting: a ghost rises behind the foe, shrieks, and dives straight through it
      haunt: async (f) => {
        await charge("spirit", 220, 0xa070ff);
        const b = f.m.position.clone(),
          gs = ghostSpr(b.clone().add(new T.Vector3(1.6, 0.5, -0.6)), 2.2);
        await tw(420, (k) => {
          gs.position.y = 0.5 + k * 3;
          gs.material.opacity = Math.min(1, k * 2.5);
          gs.material.rotation = Math.sin(k * 10) * 0.12;
        });
        flashScr("#2a0a4a", 0.4);
        const p0 = gs.position.clone(),
          p1 = b.clone().add(new T.Vector3(-1.6, 0.6, 0.4));
        await tw(260, (k) => {
          gs.position.lerpVectors(p0, p1, k);
          gs.scale.setScalar(2.2 + k * 0.8);
          mote(gs.position, { c: 0x8a5aff, v: [0, 0.4, 0], l: 0.5, s: 0.8, gr: -0.5 });
        });
        shk = 0.4;
        burst(chest(f), 0xb48aff, 18, 5, { g: 1, s: 0.45 });
        smoke(b.clone().setY(0.5), 0x5a3a8a, 5, 1.4);
        shock(b, 0x8a5aff, 2.2, 420);
        await tw(220, (k) => (gs.material.opacity = 1 - k));
        kill(gs);
      },
      // Banshee Wail: a huge ghost screams over your side; waves of sound roll over the foes, one more per ally
      wail: async () => {
        await charge("spirit", 260);
        const c = casterP().clone().setY(4.2),
          gs = ghostSpr(c, 0.5),
          L = alive(),
          fc = center(L).setY(1.6);
        await tw(300, (k) => {
          gs.scale.setScalar(0.5 + k * 3.5);
          gs.material.opacity = k;
        });
        flashScr("#3a1a6a", 0.35);
        const n = 2 + Math.min(3, sfxAl().length);
        for (let i = 0; i < n; i++) {
          const p = c.clone().lerp(fc, 0.15 + i * 0.12);
          vshock(p, 0xc9a0ff, 3 + i * 0.6, 520);
          sfxAl().forEach((s) => i === 0 && vshock(s.m.position.clone().setY(1.6), 0xb48aff, 2, 420));
          shk = 0.25;
          gs.scale.setScalar(4 + (i % 2) * 0.3);
          await wait(110);
        }
        L.forEach((f) => {
          shock(f.m.position, 0xa070ff, 2.6, 480);
          burst(chest(f), 0xd0b0ff, 12, 5, { g: 2, s: 0.35 });
        });
        await tw(300, (k) => (gs.material.opacity = 1 - k));
        kill(gs);
      },
      // Piercing Ray: a needle of light in your element punches clean through the foe, shattering its guard
      pierce: async (f, e) => {
        const col = EHX[e],
          a = await charge(e, 260),
          b = chest(f),
          far = b.clone().add(b.clone().sub(a).normalize().multiplyScalar(6));
        flashScr(ELC[e], 0.2);
        beam(a, far, col, 0.07, 420);
        shk = 0.45;
        vshock(b, 0xffffff, 1.6, 300);
        fling(b, 10, 5, { col: 0xf0f0ff, em: 0x6a6a8a, sz: 0.12 });
        burst(far, col, 10, 4, { g: 2, s: 0.3 });
        burst(b, col, 16, 6, { s: 0.35 });
        shock(f.m.position, col, 2, 380);
        lightAt(b, col, 6, 360);
        await wait(260);
      },
      // Lightbreaker: a great blade of light forms over the foe and falls like a guillotine
      execute: async (f, e) => {
        const col = EHX[e],
          b = f.m.position.clone();
        await charge(e, 260);
        const o = new T.Group(),
          bl = new T.Mesh(
            new T.OctahedronGeometry(0.5, 0),
            new T.MeshToonMaterial({ color: 0xfff4d8, gradientMap: GR, emissive: col, emissiveIntensity: 0.7 }),
          ),
          gd = new T.Mesh(
            B(1.4, 0.18, 0.3),
            new T.MeshToonMaterial({ color: 0xd9a441, gradientMap: GR, emissive: 0x4a2a00 }),
          ),
          gl = new T.Sprite(smat(WGT, col));
        bl.scale.set(0.7, 5, 0.25);
        gd.position.y = 2.5;
        gl.scale.setScalar(4);
        o.add(bl, gd, gl);
        o.position.set(b.x, 11, b.z);
        FXP.add(o);
        rune(b, e, 2.4, 1100, col);
        await tw(380, (k) => {
          o.position.y = 11 - k * 1.5;
          o.rotation.y = k * 3;
          gl.material.opacity = k;
        });
        await hold(80);
        await tw(140, (k) => (o.position.y = 9.5 - k * 7.5));
        shk = 0.8;
        flashScr("#ffffff", 0.45);
        shock(b, col, 3.4, 520);
        shock(b, 0xffffff, 1.8, 320);
        fling(b.clone().setY(0.3), 12, 5, { rock: 1, col: 0x6a5a7a, em: 0x1a1020 });
        burst(chest(f), col, 26, 8, { g: 4, s: 0.4 });
        decal(b.x, b.z, e === "fire" ? "scorch" : "frost", 2);
        lightAt(b, col, 8, 450);
        await tw(260, (k) => {
          o.scale.setScalar(1 - k);
          gl.material.opacity = 1 - k;
        });
        kill(o);
      },
      // Scattershot: a fan of small bolts in your element sprays across every foe
      scatter: async (e) => {
        const col = EHX[e],
          a = await charge(e, 220),
          L = alive();
        const shots = [];
        for (let i = 0; i < Math.max(6, L.length * 3); i++) {
          const f = L[i % L.length],
            b = chest(f).add(
              new T.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8),
            ),
            s = new T.Sprite(AM(SP[e]));
          s.scale.setScalar(0.6);
          shots.push(
            wait(i * 45).then(() =>
              shoot(s, a, b, 240, 0.6 + Math.random() * 1.6, (p) => {
                if (Math.random() < 0.4) mote(p, { c: col, v: [0, 0.2, 0], l: 0.3, s: 0.25 });
              }).then(() => {
                burst(b, col, 5, 4, { s: 0.25, l: 0.35 });
                shk = 0.15;
              }),
            ),
          );
        }
        await Promise.all(shots);
        L.forEach((f) => shock(f.m.position, col, 1.6, 300));
      },
      // Cascade: a burst leaps foe to foe, swelling bigger with every one it hits
      cascade: async (e) => {
        const col = EHX[e],
          L = alive();
        let from = await charge(e, 240);
        for (let i = 0; i < L.length; i++) {
          const f = L[i],
            b = chest(f),
            s = new T.Sprite(AM(SP[e])),
            sz = 1 + i * 0.35;
          s.scale.setScalar(0.9 * sz);
          await shoot(s, from, b, 200, 1.2, (p) => mote(p, { c: col, v: [0, 0.3, 0], l: 0.35, s: 0.35 * sz }));
          glowBurst(b, col, 3 * sz, 320);
          shock(f.m.position, col, 1.4 * sz, 380);
          burst(b, col, 8 + i * 4, 5 + i, { s: 0.3, l: 0.45 });
          shk = 0.2 + i * 0.12;
          from = b;
        }
        await wait(160);
      },
      // Starfall: stars in your element rain down on every foe
      starfall: async (e) => {
        const col = EHX[e],
          L = alive();
        await charge(e, 280);
        flashScr("#0a0a2a", 0.4);
        const all = [];
        L.forEach((f, j) => {
          for (let i = 0; i < 3; i++) {
            const p = f.m.position
              .clone()
              .add(new T.Vector3((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 1.4));
            all.push(fallStar(p, col, i === 2 ? RAYT : SP[e], j * 70 + i * 120, i === 2 ? 1.3 : 0.9));
          }
        });
        await Promise.all(all);
        shk = 0.5;
        L.forEach((f) => lightAt(f.m.position, col, 6, 350));
        await wait(120);
      },
      // Hunter's Focus: a gold reticle closes in around you and the lantern burns brighter
      focus: async () => {
        await charge("heal", 200, 0xffd27a);
        const p = W.position.clone();
        inRing(p, 0xffd27a, 3.4, 520);
        inRing(p, 0xffe9a0, 2.2, 420);
        const rs = new T.Sprite(smat(RAYT, 0xffd27a));
        rs.position.copy(p).setY(1.6);
        await tmp2(rs, 520, (k) => {
          rs.scale.setScalar(4 * (1 - k * 0.6));
          rs.material.rotation = k * 3;
          rs.material.opacity = 1 - k * 0.5;
        });
        glowBurst(lanternAt(), 0xffd27a, 3, 300);
      },
      // Renewal: soft rain of light and petals over every hero and ally, steam where burns go out
      renew: async () => {
        await charge("heal", 220);
        const ps = team();
        rune(W.position, "heal", 2.4, 1000, 0x9affc0);
        ps.forEach((p) => pillar(p.clone().setY(0), 0x9affc0, 0.8, 7, 800));
        if (g.pst && g.pst.burn) smoke(W.position.clone().setY(0.8), 0xd8d8e8, 5, 1);
        await tw(700, () => {
          ps.forEach((p) => {
            if (Math.random() < 0.7)
              mote(new T.Vector3(p.x + (Math.random() - 0.5) * 2, 4 + Math.random(), p.z + (Math.random() - 0.5) * 2), {
                t: Math.random() < 0.5 ? SP.heal : null,
                c: Math.random() < 0.5 ? 0x9affc0 : 0xfff0b0,
                v: [(Math.random() - 0.5) * 0.6, -2.5, (Math.random() - 0.5) * 0.6],
                g: 0,
                l: 1.2,
                s: 0.35,
                sp: 2,
              });
          });
        });
      },
      // Sanctuary: a shimmering dome rises over your whole team
      sanct: async () => {
        await charge("heal", 220);
        const ps = team(),
          c = ps
            .reduce((a, p) => a.add(p), new T.Vector3())
            .divideScalar(Math.max(1, ps.length))
            .setY(0),
          r = Math.max(3.5, ...ps.map((p) => Math.hypot(p.x - c.x, p.z - c.z) + 1.6));
        rune(c, "heal", r, 1300, 0xbfffe0);
        shock(c, 0xbfffe0, r, 600);
        bubble(c, 0xbfffe0, r, 1300, 1);
        await wait(500);
      },
      // Rekindle: a column of dawn-fire rises on the chosen hero; when it revives, wings of light open
      rekindle: async (p, rev) => {
        const q = p.clone().setY(0);
        pillar(q, 0xffe6a8, rev ? 1.4 : 1, rev ? 10 : 8, rev ? 1100 : 800);
        rune(q, "fire", rev ? 2.6 : 2, 1000, 0xffd27a);
        shock(q, 0xffd27a, rev ? 3.2 : 2.2, 520);
        embers(q.clone().setY(0.2), 0xffb050, rev ? 26 : 14, 1);
        if (rev) {
          flashScr("#ffe6a8", 0.4);
          const wgs = [-1, 1].map((s) => {
            const w = new T.Sprite(smat(SP.fire, 0xffe0a0));
            w.position.set(q.x + s * 1.1, 2.2, q.z);
            FXP.add(w);
            return w;
          });
          await tw(700, (k) =>
            wgs.forEach((w, i) => {
              w.scale.set(2.6 * Math.sin(k * Math.PI), 1.6 * Math.sin(k * Math.PI), 1);
              w.material.rotation = (i ? -1 : 1) * (0.6 - k * 0.4);
            }),
          );
          wgs.forEach(kill);
        } else await wait(400);
      },
      // Rally: a war-horn shockwave rolls out from you; every ally flares and leaps
      rally: async () => {
        await charge("heal", 200, 0xc38bff);
        const p = W.position.clone();
        flashScr("#c38bff", 0.2);
        ring(p.x, 0xc38bff, 12, 600, p.z);
        ring(p.x, 0xffd27a, 8, 450, p.z);
        vshock(p.clone().setY(1.6), 0xe0c8ff, 2.5, 400);
        await wait(160);
        await Promise.all(
          g.allies.map((s) => {
            const m = s.m,
              y0 = m.position.y;
            pillar(m.position.clone().setY(0), 0xc38bff, 0.7, 6, 600);
            burst(m.position.clone(), 0xffd27a, 8, 4, { lift: 3, s: 0.3 });
            return tw(320, (k) => (m.position.y = y0 + Math.sin(k * Math.PI) * 0.9)).then(() => (m.position.y = y0));
          }),
        );
      },
      // Soulbond: violet tethers of light run from you to every ally and pulse
      bond: async () => {
        await charge("heal", 220, 0xc38bff);
        const a = W.position.clone().setY(1.6);
        await Promise.all(
          g.allies
            .map((s) => zap(a, s.m.position.clone(), 0xc38bff, 650, { jit: 0.35, forks: 0, w: 0.04, n: 10, end: 2 }))
            .concat(wait(300)),
        );
        g.allies.forEach((s) => {
          glowBurst(s.m.position.clone(), 0xff8ad0, 3, 380);
          embers(s.m.position.clone().setY(0), 0xc38bff, 8, 0.8);
        });
      },
      // Challenge: a red roar rolls toward the foes and their anger is pulled onto you, then a shield snaps up
      taunt: async () => {
        await charge("ice", 200, 0xff8a5a);
        const p = W.position.clone();
        flashScr("#ff5a3a", 0.25);
        vshock(p.clone().setY(1.6), 0xff8a5a, 3, 420);
        for (let i = 0; i < 3; i++) {
          ring(p.x + 1.5 + i * 2.2, 0xff8a5a, 3 + i, 420, p.z);
          await wait(80);
        }
        alive().forEach((f) => {
          for (let j = 0; j < 6; j++)
            mote(chest(f), {
              c: 0xff6a3a,
              v: p
                .clone()
                .setY(1.4)
                .sub(chest(f))
                .multiplyScalar(1.6 + Math.random() * 0.4)
                .toArray(),
              l: 0.55,
              s: 0.35,
              gr: -0.5,
            });
        });
        await wait(300);
        bubble(p.clone().setY(1.2), 0x8ad0ff, 1.6, 700);
      },
      // Bulwark: a slab of ice-glass slams down in front of every hero
      bulwark: async () => {
        await charge("ice", 220);
        const hs = g.heroes.filter((h) => !h.down).map(hp);
        await Promise.all(
          hs.map((p, i) => {
            const m = new T.Mesh(
              new T.CylinderGeometry(1.1, 1.1, 0.14, 6),
              new T.MeshToonMaterial({
                color: 0xbfe4ff,
                gradientMap: GR,
                emissive: 0x2a7ab8,
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.85,
              }),
            );
            m.rotation.set(0, 0, Math.PI / 2);
            const q = p.clone().add(new T.Vector3(1.2, 0, 0));
            FXP.add(m);
            return wait(i * 70)
              .then(() =>
                tw(200, (k) => {
                  m.position.set(q.x, 1.3 + (1 - k) * 6, q.z);
                }),
              )
              .then(() => {
                shk = 0.3;
                shock(q, 0x8ad0ff, 1.6, 360);
                fling(q.clone().setY(0.3), 6, 3, { sz: 0.1 });
                return tw(650, (k) => (m.material.opacity = 0.85 * (k < 0.6 ? 1 : (1 - k) / 0.4)));
              })
              .then(() => kill(m));
          }),
        );
      },
      // Thornguard: a crown of ice spikes bursts up around you and a frost shell forms
      thorns: async () => {
        await charge("ice", 220);
        const p = W.position,
          list = [];
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * 6.283;
          list.push([p.x + Math.cos(a) * 1.5, p.z + Math.sin(a) * 1.5, i / 10, 0.5 + (i % 2) * 0.2]);
        }
        spikes(list, 1000);
        shock(p, 0x9fe8ff, 2, 420);
        bubble(p.clone().setY(1.2), 0x9fe8ff, 1.7, 900);
        await wait(380);
      },
    };
  })(),
);
// summon pip cost (Conjurers pay one less)
const cc = (c) => (c.ty === "sum" && P.role === "summoner" ? Math.max(1, c.c - 1) : c.c);
// role picker: after choosing a school for a new character, and once for older characters that have no role yet
function setRole(k) {
  P.role = k;
  clsStart();
  unl(1);
  if (P.deck) {
    const st = Object.keys(SPL).filter((s) => SPL[s].rl === k && SPL[s].st);
    st.forEach((s) => {
      if (!P.deck.includes(s) && P.deck.filter(useOK).length < dmax()) P.deck.push(s);
    });
  }
  if (g) g.hp = Math.min(g.hp, mhp());
  sv();
  ui();
}
// v12: no role picker any more. The class decides the role; this keeps old callers working.
function pickRole(done) {
  syncRole();
  setRole(P.role || "damage");
  if (done) done();
}
async function resolve() {
  const hs = g.foes.filter((f) => f.hq);
  hs.forEach((f) => (f.hq = 0));
  await Promise.all(hs.map((f) => hit(f.m, 0xffffff)));
  await Promise.all(g.foes.filter((f) => f.hp <= 0 && !f.gone).map(die));
  ui();
}
async function die(f) {
  f.gone = 1;
  undeco(f);
  puff(f.m.position.clone().setY(1.5), "storm", 10, 3, 0.6, 1);
  const s0 = f.m.scale.x;
  await tw(420, (k) => f.m.scale.setScalar(s0 * (1 - k)));
  BG.remove(f.m);
}
