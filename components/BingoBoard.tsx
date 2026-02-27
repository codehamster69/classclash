"use client";

import { calculateBingoLines, makeMarkedGrid, toGrid } from "@/lib/gameLogic/bingo";
import { membersToPlayers, PresenceMember, sortPlayersByHost } from "@/lib/presence";
import { getPusherClient } from "@/lib/pusherClient";
import { getOrCreatePlayerId } from "@/lib/store/session";
import { Player } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const emptyBoard = Array.from({ length: 25 }, () => 0);

export function BingoBoard({ roomId }: { roomId: string }) {
  const me = useMemo(() => getOrCreatePlayerId(), []);
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [setup, setSetup] = useState<number[]>(emptyBoard);
  const [selectionOrder, setSelectionOrder] = useState<number[]>([]);
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [boards, setBoards] = useState<Record<string, number[][]>>({});
  const [called, setCalled] = useState<number[]>([]);
  const [turn, setTurn] = useState("");
  const [winner, setWinner] = useState("");

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
      if (room?.bingo) {
        setParticipantIds((room.players ?? []).slice(0, 2));
        setReady(room.bingo.ready ?? {});
        setBoards(room.bingo.boards ?? {});
        setCalled(room.bingo.called ?? []);
        setTurn(room.bingo.turn || sorted[0]?.id || "");
        setWinner(room.bingo.winner ?? "");
      } else if (sorted[0]) {
        setTurn(sorted[0].id);
      }
    });

    channel.bind("pusher:member_added", (m: PresenceMember) => {
      setPlayers((prev) => sortPlayersByHost([...prev, { id: m.id, name: m.info?.name ?? "Player", isHost: !!m.info?.isHost }]).slice(0, 2));
      setParticipantIds((prev) => (prev.includes(m.id) ? prev : [...prev, m.id].slice(0, 2)));
    });

    channel.bind("pusher:member_removed", (m: PresenceMember) => {
      setPlayers((prev) => prev.filter((p) => p.id !== m.id));
    });

    channel.bind("bingo-ready", (payload: { playerId: string; board: number[][] }) => {
      setReady((r) => ({ ...r, [payload.playerId]: true }));
      setBoards((b) => ({ ...b, [payload.playerId]: payload.board }));
    });

    channel.bind("bingo-call-number", (payload: { n: number; nextTurn: string }) => {
      setCalled((prev) => (prev.includes(payload.n) ? prev : [...prev, payload.n]));
      setTurn(payload.nextTurn);
    });

    channel.bind("bingo-win", (payload: { winner: string }) => {
      setWinner(payload.winner);
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

  const onSetupBoxClick = (index: number) => {
    if (ready[me]) return;
    if (setup[index] !== 0) return;
    const value = selectionOrder.length + 1;
    setSetup((prev) => prev.map((cell, idx) => (idx === index ? value : cell)));
    setSelectionOrder((prev) => [...prev, index]);
  };

  const undoSetup = () => {
    if (!selectionOrder.length || ready[me]) return;
    const last = selectionOrder[selectionOrder.length - 1];
    setSetup((prev) => prev.map((cell, idx) => (idx === last ? 0 : cell)));
    setSelectionOrder((prev) => prev.slice(0, -1));
  };

  const onReady = async () => {
    if (selectionOrder.length !== 25 || ready[me]) return;
    await trigger("bingo-ready", { playerId: me, board: toGrid(setup) });
  };

  const readyIds = Object.keys(ready).filter((id) => ready[id]);
  const matchPlayerIds = participantIds.length === 2 ? participantIds : readyIds.slice(0, 2);
  const bothReady = matchPlayerIds.length === 2 && matchPlayerIds.every((id) => ready[id]);
  const myBoard = boards[me] ?? toGrid(setup);

  const onCall = async (value: number) => {
    if (!bothReady || turn !== me || called.includes(value) || winner) return;
    const other = matchPlayerIds.find((id) => id !== me) ?? me;
    await trigger("bingo-call-number", { n: value, by: me, nextTurn: other });
    const simulatedCalled = [...called, value];
    const localWinner = players.find((p) => {
      const board = boards[p.id];
      return board && calculateBingoLines(makeMarkedGrid(board, simulatedCalled)) >= 5;
    });
    if (localWinner) await trigger("bingo-win", { winner: localWinner.id });
  };

  const playerById = (id: string) => players.find((p) => p.id === id);

  return (
    <div className="space-y-4 pb-10">
      <h2 className="text-xl font-bold">Bingo</h2>

      {!ready[me] && (
        <div className="card space-y-3">
          <p className="text-sm">Tap boxes in sequence to assign 1..25.</p>
          <div className="grid grid-cols-5 gap-2">
            {setup.map((v, i) => (
              <button key={i} onClick={() => onSetupBoxClick(i)} className="aspect-square rounded-lg border font-semibold dark:bg-slate-950">
                {v || ""}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary flex-1" onClick={undoSetup} disabled={!selectionOrder.length}>Undo</button>
            <button className="btn btn-primary flex-1" onClick={onReady} disabled={selectionOrder.length !== 25}>Ready</button>
          </div>
        </div>
      )}

      {ready[me] && !bothReady && <div className="card font-medium">Waiting for other player to be ready...</div>}

      {bothReady && (
        <>
          <div className="card">
            {!winner ? <p className="font-medium">Current turn: {playerById(turn)?.name ?? "-"}</p> : <p className="font-bold">Winner: {playerById(winner)?.name}</p>}
          </div>

          <div className="card space-y-2">
            <h3 className="font-semibold">Your board</h3>
            <div className="grid grid-cols-5 gap-2">
              {myBoard.flat().map((cell, i) => {
                const marked = called.includes(cell);
                return (
                  <button
                    key={i}
                    onClick={() => onCall(cell)}
                    disabled={!!winner || turn !== me || marked}
                    className={`aspect-square rounded-lg border font-semibold ${marked ? "bg-slate-300 line-through dark:bg-slate-700" : "dark:bg-slate-950"}`}
                  >
                    {cell}
                  </button>
                );
              })}
            </div>
          </div>

          {winner && (
            <div className="card space-y-3">
              <h3 className="font-semibold">Final boards</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {players.map((p) => (
                  <div key={p.id}>
                    <p className="mb-2 font-medium">{p.name}</p>
                    <div className="grid grid-cols-5 gap-1">
                      {(boards[p.id] ?? []).flat().map((n, i) => (
                        <div key={i} className={`aspect-square rounded border text-center leading-10 ${called.includes(n) ? "bg-slate-300 line-through dark:bg-slate-700" : "dark:bg-slate-950"}`}>{n}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary w-full" onClick={onNewGame}>New Game</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
