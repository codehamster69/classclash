"use client";

import { canonicalLineKey, findCompletedBoxes, isAdjacent } from "@/lib/gameLogic/dots";
import { getPusherClient } from "@/lib/pusherClient";
import { getOrCreatePlayerId } from "@/lib/store/session";
import { Player } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { ScoreBoard } from "./ScoreBoard";

const SIZE = 5;

export function DotsBoard({ roomId }: { roomId: string }) {
  const me = useMemo(() => getOrCreatePlayerId(), []);
  const [players, setPlayers] = useState<Player[]>([]);
  const [lines, setLines] = useState<{ key: string; by: string }[]>([]);
  const [boxes, setBoxes] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [turn, setTurn] = useState("");
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`presence-classclash-room-${roomId}`);
    channel.bind("pusher:subscription_succeeded", (members: { each: (cb: (m: { id: string; info?: { name?: string } }) => void) => void }) => {
      const list: Player[] = [];
      members.each((m) => list.push({ id: m.id, name: m.info?.name ?? "Player" }));
      setPlayers(list.slice(0, 2));
      if (list[0]) setTurn((t) => t || list[0].id);
    });

    channel.bind("dots-draw-line", (payload: { key: string; by: string }) => {
      setLines((prev) => (prev.some((l) => l.key === payload.key) ? prev : [...prev, payload]));
    });
    channel.bind("dots-box-completed", (payload: { boxes: Record<string, string>; scores: Record<string, number> }) => {
      setBoxes(payload.boxes);
      setScores(payload.scores);
    });
    channel.bind("dots-turn-change", (payload: { turn: string }) => setTurn(payload.turn));

    return () => pusher.unsubscribe(`presence-classclash-room-${roomId}`);
  }, [roomId]);

  const trigger = (event: string, data: unknown) => fetch("/api/pusher/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, event, data }) });

  const onDot = async (x: number, y: number) => {
    if (!selected) return setSelected({ x, y });
    const next = { x, y };
    if (!isAdjacent(selected, next) || turn !== me) {
      setSelected(null);
      return;
    }
    const key = canonicalLineKey(selected, next);
    const keySet = new Set(lines.map((l) => l.key));
    if (keySet.has(key)) return setSelected(null);

    const nextLines = [...lines, { key, by: me }];
    await trigger("dots-draw-line", { key, by: me });
    const completed = findCompletedBoxes(new Set(nextLines.map((l) => l.key)), SIZE);
    const nextBoxes = { ...boxes };
    let gained = false;
    completed.forEach((b) => {
      if (!nextBoxes[b]) {
        nextBoxes[b] = me;
        gained = true;
      }
    });
    const nextScores = players.reduce<Record<string, number>>((acc, p) => {
      acc[p.id] = Object.values(nextBoxes).filter((owner) => owner === p.id).length;
      return acc;
    }, {});

    await trigger("dots-box-completed", { boxes: nextBoxes, scores: nextScores });
    const nextTurn = gained ? me : players.find((p) => p.id !== me)?.id ?? me;
    await trigger("dots-turn-change", { turn: nextTurn });
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Dots & Boxes</h2>
      <ScoreBoard players={players} scores={scores} turn={turn} />
      <div className="card overflow-x-auto">
        <div className="mx-auto grid w-fit grid-cols-5 gap-6 p-2">
          {Array.from({ length: SIZE * SIZE }).map((_, i) => {
            const x = i % SIZE;
            const y = Math.floor(i / SIZE);
            return <button key={i} onClick={() => onDot(x, y)} className={`h-4 w-4 rounded-full ${selected?.x === x && selected?.y === y ? "bg-indigo-500" : "bg-slate-500"}`} />;
          })}
        </div>
      </div>
      <div className="card">
        <p className="text-sm">Lines drawn: {lines.length} / 40</p>
      </div>
    </div>
  );
}
