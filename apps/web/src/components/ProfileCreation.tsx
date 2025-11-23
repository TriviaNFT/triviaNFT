import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { Button, Card } from './ui';
import { useAuth } from '../contexts';
import { useResponsive, useStatePreservation } from '../hooks';

export interface ProfileCreationProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ProfileCreation: React.FC<ProfileCreationProps> = ({ onSuccess, onError }) => {
  const { createProfile } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  useStatePreservation(false); // Don't preserve scroll for form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; email?: string }>({});

  // Preserve form state in sessionStorage during resize
  useEffect(() => {
    const savedState = sessionStorage.getItem('profile-creation-state');
    if (savedState) {
      try {
        const { username: savedUsername, email: savedEmail } = JSON.parse(savedState);
        if (savedUsername) setUsername(savedUsername);
        if (savedEmail) setEmail(savedEmail);
      } catch (error) {
        console.error('Failed to restore form state:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save form state on changes
    if (username || email) {
      sessionStorage.setItem('profile-creation-state', JSON.stringify({ username, email }));
    }
  }, [username, email]);

  const validateForm = (): boolean => {
    const newErrors: { username?: string; email?: string } = {};

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (username.length > 20) {
      newErrors.username = 'Username must be less than 20 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
    }

    // Email validation (optional)
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await createProfile(username.trim(), email.trim() || undefined);
      // Clear saved state on successful submission
      sessionStorage.removeItem('profile-creation-state');
      onSuccess?.();
    } catch (error) {
      console.error('Profile creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create profile';
      Alert.alert('Error', errorMessage);
      onError?.(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card 
      className="w-full"
      style={{
        padding: isMobile ? 16 : 24,
        maxWidth: isMobile ? '100%' : (isTablet ? 480 : 560),
      }}
    >
      <Text 
        className="font-bold text-text-primary mb-2"
        style={{ fontSize: isMobile ? 20 : 24 }}
      >
        Create Your Profile
      </Text>
      <Text 
        className="text-text-secondary"
        style={{ 
          marginBottom: isMobile ? 16 : 24,
          fontSize: isMobile ? 14 : 16,
        }}
      >
        Choose a username to get started with TriviaNFT
      </Text>

      <View style={{ marginBottom: isMobile ? 12 : 16 }}>
        <Text 
          className="text-text-primary font-medium"
          style={{ 
            marginBottom: 8,
            fontSize: isMobile ? 14 : 16,
          }}
        >
          Username <Text className="text-error-500">*</Text>
        </Text>
        <TextInput
          style={{
            backgroundColor: '#1a1a2e',
            borderWidth: 2,
            borderColor: '#27324a',
            borderRadius: 8,
            paddingHorizontal: isMobile ? 12 : 16,
            paddingVertical: isMobile ? 14 : 12,
            fontSize: isMobile ? 16 : 16,
            color: '#EAF2FF',
            minHeight: 44, // Touch target minimum
          }}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            setErrors((prev) => ({ ...prev, username: undefined }));
          }}
          placeholder="Enter username"
          placeholderTextColor="#6b6b8a"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        {errors.username && (
          <Text 
            className="text-error-500 mt-1"
            style={{ fontSize: isMobile ? 12 : 14 }}
          >
            {errors.username}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: isMobile ? 16 : 24 }}>
        <Text 
          className="text-text-primary font-medium"
          style={{ 
            marginBottom: 8,
            fontSize: isMobile ? 14 : 16,
          }}
        >
          Email (Optional)
        </Text>
        <TextInput
          style={{
            backgroundColor: '#1a1a2e',
            borderWidth: 2,
            borderColor: '#27324a',
            borderRadius: 8,
            paddingHorizontal: isMobile ? 12 : 16,
            paddingVertical: isMobile ? 14 : 12,
            fontSize: isMobile ? 16 : 16,
            color: '#EAF2FF',
            minHeight: 44, // Touch target minimum
          }}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder="Enter email"
          placeholderTextColor="#6b6b8a"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.email && (
          <Text 
            className="text-error-500 mt-1"
            style={{ fontSize: isMobile ? 12 : 14 }}
          >
            {errors.email}
          </Text>
        )}
      </View>

      <Button
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!username.trim() || isSubmitting}
        fullWidth
        style={{ minHeight: 44 }} // Touch target minimum
      >
        Create Profile
      </Button>
    </Card>
  );
};
