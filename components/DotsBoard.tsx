"use client";

import { canonicalLineKey, findCompletedBoxes, keyToPoints } from "@/lib/gameLogic/dots";
import { membersToPlayers, PresenceMember, sortPlayersByHost } from "@/lib/presence";
import { getPusherClient } from "@/lib/pusherClient";
import { getOrCreatePlayerId } from "@/lib/store/session";
import { Player } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

export function DotsBoard({ roomId }: { roomId: string }) {
  const me = useMemo(() => getOrCreatePlayerId(), []);
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const [players, setPlayers] = useState<Player[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
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

    channel.bind("pusher:subscription_succeeded", async (members: { each: (cb: (m: PresenceMember) => void) => void }) => {
      const list: PresenceMember[] = [];
      members.each((m) => list.push(m));
      const sorted = sortPlayersByHost(membersToPlayers(list)).slice(0, 2);
      setPlayers(sorted);

      const response = await fetch(`/api/room/state?roomId=${roomId}`);
      const payload = await response.json();
      const room = payload?.room;
      if (room?.dots) {
        setParticipantIds((room.players ?? []).slice(0, 2));
        setRows(room.dots.rows ?? 5);
        setCols(room.dots.cols ?? 5);
        setConfigured(!!room.dots.configured);
        setLines(room.dots.lines ?? []);
        setBoxes(room.dots.boxes ?? {});
        setScores(room.dots.scores ?? {});
        setTurn(room.dots.turn || sorted[0]?.id || "");
        setWinnerText(room.dots.winnerText ?? "");
      } else if (sorted[0]) {
        setTurn(sorted[0].id);
      }
    });

    channel.bind("pusher:member_added", (m: PresenceMember) => {
      setPlayers((prev) => sortPlayersByHost([...prev, { id: m.id, name: m.info?.name ?? "Player", isHost: !!m.info?.isHost }]).slice(0, 2));
      setParticipantIds((prev) => (prev.includes(m.id) ? prev : [...prev, m.id].slice(0, 2)));
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

    channel.bind("room-new-game", () => {
      router.push(`/room/${roomId}`);
    });

    return () => pusher.unsubscribe(`presence-classclash-room-${roomId}`);
  }, [roomId, router]);

  const trigger = (event: string, data: unknown) =>
    fetch("/api/pusher/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, event, data }) });

  const onNewGame = async () => {
    if (players[0]?.id === me) {
      await trigger("room-new-game", { by: me });
    }
    router.push(`/room/${roomId}`);
  };

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
  const lastLineKey = lines.at(-1)?.key;

  const playerIds = useMemo(
    () => (participantIds.length === 2 ? participantIds : players.slice(0, 2).map((p) => p.id)),
    [participantIds, players],
  );

  const isDark = resolvedTheme === "dark";
  const neutralLineColor = isDark ? "#334155" : "#cbd5e1";
  const lastMoveLineColor = isDark ? "#facc15" : "#d97706";
  const playerPalette = [
    {
      line: isDark ? "#38bdf8" : "#0284c7",
      boxFill: isDark ? "#082f49" : "#e0f2fe",
      boxText: isDark ? "#7dd3fc" : "#0c4a6e",
    },
    {
      line: isDark ? "#f472b6" : "#be185d",
      boxFill: isDark ? "#4a044e" : "#fce7f3",
      boxText: isDark ? "#f9a8d4" : "#831843",
    },
  ];

  const playerStyles = useMemo(
    () =>
      playerIds.reduce<Record<string, (typeof playerPalette)[number]>>((acc, playerId, index) => {
        acc[playerId] = playerPalette[index] ?? playerPalette[0];
        return acc;
      }, {}),
    [playerIds, playerPalette],
  );

  const startConfiguredGame = async () => {
    if (players[0]?.id !== me) return;
    await trigger("dots-config", { rows, cols, turn: players[0].id, by: me });
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

    const activePlayerIds = playerIds;

    const nextScores = activePlayerIds.reduce<Record<string, number>>((acc, playerId) => {
      acc[playerId] = Object.values(nextBoxes).filter((owner) => owner === playerId).length;
      return acc;
    }, {});

    await trigger("dots-box-completed", { boxes: nextBoxes, scores: nextScores, by: me });

    const isFinished = Object.keys(nextBoxes).length === (rows - 1) * (cols - 1);
    if (isFinished) {
      const first = players.find((p) => p.id === activePlayerIds[0]);
      const second = players.find((p) => p.id === activePlayerIds[1]);
      const a = first ? nextScores[first.id] ?? 0 : 0;
      const b = second ? nextScores[second.id] ?? 0 : 0;
      const text = a === b ? "It's a draw!" : `${a > b ? first?.name : second?.name} wins!`;
      await trigger("dots-game-end", { winnerText: text, by: me });
      return;
    }

    const nextTurn = gained ? me : activePlayerIds.find((id) => id !== me) ?? me;
    await trigger("dots-turn-change", { turn: nextTurn, by: me });
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">Rows: {rows}
            <input type="range" min={5} max={10} className="mt-1 w-full" value={rows} onChange={(e) => setRows(Number(e.target.value || 5))} disabled={configured || players[0]?.id !== me} />
          </label>
          <label className="text-sm">Cols: {cols}
            <input type="range" min={5} max={10} className="mt-1 w-full" value={cols} onChange={(e) => setCols(Number(e.target.value || 5))} disabled={configured || players[0]?.id !== me} />
          </label>
        </div>
        {!configured && <button className="btn btn-primary w-full" disabled={players[0]?.id !== me || players.length < 2} onClick={startConfiguredGame}>Start Grid</button>}
        {configured && <p className="text-sm">Turn: {players.find((p) => p.id === turn)?.name}</p>}
      </div>

      {configured && (
        <div className="card">
          <div className="mx-auto w-full max-w-3xl">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
              {Array.from({ length: rows - 1 }).flatMap((_, y) =>
                Array.from({ length: cols - 1 }).map((__, x) => {
                  const owner = boxes[`${x},${y}`];
                  if (!owner) return null;
                  const style = playerStyles[owner] ?? playerPalette[0];
                  return (
                    <g key={`${x},${y}`}>
                      <rect
                        x={pad + x * cellSize + 8}
                        y={pad + y * cellSize + 8}
                        width={cellSize - 16}
                        height={cellSize - 16}
                        rx={8}
                        fill={style.boxFill}
                      />
                      <text
                        x={pad + x * cellSize + cellSize / 2}
                        y={pad + y * cellSize + cellSize / 2 + 5}
                        textAnchor="middle"
                        fill={style.boxText}
                        className="text-lg font-bold"
                      >
                        {initialFor(owner)}
                      </text>
                    </g>
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
                const lineColor = !claimed
                  ? neutralLineColor
                  : key === lastLineKey
                    ? lastMoveLineColor
                    : playerStyles[claimed.by]?.line ?? playerPalette[0].line;
                return (
                  <line
                    key={key}
                    x1={p1x}
                    y1={p1y}
                    x2={p2x}
                    y2={p2y}
                    stroke={lineColor}
                    strokeWidth={claimed ? 8 : 10}
                    strokeLinecap="round"
                    className={claimed ? "" : "cursor-pointer hover:stroke-slate-400 dark:hover:stroke-slate-500"}
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
        </div>
      )}

      <div className="card text-sm">
        <p>{players.map((p) => `${p.name}: ${scores[p.id] ?? 0}`).join(" • ")}</p>
        {winnerText && <p className="mt-2 font-bold">{winnerText}</p>}
      </div>

      {winnerText && <button className="btn btn-primary w-full" onClick={onNewGame}>New Game</button>}
    </div>
  );
}
