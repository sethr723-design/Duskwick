// DUSKWICK - 18-social.js: v19 Friends, teams and dungeon line-ups (Book > Friends).
// Loaded in order by index.html as plain scripts; they share one global scope.
// Everything rides the NET seam (09-party.js). The server broadcasts every message, so anything meant for one player
// carries `to` (their P.id) and everyone else ignores it. Messages:
//   freq / facc   friend request / accept {to, n}          tinv / tacc  team invite / accept {to, n}
//   team          the leader's roster {lead, ids} (resent every few seconds; leaving it = you were dropped)
//   tleave        tell the leader you left {to}            insp / inspR ask for / send worn gear {to, ...}
//   lq            dungeon line-up {d, on, n, lv, cls, t}  lgo   the line-up's leader sends it in {d, ids, lead}
// Friends are saved in P.friends; teams and line-ups only last while you're connected. Teammates can teleport to
// each other, and friends / teammates get a name tag over their heads.
// v20: friends keep their last level / school / seen time and show online / offline; add by name (P.fwant waits for
// them); "Join" (SOC.joinF) takes you to a friend from anywhere, into their battle or their dungeon line-up. Each
// dungeon door has a 4-spot line-up (SOC.spots), E / the chip lines you up, and the door swirl respects the line-up
// (SOC.doorGate wraps the portal's lock).
const SOC = {
  view: "friends", // friends | lineup | insp
  insp: null, // id whose gear is shown
  gear: {}, // id -> their gear reply
  req: new Map(), // friend requests waiting for you: id -> name
  sent: new Set(), // ids you sent a friend request to
  inv: null, // team invite waiting for you {lead, n}
  team: null, // {lead, ids} (ids includes the leader)
  lq: new Map(), // dungeon line-ups: id -> {d, n, lv, cls, t, seen}
  del: null, // friend id clicked "Remove" once (click again to confirm)
  sig: "",
};
SOC.esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
SOC.isF = (id) => (P.friends || []).some((f) => f.id === id);
SOC.inT = (id) => !!SOC.team && SOC.team.ids.includes(id);
SOC.lead = () => !!SOC.team && SOC.team.lead === P.id;
SOC.name = (id) => {
  const p = PEERS.get(id),
    f = (P.friends || []).find((q) => q.id === id);
  return (p && p.pr && p.pr.name) || (f && f.n) || (SOC.lq.get(id) || {}).n || "Someone";
};
SOC.send = (type, d) => NET.online && NET.send(type, d);
SOC.open = () => $("panel").style.display === "flex" && String(PKEY).indexOf("book:friends") === 0;
SOC.re = () => {
  if (SOC.open()) panel("book", "friends");
};
SOC.close = () => {
  if ($("panel").style.display === "flex") $("pc").onclick();
};
// ---------- a small Yes / No card for invites that arrive while you play ----------
SOC.pop = (html, yes, no, onYes, onNo) => {
  let d = $("socpop");
  if (!d) {
    d = document.createElement("div");
    d.id = "socpop";
    d.style.cssText =
      "position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:60;background:rgba(24,16,40,.94);" +
      "border:2px solid #e8c777;border-radius:12px;padding:10px 14px;color:#f3ecff;font:600 13px system-ui;" +
      "display:none;gap:8px;align-items:center;box-shadow:0 6px 24px rgba(0,0,0,.5);max-width:92vw";
    document.body.appendChild(d);
  }
  d.innerHTML = "<span>" + html + "</span>";
  const b = (t, f) => {
    const e = document.createElement("button");
    e.className = "pb";
    e.textContent = t;
    e.onclick = () => {
      d.style.display = "none";
      clearTimeout(SOC.popT);
      f && f();
    };
    d.appendChild(e);
  };
  b(yes, onYes);
  b(no, onNo);
  d.style.display = "flex";
  clearTimeout(SOC.popT);
  SOC.popT = setTimeout(() => (d.style.display = "none"), 25000);
};
// ---------- friends ----------
// a friend is saved as {id, n, lv, cls, seen}: id = their character's stable P.id (the same every session), the rest
// is what they looked like the last time they were online, so the list still reads well while they're away
SOC.addF = (id, n) => {
  if (!P.friends) P.friends = [];
  if (!SOC.isF(id)) P.friends.push({ id, n });
  const f = P.friends.find((q) => q.id === id),
    p = PEERS.get(id);
  f.n = n || f.n;
  if (p && p.pr) Object.assign(f, { lv: p.pr.lvl, cls: p.pr.cls, seen: Date.now() });
  P.fwant = (P.fwant || []).filter((w) => w !== String(f.n).toLowerCase());
  sv();
};
SOC.unF = (id) => {
  P.friends = (P.friends || []).filter((q) => q.id !== id);
  SOC.del = null;
  sv();
};
// add by name: asks them now if they're online, otherwise the next time someone with that name shows up
SOC.addName = (nm) => {
  nm = String(nm || "")
    .trim()
    .slice(0, 24);
  if (!nm) return;
  const lo = nm.toLowerCase();
  if (lo === String(P.name).toLowerCase()) return toast("That's you!");
  if ((P.friends || []).some((f) => String(f.n).toLowerCase() === lo)) return toast(nm + " is already your friend.");
  const hit = [...PEERS.entries()].find(([, p]) => p.pr && String(p.pr.name).toLowerCase() === lo);
  if (hit) return SOC.ask(hit[0]);
  if (!P.fwant) P.fwant = [];
  if (!P.fwant.includes(lo)) P.fwant.push(lo);
  sv();
  toast(nm + " isn't online. A friend request goes out when they are.", "#9fe8ff");
  SOC.re();
};
// every tick: keep online friends' saved name / level / school / last seen fresh, and send waiting add-by-name requests
SOC.fT = 0;
SOC.fTick = () => {
  if (!NET.online || !P.friends) return;
  const now = Date.now();
  let ch = false;
  P.friends.forEach((f) => {
    const p = PEERS.get(f.id);
    if (!p || !p.pr) return;
    if (p.pr.name && p.pr.name !== f.n) (f.n = p.pr.name), (ch = true);
    if (p.pr.lvl !== f.lv || p.pr.cls !== f.cls) (f.lv = p.pr.lvl), (f.cls = p.pr.cls), (ch = true);
    if (!f.seen || now - f.seen > 60000) (f.seen = now), (ch = true);
  });
  if ((P.fwant || []).length)
    PEERS.forEach((p, id) => {
      const lo = p.pr && String(p.pr.name || "").toLowerCase();
      if (!lo || !P.fwant.includes(lo)) return;
      P.fwant = P.fwant.filter((w) => w !== lo);
      ch = true;
      if (!SOC.isF(id) && !SOC.sent.has(id)) SOC.ask(id);
    });
  if (ch) sv();
};
SOC.ago = (t) => {
  if (!t) return "";
  const m = Math.round((Date.now() - t) / 60000);
  return m < 2
    ? "just now"
    : m < 60
      ? m + " min ago"
      : m < 2880
        ? Math.round(m / 60) + " h ago"
        : Math.round(m / 1440) + " days ago";
};
SOC.ask = (id) => {
  if (SOC.req.has(id)) return SOC.accF(id);
  SOC.sent.add(id);
  SOC.send("freq", { to: id, n: P.name });
  toast("Friend request sent to " + SOC.name(id), "#9fe8ff");
  SOC.re();
};
SOC.accF = (id) => {
  const n = SOC.req.get(id) || SOC.name(id);
  SOC.req.delete(id);
  SOC.addF(id, n);
  SOC.send("facc", { to: id, n: P.name });
  toast(n + " is now your friend", "#9affc8");
  SOC.re();
};
NET.on("freq", (d, from) => {
  if (!d || d.to !== P.id) return;
  if (SOC.isF(from) || SOC.sent.has(from)) {
    SOC.req.set(from, d.n);
    return SOC.accF(from);
  }
  SOC.req.set(from, d.n);
  SOC.pop(
    "<b>" + SOC.esc(d.n) + "</b> wants to be friends",
    "Accept",
    "Not now",
    () => SOC.accF(from),
    () => {
      SOC.req.delete(from);
      SOC.re();
    },
  );
  SOC.re();
});
NET.on("facc", (d, from) => {
  if (!d || d.to !== P.id || !SOC.sent.has(from)) return;
  SOC.sent.delete(from);
  SOC.addF(from, d.n);
  toast(d.n + " accepted your friend request", "#9affc8");
  SOC.re();
});
// ---------- teams (up to 4) ----------
SOC.teamSend = () => SOC.lead() && SOC.send("team", { lead: P.id, ids: SOC.team.ids });
SOC.invite = (id) => {
  if (SOC.team && !SOC.lead()) return toast("Only your team's leader can invite.");
  if (SOC.team && SOC.team.ids.length >= 4) return toast("Your team is full (4).");
  SOC.send("tinv", { to: id, n: P.name });
  toast("Team invite sent to " + SOC.name(id), "#ffd27a");
};
SOC.join = (lead) => {
  SOC.inv = null;
  if (SOC.team) SOC.leave(1);
  SOC.send("tacc", { to: lead, n: P.name });
  SOC.re();
};
SOC.leave = (quiet) => {
  if (!SOC.team) return;
  if (SOC.lead()) SOC.send("team", { lead: P.id, ids: [] });
  else SOC.send("tleave", { to: SOC.team.lead });
  SOC.team = null;
  if (!quiet) toast("You left the team");
  SOC.re();
};
SOC.drop = (id) => {
  if (!SOC.lead()) return;
  SOC.team.ids = SOC.team.ids.filter((q) => q !== id);
  SOC.teamSend();
  if (SOC.team.ids.length < 2) SOC.team = null;
  SOC.re();
};
NET.on("tinv", (d, from) => {
  if (!d || d.to !== P.id || SOC.inT(from)) return;
  SOC.inv = { lead: from, n: d.n };
  SOC.pop(
    "<b>" + SOC.esc(d.n) + "</b> invites you to their team",
    "Join",
    "No thanks",
    () => SOC.join(from),
    () => {
      SOC.inv = null;
      SOC.re();
    },
  );
  SOC.re();
});
NET.on("tacc", (d, from) => {
  if (!d || d.to !== P.id) return;
  if (SOC.team && !SOC.lead()) return;
  if (!SOC.team) SOC.team = { lead: P.id, ids: [P.id] };
  if (SOC.team.ids.length >= 4 && !SOC.team.ids.includes(from)) return toast("Your team is full (4).");
  if (!SOC.team.ids.includes(from)) SOC.team.ids.push(from);
  SOC.teamSend();
  toast(d.n + " joined your team", "#ffd27a");
  SOC.re();
});
NET.on("team", (d, from) => {
  if (!d || d.lead !== from) return;
  if (d.ids && d.ids.includes(P.id) && d.ids.length > 1) {
    const fresh = !SOC.team || SOC.team.lead !== from;
    if (SOC.team && SOC.lead() && fresh) SOC.leave(1); // you were leading another team: hand it over and switch
    SOC.team = { lead: from, ids: d.ids.slice(0, 4) };
    if (fresh) toast("You joined " + SOC.name(from) + "'s team", "#ffd27a");
    SOC.re();
  } else if (SOC.team && SOC.team.lead === from) {
    SOC.team = null;
    toast("Your team broke up");
    SOC.re();
  }
});
NET.on("tleave", (d, from) => {
  if (d && d.to === P.id && SOC.inT(from)) {
    toast(SOC.name(from) + " left the team");
    SOC.drop(from);
  }
});
// teleport next to a friend or teammate (just behind them, facing the same way)
SOC.tpTo = (id) => {
  const p = PEERS.get(id);
  if (!p) return toast("They aren't online right now.");
  if (!SOC.inT(id) && !SOC.isF(id)) return toast("Add them as a friend or team up first to teleport to them.");
  if (mode !== "explore") return toast("You can only teleport while exploring.");
  const ry = p.ry || 0;
  SOC.close();
  tp({ to: [p.tx - Math.sin(ry) * 1.8, p.tz - Math.cos(ry) * 1.8, ry] });
  toast("Teleported to " + SOC.name(id), "#9fe8ff");
};
// v20: the battle someone is fighting in right now (from the hosts' 'bstate' snapshots), or null
SOC.bOf = (id) => {
  const now = performance.now();
  for (const [b, o] of OPENB)
    if (o.s && now - o.t < BSTALE && (o.host === id || o.s.heroes.some((h) => h.id === id))) return { b, o };
  return null;
};
// what an online player is up to, for the friends list
SOC.doing = (id) => {
  const p = PEERS.get(id);
  if (!p) return "";
  const q = SOC.lq.get(id);
  if (SOC.bOf(id)) return "in a battle";
  if (q && DUN[q.d]) return "in line for " + DUN[q.d].n;
  const z = zoneAt(p.tx, p.tz);
  return z === "dun"
    ? "in " + DUN[dunIdx(p.tx)].n
    : z === "tower"
      ? "in the Gloomspire"
      : z === "hub"
        ? "around Duskwick"
        : ZN[z]
          ? "in " + ZN[z]
          : "";
};
// v20 "Join": go to a friend (or teammate) from anywhere. If they are in a battle with room, you step straight into it;
// if they are lined up for a dungeon, you land at its door and join the line-up; otherwise you appear beside them.
SOC.joinF = (id) => {
  const p = PEERS.get(id);
  if (!p) return toast("They aren't online right now.");
  if (!SOC.inT(id) && !SOC.isF(id)) return toast("Add them as a friend or team up first.");
  if (mode !== "explore") return toast("You can only join someone while exploring.");
  if (zoneAt(p.tx, p.tz) === "dun") {
    const di = dunIdx(p.tx),
      m = SOC.dLock(di);
    if (m) return toast(m + " to follow them into " + DUN[di].n + ".");
  }
  const bt = SOC.bOf(id),
    q = SOC.lq.get(id),
    n = SOC.name(id);
  if (bt && bt.o.s.open && !bt.o.skip) {
    const s = bt.o.s;
    SOC.close();
    tp({ to: [s.x + Math.sin(s.r) * 10, s.z + Math.cos(s.r) * 10, s.r + Math.PI] });
    guestJoin(bt.b, bt.o);
    return toast("Joining " + n + "'s battle", "#9fe8ff");
  }
  if (!bt && q && DUN[q.d] && !SOC.dLock(q.d)) {
    const D = DUN[q.d];
    SOC.close();
    tp({ to: [D.out[0], D.out[1], Math.atan2(D.door[0] - D.out[0], D.door[1] - D.out[1])] });
    const me = SOC.mine();
    if (!me || me.d !== q.d) SOC.lqJoin(q.d);
    return;
  }
  SOC.tpTo(id);
  if (bt) toast(n + "'s battle is full, so you wait beside it.");
};
// ---------- see what someone is wearing ----------
SOC.ask4gear = (id) => {
  SOC.view = "insp";
  SOC.insp = id;
  SOC.send("insp", { to: id });
  SOC.re();
};
NET.on("insp", (d, from) => {
  if (!d || d.to !== P.id) return;
  const g = {};
  GSL.forEach((s) => {
    const it = P.gear && P.gear[s];
    if (it) g[s] = { n: it.n, s: it.s, r: it.r, lv: it.lv, el: it.el, st: it.st, lk: it.lk };
  });
  SOC.send("inspR", { to: from, n: P.name, lvl: P.lvl, cls: P.cls, g });
});
NET.on("inspR", (d, from) => {
  if (!d || d.to !== P.id) return;
  SOC.gear[from] = d;
  if (SOC.insp === from) SOC.re();
});
// ---------- dungeon line-ups ----------
SOC.dLock = (i) => {
  const D = DUN[i],
    rq = [9, 10, 12][i];
  return rq != null && !P.done[rq] ? 'Finish "' + QS[rq].n + '" first' : P.lvl < D.lv ? "Reach level " + D.lv : null;
};
SOC.mine = () => SOC.lq.get(P.id);
SOC.line = (i) =>
  [...SOC.lq.entries()]
    .filter(([id, e]) => e.d === i && (id === P.id || PEERS.has(id)))
    .sort((a, b) => a[1].t - b[1].t || (a[0] < b[0] ? -1 : 1));
