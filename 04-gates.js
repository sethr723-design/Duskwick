// DUSKWICK - 04-gates.js: v10 gates: barriers on locked paths and their unlock cutscenes (gate defs, runCut, gateTick).
// Loaded in order by index.html as plain scripts; they share one global scope.
// ===== v10 GATES: real barriers on Duskwick's locked paths (instead of see-through gloom). When the boss or story step that
// holds one is done, a cutscene plays the next time you are in Duskwick and the way breaks open. Each one is bigger than the last:
//  Hollow Road gate + Gloomway portcullis (quest "Summoner")  ->  Frostfen gate roots (Mossbound Tyrant)  ->  Ashen Trail ice wall
//  (Rimefang Matriarch)  ->  the great seal at the end of Gloomway ("Ash and Memory")  ->  the Gloomspire seal (Cinder Fiend)
//  ->  the Mirewick arch (Gloom Warden).
const GTS = [],
  DEB = [],
  FXL = [],
  CSP = new T.Vector3(),
  CSLK = new T.Vector3();
let CUT = null,
  CSN = 0;
const gOpen = (id) => !!(P && P.gates && P.gates[id]);
const csRf = (a, b) => a + Math.random() * (b - a),
  csV = (x, y, z) => new T.Vector3(x, y, z),
  csEase = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  csOut = (k) => 1 - Math.pow(1 - k, 3);
const csAB = (c, o) =>
  new T.MeshBasicMaterial({
    color: c,
    transparent: true,
    opacity: o == null ? 1 : o,
    blending: T.AdditiveBlending,
    depthWrite: false,
    fog: false,
    side: T.DoubleSide,
  });
function csGlow(p, col, s, o, par) {
  const g = new T.Sprite(
    new T.SpriteMaterial({
      map: WGT,
      color: col,
      transparent: true,
      opacity: o == null ? 1 : o,
      depthWrite: false,
      blending: T.AdditiveBlending,
      fog: false,
    }),
  );
  g.scale.setScalar(s);
  g.position.copy(p);
  (par || S).add(g);
  return g;
}
function csRune(col) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  x.translate(256, 256);
  x.strokeStyle = x.fillStyle = col;
  x.shadowColor = col;
  x.shadowBlur = 16;
  x.lineCap = "round";
  x.lineWidth = 8;
  [244, 206, 126, 58].forEach((r) => {
    x.beginPath();
    x.arc(0, 0, r, 0, 7);
    x.stroke();
  });
  x.lineWidth = 5;
  x.beginPath();
  for (let i = 0; i <= 7; i++) {
    const a = (i * Math.PI * 6) / 7 - Math.PI / 2;
    x.lineTo(Math.cos(a) * 206, Math.sin(a) * 206);
  }
  x.stroke();
  const glyph = (r, n, sz) => {
    for (let i = 0; i < n; i++) {
      x.save();
      x.rotate((i / n) * Math.PI * 2);
      x.translate(0, -r);
      let sd = i * 7 + n * 3;
      const q = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280 - 0.5) * sz;
      x.beginPath();
      x.moveTo(q(), -sz / 2);
      x.lineTo(q(), sz / 2);
      x.moveTo(-sz / 2, q());
      x.lineTo(sz / 2, q());
      x.moveTo(q(), q());
      x.lineTo(q(), q());
      x.stroke();
      x.restore();
    }
  };
  x.lineWidth = 4;
  glyph(225, 28, 26);
  glyph(166, 14, 30);
  return new T.CanvasTexture(c);
}
// debris: pieces pulled out of a barrier keep their world transform, fly, bounce and shrink away
function csDebris(m, v, av, life) {
  const wp = new T.Vector3(),
    wq = new T.Quaternion(),
    ws = new T.Vector3();
  m.updateMatrixWorld(true);
  m.matrixWorld.decompose(wp, wq, ws);
  if (m.parent) m.parent.remove(m);
  m.visible = true;
  m.position.copy(wp);
  m.quaternion.copy(wq);
  m.scale.copy(ws);
  S.add(m);
  m.userData.db = { v, av: av || csV(csRf(-4, 4), csRf(-4, 4), csRf(-4, 4)), t: 0, l: life || 3.5, s0: ws.clone() };
  DEB.push(m);
  return m;
}
function csTmp(o, life, f) {
  S.add(o);
  let t = 0;
  FXL.push((dt) => {
    t += dt;
    const k = Math.min(1, t / life);
    f(k, o);
    if (k >= 1) {
      S.remove(o);
      return false;
    }
    return true;
  });
  return o;
}
function csPhys(dt) {
  for (let i = DEB.length - 1; i >= 0; i--) {
    const m = DEB[i],
      d = m.userData.db;
    d.t += dt;
    d.v.y -= 14 * dt;
    m.position.addScaledVector(d.v, dt);
    m.rotation.x += d.av.x * dt;
    m.rotation.y += d.av.y * dt;
    m.rotation.z += d.av.z * dt;
    if (m.position.y < 0.2 && d.v.y < 0) {
      m.position.y = 0.2;
      d.v.y *= -0.3;
      d.v.x *= 0.55;
      d.v.z *= 0.55;
      d.av.multiplyScalar(0.5);
    }
    if (d.t > d.l) {
      const k = Math.min(1, (d.t - d.l) / 0.8);
      m.scale.copy(d.s0).multiplyScalar(Math.max(0.001, 1 - k));
      if (k >= 1) {
        S.remove(m);
        DEB.splice(i, 1);
      }
    }
  }
  for (let i = FXL.length - 1; i >= 0; i--) if (!FXL[i](dt)) FXL.splice(i, 1);
}
// a forked lightning bolt made of thin glowing segments
function csBolt(a, b, col) {
  col = col || 0xe8dcff;
  const g = new T.Group(),
    n = 10,
    mat = csAB(col, 1),
    up = csV(0, 1, 0);
  let p = a.clone();
  const seg = (p0, p1, r) => {
    const d = p1.clone().sub(p0),
      m = new T.Mesh(Cy(r, r, d.length(), 4), mat);
    m.position.copy(p0).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(up, d.normalize());
    g.add(m);
  };
  for (let i = 1; i <= n; i++) {
    const q = a.clone().lerp(b, i / n);
    if (i < n) {
      q.x += csRf(-2.2, 2.2);
      q.z += csRf(-2.2, 2.2);
    }
    seg(p, q, 0.17);
    if (i > 2 && i < n - 1 && Math.random() < 0.45)
      seg(q, q.clone().add(csV(csRf(-6, 6), csRf(-5, -1), csRf(-6, 6))), 0.08);
    p = q;
  }
  csGlow(b, col, 14, 1, g);
  csGlow(a.clone().lerp(b, 0.4), col, 34, 0.3, g);
  csTmp(g, 0.45, (k) => {
    mat.opacity = (Math.random() < 0.35 ? 0.25 : 1) * (1 - k);
    g.children.forEach((c) => {
      if (c.isSprite) c.material.opacity = (1 - k) * (c.scale.x > 20 ? 0.3 : 1);
    });
  });
}
// cutscene timing: tweens run on real time (not battle speed) and finish instantly when the scene is skipped
function csTw(ms, f) {
  return new Promise((r) => {
    const sk = () => !CUT || CUT.skip;
    if (sk()) {
      f(1);
      return r();
    }
    const t0 = performance.now();
    (function st() {
      const k = sk() ? 1 : Math.min(1, (performance.now() - t0) / ms);
      f(k);
      k < 1 ? requestAnimationFrame(st) : r();
    })();
  });
}
const csW = (ms) => csTw(ms, () => {});
function csCam(p, l, ms, e) {
  const a = CSP.clone(),
    b = CSLK.clone();
  return csTw(ms, (k) => {
    const q = (e || csEase)(k);
    CSP.lerpVectors(a, p, q);
    if (l) CSLK.lerpVectors(b, l, q);
  });
}
const csFx = (f) => {
  if (CUT && !CUT.skip) f();
};
function csQuake(a) {
  if (CUT && !CUT.skip) CUT.shk = Math.max(CUT.shk, a);
}
// letterbox overlay, caption and fade
const CSO = document.createElement("div");
CSO.id = "cso";
CSO.innerHTML =
  '<i class="t"></i><i class="b"></i><div class="fd"></div><div class="cap"><small class="k"></small><b></b><small class="s"></small></div><div class="sk">Space or click to skip</div>';
