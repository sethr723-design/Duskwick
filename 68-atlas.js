// DUSKWICK - 68-atlas.js (v45, loads LAST): the storybook world map. Only top-level name ATLAS.
// M (or a click on the minimap) opens a hand-painted parchment map of the whole world. Everything is read live from the
// world data: walkable ground (okp, LKON off), zoneAt, the town roads RDS + Gloomway, trails TRL, zone streets ZRD (moved
// streets through zsW when ZSF.on), HOUSES, NPCS quest marks, the quest star QTG and you. Land = the walkable ground grown
// outwards (wide round towns and zones, a thin strip along trails) over a painted sea; a river crosses the middle of every
// trail under a plank bridge, stone arches stand at trail ends and street starts.
// The painted base is built once in the background (a generator run a few ms per tick, ~4 s after the first explore
// frame) and rebuilt when the street layout or the Reach changes; banners, markers, frame and compass are drawn per frame
// in screen space. While open: paused (old value restored), keys swallowed. No scene objects, no save fields, no NET.
// Console: ATLAS.open() / ATLAS.close() / ATLAS.rebuild().
const ATLAS = (() => {
  const CS = 4; // grid cell, world units
  const ZN = { hub: 1, frost: 2, ember: 3, marsh: 4, reach: 5 },
    NZ = [null, "hub", "frost", "ember", "marsh", "reach"];
  // land colours: wild ground / walkable ground
  const ZC = {
    hub: [120, 178, 92],
    frost: [222, 233, 240],
    ember: [104, 70, 56],
    marsh: [104, 136, 84],
    reach: [170, 152, 210],
  };
  const ZW = {
    hub: [172, 208, 120],
    frost: [248, 251, 252],
    ember: [150, 110, 82],
    marsh: [146, 170, 108],
    reach: [208, 194, 238],
  };
  const NAME = { frost: "Frostfen", ember: "Cinderwaste", marsh: "Mirewick" };
  const ROOF = ["#c0392b", "#2e6fb0", "#3e8e41", "#8e44ad", "#d68a2a", "#a0522d", "#2a8a8a"];
  const hsh = (a, b) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const vn = (x, z) => {
    const xi = Math.floor(x),
      zi = Math.floor(z),
      fx = x - xi,
      fz = z - zi,
      u = fx * fx * (3 - 2 * fx),
      v = fz * fz * (3 - 2 * fz),
      a = hsh(xi, zi),
      b = hsh(xi + 1, zi),
      c = hsh(xi, zi + 1),
      d = hsh(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const st = { key: null, gen: null, done: false, base: null, B: null, ppu: 1, prog: 0, lab: [], tick: 0 };
  let open = false,
    wrap = null,
    cv = null,
    view = null,
    pz = false,
    raf = 0,
    firstT = 0,
    drag = null;

  const reachOn = () => typeof REACH === "object" && REACH && typeof P === "object" && P && !!P.reach;
  const zmLive = () =>
    typeof ZMV === "object" &&
    ZMV.on &&
    typeof ZMOVE === "object" &&
    Array.isArray(ZMOVE.RIV) &&
    Array.isArray(ZMOVE.cross);
  const keyNow = () => [!!ZSF.on, reachOn(), zmLive(), typeof ZCEN === "object" ? JSON.stringify(ZCEN) : ""].join("|");
  const sbox = (i) => {
    const X = ZSX0 + i * ZSDX;
    let b = [X - 56, X + 56, -ZSL - 26, 16];
    if (ZSF.on && typeof zsBoxW === "function") b = zsBoxW(i, b);
    return b;
  };
  const hubBox = () => [OX + RDS[1].gx - 30, OX + RDS[0].gx + 30, OZ + TCZ - 24, OZ + 40];
  // street i's polyline in world coords (moved when the open-roads layout is live)
  const sMove = (t) => ZSF.on && t.i != null && t.i < ZSF.length;
  const rdPts = (t) => t.p.map(([x, z]) => (sMove(t) ? zsW(t.i, OX + x, OZ + z) : [OX + x, OZ + z]));
  const wPt = (t, x, z) => (sMove(t) ? zsW(t.i, x, z) : [x, z]);

  function bounds() {
    const b = [Infinity, -Infinity, Infinity, -Infinity],
      add = (x0, x1, z0, z1) => {
        b[0] = Math.min(b[0], x0);
        b[1] = Math.max(b[1], x1);
        b[2] = Math.min(b[2], z0);
        b[3] = Math.max(b[3], z1);
      },
      hb = hubBox();
    add(hb[0], hb[1], hb[2], hb[3]);
    for (const k in ZCEN) {
      const [x, z] = ZCEN[k];
      add(x - ZR - 10, x + ZR + 10, z - ZR - 10, z + ZR + 10);
    }
    TRL.forEach((t) => add(t.bb[0] + OX, t.bb[1] + OX, t.bb[2] + OZ, t.bb[3] + OZ));
    for (let i = 0; i < ZSTR.length; i++) {
      const q = sbox(i);
      add(q[0], q[1], q[2], q[3]);
    }
    if (reachOn()) add(1750, 2050, -1160, -340);
    return [b[0] - 70, b[1] + 70, b[2] - 70, b[3] + 70];
  }
  function bigAt(x, z, hb) {
    if (x > hb[0] && x < hb[1] && z > hb[2] && z < hb[3]) return 1;
    for (const k in ZCEN) if (Math.hypot(x - ZCEN[k][0], z - ZCEN[k][1]) < ZR + 6) return 1;
    if (zsIdx(x, z) >= 0) return 1;
    if (reachOn() && REACH.inR && REACH.inR(x, z)) return 1;
    return 0;
  }
  function zcode(x, z) {
    if (reachOn() && REACH.inR && REACH.inR(x, z)) return 5;
    return ZN[zoneAt(x, z)] || 0;
  }
  // chamfer distance (world units) from every source cell
  function dist(src, gw, gh) {
    const n = gw * gh,
      D = new Float32Array(n),
      a = CS,
      d2 = CS * 1.4142;
    for (let o = 0; o < n; o++) D[o] = src[o] ? 0 : 1e9;
    for (let j = 0; j < gh; j++)
      for (let i = 0; i < gw; i++) {
        const o = j * gw + i;
        let v = D[o];
        if (i > 0) v = Math.min(v, D[o - 1] + a);
        if (j > 0) {
          v = Math.min(v, D[o - gw] + a);
          if (i > 0) v = Math.min(v, D[o - gw - 1] + d2);
          if (i < gw - 1) v = Math.min(v, D[o - gw + 1] + d2);
        }
        D[o] = v;
      }
    for (let j = gh - 1; j >= 0; j--)
      for (let i = gw - 1; i >= 0; i--) {
        const o = j * gw + i;
        let v = D[o];
        if (i < gw - 1) v = Math.min(v, D[o + 1] + a);
        if (j < gh - 1) {
          v = Math.min(v, D[o + gw] + a);
          if (i < gw - 1) v = Math.min(v, D[o + gw + 1] + d2);
          if (i > 0) v = Math.min(v, D[o + gw - 1] + d2);
        }
        D[o] = v;
      }
    return D;
  }
  // a point and heading at arc length s along a world polyline
  function along(pts, s) {
    let acc = 0;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1],
        b = pts[k],
        l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + l >= s || k === pts.length - 1) {
        const t = l ? Math.min(1, (s - acc) / l) : 0;
        return {
          x: a[0] + (b[0] - a[0]) * t,
          z: a[1] + (b[1] - a[1]) * t,
          dx: (b[0] - a[0]) / (l || 1),
          dz: (b[1] - a[1]) / (l || 1),
        };
      }
      acc += l;
    }
    return { x: pts[0][0], z: pts[0][1], dx: 1, dz: 0 };
  }
  const plen = (pts) => {
    let L = 0;
    for (let k = 1; k < pts.length; k++) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    return L;
  };

  // ------------------------------------------------------------------ icons (base pixels, upright)
  const IC = {
    tree(g, x, y, r) {
      g.fillStyle = "#6b4a2a";
      g.fillRect(x - r * 0.15, y, r * 0.3, r * 0.7);
      g.beginPath();
      g.arc(x, y - r * 0.2, r * 0.75, 0, 7);
      g.fillStyle = "#2f6b34";
      g.fill();
      g.lineWidth = Math.max(1, r * 0.12);
      g.strokeStyle = "#1b3d1e";
      g.stroke();
      g.beginPath();
      g.arc(x - r * 0.25, y - r * 0.45, r * 0.3, 0, 7);
      g.fillStyle = "#4f9a4a";
      g.fill();
    },
    pine(g, x, y, r, snow) {
      g.fillStyle = "#5a3d22";
      g.fillRect(x - r * 0.12, y + r * 0.3, r * 0.24, r * 0.5);
      for (let k = 0; k < 3; k++) {
        const yy = y + r * 0.45 - k * r * 0.45,
          w = r * (0.8 - k * 0.2);
        g.beginPath();
        g.moveTo(x - w, yy);
        g.lineTo(x + w, yy);
        g.lineTo(x, yy - r * 0.75);
        g.closePath();
        g.fillStyle = snow ? "#2d5a46" : "#2c6236";
        g.fill();
        g.lineWidth = Math.max(1, r * 0.1);
        g.strokeStyle = "#163222";
        g.stroke();
        if (snow) {
          g.beginPath();
          g.moveTo(x - w * 0.45, yy - r * 0.38);
          g.lineTo(x + w * 0.45, yy - r * 0.38);
          g.lineTo(x, yy - r * 0.75);
          g.closePath();
          g.fillStyle = "#f6fbff";
          g.fill();
        }
      }
    },
    rock(g, x, y, r, c) {
      g.beginPath();
      g.moveTo(x - r, y + r * 0.4);
      g.lineTo(x - r * 0.5, y - r * 0.5);
      g.lineTo(x + r * 0.2, y - r * 0.7);
      g.lineTo(x + r, y + r * 0.4);
      g.closePath();
      g.fillStyle = c || "#4a3530";
      g.fill();
      g.lineWidth = Math.max(1, r * 0.12);
      g.strokeStyle = "#1e1210";
      g.stroke();
    },
    lava(g, x, y, r) {
      g.beginPath();
      g.ellipse(x, y, r, r * 0.6, 0, 0, 7);
      g.fillStyle = "#3a1e14";
      g.fill();
      g.beginPath();
      g.ellipse(x, y, r * 0.78, r * 0.44, 0, 0, 7);
      g.fillStyle = "#ff6a1a";
      g.fill();
      g.beginPath();
      g.ellipse(x - r * 0.15, y - r * 0.05, r * 0.35, r * 0.18, 0, 0, 7);
      g.fillStyle = "#ffd04a";
      g.fill();
    },
    volcano(g, x, y, r) {
      g.beginPath();
      g.moveTo(x - r * 1.2, y + r * 0.6);
      g.lineTo(x - r * 0.3, y - r * 0.7);
      g.lineTo(x + r * 0.3, y - r * 0.7);
      g.lineTo(x + r * 1.2, y + r * 0.6);
      g.closePath();
      g.fillStyle = "#5a3a2c";
      g.fill();
      g.lineWidth = Math.max(1, r * 0.1);
      g.strokeStyle = "#24140e";
      g.stroke();
      g.beginPath();
      g.ellipse(x, y - r * 0.7, r * 0.3, r * 0.1, 0, 0, 7);
      g.fillStyle = "#ff7a1a";
      g.fill();
      g.strokeStyle = "#ff7a1a";
      g.lineWidth = Math.max(1, r * 0.12);
      g.beginPath();
      g.moveTo(x - r * 0.1, y - r * 0.65);
      g.quadraticCurveTo(x - r * 0.3, y - r * 0.1, x - r * 0.5, y + r * 0.3);
      g.moveTo(x + r * 0.15, y - r * 0.65);
      g.quadraticCurveTo(x + r * 0.25, y, x + r * 0.45, y + r * 0.2);
      g.stroke();
    },
    reeds(g, x, y, r) {
      g.strokeStyle = "#3d5a2a";
      g.lineWidth = Math.max(1, r * 0.12);
      g.beginPath();
      for (let k = -1; k <= 1; k++) {
        g.moveTo(x + k * r * 0.3, y + r * 0.4);
        g.lineTo(x + k * r * 0.45, y - r * 0.6);
      }
      g.stroke();
      g.fillStyle = "#6a4a2a";
      for (let k = -1; k <= 1; k++) g.fillRect(x + k * r * 0.45 - r * 0.08, y - r * 0.75, r * 0.16, r * 0.3);
    },
    willow(g, x, y, r) {
      g.fillStyle = "#4a3a24";
      g.fillRect(x - r * 0.12, y - r * 0.2, r * 0.24, r * 0.8);
      g.beginPath();
      g.arc(x, y - r * 0.3, r * 0.75, Math.PI, 0);
      g.lineTo(x + r * 0.75, y + r * 0.3);
      g.lineTo(x - r * 0.75, y + r * 0.3);
      g.closePath();
      g.fillStyle = "#4a6e3a";
      g.fill();
      g.lineWidth = Math.max(1, r * 0.1);
      g.strokeStyle = "#22361c";
      g.stroke();
    },
    crystal(g, x, y, r) {
      g.fillStyle = "#b48aff";
      g.strokeStyle = "#3a2466";
      g.lineWidth = Math.max(1, r * 0.1);
      [
        [-0.35, 0.8],
        [0, 1.1],
        [0.35, 0.7],
      ].forEach(([o, h]) => {
        g.beginPath();
        g.moveTo(x + o * r - r * 0.18, y + r * 0.4);
        g.lineTo(x + o * r, y + r * 0.4 - h * r);
        g.lineTo(x + o * r + r * 0.18, y + r * 0.4);
        g.closePath();
        g.fill();
        g.stroke();
      });
    },
    house(g, x, y, r, roof, zone) {
      g.fillStyle = zone === "ember" ? "#c8a07a" : "#f1dfb8";
      g.fillRect(x - r * 0.7, y - r * 0.2, r * 1.4, r * 0.9);
      g.lineWidth = Math.max(1, r * 0.1);
      g.strokeStyle = "#3a2412";
      g.strokeRect(x - r * 0.7, y - r * 0.2, r * 1.4, r * 0.9);
      g.beginPath();
      g.moveTo(x - r * 0.95, y - r * 0.15);
      g.lineTo(x, y - r * 1.05);
      g.lineTo(x + r * 0.95, y - r * 0.15);
      g.closePath();
      g.fillStyle = roof;
      g.fill();
      g.stroke();
      if (zone === "frost") {
        g.beginPath();
        g.moveTo(x - r * 0.5, y - r * 0.6);
        g.lineTo(x, y - r * 1.05);
        g.lineTo(x + r * 0.5, y - r * 0.6);
        g.closePath();
        g.fillStyle = "#ffffff";
        g.fill();
      }
      g.fillStyle = "#5a3a1c";
      g.fillRect(x - r * 0.15, y + r * 0.25, r * 0.3, r * 0.45);
      g.fillStyle = "#ffe08a";
      g.fillRect(x + r * 0.3, y + r * 0.05, r * 0.22, r * 0.2);
    },
    fountain(g, x, y, r) {
      g.beginPath();
      g.ellipse(x, y, r, r * 0.65, 0, 0, 7);
      g.fillStyle = "#9a9aa4";
      g.fill();
      g.lineWidth = Math.max(1, r * 0.1);
      g.strokeStyle = "#3a3a44";
      g.stroke();
      g.beginPath();
      g.ellipse(x, y, r * 0.75, r * 0.45, 0, 0, 7);
      g.fillStyle = "#6ec6e6";
      g.fill();
      g.fillStyle = "#c8c8d0";
      g.fillRect(x - r * 0.12, y - r * 0.7, r * 0.24, r * 0.7);
      g.beginPath();
      g.arc(x, y - r * 0.75, r * 0.2, 0, 7);
      g.fillStyle = "#bfe8ff";
      g.fill();
    },
    spire(g, x, y, r) {
      g.fillStyle = "#3a2e52";
      g.strokeStyle = "#140e22";
      g.lineWidth = Math.max(1, r * 0.08);
      g.beginPath();
      g.moveTo(x - r * 0.35, y + r * 0.6);
      g.lineTo(x - r * 0.25, y - r * 0.8);
      g.lineTo(x + r * 0.25, y - r * 0.8);
      g.lineTo(x + r * 0.35, y + r * 0.6);
      g.closePath();
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(x - r * 0.38, y - r * 0.8);
      g.lineTo(x, y - r * 1.6);
      g.lineTo(x + r * 0.38, y - r * 0.8);
      g.closePath();
      g.fillStyle = "#5a3a8a";
      g.fill();
      g.stroke();
      g.fillStyle = "#b98aff";
      g.fillRect(x - r * 0.08, y - r * 0.5, r * 0.16, r * 0.25);
    },
    arch(g, x, y, r) {
      g.fillStyle = "#a8a29a";
      g.strokeStyle = "#3a3632";
      g.lineWidth = Math.max(1, r * 0.1);
      g.beginPath();
      g.moveTo(x - r * 0.8, y + r * 0.5);
      g.lineTo(x - r * 0.8, y - r * 0.3);
      g.arc(x, y - r * 0.3, r * 0.8, Math.PI, 0);
      g.lineTo(x + r * 0.8, y + r * 0.5);
      g.lineTo(x + r * 0.45, y + r * 0.5);
      g.lineTo(x + r * 0.45, y - r * 0.3);
      g.arc(x, y - r * 0.3, r * 0.45, 0, Math.PI, true);
      g.lineTo(x - r * 0.45, y + r * 0.5);
      g.closePath();
      g.fill();
      g.stroke();
    },
    cave(g, x, y, r) {
      g.beginPath();
      g.arc(x, y + r * 0.4, r, Math.PI, 0);
      g.closePath();
      g.fillStyle = "#8a96a6";
      g.fill();
      g.lineWidth = Math.max(1, r * 0.1);
      g.strokeStyle = "#2a323c";
      g.stroke();
      g.beginPath();
      g.arc(x, y + r * 0.4, r * 0.42, Math.PI, 0);
      g.closePath();
      g.fillStyle = "#1a1e26";
      g.fill();
    },
    lake(g, x, y, r) {
      g.beginPath();
      g.ellipse(x, y, r * 1.2, r * 0.7, 0, 0, 7);
      g.fillStyle = "#bfe4f8";
      g.fill();
      g.lineWidth = Math.max(1, r * 0.1);
      g.strokeStyle = "#5a8aa8";
      g.stroke();
      g.beginPath();
      g.moveTo(x - r * 0.6, y - r * 0.1);
      g.lineTo(x - r * 0.1, y + r * 0.15);
      g.lineTo(x + r * 0.5, y - r * 0.2);
      g.strokeStyle = "#ffffff";
      g.stroke();
    },
    tent(g, x, y, r) {
      g.beginPath();
      g.moveTo(x - r, y + r * 0.5);
      g.lineTo(x, y - r * 0.8);
      g.lineTo(x + r, y + r * 0.5);
      g.closePath();
      g.fillStyle = "#c8643a";
      g.fill();
      g.lineWidth = Math.max(1, r * 0.1);
      g.strokeStyle = "#3a1a0c";
      g.stroke();
      g.beginPath();
      g.moveTo(x, y + r * 0.5);
      g.lineTo(x, y - r * 0.2);
      g.lineTo(x + r * 0.3, y + r * 0.5);
      g.fillStyle = "#3a1a0c";
      g.fill();
    },
    stones(g, x, y, r) {
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2,
          sx = x + Math.cos(a) * r * 0.8,
          sy = y + Math.sin(a) * r * 0.45;
        g.fillStyle = "#9aa4ae";
        g.fillRect(sx - r * 0.12, sy - r * 0.5, r * 0.24, r * 0.5);
        g.lineWidth = 1;
        g.strokeStyle = "#2a323a";
        g.strokeRect(sx - r * 0.12, sy - r * 0.5, r * 0.24, r * 0.5);
      }
    },
    lantern(g, x, y, r) {
      g.fillStyle = "#2a1e14";
      g.fillRect(x - r * 0.08, y - r * 0.6, r * 0.16, r * 1.2);
      g.beginPath();
      g.arc(x, y - r * 0.7, r * 0.42, 0, 7);
      g.fillStyle = "rgba(255,210,110,.45)";
      g.fill();
      g.beginPath();
      g.arc(x, y - r * 0.7, r * 0.2, 0, 7);
      g.fillStyle = "#ffd36a";
      g.fill();
    },
    steeple(g, x, y, r) {
      IC.house(g, x, y + r * 0.2, r * 0.8, "#5a5a6a", "");
      g.fillStyle = "#d8ccb4";
      g.fillRect(x - r * 0.2, y - r * 1.1, r * 0.4, r * 0.7);
      g.beginPath();
      g.moveTo(x - r * 0.28, y - r * 1.1);
      g.lineTo(x, y - r * 1.7);
      g.lineTo(x + r * 0.28, y - r * 1.1);
      g.closePath();
      g.fillStyle = "#4a4a5a";
      g.fill();
    },
    hut(g, x, y, r) {
      IC.house(g, x, y, r * 0.9, "#4a3a5a", "");
      g.fillStyle = "#7affb0";
      g.beginPath();
      g.arc(x + r * 0.55, y - r * 0.9, r * 0.14, 0, 7);
      g.fill();
    },
    forge(g, x, y, r) {
      IC.house(g, x, y, r * 0.9, "#4a2a1c", "ember");
      g.fillStyle = "#3a2a24";
      g.fillRect(x + r * 0.35, y - r * 1.2, r * 0.24, r * 0.6);
      g.beginPath();
      g.arc(x + r * 0.47, y - r * 1.35, r * 0.2, 0, 7);
      g.fillStyle = "#ff8a2a";
      g.fill();
    },
    lock(g, x, y, r) {
      g.lineWidth = Math.max(1.5, r * 0.22);
      g.strokeStyle = "#3a2a1a";
      g.beginPath();
      g.arc(x, y - r * 0.2, r * 0.42, Math.PI, 0);
      g.stroke();
      g.fillStyle = "#d8a83a";
      g.fillRect(x - r * 0.6, y - r * 0.2, r * 1.2, r * 0.9);
      g.lineWidth = Math.max(1, r * 0.12);
      g.strokeRect(x - r * 0.6, y - r * 0.2, r * 1.2, r * 0.9);
    },
  };
  const CULI = {
    den: "cave",
    lake: "lake",
    stones: "stones",
    camp: "tent",
    crater: "volcano",
    gate: "arch",
    forge: "forge",
    witch: "hut",
    chapel: "steeple",
    shrine: "stones",
    lantern: "lantern",
  };

  // ------------------------------------------------------------------ the painted base (generator)
  function* build() {
    st.done = false;
    st.prog = 0;
    const B = bounds(),
      hb = hubBox(),
      gw = Math.ceil((B[1] - B[0]) / CS),
      gh = Math.ceil((B[3] - B[2]) / CS),
      n = gw * gh,
      wk = new Uint8Array(n),
      wb = new Uint8Array(n),
      zc = new Uint8Array(n);
    const cx = (i) => B[0] + (i + 0.5) * CS,
      cz = (j) => B[2] + (j + 0.5) * CS;
    for (let j = 0; j < gh; j++) {
      const lk = LKON;
      LKON = false;
      try {
        for (let i = 0; i < gw; i++) {
          const x = cx(i),
            z = cz(j),
            o = j * gw + i,
            c = zcode(x, z);
          zc[o] = c;
          if (c && okp(x, z)) {
            wk[o] = 1;
            wb[o] = bigAt(x, z, hb);
          }
        }
      } finally {
        LKON = lk;
      }
      st.prog = (j / gh) * 0.6;
      if (j % 3 === 2) yield;
    }
    const D1 = dist(wk, gw, gh);
    yield;
    const Db = dist(wb, gw, gh);
    yield;
    // land 2 / shallows 1 / sea 0, with wobbly coasts
    const L = new Uint8Array(n);
    for (let j = 0; j < gh; j++)
      for (let i = 0; i < gw; i++) {
        const o = j * gw + i,
          x = cx(i),
          z = cz(j),
          wob = (vn(x / 46, z / 46) - 0.5) * 22 + (vn(x / 13 + 7, z / 13) - 0.5) * 7;
        L[o] = D1[o] <= 7 + wob * 0.2 || Db[o] <= 34 + wob ? 2 : D1[o] <= 14 + wob * 0.3 || Db[o] <= 46 + wob ? 1 : 0;
      }
    // rivers: the re-layout's real rivers (64a ZMOVE.RIV, bridges at ZMOVE.cross) when the move is live, otherwise a
    // painted one across the middle of every trail (the bridge is drawn over it)
    const RIV = [],
      RP = [],
      live = zmLive();
    if (live) {
      ZMOVE.RIV.forEach((cp) =>
        RP.push(mkRd(cp.map(([x, z]) => [x - OX, z - OZ])).p.map(([x, z]) => [OX + x, OZ + z])),
      );
      ZMOVE.cross.forEach(([x, z, hx, hz, ti]) => RIV.push({ m: { x, z, dx: hx, dz: hz }, t: TRL[ti] }));
    } else
      TRL.forEach((t, ti) => {
        const pts = t.p.map(([x, z]) => [OX + x, OZ + z]),
          m = along(pts, plen(pts) * 0.5),
          nx = -m.dz,
          nz = m.dx,
          rp = [];
        for (let s = -60; s <= 60; s += 4) {
          const w = Math.sin(s / 17 + ti) * 5;
          rp.push([m.x + nx * s + m.dx * w, m.z + nz * s + m.dz * w]);
        }
        RIV.push({ m, t });
        RP.push(rp);
      });
    RP.forEach((rp) =>
      rp.forEach(([x, z]) => {
        const i0 = Math.floor((x - B[0]) / CS),
          j0 = Math.floor((z - B[2]) / CS),
          rr = Math.ceil(7 / CS);
        for (let j = j0 - rr; j <= j0 + rr; j++)
          for (let i = i0 - rr; i <= i0 + rr; i++) {
            if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
            if (Math.hypot(cx(i) - x, cz(j) - z) <= 7) L[j * gw + i] = Math.min(L[j * gw + i], 1);
          }
      }),
    );
    st.prog = 0.68;
    yield;

    // ---- paint
    const ppu = Math.min(1.6, 3400 / (B[1] - B[0]), 2400 / (B[3] - B[2])),
      W2 = Math.ceil((B[1] - B[0]) * ppu),
      H2 = Math.ceil((B[3] - B[2]) * ppu),
      base = document.createElement("canvas");
    base.width = W2;
    base.height = H2;
    const g = base.getContext("2d"),
      bx = (x) => (x - B[0]) * ppu,
      by = (z) => (z - B[2]) * ppu;
    const sea = g.createLinearGradient(0, 0, W2, H2);
    sea.addColorStop(0, "#7cc3d8");
    sea.addColorStop(1, "#5aa6c4");
    g.fillStyle = sea;
    g.fillRect(0, 0, W2, H2);
    // waves
    g.strokeStyle = "rgba(255,255,255,.35)";
    g.lineWidth = 1.2;
    for (let j = 2; j < gh; j += 9)
      for (let i = 2; i < gw; i += 11) {
        const ii = i + Math.floor(hsh(i, j) * 6),
          jj = j + Math.floor(hsh(j, i) * 5);
        if (ii >= gw || jj >= gh || L[jj * gw + ii] || hsh(ii, jj) > 0.45) continue;
        const x = bx(cx(ii)),
          y = by(cz(jj)),
          w = 5 + hsh(jj, ii) * 4;
        g.beginPath();
        g.arc(x - w / 2, y, w / 2, Math.PI * 1.1, Math.PI * 1.9);
        g.arc(x + w / 2, y, w / 2, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
    const layer = (fn) => {
      const c = document.createElement("canvas");
      c.width = gw;
      c.height = gh;
      const x = c.getContext("2d"),
        im = x.createImageData(gw, gh),
        d = im.data;
      for (let o = 0; o < n; o++) {
        const r = fn(o);
        if (!r) continue;
        d[o * 4] = r[0];
        d[o * 4 + 1] = r[1];
        d[o * 4 + 2] = r[2];
        d[o * 4 + 3] = r[3] == null ? 255 : r[3];
      }
      x.putImageData(im, 0, 0);
      return c;
    };
    const up = (c, f, dx, dy) => {
      g.save();
      g.imageSmoothingEnabled = true;
      if (f) g.filter = f;
      g.drawImage(c, 0, 0, gw, gh, dx || 0, dy || 0, gw * CS * ppu, gh * CS * ppu);
      g.restore();
    };
    up(
      layer((o) => (L[o] ? [158, 218, 228] : null)),
      "blur(3px)",
    );
    const dark = layer((o) => (L[o] === 2 ? [70, 48, 28] : null));
    [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2.5],
    ].forEach(([a, b]) => up(dark, "blur(1px)", a, b));
    up(
      layer((o) => {
        if (L[o] !== 2) return null;
        const z = NZ[zc[o]] || "hub",
          c = wk[o] ? ZW[z] : ZC[z],
          v = (hsh(o % gw, (o / gw) | 0) - 0.5) * 10;
        return [c[0] + v, c[1] + v, c[2] + v];
      }),
      "blur(1.2px)",
    );
    st.prog = 0.75;
    yield;
    // ground texture: grass ticks, snow shadows, ember cracks, marsh puddles
    for (let j = 0; j < gh; j += 2) {
      for (let i = 0; i < gw; i += 2) {
        const o = j * gw + i;
        if (L[o] !== 2 || wk[o] || hsh(i * 3, j * 7) > 0.5) continue;
        const z = NZ[zc[o]] || "hub",
          x = bx(cx(i)) + (hsh(i, j * 3) - 0.5) * 6,
          y = by(cz(j)) + (hsh(i * 5, j) - 0.5) * 6;
        if (z === "hub") {
          g.strokeStyle = "rgba(40,90,40,.45)";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x - 2, y + 2);
          g.lineTo(x - 1, y - 1);
          g.moveTo(x + 1, y + 2);
          g.lineTo(x + 2, y - 1);
          g.stroke();
        } else if (z === "frost") {
          g.fillStyle = "rgba(140,170,200,.25)";
          g.beginPath();
          g.ellipse(x, y, 4, 1.6, 0, 0, 7);
          g.fill();
        } else if (z === "ember") {
          g.strokeStyle = hsh(j, i) < 0.25 ? "rgba(255,120,40,.7)" : "rgba(30,16,12,.5)";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x - 3, y);
          g.lineTo(x, y + 1.5);
          g.lineTo(x + 3, y - 1);
          g.stroke();
        } else if (z === "marsh") {
          if (hsh(j * 2, i) < 0.3) {
            g.fillStyle = "rgba(70,110,110,.55)";
            g.beginPath();
            g.ellipse(x, y, 3.5, 1.8, 0, 0, 7);
            g.fill();
          }
        } else {
          g.fillStyle = "rgba(255,255,255,.35)";
          g.fillRect(x, y, 1.4, 1.4);
        }
      }
      if (j % 40 === 0) yield;
    }
    st.prog = 0.82;
    yield;

    // ---- roads
    g.lineCap = g.lineJoin = "round";
    const road = (pts, w, fill, edge, dash) => {
      const path = new Path2D();
      pts.forEach(([x, z], k) => (k ? path.lineTo(bx(x), by(z)) : path.moveTo(bx(x), by(z))));
      g.strokeStyle = edge;
      g.lineWidth = Math.max(3, w * ppu) + 3;
      g.stroke(path);
      g.strokeStyle = fill;
      g.lineWidth = Math.max(2, w * ppu);
      g.stroke(path);
      if (dash) {
        g.setLineDash([3, 5]);
        g.strokeStyle = dash;
        g.lineWidth = 1;
        g.stroke(path);
        g.setLineDash([]);
      }
    };
    const disc = (x, z, r, fill, edge) => {
      g.beginPath();
      g.arc(bx(x), by(z), Math.max(2, r * ppu), 0, 7);
      g.fillStyle = fill;
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = edge;
      g.stroke();
    };
    const RC = {
      hub: ["#d8c7a0", "#7a6248"],
      frost: ["#d6d2c8", "#7a8ea0"],
      ember: ["#a07a5a", "#2e1a12"],
      marsh: ["#b89c6c", "#4a3a20"],
      reach: ["#d8ccf0", "#5a4a8a"],
    };
    TRL.forEach((t) => {
      const lk = typeof trLock === "function" && trLock(t);
      road(
        t.p.map(([x, z]) => [OX + x, OZ + z]),
        TRW * 1.6,
        lk ? "#b8a890" : "#cfae7a",
        lk ? "#6a5a50" : "#6e5236",
        lk ? null : "rgba(255,240,200,.6)",
      );
    });
    RDS.forEach((r) =>
      road(
        r.p.map(([x, z]) => [OX + x, OZ + z]),
        RDW * 2,
        RC.hub[0],
        RC.hub[1],
      ),
    );
    road(
      [
        [OX, OZ],
        [OX, OZ + PZ],
      ],
      SW * 2,
      RC.hub[0],
      RC.hub[1],
      "rgba(150,120,80,.5)",
    );
    disc(OX, OZ + MLZ, MLR, RC.hub[0], RC.hub[1]);
    disc(OX, OZ + PZ, 16, RC.hub[0], RC.hub[1]);
    disc(OX, OZ, 18, "#e2d4b0", RC.hub[1]);
    ZRD.forEach((t) => {
      const pts = rdPts(t),
        zk = t.zk || zoneAt(pts[0][0], pts[0][1]),
        c = RC[zk] || RC.hub;
      road(pts, RDW * 2, c[0], c[1]);
      if (t.cul) {
        const cu = wPt(t, t.cul[0], t.cul[1]);
        disc(cu[0], cu[1], ZCR, c[0], c[1]);
      }
      if (t.mo && ZCEN[t.zk]) {
        const ce = ZCEN[t.zk],
          gg = zsGate(t),
          r0 = ZVR[t.zk] - 4;
        road(
          [
            [ce[0] + t.mo[0] * r0, ce[1] + t.mo[1] * r0],
            [gg[0], gg[1]],
          ],
          ZSW * 2,
          c[0],
          c[1],
        );
      }
    });
    for (const k in ZCEN) {
      const c = RC[k] || RC.hub;
      disc(ZCEN[k][0], ZCEN[k][1], 15, c[0], c[1]);
    }
    st.prog = 0.88;
    yield;

    // ---- bridges over the rivers, arches at trail ends and street starts
    RIV.forEach(({ m, t }) => {
      g.save();
      g.translate(bx(m.x), by(m.z));
      g.rotate(Math.atan2(m.dz, m.dx));
      const l = 30 * ppu,
        w = Math.max(8, TRW * 1.9 * ppu);
      g.fillStyle = "#9a6a3a";
      g.fillRect(-l / 2, -w / 2, l, w);
      g.strokeStyle = "#5a3a1c";
      g.lineWidth = 1;
      for (let s = -l / 2 + 3; s < l / 2; s += 4) {
        g.beginPath();
        g.moveTo(s, -w / 2);
        g.lineTo(s, w / 2);
        g.stroke();
      }
      g.lineWidth = 2.5;
      g.strokeStyle = "#3a2410";
      g.strokeRect(-l / 2, -w / 2, l, w);
      g.fillStyle = "#3a2410";
      for (let s = -l / 2; s <= l / 2 + 0.1; s += l / 4) {
        g.fillRect(s - 1.5, -w / 2 - 2, 3, 4);
        g.fillRect(s - 1.5, w / 2 - 2, 3, 4);
      }
      g.restore();
      if (typeof trLock === "function" && trLock(t)) IC.lock(g, bx(m.x), by(m.z) - 14, 9);
    });
    const ARCH = [];
    TRL.forEach((t) => {
      const e = t.p[t.p.length - 1];
      ARCH.push([OX + e[0], OZ + e[1]]);
      if (t.z0) ARCH.push([OX + t.p[0][0], OZ + t.p[0][1]]);
    });
    for (let i = 0; i < ZSTR.length && i < ZRD.length; i++) {
      const t = ZRD[i];
      if (t.X != null) ARCH.push(wPt(t, t.X, 0));
    }

    // ---- scenery icons on the wild ground (sorted top to bottom)
    const DEC = [];
    for (let j = 0; j < gh; j += 3)
      for (let i = 0; i < gw; i += 3) {
        const ii = Math.min(gw - 1, i + Math.floor(hsh(i, j) * 3)),
          jj = Math.min(gh - 1, j + Math.floor(hsh(j, i) * 3)),
          o = jj * gw + ii;
        if (L[o] !== 2 || D1[o] < 6) continue;
        const z = NZ[zc[o]] || "hub",
          p = hsh(ii * 7, jj * 13),
          x = bx(cx(ii)),
          y = by(cz(jj)),
          r = (5 + hsh(jj, ii * 3) * 3) * ppu;
        if (z === "hub" && p < 0.6) DEC.push([y, p < 0.18 ? "pine" : "tree", x, r, 0]);
        else if (z === "frost" && p < 0.62) DEC.push([y, "pine", x, r, 1]);
        else if (z === "ember") {
          if (p < 0.02 && D1[o] > 24) DEC.push([y, "volcano", x, r * 2.2]);
          else if (p < 0.1) DEC.push([y, "lava", x, r * 0.9]);
          else if (p < 0.32) DEC.push([y, "rock", x, r * 0.8]);
        } else if (z === "marsh") {
          if (p < 0.22) DEC.push([y, "willow", x, r]);
          else if (p < 0.45) DEC.push([y, "reeds", x, r * 0.8]);
        } else if (z === "reach" && p < 0.3) DEC.push([y, "crystal", x, r * 0.9]);
      }
    // houses, landmarks, arches
    (HOUSES || []).forEach((H, k) => {
      if (!H || H.x == null || H.x < B[0] || H.x > B[1] || H.z < B[2] || H.z > B[3]) return;
      if (H.o && H.o.visible === false) return;
      const z = zoneAt(H.x, H.z);
      DEC.push([by(H.z), "house", bx(H.x), Math.max(8, 3.4 * (H.s || 1) * ppu), ROOF[k % ROOF.length], z]);
    });
    DEC.push([by(OZ), "fountain", bx(OX), Math.max(9, 7 * ppu)]);
    DEC.push([by(OZ + TCZ), "spire", bx(OX), Math.max(14, 14 * ppu)]);
    ARCH.forEach(([x, z]) => DEC.push([by(z), "arch", bx(x), Math.max(8, 6 * ppu)]));
    for (let i = 0; i < ZSTR.length && i < ZRD.length; i++) {
      const t = ZRD[i];
      if (!t.cul) continue;
      const cu = wPt(t, t.cul[0], t.cul[1]),
        ic = CULI[ZSTR[i][3]] || "lantern";
      DEC.push([by(cu[1]), ic, bx(cu[0]), Math.max(10, 9 * ppu)]);
    }
    DEC.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < DEC.length; k++) {
      const d = DEC[k];
      try {
        IC[d[1]](g, d[2], d[0], d[3], d[4], d[5]);
      } catch (e) {}
      if (k % 600 === 599) yield;
    }
    // aged paper over everything
    g.save();
    g.globalCompositeOperation = "multiply";
    g.fillStyle = "#f3e2bd";
    g.fillRect(0, 0, W2, H2);
    g.globalAlpha = 0.07;
    for (let k = 0; k < 900; k++) {
      g.fillStyle = hsh(k, 3) < 0.5 ? "#8a6a3a" : "#ffffff";
      g.beginPath();
      g.arc(hsh(k, 1) * W2, hsh(k, 2) * H2, 8 + hsh(k, 4) * 40, 0, 7);
      g.fill();
    }
    g.restore();

    // labels (drawn per frame, in screen space)
    const lab = [];
    lab.push({ x: OX, z: OZ + 40, t: "Lamplight Square", s: 1 });
    lab.push({ x: OX, z: OZ + TCZ - 26, t: "Gloomspire", s: 0.7 });
    for (const k in ZCEN) lab.push({ x: ZCEN[k][0], z: ZCEN[k][1] - ZVR[k] - 22, t: NAME[k] || k, s: 1.15 });
    if (reachOn()) lab.push({ x: 1900, z: -1120, t: "Starfall Reach", s: 1 });
    for (let i = 0; i < ZSTR.length && i < ZRD.length; i++) {
      const t = ZRD[i];
      if (!t.cul) continue;
      const cu = wPt(t, t.cul[0], t.cul[1]);
      lab.push({ x: cu[0], z: cu[1] + ZCR + 10, t: ZSTR[i][1], s: 0.55, small: 1 });
    }
    const named = new Set();
    RIV.forEach(({ m, t }) => {
      if (!t || named.has(t)) return;
      named.add(t);
      lab.push({ x: m.x, z: m.z + 22, t: t.n, s: 0.5, it: 1 });
    });
    st.lab = lab;
    st.base = base;
    st.B = B;
    st.ppu = ppu;
    st.prog = 1;
    st.done = true;
  }

  function run() {
    if (!st.gen) return;
    const t0 = performance.now(),
      bud = open ? 40 : 6;
    try {
      while (performance.now() - t0 < bud) {
        if (st.gen.next().done) {
          st.gen = null;
          if (open) fit();
          return;
        }
      }
    } catch (e) {
      console.error("ATLAS build", e);
      st.gen = null;
      return;
    }
    setTimeout(run, open ? 0 : 30);
  }
  function rebuild() {
    st.key = keyNow();
    st.gen = build();
    setTimeout(run, 0);
  }
  // build in the background once the game is up, again if the layout changes
  setInterval(() => {
    if (typeof SLOT === "undefined" || SLOT < 0 || mode !== "explore" || document.readyState !== "complete") return;
    if (!firstT) firstT = performance.now();
    if (performance.now() - firstT < 4000 || st.gen || open) return;
    if (!st.done || st.key !== keyNow()) rebuild();
  }, 1000);

  // ------------------------------------------------------------------ the open map
  const css = document.createElement("style");
  css.textContent =
    "#atlas{position:fixed;inset:0;z-index:58;display:none;background:rgba(10,8,18,.72);touch-action:none}" +
    "#atlas canvas{position:absolute;inset:0;width:100%;height:100%;cursor:grab}" +
    "#atlas canvas.dr{cursor:grabbing}" +
    "#atlas .ax{position:absolute;top:18px;right:22px;width:38px;height:38px;border-radius:50%;border:3px solid #5a3a1c;" +
    "background:#f2deb0;color:#3b2412;font:900 18px Georgia,serif;cursor:pointer;box-shadow:0 3px 8px rgba(0,0,0,.4)}" +
    "#atlas .ax:hover{background:#ffe9b8}" +
    "#mm{pointer-events:auto;cursor:pointer;box-shadow:0 0 0 3px #e9d3a0,0 0 0 6px #6b4626,0 0 0 7px #2a1a0c,0 4px 14px rgba(0,0,0,.55)!important}";
  document.head.appendChild(css);

  function ensureDom() {
    if (wrap) return;
    wrap = document.createElement("div");
    wrap.id = "atlas";
    cv = document.createElement("canvas");
    const bt = document.createElement("button");
    bt.className = "ax";
    bt.textContent = "✕";
    bt.title = "Close (M)";
    bt.onclick = () => close();
    wrap.append(cv, bt);
    document.body.appendChild(wrap);
    cv.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY, cx: view.cx, cz: view.cz };
      cv.classList.add("dr");
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag || !view) return;
      view.cx = drag.cx - (e.clientX - drag.x) / view.s;
      view.cz = drag.cz - (e.clientY - drag.y) / view.s;
      clampV();
    });
    const end = () => {
      drag = null;
      cv.classList.remove("dr");
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        if (!view) return;
        const r = cv.getBoundingClientRect(),
          mx = e.clientX - r.left - r.width / 2,
          my = e.clientY - r.top - r.height / 2,
          wx = view.cx + mx / view.s,
          wz = view.cz + my / view.s,
          ns = Math.max(view.s0 * 0.9, Math.min(view.s0 * 3.2, view.s * (e.deltaY < 0 ? 1.18 : 1 / 1.18)));
        view.s = ns;
        view.cx = wx - mx / ns;
        view.cz = wz - my / ns;
        clampV();
      },
      { passive: false },
    );
    cv.addEventListener("dblclick", () => fit());
  }
  function fit() {
    if (!st.done || !cv) return;
    const B = st.B,
      w = innerWidth - 90,
      h = innerHeight - 120,
      s0 = Math.min(w / (B[1] - B[0]), h / (B[3] - B[2]));
    view = { s0, s: s0, cx: (B[0] + B[1]) / 2, cz: (B[2] + B[3]) / 2 };
  }
  function clampV() {
    const B = st.B;
    view.cx = Math.max(B[0], Math.min(B[1], view.cx));
    view.cz = Math.max(B[2], Math.min(B[3], view.cz));
  }
  function banner(X, x, y, text, sz, it) {
    text = it ? text : text.toUpperCase();
    X.font = (it ? "italic 700 " : "800 ") + Math.round(sz) + "px Georgia,'Times New Roman',serif";
    const tw = X.measureText(text).width,
      w = tw + sz * 1.6,
      h = sz * 1.55;
    if (it) {
      X.textAlign = "center";
      X.textBaseline = "middle";
      X.lineWidth = 3;
      X.strokeStyle = "rgba(243,226,189,.9)";
      X.strokeText(text, x, y);
      X.fillStyle = "#4a3018";
      X.fillText(text, x, y);
      return;
    }
    const l = x - w / 2,
      t = y - h / 2,
      tail = sz * 0.9;
    X.lineWidth = Math.max(1.5, sz * 0.12);
    X.strokeStyle = "#5b3a1c";
    // folded tails
    X.fillStyle = "#c9ad78";
    [
      [l, -1],
      [l + w, 1],
    ].forEach(([ex, d]) => {
      X.beginPath();
      X.moveTo(ex, t + h * 0.25);
      X.lineTo(ex + d * tail, t + h * 0.25);
      X.lineTo(ex + d * tail * 0.6, t + h * 0.75);
      X.lineTo(ex + d * tail, t + h * 1.2);
      X.lineTo(ex, t + h * 1.2);
      X.closePath();
      X.fill();
      X.stroke();
    });
    X.beginPath();
    X.moveTo(l, t);
    X.quadraticCurveTo(x, t - h * 0.25, l + w, t);
    X.lineTo(l + w, t + h);
    X.quadraticCurveTo(x, t + h * 0.75, l, t + h);
    X.closePath();
    X.fillStyle = "#f2deb0";
    X.fill();
    X.stroke();
    X.textAlign = "center";
    X.textBaseline = "middle";
    X.fillStyle = "#3b2412";
    X.fillText(text, x, y + h * 0.02);
  }
  function compass(X, x, y, r) {
    X.save();
    X.translate(x, y);
    X.beginPath();
    X.arc(0, 0, r * 1.05, 0, 7);
    X.fillStyle = "rgba(242,222,176,.9)";
    X.fill();
    X.lineWidth = 2;
    X.strokeStyle = "#5b3a1c";
    X.stroke();
    X.beginPath();
    X.arc(0, 0, r * 0.82, 0, 7);
    X.stroke();
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 - Math.PI / 2,
        L = k % 2 ? r * 0.55 : r * 0.92,
        w = r * 0.16;
      X.beginPath();
      X.moveTo(Math.cos(a) * L, Math.sin(a) * L);
      X.lineTo(Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w);
      X.lineTo(0, 0);
      X.closePath();
      X.fillStyle = k === 0 ? "#b0342a" : k % 2 ? "#c9a24a" : "#7a4a24";
      X.fill();
      X.beginPath();
      X.moveTo(Math.cos(a) * L, Math.sin(a) * L);
      X.lineTo(Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w);
      X.lineTo(0, 0);
      X.closePath();
      X.fillStyle = k === 0 ? "#e0564a" : k % 2 ? "#e8cc7a" : "#a8723a";
      X.fill();
    }
    X.font = "800 " + Math.round(r * 0.32) + "px Georgia,serif";
    X.textAlign = "center";
    X.textBaseline = "middle";
    X.fillStyle = "#3b2412";
    [
      ["N", 0, -1.3],
      ["E", 1.3, 0],
      ["S", 0, 1.3],
      ["W", -1.3, 0],
    ].forEach(([c, a, b]) => X.fillText(c, a * r, b * r));
    X.restore();
  }
  function star(X, x, y, r, rot) {
    X.save();
    X.translate(x, y);
    X.rotate(rot);
    X.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2,
        q = i % 2 ? r * 0.42 : r;
      X.lineTo(Math.cos(a) * q, Math.sin(a) * q);
    }
    X.closePath();
    X.fillStyle = "#ffd34d";
    X.fill();
    X.lineWidth = 2;
    X.strokeStyle = "#5a3a00";
    X.stroke();
    X.restore();
  }
  function draw() {
    const dpr = Math.min(2, devicePixelRatio || 1),
      w = innerWidth,
      h = innerHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const X = cv.getContext("2d");
    X.setTransform(dpr, 0, 0, dpr, 0, 0);
    X.clearRect(0, 0, w, h);
    const M0 = 26; // frame margin
    X.save();
    X.beginPath();
    X.rect(M0, M0, w - 2 * M0, h - 2 * M0);
    X.clip();
    X.fillStyle = "#6aaec8";
    X.fillRect(0, 0, w, h);
    if (!st.done || !view) {
      X.fillStyle = "#f2deb0";
      X.font = "700 22px Georgia,serif";
      X.textAlign = "center";
      X.fillText("Unrolling the map... " + Math.round(st.prog * 100) + "%", w / 2, h / 2);
      X.restore();
      frame(X, w, h, M0);
      return;
    }
    const B = st.B,
      s = view.s,
      sx = (x) => w / 2 + (x - view.cx) * s,
      sy = (z) => h / 2 + (z - view.cz) * s,
      zf = Math.sqrt(s / view.s0);
    X.imageSmoothingEnabled = true;
    X.drawImage(st.base, sx(B[0]), sy(B[2]), (st.base.width / st.ppu) * s, (st.base.height / st.ppu) * s);
    // labels
    st.lab.forEach((L) => {
      if (L.small && zf < 1.05) return;
      const sz = Math.max(9, Math.min(30, 17 * L.s * Math.min(1.7, zf)));
      banner(X, sx(L.x), sy(L.z), L.t, sz, L.it);
    });
    // quest marks on givers
    if (typeof NPCS === "object" && typeof npcQ === "function")
      NPCS.forEach((n) => {
        let q = "";
        try {
          q = npcQ(n);
        } catch (e) {}
        if (!q) return;
        const x = sx(n.x),
          y = sy(n.z) - 6;
        X.beginPath();
        X.arc(x, y, 8, 0, 7);
        X.fillStyle = "#ffd34d";
        X.fill();
        X.lineWidth = 2;
        X.strokeStyle = "#3a2410";
        X.stroke();
        X.fillStyle = "#3a2410";
        X.font = "900 12px system-ui";
        X.textAlign = "center";
        X.textBaseline = "middle";
        X.fillText(q, x, y + 1);
      });
    const now = performance.now();
    if (typeof QTG !== "undefined" && QTG) star(X, sx(QTG[0]), sy(QTG[1]), 11 + Math.sin(now / 300) * 1.5, now / 1200);
    // you: a pulsing ring and an arrow the way you face (forward = sin/cos of W.rotation.y, like the minimap)
    if (typeof W === "object" && W) {
      const x = sx(W.position.x),
        y = sy(W.position.z),
        a = Math.atan2(Math.cos(W.rotation.y), Math.sin(W.rotation.y));
      X.beginPath();
      X.arc(x, y, 12 + ((now / 60) % 14), 0, 7);
      X.strokeStyle = "rgba(255,255,255," + (0.8 - ((now / 60) % 14) / 18) + ")";
      X.lineWidth = 2;
      X.stroke();
      X.save();
      X.translate(x, y);
      X.rotate(a);
      X.beginPath();
      X.moveTo(12, 0);
      X.lineTo(-8, -8);
      X.lineTo(-4, 0);
      X.lineTo(-8, 8);
      X.closePath();
      X.fillStyle = "#ff5a3a";
      X.fill();
      X.lineWidth = 2.5;
      X.strokeStyle = "#ffffff";
      X.stroke();
      X.restore();
      banner(X, x, y + 22, "You", 11, 1);
    }
    // soft parchment vignette
    const vg = X.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
    vg.addColorStop(0, "rgba(90,58,28,0)");
    vg.addColorStop(1, "rgba(90,58,28,.45)");
    X.fillStyle = vg;
    X.fillRect(0, 0, w, h);
    X.restore();
    frame(X, w, h, M0);
  }
  function frame(X, w, h, M0) {
    // wooden border with a gold inlay and corner studs
    X.lineWidth = 14;
    X.strokeStyle = "#4a3220";
    X.strokeRect(M0 - 7, M0 - 7, w - 2 * M0 + 14, h - 2 * M0 + 14);
    X.lineWidth = 2;
    X.strokeStyle = "#c9a24a";
    X.strokeRect(M0 - 1, M0 - 1, w - 2 * M0 + 2, h - 2 * M0 + 2);
    X.strokeRect(M0 - 12, M0 - 12, w - 2 * M0 + 24, h - 2 * M0 + 24);
    [
      [M0 - 7, M0 - 7],
      [w - M0 + 7, M0 - 7],
      [M0 - 7, h - M0 + 7],
      [w - M0 + 7, h - M0 + 7],
    ].forEach(([x, y]) => {
      X.beginPath();
      X.moveTo(x, y - 14);
      X.lineTo(x + 14, y);
      X.lineTo(x, y + 14);
      X.lineTo(x - 14, y);
      X.closePath();
      X.fillStyle = "#c9a24a";
      X.fill();
      X.lineWidth = 2;
      X.strokeStyle = "#2a1a0c";
      X.stroke();
      X.beginPath();
      X.arc(x, y, 4, 0, 7);
      X.fillStyle = "#6a2a1a";
      X.fill();
    });
    banner(X, w / 2, M0 + 20, "The Lands of Duskwick", 22);
    compass(X, M0 + 62, h - M0 - 62, 38);
    X.font = "600 12px Georgia,serif";
    X.textAlign = "right";
    X.textBaseline = "middle";
    X.lineWidth = 3;
    X.strokeStyle = "rgba(242,222,176,.95)";
    const tip = "Drag to move · Wheel to zoom · Double-click to fit · M or Esc to close";
    X.strokeText(tip, w - M0 - 12, h - M0 - 14);
    X.fillStyle = "#3b2412";
    X.fillText(tip, w - M0 - 12, h - M0 - 14);
  }
  function loopF() {
    if (!open) return;
    if (mode !== "explore") return close();
    raf = requestAnimationFrame(loopF);
    try {
      draw();
    } catch (e) {
      console.error("ATLAS draw", e);
    }
  }
  const cls = (c) => document.body.classList.contains(c);
  const canOpen = () =>
    typeof SLOT !== "undefined" &&
    SLOT >= 0 &&
    mode === "explore" &&
    !paused &&
    !cls("cut") &&
    !cls("ttl") &&
    (!$("chars") || $("chars").style.display === "none");
  function openMap() {
    if (open || !canOpen()) return;
    ensureDom();
    open = true;
    pz = paused;
    paused = true;
    if (typeof keys === "object") for (const k in keys) keys[k] = 0;
    wrap.style.display = "block";
    if (!st.done || st.key !== keyNow()) {
      if (!st.gen) rebuild();
      else setTimeout(run, 0);
    }
    if (st.done && !view) fit();
    loopF();
  }
  function close() {
    if (!open) return;
    open = false;
    cancelAnimationFrame(raf);
    wrap.style.display = "none";
    paused = pz;
    if (typeof keys === "object") for (const k in keys) keys[k] = 0;
  }
  addEventListener(
    "keydown",
    (e) => {
      if (!e.key) return;
      const tg = e.target && e.target.tagName;
      if (tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT") return;
      const k = e.key.toLowerCase();
      if (open) {
        if (e.ctrlKey || e.metaKey) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!e.repeat && (k === "m" || k === "escape")) close();
        return;
      }
      if (k === "m" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && canOpen()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        openMap();
      }
    },
    true,
  );
  addEventListener(
    "keyup",
    (e) => {
      if (open) e.stopImmediatePropagation();
    },
    true,
  );
  const mmEl = $("mm");
  if (mmEl) {
    mmEl.title = "World map (M)";
    mmEl.addEventListener("click", () => openMap());
  }
  addEventListener("resize", () => open && st.done && fit());
  return { open: openMap, close, rebuild, isOpen: () => open, st };
})();
