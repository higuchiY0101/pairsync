import { NextResponse } from "next/server";
import { db, hash, random } from "../../../../lib/server";
import { setMemberCookie } from "../../../../lib/member";

const code = () => random(6).replace(/[-_]/g, "A").slice(0, 8).toUpperCase();
export async function POST() {
  const invite = code(); const supabase = db();
  const { data: pair, error } = await supabase.from("pairs").insert({ invite_hash: hash(invite) }).select("id").single();
  if (error || !pair) return NextResponse.json({ error: "ペアを作成できませんでした。" }, { status: 500 });
  const { data: member, error: memberError } = await supabase.from("members").insert({ pair_id: pair.id, position: 1, session_hash: hash(random()) }).select("id").single();
  if (memberError || !member) return NextResponse.json({ error: "参加者を作成できませんでした。" }, { status: 500 });
  await setMemberCookie(member.id); return NextResponse.json({ code: invite });
}
