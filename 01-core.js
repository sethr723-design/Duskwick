// DUSKWICK - 01-core.js: Setup: dev flags, renderer, scene, lights, materials, textures, particles (puff/mote), hit flash.
// Loaded in order by index.html as plain scripts; they share one global scope.
const $ = (id) => document.getElementById(id),
  stage = $("stage"),
  T = THREE;
let SPD = 1; // battle speed (1x / 2x); every tween and wait is scaled by it
// v9 developer mode: saved in this browser (not per character). god = no damage, pf = foes never start fights,
// nc = noclip, nw = walk through gloom wards, sp = move speed, fps = frame counter
const DEV = (() => {
  let d = {};
  try {
    d = JSON.parse(localStorage.getItem("duskwick_dev") || "{}");
  } catch (e) {}
  return Object.assign({ on: 0, god: 0, pf: 0, nc: 0, nw: 0, sp: 1, fps: 1 }, d);
})();
const devSv = () => {
  try {
    localStorage.setItem("duskwick_dev", JSON.stringify(DEV));
  } catch (e) {}
  document.body.classList.toggle("dev", !!DEV.on);
};
const tw = (ms, f) =>
  new Promise((r) => {
    ms /= SPD;
    const t0 = performance.now();
    (function s() {
      const k = Math.min(1, (performance.now() - t0) / ms);
      f(k);
      k < 1 ? requestAnimationFrame(s) : r();
    })();
  });
const wait = (ms) => new Promise((r) => setTimeout(r, ms / SPD));
// ---------- renderer ----------
// graphics quality (Book > Options), saved in this browser: caps the pixel ratio and the number of lit point lights;
// low also turns off anti-aliasing, which only takes effect the next time the game is opened
let GFX = "high";
try {
  GFX = localStorage.getItem("duskwick_gfx") || "high";
} catch (e) {}
const GFXQ = { high: { pr: 1.75, lp: 4 }, med: { pr: 1.25, lp: 3 }, low: { pr: 1, lp: 2 } };
if (!GFXQ[GFX]) GFX = "high";
const R = new T.WebGLRenderer({
  antialias: GFX !== "low" && devicePixelRatio < 2,
  alpha: true,
  powerPreference: "high-performance",
});
R.setPixelRatio(Math.min(devicePixelRatio, GFXQ[GFX].pr));
function setGfx(q) {
  GFX = q;
  try {
    localStorage.setItem("duskwick_gfx", q);
  } catch (e) {}
  R.setPixelRatio(Math.min(devicePixelRatio, GFXQ[q].pr));
}
stage.insertBefore(R.domElement, stage.firstChild);
R.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
R.domElement.addEventListener("webglcontextrestored", () => location.reload());
// v17 glow strength (Book > Options), saved in this browser. Every additive (glowing) material has its alpha scaled by
// GLOWU in the shader, and every emissive surface by GLOWE, so all halos, sparks, spell lights and glowing eyes/windows
// follow one setting without touching each effect. Shared uniform objects = changing .value applies live.
const GLOWQ = { soft: [0.42, 0.7], med: [0.62, 0.85], bright: [1, 1] };
let GLOW = "med";
try {
  GLOW = localStorage.getItem("duskwick_glow") || "med";
} catch (e) {}
if (!GLOWQ[GLOW]) GLOW = "med";
const GLOWU = { value: GLOWQ[GLOW][0] },
  GLOWE = { value: GLOWQ[GLOW][1] };
function setGlow(q) {
  if (!GLOWQ[q]) return;
  GLOW = q;
  GLOWU.value = GLOWQ[q][0];
  GLOWE.value = GLOWQ[q][1];
  try {
    localStorage.setItem("duskwick_glow", q);
  } catch (e) {}
}
T.Material.prototype.onBeforeCompile = function (sh) {
  const add = this.blending === T.AdditiveBlending;
  let f = sh.fragmentShader;
  if (f.indexOf("vec3 totalEmissiveRadiance = emissive;") >= 0) {
    f =
      "uniform float glowE;\n" +
      f.replace("vec3 totalEmissiveRadiance = emissive;", "vec3 totalEmissiveRadiance = emissive * glowE;");
    sh.uniforms.glowE = GLOWE;
  }
  if (add && f.indexOf("#include <fog_fragment>") >= 0) {
    f =
      "uniform float glowK;\n" +
      f.replace("#include <fog_fragment>", "#include <fog_fragment>\n\tgl_FragColor.a *= glowK;");
    sh.uniforms.glowK = GLOWU;
  }
  // v28 surface detail: a material with userData.dtx = a DTX key ("stone", "wood", ...; a string so material.clone()
  // copies it safely) gets a fine greyscale pattern multiplied into its colour. It is sampled triplanar in the mesh's
  // own space (scaled to world size), so it needs no UVs, never stretches on long boxes and doesn't swim on moving
  // foes. Mean grey 0.5 = brightness neutral.
  const dt = this.userData && this.userData.dtx && typeof DTX !== "undefined" && DTX[this.userData.dtx];
  if (
    dt &&
    f.indexOf("#include <map_fragment>") >= 0 &&
    sh.vertexShader.indexOf("#include <project_vertex>") >= 0 &&
    sh.vertexShader.indexOf("#include <beginnormal_vertex>") >= 0
  ) {
    sh.vertexShader =
      "varying vec3 vDtP;\nvarying vec3 vDtN;\n" +
      sh.vertexShader.replace(
        "#include <project_vertex>",
        [
          "#include <project_vertex>",
          "#ifdef USE_INSTANCING",
          "vDtP = (instanceMatrix * vec4(transformed, 1.0)).xyz;",
          "vDtN = mat3(instanceMatrix) * objectNormal;",
          "#else",
          "vDtP = transformed;",
          "vDtN = objectNormal;",
          "#endif",
          // v28b: static world in WORLD space, so overlapping pieces show the very same pattern (no shimmer where
          // they z-fight) and neighbouring pieces line up; moving characters (dto) in their own space, so it can't swim
          this.userData.dto
            ? "vDtP *= length(modelMatrix[0].xyz);"
            : "vDtP = (modelMatrix * vec4(vDtP, 1.0)).xyz; vDtN = mat3(modelMatrix) * vDtN;",
        ].join("\n"),
      );
    f =
      "uniform sampler2D dtMap;\nuniform float dtS;\nuniform float dtK;\nvarying vec3 vDtP;\nvarying vec3 vDtN;\n" +
      f.replace(
        "#include <map_fragment>",
        [
          "#include <map_fragment>",
          "{",
          "  vec3 dw = pow(abs(normalize(vDtN)) + 0.0001, vec3(4.0));",
          "  dw /= dw.x + dw.y + dw.z;",
          "  vec3 dp = vDtP * dtS;",
          "  float dd = texture2D(dtMap, dp.zy).r * dw.x + texture2D(dtMap, dp.xz + 0.37).r * dw.y + texture2D(dtMap, dp.xy + 0.61).r * dw.z;",
          "  diffuseColor.rgb *= 1.0 + (dd - 0.5) * dtK;",
          "}",
        ].join("\n"),
      );
    sh.uniforms.dtMap = { value: dt.map };
    sh.uniforms.dtS = { value: dt.s };
    sh.uniforms.dtK = { value: dt.k };
  }
  sh.fragmentShader = f;
};
// additive and normal copies of the same shader need different programs (only one gets the glowK line)
T.Material.prototype.customProgramCacheKey = function () {
  return (
    this.onBeforeCompile.toString() +
    (this.blending === T.AdditiveBlending ? "|glow" : "") +
    (this.userData && this.userData.dtx && typeof DTX !== "undefined" && DTX[this.userData.dtx]
      ? this.userData.dto
        ? "|dto"
        : "|dt"
      : "")
  );
};
const S = new T.Scene(),
  C = new T.PerspectiveCamera(42, 1, 0.3, 340);
