// v30 "The Light Comes Home" (loads LAST, after 40-memories): only top-level name DAWN.
// The story used to end with one line from Oona. Now, handing in "The Last Lamp" (QS[14]) queues an epilogue that plays
// once Oona's window is closed: the Ember's last flame drifts down from the Gloomspire into the Great Lamp (fountain),
// the square flares, and a warm dawn glow rises on the horizon behind the tower. P.dawn = 1 once seen (DEFP default 0);
// older saves that already finished the story get it the next time they play. The glow then stays in the sky outdoors.
// Uses the gate cutscene rig from 04-gates.js (CUT/CSO/CSP/CSLK/csCam/csCap/csTw, driven by cutCam in the loop).
// Book > Lore gets a "Watch the epilogue" row. No lights; nothing is added to the scene until it is needed.
const DAWN = (() => {
  const SPX = OX,
    SPZ = OZ + TCZ, // the Gloomspire
    TOP = 58;
  let pend = 0,
    running = 0;
  // ---- the dawn band: a soft warm ellipse, drawn as a backdrop inside the fog's far plane ----
  let band = null;
  function bandMake() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const x = c.getContext("2d");
    x.setTransform(2, 0, 0, 1, 0, 0); // an ellipse 2:1 that reaches zero at the top edge and both sides (no hard edge)
    const q = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    q.addColorStop(0, "rgba(255,236,190,1)");
    q.addColorStop(0.22, "rgba(255,196,120,.85)");
    q.addColorStop(0.5, "rgba(255,140,120,.38)");
    q.addColorStop(0.78, "rgba(200,110,170,.12)");
    q.addColorStop(1, "rgba(120,80,160,0)");
    x.fillStyle = q;
    x.fillRect(0, 0, 256, 128);
    const m = new T.SpriteMaterial({
      map: new T.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
      depthTest: true, // v31: was false, which painted it over the whole world when you faced north
      fog: false,
      blending: T.AdditiveBlending,
      opacity: 0,
    });
    const s = new T.Sprite(m);
    s.renderOrder = -1;
    s.visible = false;
    S.add(s);
    return s;
  }
  const _d = new T.Vector3();
  let bandK = 0; // 0..1 how far the dawn has risen (eased in during the epilogue, 1 afterwards)
  function bandTick(dt) {
    const want = P && P.dawn ? 1 : 0;
    if (!want && !running) {
      if (band) band.visible = false;
      return;
    }
    if (!band) band = bandMake();
    if (!running) bandK = Math.min(1, bandK + dt * 0.5);
    // outdoors only: not in battle, the tower, dungeons, the Vault or shop rooms
    const z = typeof zoneAt === "function" ? zoneAt(C.position.x, C.position.z) : "hub";
    const out =
      running ||
      (mode === "explore" &&
        /^(hub|frost|ember|marsh)$/.test(z) &&
        C.position.z < 120 &&
        !(typeof shopIn === "function" && shopIn(C.position.x, C.position.z)));
    band.visible = out && bandK > 0.01;
    if (!band.visible) return;
    // always on the northern horizon (where the sun went down behind the tower), just inside the far plane
    const far = Math.max(60, C.far * 0.86);
    _d.set(0, 0, -1);
    // v31: a lower, thinner, dimmer band that sits on the horizon instead of filling the view
    band.position.set(C.position.x + _d.x * far, C.position.y + far * 0.03, C.position.z + _d.z * far);
    band.scale.set(far * 2.2, far * 0.3, 1);
    band.material.opacity = 0.42 * bandK * (0.94 + 0.06 * Math.sin(performance.now() / 1700));
  }

  // ---- the epilogue ----
  const v3 = (x, y, z) => new T.Vector3(x, y, z);
  async function play() {
    if (running || CUT || mode !== "explore" || paused) return false;
    running = 1;
    pend = 0;
    mode = "cut";
    CUT = { skip: false, shk: 0 };
    mv = 0;
    for (const k in keys) keys[k] = false;
    const ret = [W.position.x, W.position.z, W.rotation.y];
    CSP.copy(C.position);
    CSLK.copy(W.position).setY(2.2);
    document.body.classList.add("cut");
    CSO.className = "on";
    csCap("");
    requestAnimationFrame(() => CSO.classList.add("in"));
    const fd = CSO.querySelector(".fd");
    const W8 = (ms) => csW(ms);
    try {
      fd.style.opacity = 1;
      await new Promise((r) => setTimeout(r, 450));
      W.position.set(OX + 3, 0, OZ + 9); // stand by the fountain so the square (and its folk) are loaded
      W.rotation.y = Math.PI;
      try {
        theme("hub");
      } catch (e) {}
      if (!band) band = bandMake();
      bandK = 0;
      // 1) the spire top, the little flame
      CSP.set(SPX + 26, TOP - 6, SPZ + 34);
      CSLK.set(SPX, TOP - 2, SPZ);
      fd.style.opacity = 0;
      const fl = new T.Sprite(AM(GLT, false));
      fl.material.color.setHex(0xffd27a);
      fl.scale.setScalar(3.2);
      fl.position.set(SPX, TOP, SPZ);
      fl.renderOrder = 7;
      S.add(fl);
      csCap("The Light Comes Home", "The Ember's last flame, carried down", "Epilogue");
      await csCam(v3(SPX + 18, TOP - 2, SPZ + 26), v3(SPX, TOP, SPZ), 3200);
      csCap("");
      // 2) it drifts down Gloomway toward the square; the camera follows a little behind
      const a = fl.position.clone(),
        b = v3(OX, 4.2, OZ),
        mid = v3(OX + 4, 34, (a.z + b.z) / 2);
      let lastM = 0;
      await csTw(7000, (k) => {
        const e = k * k * (3 - 2 * k),
          u = 1 - e;
        fl.position.set(
          u * u * a.x + 2 * u * e * mid.x + e * e * b.x,
          u * u * a.y + 2 * u * e * mid.y + e * e * b.y,
          u * u * a.z + 2 * u * e * mid.z + e * e * b.z,
        );
        fl.scale.setScalar(3.2 + Math.sin(k * 40) * 0.25);
        CSLK.copy(fl.position);
        CSP.set(fl.position.x + 10, fl.position.y + 5, fl.position.z + 22);
        const t = performance.now();
        if (CUT && !CUT.skip && t - lastM > 70) {
          lastM = t;
          mote(fl.position.clone(), {
            c: 0xffd27a,
            v: [(Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 0.8],
            l: 1.8,
            s: 0.6,
          });
        }
        if (k > 0.35 && k < 0.4) csCap("Every lamp in Duskwick was once that small.", "", "Oona");
        if (k > 0.8 && k < 0.85) csCap("");
      });
      // 3) home: the Great Lamp takes it, and the square flares
      CSP.set(OX + 14, 7, OZ + 18);
      CSLK.set(OX, 3.5, OZ);
      S.remove(fl);
      fl.material.dispose();
      if (CUT && !CUT.skip) {
        puff(v3(OX, 4, OZ), "fire", 26, 4, 1.2, 1.3);
        ring(OX, 0xffd27a, 9, 1200, OZ);
        for (let i = 0; i < 40; i++) {
          const an = (i / 40) * 6.28;
          mote(v3(OX, 4, OZ), {
            c: i % 3 ? 0xffd27a : 0xffb0c8,
            v: [Math.cos(an) * 5, 3 + Math.random() * 3, Math.sin(an) * 5],
            l: 2.6,
            s: 0.55,
          });
        }
        CUT.shk = 0.35;
      }
      csCap("The light is home.", "Every lamp in the square burns a little brighter", "Lamplight Square");
      await csCam(v3(OX + 10, 6, OZ + 14), v3(OX, 3.5, OZ), 3600);
      csCap("");
      // 4) wide over the rooftops toward the tower: the dawn begins
      // (up Gloomway, within the fog: the spire stands dark against the rising glow)
      await csGo(v3(OX - 3, 7, SPZ + 96), v3(OX, 36, SPZ), 900);
      csCap("The dusk is long.", "", "");
      await csTw(4200, (k) => {
        bandK = k * k;
        CSP.y = 7 + k * 4;
        CSP.z = SPZ + 96 - k * 6;
      });
      csCap("But it is not forever.", "Dawn, at last. Thank you, lamplighter.", "The End");
      bandK = 1;
      await W8(5200);
      csCap("");
    } catch (e) {
      console.error(e);
    }
    P.dawn = 1;
    try {
      sv();
    } catch (e) {}
    // back to the player
    fd.style.opacity = 1;
    await new Promise((r) => setTimeout(r, 400));
    W.position.set(ret[0], 0, ret[1]);
    W.rotation.y = ret[2];
    try {
      theme(themeKey(ret[0], ret[1]));
    } catch (e) {}
    CSP.copy(W.position).add(v3(0, 6, 10));
    CSLK.copy(W.position).setY(2.2);
    fd.style.opacity = 0;
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
    running = 0;
    bandK = 1;
    toast("A warm glow lingers on the horizon now, behind the Gloomspire.", "#ffd27a");
    return true;
  }

  // handing in the Last Lamp queues it; it starts once Oona's window is closed
  const qdone0 = qdone;
  qdone = function (i) {
    const r = qdone0.apply(this, arguments);
    if (i === 14 && !P.dawn) pend = 1;
    return r;
  };

  // Book > Lore: watch it again
  const panel0 = panel;
  panel = function (k, id) {
    panel0.apply(this, arguments);
    try {
      if (k !== "book" || BOOKL.last !== "lore" || !P.dawn) return;
      const L = $("pl");
      if (!L) return;
      const r = document.createElement("div"),
        b = document.createElement("button");
      r.className = "row";
      r.innerHTML =
        "<div><b>Epilogue: The Light Comes Home</b><small>The Ember's last flame, and the first dawn.</small></div>";
      b.className = "pb";
      b.textContent = "Watch";
      b.onclick = () => {
        $("pc").click();
        setTimeout(play, 300);
      };
      r.appendChild(b);
      L.appendChild(r);
    } catch (e) {
      console.error(e);
    }
  };

  let last = performance.now();
  function frame() {
    requestAnimationFrame(frame);
    if (typeof SLOT === "undefined" || SLOT < 0 || !P || typeof mode === "undefined") return;
    const t = performance.now(),
      dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    // old saves that finished the story before v30 see it once too
    if (!pend && !running && P.done && P.done[14] && !P.dawn) pend = 1;
    if (
      pend &&
      !running &&
      mode === "explore" &&
      !paused &&
      !CUT &&
      $("panel").style.display === "none" &&
      !document.body.classList.contains("ttl")
    )
      play();
    bandTick(dt);
  }
  requestAnimationFrame(frame);
  return { play, version: 30 };
})();
