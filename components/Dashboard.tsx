"use client";
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import type { DataBundle } from "@/lib/types";
import {
  renderMatchday, renderScout, renderBanAnalysis, renderHeroBan, renderMaps, renderLog,
  renderScenario, renderPlayers, renderEstimator, renderZanside, setIcons, setToEstInput, setToEstUs, setToEstOppTeam,
  type LogFilter, type EstInput, type BanUI,
} from "@/lib/render";

type Role = "Tank" | "DPS" | "Support";
type ScoutTab = "summary" | "games" | "heroes" | "maps";

// OWCS 데이터 탭 메뉴 — 분석 / 데이터 두 묶음 (다음 경기·순위 시나리오는 ZANSIDE 탭으로 이동)
const OWCS_GROUPS = [
  {
    label: "분석", tabs: [
      { id: "scout", label: "팀별 분석" },
      { id: "players", label: "선수별 분석" },
      { id: "ban", label: "영웅 분석" },
      { id: "maps", label: "맵 분석" },
      { id: "legacy", label: "임시" },
    ],
  },
  {
    label: "데이터", tabs: [
      { id: "log", label: "경기 기록" },
      { id: "estimator", label: "시뮬레이션" },
    ],
  },
] as const;
type TabId = (typeof OWCS_GROUPS)[number]["tabs"][number]["id"];

// ZANSIDE 데이터 탭 하위 메뉴
const ZANSIDE_TABS = [
  { id: "matchday", label: "다음 경기" },
  { id: "scenario", label: "순위 시나리오" },
  { id: "team", label: "우리팀 임시" },
] as const;
type ZTab = (typeof ZANSIDE_TABS)[number]["id"];

const ROLE_FILTERS: Array<{ id: "all" | Role; label: string }> = [
  { id: "all", label: "전체" }, { id: "Tank", label: "탱커" }, { id: "DPS", label: "딜러" }, { id: "Support", label: "서포터" },
];

const EMPTY_EST: EstInput = { map: "", usPlayers: ["", "", "", "", ""], usHeroes: ["", "", "", "", ""], oppTeam: "", oppPlayers: ["", "", "", "", ""], oppHeroes: ["", "", "", "", ""], srcKey: "" };

