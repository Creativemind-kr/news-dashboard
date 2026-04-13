"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CategoryGrid } from "@/components/CategoryGrid";
import { HotTopicsView } from "@/components/HotTopicsView";
import { CompetitorNews } from "@/components/CompetitorNews";
import { NoticeBoard } from "@/components/NoticeBoard";
import { Top5Sidebar } from "@/components/Top5Sidebar";
import { SchoolCalendar } from "@/components/SchoolCalendar";
import {
  extractTop5FromCategories,
  extractTop5FromHotTopics,
  extractTop5FromCompetitors,
} from "@/lib/top5";
import type { Category, HotTopic, CompetitorGroup } from "@/lib/fetchNews";
import type { NoticeSource } from "@/lib/fetchNotices";

const TABS = [
  { id: "notice",     label: "📌 사업공고" },
  { id: "daily",      label: "📅 전일 뉴스" },
  { id: "google",     label: "🌐 구글 뉴스" },
  { id: "weekly",     label: "📊 주차별 Top" },
  { id: "monthly",    label: "🗓 월차별 Top" },
  { id: "hot",        label: "🔥 2026 핫토픽" },
  { id: "competitor", label: "🏫 경쟁사 동향" },
];

interface Props {
  daily: Category[];
  notices: NoticeSource[];
}

type CacheData = {
  notice?: NoticeSource[];
  daily?: Category[];
  google?: Category[];
  weekly?: Category[];
  monthly?: Category[];
  hot?: HotTopic[];
  competitor?: CompetitorGroup[];
};

export function TabNav({ daily, notices }: Props) {
  const [active, setActive] = useState("notice");
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  const [cache, setCache] = useState<CacheData>({ daily, notice: notices });
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

  useEffect(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    const prefetch = async () => {
      await new Promise((r) => setTimeout(r, 2000));
      for (const tab of ["daily", "weekly", "monthly", "hot", "competitor"]) {
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

  const getTop5 = () => {
    if (active === "notice") return [];
    if (active === "hot" && cache.hot) return extractTop5FromHotTopics(cache.hot);
    if (active === "competitor" && cache.competitor) return extractTop5FromCompetitors(cache.competitor);
    const cats = cache[active as keyof CacheData] as Category[] | undefined;
    if (cats) return extractTop5FromCategories(cats);
    return [];
  };

  const top5 = getTop5();
  const showSidebar = active !== "notice" && top5.length > 0;

  const renderMain = () => {
    if (isLoading) return <Spinner />;
    if (active === "notice" && cache.notice)
      return <NoticeBoard sources={cache.notice} />;
    if (active === "daily" && cache.daily)
      return <CategoryGrid categories={cache.daily} showSummary />;
    if (active === "google" && cache.google)
      return <CategoryGrid categories={cache.google} label="구글 뉴스 (Google News RSS)" showSummary />;
    if (active === "weekly" && cache.weekly)
      return <CategoryGrid categories={cache.weekly} label="이번 주 관련도 높은 뉴스" />;
    if (active === "monthly" && cache.monthly)
      return <CategoryGrid categories={cache.monthly} label="이번 달 관련도 높은 뉴스" />;
    if (active === "hot" && cache.hot)
      return <HotTopicsView topics={cache.hot} />;
    if (active === "competitor" && cache.competitor)
      return <CompetitorNews competitors={cache.competitor} />;
    return <Spinner />;
  };

  return (
    <div>
      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
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
              {cache[tab.id as keyof CacheData] && tab.id !== active && (
                <span className="absolute top-3 right-1.5 w-1.5 h-1.5 bg-green-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4 items-start">
          {/* 왼쪽 고정: 학사 캘린더 */}
          <div className="hidden lg:block w-52 shrink-0 sticky top-[57px]">
            <SchoolCalendar />
          </div>
          {/* 메인 콘텐츠 */}
          <div className="flex-1 min-w-0">
            {showSidebar ? (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">{renderMain()}</div>
                <div className="xl:col-span-1"><Top5Sidebar items={top5} /></div>
              </div>
            ) : (
              renderMain()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">불러오는 중...</p>
      </div>
    </div>
  );
}