stage.appendChild(CSO);
{
  const st = document.createElement("style");
  st.textContent =
    "#cso{position:absolute;inset:0;z-index:30;display:none;cursor:pointer}#cso.on{display:block}" +
    "#cso i{position:absolute;left:0;right:0;height:0;background:#000;transition:height .7s ease;z-index:2}#cso .t{top:0}#cso .b{bottom:0}#cso.in i{height:11%}" +
    "#cso .fd{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .35s;pointer-events:none}" +
    "#cso .cap{position:absolute;left:16px;right:16px;bottom:14%;text-align:center;color:#ffe6a8;font-family:Fraunces,Georgia,serif;text-shadow:0 2px 14px #000,0 0 30px rgba(255,190,90,.5);opacity:0;transform:translateY(14px);transition:opacity .9s,transform .9s;z-index:3;pointer-events:none}" +
    "#cso .cap.show{opacity:1;transform:none}#cso .cap b{display:block;font-size:clamp(26px,5.2vw,54px);letter-spacing:.05em;line-height:1.1}#cso .cap small{display:block;font:600 clamp(11px,1.7vw,16px) system-ui,sans-serif;color:#d9cfff;letter-spacing:.14em;text-transform:uppercase;margin-top:6px}#cso .cap .k{color:#ffd27a;margin:0 0 6px}" +
    "#cso .sk{position:absolute;right:16px;bottom:3.5%;color:#ccc;font:600 12px system-ui,sans-serif;opacity:.75;z-index:3}" +
    "body.cut .hud,body.cut #mmw,body.cut #gold,body.cut .ib,body.cut #run,body.cut #hint,body.cut #epr,body.cut #joy,body.cut #zcard,body.cut #safev,body.cut #safe,body.cut #devb,body.cut #toasts{opacity:0!important;pointer-events:none!important;transition:opacity .4s}";
  document.head.appendChild(st);
}
CSO.addEventListener("click", () => {
  if (CUT) CUT.skip = true;
});
addEventListener(
  "keydown",
  (e) => {
    if (mode !== "cut") return;
    const k = e.key;
    if ((k === " " || k === "Enter" || k === "Escape") && CUT) CUT.skip = true;
    e.preventDefault();
    e.stopImmediatePropagation();
  },
  true,
);
function csCap(t, s, k) {
  const c = CSO.querySelector(".cap");
  CSO.querySelector(".cap b").textContent = t || "";
  CSO.querySelector(".cap .s").textContent = s || "";
  CSO.querySelector(".cap .k").textContent = k || "The way is open";
  c.classList.remove("show");
  if (t) {
    void c.offsetWidth;
    c.classList.add("show");
  }
}
// move the camera: a smooth glide when close, a quick fade-cut when the shot is far away (so it never flies through houses)
async function csGo(p, l, ms) {
  if (CSP.distanceTo(p) < 60) return csCam(p, l, ms);
  const fd = CSO.querySelector(".fd");
  fd.style.opacity = 1;
  await csW(380);
  CSP.copy(p);
  CSLK.copy(l);
  fd.style.opacity = 0;
  await csW(300);
}
const ptN = (n) => PT.find((q) => q.n === n);
function gate(o) {
  GTS.push(o);
  o.reset = (open) => {
    if (o.o && o.o.g.parent) S.remove(o.o.g);
    o.o = o.build();
    S.add(o.o.g);
    if (o.pt) {
      o.pt.r.visible = o.pt.g.visible = !!open;
      o.pt.r.scale.setScalar(1);
      o.pt.g.scale.setScalar(5.5);
    }
    if (open) gFin(o);
  };
  return o;
}
function gFin(G) {
  if (G.done) G.done(G.o);
  else if (G.o.g.parent) S.remove(G.o.g);
  if (G.pt) {
    G.pt.r.visible = G.pt.g.visible = true;
    G.pt.r.scale.setScalar(1);
    G.pt.g.scale.setScalar(5.5);
  }
}
const csBloom = (pt) => {
  if (!pt) return;
  pt.r.visible = pt.g.visible = true;
  return csTw(1000, (k) => {
    const e = csOut(k);
    pt.r.scale.setScalar(Math.max(0.01, e));
    pt.g.scale.setScalar(5.5 * e);
  });
};
const csWP = (m) => m.getWorldPosition(new T.Vector3());

// ---- 1. Hollow Road gate: a big timber double gate that swings outward ----
gate({
  id: "hollow",
  cond: () => !!P.done[2],
  msg: "The Hollow Road gate stands open. Wispwood Glade lies east.",
  build() {
    const g = new T.Group(),
      o = { g, doors: [], lt: [] };
    g.position.set(OX + 18.9, 0, OZ + HZ);
    [-1, 1].forEach((s) => {
      g.add(
        mk(B(1.4, 6.4, 1.4), 0x6a6478, 0, 3.2, s * 9.6),
        mk(B(1.9, 0.4, 1.9), 0x4a4560, 0, 6.6, s * 9.6),
        mk(B(0.55, 0.75, 0.55), 0x3a3036, 0, 7.2, s * 9.6),
      );
      o.lt.push(csGlow(csV(0, 7.25, s * 9.6), 0xffc070, 1.2, 0.25, g));
      const h = new T.Group();
      h.position.set(0, 0, s * 8.8);
      for (let i = 0; i < 7; i++) {
        const z = -s * (0.65 + i * 1.2);
        h.add(
          mk(B(0.36, 5.4, 1.16), i % 2 ? 0x7a4a2a : 0x6b4024, 0, 2.8, z),
          mk(Cn(0.55, 0.9, 4), 0x5a3a1e, 0, 5.95, z),
        );
      }
      [1.3, 4.3].forEach((y) => h.add(mk(B(0.5, 0.36, 8.4), 0x3a3440, 0, y, -s * 4.3)));
      const br = mk(B(0.42, 0.3, 8.6), 0x5a3a1e, -0.04, 2.8, -s * 4.3);
      br.rotation.x = s * 0.62;
      h.add(br);
      g.add(h);
      o.doors.push([h, s]);
    });
    o.bar = mk(B(0.55, 0.55, 9), 0x4a2f1b, -0.5, 2.7, 0);
    g.add(o.bar);
    return o;
  },
  async cut(o) {
    csCap("The Hollow Road", "Oona's gate swings wide");
    await csGo(csV(OX + 7, 3.6, OZ + HZ + 6), csV(OX + 19, 3, OZ + HZ), 1500);
    csFx(() => o.lt.forEach((l) => puff(csWP(l), "fire", 10, 1.6, 0.7, 0.9)));
    await csTw(500, (k) =>
      o.lt.forEach((l) => {
        l.material.opacity = 0.25 + 0.75 * k;
        l.scale.setScalar(1.2 + 2.4 * k);
      }),
    );
    await csTw(800, (k) => {
      o.bar.position.y = 2.7 + csOut(k) * 1.6;
    });
    await csTw(600, (k) => {
      o.bar.position.z = csEase(k) * 12;
    });
    o.bar.visible = false;
    csQuake(0.12);
    csCam(csV(OX + 10, 3.2, OZ + HZ + 3.5), csV(OX + 34, 2.6, OZ + HZ), 2600);
    csFx(() => {
      for (let i = 0; i < 14; i++)
        mote(csV(OX + 19.4, 0.4, OZ + HZ + csRf(-8, 8)), {
          c: 0xc8b090,
          nb: 1,
          s: 1.4,
          v: [csRf(0.6, 2.4), csRf(0.2, 0.9), 0],
          l: 1.6,
          g: -0.15,
          o: 0.45,
          gr: 1,
        });
    });
    await csTw(2400, (k) => {
      const e = csOut(k);
      o.doors.forEach(([h, s]) => (h.rotation.y = -s * 1.3 * e));
    });
    csQuake(0.08);
    await csW(500);
  },
  done(o) {
    o.bar.visible = false;
    o.doors.forEach(([h, s]) => (h.rotation.y = -s * 1.3));
    o.lt.forEach((l) => {
      l.material.opacity = 1;
      l.scale.setScalar(3.6);
    });
  },
});

