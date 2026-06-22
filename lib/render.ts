// 렌더 레이어 — 순수 함수가 섹션 HTML 문자열을 만든다 (React 의존 없음).
// 상호작용 컨트롤은 data-act / data-val 속성을 달고, Dashboard 가 위임 처리한다.
import {
  MODE_KO, MODE_ORDER, ROLE_KO, HEROES, EST_WEIGHTS, EST_THRESH, heroKo, mapKo,
} from "./constants";
import type { DataBundle, Player, SetRec, Series, Standing, Team } from "./types";
import { dimensions, crossEdge, WEAK_MARGIN, WEAK_SAMPLE_MIN, type Weak } from "./weakness";
import { esc, wrCls, nod, hk, mk, heroChip, heroIcon, setIcons } from "./ui";
export { esc, setIcons };

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

// ===== 약점 분석 (명세 42) =====
function weakItem(D: DataBundle, item: Weak, isUs: boolean, edge: { edge: boolean; usWr: number | null }, open: boolean): string {
  const badge = !isUs && edge.edge ? `<span class="edge">공략 포인트</span>` : "";
  const deltaTxt = `<span class="mini">리그 대비 ${item.deltaLeague > 0 ? "+" : ""}${item.deltaLeague}%p</span>`;
  const head = `<div class="weakrow ${open ? "open" : ""}" data-act="weak-expand" data-val="${esc(item.key)}">
    <div class="wk-main"><span class="wk-label">${esc(item.label)}</span>${badge}</div>
    <div class="wk-nums"><span class="wr ${item.wr >= 50 ? "mid" : "lo"}">${item.wr}%</span> ${deltaTxt} <span class="mini">${item.sample}맵</span> <span class="caret">${open ? "▾" : "▸"}</span></div>
  </div>`;
  const usNote = !isUs && edge.usWr != null ? ` <span class="mini">(우리 ${edge.usWr}%)</span>` : "";
  const action = `<div class="wk-action">→ ${item.action(isUs)}${usNote}</div>`;
  if (!open) return `<div class="weakitem">${head}${action}</div>`;
  const sets = item.sets.slice().reverse().map((s) =>
    `<div class="wkset"><span class="mini">${fmtDate(s.date)}</span> <b>${mk(s.map)}</b> <span class="mini">${esc(MODE_KO[s.mode] || s.mode)}</span> <span class="mini">vs</span> ${esc(s.opp)} <span class="${s.won ? "ww" : "ll"}">${s.won ? "승" : "패"}</span>${s.replay ? ` <span class="repcode">${esc(s.replay)}</span>` : ""}</div>`
  ).join("");
  return `<div class="weakitem">${head}${action}<div class="wkdetail">${sets || nod("근거 경기를 찾지 못했어요.")}</div></div>`;
}
/** 약점 패널 — ZANSIDE(isUs)면 우리 약점, 아니면 상대 약점(공략 포인트 강조). */
export function weaknessPanel(D: DataBundle, team: string, isUs: boolean, weakExpand: string): string {
  const dims = dimensions(D, team);
  const usDims = isUs ? dims : dimensions(D, D.us);
  const weak = dims.filter((d) => d.status === "weak").sort((a, b) => a.wr - b.wr);
  const low = dims.filter((d) => d.status === "lowsample");
  const who = isUs ? "ZANSIDE" : esc(team);

  const weakHtml = weak.length
    ? weak.map((it) => weakItem(D, it, isUs, crossEdge(usDims, it), weakExpand === it.key)).join("")
    : `<div class="sub-note">리그 평균보다 뚜렷하게 낮은 약점은 아직 안 보여요. 경기가 더 쌓이면 다시 봐요.</div>`;
  const lowHtml = low.length
    ? `<div class="sub-note" style="margin-top:14px">아직 경기가 적어 약점이라 보긴 일러요 (참고용)</div>
       <div class="lowlist">${low.map((it) => `<span class="utag">${esc(it.label)} <span class="mini">${it.wr}% · ${it.sample}맵</span></span>`).join("")}</div>`
    : "";

  return `<div class="panel weakpanel">
    <h2>${who} 약점 <span class="count">리그 평균보다 ${WEAK_MARGIN}%p 넘게 낮고 ${WEAK_SAMPLE_MIN}맵 이상일 때만</span></h2>
    <div class="sub-note">항목을 누르면 근거가 된 경기를 펼쳐 봅니다.</div>
    ${weakHtml}${lowHtml}
    <div class="sub-note causenote">약점은 결과의 흐름일 뿐 원인은 아니에요. 상대·맵·밴 상황에 따라 달라질 수 있으니 표본과 함께 참고만 하세요.</div>
  </div>`;
}

