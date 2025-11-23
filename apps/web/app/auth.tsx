import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { WalletConnect, ProfileCreation, Button, Card } from '../src/components';
import { useAuth } from '../src/contexts';

export default function Auth() {
  const router = useRouter();
  const { player, wallet, disconnectWallet, isAuthenticated } = useAuth();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width <= 768;

  return (
    <View className="flex-1 bg-background">
      {/* Header with Home Button */}
      <View 
        className="bg-background-secondary border-b border-background-tertiary"
        style={{
          paddingHorizontal: isMobile ? 16 : 24,
          paddingVertical: isMobile ? 12 : 16,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View style={{ flex: 1 }}>
            <Text 
              className="font-bold text-gradient"
              style={{
                fontSize: isMobile ? 28 : 36,
              }}
            >
              Sign In
            </Text>
            <Text 
              className="text-text-secondary"
              style={{
                fontSize: isMobile ? 12 : 14,
              }}
            >
              Test wallet connection and profile creation
            </Text>
          </View>
          
          {/* Home Button */}
          <Pressable
            onPress={() => router.push('/')}
            className="flex-row items-center gap-2 rounded-lg bg-background-tertiary hover:bg-background"
            style={{
              paddingHorizontal: isMobile ? 12 : 16,
              paddingVertical: isMobile ? 10 : 12,
              minHeight: 48, // Ensures 44px+ touch target
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back to home"
          >
            <Text className="text-text-primary font-semibold">Home</Text>
            <Text className="text-text-primary text-lg">🏠</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View 
          className="max-w-2xl mx-auto w-full"
          style={{
            paddingHorizontal: isMobile ? 16 : 24,
            paddingVertical: isMobile ? 16 : 24,
          }}
        >

        {/* Wallet Connection Section */}
        <Card className="mb-6">
          <Text className="text-xl font-bold text-text-primary mb-4">Wallet Connection</Text>
          <WalletConnect
            onSuccess={() => {
              console.log('Wallet connected successfully');
            }}
            onError={(error) => {
              console.error('Wallet connection failed:', error);
            }}
          />
          {wallet && (
            <Button
              variant="outline"
              onPress={disconnectWallet}
              className="mt-4"
            >
              Disconnect Wallet
            </Button>
          )}
        </Card>

        {/* Player Info Section */}
        {isAuthenticated && (
          <Card className="mb-6">
            <Text className="text-xl font-bold text-text-primary mb-4">Player Info</Text>
            {player?.username ? (
              <View>
                <View className="mb-3">
                  <Text className="text-text-secondary text-sm">Username</Text>
                  <Text className="text-text-primary font-semibold text-lg">
                    {player.username}
                  </Text>
                </View>
                {player.email && (
                  <View className="mb-3">
                    <Text className="text-text-secondary text-sm">Email</Text>
                    <Text className="text-text-primary">{player.email}</Text>
                  </View>
                )}
                <View className="mb-3">
                  <Text className="text-text-secondary text-sm">Player ID</Text>
                  <Text className="text-text-primary font-mono text-xs">{player.id}</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text className="text-text-secondary mb-4">
                  No profile created yet. Create one to get started!
                </Text>
                <Button onPress={() => setShowProfileForm(true)}>
                  Create Profile
                </Button>
              </View>
            )}
          </Card>
        )}

        {/* Profile Creation Section */}
        {showProfileForm && !player?.username && (
          <View className="mb-6">
            <ProfileCreation
              onSuccess={() => {
                setShowProfileForm(false);
                console.log('Profile created successfully');
              }}
              onError={(error) => {
                console.error('Profile creation failed:', error);
              }}
            />
          </View>
        )}

        {/* Status Section */}
        <Card>
          <Text className="text-xl font-bold text-text-primary mb-4">Status</Text>
          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-background-tertiary">
              <Text className="text-text-secondary">Authenticated</Text>
              <Text className={isAuthenticated ? 'text-success-500' : 'text-error-500'}>
                {isAuthenticated ? 'Yes' : 'No'}
              </Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-background-tertiary">
              <Text className="text-text-secondary">Wallet Connected</Text>
              <Text className={wallet ? 'text-success-500' : 'text-error-500'}>
                {wallet ? 'Yes' : 'No'}
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary">Profile Created</Text>
              <Text className={player?.username ? 'text-success-500' : 'text-error-500'}>
                {player?.username ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </Card>
        </View>
      </ScrollView>
    </View>
  );
}
