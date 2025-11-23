import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import Constants from 'expo-constants';
import type { MintOperation, NFT } from '@trivia-nft/shared';
import { MintStatus } from '@trivia-nft/shared';
import { mintService } from '../services';
import { useResponsive } from '../hooks/useResponsive';

interface MintingInterfaceProps {
  eligibilityId: string;
  onComplete: (nft: NFT) => void;
  onCancel: () => void;
}

const CARDANO_EXPLORER_URL = Constants.expoConfig?.extra?.cardanoExplorerUrl || 'https://cardanoscan.io';
const POLL_INTERVAL = 3000; // 3 seconds

export const MintingInterface: React.FC<MintingInterfaceProps> = ({
  eligibilityId,
  onComplete,
  onCancel,
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [mintOperation, setMintOperation] = useState<MintOperation | null>(null);
  const [nft, setNft] = useState<NFT | null>(null);
  const [previewNft, setPreviewNft] = useState<NFT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showVideo, setShowVideo] = useState(true); // Default to video

  // Estimated ADA cost (in production, this would come from the backend)
  const MINT_COST_ADA = 2.5;

  useEffect(() => {
    loadNftPreview();
  }, [eligibilityId]);

  const loadNftPreview = async () => {
    try {
      setIsInitiating(true);
      
      // Fetch NFT preview from backend
      const previewResponse = await mintService.getNFTPreview(eligibilityId);
      const { preview } = previewResponse;

      // Create preview NFT object
      const previewNftObj: NFT = {
        id: `preview_${eligibilityId}`,
        policyId: 'preview_policy',
        assetName: preview.name.replace(/\s+/g, '_'),
        metadata: {
          name: preview.name,
          description: preview.description,
          image: preview.image,
          video: preview.video,
          visualDescription: preview.visualDescription,
          attributes: [
            { trait_type: 'Category', value: preview.categoryName },
            { trait_type: 'Score', value: '10/10' },
            { trait_type: 'Rarity', value: 'Perfect' },
          ],
        },
        mintedAt: new Date().toISOString(),
      };
      setPreviewNft(previewNftObj);
      setShowConfirmation(true);
    } catch (err) {
      console.error('Failed to load NFT preview:', err);
      if (err instanceof Error && err.message.includes('expired')) {
        setError('This mint eligibility has expired. You had 10 minutes to claim it.');
      } else if (err instanceof Error && err.message.includes('already used')) {
        setError('This mint eligibility has already been used.');
      } else if (err instanceof Error && err.message.includes('not found')) {
        setError('This mint eligibility is no longer available.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load NFT preview. Please try again.');
      }
    } finally {
      setIsInitiating(false);
    }
  };

  useEffect(() => {
    if (mintOperation && mintOperation.status === MintStatus.PENDING) {
      const interval = setInterval(() => {
        pollMintStatus();
      }, POLL_INTERVAL);

      return () => clearInterval(interval);
    }
  }, [mintOperation]);

  const initiateMint = async () => {
    try {
      setIsInitiating(true);
      setError(null);

      const response = await mintService.initiateMint(eligibilityId);
      setMintOperation(response.mintOperation);
    } catch (err) {
      console.error('Failed to initiate mint:', err);
      setError(err instanceof Error ? err.message : 'Failed to start minting process');
    } finally {
      setIsInitiating(false);
    }
  };

  const pollMintStatus = async () => {
    if (!mintOperation) return;

    try {
      const response = await mintService.getMintStatus(mintOperation.id);
      setMintOperation(response.mintOperation);

      if (response.nft) {
        setNft(response.nft);
      }

      // Don't call onComplete here - let the success screen render first
      // The user will click a button on the success screen which will call onComplete
    } catch (err) {
      console.error('Failed to poll mint status:', err);
      // Don't set error here, keep polling
    }
  };

  const openExplorer = () => {
    if (mintOperation?.txHash) {
      Linking.openURL(`${CARDANO_EXPLORER_URL}/transaction/${mintOperation.txHash}`);
    }
  };

  const handleConfirmMint = async () => {
    try {
      setShowConfirmation(false);
      setIsInitiating(true);
      setError(null);

      const response = await mintService.initiateMint(eligibilityId);
      setMintOperation(response.mintOperation);
    } catch (err) {
      console.error('Failed to initiate mint:', err);
      setError(err instanceof Error ? err.message : 'Failed to start minting process');
      setShowConfirmation(true);
    } finally {
      setIsInitiating(false);
    }
  };

  const renderContent = () => {
    // Show error if eligibility not found or other errors before minting starts
    if (error && !mintOperation) {
      return (
        <View className={`items-center ${isMobile ? 'py-6 px-4' : 'py-8 px-6'} ${isDesktop ? 'max-w-2xl mx-auto' : ''}`}>
          <View className={`bg-red-100 rounded-full ${isMobile ? 'w-12 h-12' : 'w-16 h-16'} items-center justify-center mb-4`}>
            <Text className={`text-red-600 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>⚠️</Text>
          </View>
          <Text className={`text-red-600 ${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-2 text-center`}>Unable to Load NFT</Text>
          <Text className={`text-gray-600 text-center ${isMobile ? 'px-2 text-sm' : 'px-4'} mb-6`}>
            {error}
          </Text>
          <Pressable
            onPress={onCancel}
            className="bg-blue-600 active:bg-blue-700 py-3 px-8 rounded-lg min-h-[44px] items-center justify-center"
          >
            <Text className="text-white font-semibold">Back to Eligibilities</Text>
          </Pressable>
        </View>
      );
    }

    // Show confirmation dialog
    if (showConfirmation && previewNft && !mintOperation) {
      const imageUrl = previewNft.metadata.image?.replace('ipfs://', 'https://ipfs.blockfrost.dev/ipfs/');
      const videoUrl = (previewNft.metadata as any).video?.replace('ipfs://', 'https://ipfs.blockfrost.dev/ipfs/');
      const hasImage = !!imageUrl;
      const hasVideo = !!videoUrl;
      
      // Responsive padding and spacing
      const containerPadding = isMobile ? 'px-4' : isTablet ? 'px-6' : 'px-8';
      const cardPadding = isMobile ? 'p-4' : 'p-6';
      const mediaHeight = isMobile ? 'h-64' : isTablet ? 'h-80' : 'h-96';
      
      return (
        <View className={`flex-1 items-center ${isMobile ? 'py-4' : 'py-8'} bg-background`}>
          {/* NFT Preview */}
          <View className={`w-full ${containerPadding} mb-6 ${isDesktop ? 'max-w-2xl' : ''}`}>
            <View className={`bg-background-secondary rounded-xl ${cardPadding} border-2 border-background-tertiary`}>
              {/* NFT Media with Toggle */}
              <View className="mb-4 relative">
                {/* Media Display */}
                <View className="bg-black rounded-lg overflow-hidden">
                  {showVideo && hasVideo ? (
                    <video 
                      src={videoUrl}
                      loop
                      muted
                      autoPlay
                      playsInline
                      className={`w-full ${mediaHeight} object-contain`}
                      onError={(e) => {
                        console.error('Failed to load video:', videoUrl);
                        (e.target as HTMLVideoElement).style.display = 'none';
                      }}
                    />
                  ) : hasImage ? (
                    <img 
                      src={imageUrl} 
                      alt={previewNft.metadata.name}
                      className={`w-full ${mediaHeight} object-contain`}
                      onError={(e) => {
                        console.error('Failed to load image:', imageUrl);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                </View>

                {/* Toggle Buttons - Only show if both exist - Touch-friendly sizing */}
                {hasImage && hasVideo && (
                  <View className={`absolute ${isMobile ? 'bottom-2 right-2' : 'bottom-3 right-3'} flex-row gap-2`}>
                    <Pressable
                      onPress={() => setShowVideo(false)}
                      className={`${isMobile ? 'px-3 py-2 min-h-[44px] min-w-[44px]' : 'px-4 py-2'} rounded-lg shadow-lg items-center justify-center ${
                        !showVideo ? 'bg-blue-600' : 'bg-black/60'
                      }`}
                    >
                      <Text className={`text-white ${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>🖼️ {!isMobile && 'Image'}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowVideo(true)}
                      className={`${isMobile ? 'px-3 py-2 min-h-[44px] min-w-[44px]' : 'px-4 py-2'} rounded-lg shadow-lg items-center justify-center ${
                        showVideo ? 'bg-blue-600' : 'bg-black/60'
                      }`}
                    >
                      <Text className={`text-white ${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>🎬 {!isMobile && 'Video'}</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* NFT Details */}
              <Text className="text-text-primary font-bold text-xl mb-2">
                {previewNft.metadata.name}
              </Text>
              <Text className="text-text-secondary text-sm mb-2">
                {previewNft.metadata.description}
              </Text>

              {/* Visual Description */}
              {(previewNft.metadata as any).visualDescription && (
                <View className="bg-neon-violet/10 border border-neon-violet/30 rounded-lg p-3 mb-4">
                  <Text className="text-neon-violet-glow font-semibold text-xs mb-1">🎨 Visual Description</Text>
                  <Text className="text-text-high text-sm italic">
                    {(previewNft.metadata as any).visualDescription}
                  </Text>
                </View>
              )}

              {/* Attributes */}
              <View className="bg-background-tertiary rounded-lg p-3 mb-4">
                <Text className="text-text-primary font-semibold text-sm mb-2">NFT Attributes:</Text>
                {previewNft.metadata.attributes?.map((attr, index) => (
                  <View key={index} className="flex-row justify-between py-1.5 border-b border-background">
                    <Text className="text-text-secondary text-sm">{attr.trait_type}</Text>
                    <Text className="text-text-primary font-medium text-sm">{attr.value}</Text>
                  </View>
                ))}
              </View>

              {/* Price */}
              <View className="bg-primary/20 rounded-lg p-4 mb-4">
                <Text className="text-text-secondary text-sm mb-1">Minting Cost</Text>
                <View className="flex-row items-baseline gap-2">
                  <Text className="text-2xl font-bold text-neon-cyan">{MINT_COST_ADA}</Text>
                  <Text className="text-lg font-semibold text-neon-cyan">ADA</Text>
                </View>
                <Text className="text-text-secondary text-xs mt-2">
                  This will be deducted from your wallet
                </Text>
              </View>
            </View>
          </View>

          {/* Confirmation Buttons - Touch-friendly sizing */}
          <View className={`w-full ${containerPadding} gap-3 ${isDesktop ? 'max-w-2xl' : ''}`}>
            <Pressable
              onPress={handleConfirmMint}
              className="bg-green-600 active:bg-green-700 py-4 px-6 rounded-lg min-h-[44px] items-center justify-center"
            >
              <Text className={`text-white font-bold text-center ${isMobile ? 'text-base' : 'text-lg'}`}>
                ✓ Confirm & Mint NFT
              </Text>
            </Pressable>

            <Pressable
              onPress={onCancel}
              className="bg-background-tertiary active:bg-background-secondary py-4 px-6 rounded-lg min-h-[44px] items-center justify-center"
            >
              <Text className={`text-text-primary font-semibold text-center ${isMobile ? 'text-base' : 'text-lg'}`}>
                ✕ Cancel
              </Text>
            </Pressable>
          </View>

          <Text className="text-text-tertiary text-xs mt-4 text-center px-4">
            By confirming, you authorize the minting transaction on the Cardano blockchain
          </Text>
        </View>
      );
    }

    // Initiating
    if (isInitiating || !mintOperation) {
      return (
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-text-primary mt-4 text-lg">Initiating mint...</Text>
          <Text className="text-text-secondary text-sm mt-2 text-center">
            Preparing your NFT for minting
          </Text>
        </View>
      );
    }

    // Error
    if (error || mintOperation.status === MintStatus.FAILED) {
      return (
        <View className="items-center py-8">
          <View className="bg-red-900/20 rounded-full w-16 h-16 items-center justify-center mb-4">
            <Text className="text-red-500 text-3xl">✕</Text>
          </View>
          <Text className="text-red-500 text-lg font-semibold mb-2">Minting Failed</Text>
          <Text className="text-text-secondary text-center px-4">
            {error || mintOperation.error || 'An error occurred during minting'}
          </Text>
          <Pressable
            onPress={onCancel}
            className="mt-6 bg-background-tertiary active:bg-background-secondary py-3 px-6 rounded-lg"
          >
            <Text className="text-text-primary font-semibold">Close</Text>
          </Pressable>
        </View>
      );
    }

    // Pending
    if (mintOperation.status === MintStatus.PENDING) {
      return (
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-text-primary mt-4 text-lg font-semibold">Minting in Progress</Text>
          
          <View className="mt-6 w-full px-4">
            <MintStep
              label="Uploading to IPFS"
              status="completed"
            />
            <MintStep
              label="Building transaction"
              status="completed"
            />
            <MintStep
              label="Submitting to blockchain"
              status={mintOperation.txHash ? 'completed' : 'in-progress'}
            />
            <MintStep
              label="Waiting for confirmation"
              status={mintOperation.txHash ? 'in-progress' : 'pending'}
            />
          </View>

          {mintOperation.txHash && (
            <View className="mt-6 w-full px-4">
              <Text className="text-gray-600 text-sm mb-2">Transaction Hash:</Text>
              <Pressable
                onPress={openExplorer}
                className="bg-blue-50 border border-blue-200 rounded-lg p-3"
              >
                <Text className="text-blue-600 text-xs font-mono" numberOfLines={1}>
                  {mintOperation.txHash}
                </Text>
                <Text className="text-blue-500 text-xs mt-1">
                  Tap to view on explorer →
                </Text>
              </Pressable>
            </View>
          )}

          <Text className="text-gray-500 text-sm mt-6 text-center px-4">
            This may take a few minutes. Please don't close this window.
          </Text>
        </View>
      );
    }

    // Confirmed
    if (mintOperation.status === MintStatus.CONFIRMED && nft) {
      const successPadding = isMobile ? 'px-4' : isTablet ? 'px-6' : 'px-8';
      const successCardPadding = isMobile ? 'p-4' : 'p-6';
      
      return (
        <View className={`items-center ${isMobile ? 'py-6' : 'py-8'} ${successPadding} ${isDesktop ? 'max-w-2xl mx-auto' : ''}`}>
          {/* Big Success Animation */}
          <View className={`bg-green-500 rounded-full ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} items-center justify-center mb-6 shadow-lg`}>
            <Text className={`text-white ${isMobile ? 'text-3xl' : 'text-5xl'}`}>✓</Text>
          </View>
          
          {/* Success Message */}
          <Text className={`text-green-500 ${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-3 text-center`}>
            🎉 Mint Successful!
          </Text>
          <Text className={`text-text-primary ${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-2 text-center`}>
            {nft.metadata.name}
          </Text>
          <Text className={`text-text-secondary text-center ${isMobile ? 'px-2 text-sm' : 'px-4 text-base'} mb-8`}>
            Your NFT has been successfully minted to your wallet on the Cardano blockchain!
          </Text>

          {/* NFT Preview Card */}
          <View className="w-full mb-6">
            <View className={`bg-background-secondary rounded-xl ${successCardPadding} border-2 border-green-500/30 shadow-xl`}>
              {/* NFT Image/Video */}
              {nft.metadata.image && (
                <View className="bg-black rounded-lg overflow-hidden mb-4">
                  <img 
                    src={nft.metadata.image.replace('ipfs://', 'https://ipfs.blockfrost.dev/ipfs/')}
                    alt={nft.metadata.name}
                    className={`w-full ${isMobile ? 'h-48' : isTablet ? 'h-56' : 'h-64'} object-contain`}
                  />
                </View>
              )}
              
              {nft.metadata.description && (
                <Text className="text-text-secondary text-sm mb-4 text-center italic">
                  {nft.metadata.description}
                </Text>
              )}
              
              {/* Attributes */}
              {nft.metadata.attributes && nft.metadata.attributes.length > 0 && (
                <View className="bg-background-tertiary rounded-lg p-4">
                  <Text className="text-text-primary font-semibold text-sm mb-3 text-center">
                    NFT Attributes
                  </Text>
                  {nft.metadata.attributes.map((attr, index) => (
                    <View key={index} className="flex-row justify-between py-2 border-b border-background">
                      <Text className="text-text-secondary text-sm">{attr.trait_type}</Text>
                      <Text className="text-text-primary text-sm font-bold">{attr.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Transaction Link */}
          {mintOperation.txHash && (
            <Pressable
              onPress={openExplorer}
              className="bg-blue-600 active:bg-blue-700 rounded-lg py-3 px-6 mb-4 w-full"
            >
              <Text className="text-white text-sm text-center font-semibold">
                🔗 View on Blockchain Explorer
              </Text>
            </Pressable>
          )}

          {/* Action Buttons - Touch-friendly */}
          <View className="w-full gap-3">
            <Pressable
              onPress={() => {
                onComplete(nft);
                // Close the minting interface after user acknowledges success
                onCancel();
              }}
              className="bg-green-600 active:bg-green-700 py-4 px-8 rounded-lg shadow-lg min-h-[44px] items-center justify-center"
            >
              <Text className={`text-white font-bold text-center ${isMobile ? 'text-base' : 'text-lg'}`}>
                ✓ View My NFT Collection
              </Text>
            </Pressable>
            
            <Pressable
              onPress={onCancel}
              className="bg-background-tertiary active:bg-background-secondary py-3 px-6 rounded-lg min-h-[44px] items-center justify-center"
            >
              <Text className="text-text-primary font-semibold text-center">
                Back to Lobby
              </Text>
            </Pressable>
          </View>

          <Text className="text-text-tertiary text-xs mt-6 text-center px-4">
            Your NFT is now permanently stored on the Cardano blockchain and visible in your wallet
          </Text>
        </View>
      );
    }

    // Default fallback
    return (
      <View className="items-center py-8">
        <Text className="text-gray-600">Loading...</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <View className="p-6 bg-background">
        <Text className="text-2xl font-bold text-text-primary mb-2">Minting NFT</Text>
        <Text className="text-text-secondary">
          Your perfect score is being immortalized on the blockchain
        </Text>
      </View>

      <View className="flex-1 px-4 bg-background">
        {renderContent()}
      </View>
    </View>
  );
};

interface MintStepProps {
  label: string;
  status: 'pending' | 'in-progress' | 'completed';
}

const MintStep: React.FC<MintStepProps> = ({ label, status }) => {
  return (
    <View className="flex-row items-center mb-4">
      <View
        className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
          status === 'completed'
            ? 'bg-green-500'
            : status === 'in-progress'
              ? 'bg-blue-500'
              : 'bg-gray-300'
        }`}
      >
        {status === 'completed' ? (
          <Text className="text-white font-bold">✓</Text>
        ) : status === 'in-progress' ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <View className="w-3 h-3 rounded-full bg-white" />
        )}
      </View>
      <Text
        className={`text-base ${
          status === 'pending' ? 'text-gray-400' : 'text-gray-700'
        }`}
      >
        {label}
      </Text>
    </View>
  );
};
