/** Class to query and transform cell labels. */

type Cell = { value: number; cell: number; t: number; c: number };
type CellMatrix = (0 | 1)[][];

class Cells {
  cells: Cell[];

  constructor(cells: Cell[]) {
    this.cells = cells;
  }

  /** Converts the cell list to a sparse matrix where the (i, j)th element is 1 if value i encodes cell j at time t.
   * @param t Time to generate cell array for.
   * @returns Cell matrix where the (i, j)th element is 1 if value i encodes cell j at time t and 0 otherwise
   */
  getMatrix(t: number, c: number): CellMatrix {
    const atT = this.cells.filter((cell) => cell.t === t && cell.c === c);
    const maxCell = atT.reduce((max, cell) => Math.max(max, cell.cell), 0);
    const maxValue = atT.reduce((max, cell) => Math.max(max, cell.value), 0);
    const matrix: CellMatrix = new Array(maxValue + 1)
      .fill(0)
      .map(() => new Array(maxCell + 1).fill(0));
    for (const cell of atT) {
      matrix[cell.value][cell.cell] = 1;
    }
    return matrix;
  }

  /** Returns times the cell is present in.
   * @param {number} cell Cell to get times for.
   * @returns List of times the cell is present in.
   */
  getTimes(cell: number) {
    let t = this.cells.filter((c) => c.cell === cell).map((c) => c.t);
    t = [...new Set(t)];
    t.sort((a, b) => a - b);
    return t;
  }

  /** Returns the cells that a value encodes at time t.
   * @param {number} value Value in segmentation image
   * @param {number} t Time to get cells in.
   * @returns List of cells
   */
  getCellsForValue(value: number, t: number, c: number) {
    let cells = this.cells
      .filter((cell) => cell.t === t && cell.c === c && cell.value === value)
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
