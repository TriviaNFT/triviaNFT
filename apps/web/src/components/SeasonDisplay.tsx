import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { getCurrentSeason } from '../services';
import { useCountdown } from '../hooks/useCountdown';

interface SeasonInfo {
  id: string;
  name: string;
  endsAt: string;
  gracePeriodEndsAt: string;
  activeCategories: string[];
}

interface SeasonDisplayProps {
  onSeasonChange?: (seasonId: string) => void;
}

export const SeasonDisplay: React.FC<SeasonDisplayProps> = ({ onSeasonChange }) => {
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const countdown = useCountdown(season?.endsAt || '');

  useEffect(() => {
    fetchCurrentSeason();
  }, []);

  const fetchCurrentSeason = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCurrentSeason();
      setSeason(response.season);
      onSeasonChange?.(response.season.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load season');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="bg-gray-800 rounded-lg p-4 mb-4">
        <ActivityIndicator size="small" color="#4C7DFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-gray-800 rounded-lg p-4 mb-4">
        <Text className="text-red-500 text-sm mb-2">{error}</Text>
        <Pressable onPress={fetchCurrentSeason}>
          <Text className="text-primary text-sm font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!season) {
    return null;
  }

  const isGracePeriod = new Date() > new Date(season.endsAt);

  return (
    <View className="bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-lg p-4 mb-4 border border-primary/30">
      {/* Season Name */}
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-white text-xl font-bold">{season.name}</Text>
          {isGracePeriod && (
            <Text className="text-yellow-400 text-xs font-semibold mt-1">
              Grace Period Active
            </Text>
          )}
        </View>
        <View className="bg-primary/30 px-3 py-1 rounded-full">
          <Text className="text-primary text-xs font-bold">ACTIVE</Text>
        </View>
      </View>

      {/* Countdown */}
      <View className="mb-3">
        <Text className="text-gray-400 text-xs mb-1">
          {isGracePeriod ? 'Grace Period Ends In:' : 'Season Ends In:'}
        </Text>
        <View className="flex-row items-center space-x-2">
          {countdown.formatted.hours >= 24 && (
            <View className="bg-gray-800 px-3 py-2 rounded-lg">
              <Text className="text-white text-lg font-bold">{Math.floor(countdown.formatted.hours / 24)}</Text>
              <Text className="text-gray-400 text-xs">Days</Text>
            </View>
          )}
          <View className="bg-gray-800 px-3 py-2 rounded-lg">
            <Text className="text-white text-lg font-bold">{countdown.formatted.hours % 24}</Text>
            <Text className="text-gray-400 text-xs">Hours</Text>
          </View>
          <View className="bg-gray-800 px-3 py-2 rounded-lg">
            <Text className="text-white text-lg font-bold">{countdown.formatted.minutes}</Text>
            <Text className="text-gray-400 text-xs">Mins</Text>
          </View>
          <View className="bg-gray-800 px-3 py-2 rounded-lg">
            <Text className="text-white text-lg font-bold">{countdown.formatted.seconds}</Text>
            <Text className="text-gray-400 text-xs">Secs</Text>
          </View>
        </View>
      </View>

      {/* Prize Info */}
      <View className="bg-gray-900/50 rounded-lg p-3 border border-yellow-500/30">
        <View className="flex-row items-center mb-1">
          <Text className="text-yellow-400 text-lg mr-2">🏆</Text>
          <Text className="text-white font-semibold">Season Prize</Text>
        </View>
        <Text className="text-gray-300 text-sm">
          Top player on the Global Ladder wins an exclusive developer-created NFT!
        </Text>
      </View>

      {/* Active Categories for Seasonal Forging */}
      {season.activeCategories.length > 0 && (
        <View className="mt-3">
          <Text className="text-gray-400 text-xs mb-2">
            Active Categories for Seasonal Forging:
          </Text>
          <View className="flex-row flex-wrap">
            {season.activeCategories.map((categoryId) => (
              <View
                key={categoryId}
                className="bg-purple-600/30 px-2 py-1 rounded mr-2 mb-2"
              >
                <Text className="text-purple-300 text-xs">{categoryId}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};
