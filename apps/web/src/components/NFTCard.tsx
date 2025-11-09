import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import type { NFT } from '@trivia-nft/shared';

interface NFTCardProps {
  nft: NFT;
  onPress?: (nft: NFT) => void;
}

export const NFTCard: React.FC<NFTCardProps> = ({ nft, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(nft);
    }
  };

  const getTierColor = (tier?: string) => {
    if (!tier) return 'bg-gray-100 text-gray-700';
    switch (tier.toLowerCase()) {
      case 'ultimate':
        return 'bg-purple-100 text-purple-700';
      case 'master':
        return 'bg-yellow-100 text-yellow-700';
      case 'seasonal':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Extract tier from metadata attributes if available
  const tier = nft.metadata.attributes?.find(attr => attr.trait_type === 'Tier')?.value;

  return (
    <Pressable
      onPress={handlePress}
      className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 active:opacity-80"
    >
      {/* NFT Image */}
      <View className="bg-gray-100 aspect-square items-center justify-center">
        {nft.metadata.image ? (
          <Image
            source={{ uri: nft.metadata.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="items-center">
            <Text className="text-gray-400 text-4xl mb-2">🎴</Text>
            <Text className="text-gray-500 text-xs">No Image</Text>
          </View>
        )}
      </View>

      {/* NFT Details */}
      <View className="p-3">
        {/* Name and Tier */}
        <View className="flex-row items-start justify-between mb-2">
          <Text className="text-gray-900 font-semibold text-sm flex-1" numberOfLines={2}>
            {nft.metadata.name}
          </Text>
          {tier && (
            <View className={`ml-2 px-2 py-1 rounded ${getTierColor(tier)}`}>
              <Text className="text-xs font-medium">{tier}</Text>
            </View>
          )}
        </View>

        {/* Category Badge */}
        {nft.categoryId && (
          <View className="bg-blue-50 px-2 py-1 rounded-full self-start mb-2">
            <Text className="text-blue-700 text-xs font-medium">
              {nft.categoryId}
            </Text>
          </View>
        )}

        {/* Key Attributes */}
        {nft.metadata.attributes && nft.metadata.attributes.length > 0 && (
          <View className="mt-2 pt-2 border-t border-gray-100">
            {nft.metadata.attributes.slice(0, 2).map((attr, index) => (
              <View key={index} className="flex-row justify-between mb-1">
                <Text className="text-gray-500 text-xs">{attr.trait_type}</Text>
                <Text className="text-gray-700 text-xs font-medium">{attr.value}</Text>
              </View>
            ))}
            {nft.metadata.attributes.length > 2 && (
              <Text className="text-gray-400 text-xs mt-1">
                +{nft.metadata.attributes.length - 2} more
              </Text>
            )}
          </View>
        )}

        {/* Minted Date */}
        <Text className="text-gray-400 text-xs mt-2">
          Minted {new Date(nft.mintedAt).toLocaleDateString()}
        </Text>
      </View>
    </Pressable>
  );
};
