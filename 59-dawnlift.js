// v40 The dusk lifts (loads LAST, after 56-flow): only top-level name DUSKLIFT.
// Each finished ★ chapter (FLOW.CH, 56) nudges every outdoor zone's look toward dawn: a little more hemisphere and sun
// light, warmer light colours, fog drifting toward the zone's own sky-light colour, a few more units of view distance,
// and a dawn glow rising from the bottom of the CSS sky. Each zone keeps its own palette. Wraps thP (11), so theme()
// and themeMix() (trails) both get it; dungeons (dn), the tower and the title/prologue (TI.mode) are left alone.
// A newly finished chapter eases in over ~4 s by re-applying theme(lastTh). Toggle: Book > Options > Display
// "Dusk lifts with the story" (localStorage duskwick_lift, default on). No scene objects, no save fields.
const DUSKLIFT = (() => {
  if (typeof thP !== "function") return {};
  const MAXN = 5,
    DAWN = new T.Color(0xffe2b8),
    c0 = new T.Color(),
    c1 = new T.Color();
  let on = true;
  try {
    on = localStorage.getItem("duskwick_lift") !== "0";
  } catch (e) {}
  const chapters = () =>
    typeof FLOW !== "undefined" && FLOW.CH && typeof P !== "undefined" && P && P.done
      ? FLOW.CH.filter((c) => c.q.every((i) => P.done[i])).length
      : 0;
  let cur = null, // the strength being shown (eases toward the chapter count)
    goal = 0,
    who = "";
  const lerpHex = (a, b, k) => c0.setHex(a).lerp(c1.setHex(b), k).getHex();
  const th0 = thP;
  thP = function (z) {
    const A = th0.apply(this, arguments);
    try {
      const n = cur == null ? 0 : cur;
      if (!on || n <= 0 || A.dn || z === "tower" || (typeof TI !== "undefined" && TI.mode)) return A;
      const k = n / MAXN; // 0..1
      A.L = [A.L[0] * (1 + 0.2 * k), A.L[1] * (1 + 0.3 * k), A.L[2] * (1 + 0.25 * k)];
      A.hl = lerpHex(A.hl, DAWN.getHex(), 0.22 * k);
      A.sun = lerpHex(A.sun, DAWN.getHex(), 0.3 * k);
      A.fog = lerpHex(A.fog, A.hl, 0.16 * k);
      A.gc = lerpHex(A.gc, A.fog, 0.15 * k);
      A.far += 16 * k;
      A.near += 6 * k;
      const a = (0.32 * k).toFixed(3),
        b = (0.14 * k).toFixed(3);
      A.sky =
        "radial-gradient(ellipse 120% 55% at 50% 100%,rgba(255,214,150," +
        a +
        ") 0%,rgba(255,170,120," +
        b +
        ") 45%,transparent 75%)," +
        A.sky;
    } catch (e) {}
    return A;
  };
  // re-apply the current zone's look (goes through 34-dungeons' theme wrap, which keeps a dungeon's own look)
  function reapply() {
    try {
      if (typeof mode !== "undefined" && mode !== "explore") return;
      // on a trail ("mix") walk() blends with themeMix every frame, which already goes through thP
      if (typeof lastTh === "string" && lastTh && lastTh !== "mix") theme(lastTh);
    } catch (e) {}
  }
  setInterval(() => {
    if (typeof P === "undefined" || !P || !P.done) return;
    const id = (P.name || "") + "|" + (P.cls || ""),
      n = Math.min(MAXN, chapters());
    if (id !== who) {
      // new character: jump straight to its level of light
      who = id;
      goal = cur = n;
      reapply();
      return;
    }
    goal = n;
    if (cur !== goal) {
      const step = Math.sign(goal - cur) * 0.025; // 0.1 s ticks: one chapter in ~4 s
      cur = Math.abs(goal - cur) <= Math.abs(step) ? goal : cur + step;
      reapply();
    }
  }, 100);
  // Book > Options > Display row
  if (typeof panel === "function") {
    const pn0 = panel;
    panel = function (k) {
      const r = pn0.apply(this, arguments);
      try {
        if (k !== "book" || typeof BOOKL === "undefined" || BOOKL.last !== "optdisp") return r;
        const pl = $("pl");
        if (!pl || pl.querySelector("#dlrow")) return r;
        const row = document.createElement("div");
        row.className = "row";
        row.id = "dlrow";
        row.innerHTML =
          "<div><b>Dusk lifts with the story</b><small>The sky, light and fog warm toward dawn with each chapter you finish</small></div>";
        const b = document.createElement("button");
        b.className = "pb";
        const lab = () => (b.textContent = on ? "On" : "Off");
        lab();
        b.onclick = () => {
          on = !on;
          try {
            localStorage.setItem("duskwick_lift", on ? "1" : "0");
          } catch (e) {}
          lab();
          reapply();
        };
        row.appendChild(b);
        pl.appendChild(row);
      } catch (e) {}
      return r;
    };
  }
  return {
    chapters,
    reapply,
    get on() {
      return on;
    },
  };
})();
