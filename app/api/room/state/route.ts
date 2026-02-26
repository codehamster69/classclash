import { getRoomState } from "@/lib/server/roomState";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get("roomId") ?? "";

  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  const room = getRoomState(roomId);
  if (!room) {
    return NextResponse.json({ room: null });
  }

  return NextResponse.json({ room });
}