// ---- 2. Gloomway portcullis: a stone gatehouse whose iron grate grinds up on its winches ----
gate({
  id: "gloomway",
  cond: () => !!P.done[2],
  msg: "The portcullis on Gloomway is up. The far street is open.",
  build() {
    const g = new T.Group(),
      o = { g, wh: [], lt: [] };
    g.position.set(OX, 0, OZ + GWZ);
    [-1, 1].forEach((s) => {
      const x = s * 12.7;
      g.add(mk(B(3.4, 13.4, 3.4), 0x5a5470, x, 6.7, 0), mk(B(3.9, 0.5, 3.9), 0x4a4560, x, 13.6, 0));
      [-1, 1].forEach((a) => [-1, 1].forEach((b) => g.add(mk(B(0.9, 1.1, 0.9), 0x5a5470, x + a * 1.4, 14.4, b * 1.4))));
      const w = new T.Group();
      w.position.set(x, 8.6, 1.85);
      w.add(
        mk(new T.TorusGeometry(0.95, 0.16, 6, 14), 0x3a3440),
        mk(B(1.9, 0.16, 0.16), 0x3a3440),
        mk(B(0.16, 1.9, 0.16), 0x3a3440),
      );
      g.add(w);
      o.wh.push([w, s]);
      g.add(mk(B(0.5, 0.7, 0.5), 0x3a3036, x, 5.6, 1.95));
      o.lt.push(csGlow(csV(x, 5.6, 2.3), 0xffb060, 1, 0.2, g));
    });
    g.add(mk(B(22.2, 6, 2.4), 0x4a4560, 0, 9.8, 0), mk(B(23, 0.5, 2.9), 0x5a5470, 0, 13.05, 0));
    const pc = new T.Group();
    for (let i = -9; i <= 9; i++) {
      pc.add(mk(B(0.22, 7, 0.22), 0x2a2630, i * 1.12, 3.5, 0));
      const sp = mk(Cn(0.2, 0.6, 4), 0x2a2630, i * 1.12, -0.3, 0);
      sp.rotation.x = Math.PI;
      pc.add(sp);
    }
    for (let j = 0; j < 6; j++) pc.add(mk(B(21.6, 0.2, 0.28), 0x3a3440, 0, 0.7 + j * 1.15, 0));
    g.add(pc);
    o.pc = pc;
    return o;
  },
  async cut(o) {
    csCap("Gloomway", "The old portcullis rises");
    await csGo(csV(OX + 5, 3.4, OZ + GWZ + 24), csV(OX, 4.5, OZ + GWZ), 1600);
    csFx(() => o.lt.forEach((l) => puff(csWP(l), "fire", 8, 1.4, 0.6, 0.8)));
    await csTw(450, (k) =>
      o.lt.forEach((l) => {
        l.material.opacity = 0.2 + 0.8 * k;
        l.scale.setScalar(1 + 2.6 * k);
      }),
    );
    csCam(csV(OX + 3, 2.6, OZ + GWZ + 14), csV(OX, 4, OZ + GWZ - 8), 3000);
    let ls = 0;
    await csTw(3000, (k) => {
      const e = csEase(k);
      o.pc.position.y = e * 6 + Math.sin(k * 40) * 0.04 * (1 - k);
      o.wh.forEach(([w, s]) => (w.rotation.z = -s * e * 14));
      if (k - ls > 0.12) {
        ls = k;
        csQuake(0.1);
        csFx(() => {
          for (let i = 0; i < 5; i++)
            mote(csV(OX + csRf(-10, 10), 0.3, OZ + GWZ + csRf(-0.6, 0.6)), {
              c: 0xb0a090,
              nb: 1,
              s: 1.2,
              v: [csRf(-1, 1), csRf(0.3, 1.2), csRf(0.5, 1.5)],
              l: 1.3,
              g: -0.1,
              o: 0.4,
              gr: 1,
            });
        });
      }
    });
    csQuake(0.25);
    csFx(() => {
      for (let i = 0; i < 20; i++)
        mote(csV(OX + csRf(-10, 10), 0.3, OZ + GWZ), {
          c: 0xb0a090,
          nb: 1,
          s: 1.6,
          v: [csRf(-1.5, 1.5), csRf(0.2, 1), csRf(-1, 2)],
          l: 1.8,
          g: -0.05,
          o: 0.4,
          gr: 1.2,
        });
    });
    await csW(700);
  },
  done(o) {
    o.pc.position.y = 6;
    o.wh.forEach(([w, s]) => (w.rotation.z = -s * 14));
    o.lt.forEach((l) => {
      l.material.opacity = 1;
      l.scale.setScalar(3.6);
    });
  },
});

