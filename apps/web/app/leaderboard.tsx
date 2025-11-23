import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Leaderboard as LeaderboardComponent, SeasonDisplay } from '../src/components';
import { Navigation } from '../src/components/landing/Navigation';
import { Footer } from '../src/components/landing/Footer';
import { useAuth } from '../src/contexts';

export default function LeaderboardPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { wallet, isAuthenticated, player, disconnectWallet } = useAuth();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [view, setView] = useState<'global' | 'category'>('global');
  const [selectedCategory, setSelectedCategory] = useState<string>('science');
  const [currentSeasonId, setCurrentSeasonId] = useState<string>('');
  
  const isMobile = width <= 768;

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
  };

  const categories = [
    { id: 'science', name: 'Science' },
    { id: 'history', name: 'History' },
    { id: 'geography', name: 'Geography' },
    { id: 'sports', name: 'Sports' },
    { id: 'arts', name: 'Arts & Literature' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'technology', name: 'Technology' },
    { id: 'nature', name: 'Nature' },
    { id: 'mythology', name: 'Mythology' },
    { id: 'weird-wonderful', name: 'Weird & Wonderful' },
  ];

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

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: isMobile ? 16 : 48,
          paddingTop: isMobile ? 100 : 120,
          paddingBottom: 48,
        }}
      >
        <View
          style={{
            maxWidth: 1200,
            marginHorizontal: 'auto',
            width: '100%',
          }}
        >
          {/* Header */}
          <View style={{ marginBottom: 32 }}>
            <Text
              style={{
                fontSize: isMobile ? 32 : 48,
                fontWeight: '700',
                color: '#EAF2FF',
                marginBottom: 8,
              }}
            >
              Leaderboard
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: '#9CA3AF',
              }}
            >
              Compete with players worldwide and climb the ranks!
            </Text>
          </View>

          {/* Season Display */}
          <View style={{ marginBottom: 24 }}>
            <SeasonDisplay onSeasonChange={setCurrentSeasonId} />
          </View>

          {/* View Toggle */}
          <View
            style={{
              flexDirection: 'row',
              marginBottom: 24,
              backgroundColor: 'rgba(138, 92, 246, 0.1)',
              borderRadius: 12,
              padding: 4,
              borderWidth: 1,
              borderColor: 'rgba(138, 92, 246, 0.3)',
            }}
          >
            <Pressable
              onPress={() => setView('global')}
              accessibilityRole="button"
              accessibilityLabel="View global leaderboard"
              style={{
                flex: 1,
                paddingVertical: isMobile ? 14 : 12,
                minHeight: 48, // Ensures 44px+ touch target
                borderRadius: 8,
                backgroundColor: view === 'global' ? '#8A5CF6' : 'transparent',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontWeight: '600',
                  color: view === 'global' ? '#FFFFFF' : '#9CA3AF',
                  fontSize: 16,
                }}
              >
                Global Ladder
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setView('category')}
              accessibilityRole="button"
              accessibilityLabel="View category leaderboard"
              style={{
                flex: 1,
                paddingVertical: isMobile ? 14 : 12,
                minHeight: 48, // Ensures 44px+ touch target
                borderRadius: 8,
                backgroundColor: view === 'category' ? '#8A5CF6' : 'transparent',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontWeight: '600',
                  color: view === 'category' ? '#FFFFFF' : '#9CA3AF',
                  fontSize: 16,
                }}
              >
                Category Ladder
              </Text>
            </Pressable>
          </View>

          {/* Category Selector (only for category view) */}
          {view === 'category' && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: '#9CA3AF',
                  marginBottom: 12,
                  fontWeight: '600',
                }}
              >
                Select Category:
              </Text>
              {Platform.OS === 'web' ? (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: 400,
                    padding: '12px 16px',
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#EAF2FF',
                    backgroundColor: 'rgba(138, 92, 246, 0.1)',
                    border: '1px solid rgba(138, 92, 246, 0.3)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8A5CF6';
                    e.target.style.backgroundColor = 'rgba(138, 92, 246, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(138, 92, 246, 0.3)';
                    e.target.style.backgroundColor = 'rgba(138, 92, 246, 0.1)';
                  }}
                >
                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                      style={{
                        backgroundColor: '#1F2937',
                        color: '#EAF2FF',
                        padding: '8px',
                      }}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {categories.map((category) => (
                    <Pressable
                      key={category.id}
                      onPress={() => setSelectedCategory(category.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${category.name} category`}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        minHeight: 48, // Ensures 44px+ touch target
                        borderRadius: 8,
                        backgroundColor:
                          selectedCategory === category.id
                            ? '#8A5CF6'
                            : 'rgba(138, 92, 246, 0.1)',
                        borderWidth: 1,
                        borderColor:
                          selectedCategory === category.id
                            ? '#8A5CF6'
                            : 'rgba(138, 92, 246, 0.3)',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '600',
                          color: selectedCategory === category.id ? '#FFFFFF' : '#9CA3AF',
                          fontSize: 14,
                        }}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Leaderboard */}
          <View
            style={{
              backgroundColor: 'rgba(138, 92, 246, 0.05)',
              borderRadius: 12,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(138, 92, 246, 0.2)',
            }}
          >
            <LeaderboardComponent
              type={view}
              categoryId={view === 'category' ? selectedCategory : undefined}
              seasonId={currentSeasonId}
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <Footer />
    </View>
  );
}
