const { execSync } = require("child_process");
const https = require("https");

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "Creativemind-kr";
const REPO = "news-dashboard";
const BRANCH = "data";
const FILE_PATH = "cheonan-family-notices.json";

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
  console.log("[fetch-cheonan-family] 시작", new Date().toISOString());

  const base = "https://chungnamcheonansi.familynet.or.kr";
  const boardBase = `${base}/center/lay1/bbs/S295T311C312/A/6`;

  const html = execSync(
    `curl -sk --max-time 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" -H "Accept-Language: ko-KR,ko;q=0.9" -H "Referer: ${base}/center/" "${boardBase}/list.do"`,
    { encoding: "utf8" }
  );

  const notices = [];
  // <a href="view.do?article_seq=241057&...">제목</a>
  const linkRegex = /href="(view\.do\?article_seq=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/g;
  const seen = new Set();

  let match;
  while ((match = linkRegex.exec(html)) !== null && notices.length < 5) {
    const seq = match[2];
    if (seen.has(seq)) continue;
    seen.add(seq);

    const href = match[1].replace(/&amp;/g, "&");
    const title = match[3].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!title || title.length < 3) continue;

    // 날짜: 이 a 태그 이후 300자 안에 <span>YYYY-MM-DD</span> 패턴
    const after = html.slice(match.index, match.index + 400);
    const dateMatch = after.match(/<span>(\d{4}-\d{2}-\d{2})<\/span>/);
    const date = dateMatch ? dateMatch[1] : "";

    const link = `${boardBase}/${href}`;
    notices.push({ title, link, date });
  }

  console.log(`[fetch-cheonan-family] ${notices.length}개 수집`);
  notices.forEach((n) => console.log(" -", n.title));

  if (notices.length === 0) {
    console.log("[fetch-cheonan-family] 공고 없음, 종료");
    return;
  }

  const content = Buffer.from(JSON.stringify(notices)).toString("base64");
  const existing = await githubApi("GET", `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`);

  const result = await githubApi("PUT", `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
    message: `update cheonan-family notices ${new Date().toISOString().slice(0, 16)}`,
    content,
    sha: existing.sha,
    branch: BRANCH,
  });

  if (result.content) {
    console.log("[fetch-cheonan-family] GitHub push 성공:", result.commit.sha.slice(0, 7));
  } else {
    console.error("[fetch-cheonan-family] GitHub push 실패:", JSON.stringify(result));
  }
}

main().catch(console.error);
