export const getOrCreatePlayerId = () => {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem("classclash-player-id");
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem("classclash-player-id", id);
  return id;
};

export const getPlayerName = () => (typeof window === "undefined" ? "" : localStorage.getItem("classclash-player-name") ?? "");

export const setPlayerName = (name: string) => {
  localStorage.setItem("classclash-player-name", name);
};
