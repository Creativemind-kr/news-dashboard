// 나라장터 용역 입찰공고 — 조달청 OpenAPI (공공데이터포털 15129394)
// 최근 7일 용역공고를 전부 받아 학원 관련 키워드로 거르고, 아직 마감 안 된 것만 보여준다.

import https from "node:https";

const BASE = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";
const SERVICE_KEY = process.env.G2B_SERVICE_KEY ?? "";
const DAYS = 7;
const PAGE_SIZE = 999;

export interface G2bBid {
  id: string;
  title: string;
  agency: string;
  kind: string;
  postedAt: string;
  closeAt: string;
  closeLabel: "마감" | "개찰"; // 직찰 공고는 입찰마감일이 비어 있어 개찰일로 대신한다
  price: number | null;
  link: string;
  regions: string[] | null; // null = 지역 정보 조회 실패
  chungcheong: boolean;
  canJoin: boolean; // 천안 업체가 참가 가능한지 (지역제한 기준)
  isNew: boolean;
}

export interface G2bResult {
  ok: boolean;
  scanned: number;
  bids: G2bBid[];
}

type RawBid = Record<string, string>;

// ── 키워드 필터 ─────────────────────────────────────────────────────────────
// 공고명에 들어간 기관명(OO교육청 등) 때문에 "교육"이 걸리지 않도록 먼저 지운다.
const ORG_NAMES = /[가-힣]*교육(지원)?청|[가-힣]*교육연구정보원|[가-힣]*교육원|[가-힣]*교육대학교|교육부/g;
const INCLUDE = /교육|연수|강의|강좌|(?<!보)강사|훈련|양성|아카데미|부트캠프|직업|취업|일자리|늘봄|방과후|디자인|웹툰|만화|애니메이션|콘텐츠\s?(개발|제작)|유튜브|크리에이터|홍보영상|영상[^,]*제작/;
const EXCLUDE = new RegExp(
  [
    // 시설·전산·장비
    "유지\\s?관리", "유지\\s?보수", "운영\\s?관리", "석면", "폐기물", "감리", "측량", "시설물", "청소", "경비", "방재",
    "승강기", "임차", "대여", "공사", "건설", "건립", "건축", "구축", "고도화", "시스템", "체계개발", "실증", "장비",
    "판독", "전산", "서버", "네트워크", "기능\\s?개선", "설치",
    // 여행사 업무 (해외연수·전지훈련·캠프 인솔)
    "해외", "국외", "전지훈련", "스키", "탐방", "견학", "여행", "초청", "글로벌[^]*연수", "연수\\s?대행",
    "참가\\s?위탁", "라스베가스", "CES", "[(\\[](일본|중국|미국|호주|캐나다|싱가포르|베트남|대만|유럽|영국|독일)[)\\]]",
    // 연구·조사·행사·인쇄 등 교육 운영이 아닌 것
    "연구", "수립", "조사", "평가", "검토", "인쇄", "행사", "박람회", "포럼", "보고회", "설명회", "성과공유회",
    "전시", "부스", "SNS", "누리집", "아카이",
    // 기타 무관
    "재난", "소방", "급식", "차량", "운송", "보험", "채용", "회계", "결산", "정사영상", "무인항공", "번역",
    "상품화", "상담센터",
  ].join("|")
);
// 키워드를 바꾸면 components/G2bBoard.tsx 하단 안내 문구도 같이 고친다.

function isRelevant(b: RawBid): boolean {
  if (b.srvceDivNm === "기술용역") return false;
  const title = b.bidNtceNm ?? "";
  if (EXCLUDE.test(title)) return false;
  return INCLUDE.test(title.replace(ORG_NAMES, " "));
}

// ── 지역 판정 ───────────────────────────────────────────────────────────────
const CHUNGCHEONG = /충청|충남|충북|대전|세종|천안|아산|공주|당진|서산|논산|보령|홍성|예산|계룡|금산|부여|서천|청양|태안|청주|충주|제천/;

function canCheonanJoin(regions: string[]): boolean {
  if (regions.length === 0) return true;
  return regions.some((r) => r === "충청남도" || r.startsWith("충청남도 천안"));
}

// ── 날짜 (API 값은 한국시간, 서버는 UTC) ─────────────────────────────────────
function kstStamp(d: Date): string {
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${k.getUTCFullYear()}${p(k.getUTCMonth() + 1)}${p(k.getUTCDate())}${p(k.getUTCHours())}${p(k.getUTCMinutes())}`;
}

function parseKst(s: string): number {
  if (!s) return NaN;
  return new Date(s.trim().replace(" ", "T") + "+09:00").getTime();
}

// ── API 호출 ────────────────────────────────────────────────────────────────
// 응답 한 페이지가 5~7MB라 Next.js fetch 캐시(2MB 한도)에 못 들어간다.
// 그래서 node:https로 직접 받고, 캐시는 페이지 ISR(30분)에 맡긴다.
function getJson(url: string, timeoutMs = 20000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`http ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch {
          reject(new Error("invalid json"));
        }
      });
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

