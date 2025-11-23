import React from 'react';
import { View, Text, Pressable, useWindowDimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { NFTCardShowcase } from './NFTCardShowcase';

interface HeroSectionProps {
  onStartGame: () => void;
  onViewDocs: () => void;
}

export function HeroSection({ onStartGame, onViewDocs }: HeroSectionProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [startGameHovered, setStartGameHovered] = React.useState(false);
  const [startGameFocused, setStartGameFocused] = React.useState(false);
  const [viewDocsHovered, setViewDocsHovered] = React.useState(false);
  const [viewDocsFocused, setViewDocsFocused] = React.useState(false);
  const [profileHovered, setProfileHovered] = React.useState(false);
  const [profileFocused, setProfileFocused] = React.useState(false);
  const [leaderboardHovered, setLeaderboardHovered] = React.useState(false);
  const [leaderboardFocused, setLeaderboardFocused] = React.useState(false);

  // Determine breakpoints (mobile ≤640px, tablet 641-1024px, desktop ≥1024px)
  const isMobile = width <= 640;
  const isTablet = width > 640 && width <= 1024;
  const isDesktop = width > 1024;

  return (
    <View
      style={{
        position: 'relative',
        width: '100%',
        minHeight: isMobile ? 'auto' : isTablet ? 550 : 600,
        paddingTop: isMobile ? 80 : isTablet ? 100 : 120,
        paddingBottom: isMobile ? 40 : isTablet ? 60 : 80,
        paddingHorizontal: isMobile ? 16 : isTablet ? 32 : 48,
      }}
    >
      {/* Radial gradient background with violet bloom */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
        }}
      >
        {/* Base radial gradient */}
        <View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#0B1220',
            },
            Platform.OS === 'web' && {
              // @ts-ignore - Web-only CSS property
              background: 'radial-gradient(circle at 30% 50%, #1B2540 0%, #0B1220 70%)',
            },
          ]}
        />
        
        {/* Violet bloom overlay */}
        <View
          style={[
            {
              position: 'absolute',
              top: '20%' as any,
              right: isMobile ? '10%' as any : '30%' as any,
              width: isMobile ? 200 : 400,
              height: isMobile ? 200 : 400,
              borderRadius: isMobile ? 100 : 200,
              backgroundColor: 'rgba(138, 92, 246, 0.35)',
            },
            Platform.OS === 'web' && ({
              // @ts-ignore - Web-only CSS property
              filter: 'blur(80px)',
            } as any),
          ]}
        />
      </View>

      {/* Split layout container */}
      <View
        style={{
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 32 : isTablet ? 40 : 48,
          maxWidth: isDesktop ? 1280 : '100%',
          marginHorizontal: 'auto',
          width: '100%',
        }}
      >
        {/* Left Column: Copy and CTAs */}
        <View
          style={{
            flex: isMobile ? undefined : 1,
            alignItems: isMobile ? 'center' : 'flex-start',
            maxWidth: isMobile ? '100%' : 560,
          }}
        >
          {/* Logo */}
          {Platform.OS === 'web' ? (
            <img
              src="/logo.svg"
              alt="TriviaNFT logo - A glowing hexagonal question mark representing blockchain-based trivia gaming"
              role="img"
              loading="eager"
              style={{
                width: isMobile ? 450 : isTablet ? 450 : 450,
                height: isMobile ? 300 : isTablet ? 300 : 500,
                marginBottom: isMobile ? 32 : isTablet ? 36 : 40,
                marginLeft: isMobile ? 0 : -50, 
                objectFit: 'contain',
                filter: 'brightness(1.3) saturate(1.4) drop-shadow(0 0 30px rgba(138, 92, 246, 1)) drop-shadow(0 0 60px rgba(138, 92, 246, 0.8)) drop-shadow(0 0 90px rgba(138, 92, 246, 0.6))',
                alignSelf: isMobile ? 'center' : 'flex-start',
                display: 'block',
              }}
            />
          ) : (
            <Text
              style={{
                fontSize: isMobile ? 48 : isTablet ? 56 : 64,
                fontWeight: '800',
                color: '#EAF2FF',
                marginBottom: isMobile ? 32 : isTablet ? 36 : 40,
                textAlign: isMobile ? 'center' : 'left',
                letterSpacing: -1.5,
                lineHeight: isMobile ? 56 : isTablet ? 64 : 72,
              }}
              accessibilityRole="header"
            >
              TriviaNFT
            </Text>
          )}

          {/* CTA Buttons Container */}
          <View
            style={{
              flexDirection: isMobile ? 'column' : 'row',
              gap: 16,
              width: isMobile ? '100%' : 'auto',
              flexWrap: 'wrap',
            }}
          >
            {/* Primary "Start Game" Button */}
            <Pressable
              onPress={onStartGame}
              onHoverIn={() => setStartGameHovered(true)}
              onHoverOut={() => setStartGameHovered(false)}
              onFocus={() => setStartGameFocused(true)}
              onBlur={() => setStartGameFocused(false)}
              accessibilityRole="button"
              accessibilityLabel="Start playing trivia game"
              style={[
                {
                  borderRadius: 12,
                  overflow: 'hidden',
                  transform: [{ scale: startGameHovered ? 1.05 : 1 }],
                  minWidth: isMobile ? '100%' : 180,
                  minHeight: 48, // Exceeds 44px minimum for touch targets
                  paddingHorizontal: isMobile ? 32 : 32,
                  paddingVertical: isMobile ? 16 : 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#8A5CF6',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: startGameHovered ? 0.8 : isDesktop ? 0.6 : 0.4,
                  shadowRadius: startGameHovered ? 30 : isDesktop ? 20 : 15,
                  elevation: 8,
                  ...(startGameFocused && {
                    borderWidth: 3,
                    borderColor: '#FFFFFF',
                    shadowOpacity: 1,
                    shadowRadius: 40,
                  }),
                },
                Platform.OS === 'web' && {
                  // @ts-ignore - Web-only CSS property
                  background: 'linear-gradient(45deg, #8A5CF6 0%, #22D3EE 100%)',
                  // @ts-ignore - Web-only CSS property
                  transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  // @ts-ignore - Web-only CSS property
                  outline: startGameFocused ? '3px solid #FFFFFF' : 'none',
                  // @ts-ignore - Web-only CSS property
                  outlineOffset: '2px',
                },
                Platform.OS !== 'web' && {
                  backgroundColor: '#8A5CF6',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  letterSpacing: 0.5,
                }}
              >
                Start Game
              </Text>
            </Pressable>

            {/* Secondary "Whitepaper" Button - Cardano Blue (trustworthy) */}
            <Pressable
              onPress={onViewDocs}
              onHoverIn={() => setViewDocsHovered(true)}
              onHoverOut={() => setViewDocsHovered(false)}
              onFocus={() => setViewDocsFocused(true)}
              onBlur={() => setViewDocsFocused(false)}
              accessibilityRole="button"
              accessibilityLabel="View whitepaper"
              style={[
                {
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#22D3EE',
                  paddingHorizontal: isMobile ? 32 : 32,
                  paddingVertical: isMobile ? 16 : 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#0033AD',
                  transform: [{ scale: viewDocsHovered ? 1.02 : 1 }],
                  minWidth: isMobile ? '100%' : 180,
                  minHeight: 48, // Exceeds 44px minimum for touch targets
                  shadowColor: '#22D3EE',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: viewDocsHovered ? 0.4 : 0,
                  shadowRadius: viewDocsHovered ? 12 : 0,
                },
                Platform.OS === 'web' && {
                  // @ts-ignore - Web-only CSS property
                  background: viewDocsHovered 
                    ? 'linear-gradient(135deg, #0033AD 0%, #0369A1 100%)'
                    : '#0033AD',
                  // @ts-ignore - Web-only CSS property
                  transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  // @ts-ignore - Web-only CSS property
                  boxShadow: viewDocsHovered ? '0 0 20px rgba(34, 211, 238, 0.4)' : 'none',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#F9FAFB',
                  letterSpacing: 0.5,
                }}
              >
                Whitepaper
              </Text>
            </Pressable>

            {/* Profile Button - Personal (cyan border) */}
            <Pressable
              onPress={() => router.push('/profile')}
              onHoverIn={() => setProfileHovered(true)}
              onHoverOut={() => setProfileHovered(false)}
              onFocus={() => setProfileFocused(true)}
              onBlur={() => setProfileFocused(false)}
              accessibilityRole="button"
              accessibilityLabel="View profile"
              style={[
                {
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#22D3EE',
                  paddingHorizontal: isMobile ? 32 : 32,
                  paddingVertical: isMobile ? 16 : 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#111A2D',
                  transform: [{ scale: profileHovered ? 1.02 : 1 }],
                  minWidth: isMobile ? '100%' : 180,
                  minHeight: 48, // Exceeds 44px minimum for touch targets
                  shadowColor: '#22D3EE',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: profileHovered ? 0.3 : 0,
                  shadowRadius: profileHovered ? 12 : 0,
                },
                Platform.OS === 'web' && {
                  // @ts-ignore - Web-only CSS property
                  background: profileHovered 
                    ? 'linear-gradient(135deg, #0369A1 0%, #4C1D95 100%)'
                    : '#111A2D',
                  // @ts-ignore - Web-only CSS property
                  transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  // @ts-ignore - Web-only CSS property
                  boxShadow: profileHovered ? '0 0 16px rgba(34, 211, 238, 0.3)' : 'none',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: profileHovered ? '#F9FAFB' : '#E5E7EB',
                  letterSpacing: 0.5,
                }}
              >
                Profile
              </Text>
            </Pressable>

            {/* Leaderboard Button - Always glowing green, pulses on hover */}
            <Pressable
              onPress={() => router.push('/leaderboard')}
              onHoverIn={() => setLeaderboardHovered(true)}
              onHoverOut={() => setLeaderboardHovered(false)}
              onFocus={() => setLeaderboardFocused(true)}
              onBlur={() => setLeaderboardFocused(false)}
              accessibilityRole="button"
              accessibilityLabel="View leaderboard"
              style={[
                {
                  borderRadius: 12,
                  paddingHorizontal: isMobile ? 32 : 32,
                  paddingVertical: isMobile ? 16 : 16,
                  borderWidth: 2,
                  borderColor: '#B9FF66',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: leaderboardHovered ? 'rgba(185, 255, 102, 0.2)' : 'rgba(185, 255, 102, 0.1)',
                  transform: [{ scale: leaderboardHovered ? 1.05 : 1 }],
                  minHeight: 48, // Exceeds 44px minimum for touch targets
                  minWidth: isMobile ? '100%' : 180,
                  shadowColor: '#B9FF66',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: leaderboardHovered ? 0.6 : 0.3,
                  shadowRadius: leaderboardHovered ? 20 : 12,
                },
                Platform.OS === 'web' && {
                  // @ts-ignore - Web-only CSS property
                  transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  // @ts-ignore - Web-only CSS property
                  boxShadow: leaderboardHovered 
                    ? '0 0 24px rgba(185, 255, 102, 0.6), 0 0 48px rgba(185, 255, 102, 0.3)' 
                    : '0 0 16px rgba(185, 255, 102, 0.3)',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: leaderboardHovered ? '#FFFFFF' : '#B9FF66',
                  letterSpacing: 0.5,
                }}
              >
                Leaderboard
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Right Column: NFT Card Showcase */}
        <View
          style={{
            flex: isMobile ? undefined : 1,
            alignItems: 'center',
            justifyContent: 'center',
            width: isMobile ? '100%' : 'auto',
          }}
        >
          <NFTCardShowcase />
        </View>
      </View>
    </View>
  );
}
