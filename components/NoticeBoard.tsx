import type { NoticeSource } from "@/lib/fetchNotices";

const SOURCE_COLORS: Record<string, string> = {
  hira:  "border-blue-400 bg-blue-50 text-blue-700",
  cepa:  "border-emerald-400 bg-emerald-50 text-emerald-700",
  qnet:  "border-orange-400 bg-orange-50 text-orange-700",
  cqnet: "border-purple-400 bg-purple-50 text-purple-700",
  moel:  "border-red-400 bg-red-50 text-red-700",
  hrd:   "border-teal-400 bg-teal-50 text-teal-700",
};

function NoticeCard({ source }: { source: NoticeSource }) {
  const color = SOURCE_COLORS[source.id] ?? "border-gray-300 bg-gray-50 text-gray-700";
  const newCount = source.notices.filter((n) => n.isNew).length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className={`px-5 py-3 border-b border-l-4 flex items-center justify-between ${color}`}>
        <h3 className="text-sm font-bold">{source.name}</h3>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">
              NEW {newCount}
            </span>
          )}
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs opacity-60 hover:opacity-100 underline"
          >
            바로가기
          </a>
        </div>
      </div>

      {/* 공지 목록 */}
      <ul className="divide-y divide-gray-50 pb-2">
        {source.notices.length === 0 ? (
          <li className="px-5 py-4 text-sm text-gray-400">공지를 불러올 수 없습니다.</li>
        ) : (
          source.notices.map((notice, i) => (
            <li key={i} className="hover:bg-gray-50 transition-colors">
              <a
                href={notice.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-5 py-3"
              >
                <div className="flex items-start gap-2">
                  {/* NEW 뱃지 */}
                  <div className="shrink-0 mt-0.5 w-10">
                    {notice.isNew ? (
                      <span className="inline-block text-xs font-bold text-red-500 border border-red-400 rounded px-1 py-0.5 leading-none">
                        NEW
                      </span>
                    ) : (
                      <span className="inline-block text-xs text-gray-300 w-10 text-center">{i + 1}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 leading-snug hover:text-blue-600 line-clamp-2">
                      {notice.title}
                    </p>
                    {notice.date && (
                      <p className="text-xs text-gray-400 mt-0.5">{notice.date}</p>
                    )}
                  </div>
                </div>
              </a>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function NoticeBoard({ sources }: { sources: NoticeSource[] }) {
  const totalNew = sources.reduce((acc, s) => acc + s.notices.filter((n) => n.isNew).length, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">사업공고 모니터</h2>
        {totalNew > 0 && (
          <span className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-full font-semibold">
            신규 {totalNew}건
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sources.map((source) => (
          <NoticeCard key={source.id} source={source} />
        ))}
      </div>
    </div>
  );
}
