// 렌더 레이어 — 순수 함수가 섹션 HTML 문자열을 만든다 (React 의존 없음).
// 상호작용 컨트롤은 data-act / data-val 속성을 달고, Dashboard 가 위임 처리한다.
import {
  MODE_KO, MODE_ORDER, ROLE_KO, HEROES, EST_WEIGHTS, EST_THRESH, heroKo, mapKo, HERO_ROLE,
} from "./constants";
import type { DataBundle, ModeRec, Pick, Player, PStatRow, SetRec, Series, Standing, Team } from "./types";
import { esc, wrCls, nod, hk, mk, heroChip, heroIcon, setIcons } from "./ui";
export { esc, setIcons };

// 교차 링크: 맵/선수/팀 이름을 누르면 해당 분석 페이지로 이동 (전 화면 공용)
const mapLink = (m: string) => m ? `<button class="xlink" data-act="gomap" data-val="${esc(m)}">${mk(m)}</button>` : '<span class="mini">-</span>';
const playerLink = (p: string) => p ? `<button class="xlink" data-act="goplayer" data-val="${esc(p)}">${esc(p)}</button>` : '<span class="mini">?</span>';
const teamLink = (t: string, us = false) => t ? `<button class="xlink ${us ? "zan" : ""}" data-act="goteam" data-val="${esc(t)}">${esc(t)}</button>` : '<span class="mini">-</span>';

const rankOf = (D: DataBundle, name: string) => {
  const s = D.standings.find((x) => x.team === name);
  return s ? s.rank : null;
};

// ===== 공통 헬퍼 =====
const fmtDate = (d: string) => {
  const p = (d || "").split("-");
  return p.length === 3 ? `${+p[1]}/${+p[2]}` : d;
};
const topN = (obj: Record<string, number>, n: number) =>
  Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
const sum = (obj: Record<string, number>) => Object.values(obj).reduce((a, b) => a + b, 0);

function stat(k: string, v: string, zan?: boolean) {
  return `<div class="stat${zan ? " zan" : ""}"><div class="k">${k}</div><div class="v">${v}</div></div>`;
}
function barWR(label: string, w: number, total: number, max: number, cls?: string) {
  const wr = total ? Math.round((w / total) * 100) : 0;
  return `<div class="bar"><span class="lab">${esc(label)}</span><div class="tr"><div class="fl ${cls || ""}" style="width:${Math.round((total / max) * 100)}%"></div></div><span class="vl">${w}-${total - w}·${wr}%</span></div>`;
}
function barCount(label: string, n: number, max: number, cls?: string) {
  return `<div class="bar"><span class="lab">${esc(label)}</span><div class="tr"><div class="fl ${cls || ""}" style="width:${Math.round((n / max) * 100)}%"></div></div><span class="vl">${n}</span></div>`;
}
// 영웅 카운트 막대 (아이콘 + 한글명). 키는 영웅명이라고 가정.
function countBars(obj: Record<string, number>, cls?: string, n?: number) {
  const arr = topN(obj, n || 8);
  if (!arr.length) return nod();
  const mx = Math.max(1, ...arr.map((x) => x[1]));
  return arr.map(([k, v]) =>
    `<div class="bar"><span class="lab">${heroChip(k)}</span><div class="tr"><div class="fl ${cls || ""}" style="width:${Math.round((v / mx) * 100)}%"></div></div><span class="vl">${v}</span></div>`
  ).join("");
}
function roleOf(roles: Record<string, number>) {
  const e = Object.entries(roles).sort((a, b) => b[1] - a[1])[0];
  return e ? ROLE_KO[e[0]] || e[0] : "";
}
function modeWinrate(t: Team) {
  return MODE_ORDER.filter((m) => t.modes[m]).map((m) => [m, t.modes[m]] as const);
}

// ===== 접근 헬퍼 =====
const standOf = (D: DataBundle, name: string): Standing | null =>
  D.standings.find((x) => x.team === name) || null;
function tieRank(D: DataBundle, st: Standing) {
  const same = D.standings.filter((x) => x.rank === st.rank).length;
  return `${st.rank}위${same > 1 ? " (공동)" : ""}`;
}
// 승/패 판정 (서버와 동일 규칙)
function setWinner(s: SetRec): string {
  if (s.winner) return s.winner;
  if (s.mode === "Push" && s.ws && s.ls && s.ws.kind === "dist" && s.ls.kind === "dist") {
    return s.ws.val > s.ls.val ? s.top : s.bottom;
  }
  return "";
}
const usSeries = (D: DataBundle) => D.series.filter((s) => s.top === D.us || s.bottom === D.us);
const usUpcoming = (D: DataBundle) =>
  D.schedule.filter(
    (g) => g.status === "upcoming" && !g.tbd && g.phase === "regular" && (g.a === D.us || g.b === D.us)
  );

function seriesRow(D: DataBundle, S: Series) {
  const aW = S.winner === S.top;
  const bW = S.winner === S.bottom;
  const aZ = S.top === D.us ? "zan" : "";
  const bZ = S.bottom === D.us ? "zan" : "";
  return `<div class="game"><span class="dt">${fmtDate(S.date)}</span>
    <span class="tA ${aW ? "winner" : "loser"} ${aZ}">${esc(S.top)}</span>
    <span class="sc"><span class="${aW ? "ww" : "ll"}">${S.topW}</span> : <span class="${bW ? "ww" : "ll"}">${S.bottomW}</span></span>
    <span class="tB ${bW ? "winner" : "loser"} ${bZ}">${esc(S.bottom)}</span></div>`;
}

// ===== HOME (5.1) =====
export function renderHome(D: DataBundle): string {
  const T = D.teams[D.us];
  const st = standOf(D, D.us);
  const diff = T ? T.mapW - T.mapL : 0;
  const up = usUpcoming(D);

  const cards =
    stat("매치 전적", st ? `<span class="ww">${st.win}</span><small> - ${st.lose}</small>` : "—", true) +
    stat("순위", st ? tieRank(D, st) : "—", true) +
    stat("맵 득실", `${diff > 0 ? "+" : ""}${diff}<small> (${T ? T.mapW : 0}-${T ? T.mapL : 0})</small>`, true) +
    stat("잔여 경기", `${up.length}`, true);

  const last = usSeries(D).slice(-6).reverse();
  const form = last.length
    ? last.map((S) => {
        const us = S.top === D.us ? S.topW : S.bottomW;
        const op = S.top === D.us ? S.bottomW : S.topW;
        const opp = S.top === D.us ? S.bottom : S.top;
        const won = us > op;
        return `<div class="fcard ${won ? "w" : "l"}"><div class="res">${won ? "WIN" : "LOSS"}</div>
          <div class="opp">vs ${esc(opp)}</div><div class="meta">${us}-${op} · ${fmtDate(S.date)}</div></div>`;
      }).join("")
    : nod("기록 없음");

  const upcoming = up.length
    ? up.map((g) => {
        const opp = g.a === D.us ? g.b : g.a;
        return `<div class="ucard" tabindex="0" data-act="goscout" data-val="${esc(opp)}"><div class="udt">${esc(g.date)} · ${esc(g.label)}</div>
          <div class="uvs">vs</div><div class="uopp">${esc(opp)}</div><div class="ugo">상대 분석 보기 →</div></div>`;
      }).join("")
    : nod("예정 경기 없음");

  const roster = T ? T.roster : [];
  const rosterHtml = roster.length
    ? roster.map((p) => `<div class="rcard"><div class="rn">${esc(p.name)}</div><div class="rr">${esc(roleOf(p.roles))} · ${p.n}맵</div></div>`).join("")
    : nod("첫픽 칸이 채워지면 자동 표시됩니다.");

  let modesHtml = nod();
  if (T) {
    const ms = modeWinrate(T);
    const mx = Math.max(1, ...ms.map((m) => m[1].t));
    modesHtml = ms.length ? ms.map(([m, d]) => barWR(MODE_KO[m] || m, d.w, d.t, mx)).join("") : nod();
  }

  return `
    <div class="statrow">${cards}</div>
    <div class="panel">
      <h2>최근 폼 <span class="count">최근 ${last.length}개</span></h2>
      <div class="sub-note">시리즈(매치) 단위 결과 — 승은 강조색, 패는 회색</div>
      <div class="form">${form}</div>
    </div>
    <div class="panel">
      <h2>잔여 일정 <span class="count">상대 카드를 누르면 해당 팀 분석으로 이동</span></h2>
      <div class="upc">${upcoming}</div>
    </div>
    <div class="grid2">
      <div class="panel"><h2>우리 로스터 <span class="count">${roster.length ? `${roster.length}명 (첫픽 입력 기준)` : "데이터 없음"}</span></h2><div class="roster">${rosterHtml}</div></div>
      <div class="panel"><h2>모드별 우리 성적 <span class="count">맵 단위</span></h2><div class="bars">${modesHtml}</div></div>
    </div>`;
}

