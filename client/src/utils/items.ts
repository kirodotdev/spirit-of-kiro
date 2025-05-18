
// Determine CSS class based on item value
export function getRarityClass(value?: number): string {
  if (value === undefined) return 'item-common';
  
  if (value > 1000) return 'item-legendary';
  if (value > 500) return 'item-epic';
  if (value > 250) return 'item-rare';
  if (value > 100) return 'item-uncommon';
  return 'item-common';
}
