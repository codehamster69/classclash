import { Player } from "./types";

export type PresenceMember = { id: string; info?: { name?: string; isHost?: boolean } };

export const membersToPlayers = (members: PresenceMember[]) =>
  members.map((m) => ({ id: m.id, name: m.info?.name ?? "Player", isHost: !!m.info?.isHost }));

export const sortPlayersByHost = (players: Array<Player & { isHost?: boolean }>, hostId?: string) => {
  return [...players].sort((a, b) => {
    const aHost = a.id === hostId || a.isHost;
    const bHost = b.id === hostId || b.isHost;
    if (aHost && !bHost) return -1;
    if (bHost && !aHost) return 1;
    return a.id.localeCompare(b.id);
  });
};
