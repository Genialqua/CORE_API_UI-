export type PageItem = { type: 'page'; page: number } | { type: 'gap'; key: string };

/**
 * Builds a compact page list such as `1 … 5 [6] 7 … 20`.
 * Always includes the first and last pages and `siblings` pages either side of the current page,
 * and keeps the number of items constant so the control doesn't jump in width while paging.
 */
export function buildPageList(current: number, total: number, siblings = 1): PageItem[] {
  if (total <= 0) return [];
  const page = Math.min(Math.max(1, current), total);
  const slots = siblings * 2 + 5;

  if (total <= slots) {
    return Array.from({ length: total }, (_, i) => ({ type: 'page' as const, page: i + 1 }));
  }

  let left = Math.max(2, page - siblings);
  let right = Math.min(total - 1, page + siblings);

  if (left <= 3) {
    left = 2;
    right = Math.max(right, siblings * 2 + 3);
  }
  if (right >= total - 2) {
    right = total - 1;
    left = Math.min(left, total - siblings * 2 - 2);
  }

  const items: PageItem[] = [{ type: 'page', page: 1 }];
  if (left > 2) items.push({ type: 'gap', key: 'left' });
  for (let p = left; p <= right; p++) items.push({ type: 'page', page: p });
  if (right < total - 1) items.push({ type: 'gap', key: 'right' });
  items.push({ type: 'page', page: total });
  return items;
}
