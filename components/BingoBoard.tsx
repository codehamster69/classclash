"use client";

import { calculateBingoLines, isValidBoard, makeMarkedGrid, toGrid } from "@/lib/gameLogic/bingo";
import { getPusherClient } from "@/lib/pusherClient";
import { getOrCreatePlayerId } from "@/lib/store/session";
import { Player } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { ScoreBoard } from "./ScoreBoard";

export function BingoBoard({ roomId }: { roomId: string }) {
  const me = useMemo(() => getOrCreatePlayerId(), []);
  const [players, setPlayers] = useState<Player[]>([]);
  const [setup, setSetup] = useState(Array.from({ length: 25 }, (_, i) => i + 1));
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [called, setCalled] = useState<number[]>([]);
  const [boards, setBoards] = useState<Record<string, number[][]>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [turn, setTurn] = useState<string>("");
  const [callInput, setCallInput] = useState("");

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`presence-classclash-room-${roomId}`);

    channel.bind("pusher:subscription_succeeded", (members: { each: (cb: (m: { id: string; info?: { name?: string } }) => void) => void }) => {
      const list: Player[] = [];
      members.each((m) => list.push({ id: m.id, name: m.info?.name ?? "Player" }));
      setPlayers(list.slice(0, 2));
      if (!turn && list[0]) setTurn(list[0].id);
    });

    channel.bind("bingo-ready", (payload: { playerId: string; board: number[][] }) => {
      setReady((r) => ({ ...r, [payload.playerId]: true }));
      setBoards((b) => ({ ...b, [payload.playerId]: payload.board }));
      setScores((s) => ({ ...s, [payload.playerId]: s[payload.playerId] ?? 0 }));
    });

    channel.bind("bingo-call-number", (payload: { n: number; by: string }) => {
      setCalled((c) => [...c, payload.n]);
      if (players.length === 2) setTurn(players.find((p) => p.id !== payload.by)?.id ?? "");
    });

    channel.bind("bingo-score-update", (payload: { scores: Record<string, number> }) => setScores(payload.scores));

    return () => pusher.unsubscribe(`presence-classclash-room-${roomId}`);
  }, [roomId, players, turn]);

  const trigger = (event: string, data: unknown) => fetch("/api/pusher/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId, event, data }) });

  const startReady = async () => {
    if (!isValidBoard(setup)) return;
    await trigger("bingo-ready", { playerId: me, board: toGrid(setup) });
  };

  const bothReady = players.length === 2 && players.every((p) => ready[p.id]);

  const submitCall = async () => {
    const n = Number(callInput);
    if (!Number.isInteger(n) || n < 1 || n > 25 || called.includes(n) || turn !== me || !bothReady) return;
    await trigger("bingo-call-number", { n, by: me });
    const nextCalled = [...called, n];
    const nextScores: Record<string, number> = {};
    Object.entries(boards).forEach(([pid, board]) => {
      nextScores[pid] = calculateBingoLines(makeMarkedGrid(board, nextCalled));
    });
    await trigger("bingo-score-update", { scores: nextScores });
    const winner = Object.entries(nextScores).find(([, score]) => score >= 5)?.[0];
    if (winner) await trigger("bingo-win", { winner });
    setCallInput("");
  };

  return (
    <div className="space-y-4 pb-24">
      <h2 className="text-xl font-bold">Bingo</h2>
      <ScoreBoard players={players} scores={scores} turn={turn} />
      <div className="card space-y-3">
        <p className="text-sm">Setup your board (1-25 unique values)</p>
        <div className="grid grid-cols-5 gap-1">
          {setup.map((v, i) => (
            <input key={i} value={v} onChange={(e) => setSetup((prev) => prev.map((x, idx) => (idx === i ? Number(e.target.value || 0) : x)))} className="h-12 rounded border text-center dark:bg-slate-950" />
          ))}
        </div>
        <button className="btn btn-primary w-full" onClick={startReady}>Ready</button>
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-3 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl gap-2">
          <input value={callInput} onChange={(e) => setCallInput(e.target.value)} placeholder="Call number" className="flex-1 rounded-xl border p-3 dark:bg-slate-950" />
          <button className="btn btn-primary" onClick={submitCall}>Call</button>
        </div>
      </div>
    </div>
  );
}
