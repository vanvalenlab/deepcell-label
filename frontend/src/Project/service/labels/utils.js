/** Combines edited labels with existing labels.
 * @param {Array<Object>} divisions - existing labels with a t property
 * @param {Array<Object>} editedLabels - edited labels with a t property
 * @param {number} t - time to compare against
 * @param {'one' | 'past' | 'future' | 'all'} - mode for which times to use edited labels
 * @returns {Array<Object>} - combined labels
 */
export function combine(current, edited, t, mode) {
  switch (mode) {
    case 'one':
      return [...edited.filter((c) => c.t === t), ...current.filter((c) => c.t !== t)];
    case 'past':
      return [...edited.filter((c) => c.t <= t), ...current.filter((c) => c.t > t)];
    case 'future':
      return [...current.filter((c) => c.t < t), ...edited.filter((c) => c.t >= t)];
    case 'all':
      return edited;
    default:
      return current;
  }
}
