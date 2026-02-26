"use client";

import { createRoomId } from "@/lib/room";
import { getPlayerName, setPlayerName, getOrCreatePlayerId, setRoomHost } from "@/lib/store/session";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [name, setName] = useState("");
  const [joinId, setJoinId] = useState("");
  const router = useRouter();

  useEffect(() => {
    setName(getPlayerName());
  }, []);

  const persistIdentity = (playerName: string) => {
    const playerId = getOrCreatePlayerId();
    setPlayerName(playerName);
    document.cookie = `classclash-player-id=${playerId}; path=/; max-age=31536000`;
    document.cookie = `classclash-player-name=${encodeURIComponent(playerName)}; path=/; max-age=31536000`;
  };

  const onCreate = () => {
    if (!name.trim()) return;
    persistIdentity(name.trim());
    const roomId = createRoomId();
    setRoomHost(roomId, getOrCreatePlayerId());
    router.push(`/room/${roomId}`);
  };

  const onJoin = () => {
    if (!name.trim() || !joinId.trim()) return;
    persistIdentity(name.trim());
    router.push(`/room/${joinId.trim().toUpperCase()}`);
  };

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h2 className="text-xl font-bold">Play realtime Bingo & Dots</h2>
        <input className="w-full rounded-xl border p-3 dark:bg-slate-950" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary w-full" onClick={onCreate}>Create Room</button>
      </div>
      <div className="card space-y-3">
        <input className="w-full rounded-xl border p-3 uppercase dark:bg-slate-950" placeholder="Room ID" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
        <button className="btn btn-secondary w-full" onClick={onJoin}>Join Room</button>
      </div>
    </div>
  );
}
