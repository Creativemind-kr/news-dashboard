import * as cheerio from "cheerio";

export interface Notice {
  title: string;
  date: string;
  link: string;
  isNew: boolean;
}

export interface NoticeSource {
  id: string;
  name: string;
  url: string;
  notices: Notice[];
}

function isWithin3Days(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const diff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 3;
  } catch {
    return false;
  }
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function parseDate(text: string): string {
  const m = text.match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

// 심사평가원
async function fetchHira(): Promise<Notice[]> {
  const base = "https://www.hira.or.kr";
  const html = await fetchHtml(`${base}/bbsDummy.do?pgmid=HIRAA020002000100`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table tbody tr").each((_, el) => {
    const a = $(el).find("td a").first();
    const title = a.text().trim();
    const href = a.attr("href") ?? "";
    const date = parseDate($(el).find("td").eq(3).text());
    if (!title || title.length < 3) return;
    notices.push({
      title,
      date,
      link: href.startsWith("http") ? href : `${base}${href}`,
      isNew: isWithin3Days(date),
    });
  });
  return notices.slice(0, 5);
}

// 충남경제진흥원
async function fetchCepa(): Promise<Notice[]> {
  const base = "https://www.cepa.or.kr";
  const html = await fetchHtml(`${base}/notice/notice.do?pm=6&ms=32`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table tbody tr").each((_, el) => {
    const a = $(el).find("td a").first();
    const title = a.text().trim();
    const href = a.attr("href") ?? "";
    const date = parseDate($(el).find("td").last().text());
    if (!title || title.length < 3) return;
    const link = href.startsWith("http") ? href
      : href.startsWith("/") ? `${base}${href}`
      : `${base}/board/boardDetail.do?pm=6&ms=32&${href}`;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// Q-net
async function fetchQnet(): Promise<Notice[]> {
  const base = "https://www.q-net.or.kr";
  const html = await fetchHtml(`${base}/cst005.do?id=cst00501&gSite=Q`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table tbody tr").each((_, el) => {
    const a = $(el).find("td a").first();
    const title = a.text().trim();
    const href = a.attr("href") ?? "";
    const date = parseDate($(el).find("td").last().text());
    if (!title || title.length < 3) return;
    notices.push({ title, date, link: href.startsWith("http") ? href : `${base}${href}`, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// CQ-net
async function fetchCqnet(): Promise<Notice[]> {
  const candidates = [
    "https://www.cq.or.kr/board/boardList.do?boardId=notice",
    "https://www.cqnet.or.kr/notice/list.do",
  ];
  for (const url of candidates) {
    const html = await fetchHtml(url);
    if (!html) continue;
    const $ = cheerio.load(html);
    const notices: Notice[] = [];
    $("table tbody tr").each((_, el) => {
      const a = $(el).find("a").first();
      const title = a.text().trim();
      const href = a.attr("href") ?? "";
      const date = parseDate($(el).find("td").last().text());
      if (!title || title.length < 3) return;
      const base = new URL(url).origin;
      notices.push({ title, date, link: href.startsWith("http") ? href : `${base}${href}`, isNew: isWithin3Days(date) });
    });
    if (notices.length > 0) return notices.slice(0, 5);
  }
  return [];
}

// 고용노동부
async function fetchMoel(): Promise<Notice[]> {
  const base = "https://www.moel.go.kr";
  const candidates = [
    `${base}/news/notice/listView.do`,
    `${base}/info/notice/list.do`,
  ];
  for (const url of candidates) {
    const html = await fetchHtml(url);
    if (!html) continue;
    const $ = cheerio.load(html);
    const notices: Notice[] = [];
    $("table tbody tr").each((_, el) => {
      const a = $(el).find("td a").first();
      const title = a.text().trim();
      const href = a.attr("href") ?? "";
      const date = parseDate($(el).find("td").last().text());
      if (!title || title.length < 3) return;
      notices.push({ title, date, link: href.startsWith("http") ? href : `${base}${href}`, isNew: isWithin3Days(date) });
    });
    if (notices.length > 0) return notices.slice(0, 5);
  }
  return [];
}

// 산업인력공단
async function fetchHrdkorea(): Promise<Notice[]> {
  const base = "https://www.hrdkorea.or.kr";
  const html = await fetchHtml(`${base}/3/1/1`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table tbody tr").each((_, el) => {
    const a = $(el).find("a").first();
    const title = a.text().trim();
    const href = a.attr("href") ?? "";
    const date = parseDate($(el).find("td").last().text());
    if (!title || title.length < 3) return;
    notices.push({ title, date, link: href.startsWith("http") ? href : `${base}${href}`, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

const SOURCES = [
  { id: "hira",  name: "심사평가원",    url: "https://www.hira.or.kr",       fetch: fetchHira },
  { id: "cepa",  name: "충남경제진흥원", url: "https://www.cepa.or.kr",       fetch: fetchCepa },
  { id: "qnet",  name: "Q-net",         url: "https://www.q-net.or.kr",      fetch: fetchQnet },
  { id: "cqnet", name: "CQ-net",        url: "https://www.cq.or.kr",         fetch: fetchCqnet },
  { id: "moel",  name: "고용노동부",    url: "https://www.moel.go.kr",       fetch: fetchMoel },
  { id: "hrd",   name: "산업인력공단",  url: "https://www.hrdkorea.or.kr",   fetch: fetchHrdkorea },
];

export async function getAllNotices(): Promise<NoticeSource[]> {
  const results: NoticeSource[] = [];
  for (const s of SOURCES) {
    const notices = await s.fetch();
    results.push({ id: s.id, name: s.name, url: s.url, notices });
  }
  return results;
}
