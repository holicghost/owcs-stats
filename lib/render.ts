// 렌더 레이어 — 순수 함수가 섹션 HTML 문자열을 만든다 (React 의존 없음).
// 상호작용 컨트롤은 data-act / data-val 속성을 달고, Dashboard 가 위임 처리한다.
import {
  MODE_KO, MODE_ORDER, ROLE_KO, HEROES, EST_WEIGHTS, EST_THRESH,
} from "./constants";
import type { DataBundle, Player, SetRec, Series, Standing, Team } from "./types";

// ===== 공통 헬퍼 =====
export const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const wrCls = (wr: number) => (wr >= 55 ? "hi" : wr >= 45 ? "mid" : "lo");
const nod = (t?: string) => `<div class="nodata">${t || "데이터 없음"}</div>`;
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
function countBars(obj: Record<string, number>, cls?: string, n?: number) {
  const arr = topN(obj, n || 8);
  if (!arr.length) return nod();
  const mx = Math.max(1, ...arr.map((x) => x[1]));
  return arr.map(([k, v]) => barCount(k, v, mx, cls)).join("");
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
        <span class="tB loser">${esc(MODE_KO[s.mode] || s.mode)} · ${esc(s.map)}</span></div>`;
    }).join("")}</div>`;
}
/** 상대 분석 칩 + 본문 전체. curScout 은 Dashboard 가 해석한 유효 팀명. */
export function renderScout(D: DataBundle, curScout: string): string {
  const opps = D.teamNames.filter((n) => n !== D.us);
  const chips = opps.map((n) => {
    const isNext = usUpcoming(D).some((g) => g.a === n || g.b === n);
    return `<button class="chip ${n === curScout ? "on" : ""}" data-act="scout" data-val="${esc(n)}">${esc(n)}${isNext ? '<span class="next">잔여</span>' : ""}</button>`;
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
      (pmMaps.length ? (() => { const mx = Math.max(1, ...pmMaps.map((x) => x[1])); return pmMaps.map(([m, n]) => barCount(m, n, mx, "blu")).join(""); })() : nod())
    : nod("맵 픽권 표본이 없습니다 (ADMIN/공란 제외).");

  const ms = modeWinrate(T);
  const mmx = Math.max(1, ...ms.map((m) => m[1].t));
  const modesHtml = ms.length ? ms.map(([m, d]) => barWR(MODE_KO[m] || m, d.w, d.t, mmx)).join("") : nod();

  const fbN = sum(T.firstBan);
  const ms2 = D.series.filter((s) => s.top === curScout || s.bottom === curScout).slice().reverse();

  return `
    <div class="chiprow">${chips}</div>
    <div class="statrow">${cards}</div>
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
        return `<tr><td class="hname">${esc(r.map)}</td><td class="mini">${MODE_KO[r.mode] || r.mode}</td>
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
        const bans = s.bans.map((b) => esc(b.hero)).join(" · ") || '<span class="mini">-</span>';
        return `<tr class="${isUs ? "zanrow" : ""}">
          <td class="mini">${fmtDate(s.date)}</td>
          <td class="mini">${esc(s.match)}</td>
          <td><span class="hname">${esc(s.map)}</span> <span class="mini">${esc(MODE_KO[s.mode] || s.mode)}</span></td>
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
function playerWR(hs: { n: number; w: number }) {
  return hs.n ? Math.round((hs.w / hs.n) * 100) : 0;
}
function playerCard(D: DataBundle, p: Player): string {
  const roleStr = roleOf(p.roles);
  return `<div class="pcard">
    <div class="pc-name">${esc(p.name)}</div>
    <div class="pc-meta">${esc(roleStr)} · <span class="${p.team === D.us ? "zan" : ""}">${esc(p.team)}</span> · 표본 ${p.n}세트</div>
  </div>`;
}
function heroTable(p: Player): string {
  const heroes = Object.values(p.heroes).sort((a, b) => b.n - a.n);
  if (!heroes.length) return nod("기록된 영웅이 없습니다.");
  const mx = Math.max(1, ...heroes.map((h) => h.n));
  return `<table><thead><tr><th>영웅</th><th class="num">사용</th><th class="num">승-패</th><th class="num">승률</th><th>빈도</th></tr></thead><tbody>${heroes.map((h) => {
    const wr = playerWR(h);
    return `<tr><td class="hname">${esc(h.hero)}</td>
      <td class="num">${h.n}</td>
      <td class="num">${h.w}-${h.n - h.w}</td>
      <td class="num">${h.n >= 3 ? `<span class="wr ${wrCls(wr)}">${wr}%</span>` : '<span class="mini">표본<3</span>'}</td>
      <td><div class="tr mini-tr"><div class="fl" style="width:${Math.round((h.n / mx) * 100)}%"></div></div></td></tr>`;
  }).join("")}</tbody></table>`;
}
function mapStrength(p: Player): string {
  const maps = Object.values(p.maps).sort((a, b) => b.n - a.n);
  if (!maps.length) return nod("맵 기록이 없습니다.");
  const mx = Math.max(1, ...maps.map((m) => m.n));
  return maps.map((m) => {
    const wr = m.n ? Math.round((m.w / m.n) * 100) : 0;
    return `<div class="bar"><span class="lab">${esc(m.map)}</span><div class="tr"><div class="fl ${wrCls(wr)}-fl" style="width:${Math.round((m.n / mx) * 100)}%"></div></div><span class="vl">${m.w}-${m.n - m.w}${m.n >= 3 ? `·${wr}%` : ""}</span></div>`;
  }).join("");
}
/** 선수 분석(13) + 선수 비교(14). playerB 가 있으면 비교 뷰를 함께 렌더. */
export function renderPlayers(D: DataBundle, playerA: string, playerB: string): string {
  if (!D.playerNames.length) {
    return `<div class="panel"><h2>선수 분석</h2>${nod("선픽(로스터) 데이터가 아직 없습니다. 시트에 세트별 5인 로스터가 입력되면 자동으로 채워집니다.")}
      <div class="sub-note" style="margin-top:12px">명세 15.1: 현재 세트 단위 5인 로스터는 사실상 1개 매치에만 있어, 이 페이지는 대부분 비어 있는 것이 정상입니다.</div></div>`;
  }
  const a = D.players[playerA] || D.players[D.playerNames[0]];
  const list = D.playerNames.map((n) =>
    `<button class="plchip ${n === a.name ? "on" : ""}" data-act="player" data-val="${esc(n)}">${esc(n)} <span class="mini">${D.players[n].n}</span></button>`
  ).join("");

  // 비교 대상 후보 (선수 A 제외)
  const compareChips = D.playerNames.filter((n) => n !== a.name).map((n) =>
    `<button class="plchip sm ${n === playerB ? "on" : ""}" data-act="compare" data-val="${esc(n)}">${esc(n)}</button>`
  ).join("");

  const b = playerB && playerB !== a.name ? D.players[playerB] : null;
  const compareBlock = b ? renderPlayerDiff(D, a, b) : "";

  return `
    <div class="panel">
      <h2>선수 선택 <span class="count">${D.playerNames.length}명 · 첫픽 입력 기준</span></h2>
      <div class="sub-note">선픽 데이터에서 추출. 표본이 작으면 승률을 단정하지 마세요 (명세 15.2).</div>
      <div class="plchips">${list}</div>
    </div>
    ${playerCardPanel(D, a)}
    <div class="panel">
      <h2>선수 비교 <span class="count">대상을 고르면 좌우 비교</span></h2>
      <div class="plchips">${compareChips || nod("비교할 다른 선수가 없습니다.")}</div>
      ${b ? "" : `<div class="sub-note" style="margin-top:10px">위에서 비교할 선수를 누르면 ${esc(a.name)} 와(과) 나란히 비교합니다.</div>`}
      ${b ? `<button class="clearbtn" data-act="compareclear">비교 닫기 ✕</button>` : ""}
    </div>
    ${compareBlock}`;
}
function playerCardPanel(D: DataBundle, p: Player): string {
  return `
    <div class="panel">
      ${playerCard(D, p)}
      <div class="grid2" style="margin-top:14px">
        <div><h2 style="margin-bottom:10px">영웅별 성적</h2>${heroTable(p)}</div>
        <div><h2 style="margin-bottom:10px">맵별 강점 <span class="count">막대=사용량, 승률은 표본 3+ 일 때</span></h2><div class="bars">${mapStrength(p)}</div></div>
      </div>
    </div>`;
}

// ===== PLAYER DIFF (14) =====
function renderPlayerDiff(D: DataBundle, a: Player, b: Player): string {
  const aHeroes = new Set(Object.keys(a.heroes));
  const bHeroes = new Set(Object.keys(b.heroes));
  const common = [...aHeroes].filter((h) => bHeroes.has(h)).sort((x, y) => (b.heroes[y].n + a.heroes[y].n) - (b.heroes[x].n + a.heroes[x].n));
  const aOnly = [...aHeroes].filter((h) => !bHeroes.has(h)).sort((x, y) => a.heroes[y].n - a.heroes[x].n);
  const bOnly = [...bHeroes].filter((h) => !aHeroes.has(h)).sort((x, y) => b.heroes[y].n - b.heroes[x].n);

  const head = `<div class="diff-head">
    <div class="diff-col"><div class="dn">${esc(a.name)}</div><div class="dm">${esc(roleOf(a.roles))} · <span class="${a.team === D.us ? "zan" : ""}">${esc(a.team)}</span> · ${a.n}세트</div></div>
    <div class="diff-vs">vs</div>
    <div class="diff-col right"><div class="dn">${esc(b.name)}</div><div class="dm">${esc(roleOf(b.roles))} · <span class="${b.team === D.us ? "zan" : ""}">${esc(b.team)}</span> · ${b.n}세트</div></div>
  </div>`;

  let commonBlock: string;
  if (!common.length) {
    commonBlock = nod("두 선수가 공통으로 다룬 영웅이 없습니다 — 비교할 공통 표본 부족.");
  } else {
    commonBlock = common.map((h) => {
      const ha = a.heroes[h], hb = b.heroes[h];
      const wa = playerWR(ha), wb = playerWR(hb);
      const small = ha.n < 3 || hb.n < 3;
      return `<div class="diffrow">
        <div class="dr-a"><span class="dr-wr ${small ? "mini" : wrCls(wa)}">${ha.n >= 3 ? wa + "%" : "표본<3"}</span> <span class="mini">${ha.w}-${ha.n - ha.w}</span></div>
        <div class="dr-hero">${esc(h)}</div>
        <div class="dr-b"><span class="mini">${hb.w}-${hb.n - hb.w}</span> <span class="dr-wr ${small ? "mini" : wrCls(wb)}">${hb.n >= 3 ? wb + "%" : "표본<3"}</span></div>
      </div>`;
    }).join("");
  }

  const uniqList = (arr: string[], p: Player) =>
    arr.length ? arr.map((h) => `<span class="utag">${esc(h)} <span class="mini">${p.heroes[h].n}</span></span>`).join("") : `<span class="mini">없음</span>`;

  return `
    <div class="panel diffpanel">
      ${head}
      <h2 style="margin-top:16px">공통 영웅 승률 비교 <span class="count">표본 3+ 일 때만 % 표기</span></h2>
      <div class="diffrows">${commonBlock}</div>
      <div class="grid2" style="margin-top:16px">
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
      <div class="sub-note">맵과 우리 5인 영웅을 고르면 과거 데이터 기반 <b>추정</b>치와 근거를 보여줍니다. 표본이 작으면 "데이터 부족"으로 표시됩니다 (명세 12·15).</div>
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