S.fog = new T.Fog(0x4a2a63, 34, 96);
// softer lighting: more fill from the sky, a gentler key light and a low ambient so shadow sides never go muddy
const HL = new T.HemisphereLight(0xffc9a0, 0x4a3f7b, 0.82);
S.add(HL);
const sun = new T.DirectionalLight(0xffb27a, 0.55);
sun.position.set(4, 9, 7);
S.add(sun);
const AMB = new T.AmbientLight(0xb8a8e0, 0.16);
S.add(AMB);
// ---------- helpers ----------
// 6-step toon ramp starting at ~47% (was 4 steps from 27%) = smoother, less contrasty shading bands
const MC = {},
  PCX = {},
  GR = new T.DataTexture(Uint8Array.from([120, 148, 176, 204, 230, 255]), 6, 1, T.LuminanceFormat);
// v29: linear filtering blends the bands into each other, so shading reads as soft painted light, not hard stripes
GR.minFilter = GR.magFilter = GFX === "low" ? T.NearestFilter : T.LinearFilter;
GR.needsUpdate = true;
const PAT = {
  0x35408f: "cloth",
  0x7a2a5a: "cloth",
  0x232a63: "stars",
  0x7a5cd6: "skin",
  0xd94a4a: "skin",
  0x3aa86b: "skin",
  0xe0702a: "skin",
  0x5a2a8a: "skin",
  0xa9c4d8: "skin",
  0x4a2a2a: "skin",
  0xeaf4ff: "skin",
  0xcdb89a: "brick",
  0x9fb4c8: "brick",
  0xc79a9a: "brick",
  0xa9c79a: "brick",
  0x7a3a4a: "tile",
  0x3a4a7a: "tile",
  0x4a6a3a: "tile",
  0x6a4a2a: "tile",
  0x6b4a2b: "wood",
  0x8a5a2b: "wood",
  0x7a4a2a: "wood",
  0x4a2f1b: "wood",
  0x8a849c: "stone",
  0x5a5470: "stone",
};
function ptex(n) {
  if (PCX[n]) return PCX[n];
  // v28: painted at 256 px (the 128 px drawing scaled up); v47: clean painted patterns, no grain
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d"),
    R2 = Math.random;
  x.scale(2, 2);
  x.fillStyle = n === "stars" ? "#232a63" : "#e6e6e6";
  x.fillRect(0, 0, 128, 128);
  const dots = (col, k, z) => {
    x.fillStyle = col;
    for (let i = 0; i < k; i++) x.fillRect(R2() * 128, R2() * 128, 1 + R2() * z, 1 + R2() * z);
  };
  // v47 clean look: smooth hand-painted patterns (soft light/shade, clean edges, no speckle grain). Greyscale, so the
  // material colour tints them true. Everything is drawn wrapped so the texture still tiles.
  const wrap = (f) => {
    for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) f(ox, oy);
  };
  // one rounded block: dark grout shadow, a top-lit gradient face and a thin highlight along the top edge
  const block = (bx, by, bw, bh, r, lo, hi) =>
    wrap((ox, oy) => {
      const px = bx + ox,
        py = by + oy;
      if (px > 128 || py > 128 || px + bw < 0 || py + bh < 0) return;
      x.fillStyle = "rgba(40,36,50,.28)";
      txRR(x, px + 0.8, py + 1.4, bw, bh, r);
      x.fill();
      const g = x.createLinearGradient(0, py, 0, py + bh);
      g.addColorStop(0, hi);
      g.addColorStop(1, lo);
      x.fillStyle = g;
      txRR(x, px, py, bw, bh, r);
      x.fill();
      x.strokeStyle = "rgba(255,255,255,.35)";
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(px + r, py + 1);
      x.lineTo(px + bw - r, py + 1);
      x.stroke();
    });
  const shade = (v) => {
    const k = Math.round(v);
    return "rgb(" + k + "," + k + "," + k + ")";
  };
  if (n === "cloth") {
    // soft vertical folds
    const g = x.createLinearGradient(0, 0, 128, 0);
    for (let i = 0; i <= 16; i++) {
      const v = 214 + 26 * (0.5 + 0.5 * Math.cos((i / 16) * Math.PI * 2 * 3));
      g.addColorStop(i / 16, shade(v));
    }
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    x.strokeStyle = "rgba(60,50,80,.08)";
    x.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const px = ((i + 0.5) / 3) * 128;
      x.beginPath();
      x.moveTo(px, 0);
      x.bezierCurveTo(px + 4, 45, px - 4, 85, px, 128);
      x.stroke();
    }
  } else if (n === "stars") {
    x.fillStyle = "#fff";
    for (let i = 0; i < 26; i++) {
      x.beginPath();
      x.arc(R2() * 128, R2() * 128, 0.7 + R2() * 1.5, 0, 7);
      x.fill();
    }
    x.fillStyle = "#ffd34d";
    x.beginPath();
    x.arc(96, 30, 10, 0, 7);
    x.fill();
    x.fillStyle = "#232a63";
    x.beginPath();
    x.arc(101, 27, 9, 0, 7);
    x.fill();
  } else if (n === "skin") {
    // smooth, with a few very soft painted patches
    x.fillStyle = "#ececec";
    x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 10; i++) {
      const cx = R2() * 128,
        cy = R2() * 128,
        r = 18 + R2() * 26,
        a = 0.05 + R2() * 0.05,
        col = i % 2 ? "0,0,0" : "255,255,255";
      wrap((ox, oy) => {
        const q = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
        q.addColorStop(0, "rgba(" + col + "," + a + ")");
        q.addColorStop(1, "rgba(" + col + ",0)");
        x.fillStyle = q;
        x.fillRect(cx + ox - r, cy + oy - r, r * 2, r * 2);
      });
    }
  } else if (n === "stone") {
    // v47 cut stone (fountain, arches, pillars, plinths, chimneys, steps): neat ashlar blocks in 4 courses, softly
    // rounded corners, light mortar. Sampled triplanar in world space by 71-clean, so it never stretches.
    x.fillStyle = "#a6a2ae";
    x.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 4; r++) {
      const off = r % 2 ? 21 : 0;
      for (let k = 0; k < 3; k++) {
        const v = 226 + (((r * 5 + k * 11) % 5) - 2) * 7;
        block(off + k * 42.67 + 1.6, r * 32 + 1.6, 39.4, 28.8, 4, shade(v - 26), shade(Math.min(255, v + 8)));
      }
    }
  } else if (n === "brick") {
    // walls: big rounded storybook stones in staggered courses, each a little lighter or darker
    x.fillStyle = "#8e8a96";
    x.fillRect(0, 0, 128, 128);
    const rows = [
      [0, 44, 84],
      [0, 30, 72, 104],
      [0, 50, 90],
      [0, 22, 62, 100],
    ];
    rows.forEach((cuts, r) =>
      cuts.forEach((c0, k) => {
        const c1 = k + 1 < cuts.length ? cuts[k + 1] : 128,
          v = 222 + (((r * 7 + k * 13) % 5) - 2) * 8;
        block(c0 + 1.5 + (r % 2) * 6, r * 32 + 1.5, c1 - c0 - 3, 29, 9, shade(v - 26), shade(v + 14));
      }),
    );
  } else if (n === "tile") {
    // roofs: rounded shingles in staggered rows, lit at the top, a soft shadow along the lower edge
    x.fillStyle = "#9a9a9a";
    x.fillRect(0, 0, 128, 128);
    for (let r = 0; r < 8; r++)
      for (let q = -1; q < 5; q++) {
        const sx = q * 32 + (r % 2) * 16,
          sy = r * 16,
          v = 226 + (((r * 5 + q * 3 + 20) % 4) - 1.5) * 7;
        wrap((ox, oy) => {
          const px = sx + ox,
            py = sy + oy;
          if (px > 128 || py > 128 || px + 32 < 0 || py + 20 < 0) return;
          const g = x.createLinearGradient(0, py, 0, py + 18);
          g.addColorStop(0, shade(v + 12));
          g.addColorStop(1, shade(v - 34));
          x.fillStyle = "rgba(40,36,50,.3)";
          x.beginPath();
          x.moveTo(px + 1, py);
          x.lineTo(px + 31, py);
          x.lineTo(px + 31, py + 10);
          x.quadraticCurveTo(px + 31, py + 19.5, px + 16, py + 19.5);
          x.quadraticCurveTo(px + 1, py + 19.5, px + 1, py + 10);
          x.fill();
          x.fillStyle = g;
          x.beginPath();
          x.moveTo(px + 1.5, py);
          x.lineTo(px + 30.5, py);
          x.lineTo(px + 30.5, py + 9);
          x.quadraticCurveTo(px + 30.5, py + 17.5, px + 16, py + 17.5);
          x.quadraticCurveTo(px + 1.5, py + 17.5, px + 1.5, py + 9);
          x.fill();
        });
      }
  } else if (n === "wood") {
    // planks: four boards with dark seams, a lit edge and a few long smooth grain lines
    x.fillStyle = "#6e6a74";
    x.fillRect(0, 0, 128, 128);
    for (let k = 0; k < 4; k++) {
      const v = 220 + ((k * 5) % 3) * 9 - 9,
        g = x.createLinearGradient(k * 32, 0, k * 32 + 32, 0);
      g.addColorStop(0, shade(v + 14));
      g.addColorStop(0.2, shade(v));
      g.addColorStop(1, shade(v - 22));
      x.fillStyle = g;
      x.fillRect(k * 32 + 1, 0, 30, 128);
      x.strokeStyle = "rgba(60,40,30,.13)";
      x.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const px = k * 32 + 6 + i * 9 + R2() * 3;
        x.beginPath();
        x.moveTo(px, 0);
        x.bezierCurveTo(px + 3, 40, px - 3, 88, px, 128);
        x.stroke();
      }
      if (k % 2) {
        const ky = 30 + R2() * 70;
        x.strokeStyle = "rgba(60,40,30,.2)";
        x.beginPath();
        x.ellipse(k * 32 + 16, ky, 3, 6, 0, 0, 7);
        x.stroke();
      }
    }
  } else {
    // plain stone and the rest: broad soft light and shade only
    for (let i = 0; i < 14; i++) {
      const cx = R2() * 128,
        cy = R2() * 128,
        r = 14 + R2() * 24,
        a = 0.06 + R2() * 0.06,
        col = i % 2 ? "0,0,0" : "255,255,255";
      wrap((ox, oy) => {
        const q = x.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, r);
        q.addColorStop(0, "rgba(" + col + "," + a + ")");
        q.addColorStop(1, "rgba(" + col + ",0)");
        x.fillStyle = q;
        x.fillRect(cx + ox - r, cy + oy - r, r * 2, r * 2);
      });
    }
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = TEXA;
  t.repeat.set(2, 2);
  return (PCX[n] = t);
}
const M = (c, u) => {
  const k = PAT[c],
    mat = () => {
      const m = new T.MeshToonMaterial({
        color: k === "stars" ? 0xffffff : c,
        map: k ? ptex(k) : null,
        gradientMap: GR,
      });
      // v28 surface detail (01-core onBeforeCompile); painted patterns get a lighter touch
      const d = k === "stars" ? null : k ? "soft" : dtKind(c);
      if (d) m.userData.dtx = d;
      return m;
    };
  return u ? mat() : MC[c] || (MC[c] = mat());
};
// v47 clean look: a finer, softer ink line (was 0x1e1634 at 1.055x)
const OLM = new T.MeshBasicMaterial({ color: 0x2a2140, side: T.BackSide });
function outline(g) {
  const a = [];
  g.traverse((o) => {
    if (o.isMesh && !o.userData.nol) a.push(o);
  });
  a.forEach((m) => {
    const o = new T.Mesh(m.geometry, OLM);
    o.userData.ol = 1;
    o.position.copy(m.position);
    o.rotation.copy(m.rotation);
    o.scale.copy(m.scale).multiplyScalar(1.035);
    m.parent.add(o);
  });
  return g;
}
// hat: a light woven fabric map (so cosmetic colours tint true) + stars drawn into an emissive map so they glow on any colour
const HATT = (() => {
  const mk2 = (fn) => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    fn(c.getContext("2d"));
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  };
  const fab = mk2((x) => {
    x.fillStyle = "#f2f2f2";
    x.fillRect(0, 0, 128, 128);
    // v47: a faint clean weave only (no flecks)
    x.strokeStyle = "rgba(0,0,0,.035)";
    for (let i = 0; i < 128; i += 4) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, 128);
      x.moveTo(0, i);
      x.lineTo(128, i);
      x.stroke();
    }
  });
  const star = (x, cx, cy, r) => {
    for (const ox of [-128, 0, 128])
      for (const oy of [-128, 0, 128]) {
        x.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2,
            rr = i % 2 ? r * 0.42 : r;
          x.lineTo(cx + ox + Math.cos(a) * rr, cy + oy + Math.sin(a) * rr);
        }
        x.closePath();
        x.fill();
      }
  };
  const em = mk2((x) => {
    x.fillStyle = "#000";
    x.fillRect(0, 0, 128, 128);
    x.fillStyle = "#fff";
    [
      [18, 22, 7],
      [70, 14, 4],
      [104, 46, 6],
      [40, 64, 4],
      [86, 88, 7],
      [20, 104, 5],
      [60, 112, 3],
      [118, 108, 3],
    ].forEach((s) => star(x, ...s));
    x.fillStyle = "rgba(255,255,255,.7)";
    for (let i = 0; i < 30; i++) {
      x.beginPath();
      x.arc(Math.random() * 128, Math.random() * 128, 0.8, 0, 7);
      x.fill();
    }
  });
  const rep = (t, u, v) => {
    const k = t.clone();
    k.needsUpdate = true;
    k.repeat.set(u, v);
    return k;
  };
  return {
    mat: (u, v) => {
      const m = new T.MeshToonMaterial({
        color: 0x2a3170,
        map: rep(fab, u, v),
        emissiveMap: rep(em, u, v),
        emissive: 0xffe6a0,
        emissiveIntensity: 0.85,
        gradientMap: GR,
      });
      m.userData.hat = 1;
      return m;
    },
  };
})();
const mk = (g, c, x = 0, y = 0, z = 0, u) => {
  const m = new T.Mesh(g, M(c, u));
  m.position.set(x, y, z);
  return m;
};
// v29 bevelled boxes: every B() box gets a thin rounded edge (b = 12% of its thinnest side, max 0.09) so walls, crates,
// planks and roofs catch a soft highlight along their edges instead of meeting at a razor corner. Built from a 3x3x3
// BoxGeometry: the inner grid lines move out to the bevel line, edge/corner vertices are pulled onto a rounded edge, and
// normals point out from the inner box (smooth edges, flat faces). UVs are remapped so textures don't stretch. Same
// geometry type and parameters as a plain box. Low quality keeps plain boxes.
function bevBox(w, h, d) {
  const b = Math.min(0.09, 0.12 * Math.min(w, h, d));
  if (GFX === "low" || !(b > 0.004)) return new T.BoxGeometry(w, h, d);
  const g = new T.BoxGeometry(w, h, d, 3, 3, 3),
    hf = [w / 2, h / 2, d / 2],
    p = g.attributes.position,
    n = g.attributes.normal,
    uv = g.attributes.uv,
    // u/v axes of each face group, in BoxGeometry order px nx py ny pz nz (16 vertices each)
    UA = [2, 2, 0, 0, 0, 0],
    VA = [1, 1, 2, 2, 1, 1],
    q = [0, 0, 0],
    c = [0, 0, 0];
  for (let i = 0; i < p.count; i++) {
    q[0] = p.getX(i);
    q[1] = p.getY(i);
    q[2] = p.getZ(i);
    const f = Math.min(5, (i / 16) | 0);
    // inner grid lines (at +-h/3) move out to +-(h - b); remember the ratio for the UVs
    const r = [1, 1, 1];
    for (let a = 0; a < 3; a++)
      if (Math.abs(q[a]) < hf[a] * 0.9) {
        const s = q[a] === 0 ? 0 : Math.sign(q[a]);
        r[a] = (hf[a] - b) / (hf[a] / 3);
        q[a] = s * (hf[a] - b);
      }
    for (let a = 0; a < 3; a++) c[a] = Math.max(-(hf[a] - b), Math.min(hf[a] - b, q[a]));
    let dx = q[0] - c[0],
      dy = q[1] - c[1],
      dz = q[2] - c[2];
    const l = Math.hypot(dx, dy, dz) || 1;
    dx /= l;
    dy /= l;
    dz /= l;
    p.setXYZ(i, c[0] + dx * b, c[1] + dy * b, c[2] + dz * b);
    n.setXYZ(i, dx, dy, dz);
    const u = uv.getX(i),
      v = uv.getY(i);
    uv.setXY(i, 0.5 + (u - 0.5) * r[UA[f]], 0.5 + (v - 0.5) * r[VA[f]]);
  }
  p.needsUpdate = n.needsUpdate = uv.needsUpdate = true;
  return g;
}
// v28c: rounder defaults (Low quality keeps the old ones); v47: rounder again on High
const B = (w, h, d) => bevBox(w, h, d),
  Cn = (r, h, s) => new T.ConeGeometry(r, h, s || (GFX === "low" ? 7 : GFX === "high" ? 14 : 10)),
  Cy = (a, b, h, s) => new T.CylinderGeometry(a, b, h, s || (GFX === "low" ? 8 : GFX === "high" ? 16 : 12)),
  Sp = (r, s) =>
    s
      ? new T.SphereGeometry(r, s, Math.max(4, s - 2))
      : GFX === "low"
        ? new T.SphereGeometry(r, 10, 8)
        : GFX === "high"
          ? new T.SphereGeometry(r, 18, 12)
          : new T.SphereGeometry(r, 14, 10);
