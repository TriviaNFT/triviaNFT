import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, ToastProvider } from '../src/contexts';
import { InstallPrompt } from '../src/components/InstallPrompt';
import { ServiceWorkerUpdate } from '../src/components/ServiceWorkerUpdate';
import { PWAStatus } from '../src/components/PWAStatus';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { ToastContainer } from '../src/components/ToastContainer';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <PWAStatus />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0f0f1e' },
            }}
          />
          <ToastContainer />
          <InstallPrompt delay={30000} oncePerSession={true} />
          <ServiceWorkerUpdate />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
