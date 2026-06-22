// ===== 설정 (명세 1·2장) =====
export const SHEET_ID = "1MZRG6LZ0dSjPOc_hfuAZkCZwLZ3ijzCkvSDx_N1n_Ig";
export const MAIN_GID = "1875772320";
export const US = "ZANSIDE";

// 시트별 gviz CSV (headers=0 → 원본 행 그대로). export CSV 는 푸시 거리값을 보존한다.
export const gviz = (name: string) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(name)}`;
export const MAIN_EXPORT = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${MAIN_GID}`;
export const MAIN_GVIZ = gviz("OWCS 전체 공식경기");
export const BRACKET_URL = gviz("OWCS 대진표");
export const STANDINGS_URL = gviz("OWCS 순위표");

// 0-based 컬럼 인덱스 (명세 4.1)
export const C = {
  date: 0, match: 1, replay: 2, top: 3, bottom: 4, picker: 6, mode: 7, map: 8,
  b1t: 9, b1r: 10, b1h: 11, b2t: 12, b2r: 13, b2h: 14,
  winner: 16, wscore: 17, loser: 18, lscore: 19,
} as const;

export const MODE_KO: Record<string, string> = {
  Control: "쟁탈", Flashpoint: "플래시포인트", Push: "푸시", Escort: "호위", Hybrid: "혼합",
};
export const MODE_ORDER = ["Control", "Flashpoint", "Push", "Escort", "Hybrid"];
export const ROLE_KO: Record<string, string> = { Tank: "탱커", DPS: "딜러", Support: "서포터" };

export const FULLPUSH = 144; // 8.1: 144.86m 반복 등장 → 풀푸시 추정 임계

// ISR 캐시 주기 (명세 3.2)
export const REVALIDATE = 600;

// ===== 영웅 목록 (역할별) — 경기 데이터가 아니라 선택 UI용 정적 목록 =====
// 승률 추정기(12)·모의 로스터에서 역할별 영웅을 고르기 위한 카탈로그.
export const HEROES: Record<"Tank" | "DPS" | "Support", string[]> = {
  Tank: [
    "D.Va", "Doomfist", "Hazard", "Junker Queen", "Mauga", "Orisa", "Ramattra",
    "Reinhardt", "Roadhog", "Sigma", "Winston", "Wrecking Ball", "Zarya",
  ],
  DPS: [
    "Ashe", "Bastion", "Cassidy", "Echo", "Genji", "Hanzo", "Junkrat", "Mei",
    "Pharah", "Reaper", "Sojourn", "Soldier: 76", "Sombra", "Symmetra",
    "Torbjörn", "Tracer", "Venture", "Widowmaker",
  ],
  Support: [
    "Ana", "Baptiste", "Brigitte", "Illari", "Juno", "Kiriko", "Lifeweaver",
    "Lúcio", "Mercy", "Moira", "Zenyatta",
  ],
};

// ===== 승률 추정기 가중치 (명세 12.3) — 화면에도 그대로 노출 =====
export const EST_WEIGHTS = {
  mapMode: 0.45, // 12.3.1 ZANSIDE 모드·맵 성적
  opponent: 0.3, // 12.3.2 상대 모드·맵 성적 (상대 선택 시)
  heroSignal: 0.25, // 12.3.3 영웅 신호 (선픽 데이터)
};
// 임계치 (명세 12.4)
export const EST_THRESH = {
  modeMaps: 3, // 모드별 최소 3맵
  heroAppear: 5, // 영웅 신호 최소 5등장
};
