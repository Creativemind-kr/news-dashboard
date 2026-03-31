interface NewsItem {
  title: string;
  summary: string;
  source: string;
  link: string;
  date: string;
}

interface Category {
  id: string;
  label: string;
  news: NewsItem[];
}

export function NewsCategory({ category }: { category: Category }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800">{category.label}</h2>
      </div>
      <ul className="divide-y divide-gray-50">
        {category.news.length === 0 ? (
          <li className="px-5 py-4 text-sm text-gray-400">뉴스를 불러올 수 없습니다.</li>
        ) : (
          category.news.map((item, i) => (
            <li key={i} className="px-5 py-4 hover:bg-gray-50 transition-colors">
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                <p className="text-sm font-medium text-gray-900 leading-snug mb-1 hover:text-blue-600">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed mb-2">{item.summary}</p>
                <span className="text-xs text-gray-400">{item.source}</span>
              </a>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