async function fetchPage(op: string, bgn: string, end: string, pageNo: number) {
  const url =
    `${BASE}/${op}?serviceKey=${SERVICE_KEY}&type=json&inqryDiv=1` +
    `&inqryBgnDt=${bgn}&inqryEndDt=${end}&numOfRows=${PAGE_SIZE}&pageNo=${pageNo}`;
  let json: { response?: { body?: { items?: unknown; totalCount?: unknown } } };
  try {
    json = (await getJson(url)) as typeof json;
  } catch (e) {
    // 오류 메시지에 인증키가 든 URL이 섞이지 않도록 오퍼레이션 이름만 남긴다.
    throw new Error(`g2b ${op} p${pageNo}: ${(e as Error).message}`);
  }
  const body = json?.response?.body;
  if (!body) throw new Error(`g2b ${op} p${pageNo}: bad response`);
  const raw = body.items as RawBid[] | { item?: RawBid[] } | undefined;
  const items: RawBid[] = Array.isArray(raw) ? raw : raw?.item ?? [];
  return { items, total: Number(body.totalCount) || 0 };
}

async function fetchAll(op: string, bgn: string, end: string): Promise<RawBid[]> {
  const first = await fetchPage(op, bgn, end, 1);
  const pages = Math.ceil(first.total / PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => fetchPage(op, bgn, end, i + 2))
  );
  return [first.items, ...rest.map((r) => r.items)].flat();
}

// 같은 공고번호의 변경·재공고 중 마지막 차수만 남기고, 마지막이 취소공고면 뺀다.
function latestOnly(items: RawBid[]): RawBid[] {
  const map = new Map<string, RawBid>();
  for (const it of items) {
    const prev = map.get(it.bidNtceNo);
    if (!prev || `${it.bidNtceOrd}${it.bidNtceDt}` > `${prev.bidNtceOrd}${prev.bidNtceDt}`) {
      map.set(it.bidNtceNo, it);
    }
  }
  return [...map.values()].filter((it) => it.ntceKindNm !== "취소공고");
}

export async function getG2bBids(): Promise<G2bResult> {
  if (!SERVICE_KEY) return { ok: false, scanned: 0, bids: [] };

  const now = new Date();
  const bgn = kstStamp(new Date(now.getTime() - DAYS * 86400 * 1000));
  const end = kstStamp(now);

  try {
    const [bidsRaw, regionRaw] = await Promise.all([
      fetchAll("getBidPblancListInfoServc", bgn, end),
      fetchAll("getBidPblancListInfoPrtcptPsblRgn", bgn, end).catch(() => null),
    ]);

    const regionMap = new Map<string, Set<string>>();
    for (const r of regionRaw ?? []) {
      if (r.bsnsDivNm && r.bsnsDivNm !== "용역") continue;
      if (!r.prtcptPsblRgnNm) continue;
      if (!regionMap.has(r.bidNtceNo)) regionMap.set(r.bidNtceNo, new Set());
      regionMap.get(r.bidNtceNo)!.add(r.prtcptPsblRgnNm);
    }

    const latest = latestOnly(bidsRaw);
    const nowMs = now.getTime();

    const bids: G2bBid[] = latest
      .filter(isRelevant)
      .filter((b) => {
        const close = parseKst(b.bidClseDt || b.opengDt);
        return isNaN(close) || close > nowMs;
      })
      .map((b): G2bBid => {
        const regions = regionRaw ? [...(regionMap.get(b.bidNtceNo) ?? [])] : null;
        const agency = b.dminsttNm || b.ntceInsttNm || "";
        const price = Number(b.presmptPrce || b.asignBdgtAmt);
        const posted = parseKst(b.bidNtceDt);
        return {
          id: b.bidNtceNo,
          title: b.bidNtceNm.trim(),
          agency,
          kind: b.ntceKindNm,
          postedAt: b.bidNtceDt?.slice(0, 16) ?? "",
          closeAt: (b.bidClseDt || b.opengDt || "").slice(0, 16),
          closeLabel: b.bidClseDt ? "마감" : "개찰",
          price: price > 0 ? price : null,
          link: b.bidNtceDtlUrl || b.bidNtceUrl || "https://www.g2b.go.kr",
          regions,
          chungcheong: CHUNGCHEONG.test(agency) || (regions ?? []).some((r) => CHUNGCHEONG.test(r)),
          canJoin: regions ? canCheonanJoin(regions) : true,
          isNew: !isNaN(posted) && (nowMs - posted) / 86400000 <= 3,
        };
      })
      .sort((a, b) => {
        // 참가 가능 + 충청권 → 참가 가능 → 참가 불가 순, 같은 그룹은 최신순
        const rank = (x: G2bBid) => (x.canJoin ? (x.chungcheong ? 0 : 1) : 2);
        return rank(a) - rank(b) || b.postedAt.localeCompare(a.postedAt);
      });

    return { ok: true, scanned: latest.length, bids };
  } catch (e) {
    console.error("[g2b]", e);
    return { ok: false, scanned: 0, bids: [] };
  }
}
