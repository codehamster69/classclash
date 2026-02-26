export type GameType = "bingo" | "dots";

type BingoState = {
  ready: Record<string, boolean>;
  boards: Record<string, number[][]>;
  called: number[];
  turn: string;
  winner: string;
};

type DotsState = {
  rows: number;
  cols: number;
  configured: boolean;
  lines: { key: string; by: string }[];
  boxes: Record<string, string>;
  scores: Record<string, number>;
  turn: string;
  winnerText: string;
};

export type RoomState = {
  hostId: string;
  currentGame?: GameType;
  players: string[];
  bingo: BingoState;
  dots: DotsState;
};

const defaultBingoState = (): BingoState => ({
  ready: {},
  boards: {},
  called: [],
  turn: "",
  winner: "",
});

const defaultDotsState = (): DotsState => ({
  rows: 5,
  cols: 5,
  configured: false,
  lines: [],
  boxes: {},
  scores: {},
  turn: "",
  winnerText: "",
});

const store = globalThis as typeof globalThis & {
  classclashRoomStore?: Map<string, RoomState>;
};

const roomStore = store.classclashRoomStore ?? new Map<string, RoomState>();
store.classclashRoomStore = roomStore;

const makeRoomState = (hostId: string): RoomState => ({
  hostId,
  players: hostId ? [hostId] : [],
  bingo: defaultBingoState(),
  dots: defaultDotsState(),
});

export const getRoomState = (roomId: string) => roomStore.get(roomId);

export const ensureRoomState = (roomId: string, hostId: string) => {
  const existing = roomStore.get(roomId);
  if (existing) return existing;
  const created = makeRoomState(hostId);
  roomStore.set(roomId, created);
  return created;
};

export const resetGameState = (roomId: string, game: GameType) => {
  const room = roomStore.get(roomId);
  if (!room) return;
  if (game === "bingo") room.bingo = defaultBingoState();
  if (game === "dots") room.dots = defaultDotsState();
};

export const upsertPlayer = (roomId: string, playerId: string) => {
  const room = roomStore.get(roomId);
  if (!room) return;
  if (!room.players.includes(playerId) && room.players.length < 2) {
    room.players.push(playerId);
  }
};

export const removePlayer = (roomId: string, playerId: string) => {
  const room = roomStore.get(roomId);
  if (!room) return;
  room.players = room.players.filter((id) => id !== playerId);
};
