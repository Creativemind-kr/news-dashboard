import * as cheerio from "cheerio";
import iconv from "iconv-lite";

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
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24) <= 3;
  } catch {
    return false;
  }
}

function parseDate(text: string): string {
  const m = text.match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

async function fetchHtml(url: string, encoding = "utf-8"): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 1800 },
    });
    if (!res.ok) return "";
    if (encoding === "euc-kr") {
      const buf = await res.arrayBuffer();
      return iconv.decode(Buffer.from(buf), "euc-kr");
    }
    const text = await res.text();
    // Content-Type 헤더로 인코딩 감지
    const ct = res.headers.get("content-type") ?? "";
    if (ct.toLowerCase().includes("euc-kr")) {
      const buf = Buffer.from(text, "binary");
      return iconv.decode(buf, "euc-kr");
    }
    return text;
  } catch {
    return "";
  }
}

// 직업능력심사평가원 (ksqa.or.kr)
async function fetchKsqa(): Promise<Notice[]> {
  const base = "https://www.ksqa.or.kr";
  try {
    const html = await fetchHtml(`${base}/?pid=HP010101`);
    if (!html) return [];
    const $ = cheerio.load(html);
    const notices: Notice[] = [];
    $("td.list_subject").each((_, td) => {
      const href = $(td).find("a").attr("href") ?? "";
      const nttMatch = href.match(/nttId=(\d+)/);
      const title = $(td).text().trim().replace(/\s+/g, " ");
      const tr = $(td).closest("tr");
      const date = parseDate(tr.find("td").last().text());
      if (!title || title.length < 3) return;
      const link = nttMatch
        ? `${base}/?bbsMode=view&bbsId=BBSMSTR_000000000021&nttId=${nttMatch[1]}&pid=HP010101`
        : `${base}/?pid=HP010101`;
      notices.push({ title, date, link, isNew: isWithin3Days(date) });
    });
    return notices.slice(0, 5);
  } catch {
    return [];
  }
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

// Q-net — onclick에서 artlSeq 추출
async function fetchQnet(): Promise<Notice[]> {
  const base = "https://www.q-net.or.kr";
  const html = await fetchHtml(`${base}/man004.do?id=man00401s01&page=1&notiType=10&gSite=Q`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table tbody tr").each((_, el) => {
    const a = $(el).find("td a, td[onclick]").first();
    const title = a.text().trim() || $(el).find("td").eq(1).text().trim();
    const onclickAttr = $(el).attr("onclick") ?? a.attr("onclick") ?? "";
    const seqMatch = onclickAttr.match(/goNext\((\d+)/);
    const date = parseDate($(el).find("td").last().text());
    if (!title || title.length < 3) return;
    const link = seqMatch
      ? `${base}/man004.do?id=man00402&BOARD_ID=Q001&ARTL_SEQ=${seqMatch[1]}&gSite=Q`
      : `${base}/man004.do?id=man00401&notiType=10&gSite=Q`;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// CQ-net (c.q-net.or.kr — JSON API 사용)
async function fetchCqnet(): Promise<Notice[]> {
  const base = "https://c.q-net.or.kr";
  try {
    const res = await fetch(`${base}/support/noticeList.json?pageIndex=1&pageUnit=5`, {
      headers: { ...HEADERS, Referer: `${base}/cmn/com/main.do` },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items: { nttSj: string; nttId: number; frstRegistPnttm: string }[] = [
      ...(data.fixedNttList ?? []),
      ...(data.nttList ?? []),
    ];
    return items.slice(0, 5).map((item) => {
      const date = item.frstRegistPnttm?.slice(0, 10) ?? "";
      return {
        title: item.nttSj,
        date,
        link: `${base}/support/noticeDetail.do?nttId=${item.nttId}`,
        isNew: isWithin3Days(date),
      };
    });
  } catch {
    return [];
  }
}

// 고용노동부 — RSS 피드 파싱
async function fetchMoel(): Promise<Notice[]> {
  try {
    const xml = await fetchHtml("https://www.moel.go.kr/rss/notice.do");
    if (!xml) return [];
    const $ = cheerio.load(xml, { xmlMode: true });
    const notices: Notice[] = [];
    $("item").each((_, el) => {
      const title = $(el).find("title").text().trim();
      const link = $(el).find("link").text().trim();
      let dateStr = "";
      $(el).children().each((_, c) => {
        if (($(c).prop("tagName") ?? "").toUpperCase() === "DC:DATE") dateStr = $(c).text().trim();
      });
      const date = dateStr.slice(0, 10);
      if (!title || title.length < 3) return;
      notices.push({ title, date, link, isNew: isWithin3Days(date) });
    });
    return notices.slice(0, 5);
  } catch {
    return [];
  }
}

// 산업인력공단 — EUC-KR 강제 디코딩
async function fetchHrdkorea(): Promise<Notice[]> {
  const base = "https://www.hrdkorea.or.kr";
  const html = await fetchHtml(`${base}/3/1/1`, "euc-kr");
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table tbody tr").each((_, el) => {
    const a = $(el).find("a").first();
    const title = a.text().trim();
    const href = a.attr("href") ?? "";
    const date = parseDate($(el).find("td").last().text());
    if (!title || title.length < 3) return;
    const link = href.startsWith("http") ? href
      : href.startsWith("/") ? `${base}${href}`
      : `${base}/3/1/1?k=${href.replace(/\D/g, "")}&pageNo=1`;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

const SOURCES = [
  { id: "hira",  name: "심사평가원",    url: "https://www.ksqa.or.kr/?pid=HP010101",     fetch: fetchKsqa },
  { id: "cepa",  name: "충남경제진흥원", url: "https://www.cepa.or.kr",     fetch: fetchCepa },
  { id: "qnet",  name: "Q-net",         url: "https://www.q-net.or.kr",    fetch: fetchQnet },
  { id: "cqnet", name: "CQ-net",        url: "https://c.q-net.or.kr",      fetch: fetchCqnet },
  { id: "moel",  name: "고용노동부",    url: "https://www.moel.go.kr/news/notice/noticeList.do",     fetch: fetchMoel },
  { id: "hrd",   name: "산업인력공단",  url: "https://www.hrdkorea.or.kr", fetch: fetchHrdkorea },
];

export async function getAllNotices(): Promise<NoticeSource[]> {
  const results: NoticeSource[] = [];
  for (const s of SOURCES) {
    const notices = await s.fetch();
    results.push({ id: s.id, name: s.name, url: s.url, notices });
  }
  return results;
}
