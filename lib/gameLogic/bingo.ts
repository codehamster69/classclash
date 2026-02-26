export const isValidBoard = (values: number[]) => {
  if (values.length !== 25) return false;
  const set = new Set(values);
  if (set.size !== 25) return false;
  return values.every((v) => Number.isInteger(v) && v >= 1 && v <= 25);
};

export const toGrid = (values: number[]) => {
  return Array.from({ length: 5 }, (_, r) => values.slice(r * 5, r * 5 + 5));
};

export const makeMarkedGrid = (board: number[][], called: number[]) =>
  board.map((row) => row.map((cell) => called.includes(cell)));

export const calculateBingoLines = (marked: boolean[][]) => {
  const lines = new Set<string>();
  for (let i = 0; i < 5; i++) {
    if (marked[i].every(Boolean)) lines.add(`r${i}`);
    if (marked.every((row) => row[i])) lines.add(`c${i}`);
  }
  if ([0, 1, 2, 3, 4].every((i) => marked[i][i])) lines.add("d1");
  if ([0, 1, 2, 3, 4].every((i) => marked[i][4 - i])) lines.add("d2");
  return lines.size;
};
