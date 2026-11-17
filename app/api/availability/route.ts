import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { currentMember } from "../../../lib/member";
import { db, unseal } from "../../../lib/server";

type Interval = { start: string; end: string };
const MINUTES = 30;
function mutualFree(busy: Interval[], start: Date, end: Date): Interval[] {
  const merged = busy.map(x => ({ start: new Date(x.start), end: new Date(x.end) })).filter(x => !Number.isNaN(+x.start) && !Number.isNaN(+x.end)).sort((a, b) => +a.start - +b.start).reduce<{ start: Date; end: Date }[]>((acc, item) => { const last = acc.at(-1); if (last && item.start <= last.end) last.end = new Date(Math.max(+last.end, +item.end)); else acc.push(item); return acc; }, []);
  let cursor = start; const free: Interval[] = [];
  for (const item of merged) { if (item.start > cursor && (+item.start - +cursor) >= MINUTES * 60_000) free.push({ start: cursor.toISOString(), end: item.start.toISOString() }); if (item.end > cursor) cursor = item.end; }
  if (+end - +cursor >= MINUTES * 60_000) free.push({ start: cursor.toISOString(), end: end.toISOString() }); return free;
}
export async function GET(request: NextRequest) {
  const member = await currentMember(); if (!member) return NextResponse.json({ error: "ペアを開始してください。" }, { status: 401 });
  const start = new Date(request.nextUrl.searchParams.get("start") ?? ""); const end = new Date(request.nextUrl.searchParams.get("end") ?? "");
  if (Number.isNaN(+start) || Number.isNaN(+end) || end <= start || +end - +start > 31 * 864e5) return NextResponse.json({ error: "期間を確認してください。" }, { status: 400 });
  const { data: members } = await db().from("members").select("refresh_token_ciphertext").eq("pair_id", member.pair_id);
  if (!members || members.length !== 2 || members.some(m => !m.refresh_token_ciphertext)) return NextResponse.json({ error: "2人ともGoogleカレンダーを接続すると表示できます。" }, { status: 409 });
  try {
    const allBusy = await Promise.all(members.map(async m => { const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET); auth.setCredentials({ refresh_token: unseal(m.refresh_token_ciphertext!) }); const calendar = google.calendar({ version: "v3", auth }); const { data } = await calendar.freebusy.query({ requestBody: { timeMin: start.toISOString(), timeMax: end.toISOString(), timeZone: "Asia/Tokyo", items: [{ id: "primary" }] } }); return data.calendars?.primary?.busy ?? []; }));
    // Only the union is used. The response intentionally contains no per-person data.
    return NextResponse.json({ slots: mutualFree(allBusy.flatMap(x => x.map(b => ({ start: b.start!, end: b.end! }))), start, end) });
  } catch { return NextResponse.json({ error: "カレンダー情報を更新できませんでした。再接続してください。" }, { status: 502 }); }
}