// v47 clean look: a smooth turned shape from a profile of [radius, y] points (Catmull-Rom through them) for sculpted
// robes, torsos, mantles and hats. A first/last point with radius ~0 closes that end. s = segments around.
const Lt = (pts, s, n) => {
  const c = new T.SplineCurve(pts.map(([r, y]) => new T.Vector2(r, y))),
    P = c.getPoints(n || pts.length * 6).map((p) => new T.Vector2(Math.max(0.0001, p.x), p.y));
  return new T.LatheGeometry(P, s || (GFX === "low" ? 12 : 32));
};
// v28c shaped scenery geometry (deterministic: shapes come from a position hash, never from rnd). Low quality gets the
// old plain shapes. fir(r, h, s) = a cone tier with a lobed, drooping skirt (s = old segment count for Low),
// rock(r) = a craggy jittered dodecahedron, bush(r) = a lumpy soft ball. sn(g) = smooth normals that ignore UV seams.
const GEOX = (() => {
  const hs = (x, y, z) => {
      const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
      return v - Math.floor(v);
    },
    key = (p, i) => Math.round(p.getX(i) * 1e3) + "," + Math.round(p.getY(i) * 1e3) + "," + Math.round(p.getZ(i) * 1e3);
  function sn(g) {
    g.computeVertexNormals();
    const p = g.attributes.position,
      n = g.attributes.normal,
      acc = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = key(p, i),
        a = acc.get(k) || [0, 0, 0];
      a[0] += n.getX(i);
      a[1] += n.getY(i);
      a[2] += n.getZ(i);
      acc.set(k, a);
    }
    for (let i = 0; i < p.count; i++) {
      const a = acc.get(key(p, i)),
        l = Math.hypot(a[0], a[1], a[2]) || 1;
      n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
    }
    n.needsUpdate = true;
    return g;
  }
  const jit = (g, r, amt, fy) => {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        k = 1 - amt + 2 * amt * hs(Math.round(x * 100) / 100, Math.round(y * 100) / 100, Math.round(z * 100) / 100);
      p.setXYZ(i, x * k, y * k * fy, z * k);
    }
    p.needsUpdate = true;
    return g;
  };
  return {
    sn,
    fir(r, h, s) {
      if (GFX === "low") return new T.ConeGeometry(r, h, s || 7);
      const L = 8,
        g = new T.ConeGeometry(r, h, L * 2, 2),
        p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i),
          t = (y + h / 2) / h,
          a = Math.atan2(z, x),
          lb = 0.5 + 0.5 * Math.cos(L * a),
          k = 1 + 0.16 * (1 - t) * (lb - 0.4);
        p.setXYZ(i, x * k, y - h * 0.09 * (1 - t) * (1 - t) * lb, z * k);
      }
      return sn(g);
    },
    rock(r) {
      if (GFX === "low") return new T.DodecahedronGeometry(r, 0);
      // v47 clean look: smooth, rounded boulders (were flat chipped facets)
      return sn(jit(new T.DodecahedronGeometry(r, 1), r, 0.12, 0.82));
    },
    bush(r) {
      if (GFX === "low") return new T.IcosahedronGeometry(r, 0);
      return sn(jit(new T.IcosahedronGeometry(r, 1), r, 0.13, 0.9));
    },
  };
})();
const add = (g, c, x, y, z) => {
  const m = mk(g, c, x, y, z);
  S.add(m);
  return m;
};
// v28: anisotropic filtering keeps ground textures crisp at a slant (high/med quality)
const TEXA = GFX === "low" ? 1 : Math.min(GFX === "high" ? 8 : 4, R.capabilities.getMaxAnisotropy());
// v28: soft round light/dark blotches and fine grain, drawn wrapped so the canvas still tiles seamlessly
function txMottle(x, n, r0, r1, a, W2) {
  W2 = W2 || 256;
  for (let i = 0; i < n; i++) {
    const cx = Math.random() * W2,
      cy = Math.random() * W2,
      r = r0 + Math.random() * (r1 - r0),
      col = Math.random() < 0.5 ? "0,0,0" : "255,255,255",
      al = a * (0.4 + Math.random() * 0.6);
    for (const ox of [-W2, 0, W2])
      for (const oy of [-W2, 0, W2]) {
        const px = cx + ox,
          py = cy + oy;
        if (px + r < 0 || px - r > W2 || py + r < 0 || py - r > W2) continue;
        const q = x.createRadialGradient(px, py, 0, px, py, r);
        q.addColorStop(0, "rgba(" + col + "," + al + ")");
        q.addColorStop(1, "rgba(" + col + ",0)");
        x.fillStyle = q;
        x.fillRect(px - r, py - r, r * 2, r * 2);
      }
  }
}
function txGrain(x, n, a, W2) {
  W2 = W2 || 256;
  for (let i = 0; i < n; i++) {
    x.fillStyle = Math.random() < 0.5 ? "rgba(0,0,0," + a + ")" : "rgba(255,255,255," + a + ")";
    x.fillRect((Math.random() * W2) | 0, (Math.random() * W2) | 0, 1 + ((Math.random() * 2) | 0), 1);
  }
}
// v47: a rounded-rectangle path (ctx.roundRect is too new for some browsers)
function txRR(x, px, py, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}
// v47 clean look: soften a tiling canvas into painted patches with a seamless blur (drawn from a 3x3 tiled copy so
// the edges still match). Browsers without canvas filters keep it as drawn.
function txSoft(c, px) {
  const x = c.getContext("2d");
  if (!("filter" in x)) return;
  const W2 = c.width,
    t = document.createElement("canvas");
  t.width = t.height = W2 * 3;
  const tx = t.getContext("2d");
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) tx.drawImage(c, i * W2, j * W2);
  x.save();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  x.filter = "blur(" + px + "px)";
  x.drawImage(t, -W2, -W2);
  x.restore();
}
// v28: ground/path textures are painted at 256 px (the old 128 px drawings scaled up) and filtered anisotropically.
// v47 clean look: the drawing is softened into painted patches (txSoft), gets broad gentle light/shade, and no grain;
// post(x) draws crisp details on top in 256 px space.
const tex = (fn, rep, post) => {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.scale(2, 2);
  fn(x);
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalAlpha = 1;
  txSoft(c, 1.8);
  txMottle(x, 16, 22, 60, 0.07);
  if (post) {
    post(x);
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(rep, rep);
  t.anisotropy = TEXA;
  return t;
};
// v28 surface detail patterns (see onBeforeCompile above): greyscale, mean 0.5, seamless. s = repeats per world unit,
// k = strength. Off on Low graphics quality.
const DTX = (() => {
  if (GFX === "low") return {};
  const mk2 = (fn) => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = "#808080";
    x.fillRect(0, 0, 256, 256);
    fn(x);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.anisotropy = Math.min(4, TEXA);
    return t;
  };
  const wrapLine = (x, pts) => {
    for (const ox of [-256, 0, 256]) {
      x.beginPath();
      pts.forEach(([px, py], i) => (i ? x.lineTo(px + ox, py) : x.moveTo(px + ox, py)));
      x.stroke();
    }
  };
  // stone: mottled with darker chips, light flecks and a few hairline cracks
  const stone = mk2((x) => {
    txMottle(x, 60, 10, 34, 0.22);
    txMottle(x, 120, 2, 7, 0.25);
    txGrain(x, 5000, 0.12);
    x.lineWidth = 1.2;
    for (let i = 0; i < 9; i++) {
      x.strokeStyle = "rgba(0,0,0," + (0.18 + Math.random() * 0.15) + ")";
      let px = Math.random() * 256,
        py = Math.random() * 256;
      const pts = [[px, py]];
      for (let k = 0; k < 5; k++) {
        px += (Math.random() - 0.5) * 30;
        py += 6 + Math.random() * 14;
        pts.push([px, py]);
      }
      wrapLine(x, pts);
    }
  });
  // wood: long wavy grain running along one axis, a couple of knots
  const wood = mk2((x) => {
    for (let i = 0; i < 70; i++) {
      const y0 = Math.random() * 256,
        amp = 1 + Math.random() * 3,
        ph = Math.random() * 6.28,
        dark = Math.random() < 0.6;
      x.strokeStyle = dark ? "rgba(0,0,0," + (0.1 + Math.random() * 0.18) + ")" : "rgba(255,255,255,.14)";
      x.lineWidth = 0.6 + Math.random() * 1.8;
      for (const oy of [-256, 0, 256]) {
        x.beginPath();
        for (let px = 0; px <= 256; px += 8) {
          const py = y0 + oy + Math.sin((px / 256) * 6.283 * 2 + ph) * amp;
          px ? x.lineTo(px, py) : x.moveTo(px, py);
        }
        x.stroke();
      }
    }
    for (let i = 0; i < 3; i++) {
      const cx = 30 + Math.random() * 196,
        cy = 30 + Math.random() * 196;
      for (let r = 9; r > 1; r -= 2.5) {
        x.strokeStyle = "rgba(40,20,0,.25)";
        x.lineWidth = 1.2;
        x.beginPath();
        x.ellipse(cx, cy, r * 1.8, r * 0.7, 0, 0, 7);
        x.stroke();
      }
    }
    txGrain(x, 2500, 0.08);
  });
  // leaf: dense little leaf dabs, light and dark
  const leaf = mk2((x) => {
    txMottle(x, 40, 12, 30, 0.2);
    for (let i = 0; i < 900; i++) {
      const px = Math.random() * 256,
        py = Math.random() * 256;
      x.fillStyle = Math.random() < 0.55 ? "rgba(0,0,0,.16)" : "rgba(255,255,255,.17)";
      x.beginPath();
      x.ellipse(px, py, 2 + Math.random() * 3, 1 + Math.random() * 1.4, Math.random() * 3.14, 0, 7);
      x.fill();
    }
    txGrain(x, 2500, 0.08);
  });
  // rough: painted plaster / hide / cloth: soft mottling and fine grain only
  const rough = mk2((x) => {
    txMottle(x, 70, 8, 30, 0.16);
    txGrain(x, 6000, 0.09);
  });
  // ground: big soft patches that break up the repeat of the tiled ground textures
  const ground = mk2((x) => {
    txMottle(x, 40, 20, 60, 0.3);
    txMottle(x, 60, 6, 16, 0.18);
  });
  // v28b characters (foes, townsfolk, summons; see dtChar): fur/hide strokes and a cloth weave, drawn finer
  const hide = mk2((x) => {
    txMottle(x, 50, 8, 26, 0.24);
    x.lineCap = "round";
    for (let i = 0; i < 1400; i++) {
      const px = Math.random() * 256,
        py = Math.random() * 256,
        l = 3 + Math.random() * 6,
        a = 1.35 + (Math.random() - 0.5) * 0.6;
      x.strokeStyle = Math.random() < 0.55 ? "rgba(0,0,0,.2)" : "rgba(255,255,255,.2)";
      x.lineWidth = 0.8 + Math.random() * 0.8;
      for (const oy of [-256, 0, 256]) {
        x.beginPath();
        x.moveTo(px, py + oy);
        x.lineTo(px + Math.cos(a) * l, py + oy + Math.sin(a) * l);
        x.stroke();
      }
    }
  });
  const cloth = mk2((x) => {
    for (let i = 0; i < 256; i += 3) {
      x.fillStyle = i % 6 ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.12)";
      x.fillRect(i, 0, 1, 256);
      x.fillStyle = i % 6 ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.1)";
      x.fillRect(0, i, 256, 1);
    }
    txMottle(x, 40, 10, 30, 0.16);
    txGrain(x, 3000, 0.1);
  });
  return {
    stone: { map: stone, s: 0.42, k: 0.5 },
    wood: { map: wood, s: 0.5, k: 0.45 },
    leaf: { map: leaf, s: 0.55, k: 0.5 },
    rough: { map: rough, s: 0.45, k: 0.36 },
    ground: { map: ground, s: 0.035, k: 0.42 },
    soft: { map: rough, s: 0.45, k: 0.18 }, // things that already have a painted map
    hide: { map: hide, s: 0.9, k: 0.6 },
    cloth: { map: cloth, s: 1.6, k: 0.42 },
    cstone: { map: stone, s: 0.8, k: 0.62 },
    cwood: { map: wood, s: 0.9, k: 0.5 },
    cleaf: { map: leaf, s: 1, k: 0.55 },
    csoft: { map: hide, s: 1.1, k: 0.32 },
    clothl: { map: cloth, s: 1.6, k: 0.22 }, // townsfolk clothes that already have a painted map
  };
})();
// v28b: give a character model (foe, townsperson, summon) its detail patterns, sampled in its own space (dto) so they
// move with it. Materials are changed in place (models keep references to them for flashes and glows), except shared
// M() cache materials, which are swapped for a private copy. Glowing parts and skin tones stay plain. pers = a person.
function dtChar(root, pers) {
  if (!DTX.hide || !root || root.userData.dtc) return root;
  root.userData.dtc = 1;
  const sh = new Set(Object.values(MC)),
    own = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.userData.ol) return;
    let m = o.material;
    if (!(m.isMeshToonMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshStandardMaterial)) return;
    if (m.transparent || m.blending === T.AdditiveBlending || m.userData.dto) return;
    if (m.emissive && m.emissiveIntensity >= 0.8 && m.emissive.getHex() > 0x101010 && !m.emissiveMap) return;
    let k;
    if (m.map) k = pers ? "clothl" : "csoft";
    else {
      const b = dtKind(m.color.getHex());
      k = !b
        ? null
        : b === "stone"
          ? "cstone"
          : b === "wood"
            ? "cwood"
            : b === "leaf"
              ? "cleaf"
              : pers
                ? "cloth"
                : "hide";
    }
    if (!k) return;
    if (sh.has(m)) {
      if (!own.has(m)) own.set(m, m.clone());
      m = o.material = own.get(m);
    }
    m.userData.dtx = k;
    m.userData.dto = 1;
    m.needsUpdate = true;
  });
  return root;
}
// v28: which detail pattern suits a flat colour (null = keep it plain: near black, near white, skin tones)
const DTC = new T.Color(),
  DTH = {};
