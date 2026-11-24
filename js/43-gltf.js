// DUSKWICK - 43-gltf.js (v31): real 3D models (glTF / .glb) in place of the hand-built ones. Loads after 42-luster.
// Only top-level name: GLTF.
// How models get in: put .glb files (plus optional same-name .json settings) in the models folder and run
// pack-models.bat. That writes models/models.js (loaded by index.html right after this file), which calls
// GLTF.add(key, settings, base64) once per model. Nothing else changes until a model is packed: the three.js glTF
// libraries (GLTFLoader.js, SkeletonUtils.js) are only fetched once there is a model, from the game folder if they are
// saved there, otherwise from jsDelivr (three r128, same as the game).
// Which game models a packed model replaces is its settings' "use" list (or GLTF.use(gameKey, modelKey)):
//   "foe:gloom"      every gloom foe (Gloomling, Dusk Imp, Moss Brute, Cinder Fiend, Gloom Warden)
//   "foe:gloom:3"    one tier only (1..5; a tier key wins over the plain one)
//   "foe:wolf", "foe:<kind>[:tier]"   any other foe kind mkFoe builds (beasts, 27-newfoes, road/dungeon bosses)
//   "sum:<ally>"     a summon model (sumMesh key)
// Settings: s (size, 1 = as tall as the hand-built model), ry (turn, radians; the game faces +z), y (lift),
// toon (false = keep the file's own PBR materials instead of the game's toon shading), anim { idle, walk, atk, hit,
// die } (clip names; missing ones are guessed from the clip names). GLTF.list() prints every model and its clips.
// The hand-built model stays inside the foe, hidden, so every rig/animation/battle reference keeps working; the new
// model is a child group (userData.lus = 1, userData.gtw = 1) with its own AnimationMixer. Idle/walk follow movement;
// attack, hit and death play on foeAct / hit / die (and on 'fatk' for guests).
const GLTF = (() => {
  const RAW = [],
    MODELS = {},
    USE = {},
    INST = [],
    ALL = [];
  let libs = 0; // 0 not needed yet, 1 loading, 2 ready, -1 failed
  let pend = 0; // v46: models added but not parsed yet (70-loadgate waits for 0)
  const CDN = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/";
  function script(local, cdn, ok) {
    const s = document.createElement("script");
    s.src = local;
    s.onload = ok;
    s.onerror = () => {
      s.remove();
      const c = document.createElement("script");
      c.src = cdn;
      c.onload = ok;
      c.onerror = () => {
        libs = -1;
        console.warn("GLTF: could not load " + cdn + " (offline? save it next to index.html)");
      };
      document.head.appendChild(c);
    };
    document.head.appendChild(s);
  }
  function needLibs() {
    if (libs) return;
    if (THREE.GLTFLoader && THREE.SkeletonUtils) {
      libs = 2;
      return;
    }
    libs = 1;
    let n = 0;
    const ok = () => {
      if (++n < 2) return;
      libs = 2;
      RAW.splice(0).forEach(parse);
    };
    if (THREE.GLTFLoader) ok();
    else script("GLTFLoader.js", CDN + "loaders/GLTFLoader.js", ok);
    if (THREE.SkeletonUtils) ok();
    else script("SkeletonUtils.js", CDN + "utils/SkeletonUtils.js", ok);
  }
  function add(key, cfg, b64) {
    cfg = cfg || {};
    (cfg.use || []).forEach((u) => (USE[u] = key));
    const e = { key, cfg, b64 };
    pend++;
    needLibs();
    if (libs === 2) parse(e);
    else RAW.push(e);
  }
  function parse(e) {
    try {
      const bin = atob(e.b64),
        buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      e.b64 = null;
      new THREE.GLTFLoader().parse(
        buf.buffer,
        "",
        (gl) => {
          pend--;
          ready(e.key, e.cfg, gl);
        },
        (err) => {
          pend--;
          console.warn("GLTF: could not read model " + e.key, err);
        },
      );
    } catch (err) {
      pend--;
      console.warn("GLTF: could not read model " + e.key, err);
    }
  }
  // the game renders in linear colour with toon shading: textures are read as-is, colours from the file brought to
  // the same space, and (unless toon: false) every material becomes a toon material on the game's ramp
  function prep(scene, cfg) {
    let sk = false;
    scene.traverse((m) => {
      if (!m.isMesh) return;
      if (m.isSkinnedMesh) {
        sk = true;
        m.frustumCulled = false; // its bounds don't follow the animation
      }
      const conv = (a) => {
        if (a.map) a.map.encoding = T.LinearEncoding;
        if (a.emissiveMap) a.emissiveMap.encoding = T.LinearEncoding;
        const col = a.color ? a.color.clone().convertLinearToSRGB() : new T.Color(0xffffff);
        if (cfg.toon === false) {
          if (a.color) a.color.copy(col);
          a.skinning = !!m.isSkinnedMesh;
          a.userData.dtx = 0;
          return a;
        }
        const n = new T.MeshToonMaterial({
          color: col,
          map: a.map || null,
          gradientMap: GR,
          transparent: !!a.transparent,
          opacity: a.opacity == null ? 1 : a.opacity,
          alphaTest: a.alphaTest || 0,
          side: a.side,
          skinning: !!m.isSkinnedMesh,
          morphTargets: !!m.morphTargetInfluences,
        });
        if (a.emissive) {
          n.emissive.copy(a.emissive).convertLinearToSRGB();
          n.emissiveMap = a.emissiveMap || null;
          n.emissiveIntensity = a.emissiveIntensity == null ? 1 : a.emissiveIntensity;
        }
        n.userData.dtx = 0;
        return n;
      };
      m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
    });
    return sk;
  }
  const BX = new T.Box3(),
    BM = new T.Box3(),
    MM = new T.Matrix4(),
    MI = new T.Matrix4();
  // bounds of the meshes under root, in root's own space (luster extras, outline twins and the glTF group left out)
  function bounds(root) {
    root.updateMatrixWorld(true);
    MI.copy(root.matrixWorld).invert();
    BX.makeEmpty();
    root.traverse((m) => {
      if (!m.isMesh || m.userData.ol) return;
      for (let p = m; p && p !== root; p = p.parent) if (p.userData.lus) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      BM.copy(m.geometry.boundingBox).applyMatrix4(MM.multiplyMatrices(MI, m.matrixWorld));
      BX.union(BM);
    });
    return BX;
  }
  function ready(key, cfg, gl) {
    const scene = gl.scene || (gl.scenes && gl.scenes[0]);
    if (!scene) return console.warn("GLTF: " + key + " has no scene");
    const sk = prep(scene, cfg);
    const b = new T.Box3().setFromObject(scene);
    MODELS[key] = {
      key,
      cfg,
      scene,
      clips: gl.animations || [],
      sk,
      h: Math.max(0.01, b.max.y - b.min.y),
      minY: b.min.y,
      cm: {},
    };
    console.info(
      "GLTF: model '" +
        key +
        "' ready (" +
        (gl.animations || []).length +
        " animations)" +
        (cfg.use ? ", replaces " + cfg.use.join(", ") : ', not used yet: add "use" to its .json'),
    );
    refresh();
  }
  function cloneOf(M) {
    const c = M.sk && THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(M.scene) : M.scene.clone(true);
    // own materials per copy: hit flashes and death tints must not touch every other copy
    c.traverse((m) => {
      if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
    });
    return c;
  }
  // ---- animation ----
  const GUESS = {
    idle: /idle|breath|stand|wait/i,
    walk: /walk|run|move|fly|swim|crawl/i,
    atk: /attack|bite|punch|slash|swipe|claw|strike|cast|lunge/i,
    hit: /hit|hurt|damage|react|flinch/i,
    die: /death|die|dead|defeat/i,
  };
  function clipFor(M, n) {
    if (n in M.cm) return M.cm[n];
    const want = M.cfg.anim && M.cfg.anim[n];
    let c = want ? M.clips.find((x) => x.name === want) : null;
    if (!c) c = M.clips.find((x) => GUESS[n].test(x.name) && !(n === "hit" && GUESS.atk.test(x.name)));
    if (!c && n === "idle") c = M.clips[0] || null;
    return (M.cm[n] = c || null);
  }
  function setBase(I, n) {
    if (!I.mx || I.dead) return;
    const cl = clipFor(I.M, n) || clipFor(I.M, "idle");
    if (!cl) return;
    const a = I.mx.clipAction(cl);
    if (a === I.base) return;
    a.enabled = true;
    a.setLoop(T.LoopRepeat, Infinity);
    const prev = I.base;
    I.base = a;
    if (I.oneA) return; // picked up when the one-shot ends
    a.reset().play();
    if (prev) a.crossFadeFrom(prev, 0.25, false);
  }
  function once(I, n) {
    if (!I || !I.mx || I.dead) return;
    const cl = clipFor(I.M, n);
    if (!cl) return;
    const a = I.mx.clipAction(cl);
    a.reset();
    a.enabled = true;
    a.setLoop(T.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.play();
    const from = I.oneA || I.base;
    if (from && from !== a) a.crossFadeFrom(from, 0.12, false);
    I.oneA = a;
    if (n === "die") I.dead = 1;
  }
  // ---- swapping a game model ----
  function apply(o, M) {
    const u = o.userData;
    if (u.gtf === M.key) return;
    if (u.gti) drop(o);
    const b = bounds(o),
      h = b.isEmpty() ? 2 : b.max.y - b.min.y,
      k = (h * (M.cfg.s || 1)) / M.h;
    const w = new T.Group(),
      c = cloneOf(M);
    w.userData.lus = 1;
    w.userData.gtw = 1;
    c.position.y = -M.minY;
    w.add(c);
    w.scale.setScalar(k);
    w.rotation.y = M.cfg.ry || 0;
    w.position.y = M.cfg.y || 0;
    const hid = [];
    o.children.forEach((ch) => {
      if (ch.userData.lus || ch.isLight || !ch.visible) return;
      ch.visible = false;
      hid.push(ch);
    });
    o.add(w);
    if (typeof LUSTER !== "undefined")
      LUSTER.rimTag(w, u.coreM ? u.coreM.color.getHex() : 0xb6a8ff, u.coreM ? 0.7 : 0.3, u.coreM ? 2.1 : 2.4);
    const I = { o, w, M, k, mx: null, base: null, oneA: null, dead: 0, hid, gone: 0, sp: 0, ph: Math.random() * 6 };
    if (M.clips.length) {
      I.mx = new T.AnimationMixer(c);
      I.mx.addEventListener("finished", (e) => {
        if (e.action !== I.oneA || I.dead) return;
        I.oneA = null;
        const bs = I.base;
        if (bs && bs !== e.action) {
          bs.enabled = true;
          bs.reset().play();
          bs.crossFadeFrom(e.action, 0.25, false);
        }
      });
      setBase(I, "idle");
    }
    u.gtf = M.key;
    u.gti = I;
    INST.push(I);
  }
  function drop(o) {
    const I = o.userData.gti;
    if (!I) return;
    o.remove(I.w);
    I.hid.forEach((ch) => (ch.visible = true));
    if (I.mx) I.mx.stopAllAction();
    const i = INST.indexOf(I);
    if (i >= 0) INST.splice(i, 1);
    o.userData.gti = o.userData.gtf = null;
  }
  function fit(o) {
    const u = o && o.userData;
    if (!u || !u.gk) return;
    const key = USE[u.gkt] || USE[u.gk],
      M = key && MODELS[key];
    if (M) apply(o, M);
  }
  // a model just became ready: every game model built so far gets it
  function refresh() {
    try {
      (typeof foes !== "undefined" ? foes : []).forEach((f) => {
        const o = f && (f.o || f.m);
        if (!o || !f.kind) return;
        if (!o.userData.gk) {
          o.userData.gk = "foe:" + f.kind;
          o.userData.gkt = "foe:" + f.kind + ":" + f.t;
        }
        fit(o);
      });
    } catch (e) {}
    for (let i = ALL.length - 1; i >= 0; i--) {
      const o = ALL[i];
      if (!o.parent && o.userData.gtGone > 3) ALL.splice(i, 1);
      else fit(o);
    }
  }
  // ---- wraps ----
  {
    const mk0 = mkFoe;
    mkFoe = function (kind, t) {
      const o = mk0.apply(this, arguments);
      try {
        o.userData.gk = "foe:" + kind;
        o.userData.gkt = "foe:" + kind + ":" + t;
        ALL.push(o);
        fit(o);
      } catch (e) {}
      return o;
    };
    const sm0 = sumMesh;
    sumMesh = function (t) {
      const o = sm0.apply(this, arguments);
      try {
        o.userData.gk = o.userData.gkt = "sum:" + t;
        ALL.push(o);
        fit(o);
      } catch (e) {}
      return o;
    };
    const gti = (o) => o && o.userData && o.userData.gti;
    const fa0 = foeAct;
    foeAct = function (f) {
      once(gti(f && f.m), "atk");
      return fa0.apply(this, arguments);
    };
    const h0 = hit;
    hit = function (grp) {
      once(gti(grp), "hit");
      return h0.apply(this, arguments);
    };
    const d0 = die;
    die = function (f) {
      once(gti(f && (f.m || f.o)), "die");
      return d0.apply(this, arguments);
    };
    NET.on("fatk", (d) => {
      if (!d || mode !== "guest" || !GUEST || d.b !== GUEST.b) return;
      once(gti(GUEST.fm[d.fi]), "atk");
    });
  }
  // ---- per frame ----
  let t0 = performance.now(),
    fr = 0;
  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now(),
      dt = Math.min(0.1, (now - t0) / 1000);
    t0 = now;
    fr++;
    if (!INST.length) return;
    const cx = typeof C !== "undefined" ? C.position.x : 0,
      cz = typeof C !== "undefined" ? C.position.z : 0;
    for (let i = INST.length - 1; i >= 0; i--) {
      const I = INST[i],
        o = I.o;
      if (!o.parent) {
        // battle copies and guest/ghost models leave for good; street foes come back (kept while listed in foes)
        if (++I.gone > 900 && !(typeof foes !== "undefined" && foes.some((f) => f && f.o === o))) {
          o.userData.gtGone = 9;
          INST.splice(i, 1);
        }
        continue;
      }
      I.gone = 0;
      const e = o.matrixWorld.elements,
        x = e[12],
        z = e[14];
      if (I.lx != null) {
        const s = Math.hypot(x - I.lx, z - I.lz) / Math.max(dt, 0.001);
        I.sp += (Math.min(s, 12) - I.sp) * Math.min(1, dt * 6);
      }
      I.lx = x;
      I.lz = z;
      if (Math.hypot(x - cx, z - cz) > 70 || !I.w.visible) continue; // too far to see: skip the work
      if (I.mx) {
        setBase(I, I.sp > 0.9 ? "walk" : "idle");
        I.mx.update(dt);
      } else {
        // no animations in the file: a slow breath so it doesn't stand like a statue
        const br = 1 + 0.025 * Math.sin(now / 420 + I.ph);
        I.w.scale.set(I.k * (2 - br), I.k * br, I.k * (2 - br));
      }
    }
  }
  requestAnimationFrame(tick);
  return {
    add,
    use(gameKey, modelKey) {
      USE[gameKey] = modelKey;
      refresh();
    },
    list() {
      const L = Object.values(MODELS).map((M) => ({
        model: M.key,
        replaces:
          Object.keys(USE)
            .filter((k) => USE[k] === M.key)
            .join(", ") || "(nothing yet)",
        animations: M.clips.map((c) => c.name).join(", ") || "(none)",
      }));
      console.table(L);
      return L;
    },
    MODELS,
    USE,
    // v46: true while libraries or packed models are still loading (a failed library download counts as finished)
    busy: () => libs === 1 || (libs !== -1 && pend > 0),
    pending: () => (libs === -1 ? 0 : pend),
  };
})();
