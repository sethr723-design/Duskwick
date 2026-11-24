// DUSKWICK - 71-clean.js (v47): "Clean look" — a brighter, smoother storybook style. Loads LAST. Only top-level name:
// CLEAN. Setting duskwick_clean ("0" = off, default on), row in Book > Options > Display. Everything applies live:
//  1) Surface detail: the 01 DTX triplanar grain and 42's ground macro-noise are scaled by a shared uniform (clnD), so
//     walls, wood, ground and characters read as clean painted colour instead of gritty noise.
//  2) Colour: non-additive materials get a gentle saturation boost before tone mapping / fog (clnS); fog is untouched.
//  3) Shading: the shared toon ramp GR (01) is lifted, so shadow sides stay bright and soft.
//  4) Light: thP wrap (outermost, after 59) brightens the key/sky light, lifts the ground bounce toward the sky colour
//     (no muddy shadows) and clears the air a little (fog pushed back).
//  5) Clutter: every other instance in 42's verge-clutter chunks is squashed (originals kept, restored when off).
// No scene objects, no save fields, no NET.
const CLEAN = (() => {
  let on = true;
  try {
    on = localStorage.getItem("duskwick_clean") !== "0";
  } catch (e) {}
  const CLD = { value: 1 }, // detail strength (1 = old look)
    CLS = { value: 1 }, // saturation (1 = old look)
    CLT = { value: 1 }, // highlight roll-off start (1 = off)
    RAMP0 = Uint8Array.from(GR.image.data),
    RAMP1 = Uint8Array.from([112, 140, 172, 205, 234, 255]);
  // ---------- shader hook (wraps 42's, which wraps 01's) ----------
  const ob0 = T.Material.prototype.onBeforeCompile;
  T.Material.prototype.onBeforeCompile = function (sh, r) {
    ob0.call(this, sh, r);
    let f = sh.fragmentShader,
      hit = 0;
    const dl = "diffuseColor.rgb *= 1.0 + (dd - 0.5) * dtK;";
    if (f.indexOf(dl) >= 0) {
      f = f.replace(dl, "diffuseColor.rgb *= 1.0 + (dd - 0.5) * dtK * clnD;");
      hit = 1;
    }
    const ml = "diffuseColor.rgb *= 0.84 + 0.32 * m1;";
    if (f.indexOf(ml) >= 0) {
      f = f.replace(ml, "diffuseColor.rgb *= mix(1.0, 0.84 + 0.32 * m1, clnD);");
      hit = 1;
    }
    if (hit) {
      f = "uniform float clnD;\n" + f;
      sh.uniforms.clnD = CLD;
    }
    if (this.blending !== T.AdditiveBlending && f.indexOf("#include <tonemapping_fragment>") >= 0) {
      // lit surfaces also get a hue-keeping soft shoulder: anything brighter than clnT rolls off smoothly toward 1
      // instead of clipping (faces next to a lantern used to burn out to flat white)
      const lit = f.indexOf("#include <lights_fragment_begin>") >= 0;
      f =
        "uniform float clnS;\nuniform float clnT;\n" +
        f.replace(
          "#include <tonemapping_fragment>",
          [
            "{",
            "  vec3 cc = max(mix(vec3(dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114))), gl_FragColor.rgb, clnS), 0.0);",
            lit
              ? "  float cm = max(max(cc.r, cc.g), cc.b);\n  if (clnT < 0.999 && cm > clnT) cc *= (clnT + (1.0 - clnT) * (1.0 - exp(-(cm - clnT) / (1.0 - clnT)))) / cm;"
              : "",
            "  gl_FragColor.rgb = cc;",
            "}",
            "#include <tonemapping_fragment>",
          ].join("\n"),
        );
      sh.uniforms.clnS = CLS;
      sh.uniforms.clnT = CLT;
    }
    // world-space triplanar map (userData.tri = world units per texture tile): the painted pattern keeps its size on
    // long beams, tall pillars and round basins instead of stretching each face's 0..1 UVs across it
    const tri = this.userData && this.userData.tri;
    if (
      tri &&
      f.indexOf("#include <map_fragment>") >= 0 &&
      sh.vertexShader.indexOf("#include <project_vertex>") >= 0 &&
      sh.vertexShader.indexOf("#include <beginnormal_vertex>") >= 0
    ) {
      sh.vertexShader =
        "varying vec3 vClnP;\nvarying vec3 vClnN;\n" +
        sh.vertexShader.replace(
          "#include <project_vertex>",
          [
            "#include <project_vertex>",
            "#ifdef USE_INSTANCING",
            "vClnP = (instanceMatrix * vec4(transformed, 1.0)).xyz;",
            "vClnN = mat3(instanceMatrix) * objectNormal;",
            "#else",
            "vClnP = transformed;",
            "vClnN = objectNormal;",
            "#endif",
            "vClnP = (modelMatrix * vec4(vClnP, 1.0)).xyz; vClnN = mat3(modelMatrix) * vClnN;",
          ].join("\n"),
        );
      f =
        "uniform float clnTri;\nvarying vec3 vClnP;\nvarying vec3 vClnN;\n" +
        f.replace(
          "#include <map_fragment>",
          [
            "#ifdef USE_MAP",
            "{",
            "  vec3 tw = pow(abs(normalize(vClnN)) + 0.0001, vec3(6.0));",
            "  tw /= tw.x + tw.y + tw.z;",
            "  vec3 tp = vClnP / clnTri;",
            "  vec4 texelColor = texture2D(map, tp.zy) * tw.x + texture2D(map, tp.xz) * tw.y + texture2D(map, tp.xy) * tw.z;",
            "  texelColor = mapTexelToLinear(texelColor);",
            "  diffuseColor *= texelColor;",
            "}",
            "#endif",
          ].join("\n"),
        );
      sh.uniforms.clnTri = { value: tri };
    }
    sh.fragmentShader = f;
  };
  const ck0 = T.Material.prototype.customProgramCacheKey;
  T.Material.prototype.customProgramCacheKey = function () {
    const u = this.userData || {};
    return ck0.call(this) + (u.tri ? "|tri" + u.tri : "");
  };
  // which materials get it: anything painted with 01's cut-stone pattern (fountain, arches, pillars, plinths, steps,
  // chimneys, door surrounds). Re-run at the 9 s ticks for pieces built late (04 gates, 61 villages, editor kit).
  // world units per tile for each 01 ptex pattern that gets it (wood: crates, benches, fences, barrels, timber)
  const TRIK = { stone: 2.6, wood: 3 };
  const TRIM = new Map();
  function triTag() {
    if (typeof PCX === "undefined") return;
    const pats = Object.keys(TRIK)
      .filter((k) => PCX[k])
      .map((k) => [PCX[k], TRIK[k]]);
    if (!pats.length) return;
    const one = (m) => {
      if (!m || TRIM.has(m) || !m.map) return;
      const hit = pats.find(([t]) => m.map === t || m.map.image === t.image);
      if (!hit) return;
      // characters (dtChar sets dto: e.g. a guard's helmet) move, so a world-space pattern would swim on them
      if (m.userData.dto) return;
      TRIM.set(m, hit[1]);
      m.userData.tri = on ? hit[1] : 0;
      m.needsUpdate = true;
    };
    S.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (Array.isArray(o.material)) o.material.forEach(one);
      else one(o.material);
    });
  }
  function triSet() {
    TRIM.forEach((sz, m) => {
      const v = on ? sz : 0;
      if ((m.userData.tri || 0) !== v) {
        m.userData.tri = v;
        m.needsUpdate = true;
      }
    });
  }
  // ---------- light / fog (thP wrap) ----------
  const c0 = new T.Color(),
    c1 = new T.Color(),
    lerpHex = (a, b, k) => c0.setHex(a).lerp(c1.setHex(b), k).getHex();
  const th0 = thP;
  thP = function (z) {
    const A = th0.apply(this, arguments);
    if (!on) return A;
    try {
      // the old setup added up to ~2x light on lit sides (pastel, clipped colour): total light above 1.1 is eased
      // down (still rising with 59's dawn), some ambient goes to the key light for shape, and the warm tint is
      // softened so dyes and robes keep their own colour
      const L = A.L,
        T0 = L[0] + L[1] + L[2],
        s = T0 > 1.1 ? (1.1 + (T0 - 1.1) * 0.35) / T0 : 1,
        am = L[2] * 0.5;
      A.L = [L[0] * s, (L[1] + am * 0.6) * s, (L[2] - am) * s];
      A.hl = lerpHex(A.hl, 0xffffff, 0.35);
      A.sun = lerpHex(A.sun, 0xfff0dc, 0.35);
      A.gc = lerpHex(A.gc, A.hl, 0.1);
      A.fog = lerpHex(A.fog, A.hl, 0.07);
      A.near *= 1.1;
      A.far *= 1.12;
    } catch (e) {}
    return A;
  };
  // ---------- clutter thinning ----------
  function thin(gp, want) {
    gp.traverse((im) => {
      if (!im.isInstancedMesh) return;
      const a = im.instanceMatrix.array;
      if (want) {
        if (im.userData.cl0) return;
        im.userData.cl0 = Float32Array.from(a);
        for (let q = 1; q < im.count; q += 2) for (let j = 0; j < 12; j++) a[q * 16 + j] = 0;
      } else {
        if (!im.userData.cl0) return;
        a.set(im.userData.cl0);
        im.userData.cl0 = null;
      }
      im.instanceMatrix.needsUpdate = true;
    });
    gp.userData.cln = want ? 1 : 0;
  }
  function thinAll() {
    if (typeof LUSTER === "undefined" || !LUSTER.chunks) return;
    for (const gp of LUSTER.chunks.values()) if (gp && !!gp.userData.cln !== on) thin(gp, on);
  }
  // ---------- orphan lava glows ----------
  // 03's lava pools are a flat 0xff6a1a disc + a big fire sprite at y 1. Later tidy-ups (61's village centres, 64a's
  // old-trail clearing) hide the disc but leave the sprite: a floating orange blob cut off hard by the ground. Hidden
  // here (userData.clg) once the world has settled; shown again when the look is turned off.
  const ORPH = [];
  function orphans() {
    if (typeof SP === "undefined" || !SP.fire) return;
    const pools = [],
      v = new T.Vector3();
    S.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.material || !o.material.color) return;
      const gp = o.geometry && o.geometry.parameters;
      if (o.material.color.getHex() === 0xff6a1a && gp && gp.height === 0.12) {
        o.getWorldPosition(v);
        pools.push([v.x, v.z]);
      }
    });
    S.traverse((o) => {
      if (!o.isSprite || !o.visible || !o.material || o.material.map !== SP.fire || o.userData.clg) return;
      o.getWorldPosition(v);
      if (v.y > 1.6 || o.scale.x < 6) return;
      if (pools.some((p) => Math.hypot(p[0] - v.x, p[1] - v.z) < 1.5)) return;
      o.visible = false;
      o.userData.clg = 1;
      ORPH.push(o);
    });
  }
  function orphansOff() {
    ORPH.forEach((o) => {
      o.visible = true;
      o.userData.clg = 0;
    });
    ORPH.length = 0;
  }
  let orT = 0,
    triN = 0;
  setInterval(() => {
    // twice: once the world has settled after load, and again after 61/64a/69's late passes
    if (on && document.readyState === "complete" && typeof mode !== "undefined" && mode === "explore" && orT < 2) {
      orT++;
      try {
        orphans();
      } catch (e) {}
    }
    if (triN < 4 && document.readyState === "complete") {
      triN++;
      try {
        triTag();
      } catch (e) {}
    }
  }, 9000);
  setInterval(() => {
    thinAll();
    // 08's cast flashes put the lantern back to 1.3 when they end
    if (on && typeof lamp !== "undefined" && lamp.intensity === 1.3) lamp.intensity = 0.75;
  }, 500);
  // ---------- outfit colours ----------
  // dyes add a 0.3 self-glow in their own colour, which flattened dyed robes into one unshaded blob: eased to 0.1.
  // A cape (mantle + back cape) the same colour as the robe is drawn a shade deeper, so the outfit reads in layers.
  function dress(o) {
    if (!on || !o) return;
    let rc = null;
    o.traverse((m) => {
      if (m.isMesh && rc == null && (m.userData.role === "robe" || m.userData.c0 === 0x35408f))
        rc = m.material.color.getHex();
    });
    o.traverse((m) => {
      const u = m.userData;
      if (!m.isMesh || !m.material || !(u.role || u.foot || u.c0 === 0x35408f || u.c0 === 0x7a2a5a)) return;
      const mt = m.material;
      if (mt.emissive && mt.emissiveIntensity === 0.3) mt.emissiveIntensity = 0.1;
      const cape = u.role === "cape" || u.c0 === 0x7a2a5a;
      if (cape && rc != null && mt.color.getHex() === rc) mt.color.multiplyScalar(0.72);
    });
  }
  function dyeGlow() {
    try {
      if (typeof applyCos === "function" && typeof P !== "undefined" && P && P.gear) applyCos();
    } catch (e) {}
  }
  if (typeof applyCos === "function") {
    const ac0 = applyCos;
    applyCos = function () {
      const r = ac0.apply(this, arguments);
      try {
        dress(W);
      } catch (e) {}
      return r;
    };
  }
  if (typeof wizPaint === "function") {
    const wp0 = wizPaint;
    wizPaint = function (o) {
      const r = wp0.apply(this, arguments);
      try {
        dress(o);
      } catch (e) {}
      return r;
    };
  }
  // ---------- apply ----------
  function apply() {
    CLD.value = on ? 0.32 : 1;
    CLS.value = on ? 1.06 : 1;
    CLT.value = on ? 0.68 : 1;
    GR.image.data.set(on ? RAMP1 : RAMP0);
    GR.needsUpdate = true;
    // your staff's lantern sits beside your face: at full strength it burned the wizard out
    if (typeof lamp !== "undefined") lamp.intensity = on ? 0.75 : 1.3;
    thinAll();
    dyeGlow();
    try {
      if (on) orphans();
      else orphansOff();
      triTag();
      triSet();
    } catch (e) {}
    try {
      if (typeof DUSKLIFT !== "undefined" && DUSKLIFT.reapply) DUSKLIFT.reapply();
      else if (typeof mode !== "undefined" && mode === "explore" && lastTh && lastTh !== "mix") theme(lastTh);
    } catch (e) {}
  }
  apply();
  // ---------- Book > Options > Display row ----------
  if (typeof panel === "function") {
    const pn0 = panel;
    panel = function (k) {
      const r = pn0.apply(this, arguments);
      try {
        if (k !== "book" || typeof BOOKL === "undefined" || BOOKL.last !== "optdisp") return r;
        const pl = $("pl");
        if (!pl || pl.querySelector("#clrow")) return r;
        const row = document.createElement("div");
        row.className = "row";
        row.id = "clrow";
        row.innerHTML =
          "<div><b>Clean look</b><small>Smooth painted surfaces, brighter soft shading, richer colour and less roadside clutter</small></div>";
        const b = document.createElement("button");
        b.className = "pb";
        const lab = () => (b.textContent = on ? "On" : "Off");
        lab();
        b.onclick = () => {
          on = !on;
          try {
            localStorage.setItem("duskwick_clean", on ? "1" : "0");
          } catch (e) {}
          lab();
          apply();
        };
        row.appendChild(b);
        pl.appendChild(row);
      } catch (e) {}
      return r;
    };
  }
  return {
    apply,
    get on() {
      return on;
    },
    set(v) {
      on = !!v;
      apply();
    },
  };
})();
