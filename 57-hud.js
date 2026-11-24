// v40 HUD and menu polish (loads LAST, after 56): only top-level name UIX.
// - Toasts (wraps toast, 06): slide in and fade out, a repeat of a visible message bumps a "x2" counter instead of
//   stacking, at most 5 on screen (the oldest leaves early), time on screen follows message length, gold ones stay longer.
// - HP bar: a pale "damage trail" shows the chunk just lost, then drains; the player plate pulses red below 30% HP.
// - Level ring: tooltip with XP numbers, a glow pulse when XP comes in, a burst when you level.
// - Glimmers: the counter counts up/down to the new total and pops.
// - Book/panels open with a short scale-in (talk boxes slide up), buttons/tabs/cards get hover and press feedback,
//   thin gold scrollbars in panels.
// Wraps toast and ui (10). CSS only otherwise; no scene objects, no save fields.
const UIX = (() => {
  const css = document.createElement("style");
  css.id = "uixcss";
  css.textContent =
    // toasts
    "#toasts div{transition:opacity .35s,transform .35s,max-height .35s,margin .35s;max-height:80px;" +
    "box-shadow:0 4px 12px rgba(0,0,0,.35);animation:uxt .32s cubic-bezier(.2,.9,.3,1.2)}" +
    "#toasts div.out{opacity:0;transform:translateY(-8px) scale(.96);max-height:0;margin:-3px 0;padding-top:0;padding-bottom:0}" +
    "#toasts div b.ux{margin-left:7px;padding:0 6px;border-radius:8px;background:rgba(0,0,0,.25);font:800 11px system-ui}" +
    "#toasts div.bump{animation:uxb .3s ease-out}" +
    "@keyframes uxt{from{opacity:0;transform:translateY(-10px) scale(.9)}to{opacity:1;transform:none}}" +
    "@keyframes uxb{40%{transform:scale(1.07)}}" +
    // hp trail + low hp
    ".unit .bar #hp{position:relative;z-index:1}.unit .bar::after{z-index:2}" +
    "#hptr{position:absolute;left:0;top:0;bottom:0;width:100%;background:linear-gradient(90deg,#fff3c8,#ffd0a0);" +
    "opacity:.75;border-radius:2px;transition:width .55s ease-in}" +
    ".unit.lowhp{animation:uxlow 1.1s ease-in-out infinite}" +
    "@keyframes uxlow{50%{box-shadow:0 0 0 2px #1a1208,inset 0 0 18px rgba(255,60,60,.45),0 0 16px rgba(255,60,60,.55)}}" +
    // level ring
    ".lvl{transition:box-shadow .3s}.lvl.uxg{animation:uxg .7s ease-out}.lvl.uxl{animation:uxl 1.2s ease-out}" +
    "@keyframes uxg{30%{box-shadow:0 0 0 2px rgba(255,211,77,.7),0 0 14px rgba(255,211,77,.8)}}" +
    "@keyframes uxl{0%{transform:scale(1)}25%{transform:scale(1.25);box-shadow:0 0 0 3px #ffd34d,0 0 26px #ffd34d}100%{transform:scale(1)}}" +
    // glimmers
    "#gold.uxp{animation:uxp .45s ease-out}#gold.uxm{animation:uxm .45s ease-out}" +
    "@keyframes uxp{35%{transform:translateX(-50%) scale(1.15);box-shadow:0 0 14px rgba(255,226,154,.7)}}" +
    "@keyframes uxm{35%{transform:translateX(-50%) scale(.93);color:#ffb0a0}}" +
    // panels
    "#panel .pbox{animation:uxin .2s cubic-bezier(.2,.8,.3,1)}#panel.talk .pbox{animation:uxup .26s cubic-bezier(.2,.8,.3,1)}" +
    "@keyframes uxin{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}" +
    "@keyframes uxup{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}" +
    ".pbox{scrollbar-width:thin;scrollbar-color:#8a6a2a transparent}" +
    ".pbox::-webkit-scrollbar{width:8px}.pbox::-webkit-scrollbar-thumb{background:#6a5424;border-radius:4px}" +
    ".pbox::-webkit-scrollbar-thumb:hover{background:#c9a24a}.pbox::-webkit-scrollbar-track{background:transparent}" +
    // buttons, tabs, cards
    ".pb{transition:filter .12s,transform .08s,box-shadow .15s}" +
    ".pb:hover:not(:disabled){filter:brightness(1.12)}.pb:active:not(:disabled){transform:translateY(1px);filter:brightness(.95)}" +
    "#tabs button{transition:background .15s,color .15s,border-color .15s}#tabs button:not(.on):hover{border-color:#c9a24a;color:#ffe9b0}" +
    ".qc,.row{transition:background .15s}.qc:hover{box-shadow:0 0 0 1px rgba(255,211,77,.25),inset 0 0 12px rgba(255,190,90,.1)}" +
    "#hand .card{transition:transform .14s,box-shadow .14s}" +
    "#hand .card:not(:disabled):hover{transform:translateY(-6px);box-shadow:0 8px 14px rgba(0,0,0,.45),0 0 12px rgba(164,140,255,.35)}" +
    "@media (prefers-reduced-motion:reduce){#toasts div,#panel .pbox,.lvl,#gold,.unit.lowhp{animation:none!important}}";
  document.head.appendChild(css);

  // ---------- toasts ----------
  const MAXT = 5;
  const tLife = (m, col) => Math.min(6500, 2600 + 38 * m.length) + (col === "#ffd34d" ? 1200 : 0);
  function gone(d) {
    if (d.dataset.out) return;
    d.dataset.out = 1;
    clearTimeout(d._t);
    d.classList.add("out");
    setTimeout(() => d.remove(), 380);
  }
  toast = function (m, col) {
    const box = $("toasts");
    if (!box) return;
    m = String(m);
    const live = [...box.children].filter((d) => !d.dataset.out);
    const same = live.find((d) => d.dataset.m === m);
    if (same) {
      const n = (+same.dataset.n || 1) + 1;
      same.dataset.n = n;
      let c = same.querySelector("b.ux");
      if (!c) {
        c = document.createElement("b");
        c.className = "ux";
        same.appendChild(c);
      }
      c.textContent = "×" + n;
      same.classList.remove("bump");
      void same.offsetWidth;
      same.classList.add("bump");
      clearTimeout(same._t);
      same._t = setTimeout(() => gone(same), tLife(m, col));
      return;
    }
    const d = document.createElement("div");
    d.textContent = m;
    d.dataset.m = m;
    if (col)
      d.style.cssText =
        "background:linear-gradient(#2a2016,#17110c);color:" +
        col +
        ";border:1px solid " +
        col +
        ";box-shadow:0 0 12px " +
        col +
        "66";
    box.appendChild(d);
    d._t = setTimeout(() => gone(d), tLife(m, col));
    live.slice(0, Math.max(0, live.length + 1 - MAXT)).forEach(gone);
  };

  // ---------- HUD: hp trail, low hp, xp ring, glimmers ----------
  let trail = null,
    lastW = 100,
    trT = 0,
    lastXP = null,
    lastLv = null,
    gShown = null,
    gT = 0,
    gRaf = 0,
    lastN = "";
  function ensureTrail() {
    if (trail && trail.isConnected) return trail;
    const hp = $("hp");
    if (!hp || !hp.parentNode) return null;
    trail = document.createElement("i");
    trail.id = "hptr";
    hp.parentNode.insertBefore(trail, hp);
    return trail;
  }
  function anim(el, c) {
    el.classList.remove(c);
    void el.offsetWidth;
    el.classList.add(c);
  }
  function goldTick() {
    const el = $("gold");
    if (!el || gShown == null) return;
    const t = P.gold,
      d = t - gShown;
    if (!d) return void (gRaf = 0);
    const step = Math.sign(d) * Math.max(1, Math.ceil(Math.abs(d) / 12));
    gShown = Math.abs(step) >= Math.abs(d) ? t : gShown + step;
    el.textContent = "✦ " + gShown;
    gRaf = requestAnimationFrame(goldTick);
  }
  function hud() {
    if (typeof P === "undefined" || !P) return;
    const id = (P.name || "") + "|" + (P.cls || "");
    if (id !== lastN) {
      lastN = id;
      reset();
    }
    // hp trail
    const tr = ensureTrail(),
      w = Math.max(0, Math.min(100, (g.hp / mhp()) * 100));
    if (tr) {
      clearTimeout(trT);
      if (w < lastW - 0.5) trT = setTimeout(() => (tr.style.width = w + "%"), 380);
      else tr.style.width = w + "%";
      lastW = w;
    }
    const u = $("hp") && $("hp").closest(".unit");
    if (u) u.classList.toggle("lowhp", mode === "battle" && g.hp > 0 && w < 30);
    // level ring
    const lv = $("lvl");
    if (lv) {
      lv.title = "Level " + P.lvl + (P.lvl < 20 ? "  ·  " + P.xp + " / " + need() + " XP" : "");
      if (lastLv != null && P.lvl > lastLv) anim(lv, "uxl");
      else if (lastXP != null && P.lvl === lastLv && P.xp > lastXP) anim(lv, "uxg");
      lastXP = P.xp;
      lastLv = P.lvl;
    }
    // glimmers
    const gd = $("gold");
    if (gd) {
      if (gShown == null || Math.abs(P.gold - gShown) > 100000) gShown = P.gold;
      if (P.gold !== gShown) {
        anim(gd, P.gold > gShown ? "uxp" : "uxm");
        if (!gRaf) gRaf = requestAnimationFrame(goldTick);
      }
      gd.textContent = "✦ " + gShown;
    }
  }
  const ui0 = ui;
  ui = function () {
    const r = ui0.apply(this, arguments);
    try {
      hud();
    } catch (e) {}
    return r;
  };
  // switching character: snap the counters instead of animating the difference
  const reset = () => {
    gShown = null;
    lastXP = null;
    lastLv = null;
    lastW = 100;
  };
  return { reset, hud };
})();
