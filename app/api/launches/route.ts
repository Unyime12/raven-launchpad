import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { LAUNCHES as SEED_LAUNCHES } from "@/app/lib/launches";

const KEY = "launches";

export async function GET() {
  const dynamic = (await kv.get<any[]>(KEY)) || [];
  return NextResponse.json([...SEED_LAUNCHES, ...dynamic]);
}

export async function POST(req: Request) {
  const body = await req.json();

  // minimal shape check
  const required = ["id", "name", "ticker", "launchpadId", "tokenId", "softCap", "liquidity", "offered"];
  for (const key of required) {
    if (!(key in body)) {
      return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
    }
  }

  const existing = (await kv.get<any[]>(KEY)) || [];
  const updated = [...existing, body];
  await kv.set(KEY, updated);

  return NextResponse.json({ success: true, launch: body });
}