export type Dot = { x: number; y: number };

export const canonicalLineKey = (a: Dot, b: Dot) => {
  const [p1, p2] = [a, b].sort((x, y) => (x.x === y.x ? x.y - y.y : x.x - y.x));
  return `${p1.x},${p1.y}|${p2.x},${p2.y}`;
};

export const keyToPoints = (key: string) => {
  const [fromRaw, toRaw] = key.split("|");
  const [x1, y1] = fromRaw.split(",").map(Number);
  const [x2, y2] = toRaw.split(",").map(Number);
  return { from: { x: x1, y: y1 }, to: { x: x2, y: y2 } };
};

export const findCompletedBoxes = (lineKeys: Set<string>, rows: number, cols: number) => {
  const boxes: string[] = [];
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const top = canonicalLineKey({ x, y }, { x: x + 1, y });
      const right = canonicalLineKey({ x: x + 1, y }, { x: x + 1, y: y + 1 });
      const bottom = canonicalLineKey({ x, y: y + 1 }, { x: x + 1, y: y + 1 });
      const left = canonicalLineKey({ x, y }, { x, y: y + 1 });
      if ([top, right, bottom, left].every((k) => lineKeys.has(k))) boxes.push(`${x},${y}`);
    }
  }
  return boxes;
};