function dtKind(c) {
  if (c in DTH) return DTH[c];
  DTC.setHex(c);
  const h = {};
  DTC.getHSL(h);
  let k;
  if (h.l < 0.06 || h.l > 0.93) k = null;
  else if (h.h > 0.02 && h.h < 0.11 && h.l > 0.6 && h.s > 0.3) k = null;
  else if (h.s < 0.15) k = "stone";
  else if (h.h > 0.04 && h.h < 0.12 && h.l < 0.5) k = "wood";
  else if (h.h > 0.2 && h.h < 0.47) k = "leaf";
  else k = "rough";
  return (DTH[c] = k);
}
// v47 clean look: painted lawn (soft light/dark patches) with a few crisp little blade tufts on top
const grass = (rep) =>
  tex(
    (x) => {
      x.fillStyle = "#336650";
      x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 70; i++) {
        const cx = Math.random() * 128,
          cy = Math.random() * 128,
          rx = 6 + Math.random() * 12,
          ry = rx * (0.5 + Math.random() * 0.4);
        x.globalAlpha = 0.45;
        x.fillStyle = ["#40805c", "#2a5844", "#4a8e60", "#3a7454"][i % 4];
        for (const ox of [-128, 0, 128])
          for (const oy of [-128, 0, 128]) {
            x.beginPath();
            x.ellipse(cx + ox, cy + oy, rx, ry, 0, 0, 7);
            x.fill();
          }
      }
    },
    rep,
    (x) => {
      x.lineCap = "round";
      for (let i = 0; i < 46; i++) {
        const px = 8 + Math.random() * 240,
          py = 8 + Math.random() * 240;
        for (let b = -1; b <= 1; b++) {
          x.strokeStyle = "rgba(20,48,36,.3)";
          x.lineWidth = 2;
          x.beginPath();
          x.moveTo(px + b * 2 + 1, py + 1);
          x.quadraticCurveTo(px + b * 3 + 1, py - 4, px + b * 5 + 1, py - 7 + Math.abs(b) * 2);
          x.stroke();
          x.strokeStyle = "rgba(150,210,130,.5)";
          x.lineWidth = 1.4;
          x.beginPath();
          x.moveTo(px + b * 2, py);
          x.quadraticCurveTo(px + b * 3, py - 5, px + b * 5, py - 8 + Math.abs(b) * 2);
          x.stroke();
        }
      }
    },
  );
