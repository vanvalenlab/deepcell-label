/** Class to query and transform cell labels. */

type Cell = { value: number; cell: number; t: number };
type CellMatrix = (0 | 1)[][];

class Cells {
  cells: Cell[];

  constructor(cells: Cell[]) {
    this.cells = cells;
  }

  /** Converts the cell list to a sparse matrix where the (i, j)th element is 1 if value i encodes cell j in frame z.
   * @param t Frame to generate cell array for.
   * @returns Cell matrix where the (i, j)th element is 1 if value i encodes cell j in frame z and 0 otherwise
   */
  getMatrix(t: number): CellMatrix {
    // Filter to cells in current frame
    const inFrame = this.cells.filter((c) => c.t === t);
    // Get maximum value and cell in frame
    const maxCell = inFrame.reduce((max, c) => Math.max(max, c.cell), 0);
    const maxValue = inFrame.reduce((max, c) => Math.max(max, c.value), 0);
    // Initialize matrix with zeros
    const matrix: CellMatrix = new Array(maxValue + 1)
      .fill(0)
      .map(() => new Array(maxCell + 1).fill(0));
    // Set entries
    for (const c of inFrame) {
      const { value, cell } = c;
      matrix[value][cell] = 1;
    }
    return matrix;
  }

  /** Returns frames the cell is present in.
   * @param {number} cell Cell to get frames for.
   * @returns List of frames the cell is present in.
   */
  getFrames(cell: number) {
    let frames = this.cells.filter((c) => c.cell === cell).map((c) => c.t);
    frames = [...new Set(frames)];
    frames.sort((a, b) => a - b);
    return frames;
  }

  /** Returns the cells present in a frame.
   * @param {number} t Frame to get cells in.
   * @returns List of cells in the frame
   */
  getCells(t: number) {
    let cells = this.cells.filter((c) => c.t === t).map((o) => o.cell);
    cells = [...new Set(cells)];
    cells.sort((a, b) => a - b);
    return cells;
  }

  getCellsForValue(value: number, t: number) {
    let cells = this.cells
      .filter((cell) => cell.t === t && cell.value === value)
      .map((cell) => cell.cell);
    cells = [...new Set(cells)];
    cells.sort((a, b) => a - b);
    return cells;
  }

  getNewCell() {
    return this.cells.reduce((max, cell) => Math.max(max, cell.cell), 0) + 1;
  }
}

export default Cells;
