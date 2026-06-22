// 렌더 레이어 — 순수 함수가 섹션 HTML 문자열을 만든다 (React 의존 없음).
// 상호작용 컨트롤은 data-act / data-val 속성을 달고, Dashboard 가 위임 처리한다.
import {
  MODE_KO, MODE_ORDER, ROLE_KO, HEROES, EST_WEIGHTS, EST_THRESH, heroKo, mapKo, HERO_ROLE,
} from "./constants";
import type { DataBundle, Pick, Player, SetRec, Series, Standing, Team } from "./types";
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
      tend.push(`밀기 ${op.pushW}승 ${op.pushL}패(${pr}%)${pr >= 60 ? " — 밀기가 강한 편이에요." : "."}`);
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
// 팀의 영웅 픽 집계 (맵세트·팀 중복제거)
function teamHeroPicks(D: DataBundle, team: string): Record<string, { n: number; w: number }> {
  const picks: Record<string, { n: number; w: number }> = {};
  D.sets.forEach((s) => {
    const side = s.top === team ? s.picks.top : s.bottom === team ? s.picks.bottom : null;
    if (!side) return;
    const won = setWinner(s) === team;
    const seen = new Set<string>();
    side.forEach((p) => {
      if (!p.hero || seen.has(p.hero)) return;
      seen.add(p.hero);
      const a = (picks[p.hero] = picks[p.hero] || { n: 0, w: 0 });
      a.n++;
      if (won) a.w++;
    });
  });
  return picks;
}
function heroPickBars(obj: Record<string, { n: number; w: number }>, n: number): string {
  const arr = Object.entries(obj).sort((a, b) => b[1].n - a[1].n).slice(0, n);
  if (!arr.length) return nod("픽 기록이 없어요.");
  const mx = Math.max(1, ...arr.map((x) => x[1].n));
  return arr.map(([h, r]) => {
    const wr = r.n ? Math.round((r.w / r.n) * 100) : 0;
    const low = r.n === 1;
    return `<div class="bar"><span class="lab">${heroChip(h)}</span><div class="tr"><div class="fl blu" style="width:${Math.round((r.n / mx) * 100)}%"></div></div><span class="vl">${r.n}${low ? "" : `·${wr}%`}</span></div>`;
  }).join("");
}
function teamMapSummary(T: Team): string {
  const maps = Object.entries(T.maps).map(([map, r]) => ({ map, w: r.w, l: r.l, n: r.w + r.l })).sort((a, b) => b.n - a.n);
  if (!maps.length) return nod("맵 기록이 없어요.");
  return `<table><thead><tr><th>맵</th><th class="num">출전</th><th class="num">승-패</th><th class="num">승률</th></tr></thead><tbody>${maps.map((m) => {
    const wr = m.n ? Math.round((m.w / m.n) * 100) : 0;
    const low = m.n === 1;
    return `<tr><td class="hname">${mk(m.map)}</td><td class="num">${m.n}${low ? ' <span class="lowsmp">⚠</span>' : ""}</td><td class="num">${m.w}-${m.l}</td><td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span></td></tr>`;
  }).join("")}</tbody></table>`;
}

