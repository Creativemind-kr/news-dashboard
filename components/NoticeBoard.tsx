import type { NoticeSource } from "@/lib/fetchNotices";

const SOURCE_COLORS: Record<string, string> = {
  hira:          "border-blue-400 bg-blue-50 text-blue-700",
  moel:          "border-red-400 bg-red-50 text-red-700",
  qnet:          "border-orange-400 bg-orange-50 text-orange-700",
  cqnet:         "border-purple-400 bg-purple-50 text-purple-700",
  kacpta:        "border-yellow-400 bg-yellow-50 text-yellow-700",
  hrd:           "border-teal-400 bg-teal-50 text-teal-700",
  hrdi:          "border-indigo-400 bg-indigo-50 text-indigo-700",
  cepa:          "border-emerald-400 bg-emerald-50 text-emerald-700",
  "cepa-special":  "border-green-500 bg-green-50 text-green-700",
  "cepa-regional": "border-lime-500 bg-lime-50 text-lime-700",
  nipa:            "border-cyan-400 bg-cyan-50 text-cyan-700",
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

function SectionHeader({ title, sources }: { title: string; sources: NoticeSource[] }) {
  const newCount = sources.reduce((acc, s) => acc + s.notices.filter((n) => n.isNew).length, 0);
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</h2>
      {newCount > 0 && (
        <span className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-full font-semibold">
          신규 {newCount}건
        </span>
      )}
    </div>
  );
}

export function NoticeBoard({ sources }: { sources: NoticeSource[] }) {
  const publicSources = sources.filter((s) => s.group === "public");
  const chungnamSources = sources.filter((s) => s.group === "chungnam");

  return (
    <div className="space-y-10">
      {/* 공용 사업공고 모니터 */}
      <div>
        <SectionHeader title="공용 사업공고 모니터" sources={publicSources} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {publicSources.map((source) => (
            <NoticeCard key={source.id} source={source} />
          ))}
        </div>
      </div>

      {/* 충남지역 공고 모니터 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <SectionHeader title="충남지역 공고 모니터" sources={chungnamSources} />
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {chungnamSources.map((source) => (
            <NoticeCard key={source.id} source={source} />
          ))}
        </div>
      </div>
    </div>
  );
}
