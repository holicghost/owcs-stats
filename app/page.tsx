import { getData } from "@/lib/data";
import { REVALIDATE } from "@/lib/constants";
import Dashboard from "@/components/Dashboard";

// 명세 3.2: ISR — 600초마다 시트 재검증
export const revalidate = REVALIDATE;

export default async function Page() {
  let data;
  try {
    data = await getData();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <div className="wrap">
        <div className="state err" style={{ marginTop: 80 }}>
          시트를 불러오지 못했어요.
          <br />
          <span style={{ color: "var(--tx-dim)", fontSize: 13 }}>
            구글 시트 공유가 &ldquo;링크가 있는 누구나 — 뷰어&rdquo;로 돼 있는지 확인해 주세요. 그래도 안 되면 잠시 뒤 새로고침해 보세요.
          </span>
          <br />
          <span style={{ color: "var(--tx-dim)", fontSize: 12 }}>{msg}</span>
        </div>
      </div>
    );
  }
  return <Dashboard data={data} />;
}
