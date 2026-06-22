// 서버 전용 데이터 레이어 — 시트 fetch(ISR) → 파싱 → 파생 → 직렬화 번들.
// 명세 11.1: 파서를 먼저 만들고 4.4/8.5 로 검증한 뒤 화면에 쓴다.
import { parseCSV } from "./csv";
import {
  C, FULLPUSH, MAIN_EXPORT, MAIN_GVIZ, BRACKET_URL, STANDINGS_URL, REVALIDATE, US, HERO_KO,
} from "./constants";
import type {
  Ban, DataBundle, DataHealth, Game, Pick, Player, Score, SetRec, Series, Standing, Team,
} from "./types";
import { PLAYER_NAME_FIX, PLAYER_CANON, TEAM_NAME_FIX } from "./aliases";
import { validateSets, crossIssues } from "./validate";
import { SWAP_DATA_RAW } from "./swapData";

// ===== 파싱 헬퍼 =====
function norm(s: unknown): string {
  return (s == null ? "" : String(s)).trim().normalize("NFC");
}
// 영웅명 대소문자 정규화: 시트의 SHION 등 → 카탈로그 표준키(Shion)로 통일.
// 이래야 HERO_ROLE·HEROES 매칭(역할 그룹·추천·밴 포지션)이 빠짐없이 동작한다.
const HERO_CANON_LC: Record<string, string> = {};
Object.keys(HERO_KO).forEach((k) => (HERO_CANON_LC[k.toLowerCase()] = k));
function canonHero(name: string): string {
  const n = norm(name);
  return n ? HERO_CANON_LC[n.toLowerCase()] || n : "";
}
function parseScore(raw: unknown): Score {
  const s = norm(raw);
  if (!s) return null;
  if (/m$/i.test(s)) {
    // 8.1: "144.86m" 처럼 m 이 붙으면 거리. 거리는 큰 값이 승.
    const v = parseFloat(s);
    return isNaN(v) ? null : { kind: "dist", val: v };
  }
  const num = parseInt(s.replace(/[^\d-]/g, ""), 10);
  return isNaN(num) ? null : { kind: "pt", val: num };
}

// 선픽 컬럼 위치 해석 (헤더 2행의 "딜러1 선수명" 위치로 상수/하수 블록을 찾음)
function resolvePickCols(header: string[]): { top: Array<[number, number, string]>; bottom: Array<[number, number, string]> } {
  const R = ["DPS", "DPS", "Tank", "Support", "Support"];
  const starts: number[] = [];
  (header || []).forEach((h, i) => {
    if (norm(h) === "딜러1 선수명") starts.push(i);
  });
  const build = (s: number): Array<[number, number, string]> =>
    R.map((role, k) => [s + k * 2, s + k * 2 + 1, role] as [number, number, string]);
  return {
    top: starts[0] != null ? build(starts[0]) : [],
    bottom: starts[1] != null ? build(starts[1]) : [],
  };
}
function readPicks(r: string[], slots: Array<[number, number, string]>): Pick[] {
  return slots
    .map(([ni, hi, role]) => ({ role, player: norm(r[ni]), hero: canonHero(r[hi]) }))
    .filter((p) => p.player || p.hero);
}

