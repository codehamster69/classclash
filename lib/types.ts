export type Player = { id: string; name: string };

export type LobbyEvent =
  | { type: "game-selected"; game: "bingo" | "dots"; by: string }
  | { type: "game-start"; game: "bingo" | "dots"; by: string }
  | { type: "player-left"; by: string }
  | { type: "player-joined"; by: string };
