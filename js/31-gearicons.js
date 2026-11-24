// DUSKWICK - 31-gearicons.js: v25b higher-quality gear icons. Replaces gIcon (07-gear-ui.js) with a 128px renderer
// (drawn in the same 64-unit space, shown at the old CSS size so it stays crisp on high-DPI screens): curved
// silhouettes, gradient shading, rim light, soft drop shadow, glowing element gems and a rarity glow/ring.
// Wrapped in an IIFE so it adds no top-level names; unknown slots fall back to the old renderer.
(() => {
  const Z = 128,
    S = Z / 64,
    cache = {},
    old = gIcon,
    OL = "#120a04",
    E = "#3a3226",
    WOOD = "#9a6a3a",
    GOLD = "#d9a441";
  const hx = (h) => {
    h = String(h).replace("#", "");
    if (h.length === 3) h = h.replace(/./g, "$&$&");
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (h, t, k) => {
      const a = hx(h),
        b = hx(t);
      return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, "0")).join("");
    },
    lt = (h, k) => mix(h, "#ffffff", k),
    dk = (h, k) => mix(h, "#000000", k),
    rgba = (h, a) => "rgba(" + hx(h).join(",") + "," + a + ")",
    P2 = (d) => (typeof d === "string" ? new Path2D(d) : d);

  function draw(it) {
    const c = document.createElement("canvas");
    c.width = c.height = Z;
    const x = c.getContext("2d"),
      em = it.r < 0,
      rc = em ? "#4a4030" : RAR[it.r].c,
      ec = em ? "#5a5040" : ELC[it.el] || "#ffd27a";
    x.scale(S, S);
    x.lineJoin = x.lineCap = "round";
    const grad = (g, cols) => {
        cols.forEach((k, i) => g.addColorStop(i / (cols.length - 1), k));
        return g;
      },
      lin = (a, b, c2, d, cols) => (em ? E : grad(x.createLinearGradient(a, b, c2, d), cols)),
      rad = (a, b, r0, c2, d, r1, cols) => (em ? E : grad(x.createRadialGradient(a, b, r0, c2, d, r1), cols)),
      shadow = () => {
        x.shadowColor = "rgba(0,0,0,.5)";
        x.shadowBlur = 2.5 * S;
        x.shadowOffsetY = 1.4 * S;
      },
      ln = (d, col, w, dash) => {
        x.strokeStyle = col;
        x.lineWidth = w;
        x.setLineDash(dash || []);
        x.stroke(P2(d));
        x.setLineDash([]);
      },
      // filled shape: soft drop shadow, clipped decoration, rim light (top-left) + core shade (bottom-right), outline
      body = (d, fill, deco, lw, rule) => {
        const p = P2(d),
          fr = rule || "nonzero";
        x.save();
        shadow();
        x.fillStyle = fill;
        x.fill(p, fr);
        x.restore();
        if (!em) {
          x.save();
          x.clip(p, fr);
          if (deco) deco();
          x.translate(1.4, 1.4);
          ln(p, "rgba(255,255,255,.3)", 2.2);
          x.translate(-2.8, -2.8);
          ln(p, "rgba(0,0,0,.32)", 3.2);
          x.restore();
        }
        ln(p, OL, lw || 2);
      },
      halo = (cx, cy, r, col, a) => {
        if (em) return;
        x.fillStyle = rad(cx, cy, 0, cx, cy, r, [rgba(col, a), rgba(col, a * 0.35), rgba(col, 0)]);
        x.beginPath();
        x.arc(cx, cy, r, 0, 7);
        x.fill();
      },
      shine = (cx, cy, rx, ry, a) => {
        if (em) return;
        x.fillStyle = "rgba(255,255,255," + (a || 0.75) + ")";
        x.beginPath();
        x.ellipse(cx, cy, rx, ry, -0.6, 0, 7);
        x.fill();
      },
      // faceted element gem: radial body, facet lines, specular glint
      gem = (d, cx, cy, r, fac) =>
        body(
          d,
          rad(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.25, [lt(ec, 0.8), ec, dk(ec, 0.55)]),
          () => {
            if (fac) ln(fac, "rgba(255,255,255,.35)", 0.8);
            shine(cx - r * 0.35, cy - r * 0.4, r * 0.28, r * 0.17, 0.85);
          },
          1.6,
        ),
      star = (cx, cy, s, col) => {
        x.save();
        x.translate(cx, cy);
        x.scale(s / 5, s / 5);
        x.shadowColor = col;
        x.shadowBlur = 4 * S;
        x.fillStyle = lt(col, 0.55);
        x.fill(P2("M0 -5Q.9 -.9 5 0Q.9 .9 0 5Q-.9 .9 -5 0Q-.9 -.9 0 -5Z"));
        x.restore();
      };

    // ---- backdrop: rarity glow (legendary gets rays), thin rarity ring ----
    if (!em) {
      if (it.r >= 4) {
        x.save();
        x.translate(32, 32);
        x.fillStyle = rgba(rc, 0.14);
        for (let i = 0; i < 12; i++) {
          x.rotate(Math.PI / 6);
          x.beginPath();
          x.moveTo(0, 0);
          x.lineTo(-2.4, -31);
          x.lineTo(2.4, -31);
          x.fill();
        }
        x.restore();
      }
      x.fillStyle = rad(32, 30, 1, 32, 32, 31, [rgba(rc, 0.4 + it.r * 0.06), rgba(rc, 0.14), rgba(rc, 0)]);
      x.fillRect(0, 0, 64, 64);
      if (it.r >= 1) {
        ln(new Path2D("M61.5 32A29.5 29.5 0 1 1 2.5 32A29.5 29.5 0 1 1 61.5 32Z"), rgba(rc, 0.14 + 0.07 * it.r), 1);
      }
    } else {
      x.fillStyle = grad(x.createRadialGradient(32, 30, 1, 32, 32, 31), ["rgba(90,80,60,.22)", "rgba(0,0,0,0)"]);
      x.fillRect(0, 0, 64, 64);
    }

    const s = it.s;
    if (s === "staff") {
      // curved wooden shaft with grip wraps, gold collar, claw prongs cradling a glowing orb
      const sh = new Path2D("M13 59C20 48 30 34 42 20");
      x.save();
      shadow();
      ln(sh, OL, 7.2);
      x.restore();
      ln(sh, lin(23, 35, 30, 40, [lt(WOOD, 0.35), WOOD, dk(WOOD, 0.5)]), 4.4);
      if (!em) {
        x.save();
        x.translate(-0.9, -0.6);
        ln(sh, "rgba(255,225,180,.4)", 1.1);
        x.restore();
        [
          [17.2, 53.2],
          [19, 50.6],
          [20.8, 48],
        ].forEach(([a, b]) => {
          ln(`M${a - 2.3} ${b - 1.7}L${a + 2.3} ${b + 1.7}`, "#3a2414", 1.6);
          ln(`M${a - 2} ${b - 2}L${a + 1.6} ${b + 0.6}`, "rgba(255,220,170,.25)", 0.6);
        });
      }
      halo(46, 12, 17, ec, 0.6);
      const orb = new Path2D();
      orb.arc(46, 12, 7.6, 0, Math.PI * 2);
      body(orb, rad(43.2, 9.4, 0.6, 46, 12, 8.4, [lt(ec, 0.85), ec, dk(ec, 0.55)]), () => {
        shine(43.4, 9.6, 2.4, 1.5, 0.85);
        x.fillStyle = "rgba(255,255,255,.35)";
        x.beginPath();
        x.arc(49, 15.4, 1, 0, 7);
        x.fill();
      }, 1.8);
      const pr = "M40.5 22C35 19 34.5 11 39.5 5.5M43.5 22.5C51 23 55 15.5 52.5 7.5";
      ln(pr, OL, 4);
      ln(pr, lin(36, 6, 54, 22, [lt(GOLD, 0.5), GOLD, dk(GOLD, 0.4)]), 2.1);
      ln("M38.6 19.2L44.6 23.4", OL, 5);
      ln("M38.6 19.2L44.6 23.4", lin(38, 19, 45, 24, [lt(GOLD, 0.5), GOLD, dk(GOLD, 0.35)]), 2.8);
      if (!em) star(55.5, 4.5, 2.4, ec);
    } else if (s === "hat") {
      // wide brim + bent-tip cone, element band with gold buckle, crease and a little star
      const hc = em ? E : mix("#3a3a8a", ec, 0.15);
      const brim = new Path2D();
      brim.ellipse(32, 49.5, 24.5, 7.2, 0, 0, Math.PI * 2);
      body(brim, lin(0, 42, 0, 57, [lt(hc, 0.15), dk(hc, 0.3), dk(hc, 0.6)]), () => {
        ln("M11 49C20 45 44 45 53 49", "rgba(0,0,0,.35)", 1.4);
      });
      const cone = "M17 47C20 35 24 23 30 14C34 7.5 40 5 46.5 8C42.5 9.5 39.5 12.5 38.5 16.5C41 27 44 37 47 47C38 50 26 50 17 47Z";
      body(cone, lin(16, 0, 48, 0, [lt(hc, 0.3), hc, dk(hc, 0.5)]), () => {
        ln("M33 18C35 28 37 37 38.5 46", "rgba(0,0,0,.28)", 1.3);
        ln("M26 26C24.5 32 23.5 38 22.5 45", "rgba(255,255,255,.12)", 1.2);
        const band = new Path2D("M16 45C26 48.5 38 48.5 48 45L46 38.5C37 41.5 27 41.5 18 38.5Z");
        x.fillStyle = lin(0, 38, 0, 48, [lt(ec, 0.35), ec, dk(ec, 0.45)]);
        x.fill(band);
        ln("M18 38.6C27 41.6 37 41.6 46 38.6", "rgba(0,0,0,.45)", 0.9);
        ln("M16.5 45.2C26 48.6 38 48.6 47.5 45.2", "rgba(0,0,0,.45)", 0.9);
        x.fillStyle = lt(ec, 0.6);
        x.save();
        x.translate(29.5, 25);
        x.fill(P2("M0 -3Q.5 -.5 3 0Q.5 .5 0 3Q-.5 .5 -3 0Q-.5 -.5 0 -3Z"));
        x.restore();
      });
      if (!em) {
        const bk = new Path2D("M29 40.6h6.2v6.4h-6.2Z");
        ln(bk, OL, 2.6);
        ln(bk, lin(29, 40, 35, 47, [lt(GOLD, 0.55), GOLD, dk(GOLD, 0.35)]), 1.4);
      }
    } else if (s === "robe") {
      // flowing robe with sleeves, V collar, front trim, belt and buckle, element hem and cuffs, folds
      const rb = em ? E : mix("#5a3a8a", ec, 0.12);
      const robe =
        "M24 9C28 11 36 11 40 9L48 14C53 17 57 24 58 30L50 33C49 31 48 30 47 29L48.5 56C40 59.5 24 59.5 15.5 56L17 29" +
        "C16 30 15 31 14 33L6 30C7 24 11 17 16 14Z";
      body(robe, lin(8, 0, 56, 0, [lt(rb, 0.25), rb, dk(rb, 0.55)]), () => {
        ln("M23 38C22 46 21.5 52 21 58M41 38C42 46 42.5 52 43 58M27 36C27 44 26.5 50 26 58", "rgba(0,0,0,.28)", 1.2);
        x.fillStyle = lin(0, 52, 0, 60, [lt(ec, 0.3), ec, dk(ec, 0.45)]);
        x.fill(P2("M8 51.5C24 56 40 56 56 51.5L56 62L8 62Z"));
        ln("M8 51.5C24 56 40 56 56 51.5", "rgba(0,0,0,.4)", 0.9);
        ln("M32 12L32 58", dk(rb, 0.5), 4.4);
        ln("M32 12L32 58", lin(30, 0, 34, 0, [lt(ec, 0.4), ec, dk(ec, 0.3)]), 2.4);
        ln("M23.5 8.5L32 20.5L40.5 8.5", dk(rb, 0.55), 4);
        ln("M23.5 8.5L32 20.5L40.5 8.5", lin(24, 8, 40, 20, [lt(ec, 0.4), ec, dk(ec, 0.3)]), 2.2);
        ln("M6 30L14 33M50 33L58 30", lin(0, 28, 0, 34, [lt(ec, 0.4), dk(ec, 0.3)]), 3);
        ln("M16 33.5C25 36 39 36 48 33.5", "#2a1a10", 4);
        ln("M16 32.7C25 35.2 39 35.2 48 32.7", "rgba(255,220,170,.22)", 0.8);
      });
      if (!em) {
        const bk = new Path2D("M29.4 32.4h5.2v5h-5.2Z");
        ln(bk, OL, 2.4);
        ln(bk, lin(29, 32, 35, 38, [lt(GOLD, 0.55), GOLD, dk(GOLD, 0.35)]), 1.3);
      }
    } else if (s === "charm") {
      // beaded chain, bail, gold teardrop setting with a faceted gem
      const ch = new Path2D("M14 4C16.5 17 24.5 24.5 32 25.5C39.5 24.5 47.5 17 50 4");
      ln(ch, "rgba(0,0,0,.6)", 1.2);
      ln(ch, OL, 3.4, [0.01, 3]);
      ln(ch, em ? E : lt(GOLD, 0.25), 2.1, [0.01, 3]);
      if (!em) ln(ch, "rgba(255,255,255,.55)", 0.7, [0.01, 3]);
      const bail = new Path2D();
      bail.arc(32, 27.2, 2.6, 0, Math.PI * 2);
      ln(bail, OL, 3);
      ln(bail, em ? E : GOLD, 1.5);
      halo(32, 46, 20, ec, 0.45);
      const set = "M32 29C40 34 47.5 41 47.5 46.5C47.5 54.5 40.5 59.5 32 59.5C23.5 59.5 16.5 54.5 16.5 46.5C16.5 41 24 34 32 29Z";
      body(set, lin(17, 30, 47, 59, [lt(GOLD, 0.5), GOLD, dk(GOLD, 0.5)]), () => {
        x.fillStyle = "rgba(255,240,200,.55)";
        [
          [32, 32.2],
          [44.6, 46.5],
          [32, 57.2],
          [19.4, 46.5],
        ].forEach(([a, b]) => {
          x.beginPath();
          x.arc(a, b, 0.9, 0, 7);
          x.fill();
        });
      });
      gem(
        "M32 34.5C38 38.5 42.5 43 42.5 46.8C42.5 52 38 55 32 55C26 55 21.5 52 21.5 46.8C21.5 43 26 38.5 32 34.5Z",
        32,
        46,
        9,
        "M32 34.5L28 45L32 55L36 45ZM21.5 46.8L28 45M42.5 46.8L36 45M28 45L36 45",
      );
    } else if (s === "ring") {
      // metallic band (seen at an angle), claw setting, brilliant-cut gem
      const band = new Path2D();
      band.ellipse(32, 43, 17.5, 14, 0, 0, Math.PI * 2);
      band.ellipse(32, 44, 11.5, 8.5, 0, 0, Math.PI * 2);
      body(
        band,
        lin(14, 30, 50, 58, [lt("#e8c060", 0.6), "#e8c060", dk("#e8c060", 0.35), lt("#e8c060", 0.25), dk("#e8c060", 0.55)]),
        () => {
          x.fillStyle = "rgba(0,0,0,.3)";
          x.beginPath();
          x.ellipse(32, 41.5, 12.5, 8.5, 0, Math.PI, Math.PI * 2);
          x.fill();
          shine(21, 37, 2.2, 1.1, 0.7);
        },
        2,
        "evenodd",
      );
      body("M25 31L39 31L36.5 24.5L27.5 24.5Z", lin(25, 24, 39, 31, [lt(GOLD, 0.5), GOLD, dk(GOLD, 0.45)]), null, 1.6);
      halo(32, 19, 15, ec, 0.6);
      gem(
        "M23.5 18L28 11.5L36 11.5L40.5 18L32 28.5Z",
        32,
        18,
        9,
        "M23.5 18L40.5 18M28 11.5L30 18L32 11.5L34 18L36 11.5M30 18L32 28.5L34 18",
      );
      if (!em) star(44, 10, 2.6, ec);
    } else if (s === "boots") {
      // leather boot with curled toe and bell, element-tinted cuff with stitching, buckled straps, dark sole
      const lb = "#6a4a2a",
        cf = em ? E : mix(lb, ec, 0.55);
      body("M15 53L56.5 53C58.5 53 59.5 55 58.5 57.5L15 57.5C13.8 57.5 13.8 53 15 53Z", lin(0, 53, 0, 58, ["#3a2616", "#1a0e06"]), null, 1.8);
      body(
        "M18 9L36.5 9C36.5 19 36.5 28 37.5 36C45.5 38 53.5 40.5 57.5 45.5C59.5 48.5 58.5 53 55.5 54L16.5 54C15.5 46 16.5 38 17.5 30Z",
        lin(14, 10, 52, 56, [lt(lb, 0.25), lb, dk(lb, 0.5)]),
        () => {
          ln("M40 41C44 43 47 46 48 50.5", "rgba(0,0,0,.3)", 1.3);
          ln("M18 25.5L37 25.5M18 31.5L37.2 31.5", "#2a1a10", 2.4);
          ln("M18 24.7L37 24.7M18 30.7L37.2 30.7", "rgba(255,220,170,.2)", 0.6);
          ln("M18 51L55 51", "rgba(255,230,190,.35)", 0.7, [1.2, 1.4]);
        },
      );
      if (!em)
        [
          [29, 25.5],
          [29, 31.5],
        ].forEach(([a, b]) => {
          const bk = new Path2D(`M${a - 2} ${b - 2}h4v4h-4Z`);
          ln(bk, OL, 2.2);
          ln(bk, lin(a - 2, b - 2, a + 2, b + 2, [lt(GOLD, 0.55), GOLD, dk(GOLD, 0.35)]), 1.1);
        });
      body("M16 7.5L38.5 7.5L39 17.5C31.5 19.5 23 19.5 15.5 17.5Z", lin(15, 7, 39, 19, [lt(cf, 0.35), cf, dk(cf, 0.45)]), () => {
        ln("M17 14.8C24 16.4 31 16.4 37.5 14.8", "rgba(255,240,200,.55)", 0.7, [1.3, 1.3]);
      });
      const curl = "M57 45.5C61 43.5 62 39.5 59.5 37";
      ln(curl, OL, 4);
      ln(curl, em ? E : dk(lb, 0.1), 2.2);
      halo(59, 36, 6, ec, 0.6);
      const bell = new Path2D();
      bell.arc(59, 36, 2.3, 0, Math.PI * 2);
      body(bell, rad(58.2, 35.2, 0.3, 59, 36, 2.6, [lt(GOLD, 0.7), GOLD, dk(GOLD, 0.4)]), null, 1.3);
    } else if (s === "deck") {
      // (for a deck slot, if one exists) three fanned card backs with element borders and a rune
      const card = (ang) => {
        x.save();
        x.translate(32, 54);
        x.rotate(ang);
        const p = new Path2D(),
          w = 22,
          h = 32,
          r = 3,
          x0 = -w / 2,
          y0 = -h - 4;
        p.moveTo(x0 + r, y0);
        p.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
        p.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
        p.arcTo(x0, y0 + h, x0, y0, r);
        p.arcTo(x0, y0, x0 + w, y0, r);
        p.closePath();
        body(p, lin(x0, y0, x0 + w, y0 + h, ["#4a3a7a", "#2a1f4a", "#170f2a"]), () => {
          const b = new Path2D();
          b.moveTo(x0 + 2.6, y0 + 2.6);
          b.lineTo(x0 + w - 2.6, y0 + 2.6);
          b.lineTo(x0 + w - 2.6, y0 + h - 2.6);
          b.lineTo(x0 + 2.6, y0 + h - 2.6);
          b.closePath();
          ln(b, ec, 1.1);
          x.save();
          x.translate(0, y0 + h / 2);
          x.fillStyle = lt(ec, 0.4);
          x.fill(P2("M0 -6Q1 -1 5 0Q1 1 0 6Q-1 1 -5 0Q-1 -1 0 -6Z"));
          x.restore();
        });
        x.restore();
      };
      card(-0.32);
      card(0.32);
      card(0);
    } else return null;

    if (!em && it.r >= 3) {
      star(9.5, 11, 3.6, rc);
      star(55, 55, 3.2, rc);
      star(8, 51, 2.4, rc);
      if (it.r >= 4) star(56, 22, 2.2, rc);
    }
    return c.toDataURL();
  }

  gIcon = function (it) {
    if (it && it.s === "deck") return old(it); // deck items keep their own icon (30-cards-deck.js)
    const key = it.s + "|" + it.r + "|" + (it.el || "");
    if (cache[key]) return cache[key];
    let u = null;
    try {
      u = draw(it);
    } catch (e) {
      console.warn("gear icon", e);
    }
    return (cache[key] = u || old(it));
  };
})();
