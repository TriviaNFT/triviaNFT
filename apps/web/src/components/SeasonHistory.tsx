import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { getSeasonStandings } from '../services';
import type { LeaderboardEntry } from '@trivia-nft/shared';

interface Season {
  id: string;
  name: string;
  endsAt: string;
}

interface SeasonHistoryProps {
  pastSeasons: Season[];
  currentPlayerStakeKey?: string;
}

export const SeasonHistory: React.FC<SeasonHistoryProps> = ({
  pastSeasons,
  currentPlayerStakeKey,
}) => {
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [standings, setStandings] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeasonStandings = async (seasonId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getSeasonStandings(seasonId, { limit: 10 });
      setStandings(response.leaderboard.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load standings');
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonSelect = (seasonId: string) => {
    if (selectedSeason === seasonId) {
      setSelectedSeason(null);
      setStandings([]);
    } else {
      setSelectedSeason(seasonId);
      fetchSeasonStandings(seasonId);
    }
  };

  const getPlayerRank = (seasonId: string): number | null => {
    if (selectedSeason !== seasonId || !currentPlayerStakeKey) return null;
    const entry = standings.find((e) => e.stakeKey === currentPlayerStakeKey);
    return entry?.rank || null;
  };

  if (pastSeasons.length === 0) {
    return (
      <View className="bg-gray-800 rounded-lg p-6">
        <Text className="text-gray-400 text-center">
          No past seasons yet. This is the first season!
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-gray-800 rounded-lg p-4">
      <Text className="text-white text-lg font-bold mb-4">Past Seasons</Text>

      <ScrollView>
        {pastSeasons.map((season) => {
          const isExpanded = selectedSeason === season.id;
          const playerRank = getPlayerRank(season.id);

          return (
            <View key={season.id} className="mb-3">
              <Pressable
                onPress={() => handleSeasonSelect(season.id)}
                className="bg-gray-900 rounded-lg p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white font-semibold">{season.name}</Text>
                    <Text className="text-gray-400 text-xs mt-1">
                      Ended: {new Date(season.endsAt).toLocaleDateString()}
                    </Text>
                    {playerRank && (
                      <Text className="text-primary text-sm mt-1 font-semibold">
                        Your Rank: #{playerRank}
                      </Text>
                    )}
                  </View>
                  <Text className="text-gray-400 text-xl">
                    {isExpanded ? '▼' : '▶'}
                  </Text>
                </View>
              </Pressable>

              {/* Expanded Standings */}
              {isExpanded && (
                <View className="mt-2 bg-gray-900/50 rounded-lg p-3">
                  {loading ? (
                    <View className="py-4">
                      <ActivityIndicator size="small" color="#4C7DFF" />
                    </View>
                  ) : error ? (
                    <Text className="text-red-500 text-sm text-center">{error}</Text>
                  ) : standings.length === 0 ? (
                    <Text className="text-gray-400 text-sm text-center">
                      No standings available
                    </Text>
                  ) : (
                    <>
                      <Text className="text-gray-400 text-xs font-semibold mb-3">
                        TOP 10 FINAL STANDINGS
                      </Text>
                      {standings.map((entry) => (
                        <View
                          key={entry.stakeKey}
                          className={`flex-row items-center p-2 mb-1 rounded ${
                            entry.stakeKey === currentPlayerStakeKey
                              ? 'bg-primary/20'
                              : ''
                          }`}
                        >
                          <View
                            className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
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
                              className={`text-xs font-bold ${
                                entry.rank <= 3 ? 'text-gray-900' : 'text-white'
                              }`}
                            >
                              {entry.rank}
                            </Text>
                          </View>
                          <Text
                            className={`flex-1 text-sm ${
                              entry.stakeKey === currentPlayerStakeKey
                                ? 'text-primary font-semibold'
                                : 'text-white'
                            }`}
                            numberOfLines={1}
                          >
                            {entry.username}
                          </Text>
                          <Text className="text-white text-sm font-semibold">
                            {entry.points}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
