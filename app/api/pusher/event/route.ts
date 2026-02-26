import { ensureRoomState, resetGameState } from "@/lib/server/roomState";
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
  "dots-config",
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
    data: any;
  };

  if (!roomId || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const by = String(data?.by ?? data?.playerId ?? "");
  const room = ensureRoomState(roomId, by);

  if (event === "game-start") {
    room.currentGame = data?.game;
    if (data?.game === "bingo" || data?.game === "dots") {
      resetGameState(roomId, data.game);
    }
  }

  if (event === "bingo-ready") {
    room.bingo.ready[data.playerId] = true;
    room.bingo.boards[data.playerId] = data.board;
    if (!room.bingo.turn) room.bingo.turn = room.hostId;
  }
  if (event === "bingo-call-number") {
    if (!room.bingo.called.includes(data.n)) room.bingo.called.push(data.n);
    room.bingo.turn = data.nextTurn;
  }
  if (event === "bingo-win") room.bingo.winner = data.winner;

  if (event === "dots-config") {
    room.dots = {
      rows: data.rows,
      cols: data.cols,
      configured: true,
      lines: [],
      boxes: {},
      scores: {},
      turn: data.turn,
      winnerText: "",
    };
  }
  if (event === "dots-draw-line") {
    if (!room.dots.lines.some((line) => line.key === data.key)) room.dots.lines.push({ key: data.key, by: data.by });
  }
  if (event === "dots-box-completed") {
    room.dots.boxes = data.boxes;
    room.dots.scores = data.scores;
  }
  if (event === "dots-turn-change") room.dots.turn = data.turn;
  if (event === "dots-game-end") room.dots.winnerText = data.winnerText;

  await pusherServer.trigger(`presence-classclash-room-${roomId}`, event, data);
  return NextResponse.json({ ok: true });
}
