import { NextResponse } from "next/server";
import { getHealthReport } from "@/lib/health";

/** Liveness and configuration check. Never includes keys or user data. */
export function GET(): Response {
  return NextResponse.json(getHealthReport(), { headers: { "Cache-Control": "no-store" } });
}
