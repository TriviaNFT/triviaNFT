import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, Image, Linking } from 'react-native';
import Constants from 'expo-constants';
import type { NFT } from '@trivia-nft/shared';

interface NFTDetailModalProps {
  nft: NFT | null;
  visible: boolean;
  onClose: () => void;
}

const CARDANO_EXPLORER_URL = Constants.expoConfig?.extra?.cardanoExplorerUrl || 'https://cardanoscan.io';

export const NFTDetailModal: React.FC<NFTDetailModalProps> = ({ nft, visible, onClose }) => {
  if (!nft) return null;

  const openExplorer = () => {
    if (nft.assetFingerprint) {
      Linking.openURL(`${CARDANO_EXPLORER_URL}/token/${nft.assetFingerprint}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[90%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-xl font-bold text-gray-900">NFT Details</Text>
            <Pressable onPress={onClose} className="p-2">
              <Text className="text-gray-500 text-2xl">×</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1">
            {/* NFT Image */}
            <View className="bg-gray-100 aspect-square items-center justify-center">
              {nft.metadata.image ? (
                <Image
                  source={{ uri: nft.metadata.image }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              ) : (
                <View className="items-center">
                  <Text className="text-gray-400 text-6xl mb-4">🎴</Text>
                  <Text className="text-gray-500">No Image Available</Text>
                </View>
              )}
            </View>

            <View className="p-6">
              {/* Name and Tier */}
              <View className="mb-4">
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                  {nft.metadata.name}
                </Text>
                {nft.metadata.attributes?.find(attr => attr.trait_type === 'Tier') && (
                  <View className="bg-purple-100 px-3 py-1 rounded-full self-start">
                    <Text className="text-purple-700 font-semibold">
                      {nft.metadata.attributes.find(attr => attr.trait_type === 'Tier')?.value}
                    </Text>
                  </View>
                )}
              </View>

              {/* Description */}
              {nft.metadata.description && (
                <View className="mb-4">
                  <Text className="text-gray-700">{nft.metadata.description}</Text>
                </View>
              )}

              {/* Attributes */}
              {nft.metadata.attributes && nft.metadata.attributes.length > 0 && (
                <View className="mb-4">
                  <Text className="text-lg font-semibold text-gray-900 mb-3">Attributes</Text>
                  <View className="bg-gray-50 rounded-lg p-4">
                    {nft.metadata.attributes.map((attr: { trait_type: string; value: string }, index: number) => (
                      <View
                        key={index}
                        className={`flex-row justify-between py-2 ${
                          index < nft.metadata.attributes.length - 1 ? 'border-b border-gray-200' : ''
                        }`}
                      >
                        <Text className="text-gray-600">{attr.trait_type}</Text>
                        <Text className="text-gray-900 font-medium">{attr.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Blockchain Info */}
              <View className="mb-4">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  Blockchain Information
                </Text>
                <View className="bg-gray-50 rounded-lg p-4">
                  <InfoRow label="Policy ID" value={nft.policyId} mono />
                  <InfoRow label="Asset Name" value={nft.tokenName} mono />
                  <InfoRow label="Fingerprint" value={nft.assetFingerprint} mono />
                  <InfoRow label="Source" value={nft.source} />
                  <InfoRow label="Status" value={nft.status} />
                  <InfoRow
                    label="Minted"
                    value={new Date(nft.mintedAt).toLocaleString()}
                  />
                </View>
              </View>

              {/* View on Explorer */}
              <Pressable
                onPress={openExplorer}
                className="bg-blue-600 active:bg-blue-700 py-4 rounded-lg items-center mb-4"
              >
                <Text className="text-white font-semibold text-base">
                  View on Blockchain Explorer
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, mono = false }) => {
  return (
    <View className="mb-3 last:mb-0">
      <Text className="text-gray-500 text-sm mb-1">{label}</Text>
      <Text
        className={`text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
};
