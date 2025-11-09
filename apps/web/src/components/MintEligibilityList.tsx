import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import type { Eligibility, Category } from '@trivia-nft/shared';
import { MintEligibilityCard } from './MintEligibilityCard';
import { mintService, categoryService } from '../services';
import { useAuth } from '../contexts/AuthContext';

interface MintEligibilityListProps {
  onMintClick: (eligibilityId: string) => void;
  onConnectWallet?: () => void;
}

export const MintEligibilityList: React.FC<MintEligibilityListProps> = ({
  onMintClick,
  onConnectWallet,
}) => {
  const { isAuthenticated } = useAuth();
  const [eligibilities, setEligibilities] = useState<Eligibility[]>([]);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEligibilities();
  }, []);

  const loadEligibilities = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch eligibilities
      const eligibilitiesResponse = await mintService.getEligibilities();
      const activeEligibilities = eligibilitiesResponse.eligibilities.filter(
        (e) => e.status === 'active'
      );

      setEligibilities(activeEligibilities);

      // Fetch categories for the eligibilities
      if (activeEligibilities.length > 0) {
        const categoriesResponse = await categoryService.getCategories();
        const categoryMap = new Map<string, Category>();
        categoriesResponse.categories.forEach((cat) => {
          categoryMap.set(cat.id, cat);
        });
        setCategories(categoryMap);
      }
    } catch (err) {
      console.error('Failed to load eligibilities:', err);
      setError('Failed to load mint eligibilities. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-600 mt-4">Loading eligibilities...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-red-600 text-center">{error}</Text>
      </View>
    );
  }

  if (eligibilities.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-gray-600 text-center text-lg">
          No active mint eligibilities
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          Achieve a perfect score (10/10) to earn mint eligibility
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 p-4">
      <Text className="text-2xl font-bold text-gray-900 mb-4">
        Mint Eligibilities
      </Text>
      <Text className="text-gray-600 mb-6">
        You have {eligibilities.length} active eligibilit{eligibilities.length === 1 ? 'y' : 'ies'}
      </Text>

      {eligibilities.map((eligibility) => (
        <MintEligibilityCard
          key={eligibility.id}
          eligibility={eligibility}
          category={eligibility.categoryId ? categories.get(eligibility.categoryId) : undefined}
          onMintClick={onMintClick}
          isGuest={!isAuthenticated}
          onConnectWallet={onConnectWallet}
        />
      ))}
    </ScrollView>
  );
};
