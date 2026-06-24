const { execSync } = require("child_process");
const https = require("https");
const fs = require("fs");

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "Creativemind-kr";
const REPO = "news-dashboard";
const BRANCH = "data";
const FILE_PATH = "kacpta-notices.json";

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
  console.log("[fetch-kacpta] 시작", new Date().toISOString());

  // EUC-KR → UTF-8 변환 후 파싱 (iconv 사용)
  execSync(
    `curl -sk --max-time 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" "https://license.kacpta.or.kr/web/notice/notice.aspx" | iconv -f EUC-KR -t UTF-8 -c > /tmp/kacpta.html`,
    { shell: "/bin/bash" }
  );
  const html = fs.readFileSync("/tmp/kacpta.html", "utf8");

  const base = "https://license.kacpta.or.kr";
  const notices = [];

  // table.table_notice 의 sNo.value tr 파싱
  // onclick="frm.dsp_mode.value='Show';frm.sNo.value='2035';frm.submit()"
  const trBlocks = html.split("<tr").slice(1);
  for (const block of trBlocks) {
    if (notices.length >= 5) break;
    const sNoMatch = block.match(/sNo\.value='(\d+)'/);
    if (!sNoMatch) continue;
    const sNo = sNoMatch[1];

    // 제목 td: text-align:left 스타일 (두 번째 onclick td)
    const tds = [...block.matchAll(/onclick="[^"]*sNo[^"]*"[^>]*>([\s\S]*?)<\/td>/g)];
    const titleRaw = tds[1]?.[1] ?? tds[0]?.[1] ?? "";
    const title = titleRaw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!title || title.length < 3) continue;

    const dateMatch = block.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : "";
    const link = `${base}/web/notice/notice.aspx?dsp_mode=Show&sNo=${sNo}`;
    notices.push({ title, link, date });
  }

  console.log(`[fetch-kacpta] ${notices.length}개 수집`);
  notices.forEach((n) => console.log(" -", n.title));

  if (notices.length === 0) {
    console.log("[fetch-kacpta] 공고 없음, 종료");
    return;
  }

  const content = Buffer.from(JSON.stringify(notices)).toString("base64");
  const existing = await githubApi("GET", `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`);

  const result = await githubApi("PUT", `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
    message: `update kacpta notices ${new Date().toISOString().slice(0, 16)}`,
    content,
    sha: existing.sha,
    branch: BRANCH,
  });

  if (result.content) {
    console.log("[fetch-kacpta] GitHub push 성공:", result.commit.sha.slice(0, 7));
  } else {
    console.error("[fetch-kacpta] GitHub push 실패:", JSON.stringify(result));
  }
}

main().catch(console.error);
