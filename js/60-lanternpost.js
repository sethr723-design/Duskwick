// v40 Lantern post (loads LAST, after 56-flow): only top-level name LPOST.
// Cuts the story's back-and-forth walking. Once chapter I is done (P.done[2]), a ready ★ quest whose giver is far away
// (another zone, or more than FAR units off) is handed in by lantern post after a short wait: qturn() as if you had
// talked to them (special rewards, bag-full hold, chapter card all work as usual). Then, if the next ★ step is open and
// its giver is far too, a letter card shows the giver's lines (STORY, 06) with Accept / Later. Later leaves it with the
// giver as before (asked again next session). Only in explore, unpaused, no panel, no cutscene or boss speech, and after
// 56's chapter card has closed. Side quests are untouched. Setting duskwick_post (Book > Options > Game). No save fields.
const LPOST = (() => {
  const FAR = 60,
    WAIT = 2.5;
  let on = true;
  try {
    on = localStorage.getItem("duskwick_post") !== "0";
  } catch (e) {}
  const later = {}; // next-step quest index -> 1: "Later" pressed this session
  let rdyT = {},
    card = null,
    who = "";

  const giverNpc = (q) => NPCS.find((n) => npcGv(n) === qGv(q));
  function far(q) {
    const n = giverNpc(q);
    if (!n) return false;
    const p = W.position;
    return zoneAt(n.x, n.z) !== zoneAt(p.x, p.z) || Math.hypot(n.x - p.x, n.z - p.z) > FAR;
  }
  function calm() {
    const b = document.body.classList;
    return (
      mode === "explore" &&
      !paused &&
      !card &&
      $("panel").style.display !== "flex" &&
      !b.contains("cut") &&
      !b.contains("bsay") &&
      !b.contains("ttl") &&
      !document.getElementById("fcard") &&
      !document.getElementById("lvup") &&
      !(typeof TI !== "undefined" && TI.mode)
    );
  }

  // ---------- the letter ----------
  function css() {
    if (document.getElementById("lpcss")) return;
    const e = document.createElement("style");
    e.id = "lpcss";
    e.textContent =
      "#lpost{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);" +
      "z-index:39;width:min(440px,92vw);box-sizing:border-box;opacity:0;transition:opacity .35s,transform .35s}" +
      "#lpost.on{opacity:1;transform:translate(-50%,0)}" +
      "#lpost .dlg{margin:0;box-shadow:0 10px 30px rgba(0,0,0,.55),inset 0 0 18px rgba(90,60,20,.25)}" +
      "#lpost .lpk{display:block;font:700 10px system-ui;letter-spacing:.2em;text-transform:uppercase;color:#7a5a2a;margin:2px 0 4px}" +
      "#lpost .lpd{font:600 13px system-ui;color:#3a6a2a;margin:0 0 8px}" +
      "#lpost p{margin:2px 0 8px}#lpost .da .pb{min-height:32px}" +
      "body.cut #lpost{display:none}";
    document.head.appendChild(e);
  }
  function close() {
    if (!card) return;
    const c = card;
    card = null;
    c.classList.remove("on");
    setTimeout(() => c.remove(), 380);
  }
  function show(done, nx) {
    css();
    const d = document.createElement("div"),
      dq = done != null ? QS[done] : null,
      nq = nx != null ? QS[nx] : null,
      who = nq ? qGiver(qGv(nq)) : qGiver(qGv(dq)),
      lines = nq ? (STORY[nx] || [nq.s]).filter((l) => !/^- /.test(l)) : [];
    let h = '<div class="dlg"><span class="spk">Lantern post · ' + who + "</span>";
    if (dq)
      h +=
        '<span class="lpk">Word reached ' +
        qGiver(qGv(dq)) +
        '</span><div class="lpd">Quest complete: ' +
        dq.n +
        "</div>" +
        (!nq ? "<p>" + (SDONE[done] || "Well done, lamplighter.").replace(/^\([^)]*\)\s*/, "") + "</p>" : "");
    if (nq) h += '<span class="lpk">Next: ' + nq.n + "</span>" + lines.map((l) => "<p>" + l + "</p>").join("");
    h += '<div class="da"></div></div>';
    d.id = "lpost";
    d.innerHTML = h;
    const da = d.querySelector(".da"),
      b = (t, f, gold) => {
        const x = document.createElement("button");
        x.className = "pb";
        x.textContent = t;
        if (gold) x.style.cssText = "background:linear-gradient(#e6b84a,#b8841a);color:#2a1a05;font-weight:800";
        x.addEventListener("pointerdown", (e) => e.stopPropagation());
        x.onclick = () => {
          f();
          x.blur();
        };
        da.appendChild(x);
      };
    if (nq) {
      b("Later", () => {
        later[nx] = 1;
        close();
      });
      b(
        "Accept: " + nq.n,
        () => {
          if (P.qa[nx] == null && qOpen(nx)) {
            DLGI = 0;
            qacc(nx);
            if (P.atrk) P.trk = nx;
            sv();
            toast('New quest: "' + nq.n + '"', "#ffd34d");
          }
          close();
        },
        1,
      );
    } else b("Close", close);
    document.body.appendChild(d);
    card = d;
    requestAnimationFrame(() => d.classList.add("on"));
  }

  // ---------- the post round ----------
  let pendDone = null,
    pendAt = 0;
  function nextOffer() {
    const nx = qMain();
    if (nx < 0 || later[nx] || P.qa[nx] != null || !qOpen(nx) || !QS[nx].m) return -1;
    return far(QS[nx]) ? nx : -1;
  }
  setInterval(() => {
    try {
      if (!on || typeof P === "undefined" || !P || !P.done || !P.done[2]) return;
      const id = (P.name || "") + "|" + (P.cls || "");
      if (id !== who) {
        who = id;
        rdyT = {};
        pendDone = null;
        for (const k in later) delete later[k];
        close();
      }
      // a fight (or anything else) starts: put the letter away; an unanswered offer comes back afterwards
      if (card && mode !== "explore") close();
      if (!calm()) return;
      // a hand-in already made, waiting for the chapter card to close: show its letter now
      if (pendDone != null) {
        if (Date.now() - pendAt < 1400) return; // 56's chapter card appears 700 ms after qdone

        const nx = nextOffer();
        show(pendDone, nx >= 0 ? nx : null);
        pendDone = null;
        return;
      }
      // hand in a ready story quest whose giver is far away
      const i = QS.findIndex((q, j) => q.m && P.rdy[j] && !P.done[j] && P.qa[j] != null);
      if (i >= 0) {
        if (!far(QS[i])) return void delete rdyT[i];
        rdyT[i] = (rdyT[i] || 0) + 0.5;
        if (rdyT[i] < WAIT) return;
        delete rdyT[i];
        qturn(i);
        ui();
        // let 56's chapter card (shown 700 ms after qdone) go first; the letter follows when it closes
        pendDone = i;
        pendAt = Date.now();
        return;
      }
      // the next story step waits with a far-away giver: offer it by letter
      const nx = nextOffer();
      if (nx >= 0) show(null, nx);
    } catch (e) {}
  }, 500);

  // Book > Options > Game row
  if (typeof panel === "function") {
    const pn0 = panel;
    panel = function (k) {
      const r = pn0.apply(this, arguments);
      try {
        if (k !== "book" || typeof BOOKL === "undefined" || BOOKL.last !== "optgame") return r;
        const pl = $("pl");
        if (!pl || pl.querySelector("#lprow")) return r;
        const row = document.createElement("div"),
          bt = document.createElement("button");
        row.className = "row";
        row.id = "lprow";
        row.innerHTML =
          "<div><b>Story by lantern post</b><small>After chapter I, finished ★ quests reach a far-away giver on their own and the next step comes as a letter</small></div>";
        bt.className = "pb";
        const lab = () => (bt.textContent = on ? "On" : "Off");
        lab();
        bt.onclick = () => {
          on = !on;
          try {
            localStorage.setItem("duskwick_post", on ? "1" : "0");
          } catch (e) {}
          lab();
          if (!on) close();
          bt.blur();
        };
        row.appendChild(bt);
        pl.appendChild(row);
      } catch (e) {}
      return r;
    };
  }
  return {
    show,
    close,
    get on() {
      return on;
    },
  };
})();
