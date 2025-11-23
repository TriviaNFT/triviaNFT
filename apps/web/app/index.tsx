// apps/web/app/index.tsx
import React from 'react';
import { View, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Navigation } from '../src/components/landing/Navigation';
import { HeroSection } from '../src/components/landing/HeroSection';
import { Footer } from '../src/components/landing/Footer';
import { WalletConnect, ProfileCreation } from '../src/components';
import { useAuth } from '../src/contexts';

export default function Home() {
  const router = useRouter();
  const { wallet, isAuthenticated, player, isNewUser, disconnectWallet } = useAuth();
  const [showWalletModal, setShowWalletModal] = React.useState(false);

  // Navigation handlers
  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleDisconnectWallet = () => {
    console.log('[Home] Disconnecting wallet...');
    disconnectWallet();
  };

  // Auto-close wallet modal when connected
  React.useEffect(() => {
    if (wallet) {
      console.log('[Home] Wallet connected, closing modal');
      setShowWalletModal(false);
    }
  }, [wallet]);

  const handleStartGame = () => {
    // Navigate to play page
    router.push('/play');
  };

  const handleViewDocs = () => {
    // Navigate to whitepaper page
    router.push('/whitepaper');
  };

  return (
    <View
      style={{
        flex: 1,
        position: 'relative',
      }}
      accessible={false}
    >
      {/* Skip to main content link for screen readers */}
      {Platform.OS === 'web' && (
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            left: '-9999px',
            zIndex: 9999,
            padding: '8px 16px',
            backgroundColor: '#6d4ee3',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: '600',
          }}
          onFocus={(e: any) => {
            e.target.style.left = '16px';
            e.target.style.top = '16px';
          }}
          onBlur={(e: any) => {
            e.target.style.left = '-9999px';
          }}
        >
          Skip to main content
        </a>
      )}

      {/* Dark cinematic gradient background with vignette */}
      <View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#0B1220',
            zIndex: -2,
          },
          Platform.OS === 'web' && {
            // @ts-ignore - Web-only CSS property
            background: 'linear-gradient(180deg, #0B1220 0%, #1e1b4b 50%, #0B1220 100%)',
          },
        ]}
        accessible={false}
        importantForAccessibility="no"
      />

      {/* Vignette overlay */}
      <View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
          },
          Platform.OS === 'web' && {
            // @ts-ignore - Web-only CSS property
            background: 'radial-gradient(circle at center, transparent 0%, rgba(11, 18, 32, 0.8) 100%)',
          },
        ]}
        accessible={false}
        importantForAccessibility="no"
      />

      {/* Grain/noise texture overlay */}
      <View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
            zIndex: -1,
          },
          Platform.OS === 'web' && {
            // @ts-ignore - Web-only CSS property
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulance type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
            // @ts-ignore - Web-only CSS property
            backgroundRepeat: 'repeat',
          },
        ]}
        accessible={false}
        importantForAccessibility="no"
      />

      {/* Sticky Navigation */}
      <Navigation
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        isWalletConnected={isAuthenticated}
        walletAddress={wallet?.address}
        username={player?.username}
      />

      {/* Wallet Connection Modal - Only show if not connected */}
      {!wallet && (
        <WalletConnect
          visible={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onSuccess={() => {
            console.log('[Home] Wallet connected successfully!');
            setShowWalletModal(false);
          }}
          onError={(error) => {
            console.error('[Home] Wallet connection failed:', error);
          }}
        />
      )}

      {/* Profile Creation Modal - Shows automatically for new users */}
      {isNewUser && wallet && !player?.username && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
          }}
        >
          <View style={{ maxWidth: 500, width: '90%' }}>
            <ProfileCreation
              onSuccess={() => {
                console.log('[Home] Profile created successfully!');
              }}
              onError={(error) => {
                console.error('[Home] Profile creation failed:', error);
              }}
            />
          </View>
        </View>
      )}

      {/* Scrollable Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 0,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View 
          accessibilityLabel="Hero section"
          nativeID="main-content"
          accessibilityRole="main"
        >
          <HeroSection
            onStartGame={handleStartGame}
            onViewDocs={handleViewDocs}
          />
        </View>

        {/* Footer */}
        <Footer />
      </ScrollView>
    </View>
  );
}
