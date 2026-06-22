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
          시트를 불러오지 못했습니다.
          <br />
          <span style={{ color: "var(--tx-dim)", fontSize: 13 }}>{msg}</span>
          <br />
          <span style={{ color: "var(--tx-dim)", fontSize: 13 }}>
            시트 공유 설정이 &ldquo;링크가 있는 모든 사용자&rdquo;인지 확인하세요.
          </span>
        </div>
      </div>
    );
  }
  return <Dashboard data={data} />;
}
