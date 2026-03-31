import { NextResponse } from "next/server";
import { getDailyNews } from "@/lib/fetchNews";

export async function GET() {
  const results = await getDailyNews();
  return NextResponse.json(results, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" },
  });
}
