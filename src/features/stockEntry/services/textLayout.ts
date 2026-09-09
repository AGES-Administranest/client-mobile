/** A fragment of text with the position it occupies on the page/image. */
export type PositionedText = {
  x: number;
  /** Normalised so that a larger value always means "further down the page". */
  y: number;
  text: string;
};

/**
 * Rebuilds visual rows out of positioned text fragments: fragments sharing a
 * baseline become one row, ordered left to right.
 *
 * Both sources need this. A PDF's content stream and ML Kit's recognition
 * result each hand back fragments in an arbitrary order, and reading them in
 * that order interleaves the columns of a table — which is exactly what breaks
 * invoice parsing.
 */
export function groupIntoRows(
  runs: PositionedText[],
  rowTolerance: number,
): string[][] {
  const rows: PositionedText[][] = [];

  for (const run of [...runs].sort((a, b) => a.y - b.y)) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(current[0].y - run.y) <= rowTolerance) {
      current.push(run);
    } else {
      rows.push([run]);
    }
  }

  return rows.map(row =>
    [...row].sort((a, b) => a.x - b.x).map(run => run.text),
  );
}

/**
 * Row tolerance for an image: a photo's pixel scale is unknown up front, so it
 * is derived from how tall the recognised lines actually are.
 */
export function toleranceFromHeights(heights: number[]): number {
  const usable = heights.filter(height => height > 0).sort((a, b) => a - b);
  if (usable.length === 0) {
    return 0;
  }

  const median = usable[Math.floor(usable.length / 2)];
  // Half a line height: enough to absorb the skew of a hand-held photo without
  // merging two neighbouring lines into one row.
  return median * 0.5;
}
