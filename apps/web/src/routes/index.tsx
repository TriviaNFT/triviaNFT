import { lazy } from 'react';

/**
 * Lazy-loaded route components for code splitting.
 * Each route is loaded only when needed, reducing initial bundle size.
 */

// Demo routes (can be removed in production)
export const AuthDemo = lazy(() => import('../../app/auth-demo'));
export const GameplayDemo = lazy(() => import('../../app/gameplay-demo'));
export const MintDemo = lazy(() => import('../../app/mint-demo'));
export const ForgeDemo = lazy(() => import('../../app/forge-demo'));
export const LeaderboardDemo = lazy(() => import('../../app/leaderboard-demo'));
export const ProfileDemo = lazy(() => import('../../app/profile-demo'));
export const ErrorHandlingDemo = lazy(() => import('../../app/error-handling-demo'));

// Main application routes
export const CategorySelectionRoute = lazy(() => 
  import('../components/CategorySelection').then(module => ({
    default: module.CategorySelection
  }))
);

export const SessionFlowRoute = lazy(() =>
  import('../components/SessionFlow').then(module => ({
    default: module.SessionFlow
  }))
);

export const LeaderboardRoute = lazy(() =>
  import('../components/Leaderboard').then(module => ({
    default: module.Leaderboard
  }))
);

export const PlayerProfileRoute = lazy(() =>
  import('../components/PlayerProfile').then(module => ({
    default: module.PlayerProfile
  }))
);

export const NFTInventoryRoute = lazy(() =>
  import('../components/NFTInventory').then(module => ({
    default: module.NFTInventory
  }))
);

export const ForgeProgressRoute = lazy(() =>
  import('../components/ForgeProgressCard').then(module => ({
    default: module.ForgeProgressCard
  }))
);
