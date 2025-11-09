import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import type { LeaderboardEntry } from '@trivia-nft/shared';
import { getGlobalLeaderboard, getCategoryLeaderboard } from '../services';
import { useAuth } from '../contexts/AuthContext';
// Note: For very large leaderboards (1000+ entries), consider using VirtualList
// from '../components/ui/VirtualList' for better performance

interface LeaderboardProps {
  type: 'global' | 'category';
  categoryId?: string;
  seasonId?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  type,
  categoryId,
  seasonId,
}) => {
  const { player } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 20;

  const fetchLeaderboard = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const currentOffset = isLoadMore ? offset : 0;
      
      const response =
        type === 'global'
          ? await getGlobalLeaderboard({ seasonId, limit, offset: currentOffset })
          : await getCategoryLeaderboard(categoryId!, { seasonId, limit, offset: currentOffset });

      if (isLoadMore) {
        setEntries((prev) => [...prev, ...response.leaderboard.entries]);
      } else {
        setEntries(response.leaderboard.entries);
      }
      
      setHasMore(response.leaderboard.hasMore);
      setOffset(currentOffset + limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [type, categoryId, seasonId]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchLeaderboard(true);
    }
  };

  const isCurrentPlayer = (entry: LeaderboardEntry) => {
    return player?.stakeKey === entry.stakeKey;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" color="#4C7DFF" />
        <Text className="text-gray-400 mt-4">Loading leaderboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-red-500 text-center mb-4">{error}</Text>
        <Pressable
          onPress={() => fetchLeaderboard()}
          className="bg-primary px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-gray-400 text-center">
          No leaderboard entries yet. Be the first to play!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1">
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center mb-4 px-2">
          <Text className="text-gray-400 text-xs font-semibold w-12">RANK</Text>
          <Text className="text-gray-400 text-xs font-semibold flex-1">PLAYER</Text>
          <Text className="text-gray-400 text-xs font-semibold w-16 text-right">POINTS</Text>
          <Text className="text-gray-400 text-xs font-semibold w-16 text-right">NFTs</Text>
          <Text className="text-gray-400 text-xs font-semibold w-16 text-right">PERFECT</Text>
        </View>

        {/* Entries */}
        {entries.map((entry) => {
          const isCurrent = isCurrentPlayer(entry);
          
          return (
            <View
              key={`${entry.rank}-${entry.stakeKey}`}
              className={`flex-row items-center p-4 mb-2 rounded-lg ${
                isCurrent ? 'bg-primary/20 border-2 border-primary' : 'bg-gray-800'
              }`}
            >
              {/* Rank */}
              <View className="w-12">
                <View
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    entry.rank === 1
                      ? 'bg-yellow-500'
                      : entry.rank === 2
                      ? 'bg-gray-400'
                      : entry.rank === 3
                      ? 'bg-orange-600'
                      : 'bg-gray-700'
                  }`}
                >
                  <Text
                    className={`font-bold text-sm ${
                      entry.rank <= 3 ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    {entry.rank}
                  </Text>
                </View>
              </View>

              {/* Username */}
              <View className="flex-1">
                <Text
                  className={`font-semibold ${
                    isCurrent ? 'text-primary' : 'text-white'
                  }`}
                  numberOfLines={1}
                >
                  {entry.username}
                  {isCurrent && ' (You)'}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  Avg: {(entry.avgAnswerTime / 1000).toFixed(1)}s
                </Text>
              </View>

              {/* Points */}
              <View className="w-16">
                <Text className="text-white font-bold text-right">
                  {entry.points}
                </Text>
              </View>

              {/* NFTs Minted */}
              <View className="w-16">
                <Text className="text-gray-300 text-right">
                  {entry.nftsMinted}
                </Text>
              </View>

              {/* Perfect Scores */}
              <View className="w-16">
                <Text className="text-green-400 text-right font-semibold">
                  {entry.perfectScores}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Load More Button */}
        {hasMore && (
          <Pressable
            onPress={handleLoadMore}
            disabled={loadingMore}
            className="bg-gray-800 p-4 rounded-lg mt-4 items-center"
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color="#4C7DFF" />
            ) : (
              <Text className="text-primary font-semibold">Load More</Text>
            )}
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
};
