"use client";

import { useState } from "react";
import type { G2bBid, G2bResult } from "@/lib/fetchG2b";

const G2B_HOME = "https://www.g2b.go.kr";
const INITIAL = 10;
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
// lib/fetchG2b.ts 의 INCLUDE / EXCLUDE 필터를 사람이 읽게 요약한 문구
const G2B_KEYWORDS = "교육·연수·강의·강사·훈련·양성·부트캠프·직업·취업·늘봄·방과후·디자인·웹툰·콘텐츠 개발/제작·영상제작 등";
const G2B_EXCLUDES = "유지관리·구축·시스템·공사, 해외연수·전지훈련 등 여행 대행, 연구·조사·평가·행사·인쇄 등과 기술용역";

function formatPrice(won: number): string {
  if (won >= 1e8) return `${(won / 1e8).toFixed(1).replace(/\.0$/, "")}억`;
  return `${Math.round(won / 1e4).toLocaleString()}만원`;
}

function formatClose(closeAt: string, label: string): { text: string; urgent: boolean } {
  const t = new Date(closeAt.replace(" ", "T") + "+09:00");
  if (!closeAt || isNaN(t.getTime())) return { text: "", urgent: false };
  const kst = new Date(t.getTime() + 9 * 3600 * 1000);
  const todayKst = new Date(Date.now() + 9 * 3600 * 1000);
  const dDay = Math.round(
    (Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) -
      Date.UTC(todayKst.getUTCFullYear(), todayKst.getUTCMonth(), todayKst.getUTCDate())) / 86400000
  );
  const md = `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}(${WEEKDAY[kst.getUTCDay()]}) ${closeAt.slice(11, 16)}`;
  return { text: `${label} ${md} · ${dDay <= 0 ? "오늘" : `D-${dDay}`}`, urgent: dDay <= 2 };
}

// "서울특별시 종로구, 서울특별시 중구 …" 처럼 길어지면 시·도 단위로 묶는다.
function regionText(bid: G2bBid): string | null {
  if (bid.regions === null) return null;
  if (bid.regions.length === 0) return "지역제한 없음";
  const list =
    bid.regions.length === 1
      ? bid.regions[0]
      : [...new Set(bid.regions.map((r) => r.split(" ")[0]))].join(", ");
  return bid.canJoin ? `참가 ${list}` : `${list} 업체만`;
}

function BidRow({ bid, index }: { bid: G2bBid; index: number }) {
  const close = formatClose(bid.closeAt, bid.closeLabel);
  const region = regionText(bid);
  const showKind = (bid.kind === "재공고" || bid.kind === "변경공고") && !bid.title.includes(bid.kind);
  return (
    <li className="hover:bg-gray-50 transition-colors">
      <a href={bid.link} target="_blank" rel="noopener noreferrer" className="block px-5 py-3">
        <div className="flex items-start gap-2">
          <div className="shrink-0 mt-0.5 w-10">
            {bid.isNew ? (
              <span className="inline-block text-xs font-bold text-red-500 border border-red-400 rounded px-1 py-0.5 leading-none">
                NEW
              </span>
            ) : (
              <span className="inline-block text-xs text-gray-300 w-10 text-center">{index + 1}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 leading-snug hover:text-blue-600 line-clamp-2 break-keep">
              {showKind && <span className="text-gray-400 font-normal">[{bid.kind}] </span>}
              {bid.title}
            </p>
            <p className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-2 gap-y-0.5 break-keep">
              {bid.chungcheong && <span className="font-semibold text-emerald-600">충청권</span>}
              <span>{bid.agency}</span>
              {bid.price !== null && <span>추정 {formatPrice(bid.price)}</span>}
              {close.text && (
                <span suppressHydrationWarning className={close.urgent ? "text-red-500 font-medium" : ""}>
                  {close.text}
                </span>
              )}
              {region && <span className="text-gray-400">{region}</span>}
            </p>
          </div>
        </div>
      </a>
    </li>
  );
}

export function G2bBoard({ data }: { data: G2bResult }) {
  const [expanded, setExpanded] = useState(false);
  const [showOther, setShowOther] = useState(false);

  const joinable = data.bids.filter((b) => b.canJoin);
  const other = data.bids.filter((b) => !b.canJoin);
  const newCount = joinable.filter((b) => b.isNew).length;
  const shown = expanded ? joinable : joinable.slice(0, INITIAL);
  const hidden = joinable.length - shown.length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-l-4 flex items-center justify-between gap-3 border-blue-600 bg-blue-50 text-blue-800">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="text-sm font-bold shrink-0">나라장터 용역공고</h3>
          {data.ok && <span className="text-xs opacity-70 truncate">천안 참가 가능 {joinable.length}건</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {newCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">NEW {newCount}</span>
          )}
          <a href={G2B_HOME} target="_blank" rel="noopener noreferrer" className="text-xs opacity-60 hover:opacity-100 underline">
            바로가기
          </a>
        </div>
      </div>

      {!data.ok ? (
        <div className="px-5 py-4">
          <a href={G2B_HOME} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:text-blue-700 hover:underline">
            나라장터 정보를 불러오지 못했습니다. 사이트에서 직접 확인하기 ↗
          </a>
        </div>
      ) : joinable.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">최근 7일 동안 조건에 맞는 접수중 공고가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {shown.map((bid, i) => (
            <BidRow key={bid.id} bid={bid} index={i} />
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 border-t border-gray-100"
        >
          {hidden}건 더 보기
        </button>
      )}

      {data.ok && other.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowOther((v) => !v)}
            className="w-full px-5 py-2.5 text-left text-xs text-gray-500 hover:bg-gray-50"
          >
            {showOther ? "▾" : "▸"} 다른 지역 업체만 참가할 수 있는 공고 {other.length}건
          </button>
          {showOther && (
            <ul className="divide-y divide-gray-50 opacity-70">
              {other.map((bid, i) => (
                <BidRow key={bid.id} bid={bid} index={i} />
              ))}
            </ul>
          )}
        </div>
      )}

      {data.ok && (
        <p className="px-5 py-2.5 text-[11px] leading-relaxed text-gray-400 bg-gray-50 border-t border-gray-100 break-keep">
          최근 7일 용역공고 {data.scanned.toLocaleString()}건 중 마감 전이고 공고명이 맞는 것만 표시 · 포함: {G2B_KEYWORDS} · 제외: {G2B_EXCLUDES}
        </p>
      )}
    </div>
  );
}
