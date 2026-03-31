import Parser from "rss-parser";

const parser = new Parser();

export const CATEGORIES = [
  { id: "design", label: "🎨 디자인", query: "디자인 UX UI 트렌드" },
  { id: "ai", label: "🤖 AI", query: "인공지능 AI ChatGPT LLM" },
  { id: "edu", label: "📚 교육", query: "교육 에듀테크 학교 입시" },
  { id: "local", label: "📍 충청+대전", query: "대전 충청 충남 충북" },
];

export interface NewsItem {
  title: string;
  summary: string;
  source: string;
  link: string;
  date: string;
}

export interface Category {
  id: string;
  label: string;
  query: string;
  news: NewsItem[];
}

export async function fetchNews(query: string, maxItems = 5): Promise<NewsItem[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`;
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, maxItems).map((item) => ({
      title: item.title ?? "",
      summary: item.contentSnippet?.slice(0, 100) ?? item.title ?? "",
      source: (item as { source?: { title?: string } }).source?.title ?? "구글뉴스",
      link: item.link ?? "",
      date: item.pubDate ?? "",
    }));
  } catch {
    return [];
  }
}

export async function getAllNews(): Promise<Category[]> {
  return Promise.all(
    CATEGORIES.map(async (cat) => ({
      ...cat,
      news: await fetchNews(cat.query),
    }))
  );
}
