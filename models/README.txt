DUSKWICK MODELS FOLDER
======================
Put 3D models here as .glb files (binary glTF). Free CC0 packs that export .glb: Quaternius (quaternius.com),
KayKit (kaylousberg.com), Kenney (kenney.nl). Blender can export any model as .glb too (File > Export > glTF 2.0,
format "glTF Binary").

1. Copy the .glb file in here, for example  gloomling.glb
2. Next to it, make a text file with the same name ending in .json, for example  gloomling.json :

     { "use": ["foe:gloom"] }

   "use" lists which game models it replaces:
     foe:gloom          every gloom foe              foe:gloom:1 .. foe:gloom:5   just one tier
                                                      (1 Gloomling, 2 Dusk Imp, 3 Moss Brute, 4 Cinder Fiend, 5 Gloom Warden)
     foe:wolf           another foe kind (any kind name the game uses)
     sum:<name>         a summon
   Optional extras:
     "s": 1.2           size (1 = as tall as the old model)
     "ry": 3.14         turn it around if it faces the wrong way (radians: 3.14 = half a turn)
     "y": 0             lift it up or down
     "toon": false      keep the model's own materials instead of the game's painted toon look
     "anim": { "idle": "Idle", "walk": "Walk", "atk": "Attack", "hit": "HitReact", "die": "Death" }
                        animation names in the file (left out = the game guesses from the names)

3. Double-click pack-models.bat (in the game folder). It writes models.js in this folder.
4. Open the game. The console (F12) says "GLTF: model 'gloomling' ready". Typing  GLTF.list()  there shows every
   packed model and its animation names.

Playing offline: the game fetches two small three.js files the first time it needs them. To play without internet,
save these next to index.html:
   https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js   as  GLTFLoader.js
   https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/SkeletonUtils.js   as  SkeletonUtils.js
