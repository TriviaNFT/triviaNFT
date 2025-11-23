import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import type { Eligibility, Category } from '@trivia-nft/shared';
import { MintEligibilityCard } from './MintEligibilityCard';
import { mintService, categoryService } from '../services';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';

interface MintEligibilityListProps {
  onMintClick: (eligibilityId: string) => void;
  onConnectWallet?: () => void;
}

interface EligibilityWithPreview extends Eligibility {
  preview?: {
    name: string;
    description: string;
    image: string;
    video?: string;
    visualDescription?: string;
  };
}

export const MintEligibilityList: React.FC<MintEligibilityListProps> = ({
  onMintClick,
  onConnectWallet,
}) => {
  const { isAuthenticated } = useAuth();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [eligibilities, setEligibilities] = useState<EligibilityWithPreview[]>([]);
  const [expiredEligibilities, setExpiredEligibilities] = useState<Eligibility[]>([]);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    loadEligibilities();
  }, []);

  const loadEligibilities = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch eligibilities
      const eligibilitiesResponse = await mintService.getEligibilities();
      
      // Separate active and expired eligibilities
      const now = new Date();
      const activeEligibilities = eligibilitiesResponse.eligibilities.filter(
        (e) => e.status === 'active' && new Date(e.expiresAt) > now
      );
      const expiredEligibilities = eligibilitiesResponse.eligibilities.filter(
        (e) => e.status !== 'active' || new Date(e.expiresAt) <= now
      );

      console.log('[MintEligibilityList] Total eligibilities:', eligibilitiesResponse.eligibilities.length);
      console.log('[MintEligibilityList] Active eligibilities:', activeEligibilities.length);
      console.log('[MintEligibilityList] Expired/used eligibilities:', expiredEligibilities.length);

      // Fetch NFT previews for active eligibilities
      const eligibilitiesWithPreviews = await Promise.all(
        activeEligibilities.map(async (eligibility) => {
          try {
            const previewResponse = await mintService.getNFTPreview(eligibility.id);
            return {
              ...eligibility,
              preview: previewResponse.preview,
            };
          } catch (err) {
            console.error(`Failed to load preview for eligibility ${eligibility.id}:`, err);
            return eligibility;
          }
        })
      );

      setEligibilities(eligibilitiesWithPreviews);
      setExpiredEligibilities(expiredEligibilities);

      // Fetch categories for the eligibilities
      if (eligibilitiesResponse.eligibilities.length > 0) {
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
        <Text className="text-text-secondary mt-4">Loading eligibilities...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-red-500 text-center">{error}</Text>
      </View>
    );
  }

  if (eligibilities.length === 0 && expiredEligibilities.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-text-secondary text-center text-lg">
          No mint eligibilities yet
        </Text>
        <Text className="text-text-tertiary text-center mt-2">
          Achieve a perfect score (10/10) to earn mint eligibility
        </Text>
      </View>
    );
  }

  // Responsive grid layout
  const gridColumns = isDesktop ? 2 : 1;
  const containerPadding = isMobile ? 'p-4' : isTablet ? 'p-6' : 'p-8';
  
  return (
    <ScrollView className={`flex-1 ${containerPadding}`}>
      {/* Active Eligibilities */}
      {eligibilities.length > 0 ? (
        <>
          <Text className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-text-primary mb-2`}>
            Ready to Mint
          </Text>
          <Text className={`text-text-secondary mb-6 ${isMobile ? 'text-sm' : ''}`}>
            You have {eligibilities.length} active eligibilit{eligibilities.length === 1 ? 'y' : 'ies'}
          </Text>

          {/* Responsive grid for eligibility cards */}
          <View className={`${isDesktop ? 'flex-row flex-wrap -mx-2' : ''}`}>
            {eligibilities.map((eligibility) => (
              <View key={eligibility.id} className={`${isDesktop ? 'w-1/2 px-2' : ''}`}>
                <MintEligibilityCard
                  eligibility={eligibility}
                  category={eligibility.categoryId ? categories.get(eligibility.categoryId) : undefined}
                  onMintClick={onMintClick}
                  isGuest={!isAuthenticated}
                  onConnectWallet={onConnectWallet}
                />
              </View>
            ))}
          </View>
        </>
      ) : (
        <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <Text className="text-yellow-800 font-semibold mb-1">No Active Eligibilities</Text>
          <Text className="text-yellow-700 text-sm">
            Your previous eligibilities have expired. Achieve another perfect score to earn a new one!
          </Text>
        </View>
      )}

      {/* Expired/Used Eligibilities */}
      {expiredEligibilities.length > 0 && (
        <View className="mt-6">
          <Pressable
            onPress={() => setShowExpired(!showExpired)}
            className="flex-row items-center justify-between mb-4"
          >
            <Text className="text-lg font-semibold text-text-primary">
              History ({expiredEligibilities.length})
            </Text>
            <Text className="text-text-secondary">{showExpired ? '▼' : '▶'}</Text>
          </Pressable>

          {showExpired && (
            <View>
              {expiredEligibilities.map((eligibility) => {
                const isUsed = eligibility.status === 'used';
                
                return (
                  <View
                    key={eligibility.id}
                    className="bg-background-tertiary rounded-lg p-4 mb-3 opacity-60"
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-text-primary font-semibold">
                        {eligibility.categoryId ? categories.get(eligibility.categoryId)?.name : 'Unknown'} NFT
                      </Text>
                      <View className={`px-2 py-1 rounded ${isUsed ? 'bg-green-600' : 'bg-red-600'}`}>
                        <Text className="text-xs font-semibold text-white">
                          {isUsed ? 'Minted' : 'Expired'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-text-secondary text-sm">
                      {isUsed 
                        ? 'Successfully minted to your wallet' 
                        : `Expired ${new Date(eligibility.expiresAt).toLocaleString()}`
                      }
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};
