// 자동 검수 (명세 28.5). 들어온 경기 데이터를 화면에 쓰기 전에 점검한다.
// 치명적 오류(팀·승자 누락/불일치) 행은 통계에서 빼고, 나머지는 경고로 표시만 한다.
import type { DataBundle, DataIssue, Game, SetRec, Series, Standing, Team } from "./types";

export function validateSets(sets: SetRec[]): { clean: SetRec[]; issues: DataIssue[]; dropped: number } {
  const issues: DataIssue[] = [];
  const clean: SetRec[] = [];
  const replaySeen = new Map<string, string>();
  const mapMode = new Map<string, string>();
  let dropped = 0;

  for (const s of sets) {
    const where = `${s.date} ${s.match}${s.map ? " · " + s.map : ""}`.trim();
    let drop = false;

    if (!s.top || !s.bottom) {
      issues.push({ level: "error", code: "팀 누락", where, msg: "상수/하수 팀 칸이 비어 있어요." });
      drop = true;
    }
    if (s.winner && s.winner !== s.top && s.winner !== s.bottom) {
      issues.push({ level: "error", code: "승자 불일치", where, msg: `승리팀 '${s.winner}'이(가) 맞붙은 두 팀과 달라요.` });
      drop = true;
    }
    if (s.date && !/^\d{4}-\d{2}-\d{2}$/.test(s.date)) {
      issues.push({ level: "warn", code: "날짜 형식", where, msg: `날짜 '${s.date}'가 표준 형식(YYYY-MM-DD)이 아니에요.` });
    }
    if (s.map && s.mode) {
      const prev = mapMode.get(s.map);
      if (prev && prev !== s.mode) issues.push({ level: "warn", code: "맵·모드", where, msg: `'${s.map}' 맵의 모드가 들쭉날쭉해요 (${prev} ↔ ${s.mode}).` });
      else if (!prev) mapMode.set(s.map, s.mode);
    }
    if (s.replay) {
      const prev = replaySeen.get(s.replay);
      if (prev) issues.push({ level: "warn", code: "리플레이 중복", where, msg: `리플레이 코드 ${s.replay}가 ${prev}와 겹쳐요.` });
      else replaySeen.set(s.replay, where);
    }
    ([[s.picks.top, "상수팀"], [s.picks.bottom, "하수팀"]] as Array<[typeof s.picks.top, string]>).forEach(([side, label]) => {
      const withHero = side.filter((p) => p.hero);
      if (!withHero.length) return;
      if (withHero.length !== 5) issues.push({ level: "warn", code: "선픽 인원", where, msg: `${label} 선픽 영웅이 ${withHero.length}명이에요 (5명이 정상).` });
      const heroes = withHero.map((p) => p.hero);
      const dup = heroes.find((h, i) => heroes.indexOf(h) !== i);
      if (dup) issues.push({ level: "warn", code: "영웅 중복", where, msg: `${label} 선픽에 ${dup}이(가) 두 번 들어갔어요.` });
    });
    s.bans.forEach((b) => {
      if (b.team && b.team !== s.top && b.team !== s.bottom) issues.push({ level: "warn", code: "밴 팀", where, msg: `밴한 팀 '${b.team}'이(가) 맞붙은 두 팀과 달라요.` });
    });

    if (drop) { dropped++; continue; }
    clean.push(s);
  }
  return { clean, issues, dropped };
}

// 교차검증을 이슈 목록으로 (8.5 / 4.4). 콘솔에도 남긴다.
export function crossIssues(series: Series[], teams: Record<string, Team>, schedule: Game[], standings: Standing[]): DataIssue[] {
  const issues: DataIssue[] = [];
  schedule.filter((g) => g.status === "played" && !g.tbd).forEach((g) => {
    const S = series.find((s) => (s.top === g.a && s.bottom === g.b) || (s.top === g.b && s.bottom === g.a));
    if (!S) return;
    const exp = S.top === g.a ? [S.topW, S.bottomW] : [S.bottomW, S.topW];
    if (exp[0] !== g.sa || exp[1] !== g.sb) {
      const msg = `대진표는 ${g.a} ${g.sa}-${g.sb} ${g.b}인데, 세트를 더하면 ${exp[0]}-${exp[1]}이에요.`;
      issues.push({ level: "warn", code: "시리즈 스코어", where: `${g.date} ${g.a} vs ${g.b}`, msg });
      console.warn("[교차검증] " + msg);
    }
  });
  standings.forEach((st) => {
    const t = teams[st.team];
    if (!t) return;
    if (t.mw !== st.win || t.ml !== st.lose) {
      const msg = `순위표는 ${st.team} ${st.win}승 ${st.lose}패인데, 계산하면 ${t.mw}승 ${t.ml}패예요.`;
      issues.push({ level: "warn", code: "매치 전적", where: st.team, msg });
      console.warn("[교차검증] " + msg);
    }
  });
  return issues;
}