// ===== MATCH DAY 홈 (명세 29) =====
function teamMapWR(t: Team | undefined) {
  if (!t) return 0.5;
  const tot = t.mapW + t.mapL;
  return tot ? t.mapW / tot : 0.5;
}
function recentForm(D: DataBundle, team: string) {
  const ss = D.series.filter((s) => s.top === team || s.bottom === team).slice(-4);
  if (!ss.length) return null;
  return ss.filter((s) => s.winner === team).length / ss.length;
}
// 팀의 오프닝 선픽 영웅 집계 (맵세트·팀 중복제거)
function oppOpeningPicks(D: DataBundle, team: string) {
  const agg: Record<string, { n: number; w: number }> = {};
  D.sets.forEach((s) => {
    const side = s.top === team ? s.picks.top : s.bottom === team ? s.picks.bottom : null;
    if (!side) return;
    const w = s.winner === team || (!s.winner && false);
    const seen = new Set<string>();
    side.forEach((p) => {
      if (!p.hero || seen.has(p.hero)) return;
      seen.add(p.hero);
      const a = (agg[p.hero] = agg[p.hero] || { n: 0, w: 0 });
      a.n++;
      if (s.winner === team) a.w++;
    });
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
    basis.push(`최근 폼 ${Math.round(fu * 100)}% ↔ ${Math.round(fo * 100)}%`);
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
    }).join("") : nod("아직 치른 경기가 없어요.");
    return `${scope}<div class="panel"><h2>다음 경기</h2>${nod("잡힌 다음 경기가 없어요. 대진표가 갱신되면 여기에 표시됩니다.")}</div>
      <div class="panel"><h2>최근 흐름</h2><div class="form">${form}</div></div>
      ${weaknessPanel(D, D.us, true, weakExpand)}`;
  }

  const g = up[0];
  const opp = g.a === D.us ? g.b : g.a;
  const op = D.teams[opp];
  const est = matchEstimate(D, opp);

  // 추천 첫 밴 — 상대가 자주 꺼내는 오프닝 영웅
  const oppPicks = op ? oppOpeningPicks(D, opp) : [];
  const banPick = oppPicks[0];
  const recBan = banPick
    ? mdCard("추천 첫 밴", heroChip(banPick.hero), `${esc(opp)}이(가) ${banPick.n}번 꺼낸 핵심 픽`)
    : mdCard("추천 첫 밴", "데이터 부족", `${esc(opp)} 선픽이 입력되면 추천해요`);

  // 상대 예상 밴 — 상대 선밴 1순위
  const oppMaps = op ? op.mapW + op.mapL : 0;
  const oppFb = op ? Object.entries(op.firstBan).sort((a, b) => b[1] - a[1])[0] : null;
  const expBan = oppFb
    ? mdCard("상대 예상 밴", heroChip(oppFb[0]), `최근 ${Math.round((oppFb[1] / Math.max(1, oppMaps)) * 100)}% 빈도로 선밴`)
    : mdCard("상대 예상 밴", "—", "밴 기록이 아직 적어요");

  // 위험 모드 — 상대는 강하고 우리는 약한 모드
  let riskMode = "—", riskSub = "표본이 더 필요해요";
  if (us && op) {
    let best: { m: string; gap: number; u: number; o: number } | null = null;
    MODE_ORDER.forEach((m) => {
      const u = us.modes[m], o = op.modes[m];
      if (!u || !o || u.t < 3 || o.t < 3) return;
      const uw = u.w / u.t, ow = o.w / o.t;
      const gap = ow - uw;
      if (!best || gap > best.gap) best = { m, gap, u: Math.round(uw * 100), o: Math.round(ow * 100) };
    });
    if (best) {
      const bb = best as { m: string; gap: number; u: number; o: number };
      riskMode = MODE_KO[bb.m] || bb.m;
      riskSub = `우리 ${bb.u}% · 상대 ${bb.o}%`;
    }
  }

  const estCard = mdCard("예상 승률", `${est.pct}<span class="mdc-pct">%</span>`,
    `${est.lo}~${est.hi}% · 신뢰도 ${est.conf}`, "accent");

  // 상대 핵심 성향 (좌)
  const tend: string[] = [];
  if (op) {
    const pm = Object.entries(op.pickMaps).sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]);
    if (pm.length) tend.push(`맵 선택권이 있으면 <b>${esc(pm.map(mapKo).join(", "))}</b>을(를) 자주 골라요.`);
    const fb = Object.entries(op.firstBan).sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0]);
    if (fb.length) tend.push(`선밴으로 <b>${esc(fb.map(heroKo).join(", "))}</b>을(를) 자주 지워요.`);
    const pTot = op.pushW + op.pushL;
    if (pTot >= 3) {
      const pr = Math.round((op.pushW / pTot) * 100);
      tend.push(`푸시 ${op.pushW}승 ${op.pushL}패(${pr}%)${pr >= 60 ? " — 푸시가 강한 편이에요." : "."}`);
    }
  }
  const tendHtml = tend.length ? tend.map((t) => `<li>${t}</li>`).join("") : `<li class="mini">상대 표본이 적어 성향을 단정하기 일러요.</li>`;

  // ZANSIDE 대응 (우)
  const resp: string[] = [];
  if (us) {
    const ms = MODE_ORDER.filter((m) => us.modes[m] && us.modes[m].t >= 3)
      .map((m) => ({ m, wr: us.modes[m].w / us.modes[m].t }))
      .sort((a, b) => b.wr - a.wr);
    if (ms[0]) resp.push(`우리는 <b>${MODE_KO[ms[0].m]}</b>에서 강해요(${Math.round(ms[0].wr * 100)}%). 픽권이 있으면 우선 고려.`);
    if (banPick) resp.push(`첫 밴은 <b>${esc(heroKo(banPick.hero))}</b> 후보 — 상대 핵심 픽을 지워요.`);
    if (riskMode !== "—") resp.push(`<b>${riskMode}</b>은 우리가 밀리는 구간이라 연습·회피를 검토해요.`);
  }
  const respHtml = resp.length ? resp.map((t) => `<li>${t}</li>`).join("") : `<li class="mini">표본이 더 쌓이면 대응을 제안할게요.</li>`;

  // 근거 경기 — 최근 맞대결 또는 상대 최근 경기
  const h2h = D.series.filter((s) => (s.top === D.us && s.bottom === opp) || (s.top === opp && s.bottom === D.us)).slice().reverse();
  const oppRecent = D.series.filter((s) => s.top === opp || s.bottom === opp).slice(-4).reverse();
  const refList = (h2h.length ? h2h : oppRecent).map((S) => seriesRow(D, S)).join("");

  return `${scope}
    <div class="panel nextmatch">
      <div class="nm-eyebrow">다음 경기</div>
      <div class="nm-row"><span class="nm-us">ZANSIDE</span><span class="nm-vs">vs</span><span class="nm-opp">${esc(opp)}</span></div>
      <div class="nm-meta">${esc(g.date)} · ${esc(g.label)}${rankOf(D, opp) ? ` · 상대 ${rankOf(D, opp)}위` : ""} <button class="linkbtn" data-act="goscout" data-val="${esc(opp)}">상대 자세히 보기 ↗</button></div>
    </div>
    <div class="mdcards">${estCard}${recBan}${expBan}${mdCard("위험 모드", riskMode, riskSub, "warn")}</div>
    <div class="grid2">
      <div class="panel"><h2>상대 핵심 성향</h2><ul class="mdlist">${tendHtml}</ul></div>
      <div class="panel"><h2>ZANSIDE 대응</h2><ul class="mdlist">${respHtml}</ul></div>
    </div>
    ${weaknessPanel(D, D.us, true, weakExpand)}
    ${weaknessPanel(D, opp, false, weakExpand)}
    <div class="panel"><h2>분석 근거 경기 <span class="count">${h2h.length ? "최근 맞대결" : `${esc(opp)} 최근 경기`}</span></h2><div class="sched">${refList || nod("표시할 경기가 없어요.")}</div></div>
    <div class="panel"><h2>예상 승률은 어떻게 나왔나 <span class="count">학습 모델 아님 · 가중 합산</span></h2>
      <div class="sub-note">${est.basis.map(esc).join(" · ")} → ${est.pct}% (신뢰도 ${est.conf}, ${est.minSample}시리즈). 소수점까지 믿을 숫자는 아니에요.</div></div>
    ${healthPanel(D)}`;
}
// 데이터 점검 결과 (문제 있을 때만 노출)
function healthPanel(D: DataBundle): string {
  const h = D.health;
  if (h.warn + h.error === 0 && h.dropped === 0) return "";
  const items = h.issues.slice(0, 8).map((i) =>
    `<div class="issue ${i.level}"><span class="iss-code">${esc(i.code)}</span><span class="iss-where mini">${esc(i.where)}</span><span class="iss-msg">${esc(i.msg)}</span></div>`
  ).join("");
  return `<div class="panel"><h2>데이터 점검 <span class="count">정상 ${h.okRows}경기${h.warn ? ` · 확인필요 ${h.warn}` : ""}${h.dropped ? ` · 제외 ${h.dropped}` : ""}</span></h2>
    <div class="sub-note">시트에서 이런 점이 보였어요. 통계에 큰 영향은 없지만 한번 확인해 두면 좋아요.</div>
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
export function renderScout(D: DataBundle, curScout: string, weakExpand: string): string {
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

  const pn = sum(T.pickMaps);
  const pmModes = topN(T.pickModes, 5);
  const pmMaps = topN(T.pickMaps, 6);
  const pickHtml = pn
    ? `<div class="sub-note" style="margin:0 0 8px">모드</div>` +
      (pmModes.length ? (() => { const mx = Math.max(1, ...pmModes.map((x) => x[1])); return pmModes.map(([m, n]) => barCount(MODE_KO[m] || m, n, mx, "blu")).join(""); })() : nod()) +
      `<div class="sub-note" style="margin:12px 0 8px">맵</div>` +
      (pmMaps.length ? (() => { const mx = Math.max(1, ...pmMaps.map((x) => x[1])); return pmMaps.map(([m, n]) => barCount(mapKo(m), n, mx, "blu")).join(""); })() : nod())
    : nod("맵 픽권 표본이 없습니다 (ADMIN/공란 제외).");

  const ms = modeWinrate(T);
  const mmx = Math.max(1, ...ms.map((m) => m[1].t));
  const modesHtml = ms.length ? ms.map(([m, d]) => barWR(MODE_KO[m] || m, d.w, d.t, mmx)).join("") : nod();

  const fbN = sum(T.firstBan);
  const ms2 = D.series.filter((s) => s.top === curScout || s.bottom === curScout).slice().reverse();

  return `
    <div class="chiprow">${chips}</div>
    <div class="statrow">${cards}</div>
    ${weaknessPanel(D, curScout, false, weakExpand)}
    <div class="grid2">
      <div class="panel"><h2>맵을 고를 때 선호 (맵 픽권 보유 시) <span class="count">표본 ${pn}회</span></h2>
        <div class="sub-note">ADMIN·공란(주최/불명) 선택은 제외</div>
        <div class="bars">${pickHtml}</div>
      </div>
      <div class="panel"><h2>모드별 승률 <span class="count">맵 단위</span></h2><div class="bars">${modesHtml}</div></div>
    </div>
    <div class="grid2">
      <div class="panel"><h2>선밴 경향 (우리가 막힐 픽) <span class="count">표본 ${fbN}회</span></h2><div class="bars">${countBars(T.firstBan, "ban")}</div></div>
      <div class="panel"><h2>후밴 경향</h2><div class="bars">${countBars(T.secondBan, "ban")}</div></div>
    </div>
    <div class="panel">
      <h2>ZANSIDE 상대 전적 (헤드투헤드) <span class="count">${D.sets.filter((s) => (s.top === D.us && s.bottom === curScout) || (s.top === curScout && s.bottom === D.us)).length}세트</span></h2>
      <div>${renderH2H(D, curScout)}</div>
    </div>
    <div class="panel"><h2>해당 팀 경기 기록</h2><div class="sched">${ms2.map((S) => seriesRow(D, S)).join("") || nod()}</div></div>`;
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

// ===== MAPS (5.4) =====
export function renderMaps(D: DataBundle, mapsMode: string, mapsTeam: string): string {
  const Z = D.teams[D.us];
  const leagueMode: Record<string, { t: number }> = {};
  Object.values(D.teams).forEach((t) =>
    Object.entries(t.modes).forEach(([m, d]) => ((leagueMode[m] = leagueMode[m] || { t: 0 }).t += d.t))
  );
  const modeBody = MODE_ORDER.map((m) => {
    const d = Z && Z.modes[m];
    const wr = d && d.t ? Math.round((d.w / d.t) * 100) : -1;
    const lg = leagueMode[m] ? Math.round(leagueMode[m].t / 2) : 0;
    return `<tr><td class="hname">${MODE_KO[m] || m}</td>
      <td class="num">${d ? `${d.w}-${d.t - d.w}` : '<span class="mini">-</span>'}</td>
      <td class="num">${wr < 0 ? '<span class="mini">-</span>' : `<span class="wr ${wrCls(wr)}">${wr}%</span> <span class="mini">(${d!.t})</span>`}</td>
      <td class="num mini">${lg}</td></tr>`;
  }).join("");

  const modes = MODE_ORDER.filter((m) => D.sets.some((s) => s.mode === m));
  const modeFilter = `<select data-act="mapsmode"><option value="all" ${mapsMode === "all" ? "selected" : ""}>전체 모드</option>${modes.map((m) => `<option value="${m}" ${mapsMode === m ? "selected" : ""}>${MODE_KO[m] || m}</option>`).join("")}</select>`;
  const teamFilter = `<select data-act="mapsteam"><option value="ZANSIDE" ${mapsTeam === "ZANSIDE" ? "selected" : ""}>ZANSIDE</option><option value="all" ${mapsTeam === "all" ? "selected" : ""}>리그 전체</option></select>`;

  // 맵 집계
  const rows: Record<string, { map: string; mode: string; n: number; w: number; l: number; pickers: Record<string, number> }> = {};
  D.sets.forEach((s) => {
    if (!s.map) return;
    if (mapsMode !== "all" && s.mode !== mapsMode) return;
    const r = (rows[s.map] = rows[s.map] || { map: s.map, mode: s.mode, n: 0, w: 0, l: 0, pickers: {} });
    const w = setWinner(s);
    if (mapsTeam === "ZANSIDE") {
      if (s.top !== D.us && s.bottom !== D.us) return;
      r.n++;
      if (w === D.us) r.w++;
      else if (w) r.l++;
    } else {
      r.n++;
    }
    if (s.picker && s.picker !== "ADMIN") r.pickers[s.picker] = (r.pickers[s.picker] || 0) + 1;
  });
  const arr = Object.values(rows).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  const mapBody = arr.length
    ? arr.map((r) => {
        const wr = r.w + r.l ? Math.round((r.w / (r.w + r.l)) * 100) : -1;
        const pk = topN(r.pickers, 1)[0];
        return `<tr><td class="hname">${mk(r.map)}</td><td class="mini">${MODE_KO[r.mode] || r.mode}</td>
          <td class="num">${r.n}</td>
          <td class="num">${mapsTeam === "ZANSIDE" ? `${r.w}-${r.l}` : '<span class="mini">-</span>'}</td>
          <td class="num">${mapsTeam === "ZANSIDE" && wr >= 0 ? `<span class="wr ${wrCls(wr)}">${wr}%</span>` : '<span class="mini">-</span>'}</td>
          <td class="num mini">${pk ? `${esc(pk[0])} (${pk[1]})` : "-"}</td></tr>`;
      }).join("")
    : `<tr><td colspan="6">${nod("해당 조건 맵 없음")}</td></tr>`;

  return `
    <div class="panel">
      <h2>모드별 — ZANSIDE vs 리그 <span class="count">맵 단위 승률</span></h2>
      <div class="sub-note">푸시는 거리 비교로 승패 판정. 승률 옆 괄호는 표본(맵 수)</div>
      <table>
        <thead><tr><th>모드</th><th class="num">우리 전적</th><th class="num">우리 승률</th><th class="num">리그 평균 맵수</th></tr></thead>
        <tbody>${modeBody}</tbody>
      </table>
    </div>
    <div class="panel">
      <h2>맵별 드릴다운 <span class="count">${arr.length}개 맵 · ${mapsTeam === "ZANSIDE" ? "ZANSIDE 기준" : "리그 전체"}</span></h2>
      <div class="fbar">
        <span class="flabel">모드</span>${modeFilter}
        <span class="flabel">팀</span>${teamFilter}
      </div>
      <table>
        <thead><tr><th>맵</th><th>모드</th><th class="num">플레이</th><th class="num">승-패</th><th class="num">승률</th><th class="num">최다 픽 팀</th></tr></thead>
        <tbody>${mapBody}</tbody>
      </table>
    </div>`;
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
export function renderLog(D: DataBundle, f: LogFilter): string {
  const opt = (val: string, label: string, sel: string) =>
    `<option value="${esc(val)}" ${val === sel ? "selected" : ""}>${esc(label)}</option>`;
  const teamSel = `<select data-act="logteam"><option value="" ${!f.team ? "selected" : ""}>팀 전체</option>${D.teamNames.map((n) => opt(n, n, f.team)).join("")}</select>`;
  const modes = MODE_ORDER.filter((m) => D.sets.some((s) => s.mode === m));
  const modeSel = `<select data-act="logmode"><option value="" ${!f.mode ? "selected" : ""}>모드 전체</option>${modes.map((m) => opt(m, MODE_KO[m] || m, f.mode)).join("")}</select>`;
  const maps = [...new Set(D.sets.map((s) => s.map).filter(Boolean))].sort();
  const mapSel = `<select data-act="logmap"><option value="" ${!f.map ? "selected" : ""}>맵 전체</option>${maps.map((m) => opt(m, m, f.map)).join("")}</select>`;
  const dates = [...new Set(D.sets.map((s) => s.date))].sort();
  const dateSel = `<select data-act="logdate"><option value="" ${!f.date ? "selected" : ""}>날짜 전체</option>${dates.map((d) => opt(d, d, f.date)).join("")}</select>`;

  const arr = D.sets.filter((s) => {
    if (f.z === "us" && s.top !== D.us && s.bottom !== D.us) return false;
    if (f.team && s.top !== f.team && s.bottom !== f.team) return false;
    if (f.mode && s.mode !== f.mode) return false;
    if (f.map && s.map !== f.map) return false;
    if (f.date && s.date !== f.date) return false;
    return true;
  }).slice().reverse();

  const body = arr.length
    ? arr.map((s) => {
        const w = setWinner(s);
        const isUs = s.top === D.us || s.bottom === D.us;
        const aCls = w === s.top ? "winner" : "loser";
        const bCls = w === s.bottom ? "winner" : "loser";
        const aZ = s.top === D.us ? "zan" : "";
        const bZ = s.bottom === D.us ? "zan" : "";
        const bans = s.bans.map((b) => heroChip(b.hero)).join(" ") || '<span class="mini">-</span>';
        return `<tr class="${isUs ? "zanrow" : ""}">
          <td class="mini">${fmtDate(s.date)}</td>
          <td class="mini">${esc(s.match)}</td>
          <td><span class="hname">${mk(s.map)}</span> <span class="mini">${esc(MODE_KO[s.mode] || s.mode)}</span></td>
          <td><span class="${aCls} ${aZ}">${esc(s.top)}</span> <span class="mini">vs</span> <span class="${bCls} ${bZ}">${esc(s.bottom)}</span></td>
          <td class="num">${scoreStr(s)}</td>
          <td class="mini">${bans}</td>
          <td>${s.replay ? `<span class="rep"><span class="repcode">${esc(s.replay)}</span><button class="copyb" data-act="copy" data-val="${esc(s.replay)}">복사</button></span>` : '<span class="mini">-</span>'}</td>
        </tr>`;
      }).join("")
    : "";

  return `
    <div class="fbar">
      <span class="flabel">ZANSIDE전</span>
      <div class="seg"><button class="${f.z === "all" ? "on" : ""}" data-act="logz" data-val="all">전체</button><button class="${f.z === "us" ? "on" : ""}" data-act="logz" data-val="us">우리 경기만</button></div>
      <span class="flabel">팀</span>${teamSel}
      <span class="flabel">모드</span>${modeSel}
      <span class="flabel">맵</span>${mapSel}
      <span class="flabel">날짜</span>${dateSel}
    </div>
    <div class="panel">
      <h2>경기 로그 <span class="count">${arr.length}맵</span></h2>
      <div class="sub-note">한 행 = 한 맵(세트). 리플레이 코드 옆 복사 버튼으로 복사</div>
      <table>
        <thead><tr><th>날짜</th><th>경기</th><th>맵 / 모드</th><th>대결</th><th class="num">스코어</th><th>밴(선·후)</th><th>리플레이</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${arr.length ? "" : `<div class="nodata">필터에 해당하는 경기가 없습니다.</div>`}
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
  const st = standOf(D, D.us);
  const rem = D.schedule.filter((g) => g.status === "upcoming" && !g.tbd && g.phase === "regular");
  const zGames = rem.filter((g) => g.a === D.us || g.b === D.us);
  const cards =
    stat("현재 전적", st ? `<span class="ww">${st.win}</span><small> - ${st.lose}</small>` : "—", true) +
    stat("현재 순위", st ? tieRank(D, st) : "—", true) +
    stat("잔여 경기", `${zGames.length}`, true) +
    stat("정규 잔여 (리그)", `${rem.length}`, true);

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
      <td class="tname ${s.team === D.us ? "zan" : ""}">${esc(s.team)}</td>
      <td class="num"><span class="wr hi">${s.win}</span></td><td class="num mini">${s.lose}</td>
      <td class="num wr ${s.diff > 0 ? "hi" : s.diff < 0 ? "lo" : "mid"}">${s.diff > 0 ? "+" : ""}${s.diff}</td></tr>`
  ).join("");

  return `
    <div class="statrow">${cards}</div>
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
  search: string;
  role: "all" | "Tank" | "DPS" | "Support";
  compareAll: boolean;
  openTeams: string[]; // 펼친 팀 그룹 (작업2)
  heroExpand: string; // 펼친 영웅 행 (작업1)
}
function playerWR(hs: { n: number; w: number }) {
  return hs.n ? Math.round((hs.w / hs.n) * 100) : 0;
}
const repRole = (roles: Record<string, number>) => {
  const e = Object.entries(roles).sort((a, b) => b[1] - a[1])[0];
  return e ? e[0] : "";
};
const topHero = (p: Player) => Object.values(p.heroes).sort((a, b) => b.n - a.n)[0];
function strongMaps(p: Player, k: number) {
  return Object.values(p.maps)
    .filter((m) => m.n >= 3)
    .map((m) => ({ ...m, wr: Math.round((m.w / m.n) * 100) }))
    .sort((a, b) => b.wr - a.wr)
    .slice(0, k);
}

