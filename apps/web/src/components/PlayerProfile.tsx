import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { getProfile, getPlayerNFTs, getPlayerActivity, sessionService, mintService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useCountdown } from '../hooks/useCountdown';
import { useResponsive } from '../hooks/useResponsive';
import type { NFT, Activity } from '@trivia-nft/shared';
import { NFTCard } from './NFTCard';
import { NFTDetailModal } from './NFTDetailModal';
import { NFTGallery } from './NFTGallery';
import { MintEligibilityList } from './MintEligibilityList';
import { MintingInterface } from './MintingInterface';
import { ForgeInterface } from './ForgeInterface';
import { WalletConnect } from './WalletConnect';
import { ProfileCreation } from './ProfileCreation';

interface PlayerStats {
  totalSessions: number;
  perfectScores: number;
  totalNFTs: number;
  currentSeasonPoints: number;
  currentSeasonRank?: number;
}

interface ProfileData {
  username: string;
  stakeKey: string;
  remainingPlays: number;
  resetAt: string;
  stats: PlayerStats;
  perfectScoresByCategory: Record<string, number>;
}

export interface PlayerProfileProps {
  initialTab?: 'overview' | 'nfts' | 'activity' | 'minting' | 'forging' | 'settings';
  initialEligibilityId?: string;
  autoStartMinting?: boolean;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({
  initialTab = 'overview',
  initialEligibilityId,
  autoStartMinting = false,
}) => {
  const { player, isAuthenticated } = useAuth();
  const router = useRouter();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'nfts' | 'activity' | 'minting' | 'forging' | 'settings'>(initialTab);
  const [showMintingInterface, setShowMintingInterface] = useState(autoStartMinting);
  const [selectedEligibilityId, setSelectedEligibilityId] = useState<string | null>(initialEligibilityId || null);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [showNFTModal, setShowNFTModal] = useState(false);

  const resetCountdown = useCountdown(profile?.resetAt || '');

  useEffect(() => {
    fetchProfile();
  }, []);

  // Clear URL parameters if eligibility is invalid on mount
  useEffect(() => {
    if (autoStartMinting && initialEligibilityId) {
      // Check if eligibility is still valid
      mintService.getEligibilities().then(response => {
        const eligibility = response.eligibilities.find(e => e.id === initialEligibilityId);
        if (!eligibility) {
          // Eligibility not found - clear URL parameters
          console.log('[Profile] Eligibility not found, clearing URL parameters');
          router.replace('/profile?tab=minting');
          setShowMintingInterface(false);
          setSelectedEligibilityId(null);
        }
      }).catch(err => {
        console.error('[Profile] Failed to check eligibility:', err);
      });
    }
  }, [autoStartMinting, initialEligibilityId]);

  // Refresh profile when countdown expires (sessions reset)
  useEffect(() => {
    if (resetCountdown.isExpired && profile) {
      console.log('[Profile] Session limit reset detected, refreshing profile...');
      fetchProfile();
    }
  }, [resetCountdown.isExpired]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const [profileRes, nftsRes, activityRes, limitsRes] = await Promise.all([
        getProfile(),
        getPlayerNFTs({ limit: 50 }),
        getPlayerActivity({ limit: 20 }),
        sessionService.getSessionLimits(),
      ]);

      // Transform profile response
      setProfile({
        username: profileRes.player.username || 'Anonymous',
        stakeKey: profileRes.player.stakeKey || '',
        remainingPlays: limitsRes.remainingSessions,
        resetAt: limitsRes.resetAt,
        stats: profileRes.stats,
        perfectScoresByCategory: profileRes.stats.perfectScoresByCategory || {},
      });

      setNfts(nftsRes.nfts as NFT[]);
      setActivities(activityRes.activities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" color="#4C7DFF" />
        <Text className="text-gray-400 mt-4">Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-red-500 text-center mb-4">{error}</Text>
        <Pressable
          onPress={fetchProfile}
          className="bg-primary px-6 py-3 rounded-lg"
          accessibilityRole="button"
          accessibilityLabel="Retry loading profile"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <>
      <NFTDetailModal
        nft={selectedNFT}
        visible={showNFTModal}
        onClose={() => {
          setShowNFTModal(false);
          setSelectedNFT(null);
        }}
      />
      <ScrollView className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="bg-gradient-to-b from-primary/20 to-transparent p-6 pt-24">
        <Text className="text-white text-2xl font-bold mb-2">
          {profile.username}
        </Text>
        <Text className="text-gray-400 text-sm font-mono" numberOfLines={1}>
          {profile.stakeKey.slice(0, 20)}...{profile.stakeKey.slice(-10)}
        </Text>
      </View>

      {/* Remaining Plays */}
      <View className="mx-4 mb-4 bg-gray-800 rounded-lg p-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-white font-semibold">Daily Sessions</Text>
          <Text className="text-lg font-bold" style={{ color: '#6d4ee3' }}>
            {profile.remainingPlays}/20
          </Text>
        </View>
        <View className="bg-gray-700 h-3 rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ 
              width: `${((20 - profile.remainingPlays) / 20) * 100}%`,
              backgroundColor: '#6d4ee3'
            }}
          />
        </View>
        <Text className="text-gray-400 text-xs mt-2">
          Resets in: {resetCountdown.formatted.hours}h {resetCountdown.formatted.minutes}m{' '}
          {resetCountdown.formatted.seconds}s
        </Text>
      </View>

      {/* Tabs - Touch-friendly with min 44x44px targets */}
      <View className="mx-4 mb-4 bg-gray-800 rounded-lg p-1">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
        >
          <View className="flex-row">
          <Pressable
            onPress={() => setActiveTab('overview')}
            className={`rounded-lg ${
              activeTab === 'overview' ? 'bg-primary-500' : 'bg-transparent'
            }`}
            style={[
              { minWidth: 44, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
              activeTab === 'overview' ? { backgroundColor: '#6d4ee3' } : {}
            ]}
          >
            <Text
              className={`text-center font-semibold text-base ${
                activeTab === 'overview' ? 'text-white' : 'text-gray-400'
              }`}
            >
              Overview
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('nfts')}
            className={`rounded-lg ${
              activeTab === 'nfts' ? 'bg-primary-500' : 'bg-transparent'
            }`}
            style={[
              { minWidth: 44, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
              activeTab === 'nfts' ? { backgroundColor: '#6d4ee3' } : {}
            ]}
          >
            <Text
              className={`text-center font-semibold text-base ${
                activeTab === 'nfts' ? 'text-white' : 'text-gray-400'
              }`}
            >
              NFTs ({nfts.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('minting')}
            className={`rounded-lg ${
              activeTab === 'minting' ? 'bg-primary-500' : 'bg-transparent'
            }`}
            style={[
              { minWidth: 44, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
              activeTab === 'minting' ? { backgroundColor: '#6d4ee3' } : {}
            ]}
          >
            <Text
              className={`text-center font-semibold text-base ${
                activeTab === 'minting' ? 'text-white' : 'text-gray-400'
              }`}
            >
              Minting
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('forging')}
            className={`rounded-lg ${
              activeTab === 'forging' ? 'bg-primary-500' : 'bg-transparent'
            }`}
            style={[
              { minWidth: 44, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
              activeTab === 'forging' ? { backgroundColor: '#6d4ee3' } : {}
            ]}
          >
            <Text
              className={`text-center font-semibold text-base ${
                activeTab === 'forging' ? 'text-white' : 'text-gray-400'
              }`}
            >
              Forging
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('activity')}
            className={`rounded-lg ${
              activeTab === 'activity' ? 'bg-primary-500' : 'bg-transparent'
            }`}
            style={[
              { minWidth: 44, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
              activeTab === 'activity' ? { backgroundColor: '#6d4ee3' } : {}
            ]}
          >
            <Text
              className={`text-center font-semibold text-base ${
                activeTab === 'activity' ? 'text-white' : 'text-gray-400'
              }`}
            >
              Activity
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('settings')}
            className={`rounded-lg ${
              activeTab === 'settings' ? 'bg-primary-500' : 'bg-transparent'
            }`}
            style={[
              { minWidth: 44, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
              activeTab === 'settings' ? { backgroundColor: '#6d4ee3' } : {}
            ]}
          >
            <Text
              className={`text-center font-semibold text-base ${
                activeTab === 'settings' ? 'text-white' : 'text-gray-400'
              }`}
            >
              Settings
            </Text>
          </Pressable>
        </View>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View className="px-4 pb-6">
        {activeTab === 'overview' && (
          <View>
            {/* Stats Grid - Responsive: 2 cols mobile, 2 cols tablet, 4 cols desktop */}
            <View className="flex-row flex-wrap -mx-2 mb-4">
              <View className={`${isMobile ? 'w-1/2' : isTablet ? 'w-1/2' : 'w-1/4'} px-2 mb-4`}>
                <View className="bg-gray-800 rounded-lg p-4">
                  <Text className="text-gray-400 text-xs mb-1">Total Sessions</Text>
                  <Text className="text-white text-2xl font-bold">
                    {profile.stats.totalSessions}
                  </Text>
                </View>
              </View>
              <View className={`${isMobile ? 'w-1/2' : isTablet ? 'w-1/2' : 'w-1/4'} px-2 mb-4`}>
                <View className="bg-gray-800 rounded-lg p-4">
                  <Text className="text-gray-400 text-xs mb-1">Perfect Scores</Text>
                  <Text className="text-green-400 text-2xl font-bold">
                    {profile.stats.perfectScores}
                  </Text>
                </View>
              </View>
              <View className={`${isMobile ? 'w-1/2' : isTablet ? 'w-1/2' : 'w-1/4'} px-2 mb-4`}>
                <View className="bg-gray-800 rounded-lg p-4">
                  <Text className="text-gray-400 text-xs mb-1">Total NFTs</Text>
                  <Text className="text-purple-400 text-2xl font-bold">
                    {profile.stats.totalNFTs}
                  </Text>
                </View>
              </View>
              <View className={`${isMobile ? 'w-1/2' : isTablet ? 'w-1/2' : 'w-1/4'} px-2 mb-4`}>
                <View className="bg-gray-800 rounded-lg p-4">
                  <Text className="text-gray-400 text-xs mb-1">Season Points</Text>
                  <Text className="text-2xl font-bold" style={{ color: '#6d4ee3' }}>
                    {profile.stats.currentSeasonPoints}
                  </Text>
                </View>
              </View>
            </View>

            {/* Season Rank */}
            {profile.stats.currentSeasonRank && (
              <View className="bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-lg p-4 mb-4 border border-primary/30">
                <Text className="text-gray-400 text-xs mb-1">Current Season Rank</Text>
                <Text className="text-white text-3xl font-bold">
                  #{profile.stats.currentSeasonRank}
                </Text>
              </View>
            )}

            {/* Perfect Scores by Category */}
            <View className="bg-gray-800 rounded-lg p-4">
              <Text className="text-white font-semibold mb-3">
                Perfect Scores by Category
              </Text>
              {Object.keys(profile.perfectScoresByCategory).length === 0 ? (
                <Text className="text-gray-400 text-sm text-center py-4">
                  No perfect scores yet. Keep playing!
                </Text>
              ) : (
                Object.entries(profile.perfectScoresByCategory).map(
                  ([category, count]) => (
                    <View
                      key={category}
                      className="flex-row items-center justify-between py-2 border-b border-gray-700"
                    >
                      <Text className="text-gray-300">{category}</Text>
                      <Text className="text-green-400 font-bold">{count}</Text>
                    </View>
                  )
                )
              )}
            </View>
          </View>
        )}

        {activeTab === 'nfts' && (
          <View>
            {nfts.length === 0 ? (
              <View className="bg-gray-800 rounded-lg p-8">
                <Text className="text-gray-400 text-center">
                  No NFTs yet. Achieve a perfect score to mint your first NFT!
                </Text>
              </View>
            ) : (
              <NFTGallery 
                nfts={nfts}
                onNFTPress={(selectedNft) => {
                  setSelectedNFT(selectedNft);
                  setShowNFTModal(true);
                }}
              />
            )}
          </View>
        )}

        {activeTab === 'minting' && (
          <View>
            {showMintingInterface && selectedEligibilityId ? (
              <MintingInterface
                eligibilityId={selectedEligibilityId}
                onComplete={(nft) => {
                  console.log('Mint completed:', nft);
                  // Clear URL parameters to prevent re-minting on refresh
                  router.replace('/profile?tab=minting');
                  // Don't close immediately - let user see success message and click button
                  // The MintingInterface will call onCancel when user clicks "View My NFT Collection" or "Back to Lobby"
                  // Refresh profile to update NFT count
                  fetchProfile();
                }}
                onCancel={() => {
                  setShowMintingInterface(false);
                  setSelectedEligibilityId(null);
                  // Clear URL parameters
                  router.replace('/profile?tab=nfts');
                  // Switch to NFTs tab to show the newly minted NFT
                  setActiveTab('nfts');
                }}
              />
            ) : (
              <MintEligibilityList
                onMintClick={(eligibilityId) => {
                  setSelectedEligibilityId(eligibilityId);
                  setShowMintingInterface(true);
                }}
                onConnectWallet={() => {
                  console.log('Connect wallet clicked');
                }}
              />
            )}
          </View>
        )}

        {activeTab === 'forging' && (
          <ForgeInterface
            onComplete={() => {
              // Refresh profile to update NFT counts
              fetchProfile();
            }}
          />
        )}

        {activeTab === 'settings' && (
          <View>
            {/* Account Information */}
            <View className="bg-gray-800 rounded-lg p-4 mb-4">
              <Text className="text-white font-semibold text-lg mb-4">Account Information</Text>
              
              {/* Username */}
              <View className="mb-4">
                <Text className="text-gray-400 text-xs mb-1">Username</Text>
                <Text className="text-white font-medium">{profile?.username || 'Not set'}</Text>
              </View>

              {/* Email */}
              <View className="mb-4">
                <Text className="text-gray-400 text-xs mb-1">Email</Text>
                <Text className="text-white font-medium">{player?.email || 'Not provided'}</Text>
              </View>

              {/* Stake Address */}
              <View className="mb-4">
                <Text className="text-gray-400 text-xs mb-1">Stake Address</Text>
                <Text className="text-white font-mono text-xs break-all">
                  {profile?.stakeKey || 'Not connected'}
                </Text>
              </View>

              {/* Payment Address */}
              <View className="mb-4">
                <Text className="text-gray-400 text-xs mb-1">Payment Address</Text>
                <Text className="text-white font-mono text-xs break-all">
                  {player?.paymentAddress || 'Not available'}
                </Text>
              </View>

              {/* Account Created */}
              <View>
                <Text className="text-gray-400 text-xs mb-1">Member Since</Text>
                <Text className="text-white font-medium">
                  {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            </View>

            {/* Wallet Connection */}
            <View className="bg-gray-800 rounded-lg p-4 mb-4">
              <Text className="text-white font-semibold text-lg mb-2">Wallet Connection</Text>
              <Text className="text-gray-400 text-sm mb-4">
                Manage your wallet connection and authentication
              </Text>
              
              {isAuthenticated ? (
                <View className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                  <View className="flex-row items-center mb-2">
                    <View 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: '#22c55e' }}
                    />
                    <Text className="text-green-400 font-semibold">Wallet Connected</Text>
                  </View>
                  <Text className="text-gray-400 text-sm">
                    Your Cardano wallet is connected and authenticated
                  </Text>
                </View>
              ) : (
                <WalletConnect
                  onSuccess={() => {
                    console.log('Wallet connected successfully!');
                    fetchProfile();
                  }}
                  onError={(error) => {
                    console.error('Wallet connection failed:', error);
                  }}
                />
              )}
            </View>

            {/* Profile Setup */}
            {isAuthenticated && !player?.username && (
              <View className="bg-gray-800 rounded-lg p-4 mb-4">
                <Text className="text-white font-semibold text-lg mb-2">Profile Setup</Text>
                <Text className="text-gray-400 text-sm mb-4">
                  Complete your player profile
                </Text>
                <ProfileCreation
                  onSuccess={() => {
                    console.log('Profile created successfully!');
                    fetchProfile();
                  }}
                  onError={(error) => {
                    console.error('Profile creation failed:', error);
                  }}
                />
              </View>
            )}

            {/* Preferences */}
            <View className="bg-gray-800 rounded-lg p-4">
              <Text className="text-white font-semibold text-lg mb-4">Preferences</Text>
              
              <View className="mb-4">
                <Text className="text-gray-400 text-sm mb-2">Network</Text>
                <View className="bg-gray-700 rounded-lg p-3">
                  <Text className="text-white font-medium">Preprod Testnet</Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    Currently using Cardano preprod testnet
                  </Text>
                </View>
              </View>

              <View>
                <Text className="text-gray-400 text-sm mb-2">Language</Text>
                <View className="bg-gray-700 rounded-lg p-3">
                  <Text className="text-white font-medium">English (US)</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'activity' && (
          <View className="bg-gray-800 rounded-lg p-4">
            <Text className="text-white font-semibold mb-3">Recent Activity</Text>
            {activities.length === 0 ? (
              <Text className="text-gray-400 text-sm text-center py-4">
                No activity yet
              </Text>
            ) : (
              activities.map((activity) => {
                const details = activity.details as any;
                return (
                  <View
                    key={activity.id}
                    className="flex-row items-start py-3 border-b border-gray-700"
                  >
                    <View
                      className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                        activity.type === 'mint'
                          ? 'bg-green-500/20'
                          : activity.type === 'forge'
                          ? 'bg-purple-500/20'
                          : 'bg-blue-500/20'
                      }`}
                    >
                      <Text className="text-lg">
                        {activity.type === 'mint'
                          ? '🎨'
                          : activity.type === 'forge'
                          ? '⚒️'
                          : '🎮'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-semibold capitalize">
                        {activity.type === 'session' && details?.category
                          ? `${details.category} Session`
                          : activity.type}
                      </Text>
                      {activity.type === 'session' && details?.score !== undefined && (
                        <Text className={`text-sm ${details.score === 10 ? 'text-green-400' : 'text-gray-300'}`}>
                          Score: {details.score}/10 {details.score === 10 ? '🏆' : ''}
                        </Text>
                      )}
                      <Text className="text-gray-400 text-xs mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    </ScrollView>
    </>
  );
};
