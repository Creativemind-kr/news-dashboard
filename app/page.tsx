import { getDailyNews } from "@/lib/fetchNews";
import { getAllNotices } from "@/lib/fetchNotices";
import { TabNav } from "@/components/TabNav";

export const revalidate = 1800;

export default async function Home() {
  const [daily, notices] = await Promise.all([
    getDailyNews(),
    getAllNotices(),
  ]);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const newCount = notices.reduce(
    (acc, s) => acc + s.notices.filter((n) => n.isNew).length,
    0
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">🤖 모닝브리프</h1>
            <p className="text-xs text-gray-400 mt-0.5">{today} 기준</p>
          </div>
          {newCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-full font-semibold">
              신규공고 {newCount}건
            </span>
          )}
        </div>
      </header>
      <TabNav daily={daily} notices={notices} />
    </main>
  );
}
