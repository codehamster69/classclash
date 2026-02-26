export type Dot = { x: number; y: number };
export type Line = { from: Dot; to: Dot; drawnBy: string };

export const canonicalLineKey = (a: Dot, b: Dot) => {
  const [p1, p2] = [a, b].sort((x, y) => (x.x === y.x ? x.y - y.y : x.x - y.x));
  return `${p1.x},${p1.y}|${p2.x},${p2.y}`;
};

export const isAdjacent = (a: Dot, b: Dot) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

export const findCompletedBoxes = (lineKeys: Set<string>, size = 5) => {
  const boxes: string[] = [];
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const top = canonicalLineKey({ x, y }, { x: x + 1, y });
      const right = canonicalLineKey({ x: x + 1, y }, { x: x + 1, y: y + 1 });
      const bottom = canonicalLineKey({ x, y: y + 1 }, { x: x + 1, y: y + 1 });
      const left = canonicalLineKey({ x, y }, { x, y: y + 1 });
      if ([top, right, bottom, left].every((k) => lineKeys.has(k))) {
        boxes.push(`${x},${y}`);
      }
    }
  }
  return boxes;
};
