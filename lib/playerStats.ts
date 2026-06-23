// OWCS 선수 스탯 시트: 파싱 + 10분당 정규화 + 매치 메타(맵·모드·승패·영웅) 조인.
// 누적값(딜·힐·방어·E·A·D)은 반드시 10분당 정규화 후 비교한다. 딜러의 힐/방어 0은 정상값.
import { parseCSV } from "./csv";
import { gviz } from "./constants";
import type { SetRec, PStatRow } from "./types";

export const PLAYER_STATS_SHEET = "OWCS 선수 스탯";
export const PLAYER_STATS_URL = gviz(PLAYER_STATS_SHEET);

// mm:ss → 분 (예: "11:43" → 11.7167). 이미 분 숫자면 그대로.
export function parseDurationMin(raw: unknown): number {
  const s = String(raw ?? "").trim();
  const m = s.match(/^(\d+):([0-5]?\d)$/);
  if (m) return +m[1] + +m[2] / 60;
  const n = parseFloat(s.replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
}
const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? "").replace(/[, ]/g, ""));
  return isNaN(n) ? 0 : n;
};
// 이름 매칭 키 (대소문자·0/O·공백 무시) — iR0NY / IRONY / ir0ny 동일 취급
const normKey = (n: string) => String(n || "").trim().toLowerCase().replace(/0/g, "o").replace(/\s+/g, "");

// 메타 열 + 역할 슬롯 base 인덱스: 각 슬롯 = [이름, E, A, D, 딜량, 힐량, 방어량] = base+0..6
const C = { date: 0, match: 1, replay: 2, top: 3, bottom: 4, dur: 6 } as const;
const SLOTS: Array<{ side: "top" | "bot"; role: PStatRow["role"]; label: string; base: number }> = [
  { side: "top", role: "DPS", label: "딜러1", base: 22 }, { side: "top", role: "DPS", label: "딜러2", base: 29 },
  { side: "top", role: "Tank", label: "탱커", base: 36 }, { side: "top", role: "Support", label: "힐러1", base: 43 }, { side: "top", role: "Support", label: "힐러2", base: 50 },
  { side: "bot", role: "DPS", label: "딜러1", base: 58 }, { side: "bot", role: "DPS", label: "딜러2", base: 65 },
  { side: "bot", role: "Tank", label: "탱커", base: 72 }, { side: "bot", role: "Support", label: "힐러1", base: 79 }, { side: "bot", role: "Support", label: "힐러2", base: 86 },
];

export interface RawStat {
  replay: string; date: string; match: string; topTeam: string; botTeam: string; durMin: number;
  side: "top" | "bot"; role: PStatRow["role"]; roleSlot: string; name: string;
  e: number; a: number; d: number; dmg: number; heal: number; mit: number;
}

export function parsePlayerStatsCSV(text: string): RawStat[] {
  const data = parseCSV(text);
  const rows = data.slice(2); // 2행 헤더(섹션/필드)
  const out: RawStat[] = [];
  rows.forEach((r) => {
    const replay = String(r[C.replay] ?? "").trim();
    if (!replay) return;
    const durMin = parseDurationMin(r[C.dur]);
    const topTeam = String(r[C.top] ?? "").trim(), botTeam = String(r[C.bottom] ?? "").trim();
    SLOTS.forEach((sl) => {
      const name = String(r[sl.base] ?? "").trim();
      if (!name) return;
      const e = num(r[sl.base + 1]), a = num(r[sl.base + 2]), d = num(r[sl.base + 3]);
      const dmg = num(r[sl.base + 4]), heal = num(r[sl.base + 5]), mit = num(r[sl.base + 6]);
      // 스탯이 전부 비어 있으면(이름만 입력) 미입력으로 보고 스킵 → "표본 없음" 처리
      if (!e && !a && !d && !dmg && !heal && !mit) return;
      out.push({ replay, date: String(r[C.date] ?? "").trim(), match: String(r[C.match] ?? "").trim(), topTeam, botTeam, durMin, side: sl.side, role: sl.role, roleSlot: sl.label, name, e, a, d, dmg, heal, mit });
    });
  });
  return out;
}

// RawStat + 매치 메타(replay로 조인) + 영웅(이름 매칭) → PStatRow. 상수/하수는 side로 절대 안 뒤섞임.
export function joinPlayerStats(raws: RawStat[], sets: SetRec[], canonicalNames: string[], teamFix: Record<string, string> = {}): PStatRow[] {
  const byReplay = new Map<string, SetRec>();
  sets.forEach((s) => { if (s.replay) byReplay.set(s.replay.trim(), s); });
  const nameMap = new Map<string, string>();
  canonicalNames.forEach((n) => nameMap.set(normKey(n), n));
  const canon = (n: string) => nameMap.get(normKey(n)) || n;
  // 스탯 시트의 팀명도 메인 시트와 동일하게 정규화 (canonicalizeTeams가 sets만 고치므로 일치시킴)
  const fixTeam = (n: string) => teamFix[n] || n;
  return raws.map((rw) => {
    const s = byReplay.get(rw.replay);
    const team = fixTeam(rw.side === "top" ? rw.topTeam : rw.botTeam);
    const oppTeam = fixTeam(rw.side === "top" ? rw.botTeam : rw.topTeam);
    const name = canon(rw.name);
    let hero = "", map = "", mode = "", won: boolean | null = null;
    if (s) {
      map = s.map; mode = s.mode;
      won = s.winner ? s.winner === team : null;
      const side = s.top === team ? s.picks.top : s.bottom === team ? s.picks.bottom : (rw.side === "top" ? s.picks.top : s.picks.bottom);
      const pick = side.find((p) => normKey(p.player) === normKey(rw.name));
      hero = pick ? pick.hero : "";
    }
    const p10 = (v: number) => (rw.durMin > 0 ? (v / rw.durMin) * 10 : 0);
    return {
      replay: rw.replay, date: rw.date, match: rw.match, map, mode, team, oppTeam, won,
      name, role: rw.role, roleSlot: rw.roleSlot, hero, durMin: rw.durMin,
      e: rw.e, a: rw.a, d: rw.d, dmg: rw.dmg, heal: rw.heal, mit: rw.mit,
      e10: p10(rw.e), a10: p10(rw.a), death10: p10(rw.d), dmg10: p10(rw.dmg), heal10: p10(rw.heal), mit10: p10(rw.mit),
      ed: rw.e / Math.max(rw.d, 1),
    };
  });
}
