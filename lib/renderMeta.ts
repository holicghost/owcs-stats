// 영웅 메타 모듈 렌더 (PART 2, 17장). 순수 함수가 섹션 HTML 을 만든다.
// 역할/TopN 필터는 Dashboard 가 f 로 넘긴다. 맵/팀 선택은 뷰 안에서 data-act 로.
import { esc } from "./render";
import { MODE_KO, MODE_ORDER, ROLE_KO } from "./constants";
import type { DataBundle, Team } from "./types";
import type { HeroCount, HeroWR, MetaData, Role } from "./herometa";

export interface MetaFilter {
  role: "all" | Role;
  topN: number; // 0 = All
  mapSel: string;
  teamSel: string;
}

const wrCls = (wr: number) => (wr >= 55 ? "hi" : wr >= 45 ? "mid" : "lo");
const nod = (t?: string) => `<div class="nodata">${t || "데이터 없음"}</div>`;
const roleTag = (r: string) => (r === "Unknown" || !r ? "" : `<span class="rtag ${r}">${ROLE_KO[r] || r}</span>`);
const dataWait = (cols: string) =>
  `<div class="datawait"><div class="dw-i">선픽 데이터 대기</div><div class="sub-note" style="margin:6px 0 0">선픽 데이터가 입력되면 자동으로 표시됩니다. 채울 컬럼: <b>${cols}</b></div></div>`;

const applyRole = <T extends { role: string }>(rows: T[], f: MetaFilter) =>
  f.role === "all" ? rows : rows.filter((r) => r.role === f.role);
const topSlice = <T,>(rows: T[], f: MetaFilter) => (f.topN > 0 ? rows.slice(0, f.topN) : rows);
const scope = <T extends { role: string }>(rows: T[], f: MetaFilter) => topSlice(applyRole(rows, f), f);

function bars(rows: HeroCount[], denom: number, cls?: string): string {
  if (!rows.length) return nod();
  const max = Math.max(1, ...rows.map((x) => x.count));
  return rows
    .map((x) => {
      const rate = denom ? Math.round((x.count / denom) * 100) : 0;
      return `<div class="bar"><span class="lab">${esc(x.hero)}${roleTag(x.role)}</span><div class="tr"><div class="fl ${cls || ""}" style="width:${Math.round((x.count / max) * 100)}%"></div></div><span class="vl">${x.count}${denom ? `·${rate}%` : ""}</span></div>`;
    })
    .join("");
}
function wrTable(rows: HeroWR[]): string {
  if (!rows.length) return nod();
  return `<table><thead><tr><th>영웅</th><th>역할</th><th class="num">픽(맵세트)</th><th class="num">승-패</th><th class="num">승률</th></tr></thead><tbody>${rows
    .map((h) => {
      const wr = h.played ? Math.round((h.wins / h.played) * 100) : -1;
      const low = h.played < 10;
      return `<tr><td class="hname">${esc(h.hero)}</td><td>${roleTag(h.role)}</td>
        <td class="num">${h.played}${low ? ' <span class="lowsmp" title="저표본(맵세트 10 미만)">⚠</span>' : ""}</td>
        <td class="num">${h.wins}-${h.played - h.wins}</td>
        <td class="num">${wr < 0 ? '<span class="mini">-</span>' : `<span class="wr ${wrCls(wr)}">${wr}%</span>`}</td></tr>`;
    })
    .join("")}</tbody></table>`;
}
const sumCount = (rows: HeroCount[]) => rows.reduce((a, b) => a + b.count, 0);

