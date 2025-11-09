import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Eligibility, Category } from '@trivia-nft/shared';
import { useCountdown } from '../hooks/useCountdown';

interface MintEligibilityCardProps {
  eligibility: Eligibility;
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
  const countdown = useCountdown(eligibility.expiresAt);

  const handleAction = () => {
    if (isGuest && onConnectWallet) {
      onConnectWallet();
    } else {
      onMintClick(eligibility.id);
    }
  };

  const isExpiringSoon = countdown.timeRemaining < 5 * 60 * 1000; // Less than 5 minutes

  return (
    <View className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900">
            {category?.name || 'Category'} NFT
          </Text>
          <Text className="text-sm text-gray-600 mt-1">Perfect Score Reward</Text>
        </View>
        
        {/* Countdown Badge */}
        <View
          className={`px-3 py-1 rounded-full ${
            isExpiringSoon ? 'bg-red-100' : 'bg-blue-100'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              isExpiringSoon ? 'text-red-700' : 'text-blue-700'
            }`}
          >
            {countdown.isExpired ? 'Expired' : countdown.formatted.display}
          </Text>
        </View>
      </View>

      {/* NFT Preview Placeholder */}
      <View className="bg-gray-100 rounded-lg h-48 mb-3 items-center justify-center">
        <Text className="text-gray-500 text-sm">NFT Preview</Text>
        <Text className="text-gray-400 text-xs mt-1">{category?.name}</Text>
      </View>

      {/* Status Message */}
      {isGuest && (
        <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
          <Text className="text-yellow-800 text-sm font-medium">
            Connect your wallet to mint this NFT
          </Text>
        </View>
      )}

      {countdown.isExpired && (
        <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <Text className="text-red-800 text-sm font-medium">
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
            ? 'bg-gray-300'
            : isGuest
              ? 'bg-yellow-500 active:bg-yellow-600 active:scale-[0.98]'
              : 'bg-blue-600 active:bg-blue-700 active:scale-[0.98]'
        } transition-all duration-150`}
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
        <Text className="text-red-600 text-xs text-center mt-2">
          ⚠️ Expiring soon! Mint before time runs out
        </Text>
      )}
    </View>
  );
};
