"use client";
import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { DataBundle } from "@/lib/types";
import {
  renderHome, renderScout, renderBanpick, renderMaps, renderLog,
  renderScenario, renderPlayers, renderEstimator,
  type LogFilter, type EstInput,
} from "@/lib/render";
import { buildMeta, type Role } from "@/lib/herometa";
import {
  renderMetaOverview, renderMetaBan, renderMetaMap, renderMetaTeam,
  renderMetaPlayer, renderMetaWinrate, renderMetaPosition, renderMetaNotes,
  type MetaFilter,
} from "@/lib/renderMeta";

const SCOUT_TABS = [
  { id: "home", label: "홈" },
  { id: "scout", label: "상대 분석" },
  { id: "banpick", label: "밴픽" },
  { id: "maps", label: "맵·모드" },
  { id: "log", label: "경기 로그" },
  { id: "scenario", label: "순위 시나리오" },
  { id: "players", label: "선수" },
  { id: "estimator", label: "승률 추정" },
] as const;
type ScoutTab = (typeof SCOUT_TABS)[number]["id"];

const META_TABS = [
  { id: "overview", label: "개요" },
  { id: "ban", label: "밴 메타" },
  { id: "map", label: "맵 메타" },
  { id: "team", label: "팀 분석" },
  { id: "player", label: "선수 분석" },
  { id: "winrate", label: "승률 분석" },
  { id: "position", label: "포지션 픽률" },
  { id: "notes", label: "데이터 노트" },
] as const;
type MetaTab = (typeof META_TABS)[number]["id"];

const ROLE_FILTERS: Array<{ id: "all" | Role; label: string }> = [
  { id: "all", label: "전체" },
  { id: "Tank", label: "탱커" },
  { id: "DPS", label: "딜러" },
  { id: "Support", label: "서포터" },
];

const EMPTY_EST: EstInput = { map: "", dps1: "", dps2: "", tank: "", sup1: "", sup2: "", opp: "" };

