/** @param {string} label */
export function glossaryName(label) {
  return label.replace(/\\[()\[\]]/g, '').split('（')[0].replace(/\s+/g, ' ').trim();
}