// ---- 3. Frostfen gate: the Mossbound Tyrant's roots choke the arch; they wither, the heart-pod bursts, the frozen gate wakes ----
gate({
  id: "frost",
  cond: () => !!(P.dun && P.dun[0]),
  old: () => !!(P.vis && P.vis.frost),
  pt: ptN("Frostfen (needs Lv 3)"),
  msg: "The roots are gone from the Frostfen gate.",
  build() {
    const g = new T.Group(),
      o = { g, rt: [] };
    g.position.set(OX + RDS[0].gx + 13.6, 0, OZ + RDS[0].gz);
    // v34: a tidy, fixed woven curtain of roots across the arch (was random spikes poking every way)
    const C3 = [0x3a4a2a, 0x2e3a22, 0x4a5a30, 0x34402a];
    o.main = [];
    for (let i = 0; i < 12; i++) {
      const s = i % 2 ? 1 : -1,
        m = mk(Cy(0.17, 0.32, 7, 8), C3[i % 4], 0, 0, 0, 1);
      m.position.set(((i % 3) - 1) * 0.22, 3.15, -2.45 + (i >> 1) * 0.98);
      m.rotation.set(s * 0.5, 0, 0);
      g.add(m);
      o.rt.push(m);
      o.main.push(m);
    }
    for (let i = 0; i < 4; i++) {
      const m = mk(Cy(0.2, 0.34, 6.6, 8), C3[(i + 1) % 4], 0, 0, 0, 1);
      m.rotation.set(Math.PI / 2, 0, 0);
      m.position.set(-0.9 + i * 0.6, 0.22, 0);
      g.add(m);
      o.rt.push(m);
      o.main.push(m);
    }
    for (let i = 0; i < 16; i++) {
      const s = i % 2 ? 1 : -1,
        t = mk(Cn(0.08, 0.45, 5), 0x8a7a4a, 0, 0, 0, 1);
      t.position.set(s * 0.42, 1.1 + ((i * 0.71) % 4.6), -2.1 + ((i * 1.37) % 4.2));
      t.rotation.set(0, 0, -s * (Math.PI / 2));
      g.add(t);
      o.rt.push(t);
    }
    [
      [0.3, 1.4, -1.6, 0.55],
      [-0.3, 2.6, 1.3, 0.6],
      [0.3, 4.6, -0.6, 0.5],
      [-0.3, 5.3, 1.9, 0.45],
      [0.3, 0.9, 2.1, 0.5],
      [-0.3, 4.1, -2.0, 0.5],
    ].forEach(([x, y, z, r]) => {
      const m = mk(Sp(r, 10), 0x4f8a4a, x, y, z, 1);
      m.scale.set(0.7, 1, 1);
      g.add(m);
      o.rt.push(m);
    });
    const pod = mk(Sp(1, 14), 0x5adf7a, 0, 3.1, 0, 1);
    pod.material.emissive = new T.Color(0x1aff5a);
    pod.material.emissiveIntensity = 0.55;
    pod.scale.set(0.85, 1.15, 0.85);
    g.add(pod);
    o.pod = pod;
    o.pg = csGlow(csV(0, 3.1, 0), 0x5aff8a, 5, 0.45, g);
    return o;
  },
  idle(o, dt, s) {
    if (o.pod.visible) {
      const k = 1 + Math.sin(s * 2.2) * 0.06;
      o.pod.scale.set(0.85 * k, 1.15 * k, 0.85 * k);
      o.pg.material.opacity = 0.35 + 0.15 * Math.sin(s * 2.2);
    }
  },
  async cut(o) {
    const x0 = OX + RDS[0].gx + 13.6;
    csCap("The Frostfen Gate", "The Tyrant's roots wither");
    await csGo(csV(x0 - 12, 3.4, OZ + RDS[0].gz + 5.5), csV(x0, 3, OZ + RDS[0].gz), 1700);
    const base = o.rt.map((m) => m.position.clone());
    await csTw(1800, (k) => {
      const f = 2.2 + k * k * 14,
        b = 1 + Math.abs(Math.sin((performance.now() / 1000) * f)) * 0.18 * (0.4 + k);
      o.pod.scale.set(0.85 * b, 1.15 * b, 0.85 * b);
      o.pg.material.opacity = 0.4 + 0.6 * k;
      o.pg.scale.setScalar(5 + 4 * k);
      o.pod.material.emissiveIntensity = 0.55 + k * 1.2;
      // v34: a smooth shiver instead of random jitter
      const tt = performance.now() / 1000;
      o.rt.forEach((m, i) => {
        const a = 0.05 * k;
        m.position.set(base[i].x + Math.sin(tt * 23 + i) * a, base[i].y, base[i].z + Math.cos(tt * 19 + i * 1.7) * a);
      });
      if (Math.random() < 0.2)
        csFx(() =>
          mote(csV(x0 + csRf(-1, 1), csRf(0.5, 6), OZ + RDS[0].gz + csRf(-3, 3)), {
            c: 0x7dff9a,
            s: 0.5,
            v: [0, csRf(0.5, 1.5), 0],
            l: 0.9,
            g: 0,
          }),
        );
    });
    csQuake(0.2);
    const grey = new T.Color(0x4a443c),
      n = o.rt.length;
    csCam(csV(x0 - 9, 3, OZ + RDS[0].gz + 4), csV(x0, 2.6, OZ + RDS[0].gz), 2400);
    await csTw(2200, (k) => {
      o.rt.forEach((m, i) => {
        const q = Math.max(0, Math.min(1, (k - (i / n) * 0.55) / 0.45));
        if (q <= 0) return;
        if (!m.userData.c0) {
          m.userData.c0 = m.material.color.clone();
          if (o.main.includes(m)) csFx(() => puff(csWP(m), "heal", 2, 1.2, 0.5, 0.8));
        }
        m.material.color.copy(m.userData.c0).lerp(grey, q);
        // v34: wither thin and sink into the ground, then vanish (no leftover bits)
        const sc = Math.max(0.02, 1 - q);
        m.scale.set(sc, Math.max(0.05, 1 - q * 0.6), sc);
        m.position.y = base[i].y * (1 - q * 0.6);
        m.visible = q < 0.98;
      });
      o.pod.material.color.setHex(0x5adf7a).lerp(grey, k * 0.5);
    });
    csQuake(0.5);
    o.pod.visible = o.pg.visible = false;
    csFx(() => {
      flashScr("#7dff9a", 0.5);
      puff(csV(x0, 3.1, OZ + RDS[0].gz), "heal", 36, 6, 1, 1.4);
      ring(x0, 0x7dff9a, 10, 800, OZ + RDS[0].gz);
      for (let i = 0; i < 18; i++)
        mote(csV(x0, 3.1, OZ + RDS[0].gz), {
          c: 0x9affb0,
          s: 0.5,
          v: [csRf(-6, 6), csRf(-2, 6), csRf(-6, 6)],
          l: 1.4,
          g: 2,
          dr: 1.2,
        });
      o.g.visible = false; // v34: the withered roots are gone; nothing flung about or left behind
    });
    await csW(600);
    csFx(() => {
      puff(csV(x0, 2, OZ + RDS[0].gz), "ice", 30, 4, 1, 1.2);
      ring(x0, 0x8ad0ff, 7, 700, OZ + RDS[0].gz);
    });
    csCam(csV(x0 - 6, 2.6, OZ + RDS[0].gz + 2), csV(x0, 2.2, OZ + RDS[0].gz), 1400);
    await csBloom(this.pt);
    await csW(1000);
  },
});