// ===== 교체(변경 영웅) 데이터 병합 =====
// 시트 메모(43열)가 비어 있어, 사용자 제공 교체 정보를 (날짜·팀·맵·선수) 키로 세트 메모에 주입한다.
// 결과·픽·밴은 시트 그대로. 여기서는 "오프닝 이후 교체"만 보강(라인업=오프닝+교체, 픽률 교체포함 집계).
function monthDay(d: string): string {
  const iso = (d || "").match(/\d{4}\D(\d{1,2})\D(\d{1,2})/);
  if (iso) return `${+iso[1]}/${+iso[2]}`;
  const md = (d || "").match(/(\d{1,2})\D+(\d{1,2})/);
  return md ? `${+md[1]}/${+md[2]}` : "";
}
const keyTeam = (t: string) => norm(t).toLowerCase();
const keyMap = (m: string) => norm(m).toLowerCase();
const keyPlayer = (p: string) => norm(p).toLowerCase().replace(/0/g, "o");
interface SwapBlock { players: Record<string, string[]> }
let SWAP_INDEX: Record<string, SwapBlock> | null = null;
function parseSwapData(): Record<string, SwapBlock> {
  const out: Record<string, SwapBlock> = {};
  let md = "", curMap = "", curTeam = "";
  SWAP_DATA_RAW.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^■\s*(\d{1,2})\/(\d{1,2})/))) { md = `${+m[1]}/${+m[2]}`; curMap = ""; curTeam = ""; return; }
    if ((m = line.match(/^·\s*(.+)$/))) { curMap = m[1].trim(); curTeam = ""; return; }
    if ((m = line.match(/^\[(.+)\]$/))) { curTeam = m[1].trim(); return; }
    if ((m = line.match(/^(.+?)\((?:딜러|탱커|서포터)\)\s*:\s*(.+)$/))) {
      if (!md || !curMap || !curTeam) return;
      const player = m[1].trim();
      const chain = m[2].split(/→|->/).map((x) => x.trim()).filter(Boolean).map((h) => canonHero(h));
      if (!player || !chain.length) return;
      const k = `${md}|${keyTeam(curTeam)}|${keyMap(curMap)}`;
      (out[k] = out[k] || { players: {} }).players[keyPlayer(player)] = chain;
    }
  });
  return out;
}
function attachSwaps(sets: SetRec[]): { sets: number; lines: number } {
  if (!SWAP_INDEX) SWAP_INDEX = parseSwapData();
  let matchedSets = 0, lines = 0;
  sets.forEach((s) => {
    if (s.memo) return; // 시트에 메모가 있으면 보존
    const md = monthDay(s.date);
    if (!md || !s.map) return;
    const out: string[] = [];
    ([[s.top, s.picks.top], [s.bottom, s.picks.bottom]] as Array<[string, Pick[]]>).forEach(([team, picks]) => {
      const blk = SWAP_INDEX![`${md}|${keyTeam(team)}|${keyMap(s.map)}`];
      if (!blk) return;
      picks.forEach((p) => {
        const chain = blk.players[keyPlayer(p.player)];
        if (!chain || chain.length < 2) return;
        const swaps = chain.slice(1); // 오프닝 제외 — 라인업은 오프닝 픽 + 교체로 그린다
        if (swaps.length) { out.push(`${p.player}: ${swaps.join(", ")}`); lines++; }
      });
    });
    if (out.length) { s.memo = out.join("\n"); matchedSets++; }
  });
  return { sets: matchedSets, lines };
}

// ===== 시트별 파서 (명세 4.1 / 4.4 / 4.5) =====
function parseMain(text: string): SetRec[] {
  const data = parseCSV(text);
  const cols = resolvePickCols(data[1] || []);
  const rows = data.slice(2).filter((r) => norm(r[C.date]) && norm(r[C.match]));
  return rows.map((r) => {
    const date = norm(r[C.date]);
    const match = norm(r[C.match]);
    const seriesId = date + " " + match.split("#")[0].trim();
    const bans: Ban[] = [
      { team: norm(r[C.b1t]), role: norm(r[C.b1r]), hero: canonHero(r[C.b1h]), phase: "first" as const },
      { team: norm(r[C.b2t]), role: norm(r[C.b2r]), hero: canonHero(r[C.b2h]), phase: "second" as const },
    ].filter((b) => b.team && b.hero);
    return {
      date, match, seriesId, replay: norm(r[C.replay]),
      top: norm(r[C.top]), bottom: norm(r[C.bottom]),
      picker: norm(r[C.picker]), mode: norm(r[C.mode]), map: norm(r[C.map]), bans,
      winner: norm(r[C.winner]), loser: norm(r[C.loser]),
      ws: parseScore(r[C.wscore]), ls: parseScore(r[C.lscore]),
      picks: { top: readPicks(r, cols.top), bottom: readPicks(r, cols.bottom) },
      memo: norm(r[C.memo]),
    };
  });
}

function parseStandings(text: string): Standing[] {
  const data = parseCSV(text);
  const out: Standing[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rank = norm(row[0]);
    const team = norm(row[1]);
    if (!/^\d+$/.test(rank) || !team) continue;
    const diff = parseInt(norm(row[4]).replace(/[^\d-]/g, "").replace(/^−/, "-"), 10);
    out.push({
      rank: +rank, team,
      win: +norm(row[2]) || 0, lose: +norm(row[3]) || 0,
      diff: isNaN(diff) ? 0 : diff,
    });
  }
  return out;
}

