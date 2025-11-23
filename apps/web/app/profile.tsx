import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PlayerProfile, ProtectedRoute, WalletConnect } from '../src/components';
import { Navigation } from '../src/components/landing/Navigation';
import { useAuth } from '../src/contexts/AuthContext';
import { useStatePreservation } from '../src/hooks';

export default function Profile() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; eligibilityId?: string; autoMint?: string }>();
  const { wallet, isAuthenticated, player, disconnectWallet } = useAuth();
  useStatePreservation(true); // Preserve scroll position on resize
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
  };

  // Show wallet connect prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B1220' }}>
        {/* Navigation */}
        <Navigation
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
          isWalletConnected={isAuthenticated}
          walletAddress={wallet?.address}
          username={player?.username}
        />

        {/* Wallet Connect Prompt */}
        <View className="flex-1 items-center justify-center p-8">
          <View className="max-w-md w-full">
            <View className="bg-background-secondary rounded-xl p-8 border border-background-tertiary">
              <Text className="text-3xl text-center mb-4">🔐</Text>
              <Text className="text-2xl font-bold text-text-primary text-center mb-4">
                Connect Your Wallet
              </Text>
              <Text className="text-text-secondary text-center mb-6">
                Connect your Cardano wallet to view your profile, track your progress, and manage your NFTs.
              </Text>
              
              <WalletConnect />
              
              <View className="mt-6 pt-6 border-t border-background-tertiary">
                <Text className="text-text-secondary text-sm text-center">
                  Don't have a wallet? Get started with{' '}
                  <Text className="text-primary font-semibold">Eternl</Text> or{' '}
                  <Text className="text-primary font-semibold">Nami</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0B1220' }}>
      {/* Navigation */}
      <Navigation
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        isWalletConnected={isAuthenticated}
        walletAddress={wallet?.address}
        username={player?.username}
      />

      <PlayerProfile 
        initialTab={params.tab as any}
        initialEligibilityId={params.eligibilityId}
        autoStartMinting={params.autoMint === 'true'}
      />
    </View>
  );
}