// 선수 한 명: 강점 영웅(승률 상위 2~3) + 약점 영웅(승률 하위)
function playerHeroRow(p: Player): string {
  const heroes = Object.values(p.heroes).filter((h) => h.n >= 1).map((h) => ({ ...h, wr: Math.round((h.w / h.n) * 100) }));
  const byWr = heroes.slice().sort((a, b) => b.wr - a.wr || b.n - a.n);
  const strong = byWr.slice(0, 3);
  const strongSet = new Set(strong.map((h) => h.hero));
  const weak = byWr.slice().reverse().filter((h) => !strongSet.has(h.hero)).slice(0, 2);
  const chip = (h: { hero: string; n: number; wr: number }) => `<span class="hsum">${heroChip(h.hero)}<span class="wr ${wrCls(h.wr)}">${h.wr}%</span><span class="mini">${h.n}${h.n === 1 ? "⚠" : ""}</span></span>`;
  return `<div class="phrow"><span class="phn">${esc(p.name)}</span>
    <span class="phg"><span class="ph-lab good">강점</span>${strong.length ? strong.map(chip).join("") : '<span class="mini">표본 부족</span>'}</span>
    <span class="phg"><span class="ph-lab bad">약점</span>${weak.length ? weak.map(chip).join("") : '<span class="mini">—</span>'}</span></div>`;
}
// 모드(맵 종류)별 요약: 잘하는 맵 / 못하는 맵 + 그 모드에서 자주 한 밴
function scoutMapByMode(D: DataBundle, team: string, T: Team): string {
  const byMode: Record<string, Array<{ map: string; n: number; wr: number }>> = {};
  Object.entries(T.maps).forEach(([map, r]) => {
    const n = r.w + r.l;
    (byMode[r.mode] = byMode[r.mode] || []).push({ map, n, wr: n ? Math.round((r.w / n) * 100) : 0 });
  });
  const banByMode: Record<string, Record<string, number>> = {};
  D.sets.forEach((s) => s.bans.forEach((b) => { if (b.team === team && b.hero) (banByMode[s.mode] = banByMode[s.mode] || {})[b.hero] = ((banByMode[s.mode] || {})[b.hero] || 0) + 1; }));
  const modes = MODE_ORDER.filter((m) => byMode[m]);
  if (!modes.length) return nod("맵 기록이 없어요.");
  return modes.map((m) => {
    const maps = byMode[m].slice().sort((a, b) => b.wr - a.wr);
    const high = maps.filter((x) => x.n >= 1 && x.wr >= 50);
    const low = maps.filter((x) => x.n >= 1 && x.wr < 50);
    const bans = topN(banByMode[m] || {}, 3);
    const line = (arr: typeof maps) => arr.length ? arr.map((x) => `${mk(x.map)} <span class="wr ${wrCls(x.wr)}">${x.wr}%</span><span class="mini">(${x.n})</span>`).join(" · ") : '<span class="mini">—</span>';
    return `<div class="modesum">
      <div class="modesum-h">${MODE_KO[m] || m}</div>
      <div class="modesum-r"><span class="ph-lab good">잘함</span> ${line(high)}</div>
      <div class="modesum-r"><span class="ph-lab bad">못함</span> ${line(low)}</div>
      <div class="modesum-r"><span class="mini">밴</span> ${bans.length ? bans.map(([h, n]) => `${esc(heroKo(h))} <span class="mini">${n}</span>`).join(" · ") : '<span class="mini">—</span>'}</div>
    </div>`;
  }).join("");
}
// 경기별 분석 카드 — 4줄 압축 (승패=focus팀 기준)
function scoutGameCard(D: DataBundle, s: SetRec, focus: string): string {
  const won = setWinner(s) === focus;
  const opp = s.top === focus ? s.bottom : s.top;
  const fmtSc = (sc: SetRec["ws"]) => (sc ? (sc.kind === "dist" ? Math.round(sc.val) + "m" : String(sc.val)) : "·");
  const fScore = won ? fmtSc(s.ws) : fmtSc(s.ls);
  const oScore = won ? fmtSc(s.ls) : fmtSc(s.ws);
  const picker = s.picker && s.picker !== "ADMIN" ? s.picker : "";
  const fb = s.bans.find((b) => b.phase === "first");
  const sb = s.bans.find((b) => b.phase === "second");
  const order: Record<string, number> = { Tank: 0, DPS: 1, Support: 2 };
  const swaps = swapsByPlayer(s.memo); // 메모에서 선수별 교체 영웅
  const lineupRow = (name: string, picks: Pick[], isFocus: boolean) => {
    if (!picks.length) return `<div class="gl-row"><span class="gl-team ${isFocus ? "zan2" : ""}">${esc(name)}</span> <span class="mini">라인업 미기록</span></div>`;
    const sorted = picks.slice().sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
    return `<div class="gl-row"><span class="gl-team ${isFocus ? "zan2" : ""}">${esc(name)}</span>${sorted.map((p) => {
      const sw = swaps[p.player] || [];
      return `<span class="gl-p">${heroIcon(p.hero || "")}<span>${esc(p.player || "?")}</span><span class="mini">${ROLE_KO[p.role] || ""}</span>${sw.map((h) => `<span class="swp">→${heroIcon(h)}</span>`).join("")}</span>`;
    }).join("")}</div>`;
  };
  const copyIcon = s.replay ? `<span class="gc2-rep"><span class="repcode">${esc(s.replay)}</span><button class="copyb copyicon" data-act="copy" data-val="${esc(s.replay)}" title="리플레이 코드 복사"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button></span>` : "";
  return `<div class="panel gamecard2 ${won ? "win" : "loss"}">
    <div class="gc2-l1"><span class="gc2-res ${won ? "win" : "loss"}">${won ? "승리" : "패배"}</span> <span class="mini">${esc(s.match)} · ${fmtDate(s.date)}</span> <span>vs <b>${esc(opp)}</b></span>${copyIcon}</div>
    <div class="gc2-l2"><b>${mk(s.map)}</b> <span class="mini">(${esc(MODE_KO[s.mode] || s.mode)})</span>${picker ? ` · <span class="mini">맵 픽 ${esc(picker)}</span>` : ""} · <span class="mono">${fScore}-${oScore}</span></div>
    <div class="gc2-l3">${fb ? `<span class="mini">선밴</span> ${heroChip(fb.hero)}` : ""}${fb && sb ? ' <span class="mini">·</span> ' : ""}${sb ? `<span class="mini">후밴</span> ${heroChip(sb.hero)}` : ""}${!fb && !sb ? '<span class="mini">밴 없음</span>' : ""}</div>
    <div class="gc2-l4"><div class="mini" style="margin-bottom:5px">오프닝 픽</div>${lineupRow(s.top, s.picks.top, s.top === focus)}${lineupRow(s.bottom, s.picks.bottom, s.bottom === focus)}</div>
    ${s.memo ? `<div class="gc2-memo"><span class="mini">경기 중 교체·메모</span> ${renderMemo(s.memo)}</div>` : ""}
    <div class="gc2-load"><button class="loadbtn" data-act="load-sim" data-val="${esc(setKey(s))}">이 경기로 시뮬레이션 채우기 ↗</button></div>
  </div>`;
}
export interface DeepUI { agg: "main" | "swap"; sort: "pick" | "wr"; smp: number; banExpand: string; }
// 승률 한 줄 (막대 + % + N승-N패 + 표본). 0이면 '결정 경기 없음', <3맵이면 회색+표본<3
function wrLine(label: string, w: number, l: number, max: number, suffix = ""): string {
  const n = w + l;
  if (n === 0) return `<div class="wrline empty"><span class="wl-lab">${label}</span><span class="wl-val mini">결정 경기 없음${suffix}</span></div>`;
  const wr = Math.round((w / n) * 100);
  const low = n < 3;
  return `<div class="wrline ${low ? "lowsmp-row" : ""}"><span class="wl-lab">${label}</span><div class="wl-bar"><div class="fl ${wrCls(wr)}-fl" style="width:${Math.round((n / Math.max(1, max)) * 100)}%"></div></div><span class="wl-val"><b>${wr}%</b> <span class="mini">${w}-${l} · ${n}맵${low ? ' <span class="lowsmp">표본&lt;3</span>' : ""}</span>${suffix}</span></div>`;
}
const roleBadge = (r: string) => `<span class="rtag ${r}">${({ Tank: "탱", DPS: "딜", Support: "힐" } as Record<string, string>)[r] || "?"}</span>`;