function parseBracket(text: string): Game[] {
  const data = parseCSV(text);
  const blocks = [[1, 2, 3, 4], [6, 7, 8, 9], [11, 12, 13, 14]];
  const dateCols = [1, 6, 11];
  let curDates = ["", "", ""];
  let curPhase: Array<"regular" | "playoff"> = ["regular", "regular", "regular"];
  const games: Game[] = [];
  data.forEach((row) => {
    const c0 = norm(row[0]);
    const looksHeader = !c0 && dateCols.some((ci) => {
      const v = norm(row[ci]);
      return /\d+\/\d+/.test(v) || /라운드|승자조|패자조|결승/.test(v);
    });
    if (looksHeader) {
      curDates = dateCols.map((ci) => norm(row[ci]));
      curPhase = dateCols.map((ci) =>
        /라운드|승자조|패자조|결승/.test(norm(row[ci])) ? "playoff" : "regular"
      );
      return;
    }
    if (!/경기/.test(c0)) return;
    blocks.forEach((b, i) => {
      const a = norm(row[b[0]]);
      const sa = norm(row[b[1]]);
      const sb = norm(row[b[2]]);
      const bt = norm(row[b[3]]);
      if (!a || !bt) return;
      const na = parseInt(sa, 10);
      const nb = parseInt(sb, 10);
      const decided = na > 0 || nb > 0;
      games.push({
        date: curDates[i], label: c0, phase: curPhase[i],
        a, b: bt, sa: isNaN(na) ? 0 : na, sb: isNaN(nb) ? 0 : nb,
        status: decided ? "played" : "upcoming",
        tbd: /TBD|G\d|R2|승자|패자/i.test(a) || /TBD|G\d|R2|승자|패자/i.test(bt),
      });
    });
  });
  return games;
}

// 선수명 정규화 (명세 23.5): 대소문자 차이 + 영문 O / 숫자 0 혼용을 한 선수로 병합.
// 예) iR0NY=iRONY, Kilo=KILO, Perr=perr, FEARFUL=Fearful. 표시명은 대표 1종으로 통일.
// sets 의 picks 를 직접 갱신해 이후 모든 파생(선수·로스터·라인업)이 같은 표기를 쓴다.
function canonicalizePlayers(sets: SetRec[]): void {
  const keyOf = (s: string) => s.toUpperCase().replace(/0/g, "O");
  const byKey = new Map<string, Map<string, number>>();
  for (const s of sets) {
    for (const side of [s.picks.top, s.picks.bottom]) {
      for (const p of side) {
        if (!p.player) continue;
        const k = keyOf(p.player);
        const m = byKey.get(k) || new Map<string, number>();
        m.set(p.player, (m.get(p.player) || 0) + 1);
        byKey.set(k, m);
      }
    }
  }
  const rep = new Map<string, string>();
  for (const [k, m] of byKey) {
    // 수동 교정 우선 (aliases.ts), 없으면 자동 규칙으로 대표 선택
    let best = PLAYER_CANON[k];
    if (!best) {
      // 소문자 포함(예쁜 표기) > 0 없음 > 빈도 > 짧음 > 알파벳
      best = [...m.entries()].sort((a, b) => {
        const lowA = /[a-z]/.test(a[0]) ? 1 : 0, lowB = /[a-z]/.test(b[0]) ? 1 : 0;
        const zA = a[0].includes("0") ? 1 : 0, zB = b[0].includes("0") ? 1 : 0;
        return lowB - lowA || zA - zB || b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]);
      })[0][0];
    }
    rep.set(k, best);
  }
  for (const s of sets) {
    for (const side of [s.picks.top, s.picks.bottom]) {
      for (const p of side) {
        if (!p.player) continue;
        p.player = PLAYER_NAME_FIX[p.player] || rep.get(keyOf(p.player)) || p.player;
      }
    }
  }
}