// ===== 17.1 개요 =====
export function renderMetaOverview(D: DataBundle, meta: MetaData, f: MetaFilter): string {
  const c = meta.counters;
  const card = (k: string, v: string | number) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  const pickScope = scope(meta.pickGlobal, f);
  const banScope = scope(meta.banGlobal, f);
  return `
    <div class="statrow" style="grid-template-columns:repeat(5,1fr)">
      ${card("매치", c.matches)}${card("맵세트", c.mapsets)}${card("총 픽(선픽)", c.totalPicks)}${card("총 밴", c.totalBans)}${card("고유 영웅", c.uniqueHeroes)}
    </div>
    <div class="grid2">
      <div class="panel"><h2>밴 카운트 상위 <span class="count">밴율 = 밴수 / 맵세트</span></h2><div class="bars">${bars(banScope, c.mapsets, "ban")}</div></div>
      <div class="panel"><h2>픽 카운트 상위 <span class="count">선픽(오프닝) 기준</span></h2><div class="bars">${meta.hasPickData ? bars(pickScope, sumCount(applyRole(meta.pickGlobal, f)), "blu") : dataWait("상수팀 첫픽 / 하수팀 첫픽")}</div></div>
    </div>
    <div class="panel"><h2>포지션별 픽률 <span class="count">역할 슬롯 기준 · 선픽</span></h2>
      ${meta.hasPickData ? positionGrid(meta, f) : dataWait("상수팀 첫픽 / 하수팀 첫픽 (역할별 선수명·영웅)")}</div>`;
}

function positionGrid(meta: MetaData, f: MetaFilter): string {
  const col = (role: Role) => {
    const rows = topSlice(meta.positionPick[role], f);
    const denom = sumCount(meta.positionPick[role]);
    return `<div><div class="sub-note">${ROLE_KO[role]} <span class="mini">(${denom}픽)</span></div><div class="bars">${bars(rows, denom, "blu")}</div></div>`;
  };
  // 역할 필터가 걸리면 해당 역할만
  const roles: Role[] = f.role === "all" ? ["Tank", "DPS", "Support"] : [f.role];
  return `<div class="grid3">${roles.map(col).join("")}</div>`;
}

