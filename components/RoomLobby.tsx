"use client";

import { membersToPlayers, PresenceMember, sortPlayersByHost } from "@/lib/presence";
import { getPusherClient } from "@/lib/pusherClient";
import { getOrCreatePlayerId, getPlayerName } from "@/lib/store/session";
import { Player } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function RoomLobby({ roomId }: { roomId: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedGame, setSelectedGame] = useState<"bingo" | "dots">("bingo");
  const [roomError, setRoomError] = useState("");
  const router = useRouter();
  const me = useMemo(() => ({ id: getOrCreatePlayerId(), name: getPlayerName() || "Player" }), []);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`presence-classclash-room-${roomId}`);

    channel.bind("pusher:subscription_succeeded", (members: { each: (cb: (m: PresenceMember) => void) => void }) => {
      const list: PresenceMember[] = [];
      members.each((m) => list.push(m));
      setPlayers(sortPlayersByHost(membersToPlayers(list)).slice(0, 2));
      setRoomError("");
    });

    channel.bind("pusher:subscription_error", (status: number) => {
      setRoomError(status === 403 ? "Room is full" : "Unable to join this room");
    });

    channel.bind("pusher:member_added", (m: PresenceMember) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.id === m.id)) return prev;
        return sortPlayersByHost([...prev, { id: m.id, name: m.info?.name ?? "Player", isHost: !!m.info?.isHost }]).slice(0, 2);
      });
    });

    channel.bind("pusher:member_removed", (m: PresenceMember) => {
      setPlayers((prev) => prev.filter((p) => p.id !== m.id));
    });

    channel.bind("game-start", (payload: { game: "bingo" | "dots" }) => {
      router.push(`/room/${roomId}/${payload.game}`);
    });

    return () => {
      pusher.unsubscribe(`presence-classclash-room-${roomId}`);
    };
  }, [roomId, router]);

  const canStart = players.length === 2 && players[0]?.id === me.id;

  const triggerEvent = async (event: string, data: Record<string, unknown>) => {
    await fetch("/api/pusher/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, event, data }),
    });
  };

  return (
    <div className="space-y-4">
      {roomError && <div className="card font-semibold text-rose-600">{roomError}</div>}
      <div className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Lobby</h2>
          <button className="btn btn-secondary !py-2" onClick={() => navigator.clipboard.writeText(roomId)}>Copy {roomId}</button>
        </div>
        <p className="text-sm text-slate-500">2-player max. Room creator stays host.</p>
        <ul className="space-y-1">
          {players.map((p, i) => <li key={p.id}>{p.name} {i === 0 ? "(Host)" : ""}</li>)}
        </ul>
      </div>

      <div className="card space-y-2">
        <h3 className="font-semibold">Game Selection</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className={`btn ${selectedGame === "bingo" ? "btn-primary" : "btn-secondary"}`} onClick={() => setSelectedGame("bingo")}>Bingo</button>
          <button className={`btn ${selectedGame === "dots" ? "btn-primary" : "btn-secondary"}`} onClick={() => setSelectedGame("dots")}>Dots & Boxes</button>
        </div>
        <button
          className="btn btn-primary w-full"
          disabled={!canStart}
          onClick={async () => {
            await triggerEvent("game-start", { game: selectedGame, by: me.id });
          }}
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
