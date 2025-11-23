import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import type { LeaderboardEntry } from '@trivia-nft/shared';
import { getGlobalLeaderboard, getCategoryLeaderboard } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
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
  const { isMobile, isDesktop } = useResponsive();
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <ActivityIndicator size="large" color="#8A5CF6" />
        <Text style={{ color: '#9CA3AF', marginTop: 16, fontSize: 14 }}>
          Loading leaderboard...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: '#EF4444', textAlign: 'center', marginBottom: 16, fontSize: 14 }}>
          {error}
        </Text>
        <Pressable
          onPress={() => fetchLeaderboard()}
          style={{
            backgroundColor: '#8A5CF6',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 14 }}>
          No leaderboard entries yet. Be the first to play!
        </Text>
      </View>
    );
  }

  // Render mobile compact list view
  const renderMobileView = () => (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 12 }}>
        {entries.map((entry) => {
          const isCurrent = isCurrentPlayer(entry);
          
          return (
            <View
              key={`${entry.rank}-${entry.stakeKey}`}
              style={{
                padding: 16,
                marginBottom: 12,
                borderRadius: 12,
                backgroundColor: isCurrent
                  ? 'rgba(138, 92, 246, 0.2)'
                  : 'rgba(138, 92, 246, 0.05)',
                borderWidth: isCurrent ? 2 : 1,
                borderColor: isCurrent ? '#8A5CF6' : 'rgba(138, 92, 246, 0.2)',
              }}
            >
              {/* Top Row: Rank Badge and Username */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      entry.rank === 1
                        ? '#EAB308'
                        : entry.rank === 2
                        ? '#9CA3AF'
                        : entry.rank === 3
                        ? '#EA580C'
                        : 'rgba(138, 92, 246, 0.3)',
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      fontSize: 16,
                      color: entry.rank <= 3 ? '#1F2937' : '#FFFFFF',
                    }}
                  >
                    {entry.rank}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontWeight: '600',
                      color: isCurrent ? '#C4B5FD' : '#EAF2FF',
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {entry.username}
                    {isCurrent && ' (You)'}
                  </Text>
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 2 }}>
                    Avg: {(entry.avgAnswerTime / 1000).toFixed(1)}s
                  </Text>
                </View>
              </View>

              {/* Stats Grid */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                    POINTS
                  </Text>
                  <Text style={{ color: '#EAF2FF', fontWeight: '700', fontSize: 18 }}>
                    {entry.points}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                    NFTs
                  </Text>
                  <Text style={{ color: '#D1D5DB', fontWeight: '600', fontSize: 16 }}>
                    {entry.nftsMinted}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>
                    PERFECT
                  </Text>
                  <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 18 }}>
                    {entry.perfectScores}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Load More Button */}
        {hasMore && (
          <Pressable
            onPress={handleLoadMore}
            disabled={loadingMore}
            style={{
              backgroundColor: 'rgba(138, 92, 246, 0.1)',
              padding: 16,
              borderRadius: 8,
              marginTop: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(138, 92, 246, 0.3)',
              minHeight: 44,
              justifyContent: 'center',
            }}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color="#8A5CF6" />
            ) : (
              <Text style={{ color: '#8A5CF6', fontWeight: '600', fontSize: 15 }}>
                Load More
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </ScrollView>
  );

  // Render tablet/desktop table view
  const renderTableView = () => (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: isDesktop ? 24 : 16 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', width: isDesktop ? 64 : 56 }}>
            RANK
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', flex: 1 }}>
            PLAYER
          </Text>
          {isDesktop && (
            <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', width: 100, textAlign: 'right' }}>
              AVG TIME
            </Text>
          )}
          <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', width: isDesktop ? 80 : 64, textAlign: 'right' }}>
            POINTS
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', width: isDesktop ? 80 : 64, textAlign: 'right' }}>
            NFTs
          </Text>
          <Text style={{ color: '#6B7280', fontSize: 11, fontWeight: '700', width: isDesktop ? 80 : 64, textAlign: 'right' }}>
            PERFECT
          </Text>
        </View>

        {/* Entries */}
        {entries.map((entry) => {
          const isCurrent = isCurrentPlayer(entry);
          
          return (
            <View
              key={`${entry.rank}-${entry.stakeKey}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: isDesktop ? 20 : 16,
                marginBottom: 8,
                borderRadius: 12,
                backgroundColor: isCurrent
                  ? 'rgba(138, 92, 246, 0.2)'
                  : 'rgba(138, 92, 246, 0.05)',
                borderWidth: isCurrent ? 2 : 1,
                borderColor: isCurrent ? '#8A5CF6' : 'rgba(138, 92, 246, 0.2)',
              }}
            >
              {/* Rank */}
              <View style={{ width: isDesktop ? 64 : 56 }}>
                <View
                  style={{
                    width: isDesktop ? 44 : 40,
                    height: isDesktop ? 44 : 40,
                    borderRadius: isDesktop ? 22 : 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      entry.rank === 1
                        ? '#EAB308'
                        : entry.rank === 2
                        ? '#9CA3AF'
                        : entry.rank === 3
                        ? '#EA580C'
                        : 'rgba(138, 92, 246, 0.3)',
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '700',
                      fontSize: isDesktop ? 16 : 14,
                      color: entry.rank <= 3 ? '#1F2937' : '#FFFFFF',
                    }}
                  >
                    {entry.rank}
                  </Text>
                </View>
              </View>

              {/* Username */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: '600',
                    color: isCurrent ? '#C4B5FD' : '#EAF2FF',
                    fontSize: isDesktop ? 16 : 15,
                  }}
                  numberOfLines={1}
                >
                  {entry.username}
                  {isCurrent && ' (You)'}
                </Text>
                {!isDesktop && (
                  <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>
                    Avg: {(entry.avgAnswerTime / 1000).toFixed(1)}s
                  </Text>
                )}
              </View>

              {/* Average Time (Desktop only) */}
              {isDesktop && (
                <View style={{ width: 100 }}>
                  <Text style={{ color: '#9CA3AF', textAlign: 'right', fontSize: 14 }}>
                    {(entry.avgAnswerTime / 1000).toFixed(1)}s
                  </Text>
                </View>
              )}

              {/* Points */}
              <View style={{ width: isDesktop ? 80 : 64 }}>
                <Text style={{ color: '#EAF2FF', fontWeight: '700', textAlign: 'right', fontSize: isDesktop ? 16 : 15 }}>
                  {entry.points}
                </Text>
              </View>

              {/* NFTs Minted */}
              <View style={{ width: isDesktop ? 80 : 64 }}>
                <Text style={{ color: '#D1D5DB', textAlign: 'right', fontSize: isDesktop ? 15 : 14 }}>
                  {entry.nftsMinted}
                </Text>
              </View>

              {/* Perfect Scores */}
              <View style={{ width: isDesktop ? 80 : 64 }}>
                <Text style={{ color: '#10B981', textAlign: 'right', fontWeight: '600', fontSize: isDesktop ? 16 : 15 }}>
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
            style={{
              backgroundColor: 'rgba(138, 92, 246, 0.1)',
              padding: 16,
              borderRadius: 8,
              marginTop: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(138, 92, 246, 0.3)',
              minHeight: 44,
              justifyContent: 'center',
            }}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color="#8A5CF6" />
            ) : (
              <Text style={{ color: '#8A5CF6', fontWeight: '600', fontSize: 15 }}>
                Load More
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </ScrollView>
  );

  return isMobile ? renderMobileView() : renderTableView();
};
