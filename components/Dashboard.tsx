"use client";
import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { DataBundle } from "@/lib/types";
import {
  renderMatchday, renderScout, renderBanAnalysis, renderMaps, renderLog,
  renderScenario, renderPlayers, renderEstimator, setIcons,
  type LogFilter, type EstInput, type BanUI,
} from "@/lib/render";

type Role = "Tank" | "DPS" | "Support";

// OWCS 데이터 탭 메뉴 (순서·이름)
const OWCS_TABS = [
  { id: "home", label: "다음 경기" },
  { id: "scout", label: "팀별 분석" },
  { id: "players", label: "선수" },
  { id: "log", label: "경기 기록" },
  { id: "scenario", label: "순위 시나리오" },
  { id: "ban", label: "영웅 밴 분석" },
  { id: "maps", label: "맵 분석" },
  { id: "estimator", label: "시뮬레이션" },
] as const;
type TabId = (typeof OWCS_TABS)[number]["id"];

const ROLE_FILTERS: Array<{ id: "all" | Role; label: string }> = [
  { id: "all", label: "전체" }, { id: "Tank", label: "탱커" }, { id: "DPS", label: "딜러" }, { id: "Support", label: "서포터" },
];

const EMPTY_EST: EstInput = { map: "", us: ["", "", "", "", ""], oppTeam: "", oppPlayers: ["", "", "", "", ""], oppHeroes: ["", "", "", "", ""] };

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

  const [mod, setMod] = useState<"owcs" | "scrim">("owcs");
  const [tab, setTab] = useState<TabId>("home");

  // 팀별 분석 / 맵 / 로그
  const [scoutTeam, setScoutTeam] = useState(nextOpp || opps[0] || "");
  const [mapsMode, setMapsMode] = useState("all");
  const [mapsTeam, setMapsTeam] = useState("ZANSIDE");
  const [logF, setLogF] = useState<LogFilter>({ z: "all", team: "", mode: "", map: "", date: "" });
  const [weakExpand, setWeakExpand] = useState("");

  // 선수
  const [playerA, setPlayerA] = useState(D.playerNames[0] || "");
  const [playerB, setPlayerB] = useState("");
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerRole, setPlayerRole] = useState<"all" | Role>("all");
  const [compareAll, setCompareAll] = useState(false);
  const [openTeams, setOpenTeams] = useState<string[]>([]);
  const [heroExpand, setHeroExpand] = useState("");

  // 영웅 밴 분석
  const [banRole, setBanRole] = useState<"all" | Role>("all");
  const [banTopN, setBanTopN] = useState(12);
  const [banTeam, setBanTeam] = useState(D.teams[D.us] ? D.us : D.teamNames[0] || "");
  const [banMap, setBanMap] = useState("all");
  const [banExpand, setBanExpand] = useState("");

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
      case "home": return renderMatchday(D, weakExpand);
      case "scout": return renderScout(D, scoutTeam, weakExpand);
      case "players": return renderPlayers(D, { playerA, playerB, search: playerSearch, role: playerRole, compareAll, openTeams, heroExpand });
      case "log": return renderLog(D, logF);
      case "scenario": return renderScenario(D);
      case "ban": return renderBanAnalysis(D, { role: banRole, topN: banTopN, team: banTeam, banMap, banExpand } as BanUI);
      case "maps": return renderMaps(D, mapsMode, mapsTeam);
      case "estimator": return renderEstimator(D, est);
      default: return "";
    }
  }, [D, tab, scoutTeam, weakExpand, playerA, playerB, playerSearch, playerRole, compareAll, openTeams, heroExpand, logF, banRole, banTopN, banTeam, banMap, banExpand, mapsMode, mapsTeam, est]);

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  function go(id: TabId) { setMod("owcs"); setTab(id); toTop(); }

  function onClick(ev: MouseEvent<HTMLElement>) {
    const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    const val = el.dataset.val ?? "";
    switch (act) {
      case "scout": setScoutTeam(val); break;
      case "goscout": setScoutTeam(val); go("scout"); break;
      case "goplayer": setPlayerA(val); setPlayerB(""); go("players"); break;
      case "logz": setLogF((f) => ({ ...f, z: val as LogFilter["z"] })); break;
      case "player": setPlayerA(val); setPlayerB(""); setHeroExpand(""); break;
      case "compare": setPlayerB(val); break;
      case "compareclear": setPlayerB(""); break;
      case "compare-all-toggle": setCompareAll((v) => !v); break;
      case "player-role": setPlayerRole(val as "all" | Role); break;
      case "team-toggle": setOpenTeams((s) => (s.includes(val) ? s.filter((t) => t !== val) : [...s, val])); break;
      case "hero-expand": setHeroExpand((c) => (c === val ? "" : val)); break;
      case "ban-role": setBanRole(val as "all" | Role); break;
      case "ban-expand": setBanExpand((c) => (c === val ? "" : val)); break;
      case "weak-expand": setWeakExpand((c) => (c === val ? "" : val)); break;
      case "copy":
        navigator.clipboard?.writeText(val).then(() => {
          el.textContent = "복사됨"; el.classList.add("done");
          setTimeout(() => { el.textContent = "복사"; el.classList.remove("done"); }, 1200);
        });
        break;
    }
  }

  function onChange(ev: ChangeEvent<HTMLElement>) {
    const el = ev.target as HTMLSelectElement;
    const act = el.dataset.act;
    if (!act) return;
    const v = el.value;
    if (act.startsWith("est-us-")) { const i = +act.slice(7); setEst((s) => { const us = [...s.us]; us[i] = v; return { ...s, us }; }); return; }
    if (act.startsWith("est-oppplayer-")) { const i = +act.slice(14); setEst((s) => { const a = [...s.oppPlayers]; a[i] = v; return { ...s, oppPlayers: a }; }); return; }
    if (act.startsWith("est-opphero-")) { const i = +act.slice(12); setEst((s) => { const a = [...s.oppHeroes]; a[i] = v; return { ...s, oppHeroes: a }; }); return; }
    switch (act) {
      case "mapsmode": setMapsMode(v); break;
      case "mapsteam": setMapsTeam(v); break;
      case "logteam": setLogF((f) => ({ ...f, team: v })); break;
      case "logmode": setLogF((f) => ({ ...f, mode: v })); break;
      case "logmap": setLogF((f) => ({ ...f, map: v })); break;
      case "logdate": setLogF((f) => ({ ...f, date: v })); break;
      case "ban-topn": setBanTopN(+v); break;
      case "ban-team": setBanTeam(v); setBanExpand(""); break;
      case "ban-map": setBanMap(v); setBanExpand(""); break;
      case "est-map": setEst((s) => ({ ...s, map: v })); break;
      case "est-oppteam": setEst((s) => ({ ...s, oppTeam: v, oppPlayers: ["", "", "", "", ""], oppHeroes: ["", "", "", "", ""] })); break;
    }
  }

  function onKeyDown(ev: React.KeyboardEvent<HTMLElement>) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act="goscout"]');
    if (!el) return;
    ev.preventDefault();
    setScoutTeam(el.dataset.val ?? "");
    go("scout");
  }

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
          <span>{updated ? `마지막 업데이트 ${updated}` : "불러오는 중"}</span>
          <button className="refresh" onClick={refresh} disabled={refreshing}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>
            {refreshing ? "갱신 중…" : "새로고침"}
          </button>
        </div>
      </header>

      <div className="modnav">
        <button className={`modbtn ${mod === "owcs" ? "on" : ""}`} onClick={() => setMod("owcs")}>OWCS 데이터</button>
        <button className={`modbtn ${mod === "scrim" ? "on" : ""}`} onClick={() => setMod("scrim")}>스크림 데이터</button>
      </div>

      {mod === "owcs" && (
        <nav className="tabs">
          {OWCS_TABS.map((t) => (
            <button key={t.id} className={`tab ${t.id === tab ? "on" : ""}`} onClick={() => go(t.id)}>{t.label}</button>
          ))}
        </nav>
      )}

      <main onClick={onClick} onChange={onChange} onKeyDown={onKeyDown}>
        {mod === "owcs" && tab === "players" && (
          <div className="metabar">
            <input className="searchbox" type="search" placeholder="선수 이름 검색…" value={playerSearch} onChange={(e) => setPlayerSearch((e.target as HTMLInputElement).value)} />
            <span className="flabel">역할</span>
            <div className="seg">
              {ROLE_FILTERS.map((r) => (
                <button key={r.id} className={playerRole === r.id ? "on" : ""} data-act="player-role" data-val={r.id}>{r.label}</button>
              ))}
            </div>
          </div>
        )}
        {mod === "owcs"
          ? <section dangerouslySetInnerHTML={{ __html: html }} />
          : (
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
