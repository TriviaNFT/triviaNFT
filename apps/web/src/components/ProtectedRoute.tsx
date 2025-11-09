import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts';
import { Button } from './ui';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfile?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireProfile = false,
  redirectTo = '/',
}) => {
  const { isAuthenticated, player, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#6d4ee3" />
        <Text className="text-text-secondary mt-4">Loading...</Text>
      </View>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return <Redirect href={redirectTo} />;
  }

  // Check profile requirement
  if (requireProfile && (!player || !player.username)) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-2xl font-bold text-text-primary mb-4">Profile Required</Text>
        <Text className="text-text-secondary text-center mb-6">
          You need to create a profile to access this feature
        </Text>
        <Button onPress={() => {}} variant="primary">
          Create Profile
        </Button>
      </View>
    );
  }

  return <>{children}</>;
};