// 팀 이름 교정 (28.1). 기본은 no-op(설정이 비어 있으면 건드리지 않음).
function canonicalizeTeams(sets: SetRec[], standings: Standing[], schedule: Game[]): void {
  if (!Object.keys(TEAM_NAME_FIX).length) return;
  const fix = (n: string) => TEAM_NAME_FIX[n] || n;
  sets.forEach((s) => {
    s.top = fix(s.top); s.bottom = fix(s.bottom); s.winner = fix(s.winner); s.loser = fix(s.loser);
    if (s.picker && s.picker !== "ADMIN") s.picker = fix(s.picker);
    s.bans.forEach((b) => (b.team = fix(b.team)));
  });
  standings.forEach((st) => (st.team = fix(st.team)));
  schedule.forEach((g) => { g.a = fix(g.a); g.b = fix(g.b); });
}

// 승/패 판정: winner 컬럼 우선(푸시 포함 신뢰), 없으면 거리 비교
function setWinner(s: SetRec): string {
  if (s.winner) return s.winner;
  if (s.mode === "Push" && s.ws && s.ls && s.ws.kind === "dist" && s.ls.kind === "dist") {
    return s.ws.val > s.ls.val ? s.top : s.bottom;
  }
  return "";
}

function emptyTeam(name: string): Team {
  return {
    name, mw: 0, ml: 0, mapW: 0, mapL: 0, modes: {}, maps: {},
    firstBan: {}, secondBan: {}, banAgainst: {}, pickModes: {}, pickMaps: {},
    seriesCount: 0, closeSeries: 0, longSeries: 0, pushW: 0, pushL: 0, fullPush: 0,
    roster: [],
  };
}

