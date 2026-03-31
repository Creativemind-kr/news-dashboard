"use client";

import { useState, useEffect, useCallback } from "react";
import { CategoryGrid } from "@/components/CategoryGrid";
import { HotTopicsView } from "@/components/HotTopicsView";
import type { Category, HotTopic } from "@/lib/fetchNews";

const TABS = [
  { id: "daily", label: "📅 전일 뉴스" },
  { id: "weekly", label: "📊 주차별 Top" },
  { id: "monthly", label: "🗓 월차별 Top" },
  { id: "hot", label: "🔥 2026 핫토픽" },
];

interface Props {
  daily: Category[];
}

type CacheData = {
  daily?: Category[];
  weekly?: Category[];
  monthly?: Category[];
  hot?: HotTopic[];
};

export function TabNav({ daily }: Props) {
  const [active, setActive] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<CacheData>({ daily });

  const fetchTab = useCallback(async (type: string) => {
    if (cache[type as keyof CacheData]) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/news?type=${type}`);
      const data = await res.json();
      setCache((prev) => ({ ...prev, [type]: data }));
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => {
    if (active !== "daily") fetchTab(active);
  }, [active, fetchTab]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">뉴스 불러오는 중...</p>
          </div>
        </div>
      );
    }

    if (active === "daily" && cache.daily) {
      return <CategoryGrid categories={cache.daily} showSummary />;
    }
    if (active === "weekly" && cache.weekly) {
      return <CategoryGrid categories={cache.weekly} label="이번 주 관련도 높은 뉴스" />;
    }
    if (active === "monthly" && cache.monthly) {
      return <CategoryGrid categories={cache.monthly} label="이번 달 관련도 높은 뉴스" />;
    }
    if (active === "hot" && cache.hot) {
      return <HotTopicsView topics={cache.hot} />;
    }
    return null;
  };

  return (
    <div>
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                active === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">{renderContent()}</div>
    </div>
  );
}
