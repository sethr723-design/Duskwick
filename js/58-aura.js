// v40 Lamplighter's Light (loads LAST, after 56-flow): only top-level name AURA.
// Your wizard's light grows with the story: each finished ★ chapter (FLOW.CH, 56) adds an ember that circles you
// (up to 4, tinted between gold and your school's colour), and finishing the story adds a slow golden ring at your
// feet. A newly earned ember drops in from above with a puff. Its own scene group, never a child of W (W.clone()
// builds other players' wizards), added at runtime after BASE, follows W in its own rAF. Hidden while W is hidden
// (photo mode), on the title screen and in cutscenes. Cosmetic and solo (not sent over NET). No lights.
const AURA = (() => {
  if (typeof W === "undefined" || typeof S === "undefined") return {};
  const G = new T.Group();
  G.name = "aura";
  G.userData.lus = 1;
  let tex = null,
    built = false,
    have = -1,
    ring = null,
    drop = null;
  const motes = [];
  function glowTex() {
    if (tex) return tex;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d"),
      gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.25, "rgba(255,255,255,.55)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    return (tex = new T.CanvasTexture(c));
  }
  const chapters = () =>
    typeof FLOW !== "undefined" && FLOW.CH ? FLOW.CH.filter((c) => c.q.every((i) => P.done[i])).length : 0;
  function tint(k) {
    const gold = new T.Color(0xffd27a),
      sc = new T.Color(P.cls && CL[P.cls] ? CL[P.cls][0] : 0xffd27a);
    return gold.lerp(sc, 0.25 + 0.15 * k);
  }
  function mkMote(k) {
    const m = new T.Group(),
      col = tint(k),
      core = new T.Mesh(
        new T.SphereGeometry(0.07, 12, 8),
        new T.MeshBasicMaterial({ color: col.clone().lerp(new T.Color(0xffffff), 0.55), fog: true }),
      ),
      halo = new T.Sprite(
        new T.SpriteMaterial({
          map: glowTex(),
          color: col,
          transparent: true,
          depthWrite: false,
          blending: T.AdditiveBlending,
          opacity: 0.85,
        }),
      );
    core.userData.nol = 1;
    halo.scale.setScalar(0.62);
    m.add(core, halo);
    m.userData = { k, ph: (k / 4) * Math.PI * 2, halo };
    return m;
  }
  function mkRing() {
    const r = new T.Mesh(
      new T.RingGeometry(0.75, 1.15, 48, 1),
      new T.MeshBasicMaterial({
        color: 0xffd27a,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        blending: T.AdditiveBlending,
        side: T.DoubleSide,
      }),
    );
    r.rotation.x = -Math.PI / 2;
    r.position.y = 0.05;
    r.renderOrder = 2;
    return r;
  }
  function rebuild(n, fresh) {
    while (motes.length > Math.min(4, n)) G.remove(motes.pop());
    while (motes.length < Math.min(4, n)) {
      const m = mkMote(motes.length);
      motes.push(m);
      G.add(m);
      if (fresh) drop = { m, t: 0 };
    }
    if (n >= 5 && !ring) G.add((ring = mkRing()));
    if (n < 5 && ring) {
      G.remove(ring);
      ring = null;
    }
  }
  let last = performance.now(),
    who = "";
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (typeof P === "undefined" || !P || !P.done) return;
    if (!built) {
      S.add(G);
      built = true;
    }
    const b = document.body.classList,
      show =
        W.visible && W.parent && !b.contains("ttl") && !b.contains("cut") && !(typeof TI !== "undefined" && TI.mode);
    G.visible = !!show;
    // a new character (or school) rebuilds quietly; a chapter finished now gets the drop-in
    const id = (P.name || "") + "|" + (P.cls || ""),
      n = chapters();
    if (id !== who) {
      who = id;
      have = n;
      rebuild(0);
      rebuild(n);
    } else if (n !== have) {
      rebuild(n, n > have);
      have = n;
    }
    if (!show) return;
    const wp = W.position,
      sc = W.scale.y || 0.84,
      t = now / 1000;
    G.position.set(wp.x, wp.y, wp.z);
    motes.forEach((m, i) => {
      const u = m.userData,
        a = u.ph + t * (0.9 + 0.08 * i),
        r = (1.0 + 0.12 * Math.sin(t * 1.3 + i)) * sc * 1.15,
        y = (1.9 + 0.35 * Math.sin(t * 1.7 + i * 1.9)) * sc;
      m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      u.halo.material.opacity = 0.65 + 0.25 * Math.sin(t * 3.1 + i * 2.3);
    });
    if (drop) {
      drop.t += dt;
      const k = Math.min(1, drop.t / 1.1),
        m = drop.m;
      m.position.y += (1 - k) * (1 - k) * 6 * sc;
      m.scale.setScalar(0.4 + 0.6 * k + Math.sin(k * Math.PI) * 0.8);
      if (k >= 1) {
        m.scale.setScalar(1);
        try {
          puff(new T.Vector3(wp.x, wp.y + 1.6 * sc, wp.z), "heal", 10, 2, 0.6, 0.9);
        } catch (e) {}
        drop = null;
      }
    }
    if (ring) {
      ring.rotation.z = t * 0.25;
      ring.material.opacity = 0.24 + 0.08 * Math.sin(t * 1.4);
      ring.scale.setScalar(sc * 1.15);
      ring.position.y = 0.05 - wp.y; // stays on the ground while you hop or ride
    }
  }
  requestAnimationFrame(tick);
  return { G, chapters };
})();