// v47 clean look: rounded cobbles, each a top-lit gradient with dark grout and a highlight on its upper edge
const cobble = (rep) =>
  tex(
    (x) => {
      x.fillStyle = "#4f4962";
      x.fillRect(0, 0, 128, 128);
    },
    rep,
    (x) => {
      // 8 x 8 smaller stones in a running bond, sizes and warm stone tones varied (drawn wrapped so it tiles)
      x.fillStyle = "#5a5258";
      x.fillRect(0, 0, 256, 256);
      const cols = [
        ["#b2a99e", "#857b72"],
        ["#a39b94", "#776f6a"],
        ["#bab1a2", "#8a7f70"],
        ["#9c9aa4", "#706d7a"],
        ["#aea293", "#7f7365"],
      ];
      for (let r = 0; r < 8; r++)
        for (let q = 0; q < 8; q++) {
          const h1 = Math.sin(r * 12.9898 + q * 78.233) * 43758.5453,
            hv = h1 - Math.floor(h1),
            [hi, lo] = cols[Math.floor(hv * 5)],
            w = 26 + hv * 4,
            h = 25 + ((hv * 7) % 1) * 4,
            px = q * 32 + (r % 2) * 16 + (32 - w) / 2,
            py = r * 32 + (32 - h) / 2;
          for (const ox of [-256, 0, 256])
            for (const oy of [-256, 0, 256]) {
              const X = px + ox,
                Y = py + oy;
              if (X > 256 || Y > 256 || X + w < 0 || Y + h < 0) continue;
              x.fillStyle = "rgba(20,14,24,.28)";
              txRR(x, X + 1, Y + 2, w, h, 9);
              x.fill();
              const g = x.createLinearGradient(0, Y, 0, Y + h);
              g.addColorStop(0, hi);
              g.addColorStop(1, lo);
              x.fillStyle = g;
              txRR(x, X, Y, w, h, 9);
              x.fill();
              x.strokeStyle = "rgba(255,250,240,.28)";
              x.lineWidth = 1.5;
              x.beginPath();
              x.moveTo(X + 7, Y + 2);
              x.lineTo(X + w - 7, Y + 2);
              x.stroke();
            }
        }
    },
  );
