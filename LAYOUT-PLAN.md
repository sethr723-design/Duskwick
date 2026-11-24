# Duskwick world re-layout plan (matching the reference map)

Status: **done (v45). `ZMV.live = true` in 03: every game runs the move.** CLAUDE.md (64a row + World layout) and
README.txt are updated. To turn it off for a test, set `live: false` in 03 (then `localStorage.duskwick_zmove = "1"`
switches it on per browser).

Phase 4 (same switch): `ZMOVE.dress()` runs right after the move (console: `ZMOVE: dressed {...}`, counts in
`ZMOVE.dressed`). It puts away the old trail pieces (ribbons, lamps, signs, verge trees, the two grass/snow/ash seam
strips, 37's trail-end stones) and clears scenery off the new trails. The town's square grass sheet and each land's
square ground become discs, a blended meadow lies under everything, and soft rings hide the disc edges. All three
trails get road, sidewalks, curbs, lamp posts and end signs. A river runs south of town and down between town and
Cinderwaste (`ZMOVE.RIV`, plus a second one between Cinderwaste and Mirewick), with a bridge wherever a trail crosses
(`ZMOVE.cross`): stone on the Cinder Trail, wooden elsewhere. Cliff rocks ring the lava land, and the Frostfen arch
(and its roots gate) moves to Wispwood Glade's south exit while the Cinderwaste arch moves to the east exit. The
river is looks only: it is not a barrier, because the land between is wilds anyway.

Phase 5 (editor and loose ends):
- **Editor builds stay where you put them.** The move skips editor objects (`userData.ei`), editor foes (`f.edi`) and
  their solids (13 now tags them `ed: 1`), because 13 rebuilds them from their saved spots after every edit. So builds
  are kept in today's coordinates. (A build placed inside old Frostfen/Cinderwaste before the re-layout stays at the
  old spot.)
- **World edits and world-foe patrol routes** are stored in the old layout, like the moved streets: 13's frames now
  include the moved lands (frame 100 + land, a pure shift, from the move's tags `zmh` holders / `zmo` children /
  `zmm[i]` instances / `f.zm` foes).
- 62's Reach quest arrow points along the new roads.
- The prologue shots of Cinderwaste and Frostfen follow their lands.

Phase 3 (dev test): developer mode on, then in the browser console `localStorage.duskwick_zmove = "1"` and reload.
`js/64a-zonemove.js` (`ZMOVE`) moves both lands at load and sets `ZMV.on`; `ZMOVE.moved` has the counts. Also
changed for it: 03 `zoneAt` (moved branch `zmZone`, `ZMV.live`), 12 save/load (`zmL` / `zmW`), 10 battle frames,
11 `trSpan` + zone name card, 07 dev teleports and 38 birds read the live `ZCEN`, and 37 builds each village's pieces as
their own meshes. Known gaps until phase 4: the Frostfen road south has no road surface yet (walkable but bare
grass), the lock arches still stand at their old spots (the Frostfen arch on the east exit, the Cinderwaste arch at
Cinder Hollow; the locks themselves already apply to the right roads), and the ground south-west of town is still
bare.

**Change after phase 1 (your call):** the zone streets go back to their **teleport arches** (their own row far east,
`ZSMOVE = false` in 03, as before v43). Everything else is walked or reached by Book > Travel. Only the villages and
the three trails share the overworld now, so nothing overlaps. This replaces the "new street headings" and the
"OPENR.move runs after" parts below: the zone move only shifts villages + wilds, and each street's "Back to ..." arch
gets its landing spot (`PT.to`) shifted with its village.

