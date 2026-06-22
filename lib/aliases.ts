// 선수·팀 별칭 정규화 설정 (명세 28.1).
// 자동 규칙(대소문자 + 영문 O ↔ 숫자 0 통일)으로 대부분 합쳐지지만,
// 자동으로 안 잡히는 경우는 여기에서 손으로 바로잡는다. 원본 입력값은 보존하고 화면엔 대표 이름만 쓴다.

// 원본 표기 → 대표 이름. 예) { "iR0NY": "iRONY" }. 보통은 비워 둬도 된다.
export const PLAYER_NAME_FIX: Record<string, string> = {};

// 자동 규칙으로 합쳐진 그룹의 대표 이름을 강제로 지정하고 싶을 때.
// 키는 표준키(대문자 + 0→O), 값은 화면에 쓸 표기. 예) { "IRONY": "iRONY" }
export const PLAYER_CANON: Record<string, string> = {};

// 팀 이름 표기 교정. 예) { "crazy raccoon": "Crazy Raccoon" }. 보통 비워 둔다.
export const TEAM_NAME_FIX: Record<string, string> = {};
