import { Player } from "@/lib/types";

export function ScoreBoard({ players, scores, turn }: { players: Player[]; scores: Record<string, number>; turn?: string }) {
  return (
    <div className="card space-y-2">
      <h3 className="font-semibold">Score</h3>
      {players.map((p) => (
        <div key={p.id} className="flex items-center justify-between">
          <span className="text-sm">{p.name} {turn === p.id ? "• turn" : ""}</span>
          <span className="font-bold">{scores[p.id] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}
