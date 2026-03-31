import Parser from "rss-parser";

const parser = new Parser();

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

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
  summary: string;
  news: NewsItem[];
}

export interface HotTopic {
  title: string;
  summary: string;
  source: string;
  link: string;
  date: string;
  tag: string;
}

// 네이버 뉴스 검색 API (정렬 기준: sim=관련도, date=최신순)
async function fetchNaver(query: string, maxItems = 5, sort: "sim" | "date" = "sim"): Promise<NewsItem[]> {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${maxItems}&sort=${sort}`;
  try {
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
      },
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    return (data.items ?? []).map((item: { title: string; description: string; originallink: string; link: string; pubDate: string }) => ({
      title: item.title.replace(/<[^>]+>/g, ""),
      summary: item.description.replace(/<[^>]+>/g, "").slice(0, 120),
      source: new URL(item.originallink || item.link).hostname.replace("www.", ""),
      link: item.originallink || item.link,
      date: item.pubDate,
    }));
  } catch {
    return [];
  }
}

// 구글 RSS (fallback)
async function fetchRSS(query: string, maxItems = 5): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  try {
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, maxItems).map((item) => ({
      title: item.title ?? "",
      summary: item.contentSnippet?.slice(0, 120) ?? item.title ?? "",
      source: (item as { source?: { title?: string } }).source?.title ?? "구글뉴스",
      link: item.link ?? "",
      date: item.pubDate ?? "",
    }));
  } catch {
    return [];
  }
}

async function fetchNews(query: string, maxItems = 5, sort: "sim" | "date" = "date"): Promise<NewsItem[]> {
  if (NAVER_CLIENT_ID) {
    return fetchNaver(query, maxItems, sort);
  }
  return fetchRSS(query, maxItems);
}

function buildSummary(news: NewsItem[]): string {
  if (news.length === 0) return "뉴스를 불러올 수 없습니다.";
  return news.slice(0, 3).map((n) => n.title).join(" · ");
}

export async function getDailyNews(): Promise<Category[]> {
  return Promise.all(
    CATEGORIES.map(async (cat) => {
      const news = await fetchNews(cat.query, 5, "date");
      return { ...cat, summary: buildSummary(news), news };
    })
  );
}

export async function getWeeklyTop(): Promise<Category[]> {
  return Promise.all(
    CATEGORIES.map(async (cat) => {
      const news = await fetchNews(cat.query, 5, "sim");
      return { ...cat, summary: buildSummary(news), news };
    })
  );
}

export async function getMonthlyTop(): Promise<Category[]> {
  return Promise.all(
    CATEGORIES.map(async (cat) => {
      const news = await fetchNews(`${cat.query} 월간`, 5, "sim");
      return { ...cat, summary: buildSummary(news), news };
    })
  );
}

export async function getHotTopics2026(): Promise<HotTopic[]> {
  const queries = [
    { q: "2026 AI 인공지능 트렌드", tag: "AI" },
    { q: "2026 디자인 트렌드", tag: "디자인" },
    { q: "2026 교육 트렌드", tag: "교육" },
    { q: "2026 대전 충청 이슈", tag: "충청+대전" },
  ];

  const results = await Promise.all(
    queries.map(async ({ q, tag }) => {
      const items = await fetchNews(q, 3, "sim");
      return items.map((item) => ({ ...item, tag }));
    })
  );

  return results.flat();
}
