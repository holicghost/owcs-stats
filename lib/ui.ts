// 공용 표시 헬퍼 — 이스케이프, 영웅/맵 한글명, 영웅 아이콘. render.ts·renderMeta.ts 공용.
import { heroKo, mapKo, heroSlug } from "./constants";

export const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export const wrCls = (wr: number) => (wr >= 55 ? "hi" : wr >= 45 ? "mid" : "lo");
export const nod = (t?: string) => `<div class="nodata">${t || "데이터 없음"}</div>`;

// 영웅 아이콘 맵 (overfast 슬러그 → URL). 렌더 전에 setIcons 로 주입.
let ICONS: Record<string, string> = {};
export function setIcons(m: Record<string, string> | undefined) {
  ICONS = m || {};
}

export const hk = (h: string) => esc(heroKo(h)); // 영웅 한글명(이스케이프)
// 맵 한글명. 이름이 있으면 클릭 시 맵 분석으로 이동(어디서나). 선택 UI는 mapKo()를 직접 써서 비활성.
export const mk = (m: string) => m ? `<span class="mchip-link" data-act="gomap" data-val="${esc(m)}">${esc(mapKo(m))}</span>` : esc(mapKo(m));

export function heroIcon(name: string): string {
  const u = ICONS[heroSlug(name)];
  if (u) return `<img class="hicon" src="${esc(u)}" alt="" loading="lazy">`;
  // 아이콘이 없으면 한글 첫 글자 배지로 대체
  return `<span class="hicon hicon-x">${esc((heroKo(name) || "?").slice(0, 1))}</span>`;
}
// 아이콘 + 한글명 한 묶음. 이름이 있으면 클릭 시 영웅 분석으로 이동(어디서나).
export const heroChip = (name: string) => name
  ? `<span class="hchip hchip-link" data-act="gohero" data-val="${esc(name)}">${heroIcon(name)}<span class="hchip-n">${esc(heroKo(name))}</span></span>`
  : `<span class="hchip">${heroIcon(name)}<span class="hchip-n">${esc(heroKo(name))}</span></span>`;
