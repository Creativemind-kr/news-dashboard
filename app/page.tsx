import { getAllNews } from "@/lib/fetchNews";
import { NewsCategory } from "@/components/NewsCategory";

export const revalidate = 3600;

export default async function Home() {
  const categories = await getAllNews();
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-gray-900">📰 오늘의 뉴스</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <NewsCategory key={cat.id} category={cat} />
        ))}
      </div>
    </main>
  );
}
