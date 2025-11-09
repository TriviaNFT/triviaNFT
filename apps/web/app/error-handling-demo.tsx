import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  LoadingSpinner,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
  ProgressIndicator,
  LinearProgress,
  LoadingOverlay,
  InlineLoading,
} from '../src/components/ui';
import { useToast } from '../src/contexts/ToastContext';
import { useGameToasts } from '../src/hooks/useGameToasts';

export default function ErrorHandlingDemo() {
  const router = useRouter();
  const toast = useToast();
  const gameToasts = useGameToasts();
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState([
    { label: 'Validating eligibility', status: 'completed' as const },
    { label: 'Uploading to IPFS', status: 'active' as const },
    { label: 'Building transaction', status: 'pending' as const },
    { label: 'Submitting to blockchain', status: 'pending' as const },
  ]);

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const simulateStepProgress = () => {
    setSteps([
      { label: 'Validating eligibility', status: 'active' },
      { label: 'Uploading to IPFS', status: 'pending' },
      { label: 'Building transaction', status: 'pending' },
      { label: 'Submitting to blockchain', status: 'pending' },
    ]);

    setTimeout(() => {
      setSteps([
        { label: 'Validating eligibility', status: 'completed' },
        { label: 'Uploading to IPFS', status: 'active' },
        { label: 'Building transaction', status: 'pending' },
        { label: 'Submitting to blockchain', status: 'pending' },
      ]);
    }, 1500);

    setTimeout(() => {
      setSteps([
        { label: 'Validating eligibility', status: 'completed' },
        { label: 'Uploading to IPFS', status: 'completed' },
        { label: 'Building transaction', status: 'active' },
        { label: 'Submitting to blockchain', status: 'pending' },
      ]);
    }, 3000);

    setTimeout(() => {
      setSteps([
        { label: 'Validating eligibility', status: 'completed' },
        { label: 'Uploading to IPFS', status: 'completed' },
        { label: 'Building transaction', status: 'completed' },
        { label: 'Submitting to blockchain', status: 'completed' },
      ]);
    }, 4500);
  };

  const throwError = () => {
    throw new Error('This is a test error to demonstrate ErrorBoundary');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Error Handling & Loading Demo</Text>
        <Text style={styles.subtitle}>
          Task 25: Error handling and user feedback components
        </Text>
      </View>

      {/* Toast Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Toast Notifications</Text>
        
        <View style={styles.buttonGrid}>
          <Button
            variant="primary"
            onPress={() => toast.success('Operation successful!')}
            style={styles.gridButton}
          >
            Success Toast
          </Button>
          
          <Button
            variant="secondary"
            onPress={() => toast.error('Something went wrong!')}
            style={styles.gridButton}
          >
            Error Toast
          </Button>
          
          <Button
            variant="secondary"
            onPress={() => toast.warning('Please be careful!')}
            style={styles.gridButton}
          >
            Warning Toast
          </Button>
          
          <Button
            variant="secondary"
            onPress={() => toast.info('Here is some information')}
            style={styles.gridButton}
          >
            Info Toast
          </Button>
        </View>

        <Text style={styles.subsectionTitle}>Game-Specific Toasts</Text>
        <View style={styles.buttonGrid}>
          <Button
            variant="secondary"
            onPress={() => gameToasts.sessionStarted()}
            style={styles.gridButton}
          >
            Session Started
          </Button>
          
          <Button
            variant="secondary"
            onPress={() => gameToasts.sessionTimeout()}
            style={styles.gridButton}
          >
            Session Timeout
          </Button>
          
          <Button
            variant="secondary"
            onPress={() => gameToasts.mintEligibilityEarned('Science', false)}
            style={styles.gridButton}
          >
            Mint Eligibility
          </Button>
          
          <Button
            variant="secondary"
            onPress={() => gameToasts.mintSuccess('Science NFT #42')}
            style={styles.gridButton}
          >
            Mint Success
          </Button>
          
          <Button
            variant="secondary"
            onPress={() => gameToasts.networkError()}
            style={styles.gridButton}
          >
            Network Error
          </Button>
          
          <Button
            variant="secondary"
            onPress={() => gameToasts.dailyLimitReached('12:00 AM ET')}
            style={styles.gridButton}
          >
            Daily Limit
          </Button>
        </View>
      </View>

      {/* Loading Spinners Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loading Spinners</Text>
        <View style={styles.spinnerRow}>
          <View style={styles.spinnerItem}>
            <LoadingSpinner size="small" />
            <Text style={styles.spinnerLabel}>Small</Text>
          </View>
          <View style={styles.spinnerItem}>
            <LoadingSpinner size="medium" />
            <Text style={styles.spinnerLabel}>Medium</Text>
          </View>
          <View style={styles.spinnerItem}>
            <LoadingSpinner size="large" />
            <Text style={styles.spinnerLabel}>Large</Text>
          </View>
        </View>
      </View>

      {/* Skeleton Loaders Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skeleton Loaders</Text>
        
        <Text style={styles.subsectionTitle}>Basic Skeleton</Text>
        <Skeleton width="100%" height={40} />
        
        <Text style={styles.subsectionTitle}>Skeleton Text</Text>
        <SkeletonText lines={3} />
        
        <Text style={styles.subsectionTitle}>Skeleton Card</Text>
        <SkeletonCard />
        
        <Text style={styles.subsectionTitle}>Skeleton List</Text>
        <SkeletonList count={3} itemHeight={60} />
      </View>

      {/* Progress Indicators Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Indicators</Text>
        
        <Text style={styles.subsectionTitle}>Linear Progress</Text>
        <LinearProgress progress={progress} label="Uploading..." />
        <Button
          variant="secondary"
          onPress={simulateProgress}
          style={styles.actionButton}
        >
          Simulate Progress
        </Button>
        
        <Text style={styles.subsectionTitle}>Step Progress</Text>
        <ProgressIndicator steps={steps} />
        <Button
          variant="secondary"
          onPress={simulateStepProgress}
          style={styles.actionButton}
        >
          Simulate Steps
        </Button>
      </View>

      {/* Loading Overlay Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loading Overlays</Text>
        
        <Button
          variant="primary"
          onPress={() => {
            setShowOverlay(true);
            setTimeout(() => setShowOverlay(false), 3000);
          }}
          style={styles.actionButton}
        >
          Show Loading Overlay (3s)
        </Button>
        
        <Text style={styles.subsectionTitle}>Inline Loading</Text>
        <InlineLoading message="Loading data..." />
      </View>

      {/* Error Boundary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Error Boundary</Text>
        <Text style={styles.description}>
          Click the button below to trigger an error and see the ErrorBoundary in action.
        </Text>
        <Button
          variant="secondary"
          onPress={throwError}
          style={styles.actionButton}
        >
          Trigger Error
        </Button>
      </View>

      <LoadingOverlay
        visible={showOverlay}
        message="Processing your request..."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#6366f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0b0',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#a0a0b0',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridButton: {
    flex: 1,
    minWidth: 150,
  },
  actionButton: {
    marginTop: 12,
  },
  spinnerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
  },
  spinnerItem: {
    alignItems: 'center',
    gap: 12,
  },
  spinnerLabel: {
    fontSize: 14,
    color: '#a0a0b0',
  },
});
