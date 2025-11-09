import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ForgeProgressDisplay } from './ForgeProgressDisplay';
import { ForgeConfirmationDialog } from './ForgeConfirmationDialog';
import { ForgeExecutionInterface } from './ForgeExecutionInterface';
import { forgeService } from '../services';
import type { ForgeProgress, NFT } from '@trivia-nft/shared';
import { colors } from '../theme';

interface ForgeInterfaceProps {
  onForgeComplete?: (ultimateNFT: NFT) => void;
}

export const ForgeInterface: React.FC<ForgeInterfaceProps> = ({
  onForgeComplete,
}) => {
  const [selectedProgress, setSelectedProgress] = useState<ForgeProgress | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const [forgeOperationId, setForgeOperationId] = useState<string | null>(null);

  const handleForgeInitiate = (progress: ForgeProgress) => {
    setSelectedProgress(progress);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!selectedProgress) return;

    try {
      setShowConfirmation(false);

      // Initiate forge operation
      const response = await forgeService.initiateForge({
        type: selectedProgress.type,
        categoryId: selectedProgress.categoryId,
        seasonId: selectedProgress.seasonId,
        inputFingerprints: selectedProgress.nfts.map((nft) => nft.assetFingerprint),
      });

      setForgeOperationId(response.forgeOperation.id);
      setShowExecution(true);
    } catch (error) {
      console.error('Failed to initiate forge:', error);
      // TODO: Show error toast
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setSelectedProgress(null);
  };

  const handleExecutionClose = () => {
    setShowExecution(false);
    setForgeOperationId(null);
    setSelectedProgress(null);
  };

  const handleSuccess = (ultimateNFT: NFT) => {
    if (onForgeComplete) {
      onForgeComplete(ultimateNFT);
    }
  };

  return (
    <View style={styles.container}>
      <ForgeProgressDisplay onForgeInitiate={handleForgeInitiate} />

      <ForgeConfirmationDialog
        visible={showConfirmation}
        progress={selectedProgress}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <ForgeExecutionInterface
        visible={showExecution}
        forgeOperationId={forgeOperationId}
        onClose={handleExecutionClose}
        onSuccess={handleSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
});
