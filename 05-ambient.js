// DUSKWICK - 05-ambient.js: Ambient life: smoke, townsfolk, critters, weather, wards, NPC marks (ambient()).
// Loaded in order by index.html as plain scripts; they share one global scope.
// chimney smoke / steam: a small pooled set of soft sprites
const SMT = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d"),
    q = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  q.addColorStop(0, "rgba(255,255,255,.55)");
  q.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = q;
  x.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
})();
const PUFFS = [];
for (let i = 0; i < 90; i++) {
  const m = new T.Sprite(new T.SpriteMaterial({ map: SMT, transparent: true, depthWrite: false, opacity: 0 }));
  m.visible = false;
  S.add(m);
  PUFFS.push({ m, t: 9 });
}
let puffI = 0;
const MTC = new T.Vector3(); // mountain ring centre; skyFit() (11-explore.js) places MTG from it each frame
function ambient(dt, s, p) {
  MTC.set(p.x, 0, p.z);
  WM.forEach((w) => (w.rotation.z += dt * 0.7));
  WTX.forEach((t) => (t.offset.y -= dt * 0.22));
  FIRES.forEach((f, i) => f.scale.setScalar(2.1 + Math.sin(s * 9 + i) * 0.18 + Math.sin(s * 23) * 0.08));
  BOB.forEach(
    (b) => (b.position.y = 0.2 + Math.max(0, Math.sin(s * 1.7)) * 0.04 - (Math.sin(s * 0.37) > 0.97 ? 0.08 : 0)),
  );
  // townsfolk turn to face you, wave and speak; shopkeepers call out a greeting before you reach them
  if (mode === "explore" && !paused) {
    for (const t of TALK) {
      // v46: the spot follows the model (moved with its land by 64a, or in the world editor)
      if (t.o && t.o.parent && (t.o.parent === S || /^zone:/.test(t.o.parent.name || ""))) {
        t.x = t.o.position.x;
        t.z = t.o.position.z;
      }
      const d = Math.hypot(p.x - t.x, p.z - t.z);
      if (d > 45) continue;
      npcAnim(t, d, s, p);
      bubble(t, d, t.lines, 4.1, 7, s);
    }
    for (const n of NPCS) {
      const gl = GREET[n.kind + n.id];
      if (!gl) continue;
      const d = Math.hypot(p.x - n.x, p.z - n.z);
      bubble(n, d > 3.8 ? d : 99, gl, 5.5, 6.5, s);
    }
  } else
    TALK.forEach((t) => {
      if (t.b) t.b.visible = false;
    });
  // critters: pigeons scatter into the air, hares bolt, the cat wanders the square
  for (const c of CRIT) {
    const q = c.o.position;
    if (c.st !== 2 && (Math.abs(q.x - p.x) > 60 || Math.abs(q.z - p.z) > 60)) continue;
    const d = Math.hypot(p.x - q.x, p.z - q.z),
      pt = c.pt;
    c.t -= dt;
    if (c.st === 0) {
      if (c.kind !== "cat" && d < 3.6 && mode === "explore") {
        c.st = 1;
        const l = d || 1,
          sp = c.kind === "bird" ? 4.5 : 7;
        c.vx = ((q.x - p.x) / l) * sp;
        c.vz = ((q.z - p.z) / l) * sp;
        c.vy = c.kind === "bird" ? 3.5 : 0;
        c.t = c.kind === "bird" ? 3 : 1.4;
        c.o.rotation.y = Math.atan2(c.vx, c.vz);
        continue;
      }
      if (c.kind === "bird") {
        pt.hd.rotation.x = Math.max(0, Math.sin(s * 5 + c.hx)) > 0.8 ? 0.9 : 0;
        pt.w.forEach((w) => (w.rotation.z = 0));
        if (c.t < 0) {
          c.t = 1 + Math.random() * 2;
          c.tx = c.hx + rr(-0.6, 0.6);
          c.tz = c.hz + rr(-0.6, 0.6);
        }
        const dx = c.tx - q.x,
          dz = c.tz - q.z,
          l = Math.hypot(dx, dz);
        if (l > 0.05) {
          q.x += (dx / l) * dt * 0.8;
          q.z += (dz / l) * dt * 0.8;
          q.y = Math.abs(Math.sin(s * 14)) * 0.06;
          c.o.rotation.y = Math.atan2(dx, dz);
        } else q.y = 0;
      } else if (c.kind === "hare") {
        pt.e.forEach((e, k) => (e.rotation.x = Math.sin(s * 3 + k + c.hx) > 0.9 ? -0.4 : 0));
        pt.hd.rotation.x = Math.sin(s * 1.3 + c.hx) * 0.15;
        if (d < 12) {
          let ha = Math.atan2(p.x - q.x, p.z - q.z) - c.o.rotation.y;
          ha = Math.atan2(Math.sin(ha), Math.cos(ha));
          c.o.rotation.y += ha * 0.03;
        }
      } else {
        pt.t.rotation.z = Math.sin(s * 2.2) * 0.5;
        pt.t.rotation.x = Math.sin(s * 1.1) * 0.2;
        if (c.t < 0) {
          c.t = 3 + Math.random() * 5;
          const a = Math.random() * 6.283,
            r = 4 + Math.random() * 8;
          c.tx = OX + Math.cos(a) * r;
          c.tz = OZ + Math.sin(a) * r;
        }
        const dx = c.tx - q.x,
          dz = c.tz - q.z,
          l = Math.hypot(dx, dz);
        if (
          l > 0.3 &&
          !solids.some((o) => Math.hypot(q.x + (dx / l) * 0.5 - o.x, q.z + (dz / l) * 0.5 - o.z) < o.r + 0.3)
        ) {
          q.x += (dx / l) * dt * 1.1;
          q.z += (dz / l) * dt * 1.1;
          let df = Math.atan2(dx, dz) - c.o.rotation.y;
          df = Math.atan2(Math.sin(df), Math.cos(df));
          c.o.rotation.y += df * 0.1;
          pt.hd.rotation.x = Math.sin(s * 8) * 0.05;
        } else {
          c.tx = q.x;
          c.tz = q.z;
          let ha = Math.atan2(p.x - q.x, p.z - q.z) - c.o.rotation.y;
          ha = Math.atan2(Math.sin(ha), Math.cos(ha));
          pt.hd.rotation.y = d < 5 ? Math.max(-0.8, Math.min(0.8, ha)) : Math.sin(s * 0.5) * 0.4;
        }
        if (c.anim) c.anim(c, dt, s, d); // v17 Soot's rig (15-cat.js): walk cycle, poses, blinking, purring
      }
    } else if (c.st === 1) {
      q.x += c.vx * dt;
      q.z += c.vz * dt;
      if (c.kind === "bird") {
        q.y += c.vy * dt;
        c.vy += 1.2 * dt;
        pt.w.forEach((w, k) => (w.rotation.z = (k ? -1 : 1) * Math.sin(s * 30) * 0.9));
      } else q.y = Math.abs(Math.sin(c.t * 11)) * 0.45;
      if (c.t < 0) {
        c.st = 2;
        c.o.visible = false;
        c.t = 8 + Math.random() * 6;
      }
    } else if (c.t < 0 && Math.hypot(p.x - c.hx, p.z - c.hz) > 14) {
      c.st = 0;
      q.set(c.hx, 0, c.hz);
      c.tx = c.hx;
      c.tz = c.hz;
      c.o.visible = true;
    }
  }
  // smoke: only emit near the player
  for (const k of SMK) {
    if (Math.abs(k.x - p.x) > 80 || Math.abs(k.z - p.z) > 80) continue;
    k.t -= dt;
    if (k.t <= 0) {
      k.t = k.fast ? 0.25 : 0.55;
      const u = PUFFS[puffI++ % PUFFS.length];
      u.t = 0;
      u.life = k.fast ? 1.6 : 4;
      u.x = k.x;
      u.y = k.y;
      u.z = k.z;
      u.m.material.color.setHex(k.c);
      u.m.visible = true;
      u.fast = k.fast;
    }
  }
  for (const u of PUFFS) {
    if (u.t >= u.life || !u.m.visible) {
      u.m.visible = false;
      continue;
    }
    u.t += dt;
    const q = u.t / u.life;
    u.m.position.set(u.x + Math.sin(s + u.y) * 0.4 * q + q * 1.2, u.y + q * (u.fast ? 3.5 : 4.5), u.z + q * 0.6);
    u.m.scale.setScalar(0.8 + q * (u.fast ? 2.4 : 3));
    u.m.material.opacity = (q < 0.15 ? q / 0.15 : 1 - q) * (u.fast ? 0.5 : 0.45);
  }
  // bats
  for (const b of BATS) {
    const a = s * b.sp + b.ph;
    b.g.position.set(b.cx + Math.cos(a) * b.R, b.h + Math.sin(s * 1.3 + b.ph) * 1.5, b.cz + Math.sin(a) * b.R);
    b.g.rotation.y = -a;
    const f = Math.sin(s * 14 + b.ph) * 0.8;
    b.l.rotation.z = f;
    b.r.rotation.z = -f;
  }
  // weather
  const z = zcur;
  WX.visible = z === "frost" || z === "ember";
  if (WX.visible) {
    const ar = WX.geometry.attributes.position,
      A = ar.array,
      fr = z === "frost";
    WX.position.set(p.x, 0, p.z);
    wxm.color.setHex(fr ? 0xffffff : 0xff9a4a);
    wxm.size = fr ? 0.35 : 0.28;
    wxm.blending = fr ? T.NormalBlending : T.AdditiveBlending;
    for (let i = 0; i < A.length; i += 3) {
      A[i + 1] += (fr ? -2.2 : 1.6) * dt;
      A[i] += Math.sin(s + i) * (fr ? 0.6 : 0.3) * dt;
      if (A[i + 1] < 0) A[i + 1] += 24;
      if (A[i + 1] > 24) A[i + 1] -= 24;
    }
    ar.needsUpdate = true;
  }
  // villagers: stroll between random spots in the square, stop when the player is close
  if (z === "hub" && Math.abs(p.z - OZ) < 60)
    for (const v of VIL) {
      const q = v.o.position,
        dpl = Math.hypot(p.x - q.x, p.z - q.z);
      let moving = false;
      if (v.pause > 0) v.pause -= dt;
      else if (dpl > 1.8) {
        if (!v.w || Math.hypot(v.w.x - q.x, v.w.z - q.z) < 0.4) {
          for (let k = 0; k < 8; k++) {
            const a = Math.random() * 6.283,
              d = 4.2 + Math.random() * 8,
              x = OX + Math.cos(a) * d,
              z2 = OZ + Math.sin(a) * d;
            if (!solids.some((o) => Math.hypot(x - o.x, z2 - o.z) < o.r + 1)) {
              v.w = { x, z: z2 };
              break;
            }
          }
          v.pause = 1 + Math.random() * 3;
        } else {
          const dx = v.w.x - q.x,
            dz = v.w.z - q.z,
            l = Math.hypot(dx, dz),
            nx = q.x + (dx / l) * 1.3 * dt,
            nz = q.z + (dz / l) * 1.3 * dt;
          if (solids.some((o) => Math.hypot(nx - o.x, nz - o.z) < o.r + 0.5)) v.w = null;
          else {
            q.x = nx;
            q.z = nz;
            moving = true;
            let df = Math.atan2(dx, dz) - v.o.rotation.y;
            df = Math.atan2(Math.sin(df), Math.cos(df));
            v.o.rotation.y += df * 0.15;
          }
        }
      } else {
        let df = Math.atan2(p.x - q.x, p.z - q.z) - v.o.rotation.y;
        df = Math.atan2(Math.sin(df), Math.cos(df));
        v.o.rotation.y += df * 0.1;
      }
      // v19: smooth walk blend, stride-timed bob and lean; heads turn toward you (or a neighbour to chat with)
      const u = v.o.userData;
      v.ws = (v.ws || 0) + ((moving ? 1 : 0) - (v.ws || 0)) * Math.min(1, dt * 6);
      v.st = (v.st || 0) + dt * 7 * v.ws;
      const ph = v.st + q.x,
        wk = v.ws;
      let lk = null,
        chat = null;
      if (dpl < 7) lk = [p.x, p.z];
      else if (!moving)
        for (const o of VIL)
          if (o !== v && Math.hypot(o.o.position.x - q.x, o.o.position.z - q.z) < 3.5) {
            chat = o;
            lk = [o.o.position.x, o.o.position.z];
            break;
          }
      if (lk) {
        let a = Math.atan2(lk[0] - q.x, lk[1] - q.z) - v.o.rotation.y;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        u.look = a;
        if (chat && !moving) v.o.rotation.y += a * Math.min(1, dt * 2) * 0.5; // turn to face whoever they chat with
      } else u.look = moving ? 0 : Math.sin(s * 0.3 + q.x) * 0.5;
      const talk = chat && Math.sin(s * 0.8 + q.x * 0.3) > 0; // take turns: one talks (hands moving), the other nods
      u.nod = (chat && !talk) || dpl < 2.5;
      personLife(v.o, s, dt);
      personBody(v.o, s, dt, wk, ph);
      const gest = talk ? Math.max(0, Math.sin(s * 3.1 + q.x)) : 0;
      u.AL.rotation.x = Math.sin(ph) * 0.5 * wk + (1 - wk) * Math.sin(s * 1.4 + q.x) * 0.05 - 0.9 * gest;
      u.AR.rotation.x = -Math.sin(ph) * 0.5 * wk + (1 - wk) * Math.sin(s * 1.4 + q.x + 1) * 0.05 - 0.6 * gest;
      u.AL.rotation.z = -0.25 * gest;
      q.y = Math.abs(Math.sin(ph)) * 0.07 * wk;
    }
  // sky lanterns bob over the square; dungeon wards fade when the halls are clear; NPC plates and quest marks
  // story gloom: thickness follows the quest that clears it, it is faint from afar, and it rises and melts away when lifted
  SLK.forEach((L, li) => {
    const lk = !L.t();
    if (L.was === undefined) {
      L.was = lk;
      L.k = lk ? 1 : 0;
    }
    if (L.was && !lk) {
      L.was = false;
      if (z === "hub" && !L.gate && !SLK.some((o, j) => j < li && o.qi === L.qi && o.was === false && o.k > 0.9))
        toast("The gloom over " + L.ln + " lifts. The way is open!", "#c9b8ff");
    } else if (lk) L.was = true;
    let th = 0;
    if (lk) {
      th = 1;
      if (P.qa[L.qi] != null) th = 1 - 0.55 * Math.min(1, prog(L.qi) / QS[L.qi].k);
    }
    L.k += (th - L.k) * Math.min(1, dt * (lk ? 2 : 0.45));
    const d = Math.hypot(p.x - OX - L.w[0], p.z - OZ - L.w[1]),
      near = Math.max(0.2, Math.min(1, 1 - (d - 5) / 28)),
      vis = L.k > 0.01 && z === "hub" && !L.gate;
    L.ms.forEach((m, i) => {
      m.visible = vis;
      if (vis) {
        m.material.opacity = L.k * near * (0.6 + 0.15 * Math.sin(s * 1.3 + i * 2));
        m.material.map.offset.x = s * (0.02 + i * 0.012) * (i % 2 ? -1 : 1);
        m.position.y = 1.6 + (1 - L.k) * (lk ? 0 : 2.2);
      }
    });
    L.g.visible = vis;
    if (vis) L.g.material.opacity = 0.45 * L.k * near;
  });
  if (z === "hub")
    SKYL.forEach((l) => {
      l.o.position.y = l.y + Math.sin(s * 0.6 + l.ph) * 0.6;
      l.o.rotation.y = s * 0.3 + l.ph;
    });
  DUN.forEach((D, i) => {
    const o = dunPre(i);
    if (o !== D.open) {
      D.open = o;
      if (o && z === "dun" && dunIdx(p.x) === i) toast("The gloom ward fades. The inner hall is open!", "#c9b8ff");
    }
    if (D.seal) {
      D.seal.visible = !D.open;
      D.seal.material.opacity = 0.35 + 0.15 * Math.sin(s * 3);
    }
  });
  if ((mmF & 31) === 0) {
    // v22: the giver of the quest you are tracking gets a bigger, pulsing mark (a "?" once it is ready to hand in)
    const ti = trkI(),
      tz = ti >= 0 && !P.done[ti] ? qGv(QS[ti]) : null; // v24 giver key (06)
    NPCS.forEach((n) => {
      n.qs = npcQ(n);
      n.tq = !!n.qs && tz != null && npcGv(n) === tz;
    });
  }
  for (const n of NPCS) {
    const d = Math.abs(n.x - p.x) + Math.abs(n.z - p.z);
    if (d > 60 && !n.tq) continue; // the tracked giver's mark keeps updating from afar
    const bv = n.b && n.b.visible;
    if (n.np) {
      n.np.visible = d < 28;
      n.np.material.opacity = Math.max(0, Math.min(1, (28 - d) / 6));
    }
    if (n.qm) {
      const on = !!n.qs && !bv;
      n.qm.visible = on;
      if (on) {
        if (n.qm.userData.ch !== n.qs) {
          n.qm.userData.ch = n.qs;
          n.qm.material.map = qmTex(n.qs);
          n.qm.material.needsUpdate = true;
        }
        n.qm.position.y = (n.tq ? 5.5 : 5.1) + Math.sin(s * 3) * 0.18;
        n.qm.scale.setScalar(n.tq ? 1.8 + Math.sin(s * 5) * 0.22 : 1.25);
      }
    }
    // v47 polish: the old spell-sprite markers (lightning / heal swirl over heads) are gone; nameplates + quest marks say it
    if (n.mkr) n.mkr.visible = false;
  }
  // portal state: locked gates go grey with a slow red pulse
  for (const q of PT) {
    if (!q.lock || !q.g) continue;
    const lk = !!q.lock();
    if (q.wk) q.r.visible = q.g.visible = lk; // v14 trail arches: a barrier only while locked
    q.r.material.color.setHex(lk ? 0x6a5a70 : q.col);
    q.g.material.color.setHex(lk ? 0xff4a3a : 0xffffff);
    q.g.material.opacity = lk ? 0.35 + 0.2 * Math.sin(s * 2) : 1;
    if (q.gem) q.gem.material.emissiveIntensity = lk ? 0.05 : 0.6;
  }
}
