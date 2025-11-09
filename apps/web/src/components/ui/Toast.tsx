import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Toast as ToastType, useToast } from '../../contexts/ToastContext';

interface ToastProps {
  toast: ToastType;
}

const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const TOAST_COLORS = {
  success: {
    bg: '#10b981',
    border: '#059669',
    text: '#ffffff',
  },
  error: {
    bg: '#ef4444',
    border: '#dc2626',
    text: '#ffffff',
  },
  warning: {
    bg: '#f59e0b',
    border: '#d97706',
    text: '#ffffff',
  },
  info: {
    bg: '#3b82f6',
    border: '#2563eb',
    text: '#ffffff',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  const { hideToast } = useToast();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const handleClose = () => {
    // Slide out animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast(toast.id);
    });
  };

  const colors = TOAST_COLORS[toast.type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.icon, { color: colors.text }]}>
          {TOAST_ICONS[toast.type]}
        </Text>
        <Text style={[styles.message, { color: colors.text }]}>
          {toast.message}
        </Text>
      </View>

      <View style={styles.actions}>
        {toast.action && (
          <Pressable
            onPress={() => {
              toast.action?.onPress();
              handleClose();
            }}
            style={styles.actionButton}
          >
            <Text style={[styles.actionText, { color: colors.text }]}>
              {toast.action.label}
            </Text>
          </Pressable>
        )}
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  message: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  closeButton: {
    padding: 4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
