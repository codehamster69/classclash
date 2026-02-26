"use client";

import { canonicalLineKey, findCompletedBoxes, keyToPoints } from "@/lib/gameLogic/dots";
import { membersToPlayers, PresenceMember, sortPlayersByHost } from "@/lib/presence";
import { getPusherClient } from "@/lib/pusherClient";
import { getOrCreatePlayerId, getRoomHost } from "@/lib/store/session";
import { Player } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function DotsBoard({ roomId }: { roomId: string }) {
  const me = useMemo(() => getOrCreatePlayerId(), []);
  const hostId = useMemo(() => getRoomHost(roomId), [roomId]);
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [configured, setConfigured] = useState(false);
  const [lines, setLines] = useState<{ key: string; by: string }[]>([]);
  const [boxes, setBoxes] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [turn, setTurn] = useState("");
  const [winnerText, setWinnerText] = useState("");

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`presence-classclash-room-${roomId}`);

    channel.bind("pusher:subscription_succeeded", (members: { each: (cb: (m: PresenceMember) => void) => void }) => {
      const list: PresenceMember[] = [];
      members.each((m) => list.push(m));
      const sorted = sortPlayersByHost(membersToPlayers(list), hostId).slice(0, 2);
      setPlayers(sorted);
      if (sorted[0]) setTurn((current) => current || sorted[0].id);
    });

    channel.bind("pusher:member_added", (m: PresenceMember) => {
      setPlayers((prev) => sortPlayersByHost([...prev, { id: m.id, name: m.info?.name ?? "Player" }], hostId).slice(0, 2));
    });

    channel.bind("dots-config", (payload: { rows: number; cols: number; turn: string }) => {
      setRows(payload.rows);
      setCols(payload.cols);
      setTurn(payload.turn);
      setConfigured(true);
      setLines([]);
      setBoxes({});
      setScores({});
      setWinnerText("");
    });

    channel.bind("dots-draw-line", (payload: { key: string; by: string }) => {
      setLines((prev) => (prev.some((l) => l.key === payload.key) ? prev : [...prev, payload]));
    });

    channel.bind("dots-box-completed", (payload: { boxes: Record<string, string>; scores: Record<string, number> }) => {
      setBoxes(payload.boxes);
      setScores(payload.scores);
    });

    channel.bind("dots-turn-change", (payload: { turn: string }) => {
      setTurn(payload.turn);
    });

    channel.bind("dots-game-end", (payload: { winnerText: string }) => {
      setWinnerText(payload.winnerText);
    });

    return () => pusher.unsubscribe(`presence-classclash-room-${roomId}`);
  }, [hostId, roomId]);

  const trigger = (event: string, data: unknown) =>
    fetch("/api/pusher/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, event, data }) });

  const allSegments = useMemo(() => {
    const output: string[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols - 1; x++) output.push(canonicalLineKey({ x, y }, { x: x + 1, y }));
    }
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols; x++) output.push(canonicalLineKey({ x, y }, { x, y: y + 1 }));
    }
    return output;
  }, [rows, cols]);

  const lineSet = useMemo(() => new Set(lines.map((l) => l.key)), [lines]);

  const startConfiguredGame = async () => {
    if (players[0]?.id !== me) return;
    await trigger("dots-config", { rows, cols, turn: players[0].id });
  };

  const onLineClick = async (key: string) => {
    if (!configured || turn !== me || lineSet.has(key) || winnerText) return;
    const nextLines = [...lines, { key, by: me }];
    await trigger("dots-draw-line", { key, by: me });

    const completed = findCompletedBoxes(new Set(nextLines.map((l) => l.key)), rows, cols);
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

    const isFinished = Object.keys(nextBoxes).length === (rows - 1) * (cols - 1);
    if (isFinished) {
      const first = players[0];
      const second = players[1];
      const a = first ? nextScores[first.id] ?? 0 : 0;
      const b = second ? nextScores[second.id] ?? 0 : 0;
      const text = a === b ? "It's a draw!" : `${a > b ? first?.name : second?.name} wins!`;
      await trigger("dots-game-end", { winnerText: text });
      return;
    }

    const nextTurn = gained ? me : players.find((p) => p.id !== me)?.id ?? me;
    await trigger("dots-turn-change", { turn: nextTurn });
  };

  const cellSize = 56;
  const pad = 18;
  const width = pad * 2 + cellSize * (cols - 1);
  const height = pad * 2 + cellSize * (rows - 1);

  const initialFor = (pid: string) => players.find((p) => p.id === pid)?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="space-y-4 pb-10">
      <h2 className="text-xl font-bold">Dots & Boxes</h2>

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">Rows
            <input type="number" min={3} max={9} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" value={rows} onChange={(e) => setRows(Number(e.target.value || 5))} disabled={configured || players[0]?.id !== me} />
          </label>
          <label className="text-sm">Cols
            <input type="number" min={3} max={9} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-950" value={cols} onChange={(e) => setCols(Number(e.target.value || 5))} disabled={configured || players[0]?.id !== me} />
          </label>
        </div>
        {!configured && <button className="btn btn-primary w-full" disabled={players[0]?.id !== me || players.length < 2} onClick={startConfiguredGame}>Start Grid</button>}
        {configured && <p className="text-sm">Turn: {players.find((p) => p.id === turn)?.name}</p>}
      </div>

      {configured && (
        <div className="card overflow-auto">
          <svg width={width} height={height} className="mx-auto">
            {Array.from({ length: rows - 1 }).flatMap((_, y) =>
              Array.from({ length: cols - 1 }).map((__, x) => {
                const owner = boxes[`${x},${y}`];
                if (!owner) return null;
                return (
                  <text key={`${x},${y}`} x={pad + x * cellSize + cellSize / 2} y={pad + y * cellSize + cellSize / 2 + 5} textAnchor="middle" className="fill-indigo-600 text-lg font-bold">
                    {initialFor(owner)}
                  </text>
                );
              }),
            )}

            {allSegments.map((key) => {
              const points = keyToPoints(key);
              const claimed = lines.find((l) => l.key === key);
              const p1x = pad + points.from.x * cellSize;
              const p1y = pad + points.from.y * cellSize;
              const p2x = pad + points.to.x * cellSize;
              const p2y = pad + points.to.y * cellSize;
              return (
                <line
                  key={key}
                  x1={p1x}
                  y1={p1y}
                  x2={p2x}
                  y2={p2y}
                  stroke={claimed ? "#4f46e5" : "#cbd5e1"}
                  strokeWidth={claimed ? 8 : 3}
                  strokeLinecap="round"
                  className={claimed ? "" : "cursor-pointer hover:stroke-slate-400"}
                  onClick={() => onLineClick(key)}
                />
              );
            })}

            {Array.from({ length: rows }).flatMap((_, y) =>
              Array.from({ length: cols }).map((__, x) => (
                <circle key={`${x}-${y}`} cx={pad + x * cellSize} cy={pad + y * cellSize} r={6} fill="#334155" />
              )),
            )}
          </svg>
        </div>
      )}

      <div className="card text-sm">
        <p>{players.map((p) => `${p.name}: ${scores[p.id] ?? 0}`).join(" • ")}</p>
        {winnerText && <p className="mt-2 font-bold">{winnerText}</p>}
      </div>

      {winnerText && <button className="btn btn-primary w-full" onClick={() => router.push(`/room/${roomId}`)}>New Game</button>}
    </div>
  );
}