export default function Dashboard({ data }: { data: DataBundle }) {
  const D = data;
  const router = useRouter();
  const opps = useMemo(() => D.teamNames.filter((n) => n !== D.us), [D]);
  const nextOpp = useMemo(() => {
    const up = D.schedule.find(
      (g) => g.status === "upcoming" && !g.tbd && g.phase === "regular" && (g.a === D.us || g.b === D.us)
    );
    if (!up) return null;
    const o = up.a === D.us ? up.b : up.a;
    return opps.includes(o) ? o : null;
  }, [D, opps]);

  const meta = useMemo(() => buildMeta(D), [D]);

  // 모듈 / 탭
  const [mod, setMod] = useState<"scouting" | "meta">("scouting");
  const [tab, setTab] = useState<ScoutTab>("home");
  const [metaTab, setMetaTab] = useState<MetaTab>("overview");

  // 스카우팅 상태
  const [scoutTeam, setScoutTeam] = useState(nextOpp || opps[0] || "");
  const [bpTeam, setBpTeam] = useState(D.teams[D.us] ? D.us : D.teamNames[0] || "");
  const [mapsMode, setMapsMode] = useState("all");
  const [mapsTeam, setMapsTeam] = useState("ZANSIDE");
  const [logF, setLogF] = useState<LogFilter>({ z: "all", team: "", mode: "", map: "", date: "" });
  const [playerA, setPlayerA] = useState(D.playerNames[0] || "");
  const [playerB, setPlayerB] = useState("");
  const [est, setEst] = useState<EstInput>(EMPTY_EST);

  // 메타 필터
  const [metaRole, setMetaRole] = useState<"all" | Role>("all");
  const [metaTopN, setMetaTopN] = useState(20);
  const [metaMap, setMetaMap] = useState("");
  const [metaTeam, setMetaTeam] = useState(D.teams[D.us] ? D.us : D.teamNames[0] || "");

  const [updated, setUpdated] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setUpdated(
      new Date(D.fetchedAt).toLocaleString("ko-KR", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    );
  }, [D.fetchedAt]);

  const scoutHtml = useMemo(() => {
    switch (tab) {
      case "home": return renderHome(D);
      case "scout": return renderScout(D, scoutTeam);
      case "banpick": return renderBanpick(D, bpTeam);
      case "maps": return renderMaps(D, mapsMode, mapsTeam);
      case "log": return renderLog(D, logF);
      case "scenario": return renderScenario(D);
      case "players": return renderPlayers(D, playerA, playerB);
      case "estimator": return renderEstimator(D, est);
      default: return "";
    }
  }, [D, tab, scoutTeam, bpTeam, mapsMode, mapsTeam, logF, playerA, playerB, est]);

  const metaHtml = useMemo(() => {
    const f: MetaFilter = { role: metaRole, topN: metaTopN, mapSel: metaMap, teamSel: metaTeam };
    switch (metaTab) {
      case "overview": return renderMetaOverview(D, meta, f);
      case "ban": return renderMetaBan(D, meta, f);
      case "map": return renderMetaMap(D, meta, f);
      case "team": return renderMetaTeam(D, meta, f);
      case "player": return renderMetaPlayer(D, meta, f);
      case "winrate": return renderMetaWinrate(D, meta, f);
      case "position": return renderMetaPosition(D, meta, f);
      case "notes": return renderMetaNotes();
      default: return "";
    }
  }, [D, meta, metaTab, metaRole, metaTopN, metaMap, metaTeam]);

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  function goScoutTab(id: ScoutTab) { setMod("scouting"); setTab(id); toTop(); }
  function goMetaTab(id: MetaTab) { setMod("meta"); setMetaTab(id); toTop(); }

  function onClick(ev: MouseEvent<HTMLElement>) {
    const el = (ev.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    const val = el.dataset.val ?? "";
    switch (act) {
      case "scout": setScoutTeam(val); break;
      case "goscout": setScoutTeam(val); goScoutTab("scout"); break;
      case "logz": setLogF((f) => ({ ...f, z: val as LogFilter["z"] })); break;
      case "player": setPlayerA(val); setPlayerB(""); break;
      case "compare": setPlayerB(val); break;
      case "compareclear": setPlayerB(""); break;
      case "meta-role": setMetaRole(val as "all" | Role); break;
      case "copy":
        navigator.clipboard?.writeText(val).then(() => {
          el.textContent = "복사됨";
          el.classList.add("done");
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
    switch (act) {
      case "bpteam": setBpTeam(v); break;
      case "mapsmode": setMapsMode(v); break;
      case "mapsteam": setMapsTeam(v); break;
      case "logteam": setLogF((f) => ({ ...f, team: v })); break;
      case "logmode": setLogF((f) => ({ ...f, mode: v })); break;
      case "logmap": setLogF((f) => ({ ...f, map: v })); break;
      case "logdate": setLogF((f) => ({ ...f, date: v })); break;
      case "est-map": setEst((s) => ({ ...s, map: v })); break;
      case "est-opp": setEst((s) => ({ ...s, opp: v })); break;
      case "est-dps1": setEst((s) => ({ ...s, dps1: v })); break;
      case "est-dps2": setEst((s) => ({ ...s, dps2: v })); break;
      case "est-tank": setEst((s) => ({ ...s, tank: v })); break;
      case "est-sup1": setEst((s) => ({ ...s, sup1: v })); break;
      case "est-sup2": setEst((s) => ({ ...s, sup2: v })); break;
      case "meta-topn": setMetaTopN(+v); break;
      case "meta-map": setMetaMap(v); break;
      case "meta-team": setMetaTeam(v); break;
    }
  }

  function onKeyDown(ev: React.KeyboardEvent<HTMLElement>) {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act="goscout"]');
    if (!el) return;
    ev.preventDefault();
    setScoutTeam(el.dataset.val ?? "");
    goScoutTab("scout");
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
        <div className="eyebrow">OWCS ASIA: KOREA · Stage 2 · 내부 스카우팅</div>
        <h1>
          ZANSIDE <span className="thin">스카우팅 보드</span>
        </h1>
        <div className="sub">
          <span>
            {st ? (
              <>
                매치 <b style={{ color: "var(--accent)" }}>{st.win}승 {st.lose}패</b> · {st.rank}위
                {sameRank > 1 ? " (공동)" : ""}
              </>
            ) : "—"}
          </span>
          <span className="dot" />
          <span>{D.sets.length} 맵 · {D.series.length} 시리즈</span>
          <span className="dot" />
          <span>{updated ? `갱신 ${updated}` : "불러옴"}</span>
          <button className="refresh" onClick={refresh} disabled={refreshing}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
            </svg>
            {refreshing ? "갱신 중…" : "새로고침"}
          </button>
        </div>
      </header>

      {/* 상위 모듈 전환 */}
      <div className="modnav">
        <button className={`modbtn ${mod === "scouting" ? "on" : ""}`} onClick={() => setMod("scouting")}>
          ZANSIDE 스카우팅
        </button>
        <button className={`modbtn ${mod === "meta" ? "on" : ""}`} onClick={() => setMod("meta")}>
          영웅 메타
        </button>
      </div>

      <nav className="tabs">
        {mod === "scouting"
          ? SCOUT_TABS.map((t) => (
              <button key={t.id} className={`tab ${t.id === tab ? "on" : ""}`} onClick={() => goScoutTab(t.id)}>
                {t.label}
              </button>
            ))
          : META_TABS.map((t) => (
              <button key={t.id} className={`tab ${t.id === metaTab ? "on" : ""}`} onClick={() => goMetaTab(t.id)}>
                {t.label}
              </button>
            ))}
      </nav>

      <main onClick={onClick} onChange={onChange} onKeyDown={onKeyDown}>
        {mod === "meta" && metaTab !== "notes" && (
          <div className="metabar">
            <span className="flabel">역할</span>
            <div className="seg">
              {ROLE_FILTERS.map((r) => (
                <button key={r.id} className={metaRole === r.id ? "on" : ""} data-act="meta-role" data-val={r.id}>
                  {r.label}
                </button>
              ))}
            </div>
            <span className="flabel">표시</span>
            <select data-act="meta-topn" defaultValue={metaTopN} key={metaTopN}>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={0}>전체</option>
            </select>
          </div>
        )}
        <section dangerouslySetInnerHTML={{ __html: mod === "scouting" ? scoutHtml : metaHtml }} />
      </main>

      <footer>
        ZANSIDE 내부 스카우팅 도구 · 데이터 출처 Google Sheets (ISR 10분 캐시)
        <br />
        스크림 데이터는 포함하지 않습니다 · Not affiliated with Blizzard Entertainment.
      </footer>
    </div>
  );
}
