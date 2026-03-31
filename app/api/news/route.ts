import { NextResponse } from "next/server";
import { getAllNews } from "@/lib/fetchNews";

export async function GET() {
  const results = await getAllNews();
  return NextResponse.json(results, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" },
  });
}
