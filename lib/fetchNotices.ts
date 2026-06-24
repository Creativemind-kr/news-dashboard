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
  group: "public" | "chungnam";
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

function parseGnuDate(raw: string): string {
  const full = raw.match(/(\d{4})[.\-\/](\d{2})[.\-\/](\d{2})/);
  if (full) return `${full[1]}-${full[2]}-${full[3]}`;
  const short = raw.trim().match(/^(\d{2})[.\-\/](\d{2})$/);
  if (short) return `${new Date().getFullYear()}-${short[1]}-${short[2]}`;
  return "";
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9",
};

async function fetchHtml(
  url: string,
  encoding = "utf-8",
  timeoutMs = 5000,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { ...HEADERS, ...extraHeaders },
      next: { revalidate: 1800 },
      signal: controller.signal,
    });
    clearTimeout(timer);
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

const PROXY = "https://ksqa-proxy.dbgustjr4799.workers.dev";

// 직업능력심사평가원 (ksqa.or.kr) — Cloudflare Worker 경유
async function fetchKsqa(): Promise<Notice[]> {
  const base = "https://www.ksqa.or.kr";
  try {
    const html = await fetchHtml(`${PROXY}?url=${encodeURIComponent(`${base}/?pid=HP010101`)}`);
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

// 고용노동부 — GitHub Actions JSON 우선, 실패 시 직접 크롤링
async function fetchMoel(): Promise<Notice[]> {
  // 1차: GitHub raw JSON (GH Actions 매시간 갱신)
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/Creativemind-kr/news-dashboard/data/moel-notices.json",
      { cache: "no-store" }
    );
    if (res.ok) {
      const items: { title: string; link: string; date: string }[] = await res.json();
      const filtered = items.filter((item) => item.title.startsWith("[공고]")).slice(0, 5);
      if (filtered.length > 0) {
        return filtered.map((item) => ({
          title: item.title, date: item.date, link: item.link, isNew: isWithin3Days(item.date),
        }));
      }
    }
  } catch {}

  // 2차 fallback: 직접 크롤링
  const base = "https://www.moel.go.kr";
  try {
    const html = await fetchHtml(`${base}/news/notice/noticeList.do`);
    if (!html) return [];
    const $ = cheerio.load(html);
    const notices: Notice[] = [];
    $("table tbody tr").each((_, el) => {
      const a = $(el).find("a").first();
      const title = a.text().trim().replace(/\s+/g, " ");
      const href = a.attr("href") ?? "";
      if (!title.startsWith("[공고]") || title.length < 5) return;
      const date = parseDate($(el).text());
      const link = href.startsWith("http") ? href
        : href.startsWith("/") ? `${base}${href}`
        : `${base}/news/notice/noticeList.do`;
      notices.push({ title, date, link, isNew: isWithin3Days(date) });
    });
    return notices.slice(0, 5);
  } catch {
    return [];
  }
}

// 한국세무사회 — GitHub Actions JSON 우선, 직접 크롤링 fallback
async function fetchKacpta(): Promise<Notice[]> {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/Creativemind-kr/news-dashboard/data/kacpta-notices.json",
      { cache: "no-store" }
    );
    if (res.ok) {
      const items: { title: string; link: string; date: string }[] = await res.json();
      if (items.length > 0) {
        return items.slice(0, 5).map((item) => ({
          title: item.title, date: item.date, link: item.link, isNew: isWithin3Days(item.date),
        }));
      }
    }
  } catch {}

  // fallback: 직접 크롤링 (Vercel IP 차단 시 빈 배열 반환)
  const base = "https://license.kacpta.or.kr";
  try {
    const html = await fetchHtml(`${base}/web/notice/notice.aspx`, "euc-kr");
    if (!html) return [];
    const $ = cheerio.load(html);
    const notices: Notice[] = [];
    // table.table_notice — sNo.value onclick 패턴
    $("table.table_notice tr").each((_, el) => {
      const onclickText = $(el).find("td[onclick]").first().attr("onclick") ?? "";
      const sNoMatch = onclickText.match(/sNo\.value='(\d+)'/);
      if (!sNoMatch) return;
      const titleTd = $(el).find("td[onclick]").eq(1);
      const rawHtml = titleTd.html() ?? "";
      const title = rawHtml.replace(/<\/?[a-zA-Z][^>]*>/g, "").replace(/\s+/g, " ").trim();
      if (!title || title.length < 3) return;
      const date = parseDate($(el).text());
      const link = `${base}/web/notice/notice.aspx?dsp_mode=Show&sNo=${sNoMatch[1]}`;
      notices.push({ title, date, link, isNew: isWithin3Days(date) });
    });
    return notices.slice(0, 5);
  } catch { return []; }
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

