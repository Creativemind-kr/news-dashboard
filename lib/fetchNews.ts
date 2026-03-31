const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID ?? "";
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET ?? "";

function decodeHtml(str: string): string {
  return str
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export const CATEGORIES = [
  {
    id: "design",
    label: "🎨 디자인",
    query: "디자인 UX UI 트렌드",
    keywords: ["디자인", "UX", "UI", "트렌드", "design", "인터페이스", "브랜드"],
  },
  {
    id: "ai",
    label: "🤖 AI",
    query: "인공지능 AI ChatGPT LLM",
    keywords: ["AI", "인공지능", "ChatGPT", "LLM", "GPT", "딥러닝", "머신러닝", "생성형", "Claude", "Gemini"],
  },
  {
    id: "edu",
    label: "📚 교육",
    query: "교육 에듀테크 학교 입시",
    keywords: ["교육", "에듀테크", "학교", "입시", "학생", "수업", "대학", "학습", "커리큘럼"],
  },
  {
    id: "local",
    label: "📍 충청+대전",
    query: "대전 충청 충남 충북",
    keywords: ["대전", "충청", "충남", "충북", "세종", "청주", "천안", "공주", "논산"],
  },
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
  keywords: string[];
  summary: string;
  news: NewsItem[];
}

export interface HotTopic extends NewsItem {
  tag: string;
}

export interface CompetitorItem extends NewsItem {}

const COMPETITORS = [
  { name: "이젠아카데미", query: "이젠아카데미" },
  { name: "그린컴퓨터아카데미", query: "그린컴퓨터아카데미" },
  { name: "더조은컴퓨터아카데미", query: "더조은컴퓨터아카데미" },
  { name: "KH정보교육원", query: "KH정보교육원" },
  { name: "패스트캠퍼스", query: "패스트캠퍼스 교육" },
];

function isRelevant(item: NewsItem, keywords: string[]): boolean {
  const text = (item.title + " " + item.summary).toLowerCase();
  return keywords.some((kw) => text.includes(kw.toLowerCase()));
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchNaver(query: string, maxItems = 8, sort: "sim" | "date" = "date"): Promise<NewsItem[]> {
  if (!NAVER_CLIENT_ID) return [];
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${maxItems}&sort=${sort}`;
  try {
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map((item: { title: string; description: string; originallink: string; link: string; pubDate: string }) => ({
      title: decodeHtml(item.title),
      summary: decodeHtml(item.description).slice(0, 120),
      source: (() => {
        try { return new URL(item.originallink || item.link).hostname.replace("www.", ""); } catch { return "네이버뉴스"; }
      })(),
      link: item.originallink || item.link,
      date: item.pubDate,
    }));
  } catch {
    return [];
  }
}

async function fetchCategory(cat: typeof CATEGORIES[0], sort: "sim" | "date", extraKeyword = ""): Promise<Category> {
  const query = extraKeyword ? `${cat.query} ${extraKeyword}` : cat.query;
  const raw = await fetchNaver(query, 10, sort);
  const filtered = raw.filter((item) => isRelevant(item, cat.keywords)).slice(0, 5);
  const news = filtered.length > 0 ? filtered : raw.slice(0, 5);
  const summary = news.slice(0, 3).map((n) => n.title).join(" · ") || "뉴스를 불러올 수 없습니다.";
  return { ...cat, summary, news };
}

export async function getDailyNews(): Promise<Category[]> {
  const results: Category[] = [];
  for (const cat of CATEGORIES) {
    results.push(await fetchCategory(cat, "date"));
    await delay(200);
  }
  return results;
}

export async function getWeeklyTop(): Promise<Category[]> {
  const results: Category[] = [];
  for (const cat of CATEGORIES) {
    results.push(await fetchCategory(cat, "sim"));
    await delay(200);
  }
  return results;
}

export async function getMonthlyTop(): Promise<Category[]> {
  const results: Category[] = [];
  for (const cat of CATEGORIES) {
    results.push(await fetchCategory(cat, "sim", "월간"));
    await delay(200);
  }
  return results;
}

export async function getCompetitorNews(): Promise<{ name: string; news: CompetitorItem[] }[]> {
  const results = [];
  for (const comp of COMPETITORS) {
    const items = await fetchNaver(comp.query, 3, "date");
    results.push({ name: comp.name, news: items });
    await delay(200);
  }
  return results;
}

export async function getHotTopics2026(): Promise<HotTopic[]> {
  const queries = [
    { q: "2026 AI 인공지능 트렌드", tag: "AI", keywords: ["AI", "인공지능", "2026"] },
    { q: "2026 디자인 트렌드", tag: "디자인", keywords: ["디자인", "트렌드", "2026"] },
    { q: "2026 교육 트렌드", tag: "교육", keywords: ["교육", "트렌드", "2026"] },
    { q: "2026 대전 충청 이슈", tag: "충청+대전", keywords: ["대전", "충청", "2026"] },
  ];

  const results: HotTopic[] = [];
  for (const { q, tag, keywords } of queries) {
    const items = await fetchNaver(q, 6, "sim");
    const filtered = items.filter((i) => isRelevant(i, keywords)).slice(0, 3);
    const final = filtered.length > 0 ? filtered : items.slice(0, 3);
    final.forEach((item) => results.push({ ...item, tag }));
    await delay(200);
  }
  return results;
}