export default function Dashboard({ data }: { data: DataBundle }) {
  const D = data;
  const router = useRouter();
  const opps = useMemo(() => D.teamNames.filter((n) => n !== D.us), [D]);
  const nextOpp = useMemo(() => {
    const up = D.schedule.find((g) => g.status === "upcoming" && !g.tbd && g.phase === "regular" && (g.a === D.us || g.b === D.us));
    if (!up) return null;
    const o = up.a === D.us ? up.b : up.a;
    return opps.includes(o) ? o : null;
  }, [D, opps]);

  const [mod, setMod] = useState<"owcs" | "scrim" | "zanside">("zanside");
  const [tab, setTab] = useState<TabId>("scout");
  const [zTab, setZTab] = useState<ZTab>("matchday");

  // 팀별 분석 / 맵 / 로그
  const [scoutTeam, setScoutTeam] = useState(nextOpp || opps[0] || "");
  const [scoutTab, setScoutTab] = useState<ScoutTab>("summary");
  const [deepAgg, setDeepAgg] = useState<"main" | "swap">("main");
  const [deepSort, setDeepSort] = useState<"pick" | "wr">("pick");
  const [deepSmp, setDeepSmp] = useState(0);
  const [deepBanExpand, setDeepBanExpand] = useState("");
  const [mapsMode, setMapsMode] = useState("all");
  const [mapsTeam, setMapsTeam] = useState("ZANSIDE");
  const [logF, setLogF] = useState<LogFilter>({ z: "all", team: "", mode: "", map: "", date: "" });
  const [logExpand, setLogExpand] = useState<string[]>([]);
  const [logSort, setLogSort] = useState("new");
  const [weakExpand, setWeakExpand] = useState("");

  // 선수
  const firstPlayer = D.playerNames[0] || "";
  const [playerA, setPlayerA] = useState(firstPlayer);
  const [playerB, setPlayerB] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [pickTeam, setPickTeam] = useState(D.players[firstPlayer]?.team || D.us);
  const [pickTeamB, setPickTeamB] = useState(nextOpp || opps[0] || "");
  const [heroExpand, setHeroExpand] = useState("");
  const [heroMapSel, setHeroMapSel] = useState("");

  // 영웅 밴 분석
  const [banRole, setBanRole] = useState<"all" | Role>("all");
  const [banTopN, setBanTopN] = useState(12);
  const [banTeam, setBanTeam] = useState(D.teams[D.us] ? D.us : D.teamNames[0] || "");
  const [banMap, setBanMap] = useState("all");
  const [banExpand, setBanExpand] = useState("");

  // 영웅 밴 분석 (영웅 중심 탐색)
  const [hbHero, setHbHero] = useState("");
  const [hbSearch, setHbSearch] = useState("");
  const [hbTeam, setHbTeam] = useState("all");

  // 시뮬레이션
  const [est, setEst] = useState<EstInput>(EMPTY_EST);

  const [updated, setUpdated] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setUpdated(new Date(D.fetchedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }));
  }, [D.fetchedAt]);

  const html = useMemo(() => {
    setIcons(D.heroIcons);
    switch (tab) {
      case "scout": return renderScout(D, scoutTeam, scoutTab, { agg: deepAgg, sort: deepSort, smp: deepSmp, banExpand: deepBanExpand }, weakExpand);
      case "players": return renderPlayers(D, { playerA, playerB, search: playerSearch, pickTeam, pickTeamB, heroExpand, heroMapSel });
      case "log": return renderLog(D, logF, logExpand, logSort);
      case "ban": return renderHeroBan(D, { hero: hbHero, search: hbSearch, team: hbTeam });
      case "maps": return renderMaps(D, mapsMode, mapsTeam);
      case "legacy": return renderBanAnalysis(D, { role: banRole, topN: banTopN, team: banTeam, banMap, banExpand } as BanUI) + renderMaps(D, mapsMode, mapsTeam);
      case "estimator": return renderEstimator(D, est);
      default: return "";
    }
  }, [D, tab, scoutTeam, scoutTab, deepAgg, deepSort, deepSmp, deepBanExpand, weakExpand, playerA, playerB, playerSearch, pickTeam, pickTeamB, heroExpand, heroMapSel, logF, logExpand, logSort, hbHero, hbSearch, hbTeam, banRole, banTopN, banTeam, banMap, banExpand, mapsMode, mapsTeam, est]);

  const zansideHtml = useMemo(() => {
    setIcons(D.heroIcons);
    switch (zTab) {
      case "matchday": return renderMatchday(D, weakExpand);
      case "scenario": return renderScenario(D);
      case "team": return renderZanside(D, weakExpand);
      default: return "";
    }
  }, [D, zTab, weakExpand]);

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  function go(id: TabId) { setMod("owcs"); setTab(id); toTop(); }
  function goZ(id: ZTab) { setMod("zanside"); setZTab(id); toTop(); }

  function onClick(ev: Event) {
    const el = (ev.target as HTMLElement).closest?.<HTMLElement>("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    const val = el.dataset.val ?? "";
    switch (act) {
      case "scout": setScoutTeam(val); break;
      case "scout-tab": setScoutTab(val as ScoutTab); break;
      case "deep-agg": setDeepAgg(val as "main" | "swap"); break;
      case "deep-sort": setDeepSort(val as "pick" | "wr"); break;
      case "deep-smp": setDeepSmp(+val); break;
      case "deep-ban-expand": setDeepBanExpand((c) => (c === val ? "" : val)); break;
      case "goscout": setScoutTeam(val); go("scout"); break;
      case "goto": setMod("owcs"); setTab(val as TabId); toTop(); break;
      case "goplayer": setPlayerA(val); setPlayerB(""); setHeroExpand(""); setHeroMapSel(""); setPickTeam(D.players[val]?.team || pickTeam); go("players"); break;
      case "logz": setLogF((f) => ({ ...f, z: val as LogFilter["z"] })); break;
      case "player": // 검색 결과 클릭 → 선수 선택 + 드롭다운 자동 맞춤 + 검색 비움
        setPlayerA(val); setPlayerB(""); setHeroExpand(""); setHeroMapSel(""); setPickTeam(D.players[val]?.team || pickTeam); setPlayerSearch("");
        break;
      case "compareclear": setPlayerB(""); break;
      case "hero-expand": setHeroExpand((c) => (c === val ? "" : val)); setHeroMapSel(""); break;
      case "heromap-sel": setHeroMapSel((c) => (c === val ? "" : val)); break;
      case "ban-role": setBanRole(val as "all" | Role); break;
      case "ban-expand": setBanExpand((c) => (c === val ? "" : val)); break;
      case "hb-hero": setHbHero(val); setHbSearch(""); break;
      case "weak-expand": setWeakExpand((c) => (c === val ? "" : val)); break;
      case "log-expand": setLogExpand((arr) => (arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])); break;
      case "load-sim": { const inp = setToEstInput(D, val); if (inp) { setEst(inp); go("estimator"); } break; }
      case "est-comp": { const p = setToEstUs(D, val); if (p) setEst((s) => ({ ...s, usPlayers: p.usPlayers ?? s.usPlayers, usHeroes: p.usHeroes ?? s.usHeroes, srcKey: "" })); break; }
      case "copy":
        navigator.clipboard?.writeText(val).then(() => {
          el.classList.add("done");
          setTimeout(() => el.classList.remove("done"), 1000);
        });
        break;
    }
  }

  function onChange(ev: Event) {
    const el = ev.target as HTMLSelectElement;
    const act = el.dataset?.act;
    if (!act) return;
    const v = el.value;
    if (act.startsWith("est-usplayer-")) { const i = +act.slice(13); setEst((s) => { const a = [...s.usPlayers]; a[i] = v; return { ...s, usPlayers: a, srcKey: "" }; }); return; }
    if (act.startsWith("est-ushero-")) { const i = +act.slice(11); setEst((s) => { const a = [...s.usHeroes]; a[i] = v; return { ...s, usHeroes: a, srcKey: "" }; }); return; }
    if (act.startsWith("est-oppplayer-")) { const i = +act.slice(14); setEst((s) => { const a = [...s.oppPlayers]; a[i] = v; return { ...s, oppPlayers: a, srcKey: "" }; }); return; }
    if (act.startsWith("est-opphero-")) { const i = +act.slice(12); setEst((s) => { const a = [...s.oppHeroes]; a[i] = v; return { ...s, oppHeroes: a, srcKey: "" }; }); return; }
    switch (act) {
      case "mapsmode": setMapsMode(v); break;
      case "mapsteam": setMapsTeam(v); break;
      case "logteam": setLogF((f) => ({ ...f, team: v })); break;
      case "logmode": setLogF((f) => ({ ...f, mode: v })); break;
      case "logmap": setLogF((f) => ({ ...f, map: v })); break;
      case "logdate": setLogF((f) => ({ ...f, date: v })); break;
      case "logsort": setLogSort(v); break;
      case "ban-topn": setBanTopN(+v); break;
      case "ban-team": setBanTeam(v); setBanExpand(""); break;
      case "ban-map": setBanMap(v); setBanExpand(""); break;
      case "hb-team": setHbTeam(v); break;
      case "pick-team": {
        const top = D.playerNames.map((n) => D.players[n]).filter((p) => p.team === v).sort((a, b) => b.n - a.n)[0];
        setPickTeam(v); setHeroExpand(""); setHeroMapSel("");
        if (top) setPlayerA(top.name);
        break;
      }
      case "pick-player": if (v) { setPlayerA(v); setHeroExpand(""); setHeroMapSel(""); } break;
      case "comp-team": setPickTeamB(v); break;
      case "comp-player": setPlayerB(v); break;
      case "est-map": setEst((s) => ({ ...s, map: v, srcKey: "" })); break;
      case "est-oppteam": setEst((s) => ({ ...s, oppTeam: v, oppPlayers: ["", "", "", "", ""], oppHeroes: ["", "", "", "", ""], srcKey: "" })); break;
      case "est-load-us": if (v) { const p = setToEstUs(D, v); if (p) setEst((s) => ({ ...s, ...p })); } break;
      case "est-load-opp": if (v) setEst((s) => { const p = setToEstOppTeam(D, v, s.oppTeam); return p ? { ...s, ...p } : s; }); break;
    }
  }

  function onKeyDown(ev: Event) {
    const k = ev as KeyboardEvent;
    if (k.key !== "Enter" && k.key !== " ") return;
    const el = (ev.target as HTMLElement).closest?.<HTMLElement>('[data-act="goscout"]');
    if (!el) return;
    ev.preventDefault();
    setScoutTeam(el.dataset.val ?? "");
    go("scout");
  }

  // select onChange 가 React 위임으로 안 잡히는 환경 대응 — 네이티브 리스너로 직접 처리.
  // 최신 핸들러를 ref 로 호출해 stale closure 를 막는다.
  const mainRef = useRef<HTMLElement>(null);
  const handlers = useRef({ onClick, onChange, onKeyDown });
  handlers.current = { onClick, onChange, onKeyDown };
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const c = (e: Event) => handlers.current.onClick(e);
    const ch = (e: Event) => handlers.current.onChange(e);
    const k = (e: Event) => handlers.current.onKeyDown(e);
    el.addEventListener("click", c);
    el.addEventListener("change", ch);
    el.addEventListener("keydown", k);
    return () => { el.removeEventListener("click", c); el.removeEventListener("change", ch); el.removeEventListener("keydown", k); };
  }, []);

  const st = D.standings.find((x) => x.team === D.us);
  const sameRank = st ? D.standings.filter((x) => x.rank === st.rank).length : 0;

  async function refresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 1200);
  }

  return (
    <div className="wrap">
      <header>
        <div className="eyebrow">OWCS ASIA: KOREA · Stage 2 · 내부 분석 도구</div>
        <h1>ZANSIDE <span className="thin">데이터 분석</span></h1>
        <div className="sub">
          <span>{st ? (<>매치 <b style={{ color: "var(--accent)" }}>{st.win}승 {st.lose}패</b> · {st.rank}위{sameRank > 1 ? " (공동)" : ""}</>) : "—"}</span>
          <span className="dot" />
          <span>{D.sets.length} 맵 · {D.series.length} 시리즈</span>
          <span className="dot" />
          <span>{updated ? `업데이트 ${updated}` : "데이터 기준 OWCS 공식 경기"}</span>
          <span className="dot" />
          {(() => {
            const status = refreshing ? "loading" : D.health.error ? "error" : D.health.warn ? "stale" : "success";
            const label = { loading: "불러오는 중", success: "데이터 정상", error: `데이터 오류 ${D.health.error}`, stale: `업데이트 지연 ${D.health.warn}` }[status];
            return <span className={`dstatus ${status}`} role="status">{label}</span>;
          })()}
          <button className="refresh" onClick={refresh} disabled={refreshing} aria-label="데이터 새로고침">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>
            {refreshing ? "갱신 중…" : "새로고침"}
          </button>
        </div>
      </header>

      <div className="modnav">
        <button className={`modbtn ${mod === "owcs" ? "on" : ""}`} onClick={() => setMod("owcs")}>OWCS 데이터</button>
        <button className={`modbtn ${mod === "scrim" ? "on" : ""}`} onClick={() => setMod("scrim")}>스크림 데이터</button>
        <button className={`modbtn ${mod === "zanside" ? "on" : ""}`} onClick={() => { setMod("zanside"); toTop(); }}>ZANSIDE 데이터</button>
      </div>

      {mod === "owcs" && (
        <nav className="tabs">
          {OWCS_GROUPS.map((g, gi) => (
            <Fragment key={g.label}>
              {gi > 0 && <span className="tabdiv" aria-hidden />}
              <span className="tabgroup-label">{g.label}</span>
              {g.tabs.map((t) => (
                <button key={t.id} className={`tab ${t.id === tab ? "on" : ""}`} onClick={() => go(t.id)}>{t.label}</button>
              ))}
            </Fragment>
          ))}
        </nav>
      )}
      {mod === "zanside" && (
        <nav className="tabs">
          {ZANSIDE_TABS.map((t) => (
            <button key={t.id} className={`tab ${t.id === zTab ? "on" : ""}`} onClick={() => goZ(t.id)}>{t.label}</button>
          ))}
        </nav>
      )}

      <main ref={mainRef}>
        {mod === "owcs" && tab === "players" && (
          <div className="metabar">
            <input className="searchbox" type="search" placeholder="전체 선수 이름 검색…" value={playerSearch} onChange={(e) => setPlayerSearch((e.target as HTMLInputElement).value)} />
          </div>
        )}
        {mod === "owcs" && tab === "ban" && (
          <div className="metabar">
            <input className="searchbox" type="search" placeholder="영웅 이름 검색 (한글/영문)…" value={hbSearch} onChange={(e) => setHbSearch((e.target as HTMLInputElement).value)} />
          </div>
        )}
        {mod === "owcs" && <section dangerouslySetInnerHTML={{ __html: html }} />}
        {mod === "zanside" && <section dangerouslySetInnerHTML={{ __html: zansideHtml }} />}
        {mod === "scrim" && (
          <div className="panel" style={{ marginTop: 16 }}>
            <h2>스크림 데이터</h2>
            <div className="datawait" style={{ marginTop: 4 }}>
              <div className="dw-i">아직 연결되지 않았어요</div>
              <div className="sub-note" style={{ margin: "6px 0 0" }}>스크림은 민감한 내부 데이터라 따로 연결해야 해요. 사용할 스크림 시트와 권한을 정해 주시면 여기에 붙여 드릴게요.</div>
            </div>
          </div>
        )}
      </main>

      <footer>
        ZANSIDE 내부 데이터 분석 도구 · 데이터는 Google Sheets에서 10분마다 갱신
        <br />
        스크림 데이터는 포함하지 않습니다 · Not affiliated with Blizzard Entertainment.
      </footer>
    </div>
  );
}