// 능력개발교육원 — Polaris LMS (SPA), 메인 HTML에 임베드된 MIDDLE_BANNER_LIST 파싱
async function fetchHrdi(): Promise<Notice[]> {
  const base = "https://hrdi.koreatech.ac.kr";
  const html = await fetchHtml(`${base}/?m1=page&menu_id=11`);
  if (!html) return [];
  // HTML에 임베드된 MIDDLE_BANNER_LIST JSON 추출
  const match = html.match(/var MIDDLE_BANNER_LIST\s*=\s*(\{[^\n]+\});/);
  if (!match) return [];
  try {
    const data = JSON.parse(match[1]) as {
      list: Array<{
        is_available: number;
        is_deleted: number;
        title: string;
        effective_start_date?: string;
        properties?: { url?: string };
      }>;
    };
    return (data.list ?? [])
      .filter((item) => item.is_available && !item.is_deleted && item.title?.length > 2)
      .slice(0, 5)
      .map((item) => {
        const date = (item.effective_start_date ?? "").slice(0, 10);
        const link = item.properties?.url ?? base;
        return { title: item.title, date, link, isNew: isWithin3Days(date) };
      });
  } catch {
    return [];
  }
}

// 충남경제진흥원 — 일반공지
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

// 충남경제진흥원 사업공고 공통 fetch
async function fetchCepaBusiness(url: string, fallbackUrl: string): Promise<Notice[]> {
  const base = "https://www.cepa.or.kr";
  const html = await fetchHtml(url);
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
      : fallbackUrl;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// 산업구조변화대응 특화훈련사업
async function fetchCepaSpecial(): Promise<Notice[]> {
  const url = "https://www.cepa.or.kr/business/business.do?pm=4&ms=123";
  return fetchCepaBusiness(url, url);
}

// 지역산업 맞춤 인력양성사업
async function fetchCepaRegional(): Promise<Notice[]> {
  const url = "https://www.cepa.or.kr/business/business.do?pm=4&ms=123";
  return fetchCepaBusiness(url, url);
}

// 정보통신산업진흥원 (NIPA)
async function fetchNipa(): Promise<Notice[]> {
  const base = "https://www.nipa.kr";
  const html = await fetchHtml(`${base}/home/2-2?tab=1`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table.tbgg tbody tr").each((_, el) => {
    const a = $(el).find("td.tl a").first();
    const title = a.text().trim().replace(/\s+/g, " ");
    const href = a.attr("href") ?? "";
    const date = parseDate($(el).find("td").last().find("span.bco").text().trim());
    if (!title || title.length < 3) return;
    const link = href.startsWith("http") ? href
      : href.startsWith("/") ? `${base}${href}`
      : `${base}/home/2-2`;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// ── 그누보드 공통 헬퍼 ────────────────────────────────────────────────────────
async function fetchGnuboard(base: string, boTable: string): Promise<Notice[]> {
  const html = await fetchHtml(`${base}/bbs/board.php?bo_table=${boTable}`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("tbody tr").each((_, el) => {
    const a = $(el).find("td.td_subject a").first();
    const title = a.text().trim().replace(/\s+/g, " ");
    const href = a.attr("href") ?? "";
    const rawDate = $(el).find("td.td_datetime").text().trim();
    const date = parseGnuDate(rawDate);
    if (!title || title.length < 3) return;
    const link = href.startsWith("http") ? href
      : href.startsWith("/") ? `${base}${href}`
      : `${base}/bbs/${href}`;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// 천안청년센터이음 — 그누보드
async function fetchChYouth(): Promise<Notice[]> {
  return fetchGnuboard("https://www.ch2030youth.kr", "notice");
}

// 천안시청 — button onclick 기반 (a 태그 없음)
async function fetchCheonanCity(): Promise<Notice[]> {
  const base = "https://www.cheonan.go.kr";
  const listUrl = `${base}/bbs/BBSMSTR_000000000028/list.do`;
  try {
    const html = await fetchHtml(listUrl);
    if (!html) return [];
    const $ = cheerio.load(html);
    const notices: Notice[] = [];
    $("table tbody tr").each((_, el) => {
      const titleTd = $(el).find("td.board__table--title");
      const title = titleTd.find(".board__subject-text").text().trim().replace(/\s+/g, " ");
      const onclick = titleTd.find("button").attr("onclick") ?? "";
      const idMatch = onclick.match(/fn_search_detail\('([^']+)'\)/);
      const date = parseDate($(el).find("td.board__table--date").text().trim());
      if (!title || title.length < 3) return;
      const id = idMatch ? idMatch[1] : "";
      const link = id
        ? `${base}/bbs/BBSMSTR_000000000028/view.do?nttId=${id}`
        : listUrl;
      notices.push({ title, date, link, isNew: isWithin3Days(date) });
    });
    return notices.slice(0, 5);
  } catch { return []; }
}

// 천안시영상미디어센터 — 그누보드 (테마 다름: td.subject / td.td_date)
async function fetchCheonanMedia(): Promise<Notice[]> {
  const base = "https://www.xn--2z1br4k89deoa28djvfzvassq98bdzk.kr";
  const html = await fetchHtml(`${base}/bbs/board.php?bo_table=notice`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("tbody tr").each((_, el) => {
    const a = $(el).find("td.subject a").first();
    const title = a.text().trim().replace(/\s+/g, " ");
    const href = a.attr("href") ?? "";
    const rawDate = $(el).find("td.td_date").text().trim();
    const date = parseGnuDate(rawDate);
    if (!title || title.length < 3) return;
    const link = href.startsWith("http") ? href
      : href.startsWith("/") ? `${base}${href}`
      : `${base}/bbs/${href}`;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// 충청남도 공식 최근소식
async function fetchChungnamOfficial(): Promise<Notice[]> {
  const base = "https://www.chungnam.go.kr";
  const url = `${base}/cnportal/bbs/B0000488/list.do?menuNo=5100288`;
  const html = await fetchHtml(url);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table tbody tr").each((_, el) => {
    const a = $(el).find("td.td-subj a").first();
    const title = a.text().trim().replace(/\s+/g, " ");
    const href = a.attr("href") ?? "";
    if (!title || title.length < 3) return;
    // 날짜: YYYY-MM-DD 패턴이 있는 첫 번째 td
    let date = "";
    $(el).find("td").each((_, td) => {
      const txt = $(td).text().trim();
      if (!date && /^\d{4}-\d{2}-\d{2}$/.test(txt)) date = txt;
    });
    const link = href.startsWith("http") ? href
      : href.startsWith("/") ? `${base}${href}`
      : url;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// 충청남도 공모전 — UTF-8, {(pssrpDspyNm,...)(beginDe,...)} 임베디드 형식 파싱
async function fetchChungnamContest(): Promise<Notice[]> {
  const base = "https://www.chungnam.go.kr";
  const url = `${base}/contest/competition/codeManage/listUser.do?menuNo=2600003`;
  const html = await fetchHtml(url);
  if (!html) return [];
  const notices: Notice[] = [];
  const blocks = html.match(/\{[^}]{30,}\}/g) ?? [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const get = (key: string) => {
      const m = block.match(new RegExp(`\\(${key},([^)]+)\\)`));
      return m ? m[1].trim() : "";
    };
    const name = get("pssrpDspyNm");
    const rawDate = get("beginDe");
    const id = get("pssrpDspyCd");
    if (!name || name.length < 3 || seen.has(name)) continue;
    seen.add(name);
    const date = rawDate.length >= 8
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
      : "";
    const link = id
      ? `${base}/contest/competition/codeManage/view.do?menuNo=2600003&pssrpDspyCd=${id}`
      : url;
    notices.push({ title: name, date, link, isNew: isWithin3Days(date) });
  }
  return notices.slice(0, 5);
}

// 천안시다문화가족지원센터 — GitHub Actions JSON 우선, 직접 크롤링 fallback
async function fetchCheonanFamily(): Promise<Notice[]> {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/Creativemind-kr/news-dashboard/data/cheonan-family-notices.json",
      { cache: "no-store" }
    );
    if (res.ok) {
      const items: { title: string; link: string; date: string }[] = await res.json();
      if (items.length > 0) {
        return items.slice(0, 5).map((item) => ({
          title: item.title, date: item.date, link: item.link, isNew: isWithin3Days(item.date),
        }));
      }
    }
  } catch {}

  // fallback: 직접 크롤링 (Vercel IP 차단 시 빈 배열 반환)
  const base = "https://chungnamcheonansi.familynet.or.kr";
  const boardBase = `${base}/center/lay1/bbs/S295T311C312/A/6`;
  try {
    const html = await fetchHtml(`${boardBase}/list.do`, "utf-8", 10000, {
      Referer: `${base}/center/`,
    });
    if (!html) return [];
    const $ = cheerio.load(html);
    const notices: Notice[] = [];
    // table.list_style_1 — td.tit 안에 <a href="view.do?article_seq=...">
    $("table tr").each((_, el) => {
      const a = $(el).find("a[href*='article_seq']").first();
      if (!a.length) return;
      const title = a.text().trim().replace(/\s+/g, " ");
      if (!title || title.length < 3) return;
      const href = a.attr("href") ?? "";
      const date = parseDate($(el).text());
      const link = href.startsWith("http") ? href
        : href.startsWith("/") ? `${base}${href}`
        : `${boardBase}/${href}`;
      notices.push({ title, date, link, isNew: isWithin3Days(date) });
    });
    return notices.slice(0, 5);
  } catch { return []; }
}

// 천안과학산업진흥원 (cistep.re.kr)
async function fetchCistep(): Promise<Notice[]> {
  const base = "https://www.cistep.re.kr";
  const html = await fetchHtml(`${base}/zboard/list.do?lmCode=notice`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table tbody tr").each((_, el) => {
    const a = $(el).find("td:nth-child(2) a").first();
    const title = a.text().trim().replace(/\s+/g, " ");
    const href = a.attr("href") ?? "";
    const date = parseDate($(el).find("td:nth-child(4)").text().trim());
    if (!title || title.length < 3) return;
    const link = href.startsWith("http") ? href
      : href.startsWith("/") ? `${base}${href}`
      : `${base}/zboard/list.do?lmCode=notice`;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// 충남상공회의소 HRD — GitHub Actions JSON 우선, 직접 크롤링 fallback
async function fetchKorchamhrd(): Promise<Notice[]> {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/Creativemind-kr/news-dashboard/data/korchamhrd-notices.json",
      { cache: "no-store" }
    );
    if (res.ok) {
      const items: { title: string; link: string; date: string }[] = await res.json();
      if (items.length > 0) {
        return items.slice(0, 5).map((item) => ({
          title: item.title, date: item.date, link: item.link, isNew: isWithin3Days(item.date),
        }));
      }
    }
  } catch {}

  // fallback: 직접 크롤링 (Vercel IP 차단 시 빈 배열 반환)
  const base = "https://cn.korchamhrd.net";
  const listUrl = `${base}/bbs/bbsList.do?rootMenuId=3766&menuId=3767&bbs_id=141`;
  try {
    const html = await fetchHtml(listUrl);
    if (!html) return [];
    const $ = cheerio.load(html);
    const notices: Notice[] = [];
    // td.title.pc_list[onclick*='funcGoDetail'] — 제목 + key 추출
    $("td.title.pc_list[onclick]").each((_, el) => {
      const title = $(el).text().trim().replace(/\s+/g, " ");
      if (!title || title.length < 3) return;
      const onclick = $(el).attr("onclick") ?? "";
      const keyMatch = onclick.match(/funcGoDetail\('[^']*','(\d+)'/);
      const date = parseDate($(el).closest("tr").find("td.notice_date").text());
      const link = keyMatch
        ? `${base}/bbs/bbsDetail.do?rootMenuId=3766&menuId=3767&bbs_id=141&bbs_key=${keyMatch[1]}`
        : listUrl;
      notices.push({ title, date, link, isNew: isWithin3Days(date) });
    });
    return notices.slice(0, 5);
  } catch { return []; }
}

// 충남콘텐츠진흥원 — 카드형 게시판 (www.ccon.kr)
async function fetchCcon(): Promise<Notice[]> {
  const base = "https://www.ccon.kr";
  const html = await fetchHtml(`${base}/bbs/board.php?bo_table=bsnt`);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $(".board_list li").each((_, el) => {
    const a = $(el).find("a.bo_subject").first();
    const title = a.clone().find(".new_icon, i.fa").remove().end().text().trim().replace(/\s+/g, " ");
    const href = a.attr("href") ?? "";
    const rawDate = $(el).find(".bo_date").text().replace(/[^\d-]/g, "").trim();
    const date = parseDate(rawDate);
    if (!title || title.length < 3) return;
    const link = href.startsWith("http") ? href
      : href.startsWith("/") ? `${base}${href}`
      : base;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// 국비훈련 (work24.go.kr) — GitHub Actions가 매시간 갱신하는 JSON 파일 읽기
async function fetchWork24(): Promise<Notice[]> {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/Creativemind-kr/news-dashboard/data/work24-notices.json",
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const items: { title: string; link: string; date: string }[] = await res.json();
    return items.slice(0, 5).map((item) => ({
      title: item.title, date: item.date, link: item.link, isNew: isWithin3Days(item.date),
    }));
  } catch { return []; }
}

// 온통청년 (youthcenter.go.kr) — 공지사항 직접 크롤링
async function fetchYouthCenter(): Promise<Notice[]> {
  const base = "https://www.youthcenter.go.kr";
  const listUrl = `${base}/bbs01List/54`;
  const html = await fetchHtml(listUrl);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table tr").each((_, el) => {
    if ($(el).find("th").length > 0) return;
    const a = $(el).find("a").first();
    const title = a.text().trim().replace(/\s+/g, " ");
    const href = a.attr("href") ?? "";
    if (!title || title.length < 3) return;
    const date = parseDate($(el).text());
    const link = href.startsWith("http") ? href
      : href.startsWith("/") ? `${base}${href}`
      : listUrl;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// K-START UP — GitHub Actions가 매시간 갱신하는 JSON 파일 읽기
async function fetchKStartup(): Promise<Notice[]> {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/Creativemind-kr/news-dashboard/data/kstartup-notices.json",
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const items: { title: string; link: string; date: string }[] = await res.json();
    return items.slice(0, 5).map((item) => ({
      title: item.title, date: item.date, link: item.link, isNew: isWithin3Days(item.date),
    }));
  } catch { return []; }
}

// 한국과학창의재단 (kosac.re.kr) — 사업공고 직접 크롤링
async function fetchKosac(): Promise<Notice[]> {
  const base = "https://www.kosac.re.kr";
  const listUrl = `${base}/menus/274/bns`;
  const html = await fetchHtml(listUrl);
  if (!html) return [];
  const $ = cheerio.load(html);
  const notices: Notice[] = [];
  $("table tr").each((_, el) => {
    if ($(el).find("th").length > 0) return;
    const a = $(el).find("a").first();
    const title = a.text().trim().replace(/\s+/g, " ");
    const href = a.attr("href") ?? "";
    if (!title || title.length < 3) return;
    const date = parseDate($(el).text());
    const link = href.startsWith("http") ? href
      : href.startsWith("/") ? `${base}${href}`
      : listUrl;
    notices.push({ title, date, link, isNew: isWithin3Days(date) });
  });
  return notices.slice(0, 5);
}

// KOSAC 과제관리 (pmsnew.kosac.re.kr) — 사업공고 접수중 목록 직접 파싱 (서버사이드 렌더링)
async function fetchKosacPms(): Promise<Notice[]> {
  const base = "https://pmsnew.kosac.re.kr";
  const listUrl = `${base}/bizPbanc/rcpt/rcptPbancList.do`;
  try {
    const html = await fetchHtml(listUrl);
    if (!html) return [];
    const $ = cheerio.load(html);
    const notices: Notice[] = [];
    $(".sub_con_box").each((_, el) => {
      const title = $(el).find(".e_c_tit h2").text().trim().replace(/\s+/g, " ");
      if (!title || title.length < 3) return;
      let date = "";
      $(el).find(".e_c_detail li").each((_, li) => {
        if ($(li).find("strong").text().trim() === "등록일") {
          date = $(li).find("p").text().trim();
        }
      });
      const onclick = $(el).find(".e_c_btn a").attr("onclick") ?? "";
      const m = onclick.match(/fn_viewDetail\('([^']+)'/);
      const link = m
        ? `${base}/bizPbanc/rcpt/rcptPbancDetail.do?pbancId=${m[1]}`
        : listUrl;
      notices.push({ title, date, link, isNew: isWithin3Days(date) });
    });
    return notices.slice(0, 5);
  } catch { return []; }
}

// ── 소스 정의 ──────────────────────────────────────────────────────────────────

const PUBLIC_SOURCES = [
  { id: "hira",       name: "심사평가원",         url: "https://www.ksqa.or.kr/?pid=HP010101",                       fetch: fetchKsqa },
  { id: "moel",       name: "고용노동부",         url: "https://www.moel.go.kr/news/notice/noticeList.do",           fetch: fetchMoel },
  { id: "qnet",       name: "Q-net",              url: "https://www.q-net.or.kr",                                    fetch: fetchQnet },
  { id: "cqnet",      name: "CQ-net",             url: "https://c.q-net.or.kr",                                      fetch: fetchCqnet },
  { id: "kacpta",     name: "한국세무사회",       url: "https://license.kacpta.or.kr/web/notice/notice.aspx",        fetch: fetchKacpta },
  { id: "hrd",        name: "산업인력공단",       url: "https://www.hrdkorea.or.kr",                                 fetch: fetchHrdkorea },
  { id: "hrdi",       name: "능력개발교육원",     url: "https://hrdi.koreatech.ac.kr/?m1=page&menu_id=11",           fetch: fetchHrdi },
  { id: "nipa",       name: "정보통신산업진흥원", url: "https://www.nipa.kr/home/2-2?tab=1",                        fetch: fetchNipa },
  { id: "work24",     name: "국비훈련(고용24)",   url: "https://www.work24.go.kr/cm/main.do",                        fetch: fetchWork24 },
  { id: "youth-center", name: "온통청년",         url: "https://www.youthcenter.go.kr/bbs01List/54",                 fetch: fetchYouthCenter },
  { id: "kstartup",   name: "K-START UP",         url: "https://www.k-startup.go.kr/web/main/index.do",              fetch: fetchKStartup },
  { id: "kosac",      name: "한국과학창의재단",   url: "https://www.kosac.re.kr/menus/274/bns",                      fetch: fetchKosac },
  { id: "kosac-pms",  name: "KOSAC 과제관리",     url: "https://pmsnew.kosac.re.kr/bizPbanc/rcpt/rcptPbancList.do",  fetch: fetchKosacPms },
];

const CHUNGNAM_SOURCES = [
  { id: "cheonan-city",  name: "천안시청",                  url: "https://www.cheonan.go.kr/kor.do",                                                                fetch: fetchCheonanCity },
  { id: "cepa",          name: "충남경제진흥원",             url: "https://www.cepa.or.kr/notice/notice.do?pm=6&ms=32",                                              fetch: fetchCepa },
  { id: "cepa-special",  name: "산업구조변화대응 특화훈련", url: "https://www.cepa.or.kr/business/business.do?pm=4&ms=123",                                         fetch: fetchCepaSpecial },
  { id: "cepa-regional", name: "지역산업 맞춤 인력양성",    url: "https://www.cepa.or.kr/business/business.do?pm=4&ms=123",                                         fetch: fetchCepaRegional },
  { id: "ch-youth",      name: "천안청년센터이음",           url: "https://www.ch2030youth.kr/bbs/board.php?bo_table=notice",                                        fetch: fetchChYouth },
  { id: "cheonan-media", name: "천안시영상미디어센터",      url: "https://www.xn--2z1br4k89deoa28djvfzvassq98bdzk.kr/bbs/board.php?bo_table=notice",                fetch: fetchCheonanMedia },
  { id: "chungnam",      name: "충청남도 공식",              url: "https://www.chungnam.go.kr/main.do",                                                              fetch: fetchChungnamOfficial },
  { id: "chungnam-contest", name: "충청남도 공모전",         url: "https://www.chungnam.go.kr/contest.do",                                                           fetch: fetchChungnamContest },
  { id: "cheonan-family",   name: "천안다문화가족지원센터",  url: "https://chungnamcheonansi.familynet.or.kr/center/",                                               fetch: fetchCheonanFamily },
  { id: "ccon",             name: "충남콘텐츠진흥원",        url: "https://ccon.kr/bbs/board.php?bo_table=bsnt",                                                     fetch: fetchCcon },
  { id: "cistep",           name: "천안과학산업진흥원",      url: "https://www.cistep.re.kr/zboard/list.do?lmCode=notice",                                            fetch: fetchCistep },
  { id: "korchamhrd",       name: "충남상공회의소HRD",       url: "https://cn.korchamhrd.net/bbs/bbsList.do?rootMenuId=3766&menuId=3767&bbs_id=141",                 fetch: fetchKorchamhrd },
];

export async function getAllNotices(): Promise<NoticeSource[]> {
  const [publicResults, chungnamResults] = await Promise.all([
    Promise.all(
      PUBLIC_SOURCES.map(async (s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        group: "public" as const,
        notices: await s.fetch(),
      }))
    ),
    Promise.all(
      CHUNGNAM_SOURCES.map(async (s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        group: "chungnam" as const,
        notices: await s.fetch(),
      }))
    ),
  ]);
  return [...publicResults, ...chungnamResults];
}
