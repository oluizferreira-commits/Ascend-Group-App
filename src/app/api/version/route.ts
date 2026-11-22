import { NextResponse } from "next/server";

// Answered by whichever deployment is live — clients compare it with the version they loaded.
export function GET() {
  return NextResponse.json({ version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
