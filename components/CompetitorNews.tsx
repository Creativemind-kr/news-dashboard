import type { CompetitorItem } from "@/lib/fetchNews";

const BRAND_COLORS: Record<string, string> = {
  "이젠아카데미": "bg-red-50 border-red-300 text-red-700",
  "그린컴퓨터아카데미": "bg-green-50 border-green-300 text-green-700",
  "더조은컴퓨터아카데미": "bg-purple-50 border-purple-300 text-purple-700",
  "KH정보교육원": "bg-orange-50 border-orange-300 text-orange-700",
  "패스트캠퍼스": "bg-pink-50 border-pink-300 text-pink-700",
};

interface Props {
  competitors: { name: string; news: CompetitorItem[] }[];
}

export function CompetitorNews({ competitors }: Props) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">경쟁사 동향</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {competitors.map((comp) => (
          <div key={comp.name} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`px-5 py-3 border-b border-l-4 ${BRAND_COLORS[comp.name] ?? "bg-gray-50 border-gray-300 text-gray-700"}`}>
              <h3 className="text-sm font-bold">{comp.name}</h3>
            </div>
            <ul className="divide-y divide-gray-50 pb-2">
              {comp.news.length === 0 ? (
                <li className="px-5 py-4 text-sm text-gray-400">관련 뉴스 없음</li>
              ) : (
                comp.news.map((item, i) => (
                  <li key={i} className="hover:bg-gray-50 transition-colors">
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="block px-5 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-gray-300 mt-0.5 shrink-0 w-4">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 leading-snug hover:text-blue-600 line-clamp-2">
                            {item.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.summary}</p>
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
