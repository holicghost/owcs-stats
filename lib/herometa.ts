// 영웅·밴 메타 집계 (PART 2). 순수 함수 — DataBundle 에서 모두 계산한다.
// 지표 정의는 명세 18장을 따른다 (pick_count 는 (맵세트,팀) 단위 중복제거 등).
import { HEROES } from "./constants";
import type { DataBundle, SetRec } from "./types";

export type Role = "Tank" | "DPS" | "Support";
export interface HeroCount {
  hero: string;
  role: string;
  count: number;
}
export interface HeroWR {
  hero: string;
  role: string;
  played: number; // matches_played (18.4) — (맵세트,팀) 관측 수
  wins: number;
}

export interface MetaData {
  counters: {
    matches: number; // 시리즈 수
    mapsets: number; // 세트 수
    totalPicks: number; // 픽 관측(맵세트·팀·영웅 중복제거) 합
    totalBans: number; // 밴 관측 합
    uniqueHeroes: number; // 픽+밴 등장 고유 영웅
  };
  hasPickData: boolean;
  // 밴 (지금 가능)
  banGlobal: HeroCount[];
  banFirst: HeroCount[];
  banSecond: HeroCount[];
  banByTeam: Record<string, HeroCount[]>;
  banByMap: Record<string, HeroCount[]>;
  banByMode: Record<string, HeroCount[]>;
  // 픽 (데이터 있을 때)
  pickGlobal: HeroCount[];
  pickByMap: Record<string, HeroCount[]>;
  pickByTeam: Record<string, HeroWR[]>;
  heroWR: HeroWR[]; // 글로벌 영웅 승률
  positionPick: Record<Role, HeroCount[]>; // 역할 슬롯 기준
  teamNames: string[];
  mapNames: string[];
}

// 승/패 판정 (data.ts 와 동일 규칙)
function setWinner(s: SetRec): string {
  if (s.winner) return s.winner;
  if (s.mode === "Push" && s.ws && s.ls && s.ws.kind === "dist" && s.ls.kind === "dist") {
    return s.ws.val > s.ls.val ? s.top : s.bottom;
  }
  return "";
}

const sortCount = <T extends { count?: number; played?: number }>(arr: T[]) =>
  arr.slice().sort((a, b) => (b.count ?? b.played ?? 0) - (a.count ?? a.played ?? 0));
const mapToCounts = (m: Record<string, number>, role: (h: string) => string): HeroCount[] =>
  sortCount(Object.entries(m).map(([hero, count]) => ({ hero, role: role(hero), count })));

