import type { HotTopic } from "@/lib/fetchNews";

const TAG_COLORS: Record<string, string> = {
  AI: "bg-purple-100 text-purple-700",
  디자인: "bg-pink-100 text-pink-700",
  교육: "bg-green-100 text-green-700",
  "충청+대전": "bg-orange-100 text-orange-700",
};

export function HotTopicsView({ topics }: { topics: HotTopic[] }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-500 mb-4">
        2026년 분야별 핫토픽
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics.map((topic, i) => (
          <a
            key={i}
            href={topic.link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-100 transition-all block"
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  TAG_COLORS[topic.tag] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {topic.tag}
              </span>
              <span className="text-xs text-gray-400">{topic.source}</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 leading-snug mb-2 hover:text-blue-600">
              {topic.title}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {topic.summary}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
