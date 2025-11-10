// apps/web/app/polyfill-test.tsx
import { View, Text, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';

export default function PolyfillTest() {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    const testResults: string[] = [];

    // Check window.Buffer
    if (typeof window !== 'undefined') {
      if (typeof window.Buffer !== 'undefined') {
        testResults.push('✓ window.Buffer is defined');
        try {
          const buf = window.Buffer.from('test');
          testResults.push('✓ Buffer.from() works: ' + buf.toString());
        } catch (e: any) {
          testResults.push('✗ Buffer.from() failed: ' + e.message);
        }
      } else {
        testResults.push('✗ window.Buffer is NOT defined');
      }

      // Check window.process
      if (typeof window.process !== 'undefined') {
        testResults.push('✓ window.process is defined');
        testResults.push('  - process.env: ' + typeof window.process.env);
        testResults.push('  - process.browser: ' + window.process.browser);
      } else {
        testResults.push('✗ window.process is NOT defined');
      }

      // Check window.global
      if (typeof (window as any).global !== 'undefined') {
        testResults.push('✓ window.global is defined');
        testResults.push('  - global === window: ' + ((window as any).global === window));
      } else {
        testResults.push('✗ window.global is NOT defined');
      }

      // Test crypto.getRandomValues (polyfilled by react-native-get-random-values)
      testResults.push('');
      testResults.push('Testing crypto.getRandomValues:');
      try {
        if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
          const array = new Uint8Array(16);
          crypto.getRandomValues(array);
          testResults.push('✓ crypto.getRandomValues() works');

          // Generate a simple random hex string
          const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
          testResults.push('✓ Generated random hex: ' + hex.substring(0, 32));
        } else {
          testResults.push('✗ crypto.getRandomValues() not available');
        }
      } catch (e: any) {
        testResults.push('✗ crypto.getRandomValues() failed: ' + e.message);
      }

      // Test UUID generation if uuid package is available
      testResults.push('');
      testResults.push('Testing UUID generation:');
      try {
        // Try dynamic import of uuid
        import('uuid').then(({ v4 }) => {
          const uuid = v4();
          testResults.push('✓ UUID v4 generated: ' + uuid);
          setResults([...testResults]);
        }).catch((e: any) => {
          testResults.push('ℹ UUID package not available (expected): ' + e.message);
          setResults([...testResults]);
        });
      } catch (e: any) {
        testResults.push('ℹ UUID test skipped: ' + e.message);
      }
    }

    setResults(testResults);

    // Log to console as well
    console.log('=== Polyfill Verification Results ===');
    testResults.forEach(r => console.log(r));
    console.log('=====================================');
  }, []);

  return (
    <ScrollView className="flex-1 bg-gray-900">
      <View className="p-6">
        <Text className="text-3xl font-bold text-white mb-4">Polyfill Verification</Text>
        <Text className="text-gray-400 mb-6">
          Checking if Node.js polyfills are available in the browser
        </Text>

        <View className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          {results.map((result, index) => (
            <Text
              key={index}
              className={`font-mono text-sm mb-1 ${
                result.startsWith('✓')
                  ? 'text-green-400'
                  : result.startsWith('✗')
                  ? 'text-red-400'
                  : result.startsWith('ℹ')
                  ? 'text-blue-400'
                  : 'text-gray-300'
              }`}
            >
              {result || ' '}
            </Text>
          ))}
        </View>

        <Text className="text-gray-500 text-sm mt-4">
          Check the browser console for detailed logs
        </Text>
      </View>
    </ScrollView>
  );
}
