import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { forgeService } from '../services/forge';
import { useAuth } from '../contexts/AuthContext';
import type { ForgeProgress, NFT } from '@trivia-nft/shared';
import { ForgeType } from '@trivia-nft/shared';
import { NFTCard } from './NFTCard';
import { useResponsive } from '../hooks/useResponsive';

interface ForgeInterfaceProps {
  onComplete?: () => void;
}

export const ForgeInterface: React.FC<ForgeInterfaceProps> = ({ onComplete }) => {
  const { wallet } = useAuth();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [progress, setProgress] = useState<ForgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForgeType, setSelectedForgeType] = useState<ForgeType | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedNFTs, setSelectedNFTs] = useState<string[]>([]);
  const [forging, setForging] = useState(false);
  const [forgeSuccess, setForgeSuccess] = useState(false);

  useEffect(() => {
    fetchForgeProgress();
  }, []);

  const fetchForgeProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await forgeService.getForgeProgress();
      setProgress(response.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forge progress');
    } finally {
      setLoading(false);
    }
  };

  const handleForgeTypeSelect = (type: ForgeType, forgeProgress: ForgeProgress) => {
    if (!forgeProgress.canForge) return;
    
    setSelectedForgeType(type);
    setSelectedCategoryId(forgeProgress.categoryId || null);
    // Auto-select the first 'required' NFTs (usually 10)
    setSelectedNFTs(forgeProgress.nfts.slice(0, forgeProgress.required).map(nft => nft.assetFingerprint));
  };

  const handleNFTToggle = (fingerprint: string, forgeProgress: ForgeProgress) => {
    setSelectedNFTs(prev => {
      const isSelected = prev.includes(fingerprint);
      
      if (isSelected) {
        // Deselect: remove from array
        return prev.filter(f => f !== fingerprint);
      } else {
        // Select: add to array if under limit
        if (prev.length < forgeProgress.required) {
          return [...prev, fingerprint];
        }
        // At max capacity: don't add (user must deselect one first)
        return prev;
      }
    });
  };

  const handleInitiateForge = async () => {
    console.log('[Forge] Button clicked!');
    console.log('[Forge] selectedForgeType:', selectedForgeType);
    console.log('[Forge] selectedNFTs:', selectedNFTs);
    
    if (!selectedForgeType) {
      console.error('[Forge] No forge type selected!');
      return;
    }

    const forgeProgress = progress.find(p => 
      p.type === selectedForgeType && 
      (selectedForgeType !== ForgeType.CATEGORY || p.categoryId === selectedCategoryId)
    );
    console.log('[Forge] forgeProgress:', forgeProgress);
    
    if (!forgeProgress || !forgeProgress.canForge) {
      console.error('[Forge] Cannot forge - progress not found or not eligible');
      return;
    }

    try {
      setForging(true);
      setError(null);

      // Step 1: Build unsigned transaction
      console.log('[Forge] Building transaction...');
      const buildResponse = await forgeService.initiateForge({
        type: selectedForgeType,
        categoryId: forgeProgress.categoryId,
        seasonId: forgeProgress.seasonId,
        inputFingerprints: selectedNFTs,
      });

      // Check if we got a transaction to sign
      if (!buildResponse.txCBOR) {
        throw new Error('No transaction returned from server');
      }

      console.log('[Forge] Transaction built, requesting wallet signature...');

      // Step 2: Check wallet is connected
      if (!wallet || !wallet.api) {
        throw new Error('Wallet not connected. Please reconnect your wallet.');
      }

      // Step 3: Ask user to sign the transaction
      const signedTx = await wallet.api.signTx(buildResponse.txCBOR, true);
      console.log('[Forge] Transaction signed by user');

      // Step 4: Submit signed transaction
      console.log('[Forge] Submitting to blockchain...');
      await forgeService.submitSignedForge({
        forgeId: buildResponse.forgeOperation.id,
        signedTxCBOR: signedTx,
      });

      console.log('[Forge] Forge complete!');
      setForgeSuccess(true);
      
      // Refresh progress after a delay
      setTimeout(() => {
        fetchForgeProgress();
        setSelectedForgeType(null);
        setSelectedCategoryId(null);
        setSelectedNFTs([]);
        setForgeSuccess(false);
        onComplete?.();
      }, 3000);
    } catch (err) {
      console.error('[Forge] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate forge');
    } finally {
      setForging(false);
    }
  };

  const getCategoryName = (categoryId?: string): string => {
    const categoryNames: Record<string, string> = {
      'history': 'History',
      'science': 'Science',
      'geography': 'Geography',
      'arts': 'Arts & Literature',
      'sports': 'Sports',
      'entertainment': 'Entertainment',
      'technology': 'Technology',
      'nature': 'Nature',
      'mythology': 'Mythology',
      'weird-wonderful': 'Weird & Wonderful',
      'general': 'General Knowledge',
    };
    return categoryId ? categoryNames[categoryId] || categoryId : 'Unknown';
  };

  // Convert PlayerNFT to NFT for display
  const convertToNFT = (playerNFT: any): NFT => {
    // Parse metadata if it's a string
    let metadata = playerNFT.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        console.error('Failed to parse NFT metadata:', e);
        metadata = { name: 'NFT', image: '', attributes: [] };
      }
    }

    return {
      ...playerNFT,
      metadata,
      mintedAt: new Date(playerNFT.mintedAt),
    };
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" color="#6d4ee3" />
        <Text className="text-gray-400 mt-4">Loading forge progress...</Text>
      </View>
    );
  }

  if (error && !forging) {
    return (
      <View className="bg-gray-800 rounded-lg p-6">
        <Text className="text-red-500 text-center mb-4">{error}</Text>
        <Pressable
          onPress={fetchForgeProgress}
          className="bg-primary px-6 py-3 rounded-lg"
          style={{ backgroundColor: '#6d4ee3' }}
        >
          <Text className="text-white font-semibold text-center">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (forgeSuccess) {
    return (
      <View className="bg-gray-800 rounded-lg p-6">
        <View className="items-center">
          <Text className="text-6xl mb-4">⚒️</Text>
          <Text className="text-white text-2xl font-bold mb-2">Forge Initiated!</Text>
          <Text className="text-gray-400 text-center">
            Your Ultimate NFT is being forged. This may take a few minutes.
          </Text>
        </View>
      </View>
    );
  }

  if (selectedForgeType) {
    const forgeProgress = progress.find(p => 
      p.type === selectedForgeType && 
      (selectedForgeType !== ForgeType.CATEGORY || p.categoryId === selectedCategoryId)
    );
    if (!forgeProgress) return null;

    const cardPadding = isMobile ? 'p-4' : 'p-6';
    const nftGridCols = isMobile ? 'w-1/3' : isTablet ? 'w-1/4' : 'w-1/5';

    return (
      <View className={`bg-gray-800 rounded-lg ${cardPadding}`}>
        <Pressable
          onPress={() => {
            setSelectedForgeType(null);
            setSelectedCategoryId(null);
            setSelectedNFTs([]);
          }}
          className="mb-4 min-h-[44px] items-start justify-center"
        >
          <Text className="text-primary" style={{ color: '#6d4ee3' }}>← Back to Forge Options</Text>
        </Pressable>

        <Text className="text-white text-xl font-bold mb-2">
          {selectedForgeType === ForgeType.CATEGORY && '📦 Category Ultimate'}
          {selectedForgeType === ForgeType.MASTER && '⭐ Master Ultimate'}
          {selectedForgeType === ForgeType.SEASON && '🏆 Seasonal Ultimate'}
        </Text>

        {forgeProgress.categoryId && (
          <Text className="text-gray-400 mb-4">
            Category: {getCategoryName(forgeProgress.categoryId)}
          </Text>
        )}

        {/* Ultimate NFT Preview */}
        <View className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4 mb-6">
          <Text className="text-purple-300 text-sm font-semibold mb-2 text-center">
            ⭐ You Will Receive
          </Text>
          <Text className="text-white text-lg font-bold text-center mb-1">
            {getCategoryName(forgeProgress.categoryId)} Ultimate NFT
          </Text>
          <Text className="text-gray-400 text-xs text-center">
            🎲 Randomly selected from 2 variants
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-400 text-sm mb-2">
            🔥 Select {forgeProgress.required} NFTs to burn:
          </Text>
          <Text className={`text-sm font-semibold ${selectedNFTs.length === forgeProgress.required ? 'text-green-400' : 'text-yellow-400'}`}>
            Selected: {selectedNFTs.length}/{forgeProgress.required}
          </Text>
        </View>

        <ScrollView className="mb-6" style={{ maxHeight: isMobile ? 250 : 300 }}>
          <View className="flex-row flex-wrap -mx-1">
            {forgeProgress.nfts.map((nft) => {
              const isSelected = selectedNFTs.includes(nft.assetFingerprint);
              return (
                <View key={nft.id} className={`${nftGridCols} px-1 mb-2`}>
                  <View style={{
                    opacity: isSelected ? 1 : 0.5,
                    borderWidth: isSelected ? 3 : 0,
                    borderColor: isSelected ? '#22c55e' : 'transparent',
                    borderRadius: 8,
                    position: 'relative',
                  }}>
                    <NFTCard 
                      nft={convertToNFT(nft)} 
                      onPress={() => handleNFTToggle(nft.assetFingerprint, forgeProgress)}
                    />
                    {isSelected && (
                      <View style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: '#22c55e',
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        pointerEvents: 'none',
                      }}>
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {error && (
          <View className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 mb-4">
            <Text className="text-red-400 text-center">{error}</Text>
          </View>
        )}

        <View className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4 mb-4">
          <Text className="text-yellow-400 text-sm">
            ⚠️ Warning: This action is irreversible. Your selected NFTs will be permanently burned.
          </Text>
        </View>

        <Pressable
          onPress={handleInitiateForge}
          disabled={forging || selectedNFTs.length !== forgeProgress.required}
          className="rounded-lg py-4 px-6 min-h-[44px] items-center justify-center"
          style={{ 
            backgroundColor: forging || selectedNFTs.length !== forgeProgress.required ? '#4a5568' : '#6d4ee3',
            opacity: forging || selectedNFTs.length !== forgeProgress.required ? 0.6 : 1,
          }}
        >
          {forging ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="#ffffff" />
              <Text className={`text-white font-bold ml-2 ${isMobile ? 'text-sm' : ''}`}>Forging...</Text>
            </View>
          ) : (
            <Text className={`text-white font-bold text-center ${isMobile ? 'text-sm' : ''}`}>
              {selectedNFTs.length !== forgeProgress.required 
                ? `Select ${forgeProgress.required - selectedNFTs.length} More NFT${forgeProgress.required - selectedNFTs.length !== 1 ? 's' : ''}`
                : 'Forge Ultimate NFT'
              }
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  const containerPadding = isMobile ? 'p-4' : 'p-6';
  
  return (
    <ScrollView className={`bg-gray-800 rounded-lg ${containerPadding}`}>
      <Text className={`text-white ${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-2`}>
        NFT Forging
      </Text>
      <Text className={`text-gray-400 mb-6 ${isMobile ? 'text-sm' : ''}`}>
        Combine multiple NFTs to create powerful Ultimate NFTs
      </Text>

      {/* Category Ultimate Forging */}
      <View className="mb-6">
        <Text className="text-white font-semibold text-lg mb-3">📦 Category Ultimate</Text>
        <Text className="text-gray-400 text-sm mb-4">
          Forge 10 NFTs from the same category into a Category Ultimate NFT
        </Text>

        {progress
          .filter(p => p.type === ForgeType.CATEGORY)
          .map((forgeProgress) => (
            <View
              key={`${forgeProgress.type}-${forgeProgress.categoryId}`}
              className="bg-gray-700/50 rounded-lg p-4 mb-3"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white font-medium">
                  {getCategoryName(forgeProgress.categoryId)}
                </Text>
                <Text className={`font-bold ${forgeProgress.canForge ? 'text-green-400' : 'text-gray-400'}`}>
                  {forgeProgress.current}/{forgeProgress.required}
                </Text>
              </View>

              <View className="bg-gray-600 h-2 rounded-full overflow-hidden mb-3">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((forgeProgress.current / forgeProgress.required) * 100, 100)}%`,
                    backgroundColor: forgeProgress.canForge ? '#22c55e' : '#6d4ee3',
                  }}
                />
              </View>

              {forgeProgress.canForge ? (
                <>
                  <View className={`bg-purple-900/20 border border-purple-700/30 rounded-lg ${isMobile ? 'p-2' : 'p-3'} mb-3`}>
                    <Text className="text-purple-300 text-xs text-center mb-1">
                      ⭐ Ultimate NFT Reward
                    </Text>
                    <Text className={`text-white ${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-center`}>
                      {getCategoryName(forgeProgress.categoryId)} Ultimate
                    </Text>
                    <Text className="text-gray-400 text-xs text-center mt-1">
                      🎲 2 variants available • Randomly assigned
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleForgeTypeSelect(ForgeType.CATEGORY, forgeProgress)}
                    className="rounded-lg py-2 px-4 min-h-[44px] items-center justify-center"
                    style={{ backgroundColor: '#22c55e' }}
                  >
                    <Text className="text-white font-semibold text-center">
                      Forge Now
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} text-center`}>
                  Collect {forgeProgress.required - forgeProgress.current} more NFT{forgeProgress.required - forgeProgress.current !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          ))}

        {progress.filter(p => p.type === ForgeType.CATEGORY).length === 0 && (
          <Text className="text-gray-500 text-sm text-center py-4">
            No category progress yet. Start collecting NFTs!
          </Text>
        )}
      </View>

      {/* Master Ultimate Forging */}
      <View className="mb-6">
        <Text className="text-white font-semibold text-lg mb-3">⭐ Master Ultimate</Text>
        <Text className="text-gray-400 text-sm mb-4">
          Forge NFTs from 10 different categories into a Master Ultimate NFT
        </Text>

        {progress
          .filter(p => p.type === ForgeType.MASTER)
          .map((forgeProgress) => (
            <View
              key={forgeProgress.type}
              className="bg-gray-700/50 rounded-lg p-4"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white font-medium">
                  Unique Categories
                </Text>
                <Text className={`font-bold ${forgeProgress.canForge ? 'text-green-400' : 'text-gray-400'}`}>
                  {forgeProgress.current}/{forgeProgress.required}
                </Text>
              </View>

              <View className="bg-gray-600 h-2 rounded-full overflow-hidden mb-3">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((forgeProgress.current / forgeProgress.required) * 100, 100)}%`,
                    backgroundColor: forgeProgress.canForge ? '#22c55e' : '#6d4ee3',
                  }}
                />
              </View>

              {forgeProgress.canForge ? (
                <Pressable
                  onPress={() => handleForgeTypeSelect(ForgeType.MASTER, forgeProgress)}
                  className="rounded-lg py-2 px-4 min-h-[44px] items-center justify-center"
                  style={{ backgroundColor: '#22c55e' }}
                >
                  <Text className="text-white font-semibold text-center">
                    Forge Now
                  </Text>
                </Pressable>
              ) : (
                <Text className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} text-center`}>
                  Collect NFTs from {forgeProgress.required - forgeProgress.current} more categor{forgeProgress.required - forgeProgress.current !== 1 ? 'ies' : 'y'}
                </Text>
              )}
            </View>
          ))}
      </View>

      {/* Seasonal Ultimate Forging */}
      <View>
        <Text className="text-white font-semibold text-lg mb-3">🏆 Seasonal Ultimate</Text>
        <Text className="text-gray-400 text-sm mb-4">
          Forge 2 NFTs from each active category into a Seasonal Ultimate NFT
        </Text>

        {progress
          .filter(p => p.type === ForgeType.SEASON)
          .map((forgeProgress) => (
            <View
              key={forgeProgress.type}
              className="bg-gray-700/50 rounded-lg p-4"
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-white font-medium">
                  Categories Complete
                </Text>
                <Text className={`font-bold ${forgeProgress.canForge ? 'text-green-400' : 'text-gray-400'}`}>
                  {forgeProgress.current}/{forgeProgress.required}
                </Text>
              </View>

              <View className="bg-gray-600 h-2 rounded-full overflow-hidden mb-3">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((forgeProgress.current / forgeProgress.required) * 100, 100)}%`,
                    backgroundColor: forgeProgress.canForge ? '#22c55e' : '#6d4ee3',
                  }}
                />
              </View>

              {forgeProgress.canForge ? (
                <Pressable
                  onPress={() => handleForgeTypeSelect(ForgeType.SEASON, forgeProgress)}
                  className="rounded-lg py-2 px-4 min-h-[44px] items-center justify-center"
                  style={{ backgroundColor: '#22c55e' }}
                >
                  <Text className="text-white font-semibold text-center">
                    Forge Now
                  </Text>
                </Pressable>
              ) : (
                <Text className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'} text-center`}>
                  Complete {forgeProgress.required - forgeProgress.current} more categor{forgeProgress.required - forgeProgress.current !== 1 ? 'ies' : 'y'} (2 NFTs each)
                </Text>
              )}
            </View>
          ))}

        {progress.filter(p => p.type === ForgeType.SEASON).length === 0 && (
          <View className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
            <Text className="text-yellow-400 text-sm text-center">
              No active season. Seasonal forging will be available during active seasons.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};
