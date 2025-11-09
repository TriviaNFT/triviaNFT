import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import type { ForgeProgress } from '@trivia-nft/shared';
import { colors } from '../theme';

interface ForgeConfirmationDialogProps {
  visible: boolean;
  progress: ForgeProgress | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ForgeConfirmationDialog: React.FC<ForgeConfirmationDialogProps> = ({
  visible,
  progress,
  onConfirm,
  onCancel,
}) => {
  if (!progress) return null;

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

  const getUltimateDescription = () => {
    switch (progress.type) {
      case 'category':
        return `A rare Ultimate NFT representing mastery of ${progress.categoryId} trivia`;
      case 'master':
        return 'The ultimate achievement - mastery across all trivia categories';
      case 'season':
        return 'An exclusive seasonal Ultimate NFT available only this season';
      default:
        return '';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Warning Header */}
            <View style={styles.warningHeader}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>Confirm Forging</Text>
            </View>

            {/* Warning Message */}
            <View style={styles.warningSection}>
              <Text style={styles.warningText}>
                Forging will consume your NFTs permanently. This action cannot be undone.
              </Text>
            </View>

            {/* NFTs to be consumed */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                NFTs to be consumed ({progress.nfts.length}):
              </Text>
              <View style={styles.nftList}>
                {progress.nfts.map((nft) => (
                  <View key={nft.id} style={styles.nftItem}>
                    <View style={styles.nftIcon}>
                      <Text style={styles.nftIconText}>🎴</Text>
                    </View>
                    <View style={styles.nftInfo}>
                      <Text style={styles.nftName} numberOfLines={1}>
                        {nft.metadata.name}
                      </Text>
                      <Text style={styles.nftCategory} numberOfLines={1}>
                        {nft.categoryId || 'Unknown'}
                      </Text>
                    </View>
                    <Text style={styles.consumeIcon}>🔥</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Ultimate NFT Preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>You will receive:</Text>
              <View style={styles.ultimatePreview}>
                <View style={styles.ultimateIcon}>
                  <Text style={styles.ultimateIconText}>✨</Text>
                </View>
                <Text style={styles.ultimateName}>{getForgeTitle()}</Text>
                <Text style={styles.ultimateDescription}>
                  {getUltimateDescription()}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.cancelButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.confirmButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onConfirm}
              >
                <Text style={styles.confirmButtonText}>Confirm Forge</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  },
  scrollContent: {
    padding: 24,
  },
  warningHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  warningSection: {
    backgroundColor: colors.warning[500] + '20',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.warning[500],
  },
  warningText: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  nftList: {
    gap: 8,
  },
  nftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  nftIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nftIconText: {
    fontSize: 24,
  },
  nftInfo: {
    flex: 1,
  },
  nftName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  nftCategory: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  consumeIcon: {
    fontSize: 20,
  },
  ultimatePreview: {
    backgroundColor: colors.primary[600] + '20',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary[600],
  },
  ultimateIcon: {
    width: 80,
    height: 80,
    backgroundColor: colors.primary[600],
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  ultimateIconText: {
    fontSize: 40,
  },
  ultimateName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  ultimateDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  cancelButton: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  confirmButton: {
    backgroundColor: colors.primary[600],
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
