/**
 * isLineInRange returns true if the line number is within the range of the search
 * @param range - the range of lines to search
 * @param range.lowerRange - the lower range of the search
 * @param range.upperRange - the upper range of the search
 * @param index number - the index to check
 * @returns boolean - whether the index is within the range
 */
const isLineInRange = (
  range: { lowerRange: number; upperRange?: number },
  index: number
) => {
  if (range.upperRange) {
    return index >= range.lowerRange && index <= range.upperRange;
  }
  return index >= range.lowerRange;
};

export { isLineInRange };
