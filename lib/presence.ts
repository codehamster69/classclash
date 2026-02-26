import { Player } from "./types";

export type PresenceMember = { id: string; info?: { name?: string } };

export const membersToPlayers = (members: PresenceMember[]) =>
  members.map((m) => ({ id: m.id, name: m.info?.name ?? "Player" }));

export const sortPlayersByHost = (players: Player[], hostId: string) => {
  if (!hostId) return players;
  return [...players].sort((a, b) => {
    if (a.id === hostId) return -1;
    if (b.id === hostId) return 1;
    return 0;
  });
};