// ===== 파생 (명세 4.2 / 4.3 / 13) =====
function derive(sets: SetRec[], standings: Standing[]): {
  series: Series[];
  teams: Record<string, Team>;
  teamNames: string[];
  players: Record<string, Player>;
  playerNames: string[];
  usHeroSignal: Record<string, { w: number; l: number }>;
  mapInfo: Record<string, string>;
} {
  const teams: Record<string, Team> = {};
  const rosterMaps: Record<string, Map<string, { name: string; roles: Record<string, number>; n: number }>> = {};
  const team = (name: string): Team => {
    if (!teams[name]) {
      teams[name] = emptyTeam(name);
      rosterMaps[name] = new Map();
    }
    return teams[name];
  };

  // 시리즈 묶기
  type SeriesWork = Series & { sets: SetRec[] };
  const sm = new Map<string, SeriesWork>();
  sets.forEach((s) => {
    if (!sm.has(s.seriesId)) {
      sm.set(s.seriesId, {
        seriesId: s.seriesId, date: s.date, top: s.top, bottom: s.bottom,
        sets: [], topW: 0, bottomW: 0, winner: "", loser: "",
      });
    }
    const S = sm.get(s.seriesId)!;
    S.sets.push(s);
    const w = setWinner(s);
    if (w === S.top) S.topW++;
    else if (w === S.bottom) S.bottomW++;
  });
  const series = [...sm.values()];
  series.forEach((S) => {
    S.winner = S.topW > S.bottomW ? S.top : S.bottomW > S.topW ? S.bottom : "";
    S.loser = S.winner === S.top ? S.bottom : S.winner === S.bottom ? S.top : "";
  });
  series.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : a.seriesId < b.seriesId ? -1 : 1
  );

  // 선수 집계 (명세 13)
  const players: Record<string, Player> = {};
  const playerTeamN: Record<string, Record<string, number>> = {}; // 선수별 팀 출전 횟수 (소속=최다 출전 팀)
  const player = (name: string, teamName: string): Player => {
    if (!players[name]) {
      players[name] = { name, team: teamName, roles: {}, n: 0, heroes: {}, maps: {}, modes: {}, cells: {} };
    }
    return players[name];
  };
  const usHeroSignal: Record<string, { w: number; l: number }> = {};
  const mapInfo: Record<string, string> = {};

  series.forEach((S) => {
    const A = team(S.top);
    const B = team(S.bottom);
    A.mapW += S.topW; A.mapL += S.bottomW;
    B.mapW += S.bottomW; B.mapL += S.topW;
    if (S.winner) {
      if (S.winner === S.top) { A.mw++; B.ml++; } else { B.mw++; A.ml++; }
    }
    [A, B].forEach((t) => {
      t.seriesCount++;
      const total = S.topW + S.bottomW;
      const margin = Math.abs(S.topW - S.bottomW);
      if (margin <= 1 && S.winner) t.closeSeries++;
      if (total >= 5) t.longSeries++;
    });

    S.sets.forEach((s) => {
      const w = setWinner(s);
      if (s.map && s.mode) mapInfo[s.map] = s.mode;
      ([[A, A.name], [B, B.name]] as Array<[Team, string]>).forEach(([t, nm]) => {
        const won = w === nm;
        if (s.mode) {
          (t.modes[s.mode] = t.modes[s.mode] || { w: 0, t: 0 }).t++;
          if (won) t.modes[s.mode].w++;
        }
        if (s.map) {
          const mr = (t.maps[s.map] = t.maps[s.map] || { w: 0, l: 0, mode: s.mode });
          won ? mr.w++ : mr.l++;
        }
        if (s.mode === "Push") won ? t.pushW++ : t.pushL++;
      });
      // 풀푸시 (거리) — 승자팀 기준
      if (s.mode === "Push" && s.ws && s.ws.kind === "dist" && s.ws.val >= FULLPUSH) {
        const wt = w && teams[w];
        if (wt) wt.fullPush++;
      }
      // 맵 픽권 (ADMIN/공란 제외 — 8.2)
      if (s.picker && s.picker !== "ADMIN" && teams[s.picker]) {
        const pt = teams[s.picker];
        if (s.mode) pt.pickModes[s.mode] = (pt.pickModes[s.mode] || 0) + 1;
        if (s.map) pt.pickMaps[s.map] = (pt.pickMaps[s.map] || 0) + 1;
      }
      // 밴
      s.bans.forEach((b) => {
        const bt = teams[b.team] ? teams[b.team] : team(b.team);
        const tgt = b.phase === "first" ? bt.firstBan : bt.secondBan;
        tgt[b.hero] = (tgt[b.hero] || 0) + 1;
        const opp = b.team === s.top ? s.bottom : s.top;
        if (teams[opp]) teams[opp].banAgainst[b.hero] = (teams[opp].banAgainst[b.hero] || 0) + 1;
      });
      // 로스터 + 선수/영웅 집계 (첫픽 입력 시)
      ([[s.picks.top, s.top], [s.picks.bottom, s.bottom]] as Array<[Pick[], string]>).forEach(([ps, nm]) => {
        if (!teams[nm]) return;
        const won = w === nm;
        ps.forEach((p) => {
          if (!p.player) return;
          const rm = rosterMaps[nm];
          const r = rm.get(p.player) || { name: p.player, roles: {}, n: 0 };
          r.n++;
          r.roles[p.role] = (r.roles[p.role] || 0) + 1;
          rm.set(p.player, r);

          // 선수 단위
          const pl = player(p.player, nm);
          pl.n++;
          pl.roles[p.role] = (pl.roles[p.role] || 0) + 1;
          (playerTeamN[p.player] = playerTeamN[p.player] || {})[nm] = (playerTeamN[p.player][nm] || 0) + 1;
          if (p.hero) {
            const hs = (pl.heroes[p.hero] = pl.heroes[p.hero] || { hero: p.hero, n: 0, w: 0 });
            hs.n++;
            if (won) hs.w++;
          }
          if (s.map) {
            const pm = (pl.maps[s.map] = pl.maps[s.map] || { map: s.map, mode: s.mode, n: 0, w: 0 });
            pm.n++;
            if (won) pm.w++;
          }
          if (s.mode) {
            const mm = (pl.modes[s.mode] = pl.modes[s.mode] || { w: 0, t: 0 });
            mm.t++;
            if (won) mm.w++;
          }
          // 영웅×맵 셀 (13.3 히트맵)
          if (p.hero && s.map) {
            const ck = `${p.hero} ${s.map}`;
            const cc = (pl.cells[ck] = pl.cells[ck] || { hero: p.hero, map: s.map, mode: s.mode, n: 0, w: 0 });
            cc.n++;
            if (won) cc.w++;
          }
          // ZANSIDE 영웅 신호 (12.3.3)
          if (nm === US && p.hero) {
            const sig = (usHeroSignal[p.hero] = usHeroSignal[p.hero] || { w: 0, l: 0 });
            won ? sig.w++ : sig.l++;
          }
        });
      });
    });
  });

  // roster Map → 정렬된 배열
  Object.keys(teams).forEach((nm) => {
    teams[nm].roster = [...rosterMaps[nm].values()].sort((a, b) => b.n - a.n);
  });

  // 팀명 목록 (순위표 우선)
  const rankOf = (name: string) => {
    const s = standings.find((x) => x.team === name);
    return s ? s.rank : null;
  };
  const names = new Set(standings.map((s) => s.team));
  Object.keys(teams).forEach((n) => names.add(n));
  const teamNames = [...names].filter(Boolean).sort((a, b) => {
    const ra = rankOf(a) ?? 99;
    const rb = rankOf(b) ?? 99;
    return ra - rb || a.localeCompare(b);
  });

  // 소속 팀 = 가장 많이 출전한 팀 (이적·교체로 여러 팀에 걸친 경우 보정)
  Object.keys(players).forEach((nm) => {
    const tc = playerTeamN[nm];
    if (tc) players[nm].team = Object.entries(tc).sort((a, b) => b[1] - a[1])[0][0];
  });

  const playerNames = Object.keys(players).sort((a, b) =>
    players[b].n - players[a].n || a.localeCompare(b)
  );

  const plainSeries: Series[] = series.map(({ sets: _s, ...rest }) => rest);
  return { series: plainSeries, teams, teamNames, players, playerNames, usHeroSignal, mapInfo };
}

