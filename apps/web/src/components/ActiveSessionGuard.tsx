import React from 'react';
import { View, Text } from 'react-native';
import { useSession } from '../contexts/SessionContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export interface ActiveSessionGuardProps {
  children: React.ReactNode;
  onResumeSession?: () => void;
}

export const ActiveSessionGuard: React.FC<ActiveSessionGuardProps> = ({
  children,
  onResumeSession,
}) => {
  const { hasActiveSessionLock, isSessionActive } = useSession();

  // If there's an active session lock but we're not in a session, show warning
  if (hasActiveSessionLock && !isSessionActive) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Card variant="elevated" className="w-full max-w-md">
          <View className="items-center">
            <Text className="text-4xl mb-4">⚠️</Text>
            <Text className="text-2xl font-bold text-text-primary mb-3 text-center">
              Active Session Detected
            </Text>
            <Text className="text-text-secondary text-center mb-6">
              You have an active session in progress. Please complete your current session before starting a new one.
            </Text>
            {onResumeSession && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={onResumeSession}
              >
                Resume Session
              </Button>
            )}
          </View>
        </Card>
      </View>
    );
  }

  return <>{children}</>;
};