// ===== MATCH DAY 홈 (명세 29) =====
function teamMapWR(t: Team | undefined) {
  if (!t) return 0.5;
  const tot = t.mapW + t.mapL;
  return tot ? t.mapW / tot : 0.5;
}
const RECENT_FORM_N = 4; // 최근 폼 산정 시리즈 수 (화면 문구와 일치)
function recentForm(D: DataBundle, team: string) {
  const ss = D.series.filter((s) => s.top === team || s.bottom === team).slice(-RECENT_FORM_N);
  if (!ss.length) return null;
  return ss.filter((s) => s.winner === team).length / ss.length;
}
// 팀의 오프닝 선픽 영웅 집계 (맵세트·팀 중복제거)
function oppOpeningPicks(D: DataBundle, team: string) {
  const agg: Record<string, { n: number; w: number }> = {};
  D.sets.forEach((s) => {
    const side = s.top === team ? s.picks.top : s.bottom === team ? s.picks.bottom : null;
    if (!side) return;
    const won = s.winner === team;
    const swaps = swapsByPlayer(s.memo); // 오프닝 + 교체 영웅 모두 집계 (teamHeroPicks와 동일)
    const seen = new Set<string>();
    const add = (hero: string) => {
      if (!hero || seen.has(hero)) return;
      seen.add(hero);
      const a = (agg[hero] = agg[hero] || { n: 0, w: 0 });
      a.n++;
      if (won) a.w++;
    };
    side.forEach((p) => { add(p.hero); (swaps[p.player] || []).forEach(add); });
  });
  return Object.entries(agg).map(([hero, v]) => ({ hero, ...v })).sort((a, b) => b.n - a.n);
}
function matchEstimate(D: DataBundle, opp: string) {
  const us = D.teams[D.us], op = D.teams[opp];
  let p = 50;
  const basis: string[] = [];
  const ru = rankOf(D, D.us), ro = rankOf(D, opp);
  if (ru && ro) {
    const a = Math.max(-15, Math.min(15, (ro - ru) * 2.5));
    p += a;
    basis.push(`순위 ${ru}위 ↔ ${ro}위`);
  }
  const uwr = teamMapWR(us), owr = teamMapWR(op);
  const b = Math.max(-15, Math.min(15, (uwr - owr) * 40));
  p += b;
  basis.push(`맵 승률 ${Math.round(uwr * 100)}% ↔ ${Math.round(owr * 100)}%`);
  const fu = recentForm(D, D.us), fo = recentForm(D, opp);
  if (fu != null && fo != null) {
    p += Math.max(-10, Math.min(10, (fu - fo) * 20));
    basis.push(`최근 폼 (최근 ${RECENT_FORM_N}시리즈) ${Math.round(fu * 100)}% ↔ ${Math.round(fo * 100)}%`);
  }
  p = Math.max(10, Math.min(90, p));
  const minSample = Math.min(us?.seriesCount || 0, op?.seriesCount || 0);
  const conf = minSample >= 8 ? "보통" : minSample >= 4 ? "낮음" : "매우 낮음";
  const band = minSample >= 8 ? 10 : minSample >= 4 ? 15 : 20;
  const pct = Math.round(p);
  return { pct, lo: Math.max(0, pct - band), hi: Math.min(100, pct + band), conf, basis, minSample };
}
function mdCard(k: string, big: string, sub: string, cls?: string) {
  return `<div class="mdcard ${cls || ""}"><div class="mdc-k">${k}</div><div class="mdc-v">${big}</div><div class="mdc-s">${sub}</div></div>`;
}
// 일정 날짜 정렬 키 ("YYYY-MM-DD" 또는 "M/D" 모두 처리)
function dateKey(d: string): number {
  const iso = (d || "").match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return +iso[1] * 10000 + +iso[2] * 100 + +iso[3];
  const md = (d || "").match(/(\d{1,2})\/(\d{1,2})/);
  if (md) return 99990000 + +md[1] * 100 + +md[2]; // 연도 미상 → 연도 무관 월/일 비교
  return 9 ** 9;
}
// 매치업 전망 판단 문구 (확정적 예측처럼 보이지 않게 단어 우선)
function matchVerdict(pct: number): { word: string; cls: string } {
  if (pct >= 63) return { word: "우세 가능성 있음", cls: "good" };
  if (pct >= 54) return { word: "약우세", cls: "good" };
  if (pct >= 46) return { word: "백중세", cls: "even" };
  if (pct >= 37) return { word: "약열세", cls: "warn" };
  return { word: "열세 가능성 있음", cls: "bad" };
}
export function renderMatchday(D: DataBundle, weakExpand: string): string {
  const up = D.schedule
    .filter((g) => g.status === "upcoming" && !g.tbd && g.phase === "regular" && (g.a === D.us || g.b === D.us))
    .slice()
    .sort((a, b) => dateKey(a.date) - dateKey(b.date));
  const st = standOf(D, D.us);
  const us = D.teams[D.us];
  const scope = `<div class="scopebar">
    <span><b>ZANSIDE</b> ${us ? us.seriesCount : 0}시리즈 · ${us ? us.mapW + us.mapL : 0}맵 · ${st ? `${st.win}승 ${st.lose}패` : "—"}</span>
    <span class="dot"></span>
    <span>분석 데이터 ${D.series.length}시리즈 · ${D.sets.length}맵 · ${D.teamNames.length}팀</span>
    <span class="dot"></span>
    <span class="${D.health.error ? "hl-bad" : D.health.warn ? "hl-warn" : "hl-ok"}">데이터 ${D.health.error ? `오류 ${D.health.error}` : D.health.warn ? `확인필요 ${D.health.warn}` : "정상"}</span>
  </div>`;

  if (!up.length) {
    const last = usSeries(D).slice(-6).reverse();
    const form = last.length ? last.map((S) => {
      const w = S.top === D.us ? S.topW : S.bottomW;
      const o = S.top === D.us ? S.bottomW : S.topW;
      const opp = S.top === D.us ? S.bottom : S.top;
      return `<div class="fcard ${w > o ? "w" : "l"}"><div class="res">${w > o ? "WIN" : "LOSS"}</div><div class="opp">vs ${esc(opp)}</div><div class="meta">${w}-${o} · ${fmtDate(S.date)}</div></div>`;
    }).join("") : nod("아직 치른 경기가 없음.");
    return `${scope}<div class="panel"><h2>다음 경기</h2>${nod("예정된 다음 경기 없음 · 대진표 갱신 시 표시")}</div>
      <div class="panel"><h2>최근 흐름</h2><div class="form">${form}</div></div>`;
  }

  const g = up[0];
  const opp = g.a === D.us ? g.b : g.a;
  const op = D.teams[opp];
  const est = matchEstimate(D, opp);
  const mv = matchVerdict(est.pct);
  const stOpp = standOf(D, opp);

  // ── 승리 플랜 (모드별 우선 공략 / 조건부 / 회피) — 표시 승률 그대로, 소수 1자리 ──
  const fmtP = (w: number, t: number) => { if (!t) return "—"; const v = (w / t) * 100; return (Number.isInteger(v) ? v : +v.toFixed(1)) + "%"; };
  const fmtDiff = (d: number) => { const r = Math.round(d * 10) / 10; return `${r >= 0 ? "+" : ""}${Number.isInteger(r) ? r : r.toFixed(1)}%p`; };
  const usM = us ? us.modes : {}, opM = op ? op.modes : {};
  const PLAN_ORDER: Record<string, number> = { "우선 공략": 0, "조건부 공략": 1, "회피": 2, "대등": 3, "정보 부족": 4 };
  const PLAN_CLS: Record<string, string> = { "우선 공략": "attack", "조건부 공략": "cond", "회피": "avoid", "대등": "even", "정보 부족": "info" };
  const plans = MODE_ORDER.filter((m) => (usM[m]?.t || 0) > 0 || (opM[m]?.t || 0) > 0).map((m) => {
    const uw = usM[m]?.w || 0, ut = usM[m]?.t || 0, ow = opM[m]?.w || 0, ot = opM[m]?.t || 0;
    const uPct = ut ? (uw / ut) * 100 : null, oPct = ot ? (ow / ot) * 100 : null;
    let plan = "대등", note = "";
    if (uPct == null) { plan = "정보 부족"; note = "우리 표본 없음"; }
    else if (oPct == null) { plan = "조건부 공략"; note = "상대 표본 없음"; }
    else {
      const d = uPct - oPct;
      // 우선 공략 = 우리가 실제로 강하고(자체 ≥50%) 상대보다 확실히 우위 + 양 팀 표본 충분
      if (d >= 10 && uPct >= 50 && ut >= 3 && ot >= 3) plan = "우선 공략";
      else if (d >= 10) { // 상대보다 낫지만 자체 승률이 낮거나 표본이 부족 → 조건부
        plan = "조건부 공략";
        note = ot < 3 ? `상대 표본 ${ot}맵` : ut < 3 ? `우리 표본 ${ut}맵` : `자체 ${fmtP(uw, ut)} · 낮음`;
      }
      else if (d <= -10) { plan = "회피"; if (ut < 3 || ot < 3) note = `표본 ${Math.min(ut, ot)}맵`; }
      else plan = "대등";
    }
    return { mode: m, uw, ut, ow, ot, diff: (uPct != null && oPct != null) ? uPct - oPct : null, plan, note };
  }).sort((a, b) => PLAN_ORDER[a.plan] - PLAN_ORDER[b.plan] || ((b.diff ?? -999) - (a.diff ?? -999)));
  // TOP 3 = 각 분류(우선 공략·조건부·회피)의 대표 1개씩 우선 노출 → 부족하면 우선순위로 채움
  const byPlan = (k: string, worst = false) => plans.filter((p) => p.plan === k).sort((a, b) => worst ? (a.diff ?? 0) - (b.diff ?? 0) : (b.diff ?? -999) - (a.diff ?? -999));
  const picked = [byPlan("우선 공략")[0], byPlan("조건부 공략")[0], byPlan("회피", true)[0]].filter(Boolean);
  const usedModes = new Set(picked.map((p) => p!.mode));
  for (const p of plans) { if (picked.length >= 3) break; if (!usedModes.has(p.mode)) { picked.push(p); usedModes.add(p.mode); } }
  const top3 = picked.slice(0, 3).sort((a, b) => PLAN_ORDER[a!.plan] - PLAN_ORDER[b!.plan] || ((b!.diff ?? -999) - (a!.diff ?? -999))) as typeof plans;
  const top3Modes = new Set(top3.map((p) => p.mode));
  const restPlans = plans.filter((p) => !top3Modes.has(p.mode));
  const planRow = (r: typeof plans[number]) => `<li class="plan-row ${PLAN_CLS[r.plan]}" data-act="gomapmode" data-val="${esc(r.mode)}">
    <span class="plan-badge ${PLAN_CLS[r.plan]}">${r.plan}</span>
    <span class="plan-mode">${esc(MODE_KO[r.mode] || r.mode)} <span class="plan-go">→</span></span>
    <span class="plan-nums"><span class="zan">ZANSIDE ${fmtP(r.uw, r.ut)}</span><span class="mini">vs</span><span>${esc(opp)} ${fmtP(r.ow, r.ot)}</span>${r.diff != null ? `<span class="plan-diff">${fmtDiff(r.diff)}</span>` : ""}</span>
    ${r.note ? `<span class="plan-note">${esc(r.note)}</span>` : ""}
  </li>`;
  const winPlan = top3.length
    ? `<ol class="planlist">${top3.map(planRow).join("")}</ol>${restPlans.length ? `<details class="planmore"><summary>나머지 모드 ${restPlans.length}개 보기</summary><ol class="planlist">${restPlans.map(planRow).join("")}</ol></details>` : ""}`
    : nod("모드별 표본이 아직 없음.");

  // ── 밴 추천: 상대 의존 핵심 픽(표본 충분) / 표본 적지만 위험 픽(표본<3) 분리 ──
  const picks = op ? oppOpeningPicks(D, opp) : [];
  const keyPicks = picks.filter((p) => p.n >= 3).slice(0, 5);
  const riskPicks = picks.filter((p) => p.n < 3 && p.n >= 1).slice(0, 6);
  const pickChip = (p: { hero: string; n: number; w: number }) => `<span class="bp-chip">${heroChip(p.hero)}<span class="mini">${p.n}회 · ${Math.round((p.w / Math.max(1, p.n)) * 100)}%</span></span>`;
  const oppMaps = op ? op.mapW + op.mapL : 0;
  const oppFb = op ? Object.entries(op.firstBan).sort((a, b) => b[1] - a[1])[0] : null;
  const banPlan = `<div class="banplan-grid">
    <div class="bp-col"><div class="bp-h key">상대 의존 핵심 픽</div><div class="bp-sub">상대가 자주 의존 — 첫 밴 1순위로 검토</div><div class="bp-chips">${keyPicks.length ? keyPicks.map(pickChip).join("") : nod("표본 충분한 핵심 픽 없음")}</div></div>
    <div class="bp-col"><div class="bp-h risk">표본 적지만 위험 픽</div><div class="bp-sub">표본은 적지만 나오면 위협 — 상황 보고 대응</div><div class="bp-chips">${riskPicks.length ? riskPicks.map(pickChip).join("") : nod("해당 픽 없음")}</div></div>
  </div>
  <div class="bp-foot"><span class="mini">상대 선밴 예상</span> ${oppFb ? `${heroChip(oppFb[0])} <span class="mini">선밴 빈도 ${Math.round((oppFb[1] / Math.max(1, oppMaps)) * 100)}% · ${oppMaps}맵</span>` : '<span class="mini">데이터 부족</span>'}</div>`;

  // ── 매치업 전망(추정 승률): 보조 정보로 내림 ──
  const outlookSecondary = `<div class="outlook-sec ${mv.cls}">
    <span class="os-lab">참고 · 추정 승률</span>
    <span class="os-word ${mv.cls}">${mv.word}</span>
    <span class="os-pct">${est.pct}%</span>
    <span class="os-meta mini">범위 ${est.lo}~${est.hi}% · 신뢰도 ${est.conf} · ${est.minSample}시리즈</span>
  </div>`;

  // 상대 핵심 성향 (행동 지침 · 조사 없음)
  const tendRows: string[] = [];
  if (op) {
    const pm = Object.entries(op.pickMaps).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
    if (pm.length) tendRows.push(`<div class="tendrow"><span class="tend-lab">자주 고르는 맵</span><span class="tend-v">${pm.map((m) => `<span class="kvchip">${esc(mapKo(m))}</span>`).join("")}</span></div>`);
    const fb = Object.entries(op.firstBan).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (fb.length) tendRows.push(`<div class="tendrow"><span class="tend-lab">주요 선밴</span><span class="tend-v">${fb.map(([h, n]) => `${heroChip(h)}<span class="mini">${n}</span>`).join(" ")}</span></div>`);
    const pTot = op.pushW + op.pushL;
    if (pTot >= 3) tendRows.push(`<div class="tendrow"><span class="tend-lab">밀기 성향</span><span class="tend-v">${op.pushW}승 ${op.pushL}패 · ${Math.round((op.pushW / pTot) * 100)}%</span></div>`);
  }
  const tendHtml = tendRows.length ? tendRows.join("") : nod("상대 표본 부족 · 성향 단정 보류");

  // 근거 경기 — 최근 맞대결 또는 상대 최근 경기 (테이블)
  const h2h = D.series.filter((s) => (s.top === D.us && s.bottom === opp) || (s.top === opp && s.bottom === D.us)).slice().reverse();
  const oppRecent = D.series.filter((s) => s.top === opp || s.bottom === opp).slice(-6).reverse();
  const useH2h = h2h.length > 0;
  const focusTeam = useH2h ? D.us : opp;
  const evidence = evidenceTable(D, useH2h ? h2h : oppRecent, focusTeam);

  // 표본 경고 배너 (페이지 1회 · 상세는 펼침)
  const usSeriesN = us ? us.seriesCount : 0, oppSeriesN = op ? op.seriesCount : 0;
  const banner = `<div class="samplebanner">
    <div class="sb-main"><span class="sb-tag">표본 부족</span>
      <span class="sb-txt">ZANSIDE ${usSeriesN}시리즈 · ${esc(opp)} ${oppSeriesN}시리즈 기준. 경기 준비용 참고 지표이며 확정 예측이 아닙니다.</span></div>
    <details class="sb-more"><summary>분석 기준 보기</summary>
      <ul class="sb-list">
        <li>예상 승률은 학습 모델이 아닌 가중 합산 추정치이며, 소수점 정밀도를 보장하지 않습니다.</li>
        <li>표본이 적어 상대·맵·밴 상황에 따라 실제 결과는 달라질 수 있습니다.</li>
      </ul></details>
  </div>`;

  return `${scope}
    <section class="panel nextmatch">
      <div class="nm-eyebrow">다음 경기</div>
      <div class="nm-meta-top">${esc(g.date)} · ${esc(g.label)}</div>
      <div class="nm-vsgrid">
        <div class="nm-team us"><span class="nm-logo" aria-hidden="true">${esc(teamInitials(D.us))}</span><span class="nm-name">ZANSIDE</span><span class="nm-rec">${st ? `${st.rank}위${standOf(D, D.us) && D.standings.filter((x) => x.rank === st.rank).length > 1 ? " (공동)" : ""} · ${st.win}승 ${st.lose}패` : "—"}</span></div>
        <div class="nm-vs">VS</div>
        <div class="nm-team opp"><span class="nm-logo" aria-hidden="true">${esc(teamInitials(opp))}</span><span class="nm-name">${esc(opp)}</span><span class="nm-rec">${stOpp ? `${stOpp.rank}위 · ${stOpp.win}승 ${stOpp.lose}패` : "—"}</span></div>
      </div>
      <a class="linkbtn" role="button" data-act="goscout" data-val="${esc(opp)}" tabindex="0">상대 자세히 보기 ↗</a>
    </section>
    ${banner}
    <h2 class="sectit">승리 플랜 <span class="sectit-sub">이 경기 핵심 요약</span></h2>
    <section class="panel winplan"><h2>승리 플랜 TOP 3 <span class="count">모드별 우선순위 · ZANSIDE vs ${esc(opp)}</span></h2>${winPlan}</section>
    <section class="panel banplan"><h2>밴 추천 <span class="count">핵심 픽 우선 · 위험 픽 분리</span></h2>${banPlan}</section>
    <section class="panel"><h2>상대 핵심 성향</h2><div class="tendlist">${tendHtml}</div></section>
    ${outlookSecondary}
    <section class="panel"><h2>근거 경기 <span class="count">${useH2h ? "최근 맞대결" : `${esc(opp)} 최근 경기`}</span></h2>${evidence}</section>
    <section class="panel"><details class="calc"><summary><span class="calc-sum">예상 승률 산출 기준</span><span class="mini">학습 모델이 아닌 가중 합산 방식 · 자세히 보기</span></summary>
      <div class="calc-body">
        ${est.basis.map((b) => `<div class="calc-row">${esc(b)}</div>`).join("")}
        <div class="calc-row strong">추정 승률 ${est.pct}% · 범위 ${est.lo}~${est.hi}% · 신뢰도 ${est.conf} · ${est.minSample}시리즈</div>
        <div class="sub-note">이 수치는 경기 결과를 확정적으로 예측하는 값이 아닙니다.</div>
      </div></details></section>
    ${healthPanel(D)}`;
}
// 팀 이니셜 플레이스홀더 (로고 데이터가 없을 때 — 임의 이미지 생성 금지)
function teamInitials(name: string): string {
  const n = (name || "").trim();
  if (!n) return "?";
  const parts = n.split(/[\s·]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}
// 근거 경기 테이블 (focusTeam 관점 승/패 · 색+글자 동시 표기)
function evidenceTable(D: DataBundle, series: Series[], focusTeam: string): string {
  if (!series.length) return nod("표시할 경기가 없습니다.");
  const rows = series.map((S) => {
    const isTop = S.top === focusTeam;
    const myW = isTop ? S.topW : S.bottomW;
    const opW = isTop ? S.bottomW : S.topW;
    const other = isTop ? S.bottom : S.top;
    const won = S.winner === focusTeam;
    return `<tr><td class="mini">${fmtDate(S.date)}</td>
      <td>${teamLink(other, other === D.us)}</td>
      <td><span class="reslabel ${won ? "win" : "loss"}">${won ? "승" : "패"}</span></td>
      <td class="num mono">${myW}:${opW}</td></tr>`;
  }).join("");
  return `<div class="tablewrap"><table class="evtable"><thead><tr><th>날짜</th><th>상대</th><th>결과</th><th class="num">스코어</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="sub-note">${esc(focusTeam)} 관점 · 승/패는 색과 글자로 함께 표시</div>`;
}
// 데이터 점검 결과 (문제 있을 때만 노출)
function healthPanel(D: DataBundle): string {
  const h = D.health;
  if (h.warn + h.error === 0 && h.dropped === 0) return "";
  const items = h.issues.slice(0, 8).map((i) =>
    `<div class="issue ${i.level}"><span class="iss-code">${esc(i.code)}</span><span class="iss-where mini">${esc(i.where)}</span><span class="iss-msg">${esc(i.msg)}</span></div>`
  ).join("");
  return `<div class="panel"><h2>데이터 점검 <span class="count">정상 ${h.okRows}경기${h.warn ? ` · 확인필요 ${h.warn}` : ""}${h.dropped ? ` · 제외 ${h.dropped}` : ""}</span></h2>
    <div class="sub-note">시트 점검 항목 · 통계 영향 경미 · 확인 권장</div>
    <div class="issuelist">${items}${h.issues.length > 8 ? `<div class="mini">…외 ${h.issues.length - 8}건</div>` : ""}</div></div>`;
}

// ===== SCOUT (5.2) =====
function renderH2H(D: DataBundle, curScout: string): string {
  const sets = D.sets.filter(
    (s) => (s.top === D.us && s.bottom === curScout) || (s.top === curScout && s.bottom === D.us)
  );
  if (!sets.length) return nod("아직 맞대결 기록이 없습니다.");
  let uw = 0, ow = 0;
  sets.forEach((s) => {
    const w = setWinner(s);
    if (w === D.us) uw++;
    else if (w === curScout) ow++;
  });
  return `<div class="h2h-head"><span class="lbl">세트 전적</span>
    <span class="big"><span class="ww">${uw}</span> <span style="color:var(--tx-dim)">-</span> <span class="ll">${ow}</span></span>
    <span class="lbl">ZANSIDE 기준</span></div>
    <div class="sched">${sets.slice().reverse().map((s) => {
      const w = setWinner(s);
      const won = w === D.us;
      return `<div class="game"><span class="dt">${fmtDate(s.date)}</span>
        <span class="tA zan">${D.us}</span>
        <span class="sc"><span class="${won ? "ww" : "ll"}">${won ? "승" : "패"}</span></span>
        <span class="tB loser">${esc(MODE_KO[s.mode] || s.mode)} · ${mk(s.map)}</span></div>`;
    }).join("")}</div>`;
}
/** 상대 분석 칩 + 본문 전체. curScout 은 Dashboard 가 해석한 유효 팀명. */
// 팀의 영웅 픽 집계 (맵세트·팀 중복제거)
function teamHeroPicks(D: DataBundle, team: string): Record<string, { n: number; w: number }> {
  const picks: Record<string, { n: number; w: number }> = {};
  D.sets.forEach((s) => {
    const side = s.top === team ? s.picks.top : s.bottom === team ? s.picks.bottom : null;
    if (!side) return;
    const won = setWinner(s) === team;
    const swaps = swapsByPlayer(s.memo); // 오프닝 픽 + 교체 영웅 모두 집계
    const seen = new Set<string>();
    const add = (h: string) => {
      if (!h || seen.has(h)) return;
      seen.add(h);
      const a = (picks[h] = picks[h] || { n: 0, w: 0 });
      a.n++;
      if (won) a.w++;
    };
    side.forEach((p) => { add(p.hero); (swaps[p.player] || []).forEach(add); });
  });
  return picks;
}
function heroPickBars(obj: Record<string, { n: number; w: number }>, n: number): string {
  const arr = Object.entries(obj).sort((a, b) => b[1].n - a[1].n).slice(0, n);
  if (!arr.length) return nod("픽 기록이 없음.");
  const mx = Math.max(1, ...arr.map((x) => x[1].n));
  return arr.map(([h, r]) => {
    const wr = r.n ? Math.round((r.w / r.n) * 100) : 0;
    const low = r.n === 1;
    return `<div class="bar"><span class="lab">${heroChip(h)}</span><div class="tr"><div class="fl blu" style="width:${Math.round((r.n / mx) * 100)}%"></div></div><span class="vl">${r.n}${low ? "" : `·${wr}%`}</span></div>`;
  }).join("");
}
function teamMapSummary(T: Team): string {
  const maps = Object.entries(T.maps).map(([map, r]) => ({ map, w: r.w, l: r.l, n: r.w + r.l })).sort((a, b) => b.n - a.n);
  if (!maps.length) return nod("맵 기록이 없음.");
  return `<table><thead><tr><th>맵</th><th class="num">출전</th><th class="num">승-패</th><th class="num">승률</th></tr></thead><tbody>${maps.map((m) => {
    const wr = m.n ? Math.round((m.w / m.n) * 100) : 0;
    const low = m.n === 1;
    return `<tr><td class="hname">${mk(m.map)}</td><td class="num">${m.n}</td><td class="num">${m.w}-${m.l}</td><td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span></td></tr>`;
  }).join("")}</tbody></table>`;
}

// 이 경기의 OWCS 선수 스탯 (리플레이 코드로 매칭) — 경기 기록·경기별 분석 공용
function gameStatsBlock(D: DataBundle, s: SetRec): string {
  const gstats = s.replay ? D.playerStats.filter((r) => r.replay && r.replay.trim() === s.replay.trim()) : [];
  if (!gstats.length) return s.replay ? `<div class="sub-note" style="margin:12px 0 2px">선수 스탯 <span class="mini">이 경기(리플레이 ${esc(s.replay)})는 'OWCS 선수 스탯' 시트에 아직 없음</span></div>` : "";
  const nk = (n: string) => String(n || "").toLowerCase().replace(/0/g, "o").replace(/\s+/g, "");
  const topSet = new Set(s.picks.top.map((p) => nk(p.player)));
  const botSet = new Set(s.picks.bottom.map((p) => nk(p.player)));
  const sideOf = (r: PStatRow) => topSet.has(nk(r.name)) ? "top" : botSet.has(nk(r.name)) ? "bottom" : r.team === s.top ? "top" : r.team === s.bottom ? "bottom" : "top";
  const roleOrd: Record<string, number> = { Tank: 0, DPS: 1, Support: 2 };
  const fmtN = (v: number) => Math.round(v).toLocaleString();
  const dur = gstats[0]?.durMin || 0;
  const mmss = dur ? `${Math.floor(dur)}:${String(Math.round((dur - Math.floor(dur)) * 60)).padStart(2, "0")}` : "";
  const tbl = (side: "top" | "bottom") => {
    const rows = gstats.filter((r) => sideOf(r) === side).sort((a, b) => (roleOrd[a.role] ?? 9) - (roleOrd[b.role] ?? 9));
    if (!rows.length) return nod("스탯 없음");
    return `<table class="hbtable psgame"><thead><tr><th>선수</th><th>영웅</th><th class="num">E</th><th class="num">A</th><th class="num">D</th><th class="num">딜</th><th class="num">힐</th><th class="num">방어</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${playerLink(r.name)}</td><td class="hname">${r.hero ? heroChip(r.hero) : '<span class="mini">-</span>'}</td><td class="num">${r.e}</td><td class="num">${r.a}</td><td class="num">${r.d}</td><td class="num">${fmtN(r.dmg)}</td><td class="num">${fmtN(r.heal)}</td><td class="num">${fmtN(r.mit)}</td></tr>`).join("")}</tbody></table>`;
  };
  return `<div class="sub-note" style="margin:12px 0 4px">선수 스탯 <span class="mini">OWCS 선수 스탯 시트 · 이 경기 실측${mmss ? ` · ${mmss}` : ""}</span></div>
    <div class="bd-stats">
      <div class="psg-team"><div class="psg-th">${teamLink(s.top, s.top === D.us)}</div>${tbl("top")}</div>
      <div class="psg-team"><div class="psg-th">${teamLink(s.bottom, s.bottom === D.us)}</div>${tbl("bottom")}</div>
    </div>
    <div class="sub-note">딜·힐·방어는 이 경기 실측 누적값. 딜러의 힐·방어 0은 정상값.</div>`;
}
// 경기별 분석 카드 — 4줄 압축 (승패=focus팀 기준)
function scoutGameCard(D: DataBundle, s: SetRec, focus: string): string {
  const won = setWinner(s) === focus;
  const opp = s.top === focus ? s.bottom : s.top;
  const fmtSc = (sc: SetRec["ws"]) => (sc ? (sc.kind === "dist" ? Math.round(sc.val) + "m" : String(sc.val)) : "·");
  const fScore = won ? fmtSc(s.ws) : fmtSc(s.ls);
  const oScore = won ? fmtSc(s.ls) : fmtSc(s.ws);
  const picker = s.picker || "";
  const fb = s.bans.find((b) => b.phase === "first");
  const sb = s.bans.find((b) => b.phase === "second");
  const order: Record<string, number> = { Tank: 0, DPS: 1, Support: 2 };
  const swaps = swapsByPlayer(s.memo); // 메모에서 선수별 교체 영웅
  const lineupRow = (name: string, picks: Pick[], isFocus: boolean) => {
    if (!picks.length) return `<div class="gl-row"><span class="gl-team ${isFocus ? "zan2" : ""}">${esc(name)}</span> <span class="mini">라인업 미기록</span></div>`;
    const sorted = picks.slice().sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
    return `<div class="gl-row"><span class="gl-team ${isFocus ? "zan2" : ""}">${esc(name)}</span>${sorted.map((p) => {
      const sw = swaps[p.player] || [];
      return `<span class="gl-p">${heroIcon(p.hero || "")}<span>${playerLink(p.player)}</span><span class="mini">${ROLE_KO[p.role] || ""}</span>${sw.map((h) => `<span class="swp">→${heroIcon(h)}</span>`).join("")}</span>`;
    }).join("")}</div>`;
  };
  const copyIcon = s.replay ? `<span class="gc2-rep"><span class="repcode">${esc(s.replay)}</span><button class="copyb copyicon" data-act="copy" data-val="${esc(s.replay)}" title="리플레이 코드 복사"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button></span>` : "";
  return `<div class="panel gamecard2 ${won ? "win" : "loss"}">
    <div class="gc2-l1"><span class="gc2-res ${won ? "win" : "loss"}">${won ? "승리" : "패배"}</span> <span class="mini">${esc(s.match)} · ${fmtDate(s.date)}</span> <span>vs <b>${esc(opp)}</b></span>${copyIcon}</div>
    <div class="gc2-l2"><b>${mk(s.map)}</b> <span class="mini">(${esc(MODE_KO[s.mode] || s.mode)})</span>${picker ? ` · <span class="mini">맵 픽 ${esc(picker)}</span>` : ""} · <span class="mono">${fScore}-${oScore}</span></div>
    <div class="gc2-l3">${fb ? `<span class="mini">선밴</span> ${heroChip(fb.hero)}` : ""}${fb && sb ? ' <span class="mini">·</span> ' : ""}${sb ? `<span class="mini">후밴</span> ${heroChip(sb.hero)}` : ""}${!fb && !sb ? '<span class="mini">밴 없음</span>' : ""}</div>
    <div class="gc2-l4"><div class="mini" style="margin-bottom:5px">오프닝 픽</div>${lineupRow(s.top, s.picks.top, s.top === focus)}${lineupRow(s.bottom, s.picks.bottom, s.bottom === focus)}</div>
    ${gameStatsBlock(D, s)}
    <div class="gc2-load"><button class="loadbtn" data-act="load-sim" data-val="${esc(setKey(s))}">이 경기로 시뮬레이션 채우기 ↗</button></div>
  </div>`;
}
export interface DeepUI { agg: "main" | "swap"; sort: "pick" | "wr"; smp: number; banExpand: string; role: "all" | "Tank" | "DPS" | "Support"; }
// 승률 한 줄 (막대 + % + N승-N패 + 표본). 0이면 '결정 경기 없음', <3맵이면 회색+표본<3
function wrLine(label: string, w: number, l: number, max: number, suffix = ""): string {
  const n = w + l;
  if (n === 0) return `<div class="wrline empty"><span class="wl-lab">${label}</span><span class="wl-val mini">결정 경기 없음${suffix}</span></div>`;
  const wr = Math.round((w / n) * 100);
  const low = n < 3;
  return `<div class="wrline ${low ? "lowsmp-row" : ""}"><span class="wl-lab">${label}</span><div class="wl-bar"><div class="fl ${wrCls(wr)}-fl" style="width:${Math.round((n / Math.max(1, max)) * 100)}%"></div></div><span class="wl-val"><b>${wr}%</b> <span class="mini">${w}-${l} · ${n}맵${low ? ' <span class="lowsmp">표본&lt;3</span>' : ""}</span>${suffix}</span></div>`;
}
const roleBadge = (r: string) => `<span class="rtag ${r}">${({ Tank: "탱", DPS: "딜", Support: "힐" } as Record<string, string>)[r] || "?"}</span>`;

// ── 영웅 분석 탭: 영웅별 픽률·승률 + 밴 순서별 승률 + 밴 포지션별 수치 ──
function renderScoutHeroes(D: DataBundle, team: string, deep: DeepUI, view: "pick" | "ban" = "pick"): string {
  const teamSets = D.sets.filter((s) => s.top === team || s.bottom === team);
  const sideOf = (s: SetRec) => (s.top === team ? s.picks.top : s.picks.bottom);
  const oppOf = (s: SetRec) => (s.top === team ? s.bottom : s.top);

  // ── 영웅별 픽률·승률 ──
  const heroAgg: Record<string, { n: number; w: number; role: string }> = {};
  teamSets.forEach((s) => {
    const won = setWinner(s) === team;
    const seen = new Set<string>();
    const add = (hero: string, role: string) => { if (!hero || seen.has(hero)) return; seen.add(hero); const a = (heroAgg[hero] = heroAgg[hero] || { n: 0, w: 0, role }); a.n++; if (won) a.w++; };
    sideOf(s).forEach((p) => add(p.hero, p.role));
    if (deep.agg === "swap") {
      const sw = swapsByPlayer(s.memo);
      sideOf(s).forEach((p) => (sw[p.player] || []).forEach((h) => add(h, p.role)));
    }
  });
  const teamMaps = teamSets.length;
  const heroArr = Object.entries(heroAgg).map(([hero, r]) => ({ hero, ...r, wr: r.n ? Math.round((r.w / r.n) * 100) : 0, rate: teamMaps ? Math.round((r.n / teamMaps) * 100) : 0 }));
  heroArr.sort((a, b) => deep.sort === "wr" ? (b.wr - a.wr || b.n - a.n) : (b.n - a.n || b.wr - a.wr));
  const seg = (act: string, cur: string, opts: Array<[string, string]>) => `<div class="seg">${opts.map(([v, lb]) => `<button class="${cur === v ? "on" : ""}" data-act="${act}" data-val="${v}">${lb}</button>`).join("")}</div>`;
  const hasSwapData = teamSets.some((s) => Object.keys(swapsByPlayer(s.memo)).length > 0);
  const pickToggles = `<div class="metabar">
    <span class="flabel">포지션</span>${seg("deep-role", deep.role, [["all", "전체"], ["Tank", "탱커"], ["DPS", "딜러"], ["Support", "서포터"]])}
    <span class="flabel">기준</span>${seg("deep-agg", deep.agg, [["main", "메인 픽"], ["swap", "교체 포함"]])}
    <span class="flabel">정렬</span>${seg("deep-sort", deep.sort, [["pick", "픽 많은 순"], ["wr", "승률 높은 순"]])}
  </div>${deep.agg === "swap" && !hasSwapData ? `<div class="sub-note">⚠ 시트 메모(교체)가 비어 있어 "교체 포함"이 메인 픽과 같아요. 메모를 <b>선수: 영웅1, 영웅2</b> 형식으로 채우면 교체가 합산돼요.</div>` : ""}`;
  const heroByRole: Record<string, typeof heroArr> = { DPS: [], Tank: [], Support: [] };
  heroArr.forEach((h) => (heroByRole[h.role] || heroByRole.DPS).push(h));
  const shownRoles = (deep.role === "all" ? ["DPS", "Tank", "Support"] : [deep.role]) as Array<"DPS" | "Tank" | "Support">;
  const pickBlock = shownRoles.map((role) => {
    const arr = heroByRole[role];
    if (!arr.length) return "";
    return `<div class="possum"><div class="possum-role">${ROLE_KO[role]}</div>
      <table class="herodeep"><thead><tr><th>영웅</th><th class="num">픽</th><th class="num">픽률</th><th>승률</th><th class="num">전적</th></tr></thead><tbody>${arr.map((h) => {
        const low = h.n < 3;
        return `<tr class="${low ? "lowsmp-row" : ""}"><td class="hname">${heroChip(h.hero)}</td><td class="num">${h.n}</td><td class="num">${h.rate}%</td><td><div class="tr"><div class="fl ${wrCls(h.wr)}-fl" style="width:${h.wr}%"></div></div></td><td class="num">${h.w}-${h.n - h.w} <b>${h.wr}%</b>${low ? ' <span class="lowsmp">표본&lt;3</span>' : ""}</td></tr>`;
      }).join("")}</tbody></table></div>`;
  }).join("") || nod("영웅 기록이 없음.");

  // ── 자주 거는/당하는 밴 + 선밴/후밴 승률(맵별 포함) + 맵별 밴 경향 (요약 분석에서 이동) ──
  const T = D.teams[team];
  const made: Record<string, number> = T ? { ...T.firstBan } : {};
  if (T) Object.entries(T.secondBan).forEach(([h, n]) => (made[h] = (made[h] || 0) + n));
  type BO = { w: number; l: number; maps: Record<string, { w: number; l: number }> };
  const bo = { first: { w: 0, l: 0, maps: {} } as BO, second: { w: 0, l: 0, maps: {} } as BO };
  const bump = (slot: BO, won: boolean, map: string) => {
    slot[won ? "w" : "l"]++;
    if (map) { const mm = (slot.maps[map] = slot.maps[map] || { w: 0, l: 0 }); mm[won ? "w" : "l"]++; }
  };
  teamSets.forEach((s) => {
    const w = setWinner(s); if (!w) return; const won = w === team;
    const fb = s.bans.find((b) => b.phase === "first");
    const sb = s.bans.find((b) => b.phase === "second");
    if (fb && fb.team === team) bump(bo.first, won, s.map);
    if (sb && sb.team === team) bump(bo.second, won, s.map);
  });
  const banMapBreak = (maps: Record<string, { w: number; l: number }>) => {
    const arr = Object.entries(maps).map(([m, v]) => ({ m, n: v.w + v.l, w: v.w, l: v.l, wr: Math.round((v.w / (v.w + v.l)) * 100) }))
      .sort((a, b) => b.wr - a.wr || b.n - a.n);
    if (!arr.length) return "";
    const chip = (x: { m: string; w: number; l: number; wr: number }) => `<span class="bwm"><span class="bwm-map">${mapLink(x.m)}</span><span class="wr ${wrCls(x.wr)}">${x.wr}%</span><span class="mini">${x.w}-${x.l}</span></span>`;
    if (arr.length <= 3) return `<div class="bwm-sec"><div class="bwm-h">맵별 승률</div><div class="bwm-list">${arr.map(chip).join("")}</div></div>`;
    const top = arr.slice(0, 3);
    const topSet = new Set(top.map((x) => x.m));
    const bottom = arr.slice(-3).filter((x) => !topSet.has(x.m)).reverse();
    return `<div class="bwm-sec"><div class="bwm-h up">승률 높은 맵 TOP 3</div><div class="bwm-list">${top.map(chip).join("")}</div></div>
      ${bottom.length ? `<div class="bwm-sec"><div class="bwm-h down">승률 낮은 맵</div><div class="bwm-list">${bottom.map(chip).join("")}</div></div>` : ""}`;
  };
  const banWrCell = (r: BO) => {
    const n = r.w + r.l; const wr = n ? Math.round((r.w / n) * 100) : 0;
    return n ? `<div class="banwr"><div class="banwr-big"><span class="wr ${wrCls(wr)}">${wr}%</span></div><div class="mini">${r.w}승 ${r.l}패 · ${n}경기</div>${banMapBreak(r.maps)}</div>` : nod("표본 없음");
  };
  const banByMap: Record<string, Record<string, number>> = {};
  teamSets.forEach((s) => { if (!s.map) return; s.bans.forEach((b) => { if (b.team === team && b.hero) (banByMap[s.map] = banByMap[s.map] || {})[b.hero] = (banByMap[s.map][b.hero] || 0) + 1; }); });
  const mapKeys = Object.keys(banByMap).sort((a, b) => sum(banByMap[b]) - sum(banByMap[a]));
  const mapBanSummary = mapKeys.length
    ? mapKeys.map((m) => { const top = Object.entries(banByMap[m]).sort((a, b) => b[1] - a[1]).slice(0, 4); return `<div class="mbs-row"><span class="mbs-map">${mapLink(m)} <span class="mini">${MODE_KO[D.mapInfo[m]] || D.mapInfo[m] || ""}</span></span><span class="mbs-heroes">${top.map(([h, n]) => `<span class="mbs-h">${heroChip(h)} <span class="mini">${n}</span></span>`).join("")}</span></div>`; }).join("")
    : nod("밴 기록 없음");

  // ── 밴 포지션별 수치 (밴한 영웅의 역할 기준) ──
  const banPos: Record<string, { us: number; opp: number }> = { Tank: { us: 0, opp: 0 }, DPS: { us: 0, opp: 0 }, Support: { us: 0, opp: 0 } };
  let banPosUnknown = 0;
  teamSets.forEach((s) => s.bans.forEach((b) => {
    if (!b.hero) return;
    const role = HERO_ROLE[b.hero];
    if (!role) { banPosUnknown++; return; }
    if (b.team === team) banPos[role].us++;
    else if (b.team === oppOf(s)) banPos[role].opp++;
  }));
  const posMax = Math.max(1, ...(["Tank", "DPS", "Support"] as const).map((r) => Math.max(banPos[r].us, banPos[r].opp)));
  const banPosBlock = `<table class="herodeep banpos"><thead><tr><th>포지션</th><th>${esc(team)}이(가) 밴</th><th>상대가 ${esc(team)}에게 밴</th></tr></thead><tbody>${(["Tank", "DPS", "Support"] as const).map((role) => {
    const c = banPos[role];
    const bar = (n: number) => `<div class="tr"><div class="fl wr-fl" style="width:${Math.round((n / posMax) * 100)}%"></div></div><span class="num">${n}</span>`;
    return `<tr><td class="hname">${ROLE_KO[role]}</td><td class="banposcell">${bar(c.us)}</td><td class="banposcell">${bar(c.opp)}</td></tr>`;
  }).join("")}</tbody></table>${banPosUnknown ? `<div class="sub-note">역할 미상 영웅 ${banPosUnknown}건 제외</div>` : ""}`;

  // ── 밴 경향 (영웅별, 칩 클릭 펼침) ──
  const groups: Record<string, Record<string, number>> = { tf: {}, ts: {}, of: {}, os: {} };
  const banGames: Record<string, Array<{ date: string; map: string; opp: string; key: string }>> = {};
  const rec = (g: string, hero: string, s: SetRec) => {
    groups[g][hero] = (groups[g][hero] || 0) + 1;
    const k = `${g}|${hero}`;
    (banGames[k] = banGames[k] || []).push({ date: s.date, map: s.map, opp: oppOf(s), key: setKey(s) });
  };
  teamSets.forEach((s) => s.bans.forEach((b) => {
    if (!b.hero) return;
    if (b.team === team) rec(b.phase === "first" ? "tf" : "ts", b.hero, s);
    else if (b.team === oppOf(s)) rec(b.phase === "first" ? "of" : "os", b.hero, s);
  }));
  const banGroup = (g: string, title: string) => {
    const arr = Object.entries(groups[g]).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (!arr.length) return `<div class="bangrp"><div class="bangrp-h">${title}</div>${nod("기록 없음")}</div>`;
    const chips = arr.map(([h, n]) => {
      const k = `${g}|${h}`;
      const open = deep.banExpand === k;
      const games = open && banGames[k] ? `<div class="banexp">${banGames[k].slice().reverse().map((x) => `<div class="banexp-row clickable" data-act="load-sim" data-val="${esc(x.key)}"><span class="mini">${fmtDate(x.date)}</span> <b>${mk(x.map)}</b> <span class="mini">vs ${esc(x.opp)}</span></div>`).join("")}</div>` : "";
      return `<button class="banchip ${open ? "on" : ""}" data-act="deep-ban-expand" data-val="${esc(k)}">${heroChip(h)} <span class="mini">${n}</span></button>${games}`;
    }).join("");
    return `<div class="bangrp"><div class="bangrp-h">${title}</div><div class="banchips">${chips}</div></div>`;
  };
  const banTrend = banGroup("tf", `${esc(team)} 선밴`) + banGroup("ts", `${esc(team)} 후밴`) + banGroup("of", `상대가 ${esc(team)}에게 선밴`) + banGroup("os", `상대가 ${esc(team)}에게 후밴`);

  // 모드별 성적 (맨 위) — 요약 분석에서 이동
  const ms = T ? modeWinrate(T) : [];
  const mmx = Math.max(1, ...ms.map((m) => m[1].t));
  const modesHtml = ms.length ? ms.map(([m, d]) => barWR(MODE_KO[m] || m, d.w, d.t, mmx)).join("") : nod();

  if (view === "ban") return `
    <div class="grid4">
      <div class="panel"><h2>자주 거는 밴 <span class="count">${sum(made)}회</span></h2><div class="bars">${countBars(made, "ban", 6)}</div></div>
      <div class="panel"><h2>자주 당하는 밴 <span class="count">${T ? sum(T.banAgainst) : 0}회</span></h2><div class="bars">${T ? countBars(T.banAgainst, "ban", 6) : nod()}</div></div>
      <div class="panel"><h2>선밴 승률 <span class="count">선밴권일 때</span></h2>${banWrCell(bo.first)}</div>
      <div class="panel"><h2>후밴 승률 <span class="count">후밴권일 때</span></h2>${banWrCell(bo.second)}</div>
    </div>
    <div class="panel"><h2>밴 포지션별 수치 <span class="count">밴한 영웅의 역할 기준</span></h2>${banPosBlock}</div>
    <div class="panel"><h2>밴 경향 <span class="count">칩을 누르면 어느 경기인지 펼침</span></h2><div class="bangrps">${banTrend}</div></div>
    <div class="panel"><h2>맵별 밴 경향 <span class="count">${esc(team)} · 맵별 자주 거는 밴</span></h2><div class="mapbansum">${mapBanSummary}</div></div>`;
  return `
    <div class="panel"><h2>모드별 성적 <span class="count">맵 단위</span></h2><div class="bars">${modesHtml}</div></div>
    <div class="panel"><h2>영웅별 픽률·승률 <span class="count">${esc(team)} 사용 영웅 · 포지션별</span></h2>
      ${pickToggles}${pickBlock}</div>`;
}

// ── 맵 분석 탭(perf): 쟁탈 맵 승률 + 맵 선택권 영향 + 자주 고르는 맵 / 맵 밴 분석(ban): 모드별 밴 분포 ──
function renderScoutMaps(D: DataBundle, team: string, deep: DeepUI, view: "perf" | "ban" = "perf"): string {
  const teamSets = D.sets.filter((s) => s.top === team || s.bottom === team);

  // ── 쟁탈 맵 승률 ──
  const ctrl: Record<string, { w: number; l: number; u: number }> = {};
  teamSets.filter((s) => s.mode === "Control").forEach((s) => {
    const m = (ctrl[s.map] = ctrl[s.map] || { w: 0, l: 0, u: 0 });
    const w = setWinner(s);
    if (!w) m.u++; else if (w === team) m.w++; else m.l++;
  });
  const ctrlRows = Object.entries(ctrl).sort((a, b) => (b[1].w + b[1].l) - (a[1].w + a[1].l));
  const ctrlMax = Math.max(1, ...ctrlRows.map(([, r]) => r.w + r.l));
  const ctrlBlock = ctrlRows.length
    ? ctrlRows.map(([map, r]) => wrLine(mk(map), r.w, r.l, ctrlMax, r.u ? ` <span class="mini">· ${r.u}미기록</span>` : "")).join("")
    : nod("쟁탈 경기 기록이 없음.");

  // ── 맵 선택권 영향 ──
  const pk = { team: { w: 0, l: 0 }, opp: { w: 0, l: 0 }, none: { w: 0, l: 0 } };
  teamSets.forEach((s) => {
    const w = setWinner(s); if (!w) return; const won = w === team;
    const b = (!s.picker || s.picker === "ADMIN") ? pk.none : s.picker === team ? pk.team : pk.opp;
    b[won ? "w" : "l"]++;
  });
  const pkMax = Math.max(1, pk.team.w + pk.team.l, pk.opp.w + pk.opp.l, pk.none.w + pk.none.l);
  const pickBlock = wrLine("우리가 맵 선택", pk.team.w, pk.team.l, pkMax) + wrLine("상대가 맵 선택", pk.opp.w, pk.opp.l, pkMax) + wrLine("선택권 없음(쟁탈 등)", pk.none.w, pk.none.l, pkMax);

  // ── 맵에서 밴 많이 하는 순위 (맵별 최다 피밴 영웅, 칩 클릭 펼침) ──
  // ③ 모드별 밴 분포 (이 팀이 관여한 경기의 맵별 밴) — 리그판과 같은 가독성 레이아웃
  const banByMapH: Record<string, Record<string, number>> = {};
  teamSets.forEach((s) => {
    if (!s.map) return;
    s.bans.forEach((b) => { if (b.hero) (banByMapH[s.map] = banByMapH[s.map] || {})[b.hero] = (banByMapH[s.map][b.hero] || 0) + 1; });
  });
  const teamModeBan = modeBanBlocks(D, banByMapH);
  // 이 팀이 맵 선택권을 가졌을 때 고른 맵 빈도
  const picked: Record<string, number> = {};
  teamSets.forEach((s) => { if (s.picker === team && s.map) picked[s.map] = (picked[s.map] || 0) + 1; });
  const pickedBlock = Object.keys(picked).length ? rankBars(picked, (m) => mk(m)) : nod("이 팀이 맵을 고른 기록이 없음.");

  if (view === "ban") return `
    <div class="panel"><h2>모드별 밴 분포 <span class="count">${esc(team)} 경기 · 모드 안 각 맵별 상위 5</span></h2><div class="modebans">${teamModeBan}</div></div>`;
  return `
    <div class="panel"><h2>쟁탈 맵 승률 <span class="count">맵 단위 · 거점 세부는 시트에 없음</span></h2>
      <div class="sub-note">막대=표본(맵 수), 오른쪽에 승률·전적·미기록. 시트에 거점(등대/우물 등) 데이터가 없어 맵 단위로 집계해요.</div>
      <div class="wrlines">${ctrlBlock}</div></div>
    <div class="panel"><h2>맵 선택권 영향 <span class="count">누가 맵을 골랐나</span></h2><div class="wrlines">${pickBlock}</div></div>
    <div class="panel"><h2>자주 고르는 맵 <span class="count">${esc(team)} 맵 선택권일 때</span></h2>
      <div class="sub-note">맵 선택권(picker)이 ${esc(team)}인 경기에서 고른 맵 빈도.</div>
      <div class="bars">${pickedBlock}</div></div>`;
}

export function renderScout(D: DataBundle, curScout: string, scoutTab: string, deep: DeepUI, weakExpand = ""): string {
  const opps = D.teamNames.filter((n) => n !== D.us);
  const chips = opps.map((n) => {
    const isNext = usUpcoming(D).some((g) => g.a === n || g.b === n);
    return `<button class="chip ${n === curScout ? "on" : ""}" data-act="scout" data-val="${esc(n)}">${esc(n)}${isNext ? '<span class="next">다음 상대</span>' : ""}</button>`;
  }).join("");

  const T = D.teams[curScout];
  if (!T) return `<div class="chiprow">${chips}</div>${nod("팀 데이터가 없습니다.")}`;

  const st = standOf(D, curScout);
  const mdiff = T.mapW - T.mapL;
  const cards =
    stat("매치 전적", `<span class="ww">${T.mw}</span><small> - ${T.ml}</small>`) +
    stat("순위", st ? tieRank(D, st) : "—") +
    stat("맵 전적", `<span class="ww">${T.mapW}</span><small> - ${T.mapL}</small>`) +
    stat("맵 득실", `${mdiff > 0 ? "+" : ""}${mdiff}`);

  const tab = ["summary", "games", "heroes", "heroban", "maps", "mapban"].includes(scoutTab) ? scoutTab : "summary";
  const subtabs = `<div class="subtabs">${[["summary", "요약 분석"], ["games", "경기별 분석"], ["heroes", "영웅 분석"], ["heroban", "영웅 밴 분석"], ["maps", "맵 분석"], ["mapban", "맵 밴 분석"]].map(([id, lb]) => `<button class="subtab ${tab === id ? "on" : ""}" data-act="scout-tab" data-val="${id}">${lb}</button>`).join("")}</div>`;

  let body: string;
  if (tab === "games") {
    const teamSets = D.sets.filter((s) => s.top === curScout || s.bottom === curScout).slice().reverse();
    body = teamSets.length
      ? teamSets.map((s) => scoutGameCard(D, s, curScout)).join("")
      : nod("이 팀의 경기 기록이 없음.");
  } else if (tab === "heroes") {
    body = renderScoutHeroes(D, curScout, deep, "pick");
  } else if (tab === "heroban") {
    body = renderScoutHeroes(D, curScout, deep, "ban");
  } else if (tab === "maps") {
    body = renderScoutMaps(D, curScout, deep, "perf");
  } else if (tab === "mapban") {
    body = renderScoutMaps(D, curScout, deep, "ban");
  } else {
    body = teamSummary(D, curScout, curScout === D.us, weakExpand);
  }

  return `
    <div class="chiprow">${chips}</div>
    <div class="statrow">${cards}</div>
    ${subtabs}
    ${body}`;
}

// ===== 선수 스탯 — 선수 프로필 (리그 전체) =====
interface StatAgg { n: number; ed: number; dmg10: number; heal10: number; mit10: number; death10: number; e10: number; }
function aggStats(rows: PStatRow[]): StatAgg | null {
  const n = rows.length;
  if (!n) return null;
  const avg = (f: (r: PStatRow) => number) => rows.reduce((a, r) => a + f(r), 0) / n;
  return { n, ed: avg((r) => r.ed), dmg10: avg((r) => r.dmg10), heal10: avg((r) => r.heal10), mit10: avg((r) => r.mit10), death10: avg((r) => r.death10), e10: avg((r) => r.e10) };
}
const statCaveat = `<div class="sub-note causenote">누적값은 10분당 정규화 비교(원시값 단독 비교 금지). 상관은 인과가 아님 · 스크림 미포함 · 표본 한정. 딜러의 힐·방어 0은 정상값.</div>`;
// 선수 스탯 패널 — 선수별 분석 페이지(선수 요약 아래)에 삽입. 이미 선택된 선수 기준.
export function playerStatsPanel(D: DataBundle, name: string): string {
  const mine = D.playerStats.filter((r) => r.name === name);
  if (!mine.length) {
    return `<div class="panel"><h2>선수 스탯 <span class="count">10분당 정규화 · 리그 평균 대비</span></h2>
      ${nod("이 선수의 스탯 표본 없음 — 'OWCS 선수 스탯' 시트가 채워지면 영웅별 E/D·딜/힐/방어/데스(10분당)가 자동 표시됩니다.")}${statCaveat}</div>`;
  }
  const roleCnt: Record<string, number> = {};
  mine.forEach((r) => (roleCnt[r.role] = (roleCnt[r.role] || 0) + 1));
  const role = Object.entries(roleCnt).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const leagueByHero: Record<string, PStatRow[]> = {};
  D.playerStats.forEach((r) => (leagueByHero[r.hero || "(미상)"] = leagueByHero[r.hero || "(미상)"] || []).push(r));
  const byHero: Record<string, PStatRow[]> = {};
  mine.forEach((r) => (byHero[r.hero || "(미상)"] = byHero[r.hero || "(미상)"] || []).push(r));
  const dev = (val: number, league: number | null, digits: number, hi = true) => {
    const v = digits ? val.toFixed(digits) : Math.round(val).toLocaleString();
    if (league == null) return `<span>${v}</span>`;
    const diff = val - league;
    const good = hi ? diff >= 0 : diff <= 0;
    const sign = diff >= 0 ? "+" : "";
    const dv = digits ? Math.abs(diff).toFixed(digits) : Math.round(Math.abs(diff)).toLocaleString();
    return `<span>${v} <span class="psdev ${good ? "up" : "down"}">${sign}${dv}</span></span>`;
  };
  const rows = Object.entries(byHero).sort((a, b) => b[1].length - a[1].length).map(([hero, hrows]) => {
    const me = aggStats(hrows)!;
    const lg = aggStats((leagueByHero[hero] || []))!;
    const low = me.n === 1;
    return `<tr><td class="hname">${hero === "(미상)" ? '<span class="mini">미상</span>' : heroChip(hero)}</td>
      <td class="num">${me.n}</td>
      <td class="num">${dev(me.ed, lg.ed, 2)}</td>
      <td class="num">${dev(me.dmg10, lg.dmg10, 0)}</td>
      <td class="num">${dev(me.heal10, lg.heal10, 0)}</td>
      <td class="num">${dev(me.mit10, lg.mit10, 0)}</td>
      <td class="num">${dev(me.death10, lg.death10, 1, false)}</td></tr>`;
  }).join("");
  return `<div class="panel"><h2>선수 스탯 <span class="count">${esc(ROLE_KO[role] || role)} · ${mine.length}경기 · 리그 평균 대비 편차(±)</span></h2>
    <div class="sub-note">영웅별 평균 지표와 리그 평균 대비 편차. 좋은 방향이 초록. <b>/10분</b> = 경기 시간이 달라도 비교되도록 10분당으로 환산한 값(딜량·힐량 등 ÷ 경기 시간 × 10분).</div>
    <div class="tablewrap"><table class="hbtable psstat"><thead><tr><th>영웅</th><th class="num">경기</th><th class="num">E/D</th><th class="num">딜/10분</th><th class="num">힐/10분</th><th class="num">방어/10분</th><th class="num">데스/10분</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="7">${nod("표본 없음")}</td></tr>`}</tbody></table></div>
    ${statCaveat}</div>`;
}

