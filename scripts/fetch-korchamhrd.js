const { execSync } = require("child_process");
const https = require("https");

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "Creativemind-kr";
const REPO = "news-dashboard";
const BRANCH = "data";
const FILE_PATH = "korchamhrd-notices.json";

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
  console.log("[fetch-korchamhrd] 시작", new Date().toISOString());

  const html = execSync(
    `curl -sk --max-time 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" -H "Accept-Language: ko-KR,ko;q=0.9" "https://cn.korchamhrd.net/bbs/bbsList.do?rootMenuId=3766&menuId=3767&bbs_id=141"`,
    { encoding: "utf8" }
  );

  const notices = [];
  // td.title.pc_list 의 onclick에서 key 추출 + 텍스트 파싱
  const titleRegex = /class="title pc_list"\s+onclick="javascript:funcGoDetail\('[^']*','(\d+)','141'[^"]*"\s*>([\s\S]*?)<\/td>/g;
  let match;
  while ((match = titleRegex.exec(html)) !== null && notices.length < 5) {
    const key = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!title || title.length < 3) continue;

    // 날짜: 이 위치 이후 500자 안에서 notice_date td 찾기
    const after = html.slice(match.index, match.index + 600);
    const dateMatch = after.match(/class="notice_date pc_list">\s*([\d]{4}-[\d]{2}-[\d]{2})/);
    const date = dateMatch ? dateMatch[1] : "";
    const link = `https://cn.korchamhrd.net/bbs/bbsDetail.do?rootMenuId=3766&menuId=3767&bbs_id=141&bbs_key=${key}`;
    notices.push({ title, link, date });
  }

  console.log(`[fetch-korchamhrd] ${notices.length}개 수집`);
  notices.forEach((n) => console.log(" -", n.title));

  if (notices.length === 0) {
    console.log("[fetch-korchamhrd] 공고 없음, 종료");
    return;
  }

  const content = Buffer.from(JSON.stringify(notices)).toString("base64");
  const existing = await githubApi("GET", `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`);

  const result = await githubApi("PUT", `/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`, {
    message: `update korchamhrd notices ${new Date().toISOString().slice(0, 16)}`,
    content,
    sha: existing.sha,
    branch: BRANCH,
  });

  if (result.content) {
    console.log("[fetch-korchamhrd] GitHub push 성공:", result.commit.sha.slice(0, 7));
  } else {
    console.error("[fetch-korchamhrd] GitHub push 실패:", JSON.stringify(result));
  }
}

main().catch(console.error);