export function buildMeta(D: DataBundle): MetaData {
  // 영웅→역할 해석기: 픽 데이터(슬롯 역할)에서 다수결로 학습 + HEROES 상수 폴백
  const roleVotes: Record<string, Record<string, number>> = {};
  const voteRole = (hero: string, role: string) => {
    if (!hero || !role) return;
    (roleVotes[hero] = roleVotes[hero] || {})[role] = (roleVotes[hero][role] || 0) + 1;
  };
  const HERO_ROLE: Record<string, string> = {};
  (Object.keys(HEROES) as Role[]).forEach((r) => HEROES[r].forEach((h) => (HERO_ROLE[h] = r)));
  const roleOf = (hero: string): string => {
    const v = roleVotes[hero];
    if (v) {
      const top = Object.entries(v).sort((a, b) => b[1] - a[1])[0];
      if (top) return top[0];
    }
    return HERO_ROLE[hero] || "Unknown";
  };

  // ---- 밴 집계 (18.3) ----
  const banGlobal: Record<string, number> = {};
  const banFirst: Record<string, number> = {};
  const banSecond: Record<string, number> = {};
  const banByTeam: Record<string, Record<string, number>> = {};
  const banByMap: Record<string, Record<string, number>> = {};
  const banByMode: Record<string, Record<string, number>> = {};

  // ---- 픽 집계 (18.1 / 18.4 / 18.5) ----
  const pickGlobal: Record<string, number> = {};
  const pickByMap: Record<string, Record<string, number>> = {};
  const pickByTeam: Record<string, Record<string, { played: number; wins: number }>> = {};
  const heroWR: Record<string, { played: number; wins: number }> = {};
  const positionPick: Record<Role, Record<string, number>> = { Tank: {}, DPS: {}, Support: {} };
  const uniq = new Set<string>();
  let pickObs = 0;
  let banObs = 0;
  let anyPick = false;

  D.sets.forEach((s) => {
    const w = setWinner(s);
    // 밴
    s.bans.forEach((b) => {
      if (!b.hero) return;
      uniq.add(b.hero);
      banObs++;
      banGlobal[b.hero] = (banGlobal[b.hero] || 0) + 1;
      if (b.phase === "first") banFirst[b.hero] = (banFirst[b.hero] || 0) + 1;
      else banSecond[b.hero] = (banSecond[b.hero] || 0) + 1;
      if (b.team) (banByTeam[b.team] = banByTeam[b.team] || {})[b.hero] = ((banByTeam[b.team] || {})[b.hero] || 0) + 1;
      if (s.map) (banByMap[s.map] = banByMap[s.map] || {})[b.hero] = ((banByMap[s.map] || {})[b.hero] || 0) + 1;
      if (s.mode) (banByMode[s.mode] = banByMode[s.mode] || {})[b.hero] = ((banByMode[s.mode] || {})[b.hero] || 0) + 1;
    });

    // 픽 (양 팀) — (맵세트,팀) 단위 영웅 중복제거
    ([[s.picks.top, s.top], [s.picks.bottom, s.bottom]] as Array<[typeof s.picks.top, string]>).forEach(([ps, team]) => {
      if (!ps.length || !team) return;
      const seen = new Set<string>();
      ps.forEach((p) => {
        if (p.role && (p.role === "Tank" || p.role === "DPS" || p.role === "Support")) voteRole(p.hero, p.role);
        if (!p.hero || seen.has(p.hero)) return;
        seen.add(p.hero);
        anyPick = true;
        uniq.add(p.hero);
        pickObs++;
        const won = w === team;
        pickGlobal[p.hero] = (pickGlobal[p.hero] || 0) + 1;
        if (s.map) (pickByMap[s.map] = pickByMap[s.map] || {})[p.hero] = ((pickByMap[s.map] || {})[p.hero] || 0) + 1;
        // 팀별 영웅 승률
        const tt = (pickByTeam[team] = pickByTeam[team] || {});
        const tr = (tt[p.hero] = tt[p.hero] || { played: 0, wins: 0 });
        // 승자 미상 세트는 승률 분모에서 제외 (18.7)
        if (w) {
          tr.played++;
          if (won) tr.wins++;
          const hr = (heroWR[p.hero] = heroWR[p.hero] || { played: 0, wins: 0 });
          hr.played++;
          if (won) hr.wins++;
        }
        // 포지션(역할 슬롯) 픽
        const rr = (p.role === "Tank" || p.role === "DPS" || p.role === "Support" ? p.role : roleOf(p.hero)) as Role;
        if (rr === "Tank" || rr === "DPS" || rr === "Support") {
          positionPick[rr][p.hero] = (positionPick[rr][p.hero] || 0) + 1;
        }
      });
    });
  });

  const toWR = (m: Record<string, { played: number; wins: number }>): HeroWR[] =>
    Object.entries(m)
      .map(([hero, v]) => ({ hero, role: roleOf(hero), played: v.played, wins: v.wins }))
      .sort((a, b) => b.played - a.played);

  const mapByGroup = (g: Record<string, Record<string, number>>): Record<string, HeroCount[]> => {
    const out: Record<string, HeroCount[]> = {};
    Object.keys(g).forEach((k) => (out[k] = mapToCounts(g[k], roleOf)));
    return out;
  };

  return {
    counters: {
      matches: D.series.length,
      mapsets: D.sets.length,
      totalPicks: pickObs,
      totalBans: banObs,
      uniqueHeroes: uniq.size,
    },
    hasPickData: anyPick,
    banGlobal: mapToCounts(banGlobal, roleOf),
    banFirst: mapToCounts(banFirst, roleOf),
    banSecond: mapToCounts(banSecond, roleOf),
    banByTeam: mapByGroup(banByTeam),
    banByMap: mapByGroup(banByMap),
    banByMode: mapByGroup(banByMode),
    pickGlobal: mapToCounts(pickGlobal, roleOf),
    pickByMap: mapByGroup(pickByMap),
    pickByTeam: Object.fromEntries(Object.keys(pickByTeam).map((t) => [t, toWR(pickByTeam[t])])),
    heroWR: toWR(heroWR),
    positionPick: {
      Tank: mapToCounts(positionPick.Tank, roleOf),
      DPS: mapToCounts(positionPick.DPS, roleOf),
      Support: mapToCounts(positionPick.Support, roleOf),
    },
    teamNames: D.teamNames,
    mapNames: [...new Set(D.sets.map((s) => s.map).filter(Boolean))].sort(),
  };
}
