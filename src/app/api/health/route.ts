import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkHealth } from "@/lib/health";

export async function GET() {
  const health = await checkHealth(db);
  return NextResponse.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
