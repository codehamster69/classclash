import { pusherServer } from "@/lib/pusherServer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");

  if (!socketId || !channel.startsWith("presence-classclash-room-")) {
    return NextResponse.json({ error: "Invalid auth request" }, { status: 400 });
  }

  const playerId = req.cookies.get("classclash-player-id")?.value;
  const playerName = req.cookies.get("classclash-player-name")?.value;

  if (!playerId || !playerName) {
    return NextResponse.json({ error: "Missing player identity" }, { status: 401 });
  }

  const auth = pusherServer.authorizeChannel(socketId, channel, {
    user_id: playerId,
    user_info: { name: playerName },
  });

  return NextResponse.json(auth);
}
