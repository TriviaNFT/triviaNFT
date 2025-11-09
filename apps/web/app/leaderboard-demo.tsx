import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Leaderboard, SeasonDisplay } from '../src/components';

export default function LeaderboardDemo() {
  const [view, setView] = useState<'global' | 'category'>('global');
  const [selectedCategory, setSelectedCategory] = useState<string>('science');
  const [currentSeasonId, setCurrentSeasonId] = useState<string>('');

  const categories = [
    { id: 'science', name: 'Science' },
    { id: 'history', name: 'History' },
    { id: 'geography', name: 'Geography' },
    { id: 'sports', name: 'Sports' },
    { id: 'arts', name: 'Arts' },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-900">
      <View className="p-4">
        {/* Header */}
        <Text className="text-white text-3xl font-bold mb-2">Leaderboard</Text>
        <Text className="text-gray-400 mb-6">
          Compete with players worldwide and climb the ranks!
        </Text>

        {/* Season Display */}
        <SeasonDisplay onSeasonChange={setCurrentSeasonId} />

        {/* View Toggle */}
        <View className="flex-row mb-4 bg-gray-800 rounded-lg p-1">
          <Pressable
            onPress={() => setView('global')}
            className={`flex-1 py-3 rounded-lg ${
              view === 'global' ? 'bg-primary' : ''
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                view === 'global' ? 'text-white' : 'text-gray-400'
              }`}
            >
              Global Ladder
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setView('category')}
            className={`flex-1 py-3 rounded-lg ${
              view === 'category' ? 'bg-primary' : ''
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                view === 'category' ? 'text-white' : 'text-gray-400'
              }`}
            >
              Category Ladder
            </Text>
          </Pressable>
        </View>

        {/* Category Selector (only for category view) */}
        {view === 'category' && (
          <View className="mb-4">
            <Text className="text-gray-400 text-sm mb-2">Select Category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-2">
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg ${
                      selectedCategory === category.id
                        ? 'bg-primary'
                        : 'bg-gray-800'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        selectedCategory === category.id
                          ? 'text-white'
                          : 'text-gray-400'
                      }`}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Leaderboard */}
        <View className="bg-gray-800 rounded-lg overflow-hidden">
          <Leaderboard
            type={view}
            categoryId={view === 'category' ? selectedCategory : undefined}
            seasonId={currentSeasonId}
          />
        </View>
      </View>
    </ScrollView>
  );
}
