import { apiRequest } from './api';
import type { Category } from '@trivia-nft/shared';

export interface GetCategoriesResponse {
  categories: Category[];
}

export const categoryService = {
  /**
   * Get all categories with NFT counts and stock availability
   * Sends auth token if available to get owned NFT counts per category
   */
  getCategories: async (): Promise<GetCategoriesResponse> => {
    return apiRequest<GetCategoriesResponse>('/categories', {
      method: 'GET',
      requiresAuth: true, // Send auth token to get owned counts
    });
  },
};
