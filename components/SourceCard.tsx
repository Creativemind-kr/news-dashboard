import type { SourceResult } from "@/lib/fetchNotices";

const COLOR_MAP: Record<string, { bg: string; badge: string; dot: string; link: string }> = {
  blue:   { bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-400",   link: "text-blue-600 hover:text-blue-800" },
  green:  { bg: "bg-green-50",  badge: "bg-green-100 text-green-700",  dot: "bg-green-400",  link: "text-green-600 hover:text-green-800" },
  orange: { bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-400", link: "text-orange-600 hover:text-orange-800" },
  purple: { bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700", dot: "bg-purple-400", link: "text-purple-600 hover:text-purple-800" },
  red:    { bg: "bg-red-50",    badge: "bg-red-100 text-red-700",    dot: "bg-red-400",    link: "text-red-600 hover:text-red-800" },
  indigo: { bg: "bg-indigo-50", badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-400", link: "text-indigo-600 hover:text-indigo-800" },
};

export function SourceCard({ source }: { source: SourceResult }) {
  const c = COLOR_MAP[source.color] ?? COLOR_MAP.blue;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`${c.bg} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{source.emoji}</span>
          <span className="font-semibold text-gray-800">{source.name}</span>
          {source.notices.some((n) => n.isNew) && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>NEW</span>
          )}
        </div>
        <a
          href={source.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs font-medium ${c.link}`}
        >
          전체보기 →
        </a>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-50">
        {source.error ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-gray-400 mb-3">공고를 불러오지 못했어요</p>
            <a
              href={source.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
            >
              직접 방문하기
            </a>
          </div>
        ) : source.notices.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">
            공고가 없습니다
          </div>
        ) : (
          source.notices.map((notice, i) => (
            <a
              key={i}
              href={notice.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-5 py-3.5 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-start gap-2">
                {notice.isNew && (
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 group-hover:text-gray-900 leading-snug line-clamp-2">
                    {notice.title}
                  </p>
                  {notice.date && (
                    <p className="text-xs text-gray-400 mt-1">{notice.date}</p>
                  )}
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
