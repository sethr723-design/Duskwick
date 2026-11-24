// DUSKWICK - 03-world.js: World: battle frame, world helpers, hub layout constants, zones, dungeons, okp/safe, world(), patrols, NPC plates, safe lines, gloom wards.
// Loaded in order by index.html as plain scripts; they share one global scope.
// ---------- battle frame: fights happen right where you meet the foe; this group is dropped onto the street ----------
const BG = new T.Group();
S.add(BG);
const mkRing = (col, a, b) => {
  const r = new T.Mesh(
    new T.RingGeometry(a, b, 32),
    new T.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.75,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
  r.rotation.x = -Math.PI / 2;
  r.position.y = 0.1;
  r.visible = false;
  BG.add(r);
  return r;
};
const RW = mkRing(0x8ad0ff, 1.1, 1.4),
  RT = mkRing(0xffd34d, 1.4, 1.75),
  RG = new T.Group();
BG.add(RG);
RG.visible = false;
{
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.translate(128, 128);
  x.strokeStyle = "#ffd27a";
  x.lineWidth = 4;
  x.beginPath();
  x.arc(0, 0, 120, 0, 7);
  x.stroke();
  x.lineWidth = 2;
  x.beginPath();
  x.arc(0, 0, 104, 0, 7);
  x.stroke();
  for (let i = 0; i < 24; i++) {
    x.save();
    x.rotate((i * Math.PI) / 12);
    x.fillStyle = "#ffd27a";
    if (i % 2) x.fillRect(-2, -120, 4, 14);
    else {
      x.beginPath();
      x.moveTo(0, -118);
      x.lineTo(-7, -100);
      x.lineTo(7, -100);
      x.fill();
    }
    x.restore();
  }
  x.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    x.rotate((Math.PI * 2) / 3);
    x.beginPath();
    x.moveTo(0, -90);
    x.lineTo(78, 45);
    x.lineTo(-78, 45);
    x.closePath();
    x.stroke();
  }
  const m = new T.Mesh(
    new T.PlaneGeometry(13.6, 13.6),
    new T.MeshBasicMaterial({
      map: new T.CanvasTexture(c),
      transparent: true,
      opacity: 0.4,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.06;
  RG.add(m);
}
const FLT = new T.PointLight(0xfff0a0, 0, 22);
BG.add(FLT);
// battle pads: four teal shield pads for your team and four crimson horned pads for foes, numbered to match the name tags and side panels.
// Empty pads stay dim so you can see at a glance which spots are open and who stands where.
const PG = new T.Group();
PG.visible = false;
BG.add(PG);
const PADS = { a: [], e: [] };
function padTex(foe, n) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.translate(128, 128);
  x.scale(2, 2);
  const col = foe ? "255,84,64" : "80,210,255",
    em = foe ? "#ffc0b0" : "#ffeaa8";
  const q = x.createRadialGradient(0, 0, 6, 0, 0, 62);
  q.addColorStop(0, "rgba(" + col + ",.6)");
  q.addColorStop(0.72, "rgba(" + col + ",.28)");
  q.addColorStop(1, "rgba(" + col + ",0)");
  x.fillStyle = q;
  x.beginPath();
  x.arc(0, 0, 62, 0, 7);
  x.fill();
  x.strokeStyle = "rgba(" + col + ",1)";
  x.lineWidth = 5;
  x.beginPath();
  x.arc(0, 0, 52, 0, 7);
  x.stroke();
  x.lineWidth = 2;
  x.beginPath();
  x.arc(0, 0, 42, 0, 7);
  x.stroke();
  for (let i = 0; i < 8; i++) {
    x.save();
    x.rotate((i * Math.PI) / 4 + Math.PI / 8);
    x.fillStyle = "rgba(" + col + ",1)";
    x.beginPath();
    x.moveTo(0, -58);
    x.lineTo(-4, -50);
    x.lineTo(4, -50);
    x.fill();
    x.restore();
  }
  x.fillStyle = em;
  x.strokeStyle = "rgba(0,0,0,.6)";
  x.lineWidth = 2;
  if (foe) {
    x.beginPath();
    x.moveTo(-20, -12);
    x.lineTo(-30, -32);
    x.lineTo(-9, -18);
    x.lineTo(9, -18);
    x.lineTo(30, -32);
    x.lineTo(20, -12);
    x.quadraticCurveTo(24, 10, 0, 24);
    x.quadraticCurveTo(-24, 10, -20, -12);
    x.fill();
    x.stroke();
    x.fillStyle = "rgba(60,6,10,.95)";
    [-9, 9].forEach((e) => {
      x.beginPath();
      x.moveTo(e - 7, -5);
      x.lineTo(e + 7, -5);
      x.lineTo(e, 3);
      x.fill();
    });
    x.fillRect(-7, 10, 14, 3);
  } else {
    x.beginPath();
    x.moveTo(0, -28);
    x.quadraticCurveTo(19, -26, 24, -18);
    x.lineTo(20, 6);
    x.quadraticCurveTo(13, 20, 0, 28);
    x.quadraticCurveTo(-13, 20, -20, 6);
    x.lineTo(-24, -18);
    x.quadraticCurveTo(-19, -26, 0, -28);
    x.fill();
    x.stroke();
    x.fillStyle = "rgba(8,50,80,.95)";
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2,
        r = i % 2 ? 5 : 12;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.fill();
  }
  x.fillStyle = foe ? "#a8241a" : "#1a7aa8";
  x.beginPath();
  x.arc(0, 47, 11, 0, 7);
  x.fill();
  x.strokeStyle = "#fff";
  x.lineWidth = 2;
  x.stroke();
  x.fillStyle = "#fff";
  x.font = "900 15px system-ui";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(n, 0, 48);
  return new T.CanvasTexture(c);
}
// ---------- world helpers: instancing, camera blockers, seeded random ----------
const CB = [],
  cb = (x, z, r, h) => CB.push({ x, z, r, h });
let SEED = 7;
const rnd = () => (SEED = (SEED * 16807) % 2147483647) / 2147483647,
  rr = (a, b) => a + rnd() * (b - a);
const IQ = new T.Object3D();
// q = [x,y,z,scale,rotY,rotX,sx,sy,sz]
function inst(geo, col, list, em) {
  if (!list.length) return null;
  const m = new T.InstancedMesh(geo, M(col, 1), list.length);
  if (em) m.material.emissive.setHex(em);
  list.forEach((q, i) => {
    IQ.position.set(q[0], q[1], q[2]);
    IQ.rotation.set(q[5] || 0, q[4] || 0, 0);
    const s = q[3] || 1;
    IQ.scale.set(s * (q[6] || 1), s * (q[7] || 1), s * (q[8] || 1));
    IQ.updateMatrix();
    m.setMatrixAt(i, IQ.matrix);
  });
  m.instanceMatrix.needsUpdate = true;
  m.frustumCulled = false;
  S.add(m);
  return m;
}
// bake: merge every mesh in a group into one geometry per material (sprites are kept as they are)
function bake(o) {
  o.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(o.matrixWorld).invert(),
    by = new Map(),
    keep = [],
    mw = new T.Matrix4();
  o.traverse((m) => {
    if (m.isMesh) {
      const g2 = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g2.applyMatrix4(mw.multiplyMatrices(inv, m.matrixWorld));
      let a = by.get(m.material);
      if (!a) by.set(m.material, (a = []));
      a.push(g2);
    } else if (m.isSprite) keep.push([m, new T.Vector3().setFromMatrixPosition(m.matrixWorld).applyMatrix4(inv)]);
  });
  const out = new T.Group();
  out.userData.bk = 1; // v36b: the world editor picks baked groups only whole
  out.position.copy(o.position);
  out.rotation.copy(o.rotation);
  by.forEach((list, mat) => {
    let n = 0;
    list.forEach((q) => (n += q.attributes.position.count));
    const pos = new Float32Array(n * 3),
      nor = new Float32Array(n * 3),
      uv = new Float32Array(n * 2);
    let a3 = 0,
      a2 = 0;
    list.forEach((q) => {
      const c = q.attributes.position.count;
      pos.set(q.attributes.position.array, a3);
      if (q.attributes.normal) nor.set(q.attributes.normal.array, a3);
      if (q.attributes.uv) uv.set(q.attributes.uv.array, a2);
      a3 += c * 3;
      a2 += c * 2;
      q.dispose();
    });
    const bg = new T.BufferGeometry();
    bg.setAttribute("position", new T.BufferAttribute(pos, 3));
    bg.setAttribute("normal", new T.BufferAttribute(nor, 3));
    bg.setAttribute("uv", new T.BufferAttribute(uv, 2));
    bg.computeBoundingSphere();
    out.add(new T.Mesh(bg, mat));
  });
  keep.forEach(([m, p]) => {
    out.add(m);
    m.position.copy(p);
  });
  return out;
}
const TREES = [],
  PINES = [],
  SPIRES = [];
const inRoad = (x, z) => {
  if (zoneAt(x, z) !== "hub") return false;
  const lx = x - OX,
    lz = z - OZ;
  for (const R of RDS) {
    if (Math.hypot(lx - R.gx, lz - R.gz) < 19.5) return true;
    const q = rdNear(R, lx, lz);
    if (q && q.d < RDW + 3) return true;
  }
  return Math.hypot(lx, lz - MLZ) < MLR + 3;
};
// v9 occluders: trees, pines and spires (instanced) get hidden while they stand between the camera and you, or in front of a fight,
// instead of the camera hopping over them into a top-down view. Each entry remembers its instance matrices so it can come back.
const OCC = [],
  ZM = new T.Matrix4().makeScale(0, 0, 0),
  OCCH = new Set();
function occReg(x, z, r, h, ms, i, ce) {
  const o = { x, z, r, h, ms: ms.filter(Boolean), i, mx: [], hb: 0, hc: 0, hid: false };
  o.ms.forEach((m) => {
    const q = new T.Matrix4();
    if (m.isInstancedMesh) m.getMatrixAt(i, q);
    o.mx.push(q);
  });
  OCC.push(o);
  if (ce) ce.oc = o;
  return o;
}
function occSet(o) {
  const h = !!(o.hb || o.hc);
  if (h === o.hid) return;
  o.hid = h;
  if (h) OCCH.add(o);
  else OCCH.delete(o);
  o.ms.forEach((m, j) => {
    if (m.isInstancedMesh) {
      m.setMatrixAt(o.i, h ? ZM : o.mx[j]);
      m.instanceMatrix.needsUpdate = true;
    } else m.visible = !h;
  });
}
const tree = (x, z, s) => {
  s = s || 1;
  if (inRoad(x, z) || okp(x, z) || okp(x + 1.3, z) || okp(x - 1.3, z) || okp(x, z + 1.3) || okp(x, z - 1.3)) return;
  if (CB.some((o) => o.r >= 3.4 && Math.hypot(x - o.x, z - o.z) < o.r + 1.4 * s)) return;
  cb(x, z, 0.9 * s, 4.4 * s);
  TREES.push([x, z, s, CB[CB.length - 1]]);
};
function flushTrees() {
  const P1 = [],
    P2 = [],
    P3 = [];
  TREES.forEach(([x, z, s]) => {
    const ry = x * 1.7 + z;
    P1.push([x, 0.6 * s, z, s]);
    P2.push([x, 2.2 * s, z, s, ry]);
    P3.push([x, 3.4 * s, z, s, ry + 0.5]);
  });
  const t1 = inst(Cy(0.2, 0.3, 1.2, GFX === "low" ? 6 : 10), 0x6b4a2b, P1),
    t2 = inst(GEOX.fir(1.1, 2.6), 0x2d6b45, P2),
    t3 = inst(GEOX.fir(0.8, 2), 0x347a50, P3);
  TREES.forEach(([x, z, s, ce], i) => occReg(x, z, 1.2 * s, 4.6 * s, [t1, t2, t3], i, ce));
  const Q = [[], [], [], []];
  PINES.forEach(([x, z, s]) => {
    [0.6, 2.2, 3.5, 4.7].forEach((y, k) => Q[k].push([x, y * s, z, s, x + z]));
  });
  const q0 = inst(Cy(0.2, 0.3, 1.2, GFX === "low" ? 6 : 10), 0x6b4a2b, Q[0]),
    q1 = inst(GEOX.fir(1.3, 2.4), 0x2f5f4f, Q[1]),
    q2 = inst(GEOX.fir(0.95, 1.8), 0x2f5f4f, Q[2]),
    q3 = inst(GEOX.fir(0.55, 1.2), 0x9aaac6, Q[3]);
  PINES.forEach(([x, z, s, ce], i) => occReg(x, z, 1.3 * s, 5.3 * s, [q0, q1, q2, q3], i, ce));
  const sp = inst(
    Cn(1, 1, 5),
    0x2a2024,
    SPIRES.map(([x, z, r, h]) => [x, h / 2, z, 1, x, 0, r, h, r]),
  );
  SPIRES.forEach(([x, z, r, h, ce], i) => occReg(x, z, r, h, [sp], i, ce));
}
// ---------- world: Lamplight Square, Gloomway Street, Hollow Road, Ashen Trail ----------
// v9 layout: Gloomway is wider (cobbles +-7, raised sidewalks out to +-10.5) and longer (to -140, end plaza at -144),
// and the Hollow Road / Ashen Trail are wider (dirt +-5, flagstone sidewalks out to +-8.2) and longer (glades at +-140).
// v12: Gloomway is twice as long (end plaza at -268, Gloomspire at -291) and is now the only street out of the square.
// GX is the old straight-road length; it is kept so the old road layout can be mapped onto the new winding roads (RMAP).
const GX = 140,
  SW = 10.5,
  SC = 7,
  RDW = 8.2,
  SL = 264,
  PZ = -268,
  PR = 14,
  TCZ = -291,
  // v43 eased these to clear the East / West Lane mouths and moved houses 1 and 6 out beside the lanes (SQOUT).
  // v44: the lanes/meadows are off again (HLON), so the square is back to its closed ring of houses.
  SQH = [330, 0, 30, 68, 112, 150, 180, 210].map((d) => (d * Math.PI) / 180),
  SQOUT = {}; // [local x, z, ry] per house index, when a square house is built elsewhere
const OX = 0,
  OZ = -400,
  solids = [],
  NPCS = [],
  foes = [],
  VIL = [],
  SMK = [],
  BATS = [],
  MTN = [],
  HOUSES = [],
  LS = [];
// ---------- v12 roads ----------
// Gloomway is the one street out of the square. Market Lane is a plaza partway up it (MLZ). The old portcullis is at GWZ,
// the Hollow Road forks east at HZ and the Ashen Trail forks west at AZ; both wind out to their glades. The ancient seal is at SEZ.
// Roads are smooth Catmull-Rom polylines in local coords (relative to the square). Both start and end with a straight run
// along x, so the gates at their mouths and the glades at their ends face the same way they always did.
const MLZ = -72,
  MLR = 16,
  GWZ = -104,
  HZ = -136,
  AZ = -196,
  SEZ = -244;
// v15 "streets with purpose": each road is three straight blocks joined by square corners (CN = the corner points; each
// corner gets a small plaza and a landmark, see __streets). Same mouths and glades as before, so gates and trails stay put.
const RCR = 12, // how far before/after a corner the bend starts
  RDCN = [
    [
      [SW, HZ],
      [96, HZ],
      [96, HZ - 36],
      [176, HZ - 36],
      [176, HZ - 12],
      [255, HZ - 12],
    ],
    [
      [-SW, AZ],
      [-96, AZ],
      [-96, AZ - 36],
      [-176, AZ - 36],
      [-176, AZ - 12],
      [-255, AZ - 12],
    ],
  ];
const RDS = RDCN.map((pts) => {
  // straight legs padded with midpoints (so the spline stays straight), each corner rounded RCR either side
  const o = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1],
      c = pts[i],
      b = pts[i + 1],
      la = Math.hypot(c[0] - a[0], c[1] - a[1]),
      lb = Math.hypot(b[0] - c[0], b[1] - c[1]),
      r = Math.min(RCR, la / 2.2, lb / 2.2);
    o.push([c[0] + ((a[0] - c[0]) * r) / la, c[1] + ((a[1] - c[1]) * r) / la]);
    o.push([c[0] + ((b[0] - c[0]) * r) / lb, c[1] + ((b[1] - c[1]) * r) / lb]);
  }
  o.push(pts[pts.length - 1]);
  const cp = [o[0]];
  for (let i = 1; i < o.length; i++) {
    const a = o[i - 1],
      b = o[i],
      n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 20));
    for (let k = 1; k <= n; k++) cp.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return cp;
}).map((cp, i) => {
  const sd = i ? -1 : 1,
    p = [];
  for (let k = 0; k < cp.length - 1; k++) {
    const p0 = cp[Math.max(0, k - 1)],
      p1 = cp[k],
      p2 = cp[k + 1],
      p3 = cp[Math.min(cp.length - 1, k + 2)],
      n = Math.max(2, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 3));
    for (let j = 0; j < n; j++) {
      const t = j / n,
        t2 = t * t,
        t3 = t2 * t;
      p.push(
        [0, 1].map(
          (c) =>
            0.5 *
            (2 * p1[c] +
              (p2[c] - p0[c]) * t +
              (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
              (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3),
        ),
      );
    }
  }
  p.push(cp[cp.length - 1].slice());
  const s = [0];
  for (let k = 1; k < p.length; k++) s.push(s[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
  const e = p[p.length - 1],
    xs = p.map((q) => q[0]),
    zs = p.map((q) => q[1]);
  return {
    sd,
    p,
    s,
    L: s[s.length - 1],
    gx: e[0] + sd * 16,
    gz: e[1],
    cn: RDCN[i].slice(1, -1), // corner points (local)
    bb: [Math.min(...xs) - 14, Math.max(...xs) + 14, Math.min(...zs) - 14, Math.max(...zs) + 14],
  };
});
const RCP = 11; // corner plaza radius (walkable)
// nearest point on a road (local coords): d = distance from the centreline, s = distance along it, o = signed offset
const rdNear = (R, x, z) => {
  const b = R.bb;
  if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return null;
  let best = 1e9,
    bs = 0,
    bo = 0;
  const P = R.p;
  for (let k = 0; k < P.length - 1; k++) {
    const ax = P[k][0],
      az = P[k][1],
      dx = P[k + 1][0] - ax,
      dz = P[k + 1][1] - az,
      l2 = dx * dx + dz * dz;
    let t = ((x - ax) * dx + (z - az) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x - ax - dx * t,
      ez = z - az - dz * t,
      d = ex * ex + ez * ez;
    if (d < best) {
      const l = Math.sqrt(l2);
      best = d;
      bs = R.s[k] + t * l;
      bo = (-(x - ax) * dz + (z - az) * dx) / l;
    }
  }
  return { d: Math.sqrt(best), s: bs, o: bo };
};
RDS.forEach((R) => (R.cs = R.cn.map((c) => rdNear(R, c[0], c[1]).s))); // v15: distance along the road of each corner
// v15 street sections: each road is three named streets split at its 1st and 3rd corners, with a level range (ZLV)
const RDSEC = [
  ["Hollow Road", "Millstream Way", "Pumpkin Patch Lane"],
  ["Ashen Trail", "Kiln Row", "Watchtower Rise"],
];
const ZLV = {
  "Gloomway Street": "Lv 1-2",
  "Hollow Road": "Lv 1-2",
  "Millstream Way": "Lv 2",
  "Pumpkin Patch Lane": "Lv 2-3",
  "Wispwood Glade": "Lv 3",
  "Frostfen Trail": "Lv 3",
  Frostfen: "Lv 3-4",
  "Ashen Trail": "Lv 3-4",
  "Kiln Row": "Lv 4",
  "Watchtower Rise": "Lv 4-5",
  "Cinder Hollow": "Lv 4-5",
  "Cinder Trail": "Lv 4-5",
  Cinderwaste: "Lv 4-5",
  "Mire Causeway": "Lv 5",
  "Mirewick Marsh": "Lv 5-6",
  "East Lane": "Lv 1", // v43
  "West Lane": "Lv 1",
  "Brightfield Meadow": "Lv 1",
  "Emberleaf Meadow": "Lv 1",
};
const rdSec = (R, s) => (s < R.cs[0] ? 0 : s < R.cs[2] ? 1 : 2);
// point and heading at distance s along a road (local coords)
const rdAt = (R, s) => {
  s = Math.max(0, Math.min(R.L, s));
  let k = 0;
  while (k < R.p.length - 2 && R.s[k + 1] < s) k++;
  const a = R.p[k],
    b = R.p[k + 1],
    l = R.s[k + 1] - R.s[k] || 1,
    t = (s - R.s[k]) / l;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / l, (b[1] - a[1]) / l];
};
// the old straight road layout (local x = distance out from the square, +-12..GX-16, z = sideways offset) mapped onto the
// winding roads, stretched to their new length. Glade-relative spots (|x| past GX-16) keep their offsets from the glade centre.
// Returns world [x, z, extra rotation.y to turn things that used to face along the straight road].
const RMAP = (x, z) => {
  const sd = x < 0 ? -1 : 1,
    ax = Math.abs(x),
    R = RDS[sd > 0 ? 0 : 1];
  if (ax >= GX - 16) return [OX + R.gx + sd * (ax - GX), OZ + R.gz + z, 0];
  const [px, pz, hx, hz] = rdAt(R, ((ax - 12) / (GX - 28)) * R.L);
  // v15: near a square corner the inside of the bend can land on the next block; put such things on the outside instead
  if (Math.abs(z) > 4) {
    const lx = px - sd * hz * z,
      lz = pz + sd * hx * z,
      q = rdNear(R, lx, lz);
    if ((q && q.d < RDW + 2.5) || R.cn.some((c) => Math.hypot(lx - c[0], lz - c[1]) < RCP + 3)) z = -z;
  }
  return [OX + px - sd * hz * z, OZ + pz + sd * hx * z, Math.atan2(-sd * hz, sd * hx)];
};
// which road (or glade) a local point stands on, or null
const rdHit = (x, z) => {
  for (let i = 0; i < 2; i++) {
    const R = RDS[i];
    if (Math.hypot(x - R.gx, z - R.gz) <= 16 && R.sd * (x - R.gx) <= 13) return { R, i, g: 1, s: R.L, o: 0, d: 0 };
    if (R.sd * x < SW - 0.5) continue;
    const q = rdNear(R, x, z);
    if (q && (q.d <= RDW * (R.wm || 1) || R.cn.some((c) => Math.hypot(x - c[0], z - c[1]) <= RCP)))
      return { R, i, g: 0, s: q.s, o: q.o, d: q.d };
  }
  return null;
};
// the name of the part of town a world point is in
const hubAt = (x, z) => {
  const lx = x - OX,
    lz = z - OZ,
    h = rdHit(lx, lz);
  if (h) return h.g ? (h.i ? "Cinder Hollow" : "Wispwood Glade") : RDSEC[h.i][rdSec(h.R, h.s)];
  if (Math.hypot(lx, lz - MLZ) <= MLR + 1) return "Market Lane";
  if (Math.abs(lx) > 18) {
    // v43 lanes and meadows
    const l = hlHit(lx, lz);
    if (l) return l.t.n;
    const m = hmIn(lx, lz);
    if (m) return m[3];
  }
  return lz > -12 ? "Lamplight Square" : "Gloomway Street";
};
// a flat strip that follows a road between sideways offsets o0..o1 (texture u runs across, v along it every vs units)
const rdRibbon = (R, o0, o1, y, mat, vs, s0, s1) => {
  s0 = s0 || 0;
  s1 = s1 == null ? R.L : s1;
  const m = new T.Mesh(rdRibbon.geo(R, o0, o1, y, vs, s0, s1), mat);
  // v46b: remembered so the world editor (13) can bend a road and rebuild every strip of it (f0/f1 = share of R.L)
  m.userData.rib = 1;
  m.__rib = { R, o0, o1, y, vs, f0: R.L ? s0 / R.L : 0, f1: R.L ? s1 / R.L : 1 };
  rdRibbon.all.push(m);
  S.add(m);
  return m;
};
rdRibbon.all = [];
// the strip's geometry in world coords (road R local + OX/OZ), from s0 to s1 along it
rdRibbon.geo = (R, o0, o1, y, vs, s0, s1) => {
  const pos = [],
    uv = [],
    idx = [],
    n = Math.max(2, Math.ceil((s1 - s0) / 2));
  for (let k = 0; k <= n; k++) {
    const s = s0 + ((s1 - s0) * k) / n,
      [x, z] = rdAt(R, s),
      a = rdAt(R, s - 1.5),
      b = rdAt(R, s + 1.5),
      l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
      hx = (b[0] - a[0]) / l,
      hz = (b[1] - a[1]) / l;
    [o0, o1].forEach((o, j) => {
      pos.push(OX + x - hz * o, y, OZ + z + hx * o);
      uv.push(j, s / vs);
    });
    if (k) {
      const q = (k - 1) * 2;
      idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};
let MTG;
const PT = [],
  TF = [
    { x: 0, z: -900 },
    { x: 0, z: -960 },
    { x: 0, z: -1020 },
  ],
  TALK = [],
  CRIT = [],
  WM = [],
  WTX = [],
  FIRES = [],
  BOB = [];
// speech bubbles: a parchment sprite with wrapped text, cached per line
const BUBT = {};
function bubTex(t) {
  if (BUBT[t]) return BUBT[t];
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 176;
  const x = c.getContext("2d");
  x.font = "600 27px Georgia,serif";
  const words = t.split(" "),
    lines = [];
  let ln = "";
  words.forEach((w) => {
    const tt = ln ? ln + " " + w : w;
    if (x.measureText(tt).width > 440 && ln) {
      lines.push(ln);
      ln = w;
    } else ln = tt;
  });
  lines.push(ln);
  const L = lines.slice(0, 3),
    h = L.length * 32 + 28,
    y0 = (140 - h) / 2;
  x.fillStyle = "rgba(255,246,222,.96)";
  x.strokeStyle = "#5a3a1a";
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(30, y0);
  x.arcTo(490, y0, 490, y0 + h, 20);
  x.arcTo(490, y0 + h, 30, y0 + h, 20);
  x.lineTo(270, y0 + h);
  x.lineTo(250, 172);
  x.lineTo(232, y0 + h);
  x.arcTo(14, y0 + h, 14, y0, 20);
  x.arcTo(14, y0, 490, y0, 20);
  x.closePath();
  x.fill();
  x.stroke();
  x.fillStyle = "#2a1a0a";
  x.textAlign = "center";
  x.textBaseline = "middle";
  L.forEach((l, i) => x.fillText(l, 252, y0 + 28 + i * 32));
  return (BUBT[t] = new T.CanvasTexture(c));
}
function bubble(e, d, lines, y, range, s) {
  if (e.li == null) {
    e.li = -1;
    e.lt = 0;
  }
  if (d < range) {
    if (!e.b) {
      e.b = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false, fog: false }));
      e.b.renderOrder = 6;
      e.b.position.y = y;
      e.o.add(e.b);
      e.bk = 0;
    }
    if (!e.b.visible || s > e.lt) {
      if (!e.b.visible || e.li < 0) e.bk = 0;
      e.li = (e.li + 1) % lines.length;
      e.b.material.map = bubTex(lines[e.li]);
      e.b.material.needsUpdate = true;
      e.lt = s + 5;
      e.b.visible = true;
    }
    e.bk = Math.min(1, e.bk + 0.08);
    const sc = 1 / (e.o.scale.x || 1),
      k = e.bk < 1 ? Math.sin(e.bk * Math.PI * 0.5) * 1.08 : 1;
    e.b.scale.set(4.4 * sc * k, 1.5 * sc * k, 1);
  } else if (e.b && e.b.visible && d > range + 1) {
    e.b.visible = false;
  }
}
const GREET = {
  qhub: [
    "Lamplighter! The street won't light itself.",
    "Story quests have a star. Follow the gold star on your map.",
    "Swirling doors lead into dungeons. The first one's in Wispwood Glade.",
  ],
  sbram: ["Fresh goods! Mostly fresh.", "I've got gear on the shelf now. Have a look."],
  ctailor: ["Ooh, that robe. We can do better.", "Style is a kind of armour, you know."],
  whub: ["Spells! Fresh-inked spells!", "The deeper pages open as you grow."],
  ahub: ["Restless in your school? I can help. For a price.", "Every school has its own light."],
  hhub: ["You look singed. Come here.", "Rest a moment. The dark can wait."],
  hfrost: ["Warm hands heal faster. Mine are freezing."],
  hember: ["Ash in the lungs? Sit down."],
  syara: ["Furs! Charms! Fewer frostbitten toes!", "Ice-touched gear, fresh from the fen."],
  sforge: ["Mind the anvil. It bites.", "Fire-forged rings and staves. Best in the waste."],
};
// v14: Mirewick moved in from x 1400 so a walkable causeway can join it to Frostfen's east side (see TRL)
const MWX = 1020,
  MWZ = -400;
// v16 zone streets (Toontown-style): every named street is its own long, straight place far east of the world, reached
// through a loading arch at the edge of its zone's village (an arch at the street's start leads back). Street i runs
// north from (ZSX0 + i * ZSDX, 0) for ZSL to a landmark plaza at its dead end. zoneAt() reports the street's zone, so
// its sky, fog and foes are its zone's. [zone, name, compass angle of its arch around the village (0 = east,
// PI / 2 = south), landmark]. Order matters (foes are dealt to streets in this order): append only.
const ZSX0 = 3000,
  ZSDX = 320,
  ZSL = 240,
  ZSB = 9, // the short walk out from the village edge to a street's arch
  ZSW = 3.6; // half-width of that walk
const ZSTR = [
  ["frost", "Rimefang Row", -0.75, "den"],
  ["frost", "Frozen Lake Way", -2.16, "lake"],
  ["frost", "Rimestone Way", 0.79, "stones"],
  ["frost", "Sled Camp Lane", 2.52, "camp"],
  ["ember", "Crater Climb", -2.83, "crater"],
  ["ember", "Obsidian Gate Road", 2.45, "gate"],
  ["ember", "Ember Steps", 1.35, "forge"],
  ["marsh", "Witchway", 0.75, "witch"],
  ["marsh", "Drowned Row", 2.1, "chapel"],
  ["marsh", "Shrine Walk", -0.79, "shrine"],
  ["marsh", "Lantern Bog", -2.65, "lantern"],
];
// v43 open world: ZSMOVE on = the streets stand beside their villages (frames in ZSF, filled after zsGate below; the
// moved-layout queries are zsIdxM / zsWalkS / zsL there). Declared up here so zsIdx / zoneAt can read them at any time.
// v43 phase 4: the whole world is still BUILT in the old layout; ZSF.on (set by OPENR.move in 64-openroads.js at
// DOMContentLoaded, after the editor boot, only when ZSMOVE is on) is what switches the queries to the moved layout.
// v45: OFF again (the user's choice for the re-layout, LAYOUT-PLAN.md): the streets stand in their old row far east,
// reached by the teleport arches on the village rims, so only the villages and their trails share the overworld.
const ZSMOVE = false, // v43 phase 8 had it on (true = the streets stand beside their villages, see 64-openroads.js)
  ZSF = [];
// which street place (index into ZSTR) a world point is in, or -1
const zsIdx = (x, z) => (ZSF.on ? zsIdxM(x, z) : zsIdxO(x, z));
// v43 phase 3: the same lookup in the OLD layout (streets in a row at x >= ZSX0). Load-time code that still builds street
// pieces at their old coords (then moves them into the street's frame, see zsHold) keys them with this.
const zsIdxO = (x, z) => {
  if (x < ZSX0 - 110) return -1;
  const i = Math.round((x - ZSX0) / ZSDX);
  return i >= 0 && i < ZSTR.length && Math.abs(x - ZSX0 - i * ZSDX) < 120 && z < 80 && z > -ZSL - 100 ? i : -1;
};
const zoneAt = (x, z) =>
  (ZSF.on || x > ZSX0 - 110) && zsIdx(x, z) >= 0
    ? ZSTR[zsIdx(x, z)][0]
    : Math.hypot(x - MWX, z - MWZ) < 175
      ? "marsh"
      : ZMV.on
        ? zmZone(x, z)
        : z > 300
          ? "dun"
          : x > 300
            ? "frost"
            : x < -300
              ? "ember"
              : z < -800
                ? "tower"
                : "hub";
// v45 moved layout (ZMV.on): the moved lands by their new circles (radius ZMV.r round the moved ZCEN), then the old rules
// with the frost / ember bands pushed out past |x| 1500 (street-dungeon interiors and the Reach keep their look)
const zmZone = (x, z) => {
  for (const k in ZMV.d) if (Math.hypot(x - ZCEN[k][0], z - ZCEN[k][1]) < ZMV.r) return k;
  return z > 300 ? "dun" : x > 1500 ? "frost" : x < -1500 ? "ember" : z < -800 ? "tower" : "hub";
};
const ZR = 140; // walkable radius of Frostfen / Cinderwaste / Mirewick (v12: was 70, 48 and 34 before that)
const ZR0 = 70; // the v11 radius: everything between ZR0 and ZR is the v12 outer wilds
// v45 re-layout (LAYOUT-PLAN.md): the map matches the reference picture. Town stays put; Cinderwaste moves east of town
// (where Frostfen stood) and Frostfen moves south of town, each by a plain shift (no turn, so village layouts stored
// relative to ZCEN stay right). Mirewick stays. The zone streets stay in their own row far east behind their teleport
// arches (ZSMOVE off), so only villages and trails share the overworld; an arch's way back (PT `to`) is shifted with
// its village. The world is still BUILT in the old layout; the move (phase 3, 64a-zonemove.js at DOMContentLoaded)
// sets ZMV.on. Until then only the dev map (Shift+F4) shows this plan. Saves and editor data stay in the old layout.
//  d  = shift per moved land; c0 = its load-time centre; r = radius round c0 that counts as that land (village + wilds)
//  tr = new routes for TRL[0..2] (same names and locks): Frostfen Trail = Wispwood Glade south to Frostfen's west link,
//       Cinder Trail = Wispwood Glade east to Cinderwaste's west rim, Mire Causeway = Cinderwaste's east rim to Mirewick
const ZMV = {
  on: 0,
  // v45: true = every game runs the move (64a ZMOVE). Multiplayer: every player must run the same setting, or foes
  // stand apart (foes are matched by index and position). false = only with localStorage duskwick_zmove = "1"
  live: true,
  d: { frost: [-360, 320], ember: [1200, 0] },
  c0: { frost: [600, -400], ember: [-600, -400] },
  r: ZR + 45,
  tr: [
    [
      [271, -534.4],
      [271, -522.4],
      [268, -498],
      [250, -420],
      [228, -330],
      [195, -230],
      [160, -150],
      [148, -116],
      [166, -92],
      [188, -86],
    ],
    [
      [284.6, -548],
      [296.6, -548],
      [320.6, -546],
      [350, -536],
      [385, -515],
      [420, -490],
      [450, -468],
      [476, -452],
      [502, -436],
      [524, -418],
      [542, -404],
      [556, -396],
      [564, -394],
    ],
    [
      [634, -413],
      [652, -410],
      [690, -408],
      [730, -400],
      [770, -392],
      [810, -404],
      [850, -400],
      [890, -396],
      [930, -398],
      [966, -398],
    ],
  ],
};
// which moved land an OLD (load-time) spot stands in, or null
const zmAt = (x, z) => {
  for (const k in ZMV.c0) if (Math.hypot(x - ZMV.c0[k][0], z - ZMV.c0[k][1]) < ZMV.r) return k;
  return null;
};
// old spot -> its spot in the new layout (raw plan mapping, whether or not the move has run)
const zmW = (x, z) => {
  const k = zmAt(x, z);
  return k ? [x + ZMV.d[k][0], z + ZMV.d[k][1]] : [x, z];
};
// new-layout spot -> old spot (raw plan mapping)
const zmL = (x, z) => {
  for (const k in ZMV.d) {
    const c = ZMV.c0[k],
      d = ZMV.d[k];
    if (Math.hypot(x - c[0] - d[0], z - c[1] - d[1]) < ZMV.r) return [x - d[0], z - d[1]];
  }
  return [x, z];
};
// an OLD-layout point -> where it stands now (unchanged until the move has run; like zsP for the streets)
const zmP = (x, z) => (ZMV.on ? zmW(x, z) : [x, z]);
// ---- v14 trails: real roads you walk between zones (the glade portals to Frostfen / Cinderwaste are gone) ----
// Smooth polylines like RDS, stored in local coords (OX/OZ subtracted) so rdNear / rdAt / rdRibbon work on them.
// lk = name of the old portal (PT) whose lock still gates the trail; while it is locked the trail is not walkable.
const mkRd = (cp) => {
  const p = [];
  for (let k = 0; k < cp.length - 1; k++) {
    const p0 = cp[Math.max(0, k - 1)],
      p1 = cp[k],
      p2 = cp[k + 1],
      p3 = cp[Math.min(cp.length - 1, k + 2)],
      n = Math.max(2, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 3));
    for (let j = 0; j < n; j++) {
      const t = j / n,
        t2 = t * t,
        t3 = t2 * t;
      p.push(
        [0, 1].map(
          (c) =>
            0.5 *
            (2 * p1[c] +
              (p2[c] - p0[c]) * t +
              (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
              (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3),
        ),
      );
    }
  }
  p.push(cp[cp.length - 1].slice());
  const s = [0];
  for (let k = 1; k < p.length; k++) s.push(s[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
  const xs = p.map((q) => q[0]),
    zs = p.map((q) => q[1]);
  return {
    sd: 1,
    p,
    s,
    L: s[s.length - 1],
    bb: [Math.min(...xs) - 14, Math.max(...xs) + 14, Math.min(...zs) - 14, Math.max(...zs) + 14],
  };
};
const TRW = RDW, // walkable half-width of a trail: road and sidewalks, like the town roads
  TRL = (() => {
    const hx = OX + RDS[0].gx + 13.6,
      hz = OZ + RDS[0].gz,
      ax = OX + RDS[1].gx - 13.6,
      az = OZ + RDS[1].gz;
    return [
      {
        n: "Frostfen Trail",
        lk: "Frostfen (needs Lv 3)",
        c0: 0x2f5f4c, // grass at the glade end, snow at the far end
        c1: 0x9fb0c8,
        z1: [600, -400],
        cp: [
          [hx, hz],
          [hx + 12, hz],
          [hx + 36, hz + 2],
          [350, -536],
          [385, -515],
          [420, -490],
          [450, -468],
          [476, -452],
          [502, -438],
          [526, -424],
          [548, -406],
        ],
      },
      {
        n: "Cinder Trail",
        lk: "Cinderwaste (needs Lv 4)",
        c0: 0x2f5f4c,
        c1: 0x3a2a2c,
        z1: [-600, -400],
        cp: [
          [ax, az],
          [ax - 12, az],
          [ax - 36, az + 2],
          [-352, -594],
          [-390, -568],
          [-425, -538],
          [-458, -506],
          [-485, -480],
          [-515, -455],
          [-545, -430],
          [-566, -413],
        ],
      },
      {
        n: "Mire Causeway",
        lk: "Mirewick Marsh",
        c0: 0x9fb0c8,
        c1: 0x1d3a36,
        z0: [600, -400],
        z1: [MWX, MWZ],
        cp: [
          [624, -392],
          [650, -396],
          [690, -408],
          [730, -400],
          [770, -392],
          [810, -404],
          [850, -400],
          [890, -396],
          [930, -398],
          [MWX - 54, MWZ + 2],
        ],
      },
    ].map((t) => Object.assign(t, mkRd(t.cp.map(([x, z]) => [x - OX, z - OZ]))));
  })();
// v43 hub lanes and meadows (open town edges). Two country lanes leave Lamplight Square east and west (where the square
// houses at 0 and 180 degrees stood; those two houses now stand beside the lanes, see SQH below), pass the town wall
// through their own gatehouse gaps (__townWall reads HLN) and wind across open meadows to the glades at the far ends of
// the Hollow Road (east) and Ashen Trail (west). Local coords like RDS. w = walkable half-width. The last 40 of a lane
// (into the glade) is only open once that glade can be reached the usual way (no story ward: lockOK at its centre), so
// the lanes never skip the road's wards. Meadows (HMD: [x, z, r] local circles, named) are walkable open ground kept
// well clear of the roads (the edge woods of 63 fill the gap). Visuals, props and clearing are in 65-meadows.js.
// v44: switched off (HLON false): the open meadows broke the walled-town feel and the hub's progression. With it off,
// HLN/HMD are empty, so okp/hubAt/__townWall/64's map behave as before v43 and 65-meadows.js is no longer loaded.
const HLON = false;
const HLN = [
  {
    n: "East Lane",
    g: 0,
    cp: [
      [17, 0],
      [30, 0],
      [44, 0],
      [70, -6],
      [105, -28],
      [140, -50],
      [175, -62],
      [210, -78],
      [238, -100],
      [258, -122],
      [266, -134],
    ],
  },
  {
    n: "West Lane",
    g: 1,
    cp: [
      [-17, 0],
      [-30, 0],
      [-44, 0],
      [-72, -10],
      [-105, -35],
      [-140, -70],
      [-180, -105],
      [-215, -135],
      [-245, -165],
      [-262, -188],
      [-268, -196],
    ],
  },
]
  .map((t) => Object.assign(t, mkRd(t.cp), { w: 6 }))
  .filter(() => HLON);
const HMD = [
  [75, -40, 28, "Brightfield Meadow"],
  [140, -55, 34, "Brightfield Meadow"],
  [210, -75, 30, "Brightfield Meadow"],
  [-75, -50, 30, "Emberleaf Meadow"],
  [-145, -80, 38, "Emberleaf Meadow"],
  [-215, -120, 32, "Emberleaf Meadow"],
].filter(() => HLON);
// may the glade end of lane t be walked? (its glade is past any story ward)
const hlOpen = (t) => {
  if (!LKON) return true;
  const R = RDS[t.g];
  return lockOK(R.gx, R.gz, Math.abs(R.gx));
};
// the lane a local point is on (or null)
const hlHit = (x, z) => {
  for (const t of HLN) {
    const q = rdNear(t, x, z);
    if (q && q.d <= t.w && (q.s < t.L - 40 || hlOpen(t))) return { t, s: q.s, d: q.d };
  }
  return null;
};
// the meadow circle a local point is in (or null)
const hmIn = (x, z) => HMD.find((c) => Math.hypot(x - c[0], z - c[1]) <= c[2] - 0.6) || null;
// v16 zone streets: each zone has a free-roam village (radius ZVR). Its named streets are their own places (see ZSTR
// above zoneAt): a short flagstone walk out from the village edge ends at a loading arch. Unnamed ZST entries are short
// links that stay in the zone (a trail's end into the village); points are relative to the zone centre.
// tint = the dirt's colour.
const ZVR = { frost: 46, ember: 46, marsh: 40 },
  ZCEN = { frost: [600, -400], ember: [-600, -400], marsh: [MWX, MWZ] },
  ZCR = 20; // landmark plaza radius at a street's dead end
const ZST = [
  [
    "frost",
    null,
    [
      [-52, -6],
      [-38, -4],
    ],
  ],
  [
    "marsh",
    null,
    [
      [-54, 2],
      [-36, 6],
    ],
  ],
];
// straight legs padded with midpoints, each corner rounded r either side (same shape rules as the town roads)
const cnrCp = (pts, r0) => {
  const o = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1],
      c = pts[i],
      b = pts[i + 1],
      la = Math.hypot(c[0] - a[0], c[1] - a[1]),
      lb = Math.hypot(b[0] - c[0], b[1] - c[1]),
      r = Math.min(r0, la / 2.2, lb / 2.2);
    o.push([c[0] + ((a[0] - c[0]) * r) / la, c[1] + ((a[1] - c[1]) * r) / la]);
    o.push([c[0] + ((b[0] - c[0]) * r) / lb, c[1] + ((b[1] - c[1]) * r) / lb]);
  }
  o.push(pts[pts.length - 1]);
  const cp = [o[0]];
  for (let i = 1; i < o.length; i++) {
    const a = o[i - 1],
      b = o[i],
      n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 12));
    for (let k = 1; k <= n; k++) cp.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return cp;
};
const ZTINT = { frost: 0xd8dcf0, ember: 0xf0d0c0, marsh: 0xb0a080 };
// ZRD: the named streets first (index i = ZSTR index, north from their start), then the in-zone links.
// cul = world-space centre of the dead-end plaza; mo = the arch's direction out from the village centre.
// v26: the streets wind (a smooth S through fixed control points; straight for the first 26 and the last 40 so the arch
// and the plaza are unchanged). pk = a side clearing [x, z, r] off the outside of the widest bend (walkable, see zsWalk).
const ZSA = (i) => (i % 2 ? -1 : 1) * (16 + ((i * 7) % 8)); // sideways swing of street i
const ZRD = ZSTR.map(([zk, n, a, lm], i) => {
  const X = ZSX0 + i * ZSDX,
    A = ZSA(i),
    sg = Math.sign(A);
  return Object.assign(
    mkRd(
      [
        [X, 0],
        [X, -26],
        [X + A * 0.6, -60],
        [X + A, -100],
        [X + A * 0.15, -138],
        [X - A * 0.75, -172],
        [X - A * 0.2, -200 + 6],
        [X, -ZSL + 40],
        [X, -ZSL],
      ].map(([x, z]) => [x - OX, z - OZ]),
    ),
    {
      zk,
      n,
      i,
      X,
      lm,
      tint: ZTINT[zk],
      cul: [X, -ZSL],
      mo: [Math.cos(a), Math.sin(a)],
      pk: [X + A + sg * (RDW + 9), -100, 11],
    },
  );
}).concat(
  ZST.map(([zk, n, pts]) => {
    const [cx, cz] = ZCEN[zk];
    return Object.assign(
      mkRd(
        cnrCp(
          pts.map(([x, z]) => [cx + x, cz + z]),
          10,
        ).map(([x, z]) => [x - OX, z - OZ]),
      ),
      {
        zk,
        n,
        tint: ZTINT[zk],
        cul: null,
      },
    );
  }),
);
// is a world point on the short walk from street t's village edge out to its arch? (m = extra margin)
const zsStub = (t, x, z, m) => {
  const c = ZCEN[t.zk],
    dx = x - c[0],
    dz = z - c[1],
    al = dx * t.mo[0] + dz * t.mo[1],
    sd = Math.abs(dz * t.mo[0] - dx * t.mo[1]);
  return al >= ZVR[t.zk] - 4 && al <= ZVR[t.zk] + ZSB + (m || 0) && sd <= ZSW + (m || 0);
};
// is a world point walkable in a zone: its village, the walks out to the street arches, the in-zone links, or a street
// street si's own walkable ground, x / z in its OLD street coords (start circle, the winding road, side clearing, plaza)
const zsWalkS = (si, x, z) => {
  const X = ZSX0 + si * ZSDX,
    t = ZRD[si],
    q = z <= 0 && z >= -ZSL ? rdNear(t, x - OX, z - OZ) : null;
  return (
    (q && q.d <= RDW) ||
    Math.hypot(x - X, z) <= 9 ||
    Math.hypot(x - X, z + ZSL) <= ZCR ||
    Math.hypot(x - t.pk[0], z - t.pk[1]) <= t.pk[2]
  );
};
const zsWalk = (zk, x, z) => {
  const si = zsIdx(x, z);
  if (si >= 0) {
    if (ZSF.on) {
      const o = zsL(si, x, z);
      return zsWalkS(si, o[0], o[1]);
    }
    return zsWalkS(si, x, z);
  }
  const c = ZCEN[zk];
  if (Math.hypot(x - c[0], z - c[1]) <= ZVR[zk]) return true;
  for (const t of ZRD) {
    if (t.zk !== zk) continue;
    if (t.n) {
      if (zsStub(t, x, z)) return true;
      continue;
    }
    const q = rdNear(t, x - OX, z - OZ);
    if (q && q.d <= RDW) return true;
  }
  return false;
};
// the named zone street a world point is on (or null)
const zsName = (x, z) => {
  const si = zsIdx(x, z);
  return si >= 0 ? ZSTR[si][1] : null;
};
// where street t's loading arch in the village triggers (world x, z)
const zsGate = (t) => {
  const c = ZCEN[t.zk],
    r = ZVR[t.zk] + ZSB - 0.8;
  return [c[0] + t.mo[0] * r, c[1] + t.mo[1] * r];
};
// v43 open world (phase 1 of joining the streets to their villages): where each zone street WILL stand once ZSMOVE is
// on (later phases). A street keeps its exact old shape: its old coords (side = x - t.X, along = -z) are turned to
// heading h (radians like the arch angle: 0 = east, PI / 2 = south) and start at the end of its village walk (ZVR + ZSB
// out along the arch angle). Headings were tuned (scratch script) so no street footprint comes near another street, a
// village, a trail, the hub (|x| < 330), the Reach, the Starfall Gate, the tower (z < -780) or z > 250.
// ry = the Y rotation that turns an old-street object into the new frame (an old facing r becomes r + ry).
// 64-openroads.js draws them on a world map (F4 with developer mode on). The game only reads ZSF while ZSMOVE is on.
// (ZSMOVE and the ZSF array are declared above zsIdx.)
[-1.2, -1.71, 1.24, 2.07, -2.38, 2.9, 1.8, 1.2, 2.55, -0.34, -2.025].forEach((h, i) => {
  const [zk, , a] = ZSTR[i],
    c = ZCEN[zk],
    r = ZVR[zk] + ZSB,
    d = [Math.cos(h), Math.sin(h)];
  ZSF.push({ h, d, o: [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r], ry: Math.atan2(-d[0], -d[1]) });
});
// old street coords -> new world coords, and back
const zsW = (i, x, z) => {
  const F = ZSF[i],
    s = x - ZRD[i].X,
    al = -z;
  return [F.o[0] + F.d[0] * al - F.d[1] * s, F.o[1] + F.d[1] * al + F.d[0] * s];
};
const zsL = (i, x, z) => {
  const F = ZSF[i],
    dx = x - F.o[0],
    dz = z - F.o[1];
  return [ZRD[i].X - dx * F.d[1] + dz * F.d[0], -(dx * F.d[0] + dz * F.d[1])];
};
// v43 phase 5: an OLD-layout point (built from t.X, -ZSL, t.pk, t.cul ...) -> where it stands now: moved into its
// street's frame once the streets are moved (ZSF.on), else unchanged. Returns [x, z].
const zsP = (x, z) => {
  if (!ZSF.on) return [x, z];
  const i = zsIdxO(x, z);
  return i >= 0 && i < ZSF.length ? zsW(i, x, z) : [x, z];
};
// a battle frame {x, z, r} worked out in street i's OLD coords -> the moved frame (a facing r turns by ZSF[i].ry)
const zsFr = (i, f) => {
  const p = zsW(i, f.x, f.z);
  return Object.assign({}, f, { x: p[0], z: p[1], r: (f.r || 0) + ZSF[i].ry });
};
// v43 phase 3: turn a holder whose children stand at OLD street-i coords (holder at the origin, unrotated) into the moved
// frame. zsW is a rotation + shift, so the holder's rotation is ZSF[i].ry and its position is where the origin lands.
const zsHold = (o, i) => {
  const p = zsW(i, 0, 0);
  o.position.set(p[0], o.position.y, p[1]);
  o.rotation.y = ZSF[i].ry;
  o.updateMatrixWorld(true);
};
// an old-coords box [x0, x1, z0, z1] of street i -> the world box around it in the moved frame
const zsBoxW = (i, b) => {
  const c = [zsW(i, b[0], b[2]), zsW(i, b[1], b[2]), zsW(i, b[0], b[3]), zsW(i, b[1], b[3])];
  return [
    Math.min(...c.map((p) => p[0])),
    Math.max(...c.map((p) => p[0])),
    Math.min(...c.map((p) => p[1])),
    Math.max(...c.map((p) => p[1])),
  ];
};
// v43 phase 2: the moved layout's street lookup. A street's area is its old place (side within 62 of t.X, from 14 behind
// its start to 30 past the plaza) turned into its frame; village rings and their walks out never count. Where two areas
// overlap near a village rim, the one whose walkable ground holds the point wins, else the one nearer its centreline.
// ZSBOX = world bounding boxes of those areas (quick reject).
const ZSBOX = ZSF.map((F, i) => {
  const X = ZSX0 + i * ZSDX,
    c = [
      [X - 62, 14],
      [X + 62, 14],
      [X - 62, -ZSL - 30],
      [X + 62, -ZSL - 30],
    ].map(([x, z]) => zsW(i, x, z));
  const xs = c.map((p) => p[0]),
    zs = c.map((p) => p[1]);
  return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
});
function zsIdxM(x, z) {
  for (const k in ZCEN) if (Math.hypot(x - ZCEN[k][0], z - ZCEN[k][1]) <= ZVR[k] + ZSB - 1) return -1;
  let best = -1,
    bd = 1e9;
  for (let i = 0; i < ZSF.length; i++) {
    const b = ZSBOX[i];
    if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue;
    const o = zsL(i, x, z),
      sd = Math.abs(o[0] - ZSX0 - i * ZSDX);
    if (sd > 62 || o[1] > 14 || o[1] < -ZSL - 30) continue;
    if (zsWalkS(i, o[0], o[1])) return i;
    if (sd < bd) {
      bd = sd;
      best = i;
    }
  }
  return best;
}
// the zone road a world point is on (within w of its centreline), or null (moved layout: streets read in their own frame)
const zrOn = (x, z, w) => {
  for (let i = 0; i < ZRD.length; i++) {
    let px = x,
      pz = z;
    if (ZSF.on && i < ZSF.length) {
      const b = ZSBOX[i];
      if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue;
      [px, pz] = zsL(i, x, z);
    }
    const q = rdNear(ZRD[i], px - OX, pz - OZ);
    if (q && q.d <= w * (ZRD[i].wm || 1)) return { t: ZRD[i], i, s: q.s, d: q.d };
  }
  return null;
};
// is a trail locked? (its old portal's lock; safe to call while the world is still being built)
const trLock = (t) => {
  try {
    const q = PT.find((o) => o.n === t.lk);
    return !!(q && q.lock && q.lock());
  } catch (e) {
    return false;
  }
};
// the trail a world point is on (within w of its centreline, default TRW), or null
const trOn = (x, z, w) => {
  for (let i = 0; i < TRL.length; i++) {
    const q = rdNear(TRL[i], x - OX, z - OZ);
    if (q && q.d <= (w || TRW) * (TRL[i].wm || 1)) return { t: TRL[i], i, s: q.s, d: q.d, o: q.o };
  }
  return null;
};
// ---- dungeons: instanced interiors far from the overworld (z > 300). Three rooms joined by corridors; the boss hall is sealed by a
// gloom ward until every other foe inside is down. Foes come back each time you walk in through the swirling door.
const dunIdx = (x) => (x > 80 ? 1 : x < -80 ? 2 : 0);
const DUN = [
  {
    n: "Mossy Catacombs",
    lv: 2,
    bx: 0,
    bz: 600,
    col: 0x7dff9a,
    floor: 0x6a7a68,
    wall: 0x34443a,
    door: [OX + RDS[0].gx, OZ + RDS[0].gz - 14.8, 0],
    out: [OX + RDS[0].gx, OZ + RDS[0].gz - 10.5, 0],
    z: "hub",
    where: "the north edge of Wispwood Glade",
    f: [
      [0, "gloom", 1, -4, -4],
      [0, "gloom", 2, 4, -5],
      [1, "gloom", 2, -5, 1],
      [1, "gloom", 2, 5, -1],
      [1, "gloom", 3, 0, -6],
    ],
    boss: {
      kind: "gloom",
      t: 3,
      mt: 3,
      hc: 0x2e7a3a,
      nm: "Mossbound Tyrant",
      hp0: 240,
      bsc: 1.3,
      wk: { ice: 0.8 }, // v23: on top of the moss table (fire x1.5, heal x0.6) in 08-battle.js
    },
    mins: { kind: "gloom", t: 2, mt: 1, hc: 0x6aaa4a, min: "mite", nm: "Moss Mite" },
  },
  {
    n: "Rimefang Den",
    lv: 4,
    bx: 160,
    bz: 600,
    col: 0x8ad0ff,
    floor: 0x8a9ab8,
    wall: 0x3a4a6a,
    door: [566, -416.2, 0],
    out: [566, -411, 0],
    z: "frost",
    where: "the wolf den in north-west Frostfen",
    f: [
      [0, "wolf", 2, -4, -4],
      [0, "wolf", 2, 4, -5],
      [1, "wolf", 3, -5, 0],
      [1, "wolf", 2, 5, -2],
      [1, "wolf", 3, 0, -7, 1],
    ],
    boss: { kind: "wolf", t: 4, big: 1, nm: "Rimefang Matriarch", hp0: 380, bsc: 1.25, wk: { ice: 0.5 } },
    mins: { kind: "wolf", t: 2, min: "cub", nm: "Rime Cub" },
  },
  {
    n: "Kiln Depths",
    lv: 5,
    bx: -160,
    bz: 600,
    col: 0xff8a3d,
    floor: 0x5a4040,
    wall: 0x2a1a1a,
    door: [-566, -426, 0],
    out: [-569, -422, 0],
    z: "ember",
    where: "the kiln door in north-east Cinderwaste",
    f: [
      [0, "hound", 3, -4, -4],
      [0, "hound", 3, 4, -5],
      [1, "hound", 3, -5, 0],
      [1, "gloom", 3, 5, -2, 0, 0xff6a2a],
      [1, "hound", 4, 0, -7, 1],
    ],
    boss: { kind: "hound", t: 4, big: 1, nm: "Kiln Mother", hp0: 480, bsc: 1.3, wk: { fire: 0.5 } },
    mins: { kind: "gloom", t: 4, mt: 2, hc: 0xff6a2a, min: "ember", nm: "Kiln Imp" },
  },
];
DUN.forEach((D) => {
  // v22: bigger rooms (were 14/15/16) and wider corridors (half-width cw, was 2.8). Corridor LENGTHS stay as before
  // (g0/g1) so the corridor torches keep their count: world() scene-child indices must not shift before BASE.
  D.cw = 4;
  const eo = (r) => Math.sqrt((r + 0.6) ** 2 - 2.8 * 2.8),
    en = (r) => Math.sqrt((r + 0.6) ** 2 - D.cw * D.cw),
    g0 = 38 - eo(14) - eo(15),
    g1 = 42 - eo(15) - eo(16),
    rr0 = 20,
    rr1 = 21,
    rr2 = 22,
    z1 = D.bz - (en(rr0) + en(rr1) + g0),
    z2 = z1 - (en(rr1) + en(rr2) + g1);
  D.R = [
    [D.bx, D.bz, rr0],
    [D.bx, z1, rr1],
    [D.bx, z2, rr2],
  ];
  D.ez = D.bz + rr0 - 9; // where the door drops you: by the south wall, well clear of the first room's foes
  D.open = false;
  const e = (k) => en(D.R[k][2]);
  D.C = [
    [D.R[0][1] - e(0) + 0.3, D.R[1][1] + e(1) - 0.3],
    [D.R[1][1] - e(1) + 0.3, D.R[2][1] + e(2) - 0.3],
  ];
});
// story wards: the far end of Gloomway and the Hollow Road open after "Summoner", the Ashen Trail after "What the Ice Remembers",
// the last stretch of Gloomway (the Fiend and the Gloomspire) after "Ash and Memory". Local coords (relative to the square).
// They read as drifting gloom rather than walls: faint from afar, thicker up close, thinning as you work on the quest that
// clears them (qi), and dissolving with a little flourish when it is done. Walking into one slows you before it stops you.
// v10: all four are now real gates (see GATES below); they block the way until their gate's cutscene has opened it
let LKON = false;
const SLK = [
  {
    gate: 1,
    t: () => !!(P.gates && P.gates.gloomway),
    qi: 2,
    ln: "the far street",
    in: (x, z, ax) => ax < 12 && z < GWZ,
    n: "The old portcullis is down. Finish Oona's quest \"Hold the Line\" and she'll have it raised.",
    w: [0, GWZ, 0, SW * 2 + 1],
  },
  {
    gate: 1,
    t: () => !!(P.gates && P.gates.seal),
    qi: 13,
    ln: "the end of Gloomway",
    in: (x, z, ax) => ax < 12 && z < SEZ,
    n: 'An ancient seal bars the end of Gloomway. The truth waiting in the Cinderwaste ("Ash and Memory") will break it.',
    w: [0, SEZ, 0, SW * 2 + 1],
  },
  {
    gate: 1,
    t: () => !!(P.gates && P.gates.hollow),
    qi: 2,
    ln: "the Hollow Road",
    in: (x, z) => x > 18.5,
    n: "The Hollow Road gate is barred. Finish Oona's quest \"Hold the Line\" and she'll open it.",
    w: [19, HZ, Math.PI / 2, RDW * 2 + 1.4],
  },
  {
    gate: 1,
    t: () => !!(P.gates && P.gates.ashen),
    qi: 11,
    ln: "the Ashen Trail",
    in: (x, z) => x < -18.5,
    n: "A wall of ice seals the Ashen Trail. The Rimefang Matriarch's winter feeds it: clear her den in north-west Frostfen.",
    w: [-19, AZ, Math.PI / 2, RDW * 2 + 1.4],
  },
];
const lockOK = (x, z, ax) => !SLK.some((L) => !L.t() && L.in(x, z, ax));
// v13 walk-in shops (built in world()): WSHOPS for the inside view, BLDW = extra walkable rectangles (shop rooms, doors,
// forecourts) in each shop's own frame, SHOPAT[kind] = where its keeper stands.
const WSHOPS = [],
  BLDW = [],
  SHOPAT = {};
const bldIn = (b, x, z, m) => {
  const dx = x - b.x,
    dz = z - b.z,
    lx = dx * b.cs - dz * b.sn,
    lz = dx * b.sn + dz * b.cs;
  return m != null
    ? Math.abs(lx) <= b.hw + m && Math.abs(lz) <= b.hd + m
    : lx >= b.x0 && lx <= b.x1 && lz >= b.z0 && lz <= b.z1;
};
// v16: shops are closed buildings now; their doors load a separate room (WSHOPS = those rooms, each with its title,
// its door and where the door leads back to). The old walls-drop-away view is gone, so there is nothing to tick.
function shopTick() {}
// the shop room a world point is in (or null)
const shopIn = (x, z) => WSHOPS.find((s) => bldIn(s, x, z, 0.6)) || null;
// v46: walk-on decks (bridges). An object whose userData.deck = [w, l, y] (a w × l box centred on its own origin, top
// at local y) is a surface: its footprint is walkable (okp) and standing on it lifts the player to its top (02 wGround,
// explore only, eased). The footprint follows the object's live transform, so raising / moving / turning / scaling it
// in the world editor moves the walk surface with it. BDECK.add(o) registers one (13 registers pasted copies too).
const BDECK = (() => {
  const list = [],
    V = new T.Vector3();
  let y = 0,
    t = 0;
  const live = (o) => {
    for (let p = o; p; p = p.parent) {
      if (p === S) return true;
      if (!p.visible && !(p.name && p.name.startsWith("zone:"))) return false; // culled zone holders still count
    }
    return false;
  };
  // the highest deck under (x, z): world y of its top, or null
  const top = (x, z) => {
    let best = null;
    for (let i = 0; i < list.length; i++) {
      const o = list[i],
        d = o.userData.deck;
      if (!d || !live(o)) continue;
      const e = o.matrixWorld.elements,
        sx = Math.hypot(e[0], e[1], e[2]),
        sz = Math.hypot(e[8], e[9], e[10]),
        rr = Math.hypot(d[0] * sx, d[1] * sz) / 2 + 1;
      if (Math.abs(x - e[12]) > rr || Math.abs(z - e[14]) > rr) continue;
      V.set(x, e[13], z);
      o.worldToLocal(V);
      if (Math.abs(V.x) > d[0] / 2 || Math.abs(V.z) > d[1] / 2) continue;
      V.y = d[2];
      o.localToWorld(V);
      if (best === null || V.y > best) best = V.y;
    }
    return best;
  };
  return {
    list,
    add(o) {
      if (o && o.userData && o.userData.deck && !list.includes(o)) list.push(o);
      return o;
    },
    // every object with userData.deck under root (pasted / rebuilt copies)
    scan(root) {
      for (let i = list.length - 1; i >= 0; i--) if (!list[i].parent) list.splice(i, 1); // drop removed copies
      if (root) root.traverse((o) => o.userData && o.userData.deck && BDECK.add(o));
    },
    on: (x, z) => list.length > 0 && top(x, z) !== null,
    top,
    // eased height for the player (called a few times a frame through wGround)
    h(x, z) {
      const now = performance.now(),
        dt = Math.min(0.1, (now - t) / 1000);
      t = now;
      const want = typeof mode !== "undefined" && mode === "explore" && list.length ? Math.max(0, top(x, z) || 0) : 0;
      y += (want - y) * Math.min(1, dt * 14);
      if (Math.abs(want - y) < 0.005) y = want;
      return y;
    },
  };
})();
const okp = (x, z) => {
  if (window.__edWalk && window.__edWalk(x, z)) return true;
  if (BDECK.list.length && BDECK.on(x, z)) return true;
  for (const b of BLDW) if (bldIn(b, x, z)) return true;
  {
    const t = trOn(x, z);
    if (t && !trLock(t.t)) return true;
  }
  const q = zoneAt(x, z);
  if (q === "dun") {
    const D = DUN[dunIdx(x)];
    for (const [cx, cz, r] of D.R) if (Math.hypot(x - cx, z - cz) <= r - 0.6) return true;
    if (Math.abs(x - D.bx) > D.cw - 0.7) return false;
    if (z < D.C[0][0] + 1.5 && z > D.C[0][1] - 1.5) return true;
    if (z < D.C[1][0] + 1.5 && z > D.C[1][1] - 1.5) return D.open || z > D.C[1][0] - 1.4;
    return false;
  }
  // v15: in the zones you roam the village freely, and outside it you keep to the streets (see ZST)
  if (q === "marsh" || q === "frost" || q === "ember") return zsWalk(q, x, z);
  if (q === "tower") return TF.some((c) => Math.hypot(x - c.x, z - c.z) <= 12.3);
  x -= OX;
  z -= OZ;
  const ax = Math.abs(x);
  if (LKON && !(DEV.on && DEV.nw) && !lockOK(x, z, ax)) return false;
  return (
    Math.hypot(x, z) <= 18 ||
    (ax <= SW && z <= -10 && z >= -SL) ||
    Math.hypot(x, z - MLZ) <= MLR ||
    Math.hypot(x, z - PZ) <= PR ||
    !!rdHit(x, z) ||
    !!hlHit(x, z) || // v43 East / West Lane
    !!hmIn(x, z) // v43 meadows
  );
};
// safe zones: Frostfen / Cinderwaste plazas (shops, healer, board, gate), camps at both glades, and each dungeon's entry landing
const SAFEC = [
  [MWX, MWZ + 18, 14],
  [595, -385, 15],
  [-596, -385, 15],
  [OX + RDS[0].gx + 4, OZ + RDS[0].gz + 1, 8.5],
  [OX + RDS[1].gx - 4, OZ + RDS[1].gz - 1, 8.5],
  ...DUN.map((D) => [D.bx, D.ez + 4, 4.6]),
];
// sidewalks are safe: Gloomway's raised sidewalks and the flagstone walks along both roads
const safe = (x, z) => {
  if (SAFEC.some((c) => Math.hypot(x - c[0], z - c[1]) < c[2])) return 1;
  for (const b of BLDW) if (bldIn(b, x, z)) return 1; // v16: shop rooms and forecourts
  {
    const si = zsIdx(x, z); // v16: the first stretch of each zone street, by its arch home
    if (si >= 0) {
      const o = ZSF.on ? zsL(si, x, z) : [x, z]; // v43: read in the street's own frame
      if (Math.abs(o[0] - ZSX0 - si * ZSDX) < 12 && o[1] > -16) return 1;
    }
  }
  const q = zoneAt(x, z);
  // v18: the zone villages (and the short walks out to their street arches) are safe hubs
  if (ZCEN[q] && zsIdx(x, z) < 0) {
    const c = ZCEN[q];
    if (Math.hypot(x - c[0], z - c[1]) <= ZVR[q] + 1) return 1;
    if (ZRD.some((t) => t.n && t.zk === q && zsStub(t, x, z, 1))) return 1;
  }
  // v18: like the town roads, the flagstone sidewalks of the trails and zone streets are safe (the dirt is +-5)
  {
    const t = trOn(x, z);
    if (t && t.d >= 4.8) return 1;
    const r = zrOn(x, z, RDW + 0.3);
    if (r && r.d >= 4.8 && r.s > 1 && r.s < r.t.L - 1) return 1;
  }
  if (q === "hub") {
    const lx = x - OX,
      lz = z - OZ,
      ax = Math.abs(lx),
      az = Math.abs(lz);
    if (Math.hypot(lx, lz) <= 18.5) return 1;
    if (Math.hypot(lx, lz - MLZ) <= MLR + 0.5) return 1;
    if (lz <= -10 && lz >= -SL + 6 && ax >= SC - 0.2 && ax <= SW + 0.2) return 1;
    const h = rdHit(lx, lz);
    return h && !h.g && h.s > 7 && h.s < h.R.L - 2 && Math.abs(h.o) >= 5 - 0.2 ? 1 : 0;
  }
  return 0;
};
let ffm, FF, WX, wxm;
// v47 clean look: the square fountain's turned-stone profiles ([radius, y], for 01's Lt), shared with 13's kit fountain
const FNTP = {
  basin: [
    [0.0001, 0.02],
    [2.78, 0],
    [2.74, 0.12],
    [2.62, 0.62],
    [2.74, 0.78],
    [2.62, 0.96],
    [2.36, 0.9],
    [2.2, 0.62],
    [0.0001, 0.6],
  ],
  column: [
    [0.0001, 0.55],
    [0.72, 0.56],
    [0.66, 0.8],
    [0.44, 0.95],
    [0.36, 1.6],
    [0.4, 2.3],
    [0.56, 2.48],
    [0.0001, 2.52],
  ],
  // the top bowl, built at y 2.6, with a small finial
  bowl: [
    [0.0001, -0.12],
    [0.5, -0.12],
    [0.98, 0.1],
    [1.12, 0.22],
    [1.0, 0.24],
    [0.4, 0.08],
    [0.26, 0.14],
    [0.22, 0.48],
    [0.32, 0.6],
    [0.14, 0.86],
    [0.0001, 0.96],
  ],
};
function world() {
  window.__w0 = S.children.length; // first of the world's own scene children (zone loading, 11-explore.js)
  const flat = (g, tx, x, y, z, rx, col) => {
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ map: tx, color: col || 0xffffff }));
    m.position.set(x, y, z);
    if (rx) m.rotation.x = rx;
    S.add(m);
    return m;
  };
  // v12: ground layers sit only cm apart, which shimmered (z-fighting) at a distance. lay() gives each layer a fixed
  // draw order on top of its real height: higher rank always wins. Only use it on a mesh's own (unshared) material.
  const lay = (m, r) => {
    const mt = m.material;
    mt.polygonOffset = true;
    mt.polygonOffsetFactor = -r;
    mt.polygonOffsetUnits = -r * 2;
    return m;
  };
  // v47 clean look: warm packed earth with soft patches and a scatter of little rounded pebbles
  const dirt = (rep) =>
    tex(
      (x) => {
        x.fillStyle = "#7a5e46";
        x.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 40; i++) {
          const cx = Math.random() * 128,
            cy = Math.random() * 128,
            r = 6 + Math.random() * 14;
          x.globalAlpha = 0.35;
          x.fillStyle = ["#86684e", "#6c523e", "#8e7256"][i % 3];
          for (const ox of [-128, 0, 128])
            for (const oy of [-128, 0, 128]) {
              x.beginPath();
              x.ellipse(cx + ox, cy + oy, r, r * 0.7, 0, 0, 7);
              x.fill();
            }
        }
      },
      rep,
      (x) => {
        for (let i = 0; i < 38; i++) {
          const px = 6 + Math.random() * 244,
            py = 6 + Math.random() * 244,
            r = 2 + Math.random() * 3.5,
            v = 150 + Math.random() * 50;
          x.fillStyle = "rgba(40,26,16,.35)";
          x.beginPath();
          x.ellipse(px + 0.8, py + 1.2, r * 1.2, r, 0, 0, 7);
          x.fill();
          x.fillStyle = "rgb(" + (v | 0) + "," + ((v * 0.9) | 0) + "," + ((v * 0.78) | 0) + ")";
          x.beginPath();
          x.ellipse(px, py, r * 1.2, r, 0, 0, 7);
          x.fill();
          x.fillStyle = "rgba(255,245,225,.35)";
          x.beginPath();
          x.ellipse(px - r * 0.3, py - r * 0.35, r * 0.5, r * 0.3, 0, 0, 7);
          x.fill();
        }
      },
    );
  const moss = (rep) =>
    tex((x) => {
      x.fillStyle = "#3f7a5a";
      x.fillRect(0, 0, 128, 128);
      x.globalAlpha = 0.6;
      for (let i = 0; i < 900; i++) {
        x.fillStyle = ["#4f9466", "#2e5f48", "#6aaa70", "#88c07a"][i % 4];
        x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2 + Math.random() * 3);
      }
    }, rep);
  // ground: wider grass sheet (so the skyline never shows a gap), square and street tops sit 2cm apart so they no longer z-fight
  lay(flat(new T.PlaneGeometry(680, 680), grass(150), OX, -0.35, OZ - 100, -Math.PI / 2), -2);
  lay(flat(Cy(19, 19, 0.3, 40), cobble(6), OX, -0.13, OZ), 2);
  lay(flat(Cy(MLR + 0.6, MLR + 0.6, 0.3, 40), cobble(6), OX, -0.12, OZ + MLZ), 3);
  // Gloomway: wide cobbled carriageway, a dark stone curb, and raised flagstone sidewalks on both sides (start/stop at the square and plaza rims)
  const st = cobble(1);
  st.repeat.set(3.4, 62);
  lay(flat(B(SC * 2, 0.3, SL - 8), st, OX, -0.15, OZ - (SL + 10) / 2), 1);
  {
    // v12: each side's sidewalk is split into runs, broken by Market Lane and by the road mouth on that side
    const runs = (sd) => {
      const cut = [[MLZ + MLR - 0.5, MLZ - MLR + 0.5], sd > 0 ? [HZ + RDW, HZ - RDW] : [AZ + RDW, AZ - RDW]],
        out = [];
      let z = -16.5;
      cut.forEach(([a, b]) => {
        out.push([z, a]);
        z = b;
      });
      out.push([z, PZ + 11]);
      return out;
    };
    const sw = tex((x) => {
      // v47 clean look: warm sandstone flags (were lilac)
      x.fillStyle = "#6c645e";
      x.fillRect(0, 0, 128, 128);
      for (let r = 0; r < 4; r++)
        for (let q = 0; q < 2; q++) {
          x.fillStyle = ["#c2b8aa", "#b4aa9c", "#ccc2b4"][(r + q) % 3];
          x.fillRect(q * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28);
        }
    }, 1);
    [-1, 1].forEach((sd) =>
      runs(sd).forEach(([z0, z1]) => {
        const L = z0 - z1,
          zc = (z0 + z1) / 2,
          t = sw.clone();
        t.needsUpdate = true;
        t.repeat.set(1, L / 3.4);
        const m = new T.Mesh(B(SW - SC + 0.1, 0.34, L), new T.MeshLambertMaterial({ map: t, color: 0xd8d0ec }));
        m.position.set(OX + (sd * (SC + SW)) / 2, -0.1, OZ + zc);
        S.add(m);
        const cu = new T.Mesh(B(0.32, 0.4, L), M(0x4a4560));
        cu.position.set(OX + sd * SC, -0.08, OZ + zc);
        S.add(cu);
      }),
    );
  }
  lay(flat(Cy(PR, PR, 0.3, 32), cobble(5), OX, -0.13, OZ + PZ), 2);
  const lm = AM(GLT, false),
    lampost = (x, z, sol) => {
      const pole = add(Cy(0.08, 0.1, 3.2, 6), 0x2a2438, x, 1.6, z);
      add(B(0.36, 0.1, 0.36), 0x2a2438, x, 3.25, z);
      // v47 polish: a real lantern on top (an upper pole, a glass lantern with a little roof and finial) so the
      // string lights strung at 4.3 tie onto the post. Children of the pole: no new scene children (editor BASE), and
      // anything that finds/hides a post by its pole (61, 13) takes the lantern with it.
      pole.add(mk(Cy(0.055, 0.07, 1.05, 6), 0x2a2438, 0, 2.22, 0)); // y 3.3 .. 4.35
      pole.add(mk(B(0.4, 0.06, 0.4), 0x2a2438, 0, 2.78, 0)); // lantern base, 4.38
      pole.add(mk(B(0.28, 0.38, 0.28), 0xffe9a0, 0, 3.0, 0)); // glowing glass, 4.6
      [-1, 1].forEach((sx) =>
        [-1, 1].forEach((sz) => pole.add(mk(B(0.04, 0.42, 0.04), 0x2a2438, sx * 0.15, 3.0, sz * 0.15))),
      );
      pole.add(mk(Cn(0.27, 0.24, 4), 0x2a2438, 0, 3.32, 0)).rotation.y = Math.PI / 4; // roof
      pole.add(mk(Sp(0.05, 6), 0xd9a441, 0, 3.48, 0)); // finial
      const g = new T.Sprite(lm);
      g.scale.setScalar(2.3);
      g.position.set(x, 4.6, z);
      S.add(g);
      if (sol) solids.push({ x, z, r: 0.4 });
    };
  M(0xffe9a0).emissive.setHex(0xcc9944);
  const WALL = [0xcdb89a, 0x9fb4c8, 0xc79a9a, 0xa9c79a],
    ROOF = [0x7a3a4a, 0x3a4a7a, 0x4a6a3a, 0x6a4a2a];
  // houses: plinth, timber framing, a street-facing gable with a round window, shuttered windows with flower boxes,
  // an arched door with an awning and a lamp, chimneys, optional upper storey, icicles in the snow and a hanging shop sign.
  // Every house is baked into one mesh per material so the richer detail costs only a handful of draw calls.
  const SHUT = [0x2f6aa8, 0xc8442f, 0x3a8a4a, 0xd9a441, 0x6a3a8a],
    TIMB = 0x4a2f1b,
    LIT = 0xffe9a0,
    DRK = 0x23253e,
    FLC = [0xff6a8a, 0xffd34d, 0x9a7aff, 0xffffff, 0xff8a3d];
  const HSIGN = [
    "THE SLEEPY WICK",
    "CANDLES",
    "BAKERY",
    "OLD BOOKS",
    "TEA & TONICS",
    "LAMP OIL",
    "CLOCKMAKER",
    "HERBALIST",
    "MAPS & CHARTS",
  ];
  const HSC = 1.5; // v16: house scale (they were barely taller than the player)
  const HMAT = {},
    houseMat = (c, kind) =>
      HMAT[c + kind] ||
      (HMAT[c + kind] = (() => {
        const m = new T.MeshToonMaterial({ color: c, map: ptex(kind), gradientMap: GR });
        m.userData.dtx = "soft";
        return m;
      })());
  const house = (x, z, ry, i, op) => {
    op = op || {};
    const o = new T.Group(),
      q = (g, c, px, py, pz, rx, ry2, rz) => {
        const m = mk(g, c, px, py, pz);
        m.rotation.set(rx || 0, ry2 || 0, rz || 0);
        o.add(m);
        return m;
      };
    const wc = op.wall || WALL[i % 4],
      rc = op.roof || ROOF[i % 4],
      tall = op.tall != null ? op.tall : i % 3 === 0,
      H = tall ? 5.6 : 3.8,
      Wd = 5,
      D = 5,
      F = D / 2,
      sc = op.shut || SHUT[(i * 3 + 1) % 5],
      lit = (k) => (i * 7 + k * 3) % 6 !== 0;
    // v47 clean look: village wall/roof colours that aren't in 01's PAT still get painted stones and shingles
    const pq = (g, c, kind, px, py, pz, rx, ry2, rz) => {
      const m = q(g, c, px, py, pz, rx, ry2, rz);
      if (!PAT[c]) m.material = houseMat(c, kind);
      return m;
    };
    q(B(5.3, 0.5, 5.3), 0x5a5470, 0, 0.25, 0);
    pq(B(Wd, H, D), wc, "brick", 0, H / 2, 0);
    if (!op.plain) {
      [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].forEach(([a, b]) => q(B(0.26, H, 0.26), TIMB, (a * Wd) / 2, H / 2, (b * D) / 2));
      [H * 0.52, H - 0.1].forEach((yy) => {
        q(B(Wd + 0.1, 0.2, 0.1), TIMB, 0, yy, F + 0.03);
        q(B(0.1, 0.2, D + 0.1), TIMB, Wd / 2 + 0.03, yy, 0);
        q(B(0.1, 0.2, D + 0.1), TIMB, -Wd / 2 - 0.03, yy, 0);
      });
      // v47: a small chevron between the upper windows (the old long braces cut through the inner shutters)
      if (tall) [-1, 1].forEach((s) => q(B(0.14, 1.45, 0.08), TIMB, s * 0.2, H * 0.74, F + 0.04, 0, 0, s * 0.3));
    }
    const rh = 2.3,
      th = Math.atan2(rh, Wd / 2),
      L = Math.hypot(Wd / 2, rh) + 0.6,
      tri = new T.Shape();
    tri.moveTo(-Wd / 2, 0);
    tri.lineTo(Wd / 2, 0);
    tri.lineTo(0, rh);
    tri.lineTo(-Wd / 2, 0);
    const gg = new T.ExtrudeGeometry(tri, { depth: D, bevelEnabled: false });
    gg.translate(0, 0, -D / 2);
    // extrude UVs are in world units: scale them to the wall's 0..1 per face so the gable's stones match the wall's
    const ga = gg.attributes.uv;
    for (let k = 0; k < ga.count; k++) ga.setXY(k, ga.getX(k) / Wd, ga.getY(k) / Wd);
    pq(gg, wc, "brick", 0, H, 0);
    [-1, 1].forEach((s) => {
      const m = pq(B(L, 0.26, D + 0.9), rc, "tile", 0, 0, 0, 0, 0, -s * th);
      m.position.set(
        s * (Wd / 4 + 0.22 * Math.cos(th) + 0.13 * Math.sin(th)),
        H + rh / 2 - 0.22 * Math.sin(th) + 0.13 * Math.cos(th),
        0,
      );
    });
    q(Cy(0.15, 0.15, D + 1, 6), rc, 0, H + rh + 0.1, 0, Math.PI / 2);
    q(new T.TorusGeometry(0.5, 0.09, 6, 16), TIMB, 0, H + rh * 0.42, F + 0.05);
    q(new T.CircleGeometry(0.45, 14), lit(9) ? LIT : DRK, 0, H + rh * 0.42, F + 0.03);
    q(B(0.06, 0.9, 0.06), TIMB, 0, H + rh * 0.42, F + 0.07);
    q(B(0.9, 0.06, 0.06), TIMB, 0, H + rh * 0.42, F + 0.07);
    // door: stone arch, plank door, knob, step, awning and lamp
    q(B(1.45, 2.05, 0.1), 0x8a849c, 0, 1.52, F + 0.03);
    q(new T.CircleGeometry(0.73, 14, 0, Math.PI), 0x8a849c, 0, 2.55, F + 0.085);
    q(B(1.05, 1.95, 0.12), 0x6b3a1a, 0, 1.47, F + 0.08);
    q(new T.CircleGeometry(0.53, 12, 0, Math.PI), 0x6b3a1a, 0, 2.44, F + 0.141);
    q(B(0.05, 1.9, 0.03), 0x3a2010, -0.18, 1.47, F + 0.15);
    q(B(0.05, 1.9, 0.03), 0x3a2010, 0.18, 1.47, F + 0.15);
    q(Sp(0.07, 6), 0xd9a441, 0.36, 1.45, F + 0.16);
    q(B(1.7, 0.3, 0.7), 0x6a6382, 0, 0.15, F + 0.55);
    q(B(1.9, 0.1, 1.0), sc, 0, 3.35, F + 0.48, 0.38);
    q(B(0.18, 0.3, 0.18), 0x2a2438, 0.98, 2.75, F + 0.22);
    const dl = new T.Sprite(AM(GLT));
    dl.scale.setScalar(1.3);
    dl.position.set(0.98, 2.75, F + 0.3);
    o.add(dl);
    // windows
    const win = (wx, wy, wz, ryw, k, fb) => {
      const g = new T.Group();
      g.position.set(wx, wy, wz);
      g.rotation.y = ryw;
      o.add(g);
      const w = (geo, c, px, py, pz) => {
        const m = mk(geo, c, px, py, pz);
        g.add(m);
        return m;
      };
      w(B(1.1, 1.25, 0.1), TIMB, 0, 0, 0);
      w(B(0.86, 1, 0.1), lit(k) ? LIT : DRK, 0, 0, 0.03);
      w(B(0.06, 1, 0.12), TIMB, 0, 0, 0.05);
      w(B(0.86, 0.06, 0.12), TIMB, 0, 0.05, 0.05);
      if (!op.noshut) [-1, 1].forEach((s) => w(B(0.42, 1.1, 0.07), sc, s * 0.78, 0, 0.06));
      if (fb) {
        w(B(1.15, 0.26, 0.34), 0x6b4a2b, 0, -0.72, 0.17);
        for (let f = 0; f < 4; f++) w(Sp(0.11, 6), FLC[(i + k + f) % 5], -0.4 + f * 0.27, -0.53, 0.2 + (f % 2) * 0.06);
      }
    };
    win(-1.65, 1.95, F + 0.03, 0, 0, !op.snow && !op.plain);
    win(1.65, 1.95, F + 0.03, 0, 1, !op.snow && !op.plain && i % 2 === 0);
    if (tall) {
      win(-1.45, 4.35, F + 0.03, 0, 2, 0);
      win(1.45, 4.35, F + 0.03, 0, 3, !op.snow && !op.plain);
    }
    win(Wd / 2 + 0.03, 1.95, 0.6, Math.PI / 2, 4, 0);
    win(-Wd / 2 - 0.03, 1.95, -0.6, -Math.PI / 2, 5, 0);
    const chim = i % 3 !== 1;
    if (chim) {
      q(B(0.62, 2.2, 0.62), 0x8a849c, 1.25, H + rh * 0.55, -1.3);
      q(B(0.78, 0.16, 0.78), 0x5a5470, 1.25, H + rh * 0.55 + 1.15, -1.3);
    }
    if (op.snow)
      for (let s = -1; s <= 1; s += 2)
        for (let k = 0; k < 9; k++)
          q(
            Cn(0.07, 0.3 + ((i + k * 5) % 4) * 0.14, 4),
            0xcfefff,
            s * (Wd / 2 + 0.55),
            H - 0.2,
            -2.6 + k * 0.65,
            Math.PI,
          );
    if (op.sign) {
      q(B(0.08, 0.08, 1.3), 0x2a2438, 1.95, 3.4, F + 0.65);
      [-0.35, 0.35].forEach((dz) => q(B(0.02, 0.3, 0.02), 0x2a2438, 1.95, 3.22, F + 0.65 + dz));
      const sg = sign(op.sign, 1.9);
      sg.position.set(1.95, 2.82, F + 0.75);
      sg.rotation.y = Math.PI / 2;
      o.add(sg);
    }
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    const out = bake(o);
    // v16: houses are HSC times bigger; the front stays on its old line and the house grows back from the street
    x -= Math.sin(ry) * F * (HSC - 1);
    z -= Math.cos(ry) * F * (HSC - 1);
    out.position.set(x, 0, z);
    out.scale.setScalar(HSC);
    S.add(out);
    cb(x, z, 3.6 * HSC, (H + rh + 0.4) * HSC);
    const hr = { o: out, x, z, op: 1, cf: -1, s: HSC };
    HOUSES.push(hr);
    CB[CB.length - 1].hs = hr;
    if (op.solid) solids.push({ x, z, r: 3.4 * HSC });
    if (chim) {
      out.updateMatrixWorld();
      const v = new T.Vector3(1.25, H + rh * 0.55 + 1.3, -1.3);
      out.localToWorld(v);
      SMK.push({ x: v.x, y: v.y, z: v.z, t: rnd() * 2, c: 0xb8b0c8 });
    }
  };
  // ---- props ----
  const barrel = (x, z) => {
    add(Cy(0.42, 0.38, 0.95, 10), 0x7a4a2a, x, 0.47, z);
    add(new T.TorusGeometry(0.42, 0.04, 4, 12), 0x3a2a1a, x, 0.75, z).rotation.x = Math.PI / 2;
    add(new T.TorusGeometry(0.4, 0.04, 4, 12), 0x3a2a1a, x, 0.2, z).rotation.x = Math.PI / 2;
    solids.push({ x, z, r: 0.5 });
  };
  const crate = (x, z, ry, y) => {
    const m = add(B(0.8, 0.8, 0.8), 0x8a5a2b, x, (y || 0) + 0.4, z);
    m.rotation.y = ry || 0;
    if (!y) solids.push({ x, z, r: 0.55 });
  };
  const bench = (x, z, ry) => {
    const o = new T.Group();
    o.add(
      mk(B(1.8, 0.12, 0.5), 0x8a5a2b, 0, 0.5, 0),
      mk(B(1.8, 0.45, 0.08), 0x8a5a2b, 0, 0.85, -0.22),
      mk(B(0.1, 0.5, 0.45), 0x2a2438, -0.75, 0.25, 0),
      mk(B(0.1, 0.5, 0.45), 0x2a2438, 0.75, 0.25, 0),
    );
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    S.add(o);
    solids.push({ x, z, r: 0.9 });
  };
  const FLW = [[], [], [], []],
    planter = (x, z, ry) => {
      const m = add(B(1.4, 0.45, 0.6), 0x5a5470, x, 0.22, z);
      m.rotation.y = ry;
      for (let k = 0; k < 5; k++) {
        const d = -0.5 + k * 0.25;
        FLW[k % 4].push([x + Math.cos(ry) * d, 0.55, z - Math.sin(ry) * d, 0.6 + rnd() * 0.4]);
      }
    };
  const fenceP = [],
    fenceR = [],
    fence = (x1, z1, x2, z2) => {
      const L = Math.hypot(x2 - x1, z2 - z1),
        n = Math.max(1, Math.round(L / 2.2)),
        a = Math.atan2(x2 - x1, z2 - z1);
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        fenceP.push([x1 + (x2 - x1) * t, 0.55, z1 + (z2 - z1) * t, 1]);
      }
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        [0.75, 0.4].forEach((y) => fenceR.push([x1 + (x2 - x1) * t, y, z1 + (z2 - z1) * t, 1, a, 0, 1, 1, L / n]));
      }
    };
  const ROCK = [],
    BUSH = [],
    SHROOM = [],
    TUFT = [];
  const scatter = (cx, cz, r0, r1, n, fn) => {
    for (let k = 0; k < n; k++) {
      const a = rnd() * 6.283,
        d = r0 + rnd() * (r1 - r0),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (okp(x, z) || inRoad(x, z)) continue;
      if (CB.some((o) => o.r >= 3.4 && Math.hypot(x - o.x, z - o.z) < o.r + 0.8)) continue;
      fn(x, z);
    }
  };
  // signs: text is measured and shrunk to fit the board (long names used to run off both edges), drawn at 2x resolution,
  // and built from two one-sided faces back to back so the words read correctly from either side instead of mirrored
  const SGC = {},
    sign = (txt, w) => {
      let tx = SGC[txt];
      if (!tx) {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 128;
        const g = c.getContext("2d");
        const wd = g.createLinearGradient(0, 0, 0, 128);
        wd.addColorStop(0, "#4a2e14");
        wd.addColorStop(1, "#2e1c0c");
        g.fillStyle = wd;
        g.fillRect(0, 0, 512, 128);
        g.strokeStyle = "rgba(0,0,0,.25)";
        g.lineWidth = 2;
        for (let i = 1; i < 4; i++) {
          g.beginPath();
          g.moveTo(0, i * 32 + Math.sin(i) * 3);
          g.bezierCurveTo(170, i * 32 - 4, 340, i * 32 + 4, 512, i * 32);
          g.stroke();
        }
        g.strokeStyle = "#c9a24a";
        g.lineWidth = 7;
        g.strokeRect(6, 6, 500, 116);
        g.fillStyle = "#c9a24a";
        [
          [16, 16],
          [496, 16],
          [16, 112],
          [496, 112],
        ].forEach(([a, b]) => {
          g.beginPath();
          g.arc(a, b, 5, 0, 7);
          g.fill();
        });
        let fs = 54;
        g.font = "800 " + fs + "px Georgia,serif";
        while (g.measureText(txt).width > 440 && fs > 18) {
          fs -= 2;
          g.font = "800 " + fs + "px Georgia,serif";
        }
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = "rgba(0,0,0,.55)";
        g.fillText(txt, 259, 69);
        g.fillStyle = "#ffe29a";
        g.fillText(txt, 256, 66);
        tx = SGC[txt] = new T.CanvasTexture(c);
        tx.anisotropy = 4;
      }
      const o = new T.Group(),
        mt = new T.MeshBasicMaterial({ map: tx, fog: false }),
        pg = new T.PlaneGeometry(w, w / 4);
      const f = new T.Mesh(pg, mt),
        b = new T.Mesh(pg, mt);
      f.position.z = 0.012;
      b.position.z = -0.012;
      b.rotation.y = Math.PI;
      const bk = new T.Mesh(B(w * 1.02, (w / 4) * 1.04, 0.02), new T.MeshBasicMaterial({ color: 0x1e1208 }));
      o.add(bk, f, b);
      return o;
    };
  const signpost = (x, z, ry, a, b) => {
    add(Cy(0.08, 0.1, 3, 6), 0x6b4a2b, x, 1.5, z);
    [a, b].forEach((t, k) => {
      if (!t) return;
      const s = sign(t, 2.6);
      s.position.set(x + Math.sin(ry) * 0.12, 2.6 - k * 0.75, z + Math.cos(ry) * 0.12); // v29: board sits on the pole, not through it
      s.rotation.y = ry;
      S.add(s);
    });
    solids.push({ x, z, r: 0.35 });
  };
  // fountain
  // v47 clean look: smooth turned stone (basin with a rolled rim, a moulded column, a lipped bowl with a finial).
  // Still exactly four scene children in the same order (editor builds store scene-child indices).
  add(Lt(FNTP.basin, 48, 60), 0x8a849c, OX, 0, OZ);
  const wt = add(Cy(2.24, 2.24, 0.1, 48), 0x4aa8e8, OX, 0.74, OZ);
  wt.material = M(0x4aa8e8, 1);
  wt.material.emissive.setHex(0x1a5a99);
  add(Lt(FNTP.column, 32, 40), 0x8a849c, OX, 0, OZ);
  add(Lt(FNTP.bowl, 32, 60), 0x8a849c, OX, 2.6, OZ);
  const fg = new T.Sprite(AM(SP.ice));
  fg.scale.setScalar(3);
  fg.position.set(OX, 3, OZ);
  S.add(fg);
  const fl = new T.PointLight(0x8ad0ff, 1, 20);
  fl.userData.pool = 1; // only the nearest pooled lights are switched on (lightPool in 11-explore.js)
  fl.position.set(OX, 3, OZ);
  S.add(fl);
  solids.push({ x: OX, z: OZ, r: 3.1 });
  // the square is wider now (floor radius 19, houses pushed out to 25) and the clutter in the middle is gone
  [0.62, 2.52, -0.68, -2.46, 1.57].forEach((a) => lampost(OX + Math.cos(a) * 16.5, OZ + Math.sin(a) * 16.5, 1));
  // square houses sit clear of the wider road mouths (east/west) and the wider street (north)
  SQH.forEach((a, i) => {
    const x = Math.cos(a) * 26,
      z = Math.sin(a) * 26;
    if (SQOUT[i])
      house(OX + SQOUT[i][0], OZ + SQOUT[i][1], SQOUT[i][2], i); // v43: beside the lanes
    else house(OX + x, OZ + z, Math.atan2(-x, -z), i);
  });
  // gate (wider, to match the street)
  const GW = SW + 0.9;
  add(B(0.9, 5.4, 0.9), 0x8a849c, OX - GW, 2.7, OZ - 14);
  add(B(0.9, 5.4, 0.9), 0x8a849c, OX + GW, 2.7, OZ - 14);
  add(B(GW * 2 + 1.2, 0.9, 1), 0x8a849c, OX, 5.4, OZ - 14);
  solids.push({ x: OX - GW, z: OZ - 14, r: 0.8 }, { x: OX + GW, z: OZ - 14, r: 0.8 });
  {
    const gs = sign("GLOOMWAY STREET", 4.6);
    gs.position.set(OX, 6.5, OZ - 13.4);
    S.add(gs);
  }
  const pg = new T.Sprite(AM(GLT));
  pg.scale.setScalar(14);
  pg.position.set(OX, 2.7, OZ - 14);
  S.add(pg);
  // street: houses, lamps, flower boxes, bunting
  // v46: one group per strand (standing at its middle) so the world editor picks the whole strand; 9 empty
  // placeholders keep the old 10-scene-children count so saved editor builds keep their scene-child indices
  const bunting = (x1, z1, x2, z2, y) => {
    const mx = (x1 + x2) / 2,
      mz = (z1 + z2) / 2,
      g = new T.Group();
    g.name = "bunting";
    g.position.set(mx, 0, mz);
    for (let i = 0; i <= 9; i++) {
      const k = i / 9,
        m = mk(
          Cn(0.22, 0.45, 3),
          [0xc8442f, 0x2f6aa8, 0xffd34d, 0x4a8a3a][i % 4],
          x1 + (x2 - x1) * k - mx,
          y - Math.sin(k * 3.14) * 0.5,
          z1 + (z2 - z1) * k - mz,
        );
      m.rotation.x = Math.PI;
      g.add(m);
    }
    // v47 polish: the cord the pennants hang from, tied to the posts at both ends (they floated on their own)
    {
      const L = [];
      for (let i = 0; i <= 18; i++) {
        const k = i / 18;
        L.push(new T.Vector3(x1 + (x2 - x1) * k - mx, y + 0.22 - Math.sin(k * 3.14) * 0.5, z1 + (z2 - z1) * k - mz));
      }
      g.add(new T.Line(new T.BufferGeometry().setFromPoints(L), new T.LineBasicMaterial({ color: 0x1a1226 })));
    }
    S.add(g);
    for (let i = 0; i < 9; i++) S.add(new T.Object3D());
  };
  // v12: twice as many houses down the longer street, with gaps for Market Lane and the two road mouths
  for (let i = 0; i < 22; i++) {
    const z = OZ - 24 - i * 10.5,
      lz = z - OZ,
      lp = SC + 0.6,
      mk0 = Math.abs(lz - MLZ) < MLR + 4,
      okW = !mk0 && Math.abs(lz - AZ) > RDW + 5,
      okE = !mk0 && Math.abs(lz - 3 - HZ) > RDW + 5;
    if (okW) house(OX - 14, z, Math.PI / 2, i, { sign: i % 2 === 0 ? HSIGN[i % 9] : null });
    if (okE) house(OX + 14, z - 3, -Math.PI / 2, i + 2, { sign: i % 2 === 1 ? HSIGN[(i + 4) % 9] : null });
    if (mk0) continue;
    if (Math.abs(lz + 5 - GWZ) > 2 && Math.abs(lz + 5 - SEZ) > 2) {
      lampost(OX - lp, z + 5, 1);
      lampost(OX + lp, z + 5, 1);
    }
    if (okW) planter(OX - 11, z + 2.4, Math.PI / 2);
    if (okE) planter(OX + 11, z - 0.6, Math.PI / 2);
    if (i % 2 === 0) bunting(OX - lp, z + 5, OX + lp, z + 5, 4.1); // v47: cord at 4.32, on the posts
  }
  // v16 shops (Toontown-style): a closed building facing the plaza, ES times the old 10x8 room with its front where it
  // was, whose door loads the shop's own room. The room is IS times the old one with a taller ceiling, standing alone in
  // the dark far south of town; it is built later by window.__shopRooms (after the editor's BASE snapshot), so this adds
  // exactly ONE child to S, like the house it replaced. Room walls are one-sided panels facing in, so the camera sees
  // through them from outside. SHOPAT[kind] = where the keeper stands (in the room) [x, z, ry].
  const SHROOMS = [];
  // the outside of a shop (local, unscaled, one baked group). Also used by the editor kit (window.__edKit.shopExt).
  const shopExt = (title, wall, roof) => {
    const Wd = 10,
      D = 8,
      F = D / 2,
      H = 5.2,
      TK = 0.3,
      DW = 2.2,
      TB = 0x4a2f1b,
      q = (p, g, c, px, py, pz, ryy, rxx) => {
        const m = mk(g, c, px, py, pz);
        m.rotation.set(rxx || 0, ryy || 0, 0);
        p.add(m);
        return m;
      };
    const ext = new T.Group(),
      glow = (px, py, pz, s) => {
        const g = new T.Sprite(AM(GLT));
        g.scale.setScalar(s || 1.3);
        g.position.set(px, py, pz);
        ext.add(g);
      };
    q(ext, B(Wd + 0.5, 0.45, D + 0.5), 0x5a5470, 0, -0.2, 0); // foundation
    q(ext, B(6, 0.4, 4.7), 0x6a6382, 0, -0.2, F + 2.6); // flagstone forecourt out to the plaza
    q(ext, B(1.8, 0.04, 1.0), 0x7a2a3a, 0, 0.07, F + 0.75); // doormat
    q(ext, B(Wd, H, TK), wall, 0, H / 2, -F);
    [-1, 1].forEach((s) => q(ext, B(D + TK, H, TK), wall, s * (Wd / 2), H / 2, 0, Math.PI / 2));
    const sl = (Wd - DW) / 2;
    // v47 clean look: framed windows (wooden frame, cross mullions, sill; arched top on the big ones) instead of
    // bare glowing panels. g = a group placed on the wall face, facing +z.
    const winF = (px, py, pz, ryy, w, h, arch) => {
      const g = new T.Group();
      g.position.set(px, py, pz);
      g.rotation.y = ryy;
      ext.add(g);
      q(g, B(w + 0.24, h + 0.24, 0.1), TB, 0, 0, 0);
      q(g, B(w, h, 0.1), 0xffd98a, 0, 0, 0.03);
      if (arch) {
        q(g, new T.CircleGeometry(w / 2 + 0.12, 20, 0, Math.PI), TB, 0, h / 2, 0.051);
        q(g, new T.CircleGeometry(w / 2, 20, 0, Math.PI), 0xffd98a, 0, h / 2, 0.081);
      }
      q(g, B(0.07, h + (arch ? w / 2 : 0), 0.06), TB, 0, arch ? w / 4 : 0, 0.1);
      q(g, B(w, 0.07, 0.06), TB, 0, h * 0.12, 0.1);
      // stone sill (the forecourt's stone colour: no new material, so the baked group's child order stays the same)
      q(g, B(w + 0.5, 0.12, 0.3), 0x6a6382, 0, -h / 2 - 0.16, 0.12);
    };
    [-1, 1].forEach((s) => {
      q(ext, B(sl, H, TK), wall, s * (DW / 2 + sl / 2), H / 2, F);
      q(ext, B(0.24, H, 0.44), TB, s * (Wd / 2), H / 2, F); // corner posts
      q(ext, B(0.24, H, 0.44), TB, s * (Wd / 2), H / 2, -F);
      q(ext, B(0.2, 2.75, 0.46), TB, s * (DW / 2 + 0.1), 1.375, F); // door frame
      // a big lit shop window either side of the door, and a smaller one upstairs
      winF(s * (DW / 2 + sl / 2), 1.6, F + 0.16, 0, 1.8, 1.15, 1);
      winF(s * (DW / 2 + sl / 2), 4.1, F + 0.16, 0, 0.95, 0.85, 0);
      // and one down each side
      winF(s * (Wd / 2 + 0.16), 1.9, 0.6, (s * Math.PI) / 2, 1.2, 1.1, 0);
    });
    q(ext, B(DW + 0.4, H - 2.75, TK), wall, 0, 2.75 + (H - 2.75) / 2, F); // over the door
    // the door itself: planks, a lit pane and a brass knob (walk into it to go in)
    q(ext, B(DW, 2.78, 0.14), 0x6b3a1a, 0, 1.39, F + 0.02); // v29: reaches the lintel (no dark gap)
    [-0.45, 0, 0.45].forEach((dx) => q(ext, B(0.05, 2.6, 0.04), 0x3a2010, dx, 1.35, F + 0.1));
    q(ext, B(0.7, 0.5, 0.06), 0xffd98a, 0, 2.05, F + 0.11);
    q(ext, Sp(0.08, 6), 0xd9a441, 0.75, 1.3, F + 0.14);
    q(ext, B(DW + 1.2, 0.12, 1.1), TB, 0, 2.95, F + 0.55, 0, 0.3); // little awning
    q(ext, B(Wd + 0.3, 0.2, 0.36), TB, 0, H - 0.1, F);
    q(ext, B(Wd + 0.3, 0.16, 0.3), TB, 0, 2.95, F + 0.07); // storey line (proud of the wall face)
    const sg = sign(title, 3);
    sg.position.set(0, 3.55, F + 0.22);
    ext.add(sg);
    glow(DW / 2 + 0.55, 2.5, F + 0.45);
    glow(-DW / 2 - 0.55, 2.5, F + 0.45);
    // gable roof, ridge along the front
    const rh = 2.4,
      hd = F + 0.55,
      th = Math.atan2(rh, hd),
      L = Math.hypot(hd, rh) + 0.25;
    [-1, 1].forEach((s) => {
      const m = q(ext, B(Wd + 0.9, 0.26, L), roof, 0, H + rh / 2, (s * hd) / 2);
      m.rotation.x = s * th;
    });
    const tri = new T.Shape();
    tri.moveTo(-F, 0);
    tri.lineTo(F, 0);
    tri.lineTo(F, 0.15); // v29: closes the sliver between the wall tops and the roof's underside at the eaves
    tri.lineTo(0, rh - 0.1);
    tri.lineTo(-F, 0.15);
    tri.lineTo(-F, 0);
    [-1, 1].forEach((s) => {
      const gg = new T.ExtrudeGeometry(tri, { depth: TK, bevelEnabled: false });
      gg.rotateY(Math.PI / 2);
      q(ext, gg, wall, s * (Wd / 2) - TK / 2, H, 0);
    });
    q(ext, Cy(0.14, 0.14, Wd + 1, 6), roof, 0, H + rh + 0.05, 0, 0).rotation.z = Math.PI / 2;
    q(ext, B(0.7, 2.2, 0.7), 0x8a849c, Wd / 2 - 1.6, H + rh * 0.6, -1.4); // chimney
    q(ext, B(0.86, 0.16, 0.86), 0x5a5470, Wd / 2 - 1.6, H + rh * 0.6 + 1.15, -1.4);
    return bake(ext);
  };
  // v40: at = {x, z, r, back} builds the same walk-in shop round another centre (the zone villages' outfitters, see
  // window.__vshop below); without it, it stands on Market Lane's rim as before
  const shop = (d, kind, title, wall, roof, at) => {
    const a = (d * Math.PI) / 180,
      Wd = 10,
      D = 8,
      F = D / 2,
      ES = 1.45,
      IS = 1.3,
      R1 = (at ? at.r : 21) + F * ES,
      lx0 = Math.cos(a) * R1,
      lz0 = Math.sin(a) * R1,
      x = (at ? at.x : OX) + lx0,
      z = (at ? at.z : OZ + MLZ) + lz0,
      ry = Math.atan2(-lx0, -lz0),
      cs = Math.cos(ry),
      sn = Math.sin(ry),
      toW = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs],
      // the room's centre; its door faces south (+z). v46: rows of 4 at x -290..-20, z 170 / 260, south-west of town:
      // the old row ran east to x 390, in sight of Frostfen since the v45 re-layout put it at (240, -80). Kept at
      // |x| < 300 and z < 300 so zoneAt still says "hub" there before and after the move.
      ix = -290 + (SHROOMS.length % 4) * 90,
      iz = [170, 260, 80, -10][Math.floor(SHROOMS.length / 4) % 4],
      inW = (lx, lz) => [ix + lx * IS, iz + lz * IS],
      H = 5.2,
      TK = 0.3,
      DW = 2.2,
      TB = 0x4a2f1b,
      SHW = Wd - 1.4, // back shelf width
      q = (p, g, c, px, py, pz, ryy, rxx) => {
        const m = mk(g, c, px, py, pz);
        m.rotation.set(rxx || 0, ryy || 0, 0);
        p.add(m);
        return m;
      };
    // ---- the outside ----
    const og = new T.Group();
    {
      const o = og;
      o.add(shopExt(title, wall, roof));
      o.position.set(x, 0, z);
      o.rotation.y = ry;
      o.scale.setScalar(ES);
      S.add(o);
    }
    // walk-in: only the forecourt; the door (a loading zone) takes you in, the room's door brings you back out
    BLDW.push({ x, z, cs, sn, x0: -4, x1: 4, z0: F * ES + 0.3, z1: F * ES + 6.8 });
    const bw = BLDW[BLDW.length - 1];
    const [dx, dz] = toW(0, F * ES + 0.9),
      [ox, oz] = toW(0, F * ES + 4.2),
      [rx, rz] = inW(0, F - 0.6),
      [sx, sz] = inW(0, F - 2.8);
    // dy: the turn from one door's frame to the other's (room doors face +z, i.e. 0), so tp() keeps the camera angle
    PT.push({
      x: dx,
      z: dz,
      to: [sx, sz, Math.PI],
      dy: -ry,
      n: title,
      r: new T.Object3D(),
      g: null,
      col: 0xffd98a,
      rad: 2,
    });
    PT.push({
      x: rx,
      z: rz,
      to: [ox, oz, ry],
      dy: ry,
      n: at ? at.back : "Market Lane",
      r: new T.Object3D(),
      g: null,
      col: 0xffd98a,
      rad: 2,
    });
    // v46: the building's door, the room's way back out and the forecourt follow the building when the world editor
    // moves / turns / resizes / deletes it (13 wApply reads this map)
    (window.__shopLk || (window.__shopLk = new Map())).set(og, {
      d: PT[PT.length - 2],
      b: PT[PT.length - 1],
      w: bw,
      ry,
    });
    const [nx, nz] = inW(0, -F + 1.15);
    SHOPAT[kind] = [nx, nz, 0];
    WSHOPS.push({ x: ix, z: iz, cs: 1, sn: 0, hw: (Wd / 2) * IS, hd: F * IS, title, door: [rx, rz] });
    BLDW.push({
      x: ix,
      z: iz,
      cs: 1,
      sn: 0,
      x0: -(Wd / 2 - 0.5) * IS,
      x1: (Wd / 2 - 0.5) * IS,
      z0: -(F - 0.9) * IS,
      z1: (F - 0.3) * IS,
    });
    // ---- the room (built later) ----
    SHROOMS.push(() => {
      const Hi = 5.2,
        base = new T.Group(),
        sol = (lx, lz, r) => {
          const [px, pz] = inW(lx, lz);
          solids.push({ x: px, z: pz, r: r * IS });
        },
        glow = (px, py, pz, s) => {
          const g = new T.Sprite(AM(GLT));
          g.scale.setScalar(s || 1.3);
          g.position.set(px, py, pz);
          base.add(g);
        },
        pane = (w, h, c, px, py, pz, ryy, rxx) => q(base, new T.PlaneGeometry(w, h), c, px, py, pz, ryy, rxx);
      // floor, walls facing in (wood panelling below, the shop's colour above), beamed ceiling
      q(base, B(Wd, 0.2, D), 0x8a5a2b, 0, -0.1, 0);
      for (let k = -4; k <= 4; k++) q(base, B(0.04, 0.02, D), 0x6b4220, k * 1.1, 0.005, 0);
      [
        [Wd, 0, -F, 0],
        [Wd, 0, F, Math.PI],
        [D, -Wd / 2, 0, Math.PI / 2],
        [D, Wd / 2, 0, -Math.PI / 2],
      ].forEach(([w, px, pz, r]) => {
        const nx2 = Math.sin(r) * 0.02,
          nz2 = Math.cos(r) * 0.02;
        pane(w, Hi, wall, px, Hi / 2, pz, r);
        pane(w, 1.3, 0x5a3a1a, px + nx2, 0.65, pz + nz2, r);
        pane(w, 0.14, TB, px + nx2 * 2, 1.33, pz + nz2 * 2, r);
        pane(w, 0.2, TB, px + nx2 * 2, Hi - 0.1, pz + nz2 * 2, r);
      });
      pane(Wd, D, 0x5a4a3a, 0, Hi, 0, 0, Math.PI / 2);
      [-2.6, 0, 2.6].forEach((bz) => q(base, B(Wd, 0.3, 0.3), TB, 0, Hi - 0.15, bz));
      // the way out: the door on the front wall, with a mat and a lit pane
      q(base, B(DW + 0.4, 2.95, 0.1), TB, 0, 1.475, F - 0.06);
      q(base, B(DW, 2.75, 0.12), 0x6b3a1a, 0, 1.375, F - 0.1);
      q(base, B(0.7, 0.5, 0.04), 0xffd98a, 0, 2.05, F - 0.17);
      q(base, B(1.8, 0.04, 1.1), 0x7a2a3a, 0, 0.03, F - 1.0);
      // shop windows either side of the door (night outside)
      [-1, 1].forEach((s) => {
        q(base, B(1.9, 1.4, 0.06), 0x23305a, s * 3.2, 1.9, F - 0.05);
        q(base, B(2.1, 0.12, 0.2), TB, s * 3.2, 1.15, F - 0.1);
      });
      // counter and keeper
      const cz = -F + 2.3;
      q(base, B(3.6, 1.0, 0.8), 0x7a4a2a, 0, 0.5, cz);
      q(base, B(3.8, 0.1, 1.0), 0x5a3a1a, 0, 1.05, cz);
      [-1.3, 0, 1.3].forEach((lx) => sol(lx, cz, 0.6));
      [-2.4, 2.4].forEach((lx) => {
        glow(lx, Hi - 1.0, 0.4, 2);
        q(base, Cy(0.02, 0.02, 0.8, 4), 0x2a2438, lx, Hi - 0.5, 0.4);
        q(base, Sp(0.22, 8), 0xffe9a0, lx, Hi - 1.0, 0.4);
      });
      // trade props (deterministic: index arithmetic only)
      const shelf = (lx, lz, w, rot, cols) => {
        q(base, B(w, 2.4, 0.5), 0x5a3a1a, lx, 1.2, lz, rot);
        for (let r = 0; r < 3; r++)
          for (let k = 0; k < Math.floor(w / 0.32); k++) {
            const ox2 = -w / 2 + 0.2 + k * 0.32,
              c = cols[(k * 3 + r * 5) % cols.length],
              hgt = 0.3 + ((k + r) % 3) * 0.06,
              px = lx + Math.cos(rot) * ox2,
              pz = lz - Math.sin(rot) * ox2;
            q(base, B(0.2, hgt, 0.3), c, px, 0.45 + r * 0.75 + hgt / 2, pz, rot);
          }
      };
      if (kind === "spell") {
        shelf(0, -F + 0.45, SHW, 0, [0x7a2a5a, 0x2f6aa8, 0xd9a441, 0x3a8a4a, 0x8a3a2a]);
        const orb = q(base, Sp(0.3, 12), 0xb89aff, -1.1, 1.42, cz);
        orb.material = orb.material.clone();
        orb.material.emissive.setHex(0x6a4ad8);
        glow(-1.1, 1.42, cz, 1.2);
        [0, 1, 2].forEach((k) =>
          q(base, Cy(0.08, 0.1, 0.32, 6), [0xff6a8a, 0x6ad8ff, 0x9aff6a][k], 0.7 + k * 0.3, 1.26, cz),
        );
        [-1, 1].forEach((s) => {
          q(base, Cy(0.5, 0.5, 0.9, 10), 0x5a3a1a, s * 3.2, 0.45, 1.6);
          q(base, B(0.7, 0.12, 0.5), 0xd9c9a0, s * 3.2, 0.95, 1.6, 0.3 * s);
          sol(s * 3.2, 1.6, 0.6);
        });
      } else if (kind === "goods") {
        shelf(0, -F + 0.45, SHW, 0, [0x8a5a2b, 0xd9c070, 0x6b4a2b, 0xa8b0c0, 0x4a8a3a]);
        [
          [-3.3, 1.8],
          [-3.3, 0.7],
          [3.2, 1.9],
        ].forEach(([lx, lz], k) => {
          q(base, B(0.9, 0.9, 0.9), 0x8a5a2b, lx, 0.45, lz, k * 0.4);
          if (k !== 1) q(base, B(0.7, 0.7, 0.7), 0x7a4a2a, lx, 1.25, lz, k * 0.7);
          sol(lx, lz, 0.65);
        });
        [-0.5, 0.5].forEach((lz) => {
          q(base, Cy(0.42, 0.38, 0.95, 10), 0x7a4a2a, 3.3, 0.47, lz - 0.6);
          sol(3.3, lz - 0.6, 0.5);
        });
        q(base, Sp(0.4, 8), 0xcdb89a, -3.4, 0.35, -0.5);
      } else if (kind === "tailor") {
        shelf(0, -F + 0.45, SHW, 0, [0xa83232, 0x2f8a56, 0x35408f, 0xd9822b, 0xff9ad0, 0xe8e0f0]);
        [-1, 1].forEach((s) => {
          const lx = s * 3.1;
          q(base, Cy(0.05, 0.05, 1.1, 6), 0x2a2438, lx, 0.55, 1.2);
          q(base, Cn(0.45, 1.1, 10), s > 0 ? 0x7a2a5a : 0x2f6aa8, lx, 1.55, 1.2);
          q(base, Sp(0.2, 8), 0xcdb89a, lx, 2.25, 1.2);
          sol(lx, 1.2, 0.55);
        });
        q(base, B(0.1, 2, 1.2), 0x4a2f1b, -Wd / 2 + 0.3, 1.2, -0.6);
        q(base, B(0.06, 1.7, 0.95), 0xcfe8ff, -Wd / 2 + 0.36, 1.2, -0.6);
        [0, 1, 2].forEach((k) =>
          q(base, Cy(0.15, 0.15, 1.3, 8), [0xa83232, 0xc9a02a, 0x2a8a8a][k], 3.6, 0.65, -1.2 + k * 0.35),
        );
      } else if (kind === "heal") {
        [-1, 1].forEach((s) => {
          const lx = s * 3.2;
          q(base, B(1.3, 0.5, 2.4), 0x6b4a2b, lx, 0.25, 1.0);
          q(base, B(1.2, 0.18, 2.3), 0xe8e0f0, lx, 0.59, 1.0);
          q(base, B(0.8, 0.16, 0.5), 0xffffff, lx, 0.74, 0.1);
          sol(lx, 0.6, 0.7);
          sol(lx, 1.6, 0.7);
        });
        shelf(0, -F + 0.45, SHW, 0, [0x7dff9a, 0x3a8a4a, 0xd9c070, 0xe8e0f0, 0x9fe8ff]);
        q(base, Cy(0.15, 0.2, 0.4, 8), 0x3a8a4a, 1.2, 1.3, cz);
        glow(0, 1.6, 1.0, 1.1);
      } else if (kind === "school") {
        shelf(-Wd / 2 + 0.45, -0.5, 4.6, Math.PI / 2, [0x7a2a5a, 0x2f6aa8, 0xd9a441, 0x35408f]);
        shelf(Wd / 2 - 0.45, -0.5, 4.6, -Math.PI / 2, [0x3a8a4a, 0x8a3a2a, 0xd9a441, 0x5a2a8a]);
        [-1, 1].forEach((s) => [-2.2, -0.5, 1.2].forEach((lz) => sol(s * (Wd / 2 - 0.6), lz, 0.5)));
        q(base, Cy(1.3, 1.3, 0.03, 20), 0x23305a, 0, 0.07, 0.9); // rug
        // the five schools' gems in a ring on the back wall
        const gems = [0xff7a3d, 0xfff06a, 0x6fd3ff, 0x5ad87a, 0xb58aff];
        gems.forEach((c, k) => {
          const an = (k / 5) * Math.PI * 2,
            gm = q(base, new T.OctahedronGeometry(0.2), c, Math.sin(an) * 0.9, 2.6 + Math.cos(an) * 0.9, -F + 0.25);
          gm.material = gm.material.clone();
          gm.material.emissive.setHex(c).multiplyScalar(0.5);
        });
        glow(0, 2.6, -F + 0.4, 1.8);
        q(base, B(2.6, 2.6, 0.1), 0x4a2f1b, 0, 2.6, -F + 0.2);
      } else if (kind === "outfit") {
        // v40 village outfitter: folded gear on the back shelf, two dressed stands, a saddle on a trestle, a rug
        shelf(0, -F + 0.45, SHW, 0, [roof, 0xd9c9a0, 0x6b4a2b, wall, 0x3a2a6a, 0xd9a35a]);
        [-1, 1].forEach((s) => {
          const lx = s * 3.1;
          q(base, Cy(0.05, 0.05, 1.1, 6), 0x2a2438, lx, 0.55, 1.4);
          q(base, Cn(0.45, 1.1, 10), s > 0 ? roof : 0x3a2a6a, lx, 1.55, 1.4);
          q(base, Sp(0.2, 8), 0xcdb89a, lx, 2.25, 1.4);
          q(base, Cn(0.28, 0.5, 10), s > 0 ? 0x3a2a6a : roof, lx, 2.55, 1.4);
          sol(lx, 1.4, 0.55);
        });
        [-0.5, 0.5].forEach((lz) => q(base, B(0.12, 0.8, 0.12), 0x5a3a1a, -3.4, 0.4, lz - 1.2));
        q(base, B(0.3, 0.12, 1.4), 0x5a3a1a, -3.4, 0.85, -1.2);
        q(base, B(0.75, 0.22, 0.95), 0x7a3a2a, -3.4, 1.02, -1.2);
        q(base, B(0.8, 0.05, 0.9), 0xd9a35a, -3.4, 1.15, -1.2);
        sol(-3.4, -1.2, 0.8);
        q(base, Cy(1.3, 1.3, 0.03, 20), roof, 0, 0.07, 0.9);
        glow(0, 1.6, 0.9, 1.1);
      }
      const o = new T.Group();
      o.add(bake(base));
      o.position.set(ix, 0, iz);
      o.scale.setScalar(IS);
      S.add(o);
      // the dark around the room (seen past its walls when the camera swings outside them)
      const dk = new T.Mesh(
        new T.BoxGeometry(70, 40, 70),
        new T.MeshBasicMaterial({ color: 0x07060c, side: T.BackSide, fog: false }),
      );
      dk.position.set(ix, 12, iz);
      S.add(dk);
      const df = new T.Mesh(new T.PlaneGeometry(70, 70), dk.material.clone());
      df.material.side = T.FrontSide;
      df.rotation.x = -Math.PI / 2;
      df.position.set(ix, -0.08, iz);
      S.add(df);
    });
  };
  window.__shopRooms = () => SHROOMS.forEach((f) => f());
  // Market Lane: three buildings backing each side of the plaza. v13: five are walk-in shops (one scene child each, the
  // same as the houses they replaced, so the editor's saved scene indices don't move); the middle west one stays a house.
  const SHOPDEF = {
    150: ["spell", "SPELLWRIGHT", 0x8a7ab8, 0x3a2a6a],
    210: ["goods", "BRAM'S GOODS", 0xcdb89a, 0x7a3a2a],
    30: ["tailor", "PIP TAILOR", 0xc79a9a, 0x4a6a3a],
    [-30]: ["heal", "HEALER", 0xe8e0d0, 0x3a6a5a],
    0: ["school", "SAGE ILSA", 0x9fb4c8, 0x23305a],
  };
  [150, 180, 210, -30, 0, 30].forEach((d, i) => {
    const a = (d * Math.PI) / 180,
      x = Math.cos(a) * 24,
      z = Math.sin(a) * 24;
    if (SHOPDEF[d]) shop(d, ...SHOPDEF[d]);
    else house(OX + x, OZ + MLZ + z, Math.atan2(-x, -z), i + 5, { sign: i === 1 ? "MARKET LANE" : null });
  });
  // v40: a walk-in shop round any centre, built at once (call only after the editor's BASE snapshot, i.e. from a file
  // loading after 13-editor.js: it adds scene children). at = {x, z, r, d (degrees round the centre), back (exit name)}.
  // Returns the room (WSHOPS entry) and where its keeper stands.
  window.__vshop = (at, kind, title, wall, roof) => {
    shop(at.d, kind, title, wall, roof, at);
    SHROOMS[SHROOMS.length - 1]();
    return { room: WSHOPS[WSHOPS.length - 1], keep: SHOPAT[kind].slice() };
  };
  // end plaza (bigger)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28,
      x = OX + Math.cos(a) * 12,
      z = OZ + PZ + Math.sin(a) * 12;
    add(Cy(0.5, 0.6, 3.5, 6), 0x5a5470, x, 1.75, z);
    solids.push({ x, z, r: 0.6 });
  }
  // v12 town wall: a crenellated stone curtain wall with round towers around the whole town (square, Gloomway, Market
  // Lane, end plaza, and south around Lantern Row / the Gardens). Where the Hollow Road and Ashen Trail cross the wall
  // line there is a gap with a gatehouse. It sits outside the walkable area, so it needs no solids. No randomness.
  // IMPORTANT: this is only defined here. It is BUILT from the end of 13-editor.js, after the editor snapshots
  // S.children (BASE): saved "model" builds point at scene-child indices, so nothing new may be added to S before that.
  // builds = the editor's saved list; the south side is sized to wrap around them.
  window.__townWall = (builds, opt) => {
    const WX = 36,
      WS = 24,
      WN = -314,
      WH = 5.2,
      WT = 1.5,
      // v47 clean look: big rounded storybook stones in a warm grey (was the small floor cobble in lilac)
      wtx = ptex("brick"),
      wcol = 0xb0a69a,
      wmat = (len, h) => {
        const t = wtx.clone();
        t.needsUpdate = true;
        t.repeat.set(Math.max(1, len / 4.2), h / 4.2);
        return new T.MeshLambertMaterial({ map: t, color: wcol });
      };
    // where each road crosses x = ±WX: [z, half-width of the gap along the wall]
    const gaps = { 1: [], "-1": [] };
    RDS.concat(HLN).forEach((R) => {
      // v43: the hub lanes get gatehouse gaps too
      let p = rdAt(R, 0);
      for (let s = 0.5; s <= R.L; s += 0.5) {
        const q = rdAt(R, s);
        [-1, 1].forEach((sd) => {
          const w = sd * WX;
          // v15: counted once even when a sample lands exactly on the wall line (the straight first block does, at
          // s = 25.5); counting it twice drew a strip of wall straight across the gap
          if (p[0] < w !== q[0] < w) {
            const k = (w - p[0]) / (q[0] - p[0]),
              dx = q[0] - p[0],
              dz = q[1] - p[1],
              c = Math.abs(dx) / (Math.hypot(dx, dz) || 1);
            gaps[sd].push([p[1] + dz * k, ((R.w || RDW) + 1.4) / Math.max(0.35, c)]);
          }
        });
        p = q;
      }
    });
    const merl = [];
    // v46d: the wall blocks walking: collision circles along every run and on every tower (this build's list in
    // __townWall.sol, so the editor can swap them when the wall is re-laid)
    const SOLW = (window.__townWall.sol = []),
      wsol = (x, z, r) => {
        const s = { x: OX + x, z: OZ + z, r, tw: 1 };
        SOLW.push(s);
        solids.push(s);
      };
    const seg = (x0, z0, x1, z1) => {
      const L = Math.hypot(x1 - x0, z1 - z0);
      if (L < 0.6) return;
      for (let d = 0; d <= L + 0.01; d += 1) wsol(x0 + ((x1 - x0) * d) / L, z0 + ((z1 - z0) * d) / L, WT / 2 + 0.25);
      const ry = Math.atan2(x1 - x0, z1 - z0),
        m = new T.Mesh(B(WT, WH, L), wmat(L, WH));
      m.position.set(OX + (x0 + x1) / 2, WH / 2 - 0.3, OZ + (z0 + z1) / 2);
      m.rotation.y = ry;
      S.add(m);
      // a slightly wider coping stone along the top, and merlons on it
      const cp = new T.Mesh(B(WT + 0.5, 0.35, L), M(0x7a7290));
      cp.position.set(OX + (x0 + x1) / 2, WH - 0.15, OZ + (z0 + z1) / 2);
      cp.rotation.y = ry;
      S.add(cp);
      for (let d = 1.1; d < L - 0.6; d += 2.4) merl.push([x0 + ((x1 - x0) * d) / L, z0 + ((z1 - z0) * d) / L, ry]);
    };
    const glow = AM(GLT);
    const tower = (x, z, r) => {
      const h = WH + 2.6,
        m = new T.Mesh(Cy(r, r * 1.1, h, 14), wmat(r * 6, h));
      m.position.set(OX + x, h / 2 - 0.3, OZ + z);
      S.add(m);
      wsol(x, z, r * 1.1);
      add(Cy(r + 0.35, r + 0.35, 0.45, 14), 0x7a7290, OX + x, h - 0.1, OZ + z);
      add(Cn(r + 0.7, 3.4, 14), 0x3a2a5a, OX + x, h + 1.8, OZ + z);
      add(Sp(0.22, 6), 0xffd27a, OX + x, h + 3.6, OZ + z);
      // a lit window facing into town
      const wx = x - Math.sign(x || 1) * (r + 0.02);
      const wn = mk(B(0.12, 1, 0.6), 0xffc860, OX + wx, h - 2.2, OZ + z, 1); // own material (M() is shared)
      wn.material.emissive.setHex(0x8a5a10);
      S.add(wn);
      const g = new T.Sprite(glow);
      g.scale.setScalar(3.2);
      g.position.set(OX + wx, h - 2.2, OZ + z);
      S.add(g);
    };
    // v46c: a wall laid along the editor's markers (opt.poly, local [x, z], closed when 3+): straight runs between
    // them, a tower on each, gatehouse gaps (towers + arch) wherever a road or hub lane crosses a run
    if (opt && Array.isArray(opt.poly) && opt.poly.length > 1) {
      const P = opt.poly,
        n = P.length,
        RS = RDS.concat(HLN),
        runs = n > 2 && !opt.open ? n : n - 1;
      for (let i = 0; i < runs; i++) {
        const [ax, az] = P[i],
          [bx, bz] = P[(i + 1) % n],
          L = Math.hypot(bx - ax, bz - az);
        if (L < 0.6) continue;
        const ux = (bx - ax) / L,
          uz = (bz - az) / L,
          at = (d) => [ax + ux * d, az + uz * d],
          gl = [];
        // where each road crosses this run: [distance along it, half the gap]
        RS.forEach((R) => {
          let p = rdAt(R, 0);
          for (let s = 0.5; s <= R.L; s += 0.5) {
            const q = rdAt(R, s),
              rx = q[0] - p[0],
              rz = q[1] - p[1],
              d = rx * (bz - az) - rz * (bx - ax);
            if (Math.abs(d) > 1e-9) {
              const t = ((ax - p[0]) * (bz - az) - (az - p[1]) * (bx - ax)) / d,
                u = ((ax - p[0]) * rz - (az - p[1]) * rx) / d;
              if (t >= 0 && t < 1 && u >= 0 && u <= 1) {
                const c = Math.abs(rx * uz - rz * ux) / (Math.hypot(rx, rz) || 1);
                gl.push([u * L, ((R.w || RDW) + 1.4) / Math.max(0.35, c)]);
              }
            }
            p = q;
          }
        });
        gl.sort((a, b) => a[0] - b[0]);
        let d0 = 0;
        gl.forEach(([g, hw]) => {
          const a = Math.max(d0, g - hw),
            b = Math.min(L, g + hw);
          if (a > d0) seg(...at(d0), ...at(a));
          d0 = Math.max(d0, b);
          tower(...at(Math.max(0, g - hw - 1.2)), 2.2);
          tower(...at(Math.min(L, g + hw + 1.2)), 2.2);
          const ar = new T.Mesh(B(WT + 0.4, 1.4, hw * 2 + 1), wmat(hw * 2, 1.4)),
            m = at(g);
          ar.position.set(OX + m[0], WH + 0.9, OZ + m[1]);
          ar.rotation.y = Math.atan2(ux, uz);
          S.add(ar);
        });
        if (d0 < L) seg(...at(d0), bx, bz);
        // towers along the run every ~44, clear of the gatehouses
        for (let d = 44; d < L - 10; d += 44) if (!gl.some(([g, hw]) => Math.abs(d - g) < hw + 6)) tower(...at(d), 2);
      }
      P.forEach(([x, z]) => tower(x, z, 2.6));
      const im = new T.InstancedMesh(B(1.1, 0.8, WT + 0.3), M(0x8a829c), Math.max(1, merl.length)),
        dm = new T.Object3D();
      im.count = merl.length;
      merl.forEach(([x, z, ry], i) => {
        dm.position.set(OX + x, WH + 0.4, OZ + z);
        dm.rotation.set(0, ry, 0);
        dm.updateMatrix();
        im.setMatrixAt(i, dm.matrix);
      });
      S.add(im);
      return;
    }
    // east and west sides, broken by the road gaps (each gap gets a tower either side and an arch over it)
    [-1, 1].forEach((sd) => {
      const x = sd * WX,
        gl = gaps[sd].slice().sort((a, b) => b[0] - a[0]);
      let z = WS;
      gl.forEach(([gz, hw]) => {
        seg(x, z, x, gz + hw);
        z = gz - hw;
        tower(x, gz + hw + 1.2, 2.2);
        tower(x, gz - hw - 1.2, 2.2);
        const ar = new T.Mesh(B(WT + 0.4, 1.4, hw * 2 + 1), wmat(hw * 2, 1.4));
        ar.position.set(OX + x, WH + 0.9, OZ + gz);
        S.add(ar);
        const lt = sign(sd > 0 ? "HOLLOW ROAD" : "ASHEN TRAIL", 3.6);
        lt.position.set(OX + x - sd * (WT / 2 + 0.3), WH + 0.9, OZ + gz);
        lt.rotation.y = -sd * (Math.PI / 2);
        S.add(lt);
      });
      seg(x, z, x, WN);
      // towers along the side every ~44 units, kept clear of the gatehouses
      for (let tz = WS; tz >= WN; tz -= 44)
        if (!gl.some(([gz, hw]) => Math.abs(tz - gz) < hw + 6)) tower(x, tz, tz === WS ? 2.6 : 2);
      tower(x, WN, 2.6);
    });
    seg(-WX, WN, WX, WN);
    tower(0, WN, 2.4);
    // south side: closes the ring around Lantern Row / the Gardens, sized from the saved editor builds so it never cuts
    // through them (5 units of margin). With no builds it closes 40 units south of the square.
    let XS = WX,
      ZS = 40;
    (Array.isArray(builds) ? builds : []).forEach((o) => {
      if (!o || typeof o.x !== "number" || typeof o.z !== "number") return;
      const lx = o.x - OX,
        lz = o.z - OZ;
      if (lz < 16 || lz > 260 || Math.abs(lx) > 200) return;
      const s = o.s || [1, 1, 1],
        r = o.g === "model" ? (o.rad || 1) * Math.max(s[0], s[2]) : Math.max(s[0], s[2]) / 2;
      XS = Math.max(XS, Math.abs(lx) + r + 5);
      ZS = Math.max(ZS, lz + r + 5);
    });
    XS = Math.ceil(XS);
    ZS = Math.ceil(ZS);
    // v46c: the ring this built (local corners), where the editor's wall markers start
    window.__townWall.ring = [
      [-XS, ZS],
      [-XS, WS],
      [-WX, WS],
      [-WX, WN],
      [WX, WN],
      [WX, WS],
      [XS, WS],
      [XS, ZS],
    ].filter((p, i, a) => !i || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
    [-1, 1].forEach((sd) => {
      if (XS > WX) {
        seg(sd * WX, WS, sd * XS, WS);
        tower(sd * XS, WS, 2.6);
      }
      seg(sd * XS, WS, sd * XS, ZS);
      for (let tz = WS + 44; tz < ZS - 10; tz += 44) tower(sd * XS, tz, 2);
      tower(sd * XS, ZS, 2.6);
    });
    seg(-XS, ZS, XS, ZS);
    for (let tx = -XS + 44; tx < XS - 10; tx += 44) tower(tx, ZS, 2);
    // merlons as one instanced mesh
    const im = new T.InstancedMesh(B(1.1, 0.8, WT + 0.3), M(0x8a829c), merl.length),
      dm = new T.Object3D();
    merl.forEach(([x, z, ry], i) => {
      dm.position.set(OX + x, WH + 0.4, OZ + z);
      dm.rotation.set(0, ry, 0);
      dm.updateMatrix();
      im.setMatrixAt(i, dm.matrix);
    });
    S.add(im);
  };
  // trees around square and street
  for (let i = 0; i < 88; i++) {
    const side = i % 2 ? 1 : -1,
      z = OZ - 20 - ((i * 3.1) % 244),
      x = OX + side * (21.5 + ((i * 7) % 9));
    tree(x, z, 0.9 + (i % 3) * 0.2);
  }
  for (let i = 0; i < 10; i++) {
    const a = i * 0.63 + 0.2,
      x = OX + Math.cos(a) * (32 + (i % 3) * 3),
      z = OZ + Math.sin(a) * (32 + (i % 3) * 3);
    if (z < OZ - 14 && Math.abs(x) < 30) continue;
    tree(x, z, 1.1);
  }
  for (let i = 0; i < 80; i++) {
    const a = rnd() * 6.283,
      d = rr(32, 110),
      x = OX + Math.cos(a) * d,
      z = OZ - 55 + Math.sin(a) * d * 1.2;
    if (okp(x, z) || (Math.abs(x - OX) < 21 && z < OZ - 10 && z > OZ - SL - 30)) continue;
    tree(x, z, rr(0.9, 1.5));
  }
  // v12: woods filling the wider country between Gloomway and the two winding roads (never south of the square,
  // where the Lantern Row builds live). Separate fixed-seed stream so the older placements above are unchanged.
  const R3 = (() => {
      let s = 4721;
      return () => (s = (s * 16807) % 2147483647) / 2147483647;
    })(),
    r3 = (a, b) => a + R3() * (b - a);
  for (let i = 0; i < 420; i++) {
    const x = OX + r3(-300, 300),
      z = OZ + r3(-330, 20);
    if (okp(x, z) || (Math.abs(x - OX) < 21 && z < OZ - 10 && z > OZ - SL - 30)) continue;
    tree(x, z, r3(0.9, 1.6));
  }
  scatter(OX, OZ - 150, 16, 220, 700, (x, z) => {
    if (z > OZ + 20) return;
    const k = rnd();
    if (k < 0.35) BUSH.push([x, 0.35, z, rr(0.6, 1.2), rnd() * 6]);
    else if (k < 0.6) ROCK.push([x, 0.15, z, rr(0.4, 1), rnd() * 6, rnd()]);
    else if (k < 0.8) SHROOM.push([x, 0, z, rr(0.6, 1.3)]);
    else TUFT.push([x, 0.2, z, rr(0.7, 1.2), rnd() * 6]);
  });
  scatter(OX, OZ - 40, 16, 90, 180, (x, z) => {
    const k = rnd();
    if (k < 0.35) BUSH.push([x, 0.35, z, rr(0.6, 1.2), rnd() * 6]);
    else if (k < 0.6) ROCK.push([x, 0.15, z, rr(0.4, 1), rnd() * 6, rnd()]);
    else if (k < 0.8) SHROOM.push([x, 0, z, rr(0.6, 1.3)]);
    else TUFT.push([x, 0.2, z, rr(0.7, 1.2), rnd() * 6]);
  });
  // NPCs, market and portals
  const npc = (x, z, robe, hat, kind, id, ry) => {
    const sp = NSPEC[kind + id] || { robe, hat: "wizard", hc: hat },
      o = person(sp);
    const mkr = new T.Sprite(AM(SP[{ q: "storm", b: "storm", c: "ice" }[kind] || "heal"]));
    mkr.scale.setScalar(1.5);
    mkr.position.y = 4.2;
    o.add(mkr);
    o.position.set(x, 0, z);
    o.rotation.y = ry || 0;
    S.add(o);
    solids.push({ x, z, r: 1.1 });
    NPCS.push({ o, kind, id, mkr, x, z, ry: ry || 0 });
  };
  const stall = (x, z, ry, col, type, label) => {
    const o = new T.Group();
    o.add(
      mk(B(2.4, 0.9, 1), 0x7a4a2a, 0, 0.45, 0),
      mk(B(0.12, 2.2, 0.12), 0x7a4a2a, -1.1, 1.1, -0.4),
      mk(B(0.12, 2.2, 0.12), 0x7a4a2a, 1.1, 1.1, -0.4),
      mk(B(2.8, 0.12, 1.8), col, 0, 2.25, 0.1),
      mk(B(2.8, 0.4, 0.06), 0xfff4e0, 0, 2.0, 0.98),
    );
    if (type === "goods")
      o.add(
        mk(B(0.5, 0.4, 0.5), 0x6b4a2b, 1.5, 0.2, 0.9),
        mk(B(0.5, 0.4, 0.5), 0x6b4a2b, 1.95, 0.2, 0.6),
        mk(Cy(0.3, 0.3, 0.7, 8), 0x6b4a2b, -1.5, 0.35, 0.8),
        mk(Sp(0.3, 6), 0xb8a070, -1.9, 0.3, 0.5),
        mk(B(0.5, 0.3, 0.4), 0xcc9944, -0.6, 1.05, 0.1),
        mk(B(0.5, 0.3, 0.4), 0xcc9944, 0.5, 1.05, 0.1),
      );
    if (type === "potion")
      for (let i = 0; i < 6; i++) {
        const m = mk(
          Cy(0.1, 0.12, 0.35, 8),
          [0xff6a6a, 0x6aa8ff, 0x7dff9a, 0xffd34d][i % 4],
          -0.9 + i * 0.36,
          1.08,
          0.1,
          1,
        );
        m.material.emissive.setHex([0x551111, 0x112255, 0x115522, 0x554411][i % 4]);
        o.add(m);
      }
    if (type === "cloth") {
      o.add(mk(Cn(0.4, 1.3, 8), 0xd83a8a, 1.6, 0.65, 0.7, 1), mk(Sp(0.2, 8), 0xf1c9a5, 1.6, 1.45, 0.7, 1));
      for (let i = 0; i < 3; i++)
        o.add(mk(Cy(0.16, 0.16, 0.9, 8), [0x2f6aa8, 0xc8442f, 0xc9a02a][i], -1.4 + i * 0.4, 0.4, 0.8, 1));
    }
    const sg = sign(label || "WARES", 2.4);
    sg.position.set(0, 3.0, 0.1);
    o.add(sg);
    const l = new T.Sprite(lm);
    l.scale.setScalar(1.6);
    l.position.set(-0.9, 2, 0.4);
    o.add(l);
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    S.add(o);
    solids.push({ x, z, r: 1.5 });
    cb(x, z, 1.5, 2.6);
  };
  const tent = (x, z, ry, col, label) => {
    const o = new T.Group();
    o.add(mk(Cn(2.2, 2.8, 7), col, 0, 1.4, 0), mk(Cn(0.5, 1.1, 4), 0x20162e, 0, 0.55, 1.9));
    const sg = sign(label, 2);
    sg.position.set(0, 3.2, 1.2);
    o.add(sg);
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    S.add(o);
    solids.push({ x, z, r: 2.2 });
    cb(x, z, 2, 2.8);
  };
  // portals: torus + glow; locked portals turn grey and red until their requirement is met
  const portal = (x, z, to, col, n, lock, on, ry) => {
    const r = new T.Mesh(new T.TorusGeometry(1.7, 0.2, 8, 28), new T.MeshBasicMaterial({ color: col }));
    r.position.set(x, 2, z);
    S.add(r);
    const g = new T.Sprite(AM(GLT));
    g.scale.setScalar(5.5);
    g.position.set(x, 2, z);
    S.add(g);
    PT.push({ x, z, to, n, lock, on, r, g, col, ry: ry || 0 });
  };
  // a stone arch around a portal (used for the roads' far gates)
  const arch = (x, z, ry, col) => {
    const o = new T.Group();
    [-1, 1].forEach((s) => {
      o.add(mk(B(0.8, 4.8, 0.8), 0x8a849c, s * 2.4, 2.4, 0));
      o.add(mk(B(1.1, 0.3, 1.1), 0x5a5470, s * 2.4, 0.15, 0));
      o.add(mk(Cn(0.6, 0.8, 4), 0x5a5470, s * 2.4, 5.2, 0));
    });
    const top = new T.Mesh(new T.TorusGeometry(2.4, 0.4, 6, 16, Math.PI), M(0x8a849c));
    top.position.y = 4.6;
    o.add(top);
    const gem = mk(new T.OctahedronGeometry(0.35), col, 0, 7.05, 0, 1);
    gem.material.emissive.setHex(col);
    gem.material.emissiveIntensity = 0.5;
    o.add(gem);
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    S.add(o);
    [-1, 1].forEach((s) => {
      const px = x + Math.cos(ry) * s * 2.4,
        pz = z - Math.sin(ry) * s * 2.4;
      solids.push({ x: px, z: pz, r: 0.6 });
    });
    return gem;
  };
  // v12: the market moved out of the square to Market Lane, a plaza partway up Gloomway. Stalls and the healer's tent stand
  // round its rim facing in, clear of the street and its sidewalks. ml(deg, r) = a spot on the plaza in world coords.
  const ml = (d, r) => {
      const a = (d * Math.PI) / 180,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      return [OX + x, OZ + MLZ + z, Math.atan2(-x, -z)];
    },
    mlS = (d, r, ...a) => {
      const [x, z, ry] = ml(d, r);
      stall(x, z, ry, ...a);
    };
  // v13: the keepers moved into their shops, so the old stalls, healer tent and the bunting strung between them are gone.
  // Each is replaced by an EMPTY placeholder (stall/tent = 1 scene child, bunting = 10) so every later scene-child
  // index stays where the editor's saved "model" builds expect it.
  const hold = (n) => {
    for (let i = 0; i < n; i++) S.add(new T.Object3D());
  };
  void mlS;
  hold(4 + 20);
  {
    const k = ml(180, 14.6);
    crate(k[0], k[1], 0.3);
    crate(k[0], k[1], 0.9, 0.8);
    const br = ml(232, 13.8);
    barrel(br[0], br[1]);
  }
  [60, 120, 240, 300].forEach((d) => {
    const [x, z] = ml(d, 15.6);
    lampost(x, z, 1);
  });
  {
    const [x, z, ry] = SHOPAT.goods; // v13: behind the counter in Bram's Goods
    npc(x, z, 0x8a5a2f, 0x5a3a1a, "s", "bram", ry);
  }
  {
    const [x, z, ry] = SHOPAT.spell;
    npc(x, z, 0x4a2a8a, 0x2a1a4a, "w", "hub", ry); // Wren the spellwright, inside the Spellwright shop
  }
  // v13 Sage Ilsa (change school, refund school points), behind the counter of her shop on Market Lane's east side.
  // Placed from 13-editor.js AFTER the editor's BASE snapshot, so saved "model" builds keep their scene indices.
  window.__lateNpcs = () => {
    const [x, z, ry] = SHOPAT.school;
    npc(x, z, 0x1f4a5a, 0x12303a, "a", "hub", ry);
    npcPlate(NPCS[NPCS.length - 1]);
    // v15: Mirewick gets its own quest board for its street quests
    board(MWX + 10, MWZ + 16, "marsh");
    npcPlate(NPCS[NPCS.length - 1]);
  };
  // Oona and her notice board stay in the square, which is otherwise left open
  add(B(0.15, 2.8, 0.15), 0x6b4a2b, OX + 14.2, 1.4, OZ + 7.6);
  add(B(0.15, 2.8, 0.15), 0x6b4a2b, OX + 16.4, 1.4, OZ + 7.6);
  add(B(2.6, 1.5, 0.15), 0x7a4a2a, OX + 15.3, 2.1, OZ + 7.6);
  npc(OX + 11, OZ + 7.6, 0x2f8a86, 0x1d4f55, "q", "hub", Math.atan2(-11, -7.6));
  // signposts: one in the square pointing up Gloomway, and one at each road mouth
  signpost(OX + 13.5, OZ - 11.5, 0, "MARKET LANE", "ROADS NORTH");
  signpost(OX + 14.5, OZ + HZ + RDW + 2.4, -Math.PI / 2, "HOLLOW ROAD", "TO FROSTFEN");
  signpost(OX - 14.5, OZ + AZ + RDW + 2.4, Math.PI / 2, "ASHEN TRAIL", "TO CINDERWASTE");
  // ---- Hollow Road (east) and Ashen Trail (west): long roads out to glades holding the zone gates ----
  // v9: wider dirt roads with stone curbs and flagstone sidewalks on both sides, and the glades pushed further out
  const fsw = tex((x) => {
    x.fillStyle = "#6a6070";
    x.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 2; r++)
      for (let q = 0; q < 4; q++) {
        x.fillStyle = ["#a89c94", "#9c9088", "#b4a8a0"][(r + q) % 3];
        x.fillRect(q * 32 + (r % 2) * 16 + 2, r * 64 + 2, 28, 60);
      }
  }, 1);
  // v15: houses facing the street along each straight block (Toontown-style). Spots are fixed (no randomness); trees keep
  // clear of them now (reserved in CB), and the houses themselves are built after the editor snapshot (__streets).
  const strSpots = (i) => {
    const R = RDS[i],
      out = [],
      skip = i ? [] : [((78 - 12) / (GX - 28)) * R.L, R.cs[3] + RCR + 20]; // Hollow's stream and pumpkin farm
    for (let s = 44, k = 0; s < R.L - 30; s += 14, k++) {
      if (R.cs.some((c) => Math.abs(s - c) < RCR + 8) || skip.some((c) => Math.abs(s - c) < 18)) continue;
      const [x, z, hx, hz] = rdAt(R, s);
      [-1, 1].forEach((o) => {
        if ((k * 7 + (o > 0 ? 3 : 0) + i) % 5 === 0) return; // a gap now and then
        const off = RDW + 5.6,
          lx = x - hz * o * off,
          lz = z + hx * o * off,
          q = rdNear(R, lx, lz);
        if (q && q.d < RDW + 3.4) return;
        if (R.cn.some((c) => Math.hypot(lx - c[0], lz - c[1]) < RCP + 4)) return;
        out.push([OX + lx, OZ + lz, Math.atan2(o * hz, -o * hx), k * 2 + (o > 0 ? 1 : 0)]);
      });
    }
    return out;
  };
  const STRRES = [];
  [0, 1].forEach((i) =>
    strSpots(i).forEach(([x, z]) => {
      cb(x, z, 3.6, 6);
      STRRES.push(CB[CB.length - 1]);
    }),
  );
  [
    [1, "frost"],
    [-1, "ember"],
  ].forEach(([sd, zk]) => {
    // v12: the road winds (see RDS). Dirt, sidewalks and curbs are ribbons that follow its centreline.
    const ex = sd > 0,
      R = RDS[ex ? 0 : 1],
      side = (s, o) => {
        const [x, z, hx, hz] = rdAt(R, s);
        return [OX + x - hz * o, OZ + z + hx * o];
      };
    const rd = dirt(1);
    rd.repeat.set(1, 1);
    // road dirt sits 1cm above the street top so it no longer fights it where it leaves Gloomway
    lay(rdRibbon(R, -5, 5, 0.01, new T.MeshLambertMaterial({ map: rd, color: ex ? 0xd8dcf0 : 0xf0d0c0 }), 10), 3);
    {
      // the mouth where the road leaves Gloomway (fills the gap left in the street's sidewalk); was exactly level with
      // the road ribbon, now a little lower and drawn under it
      const m2 = dirt(1);
      m2.repeat.set(0.5, 1.6);
      lay(
        flat(
          B(SW - SC + 1.2, 0.3, RDW * 2),
          m2,
          OX + sd * (SC + (SW - SC + 1.2) / 2),
          -0.18,
          OZ + R.p[0][1],
          0,
          ex ? 0xd8dcf0 : 0xf0d0c0,
        ),
        2,
      );
      const t = fsw.clone();
      t.needsUpdate = true;
      t.repeat.set(1, 1);
      const sm = new T.MeshLambertMaterial({ map: t, color: ex ? 0xd0d8ec : 0xecd0c0 });
      lay(rdRibbon(R, 5, RDW, 0.07, sm, 3.6, 1.2), 5);
      rdRibbon(R, -RDW, -5, 0.07, sm, 3.6, 1.2);
      const cm = lay({ material: new T.MeshLambertMaterial({ color: 0x4a4560 }) }, 6).material;
      rdRibbon(R, 4.82, 5.18, 0.1, cm, 1, 1.2);
      rdRibbon(R, -5.18, -4.82, 0.1, cm, 1, 1.2);
    }
    lay(flat(Cy(16, 16, 0.3, 36), moss(6), OX + R.gx, -0.13, OZ + R.gz, 0, ex ? 0xc8e0f0 : 0xc8a090), 4);
    // v15: always 19 lamps, spread evenly (lamp posts are scene children, and saved editor builds count on their number)
    const inCn = (x, z, pad) => R.cn.some((c) => Math.hypot(x - OX - c[0], z - OZ - c[1]) < RCP + (pad || 0));
    for (let k = 0; k < 19; k++) {
      const s = 9 + (k * (R.L - 16)) / 18;
      let [x, z] = side(s, k % 2 ? RDW + 0.4 : -RDW - 0.4);
      if (inCn(x, z, 0.5)) [x, z] = side(s, k % 2 ? -RDW - 0.4 : RDW + 0.4);
      lampost(x, z);
    }
    for (let s = 4; s < R.L - 2; s += 6) {
      const s2 = Math.min(R.L - 2, s + 6);
      [-1, 1].forEach((o) => {
        const a = side(s, o * (RDW + 1)),
          b = side(s2, o * (RDW + 1)),
          onRd = (p) => {
            const q = rdNear(R, p[0] - OX, p[1] - OZ);
            return (q && q.d < RDW + 0.6) || inCn(p[0], p[1], 0.8);
          };
        if (!onRd(a) && !onRd(b)) fence(a[0], a[1], b[0], b[1]);
      });
    }
    for (let k = 0; k < 150; k++) {
      const [x, z] = side(rr(4, R.L + 4), (k % 2 ? 1 : -1) * rr(11.5, 38));
      tree(x, z, rr(0.9, 1.5));
    }
    for (let k = 0; k < 34; k++) {
      const a = rnd() * 6.283,
        d = rr(19, 34);
      tree(OX + R.gx + Math.cos(a) * d, OZ + R.gz + Math.sin(a) * d, rr(1, 1.6));
    }
    for (let c = 0; c < 5; c++) {
      const [x0, z0] = side((R.L * (c + 0.5)) / 5, 0);
      scatter(x0, z0, 10, 46, 70, (x, z) => {
        const k = rnd();
        if (k < 0.4) BUSH.push([x, 0.35, z, rr(0.6, 1.2), rnd() * 6]);
        else if (k < 0.6) ROCK.push([x, 0.15, z, rr(0.4, 1.1), rnd() * 6, rnd()]);
        else if (k < 0.85) SHROOM.push([x, 0, z, rr(0.6, 1.4)]);
        else TUFT.push([x, 0.2, z, rr(0.7, 1.2), rnd() * 6]);
      });
    }
    // glade: ring of standing stones, a well or a fire pit, a cart
    const gx = OX + R.gx,
      gz = OZ + R.gz,
      wx = gx - sd * 6;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * 6.283 + 0.4,
        x = gx + Math.cos(a) * 13.5,
        z = gz + Math.sin(a) * 13.5;
      if (Math.abs(z - gz) < RDW + 1 || Math.hypot(x - gx, z - gz + 14) < 5.5 || Math.abs(x - gx) > 9) continue;
      const s = add(B(1, 2.6 + (k % 3) * 0.7, 0.7), 0x7a7390, x, 1.3, z);
      s.rotation.y = a;
      solids.push({ x, z, r: 0.8 });
    }
    if (ex) {
      add(Cy(1.1, 1.1, 1, 14), 0x8a849c, wx, 0.5, gz - 8);
      add(Cy(0.9, 0.9, 0.12, 14), 0x2a4a7a, wx, 1.0, gz - 8);
      [-1, 1].forEach((s) => add(B(0.15, 2.4, 0.15), 0x6b4a2b, wx + s * 0.9, 1.7, gz - 8));
      const rf = add(Cn(1.6, 1, 4), 0x3a4a7a, wx, 3.3, gz - 8);
      rf.rotation.y = Math.PI / 4;
      solids.push({ x: wx, z: gz - 8, r: 1.4 });
    } else {
      add(Cy(1.2, 1.3, 0.4, 10), 0x3a3a44, wx, 0.2, gz - 8);
      const fp = new T.Sprite(AM(SP.fire));
      fp.scale.setScalar(2.6);
      fp.position.set(wx, 1.2, gz - 8);
      S.add(fp);
      const pl = new T.PointLight(0xff8a3d, 1.1, 14);
      pl.userData.pool = 1;
      pl.position.set(wx, 1.5, gz - 8);
      S.add(pl);
      solids.push({ x: wx, z: gz - 8, r: 1.4 });
      SMK.push({ x: wx, y: 1.6, z: gz - 8, t: 0, c: 0x8a7a70 });
    }
    {
      const cx = gx - sd * 8,
        cz = gz + 9,
        o = new T.Group();
      o.add(mk(B(2.2, 0.6, 1.3), 0x7a4a2a, 0, 0.9, 0), mk(Sp(0.8, 8), 0xd9c070, 0, 1.4, 0));
      [-1, 1].forEach((s) => {
        const w = mk(new T.TorusGeometry(0.5, 0.08, 5, 12), 0x4a2f1b, s * 0.7, 0.5, 0.7);
        o.add(w);
        const w2 = w.clone();
        w2.position.z = -0.7;
        o.add(w2);
      });
      o.position.set(cx, 0, cz);
      o.rotation.y = 0.4;
      S.add(o);
      solids.push({ x: cx, z: cz, r: 1.4 });
    }
    const gem = arch(gx + sd * 13.6, gz, Math.PI / 2, ex ? 0x8ad0ff : 0xff8a3d);
    if (ex)
      portal(
        gx + sd * 13.6,
        gz,
        [600, -376, Math.PI],
        0x8ad0ff,
        "Frostfen (needs Lv 3)",
        () =>
          !(P.gates && P.gates.frost)
            ? "Thick roots choke the Frostfen gate. They grow up from the Mossy Catacombs (the swirling door at the north edge of this glade)."
            : !P.done[9]
              ? 'The gate stays frozen. Finish the story quest "Into the Wispwood" first.'
              : P.lvl < 3
                ? "The Frostfen gate is frozen shut. Reach level 3 to pass."
                : null,
        null,
        Math.PI / 2,
      );
    else
      portal(
        gx + sd * 13.6,
        gz,
        [-600, -376, Math.PI],
        0xff8a3d,
        "Cinderwaste (needs Lv 4)",
        () =>
          !P.done[11]
            ? 'The heat drives you back. Finish the story in Frostfen first ("What the Ice Remembers").'
            : P.lvl < 4
              ? "Scorching heat bars the Cinderwaste gate. Reach level 4 to pass."
              : null,
        null,
        Math.PI / 2,
      );
    PT[PT.length - 1].gem = gem;
    const sg = sign(ex ? "WISPWOOD GLADE" : "CINDER HOLLOW", 3.2);
    sg.position.set(gx - sd * 13, 3.2, gz - RDW - 0.6);
    sg.rotation.y = (-sd * Math.PI) / 2;
    S.add(sg);
    add(B(0.15, 3, 0.15), 0x6b4a2b, gx - sd * 13, 1.5, gz - RDW - 0.6);
  });
  // foes: [x,z,tier] on Gloomway Street, then the two roads. v9: fewer, further apart, kept to alternating halves of the
  // carriageway so there is always a clear lane (or the safe sidewalk) to walk past
  // v12: the street is twice as long, so the same handful of gloomlings is spread further apart (none on Market Lane)
  [
    [-3.5, -32, 1],
    [3.5, -46, 1],
    [-3.5, -90, 1],
    [3.5, -122, 1],
    [-3.5, -154, 2],
    [3.5, -174, 2],
    [-3.5, -212, 2],
    [3.5, -230, 3],
    [0, PZ - 2, 4],
  ].forEach(([x, z, t]) => {
    const o = gloom(t);
    o.scale.setScalar(0.6 + 0.07 * t);
    o.position.set(OX + x, 0, OZ + z);
    S.add(o);
    foes.push({ o, t, kind: "gloom", hx: OX + x, hz: OZ + z, w: null, wt: 0, dead: 0, rt: 0, tw: 0 });
  });
  const sf = (kind, t, x, z, big) => {
    const o = mkFoe(kind, t, big);
    o.position.set(x, 0, z);
    S.add(o);
    foes.push({ o, t, kind, big, hx: x, hz: z, w: null, wt: 0, dead: 0, rt: 0, tw: 0 });
  };
  // glade foes keep to the road side of each glade, clear of the new safe camps by the gates
  // v12: road foes are spaced every 26 along the winding roads, keeping to alternating halves of the dirt
  // v15: always 9 per road, spread evenly (foes are scene children and are matched by index in multiplayer), and they get
  // tougher block by block: Hollow Road 1-1-2-2-2-2-2-3(elite)-3, Ashen Trail 2-2-2-3-3-3-3-3-3
  RDS.forEach((R, i) => {
    for (let k = 0; k < 9; k++) {
      const s = 16 + (k * (R.L - 48)) / 8,
        [x, z, hx, hz] = rdAt(R, s),
        o = k % 2 ? 2 : -2,
        t = i ? (k < 3 ? 2 : 3) : k < 2 ? 1 : k < 7 ? 2 : 3;
      sf("gloom", t, OX + x - hz * o, OZ + z + hx * o);
    }
  });
  [
    [GX - 11, 9.5, 2],
    [GX - 9, -10.5, 3],
    [-GX + 10, -10.5, 3],
  ].forEach(([x, z, t]) => {
    const [px, pz] = RMAP(x, z);
    sf("gloom", t, px, pz);
  });
  {
    const w = RMAP(GX - 19, -3),
      h = RMAP(-GX + 11, 9.5);
    sf("wolf", 2, w[0], w[1]);
    sf("hound", 3, h[0], h[1]);
  }
  // v11: the outer zones are wider (ZR 70). The new outer band gets its own fixed-seed random stream, so the world is the
  // same on every machine (important once other players share it) and the older layout inside the band is untouched.
  const R2 = (() => {
      let s = 9113;
      return () => (s = (s * 16807) % 2147483647) / 2147483647;
    })(),
    rb = (a, b) => a + R2() * (b - a);
  const bandPts = (cx, cz, n, d0, d1, skip) => {
    const o = [];
    for (let i = 0; i < n; i++) {
      const a = rb(0, 6.283),
        d = rb(d0, d1),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (Math.abs(x - cx) < 10 && z > cz) continue;
      if (skip && skip(x, z)) continue;
      o.push([x, z]);
    }
    return o;
  };
  // v12: the outer zones doubled again (ZR 140). The new outer wilds (ZR0..ZR) get yet another fixed-seed stream, so
  // everything inside ZR0 stays where it was. wild() = random spots in a band; wildFoes() = foes spread evenly around it.
  const R4 = (() => {
      let s = 6271;
      return () => (s = (s * 16807) % 2147483647) / 2147483647;
    })(),
    r4 = (a, b) => a + R4() * (b - a),
    wild = (cx, cz, n, skip, d0, d1) => {
      const o = [];
      for (let i = 0; i < n; i++) {
        const a = r4(0, 6.283),
          d = r4(d0 || ZR0 + 4, d1 || ZR - 4),
          x = cx + Math.cos(a) * d,
          z = cz + Math.sin(a) * d;
        if (skip && skip(x, z)) continue;
        o.push([x, z]);
      }
      return o;
    },
    wildFoes = (cx, cz, list) =>
      list.forEach(([kind, t, big], k) => {
        const a = ((k + r4(-0.3, 0.3)) / list.length) * 6.283,
          d = r4(ZR0 + 10, ZR - 10);
        sf(kind, t, cx + Math.cos(a) * d, cz + Math.sin(a) * d, big);
      }),
    near = (pts, r) => (x, z) => pts.some((p) => Math.hypot(x - p[0], z - p[1]) < r);
  // ===== zones: Frostfen, Cinderwaste, Gloomspire =====
  // snow: a dusky blue-grey base (pure white toon snow under the dusk sky blew out the whole screen)
  // v47 clean look: soft wrapped drifts of light and shade (was a speckle of hard 2px dashes), crisp detail in post
  const softPatches = (x, n, cols, a, r0, r1) => {
    for (let i = 0; i < n; i++) {
      const cx = Math.random() * 128,
        cy = Math.random() * 128,
        rx = r0 + Math.random() * (r1 - r0),
        ry = rx * (0.45 + Math.random() * 0.35);
      x.globalAlpha = a;
      x.fillStyle = cols[i % cols.length];
      for (const ox of [-128, 0, 128])
        for (const oy of [-128, 0, 128]) {
          x.beginPath();
          x.ellipse(cx + ox, cy + oy, rx, ry, 0, 0, 7);
          x.fill();
        }
    }
    x.globalAlpha = 1;
  };
  const snw = (rep) =>
    tex(
      (x) => {
        x.fillStyle = "#a6b6ce";
        x.fillRect(0, 0, 128, 128);
        softPatches(x, 40, ["#b8c6dc", "#98aac4", "#c2d0e2", "#a0b2cc"], 0.4, 8, 22);
      },
      rep,
      (x) => {
        // a few soft sparkles in the snow
        for (let i = 0; i < 26; i++) {
          x.fillStyle = "rgba(240,248,255," + (0.35 + Math.random() * 0.3) + ")";
          x.beginPath();
          x.arc(6 + Math.random() * 244, 6 + Math.random() * 244, 0.8 + Math.random() * 1.2, 0, 7);
          x.fill();
        }
      },
    );
  const ash = (rep) =>
    tex(
      (x) => {
        x.fillStyle = "#3e2e2f";
        x.fillRect(0, 0, 128, 128);
        softPatches(x, 40, ["#4a3838", "#332526", "#54403c", "#3a2a2a"], 0.45, 8, 22);
      },
      rep,
      (x) => {
        // little rounded cinders and a faint ember here and there
        for (let i = 0; i < 22; i++) {
          const px = 8 + Math.random() * 240,
            py = 8 + Math.random() * 240,
            r = 1.6 + Math.random() * 2.4;
          x.fillStyle = "rgba(20,12,14,.35)";
          x.beginPath();
          x.ellipse(px + 0.8, py + 1, r, r * 0.7, 0, 0, 7);
          x.fill();
          x.fillStyle = i % 7 ? "rgba(110,88,84,.85)" : "rgba(230,120,60,.8)";
          x.beginPath();
          x.ellipse(px, py, r, r * 0.7, 0, 0, 7);
          x.fill();
        }
      },
    );
  {
    const cx = 600,
      cz = -400;
    flat(new T.PlaneGeometry(420, 420), snw(56), cx, -0.35, cz, -Math.PI / 2);
    flat(Cy(ZR + 1, ZR + 1, 0.3, 48), snw(11), cx, -0.15, cz);
    const pine = (x, z, s, sol) => {
      cb(x, z, 1.1 * s, 5 * s);
      PINES.push([x, z, s, CB[CB.length - 1]]);
      if (sol) solids.push({ x, z, r: 0.7 });
    };
    for (let i = 0; i < 44; i++) {
      const a = i * 2.4,
        d = i < 30 ? 24 + ((i * 5) % 12) : 8 + ((i * 7) % 14),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (Math.abs(x - cx) < 6 && z > cz + 20) continue;
      if (Math.hypot(x - cx - 10, z - cz + 6) < 9) continue;
      pine(x, z, 0.9 + (i % 3) * 0.25, 1);
    }
    for (let i = 0; i < 16; i++) {
      const a = i * 2.7 + 0.3,
        d = 38 + ((i * 3) % 8),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (Math.abs(x - cx) < 7 && z > cz) continue;
      if (Math.hypot(x - cx - 28, z - cz + 22) < 9 || Math.hypot(x - cx + 34, z - cz + 22) < 8) continue;
      pine(x, z, 1 + (i % 3) * 0.2, 1);
    }
    for (let i = 0; i < 170; i++) {
      const a = rnd() * 6.283,
        d = rr(ZR + 6, ZR + 30);
      pine(cx + Math.cos(a) * d, cz + Math.sin(a) * d, rr(1.1, 1.9));
    }
    M(0x6f9ec8).emissive.setHex(0x0a1e36);
    add(Cy(7, 7, 0.14, 28), 0x6f9ec8, cx + 10, 0.08, cz - 6);
    solids.push({ x: cx + 10, z: cz - 6, r: 7 });
    house(cx - 19, cz + 9, Math.atan2(19, -9), 1, { snow: 1, roof: 0xa4b2c8, wall: 0x8a6a4a, shut: 0x2f6aa8 });
    stall(cx - 12, cz + 5, Math.atan2(12, -5), 0x6a8ac8, "cloth", "YARA'S FURS");
    tent(cx - 9.5, cz + 23.5, Math.atan2(9.5, -23.5), 0xdde8f5, "HEALER");
    for (let i = 0; i < 5; i++) {
      const lg = add(Cy(0.25, 0.25, 1.6, 6), 0x6b4a2b, cx - 16 + i * 0.5, 0.3 + (i % 2) * 0.4, cz + 12);
      lg.rotation.z = Math.PI / 2;
    }
    {
      const ls = sign("FROSTFEN LODGE", 3.2);
      ls.position.set(cx - 15, 4.8, cz + 9);
      ls.rotation.y = Math.atan2(15, -9);
      S.add(ls);
    }
    npc(cx - 13.5, cz + 10.5, 0x7a5aa8, 0xeaf4ff, "s", "yara", Math.atan2(13.5, -10.5));
    for (let i = 0; i < 4; i++) lampost(cx + (i < 2 ? -6 : 6), cz + 18 - (i % 2) * 8, 1);
    portal(cx, cz + 30, [OX + RDS[0].gx + 4, OZ + RDS[0].gz, -Math.PI / 2], 0x8ad0ff, "Wispwood Glade (Lamplight)");
    // frozen ruins
    {
      const rx = cx + 28,
        rz = cz - 22;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * 6.283,
          x = rx + Math.cos(a) * 5,
          z = rz + Math.sin(a) * 5,
          h = 1.2 + ((k * 7) % 5) * 0.7;
        add(Cy(0.6, 0.7, h, 8), 0x9fb4c8, x, h / 2, z);
        add(Cy(0.68, 0.62, 0.25, 8), 0xeaf4ff, x, h + 0.1, z);
        solids.push({ x, z, r: 0.9 });
        cb(x, z, 0.7, h);
      }
      [-1, 1].forEach((s) => {
        add(B(1, 5, 1), 0x9fb4c8, rx + s * 2, 2.5, rz - 7);
        solids.push({ x: rx + s * 2, z: rz - 7, r: 0.8 });
      });
      add(B(5.2, 1, 1.1), 0x9fb4c8, rx, 5.3, rz - 7);
      add(B(5.4, 0.3, 1.3), 0xeaf4ff, rx, 5.95, rz - 7);
      const fallen = add(Cy(0.6, 0.6, 3.4, 8), 0x9fb4c8, rx + 1, 0.6, rz + 0.5);
      fallen.rotation.z = Math.PI / 2;
      fallen.rotation.y = 0.6;
      solids.push({ x: rx + 1, z: rz + 0.5, r: 1.4 });
    }
    // wolf den
    {
      const dx = cx - 34,
        dz = cz - 22,
        d = add(Sp(4.2, 12), 0x5a5470, dx, 0, dz);
      d.scale.set(1.2, 0.62, 1);
      const mo = add(new T.CircleGeometry(1.6, 14, 0, Math.PI), 0x0a0812, dx, 0.01, dz + 4.25);
      mo.rotation.x = -0.45;
      solids.push({ x: dx, z: dz, r: 4.6 });
      cb(dx, dz, 4.6, 2.6);
      ROCK.push([dx + 5, 0.2, dz + 3, 1.2, 1], [dx - 5, 0.2, dz + 4, 1, 2], [dx + 3, 0.2, dz - 5, 1.4, 3]);
    }
    // snowman
    {
      const sx = cx + 12,
        sz = cz + 14;
      add(Sp(0.8, 12), 0xeaf4ff, sx, 0.7, sz);
      add(Sp(0.58, 12), 0xeaf4ff, sx, 1.9, sz);
      add(Sp(0.4, 10), 0xeaf4ff, sx, 2.75, sz);
      add(Cn(0.08, 0.45, 6), 0xe0702a, sx, 2.75, sz + 0.55).rotation.x = Math.PI / 2;
      add(Cy(0.38, 0.38, 0.08, 10), 0x222222, sx, 3.08, sz);
      add(Cy(0.25, 0.27, 0.45, 10), 0x222222, sx, 3.3, sz);
      solids.push({ x: sx, z: sz, r: 1 });
    }
    const ICE = [],
      DRIFT = [];
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + 1,
        d = rr(30, 45),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if ((Math.abs(x - cx) < 8 && z > cz) || Math.hypot(x - 566, z + 416) < 7 || Math.hypot(x - 595, z + 385) < 17)
        continue;
      for (let j = 0; j < 5; j++)
        ICE.push([
          x + rr(-1.4, 1.4),
          rr(0.3, 0.8),
          z + rr(-1.4, 1.4),
          rr(0.6, 1.4),
          rnd() * 6,
          rr(-0.3, 0.3),
          0.6,
          1.8,
          0.6,
        ]);
      solids.push({ x, z, r: 1.6 });
    }
    for (let k = 0; k < 70; k++) {
      const a = rnd() * 6.283,
        d = rr(12, 47),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      DRIFT.push([x, -0.05, z, rr(0.8, 2), rnd() * 6, 0, 1.6, 0.3, 1]); // v47: rounder mounds (was 0.15, flat discs)
    }
    inst(new T.OctahedronGeometry(0.5), 0x7fc8f0, ICE, 0x1a4a7a);
    inst(Sp(1, 24, 14), 0xa8b8d2, DRIFT); // v47 clean look: soft white snow drifts (were flat grey-blue polygons)
    for (let k = 0; k < 14; k++) {
      const a = rnd() * 6.283,
        d = rr(26, 47);
      ROCK.push([cx + Math.cos(a) * d, 0.15, cz + Math.sin(a) * d, rr(0.6, 1.4), rnd() * 6, rnd()]);
    }
    sf("wolf", 2, cx - 6, cz - 8);
    sf("wolf", 2, cx + 3, cz - 18);
    sf("wolf", 2, cx - 16, cz - 12);
    sf("wolf", 2, cx + 18, cz + 5);
    sf("wolf", 3, cx - 2, cz - 27, 1);
    sf("wolf", 2, cx + 34, cz - 6);
    sf("wolf", 3, cx - 20, cz - 6);
    sf("wolf", 2, cx + 20, cz - 38);
    sf("wolf", 3, cx - 12, cz - 40);
    sf("wolf", 2, cx + 36, cz + 22);
    // v11 outer band: pine groves, a ring of frost-stones to the east, a frozen-over sled camp to the west, and more wolves
    const fs1 = [cx + 54, cz - 30],
      fs2 = [cx - 54, cz + 14];
    bandPts(
      cx,
      cz,
      46,
      50,
      68,
      (x, z) => Math.hypot(x - fs1[0], z - fs1[1]) < 11 || Math.hypot(x - fs2[0], z - fs2[1]) < 10,
    ).forEach(([x, z]) => pine(x, z, rb(1, 1.6), 1));
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 6.283,
        x = fs1[0] + Math.cos(a) * 6.5,
        z = fs1[1] + Math.sin(a) * 6.5,
        h = 2.4 + (k % 3) * 0.9,
        st = add(B(1.1, h, 0.8), 0x9fb4c8, x, h / 2, z);
      st.rotation.y = -a;
      add(B(1.2, 0.25, 0.9), 0xeaf4ff, x, h + 0.1, z).rotation.y = -a;
      solids.push({ x, z, r: 0.8 });
      cb(x, z, 0.7, h);
    }
    {
      const g0 = new T.Sprite(AM(GLT));
      g0.scale.setScalar(5);
      g0.position.set(fs1[0], 1.4, fs1[1]);
      g0.material.color.setHex(0x9fe8ff);
      S.add(g0);
      add(Cy(1.2, 1.4, 0.5, 10), 0x7f92b0, fs1[0], 0.25, fs1[1]);
    }
    tent(fs2[0] + 3, fs2[1] - 3, 0.6, 0x8a9cb8, "");
    {
      const sl = new T.Group();
      sl.add(
        mk(B(1.2, 0.3, 2.6), 0x6b4a2b, 0, 0.45, 0),
        mk(B(0.1, 0.1, 2.8), 0x3a3440, -0.55, 0.2, 0),
        mk(B(0.1, 0.1, 2.8), 0x3a3440, 0.55, 0.2, 0),
      );
      sl.position.set(fs2[0] - 2, 0, fs2[1] + 2);
      sl.rotation.y = 0.4;
      S.add(sl);
      solids.push({ x: fs2[0] - 2, z: fs2[1] + 2, r: 1.4 });
    }
    add(Cy(1.1, 1.2, 0.3, 10), 0x3a3a44, fs2[0], 0.15, fs2[1]);
    solids.push({ x: fs2[0], z: fs2[1], r: 1.3 });
    sf("wolf", 3, cx + 46, cz - 12);
    sf("wolf", 3, cx + 60, cz + 8);
    sf("wolf", 4, cx - 48, cz - 30, 1);
    sf("wolf", 3, cx - 60, cz - 4);
    sf("wolf", 3, cx + 6, cz - 60);
    sf("wolf", 4, cx - 22, cz - 58, 1);
    sf("wolf", 3, cx + 42, cz + 44);
    sf("wolf", 3, cx - 46, cz + 40);
    // v12 outer wilds: a frozen lake, a trapper's cabin, a ring of rime-stones, deep pine woods and roaming packs
    const lk = [cx - 92, cz - 62],
      cab = [cx + 98, cz - 78],
      rs = [cx + 92, cz + 74];
    add(Cy(15, 15, 0.14, 36), 0x6f9ec8, lk[0], 0.08, lk[1]);
    solids.push({ x: lk[0], z: lk[1], r: 15 });
    house(cab[0], cab[1], Math.atan2(cx - cab[0], cz - cab[1]), 4, {
      snow: 1,
      roof: 0xa4b2c8,
      wall: 0x6a5040,
      shut: 0x2f6aa8,
      solid: 1,
    });
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * 6.283,
        x = rs[0] + Math.cos(a) * 8,
        z = rs[1] + Math.sin(a) * 8,
        h = 2.6 + (k % 3) * 1.1;
      add(B(1.2, h, 0.9), 0x9fb4c8, x, h / 2, z).rotation.y = -a;
      add(B(1.3, 0.25, 1), 0xeaf4ff, x, h + 0.1, z).rotation.y = -a;
      solids.push({ x, z, r: 0.8 });
      cb(x, z, 0.7, h);
    }
    {
      const g0 = new T.Sprite(AM(GLT));
      g0.scale.setScalar(7);
      g0.position.set(rs[0], 1.6, rs[1]);
      g0.material.color.setHex(0x9fe8ff);
      S.add(g0);
    }
    const fsk = near([lk, cab, rs], 19);
    wild(cx, cz, 150, fsk).forEach(([x, z]) => pine(x, z, r4(1, 1.8), 1));
    wild(cx, cz, 60, fsk).forEach(([x, z]) => ROCK.push([x, 0.15, z, r4(0.6, 1.5), r4(0, 6), r4(0, 1)]));
    wildFoes(cx, cz, [
      ["wolf", 3],
      ["wolf", 3],
      ["wolf", 4, 1],
      ["wolf", 3],
      ["wolf", 4],
      ["wolf", 3],
      ["wolf", 3],
      ["wolf", 4, 1],
      ["wolf", 3],
      ["wolf", 4],
      ["wolf", 3],
      ["wolf", 4],
    ]);
  }
  {
    const cx = -600,
      cz = -400,
      lava = (x, z, r) => {
        add(Cy(r, r, 0.12, 24), 0xff6a1a, x, 0.08, z);
        const g = new T.Sprite(AM(SP.fire));
        g.scale.setScalar(r * 2.4);
        g.position.set(x, 1, z);
        S.add(g);
        solids.push({ x, z, r: r + 0.4 });
      };
    flat(new T.PlaneGeometry(420, 420), ash(56), cx, -0.35, cz, -Math.PI / 2);
    flat(Cy(ZR + 1, ZR + 1, 0.3, 48), ash(11), cx, -0.15, cz);
    M(0xff6a1a).emissive.setHex(0xff4400);
    lava(cx + 10, cz - 6, 5);
    lava(cx - 12, cz - 18, 6);
    lava(cx - 14, cz + 14, 3.5);
    lava(cx - 8, cz + 4, 3);
    lava(cx + 30, cz + 12, 4);
    lava(cx - 30, cz - 28, 4.5);
    lava(cx + 22, cz - 34, 3);
    const spire = (x, z, r, h, sol) => {
      cb(x, z, r * 0.8, h);
      SPIRES.push([x, z, r, h, CB[CB.length - 1]]);
      if (sol) solids.push({ x, z, r: r });
    };
    for (let i = 0; i < 40; i++) {
      const a = i * 2.1,
        d = 22 + ((i * 5) % 13),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (Math.abs(x - cx) < 6 && z > cz + 20) continue;
      spire(x, z, 1 + (i % 3) * 0.5, 4 + (i % 4) * 1.6, 1);
    }
    for (let i = 0; i < 14; i++) {
      const a = i * 2.5 + 0.7,
        d = 38 + ((i * 3) % 8),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (Math.abs(x - cx) < 7 && z > cz) continue;
      if (Math.hypot(x - cx - 30, z - cz - 12) < 7 || Math.hypot(x - cx + 30, z - cz + 28) < 7) continue;
      spire(x, z, 1.2 + (i % 3) * 0.4, 5 + (i % 4) * 1.5, 1);
    }
    for (let i = 0; i < 150; i++) {
      const a = rnd() * 6.283,
        d = rr(ZR + 6, ZR + 30);
      spire(cx + Math.cos(a) * d, cz + Math.sin(a) * d, rr(1.5, 3.2), rr(6, 16));
    }
    house(cx + 19, cz + 9, Math.atan2(-19, -9), 3, { wall: 0x5a4440, roof: 0x2a1e22, shut: 0x8a2a1a, plain: 1 });
    const fg = new T.Sprite(AM(SP.fire));
    fg.scale.setScalar(4);
    fg.position.set(cx + 15.5, 2, cz + 9);
    S.add(fg);
    add(B(1.2, 0.6, 0.7), 0x3a3a44, cx + 12, 0.3, cz + 11);
    add(Cy(0.3, 0.4, 0.5, 6), 0x3a3a44, cx + 12, 0.8, cz + 11);
    npc(cx + 13.5, cz + 7.5, 0x7a3a2a, 0x3a2a2a, "s", "forge", Math.atan2(-13.5, -7.5));
    add(B(1.6, 0.12, 0.5), 0x3a3a44, cx + 11, 1.4, cz + 4);
    for (let i = 0; i < 3; i++)
      add(B(0.08, 1.2, 0.08), [0xcccccc, 0xaaaacc, 0xddcc99][i], cx + 10.5 + i * 0.5, 1.6, cz + 4.1);
    add(Cy(0.45, 0.45, 0.9, 8), 0x6b4a2b, cx + 16, 0.45, cz + 4);
    tent(cx - 9.5, cz + 23.5, Math.atan2(9.5, -23.5), 0xe8d0c0, "HEALER");
    {
      const fs = sign("KORR'S FORGE", 3.2);
      fs.position.set(cx + 14, 4.8, cz + 9);
      fs.rotation.y = Math.atan2(-14, -9);
      S.add(fs);
    }
    portal(cx, cz + 30, [OX + RDS[1].gx - 4, OZ + RDS[1].gz, Math.PI / 2], 0xff8a3d, "Cinder Hollow (Lamplight)");
    // bone piles: ribcage arcs + skull
    [
      [cx + 26, cz - 24, 0.5],
      [cx - 36, cz + 4, 2.2],
      [cx + 6, cz - 42, 1.2],
    ].forEach(([x, z, ry]) => {
      const o = new T.Group();
      for (let k = 0; k < 5; k++) {
        const r = new T.Mesh(new T.TorusGeometry(1.1 - k * 0.08, 0.09, 5, 12, Math.PI), M(0xe8dcc0));
        r.position.set(0, 0, -1 + k * 0.5);
        o.add(r);
      }
      const sp = new T.Mesh(Cy(0.1, 0.1, 3, 6), M(0xe8dcc0));
      sp.rotation.x = Math.PI / 2;
      sp.position.y = 1.05;
      o.add(sp);
      const sk = new T.Mesh(Sp(0.5, 10), M(0xe8dcc0));
      sk.position.set(1.6, 0.4, 1.6);
      o.add(sk);
      [-0.18, 0.18].forEach((e) => {
        const ey = new T.Mesh(Sp(0.12, 6), M(0x110808));
        ey.position.set(1.6 + e, 0.5, 2.04);
        o.add(ey);
      });
      o.position.set(x, 0, z);
      o.rotation.y = ry;
      S.add(o);
      solids.push({ x, z, r: 1.6 });
    });
    // steam vents
    [
      [cx + 20, cz + 20],
      [cx - 22, cz - 6],
      [cx + 36, cz - 14],
      [cx - 18, cz + 34],
      [cx + 4, cz - 30],
    ].forEach(([x, z]) => {
      add(Cy(0.9, 1.2, 0.3, 10), 0x2a2024, x, 0.15, z);
      add(Cy(0.5, 0.5, 0.32, 10), 0xff6a1a, x, 0.16, z);
      SMK.push({ x, y: 0.4, z, t: rnd() * 2, c: 0xd0a090, fast: 1 });
      solids.push({ x, z, r: 1 });
    });
    // broken cart
    {
      const o = new T.Group();
      o.add(
        mk(B(2.2, 0.6, 1.3), 0x4a2f1b, 0, 0.6, 0),
        mk(new T.TorusGeometry(0.5, 0.08, 5, 12), 0x2a1a10, 0.7, 0.45, 0.7),
      );
      const w = mk(new T.TorusGeometry(0.5, 0.08, 5, 12), 0x2a1a10, -0.7, 0.1, 0.9);
      w.rotation.x = Math.PI / 2;
      o.add(w);
      o.rotation.set(0, 0.8, 0.2);
      o.position.set(cx - 22, 0, cz + 30);
      S.add(o);
      solids.push({ x: cx - 22, z: cz + 30, r: 1.4 });
    }
    const EMB = [];
    for (let k = 0; k < 7; k++) {
      const a = k * 0.95 + 0.2,
        d = rr(28, 45),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if ((Math.abs(x - cx) < 8 && z > cz) || Math.hypot(x + 566, z + 426) < 7 || Math.hypot(x + 596, z + 385) < 17)
        continue;
      for (let j = 0; j < 4; j++)
        EMB.push([
          x + rr(-1.2, 1.2),
          rr(0.2, 0.6),
          z + rr(-1.2, 1.2),
          rr(0.5, 1.1),
          rnd() * 6,
          rr(-0.4, 0.4),
          0.6,
          1.9,
          0.6,
        ]);
      solids.push({ x, z, r: 1.4 });
    }
    inst(new T.OctahedronGeometry(0.5), 0xff7a2a, EMB, 0xcc3300);
    for (let k = 0; k < 26; k++) {
      const a = rnd() * 6.283,
        d = rr(20, 47);
      ROCK.push([cx + Math.cos(a) * d, 0.15, cz + Math.sin(a) * d, rr(0.5, 1.3), rnd() * 6, rnd()]);
    }
    sf("hound", 3, cx + 6, cz - 14);
    sf("hound", 3, cx - 6, cz - 8);
    sf("hound", 3, cx + 18, cz - 12);
    sf("hound", 3, cx - 18, cz + 2);
    sf("hound", 4, cx, cz - 27, 1);
    sf("hound", 3, cx + 34, cz - 4);
    sf("hound", 3, cx - 30, cz - 14);
    sf("hound", 3, cx + 16, cz - 40);
    sf("hound", 3, cx - 16, cz - 40);
    sf("hound", 3, cx + 34, cz + 26);
    // v11 outer band: obsidian spires, two more lava pools, a toppled furnace to the west, and more hounds
    const fu = [cx - 54, cz - 18];
    bandPts(
      cx,
      cz,
      40,
      50,
      68,
      (x, z) =>
        Math.hypot(x - fu[0], z - fu[1]) < 9 ||
        Math.hypot(x - cx - 50, z - cz - 30) < 8 ||
        Math.hypot(x - cx + 12, z - cz + 60) < 8,
    ).forEach(([x, z]) => spire(x, z, rb(1, 1.9), rb(4, 9), 1));
    lava(cx + 50, cz + 30, 5);
    lava(cx - 12, cz - 60, 4.5);
    {
      const o = new T.Group();
      o.add(mk(Cy(2.4, 2.8, 5, 10), 0x3a2a2c, 0, 2.5, 0), mk(Cy(1.2, 1.2, 5.2, 10), 0x1a0e0e, 0, 2.6, 0));
      o.rotation.z = 1.25;
      o.position.set(fu[0], 1.6, fu[1]);
      S.add(o);
      const fg = new T.Sprite(AM(SP.fire));
      fg.scale.setScalar(3.4);
      fg.position.set(fu[0] + 2, 1.2, fu[1]);
      S.add(fg);
      solids.push({ x: fu[0], z: fu[1], r: 3 });
      SMK.push({ x: fu[0] + 2, y: 1.5, z: fu[1], t: 0, c: 0x8a7a70 });
    }
    sf("hound", 3, cx + 46, cz - 16);
    sf("hound", 4, cx + 58, cz + 12, 1);
    sf("hound", 3, cx - 46, cz - 34);
    sf("hound", 3, cx - 60, cz + 6);
    sf("hound", 4, cx + 4, cz - 62, 1);
    sf("hound", 3, cx - 30, cz - 56);
    sf("hound", 3, cx + 40, cz + 46);
    sf("hound", 3, cx - 44, cz + 42);
    // v12 outer wilds: a lava lake, a ruined obsidian gateway, a crater ringed with spires, and more hounds
    // v22: the lake sat on the Cinder Trail where it enters the zone; moved ~16 off the road to its north-west side
    const ll = [cx + 82, cz - 82],
      og = [cx - 100, cz + 62],
      cr = [cx - 78, cz - 98];
    lava(ll[0], ll[1], 11);
    lava(ll[0] - 16, ll[1] + 8, 4);
    [-1, 1].forEach((s) => {
      spire(og[0] + s * 4, og[1], 1.6, 12, 1);
    });
    add(B(10, 1.6, 1.6), 0x2a2024, og[0], 11.5, og[1]);
    {
      const g0 = new T.Sprite(AM(SP.fire));
      g0.scale.setScalar(5);
      g0.position.set(og[0], 3, og[1]);
      S.add(g0);
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * 6.283;
      spire(cr[0] + Math.cos(a) * 11, cr[1] + Math.sin(a) * 11, r4(1.2, 2.2), r4(5, 11), 1);
    }
    add(Cy(9, 9, 0.12, 28), 0x2a1a1a, cr[0], 0.06, cr[1]);
    lava(cr[0], cr[1], 3);
    SMK.push({ x: cr[0], y: 0.6, z: cr[1], t: 0.5, c: 0x8a7a70 });
    const esk = near([ll, og, cr], 18);
    wild(cx, cz, 110, esk).forEach(([x, z]) => spire(x, z, r4(1, 2.2), r4(4, 11), 1));
    wild(cx, cz, 60, esk).forEach(([x, z]) => ROCK.push([x, 0.15, z, r4(0.5, 1.4), r4(0, 6), r4(0, 1)]));
    wild(cx, cz, 8, esk, ZR0 + 10, ZR - 14).forEach(([x, z]) => {
      add(Cy(0.9, 1.2, 0.3, 10), 0x2a2024, x, 0.15, z);
      add(Cy(0.5, 0.5, 0.32, 10), 0xff6a1a, x, 0.16, z);
      SMK.push({ x, y: 0.4, z, t: r4(0, 2), c: 0xd0a090, fast: 1 });
      solids.push({ x, z, r: 1 });
    });
    wildFoes(cx, cz, [
      ["hound", 4],
      ["hound", 3],
      ["hound", 4, 1],
      ["gloom", 4],
      ["hound", 4],
      ["hound", 3],
      ["hound", 4, 1],
      ["hound", 4],
      ["gloom", 4],
      ["hound", 3],
      ["hound", 4],
      ["hound", 4, 1],
    ]);
  }
  {
    const tc = OZ + TCZ;
    add(Cy(7, 8, 48, 16), 0x5a5470, OX, 24, tc);
    add(Cn(9.5, 12, 16), 0x3a2e5a, OX, 54, tc);
    add(B(3.2, 4.6, 0.8), 0x20162e, OX, 2.3, tc + 8.2);
    cb(OX, tc, 8.2, 60);
    for (let i = 0; i < 7; i++) {
      const w = new T.Sprite(lm);
      w.scale.setScalar(2.4);
      w.position.set(OX + (i % 2 ? 2.2 : -2.2), 9 + i * 5.5, tc + 7.9);
      S.add(w);
    }
    const bc = new T.Sprite(AM(SP.storm));
    bc.scale.setScalar(10);
    bc.position.set(OX, 62, tc);
    S.add(bc);
    portal(
      OX,
      OZ + TCZ + 10.2,
      [0, -893, Math.PI],
      0xb9a0ff,
      "Gloomspire (needs Lv 5)",
      () =>
        !(P.gates && P.gates.spire)
          ? "Gloom chains bind the Gloomspire. The seal is tied to the Cinder Fiend at the end of Gloomway."
          : P.lvl < 5
            ? "The seal is broken, but the climb needs a stronger light. Reach level 5 to enter."
            : null,
      () => towerReset(), // declared later (10-battle-flow.js); call it lazily
    );
  }
  const board = (x, z, id) => {
    const o = new T.Group();
    o.add(
      mk(B(0.15, 2.8, 0.15), 0x6b4a2b, -1, 1.4, 0),
      mk(B(0.15, 2.8, 0.15), 0x6b4a2b, 1, 1.4, 0),
      mk(B(2.6, 1.5, 0.15), 0x7a4a2a, 0, 2.1, 0),
    );
    const mkr = new T.Sprite(AM(SP.storm));
    mkr.scale.setScalar(1.5);
    mkr.position.y = 4.2;
    o.add(mkr);
    o.position.set(x, 0, z);
    S.add(o);
    const sg = sign("QUESTS", 2.4);
    sg.position.set(0, 3.4, 0.1);
    o.add(sg);
    solids.push({ x, z, r: 1.2 });
    NPCS.push({ o, kind: "b", id, mkr, x, z });
  };
  {
    const t = SHOPAT.tailor, // v13: Pip and Mira work inside their shops
      h = SHOPAT.heal;
    npc(t[0], t[1], 0xa83a6a, 0xffd27a, "c", "tailor", t[2]);
    npc(h[0], h[1], 0xe8e0f0, 0x7dff9a, "h", "hub", h[2]);
  }
  npc(594, -378, 0xe8e0f0, 0x9fe8ff, "h", "frost", 0);
  board(608, -378, "frost");
  npc(-606, -378, 0xe8d0c0, 0xffb040, "h", "ember", 0);
  board(-592, -378, "ember");
  // ===== MIREWICK MARSH (v10) =====
  {
    const cx = MWX,
      cz = MWZ;
    // v47 clean look: soft mossy patches and a few grass blades (was a speckle of hard dashes)
    const mud = (rep) =>
      tex(
        (x) => {
          x.fillStyle = "#21403a";
          x.fillRect(0, 0, 128, 128);
          softPatches(x, 40, ["#2a4e44", "#1a3430", "#30584a", "#203c36"], 0.45, 8, 22);
        },
        rep,
        (x) => {
          x.lineCap = "round";
          for (let i = 0; i < 30; i++) {
            const px = 8 + Math.random() * 240,
              py = 8 + Math.random() * 240;
            for (let b = -1; b <= 1; b++) {
              x.strokeStyle = "rgba(120,170,110,.4)";
              x.lineWidth = 1.3;
              x.beginPath();
              x.moveTo(px + b * 2, py);
              x.quadraticCurveTo(px + b * 3, py - 5, px + b * 5, py - 8 + Math.abs(b) * 2);
              x.stroke();
            }
          }
        },
      );
    flat(new T.PlaneGeometry(420, 420), mud(56), cx, -0.35, cz, -Math.PI / 2);
    flat(Cy(ZR + 1, ZR + 1, 0.3, 48), mud(11), cx, -0.15, cz);
    const mglow = (x, y, z, s) => {
      const g = new T.Sprite(AM(GLT));
      g.scale.setScalar(s);
      g.position.set(x, y, z);
      S.add(g);
    };
    M(0x3fb09a).emissive.setHex(0x0a3a30);
    // v14 tidy: pools moved off the lighthouse, the foes' posts and the new roads
    [
      [-18, -12, 5],
      [24, -10, 6],
      [-34, -44, 5],
      [14, -28, 4],
      [-36, 22, 5],
    ].forEach(([dx, dz, r]) => add(Cy(r, r, 0.14, 28), 0x3fb09a, cx + dx, 0.08, cz + dz));
    add(B(3.6, 0.2, 66), 0x5a4030, cx, 0.06, cz - 4);
    for (let i = 0; i < 14; i++) {
      const z = cz + 28 - i * 4.6;
      [-1, 1].forEach((s) => add(Cy(0.08, 0.1, 1.3, 5), 0x3a2a1e, cx + s * 2, 0.65, z));
      if (i % 3 === 0) mglow(cx + 2, 2.2, z, 3.2);
    }
    for (let i = 0; i < 80; i++) {
      const a = rnd() * 6.283,
        d = rr(6, 46),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (Math.abs(x - cx) < 3 && z > cz - 34) continue;
      if (Math.hypot(x - cx, z - cz - 18) < 15) continue;
      add(Cy(0.04, 0.06, rr(1.2, 2.2), 5), 0x7a9a52, x, 0.9, z);
    }
    for (let i = 0; i < 22; i++) {
      const a = i * 2.4 + 0.5,
        d = 18 + ((i * 7) % 26),
        x = cx + Math.cos(a) * d,
        z = cz + Math.sin(a) * d;
      if (Math.abs(x - cx) < 5 && z > cz - 34) continue;
      if (Math.hypot(x - cx, z - cz - 18) < 16) continue;
      add(Cy(0.22, 0.42, rr(4, 6), 6), 0x3a2f28, x, 2.5, z);
      solids.push({ x, z, r: 0.6 });
    }
    for (let i = 0; i < 130; i++) {
      const a = rnd() * 6.283,
        d = rr(ZR + 6, ZR + 30);
      add(Cy(0.25, 0.45, rr(4, 7), 6), 0x2e2622, cx + Math.cos(a) * d, 2.8, cz + Math.sin(a) * d);
    }
    {
      const lx = cx - 26,
        lz = cz - 26,
        lh = add(Cy(1.6, 2.4, 14, 10), 0xd8d0c0, lx, 7, lz);
      lh.rotation.z = 0.09;
      add(Cy(2.3, 2.3, 0.6, 10), 0x2a2a3a, lx - 0.6, 14.4, lz);
      mglow(lx - 0.6, 16, lz, 9);
      solids.push({ x: lx, z: lz, r: 2.8 });
    }
    {
      const sg = sign("MIREWICK MARSH", 3.2);
      sg.position.set(cx + 4, 3.2, cz + 24);
      S.add(sg);
      add(B(0.15, 3, 0.15), 0x6b4a2b, cx + 4, 1.5, cz + 24);
    }
    sf("wolf", 3, cx - 14, cz - 4);
    sf("hound", 4, cx + 12, cz - 10);
    sf("hound", 4, cx - 6, cz - 24);
    sf("wolf", 4, cx + 22, cz - 22, 1);
    sf("gloom", 3, cx + 4, cz - 34);
    sf("hound", 4, cx - 26, cz + 2);
    // v11 outer band: drowned trees, more glowing pools, a sunken shrine to the north-east, and more of the marsh's mixed foes
    const sh0 = [cx + 50, cz - 34];
    bandPts(cx, cz, 40, 50, 68, (x, z) => Math.hypot(x - sh0[0], z - sh0[1]) < 10).forEach(([x, z]) => {
      add(Cy(0.22, 0.42, rb(4, 6.5), 6), 0x3a2f28, x, 2.6, z);
      solids.push({ x, z, r: 0.6 });
    });
    [
      [54, 8, 6],
      [-50, -30, 7],
      [-30, 50, 5],
    ].forEach(([dx, dz, r]) => add(Cy(r, r, 0.14, 28), 0x3fb09a, cx + dx, 0.08, cz + dz));
    {
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * 6.283 + 0.4,
          x = sh0[0] + Math.cos(a) * 4,
          z = sh0[1] + Math.sin(a) * 4;
        const p = add(Cy(0.5, 0.6, 3.4, 8), 0x6a7a70, x, 1.5, z);
        p.rotation.z = k % 2 ? 0.15 : -0.12;
        solids.push({ x, z, r: 0.7 });
      }
      add(Cy(2.6, 2.8, 0.4, 16), 0x4a5a50, sh0[0], 0.2, sh0[1]);
      mglow(sh0[0], 1.6, sh0[1], 7);
    }
    sf("wolf", 4, cx + 46, cz - 14);
    sf("hound", 4, cx + 58, cz + 14);
    sf("gloom", 4, cx - 50, cz - 12);
    sf("wolf", 4, cx - 58, cz + 16, 1);
    sf("hound", 4, cx + 6, cz - 60);
    sf("gloom", 4, cx - 24, cz - 56);
    sf("hound", 4, cx + 40, cz + 44);
    sf("wolf", 4, cx - 42, cz + 44);
    // v12 outer wilds: drowned ruins, a bog-witch's hut, wide glowing pools, drowned trees and more of the marsh's foes
    const dr = [cx - 96, cz + 60],
      wh = [cx + 92, cz + 82],
      pools = [
        [cx + 96, cz - 40, 9],
        [cx - 70, cz - 96, 10],
        [cx + 20, cz + 112, 8],
        [cx - 118, cz - 10, 7],
      ];
    pools.forEach(([x, z, r]) => {
      add(Cy(r, r, 0.14, 28), 0x3fb09a, x, 0.08, z);
      mglow(x, 1.2, z, r);
    });
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * 6.283 + 0.2,
        x = dr[0] + Math.cos(a) * 7,
        z = dr[1] + Math.sin(a) * 7,
        h = 1.6 + ((k * 5) % 4) * 0.9,
        p = add(Cy(0.6, 0.7, h, 8), 0x6a7a70, x, h / 2, z);
      p.rotation.z = k % 2 ? 0.18 : -0.14;
      solids.push({ x, z, r: 0.8 });
      cb(x, z, 0.7, h);
    }
    add(Cy(3.2, 3.4, 0.4, 16), 0x4a5a50, dr[0], 0.2, dr[1]);
    mglow(dr[0], 1.6, dr[1], 8);
    house(wh[0], wh[1], Math.atan2(cx - wh[0], cz - wh[1]), 2, {
      wall: 0x4a5a4a,
      roof: 0x2a3a2a,
      shut: 0x5fe0c0,
      plain: 1,
      solid: 1,
    });
    const msk = near([dr, wh, ...pools], 14);
    {
      // drowned trees are instanced (one draw call) since there are so many out here
      const DT = wild(cx, cz, 110, msk).map(([x, z]) => {
        const h = r4(4, 6.5);
        solids.push({ x, z, r: 0.6 });
        cb(x, z, 0.5, h);
        return [x, h / 2, z, 1, r4(0, 6), 0, 1, h, 1];
      });
      inst(Cy(0.22, 0.42, 1, 6), 0x3a2f28, DT);
    }
    wildFoes(cx, cz, [
      ["wolf", 4],
      ["hound", 4],
      ["gloom", 4],
      ["wolf", 4, 1],
      ["hound", 4],
      ["gloom", 4],
      ["hound", 4, 1],
      ["wolf", 4],
      ["gloom", 4],
      ["hound", 4],
      ["wolf", 4, 1],
      ["gloom", 4],
    ]);
    {
      const mx = OX - 11.2,
        mz = OZ + PZ + 3;
      arch(mx, mz, Math.PI / 2, 0x5fe0c0);
      portal(
        mx,
        mz,
        [cx, cz + 24, Math.PI],
        0x5fe0c0,
        "Mirewick Marsh",
        () =>
          !(P.gates && P.gates.mire)
            ? "Brambles and old stone choke the arch. They will give way once the Gloom Warden has fallen."
            : P.lvl < 6
              ? "Teal light seeps between the stones. Reach level 6 to follow it."
              : null,
        null,
        Math.PI / 2,
      );
      const mp = PT[PT.length - 1];
      mp.r.visible = mp.g.visible = false;
    } // v10: shown by the Mirewick gate once it opens
    portal(cx, cz + 30, [OX + 6, OZ + PZ - 8, Math.PI], 0x5fe0c0, "Gloomway end plaza (return)");
  }
  const tf = (kind, t, i, dx, dz, big) => {
    const f = TF[i],
      o = mkFoe(kind, t, big);
    o.position.set(f.x + dx, 0, f.z + dz);
    S.add(o);
    foes.push({ o, t, kind, big, hx: f.x + dx, hz: f.z + dz, w: null, wt: 0, dead: 0, rt: Infinity, tw: i + 1 });
  };
  TF.forEach((f, i) => {
    const fl = new T.Mesh(Cy(14, 14, 0.4, 28), new T.MeshLambertMaterial({ map: cobble(5), color: 0x8a7aa8 }));
    fl.position.set(f.x, -0.15, f.z);
    S.add(fl);
    const wl = new T.Mesh(
      new T.CylinderGeometry(14.5, 14.5, 15, 28, 1, true),
      new T.MeshLambertMaterial({
        color: 0x4a3e6a,
        map: (() => {
          // v47 clean look: big rounded wall stones (was the small floor cobble)
          const t = ptex("brick").clone();
          t.needsUpdate = true;
          t.repeat.set(22, 3.6);
          return t;
        })(),
        side: T.BackSide,
      }),
    );
    wl.position.set(f.x, 7.5, f.z);
    S.add(wl);
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) / 8) * 6.28,
        x = f.x + Math.cos(a) * 13.2,
        z = f.z + Math.sin(a) * 13.2;
      add(Cy(0.6, 0.7, 7, 8), 0x5a5470, x, 3.5, z);
      const t2 = new T.Sprite(lm);
      t2.scale.setScalar(2.6);
      t2.position.set(x, 7.4, z);
      S.add(t2);
      solids.push({ x, z, r: 0.8 });
      cb(x, z, 0.7, 7);
    }
    const rg = new T.Mesh(
      new T.RingGeometry(6, 6.4, 40),
      new T.MeshBasicMaterial({
        color: 0x9a80ff,
        transparent: true,
        opacity: 0.6,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    );
    rg.rotation.x = -Math.PI / 2;
    rg.position.set(f.x, 0.14, f.z);
    S.add(rg);
    const nx = TF[i + 1],
      pv = TF[i - 1],
      // v30: once the Warden has fallen the stairs stay open (the tower refills, but you needn't fight up it again)
      lk = () => (fclear(i) || (P && P.warden > 0) ? null : "Defeat every guardian to open the stair.");
    portal(
      f.x,
      f.z - 11.5,
      nx ? [nx.x, nx.z + 6.5, Math.PI] : [OX + 6, OZ + PZ - 8, Math.PI],
      0xb9a0ff,
      nx ? "Up to floor " + (i + 2) : "Exit the tower",
      lk,
    );
    portal(
      f.x,
      f.z + 11.5,
      pv ? [pv.x, pv.z - 6.5, Math.PI] : [OX + 6, OZ + PZ - 8, Math.PI],
      0x8a6aff,
      pv ? "Down a floor" : "Leave the tower",
    );
  });
  // guardians stand off to the sides, clear of the stair landings (one used to stand right where you arrive)
  tf("gloom", 3, 0, -6, -2);
  tf("gloom", 3, 0, 6, -2);
  tf("hound", 3, 0, -7, 4);
  tf("gloom", 4, 1, -6, -1);
  tf("wolf", 3, 1, 6, -1, 1);
  tf("gloom", 4, 1, 7, 4);
  tf("gloom", 5, 2, 0, -1);
  // ===== a more lived-in world =====
  // clearAt removes trees/pines/spires/scatter (and their blockers) where a new landmark goes
  const clearAt = (x, z, r, tOnly) => {
    const gone = [];
    [TREES, PINES, SPIRES].forEach((A) => {
      for (let i = A.length - 1; i >= 0; i--)
        if (Math.hypot(A[i][0] - x, A[i][1] - z) < r) {
          gone.push(A[i]);
          A.splice(i, 1);
        }
    });
    if (!tOnly)
      [ROCK, BUSH, SHROOM, TUFT].forEach((A) => {
        for (let i = A.length - 1; i >= 0; i--) if (Math.hypot(A[i][0] - x, A[i][2] - z) < r) A.splice(i, 1);
      });
    const hit = (o) => gone.some((a) => Math.abs(a[0] - o.x) < 0.01 && Math.abs(a[1] - o.z) < 0.01);
    for (let i = CB.length - 1; i >= 0; i--) if (hit(CB[i])) CB.splice(i, 1);
    for (let i = solids.length - 1; i >= 0; i--) if (hit(solids[i])) solids.splice(i, 1);
  };
  const grp = (x, z, ry) => {
      const o = new T.Group();
      o.position.set(x, 0, z);
      o.rotation.y = ry || 0;
      return o;
    },
    gm = (o, geo, c, x, y, z, rx, ry, rz) => {
      const m = mk(geo, c, x, y, z);
      m.rotation.set(rx || 0, ry || 0, rz || 0);
      o.add(m);
      return m;
    };
  const glow = (x, y, z, s, p) => {
    const g2 = new T.Sprite(AM(GLT));
    g2.scale.setScalar(s);
    g2.position.set(x, y, z);
    (p || S).add(g2);
    return g2;
  };
  // v15 streets with purpose: cobbled corner plazas with a landmark each, street-name signposts with level ranges at the
  // start of every street, and rows of houses facing the road. Built from the end of 13-editor.js (after the editor's
  // BASE snapshot), so saved editor builds keep their scene indices.
  window.__streets = () => {
    // v15: corner plazas are a soft patch of the road's own dirt that fades into the grass, drawn under the sidewalks
    const fadeT = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const x = c.getContext("2d"),
        gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "#fff");
      gr.addColorStop(0.55, "#fff");
      gr.addColorStop(1, "#000");
      x.fillStyle = gr;
      x.fillRect(0, 0, 128, 128);
      return new T.CanvasTexture(c);
    })();
    const patch = (x, z, r, col) => {
      const t = dirt(1);
      t.repeat.set(r / 5, r / 5);
      const m = new T.Mesh(
        new T.CircleGeometry(r, 40),
        new T.MeshLambertMaterial({ map: t, alphaMap: fadeT, transparent: true, depthWrite: false, color: col }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.03, z);
      lay(m, 4);
      S.add(m);
      return m;
    };
    window.__patch = patch; // the zone streets' dead ends use it too
    RDS.forEach((R, i) => {
      const ash = i === 1;
      // corner plazas and landmarks
      R.cn.forEach((c, j) => {
        const a = RDCN[i][j],
          b = RDCN[i][j + 2],
          la = Math.hypot(a[0] - c[0], a[1] - c[1]),
          lb = Math.hypot(b[0] - c[0], b[1] - c[1]),
          ox = -((a[0] - c[0]) / la + (b[0] - c[0]) / lb),
          oz = -((a[1] - c[1]) / la + (b[1] - c[1]) / lb),
          ol = Math.hypot(ox, oz) || 1,
          x = OX + c[0],
          z = OZ + c[1],
          mx = x + (ox / ol) * 7.5,
          mz = z + (oz / ol) * 7.5;
        patch((x + mx) / 2, (z + mz) / 2, RCP + 1.5, ash ? 0xf0d0c0 : 0xd8dcf0);
        const o = grp(mx, mz, Math.atan2(-ox, -oz)),
          kind = (j + i) % 3;
        if (kind === 0) {
          // fountain
          gm(o, Cy(2.1, 2.3, 0.7, 18), 0x8a849c, 0, 0.35, 0);
          const w = gm(o, Cy(1.85, 1.85, 0.1, 18), ash ? 0xff8a4a : 0x6ab8ff, 0, 0.66, 0);
          w.material = w.material.clone();
          w.material.emissive.setHex(ash ? 0x6a2a0a : 0x1a4a8a);
          gm(o, Cy(0.3, 0.4, 1.8, 8), 0x7a7390, 0, 1.2, 0);
          gm(o, Cy(0.8, 0.5, 0.25, 12), 0x7a7390, 0, 2.15, 0);
          glow(mx, 2.6, mz, 2.2).material.color.setHex(ash ? 0xff9a5a : 0x9ad8ff);
          solids.push({ x: mx, z: mz, r: 2.4 });
        } else if (kind === 1) {
          // lamplighter statue on a plinth, lantern held high
          gm(o, B(1.8, 1.2, 1.8), 0x7a7390, 0, 0.6, 0);
          gm(o, B(2.1, 0.2, 2.1), 0x5a5470, 0, 1.25, 0);
          gm(o, Cn(0.55, 1.7, 8), 0x9a96a8, 0, 2.2, 0);
          gm(o, Sp(0.32, 8), 0x9a96a8, 0, 3.25, 0);
          gm(o, Cn(0.42, 0.8, 8), 0x9a96a8, 0, 3.75, 0);
          gm(o, Cy(0.05, 0.05, 1.2, 5), 0x2a2438, 0.45, 3.4, 0, 0, 0, -0.5);
          gm(o, B(0.3, 0.38, 0.3), LIT, 0.75, 3.95, 0);
          glow(mx, 4, mz, 1.8);
          solids.push({ x: mx, z: mz, r: 1.4 });
        } else {
          // tall lantern tower
          gm(o, B(1.4, 0.5, 1.4), 0x5a5470, 0, 0.25, 0);
          gm(o, Cy(0.22, 0.3, 6.2, 8), 0x2a2438, 0, 3.4, 0);
          gm(o, B(0.9, 1, 0.9), LIT, 0, 6.9, 0);
          gm(o, Cn(0.75, 0.7, 4), 0x2a2438, 0, 7.75, 0, 0, Math.PI / 4);
          glow(mx, 6.9, mz, 3.2).material.color.setHex(ash ? 0xffa060 : 0xffe0a0);
          solids.push({ x: mx, z: mz, r: 1 });
        }
        S.add(bake(o));
        cb(mx, mz, 1.6, 5);
      });
      // a signpost at the start of each street: its name and level range
      [46, R.cs[0] + RCR + 4, R.cs[2] + RCR + 4].forEach((s, k) => {
        const [lx, lz, hx, hz] = rdAt(R, s),
          o = R.sd * (RDW + 1.4),
          x = OX + lx - hz * o,
          z = OZ + lz + hx * o,
          nm = RDSEC[i][k],
          g = grp(x, z, Math.atan2(hx, hz));
        gm(g, Cy(0.09, 0.11, 3.4, 6), 0x4a2f1b, 0, 1.7, 0);
        S.add(bake(g));
        const s1 = sign(nm.toUpperCase(), 2.8),
          s2 = sign(ZLV[nm] ? ZLV[nm].toUpperCase() : "", 1.4);
        s1.position.set(x, 3, z);
        s2.position.set(x, 2.2, z);
        s1.rotation.y = s2.rotation.y = Math.atan2(hx, hz);
        s2.visible = false; // v16: streets don't show level ranges (the board is kept so the scene keeps its children)
        S.add(s1, s2);
        solids.push({ x, z, r: 0.35 });
      });
      // houses facing the street
      strSpots(i).forEach(([x, z, ry, k]) => {
        if (solids.some((q) => q.r >= 0.8 && Math.hypot(q.x - x, q.z - z) < q.r + 4)) return;
        if (okp(x, z)) return;
        house(
          x,
          z,
          ry,
          k + i * 3,
          ash ? { wall: [0x6a5a5a, 0x5a4a48, 0x7a6058][k % 3], roof: 0x3a2222, shut: 0x8a3a2a } : {},
        );
      });
    });
    // safety net: any house in town whose walls reach onto a road or corner plaza is hidden (you'd walk through it)
    HOUSES.forEach((h) => {
      if (zoneAt(h.x, h.z) !== "hub" || !h.o.visible) return;
      const bad = [0, 1, 2, 3, 4, 5, 6, 7, 8].some((k) => {
        const r = k ? 3.2 * (h.s || 1) : 0,
          px = h.x - OX + Math.cos(k * 0.785) * r,
          pz = h.z - OZ + Math.sin(k * 0.785) * r;
        return RDS.some((R) => {
          if (R.sd * px < SW + 2) return false;
          const q = rdNear(R, px, pz);
          return (q && q.d < RDW + 0.3) || R.cn.some((c) => Math.hypot(px - c[0], pz - c[1]) < RCP);
        });
      });
      if (!bad) return;
      h.o.visible = false;
      for (let n = CB.length - 1; n >= 0; n--) if (CB[n].hs === h) CB.splice(n, 1);
    });
    // the reserved spots kept trees away; the real houses carry their own colliders now
    STRRES.forEach((r) => {
      const n = CB.indexOf(r);
      if (n >= 0) CB.splice(n, 1);
    });
  };
  M(0xeaf4ff).color.setHex(0xa4b2c8);
  // ---- garland lights strung between the square's houses and across Gloomway ----
  {
    const GP = [],
      GCo = [],
      WL = [],
      GSP = [], // v46: one entry per span, built as its own editable piece after the editor's snapshot (__garLate)
      gar = (x1, z1, x2, z2, y, n) => GSP.push([x1, z1, x2, z2, y, n]);
    // v43: strung straight across the lane mouths (the houses at 0 / 180 degrees moved out to the lanes)
    const hp = SQH.filter((a, i) => !SQOUT[i]).map((a) => [OX + Math.cos(a) * 23.2, OZ + Math.sin(a) * 23.2]);
    for (let i = 0; i < hp.length - 1; i++) {
      const a = hp[i],
        b = hp[i + 1];
      gar(a[0], a[1], b[0], b[1], 4.6, 12);
    }
    for (let i = 1; i < 22; i += 2) {
      const z = OZ - 24 - i * 10.5 + 5;
      if (Math.abs(z - OZ - MLZ) < MLR + 4) continue;
      gar(OX - SC - 0.6, z, OX + SC + 0.6, z, 4.32, 12); // v47 polish: tied to the lamp posts' upper pole (was 4.5)
    }
    // Market Lane: a ring of lights strung between its six houses
    [150, 180, 210, -30, 0, 30].forEach((d, i, A) => {
      if (i === 2 || i === 5) return;
      const a = (d * Math.PI) / 180,
        b = (A[i + 1] * Math.PI) / 180;
      gar(
        OX + Math.cos(a) * 21.2,
        OZ + MLZ + Math.sin(a) * 21.2,
        OX + Math.cos(b) * 21.2,
        OZ + MLZ + Math.sin(b) * 21.2,
        4.6,
        10,
      );
    });
    const pg = new T.BufferGeometry();
    pg.setAttribute("position", new T.Float32BufferAttribute(GP, 3));
    pg.setAttribute("color", new T.Float32BufferAttribute(GCo, 3));
    S.add(
      new T.Points(
        pg,
        new T.PointsMaterial({
          size: 0.75,
          map: GLT,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          blending: T.AdditiveBlending,
        }),
      ),
    );
    const lg = new T.BufferGeometry();
    lg.setAttribute("position", new T.Float32BufferAttribute(WL, 3));
    const lmat = new T.LineBasicMaterial({ color: 0x1a1226 });
    S.add(new T.LineSegments(lg, lmat));
    // v46: the two scene children above stay (empty) so saved editor builds keep their scene-child indices; each span
    // is built here instead, called from the end of 13-editor.js (after BASE), as a group standing at the span's middle
    // with a see-nothing hit box, so the world editor can pick, move, turn, grow, copy or delete each string of lights
    const pmat = S.children[S.children.length - 2].material; // the (empty) Points just added
    window.__garLate = () =>
      GSP.forEach(([x1, z1, x2, z2, y, n]) => {
        const mx = (x1 + x2) / 2,
          mz = (z1 + z2) / 2,
          P = [],
          Co = [],
          L = [];
        let pv = null;
        for (let k = 0; k <= n; k++) {
          const t = k / n,
            x = x1 + (x2 - x1) * t - mx,
            yy = y - Math.sin(t * Math.PI) * 0.9,
            z = z1 + (z2 - z1) * t - mz;
          P.push(x, yy, z);
          const c = new T.Color([0xffd27a, 0xff8a6a, 0x9affc8, 0x8ad0ff, 0xffe9a0][k % 5]);
          Co.push(c.r, c.g, c.b);
          if (pv) L.push(pv[0], pv[1], pv[2], x, yy, z);
          pv = [x, yy, z];
        }
        const g = new T.Group();
        g.name = "garland";
        g.position.set(mx, 0, mz);
        const a = new T.BufferGeometry();
        a.setAttribute("position", new T.Float32BufferAttribute(P, 3));
        a.setAttribute("color", new T.Float32BufferAttribute(Co, 3));
        const pts = new T.Points(a, pmat);
        pts.frustumCulled = false;
        const b = new T.BufferGeometry();
        b.setAttribute("position", new T.Float32BufferAttribute(L, 3));
        g.add(pts, new T.LineSegments(b, lmat));
        const len = Math.hypot(x2 - x1, z2 - z1),
          hit = new T.Mesh(
            new T.BoxGeometry(0.5, 1.2, len),
            new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 }),
          );
        hit.material.userData.dtx = 0;
        hit.position.y = y - 0.5;
        hit.rotation.y = Math.atan2(x2 - x1, z2 - z1);
        g.add(hit);
        S.add(g);
      });
  }
  // ---- talkers: townsfolk with something to say (a speech bubble pops up when you walk close) ----
  const talker = (x, z, ry, sp, lines, sc, still) => {
    const o = person(sp);
    o.scale.setScalar(sc || 1);
    o.position.set(x, 0, z);
    o.rotation.y = ry;
    S.add(o);
    solids.push({ x, z, r: 0.8 * (sc || 1) });
    TALK.push({ o, x, z, ry, lines, still, li: -1, lt: 0, by: 4.1 * (sc || 1) });
    return o;
  };
  talker(
    OX - 9.4,
    OZ - 12.6,
    0,
    { robe: 0x3a4a7a, trim: 0xc9a24a, hat: "none", prop: "spear", brow: 0x3a2a1a, beard: 0x5a3a1a },
    [
      "Gloomway's crawling tonight. Keep to the green sidewalks.",
      "Halt! ...oh, it's you. Carry on, lamplighter.",
      "They never chase. Step in a red ring though, and you've got a fight.",
    ],
    1,
    1,
  );
  talker(
    OX + 9.4,
    OZ - 12.6,
    0,
    { robe: 0x3a4a7a, trim: 0xc9a24a, hat: "none", prop: "spear", brow: 0x2a1a10, skin: 0xc89870 },
    [
      "My shift ends at sunrise. So... never.",
      "Big ones, alphas and bosses drop the best gear. Check your Bag after.",
      "Fire after ice: MELT. Storm after burn: OVERLOAD. Learn it, love it.",
    ],
    1,
    1,
  );
  talker(
    OX + 12.4,
    OZ - 9.4,
    Math.atan2(-12.4, 9.4),
    {
      robe: 0x6a5a7a,
      trim: 0xe8e0d0,
      hat: "round",
      hc: 0x3a2a3a,
      beard: 0xe8e8f0,
      brow: 0xe8e8f0,
      prop: "cane",
      w: 0.95,
    },
    [
      "I remember the sun. Big yellow thing. Overrated.",
      "Weave your schools, youngster! A different school each cast hits harder.",
      "Imps steal pips, brutes harden their hides, wolves howl for the pack. Read the 'Next' tags.",
    ],
    0.95,
  );
  talker(
    OX - 11.5,
    OZ - 3.8,
    1.9,
    { robe: 0xd9a441, trim: 0xff6a8a, hat: "cap", hc: 0xff6a8a, w: 0.9 },
    [
      "The pigeons won't let me catch them!",
      "Are you a REAL lamplighter? Can you light ME?",
      "Mum says wolves hate fire. I hate bedtime.",
    ],
    0.62,
  );
  talker(
    OX + SW - 1.2,
    OZ - 38,
    -Math.PI / 2,
    { robe: 0x8a5a2f, trim: 0xffd27a, hat: "band", hc: 0xc9402a, prop: "ladder", brow: 0x3a2a1a },
    [
      "Third lamp this week. Something keeps snuffing them. If you see one flickering purple, walk up and light it, would you?",
      "Pumpkins, windmills, shrines out east. Duskwick's bigger than this street.",
      "If you're hurt, Mira on Market Lane patches anyone up. Just up the street.",
    ],
    1,
  );
  // ---- critters: pigeons, a cat, snow hares ----
  const critter = (kind, x, z) => {
    const o = new T.Group(),
      pt = {};
    const c = (geo, col, px, py, pz, p) => {
      const m = mk(geo, col, px, py, pz, 1);
      (p || o).add(m);
      return m;
    };
    if (kind === "bird") {
      c(Sp(0.18, 8), 0x8a849c, 0, 0.2, 0).scale.set(0.9, 0.85, 1.25);
      pt.hd = new T.Group();
      pt.hd.position.set(0, 0.36, 0.16);
      o.add(pt.hd);
      c(Sp(0.11, 8), 0x6a6a8a, 0, 0, 0, pt.hd);
      c(Cn(0.03, 0.1, 4), 0xd9a441, 0, -0.01, 0.12, pt.hd).rotation.x = Math.PI / 2;
      c(Sp(0.025, 4), 0x111111, 0.06, 0.03, 0.07, pt.hd);
      c(Sp(0.025, 4), 0x111111, -0.06, 0.03, 0.07, pt.hd);
      c(Sp(0.09, 6), 0x7a9a8a, 0, 0.3, 0.1).scale.set(1, 0.7, 0.6);
      const wm = new T.MeshBasicMaterial({ color: 0x6a647c, side: T.DoubleSide }),
        wg = new T.BufferGeometry();
      wg.setAttribute("position", new T.Float32BufferAttribute([0, 0, -0.1, 0.32, 0, 0, 0, 0, 0.14], 3));
      pt.w = [-1, 1].map((s) => {
        const w = new T.Mesh(wg, wm);
        w.scale.x = s;
        w.position.set(s * 0.1, 0.26, 0);
        o.add(w);
        return w;
      });
    } else if (kind === "hare") {
      c(Sp(0.3, 10), 0xd8e0ea, 0, 0.3, 0).scale.set(0.85, 0.8, 1.25);
      pt.hd = new T.Group();
      pt.hd.position.set(0, 0.5, 0.3);
      o.add(pt.hd);
      c(Sp(0.17, 8), 0xd8e0ea, 0, 0, 0, pt.hd);
      c(Sp(0.03, 4), 0x111111, 0.09, 0.04, 0.12, pt.hd);
      c(Sp(0.03, 4), 0x111111, -0.09, 0.04, 0.12, pt.hd);
      pt.e = [-1, 1].map((s) => {
        const e = c(Cn(0.05, 0.38, 5), 0xd8e0ea, s * 0.06, 0.25, -0.03, pt.hd);
        e.rotation.z = -s * 0.15;
        return e;
      });
      c(Sp(0.09, 6), 0xffffff, 0, 0.36, -0.36);
    } else {
      c(Sp(0.3, 10), 0x3a3040, 0, 0.36, 0).scale.set(0.75, 0.75, 1.35);
      pt.hd = new T.Group();
      pt.hd.position.set(0, 0.62, 0.38);
      o.add(pt.hd);
      c(Sp(0.2, 10), 0x3a3040, 0, 0, 0, pt.hd);
      [-1, 1].forEach((s) => {
        c(Cn(0.07, 0.16, 4), 0x3a3040, s * 0.11, 0.18, 0, pt.hd);
        c(Sp(0.04, 5), 0xb8ff6a, s * 0.08, 0.03, 0.16, pt.hd).material.emissive.setHex(0x557722);
      });
      pt.t = new T.Group();
      pt.t.position.set(0, 0.45, -0.38);
      o.add(pt.t);
      c(Cy(0.04, 0.03, 0.7, 5), 0x3a3040, 0, 0.33, -0.08, pt.t).rotation.x = -0.3;
      [
        [-0.14, 0.2],
        [0.14, 0.2],
        [-0.14, -0.2],
        [0.14, -0.2],
      ].forEach(([a, b]) => c(Cy(0.05, 0.05, 0.3, 5), 0x3a3040, a, 0.15, b));
    }
    o.position.set(x, 0, z);
    o.rotation.y = rnd() * 6;
    S.add(o);
    CRIT.push({ o, kind, pt, hx: x, hz: z, st: 0, t: rnd() * 3, vx: 0, vz: 0, vy: 0, tx: x, tz: z });
  };
  for (let k = 0; k < 4; k++) {
    const a = k * 0.25 + 3.55,
      r = 8.5 + rnd() * 2;
    critter("bird", OX + Math.cos(a) * r, OZ + Math.sin(a) * r);
  }
  critter("cat", OX + 15, OZ + 10);
  // ---- Hollow Road: a windmill, a pumpkin farm and farmhouse, a stream with a little bridge, a wisp shrine ----
  // v12: these landmarks keep their old spots along the straight roads, mapped onto the winding ones by RMAP
  {
    const [wx, wz] = RMAP(55, -24);
    clearAt(wx, wz, 7);
    const o = grp(wx, wz, 0);
    gm(o, Cy(1.5, 2.3, 7.5, 8), 0xcdb89a, 0, 3.75, 0);
    gm(o, Cn(2.0, 2.2, 8), 0x7a3a4a, 0, 8.6, 0);
    gm(o, B(1, 1.7, 0.2), 0x4a2f1b, 0, 0.85, 2.05, -0.1);
    gm(o, B(0.6, 0.7, 0.2), LIT, 0, 4.2, 1.75, -0.12);
    gm(o, Cy(0.3, 0.3, 0.8, 8), 0x4a2f1b, 0, 6.9, 1.9, Math.PI / 2);
    const ob = bake(o);
    S.add(ob);
    solids.push({ x: wx, z: wz, r: 2.5 });
    cb(wx, wz, 2.4, 9);
    const bl = new T.Group();
    bl.position.set(wx, 6.9, wz + 2.35);
    S.add(bl);
    for (let k = 0; k < 4; k++) {
      const a = new T.Group();
      a.rotation.z = (k * Math.PI) / 2;
      bl.add(a);
      a.add(mk(B(0.22, 4.4, 0.12), 0x6b4a2b, 0, 2.3, 0));
      const sl = mk(B(1.1, 3.4, 0.05), 0xe8e0d0, 0.62, 2.7, -0.05);
      a.add(sl);
    }
    WM.push(bl);
  }
  {
    // v15: beside the last block of Pumpkin Patch Lane (RMAP put it on a short corner leg, with the farmhouse on the road)
    const fs0 = RDS[0].cs[3] + RCR + 16,
      [fax, faz, fhx, fhz] = rdAt(RDS[0], fs0),
      fx0 = OX + fax - fhz * 24,
      fz0 = OZ + faz + fhx * 24;
    clearAt(fx0, fz0, 10);
    clearAt(fx0 + 12, fz0 + 3, 7);
    add(B(14, 0.22, 9), 0x5a4434, fx0, -0.25, fz0);
    const PU = [],
      ST = [];
    for (let r = 0; r < 4; r++) {
      add(B(13, 0.3, 0.7), 0x4a3428, fx0, -0.12, fz0 - 3.2 + r * 2.1);
      for (let k = 0; k < 6; k++)
        if (rnd() < 0.8) {
          const x = fx0 - 5.5 + k * 2.2 + rr(-0.4, 0.4),
            z = fz0 - 3.2 + r * 2.1,
            s = rr(0.5, 1);
          PU.push([x, 0.25 * s, z, s, rnd() * 6, 0, 1.25, 0.85, 1.25]);
          ST.push([x, 0.5 * s + 0.05, z, s]);
        }
    }
    inst(Sp(0.5, 10), 0xe0702a, PU, 0x3a1400);
    inst(Cy(0.05, 0.07, 0.3, 5), 0x3a6a2a, ST);
    {
      const o = grp(fx0 + 2, fz0 + 1, 0.3);
      gm(o, Cy(0.07, 0.08, 3, 5), 0x6b4a2b, 0, 1.5, 0);
      gm(o, B(2.2, 0.12, 0.12), 0x6b4a2b, 0, 2.3, 0);
      gm(o, Cn(0.55, 1.3, 6), 0x6a8a3a, 0, 1.9, 0);
      gm(o, Sp(0.32, 8), 0xd9c070, 0, 2.85, 0);
      gm(o, Cy(0.5, 0.5, 0.06, 10), 0x5a3a1a, 0, 3.12, 0);
      gm(o, Cn(0.3, 0.55, 8), 0x5a3a1a, 0, 3.4, 0);
      gm(o, Sp(0.05, 4), 0x111111, -0.1, 2.9, 0.29);
      gm(o, Sp(0.05, 4), 0x111111, 0.1, 2.9, 0.29);
      [-1, 1].forEach((s) => gm(o, Cn(0.12, 0.4, 4), 0xd9c070, s * 1.15, 2.3, 0, 0, 0, (s * Math.PI) / 2));
      S.add(bake(o));
    }
    house(fx0 + 12, fz0 + 4, Math.PI, 5, { wall: 0xcdb89a, roof: 0x6a4a2a, shut: 0x3a8a4a });
    fence(fx0 - 7, fz0 - 5, fx0 + 7, fz0 - 5);
    talker(
      fx0 - 4,
      fz0 - 24 + RDW + 1.6,
      Math.PI,
      { robe: 0x6a8a3a, trim: 0xd9c070, hat: "round", hc: 0x8a6a2a, beard: 0x8a6a3a, prop: "sack" },
      [
        "Gloomlings keep nicking my pumpkins. Little thieves.",
        "Wind's up! Good for the mill, bad for my hat.",
        "Follow the wisps east and you'll find Frostfen. Bring a coat.",
      ],
      1,
    );
  }
  {
    // the stream crosses the road at right angles wherever the road happens to point there (sg = turned group)
    const [sx, sz, sa] = RMAP(78, 0),
      sg = new T.Group(),
      loc = (lx, lz) => [sx + lx * Math.cos(sa) + lz * Math.sin(sa), sz - lx * Math.sin(sa) + lz * Math.cos(sa)],
      wt = tex((x) => {
        x.fillStyle = "#2a5a8a";
        x.fillRect(0, 0, 128, 128);
        x.strokeStyle = "rgba(180,230,255,.35)";
        x.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const y = Math.random() * 128;
          x.beginPath();
          x.moveTo(Math.random() * 40, y);
          x.quadraticCurveTo(64, y + 6, 90 + Math.random() * 38, y);
          x.stroke();
        }
      }, 1);
    wt.repeat.set(1, 6);
    WTX.push(wt);
    sg.position.set(sx, 0, sz);
    sg.rotation.y = sa;
    S.add(sg);
    [-1, 1].forEach((s) => {
      const m = new T.Mesh(
        new T.PlaneGeometry(3.4, 34),
        new T.MeshLambertMaterial({ map: wt, color: 0xaaccff, emissive: 0x0a2040 }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, -0.3, s * (RDW + 1.4 + 17));
      sg.add(m);
      for (let k = 0; k < 9; k++) {
        const [x, z] = loc(0, s * (RDW + 2 + k * 3.8)),
          [rx, rz] = loc(k % 2 ? 1.9 : -1.9, s * (RDW + 2 + k * 3.8) + rr(-1, 1));
        clearAt(x, z, 2.6);
        ROCK.push([rx, 0.05, rz, rr(0.4, 0.8), rnd() * 6, rnd()]);
      }
    });
    const bz = RDW + 0.7;
    sg.add(mk(B(3.6, 0.2, bz * 2), 0x7a4a2a, 0, 0.12, 0));
    [-1, 1].forEach((s) => {
      [-1.6, 0, 1.6].forEach((dx) => sg.add(mk(B(0.16, 1.1, 0.16), 0x6b4a2b, dx, 0.55, s * bz)));
      sg.add(mk(B(3.6, 0.12, 0.12), 0x6b4a2b, 0, 1.0, s * bz));
      sg.add(mk(B(3.6, 0.1, 0.1), 0x6b4a2b, 0, 0.55, s * bz));
    });
  }
  const shrine = (x, z, ry, col) => {
    const o = grp(x, z, ry);
    gm(o, B(1.2, 1.4, 0.9), 0x7a7390, 0, 0.7, 0);
    gm(o, B(1.5, 0.15, 1.2), 0x5a5470, 0, 1.45, 0);
    gm(o, Cn(1, 0.7, 4), 0x5a5470, 0, 1.85, 0, 0, Math.PI / 4);
    gm(o, B(0.7, 0.7, 0.1), 0x20162e, 0, 0.85, 0.42);
    const c1 = gm(o, Cy(0.06, 0.06, 0.25, 6), 0xe8e0d0, -0.18, 0.62, 0.44);
    const c2 = gm(o, Cy(0.06, 0.06, 0.18, 6), 0xe8e0d0, 0.18, 0.58, 0.44);
    S.add(bake(o));
    const w = new T.Vector3(0, 0.95, 0.6).applyAxisAngle(new T.Vector3(0, 1, 0), ry);
    glow(x + w.x, 0.95, z + w.z, 1.6).material.color.setHex(col);
    solids.push({ x, z, r: 0.9 });
  };
  {
    const a = RMAP(42, RDW + 2.6),
      b = RMAP(-42, -RDW - 2.6);
    shrine(a[0], a[1], Math.PI + a[2], 0x9affc8);
    shrine(b[0], b[1], b[2], 0xffb070);
  }
  // ---- Ashen Trail: charcoal kilns, burnt trees, a ruined watchtower ----
  [RMAP(-57, 18), RMAP(-65, 23), RMAP(-72, 17.5)].forEach(([x, z], k) => {
    clearAt(x, z, 3.8);
    const d = add(Sp(2, 12), 0x4a3a36, x, 0, z);
    d.scale.set(1, 0.75, 1);
    add(B(0.9, 0.8, 0.4), 0x1a0a05, x, 0.4, z - 1.9);
    glow(x, 0.5, z - 2.1, 1.4).material.color.setHex(0xff7a3a);
    SMK.push({ x, y: 1.6, z, t: k * 0.3, c: 0x6a5a56 });
    solids.push({ x, z, r: 2.1 });
  });
  {
    const DT = [],
      DB = [];
    for (let k = 0; k < 36; k++) {
      const [x, z] = RMAP(-rr(20, GX - 16), (k % 2 ? 1 : -1) * rr(11.5, 28));
      if (okp(x, z)) continue;
      const s = rr(0.8, 1.3);
      DT.push([x, 1.4 * s, z, s, rnd() * 6, 0, 1, 1, 1]);
      for (let b = 0; b < 3; b++) {
        const a = rnd() * 6;
        DB.push([x + Math.cos(a) * 0.4 * s, (1.6 + b * 0.5) * s, z + Math.sin(a) * 0.4 * s, s, a, 0, 1, 1, 1]);
      }
      cb(x, z, 0.5, 3);
    }
    inst(Cy(0.12, 0.26, 2.8, 5), 0x1e1618, DT);
    const bg = Cy(0.04, 0.07, 1.1, 4);
    bg.rotateZ(0.9);
    inst(bg, 0x1e1618, DB);
  }
  {
    const [tx, tz] = RMAP(-95, -20);
    clearAt(tx, tz, 6);
    const o = grp(tx, tz, 0.3);
    gm(o, Cy(2.1, 2.5, 5.5, 10), 0x7a7390, 0, 2.75, 0);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 6.283;
      if (k === 3 || k === 4) continue;
      gm(o, B(0.9, 0.9 + ((k * 5) % 3) * 0.5, 0.7), 0x7a7390, Math.cos(a) * 1.85, 5.8, Math.sin(a) * 1.85, 0, -a);
    }
    gm(o, B(0.7, 1.1, 0.2), LIT, 0, 3.6, 2.25, 0);
    gm(o, B(1.1, 1.8, 0.2), 0x20162e, 0, 0.9, 2.4);
    [
      [2.8, 0.3, 1.5],
      [-2.6, 0.25, 2],
      [1.5, 0.2, -3],
    ].forEach(([a, b, c2]) => gm(o, B(0.8, 0.5, 0.6), 0x6a6382, a, b, c2, 0, a));
    S.add(bake(o));
    solids.push({ x: tx, z: tz, r: 2.8 });
    cb(tx, tz, 2.6, 6.5);
  }
  // ---- Frostfen village: cottages, a campfire, an ice fisher, a sled, snow hares ----
  // clear pines / spires that grew through the lodge, stalls, tents, healers, boards, lamps and dungeon doors (they used to clip)
  [
    [600, -400],
    [-600, -400],
  ].forEach(([cx, cz], k) => {
    const s = k ? -1 : 1;
    [
      [-19 * s, 9, 6],
      [-12 * s, 5, 3.5],
      [-9.5, 23.5, 5.8],
      [-6, 22, 3.2],
      [8, 22, 3.2],
      [-14 * s, 10.5, 2],
      [-6, 18, 1.5],
      [-6, 10, 1.5],
      [6, 18, 1.5],
      [6, 10, 1.5],
      [-15 * s, 12, 2.5],
      [0, 26, 4],
    ].forEach(([dx, dz, r]) => clearAt(cx + dx, cz + dz, r));
  });
  DUN.forEach((D) => clearAt(D.door[0], D.door[1], 5));
  {
    const cx = 600,
      cz = -400;
    [
      [20, 33, 0x8a6a4a, 2],
      [-24, 30, 0x6a5a7a, 4],
      [-32, 10, 0x7a5a4a, 7],
    ].forEach(([dx, dz, wc, i]) => {
      clearAt(cx + dx, cz + dz, 5.8);
      house(cx + dx, cz + dz, Math.atan2(-dx, -dz), i, { snow: 1, roof: 0xa4b2c8, wall: wc, solid: 1 });
    });
    {
      const fx = cx + 14,
        fz = cz + 27;
      clearAt(fx, fz, 3.5);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * 6.283;
        add(Sp(0.25, 6), 0x6a6382, fx + Math.cos(a) * 0.9, 0.1, fz + Math.sin(a) * 0.9);
      }
      [0, 1.2].forEach((a) => {
        const l = add(Cy(0.12, 0.12, 1.5, 6), 0x4a2f1b, fx, 0.2, fz);
        l.rotation.set(Math.PI / 2, 0, a);
      });
      const f1 = new T.Sprite(AM(SP.fire));
      f1.scale.setScalar(2.2);
      f1.position.set(fx, 1, fz);
      S.add(f1);
      FIRES.push(f1);
      const pl = new T.PointLight(0xff9a4a, 1.2, 16);
      pl.userData.pool = 1;
      pl.position.set(fx, 1.6, fz);
      S.add(pl);
      SMK.push({ x: fx, y: 1.6, z: fz, t: 0, c: 0x8a8a9a });
      solids.push({ x: fx, z: fz, r: 1.1 });
      [
        [2.4, 0.4],
        [-2.2, 1],
        [0.3, -2.4],
      ].forEach(([a, b]) => {
        const lg = add(Cy(0.3, 0.3, 1.3, 8), 0x6b4a2b, fx + a, 0.3, fz + b);
        lg.rotation.set(0, Math.atan2(a, b) + Math.PI / 2, Math.PI / 2);
        solids.push({ x: fx + a, z: fz + b, r: 0.6 });
      });
      talker(
        fx - 2.6,
        fz - 1.6,
        Math.atan2(2.6, 1.6),
        { robe: 0x5a7a9a, trim: 0xeaf4ff, hat: "fur", hc: 0xd8e0ea, beard: 0x9a8a7a, prop: "mug" },
        [
          "Pull up a log. This fire's the only warm thing for miles.",
          "Wolves hate fire. Pack your Ember spells before you go wolf-hunting.",
          "Alpha wolves are big as ponies. They drop fine gear, though.",
        ],
        1,
      );
    }
    talker(
      cx + 4,
      cz + 0.6,
      Math.atan2(6, -6.6),
      { robe: 0x3a5a7a, trim: 0xc9a24a, hat: "fur", hc: 0x8a6a4a, beard: 0x6a5a4a, prop: "rod" },
      [
        "Nothing bites out here but the cold.",
        "Shh. You'll scare the fish. If there are fish.",
        "I caught a boot once. Wore it. If you find its twin, it's yours.",
      ],
      1,
      1,
    );
    {
      const h = add(new T.CircleGeometry(0.6, 14), 0x0a1424, cx + 6.8, 0.17, cz - 3.2);
      h.rotation.x = -Math.PI / 2;
      const bb = add(Sp(0.08, 6), 0xff3a3a, cx + 6.8, 0.2, cz - 3.2);
      bb.material = M(0xff3a3a, 1);
      bb.material.emissive.setHex(0x550000);
      BOB.push(bb);
    }
    {
      const o = grp(cx - 19, cz + 25, 0.8);
      [-0.4, 0.4].forEach((x) => gm(o, B(0.08, 0.12, 2.2), 0x6b4a2b, x, 0.1, 0));
      gm(o, B(1, 0.1, 1.8), 0xa83232, 0, 0.3, 0);
      gm(o, new T.TorusGeometry(0.4, 0.05, 5, 10, Math.PI), 0x6b4a2b, 0, 0.25, 1.05, 0, Math.PI / 2);
      S.add(bake(o));
      solids.push({ x: cx - 19, z: cz + 25, r: 1 });
    }
    [
      [22, 8],
      [-20, -2],
      [30, -12],
      [-12, 24],
      [26, 22],
    ].forEach(([dx, dz]) => critter("hare", cx + dx, cz + dz));
  }
  // ---- Cinderwaste: obsidian huts, a fallen giant's statue, a miner ----
  {
    const cx = -600,
      cz = -400;
    // v25: the first hut stood on the walk out to Obsidian Gate Road's arch; it now sits between that walk and Ember Steps'
    [
      [-4, 36, 4],
      [24, 36, 8],
    ].forEach(([dx, dz, i]) => {
      clearAt(cx + dx, cz + dz, 5.8);
      house(cx + dx, cz + dz, Math.atan2(-dx, -dz), i, {
        wall: 0x2e2630,
        roof: 0x1a1418,
        shut: 0xa8341a,
        plain: 1,
        solid: 1,
      });
    });
    {
      const sx = cx - 40,
        sz = cz + 12;
      clearAt(sx, sz, 6.5);
      const o = grp(sx, sz, 0.9);
      const hd = gm(o, Sp(2.4, 12), 0x5a5470, 0, 1.6, 0);
      hd.scale.set(1, 1.15, 1);
      gm(o, Cy(1.9, 2.1, 0.7, 10), 0x8a6a2a, 0.3, 3.9, 0, 0, 0, 0.25);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * 6.283;
        gm(o, Cn(0.3, 1, 4), 0x8a6a2a, 0.3 + Math.cos(a) * 1.6, 4.7, Math.sin(a) * 1.6, 0, 0, 0.25);
      }
      [-1, 1].forEach((s) => {
        const e = gm(o, Sp(0.36, 8), 0xff7a2a, 2.1, 2.1, s * 0.75);
        e.material = M(0xff7a2a, 1);
        e.material.emissive.setHex(0xcc3300);
      });
      gm(o, B(0.5, 1.2, 0.6), 0x4a4460, 2.35, 1.4, 0, 0, 0, -0.2);
      gm(o, B(1.6, 0.3, 0.2), 0x2a2438, 2.2, 0.8, 0, 0, Math.PI / 2);
      const hand = new T.Group();
      hand.position.set(-4.5, 0, 2.5);
      o.add(hand);
      gm(hand, B(2.2, 0.9, 1.6), 0x5a5470, 0, 0.45, 0);
      for (let k = 0; k < 4; k++) gm(hand, B(0.38, 0.38, 1.5), 0x5a5470, -0.8 + k * 0.52, 0.5, 1.4, 0.2 * k);
      gm(hand, B(0.4, 0.4, 1.1), 0x5a5470, 1.2, 0.5, 0.6, 0, -0.7);
      S.add(bake(o));
      solids.push(
        { x: sx, z: sz, r: 3 },
        {
          x: sx - 4.5 * Math.cos(0.9) + 2.5 * Math.sin(0.9),
          z: sz + 4.5 * Math.sin(0.9) + 2.5 * Math.cos(0.9),
          r: 1.6,
        },
      );
      cb(sx, sz, 2.8, 4.5);
    }
    talker(
      cx + 4,
      cz + 16.5,
      Math.atan2(-4, -16.5),
      { robe: 0x6a4a3a, trim: 0xffb040, hat: "band", hc: 0x3a2a2a, skin: 0xc89870, prop: "pick", brow: 0x2a1a10 },
      [
        "Hounds hate ice. Learned that the hard way.",
        "That head? Old king of the Hollow. Lost it, literally.",
        "The Fiend's Emberlings shrug off fire. Frost them.",
      ],
      1,
    );
  }
  // instanced scenery (built at the very end of world(), so every landmark below can clear the trees and rocks out of its way first)
  const flushAll = () => {
    flushTrees();
    ROCK.forEach((q) => {
      if (okp(q[0], q[2])) solids.push({ x: q[0], z: q[2], r: 0.75 * q[3] });
    });
    BUSH.forEach((q) => {
      if (okp(q[0], q[2])) solids.push({ x: q[0], z: q[2], r: 0.8 * q[3] });
    });
    inst(GEOX.rock(0.6), 0x6a6382, ROCK);
    inst(GEOX.bush(0.8), 0x2e6a48, BUSH);
    inst(
      Cy(0.07, 0.09, 0.4, 5),
      0xeae0d0,
      SHROOM.map((q) => [q[0], 0.2 * q[3], q[2], q[3]]),
    );
    inst(
      new T.SphereGeometry(0.22, 8, 5, 0, 6.283, 0, 1.6),
      0xd94a6a,
      SHROOM.map((q) => [q[0], 0.4 * q[3], q[2], q[3]]),
      0x331018,
    );
    inst(
      Cn(0.12, 0.55, 3),
      0x3d7a5a,
      TUFT.flatMap((q) => [
        [q[0], q[1], q[2], q[3], q[4]],
        [q[0] + 0.18, q[1], q[2] + 0.1, q[3] * 0.8, q[4] + 1, 0.3],
        [q[0] - 0.15, q[1], q[2] - 0.12, q[3] * 0.9, q[4] + 2, -0.3],
      ]),
    );
    inst(Cy(0.06, 0.06, 1.1, 5), 0x6b4a2b, fenceP);
    inst(B(0.08, 0.1, 1), 0x7a4a2a, fenceR);
    [0xff6a8a, 0xffd34d, 0x9a7aff, 0xffffff].forEach((c, k) => inst(Sp(0.13, 6), c, FLW[k]));
  };
  // distant mountains for every zone (no fog, recoloured per zone) so the world reads bigger than the walkable space
  // a ring of silhouette peaks that travels with the player (so it stays on the horizon without a long draw distance)
  MTG = new T.Group();
  S.add(MTG);
  [
    [0, 1],
    [1, 0.7],
  ].forEach(([layer, hk]) => {
    // drawn as a backdrop (first, no depth): skyFit() shrinks the ring to fit the far plane, and without this its wide
    // bases would poke in front of nearby houses and ground. Far layer (0) draws before the near one.
    const mat = new T.MeshBasicMaterial({ color: 0x2a1a40, fog: false, depthTest: false, depthWrite: false });
    MTN.push([mat, layer]);
    const n = 32;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * 6.283 + layer * 0.11,
        r = 250 - layer * 24,
        h = 64 * hk * (0.6 + ((k * 7 + layer * 3) % 5) * 0.14),
        m = new T.Mesh(Cn(h * 1.1, h, 5), mat);
      m.position.set(Math.cos(a) * r, h / 2 - 1.5, Math.sin(a) * r);
      m.rotation.y = k;
      m.renderOrder = layer - 2;
      MTG.add(m);
    }
  });
  {
    // backdrop ground out to the mountains, in fog colour (skyFit sets it): the real ground now stops at the far plane,
    // and this fills the band between its edge and the mountain bases, as the fully fogged grass sheet used to
    const gd = new T.Mesh(
      new T.CircleGeometry(262, 48),
      new T.MeshBasicMaterial({ color: 0x4a2a63, fog: false, depthTest: false, depthWrite: false }),
    );
    gd.rotation.x = -Math.PI / 2;
    gd.position.y = -0.4;
    gd.renderOrder = -3;
    MTG.add(gd);
    MTG.userData.gd = gd;
  }
  // fireflies along the street, square and both roads
  FF = new T.Group();
  FF.position.set(OX, 0, OZ);
  S.add(FF);
  ffm = new T.PointsMaterial({
    size: 0.9,
    map: GLT,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    fog: false,
  });
  const pos = [];
  for (let i = 0; i < 260; i++) pos.push((Math.random() - 0.5) * 64, 0.6 + Math.random() * 5, -Math.random() * SL + 10);
  for (let i = 0; i < 320; i++) {
    const R = RDS[i % 2],
      [x, z, hx, hz] = rdAt(R, Math.random() * (R.L + 16)),
      o = (Math.random() - 0.5) * 34;
    pos.push(x - hz * o, 0.6 + Math.random() * 5, z + hx * o);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  FF.add(new T.Points(geo, ffm));
  // weather: falling snow in Frostfen, rising embers in Cinderwaste (a box of points that follows the player)
  {
    const wp = [];
    for (let i = 0; i < 700; i++) wp.push((Math.random() - 0.5) * 70, Math.random() * 24, (Math.random() - 0.5) * 70);
    const wg = new T.BufferGeometry();
    wg.setAttribute("position", new T.Float32BufferAttribute(wp, 3));
    wxm = new T.PointsMaterial({ size: 0.35, map: GLT, transparent: true, depthWrite: false, opacity: 0.9 });
    WX = new T.Points(wg, wxm);
    WX.visible = false;
    WX.frustumCulled = false;
    S.add(WX);
  }
  // villagers wandering the square
  [
    [0xc8442f, "round", 0x5a3a1a],
    [0x4a8a3a, "hood", 0x3a5a2a],
  ].forEach(([robe, hat, hc], k) => {
    const o = person({ robe, hat, hc, w: 0.9 + 0.06 * (k % 3), trim: 0xe8e0d0 });
    o.scale.setScalar(0.82);
    const a = k * 3.1 + 0.3,
      x = OX + Math.cos(a) * 9,
      z = OZ + Math.sin(a) * 9;
    o.position.set(x, 0, z);
    S.add(o);
    VIL.push({ o, w: null, wt: 0, pause: 0 });
  });
  // bats circling over the street and the spire
  {
    const bm = new T.MeshBasicMaterial({ color: 0x1a1226, side: T.DoubleSide }),
      wg = new T.BufferGeometry();
    wg.setAttribute("position", new T.Float32BufferAttribute([0, 0, 0, 0.9, 0.15, -0.2, 0.55, 0, 0.3], 3));
    for (let k = 0; k < 14; k++) {
      const g = new T.Group(),
        b = new T.Mesh(Sp(0.16, 6), bm),
        l = new T.Mesh(wg, bm),
        r = new T.Mesh(wg, bm);
      r.scale.x = -1;
      g.add(b, l, r);
      S.add(g);
      BATS.push({
        g,
        l,
        r,
        cx: OX + (k < 9 ? 0 : 0),
        cz: OZ + (k < 9 ? -72 : TCZ),
        R: k < 9 ? 14 + k * 2.5 : 9 + (k - 9) * 2,
        h: k < 9 ? 13 + (k % 3) * 2 : 30 + (k % 4) * 4,
        sp: 0.35 + (k % 4) * 0.08,
        ph: k * 1.7,
      });
    }
  }
  // lore stones: walk up to one to read a piece of Duskwick's story
  [
    [OX - 8.5, OZ - 8.5],
    [OX + 9, OZ + PZ + 7],
    RMAP(GX + 4, 8),
    RMAP(-GX - 6, -7),
    [626.5, -424],
    [-588, -430],
    [-7, -1015],
  ].forEach(([x, z], i) => {
    clearAt(x, z, 2.4);
    const o = new T.Group(),
      gl = mk(B(0.7, 1.2, 0.04), 0x9fe8ff, 0, 1.45, 0.27, 1);
    gl.material.emissive.setHex(0x3a8ac8);
    o.add(mk(B(1.1, 2.4, 0.5), 0x5a5470, 0, 1.2, 0), mk(B(1.3, 0.3, 0.7), 0x3a3450, 0, 0.15, 0), gl);
    const s = new T.Sprite(AM(GLT));
    s.scale.setScalar(2.6);
    s.position.set(0, 2.9, 0);
    o.add(s);
    o.position.set(x, 0, z);
    o.rotation.y = i < 2 ? Math.atan2(OX - x, OZ - z) : 0;
    S.add(o);
    solids.push({ x, z, r: 0.8 });
    LS.push({ i, x, z, s });
  });
  // treasure chests tucked around the world (each opens once per character)
  const t1 = TF[1];
  [
    [OX - 10, OZ + PZ + 5],
    RMAP(GX + 8, 11),
    RMAP(-GX - 8, -11),
    RMAP(62, -7.2),
    RMAP(-78, 7.2),
    [580, -436],
    [638, -388],
    [-570, -372],
    [-640, -420],
    [t1.x - 9, t1.z + 6],
    ...DUN.map((D) => [D.bx - 12, D.R[1][1] - 8]),
    [650, -440],
    [-652, -366],
    [MWX - 58, MWZ - 22],
    // v12: one hidden in each zone's outer wilds, by the new landmarks
    [600 + 98 - 7, -400 - 78 + 6],
    [-600 - 78 + 15, -400 - 98 + 2],
    [MWX - 96 + 9, MWZ + 60 + 3],
  ].forEach(([x, z], i) => {
    clearAt(x, z, 2.2);
    const o = new T.Group(),
      lid = new T.Group();
    o.add(
      mk(B(1.2, 0.7, 0.8), 0x8a5a2b, 0, 0.35, 0),
      mk(B(1.26, 0.12, 0.86), 0xc9a24a, 0, 0.5, 0),
      mk(B(0.12, 0.72, 0.86), 0xc9a24a, -0.45, 0.36, 0),
      mk(B(0.12, 0.72, 0.86), 0xc9a24a, 0.45, 0.36, 0),
    );
    lid.position.set(0, 0.7, -0.4);
    lid.add(mk(B(1.2, 0.32, 0.8), 0x9a6a3a, 0, 0.16, 0.4), mk(B(1.26, 0.08, 0.86), 0xc9a24a, 0, 0.3, 0.4));
    o.add(lid);
    const lk = mk(B(0.2, 0.24, 0.06), 0xffd27a, 0, 0.56, 0.43, 1);
    lk.material.emissive.setHex(0x8a6010);
    o.add(lk);
    const gl = new T.Sprite(
      new T.SpriteMaterial({
        map: GLT,
        color: 0xffd27a,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    gl.scale.setScalar(3.2);
    gl.position.y = 1;
    o.add(gl);
    o.position.set(x, 0, z);
    o.rotation.y = (i * 2.3) % 6.28;
    S.add(o);
    CHESTS.push({ i, x, z, o, lid, gl, lk });
  });
  // snuffed lamps: something has been putting out Duskwick's lamps. Walk up to one to light it again
  [
    [OX + SW - 0.8, OZ - 48],
    [OX - SW + 0.8, OZ - 112],
    RMAP(102, -RDW + 0.4),
    RMAP(-48, RDW - 0.4),
    RMAP(GX + 6, -8),
    [612, -420],
    [-586, -430],
    [575, -380],
  ].forEach(([x, z], i) => {
    clearAt(x, z, 2);
    add(Cy(0.09, 0.12, 3.4, 6), 0x2a2438, x, 1.7, z);
    add(B(0.5, 0.12, 0.5), 0x2a2438, x, 3.45, z);
    const cg = add(B(0.34, 0.42, 0.34), 0x3a3450, x, 3.2, z);
    const s = new T.Sprite(
      new T.SpriteMaterial({
        map: GLT,
        color: 0x8a5aff,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    s.scale.setScalar(1.6);
    s.position.set(x, 3.25, z);
    S.add(s);
    solids.push({ x, z, r: 0.4 });
    LAMPS.push({ i, x, z, s, cg });
  });
  // ===== v7: dungeon doors and interiors =====
  const SWT = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    x.translate(128, 128);
    const q = x.createRadialGradient(0, 0, 0, 0, 0, 128);
    q.addColorStop(0, "rgba(255,255,255,1)");
    q.addColorStop(0.35, "rgba(255,255,255,.55)");
    q.addColorStop(1, "rgba(255,255,255,.15)");
    x.fillStyle = q;
    x.beginPath();
    x.arc(0, 0, 126, 0, 7);
    x.fill();
    x.strokeStyle = "rgba(20,10,40,.55)";
    x.lineWidth = 9;
    for (let a = 0; a < 4; a++) {
      x.beginPath();
      for (let t = 0; t < 1; t += 0.02) {
        const r = t * 124,
          an = (a * Math.PI) / 2 + t * 7;
        x.lineTo(Math.cos(an) * r, Math.sin(an) * r);
      }
      x.stroke();
    }
    return new T.CanvasTexture(c);
  })();
  const swirl = (x, y, z, ry, col, r, n, to, lock, on) => {
    const m = new T.Mesh(
      new T.CircleGeometry(r, 36),
      new T.MeshBasicMaterial({ map: SWT, color: col, transparent: true, side: T.DoubleSide, depthWrite: false }),
    );
    m.position.set(x, y, z);
    m.rotation.y = ry;
    S.add(m);
    const gl = glow(x, y, z, r * 3);
    gl.material.color.setHex(col);
    PT.push({ x: x + Math.sin(ry) * 0.6, z: z + Math.cos(ry) * 0.6, to, n, lock, on, r: m, g: gl, col, ry, sw: 1 });
    return m;
  };
  DUN.forEach((D, i) => {
    const bx = D.bx,
      bz = D.bz,
      lk = () => {
        const rq = [9, 10, 12][i];
        return !P.done[rq]
          ? 'Sealed. Finish the story quest "' + QS[rq].n + '" first.'
          : P.lvl < D.lv
            ? "The door will not open for you yet. Reach level " + D.lv + "."
            : null;
      },
      lab = D.n.toUpperCase() + "  Lv " + D.lv,
      [dx, dz] = D.door;
    // the door outside
    if (i === 1) {
      swirl(dx, 1.15, dz, 0, D.col, 1.3, D.n + " (dungeon, Lv " + D.lv + ")", [bx, D.ez, Math.PI], lk, () =>
        dunReset(i),
      );
      add(Cy(0.08, 0.1, 2.6, 6), 0x6b4a2b, dx + 4.2, 1.3, dz + 0.6);
      const s2 = sign(lab, 2.8);
      s2.position.set(dx + 4.2, 2.4, dz + 0.6);
      S.add(s2);
      solids.push({ x: dx + 4.2, z: dz + 0.6, r: 0.35 });
    } else {
      const ry = i === 0 ? 0 : Math.atan2(-34, 26);
      arch(dx, dz, ry, D.col);
      swirl(dx, 2.4, dz, ry, D.col, 2.05, D.n + " (dungeon, Lv " + D.lv + ")", [bx, D.ez, Math.PI], lk, () =>
        dunReset(i),
      );
      const ox = Math.cos(ry) * 3.8,
        oz = -Math.sin(ry) * 3.8;
      add(Cy(0.08, 0.1, 2.6, 6), 0x6b4a2b, dx + ox + Math.sin(ry) * 0.8, 1.3, dz + oz + Math.cos(ry) * 0.8);
      const s2 = sign(lab, 2.8);
      s2.position.set(dx + ox + Math.sin(ry) * 0.8, 2.4, dz + oz + Math.cos(ry) * 0.8);
      s2.rotation.y = ry;
      S.add(s2);
      solids.push({ x: dx + ox + Math.sin(ry) * 0.8, z: dz + oz + Math.cos(ry) * 0.8, r: 0.35 });
    }
    // interior: dark ground, three rooms, two corridors, pillars with coloured torches
    const gnd = new T.Mesh(new T.PlaneGeometry(110, 180), new T.MeshBasicMaterial({ color: 0x07050c }));
    gnd.rotation.x = -Math.PI / 2;
    gnd.position.set(bx, -0.45, bz - 52);
    S.add(gnd);
    const fm = new T.MeshLambertMaterial({ map: cobble(5), color: D.floor }),
      // v47 clean look: walls in big rounded stones (were the small floor cobble)
      wst = (u, v) => {
        const t = ptex("brick").clone();
        t.needsUpdate = true;
        t.repeat.set(u, v);
        return t;
      },
      wm = new T.MeshLambertMaterial({ map: wst(8, 2), color: D.wall, side: T.BackSide }),
      cw = new T.MeshLambertMaterial({ map: wst(4, 2), color: D.wall });
    D.R.forEach(([x, z, r], k) => {
      const fl = new T.Mesh(Cy(r + 0.7, r + 0.7, 0.4, 40), fm);
      fl.position.set(x, -0.15, z);
      S.add(fl);
      const gh = Math.asin(D.cw / (r + 0.6)),
        segs =
          k === 0
            ? [[Math.PI + gh, 2 * Math.PI - 2 * gh]]
            : k === 2
              ? [[gh, 2 * Math.PI - 2 * gh]]
              : [
                  [gh, Math.PI - 2 * gh],
                  [Math.PI + gh, Math.PI - 2 * gh],
                ];
      segs.forEach(([a, l]) => {
        const w = new T.Mesh(new T.CylinderGeometry(r + 0.6, r + 0.6, 8, 40, 1, true, a, l), wm);
        w.position.set(x, 4, z);
        S.add(w);
      });
      for (let p = 0; p < 8; p++) {
        const a = ((p + 0.5) / 8) * 6.283;
        if (Math.abs(Math.cos(a)) > 0.8) continue;
        const px = x + Math.sin(a) * (r - 0.3),
          pz = z + Math.cos(a) * (r - 0.3);
        add(Cy(0.55, 0.7, 6.5, 8), D.wall, px, 3.25, pz);
        add(B(0.3, 0.4, 0.3), 0x2a2438, px - Math.sin(a) * 0.65, 4.6, pz - Math.cos(a) * 0.65);
        glow(px - Math.sin(a) * 0.7, 5, pz - Math.cos(a) * 0.7, 2.4).material.color.setHex(D.col);
        solids.push({ x: px, z: pz, r: 0.8 });
        cb(px, pz, 0.7, 6.5);
      }
      const rg = new T.Mesh(
        new T.RingGeometry(r * 0.5, r * 0.5 + 0.35, 48),
        new T.MeshBasicMaterial({
          color: D.col,
          transparent: true,
          opacity: 0.4,
          side: T.DoubleSide,
          depthWrite: false,
        }),
      );
      rg.rotation.x = -Math.PI / 2;
      rg.position.set(x, 0.08, z);
      S.add(rg);
      // themed dressing along the walls (baked into one mesh per material)
      const o = new T.Group();
      o.position.set(x, 0, z);
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * 6.283 + 0.3;
        if (Math.abs(Math.cos(a)) > 0.75) continue;
        const px = Math.sin(a) * (r - 1.8),
          pz = Math.cos(a) * (r - 1.8),
          q = (g2, c, X, Y, Z, ry2) => {
            const m = mk(g2, c, px + X, Y, pz + Z);
            m.rotation.y = ry2 || 0;
            o.add(m);
            return m;
          };
        if (i === 0) {
          if (p % 2) {
            q(B(1.1, 0.7, 2.2), 0x7a7390, 0, 0.35, 0, a);
            q(B(1.25, 0.16, 2.35), 0x5a5470, 0, 0.78, 0, a);
            q(new T.IcosahedronGeometry(0.32, 0), 0x3a8a4a, 0.2, 0.9, 0.3);
          } else {
            [
              [0, 0.25, 0],
              [0.35, 0.2, 0.2],
              [-0.3, 0.2, 0.15],
              [0, 0.55, 0.1],
            ].forEach(([X, Y, Z]) => q(Sp(0.24, 8), 0xe8dcc0, X, Y, Z));
            q(new T.IcosahedronGeometry(0.55, 0), 0x2e5f48, 0.1, 0.1, -0.5);
          }
        } else if (i === 1) {
          [
            [0, 0, 1.8],
            [0.4, 0.2, 1.2],
            [-0.35, 0.1, 1.4],
            [0.1, -0.35, 1],
          ].forEach(([X, Z, h], j) => {
            const m = q(new T.OctahedronGeometry(0.45, 0), 0x9fe0ff, X, h * 0.55, Z, j);
            m.scale.set(0.6, h, 0.6);
          });
          q(Sp(1, 8), 0xb4c4da, 0, -0.3, 0).scale.set(1.2, 0.5, 1);
        } else {
          if (p % 2) {
            q(Sp(1.1, 10), 0x3a2a2a, 0, 0, 0).scale.set(1, 0.8, 1);
            q(B(0.7, 0.6, 0.3), 0xff7a2a, -Math.sin(a) * 0.95, 0.35, -Math.cos(a) * 0.95, a);
          } else {
            q(Cy(0.9, 0.9, 0.1, 16), 0xff6a1a, 0, 0.06, 0);
            q(Cy(1.05, 1.05, 0.14, 16), 0x2a2024, 0, 0.03, 0);
          }
        }
        solids.push({ x: x + px, z: z + pz, r: 1.2 });
      }
      o.traverse((m) => {
        if (
          (m.isMesh && m.material.color.getHex() === 0xff7a2a) ||
          (m.isMesh && m.material.color.getHex() === 0xff6a1a)
        )
          m.material = M(m.material.color.getHex());
      });
      S.add(bake(o));
      if (i === 2)
        for (let p = 0; p < 10; p++) {
          const a = (p / 10) * 6.283 + 0.3;
          if (Math.abs(Math.cos(a)) > 0.75) continue;
          glow(x + Math.sin(a) * (r - 1.8), 0.8, z + Math.cos(a) * (r - 1.8), 2.4).material.color.setHex(0xff7a3a);
        }
      if (i === 1)
        for (let p = 0; p < 10; p++) {
          const a = (p / 10) * 6.283 + 0.3;
          if (Math.abs(Math.cos(a)) > 0.75) continue;
          glow(x + Math.sin(a) * (r - 1.8), 1, z + Math.cos(a) * (r - 1.8), 2.2).material.color.setHex(0x8ad0ff);
        }
    });
    D.C.forEach(([z1, z2]) => {
      const L = z1 - z2 + 1.4,
        zc = (z1 + z2) / 2,
        H = D.cw,
        cf = new T.Mesh(B(H * 2 + 0.2, 0.4, L), fm);
      cf.position.set(bx, -0.15, zc);
      S.add(cf);
      [-1, 1].forEach((s) => {
        const w = new T.Mesh(new T.PlaneGeometry(L, 6), cw);
        w.position.set(bx + s * (H + 0.05), 3, zc);
        w.rotation.y = (-s * Math.PI) / 2;
        S.add(w);
        for (let zz = z2; zz <= z1; zz += 2) cb(bx + s * (H + 0.6), zz, 0.7, 6);
        for (let zz = z2 + 2.5; zz < z1 - 1; zz += 5) {
          add(B(0.2, 0.5, 0.2), 0x2a2438, bx + s * (H - 0.1), 3, zz);
          glow(bx + s * (H - 0.3), 3.3, zz, 1.8).material.color.setHex(D.col);
        }
      });
      [z1, z2].forEach((zz) => add(B(H * 2 + 0.8, 0.8, 0.9), D.wall, bx, 5.7, zz));
    });
    // the gloom ward over the boss hall: it fades once every other foe inside is down
    D.seal = new T.Mesh(
      new T.PlaneGeometry(D.cw * 2, 5.6),
      new T.MeshBasicMaterial({
        color: D.col,
        transparent: true,
        opacity: 0.5,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
        depthWrite: false,
      }),
    );
    D.seal.position.set(bx, 2.8, D.C[1][0] - 1.6);
    S.add(D.seal);
    swirl(bx, 2.2, bz + D.R[0][2] - 0.6, Math.PI, D.col, 1.6, "Leave the " + D.n, D.out.slice());
    swirl(bx, 2.2, D.R[2][1] - D.R[2][2] + 1, 0, D.col, 1.8, "Leave the " + D.n, D.out.slice(), () =>
      dunBoss(i) ? null : "Defeat the " + D.boss.nm + " to open the way out.",
    );
    // dungeon foes: respawn every time you come in through the door; the boss waits in the far hall with two minions
    const df = (kind, t, x, z, big, hc, ex) => {
      const o = mkFoe(kind, t, big, hc);
      o.position.set(x, 0, z);
      S.add(o);
      const f = Object.assign(
        { o, t, kind, big, hc, hx: x, hz: z, w: null, wt: 0, dead: 0, rt: Infinity, tw: 0, dun: i },
        ex || {},
      );
      foes.push(f);
      return f;
    };
    // v22: spread out for the bigger rooms; the first room's pair sits back toward its far side, away from the door
    D.f.forEach(([k, kind, t, ddx, ddz, big, hc]) =>
      df(kind, t, D.R[k][0] + ddx * 1.45, D.R[k][1] + ddz * 1.45 - (k ? 0 : 3), big, hc),
    );
    const B0 = D.boss,
      bf = df(B0.kind, B0.mt || B0.t, bx, D.R[2][1] - 6, B0.big, B0.hc, {
        dboss: 1,
        nm: B0.nm,
        bsp: [Object.assign({ boss: 1, dboss: 1, di: i }, B0), Object.assign({}, D.mins), Object.assign({}, D.mins)],
      });
    bf.o.scale.multiplyScalar(B0.bsc || 1.3);
  });
  // ===== v7: safe zones read clearly: soft paving, a green border and little ward-lantern posts (with gaps to walk through) =====
  SAFEC.forEach(([x, z, r], k) => {
    if (k >= 4) return;
    const pv = new T.Mesh(
      new T.CircleGeometry(r, 48),
      new T.MeshLambertMaterial({
        map: cobble(Math.round(r / 2)),
        color: k === 0 ? 0xc8d4e8 : k === 1 ? 0xc8a898 : 0xd8d0b8,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    pv.rotation.x = -Math.PI / 2;
    pv.position.set(x, 0.04, z);
    S.add(pv);
  });
  {
    const WP = [],
      WC = [],
      WG = [];
    SAFEC.forEach(([x, z, r], k) => {
      if (k >= 4) return;
      const n = Math.round((6.283 * r) / 4.2);
      for (let j = 0; j < n; j++) {
        const a = (j / n) * 6.283,
          px = x + Math.cos(a) * r,
          pz = z + Math.sin(a) * r;
        if (
          solids.some((o) => Math.hypot(px - o.x, pz - o.z) < o.r + 1) ||
          PT.some((q) => Math.hypot(px - q.x, pz - q.z) < 3.5) ||
          NPCS.some((q) => Math.hypot(px - q.x, pz - q.z) < 2.5)
        )
          continue;
        if (k === 3 && Math.abs(pz - OZ - RDS[0].gz) < RDW + 1.5) continue;
        clearAt(px, pz, 1);
        WP.push([px, 0.6, pz, 1]);
        WC.push([px, 1.35, pz, 1, a]);
        WG.push(px, 1.45, pz);
        solids.push({ x: px, z: pz, r: 0.3 });
      }
    });
    inst(Cy(0.09, 0.12, 1.2, 6), 0x2a2438, WP);
    inst(new T.OctahedronGeometry(0.16), 0x7dffb0, WC, 0x2a9a5a);
    const g2 = new T.BufferGeometry();
    g2.setAttribute("position", new T.Float32BufferAttribute(WG, 3));
    S.add(
      new T.Points(
        g2,
        new T.PointsMaterial({
          size: 1.1,
          map: GLT,
          color: 0x7dffb0,
          transparent: true,
          depthWrite: false,
          blending: T.AdditiveBlending,
        }),
      ),
    );
  }
  // ===== v7: sky lanterns drifting over the square, giant glowmushrooms around Wispwood, obsidian shards around Cinder Hollow =====
  for (let k = 0; k < 16; k++) {
    const a = k * 2.4,
      r = 5 + ((k * 7) % 13),
      o = new T.Group(),
      b = mk(Cy(0.32, 0.26, 0.55, 8), 0xffb050, 0, 0, 0, 1);
    b.material.emissive.setHex(0xcc6a10);
    o.add(b, mk(Cy(0.34, 0.34, 0.06, 8), 0x6a3a1a, 0, 0.3, 0, 1));
    glow(0, 0, 0, 2.2, o).material.color.setHex(0xffc070);
    o.position.set(OX + Math.cos(a) * r, 10 + ((k * 5) % 7), OZ + Math.sin(a) * r);
    S.add(o);
    SKYL.push({ o, y: o.position.y, ph: k });
  }
  {
    const freeAt = (x, z, r) =>
      !solids.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + r) && !PT.some((q) => Math.hypot(x - q.x, z - q.z) < 4);
    [
      [1, 0x6affe0, 0x1a8a7a],
      [-1, 0xff7a3a, 0x8a2a10],
    ].forEach(([sd, c1, e1]) => {
      const R = RDS[sd > 0 ? 0 : 1],
        gx = OX + R.gx,
        gz = OZ + R.gz;
      for (let k = 0; k < 11; k++) {
        const a = (k / 11) * 6.283 + 0.2,
          d = 17.5 + (k % 3) * 1.4,
          x = gx + Math.cos(a) * d,
          z = gz + Math.sin(a) * d;
        if (Math.abs(z - gz) < RDW + 2.5 || !freeAt(x, z, 1.6)) continue;
        clearAt(x, z, 2.2);
        const s2 = 0.8 + (k % 3) * 0.25;
        let ob;
        if (sd > 0) {
          const st = add(Cy(0.25 * s2, 0.35 * s2, 2.4 * s2, 8), 0xe8e0d0, x, 1.2 * s2, z);
          const cp = add(new T.SphereGeometry(1.3 * s2, 14, 8, 0, 6.283, 0, 1.5), c1, x, 2.3 * s2, z);
          cp.material = M(c1, 1);
          cp.material.emissive.setHex(e1);
          ob = [st, cp, glow(x, 2.7 * s2, z, 3.5 * s2)];
          ob[2].material.color.setHex(c1);
        } else {
          const sh = add(new T.OctahedronGeometry(1, 0), 0x1e1620, x, 1.4 * s2, z);
          sh.scale.set(0.6 * s2, 1.8 * s2, 0.6 * s2);
          sh.rotation.y = a;
          const cr = add(new T.OctahedronGeometry(1, 0), c1, x, 1.4 * s2, z);
          cr.material = M(c1, 1);
          cr.material.emissive.setHex(e1);
          cr.scale.set(0.28 * s2, 1.6 * s2, 0.28 * s2);
          cr.rotation.y = a;
          ob = [sh, cr, glow(x, 1.4 * s2, z, 2.6 * s2)];
          ob[2].material.color.setHex(c1);
        }
        solids.push({ x, z, r: 0.8 * s2 });
        cb(x, z, 1 * s2, 3 * s2);
        occReg(x, z, 1.3 * s2, 3 * s2, ob, 0, CB[CB.length - 1]);
      }
    });
  }
  // v14 trails: clear trees / pines / spires / scatter off every trail before the instanced scenery is built
  const trZone = (t, x, z) =>
    [t.z0, t.z1].some((c) => c && Math.hypot(x - c[0], z - c[1]) < ZR + 2) || zoneAt(x, z) === "marsh";
  TRL.forEach((t) => {
    for (let s = 4; s <= t.L; s += 2) {
      const [lx, lz] = rdAt(t, s),
        x = OX + lx,
        z = OZ + lz;
      clearAt(x, z, trZone(t, x, z) ? 6 : 11);
    }
  });
  // zone links: clear the road, its sidewalks and verges. v16: named streets are their own places; in the village only
  // the short walk out to each street's arch is cleared.
  ZRD.forEach((t) => {
    if (t.n) {
      const c = ZCEN[t.zk];
      for (let r = ZVR[t.zk] - 4; r <= ZVR[t.zk] + ZSB + 3; r += 2)
        clearAt(c[0] + t.mo[0] * r, c[1] + t.mo[1] * r, ZSW + 3);
      return;
    }
    for (let s = 1; s <= t.L; s += 2) {
      const [lx, lz] = rdAt(t, s);
      clearAt(OX + lx, OZ + lz, RDW + 2.5);
    }
  });
  // v18: the zone villages are open hubs: no trees inside their new rim wall (built in __trails; the trees beyond stay)
  Object.keys(ZCEN).forEach((zk) => clearAt(ZCEN[zk][0], ZCEN[zk][1], ZVR[zk] + ZSB + 2, 1));
  flushAll();
  // v36 editor kit (13-editor.js): the detailed builders, all at the origin facing +z. They still call S.add / push
  // solids etc.; the editor runs them inside a capture that collects the pieces into its own group and rolls back the
  // side effects (and the seeded rnd), so nothing here may be called outside that capture after load.
  window.__edKit = Object.assign(window.__edKit || {}, {
    house: (op) => house(0, 0, 0, op.i | 0, op),
    shopExt: (t, w, r) => {
      const o = new T.Group();
      o.add(shopExt(t, w, r));
      o.scale.setScalar(1.45);
      S.add(o);
    },
    stall: (col, type, label) => stall(0, 0, 0, col, type, label),
    tent: (col, label) => tent(0, 0, 0, col, label),
    shrine: (col) => shrine(0, 0, 0, col),
    arch: (col) => arch(0, 0, 0, col),
    lampost: () => lampost(0, 0),
    signpost: (a, b) => signpost(0, 0, 0, a, b),
    sign: (t, w) => {
      const s = sign(t, w || 2.6);
      s.position.y = 1.2;
      S.add(s);
    },
    barrel: () => barrel(0, 0),
    crate: () => crate(0, 0, 0),
    bench: () => bench(0, 0, 0),
  });
  window.__w1 = S.children.length; // end of the world's own scene children (zone loading, 11-explore.js)
  // v14 trails: built from the end of 13-editor.js, AFTER the editor's BASE snapshot (they add scene children)
  window.__trails = () => {
    const at = (t, s) => {
      const [lx, lz, hx, hz] = rdAt(t, s);
      return [OX + lx, OZ + lz, hx, hz];
    };
    window.__t0 = S.children.length;
    // 1) anything small still standing on a trail or zone road (drowned trees, posts, rocks) is hidden and stops blocking
    // v15: the zone streets are full width now, with a cul-de-sac at the end
    // (the street itself only: the cul-de-sacs keep the landmark stones and pillars around their rims)
    // v16: named streets only clear the short walk out to their arch in the village
    const onZr = (x, z) =>
      ZRD.some((t) => {
        if (t.n) return zsStub(t, x, z, 1.5);
        const q = rdNear(t, x - OX, z - OZ);
        return !!q && q.d <= RDW + 0.5;
      });
    for (let i = solids.length - 1; i >= 0; i--) {
      const o = solids[i],
        h = o.r <= 1.6 && trOn(o.x, o.z, TRW - 0.5);
      if ((h && h.s > 5 && h.s < h.t.L - 1) || (o.r <= 1.7 && onZr(o.x, o.z))) solids.splice(i, 1);
    }
    const v = new T.Vector3(),
      mx = new T.Matrix4();
    S.children.slice().forEach((m) => {
      if (m.isInstancedMesh) {
        let ch = 0;
        for (let k = 0; k < m.count; k++) {
          m.getMatrixAt(k, mx);
          v.setFromMatrixPosition(mx);
          const h = trOn(v.x, v.z, TRL.some((t) => trZone(t, v.x, v.z)) ? 5 : TRW + 1.5);
          if ((h && h.s > 5) || onZr(v.x, v.z, 3.2)) {
            m.setMatrixAt(k, ZM);
            ch = 1;
          }
        }
        if (ch) m.instanceMatrix.needsUpdate = true;
      } else if (m.isMesh && m.geometry) {
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
        const r = m.geometry.boundingSphere.radius * Math.max(m.scale.x, m.scale.y, m.scale.z);
        if (r > 3.5 || m.position.y > 9) return;
        const px = m.position.x,
          pz = m.position.z,
          h = trOn(px, pz, TRL.some((t) => trZone(t, px, pz)) ? 4.5 : TRW + 1.5);
        if (h && h.s > 5) m.visible = false;
        // on a zone road only thin trunks / reeds / posts go (never a pool, sign or wall)
        else if (
          m.geometry.type === "CylinderGeometry" &&
          m.geometry.parameters.radiusTop <= 0.5 &&
          onZr(m.position.x, m.position.z, 3.2)
        )
          m.visible = false;
      }
    });
    // 2) ground: a neutral speckle texture tinted by vertex colour, blending one zone's ground into the next
    const spk = tex((x) => {
      x.fillStyle = "#c8c8c8";
      x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 600; i++) {
        x.fillStyle = ["#a8a8a8", "#e2e2e2", "#b8b8b8", "#d6d6d6"][i % 4];
        x.fillRect((i * 37) % 128, (i * 71 + (i >> 3)) % 128, 2 + (i % 3), 2);
      }
    }, 1);
    const cA = new T.Color(),
      cB = new T.Color(),
      cc = new T.Color();
    const groundMat = (rep) => {
      const t = spk.clone();
      t.needsUpdate = true;
      t.repeat.set(rep, rep);
      return new T.MeshLambertMaterial({ map: t, vertexColors: true });
    };
    // seam fillers: the empty strip between the town's grass and the Frostfen snow / Cinderwaste ash planes
    [
      [338, 392, 0x2f5f4c, 0x9fb0c8],
      [-392, -338, 0x3a2a2c, 0x2f5f4c],
    ].forEach(([x0, x1, c0, c1]) => {
      const n = 12,
        pg = new T.PlaneGeometry(x1 - x0, 420, n, 1),
        p = pg.attributes.position,
        col = [];
      cA.setHex(c0);
      cB.setHex(c1);
      for (let k = 0; k < p.count; k++) {
        const f = (p.getX(k) + (x1 - x0) / 2) / (x1 - x0);
        cc.copy(cA).lerp(cB, f).multiplyScalar(1.2);
        col.push(cc.r, cc.g, cc.b);
      }
      pg.setAttribute("color", new T.Float32BufferAttribute(col, 3));
      const uv = pg.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * ((x1 - x0) / 8), uv.getY(k) * (420 / 8));
      const m = new T.Mesh(pg, groundMat(1));
      m.rotation.x = -Math.PI / 2;
      m.position.set((x0 + x1) / 2, -0.37, -400);
      S.add(m);
    });
    // decor streams (fixed seed, so every player sees the same trees)
    const TR = (() => {
        let s = 4243;
        return () => (s = (s * 16807) % 2147483647) / 2147483647;
      })(),
      tr = (a, b) => a + TR() * (b - a);
    const KIND = { hub: "tree", frost: "pine", ember: "spire", marsh: "drown" },
      kinds = { tree: [], pine: [], spire: [], drown: [] },
      lerpHex = (a, b, f) => cA.setHex(a).lerp(cB.setHex(b), f).getHex(),
      cm = lay({ material: new T.MeshLambertMaterial({ color: 0x4a4560 }) }, 6).material;
    TRL.forEach((t, ti) => {
      if (t.sB == null) trSpan(t); // where it leaves / enters a zone (11-explore.js)
      const ka = KIND[t.ta] || "tree",
        kb = KIND[t.tb] || "pine",
        // v14: built exactly like the town's roads it continues: dirt +-5, flagstone sidewalks out to RDW, curbs.
        // The colours drift from the town road's tint to the far zone's over six stretches.
        dA = ti === 1 ? 0xf0d0c0 : 0xd8dcf0,
        dB = ti === 2 ? 0xb0a080 : dA,
        wA = ti === 1 ? 0xecd0c0 : 0xd0d8ec,
        wB = ti === 2 ? 0xa8a088 : wA,
        N = 6;
      for (let k = 0; k < N; k++) {
        const s0 = 1.2 + ((t.L - 1.2) * k) / N,
          s1 = 1.2 + ((t.L - 1.2) * (k + 1)) / N,
          f = (k + 0.5) / N,
          rd = dirt(1),
          sw = fsw.clone();
        rd.repeat.set(1, 1);
        sw.needsUpdate = true;
        sw.repeat.set(1, 1);
        lay(
          rdRibbon(t, -5, 5, 0.012, new T.MeshLambertMaterial({ map: rd, color: lerpHex(dA, dB, f) }), 10, s0, s1),
          3,
        );
        const sm = new T.MeshLambertMaterial({ map: sw, color: lerpHex(wA, wB, f) });
        lay(rdRibbon(t, 5, RDW, 0.07, sm, 3.6, s0, s1), 5);
        rdRibbon(t, -RDW, -5, 0.07, sm, 3.6, s0, s1);
      }
      rdRibbon(t, 4.82, 5.18, 0.1, cm, 1, 1.2);
      rdRibbon(t, -5.18, -4.82, 0.1, cm, 1, 1.2);
      // lamp posts like the town roads: every 13, alternating sides just off the sidewalk (not inside the zones)
      for (let s = 9, k = 0; s < t.L - 6; s += 13, k++) {
        const [x, z, hx, hz] = at(t, s),
          o = k % 2 ? RDW + 0.4 : -RDW - 0.4;
        if (!trZone(t, x, z)) lampost(x - hz * o, z + hx * o);
      }
      // trees in tidy rows along both verges; the kind changes from the near land's to the far land's halfway
      // between the zones (with a short ragged edge so it isn't a ruler line)
      for (let s = 2; s < t.L; s += tr(6, 8.5)) {
        const [x0, z0, hx, hz] = at(t, s),
          kz = Math.max(0, Math.min(1, (s - t.sA) / Math.max(1, t.sB - t.sA)));
        [-1, 1].forEach((sd) =>
          [tr(12.5, 15.5), TR() < 0.55 ? tr(20, 27) : 0].forEach((ao) => {
            if (!ao) return;
            const o = sd * ao,
              x = x0 - hz * o,
              z = z0 + hx * o;
            if (okp(x, z) || okp(x + 2, z) || okp(x - 2, z) || okp(x, z + 2) || okp(x, z - 2)) return;
            if (TRL.some((u) => u !== t && trOn(x, z, 12))) return;
            if ([t.z0, t.z1].some((c) => c && Math.hypot(x - c[0], z - c[1]) < ZR + 4)) return;
            if (Math.hypot(x - MWX, z - MWZ) < ZR + 4) return;
            kinds[kz + tr(-0.1, 0.1) < 0.5 ? ka : kb].push([x, z, tr(1, 1.45)]);
          }),
        );
      }
      // signposts at both ends, facing the walker
      [
        [10, t.n.toUpperCase(), 0],
        [t.L - 10, t.n.toUpperCase(), Math.PI],
      ].forEach(([s, txt, flip]) => {
        const [x, z, hx, hz] = at(t, s),
          px = x - hz * (RDW + 1.2),
          pz = z + hx * (RDW + 1.2),
          sg = sign(txt, 3.2);
        sg.position.set(px, 3.2, pz);
        sg.rotation.y = Math.atan2(-hx, -hz) + flip;
        S.add(sg);
        add(B(0.15, 3, 0.15), 0x6b4a2b, px, 1.5, pz);
        solids.push({ x: px, z: pz, r: 0.3 });
      });
    });
    // v16: the landmark at a zone street's dead end (plaza centre = (t.X, -ZSL), north = -z). Pieces are baked into one
    // child; anything standing inside the walkable plaza gets a solid. No randomness.
    const zsLandmark = (t, C2) => {
      const X = t.X,
        EZ = -ZSL,
        o = new T.Group(),
        g = (geo, c, px, py, pz, ry, rx, rz) => {
          const m = mk(geo, c, px, py, pz);
          m.rotation.set(rx || 0, ry || 0, rz || 0);
          o.add(m);
          return m;
        },
        em = (geo, c, px, py, pz, e, ry, rx, rz) => {
          const m = mk(geo, c, px, py, pz, 1);
          m.material.emissive.setHex(e == null ? c : e);
          m.rotation.set(rx || 0, ry || 0, rz || 0);
          o.add(m);
          return m;
        },
        sol = (lx, lz, r) => solids.push({ x: X + lx, z: EZ + lz, r }),
        gl = (lx, y, lz, s, c) => {
          const s2 = glow(X + lx, y, EZ + lz, s);
          if (c != null) s2.material.color.setHex(c);
          return s2;
        };
      switch (t.lm) {
        case "den": {
          // the Rimefang wolves' den: a snow-capped rock mound with a dark cave mouth, icicles and bone totems
          [
            [-11, -31, 8],
            [0, -37, 11],
            [11, -31, 8],
            [-6, -26, 5.5],
            [6, -26, 5.5],
            [-18, -36, 6],
            [18, -36, 6],
          ].forEach(([x, z, r], k) => {
            g(new T.DodecahedronGeometry(r), 0x6a7890, x, r * 0.45, z, k * 0.7);
            g(Sp(r * 0.7, 10), 0xf2f6ff, x, r * 0.95, z, 0, 0, 0).scale.set(1, 0.35, 1);
          });
          g(new T.CircleGeometry(4.6, 20, 0, Math.PI), 0x07060c, 0, 0, -21.4);
          g(B(9, 5, 4), 0x07060c, 0, 2.3, -23.6);
          for (let k = 0; k < 9; k++)
            g(Cn(0.22, 0.9 + (k % 3) * 0.4, 5), 0xcfefff, -3.6 + k * 0.9, 4.4, -21.1, 0, Math.PI);
          [-0.8, 0.8].forEach((x) => {
            em(Sp(0.16, 6), 0xff3a2a, x, 2, -22.6);
          });
          gl(0, 2, -22.4, 3, 0xff4a3a);
          [-1, 1].forEach((s) => {
            g(Cy(0.3, 0.35, 5, 6), 0x6b4a2b, s * 7, 2.5, -21.5);
            g(B(1.1, 0.9, 1.5), 0xe8e0d0, s * 7, 5.3, -21.3);
            [-0.3, 0.3].forEach((dx) => em(Sp(0.12, 6), 0x8ad0ff, s * 7 + dx, 5.4, -20.5));
          });
          [
            [-3, -14, 0.4],
            [2.5, -15.5, 1.3],
            [-6, -11, 2.2],
          ].forEach(([x, z, r]) => g(Cy(0.12, 0.12, 1.4, 5), 0xe8e0d0, x, 0.14, z, r, 0, Math.PI / 2));
          break;
        }
        case "lake": {
          // Frozen Lake Way: a frozen pond in the plaza with ice-fishing holes, the lake itself beyond, and a fishing hut
          const ice = em(Cy(12, 12, 0.06, 40), 0xbfe4f8, 0, 0.09, 0, 0x1a3a5a);
          lay(ice, 7);
          // v28: the fishing holes sit at the back of the pond, clear of the road boss's battlefield
          [
            [-5, -6],
            [4, -10],
            [-2, -14],
          ].forEach(([x, z], k) => {
            g(Cy(0.7, 0.7, 0.07, 14), 0x10202e, x, 0.11, z);
            g(B(0.6, 0.5, 0.6), 0x6b4a2b, x + 1.2, 0.25, z + 0.3);
            g(Cy(0.03, 0.03, 2.2, 4), 0x3a2010, x + 0.6, 0.9, z, k, 0, 0.9);
            sol(x + 1.2, z + 0.3, 0.5);
          });
          em(Cy(30, 30, 0.06, 48), 0xa8d8f0, 0, 0.04, -50, 0x10283a);
          [
            [-14, -40, 2],
            [12, -46, 3],
            [-4, -58, 2.5],
            [20, -36, 1.6],
          ].forEach(([x, z, r], k) => g(new T.OctahedronGeometry(r), 0xdff4ff, x, r * 0.4, z, k, 0.3));
          // the hut on the shore
          g(B(6, 4, 5), 0x7a5a3a, 0, 2, -28);
          g(B(6.6, 0.4, 5.6), 0xf2f6ff, 0, 5.3, -28, 0, 0, 0.35).position.x = -1.5;
          g(B(6.6, 0.4, 5.6), 0xf2f6ff, 0, 5.3, -28, 0, 0, -0.35).position.x = 1.5;
          g(B(1.3, 2.3, 0.1), 0x3a2010, 0, 1.15, -25.45);
          em(B(1, 0.8, 0.1), 0xffd98a, -2, 2.4, -25.45);
          gl(-2, 2.4, -25, 2.2);
          g(Cy(0.3, 0.3, 2.2, 6), 0x8a849c, 2, 6, -29);
          break;
        }
        case "stones": {
          // Rimestone Way: a ring of rune-cut standing stones round the plaza and a crystal on an altar in the middle
          for (let k = 0; k < 11; k++) {
            const a = Math.PI / 2 + 0.55 + (k / 10) * (6.283 - 1.1),
              x = Math.cos(a) * 16.5,
              z = Math.sin(a) * 16.5,
              h = 5 + ((k * 5) % 3) * 1.1,
              ry = Math.atan2(-x, -z);
            g(B(1.8, h, 1.1), 0x8a94a8, x, h / 2, z, ry);
            em(
              B(0.3, h * 0.6, 0.05),
              0x6fd3ff,
              x - Math.sin(ry) * -0.58,
              h * 0.5,
              z - Math.cos(ry) * -0.58,
              0x2a8ad8,
              ry,
            );
            g(B(2.1, 0.4, 1.4), 0xf2f6ff, x, h + 0.2, z, ry);
            sol(x, z, 1.3);
          }
          // v28: the altar stands at the back of the plaza (was the middle, where the road boss fight is)
          const AZ2 = -12.5;
          g(Cy(2.2, 2.6, 1.1, 12), 0x6a7890, 0, 0.55, AZ2);
          g(Cy(1.4, 1.6, 0.5, 12), 0x8a94a8, 0, 1.35, AZ2);
          em(new T.OctahedronGeometry(1.1), 0x9fe8ff, 0, 3.1, AZ2, 0x2a8ad8).scale.set(1, 1.6, 1);
          gl(0, 3.1, AZ2, 7, 0x8ad0ff);
          sol(0, AZ2, 2.7);
          break;
        }
        case "camp": {
          // Sled Camp Lane: tents round a campfire, sleds and crates
          [-3.6, -0.8, 0.8, 3.6].forEach((a0, k) => {
            const a = -Math.PI / 2 + a0 * 0.42,
              x = Math.cos(a) * 14.5,
              z = Math.sin(a) * 14.5;
            g(Cn(2.8, 3.8, 6), [0x8a3a2a, 0x2f6aa8, 0x7a6a3a, 0x3a6a4a][k], x, 1.9, z, k);
            g(B(0.9, 1.6, 0.1), 0x1a1420, x * 0.83, 0.8, z * 0.83, Math.atan2(-x, -z));
            sol(x, z, 2.8);
          });
          // v28: the campfire sits toward the back of the plaza and the sleds out wide, clear of the road boss fight
          const FZ = -11;
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * 6.283;
            g(new T.DodecahedronGeometry(0.4), 0x5a5470, Math.cos(a) * 1.4, 0.25, FZ + Math.sin(a) * 1.4, k);
          }
          [0, 1.2, 2.4].forEach((r) => g(Cy(0.18, 0.2, 2, 6), 0x5a3a1a, 0, 0.3, FZ, r, 0, Math.PI / 2));
          em(Cn(0.7, 1.6, 7), 0xff9a3a, 0, 0.9, FZ, 0xff6a0a);
          gl(0, 1.3, FZ, 6, 0xffa050);
          sol(0, FZ, 1.9);
          [
            [-13, 7, 0.4],
            [13, 6, -0.5],
          ].forEach(([x, z, r]) => {
            g(B(1.6, 0.6, 3.2), 0x8a5a2b, x, 0.6, z, r);
            [-0.7, 0.7].forEach((dx) =>
              g(B(0.12, 0.12, 3.6), 0x2a2438, x + Math.cos(r) * dx, 0.12, z - Math.sin(r) * dx, r),
            );
            sol(x, z, 1.7);
          });
          [
            [-15, -6],
            [15, -7],
            [14, -4.6],
          ].forEach(([x, z], k) => {
            g(B(1, 1, 1), 0x8a5a2b, x, 0.5, z, k * 0.5);
            sol(x, z, 0.8);
          });
          break;
        }
        case "crater": {
          // Crater Climb: a smoking volcano behind the plaza, lava down its face, a lava pool at the top of the plaza
          g(Cy(10, 34, 26, 20), 0x3a2a2a, 0, 13, -56);
          em(Cy(9.6, 9.6, 0.4, 20), 0xff6a1a, 0, 26.1, -56, 0xff4a0a);
          gl(0, 29, -56, 34, 0xff7a3a);
          [-0.35, 0, 0.4].forEach((a, k) => {
            const m = em(B(1.4, 0.3, 35.5), 0xff7a2a, Math.sin(a) * 22, 13.4, -34 - (k === 1 ? 0 : 1.5), 0xff4a0a);
            m.rotation.set(Math.atan2(26, 24), a, 0, "YXZ");
          });
          em(Cy(4, 4, 0.08, 20), 0xff6a1a, 0, 0.1, -12, 0xff4a0a);
          gl(0, 0.8, -12, 9, 0xff7a3a);
          for (let k = 0; k < 10; k++) {
            const a = (k / 10) * 6.283;
            g(new T.DodecahedronGeometry(0.8), 0x2a2024, Math.cos(a) * 4.6, 0.4, -12 + Math.sin(a) * 4.6, k);
          }
          sol(0, -12, 5);
          break;
        }
        case "gate": {
          // Obsidian Gate Road: a towering black gate with a burning veil, braziers either side
          [-1, 1].forEach((s) => {
            g(B(4, 20, 4), 0x161018, s * 9, 10, -29);
            em(B(0.5, 14, 0.1), 0xff3a2a, s * 9, 10, -26.94, 0xd8200a);
            g(B(5, 1.4, 5), 0x2a2024, s * 9, 0.7, -29);
            g(Cn(2.6, 4, 4), 0x161018, s * 9, 24.6, -29, Math.PI / 4);
            g(Cy(0.8, 0.5, 1.6, 8), 0x2a2024, s * 8, 0.8, -15);
            em(Cn(0.6, 1.3, 6), 0xff9a3a, s * 8, 2.2, -15, 0xff5a0a);
            gl(s * 8, 2.4, -15, 4, 0xffa050);
            sol(s * 8, -15, 1);
          });
          g(B(24, 3, 4.6), 0x161018, 0, 21.5, -29);
          const veil = new T.Mesh(
            new T.PlaneGeometry(14, 19),
            new T.MeshBasicMaterial({
              color: 0xff4a2a,
              transparent: true,
              opacity: 0.55,
              blending: T.AdditiveBlending,
              depthWrite: false,
              side: T.DoubleSide,
            }),
          );
          veil.position.set(X, 9.5, EZ - 29);
          S.add(veil);
          gl(0, 9, -28, 22, 0xff5a3a);
          [0, 1, 2].forEach((k) => g(B(16 - k * 2, 0.4, 2), 0x2a2024, 0, 0.2 + k * 0.4, -23.5 - k * 1.6));
          break;
        }
        case "forge": {
          // Ember Steps: a stepped pyramid with a great anvil and forge fire on top, anvils at work in the plaza
          [26, 20, 14, 8].forEach((w, k) => g(B(w, 3, w), k % 2 ? 0x6a5048 : 0x5a4440, 0, 1.5 + k * 3, -42));
          for (let k = 0; k < 12; k++) g(B(4, k + 1, 1.3), 0x4a3a38, 0, (k + 1) / 2, -23 - k * 1.25); // stairs up
          g(B(3, 1.6, 1.6), 0x2a2438, 0, 12.8, -42);
          g(B(1.4, 1.4, 1.2), 0x2a2438, 0, 13.6, -42);
          g(B(4.2, 0.7, 1.8), 0x2a2438, 0.4, 14.6, -42);
          em(Cy(1.4, 1, 1, 10), 0xff7a2a, -3.4, 12.5, -42, 0xff4a0a);
          gl(-3.4, 14, -42, 9, 0xffa050);
          [-1, 1].forEach((s) => {
            g(B(1.2, 0.8, 0.8), 0x5a3a1a, s * 8, 0.4, -9);
            g(B(1.8, 0.5, 0.7), 0x2a2438, s * 8, 1.05, -9);
            em(B(0.5, 0.2, 0.3), 0xff9a3a, s * 8 + 0.3, 1.4, -9, 0xff5a0a);
            gl(s * 8, 1.6, -9, 2.4, 0xffa050);
            sol(s * 8, -9, 1.2);
          });
          break;
        }
        case "witch": {
          // Witchway: a crooked witch's hut on stilts and a bubbling cauldron in the plaza
          [-3, 3].forEach((x) => [-3, 3].forEach((z) => g(Cy(0.3, 0.35, 6, 6), 0x3a2f28, x, 3, -32 + z)));
          g(B(8, 5.5, 7), 0x5a4a3a, 0, 8.6, -32, 0, 0, 0.06);
          g(Cn(6.2, 6.5, 4), 0x2a2030, 0.3, 14.5, -32, Math.PI / 4, 0, 0.1);
          g(B(1.4, 2.4, 0.1), 0x1a1420, 0, 7.2, -28.45);
          em(B(1.1, 1.1, 0.1), 0x9aff6a, 2.4, 9.4, -28.45, 0x4aa82a);
          gl(2.4, 9.4, -28, 2.6, 0x9aff6a);
          for (let k = 0; k < 7; k++) g(B(1.6, 0.12, 0.3), 0x6b4a2b, 0, 0.6 + k * 0.85, -27.6 + k * 0.05);
          // v28: the cauldron bubbles at the back of the plaza, clear of the road boss fight
          const KZ = -12;
          g(Cy(1.7, 1.3, 1.6, 14), 0x1a1420, 0, 0.8, KZ);
          em(Cy(1.5, 1.5, 0.08, 14), 0x7dff5a, 0, 1.58, KZ, 0x3aa82a);
          gl(0, 2.2, KZ, 6, 0x9aff6a);
          [-1, 1].forEach((s) => g(Cy(0.1, 0.1, 2.4, 5), 0x3a2010, s * 1.9, 0.9, KZ, 0, 0, s * 0.5));
          sol(0, KZ, 2);
          [-0.9, 0, 0.9].forEach((a) => {
            const x = Math.cos(-Math.PI / 2 + a) * 16,
              z = Math.sin(-Math.PI / 2 + a) * 16;
            g(Cy(0.12, 0.14, 4, 5), 0x2a2438, x, 2, z);
            em(Sp(0.3, 8), 0x9aff6a, x, 3.9, z, 0x4aa82a);
            gl(x, 3.9, z, 2.5, 0x9aff6a);
            sol(x, z, 0.4);
          });
          break;
        }
        case "chapel": {
          // Drowned Row: a half-sunken chapel listing in a teal pool, gravestones round the plaza
          em(Cy(18, 18, 0.06, 40), 0x3fb09a, 0, 0.05, -38, 0x0a3a30);
          const ch = new T.Group();
          ch.position.set(0, -1.2, -38);
          ch.rotation.set(0.05, 0, 0.12);
          o.add(ch);
          const cg = (geo, c, px, py, pz, ry, rx, rz) => {
            const m = mk(geo, c, px, py, pz);
            m.rotation.set(rx || 0, ry || 0, rz || 0);
            ch.add(m);
            return m;
          };
          cg(B(10, 8, 16), 0x6a7a70, 0, 4, 0);
          [-1, 1].forEach((s) => cg(B(6.6, 0.4, 17), 0x2a3a30, s * 2.7, 9.5, 0, 0, 0, -s * 0.72));
          cg(B(3.4, 12, 3.4), 0x6a7a70, 0, 6, 9);
          cg(Cn(2.6, 5, 4), 0x2a3a30, 0, 14.5, 9, Math.PI / 4);
          const w1 = mk(B(2.2, 3.4, 0.1), 0x9fe8ff, 0, 5, 10.75, 1);
          w1.material.emissive.setHex(0x2a8a8a);
          ch.add(w1);
          gl(0, 3.8, -27, 5, 0x5fe0c0);
          for (let k = 0; k < 9; k++) {
            const a = Math.PI / 2 + 0.7 + (k / 8) * (6.283 - 1.4),
              x = Math.cos(a) * 17,
              z = Math.sin(a) * 17;
            g(B(1.1, 1.5 + (k % 3) * 0.3, 0.3), 0x8a9a90, x, 0.75, z, Math.atan2(-x, -z), 0, (k % 2 ? 1 : -1) * 0.12);
            sol(x, z, 0.7);
          }
          break;
        }
        case "shrine": {
          // Shrine Walk: a stone pavilion holding a glowing orb, with lantern posts round the plaza
          g(B(11, 0.8, 11), 0x6a7a70, 0, 0.4, -30);
          [-4, 4].forEach((x) => [-4, 4].forEach((z) => g(Cy(0.6, 0.7, 6, 8), 0x8a9a80, x, 3.8, -30 + z)));
          g(B(11.4, 0.6, 11.4), 0x4a5a50, 0, 7, -30);
          g(Cn(8.2, 3.6, 4), 0x2a3a30, 0, 9.1, -30, Math.PI / 4);
          em(Sp(1.1, 14), 0x7dffe0, 0, 3.6, -30, 0x2aa88a);
          gl(0, 3.6, -30, 9, 0x5fe0c0);
          for (let k = 0; k < 8; k++) {
            const a = Math.PI / 2 + 0.6 + (k / 7) * (6.283 - 1.2),
              x = Math.cos(a) * 17.5,
              z = Math.sin(a) * 17.5;
            g(B(0.6, 2.6, 0.6), 0x6a7a70, x, 1.3, z);
            g(B(1, 0.9, 1), 0x4a5a50, x, 3, z);
            em(B(0.6, 0.5, 1.02), 0x9fffe8, x, 3, z, 0x2aa88a);
            gl(x, 3, z, 2.6, 0x5fe0c0);
            sol(x, z, 0.6);
          }
          break;
        }
        case "lantern": {
          // Lantern Bog: a giant gnarled tree hung with lanterns at the back of the plaza (v28: was the middle, where
          // the road boss fight is)
          const LZ = -14;
          g(Cy(1.4, 2.6, 12, 9), 0x3a2f28, 0, 6, LZ);
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * 6.283 + 0.4;
            g(B(0.9, 0.7, 4), 0x3a2f28, Math.cos(a) * 2.6, 0.3, LZ + Math.sin(a) * 2.6, -a + Math.PI / 2);
          }
          for (let k = 0; k < 7; k++) {
            const a = (k / 7) * 6.283,
              tilt = 0.9 + (k % 3) * 0.15,
              L = 7 + (k % 2) * 1.5,
              y0 = 9 + (k % 3) * 1.2,
              m = g(Cy(0.25, 0.55, L, 6), 0x3a2f28, 0, 0, 0);
            m.rotation.set(tilt, Math.PI / 2 - a, 0, "YXZ");
            const hx = Math.cos(a) * Math.sin(tilt) * L,
              hz = Math.sin(a) * Math.sin(tilt) * L,
              hy = Math.cos(tilt) * L;
            m.position.set(hx / 2, y0 + hy / 2, LZ + hz / 2);
            const tx = hx * 0.95,
              tz = LZ + hz * 0.95,
              ty = y0 + hy * 0.95;
            g(Cy(0.02, 0.02, 1.4, 3), 0x2a2438, tx, ty - 0.7, tz);
            em(B(0.5, 0.65, 0.5), 0xffd98a, tx, ty - 1.6, tz, 0xd99a2a);
            gl(tx, ty - 1.6, tz, 2.4, 0xffd27a);
          }
          gl(0, 12, LZ, 16, 0xffd27a).material.opacity = 0.5;
          sol(0, LZ, 3);
          break;
        }
      }
      o.position.set(X, 0, EZ);
      S.add(bake(o));
    };
    // v36 editor kit: a street landmark centred on the origin (its plaza centre), see world()'s __edKit note
    window.__edKit.zsLand = (lm) => {
      const g = new T.Group(),
        sa = S.add;
      S.add = (...a) => (g.add(...a), S);
      try {
        zsLandmark({ X: 0, lm });
      } finally {
        S.add = sa;
      }
      g.position.z = ZSL;
      S.add(g);
    };
    // v16 zone streets (see ZSTR): the in-zone links keep a plain road. Each named street gets a short flagstone walk
    // out of its village to a loading arch, and its own place far east: a long straight road between rows of the zone's
    // trees, a landmark plaza at the dead end, and an arch home at its start.
    {
      let zsd = 9157;
      const ZRN = () => (zsd = (zsd * 16807) % 2147483647) / 2147483647,
        zr = (a, b) => a + ZRN() * (b - a),
        ZCOL = {
          frost: { gr: 0xdfe6f2, st: 0x9fb4c8, rf: 0x3a4a7a, gem: 0x8ad0ff, cap: 0xe8f2ff },
          ember: { gr: 0x3a2a2a, st: 0x5a4440, rf: 0x2a1e22, gem: 0xff7a3d, cap: 0x8a5a4a },
          marsh: { gr: 0x44523a, st: 0x6a7a70, rf: 0x2a3a30, gem: 0x5fe0c0, cap: 0x8a9a80 },
        },
        // an arch over a loading swirl: two stone pillars, a lintel and a name board (one baked child) + the swirl
        gateArch = (x, z, ry, zk, txt, to, ptn) => {
          const C2 = ZCOL[zk],
            o = new T.Group(),
            g = (geo, c, px, py, pz) => {
              const m = mk(geo, c, px, py, pz);
              o.add(m);
              return m;
            };
          [-1, 1].forEach((s) => {
            g(B(1.5, 7.2, 1.5), C2.st, s * 3.5, 3.6, 0);
            g(B(1.9, 0.5, 1.9), 0x3a3450, s * 3.5, 0.25, 0);
            g(B(1.9, 0.5, 1.9), 0x3a3450, s * 3.5, 7.3, 0);
            g(Cn(0.9, 1.4, 4), C2.cap, s * 3.5, 8.25, 0).rotation.y = Math.PI / 4;
          });
          g(B(9.2, 1.1, 1.3), C2.st, 0, 6.6, 0);
          g(B(9.8, 0.3, 1.6), 0x3a3450, 0, 7.25, 0);
          const gm = g(new T.OctahedronGeometry(0.5), C2.gem, 0, 8.1, 0);
          gm.material = gm.material.clone();
          gm.material.emissive.setHex(C2.gem);
          gm.material.emissiveIntensity = 0.6;
          // v43: every part carries the arch's id (= its swirl's PT index), so OPENR.move can take a whole arch down
          const gid = PT.length;
          o.position.set(x, 0, z);
          o.rotation.y = ry;
          const ob = bake(o);
          ob.userData.zga = gid;
          S.add(ob);
          [-1, 1].forEach((s) =>
            solids.push({ x: x + Math.cos(ry) * s * 3.5, z: z - Math.sin(ry) * s * 3.5, r: 1.1, ga: gid }),
          );
          // the name board, readable from the side you walk up from
          [0, Math.PI].forEach((f) => {
            const sg = sign(txt, 6);
            sg.position.set(x + Math.sin(ry + f) * 0.7, 6.6, z + Math.cos(ry + f) * 0.7);
            sg.rotation.y = ry + f;
            sg.userData.zga = gid;
            S.add(sg);
          });
          swirl(x, 2.6, z, ry, C2.gem, 2.6, ptn, to);
          PT[PT.length - 1].rad = 3;
          PT[PT.length - 1].gid = gid;
        },
        // trees in the zone's look, one instanced set per call (so each street's trees load with that street)
        treeInst = (zk, L) => {
          if (zk === "frost") {
            inst(
              Cy(0.2, 0.3, 1.2, 6),
              0x6b4a2b,
              L.map(([x, z, s]) => [x, 0.6 * s, z, s]),
            );
            [
              [Cn(1.3, 2.4, 7), 0x2f5f4f, 2.2],
              [Cn(0.95, 1.8, 7), 0x2f5f4f, 3.5],
              [Cn(0.55, 1.2, 7), 0x9aaac6, 4.7],
            ].forEach(([geo, c, y]) =>
              inst(
                geo,
                c,
                L.map(([x, z, s]) => [x, y * s, z, s, x + z]),
              ),
            );
          } else if (zk === "ember")
            inst(
              Cn(1, 1, 5),
              0x2a2024,
              L.map(([x, z, s]) => [x, 3 * s, z, 1, x, 0, 1.6 * s, 6 * s, 1.6 * s]),
            );
          else
            inst(
              Cy(0.22, 0.42, 1, 6),
              0x3a2f28,
              L.map(([x, z, s]) => [x, 2.6 * s, z, 1, x * 3, 0, s, 5.2 * s, s]),
            );
        };
      // v36 editor kit: a zone gate arch (frost/ember/marsh), see world()'s __edKit note. The swirl is decoration only.
      window.__edKit.gateArch = (zk, txt) => gateArch(0, 0, 0, ZCOL[zk] ? zk : "frost", txt || "GATE", null, txt);
      // v18: each village gets a low wall round its rim in the zone's stone, with the street arches standing in it as
      // its gates and gaps where the trails come in, so the arches read as the village's own ways out. Lantern posts
      // mark where each walk leaves the village. Decoration only (it stands outside the walkable village).
      Object.keys(ZCEN).forEach((zk) => {
        const C2 = ZCOL[zk],
          [cx, cz] = ZCEN[zk],
          R = ZVR[zk] + ZSB - 0.2, // the arches' ring
          o = new T.Group(),
          gw = (geo, c, px, py, pz, ry) => {
            const m = mk(geo, c, px, py, pz);
            m.rotation.y = ry || 0;
            o.add(m);
            return m;
          },
          gates = ZRD.filter((t) => t.n && t.zk === zk).map((t) => Math.atan2(t.mo[1], t.mo[0])),
          N = Math.round((Math.PI * 2 * R) / 3),
          da = (Math.PI * 2) / N,
          open = (a) => {
            const x = cx + Math.cos(a) * R,
              z = cz + Math.sin(a) * R;
            if (gates.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) * R < 4.6)) return true;
            if (trOn(x, z, RDW + 2)) return true;
            for (const t of ZRD) {
              if (t.n || t.zk !== zk) continue;
              const q = rdNear(t, x - OX, z - OZ);
              if (q && q.d <= RDW + 2) return true;
            }
            if (solids.some((s) => s.r >= 1.2 && Math.hypot(s.x - x, s.z - z) < s.r + 1.5)) return true;
            return CB.some((b) => b.r >= 2.5 && Math.hypot(b.x - x, b.z - z) < b.r + 1);
          },
          drawn = [];
        o.position.set(cx, 0, cz);
        for (let i = 0; i < N; i++) {
          const a = (i + 0.5) * da;
          drawn[i] = !(open(i * da) || open(a) || open((i + 1) * da));
        }
        const sN0 = solids.length; // v46: this ring's collision circles (for the editor's Road tool, __vWall.sol0)
        // v46: each unbroken run of wall (between gaps) is its own piece standing at its middle, so the world editor
        // can pick, move, turn, resize, copy or delete it; it blocks walking (collision circles along it and on posts)
        const runOf = new Array(N).fill(-1),
          runs = [];
        {
          const s0 = drawn.indexOf(false);
          let cur = -1,
            n = 0;
          for (let j = 1; j <= N; j++) {
            const i = (Math.max(0, s0) + j) % N;
            if (!drawn[i]) {
              cur = -1;
              continue;
            }
            // a ring with no gap at all is cut into pieces of 12
            if (cur < 0 || (s0 < 0 && n >= 12)) {
              cur = runs.length;
              runs.push([]);
              n = 0;
            }
            runOf[i] = cur;
            runs[cur].push(i);
            n++;
          }
        }
        const RG = runs.map((L) => {
            const a = ((L[0] + L[L.length - 1] + 1) / 2) * da + (L[L.length - 1] < L[0] ? Math.PI : 0),
              g = new T.Group();
            g.position.set(cx + Math.cos(a) * R, 0, cz + Math.sin(a) * R);
            return g;
          }),
          rw = (ri, geo, c, lx, py, lz, ry) => {
            const g = RG[ri],
              m = mk(geo, c, cx + lx - g.position.x, py, cz + lz - g.position.z);
            m.rotation.y = ry || 0;
            g.add(m);
          };
        for (let i = 0; i < N; i++) {
          if (!drawn[i]) continue;
          const a = (i + 0.5) * da,
            len = 2 * R * Math.sin(da / 2) + 0.12,
            ry = -a - Math.PI / 2,
            lx = Math.cos(a) * R * Math.cos(da / 2),
            lz = Math.sin(a) * R * Math.cos(da / 2);
          rw(runOf[i], B(len, 1.6, 0.9), C2.st, lx, 0.8, lz, ry);
          rw(runOf[i], B(len + 0.1, 0.25, 1.1), 0x3a3450, lx, 1.7, lz, ry);
          for (let d = -len / 2 + 0.5; d < len / 2; d += 1)
            solids.push({ x: cx + lx - Math.sin(a) * d, z: cz + lz + Math.cos(a) * d, r: 0.55 });
        }
        for (let k = 0; k < N; k++) {
          const l = drawn[(k + N - 1) % N],
            r = drawn[k];
          if (!(l || r) || (k % 3 && l && r)) continue;
          const a = k * da,
            lx = Math.cos(a) * R,
            lz = Math.sin(a) * R,
            ri = r ? runOf[k] : runOf[(k + N - 1) % N];
          rw(ri, B(1.15, 2.3, 1.15), C2.st, lx, 1.15, lz, -a);
          rw(ri, B(1.35, 0.25, 1.35), 0x3a3450, lx, 2.35, lz, -a);
          rw(ri, Cn(0.75, 0.9, 4), C2.cap, lx, 2.9, lz, -a + Math.PI / 4);
          solids.push({ x: cx + lx, z: cz + lz, r: 0.75 });
        }
        const VWL = window.__vWall || (window.__vWall = { objs: {}, sol0: {}, R: {} });
        VWL.objs[zk] = RG.map((g) => {
          const b = bake(g);
          b.userData.vw = zk;
          S.add(b);
          return b;
        });
        VWL.sol0[zk] = solids.slice(sN0);
        VWL.R[zk] = R;
        // lantern posts where each street's walk leaves the village (glow sprites only: no new lights)
        gates.forEach((g) => {
          const ca = Math.cos(g),
            sa = Math.sin(g),
            al = ZVR[zk] - 3.5;
          [-1, 1].forEach((s) => {
            const lx = ca * al - sa * s * (ZSW + 0.9),
              lz = sa * al + ca * s * (ZSW + 0.9);
            gw(Cy(0.12, 0.16, 3.4, 6), 0x2a2438, lx, 1.7, lz);
            gw(B(0.5, 0.25, 0.5), 0x2a2438, lx, 3.45, lz);
            const lb = gw(B(0.42, 0.55, 0.42), 0xffd98a, lx, 3.1, lz);
            lb.material = lb.material.clone();
            lb.material.emissive.setHex(0xd99a2a);
            const sp = new T.Sprite(AM(GLT));
            sp.material.color.setHex(C2.gem);
            sp.scale.setScalar(2.6);
            sp.position.set(lx, 3.1, lz);
            o.add(sp);
            solids.push({ x: cx + lx, z: cz + lz, r: 0.35 });
          });
        });
        S.add(bake(o));
      });
      // v46: a village wall laid along the editor's markers (P = world [x, z], closed loop, read with today's ZCEN /
      // ZRD / TRL): one piece per straight run between markers, a post on every marker and every few segments, gaps
      // where the street walks, trails and in-village roads cross. Returns { objs, sol } (added to S and `solids`)
      if (window.__vWall)
        window.__vWall.build = (zk, P) => {
          const C2 = ZCOL[zk],
            [cx, cz] = ZCEN[zk],
            vr = ZVR[zk],
            walks = ZRD.filter((t) => t.n && t.zk === zk).map((t) => t.mo),
            objs = [],
            sol = [],
            open = (x, z) => {
              for (const [mx, mz] of walks) {
                const ax = cx + mx * (vr - 6),
                  az = cz + mz * (vr - 6),
                  al = (x - ax) * mx + (z - az) * mz,
                  sd = Math.abs(-(x - ax) * mz + (z - az) * mx);
                if (al > -2 && al < ZSB + 10 && sd < ZSW + 1.6) return true;
              }
              if (trOn(x, z, RDW + 2)) return true;
              for (const t of ZRD) {
                if (t.n || t.zk !== zk) continue;
                const q = rdNear(t, x - OX, z - OZ);
                if (q && q.d <= RDW + 2) return true;
              }
              return false;
            },
            ss = (x, z, r) => {
              const s = { x, z, r };
              sol.push(s);
              solids.push(s);
            };
          const n = P.length;
          for (let i = 0; i < (n > 2 ? n : n - 1); i++) {
            const [ax, az] = P[i],
              [bx, bz] = P[(i + 1) % n],
              L = Math.hypot(bx - ax, bz - az);
            if (L < 0.6) continue;
            const ux = (bx - ax) / L,
              uz = (bz - az) / L,
              ry = Math.atan2(-uz, ux), // the boxes' long (x) side along the run
              m = Math.max(1, Math.round(L / 3)),
              sl = L / m,
              g = new T.Group(),
              mx0 = (ax + bx) / 2,
              mz0 = (az + bz) / 2,
              at = (d) => [ax + ux * d, az + uz * d],
              put = (geo, c, x, y, z, r) => {
                const q = mk(geo, c, x - mx0, y, z - mz0);
                q.rotation.y = r;
                g.add(q);
              },
              dr = [];
            g.position.set(mx0, 0, mz0);
            for (let j = 0; j < m; j++)
              dr[j] = !(open(...at(j * sl)) || open(...at((j + 0.5) * sl)) || open(...at((j + 1) * sl)));
            for (let j = 0; j < m; j++) {
              if (!dr[j]) continue;
              const [x, z] = at((j + 0.5) * sl);
              put(B(sl + 0.12, 1.6, 0.9), C2.st, x, 0.8, z, ry);
              put(B(sl + 0.22, 0.25, 1.1), 0x3a3450, x, 1.7, z, ry);
              for (let d = j * sl + 0.5; d < (j + 1) * sl; d += 1) ss(...at(d), 0.55);
            }
            for (let k = 0; k <= m; k++) {
              const l = k > 0 && dr[k - 1],
                r = k < m && dr[k];
              if (!(l || r) || (k % 3 && k !== 0 && k !== m && l && r)) continue;
              const [x, z] = at(k * sl);
              put(B(1.15, 2.3, 1.15), C2.st, x, 1.15, z, ry);
              put(B(1.35, 0.25, 1.35), 0x3a3450, x, 2.35, z, ry);
              put(Cn(0.75, 0.9, 4), C2.cap, x, 2.9, z, ry + Math.PI / 4);
              ss(x, z, 0.75);
            }
            if (!g.children.length) continue;
            const b = bake(g);
            b.userData.vw = zk;
            S.add(b);
            objs.push(b);
          }
          return { objs, sol };
        };
      // the in-zone links: just the road
      ZRD.forEach((t) => {
        if (t.n) return;
        const rd = dirt(1),
          sw = fsw.clone();
        rd.repeat.set(1, 1);
        sw.needsUpdate = true;
        sw.repeat.set(1, 1);
        lay(rdRibbon(t, -5, 5, 0.012, new T.MeshLambertMaterial({ map: rd, color: t.tint }), 10, 0, t.L), 3);
        const sm = new T.MeshLambertMaterial({ map: sw, color: t.tint });
        lay(rdRibbon(t, 5, RDW, 0.07, sm, 3.6, 0, t.L), 5);
        rdRibbon(t, -RDW, -5, 0.07, sm, 3.6, 0, t.L);
        rdRibbon(t, 4.82, 5.18, 0.1, cm, 1, 0, t.L);
        rdRibbon(t, -5.18, -4.82, 0.1, cm, 1, 0, t.L);
      });
      ZRD.forEach((t, zi) => {
        if (!t.n) return;
        const zk = t.zk,
          C2 = ZCOL[zk],
          X = t.X,
          c = ZCEN[zk],
          vr = ZVR[zk],
          [mx, mz] = t.mo,
          inRy = Math.atan2(-mx, -mz), // facing back into the village
          vw = (al, sd) => [c[0] + mx * al - mz * sd, c[1] + mz * al + mx * sd],
          sm = new T.MeshLambertMaterial({ map: fsw, color: t.tint });
        // ---- in the village: the walk out, low walls either side, and the arch ----
        {
          const L = ZSB + 5,
            [px, pz] = vw(vr - 4 + L / 2, 0),
            pv = new T.Mesh(new T.PlaneGeometry(ZSW * 2, L), lay({ material: sm.clone() }, 5).material);
          pv.rotation.set(-Math.PI / 2, 0, 0);
          pv.rotation.order = "YXZ";
          pv.rotation.y = Math.atan2(mx, mz);
          pv.position.set(px, 0.07, pz);
          S.add(pv);
          // v46: one piece per side (the world editor picks each), blocking along its length
          [-1, 1].forEach((s) => {
            const o = new T.Group(),
              [wx, wz] = vw(vr + ZSB / 2 - 1, s * (ZSW + 0.6));
            o.name = "village wall";
            o.position.set(wx, 0, wz);
            const m = mk(B(0.9, 1.4, ZSB + 1), C2.st, 0, 0.7, 0);
            m.rotation.y = Math.atan2(mx, mz);
            o.add(m);
            const cp = mk(B(1.1, 0.25, ZSB + 1.2), 0x3a3450, 0, 1.5, 0);
            cp.rotation.y = Math.atan2(mx, mz);
            o.add(cp);
            S.add(bake(o));
            for (let d = -(ZSB + 1) / 2 + 0.45; d < (ZSB + 1) / 2; d += 0.9)
              solids.push({ x: wx + mx * d, z: wz + mz * d, r: 0.45 });
          });
          const [ax, az] = vw(vr + ZSB - 0.2, 0);
          gateArch(ax, az, inRy, zk, t.n.toUpperCase(), [X, -9, Math.PI], t.n);
        }
        // ---- the street's own place ----
        const sl = t.L - ZCR + 2,
          rd = dirt(1),
          sw = fsw.clone();
        rd.repeat.set(1, 1);
        sw.needsUpdate = true;
        sw.repeat.set(1, 1);
        // ground under it all, in the zone's colour
        {
          const tx = spk.clone();
          tx.needsUpdate = true;
          tx.repeat.set(30, 48);
          const gp = new T.Mesh(
            new T.PlaneGeometry(240, ZSL + 150),
            new T.MeshLambertMaterial({ map: tx, color: C2.gr }),
          );
          gp.rotation.x = -Math.PI / 2;
          gp.position.set(X, -0.02, (80 - ZSL - 70) / 2);
          gp.userData.zgp = 1; // v43: OPENR.move trims the part behind the start (it would reach back into the village)
          S.add(gp);
        }
        lay(rdRibbon(t, -5, 5, 0.012, new T.MeshLambertMaterial({ map: rd, color: t.tint }), 10, 0, sl), 3);
        const sm2 = new T.MeshLambertMaterial({ map: sw, color: t.tint }),
          discM = (r) => {
            const m = sm2.clone(),
              tx = fsw.clone();
            tx.needsUpdate = true;
            tx.repeat.set(r / 2, r / 2); // one 128px tile (4 x 2 slabs) per 4 units
            m.map = tx;
            return m;
          },
          rdDisc = (r) => {
            const tx = rd.clone();
            tx.needsUpdate = true;
            tx.repeat.set(r / 5, r / 5); // the road's dirt scale (one tile per 10 units)
            return tx;
          };
        lay(rdRibbon(t, 5, RDW, 0.07, sm2, 3.6, 0, sl), 5);
        rdRibbon(t, -RDW, -5, 0.07, sm2, 3.6, 0, sl);
        rdRibbon(t, 4.82, 5.18, 0.1, cm, 1, 0, sl);
        rdRibbon(t, -5.18, -4.82, 0.1, cm, 1, 0, sl);
        // the start: a round of flagstones and the arch home
        {
          // v42: discs get their own flagstone map at the walks' slab size (repeat 1 stretched one tile over the whole
          // disc, so its grout showed as huge dark wedges)
          const cs = new T.Mesh(new T.CircleGeometry(9, 32), lay({ material: discM(9) }, 4).material);
          cs.rotation.x = -Math.PI / 2;
          cs.position.set(X, 0.06, 0);
          S.add(cs);
          const home = { frost: "Frostfen", ember: "Cinderwaste", marsh: "Mirewick" }[zk];
          gateArch(X, 5, Math.PI, zk, "TO " + home.toUpperCase(), [...vw(vr - 7, 0), inRy], "Back to " + home);
        }
        // the dead end: a big round plaza
        {
          const ex = X,
            ez = -ZSL,
            cs = new T.Mesh(new T.CircleGeometry(ZCR, 48), lay({ material: discM(ZCR) }, 4).material);
          cs.rotation.x = -Math.PI / 2;
          cs.position.set(ex, 0.065, ez);
          S.add(cs);
          const cd = new T.Mesh(
            new T.CircleGeometry(ZCR - 3.5, 48),
            lay({ material: new T.MeshLambertMaterial({ map: rdDisc(ZCR - 3.5), color: t.tint }) }, 6).material,
          );
          cd.rotation.x = -Math.PI / 2;
          cd.position.set(ex, 0.075, ez);
          S.add(cd);
        }
        // a fence along both verges and round the plaza (open where the street comes in)
        const PST = [],
          RAIL = [],
          LP = [],
          post = (x, z) => PST.push([x, 0.55, z, 1]),
          rail = (a, b) => {
            const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
            [0.8, 0.42].forEach((y) =>
              RAIL.push([(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, 1, Math.atan2(b[0] - a[0], b[1] - a[1]), 0, 1, 1, L]),
            );
          };
        // v26: the street winds, so everything along it is placed by distance s along the road and a sideways offset
        const vp = (s, of) => {
            const [px, pz, hx, hz] = rdAt(t, s);
            return [OX + px - hz * of, OZ + pz + hx * of];
          },
          sEnd = t.L - Math.sqrt(ZCR * ZCR - (RDW + 0.9) ** 2) + 0.4,
          inPk = (p, m) => Math.hypot(p[0] - t.pk[0], p[1] - t.pk[1]) < t.pk[2] + m;
        // v48f: each verge fence's instances and line are kept (window.__sFence[zi]) so 13's Road tool can re-lay it
        const FSD = { l: { p: [], r: [], cp: [] }, r: { p: [], r: [], cp: [] } };
        [-1, 1].forEach((sd) => {
          const F = FSD[sd < 0 ? "l" : "r"],
            n = Math.max(2, Math.round((sEnd - 6) / 24));
          for (let k = 0; k <= n; k++) F.cp.push(vp(6 + ((sEnd - 6) * k) / n, sd * (RDW + 0.9)));
          // from the start round to the plaza (open where the side clearing joins)
          for (let s = 6; s < sEnd; s += 2.4) {
            const a = vp(s, sd * (RDW + 0.9)),
              b = vp(Math.min(sEnd, s + 2.4), sd * (RDW + 0.9));
            if (inPk(a, 0.6) || inPk(b, 0.6)) continue;
            F.p.push(PST.length);
            post(a[0], a[1]);
            F.r.push(RAIL.length, RAIL.length + 1);
            rail(a, b);
          }
        });
        // round the side clearing (open toward the road)
        for (let k = 0; k < 44; k++) {
          const a = (k / 44) * 6.283,
            r = t.pk[2] + 0.9,
            pa = [t.pk[0] + Math.cos(a) * r, t.pk[1] + Math.sin(a) * r],
            pb = [t.pk[0] + Math.cos(a + 6.283 / 44) * r, t.pk[1] + Math.sin(a + 6.283 / 44) * r],
            qa = rdNear(t, pa[0] - OX, pa[1] - OZ);
          if (qa && qa.d < RDW + 1.5) continue;
          post(pa[0], pa[1]);
          rail(pa, pb);
        }
        {
          const a0 = Math.PI / 2, // the way back down the street (+z)
            n = 56;
          for (let k = 0; k < n; k++) {
            const a = (k / n) * 6.283,
              d = Math.atan2(Math.sin(a - a0), Math.cos(a - a0));
            if (Math.abs(d) < 0.5) continue;
            const r = ZCR + 0.9,
              pa = [X + Math.cos(a) * r, -ZSL + Math.sin(a) * r],
              pb = [X + Math.cos(a + 6.283 / n) * r, -ZSL + Math.sin(a + 6.283 / n) * r];
            post(pa[0], pa[1]);
            rail(pa, pb);
          }
          // and round the start (behind the arch)
          for (let k = 0; k < 40; k++) {
            const a = (k / 40) * 6.283,
              d = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2));
            if (Math.abs(d) < 0.95) continue; // open toward the street (-z)
            const pa = [X + Math.cos(a) * 9.9, Math.sin(a) * 9.9],
              pb = [X + Math.cos(a + 0.157) * 9.9, Math.sin(a + 0.157) * 9.9];
            post(pa[0], pa[1]);
            rail(pa, pb);
          }
        }
        {
          const pm = inst(B(0.18, 1.1, 0.18), 0x6b4a2b, PST),
            rm = inst(B(0.09, 0.09, 1), 0x6b4a2b, RAIL),
            SF = window.__sFence || (window.__sFence = []);
          SF[zi] = { n: t.n, pm, rm, l: FSD.l, r: FSD.r };
          if (!SF.build)
            // a fence along a winding line through P (world [x, z] markers): posts every 2.4, two rails, collision
            // circles every 1.2. Returns {objs: [group added to S], sol: [solids pushed]}.
            SF.build = (P) => {
              const R = mkRd(P.map(([x, z]) => [x - OX, z - OZ])),
                ps = [],
                rs = [],
                sol = [],
                at = (s) => {
                  const q = rdAt(R, Math.min(R.L, s));
                  return [OX + q[0], OZ + q[1]];
                };
              for (let s = 0; s < R.L - 0.01; s += 2.4) {
                const a = at(s),
                  b = at(s + 2.4),
                  L = Math.hypot(b[0] - a[0], b[1] - a[1]);
                ps.push([a[0], 0.55, a[1]]);
                if (L > 0.01)
                  [0.8, 0.42].forEach((y) =>
                    rs.push([(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, Math.atan2(b[0] - a[0], b[1] - a[1]), L]),
                  );
              }
              const e = at(R.L);
              ps.push([e[0], 0.55, e[1]]);
              for (let s = 0; s <= R.L; s += 1.2) {
                const [x, z] = at(s),
                  c = { x, z, r: 0.45 };
                solids.push(c);
                sol.push(c);
              }
              const g = new T.Group(),
                q = new T.Object3D(),
                mkI = (geo, L, f) => {
                  const m = new T.InstancedMesh(geo, M(0x6b4a2b, 1), L.length);
                  L.forEach((v, k) => {
                    f(v);
                    q.updateMatrix();
                    m.setMatrixAt(k, q.matrix);
                  });
                  m.instanceMatrix.needsUpdate = true;
                  m.frustumCulled = false;
                  g.add(m);
                };
              mkI(B(0.18, 1.1, 0.18), ps, (v) => {
                q.position.set(v[0], v[1], v[2]);
                q.rotation.set(0, 0, 0);
                q.scale.set(1, 1, 1);
              });
              if (rs.length)
                mkI(B(0.09, 0.09, 1), rs, (v) => {
                  q.position.set(v[0], v[1], v[2]);
                  q.rotation.set(0, v[3], 0);
                  q.scale.set(1, 1, v[4]);
                });
              g.name = "street fence";
              g.userData.sf = 1;
              S.add(g);
              return { objs: [g], sol };
            };
        }
        // lamp posts every 24, alternating sides, just inside the fence
        for (let s = 10, k = 0; s < sEnd - 4; s += 24, k++) {
          const [lx, lz] = vp(s, (k % 2 ? 1 : -1) * (RDW + 0.3));
          if (inPk([lx, lz], 1)) continue;
          LP.push([lx, lz]);
          glow(lx, 3.4, lz, 2.3);
        }
        inst(
          Cy(0.08, 0.1, 3.2, 6),
          0x2a2438,
          LP.map(([x, z]) => [x, 1.6, z, 1]),
        );
        inst(
          B(0.36, 0.1, 0.36),
          0x2a2438,
          LP.map(([x, z]) => [x, 3.25, z, 1]),
        );
        // trees: three rows each side, a ring round the plaza (leaving the landmark's side to the north open) and a
        // stand behind the start
        const TL = [];
        [-1, 1].forEach((sd) => {
          for (let s = 0; s < t.L - ZCR + 4; s += zr(5, 8)) {
            [zr(13, 16), zr(19, 26), zr(30, 42), zr(46, 70)].forEach((o, k) => {
              if (k === 3 && ZRN() < 0.4) return;
              const [x, z] = vp(s + zr(-1.5, 1.5), sd * o);
              TL.push([x, z, zr(1, 1.5)]);
            });
          }
        });
        for (let k = 0; k < 70; k++) {
          const a = zr(0, 6.283),
            r = zr(ZCR + 6, ZCR + 34),
            x = X + Math.cos(a) * r,
            z = -ZSL + Math.sin(a) * r;
          if (Math.abs(x - X) < RDW + 4 && z > -ZSL) continue;
          if (Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2))) < 0.75 && r < ZCR + 26)
            continue;
          TL.push([x, z, zr(1, 1.6)]);
        }
        for (let k = 0; k < 40; k++) TL.push([X + zr(-60, 60), zr(16, 60), zr(1, 1.5)]);
        treeInst(
          zk,
          TL.filter(([x, z]) => {
            if (zsWalk(zk, x, z) || Math.hypot(x - X, z - 5) <= 12 || inPk([x, z], 3)) return false;
            const q = rdNear(t, x - OX, z - OZ);
            return !q || q.d > RDW + 3.5; // the road bends back toward rows laid along another stretch
          }),
        );
        // things along the verges, in the zone's style (between the fence and the first trees)
        {
          const A = [],
            Bq = [],
            Cq = [];
          [-1, 1].forEach((s) => {
            for (let ss = 6; ss < sEnd; ss += zr(7, 12)) {
              const [x, z] = vp(ss, s * zr(10.5, 12)),
                q0 = rdNear(t, x - OX, z - OZ);
              if (inPk([x, z], 2) || (q0 && q0.d < RDW + 1.5)) continue;
              if (zk === "frost") {
                A.push([x, 0.1, z, 1, 0, 0, zr(1.4, 2.4), zr(0.5, 0.9), zr(1.2, 2)]); // drifts
                if (ZRN() < 0.45) Bq.push([x + s * 0.8, zr(0.5, 0.9), z + zr(-1, 1), zr(0.6, 1.1), zr(0, 3)]); // ice
              } else if (zk === "ember") {
                A.push([x, 0.35, z, zr(0.6, 1.2), zr(0, 3), zr(0, 3)]); // rocks
                if (ZRN() < 0.5) Bq.push([x - s * 0.6, 0.05, z + zr(-2, 2), 1, zr(0, 3), 0, zr(0.3, 0.6), 1, zr(2, 4)]); // lava cracks
              } else {
                A.push([x, 0.05, z, 1, 0, 0, zr(1.2, 2.2), 1, zr(1.2, 2.2)]); // pools
                for (let r2 = 0; r2 < 4; r2++)
                  Bq.push([x + zr(-1.6, 1.6), 0.5, z + zr(-1.6, 1.6), 1, 0, 0, 1, zr(0.7, 1.4), 1]); // reeds
                if (ZRN() < 0.4) Cq.push([x + s * 0.6, 0.25, z + 2, zr(0.7, 1.1)]); // toadstools
              }
            }
          });
          if (zk === "frost") {
            inst(Sp(1, 8), 0xf2f6ff, A);
            inst(new T.OctahedronGeometry(0.5), 0x9fe0ff, Bq, 0x2a6a9a);
          } else if (zk === "ember") {
            inst(new T.DodecahedronGeometry(0.8), 0x4a3a3a, A);
            inst(B(1, 0.04, 1), 0xff7a2a, Bq, 0xff4a0a);
          } else {
            inst(Cy(1, 1, 0.08, 16), 0x3fb09a, A, 0x0a3a30);
            inst(Cy(0.05, 0.07, 1, 4), 0x6a7a3a, Bq);
            inst(Cy(0.08, 0.1, 0.5, 6), 0xe8e0d0, Cq);
            inst(
              Sp(0.32, 8),
              0xc8442f,
              Cq.map((q) => [q[0], 0.55 * q[3], q[2], q[3], 0, 0, 1, 0.5, 1]),
            );
          }
        }
        // ---- the landmark at the dead end ----
        zsLandmark(t, C2);
      });
    }
    {
      const Q = kinds;
      inst(
        Cy(0.2, 0.3, 1.2, 6),
        0x6b4a2b,
        Q.tree.map(([x, z, s]) => [x, 0.6 * s, z, s]),
      );
      inst(
        Cn(1.1, 2.6, 7),
        0x2d6b45,
        Q.tree.map(([x, z, s]) => [x, 2.2 * s, z, s, x + z]),
      );
      inst(
        Cn(0.8, 2, 7),
        0x347a50,
        Q.tree.map(([x, z, s]) => [x, 3.4 * s, z, s, x + z + 0.5]),
      );
      inst(
        Cy(0.2, 0.3, 1.2, 6),
        0x6b4a2b,
        Q.pine.map(([x, z, s]) => [x, 0.6 * s, z, s]),
      );
      [
        [Cn(1.3, 2.4, 7), 0x2f5f4f, 2.2],
        [Cn(0.95, 1.8, 7), 0x2f5f4f, 3.5],
        [Cn(0.55, 1.2, 7), 0x9aaac6, 4.7],
      ].forEach(([g, c, y]) =>
        inst(
          g,
          c,
          Q.pine.map(([x, z, s]) => [x, y * s, z, s, x + z]),
        ),
      );
      inst(
        Cn(1, 1, 5),
        0x2a2024,
        Q.spire.map(([x, z, s]) => [x, 3 * s, z, 1, x, 0, 1.6 * s, 6 * s, 1.6 * s]),
      );
      inst(
        Cy(0.22, 0.42, 1, 6),
        0x3a2f28,
        Q.drown.map(([x, z, s]) => [x, 2.6 * s, z, 1, x * 3, 0, s, 5.2 * s, s]),
      );
    }
    // trail foes: every 30 along the open stretch, on alternating halves of the dirt like the town roads' foes. They
    // change with the land: the town's gloom near Lamplight, then the far zone's beasts, tougher toward the zone.
    // (Added after every other foe and in a fixed order, so multiplayer foe indices still match.)
    const TFOE = [
      [
        ["gloom", 2],
        ["wolf", 2],
        ["wolf", 3],
      ], // Frostfen Trail
      [
        ["gloom", 3],
        ["hound", 3],
        ["hound", 4],
      ], // Cinder Trail
      [
        ["wolf", 3],
        ["wolf", 4],
        ["gloom", 4],
      ], // Mire Causeway
    ];
    TRL.forEach((t, ti) => {
      for (let s = t.sA + 16, k = 0; s < t.sB - 10; s += 30, k++) {
        const [x, z, hx, hz] = at(t, s),
          o = k % 2 ? 2 : -2,
          kz = (s - t.sA) / Math.max(1, t.sB - t.sA),
          [kind, tier] = TFOE[ti][kz < 0.3 ? 0 : kz < 0.7 ? 1 : 2];
        sf(kind, tier, x - hz * o, z + hx * o);
        foeSetup(foes[foes.length - 1]); // route, ground ring and elite aura (world foes got theirs after world())
      }
    });
    // the causeway's arch where it leaves Frostfen: a gloom barrier while Mirewick is still sealed
    {
      const t = TRL[2];
      let s = 0;
      // v18: at the village edge (where a sealed causeway actually stops you), not out at the old zone radius
      while (s < t.L && Math.hypot(at(t, s)[0] - 600, at(t, s)[1] + 400) < ZVR.frost + 1) s += 1;
      const [x, z, hx, hz] = at(t, s),
        ry = Math.atan2(hx, hz), // arch pillars stand across the road
        lkq = PT.find((q) => q.n === t.lk);
      const gem = arch(x, z, ry, 0x5fe0c0);
      portal(x, z, [x, z, 0], 0x5fe0c0, "Mire Causeway", lkq ? lkq.lock : null, null, ry);
      const q = PT[PT.length - 1];
      q.gem = gem;
      q.wk = 1;
    }
    // the old glade portals are now open arches you walk through (a red barrier while locked); the zones' portals back
    // to the glades are gone
    PT.forEach((q) => {
      if (q.n === "Frostfen (needs Lv 3)" || q.n === "Cinderwaste (needs Lv 4)") q.wk = 1;
      if (q.n === "Wispwood Glade (Lamplight)" || q.n === "Cinder Hollow (Lamplight)") {
        q.wk = 1;
        q.r.visible = q.g.visible = false;
      }
    });
    window.__shopRooms(); // v16: the shops' own rooms (see shop())
    window.__t1 = S.children.length;
  };
  // v14 Mirewick tidy (also from the end of 13-editor.js, after BASE, so nothing is added or removed before it):
  // the marsh's hundreds of loose reeds and drowned trunks were one draw call each and many floated above the mud.
  // They are hidden here and redrawn as a few instanced meshes standing on the ground; any in a pool are left out.
  window.__mireTidy = () => {
    const near = (o) => Math.hypot(o.position.x - MWX, o.position.z - MWZ) < ZR + 40;
    const kids = S.children.slice(window.__w0 || 0, window.__w1 || S.children.length).filter(near),
      pools = kids
        .filter(
          (m) =>
            m.isMesh &&
            m.geometry.type === "CylinderGeometry" &&
            m.geometry.parameters.radiusTop >= 3 &&
            m.geometry.parameters.height < 0.2,
        )
        .map((m) => [m.position.x, m.position.z, m.geometry.parameters.radiusTop]),
      groups = new Map();
    kids.forEach((m) => {
      if (!m.isMesh || !m.visible || m.geometry.type !== "CylinderGeometry") return;
      const g = m.geometry.parameters;
      if (g.radiusTop > 0.3 || g.height < 0.9 || m.rotation.x || m.rotation.z) return;
      m.visible = false;
      const x = m.position.x,
        z = m.position.z;
      // v18: drowned trunks inside the village hub go too (it's an open hub now); reeds and posts stay
      const vil = g.radiusBottom >= 0.4 && Math.hypot(x - MWX, z - MWZ) < ZVR.marsh + ZSB + 2;
      if (vil || pools.some(([px, pz, r]) => Math.hypot(x - px, z - pz) < r + 0.4)) {
        for (let i = solids.length - 1; i >= 0; i--)
          if (Math.abs(solids[i].x - x) < 0.01 && Math.abs(solids[i].z - z) < 0.01) solids.splice(i, 1);
        return;
      }
      const key = [g.radiusTop, g.radiusBottom, g.radialSegments, m.material.color.getHex()].join("|");
      if (!groups.has(key)) groups.set(key, { g, c: m.material.color.getHex(), list: [] });
      // stand it on the mud: centre at half its height, a little sunk
      groups.get(key).list.push([x, g.height / 2 - 0.1, z, 1, x * 2.3 + z, 0, 1, g.height, 1]);
    });
    groups.forEach(({ g, c, list }) => inst(Cy(g.radiusTop, g.radiusBottom, 1, g.radialSegments), c, list));
  };
}
const CHESTS = [],
  LAMPS = [],
  SKYL = [];
world();
// NPC name plates (name + role) and floating quest marks
const NNAME = {
  qhub: ["Oona", "Quests"],
  sbram: ["Bram", "Market & gear"],
  ctailor: ["Pip", "Tailor"],
  whub: ["Wren", "Spells & summons"],
  ahub: ["Sage Ilsa", "Change school"],
  hhub: ["Mira", "Healer"],
  hfrost: ["Brother Tolle", "Healer"],
  hember: ["Reka", "Healer"],
  syara: ["Yara", "Furs, charms & gear"],
  sforge: ["Korr", "Forge & gear"],
  bfrost: ["Quest Board", "Frostfen"],
  bember: ["Quest Board", "Cinderwaste"],
  bmarsh: ["Quest Board", "Mirewick"],
};
const QMT = {};
const qmTex = (ch) =>
  QMT[ch] ||
  (QMT[ch] = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    const q = x.createRadialGradient(64, 64, 0, 64, 64, 62);
    q.addColorStop(0, "rgba(255,220,120,.7)");
    q.addColorStop(1, "rgba(255,200,80,0)");
    x.fillStyle = q;
    x.fillRect(0, 0, 128, 128);
    x.font = "900 92px Georgia,serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.lineWidth = 10;
    x.strokeStyle = "#3a2200";
    x.strokeText(ch, 64, 70);
    x.fillStyle = ch === "?" ? "#9affc8" : "#ffd34d";
    x.fillText(ch, 64, 70);
    return new T.CanvasTexture(c);
  })());
NPCS.forEach(npcPlate);
// name plate (and quest mark for quest givers) over an NPC; also used for NPCs placed after the editor (__lateNpcs)
function npcPlate(n) {
  const nn = NNAME[n.kind + n.id];
  if (nn) {
    const c = document.createElement("canvas");
    c.width = 320;
    c.height = 88;
    const x = c.getContext("2d");
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.lineJoin = "round";
    x.font = "800 38px Georgia,serif";
    x.lineWidth = 8;
    x.strokeStyle = "rgba(10,6,20,.9)";
    x.strokeText(nn[0], 160, 32);
    x.fillStyle = "#ffe29a";
    x.fillText(nn[0], 160, 32);
    x.font = "700 22px system-ui";
    x.lineWidth = 6;
    x.strokeText(nn[1], 160, 70);
    x.fillStyle = "#c9b8ff";
    x.fillText(nn[1], 160, 70);
    const sp = new T.Sprite(
      new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, fog: false }),
    );
    sp.scale.set(2.9, 0.8, 1);
    sp.position.y = n.kind === "b" ? 4.1 : 4.15;
    sp.renderOrder = 4;
    n.o.add(sp);
    n.np = sp;
  }
  if (n.kind === "q" || n.kind === "b") {
    const m = new T.Sprite(new T.SpriteMaterial({ map: qmTex("!"), transparent: true, depthWrite: false, fog: false }));
    m.scale.setScalar(1.25);
    m.position.y = 5.1;
    m.visible = false;
    m.renderOrder = 5;
    n.o.add(m);
    n.qm = m;
  }
}
const mkAg = () =>
  new T.Mesh(
    new T.RingGeometry(0.92, 1, 48),
    new T.MeshBasicMaterial({
      color: 0xff5a4a,
      transparent: true,
      opacity: 0.4,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
// patrols: every foe walks a fixed, predictable route (up and down its lane of the street or road, or a small loop on open ground) and never chases
// patrol routes never cut through houses, stones, carts, fire pits or trees any more: waypoints inside a solid are dropped,
// and so is any leg that would pass through one (foes used to walk straight through the glade cart and fire pit)
const clr = (x, z, m) =>
  !solids.some(
    (o) => Math.abs(x - o.x) < o.r + 3 && Math.abs(z - o.z) < o.r + 3 && Math.hypot(x - o.x, z - o.z) < o.r + (m || 1),
  );
const legOK = (a, b) => {
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    if (!clr(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.8)) return false;
  }
  return true;
};
// v14: a named function so foes added later (the trails' foes, built from 13-editor.js) get the same route, ring and aura
function foeSetup(f) {
  const z = zoneAt(f.hx, f.hz),
    lx = f.hx - OX,
    ax = Math.abs(lx),
    sg = Math.sign(lx) || 1;
  let pts = null;
  f.boss = !!f.dboss || (f.dun == null && f.kind === "gloom" && f.t >= 4 && (f.t === 5 || !f.tw));
  if (!clr(f.hx, f.hz, 0.9)) {
    for (let r = 1; r < 8; r += 0.5) {
      let ok = 0;
      for (let a = 0; a < 6.28; a += 0.5) {
        const x = f.hx + Math.cos(a) * r,
          q = f.hz + Math.sin(a) * r;
        if (okp(x, q) && !safe(x, q) && clr(x, q, 0.9)) {
          f.hx = x;
          f.hz = q;
          f.o.position.set(x, 0, q);
          ok = 1;
          break;
        }
      }
      if (ok) break;
    }
  }
  const rh = z === "hub" ? rdHit(lx, f.hz - OZ) : null;
  if (!f.boss) {
    if (z === "hub" && ax < 12)
      pts = [
        [f.hx, Math.min(OZ - 22, f.hz + 6)],
        [f.hx, Math.max(OZ - SL + 12, f.hz - 6)],
      ];
    else if (rh && !rh.g) {
      // v12: road foes pace up and down their lane of the winding road
      pts = [Math.max(8, rh.s - 8), Math.min(rh.R.L - 6, rh.s + 8)].map((s) => {
        const [x, q, hx, hz] = rdAt(rh.R, s);
        return [OX + x - hz * rh.o, OZ + q + hx * rh.o];
      });
    } else {
      const r = z === "tower" ? 2.5 : z === "dun" ? 2.2 : z === "hub" ? 3 : 4.5;
      pts = [
        [f.hx + r, f.hz],
        [f.hx, f.hz + r],
        [f.hx - r, f.hz],
        [f.hx, f.hz - r],
      ];
    }
    pts = pts.filter(([x, q]) => okp(x, q) && !safe(x, q) && clr(x, q));
    const kept = [];
    pts.forEach((p) => {
      if (!kept.length || legOK(kept[kept.length - 1], p)) kept.push(p);
    });
    if (kept.length > 2 && !legOK(kept[kept.length - 1], kept[0])) kept.pop();
    pts = kept;
    // v11: foes whose usual route got trimmed away (road ends by the glade camps, crowded corners) used to just stand there.
    // Search outward for any short open beat to walk instead, through home if nothing else fits.
    if (pts.length < 2) {
      const ok = (p) => okp(p[0], p[1]) && !safe(p[0], p[1]) && clr(p[0], p[1]),
        H = [f.hx, f.hz];
      let best = null;
      for (let r = 7; r >= 2 && !best; r -= 0.5)
        for (let a = 0; a < 6.28 && !best; a += 0.35) {
          const b = [f.hx + Math.cos(a) * r, f.hz + Math.sin(a) * r],
            c = [f.hx - Math.cos(a) * r, f.hz - Math.sin(a) * r];
          if (ok(b) && ok(c) && legOK(b, c)) best = [b, c];
          else if (ok(b) && legOK(H, b)) best = [H, b];
        }
      if (best) pts = best;
    }
  }
  f.path = pts && pts.length > 1 ? pts : null;
  f.pi = 0;
  f.s0 = f.o.scale.x;
  f.R = f.boss ? 5 : 3 + f.t * 0.3 + (f.big ? 0.6 : 0);
  const r = mkAg();
  r.rotation.x = -Math.PI / 2;
  r.scale.setScalar(f.R);
  r.visible = false;
  S.add(r);
  f.ring = r;
  const au = new T.Sprite(
    new T.SpriteMaterial({
      map: GLT,
      color: 0xffb830,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }),
  );
  au.scale.setScalar(f.kind === "gloom" ? 5 : 4.2);
  au.position.y = 1.6;
  f.o.add(au);
  f.au = au;
  rollElite(f);
}
// v15: zone foes that stood out in the open wilds (now off limits) move onto the zone streets: dealt out street by
// street, the weakest nearest the village and the toughest by the dead end. No randomness and the foe order is kept, so
// every machine agrees (multiplayer matches foes by index).
// v16: chests that stood out in a zone's wilds or by the old street ends (out of reach now the streets are their own
// places) move to the landmark plazas at the streets' dead ends, dealt out street by street in a fixed order.
{
  const reach = (x, z) =>
      okp(x, z) || [0, 1, 2, 3, 4, 5, 6, 7].some((k) => okp(x + Math.cos(k * 0.785) * 2, z + Math.sin(k * 0.785) * 2)),
    per = {};
  CHESTS.forEach((c) => {
    const zk = zoneAt(c.x, c.z);
    if (!ZCEN[zk] || zsIdx(c.x, c.z) >= 0 || reach(c.x, c.z)) return;
    const st = ZRD.filter((t) => t.zk === zk && t.n),
      n = (per[zk] = (per[zk] || 0) + 1) - 1,
      t = st[n % st.length],
      k = Math.floor(n / st.length),
      // v32: out at the plaza's sides (was x ±7, which stood inside the road boss's battle circle)
      x = t.X + (k % 2 ? -11.5 : 11.5),
      z = -ZSL + 15 - Math.floor(k / 2) * 3;
    c.x = x;
    c.z = z;
    c.o.position.set(x, 0, z);
  });
}
["frost", "ember", "marsh"].forEach((zk) => {
  const st = ZRD.filter((t) => t.zk === zk && t.n),
    c = ZCEN[zk],
    // v18: foes in the village hub itself move out to the streets too (the villages are safe)
    list = foes
      .map((f, i) => [f, i])
      .filter(
        ([f]) =>
          f.dun == null &&
          zoneAt(f.hx, f.hz) === zk &&
          (!okp(f.hx, f.hz) || (zsIdx(f.hx, f.hz) < 0 && Math.hypot(f.hx - c[0], f.hz - c[1]) <= ZVR[zk] + 6)),
      );
  if (!list.length || !st.length) return;
  const tv = (f) => f.t + (f.big ? 0.5 : 0);
  list.sort((a, b) => tv(a[0]) - tv(b[0]) || a[1] - b[1]);
  const per = st.map(() => []);
  list.forEach(([f], k) => per[k % st.length].push(f));
  st.forEach((t, si) => {
    const s0 = 30; // v16: streets are their own places now; keep the first stretch by the arch home clear
    per[si].forEach((f, k, a) => {
      const s = s0 + ((t.L - s0) * (k + 0.5)) / a.length,
        [lx, lz, hx, hz] = rdAt(t, s),
        o = k % 2 ? 2.5 : -2.5,
        x = OX + lx - hz * o,
        z = OZ + lz + hx * o;
      f.hx = x;
      f.hz = z;
      f.o.position.set(x, 0, z);
    });
  });
});
foes.forEach(foeSetup);
// about one street foe in six rolls an elite trait (re-rolled each respawn); never bosses or tower guardians
function rollElite(f) {
  f.elite =
    !f.boss && !f.tw && Math.random() < 0.16 ? ["armored", "vampiric", "frenzied"][(Math.random() * 3) | 0] : null;
  f.au.visible = !!f.elite;
}
// LINES = the green safe-zone rings and sidewalk edge lines; with foe rings they follow the "Ground markers" option
const LINES = [];
const safeRing = (x, z, r) => {
  const m = new T.Mesh(
    new T.RingGeometry(r - 0.3, r, 56),
    new T.MeshBasicMaterial({
      color: 0x5aff9a,
      transparent: true,
      opacity: 0.3,
      side: T.DoubleSide,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.17, z);
  // v47 polish: the green safe rings are gone for good (lamp-lit sidewalks are the safe places); the mesh stays, hidden,
  // so scene-child indices (editor BASE) don't shift
  m.visible = false;
  m.userData.safeR = 1;
  S.add(m);
  LINES.push(m);
};
safeRing(OX, OZ, 18.5);
safeRing(OX, OZ + MLZ, MLR + 0.5);
SAFEC.forEach((c) => safeRing(c[0], c[1], c[2]));
// story wards: low banks of drifting gloom across the locked streets (soft at the edges, fading upward, slowly rolling)
const MISTT = (() => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const x = c.getContext("2d");
  for (let i = 0; i < 70; i++) {
    const px = Math.random() * 256,
      py = 40 + Math.random() * 80,
      r = 14 + Math.random() * 30,
      q = x.createRadialGradient(px, py, 0, px, py, r);
    q.addColorStop(0, "rgba(190,160,255,.22)");
    q.addColorStop(1, "rgba(190,160,255,0)");
    x.fillStyle = q;
    x.fillRect(0, 0, 256, 128);
    // wrap blobs so the texture tiles sideways while it scrolls
    if (px < r || px > 256 - r) {
      const p2 = px < r ? px + 256 : px - 256,
        q2 = x.createRadialGradient(p2, py, 0, p2, py, r);
      q2.addColorStop(0, "rgba(190,160,255,.22)");
      q2.addColorStop(1, "rgba(190,160,255,0)");
      x.fillStyle = q2;
      x.fillRect(0, 0, 256, 128);
    }
  }
  x.globalCompositeOperation = "destination-in";
  const f = x.createLinearGradient(0, 0, 0, 128);
  f.addColorStop(0, "rgba(0,0,0,0)");
  f.addColorStop(0.55, "rgba(0,0,0,.8)");
  f.addColorStop(1, "rgba(0,0,0,1)");
  x.fillStyle = f;
  x.fillRect(0, 0, 256, 128);
  const f2 = x.createLinearGradient(0, 0, 256, 0);
  f2.addColorStop(0, "rgba(0,0,0,.25)");
  f2.addColorStop(0.15, "#000");
  f2.addColorStop(0.85, "#000");
  f2.addColorStop(1, "rgba(0,0,0,.25)");
  x.fillStyle = f2;
  x.fillRect(0, 0, 256, 128);
  const t = new T.CanvasTexture(c);
  t.wrapS = T.RepeatWrapping;
  return t;
})();
SLK.forEach((L) => {
  const [lx, lz, ry, w] = L.w;
  L.ms = [];
  // three soft layers a little apart, so the bank has depth instead of reading as a flat pane
  [-0.9, 0, 0.9].forEach((o, i) => {
    const tx = MISTT.clone();
    tx.needsUpdate = true;
    tx.repeat.x = 0.8 + i * 0.25;
    const m = new T.Mesh(
      new T.PlaneGeometry(w + 1.5, 3.4),
      new T.MeshBasicMaterial({
        map: tx,
        color: 0xb090ff,
        transparent: true,
        opacity: 0,
        side: T.DoubleSide,
        blending: T.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    m.position.set(OX + lx + (ry ? o : 0), 1.6, OZ + lz + (ry ? 0 : o));
    m.rotation.y = ry;
    S.add(m);
    L.ms.push(m);
  });
  L.m = L.ms[1];
  const gl = new T.Sprite(
    new T.SpriteMaterial({
      map: GLT,
      color: 0x7a5ad6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }),
  );
  gl.scale.set(w * 1.2, 3, 1);
  gl.position.set(OX + lx, 0.8, OZ + lz);
  S.add(gl);
  L.g = gl;
  L.k = 1;
});
LKON = true;
{
  const lm = new T.MeshBasicMaterial({
    color: 0x5aff9a,
    transparent: true,
    opacity: 0.7,
    blending: T.AdditiveBlending,
    depthWrite: false,
  });
  lm.visible = false; // v47 polish: no green sidewalk edge lines anywhere (meshes stay for scene-child indices)
  // v12: Gloomway's lines break for Market Lane (its own ring marks it) and the road mouths; the road lines follow the curves
  [-1, 1].forEach((sd) => {
    const cut = [[MLZ + MLR + 0.5, MLZ - MLR - 0.5], sd > 0 ? [HZ + RDW, HZ - RDW] : [AZ + RDW, AZ - RDW]];
    let z0 = -16.5;
    [...cut, [PZ + 11, 0]].forEach(([a, b]) => {
      const L = z0 - a,
        m = new T.Mesh(B(0.14, 0.04, L), lm);
      m.position.set(OX + sd * (SC + 0.25), 0.13, OZ + (z0 + a) / 2);
      S.add(m);
      LINES.push(m);
      z0 = b;
    });
  });
  RDS.forEach((R) =>
    [-1, 1].forEach((rs) => LINES.push(rdRibbon(R, rs * 5.25 - 0.07, rs * 5.25 + 0.07, 0.13, lm, 1, 7, R.L - 2))),
  );
}
function setLines() {
  const on = !P.nolines;
  LINES.forEach((m) => (m.visible = on && !m.userData.safeR));
}
