import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { forgeService } from '../services';
import type { ForgeOperation, NFT } from '@trivia-nft/shared';
import { colors } from '../theme';

interface ForgeExecutionInterfaceProps {
  visible: boolean;
  forgeOperationId: string | null;
  onClose: () => void;
  onSuccess: (ultimateNFT: NFT) => void;
}

interface ForgeStep {
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  description: string;
}

export const ForgeExecutionInterface: React.FC<ForgeExecutionInterfaceProps> = ({
  visible,
  forgeOperationId,
  onClose,
  onSuccess,
}) => {
  const [forgeOperation, setForgeOperation] = useState<ForgeOperation | null>(null);
  const [ultimateNFT, setUltimateNFT] = useState<NFT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<ForgeStep[]>([
    {
      name: 'Validating Ownership',
      status: 'pending',
      description: 'Verifying NFT ownership on blockchain',
    },
    {
      name: 'Building Burn Transaction',
      status: 'pending',
      description: 'Creating transaction to burn input NFTs',
    },
    {
      name: 'Submitting Burn',
      status: 'pending',
      description: 'Submitting burn transaction to blockchain',
    },
    {
      name: 'Confirming Burn',
      status: 'pending',
      description: 'Waiting for burn confirmation',
    },
    {
      name: 'Minting Ultimate NFT',
      status: 'pending',
      description: 'Creating your Ultimate NFT',
    },
    {
      name: 'Confirming Mint',
      status: 'pending',
      description: 'Waiting for mint confirmation',
    },
    {
      name: 'Updating Records',
      status: 'pending',
      description: 'Finalizing forge operation',
    },
  ]);

  const pollForgeStatus = async () => {
    if (!forgeOperationId) return;

    try {
      const response = await forgeService.getForgeStatus(forgeOperationId);
      setForgeOperation(response.forgeOperation);

      // Update steps based on operation status
      if (response.forgeOperation.status === 'confirmed' && response.ultimateNFT) {
        setUltimateNFT(response.ultimateNFT);
        setSteps((prev) =>
          prev.map((step) => ({ ...step, status: 'completed' }))
        );
        onSuccess(response.ultimateNFT);
      } else if (response.forgeOperation.status === 'failed') {
        setError(response.forgeOperation.error || 'Forge operation failed');
        setSteps((prev) =>
          prev.map((step) =>
            step.status === 'in-progress' ? { ...step, status: 'failed' } : step
          )
        );
      } else {
        // Update steps based on transaction hashes
        updateStepsFromOperation(response.forgeOperation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check forge status');
    }
  };

  const updateStepsFromOperation = (operation: ForgeOperation) => {
    setSteps((prev) => {
      const newSteps = [...prev];

      if (operation.burnTxHash) {
        // Burn transaction submitted
        newSteps[0].status = 'completed'; // Validation
        newSteps[1].status = 'completed'; // Build burn
        newSteps[2].status = 'completed'; // Submit burn
        newSteps[3].status = 'in-progress'; // Confirming burn
      }

      if (operation.outputAssetFingerprint) {
        // Mint transaction submitted (using outputAssetFingerprint as proxy for mint completion)
        newSteps[3].status = 'completed'; // Burn confirmed
        newSteps[4].status = 'completed'; // Minting
        newSteps[5].status = 'in-progress'; // Confirming mint
      }

      if (operation.status === 'confirmed') {
        // All done
        newSteps[5].status = 'completed'; // Mint confirmed
        newSteps[6].status = 'completed'; // Records updated
      }

      // Set first pending step to in-progress
      const firstPending = newSteps.findIndex((s) => s.status === 'pending');
      if (firstPending !== -1 && operation.status === 'pending') {
        newSteps[firstPending].status = 'in-progress';
      }

      return newSteps;
    });
  };

  useEffect(() => {
    if (visible && forgeOperationId) {
      // Initial poll
      pollForgeStatus();

      // Poll every 5 seconds
      const interval = setInterval(pollForgeStatus, 5000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [visible, forgeOperationId]);

  const handleRetry = () => {
    setError(null);
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        status: step.status === 'failed' ? 'pending' : step.status,
      }))
    );
    pollForgeStatus();
  };

  const getStepIcon = (status: ForgeStep['status']): string => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in-progress':
        return '⟳';
      case 'failed':
        return '✗';
      case 'pending':
        return '○';
      default:
        return '○';
    }
  };

  const getStepColor = (status: ForgeStep['status']): string => {
    switch (status) {
      case 'completed':
        return colors.success[500];
      case 'in-progress':
        return colors.primary[600];
      case 'failed':
        return colors.error[500];
      case 'pending':
        return colors.text.secondary;
      default:
        return colors.text.secondary;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={ultimateNFT || error ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {ultimateNFT
                  ? '🎉 Forge Complete!'
                  : error
                  ? '❌ Forge Failed'
                  : '⚒️ Forging in Progress'}
              </Text>
              {!ultimateNFT && !error && (
                <Text style={styles.headerSubtitle}>
                  Please wait while we forge your Ultimate NFT...
                </Text>
              )}
            </View>

            {/* Steps */}
            {!ultimateNFT && !error && (
              <View style={styles.stepsContainer}>
                {steps.map((step, index) => (
                  <View key={index} style={styles.step}>
                    <View
                      style={[
                        styles.stepIcon,
                        { borderColor: getStepColor(step.status) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepIconText,
                          { color: getStepColor(step.status) },
                        ]}
                      >
                        {getStepIcon(step.status)}
                      </Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepName}>{step.name}</Text>
                      <Text style={styles.stepDescription}>{step.description}</Text>
                    </View>
                    {step.status === 'in-progress' && (
                      <ActivityIndicator size="small" color={colors.primary[600]} />
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Transaction Hashes */}
            {forgeOperation && !error && (
              <View style={styles.txSection}>
                {forgeOperation.burnTxHash && (
                  <View style={styles.txItem}>
                    <Text style={styles.txLabel}>Burn Transaction:</Text>
                    <Text style={styles.txHash} numberOfLines={1}>
                      {forgeOperation.burnTxHash}
                    </Text>
                  </View>
                )}
                {forgeOperation.outputAssetFingerprint && (
                  <View style={styles.txItem}>
                    <Text style={styles.txLabel}>Ultimate NFT:</Text>
                    <Text style={styles.txHash} numberOfLines={1}>
                      {forgeOperation.outputAssetFingerprint}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Success State */}
            {ultimateNFT && (
              <View style={styles.successSection}>
                <View style={styles.ultimateIcon}>
                  <Text style={styles.ultimateIconText}>✨</Text>
                </View>
                <Text style={styles.ultimateName}>{ultimateNFT.metadata.name}</Text>
                <Text style={styles.ultimateDescription}>
                  {ultimateNFT.metadata.description}
                </Text>
                {ultimateNFT.metadata.attributes.length > 0 && (
                  <View style={styles.attributes}>
                    {ultimateNFT.metadata.attributes.map((attr, index) => (
                      <View key={index} style={styles.attribute}>
                        <Text style={styles.attributeLabel}>{attr.trait_type}:</Text>
                        <Text style={styles.attributeValue}>{attr.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Error State */}
            {error && (
              <View style={styles.errorSection}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleRetry}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {/* Close Button */}
            {(ultimateNFT || error) && (
              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onClose}
              >
                <Text style={styles.closeButtonText}>
                  {ultimateNFT ? 'View in Inventory' : 'Close'}
                </Text>
              </Pressable>
            )}
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  stepsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  txSection: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  txItem: {
    gap: 4,
  },
  txLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  txHash: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.text.primary,
  },
  successSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  ultimateIcon: {
    width: 100,
    height: 100,
    backgroundColor: colors.primary[600],
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  ultimateIconText: {
    fontSize: 50,
  },
  ultimateName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  ultimateDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  attributes: {
    width: '100%',
    gap: 8,
  },
  attribute: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background.tertiary,
    borderRadius: 6,
  },
  attributeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  attributeValue: {
    fontSize: 14,
    color: colors.text.primary,
  },
  errorSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  errorText: {
    fontSize: 16,
    color: colors.error[500],
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary[600],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
