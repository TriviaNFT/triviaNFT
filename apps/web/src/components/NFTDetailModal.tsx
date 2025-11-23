import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Image, ScrollView, Modal } from 'react-native';
import type { NFT } from '@trivia-nft/shared';
import { useResponsive } from '../hooks/useResponsive';
import { useStatePreservation } from '../hooks/useStatePreservation';

interface NFTDetailModalProps {
  nft: NFT | null;
  visible: boolean;
  onClose: () => void;
}

export const NFTDetailModal: React.FC<NFTDetailModalProps> = ({ nft, visible, onClose }) => {
  const { isMobile, isTablet } = useResponsive();
  useStatePreservation(false); // Modal manages its own scroll
  const [showVideo, setShowVideo] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef<number>(0);

  // Preserve scroll position within modal during resize
  useEffect(() => {
    if (!visible) {
      scrollPositionRef.current = 0;
    }
  }, [visible]);

  if (!nft) return null;

  const getTierColor = (tier?: string) => {
    if (!tier) return '#6b7280';
    switch (tier.toLowerCase()) {
      case 'ultimate':
        return '#a855f7';
      case 'master':
        return '#eab308';
      case 'seasonal':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };
  const videoUrl = (nft.metadata as any).video?.replace('ipfs://', 'https://ipfs.blockfrost.dev/ipfs/');
  const imageUrl = nft.metadata.image?.replace('ipfs://', 'https://ipfs.blockfrost.dev/ipfs/');
  const hasVideo = !!videoUrl;
  const hasImage = !!imageUrl;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 items-center justify-center" style={{ padding: isMobile ? 8 : 16 }}>
        <View 
          className="bg-background-primary rounded-2xl w-full border border-background-tertiary shadow-2xl"
          style={{ 
            maxWidth: isMobile ? '100%' : isTablet ? 600 : 700,
            maxHeight: '90vh',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-3 border-b border-background-tertiary">
            <Text className="text-text-primary font-bold text-lg flex-1" numberOfLines={1}>
              {nft.metadata.name}
            </Text>
            <Pressable
              onPress={onClose}
              className="items-center justify-center rounded-full bg-background-tertiary active:opacity-70"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <Text className="text-text-primary text-lg">✕</Text>
            </Pressable>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            className="flex-1"
            onScroll={(e) => {
              scrollPositionRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            {/* NFT Media */}
            <View className="bg-black aspect-square items-center justify-center relative">
              {showVideo && hasVideo ? (
                <video 
                  src={videoUrl}
                  loop
                  muted
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Failed to load video:', videoUrl);
                    (e.target as HTMLVideoElement).style.display = 'none';
                  }}
                />
              ) : hasImage ? (
                <Image
                  source={{ uri: imageUrl }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              ) : (
                <View className="items-center">
                  <Text className="text-gray-400 text-6xl mb-4">🎴</Text>
                  <Text className="text-gray-500">No Media Available</Text>
                </View>
              )}

              {/* Media Toggle */}
              {hasImage && hasVideo && (
                <View className="absolute bottom-2 right-2 flex-row gap-1">
                  <Pressable
                    onPress={() => setShowVideo(false)}
                    className={`px-3 py-1.5 rounded-lg shadow-lg ${
                      !showVideo ? 'bg-neon-cyan' : 'bg-black/60'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${!showVideo ? 'text-black' : 'text-white'}`}>
                      🖼️ Image
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowVideo(true)}
                    className={`px-3 py-1.5 rounded-lg shadow-lg ${
                      showVideo ? 'bg-neon-cyan' : 'bg-black/60'
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${showVideo ? 'text-black' : 'text-white'}`}>
                      🎬 Video
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* NFT Details */}
            <View className="p-4">
              {/* Description */}
              {nft.metadata.description && (
                <View className="mb-4">
                  <Text className="text-text-secondary text-xs font-semibold mb-2">
                    Description
                  </Text>
                  <Text className="text-text-primary text-sm leading-5">
                    {nft.metadata.description}
                  </Text>
                </View>
              )}

              {/* Attributes */}
              {nft.metadata.attributes && nft.metadata.attributes.length > 0 && (
                <View className="mb-4">
                  <Text className="text-text-secondary text-xs font-semibold mb-2">
                    Attributes
                  </Text>
                  <View className="flex-row flex-wrap -mx-1">
                    {nft.metadata.attributes.map((attr, index) => (
                      <View key={index} className="w-1/2 px-1 mb-2">
                        <View className="bg-background-secondary rounded-lg p-2 border border-background-tertiary">
                          <Text className="text-text-tertiary text-xs mb-1">
                            {attr.trait_type}
                          </Text>
                          <Text 
                            className="text-text-primary text-sm font-semibold"
                            style={attr.trait_type === 'Tier' ? { color: getTierColor(attr.value) } : {}}
                          >
                            {attr.value}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Blockchain Info */}
              <View className="bg-background-secondary rounded-lg p-3 border border-background-tertiary">
                <Text className="text-text-secondary text-xs font-semibold mb-2">
                  Blockchain Information
                </Text>
                
                {nft.policyId && (
                  <View className="mb-2">
                    <Text className="text-text-tertiary text-xs mb-1">Policy ID</Text>
                    <Text className="text-text-primary font-mono text-xs break-all">
                      {nft.policyId}
                    </Text>
                  </View>
                )}

                {nft.tokenName && (
                  <View className="mb-2">
                    <Text className="text-text-tertiary text-xs mb-1">Token Name</Text>
                    <Text className="text-text-primary font-mono text-xs break-all">
                      {nft.tokenName}
                    </Text>
                  </View>
                )}

                {nft.mintedAt && (
                  <View>
                    <Text className="text-text-tertiary text-xs mb-1">Minted</Text>
                    <Text className="text-text-primary text-sm">
                      {new Date(nft.mintedAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View className="p-3 border-t border-background-tertiary">
            <Pressable
              onPress={onClose}
              className="bg-neon-violet rounded-lg active:opacity-80"
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text className="text-white text-center font-semibold text-sm">
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
