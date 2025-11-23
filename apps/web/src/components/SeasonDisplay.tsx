import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { getCurrentSeason } from '../services';
import { useCountdown } from '../hooks/useCountdown';
import { useResponsive } from '../hooks/useResponsive';

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
  const { isMobile, isDesktop } = useResponsive();
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
        <Pressable 
          onPress={fetchCurrentSeason}
          accessibilityRole="button"
          accessibilityLabel="Retry loading season information"
        >
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
    <View 
      style={{
        backgroundColor: 'rgba(138, 92, 246, 0.2)',
        borderRadius: 12,
        padding: isMobile ? 16 : isDesktop ? 24 : 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(138, 92, 246, 0.3)',
      }}
    >
      {/* Season Name */}
      <View 
        style={{
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? 16 : 20,
        }}
      >
        <View style={{ marginBottom: isMobile ? 8 : 0 }}>
          <Text 
            style={{
              color: '#FFFFFF',
              fontSize: isMobile ? 20 : isDesktop ? 24 : 22,
              fontWeight: '700',
            }}
          >
            {season.name}
          </Text>
          {isGracePeriod && (
            <Text 
              style={{
                color: '#FBBF24',
                fontSize: 12,
                fontWeight: '600',
                marginTop: 4,
              }}
            >
              Grace Period Active
            </Text>
          )}
        </View>
        <View 
          style={{
            backgroundColor: 'rgba(138, 92, 246, 0.3)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            minHeight: 32,
            justifyContent: 'center',
          }}
        >
          <Text 
            style={{
              color: '#8A5CF6',
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            ACTIVE
          </Text>
        </View>
      </View>

      {/* Countdown */}
      <View style={{ marginBottom: isMobile ? 16 : 20 }}>
        <Text 
          style={{
            color: '#9CA3AF',
            fontSize: 12,
            marginBottom: 8,
          }}
        >
          {isGracePeriod ? 'Grace Period Ends In:' : 'Season Ends In:'}
        </Text>
        <View 
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: isMobile ? 8 : 12,
          }}
        >
          {countdown.formatted.hours >= 24 && (
            <View 
              style={{
                backgroundColor: '#1F2937',
                paddingHorizontal: isMobile ? 12 : 16,
                paddingVertical: isMobile ? 10 : 12,
                borderRadius: 8,
                minWidth: isMobile ? 60 : 70,
                alignItems: 'center',
              }}
            >
              <Text 
                style={{
                  color: '#FFFFFF',
                  fontSize: isMobile ? 18 : 20,
                  fontWeight: '700',
                }}
              >
                {Math.floor(countdown.formatted.hours / 24) || 0}
              </Text>
              <Text 
                style={{
                  color: '#9CA3AF',
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Days
              </Text>
            </View>
          )}
          <View 
            style={{
              backgroundColor: '#1F2937',
              paddingHorizontal: isMobile ? 12 : 16,
              paddingVertical: isMobile ? 10 : 12,
              borderRadius: 8,
              minWidth: isMobile ? 60 : 70,
              alignItems: 'center',
            }}
          >
            <Text 
              style={{
                color: '#FFFFFF',
                fontSize: isMobile ? 18 : 20,
                fontWeight: '700',
              }}
            >
              {(countdown.formatted.hours % 24) || 0}
            </Text>
            <Text 
              style={{
                color: '#9CA3AF',
                fontSize: 11,
                marginTop: 2,
              }}
            >
              Hours
            </Text>
          </View>
          <View 
            style={{
              backgroundColor: '#1F2937',
              paddingHorizontal: isMobile ? 12 : 16,
              paddingVertical: isMobile ? 10 : 12,
              borderRadius: 8,
              minWidth: isMobile ? 60 : 70,
              alignItems: 'center',
            }}
          >
            <Text 
              style={{
                color: '#FFFFFF',
                fontSize: isMobile ? 18 : 20,
                fontWeight: '700',
              }}
            >
              {countdown.formatted.minutes || 0}
            </Text>
            <Text 
              style={{
                color: '#9CA3AF',
                fontSize: 11,
                marginTop: 2,
              }}
            >
              Mins
            </Text>
          </View>
          <View 
            style={{
              backgroundColor: '#1F2937',
              paddingHorizontal: isMobile ? 12 : 16,
              paddingVertical: isMobile ? 10 : 12,
              borderRadius: 8,
              minWidth: isMobile ? 60 : 70,
              alignItems: 'center',
            }}
          >
            <Text 
              style={{
                color: '#FFFFFF',
                fontSize: isMobile ? 18 : 20,
                fontWeight: '700',
              }}
            >
              {countdown.formatted.seconds || 0}
            </Text>
            <Text 
              style={{
                color: '#9CA3AF',
                fontSize: 11,
                marginTop: 2,
              }}
            >
              Secs
            </Text>
          </View>
        </View>
      </View>

      {/* Prize Info */}
      <View 
        style={{
          backgroundColor: 'rgba(17, 24, 39, 0.5)',
          borderRadius: 8,
          padding: isMobile ? 12 : 16,
          borderWidth: 1,
          borderColor: 'rgba(234, 179, 8, 0.3)',
        }}
      >
        <View 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 18, marginRight: 8 }}>🏆</Text>
          <Text 
            style={{
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: isMobile ? 14 : 15,
            }}
          >
            Season Prize
          </Text>
        </View>
        <Text 
          style={{
            color: '#D1D5DB',
            fontSize: isMobile ? 13 : 14,
            lineHeight: isMobile ? 18 : 20,
          }}
        >
          Top player on the Global Ladder wins an exclusive developer-created NFT!
        </Text>
      </View>

      {/* Active Categories for Seasonal Forging */}
      {season.activeCategories.length > 0 && (
        <View style={{ marginTop: isMobile ? 16 : 20 }}>
          <Text 
            style={{
              color: '#9CA3AF',
              fontSize: 12,
              marginBottom: 8,
            }}
          >
            Active Categories for Seasonal Forging:
          </Text>
          <View 
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {season.activeCategories.map((categoryId) => (
              <View
                key={categoryId}
                style={{
                  backgroundColor: 'rgba(147, 51, 234, 0.3)',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  minHeight: 28,
                  justifyContent: 'center',
                }}
              >
                <Text 
                  style={{
                    color: '#C4B5FD',
                    fontSize: 12,
                  }}
                >
                  {categoryId}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};
