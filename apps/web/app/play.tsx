import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SessionProvider } from '../src/contexts/SessionContext';
import { CategorySelection } from '../src/components/CategorySelection';
import { SessionFlow } from '../src/components/SessionFlow';
import { SessionResults } from '../src/components/SessionResults';
import { ActiveSessionGuard } from '../src/components/ActiveSessionGuard';
import { Navigation } from '../src/components/landing/Navigation';
import { useAuth } from '../src/contexts';
import { useStatePreservation } from '../src/hooks';
import type { SessionResult } from '@trivia-nft/shared';

type GameplayState = 'categories' | 'session' | 'results';

export default function Play() {
  const router = useRouter();
  useStatePreservation(true); // Preserve scroll position on resize
  const [state, setState] = useState<GameplayState>('categories');
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    nftCount?: number;
  } | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  const handleCategorySelect = async (categoryId: string) => {
    try {
      // Fetch the actual category data to get the real NFT count
      const { categoryService } = await import('../src/services');
      const categoriesResponse = await categoryService.getCategories();
      const category = categoriesResponse.categories.find(c => c.id === categoryId);
      
      if (!category) {
        throw new Error('Category not found');
      }

      setSelectedCategory({
        id: category.id,
        name: category.name,
        nftCount: category.nftCount || 0,
      });
      setState('session');
    } catch (error) {
      console.error('Failed to fetch category:', error);
      alert('Failed to load category details');
    }
  };

  const handleSessionComplete = (result: SessionResult) => {
    setSessionResult(result);
    setState('results');
  };

  const handleSessionError = (error: Error) => {
    console.error('Session error:', error);
    alert(`Session error: ${error.message}`);
    setState('categories');
  };

  const handlePlayAgain = () => {
    setState('categories');
    setSelectedCategory(null);
    setSessionResult(null);
  };

  const handleBackToCategories = () => {
    setState('categories');
    setSelectedCategory(null);
    setSessionResult(null);
  };

  const handleMintNow = () => {
    if (sessionResult?.eligibilityId) {
      // Navigate to profile minting tab with eligibility ID and auto-start minting
      router.push(`/profile?tab=minting&eligibilityId=${sessionResult.eligibilityId}&autoMint=true`);
    }
  };

  const { wallet, isAuthenticated, player, disconnectWallet } = useAuth();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
  };

  return (
    <SessionProvider>
      <View style={{ flex: 1, backgroundColor: '#0B1220' }}>
        {/* Navigation */}
        <Navigation
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
          isWalletConnected={isAuthenticated}
          walletAddress={wallet?.address}
          username={player?.username}
        />

        {/* Content */}
        {state === 'categories' && (
          <ActiveSessionGuard>
            <CategorySelection onCategorySelect={handleCategorySelect} />
          </ActiveSessionGuard>
        )}

        {state === 'session' && selectedCategory && (
          <SessionFlow
            categoryId={selectedCategory.id}
            categoryName={selectedCategory.name}
            nftCount={selectedCategory.nftCount}
            onComplete={handleSessionComplete}
            onError={handleSessionError}
          />
        )}

        {state === 'results' && sessionResult && selectedCategory && (
          <SessionResults
            result={sessionResult}
            categoryName={selectedCategory.name}
            onMintNow={sessionResult.eligibilityId ? handleMintNow : undefined}
            onPlayAgain={handlePlayAgain}
            onBackToCategories={handleBackToCategories}
          />
        )}

      </View>
    </SessionProvider>
  );
}
