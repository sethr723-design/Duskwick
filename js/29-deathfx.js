// DUSKWICK - 29-deathfx.js (v25): foes die in the way of the element that finished them.
//   fire: chars black, slumps into ash, embers rise      ice: freezes solid, then shatters into shards
//   storm: jolts and crackles, then bursts in sparks      heal (Verdant): vines drag it down into the ground
//   spirit: turns ghostly, rises and fades away           anything else: the old shrink and puff
// dmg (08) is wrapped to remember each foe's last element (f.kel); die (09) is replaced. No top-level names.
(() => {
  const d0 = dmg;
  dmg = function (f, n, el) {
    if (f && f.foe && el) f.kel = el;
    return d0.apply(this, arguments);
  };
  // each dying model gets its own copy of its materials, so tinting it never touches other foes
  function own(o) {
    const L = [];
    o.traverse((m) => {
      if (!m.material) return;
      m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => {
        x.userData = { c0: x.color ? x.color.clone() : null, o0: x.opacity };
        L.push(x);
      });
    });
    return L;
  }
  const TC = new T.Color();
  function tint(L, hex, k, em, ek) {
    TC.setHex(hex);
    L.forEach((m) => {
      if (m.color && m.userData.c0) m.color.copy(m.userData.c0).lerp(TC, k);
      if (em != null && m.emissive) {
        m.emissive.setHex(em);
        m.emissiveIntensity = ek;
      }
    });
  }
  function fade(L, a) {
    L.forEach((m) => {
      m.transparent = true;
      m.depthWrite = a > 0.6;
      m.opacity = (m.userData.o0 == null ? 1 : m.userData.o0) * a;
    });
  }
  const P0 = new T.Vector3();
  const at = (o, y) => P0.copy(o.position).setY(o.position.y + y);
  async function fire(o, L, s0) {
    puff(at(o, 1.4), "fire", 14, 2.5, 0.7, 1);
    let n = 0;
    await tw(950, (k) => {
      tint(L, 0x140c0c, Math.min(1, k * 1.6), k < 0.5 ? 0xff5a12 : 0x3a0a00, (1 - k) * 1.2);
      o.scale.set(s0 * (1 + k * 0.15), s0 * (1 - k * 0.75), s0 * (1 + k * 0.15));
      if (k * 8 > n) {
        n++;
        puff(at(o, 0.6 + Math.random() * 1.4), "fire", 3, 1.6, 0.6, 0.7);
      }
    });
    puff(at(o, 0.3), "fire", 12, 2, 0.9, 0.9);
    puff(at(o, 0.2), "slash", 6, 1.2, 0.8, 0.8);
  }
  async function ice(o, L, s0) {
    o.userData.frz = 1;
    puff(at(o, 1.2), "ice", 10, 1.5, 0.6, 0.9);
    await tw(420, (k) => tint(L, 0xd8f4ff, k, 0x4aa8e8, k * 0.9));
    await wait(260);
    o.visible = false;
    puff(at(o, 1.2), "ice", 22, 4, 0.8, 1.1);
    // shards fly out and fall
    const par = o.parent,
      sh = [];
    for (let i = 0; i < 10; i++) {
      const m = mk(Cn(0.12 * s0, 0.5 * s0, 4), 0xd8f4ff, 0, 0, 0, 1);
      m.material.emissive.setHex(0x3a88c8);
      m.position.copy(o.position).setY(0.6 + Math.random() * 1.6 * s0);
      const a = Math.random() * 6.28,
        sp = 2 + Math.random() * 3;
      m.userData.v = new T.Vector3(Math.cos(a) * sp, 2 + Math.random() * 3, Math.sin(a) * sp);
      m.userData.r = new T.Vector3(Math.random() * 9, Math.random() * 9, 0);
      par.add(m);
      sh.push(m);
    }
    let last = 0;
    await tw(750, (k) => {
      const dt = (k - last) * 0.75;
      last = k;
      sh.forEach((m) => {
        const v = m.userData.v;
        v.y -= 14 * dt;
        m.position.addScaledVector(v, dt);
        if (m.position.y < 0.05) {
          m.position.y = 0.05;
          v.set(v.x * 0.4, 0, v.z * 0.4);
        }
        m.rotation.x += m.userData.r.x * dt;
        m.rotation.y += m.userData.r.y * dt;
        m.scale.setScalar(Math.max(0.01, 1 - Math.max(0, k - 0.6) / 0.4));
      });
    });
    sh.forEach((m) => {
      par.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    });
  }
  async function storm(o, L, s0) {
    const x0 = o.position.x,
      z0 = o.position.z;
    let n = 0;
    await tw(750, (k) => {
      const on = Math.sin(k * 60) > 0;
      tint(L, 0xeaf4ff, on ? 0.7 : 0.2, on ? 0xbfe4ff : 0x2a4aff, on ? 1.6 : 0.6);
      o.position.x = x0 + (Math.random() - 0.5) * 0.25 * (1 - k * 0.5);
      o.position.z = z0 + (Math.random() - 0.5) * 0.25 * (1 - k * 0.5);
      o.rotation.y += (Math.random() - 0.5) * 0.3;
      if (k * 6 > n) {
        n++;
        puff(at(o, 0.8 + Math.random() * 1.6), "storm", 4, 2.5, 0.35, 0.8);
      }
    });
    o.position.x = x0;
    o.position.z = z0;
    await tw(200, (k) => o.scale.setScalar(s0 * (1 + 0.25 * Math.sin(k * Math.PI)) * (1 - k)));
    puff(at(o, 1.3), "storm", 18, 4, 0.5, 1.1);
  }
  async function verdant(o, L, s0) {
    const par = o.parent,
      vs = [],
      y0 = o.position.y;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.28 + 0.3,
        r = 0.9 * s0,
        v = mk(Cn(0.12, 2.2 * s0, 5), i % 2 ? 0x3a7a2a : 0x5aa83a, 0, 0, 0);
      v.position.set(o.position.x + Math.cos(a) * r, 0, o.position.z + Math.sin(a) * r);
      v.rotation.z = Math.cos(a) * 0.35;
      v.rotation.x = -Math.sin(a) * 0.35;
      v.scale.set(1, 0.01, 1);
      par.add(v);
      vs.push(v);
    }
    puff(at(o, 0.4), "heal", 12, 2, 0.8, 0.9);
    await tw(380, (k) => vs.forEach((v, i) => (v.scale.y = Math.max(0.01, k * (0.8 + (i % 3) * 0.15)))));
    await tw(900, (k) => {
      tint(L, 0x4a6a2a, k * 0.7);
      o.position.y = y0 - k * k * 2.6 * s0;
      o.rotation.y += 0.02;
      vs.forEach((v) => (v.scale.y = Math.max(0.01, (1 - k) * 0.9)));
      if (Math.random() < 0.15) puff(at(o, 0.2).setY(0.3), "heal", 2, 1.4, 0.6, 0.7);
    });
    vs.forEach((v) => {
      par.remove(v);
      v.geometry.dispose();
    });
  }
  async function spirit(o, L, s0) {
    const y0 = o.position.y;
    let n = 0;
    await tw(1100, (k) => {
      tint(L, 0xc8b8ff, Math.min(1, k * 2), 0x6a4aff, 0.4 + k);
      fade(L, 1 - k);
      o.position.y = y0 + k * 1.8;
      o.scale.setScalar(s0 * (1 + k * 0.2));
      if (k * 7 > n) {
        n++;
        puff(at(o, 1 + Math.random()), "spirit", 3, 1.5, 0.8, 0.8);
      }
    });
    puff(at(o, 1.5), "spirit", 14, 2.5, 0.9, 1);
  }
  const FX = { fire, ice, storm, heal: verdant, spirit };
  die = async function (f) {
    f.gone = 1;
    undeco(f);
    const o = f.m,
      s0 = o.scale.x,
      fx = FX[f.kel];
    if (!fx) {
      puff(o.position.clone().setY(1.5), "storm", 10, 3, 0.6, 1);
      await tw(420, (k) => o.scale.setScalar(s0 * (1 - k)));
      BG.remove(o);
      return;
    }
    const L = own(o);
    try {
      await fx(o, L, s0);
    } catch (e) {
      console.warn("death effect", e);
    }
    if (o.parent) o.parent.remove(o);
    L.forEach((m) => m.dispose());
  };
})();