Phase 1 result: `ZMV` in 03-world.js (after `ZCEN`): Frostfen shift (-360, 320), so its centre is **(240, -80)**;
Cinderwaste shift (+1200, 0), so its centre is (600, -400). New trail routes in `ZMV.tr` (same index, name and lock as
`TRL`). Helpers `zmAt` / `zmW` / `zmL` / `zmP`. Spacing (scratch check): the three trails are at least 51 apart once they
leave the shared glade start, at least 200 from any other land's scenery ring, and 86+ from the town, your builds and
the shop rooms. Scenery-ring gaps: Frostfen/Cinderwaste 202, Cinderwaste/Mirewick 105 (the causeway).
To view it: developer mode on, **Shift+F4** (plain F4 is still the old street plan). Red dots = planned ground that
lands on something walkable today that stays put. White dots = the street teleport arches.

## The picture vs. today

| | Reference picture | Today |
|---|---|---|
| Town Square | north-west | hub at (0, -400) |
| Lava land ("Crater Climb") | **east** of town | Cinderwaste at (-600, -400), **west** |
| Snow land ("Frosty Heights") | **south** of town | Frostfen at (600, -400), **east** |
| Mirewick | not in the picture | (1020, -400), far east, joined to Frostfen by the Mire Causeway |

(North = smaller z, east = bigger x, as on the minimap.)

## What moves where

The town doesn't move. It can't without breaking your editor builds (Lantern Row / Gardens, z -370..-240), the town
wall, the tower and Gloomway. Instead the two lands move around it:

| Land | From | To | Move |
|---|---|---|---|
| **Cinderwaste** (lava) | (-600, -400) | **(600, -400)**, east of town | shifted +1200 in x, no turn |
| **Frostfen** (snow) | (600, -400) | about **(230, -80)**, south / south-east of town | shifted, no turn |
| **Mirewick** | (1020, -400) | **stays** | none |

With these spots the town reads as the north-west corner, with lava to the east and snow to the south, as in your
picture. Mirewick sits just past the lava land, so the Mire Causeway now starts at Cinderwaste's east side instead of
Frostfen's. That also fits the story order better: Mirewick opens after the Gloom Warden, which is after Cinderwaste.

Each land moves **without turning** (pure shift). That's on purpose: the hand-laid Frostfen village (61-villages
`TOWN.frost`), the villages' house rings, NPC facings and the dungeon doors are all stored relative to the zone centre,
so a pure shift keeps them correct for free. Only the zone streets get new compass headings, so they fit their new
surroundings (see below).

Exact Frostfen centre: (230, -80) is the starting guess. It is set by one number pair and tuned in phase 2 so that its
streets stay clear of the shop / outfitter rooms (z about 150..190), the editor builds and `z > 300` (dungeons).

## How the lands get joined (roads, bridges, water)

Today's progression: Hollow Road (east) → **Wispwood Glade** → Frostfen (Lv 3) → Ashen Trail ward opens → **Cinder
Hollow** glade (west) → Cinderwaste (Lv 4, needs "What the Ice Remembers").

New trails (the old Frostfen Trail / Cinder Trail / Mire Causeway are replaced):

1. **Frosty road**: Wispwood Glade → south → Frostfen's north rim. Locked by the same Frostfen gate as today
   (roots, `P.gates.frost`).
2. **Crater road**: Wispwood Glade → east → Cinderwaste's west rim (about where the Frostfen Trail runs today). Locked by
   the same Cinderwaste lock as today (`P.done[11]`). The Cinderwaste arch (barrier + unlock cutscene spot) moves from
   Cinder Hollow to the mouth of this road.
3. **Mire Causeway**: Cinderwaste east rim → Mirewick (nearly today's route, which already runs between x 624 and 966).
   Same lock (Gloom Warden).

**Decision for you:** with lava in the east, the **Ashen Trail / Cinder Hollow** glade (west) no longer leads to a land.
It stays as a side glade (camp, quests, its ice ward still opens after the Rimefang Den). The story order is unchanged,
because the Cinderwaste lock still needs the Frostfen story. The alternative, a trail from Cinder Hollow looping all
the way round the north of town to the east, would be very long and pass the Gloomspire. I don't recommend it.

**Water and cliffs:** a winding river band between the town lands and each zone (non-walkable, as all off-path ground
already is; it only needs to look right). Darker cliff edges / rock lines around the lava land.

**Bridges:** a wooden plank bridge where the Frosty road crosses the river, a stone arch bridge on the Crater road, and
a boardwalk bridge where the Causeway leaves the lava land. Each is built from the live trail data (`rdAt` at the
crossing), so it sits exactly on the walkable path. A stone arch also stands at each road's mouth (the moved lock
arches). **69-wayfare (other session) adds bridges at junctions:** I'll leave a note so we don't both put a bridge
on the same crossing. Mine are only on the river crossings, and each is tagged `userData.zmb`.

