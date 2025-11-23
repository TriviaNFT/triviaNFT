import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Eligibility, Category } from '@trivia-nft/shared';
import { useCountdown } from '../hooks/useCountdown';
import { useResponsive } from '../hooks/useResponsive';

interface MintEligibilityCardProps {
  eligibility: Eligibility & {
    preview?: {
      name: string;
      description: string;
      image: string;
      video?: string;
      visualDescription?: string;
    };
  };
  category?: Category;
  onMintClick: (eligibilityId: string) => void;
  isGuest?: boolean;
  onConnectWallet?: () => void;
}

export const MintEligibilityCard: React.FC<MintEligibilityCardProps> = ({
  eligibility,
  category,
  onMintClick,
  isGuest = false,
  onConnectWallet,
}) => {
  const { isMobile, isTablet } = useResponsive();
  const countdown = useCountdown(eligibility.expiresAt);
  const [showVideo, setShowVideo] = React.useState(true); // Default to video

  const handleAction = () => {
    if (isGuest && onConnectWallet) {
      onConnectWallet();
    } else {
      onMintClick(eligibility.id);
    }
  };

  const isExpiringSoon = countdown.timeRemaining < 5 * 60 * 1000; // Less than 5 minutes
  
  // Use preview if available, otherwise fall back to category images
  const hasImage = !!(eligibility.preview?.image || (category as any)?.nftImageIpfs);
  const hasVideo = !!(eligibility.preview?.video || (category as any)?.nftVideoIpfs);
  const imageUrl = eligibility.preview?.image || (category as any)?.nftImageIpfs;
  const videoUrl = eligibility.preview?.video || (category as any)?.nftVideoIpfs;

  const cardPadding = isMobile ? 'p-3' : 'p-4';
  const mediaHeight = isMobile ? 'h-64' : isTablet ? 'h-72' : 'h-80';
  
  return (
    <View className={`bg-background-secondary rounded-lg ${cardPadding} mb-4 border border-background-tertiary`}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-text-primary`}>
            {category?.name || 'Category'} NFT
          </Text>
          <Text className={`${isMobile ? 'text-xs' : 'text-sm'} text-text-secondary mt-1`}>Perfect Score Reward</Text>
        </View>
        
        {/* Countdown Badge */}
        <View
          className={`px-3 py-1 rounded-full ${
            isExpiringSoon ? 'bg-red-900/30' : 'bg-primary/20'
          }`}
          style={isExpiringSoon ? {} : { backgroundColor: 'rgba(109, 78, 227, 0.2)' }}
        >
          <Text
            className={`text-xs font-semibold ${
              isExpiringSoon ? 'text-red-400' : 'text-primary'
            }`}
            style={isExpiringSoon ? {} : { color: '#6d4ee3' }}
          >
            {countdown.isExpired ? 'Expired' : countdown.formatted.display}
          </Text>
        </View>
      </View>

      {/* Visual Description */}
      {eligibility.preview?.visualDescription && (
        <View className="bg-background-tertiary rounded-lg p-3 mb-3 border border-primary/20">
          <View className="flex-row items-center mb-1">
            <Text className="text-xs text-primary font-semibold">🎨 Visual Description</Text>
          </View>
          <Text className="text-text-secondary text-sm italic">
            {eligibility.preview.visualDescription}
          </Text>
        </View>
      )}

      {/* NFT Preview with actual IPFS media */}
      <View className="bg-background-tertiary rounded-lg mb-3 overflow-hidden border border-background-tertiary relative">
        {hasImage || hasVideo ? (
          <View>
            {/* Media Display */}
            <View className="bg-black">
              {showVideo && hasVideo ? (
                <video
                  src={videoUrl.replace('ipfs://', 'https://ipfs.blockfrost.dev/ipfs/')}
                  className={`w-full ${mediaHeight} object-contain`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={(e) => {
                    console.error('Failed to load video:', videoUrl);
                    (e.target as HTMLVideoElement).style.display = 'none';
                  }}
                />
              ) : hasImage ? (
                <img
                  src={imageUrl.replace('ipfs://', 'https://ipfs.blockfrost.dev/ipfs/')}
                  alt={`${eligibility.preview?.name || category?.name} NFT`}
                  className={`w-full ${mediaHeight} object-contain`}
                  onError={(e) => {
                    console.error('Failed to load image:', imageUrl);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
            </View>

            {/* Toggle Button - Only show if both image and video exist - Touch-friendly */}
            {hasImage && hasVideo && (
              <View className="absolute bottom-2 right-2 flex-row gap-2">
                <Pressable
                  onPress={() => setShowVideo(false)}
                  className={`px-3 py-2 rounded-lg min-h-[44px] min-w-[44px] items-center justify-center ${
                    !showVideo ? 'bg-primary' : 'bg-black/50'
                  }`}
                  style={!showVideo ? { backgroundColor: '#6d4ee3' } : {}}
                >
                  <Text className="text-white text-xs font-semibold">🖼️ {!isMobile && 'Image'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowVideo(true)}
                  className={`px-3 py-2 rounded-lg min-h-[44px] min-w-[44px] items-center justify-center ${
                    showVideo ? 'bg-primary' : 'bg-black/50'
                  }`}
                  style={showVideo ? { backgroundColor: '#6d4ee3' } : {}}
                >
                  <Text className="text-white text-xs font-semibold">🎬 {!isMobile && 'Video'}</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View className={`${mediaHeight} items-center justify-center`}>
            <Text className="text-text-secondary text-sm">NFT Preview</Text>
            <Text className="text-text-secondary text-xs mt-1 opacity-70">{category?.name}</Text>
          </View>
        )}
      </View>

      {/* Status Message */}
      {isGuest && (
        <View className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 mb-3">
          <Text className="text-yellow-400 text-sm font-medium">
            Connect your wallet to mint this NFT
          </Text>
        </View>
      )}

      {countdown.isExpired && (
        <View className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-3">
          <Text className="text-red-400 text-sm font-medium">
            This eligibility has expired
          </Text>
        </View>
      )}

      {/* Action Button */}
      <Pressable
        onPress={handleAction}
        disabled={countdown.isExpired}
        className={`py-3 px-4 rounded-lg items-center min-h-[44px] ${
          countdown.isExpired
            ? 'bg-background-tertiary'
            : isGuest
              ? 'bg-yellow-600 active:bg-yellow-700 active:scale-[0.98]'
              : 'active:scale-[0.98]'
        } transition-all duration-150`}
        style={!countdown.isExpired && !isGuest ? { backgroundColor: '#6d4ee3' } : {}}
      >
        <Text className="text-white font-semibold text-base">
          {countdown.isExpired
            ? 'Expired'
            : isGuest
              ? 'Connect Wallet to Mint'
              : 'Mint Now'}
        </Text>
      </Pressable>

      {/* Expiration Warning */}
      {!countdown.isExpired && isExpiringSoon && (
        <Text className="text-red-400 text-xs text-center mt-2">
          ⚠️ Expiring soon! Mint before time runs out
        </Text>
      )}
    </View>
  );
};
