// DUSKWICK - 38-life.js (v29): small touches of life. Only top-level name: LIFE.
// Wind-swayed banners and tall grass beside Gloomway, birds circling high over the hub and zone centres, moths around
// the nearest lamps, and idle fidgets for the square's villagers. No lights; everything is distance-culled and thinned
// on Low. Hooks by wrapping ambient() (called by the main loop every frame, like 34-dungeons.js does).
const LIFE = (() => {
  const low = GFX === "low";
  let seed = 4242,
    tick = 0;
  const rn = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; // fixed seed: same layout every run

  // ---- 1a. banners on poles: a few round the square and along Gloomway ----
  const flags = [];
  const fcol = [0xb84a3a, 0xd49a3a, 0x4a6ab8, 0x8a4aa8, 0x3a9a7a];
  const spots = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * 6.283 + 0.5;
    spots.push([OX + Math.cos(a) * 16.2, OZ + Math.sin(a) * 16.2]);
  }
  for (let z = OZ - 30; z > OZ - 250; z -= 36) {
    spots.push([OX - 9.8, z]);
    spots.push([OX + 9.8, z - 18]);
  }
  const poleM = new T.MeshLambertMaterial({ color: 0x5a4430 });
  const poleG = new T.CylinderGeometry(0.07, 0.1, 6, 6);
  spots.length = 0; // v29c: flagpoles removed (user found them out of place)
  spots.forEach(([x, z], i) => {
    if (!okp(x, z)) return;
    const g = new T.Group();
    g.position.set(x, 0, z);
    const pole = new T.Mesh(poleG, poleM);
    pole.position.y = 3;
    g.add(pole);
    const pg = new T.PlaneGeometry(1.7, 0.95, low ? 3 : 8, 1);
    pg.translate(0.85, 0, 0);
    const fm = new T.Mesh(
      pg,
      new T.MeshLambertMaterial({ color: fcol[i % fcol.length], side: T.DoubleSide, emissive: 0x201008 }),
    );
    fm.position.set(0.05, 5.2, 0);
    g.add(fm);
    g.rotation.y = rn() * 6.283;
    S.add(g);
    const pos = pg.attributes.position;
    flags.push({ g, fm, pos, x, z, ph: rn() * 6, n: pos.count });
  });
  function flagTick(s, px, pz) {
    for (const f of flags) {
      const near = Math.abs(f.x - px) < 70 && Math.abs(f.z - pz) < 70;
      f.g.visible = near || Math.abs(f.x - px) < 160;
      if (!near) continue;
      const p = f.pos;
      for (let i = 0; i < f.n; i++) {
        const lx = p.getX(i);
        p.setZ(i, Math.sin(lx * 3.1 - s * 4 + f.ph) * 0.2 * lx + Math.sin(s * 1.3 + f.ph) * 0.05 * lx);
      }
      p.needsUpdate = true;
    }
  }

  // ---- 1b. tall grass tufts in the verges beside Gloomway (inside the town wall, outside the sidewalks) ----
  // v29c: off - tufts were landing on roads and plazas (okp counts paving as walkable)
  const NT = 0,
    tuft = [];
  const tg = new T.ConeGeometry(0.16, 1.2, 4);
  tg.translate(0, 0.6, 0);
  const tm = new T.MeshLambertMaterial({ color: 0x5c7a3a });
  const gi = new T.InstancedMesh(tg, tm, NT * 3);
  gi.frustumCulled = false;
  gi.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (let tries = 0; tuft.length < NT && tries < 2000; tries++) {
    const x = OX + (rn() < 0.5 ? -1 : 1) * (13 + rn() * 20),
      z = OZ - 20 - rn() * 235;
    if (!okp(x, z)) continue;
    tuft.push({ x, z, ph: rn() * 6, sc: 0.7 + rn() * 0.8, ry: rn() * 3 });
  }
  gi.count = tuft.length * 3;
  S.add(gi);
  const dm = new T.Object3D();
  function grassTick(s, px, pz) {
    if (Math.abs(px - OX) > 110 || pz > OZ + 60 || pz < OZ - 330) {
      gi.visible = false;
      return;
    }
    gi.visible = true;
    let n = 0;
    for (const t of tuft) {
      const far = Math.abs(t.x - px) > 60 || Math.abs(t.z - pz) > 60;
      for (let b = 0; b < 3; b++) {
        const w = far ? 0 : Math.sin(s * 1.6 + t.x * 0.15 + t.z * 0.1 + b) * 0.16 + Math.sin(s * 3.1 + t.ph) * 0.04;
        dm.position.set(t.x + (b - 1) * 0.22, 0, t.z + ((b * 7) % 3) * 0.1 - 0.1);
        dm.rotation.set(w * 0.6, t.ry + b, w + (b - 1) * 0.12);
        dm.scale.setScalar(t.sc * (b === 1 ? 1.15 : 0.9));
        dm.updateMatrix();
        gi.setMatrixAt(n++, dm.matrix);
      }
    }
    gi.instanceMatrix.needsUpdate = true;
  }

  // ---- 2a. birds circling high over the hub and zone centres ----
  const birds = [],
    CEN = [
      [OX, OZ],
      [600, -400],
      [-600, -400],
      [1020, -400],
    ],
    // v45: the zone entries follow the live centres (03 ZCEN, moved by the re-layout at DOMContentLoaded)
    cenAt = (ci) => (ci === 1 ? ZCEN.frost : ci === 2 ? ZCEN.ember : ci === 3 ? ZCEN.marsh : CEN[ci]),
    bm = new T.MeshBasicMaterial({ color: 0x1c1822, side: T.DoubleSide, fog: true }),
    wg = new T.BufferGeometry();
  wg.setAttribute("position", new T.BufferAttribute(new Float32Array([0, 0, -0.1, 0, 0, 0.25, 0.7, 0, 0]), 3));
  CEN.forEach((c, ci) => {
    const nb = low ? 2 : 4;
    for (let k = 0; k < nb; k++) {
      const g = new T.Group(),
        w1 = new T.Mesh(wg, bm),
        w2 = new T.Mesh(wg, bm);
      w2.scale.x = -1;
      g.add(w1, w2);
      g.scale.setScalar(1.4);
      S.add(g);
      birds.push({
        g,
        w1,
        w2,
        c,
        ci,
        r: 30 + rn() * 50,
        a: rn() * 6.283,
        sp: (0.18 + rn() * 0.12) * (rn() < 0.5 ? -1 : 1),
        h: 34 + rn() * 22,
        ph: rn() * 6,
      });
    }
  });
  function birdTick(dt, s, px, pz) {
    for (const b of birds) {
      const c = cenAt(b.ci) || b.c,
        cx = c[0],
        cz = c[1];
      if (Math.abs(cx - px) > 320 || Math.abs(cz - pz) > 320) {
        b.g.visible = false;
        continue;
      }
      b.g.visible = true;
      b.a += b.sp * dt;
      const x = cx + Math.cos(b.a) * b.r,
        z = cz + Math.sin(b.a) * b.r;
      b.g.position.set(x, b.h + Math.sin(s * 0.3 + b.ph) * 2, z);
      b.g.rotation.y = Math.atan2(-Math.sin(b.a) * b.sp, Math.cos(b.a) * b.sp) - Math.PI / 2;
      const f = Math.sin(s * 5 + b.ph) * 0.6 + (Math.sin(s * 0.7 + b.ph) > 0.6 ? 0.5 : 0); // flap, then a glide
      b.w1.rotation.z = f;
      b.w2.rotation.z = -f;
    }
  }

  // ---- 2b. moths round the nearest lamps ----
  let lamps = null;
  const NM = low ? 8 : 20,
    mp = new Float32Array(NM * 3),
    mg = new T.BufferGeometry();
  mg.setAttribute("position", new T.BufferAttribute(mp, 3));
  const moths = new T.Points(
    mg,
    new T.PointsMaterial({ color: 0xf2e6c0, size: 0.14, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  moths.frustumCulled = false;
  S.add(moths);
  const wv = new T.Vector3();
  function mothTick(s, px, pz) {
    if (!lamps) {
      lamps = [];
      S.updateMatrixWorld(true);
      S.traverse((o) => {
        if (o.isLight && o.userData && o.userData.pool === 1) {
          o.getWorldPosition(wv);
          lamps.push({ x: wv.x, y: wv.y, z: wv.z });
        }
      });
    }
    const near = lamps
      .map((l) => ({ l, d: (l.x - px) ** 2 + (l.z - pz) ** 2 }))
      .filter((o) => o.d < 1600)
      .sort((a, b) => a.d - b.d)
      .slice(0, NM >> 1);
    moths.visible = near.length > 0;
    for (let i = 0; i < NM; i++) {
      const o = near[i >> 1];
      if (!o) {
        mp[i * 3 + 1] = -50;
        continue;
      }
      const t = s * (1.6 + (i % 3) * 0.5) + i * 2.1,
        r = 0.5 + 0.35 * Math.sin(t * 0.7);
      mp[i * 3] = o.l.x + Math.cos(t) * r;
      mp[i * 3 + 1] = o.l.y + Math.sin(t * 1.9 + i) * 0.35;
      mp[i * 3 + 2] = o.l.z + Math.sin(t) * r;
    }
    mg.attributes.position.needsUpdate = true;
  }

  // ---- 3. idle fidgets for the square's villagers (arm to the head, a stretch, a look about) ----
  function folkTick(dt, s, px, pz) {
    for (let i = 0; i < VIL.length; i++) {
      const v = VIL[i],
        q = v.o.position;
      if (Math.abs(q.x - px) > 30 || Math.abs(q.z - pz) > 30) continue;
      const u = v.o.userData;
      if (!u.AR || (v.ws || 0) > 0.05 || Math.hypot(q.x - px, q.z - pz) < 7) continue;
      const cyc = (((s * 0.045 + i * 0.173) % 1) + 1) % 1;
      if (cyc > 0.1) continue;
      const k = Math.sin((cyc / 0.1) * Math.PI); // 0..1..0 over the fidget
      if (i % 3 === 0) {
        u.AR.rotation.x = -2.3 * k; // scratch the head
        u.AR.rotation.z = -0.35 * k + Math.sin(s * 14) * 0.08 * k;
        if (u.hd) u.hd.rotation.z += 0.12 * k;
      } else if (i % 3 === 1) {
        u.AR.rotation.x = -2.6 * k; // stretch both arms, lean back
        if (u.AL) u.AL.rotation.x = -2.6 * k;
        if (u.bd) u.bd.rotation.x -= 0.12 * k;
      } else if (u.hd) u.hd.rotation.y += Math.sin(s * 2 + i) * 0.5 * k; // look about
    }
  }

  const amb = ambient;
  ambient = function (dt, s, p) {
    amb(dt, s, p);
    if (typeof mode === "undefined" || mode !== "explore") return;
    try {
      tick++;
      flagTick(s, p.x, p.z);
      if (tick % (low ? 3 : 2) === 0) grassTick(s, p.x, p.z);
      birdTick(dt, s, p.x, p.z);
      mothTick(s, p.x, p.z);
      folkTick(dt, s, p.x, p.z);
      driftTick(dt, s, p.x, p.z);
    } catch (e) {
      /* never let ambience break the loop */
    }
  };
  // v29c drifting motes: a small field of soft glowing specks that wraps around the player and takes the zone's mood
  // (warm lamp-dust in town, pale flecks in Frostfen, rising embers in the Cinderwaste, blinking fireflies in Mirewick).
  // One Points object, additive (so it follows the Glow setting), no lights.
  const DN = low ? 60 : 160,
    DB = 26, // half-size of the box around the player
    dg = new T.BufferGeometry(),
    dp = new Float32Array(DN * 3),
    dph = [];
  for (let i = 0; i < DN; i++) {
    dp[i * 3] = (rn() * 2 - 1) * DB;
    dp[i * 3 + 1] = 0.4 + rn() * 7;
    dp[i * 3 + 2] = (rn() * 2 - 1) * DB;
    dph.push(rn() * 6.283);
  }
  dg.setAttribute("position", new T.BufferAttribute(dp, 3));
  const dm2 = new T.PointsMaterial({
    color: 0xffd9a0,
    size: 0.16,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });
  const drift = new T.Points(dg, dm2);
  drift.frustumCulled = false;
  S.add(drift);
  // zone key -> [colour, size, rise speed, sway, blink]
  const DMOOD = {
    hub: [0xffd9a0, 0.14, 0.12, 0.5, 0],
    frost: [0xe8f2ff, 0.17, -0.5, 0.7, 0],
    ember: [0xff8a3a, 0.13, 0.7, 0.4, 0],
    marsh: [0xc8ff6a, 0.2, 0.05, 0.9, 1],
  };
  let dkey = "",
    dinit = 0;
  function driftTick(dt, s, px, pz) {
    let k = typeof zoneAt === "function" ? zoneAt(px, pz) : "hub";
    if (k === "tower" || k === "dun" || (typeof DUN2 !== "undefined" && pz < -1500)) k = "";
    const md = DMOOD[k];
    drift.visible = !!md;
    if (!md) return;
    if (k !== dkey) {
      dkey = k;
      dm2.color.setHex(md[0]);
      dm2.size = md[1];
    }
    // positions are world space; specks left behind wrap to the far side of the box around the player
    const a = dg.attributes.position.array,
      d = Math.min(dt || 0.016, 0.05);
    if (!dinit) {
      dinit = 1;
      for (let i = 0; i < DN; i++) {
        a[i * 3] += px;
        a[i * 3 + 2] += pz;
      }
    }
    for (let i = 0; i < DN; i++) {
      const j = i * 3,
        ph = dph[i];
      a[j] += Math.sin(s * 0.6 + ph) * md[3] * d;
      a[j + 2] += Math.cos(s * 0.5 + ph * 1.3) * md[3] * d;
      a[j + 1] += md[2] * d * (0.6 + 0.4 * Math.sin(ph));
      // wrap inside the box as the player moves (positions are relative to the player)
      if (a[j + 1] > 7.5) a[j + 1] = 0.3;
      else if (a[j + 1] < 0.2) a[j + 1] = 7.4;
      if (a[j] - px > DB) a[j] -= 2 * DB;
      else if (a[j] - px < -DB) a[j] += 2 * DB;
      if (a[j + 2] - pz > DB) a[j + 2] -= 2 * DB;
      else if (a[j + 2] - pz < -DB) a[j + 2] += 2 * DB;
    }
    dg.attributes.position.needsUpdate = true;
    dm2.opacity = md[4] ? 0.45 + 0.4 * Math.sin(s * 2.3) : 0.7;
  }
  // v29c ground grade: the pale textured paving (white-tinted Lambert ground with a map) washed out to flat pink under
  // the sunset light. Pull those toward a warm grey-mauve and down a touch so cobbles read as stone and blend with the
  // houses. Runs once on window load (after 01-core's load pass tags ground sheets with dtx); shared materials once.
  // The grade depends on the zone the sheet sits in (town = warm stone, Frostfen = cool snow); a material shared by
  // sheets in different zones is cloned so each zone gets its own.
  addEventListener("load", () => {
    const GRADE = { hub: [0x9c8a9e, 0.35, 0.86], frost: [0xdce8f8, 0.45, 0.97] },
      owner = new Map(), // material -> zone it was graded for
      ctr = new T.Vector3();
    S.updateMatrixWorld(true);
    S.traverse((o) => {
      const m = o.material;
      if (!o.isMesh || !m || Array.isArray(m)) return;
      if (!m.isMeshLambertMaterial || !m.map || m.userData.dtx !== "ground") return;
      const g = o.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      ctr.copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld);
      const zk = typeof zoneAt === "function" ? zoneAt(ctr.x, ctr.z) : "hub",
        gr = GRADE[zk];
      if (!gr) return;
      if (owner.has(m)) {
        if (owner.get(m) === zk) return;
        o.material = m.clone(); // shared with another zone: give this sheet its own copy, ungraded so far
        o.material.color.copy(o.material.userData.c0 ? new T.Color(o.material.userData.c0) : m.color);
      }
      const mm = o.material,
        c = mm.color;
      owner.set(mm, zk);
      if (!mm.userData.c0) mm.userData.c0 = "#" + c.getHexString();
      if ((c.r + c.g + c.b) / 3 > 0.7) c.lerp(new T.Color(gr[0]), gr[1]).multiplyScalar(gr[2]);
    });
  });
  return { flags, tuft, birds };
})();
