// DUSKWICK - 77-ko.js (v51): knock-out / death animation for the player. Loaded in order by index.html as plain
// scripts; they share one global scope. Only top-level name: KOFX. Loads LAST (after 76).
// When the local hero goes down (09 downHero) the wizard staggers, buckles and falls onto their back, arms out, eyes
// shut, with a puff of gloom; a dark vignette creeps in. The pose is laid over animW (02) every frame while the local
// hero is down in battle, or while the "The dark wins" screen is up (mode "over"); leave()/reviveHero end it.
// lose() (10) waits for the fall to finish before the defeat screen shows. Other heroes' falls are eased too
// (09 snapped them to rotation.z 1.4). Solo cosmetic: no NET, no save fields, no lights.
const KOFX = (() => {
  const FALL = 1.15, // seconds to hit the ground
    LOSE_WAIT = 1700; // ms before the defeat screen
  let t0 = 0, // performance.now() when the local hero went down (0 = standing)
    puffed = 0,
    shaken = 0,
    vig = null;
  const ease = (x) => x * x * (3 - 2 * x);
  const now = () => performance.now();
  const active = () => {
    if (mode === "over") return t0 > 0;
    return mode === "battle" && typeof iAmDown === "function" && iAmDown();
  };
  function vignette(a) {
    if (!vig) {
      vig = document.createElement("div");
      vig.style.cssText =
        "position:absolute;inset:0;pointer-events:none;z-index:5;opacity:0;transition:opacity .25s;" +
        "background:radial-gradient(ellipse at center,rgba(20,8,30,0) 35%,rgba(40,6,24,.55) 75%,rgba(8,2,14,.85) 100%)";
      document.body.appendChild(vig);
    }
    vig.style.opacity = String(a);
  }
  // the local wizard's pose, laid over whatever animW just set
  function pose(t) {
    // 0..0.22 s: the blow rocks them back, arms fly up
    // 0.22..FALL: knees give, they topple backwards (gravity: eased in)
    // FALL..+0.3: a small bounce as they land, then still
    const k0 = Math.min(1, t / 0.22),
      kf = Math.max(0, Math.min(1, (t - 0.22) / (FALL - 0.22))),
      fall = kf * kf, // accelerate into the ground
      land = t > FALL ? Math.max(0, 1 - (t - FALL) / 0.3) : 0,
      bounce = Math.sin(land * Math.PI) * 0.12 * (t > FALL ? 1 : 0);
    let rx = -0.25 * ease(k0) * (1 - fall) - 1.42 * fall + bounce;
    W.rotation.x = rx;
    // a slight twist so they land a little on one side, not like a plank
    W.rotation.z = 0.18 * fall;
    // sink as the knees give, then rest the back on the ground (the origin is at the feet)
    const sink = Math.sin(kf * Math.PI) * -0.15;
    W.position.y =
      0.32 * Math.abs(Math.sin(rx)) + sink + (typeof BDECK !== "undefined" ? BDECK.h(W.position.x, W.position.z) : 0);
    // arms: up with the blow, then flung out to the sides and limp
    const up = ease(k0) * (1 - fall);
    AL.rotation.x = -1.6 * up - 0.4 * fall;
    AR.rotation.x = -1.6 * up - 0.4 * fall;
    AL.rotation.z = -0.1 - 0.5 * up - 1.1 * fall;
    AR.rotation.z = 0.1 + 0.5 * up + 1.1 * fall;
    // eyes shut once they start to fall, cape lies flat under them
    if (kf > 0.15) EYES.forEach((e) => (e.scale.y = 0.12));
    CAPE.rotation.x = 0.25 * (1 - fall) + 0.05;
    CAPE.rotation.z = 0;
    // no breathing once down
    const ps = 0.78 * (W.userData.ht || 1);
    W.scale.set(ps, ps, ps);
  }
  // wrap animW (02) so the pose wins every frame
  const animW0 = animW;
  animW = function (s, dt) {
    animW0(s, dt);
    try {
      tick();
    } catch (e) {}
  };
  let posed = 0;
  function tick() {
    if (active()) {
      if (!t0) {
        t0 = now();
        puffed = shaken = 0;
      }
      const t = (now() - t0) / 1000;
      pose(t);
      posed = 1;
      if (!shaken && t > 0.02) {
        shaken = 1;
        try {
          puff(W.position.clone().setY(1.6), "spirit", 10, 2.2, 0.6, 0.9);
        } catch (e) {}
      }
      if (!puffed && t > FALL) {
        puffed = 1;
        try {
          puff(W.position.clone().setY(0.4), "spirit", 18, 2.6, 1.1, 1.1);
          if (typeof shock === "function") shock(W.position.clone().setY(0.15), 0x6a3a9a, 2.4, 600);
        } catch (e) {}
      }
      vignette(Math.min(1, t / 1.2));
    } else {
      t0 = 0;
      if (posed) {
        posed = 0;
        W.rotation.z = 0; // animW eases rotation.x / y / arms back on its own
      }
      if (vig && vig.style.opacity !== "0") vignette(0);
    }
    remotes();
  }
  // other heroes: 09 snaps a downed hero to rotation.z 1.4 / y 0.35; ease that instead
  function remotes() {
    if (mode !== "battle" || !g || !g.heroes) return;
    const n = now();
    g.heroes.forEach((h) => {
      if (h.local || !h.m || !h.koT) return;
      if (!h.down) {
        h.koT = 0;
        return;
      }
      const t = (n - h.koT) / 1000,
        kf = Math.min(1, t / 0.8),
        f = kf * kf,
        b = t > 0.8 ? Math.sin(Math.max(0, 1 - (t - 0.8) / 0.25) * Math.PI) * 0.1 : 0;
      h.m.rotation.z = 1.4 * f - b;
      h.m.position.y = 0.35 * f;
      if (t > 1.2) h.koT = 0; // done: leave 09's resting pose
    });
  }
  const downHero0 = downHero;
  downHero = function (h) {
    const was = h && h.down;
    downHero0(h);
    if (!h || was) return;
    if (h.local) {
      // start the clock now: lose() can come before the next frame draws
      if (!t0) {
        t0 = now();
        puffed = shaken = 0;
      }
      return;
    }
    if (!h.m) return;
    h.m.rotation.z = 0;
    h.m.position.y = 0;
    h.koT = now();
  };
  // let the fall play before the defeat screen
  const lose0 = lose;
  let losing = 0;
  lose = function () {
    if (losing) return;
    if (!t0 || mode !== "battle") return lose0();
    losing = 1;
    if (g) g.busy = true;
    try {
      ui();
    } catch (e) {}
    const left = Math.max(300, LOSE_WAIT - (now() - t0));
    setTimeout(() => {
      losing = 0;
      if (mode === "battle") lose0();
    }, left);
  };
  return { active, pose: (t) => pose(t) };
})();
