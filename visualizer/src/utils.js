const overlap = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [0, 1, 1],
];

function makeOverlapMatrix(overlaps, numObjects) {
  const overlapMatrix = [];
  for (key in overlaps) {
    const overlap = overlaps[key];
    for (let i = 0; i < numObjects; i++) {
      overlapMatrix.push(overlap[i]);
    }
    overlaps[key] = overlapMatrix;
  }
}