const AM = (map, fog) =>
  new T.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: fog !== false });
function art(k) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.translate(64, 64);
  const gl = (r, s) => {
    const q = x.createRadialGradient(0, 0, 0, 0, 0, r);
    s.forEach((v, i) => q.addColorStop(i / (s.length - 1), v));
    x.fillStyle = q;
    x.beginPath();
    x.arc(0, 0, r, 0, 7);
    x.fill();
  };
  if (k === "fire") {
    gl(62, ["#fff4b0", "#ffb23d", "rgba(255,70,20,.75)", "rgba(255,40,0,0)"]);
    for (let i = 0; i < 7; i++) {
      x.rotate(0.9);
      x.fillStyle = "rgba(255,150,50,.85)";
      x.beginPath();
      x.moveTo(-9, 0);
      x.quadraticCurveTo(0, -62, 9, 0);
      x.fill();
    }
    gl(22, ["#fff", "rgba(255,230,150,0)"]);
  } else if (k === "ice") {
    gl(62, ["#e8fbff", "rgba(90,200,255,.6)", "rgba(60,160,255,0)"]);
    x.strokeStyle = "#eafcff";
    x.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      x.rotate(Math.PI / 3);
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(0, -56);
      x.moveTo(0, -30);
      x.lineTo(-12, -44);
      x.moveTo(0, -30);
      x.lineTo(12, -44);
      x.stroke();
    }
  } else if (k === "storm") {
    gl(62, ["rgba(255,245,140,.9)", "rgba(255,220,60,.35)", "rgba(255,200,0,0)"]);
    x.fillStyle = "#fffbe0";
    x.strokeStyle = "#ffd23a";
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(12, -58);
    x.lineTo(-16, -4);
    x.lineTo(2, -4);
    x.lineTo(-12, 58);
    x.lineTo(20, 0);
    x.lineTo(3, 0);
    x.closePath();
    x.fill();
    x.stroke();
  } else if (k === "slash") {
    x.rotate(-0.6);
    x.fillStyle = "rgba(255,240,200,.95)";
    x.beginPath();
    x.arc(0, 0, 52, -1.25, 1.25);
    x.arc(-20, 0, 54, 1.25, -1.25, true);
    x.fill();
    gl(26, ["rgba(255,255,255,.9)", "rgba(255,200,120,0)"]);
  } else if (k === "spirit") {
    // v12 Wispcaller: a violet soul-flame with a curling tail
    gl(62, ["rgba(245,230,255,.95)", "rgba(180,130,255,.55)", "rgba(120,60,230,0)"]);
    x.strokeStyle = "rgba(235,215,255,.9)";
    x.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      x.rotate((Math.PI * 2) / 3);
      x.beginPath();
      x.arc(14, 0, 24, Math.PI, Math.PI * 2.2);
      x.stroke();
    }
    gl(20, ["#fff", "rgba(220,190,255,0)"]);
  } else {
    gl(62, ["rgba(220,255,225,.95)", "rgba(110,255,150,.5)", "rgba(60,255,120,0)"]);
    x.fillStyle = "rgba(200,255,215,.9)";
    for (let i = 0; i < 4; i++) {
      x.rotate(Math.PI / 2);
      x.beginPath();
      x.ellipse(0, -26, 11, 26, 0, 0, 7);
      x.fill();
    }
  }
  return c;
}
const SP = {},
  ART = {};