function renderScoutDeep(D: DataBundle, team: string, deep: DeepUI): string {
  const teamSets = D.sets.filter((s) => s.top === team || s.bottom === team);
  const sideOf = (s: SetRec) => (s.top === team ? s.picks.top : s.picks.bottom);
  const oppOf = (s: SetRec) => (s.top === team ? s.bottom : s.top);

  // ── 블록 1: 쟁탈 맵 승률 (거점 세부는 시트에 없어 맵 단위) ──
  const ctrl: Record<string, { w: number; l: number; u: number }> = {};
  teamSets.filter((s) => s.mode === "Control").forEach((s) => {
    const m = (ctrl[s.map] = ctrl[s.map] || { w: 0, l: 0, u: 0 });
    const w = setWinner(s);
    if (!w) m.u++; else if (w === team) m.w++; else m.l++;
  });
  const ctrlRows = Object.entries(ctrl).sort((a, b) => (b[1].w + b[1].l) - (a[1].w + a[1].l));
  const ctrlMax = Math.max(1, ...ctrlRows.map(([, r]) => r.w + r.l));
  const block1 = ctrlRows.length
    ? ctrlRows.map(([map, r]) => wrLine(mk(map), r.w, r.l, ctrlMax, r.u ? ` <span class="mini">· ${r.u}미기록</span>` : "")).join("")
    : nod("쟁탈 경기 기록이 없어요.");

  // ── 블록 2: 영웅별 픽률·승률 ──
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
  let heroArr = Object.entries(heroAgg).map(([hero, r]) => ({ hero, ...r, wr: r.n ? Math.round((r.w / r.n) * 100) : 0, rate: teamMaps ? Math.round((r.n / teamMaps) * 100) : 0 }));
  if (deep.smp) heroArr = heroArr.filter((h) => h.n >= deep.smp);
  heroArr.sort((a, b) => deep.sort === "wr" ? (b.wr - a.wr || b.n - a.n) : (b.n - a.n || b.wr - a.wr));
  const seg = (act: string, cur: string, opts: Array<[string, string]>) => `<div class="seg">${opts.map(([v, lb]) => `<button class="${cur === v ? "on" : ""}" data-act="${act}" data-val="${v}">${lb}</button>`).join("")}</div>`;
  const block2Toggles = `<div class="metabar">
    <span class="flabel">기준</span>${seg("deep-agg", deep.agg, [["main", "메인 픽"], ["swap", "교체 포함"]])}
    <span class="flabel">정렬</span>${seg("deep-sort", deep.sort, [["pick", "픽 많은 순"], ["wr", "승률 높은 순"]])}
    <span class="flabel">표본</span>${seg("deep-smp", String(deep.smp), [["0", "전체"], ["2", "2맵+"], ["3", "3맵+"]])}
  </div>`;
  const block2 = heroArr.length
    ? `<table class="herodeep"><thead><tr><th>영웅</th><th>역할</th><th class="num">픽</th><th class="num">픽률</th><th>승률</th><th class="num">전적</th></tr></thead><tbody>${heroArr.map((h) => {
        const low = h.n < 3;
        return `<tr class="${low ? "lowsmp-row" : ""}"><td class="hname">${heroChip(h.hero)}</td><td>${roleBadge(h.role)}</td><td class="num">${h.n}</td><td class="num">${h.rate}%</td><td><div class="tr"><div class="fl ${wrCls(h.wr)}-fl" style="width:${h.wr}%"></div></div></td><td class="num">${h.w}-${h.n - h.w} <b>${h.wr}%</b>${low ? ' <span class="lowsmp">표본&lt;3</span>' : ""}</td></tr>`;
      }).join("")}</tbody></table>`
    : nod("조건에 맞는 영웅이 없어요.");

  // ── 블록 3: 맵 선택권 영향 ──
  const pk = { team: { w: 0, l: 0 }, opp: { w: 0, l: 0 }, none: { w: 0, l: 0 } };
  teamSets.forEach((s) => {
    const w = setWinner(s); if (!w) return; const won = w === team;
    const b = (!s.picker || s.picker === "ADMIN") ? pk.none : s.picker === team ? pk.team : pk.opp;
    b[won ? "w" : "l"]++;
  });
  const pkMax = Math.max(1, pk.team.w + pk.team.l, pk.opp.w + pk.opp.l, pk.none.w + pk.none.l);
  const block3 = wrLine("우리가 맵 선택", pk.team.w, pk.team.l, pkMax) + wrLine("상대가 맵 선택", pk.opp.w, pk.opp.l, pkMax) + wrLine("선택권 없음(쟁탈 등)", pk.none.w, pk.none.l, pkMax);

  // ── 블록 4: 밴 순서별 승률 ──
  const bo = { first: { w: 0, l: 0 }, second: { w: 0, l: 0 } };
  teamSets.forEach((s) => {
    const w = setWinner(s); if (!w) return; const won = w === team;
    const fb = s.bans.find((b) => b.phase === "first");
    const sb = s.bans.find((b) => b.phase === "second");
    if (fb && fb.team === team) bo.first[won ? "w" : "l"]++;
    if (sb && sb.team === team) bo.second[won ? "w" : "l"]++;
  });
  const boMax = Math.max(1, bo.first.w + bo.first.l, bo.second.w + bo.second.l);
  const block4 = wrLine("선밴권일 때", bo.first.w, bo.first.l, boMax) + wrLine("후밴권일 때", bo.second.w, bo.second.l, boMax);

  // ── 블록 5: 밴 경향 (5묶음, 칩 클릭 펼침) ──
  const groups: Record<string, Record<string, number>> = { tf: {}, ts: {}, of: {}, os: {}, lg: {} };
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
  D.sets.forEach((s) => s.bans.forEach((b) => { if (b.hero) groups.lg[b.hero] = (groups.lg[b.hero] || 0) + 1; }));
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
  const block5 = banGroup("tf", `${esc(team)} 선밴`) + banGroup("ts", `${esc(team)} 후밴`) + banGroup("of", `상대가 ${esc(team)}에게 선밴`) + banGroup("os", `상대가 ${esc(team)}에게 후밴`) + banGroup("lg", "전체 최다 피밴");

  return `
    <div class="panel"><h2>① 쟁탈 맵 승률 <span class="count">맵 단위 · 거점 세부는 시트에 없음</span></h2>
      <div class="sub-note">막대=표본(맵 수), 오른쪽에 승률·전적·미기록. 시트에 거점(등대/우물 등) 데이터가 없어 맵 단위로 집계해요.</div>
      <div class="wrlines">${block1}</div></div>
    <div class="panel"><h2>② 영웅별 픽률·승률 <span class="count">${esc(team)} 사용 영웅</span></h2>
      ${block2Toggles}${block2}</div>
    <div class="panel"><h2>③ 맵 선택권 영향 <span class="count">누가 맵을 골랐나</span></h2><div class="wrlines">${block3}</div></div>
    <div class="panel"><h2>④ 밴 순서별 승률 <span class="count">선밴권 / 후밴권</span></h2><div class="wrlines">${block4}</div></div>
    <div class="panel"><h2>⑤ 밴 경향 <span class="count">칩을 누르면 어느 경기인지 펼침</span></h2><div class="bangrps">${block5}</div></div>`;
}

