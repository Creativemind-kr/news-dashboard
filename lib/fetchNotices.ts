import * as cheerio from "cheerio";

export interface Notice {
  title: string;
  date: string;
  link: string;
  isNew: boolean;
}

export interface SourceResult {
  id: string;
  name: string;
  siteUrl: string;
  color: string;
  emoji: string;
  notices: Notice[];
  error?: string;
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function isNewPost(dateStr: string): boolean {
  try {
    const cleaned = dateStr.replace(/\./g, "-").trim();
    const d = new Date(cleaned);
    const diffDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  } catch {
    return false;
  }
}

function resolveLink(href: string, baseUrl: string): string {
  if (!href) return baseUrl;
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return baseUrl + href;
  return baseUrl + "/" + href;
}

// ─── 심평원 ──────────────────────────────────────────────────────────────────
async function fetchHira(): Promise<Notice[]> {
  const url =
    "https://www.hira.or.kr/bbsDummy.do?pgmid=HIRAA020002000100&WT.ac=main_0020020";
  const base = "https://www.hira.or.kr";
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: Notice[] = [];

  $("table tbody tr").each((_, tr) => {
    const tds = $(tr).find("td");
    const titleTd = tds.filter((_, td) => {
      const cls = $(td).attr("class") ?? "";
      return cls.includes("subject") || cls.includes("title") || cls.includes("left");
    }).first();
    const anchor = titleTd.length ? titleTd.find("a").first() : $(tr).find("a").first();
    const title = anchor.text().trim();
    if (!title || title.length < 3) return;

    const href = anchor.attr("href") ?? "";
    const link = resolveLink(href, base);
    const dateTd = tds.last();
    const date = dateTd.text().trim().replace(/\s+/g, " ");

    results.push({ title, date, link, isNew: isNewPost(date) });
    if (results.length >= 8) return false;
  });

  return results;
}

// ─── 충남경제진흥원 ──────────────────────────────────────────────────────────
async function fetchCepa(): Promise<Notice[]> {
  const url = "https://www.cepa.or.kr/front/board/boardList.do?board_id=notice";
  const base = "https://www.cepa.or.kr";
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: Notice[] = [];

  // 여러 selector 패턴 시도
  const rows = $("table tbody tr, .board-list li, ul.list li");
  rows.each((_, el) => {
    const anchor = $(el).find("a").first();
    const title = anchor.text().trim();
    if (!title || title.length < 3) return;

    const href = anchor.attr("href") ?? "";
    const link = resolveLink(href, base);
    const dateEl = $(el).find(".date, td:last-child, .bd_date").first();
    const date = dateEl.text().trim() || "";

    results.push({ title, date, link, isNew: isNewPost(date) });
    if (results.length >= 8) return false;
  });

  return results;
}

// ─── 큐넷 ────────────────────────────────────────────────────────────────────
async function fetchQnet(): Promise<Notice[]> {
  const url = "https://www.q-net.or.kr/man001.do?id=man00101&gSite=Q";
  const base = "https://www.q-net.or.kr";
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: Notice[] = [];

  $("table tbody tr").each((_, tr) => {
    const anchor = $(tr).find("a").first();
    const title = anchor.text().trim();
    if (!title || title.length < 3) return;

    const href = anchor.attr("href") ?? "";
    const link = href.startsWith("http") ? href : base + href;
    const tds = $(tr).find("td");
    const date = tds.last().text().trim();

    results.push({ title, date, link, isNew: isNewPost(date) });
    if (results.length >= 8) return false;
  });

  return results;
}

// ─── 시큐넷 (KISIA 한국정보보호산업협회) ────────────────────────────────────
async function fetchSecunet(): Promise<Notice[]> {
  const url = "https://www.kisia.or.kr/main/sub.php?menukey=23&auto=1";
  const base = "https://www.kisia.or.kr";
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: Notice[] = [];

  $("table tbody tr, .bbs_list tr").each((_, tr) => {
    const anchor = $(tr).find("a").first();
    const title = anchor.text().trim();
    if (!title || title.length < 3) return;

    const href = anchor.attr("href") ?? "";
    const link = resolveLink(href, base);
    const tds = $(tr).find("td");
    const date = tds.last().text().trim();

    results.push({ title, date, link, isNew: isNewPost(date) });
    if (results.length >= 8) return false;
  });

  return results;
}

// ─── 고용노동부 ──────────────────────────────────────────────────────────────
async function fetchMoel(): Promise<Notice[]> {
  const url = "https://www.moel.go.kr/news/notice/listBbsView.do";
  const base = "https://www.moel.go.kr";
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: Notice[] = [];

  $("table tbody tr").each((_, tr) => {
    const titleTd = $(tr).find(".left, .tit, td.subject").first();
    const anchor = titleTd.length ? titleTd.find("a").first() : $(tr).find("a").first();
    const title = anchor.text().trim();
    if (!title || title.length < 3) return;

    const href = anchor.attr("href") ?? "";
    const link = resolveLink(href, base);
    const tds = $(tr).find("td");
    const date = tds.last().text().trim();

    results.push({ title, date, link, isNew: isNewPost(date) });
    if (results.length >= 8) return false;
  });

  return results;
}

// ─── 산업인력공단 ────────────────────────────────────────────────────────────
async function fetchHrd(): Promise<Notice[]> {
  const url = "https://www.hrdkorea.or.kr/3/1/1";
  const base = "https://www.hrdkorea.or.kr";
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: Notice[] = [];

  $("table tbody tr, .board_list tr").each((_, tr) => {
    const anchor = $(tr).find("a").first();
    const title = anchor.text().trim();
    if (!title || title.length < 3) return;

    const href = anchor.attr("href") ?? "";
    const link = resolveLink(href, base);
    const tds = $(tr).find("td");
    const date = tds.last().text().trim();

    results.push({ title, date, link, isNew: isNewPost(date) });
    if (results.length >= 8) return false;
  });

  return results;
}

// ─── 통합 fetch ──────────────────────────────────────────────────────────────
const SOURCES: Array<{
  id: string;
  name: string;
  siteUrl: string;
  color: string;
  emoji: string;
  fetch: () => Promise<Notice[]>;
}> = [
  {
    id: "hira",
    name: "심평원",
    siteUrl: "https://www.hira.or.kr/bbsDummy.do?pgmid=HIRAA020002000100",
    color: "blue",
    emoji: "🏥",
    fetch: fetchHira,
  },
  {
    id: "cepa",
    name: "충남경제진흥원",
    siteUrl: "https://www.cepa.or.kr/front/board/boardList.do?board_id=notice",
    color: "green",
    emoji: "🌿",
    fetch: fetchCepa,
  },
  {
    id: "qnet",
    name: "큐넷",
    siteUrl: "https://www.q-net.or.kr/man001.do?id=man00101&gSite=Q",
    color: "orange",
    emoji: "📋",
    fetch: fetchQnet,
  },
  {
    id: "secunet",
    name: "시큐넷",
    siteUrl: "https://www.kisia.or.kr/main/sub.php?menukey=23&auto=1",
    color: "purple",
    emoji: "🔒",
    fetch: fetchSecunet,
  },
  {
    id: "moel",
    name: "고용노동부",
    siteUrl: "https://www.moel.go.kr/news/notice/listBbsView.do",
    color: "red",
    emoji: "💼",
    fetch: fetchMoel,
  },
  {
    id: "hrd",
    name: "산업인력공단",
    siteUrl: "https://www.hrdkorea.or.kr/3/1/1",
    color: "indigo",
    emoji: "🏭",
    fetch: fetchHrd,
  },
];

export async function getAllNotices(): Promise<SourceResult[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async (src) => {
      const notices = await src.fetch();
      return {
        id: src.id,
        name: src.name,
        siteUrl: src.siteUrl,
        color: src.color,
        emoji: src.emoji,
        notices,
      } satisfies SourceResult;
    })
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      id: SOURCES[i].id,
      name: SOURCES[i].name,
      siteUrl: SOURCES[i].siteUrl,
      color: SOURCES[i].color,
      emoji: SOURCES[i].emoji,
      notices: [],
      error: String(r.reason),
    };
  });
}
