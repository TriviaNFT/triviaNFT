import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { forgeService } from '../services';
import { ForgeProgressCard } from './ForgeProgressCard';
import type { ForgeProgress } from '@trivia-nft/shared';
import { colors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface ForgeProgressDisplayProps {
  onForgeInitiate: (progress: ForgeProgress) => void;
}

export const ForgeProgressDisplay: React.FC<ForgeProgressDisplayProps> = ({
  onForgeInitiate,
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [progressList, setProgressList] = useState<ForgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForgeProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await forgeService.getForgeProgress();
      setProgressList(response.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forge progress');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForgeProgress();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading forge progress...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (progressList.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          No forging progress yet. Collect NFTs to start forging!
        </Text>
      </View>
    );
  }

  // Responsive grid layout for progress cards
  const gridColumns = isDesktop ? 2 : 1;
  const containerPadding = isMobile ? 12 : 16;
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, { padding: containerPadding }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { fontSize: isMobile ? 20 : 24 }]}>Forge Progress</Text>
        <Text style={[styles.headerSubtitle, { fontSize: isMobile ? 14 : 16 }]}>
          Combine NFTs to create powerful Ultimate NFTs
        </Text>
      </View>

      {/* Responsive grid for progress cards */}
      <View style={isDesktop ? styles.gridContainer : undefined}>
        {progressList.map((progress, index) => (
          <View 
            key={`${progress.type}-${progress.categoryId || progress.seasonId || index}`}
            style={isDesktop ? styles.gridItem : undefined}
          >
            <ForgeProgressCard
              progress={progress}
              onForge={() => onForgeInitiate(progress)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  contentContainer: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background.DEFAULT,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error[500],
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
