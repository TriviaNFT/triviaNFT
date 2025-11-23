import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useResponsive } from '../../hooks/useResponsive';

interface NavigationProps {
  onConnectWallet: () => void;
  onDisconnectWallet?: () => void;
  isWalletConnected?: boolean;
  walletAddress?: string;
  username?: string | null;
}

export function Navigation({
  onConnectWallet,
  onDisconnectWallet,
  isWalletConnected = false,
  walletAddress,
  username,
}: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [isHovered, setIsHovered] = React.useState(false);
  const [disconnectHovered, setDisconnectHovered] = React.useState(false);
  const [logoHovered, setLogoHovered] = React.useState(false);
  
  // Check if we're on the homepage
  const isHomePage = pathname === '/';

  // Show username if available, otherwise truncate wallet address
  const displayText = username
    ? username
    : walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  // Responsive sizing
  const navHeight = isMobile ? 64 : 72;
  const horizontalPadding = isMobile ? 16 : isTablet ? 24 : 32;
  const logoSize = isMobile ? 36 : 48;
  const backButtonSize = isMobile ? 44 : 36; // Ensure minimum touch target on mobile
  const brandFontSize = isMobile ? 16 : 20;
  const taglineFontSize = isMobile ? 8 : 10;

  return (
    <View
      style={{
        position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        ...(Platform.OS === 'web' && {
          // @ts-ignore - Web-only CSS property
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }),
      }}
    >
      <View
        style={{
          backgroundColor: 'rgba(18, 26, 42, 0.8)',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(39, 50, 74, 0.16)',
          height: navHeight,
          paddingHorizontal: horizontalPadding,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Back to Lobby Button + Logo */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: isMobile ? 6 : 8 }}>
          {/* Back Arrow Button - Only show on inner pages */}
          {!isHomePage && (
            <Pressable
              onPress={() => router.push('/')}
              onHoverIn={() => setLogoHovered(true)}
              onHoverOut={() => setLogoHovered(false)}
              accessibilityRole="button"
              accessibilityLabel="Back to Lobby"
              style={{
                width: backButtonSize,
                height: backButtonSize,
                minWidth: 44, // Ensure minimum touch target
                minHeight: 44, // Ensure minimum touch target
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: backButtonSize / 2,
                borderWidth: 1,
                borderColor: logoHovered ? '#22D3EE' : 'rgba(34, 211, 238, 0.5)',
                backgroundColor: logoHovered ? '#0369A1' : '#111A2D',
                ...(Platform.OS === 'web' && {
                  // @ts-ignore - Web-only CSS property
                  boxShadow: logoHovered 
                    ? '0 0 12px rgba(34, 211, 238, 0.4)'
                    : '0 0 4px rgba(34, 211, 238, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }),
              }}
            >
              <Text style={{ color: '#F9FAFB', fontSize: isMobile ? 16 : 18, lineHeight: isMobile ? 16 : 18 }}>←</Text>
            </Pressable>
          )}

          {/* Logo Icon + Text (Brand) */}
          <Pressable
            onPress={() => router.push('/')}
            onHoverIn={() => setLogoHovered(true)}
            onHoverOut={() => setLogoHovered(false)}
            accessibilityRole="link"
            accessibilityLabel="TriviaNFT Home"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: isMobile ? 8 : 12,
              minHeight: 44, // Ensure minimum touch target
              ...(Platform.OS === 'web' && {
                // @ts-ignore - Web-only CSS property
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }),
            }}
          >
            {/* Logo SVG Icon - Responsive sizing */}
            {Platform.OS === 'web' && (
              <img
                src="/logo.svg"
                alt="TriviaNFT"
                title={!isHomePage ? 'Back to Lobby' : 'TriviaNFT'}
                loading="eager"
                style={{
                  width: logoSize,
                  height: logoSize,
                  filter: logoHovered 
                    ? 'drop-shadow(0 0 12px rgba(34, 211, 238, 0.6)) drop-shadow(0 0 16px rgba(255, 43, 209, 0.4))'
                    : 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.4))',
                  transition: 'filter 0.3s ease',
                }}
              />
            )}
            
            {/* Brand Text - Hide tagline on very small screens */}
            <View>
              <Text
                style={{
                  fontSize: brandFontSize,
                  fontWeight: '700',
                  color: logoHovered ? '#22D3EE' : '#F9FAFB',
                  letterSpacing: 0.5,
                  ...(Platform.OS === 'web' && {
                    // @ts-ignore - Web-only CSS property
                    transition: 'color 0.3s ease',
                  }),
                }}
              >
                TRIVIA NFT
              </Text>
              {!isMobile && (
                <Text
                  style={{
                    fontSize: taglineFontSize,
                    fontWeight: '600',
                    color: logoHovered ? '#B9FF66' : '#9CA3AF',
                    letterSpacing: 1,
                    marginTop: -2,
                    ...(Platform.OS === 'web' && {
                      // @ts-ignore - Web-only CSS property
                      transition: 'color 0.3s ease',
                    }),
                  }}
                >
                  WIN · MINT · COLLECT
                </Text>
              )}
            </View>
          </Pressable>
        </View>

        {/* Wallet Section */}
        {isWalletConnected ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
            {/* Connected Wallet Display - Cardano Blue (secure/connected) */}
            <Pressable
              onHoverIn={() => setLogoHovered(true)}
              onHoverOut={() => setLogoHovered(false)}
              style={{
                borderWidth: 1,
                borderColor: '#22D3EE',
                paddingHorizontal: isMobile ? 12 : 16,
                paddingVertical: isMobile ? 12 : 10,
                minHeight: 44, // Ensure minimum touch target
                borderRadius: 9999,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: logoHovered ? '#1D4ED8' : '#0033AD',
                ...(Platform.OS === 'web' && {
                  // @ts-ignore - Web-only CSS property
                  transition: 'all 150ms ease',
                }),
              }}
            >
              {/* Connected indicator dot */}
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#22C55E',
                  ...(Platform.OS === 'web' && {
                    // @ts-ignore - Web-only CSS property
                    boxShadow: logoHovered ? '0 0 8px rgba(34, 197, 94, 0.6)' : '0 0 4px rgba(34, 197, 94, 0.4)',
                  }),
                }}
              />
              <Text
                style={{
                  color: '#F9FAFB',
                  fontSize: isMobile ? 12 : 14,
                  fontWeight: '600',
                }}
              >
                {displayText}
              </Text>
            </Pressable>

            {/* Disconnect Button - Destructive (caution) - Hide text on mobile */}
            {onDisconnectWallet && (
              <Pressable
                onPress={onDisconnectWallet}
                onHoverIn={() => setDisconnectHovered(true)}
                onHoverOut={() => setDisconnectHovered(false)}
                accessibilityRole="button"
                accessibilityLabel="Disconnect wallet"
                style={{
                  borderWidth: 1,
                  borderColor: disconnectHovered ? '#DC2626' : '#FCA5A5',
                  paddingHorizontal: isMobile ? 12 : 16,
                  paddingVertical: isMobile ? 12 : 10,
                  minHeight: 44,
                  minWidth: 44, // Ensure minimum touch target
                  borderRadius: 9999,
                  backgroundColor: disconnectHovered ? '#DC2626' : '#111A2D',
                  transform: [{ scale: disconnectHovered ? 1.02 : 1 }],
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(Platform.OS === 'web' && {
                    // @ts-ignore - Web-only CSS property
                    transition: 'all 150ms ease',
                    // @ts-ignore - Web-only CSS property
                    boxShadow: disconnectHovered ? '0 0 16px rgba(249, 115, 115, 0.4)' : 'none',
                  }),
                }}
              >
                <Text
                  style={{
                    color: disconnectHovered ? '#FEF2F2' : '#FCA5A5',
                    fontSize: isMobile ? 12 : 14,
                    fontWeight: '600',
                  }}
                >
                  {isMobile ? '✕' : 'Disconnect'}
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable
            onPress={onConnectWallet}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            accessibilityRole="button"
            accessibilityLabel="Connect Cardano wallet"
            style={{
              borderWidth: 2,
              borderColor: 'rgba(138, 92, 246, 0.8)',
              paddingHorizontal: isMobile ? 16 : 20,
              paddingVertical: isMobile ? 14 : 12,
              minHeight: 48,
              borderRadius: 9999,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transform: [{ scale: isHovered && !isMobile ? 1.02 : 1 }],
              ...(isHovered &&
                Platform.OS === 'web' && {
                  // @ts-ignore - Web-only CSS property
                  boxShadow: '0 0 20px rgba(138, 92, 246, 0.6)',
                }),
            }}
          >
            <Text
              style={{
                color: '#EAF2FF',
                fontSize: isMobile ? 14 : 16,
                fontWeight: '600',
                ...(Platform.OS === 'web' && {
                  // @ts-ignore
                  textShadow: isHovered ? '0 0 10px rgba(138, 92, 246, 0.6)' : 'none',
                }),
              }}
            >
              {isMobile ? 'Connect' : 'Connect Wallet'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
