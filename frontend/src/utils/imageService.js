/**
 * Dynamic Destination & Web Photography Service
 * Connects exclusively to live researched web photography endpoints.
 * ZERO static destination dictionaries, ZERO fallback pools.
 */

import api from '../services/api';
import { getContextualEmoji } from './contextualEmoji';

export { getContextualEmoji };

/**
 * Fallback resolver: strictly returns null so UI renders contextual emoji instead.
 */
export function getDestinationFallback(dest = '', seed = null) {
  return null;
}

/**
 * Fetch live dynamic web images for any query from the backend search endpoint.
 * Never falls back to static photo banks.
 */
export async function searchDestinationImages(query, destination = '') {
  try {
    const res = await api.get('/trips/images/search', {
      params: { query, destination, limit: 12 },
    });
    return res.data?.images || [];
  } catch (err) {
    console.warn('Live image search failed:', err);
    return [];
  }
}
