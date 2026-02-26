import { ensureRoomState, getRoomState, removePlayer, upsertPlayer } from "@/lib/server/roomState";
import { pusherServer } from "@/lib/pusherServer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");

  if (!socketId || !channel.startsWith("presence-classclash-room-")) {
    return NextResponse.json({ error: "Invalid auth request" }, { status: 400 });
  }

  const roomId = channel.replace("presence-classclash-room-", "");
  const playerId = req.cookies.get("classclash-player-id")?.value;
  const playerName = req.cookies.get("classclash-player-name")?.value;

  if (!playerId || !playerName) {
    return NextResponse.json({ error: "Missing player identity" }, { status: 401 });
  }

  const room = getRoomState(roomId) ?? ensureRoomState(roomId, playerId);
  if (room.players.length >= 2 && !room.players.includes(playerId)) {
    return NextResponse.json({ error: "Room is full" }, { status: 403 });
  }

  upsertPlayer(roomId, playerId);

  const auth = pusherServer.authorizeChannel(socketId, channel, {
    user_id: playerId,
    user_info: { name: playerName, isHost: room.hostId === playerId },
  });

  return NextResponse.json(auth);
}

export async function DELETE(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get("roomId") ?? "";
  const playerId = req.nextUrl.searchParams.get("playerId") ?? "";
  if (roomId && playerId) removePlayer(roomId, playerId);
  return NextResponse.json({ ok: true });
}
