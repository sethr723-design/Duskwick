// DUSKWICK model packer (v31). Run with pack-models.bat (or: node tools/pack-models.js). No npm packages.
// Reads every .glb file in the models folder and writes models/models.js, which index.html loads. The models are
// stored inside a .js file because browsers won't let a double-clicked index.html read .glb files directly.
// A model can come with a settings file of the same name (gloomling.glb + gloomling.json), for example:
//   { "use": ["foe:gloom"], "s": 1, "ry": 0, "y": 0, "toon": true,
//     "anim": { "idle": "Idle", "walk": "Walk", "atk": "Attack", "hit": "HitReact", "die": "Death" } }
// "use" says which game models it replaces (see GLTF.USE in js/43-gltf.js for the keys); every other field is optional.
"use strict";
const fs = require("fs"),
  path = require("path");
const DIR = path.join(__dirname, "..", "models"),
  OUT = path.join(DIR, "models.js");
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR);
const files = fs.readdirSync(DIR).filter((f) => /\.glb$/i.test(f));
const lines = [
  "// Made by tools/pack-models.js from the .glb files in this folder. Don't edit by hand: run pack-models.bat again.",
];
let total = 0;
for (const f of files) {
  const key = path
    .basename(f, path.extname(f))
    .toLowerCase()
    .replace(/[^0-9a-z_-]/g, "_");
  const buf = fs.readFileSync(path.join(DIR, f));
  if (buf.length < 12 || buf.toString("ascii", 0, 4) !== "glTF") {
    console.log("  skipped " + f + " (not a binary glTF file)");
    continue;
  }
  let cfg = {};
  const jf = path.join(DIR, path.basename(f, path.extname(f)) + ".json");
  if (fs.existsSync(jf)) {
    try {
      cfg = JSON.parse(fs.readFileSync(jf, "utf8"));
    } catch (e) {
      console.log("  " + path.basename(jf) + " is not valid JSON, ignored: " + e.message);
    }
  }
  lines.push(
    "GLTF.add(" +
      JSON.stringify(key) +
      ", " +
      JSON.stringify(cfg) +
      ", " +
      JSON.stringify(buf.toString("base64")) +
      ");",
  );
  total += buf.length;
  console.log(
    "  packed " +
      f +
      "  (" +
      (buf.length / 1024).toFixed(0) +
      " KB" +
      (cfg.use ? ", replaces " + cfg.use.join(", ") : "") +
      ")",
  );
}
fs.writeFileSync(OUT, lines.join("\n") + "\n");
console.log(
  files.length
    ? "Wrote models/models.js: " + files.length + " model(s), " + (total / 1048576).toFixed(1) + " MB."
    : "No .glb files in the models folder yet. Put some there and run this again.",
);
