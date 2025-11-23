import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  MintEligibilityList,
  MintingInterface,
  NFTInventory,
} from '../src/components';
import type { NFT } from '@trivia-nft/shared';

type ViewMode = 'eligibilities' | 'minting' | 'inventory';

export default function MintDemoScreen() {
  const params = useLocalSearchParams<{ eligibilityId?: string; autoMint?: string }>();
  const [viewMode, setViewMode] = useState<ViewMode>('eligibilities');
  const [selectedEligibilityId, setSelectedEligibilityId] = useState<string | null>(null);

  // Auto-start minting if eligibilityId is provided in URL
  useEffect(() => {
    if (params.eligibilityId && params.autoMint === 'true') {
      setSelectedEligibilityId(params.eligibilityId);
      setViewMode('minting');
    }
  }, [params.eligibilityId, params.autoMint]);

  const handleMintClick = (eligibilityId: string) => {
    setSelectedEligibilityId(eligibilityId);
    setViewMode('minting');
  };

  const handleMintComplete = (nft: NFT) => {
    console.log('Mint completed:', nft);
    setViewMode('inventory');
  };

  const handleMintCancel = () => {
    setSelectedEligibilityId(null);
    setViewMode('eligibilities');
  };

  const handleConnectWallet = () => {
    console.log('Connect wallet clicked');
    // In a real app, this would trigger the wallet connection flow
    alert('Wallet connection would be triggered here');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Minting & Inventory Demo',
          headerShown: true,
        }}
      />
      <View className="flex-1 bg-gray-50">
        {/* Navigation Tabs */}
        <View className="bg-white border-b border-gray-200">
          <View className="flex-row p-2">
            <Pressable
              onPress={() => setViewMode('eligibilities')}
              className={`flex-1 py-3 rounded-lg mx-1 ${
                viewMode === 'eligibilities' ? 'bg-blue-600' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  viewMode === 'eligibilities' ? 'text-white' : 'text-gray-700'
                }`}
              >
                Eligibilities
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('inventory')}
              className={`flex-1 py-3 rounded-lg mx-1 ${
                viewMode === 'inventory' ? 'bg-blue-600' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-center font-semibold ${
                  viewMode === 'inventory' ? 'text-white' : 'text-gray-700'
                }`}
              >
                My NFTs
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Content */}
        {viewMode === 'eligibilities' && (
          <MintEligibilityList
            onMintClick={handleMintClick}
            onConnectWallet={handleConnectWallet}
          />
        )}

        {viewMode === 'minting' && selectedEligibilityId && (
          <MintingInterface
            eligibilityId={selectedEligibilityId}
            onComplete={handleMintComplete}
            onCancel={handleMintCancel}
          />
        )}

        {viewMode === 'inventory' && <NFTInventory />}

        {/* Demo Info */}
        <View className="bg-yellow-50 border-t border-yellow-200 p-4">
          <Text className="text-yellow-800 text-sm font-medium mb-2">
            📝 Demo Mode
          </Text>
          <Text className="text-yellow-700 text-xs">
            This is a demonstration of the minting and inventory UI components. In production,
            these would connect to the actual API endpoints.
          </Text>
        </View>
      </View>
    </>
  );
}
