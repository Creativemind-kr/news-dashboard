"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CategoryGrid } from "@/components/CategoryGrid";
import { HotTopicsView } from "@/components/HotTopicsView";
import { CompetitorNews } from "@/components/CompetitorNews";
import type { Category, HotTopic, CompetitorItem } from "@/lib/fetchNews";

const TABS = [
  { id: "daily", label: "📅 전일 뉴스" },
  { id: "weekly", label: "📊 주차별 Top" },
  { id: "monthly", label: "🗓 월차별 Top" },
  { id: "hot", label: "🔥 2026 핫토픽" },
  { id: "competitor", label: "🏫 경쟁사 동향" },
];

interface Props {
  daily: Category[];
}

type CacheData = {
  daily?: Category[];
  weekly?: Category[];
  monthly?: Category[];
  hot?: HotTopic[];
  competitor?: { name: string; news: CompetitorItem[] }[];
};

export function TabNav({ daily }: Props) {
  const [active, setActive] = useState("daily");
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  const [cache, setCache] = useState<CacheData>({ daily });
  const prefetchedRef = useRef(false);

  const fetchTab = useCallback(async (type: string) => {
    if (cache[type as keyof CacheData]) return;
    setLoadingTab(type);
    try {
      const res = await fetch(`/api/news?type=${type}`);
      const data = await res.json();
      setCache((prev) => ({ ...prev, [type]: data }));
    } finally {
      setLoadingTab(null);
    }
  }, [cache]);

  // 백그라운드 프리패치: 초기 로드 후 나머지 탭 미리 로드
  useEffect(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    const prefetch = async () => {
      await new Promise((r) => setTimeout(r, 1500));
      for (const tab of ["weekly", "monthly", "hot", "competitor"]) {
        await fetch(`/api/news?type=${tab}`)
          .then((r) => r.json())
          .then((data) => setCache((prev) => ({ ...prev, [tab]: data })))
          .catch(() => {});
        await new Promise((r) => setTimeout(r, 400));
      }
    };
    prefetch();
  }, []);

  const handleTabClick = (id: string) => {
    setActive(id);
    fetchTab(id);
  };

  const isLoading = loadingTab === active;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">뉴스 불러오는 중...</p>
          </div>
        </div>
      );
    }

    if (active === "daily" && cache.daily)
      return <CategoryGrid categories={cache.daily} showSummary />;
    if (active === "weekly" && cache.weekly)
      return <CategoryGrid categories={cache.weekly} label="이번 주 관련도 높은 뉴스" />;
    if (active === "monthly" && cache.monthly)
      return <CategoryGrid categories={cache.monthly} label="이번 달 관련도 높은 뉴스" />;
    if (active === "hot" && cache.hot)
      return <HotTopicsView topics={cache.hot} />;
    if (active === "competitor" && cache.competitor)
      return <CompetitorNews competitors={cache.competitor} />;

    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  };

  return (
    <div>
      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
              {/* 프리패치 완료 표시 */}
              {cache[tab.id as keyof CacheData] && tab.id !== active && (
                <span className="absolute top-3 right-2 w-1.5 h-1.5 bg-green-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">{renderContent()}</div>
    </div>
  );
}
