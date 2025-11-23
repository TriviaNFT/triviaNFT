import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import type { NFT, Category } from '@trivia-nft/shared';
import { NFTCard } from './NFTCard';
import { NFTDetailModal } from './NFTDetailModal';
import { nftService, categoryService } from '../services';

type SortOption = 'mintedAt' | 'category' | 'name';
type FilterOption = 'all' | string; // 'all' or categoryId

export const NFTInventory: React.FC = () => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('mintedAt');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load NFTs and categories in parallel
      const [nftsResponse, categoriesResponse] = await Promise.all([
        nftService.getPlayerNFTs(),
        categoryService.getCategories(),
      ]);

      setNfts(nftsResponse.nfts);

      const categoryMap = new Map<string, Category>();
      categoriesResponse.categories.forEach((cat) => {
        categoryMap.set(cat.id, cat);
      });
      setCategories(categoryMap);
    } catch (err) {
      console.error('Failed to load NFT inventory:', err);
      setError('Failed to load your NFT collection. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredAndSortedNFTs = (): NFT[] => {
    let filtered = nfts;

    // Apply filter
    if (filterBy !== 'all') {
      filtered = nfts.filter((nft) => nft.categoryId === filterBy);
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'mintedAt':
          return new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime();
        case 'category':
          return (a.categoryId || '').localeCompare(b.categoryId || '');
        case 'name':
          return a.metadata.name.localeCompare(b.metadata.name);
        default:
          return 0;
      }
    });

    return sorted;
  };

  const groupByCategory = (nfts: NFT[]): Map<string, NFT[]> => {
    const grouped = new Map<string, NFT[]>();
    
    nfts.forEach((nft) => {
      const categoryId = nft.categoryId || 'uncategorized';
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, []);
      }
      grouped.get(categoryId)!.push(nft);
    });

    return grouped;
  };

  const getCategoryName = (categoryId: string): string => {
    if (categoryId === 'uncategorized') return 'Uncategorized';
    return categories.get(categoryId)?.name || categoryId;
  };

  const uniqueCategories = Array.from(
    new Set(nfts.map((nft) => nft.categoryId).filter(Boolean))
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-600 mt-4">Loading your NFT collection...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-red-600 text-center mb-4">{error}</Text>
        <Pressable
          onPress={loadData}
          className="bg-blue-600 active:bg-blue-700 py-3 px-6 rounded-lg"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (nfts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-6xl mb-4">🎴</Text>
        <Text className="text-gray-700 text-xl font-semibold mb-2">No NFTs Yet</Text>
        <Text className="text-gray-500 text-center">
          Achieve perfect scores to earn mint eligibilities and collect NFTs
        </Text>
      </View>
    );
  }

  const displayNFTs = getFilteredAndSortedNFTs();
  const groupedNFTs = sortBy === 'category' ? groupByCategory(displayNFTs) : null;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white p-6 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900 mb-2">My NFT Collection</Text>
          <Text className="text-gray-600">
            {nfts.length} NFT{nfts.length === 1 ? '' : 's'} collected
          </Text>
        </View>

        {/* Filters and Sort */}
        <View className="bg-white p-4 border-b border-gray-200">
          {/* Filter */}
          <View className="mb-3">
            <Text className="text-sm font-medium text-gray-700 mb-2">Filter by Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Pressable
                onPress={() => setFilterBy('all')}
                className={`mr-2 px-4 py-2 rounded-full ${
                  filterBy === 'all' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    filterBy === 'all' ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  All ({nfts.length})
                </Text>
              </Pressable>
              {uniqueCategories.map((categoryId) => {
                const count = nfts.filter((nft) => nft.categoryId === categoryId).length;
                return (
                  <Pressable
                    key={categoryId}
                    onPress={() => setFilterBy(categoryId!)}
                    className={`mr-2 px-4 py-2 rounded-full ${
                      filterBy === categoryId ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        filterBy === categoryId ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {getCategoryName(categoryId!)} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Sort */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Sort by</Text>
            <View className="flex-row">
              <Pressable
                onPress={() => setSortBy('mintedAt')}
                className={`mr-2 px-4 py-2 rounded-full ${
                  sortBy === 'mintedAt' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    sortBy === 'mintedAt' ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  Recent
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSortBy('category')}
                className={`mr-2 px-4 py-2 rounded-full ${
                  sortBy === 'category' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    sortBy === 'category' ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  Category
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSortBy('name')}
                className={`mr-2 px-4 py-2 rounded-full ${
                  sortBy === 'name' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    sortBy === 'name' ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  Name
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* NFT Grid */}
        <View className="p-4">
          {groupedNFTs ? (
            // Grouped by category
            Array.from(groupedNFTs.entries()).map(([categoryId, categoryNFTs]) => (
              <View key={categoryId} className="mb-6">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  {getCategoryName(categoryId)} ({categoryNFTs.length})
                </Text>
                <View className="flex-row flex-wrap -mx-1">
                  {categoryNFTs.map((nft) => (
                    <View key={nft.id} className="w-1/5 px-1 mb-2">
                      <NFTCard nft={nft} onPress={setSelectedNFT} />
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : (
            // Regular grid
            <View className="flex-row flex-wrap -mx-1">
              {displayNFTs.map((nft) => (
                <View key={nft.id} className="w-1/5 px-1 mb-2">
                  <NFTCard nft={nft} onPress={setSelectedNFT} />
                </View>
              ))}
            </View>
          )}

          {displayNFTs.length === 0 && (
            <View className="items-center py-8">
              <Text className="text-gray-500">No NFTs match the selected filter</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <NFTDetailModal
        nft={selectedNFT}
        visible={!!selectedNFT}
        onClose={() => setSelectedNFT(null)}
      />
    </View>
  );
};
