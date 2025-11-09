import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
import Constants from 'expo-constants';
import type { MintOperation, NFT } from '@trivia-nft/shared';
import { MintStatus } from '@trivia-nft/shared';
import { mintService } from '../services';

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
  const [mintOperation, setMintOperation] = useState<MintOperation | null>(null);
  const [nft, setNft] = useState<NFT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);

  useEffect(() => {
    initiateMint();
  }, [eligibilityId]);

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

      if (response.mintOperation.status === MintStatus.CONFIRMED && response.nft) {
        onComplete(response.nft);
      }
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

  const renderContent = () => {
    // Initiating
    if (isInitiating || !mintOperation) {
      return (
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-700 mt-4 text-lg">Initiating mint...</Text>
          <Text className="text-gray-500 text-sm mt-2 text-center">
            Preparing your NFT for minting
          </Text>
        </View>
      );
    }

    // Error
    if (error || mintOperation.status === MintStatus.FAILED) {
      return (
        <View className="items-center py-8">
          <View className="bg-red-100 rounded-full w-16 h-16 items-center justify-center mb-4">
            <Text className="text-red-600 text-3xl">✕</Text>
          </View>
          <Text className="text-red-600 text-lg font-semibold mb-2">Minting Failed</Text>
          <Text className="text-gray-600 text-center px-4">
            {error || mintOperation.error || 'An error occurred during minting'}
          </Text>
          <Pressable
            onPress={onCancel}
            className="mt-6 bg-gray-600 active:bg-gray-700 py-3 px-6 rounded-lg"
          >
            <Text className="text-white font-semibold">Close</Text>
          </Pressable>
        </View>
      );
    }

    // Pending
    if (mintOperation.status === MintStatus.PENDING) {
      return (
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-700 mt-4 text-lg font-semibold">Minting in Progress</Text>
          
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
      return (
        <View className="items-center py-8">
          <View className="bg-green-100 rounded-full w-16 h-16 items-center justify-center mb-4">
            <Text className="text-green-600 text-3xl">✓</Text>
          </View>
          <Text className="text-green-600 text-xl font-bold mb-2">Mint Successful!</Text>
          <Text className="text-gray-600 text-center px-4 mb-6">
            Your NFT has been minted to your wallet
          </Text>

          {/* NFT Details */}
          <View className="w-full px-4 mb-6">
            <View className="bg-gray-100 rounded-lg p-4">
              <Text className="text-gray-900 font-semibold text-lg mb-2">
                {nft.metadata.name}
              </Text>
              {nft.metadata.description && (
                <Text className="text-gray-600 text-sm mb-3">
                  {nft.metadata.description}
                </Text>
              )}
              
              {/* Attributes */}
              {nft.metadata.attributes && nft.metadata.attributes.length > 0 && (
                <View className="mt-2">
                  <Text className="text-gray-700 font-medium text-sm mb-2">Attributes:</Text>
                  {nft.metadata.attributes.map((attr, index) => (
                    <View key={index} className="flex-row justify-between py-1">
                      <Text className="text-gray-600 text-sm">{attr.trait_type}</Text>
                      <Text className="text-gray-900 text-sm font-medium">{attr.value}</Text>
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
              className="bg-blue-50 border border-blue-200 rounded-lg py-3 px-4 mb-4"
            >
              <Text className="text-blue-600 text-sm text-center">
                View on Blockchain Explorer →
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => onComplete(nft)}
            className="bg-green-600 active:bg-green-700 py-3 px-8 rounded-lg"
          >
            <Text className="text-white font-semibold text-base">View My NFTs</Text>
          </Pressable>
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
    <View className="flex-1 bg-white">
      <View className="p-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Minting NFT</Text>
        <Text className="text-gray-600">
          Your perfect score is being immortalized on the blockchain
        </Text>
      </View>

      <View className="flex-1 px-4">
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
