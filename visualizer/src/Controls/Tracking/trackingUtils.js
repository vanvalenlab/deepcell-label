export function oneDaughter(cellInfo) {
  const { daughters } = cellInfo;
  return daughters?.length === 1;
}

export function parentAfterDivision(cellInfo) {
  const { frames, divisionFrame } = cellInfo;
  if (!divisionFrame) {
    return false;
  }
  const framesAfterDivision = frames?.filter(frame => frame >= divisionFrame);
  return framesAfterDivision?.length > 0;
}

export function daughterBeforeDivision(cellInfo) {
  const { frames, parentDivisionFrame } = cellInfo;
  const framesBeforeDivision = frames?.filter(frame => frame < parentDivisionFrame);
  return framesBeforeDivision?.length > 0;
}

/** Returns the ranges of consecutive integers in an array. */
export function getRanges(array) {
  let ranges = [];
  for (let i = 0; i < array.length; i++) {
    let start = array[i];
    let end = start;
    // increment end index while array elements are consecutive
    while (array[i + 1] - array[i] === 1) {
      end = array[i + 1];
      i++;
    }
    ranges.push(start === end ? start + '' : start + '-' + end);
  }
  return ranges;
}

/** Formats a list of frames in a readable format. */
export function formatFrames(frames) {
  if (frames.length === 1) {
    return `frame ${frames[0]}`;
  }
  const ranges = getRanges(frames);
  if (ranges.length === 1) {
    return `frames ${ranges[0]}`;
  }
  return 'frames ' + ranges.slice(0, -1).join(', ') + ' and ' + ranges[ranges.length - 1];
}