// 팀별 그룹 — 기본 접힘, 헤더 클릭으로 펼침. 검색 중이거나 선택 선수의 팀은 자동 펼침 (작업2)
function plTeamGroups(D: DataBundle, players: Player[], selName: string, act: string, ui: PlayerUI): string {
  if (!players.length) return nod("조건에 맞는 선수가 없어요. 검색어나 역할 필터를 바꿔 보세요.");
  const byTeam = new Map<string, Player[]>();
  players.forEach((p) => {
    const arr = byTeam.get(p.team) || [];
    arr.push(p);
    byTeam.set(p.team, arr);
  });
  const order = [...D.teamNames.filter((t) => byTeam.has(t)), ...[...byTeam.keys()].filter((t) => !D.teamNames.includes(t))];
  const searching = !!ui.search.trim();
  return order.map((t) => {
    const ps = byTeam.get(t)!.sort((a, b) => b.n - a.n);
    const open = searching || ui.openTeams.includes(t) || ps.some((p) => p.name === selName);
    const chips = open
      ? `<div class="plchips">${ps.map((p) => `<button class="plchip ${p.name === selName ? "on" : ""}" data-act="${act}" data-val="${esc(p.name)}">${esc(p.name)} <span class="mini">${p.n}</span></button>`).join("")}</div>`
      : "";
    return `<div class="plteam">
      <button class="plteam-h ${t === D.us ? "zan" : ""}" data-act="team-toggle" data-val="${esc(t)}"><span class="caret">${open ? "▾" : "▸"}</span> ${esc(t)} <span class="mini">${ps.length}명</span></button>
      ${chips}</div>`;
  }).join("");
}

