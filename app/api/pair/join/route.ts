import { NextRequest, NextResponse } from "next/server";
import { db, hash, random } from "../../../../lib/server";
import { setMemberCookie } from "../../../../lib/member";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})); const code = String(body.code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) return NextResponse.json({ error: "8文字の招待コードを入力してください。" }, { status: 400 });
  const supabase = db(); const { data: pair } = await supabase.from("pairs").select("id").eq("invite_hash", hash(code)).maybeSingle();
  if (!pair) return NextResponse.json({ error: "招待コードが見つかりません。" }, { status: 404 });
  const { count } = await supabase.from("members").select("id", { count: "exact", head: true }).eq("pair_id", pair.id);
  if ((count ?? 0) >= 2) return NextResponse.json({ error: "このペアにはすでに2人が参加しています。" }, { status: 409 });
  const { data: member, error } = await supabase.from("members").insert({ pair_id: pair.id, position: 2, session_hash: hash(random()) }).select("id").single();
  if (error || !member) return NextResponse.json({ error: "参加できませんでした。" }, { status: 500 });
  await setMemberCookie(member.id); return NextResponse.json({ ok: true });
}