// ---- 4. Ashen Trail: a wall of glacier ice; it cracks, fire glows through, and it blows apart toward the square ----
gate({
  id: "ashen",
  cond: () => !!(P.dun && P.dun[1]),
  old: () => !!(P.vis && (P.vis.gw || P.vis.ember)) || !!P.done[12],
  msg: "The ice on the Ashen Trail is broken. Cinder Hollow lies west.",
  build() {
    const g = new T.Group(),
      o = { g, sh: [], cr: [] };
    g.position.set(OX - 19.8, 0, OZ + AZ);
    const im = new T.MeshPhongMaterial({
      color: 0xa8dcff,
      emissive: 0x16405e,
      specular: 0xffffff,
      shininess: 90,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
    });
    o.im = im;
    for (let i = 0; i < 40; i++) {
      const z = csRf(-10.2, 10.2),
        r = csRf(1.1, 2.3),
        m = new T.Mesh(new T.IcosahedronGeometry(r, 0), im);
      m.position.set(csRf(-1.1, 1.1), csRf(0.4, Math.max(1, 7.4 - Math.abs(z) * 0.28)), z);
      m.scale.set(csRf(0.6, 0.95), csRf(1, 1.7), csRf(0.7, 1.1));
      m.rotation.set(csRf(0, 6), csRf(0, 6), csRf(0, 6));
      g.add(m);
      o.sh.push(m);
    }
    for (let i = 0; i < 9; i++) {
      const h = csRf(5, 9.5),
        m = new T.Mesh(new T.ConeGeometry(csRf(0.8, 1.5), h, 5), im);
      m.position.set(csRf(-1, 1), h / 2 - 0.3, csRf(-9.5, 9.5));
      m.rotation.set(csRf(-0.2, 0.2), csRf(0, 6), csRf(-0.25, 0.25));
      g.add(m);
      o.sh.push(m);
    }
    const cm = csAB(0xffc070, 0);
    cm.depthTest = false;
    o.cm = cm;
    for (let i = 0; i < 14; i++) {
      const c = new T.Mesh(B(0.07, csRf(1.5, 3.5), 0.1), cm);
      c.renderOrder = 7;
      c.position.set(2.2, csRf(1, 6), csRf(-8, 8));
      c.rotation.x = csRf(-1, 1);
      c.scale.y = 0.01;
      g.add(c);
      o.cr.push(c);
    }
    o.fog = csGlow(csV(1.5, 1.2, 0), 0xbfe8ff, 16, 0.18, g);
    return o;
  },
  async cut(o) {
    const x0 = OX - 19.8;
    csCap("The Ashen Trail", "The Matriarch's winter breaks");
    await csGo(csV(OX - 5, 3.4, OZ + AZ - 7), csV(x0, 3.6, OZ + AZ), 1700);
    const L = new T.PointLight(0xff7a2a, 0, 40);
    L.position.set(x0 - 5, 3, OZ + AZ);
    S.add(L);
    const base = o.sh.map((m) => m.position.clone());
    csCam(csV(OX - 9.5, 2.9, OZ + AZ - 4.5), csV(x0, 3.4, OZ + AZ), 3400);
    let ci = 0;
    await csTw(2600, (k) => {
      L.intensity = k * 3.2;
      o.cm.opacity = 0.5 + 0.5 * k;
      o.im.emissive.setRGB(0.09 + k * 0.5, 0.25 + k * 0.15, 0.37 - k * 0.2);
      const want = Math.floor(k * o.cr.length);
      while (ci < want) {
        const c = o.cr[ci++];
        c.userData.k = 0;
        csQuake(0.15 + k * 0.2);
        csFx(() => puff(csWP(c), "ice", 4, 2, 0.5, 0.7));
      }
      o.cr.forEach((c) => {
        if (c.userData.k != null) {
          c.userData.k = Math.min(1, c.userData.k + 0.06);
          c.scale.y = Math.max(0.01, c.userData.k);
        }
      });
      if (k > 0.6) {
        const j = (k - 0.6) * 2.5;
        o.sh.forEach((m, i) =>
          m.position.set(
            base[i].x + (Math.random() - 0.5) * 0.15 * j,
            base[i].y + (Math.random() - 0.5) * 0.1 * j,
            base[i].z,
          ),
        );
      }
      if (Math.random() < 0.4)
        csFx(() =>
          mote(csV(x0 + csRf(0, 2), csRf(0.2, 1), OZ + AZ + csRf(-9, 9)), {
            c: 0xdff4ff,
            nb: 1,
            s: 1.5,
            v: [csRf(0.5, 1.5), csRf(0.1, 0.5), 0],
            l: 2,
            g: -0.05,
            o: 0.35,
            gr: 1,
          }),
        );
    });
    await csW(250);
    csQuake(1.1);
    csFx(() => {
      flashScr("#ffffff", 0.95);
      ring(x0, 0xbfe8ff, 16, 900, OZ + AZ);
      ring(x0, 0xff9a4a, 11, 700, OZ + AZ);
      for (let j = 0; j < 5; j++) puff(csV(x0, csRf(1, 6), OZ + AZ + csRf(-8, 8)), "ice", 14, 7, 1.1, 1.5);
      puff(csV(x0 - 1, 3, OZ + AZ), "fire", 24, 6, 1, 1.6);
      const sw = new T.Mesh(Sp(1, 18), csAB(0xcff0ff, 0.55));
      sw.position.set(x0, 2, OZ + AZ);
      csTmp(sw, 0.9, (k, m) => {
        m.scale.setScalar(1 + k * 22);
        m.material.opacity = 0.55 * (1 - k);
      });
      o.sh.forEach((m) => {
        const p = csWP(m);
        csDebris(
          m,
          csV(csRf(5, 16), csRf(4, 13), (p.z - (OZ + AZ)) * csRf(0.25, 0.7) + csRf(-2, 2)),
          csV(csRf(-6, 6), csRf(-6, 6), csRf(-6, 6)),
          csRf(2.4, 3.6),
        );
      });
    });
    o.cr.forEach((c) => (c.visible = false));
    o.fog.visible = false;
    csCam(csV(OX - 2, 3.8, OZ + AZ - 9), csV(x0 - 6, 3, OZ + AZ), 600, csOut);
    await csTw(1600, (k) => {
      L.intensity = 3.2 * (1 - k * 0.7);
    });
    csCam(csV(OX - 8, 3.2, OZ + AZ - 2.5), csV(OX - 60, 2.4, OZ + AZ), 2200);
    await csW(2000);
    S.remove(L);
  },
});

