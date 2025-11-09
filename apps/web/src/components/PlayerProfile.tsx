import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { getProfile, getPlayerNFTs, getPlayerActivity } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useCountdown } from '../hooks/useCountdown';
import type { NFT, Activity } from '@trivia-nft/shared';
import { NFTCard } from './NFTCard';

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

export const PlayerProfile: React.FC = () => {
  const {} = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'nfts' | 'activity'>('overview');

  const resetCountdown = useCountdown(profile?.resetAt || '');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const [profileRes, nftsRes, activityRes] = await Promise.all([
        getProfile(),
        getPlayerNFTs({ limit: 50 }),
        getPlayerActivity({ limit: 20 }),
      ]);

      // Transform profile response
      setProfile({
        username: profileRes.player.username || 'Anonymous',
        stakeKey: profileRes.player.stakeKey || '',
        remainingPlays: 10, // This should come from API
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mock reset time
        stats: profileRes.stats,
        perfectScoresByCategory: {}, // This should come from API
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
    <ScrollView className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="bg-gradient-to-b from-primary/20 to-transparent p-6">
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
          <Text className="text-primary text-lg font-bold">
            {profile.remainingPlays}/10
          </Text>
        </View>
        <View className="bg-gray-700 h-2 rounded-full overflow-hidden">
          <View
            className="bg-primary h-full"
            style={{ width: `${(profile.remainingPlays / 10) * 100}%` }}
          />
        </View>
        <Text className="text-gray-400 text-xs mt-2">
          Resets in: {resetCountdown.formatted.hours}h {resetCountdown.formatted.minutes}m{' '}
          {resetCountdown.formatted.seconds}s
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mx-4 mb-4 bg-gray-800 rounded-lg p-1">
        <Pressable
          onPress={() => setActiveTab('overview')}
          className={`flex-1 py-2 rounded-lg ${
            activeTab === 'overview' ? 'bg-primary' : ''
          }`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'overview' ? 'text-white' : 'text-gray-400'
            }`}
          >
            Overview
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('nfts')}
          className={`flex-1 py-2 rounded-lg ${
            activeTab === 'nfts' ? 'bg-primary' : ''
          }`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'nfts' ? 'text-white' : 'text-gray-400'
            }`}
          >
            NFTs ({nfts.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('activity')}
          className={`flex-1 py-2 rounded-lg ${
            activeTab === 'activity' ? 'bg-primary' : ''
          }`}
        >
          <Text
            className={`text-center font-semibold ${
              activeTab === 'activity' ? 'text-white' : 'text-gray-400'
            }`}
          >
            Activity
          </Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      <View className="px-4 pb-6">
        {activeTab === 'overview' && (
          <View>
            {/* Stats Grid */}
            <View className="flex-row flex-wrap -mx-2 mb-4">
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-gray-800 rounded-lg p-4">
                  <Text className="text-gray-400 text-xs mb-1">Total Sessions</Text>
                  <Text className="text-white text-2xl font-bold">
                    {profile.stats.totalSessions}
                  </Text>
                </View>
              </View>
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-gray-800 rounded-lg p-4">
                  <Text className="text-gray-400 text-xs mb-1">Perfect Scores</Text>
                  <Text className="text-green-400 text-2xl font-bold">
                    {profile.stats.perfectScores}
                  </Text>
                </View>
              </View>
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-gray-800 rounded-lg p-4">
                  <Text className="text-gray-400 text-xs mb-1">Total NFTs</Text>
                  <Text className="text-purple-400 text-2xl font-bold">
                    {profile.stats.totalNFTs}
                  </Text>
                </View>
              </View>
              <View className="w-1/2 px-2 mb-4">
                <View className="bg-gray-800 rounded-lg p-4">
                  <Text className="text-gray-400 text-xs mb-1">Season Points</Text>
                  <Text className="text-primary text-2xl font-bold">
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
              <View className="flex-row flex-wrap -mx-2">
                {nfts.map((nft) => (
                  <View key={nft.id} className="w-1/2 px-2 mb-4">
                    <NFTCard nft={nft} />
                  </View>
                ))}
              </View>
            )}
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
              activities.map((activity) => (
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
                      {activity.type}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};
