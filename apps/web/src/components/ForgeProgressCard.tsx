import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { ForgeProgress } from '@trivia-nft/shared';
import { colors } from '../theme';

interface ForgeProgressCardProps {
  progress: ForgeProgress;
  onForge: () => void;
}

export const ForgeProgressCard: React.FC<ForgeProgressCardProps> = ({
  progress,
  onForge,
}) => {
  const getForgeTitle = () => {
    switch (progress.type) {
      case 'category':
        return `${progress.categoryId} Ultimate`;
      case 'master':
        return 'Master Ultimate';
      case 'season':
        return 'Seasonal Ultimate';
      default:
        return 'Ultimate NFT';
    }
  };

  const getForgeDescription = () => {
    switch (progress.type) {
      case 'category':
        return 'Forge 10 NFTs from the same category';
      case 'master':
        return 'Forge NFTs from 10 different categories';
      case 'season':
        return 'Forge 2 NFTs from each active category';
      default:
        return '';
    }
  };

  const progressPercentage = (progress.current / progress.required) * 100;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{getForgeTitle()}</Text>
        <Text style={styles.description}>{getForgeDescription()}</Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercentage}%`,
                backgroundColor: progress.canForge ? colors.success[500] : colors.primary[600],
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {progress.current}/{progress.required} NFTs
        </Text>
      </View>

      {progress.canForge && (
        <View style={styles.readySection}>
          <Text style={styles.readyText}>✓ Ready to forge!</Text>
          <Pressable
            style={({ pressed }) => [
              styles.forgeButton,
              pressed && styles.forgeButtonPressed,
            ]}
            onPress={onForge}
          >
            <Text style={styles.forgeButtonText}>Forge Now</Text>
          </Pressable>
        </View>
      )}

      {!progress.canForge && progress.current > 0 && (
        <View style={styles.nftPreview}>
          <Text style={styles.nftPreviewTitle}>Collected NFTs:</Text>
          <View style={styles.nftGrid}>
            {progress.nfts.slice(0, 6).map((nft) => (
              <View key={nft.id} style={styles.nftThumbnail}>
                <Text style={styles.nftThumbnailText} numberOfLines={1}>
                  {nft.metadata.name}
                </Text>
              </View>
            ))}
            {progress.nfts.length > 6 && (
              <View style={styles.nftThumbnail}>
                <Text style={styles.nftThumbnailText}>
                  +{progress.nfts.length - 6}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  readySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
  },
  readyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success[500],
    marginBottom: 12,
    textAlign: 'center',
  },
  forgeButton: {
    backgroundColor: colors.primary[600],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  forgeButtonPressed: {
    opacity: 0.8,
  },
  forgeButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  nftPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background.tertiary,
  },
  nftPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  nftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nftThumbnail: {
    width: 60,
    height: 60,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  nftThumbnailText: {
    fontSize: 10,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
