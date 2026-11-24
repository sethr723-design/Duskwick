// DUSKWICK - 42-luster.js (v31): a visual polish pass over everything already built. Loads LAST. Only top-level name:
// LUSTER. No lights, no per-material onBeforeCompile (it extends the shared prototype hook from 01-core instead).
//  1) Shader extras, keyed on material.userData (strings/numbers, so material.clone() copies them):
//     rim (hex) / rimK / rimP = a fresnel rim light added to the emissive (scaled by the Glow setting) on toon / phong /
//     standard materials; sway (number) = wind sway by height (instanced or not); ground (dtx "ground") = slow world-space
//     value noise that breaks big ground sheets into darker/brighter, warmer/cooler patches.
//  2) Characters: soft moonlit rim on your wizard, townsfolk, summons and beasts; gloom foes get a rim in their core's
//     colour, a spectral haze, a tinted shadow-stain on the ground and smoke wisps that curl up off their shoulders.
//  3) Soft round contact shadows under every character (one shared texture + material; kept on the ground when they hop).
//  4) Verge clutter: little themed things along the edges of every walkable place (wildflowers, grass, pebbles and
//     glowing toadstools in town; ice crystals and snow in Frostfen; hot rocks and fire-flowers in Cinderwaste; reeds and
//     glowcaps in Mirewick). Built lazily in 48-unit chunks near the camera (instanced, deterministic hash, no rnd), so it
//     never touches scene-child order before BASE. Skips dungeons and the tower.
// Off on Low quality except the gloom extras' cheap parts (contact shadows and stains).
const LUSTER = (() => {
  const LOW = GFX === "low",
    MED = GFX === "med",
    TIME = { value: 0 };
  // ---------- 1) shader hooks ----------
  const ob0 = T.Material.prototype.onBeforeCompile,
    ck0 = T.Material.prototype.customProgramCacheKey;
  const NOISE = [
    "float lusH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
    "float lusN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(lusH(i), lusH(i + vec2(1.0, 0.0)), f.x), mix(lusH(i + vec2(0.0, 1.0)), lusH(i + vec2(1.0, 1.0)), f.x), f.y); }",
    "",
  ].join("\n");
  T.Material.prototype.onBeforeCompile = function (sh, r) {
    ob0.call(this, sh, r);
    const u = this.userData || {};
    let f = sh.fragmentShader,
      v = sh.vertexShader;
    if (
      u.rim != null &&
      f.indexOf("#include <emissivemap_fragment>") >= 0 &&
      f.indexOf("vViewPosition") >= 0 &&
      f.indexOf("#include <normal_fragment_begin>") >= 0
    ) {
      f =
        "uniform vec3 rimC;\nuniform float rimK;\nuniform float rimP;\nuniform float rimE;\n" +
        f.replace(
          "#include <emissivemap_fragment>",
          [
            "#include <emissivemap_fragment>",
            "{",
            "  float rimF = 1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);",
            "  totalEmissiveRadiance += rimC * (pow(rimF, rimP) * rimK * rimE);",
            "}",
          ].join("\n"),
        );
      sh.uniforms.rimC = { value: new T.Color(u.rim) };
      sh.uniforms.rimK = { value: u.rimK == null ? 0.3 : u.rimK };
      sh.uniforms.rimP = { value: u.rimP || 2.5 };
      sh.uniforms.rimE = GLOWE;
    }
    if (u.sway && v.indexOf("#include <begin_vertex>") >= 0) {
      v =
        "uniform float lusT;\nuniform float lusK;\n" +
        v.replace(
          "#include <begin_vertex>",
          [
            "#include <begin_vertex>",
            "{",
            "  vec3 lwp = modelMatrix[3].xyz;",
            "#ifdef USE_INSTANCING",
            "  lwp += instanceMatrix[3].xyz;",
            "#endif",
            "  float lsw = max(0.0, transformed.y) * lusK;",
            "  float gust = 0.65 + 0.35 * sin(lusT * 0.31 + lwp.x * 0.02);",
            "  transformed.x += sin(lusT * 1.7 + lwp.x * 0.35 + lwp.z * 0.21) * lsw * gust;",
            "  transformed.z += cos(lusT * 1.25 + lwp.z * 0.33 + lwp.x * 0.12) * lsw * 0.6 * gust;",
            "}",
          ].join("\n"),
        );
      sh.uniforms.lusT = TIME;
      sh.uniforms.lusK = { value: u.sway };
    }
    if (u.dtx === "ground" && f.indexOf("varying vec3 vDtP;") >= 0 && f.indexOf("#include <map_fragment>") >= 0) {
      f =
        NOISE +
        f.replace(
          "#include <map_fragment>",
          [
            "#include <map_fragment>",
            "{",
            "  vec2 mp = vDtP.xz;",
            "  float m1 = lusN(mp * 0.045) * 0.65 + lusN(mp * 0.13 + 17.0) * 0.35;",
            "  diffuseColor.rgb *= 0.84 + 0.32 * m1;",
            "  float m3 = lusN(mp * 0.021 + 41.0);",
            "  diffuseColor.rgb *= mix(vec3(1.0), vec3(1.07, 1.0, 0.86), smoothstep(0.55, 0.9, m3) * 0.7);",
            "  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.88, 0.95, 1.1), smoothstep(0.45, 0.1, m3) * 0.6);",
            "}",
          ].join("\n"),
        );
    }
    sh.fragmentShader = f;
    sh.vertexShader = v;
  };
  T.Material.prototype.customProgramCacheKey = function () {
    const u = this.userData || {};
    return ck0.call(this) + (u.rim != null ? "|rim" : "") + (u.sway ? "|sw" : "") + (u.dtx === "ground" ? "|mac" : "");
  };
  // ---------- 2) rim tagging ----------
  const litOK = (m) => m && (m.isMeshToonMaterial || m.isMeshPhongMaterial || m.isMeshStandardMaterial);
  function rimTag(root, col, k, p) {
    if (LOW || !root) return root;
    const sh = new Set(Object.values(MC)),
      own = new Map();
    root.traverse((o) => {
      if (!o.isMesh || Array.isArray(o.material) || o.userData.ol || o.userData.lus) return;
      let m = o.material;
      if (!litOK(m) || m.transparent || m.blending === T.AdditiveBlending) return;
      if (sh.has(m)) {
        if (!own.has(m)) own.set(m, m.clone());
        m = o.material = own.get(m);
      }
      if (m.userData.rim === col && m.userData.rimK === k) return;
      m.userData.rim = col;
      m.userData.rimK = k;
      m.userData.rimP = p;
      m.needsUpdate = true;
    });
    return root;
  }
  // ---------- 3) contact shadows ----------
  const cvs = (n, fn) => {
    const c = document.createElement("canvas");
    c.width = c.height = n;
    fn(c.getContext("2d"), n);
    return new T.CanvasTexture(c);
  };
  const SHT = cvs(64, (x, n) => {
    const q = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    q.addColorStop(0, "rgba(255,255,255,1)");
    q.addColorStop(0.45, "rgba(255,255,255,.75)");
    q.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = q;
    x.fillRect(0, 0, n, n);
  });
  // a ragged, blotchy stain for gloom foes (shadow that seeps out from under them)
  const STT = cvs(128, (x, n) => {
    let s = 7;
    const rn = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 26; i++) {
      const a = rn() * 6.283,
        d = rn() * n * 0.24,
        r = n * (0.12 + rn() * 0.2),
        px = n / 2 + Math.cos(a) * d,
        py = n / 2 + Math.sin(a) * d,
        q = x.createRadialGradient(px, py, 0, px, py, r);
      q.addColorStop(0, "rgba(255,255,255,.45)");
      q.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = q;
      x.fillRect(0, 0, n, n);
    }
  });
  const SHG = new T.PlaneGeometry(1, 1);
  SHG.rotateX(-Math.PI / 2);
  const shMat = (map, hex, op) =>
    new T.MeshBasicMaterial({
      map,
      color: hex,
      transparent: true,
      opacity: op,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
  const SHM = shMat(SHT, 0x0a0614, 0.5),
    LIFT = [];
  const noRay = () => {};
  function shadow(root, r, mat) {
    if (!root || root.userData.lusS) return;
    const m = new T.Mesh(SHG, mat || SHM),
      s = root.scale.x || 1;
    m.userData.lus = 1;
    m.raycast = noRay;
    m.renderOrder = -1;
    m.scale.set((r * 2) / s, 1, (r * 2) / s);
    m.position.y = 0.04 / (root.scale.y || 1);
    root.add(m);
    root.userData.lusS = m;
    LIFT.push(root);
  }
  const BX = new T.Box3();
  // a footprint radius from the model's size (sprites and glows left out of it would be nicer; this is close enough)
  function foot(root, k) {
    try {
      root.updateMatrixWorld(true);
      BX.setFromObject(root);
      if (BX.isEmpty()) return 0.7;
      const w = Math.max(BX.max.x - BX.min.x, BX.max.z - BX.min.z);
      return Math.max(0.45, Math.min(5, w * (k || 0.4)));
    } catch (e) {
      return 0.7;
    }
  }
  // ---------- gloom extras ----------
  const WST = cvs(64, (x, n) => {
    let s = 3;
    const rn = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 14; i++) {
      const a = rn() * 6.3,
        d = rn() * 11,
        r = 8 + rn() * 12,
        px = 32 + Math.cos(a) * d,
        py = 32 + Math.sin(a) * d,
        q = x.createRadialGradient(px, py, 0, px, py, r);
      q.addColorStop(0, "rgba(255,255,255,.4)");
      q.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = q;
      x.fillRect(0, 0, n, n);
    }
  });
  const GM = {}; // per-colour shared materials for gloom stains / wisps / haze
  const CA = new T.Color();
  function gMat(kind, hex) {
    const k = kind + hex;
    if (GM[k]) return GM[k];
    if (kind === "st") return (GM[k] = shMat(STT, CA.setHex(hex).lerp(new T.Color(0x05020a), 0.72).getHex(), 0.85));
    if (kind === "w")
      return (GM[k] = new T.SpriteMaterial({
        map: WST,
        color: CA.setHex(hex).lerp(new T.Color(0x0a0612), 0.62).getHex(),
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      }));
    return (GM[k] = new T.SpriteMaterial({
      map: GLT,
      color: hex,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      blending: T.AdditiveBlending,
    }));
  }
  function gloomPlus(o) {
    const u = o.userData;
    if (u.lusG) return;
    const core = u.coreM.color.getHex(),
      hue = u.skin ? u.skin.color.getHex() : core;
    rimTag(o, core, 0.85, 2.1);
    shadow(o, foot(o, 0.5) * 1.15, gMat("st", hue));
    const L = { w: [], au: null };
    if (!LOW) {
      const nw = MED ? 2 : 3;
      for (let k = 0; k < nw; k++) {
        const s = new T.Sprite(gMat("w", hue));
        s.userData.lus = 1;
        s.raycast = noRay;
        o.add(s);
        L.w.push({ s, ph: k / nw, x: (k - (nw - 1) / 2) * 0.7 });
      }
      const au = new T.Sprite(gMat("a", core));
      au.userData.lus = 1;
      au.raycast = noRay;
      au.position.set(0, 1.3, 0.1);
      au.scale.setScalar(3.4);
      o.add(au);
      L.au = au;
    }
    u.lusG = L;
  }
  // smoke wisps curl up off the shoulders and thin out; the haze breathes with the core
  function gloomAnim(o, s, j) {
    const L = o.userData.lusG;
    if (!L) return;
    L.w.forEach((w, k) => {
      const f = (s * 0.32 + w.ph + j * 0.13) % 1,
        e = Math.sin(Math.PI * f);
      w.s.position.set(w.x + Math.sin(s * 1.3 + k * 2 + j) * 0.25 * f, 1.7 + f * 2.2, -0.3 - f * 0.5);
      w.s.scale.setScalar((0.35 + f * 1.3) * e * 1.3 + 0.001);
    });
    if (L.au) {
      const c = o.userData.core ? o.userData.core.scale.x : 1;
      L.au.scale.setScalar(3.1 + (c - 1) * 4);
    }
  }
  function dress(o) {
    if (!o || o.userData.lusD) return o;
    o.userData.lusD = 1;
    if (o.userData.gl && o.userData.coreM) gloomPlus(o);
    else {
      rimTag(o, 0xb6a8ff, 0.3, 2.4);
      shadow(o, foot(o, 0.38));
    }
    return o;
  }
  {
    const mk0 = mkFoe;
    mkFoe = function () {
      const o = mk0.apply(this, arguments);
      try {
        dress(o);
      } catch (e) {}
      return o;
    };
    const ag0 = animGloom;
    animGloom = function (o, s, mvg, i) {
      const r = ag0.apply(this, arguments);
      if (o && o.userData.lusG) gloomAnim(o, s, i || 0);
      return r;
    };
    const pe0 = person;
    person = function () {
      const o = pe0.apply(this, arguments);
      try {
        rimTag(o, 0x9db4ff, 0.24, 2.6);
        shadow(o, 0.62 * (o.scale.x || 1));
      } catch (e) {}
      return o;
    };
    const sm0 = sumMesh;
    sumMesh = function () {
      const o = sm0.apply(this, arguments);
      try {
        rimTag(o, 0xc8ecff, 0.34, 2.3);
        shadow(o, foot(o, 0.36));
      } catch (e) {}
      return o;
    };
  }
  // ---------- 4) verge clutter ----------
  const hs = (x, z, k) => {
    const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
    return v - Math.floor(v);
  };
  const M4 = new T.Matrix4(),
    QQ = new T.Quaternion(),
    EE = new T.Euler(),
    V1 = new T.Vector3(),
    V2 = new T.Vector3(),
    CC = new T.Color();
  const tf = (x, y, z, rx, ry, rz, sx, sy, sz) =>
    M4.clone().compose(
      V1.set(x, y, z),
      QQ.setFromEuler(EE.set(rx || 0, ry || 0, rz || 0)),
      V2.set(sx || 1, sy == null ? sx || 1 : sy, sz == null ? sx || 1 : sz),
    );
  // merge parts [geometry, colour | [bottom, top] gradient over the part's height, matrix] into one vertex-coloured mesh
  function mg(parts) {
    const pos = [],
      nor = [],
      col = [],
      ca = new T.Color(),
      cb = new T.Color();
    parts.forEach(([g0, c, m]) => {
      const g = g0.index ? g0.toNonIndexed() : g0.clone();
      g0.dispose();
      // the gradient runs over the part's own height, worked out before it is moved into place
      g.computeBoundingBox();
      const y0 = g.boundingBox.min.y,
        y1 = g.boundingBox.max.y,
        ys = Array.from({ length: g.attributes.position.count }, (_, i) => g.attributes.position.getY(i));
      if (m) g.applyMatrix4(m);
      const p = g.attributes.position,
        n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i));
        nor.push(n.getX(i), n.getY(i), n.getZ(i));
        if (Array.isArray(c)) {
          const t = y1 > y0 ? (ys[i] - y0) / (y1 - y0) : 0;
          ca.setHex(c[0]).lerp(cb.setHex(c[1]), Math.max(0, Math.min(1, t)));
        } else ca.setHex(c);
        col.push(ca.r, ca.g, ca.b);
      }
      g.dispose();
    });
    const out = new T.BufferGeometry();
    out.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    out.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
    out.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  }
  const Cyl = (rt, rb, h, s) => new T.CylinderGeometry(rt, rb, h, s || 5, 1).translate(0, h / 2, 0);
  const Con = (r, h, s) => new T.ConeGeometry(r, h, s || 3, 1).translate(0, h / 2, 0);
  const Sph = (r, w, hh, p0, pl) => new T.SphereGeometry(r, w || 7, hh || 5, 0, 6.283, p0 || 0, pl || Math.PI);
  // geometry builders (each returns a merged vertex-coloured geometry; built once on first use)
  const GB = {
    grass(base, tip, n, h) {
      const L = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283 + i * 0.7,
          hh = h * (0.7 + (0.5 * ((i * 37) % 7)) / 7);
        L.push([
          Con(0.035, hh, 3),
          [base, tip],
          tf(Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06, Math.sin(a) * 0.35, a, -Math.cos(a) * 0.35),
        ]);
      }
      return mg(L);
    },
    flower(pet, mid) {
      const L = [[Cyl(0.012, 0.016, 0.34, 4), 0x3f7a3a]];
      L.push([Sph(0.05, 5, 3), 0x4f8f42, tf(0.04, 0.12, 0, 0, 0, -0.6, 1, 0.25, 0.5)]);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * 6.283;
        L.push([Sph(0.055, 6, 4), pet, tf(Math.cos(a) * 0.055, 0.35, Math.sin(a) * 0.055, 0, -a, 0.35, 1, 0.3, 0.6)]);
      }
      L.push([Sph(0.032, 6, 4), mid, tf(0, 0.36, 0)]);
      return mg(L);
    },
    // two or three blooms on one tuft
    flowers(pet, mid) {
      const one = GB.flower(pet, mid),
        L = [
          [one.clone(), null, tf(0, 0, 0)],
          [one.clone(), null, tf(0.12, 0, 0.06, 0.15, 1.2, -0.1, 0.8)],
          [one.clone(), null, tf(-0.08, 0, 0.1, -0.1, 2.4, 0.12, 0.65)],
        ];
      // keep each part's own colours
      const pos = [],
        nor = [],
        col = [];
      L.forEach(([g, , m]) => {
        g.applyMatrix4(m);
        pos.push(...g.attributes.position.array);
        nor.push(...g.attributes.normal.array);
        col.push(...g.attributes.color.array);
        g.dispose();
      });
      one.dispose();
      const out = new T.BufferGeometry();
      out.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
      out.setAttribute("normal", new T.Float32BufferAttribute(nor, 3));
      out.setAttribute("color", new T.Float32BufferAttribute(col, 3));
      out.computeBoundingSphere();
      return out;
    },
    pebbles(c) {
      const L = [];
      [
        [0, 0, 0.13],
        [0.17, 0.05, 0.08],
        [-0.1, 0.14, 0.06],
      ].forEach(([x, z, r], i) => L.push([GEOX.rock(r), c, tf(x, r * 0.35, z, 0, i * 1.7, 0, 1, 0.7, 1)]));
      return mg(L);
    },
    mush(stem, cap) {
      const L = [];
      [
        [0, 0, 1],
        [0.1, 0.06, 0.7],
        [-0.07, 0.09, 0.55],
      ].forEach(([x, z, s]) => {
        L.push([Cyl(0.025 * s, 0.035 * s, 0.17 * s, 5), stem, tf(x, 0, z)]);
        L.push([Sph(0.085 * s, 8, 4, 0, Math.PI / 2), cap, tf(x, 0.16 * s, z, 0, 0, 0, 1, 0.62, 1)]);
      });
      return mg(L);
    },
    crystals() {
      const L = [];
      [
        [0, 0, 0, 1],
        [0.09, 0.04, 0.4, 0.65],
        [-0.08, 0.06, -0.45, 0.55],
      ].forEach(([x, z, t, s]) =>
        L.push([
          new T.OctahedronGeometry(0.1, 0),
          [0x8fc8ee, 0xf2fbff],
          tf(x, 0.18 * s, z, t * 0.6, t * 2, t, 0.5 * s, 2.3 * s, 0.5 * s),
        ]),
      );
      return mg(L);
    },
    snow() {
      return mg([
        [Sph(0.34, 8, 5), 0xeef6ff, tf(0, -0.06, 0, 0, 0, 0, 1, 0.38, 0.8)],
        [Sph(0.2, 7, 4), 0xf6fbff, tf(0.25, -0.04, 0.1, 0, 0, 0, 1, 0.4, 1)],
      ]);
    },
    ember() {
      return mg([
        [GEOX.rock(0.17), 0x2e2222, tf(0, 0.07, 0, 0, 0, 0, 1, 0.75, 1)],
        [GEOX.rock(0.09), 0x3a2622, tf(0.2, 0.03, 0.08, 0, 1, 0, 1, 0.7, 1)],
      ]);
    },
    reeds() {
      const L = [];
      for (let i = 0; i < 6; i++) {
        const a = i * 1.9,
          h = 0.8 + ((i * 41) % 9) * 0.07;
        L.push([
          Con(0.025, h, 3),
          [0x3a4a26, 0x8a9a52],
          tf(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08, Math.sin(a) * 0.12, a, -Math.cos(a) * 0.12),
        ]);
      }
      [
        [0.03, 0.02, 1.05],
        [-0.06, -0.03, 0.9],
      ].forEach(([x, z, h]) => {
        L.push([Cyl(0.008, 0.01, h, 3), 0x5a6a34, tf(x, 0, z)]);
        L.push([Cyl(0.035, 0.035, 0.18, 6), 0x5a3a22, tf(x, h - 0.04, z)]);
      });
      return mg(L);
    },
  };
  const toonV = (o) => new T.MeshToonMaterial(Object.assign({ gradientMap: GR, vertexColors: true }, o));
  // kinds: [geometry builder, material maker, scale range]
  const KD = {
    grass: [() => GB.grass(0x2c5a34, 0x7ab060, 7, 0.42), () => sw(toonV({}), 0.28)],
    flL: [() => GB.flowers(0xb59cff, 0xffe27a), () => sw(toonV({}), 0.22)],
    flG: [() => GB.flowers(0xffd04a, 0xd0602a), () => sw(toonV({}), 0.22)],
    flW: [() => GB.flowers(0xf4f0ff, 0xffd84a), () => sw(toonV({}), 0.22)],
    flR: [() => GB.flowers(0xff7aa0, 0xfff0a0), () => sw(toonV({}), 0.22)],
    peb: [() => GB.pebbles(0x8a849c), () => toonV({})],
    mushT: [() => GB.mush(0xd8e8e0, 0x6af0ff), () => new T.MeshBasicMaterial({ vertexColors: true })],
    mushV: [() => GB.mush(0xe0d8f0, 0xc77cff), () => new T.MeshBasicMaterial({ vertexColors: true })],
    fgrass: [() => GB.grass(0x5a7a8a, 0xe4f4ff, 6, 0.36), () => sw(toonV({}), 0.26)],
    crys: [() => GB.crystals(), () => rimM(toonV({ emissive: 0x18466a, emissiveIntensity: 0.7 }), 0xffffff, 0.7, 1.8)],
    snow: [() => GB.snow(), () => toonV({})],
    pebF: [() => GB.pebbles(0x9aaabc), () => toonV({})],
    agrass: [() => GB.grass(0x2a1e1a, 0xd0702a, 6, 0.34), () => sw(toonV({}), 0.24)],
    ember: [() => GB.ember(), () => rimM(toonV({ emissive: 0x6a1a04, emissiveIntensity: 0.65 }), 0xff6a20, 0.6, 2)],
    flF: [() => GB.flowers(0xff7a2a, 0xfff07a), () => sw(toonV({ emissive: 0x3a1000, emissiveIntensity: 0.6 }), 0.2)],
    pebE: [() => GB.pebbles(0x5a5050), () => toonV({})],
    reed: [() => GB.reeds(), () => sw(toonV({}), 0.11)],
    mgrass: [() => GB.grass(0x223a2a, 0x6a8a4a, 7, 0.46), () => sw(toonV({}), 0.26)],
    pebM: [() => GB.pebbles(0x5a6a5a), () => toonV({})],
  };
  function sw(m, k) {
    m.userData.sway = k;
    m.userData.dtx = 0;
    return m;
  }
  function rimM(m, c, k, p) {
    m.userData.rim = c;
    m.userData.rimK = k;
    m.userData.rimP = p;
    m.userData.dtx = 0;
    return m;
  }
  const KC = {}; // built kinds: { g, m }
  const kind = (k) => {
    if (!KC[k]) {
      const d = KD[k],
        m = d[1]();
      if (m.userData.dtx == null) m.userData.dtx = 0;
      KC[k] = { g: d[0](), m };
    }
    return KC[k];
  };
  // themes: [kind, weight]
  const TH2 = {
    hub: [
      ["grass", 34],
      ["flL", 9],
      ["flG", 7],
      ["flW", 6],
      ["flR", 5],
      ["peb", 16],
      ["mushT", 5],
      ["mushV", 3],
    ],
    frost: [
      ["fgrass", 26],
      ["crys", 22],
      ["snow", 30],
      ["pebF", 18],
    ],
    ember: [
      ["agrass", 24],
      ["ember", 34],
      ["flF", 14],
      ["pebE", 24],
    ],
    marsh: [
      ["reed", 32],
      ["mgrass", 30],
      ["mushV", 12],
      ["mushT", 9],
      ["pebM", 10],
    ],
  };
  for (const k in TH2) TH2[k].sum = TH2[k].reduce((a, b) => a + b[1], 0);
  const pick = (th, r) => {
    let x = r * th.sum;
    for (const [k, w] of th) if ((x -= w) <= 0) return k;
    return th[0][0];
  };
  // places that stay bare: the dungeon interiors, shop rooms, the tower (v36: the area south of the square is no longer
  // kept clear for the old Lantern Row / Gardens builds)
  const bare = (x, z) => (Math.abs(x) > 1400 && Math.abs(x) < 2900 && z < -1300) || (x < 2800 && z > 100) || z < -800;
  const CS = 48,
    ST = MED ? 1.4 : 1.15,
    DENS = MED ? 0.38 : 0.55,
    CH = new Map(),
    Q = [];
  // v31b: one row of the walk grid at a time (build is a generator run a few ms per frame, so no hitch)
  function walkRow(w, x0, z0, n, i) {
    const lk = LKON;
    LKON = false; // locked roads still count as roads (no flowers growing on them for later)
    try {
      for (let j = 0; j < n; j++) {
        const x = x0 + i * ST,
          z = z0 + j * ST;
        w[i * n + j] = okp(x, z) || !!trOn(x, z) ? 1 : 0;
      }
    } catch (e) {
    } finally {
      LKON = lk;
    }
  }
  function* build(key, cx, cz) {
    const pad = 3,
      n = Math.ceil(CS / ST) + pad * 2,
      x0 = cx * CS - pad * ST,
      z0 = cz * CS - pad * ST,
      w = new Uint8Array(n * n),
      B = {};
    for (let i = 0; i < n; i++) {
      walkRow(w, x0, z0, n, i);
      yield;
    }
    for (let i = pad; i < n - pad; i++)
      for (let j = pad; j < n - pad; j++) {
        if (w[i * n + j]) continue;
        let x = x0 + i * ST,
          z = z0 + j * ST;
        if (hs(x, z, 3) > DENS || bare(x, z)) continue;
        // a verge: some walkable spot within two cells
        let near = 0;
        for (let a = -2; a <= 2 && !near; a++)
          for (let b = -2; b <= 2 && !near; b++) if (w[(i + a) * n + j + b]) near = 1;
        if (!near) continue;
        const th = TH2[zoneAt(x, z)];
        if (!th) continue;
        x += (hs(x, z, 1) - 0.5) * ST * 0.8;
        z += (hs(x, z, 2) - 0.5) * ST * 0.8;
        const k = pick(th, hs(x, z, 5));
        (B[k] || (B[k] = [])).push(x, z, hs(x, z, 6) * 6.283, 0.75 + hs(x, z, 7) * 0.65, 0.82 + hs(x, z, 8) * 0.3);
      }
    const gp = new T.Group();
    gp.name = "luster:" + key;
    for (const k in B) {
      const L = B[k],
        c = L.length / 5,
        K = kind(k),
        im = new T.InstancedMesh(K.g, K.m, c);
      im.userData.lus = 1;
      for (let q = 0; q < c; q++) {
        const o = q * 5;
        im.setMatrixAt(q, tf(L[o], 0, L[o + 1], 0, L[o + 2], 0, L[o + 3]));
        if (im.setColorAt) im.setColorAt(q, CC.setScalar(L[o + 4]));
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      // three r128 culls an instanced mesh by one instance's sphere at the origin, so culling is off here and whole
      // chunks are hidden by distance / facing in chunks() instead
      im.frustumCulled = false;
      gp.add(im);
    }
    gp.userData.c = [cx * CS + CS / 2, cz * CS + CS / 2];
    S.add(gp);
    CH.set(key, gp);
  }
  // chunks near the camera are built (nearest first, one per frame) and shown; far ones are hidden
  function chunks() {
    if (LOW || typeof C === "undefined") return;
    const px = C.position.x,
      pz = C.position.z,
      R0 = 78, // v31b: the fog ends ~96 away, so nothing past that is ever seen
      R1 = 96;
    const a0 = Math.floor((px - R0) / CS),
      a1 = Math.floor((px + R0) / CS),
      b0 = Math.floor((pz - R0) / CS),
      b1 = Math.floor((pz + R0) / CS);
    let add = 0;
    for (let a = a0; a <= a1; a++)
      for (let b = b0; b <= b1; b++) {
        const k = a + "," + b;
        if (CH.has(k)) continue;
        if (Math.hypot(a * CS + CS / 2 - px, b * CS + CS / 2 - pz) > R0 + CS * 0.71) continue;
        CH.set(k, null);
        Q.push([k, a, b]);
        add = 1;
      }
    if (add) Q.sort((p, q) => d2(q) - d2(p)); // nearest at the end (popped first)
    function d2(e) {
      return (e[1] * CS + CS / 2 - px) ** 2 + (e[2] * CS + CS / 2 - pz) ** 2;
    }
    for (const gp of CH.values()) {
      if (!gp) continue;
      const c = gp.userData.c,
        d = Math.hypot(c[0] - px, c[1] - pz);
      gp.visible = d < R1;
      // chunks well behind the camera are hidden too (their meshes don't frustum-cull, see build)
      if (gp.visible && d > CS) {
        V1.set(c[0] - px, 0, c[1] - pz).normalize();
        C.getWorldDirection(V2);
        V2.y = 0;
        V2.normalize();
        if (V1.dot(V2) < -0.55) gp.visible = false;
      }
    }
  }
  // ---------- per-frame upkeep ----------
  let fr = 0,
    job = null;
  function tick() {
    requestAnimationFrame(tick);
    TIME.value = performance.now() / 1000;
    fr++;
    // keep contact shadows on the ground while their owner hops, rides or floats
    for (let i = 0; i < LIFT.length; i++) {
      const r = LIFT[i],
        m = r.userData.lusS;
      if (!m) continue;
      const y = r.position.y;
      if (y !== m.userData.y0) {
        m.userData.y0 = y;
        m.position.y = (0.04 - Math.max(0, y)) / (r.scale.y || 1);
      }
    }
    if (fr % 20 === 0) chunks();
    // v31b: chunk building gets ~2.5 ms a frame, so walking into new ground never stalls a frame
    if (!job && Q.length) {
      const e = Q.pop();
      job = build(e[0], e[1], e[2]);
    }
    if (job) {
      const t0 = performance.now();
      try {
        while (job && performance.now() - t0 < 2.5) if (job.next().done) job = null;
      } catch (err) {
        console.warn("luster chunk", err);
        job = null;
      }
    }
    // v31b: shadows and gloom smoke/haze far from the camera are hidden (fog hides them anyway, but they still cost)
    if (fr % 15 === 0 && typeof C !== "undefined") {
      const cx = C.position.x,
        cz = C.position.z;
      for (let i = 0; i < LIFT.length; i++) {
        const r = LIFT[i],
          m = r.userData.lusS,
          e = r.matrixWorld.elements,
          d = Math.hypot(e[12] - cx, e[14] - cz);
        if (m) m.visible = d < 48;
        const G = r.userData.lusG;
        if (G) {
          const on = d < 42;
          G.w.forEach((w) => (w.s.visible = on));
          if (G.au) G.au.visible = on;
        }
      }
    }
    if (fr % 1200 === 0) {
      // models that left the scene for good (battle copies, old summons)
      for (let i = LIFT.length - 1; i >= 0; i--) if (!LIFT[i].parent) LIFT.splice(i, 1);
    }
  }
  // ---------- dress what is already built ----------
  function pass() {
    try {
      if (typeof W !== "undefined") {
        rimTag(W, 0x9db4ff, 0.3, 2.6);
        shadow(W, 0.78);
      }
      const fs = new Set();
      (typeof foes !== "undefined" ? foes : []).forEach((f) => {
        const m = f && (f.o || f.m); // street foes keep their model in f.o
        if (m) {
          dress(m);
          fs.add(m);
        }
      });
      // townsfolk, quest-givers and other characters tagged by dtChar (36-detail) on load
      const L = [];
      S.traverse((o) => {
        if (o.userData && o.userData.dtc && !o.userData.lusD && !fs.has(o) && o !== W) L.push(o);
      });
      L.forEach((o) => {
        o.userData.lusD = 1;
        if (o.userData.gl && o.userData.coreM) return gloomPlus(o);
        rimTag(o, 0x9db4ff, 0.24, 2.6);
        if (!o.userData.lusS) shadow(o, Math.min(1.6, foot(o, 0.36)));
      });
    } catch (e) {
      console.warn("luster", e);
    }
    requestAnimationFrame(tick);
  }
  if (document.readyState === "complete") pass();
  else addEventListener("load", pass);
  return { TIME, rimTag, shadow, dress, chunks: CH };
})();
