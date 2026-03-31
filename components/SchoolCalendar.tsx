"use client";

import { useMemo, useState } from "react";

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

const SPECIAL: Record<string, string> = {
  "2026-07-09": "교육부휴가", "2026-07-10": "교육부휴가", "2026-07-11": "교육부휴가",
  "2026-07-12": "교육부휴가", "2026-07-13": "교육부휴가",
  "2026-08-13": "교내휴가",  "2026-08-14": "교내휴가",  "2026-08-16": "교내휴가",
};

// 이벤트 타입 정의
type EventType = "classStart" | "classEnd" | "bizStart" | "bizEnd" | "holiday" | "special";

interface DayEvent {
  type: EventType;
  label: string;
}

const EVENT_STYLE: Record<EventType, { cell: string; text: string; dot: string; listColor: string }> = {
  classStart: { cell: "bg-green-100",  text: "text-green-800", dot: "bg-green-500",  listColor: "text-green-700" },
  classEnd:   { cell: "bg-rose-100",   text: "text-rose-800",  dot: "bg-rose-500",   listColor: "text-rose-700"  },
  bizStart:   { cell: "bg-blue-100",   text: "text-blue-800",  dot: "bg-blue-500",   listColor: "text-blue-700"  },
  bizEnd:     { cell: "bg-orange-100", text: "text-orange-800",dot: "bg-orange-400", listColor: "text-orange-700"},
  holiday:    { cell: "bg-red-50",     text: "text-red-600",   dot: "bg-red-400",    listColor: "text-red-600"   },
  special:    { cell: "bg-purple-100", text: "text-purple-800",dot: "bg-purple-400", listColor: "text-purple-700"},
};

function toStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getEvents(dateStr: string): DayEvent[] {
  const events: DayEvent[] = [];
  for (const s of SCHEDULE) {
    if (dateStr === s.classStart) events.push({ type: "classStart", label: "개강" });
    if (dateStr === s.classEnd)   events.push({ type: "classEnd",   label: "종강" });
    if (dateStr === s.bizStart)   events.push({ type: "bizStart",   label: "영업시작" });
    if (dateStr === s.bizEnd)     events.push({ type: "bizEnd",     label: "영업종료" });
  }
  if (HOLIDAYS[dateStr]) events.push({ type: "holiday", label: HOLIDAYS[dateStr] });
  if (SPECIAL[dateStr])  events.push({ type: "special", label: SPECIAL[dateStr] });
  return events;
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

// 당월 이벤트 목록
function getMonthEvents(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: { day: number; dateStr: string; events: DayEvent[] }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toStr(year, month, d);
    const events = getEvents(dateStr);
    if (events.length > 0) result.push({ day: d, dateStr, events });
  }
  return result;
}

interface MiniCalendarProps {
  year: number;
  month: number;
  today: string;
  shade: "prev" | "current" | "next";
}

function MiniCalendar({ year, month, today, shade }: MiniCalendarProps) {
  const [tooltip, setTooltip] = useState<{ day: number; events: DayEvent[] } | null>(null);
  const cells = buildMonth(year, month);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const bg = shade === "prev" ? "bg-gray-100" : shade === "next" ? "bg-gray-200" : "bg-white";
  const headerText = shade === "prev" ? "text-gray-400" : shade === "next" ? "text-gray-500" : "text-gray-800";

  return (
    <div className={`${bg} rounded-lg px-2 py-2 relative`}>
      <p className={`text-center text-xs font-semibold mb-1.5 ${headerText}`}>
        {year}년 {month + 1}월
      </p>
      <div className="grid grid-cols-7 mb-0.5">
        {["일","월","화","수","목","금","토"].map((d, i) => (
          <div key={d} className={`text-center text-[10px] font-medium py-0.5 ${
            i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
          }`}>{d}</div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            if (!day) return <div key={di} />;
            const dateStr = toStr(year, month, day);
            const isToday = dateStr === today;
            const events = shade === "current" ? getEvents(dateStr) : [];
            const isSun = di === 0;
            const isSat = di === 6;

            // 셀 배경: 이벤트 중 가장 우선순위 높은 것
            const priorityOrder: EventType[] = ["classStart","classEnd","bizStart","bizEnd","special","holiday"];
            const topEvent = priorityOrder.find(t => events.some(e => e.type === t));
            const cellBg = shade === "current" && topEvent && !isToday
              ? EVENT_STYLE[topEvent].cell : "";

            const numColor = shade !== "current" ? "text-gray-400"
              : isToday ? "text-white"
              : events.some(e => e.type === "holiday") ? "text-red-600"
              : isSun ? "text-red-400"
              : isSat ? "text-blue-400"
              : "text-gray-700";

            return (
              <div
                key={di}
                className="flex flex-col items-center py-0.5 relative"
                onMouseEnter={() => shade === "current" && events.length > 0 && setTooltip({ day, events })}
                onMouseLeave={() => setTooltip(null)}
              >
                <div className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] leading-none font-medium cursor-default
                  ${numColor}
                  ${isToday && shade === "current" ? "bg-blue-500" : cellBg}
                `}>
                  {day}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* 툴팁 */}
      {tooltip && (
        <div className="absolute left-full top-0 ml-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-36 text-xs">
          <p className="font-semibold text-gray-700 mb-1">{month + 1}월 {tooltip.day}일</p>
          {tooltip.events.map((e, i) => (
            <div key={i} className={`flex items-center gap-1 ${EVENT_STYLE[e.type].listColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${EVENT_STYLE[e.type].dot}`} />
              {e.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SchoolCalendar() {
  const { prev, curr, next, todayStr } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const prevDate = new Date(y, m - 1, 1);
    const nextDate = new Date(y, m + 1, 1);
    return {
      prev: { year: prevDate.getFullYear(), month: prevDate.getMonth() },
      curr: { year: y, month: m },
      next: { year: nextDate.getFullYear(), month: nextDate.getMonth() },
      todayStr: toStr(y, m, now.getDate()),
    };
  }, []);

  const monthEvents = useMemo(() => getMonthEvents(curr.year, curr.month), [curr]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-gray-600 text-center px-1 py-1 border-b border-gray-200">
        코리아교육그룹 학사일정
      </p>

      <MiniCalendar year={prev.year} month={prev.month} today={todayStr} shade="prev" />
      <MiniCalendar year={curr.year} month={curr.month} today={todayStr} shade="current" />
      <MiniCalendar year={next.year} month={next.month} today={todayStr} shade="next" />

      {/* 당월 이벤트 목록 */}
      {monthEvents.length > 0 && (
        <div className="border-t border-gray-200 pt-2">
          <p className="text-[10px] font-semibold text-gray-500 mb-1.5 px-1">
            {curr.month + 1}월 일정
          </p>
          <div className="flex flex-col gap-1">
            {monthEvents.map(({ day, events }) =>
              events.map((e, i) => (
                <div key={`${day}-${i}`} className="flex items-center gap-1.5 px-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${EVENT_STYLE[e.type].dot}`} />
                  <span className="text-[10px] text-gray-500 w-8 shrink-0">{curr.month + 1}/{day}</span>
                  <span className={`text-[10px] font-medium ${EVENT_STYLE[e.type].listColor}`}>{e.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
