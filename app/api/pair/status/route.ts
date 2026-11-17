import { NextResponse } from "next/server";
import { currentMember } from "../../../../lib/member";
import { db } from "../../../../lib/server";

export async function GET() {
  const member = await currentMember(); if (!member) return NextResponse.json({ error: "No active pair" }, { status: 401 });
  const { data: members } = await db().from("members").select("id,calendar_connected_at").eq("pair_id", member.pair_id);
  const partner = members?.find(m => m.id !== member.id);
  return NextResponse.json({ paired: Boolean(partner), connected: Boolean(member.calendar_connected_at), partnerConnected: Boolean(partner?.calendar_connected_at) });
}
