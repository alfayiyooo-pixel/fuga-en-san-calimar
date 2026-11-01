import { ROMAN } from './shop.js';

/** Insignia de prestigio (I bronce, II plata, III oro, IV platino, V diamante, VI-X neón). */
export function badgeHtml(rank, big = false) {
  if (!rank) return '';
  const tier = rank <= 5 ? rank : 6;
  return `<span class="badge badge-${tier} ${big ? 'big' : ''}" title="Prestigio ${ROMAN[rank]}">${ROMAN[rank]}</span>`;
}