// ===== 17.7 밴 메타 (핵심) =====
export function renderMetaBan(D: DataBundle, meta: MetaData, f: MetaFilter): string {
  const teamSel = `<select data-act="meta-team">${meta.teamNames.map((n) => `<option ${n === f.teamSel ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  const teamBans = f.teamSel && meta.banByTeam[f.teamSel] ? scope(meta.banByTeam[f.teamSel], f) : [];
  const modeRows = MODE_ORDER.filter((m) => meta.banByMode[m]).map((m) => {
    const top = scope(meta.banByMode[m], f).slice(0, 5);
    return `<div class="modeban"><div class="sub-note">${MODE_KO[m] || m}</div><div class="bars">${bars(top, 0, "ban")}</div></div>`;
  }).join("");

  return `
    <div class="panel"><h2>글로벌 밴 빈도 <span class="count">밴율 = 밴수 / ${meta.counters.mapsets} 맵세트</span></h2>
      <div class="bars">${bars(scope(meta.banGlobal, f), meta.counters.mapsets, "ban")}</div></div>
    <div class="grid2">
      <div class="panel"><h2>선밴 분리 <span class="count">first ban</span></h2><div class="bars">${bars(scope(meta.banFirst, f), meta.counters.mapsets, "ban")}</div></div>
      <div class="panel"><h2>후밴 분리 <span class="count">second ban</span></h2><div class="bars">${bars(scope(meta.banSecond, f), meta.counters.mapsets, "ban")}</div></div>
    </div>
    <div class="panel"><h2>팀별 밴 성향</h2>
      <div class="fbar"><span class="flabel">팀</span>${teamSel}</div>
      <div class="bars">${teamBans.length ? bars(teamBans, 0, "ban") : nod("밴 기록 없음")}</div></div>
    <div class="panel"><h2>모드별 밴 분포 <span class="count">상위 5</span></h2>
      <div class="grid3">${modeRows || nod()}</div></div>`;
}

// ===== 17.2 맵 메타 =====
export function renderMetaMap(D: DataBundle, meta: MetaData, f: MetaFilter): string {
  const maps = meta.mapNames;
  const cur = f.mapSel && maps.includes(f.mapSel) ? f.mapSel : maps[0] || "";
  const mapSel = `<select data-act="meta-map">${maps.map((m) => `<option ${m === cur ? "selected" : ""}>${esc(m)}</option>`).join("")}</select>`;

  // 맵별 팀 승률 (지금 가능) — D.teams 의 maps[cur]
  const teamRows = Object.values(D.teams)
    .map((t: Team) => ({ team: t.name, rec: t.maps[cur] }))
    .filter((x) => x.rec)
    .map((x) => ({ team: x.team, w: x.rec!.w, l: x.rec!.l, n: x.rec!.w + x.rec!.l }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || b.w / b.n - a.w / a.n);
  const teamWR = teamRows.length
    ? `<table><thead><tr><th>팀</th><th class="num">플레이</th><th class="num">승-패</th><th class="num">승률</th></tr></thead><tbody>${teamRows.map((x) => {
        const wr = x.n ? Math.round((x.w / x.n) * 100) : 0;
        const low = x.n < 10;
        return `<tr><td class="hname ${x.team === D.us ? "tname zan" : ""}">${esc(x.team)}</td><td class="num">${x.n}${low ? ' <span class="lowsmp">⚠</span>' : ""}</td><td class="num">${x.w}-${x.l}</td><td class="num"><span class="wr ${wrCls(wr)}">${wr}%</span></td></tr>`;
      }).join("")}</tbody></table>`
    : nod("이 맵 기록 없음");

  const banDist = meta.banByMap[cur] ? bars(scope(meta.banByMap[cur], f), 0, "ban") : nod("이 맵 밴 기록 없음");
  const pickDist = meta.hasPickData && meta.pickByMap[cur]
    ? bars(scope(meta.pickByMap[cur], f), sumCount(meta.pickByMap[cur]), "blu")
    : dataWait("상수팀 첫픽 / 하수팀 첫픽");

  return `
    <div class="fbar"><span class="flabel">맵</span>${mapSel}</div>
    <div class="grid2">
      <div class="panel"><h2>맵별 밴 분포 <span class="count">${esc(cur)}</span></h2><div class="bars">${banDist}</div></div>
      <div class="panel"><h2>맵별 영웅 픽 <span class="count">선픽 기준</span></h2><div class="bars">${pickDist}</div></div>
    </div>
    <div class="panel"><h2>맵별 팀 승률 <span class="count">${esc(cur)} · 표본 10 미만 ⚠</span></h2>${teamWR}</div>`;
}

// ===== 17.3 팀 분석 =====
export function renderMetaTeam(D: DataBundle, meta: MetaData, f: MetaFilter): string {
  const cur = f.teamSel && meta.teamNames.includes(f.teamSel) ? f.teamSel : meta.teamNames[0] || "";
  const teamSel = `<select data-act="meta-team">${meta.teamNames.map((n) => `<option ${n === cur ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>`;
  const ban = meta.banByTeam[cur] ? bars(scope(meta.banByTeam[cur], f), 0, "ban") : nod("밴 기록 없음");
  const pickWR = meta.hasPickData && meta.pickByTeam[cur]
    ? wrTable(scope(meta.pickByTeam[cur], f))
    : dataWait("상수팀 첫픽 / 하수팀 첫픽");

  return `
    <div class="fbar"><span class="flabel">팀</span>${teamSel}</div>
    <div class="grid2">
      <div class="panel"><h2>팀별 밴 성향 <span class="count">${esc(cur)}</span></h2><div class="bars">${ban}</div></div>
      <div class="panel"><h2>영웅 픽 & 승률 <span class="count">선픽 기준</span></h2>${pickWR}</div>
    </div>`;
}

// ===== 17.4 선수 분석 =====
export function renderMetaPlayer(D: DataBundle, meta: MetaData, f: MetaFilter): string {
  if (!D.playerNames.length) return `<div class="panel"><h2>선수 분석</h2>${dataWait("상수팀 첫픽 / 하수팀 첫픽 (역할별 선수명·영웅)")}</div>`;
  // role 필터: 선수 대표 역할 기준
  const roleOfPlayer = (roles: Record<string, number>) => {
    const e = Object.entries(roles).sort((a, b) => b[1] - a[1])[0];
    return e ? e[0] : "";
  };
  let players = D.playerNames.map((n) => D.players[n]);
  if (f.role !== "all") players = players.filter((p) => roleOfPlayer(p.roles) === f.role);
  players = (f.topN > 0 ? players.slice(0, f.topN) : players);

  const rows = players.map((p) => {
    const heroes = Object.values(p.heroes).sort((a, b) => b.n - a.n);
    const top = heroes[0];
    const topWr = top && top.n ? Math.round((top.w / top.n) * 100) : -1;
    const low = p.n < 10;
    const r = roleOfPlayer(p.roles);
    return `<tr>
      <td class="hname">${esc(p.name)}</td>
      <td>${roleTag(r)}</td>
      <td class="${p.team === D.us ? "tname zan" : "mini"}">${esc(p.team)}</td>
      <td class="num">${p.n}${low ? ' <span class="lowsmp" title="저표본(맵세트 10 미만)">⚠</span>' : ""}</td>
      <td>${top ? `${esc(top.hero)} <span class="mini">${top.n}회</span>` : '<span class="mini">-</span>'}</td>
      <td class="num">${top && topWr >= 0 && top.n >= 3 ? `<span class="wr ${wrCls(topWr)}">${topWr}%</span>` : '<span class="mini">-</span>'}</td>
    </tr>`;
  }).join("");

  return `
    <div class="panel"><h2>선수별 영웅·승률 <span class="count">선픽 기준 · 표본 10 미만 ⚠</span></h2>
      <div class="sub-note">대표 역할 기준 역할 필터 적용. 표본이 작으면 승률을 단정하지 마세요.</div>
      <table><thead><tr><th>선수</th><th>역할</th><th>소속</th><th class="num">표본(맵세트)</th><th>주 영웅</th><th class="num">주영웅 승률</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6">${nod("해당 역할 선수 없음")}</td></tr>`}</tbody></table></div>`;
}

// ===== 17.5 승률 분석 =====
export function renderMetaWinrate(D: DataBundle, meta: MetaData, f: MetaFilter): string {
  const body = meta.hasPickData ? wrTable(scope(meta.heroWR, f)) : dataWait("상수팀 첫픽 / 하수팀 첫픽");
  return `
    <div class="panel"><h2>글로벌 영웅 승률 <span class="count">선픽 기준 · 승자 미상 세트 제외</span></h2>
      <div class="sub-note">win_rate = wins / matches_played. 표본(맵세트) 10 미만 행은 ⚠ 저표본.</div>
      ${body}</div>`;
}

// ===== 17.6 포지션 픽률 =====
export function renderMetaPosition(D: DataBundle, meta: MetaData, f: MetaFilter): string {
  return `<div class="panel"><h2>포지션 픽률 <span class="count">슬롯 매핑 DPS=0·1, Tank=2, Support=3·4</span></h2>
    <div class="sub-note">선픽(오프닝) 기준. 각 역할 내 픽 점유율.</div>
    ${meta.hasPickData ? positionGrid(meta, f) : dataWait("상수팀 첫픽 / 하수팀 첫픽 (역할별 선수명·영웅)")}</div>`;
}

// ===== 17.8 데이터 노트 =====
export function renderMetaNotes(): string {
  return `
    <div class="panel"><h2>데이터 노트 <span class="count">지표 정의 18 · 전제 16</span></h2>
      <div class="notes">
        <p><b>pick_count</b> — (맵세트, 팀) 단위 중복제거 영웅 등장 수. 같은 세트·팀에서 같은 영웅은 1로 센다. (18.1)</p>
        <p><b>pick_rate</b> — 같은 역할/포지션 범위 내 pick_count 비율(%). (18.2)</p>
        <p><b>ban_count</b> — (맵세트) 단위 밴 등장 수. 선밴/후밴 합산·분리 둘 다 제공. (18.3)</p>
        <p><b>matches_played</b> — 해당 영웅이 픽된 맵세트 수(승률 표 기준). <b>win_rate</b> = wins / matches_played, 무승부는 played 포함·win 제외. (18.4·18.5)</p>
        <p><b>저표본</b> — 맵세트 10 미만 행에 ⚠ 경고. 승자 미상·승점 미기록 세트는 승률 집계에서 제외. (18.6·18.7)</p>
        <hr/>
        <p><b>전제</b> — 밴 데이터는 모든 세트에 채워져 있어 밴 화면은 전부 동작한다. 픽 데이터는 "상수팀 첫픽 / 하수팀 첫픽" 컬럼에서 오며, 채워진 만큼만 표시된다. (16.2·16.3)</p>
        <p>우리 픽 지표는 <b>"선픽(오프닝) 기준"</b>이다. 세트 내 교체 영웅까지 보려면 시트 입력 확장이 필요하다. (16.4)</p>
      </div></div>`;
}
