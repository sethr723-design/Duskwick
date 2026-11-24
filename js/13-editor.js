// DUSKWICK - 13-editor.js: Dev world editor (F2 with developer mode on).
// Loaded in order by index.html as plain scripts; they share one global scope.
// v36: categorized palette with thumbnails, detailed kit pieces (window.__edKit, 03-world.js), an Enemies menu and a
// Patrol tool. Editor objects (and their foes) are built at DOMContentLoaded, after every script has run, so editor
// foes always sit at the END of `foes` and world foe indices never move. Patrol overrides for world foes are saved in
// "duskwick_build_v1_paths" keyed by foe index (with the foe's kind and home as a check); editor foes keep theirs in o.p.
(() => {
  /* DUSKWICK WORLD EDITOR (dev). F2 toggles it (Developer mode must be on). Builds are saved in this browser. */
  const KEY = "duskwick_build_v1",
    PKEY = KEY + "_paths",
    ST = 0.5,
    W0 = "#ffffff";
  const GEO = {
    box: new T.BoxGeometry(1, 1, 1),
    cyl: new T.CylinderGeometry(0.5, 0.5, 1, 14),
    cone: new T.ConeGeometry(0.5, 1, 10),
    sph: new T.SphereGeometry(0.5, 14, 10),
    disc: new T.CylinderGeometry(0.5, 0.5, 1, 40),
  };
  const r2 = (v) => Math.round(v * 1000) / 1000, // v46b: to 0.001 (was 0.01) for fine moves
    cp = (a) => JSON.parse(JSON.stringify(a));

  /* ---------- v46: saves kept in the game files (js/world-edits.js) ---------- */
  // The browser copy (localStorage) is what the editor reads and writes while you work. js/world-edits.js (loaded just
  // before this file) holds the same four saves plus a time stamp; whichever is newer wins at load, so the game files
  // bring the edits back after browser data is cleared or on another computer. "Save to game" writes that file.
  const TKEY = KEY + "_t",
    SKEYS = {
      list: KEY,
      paths: KEY + "_paths",
      world: KEY + "_world",
      lib: KEY + "_lib",
      roads: KEY + "_roads",
      solids: KEY + "_solids",
    },
    FS = { h: null, ok: 0, dirty: 0, tm: 0, busy: 0 };
  try {
    const F = window.DW_EDITS,
      t0 = +localStorage.getItem(TKEY) || 0;
    if (F && +F.t > t0) {
      for (const n in SKEYS) if (F[n] != null) localStorage.setItem(SKEYS[n], JSON.stringify(F[n]));
      localStorage.setItem(TKEY, String(F.t));
      console.log("editor: world edits loaded from js/world-edits.js");
    }
    FS.dirty = (+localStorage.getItem(TKEY) || 0) > ((F && +F.t) || 0) ? 1 : 0;
  } catch (e) {
    console.warn("editor: world-edits.js", e);
  }
  // write one save; only a real change stamps the time and marks the game file out of date
  const lsPut = (k, v) => {
    try {
      const s = JSON.stringify(v);
      if (localStorage.getItem(k) === s) return;
      localStorage.setItem(k, s);
      localStorage.setItem(TKEY, String(Date.now()));
      FS.dirty = 1;
      if (FS.ok) {
        clearTimeout(FS.tm);
        FS.tm = setTimeout(() => fsWrite(0), 1200);
      }
    } catch (e) {}
  };
  const fsText = () => {
    const d = { t: +localStorage.getItem(TKEY) || Date.now() };
    for (const n in SKEYS)
      try {
        d[n] = JSON.parse(localStorage.getItem(SKEYS[n]) || "null");
      } catch (e) {
        d[n] = null;
      }
    return (
      "// DUSKWICK - world-edits.js: saves from the dev world editor (13-editor.js), written by its Save to game button.\n" +
      "// Loaded just before 13-editor.js. Whichever is newer, this file or the browser's own copy, is used at load.\n" +
      "window.DW_EDITS = " +
      JSON.stringify(d) +
      ";\n"
    );
  };
  // the file handle is remembered in IndexedDB, so later sessions only need one permission click
  const idb = (mode, fn) =>
    new Promise((ok, no) => {
      const r = indexedDB.open("duskwick_editor", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onerror = () => no(r.error);
      r.onsuccess = () => {
        const q = fn(r.result.transaction("kv", mode).objectStore("kv"));
        q.onsuccess = () => ok(q.result);
        q.onerror = () => no(q.error);
      };
    });
  const fsDownload = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([fsText()], { type: "text/javascript" }));
    a.download = "world-edits.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Downloaded world-edits.js: put it in the game's js folder (replace the old one)", "#ffd27a");
  };
  // ask = 1 from the button (a click may open the file picker / permission prompt); 0 = quiet auto-save
  const fsWrite = async (ask) => {
    if (FS.busy) return;
    FS.busy = 1;
    try {
      if (!FS.h && window.showSaveFilePicker)
        FS.h = (await idb("readonly", (s) => s.get("file")).catch(() => null)) || null;
      if (FS.h) {
        const o = { mode: "readwrite" };
        let p = await FS.h.queryPermission(o);
        if (p !== "granted" && ask) p = await FS.h.requestPermission(o);
        if (p !== "granted") {
          FS.ok = 0;
          if (!ask) return;
          FS.h = null;
        }
      }
      if (!FS.h) {
        if (!ask) return;
        if (!window.showSaveFilePicker) return fsDownload();
        toast("Pick the game's js folder and save as world-edits.js (replace it)", "#ffd27a");
        FS.h = await window.showSaveFilePicker({
          suggestedName: "world-edits.js",
          types: [{ description: "JavaScript", accept: { "text/javascript": [".js"] } }],
        });
        await idb("readwrite", (s) => s.put(FS.h, "file")).catch(() => 0);
      }
      const w = await FS.h.createWritable();
      await w.write(fsText());
      await w.close();
      FS.ok = 1;
      FS.dirty = 0;
      if (ask)
        toast("Saved to " + FS.h.name + " - edits now load from the game files (auto-saves while open)", "#9fe8d0");
    } catch (e) {
      if (e && e.name === "AbortError") toast("Not saved to the game files", "#ff8a8a");
      else {
        console.warn("editor save to file", e);
        if (ask) fsDownload();
      }
    } finally {
      FS.busy = 0;
      if (ed.on) ui();
    }
  };

  /* ---------- palette ---------- */
  const kit = (kt, ka, rad, more) =>
    Object.assign({ g: "kit", kt, ka: ka || {}, s: [1, 1, 1], c: W0, sl: rad ? 1 : 0, rad: rad || 0 }, more);
  const path = (tx, s, g) => ({ g: g || "path", tx, s, c: W0, wk: 1 });
  const foeP = (k, t, big, bs) => ({ g: "foe", f: [k, t, big], s: [1, 1, 1], c: W0, el: "r", bs: bs ? 1 : 0 });
  const LMS = [
    ["den", "Wolf den"],
    ["lake", "Frozen pond"],
    ["stones", "Rune stones"],
    ["camp", "Sled camp"],
    ["crater", "Volcano"],
    ["gate", "Obsidian gate"],
    ["forge", "Forge pyramid"],
    ["witch", "Witch hut"],
    ["chapel", "Sunken chapel"],
    ["shrine", "Orb pavilion"],
    ["lantern", "Lantern tree"],
  ];
  const CATS = [
    ["Buildings", "Buildings"],
    ["Roads", "Roads & paths"],
    ["Props", "Props"],
    ["Nature", "Nature"],
    ["Lamps", "Lamps & lights"],
    ["Landmarks", "Landmarks"],
    ["Enemies", "Enemies"],
    ["Grabs", "My grabs"],
    ["World", "World objects"], // v46b: one of every kind of object already in the world (built on first open)
  ];
  const PAL = [
    ["Buildings", "House", kit("house", { i: 0 }, 5.2, { vr: 1 })],
    ["Buildings", "Tall house", kit("house", { i: 1, tall: 1 }, 5.2, { vr: 1 })],
    ["Buildings", "Snowy house", kit("house", { i: 2, snow: 1 }, 5.2, { vr: 1 })],
    ["Buildings", "Plain cottage", kit("house", { i: 3, plain: 1 }, 5.2, { vr: 1 })],
    ["Buildings", "Sign house", kit("house", { i: 4, t: "BAKERY" }, 5.2, { vr: 1, txt: 1 })],
    ["Buildings", "Shop front", kit("shop", { i: 0, t: "SHOP" }, 7.5, { vr: 1, txt: 1 })],
    ["Buildings", "Tent", kit("tent", { i: 0, t: "TENT" }, 2.2, { vr: 1, txt: 1 })],
    ["Buildings", "Shrine", kit("shrine", { i: 0 }, 0.9, { vr: 1 })],
    ["Buildings", "Box", { g: "box", s: [4, 3, 4], c: "#8a849c" }],
    ["Buildings", "Wall", { g: "box", s: [6, 3, 0.6], c: "#7a7494" }],
    ["Buildings", "Slab", { g: "box", s: [6, 0.3, 6], c: "#6a6070" }],
    ["Buildings", "Pillar", { g: "cyl", s: [0.8, 5, 0.8], c: "#8a849c" }],
    ["Roads", "Dirt path", path("dirt", [4, 0.06, 8])],
    ["Roads", "Cobble street", path("cobble", [6, 0.06, 8])],
    ["Roads", "Flagstones", path("flag", [3, 0.06, 6])],
    ["Roads", "Grass patch", path("grass", [6, 0.06, 6])],
    ["Roads", "Round plaza", path("cobble", [12, 0.06, 12], "plaza")],
    ["Roads", "Plain path", { g: "box", s: [4, 0.06, 4], c: "#6b5a48", wk: 1 }],
    // v46c: invisible pieces (drawn only while Walls is on): a wall that blocks, a floor you can walk on
    ["Roads", "Invisible wall", { g: "wall", s: [8, 3, 0.8], c: "#ff4a4a" }],
    ["Roads", "Invisible wall path", { g: "wline", s: [1, 3, 0.8], c: "#ff4a4a" }], // v46c: winding, Road-tool markers
    ["Roads", "Invisible floor", { g: "floor", s: [8, 0.06, 8], c: "#4aff8a", wk: 1 }],
    ["Roads", "Invisible teleporter", { g: "tport", s: [4, 0.2, 4], c: "#c08aff" }], // v46
    ["Props", "Barrel", kit("barrel", {}, 0.5)],
    ["Props", "Crate", kit("crate", {}, 0.55)],
    ["Props", "Crate stack", kit("crates", {}, 1)],
    ["Props", "Bench", kit("bench", {}, 0.9)],
    ["Props", "Planter", kit("planter", {}, 0.7)],
    ["Props", "Fence", kit("fence", {})],
    ["Props", "Signpost", kit("signpost", { t: "THIS WAY" }, 0.35, { txt: 1 })],
    ["Props", "Sign board", kit("sign", { t: "WELCOME" }, 0, { txt: 1 })],
    ["Props", "Market stall", kit("stall", { i: 0, t: "WARES" }, 1.5, { vr: 1, txt: 1 })],
    ["Props", "Bunting", kit("bunting", {})],
    ["Props", "Ball", { g: "sph", s: [2, 2, 2], c: "#c8442f" }],
    ["Nature", "Tree", kit("tree", {}, 0.9)],
    ["Nature", "Big tree", kit("tree", { b: 1.6 }, 1.4)],
    ["Nature", "Pine", kit("pine", {}, 0.7)],
    ["Nature", "Snowy pine", kit("pine", { snow: 1 }, 0.7)],
    ["Nature", "Burnt spire", kit("spire", {}, 0.9)],
    ["Nature", "Dead tree", kit("dead", {}, 0.5)],
    ["Nature", "Swamp trunk", kit("trunk", {}, 0.5)],
    ["Nature", "Rock", kit("rock", {}, 0.6)],
    ["Nature", "Boulder", kit("rock", { b: 3 }, 2)],
    ["Nature", "Bush", kit("bush", {})],
    ["Nature", "Mushrooms", kit("shroom", {})],
    ["Nature", "Flowers", kit("flowers", {})],
    ["Nature", "Cone tree", { g: "cone", s: [3, 6, 3], c: "#2f5a3a" }],
    ["Lamps", "Lamp post", kit("lamp", {}, 0.4)],
    ["Lamps", "Twin lamp", kit("lamp2", {}, 0.4)],
    ["Lamps", "Hanging lantern", kit("lantern", {}, 0.4)],
    ["Lamps", "Torch", kit("torch", {}, 0.3)],
    ["Lamps", "Brazier", kit("brazier", {}, 0.7)],
    ["Lamps", "Glow", { g: "glow", s: [6, 6, 6], c: "#ffd27a" }],
    ["Landmarks", "Stone arch", kit("arch", { i: 0 }, 0, { vr: 1, sl: 1 })],
    ["Landmarks", "Zone gate", kit("gate", { i: 0, t: "GATE" }, 0, { vr: 1, txt: 1, sl: 1 })],
    ["Landmarks", "Fountain", kit("fountain", {}, 3.1)],
    ...LMS.map(([lm, n]) => ["Landmarks", n, kit("land", { lm })]),
    ["Enemies", "Wolf", foeP("wolf", 3, 0)],
    ["Enemies", "Big wolf", foeP("wolf", 4, 1)],
    ["Enemies", "Hound", foeP("hound", 3, 0)],
    ["Enemies", "Big hound", foeP("hound", 4, 1)],
    ["Enemies", "Gloomling", foeP("gloom", 3, 0)],
    ["Enemies", "Gloom boss", foeP("gloom", 5, 1, 1)],
    ["Enemies", "Gnome", foeP("gnome", 2, 0)],
    ["Enemies", "Frost Golem", foeP("fgolem", 3, 0)],
    ["Enemies", "Lava Golem", foeP("lgolem", 4, 0)],
    ["Enemies", "Phoenix", foeP("phoenix", 4, 0)],
    ["Enemies", "Bog Gloomling", foeP("bogl", 1, 0)],
    ["Enemies", "Mire Skeleton", foeP("skel", 2, 0)],
    ["Enemies", "Bog Monster", foeP("bogm", 3, 0)],
    ["Enemies", "Will-o'-Wisp", foeP("mwisp", 2, 0)],
  ];
  const FOEK = [
    ["wolf", "Wolf"],
    ["hound", "Hound"],
    ["gloom", "Gloomling"],
    ["gnome", "Gnome"],
    ["fgolem", "Frost Golem"],
    ["lgolem", "Lava Golem"],
    ["phoenix", "Corrupted Phoenix"],
    ["bogl", "Bog Gloomling"],
    ["skel", "Mire Skeleton"],
    ["bogm", "Bog Monster"],
    ["mwisp", "Will-o'-Wisp"],
  ];
  // names the battle shows for kinds that carry f.nm in the world (27-newfoes, 33-roads)
  const FOEN = {
    gnome: "Gloom Gnome",
    fgolem: "Frost Golem",
    lgolem: "Lava Golem",
    phoenix: "Corrupted Phoenix",
    bogl: "Bog Gloomling",
    skel: "Mire Skeleton",
    bogm: "Bog Monster",
    mwisp: "Will-o'-Wisp",
  };
  const ELITE = [
    ["r", "Random"],
    ["", "Never"],
    ["armored", "Armored"],
    ["vampiric", "Vampiric"],
    ["frenzied", "Frenzied"],
  ];
  // v36: a fixed elite choice on an editor foe survives respawns (11-explore re-rolls through rollElite)
  {
    const re0 = rollElite;
    rollElite = (f) => {
      if (f && f.edEl !== undefined) {
        f.elite = f.boss ? null : f.edEl || null;
        if (f.au) f.au.visible = !!f.elite;
        return;
      }
      re0(f);
    };
  }

  /* ---------- kit pieces ---------- */
  // capture: run a world builder (they add to S and push solids, camera blockers, houses...) and keep only the pieces,
  // in a group of our own. Side effects are rolled back, the seeded rnd too, and lights are dropped (lightPool rule).
  const cap = (fn) => {
    const g = new T.Group(),
      sd = SEED,
      arr = [solids, CB, HOUSES, SMK, PT, NPCS, SAFEC, TREES, PINES, SPIRES, OCC],
      ln = arr.map((a) => a.length),
      own = Object.prototype.hasOwnProperty.call(S, "add") ? S.add : null;
    S.add = (...a) => (a.forEach((o) => g.add(o)), S);
    try {
      fn(window.__edKit || {});
    } catch (e) {
      console.warn("editor kit", e);
    } finally {
      if (own) S.add = own;
      else delete S.add;
      SEED = sd;
      arr.forEach((a, i) => (a.length = ln[i]));
    }
    const L = [];
    g.traverse((o) => o.isLight && L.push(o));
    L.forEach((o) => o.parent.remove(o));
    return g;
  };
  const GC = {},
    geo = (k, f) => GC[k] || (GC[k] = f()),
    put = (g, gm, c, x, y, z, rx, ry, rz, u) => {
      const m = mk(gm, c, x, y, z, u);
      m.rotation.set(rx || 0, ry || 0, rz || 0);
      g.add(m);
      return m;
    },
    emit = (g, gm, c, e, x, y, z) => {
      const m = put(g, gm, c, x, y, z, 0, 0, 0, 1);
      m.material.emissive.setHex(e);
      return m;
    },
    glow = (g, x, y, z, s, col) => {
      const sp = new T.Sprite(AM(GLT));
      sp.scale.setScalar(s);
      sp.position.set(x, y, z);
      if (col != null) sp.material.color.setHex(col);
      g.add(sp);
      return sp;
    };
  const FLC = [0xff6a8a, 0xffd34d, 0x9a7aff, 0xffffff, 0xff8a3d],
    WALLS = [0xcdb89a, 0x9fb4c8, 0xc79a9a, 0xa9c79a, 0x8a7ab8, 0xe8e0d0],
    ROOFS = [0x7a3a2a, 0x3a4a7a, 0x4a6a3a, 0x6a4a2a, 0x3a2a6a, 0x3a6a5a],
    GEMS = [0x9affc8, 0xffb070, 0x8ad0ff, 0xff7a3d, 0xb58aff, 0xffd34d],
    CLOTH = [0x7a2a5a, 0x2f6aa8, 0xc8442f, 0x3a8a4a, 0xd9a441],
    STALL = ["goods", "potion", "cloth"],
    ZK = ["frost", "ember", "marsh"];
  // builders: kit (detailed world closures through the capture) or own (scenery the world draws instanced)
  const KB = {
    house: (a) =>
      cap((K) =>
        K.house({ i: a.i | 0, tall: !!a.tall, snow: !!a.snow, plain: !!a.plain, sign: a.t || null, solid: 0 }),
      ),
    shop: (a) => cap((K) => K.shopExt(a.t || "SHOP", WALLS[(a.i | 0) % 6], ROOFS[(a.i | 0) % 6])),
    stall: (a) => cap((K) => K.stall(CLOTH[(a.i | 0) % 5], STALL[(a.i | 0) % 3], a.t || "WARES")),
    tent: (a) => cap((K) => K.tent(CLOTH[(a.i | 0) % 5], a.t || "TENT")),
    shrine: (a) => cap((K) => K.shrine(GEMS[(a.i | 0) % 6])),
    arch: (a) => cap((K) => K.arch(GEMS[(a.i | 0) % 6])),
    gate: (a) => cap((K) => K.gateArch && K.gateArch(ZK[(a.i | 0) % 3], a.t || "GATE")),
    land: (a) => cap((K) => K.zsLand && K.zsLand(a.lm)),
    lamp: () => cap((K) => K.lampost()),
    signpost: (a) => cap((K) => K.signpost(a.t || "THIS WAY", a.t2 || null)),
    sign: (a) => cap((K) => K.sign(a.t || "WELCOME", 2.6)),
    barrel: () => cap((K) => K.barrel()),
    crate: () => cap((K) => K.crate()),
    bench: () => cap((K) => K.bench()),
    crates: () => {
      const g = new T.Group(),
        b = geo("cr", () => B(0.8, 0.8, 0.8));
      put(g, b, 0x8a5a2b, -0.45, 0.4, 0, 0, 0.1);
      put(g, b, 0x7a4a2a, 0.45, 0.4, 0.1, 0, 0.35);
      put(g, b, 0x8a5a2b, 0, 1.2, 0.05, 0, 0.7);
      return g;
    },
    planter: () => {
      const g = new T.Group();
      put(
        g,
        geo("pl", () => B(1.4, 0.45, 0.6)),
        0x5a5470,
        0,
        0.22,
        0,
      );
      for (let k = 0; k < 5; k++)
        put(
          g,
          geo("fl", () => Sp(0.13, 6)),
          FLC[k],
          -0.5 + k * 0.25,
          0.55,
          (k % 2) * 0.08 - 0.04,
        ).scale.setScalar(0.7 + (k % 3) * 0.15);
      return g;
    },
    fence: () => {
      const g = new T.Group();
      [-2.2, 0, 2.2].forEach((x) =>
        put(
          g,
          geo("fp", () => Cy(0.06, 0.06, 1.1, 5)),
          0x6b4a2b,
          x,
          0.55,
          0,
        ),
      );
      [0.75, 0.4].forEach((y) =>
        put(
          g,
          geo("fr", () => B(4.4, 0.1, 0.08)),
          0x7a4a2a,
          0,
          y,
          0,
        ),
      );
      return g;
    },
    bunting: () => {
      const g = new T.Group();
      [-4, 4].forEach((x) =>
        put(
          g,
          geo("bp", () => Cy(0.08, 0.1, 4.6, 6)),
          0x2a2438,
          x,
          2.3,
          0,
        ),
      );
      for (let i = 0; i <= 9; i++) {
        const k = i / 9;
        put(
          g,
          geo("bf", () => Cn(0.22, 0.45, 3)),
          [0xc8442f, 0x2f6aa8, 0xffd34d, 0x4a8a3a][i % 4],
          -4 + 8 * k,
          4.3 - Math.sin(k * 3.14) * 0.5,
          0,
          Math.PI,
        );
      }
      return g;
    },
    tree: (a) => {
      const g = new T.Group(),
        s = a.b || 1;
      put(
        g,
        geo("tt", () => Cy(0.2, 0.3, 1.2, 10)),
        0x6b4a2b,
        0,
        0.6 * s,
        0,
      ).scale.setScalar(s);
      put(
        g,
        geo("t2", () => GEOX.fir(1.1, 2.6)),
        0x2d6b45,
        0,
        2.2 * s,
        0,
        0,
        0.4,
      ).scale.setScalar(s);
      put(
        g,
        geo("t3", () => GEOX.fir(0.8, 2)),
        0x347a50,
        0,
        3.4 * s,
        0,
        0,
        0.9,
      ).scale.setScalar(s);
      return g;
    },
    pine: (a) => {
      const g = new T.Group(),
        sn = !!a.snow;
      put(
        g,
        geo("tt", () => Cy(0.2, 0.3, 1.2, 10)),
        0x6b4a2b,
        0,
        0.6,
        0,
      );
      put(
        g,
        geo("p1", () => GEOX.fir(1.3, 2.4)),
        sn ? 0x6a8a8a : 0x2f5f4f,
        0,
        2.2,
        0,
      );
      put(
        g,
        geo("p2", () => GEOX.fir(0.95, 1.8)),
        sn ? 0x9aaac6 : 0x2f5f4f,
        0,
        3.5,
        0,
        0,
        0.5,
      );
      put(
        g,
        geo("p3", () => GEOX.fir(0.55, 1.2)),
        sn ? 0xf2f6ff : 0x9aaac6,
        0,
        4.7,
        0,
      );
      return g;
    },
    spire: () => {
      const g = new T.Group();
      put(
        g,
        geo("sp", () => Cn(1, 1, 5)),
        0x2a2024,
        0,
        3,
        0,
      ).scale.set(1.6, 6, 1.6);
      return g;
    },
    dead: () => {
      const g = new T.Group();
      put(
        g,
        geo("dt", () => Cy(0.12, 0.3, 4, 6)),
        0x3a2f28,
        0,
        2,
        0,
      );
      [
        [0.5, 2.6, 0.9, 0],
        [-0.45, 3.1, -0.8, 1.2],
        [0.1, 3.5, 0.7, 2.6],
      ].forEach(([x, y, rz, ry]) =>
        put(
          g,
          geo("db", () => Cy(0.04, 0.09, 1.5, 5)),
          0x3a2f28,
          x,
          y,
          0,
          0,
          ry,
          rz,
        ),
      );
      return g;
    },
    trunk: () => {
      const g = new T.Group();
      put(
        g,
        geo("st", () => Cy(0.22, 0.42, 1, 6)),
        0x3a2f28,
        0,
        2.6,
        0,
      ).scale.set(1, 5.2, 1);
      return g;
    },
    rock: (a) => {
      const g = new T.Group(),
        b = a.b || 1;
      put(
        g,
        geo("rk", () => GEOX.rock(0.6)),
        0x6a6382,
        0,
        0.15 * b,
        0,
        0,
        0.7,
      ).scale.setScalar(b);
      return g;
    },
    bush: () => {
      const g = new T.Group();
      put(
        g,
        geo("bu", () => GEOX.bush(0.8)),
        0x2e6a48,
        0,
        0.35,
        0,
      );
      put(
        g,
        geo("bu", () => GEOX.bush(0.8)),
        0x35784f,
        0.5,
        0.25,
        0.3,
        0,
        1,
      ).scale.setScalar(0.6);
      return g;
    },
    shroom: () => {
      const g = new T.Group();
      [
        [0, 0, 1.2],
        [0.45, 0.2, 0.8],
        [-0.3, 0.35, 0.65],
      ].forEach(([x, z, s]) => {
        put(
          g,
          geo("ms", () => Cy(0.07, 0.09, 0.4, 5)),
          0xeae0d0,
          x,
          0.2 * s,
          z,
        ).scale.setScalar(s);
        const c = put(
          g,
          geo("mc", () => new T.SphereGeometry(0.22, 8, 5, 0, 6.283, 0, 1.6)),
          0xd94a6a,
          x,
          0.4 * s,
          z,
          0,
          0,
          0,
          1,
        );
        c.material.emissive.setHex(0x331018);
        c.scale.setScalar(s);
      });
      return g;
    },
    flowers: () => {
      const g = new T.Group();
      for (let k = 0; k < 9; k++) {
        const a = k * 2.4,
          d = 0.2 + (k % 3) * 0.25,
          x = Math.cos(a) * d,
          z = Math.sin(a) * d;
        put(
          g,
          geo("fs", () => Cy(0.015, 0.015, 0.35, 3)),
          0x3a8a4a,
          x,
          0.17,
          z,
        );
        put(
          g,
          geo("fl", () => Sp(0.13, 6)),
          FLC[k % 5],
          x,
          0.38,
          z,
        ).scale.setScalar(0.8);
      }
      return g;
    },
    lamp2: () => {
      const g = new T.Group();
      put(
        g,
        geo("lp", () => Cy(0.08, 0.1, 3.4, 6)),
        0x2a2438,
        0,
        1.7,
        0,
      );
      put(
        g,
        geo("lb", () => B(1.7, 0.08, 0.08)),
        0x2a2438,
        0,
        3.3,
        0,
      );
      [-0.75, 0.75].forEach((x) => {
        put(
          g,
          geo("lc", () => Cy(0.012, 0.012, 0.3, 3)),
          0x2a2438,
          x,
          3.12,
          0,
        );
        emit(
          g,
          geo("lh", () => B(0.28, 0.38, 0.28)),
          0xffe9a0,
          0xcc9944,
          x,
          2.8,
          0,
        );
        glow(g, x, 2.8, 0, 1.9);
      });
      return g;
    },
    lantern: () => {
      const g = new T.Group();
      put(
        g,
        geo("lp2", () => Cy(0.07, 0.09, 3, 6)),
        0x2a2438,
        0,
        1.5,
        0,
      );
      put(
        g,
        geo("la", () => B(1.0, 0.07, 0.07)),
        0x2a2438,
        0.48,
        2.9,
        0,
      );
      put(
        g,
        geo("lc2", () => Cy(0.012, 0.012, 0.4, 3)),
        0x2a2438,
        0.92,
        2.7,
        0,
      );
      emit(
        g,
        geo("lh2", () => B(0.34, 0.44, 0.34)),
        0xffd98a,
        0xd99a2a,
        0.92,
        2.28,
        0,
      );
      put(
        g,
        geo("lt", () => Cn(0.3, 0.22, 4)),
        0x2a2438,
        0.92,
        2.6,
        0,
        0,
        Math.PI / 4,
      );
      glow(g, 0.92, 2.28, 0, 2.2, 0xffd27a);
      return g;
    },
    torch: () => {
      const g = new T.Group();
      put(
        g,
        geo("tp", () => Cy(0.05, 0.08, 1.8, 6)),
        0x6b4a2b,
        0,
        0.9,
        0,
      );
      put(
        g,
        geo("tc", () => Cn(0.15, 0.3, 6)),
        0x3a2010,
        0,
        1.9,
        0,
        Math.PI,
      );
      emit(
        g,
        geo("tf", () => Sp(0.14, 8)),
        0xffb04a,
        0xff7a1a,
        0,
        2.08,
        0,
      ).scale.set(1, 1.5, 1);
      glow(g, 0, 2.1, 0, 1.8, 0xff9a3a);
      return g;
    },
    brazier: () => {
      const g = new T.Group();
      [0, 2.09, 4.19].forEach((a) =>
        put(
          g,
          geo("bl", () => Cy(0.04, 0.05, 0.95, 4)),
          0x2a2438,
          Math.cos(a) * 0.35,
          0.45,
          Math.sin(a) * 0.35,
        ),
      );
      put(
        g,
        geo("bw", () => Cy(0.6, 0.35, 0.4, 10)),
        0x3a3450,
        0,
        0.95,
        0,
      );
      emit(
        g,
        geo("bc", () => Cy(0.52, 0.52, 0.06, 10)),
        0xff7a2a,
        0xff4a0a,
        0,
        1.13,
        0,
      );
      glow(g, 0, 1.4, 0, 2.8, 0xff8a3a);
      return g;
    },
    fountain: () => {
      const g = new T.Group();
      put(
        g,
        geo("f1", () => Lt(FNTP.basin, 48, 60)), // v47: same turned stone as the square's (03 FNTP)
        0x8a849c,
        0,
        0,
        0,
      );
      emit(
        g,
        geo("f2", () => Cy(2.24, 2.24, 0.1, 48)),
        0x4aa8e8,
        0x1a5a99,
        0,
        0.74,
        0,
      );
      put(
        g,
        geo("f3", () => Lt(FNTP.column, 32, 40)),
        0x8a849c,
        0,
        0,
        0,
      );
      put(
        g,
        geo("f4", () => Lt(FNTP.bowl, 32, 60)),
        0x8a849c,
        0,
        2.6,
        0,
      );
      const sp = new T.Sprite(AM(SP.ice || GLT));
      sp.scale.setScalar(3);
      sp.position.y = 3;
      g.add(sp);
      return g;
    },
  };
  // solids for pieces whose middle is open (local x, z, r), otherwise one solid of radius rad at the middle
  const SOLK = {
    arch: [
      [-2.4, 0, 0.6],
      [2.4, 0, 0.6],
    ],
    gate: [
      [-3.5, 0, 1.1],
      [3.5, 0, 1.1],
    ],
  };
  const KC = {},
    kitT = (o) => {
      const k = o.kt + JSON.stringify(o.ka || {});
      if (!KC[k])
        KC[k] = KB[o.kt] ? KB[o.kt](o.ka || {}) : new T.Mesh(GEO.box, new T.MeshBasicMaterial({ color: "#f00" }));
      return KC[k];
    };
  // tint: multiply every material colour of a built piece by c (own copies, kept in userData.tm for disposal)
  const tint = (m, c) => {
    if (!c || c.toLowerCase() === W0) return;
    const tc = new T.Color(c),
      tm = (m.userData.tm = []);
    m.traverse((x) => {
      if (x.material && x.material.color) {
        x.material = x.material.clone();
        x.material.color.multiply(tc);
        tm.push(x.material);
      }
    });
  };
  // ground textures for paths, one per kind and size
  const TXB = {},
    TXC = {},
    pathTx = (k, sx, sz) => {
      const key = k + sx + "x" + sz;
      if (TXC[key]) return TXC[key];
      if (!TXB[k])
        TXB[k] =
          k === "cobble"
            ? cobble(1)
            : k === "grass"
              ? grass(1)
              : tex((x) => {
                  if (k === "flag") {
                    x.fillStyle = "#8a8296";
                    x.fillRect(0, 0, 128, 128);
                    for (let r = 0; r < 4; r++)
                      for (let q = 0; q < 2; q++) {
                        x.fillStyle = ["#b8b0c8", "#aaa2bc", "#c2bad0"][(r + q) % 3];
                        x.fillRect(q * 64 + (r % 2) * 32 + 2, r * 32 + 2, 60, 28);
                      }
                  } else {
                    x.fillStyle = "#6a5240";
                    x.fillRect(0, 0, 128, 128);
                    for (let i = 0; i < 700; i++) {
                      x.fillStyle = ["#5a4434", "#7a6050", "#806a52", "#4e3a2c"][i % 4];
                      x.fillRect(Math.random() * 128, Math.random() * 128, 2 + Math.random() * 2, 2);
                    }
                  }
                }, 1);
      const t = TXB[k].clone();
      t.needsUpdate = true;
      t.repeat.set(Math.max(0.5, sx / 4), Math.max(0.5, sz / 4));
      return (TXC[key] = t);
    };
  // the object for one list entry, at the origin (mk1 places it; thumbnails use it as is)
  const build = (o) => {
    let m;
    if (o.g === "kit") {
      m = new T.Group();
      m.add(kitT(o).clone());
      tint(m, o.c);
      m.scale.set(o.s[0], o.s[1], o.s[2]);
    } else if (o.g === "path" || o.g === "plaza") {
      const mt = new T.MeshLambertMaterial({ map: pathTx(o.tx || "dirt", o.s[0], o.s[2]), color: o.c || W0 });
      mt.polygonOffset = true;
      mt.polygonOffsetFactor = -4;
      mt.polygonOffsetUnits = -8;
      m = new T.Mesh(o.g === "plaza" ? GEO.disc : GEO.box, mt);
      m.scale.set(o.s[0], Math.max(0.02, o.s[1]), o.s[2]);
      m.position.y = Math.max(0.02, o.s[1]) / 2;
      const w = new T.Group();
      w.add(m);
      m = w;
    } else if (o.g === "model" && Array.isArray(o.rl) && o.rl.length > 1 && ribInfo(o.k)) {
      // v46c: a copied road / sidewalk reshaped with the Road tool: its strips laid along its own markers (o.rl,
      // in the object's own frame), same materials, not scaled
      const I = ribInfo(o.k),
        V = mkRd(o.rl.map(([x, z]) => [x - OX, z - OZ])),
        fs = I.f1 - I.f0 || 1;
      m = new T.Group();
      I.ribs.forEach(({ r, mat, ro }) => {
        const g = rdRibbon.geo(
            V,
            (r.o0 - I.sh) * (o.rw || 1), // v46c: o.rw = width set in the Road tool
            (r.o1 - I.sh) * (o.rw || 1),
            r.y,
            r.vs,
            ((r.f0 - I.f0) / fs) * V.L,
            ((r.f1 - I.f0) / fs) * V.L,
          ),
          s = new T.Mesh(g, mat);
        s.renderOrder = ro;
        s.userData.rgeo = 1;
        m.add(s);
      });
    } else if (o.g === "model") {
      m = new T.Group();
      const t = tplOf(o.k);
      if (t) {
        t.position.x = 0;
        t.position.z = 0;
        let cx = 0,
          cz = 0;
        if (o.ctr) {
          // v46 pasted world objects: centred on their footprint (some are built at the origin with offset geometry)
          t.updateMatrixWorld(true);
          const bb = new T.Box3().setFromObject(t);
          if (!bb.isEmpty()) {
            const c = bb.getCenter(new T.Vector3());
            t.position.x -= c.x;
            t.position.z -= c.z;
            cx = c.x;
            cz = c.z;
          }
        }
        // v46: the copied original's collision circles in this piece's frame (rebuild lays them)
        if (t.userData.sol && t.userData.sol.length)
          m.userData.sol = t.userData.sol.map(([x, z, r]) => [x - cx, z - cz, r]);
        m.add(t);
      } else m.add(new T.Mesh(GEO.box, new T.MeshBasicMaterial({ color: "#f00" })));
      m.scale.set(o.s[0], o.s[1], o.s[2]);
    } else if (o.g === "wline") {
      // v46c: an invisible wall along markers (o.rl, the object's own frame, through mkRd like a road): a see-through
      // red curtain o.s[1] high; rebuild() lays its collision circles
      m = new T.Group();
      // (no markers yet = the short line it starts as: menu thumbnail and placing ghost)
      const P = Array.isArray(o.rl)
        ? o.rl
        : [
            [-4, 0],
            [4, 0],
          ];
      if (P.length > 1) {
        const V = mkRd(P),
          h = Math.max(0.5, o.s[1] || 3),
          pos = [],
          idx = [];
        V.p.forEach((q, k) => {
          pos.push(q[0], 0, q[1], q[0], h, q[1]);
          if (k) idx.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k - 1, 2 * k + 1, 2 * k);
        });
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        const s = new T.Mesh(
          g,
          new T.MeshBasicMaterial({
            color: o.c || "#ff4a4a",
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
            side: T.DoubleSide,
          }),
        );
        s.userData.rgeo = 1;
        m.add(s);
      }
    } else if (o.g === "tport") {
      // v46: an invisible teleporter: a see-through violet disc (its trigger circle); mk1 hides it unless the
      // Teleporters view is on. rebuild() registers it in PT (destination o.to = [x, z, facing])
      m = new T.Mesh(
        GEO.cyl,
        new T.MeshBasicMaterial({ color: o.c || "#c08aff", transparent: true, opacity: 0.45, depthWrite: false }),
      );
      m.scale.set(o.s[0], Math.max(0.1, o.s[1]), o.s[2]);
      m.position.y = Math.max(0.1, o.s[1]) / 2;
    } else if (o.g === "wall" || o.g === "floor") {
      // v46c: see-through red (wall) / green (floor) box; mk1 hides it unless Walls is on
      m = new T.Mesh(
        GEO.box,
        new T.MeshBasicMaterial({
          color: o.c || (o.g === "wall" ? "#ff4a4a" : "#4aff8a"),
          transparent: true,
          opacity: o.g === "wall" ? 0.4 : 0.3,
          depthWrite: false,
        }),
      );
      m.scale.set(o.s[0], Math.max(0.04, o.s[1]), o.s[2]);
      m.position.y = Math.max(0.04, o.s[1]) / 2;
    } else if (o.g === "glow") {
      m = new T.Sprite(AM(GLT));
      m.material.color.set(o.c);
      m.scale.set(o.s[0], o.s[0], 1);
      m.position.y = o.s[0] / 2;
    } else {
      m = new T.Mesh(GEO[o.g] || GEO.box, new T.MeshLambertMaterial({ color: o.c }));
      m.scale.set(o.s[0], o.s[1], o.s[2]);
      m.position.y = o.s[1] / 2;
    }
    return m;
  };

  window.__edWalk = (x, z) =>
    ed.list.some((o) => {
      if (!o.wk) return false;
      const c = Math.cos(o.r || 0),
        s = Math.sin(o.r || 0),
        dx = x - o.x,
        dz = z - o.z,
        u = c * dx - s * dz,
        v = s * dx + c * dz;
      if (o.g === "plaza") return (u / (o.s[0] / 2)) ** 2 + (v / (o.s[2] / 2)) ** 2 < 1;
      return Math.abs(u) < o.s[0] / 2 && Math.abs(v) < o.s[2] / 2;
    });
  const BASE = S.children.slice();
  const vis = (o) => {
    for (; o; o = o.parent) if (!o.visible) return false;
    return true;
  };
  // v46: strip lights (untagged lights recompile shaders) and selection outlines from a copied template
  const tplTidy = (w) => {
    const out = [];
    w.traverse((x) => (x.isLight || x.userData.ol) && out.push(x));
    out.forEach((x) => x.parent && x.parent.remove(x));
    return w;
  };
  const TPM = new T.Matrix4();
  // v46c: the road strips inside a copied world piece ("w:" key): their ribbon data, materials, the middle offset of
  // the lot (markers run down it) and the share of the road they covered; null = no road strips in it
  const RIBK = new Map();
  const ribInfo = (k) => {
    if (String(k).slice(0, 2) !== "w:") return null;
    if (RIBK.has(k)) return RIBK.get(k);
    let I = null;
    const t = tplOf(k);
    if (t) {
      const ribs = [];
      t.traverse((x) => x.__rib && x.isMesh && ribs.push({ r: x.__rib, mat: x.material, ro: x.renderOrder }));
      if (ribs.length) {
        const a = Math.min(...ribs.map((q) => q.r.o0)),
          b = Math.max(...ribs.map((q) => q.r.o1));
        I = {
          ribs,
          sh: (a + b) / 2,
          f0: Math.min(...ribs.map((q) => q.r.f0)),
          f1: Math.max(...ribs.map((q) => q.r.f1)),
        };
      }
    }
    // only kept once the world is there (an early miss is tried again)
    if (I || (t && t.children.length)) RIBK.set(k, I);
    return I;
  };
  const tplOf = (k) => {
    // v46: "w:<world edit key>" = a copy (Ctrl+C) of an object that was already in the world, as it stood at load
    // (several keys joined by "|" = one piece made of all of them: a lamp post with its cap and glow, a group)
    if (String(k).slice(0, 2) === "w:") {
      const w = new T.Group();
      String(k)
        .slice(2)
        .split("|")
        .forEach((q) => {
          let e = null;
          try {
            e = wGet(q);
            // v46c: pieces built after the editor's snapshot (64a's trail roads, village pieces...) are only known
            // once registered; register what is there now and look again
            if (!e && WX0.rset) {
              wLate(1);
              e = wGet(q);
            }
          } catch (er) {
            console.warn("editor: copied world object", q, er);
          }
          if (!e) ed.wMiss = (ed.wMiss || 0) + 1; // not built yet: the poll below rebuilds once it is
          if (!e || e.t === "f") return;
          // v46: the original's collision circles go with the copy (template frame = where the original stood at load)
          {
            const SS = new Set(solids),
              L = w.userData.sol || (w.userData.sol = []);
            e.pts.forEach((p) => {
              if (!SS.has(p.s) || p.r == null || p.pt) return;
              let x = p.x,
                z = p.z;
              if (zOn(e)) [x, z] = zW(e.zs, x, z);
              L.push([x, z, p.r]);
            });
          }
          const put = (m, wm) => {
            TPM.copy(wm);
            if (zOn(e)) TPM.premultiply(zT(e.zs));
            TPM.decompose(m.position, m.quaternion, m.scale);
            w.add(m);
          };
          if (e.t === "o") {
            const c = e.o.clone();
            c.visible = true;
            if (e.o.__rib) c.__rib = e.o.__rib; // v46c: a copied road strip can be reshaped (Road tool)
            put(c, e.W0);
          } else e.ms.forEach((s) => put(new T.Mesh(s.m.geometry, s.m.material), s.wo));
        });
      return w.children.length ? tplTidy(w) : null;
    }
    const [a, b] = String(k).split(":").map(Number),
      o = BASE[a];
    if (!o) return null;
    if (!o.isInstancedMesh) return o.clone();
    const g = new T.Group(),
      mt = new T.Matrix4(),
      p0 = new T.Vector3(),
      p = new T.Vector3();
    o.getMatrixAt(b, mt);
    p0.setFromMatrixPosition(mt);
    BASE.forEach((n) => {
      if (!n.isInstancedMesh || n.count <= b) return;
      n.getMatrixAt(b, mt);
      p.setFromMatrixPosition(mt);
      if (Math.abs(p.x - p0.x) + Math.abs(p.z - p0.z) > 0.01) return;
      const m = new T.Mesh(n.geometry, n.material);
      mt.decompose(m.position, m.quaternion, m.scale);
      g.add(m);
    });
    g.position.set(-p0.x, 0, -p0.z);
    const w = new T.Group();
    w.add(g);
    return w;
  };
  const ed = {
    on: 0,
    tool: "place",
    cat: "Buildings",
    pn: "",
    g: "box",
    s: [4, 3, 4],
    c: "#8a849c",
    sl: 0,
    grid: 1,
    list: [],
    meshes: [],
    sref: [],
    foes: [],
    sel: -1,
    hist: [],
    spd: 14,
    fn: 34,
    ff: 96,
    cam: { x: 0, y: 12, z: 0, yaw: 0, pitch: -0.5 },
    pf: null,
    pw: [],
    pp: -1,
    mv: ST, // v46: move step (arrows, gizmo and grid snap)
    rs: 15, // v46: turn step in degrees (R, the turn buttons, ring snap)
    clip: null, // v46: Ctrl+C copy
    mx: -1,
    my: -1,
    rotB: null,
    xs: [], // v46: Shift-click multi-select: editor object indices (then ed.sel is -1; world parts stay in ed.ws)
  };
  const dn = {},
    rc = new T.Raycaster(),
    m2 = new T.Vector2(),
    gp = new T.Plane(new T.Vector3(0, 1, 0), 0),
    v3 = new T.Vector3();
  let lt = 0,
    drag = null,
    pdrag = false;
  let PO = {};
  try {
    PO = JSON.parse(localStorage.getItem(PKEY) || "{}") || {};
  } catch (e) {}
  const psave = () => lsPut(PKEY, PO);

  /* ---------- panel ---------- */
  const pn = document.createElement("div");
  pn.style.cssText =
    "position:fixed;left:10px;top:10px;width:300px;max-height:calc(100vh - 20px);overflow-y:auto;padding:10px;border-radius:12px;background:rgba(18,10,36,.92);color:#eadfff;font:12px/1.4 system-ui,sans-serif;border:1px solid #ffd27a77;z-index:80;display:none;user-select:none;box-sizing:border-box";
  const SEL = "background:#1a1030;color:#eadfff;border:1px solid #ffd27a66;border-radius:6px;font:12px system-ui";
  pn.innerHTML =
    '<b style="color:#ffd27a;font-size:14px">World Editor</b><div id="edi" style="margin:4px 0 6px;color:#9fe8d0"></div>' +
    '<div id="edt" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"></div>' +
    '<div id="edcat" style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px"></div>' +
    '<div id="edp" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-height:236px;overflow-y:auto;margin-bottom:6px"></div>' +
    '<div id="edf" style="display:none;margin:0 0 6px;padding:6px;border:1px solid #ffd27a44;border-radius:8px">' +
    '<div>Kind <select id="efk" style="' +
    SEL +
    '"></select> Tier <select id="eft" style="' +
    SEL +
    '"></select></div><div style="margin-top:4px"><label><input id="efb" type="checkbox"> big</label> ' +
    '<label><input id="efo" type="checkbox"> boss</label> Elite <select id="efe" style="' +
    SEL +
    '"></select></div><div id="efbt" style="margin-top:4px"></div></div>' +
    '<div id="edpt" style="display:none;margin:0 0 6px;padding:6px;border:1px solid #9fe8d066;border-radius:8px">' +
    '<div id="edpi" style="color:#9fe8d0;margin-bottom:4px"></div>' +
    '<div id="edpw" style="margin-bottom:4px;color:#eadfff">Point <b id="edpn">-</b>: <select id="edpc" style="' +
    SEL +
    '"><option value="">walk on</option><option value="t">wait (seconds)</option><option value="n">wait until you come within</option><option value="f">wait until you are farther than</option></select> ' +
    '<input id="edpv" type="number" step="0.5" min="0" style="width:52px" title="Scroll to change"> <span id="edpu"></span></div>' +
    '<div id="edpb" style="display:flex;flex-wrap:wrap;gap:4px"></div></div>' +
    '<div id="edrt" style="display:none;margin:0 0 6px;padding:6px;border:1px solid #8ad0ff66;border-radius:8px">' +
    '<div id="edri" style="color:#8ad0ff;margin-bottom:4px"></div><div id="edrb" style="display:flex;flex-wrap:wrap;gap:4px"></div></div>' +
    '<div id="edsh" style="color:#ffd27a;margin:2px 0 4px"></div>' +
    '<div>Size <input id="edx" type="number" step=".1" style="width:52px"> <input id="edy" type="number" step=".1" style="width:52px"> <input id="edz" type="number" step=".1" style="width:52px"> all <input id="eda" type="number" step=".05" title="Scroll to grow/shrink evenly" style="width:52px"></div>' +
    '<div style="margin:4px 0">Pos <input id="epx" type="number" step=".05" style="width:62px"> <input id="epy" type="number" step=".05" style="width:52px"> <input id="epz" type="number" step=".05" style="width:62px"></div>' +
    '<div style="margin:4px 0">Turn <input id="epr" type="number" step="1" style="width:52px">° &nbsp;Step <select id="emv" style="' +
    SEL +
    '"></select> <select id="ers" style="' +
    SEL +
    '"></select></div>' +
    '<div style="margin:4px 0">Text <input id="edtx" type="text" maxlength="28" style="width:150px"></div>' +
    '<div style="margin:4px 0">Colour <input id="edc" type="color"> <label><input id="edl" type="checkbox"> solid</label></div>' +
    '<div id="eds" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0"></div>' +
    '<div id="edb" style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0"></div>' +
    '<div style="color:#b8a8d8;font-size:11px">F2 exit | WASD fly | Space up | C down | Shift fast | wheel speed<br>Right-drag look | Tab tool | P patrol tool | G grid | B big pieces (ground sheets, map-wide decor) | Ctrl-click again = the next thing underneath<br>Place: pick from the menu, click the ground (the new piece is selected). Shift-click stacks on top. R turns the ghost, Esc puts it away<br>Click a piece to select it, press and drag it to slide it along the ground (Ctrl = no snap), or drag the red/green/blue arrows to move, the ring to turn | arrow keys move | PgUp/PgDn height | R rotate | , . turn 1° | [ ] size | V variant | Del delete | Esc deselect<br>Steps: pick them above (arrows: Shift = 4×, Ctrl = 1/10); hold Ctrl while dragging for no snap<br>Scroll over Size / all / Pos / Turn numbers to change them (Shift = 10×, Ctrl = 1/10)<br>Patrol: click a foe, click ground to add points, drag points, Del removes, Alt-click removes, Esc done; pick a point to set its wait<br>Road (N): click a road / trail / river, drag its points to bend it, click beside it to add one, Alt-click or Del removes, Esc done<br>Shift-click = select several | Ctrl+C copy | Ctrl+V paste at the cursor | Ctrl+D duplicate | Ctrl+Z undo | T put player here<br>Save to menu = keep the selection as a named menu piece (right-click it there to rename/move/delete)<br>Save to game = keep edits in js/world-edits.js</div>';
  document.body.appendChild(pn);
  pn.addEventListener("pointerdown", (e) => e.stopPropagation());
  const q = (id) => pn.querySelector("#" + id),
    BTN =
      "padding:3px 7px;border-radius:7px;border:1px solid #ffd27a88;background:#2a1a4a;color:#ffd27a;cursor:pointer;font:12px system-ui",
    mkb = (t, fn, host) => {
      const b = document.createElement("button");
      b.textContent = t;
      b.style.cssText = BTN;
      b.onclick = fn;
      q(host).appendChild(b);
      return b;
    };
  const sx = q("edx"),
    sy = q("edy"),
    sz = q("edz"),
    sa = q("eda"), // v46b: all three sizes at once
    sc = q("edc"),
    sl = q("edl"),
    stx = q("edtx"),
    inf = q("edi"),
    efk = q("efk"),
    eft = q("eft"),
    efb = q("efb"),
    efo = q("efo"),
    efe = q("efe");
  const opt = (s, list) =>
    list.forEach(([v, t]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      s.appendChild(o);
    });
  opt(efk, FOEK);
  opt(
    eft,
    [1, 2, 3, 4, 5].map((t) => [t, String(t)]),
  );
  opt(efe, ELITE);
  const epx = q("epx"),
    epy = q("epy"),
    epz = q("epz"),
    epr = q("epr"),
    emv = q("emv"),
    ers = q("ers");
  opt(
    emv,
    [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5].map((v) => [v, "move " + v]),
  );
  opt(
    ers,
    [0.1, 0.25, 0.5, 1, 5, 15, 45, 90].map((v) => [v, "turn " + v + "°"]),
  );
  emv.value = String(ST);
  ers.value = "15";
  const LKEY = KEY + "_lib";
  let lib = [];
  try {
    lib = JSON.parse(localStorage.getItem(LKEY) || "[]");
  } catch (e) {}
  const addLib = (k, rad) => {
    if (lib.some((e) => e.k === k)) return;
    lib.push({ k, rad });
    lsPut(LKEY, lib);
    if (ed.cat === "Grabs") showCat("Grabs");
  };

  /* ---------- thumbnails (a small offscreen renderer, made while the palette needs it, then thrown away) ---------- */
  const THB = {},
    TQ = [];
  let TR = null,
    TS = null,
    TC = null,
    tBusy = false;
  // v46b: a saved piece ("Save to menu"): pre = editor records whose x/y/z are round the piece's middle (y from its
  // lowest part), built as one group
  const buildPre = (pre) => {
    const g = new T.Group();
    (pre || []).forEach((o) => {
      let m = null;
      try {
        if (o.g === "foe") m = mkFoe(o.f[0], o.f[1], o.f[2]);
        else m = build(Object.assign({}, o, { s: (o.s || [1, 1, 1]).slice() }));
      } catch (e) {
        console.warn("editor saved piece", e);
      }
      if (!m) return;
      const w = new T.Group();
      w.add(m);
      w.position.set(o.x || 0, o.g === "foe" ? 0 : o.y || 0, o.z || 0);
      w.rotation.y = o.g === "glow" ? 0 : o.r || 0;
      g.add(w);
    });
    return g;
  };
  const thumbRun = () => {
    if (!TQ.length || !ed.on) {
      tBusy = false;
      if (TR) {
        TR.dispose();
        TR.forceContextLoss();
        TR = null;
      }
      return;
    }
    tBusy = true;
    const [key, p, img] = TQ.shift();
    if (THB[key]) img.src = THB[key];
    else
      try {
        if (!TR) {
          TR = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
          TR.setPixelRatio(1);
          TR.setSize(80, 80);
          TR.outputEncoding = R.outputEncoding;
          TS = new T.Scene();
          TS.add(new T.HemisphereLight(0xfff4e0, 0x404058, 0.9));
          const d = new T.DirectionalLight(0xffffff, 0.8);
          d.position.set(3, 6, 5);
          TS.add(d);
          TC = new T.PerspectiveCamera(32, 1, 0.05, 800);
        }
        const o = p.g === "prefab" ? buildPre(p.pre) : build(Object.assign({}, p, { s: p.s.slice() }));
        TS.add(o);
        const bb = new T.Box3().setFromObject(o),
          bs = bb.getSize(new T.Vector3()),
          bc = bb.getCenter(new T.Vector3()),
          r = Math.max(bs.x, bs.y, bs.z, 0.4);
        TC.position.set(bc.x + r * 0.95, bc.y + r * 0.75, bc.z + r * 1.45);
        TC.lookAt(bc);
        TR.render(TS, TC);
        THB[key] = TR.domElement.toDataURL();
        img.src = THB[key];
        TS.remove(o);
      } catch (e) {
        console.warn("editor thumb", key, e);
      }
    setTimeout(thumbRun, 10);
  };

  /* ---------- categories and items ---------- */
  const catBtns = {};
  CATS.forEach(([k, n]) => {
    catBtns[k] = mkb(n, () => showCat(k), "edcat");
    catBtns[k].style.padding = "2px 6px";
    catBtns[k].style.fontSize = "11px";
  });
  // v46c: every kind of enemy / boss standing in the world (road bosses, street-dungeon bosses, the Reach, the tower,
  // Mirewick...), one menu entry per kind (+ one per boss), named as the battle names it. Later files add their foes after
  // this one has loaded, so it is worked out when the menu opens; new kinds join the Kind list too.
  const isBoss = (f) => !!(f.boss || f.rbw || f.dboss || f.d2b || f.rwd != null || f.tw === 3);
  const foeNm = (f) => {
    const sp = Array.isArray(f.bsp) ? f.bsp[0] : f.bsp;
    return f.nm || (sp && sp.nm) || (FOEK.find((k) => k[0] === f.kind) || [0, f.kind])[1];
  };
  const foeKinds = () => {
    if (typeof foes === "undefined") return;
    foes.forEach((f) => {
      if (f.edi != null || !f.kind || FOEK.some((k) => k[0] === f.kind)) return;
      const nm = String(foeNm(f));
      FOEK.push([f.kind, nm]);
      opt(efk, [[f.kind, nm]]);
    });
  };
  const foeMore = () => {
    foeKinds();
    const seen = new Set(PAL.filter((r) => r[0] === "Enemies").map((r) => r[2].f[0] + "|" + (r[2].bs ? 1 : 0))),
      out = [];
    if (typeof foes === "undefined") return out;
    foes.forEach((f) => {
      if (f.edi != null || !f.kind) return;
      const b = isBoss(f),
        k = f.kind + "|" + (b ? 1 : 0);
      if (seen.has(k)) return;
      seen.add(k);
      const nm = String(foeNm(f)),
        p = foeP(f.kind, f.t || 3, f.big ? 1 : 0, b);
      p.nm = nm;
      out.push({ n: (b ? "★ " : "") + nm, key: "Enemies:w:" + k, p });
    });
    return out.sort((a, b) => (a.n[0] === "★") - (b.n[0] === "★") || a.n.localeCompare(b.n));
  };
  const items = (cat) => {
    if (cat === "Enemies")
      return PAL.filter((r) => r[0] === cat)
        .map((r) => ({ n: r[1], key: cat + ":" + r[1], p: r[2] }))
        .concat(foeMore());
    if (cat === "World") {
      const qs = (ed.wq || "").trim().toLowerCase();
      return wCat()
        .filter((c) => !qs || c.n.toLowerCase().includes(qs))
        .map((c) => ({ n: c.n, key: "W" + c.k, p: { g: "model", k: c.k, rad: c.rad, ctr: 1, s: [1, 1, 1], c: W0 } }));
    }
    // v46b: pieces saved with "Save to menu" are listed in their category (after the built-in ones)
    const mine = lib
      .filter((e) => e.pre && e.cat === cat)
      .map((e) => ({
        n: e.n,
        key: "P" + e.id,
        mine: e,
        p: { g: "prefab", pre: e.pre, id: e.id, s: [1, 1, 1], c: W0 },
      }));
    return (
      cat === "Grabs"
        ? lib
            .filter((e) => e.k)
            .map((e, i) => ({
              n: "Model " + (i + 1),
              key: "m" + e.k,
              p: { g: "model", k: e.k, rad: e.rad, s: [1, 1, 1], c: W0 },
            }))
        : PAL.filter((r) => r[0] === cat).map((r) => ({ n: r[1], key: cat + ":" + r[1], p: r[2] }))
    ).concat(mine);
  };
  // v46b: a button for every category name the user typed that isn't a built-in one
  const catSync = () => {
    const used = new Set(lib.filter((e) => e.pre).map((e) => e.cat));
    used.forEach((k) => {
      if (catBtns[k]) return;
      catBtns[k] = mkb(k, () => showCat(k), "edcat");
      catBtns[k].style.padding = "2px 6px";
      catBtns[k].style.fontSize = "11px";
      catBtns[k].dataset.mine = "1";
    });
    Object.keys(catBtns).forEach((k) => {
      if (catBtns[k].dataset.mine) catBtns[k].style.display = used.has(k) ? "" : "none";
    });
  };
  // a typed category name → a built-in key when it matches one ("buildings", "Roads & paths"...)
  const catKey = (s) => {
    s = (s || "").trim().slice(0, 24);
    if (!s) return "Buildings";
    const lo = s.toLowerCase(),
      b = CATS.find(([k, n]) => k.toLowerCase() === lo || n.toLowerCase() === lo);
    return b ? b[0] : s;
  };
  // right-click on a saved piece: rename / move to another category / delete
  const mineEdit = (e) => {
    const n = prompt("Name for this saved piece (clear it to delete the piece):", e.n);
    if (n == null) return;
    if (!n.trim()) {
      if (!confirm('Delete "' + e.n + '" from the menu? (Pieces already placed stay.)')) return;
      lib.splice(lib.indexOf(e), 1);
    } else {
      const c = prompt("Category (a built-in one like Buildings, or any new name):", e.cat);
      if (c == null) return;
      e.n = n.trim().slice(0, 40);
      e.cat = catKey(c);
    }
    lsPut(LKEY, lib);
    catSync();
    showCat(lib.some((x) => x.pre && x.cat === ed.cat) || catBtns[ed.cat].dataset.mine !== "1" ? ed.cat : "Buildings");
  };
  catSync();
  // v46b: search box over the World objects list
  const wqIn = document.createElement("input");
  wqIn.type = "search";
  wqIn.placeholder = "Search world objects (house, tree, river, lamp, Frostfen...)";
  wqIn.style.cssText =
    "display:none;width:100%;box-sizing:border-box;margin:0 0 4px;padding:3px 6px;border-radius:6px;border:1px solid #ffd27a66;background:#160c2a;color:#eadfff;font:12px system-ui";
  q("edp").parentNode.insertBefore(wqIn, q("edp"));
  let wqT = 0;
  wqIn.oninput = () => {
    clearTimeout(wqT);
    wqT = setTimeout(() => {
      ed.wq = wqIn.value;
      showCat("World");
    }, 200);
  };
  const hiItems = () =>
    [...q("edp").children].forEach((d) => {
      const on = d.dataset.n === ed.pn && ed.tool === "place";
      d.style.borderColor = on ? "#ffd27a" : "#ffd27a33";
      d.style.background = on ? "#3a2a5a" : "#20143a";
    });
  const showCat = (cat) => {
    ed.cat = cat;
    Object.keys(catBtns).forEach((k) => {
      catBtns[k].style.background = k === cat ? "#ffd27a" : "#2a1a4a";
      catBtns[k].style.color = k === cat ? "#2a1a4a" : "#ffd27a";
    });
    const gd = q("edp");
    gd.innerHTML = "";
    TQ.length = 0;
    wqIn.style.display = cat === "World" ? "block" : "none";
    let L = items(cat),
      more = 0;
    if (cat === "World" && L.length > 240) {
      // a long list: the first 240 (search narrows it)
      more = L.length - 240;
      L = L.slice(0, 240);
    }
    if (!L.length)
      gd.innerHTML =
        cat === "World"
          ? '<div style="grid-column:1/-1;color:#b8a8d8">' +
            (ed.wq ? "Nothing matches that search." : "The world is still loading - try again in a moment.") +
            "</div>"
          : '<div style="grid-column:1/-1;color:#b8a8d8">Nothing here yet. Use the Grab tool on any world object to add it.</div>';
    L.forEach((it) => {
      const d = document.createElement("div");
      d.dataset.n = it.n;
      d.title = it.n;
      d.style.cssText =
        "cursor:pointer;border:1px solid #ffd27a33;border-radius:8px;padding:2px;text-align:center;background:#20143a;font-size:10px;line-height:1.15;color:#eadfff;overflow:hidden";
      if (it.p.g === "foe") {
        const b = document.createElement("div");
        b.style.cssText =
          "height:54px;display:flex;align-items:center;justify-content:center;font:800 22px Georgia,serif;color:#ff8a6a";
        b.textContent = (it.p.bs ? "★" : "") + it.n[0] + it.p.f[1];
        d.appendChild(b);
      } else {
        const img = new Image();
        img.style.cssText = "width:54px;height:54px;display:block;margin:0 auto";
        img.alt = "";
        d.appendChild(img);
        if (THB[it.key]) img.src = THB[it.key];
        else TQ.push([it.key, it.p, img]);
      }
      const cap2 = document.createElement("div");
      cap2.textContent = it.n;
      d.appendChild(cap2);
      d.onclick = () => pick(it);
      if (it.mine) {
        d.title = it.n + " (saved - right-click to rename, move or delete)";
        d.style.borderStyle = "dashed";
        d.oncontextmenu = (ev) => {
          ev.preventDefault();
          mineEdit(it.mine);
        };
      }
      gd.appendChild(d);
    });
    if (more) {
      const nt = document.createElement("div");
      nt.style.cssText = "grid-column:1/-1;color:#b8a8d8;font-size:11px";
      nt.textContent = "+" + more + " more - type in the search box to find them";
      gd.appendChild(nt);
    }
    q("edf").style.display = cat === "Enemies" || (ed.list[ed.sel] && ed.list[ed.sel].g === "foe") ? "block" : "none";
    hiItems();
    if (TQ.length && !tBusy && ed.on) thumbRun();
  };
  // choose a palette entry as the thing to place
  const pick = (it) => {
    const p = it.p;
    ed.pn = it.n;
    ed.g = p.g;
    ed.s = p.s.slice();
    ed.c = p.c;
    ed.f = p.f ? p.f.slice() : undefined;
    ed.wk = p.wk || 0;
    ed.kt = p.kt;
    ed.ka = p.ka ? cp(p.ka) : undefined;
    ed.tx = p.tx;
    ed.rad = p.rad;
    ed.k = p.k;
    ed.ctr = p.ctr ? 1 : 0; // v46b: world-object entries are centred on their footprint
    ed.pre = p.g === "prefab" ? p.pre : null; // v46b: a saved piece (several records round its middle)
    ed.pid = p.id;
    ed.sl = p.sl || 0;
    ed.el = p.el;
    ed.bs = p.bs;
    ed.fnm = p.nm; // v46c: the name a world kind battles under (road bosses...)
    ed.txt = p.txt ? 1 : 0;
    ed.vr = p.vr ? 1 : 0;
    if (ed.ka && ed.ka.t != null) stx.value = ed.ka.t;
    if (p.g === "foe") foeFields(p);
    if ((p.g === "wall" || p.g === "floor" || p.g === "wline") && !ed.walls) wallsTog(true); // v46c: so you can see what you place
    if (p.g === "tport" && !ed.tps && window.__tpsTog) window.__tpsTog(true); // v46
    ed.tool = "place";
    ed.sel = -1;
    rebuild();
  };
  const foeFields = (o) => {
    foeKinds(); // v46c
    efk.value = o.f[0];
    eft.value = String(o.f[1]);
    efb.checked = !!o.f[2];
    efo.checked = o.bs != null ? !!o.bs : o.f[0] === "gloom" && o.f[1] === 5;
    efe.value = o.el == null ? "r" : o.el;
  };
  const foeRead = () => ({
    f: [efk.value, +eft.value, efb.checked ? 1 : 0],
    bs: efo.checked ? 1 : 0,
    el: efe.value,
  });
  const foeChange = () => {
    const v = foeRead(),
      o = ed.list[ed.sel];
    if (o && o.g === "foe")
      edit((o) => {
        if (o.f[0] !== v.f[0]) delete o.nm; // v46c: another kind = that kind's own name
        o.f = v.f;
        o.bs = v.bs;
        o.el = v.el;
      });
    else if (ed.g === "foe") {
      if (ed.f && ed.f[0] !== v.f[0]) ed.fnm = "";
      Object.assign(ed, v);
    }
  };
  [efk, eft, efb, efo, efe].forEach((el) => (el.onchange = foeChange));
  mkb(
    "Place this enemy",
    () => {
      const v = foeRead(),
        n = (FOEK.find((k) => k[0] === v.f[0]) || [0, "Foe"])[1];
      // v46c: kinds found in the world (road bosses...) carry the name they battle under
      const own = FOEN[v.f[0]] || ["wolf", "hound", "gloom"].includes(v.f[0]);
      pick({ n: n + " t" + v.f[1], p: Object.assign({ g: "foe", s: [1, 1, 1], c: W0 }, v, own ? {} : { nm: n }) });
      toast("Click the ground to place: " + n + " (tier " + v.f[1] + ")", "#9fe8d0");
    },
    "efbt",
  );

  /* ---------- data ---------- */
  const save = () => lsPut(KEY, ed.list);
  const push = () => {
    ed.hist.push(JSON.stringify({ l: ed.list, w: WO, r: RO, so: SO })); // v46b: r = bent roads, v46c: so = walls
    if (ed.hist.length > 60) ed.hist.shift();
  };
  const mkFoe1 = (o, i) => {
    const [kind, t, big] = o.f,
      m = mkFoe(kind, t, big);
    m.position.set(o.x, o.y, o.z);
    m.rotation.y = o.r || 0;
    m.userData.ei = i;
    S.add(m);
    if (o.c && o.c.toLowerCase() !== W0) {
      const tc = new T.Color(o.c);
      m.traverse((x) => {
        if (x.material && x.material.color) {
          x.material = x.material.clone();
          x.material.color.multiply(tc);
        }
      });
    }
    const f = { o: m, t, kind, big, hx: o.x, hz: o.z, w: null, wt: 0, dead: 0, rt: 0, tw: 0, edi: i };
    if (FOEN[kind]) f.nm = typeof NFK !== "undefined" && NFK[kind] ? NFK[kind].n : FOEN[kind];
    if (o.nm) f.nm = o.nm; // v46c
    f.boss = o.bs != null ? !!o.bs : kind === "gloom" && t === 5;
    if (o.el != null && o.el !== "r") f.edEl = o.el;
    f.pi = 0;
    if (Array.isArray(o.p))
      f.path = o.p.length > 1 ? o.p.map((p) => p.slice()) : null; // v46b: [x, z, wait, cond]
    else {
      // default beat: a small loop round where it was placed (the walkable points, or all of them when it stands off the
      // paths, so it never just stands there), then the long street/road beat world foes get from 28-patrols.js
      const pr = 3 * (o.s[0] || 1),
        ring = [
          [o.x + pr, o.z],
          [o.x, o.z + pr],
          [o.x - pr, o.z],
          [o.x, o.z - pr],
        ],
        pts = ring.filter(([x, q]) => okp(x, q) && !safe(x, q));
      f.path = pts.length > 1 ? pts : ring;
      if (window.__longPath)
        try {
          window.__longPath(f);
        } catch (e) {}
    }
    f.s0 = m.scale.x;
    f.R = f.boss ? 5 : 3 + f.t * 0.3 + (f.big ? 0.6 : 0);
    const rg = mkAg();
    rg.rotation.x = -Math.PI / 2;
    rg.scale.setScalar(f.R);
    rg.visible = false;
    S.add(rg);
    f.ring = rg;
    const au = new T.Sprite(
      new T.SpriteMaterial({
        map: GLT,
        color: 0xffb830,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    au.scale.setScalar(f.kind === "gloom" ? 5 : 4.2);
    au.position.y = 1.6;
    m.add(au);
    f.au = au;
    rollElite(f);
    foes.push(f);
    ed.foes.push(f);
    return m;
  };
  const mk1 = (o, i) => {
    if (o.g === "foe") return mkFoe1(o, i);
    const b = build(o),
      m = o.g === "glow" ? b : new T.Group();
    if (m !== b) m.add(b);
    m.position.set(o.x, o.y + (o.g === "glow" ? o.s[0] / 2 : 0), o.z);
    if (m !== b) m.rotation.y = o.r || 0;
    m.userData.ei = i;
    if (o.g === "wall" || o.g === "floor" || o.g === "wline") {
      m.userData.inv = 1; // v46c: only seen while Walls is on
      m.visible = !!(ed.on && ed.walls);
    }
    if (o.g === "tport") {
      m.userData.tpv = 1; // v46: only seen while Teleporters is on
      m.visible = !!(ed.on && ed.tps);
    }
    S.add(m);
    BDECK.scan(m); // v46: a pasted bridge keeps its walk-on deck (userData.deck is copied with the clone)
    return m;
  };
  const nameOf = (o) => {
    if (!o) return "";
    if (o.g === "foe") {
      const k = FOEK.find((x) => x[0] === o.f[0]);
      return (
        (k ? k[1] : o.f[0]) +
        " (tier " +
        o.f[1] +
        (o.f[2] ? ", big" : "") +
        ((o.bs != null ? o.bs : o.f[0] === "gloom" && o.f[1] === 5) ? ", boss" : "") +
        ")"
      );
    }
    if (o.g === "kit") {
      const r = PAL.find((r) => r[2].kt === o.kt && (o.kt !== "land" || r[2].ka.lm === (o.ka || {}).lm));
      return r ? r[1] : o.kt;
    }
    if (o.g === "model") return "Grabbed model";
    if (o.g === "path" || o.g === "plaza") return (o.tx || "dirt") + " " + (o.g === "plaza" ? "plaza" : "path");
    return (
      {
        box: "Box",
        cyl: "Pillar",
        cone: "Cone",
        sph: "Ball",
        glow: "Glow",
        wall: "Invisible wall",
        floor: "Invisible floor",
        wline: "Invisible wall path",
        tport: "Invisible teleporter",
      }[o.g] || o.g
    );
  };
  const ui = () => {
    const o = ed.list[ed.sel];
    inf.textContent =
      "Tool: " +
      ed.tool.toUpperCase() +
      " | grid " +
      (ed.grid ? "on" : "off") +
      " | " +
      ed.list.length +
      " objects | " +
      Object.keys(WO).length +
      " world edits | speed " +
      ed.spd.toFixed(0) +
      (FS.dirty ? " | NOT in game files yet (Save to game)" : " | saved in game files");
    inf.style.color = FS.dirty ? "#ffd27a" : "#9fe8d0";
    // v46: position / turn of the selection (world objects: their middle and how far they are turned)
    let pv = null;
    if (isMulti()) {
      const G = selPivot();
      pv = [G.x, G.y, G.z, 0]; // a group: Turn turns it by that much
    } else if (ed.ws) {
      const G = wPivot();
      pv = [G.x, G.y, G.z, wTurn()];
    } else if (o) pv = [o.x, o.y || 0, o.z, o.r || 0];
    [epx, epy, epz, epr].forEach((el, i) => {
      el.disabled = !pv;
      if (document.activeElement === el) return;
      el.value = !pv ? "" : i < 3 ? r2(pv[i]) : Math.round(((pv[3] * 180) / Math.PI) * 100) / 100;
    });
    if (ed.bigB) {
      ed.bigB.textContent = "Big pieces: " + (ed.big ? "ON" : "off");
      ed.bigB.style.outline = ed.big ? "2px solid #ffd27a" : "";
    }
    if (ed.rotB) {
      ed.rotB[0].textContent = "⟲ " + ed.rs + "°";
      ed.rotB[1].textContent = "⟳ " + ed.rs + "°";
    }
    const nSel = (ed.ws ? ed.ws.mem.length : 0) + ed.xs.length;
    q("edsh").textContent = isMulti()
      ? nSel + " pieces selected (Shift-click adds/removes, arrows/ring move them, Ctrl+C copy, Del delete)"
      : ed.ws
        ? "World: " + wName() + " (arrows/ring move it, Del hides, Reset puts it back, Alt-click = one part)"
        : o
          ? "Selected #" + ed.sel + ": " + nameOf(o) + " (drag the arrows or ring, Esc to deselect)"
          : ed.tool === "place"
            ? ed.pn
              ? "Placing: " + ed.pn + " (click the ground, R rotates, Esc stops)"
              : "Click an object to select it, or pick something from the menu"
            : "";
    // the inputs show the selection when there is one, otherwise what will be placed next
    const ws = ed.ws ? wScale() : 0,
      src = ws ? { s: [ws, ws, ws], c: W0 } : o || ed;
    sc.disabled = sl.disabled = stx.disabled = !!ws;
    [sx, sy, sz].forEach((el, i) => {
      if (document.activeElement !== el) el.value = r2((src.s || ed.s)[i]);
    });
    if (document.activeElement !== sa) {
      const s3 = src.s || ed.s;
      // a group has no one size: scrolling grows it 5% a notch from blank
      sa.value = !isMulti() && s3[0] === s3[1] && s3[1] === s3[2] ? r2(s3[0]) : "";
    }
    // v46b: the boxes step by the chosen move / turn step (typing and the little arrows)
    [epx, epy, epz].forEach((el) => (el.step = String(ed.mv)));
    epr.step = String(ed.rs);
    if (document.activeElement !== sc) sc.value = src.c || W0;
    sl.checked = !!src.sl;
    if (document.activeElement !== stx) {
      const ka = o ? o.ka : ed.ka;
      stx.value = ka && ka.t != null ? ka.t : "";
    }
    q("edf").style.display = ed.cat === "Enemies" || (o && o.g === "foe") ? "block" : "none";
    q("edpt").style.display = ed.tool === "patrol" ? "block" : "none";
    q("edrt").style.display = ed.tool === "road" ? "block" : "none";
    rdUi();
    pui();
    wallUi(); // v46c: Walls button + wall panel
    tpUi(); // v46: Teleporters button + panel
    drawRoute(); // v46c: a selected enemy shows its patrol route
    hiItems();
  };
  const rebuild = () => {
    olClear();
    const pe = ed.pf && ed.pf.edi != null ? ed.pf.edi : null;
    ed.foes.forEach((f) => {
      const k = foes.indexOf(f);
      if (k >= 0) foes.splice(k, 1);
      if (f.o.parent) f.o.parent.remove(f.o);
      if (f.ring && f.ring.parent) f.ring.parent.remove(f.ring);
    });
    ed.foes = [];
    ed.meshes.forEach((m) => {
      S.remove(m);
      if (m.material) m.material.dispose();
      m.traverse((x) => {
        if (x.userData.tm) x.userData.tm.forEach((t) => t.dispose());
        if (x.userData.rgeo) x.geometry.dispose(); // v46c: reshaped road copies own their strips' geometry
        if (x.isMesh && Object.values(GEO).includes(x.geometry) && x.material && x.material.dispose)
          x.material.dispose();
      });
    });
    ed.meshes = [];
    ed.sref.forEach((s) => {
      const k = solids.indexOf(s);
      if (k >= 0) solids.splice(k, 1);
    });
    ed.sref = [];
    // v46: the editor's invisible teleporters live in PT while built
    (ed.pref || []).forEach((q) => {
      const k = PT.indexOf(q);
      if (k >= 0) PT.splice(k, 1);
    });
    ed.pref = [];
    const sol = (x, z, r) => {
      const s = { x, z, r, ed: 1 }; // ed: 64a's land move leaves editor solids where they are
      solids.push(s);
      ed.sref.push(s);
    };
    ed.list.forEach((o, i) => {
      // one broken entry must not stop the rest (or saving, undo and the selection) from working
      let m;
      try {
        m = mk1(o, i);
      } catch (e) {
        console.warn("editor object #" + i, o, e);
        m = new T.Group();
        m.userData.ei = i;
        S.add(m);
      }
      ed.meshes.push(m);
      if (o.g === "tport") {
        if (!Array.isArray(o.to) || o.to.length < 2) return;
        const q = {
          x: o.x,
          z: o.z,
          to: [o.to[0], o.to[1], o.to[2] || 0],
          n: o.n || "Teleporter",
          r: new T.Object3D(),
          g: null,
          col: 0xc08aff,
          rad: Math.max(0.6, Math.max(o.s[0], o.s[2]) / 2),
          edp: 1,
        };
        PT.push(q);
        ed.pref.push(q);
        return;
      }
      if (o.g === "wline") {
        // v46c: circles every radius along the curve
        const P = Array.isArray(o.rl) ? o.rl : [];
        if (P.length < 2) return;
        const V = mkRd(P),
          rr = Math.max(0.35, (((o.s && o.s[2]) || 0.8) * (o.rw || 1)) / 2),
          c = Math.cos(o.r || 0),
          s = Math.sin(o.r || 0);
        for (let d = 0; d <= V.L + 0.01; d += rr) {
          const [ax, az] = rdAt(V, Math.min(d, V.L));
          sol(o.x + ax * c + az * s, o.z - ax * s + az * c, rr);
        }
        return;
      }
      if (o.g === "wall" && o.s) {
        // v46c: an invisible wall blocks along its whole length: a row of circles down its long side
        const lx = o.s[0] >= o.s[2],
          L = Math.max(o.s[0], o.s[2]),
          rr = Math.max(0.35, Math.min(o.s[0], o.s[2]) / 2),
          c = Math.cos(o.r || 0),
          s = Math.sin(o.r || 0),
          n = Math.max(1, Math.ceil((L - 2 * rr) / rr) + 1);
        for (let k = 0; k < n; k++) {
          const u = n === 1 ? 0 : -L / 2 + rr + ((L - 2 * rr) * k) / (n - 1),
            ax = lx ? u : 0,
            az = lx ? 0 : u;
          sol(o.x + ax * c + az * s, o.z - ax * s + az * c, rr);
        }
        return;
      }
      {
        // v46: a copy of a world object blocks where its original's collision circles did (moved, turned, scaled)
        const b = o.g === "model" && m.children[0],
          SL = b && b.userData.sol;
        if (SL && SL.length && o.s) {
          const c = Math.cos(o.r || 0),
            s = Math.sin(o.r || 0),
            k = Math.max(o.s[0], o.s[2]);
          SL.forEach(([lx, lz, r]) => {
            const ax = lx * o.s[0],
              az = lz * o.s[2];
            sol(o.x + ax * c + az * s, o.z - ax * s + az * c, r * k);
          });
          return;
        }
      }
      if (!o.s || !o.sl || o.g === "glow" || o.g === "foe" || o.g === "path" || o.g === "plaza") return;
      const mx = Math.max(o.s[0], o.s[2]);
      if (o.g === "kit") {
        const L = SOLK[o.kt];
        if (L) {
          const c = Math.cos(o.r || 0),
            s = Math.sin(o.r || 0);
          L.forEach(([lx, lz, r]) => {
            const ax = lx * o.s[0],
              az = lz * o.s[2];
            sol(o.x + ax * c + az * s, o.z - ax * s + az * c, r * mx);
          });
        } else if (o.rad > 0) sol(o.x, o.z, o.rad * mx);
      } else sol(o.x, o.z, o.g === "model" ? (o.rad || 1) * mx : mx / 2);
    });
    if (ed.sel >= ed.list.length) ed.sel = -1;
    ed.xs = ed.xs.filter((i) => i < ed.list.length);
    selShow();
    // the foe being patrol-edited was rebuilt: follow it to its new object
    if (pe != null) {
      const f = ed.foes.find((f) => f.edi === pe);
      if (f) {
        ed.pf = f;
        ed.pw = f.path ? f.path.map((p) => p.slice()) : [];
        if (ed.pp >= ed.pw.length) ed.pp = -1;
      } else ed.pf = null;
    }
    save();
    ed.ev = (ed.ev || 0) + 1; // v46c: the walkable edge may have changed (floors, paths): Walls redraws it
    if (ed.wpOK) wallsVis();
    drawRoute();
    drawRoad();
    ui();
  };
  const undo = () => {
    if (ed.tool === "road" && ed.rh && ed.rh.length) {
      // v46c: markers not applied yet: undo the last marker change
      ed.rcp = ed.rh.pop();
      ed.rpi = -1;
      ed.rdirty = true;
      drawRoad();
      ui();
      return;
    }
    const h = ed.hist.pop();
    if (!h) return toast("Nothing to undo", "#ff8a8a");
    const a = JSON.parse(h);
    ed.list = Array.isArray(a) ? a : a.l;
    if (!Array.isArray(a)) wRestore(a.w || {});
    if (!Array.isArray(a) && a.r && JSON.stringify(a.r) !== JSON.stringify(RO)) {
      RO = a.r;
      rsave();
      rdSync();
      if (ed.rr) rdSelect(ed.rr, ed.rsd);
      else if (ed.rtw) twSelect(ed.rtw);
    }
    if (!Array.isArray(a) && a.so && JSON.stringify(a.so) !== JSON.stringify(SO)) {
      // v46c: walls back as they were
      SO = a.so;
      ssave();
      soApply(true);
      ed.sw = null;
    }
    ed.sel = -1;
    ed.ws = null;
    ed.xs = [];
    rebuild();
    if (ed.rei >= 0) rdSelectE(ed.rei); // v46c: a pasted road copy's markers follow its undone shape
    toast("Undone", "#9fe8d0");
  };

  /* ---------- selection outline, move/rotate gizmo, placement ghost ---------- */
  // outline: a back-face shell pushed out along the normals, added under each visible mesh of the selected object
  const OLM = new T.MeshBasicMaterial({ color: 0xffd27a, side: T.BackSide, fog: false });
  OLM.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      "#include <begin_vertex>",
      "vec3 transformed = vec3(position) + normal * 0.07;",
    );
  };
  OLM.customProgramCacheKey = () => "edOutline";
  const outline = (root) => {
    const L = [];
    root.traverse((x) => {
      if (!x.isMesh || x.isInstancedMesh || x.userData.ol || !x.geometry || !x.geometry.attributes.normal) return;
      for (let p = x; p && p !== root.parent; p = p.parent) if (!p.visible) return;
      L.push(x);
    });
    L.forEach((x) => {
      const o = new T.Mesh(x.geometry, OLM);
      o.userData.ol = 1;
      o.raycast = () => {};
      x.add(o);
      OLS.push(o);
    });
    return L.length;
  };
  // every outline shell / box helper on screen, so they come off world objects (which are never rebuilt) too
  const OLS = [];
  const olClear = () => {
    OLS.forEach((o) => {
      if (o.parent) o.parent.remove(o);
      if (o.userData.own) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    OLS.length = 0;
  };
  const olBox = (h) => {
    h.userData.own = 1;
    S.add(h);
    OLS.push(h);
  };
  const hl = (m) => {
    if (m && !m.isLight && !outline(m)) olBox(new T.BoxHelper(m, 0xffd27a));
  };
  // outline + gizmo for whatever is selected: an editor object (ed.sel) or world objects (ed.ws)
  const selShow = () => {
    olClear();
    if (ed.on) {
      ed.xs.forEach((i) => ed.meshes[i] && hl(ed.meshes[i]));
      if (ed.sel >= 0 && ed.meshes[ed.sel]) hl(ed.meshes[ed.sel]);
      else if (ed.ws)
        ed.ws.mem.forEach((e) => {
          if (e.t === "f") hl(e.f.o);
          else if (e.t === "o") hl(e.o);
          else {
            const b = new T.Box3(),
              tb = new T.Box3();
            e.ms.forEach((s) => {
              s.m.getMatrixAt(s.i, WM);
              WM.premultiply(s.m.matrixWorld);
              if (!s.m.geometry.boundingBox) s.m.geometry.computeBoundingBox();
              b.union(tb.copy(s.m.geometry.boundingBox).applyMatrix4(WM));
            });
            olBox(new T.Box3Helper(b, 0xffd27a));
          }
        });
    }
    gzSync();
  };
  // gizmo: X/Y/Z arrows and a flat ring, drawn on top; fat invisible pickers (GZP) catch the clicks
  const GZ = new T.Group(),
    GZP = [];
  {
    const mat = (c) => new T.MeshBasicMaterial({ color: c, depthTest: false, transparent: true, fog: false }),
      inv = new T.MeshBasicMaterial({ visible: false }),
      top = (m) => ((m.renderOrder = 1001), m);
    const arrow = (ax, c, rx, rz) => {
      const g = new T.Group(),
        sh = top(new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1, 8), mat(c))),
        hd = top(new T.Mesh(new T.ConeGeometry(0.11, 0.3, 12), mat(c))),
        pk = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 1.4, 6), inv);
      sh.position.y = 0.5;
      hd.position.y = 1.12;
      pk.position.y = 0.7;
      pk.userData.ax = ax;
      g.add(sh, hd, pk);
      g.rotation.set(rx, 0, rz);
      GZ.add(g);
      GZP.push(pk);
    };
    arrow("x", 0xff4a4a, 0, -Math.PI / 2);
    arrow("y", 0x5aff7a, 0, 0);
    arrow("z", 0x4a8aff, Math.PI / 2, 0);
    const ring = top(new T.Mesh(new T.TorusGeometry(1.35, 0.03, 6, 64), mat(0xffd27a))),
      rp = new T.Mesh(new T.TorusGeometry(1.35, 0.15, 6, 32), inv);
    ring.rotation.x = rp.rotation.x = Math.PI / 2;
    rp.userData.ax = "r";
    GZ.add(ring, rp);
    GZP.push(rp);
  }
  let gd = null;
  // what the gizmo works on: the selected editor object, or the middle of the selected world objects
  const tget = () => {
    if (ed.ws || ed.xs.length) {
      const p = selPivot();
      return { x: p.x, y: p.y, z: p.z, r: 0 };
    }
    return ed.meshes[ed.sel] ? ed.list[ed.sel] : null;
  };
  const gzSync = () => {
    const o = ed.on && ed.tool !== "patrol" && ed.tool !== "grab" ? tget() : null;
    if (!o) {
      if (GZ.parent) S.remove(GZ);
      return;
    }
    if (!GZ.parent) S.add(GZ);
    GZ.position.set(o.x, o.y + 0.05, o.z);
    GZ.scale.setScalar(Math.max(0.6, C.position.distanceTo(GZ.position) * 0.11));
    GZ.updateMatrixWorld(true);
  };
  const liveSet = (o, m) => {
    m.position.set(o.x, o.y + (o.g === "glow" ? o.s[0] / 2 : 0), o.z);
    if (o.g !== "glow") m.rotation.y = o.r || 0;
    GZ.position.set(o.x, o.y + 0.05, o.z);
  };
  const gzDown = () => {
    if (!GZ.parent) return false;
    const h = rc.intersectObjects(GZP, false)[0],
      o = tget();
    if (!h || !o) return false;
    const ax = h.object.userData.ax,
      at = new T.Vector3(o.x, o.y, o.z);
    let pl;
    if (ax === "y") {
      const d = new T.Vector3();
      C.getWorldDirection(d);
      d.y = 0;
      if (d.lengthSq() < 1e-6) d.set(0, 0, 1);
      pl = new T.Plane().setFromNormalAndCoplanarPoint(d.normalize(), at);
    } else pl = new T.Plane(new T.Vector3(0, 1, 0), -o.y);
    const p0 = rc.ray.intersectPlane(pl, new T.Vector3());
    if (!p0) return false;
    return gdStart(ax, pl, p0);
  };
  // start a drag of the selection: ax x/y/z/r (gizmo) or "xz" (v46b: the piece itself, slid along the ground)
  const gdStart = (ax, pl, p0, e) => {
    const o = tget();
    if (!o) return false;
    push();
    gd = { ax, pl, p0, x: o.x, y: o.y, z: o.z, r: o.r || 0, a0: Math.atan2(p0.x - o.x, p0.z - o.z), mv: 0 };
    if (e) {
      gd.sx = e.clientX;
      gd.sy = e.clientY;
    }
    if (ed.ws || ed.xs.length) {
      // world objects / a multi-selection: moved as a group about its middle, from records taken now
      gd.rel = 1;
      gd.ws = ed.ws ? wStart() : null;
      gd.ms = ed.xs.map((i) => [i, cp(ed.list[i])]);
      gd.G = new T.Vector3(o.x, o.y, o.z);
    }
    return true;
  };
  // v46b: press on a piece and drag it: it slides on a flat plane through the spot you pressed
  const bodyDrag = (e, hp) => {
    if (!hp || !tget()) return;
    gdStart("xz", new T.Plane(new T.Vector3(0, 1, 0), -hp.y), hp.clone(), e);
  };
  const gzMove = (e) => {
    const o = gd.rel ? { x: gd.x, y: gd.y, z: gd.z, r: gd.r } : ed.list[ed.sel],
      m = gd.rel ? null : ed.meshes[ed.sel];
    if (!gd.rel && (!o || !m)) return;
    // a body drag only starts once the mouse has really moved (a plain click just selects)
    if (gd.ax === "xz" && !gd.mv && Math.hypot(e.clientX - gd.sx, e.clientY - gd.sy) < 4) return;
    ray(e);
    const p = rc.ray.intersectPlane(gd.pl, new T.Vector3());
    if (!p) return;
    // editor objects snap to the grid; world objects snap how far they move (they rarely stand on the grid)
    // v46: snap = the chosen move / turn step; hold Ctrl while dragging for no snap at all
    const gr = ed.grid && !e.ctrlKey,
      sn = (b, dv, s) =>
        r2(gd.rel ? b + (gr ? Math.round(dv / s) * s : dv) : gr ? Math.round((b + dv) / s) * s : b + dv);
    if (gd.ax === "xz") {
      o.x = sn(gd.x, p.x - gd.p0.x, ed.mv);
      o.z = sn(gd.z, p.z - gd.p0.z, ed.mv);
    } else if (gd.ax === "x") o.x = sn(gd.x, p.x - gd.p0.x, ed.mv);
    else if (gd.ax === "z") o.z = sn(gd.z, p.z - gd.p0.z, ed.mv);
    else if (gd.ax === "y") o.y = sn(gd.y, p.y - gd.p0.y, Math.min(0.25, ed.mv));
    else {
      const a = Math.atan2(p.x - gd.x, p.z - gd.z),
        rs = rsr();
      let r = gd.r + (a - gd.a0);
      if (gr) r = Math.round(r / rs) * rs;
      o.r = Math.round(r * 1e5) / 1e5;
    }
    gd.mv = 1;
    if (gd.rel) {
      const dv = new T.Vector3(o.x - gd.x, o.y - gd.y, o.z - gd.z),
        dr = o.r - gd.r;
      if (gd.ws) wXform(gd.ws, gd.G, dv, dr, 1);
      gd.ms.forEach(([i, b]) => {
        const n = ed.list[i];
        if (!n) return;
        mXf(n, b, gd.G, dv, dr, 1);
        if (ed.meshes[i]) liveSet(n, ed.meshes[i]);
      });
      GZ.position.set(o.x, o.y + 0.05, o.z);
    } else liveSet(o, m);
  };
  const gzUp = () => {
    const mv = gd.mv,
      w = gd.ws,
      ms = gd.ms && gd.ms.length;
    gd = null;
    if (!mv) ed.hist.pop();
    else if (w && !ms) wDone();
    else {
      if (w) wsave();
      rebuild(); // editor objects (also saves them)
    }
  };
  // ghost: a see-through copy of the armed palette item that follows the cursor
  let ghost = null,
    ghostK = "";
  const ghostDrop = () => {
    if (ghost) {
      if (ghost.parent) ghost.parent.remove(ghost);
      ghost.userData.gm.forEach((m) => m.dispose());
      ghost.traverse((x) => x.userData.tm && x.userData.tm.forEach((t) => t.dispose()));
    }
    ghost = null;
    ghostK = "";
  };
  const ghostGet = () => {
    const k = ed.pn ? JSON.stringify([ed.pn, ed.g, ed.kt, ed.ka, ed.s, ed.c, ed.f, ed.tx, ed.k, ed.pid]) : "";
    if (k === ghostK && ghost) return ghost;
    ghostDrop();
    if (!k) return null;
    let m;
    try {
      if (ed.g === "foe") m = mkFoe(ed.f[0], ed.f[1], ed.f[2]);
      else if (ed.g === "prefab") m = buildPre(ed.pre);
      else {
        m = new T.Group();
        m.add(build({ g: ed.g, s: ed.s.slice(), c: ed.c, kt: ed.kt, ka: ed.ka, tx: ed.tx, k: ed.k }));
      }
    } catch (e) {
      console.warn("editor ghost", e);
      return null;
    }
    const gm = [];
    m.traverse((x) => {
      x.raycast = () => {};
      if (!x.material) return;
      const one = (mt) => {
        const c = mt.clone();
        c.transparent = true;
        c.opacity = 0.45 * (mt.opacity == null ? 1 : mt.opacity);
        c.depthWrite = false;
        gm.push(c);
        return c;
      };
      x.material = Array.isArray(x.material) ? x.material.map(one) : one(x.material);
    });
    m.userData.gm = gm;
    ghostK = k;
    return (ghost = m);
  };
  const ghostHide = () => ghost && ghost.parent && ghost.parent.remove(ghost);
  // where a click would place the armed item (Shift = on top of the editor object under the cursor)
  const placePt = (stack) => {
    let p = null;
    if (stack) {
      const h = rc.intersectObjects(ed.meshes, true)[0];
      if (h && h.face && h.face.normal.y > 0.5) p = h.point.clone();
    }
    if (!p) p = groundPt();
    if (!p) return null;
    let x = p.x,
      y = p.y,
      z = p.z;
    if (ed.grid) {
      x = r2(Math.round(x / ed.mv) * ed.mv);
      z = r2(Math.round(z / ed.mv) * ed.mv);
      y = Math.round(y / 0.25) * 0.25;
    }
    if (ed.g === "foe") y = 0;
    return [x, y, z];
  };
  const ghostMove = (e) => {
    if (!ed.on || ed.tool !== "place" || !ed.pn || gd || drag || pdrag || e.target !== cv) return ghostHide();
    const g = ghostGet();
    if (!g) return;
    ray(e);
    const p = placePt(e.shiftKey);
    if (!p) return ghostHide();
    g.position.set(p[0], p[1] + (ed.g === "glow" ? ed.s[0] / 2 : 0), p[2]);
    g.rotation.y = ed.g === "glow" ? 0 : ed.rot || 0;
    if (!g.parent) S.add(g);
  };
  // v46 multi-select helpers
  const hasSel = () => ed.sel >= 0 || !!ed.ws || ed.xs.length > 0;
  const isMulti = () => ed.xs.length > 0;
  // middle of everything selected
  const selPivot = () => {
    const v = new T.Vector3();
    let n = 0;
    if (ed.ws)
      ed.ws.mem.forEach((e) => {
        v.add(wCurA(e));
        n++;
      });
    ed.xs.forEach((i) => {
      const o = ed.list[i];
      if (!o) return;
      v.x += o.x;
      v.y += o.y || 0;
      v.z += o.z;
      n++;
    });
    return v.divideScalar(n || 1);
  };
  // turn an editor object (from its start record b) about G by dr, grow it by gs, then move it by dv
  const mXf = (o, b, G, dv, dr, gs) => {
    const c = Math.cos(dr),
      s = Math.sin(dr),
      tf = (x, z) => {
        const ax = (x - G.x) * gs,
          az = (z - G.z) * gs;
        return [r2(G.x + ax * c + az * s + dv.x), r2(G.z - ax * s + az * c + dv.z)];
      };
    [o.x, o.z] = tf(b.x, b.z);
    o.y = o.g === "foe" ? 0 : r2((b.y || 0) + dv.y);
    if (o.g !== "glow") o.r = Math.round(((b.r || 0) + dr) * 1e5) / 1e5;
    if (gs !== 1) o.s = b.s.map((v) => Math.max(0.05, v * gs));
    if (Array.isArray(b.p)) o.p = b.p.map(([x, z]) => tf(x, z));
  };
  // edit() for a multi-selection: fn gets a stand-in at the middle, like wEdit
  const mEdit = (fn) => {
    push();
    const G = selPivot(),
      p = { x: G.x, y: G.y, z: G.z, r: 0, s: [1, 1, 1] };
    fn(p);
    const gs = p.s.find((v) => v !== 1) || 1,
      dv = new T.Vector3(p.x - G.x, p.y - G.y, p.z - G.z),
      dr = p.r || 0;
    if (ed.ws) {
      wXform(wStart(), G, dv, dr, gs);
      wsave();
    }
    ed.xs.forEach((i) => ed.list[i] && mXf(ed.list[i], cp(ed.list[i]), G, dv, dr, gs));
    rebuild();
  };
  const edit = (fn) => {
    if (isMulti()) return mEdit(fn);
    if (ed.ws) return wEdit(fn);
    const o = ed.list[ed.sel];
    if (!o) return;
    push();
    fn(o);
    rebuild();
  };

  /* ---------- patrol routes ---------- */
  const RT = new T.Group(),
    MKG = new T.SphereGeometry(0.42, 10, 8);
  ed.pmk = [];
  const ov = (m, ro) => {
    m.renderOrder = ro || 999;
    return m;
  };
  // v46b: number labels (canvas sprites, cached by text; never disposed with the route)
  const LBL = new Map();
  const lblMat = (t, hi) => {
    const k = t + (hi ? "*" : "");
    let m = LBL.get(k);
    if (m) return m;
    const c = document.createElement("canvas"),
      wide = t.length > 2;
    c.width = wide ? 256 : 128;
    c.height = 64;
    const x = c.getContext("2d");
    x.fillStyle = hi ? "rgba(255,106,58,.92)" : "rgba(32,20,58,.88)";
    x.strokeStyle = "#ffd27a";
    x.lineWidth = 4;
    const W2 = c.width - 6;
    x.beginPath();
    if (x.roundRect) x.roundRect(3, 3, W2, 58, 22);
    else x.rect(3, 3, W2, 58);
    x.fill();
    x.stroke();
    x.fillStyle = "#fff4d8";
    x.font = "800 40px system-ui,sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(t, c.width / 2, 34, W2 - 8);
    const tx = new T.CanvasTexture(c);
    m = new T.SpriteMaterial({ map: tx, depthTest: false, transparent: true, fog: false });
    m.userData.keep = 1;
    LBL.set(k, m);
    return m;
  };
  // v46c: the enemies in the selection (world foes and editor foes), whose routes show outside the patrol tool too
  const selFoes = () => {
    const L = [];
    if (ed.ws) ed.ws.mem.forEach((e) => e.t === "f" && e.f && L.push(e.f));
    ed.xs.concat(ed.sel >= 0 ? [ed.sel] : []).forEach((i) => {
      const o = ed.list[i],
        f = o && o.g === "foe" && ed.foes.find((f) => f.edi === i);
      if (f) L.push(f);
    });
    return L.filter((f) => f.o);
  };
  // a selected enemy's route, to look at (Patrol tool P edits it)
  const routeView = (f, bm) => {
    const hm = ov(new T.Mesh(new T.RingGeometry(0.7, 0.95, 28), bm(0x9fe8d0)));
    hm.rotation.x = -Math.PI / 2;
    hm.position.set(f.hx, 0.25, f.hz);
    RT.add(hm);
    const P = f.path || [];
    if (P.length > 1)
      RT.add(
        ov(
          new T.LineLoop(
            new T.BufferGeometry().setFromPoints(P.map((p) => new T.Vector3(p[0], 0.3, p[1]))),
            new T.LineBasicMaterial({ color: 0xffd27a, depthTest: false, transparent: true, opacity: 0.75 }),
          ),
        ),
      );
    P.forEach((p, i) => {
      const m = ov(new T.Mesh(MKG, bm(i === 0 ? 0x7dff9a : 0xffd27a)), 1000);
      m.scale.setScalar(0.7);
      m.position.set(p[0], 0.45, p[1]);
      m.raycast = () => {};
      RT.add(m);
      const lb =
        String(i + 1) +
        (p[2] > 0 ? (p[3] === "n" ? " ⌖" + p[2] : p[3] === "f" ? " ↔" + p[2] : " ⏱" + p[2] + "s") : "");
      const sp = ov(new T.Sprite(lblMat(lb, false)), 1001);
      sp.scale.set(0.45 * (lb.length > 2 ? 2.4 : 1.2), 0.54, 1);
      sp.position.set(p[0], 1.3, p[1]);
      sp.raycast = () => {};
      RT.add(sp);
    });
  };
  const drawRoute = () => {
    // outside the patrol tool: the selected enemies' routes, redrawn only when they change
    const view = ed.on && ed.tool !== "patrol" ? selFoes() : [],
      sig = ed.tool === "patrol" ? null : JSON.stringify(view.map((f) => [f.o.uuid, f.hx, f.hz, f.path || []]));
    if (sig !== null && sig === ed.rtSig) return;
    ed.rtSig = sig;
    while (RT.children.length) {
      const c = RT.children.pop();
      if (c.geometry && c.geometry !== MKG && !c.isSprite) c.geometry.dispose(); // sprites share one geometry
      if (c.material && !c.material.userData.keep) c.material.dispose();
    }
    ed.pmk = [];
    if (view.length) {
      if (!RT.parent) S.add(RT);
      const bm = (c) =>
        new T.MeshBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: 0.8, side: T.DoubleSide });
      view.forEach((f) => routeView(f, bm));
      return;
    }
    const f = ed.pf;
    if (!ed.on || !f || ed.tool !== "patrol" || !f.o) {
      if (RT.parent) S.remove(RT);
      return;
    }
    if (!RT.parent) S.add(RT);
    const bm = (c) => new T.MeshBasicMaterial({ color: c, depthTest: false, transparent: true, side: T.DoubleSide });
    const hm = ov(new T.Mesh(new T.RingGeometry(0.7, 0.95, 28), bm(0x9fe8d0)));
    hm.rotation.x = -Math.PI / 2;
    hm.position.set(f.hx, 0.25, f.hz);
    RT.add(hm);
    const bx = ov(new T.BoxHelper(f.o, 0x9fe8d0));
    bx.material.depthTest = false;
    RT.add(bx);
    const P = ed.pw;
    if (P.length > 1) {
      const ln = ov(
        new T.LineLoop(
          new T.BufferGeometry().setFromPoints(P.map((p) => new T.Vector3(p[0], 0.3, p[1]))),
          new T.LineBasicMaterial({ color: 0xffd27a, depthTest: false, transparent: true }),
        ),
      );
      RT.add(ln);
    }
    P.forEach((p, i) => {
      const m = ov(new T.Mesh(MKG, bm(i === ed.pp ? 0xff6a3a : i === 0 ? 0x7dff9a : 0xffd27a)), 1000);
      m.position.set(p[0], 0.45, p[1]);
      m.userData.pi = i;
      RT.add(m);
      // v46b: the walking order above each orb (1, 2, 3...), with its wait
      const lb =
        String(i + 1) +
        (p[2] > 0 ? (p[3] === "n" ? " ⌖" + p[2] : p[3] === "f" ? " ↔" + p[2] : " ⏱" + p[2] + "s") : "");
      const sp = ov(new T.Sprite(lblMat(lb, i === ed.pp)), 1001);
      sp.scale.set(0.55 * (lb.length > 2 ? 2.4 : 1.2), 0.66, 1);
      sp.position.set(p[0], 1.45, p[1]);
      RT.add(sp);
      ed.pmk.push(m);
    });
  };
  const foeIx = (f) => (f && f.edi == null ? foes.indexOf(f) : -1);
  const pui = () => {
    const f = ed.pf,
      el = q("edpi");
    if (!el) return;
    // v46b: the selected point's wait
    {
      const w = f && ed.pp >= 0 ? ed.pw[ed.pp] : null,
        c = !w || !(w[2] > 0) ? "" : w[3] || "t";
      q("edpw").style.display = f ? "block" : "none";
      q("edpn").textContent = w ? String(ed.pp + 1) : "- (click one)";
      edpc.disabled = edpv.disabled = !w;
      edpc.value = c;
      edpv.style.display = c ? "" : "none";
      if (document.activeElement !== edpv) edpv.value = w && w[2] > 0 ? String(w[2]) : "";
      q("edpu").textContent = !c ? "" : c === "t" ? "seconds" : "units away";
    }
    if (!f) {
      el.textContent = "Click any enemy to edit its patrol route.";
      return;
    }
    const nm = f.nm || (FOEK.find((k) => k[0] === f.kind) || [0, f.kind])[1],
      ix = foeIx(f),
      ow = f.edi != null ? "editor foe #" + f.edi : "world foe #" + ix + (PO[ix] ? " (edited)" : "");
    el.textContent =
      nm + " t" + f.t + ", " + ow + " | " + ed.pw.length + " points" + (ed.pw.length < 2 ? " (stands still)" : "");
  };
  const pselect = (f) => {
    ed.pf = f;
    ed.pp = -1;
    ed.pw = f && f.path ? f.path.map((p) => p.slice()) : [];
    if (f && f.edi == null && f.path0 === undefined) f.path0 = f.path ? f.path.map((p) => p.slice()) : null;
    drawRoute();
    ui();
  };
  // v46b: wait settings for the selected patrol point (Point N: walk on / wait seconds / until near / until far)
  const edpc = q("edpc"),
    edpv = q("edpv");
  const pwSet = (c, v) => {
    const w = ed.pf && ed.pp >= 0 ? ed.pw[ed.pp] : null;
    if (!w) return;
    w.length = 2;
    if (c) {
      const d = c === "t" ? 2 : 10;
      v = isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : d;
      w.push(v);
      if (c !== "t") w.push(c);
    }
    pcommit();
  };
  edpc.onchange = () => pwSet(edpc.value, +edpv.value);
  edpv.onchange = () => pwSet(edpc.value || "t", +edpv.value);
  edpv.addEventListener(
    "wheel",
    (e) => {
      if (edpv.disabled || !edpc.value) return;
      e.preventDefault();
      const dl = e.deltaY || e.deltaX;
      if (!dl) return;
      const st = (e.shiftKey ? 5 : e.ctrlKey ? 0.1 : 0.5) * (dl < 0 ? 1 : -1);
      edpv.value = String(Math.max(0.1, Math.round(((+edpv.value || 0) + st) * 10) / 10));
      pwSet(edpc.value, +edpv.value);
    },
    { passive: false },
  );
  // write the working points to the foe and save them (editor foe: o.p in the build; world foe: PO by index)
  const pcommit = () => {
    const f = ed.pf;
    if (!f) return;
    // v46b: a point may carry a wait: [x, z, seconds or range, cond] (cond: none = time, "n" = until you come near,
    // "f" = until you are farther than the range)
    const P = ed.pw.map((p) => [r2(p[0]), r2(p[1])].concat(p[2] > 0 ? [p[2]].concat(p[3] ? [p[3]] : []) : []));
    f.path = P.length > 1 ? P.map((p) => p.slice()) : null;
    f.pi = 0;
    if (f.edi != null) {
      const o = ed.list[f.edi];
      if (o) {
        o.p = P;
        save();
      }
    } else {
      const ix = foeIx(f);
      if (ix >= 0) {
        // saved where the foe stood at load: a world-edit move (f.wd) is added back on at boot
        // v43: always in the old layout (boot applies routes before the streets move): a foe on a moved street has
        // its points turned back into the old frame first (f.wd is an old-frame move too)
        const w = f.wd || [0, 0],
          zs = typeof ZSF !== "undefined" && ZSF.on && f.zso != null ? f.zso : zmLive() && f.zm ? zlOf(f.zm) : -1,
          old = (x, z) => (zs >= 0 ? zL(zs, x, z) : [x, z]),
          h0 = old(f.hx, f.hz);
        PO[ix] = {
          p: P.map((p) => {
            const q = old(p[0], p[1]);
            return [r2(q[0] - w[0]), r2(q[1] - w[1])].concat(p.slice(2));
          }),
          k: f.kind,
          h: [r2(h0[0] - w[0]), r2(h0[1] - w[1])],
        };
        psave();
      }
    }
    drawRoute();
    ui();
  };
  const preset = () => {
    const f = ed.pf;
    if (!f) return;
    if (f.edi != null) {
      const o = ed.list[f.edi];
      if (!o) return;
      push();
      delete o.p;
      rebuild();
      if (ed.pf) pselect(ed.pf);
    } else {
      const ix = foeIx(f);
      delete PO[ix];
      psave();
      f.path = f.path0 ? f.path0.map((p) => p.slice()) : f.path;
      f.pi = 0;
      pselect(f);
    }
    toast("Route reset to the default", "#9fe8d0");
  };
  mkb(
    "Clear route",
    () => {
      if (!ed.pf) return;
      ed.pw = [];
      ed.pp = -1;
      pcommit();
    },
    "edpb",
  );
  mkb(
    "Out & back",
    () => {
      if (!ed.pf || ed.pw.length < 3) return;
      ed.pw = ed.pw.concat(ed.pw.slice(1, -1).reverse());
      pcommit();
    },
    "edpb",
  );
  mkb("Reset to default", preset, "edpb");
  mkb(
    "Look at foe",
    () => {
      const f = ed.pf;
      if (!f) return;
      const c = ed.cam;
      c.x = f.o.position.x;
      c.z = f.o.position.z + 14;
      c.y = 12;
      c.yaw = 0;
      c.pitch = -0.7;
    },
    "edpb",
  );
  mkb("Done", () => pselect(null), "edpb");
  // saved overrides for world foes, checked against the foe's kind and home so a changed world can't misapply them
  const applyPO = () => {
    let bad = 0;
    Object.keys(PO).forEach((k) => {
      const f = foes[+k],
        e = PO[k];
      if (
        !f ||
        f.edi != null ||
        !e ||
        !Array.isArray(e.p) ||
        f.kind !== e.k ||
        Math.hypot(f.hx - e.h[0], f.hz - e.h[1]) > 3
      ) {
        bad++;
        return;
      }
      f.path0 = f.path ? f.path.map((p) => p.slice()) : null;
      f.path = e.p.length > 1 ? e.p.map((p) => p.slice()) : null;
      f.pi = 0;
    });
    if (bad) console.warn("editor: " + bad + " saved patrol route(s) no longer match their foe and were skipped");
  };

  /* ---------- v46b: bending roads, trails, village links and rivers (Road tool) ---------- */
  // Every road strip (dirt, sidewalks, curbs, water, banks, edge lines) is a ribbon along one road's centre line
  // (03 rdRibbon remembers {R, offsets, share of R.L} on mesh.__rib). The Road tool shows that road's control points;
  // moving / adding / removing one rebuilds the centre line (mkRd, the same spline the world uses) and every strip of
  // the road, and the road's own data (p/s/L/bb) changes in place, so where you can walk follows it. Saved per road id
  // (h<i> RDS, t<i> TRL, z<i> ZRD, v<i> 64a's rivers) in KEY_roads as world-coord control points, put back on at boot
  // (trails and rivers once 64a has moved and dressed the lands). Lamps, signs and trees along a road stay put.
  let RO = {};
  try {
    RO = JSON.parse(localStorage.getItem(SKEYS.roads) || "{}") || {};
  } catch (e) {}
  const rsave = () => lsPut(SKEYS.roads, RO);
  ed.rr = null; // the road being bent
  ed.rei = -1; // v46c: or a pasted road copy (editor object index)
  ed.rtw = false; // v46c: or the town wall
  const rdOn = () => !!ed.rr || ed.rei >= 0 || ed.rtw;
  ed.rsd = "c"; // v46c: which part: "c" the road (moves the walkable road too), "l"/"r" one side (sidewalk/curb/edge, bank)
  ed.rcp = []; // its markers (world x, z)
  ed.rpi = -1; // the selected point
  ed.rdirty = false; // v46c: markers changed but not applied yet (OK / Enter applies, like the patrol tool)
  ed.rh = []; // v46c: marker undo (Ctrl+Z while not applied)
  let rdrag = false,
    rdMoved = false;
  // v46c: the town wall (03 __townWall) as one Road-tool target. Its markers are the ring's corners (closed loop,
  // saved as RO.wall in world coords); OK hides the wall as first built and lays a new one along them (straight runs,
  // a tower per marker, gatehouse gaps where roads cross). Reset brings the original back.
  // v46: the village rim walls (03 __vWall) too: ed.rtw = "town" or "vw:<zone>", saved as RO.wall / RO["vw:<zone>"]
  // (today's coords, put on once the lands have moved)
  const TWS = {};
  const twSt = (id) => TWS[id] || (TWS[id] = { cur: [], hid: null, sol: null });
  const roK = (id) => (id === "town" ? "wall" : id);
  // v48f: and each zone street's verge fences (03 __sFence[i], ZRD index): ed.rtw = "sf:<i>|l" / "sf:<i>|r", an OPEN
  // winding line (like a road); OK zero-scales that side's built instances and lays a new fence (posts, rails, solids)
  const twOpen = (id) => typeof id === "string" && id.slice(0, 3) === "sf:";
  const sfOf = (id) => {
    const [i, sd] = id.slice(3).split("|"),
      F = window.__sFence && window.__sFence[+i];
    return F && F[sd] ? { F, i: +i, sd } : null;
  };
  const SFZ = new T.Matrix4().makeScale(0, 0, 0);
  const sfHide = (id, on) => {
    const s = sfOf(id);
    if (!s) return;
    const { F, sd } = s,
      M0 = F.__m0 || (F.__m0 = {});
    [
      ["p", F.pm],
      ["r", F.rm],
    ].forEach(([k, m]) => {
      if (!m) return;
      const key = sd + k,
        J = F[sd][k];
      if (on) {
        if (!M0[key])
          M0[key] = J.map((j) => {
            const x = new T.Matrix4();
            m.getMatrixAt(j, x);
            return x;
          });
        J.forEach((j) => m.setMatrixAt(j, SFZ));
      } else if (M0[key]) {
        J.forEach((j, n) => m.setMatrixAt(j, M0[key][n]));
        delete M0[key];
      }
      m.instanceMatrix.needsUpdate = true;
    });
  };
  const twIds = () =>
    ["town"]
      .concat(window.__vWall && window.__vWall.objs ? Object.keys(window.__vWall.objs).map((z) => "vw:" + z) : [])
      .concat(
        (window.__sFence || []).reduce((L, F, i) => (F ? L.concat(["sf:" + i + "|l", "sf:" + i + "|r"]) : L), []),
      );
  const twOrig = (id) =>
    twOpen(id)
      ? [] // the built fence is instances of shared meshes: picked by instance in roadDown, hidden by sfHide
      : id === "town"
        ? (window.__townWall && window.__townWall.objs) || []
        : (window.__vWall && window.__vWall.objs[id.slice(3)]) || [];
  const twSol0 = (id) =>
    twOpen(id)
      ? null
      : id === "town"
        ? window.__townWall && window.__townWall.sol0
        : window.__vWall && window.__vWall.sol0[id.slice(3)];
  const twAll = (id) => {
    const t = twSt(id || "town");
    return t.cur.length ? t.cur : twOrig(id || "town");
  };
  const twName = (id) => {
    if (twOpen(id)) {
      const s = sfOf(id);
      return (s ? s.F.n : "Street") + " fence (" + (id.slice(-1) === "l" ? "left" : "right") + " side)";
    }
    return id === "town"
      ? "Town wall"
      : ({ frost: "Frostfen", ember: "Cinderwaste", marsh: "Mirewick" }[id.slice(3)] || id.slice(3)) + " wall";
  };
  const twCp = (id) => {
    const k = roK(id);
    if (Array.isArray(RO[k]) && RO[k].length > 1) return RO[k].map((p) => p.slice());
    if (twOpen(id)) {
      const s = sfOf(id);
      return s ? s.F[s.sd].cp.map(([x, z]) => [r2(x), r2(z)]) : [];
    }
    if (id !== "town") {
      // the ring as built: 16 corners round the village's centre today
      const zk = id.slice(3),
        c = ZCEN[zk],
        R = (window.__vWall && window.__vWall.R[zk]) || 60,
        L = [];
      for (let i = 0; i < 16; i++) {
        const a = ((i + 0.5) / 16) * Math.PI * 2;
        L.push([r2(c[0] + Math.cos(a) * R), r2(c[1] + Math.sin(a) * R)]);
      }
      return L;
    }
    const r = (window.__townWall && window.__townWall.ring) || [];
    return r.map(([x, z]) => [OX + x, OZ + z]);
  };
  // v46d: the wall's collision circles (03 __townWall.sol per build; sol0 = the first build's)
  const solOut = (L) =>
    (L || []).forEach((s) => {
      const i = solids.indexOf(s);
      if (i >= 0) solids.splice(i, 1);
    });
  const solIn = (L) => (L || []).forEach((s) => !solids.includes(s) && solids.push(s));
  const twDrop = (id) => {
    const TW = twSt(id);
    TW.cur.forEach((o) => o.parent && o.parent.remove(o));
    TW.cur = [];
    solOut(TW.sol);
    TW.sol = null;
    if (ed.wpOK) ed.wv++;
  };
  const twApply = (id, P) => {
    if (!Array.isArray(P) || P.length < 2) return;
    if (
      twOpen(id)
        ? !(sfOf(id) && window.__sFence.build)
        : id === "town"
          ? !window.__townWall
          : !(window.__vWall && window.__vWall.build)
    )
      return;
    const TW = twSt(id),
      orig = twOrig(id);
    if (!TW.hid) TW.hid = orig.map((o) => o.visible);
    orig.forEach((o) => (o.visible = false));
    twDrop(id);
    solOut(twSol0(id));
    try {
      if (twOpen(id)) {
        sfHide(id, true);
        const r = window.__sFence.build(P);
        TW.cur = r.objs;
        TW.sol = r.sol;
      } else if (id === "town") {
        const n0 = S.children.length;
        window.__townWall([], { poly: P.map(([x, z]) => [x - OX, z - OZ]) });
        TW.cur = S.children.slice(n0);
        TW.sol = window.__townWall.sol;
      } else {
        const r = window.__vWall.build(id.slice(3), P);
        TW.cur = r.objs;
        TW.sol = r.sol;
      }
    } catch (e) {
      console.warn("editor wall " + id, e);
    }
  };
  const twRestore = (id) => {
    const TW = twSt(id);
    twDrop(id);
    if (TW.hid) twOrig(id).forEach((o, i) => (o.visible = TW.hid[i]));
    TW.hid = null;
    if (twOpen(id)) sfHide(id, false);
    solIn(twSol0(id));
  };
  function rdReg() {
    const L = [];
    if (typeof RDS !== "undefined")
      RDS.forEach((R, i) => L.push(["h" + i, R, (typeof RDSEC !== "undefined" && RDSEC[i] && RDSEC[i][0]) || "Road"]));
    if (typeof TRL !== "undefined") TRL.forEach((R, i) => L.push(["t" + i, R, R.n || "Trail " + (i + 1)]));
    if (typeof ZRD !== "undefined") ZRD.forEach((R, i) => L.push(["z" + i, R, R.n || "Village road " + (i + 1)]));
    if (typeof ZMOVE !== "undefined" && ZMOVE.RIVR)
      ZMOVE.RIVR.forEach((R, i) => L.push(["v" + i, R, "River " + (i + 1)]));
    return L;
  }
  const rdEnt = (R) => rdReg().find((e) => e[1] === R) || null;
  // v46c: road parts. A strip across the centre line is the road itself; one wholly to a side belongs to that side
  // (sidewalk + curb + edge line, or a river bank). A side can get its own line (R.__sw[side] = mkRd of its markers,
  // which run down that side's middle); without one it follows the road.
  const rbSide = (r) => (r.o0 < -0.01 && r.o1 > 0.01 ? "c" : r.o1 <= 0.01 ? "l" : "r");
  const RMID = new Map();
  // how far a side's middle is from the road's centre line, as built
  const rbMid = (R, sd) => {
    if (sd === "c") return 0;
    let o = RMID.get(R);
    if (!o) RMID.set(R, (o = {}));
    if (o[sd] == null) {
      let a = 1e9,
        b = -1e9;
      rdRibbon.all.forEach((m) => {
        const r = m.__rib;
        if (r && r.R === R && rbSide(r) === sd) {
          a = Math.min(a, r.o0);
          b = Math.max(b, r.o1);
        }
      });
      o[sd] = a < b ? (a + b) / 2 : sd === "l" ? -6.5 : 6.5;
    }
    return o[sd];
  };
  // v46c: widths (R.__wd[part] = factor; the road's own also sets R.wm, 03's walkable width). The road widens about its
  // centre line and pushes sides that follow it outward; a side widens about its own middle.
  const rbHalf = (R) => {
    let o = RMID.get(R);
    if (!o) RMID.set(R, (o = {}));
    if (o.c == null) {
      let m = 0;
      rdRibbon.all.forEach((x) => {
        const r = x.__rib;
        if (r && r.R === R && rbSide(r) === "c") m = Math.max(m, Math.abs(r.o0), Math.abs(r.o1));
      });
      o.c = m || 5;
    }
    return o.c;
  };
  // a strip's offsets now: own line V = from the side's middle, else from the road's centre line
  const rbOff = (R, r, sd, V) => {
    const wd = R.__wd || {},
      kc = wd.c || 1;
    if (sd === "c") return [r.o0 * kc, r.o1 * kc];
    const ks = wd[sd] || 1,
      mid = rbMid(R, sd),
      m2 = V ? 0 : mid + (sd === "l" ? -1 : 1) * rbHalf(R) * (kc - 1);
    return [m2 + (r.o0 - mid) * ks, m2 + (r.o1 - mid) * ks];
  };
  const rdWidth = (R, sd, k) => {
    if (!R.__wd) R.__wd = {};
    if (k && k !== 1) R.__wd[sd] = k;
    else delete R.__wd[sd];
    if (sd === "c") {
      if (k && k !== 1) R.wm = k;
      else delete R.wm;
    }
    rdRebuild(R);
  };
  const rdKey = (id, sd) => (sd && sd !== "c" ? id + "|" + sd : id);
  function rbName(R, sd) {
    const e = rdEnt(R),
      v = e && e[0][0] === "v";
    if (sd === "c") return v ? "water" : "road";
    return (v ? "bank" : "sidewalk") + " (" + (sd === "l" ? "left" : "right") + " side)";
  }
  // the markers of a road part (world coords): saved ones, a trail's or river's own, else its line sampled
  const rdCp = (R, id, sd) => {
    if (sd && sd !== "c") {
      const V = R.__sw && R.__sw[sd];
      if (V) return V.__cp.map((p) => p.slice());
      const o = rbMid(R, sd),
        n = Math.max(2, Math.round(R.L / 24)),
        out = [];
      for (let k = 0; k <= n; k++) {
        const q = rdAt(R, (R.L * k) / n);
        out.push([r2(OX + q[0] - q[3] * o), r2(OZ + q[1] + q[2] * o)]);
      }
      return out;
    }
    if (R.__cp) return R.__cp.map((p) => p.slice());
    if (id && id[0] === "t" && Array.isArray(R.cp) && R.cp.length > 1) return R.cp.map((p) => p.slice());
    if (id && id[0] === "v" && ZMOVE.RIV && ZMOVE.RIV[+id.slice(1)])
      return ZMOVE.RIV[+id.slice(1)].map((p) => p.slice());
    const n = Math.max(2, Math.round(R.L / 24)),
      out = [];
    for (let k = 0; k <= n; k++) {
      const q = rdAt(R, (R.L * k) / n);
      out.push([r2(OX + q[0]), r2(OZ + q[1])]);
    }
    return out;
  };
  const RM4 = new T.Matrix4();
  // rebuild every strip of road R from its (new) centre line, in each strip's own frame (a strip inside a moved zone
  // holder keeps its holder's move)
  const rdRebuild = (R) => {
    rdRibbon.all.forEach((m) => {
      const r = m.__rib;
      if (!r || r.R !== R || m.userData.zmHid) return;
      // a side with its own line is built along that line, its offsets taken from the side's middle
      const sd = rbSide(r),
        V = sd !== "c" && R.__sw && R.__sw[sd],
        RR = V || R,
        [a, b] = rbOff(R, r, sd, !!V);
      const g = rdRibbon.geo(RR, a, b, r.y, r.vs, r.f0 * RR.L, r.f1 * RR.L);
      m.updateWorldMatrix(true, false);
      g.applyMatrix4(RM4.copy(m.matrixWorld).invert());
      m.geometry.dispose();
      m.geometry = g;
      WSZ.delete(m);
    });
  };
  const rdApply = (R, cpW, id) => {
    if (!R.__o) R.__o = { p: R.p, s: R.s, L: R.L, bb: R.bb, cp: R.cp };
    const nd = mkRd(cpW.map(([x, z]) => [x - OX, z - OZ]));
    R.p = nd.p;
    R.s = nd.s;
    R.L = nd.L;
    R.bb = nd.bb;
    if (id && id[0] === "t") {
      R.cp = cpW.map((p) => p.slice());
      // cached spans along a trail (03 trSpan), worked out again on next use (64a clears them the same way)
      delete R.sA;
      delete R.sB;
      delete R.ta;
      delete R.tb;
    }
    R.__cp = cpW.map((p) => p.slice());
    rdRebuild(R);
  };
  const rdRestore = (R) => {
    if (!R.__o) return;
    Object.assign(R, { p: R.__o.p, s: R.__o.s, L: R.__o.L, bb: R.__o.bb });
    if (R.__o.cp !== undefined) R.cp = R.__o.cp;
    delete R.__cp;
    delete R.__o;
    rdRebuild(R);
  };
  const rdApplyS = (R, sd, cpW) => {
    if (!R.__sw) R.__sw = {};
    const V = mkRd(cpW.map(([x, z]) => [x - OX, z - OZ]));
    V.__cp = cpW.map((p) => p.slice());
    R.__sw[sd] = V;
    rdRebuild(R);
  };
  const rdRestoreS = (R, sd) => {
    if (!R.__sw || !R.__sw[sd]) return;
    delete R.__sw[sd];
    rdRebuild(R);
  };
  // saved road shapes go on (and undone ones come off) once their road exists; trails/rivers wait for 64a's move
  const RDONE = {};
  const rdSync = () => {
    const lands =
      typeof ZMV === "undefined" ||
      !ZMV.live ||
      (ZMV.on && typeof ZMOVE !== "undefined" && ZMOVE.dressed) ||
      performance.now() > 15000;
    const reg = rdReg();
    // keys: "<road id>" = the road, "<road id>|l" / "|r" = one side's own line
    for (const key in RO) {
      const s = JSON.stringify(RO[key]),
        [id, sd] = key.split("|");
      if (key.slice(0, 2) === "w:") {
        // v46c: a road part's width ("w:<id>[|side]")
        const [wid, wsd] = key.slice(2).split("|"),
          we = reg.find((x) => x[0] === wid);
        if (RDONE[key] === s || !we || (wid[0] !== "h" && !lands)) continue;
        rdWidth(we[1], wsd || "c", +RO[key] || 1);
        RDONE[key] = s;
        continue;
      }
      if (key === "wall") {
        // v46c: the town wall (in town: no waiting for the lands)
        if (RDONE.wall !== s) twApply("town", RO.wall);
        RDONE.wall = s;
        continue;
      }
      if (key.slice(0, 3) === "sf:") {
        // v48f: a street fence (streets don't move: no waiting)
        if (RDONE[key] !== s) twApply(key, RO[key]);
        RDONE[key] = s;
        continue;
      }
      if (key.slice(0, 3) === "vw:") {
        // v46: a village wall (today's coords: once the lands have moved)
        if (!lands) continue;
        if (RDONE[key] !== s) twApply(key, RO[key]);
        RDONE[key] = s;
        continue;
      }
      // everything outside the town (trails, village roads, rivers) is saved in today's layout: wait for the move
      if (RDONE[key] === s || (id[0] !== "h" && !lands)) continue;
      const e = reg.find((x) => x[0] === id);
      if (!e || !Array.isArray(RO[key]) || RO[key].length < 2) continue;
      if (sd) rdApplyS(e[1], sd, RO[key]);
      else rdApply(e[1], RO[key], id);
      RDONE[key] = s;
    }
    for (const key in RDONE)
      if (!RO[key]) {
        if (key.slice(0, 2) === "w:") {
          const [wid, wsd] = key.slice(2).split("|"),
            we = reg.find((x) => x[0] === wid);
          if (we) rdWidth(we[1], wsd || "c", 1);
          delete RDONE[key];
          continue;
        }
        if (key === "wall" || key.slice(0, 3) === "vw:" || key.slice(0, 3) === "sf:") {
          twRestore(key === "wall" ? "town" : key);
          delete RDONE[key];
          continue;
        }
        const [id, sd] = key.split("|"),
          e = reg.find((x) => x[0] === id);
        if (e) sd ? rdRestoreS(e[1], sd) : rdRestore(e[1]);
        delete RDONE[key];
      }
  };
  const RDG = new T.Group();
  ed.rmk = [];
  const drawRoad = () => {
    while (RDG.children.length) {
      const c = RDG.children.pop();
      if (c.geometry && c.geometry !== MKG && !c.isSprite) c.geometry.dispose();
      if (c.material && !c.material.userData.keep) c.material.dispose();
    }
    ed.rmk = [];
    if (!ed.on || ed.tool !== "road" || !rdOn()) {
      if (RDG.parent) S.remove(RDG);
      return;
    }
    if (!RDG.parent) S.add(RDG);
    const P = ed.rcp,
      bm = (c) => new T.MeshBasicMaterial({ color: c, depthTest: false, transparent: true });
    const loop = ed.rtw && !twOpen(ed.rtw);
    if (P.length > 1 && loop) {
      // v46c: the town wall runs straight from marker to marker, all the way round (yellow = not applied yet)
      RDG.add(
        ov(
          new T.LineLoop(
            new T.BufferGeometry().setFromPoints(P.map((p) => new T.Vector3(p[0], 0.6, p[1]))),
            new T.LineBasicMaterial({ color: ed.rdirty ? 0xffd27a : 0x9fe8d0, depthTest: false, transparent: true }),
          ),
        ),
      );
    } else if (P.length > 1) {
      RDG.add(
        ov(
          new T.Line(
            new T.BufferGeometry().setFromPoints(P.map((p) => new T.Vector3(p[0], 0.5, p[1]))),
            new T.LineBasicMaterial({ color: 0x8ad0ff, depthTest: false, transparent: true, opacity: 0.35 }),
          ),
        ),
      );
      // v46c: the winding line it will take (yellow = not applied yet: OK / Enter)
      const V = mkRd(P.map(([x, z]) => [x - OX, z - OZ]));
      RDG.add(
        ov(
          new T.Line(
            new T.BufferGeometry().setFromPoints(V.p.map((q2) => new T.Vector3(OX + q2[0], 0.6, OZ + q2[1]))),
            new T.LineBasicMaterial({ color: ed.rdirty ? 0xffd27a : 0x9fe8d0, depthTest: false, transparent: true }),
          ),
        ),
      );
    }
    P.forEach((p, i) => {
      const m = ov(
        new T.Mesh(MKG, bm(i === ed.rpi ? 0xff6a3a : !loop && (i === 0 || i === P.length - 1) ? 0x7dff9a : 0x8ad0ff)),
        1000,
      );
      m.scale.setScalar(1.6);
      m.position.set(p[0], 0.7, p[1]);
      m.userData.ri = i;
      RDG.add(m);
      ed.rmk.push(m);
      const sp = ov(new T.Sprite(lblMat(String(i + 1), i === ed.rpi)), 1001);
      sp.scale.set(0.9, 0.5, 1);
      sp.position.set(p[0], 2, p[1]);
      RDG.add(sp);
    });
  };
  function rdUi() {
    const el = q("edri");
    if (!el || ed.tool !== "road") return;
    if (ed.rwOK) {
      // v46c: the Width box (not for the town wall)
      const wv = rwGet();
      rwBox.style.display = wv == null ? "none" : "flex";
      if (document.activeElement !== rwIn) rwIn.value = wv == null ? "" : String(wv);
    }
    const e = ed.rr ? rdEnt(ed.rr) : null,
      eo = ed.rei >= 0 ? ed.list[ed.rei] : null;
    el.textContent = !rdOn()
      ? "Click a road, sidewalk, trail, river (water or bank), the town wall, a village wall, a street fence, or a pasted road copy, to lay its markers."
      : (ed.rtw
          ? twName(ed.rtw) +
            (twOpen(ed.rtw) ? " (winding line through the markers)" : " (closed ring, straight from marker to marker)")
          : eo
            ? (eo.g === "wline" ? "Invisible wall path #" : "Pasted road copy #") + ed.rei
            : (e ? e[2] : "Road") + " - " + rbName(ed.rr, ed.rsd)) +
        " | " +
        ed.rcp.length +
        " markers" +
        ((e && RO[rdKey(e[0], ed.rsd)]) || (eo && eo.rl) || (ed.rtw && RO[roK(ed.rtw)]) ? " (edited)" : "") +
        (ed.rdirty ? " | NOT APPLIED YET - press OK (or Enter)" : "") +
        " | click adds a marker (Clear points, then click them in order), drag moves one, Alt-click or Del removes," +
        " Shift-click another road part to switch";
  }
  const rdSelect = (R, sd) => {
    const e = R ? rdEnt(R) : null;
    if (R && !e) return toast("That strip doesn't belong to a road the editor can bend", "#ff8a8a");
    if (ed.rdirty && rdOn() && (R !== ed.rr || (sd || "c") !== ed.rsd))
      toast("The markers you hadn't applied were dropped", "#ffd27a");
    ed.rr = R;
    ed.rei = -1;
    ed.rtw = false;
    ed.rsd = sd || "c";
    ed.rpi = -1;
    ed.rdirty = false;
    ed.rh = [];
    ed.rcp = R ? rdCp(R, e[0], ed.rsd) : [];
    drawRoad();
    ui();
  };
  // v46c: a pasted copy of road strips (editor object i). Its markers live in the object's own frame (o.rl) so they
  // move and turn with it; shown here in world coords. Before its first reshape they are read off the copy's strips.
  const RV = new T.Vector3();
  const eToW = (o, lx, lz) => {
    const c = Math.cos(o.r || 0),
      s = Math.sin(o.r || 0);
    return [r2(o.x + lx * c + lz * s), r2(o.z - lx * s + lz * c)];
  };
  const wToE = (o, x, z) => {
    const c = Math.cos(o.r || 0),
      s = Math.sin(o.r || 0),
      dx = x - o.x,
      dz = z - o.z;
    return [r2(dx * c - dz * s), r2(dx * s + dz * c)];
  };
  const rdCpE = (i) => {
    const o = ed.list[i];
    if (o && o.g === "wline") return (Array.isArray(o.rl) ? o.rl : []).map(([x, z]) => eToW(o, x, z)); // v46c
    const I = o && ribInfo(o.k);
    if (!I) return [];
    if (Array.isArray(o.rl) && o.rl.length > 1) return o.rl.map(([x, z]) => eToW(o, x, z));
    // the copy's longest strip, edge pairs → the line at the lot's middle offset, in world coords
    const m = ed.meshes.find((x) => x.userData.ei === i);
    let best = null;
    if (m) {
      m.updateMatrixWorld(true);
      m.traverse((x) => {
        if (
          x.isMesh &&
          x.__rib &&
          (!best || x.geometry.attributes.position.count > best.geometry.attributes.position.count)
        )
          best = x;
      });
    }
    if (!best) return [];
    const r = best.__rib,
      ps = best.geometry.attributes.position,
      u = (I.sh - r.o0) / (r.o1 - r.o0 || 1),
      line = [];
    for (let k = 0; k + 1 < ps.count; k += 2) {
      RV.fromBufferAttribute(ps, k).applyMatrix4(best.matrixWorld);
      const ax = RV.x,
        az = RV.z;
      RV.fromBufferAttribute(ps, k + 1).applyMatrix4(best.matrixWorld);
      line.push([ax + (RV.x - ax) * u, az + (RV.z - az) * u]);
    }
    // about one marker every 24 along it
    const out = [line[0]];
    let run = 0;
    for (let k = 1; k < line.length; k++) {
      run += Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]);
      if (run >= 24 || k === line.length - 1) {
        out.push(line[k]);
        run = 0;
      }
    }
    return out.map((p) => [r2(p[0]), r2(p[1])]);
  };
  const rdSelectE = (i) => {
    const o = ed.list[i];
    if (!o || !(o.g === "wline" || (o.g === "model" && ribInfo(o.k)))) return rdSelect(null);
    if (o.g === "wline" && !ed.walls) wallsTog(true); // v46c: so the wall path can be seen
    if (ed.rdirty && rdOn() && ed.rei !== i) toast("The markers you hadn't applied were dropped", "#ffd27a");
    ed.rr = null;
    ed.rei = i;
    ed.rtw = false;
    ed.rsd = "c";
    ed.rpi = -1;
    ed.rdirty = false;
    ed.rh = [];
    ed.rcp = rdCpE(i);
    drawRoad();
    ui();
  };
  const twSelect = (id) => {
    id = id || "town";
    if (ed.rdirty && rdOn() && ed.rtw !== id) toast("The markers you hadn't applied were dropped", "#ffd27a");
    ed.rr = null;
    ed.rei = -1;
    ed.rtw = id;
    ed.rsd = "c";
    ed.rpi = -1;
    ed.rdirty = false;
    ed.rh = [];
    ed.rcp = twCp(id);
    drawRoad();
    ui();
  };
  // marker edits only move the markers (and the preview line); OK applies them
  const rdSnap = () => {
    ed.rh.push(ed.rcp.map((p) => p.slice()));
    if (ed.rh.length > 80) ed.rh.shift();
  };
  const rdMark = () => {
    ed.rdirty = true;
    drawRoad();
    ui();
  };
  // OK: the road part takes the markers' winding line, and it is saved
  const rdCommit = () => {
    if (ed.rtw) {
      // the town wall: hide the old one, lay a new one along the markers
      if (twOpen(ed.rtw) && ed.rcp.length < 2) return toast("Lay at least two markers first", "#ff8a8a");
      if (!twOpen(ed.rtw) && ed.rcp.length < 3)
        return toast("The wall needs at least three markers (it goes all the way round)", "#ff8a8a");
      push();
      const k = roK(ed.rtw);
      RO[k] = ed.rcp.map((p) => [r2(p[0]), r2(p[1])]);
      RDONE[k] = JSON.stringify(RO[k]);
      rsave();
      twApply(ed.rtw, RO[k]);
      ed.rdirty = false;
      ed.rh = [];
      drawRoad();
      ui();
      return toast(twName(ed.rtw) + " rebuilt along the markers", "#9fe8d0");
    }
    if (ed.rei >= 0) {
      // a pasted copy: its markers are saved on the editor object, in its own frame
      const o = ed.list[ed.rei];
      if (!o) return rdSelect(null);
      if (ed.rcp.length < 2) return toast("Lay at least two markers first", "#ff8a8a");
      push();
      o.rl = ed.rcp.map(([x, z]) => wToE(o, x, z));
      ed.rdirty = false;
      ed.rh = [];
      rebuild();
      return toast("Road copy reshaped", "#9fe8d0");
    }
    const R = ed.rr,
      e = R && rdEnt(R);
    if (!e) return toast("Click a road part first", "#ff8a8a");
    if (ed.rcp.length < 2) return toast("Lay at least two markers first", "#ff8a8a");
    push(); // Ctrl+Z after OK puts the old shape back
    const cpW = ed.rcp.map((p) => [r2(p[0]), r2(p[1])]),
      key = rdKey(e[0], ed.rsd);
    if (ed.rsd === "c") rdApply(R, cpW, e[0]);
    else rdApplyS(R, ed.rsd, cpW);
    RO[key] = cpW;
    RDONE[key] = JSON.stringify(cpW);
    rsave();
    ed.rdirty = false;
    ed.rh = [];
    drawRoad();
    ui();
    toast(rbName(R, ed.rsd)[0].toUpperCase() + rbName(R, ed.rsd).slice(1) + " reshaped", "#9fe8d0");
  };
  // where a new marker goes: before the start, after the end, or into the nearest leg
  const rdInsert = (x, z) => {
    rdSnap();
    const P = ed.rcp;
    if (ed.rtw && !twOpen(ed.rtw) && P.length > 2) {
      // the wall is a loop: into the nearest run, the closing one too
      let best = 1e9,
        at = P.length;
      for (let k = 0; k < P.length; k++) {
        const [ax, az] = P[k],
          [bx, bz] = P[(k + 1) % P.length],
          dx = bx - ax,
          dz = bz - az,
          tc = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))),
          d = Math.hypot(x - ax - dx * tc, z - az - dz * tc);
        if (d < best) {
          best = d;
          at = k + 1;
        }
      }
      P.splice(at, 0, [r2(x), r2(z)]);
      ed.rpi = at;
      return rdMark();
    }
    let best = 1e9,
      at = P.length;
    for (let k = 0; k < P.length - 1; k++) {
      const [ax, az] = P[k],
        dx = P[k + 1][0] - ax,
        dz = P[k + 1][1] - az,
        l2 = dx * dx + dz * dz || 1,
        t = ((x - ax) * dx + (z - az) * dz) / l2,
        tc = Math.max(0, Math.min(1, t)),
        d = Math.hypot(x - ax - dx * tc, z - az - dz * tc);
      if (d < best) {
        best = d;
        at = k === 0 && t < 0 ? 0 : k === P.length - 2 && t > 1 ? P.length : k + 1;
      }
    }
    P.splice(at, 0, [r2(x), r2(z)]);
    ed.rpi = at;
    rdMark();
  };
  const rdDel = () => {
    if (!rdOn() || ed.rpi < 0) return;
    rdSnap();
    ed.rcp.splice(ed.rpi, 1);
    ed.rpi = -1;
    rdMark();
  };
  mkb("OK - shape it", () => rdCommit(), "edrb").title = "Apply the markers (Enter)";
  mkb(
    "Cancel",
    () => {
      if (!rdOn()) return;
      ed.rdirty = false;
      if (ed.rtw) twSelect(ed.rtw);
      else if (ed.rei >= 0) rdSelectE(ed.rei);
      else rdSelect(ed.rr, ed.rsd);
    },
    "edrb",
  ).title = "Drop the markers you haven't applied";
  mkb(
    "Clear points",
    () => {
      if (!rdOn()) return;
      rdSnap();
      ed.rcp = [];
      ed.rpi = -1;
      rdMark();
      toast("Click the new markers in order along the way you want, then OK", "#9fe8d0");
    },
    "edrb",
  );
  mkb(
    "Smooth points",
    () => {
      // even the markers out along their winding line (same shape, about every 24)
      if (!rdOn() || ed.rcp.length < 2) return;
      if (ed.rtw && !twOpen(ed.rtw))
        return toast("The wall runs straight between its markers - nothing to smooth", "#ffd27a");
      rdSnap();
      const V = mkRd(ed.rcp.map(([x, z]) => [x - OX, z - OZ])),
        n = Math.max(2, Math.round(V.L / 24));
      ed.rcp = [];
      for (let k = 0; k <= n; k++) {
        const q2 = rdAt(V, (V.L * k) / n);
        ed.rcp.push([r2(OX + q2[0]), r2(OZ + q2[1])]);
      }
      ed.rpi = -1;
      rdMark();
    },
    "edrb",
  );
  mkb(
    "Reset",
    () => {
      if (ed.rtw) {
        const id = ed.rtw,
          k = roK(id);
        push();
        delete RO[k];
        delete RDONE[k];
        rsave();
        twRestore(id);
        ed.rdirty = false;
        twSelect(id);
        return toast(twName(id) + " back to how it was built", "#9fe8d0");
      }
      if (ed.rei >= 0) {
        // a pasted copy: back to the strips it was copied with
        const o = ed.list[ed.rei];
        if (!o) return;
        if (o.g === "wline")
          return toast("A wall path has no built shape to go back to - Clear points and lay it again", "#ffd27a");
        push();
        delete o.rl;
        ed.rdirty = false;
        rebuild();
        rdSelectE(ed.rei);
        return toast("Back to how it was copied", "#9fe8d0");
      }
      const R = ed.rr,
        e = R && rdEnt(R);
      if (!e) return;
      push();
      const key = rdKey(e[0], ed.rsd);
      delete RO[key];
      delete RDONE[key];
      delete RO["w:" + key]; // v46c: its width too
      delete RDONE["w:" + key];
      rdWidth(R, ed.rsd, 1);
      rsave();
      if (ed.rsd === "c") rdRestore(R);
      else rdRestoreS(R, ed.rsd);
      ed.rdirty = false;
      rdSelect(R, ed.rsd);
      toast("Back to how it was built", "#9fe8d0");
    },
    "edrb",
  ).title = "Put this road part back to how it was built";
  mkb("Done", () => rdSelect(null), "edrb");
  // v46c: Width (× as built) of the road part being edited: applies at once, scroll on it (Shift ×5, Ctrl fine), Ctrl+Z
  // undoes. The road's own width also changes where you can walk; a pasted copy gets its own markers first.
  const rwBox = document.createElement("label");
  rwBox.style.cssText = "display:none;align-items:center;gap:4px;color:#8ad0ff";
  rwBox.innerHTML =
    'Width × <input id="edrw" type="number" step=".05" min=".2" max="6" title="Scroll to widen / narrow" style="width:56px">';
  q("edrb").appendChild(rwBox);
  const rwIn = q("edrw");
  const rwGet = () => {
    if (ed.rtw) return null;
    if (ed.rei >= 0) {
      const o = ed.list[ed.rei];
      return o ? o.rw || 1 : null;
    }
    return ed.rr ? (ed.rr.__wd && ed.rr.__wd[ed.rsd]) || 1 : null;
  };
  let rwT = 0;
  const rwSet = (k, quiet) => {
    if (rwGet() == null) return;
    k = Math.max(0.2, Math.min(6, Math.round(k * 1000) / 1000));
    if (!quiet || performance.now() - rwT > 800) push();
    rwT = performance.now();
    if (ed.rei >= 0) {
      const o = ed.list[ed.rei];
      if (!o) return;
      if (!(Array.isArray(o.rl) && o.rl.length > 1)) o.rl = rdCpE(ed.rei).map(([x, z]) => wToE(o, x, z));
      if (k === 1) delete o.rw;
      else o.rw = k;
      rebuild();
      return;
    }
    const R = ed.rr,
      e = R && rdEnt(R);
    if (!e) return;
    const key = "w:" + rdKey(e[0], ed.rsd);
    if (k === 1) {
      delete RO[key];
      delete RDONE[key];
    } else {
      RO[key] = k;
      RDONE[key] = JSON.stringify(k);
    }
    rsave();
    rdWidth(R, ed.rsd, k);
    ui();
  };
  rwIn.onchange = () => rwSet(+rwIn.value || 1);
  rwIn.addEventListener(
    "wheel",
    (e) => {
      const v = rwGet();
      if (v == null) return;
      e.preventDefault();
      const st = e.shiftKey ? 0.25 : e.ctrlKey ? 0.01 : 0.05;
      rwSet(v + (e.deltaY < 0 ? st : -st), true);
    },
    { passive: false },
  );
  ed.rwOK = 1;
  // pointer handlers (called from onDown / pointermove / pointerup below)
  const roadDown = (e) => {
    const mh = ed.rmk.length && !e.shiftKey ? rc.intersectObjects(ed.rmk, false)[0] : null;
    if (mh) {
      ed.rpi = mh.object.userData.ri;
      if (e.altKey) return rdDel();
      rdSnap();
      rdrag = true;
      rdMoved = false;
      drawRoad();
      ui();
      return;
    }
    const rs = rdRibbon.all.filter((m) => m.parent && !m.userData.zmHid && vis(m));
    let h = rs.length ? rc.intersectObjects(rs, false)[0] : null;
    // v46c: pasted road copies (editor objects made of road strips) can be picked too
    let ei = -1;
    for (const hh of rc.intersectObjects(ed.meshes, true)) {
      if (h && hh.distance >= h.distance) break;
      let m = hh.object;
      while (m && m.userData.ei === undefined) m = m.parent;
      const o = m && ed.list[m.userData.ei];
      if (o && ((o.g === "wline" && ed.walls) || (o.g === "model" && ribInfo(o.k)))) {
        ei = m.userData.ei;
        h = hh;
        break;
      }
    }
    // v46c: the town wall's pieces (nearer than the road / copy hit)
    // v46: and each village's rim wall
    let tw = false;
    twIds().forEach((id) => {
      const tws = twAll(id).filter((o) => o.parent && vis(o)),
        th = tws.length ? rc.intersectObjects(tws, true)[0] : null;
      if (th && (!h || th.distance < h.distance)) {
        tw = id;
        ei = -1;
        h = th;
      }
    });
    // v48f: a street's fence as built (one instanced mesh of posts and one of rails per street: the hit instance says
    // which side; hidden sides are zero-scaled and can't be hit)
    (window.__sFence || []).forEach((F, i) => {
      if (!F) return;
      [
        ["p", F.pm],
        ["r", F.rm],
      ].forEach(([k, m]) => {
        if (!m || !m.parent || !vis(m)) return;
        const th = rc.intersectObject(m, false)[0];
        if (!th || th.instanceId == null || (h && th.distance >= h.distance)) return;
        const sd = F.l[k].includes(th.instanceId) ? "l" : F.r[k].includes(th.instanceId) ? "r" : "";
        if (!sd) return;
        tw = "sf:" + i + "|" + sd;
        ei = -1;
        h = th;
      });
    });
    const r = !tw && ei < 0 && h && h.object.__rib,
      R = r && r.R;
    // Shift-click (or the first click, or another road while nothing is waiting) picks a road part
    const other = tw ? tw !== ed.rtw : ei >= 0 ? ei !== ed.rei : R && R !== ed.rr;
    if ((tw || ei >= 0 || R) && (e.shiftKey || !rdOn() || (!ed.rdirty && other && !ed.rtw)))
      return tw ? twSelect(tw) : ei >= 0 ? rdSelectE(ei) : rdSelect(R, rbSide(r));
    if (!rdOn())
      return toast("Click a road, sidewalk, trail, river, wall or street fence, or a pasted copy of one", "#ff8a8a");
    const p = h ? h.point : groundPt();
    if (p) rdInsert(p.x, p.z);
  };
  const roadMove = (e) => {
    if (!rdrag || ed.rpi < 0 || !ed.rcp[ed.rpi]) return false;
    ray(e);
    const p = groundPt();
    if (p) {
      rdMoved = true;
      ed.rcp[ed.rpi] = e.ctrlKey ? [r2(p.x), r2(p.z)] : snapXZ(p);
      ed.rdirty = true;
      drawRoad();
    }
    return true;
  };
  const roadUp = () => {
    if (!rdrag) return;
    rdrag = false;
    if (!rdMoved)
      ed.rh.pop(); // just picked a marker
    else rdMark();
  };

  /* ---------- v36b: editing objects that are already in the world ---------- */
  // Keys come from where a thing stood at load (rounded to 0.1) plus its kind and first colour, never a scene-child
  // index: "o:<x>,<z>:<sig>[#n]" = a whole object (n = how many with the same key came before it, in scene order),
  // "<key>/<child index>" = a part of one (also how big holder groups are opened), "i:<x>,<z>:<colour>" = one instance of
  // an instanced mesh (every instanced mesh with the same index on that spot goes with it: trunk + fir layers),
  // "f:<index in foes>" = a world foe (checked against its kind and home). Edits live in WKEY as {d: [dx,dy,dz] world
  // move, r: turn about world Y, s: size, h: hidden} and are always applied to the load-time state, so they never stack.
  // Collision circles (solids), camera blockers (CB), chimney smoke (SMK) inside the object's footprint, its HOUSES
  // entry and quest lamp / chest positions go with it.
  const WKEY = KEY + "_world";
  let WO = {};
  try {
    WO = JSON.parse(localStorage.getItem(WKEY) || "{}") || {};
  } catch (e) {}
  const wsave = () => lsPut(WKEY, WO);
  const WX0 = {
    roots: [],
    rset: null,
    pos: new Map(),
    byKey: null,
    keyOf: new Map(),
    ent: new Map(),
    tk: new Set(),
    own: new Map(), // v46d: circle → {a: owner's footprint area, L: owner's records, p: its record}
  };
  const YA = new T.Vector3(0, 1, 0),
    Z3 = [0, 0, 0],
    BX = new T.Box3(),
    WV = new T.Vector3(),
    WM = new T.Matrix4(),
    WM2 = new T.Matrix4(),
    WD = new T.Matrix4(),
    WSZ = new WeakMap();
  const r3 = (v) => Math.round(v * 1e5) / 1e5, // v46b: fine turns (0.1°) survive the rounding
    rk = (v) => Math.round(v.x * 10) + "," + Math.round(v.z * 10);
  const colOf = (o) => {
    let c = "";
    o.traverse((x) => {
      if (c) return;
      if (x.isLight) c = x.color.getHexString();
      else if (x.material && !Array.isArray(x.material) && x.material.color) c = x.material.color.getHexString();
    });
    return c;
  };
  const sigOf = (o) => (o.isInstancedMesh ? "I" : o.isMesh ? "M" : o.isSprite ? "S" : o.isLight ? "L" : "G") + colOf(o);
  // v43 open world: world edits are always stored (and keyed) in the OLD layout, because boot applies them before
  // 64-openroads.js moves the zone streets (they ride along). Once the streets are moved (ZSF.on), an entity on a
  // moved street (e.zs = its street) keeps A / W0 / pts / instance matrices in the old frame; applying turns the result
  // into the street's frame (zT), and drags / turns / pivots are turned back into the old frame (zIn).
  // v45 re-layout (64a ZMOVE): a moved land works the same way as frame 100 + its index in ZML (a pure shift, no turn);
  // the move pass tags holders userData.zmh, moved children zmo, instances zmm[i], foes f.zm (land keys)
  const ZML = typeof ZMV !== "undefined" ? Object.keys(ZMV.d) : [],
    zmLive = () => typeof ZMV !== "undefined" && !!ZMV.on,
    zlOf = (k) => (k && ZML.indexOf(k) >= 0 ? 100 + ZML.indexOf(k) : -1),
    // the two lock arches 64a carries elsewhere (turned too): frame 200 + k, matrix ZMOVE.rel[k].m (arch tagged zmr)
    zRel = (i) => ZMOVE.rel[i - 200],
    zRp = (m, x, z) => {
      const v = new T.Vector3(x, 0, z).applyMatrix4(m);
      return [v.x, v.z];
    },
    zrOf = (o) => {
      if (typeof ZMOVE === "undefined" || !ZMOVE.rel) return -1;
      for (let p = o; p && p !== S; p = p.parent)
        if (p.userData && p.userData.zmr != null && ZMOVE.rel[p.userData.zmr]) return 200 + p.userData.zmr;
      return -1;
    },
    zW = (i, x, z) =>
      i >= 200
        ? zRp(zRel(i).m, x, z)
        : i >= 100
          ? [x + ZMV.d[ZML[i - 100]][0], z + ZMV.d[ZML[i - 100]][1]]
          : zsW(i, x, z),
    zL = (i, x, z) =>
      i >= 200
        ? zRp(zRel(i).inv, x, z)
        : i >= 100
          ? [x - ZMV.d[ZML[i - 100]][0], z - ZMV.d[ZML[i - 100]][1]]
          : zsL(i, x, z),
    zRy = (i) => (i >= 200 ? zRel(i).ry : i >= 100 ? 0 : ZSF[i].ry);
  const zLive = () => typeof ZSF !== "undefined" && !!ZSF.on,
    zAny = () => zLive() || zmLive(),
    ZT = [],
    zT = (i) => {
      if (i >= 200) {
        if (!ZT[i]) {
          ZT[i] = zRel(i).m.clone();
          ZT[i].inv = zRel(i).inv.clone();
        }
        return ZT[i];
      }
      if (i >= 100) {
        if (!ZT[i]) {
          const d = ZMV.d[ZML[i - 100]];
          ZT[i] = new T.Matrix4().makeTranslation(d[0], 0, d[1]);
          ZT[i].inv = new T.Matrix4().makeTranslation(-d[0], 0, -d[1]);
        }
        return ZT[i];
      }
      if (!ZT[i]) {
        const p = zsW(i, 0, 0);
        ZT[i] = new T.Matrix4().makeRotationY(ZSF[i].ry).setPosition(p[0], 0, p[1]);
        ZT[i].inv = ZT[i].clone().invert();
      }
      return ZT[i];
    },
    zOn = (e) => e && e.zs >= 0 && (e.zs >= 100 ? zmLive() : zLive()),
    // a vector (x, z) turned by angle a about Y (three.js sense, the same turn zsW makes)
    zRot = (x, z, a) => [Math.cos(a) * x + Math.sin(a) * z, -Math.sin(a) * x + Math.cos(a) * z],
    // the street a scene object was turned with by the move pass (holder / moved child), else -1
    zsOfO = (o) => {
      for (let p = o; p && p !== S; p = p.parent) {
        const u = p.userData || {};
        if (u.zmr != null && zmLive()) return zrOf(p);
        if (u.zso != null && zLive()) return u.zso;
        if (u.zsh != null && zLive()) return u.zsh;
        if (u.zmo && zmLive()) return zlOf(u.zmo);
        if (u.zmh && zmLive()) return zlOf(u.zmh);
      }
      return -1;
    },
    // before the move: the land / street an old-layout spot will be moved with (the move pass's own rule), else -1
    zsOld = (x, z) => {
      if (typeof zmAt === "function" && !zmLive()) {
        const k = zmAt(x, z);
        if (k) return zlOf(k);
      }
      if (typeof zsIdxO !== "function" || typeof ZSF === "undefined") return -1;
      const i = zsIdxO(x, z);
      return i >= 0 && i < ZSF.length ? i : -1;
    };
  // at boot, before any edit: every world root (zone holders opened) and where it stood
  // v46c: portals (PT entries). Their ring (q.r) and glow (q.g) are world objects like any other now; the trigger spot
  // (q.x, q.z, what walk() teleports from) keeps its offset from the ring, so moving the ring moves the portal.
  function ptTag(q) {
    if (!q || !q.r || q.r.__pt) return;
    q.r.updateMatrixWorld(true);
    const p = new T.Vector3().setFromMatrixPosition(q.r.matrixWorld);
    q.r.__pt = q;
    q.__d = [q.x - p.x, q.z - p.z];
  }
  function ptFollow(o) {
    const q = o.__pt;
    if (!q || !q.__d) return;
    const p = new T.Vector3().setFromMatrixPosition(o.matrixWorld);
    q.x = p.x + q.__d[0];
    q.z = p.z + q.__d[1];
    q.__z = null; // 11's minimap caches each portal's zone
  }
  const wSnap = () => {
    const sk = new Set(),
      a1 = (o) => o && sk.add(o);
    foes.forEach((f) => {
      a1(f.o);
      a1(f.ring);
    });
    NPCS.forEach((n) => [n.o, n.mkr, n.qm, n.np].forEach(a1));
    // v46c: portals can be picked; each remembers where its trigger stands from its ring, so moving the ring moves it
    PT.forEach(ptTag);
    if (typeof VIL !== "undefined") VIL.forEach((v) => a1(v.o));
    [BG, FF, WX, MTG, W, GZ, RT, RDG, WG, TPG].forEach(a1);
    S.updateMatrixWorld(true);
    const one = (o) => {
      if (sk.has(o) || o.isCamera || (o.isLight && !o.isPointLight) || o.userData.lus || o.userData.ei !== undefined)
        return;
      if (o.isGroup && /^zone:/.test(o.name)) return o.children.forEach(one);
      if (/^(luster:|gfall|bdx)/.test(o.name)) return;
      WX0.roots.push(o);
      WX0.pos.set(o, new T.Vector3().setFromMatrixPosition(o.matrixWorld));
    };
    S.children.slice().forEach(one);
    WX0.rset = new Set(WX0.roots);
  };
  // v46: things built after the snapshot (gates are rebuilt by gatesInit when a character loads and again when they
  // open, villages' late pieces...) become roots when first seen, keyed by where they stand then. A rebuilt object on
  // the same spot takes over its predecessor's key, so its saved edit is put back on the new copy.
  const onS = (o) => {
    for (; o; o = o.parent) if (o === S) return true;
    return false;
  };
  const lateSkip = (o) => {
    if (o.isCamera || (o.isLight && !o.isPointLight) || o.userData.lus || o.userData.ei !== undefined) return true;
    if (
      o.userData.ol ||
      o.userData.own ||
      o === GZ ||
      o === RT ||
      o === RDG ||
      o === WG ||
      o === ghost ||
      /^(zone:|luster:|wilds:|gfall|bdx)/.test(o.name)
    )
      return true;
    if ([BG, FF, WX, MTG, W].includes(o)) return true;
    if (foes.some((f) => f.o === o || f.ring === o)) return true;
    if (NPCS.some((n) => n.o === o || n.mkr === o || n.qm === o || n.np === o)) return true;
    PT.forEach(ptTag); // v46c: portals are pickable (late ones too)
    return typeof VIL !== "undefined" && VIL.some((v) => v.o === o);
  };
  const WLS = new WeakSet(), // scene children already looked at
    WSK = new WeakSet(); // ... and never pickable
  const wLateAdd = (o) => {
    wIndex();
    S.updateMatrixWorld(false);
    o.updateMatrixWorld(true);
    const p = new T.Vector3().setFromMatrixPosition(o.matrixWorld),
      b = "o:" + rk(p) + ":" + sigOf(o);
    let k = b;
    for (let n = 1; WX0.byKey.has(k) && onS(WX0.byKey.get(k)); n++) k = b + "#" + n;
    const old = WX0.byKey.get(k);
    WX0.roots.push(o);
    WX0.rset.add(o);
    (WX0.lateR = WX0.lateR || new Set()).add(o);
    WX0.pos.set(o, p);
    WX0.byKey.set(k, o);
    WX0.keyOf.set(o, k);
    if (old) {
      // a rebuilt copy: forget the old one's bindings (its records are carried over by wGet below)
      const i = WX0.roots.indexOf(old);
      if (i >= 0) WX0.roots.splice(i, 1);
      WX0.rset.delete(old);
      WX0.keyOf.delete(old);
      [...WX0.ent.keys()].forEach((q) => {
        if (q !== k && q.indexOf(k + "/") !== 0) return;
        const e = WX0.ent.get(q);
        WX0.ent.delete(q);
        WX0.late = WX0.late || new Map();
        WX0.late.set(q, e.pts); // its collision records (still at their load spots in e's p.x/p.z)
      });
    }
    return k;
  };
  // register new scene children; all = 1 from the editor (every one), else only those whose key has a saved edit
  const wLate = (all) => {
    if (!WX0.rset) return;
    if (all && WX0.lateR)
      // late roots that left the scene (puffs, old gate copies) stop being picked; their keys stay for a rebuilt copy
      WX0.lateR.forEach((o) => {
        if (onS(o)) return;
        WX0.lateR.delete(o);
        WX0.rset.delete(o);
        const i = WX0.roots.indexOf(o);
        if (i >= 0) WX0.roots.splice(i, 1);
      });
    let ks = null;
    if (!all) {
      // saved edits whose object is missing or was removed (rebuilt gates)
      ks = new Set();
      for (const q in WO) {
        if (q[0] !== "o") continue;
        const b = q.split("/")[0],
          o = WX0.byKey && WX0.byKey.get(b);
        if (!o || !onS(o)) ks.add(b.replace(/#\d+$/, ""));
      }
      if (!ks.size) return;
    }
    const kids = [];
    S.children.forEach((o) => {
      kids.push(o);
      if (o.isGroup && /^zone:/.test(o.name)) kids.push(...o.children); // v46c: late pieces put in zone holders
    });
    kids.forEach((o) => {
      if (WX0.rset.has(o) || WSK.has(o)) return;
      if (!all && WLS.has(o)) return;
      WLS.add(o);
      if (lateSkip(o)) return WSK.add(o);
      if (!all) {
        o.updateMatrixWorld(true);
        const b = "o:" + rk(new T.Vector3().setFromMatrixPosition(o.matrixWorld)) + ":" + sigOf(o);
        if (!ks.has(b)) return;
      }
      const k = wLateAdd(o);
      // put its saved edit (and its parts') back on
      for (const q in WO)
        if (q === k || q.indexOf(k + "/") === 0) {
          const e = wGet(q);
          if (e) wApply(e);
        }
    });
  };
  const wIndex = () => {
    if (WX0.byKey) return;
    WX0.byKey = new Map();
    const n = {};
    WX0.roots.forEach((o) => {
      let k = "o:" + rk(WX0.pos.get(o)) + ":" + sigOf(o);
      n[k] = (n[k] || 0) + 1;
      if (n[k] > 1) k += "#" + (n[k] - 1);
      WX0.byKey.set(k, o);
      WX0.keyOf.set(o, k);
    });
  };
  const keyOfAny = (o) => {
    wIndex();
    if (WX0.keyOf.has(o)) return WX0.keyOf.get(o);
    const p = o.parent;
    if (!p || p === S) return null;
    const pk = keyOfAny(p);
    return pk ? pk + "/" + p.children.indexOf(o) : null;
  };
  // instances by the spot they stood on at load (OCC keeps the real matrix of a tree it is hiding right now)
  const wInst = () => {
    if (WX0.xz) return;
    WX0.xz = new Map();
    WX0.ik = new Map();
    const occ = new Map();
    OCC.forEach((o) =>
      o.ms.forEach((m, j) => {
        if (!m.isInstancedMesh) return;
        let a = occ.get(m);
        if (!a) occ.set(m, (a = new Map()));
        a.set(o.i, { o, j });
      }),
    );
    WX0.roots.forEach((m) => wInst1(m, occ));
  };
  // one instanced mesh into the spot map (v46b: also called for roadside clutter chunks built later)
  const wInst1 = (m, occ) => {
    {
      if (!m.isInstancedMesh || WX0.ik.has(m)) return;
      const oc = occ && occ.get(m),
        col = colOf(m),
        ks = [];
      m.updateMatrixWorld(true);
      const lv = zAny(),
        zm = zLive() ? m.userData.zsm : null,
        zmm = zmLive() ? m.userData.zmm : null,
        zh = lv ? zsOfO(m) : -1;
      for (let i = 0; i < m.count; i++) {
        const c = (oc && oc.get(i)) || null,
          mo = new T.Matrix4();
        if (c) mo.copy(c.o.mx[c.j]);
        else m.getMatrixAt(i, mo);
        // v43: wo = its world matrix in the old layout (keys and edits use it), zs = its street (-1 none)
        const wo = new T.Matrix4().multiplyMatrices(m.matrixWorld, mo);
        let zs = -1;
        if (lv) {
          zs = zm && zm[i] != null ? zm[i] : zmm && zmm[i] != null ? (zmm[i] === "hide" ? -1 : zlOf(zmm[i])) : zh;
          if (zs >= 0) wo.premultiply(zT(zs).inv);
        } else zs = zsOld(wo.elements[12], wo.elements[14]);
        const k = rk(WV.setFromMatrixPosition(wo));
        ks.push(k);
        let L = WX0.xz.get(k);
        if (!L) WX0.xz.set(k, (L = []));
        L.push({ m, i, mo, wo, zs, col, oc: c });
      }
      WX0.ik.set(m, ks);
    }
  };
  // v46b: the tiny roadside clutter (42-luster verge flowers, grass, pebbles, toadstools) is built in chunks near the
  // camera after load, always the same way, and its chunks are never thrown away. Each chunk's instanced meshes become
  // pickable "one of many" instances keyed by their spot like trees ("i:x,z:colour"); saved edits go on when the chunk
  // is built. apply = put saved edits on (new meshes only)
  const WLU = new WeakSet();
  const wLus = (apply) => {
    if (!WX0.rset) return;
    wInst();
    S.children.forEach((g) => {
      if (!g.isGroup || !/^luster:/.test(g.name || "")) return;
      g.children.forEach((m) => {
        if (!m.isInstancedMesh || WLU.has(m)) return;
        WLU.add(m);
        WX0.roots.push(m);
        WX0.rset.add(m);
        WX0.pos.set(m, new T.Vector3());
        wInst1(m, null);
        if (!apply) return;
        const col = colOf(m);
        (WX0.ik.get(m) || []).forEach((xz) => {
          const k = "i:" + xz + ":" + col;
          if (!WO[k] || WX0.ent.has(k)) return;
          const e = wGet(k);
          if (e) wApply(e);
        });
      });
    });
  };
  // the collision circles, camera blockers, smoke and logic entries that belong to an object
  const wPts = (box, objs) => {
    const L = [],
      pad = 0.3,
      inB = (s) => s.x > box.min.x - pad && s.x < box.max.x + pad && s.z > box.min.z - pad && s.z < box.max.z + pad,
      take = (s, y, lk, pt) => {
        if (WX0.tk.has(s)) return;
        WX0.tk.add(s);
        // a doorway (PT) keeps its swirl ring / glow (s.r / s.g are objects there, not a radius / size)
        if (pt)
          return L.push({
            s,
            x: s.x,
            z: s.z,
            y: null,
            r: null,
            hs: null,
            pt: [s.r, s.g].filter(Boolean).map((o) => [o, o.position.x - s.x, o.position.z - s.z]),
          });
        L.push({ s, x: s.x, z: s.z, y: y ? s.y : null, r: s.r, hs: typeof s.s === "number" ? s.s : null, lk });
      };
    // v46d: a circle under several pieces belongs to the smallest one (a fountain's, not the square floor's under it):
    // a smaller piece bound later takes it over from a bigger one; map-sized pieces (ground sheets) take none
    const bx = box.isEmpty() ? 0 : box.max.x - box.min.x,
      bz = box.isEmpty() ? 0 : box.max.z - box.min.z,
      area = bx * bz,
      takeB = (s, y) => {
        const ow = WX0.own.get(s);
        if (ow) {
          if (ow.a <= area) return;
          const i = ow.L.indexOf(ow.p);
          if (i >= 0) ow.L.splice(i, 1);
        } else if (WX0.tk.has(s)) return;
        WX0.tk.add(s);
        const o0 = ow ? ow.p : s,
          p = { s, x: o0.x, z: o0.z, y: y ? (ow ? ow.p.y : s.y) : null, r: ow ? ow.p.r : s.r, hs: null };
        if (!ow && typeof s.s === "number") p.hs = s.s;
        else if (ow) p.hs = ow.p.hs;
        L.push(p);
        WX0.own.set(s, { a: area, L, p });
      };
    if (!box.isEmpty() && area < 6000) {
      solids.forEach((s) => inB(s) && !ed.sref.includes(s) && takeB(s));
      CB.forEach((s) => inB(s) && takeB(s));
      SMK.forEach((s) => inB(s) && takeB(s, 1));
    }
    HOUSES.forEach((h) => objs.includes(h.o) && take(h));
    LAMPS.forEach((l) => (objs.includes(l.cg) || objs.includes(l.s)) && take(l, 0, 1));
    CHESTS.forEach((c) => objs.includes(c.o) && take(c, 0, 1));
    // the doorway built with an arch (its gem is a child of the arch) walks with it, so you can still go through it
    PT.forEach((q) => q.gem && objs.includes(q.gem) && take(q, 0, 0, 1));
    return L;
  };
  const wBindO = (k, o) => {
    o.updateMatrixWorld(true);
    const e = { k, t: "o", o, v0: o.visible, W0: o.matrixWorld.clone(), zs: -1 },
      objs = [];
    // v43: on a moved street, keep it in the old frame; before the move, note the street it will move with (the move
    // pass places a piece sitting at the origin by its box centre)
    if (zAny()) {
      e.zs = zsOfO(o);
      if (e.zs >= 0) e.W0.premultiply(zT(e.zs).inv);
    } else {
      let x = e.W0.elements[12],
        z = e.W0.elements[14];
      if (Math.abs(x) + Math.abs(z) < 1) {
        BX.setFromObject(o);
        if (!BX.isEmpty()) {
          BX.getCenter(WV);
          x = WV.x;
          z = WV.z;
        }
      }
      const zr = zrOf(o); // a lock arch 64a will carry: its own frame, not the land under it
      e.zs = zr >= 0 ? zr : zsOld(x, z);
    }
    e.A = new T.Vector3().setFromMatrixPosition(e.W0);
    // v46b: a piece built in world coords sits at the origin (road / river strips, merged pieces): its anchor (where
    // the arrows stand, what it turns and grows about) is the middle of its footprint instead
    if (Math.abs(e.A.x) + Math.abs(e.A.z) < 1) {
      BX.setFromObject(o);
      if (!BX.isEmpty()) {
        BX.getCenter(WV);
        if (zOn(e)) {
          const q = zL(e.zs, WV.x, WV.z);
          WV.x = q[0];
          WV.z = q[1];
        }
        e.A.x = WV.x;
        e.A.z = WV.z;
      }
    }
    o.traverse((x) => objs.push(x));
    // v46: a shop building's door teleporter, the room's way back out and its forecourt (03 __shopLk), as they stand now
    if (window.__shopLk)
      o.traverse((x) => {
        const L = window.__shopLk.get(x);
        if (!L || e.lk) return;
        const w = L.w;
        e.lk = {
          L,
          d0: [L.d.x, L.d.z],
          t0: L.b.to.slice(),
          ry0: L.ry,
          w0: { x: w.x, z: w.z, x0: w.x0, x1: w.x1, z0: w.z0, z1: w.z1 },
        };
      });
    e.pts = wPts(BX.setFromObject(o), objs);
    zPts(e);
    if (WX0.late && WX0.late.has(k)) {
      // v46: a rebuilt copy takes over the records its predecessor carried (already in the stored frame)
      e.pts.push(...WX0.late.get(k)); // (same array: 46d hitbox owners keep a reference to it)
      WX0.late.delete(k);
    }
    WX0.ent.set(k, e);
    return e;
  };
  // v43: records collected while the streets are moved are in today's coords: back to the old frame
  const zPts = (e) => {
    if (!zOn(e)) return;
    e.pts.forEach((p) => {
      const q = zL(e.zs, p.x, p.z);
      p.x = q[0];
      p.z = q[1];
    });
  };
  const wBindI = (k, ms) => {
    const e = { k, t: "i", ms, A: new T.Vector3(), zs: ms[0] ? ms[0].zs : -1 },
      b = new T.Box3(),
      tb = new T.Box3();
    ms.forEach((s, j) => {
      WM.copy(s.wo); // v43: old-frame world matrix (see wInst)
      if (!j) e.A.setFromMatrixPosition(WM);
      if (zOn(e)) WM.premultiply(zT(e.zs)); // today's spot, to find the records standing under it
      if (!s.m.geometry.boundingBox) s.m.geometry.computeBoundingBox();
      b.union(tb.copy(s.m.geometry.boundingBox).applyMatrix4(WM));
    });
    e.pts = wPts(b, []);
    ms.forEach((s) => {
      const o = s.oc && s.oc.o;
      if (!o || WX0.tk.has(o)) return;
      WX0.tk.add(o);
      e.pts.push({ s: o, x: o.x, z: o.z, y: null, r: o.r, hs: null });
    });
    zPts(e);
    WX0.ent.set(k, e);
    return e;
  };
  const wGet = (k) => {
    const e = WX0.ent.get(k);
    if (e) return e;
    if (k[0] === "f") {
      const f = foes[+k.slice(2)],
        r = WO[k];
      if (!f || f.edi != null || !f.o) return null;
      // v43: home and anchor in the old layout (f.zso = the street the move pass moved it with)
      // v45: or the land it was shifted with (f.zm)
      const zs = zAny() ? (zLive() && f.zso != null ? f.zso : zmLive() && f.zm ? zlOf(f.zm) : -1) : zsOld(f.hx, f.hz),
        h0 = zs >= 0 && zAny() ? zL(zs, f.hx, f.hz) : [f.hx, f.hz];
      if (r && r.fk && (r.fk !== f.kind || Math.hypot(h0[0] - r.fh[0], h0[1] - r.fh[1]) > 3)) return null;
      const n = { k, t: "f", f, A: new T.Vector3(h0[0], 0, h0[1]), pts: [], zs };
      WX0.ent.set(k, n);
      return n;
    }
    if (k[0] === "i") {
      wInst();
      const [, xz, col] = k.split(":"),
        L = WX0.xz.get(xz) || [],
        a = L.find((s) => s.col === col);
      return a
        ? wBindI(
            k,
            L.filter((s) => s.i === a.i),
          )
        : null;
    }
    wIndex();
    const [k0, ...cs] = k.split("/");
    let o = WX0.byKey.get(k0);
    for (const c of cs) o = o && o.children[+c];
    return o ? wBindO(k, o) : null;
  };
  // D = move the anchor A by d, turn by r about world Y and grow by s around it
  const wDmat = (A, r) => {
    const d = (r && r.d) || Z3,
      s = (r && r.s) || 1;
    WD.makeTranslation(-A.x, -A.y, -A.z);
    WD.premultiply(WM2.makeScale(s, s, s));
    WD.premultiply(WM2.makeRotationY((r && r.r) || 0));
    WD.premultiply(WM2.makeTranslation(A.x + d[0], A.y + d[1], A.z + d[2]));
    return WD;
  };
  const wApplyF = (e, r, h) => {
    const f = e.f,
      d = (r && r.d) || Z3,
      w = f.wd || [0, 0];
    let dx = d[0] - w[0],
      dz = d[2] - w[1];
    if (dx || dz) {
      // v43: the stored move is in the old layout; on a moved street turn it into today's frame
      if (zOn(e)) [dx, dz] = zRot(dx, dz, zRy(e.zs));
      // new arrays: a long beat lists the same waypoint twice
      const sh = (P) => (Array.isArray(P) ? P.map((p) => [p[0] + dx, p[1] + dz].concat(p.slice(2))) : P);
      f.hx += dx;
      f.hz += dz;
      f.o.position.x += dx;
      f.o.position.z += dz;
      f.path = sh(f.path);
      if (f.path0 !== undefined) f.path0 = sh(f.path0);
      f.wd = [d[0], d[2]];
    }
    if (h && !f.edHid) {
      f.edHid = 1;
      f.dead = 1;
      f.rt = Infinity;
      if (f.o.parent) f.o.parent.remove(f.o);
      if (f.ring) f.ring.visible = false;
    } else if (!h && f.edHid) {
      f.edHid = 0;
      f.dead = 0;
      f.rt = 0;
      f.pi = 0;
      f.o.position.set(f.hx, 0, f.hz);
      if (!f.o.parent) S.add(f.o);
    }
  };
  const wApply = (e) => {
    const r = WO[e.k] || null,
      h = !!(r && r.h),
      sc = (r && r.s) || 1;
    if (e.t === "f") return wApplyF(e, r, h);
    const D = wDmat(e.A, r),
      zo = zOn(e); // v43: worked out in the old frame, then turned into the moved street's frame
    if (e.t === "o") {
      const o = e.o;
      if (o.parent) WM.copy(o.parent.matrixWorld).invert();
      else WM.identity();
      WM.multiply(D).multiply(e.W0);
      if (zo) WM.premultiply(zT(e.zs));
      WM.decompose(o.position, o.quaternion, o.scale);
      o.visible = e.v0 && !h;
      o.updateMatrixWorld(true);
      ptFollow(o);
      actSync(o, r);
      if (e.lk) shopFollow(e.lk, D, r, h);
    } else
      e.ms.forEach((s) => {
        // final world = (street frame) * D * old-frame world; then back into the mesh's own space
        WM.copy(D).multiply(s.wo);
        if (zo) WM.premultiply(zT(e.zs));
        WM.premultiply(WM2.copy(s.m.matrixWorld).invert());
        const fin = h ? ZM : WM;
        if (s.oc) s.oc.o.mx[s.oc.j].copy(fin);
        if (!(s.oc && s.oc.o.hid)) s.m.setMatrixAt(s.i, fin);
        s.m.instanceMatrix.needsUpdate = true;
      });
    e.pts.forEach((p) => {
      WV.set(p.x, p.y == null ? 0 : p.y, p.z).applyMatrix4(D);
      if (zo) {
        const q = zW(e.zs, WV.x, WV.z);
        WV.x = q[0];
        WV.z = q[1];
      }
      p.s.x = WV.x;
      p.s.z = WV.z;
      if (p.pt)
        p.pt.forEach(([o, dx, dz]) => {
          o.position.x = WV.x + dx;
          o.position.z = WV.z + dz;
        });
      if (p.y != null) p.s.y = h ? -1000 : WV.y;
      if (p.r != null) p.s.r = h ? -1 : p.r * sc;
      if (p.hs != null) p.s.s = p.hs * sc;
    });
    if (e.pts.length) ed.wv = (ed.wv || 0) + 1; // v46: the Walls view redraws the moved collision circles
  };
  // v46: a moved / turned townsperson or NPC (03 TALK, NPCS) talks, turns and greets from its new spot: their logic
  // entries keep a spot and a facing of their own, so they follow the model here (ry = its built facing + the turn)
  // v46: carry a shop's door teleporter (in), the room door's landing spot (out) and its walkable forecourt with it
  function shopFollow(k, D, r, h) {
    const L = k.L,
      turn = (r && r.r) || 0,
      sc = (r && r.s) || 1,
      ry = k.ry0 + turn,
      v = new T.Vector3();
    if (h) {
      L.d.x = L.d.z = 1e6; // a deleted shop has no door
    } else {
      v.set(k.d0[0], 0, k.d0[1]).applyMatrix4(D);
      L.d.x = v.x;
      L.d.z = v.z;
    }
    delete L.d.__z;
    L.d.dy = -ry;
    v.set(k.t0[0], 0, k.t0[1]).applyMatrix4(D);
    L.b.to = [v.x, v.z, ry];
    L.b.dy = ry;
    const w = L.w;
    v.set(k.w0.x, 0, k.w0.z).applyMatrix4(D);
    w.x = h ? 1e6 : v.x;
    w.z = h ? 1e6 : v.z;
    w.cs = Math.cos(ry);
    w.sn = Math.sin(ry);
    w.x0 = k.w0.x0 * sc;
    w.x1 = k.w0.x1 * sc;
    w.z0 = k.w0.z0 * sc;
    w.z1 = k.w0.z1 * sc;
    if (ed.wpOK) ed.ev = (ed.ev || 0) + 1; // the Walls view's walkable edge redraws
  }
  const AV = new T.Vector3();
  function actSync(o, r) {
    const L = [].concat(typeof TALK !== "undefined" ? TALK : [], typeof NPCS !== "undefined" ? NPCS : []);
    L.forEach((n) => {
      if (!n || !n.o) return;
      let p = n.o;
      while (p && p !== o) p = p.parent;
      if (!p) return;
      n.o.getWorldPosition(AV);
      n.x = AV.x;
      n.z = AV.z;
      if (n.ry0 === undefined) n.ry0 = n.ry || 0;
      n.ry = n.ry0 + ((r && r.r) || 0);
    });
  }
  const wStart = () => ed.ws.mem.map((e) => ({ e, r: WO[e.k] ? cp(WO[e.k]) : null }));
  const wCurA = (e) => {
    const d = (WO[e.k] && WO[e.k].d) || Z3,
      v = new T.Vector3(e.A.x + d[0], e.A.y + d[1], e.A.z + d[2]);
    if (zOn(e)) {
      const q = zW(e.zs, v.x, v.z); // v43: shown where its street stands today
      v.x = q[0];
      v.z = q[1];
    }
    return v;
  };
  const wPivot = () => {
    const v = new T.Vector3();
    ed.ws.mem.forEach((e) => v.add(wCurA(e)));
    return v.divideScalar(ed.ws.mem.length || 1);
  };
  const wScale = () => (ed.ws && WO[ed.ws.mem[0].k] && WO[ed.ws.mem[0].k].s) || 1;
  const wTurn = () => (ed.ws && WO[ed.ws.mem[0].k] && WO[ed.ws.mem[0].k].r) || 0; // v46
  const wSet = (e, n) => {
    if (n && (n.h || n.r || (n.s && n.s !== 1) || (n.d && n.d.some((v) => v)))) {
      if (e.t === "f") {
        n.fk = e.f.kind;
        n.fh = [r2(e.A.x), r2(e.A.z)];
      }
      WO[e.k] = n;
    } else delete WO[e.k];
    wApply(e);
  };
  // move the whole selection by gv, turn it by gr and grow it by gs about the pivot G (st = records at the start)
  const wXform = (st, G, gv, gr, gs) => {
    const Q = new T.Quaternion().setFromAxisAngle(YA, gr),
      v = new T.Vector3();
    st.forEach(({ e, r }) => {
      const d0 = (r && r.d) || Z3,
        n = Object.assign({}, r || {});
      // v43: on a moved street the pivot and the move are turned into the old frame the edit is stored in (a turn about
      // Y and a size change are the same in both)
      let Ge = G,
        gve = gv;
      if (zOn(e)) {
        const gq = zL(e.zs, G.x, G.z),
          vq = zRot(gv.x, gv.z, -zRy(e.zs));
        Ge = new T.Vector3(gq[0], G.y, gq[1]);
        gve = new T.Vector3(vq[0], gv.y, vq[1]);
      }
      v.set(e.A.x + d0[0] - Ge.x, e.A.y + d0[1] - Ge.y, e.A.z + d0[2] - Ge.z)
        .multiplyScalar(gs)
        .applyQuaternion(Q);
      n.d = [r2(v.x + Ge.x + gve.x - e.A.x), r2(v.y + Ge.y + gve.y - e.A.y), r2(v.z + Ge.z + gve.z - e.A.z)];
      if (e.t === "f") n.d[1] = 0;
      else {
        n.r = r3(((r && r.r) || 0) + gr);
        n.s = r3(((r && r.s) || 1) * gs);
      }
      wSet(e, n);
    });
  };
  const wDone = () => {
    wsave();
    selShow();
    ui();
  };
  // edit() for world objects: fn gets a stand-in {x, y, z, r, s} for the selection, like an editor object
  const wEdit = (fn) => {
    push();
    const G = wPivot(),
      p = { x: G.x, y: G.y, z: G.z, r: 0, s: [1, 1, 1] };
    fn(p);
    const gs = p.s.find((v) => v !== 1) || 1;
    wXform(wStart(), G, new T.Vector3(p.x - G.x, p.y - G.y, p.z - G.z), p.r || 0, gs);
    wDone();
  };
  const wSelect = (mem) => {
    ed.sel = -1;
    ed.ws = { mem };
    ed.xs = [];
    selShow();
    ui();
  };
  // v46 Shift-click: grow the selection into a group (editor pieces in ed.xs, world parts in ed.ws.mem)
  const toGroup = () => {
    if (ed.sel >= 0) {
      if (!ed.xs.includes(ed.sel)) ed.xs.push(ed.sel);
      ed.sel = -1;
    }
  };
  const selDone = () => {
    if (!ed.ws && ed.xs.length === 1) {
      ed.sel = ed.xs[0]; // one piece left: back to a plain selection
      ed.xs = [];
    }
    selShow();
    ui();
  };
  const selAddW = (mem) => {
    if (!hasSel()) return wSelect(mem);
    toGroup();
    if (!ed.ws) ed.ws = { mem: [] };
    const has = new Set(ed.ws.mem.map((e) => e.k));
    if (mem.every((e) => has.has(e.k))) ed.ws.mem = ed.ws.mem.filter((e) => !mem.some((m) => m.k === e.k));
    else mem.forEach((e) => !has.has(e.k) && ed.ws.mem.push(e));
    if (!ed.ws.mem.length) ed.ws = null;
    // world parts only: ed.ws holds them all; with editor pieces as well it stays a group
    selDone();
  };
  const selAddE = (i) => {
    if (!hasSel()) {
      ed.sel = i;
      return rebuild();
    }
    toGroup();
    const j = ed.xs.indexOf(i);
    if (j >= 0) ed.xs.splice(j, 1);
    else ed.xs.push(i);
    selDone();
  };
  const wHide = () => {
    const m = ed.ws.mem;
    if (m.some((e) => e.pts.some((p) => p.lk || p.pt)))
      return toast("Quest lamps, chests and doorway arches can be moved, not hidden", "#ff8a8a");
    push();
    m.forEach((e) => wSet(e, Object.assign({}, WO[e.k] || {}, { h: 1 })));
    ed.ws = null;
    ed.xs = [];
    wDone();
    toast("Hidden (Ctrl+Z or Unhide all brings it back)", "#9fe8d0");
  };
  const wReset = () => {
    if (!ed.ws) return toast("Select a world object to put it back where it was", "#ff8a8a");
    push();
    ed.ws.mem.forEach((e) => wSet(e, null));
    wDone();
    toast("Back where it was", "#9fe8d0");
  };
  const wRestore = (w) => {
    const ks = new Set(Object.keys(WO).concat(Object.keys(w)));
    WO = w;
    ks.forEach((k) => {
      const e = wGet(k);
      if (e) wApply(e);
    });
    wsave();
  };
  const wUnhide = () => {
    const ks = Object.keys(WO).filter((k) => WO[k].h);
    if (!ks.length) return toast("Nothing is hidden", "#9fe8d0");
    push();
    const w = cp(WO);
    ks.forEach((k) => {
      const n = w[k];
      delete n.h;
      if (!(n.r || (n.s && n.s !== 1) || (n.d && n.d.some((v) => v)))) delete w[k];
    });
    wRestore(w);
    selShow();
    ui();
    toast(ks.length + " object(s) shown again", "#9fe8d0");
  };
  const wResetAll = () => {
    if (!Object.keys(WO).length) return toast("No world objects have been changed", "#9fe8d0");
    if (!confirm("Put every changed world object back where it was? (Ctrl+Z can undo this)")) return;
    push();
    ed.ws = null;
    ed.xs = [];
    wRestore({});
    selShow();
    ui();
  };
  // ground sheets, merged decor and holder groups are too big to pick whole
  // v46b: a long thin mesh (town wall section, road strip, sidewalk, curb) is NOT big: only groups/instanced meshes over
  // 60, meshes spread over the map (> 400: merged decor) and flat sheets/discs (both sides > 40 and the top-down area
  // fills most of the box; a winding road fills far less) are
  const flatFill = (o) => {
    const g = o.geometry,
      p = g && g.attributes && g.attributes.position;
    if (!p) return 0;
    o.updateMatrixWorld(true);
    const ix = g.index,
      n = ix ? ix.count : p.count,
      a = new T.Vector3(),
      b = new T.Vector3(),
      c = new T.Vector3(),
      at = (i, v) => v.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(o.matrixWorld);
    let A = 0;
    for (let i = 0; i + 2 < n && i < 60000; i += 3) {
      at(i, a);
      at(i + 1, b);
      at(i + 2, c);
      A += Math.abs((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z)) / 2;
    }
    return A;
  };
  const wBig = (o) => {
    let s = WSZ.get(o);
    if (s == null) {
      BX.setFromObject(o);
      const v = BX.getSize(new T.Vector3()),
        mx = Math.max(v.x, v.z),
        mn = Math.min(v.x, v.z);
      s = 0;
      // road / river strips (03 rdRibbon) are always pickable, however long
      if (!BX.isEmpty() && mx > 60 && !(o.isMesh && o.userData.rib)) {
        if (!o.isMesh || o.isInstancedMesh || mx > 400) s = 1;
        else if (mn > 40) {
          try {
            s = flatFill(o) / (v.x * v.z) > 0.6 ? 1 : 0;
          } catch (e) {
            s = 1;
          }
        }
      }
      WSZ.set(o, s);
    }
    return s > 0;
  };
  // a loose part (barrel hoop, lamp post, its cap and glow...): gather the small loose parts touching it
  const wCluster = (r) => {
    const out = [r],
      bb = new T.Box3().setFromObject(r),
      tb = new T.Box3(),
      v = new T.Vector3(),
      p = new T.Vector3();
    bb.getSize(v);
    if (Math.max(v.x, v.z) > 8) return out;
    bb.expandByScalar(0.15);
    const c0 = bb.getCenter(new T.Vector3()),
      sib = r.parent.children.filter(
        (c) =>
          c !== r &&
          c.visible &&
          !c.userData.ol &&
          c.userData.ei === undefined &&
          ((c.isMesh && !c.isInstancedMesh) || c.isSprite || c.isPointLight) &&
          c.getWorldPosition(p).distanceTo(c0) < 9 &&
          keyOfAny(c),
      );
    let grew = true;
    while (grew && out.length < 24) {
      grew = false;
      for (const s of sib) {
        if (out.includes(s)) continue;
        if (!s.isMesh) {
          if (bb.containsPoint(s.getWorldPosition(p))) {
            out.push(s);
            grew = true;
          }
          continue;
        }
        tb.setFromObject(s);
        tb.getSize(v);
        if (Math.max(v.x, v.z) > 8 || !tb.intersectsBox(bb)) continue;
        const u = bb.clone().union(tb.expandByScalar(0.15));
        u.getSize(v);
        if (Math.max(v.x, v.z) > 14) continue;
        bb.copy(u);
        out.push(s);
        grew = true;
      }
    }
    return out;
  };
  // the world object under the cursor: {d: distance, mem: [entries]} (Alt = one part only)
  // skip = how many pickable things to pass over (v46b Ctrl-click: the next one underneath)
  // all = big pieces count too (Ctrl-click cycling reaches the ground sheets and zone discs under everything)
  const wPick = (alt, skip, all) => {
    if (!WX0.rset) return null;
    wIndex();
    wLate(1); // v46: anything built since the snapshot is pickable too
    wLus(1); // v46b: and the roadside clutter chunks (tiny flowers, grass, pebbles)
    let sk = skip || 0;
    const seen = new Set(),
      take = (res) => {
        const id = res.mem[0].k;
        if (seen.has(id)) return null;
        seen.add(id);
        return sk-- > 0 ? null : res;
      };
    const fm = new Map();
    foes.forEach((f) => f.edi == null && f.o && f.o.parent && !f.dead && vis(f.o) && fm.set(f.o, f));
    for (const h of rc.intersectObjects(WX0.roots.filter((o) => o.parent).concat([...fm.keys()]), true)) {
      const x = h.object;
      if (!x.isMesh || x.userData.ol || !vis(x)) continue;
      const path = [];
      let r = x;
      while (r && !WX0.rset.has(r) && !fm.has(r)) {
        path.push(r);
        r = r.parent;
      }
      if (!r) continue;
      if (fm.has(r)) {
        const e = wGet("f:" + foes.indexOf(fm.get(r))),
          res = e && take({ d: h.distance, mem: [e] });
        if (res) return res;
        continue;
      }
      if (r.isInstancedMesh) {
        wInst();
        const ks = WX0.ik.get(r),
          e = ks && h.instanceId != null ? wGet("i:" + ks[h.instanceId] + ":" + colOf(r)) : null,
          res = e && take({ d: h.distance, mem: [e] });
        if (res) return res;
        continue;
      }
      let k = WX0.keyOf.get(r);
      while (r.isGroup && path.length && wBig(r)) {
        const c = path.pop();
        k += "/" + r.children.indexOf(c);
        r = c;
      }
      // v46b: a big mesh (road, sidewalk, ground sheet) only with "Big pieces" on
      if (wBig(r) && !((ed.big || all) && r.isMesh)) continue;
      let objs = [r];
      if (r.__rib && !alt) {
        // v46b: a road / river strip: the whole road comes with it (dirt, sidewalks, curbs, water, banks); Alt = this strip
        // v46c: only that part of it: the road itself, or one side's sidewalk + curb + edge line (river: water / a bank)
        const R = r.__rib.R,
          sd = rbSide(r.__rib);
        objs = rdRibbon.all.filter(
          (m) => m.__rib && m.__rib.R === R && rbSide(m.__rib) === sd && m.parent && m.visible && !m.userData.zmHid,
        );
        if (!objs.includes(r)) objs.unshift(r);
      } else if (alt && !r.userData.bk && path.length) {
        const c = path.pop();
        k += "/" + r.children.indexOf(c);
        objs = [c];
      } else if (!alt && r.isMesh && !r.children.some((c) => c.isMesh && !c.userData.ol)) objs = wCluster(r);
      const mem = objs.map((o) => (o === r ? wGet(k) : wGet(keyOfAny(o) || ""))).filter(Boolean),
        res = mem.length && take({ d: h.distance, mem });
      if (res) return res;
    }
    return null;
  };
  // v46b: World objects menu: one entry per kind of thing standing in the world (same make-up, colour and size =
  // same kind), placed as a centred copy of the first one found ("w:<world key>", like Ctrl+C). Instanced scenery
  // (trees, rocks, flowers...) gives one entry per make-up of the whole stack (trunk + layers). Built once, on first open.
  let WCAT = null;
  const ZNM = { hub: "Town", frost: "Frostfen", ember: "Cinderwaste", marsh: "Mirewick", tower: "Tower" },
    GNM = {
      ConeGeometry: "Cone",
      CylinderGeometry: "Post",
      SphereGeometry: "Ball",
      BoxGeometry: "Block",
      DodecahedronGeometry: "Rock",
      IcosahedronGeometry: "Rock",
      OctahedronGeometry: "Crystal",
      TorusGeometry: "Ring",
      PlaneGeometry: "Patch",
      CircleGeometry: "Disc",
    };
  const wCat = () => {
    if (WCAT) return WCAT;
    if (!WX0.rset) return [];
    wIndex();
    wLate(1);
    wLus(1); // also builds the instance spot map
    const out = [],
      seen = new Set(),
      cnt = {},
      sz = new T.Vector3(),
      ctr = new T.Vector3();
    const zl = (x, z) => {
      let k = "";
      try {
        k = zoneAt(x, z);
      } catch (e) {}
      return ZNM[k] ? ZNM[k] + " " : "";
    };
    const add = (base, x, z, k, rad, sig) => {
      if (seen.has(sig)) return;
      seen.add(sig);
      const n0 = zl(x, z) + base;
      cnt[n0] = (cnt[n0] || 0) + 1;
      out.push({ n: n0 + " " + cnt[n0], k: "w:" + k, rad: Math.max(0.3, rad) });
    };
    S.updateMatrixWorld(false);
    WX0.roots.forEach((o) => {
      if (!o.parent || o.isInstancedMesh || o.isLight || o.isSprite || o.isPoints || o.isLine) return;
      if (!o.visible || o.userData.zmHid) return; // hidden scenery (far zones' holders being off is fine)
      let meshes = 0;
      o.traverse((x) => x.isMesh && !x.userData.ol && meshes++);
      if (!meshes || wBig(o)) return;
      const k = WX0.keyOf.get(o);
      if (!k) return;
      BX.setFromObject(o);
      if (BX.isEmpty()) return;
      BX.getSize(sz);
      BX.getCenter(ctr);
      const sig = sigOf(o) + "|" + meshes + "|" + [sz.x, sz.y, sz.z].map((v) => Math.round(v * 2)).join(",");
      let base = "Piece";
      if (o.__rib) {
        const e = rdEnt(o.__rib.R);
        base = e && e[0][0] === "v" ? (o.__rib.o1 - o.__rib.o0 > 10 ? "River water" : "River bank") : "Road strip";
      } else if (HOUSES.some((h) => h.o === o)) base = "House";
      else if (LAMPS.some((l) => l.cg === o || l.s === o)) base = "Lamp";
      else if (CHESTS.some((c) => c.o === o)) base = "Chest";
      else if (o.name && !/^(zone:|luster:|zm:|vill:|wayf:)/.test(o.name)) base = o.name;
      else if (o.userData.bk) base = sz.y > 3 ? "Building" : "Structure";
      else if (o.isMesh && o.geometry) base = GNM[o.geometry.type] || "Piece";
      else if (o.isGroup) base = sz.y > 4 ? "Tall object" : "Object";
      add(base, ctr.x, ctr.z, k, Math.max(sz.x, sz.z) / 2, sig);
    });
    WX0.roots.forEach((m) => {
      if (!m.isInstancedMesh || !m.parent) return;
      const ks = WX0.ik.get(m);
      if (!ks) return;
      const col = colOf(m),
        mt = new T.Matrix4();
      // the first instance that is still standing (squashed ones are hidden scenery)
      let i = -1;
      for (let j = 0; j < m.count && j < ks.length; j++) {
        m.getMatrixAt(j, mt);
        if (mt.elements[0] || mt.elements[1] || mt.elements[2]) {
          i = j;
          break;
        }
      }
      if (i < 0) return;
      const L = WX0.xz.get(ks[i]) || [],
        a = L.find((s) => s.col === col && s.m === m);
      if (!a) return;
      const stack = L.filter((s) => s.i === a.i),
        sig =
          "I|" +
          stack
            .map((s) => s.m.geometry.uuid + s.col)
            .sort()
            .join("+");
      const g = m.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      g.boundingBox.getSize(sz);
      const sc = new T.Vector3().setFromMatrixScale(mt),
        p = new T.Vector3().setFromMatrixPosition(a.wo),
        base = WLU.has(m)
          ? "Flower / grass / pebble"
          : stack.length > 1
            ? "Tree"
            : GNM[g.type] === "Rock"
              ? "Rock"
              : GNM[g.type] === "Cone"
                ? "Pine / spire"
                : "Scenery";
      add(base, p.x, p.z, "i:" + ks[i] + ":" + col, (Math.max(sz.x, sz.z) * Math.max(sc.x, sc.z)) / 2, sig);
    });
    out.sort((a, b) => a.n.localeCompare(b.n, undefined, { numeric: true }));
    if (out.length) WCAT = out;
    return out;
  };
  const wName = () => {
    const m = ed.ws.mem,
      e = m[0];
    let n = "World object";
    if (e.t === "f") n = e.f.nm || e.f.kind;
    else if (e.t === "i")
      n = e.ms[0] && WLU.has(e.ms[0].m) ? "Flower / grass / pebble (one of many)" : "Tree / rock (one of many)";
    else if (e.o && e.o.__rib)
      n =
        (rdEnt(e.o.__rib.R) || [0, 0, "Road"])[2] +
        " - " +
        rbName(e.o.__rib.R, rbSide(e.o.__rib)) +
        (m.length > 1
          ? " (Alt-click = one strip; Road tool N: markers and Width)"
          : " strip (Road tool N: markers and Width)");
    else if (e.pts.some((p) => HOUSES.includes(p.s))) n = "House";
    else if (m.some((e) => e.pts.some((p) => p.lk))) n = "Quest lamp / chest";
    else if (e.o.name) n = e.o.name;
    return n + (m.length > 1 ? " (" + m.length + " parts)" : "") + (m.some((e) => WO[e.k]) ? ", edited" : "");
  };
  // boot: remember the world as it loaded, then put saved edits on it
  const wBoot = () => {
    wSnap();
    let bad = 0;
    Object.keys(WO).forEach((k) => {
      const e = wGet(k);
      if (e) wApply(e);
      else bad++;
    });
    if (bad) console.log("editor: " + bad + " saved world edit(s) wait for objects built later (gates...)");
    // v46: objects built later (gates when a character loads or a gate is rebuilt) get their saved edits when they appear
    setInterval(() => {
      try {
        wLate(0);
        // v46b: edited clutter (tiny flowers...) waits for its chunk: check new chunks while any such edit is unplaced
        let pend = false;
        for (const k in WO)
          if (k[0] === "i" && !WX0.ent.has(k)) {
            pend = true;
            break;
          }
        if (pend) wLus(1);
        rdSync(); // v46b: bent roads (trails and rivers once the lands have moved)
      } catch (er) {
        console.warn("editor late edits", er);
      }
    }, 700);
  };

  /* ---------- tool and selection buttons ---------- */
  const setTool = (t) => {
    if (t !== "road" && ed.list.some((o) => o.g === "wline" && !(Array.isArray(o.rl) && o.rl.length > 1)))
      ed.list = ed.list.filter((o) => o.g !== "wline" || (Array.isArray(o.rl) && o.rl.length > 1)); // v46c: never drawn
    const s0 = ed.sel,
      w0 = ed.ws;
    ed.tool = t;
    ed.sel = -1;
    ed.ws = null;
    ed.xs = [];
    if (t !== "patrol") ed.pf = null;
    if (t !== "road") {
      ed.rr = null;
      ed.rei = -1;
      ed.rtw = false;
      rdrag = false;
    }
    if (t !== "place") ghostHide();
    rebuild();
    // v46c: N with a road part (or a pasted road copy) selected opens its markers straight away
    if (t === "road") {
      const o = ed.list[s0],
        r = w0 && w0.mem[0] && w0.mem[0].o && w0.mem[0].o.__rib;
      if (o && (o.g === "wline" || (o.g === "model" && ribInfo(o.k)))) rdSelectE(s0);
      else if (r) rdSelect(r.R, rbSide(r));
      else if (w0) {
        const id = twIds().find((id) => w0.mem.some((m) => m.o && twAll(id).includes(m.o)));
        if (id) twSelect(id);
      }
    }
  };
  ["place", "select", "grab", "patrol", "road"].forEach((t) =>
    mkb(t[0].toUpperCase() + t.slice(1), () => setTool(t), "edt"),
  );
  // v46b: roads, sidewalks, curbs and ground sheets are one long mesh each (over 60 across), so clicks skip them unless
  // this is on (B key too); otherwise every click on the ground would grab the ground sheet
  const bigTog = () => {
    ed.big = !ed.big;
    toast(
      ed.big ? "Big pieces ON: ground sheets and map-wide decor can be picked" : "Big pieces off",
      ed.big ? "#ffd27a" : "#9fe8d0",
    );
    ui();
  };
  ed.bigB = mkb("Big pieces: off", bigTog, "edt");

  /* ---------- v46c: invisible boundary walls (Walls button / K) ---------- */
  // What stops the player: collision circles (`solids`) and the edge of the walkable ground (okp). With Walls on, the
  // circles near the view show as red posts and the ground's edge as orange lines (okp sampled on a 2-unit grid round
  // the view, redrawn as you fly). A world wall post can be clicked (select tool, or place with nothing armed): drag it,
  // type X/Z/Radius (scroll on Radius), Delete removes it, Reset puts it back. Saved in KEY_solids keyed by where the
  // wall stood once the world had finished loading (today's layout; put on again after the lands have moved). New
  // walls / walkable patches: "Invisible wall" (a row of circles) and "Invisible floor" (walkable through __edWalk) in
  // the Roads menu - editor objects, drawn only while Walls is on.
  let SO = {};
  try {
    SO = JSON.parse(localStorage.getItem(SKEYS.solids) || "{}") || {};
  } catch (e) {}
  const ssave = () => lsPut(SKEYS.solids, SO);
  // v46d: model hitboxes are no longer edited one post at a time (they follow their model). Wall edits saved before
  // (moved / removed posts on fountains, walls, NPCs...) are put back once; a copy stays in KEY_solids + "_bak"
  try {
    if (!localStorage.getItem("duskwick_solids_v2")) {
      localStorage.setItem("duskwick_solids_v2", "1");
      if (Object.keys(SO).length) {
        localStorage.setItem(SKEYS.solids + "_bak", JSON.stringify(SO));
        SO = {};
        ssave();
      }
    }
  } catch (e) {}
  ed.walls = false;
  ed.sw = null; // the selected world wall (a `solids` entry)
  ed.wv = 0; // bumped on every wall change (redraw)
  ed.wl = []; // the walls drawn (instance index → solid)
  const SOH = []; // world walls taken out (Delete), kept so Reset / undo bring them back
  const sKey = (s) => s.__k || (s.__k = [s.x, s.z, s.r].map((v) => Math.round(v * 10) / 10).join(","));
  let soT0 = 0,
    soN = -1;
  const soReady = () => {
    const lands =
      typeof ZMV === "undefined" ||
      !ZMV.live ||
      (ZMV.on && typeof ZMOVE !== "undefined" && ZMOVE.dressed) ||
      performance.now() > 15000;
    if (!lands || document.readyState !== "complete" || (typeof SLOT !== "undefined" && SLOT < 0)) return false;
    if (!soT0) soT0 = performance.now();
    return performance.now() - soT0 > 4000; // after the first-frame tidies (67/69) have dropped theirs
  };
  // put the saved wall edits on (and undone ones off); cheap unless `solids` changed or forced
  const soApply = (force) => {
    if ((!Object.keys(SO).length && !SOH.length && !force) || !soReady()) return;
    if (!force && solids.length === soN) return;
    for (let i = SOH.length - 1; i >= 0; i--) {
      const s = SOH[i],
        w = SO[s.__k];
      if (!w || !w.h) {
        SOH.splice(i, 1);
        solids.push(s);
      }
    }
    const out = [];
    solids.forEach((s) => {
      if (s.ed) return; // editor objects' own
      const w = SO[sKey(s)];
      if (w && w.h) return out.push(s);
      if (w) {
        if (!s.__o0) s.__o0 = [s.x, s.z, s.r];
        s.x = w.x;
        s.z = w.z;
        s.r = w.r;
      } else if (s.__o0) {
        [s.x, s.z, s.r] = s.__o0;
        delete s.__o0;
      }
    });
    out.forEach((s) => {
      solids.splice(solids.indexOf(s), 1);
      SOH.push(s);
      if (ed.sw === s) ed.sw = null;
    });
    soN = solids.length;
    ed.wv++;
  };
  // v46c: copies of world pieces that didn't exist yet when the editor built its objects (they showed as red cubes):
  // build them again once the page has finished loading and again while any are still missing (for about a minute)
  let wMissN = 0,
    wMissL = Infinity;
  setInterval(() => {
    if (!ed.wMiss || wMissN > 6 || document.readyState !== "complete" || gd || wdrag || rdrag) return;
    if (!soReady() || mode !== "explore") return; // lands moved, page done, a few seconds settled; not mid-battle
    const was = ed.wMiss;
    ed.wMiss = 0;
    RIBK.clear();
    try {
      rebuild();
    } catch (e) {
      console.warn("editor late copies", e);
    }
    // stop once a try finds nothing new (what is still missing was really removed from the world)
    if (ed.wMiss >= Math.min(was, wMissL)) wMissN++;
    wMissL = ed.wMiss;
    if (ed.wMiss && wMissN > 6) console.warn("editor: " + ed.wMiss + " copied world pieces could not be found");
  }, 2000);
  setInterval(() => {
    try {
      soApply(false);
      if (ed.on && ed.walls) wallsDraw(false);
    } catch (e) {
      console.warn("editor walls", e);
    }
  }, 700);
  const WG = new T.Group(),
    WCG = new T.CylinderGeometry(1, 1, 1, 16),
    WMAT = new T.MeshBasicMaterial({ color: 0x5aa0ff, transparent: true, opacity: 0.34, depthWrite: false }),
    WSM = new T.Mesh(
      WCG,
      new T.MeshBasicMaterial({
        color: 0xffd27a,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        depthTest: false,
      }),
    ),
    WEM = new T.LineBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.9 });
  WG.name = "edwalls";
  WG.userData.own = 1;
  WSM.renderOrder = 999;
  WSM.raycast = () => {};
  let WIM = null,
    WEL = null,
    wSig = "",
    weSig = "";
  // force = redraw the posts now; noEdge = leave the ground edge as it is (walls being dragged)
  function wallsDraw(force, noEdge) {
    if (!ed.on || !ed.walls) {
      if (WG.parent) S.remove(WG);
      return;
    }
    if (!WG.parent) S.add(WG);
    // the selected wall
    if (ed.sw) {
      WSM.scale.set(ed.sw.r + 0.08, 2.6, ed.sw.r + 0.08);
      WSM.position.set(ed.sw.x, 1.3, ed.sw.z);
      if (!WSM.parent) WG.add(WSM);
    } else if (WSM.parent) WG.remove(WSM);
    // centre = the ground in the middle of the view
    ray({ clientX: innerWidth / 2, clientY: innerHeight / 2 });
    const gp = groundPt(),
      cx = gp && gp.distanceTo(C.position) < 300 ? gp.x : C.position.x,
      cz = gp && gp.distanceTo(C.position) < 300 ? gp.z : C.position.z,
      at = Math.round(cx / 16) + "," + Math.round(cz / 16),
      sig = at + "," + solids.length + "," + ed.wv;
    if (force || sig !== wSig) wallPosts(cx, cz);
    wSig = sig;
    if (noEdge || (!force && weSig === at + "," + ed.ev)) return;
    weSig = at + "," + ed.ev;
    wallEdge(cx, cz);
  }
  function wallPosts(cx, cz) {
    if (WIM) {
      WG.remove(WIM);
      if (WIM.dispose) WIM.dispose();
    }
    // v46d: every hitbox, the editor's own pieces too (blue = read-only: move / resize the model or wall to change it)
    ed.wl = solids.filter((s) => s.r > 0 && Math.abs(s.x - cx) < 150 && Math.abs(s.z - cz) < 150).slice(0, 5000);
    WIM = new T.InstancedMesh(WCG, WMAT, Math.max(1, ed.wl.length));
    WIM.count = ed.wl.length;
    const m4 = new T.Matrix4();
    ed.wl.forEach((s, i) => {
      m4.makeScale(Math.max(0.15, s.r), 2.4, Math.max(0.15, s.r));
      m4.setPosition(s.x, 1.2, s.z);
      WIM.setMatrixAt(i, m4);
    });
    WIM.instanceMatrix.needsUpdate = true;
    WIM.frustumCulled = false;
    WIM.renderOrder = 998;
    WG.add(WIM);
  }
  // edge of the walkable ground: a border wherever a walkable 2-unit cell meets one that isn't
  function wallEdge(cx, cz) {
    if (WEL) {
      WG.remove(WEL);
      WEL.geometry.dispose();
    }
    const G = 2,
      N = 100,
      x0 = Math.round(cx / G) * G - N * G * 0.5,
      z0 = Math.round(cz / G) * G - N * G * 0.5,
      ok = new Uint8Array((N + 1) * (N + 1)),
      pts = [];
    for (let j = 0; j <= N; j++)
      for (let i = 0; i <= N; i++) {
        let v = 0;
        try {
          v = okp(x0 + i * G, z0 + j * G) ? 1 : 0;
        } catch (e) {}
        ok[j * (N + 1) + i] = v;
      }
    for (let j = 0; j <= N; j++)
      for (let i = 0; i <= N; i++) {
        const a = ok[j * (N + 1) + i],
          x = x0 + i * G,
          z = z0 + j * G;
        if (i < N && a !== ok[j * (N + 1) + i + 1]) pts.push(x + G / 2, 0.35, z - G / 2, x + G / 2, 0.35, z + G / 2);
        if (j < N && a !== ok[(j + 1) * (N + 1) + i]) pts.push(x - G / 2, 0.35, z + G / 2, x + G / 2, 0.35, z + G / 2);
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    WEL = new T.LineSegments(g, WEM);
    WEL.raycast = () => {};
    WEL.frustumCulled = false;
    WG.add(WEL);
  }
  // editor walls / floors are only drawn while Walls is on (never in the game)
  const wallsVis = () =>
    ed.meshes.forEach((m) => {
      if (m.userData.inv) m.visible = !!(ed.on && ed.walls);
    });
  const wallsTog = (v) => {
    ed.walls = v == null ? !ed.walls : !!v;
    if (!ed.walls) ed.sw = null;
    toast(
      ed.walls
        ? "Walls ON: blue posts = model hitboxes (they move and grow with their model), orange lines = edge of walkable ground, red = your invisible walls"
        : "Walls off",
      ed.walls ? "#ffd27a" : "#9fe8d0",
    );
    wSig = "";
    wallsVis();
    wallsDraw(true);
    ui();
  };
  ed.wallB = mkb("Walls: off", () => wallsTog(), "edt");
  ed.wallB.title = "Show and edit the invisible walls (K)";

  /* ---------- v46: invisible teleporters (Teleporters button / J) ---------- */
  // Shows every loading zone in PT (shop doors, room doors, arches, swirls, dungeon doors, your own teleporters) as a
  // ring the size of its trigger, a line to where it lands and a disc there (violet = yours, gold = the world's, grey =
  // locked or a walk-through arch). "Invisible teleporter" in the Roads menu adds one: select it to set where it goes.
  ed.tps = false;
  ed.tpPick = false;
  const TPG = new T.Group();
  TPG.name = "edtps";
  TPG.userData.own = 1;
  let tpSig = "";
  const tpDraw = (force) => {
    if (!ed.on || !ed.tps) {
      if (TPG.parent) S.remove(TPG);
      tpSig = "";
      return;
    }
    if (!TPG.parent) S.add(TPG);
    const near = PT.filter(
      (q) => Math.abs(q.x - C.position.x) < 260 && Math.abs(q.z - C.position.z) < 260 && Math.abs(q.x) < 1e5,
    );
    const sig = near.map((q) => [q.x, q.z, q.to ? q.to.join() : "", q.rad || 0].join()).join("|");
    if (!force && sig === tpSig) return;
    tpSig = sig;
    while (TPG.children.length) {
      const c = TPG.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    const top = (m) => {
      m.renderOrder = 997;
      m.raycast = () => {};
      m.frustumCulled = false;
      TPG.add(m);
      return m;
    };
    near.forEach((q) => {
      let lk = false;
      try {
        lk = !!(q.lock && q.lock());
      } catch (e) {}
      const col = q.edp ? 0xc08aff : lk || q.wk ? 0x8a8a9a : 0xffd27a,
        r = q.rad || 2.2,
        ring = top(
          new T.Mesh(
            new T.RingGeometry(Math.max(0.1, r - 0.25), r, 40),
            new T.MeshBasicMaterial({
              color: col,
              transparent: true,
              opacity: 0.85,
              depthTest: false,
              side: T.DoubleSide,
            }),
          ),
        );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(q.x, 0.15, q.z);
      if (!q.to || q.wk) return;
      top(
        new T.Line(
          new T.BufferGeometry().setFromPoints([new T.Vector3(q.x, 0.6, q.z), new T.Vector3(q.to[0], 0.6, q.to[1])]),
          new T.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7, depthTest: false }),
        ),
      );
      const d = top(
        new T.Mesh(
          new T.CircleGeometry(0.8, 20),
          new T.MeshBasicMaterial({
            color: col,
            transparent: true,
            opacity: 0.6,
            depthTest: false,
            side: T.DoubleSide,
          }),
        ),
      );
      d.rotation.x = -Math.PI / 2;
      d.position.set(q.to[0], 0.2, q.to[1]);
      // which way you face on landing
      const a = q.to[2] || 0,
        ar = top(
          new T.Line(
            new T.BufferGeometry().setFromPoints([
              new T.Vector3(q.to[0], 0.25, q.to[1]),
              new T.Vector3(q.to[0] + Math.sin(a) * 1.6, 0.25, q.to[1] + Math.cos(a) * 1.6),
            ]),
            new T.LineBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }),
          ),
        );
      ar.userData.k = 1;
    });
  };
  setInterval(() => ed.on && ed.tps && tpDraw(false), 500);
  const tpsVis = () =>
    ed.meshes.forEach((m) => {
      if (m.userData.tpv) m.visible = !!(ed.on && ed.tps);
    });
  const tpsTog = (v) => {
    ed.tps = v == null ? !ed.tps : !!v;
    if (!ed.tps) ed.tpPick = false;
    toast(
      ed.tps
        ? "Teleporters ON: rings = where they trigger, lines = where they take you (violet = yours, gold = the world's)"
        : "Teleporters off",
      ed.tps ? "#ffd27a" : "#9fe8d0",
    );
    tpsVis();
    tpDraw(true);
    ui();
  };
  window.__tpsTog = tpsTog;
  ed.tpB = mkb("Teleporters: off", () => tpsTog(), "edt");
  ed.tpB.title = "Show the invisible teleporters, and set where yours go (J)";
  const tpan = document.createElement("div");
  tpan.style.cssText = "display:none;margin:0 0 6px;padding:6px;border:1px solid #c08aff88;border-radius:8px";
  tpan.innerHTML =
    '<div id="edti" style="color:#d8b8ff;margin-bottom:4px"></div>' +
    '<div id="edtr">Goes to X <input id="edtx" type="number" step=".5" style="width:62px"> Z <input id="edtz" type="number" step=".5" style="width:62px"> Facing° <input id="edta" type="number" step="15" style="width:52px"></div>' +
    '<div id="edtb" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px"></div>';
  q("edrt").parentNode.insertBefore(tpan, q("edrt").nextSibling);
  const tpO = () => {
    const o = ed.list[ed.sel];
    return o && o.g === "tport" ? o : null;
  };
  const tpSet = (fn) => {
    const o = tpO();
    if (!o) return;
    push();
    if (!Array.isArray(o.to)) o.to = [o.x, o.z + 12, 0];
    fn(o.to);
    o.to = [r2(o.to[0]), r2(o.to[1]), Math.round((o.to[2] || 0) * 1e4) / 1e4];
    rebuild();
  };
  q("edtx").onchange = () => tpSet((t) => (t[0] = +q("edtx").value || t[0]));
  q("edtz").onchange = () => tpSet((t) => (t[1] = +q("edtz").value || t[1]));
  q("edta").onchange = () => tpSet((t) => (t[2] = ((+q("edta").value || 0) * Math.PI) / 180));
  mkb(
    "Pick where it goes",
    () => {
      if (!tpO()) return;
      ed.tpPick = !ed.tpPick;
      if (ed.tpPick) toast("Click the ground where the teleporter should take you", "#9fe8d0");
      ui();
    },
    "edtb",
  );
  mkb(
    "Go there",
    () => {
      const o = tpO();
      if (!o || !o.to) return;
      C.position.set(o.to[0], C.position.y, o.to[1] + 14);
      tpDraw(true);
    },
    "edtb",
  );
  mkb(
    "Make a way back",
    () => {
      // a second teleporter at the landing spot that brings you back beside this one
      const o = tpO();
      if (!o || !o.to) return;
      push();
      const a = o.to[2] || 0,
        bx = r2(o.to[0] + Math.sin(a) * -3),
        bz = r2(o.to[1] + Math.cos(a) * -3);
      ed.list.push({
        g: "tport",
        x: bx,
        y: 0,
        z: bz,
        r: 0,
        s: o.s.slice(),
        c: o.c,
        sl: 0,
        to: [r2(o.x + 4), r2(o.z + 4), 0],
      });
      o.to = [r2(o.to[0] + Math.sin(a) * 2), r2(o.to[1] + Math.cos(a) * 2), a]; // land clear of the return pad
      rebuild();
      toast("Return teleporter added at the landing spot (move them apart if you land on it)", "#9fe8d0");
    },
    "edtb",
  );
  // a click while picking sets the destination of the selected teleporter
  const tpDown = () => {
    if (!ed.tpPick) return false;
    const o = tpO();
    ed.tpPick = false;
    const p = groundPt();
    if (!o || !p) {
      ui();
      return true;
    }
    tpSet((t) => {
      t[0] = p.x;
      t[1] = p.z;
    });
    toast("Destination set", "#9fe8d0");
    return true;
  };
  function tpUi() {
    if (!ed.tpOK) return;
    ed.tpB.textContent = "Teleporters: " + (ed.tps ? "ON" : "off");
    ed.tpB.style.outline = ed.tps ? "2px solid #c08aff" : "";
    const o = tpO();
    tpan.style.display = ed.tps && o ? "block" : "none";
    if (!o) return;
    q("edti").textContent = ed.tpPick
      ? "Click the ground where it should take you..."
      : "Invisible teleporter #" + ed.sel + ": walk into the violet disc to go to the dot. Size = trigger area.";
    const t = o.to || [o.x, o.z + 12, 0];
    [
      ["edtx", r2(t[0])],
      ["edtz", r2(t[1])],
      ["edta", Math.round(((t[2] || 0) * 180) / Math.PI)],
    ].forEach(([id, v]) => {
      if (document.activeElement !== q(id)) q(id).value = v;
    });
  }
  ed.tpOK = 1;
  // the wall panel (X / Z / Radius of the selected world wall)
  const wpan = document.createElement("div");
  wpan.style.cssText = "display:none;margin:0 0 6px;padding:6px;border:1px solid #ff4a4a88;border-radius:8px";
  wpan.innerHTML =
    '<div id="edwi" style="color:#ff9a8a;margin-bottom:4px"></div>' +
    '<div id="edwr">X <input id="edwx" type="number" step=".1" style="width:62px"> Z <input id="edwz" type="number" step=".1" style="width:62px"> Radius <input id="edwq" type="number" step=".05" min=".05" title="Scroll to grow/shrink" style="width:52px"></div>' +
    '<div id="edwb" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px"></div>';
  q("edrt").parentNode.insertBefore(wpan, q("edrt").nextSibling);
  const wInX = q("edwx"),
    wInZ = q("edwz"),
    wInR = q("edwq");
  // change the selected wall (one undo step per change; wheel changes within 800 ms count as one)
  let wPushT = 0;
  const wallSet = (fn, quiet) => {
    const s = ed.sw;
    if (!s) return;
    if (!quiet || performance.now() - wPushT > 800) push();
    wPushT = performance.now();
    const k = sKey(s);
    if (!s.__o0) s.__o0 = [s.x, s.z, s.r];
    fn(s);
    s.r = Math.max(0.05, r2(s.r));
    s.x = r2(s.x);
    s.z = r2(s.z);
    SO[k] = { x: s.x, z: s.z, r: s.r };
    ssave();
    ed.wv++;
    wallsDraw(true, true);
    ui();
  };
  wInX.onchange = () => wallSet((s) => (s.x = +wInX.value || s.x));
  wInZ.onchange = () => wallSet((s) => (s.z = +wInZ.value || s.z));
  wInR.onchange = () => wallSet((s) => (s.r = +wInR.value || s.r));
  wInR.addEventListener(
    "wheel",
    (e) => {
      if (!ed.sw) return;
      e.preventDefault();
      const k = (e.shiftKey ? 1.25 : e.ctrlKey ? 1.01 : 1.05) ** (e.deltaY < 0 ? 1 : -1);
      wallSet((s) => (s.r *= k), true);
    },
    { passive: false },
  );
  const wallDel = () => {
    const s = ed.sw;
    if (!s) return;
    push();
    const k = sKey(s);
    if (!s.__o0) s.__o0 = [s.x, s.z, s.r];
    SO[k] = { h: 1 };
    ssave();
    const i = solids.indexOf(s);
    if (i >= 0) solids.splice(i, 1);
    SOH.push(s);
    ed.sw = null;
    ed.wv++;
    wallsDraw(true);
    ui();
    toast("Wall removed (Ctrl+Z brings it back)", "#9fe8d0");
  };
  // v46c: draw a new invisible wall like a road: click its markers in order, then OK (Road tool)
  mkb(
    "Draw wall path",
    () => {
      ray({ clientX: innerWidth / 2, clientY: innerHeight / 2 });
      const p = groundPt() || C.position;
      push();
      ed.list.push({ g: "wline", x: r2(p.x), y: 0, z: r2(p.z), r: 0, s: [1, 3, 0.8], c: "#ff4a4a", sl: 0, rl: [] });
      const i = ed.list.length - 1;
      setTool("road");
      rdSelectE(i);
      toast("Click the wall's markers in order along the ground, then OK (Enter)", "#9fe8d0");
    },
    "edwb",
  );
  // v46d: hitboxes are read-only unless this is on (then a blue post can be clicked, dragged, typed, deleted, reset)
  ed.postEdit = false;
  const peB = mkb(
    "Edit hitboxes: off",
    () => {
      ed.postEdit = !ed.postEdit;
      if (!ed.postEdit) ed.sw = null;
      WMAT.color.setHex(ed.postEdit ? 0xff4a4a : 0x5aa0ff);
      toast(
        ed.postEdit
          ? "Edit hitboxes ON: click a post to drag it, type X / Z / Radius, Del removes it, Reset puts it back"
          : "Edit hitboxes off: hitboxes follow their models again (your changes stay saved)",
        ed.postEdit ? "#ffd27a" : "#9fe8d0",
      );
      wallsDraw(true);
      ui();
    },
    "edwb",
  );
  ed.peB = peB;
  const hbB = [
    mkb("Delete hitbox", () => wallDel(), "edwb"),
    mkb(
      "Reset hitbox",
      () => {
        const s = ed.sw;
        if (!s) return;
        push();
        delete SO[sKey(s)];
        ssave();
        if (s.__o0) {
          [s.x, s.z, s.r] = s.__o0;
          delete s.__o0;
        }
        ed.wv++;
        wallsDraw(true);
        ui();
      },
      "edwb",
    ),
  ];
  ed.hbB = hbB;
  mkb(
    "Bring back all removed",
    () => {
      const ks = Object.keys(SO).filter((k) => SO[k].h);
      if (!ks.length) return toast("No walls have been removed", "#9fe8d0");
      push();
      ks.forEach((k) => delete SO[k]);
      ssave();
      soApply(true);
      wallsDraw(true);
      ui();
      toast(ks.length + " wall" + (ks.length > 1 ? "s" : "") + " back", "#9fe8d0");
    },
    "edwb",
  );
  function wallUi() {
    if (!ed.wpOK) return; // the walls section hasn't run yet
    if (ed.wallB) {
      ed.wallB.textContent = "Walls: " + (ed.walls ? "ON" : "off");
      ed.wallB.style.outline = ed.walls ? "2px solid #ff4a4a" : "";
    }
    wpan.style.display = ed.walls && (ed.tool === "select" || ed.tool === "place") ? "block" : "none";
    const s = ed.sw,
      edited = Object.keys(SO).length;
    if (ed.peB) {
      ed.peB.textContent = "Edit hitboxes: " + (ed.postEdit ? "ON" : "off");
      ed.peB.style.outline = ed.postEdit ? "2px solid #ff4a4a" : "";
      ed.hbB.forEach((b) => (b.style.display = ed.postEdit ? "" : "none"));
    }
    q("edwi").textContent = ed.postEdit
      ? s
        ? "Hitbox at " +
          r2(s.x) +
          ", " +
          r2(s.z) +
          (SO[sKey(s)] ? " (edited)" : "") +
          " - drag it, type below, Del removes it"
        : "Click a red post to edit that hitbox." +
          (edited ? " " + edited + " hitbox edit" + (edited > 1 ? "s" : "") + " saved." : "")
      : "Boundaries: Draw wall path, or Invisible wall / Invisible floor in the Roads menu (click a red wall to " +
        "move, reshape (N) or delete it). Blue posts are model hitboxes: they follow their model. " +
        "Turn on Edit hitboxes to move them yourself." +
        (edited ? " " + edited + " hitbox edit" + (edited > 1 ? "s" : "") + " saved." : "");
    q("edwr").style.display = s ? "" : "none";
    [
      [wInX, s && s.x],
      [wInZ, s && s.z],
      [wInR, s && s.r],
    ].forEach(([el, v]) => {
      if (document.activeElement !== el) el.value = s ? r2(v) : "";
    });
  }
  ed.wpOK = 1;
  // clicks: a post under the cursor is picked (and dragged); elsewhere the wall selection lets go
  let wdrag = null;
  const wallDown = (e) => {
    // v46d: model hitboxes are read-only (a click goes through to the model / wall piece under it)
    if (!ed.postEdit) {
      if (ed.sw) {
        ed.sw = null;
        wallsDraw(false);
        ui();
      }
      return false;
    }
    const h = WIM && ed.wl.length ? rc.intersectObject(WIM, false)[0] : null,
      s = h && h.instanceId != null ? ed.wl[h.instanceId] : null;
    // (editor pieces' own circles are laid again on every rebuild: change those by editing the piece)
    if (!s || s.ed || !solids.includes(s)) {
      if (ed.sw) {
        ed.sw = null;
        wallsDraw(false);
        ui();
      }
      return false;
    }
    ed.sel = -1;
    ed.ws = null;
    ed.xs = [];
    ed.sw = s;
    selShow();
    const p = groundPt();
    push();
    wdrag = { s, dx: p ? s.x - p.x : 0, dz: p ? s.z - p.z : 0, mv: false };
    wallsDraw(false);
    ui();
    return true;
  };
  const wallMove = (e) => {
    if (!wdrag) return false;
    ray(e);
    const p = groundPt();
    if (p) {
      const s = wdrag.s;
      if (!wdrag.mv) {
        sKey(s);
        if (!s.__o0) s.__o0 = [s.x, s.z, s.r];
      }
      wdrag.mv = true;
      const q2 = ed.grid ? snapXZ(new T.Vector3(p.x + wdrag.dx, 0, p.z + wdrag.dz)) : [p.x + wdrag.dx, p.z + wdrag.dz];
      s.x = r2(q2[0]);
      s.z = r2(q2[1]);
      ed.wv++;
      wallsDraw(true, true);
    }
    return true;
  };
  const wallUp = () => {
    if (!wdrag) return;
    const { s, mv } = wdrag;
    wdrag = null;
    if (!mv) return ed.hist.pop(); // just picked it
    SO[sKey(s)] = { x: s.x, z: s.z, r: s.r };
    ssave();
    ui();
  };
  const NOSEL = "Click an object to select it first";
  // rotate the selection, or (nothing selected) the next placement and its ghost
  const rot = (d) => {
    if (hasSel()) return edit((o) => (o.r = Math.round(((o.r || 0) + d) * 1e5) / 1e5));
    if (ed.pn) {
      ed.rot = (ed.rot || 0) + d;
      if (ghost) ghost.rotation.y = ed.g === "glow" ? 0 : ed.rot;
      return;
    }
    toast(NOSEL, "#ff8a8a");
  };
  const grow = (k) => {
    if (!hasSel()) return toast(NOSEL, "#ff8a8a");
    edit((o) => (o.s = o.s.map((v) => Math.max(0.05, v * k))));
  };
  const desel = () => {
    ed.sel = -1;
    ed.ws = null;
    ed.xs = [];
    selShow();
    ui();
  };
  const variant = () => {
    if (ed.ws) return toast("World objects have no variants", "#ff8a8a");
    if (isMulti()) return toast("Select one piece to change its variant", "#ff8a8a");
    const o = ed.list[ed.sel];
    if (o) {
      if (o.g !== "kit" || !o.ka || o.ka.i == null) return toast("This piece has no variants", "#ff8a8a");
      edit((o) => (o.ka.i = (o.ka.i | 0) + 1));
    } else if (ed.g === "kit" && ed.ka && ed.ka.i != null) {
      ed.ka.i = (ed.ka.i | 0) + 1;
      toast("Next placement uses variant " + (ed.ka.i + 1), "#9fe8d0");
    }
  };
  const del = () => {
    if (isMulti()) {
      // v46: a group: world parts are hidden (quest lamps/chests are kept), editor pieces are deleted
      push();
      let kept = 0;
      if (ed.ws)
        ed.ws.mem.forEach((e) => {
          if (e.pts.some((p) => p.lk)) return kept++;
          wSet(e, Object.assign({}, WO[e.k] || {}, { h: 1 }));
        });
      ed.xs
        .slice()
        .sort((a, b) => b - a)
        .forEach((i) => ed.list.splice(i, 1));
      ed.ws = null;
      ed.xs = [];
      ed.sel = -1;
      wsave();
      rebuild();
      toast("Deleted" + (kept ? " (quest lamps / chests can only be moved, they stayed)" : ""), "#9fe8d0");
      return;
    }
    if (ed.ws) return wHide();
    if (ed.sel < 0) return toast(NOSEL, "#ff8a8a");
    push();
    ed.list.splice(ed.sel, 1);
    ed.sel = -1;
    rebuild();
  };
  /* v46: Ctrl+C / Ctrl+V. The clipboard holds editor-object records ({o, dx, dz} round the copy's middle); a world
     object is copied as a "model" build that points at it ("w:<world edit key>", see tplOf), a world foe as an
     editor foe of the same kind. Pasted pieces are ordinary editor objects (saved with the build). */
  const clipOfWorld = (e) => {
    if (e.t === "f") {
      const f = e.f,
        a = wCurA(e);
      return {
        g: "foe",
        f: [f.kind, f.t, f.big ? 1 : 0],
        s: [1, 1, 1],
        c: W0,
        el: f.edEl || "r",
        bs: f.boss ? 1 : 0,
        x: a.x,
        y: 0,
        z: a.z,
        r: 0,
      };
    }
    return clipOfParts([e]);
  };
  // v46: world parts (not foes) copied as ONE model, so the copy moves as a whole
  const clipOfParts = (L) => {
    if (!L.length) return null;
    const e = L[0],
      k = "w:" + L.map((x) => x.k).join("|"),
      t = tplOf(k);
    if (!t) return null;
    const bb = new T.Box3().setFromObject(t),
      sz = bb.getSize(new T.Vector3()),
      w = WO[e.k] || {},
      sc = w.s || 1;
    // where it stands now: the box round the visible parts (the template is centred on its box too)
    const nb = new T.Box3();
    L.forEach((x) => {
      if (x.t === "o" && x.o.visible) nb.union(new T.Box3().setFromObject(x.o));
      else nb.expandByPoint(wCurA(x));
    });
    const at = nb.isEmpty() ? wCurA(e) : nb.getCenter(new T.Vector3());
    return {
      g: "model",
      k,
      ctr: 1,
      rad: r2(Math.max(0.3, Math.max(sz.x, sz.z) / 2)),
      s: [sc, sc, sc],
      c: W0,
      sl: sz.y > 1.2 && Math.max(sz.x, sz.z) > 0.6 ? 1 : 0,
      x: at.x,
      y: (w.d && w.d[1]) || 0,
      z: at.z,
      r: r3(w.r || 0),
    };
  };
  // v46b: place the armed saved piece with its middle at (x, z), turned by the placing turn (R / Q / E)
  const placePre = (x, y, z) => {
    const L = ed.pre || [];
    if (!L.length) return;
    const a = ed.rot || 0,
      c = Math.cos(a),
      s = Math.sin(a),
      tf = (px, pz) => [r2(x + px * c + pz * s), r2(z - px * s + pz * c)]; // same turn as rotation.y = a
    push();
    const i0 = ed.list.length;
    L.forEach((o) => {
      const n = cp(o);
      [n.x, n.z] = tf(o.x || 0, o.z || 0);
      n.y = n.g === "foe" ? 0 : r2((o.y || 0) + y);
      if (n.g !== "glow") n.r = Math.round(((o.r || 0) + a) * 1e5) / 1e5;
      if (Array.isArray(n.p)) n.p = n.p.map((q) => tf(q[0], q[1]).concat(q.slice(2)));
      ed.list.push(n);
    });
    ed.ws = null;
    ed.xs = L.length > 1 ? L.map((_, j) => i0 + j) : [];
    ed.sel = L.length > 1 ? -1 : ed.list.length - 1;
    rebuild();
  };
  // v46b: "Save to menu": the selection (anything Ctrl+C can copy) is saved under a name in a menu category
  const saveSel = () => {
    const L = selPieces();
    if (!L) return;
    const nm = prompt("Name for this piece in the menu:", L.length > 1 ? "My building" : nameOf(L[0]));
    if (nm == null || !nm.trim()) return;
    const ct = prompt(
      "Category: Buildings, Props, Nature, Lamps, Landmarks, Roads... or type a new category name:",
      ed.svCat || "Buildings",
    );
    if (ct == null) return;
    const cat = catKey(ct),
      cx = L.reduce((a, o) => a + o.x, 0) / L.length,
      cz = L.reduce((a, o) => a + o.z, 0) / L.length,
      y0 = Math.min(...L.map((o) => (o.g === "foe" ? 0 : o.y || 0))),
      pre = L.map((o) => {
        const n = cp(o);
        n.x = r2(o.x - cx);
        n.z = r2(o.z - cz);
        n.y = r2((o.y || 0) - y0);
        if (Array.isArray(n.p)) n.p = n.p.map((q) => [r2(q[0] - cx), r2(q[1] - cz)].concat(q.slice(2)));
        return n;
      });
    ed.svCat = cat;
    lib.push({
      id: Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      n: nm.trim().slice(0, 40),
      cat,
      pre,
    });
    lsPut(LKEY, lib);
    catSync();
    showCat(cat);
    toast(
      'Saved "' +
        nm.trim() +
        '" under ' +
        (CATS.find((c) => c[0] === cat) || [0, cat])[1] +
        " - click it to place copies",
      "#9fe8d0",
    );
  };
  // the editor records Ctrl+C would copy from the selection (null + a toast when there's nothing)
  const selPieces = () => {
    let L = [];
    if (ed.ws) {
      L = ed.ws.mem
        .filter((e) => e.t === "f")
        .map(clipOfWorld)
        .filter(Boolean);
      const pc = clipOfParts(ed.ws.mem.filter((e) => e.t !== "f"));
      if (pc) L.push(pc);
    }
    ed.xs.forEach((i) => ed.list[i] && L.push(cp(ed.list[i])));
    if (ed.list[ed.sel]) L.push(cp(ed.list[ed.sel]));
    if (!L.length) return toast(ed.ws ? "That object can't be saved" : NOSEL, "#ff8a8a"), null;
    return L;
  };
  const copySel = () => {
    let L = [];
    if (ed.ws) {
      // foes one by one, every other world part together as one piece
      L = ed.ws.mem
        .filter((e) => e.t === "f")
        .map(clipOfWorld)
        .filter(Boolean);
      const pc = clipOfParts(ed.ws.mem.filter((e) => e.t !== "f"));
      if (pc) L.push(pc);
    }
    ed.xs.forEach((i) => ed.list[i] && L.push(cp(ed.list[i])));
    if (ed.list[ed.sel]) L.push(cp(ed.list[ed.sel]));
    if (!L.length) return toast(ed.ws ? "That object can't be copied" : NOSEL, "#ff8a8a"), false;
    const cx = L.reduce((a, o) => a + o.x, 0) / L.length,
      cz = L.reduce((a, o) => a + o.z, 0) / L.length;
    ed.clip = { cx, cz, L: L.map((o) => ({ o, dx: o.x - cx, dz: o.z - cz })) };
    toast(
      "Copied " + (L.length > 1 ? L.length + " pieces" : nameOf(L[0])) + " - Ctrl+V pastes at the cursor",
      "#9fe8d0",
    );
    return true;
  };
  // at = [x, z] for the copy's middle; default = the ground under the cursor, else beside the original
  const pasteClip = (at) => {
    const c = ed.clip;
    if (!c) return toast("Copy something first (select it, Ctrl+C)", "#ff8a8a");
    let x, z;
    if (at) [x, z] = at;
    else {
      let p = null;
      if (ed.mx >= 0) {
        ray({ clientX: ed.mx, clientY: ed.my });
        p = groundPt();
      }
      if (p && p.distanceTo(C.position) < 400) [x, z] = ed.grid ? snapXZ(p) : [r2(p.x), r2(p.z)];
      else [x, z] = [c.cx + 2, c.cz + 2];
    }
    push();
    const i0 = ed.list.length;
    c.L.forEach(({ o, dx, dz }) => {
      const n = cp(o),
        ox = r2(x + dx) - o.x,
        oz = r2(z + dz) - o.z;
      n.x = r2(x + dx);
      n.z = r2(z + dz);
      if (Array.isArray(n.p)) n.p = n.p.map(([px, pz]) => [r2(px + ox), r2(pz + oz)]);
      ed.list.push(n);
    });
    ed.ws = null;
    // the pasted pieces are selected (several = a group, so they move together)
    ed.xs = c.L.length > 1 ? c.L.map((_, j) => i0 + j) : [];
    ed.sel = c.L.length > 1 ? -1 : ed.list.length - 1;
    rebuild();
    toast("Pasted" + (c.L.length > 1 ? " " + c.L.length + " pieces" : ""), "#9fe8d0");
  };
  const dup = () => {
    if (ed.ws || isMulti()) {
      // a world object: copy it and paste the copy a little to the side
      const keep = ed.clip;
      if (!copySel()) return;
      pasteClip([ed.clip.cx + 2, ed.clip.cz + 2]);
      ed.clip = keep || ed.clip;
      return;
    }
    const o = ed.list[ed.sel];
    if (!o) return toast(NOSEL, "#ff8a8a");
    push();
    const n = cp(o);
    n.x = o.x + ST * 4;
    n.z = o.z + ST * 4;
    if (Array.isArray(n.p)) n.p = n.p.map(([x, z]) => [x + ST * 4, z + ST * 4]);
    ed.list.push(n);
    ed.sel = ed.list.length - 1;
    rebuild();
  };
  const rsr = () => (ed.rs * Math.PI) / 180;
  ed.rotB = [mkb("⟲ 15°", () => rot(rsr()), "eds"), mkb("⟳ 15°", () => rot(-rsr()), "eds")];
  mkb("Bigger", () => grow(1.1), "eds");
  mkb("Smaller", () => grow(1 / 1.1), "eds");
  mkb("Variant", variant, "eds");
  mkb("Duplicate", () => dup(), "eds");
  mkb("Save to menu", saveSel, "eds").title =
    "Save what's selected under a name in a menu category (Buildings, or your own)";
  mkb("Delete", del, "eds");
  mkb("Reset", wReset, "eds");
  mkb(
    "Patrol",
    () => {
      const w = ed.ws && ed.ws.mem.length === 1 && ed.ws.mem[0].t === "f" ? ed.ws.mem[0].f : null;
      if (w) {
        setTool("patrol");
        return pselect(w);
      }
      const o = ed.list[ed.sel];
      if (!o || o.g !== "foe") return toast("Select an enemy first (or use the Patrol tool)", "#ff8a8a");
      const i = ed.sel;
      setTool("patrol");
      const f = ed.foes.find((f) => f.edi === i);
      if (f) pselect(f);
    },
    "eds",
  );
  mkb("Save to game", () => fsWrite(1), "edb");
  mkb("Undo", undo, "edb");
  mkb("Unhide all", wUnhide, "edb");
  mkb("Reset world", wResetAll, "edb");
  mkb(
    "Export",
    () => {
      const j = JSON.stringify(ed.list);
      try {
        navigator.clipboard.writeText(j);
        toast("Build copied to clipboard", "#9fe8d0");
      } catch (e) {
        prompt("Copy this build:", j);
      }
    },
    "edb",
  );
  mkb(
    "Import",
    () => {
      const t = prompt("Paste build JSON:");
      if (!t) return;
      try {
        const a = JSON.parse(t);
        if (Array.isArray(a)) {
          push();
          ed.list = a;
          ed.sel = -1;
          rebuild();
        }
      } catch (e) {
        toast("That is not a valid build", "#ff8a8a");
      }
    },
    "edb",
  );
  mkb(
    "Clear all",
    () => {
      if (confirm("Delete ALL built objects?")) {
        push();
        ed.list = [];
        ed.sel = -1;
        rebuild();
      }
    },
    "edb",
  );
  [sx, sy, sz].forEach(
    (el, i) =>
      (el.oninput = () => {
        const v = Math.max(0.02, +el.value || 1);
        if (ed.ws) {
          // world objects only grow evenly: any box sets the size factor
          const c = wScale();
          edit((o) => (o.s = [v / c, v / c, v / c]));
        } else if (ed.sel >= 0)
          edit((o) => {
            o.s[i] = v;
          });
        else {
          ed.s[i] = v;
          ui();
        }
      }),
  );
  // v46b: one box for all three sizes (grows evenly)
  sa.oninput = () => {
    const v = Math.max(0.02, +sa.value || 1);
    if (isMulti())
      edit((o) => (o.s = [v, v, v])); // a group: grow by that factor
    else if (ed.ws) {
      const c = wScale();
      edit((o) => (o.s = [v / c, v / c, v / c]));
    } else if (ed.sel >= 0) edit((o) => (o.s = [v, v, v]));
    else {
      ed.s = [v, v, v];
      ui();
    }
  };
  // v46b: scroll over a number box to change it: sizes grow/shrink by 5%, Pos by the move step, Turn by the turn step
  // (Shift = 10x, Ctrl = 1/10). Scrolling one box keeps a single undo step.
  let whEl = null,
    whT = 0;
  const wheelNum = (el0, next) =>
    el0.addEventListener(
      "wheel",
      (e) => {
        // a group has one size: any size box scrolls the "all" box
        const el = isMulti() && [sx, sy, sz].includes(el0) ? sa : el0;
        if (!ed.on || el.disabled) return;
        e.preventDefault();
        const dl = e.deltaY || e.deltaX;
        if (!dl) return;
        const dir = dl < 0 ? 1 : -1,
          k = e.shiftKey ? 10 : e.ctrlKey ? 0.1 : 1,
          v = next(el.value === "" ? NaN : +el.value, dir, k);
        if (!isFinite(v)) return;
        const now = performance.now(),
          same = whEl === el && now - whT < 800,
          h0 = ed.hist.length;
        whEl = el;
        whT = now;
        el.value = String(v);
        (el.oninput || el.onchange)();
        if (same && ed.hist.length > h0) ed.hist.pop();
      },
      { passive: false },
    );
  const growV = (v, dir, k) => {
    if (!isFinite(v) || isMulti()) v = 1; // a group grows by a factor each notch
    const f = 1 + 0.05 * Math.min(k, 5);
    return Math.max(0.02, Math.round(v * (dir > 0 ? f : 1 / f) * 1000) / 1000);
  };
  [sx, sy, sz, sa].forEach((el) => wheelNum(el, growV));
  [epx, epy, epz].forEach((el) => wheelNum(el, (v, dir, k) => (isFinite(v) ? r2(v + dir * ed.mv * k) : NaN)));
  wheelNum(epr, (v, dir, k) => (isFinite(v) ? Math.round((v + dir * ed.rs * k) * 1000) / 1000 : NaN));
  // v46: type an exact spot / turn for the selection (Enter or leaving the box applies it)
  [epx, epy, epz].forEach(
    (el, i) =>
      (el.onchange = () => {
        const v = +el.value;
        if (!isFinite(v) || el.value === "" || !hasSel()) return ui();
        edit((o) => (o["xyz"[i]] = r2(v)));
      }),
  );
  epr.onchange = () => {
    const v = +epr.value;
    if (!isFinite(v) || epr.value === "" || !hasSel()) return ui();
    const a = Math.round(((v * Math.PI) / 180) * 1e5) / 1e5;
    // editor objects take the angle; world objects get the difference from how far they are turned now; a group turns
    // by the angle typed
    edit((o) => (o.r = ed.ws && !isMulti() ? a - wTurn() : a));
  };
  const stepSet = () => {
    ed.mv = +emv.value || ST;
    ed.rs = +ers.value || 15;
    try {
      localStorage.setItem("duskwick_edstep", JSON.stringify([ed.mv, ed.rs]));
    } catch (e) {}
    ui();
  };
  try {
    const s = JSON.parse(localStorage.getItem("duskwick_edstep") || "null");
    if (Array.isArray(s)) {
      emv.value = String(s[0]);
      ers.value = String(s[1]);
      if (emv.value) ed.mv = +emv.value;
      else emv.value = String(ST);
      if (ers.value) ed.rs = +ers.value;
      else ers.value = "15";
    }
  } catch (e) {}
  emv.onchange = ers.onchange = stepSet;
  sc.oninput = () => {
    if (ed.ws) return;
    const c = sc.value;
    if (ed.sel >= 0)
      edit((o) => {
        o.c = c;
      });
    else ed.c = c;
  };
  sl.onchange = () => {
    if (ed.ws) return ui();
    const v = sl.checked ? 1 : 0;
    if (ed.sel >= 0)
      edit((o) => {
        o.sl = v;
      });
    else ed.sl = v;
  };
  stx.onchange = () => {
    if (ed.ws) return;
    const t = stx.value.trim().toUpperCase().slice(0, 28);
    stx.value = t;
    const o = ed.list[ed.sel];
    if (o && o.g === "kit" && o.ka && o.ka.t != null) edit((o) => (o.ka.t = t || "SIGN"));
    else if (ed.ka && ed.ka.t != null) ed.ka.t = t || "SIGN";
  };

  /* ---------- picking and placing ---------- */
  const ray = (e) => {
    const r = R.domElement.getBoundingClientRect();
    m2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rc.setFromCamera(m2, C);
  };
  const groundPt = () => (rc.ray.intersectPlane(gp, v3) ? v3.clone() : null);
  const snapXZ = (p) => (ed.grid ? [Math.round(p.x / ST) * ST, Math.round(p.z / ST) * ST] : [r2(p.x), r2(p.z)]);
  const foeAt = () => {
    const objs = foes.filter((f) => f.o && !f.dead && f.o.parent && vis(f.o)).map((f) => f.o),
      h = rc.intersectObjects(objs, true)[0];
    for (let o = h && h.object; o; o = o.parent) {
      const f = foes.find((f) => f.o === o);
      if (f) return f;
    }
    return null;
  };
  // v46c: a click that picked nothing: say what is under the cursor and why it can't be edited (once per spot)
  let whyAt = "";
  const whyNot = () => {
    const skip = new Set([GZ, RT, RDG, WG, ghost].filter(Boolean)),
      ok = (o) => {
        for (let p = o; p; p = p.parent) if (skip.has(p)) return false;
        return o.isMesh && !o.userData.ol && vis(o);
      };
    let h = null;
    try {
      h = rc.intersectObjects(S.children, true).find((x) => ok(x.object));
    } catch (e) {}
    if (!h || h.distance > 400) return;
    const at = Math.round(h.point.x) + "," + Math.round(h.point.z);
    if (at === whyAt) return;
    whyAt = at;
    let why = "",
      root = h.object;
    for (let o = h.object; o && o !== S; o = o.parent) {
      if (o.userData.lus || o.userData.wayf || /^(luster:|wilds:|wayf:|aura|gfall|bdx)/.test(o.name)) {
        why =
          "it belongs to a decoration layer that is made fresh every load (verge clutter, edge woods, fingerposts, waystones, bridges, glows), so it can't be edited piece by piece";
        break;
      }
      if (o.userData.ei !== undefined) return; // an editor object (hidden invisible wall, etc.)
      root = o;
    }
    // clicking flat ground to let go of a selection says nothing
    if (!why && wBig(h.object) && BX.setFromObject(h.object).getSize(WV).y < 1.2) return;
    if (!why && wBig(h.object))
      why = "it is one big piece spread over the map: turn on Big pieces (B), then click it again";
    if (!why && foes.some((f) => f.o === root)) why = "enemies are picked by their body; try clicking its middle";
    if (!why && NPCS.some((n) => n.o === root || n.mkr === root)) why = "villagers and quest givers can't be moved yet";
    if (!why) why = "it isn't one of the world objects the editor knows (" + (root.name || root.type) + ")";
    toast("Can't edit that: " + why, "#ffd27a");
  };
  const patrolDown = (e) => {
    const mh = ed.pmk.length ? rc.intersectObjects(ed.pmk, false)[0] : null;
    if (mh) {
      ed.pp = mh.object.userData.pi;
      if (e.altKey) {
        ed.pw.splice(ed.pp, 1);
        ed.pp = -1;
        pcommit();
      } else {
        pdrag = true;
        drawRoute();
        ui(); // v46b: shows that point's wait
      }
      return;
    }
    const f = foeAt();
    if (f && f !== ed.pf) return pselect(f);
    if (!ed.pf) return toast("Click an enemy first", "#ff8a8a");
    const p = groundPt();
    if (!p) return;
    const at = ed.pp >= 0 ? ed.pp + 1 : ed.pw.length;
    ed.pw.splice(at, 0, snapXZ(p));
    ed.pp = at;
    pcommit();
  };
  const onDown = (e) => {
    if (!ed.on) return;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (e.button === 2) {
      drag = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button !== 0) return;
    ray(e);
    if (ed.tpOK && tpDown()) return; // v46: picking a teleporter's destination
    if (ed.tool === "patrol") return patrolDown(e);
    if (ed.tool === "road") return roadDown(e);
    if (ed.tool === "grab") {
      const h = rc.intersectObjects(BASE, true).find((h) => vis(h.object));
      if (!h) return;
      let o = h.object;
      while (o.parent && o.parent !== S) o = o.parent;
      const a = BASE.indexOf(o);
      if (a < 0) return;
      const k = a + ":" + (o.isInstancedMesh ? h.instanceId : 0),
        t = tplOf(k);
      if (!t) return;
      const sz = new T.Box3().setFromObject(t).getSize(new T.Vector3());
      addLib(k, Math.max(sz.x, sz.z) / 2);
      pick({
        n: "Model " + (lib.filter((e) => e.k).findIndex((e) => e.k === k) + 1),
        p: { g: "model", k, rad: Math.max(sz.x, sz.z) / 2, s: [1, 1, 1], c: W0 },
      });
      toast("Grabbed! Click to place copies (saved under My grabs)", "#9fe8d0");
      return;
    }
    // the gizmo of the selected object comes first (place and select tools)
    if (gzDown()) return;
    // v46c: with Walls on, a wall post under the cursor comes first
    if (ed.walls && (ed.tool === "select" || !ed.pn) && wallDown(e)) return;
    // which editor object is under the cursor (in the place tool with something armed, ground pieces like paths
    // don't count, so you can still place on them; Shift-click places on top of whatever is there)
    let hit = -1,
      hd = Infinity,
      hp = null; // v46b: where the click met it (a drag slides it from there)
    // v46: Shift-click with the select tool (or nothing armed) adds to / takes from the selection
    const addK = e.shiftKey && (ed.tool === "select" || !ed.pn);
    if (ed.tool === "select" || !e.shiftKey || addK)
      for (const h of rc.intersectObjects(ed.meshes, true)) {
        let m = h.object;
        while (m && m.userData.ei === undefined) m = m.parent;
        if (!m) continue;
        const o = ed.list[m.userData.ei];
        if (ed.tool === "place" && ed.pn && o && (o.g === "path" || o.g === "plaza" || o.wk)) continue;
        if (o && (o.g === "wall" || o.g === "floor" || o.g === "wline") && !ed.walls) continue; // v46c: hidden unless Walls is on
        if (o && o.g === "tport" && !ed.tps) continue; // v46: hidden unless Teleporters is on
        hit = m.userData.ei;
        hd = h.distance;
        hp = h.point.clone();
        break;
      }
    // v36b: objects that were already in the world (select tool, or the place tool with nothing armed); the nearer wins
    if (ed.tool === "select" || !ed.pn) {
      // v46b: Ctrl-click on the same spot again picks the next thing underneath (curb, sidewalk, road, ground...)
      let n = 0;
      if (e.ctrlKey) {
        const L = ed.pkC;
        n = L && Math.hypot(e.clientX - L.x, e.clientY - L.y) < 6 ? L.n + 1 : 1;
      }
      let w = null;
      try {
        w = wPick(e.altKey, n, e.ctrlKey);
        if (!w && n) w = wPick(e.altKey, (n = 0), e.ctrlKey); // ran out: back to the top one
      } catch (er) {
        console.warn("editor world pick", er);
      }
      ed.pkC = e.ctrlKey ? { x: e.clientX, y: e.clientY, n } : null;
      if (n) hd = Infinity; // cycling goes through world pieces
      if (w && w.d < hd) {
        if (addK) return selAddW(w.mem);
        // v46b: pressing on a piece of the current group drags the whole group; otherwise select it, then drag it
        const inG = isMulti() && ed.ws && w.mem.every((m) => ed.ws.mem.includes(m));
        if (!inG) wSelect(w.mem);
        return bodyDrag(e, rc.ray.at(w.d, new T.Vector3()));
      }
    }
    if (addK) return hit >= 0 ? selAddE(hit) : undefined; // Shift-click on empty ground keeps the selection
    if (hit >= 0 && isMulti() && ed.xs.includes(hit)) return bodyDrag(e, hp);
    if (hit >= 0 || ed.tool === "select" || !ed.pn) {
      if (hit < 0) whyNot();
      ed.ws = null;
      ed.xs = [];
      ed.sel = hit;
      const o = ed.list[hit];
      if (o && o.g === "foe") foeFields(o);
      rebuild();
      if (hit >= 0) bodyDrag(e, hp);
      return;
    }
    const pp = placePt(e.shiftKey);
    if (!pp) return;
    const [x, y, z] = pp;
    if (ed.g === "prefab") return placePre(x, y, z);
    push();
    const n = {
      g: ed.g,
      x,
      y,
      z,
      r: ed.g === "glow" ? 0 : Math.round((ed.rot || 0) * 1e5) / 1e5,
      s: ed.s.slice(),
      c: ed.c,
      sl: ed.sl,
    };
    if (ed.g === "model") Object.assign(n, { k: ed.k, rad: ed.rad }, ed.ctr ? { ctr: 1 } : {});
    if (ed.g === "foe")
      Object.assign(
        n,
        { f: ed.f.slice(), el: ed.el == null ? "r" : ed.el, bs: ed.bs ? 1 : 0 },
        ed.fnm ? { nm: ed.fnm } : {},
      );
    if (ed.g === "kit") {
      Object.assign(n, { kt: ed.kt, ka: cp(ed.ka || {}), rad: ed.rad || 0 });
      if (n.ka.t != null && stx.value.trim()) n.ka.t = stx.value.trim().toUpperCase().slice(0, 28);
    }
    if (ed.g === "path" || ed.g === "plaza") n.tx = ed.tx;
    if (ed.g === "tport") n.to = [r2(x), r2(z + 12), 0]; // v46: lands 12 south until you set where it goes
    if (ed.g === "wline")
      n.rl = [
        [-4, 0],
        [4, 0],
      ]; // v46c: Road tool (N) bends it
    if (ed.wk) n.wk = 1;
    ed.list.push(n);
    ed.ws = null;
    ed.xs = [];
    ed.sel = ed.list.length - 1; // the new piece is selected: Delete, R, the arrows and the gizmo act on it
    rebuild();
  };
  const cv = R.domElement;
  cv.addEventListener("pointerdown", onDown);
  addEventListener("pointermove", (e) => {
    if (!ed.on) return;
    if (e.target === cv) {
      ed.mx = e.clientX; // v46: Ctrl+V pastes here
      ed.my = e.clientY;
    }
    if (gd) return gzMove(e);
    if (wdrag && wallMove(e)) return;
    if (rdrag && roadMove(e)) return;
    ghostMove(e);
    if (pdrag && ed.pp >= 0 && ed.pw[ed.pp]) {
      ray(e);
      const p = groundPt();
      if (p) {
        ed.pw[ed.pp] = snapXZ(p).concat(ed.pw[ed.pp].slice(2)); // keeps its wait
        drawRoute();
      }
      return;
    }
    if (!drag) return;
    const c = ed.cam;
    c.yaw -= (e.clientX - drag.x) * 0.004;
    c.pitch = Math.max(-1.55, Math.min(1.55, c.pitch - (e.clientY - drag.y) * 0.004));
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  addEventListener("pointerup", () => {
    drag = null;
    if (gd) gzUp();
    wallUp();
    roadUp();
    if (pdrag) {
      pdrag = false;
      pcommit();
    }
  });
  cv.addEventListener("contextmenu", (e) => {
    if (ed.on) e.preventDefault();
  });
  cv.addEventListener(
    "wheel",
    (e) => {
      if (!ed.on) return;
      e.preventDefault();
      ed.spd = Math.max(2, Math.min(120, ed.spd * (e.deltaY < 0 ? 1.15 : 0.87)));
      ui();
    },
    { passive: false },
  );

  /* ---------- keys ---------- */
  const toggle = () => {
    if (!ed.on) {
      if (!DEV.on) {
        toast("Turn on Developer mode first (Book > Options)", "#ff8a8a");
        return;
      }
      if (typeof SLOT !== "number" || SLOT < 0 || mode !== "explore" || paused) {
        toast("Finish what you are doing, then press F2", "#ff8a8a");
        return;
      }
      ed.on = 1;
      paused = true;
      const c = ed.cam,
        d = new T.Vector3();
      C.getWorldDirection(d);
      c.x = C.position.x;
      c.y = Math.max(C.position.y, 6);
      c.z = C.position.z;
      c.yaw = Math.atan2(-d.x, -d.z);
      c.pitch = -0.5;
      ed.fn = S.fog.near;
      ed.ff = S.fog.far;
      S.fog.near = 80;
      S.fog.far = 420;
      C.far = 600;
      C.updateProjectionMatrix();
      pn.style.display = "block";
      lt = performance.now();
      showCat(ed.cat);
      selShow();
      drawRoute();
      drawRoad();
      ui();
      if (!FS.ok) fsWrite(0); // v46: quietly re-links the game file when the browser still allows it
    } else {
      ed.on = 0;
      if (FS.dirty) {
        if (FS.ok) fsWrite(0);
        else
          toast("Editor changes are only in this browser - press Save to game in the editor to keep them", "#ffd27a");
      }
      pdrag = false;
      pn.style.display = "none";
      S.fog.near = ed.fn;
      S.fog.far = ed.ff;
      C.far = 170;
      C.updateProjectionMatrix();
      paused = false;
      snap = true;
      gd = null;
      ghostDrop();
      selShow(); // ed.on is 0: takes the outlines off
      drawRoute();
      rdrag = false;
      drawRoad();
      wdrag = null;
      wallsVis(); // v46c: invisible walls/floors never show in the game
      wallsDraw(false);
      ed.tpPick = false;
      tpsVis(); // v46: nor teleporter discs / rings
      tpDraw(false);
      for (const k in dn) delete dn[k];
    }
  };
  addEventListener("keydown", (e) => {
    if (e.code === "F2") {
      e.preventDefault();
      toggle();
      return;
    }
    if (!ed.on) return;
    const tg = e.target && e.target.tagName;
    if (tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT") return;
    if (!e.ctrlKey) dn[e.code] = 1; // Ctrl+C must not fly the camera down
    // v46: the chosen move step; Shift = 4×, Ctrl = a tenth
    const st = r2(Math.max(0.001, e.shiftKey ? ed.mv * 4 : e.ctrlKey ? ed.mv / 10 : ed.mv));
    if (e.ctrlKey && e.code === "KeyC" && ed.tool !== "patrol") {
      e.preventDefault();
      copySel();
      return;
    }
    if (e.ctrlKey && e.code === "KeyV" && ed.tool !== "patrol") {
      e.preventDefault();
      pasteClip();
      return;
    }
    if (e.code === "Tab") {
      e.preventDefault();
      setTool({ place: "select", select: "grab", grab: "patrol", patrol: "road", road: "place" }[ed.tool]);
      return;
    }
    if (e.code === "KeyP") {
      setTool("patrol");
      return;
    }
    if (e.code === "KeyG") {
      ed.grid = !ed.grid;
      ui();
      return;
    }
    if (e.code === "KeyB" && !e.ctrlKey) {
      bigTog();
      return;
    }
    if (e.ctrlKey && e.code === "KeyZ") {
      e.preventDefault();
      undo();
      return;
    }
    if (e.ctrlKey && e.code === "KeyD") {
      e.preventDefault();
      dup();
      return;
    }
    if (e.code === "KeyT") {
      ray({ clientX: innerWidth / 2, clientY: innerHeight / 2 });
      const p = groundPt();
      if (p && okp(p.x, p.z)) {
        W.position.set(p.x, 0, p.z);
        saved.copy(W.position);
        toast("Player moved", "#9fe8d0");
      } else toast("Not a walkable spot", "#ff8a8a");
      return;
    }
    if (e.code === "KeyK" && !e.ctrlKey) {
      wallsTog();
      return;
    }
    if (e.code === "KeyJ" && !e.ctrlKey) {
      tpsTog(); // v46
      return;
    }
    if (ed.sw && (e.code === "Delete" || e.code === "Backspace")) {
      e.preventDefault();
      wallDel();
      return;
    }
    if (ed.sw && e.code === "Escape") {
      ed.sw = null;
      wallsDraw(false);
      ui();
      return;
    }
    if (e.code === "KeyN" && !e.ctrlKey) {
      setTool("road");
      return;
    }
    if (ed.tool === "road") {
      if (e.code === "Escape") rdSelect(null);
      else if ((e.code === "Enter" || e.code === "NumpadEnter") && rdOn()) {
        e.preventDefault();
        rdCommit();
      } else if ((e.code === "Delete" || e.code === "Backspace") && rdOn() && ed.rpi >= 0) {
        e.preventDefault();
        rdDel();
      }
      return;
    }
    if (ed.tool === "patrol") {
      if (e.code === "Escape") pselect(null);
      else if ((e.code === "Delete" || e.code === "Backspace") && ed.pf && ed.pp >= 0) {
        e.preventDefault();
        ed.pw.splice(ed.pp, 1);
        ed.pp = Math.min(ed.pp, ed.pw.length - 1);
        pcommit();
      }
      return;
    }
    if (e.code === "KeyV") {
      variant();
      return;
    }
    const k = e.code;
    // v46: , and . turn by 1° (with or without a selection: the ghost turns too)
    if (k === "Comma" || k === "Period") {
      rot(((k === "Comma" ? 1 : -1) * Math.PI) / 180);
      return;
    }
    if (!hasSel()) {
      // nothing selected: R turns the ghost, Esc puts the armed item away, Delete explains how to select
      if (k === "KeyR") rot((e.shiftKey ? -1 : 1) * rsr());
      else if (k === "Escape" && ed.pn) {
        ed.pn = "";
        ghostDrop();
        ui();
      } else if (k === "Delete" || k === "Backspace") {
        e.preventDefault();
        del();
      }
      return;
    }
    if (k === "ArrowLeft") {
      e.preventDefault();
      edit((o) => (o.x -= st));
    } else if (k === "ArrowRight") {
      e.preventDefault();
      edit((o) => (o.x += st));
    } else if (k === "ArrowUp") {
      e.preventDefault();
      edit((o) => (o.z -= st));
    } else if (k === "ArrowDown") {
      e.preventDefault();
      edit((o) => (o.z += st));
    } else if (k === "PageUp") {
      e.preventDefault();
      edit((o) => (o.y += st));
    } else if (k === "PageDown") {
      e.preventDefault();
      edit((o) => (o.y -= st));
    } else if (k === "KeyR" && !e.ctrlKey) rot((e.shiftKey ? -1 : 1) * rsr());
    else if (k === "BracketRight") grow(1.1);
    else if (k === "BracketLeft") grow(1 / 1.1);
    else if (k === "Delete" || k === "Backspace") {
      e.preventDefault();
      del();
    } else if (k === "Escape") desel();
  });
  addEventListener("keyup", (e) => {
    delete dn[e.code];
  });

  /* ---------- camera (runs every frame, right before render) ---------- */
  window.__edT = () => {
    if (!ed.on) return;
    const n = performance.now(),
      dt = Math.min(0.05, (n - lt) / 1000);
    lt = n;
    const c = ed.cam,
      sp = ed.spd * (dn.ShiftLeft || dn.ShiftRight ? 3 : 1) * dt;
    const f = (dn.KeyW ? 1 : 0) - (dn.KeyS ? 1 : 0),
      r = (dn.KeyD ? 1 : 0) - (dn.KeyA ? 1 : 0),
      u = (dn.Space ? 1 : 0) - (dn.KeyC ? 1 : 0);
    const cp2 = Math.cos(c.pitch);
    c.x += (-Math.sin(c.yaw) * cp2 * f + Math.cos(c.yaw) * r) * sp;
    c.z += (-Math.cos(c.yaw) * cp2 * f - Math.sin(c.yaw) * r) * sp;
    c.y += (Math.sin(c.pitch) * f + u) * sp;
    C.position.set(c.x, c.y, c.z);
    C.rotation.set(c.pitch, c.yaw, 0, "YXZ");
    // the gizmo keeps the same size on screen
    if (GZ.parent) GZ.scale.setScalar(Math.max(0.6, C.position.distanceTo(GZ.position) * 0.11));
  };

  /* ---------- load saved builds ---------- */
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(a)) ed.list = a;
  } catch (e) {}
  // built once every script has run (28-patrols rewrites routes, 27/33/34 append foes): world routes first, then the
  // editor's own objects, whose foes are appended last
  const boot = () => {
    try {
      applyPO();
    } catch (e) {
      console.warn("editor routes", e);
    }
    try {
      wBoot(); // after the routes: a moved foe takes its saved route with it
    } catch (e) {
      console.warn("editor world edits", e);
    }
    try {
      rdSync(); // v46b: bent town roads now (trails / rivers wait in the poll for 64a)
    } catch (e) {
      console.warn("editor roads", e);
    }
    rebuild();
  };
  // v46: gates are (re)built when a character loads: put their saved edits on at once, not on the next poll
  if (typeof gatesInit === "function") {
    const gi0 = gatesInit;
    gatesInit = function () {
      const r = gi0.apply(this, arguments);
      try {
        wLate(0);
      } catch (e) {
        console.warn("editor late edits", e);
      }
      return r;
    };
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot);
  else setTimeout(boot, 0);

  /* ---------- v46b: linked gates ---------- */
  // Two (or more) "Zone gate" pieces built in the editor with the same name (the Text box) are linked: walking through
  // one's swirl takes you out of the next one with that name, on the far side, still walking the same way. The default
  // name "GATE" never links. With 3+ of a name they chain in build order (last goes back to the first).
  const gName = (o) =>
    o && o.g === "kit" && o.kt === "gate" && o.ka && o.ka.t ? String(o.ka.t).trim().toUpperCase() : "";
  const gLocal = (o, x, z) => {
    const dx = x - o.x,
      dz = z - o.z,
      r = o.r || 0;
    // into the gate's own frame: lx along the lintel, lz through the swirl
    return [Math.cos(r) * dx - Math.sin(r) * dz, Math.sin(r) * dx + Math.cos(r) * dz];
  };
  let gIn = null, // the gate you are standing in (no trip until you leave it)
    gSide = {}; // last side of each gate's plane you stood on (index -> sign)
  setInterval(() => {
    try {
      if (ed.on || mode !== "explore" || paused || !W || !W.visible || typeof tp !== "function") return;
      if (document.body.classList.contains("cut")) return;
      const G = [];
      ed.list.forEach((o, i) => {
        const n = gName(o);
        if (n && n !== "GATE") G.push([i, n, o]);
      });
      if (G.length < 2) return;
      const px = W.position.x,
        pz = W.position.z;
      let now = null;
      for (const [i, n, o] of G) {
        const sc = (o.s && o.s[0]) || 1,
          [lx, lz] = gLocal(o, px, pz),
          inside = Math.abs(lx) < 2.6 * sc && Math.abs(lz) < 1.4 * sc,
          sd = lz >= 0 ? 1 : -1,
          was = gSide[i];
        if (Math.abs(lx) < 2.6 * sc && Math.abs(lz) < 6 * sc) gSide[i] = sd;
        else delete gSide[i];
        if (!inside) continue;
        now = i;
        if (gIn === i) continue;
        // crossing: which way you came in (the side you stood on before; else the side you are on)
        const from = was || sd,
          L = G.filter((g) => g[1] === n),
          k = L.findIndex((g) => g[0] === i),
          to = L[(k + 1) % L.length];
        if (!to || to[0] === i) continue;
        const d = to[2],
          dsc = (d.s && d.s[0]) || 1,
          r = d.r || 0,
          // come out on the far side of the other gate (you walked in from side "from", heading to -from)
          out = (s) => {
            const lz2 = -s * 3.6 * dsc;
            return [d.x + Math.sin(r) * lz2, d.z + Math.cos(r) * lz2];
          };
        let p = out(from),
          face = from > 0 ? r + Math.PI : r;
        if (typeof okp === "function" && !okp(p[0], p[1])) {
          const q = out(-from);
          if (okp(q[0], q[1])) {
            p = q;
            face = from > 0 ? r : r + Math.PI;
          }
        }
        gIn = to[0];
        gSide = {};
        tp({ to: [p[0], p[1], face] });
        toast(n.charAt(0) + n.slice(1).toLowerCase(), "#9fe8d0");
        return;
      }
      if (now === null) gIn = null;
    } catch (e) {
      console.warn("linked gates", e);
    }
  }, 100);
})();
// v12 town wall (defined in world(), 03-world.js). Built here, AFTER the editor's BASE snapshot of S.children, so the
// scene-child indices that saved "model" builds point at stay the same. The south side wraps around the saved builds.
{
  let b = [];
  try {
    b = JSON.parse(localStorage.getItem("duskwick_build_v1") || "[]");
  } catch (e) {}
  try {
    const n0 = S.children.length;
    if (window.__townWall) window.__townWall(b);
    window.__townWall.objs = S.children.slice(n0); // v46c: its pieces (the editor's Road tool can re-lay the wall)
    window.__townWall.sol0 = window.__townWall.sol || []; // v46d: its collision circles
  } catch (e) {
    console.warn("town wall", e);
  }
  try {
    if (window.__trails) window.__trails(); // v14 walkable trails between zones (03-world.js)
  } catch (e) {
    console.warn("trails", e);
  }
  try {
    if (window.__mireTidy) window.__mireTidy(); // v14 Mirewick clean-up (03-world.js)
  } catch (e) {
    console.warn("mire tidy", e);
  }
  try {
    if (window.__streets) window.__streets(); // v15 corner plazas, street signs and houses along the roads (03-world.js)
  } catch (e) {
    console.warn("streets", e);
  }
  try {
    if (window.__lateNpcs) window.__lateNpcs(); // v13 Sage Ilsa (03-world.js)
  } catch (e) {
    console.warn("late npcs", e);
  }
  try {
    if (window.__garLate) window.__garLate(); // v46 hub string lights, one editable piece per span (03-world.js)
  } catch (e) {
    console.warn("garlands", e);
  }
  try {
    zoneCullInit(); // v14 zone loading (11-explore.js): far zones are switched off until you near their gateway
  } catch (e) {
    console.warn("zone loading", e);
  }
}
