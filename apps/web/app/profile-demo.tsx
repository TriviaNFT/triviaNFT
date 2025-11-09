import React from 'react';
import { View } from 'react-native';
import { PlayerProfile } from '../src/components';

export default function ProfileDemo() {
  return (
    <View className="flex-1 bg-gray-900">
      <PlayerProfile />
    </View>
  );
}
