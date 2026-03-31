import type { Category, HotTopic, CompetitorGroup, NewsItem } from "@/lib/fetchNews";

export interface Top5Item extends NewsItem {
  catLabel: string;
}

export function extractTop5FromCategories(categories: Category[]): Top5Item[] {
  // 각 카테고리에서 1개씩 먼저 뽑고, 나머지로 채움
  const primary = categories
    .filter((c) => c.news.length > 0)
    .map((c) => ({ ...c.news[0], catLabel: c.label }));

  const secondary = categories.flatMap((c) =>
    c.news.slice(1).map((n) => ({ ...n, catLabel: c.label }))
  );

  return [...primary, ...secondary].slice(0, 5);
}

export function extractTop5FromHotTopics(topics: HotTopic[]): Top5Item[] {
  return topics.slice(0, 5).map((t) => ({ ...t, catLabel: t.tag }));
}

export function extractTop5FromCompetitors(competitors: CompetitorGroup[]): Top5Item[] {
  const primary = competitors
    .filter((c) => c.news.length > 0)
    .map((c) => ({ ...c.news[0], catLabel: c.name }));

  const secondary = competitors.flatMap((c) =>
    c.news.slice(1).map((n) => ({ ...n, catLabel: c.name }))
  );

  return [...primary, ...secondary].slice(0, 5);
}