function playerCard(D: DataBundle, p: Player): string {
  const th = topHero(p);
  const sm = strongMaps(p, 2);
  return `<div class="pcard">
    <div class="pc-name">${esc(p.name)}</div>
    <div class="pc-meta">${esc(ROLE_KO[repRole(p.roles)] || repRole(p.roles))} · <span class="${p.team === D.us ? "zan" : ""}">${esc(p.team)}</span> · ${p.n}세트</div>
    <div class="pc-tags">대표 영웅 ${th ? heroChip(th.hero) : "-"}${th ? ` <span class="mini">${th.n}회</span>` : ""}
      &nbsp;·&nbsp; 강점 맵 ${sm.length ? sm.map((m) => `${mk(m.map)} <span class="wr ${wrCls(m.wr)}">${m.wr}%</span>`).join(", ") : '<span class="mini">아직 적어요</span>'}</div>
  </div>`;
}

// 작업1: 영웅 행을 펼치면 맵별 승률 + 함께한 조합
function heroDetail(D: DataBundle, p: Player, hero: string): string {
  const cells = Object.values(p.cells).filter((c) => c.hero === hero).sort((a, b) => b.n - a.n);
  const mapRows = cells.length
    ? cells.map((c) => {
        const wr = c.n ? Math.round((c.w / c.n) * 100) : 0;
        const low = c.n < 3;
        return `<div class="hd-map"><span class="hd-mapn">${mk(c.map)}</span><span class="mini">${c.w}-${c.n - c.w}</span><span class="${low ? "mini" : "wr " + wrCls(wr)}">${low ? "표본&lt;3" : wr + "%"}</span></div>`;
      }).join("")
    : nod("맵 기록이 없어요.");

  const comps: Array<{ date: string; map: string; won: boolean; mates: Player["cells"][string][] | { player: string; hero: string }[] }> = [];
  D.sets.forEach((s) => {
    const side = s.top === p.team ? s.picks.top : s.bottom === p.team ? s.picks.bottom : null;
    if (!side) return;
    const me = side.find((x) => x.player === p.name && x.hero === hero);
    if (!me) return;
    const mates = side.filter((x) => x !== me && (x.player || x.hero));
    comps.push({ date: s.date, map: s.map, won: s.winner === p.team, mates });
  });
  comps.sort((a, b) => (a.date < b.date ? 1 : -1));
  const compRows = comps.length
    ? comps.map((c) => {
        const line = [{ player: p.name, hero }, ...(c.mates as { player: string; hero: string }[])]
          .map((m) => `<span class="lu-p">${heroIcon(m.hero || "")}<span>${esc(m.player || "?")}</span></span>`).join("");
        return `<div class="hd-comp ${c.won ? "w" : "l"}"><div class="hd-comp-head"><span class="mini">${fmtDate(c.date)}</span> <b>${mk(c.map)}</b> <span class="${c.won ? "ww" : "ll"}">${c.won ? "승" : "패"}</span></div><div class="hd-line">${line}</div></div>`;
      }).join("")
    : nod("함께한 조합 기록이 없어요.");

  return `<div class="herodetail-inner">
    <div class="hd-col"><div class="sub-note">맵별 승률 <span class="mini">많이 쓴 순 · 3경기 미만은 표본&lt;3</span></div>${mapRows}</div>
    <div class="hd-col"><div class="sub-note">함께한 조합 <span class="mini">같은 팀 5인 · 맵 · 승패</span></div><div class="hd-comps">${compRows}</div></div>
  </div>`;
}
function heroTable(D: DataBundle, p: Player, heroExpand: string): string {
  const heroes = Object.values(p.heroes).sort((a, b) => b.n - a.n);
  if (!heroes.length) return nod("아직 기록된 영웅이 없어요. 선픽이 입력되면 채워져요.");
  const mx = Math.max(1, ...heroes.map((h) => h.n));
  return `<table class="herotable"><thead><tr><th>영웅</th><th class="num">사용</th><th class="num">승-패</th><th class="num">승률</th><th>빈도</th><th></th></tr></thead><tbody>${heroes.map((h) => {
    const wr = playerWR(h);
    const open = heroExpand === h.hero;
    const row = `<tr class="herorow ${open ? "open" : ""}" data-act="hero-expand" data-val="${esc(h.hero)}">
      <td class="hname">${heroChip(h.hero)}</td>
      <td class="num">${h.n}</td>
      <td class="num">${h.w}-${h.n - h.w}</td>
      <td class="num">${h.n >= 3 ? `<span class="wr ${wrCls(wr)}">${wr}%</span>` : '<span class="mini">표본&lt;3</span>'}</td>
      <td><div class="tr mini-tr"><div class="fl" style="width:${Math.round((h.n / mx) * 100)}%"></div></div></td>
      <td class="num caret">${open ? "▾" : "▸"}</td></tr>`;
    return open ? row + `<tr class="herodetail"><td colspan="6">${heroDetail(D, p, h.hero)}</td></tr>` : row;
  }).join("")}</tbody></table>`;
}
// 영웅×맵 강점 히트맵 (13.3)
function heroMapHeatmap(p: Player): string {
  const cells = Object.values(p.cells);
  if (!cells.length) return nod("아직 기록이 없어요. 선픽이 입력되면 채워져요.");
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
  const head = `<tr><th class="hm-corner"></th>${maps.map((m) => `<th class="hm-mh" title="${esc(mapKo(m))}">${mk(m)}</th>`).join("")}</tr>`;
  const rows = heroes.map((h) => {
    const tds = maps.map((m) => {
      const c = cm[`${h} ${m}`];
      if (!c) return `<td class="hm empty">·</td>`;
      const wr = c.n ? Math.round((c.w / c.n) * 100) : 0;
      const cls = c.n >= 3 ? `hm-${wrCls(wr)}` : "hm-low";
      return `<td class="hm ${cls}" title="${esc(heroKo(h))} @ ${esc(mapKo(m))} — ${c.w}승 ${c.n - c.w}패">${c.n >= 3 ? `<span class="hm-wr">${wr}%</span>` : ""}<span class="hm-n">${c.n}</span></td>`;
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
    return `<div class="panel"><h2>선수 분석</h2>${nod("아직 선수 기록이 없어요.")}
      <div class="sub-note" style="margin-top:12px">시트의 <b>상수팀 첫픽 / 하수팀 첫픽</b> 칸(역할별 선수명·영웅)을 채우면 여기에 자동으로 나타나요.</div></div>`;
  }
  const all = D.playerNames.map((n) => D.players[n]);
  const a = D.players[ui.playerA] || all[0];
  const q = ui.search.trim().toLowerCase();

  let listP = all;
  if (q) listP = listP.filter((p) => p.name.toLowerCase().includes(q));
  if (ui.role !== "all") listP = listP.filter((p) => repRole(p.roles) === ui.role);

  let cand = all.filter((p) => p.name !== a.name);
  if (q) cand = cand.filter((p) => p.name.toLowerCase().includes(q));
  if (!ui.compareAll) cand = cand.filter((p) => repRole(p.roles) === repRole(a.roles));

  const b = ui.playerB && ui.playerB !== a.name ? D.players[ui.playerB] : null;

  return `
    <div class="panel">
      <h2>선수 선택 <span class="count">${listP.length}/${D.playerNames.length}명 · 첫 조합(오프닝) 기준</span></h2>
      <div class="sub-note">위에서 이름으로 검색하거나 역할로 거를 수 있어요. 팀 이름을 누르면 그 팀 선수가 펼쳐져요.</div>
      <div class="plteams">${plTeamGroups(D, listP, a.name, "player", ui)}</div>
    </div>
    <div class="panel">
      ${playerCard(D, a)}
      <div class="sub-note" style="margin-top:8px">경기 시작 조합(오프닝) 기준이에요. 경기 도중 바꾼 영웅은 빠져 있어요.</div>
      <div class="grid2" style="margin-top:14px">
        <div><h2 style="margin-bottom:10px">영웅별 성적 <span class="count">행을 누르면 맵별·조합별로 펼침</span></h2>${heroTable(D, a, ui.heroExpand)}</div>
        <div><h2 style="margin-bottom:10px">맵별 강점 <span class="count">막대=사용량, 승률은 3경기 이상</span></h2><div class="bars">${mapStrength(a)}</div></div>
      </div>
    </div>
    <div class="panel">
      <h2>영웅 × 맵 강점 <span class="count">어떤 영웅을 어떤 맵에서 잘하는지</span></h2>
      ${heroMapHeatmap(a)}
    </div>
    <div class="panel">
      <h2>선수 비교 <span class="count">${b ? `${esc(a.name)} vs ${esc(b.name)}` : "대상을 고르면 좌우 비교"}</span></h2>
      <div class="metabar" style="margin-bottom:12px">
        <span class="flabel">후보</span>
        <button class="clearbtn" data-act="compare-all-toggle">${ui.compareAll ? "같은 역할만 보기" : "전체 역할 보기"}</button>
        ${b ? `<button class="clearbtn" data-act="compareclear">비교 닫기 ✕</button>` : ""}
      </div>
      <div class="plteams">${plTeamGroups(D, cand, ui.playerB, "compare", ui)}</div>
    </div>
    ${b ? renderPlayerDiff(D, a, b) : ""}`;
}
function mapStrength(p: Player): string {
  const maps = Object.values(p.maps).sort((a, b) => b.n - a.n);
  if (!maps.length) return nod("아직 맵 기록이 없어요.");
  const mx = Math.max(1, ...maps.map((m) => m.n));
  return maps.map((m) => {
    const wr = m.n ? Math.round((m.w / m.n) * 100) : 0;
    return `<div class="bar"><span class="lab">${mk(m.map)}</span><div class="tr"><div class="fl ${wrCls(wr)}-fl" style="width:${Math.round((m.n / mx) * 100)}%"></div></div><span class="vl">${m.w}-${m.n - m.w}${m.n >= 3 ? `·${wr}%` : ""}</span></div>`;
  }).join("");
}

// ===== PLAYER DIFF (14) =====
function renderPlayerDiff(D: DataBundle, a: Player, b: Player): string {
  const aHeroes = new Set(Object.keys(a.heroes));
  const bHeroes = new Set(Object.keys(b.heroes));
  const common = [...aHeroes].filter((h) => bHeroes.has(h)).sort((x, y) => (b.heroes[y].n + a.heroes[y].n) - (b.heroes[x].n + a.heroes[x].n));
  const aOnly = [...aHeroes].filter((h) => !bHeroes.has(h)).sort((x, y) => a.heroes[y].n - a.heroes[x].n);
  const bOnly = [...bHeroes].filter((h) => !aHeroes.has(h)).sort((x, y) => b.heroes[y].n - b.heroes[x].n);

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
      const small = ha.n < 3 || hb.n < 3;
      const gap = !small ? Math.abs(wa - wb) >= 20 : false;
      return `<div class="diffrow${gap ? " gap" : ""}">
        <div class="dr-a"><span class="dr-wr ${small ? "mini" : wrCls(wa)}">${ha.n >= 3 ? wa + "%" : "표본&lt;3"}</span> <span class="mini">${ha.w}-${ha.n - ha.w}</span></div>
        <div class="dr-hero">${heroChip(h)}</div>
        <div class="dr-b"><span class="mini">${hb.w}-${hb.n - hb.w}</span> <span class="dr-wr ${small ? "mini" : wrCls(wb)}">${hb.n >= 3 ? wb + "%" : "표본&lt;3"}</span></div>
      </div>`;
    }).join("");
  }

  const uniqList = (arr: string[], p: Player) =>
    arr.length ? arr.map((h) => `<span class="utag">${heroChip(h)} <span class="mini">${p.heroes[h].n}</span></span>`).join("") : `<span class="mini">없음</span>`;
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
        <div><div class="sub-note">${esc(a.name)} 고유 영웅</div><div class="utags">${uniqList(aOnly, a)}</div></div>
        <div><div class="sub-note">${esc(b.name)} 고유 영웅</div><div class="utags">${uniqList(bOnly, b)}</div></div>
      </div>
    </div>`;
}

// ===== ESTIMATOR (12) — 가중 합산 휴리스틱 =====
export interface EstInput {
  map: string;
  dps1: string;
  dps2: string;
  tank: string;
  sup1: string;
  sup2: string;
  opp: string;
}
function heroSelect(act: string, role: keyof typeof HEROES, val: string, label: string): string {
  return `<label class="estfield"><span class="estlabel">${label}</span>
    <select data-act="${act}"><option value="" ${!val ? "selected" : ""}>— 선택 —</option>${HEROES[role].map((h) => `<option ${h === val ? "selected" : ""}>${esc(h)}</option>`).join("")}</select></label>`;
}
export function renderEstimator(D: DataBundle, e: EstInput): string {
  const Z = D.teams[D.us];
  const maps = Object.keys(D.mapInfo).sort((a, b) => (D.mapInfo[a] || "").localeCompare(D.mapInfo[b] || "") || a.localeCompare(b));
  const mapSel = `<select data-act="est-map"><option value="" ${!e.map ? "selected" : ""}>— 맵 선택 —</option>${maps.map((m) => `<option ${m === e.map ? "selected" : ""}>${esc(m)} (${MODE_KO[D.mapInfo[m]] || D.mapInfo[m]})</option>`).join("")}</select>`;
  const oppSel = `<select data-act="est-opp"><option value="" ${!e.opp ? "selected" : ""}>(선택) 상대 없음</option>${D.teamNames.filter((n) => n !== D.us).map((n) => `<option ${n === e.opp ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;

  const mode = e.map ? D.mapInfo[e.map] || "" : "";
  const heroes = [e.dps1, e.dps2, e.tank, e.sup1, e.sup2].filter(Boolean);

  // ----- 요인 계산 -----
  type Factor = { key: string; label: string; weight: number; active: boolean; wr: number | null; contrib: number; sample: number; note: string };
  const factors: Factor[] = [];

  // 12.3.1 모드·맵 성적
  if (mode && Z) {
    const md = Z.modes[mode];
    const mapRec = e.map && Z.maps[e.map] ? Z.maps[e.map] : null;
    const modeSample = md ? md.t : 0;
    let wr: number | null = null, sample = 0, note = "";
    if (mapRec && mapRec.w + mapRec.l >= EST_THRESH.modeMaps) {
      sample = mapRec.w + mapRec.l;
      wr = mapRec.w / sample;
      note = `해당 맵 표본 ${sample}`;
    } else if (md && modeSample >= EST_THRESH.modeMaps) {
      sample = modeSample;
      wr = md.w / md.t;
      note = `${MODE_KO[mode] || mode} 모드 표본 ${sample}맵`;
    } else {
      note = `데이터 부족 (모드 ${modeSample}맵 < ${EST_THRESH.modeMaps})`;
    }
    factors.push({ key: "mapMode", label: "ZANSIDE 모드·맵 성적", weight: EST_WEIGHTS.mapMode, active: wr != null, wr, contrib: wr != null ? wr - 0.5 : 0, sample, note });
  }

  // 12.3.2 상대 성적
  if (e.opp && mode) {
    const O = D.teams[e.opp];
    const md = O ? O.modes[mode] : null;
    const mapRec = O && e.map && O.maps[e.map] ? O.maps[e.map] : null;
    let wr: number | null = null, sample = 0, note = "";
    if (mapRec && mapRec.w + mapRec.l >= EST_THRESH.modeMaps) {
      sample = mapRec.w + mapRec.l;
      wr = mapRec.w / sample;
      note = `${esc(e.opp)} 해당 맵 표본 ${sample}`;
    } else if (md && md.t >= EST_THRESH.modeMaps) {
      sample = md.t;
      wr = md.w / md.t;
      note = `${esc(e.opp)} ${MODE_KO[mode] || mode} 표본 ${sample}맵`;
    } else {
      note = `${esc(e.opp)} 데이터 부족`;
    }
    // 상대 승률이 높을수록 우리 추정 ↓
    factors.push({ key: "opponent", label: "상대 모드·맵 성적", weight: EST_WEIGHTS.opponent, active: wr != null, wr, contrib: wr != null ? 0.5 - wr : 0, sample, note });
  }

  // 12.3.3 영웅 신호
  if (heroes.length) {
    let w = 0, l = 0;
    heroes.forEach((h) => {
      const sig = D.usHeroSignal[h];
      if (sig) { w += sig.w; l += sig.l; }
    });
    const appear = w + l;
    let wr: number | null = null, note = "";
    if (appear >= EST_THRESH.heroAppear) {
      wr = w / appear;
      note = `선택 영웅 누적 등장 ${appear}회`;
    } else {
      note = `데이터 부족 (등장 ${appear} < ${EST_THRESH.heroAppear})`;
    }
    factors.push({ key: "heroSignal", label: "영웅 신호 (선픽)", weight: EST_WEIGHTS.heroSignal, active: wr != null, wr, contrib: wr != null ? wr - 0.5 : 0, sample: appear, note });
  }

  // 12.3.4 밴 리스크 (승률 입력 아님 — 경고 배지)
  const banWarn: string[] = [];
  if (e.opp && heroes.length) {
    const O = D.teams[e.opp];
    if (O) {
      const fbTop = topN(O.firstBan, 4).map((x) => x[0]);
      heroes.forEach((h) => { if (fbTop.includes(h)) banWarn.push(h); });
    }
  }

  // ----- 종합 -----
  const active = factors.filter((f) => f.active);
  const hasMap = !!e.map;
  let resultHtml: string;
  if (!hasMap) {
    resultHtml = nod("맵을 먼저 선택하세요.");
  } else if (!active.length) {
    resultHtml = `<div class="est-empty"><div class="est-big">데이터 부족</div>
      <div class="sub-note">추정에 쓸 표본이 없습니다. 더 필요한 데이터: ${esc(mode ? `${MODE_KO[mode] || mode} 모드 경기 ${EST_THRESH.modeMaps}맵 이상` : "맵·모드 경기")}, 또는 세트별 5인 로스터 입력.</div></div>`;
  } else {
    const wsum = active.reduce((a, f) => a + f.weight, 0);
    const contrib = active.reduce((a, f) => a + f.weight * f.contrib, 0) / wsum;
    let est = 0.5 + contrib;
    est = Math.max(0.05, Math.min(0.95, est));
    const minSample = Math.min(...active.map((f) => f.sample));
    const band = Math.round((minSample >= 8 ? 8 : minSample >= 5 ? 12 : 18)); // 표본 작을수록 밴드 ↑
    const pct = Math.round(est * 100);
    resultHtml = `<div class="est-result">
      <div class="est-big"><span class="wr ${wrCls(pct)}">${pct}%</span></div>
      <div class="est-band">추정 밴드 ${Math.max(0, pct - band)}% ~ ${Math.min(100, pct + band)}% · 최소 표본 ${minSample}</div>
      <div class="sub-note">이것은 예측이 아니라 <b>가중 합산 추정</b>입니다 (학습 모델 아님).</div>
    </div>`;
  }

  const factorRows = factors.length
    ? factors.map((f) => {
        const pct = f.wr != null ? Math.round(f.wr * 100) : null;
        const contribPct = f.active ? `${f.contrib >= 0 ? "+" : ""}${Math.round(f.weight * f.contrib * 100)}p` : "—";
        return `<div class="frow ${f.active ? "" : "off"}">
          <span class="fl-label">${f.label}<span class="fw">가중치 ${Math.round(f.weight * 100)}%</span></span>
          <span class="fl-wr">${pct != null ? `${pct}%` : '<span class="mini">-</span>'}</span>
          <span class="fl-contrib">${contribPct}</span>
          <span class="fl-note mini">${f.note}</span>
        </div>`;
      }).join("")
    : nod("영웅·맵을 선택하면 요인이 표시됩니다.");

  const banBadge = banWarn.length
    ? `<div class="banwarn">⚠ 밴 리스크: <b>${banWarn.map(esc).join(", ")}</b> — ${esc(e.opp)} 선밴 상위. 밴당할 가능성 (승률 입력 아님).</div>`
    : "";

  return `
    <div class="panel">
      <h2>모의 로스터 & 승률 추정 <span class="count">투명한 가중 합산식 · 예측 아님</span></h2>
      <div class="sub-note">맵과 우리 5인 영웅을 고르면 과거 기록을 바탕으로 한 <b>추정</b>치와 그 근거를 보여줍니다. 기록이 적으면 "데이터 부족"으로 나와요.</div>
      <div class="estgrid">
        <label class="estfield"><span class="estlabel">맵 (모드 자동)</span>${mapSel}</label>
        <label class="estfield"><span class="estlabel">상대 (선택)</span>${oppSel}</label>
        ${heroSelect("est-dps1", "DPS", e.dps1, "딜러 1")}
        ${heroSelect("est-dps2", "DPS", e.dps2, "딜러 2")}
        ${heroSelect("est-tank", "Tank", e.tank, "탱커")}
        ${heroSelect("est-sup1", "Support", e.sup1, "서포터 1")}
        ${heroSelect("est-sup2", "Support", e.sup2, "서포터 2")}
      </div>
    </div>
    <div class="grid2">
      <div class="panel">
        <h2>추정 결과</h2>
        ${resultHtml}
        ${banBadge}
      </div>
      <div class="panel">
        <h2>요인 분해 <span class="count">가중치는 코드 상수</span></h2>
        <div class="frows"><div class="frow head"><span class="fl-label">요인</span><span class="fl-wr">승률</span><span class="fl-contrib">기여</span><span class="fl-note mini">표본/메모</span></div>${factorRows}</div>
        <div class="sub-note" style="margin-top:10px">기여 = 가중치 × (승률 − 50%). 활성 요인 가중치 합으로 정규화해 50%에 더합니다.</div>
      </div>
    </div>`;
}
