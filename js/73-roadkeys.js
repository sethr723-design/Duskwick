// v49 road keys (loads LAST, after 72): only top-level name ROADKEY.
// Every zone street (ZSTR, the arches on the village rims) is now opened by a quest from that village's giver
// (Brenna / Vesna / Old Maud). Each village's first street opens with a "win battles" quest; every later street opens
// once you have beaten the road boss at the end of the street before it (P.rdb from 33-roads.js).
// The quests are APPENDED to QS here (after 33 and 62, which append their own): never reorder, and anything that
// appends quests later must load after this file.
// A street stays open for old saves that already walked it (P.rdv[i]), and for Dev "walk anywhere" (DEV.nw).
const ROADKEY = (() => {
  const ZNM = { frost: "Frostfen", ember: "the Cinderwaste", marsh: "Mirewick" };
  const REQ = { frost: [10], ember: [12], marsh: [] }; // the story step that brings you to each village
  const QI = {}; // street index -> quest index
  const bossName = (i) => {
    const f = typeof foes !== "undefined" && foes.find((f) => f.rbw && f.rbi === i);
    return (f && f.nm) || "the road boss";
  };
  const open = (i) =>
    !!(P.done && P.done[QI[i]]) || !!(P.rdv && P.rdv[i]) || !!(typeof DEV !== "undefined" && DEV.on && DEV.nw);

  try {
    const prev = {}; // zone -> the street before
    ZSTR.forEach(([zk, nm], i) => {
      const p = prev[zk];
      prev[zk] = i;
      let q;
      if (p == null)
        q = {
          n: "The Way Out: " + nm,
          d: "Win 3 battles, then return to " + qGiver(zk),
          st: () => P.wins || 0,
          k: 3,
          g: 40,
          x: 50,
          z: zk,
          req: REQ[zk],
          s:
            "The roads out of " +
            ZNM[zk] +
            " are barred, and I won't lift the bar on " +
            nm +
            " for someone who can't hold their own. Win three battles and come back to me.",
        };
      else {
        const pn = ZSTR[p][1],
          bn = bossName(p);
        q = {
          n: "The Way Out: " + nm,
          d: "Defeat " + bn + " at the end of " + pn,
          st: () => (P.rdb && P.rdb[p] ? 1 : 0),
          k: 1,
          abs: 1,
          g: 60,
          x: 70,
          z: zk,
          req: [QI[p]],
          wh: () => {
            const t = ZRD[p];
            return t ? [zk].concat(zsP(t.X, -ZSL + 18)) : null;
          },
          s:
            bn +
            " still holds the end of " +
            pn +
            ". While it lives, nobody is safe on " +
            nm +
            " either. Bring it down and I'll open the next road.",
        };
      }
      QI[i] = QS.push(q) - 1;
    });
  } catch (e) {
    console.error("73-roadkeys quests", e);
  }

  // lock each village arch into its street (PT named after the street, leading into its own place)
  try {
    ZSTR.forEach(([zk, nm], i) => {
      const t = ZRD[i];
      PT.forEach((q) => {
        if (q.n !== nm || !q.to || !t || Math.abs(q.to[0] - t.X) > 1) return;
        const ol = q.lock;
        q.lock = () =>
          (ol && ol()) ||
          (open(i)
            ? null
            : nm + ' is barred. Finish "' + QS[QI[i]].n + '" for ' + qGiver(zk) + " to open it.");
      });
    });
  } catch (e) {
    console.error("73-roadkeys locks", e);
  }

  return { QI, open };
})();
