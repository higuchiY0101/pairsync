"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = { start: string; end: string };
type PairState = { paired: boolean; connected: boolean; partnerConnected: boolean };

const fmt = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", weekday: "short", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function Home() {
  const [code, setCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [state, setState] = useState<PairState | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [message, setMessage] = useState("");
  const range = useMemo(() => {
    const start = new Date(); start.setMinutes(0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return { start: start.toISOString(), end: end.toISOString() };
  }, []);

  async function refresh() {
    const res = await fetch("/api/pair/status");
    setState(res.ok ? await res.json() : null);
  }
  useEffect(() => { refresh(); }, []);
  async function create() {
    const res = await fetch("/api/pair/create", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error ?? "作成できませんでした。");
    setCreatedCode(data.code); setMessage("招待コードを相手に伝えてください。"); await refresh();
  }
  async function join() {
    const res = await fetch("/api/pair/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error ?? "参加できませんでした。");
    setMessage("ペアになりました。Googleカレンダーを接続してください。"); await refresh();
  }
  async function loadSlots() {
    const q = new URLSearchParams(range); const res = await fetch(`/api/availability?${q}`); const data = await res.json();
    if (!res.ok) return setMessage(data.error ?? "空き時間を取得できませんでした。");
    setSlots(data.slots); setMessage(data.slots.length ? "共通の空き時間です。" : "この期間に共通の空き時間はありません。");
  }

  return <main>
    <section className="hero"><p className="eyebrow">PRIVATE TWO-PERSON SCHEDULING</p><h1>PairSync</h1><p>ふたりの予定を見せずに、<br />会える時間だけを見つけます。</p></section>
    <section className="card">
      {!state && <><h2>はじめる</h2><p>新しくペアを作るか、相手から受け取った招待コードで参加します。</p><button onClick={create}>新しいペアを作る</button><div className="or">または</div><label>招待コード<input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="例：AB12CD34" /></label><button className="secondary" onClick={join}>コードで参加する</button></>}
      {createdCode && <div className="invite"><p>あなたの招待コード</p><strong>{createdCode}</strong><small>このコードを相手1人だけに伝えてください。</small></div>}
      {state && <><h2>カレンダーの接続</h2><div className="status"><span>{state.connected ? "✓" : "○"}</span>あなたのGoogleカレンダー {state.connected ? "接続済み" : "未接続"}</div>{!state.connected && <a className="button" href="/api/google/start">Googleカレンダーを接続する</a>}<div className="status"><span>{state.partnerConnected ? "✓" : "○"}</span>相手の接続 {state.partnerConnected ? "完了" : "待機中"}</div>{state.connected && state.partnerConnected && <button onClick={loadSlots}>次の7日間の共通空き時間を見る</button>}</>}
      {message && <p className="message">{message}</p>}
    </section>
    {slots.length > 0 && <section className="card slots"><h2>共通の空き時間</h2>{slots.map(slot => <div className="slot" key={slot.start}>{fmt.format(new Date(slot.start))} — {new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }).format(new Date(slot.end))}</div>)}</section>}
    <footer>予定の名前・場所・内容・個別の空き時間は表示も保存もしません。時刻は日本時間です。</footer>
  </main>;
}
