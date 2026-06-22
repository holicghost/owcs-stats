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

// 화면 표시용 모드 한글 라벨 (시트 원본은 영어 그대로, 표시할 때만 변환).
export const MODE_KO: Record<string, string> = {
  Control: "쟁탈", Flashpoint: "플래시포인트", Push: "밀기", Escort: "호위", Hybrid: "혼합", Clash: "격돌",
};
export const modeKo = (m: string) => MODE_KO[m] || m;

// 영웅 한글명. 시트의 영어 표기 → 한글명. 없으면 원본 그대로 표시.
// 이 리그 데이터엔 커스텀/미출시 영웅(Domina, Shion, Jetpack Cat 등)도 포함된다.
export const HERO_KO: Record<string, string> = {
  // Tank
  "D.Va": "디바", "Domina": "도미나", "Doomfist": "둠피스트", "Ramattra": "라마트라",
  "Reinhardt": "라인하르트", "Wrecking Ball": "레킹볼", "Roadhog": "로드호그", "Mauga": "마우가",
  "Sigma": "시그마", "Orisa": "오리사", "Winston": "윈스턴", "Zarya": "자리야",
  "Junker Queen": "정커퀸", "Hazard": "해저드",
  // DPS
  "Genji": "겐지", "Mei": "메이", "Bastion": "바스티온", "Vendetta": "벤데타", "Venture": "벤처",
  "Sojourn": "소전", "Sombra": "솜브라", "Soldier: 76": "솔저: 76", "Symmetra": "시메트라",
  "Sierra": "시에라", "Shion": "시온", "Anran": "안란", "Ashe": "애쉬", "Echo": "에코", "Emre": "엠레",
  "Widowmaker": "위도우메이커", "Junkrat": "정크랫", "Cassidy": "캐서디", "Torbjörn": "토르비욘",
  "Tracer": "트레이서", "Pharah": "파라", "Freja": "프레야", "Hanzo": "한조", "Reaper": "리퍼",
  // Support
  "Lifeweaver": "라이프위버", "Lúcio": "루시우", "Mercy": "메르시", "Mizuki": "미즈키", "Moira": "모이라",
  "Baptiste": "바티스트", "Brigitte": "브리기테", "Ana": "아나", "Wuyang": "우양", "Illari": "일리아리",
  "Jetpack Cat": "제트팩 캣", "Zenyatta": "젠야타", "Juno": "주노", "Kiriko": "키리코",
};
// 대소문자 차이(예: SHION) 폴백용 소문자 키 맵
const HERO_KO_LC: Record<string, string> = {};
Object.keys(HERO_KO).forEach((k) => (HERO_KO_LC[k.toLowerCase()] = HERO_KO[k]));
export const heroKo = (name: string) => HERO_KO[name] || HERO_KO_LC[(name || "").toLowerCase()] || name;

// 맵 한글명. 없으면 원본 그대로 표시.
export const MAP_KO: Record<string, string> = {
  // 쟁탈
  "Antarctic Peninsula": "남극 반도", "Busan": "부산", "Ilios": "일리오스", "Lijiang Tower": "리장 타워",
  "Nepal": "네팔", "Oasis": "오아시스", "Samoa": "사모아",
  // 호위
  "Circuit Royal": "서킷 로열", "Dorado": "도라도", "Havana": "하바나", "Junkertown": "정커타운",
  "Rialto": "리알토", "Route 66": "66번 국도", "Shambali Monastery": "샴발리 수도원",
  "Watchpoint: Gibraltar": "감시 기지: 지브롤터",
  // 혼합
  "Blizzard World": "블리자드 월드", "Eichenwalde": "아이헨발데", "Hollywood": "할리우드",
  "King's Row": "왕의 길", "Midtown": "미드타운", "Numbani": "눔바니", "Paraíso": "파라이수",
  // 밀기
  "Colosseo": "콜로세오", "Esperança": "에스페란사", "New Queen Street": "뉴 퀸 스트리트", "Runasapi": "루나사피",
  // 플래시포인트
  "New Junk City": "뉴 정크 시티", "Suravasa": "수라바사", "Aatlis": "아틀리스",
  // 격돌
  "Hanaoka": "하나오카", "Throne of Anubis": "아누비스의 왕좌",
};
export const mapKo = (name: string) => MAP_KO[name] || name;

// 영웅 아이콘 슬러그 (overfast-api 키). 규칙으로 안 맞는 것만 예외 처리.
export const HERO_SLUG_FIX: Record<string, string> = {
  "D.Va": "dva", "Soldier: 76": "soldier-76", "Wrecking Ball": "wrecking-ball",
  "Lúcio": "lucio", "Torbjörn": "torbjorn", "Junker Queen": "junker-queen",
};
export function heroSlug(name: string): string {
  if (HERO_SLUG_FIX[name]) return HERO_SLUG_FIX[name];
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
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

// 영웅 → 역할 (HEROES 역산). 밴 분석 역할 필터용. 목록에 없으면 undefined.
export const HERO_ROLE: Record<string, "Tank" | "DPS" | "Support"> = {};
(Object.keys(HEROES) as Array<"Tank" | "DPS" | "Support">).forEach((r) =>
  HEROES[r].forEach((h) => (HERO_ROLE[h] = r))
);

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
