import { NextResponse } from "next/server";
import { getDailyNews, getWeeklyTop, getMonthlyTop, getHotTopics2026, getCompetitorNews } from "@/lib/fetchNews";
import { getAllNotices } from "@/lib/fetchNotices";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "daily";

  let data;
  if (type === "weekly") data = await getWeeklyTop();
  else if (type === "monthly") data = await getMonthlyTop();
  else if (type === "hot") data = await getHotTopics2026();
  else if (type === "competitor") data = await getCompetitorNews();
  else if (type === "notice") data = await getAllNotices();
  else data = await getDailyNews();

  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=86400" },
  });
}
