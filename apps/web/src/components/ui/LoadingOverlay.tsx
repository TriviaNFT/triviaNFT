import React from 'react';
import { View, Text, StyleSheet, Modal, ViewStyle } from 'react-native';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  transparent?: boolean;
  style?: ViewStyle;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  transparent = false,
  style,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View
        style={[
          styles.overlay,
          transparent && styles.overlayTransparent,
          style,
        ]}
      >
        <View style={styles.content}>
          <LoadingSpinner size="large" color="#6366f1" />
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

interface InlineLoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message,
  size = 'medium',
  style,
}) => {
  return (
    <View style={[styles.inlineContainer, style]}>
      <LoadingSpinner size={size} color="#6366f1" />
      {message && <Text style={styles.inlineMessage}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 30, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTransparent: {
    backgroundColor: 'rgba(15, 15, 30, 0.7)',
  },
  content: {
    alignItems: 'center',
    padding: 32,
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  },
  inlineContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  inlineMessage: {
    fontSize: 14,
    color: '#a0a0b0',
    textAlign: 'center',
  },
});
