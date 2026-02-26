import { pusherServer } from "@/lib/pusherServer";
import { NextResponse } from "next/server";

const ALLOWED_EVENTS = new Set([
  "player-joined",
  "player-left",
  "game-selected",
  "game-start",
  "bingo-ready",
  "bingo-call-number",
  "bingo-score-update",
  "bingo-win",
  "dots-draw-line",
  "dots-box-completed",
  "dots-turn-change",
  "dots-game-end",
]);

export async function POST(req: Request) {
  const body = await req.json();
  const { roomId, event, data } = body as {
    roomId: string;
    event: string;
    data: unknown;
  };

  if (!roomId || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  await pusherServer.trigger(`presence-classclash-room-${roomId}`, event, data);
  return NextResponse.json({ ok: true });
}
