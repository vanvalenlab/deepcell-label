/** Class to query and transform cell labels. */

type Cell = { value: number; cell: number; z: number };
type CellMatrix = (0 | 1)[][];

class Cells {
  cells: Cell[];

  constructor(cells: Cell[]) {
    this.cells = cells;
  }

  /** Converts the cell list to a sparse matrix where the (i, j)th element is 1 if value i encodes cell j in frame z.
   * @param z Frame to generate cell array for.
   * @returns Cell matrix where the (i, j)th element is 1 if value i encodes cell j in frame z and 0 otherwise
   */
  getMatrix(z: number): CellMatrix {
    // Filter to cells in current frame
    const inFrame = this.cells.filter((o) => o.z === z);
    // Get maximum value and cell in frame
    const maxCell = inFrame.reduce((max, o) => Math.max(max, o.cell), 0);
    const maxValue = inFrame.reduce((max, o) => Math.max(max, o.value), 0);
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

  /** Returns the frame a cell is present in.
   * @param cell Cell to get frames for.
   * @returns List of frames the cell is present in.
   */
  getFrames(cell: number) {
    let frames = this.cells.filter((o) => o.cell === cell).map((o) => o.z);
    frames = [...new Set(frames)];
    frames.sort((a, b) => a - b);
    return frames;
  }

  /** Returns the cells present in a frame.
   * @param frame Frame to get cells in.
   * @returns List of cells in the frame
   */
  getCells(z: number) {
    let cells = this.cells.filter((o) => o.z === z).map((o) => o.cell);
    cells = [...new Set(cells)];
    cells.sort((a, b) => a - b);
    return cells;
  }

  getCellsForValue(value: number, z: number) {
    let cells = this.cells.filter((o) => o.z === z && o.value === value).map((o) => o.cell);
    cells = [...new Set(cells)];
    cells.sort((a, b) => a - b);
    return cells;
  }

  getNewCell() {
    return this.cells.reduce((max, o) => Math.max(max, o.cell), 0) + 1;
  }
}

export default Cells;
