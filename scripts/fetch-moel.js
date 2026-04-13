const { execSync } = require("child_process");
const https = require("https");
const fs = require("fs");

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "Creativemind-kr";
const REPO = "news-dashboard";
const BRANCH = "data";
const FILE_PATH = "moel-notices.json";

function githubApi(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.github.com",
      path: apiPath,
      method,
      headers: {
        Authorization: `token ${TOKEN}`,
        "User-Agent": "node-script",
        "Content-Type": "application/json",
        ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log("[fetch-moel] 시작", new Date().toISOString());

  // 1. curl로 moel 공지 목록 스크래핑 (Node https는 moel TLS 미지원)
  const html = execSync(
    `curl -sk --max-time 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" "https://www.moel.go.kr/news/notice/noticeList.do"`,
    { encoding: "utf8" }
  );

  const base = "https://www.moel.go.kr";
  const blocks = html.split("<tr").slice(1);
  const notices = [];

  for (const block of blocks) {
    const aMatch = block.match(/href=['"]([^'"]*noticeView[^'"]*)['"]/);
    if (!aMatch) continue;
    const href = aMatch[1];

    const titleMatch = block.match(/noticeView[^"]*"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;
    const title = titleMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    if (!title.startsWith("[공고]")) continue;

    const dateMatch = block.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : "";
    const link = href.startsWith("http") ? href : base + href;

    notices.push({ title, link, date });
    if (notices.length >= 5) break;
  }

  console.log(`[fetch-moel] [공고] ${notices.length}개 수집`);
  notices.forEach((n) => console.log(" -", n.title));

  if (notices.length === 0) {
    console.log("[fetch-moel] 공고 없음, 종료");
    return;
  }

  // 2. GitHub data 브랜치에 push
  const content = Buffer.from(JSON.stringify(notices)).toString("base64");
  const existing = await githubApi(
    "GET",
    `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`
  );

  const result = await githubApi(
    "PUT",
    `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
    {
      message: `update moel notices ${new Date().toISOString().slice(0, 16)}`,
      content,
      sha: existing.sha,
      branch: BRANCH,
    }
  );

  if (result.content) {
    console.log("[fetch-moel] GitHub push 성공:", result.commit.sha.slice(0, 7));
  } else {
    console.error("[fetch-moel] GitHub push 실패:", JSON.stringify(result));
  }
}

main().catch(console.error);