// ===== BANPICK (5.3) =====
export function renderBanpick(D: DataBundle, bpTeam: string): string {
  const league: Record<string, number> = {};
  D.sets.forEach((s) => s.bans.forEach((b) => (league[b.hero] = (league[b.hero] || 0) + 1)));
  const Z = D.teams[D.us];
  const made: Record<string, number> = Z ? { ...Z.firstBan } : {};
  if (Z) Object.entries(Z.secondBan).forEach(([h, n]) => (made[h] = (made[h] || 0) + n));

  const teamSel = `<select data-act="bpteam">${D.teamNames.map((n) => `<option ${n === bpTeam ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  const t = D.teams[bpTeam];

  return `
    <div class="panel">
      <h2>리그 전체 밴 빈도 <span class="count">상위 ${Math.min(12, Object.keys(league).length)}종</span></h2>
      <div class="bars">${countBars(league, "ban", 12)}</div>
    </div>
    <div class="grid2">
      <div class="panel"><h2>ZANSIDE가 자주 당하는 밴 <span class="count">${Z ? sum(Z.banAgainst) : 0}회</span></h2><div class="bars">${Z ? countBars(Z.banAgainst, "ban") : nod()}</div></div>
      <div class="panel"><h2>ZANSIDE가 자주 거는 밴 <span class="count">${sum(made)}회</span></h2><div class="bars">${Z ? countBars(made, "ban") : nod()}</div></div>
    </div>
    <div class="panel">
      <h2>팀별 밴 성향 <span class="count">선밴 상위 영웅</span></h2>
      <div class="fbar"><span class="flabel">팀</span>${teamSel}</div>
      <div class="grid2">
        <div><div class="sub-note">선밴</div><div class="bars">${t ? countBars(t.firstBan, "ban") : nod()}</div></div>
        <div><div class="sub-note">후밴</div><div class="bars">${t ? countBars(t.secondBan, "ban") : nod()}</div></div>
      </div>
    </div>`;
}

// 팀 요약 레이아웃 (우리 팀·상대 팀 공용). 로스터 이름을 누르면 선수 분석으로 이동.
function teamSummary(D: DataBundle, team: string, isUs: boolean, weakExpand: string): string {
  const T = D.teams[team];
  if (!T) return nod("팀 데이터가 없음.");
  const last = D.series.filter((s) => s.top === team || s.bottom === team).slice(-6).reverse();
  const form = last.length
    ? last.map((S) => {
        const w = S.top === team ? S.topW : S.bottomW;
        const o = S.top === team ? S.bottomW : S.topW;
        const opp = S.top === team ? S.bottom : S.top;
        const won = w > o;
        return `<div class="fcard ${won ? "w" : "l"}"><div class="res">${won ? "WIN" : "LOSS"}</div><div class="opp">vs ${esc(opp)}</div><div class="meta">${w}-${o} · ${fmtDate(S.date)}</div></div>`;
      }).join("")
    : nod("아직 치른 경기가 없음.");
  const roleOfR = (roles: Record<string, number>) => { const e = Object.entries(roles).sort((a, b) => b[1] - a[1])[0]; return e ? ROLE_KO[e[0]] || e[0] : ""; };
  const players = D.playerNames.map((n) => D.players[n]).filter((p) => p.team === team).sort((a, b) => b.n - a.n);
  const rosterHtml = players.length
    ? players.map((p) => {
        const th = Object.values(p.heroes).sort((a, b) => b.n - a.n)[0];
        return `<button class="rcard rcard-btn" data-act="goplayer" data-val="${esc(p.name)}"><div class="rn">${esc(p.name)} <span class="rgo">→</span></div><div class="rr">${esc(roleOfR(p.roles))} · ${p.n}맵${th ? ` · ${esc(heroKo(th.hero))}` : ""}</div></button>`;
      }).join("")
    : nod("로스터 데이터가 없음.");
  return `
    <div class="panel"><h2>최근 폼 <span class="count">최근 ${last.length}경기</span></h2><div class="form">${form}</div></div>
    <div class="panel"><h2>로스터 <span class="count">${players.length}명 · 누르면 선수 분석</span></h2><div class="roster">${rosterHtml}</div></div>
    <div class="grid2">
      <div class="panel"><h2>맵별 성적 <span class="count">출전·승률</span></h2>${teamMapSummary(T)}</div>
      <div class="panel"><h2>영웅별 요약 <span class="count">자주 쓴 영웅 · 픽·교체 포함</span></h2><div class="bars">${heroPickBars(teamHeroPicks(D, team), 8)}</div></div>
    </div>`;
}

// ===== ZANSIDE 데이터 (우리 팀 집약 대시보드) =====
export function renderZanside(D: DataBundle, weakExpand: string): string {
  const T = D.teams[D.us];
  const st = standOf(D, D.us);
  if (!T) return `<div class="panel">${nod("ZANSIDE 데이터가 아직 없음.")}</div>`;
  const diff = T.mapW - T.mapL;
  const up = usUpcoming(D);
  const cards =
    stat("매치 전적", st ? `<span class="ww">${st.win}</span><small> - ${st.lose}</small>` : "—", true) +
    stat("순위", st ? tieRank(D, st) : "—", true) +
    stat("맵 득실", `${diff > 0 ? "+" : ""}${diff}<small> (${T.mapW}-${T.mapL})</small>`, true) +
    stat("잔여 경기", `${up.length}`, true);

  const upcoming = up.length
    ? up.map((g) => {
        const opp = g.a === D.us ? g.b : g.a;
        return `<div class="ucard" tabindex="0" data-act="goscout" data-val="${esc(opp)}"><div class="udt">${esc(g.date)} · ${esc(g.label)}</div><div class="uvs">vs</div><div class="uopp">${esc(opp)}</div><div class="ugo">팀별 분석 보기 →</div></div>`;
      }).join("")
    : nod("예정된 다음 경기가 없음.");

  return `
    <div class="statrow">${cards}</div>
    <div class="panel"><h2>잔여 일정 · 다음 상대 <span class="count">카드를 누르면 팀별 분석</span></h2><div class="upc">${upcoming}</div></div>
    ${teamSummary(D, D.us, true, weakExpand)}`;
}

// ===== 영웅 밴 분석 (밴픽 + 옛 영웅 메타의 밴 뷰 통합) =====
export interface BanUI {
  role: "all" | "Tank" | "DPS" | "Support";
  topN: number;
  team: string;
  banMap: string;
  banExpand: string;
}
const roleOk = (hero: string, role: BanUI["role"]) => role === "all" || HERO_ROLE[hero] === role;
// 모드별 밴 분포 블록 (모드 → 그 모드의 맵별 밴 막대). 리그/팀 공용.
function modeBanBlocks(D: DataBundle, banByMapH: Record<string, Record<string, number>>, role: BanUI["role"] = "all"): string {
  const mapsByMode: Record<string, string[]> = {};
  Object.keys(banByMapH).forEach((map) => { const mode = D.mapInfo[map]; if (mode) (mapsByMode[mode] = mapsByMode[mode] || []).push(map); });
  const order = [...MODE_ORDER, ...Object.keys(mapsByMode).filter((m) => !MODE_ORDER.includes(m))];
  const f: BanUI = { role, topN: 5, team: "", banMap: "all", banExpand: "" };
  const blocks = order.filter((m) => mapsByMode[m]).map((m) => {
    const ms = mapsByMode[m].slice().sort();
    return `<div class="modeban-grp"><div class="modeban-mode">${esc(MODE_KO[m] || m)}</div><div class="grid3">${ms.map((map) => `<div class="modeban-map-blk"><div class="modeban-map">${mk(map)}</div><div class="bars">${banBars(banByMapH[map], f, "ban")}</div></div>`).join("")}</div></div>`;
  }).join("");
  return blocks || nod("밴 기록이 없음.");
}
function banBars(counts: Record<string, number>, f: BanUI, cls = "ban"): string {
  let arr = Object.entries(counts).filter(([h]) => roleOk(h, f.role)).sort((a, b) => b[1] - a[1]);
  if (f.topN > 0) arr = arr.slice(0, f.topN);
  if (!arr.length) return nod("해당 조건의 밴이 없음.");
  const mx = Math.max(1, ...arr.map((x) => x[1]));
  return arr.map(([h, v]) =>
    `<div class="bar"><span class="lab">${heroChip(h)}</span><div class="tr"><div class="fl ${cls}" style="width:${Math.round((v / mx) * 100)}%"></div></div><span class="vl">${v}</span></div>`
  ).join("");
}
// 라벨 막대 (리그 선밴 상위 양식) — 라벨이 영웅 칩이 아니라 맵/팀 등 임의 텍스트
function rankBars(counts: Record<string, number>, labelFn: (k: string) => string, cls = "ban", topN = 10): string {
  let arr = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (topN > 0) arr = arr.slice(0, topN);
  if (!arr.length) return nod("기록 없음");
  const mx = Math.max(1, ...arr.map((x) => x[1]));
  return arr.map(([k, v]) =>
    `<div class="bar"><span class="lab">${labelFn(k)}</span><div class="tr"><div class="fl ${cls}" style="width:${Math.round((v / mx) * 100)}%"></div></div><span class="vl">${v}</span></div>`
  ).join("");
}
interface BanSet { date: string; map: string; replay: string; phase: "first" | "second"; self: { player: string; hero: string }[]; opp: { player: string; hero: string }[]; oppName: string; }
interface BanHeroAgg { hero: string; first: number; second: number; total: number; maps: Record<string, number>; sets: BanSet[]; }
function teamBanDetail(D: DataBundle, team: string, banMap: string): BanHeroAgg[] {
  const byHero: Record<string, BanHeroAgg> = {};
  D.sets.forEach((s) => {
    if (banMap !== "all" && s.map !== banMap) return;
    s.bans.forEach((b) => {
      if (b.team !== team || !b.hero) return;
      const self = (team === s.top ? s.picks.top : s.picks.bottom).filter((p) => p.player || p.hero);
      const opp = (team === s.top ? s.picks.bottom : s.picks.top).filter((p) => p.player || p.hero);
      const agg = (byHero[b.hero] = byHero[b.hero] || { hero: b.hero, first: 0, second: 0, total: 0, maps: {}, sets: [] });
      if (b.phase === "first") agg.first++; else agg.second++;
      agg.total++;
      if (s.map) agg.maps[s.map] = (agg.maps[s.map] || 0) + 1;
      agg.sets.push({ date: s.date, map: s.map, replay: s.replay, phase: b.phase, self, opp, oppName: team === s.top ? s.bottom : s.top });
    });
  });
  return Object.values(byHero).sort((a, b) => b.total - a.total);
}
function banLineup(name: string, lines: { player: string; hero: string }[], zan: boolean): string {
  if (!lines.length) return `<div class="lineup"><span class="lu-team ${zan ? "zan" : ""}">${esc(name)}</span> <span class="mini">라인업 미기록</span></div>`;
  return `<div class="lineup"><span class="lu-team ${zan ? "zan" : ""}">${esc(name)}</span>${lines.map((p) => `<span class="lu-p">${heroIcon(p.hero || "")}<span>${playerLink(p.player)}</span></span>`).join("")}</div>`;
}
// ===== ZANSIDE 영웅 분석 탭 (자주 당하는/거는 밴) — 우리팀 데이터 섹션 =====
export function renderZansideBan(D: DataBundle, f: BanUI): string {
  setIcons(D.heroIcons);
  const Z = D.teams[D.us];
  const made: Record<string, number> = Z ? { ...Z.firstBan } : {};
  if (Z) Object.entries(Z.secondBan).forEach(([h, n]) => (made[h] = (made[h] || 0) + n));
  const roles: Array<[string, string]> = [["all", "전체"], ["Tank", "탱커"], ["DPS", "딜러"], ["Support", "서포터"]];
  const filterBar = `<div class="metabar">
    <span class="flabel">역할</span><div class="seg">${roles.map(([id, lb]) => `<button class="${f.role === id ? "on" : ""}" data-act="ban-role" data-val="${id}">${lb}</button>`).join("")}</div>
    <span class="flabel">표시</span><select data-act="ban-topn">${[[12, "상위 12"], [24, "상위 24"], [0, "전체"]].map(([v, lb]) => `<option value="${v}" ${f.topN === v ? "selected" : ""}>${lb}</option>`).join("")}</select>
  </div>`;
  return `
    ${filterBar}
    <div class="grid2">
      <div class="panel"><h2>ZANSIDE가 자주 당하는 밴 <span class="count">${Z ? Object.values(Z.banAgainst).reduce((a, b) => a + b, 0) : 0}회</span></h2><div class="bars">${Z ? banBars(Z.banAgainst, f) : nod()}</div></div>
      <div class="panel"><h2>ZANSIDE가 자주 거는 밴 <span class="count">${Object.values(made).reduce((a, b) => a + b, 0)}회</span></h2><div class="bars">${banBars(made, f)}</div></div>
    </div>`;
}

// ===== 영웅 밴 분석 (영웅 중심 탐색: 검색/포지션 선택 → 맵별·팀별 밴 분포) =====
export interface HeroBanUI { hero: string; search: string; team: string; role: string; }
export function renderHeroBan(D: DataBundle, ui: HeroBanUI): string {
  setIcons(D.heroIcons);
  const q = ui.search.trim().toLowerCase();
  const allHeroes = (["Tank", "DPS", "Support"] as const).flatMap((r) => HEROES[r]);
  const matches = q ? allHeroes.filter((h) => h.toLowerCase().includes(q) || heroKo(h).toLowerCase().includes(q)) : [];
  const heroChipBtn = (h: string) => `<button class="hbchip ${h === ui.hero ? "on" : ""}" data-act="hb-hero" data-val="${esc(h)}">${heroIcon(h)}<span class="hbn">${esc(heroKo(h))}</span></button>`;
  const searchResults = q ? `<div class="sub-note">'${esc(ui.search)}' 검색 결과 — 누르면 선택</div><div class="hbgrid">${matches.length ? matches.map(heroChipBtn).join("") : nod("맞는 영웅이 없음.")}</div>` : "";
  // 포지션 → 영웅 드롭다운 (선수별 분석과 동일한 양식)
  const roleOpts: Array<[string, string]> = [["all", "전체"], ["Tank", "탱커"], ["DPS", "딜러"], ["Support", "서포터"]];
  const roleSel = `<select data-act="hb-role">${roleOpts.map(([v, l]) => `<option value="${v}" ${ui.role === v ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const pool = (ui.role === "all" ? allHeroes : HEROES[ui.role as "Tank" | "DPS" | "Support"] || allHeroes).slice();
  if (ui.hero && !pool.includes(ui.hero)) pool.unshift(ui.hero);
  const heroSel = `<select data-act="hb-hero"><option value="" ${!ui.hero ? "selected" : ""}>— 영웅 —</option>${pool.map((h) => `<option value="${esc(h)}" ${h === ui.hero ? "selected" : ""}>${esc(heroKo(h))}</option>`).join("")}</select>`;
  const selector = `${searchResults}<div class="psel"><label class="estfield"><span class="estlabel">포지션</span>${roleSel}</label><label class="estfield"><span class="estlabel">영웅</span>${heroSel}</label></div>`;

  // 영웅 선택 전 기본: 리그 선밴/후밴 순위 + 팀별 밴 성향(맵별 분포 미리보기)
  const f2: BanUI = { role: (ui.role || "all") as BanUI["role"], topN: 12, team: "", banMap: "all", banExpand: "" };
  const gFirst: Record<string, number> = {}, gSecond: Record<string, number> = {};
  D.sets.forEach((s) => s.bans.forEach((b) => { if (b.hero) (b.phase === "first" ? gFirst : gSecond)[b.hero] = ((b.phase === "first" ? gFirst : gSecond)[b.hero] || 0) + 1; }));
  const teamForBan = ui.team && D.teamNames.includes(ui.team) ? ui.team : D.us;
  const banTeamSel = `<select data-act="hb-team">${D.teamNames.map((n) => `<option value="${esc(n)}" ${n === teamForBan ? "selected" : ""}>${esc(n)}${n === D.us ? " · 우리 팀" : ""}</option>`).join("")}</select>`;
  const tbAgg = teamBanDetail(D, teamForBan, "all").filter((h) => roleOk(h.hero, f2.role)).slice(0, 20);
  const banTendTable = tbAgg.length
    ? `<table class="bantable"><thead><tr><th>영웅</th><th class="num">선밴</th><th class="num">후밴</th><th class="num">합계</th><th>맵별 분포</th></tr></thead><tbody>${tbAgg.map((h) => {
        const mapDist = Object.entries(h.maps).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([m, n]) => `<span class="utag">${mk(m)} <span class="mini">${n}</span></span>`).join("");
        return `<tr><td class="hname">${heroChip(h.hero)}</td><td class="num">${h.first}</td><td class="num">${h.second}</td><td class="num"><b>${h.total}</b></td><td><div class="utags">${mapDist || '<span class="mini">-</span>'}</div></td></tr>`;
      }).join("")}</tbody></table>`
    : nod("이 팀의 밴 기록 없음");
  let detail = `
    <div class="grid2">
      <div class="panel"><h2>리그 선밴 순위</h2><div class="bars">${banBars(gFirst, f2)}</div></div>
      <div class="panel"><h2>리그 후밴 순위</h2><div class="bars">${banBars(gSecond, f2)}</div></div>
    </div>
    <div class="panel"><h2>팀별 밴 성향 <span class="count">${esc(teamForBan)} · 맵별 분포 미리보기</span></h2>
      <div class="fbar"><span class="flabel">팀</span>${banTeamSel}</div>
      ${banTendTable}</div>`;
  if (ui.hero) {
    const H = ui.hero;
    // 밴 집계 (선밴/후밴 × 맵/팀)
    const fbMap: Record<string, number> = {}, sbMap: Record<string, number> = {}, fbTeam: Record<string, number> = {}, sbTeam: Record<string, number> = {};
    let tf = 0, ts = 0;
    D.sets.forEach((s) => s.bans.forEach((b) => {
      if (b.hero !== H) return;
      if (b.phase === "first") { tf++; if (s.map) fbMap[s.map] = (fbMap[s.map] || 0) + 1; fbTeam[b.team] = (fbTeam[b.team] || 0) + 1; }
      else { ts++; if (s.map) sbMap[s.map] = (sbMap[s.map] || 0) + 1; sbTeam[b.team] = (sbTeam[b.team] || 0) + 1; }
    }));
    // 픽 집계 (맵/선수 × 승률)
    const pickMap: Record<string, { n: number; w: number }> = {};
    const pickPl: Record<string, { n: number; w: number; team: string }> = {};
    let totalPick = 0;
    D.sets.forEach((s) => {
      const w = setWinner(s);
      const swaps = swapsByPlayer(s.memo); // 교체로 그 영웅을 든 경우도 '플레이'에 포함
      ([[s.top, s.picks.top], [s.bottom, s.picks.bottom]] as Array<[string, Pick[]]>).forEach(([team, picks]) => {
        picks.forEach((p) => {
          const playedH = p.hero === H || (swaps[p.player] || []).includes(H);
          if (!playedH) return;
          totalPick++;
          const won = w === team;
          if (s.map) { const m = (pickMap[s.map] = pickMap[s.map] || { n: 0, w: 0 }); m.n++; if (won) m.w++; }
          const pl = (pickPl[p.player] = pickPl[p.player] || { n: 0, w: 0, team }); pl.n++; if (won) pl.w++;
        });
      });
    });
    const banTr = (w: number, max: number) => `<div class="tr mini-tr"><div class="fl ban" style="width:${Math.round((w / max) * 100)}%"></div></div>`;
    // 자주 플레이하는 선수 — 픽 대비 승률 높은 순(동률은 픽 수)
    const ppRows = Object.entries(pickPl).map(([p, v]) => ({ p, ...v })).sort((a, b) => (b.w / b.n) - (a.w / a.n) || b.n - a.n);
    const playPlayerTable = ppRows.length
      ? `<table class="hbtable"><thead><tr><th>선수</th><th>팀</th><th class="num">픽</th><th class="num">승률</th></tr></thead><tbody>${ppRows.map((r) => { const wr = r.n ? Math.round((r.w / r.n) * 100) : 0; return `<tr class="${r.team === D.us ? "zanrow" : ""}"><td>${playerLink(r.p)}</td><td class="mini">${teamLink(r.team, r.team === D.us)}</td><td class="num">${r.n}</td><td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span></td></tr>`; }).join("")}</tbody></table>`
      : nod("픽 기록 없음");
    // 자주 플레이하는 맵 — 팀 선택 시 그 팀이 이 영웅을 언제·어느 맵에서 플레이했고 승률은 어땠는지
    const heroTeams = [...new Set(Object.values(pickPl).map((p) => p.team))].sort((a, b) => (a === D.us ? -1 : b === D.us ? 1 : a.localeCompare(b)));
    const mapTeamSel = `<select data-act="hb-team"><option value="all" ${ui.team === "all" ? "selected" : ""}>전체 팀(집계)</option>${heroTeams.map((t) => `<option value="${esc(t)}" ${t === ui.team ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
    let mapPanelBody: string;
    if (ui.team !== "all" && heroTeams.includes(ui.team)) {
      const games = D.sets.filter((s) => {
        const side = s.top === ui.team ? s.picks.top : s.bottom === ui.team ? s.picks.bottom : null;
        if (!side) return false;
        const sw = swapsByPlayer(s.memo);
        return side.some((p) => p.hero === H || (sw[p.player] || []).includes(H));
      }).slice().reverse();
      let gw = 0, gl = 0;
      games.forEach((s) => { const w = setWinner(s); if (w === ui.team) gw++; else if (w) gl++; });
      mapPanelBody = games.length
        ? `<div class="sub-note">${esc(ui.team)} · ${esc(heroKo(H))} ${gw}승 ${gl}패 (${gw + gl ? Math.round(gw / (gw + gl) * 100) : 0}%)</div>
          <table class="hbtable"><thead><tr><th>날짜</th><th>맵</th><th>선수</th><th>상대</th><th class="num">결과</th></tr></thead><tbody>${games.map((s) => { const w = setWinner(s); const won = w === ui.team; const opp = s.top === ui.team ? s.bottom : s.top; const side = s.top === ui.team ? s.picks.top : s.picks.bottom; const sw = swapsByPlayer(s.memo); const pl = side.find((p) => p.hero === H || (sw[p.player] || []).includes(H)); return `<tr><td class="mini">${fmtDate(s.date)}</td><td class="hname">${mapLink(s.map)}</td><td>${pl ? playerLink(pl.player) : '<span class="mini">-</span>'}</td><td>${teamLink(opp, opp === D.us)}</td><td class="num"><span class="reslabel ${won ? "win" : "loss"}">${won ? "승" : w ? "패" : "·"}</span></td></tr>`; }).join("")}</tbody></table>`
        : nod("이 팀의 해당 영웅 경기 없음");
    } else {
      const pmRows = Object.entries(pickMap).map(([m, v]) => ({ m, ...v })).sort((a, b) => b.n - a.n);
      const pmMax = Math.max(1, ...pmRows.map((r) => r.n));
      mapPanelBody = pmRows.length
        ? `<table class="hbtable"><thead><tr><th>맵</th><th class="num">픽</th><th class="num">승률</th><th>빈도</th></tr></thead><tbody>${pmRows.map((r) => { const wr = r.n ? Math.round((r.w / r.n) * 100) : 0; return `<tr><td class="hname">${mk(r.m)}</td><td class="num">${r.n}</td><td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span></td><td>${banTr(r.n, pmMax)}</td></tr>`; }).join("")}</tbody></table>`
        : nod("픽 기록 없음");
    }
    const mapLabel = (m: string) => mk(m);
    const teamLabel = (t: string) => `<span class="${t === D.us ? "zan" : ""}">${esc(t)}</span>`;
    detail = `
      <div class="panel hbsel"><div class="hbsel-head">${heroIcon(H)}<div><div class="hbsel-name">${esc(heroKo(H))} <span class="mini">${esc(ROLE_KO[HERO_ROLE[H] || ""] || "")}</span></div><div class="mini">픽 ${totalPick}회 · 총 밴 ${tf + ts}회 (선밴 ${tf} · 후밴 ${ts})</div></div></div></div>
      <div class="grid2">
        <div class="panel"><h2>자주 플레이하는 맵 <span class="count">팀 선택 시 경기별</span></h2>
          <div class="fbar"><span class="flabel">팀</span>${mapTeamSel}</div>${mapPanelBody}</div>
        <div class="panel"><h2>자주 플레이하는 선수 <span class="count">픽 대비 승률 순</span></h2>${playPlayerTable}</div>
      </div>
      <div class="grid2">
        <div class="panel"><h2>선밴 순위 <span class="count">맵 · 팀 (상위 10)</span></h2>
          <div class="sub-note">맵</div><div class="bars">${rankBars(fbMap, mapLabel)}</div>
          <div class="sub-note" style="margin-top:12px">팀</div><div class="bars">${rankBars(fbTeam, teamLabel)}</div>
        </div>
        <div class="panel"><h2>후밴 순위 <span class="count">맵 · 팀 (상위 10)</span></h2>
          <div class="sub-note">맵</div><div class="bars">${rankBars(sbMap, mapLabel)}</div>
          <div class="sub-note" style="margin-top:12px">팀</div><div class="bars">${rankBars(sbTeam, teamLabel)}</div>
        </div>
      </div>`;
  }
  return `
    <div class="panel"><h2>영웅 선택</h2>
      <div class="sub-note">맨 위 검색창은 전체 영웅에서 이름(한글/영문)으로 검색. 또는 아래에서 포지션 → 영웅 순으로 선택.</div>
      ${selector}</div>
    ${detail}`;
}
export function renderBanAnalysis(D: DataBundle, f: BanUI): string {
  setIcons(D.heroIcons);
  // 리그 전체 밴 (선밴/후밴 분리)
  const gFirst: Record<string, number> = {}, gSecond: Record<string, number> = {}, byMode: Record<string, Record<string, number>> = {};
  const banByMapH: Record<string, Record<string, number>> = {}; // 맵 → 영웅 → 밴 수
  D.sets.forEach((s) => s.bans.forEach((b) => {
    if (!b.hero) return;
    (b.phase === "first" ? gFirst : gSecond)[b.hero] = ((b.phase === "first" ? gFirst : gSecond)[b.hero] || 0) + 1;
    if (s.mode) (byMode[s.mode] = byMode[s.mode] || {})[b.hero] = ((byMode[s.mode] || {})[b.hero] || 0) + 1;
    if (s.map) (banByMapH[s.map] = banByMapH[s.map] || {})[b.hero] = ((banByMapH[s.map] || {})[b.hero] || 0) + 1;
  }));
  const gAll: Record<string, number> = { ...gFirst };
  Object.entries(gSecond).forEach(([h, n]) => (gAll[h] = (gAll[h] || 0) + n));

  // ZANSIDE 거는/당하는 밴은 'ZANSIDE 데이터 → ZANSIDE 분석 / 영웅 분석'에서 표시.

  // 역할/표시 필터 (페이지 내 컨트롤)
  const roles: Array<[string, string]> = [["all", "전체"], ["Tank", "탱커"], ["DPS", "딜러"], ["Support", "서포터"]];
  const filterBar = `<div class="metabar">
    <span class="flabel">역할</span><div class="seg">${roles.map(([id, lb]) => `<button class="${f.role === id ? "on" : ""}" data-act="ban-role" data-val="${id}">${lb}</button>`).join("")}</div>
    <span class="flabel">표시</span><select data-act="ban-topn">${[[12, "상위 12"], [24, "상위 24"], [0, "전체"]].map(([v, lb]) => `<option value="${v}" ${f.topN === v ? "selected" : ""}>${lb}</option>`).join("")}</select>
  </div>`;

  // 팀별 밴 성향 (맵 필터 + 펼침 + 라인업)
  const cur = f.team && D.teamNames.includes(f.team) ? f.team : D.us;
  const teamSel = `<select data-act="ban-team">${D.teamNames.map((n) => `<option ${n === cur ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  const banMap = f.banMap || "all";
  const maps = [...new Set(D.sets.map((s) => s.map).filter(Boolean))].sort();
  const mapSel = `<select data-act="ban-map"><option value="all" ${banMap === "all" ? "selected" : ""}>전체 맵</option>${maps.map((m) => `<option value="${esc(m)}" ${m === banMap ? "selected" : ""}>${esc(mapKo(m))}</option>`).join("")}</select>`;
  let agg = teamBanDetail(D, cur, banMap).filter((h) => roleOk(h.hero, f.role));
  if (f.topN > 0) agg = agg.slice(0, f.topN);
  const banTable = agg.length
    ? `<table class="bantable"><thead><tr><th>영웅</th><th class="num">선밴</th><th class="num">후밴</th><th class="num">합계</th><th></th></tr></thead><tbody>${agg.map((h) => {
        const open = f.banExpand === h.hero;
        const head = `<tr class="banrow ${open ? "open" : ""}" data-act="ban-expand" data-val="${esc(h.hero)}"><td class="hname">${heroChip(h.hero)}</td><td class="num">${h.first}</td><td class="num">${h.second}</td><td class="num"><b>${h.total}</b></td><td class="num caret">${open ? "▾" : "▸"}</td></tr>`;
        if (!open) return head;
        const mapDist = Object.entries(h.maps).sort((a, b) => b[1] - a[1]).map(([m, n]) => `<span class="utag">${mk(m)} <span class="mini">${n}</span></span>`).join("");
        const sets = h.sets.slice().reverse().map((s) => `<div class="banset"><div class="bs-head"><span class="mini">${fmtDate(s.date)}</span> <b>${mk(s.map)}</b> <span class="rtag ${HERO_ROLE[h.hero] || ""}">${s.phase === "first" ? "선밴" : "후밴"}</span>${s.replay ? ` <span class="repcode">${esc(s.replay)}</span><button class="copyb" data-act="copy" data-val="${esc(s.replay)}">복사</button>` : ""}</div>${banLineup(cur, s.self, cur === D.us)}${banLineup(s.oppName, s.opp, s.oppName === D.us)}</div>`).join("");
        return `${head}<tr class="bandetail"><td colspan="5"><div class="sub-note">맵별 분포</div><div class="utags" style="margin-bottom:10px">${mapDist || nod("맵 기록 없음")}</div><div class="sub-note">밴이 나온 경기 · 라인업(선픽, 없으면 미기록)</div><div class="bansets">${sets}</div></td></tr>`;
      }).join("")}</tbody></table>`
    : nod("이 팀의 밴 기록이 없음.");

  const modeBlocks = modeBanBlocks(D, banByMapH, f.role);

  return `
    ${filterBar}
    <div class="panel"><h2>모드별 밴 분포 <span class="count">모드 안 각 맵별 · 상위 5</span></h2><div class="modebans">${modeBlocks || nod()}</div></div>`;
}

// ===== MAPS (5.4) =====
// ZANSIDE 데이터 → 맵 분석: 모드별 ZANSIDE vs 리그
export function renderZansideMaps(D: DataBundle): string {
  const Z = D.teams[D.us];
  const leagueMode: Record<string, { t: number }> = {};
  Object.values(D.teams).forEach((t) => Object.entries(t.modes).forEach(([m, d]) => ((leagueMode[m] = leagueMode[m] || { t: 0 }).t += d.t)));
  const modeBody = MODE_ORDER.map((m) => {
    const d = Z && Z.modes[m];
    const wr = d && d.t ? Math.round((d.w / d.t) * 100) : -1;
    const lg = leagueMode[m] ? Math.round(leagueMode[m].t / 2) : 0;
    return `<tr><td class="hname">${esc(MODE_KO[m] || m)}</td><td class="num">${d ? `${d.w}-${d.t - d.w}` : '<span class="mini">-</span>'}</td><td class="num">${wr < 0 ? '<span class="mini">-</span>' : `<span class="wr ${wrCls(wr)}">${wr}%</span> <span class="mini">(${d!.t})</span>`}</td><td class="num mini">${lg}</td></tr>`;
  }).join("");
  return `<div class="panel"><h2>모드별 — ZANSIDE vs 리그 <span class="count">맵 단위 승률 · 괄호는 표본(맵 수)</span></h2>
    <table><thead><tr><th>모드</th><th class="num">우리 전적</th><th class="num">우리 승률</th><th class="num">리그 평균 맵수</th></tr></thead><tbody>${modeBody}</tbody></table></div>`;
}

// ===== 맵 분석 (맵 선택 → 픽/밴 팀 + 팀·선수별 승률) — 영웅 분석과 동일 구조 =====
export interface MapsUI { mode: string; map: string; }
export function renderMaps(D: DataBundle, ui: MapsUI): string {
  setIcons(D.heroIcons);
  const modes = MODE_ORDER.filter((m) => D.sets.some((s) => s.mode === m));
  const allMaps = [...new Set(D.sets.map((s) => s.map).filter(Boolean))];
  const modeSel = `<select data-act="mapsmode"><option value="all" ${ui.mode === "all" ? "selected" : ""}>전체</option>${modes.map((m) => `<option value="${m}" ${ui.mode === m ? "selected" : ""}>${esc(MODE_KO[m] || m)}</option>`).join("")}</select>`;
  const pool = allMaps.filter((m) => ui.mode === "all" || D.mapInfo[m] === ui.mode).sort((a, b) => mapKo(a).localeCompare(mapKo(b)));
  if (ui.map && !pool.includes(ui.map)) pool.unshift(ui.map);
  const mapSel = `<select data-act="maps-sel"><option value="" ${!ui.map ? "selected" : ""}>— 맵 —</option>${pool.map((m) => `<option value="${esc(m)}" ${m === ui.map ? "selected" : ""}>${esc(mapKo(m))}</option>`).join("")}</select>`;
  const selector = `<div class="psel"><label class="estfield"><span class="estlabel">모드</span>${modeSel}</label><label class="estfield"><span class="estlabel">맵</span>${mapSel}</label></div>`;

  let detail: string;
  if (!ui.map) {
    // 맵 선택 전: 모드별 밴 분포 (OWCS 기타 탭에서 이전)
    const banByMapH: Record<string, Record<string, number>> = {};
    D.sets.forEach((s) => s.bans.forEach((b) => { if (b.hero && s.map) (banByMapH[s.map] = banByMapH[s.map] || {})[b.hero] = ((banByMapH[s.map] || {})[b.hero] || 0) + 1; }));
    detail = `<div class="panel"><h2>모드별 밴 분포 <span class="count">모드 안 각 맵별 · 상위 5</span></h2><div class="modebans">${modeBanBlocks(D, banByMapH, "all")}</div></div>`;
  } else {
    const M = ui.map;
    const mapSets = D.sets.filter((s) => s.map === M);
    const pickCnt: Record<string, number> = {};
    const banCnt: Record<string, number> = {};
    mapSets.forEach((s) => {
      if (s.picker && s.picker !== "ADMIN") pickCnt[s.picker] = (pickCnt[s.picker] || 0) + 1;
      s.bans.forEach((b) => { if (b.team) banCnt[b.team] = (banCnt[b.team] || 0) + 1; });
    });
    const teamLabel = (t: string) => `<span class="${t === D.us ? "zan" : ""}">${esc(t)}</span>`;
    const teamWr = D.teamNames.map((t) => { const r = D.teams[t]?.maps[M]; return r ? { t, w: r.w, l: r.l, n: r.w + r.l } : null; }).filter((x): x is { t: string; w: number; l: number; n: number } => !!x && x.n > 0).sort((a, b) => b.n - a.n);
    const teamTable = teamWr.length
      ? `<table class="hbtable"><thead><tr><th>팀</th><th class="num">승-패</th><th class="num">승률</th><th class="num">맵</th></tr></thead><tbody>${teamWr.map((r) => { const wr = r.n ? Math.round((r.w / r.n) * 100) : 0; return `<tr class="${r.t === D.us ? "zanrow" : ""}"><td class="${r.t === D.us ? "zan" : ""}">${esc(r.t)}</td><td class="num">${r.w}-${r.l}</td><td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span></td><td class="num">${r.n}</td></tr>`; }).join("")}</tbody></table>`
      : nod("기록 없음");
    const plWr = D.playerNames.map((p) => { const P = D.players[p]; const r = P?.maps[M]; return r && r.n ? { p, team: P.team, w: r.w, n: r.n } : null; }).filter((x): x is { p: string; team: string; w: number; n: number } => !!x).sort((a, b) => b.n - a.n).slice(0, 15);
    const plTable = plWr.length
      ? `<table class="hbtable"><thead><tr><th>선수</th><th>팀</th><th class="num">승-패</th><th class="num">승률</th></tr></thead><tbody>${plWr.map((r) => { const wr = r.n ? Math.round((r.w / r.n) * 100) : 0; return `<tr class="${r.team === D.us ? "zanrow" : ""}"><td class="${r.team === D.us ? "zan" : ""}">${esc(r.p)}</td><td class="mini">${esc(r.team)}</td><td class="num">${r.w}-${r.n - r.w}</td><td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span></td></tr>`; }).join("")}</tbody></table>`
      : nod("기록 없음");
    detail = `
      <div class="panel hbsel"><div class="hbsel-head"><div><div class="hbsel-name">${esc(mapKo(M))} <span class="mini">${esc(MODE_KO[D.mapInfo[M]] || D.mapInfo[M] || "")}</span></div><div class="mini">${mapSets.length}경기</div></div></div></div>
      <div class="grid2">
        <div class="panel"><h2>자주 픽하는 팀 <span class="count">맵 선택권 기준</span></h2><div class="bars">${rankBars(pickCnt, teamLabel)}</div></div>
        <div class="panel"><h2>자주 밴하는 팀 <span class="count">이 맵 경기의 영웅 밴 횟수</span></h2><div class="bars">${rankBars(banCnt, teamLabel)}</div></div>
      </div>
      <div class="grid2">
        <div class="panel"><h2>팀별 맵 승률</h2>${teamTable}</div>
        <div class="panel"><h2>선수별 맵 승률 <span class="count">상위 15</span></h2>${plTable}</div>
      </div>`;
  }
  return `
    <div class="panel"><h2>맵 선택</h2>
      <div class="sub-note">모드 → 맵 순으로 선택. 맵을 고르면 픽/밴 팀과 팀·선수별 승률 표시.</div>
      ${selector}</div>
    ${detail}`;
}

// ===== LOG (5.5) =====
export interface LogFilter {
  z: "all" | "us";
  team: string;
  mode: string;
  map: string;
  date: string;
}
function scoreStr(s: SetRec): string {
  const w = setWinner(s);
  if (!w) return '<span class="mini">-</span>';
  const wIsTop = w === s.top;
  const fmt = (sc: SetRec["ws"]) => (sc ? (sc.kind === "dist" ? sc.val.toFixed(1) + "m" : sc.val) : "·");
  const a = wIsTop ? fmt(s.ws) : fmt(s.ls);
  const b = wIsTop ? fmt(s.ls) : fmt(s.ws);
  return `<span class="${wIsTop ? "wr hi" : ""}">${a}</span><span class="mini"> - </span><span class="${!wIsTop ? "wr hi" : ""}">${b}</span>`;
}
// ===== 세트 상세 + 시뮬레이션 불러오기 공용 헬퍼 =====
// 한 세트를 가리키는 안정 키 (날짜+경기+맵)
const setKey = (s: SetRec) => `${s.date}|${s.match}|${s.map}`;
export function findSetByKey(D: DataBundle, key: string): SetRec | null {
  return D.sets.find((s) => setKey(s) === key) || null;
}
// 첫픽(오프닝)을 자리(딜러1·딜러2·탱커·서포터1·서포터2)로 변환
function picksToSlots(picks: Pick[]): { players: string[]; heroes: string[] } {
  const dps = picks.filter((p) => p.role === "DPS");
  const tank = picks.filter((p) => p.role === "Tank");
  const sup = picks.filter((p) => p.role === "Support");
  const players = ["", "", "", "", ""], heroes = ["", "", "", "", ""];
  const put = (i: number, p?: Pick) => { if (p) { players[i] = p.player; heroes[i] = p.hero; } };
  put(0, dps[0]); put(1, dps[1]); put(2, tank[0]); put(3, sup[0]); put(4, sup[1]);
  return { players, heroes };
}
// 라인업 한 팀 (오프닝 기준). 첫픽 없으면 "라인업 미기록".
function lineupDetail(name: string, picks: Pick[], zan: boolean): string {
  if (!picks.length) return `<div class="lineup"><span class="lu-team ${zan ? "zan" : ""}">${esc(name)}</span> <span class="mini">라인업 미기록</span></div>`;
  const order: Record<string, number> = { Tank: 0, DPS: 1, Support: 2 };
  const sorted = picks.slice().sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
  return `<div class="lineup"><span class="lu-team ${zan ? "zan" : ""}">${esc(name)}</span>${sorted.map((p) => `<span class="lu-p">${heroIcon(p.hero || "")}<span>${playerLink(p.player)}${p.hero ? ` <span class="mini">${esc(heroKo(p.hero))}</span>` : ""}</span></span>`).join("")}</div>`;
}
// 세트 상세: 맵 선택팀·모드·맵·선밴/후밴·양 팀 라인업·스코어·리플레이.
// (경기 중 영웅 교체는 시트에 없어 표시하지 않음 — 데이터가 생기면 별도 블록으로 추가)
// 경기 기록 페이지용: 경기 중 교체 영웅 체인 (팀명 선수명: 첫영웅 → 교체1 → 교체2)
function renderSwapChains(s: SetRec): string {
  const swaps = swapsByPlayer(s.memo);
  const rows: string[] = [];
  ([[s.top, s.picks.top], [s.bottom, s.picks.bottom]] as Array<[string, Pick[]]>).forEach(([team, picks]) => {
    picks.forEach((p) => {
      const sw = swaps[p.player];
      if (!sw || !sw.length) return;
      const chain = [p.hero, ...sw].filter(Boolean); // 첫 영웅(오프닝) + 교체들
      const chainHtml = chain.map((h, i) => `${i ? `<span class="sc-arrow">→</span>` : ""}<span class="sc-hero">${heroIcon(h)}<span>${esc(heroKo(h))}</span></span>`).join("");
      rows.push(`<div class="swapchain"><span class="sc-team">${esc(team)}</span> <span class="sc-player">${playerLink(p.player)}</span><span class="sc-colon">:</span> ${chainHtml}</div>`);
    });
  });
  return rows.length ? rows.join("") : nod("교체 기록 없음");
}
function setDetail(D: DataBundle, s: SetRec): string {
  const w = setWinner(s);
  const picker = s.picker ? esc(s.picker) : "공란/불명";
  const fb = s.bans.find((b) => b.phase === "first");
  const sb = s.bans.find((b) => b.phase === "second");
  const banLine = (b: typeof fb, label: string) => b
    ? `<span class="bd-ban"><span class="mini">${label}</span> <b>${esc(b.team)}</b> 밴 ${heroChip(b.hero)}</span>`
    : `<span class="bd-ban"><span class="mini">${label}</span> <span class="mini">기록 없음</span></span>`;

  const statsBlock = gameStatsBlock(D, s);

  return `<div class="setdetail">
    <div class="bd-meta">
      <span><span class="mini">맵</span> <b>${mk(s.map)}</b> · ${esc(MODE_KO[s.mode] || s.mode)}</span>
      <span><span class="mini">맵 선택</span> ${picker}</span>
      <span><span class="mini">스코어</span> ${scoreStr(s)}${w ? ` · <b>${esc(w)} 승</b>` : ""}</span>
      ${s.replay ? `<span><span class="mini">리플레이</span> <span class="repcode">${esc(s.replay)}</span> <button class="copyb" data-act="copy" data-val="${esc(s.replay)}">복사</button></span>` : ""}
    </div>
    <div class="bd-bans">${banLine(fb, "선밴")}${banLine(sb, "후밴")}</div>
    <div class="sub-note" style="margin:10px 0 4px">출전 라인업 <span class="mini">첫픽(오프닝) 기준</span></div>
    <div class="bd-lineups">${lineupDetail(s.top, s.picks.top, s.top === D.us)}${lineupDetail(s.bottom, s.picks.bottom, s.bottom === D.us)}</div>
    ${s.memo ? `<div class="sub-note" style="margin:10px 0 4px">경기 중 교체 영웅</div><div class="swapchains">${renderSwapChains(s)}</div>` : ""}
    ${statsBlock}
    <div style="margin-top:10px"><button class="loadbtn" data-act="load-sim" data-val="${esc(setKey(s))}">이 경기로 시뮬레이션 채우기 ↗</button></div>
  </div>`;
}
// 메모에서 선수별 교체 영웅 추출. 형식: "선수: 영웅1, 영웅2" 또는 "선수 → 영웅1 → 영웅2" (줄/세미콜론 구분)
function swapsByPlayer(memo: string): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  if (!memo) return map;
  memo.split(/[\n;]+/).forEach((line) => {
    const t = line.trim();
    if (!t) return;
    let name = "", rest = "";
    const colon = t.split(/[:：]/);
    if (colon.length >= 2) { name = colon[0].trim(); rest = colon.slice(1).join(":"); }
    else { const arr = t.split(/→|->/); if (arr.length >= 2) { name = arr[0].trim(); rest = arr.slice(1).join("→"); } }
    if (!name) return;
    const heroes = rest.split(/[,，]|→|->/).map((x) => x.trim()).filter(Boolean);
    if (heroes.length) map[name] = heroes;
  });
  return map;
}
// 세트 → 시뮬레이션 입력. ZANSIDE가 있으면 ZANSIDE를 우리 쪽으로,
// 아니면(리그 타팀 경기·상대 정찰) 상단 팀을 우리 슬롯에 넣어 매치업 인스펙터로 사용.
export function setToEstInput(D: DataBundle, key: string): EstInput | null {
  const s = findSetByKey(D, key);
  if (!s) return null;
  const usTop = s.bottom === D.us ? false : true; // ZANSIDE가 bottom이면 bottom, 그 외엔 top을 우리 쪽
  const usSide = usTop ? s.picks.top : s.picks.bottom;
  const opSide = usTop ? s.picks.bottom : s.picks.top;
  const oppName = usTop ? s.bottom : s.top;
  const us = picksToSlots(usSide);
  const op = picksToSlots(opSide);
  return { map: s.map, usPlayers: us.players, usHeroes: us.heroes, oppTeam: oppName, oppPlayers: op.players, oppHeroes: op.heroes, srcKey: key };
}
// ZANSIDE 쪽만 불러오기 (그 경기에서 ZANSIDE 라인업)
export function setToEstUs(D: DataBundle, key: string): Partial<EstInput> | null {
  const s = findSetByKey(D, key);
  if (!s) return null;
  const usSide = s.top === D.us ? s.picks.top : s.bottom === D.us ? s.picks.bottom : null;
  if (!usSide) return null;
  const slots = picksToSlots(usSide);
  return { map: s.map, usPlayers: slots.players, usHeroes: slots.heroes, srcKey: key };
}
// 상대 쪽만 불러오기 (그 경기에서 ZANSIDE 상대 라인업)
export function setToEstOpp(D: DataBundle, key: string): Partial<EstInput> | null {
  const s = findSetByKey(D, key);
  if (!s) return null;
  const usTop = s.top === D.us;
  const oppSide = usTop ? s.picks.bottom : s.bottom === D.us ? s.picks.top : null;
  if (!oppSide) return null;
  const oppName = usTop ? s.bottom : s.top;
  const slots = picksToSlots(oppSide);
  return { map: s.map, oppTeam: oppName, oppPlayers: slots.players, oppHeroes: slots.heroes, srcKey: key };
}
// 특정 팀의 라인업을 그 팀 경기에서 불러오기 (상대 쪽 슬롯 채움 — ZANSIDE전 아니어도 됨)
export function setToEstOppTeam(D: DataBundle, key: string, team: string): Partial<EstInput> | null {
  const s = findSetByKey(D, key);
  if (!s || !team) return null;
  const side = s.top === team ? s.picks.top : s.bottom === team ? s.picks.bottom : null;
  if (!side) return null;
  const slots = picksToSlots(side);
  return { map: s.map, oppTeam: team, oppPlayers: slots.players, oppHeroes: slots.heroes, srcKey: "" };
}
// 백테스트: 과거 ZANSIDE 경기에 대해 모델 예측 vs 실제
function backtestUs(D: DataBundle) {
  const games = D.sets.filter((s) => (s.top === D.us || s.bottom === D.us) && s.winner);
  const items: Array<{ key: string; date: string; opp: string; pct: number; won: boolean; hit: boolean }> = [];
  games.forEach((s) => {
    const key = setKey(s);
    const u = setToEstUs(D, key);
    const o = setToEstOpp(D, key);
    if (!u || !o) return;
    const e: EstInput = { map: u.map!, usPlayers: u.usPlayers!, usHeroes: u.usHeroes!, oppTeam: o.oppTeam!, oppPlayers: o.oppPlayers!, oppHeroes: o.oppHeroes!, srcKey: "" };
    const est = h2hEstimate(D, e);
    if (est.pct == null) return;
    const won = s.winner === D.us;
    const hit = est.pct > 50 === won;
    items.push({ key, date: s.date, opp: s.top === D.us ? s.bottom : s.top, pct: est.pct, won, hit });
  });
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  const n = items.length;
  const hits = items.filter((i) => i.hit).length;
  const brier = n ? items.reduce((a, i) => a + Math.pow(i.pct / 100 - (i.won ? 1 : 0), 2), 0) / n : 0;
  return { n, hits, brier, items };
}

export function renderLog(D: DataBundle, f: LogFilter, logExpand: string[], logSort: string): string {
  const opt = (val: string, label: string, sel: string) =>
    `<option value="${esc(val)}" ${val === sel ? "selected" : ""}>${esc(label)}</option>`;
  const teamSel = `<select data-act="logteam"><option value="" ${!f.team ? "selected" : ""}>팀 전체</option>${D.teamNames.map((n) => opt(n, n, f.team)).join("")}</select>`;
  const modes = MODE_ORDER.filter((m) => D.sets.some((s) => s.mode === m));
  const modeSel = `<select data-act="logmode"><option value="" ${!f.mode ? "selected" : ""}>모드 전체</option>${modes.map((m) => opt(m, MODE_KO[m] || m, f.mode)).join("")}</select>`;
  const maps = [...new Set(D.sets.map((s) => s.map).filter(Boolean))].sort();
  const mapSel = `<select data-act="logmap"><option value="" ${!f.map ? "selected" : ""}>맵 전체</option>${maps.map((m) => `<option value="${esc(m)}" ${m === f.map ? "selected" : ""}>${esc(mapKo(m))}</option>`).join("")}</select>`;
  const dates = [...new Set(D.sets.map((s) => s.date))].sort();
  const dateSel = `<select data-act="logdate"><option value="" ${!f.date ? "selected" : ""}>날짜 전체</option>${dates.map((d) => opt(d, fmtDate(d), f.date)).join("")}</select>`;
  const sortSel = `<select data-act="logsort"><option value="new" ${logSort !== "old" ? "selected" : ""}>최신순</option><option value="old" ${logSort === "old" ? "selected" : ""}>오래된순</option></select>`;

  let arr = D.sets.filter((s) => {
    if (f.z === "us" && s.top !== D.us && s.bottom !== D.us) return false;
    if (f.team && s.top !== f.team && s.bottom !== f.team) return false;
    if (f.mode && s.mode !== f.mode) return false;
    if (f.map && s.map !== f.map) return false;
    if (f.date && s.date !== f.date) return false;
    return true;
  }).slice();
  if (logSort !== "old") arr = arr.reverse(); // 최신순(기본)

  const fmtSc = (sc: SetRec["ws"]) => (sc ? (sc.kind === "dist" ? Math.round(sc.val) + "m" : String(sc.val)) : "·");
  const rows = arr.length ? arr.map((s) => {
    const w = setWinner(s);
    const open = logExpand.includes(setKey(s));
    const picker = s.picker ? esc(s.picker) : "—";
    const topSc = w === s.top ? fmtSc(s.ws) : fmtSc(s.ls);
    const botSc = w === s.top ? fmtSc(s.ls) : fmtSc(s.ws);
    const winCell = w ? `<span class="${w === D.us ? "zan" : ""}">${esc(w)}</span>` : '<span class="mini">미정</span>';
    const rep = s.replay ? `<span class="repcode">${esc(s.replay)}</span><button class="copyb copyicon" data-act="copy" data-val="${esc(s.replay)}" title="복사"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>` : '<span class="mini">-</span>';
    const row = `<tr class="logrow ${open ? "open" : ""}" data-act="log-expand" data-val="${esc(setKey(s))}">
      <td class="mini">${fmtDate(s.date)}</td>
      <td>${teamLink(s.top, s.top === D.us)}</td>
      <td>${teamLink(s.bottom, s.bottom === D.us)}</td>
      <td class="mini">${picker}</td>
      <td class="mini">${esc(MODE_KO[s.mode] || s.mode)}</td>
      <td>${mapLink(s.map)}</td>
      <td class="num mono">${topSc}-${botSc}</td>
      <td>${winCell}</td>
      <td>${rep}</td>
      <td class="num caret">${open ? "▾" : "▸"}</td>
    </tr>`;
    return open ? row + `<tr class="logdetailrow"><td colspan="10">${setDetail(D, s)}</td></tr>` : row;
  }).join("") : `<tr><td colspan="10">${nod("필터에 해당하는 경기가 없음.")}</td></tr>`;

  return `
    <div class="fbar">
      <span class="flabel">ZANSIDE전</span>
      <div class="seg"><button class="${f.z === "all" ? "on" : ""}" data-act="logz" data-val="all">전체</button><button class="${f.z === "us" ? "on" : ""}" data-act="logz" data-val="us">우리 경기만</button></div>
      <span class="flabel">팀</span>${teamSel}
      <span class="flabel">모드</span>${modeSel}
      <span class="flabel">맵</span>${mapSel}
      <span class="flabel">날짜</span>${dateSel}
      <span class="flabel">정렬</span>${sortSel}
    </div>
    <div class="panel">
      <h2>경기 기록 <span class="count">${arr.length}세트 · 행을 누르면 상세</span></h2>
      <table class="logtable">
        <thead><tr><th>날짜</th><th>상수팀</th><th>하수팀</th><th>맵 픽</th><th>모드</th><th>맵</th><th class="num">스코어</th><th>승리팀</th><th>리플레이</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ===== SCENARIO (5.6) =====
function simulate(D: DataBundle, rem: typeof D.schedule, zN: number): string {
  if (!rem.length || rem.length > 14) return nod("시뮬레이션할 잔여 경기가 없습니다.");
  const base: Record<string, number> = {};
  D.standings.forEach((s) => (base[s.team] = s.win));
  const N = rem.length;
  const total = 1 << N;
  const byK: Record<number, { best: number; worst: number }> = {};
  for (let mask = 0; mask < total; mask++) {
    const wins: Record<string, number> = { ...base };
    let zWins = 0;
    for (let i = 0; i < N; i++) {
      const g = rem[i];
      const aWon = (mask >> i) & 1;
      const winner = aWon ? g.a : g.b;
      if (wins[winner] != null) wins[winner]++;
      if ((g.a === D.us || g.b === D.us) && winner === D.us) zWins++;
    }
    const z = wins[D.us];
    let better = 0, sameOrBetter = 0;
    for (const t in wins) {
      if (t === D.us) continue;
      if (wins[t] > z) better++;
      if (wins[t] >= z) sameOrBetter++;
    }
    const best = better + 1, worst = sameOrBetter + 1;
    const k = (byK[zWins] = byK[zWins] || { best: 99, worst: 0 });
    k.best = Math.min(k.best, best);
    k.worst = Math.max(k.worst, worst);
  }
  const st = standOf(D, D.us);
  const rows: string[] = [];
  for (let k = zN; k >= 0; k--) {
    const r = byK[k];
    if (!r) continue;
    const fw = (st ? st.win : 0) + k;
    const fl = (st ? st.lose : 0) + (zN - k);
    rows.push(`<div class="scrow"><span class="kk">${k}승</span>
      <span class="rec">최종 ${fw}승 ${fl}패</span>
      <span class="rng">${r.best === r.worst ? `${r.best}위` : `${r.best}위 ~ ${r.worst}위`}</span></div>`);
  }
  return rows.join("") || nod("계산 불가");
}
export function renderScenario(D: DataBundle): string {
  const rem = D.schedule.filter((g) => g.status === "upcoming" && !g.tbd && g.phase === "regular");
  const zGames = rem.filter((g) => g.a === D.us || g.b === D.us);

  const remain = zGames.length
    ? zGames.map((g) => {
        const opp = g.a === D.us ? g.b : g.a;
        const sr = standOf(D, opp);
        return `<div class="game"><span class="dt">${esc(g.date)}</span>
          <span class="tA zan">${D.us}</span><span class="sc"><span class="ll">vs</span></span>
          <span class="tB winner">${esc(opp)} <span class="mini">${sr ? tieRank(D, sr) : ""}</span></span></div>`;
      }).join("")
    : nod("정규시즌 잔여 경기 없음");

  const stRows = D.standings.map((s) =>
    `<tr class="${s.team === D.us ? "zanrow" : ""}"><td class="rk ${s.rank <= 3 ? "top" : ""}">${s.rank}</td>
      <td class="tname">${teamLink(s.team, s.team === D.us)}</td>
      <td class="num"><span class="wr hi">${s.win}</span></td><td class="num mini">${s.lose}</td>
      <td class="num wr ${s.diff > 0 ? "hi" : s.diff < 0 ? "lo" : "mid"}">${s.diff > 0 ? "+" : ""}${s.diff}</td></tr>`
  ).join("");

  return `
    <div class="panel">
      <h2>잔여 정규시즌 일정 (ZANSIDE)</h2>
      <div class="sched">${remain}</div>
    </div>
    <div class="panel">
      <h2>가능 순위 시나리오 <span class="count">잔여 ${rem.length}경기 · ${Math.pow(2, rem.length)}가지</span></h2>
      <div class="sub-note">잔여 정규시즌 전 경기 결과를 모두 시뮬레이션해, 우리 승수별 최종 순위 범위를 계산. 동률·맵 득실 변수로 범위가 발생합니다.</div>
      <div class="scn">${simulate(D, rem, zGames.length)}</div>
    </div>
    <div class="panel">
      <h2>현재 순위표 <span class="count">${D.standings.length}팀</span></h2>
      <table>
        <thead><tr><th class="rk">#</th><th>팀</th><th class="num">매치 승</th><th class="num">매치 패</th><th class="num">맵 득실</th></tr></thead>
        <tbody>${stRows}</tbody>
      </table>
    </div>`;
}

// ===== PLAYERS (13) =====
export interface PlayerUI {
  playerA: string;
  playerB: string;
  search: string; // 고른 팀 안에서만 검색
  pickTeam: string; // 선수 선택용 팀
  pickTeamB: string; // 비교 대상 팀
  heroExpand: string; // 펼친 영웅 행
  heroMapSel: string; // 펼친 영웅 안에서 고른 맵 (오른쪽 상세)
  mapExpand: string; // 맵별 성적에서 펼친 맵 (양 팀 조합)
}
function playerWR(hs: { n: number; w: number }) {
  return hs.n ? Math.round((hs.w / hs.n) * 100) : 0;
}
const repRole = (roles: Record<string, number>) => {
  const e = Object.entries(roles).sort((a, b) => b[1] - a[1])[0];
  return e ? e[0] : "";
};
// 주 영웅: 승률 높은 순(동률은 출전 수)
const topHero = (p: Player) => Object.values(p.heroes).filter((h) => h.n >= 1).sort((a, b) => playerWR(b) - playerWR(a) || b.n - a.n)[0];
function strongMaps(p: Player, k: number) {
  return Object.values(p.maps)
    .filter((m) => m.n >= 1)
    .map((m) => ({ ...m, wr: Math.round((m.w / m.n) * 100) }))
    .sort((a, b) => b.wr - a.wr)
    .slice(0, k);
}

// 팀 드롭다운 → 그 팀 선수 드롭다운 두 개. 옵션에 출전 맵 수·저표본(⚠) 유지.
function playerSelect2(D: DataBundle, opts: { pickTeam: string; selName: string; teamAct: string; playerAct: string; exclude?: string }): string {
  const teams = D.teamNames;
  const cur = opts.pickTeam && teams.includes(opts.pickTeam) ? opts.pickTeam : teams[0] || "";
  const players = D.playerNames.map((n) => D.players[n]).filter((p) => p.team === cur && p.name !== opts.exclude).sort((a, b) => b.n - a.n);
  const teamOpts = teams.map((t) => `<option value="${esc(t)}" ${t === cur ? "selected" : ""}>${esc(t)}${t === D.us ? " · 우리 팀" : ""}</option>`).join("");
  const playerOpts = `<option value="" ${!opts.selName ? "selected" : ""}>— 선수 —</option>` +
    players.map((p) => `<option value="${esc(p.name)}" ${p.name === opts.selName ? "selected" : ""}>${esc(p.name)} · ${p.n}맵</option>`).join("");
  return `<div class="psel">
    <label class="estfield"><span class="estlabel">팀</span><select data-act="${opts.teamAct}">${teamOpts}</select></label>
    <label class="estfield"><span class="estlabel">선수</span><select data-act="${opts.playerAct}">${playerOpts}</select></label>
  </div>`;
}

function playerCard(D: DataBundle, p: Player): string {
  const th = topHero(p);
  const sm = strongMaps(p, 3);
  return `<div class="pcard">
    <div class="pc-name">${esc(p.name)}</div>
    <div class="pc-meta">${esc(ROLE_KO[repRole(p.roles)] || repRole(p.roles))} · <span class="${p.team === D.us ? "zan" : ""}">${esc(p.team)}</span></div>
    <div class="pc-tags"><span class="pc-lab">주 영웅</span> <span class="pc-val">${th ? heroChip(th.hero) : "—"}</span> &nbsp;&nbsp; <span class="pc-lab">강점 맵</span> <span class="pc-val">${sm.length ? sm.map((m) => esc(mapKo(m.map))).join(", ") : "—"}</span></div>
  </div>`;
}

// 영웅 행 펼침: 왼쪽 맵 목록(클릭) → 오른쪽 그 맵 상세 (마스터-디테일)
function heroDetail(D: DataBundle, p: Player, hero: string, selMap: string): string {
  const cells = Object.values(p.cells).filter((c) => c.hero === hero).sort((a, b) => b.n - a.n);
  const left = cells.length
    ? cells.map((c) => {
        const wr = c.n ? Math.round((c.w / c.n) * 100) : 0;
        const low = c.n === 1;
        const on = c.map === selMap;
        return `<button class="hd-mapbtn ${on ? "on" : ""}" data-act="heromap-sel" data-val="${esc(c.map)}"><span class="hd-mapn">${mk(c.map)}</span><span class="mini">${c.w}-${c.n - c.w}</span><span class="wr ${wrCls(wr)}">${wr}%</span></button>`;
      }).join("")
    : nod("맵 기록이 없음.");

  let right: string;
  if (!selMap || !cells.some((c) => c.map === selMap)) {
    right = `<div class="hd-empty">${nod("왼쪽에서 맵을 누르면 그 맵의 경기가 여기 떠요.")}</div>`;
  } else {
    const fmtSc = (sc: SetRec["ws"]) => (sc ? (sc.kind === "dist" ? Math.round(sc.val) + "m" : String(sc.val)) : "·");
    const comps: Array<{ date: string; map: string; opp: string; score: string; won: boolean; line: { player: string; hero: string }[] }> = [];
    D.sets.forEach((s) => {
      if (s.map !== selMap) return;
      const side = s.top === p.team ? s.picks.top : s.bottom === p.team ? s.picks.bottom : null;
      if (!side) return;
      const me = side.find((x) => x.player === p.name && x.hero === hero);
      if (!me) return;
      const mates = side.filter((x) => x !== me && (x.player || x.hero));
      const won = setWinner(s) === p.team;
      comps.push({ date: s.date, map: s.map, opp: s.top === p.team ? s.bottom : s.top, score: `${fmtSc(won ? s.ws : s.ls)}-${fmtSc(won ? s.ls : s.ws)}`, won, line: [{ player: p.name, hero }, ...mates] });
    });
    comps.sort((a, b) => (a.date < b.date ? 1 : -1));
    right = comps.length
      ? comps.map((c) => {
          const line = c.line.map((m) => `<span class="lu-p">${heroIcon(m.hero || "")}<span>${playerLink(m.player)}</span></span>`).join("");
          return `<div class="hd-comp ${c.won ? "w" : "l"}"><div class="hd-comp-head"><span class="mini">${fmtDate(c.date)}</span> <b>${mk(c.map)}</b> · 상대 ${esc(c.opp)} · <span class="mono">${c.score}</span> <span class="${c.won ? "ww" : "ll"}">${c.won ? "승" : "패"}</span></div><div class="hd-line">${line}</div></div>`;
        }).join("")
      : nod("해당 맵 경기가 없음.");
  }

  return `<div class="herodetail-inner">
    <div class="hd-col hd-maps">${left}</div>
    <div class="hd-col"><div class="hd-comps">${right}</div></div>
  </div>`;
}
function heroTable(D: DataBundle, p: Player, heroExpand: string, heroMapSel: string): string {
  const heroes = Object.values(p.heroes).sort((a, b) => b.n - a.n);
  if (!heroes.length) return nod("아직 기록된 영웅이 없음. 선픽이 입력되면 채워져요.");
  const mx = Math.max(1, ...heroes.map((h) => h.n));
  return `<table class="herotable"><thead><tr><th>영웅</th><th class="num">사용</th><th class="num">승-패</th><th class="num">승률</th><th>빈도</th><th></th></tr></thead><tbody>${heroes.map((h) => {
    const wr = playerWR(h);
    const open = heroExpand === h.hero;
    const row = `<tr class="herorow ${open ? "open" : ""}" data-act="hero-expand" data-val="${esc(h.hero)}">
      <td class="hname">${heroChip(h.hero)}</td>
      <td class="num">${h.n}</td>
      <td class="num">${h.w}-${h.n - h.w}</td>
      <td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span></td>
      <td><div class="tr mini-tr"><div class="fl" style="width:${Math.round((h.n / mx) * 100)}%"></div></div></td>
      <td class="num caret">${open ? "▾" : "▸"}</td></tr>`;
    return open ? row + `<tr class="herodetail"><td colspan="6">${heroDetail(D, p, h.hero, heroMapSel)}</td></tr>` : row;
  }).join("")}</tbody></table>`;
}
// 영웅×맵 강점 히트맵 (13.3)
function heroMapHeatmap(p: Player): string {
  const cells = Object.values(p.cells);
  if (!cells.length) return nod("아직 기록이 없음. 선픽이 입력되면 채워져요.");
  const heroTot: Record<string, number> = {};
  const mapTot: Record<string, number> = {};
  cells.forEach((c) => {
    heroTot[c.hero] = (heroTot[c.hero] || 0) + c.n;
    mapTot[c.map] = (mapTot[c.map] || 0) + c.n;
  });
  const heroes = Object.entries(heroTot).sort((a, b) => b[1] - a[1]).slice(0, 8).map((x) => x[0]);
  const maps = Object.entries(mapTot).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  const cm: Record<string, Player["cells"][string]> = {};
  cells.forEach((c) => (cm[`${c.hero} ${c.map}`] = c));
  const head = `<tr><th class="hm-corner">영웅 \\ 맵</th>${maps.map((m) => `<th class="hm-mh" title="${esc(mapKo(m))}"><span class="mhn">${mk(m)}</span></th>`).join("")}</tr>`;
  const rows = heroes.map((h) => {
    const tds = maps.map((m) => {
      const c = cm[`${h} ${m}`];
      if (!c) return `<td class="hm empty">·</td>`;
      const wr = c.n ? Math.round((c.w / c.n) * 100) : 0;
      const cls = `hm-${wrCls(wr)}${c.n === 1 ? " hm-lowsmp" : ""}`;
      return `<td class="hm ${cls}" title="${esc(heroKo(h))} @ ${esc(mapKo(m))} — ${c.w}승 ${c.n - c.w}패">${`<span class="hm-wr">${wr}%</span>`}<span class="hm-n">${c.n}</span></td>`;
    }).join("");
    return `<tr><th class="hm-rh">${heroChip(h)}</th>${tds}</tr>`;
  }).join("");
  return `<div class="hm-wrap"><table class="heatmap"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
    <div class="sub-note" style="margin-top:8px">칸 = 승률%(3경기 이상일 때) · 작은 숫자는 경기 수. 색이 진할수록 승률이 높아요.</div>`;
}

/** 선수 분석(13) + 선수 비교(14). */
export function renderPlayers(D: DataBundle, ui: PlayerUI): string {
  setIcons(D.heroIcons);
  if (!D.playerNames.length) {
    return `<div class="panel"><h2>선수 분석</h2>${nod("아직 선수 기록이 없음.")}
      <div class="sub-note" style="margin-top:12px">시트의 <b>상수팀 첫픽 / 하수팀 첫픽</b> 칸(역할별 선수명·영웅)을 채우면 여기에 자동으로 나타나요.</div></div>`;
  }
  const all = D.playerNames.map((n) => D.players[n]);
  const a = D.players[ui.playerA] || all[0];
  const b = ui.playerB && ui.playerB !== a.name ? D.players[ui.playerB] : null;
  const pickTeam = ui.pickTeam && D.teamNames.includes(ui.pickTeam) ? ui.pickTeam : a.team;
  const pickTeamB = ui.pickTeamB && D.teamNames.includes(ui.pickTeamB) ? ui.pickTeamB : (b ? b.team : D.teamNames.find((t) => t !== a.team) || a.team);

  // 전체 선수 이름 검색 결과 (고르면 드롭다운이 그 선수에 맞춰짐)
  const q = ui.search.trim().toLowerCase();
  const results = q ? all.filter((p) => p.name.toLowerCase().includes(q)).sort((x, y) => y.n - x.n) : [];
  const searchResults = q
    ? `<div class="sub-note" style="margin-bottom:8px">'${esc(ui.search)}' 검색 결과 — 누르면 선택돼요</div>
       <div class="plchips" style="margin-bottom:14px">${results.length ? results.slice(0, 30).map((p) => `<button class="plchip ${p.name === a.name ? "on" : ""}" data-act="player" data-val="${esc(p.name)}">${esc(p.name)} <span class="mini">${esc(p.team)} · ${p.n}맵</span></button>`).join("") : nod(`'${esc(ui.search)}'에 맞는 선수가 없음.`)}</div>`
    : "";

  return `
    <div class="panel">
      <h2>선수 선택</h2>
      <div class="sub-note">맨 위 검색창은 전체 선수에서 이름으로 검색. 또는 아래에서 팀 → 선수 순으로 선택. 숫자는 출전 맵 수.</div>
      ${searchResults}
      ${playerSelect2(D, { pickTeam, selName: a.name, teamAct: "pick-team", playerAct: "pick-player" })}
    </div>
    <div class="panel">${playerCard(D, a)}</div>
    ${playerStatsPanel(D, a.name)}
    ${a.n > 0 ? `
    <div class="panel"><h2>① 영웅별 성적 <span class="count">영웅 단위 · 행을 누르면 맵별·조합별로 펼침</span></h2>${heroTable(D, a, ui.heroExpand, ui.heroMapSel)}</div>
    <div class="panel"><h2>② 맵별 성적 <span class="count">맵 단위 · 행을 누르면 그 맵의 양 팀 조합</span></h2>${mapTable(D, a, ui.mapExpand)}</div>
    <div class="panel"><h2>③ 영웅 × 맵 강점 <span class="count">어떤 영웅을 어떤 맵에서 잘하는지</span></h2>${heroMapHeatmap(a)}</div>` : `
    <div class="panel"><div class="datawait"><div class="dw-i">${esc(a.name)} — 아직 기록된 경기가 없음</div><div class="sub-note" style="margin:6px 0 0">이 선수의 선픽(오프닝) 기록이 시트에 입력되면 영웅별·맵별·영웅×맵 강점이 자동으로 채워져요.</div></div></div>`}
    <div class="panel">
      <h2>선수 비교 <span class="count">${b ? `${esc(a.name)} vs ${esc(b.name)}` : "팀과 선수를 고르면 좌우 비교"}</span></h2>
      ${b ? `<button class="clearbtn" data-act="compareclear" style="margin-bottom:12px">비교 닫기 ✕</button>` : ""}
      ${playerSelect2(D, { pickTeam: pickTeamB, selName: ui.playerB, teamAct: "comp-team", playerAct: "comp-player", exclude: a.name })}
    </div>
    ${b ? renderPlayerDiff(D, a, b) : ""}`;
}
// 맵별 성적 표 (영웅 구분 없이 맵 단위). 출전 수·승률·저표본 경고.
// 선수 맵별 성적 펼침: 그 맵의 경기별 양 팀 조합(영웅 + 교체 →)
function playerMapGames(D: DataBundle, p: Player, map: string): string {
  const inSet = (s: SetRec) => [...s.picks.top, ...s.picks.bottom].some((x) => x.player === p.name);
  const games = D.sets.filter((s) => s.map === map && inSet(s)).slice().reverse();
  if (!games.length) return nod("경기 기록 없음");
  const order: Record<string, number> = { Tank: 0, DPS: 1, Support: 2 };
  const compLine = (team: string, picks: Pick[], swaps: Record<string, string[]>, focus: boolean) =>
    `<div class="mg-team ${focus ? "mine" : ""}"><span class="mg-tn">${esc(team)}</span><div class="mg-ps">${picks.slice().sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9)).map((pk) => {
      const chain = [pk.hero, ...(swaps[pk.player] || [])].filter(Boolean);
      return `<span class="mg-p ${pk.player === p.name ? "me" : ""}"><span class="mg-pn">${playerLink(pk.player)}</span><span class="mg-chain">${chain.map((h, i) => `${i ? '<span class="mg-arr">→</span>' : ""}${heroIcon(h)}`).join("")}</span></span>`;
    }).join("")}</div></div>`;
  return games.map((s) => {
    const w = setWinner(s);
    const focusTop = s.picks.top.some((x) => x.player === p.name);
    const myWin = (focusTop ? s.top : s.bottom) === w;
    const swaps = swapsByPlayer(s.memo);
    const opp = focusTop ? s.bottom : s.top;
    return `<div class="mapgame"><div class="mg-head"><span class="${myWin ? "ww" : w ? "ll" : "mini"}">${myWin ? "승" : w ? "패" : "·"}</span> <span class="mini">${fmtDate(s.date)} · ${esc(s.match)}</span> <span class="mini">vs</span> <b>${esc(opp)}</b></div>
      ${compLine(s.top, s.picks.top, swaps, s.top === p.team)}
      ${compLine(s.bottom, s.picks.bottom, swaps, s.bottom === p.team)}</div>`;
  }).join("");
}
function mapTable(D: DataBundle, p: Player, mapExpand: string): string {
  const maps = Object.values(p.maps).sort((a, b) => b.n - a.n);
  if (!maps.length) return nod("아직 맵 기록이 없음.");
  const repsOf = (mapName: string) => Object.values(p.cells).filter((c) => c.map === mapName).sort((a, b) => b.n - a.n).slice(0, 4);
  return `<table class="maptable"><thead><tr><th>맵</th><th class="num">출전</th><th class="num">승-패</th><th class="num">승률</th><th>대표 영웅</th><th></th></tr></thead><tbody>${maps.map((m) => {
    const wr = m.n ? Math.round((m.w / m.n) * 100) : 0;
    const low = m.n === 1;
    const open = mapExpand === m.map;
    const reps = repsOf(m.map);
    const repHtml = reps.length ? reps.map((c) => `<span class="mrep" title="${esc(heroKo(c.hero))} ${c.n}회">${heroIcon(c.hero)}</span>`).join("") : '<span class="mini">-</span>';
    const row = `<tr class="maprow ${open ? "open" : ""}" data-act="map-expand" data-val="${esc(m.map)}">
      <td class="hname">${mk(m.map)}</td>
      <td class="num">${m.n}</td>
      <td class="num">${m.w}-${m.n - m.w}</td>
      <td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span></td>
      <td class="mapreps">${repHtml}</td>
      <td class="num caret">${open ? "▾" : "▸"}</td></tr>`;
    return open ? row + `<tr class="mapdetail"><td colspan="6"><div class="sub-note">이 맵 경기 · 양 팀 조합 (영웅 · 교체 →)</div><div class="mapgames">${playerMapGames(D, p, m.map)}</div></td></tr>` : row;
  }).join("")}</tbody></table>`;
}

// ===== PLAYER DIFF (14) =====
function renderPlayerDiff(D: DataBundle, a: Player, b: Player): string {
  const aHeroes = new Set(Object.keys(a.heroes));
  const bHeroes = new Set(Object.keys(b.heroes));
  const common = [...aHeroes].filter((h) => bHeroes.has(h)).sort((x, y) => (b.heroes[y].n + a.heroes[y].n) - (b.heroes[x].n + a.heroes[x].n));

  const head = `<div class="diff-head">
    <div class="diff-col"><div class="dn">${esc(a.name)}</div><div class="dm">${esc(ROLE_KO[repRole(a.roles)] || repRole(a.roles))} · <span class="${a.team === D.us ? "zan" : ""}">${esc(a.team)}</span> · ${a.n}세트</div></div>
    <div class="diff-vs">vs</div>
    <div class="diff-col right"><div class="dn">${esc(b.name)}</div><div class="dm">${esc(ROLE_KO[repRole(b.roles)] || repRole(b.roles))} · <span class="${b.team === D.us ? "zan" : ""}">${esc(b.team)}</span> · ${b.n}세트</div></div>
  </div>`;

  let commonBlock: string;
  if (!common.length) {
    commonBlock = nod("두 선수가 공통으로 다룬 영웅이 없습니다 — 비교할 공통 표본 부족.");
  } else {
    commonBlock = common.map((h) => {
      const ha = a.heroes[h], hb = b.heroes[h];
      const wa = playerWR(ha), wb = playerWR(hb);
      const small = ha.n === 1 || hb.n === 1;
      const gap = !small ? Math.abs(wa - wb) >= 20 : false;
      return `<div class="diffrow${gap ? " gap" : ""}">
        <div class="dr-a"><span class="dr-wr ${wrCls(wa)}">${wa}%</span> <span class="mini">${ha.w}-${ha.n - ha.w}</span></div>
        <div class="dr-hero">${heroChip(h)}</div>
        <div class="dr-b"><span class="mini">${hb.w}-${hb.n - hb.w}</span> <span class="dr-wr ${wrCls(wb)}">${wb}%</span></div>
      </div>`;
    }).join("");
  }

  // 주 영웅: 승률 높은 순(동률은 출전 수). 기록이 있으면 절대 빈칸이 아님.
  const mainList = (p: Player) => {
    const top = Object.values(p.heroes).filter((h) => h.n >= 1).sort((x, y) => playerWR(y) - playerWR(x) || y.n - x.n).slice(0, 5);
    return top.length
      ? top.map((h) => `<span class="utag">${heroChip(h.hero)} <span class="mini">${h.n}회 · ${playerWR(h)}%</span></span>`).join("")
      : `<span class="mini">출전 기록 없음</span>`;
  };
  const smList = (p: Player) => {
    const sm = strongMaps(p, 4);
    return sm.length ? sm.map((m) => `<span class="utag">${mk(m.map)} <span class="wr ${wrCls(m.wr)}">${m.wr}%</span> <span class="mini">${m.n}</span></span>`).join("") : `<span class="mini">아직 적어요</span>`;
  };

  return `
    <div class="panel diffpanel">
      ${head}
      <h2 style="margin-top:16px">공통 영웅 승률 비교 <span class="count">표본 3+ 일 때만 % · 격차 20%p+ 강조</span></h2>
      <div class="diffrows">${commonBlock}</div>
      <div class="grid2" style="margin-top:16px">
        <div><div class="sub-note">${esc(a.name)} 강점 맵</div><div class="utags">${smList(a)}</div></div>
        <div><div class="sub-note">${esc(b.name)} 강점 맵</div><div class="utags">${smList(b)}</div></div>
      </div>
      <div class="grid2" style="margin-top:14px">
        <div><div class="sub-note">${esc(a.name)} 주 영웅</div><div class="utags">${mainList(a)}</div></div>
        <div><div class="sub-note">${esc(b.name)} 주 영웅</div><div class="utags">${mainList(b)}</div></div>
      </div>
    </div>`;
}


// ===== 시뮬레이션 (맞대결 승률 추정) =====
// 입력: 맵 + 양 팀 각 자리(선수+영웅). 우리/상대 완전 동일한 형태. 가중 합산 추정(학습 모델 아님).
export interface EstInput {
  map: string;
  usPlayers: string[]; // 5: dps1, dps2, tank, sup1, sup2
  usHeroes: string[];
  oppTeam: string;
  oppPlayers: string[];
  oppHeroes: string[];
  srcKey: string; // 불러온 과거 경기 키 (예측 검증용). 수동 편집 시 비움.
}
const EST_SLOTS: Array<{ role: "DPS" | "Tank" | "Support"; label: string }> = [
  { role: "DPS", label: "딜러 1" }, { role: "DPS", label: "딜러 2" }, { role: "Tank", label: "탱커" },
  { role: "Support", label: "서포터 1" }, { role: "Support", label: "서포터 2" },
];
// 선수 옵션: 팀이 있으면 그 팀으로 좁히고, 없으면 전체. 역할에 맞는 선수가 있으면 그 역할로 추가로 좁힘.
function estPlayerOpts(D: DataBundle, team: string, role: string, val: string): string {
  let opts = D.playerNames.map((n) => D.players[n]);
  if (team) opts = opts.filter((p) => p.team === team);
  const byRole = opts.filter((p) => repRole(p.roles) === role);
  if (byRole.length) opts = byRole;
  opts.sort((a, b) => b.n - a.n);
  // 불러온 선수가 역할/팀 필터에 안 걸려도 반드시 보이도록 보강
  if (val && !opts.some((p) => p.name === val)) {
    const P = D.players[val];
    opts = [...(P ? [P] : [{ name: val, team, n: 0, roles: {} } as unknown as Player]), ...opts];
  }
  return `<option value="" ${!val ? "selected" : ""}>— 선수 —</option>${opts.map((p) => `<option value="${esc(p.name)}" ${p.name === val ? "selected" : ""}>${esc(team ? p.name : `${p.name}${p.team ? ` · ${p.team}` : ""}`)}</option>`).join("")}`;
}
function estHeroOpts(role: "DPS" | "Tank" | "Support", val: string): string {
  const list = HEROES[role].slice();
  // 불러온 영웅이 이 역할 목록에 없어도(역할 분류 차이 등) 반드시 보이도록 보강
  if (val && !list.includes(val)) list.unshift(val);
  return `<option value="" ${!val ? "selected" : ""}>— 영웅 —</option>${list.map((h) => `<option value="${esc(h)}" ${h === val ? "selected" : ""}>${esc(heroKo(h))}</option>`).join("")}`;
}
function estRows(D: DataBundle, kind: "us" | "opp", team: string, players: string[], heroes: string[]): string {
  return EST_SLOTS.map((s, i) => `<div class="estrow">
    <span class="estrow-lab">${s.label}</span>
    <select data-act="est-${kind}player-${i}">${estPlayerOpts(D, team, s.role, players[i] || "")}</select>
    <select data-act="est-${kind}hero-${i}">${estHeroOpts(s.role, heroes[i] || "")}</select>
  </div>`).join("");
}
function pairWinrate(D: DataBundle, players: string[], heroes: string[]) {
  let w = 0, n = 0;
  players.forEach((pl, i) => {
    const hero = heroes[i];
    if (!pl || !hero) return;
    const P = D.players[pl];
    const hs = P && P.heroes[hero];
    if (hs && hs.n > 0) { w += hs.w; n += hs.n; }
  });
  return { w, n };
}
interface EstFactor { label: string; w: number; active: boolean; contrib: number; note: string; sample: number; }
function h2hEstimate(D: DataBundle, e: EstInput) {
  const mode = e.map ? D.mapInfo[e.map] || "" : "";
  const us = D.teams[D.us], op = e.oppTeam ? D.teams[e.oppTeam] : null;
  const factors: EstFactor[] = [];

  if (mode && us) {
    const pick = (t: typeof us) => {
      const mp = e.map && t.maps[e.map];
      if (mp && mp.w + mp.l >= 3) return { wr: mp.w / (mp.w + mp.l), s: mp.w + mp.l };
      const md = t.modes[mode];
      if (md && md.t >= 3) return { wr: md.w / md.t, s: md.t };
      return null;
    };
    const u = pick(us), o = op ? pick(op) : null;
    if (u) factors.push({ label: "맵·모드 상성", w: 0.3, active: true, contrib: o ? (u.wr - o.wr) / 2 : u.wr - 0.5, note: `우리 ${Math.round(u.wr * 100)}%${o ? ` vs 상대 ${Math.round(o.wr * 100)}%` : " (상대 표본 부족)"}`, sample: Math.min(u.s, o ? o.s : u.s) });
    else factors.push({ label: "맵·모드 상성", w: 0.3, active: false, contrib: 0, note: "표본 부족", sample: 0 });
  }
  const fu = recentForm(D, D.us), fo = e.oppTeam ? recentForm(D, e.oppTeam) : null;
  if (fu != null) factors.push({ label: "최근 폼", w: 0.2, active: true, contrib: fo != null ? fu - fo : fu - 0.5, note: `우리 ${Math.round(fu * 100)}%${fo != null ? ` vs 상대 ${Math.round(fo * 100)}%` : ""}`, sample: 4 });

  // 우리 선수·영웅 성적 (선택 선수 기준, 부족하면 ZANSIDE 영웅 신호로 보완)
  const pwUs = pairWinrate(D, e.usPlayers, e.usHeroes);
  const usHeroesSel = e.usHeroes.filter(Boolean);
  let usWr: number | null = null, usSample = 0, usNote = "표본 부족";
  if (pwUs.n >= 3) { usWr = pwUs.w / pwUs.n; usSample = pwUs.n; usNote = `선택 선수 ${pwUs.n}경기 평균 ${Math.round(usWr * 100)}%`; }
  else if (usHeroesSel.length) {
    let w = 0, l = 0; usHeroesSel.forEach((h) => { const s = D.usHeroSignal[h]; if (s) { w += s.w; l += s.l; } });
    const ap = w + l;
    if (ap >= 5) { usWr = w / ap; usSample = ap; usNote = `영웅 누적 ${ap}경기`; } else usNote = `표본 부족 (${ap})`;
  }
  if (usHeroesSel.length || pwUs.n) factors.push({ label: "우리 선수·영웅 성적", w: 0.2, active: usWr != null, contrib: usWr != null ? usWr - 0.5 : 0, note: usNote, sample: usSample });

  const pwOpp = pairWinrate(D, e.oppPlayers, e.oppHeroes);
  if (e.oppPlayers.some(Boolean) || e.oppHeroes.some(Boolean)) {
    if (pwOpp.n >= 3) factors.push({ label: "상대 선수·영웅 성적", w: 0.3, active: true, contrib: 0.5 - pwOpp.w / pwOpp.n, note: `상대 핵심 ${pwOpp.n}경기 평균 ${Math.round((pwOpp.w / pwOpp.n) * 100)}%`, sample: pwOpp.n });
    else factors.push({ label: "상대 선수·영웅 성적", w: 0.3, active: false, contrib: 0, note: `표본 부족 (${pwOpp.n})`, sample: pwOpp.n });
  }

  const active = factors.filter((f) => f.active);
  let pct: number | null = null, lo = 0, hi = 0, conf = "—", minS = 0;
  if (e.map && active.length) {
    const wsum = active.reduce((a, f) => a + f.w, 0);
    const contrib = active.reduce((a, f) => a + f.w * f.contrib, 0) / wsum;
    const p = Math.max(0.08, Math.min(0.92, 0.5 + contrib));
    minS = Math.min(...active.map((f) => f.sample || 0));
    const band = minS >= 8 ? 8 : minS >= 5 ? 12 : 18;
    pct = Math.round(p * 100);
    lo = Math.max(0, pct - band); hi = Math.min(100, pct + band);
    conf = minS >= 8 ? "보통" : minS >= 4 ? "낮음" : "매우 낮음";
  }
  const missing: string[] = [];
  if (!e.map) missing.push("맵");
  if (e.usHeroes.filter(Boolean).length < 5) missing.push(`우리 영웅 ${5 - e.usHeroes.filter(Boolean).length}자리`);
  if (!e.oppTeam) missing.push("상대 팀");
  if (e.oppHeroes.filter(Boolean).length < 5) missing.push(`상대 영웅 ${5 - e.oppHeroes.filter(Boolean).length}자리`);

  return { factors, pct, lo, hi, conf, minS, missing };
}
// 조합 추천: "이 상대 · 이 맵"에서 예상 승률이 높은 ZANSIDE 실제 조합 (과거에 실제로 굴린 5인 조합)
function recommendComp(D: DataBundle, e: EstInput) {
  if (!e.map) return [];
  const seen = new Set<string>();
  const comps: Array<{ players: string[]; heroes: string[]; pct: number; srcKey: string; srcMap: string; srcDate: string; sameMap: boolean; usedN: number }> = [];
  const sigCount: Record<string, number> = {};
  const usSets = D.sets.filter((s) => s.top === D.us || s.bottom === D.us);
  // 먼저 각 조합이 몇 번 쓰였는지 집계
  usSets.forEach((s) => {
    const side = s.top === D.us ? s.picks.top : s.picks.bottom;
    const heroes = picksToSlots(side).heroes;
    if (heroes.filter(Boolean).length < 5) return;
    const sig = heroes.slice().sort().join("|");
    sigCount[sig] = (sigCount[sig] || 0) + 1;
  });
  usSets.forEach((s) => {
    const side = s.top === D.us ? s.picks.top : s.picks.bottom;
    const slots = picksToSlots(side);
    const heroes = slots.heroes;
    if (heroes.filter(Boolean).length < 5) return;
    const sig = heroes.slice().sort().join("|");
    if (seen.has(sig)) return;
    seen.add(sig);
    const est = h2hEstimate(D, { ...e, usPlayers: slots.players, usHeroes: heroes });
    comps.push({ players: slots.players, heroes, pct: est.pct ?? 50, srcKey: setKey(s), srcMap: s.map, srcDate: s.date, sameMap: s.map === e.map, usedN: sigCount[sig] });
  });
  comps.sort((a, b) => b.pct - a.pct || (b.sameMap ? 1 : 0) - (a.sameMap ? 1 : 0) || b.usedN - a.usedN);
  return comps.slice(0, 4);
}
function recommendMaps(D: DataBundle, e: EstInput) {
  const maps = Object.keys(D.mapInfo);
  const us = D.teams[D.us];
  return maps.map((m) => {
    const est = h2hEstimate(D, { ...e, map: m });
    const mp = us && us.maps[m];
    const n = mp ? mp.w + mp.l : 0;
    return { map: m, mode: D.mapInfo[m] || "", pct: est.pct, wr: n ? Math.round((mp!.w / n) * 100) : null, n };
  }).filter((x) => x.pct != null).sort((a, b) => (b.pct! - a.pct!) || (b.n - a.n));
}
// 상대 민감도: 상대 과거 조합별 우리 예상 승률
function oppSensitivity(D: DataBundle, e: EstInput) {
  const oppSets = D.sets.filter((s) => s.top === e.oppTeam || s.bottom === e.oppTeam);
  const seen = new Set<string>();
  const items: Array<{ key: string; date: string; map: string; heroes: string[]; pct: number }> = [];
  oppSets.forEach((s) => {
    const side = s.top === e.oppTeam ? s.picks.top : s.picks.bottom;
    const slots = picksToSlots(side);
    const heroes = slots.heroes.filter(Boolean);
    const sig = heroes.slice().sort().join("|");
    if (!sig || seen.has(sig)) return;
    seen.add(sig);
    const trial = { ...e, oppHeroes: slots.heroes, oppPlayers: slots.players };
    const est = h2hEstimate(D, trial);
    items.push({ key: setKey(s), date: s.date, map: s.map, heroes, pct: est.pct ?? 50 });
  });
  items.sort((a, b) => b.pct - a.pct);
  return items;
}
export function renderEstimator(D: DataBundle, e: EstInput): string {
  setIcons(D.heroIcons);
  const maps = Object.keys(D.mapInfo).sort((a, b) => (D.mapInfo[a] || "").localeCompare(D.mapInfo[b] || "") || a.localeCompare(b));
  const mapSel = `<select data-act="est-map"><option value="" ${!e.map ? "selected" : ""}>— 맵 선택 —</option>${maps.map((m) => `<option value="${esc(m)}" ${m === e.map ? "selected" : ""}>${esc(mapKo(m))} (${MODE_KO[D.mapInfo[m]] || D.mapInfo[m]})</option>`).join("")}</select>`;
  const oppSel = `<select data-act="est-oppteam"><option value="" ${!e.oppTeam ? "selected" : ""}>— 상대 팀(선택) —</option>${D.teamNames.filter((n) => n !== D.us).map((n) => `<option value="${esc(n)}" ${n === e.oppTeam ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;

  const r = h2hEstimate(D, e);
  // 불러온 경기가 실제 결과를 가지면 추정 vs 실제 요약을 추정 결과에 함께 표시
  let actualSummary = "";
  if (r.pct != null && e.srcKey) {
    const s = findSetByKey(D, e.srcKey);
    if (s && s.winner) {
      const won = s.winner === D.us;
      const hit = (r.pct > 50) === won;
      const probForOutcome = won ? r.pct : 100 - r.pct; // 추정이 실제 결과에 부여한 확률
      const oppName = s.top === D.us ? s.bottom : s.top;
      actualSummary = `<div class="est-actual ${hit ? "vhit" : "vmiss"}">
        <div class="ea-head">실제 결과 대조 <span class="mini">${fmtDate(s.date)} · vs ${esc(oppName)}</span></div>
        <div class="ea-grid">
          <div class="ea-cell"><span class="ea-k">추정</span><span class="ea-v"><span class="wr ${wrCls(r.pct)}">${r.pct}%</span> ${r.pct > 50 ? "우세" : r.pct < 50 ? "열세" : "백중"}</span></div>
          <div class="ea-cell"><span class="ea-k">실제</span><span class="ea-v"><b class="${won ? "ww" : "ll"}">${won ? "ZANSIDE 승" : "ZANSIDE 패"}</b></span></div>
          <div class="ea-cell"><span class="ea-k">판정</span><span class="ea-v"><b>${hit ? "적중 ✓" : "빗나감 ✗"}</b></span></div>
          <div class="ea-cell"><span class="ea-k">실제 결과 확률</span><span class="ea-v">${probForOutcome}%</span></div>
        </div>
        <div class="sub-note">추정이 실제로 일어난 결과에 부여했던 확률이 ${probForOutcome}%${hit ? " (50% 초과 → 적중)" : " (50% 미만 → 빗나감)"}.</div>
      </div>`;
    }
  }
  // 예측 검증(백테스트) 요약 — 추정 결과 박스에 함께 표시
  const bt = backtestUs(D);
  const verifSummary = bt.n ? `<div class="est-verif">
    <div class="ea-head">예측 검증 <span class="mini">과거 ZANSIDE ${bt.n}경기 전체로 모델 검증</span></div>
    <div class="ea-grid">
      <div class="ea-cell"><span class="ea-k">적중률</span><span class="ea-v">${Math.round((bt.hits / bt.n) * 100)}% <span class="mini">${bt.hits}/${bt.n}</span></span></div>
      <div class="ea-cell"><span class="ea-k">Brier</span><span class="ea-v">${bt.brier.toFixed(3)} <span class="mini">↓정확</span></span></div>
    </div>
    <div class="sub-note">${bt.n < 10 ? `표본 ${bt.n}경기로 적음 · 단정 금지. ` : ""}인-샘플(같은 데이터로 만든 모델을 같은 경기에 검증)이라 실제보다 낙관적일 수 있음. Brier는 0에 가까울수록 정확.</div>
  </div>` : "";
  let result: string;
  if (r.pct == null) {
    result = `<div class="est-empty"><div class="est-big">입력 대기</div><div class="sub-note">${r.missing.length ? `더 채우면 추정: <b>${esc(r.missing.join(", "))}</b>` : "맵을 먼저 선택"}</div></div>`;
  } else {
    result = `<div class="est-result"><div class="est-big"><span class="wr ${wrCls(r.pct)}">${r.pct}%</span></div>
      <div class="est-band">예상 범위 ${r.lo}~${r.hi}% · 신뢰도 ${r.conf} · 최소 표본 ${r.minS}</div>
      <div class="sub-note">예측이 아니라 <b>가중 합산 추정</b> · 소수점까지 믿을 값은 아님</div>
      ${r.missing.length ? `<div class="sub-note">빈 입력: ${esc(r.missing.join(", "))} — 채운 만큼만 반영</div>` : ""}
      ${actualSummary}</div>`;
  }
  const rows = r.factors.length
    ? r.factors.map((f) => `<div class="frow ${f.active ? "" : "off"}"><span class="fl-label">${f.label}<span class="fw">가중치 ${Math.round(f.w * 100)}%</span></span><span class="fl-contrib">${f.active ? `${f.contrib >= 0 ? "+" : ""}${Math.round(f.w * f.contrib * 100)}p` : "—"}</span><span class="fl-note mini">${f.note}</span></div>`).join("")
    : nod("맵과 양 팀 구성을 채우면 요인이 나와요.");

  // 저표본 표시: 딱 1맵일 때만 경고, 2맵 이상은 아무것도 안 붙임
  const smpTag = (n: number) => n === 1 ? ' <span class="lowsmp">⚠ 표본부족</span>' : "";

  // 불러오기 셀렉트
  const usGames = D.sets.filter((s) => s.top === D.us || s.bottom === D.us).slice().reverse();
  const gameOpt = (s: SetRec, me: string) => `<option value="${esc(setKey(s))}">${fmtDate(s.date)} vs ${esc(s.top === me ? s.bottom : s.top)} · ${esc(mapKo(s.map))}</option>`;
  const usLoad = `<select data-act="est-load-us" class="loadsel"><option value="">⤓ 경기 불러오기</option>${usGames.map((s) => gameOpt(s, D.us)).join("")}</select>`;
  // 상대 불러오기: 선택한 상대 팀의 경기(그 팀의 상대 이름이 보임)
  let oppLoad: string;
  if (e.oppTeam) {
    const oppGames = D.sets.filter((s) => s.top === e.oppTeam || s.bottom === e.oppTeam).slice().reverse();
    oppLoad = `<select data-act="est-load-opp" class="loadsel"><option value="">⤓ ${esc(e.oppTeam)} 경기 불러오기</option>${oppGames.map((s) => gameOpt(s, e.oppTeam)).join("")}</select>`;
  } else {
    oppLoad = `<select class="loadsel" disabled><option value="">⤓ 상대 팀 먼저 선택</option></select>`;
  }

  // 조합 추천 (맵 입력 시) — "이 상대·이 맵"에서 예상 승률이 높은 ZANSIDE 실제 조합
  let recPanel = "";
  if (e.map) {
    const comps = recommendComp(D, e);
    const compHtml = comps.length
      ? comps.map((c, i) => {
          const lineup = EST_SLOTS.map((sl, idx) => `<span class="comp-slot"><span class="comp-pl">${c.players[idx] ? esc(c.players[idx]) : "—"}</span>${heroChip(c.heroes[idx])}</span>`).join("");
          return `<div class="compitem${i === 0 ? " best" : ""}">
            <div class="comp-head"><span class="comp-rank">${i === 0 ? "👍 추천" : `#${i + 1}`}</span><span class="wr ${wrCls(c.pct)}">예상 ${c.pct}%</span>${c.sameMap ? '<span class="comp-tag">이 맵 사용 이력</span>' : ""}<span class="mini">${c.usedN}회 사용</span></div>
            <div class="comp-lineup">${lineup}</div>
            <div class="comp-actions"><button class="minibtn" data-act="est-comp" data-val="${esc(c.srcKey)}">이 조합 적용</button><button class="linkbtn" data-act="load-sim" data-val="${esc(c.srcKey)}">근거 경기 ↗</button></div>
          </div>`;
        }).join("")
      : nod("5인 조합 기록이 아직 부족해요.");
    // 맵 추천 (이 조합에 유리한 맵)
    const recMaps = recommendMaps(D, e).slice(0, 5);
    const mapHtml = recMaps.length
      ? recMaps.map((m, idx) => `<div class="recmapitem ${m.map === e.map ? "cur" : ""}" data-act="est-map" data-val="${esc(m.map)}">${idx === 0 ? "<b>👍</b> " : ""}${mk(m.map)} <span class="mini">${MODE_KO[m.mode] || m.mode}</span> <span class="wr ${wrCls(m.pct!)}">예상 ${m.pct}%</span>${m.wr != null ? ` <span class="mini">실적 ${m.wr}%(${m.n})</span>` : ' <span class="mini">실적 없음</span>'}</div>`).join("")
      : nod("맵 추천 표본이 부족해요.");
    recPanel = `<div class="panel"><h2>조합 추천 <span class="count">${e.oppTeam ? `vs ${esc(e.oppTeam)} · ` : ""}${esc(mapKo(e.map))} 고승률 조합</span></h2>
      <div class="sub-note">ZANSIDE가 <b>실제로 굴린 5인 조합</b>을 이 매치업에 대입해 예상 승률 높은 순으로 보여줘요. <b>이 조합 적용</b>은 현재 맵·상대를 유지한 채 우리 라인업만 채웁니다.</div>
      <div class="complist">${compHtml}</div>
      <h3 class="recmap-h">이 구성에 유리한 맵</h3>
      <div class="recmaps">${mapHtml}</div>
      <div class="sub-note causenote">상관일 뿐 인과가 아니에요. 표본이 적은 조합은 신중히 보세요.</div></div>`;
  }
  // 상대 조합별 승률 (맵 + 상대 팀 입력 시)
  let sensPanel = "";
  if (e.map && e.oppTeam) {
    const sens = oppSensitivity(D, e);
    const fav = sens.slice(0, 4);
    const unfav = sens.slice().reverse().filter((x) => !fav.includes(x)).slice(0, 4);
    const sensItem = (x: typeof sens[number]) => `<div class="sensitem clickable" data-act="load-sim" data-val="${esc(x.key)}"><span class="mini">${fmtDate(x.date)} · ${mk(x.map)}</span> <span class="senshe">${x.heroes.map((h) => heroChip(h)).join(" ")}</span> <span class="wr ${wrCls(x.pct)}">우리 ${x.pct}%</span></div>`;
    sensPanel = `<div class="panel"><h2>상대 조합별 승률 <span class="count">${esc(e.oppTeam)} 과거 조합 → 우리 예상 승률</span></h2>
      <div class="grid2">
        <div><div class="sub-note" style="color:var(--accent)">우리에게 유리한 상대 조합</div>${fav.length ? fav.map(sensItem).join("") : nod("기록이 적어요")}</div>
        <div><div class="sub-note" style="color:var(--warn)">우리에게 불리한 상대 조합</div>${unfav.length ? unfav.map(sensItem).join("") : nod("기록이 적어요")}</div>
      </div>
      <div class="sub-note causenote">과거 관측 경향이에요(인과 아님). 표본이 얇으면 들쭉날쭉할 수 있어요. 누르면 그 경기를 불러와요.</div></div>`;
  }
  return `
    <div class="panel">
      <h2>맞대결 시뮬레이션 <span class="count">학습 모델 아님 · 투명한 가중 합산</span></h2>
      <div class="sub-note">맵과 양 팀 구성(자리마다 선수+영웅)을 고르면 그 매치업의 <b>예상 승률</b>과 근거를 보여줘요. 같은 경기를 양쪽에서 불러오면 그 매치업이 그대로 재현돼요.</div>
      <label class="estfield" style="max-width:360px;margin-bottom:14px"><span class="estlabel">맵 (모드 자동)</span>${mapSel}</label>
      <div class="grid2 h2h-inputs">
        <div class="h2h-side"><div class="h2h-h zan">ZANSIDE ${usLoad}</div><div class="estrows">${estRows(D, "us", D.us, e.usPlayers, e.usHeroes)}</div></div>
        <div class="h2h-side"><div class="h2h-h">상대 ${oppSel} ${oppLoad}</div><div class="estrows">${estRows(D, "opp", e.oppTeam, e.oppPlayers, e.oppHeroes)}</div></div>
      </div>
    </div>
    <div class="grid2">
      <div class="panel"><h2>추정 결과</h2>${result}${verifSummary}</div>
      <div class="panel"><h2>요인 분해 <span class="count">기여 = 가중치 × (승률−50%)</span></h2><div class="frows">${rows}</div>
        <div class="sub-note" style="margin-top:10px">활성 요인의 가중치 합으로 정규화해 50%에 더해요.</div></div>
    </div>
    ${recPanel}
    ${sensPanel}`;
}
