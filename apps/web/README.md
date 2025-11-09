# TriviaNFT Web Application

Expo Web PWA for the TriviaNFT blockchain trivia gaming platform.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

## Development

Start the development server:
```bash
pnpm dev
```

The app will be available at `http://localhost:8081`

## Build

Build for production:
```bash
pnpm build
```

Output will be in the `dist` directory.

## Environment Variables

- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_API_TIMEOUT` - API request timeout in milliseconds
- `EXPO_PUBLIC_CARDANO_NETWORK` - Cardano network (mainnet/preprod)
- `EXPO_PUBLIC_ENABLE_WALLET_CONNECT` - Enable wallet connection feature
- `EXPO_PUBLIC_ENABLE_GUEST_MODE` - Enable guest mode
- `EXPO_PUBLIC_ENV` - Environment (development/staging/production)

## Project Structure

```
apps/web/
├── app/              # Expo Router pages
├── src/              # Source code
│   ├── components/   # React components
│   ├── contexts/     # React contexts
│   ├── hooks/        # Custom hooks
│   ├── services/     # API services
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
├── assets/           # Static assets
├── global.css        # Global styles
└── tailwind.config.js # Tailwind configuration
```

## Technologies

- **Expo** - React Native framework for web
- **Expo Router** - File-based routing
- **NativeWind** - Tailwind CSS for React Native
- **TypeScript** - Type safety
- **React Native Web** - React Native components for web

## PWA Features

- Offline support with service workers
- Install prompt for home screen
- Responsive design (desktop and mobile)
- Standalone display mode
