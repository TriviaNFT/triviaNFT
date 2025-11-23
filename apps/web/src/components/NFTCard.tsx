import React, { useState } from 'react';
import { View, Text, Pressable, Image, Platform } from 'react-native';
import type { NFT } from '@trivia-nft/shared';
import { useFocusRing } from '../hooks/useFocusRing';
import { OptimizedImage } from './ui/OptimizedImage';

interface NFTCardProps {
  nft: NFT;
  onPress?: (nft: NFT) => void;
}

export const NFTCard: React.FC<NFTCardProps> = ({ nft, onPress }) => {
  const [showVideo, setShowVideo] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { onFocus, onBlur, getFocusRingStyle } = useFocusRing();

  const handlePress = () => {
    if (onPress) {
      onPress(nft);
    }
  };

  const getTierBorderColor = (tier?: string) => {
    if (!tier) return 'border-background-tertiary';
    switch (tier.toLowerCase()) {
      case 'ultimate':
        return 'border-purple-500';
      case 'master':
        return 'border-yellow-500';
      case 'seasonal':
        return 'border-blue-500';
      default:
        return 'border-background-tertiary';
    }
  };

  // Safely extract tier from metadata attributes if available
  const tier = nft.metadata?.attributes?.find(attr => attr.trait_type === 'Tier')?.value as string | undefined;
  
  // Get media URLs from metadata (safely handle missing metadata)
  // Try multiple IPFS gateways for better reliability
  const ipfsHash = nft.metadata?.image?.replace('ipfs://', '');
  const imageUrl = ipfsHash ? `https://ipfs.io/ipfs/${ipfsHash}` : undefined;
  
  const videoHash = (nft.metadata as any)?.video?.replace('ipfs://', '');
  const videoUrl = videoHash ? `https://ipfs.io/ipfs/${videoHash}` : undefined;
  const hasImage = !!imageUrl;
  const hasVideo = !!videoUrl;

  // Debug logging
  if (Platform.OS === 'web' && !hasImage) {
    console.log('NFTCard - No image:', {
      nft: nft.metadata?.name,
      metadata: nft.metadata,
      imageUrl,
    });
  }

  return (
    <Pressable
      onPress={handlePress}
      onFocus={onFocus}
      onBlur={onBlur}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${nft.metadata?.name || 'NFT'}`}
      className={`bg-background-secondary rounded-xl overflow-hidden border-2 ${getTierBorderColor(tier)} active:opacity-80 hover:scale-105 transition-all shadow-lg`}
      style={[{ minWidth: 44, minHeight: 44 }, getFocusRingStyle()]}
    >
      {/* NFT Media - Compact Preview with aspect ratio preserved */}
      <View className="bg-black aspect-square items-center justify-center relative">
        {showVideo && hasVideo ? (
          <video 
            src={videoUrl}
            loop
            muted
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load video:', videoUrl);
              (e.target as HTMLVideoElement).style.display = 'none';
            }}
          />
        ) : hasImage && !imageError ? (
          <OptimizedImage
            source={{ uri: imageUrl }}
            lazy={true}
            aspectRatio={1}
            placeholder={
              <View className="items-center justify-center">
                <Text className="text-white text-xs">Loading...</Text>
              </View>
            }
            fallback={
              <View className="items-center">
                <Text className="text-gray-400 text-4xl mb-2">🎴</Text>
                <Text className="text-gray-500 text-xs">Image Loading...</Text>
              </View>
            }
            resizeMode="contain"
            className="w-full h-full"
          />
        ) : (
          <View className="items-center">
            <Text className="text-gray-400 text-4xl mb-2">🎴</Text>
            <Text className="text-gray-500 text-xs">
              {imageError ? 'Image Loading...' : 'No Media'}
            </Text>
            {imageUrl && (
              <Text className="text-gray-600 text-xs mt-1">IPFS</Text>
            )}
          </View>
        )}

        {/* Tier Badge */}
        {tier && (
          <View className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded">
            <Text className="text-white text-xs font-bold uppercase">
              {tier}
            </Text>
          </View>
        )}

        {/* Media Toggle - Only show if both exist */}
        {hasImage && hasVideo && (
          <View className="absolute bottom-1 right-1 flex-row gap-1">
            <View
              onTouchStart={(e) => {
                e.stopPropagation();
                setShowVideo(false);
              }}
              onClick={(e: any) => {
                e.stopPropagation();
                setShowVideo(false);
              }}
              className={`px-1.5 py-0.5 rounded shadow-lg ${
                !showVideo ? 'bg-neon-cyan' : 'bg-black/60'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <Text className={`text-xs font-semibold ${!showVideo ? 'text-black' : 'text-white'}`}>
                🖼️
              </Text>
            </View>
            <View
              onTouchStart={(e) => {
                e.stopPropagation();
                setShowVideo(true);
              }}
              onClick={(e: any) => {
                e.stopPropagation();
                setShowVideo(true);
              }}
              className={`px-1.5 py-0.5 rounded shadow-lg ${
                showVideo ? 'bg-neon-cyan' : 'bg-black/60'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <Text className={`text-xs font-semibold ${showVideo ? 'text-black' : 'text-white'}`}>
                🎬
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* NFT Details - Compact Preview */}
      <View className="p-2 bg-background-secondary">
        {/* Name */}
        <Text className="text-text-primary font-bold text-xs mb-1" numberOfLines={1}>
          {nft.metadata?.name || 'NFT'}
        </Text>

        {/* Category & Score */}
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-text-secondary text-xs" numberOfLines={1}>
            {nft.metadata?.attributes?.find(a => a.trait_type === 'Category')?.value || 'NFT'}
          </Text>
          <Text className="text-neon-cyan text-xs font-semibold">
            {nft.metadata?.attributes?.find(a => a.trait_type === 'Score')?.value || ''}
          </Text>
        </View>

        {/* Tap hint */}
        <View className="flex-row items-center justify-center pt-1 border-t border-background-tertiary/50">
          <Text className="text-text-tertiary text-xs">
            👆 Details
          </Text>
        </View>
      </View>
    </Pressable>
  );
};
