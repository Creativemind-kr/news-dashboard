import type { CompetitorGroup } from "@/lib/fetchNews";

const BRAND_COLORS: Record<string, string> = {
  "이젠아카데미":       "border-red-400 text-red-700 bg-red-50",
  "그린컴퓨터아카데미": "border-green-400 text-green-700 bg-green-50",
  "더조은컴퓨터아카데미":"border-purple-400 text-purple-700 bg-purple-50",
  "KH정보교육원":       "border-orange-400 text-orange-700 bg-orange-50",
  "패스트캠퍼스":       "border-pink-400 text-pink-700 bg-pink-50",
  "코드스테이츠":       "border-blue-400 text-blue-700 bg-blue-50",
  "멀티캠퍼스":         "border-teal-400 text-teal-700 bg-teal-50",
  "에이블스쿨":         "border-indigo-400 text-indigo-700 bg-indigo-50",
};

interface Props {
  competitors: CompetitorGroup[];
}

function CompetitorCard({ comp }: { comp: CompetitorGroup }) {
  const color = BRAND_COLORS[comp.name] ?? "border-gray-300 text-gray-700 bg-gray-50";
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`px-5 py-3 border-b border-l-4 ${color}`}>
        <h3 className="text-sm font-bold">{comp.name}</h3>
      </div>
      <ul className="divide-y divide-gray-50 pb-2">
        {comp.news.length === 0 ? (
          <li className="px-5 py-4 text-sm text-gray-400">관련 교육 뉴스 없음</li>
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
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.summary}</p>
                    <span className="text-xs text-gray-400 mt-1 inline-block">{item.source}</span>
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

export function CompetitorNews({ competitors }: Props) {
  const local = competitors.filter((c) => c.group === "충청권");
  const online = competitors.filter((c) => c.group === "온라인");

  return (
    <div className="space-y-8">
      {/* 충청권 경쟁사 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base font-bold text-gray-800">📍 충청권 경쟁사</span>
          <span className="text-xs bg-orange-100 text-orange-600 font-medium px-2 py-0.5 rounded-full">
            {local.length}개 기관
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {local.map((comp) => (
            <CompetitorCard key={comp.name} comp={comp} />
          ))}
        </div>
      </section>

      {/* 온라인 경쟁사 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base font-bold text-gray-800">💻 온라인 경쟁사</span>
          <span className="text-xs bg-blue-100 text-blue-600 font-medium px-2 py-0.5 rounded-full">
            {online.length}개 기관
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {online.map((comp) => (
            <CompetitorCard key={comp.name} comp={comp} />
          ))}
        </div>
      </section>
    </div>
  );
}