SOC.lqSend = () => {
  const e = SOC.mine();
  SOC.send("lq", e ? { d: e.d, on: 1, n: P.name, lv: P.lvl, cls: P.cls, t: e.t } : { on: 0 });
};
SOC.lqJoin = (i) => {
  const m = SOC.dLock(i);
  if (m) return toast(m + " to line up for " + DUN[i].n + ".");
  const was = SOC.mine();
  if (was && was.d === i) return;
  SOC.lq.set(P.id, { d: i, n: P.name, lv: P.lvl, cls: P.cls, t: Date.now() });
  SOC.lqSend();
  toast("You're in line for " + DUN[i].n, "#c9b8ff");
  SOC.re();
  SOC.lqAuto(i);
};
SOC.lqLeave = () => {
  SOC.lq.delete(P.id);
  SOC.lqSend();
  SOC.re();
};
// the first in line sends the group in (it happens on its own once four are waiting)
SOC.lqGo = (i) => {
  const L = SOC.line(i);
  if (!L.length || L[0][0] !== P.id) return;
  const ids = L.slice(0, 4).map((e) => e[0]);
  SOC.send("lgo", { d: i, ids, lead: P.id });
  SOC.enter(i, ids, P.id);
};
SOC.lqAuto = (i) => {
  const L = SOC.line(i);
  if (L.length >= 4 && L[0][0] === P.id) SOC.lqGo(i);
};
SOC.enter = (i, ids, lead) => {
  const D = DUN[i];
  ids.forEach((id) => SOC.lq.delete(id));
  if (ids.length > 1) {
    if (SOC.team && SOC.team.lead !== lead) SOC.leave(1);
    SOC.team = { lead, ids: ids.slice() };
    if (lead === P.id) SOC.teamSend();
  }
  if (mode !== "explore") {
    toast("Your line-up went into " + D.n + ". Teleport to your team from Book > Friends.", "#c9b8ff");
    return SOC.re();
  }
  const k = Math.max(0, ids.indexOf(P.id));
  SOC.close();
  tp({ to: [D.bx + (k - (ids.length - 1) / 2) * 1.8, D.ez, Math.PI], on: () => dunReset(i) });
  toast(D.n + (ids.length > 1 ? ": good luck, team!" : ": good luck!"), "#c9b8ff");
};
NET.on("lq", (d, from) => {
  if (!d) return;
  if (d.on && DUN[d.d]) {
    const was = SOC.lq.get(from);
    SOC.lq.set(from, { d: d.d, n: d.n, lv: d.lv, cls: d.cls, t: d.t || Date.now(), seen: performance.now() });
    if (!was || was.d !== d.d) {
      const me = SOC.mine();
      if (me && me.d === d.d) toast(d.n + " joined your line-up", "#c9b8ff");
      SOC.lqAuto(d.d);
      SOC.re();
    }
  } else if (SOC.lq.delete(from)) SOC.re();
});
NET.on("lgo", (d, from) => {
  if (!d || !d.ids || !DUN[d.d]) return;
  if (d.ids.includes(P.id)) SOC.enter(d.d, d.ids, from);
  else {
    d.ids.forEach((id) => SOC.lq.delete(id));
    SOC.re();
  }
});
// ---------- v20: the line-up at each dungeon door ----------
// Four glowing spots in front of every dungeon door show who is lined up (★ = the leader, who sends the group in).
// Press E by the door (or use the chip) to line up / go in. Walking into the swirl: alone it works as before; with a
// line-up waiting you join it instead, and as the leader you lead everyone in.
SOC.dunPT = (i) => {
  const D = DUN[i];
  return PT.find((q) => q.sw && q.to && q.to[0] === D.bx && q.to[1] === D.ez);
};
SOC.nearDoor = () => {
  const p = W.position;
  return DUN.findIndex((D) => Math.hypot(p.x - D.door[0], p.z - D.door[1]) < 9);
};
SOC.doorGate = (i) => {
  const D = DUN[i],
    q = SOC.dunPT(i),
    p = W.position;
  if (!q || mode !== "explore" || Math.hypot(p.x - q.x, p.z - q.z) > (q.rad || 2.2) + 0.3) return null;
  const me = SOC.mine(),
    L = SOC.line(i),
    // step back out of the swirl toward the line-up spots so you aren't stuck in it
    back = () => {
      const dx = D.out[0] - q.x,
        dz = D.out[1] - q.z,
        l = Math.hypot(dx, dz) || 1,
        r = (q.rad || 2.2) + 0.9;
      p.x = q.x + (dx / l) * r;
      p.z = q.z + (dz / l) * r;
    };
  if (me && me.d === i) {
    if (L[0][0] === P.id) {
      if (L.length > 1) {
        SOC.lqGo(i);
        return "Leading your line-up into " + D.n + "...";
      }
      SOC.lqLeave(); // just you: walk in as usual
      return null;
    }
    back();
    return "Waiting for " + L[0][1].n + " to lead the line-up in (" + Math.min(4, L.length) + "/4).";
  }
  const others = L.filter((e) => e[0] !== P.id).length;
  if (others && others < 4) {
    back();
    SOC.lqJoin(i);
    return "You joined the line-up for " + D.n + ".";
  }
  if (me) SOC.lqLeave(); // you were lined up somewhere else
  return null;
};
SOC.gateUp = () => {
  if (SOC.gated) return;
  SOC.gated = 1;
  DUN.forEach((D, i) => {
    const q = SOC.dunPT(i);
    if (!q) return;
    const ol = q.lock;
    q.lock = () => (ol && ol()) || SOC.doorGate(i);
  });
};
// the spots and name plates (built the first time you are in the world, after the editor's scene snapshot)
SOC.spots = null;
SOC.plate = (sp, txt, col) => {
  if (sp.k === txt + col) return;
  sp.k = txt + col;
  const x = sp.cx;
  x.clearRect(0, 0, 512, 96);
  if (txt) {
    x.font = "800 40px system-ui";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.lineWidth = 8;
    x.lineJoin = "round";
    x.strokeStyle = "rgba(20,12,34,.9)";
    x.strokeText(txt, 256, 50, 480);
    x.fillStyle = col;
    x.fillText(txt, 256, 50, 480);
  }
  sp.tx.needsUpdate = true;
  sp.s.visible = !!txt;
};
SOC.spotsBuild = () => {
  SOC.spots = DUN.map((D) => {
    const dx = D.out[0] - D.door[0],
      dz = D.out[1] - D.door[1],
      l = Math.hypot(dx, dz) || 1,
      fx = dx / l,
      fz = dz / l,
      cx = D.out[0] + fx * 2.6,
      cz = D.out[1] + fz * 2.6,
      grp = new T.Group(),
      mk2 = (w, h, y) => {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 96;
        const tx = new T.CanvasTexture(c);
        tx.minFilter = T.LinearFilter;
        const s = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false }));
        s.scale.set(w, h, 1);
        s.position.y = y;
        return { s, tx, cx: c.getContext("2d"), k: null };
      };
    const head = mk2(5.2, 0.98, 3.3);
    head.s.position.set(cx, 3.3, cz);
    grp.add(head.s);
    const pads = [0, 1, 2, 3].map((k) => {
      const o = (k - 1.5) * 1.9,
        x = cx - fz * o,
        z = cz + fx * o,
        ring = new T.Mesh(
          new T.RingGeometry(0.5, 0.72, 32),
          new T.MeshBasicMaterial({ color: D.col, transparent: true, opacity: 0.25, depthWrite: false }),
        ),
        dot = new T.Mesh(
          new T.CircleGeometry(0.42, 24),
          new T.MeshBasicMaterial({ color: D.col, transparent: true, opacity: 0, depthWrite: false }),
        );
      ring.rotation.x = dot.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.07, z);
      dot.position.set(x, 0.08, z);
      const nm = mk2(3.6, 0.68, 1.9);
      nm.s.position.set(x, 1.9, z);
      grp.add(ring, dot, nm.s);
      return { ring, dot, nm };
    });
    grp.visible = false;
    S.add(grp);
    return { grp, head, pads, x: cx, z: cz };
  });
};
SOC.spotsTick = (s) => {
  if (!SOC.spots) SOC.spotsBuild();
  const p = W.position,
    me = SOC.mine();
  SOC.spots.forEach((V, i) => {
    const D = DUN[i],
      on = mode === "explore" && Math.hypot(p.x - V.x, p.z - V.z) < 70;
    V.grp.visible = on;
    if (!on) return;
    const L = SOC.line(i),
      lk = SOC.dLock(i);
    SOC.plate(
      V.head,
      lk ? D.n + " · locked" : "Line-up " + Math.min(4, L.length) + "/4" + (me && me.d === i ? "" : " · E to join"),
      lk ? "#a89cc0" : "#" + D.col.toString(16).padStart(6, "0"),
    );
    V.pads.forEach((pd, k) => {
      const e = L[k],
        pulse = 0.55 + 0.25 * Math.sin(s * 3 + k);
      pd.ring.material.opacity = e ? 0.85 : 0.22;
      pd.dot.material.opacity = e ? pulse * 0.6 : 0;
      SOC.plate(
        pd.nm,
        e ? (k === 0 ? "★ " : "") + (e[0] === P.id ? "You" : e[1].n) : "",
        e && e[0] === P.id ? "#ffd27a" : "#f3ecff",
      );
    });
  });
};
// E by a dungeon door: line up, or (as the leader) take the group in
SOC.doorKey = () => {
  if (mode !== "explore" || paused || window.__ln || window.__ch || window.__np) return false;
  const i = SOC.nearDoor();
  if (i < 0) return false;
  const me = SOC.mine();
  if (me && me.d === i) {
    if (SOC.line(i)[0][0] === P.id) SOC.lqGo(i);
    else toast("Waiting for " + SOC.line(i)[0][1].n + " to lead the line-up in.", "#c9b8ff");
  } else SOC.lqJoin(i);
  return true;
};
addEventListener("keydown", (e) => {
  if (e.key && e.key.toLowerCase() === "e" && !e.repeat && typeof SLOT !== "undefined" && SLOT >= 0 && SOC.doorKey())
    keys.e = 0; // a tap by the door shouldn't also turn the camera
});
NET.on("bye", (d, from) => {
  SOC.lq.delete(from);
  if (SOC.team && SOC.inT(from)) {
    if (SOC.team.lead === from) {
      SOC.team = null;
      toast("Your team's leader left, so the team broke up");
    } else if (SOC.lead()) SOC.drop(from);
  }
  SOC.re();
});
// ---------- name tags over every player: school badge + name (gold = teammate, blue = friend) ----------
// the school's symbol drawn in a round badge of its colour: Pyre flame, Gale bolt, Rimeward snowflake,
// Verdant leaf, Wispcaller wisp (a plain star for no school yet)
SOC.icon = (x, cls, cx, cy, r) => {
  const col = CL[cls] ? "#" + CL[cls][0].toString(16).padStart(6, "0") : "#c9c0e0";
  x.save();
  x.translate(cx, cy);
  x.beginPath();
  x.arc(0, 0, r, 0, 7);
  x.fillStyle = "rgba(20,12,34,.92)";
  x.fill();
  x.lineWidth = r * 0.16;
  x.strokeStyle = col;
  x.stroke();
  x.fillStyle = x.strokeStyle = col;
  x.lineJoin = x.lineCap = "round";
  const s = r / 32;
  x.scale(s, s);
  x.beginPath();
  if (cls === "pyre") {
    x.moveTo(0, -20);
    x.bezierCurveTo(14, -6, 16, 6, 12, 12);
    x.bezierCurveTo(8, 20, -8, 20, -12, 12);
    x.bezierCurveTo(-16, 4, -10, -4, -6, -8);
    x.bezierCurveTo(-6, -2, -2, 2, 0, 2);
    x.bezierCurveTo(2, -6, -2, -14, 0, -20);
    x.fill();
  } else if (cls === "gale") {
    x.moveTo(5, -21);
    x.lineTo(-10, 3);
    x.lineTo(0, 3);
    x.lineTo(-5, 21);
    x.lineTo(11, -4);
    x.lineTo(1, -4);
    x.closePath();
    x.fill();
  } else if (cls === "rime") {
    x.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      x.save();
      x.rotate((i * Math.PI) / 3);
      x.moveTo(0, 0);
      x.lineTo(0, -19);
      x.moveTo(0, -11);
      x.lineTo(-6, -16);
      x.moveTo(0, -11);
      x.lineTo(6, -16);
      x.restore();
    }
    x.stroke();
  } else if (cls === "verdant") {
    x.moveTo(-14, 16);
    x.bezierCurveTo(-18, -6, 0, -18, 17, -17);
    x.bezierCurveTo(16, 2, 4, 18, -14, 16);
    x.fill();
    x.beginPath();
    x.strokeStyle = "rgba(20,12,34,.9)";
    x.lineWidth = 3;
    x.moveTo(-14, 16);
    x.lineTo(9, -8);
    x.stroke();
  } else if (cls === "spirit") {
    x.arc(0, -5, 12, Math.PI, 0);
    x.lineTo(12, 14);
    x.lineTo(6, 9);
    x.lineTo(0, 14);
    x.lineTo(-6, 9);
    x.lineTo(-12, 14);
    x.closePath();
    x.fill();
    x.beginPath();
    x.fillStyle = "rgba(20,12,34,.95)";
    x.arc(-5, -5, 3, 0, 7);
    x.moveTo(8, -5);
    x.arc(5, -5, 3, 0, 7);
    x.fill();
  } else {
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2,
        rr2 = i % 2 ? 8 : 18;
      x.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2);
    }
    x.closePath();
    x.fill();
  }
  x.restore();
};
SOC.tag = (txt, col, cls) => {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const x = c.getContext("2d");
  x.font = "800 40px system-ui";
  if (x.measureText(txt).width > 400) x.font = "800 30px system-ui";
  const tw = Math.min(400, x.measureText(txt).width),
    r = 30,
    gap = 10,
    x0 = 256 - (r * 2 + gap + tw) / 2;
  SOC.icon(x, cls, x0 + r, 48, r);
  x.textAlign = "left";
  x.textBaseline = "middle";
  x.lineWidth = 8;
  x.lineJoin = "round";
  x.strokeStyle = "rgba(20,12,34,.9)";
  x.strokeText(txt, x0 + r * 2 + gap, 50, 400);
  x.fillStyle = col;
  x.fillText(txt, x0 + r * 2 + gap, 50, 400);
  const t = new T.CanvasTexture(c);
  t.minFilter = T.LinearFilter;
  const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(4.6, 0.86, 1);
  s.position.y = 5.3;
  return s;
};
SOC.tags = () => {
  PEERS.forEach((p, id) => {
    const tm = SOC.inT(id),
      fr = SOC.isF(id),
      pr = p.pr || {},
      want = (tm ? "★ " : "") + (pr.name || "Lamplighter") + "|" + (tm ? 2 : fr ? 1 : 0) + "|" + (pr.cls || ""),
      u = p.o.userData;
    if (u.stagK === want) return;
    if (u.stag) {
      p.o.remove(u.stag);
      u.stag.material.map.dispose();
      u.stag.material.dispose();
      u.stag = null;
    }
    u.stagK = want;
    p.o.add((u.stag = SOC.tag(want.split("|")[0], tm ? "#ffd27a" : fr ? "#9fe8ff" : "#f3ecff", pr.cls)));
  });
};
// ---------- the chip by a dungeon door (or while you're in line) ----------
// v20: a small card with the line-up's state and its buttons (Line up / Go in / Leave / Line-ups page)
SOC.chip = () => {
  let c = $("socchip");
  if (!c) {
    c = document.createElement("div");
    c.id = "socchip";
    c.style.cssText =
      "position:fixed;left:50%;bottom:118px;transform:translateX(-50%);z-index:30;display:none;align-items:center;" +
      "gap:8px;background:rgba(24,16,40,.92);border:2px solid #c9b8ff;border-radius:12px;padding:6px 8px 6px 12px;" +
      "color:#f3ecff;font:600 13px system-ui;box-shadow:0 0 14px rgba(201,184,255,.45);max-width:94vw;flex-wrap:wrap;" +
      "justify-content:center";
    document.body.appendChild(c);
  }
  return c;
};
SOC.chipSet = (txt, bs) => {
  const c = SOC.chip(),
    k = txt + "|" + bs.map((b) => b[0]).join("|");
  c.style.display = txt ? "flex" : "none";
  if (c.dataset.k === k) return;
  c.dataset.k = k;
  c.innerHTML = "<span>" + SOC.esc(txt) + "</span>";
  bs.forEach(([t, f]) => {
    const b = document.createElement("button");
    b.className = "pb";
    b.style.cssText = "min-height:28px;padding:3px 10px;font-size:12px";
    b.textContent = t;
    b.onclick = () => {
      if (mode === "explore" && !paused) f();
    };
    c.appendChild(b);
  });
};
SOC.tick = () => {
  if (typeof SLOT === "undefined" || SLOT < 0 || !P) return;
  if (NET.online) SOC.tags();
  SOC.gateUp();
  SOC.spotsTick(performance.now() / 1000);
  SOC.fTick();
  const me = SOC.mine(),
    page = () => {
      SOC.view = "lineup";
      panel("book", "friends");
    };
  let txt = "",
    bs = [];
  if (mode === "explore" && !paused) {
    const i = SOC.nearDoor();
    if (me) {
      const L = SOC.line(me.d),
        lead = L.length && L[0][0] === P.id;
      txt =
        DUN[me.d].n +
        " line-up " +
        Math.min(4, L.length) +
        "/4" +
        (lead ? (L.length > 1 ? " · you lead" : "") : " · waiting for " + (L[0] ? L[0][1].n : "the leader"));
      if (lead) bs.push([(i === me.d ? "[E] " : "") + "Go in", () => SOC.lqGo(me.d)]);
      bs.push(["Leave", SOC.lqLeave], ["⋯", page]);
    } else if (i >= 0) {
      const L = SOC.line(i),
        lk = SOC.dLock(i);
      txt = DUN[i].n + " line-up " + Math.min(4, L.length) + "/4" + (lk ? " · " + lk : "");
      if (!lk) bs.push(["[E] Line up", () => SOC.lqJoin(i)]);
      bs.push(["⋯", page]);
    }
  }
  SOC.chipSet(txt, bs);
  // the Friends page redraws only when something on it changed
  if (SOC.open()) {
    const sig = JSON.stringify([
      [...PEERS.keys()],
      SOC.team,
      [...SOC.lq.entries()].map((e) => [e[0], e[1].d]),
      [...SOC.req.keys()],
      SOC.inv,
    ]);
    if (sig !== SOC.sig) {
      SOC.sig = sig;
      SOC.re();
    }
  }
};
setInterval(SOC.tick, 250);
// keep your line-up spot and your team's roster fresh for players who connect later; forget silent line-up entries
setInterval(() => {
  if (!NET.online || SLOT < 0) return;
  if (SOC.mine()) SOC.lqSend();
  SOC.teamSend();
  const now = performance.now();
  SOC.lq.forEach((e, id) => {
    if (id !== P.id && now - e.seen > 13000) SOC.lq.delete(id);
  });
  const me = SOC.mine();
  if (me) SOC.lqAuto(me.d);
}, 4000);
// ---------- Book > Friends ----------
function socialTab(L, row, btn) {
  const E = SOC.esc,
    re = () => panel("book", "friends"),
    bar = (...bs) => {
      const d = document.createElement("div");
      d.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end";
      bs.filter(Boolean).forEach((b) => d.appendChild(b));
      return d;
    },
    who = (id, pr, seen) => {
      const on = PEERS.has(id),
        c = pr && pr.cls && CL[pr.cls] ? CL[pr.cls][1] : "",
        dn = on ? SOC.doing(id) : "";
      return (
        '<span style="color:' +
        (on ? "#7dff9a" : "#7a7090") +
        '">●</span> <b>' +
        E(pr ? pr.name : SOC.name(id)) +
        "</b>" +
        (pr
          ? "<small>" +
            (pr.lvl != null && pr.lvl !== "?" ? "Level " + pr.lvl : "") +
            (c ? " " + c : "") +
            (on
              ? ' · <span style="color:#7dff9a">online</span>' + (dn ? " · " + E(dn) : "")
              : " · offline" + (seen ? " · seen " + SOC.ago(seen) : "")) +
            "</small>"
          : "")
      );
    };
  SOC.sig = "";
  if (SOC.view === "insp" && !SOC.insp) SOC.view = "friends";
  // page switcher: a second row under the Book's tabs
  {
    const sw = document.createElement("div");
    sw.className = "tsub";
    const nOn = (P.friends || []).filter((f) => PEERS.has(f.id)).length,
      me = SOC.mine();
    [
      ["friends", "Friends" + (nOn ? " (" + nOn + " online)" : "") + (SOC.req.size ? " ●" : "")],
      ["lineup", "Dungeon line-ups" + (me ? " ●" : "")],
    ].forEach(([v, t]) => {
      const b = document.createElement("button");
      b.textContent = t;
      if (SOC.view === v || (v === "friends" && SOC.view === "insp")) b.className = "on";
      b.onclick = () => {
        SOC.view = v;
        re();
      };
      sw.appendChild(b);
    });
    $("tabs").appendChild(sw);
  }
  if (!NET.online)
    row(
      "<div><b>Playing solo</b><small>To play with others, run start-server.bat and open the address it shows " +
        "(everyone on the same server sees each other). Your friends list is kept for next time.</small></div>",
    );
  // ---- someone's gear ----
  if (SOC.view === "insp") {
    const id = SOC.insp,
      d = SOC.gear[id];
    row(
      "<div><b>" + E(SOC.name(id)) + "'s gear</b><small>" + (d ? "" : "Asking them...") + "</small></div>",
      btn("Back", false, () => {
        SOC.view = "friends";
        SOC.insp = null;
        re();
      }),
    );
    if (d) {
      row(
        "<div><small>Level " +
          d.lvl +
          (d.cls && CL[d.cls] ? " " + CL[d.cls][1] : "") +
          (Object.keys(d.g || {}).length
            ? "  ·  " +
              statTxt(
                GSL.reduce((t, s) => {
                  const it = d.g[s];
                  if (it) for (const k in it.st) t[k] = (t[k] || 0) + it.st[k];
                  return t;
                }, {}),
                "  ·  ",
              )
            : "") +
          "</small></div>",
      );
      GSL.forEach((s) => {
        const it = d.g && d.g[s],
          ic = gIcon(it || { s, r: -1 });
        row(
          '<img alt="" src="' +
            ic +
            '"><div><b style="color:' +
            (it ? RAR[it.r].c : "#8a7a5a") +
            '">' +
            (it ? E(it.n) : GSN[s] + ": empty") +
            "</b><small>" +
            (it
              ? GSN[s] +
                "  ·  Lv " +
                it.lv +
                "  ·  " +
                RAR[it.r].n +
                (statTxt(it.st || {}) ? "  ·  " + statTxt(it.st) : "") +
                (itemStyle(it) ? "  ·  " + E(itemStyle(it)) : "")
              : "") +
            "</small></div>",
        );
      });
    }
    return;
  }
  // ---- dungeon line-ups ----
  if (SOC.view === "lineup") {
    row(
      "<div><b>Dungeon line-ups</b><small>Line up here from anywhere, or press E by a dungeon door (its four spots " +
        "show who's waiting). The first in line (★) sends the group in, up to 4; it goes on its own once four are " +
        "waiting. Everyone goes in together as a team.</small></div>",
    );
    const me = SOC.mine();
    DUN.forEach((D, i) => {
      const lk = SOC.dLock(i),
        Lq = SOC.line(i),
        mine = me && me.d === i,
        first = Lq.length && Lq[0][0] === P.id,
        names = Lq.map(
          ([id, e], k) => (k === 0 ? "★ " : "") + E(id === P.id ? "You" : e.n) + " (Lv " + e.lv + ")",
        ).join(", ");
      row(
        '<div><b><span style="color:#' +
          D.col.toString(16).padStart(6, "0") +
          '">◆</span> ' +
          D.n +
          "  Lv " +
          D.lv +
          "</b><small>" +
          (lk ? "Locked: " + lk : Lq.length ? Lq.length + "/4 in line: " + names : "Nobody in line yet") +
          "</small></div>",
        bar(
          mine && first ? btn("Go in (" + Lq.length + "/4)", false, () => SOC.lqGo(i)) : null,
          mine ? btn("Leave line", false, SOC.lqLeave) : btn("Line up", !!lk || !!me, () => SOC.lqJoin(i)),
        ),
      );
    });
    return;
  }
  // ---- friends & team ----
  L.insertAdjacentHTML("beforeend", '<div class="sec">Team</div>');
  if (SOC.team) {
    SOC.team.ids.forEach((id) => {
      const self = id === P.id,
        p = PEERS.get(id),
        star = id === SOC.team.lead ? '<span style="color:#ffd27a">★</span> ' : "";
      row(
        "<div>" +
          star +
          (self
            ? "<b>" +
              E(P.name) +
              " (you)</b><small>Level " +
              P.lvl +
              (P.cls && CL[P.cls] ? " " + CL[P.cls][1] : "") +
              "</small>"
            : who(id, p ? p.pr : null)) +
          "</div>",
        self
          ? btn(SOC.lead() ? "Disband" : "Leave team", false, () => SOC.leave())
          : bar(
              btn("Join", !p || mode !== "explore", () => SOC.joinF(id)),
              p ? btn("Gear", false, () => SOC.ask4gear(id)) : null,
              SOC.lead() ? btn("Remove", false, () => SOC.drop(id)) : null,
            ),
      );
    });
  } else
    row(
      "<div><small>You're not on a team. Invite a friend or another player below: teammates can teleport to " +
        "each other, and dungeon line-ups make a team for you.</small></div>",
    );
  if (SOC.inv)
    row(
      "<div><b>" + E(SOC.inv.n) + " invited you to their team</b></div>",
      bar(
        btn("Join", false, () => SOC.join(SOC.inv.lead)),
        btn("No", false, () => {
          SOC.inv = null;
          re();
        }),
      ),
    );
  if (SOC.req.size) {
    L.insertAdjacentHTML("beforeend", '<div class="sec">Friend requests</div>');
    SOC.req.forEach((n, id) =>
      row(
        "<div><b>" + E(n) + "</b><small>wants to be friends</small></div>",
        bar(
          btn("Accept", false, () => SOC.accF(id)),
          btn("Decline", false, () => {
            SOC.req.delete(id);
            re();
          }),
        ),
      ),
    );
  }
  const canInv = (id) =>
    NET.online && PEERS.has(id) && !SOC.inT(id) && (!SOC.team || (SOC.lead() && SOC.team.ids.length < 4));
  const nOn = P.friends.filter((f) => PEERS.has(f.id)).length;
  L.insertAdjacentHTML("beforeend", '<div class="sec">Friends (' + nOn + " online / " + P.friends.length + ")</div>");
  // add a friend by name
  {
    const r = document.createElement("div");
    r.className = "row";
    r.innerHTML =
      '<div><input id="socadd" maxlength="24" placeholder="Add a friend by name" style="width:100%;box-sizing:border-box;' +
      'padding:7px 9px;border-radius:8px;border:1px solid #6a5424;background:#1c140c;color:#f3ecff;font:14px system-ui">' +
      ((P.fwant || []).length
        ? "<small>Waiting to ask: " +
          P.fwant.map(E).join(", ") +
          ' <a href="#" id="socwclr" style="color:#c9b8ff">clear</a></small>'
        : "") +
      "</div>";
    const go = () => {
      const i = $("socadd");
      SOC.addName(i.value);
      i.value = "";
    };
    r.appendChild(btn("Add", false, go));
    L.appendChild(r);
    const inp = r.querySelector("#socadd");
    inp.onkeydown = (e) => {
      e.stopPropagation(); // typing a name mustn't walk you around
      if (e.key === "Enter") go();
    };
    inp.onkeyup = (e) => e.stopPropagation();
    const cl = r.querySelector("#socwclr");
    if (cl)
      cl.onclick = (e) => {
        e.preventDefault();
        P.fwant = [];
        sv();
        re();
      };
  }
  if (!P.friends.length)
    row("<div><small>No friends yet. Add players you meet from the list below, or by name above.</small></div>");
  P.friends
    .slice()
    .sort((a, b) => PEERS.has(b.id) - PEERS.has(a.id) || (b.seen || 0) - (a.seen || 0))
    .forEach((f) => {
      const p = PEERS.get(f.id);
      row(
        "<div>" + who(f.id, p && p.pr ? p.pr : { name: f.n, lvl: f.lv, cls: f.cls }, f.seen) + "</div>",
        bar(
          p ? btn("Join", mode !== "explore", () => SOC.joinF(f.id)) : null,
          canInv(f.id) ? btn("Invite", false, () => SOC.invite(f.id)) : null,
          p ? btn("Gear", false, () => SOC.ask4gear(f.id)) : null,
          btn(SOC.del === f.id ? "Sure?" : "Remove", false, () => {
            if (SOC.del !== f.id) SOC.del = f.id;
            else SOC.unF(f.id);
            re();
          }),
        ),
      );
    });
  const others = [...PEERS.entries()].filter(([id]) => !SOC.isF(id));
  if (NET.online) {
    L.insertAdjacentHTML("beforeend", '<div class="sec">Other players online (' + others.length + ")</div>");
    if (!others.length) row("<div><small>Nobody else is on the server right now.</small></div>");
    others.forEach(([id, p]) =>
      row(
        "<div>" + who(id, p.pr) + "</div>",
        bar(
          btn(
            SOC.req.has(id) ? "Accept friend" : SOC.sent.has(id) ? "Request sent" : "Add friend",
            SOC.sent.has(id),
            () => SOC.ask(id),
          ),
          canInv(id) ? btn("Invite", false, () => SOC.invite(id)) : null,
          SOC.inT(id) ? btn("Join", mode !== "explore", () => SOC.joinF(id)) : null,
          btn("Gear", false, () => SOC.ask4gear(id)),
        ),
      ),
    );
  }
}