// ---- 5. The end of Gloomway: a great spinning rune seal chained between two obelisks; chains snap, it implodes and shatters ----
gate({
  id: "seal",
  cond: () => !!P.done[13],
  msg: "The great seal on Gloomway is broken. The Cinder Fiend waits beyond.",
  build() {
    const g = new T.Group(),
      o = { g, ch: [], ob: [] };
    g.position.set(OX, 0, OZ + SEZ);
    const tx = csRune("#c9a0ff");
    o.disc = new T.Mesh(
      new T.CircleGeometry(8.4, 56),
      new T.MeshBasicMaterial({
        map: tx,
        transparent: true,
        blending: T.AdditiveBlending,
        depthWrite: false,
        side: T.DoubleSide,
        fog: false,
      }),
    );
    o.disc.position.set(0, 6.6, 0.25);
    g.add(o.disc);
    o.in = new T.Mesh(
      new T.CircleGeometry(4.6, 40),
      new T.MeshBasicMaterial({
        map: tx,
        color: 0xffd27a,
        transparent: true,
        opacity: 0.8,
        blending: T.AdditiveBlending,
        depthWrite: false,
        side: T.DoubleSide,
        fog: false,
      }),
    );
    o.in.position.set(0, 6.6, 0.35);
    g.add(o.in);
    // v47 polish: real depth so it doesn't read as a flat decal from the road: a thick carved rim with rune studs and a
    // second rim inset behind (both ride on the spinning disc), and a raised hub with a gem on the inner disc.
    {
      const rimM = new T.MeshToonMaterial({ color: 0x3a2a5a, emissive: 0x5a2aa8, emissiveIntensity: 0.55, gradientMap: GR });
      const rim = new T.Mesh(new T.TorusGeometry(8.5, 0.5, 10, 64), rimM);
      o.disc.add(rim);
      const rim2 = new T.Mesh(new T.TorusGeometry(6.0, 0.28, 8, 56), rimM);
      rim2.position.z = -0.45;
      o.disc.add(rim2);
      const stM = new T.MeshToonMaterial({ color: 0xc9a0ff, emissive: 0x9a6aff, emissiveIntensity: 0.9, gradientMap: GR });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2,
          st = new T.Mesh(B(0.7, 0.7, 0.9), stM);
        st.position.set(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 0.15);
        st.rotation.z = a + Math.PI / 4;
        o.disc.add(st);
      }
      const hub = new T.Mesh(new T.CylinderGeometry(1.3, 1.6, 0.9, 24), rimM);
      hub.rotation.x = Math.PI / 2;
      hub.position.z = 0.3;
      o.in.add(hub);
      const gem = new T.Mesh(new T.OctahedronGeometry(0.75, 0), stM);
      gem.position.z = 0.95;
      o.in.add(gem);
    }
    o.veil = new T.Mesh(
      new T.PlaneGeometry(22, 15),
      new T.MeshBasicMaterial({
        color: 0x140826,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    o.veil.position.set(0, 7.5, -0.2);
    g.add(o.veil);
    o.core = csGlow(csV(0, 6.6, 0.5), 0xb08aff, 7, 0.5, g);
    [-1, 1].forEach((s) => {
      g.add(mk(B(1.6, 9, 1.6), 0x2a2440, s * 12.4, 4.5, 0));
      const tp = mk(Cn(1.2, 1.8, 4), 0x2a2440, s * 12.4, 9.9, 0);
      tp.rotation.y = Math.PI / 4;
      g.add(tp);
      o.ob.push(csGlow(csV(s * 12.4, 6, 0.95), 0xa070ff, 2.2, 0.6, g));
    });
    const chain = (a, b) => {
      const c = new T.Group(),
        d = b.clone().sub(a),
        dn = d.clone().normalize(),
        n = Math.max(4, Math.round(d.length() / 0.5));
      for (let i = 0; i < n; i++) {
        const l = mk(new T.TorusGeometry(0.28, 0.07, 4, 8), 0x6a5a8a);
        l.position.copy(a).addScaledVector(d, (i + 0.5) / n);
        l.quaternion.setFromUnitVectors(csV(1, 0, 0), dn);
        if (i % 2) l.rotateX(Math.PI / 2);
        c.add(l);
      }
      g.add(c);
      o.ch.push(c);
    };
    [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ].forEach(([s, u]) => chain(csV(s * 6.2, 6.6 + u * 5.2, 0.3), csV(s * 12.4, u > 0 ? 8.2 : 1.6, 0.6)));
    return o;
  },
  idle(o, dt, s) {
    o.disc.rotation.z += dt * 0.18;
    o.in.rotation.z -= dt * 0.32;
    o.core.material.opacity = 0.4 + 0.15 * Math.sin(s * 2);
  },
  async cut(o) {
    const z0 = OZ + SEZ;
    csCap("The End of Gloomway", "The ancient seal shatters");
    await csGo(csV(OX + 6.5, 3.2, z0 + 22), csV(OX, 6.4, z0), 1800);
    await csTw(2400, (k) => {
      const sp = 0.18 + k * k * 9;
      o.disc.rotation.z += sp * 0.016;
      o.in.rotation.z -= sp * 0.025;
      o.disc.material.color.setScalar(1 + k * 1.6);
      o.core.scale.setScalar(7 + k * 6);
      o.core.material.opacity = 0.5 + 0.5 * k;
      o.ob.forEach((b) => b.scale.setScalar(2.2 + k * 2));
    });
    for (const c of o.ch) {
      csQuake(0.35);
      csFx(() => {
        const ls = c.children.slice();
        puff(csWP(ls[ls.length - 1]), "storm", 10, 4, 0.6, 1);
        flashScr("#b08aff", 0.25);
        ls.forEach((l) => csDebris(l, csV(csRf(-3, 3), csRf(0, 4), csRf(0, 4)), null, csRf(1.5, 2.5)));
      });
      c.visible = false;
      o.disc.rotation.z += 0.3;
      await csW(380);
    }
    await csTw(700, (k) => {
      const e = 1 - csEase(k) * 0.96;
      o.disc.scale.setScalar(e);
      o.in.scale.setScalar(e);
      o.veil.material.opacity = 0.62 * (1 - k);
      o.core.scale.setScalar(13 + k * 10);
      o.disc.rotation.z += 0.4;
    });
    csQuake(1.1);
    [o.disc, o.in, o.veil, o.core].forEach((m) => (m.visible = false));
    csFx(() => {
      flashScr("#efe2ff", 1);
      const c = csV(OX, 6.6, z0);
      puff(c, "storm", 40, 8, 1, 1.6);
      ring(OX, 0xc9a0ff, 18, 1000, z0);
      const tr = new T.Mesh(new T.TorusGeometry(1, 0.18, 8, 64), csAB(0xd8c0ff, 0.9));
      tr.position.copy(c);
      csTmp(tr, 1, (k, m) => {
        m.scale.setScalar(1 + k * 26);
        m.material.opacity = 0.9 * (1 - k);
      });
      const sw = new T.Mesh(Sp(1, 18), csAB(0x9a70ff, 0.45));
      sw.position.copy(c);
      csTmp(sw, 0.8, (k, m) => {
        m.scale.setScalar(1 + k * 16);
        m.material.opacity = 0.45 * (1 - k);
      });
      for (let i = 0; i < 46; i++) {
        const a = Math.random() * 6.283,
          sh = csGlow(
            csV(OX + Math.cos(a) * csRf(1, 7), 6.6 + Math.sin(a) * csRf(1, 7), z0 + 0.3),
            i % 3 ? 0xc9a0ff : 0xffd27a,
            csRf(0.5, 1.2),
            1,
          );
        csDebris(
          sh,
          csV(Math.cos(a) * csRf(4, 12), Math.sin(a) * csRf(4, 12) + 3, csRf(1, 7)),
          csV(0, 0, 0),
          csRf(1.2, 2.4),
        );
      }
    });
    o.ob.forEach((b) => {
      b.material.color.setHex(0xffd27a);
      b.scale.setScalar(3);
    });
    csCam(csV(OX + 2.5, 3, z0 + 9), csV(OX, 4.5, z0 - 30), 2000);
    await csW(2200);
  },
  done(o) {
    [o.disc, o.in, o.veil, o.core].forEach((m) => (m.visible = false));
    o.ch.forEach((c) => (c.visible = false));
    o.ob.forEach((b) => {
      b.material.color.setHex(0xffd27a);
      b.scale.setScalar(3);
    });
  },
});

// ---- 6. The Gloomspire: gloom chains bind the tower and a seal covers the door. A storm gathers, lightning strikes the crown,
// a light runs down the tower breaking every chain, the door seal bursts and a pillar of dawn light shoots into the sky ----
gate({
  id: "spire",
  cond: () => (P.boss || 0) > 0,
  pt: ptN("Gloomspire (needs Lv 5)"),
  msg: "The Gloomspire is unsealed. Climb it once you reach level 5.",
  build() {
    const g = new T.Group(),
      o = { g, rg: [] };
    g.position.set(OX, 0, OZ + TCZ);
    o.ds = new T.Mesh(
      new T.CircleGeometry(3.1, 40),
      new T.MeshBasicMaterial({
        map: csRune("#b48cff"),
        transparent: true,
        blending: T.AdditiveBlending,
        depthWrite: false,
        side: T.DoubleSide,
        fog: false,
      }),
    );
    o.ds.position.set(0, 2.9, 8.75);
    g.add(o.ds);
    o.dg = csGlow(csV(0, 2.9, 9), 0x9a6aff, 6, 0.5, g);
    [8, 19, 31, 42].forEach((y) => {
      const r = 8 - y / 48 + 0.38,
        m = mk(new T.TorusGeometry(r, 0.34, 6, 44), 0x3a1a5a, 0, y, 0, 1);
      m.rotation.x = Math.PI / 2;
      m.material.emissive = new T.Color(0x6a2aff);
      m.material.emissiveIntensity = 0.35;
      g.add(m);
      const sp = [];
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * 6.283,
          t = mk(Cn(0.22, 0.9, 4), 0x2a1040);
        t.position.set(Math.cos(a) * (r + 0.4), y, Math.sin(a) * (r + 0.4));
        t.quaternion.setFromUnitVectors(csV(0, 1, 0), csV(Math.cos(a), 0, Math.sin(a)));
        g.add(t);
        sp.push(t);
      }
      o.rg.push({ m, sp, y, r });
    });
    return o;
  },
  idle(o, dt, s) {
    o.ds.rotation.z += dt * 0.4;
    o.rg.forEach((R, i) => (R.m.material.emissiveIntensity = 0.3 + 0.12 * Math.sin(s * 1.5 + i)));
  },
  async cut(o) {
    const tc = OZ + TCZ;
    csCap("The Gloomspire", "Its seal dies with the Cinder Fiend", "The tower wakes");
    await csGo(csV(OX + 9, 2.6, tc + 27), csV(OX, 4, tc + 8), 1800);
    await csTw(900, (k) => {
      o.ds.rotation.z += 0.05 + k * 0.2;
      o.dg.material.opacity = 0.5 + 0.5 * k;
    });
    const cl = [];
    csFx(() => {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * 6.283,
          s = new T.Sprite(
            new T.SpriteMaterial({
              map: WGT,
              color: 0x2a1840,
              transparent: true,
              opacity: 0,
              depthWrite: false,
              fog: false,
            }),
          );
        s.scale.setScalar(csRf(16, 24));
        s.position.set(OX + Math.cos(a) * csRf(6, 14), csRf(64, 74), tc + Math.sin(a) * csRf(6, 14));
        S.add(s);
        cl.push(s);
      }
    });
    csCam(csV(OX + 7, 3, tc + 52), csV(OX, 40, tc), 2600);
    await csTw(2400, (k) =>
      cl.forEach((c, i) => {
        c.material.opacity = 0.85 * k;
        c.position.x += Math.sin(performance.now() / 700 + i) * 0.02;
      }),
    );
    for (let i = 0; i < 3; i++) {
      csFx(() => {
        csBolt(csV(OX + csRf(-12, 12), 96, tc + csRf(-12, 12)), csV(OX, 58, tc), 0xe8dcff);
        flashScr("#d8c8ff", 0.45);
      });
      csQuake(0.45);
      await csW(i < 2 ? 420 : 250);
    }
    const orb = csGlow(csV(OX, 58, tc + 7.5), 0xfff0c0, 7, 1),
      og = csGlow(csV(OX, 58, tc + 7.5), 0xffd27a, 16, 0.5);
    csCam(csV(OX + 11, 3.2, tc + 25), csV(OX, 4, tc + 8), 2600);
    const ys = [42, 31, 19, 8];
    let ri = 0;
    await csTw(2600, (k) => {
      const y = 58 - k * 55;
      orb.position.y = og.position.y = y;
      if (Math.random() < 0.6)
        csFx(() =>
          mote(orb.position.clone(), { c: 0xffd27a, s: 1, v: [csRf(-1, 1), csRf(0, 1), csRf(0, 1)], l: 0.7, g: 0 }),
        );
      while (ri < 4 && y <= ys[ri]) {
        const R = o.rg[3 - ri++];
        csQuake(0.6);
        csFx(() => {
          flashScr("#b08aff", 0.3);
          puff(csV(OX, R.y, tc + R.r), "storm", 16, 5, 0.7, 1.3);
          for (let j = 0; j < 14; j++) {
            const a = (j / 14) * 6.283,
              c = mk(B(1.4, 0.6, 0.6), 0x3a1a5a);
            c.position.set(OX + Math.cos(a) * R.r, R.y, tc + Math.sin(a) * R.r);
            c.rotation.y = -a;
            S.add(c);
            csDebris(c, csV(Math.cos(a) * csRf(4, 9), csRf(1, 5), Math.sin(a) * csRf(4, 9)), null, csRf(2, 3.2));
          }
          R.sp.forEach((t) => csDebris(t, csV(csRf(-5, 5), csRf(0, 4), csRf(-5, 5)), null, 2.4));
        });
        R.m.visible = false;
      }
    });
    orb.position.set(OX, 2.9, tc + 9.4);
    og.position.copy(orb.position);
    await csTw(800, (k) => {
      o.ds.rotation.z += 0.1 + k * 0.6;
      o.ds.scale.setScalar(1 + k * 0.25);
      o.dg.scale.setScalar(6 + k * 8);
    });
    csQuake(1);
    S.remove(orb);
    S.remove(og);
    o.ds.visible = o.dg.visible = false;
    csFx(() => {
      flashScr("#ffffff", 1);
      const c = csV(OX, 2.9, tc + 9);
      puff(c, "storm", 30, 7, 1, 1.5);
      puff(c, "fire", 20, 5, 0.9, 1.3);
      ring(OX, 0xffd27a, 16, 900, tc + 9);
      const tr = new T.Mesh(new T.TorusGeometry(1, 0.16, 8, 48), csAB(0xffe6a8, 0.9));
      tr.position.copy(c);
      csTmp(tr, 0.9, (k, m) => {
        m.scale.setScalar(1 + k * 18);
        m.material.opacity = 0.9 * (1 - k);
      });
      const b = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 240, 20, 1, true), csAB(0xffe6a8, 0));
      b.position.set(OX, 178, tc);
      const b2 = csGlow(csV(OX, 60, tc), 0xffd27a, 30, 0);
      b2.parent.remove(b2);
      csTmp(b2, 7, () => {});
      csTmp(b, 7, (k, m) => {
        const a = k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.6) / 0.4),
          w = 0.3 + 0.7 * Math.min(1, k * 6);
        m.material.opacity = 0.55 * a;
        m.scale.set(w, 1, w);
        b2.material.opacity = a;
      });
      cl.forEach((c) => {
        const o0 = c.material.opacity;
        let t = 0;
        FXL.push((dt) => {
          t += dt;
          c.material.opacity = o0 * Math.max(0, 1 - t / 3);
          if (t >= 3) {
            S.remove(c);
            return false;
          }
          return true;
        });
      });
    });
    csBloom(this.pt);
    await csCam(csV(OX + 7, 3.4, tc + 54), csV(OX, 40, tc), 2200);
    await csW(1400);
    if (CUT && CUT.skip) cl.forEach((c) => S.remove(c));
  },
});

