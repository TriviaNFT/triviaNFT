import { apiRequest } from './api';
import type { Category } from '@trivia-nft/shared';

export interface GetCategoriesResponse {
  categories: Category[];
}

export const categoryService = {
  /**
   * Get all categories with NFT counts and stock availability
   */
  getCategories: async (): Promise<GetCategoriesResponse> => {
    return apiRequest<GetCategoriesResponse>('/categories', {
      method: 'GET',
    });
  },
};
