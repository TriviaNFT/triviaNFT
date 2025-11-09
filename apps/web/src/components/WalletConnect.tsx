import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { Button, Card } from './ui';
import { useAuth } from '../contexts';
import { detectWallets } from '../utils/wallet';
import type { WalletInfo } from '../types';

export interface WalletConnectProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ onSuccess, onError }) => {
  const { connectWallet, wallet, isLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (showModal) {
      const wallets = detectWallets();
      setAvailableWallets(wallets);
    }
  }, [showModal]);

  const handleConnect = async (walletName: string) => {
    try {
      setConnecting(true);
      await connectWallet(walletName as any);
      setShowModal(false);
      onSuccess?.();
    } catch (error) {
      console.error('Wallet connection error:', error);
      onError?.(error as Error);
    } finally {
      setConnecting(false);
    }
  };

  if (wallet) {
    return (
      <Card className="p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-text-secondary text-sm">Connected Wallet</Text>
            <Text className="text-text-primary font-semibold mt-1">{wallet.walletName}</Text>
            <Text className="text-text-tertiary text-xs mt-1">
              {wallet.stakeKey.substring(0, 20)}...
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <>
      <Button onPress={() => setShowModal(true)} loading={isLoading}>
        Connect Wallet
      </Button>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/80 justify-center items-center p-4"
          onPress={() => setShowModal(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Card className="w-full max-w-md p-6">
              <Text className="text-2xl font-bold text-text-primary mb-2">Connect Wallet</Text>
              <Text className="text-text-secondary mb-6">
                Choose a wallet to connect to TriviaNFT
              </Text>

              {availableWallets.length === 0 ? (
                <View className="py-8">
                  <Text className="text-text-secondary text-center mb-4">
                    No Cardano wallets detected
                  </Text>
                  <Text className="text-text-tertiary text-sm text-center">
                    Please install a CIP-30 compatible wallet extension (Nami, Eternl, Lace, etc.)
                  </Text>
                </View>
              ) : (
                <ScrollView className="max-h-96">
                  {availableWallets.map((wallet) => (
                    <Pressable
                      key={wallet.name}
                      className="flex-row items-center p-4 bg-background-tertiary rounded-lg mb-3 active:bg-background-secondary"
                      onPress={() => handleConnect(wallet.name)}
                      disabled={connecting}
                    >
                      <Text className="text-3xl mr-4">{wallet.icon}</Text>
                      <View className="flex-1">
                        <Text className="text-text-primary font-semibold text-lg">
                          {wallet.displayName}
                        </Text>
                        <Text className="text-text-tertiary text-sm">
                          API v{wallet.apiVersion}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              <Button
                variant="ghost"
                onPress={() => setShowModal(false)}
                className="mt-4"
                disabled={connecting}
              >
                Cancel
              </Button>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