// ---- 7. Mirewick arch: brambles and old stone. The Dawn Ember's light falls from the Gloomspire's crown in a long arc,
// sets the brambles alight, lifts the stones and blows the arch open in a wave of gold and teal ----
gate({
  id: "mire",
  cond: () => (P.warden || 0) > 0,
  pt: ptN("Mirewick Marsh"),
  msg: "Mirewick Marsh is open: the teal arch at the end plaza (Lv 6).",
  build() {
    const g = new T.Group(),
      o = { g, br: [], bo: [] };
    g.position.set(OX - 11.2, 0, OZ + PZ + 3);
    const BC = [0x2a2a1e, 0x3a2a3a, 0x22261c];
    for (let i = 0; i < 24; i++) {
      const m = new T.Mesh(new T.TorusGeometry(csRf(0.8, 1.7), csRf(0.12, 0.24), 5, 12, csRf(3, 6)), M(BC[i % 3], 1));
      m.position.set(csRf(-0.9, 0.9), csRf(0.6, 6), csRf(-2.6, 2.6));
      m.rotation.set(csRf(0, 6), csRf(0, 6), csRf(0, 6));
      g.add(m);
      o.br.push(m);
    }
    for (let i = 0; i < 34; i++) {
      const t = mk(Cn(0.1, 0.6, 4), 0x4a3a3a, 0, 0, 0, 1);
      t.position.set(csRf(-1, 1), csRf(0.5, 6.4), csRf(-2.8, 2.8));
      t.rotation.set(csRf(0, 6), csRf(0, 6), csRf(0, 6));
      g.add(t);
      o.br.push(t);
    }
    for (let i = 0; i < 6; i++) {
      const b = mk(new T.DodecahedronGeometry(csRf(0.8, 1.35), 0), 0x6a6478, 0, 0, 0, 1);
      b.position.set(csRf(-1.6, 1.6), csRf(0.6, 1.2), csRf(-2.8, 2.8));
      b.rotation.set(csRf(0, 6), csRf(0, 6), 0);
      g.add(b);
      o.bo.push(b);
    }
    for (let i = 0; i < 4; i++) csGlow(csV(csRf(-0.5, 0.5), csRf(1, 5), csRf(-2, 2)), 0x4a2a7a, 3, 0.5, g);
    return o;
  },
  async cut(o) {
    const tc = OZ + TCZ,
      ax = OX - 11.2,
      az = OZ + PZ + 3;
    csCap("Mirewick Marsh", "The Dawn Ember opens the old ways", "The light remembers");
    await csGo(csV(OX + 7, 3, OZ + PZ + 30), csV(OX, 50, tc), 2000);
    const em = csGlow(csV(OX, 60, tc), 0xfff4d0, 0.1, 1),
      eh = csGlow(csV(OX, 60, tc), 0xffc060, 0.1, 0.6);
    await csTw(1200, (k) => {
      const e = csOut(k);
      em.scale.setScalar(0.1 + 3.4 * e);
      eh.scale.setScalar(0.1 + 12 * e);
    });
    csQuake(0.2);
    const A = csV(OX, 60, tc),
      Bc = csV(OX + 10, 34, OZ + PZ - 6),
      Ct = csV(ax + 1.4, 3.2, az),
      q = new T.Vector3();
    csCam(csV(OX + 7, 3, OZ + PZ + 9), null, 2600);
    await csTw(2600, (k) => {
      const e = csEase(k),
        u = 1 - e;
      q.set(
        u * u * A.x + 2 * u * e * Bc.x + e * e * Ct.x,
        u * u * A.y + 2 * u * e * Bc.y + e * e * Ct.y,
        u * u * A.z + 2 * u * e * Bc.z + e * e * Ct.z,
      );
      em.position.copy(q);
      eh.position.copy(q);
      CSLK.lerp(q, 0.18);
      csFx(() =>
        mote(q.clone(), {
          c: Math.random() < 0.5 ? 0xffd27a : 0xfff4d0,
          s: csRf(0.5, 1.2),
          v: [csRf(-0.5, 0.5), csRf(-0.2, 0.6), csRf(-0.5, 0.5)],
          l: 1.1,
          g: 0,
        }),
      );
    });
    const ash = new T.Color(0x14100e);
    let rk = 0;
    csCam(csV(OX - 1, 2.6, az + 6), csV(ax, 3, az), 3000);
    await csTw(2800, (k) => {
      const b = 1 + Math.sin(performance.now() / 90) * 0.15;
      em.scale.setScalar(3.4 * b);
      eh.scale.setScalar(12 * b + k * 6);
      csQuake(0.12 + k * 0.35);
      if (Math.random() < 0.25) csFx(() => ring(ax + 1, 0x5fe0c0, 6 + k * 6, 700, az));
      const want = Math.floor(k * o.br.length);
      while (rk < want) {
        const m = o.br[rk++];
        m.userData.bk = 0;
        m.userData.c0 = m.material.color.clone();
        csFx(() => puff(csWP(m), "fire", 2, 1.4, 0.6, 0.9));
      }
      o.br.forEach((m) => {
        if (m.userData.bk == null) return;
        const t = (m.userData.bk = Math.min(1, m.userData.bk + 0.025));
        m.material.color.copy(m.userData.c0).lerp(ash, t);
        m.scale.setScalar(Math.max(0.05, 1 - t * 0.7));
      });
      o.bo.forEach((b, i) => {
        if (k > 0.55) b.position.y += 0.012;
        b.rotation.y += 0.01 * (i + 1) * k;
      });
    });
    csQuake(1.4);
    S.remove(em);
    S.remove(eh);
    csFx(() => {
      flashScr("#fffbe8", 1);
      const c = csV(ax + 0.5, 3, az);
      [
        [0xffe6a8, 30, 1.2, 0.5],
        [0x5fe0c0, 22, 1, 0.45],
      ].forEach(([col, R, l, op]) => {
        const sw = new T.Mesh(Sp(1, 22), csAB(col, op));
        sw.position.copy(c);
        csTmp(sw, l, (k, m) => {
          m.scale.setScalar(1 + k * R);
          m.material.opacity = op * (1 - k);
        });
      });
      ring(ax, 0xffd27a, 22, 1200, az);
      ring(ax, 0x5fe0c0, 14, 900, az);
      const tr = new T.Mesh(new T.TorusGeometry(1, 0.2, 8, 64), csAB(0xfff0c0, 0.9));
      tr.position.copy(c);
      tr.rotation.y = Math.PI / 2;
      csTmp(tr, 1.1, (k, m) => {
        m.scale.setScalar(1 + k * 30);
        m.material.opacity = 0.9 * (1 - k);
      });
      puff(c, "fire", 50, 9, 1.2, 1.8);
      puff(c, "heal", 36, 7, 1.2, 1.5);
      o.bo.forEach((b) => csDebris(b, csV(csRf(-16, -6), csRf(8, 15), csRf(-7, 7)), null, csRf(3, 4)));
      o.br.forEach((m) => csDebris(m, csV(csRf(-10, 4), csRf(2, 10), csRf(-8, 8)), null, csRf(1, 2)));
      const H0 = HL.intensity;
      let t = 0;
      FXL.push((dt) => {
        t += dt;
        if (t >= 1.6) {
          HL.intensity = H0;
          return false;
        }
        HL.intensity = H0 * (1 + 1.6 * (1 - t / 1.6));
        return true;
      });
      const b = new T.Mesh(new T.CylinderGeometry(2.4, 2.4, 80, 20, 1, true), csAB(0x5fe0c0, 0));
      b.position.set(ax, 40, az);
      csTmp(b, 4.5, (k, m) => {
        const a = k < 0.08 ? k / 0.08 : 1 - Math.max(0, (k - 0.4) / 0.6),
          w = 0.2 + 0.8 * Math.min(1, k * 5);
        m.material.opacity = 0.5 * a;
        m.scale.set(w, 1, w);
      });
    });
    o.g.visible = false;
    csBloom(this.pt);
    csCam(csV(OX + 4, 3.4, az + 10), csV(ax, 3, az), 900, csOut);
    await csW(900);
    const R = Math.hypot(OX + 4 - ax, 10),
      a0 = Math.atan2(10, OX + 4 - ax);
    await csTw(3200, (k) => {
      const a = a0 - k * 0.7;
      CSP.set(ax + Math.cos(a) * R, 3.4 + k * 1.2, az + Math.sin(a) * R);
      CSLK.set(ax, 3, az);
    });
  },
});

