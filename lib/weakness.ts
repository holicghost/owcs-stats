// 약점 분석 (명세 42). 표본·신뢰도로 거른 "의미 있는 약점"만 골라낸다.
// - 표본이 임계치 미만이면 약점이 아니라 "표본 부족"으로 분류 (42.2)
// - 리그 평균(대칭 풀이라 모드 평균 = 50%)보다 확실히 낮을 때만 약점 (42.2)
// - 각 항목에 근거 경기를 함께 담아 드릴다운에 쓴다 (42.4)
import { MODE_KO, MODE_ORDER } from "./constants";
import type { DataBundle, SetRec } from "./types";

export const WEAK_SAMPLE_MIN = 5; // 이보다 적으면 "표본 부족"
export const WEAK_MARGIN = 8; // 리그 평균(50%) 대비 이만큼(%p) 낮아야 약점

export interface WeakSet {
  date: string;
  map: string;
  mode: string;
  opp: string;
  won: boolean;
  replay: string;
}
export interface Weak {
  key: string;
  kind: "mode" | "firstmap" | "pickless";
  label: string;
  wr: number;
  sample: number;
  deltaLeague: number; // wr - 50 (%p)
  status: "weak" | "lowsample" | "ok";
  action: (isUs: boolean) => string;
  sets: WeakSet[];
}

function setWinner(s: SetRec): string {
  if (s.winner) return s.winner;
  if (s.mode === "Push" && s.ws && s.ls && s.ws.kind === "dist" && s.ls.kind === "dist") {
    return s.ws.val > s.ls.val ? s.top : s.bottom;
  }
  return "";
}
function asWeakSet(s: SetRec, team: string): WeakSet {
  const w = setWinner(s);
  return {
    date: s.date, map: s.map, mode: s.mode,
    opp: s.top === team ? s.bottom : s.top,
    won: w === team, replay: s.replay,
  };
}
function rate(sets: WeakSet[]) {
  const dec = sets.filter((x) => x.opp); // 승자 있는 세트만(거의 전부)
  const played = sets.length;
  const won = sets.filter((x) => x.won).length;
  return { wr: played ? Math.round((won / played) * 100) : 0, sample: played };
}
function statusOf(wr: number, sample: number): Weak["status"] {
  if (sample < WEAK_SAMPLE_MIN) return "lowsample";
  if (50 - wr >= WEAK_MARGIN) return "weak";
  return "ok";
}

const ACTIONS: Record<Weak["kind"], (isUs: boolean, label: string) => string> = {
  mode: (isUs, label) =>
    isUs ? `맵 선택권이 있으면 ${label}을(를) 피하는 쪽을 검토하세요.` : `${label} 쪽으로 끌고 가면 우리가 유리합니다.`,
  firstmap: (isUs) =>
    isUs ? `첫 맵을 신중히 — 자신 있는 모드를 먼저 가져오세요.` : `첫 맵을 적극적으로 가져오세요. 상대가 초반에 흔들립니다.`,
  pickless: (isUs) =>
    isUs ? `상대가 고른 맵에서 고전합니다. 비(非)선택 맵 대비를 늘리세요.` : `맵 선택권을 우리가 쥐면 유리합니다.`,
};

/** 팀의 모든 국면별 성적(약점 후보 포함)을 계산. 약점/표본부족/정상 모두 담는다. */
export function dimensions(D: DataBundle, team: string): Weak[] {
  const teamSets = D.sets.filter((s) => s.top === team || s.bottom === team);
  const out: Weak[] = [];

  // 1) 모드별 (42.1)
  MODE_ORDER.forEach((m) => {
    const ss = teamSets.filter((s) => s.mode === m).map((s) => asWeakSet(s, team));
    if (!ss.length) return;
    const { wr, sample } = rate(ss);
    const label = MODE_KO[m] || m;
    out.push({
      key: `${team}|mode|${m}`, kind: "mode", label, wr, sample,
      deltaLeague: wr - 50, status: statusOf(wr, sample),
      action: (isUs) => ACTIONS.mode(isUs, label), sets: ss,
    });
  });

  // 2) 첫 맵 (42.1) — 시리즈별 첫 세트(#1) 모음
  const bySeries = new Map<string, SetRec[]>();
  teamSets.forEach((s) => {
    const arr = bySeries.get(s.seriesId) || [];
    arr.push(s);
    bySeries.set(s.seriesId, arr);
  });
  const firstSets: WeakSet[] = [];
  bySeries.forEach((arr) => {
    const first = arr.slice().sort((a, b) => {
      const na = parseInt((a.match.split("#")[1] || "99").trim(), 10);
      const nb = parseInt((b.match.split("#")[1] || "99").trim(), 10);
      return (isNaN(na) ? 99 : na) - (isNaN(nb) ? 99 : nb);
    })[0];
    if (first) firstSets.push(asWeakSet(first, team));
  });
  if (firstSets.length) {
    const { wr, sample } = rate(firstSets);
    out.push({
      key: `${team}|firstmap|_`, kind: "firstmap", label: "첫 맵", wr, sample,
      deltaLeague: wr - 50, status: statusOf(wr, sample),
      action: (isUs) => ACTIONS.firstmap(isUs, "첫 맵"), sets: firstSets,
    });
  }

  // 3) 상대가 고른 맵(비선택 국면) (42.1)
  const pickless = teamSets
    .filter((s) => s.picker && s.picker !== "ADMIN" && s.picker !== team)
    .map((s) => asWeakSet(s, team));
  if (pickless.length) {
    const { wr, sample } = rate(pickless);
    out.push({
      key: `${team}|pickless|_`, kind: "pickless", label: "상대가 고른 맵", wr, sample,
      deltaLeague: wr - 50, status: statusOf(wr, sample),
      action: (isUs) => ACTIONS.pickless(isUs, "상대가 고른 맵"), sets: pickless,
    });
  }

  return out;
}

/** 공략 포인트 판정용: 같은 국면에서 cross팀(보통 ZANSIDE)이 확실히 더 강한가 */
export function crossEdge(usDims: Weak[], oppItem: Weak): { edge: boolean; usWr: number | null } {
  const mine = usDims.find((d) => d.kind === oppItem.kind && d.label === oppItem.label);
  if (!mine || mine.status === "lowsample") return { edge: false, usWr: mine ? mine.wr : null };
  const edge = mine.wr - oppItem.wr >= WEAK_MARGIN && mine.wr >= 50;
  return { edge, usWr: mine.wr };
}
