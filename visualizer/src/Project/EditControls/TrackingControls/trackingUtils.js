/** Checks if a division has one daughter. */
export function oneDaughter(division) {
  const { daughters } = division;
  return daughters?.length === 1;
}

/** Checks if a division has a parent that appears after the division. */
export function parentAfterDivision(division, cells) {
  const { parent, t } = division;
  const frames = cells.getFrames(parent);
  const afterDivision = frames.filter((frame) => frame >= t);
  return afterDivision.length > 0;
}

/** Checks if a division has a daughter that before after the division. */
export function daughterBeforeDivision(division, cells) {
  const { daughters, t } = division;
  for (const d of daughters) {
    const frames = cells.getFrames(d);
    const beforeDivision = frames.filter((f) => f < t);
    if (beforeDivision.length > 0) {
      return true;
    }
  }
  return false;
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
