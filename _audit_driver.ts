import { getData } from "./lib/data";
import {
  renderHome, renderMatchday, renderScout, playerStatsPanel, renderBanpick,
  renderZanside, renderZansideBan, renderHeroBan, renderBanAnalysis,
  renderZansideMaps, renderMaps, renderLog, renderScenario, renderPlayers,
  renderEstimator, findSetByKey, setToEstInput,
} from "./lib/render";
import type { DeepUI, BanUI, HeroBanUI, MapsUI, LogFilter, PlayerUI, EstInput } from "./lib/render";

function check(name: string, fn: () => string) {
  try {
    const out = fn();
    const len = (out || "").length;
    const flag = len < 40 ? "  <<< SUSPICIOUS (very short / empty)" : "";
    console.log(`OK   ${name}  [len=${len}]${flag}`);
  } catch (e) {
    console.log(`THROW ${name}: ${(e as Error).stack || (e as Error).message || e}`);
  }
}

(async () => {
  const D = await getData();
  console.log(`=== data loaded: teams=${D.teamNames.length} sets=${D.sets.length} players=${D.playerNames.length} us=${D.us} ===`);
  console.log(`teamNames: ${D.teamNames.join(", ")}`);

  const us = D.us;
  const other = D.teamNames.find((n) => n !== us) || us;
  const ZETA = D.teamNames.includes("ZETA") ? "ZETA" : other;
  console.log(`other=${other} ZETA=${ZETA}`);

  const deepAll: DeepUI = { agg: "swap", sort: "pick", smp: 0, banExpand: "", role: "all" };
  const deepTank: DeepUI = { agg: "main", sort: "wr", smp: 1, banExpand: "", role: "Tank" };

  check("renderHome", () => renderHome(D));
  check("renderMatchday(empty)", () => renderMatchday(D, ""));
  // matchday with a weakExpand value
  check("renderMatchday(expand)", () => renderMatchday(D, "x"));

  // renderScout for EVERY tab, for us, other, ZETA, with both deeps
  const scoutTabs = ["summary", "games", "heroes", "heroban", "maps", "mapban", "garbage-tab"];
  for (const team of [us, other, ZETA]) {
    for (const tab of scoutTabs) {
      check(`renderScout(${team},${tab},deepAll)`, () => renderScout(D, team, tab, deepAll, ""));
      check(`renderScout(${team},${tab},deepTank)`, () => renderScout(D, team, tab, deepTank, ""));
    }
  }
  // scout with nonexistent team
  check("renderScout(NOPE,summary)", () => renderScout(D, "NOPE_TEAM", "summary", deepAll, ""));

  // playerStatsPanel for a real player + a bogus one
  const aPlayer = D.playerNames[0] || "";
  check(`playerStatsPanel(${aPlayer})`, () => playerStatsPanel(D, aPlayer));
  check("playerStatsPanel(BOGUS)", () => playerStatsPanel(D, "___nobody___"));

  check("renderBanpick(default us)", () => renderBanpick(D, us));
  check(`renderBanpick(${ZETA})`, () => renderBanpick(D, ZETA));

  check("renderZanside(empty)", () => renderZanside(D, ""));

  const banUI: BanUI = { role: "all", topN: 12, team: "", banMap: "all", banExpand: "" };
  const banUITank: BanUI = { role: "Tank", topN: 5, team: ZETA, banMap: "all", banExpand: "" };
  check("renderZansideBan(all)", () => renderZansideBan(D, banUI));
  check("renderZansideBan(tank)", () => renderZansideBan(D, banUITank));
  check("renderBanAnalysis(all)", () => renderBanAnalysis(D, banUI));
  check("renderBanAnalysis(tank)", () => renderBanAnalysis(D, banUITank));

  // renderHeroBan empty + selected hero
  const aHero = D.sets.flatMap((s) => s.bans.map((b) => b.hero)).find(Boolean) || "";
  const hbEmpty: HeroBanUI = { hero: "", search: "", team: "", role: "all" };
  const hbSel: HeroBanUI = { hero: aHero, search: "", team: ZETA, role: "all" };
  const hbSearch: HeroBanUI = { hero: "", search: "a", team: "", role: "Tank" };
  check("renderHeroBan(empty)", () => renderHeroBan(D, hbEmpty));
  check(`renderHeroBan(hero=${aHero})`, () => renderHeroBan(D, hbSel));
  check("renderHeroBan(search=a,Tank)", () => renderHeroBan(D, hbSearch));

  check("renderZansideMaps", () => renderZansideMaps(D));

  const aMap = [...new Set(D.sets.map((s) => s.map).filter(Boolean))][0] || "";
  const mapsEmpty: MapsUI = { mode: "all", map: "" };
  const mapsSel: MapsUI = { mode: "all", map: aMap };
  check("renderMaps(empty)", () => renderMaps(D, mapsEmpty));
  check(`renderMaps(map=${aMap})`, () => renderMaps(D, mapsSel));

  // renderLog with a real set expanded
  const someSet = D.sets[0];
  const setK = someSet ? `${someSet.date}|${someSet.match}|${someSet.map}` : "";
  const logF: LogFilter = { z: "all", team: "", mode: "", map: "", date: "" };
  const logFus: LogFilter = { z: "us", team: us, mode: "", map: "", date: "" };
  check("renderLog(all, no expand)", () => renderLog(D, logF, [], "new"));
  check("renderLog(all, expanded set)", () => renderLog(D, logF, [setK], "old"));
  check("renderLog(us filter)", () => renderLog(D, logFus, [setK], "new"));
  // verify findSetByKey resolves the same key the log uses
  console.log(`findSetByKey(${setK}) => ${findSetByKey(D, setK) ? "FOUND" : "NULL"}`);
  console.log(`setToEstInput(${setK}) => ${setToEstInput(D, setK) ? "OK" : "NULL"}`);

  check("renderScenario", () => renderScenario(D));

  const playerUI: PlayerUI = {
    playerA: aPlayer, playerB: "", search: "", pickTeam: "", pickTeamB: "",
    heroExpand: "", heroMapSel: "", mapExpand: "",
  };
  check("renderPlayers(A only)", () => renderPlayers(D, playerUI));
  // comparison: two players
  const pB = D.playerNames[1] || aPlayer;
  const playerUI2: PlayerUI = {
    playerA: aPlayer, playerB: pB, search: "", pickTeam: "", pickTeamB: "",
    heroExpand: "", heroMapSel: "", mapExpand: "",
  };
  check("renderPlayers(A vs B)", () => renderPlayers(D, playerUI2));
  check("renderPlayers(empty)", () => renderPlayers(D, { playerA: "", playerB: "", search: "", pickTeam: "", pickTeamB: "", heroExpand: "", heroMapSel: "", mapExpand: "" }));

  // estimator from a real set, plus empty
  const est = (setToEstInput(D, setK) || {
    map: aMap, usPlayers: ["", "", "", "", ""], usHeroes: ["", "", "", "", ""],
    oppTeam: "", oppPlayers: ["", "", "", "", ""], oppHeroes: ["", "", "", "", ""], srcKey: "",
  }) as EstInput;
  check("renderEstimator(from set)", () => renderEstimator(D, est));
  check("renderEstimator(empty)", () => renderEstimator(D, {
    map: "", usPlayers: ["", "", "", "", ""], usHeroes: ["", "", "", "", ""],
    oppTeam: "", oppPlayers: ["", "", "", "", ""], oppHeroes: ["", "", "", "", ""], srcKey: "",
  }));

  console.log("=== DONE ===");
})().catch((e) => {
  console.log(`FATAL: ${(e as Error).stack || e}`);
  process.exit(1);
});
