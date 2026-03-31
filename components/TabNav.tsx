"use client";

import { useState } from "react";
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
  weekly: Category[];
  monthly: Category[];
  hotTopics: HotTopic[];
}

export function TabNav({ daily, weekly, monthly, hotTopics }: Props) {
  const [active, setActive] = useState("daily");

  return (
    <div>
      {/* Tab Bar */}
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

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {active === "daily" && (
          <CategoryGrid categories={daily} showSummary />
        )}
        {active === "weekly" && (
          <CategoryGrid categories={weekly} label="이번 주 주요 뉴스" />
        )}
        {active === "monthly" && (
          <CategoryGrid categories={monthly} label="이번 달 주요 뉴스" />
        )}
        {active === "hot" && <HotTopicsView topics={hotTopics} />}
      </div>
    </div>
  );
}