GTS.forEach((G) => G.reset(false));
// per character: old saves (made before gates existed) get every gate they had already earned opened quietly
function gatesInit() {
  if (!P.gates) P.gates = {};
  if (!P.gv) {
    P.gv = 1;
    GTS.forEach((G) => {
      if (G.cond() || (G.old && G.old())) P.gates[G.id] = 1;
    });
  }
  GTS.forEach((G) => G.reset(gOpen(G.id)));
}
async function runCut() {
  if (CUT) return;
  mode = "cut";
  CUT = { skip: false, shk: 0 };
  mv = 0;
  for (const k in keys) keys[k] = false;
  jv.x = jv.y = 0;
  const p0 = C.position.clone(),
    l0 = W.position.clone();
  l0.y += 2.2;
  CSP.copy(p0);
  CSLK.copy(l0);
  document.body.classList.add("cut");
  CSO.className = "on";
  csCap("");
  requestAnimationFrame(() => CSO.classList.add("in"));
  const msgs = [];
  let G,
    n = 0;
  while (CUT && (G = GTS.find((q) => !gOpen(q.id) && q.cond())) && n++ < 8) {
    CUT.skip = false;
    csCap("");
    try {
      await G.cut(G.o);
    } catch (e) {
      console.error(e);
    }
    gFin(G);
    P.gates[G.id] = 1;
    msgs.push(G.msg);
    sv();
    if (!CUT.skip) await csW(700);
  }
  csCap("");
  CUT.skip = false;
  await csGo(p0, l0, 1100);
  CSO.classList.remove("in");
  document.body.classList.remove("cut");
  setTimeout(() => {
    if (!CUT) CSO.className = "";
  }, 700);
  CUT = null;
  mode = "explore";
  MTG.visible = true;
  snap = false;
  grace = performance.now() + 2000;
  msgs.forEach((m) => toast(m, "#ffd27a"));
}
function cutCam(dt, s) {
  mv = 0;
  ambient(dt, s, W.position);
  MTG.visible = false;
  if (!CUT) return;
  CUT.shk = Math.max(0, CUT.shk - dt * 1.6);
  const a = CUT.shk;
  C.position.set(
    CSP.x + (Math.random() - 0.5) * a,
    CSP.y + (Math.random() - 0.5) * a,
    CSP.z + (Math.random() - 0.5) * a,
  );
  C.lookAt(CSLK);
}
function gateTick(dt, s) {
  csPhys(dt);
  GTS.forEach((G) => {
    if (G.idle && G.o && G.o.g.parent && G.o.g.visible) G.idle(G.o, dt, s);
  });
  const now = performance.now();
  if (
    mode === "explore" &&
    !paused &&
    !CUT &&
    now > CSN &&
    SLOT >= 0 &&
    zcur === "hub" &&
    now > grace - 1200 &&
    $("panel").style.display !== "flex"
  ) {
    CSN = now + 300;
    if (GTS.some((q) => !gOpen(q.id) && q.cond())) runCut();
  }
}