// ===== fetch (ISR) =====
async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!r.ok) throw new Error("HTTP " + r.status + " — " + url);
  return r.text();
}
async function fetchMain(): Promise<string> {
  // export CSV 가 푸시 거리값을 보존 → 우선, 실패 시 gviz 폴백(거리값 손실)
  try {
    return await fetchText(MAIN_EXPORT);
  } catch (e) {
    console.warn("export CSV 실패, gviz 폴백:", (e as Error).message);
    return await fetchText(MAIN_GVIZ);
  }
}
// 영웅 아이콘(초상화) 맵 — overfast-api. 실패해도 화면은 정상(아이콘만 생략).
async function fetchHeroIcons(): Promise<Record<string, string>> {
  try {
    const r = await fetch("https://overfast-api.tekrop.fr/heroes", { next: { revalidate: 86400 } });
    if (!r.ok) return {};
    const list = (await r.json()) as Array<{ key?: string; portrait?: string }>;
    const out: Record<string, string> = {};
    for (const h of list) if (h.key && h.portrait) out[h.key] = h.portrait;
    return out;
  } catch {
    return {};
  }
}

export async function getData(): Promise<DataBundle> {
  const [mainTxt, brkTxt, stTxt, heroIcons] = await Promise.all([
    fetchMain(),
    fetchText(BRACKET_URL),
    fetchText(STANDINGS_URL),
    fetchHeroIcons(),
  ]);
  const parsed = parseMain(mainTxt);
  if (!parsed.length) throw new Error("경기 데이터 행을 찾지 못했습니다.");
  const standings = parseStandings(stTxt);
  const schedule = parseBracket(brkTxt);
  canonicalizePlayers(parsed); // 23.5 — 파생 전에 선수명 통일
  canonicalizeTeams(parsed, standings, schedule); // 28.1
  attachSwaps(parsed); // 교체(변경 영웅) 데이터 병합 — 팀·선수명 정규화 후에 매칭

  // 28.5 검수: 치명적 오류 행은 통계에서 제외
  const { clean: sets, issues: rowIssues, dropped } = validateSets(parsed);
  const d = derive(sets, standings);
  const cross = crossIssues(d.series, d.teams, schedule, standings);
  const issues = [...rowIssues, ...cross];
  const health: DataHealth = {
    issues,
    okRows: sets.length,
    warn: issues.filter((i) => i.level === "warn").length,
    error: issues.filter((i) => i.level === "error").length,
    dropped,
  };

  return {
    sets, series: d.series, teams: d.teams, standings, schedule,
    teamNames: d.teamNames, players: d.players, playerNames: d.playerNames,
    usHeroSignal: d.usHeroSignal, mapInfo: d.mapInfo, health, heroIcons,
    fetchedAt: new Date().toISOString(), us: US,
  };
}
