import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { Button, Card } from './ui';
import { useAuth } from '../contexts';
import { detectWallets } from '../utils/wallet';
import { useResponsive, useStatePreservation } from '../hooks';
import type { WalletInfo } from '../types';

export interface WalletConnectProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  visible?: boolean;
  onClose?: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ 
  onSuccess, 
  onError,
  visible: externalVisible,
  onClose 
}) => {
  const { connectWallet, wallet, isLoading } = useAuth();
  const { isMobile, width, height } = useResponsive();
  useStatePreservation(false); // Modal manages its own state
  const [internalShowModal, setInternalShowModal] = useState(false);
  
  // Use external visible prop if provided, otherwise use internal state
  const showModal = externalVisible !== undefined ? externalVisible : internalShowModal;
  const setShowModal = (value: boolean) => {
    if (externalVisible !== undefined) {
      // If controlled externally, call onClose
      if (!value && onClose) {
        onClose();
      }
    } else {
      // If not controlled, use internal state
      setInternalShowModal(value);
    }
  };
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
      console.log(`[WalletConnect] Attempting to connect to ${walletName}...`);
      await connectWallet(walletName as any);
      console.log(`[WalletConnect] Successfully connected to ${walletName}`);
      setShowModal(false);
      onSuccess?.();
    } catch (error) {
      console.error('[WalletConnect] Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to connect wallet: ${errorMessage}`);
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
          className="flex-1 bg-black/80 justify-center items-center"
          style={{ padding: isMobile ? 16 : 24 }}
          onPress={() => setShowModal(false)}
          accessibilityLabel="Close wallet selection modal"
        >
          <View 
            onStartShouldSetResponder={() => true}
            onResponderRelease={(e) => e.stopPropagation()}
          >
            <Card 
              className="w-full"
              style={{
                maxWidth: isMobile ? width - 32 : 480,
                maxHeight: height - (isMobile ? 80 : 120),
                padding: isMobile ? 16 : 24,
              }}
            >
              <Text 
                className="font-bold text-text-primary mb-2"
                style={{ fontSize: isMobile ? 20 : 24 }}
              >
                Connect Wallet
              </Text>
              <Text 
                className="text-text-secondary"
                style={{ 
                  marginBottom: isMobile ? 16 : 24,
                  fontSize: isMobile ? 14 : 16,
                }}
              >
                Choose a wallet to connect to TriviaNFT
              </Text>

              {availableWallets.length === 0 ? (
                <View style={{ paddingVertical: isMobile ? 24 : 32 }}>
                  <Text 
                    className="text-text-secondary text-center mb-4"
                    style={{ fontSize: isMobile ? 14 : 16 }}
                  >
                    No Cardano wallets detected
                  </Text>
                  <Text 
                    className="text-text-tertiary text-center"
                    style={{ fontSize: isMobile ? 12 : 14 }}
                  >
                    Please install a CIP-30 compatible wallet extension (Nami, Eternl, Lace, etc.)
                  </Text>
                </View>
              ) : (
                <ScrollView 
                  style={{ 
                    maxHeight: height - (isMobile ? 280 : 320),
                  }}
                >
                  {availableWallets.map((wallet) => (
                    <Pressable
                      key={wallet.name}
                      className="flex-row items-center bg-background-tertiary rounded-lg mb-3 active:bg-background-secondary"
                      accessibilityRole="button"
                      accessibilityLabel={`Connect ${wallet.name} wallet`}
                      style={{
                        padding: isMobile ? 12 : 16,
                        minHeight: 44, // Touch target minimum
                      }}
                      onPress={() => handleConnect(wallet.name)}
                      disabled={connecting}
                    >
                      <Text style={{ fontSize: isMobile ? 28 : 32, marginRight: isMobile ? 12 : 16 }}>
                        {wallet.icon}
                      </Text>
                      <View className="flex-1">
                        <Text 
                          className="text-text-primary font-semibold"
                          style={{ fontSize: isMobile ? 16 : 18 }}
                        >
                          {wallet.displayName}
                        </Text>
                        <Text 
                          className="text-text-tertiary"
                          style={{ fontSize: isMobile ? 12 : 14 }}
                        >
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
                style={{ minHeight: 44 }} // Touch target minimum
                disabled={connecting}
              >
                Cancel
              </Button>
            </Card>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};
