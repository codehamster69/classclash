"use client";

import { createRoomId } from "@/lib/room";
import { getPlayerName, setPlayerName, getOrCreatePlayerId } from "@/lib/store/session";
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
    router.push(`/room/${roomId}`);
  };

  const onJoin = () => {
    if (!name.trim() || !joinId.trim()) return;
    persistIdentity(name.trim());
    router.push(`/room/${joinId.trim().toUpperCase()}`);
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-300">Pick a name, hop in, and keep the vibe playful ✨</p>
      <div className="card space-y-3">
        <h2 className="text-xl font-extrabold tracking-tight">Play realtime Bingo & Dots</h2>
        <input className="w-full rounded-xl border border-white/70 bg-white/80 p-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-fuchsia-300 dark:border-slate-700 dark:bg-slate-950/80" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary w-full" onClick={onCreate}>Create Room</button>
      </div>
      <div className="card space-y-3">
        <input className="w-full rounded-xl border border-white/70 bg-white/80 p-3 uppercase shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-950/80" placeholder="Room ID" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
        <button className="btn btn-secondary w-full" onClick={onJoin}>Join Room</button>
      </div>
    </div>
  );
}
