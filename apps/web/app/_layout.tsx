// apps/web/app/_layout.tsx
import 'react-native-get-random-values';
import '../global.css';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0f0f1e' },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
