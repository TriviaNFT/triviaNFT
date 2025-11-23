import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { NFT } from '@trivia-nft/shared';
import { NFTCard } from './NFTCard';
import { useResponsive } from '../hooks/useResponsive';

interface NFTGalleryProps {
  nfts: NFT[];
  onNFTPress: (nft: NFT) => void;
}

export const NFTGallery: React.FC<NFTGalleryProps> = ({ nfts, onNFTPress }) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');

  // Get unique categories and tiers
  const categories = useMemo(() => {
    const cats = new Set(nfts.map(nft => nft.categoryId).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [nfts]);

  const tiers = useMemo(() => {
    const tierSet = new Set(nfts.map(nft => nft.tier).filter(Boolean));
    return ['all', ...Array.from(tierSet).sort()];
  }, [nfts]);

  // Filter NFTs
  const filteredNFTs = useMemo(() => {
    return nfts.filter(nft => {
      const categoryMatch = selectedCategory === 'all' || nft.categoryId === selectedCategory;
      const tierMatch = selectedTier === 'all' || nft.tier === selectedTier;
      return categoryMatch && tierMatch;
    });
  }, [nfts, selectedCategory, selectedTier]);

  // Get category display name from NFT metadata
  const getCategoryName = (categoryId: string) => {
    if (categoryId === 'all') return 'All Categories';
    
    // Find an NFT with this category to get the name from metadata
    const nft = nfts.find(n => n.categoryId === categoryId);
    if (nft?.metadata?.attributes) {
      const categoryAttr = nft.metadata.attributes.find(
        (attr: any) => attr.trait_type === 'Category'
      );
      if (categoryAttr?.value) {
        return categoryAttr.value;
      }
    }
    
    // Fallback: try to parse if it's a slug
    if (categoryId.includes('-')) {
      return categoryId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' & ');
    }
    
    // Last resort: just return the ID
    return categoryId.substring(0, 20) + '...';
  };

  // Get tier display name
  const getTierName = (tier: string) => {
    if (tier === 'all') return 'All Tiers';
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  return (
    <View>
      {/* Filters */}
      <View className="mb-4 space-y-3">
        {/* Category Filter */}
        <View>
          <Text className="text-text-secondary text-sm mb-2">Filter by Category:</Text>
          <View className="flex-row flex-wrap">
            {categories.map((category) => (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                className={`mr-2 mb-2 px-4 py-2 rounded-lg ${
                  selectedCategory === category 
                    ? 'bg-primary' 
                    : 'bg-background-tertiary'
                }`}
                style={selectedCategory === category ? { backgroundColor: '#6d4ee3' } : {}}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedCategory === category 
                      ? 'text-white' 
                      : 'text-text-secondary'
                  }`}
                >
                  {getCategoryName(category)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tier Filter */}
        <View>
          <Text className="text-text-secondary text-sm mb-2">Filter by Tier:</Text>
          <View className="flex-row flex-wrap">
            {tiers.map((tier) => (
              <Pressable
                key={tier}
                onPress={() => setSelectedTier(tier)}
                className={`mr-2 mb-2 px-4 py-2 rounded-lg ${
                  selectedTier === tier 
                    ? 'bg-primary' 
                    : 'bg-background-tertiary'
                }`}
                style={selectedTier === tier ? { backgroundColor: '#6d4ee3' } : {}}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedTier === tier 
                      ? 'text-white' 
                      : 'text-text-secondary'
                  }`}
                >
                  {getTierName(tier)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Results count */}
        <Text className="text-text-secondary text-sm">
          Showing {filteredNFTs.length} of {nfts.length} NFTs
        </Text>
      </View>

      {/* NFT Grid - Responsive: Mobile 1-2 cols, Tablet 2-3 cols, Desktop 3-4 cols */}
      {filteredNFTs.length === 0 ? (
        <View className="bg-background-secondary rounded-lg p-8 border border-background-tertiary">
          <Text className="text-text-secondary text-center">
            No NFTs match the selected filters
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap -mx-1">
          {filteredNFTs.map((nft) => {
            // Responsive column width: Mobile 1-2 cols (50%), Tablet 2-3 cols (33%), Desktop 3-4 cols (25%)
            const columnWidth = isMobile ? 'w-1/2' : isTablet ? 'w-1/3' : 'w-1/4';
            return (
              <View key={nft.id} className={`${columnWidth} px-1 mb-2`}>
                <NFTCard 
                  nft={nft}
                  onPress={onNFTPress}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
