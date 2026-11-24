// DUSKWICK - 28-patrols.js (v25): street foes walk their street instead of pacing a few steps.
// Gloomway foes walk up to 40 either way along it, road foes 30 along their winding road, zone-street foes 45 along
// their street (and trail foes 30). Each keeps its side of the street. Waypoints that land in a safe zone, off the
// walkable ground or in a solid are cut, and the beat stops there, so routes still never cross the safe plazas.
// Runs once at load after every foe exists (27-newfoes.js); deterministic, so every machine agrees. No top-level names.
(() => {
  const ok = (p) => okp(p[0], p[1]) && !safe(p[0], p[1]) && clr(p[0], p[1]);
  function line(f) {
    const zi = zsIdx(f.hx, f.hz);
    if (zi >= 0) {
      const t = ZRD[zi],
        q = rdNear(t, f.hx - OX, f.hz - OZ);
      if (!q) return null;
      return { t, s0: q.s, o: q.o, lo: 30, hi: t.L - 14, sp: 45 };
    }
    const z = zoneAt(f.hx, f.hz);
    if (z === "hub") {
      const lx = f.hx - OX;
      if (Math.abs(lx) < 12) return { gw: 1, s0: OZ - f.hz, lo: 22, hi: SL - 12, sp: 40 };
      const rh = rdHit(lx, f.hz - OZ);
      if (rh && !rh.g) return { t: rh.R, s0: rh.s, o: rh.o, lo: 8, hi: rh.R.L - 6, sp: 30 };
      return null;
    }
    const th = trOn(f.hx, f.hz);
    if (th) return { t: th.t, s0: th.s, o: th.o, lo: 8, hi: th.t.L - 8, sp: 30 };
    return null;
  }
  function longPath(f) {
    if (f.boss || f.tw || f.dun != null || f.prac || !f.o) return;
    const L = line(f);
    if (!L || L.hi - L.lo < 10) return;
    const at = (s) => {
      if (L.gw) return [f.hx, OZ - s];
      const [x, q, hx, hz] = rdAt(L.t, s);
      return [OX + x - hz * L.o, OZ + q + hx * L.o];
    };
    const a = Math.max(L.lo, L.s0 - L.sp),
      b = Math.min(L.hi, L.s0 + L.sp),
      pts = [];
    for (let s = a; s <= b + 0.01; s += 6) pts.push(at(s));
    if (pts.length < 3) return;
    // the unbroken run of good waypoints around the foe's home
    let h = 0;
    pts.forEach((p, i) => {
      if (Math.hypot(p[0] - f.hx, p[1] - f.hz) < Math.hypot(pts[h][0] - f.hx, pts[h][1] - f.hz)) h = i;
    });
    if (!ok(pts[h])) return;
    let i0 = h,
      i1 = h;
    while (i0 > 0 && ok(pts[i0 - 1]) && legOK(pts[i0 - 1], pts[i0])) i0--;
    while (i1 < pts.length - 1 && ok(pts[i1 + 1]) && legOK(pts[i1], pts[i1 + 1])) i1++;
    const run = pts.slice(i0, i1 + 1);
    if (run.length < 3) return; // keep the old short beat
    f.path = run.concat(run.slice(1, -1).reverse());
    f.pi = h - i0;
  }
  foes.forEach(longPath);
  // v36: the editor builds its foes after load (13-editor.js boot) and gives them the same long beat
  window.__longPath = longPath;
})();
