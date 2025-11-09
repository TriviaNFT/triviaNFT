import { View, Text, ScrollView, Pressable } from 'react-native';
import { Link } from 'expo-router';

export default function Index() {
  const demos = [
    { title: 'Authentication', path: '/auth-demo', description: 'Wallet connection & profile creation' },
    { title: 'Gameplay', path: '/gameplay-demo', description: 'Trivia session flow' },
    { title: 'Minting', path: '/mint-demo', description: 'NFT minting & inventory' },
    { title: 'Forging', path: '/forge-demo', description: 'NFT forging mechanics' },
    { title: 'Leaderboard', path: '/leaderboard-demo', description: 'Global & category rankings' },
    { title: 'Profile', path: '/profile-demo', description: 'Player stats & activity' },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-900">
      <View className="p-6">
        <View className="mb-8">
          <Text className="text-4xl font-bold text-white mb-2">TriviaNFT</Text>
          <Text className="text-gray-400 text-lg">Blockchain Trivia Gaming</Text>
        </View>

        <Text className="text-white text-xl font-semibold mb-4">Component Demos</Text>
        
        <View className="space-y-3">
          {demos.map((demo) => (
            <Link key={demo.path} href={demo.path} asChild>
              <Pressable className="bg-gray-800 p-4 rounded-lg border border-gray-700 active:bg-gray-700">
                <Text className="text-white font-semibold text-lg mb-1">
                  {demo.title}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {demo.description}
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
