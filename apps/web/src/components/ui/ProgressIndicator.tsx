import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LoadingSpinner } from './LoadingSpinner';

interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  style?: ViewStyle;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {steps.map((step, index) => (
        <View key={index} style={styles.step}>
          <View style={styles.stepIndicator}>
            {step.status === 'active' && (
              <LoadingSpinner size="small" color="#6366f1" />
            )}
            {step.status === 'completed' && (
              <View style={styles.completedIcon}>
                <Text style={styles.completedText}>✓</Text>
              </View>
            )}
            {step.status === 'error' && (
              <View style={styles.errorIcon}>
                <Text style={styles.errorText}>✕</Text>
              </View>
            )}
            {step.status === 'pending' && (
              <View style={styles.pendingIcon} />
            )}
          </View>
          
          <View style={styles.stepContent}>
            <Text
              style={[
                styles.stepLabel,
                step.status === 'active' && styles.stepLabelActive,
                step.status === 'completed' && styles.stepLabelCompleted,
                step.status === 'error' && styles.stepLabelError,
              ]}
            >
              {step.label}
            </Text>
          </View>

          {index < steps.length - 1 && (
            <View
              style={[
                styles.connector,
                (step.status === 'completed' || step.status === 'error') &&
                  styles.connectorCompleted,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
};

interface LinearProgressProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: string;
  style?: ViewStyle;
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
  progress,
  label,
  showPercentage = true,
  color = '#6366f1',
  style,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={[styles.linearContainer, style]}>
      {(label || showPercentage) && (
        <View style={styles.linearHeader}>
          {label && <Text style={styles.linearLabel}>{label}</Text>}
          {showPercentage && (
            <Text style={styles.linearPercentage}>{Math.round(clampedProgress)}%</Text>
          )}
        </View>
      )}
      <View style={styles.linearTrack}>
        <View
          style={[
            styles.linearFill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  step: {
    position: 'relative',
    paddingBottom: 24,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendingIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4a4a5e',
  },
  stepContent: {
    position: 'absolute',
    left: 40,
    top: 6,
  },
  stepLabel: {
    fontSize: 14,
    color: '#a0a0b0',
  },
  stepLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  stepLabelCompleted: {
    color: '#10b981',
  },
  stepLabelError: {
    color: '#ef4444',
  },
  connector: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 24,
    backgroundColor: '#4a4a5e',
  },
  connectorCompleted: {
    backgroundColor: '#10b981',
  },
  linearContainer: {
    width: '100%',
  },
  linearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  linearLabel: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  linearPercentage: {
    fontSize: 14,
    color: '#a0a0b0',
    fontWeight: '600',
  },
  linearTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#2a2a3e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  linearFill: {
    height: '100%',
    borderRadius: 4,
  },
});