["fire", "ice", "storm", "heal", "slash", "spirit"].forEach((k) => {
  const c = art(k);
  ART[k] = c.toDataURL();
  SP[k] = new T.CanvasTexture(c);
});
const glc = document.createElement("canvas");
glc.width = glc.height = 64;
{
  const x = glc.getContext("2d"),
    q = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  q.addColorStop(0, "rgba(255,240,180,1)");
  q.addColorStop(0.4, "rgba(255,210,120,.35)");
  q.addColorStop(1, "rgba(255,200,100,0)");
  x.fillStyle = q;
  x.fillRect(0, 0, 64, 64);
}
const GLT = new T.CanvasTexture(glc);
// particles (FXP = where effects live: the scene while exploring, the battle frame while fighting)
const parts = [];
let shk = 0,
  FXP = S;
function puff(p, k, n, sp, life, sz) {
  for (let i = 0; i < n; i++) {
    const m = new T.Sprite(AM(SP[k]));
    m.position.copy(p);
    const a = Math.random() * 6.28;
    m.userData = {
      v: new T.Vector3(
        Math.cos(a) * sp * Math.random(),
        sp * (0.2 + Math.random() * 0.8),
        Math.sin(a) * sp * Math.random(),
      ),
      l: life * (0.6 + Math.random() * 0.6),
      t: 0,
      sz: sz * (0.5 + Math.random()),
    };
    m.scale.setScalar(m.userData.sz);
    FXP.add(m);
    parts.push(m);
  }
}
// v9 motes: one particle with its own texture, tint, gravity (g), drag (dr), growth over life (gr), fade-in (fi), spin (sp) and
// additive or normal blending; used by the new spell effects. Lifetimes follow battle speed.
const WGT = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d"),
    q = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  q.addColorStop(0, "rgba(255,255,255,1)");
  q.addColorStop(0.25, "rgba(255,255,255,.7)");
  q.addColorStop(0.6, "rgba(255,255,255,.18)");
  q.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = q;
  x.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
})();
function mote(p, o) {
  o = o || {};
  const m = new T.Sprite(
    new T.SpriteMaterial({
      map: o.t || WGT,
      color: o.c == null ? 0xffffff : o.c,
      transparent: true,
      depthWrite: false,
      blending: o.nb ? T.NormalBlending : T.AdditiveBlending,
    }),
  );
  m.position.copy(p);
  const v = o.v ? (o.v.isVector3 ? o.v.clone() : new T.Vector3(o.v[0], o.v[1], o.v[2])) : new T.Vector3();
  m.material.rotation = o.r != null ? o.r : Math.random() * 6.28;
  m.userData = {
    v,
    l: (o.l || 0.8) / SPD,
    t: 0,
    sz: o.s || 0.6,
    g: o.g != null ? o.g : 0,
    dr: o.dr || 0,
    gr: o.gr != null ? o.gr : -0.4,
    fi: o.fi || 0,
    sp: o.sp || 0,
    o: o.o == null ? 1 : o.o,
  };
  m.scale.setScalar(m.userData.sz);
  FXP.add(m);
  parts.push(m);
  return m;
}
function upd(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const m = parts[i],
      u = m.userData;
    u.t += dt;
    if (u.dr) u.v.multiplyScalar(Math.max(0, 1 - u.dr * dt));
    m.position.addScaledVector(u.v, dt);
    u.v.y -= (u.g != null ? u.g : 2) * dt;
    const k = u.t / u.l;
    m.material.opacity = (u.o || 1) * Math.max(0, u.fi && k < u.fi ? k / u.fi : 1 - k);
    m.scale.setScalar(Math.max(0.01, u.sz * (u.gr != null ? 1 + u.gr * k : 1 - k * 0.4)));
    if (u.sp) m.material.rotation += u.sp * dt;
    if (k >= 1) {
      if (m.parent) m.parent.remove(m);
      m.material.dispose();
      parts.splice(i, 1);
    }
  }
  shk = Math.max(0, shk - dt * 2.5);
}
// remembers each material's own glow so hit flashes no longer wipe out eyes, gems and hat stars
const flash = (grp, col) =>
  grp.traverse((o) => {
    const m = o.material;
    if (m && m.emissive) {
      if (m.userData.e0 == null) m.userData.e0 = m.emissive.getHex();
      m.emissive.setHex(col || m.userData.e0);
    }
  });
