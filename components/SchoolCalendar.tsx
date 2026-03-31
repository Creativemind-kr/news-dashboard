"use client";

import { useMemo } from "react";

// ── 공휴일 ────────────────────────────────────────────
const HOLIDAYS: Record<string, string> = {
  "2026-01-01": "신정",
  "2026-02-16": "설날연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날연휴",
  "2026-03-01": "삼일절",
  "2026-03-02": "대체휴일",
  "2026-05-01": "근로자의날",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체휴일",
  "2026-06-06": "현충일",
  "2026-08-15": "광복절",
  "2026-08-17": "대체휴일",
  "2026-09-24": "추석연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석연휴",
  "2026-10-03": "개천절",
  "2026-10-05": "대체휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절",
  "2027-01-01": "신정",
};

// ── 학사 일정 ─────────────────────────────────────────
const SCHEDULE = [
  { classStart: "2025-12-10", classEnd: "2026-01-08", bizStart: "2025-12-11", bizEnd: "2026-01-12" },
  { classStart: "2026-01-12", classEnd: "2026-02-06", bizStart: "2026-01-13", bizEnd: "2026-02-10" },
  { classStart: "2026-02-10", classEnd: "2026-03-13", bizStart: "2026-02-11", bizEnd: "2026-03-16" },
  { classStart: "2026-03-16", classEnd: "2026-04-10", bizStart: "2026-03-17", bizEnd: "2026-04-13" },
  { classStart: "2026-04-13", classEnd: "2026-05-12", bizStart: "2026-04-14", bizEnd: "2026-05-13" },
  { classStart: "2026-05-13", classEnd: "2026-06-10", bizStart: "2026-05-14", bizEnd: "2026-06-11" },
  { classStart: "2026-06-11", classEnd: "2026-07-08", bizStart: "2026-06-12", bizEnd: "2026-07-14" },
  { classStart: "2026-07-14", classEnd: "2026-08-10", bizStart: "2026-07-15", bizEnd: "2026-08-12" },
  { classStart: "2026-08-12", classEnd: "2026-09-09", bizStart: "2026-08-13", bizEnd: "2026-09-14" },
  { classStart: "2026-09-14", classEnd: "2026-10-15", bizStart: "2026-09-15", bizEnd: "2026-10-19" },
  { classStart: "2026-10-19", classEnd: "2026-11-13", bizStart: "2026-10-20", bizEnd: "2026-11-17" },
  { classStart: "2026-11-17", classEnd: "2026-12-14", bizStart: "2026-11-18", bizEnd: "2026-12-15" },
  { classStart: "2026-12-15", classEnd: "2027-01-13", bizStart: "2026-12-16", bizEnd: "2027-01-14" },
];

// 교육부/교내 휴가 (특별 표시)
const SPECIAL: Record<string, string> = {
  "2026-07-09": "교육부휴가", "2026-07-10": "교육부휴가", "2026-07-11": "교육부휴가",
  "2026-07-12": "교육부휴가", "2026-07-13": "교육부휴가",
  "2026-08-13": "교내휴가",  "2026-08-14": "교내휴가",  "2026-08-16": "교내휴가",
};

function toStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getDots(dateStr: string) {
  const dots: { bg: string; label: string }[] = [];
  for (const s of SCHEDULE) {
    if (dateStr === s.classStart) dots.push({ bg: "bg-green-500", label: "개강" });
    if (dateStr === s.classEnd)   dots.push({ bg: "bg-rose-500",  label: "종강" });
    if (dateStr === s.bizStart)   dots.push({ bg: "bg-blue-500",  label: "영업시작" });
    if (dateStr === s.bizEnd)     dots.push({ bg: "bg-orange-400",label: "영업종료" });
  }
  if (SPECIAL[dateStr]) dots.push({ bg: "bg-purple-400", label: SPECIAL[dateStr] });
  return dots;
}

function buildMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface MiniCalendarProps {
  year: number;
  month: number;
  today: string;
  shade: "prev" | "current" | "next";
}

function MiniCalendar({ year, month, today, shade }: MiniCalendarProps) {
  const cells = buildMonth(year, month);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const bg =
    shade === "prev" ? "bg-gray-100" :
    shade === "next" ? "bg-gray-200" : "bg-white";
  const headerText =
    shade === "prev" ? "text-gray-400" :
    shade === "next" ? "text-gray-500" : "text-gray-800";
  const dimText =
    shade === "current" ? "text-gray-300" : "text-transparent";

  return (
    <div className={`${bg} rounded-lg px-2 py-2`}>
      <p className={`text-center text-xs font-semibold mb-1.5 ${headerText}`}>
        {year}년 {month + 1}월
      </p>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-0.5">
        {["일","월","화","수","목","금","토"].map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] font-medium py-0.5 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      {/* 날짜 */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            if (!day) return <div key={di} />;
            const dateStr = toStr(year, month, day);
            const isToday = dateStr === today;
            const isHoliday = !!HOLIDAYS[dateStr];
            const isSpecial = !!SPECIAL[dateStr];
            const dots = getDots(dateStr);
            const isSun = di === 0;
            const isSat = di === 6;

            const numColor =
              shade !== "current" ? "text-gray-400" :
              isToday ? "text-white" :
              isHoliday ? "text-red-500" :
              isSun ? "text-red-400" :
              isSat ? "text-blue-400" :
              "text-gray-700";

            return (
              <div key={di} className="flex flex-col items-center py-0.5">
                <div
                  className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] leading-none font-medium ${numColor} ${
                    isToday && shade === "current" ? "bg-blue-500" : ""
                  } ${isSpecial && shade === "current" ? "bg-purple-100" : ""}`}
                  title={
                    [HOLIDAYS[dateStr], ...dots.map(d => d.label)].filter(Boolean).join(" / ")
                  }
                >
                  {day}
                </div>
                {dots.length > 0 && shade === "current" && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dots.slice(0, 3).map((dot, i) => (
                      <span key={i} className={`w-1 h-1 rounded-full ${dot.bg}`} title={dot.label} />
                    ))}
                  </div>
                )}
                {dots.length === 0 && <div className="h-1.5" />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function SchoolCalendar() {
  const { prev, curr, next, todayStr } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const todayStr = toStr(y, m, now.getDate());

    const prevDate = new Date(y, m - 1, 1);
    const nextDate = new Date(y, m + 1, 1);
    return {
      prev: { year: prevDate.getFullYear(), month: prevDate.getMonth() },
      curr: { year: y, month: m },
      next: { year: nextDate.getFullYear(), month: nextDate.getMonth() },
      todayStr,
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-gray-600 text-center px-1 py-1 border-b border-gray-200">
        코리아교육그룹 학사일정
      </p>
      <MiniCalendar year={prev.year} month={prev.month} today={todayStr} shade="prev" />
      <MiniCalendar year={curr.year} month={curr.month} today={todayStr} shade="current" />
      <MiniCalendar year={next.year} month={next.month} today={todayStr} shade="next" />
      {/* 범례 */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-1 pt-1 border-t border-gray-200">
        {[
          { bg: "bg-green-500",  label: "개강" },
          { bg: "bg-rose-500",   label: "종강" },
          { bg: "bg-blue-500",   label: "영업시작" },
          { bg: "bg-orange-400", label: "영업종료" },
          { bg: "bg-purple-400", label: "교내행사" },
        ].map(({ bg, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${bg}`} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="text-red-400 text-[10px]">●</span>
          <span className="text-[10px] text-gray-500">공휴일</span>
        </div>
      </div>
    </div>
  );
}
