import type { Category } from "@/lib/fetchNews";

interface Props {
  categories: Category[];
  showSummary?: boolean;
  label?: string;
}

export function CategoryGrid({ categories, showSummary, label }: Props) {
  return (
    <div>
      {label && (
        <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">{label}</h2>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Category Header */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">{cat.label}</h3>
            </div>

            {/* Summary Banner */}
            {showSummary && cat.summary && cat.summary !== "뉴스를 불러올 수 없습니다." && (
              <div className="mx-4 my-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg px-4 py-3">
                <p className="text-xs font-semibold text-blue-600 mb-1">오늘의 요약</p>
                <p className="text-xs text-blue-800 leading-relaxed">{cat.summary}</p>
              </div>
            )}

            {/* News List */}
            <ul className="divide-y divide-gray-50 pb-2">
              {cat.news.length === 0 ? (
                <li className="px-5 py-4 text-sm text-gray-400">뉴스를 불러올 수 없습니다.</li>
              ) : (
                cat.news.map((item, i) => (
                  <li key={i} className="hover:bg-gray-50 transition-colors">
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="block px-5 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-blue-400 mt-0.5 shrink-0 w-4">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 leading-snug hover:text-blue-600 truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                            {item.summary}
                          </p>
                          <span className="text-xs text-gray-400 mt-1 inline-block">{item.source}</span>
                        </div>
                      </div>
                    </a>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