## How (runtime move, like OPENR.move)

Same approach as v43's street move, so **saves and editor data keep today's layout** and nothing at load time changes
(same foes, same order, same chests: multiplayer and editor builds stay safe):

- **03-world.js** (small data block next to `ZSMOVE`): `ZMV = { ember: [dx, dz], frost: [dx, dz] }` plus a flag, and
  helpers `zmW(x, z)` (old spot → new) / `zmL(x, z)` (new → old) / `zmAt(x, z)` (which moved land an OLD spot is in).
  New street headings for the moved zones' streets. A moved-layout branch in `zoneAt` (new circles first, then the
  far-off interiors / Reach rule `x > 1500 → frost`, `x < -1500 → ember`, so street dungeons and the Reach keep
  their look).
- **New file `js/64a-zonemove.js`** (only top-level name `ZMOVE`), loaded **just before 64-openroads.js**, so its
  DOMContentLoaded move runs **before** `OPENR.move`. It:
  1. moves everything standing in each land's OLD circle (radius about ZR + 45) by that land's shift: the `zone:frost` /
     `zone:ember` holders (and their cull bounds), direct scene children, instanced trees/rocks per instance, foes
     (home, path, path0, model), solids, CB, SMK, OCC, LAMPS, CHESTS, LS, HOUSES, NPCS, PT (+ `to` targets), SAFEC,
     QPOS, `WONDR.VIS`, the old DUN door/out spots (Rimefang Den, Kiln Depths), travel targets (06 / 07), REACH spots
     if any. Both old circles are snapshotted first: Cinderwaste's new spot is Frostfen's old spot, so nothing can be
     moved twice.
  2. updates the live data **in place** so every reader (the minimap, the 68-atlas map, 69-wayfare) sees the new
     world: `ZCEN`, `ZSF` (start points + new headings), `ZSBOX`, the in-zone links in `ZRD`, `TRL` (new routes), and the
     `MWX`-based causeway.
  3. hides the old trail ribbons and builds the new ones (same look, built from `rdRibbon`), plus river, bridges and
     cliffs, all added after BASE.
  4. clears scenery that lands on the new walkable ground (same method as OPENR's `clearJoins`).
  Then `OPENR.move` runs as today and puts each street beside its village's **new** spot.
- **Saves:** `svPos` (12) turns a spot in a moved land back with `zmL` (after the street step it already does), and
  `startGame` turns an old spot forward with `zmW`. Old saves load in the right place.
- **Editor (13):** world edits stay keyed in the old layout. Entities in a moved land get `e.zm`, and `wApply` /
  `wCurA` / `wXform` / `pcommit` add the shift the same way they handle `e.zs` today. Your Lantern Row / Gardens
  builds are in the town and don't move at all.
- **Rollback:** set the flag in 03 to `false` (or remove the one script tag). The world is then exactly as today.

## Hardcoded spots that need the helper (runtime code)

Found so far. Each turns into a `ZCEN[...]` read or a `zmW(...)` call:

- **11-explore.js** `trSpan` (226), `zcKey` (257, load time, stays old), minimap bounds (724), zone name card (1369).
  This file belongs to the atlas/minimap session. I'll ask them before touching it, or they read `ZCEN` instead of the
  literals.
- **10-battle-flow.js** `frame` (1357, 1399): zone battlefield centres.
- **06 / 07** travel lists `[600, -376]`, `[-600, -376]`; 06 quest `wh` targets (1068, 1080).
- **38-life.js** birds over zone centres (104). **54-angling.js** Cinder Wells (`ZCEN.ember`, read at load: needs
  moving). **53-wonders.js** vistas (read `ZCEN` at load: moved via `WONDR.VIS`). **37-junctions.js** zone-village
  stubs (merged mesh: moved per bin or rebuilt). **61-villages.js** runs at window load, after the move, so it sees
  the new `ZCEN` (check its `okp` / scenery clearing). **66-evolve.js** reads `VILL.Z` (fine). **14-intro.js** uses
  `MWX` (Mirewick doesn't move: fine).
- 03-world.js runtime functions: `safe` (`SAFEC` moved), `zsStub` / `zsGate` / `zsWalk` (read `ZCEN`: fine once updated),
  line 6382 (`-600`, load time).

## What could break, and how it's kept safe

| Risk | Guard |
|---|---|
| **Saves** (`P.pos` in a land) | Saved in the OLD layout; `svPos` / `startGame` convert (as for streets today). |
| **Multiplayer foe order** | No foe is created, removed or reordered; the move is deterministic and runs on every machine. All players must run the same version (as with ZSMOVE). |
| **Editor builds** south of the square | Not touched: the town doesn't move and nothing new is built at z -370..-240. Frostfen's new spot is chosen at least 150 away from them. |
| **Editor world edits** in Frostfen / Cinderwaste | Keyed old-layout; shifted on apply (13 change above). |
| **Quests / quest arrow** | `QPOS` and quest `wh` targets moved; `placeRoute` uses PT / TRL live. |
| **Minimap rasters / atlas** | They read `ZCEN`, `TRL`, `ZRD`, `PT` live, all updated in place before the first frame. Literal coords in 11 need the other session's OK. |
| **Old dungeons** (Rimefang Den, Kiln Depths) | Their doors are PT entries (moved); `DUN[i].door/out` also updated so you come back out at the new spot. The interiors (z > 300) don't move. |
| **Street dungeons** (frost / ember interiors at ±1700 / 2300, -1700) | Interiors don't move; doors are on streets (OPENR already moves `DUN2.list`). `zoneAt`'s far-x rule kept. |
| **The Reach** | Gate on Mirewick, which doesn't move. Untouched. |
| **Zone culling** | Holders keep their contents; their bounds `G.b` get shifted. |
| **Themes / music / weather** | Driven by `zoneAt`, which gets the moved-layout branch. |
| **Old trail ground** left behind (empty strips where Cinderwaste and the old trails stood) | Old trail ribbons hidden; the edge woods (63) fill bare ground around walkable areas at runtime. |
| **One bad call stops the world** | Every phase runs in try/catch at DOMContentLoaded, after the world is built; on error it logs and leaves the old layout. |

## Phases (each one small and testable by you)

1. **Data + preview, nothing moves:** `ZMV`, helpers and new street headings in 03; F4 dev map (64) draws the planned
   layout (new circles, trails, river, bridges) with clash dots. You look at the map and OK the shape.
2. **Tune** Frostfen's spot and the street headings until the F4 map shows no clashes.
3. **The move** (64a-zonemove.js) behind a dev-only switch (`localStorage duskwick_zmove = "1"` + developer mode), like
   ZSMOVE's test switch. You walk both lands.
4. **Trails, river, bridges, arches** (new ribbons, lock arch moved to the Crater road, clearing).
5. **Runtime fixes** in the files listed above (10, 06/07, 38, 54, 37, 13 editor, 12 saves; 11 with the other
   session's OK).
6. **Switch it on for everyone**, update `CLAUDE.md` (table row + World layout) and the `README.txt` note.

Each phase: `node --check` on every touched file; no play-testing by me.

## Questions for you

1. OK with the **town staying put** and the two lands moving round it (Cinderwaste east, Frostfen south)?
2. OK with **Cinder Hollow (Ashen Trail)** becoming a side glade, with both new roads leaving from Wispwood Glade?
3. Keep **Mirewick** where it is (just past the lava land, reached by the causeway from Cinderwaste)?
