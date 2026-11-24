// v50 First-person view (loads LAST, after 74): only top-level name FPV.
// V toggles it in explore (or scroll all the way in, then keep scrolling; scroll out to leave). The camera sits at the
// wizard's eyes and looks along `yaw` (11), so WASD, Q/E and the drag-to-turn all work as before; dragging up/down
// tilts the view (own `pit`). The wizard's meshes are hidden only while the frame is drawn (lights stay on, so the
// light count never changes and shaders don't recompile). Camera set from a WONDR.pre hook (53), which runs after
// walk() and after 55's hop. Off in battle, cutscenes, photo mode, the title and whenever the game is paused.
// Setting duskwick_fp ("1" = on), row in Book > Options > Display. No save fields, no NET.
const FPV = (() => {
  if (typeof WONDR === "undefined" || !WONDR.pre) return {};
  let on = false,
    pit = 0,
    keep = null, // camH/camD from before, given back on leaving
    acc = 0,
    hid = [];
  try {
    on = localStorage.getItem("duskwick_fp") === "1";
  } catch (e) {}
  const dot = document.createElement("div");
  dot.id = "fpdot";
  dot.style.cssText =
    "position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;" +
    "background:rgba(255,236,190,.85);box-shadow:0 0 4px rgba(0,0,0,.7);pointer-events:none;z-index:5;display:none";
  document.body.appendChild(dot);

  const live = () => {
    if (!on || typeof mode === "undefined" || mode !== "explore" || paused) return false;
    if (typeof W === "undefined" || !W.visible) return false;
    if (typeof TI !== "undefined" && TI.mode) return false;
    if (typeof CUT !== "undefined" && CUT) return false;
    const b = document.body.classList;
    return !(b.contains("cut") || b.contains("ttl"));
  };
  function set(v) {
    v = !!v;
    if (v === on) return;
    on = v;
    try {
      localStorage.setItem("duskwick_fp", on ? "1" : "0");
    } catch (e) {}
    if (on) {
      keep = { h: camH, d: camD };
      pit = 0;
    } else if (keep) {
      camH = keep.h;
      camD = keep.d;
      keep = null;
    }
    acc = 0;
    if (typeof toast === "function") toast(on ? "First-person view (V to leave)" : "Third-person view");
  }

  // camera at the eyes, meshes of the wizard hidden for this frame
  WONDR.pre(() => {
    const a = live();
    dot.style.display = a ? "block" : "none";
    if (!a) return;
    const p = W.position,
      sy = W.scale.y || 0.78,
      fx = -Math.sin(yaw),
      fz = -Math.cos(yaw);
    C.position.set(p.x + fx * 0.25 * sy, p.y + 2.6 * sy, p.z + fz * 0.25 * sy);
    C.rotation.set(pit, yaw, 0, "YXZ");
    C.updateMatrixWorld();
    W.traverse((o) => {
      if (o.visible && (o.isMesh || o.isSprite || o.isPoints || o.isLine)) {
        o.visible = false;
        hid.push(o);
      }
    });
  });
  {
    const r1 = R.render;
    R.render = function () {
      try {
        return r1.apply(this, arguments);
      } finally {
        for (let i = 0; i < hid.length; i++) hid[i].visible = true;
        hid.length = 0;
      }
    };
  }

  // tilt: drag up/down (11's drag already turns left/right)
  const lastY = {};
  stage.addEventListener("pointerdown", (e) => (lastY[e.pointerId] = e.clientY));
  stage.addEventListener("pointermove", (e) => {
    const y0 = lastY[e.pointerId];
    if (y0 == null) return;
    lastY[e.pointerId] = e.clientY;
    if (!live() || typeof dr === "undefined" || !dr || dr.id !== e.pointerId) return;
    pit = Math.max(-1.2, Math.min(1.0, pit - (e.clientY - y0) * 0.005));
  });
  const up = (e) => delete lastY[e.pointerId];
  addEventListener("pointerup", up);
  addEventListener("pointercancel", up);

  addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.key.toLowerCase() !== "v") return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (typeof mode === "undefined" || mode !== "explore" || paused) return;
    set(!on);
  });
  // scroll out leaves; at the closest zoom, keep scrolling in to enter (11's wheel handler runs first and clamps camD)
  stage.addEventListener("wheel", (e) => {
    if (typeof mode === "undefined" || mode !== "explore" || paused) return;
    if (on) {
      if (e.deltaY > 0) set(false);
      return;
    }
    if (camD <= 6 && e.deltaY < 0) {
      acc += e.deltaY;
      if (acc < -240) set(true);
    } else acc = 0;
  });

  // Book > Options > Display row
  if (typeof panel === "function") {
    const pn0 = panel;
    panel = function (k) {
      const r = pn0.apply(this, arguments);
      try {
        if (k !== "book" || typeof BOOKL === "undefined" || BOOKL.last !== "optdisp") return r;
        const pl = $("pl");
        if (!pl || pl.querySelector("#fprow")) return r;
        const row = document.createElement("div");
        row.className = "row";
        row.id = "fprow";
        row.innerHTML =
          "<div><b>First-person view</b><small>See through your wizard's eyes while exploring (V, or scroll all the way in)</small></div>";
        const b = document.createElement("button");
        b.className = "pb";
        const lab = () => (b.textContent = on ? "On" : "Off");
        lab();
        b.onclick = () => {
          set(!on);
          lab();
        };
        row.appendChild(b);
        pl.appendChild(row);
      } catch (e) {}
      return r;
    };
  }
  return {
    set,
    get on() {
      return on;
    },
  };
})();
