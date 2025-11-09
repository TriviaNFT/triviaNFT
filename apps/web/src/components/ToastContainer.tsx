import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useToast } from '../contexts/ToastContext';
import { Toast } from './ui/Toast';

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.select({
      web: 20,
      default: 60,
    }),
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 9999,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
});