async function hit(grp, col) {
  flash(grp, col);
  const x = grp.position.x;
  await tw(300, (k) => {
    grp.position.x = x + Math.sin(k * 30) * 0.15 * (1 - k);
  });
  grp.position.x = x;
  flash(grp, 0);
}
// v28: once every script has built the world, give the surfaces M() didn't make (ground sheets, roads, hand-made
// materials) their detail pattern: big tiled ground gets soft "ground" patches that hide the repeat, other painted
// surfaces a light grain, flat colours the pattern their colour suggests. The player's wizard keeps its own look.
window.addEventListener("load", () => {
  if (!DTX.rough) return;
  const lit = (m) =>
    m && (m.isMeshToonMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshStandardMaterial);
  try {
    const shared = new Set(Object.values(MC)),
      own = new Map();
    if (typeof W !== "undefined")
      W.traverse((o) => {
        if (!o.isMesh || Array.isArray(o.material) || !o.material.userData.dtx) return;
        const m = o.material;
        if (shared.has(m)) {
          if (!own.has(m)) {
            const c = m.clone();
            delete c.userData.dtx;
            own.set(m, c);
          }
          o.material = own.get(m);
        } else {
          delete m.userData.dtx;
          m.needsUpdate = true;
        }
      });
    const S2 = new T.Sphere();
    S.traverse((o) => {
      if (!o.isMesh || Array.isArray(o.material)) return;
      const m = o.material;
      if (!lit(m) || m.transparent || m.blending === T.AdditiveBlending || "dtx" in m.userData) return;
      for (let p = o; p; p = p.parent) if (typeof W !== "undefined" && p === W) return;
      let k;
      if (m.map) {
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        S2.copy(o.geometry.boundingSphere);
        k = S2.radius * o.matrixWorld.getMaxScaleOnAxis() > 12 ? "ground" : "soft";
      } else k = dtKind(m.color.getHex());
      m.userData.dtx = k || 0; // 0 = looked at, stays plain
      if (k) m.needsUpdate = true;
    });
  } catch (e) {}
});
