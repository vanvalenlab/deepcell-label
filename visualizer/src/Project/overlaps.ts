/** Class to query and transform overlap labels. */

type Overlap = { value: number; cell: number; z: number };
type OverlapMatrix = (0 | 1)[][];

class Overlaps {
  overlaps: Overlap[];

  constructor(overlaps: Overlap[]) {
    this.overlaps = overlaps;
  }

  /** Converts the overlap objects to a sparse matrix where the (i, j)th element is 1 if value i encodes cell j in frame z.
   * @param z Frame to generate overlap array for.
   * @returns Overlap matrix where the (i, j)th element is 1 if value i encodes cell j in frame z and 0 otherwise
   */
  getMatrix(z: number): OverlapMatrix {
    // Filter to cells in current frame
    const inFrame = this.overlaps.filter((o) => o.z === z);
    // Get maximum value and cell in frame
    const maxCell = inFrame.reduce((max, o) => Math.max(max, o.cell), 0);
    const maxValue = inFrame.reduce((max, o) => Math.max(max, o.value), 0);
    // Initialize matrix with zeros
    const matrix: OverlapMatrix = new Array(maxValue + 1)
      .fill(0)
      .map(() => new Array(maxCell + 1).fill(0));
    // Set entries
    for (const overlap of inFrame) {
      const { value, cell } = overlap;
      matrix[value][cell] = 1;
    }
    return matrix;
  }

  /** Returns the frame a cell is present in.
   * @param cell Cell to get frames for.
   * @returns List of frames the cell is present in.
   */
  getFrames(cell: number) {
    let frames = this.overlaps.filter((o) => o.cell === cell).map((o) => o.z);
    frames = [...new Set(frames)];
    frames.sort((a, b) => a - b);
    return frames;
  }

  /** Returns the cells present in a frame.
   * @param frame Frame to get cells in.
   * @returns List of cells in the frame
   */
  getCells(z: number) {
    let cells = this.overlaps.filter((o) => o.z === z).map((o) => o.cell);
    cells = [...new Set(cells)];
    cells.sort((a, b) => a - b);
    return cells;
  }

  getCellsForValue(value: number, z: number) {
    let cells = this.overlaps.filter((o) => o.z === z && o.value === value).map((o) => o.cell);
    cells = [...new Set(cells)];
    cells.sort((a, b) => a - b);
    return cells;
  }

  getNewCell() {
    return this.overlaps.reduce((max, o) => Math.max(max, o.cell), 0) + 1;
  }
}

export default Overlaps;
