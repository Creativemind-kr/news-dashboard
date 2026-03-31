import type { NewsItem } from "@/lib/fetchNews";

interface Top5Item extends NewsItem {
  catLabel: string;
}

interface Props {
  items: Top5Item[];
}

export function Top5Sidebar({ items }: Props) {
  return (
    <aside className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-fit sticky top-20">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500">
        <h3 className="text-sm font-bold text-white">🏆 Top 5 뉴스</h3>
        <p className="text-xs text-blue-100 mt-0.5">전체 파트 주요 뉴스</p>
      </div>
      <ul className="divide-y divide-gray-50">
        {items.map((item, i) => (
          <li key={i} className="hover:bg-gray-50 transition-colors">
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="block px-4 py-3">
              <div className="flex items-start gap-2 mb-2">
                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  i === 0 ? "bg-yellow-400" :
                  i === 1 ? "bg-gray-400" :
                  i === 2 ? "bg-orange-400" :
                  "bg-blue-200"
                }`}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <span className="inline-block text-xs bg-blue-50 text-blue-600 font-medium px-1.5 py-0.5 rounded mb-1">
                    {item.catLabel}
                  </span>
                  <p className="text-xs font-semibold text-gray-900 leading-snug hover:text-blue-600 line-clamp-2">
                    {item.title}
                  </p>
                </div>
              </div>
              {item.summary && (
                <div className="ml-7 bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                    {item.summary}
                  </p>
                </div>
              )}
              <p className="ml-7 text-xs text-gray-300 mt-1">{item.source}</p>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
