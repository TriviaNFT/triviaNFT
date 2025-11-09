import { useToast } from '../contexts/ToastContext';
import { ApiError } from '../services/api';

/**
 * Hook providing game-specific toast notifications
 * Implements Requirements 32, 33, 34, 35 for player messaging
 */
export const useGameToasts = () => {
  const toast = useToast();

  // Session-related toasts (Requirement 32, 33)
  const sessionStarted = () => {
    toast.info('10 questions • 10s each • no pauses • perfect = mint chance', 3000);
  };

  const sessionTimeout = () => {
    toast.warning("Time's up! That counts as incorrect.", 2000);
  };

  const sessionCompleted = (score: number, isPerfect: boolean) => {
    if (isPerfect) {
      toast.success('Perfect score! You earned a mint eligibility!', 5000);
    } else if (score >= 6) {
      toast.success(`Great job! You scored ${score}/10`, 3000);
    } else {
      toast.info(`You scored ${score}/10. Keep practicing!`, 3000);
    }
  };

  // Mint-related toasts (Requirement 34)
  const mintEligibilityEarned = (category: string, isGuest: boolean) => {
    const duration = isGuest ? 25 : 60;
    toast.success(
      `Flawless! You've unlocked a ${category} mint. Claim within ${duration} minutes.`,
      7000
    );
  };

  const mintStarted = () => {
    toast.info('Minting your NFT to the blockchain...', 3000);
  };

  const mintSuccess = (nftName: string) => {
    toast.success(`Successfully minted ${nftName}!`, 5000);
  };

  const mintFailed = (error?: string) => {
    toast.error(
      error || 'Failed to mint NFT. Please try again.',
      7000
    );
  };

  const mintEligibilityExpiring = (minutes: number) => {
    if (minutes <= 5) {
      toast.warning(
        `Your mint eligibility expires in ${minutes} minute${minutes !== 1 ? 's' : ''}!`,
        5000
      );
    }
  };

  // Forge-related toasts (Requirement 35)
  const forgeConfirmation = () => {
    toast.warning('Forging will consume your NFTs permanently. Proceed?', 0);
  };

  const forgeStarted = (type: string) => {
    toast.info(`Starting ${type} forge operation...`, 3000);
  };

  const forgeSuccess = (ultimateNFT: string) => {
    toast.success(`Successfully forged ${ultimateNFT}!`, 5000);
  };

  const forgeFailed = (error?: string) => {
    toast.error(
      error || 'Forge operation failed. Please try again.',
      7000
    );
  };

  // Network and API error toasts
  const networkError = () => {
    toast.error(
      'Network connection lost. Please check your internet connection.',
      7000
    );
  };

  const apiError = (error: ApiError | Error) => {
    if (error instanceof ApiError) {
      switch (error.code) {
        case 'TIMEOUT':
          toast.error('Request timed out. Please try again.', 5000);
          break;
        case 'NETWORK_ERROR':
          networkError();
          break;
        case 'UNAUTHORIZED':
          toast.error('Session expired. Please reconnect your wallet.', 7000);
          break;
        case 'RATE_LIMIT':
          toast.warning('Too many requests. Please wait a moment.', 5000);
          break;
        default:
          toast.error(error.message || 'An error occurred. Please try again.', 5000);
      }
    } else {
      toast.error(error.message || 'An unexpected error occurred.', 5000);
    }
  };

  // Daily limit toasts
  const dailyLimitReached = (resetTime: string) => {
    toast.warning(
      `Daily session limit reached. Resets at ${resetTime}.`,
      7000
    );
  };

  const cooldownActive = (seconds: number) => {
    toast.info(
      `Please wait ${seconds} seconds before starting another session.`,
      3000
    );
  };

  // Wallet connection toasts
  const walletConnected = (walletName: string) => {
    toast.success(`Connected to ${walletName}`, 3000);
  };

  const walletDisconnected = () => {
    toast.info('Wallet disconnected', 2000);
  };

  const walletConnectionFailed = (error?: string) => {
    toast.error(
      error || 'Failed to connect wallet. Please try again.',
      5000
    );
  };

  // Stock availability toasts
  const noNFTsAvailable = (category: string) => {
    toast.warning(
      `No NFTs are available for ${category} right now. Please try again later or play a different category.`,
      7000
    );
  };

  // Generic success/error
  const success = (message: string, duration?: number) => {
    toast.success(message, duration);
  };

  const error = (message: string, duration?: number) => {
    toast.error(message, duration);
  };

  const warning = (message: string, duration?: number) => {
    toast.warning(message, duration);
  };

  const info = (message: string, duration?: number) => {
    toast.info(message, duration);
  };

  return {
    // Session toasts
    sessionStarted,
    sessionTimeout,
    sessionCompleted,
    dailyLimitReached,
    cooldownActive,

    // Mint toasts
    mintEligibilityEarned,
    mintEligibilityExpiring,
    mintStarted,
    mintSuccess,
    mintFailed,

    // Forge toasts
    forgeConfirmation,
    forgeStarted,
    forgeSuccess,
    forgeFailed,

    // Network/API toasts
    networkError,
    apiError,

    // Wallet toasts
    walletConnected,
    walletDisconnected,
    walletConnectionFailed,

    // Stock toasts
    noNFTsAvailable,

    // Generic toasts
    success,
    error,
    warning,
    info,
  };
};
