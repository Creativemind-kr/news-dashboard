import { getAllNotices } from "@/lib/fetchNotices";
import { SourceCard } from "@/components/SourceCard";

export const revalidate = 1800; // 30분마다 갱신

export default async function Home() {
  const sources = await getAllNotices();

  const now = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const newCount = sources.reduce(
    (acc, s) => acc + s.notices.filter((n) => n.isNew).length,
    0
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              📌 사업공고 모니터
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{now} 기준</p>
          </div>
          {newCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-full font-medium">
              신규 {newCount}건
            </span>
          )}
        </div>
      </header>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>

        <p className="text-center text-xs text-gray-300 mt-10">
          30분마다 자동 갱신 · 각 기관 공식 사이트에서 직접 수집
        </p>
      </div>
    </main>
  );
}
