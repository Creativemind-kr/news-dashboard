import { getDailyNews, getWeeklyTop, getMonthlyTop, getHotTopics2026 } from "@/lib/fetchNews";
import { TabNav } from "@/components/TabNav";

export const revalidate = 3600;

export default async function Home() {
  const [daily, weekly, monthly, hotTopics] = await Promise.all([
    getDailyNews(),
    getWeeklyTop(),
    getMonthlyTop(),
    getHotTopics2026(),
  ]);

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">📰 뉴스 대시보드</h1>
            <p className="text-xs text-gray-400 mt-0.5">{today} 기준</p>
          </div>
        </div>
      </header>

      <TabNav
        daily={daily}
        weekly={weekly}
        monthly={monthly}
        hotTopics={hotTopics}
      />
    </main>
  );
}
