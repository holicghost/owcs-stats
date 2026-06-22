// ===== 데이터 모델 (명세 4장 — 시트에서 정규화) =====
// 모든 타입은 서버에서 만들어 클라이언트로 직렬화되므로 plain object 만 사용한다.

export type Score = { kind: "dist" | "pt"; val: number } | null;

export interface Ban {
  team: string;
  role: string;
  hero: string;
  phase: "first" | "second";
}

export interface Pick {
  role: string; // DPS / Tank / Support
  player: string;
  hero: string;
}

/** 세트(map) 레코드 — `OWCS 전체 공식경기` 시트 한 행 */
export interface SetRec {
  date: string;
  match: string;
  seriesId: string;
  replay: string;
  top: string;
  bottom: string;
  picker: string;
  mode: string;
  map: string;
  bans: Ban[];
  winner: string;
  loser: string;
  ws: Score;
  ls: Score;
  picks: { top: Pick[]; bottom: Pick[] };
}

/** 매치(series) — 같은 seriesId 묶음 */
export interface Series {
  seriesId: string;
  date: string;
  top: string;
  bottom: string;
  topW: number;
  bottomW: number;
  winner: string;
  loser: string;
}

export interface RosterEntry {
  name: string;
  roles: Record<string, number>;
  n: number;
}

export interface ModeRec {
  w: number;
  t: number;
}
export interface MapRec {
  w: number;
  l: number;
  mode: string;
}

/** 팀(team) 파생 */
export interface Team {
  name: string;
  mw: number;
  ml: number;
  mapW: number;
  mapL: number;
  modes: Record<string, ModeRec>;
  maps: Record<string, MapRec>;
  firstBan: Record<string, number>;
  secondBan: Record<string, number>;
  banAgainst: Record<string, number>;
  pickModes: Record<string, number>;
  pickMaps: Record<string, number>;
  seriesCount: number;
  closeSeries: number;
  longSeries: number;
  pushW: number;
  pushL: number;
  fullPush: number;
  roster: RosterEntry[];
}

export interface Standing {
  rank: number;
  team: string;
  win: number;
  lose: number;
  diff: number;
}

export interface Game {
  date: string;
  label: string;
  phase: "regular" | "playoff";
  a: string;
  b: string;
  sa: number;
  sb: number;
  status: "played" | "upcoming";
  tbd: boolean;
}

// ===== 선수 파생 (명세 13장) =====
export interface HeroStat {
  hero: string;
  n: number;
  w: number;
}
export interface PlayerMapStat {
  map: string;
  mode: string;
  n: number;
  w: number;
}
export interface Player {
  name: string;
  team: string;
  roles: Record<string, number>;
  n: number; // 전체 표본(등장 세트 수)
  heroes: Record<string, HeroStat>;
  maps: Record<string, PlayerMapStat>;
  modes: Record<string, ModeRec>;
}

/** 직렬화되는 전체 번들 (서버 → 클라이언트) */
export interface DataBundle {
  sets: SetRec[];
  series: Series[];
  teams: Record<string, Team>;
  standings: Standing[];
  schedule: Game[];
  teamNames: string[];
  players: Record<string, Player>;
  playerNames: string[];
  /** ZANSIDE 영웅 신호: 영웅별 승리세트/패배세트 등장 수 (승률 추정기 12.3.3) */
  usHeroSignal: Record<string, { w: number; l: number }>;
  /** 맵 → 모드 매핑 (승률 추정기 맵 선택용) */
  mapInfo: Record<string, string>;
  fetchedAt: string;
  us: string;
}