export function renderScout(D: DataBundle, curScout: string, scoutTab: string, deep: DeepUI): string {
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

  const tab = ["summary", "games", "deep"].includes(scoutTab) ? scoutTab : "summary";
  const subtabs = `<div class="subtabs">${[["summary", "요약 분석"], ["games", "경기별 분석"], ["deep", "심층 통계"]].map(([id, lb]) => `<button class="subtab ${tab === id ? "on" : ""}" data-act="scout-tab" data-val="${id}">${lb}</button>`).join("")}</div>`;

  const ms2 = D.series.filter((s) => s.top === curScout || s.bottom === curScout).slice().reverse();
  const fbN = sum(T.firstBan);

  let body: string;
  if (tab === "games") {
    const teamSets = D.sets.filter((s) => s.top === curScout || s.bottom === curScout).slice().reverse();
    body = teamSets.length
      ? teamSets.map((s) => scoutGameCard(D, s, curScout)).join("")
      : nod("이 팀의 경기 기록이 없어요.");
  } else if (tab === "deep") {
    body = renderScoutDeep(D, curScout, deep);
  } else {
    const teamPlayers = D.playerNames.map((n) => D.players[n]).filter((p) => p.team === curScout);
    const byRole: Record<string, Player[]> = { Tank: [], DPS: [], Support: [] };
    teamPlayers.forEach((p) => { const r = repRole(p.roles); if (byRole[r]) byRole[r].push(p); });
    const roleBlocks = (["Tank", "DPS", "Support"] as const).map((role) => {
      const ps = byRole[role].sort((a, b) => b.n - a.n);
      if (!ps.length) return "";
      return `<div class="possum"><div class="possum-role">${ROLE_KO[role]}</div>${ps.map((p) => playerHeroRow(p)).join("")}</div>`;
    }).join("") || nod("선수 기록이 없어요.");
    body = `
      <div class="panel"><h2>영웅별 요약 <span class="count">포지션·선수별 강점/약점 영웅 (승률순, 표본 2+)</span></h2>${roleBlocks}</div>
      <div class="panel"><h2>맵별 요약 <span class="count">모드(맵 종류)별 잘하는/못하는 맵 · 밴</span></h2><div class="modesums">${scoutMapByMode(D, curScout, T)}</div></div>
      <div class="panel"><h2>경기 기록 <span class="count">${ms2.length}시리즈 · 간단 결과</span></h2><div class="sched">${ms2.map((S) => seriesRow(D, S)).join("") || nod()}</div></div>`;
  }

  return `
    <div class="chiprow">${chips}</div>
    <div class="statrow">${cards}</div>
    ${subtabs}
    ${body}`;
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

// ===== ZANSIDE 데이터 (우리 팀 집약 대시보드) =====
export function renderZanside(D: DataBundle, weakExpand: string): string {
  const T = D.teams[D.us];
  const st = standOf(D, D.us);
  if (!T) return `<div class="panel">${nod("ZANSIDE 데이터가 아직 없어요.")}</div>`;
  const diff = T.mapW - T.mapL;
  const up = usUpcoming(D);
  const cards =
    stat("매치 전적", st ? `<span class="ww">${st.win}</span><small> - ${st.lose}</small>` : "—", true) +
    stat("순위", st ? tieRank(D, st) : "—", true) +
    stat("맵 득실", `${diff > 0 ? "+" : ""}${diff}<small> (${T.mapW}-${T.mapL})</small>`, true) +
    stat("잔여 경기", `${up.length}`, true);

  const last = usSeries(D).slice(-6).reverse();
  const form = last.length
    ? last.map((S) => {
        const us = S.top === D.us ? S.topW : S.bottomW;
        const op = S.top === D.us ? S.bottomW : S.topW;
        const opp = S.top === D.us ? S.bottom : S.top;
        const won = us > op;
        return `<div class="fcard ${won ? "w" : "l"}"><div class="res">${won ? "WIN" : "LOSS"}</div><div class="opp">vs ${esc(opp)}</div><div class="meta">${us}-${op} · ${fmtDate(S.date)}</div></div>`;
      }).join("")
    : nod("아직 치른 경기가 없어요.");

  const upcoming = up.length
    ? up.map((g) => {
        const opp = g.a === D.us ? g.b : g.a;
        return `<div class="ucard" tabindex="0" data-act="goscout" data-val="${esc(opp)}"><div class="udt">${esc(g.date)} · ${esc(g.label)}</div><div class="uvs">vs</div><div class="uopp">${esc(opp)}</div><div class="ugo">팀별 분석 보기 →</div></div>`;
      }).join("")
    : nod("예정된 다음 경기가 없어요.");

  const roleOfR = (roles: Record<string, number>) => { const e = Object.entries(roles).sort((a, b) => b[1] - a[1])[0]; return e ? ROLE_KO[e[0]] || e[0] : ""; };
  const rosterHtml = T.roster.length
    ? T.roster.map((p) => `<div class="rcard"><div class="rn">${esc(p.name)}</div><div class="rr">${esc(roleOfR(p.roles))} · ${p.n}맵</div></div>`).join("")
    : nod("로스터 데이터가 없어요.");

  const ms = modeWinrate(T);
  const mmx = Math.max(1, ...ms.map((m) => m[1].t));
  const modesHtml = ms.length ? ms.map(([m, d]) => barWR(MODE_KO[m] || m, d.w, d.t, mmx)).join("") : nod();

  const made: Record<string, number> = { ...T.firstBan };
  Object.entries(T.secondBan).forEach(([h, n]) => (made[h] = (made[h] || 0) + n));

  const usPlayers = D.playerNames.map((n) => D.players[n]).filter((p) => p.team === D.us).sort((a, b) => b.n - a.n);
  const playerHtml = usPlayers.length
    ? usPlayers.map((p) => {
        const th = Object.values(p.heroes).sort((a, b) => b.n - a.n)[0];
        const role = Object.entries(p.roles).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
        return `<button class="plchip" data-act="goplayer" data-val="${esc(p.name)}">${esc(p.name)} <span class="mini">${ROLE_KO[role] || role} · ${p.n}맵${th ? ` · ${esc(heroKo(th.hero))}` : ""}</span></button>`;
      }).join("")
    : nod("선수 데이터가 없어요.");

  return `
    <div class="statrow">${cards}</div>
    <div class="panel"><h2>최근 폼 <span class="count">최근 ${last.length}경기</span></h2><div class="form">${form}</div></div>
    <div class="panel"><h2>잔여 일정 · 다음 상대 <span class="count">카드를 누르면 팀별 분석</span></h2><div class="upc">${upcoming}</div></div>
    <div class="grid2">
      <div class="panel"><h2>현재 로스터 <span class="count">${T.roster.length}명 · 첫픽 기준</span></h2><div class="roster">${rosterHtml}</div></div>
      <div class="panel"><h2>모드별 성적 <span class="count">맵 단위</span></h2><div class="bars">${modesHtml}</div></div>
    </div>
    <div class="grid2">
      <div class="panel"><h2>맵별 성적 <span class="count">출전·승률</span></h2>${teamMapSummary(T)}</div>
      <div class="panel"><h2>영웅별 요약 <span class="count">자주 꺼낸 영웅</span></h2><div class="bars">${heroPickBars(teamHeroPicks(D, D.us), 8)}</div></div>
    </div>
    ${weaknessPanel(D, D.us, true, weakExpand)}
    <div class="grid2">
      <div class="panel"><h2>자주 거는 밴 <span class="count">${sum(made)}회</span> <button class="linkbtn" data-act="goto" data-val="ban">전체 →</button></h2><div class="bars">${countBars(made, "ban")}</div></div>
      <div class="panel"><h2>자주 당하는 밴 <span class="count">${sum(T.banAgainst)}회</span></h2><div class="bars">${countBars(T.banAgainst, "ban")}</div></div>
    </div>
    <div class="panel"><h2>선수별 요약 <span class="count">누르면 선수별 분석으로</span></h2><div class="plchips">${playerHtml}</div></div>`;
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
function banBars(counts: Record<string, number>, f: BanUI, cls = "ban"): string {
  let arr = Object.entries(counts).filter(([h]) => roleOk(h, f.role)).sort((a, b) => b[1] - a[1]);
  if (f.topN > 0) arr = arr.slice(0, f.topN);
  if (!arr.length) return nod("해당 조건의 밴이 없어요.");
  const mx = Math.max(1, ...arr.map((x) => x[1]));
  return arr.map(([h, v]) =>
    `<div class="bar"><span class="lab">${heroChip(h)}</span><div class="tr"><div class="fl ${cls}" style="width:${Math.round((v / mx) * 100)}%"></div></div><span class="vl">${v}</span></div>`
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
  return `<div class="lineup"><span class="lu-team ${zan ? "zan" : ""}">${esc(name)}</span>${lines.map((p) => `<span class="lu-p">${heroIcon(p.hero || "")}<span>${esc(p.player || "?")}</span></span>`).join("")}</div>`;
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

  const Z = D.teams[D.us];
  const made: Record<string, number> = Z ? { ...Z.firstBan } : {};
  if (Z) Object.entries(Z.secondBan).forEach(([h, n]) => (made[h] = (made[h] || 0) + n));

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
    : nod("이 팀의 밴 기록이 없어요.");

  // 모드 → 그 모드의 맵들 (맵별 밴 분포)
  const mapsByMode: Record<string, string[]> = {};
  Object.keys(banByMapH).forEach((map) => { const mode = D.mapInfo[map]; if (mode) (mapsByMode[mode] = mapsByMode[mode] || []).push(map); });
  const modeBlocks = MODE_ORDER.filter((m) => mapsByMode[m]).map((m) => {
    const ms = mapsByMode[m].slice().sort();
    return `<div class="modeban-grp"><div class="modeban-mode">${MODE_KO[m] || m}</div><div class="grid3">${ms.map((map) => `<div><div class="sub-note">${mk(map)}</div><div class="bars">${banBars(banByMapH[map], { ...f, topN: 5 }, "ban")}</div></div>`).join("")}</div></div>`;
  }).join("");

  return `
    ${filterBar}
    <div class="grid2">
      <div class="panel"><h2>리그 선밴 상위</h2><div class="bars">${banBars(gFirst, f)}</div></div>
      <div class="panel"><h2>리그 후밴 상위</h2><div class="bars">${banBars(gSecond, f)}</div></div>
    </div>
    <div class="grid2">
      <div class="panel"><h2>ZANSIDE가 자주 당하는 밴 <span class="count">${Z ? Object.values(Z.banAgainst).reduce((a, b) => a + b, 0) : 0}회</span></h2><div class="bars">${Z ? banBars(Z.banAgainst, f) : nod()}</div></div>
      <div class="panel"><h2>ZANSIDE가 자주 거는 밴 <span class="count">${Object.values(made).reduce((a, b) => a + b, 0)}회</span></h2><div class="bars">${banBars(made, f)}</div></div>
    </div>
    <div class="panel">
      <h2>팀별 밴 성향 <span class="count">${esc(cur)}${banMap !== "all" ? ` · ${esc(mapKo(banMap))}` : ""} · 영웅을 누르면 펼침</span></h2>
      <div class="fbar"><span class="flabel">팀</span>${teamSel}<span class="flabel">맵</span>${mapSel}</div>
      <div class="sub-note">선밴·후밴을 나눠 셉니다. 펼치면 맵별 분포와 그 경기의 양 팀 라인업을 보여줘요.</div>
      ${banTable}
    </div>
    <div class="panel"><h2>모드별 밴 분포 <span class="count">모드 안 각 맵별 · 상위 5</span></h2><div class="modebans">${modeBlocks || nod()}</div></div>`;
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
      <div class="sub-note">밀기는 거리 비교로 승패를 판정해요. 승률 옆 괄호는 표본(맵 수)</div>
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
  return `<div class="lineup"><span class="lu-team ${zan ? "zan" : ""}">${esc(name)}</span>${sorted.map((p) => `<span class="lu-p">${heroIcon(p.hero || "")}<span>${esc(p.player || "?")}${p.hero ? ` <span class="mini">${esc(heroKo(p.hero))}</span>` : ""}</span></span>`).join("")}</div>`;
}
// 세트 상세: 맵 선택팀·모드·맵·선밴/후밴·양 팀 라인업·스코어·리플레이.
// (경기 중 영웅 교체는 시트에 없어 표시하지 않음 — 데이터가 생기면 별도 블록으로 추가)
function setDetail(D: DataBundle, s: SetRec): string {
  const w = setWinner(s);
  const picker = s.picker ? (s.picker === "ADMIN" ? "주최(ADMIN)" : esc(s.picker)) : "공란/불명";
  const fb = s.bans.find((b) => b.phase === "first");
  const sb = s.bans.find((b) => b.phase === "second");
  const banLine = (b: typeof fb, label: string) => b
    ? `<span class="bd-ban"><span class="mini">${label}</span> <b>${esc(b.team)}</b> 밴 ${heroChip(b.hero)}</span>`
    : `<span class="bd-ban"><span class="mini">${label}</span> <span class="mini">기록 없음</span></span>`;
  const canLoad = s.top === D.us || s.bottom === D.us;
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
    ${s.memo ? `<div class="sub-note" style="margin:10px 0 4px">경기 중 교체 · 메모</div><div class="memobox">${renderMemo(s.memo)}</div>` : ""}
    ${canLoad ? `<div style="margin-top:10px"><button class="loadbtn" data-act="load-sim" data-val="${esc(setKey(s))}">이 경기로 시뮬레이션 채우기 ↗</button></div>` : ""}
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
// 메모 파싱: "선수 → 영웅" 같은 교체 패턴을 뽑고, 안 되면 원문 그대로.
function renderMemo(memo: string): string {
  const lines = memo.split(/[\n]+/).map((x) => x.trim()).filter(Boolean);
  return lines.map((line) => {
    const parts = line.split(/→|->/).map((x) => x.trim());
    if (parts.length >= 2 && parts[parts.length - 1]) {
      return `<div class="swap"><span class="mini">교체</span> ${esc(parts[0])} <span class="mini">→</span> ${heroChip(parts[parts.length - 1])}</div>`;
    }
    return `<div class="memo-raw">${esc(line)}</div>`;
  }).join("");
}
// 세트 → 시뮬레이션 입력 (ZANSIDE 쪽을 우리로, 상대를 상대로)
export function setToEstInput(D: DataBundle, key: string): EstInput | null {
  const s = findSetByKey(D, key);
  if (!s) return null;
  const usTop = s.top === D.us;
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
    const picker = s.picker && s.picker !== "ADMIN" ? esc(s.picker) : "—";
    const topSc = w === s.top ? fmtSc(s.ws) : fmtSc(s.ls);
    const botSc = w === s.top ? fmtSc(s.ls) : fmtSc(s.ws);
    const winCell = w ? `<span class="${w === D.us ? "zan" : ""}">${esc(w)}</span>` : '<span class="mini">미정</span>';
    const rep = s.replay ? `<span class="repcode">${esc(s.replay)}</span><button class="copyb copyicon" data-act="copy" data-val="${esc(s.replay)}" title="복사"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>` : '<span class="mini">-</span>';
    const row = `<tr class="logrow ${open ? "open" : ""}" data-act="log-expand" data-val="${esc(setKey(s))}">
      <td class="mini">${fmtDate(s.date)}</td>
      <td class="${s.top === D.us ? "zan" : ""}">${esc(s.top)}</td>
      <td class="${s.bottom === D.us ? "zan" : ""}">${esc(s.bottom)}</td>
      <td class="mini">${picker}</td>
      <td class="mini">${esc(MODE_KO[s.mode] || s.mode)}</td>
      <td>${mk(s.map)}</td>
      <td class="num mono">${topSc}-${botSc}</td>
      <td>${winCell}</td>
      <td>${rep}</td>
      <td class="num caret">${open ? "▾" : "▸"}</td>
    </tr>`;
    return open ? row + `<tr class="logdetailrow"><td colspan="10">${setDetail(D, s)}</td></tr>` : row;
  }).join("") : `<tr><td colspan="10">${nod("필터에 해당하는 경기가 없어요.")}</td></tr>`;

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
  search: string; // 고른 팀 안에서만 검색
  pickTeam: string; // 선수 선택용 팀
  pickTeamB: string; // 비교 대상 팀
  heroExpand: string; // 펼친 영웅 행
  heroMapSel: string; // 펼친 영웅 안에서 고른 맵 (오른쪽 상세)
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
  const teamOpts = teams.map((t) => `<option value="${esc(t)}" ${t === cur ? "selected" : ""}>${esc(t)}${t === D.us ? " (ZANSIDE)" : ""}</option>`).join("");
  const playerOpts = `<option value="" ${!opts.selName ? "selected" : ""}>— 선수 —</option>` +
    players.map((p) => `<option value="${esc(p.name)}" ${p.name === opts.selName ? "selected" : ""}>${esc(p.name)} · ${p.n}맵${p.n === 1 ? " ⚠" : ""}</option>`).join("");
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
        return `<button class="hd-mapbtn ${on ? "on" : ""}" data-act="heromap-sel" data-val="${esc(c.map)}"><span class="hd-mapn">${mk(c.map)}</span><span class="mini">${c.w}-${c.n - c.w}</span><span class="wr ${wrCls(wr)}">${wr}%${low ? '<span class="lowsmp"> ⚠</span>' : ""}</span></button>`;
      }).join("")
    : nod("맵 기록이 없어요.");

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
          const line = c.line.map((m) => `<span class="lu-p">${heroIcon(m.hero || "")}<span>${esc(m.player || "?")}</span></span>`).join("");
          return `<div class="hd-comp ${c.won ? "w" : "l"}"><div class="hd-comp-head"><span class="mini">${fmtDate(c.date)}</span> <b>${mk(c.map)}</b> · 상대 ${esc(c.opp)} · <span class="mono">${c.score}</span> <span class="${c.won ? "ww" : "ll"}">${c.won ? "승" : "패"}</span></div><div class="hd-line">${line}</div></div>`;
        }).join("")
      : nod("해당 맵 경기가 없어요.");
  }

  return `<div class="herodetail-inner">
    <div class="hd-col hd-maps">${left}</div>
    <div class="hd-col"><div class="hd-comps">${right}</div></div>
  </div>`;
}
function heroTable(D: DataBundle, p: Player, heroExpand: string, heroMapSel: string): string {
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
      <td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span>${h.n === 1 ? ' <span class="lowsmp">⚠</span>' : ""}</td>
      <td><div class="tr mini-tr"><div class="fl" style="width:${Math.round((h.n / mx) * 100)}%"></div></div></td>
      <td class="num caret">${open ? "▾" : "▸"}</td></tr>`;
    return open ? row + `<tr class="herodetail"><td colspan="6">${heroDetail(D, p, h.hero, heroMapSel)}</td></tr>` : row;
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
    return `<div class="panel"><h2>선수 분석</h2>${nod("아직 선수 기록이 없어요.")}
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
       <div class="plchips" style="margin-bottom:14px">${results.length ? results.slice(0, 30).map((p) => `<button class="plchip ${p.name === a.name ? "on" : ""}" data-act="player" data-val="${esc(p.name)}">${esc(p.name)} <span class="mini">${esc(p.team)} · ${p.n}맵${p.n === 1 ? " ⚠" : ""}</span></button>`).join("") : nod(`'${esc(ui.search)}'에 맞는 선수가 없어요.`)}</div>`
    : "";

  return `
    <div class="panel">
      <h2>선수 선택</h2>
      <div class="sub-note">맨 위 검색창은 전체 선수에서 이름으로 찾아요. 또는 아래에서 팀 → 선수 순으로 골라도 돼요. 숫자는 출전 맵 수, ⚠는 경기 수가 적다는 뜻이에요.</div>
      ${searchResults}
      ${playerSelect2(D, { pickTeam, selName: a.name, teamAct: "pick-team", playerAct: "pick-player" })}
    </div>
    <div class="panel">${playerCard(D, a)}</div>
    ${a.n > 0 ? `
    <div class="panel"><h2>① 영웅별 성적 <span class="count">영웅 단위 · 행을 누르면 맵별·조합별로 펼침</span></h2>${heroTable(D, a, ui.heroExpand, ui.heroMapSel)}</div>
    <div class="panel"><h2>② 맵별 성적 <span class="count">맵 단위 · 출전 수·승률</span></h2>${mapTable(a)}</div>
    <div class="panel"><h2>③ 영웅 × 맵 강점 <span class="count">어떤 영웅을 어떤 맵에서 잘하는지</span></h2>${heroMapHeatmap(a)}</div>` : `
    <div class="panel"><div class="datawait"><div class="dw-i">${esc(a.name)} — 아직 기록된 경기가 없어요</div><div class="sub-note" style="margin:6px 0 0">이 선수의 선픽(오프닝) 기록이 시트에 입력되면 영웅별·맵별·영웅×맵 강점이 자동으로 채워져요.</div></div></div>`}
    <div class="panel">
      <h2>선수 비교 <span class="count">${b ? `${esc(a.name)} vs ${esc(b.name)}` : "팀과 선수를 고르면 좌우 비교"}</span></h2>
      ${b ? `<button class="clearbtn" data-act="compareclear" style="margin-bottom:12px">비교 닫기 ✕</button>` : ""}
      ${playerSelect2(D, { pickTeam: pickTeamB, selName: ui.playerB, teamAct: "comp-team", playerAct: "comp-player", exclude: a.name })}
    </div>
    ${b ? renderPlayerDiff(D, a, b) : ""}`;
}
// 맵별 성적 표 (영웅 구분 없이 맵 단위). 출전 수·승률·저표본 경고.
function mapTable(p: Player): string {
  const maps = Object.values(p.maps).sort((a, b) => b.n - a.n);
  if (!maps.length) return nod("아직 맵 기록이 없어요.");
  const mx = Math.max(1, ...maps.map((m) => m.n));
  return `<table><thead><tr><th>맵</th><th class="num">출전</th><th class="num">승-패</th><th class="num">승률</th><th>빈도</th></tr></thead><tbody>${maps.map((m) => {
    const wr = m.n ? Math.round((m.w / m.n) * 100) : 0;
    const low = m.n === 1;
    return `<tr><td class="hname">${mk(m.map)}</td>
      <td class="num">${m.n}${low ? ' <span class="lowsmp" title="표본 적음">⚠</span>' : ""}</td>
      <td class="num">${m.w}-${m.n - m.w}</td>
      <td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span></td>
      <td><div class="tr mini-tr"><div class="fl" style="width:${Math.round((m.n / mx) * 100)}%"></div></div></td></tr>`;
  }).join("")}</tbody></table>`;
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
      const small = ha.n === 1 || hb.n === 1;
      const gap = !small ? Math.abs(wa - wb) >= 20 : false;
      return `<div class="diffrow${gap ? " gap" : ""}">
        <div class="dr-a"><span class="dr-wr ${wrCls(wa)}">${wa}%${ha.n === 1 ? "⚠" : ""}</span> <span class="mini">${ha.w}-${ha.n - ha.w}</span></div>
        <div class="dr-hero">${heroChip(h)}</div>
        <div class="dr-b"><span class="mini">${hb.w}-${hb.n - hb.w}</span> <span class="dr-wr ${wrCls(wb)}">${wb}%${hb.n === 1 ? "⚠" : ""}</span></div>
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
  return `<option value="" ${!val ? "selected" : ""}>— 선수 —</option>${opts.map((p) => `<option value="${esc(p.name)}" ${p.name === val ? "selected" : ""}>${esc(team ? p.name : `${p.name} · ${p.team}`)}</option>`).join("")}`;
}
function estHeroOpts(role: "DPS" | "Tank" | "Support", val: string): string {
  return `<option value="" ${!val ? "selected" : ""}>— 영웅 —</option>${HEROES[role].map((h) => `<option value="${esc(h)}" ${h === val ? "selected" : ""}>${esc(heroKo(h))}</option>`).join("")}`;
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
// 추천 드릴다운: 그 맵에서 ZANSIDE가 그 영웅을 쓴 대표 경기
function findUsHeroGame(D: DataBundle, map: string, hero: string): string {
  const s = D.sets.find((x) => {
    const side = x.top === D.us ? x.picks.top : x.bottom === D.us ? x.picks.bottom : null;
    return side && x.map === map && side.some((p) => p.hero === hero);
  });
  return s ? setKey(s) : "";
}
// 우리 추천: 자리별로 후보 영웅을 넣어 본 예상 승률 (높은 순)
function recommendUs(D: DataBundle, e: EstInput) {
  const base = h2hEstimate(D, e);
  const basePct = base.pct ?? 50;
  const slots = EST_SLOTS.map((slot, i) => {
    const cands = HEROES[slot.role].map((h) => {
      const trial = { ...e, usHeroes: e.usHeroes.map((x, j) => (j === i ? h : x)) };
      const est = h2hEstimate(D, trial);
      const sig = D.usHeroSignal[h];
      const sample = sig ? sig.w + sig.l : 0;
      return { hero: h, pct: est.pct ?? basePct, delta: (est.pct ?? basePct) - basePct, sample, gameKey: sample ? findUsHeroGame(D, e.map, h) : "" };
    }).filter((c) => c.sample >= 1).sort((a, b) => b.pct - a.pct || b.sample - a.sample);
    return { label: slot.label, top: cands.slice(0, 3) };
  });
  return { basePct, slots };
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
  let result: string;
  if (r.pct == null) {
    result = `<div class="est-empty"><div class="est-big">입력 대기</div><div class="sub-note">${r.missing.length ? `더 채우면 추정해요: <b>${esc(r.missing.join(", "))}</b>` : "맵을 먼저 고르세요."}</div></div>`;
  } else {
    result = `<div class="est-result"><div class="est-big"><span class="wr ${wrCls(r.pct)}">${r.pct}%</span></div>
      <div class="est-band">예상 범위 ${r.lo}~${r.hi}% · 신뢰도 ${r.conf} · 최소 표본 ${r.minS}</div>
      <div class="sub-note">예측이 아니라 <b>가중 합산 추정</b>이에요. 소수점까지 믿을 숫자는 아니에요.</div>
      ${r.missing.length ? `<div class="sub-note">아직 빈 입력: ${esc(r.missing.join(", "))} — 채운 만큼만 반영했어요.</div>` : ""}</div>`;
  }
  const rows = r.factors.length
    ? r.factors.map((f) => `<div class="frow ${f.active ? "" : "off"}"><span class="fl-label">${f.label}<span class="fw">가중치 ${Math.round(f.w * 100)}%</span></span><span class="fl-contrib">${f.active ? `${f.contrib >= 0 ? "+" : ""}${Math.round(f.w * f.contrib * 100)}p` : "—"}</span><span class="fl-note mini">${f.note}</span></div>`).join("")
    : nod("맵과 양 팀 구성을 채우면 요인이 나와요.");

  // 저표본 표시: 딱 1맵일 때만 경고, 2맵 이상은 아무것도 안 붙임
  const smpTag = (n: number) => n === 1 ? ' <span class="lowsmp">⚠ 표본부족</span>' : "";

  // 불러오기 셀렉트 (과거 ZANSIDE 경기)
  const usGames = D.sets.filter((s) => s.top === D.us || s.bottom === D.us).slice().reverse();
  const gameOpt = (s: SetRec) => `<option value="${esc(setKey(s))}">${fmtDate(s.date)} vs ${esc(s.top === D.us ? s.bottom : s.top)} · ${esc(mapKo(s.map))}</option>`;
  const usLoad = `<select data-act="est-load-us" class="loadsel"><option value="">⤓ 경기 불러오기</option>${usGames.map(gameOpt).join("")}</select>`;
  const oppLoad = `<select data-act="est-load-opp" class="loadsel"><option value="">⤓ 경기 불러오기</option>${usGames.map(gameOpt).join("")}</select>`;

  // 우리 추천 (맵 입력 시)
  let recPanel = "";
  if (e.map) {
    const rec = recommendUs(D, e);
    const recHtml = rec.slots.map((sl) => `<div class="recslot"><div class="recslot-h">${sl.label}</div>${sl.top.length
      ? sl.top.map((c) => `<div class="recitem${c.gameKey ? " clickable" : ""}"${c.gameKey ? ` data-act="load-sim" data-val="${esc(c.gameKey)}"` : ""}>${heroChip(c.hero)} <span class="wr ${wrCls(c.pct)}">${c.pct}%</span> <span class="recdelta ${c.delta >= 0 ? "up" : "down"}">${c.delta >= 0 ? "+" : ""}${c.delta}p</span> <span class="mini">${c.sample}경기</span>${smpTag(c.sample)}</div>`).join("")
      : nod("표본 있는 후보가 없어요.")}</div>`).join("");
    recPanel = `<div class="panel"><h2>우리 추천 <span class="count">자리별 · 예상 승률 높은 순</span></h2>
      <div class="sub-note">현재 추정 ${rec.basePct}% 기준. 각 자리에 이 영웅을 쓰면 예상 승률이 이렇게 변해요.</div>
      <div class="recgrid">${recHtml}</div>
      <div class="sub-note causenote">상관일 뿐 인과가 아니에요. 상대·맵·밴에 따라 달라질 수 있고, 표본이 적은 항목(⚠)은 믿음을 낮추세요. 항목을 누르면 근거 경기를 불러와요.</div></div>`;
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
  // 예측 검증 (백테스트)
  const bt = backtestUs(D);
  let verifPanel = "";
  if (bt.n) {
    let single = "";
    if (e.srcKey) {
      const s = findSetByKey(D, e.srcKey);
      const cur = h2hEstimate(D, e);
      if (s && s.winner && cur.pct != null) {
        const won = s.winner === D.us;
        const hit = (cur.pct > 50) === won;
        single = `<div class="verif-single ${hit ? "vhit" : "vmiss"}"><b>${fmtDate(s.date)} vs ${esc(s.top === D.us ? s.bottom : s.top)}</b> · 모델 예측 <span class="wr ${wrCls(cur.pct)}">${cur.pct}%</span> → 실제 <b>${won ? "ZANSIDE 승" : "ZANSIDE 패"}</b> · ${hit ? "예측 적중 ✓" : "예측 빗나감 ✗"}</div>`;
      }
    }
    verifPanel = `<div class="panel"><h2>예측 검증 <span class="count">과거 ZANSIDE 경기로 모델 검증</span></h2>
      ${single}
      <div class="statrow" style="grid-template-columns:repeat(3,1fr);margin:10px 0 0">
        <div class="stat"><div class="k">예측 경기</div><div class="v">${bt.n}</div></div>
        <div class="stat"><div class="k">적중률</div><div class="v">${Math.round((bt.hits / bt.n) * 100)}%<small> ${bt.hits}/${bt.n}</small></div></div>
        <div class="stat"><div class="k">Brier</div><div class="v">${bt.brier.toFixed(3)}</div></div>
      </div>
      <div class="sub-note">${bt.n < 10 ? `표본 ${bt.n}경기로 적어요 — 적중률을 단정하지 마세요. ` : ""}같은 데이터로 만든 모델을 같은 경기에 검증한 값(인-샘플)이라 실제보다 낙관적일 수 있어요. Brier는 0에 가까울수록 정확.</div>
      <div class="verif-list">${bt.items.slice(0, 12).map((i) => `<div class="verif-row clickable" data-act="load-sim" data-val="${esc(i.key)}"><span class="mini">${fmtDate(i.date)} vs ${esc(i.opp)}</span> <span class="wr ${wrCls(i.pct)}">${i.pct}%</span> <span class="${i.won ? "ww" : "ll"}">${i.won ? "승" : "패"}</span> <span class="${i.hit ? "vhit" : "vmiss"}">${i.hit ? "✓" : "✗"}</span></div>`).join("")}</div>
    </div>`;
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
      <div class="panel"><h2>추정 결과</h2>${result}</div>
      <div class="panel"><h2>요인 분해 <span class="count">기여 = 가중치 × (승률−50%)</span></h2><div class="frows">${rows}</div>
        <div class="sub-note" style="margin-top:10px">활성 요인의 가중치 합으로 정규화해 50%에 더해요.</div></div>
    </div>
    ${verifPanel}
    ${recPanel}
    ${sensPanel}`;
}
