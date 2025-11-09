import React, { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { Button, Card } from './ui';
import { useAuth } from '../contexts';

export interface ProfileCreationProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const ProfileCreation: React.FC<ProfileCreationProps> = ({ onSuccess, onError }) => {
  const { createProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; email?: string }>({});

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
    <Card className="p-6">
      <Text className="text-2xl font-bold text-text-primary mb-2">Create Your Profile</Text>
      <Text className="text-text-secondary mb-6">
        Choose a username to get started with TriviaNFT
      </Text>

      <View className="mb-4">
        <Text className="text-text-primary font-medium mb-2">
          Username <Text className="text-error-500">*</Text>
        </Text>
        <TextInput
          className="input"
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
          <Text className="text-error-500 text-sm mt-1">{errors.username}</Text>
        )}
      </View>

      <View className="mb-6">
        <Text className="text-text-primary font-medium mb-2">Email (Optional)</Text>
        <TextInput
          className="input"
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
        {errors.email && <Text className="text-error-500 text-sm mt-1">{errors.email}</Text>}
      </View>

      <Button
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={!username.trim() || isSubmitting}
        fullWidth
      >
        Create Profile
      </Button>
    </Card>
  );
};
