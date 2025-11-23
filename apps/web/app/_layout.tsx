// apps/web/app/_layout.tsx
import 'react-native-get-random-values';
import '../global.css';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f0f1e' },
        }}
      />
    </AuthProvider>
  );
}
