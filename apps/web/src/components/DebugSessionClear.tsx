import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSession } from '../contexts/SessionContext';

export const DebugSessionClear: React.FC = () => {
  const { clearActiveSession, hasActiveSessionLock } = useSession();

  if (!hasActiveSessionLock) {
    return null;
  }

  const handleClear = () => {
    clearActiveSession();
    // Also clear localStorage directly to be sure
    localStorage.removeItem('trivia_active_session');
    localStorage.removeItem('trivia_session_lock');
    window.location.reload();
  };

  return (
    <View className="fixed bottom-4 right-4 z-50">
      <Pressable
        onPress={handleClear}
        className="bg-red-600 px-4 py-2 rounded-lg shadow-lg"
      >
        <Text className="text-white font-bold">🔧 Clear Session Lock</Text>
      </Pressable>
    </View>
  );
};
