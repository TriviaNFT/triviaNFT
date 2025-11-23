/**
 * App Configuration Service
 * Provides game settings and configuration
 * 
 * NOTE: This replaces AWS AppConfig with a simple in-memory configuration
 * For production, consider using Vercel Environment Variables or a config management service
 */

export interface GameSettings {
  session: {
    questionsPerSession: number;
    timerSeconds: number;
    cooldownSeconds: number;
  };
  limits: {
    dailySessionsConnected: number;
    dailySessionsGuest: number;
    resetTimeET: string;
  };
  eligibility: {
    connectedWindowMinutes: number;
    guestWindowMinutes: number;
  };
  forging: {
    categoryUltimateCount: number;
    masterUltimateCount: number;
    seasonalUltimateCount: number;
    seasonGraceDays: number;
  };
  questions: {
    reusedRatio: number;
    newRatio: number;
    poolThreshold: number;
  };
  season: {
    pointsPerCorrect: number;
    perfectBonus: number;
  };
}

export class AppConfigService {
  private cachedConfig: GameSettings | null = null;

  constructor() {
    // Initialize with default settings
    this.cachedConfig = this.getDefaultSettings();
  }

  async getGameSettings(): Promise<GameSettings> {
    // For now, always return default settings
    // In the future, this could fetch from environment variables or a database
    return this.cachedConfig || this.getDefaultSettings();
  }

  private getDefaultSettings(): GameSettings {
    return {
      session: {
        questionsPerSession: parseInt(process.env.QUESTIONS_PER_SESSION || '10'),
        timerSeconds: parseInt(process.env.TIMER_SECONDS || '10'),
        cooldownSeconds: parseInt(process.env.COOLDOWN_SECONDS || '60'),
      },
      limits: {
        dailySessionsConnected: parseInt(process.env.DAILY_SESSIONS_CONNECTED || '20'),
        dailySessionsGuest: parseInt(process.env.DAILY_SESSIONS_GUEST || '10'),
        resetTimeET: process.env.RESET_TIME_ET || '00:00',
      },
      eligibility: {
        connectedWindowMinutes: parseInt(process.env.CONNECTED_WINDOW_MINUTES || '60'),
        guestWindowMinutes: parseInt(process.env.GUEST_WINDOW_MINUTES || '25'),
      },
      forging: {
        categoryUltimateCount: parseInt(process.env.CATEGORY_ULTIMATE_COUNT || '10'),
        masterUltimateCount: parseInt(process.env.MASTER_ULTIMATE_COUNT || '10'),
        seasonalUltimateCount: parseInt(process.env.SEASONAL_ULTIMATE_COUNT || '2'),
        seasonGraceDays: parseInt(process.env.SEASON_GRACE_DAYS || '7'),
      },
      questions: {
        reusedRatio: parseFloat(process.env.QUESTIONS_REUSED_RATIO || '0.5'),
        newRatio: parseFloat(process.env.QUESTIONS_NEW_RATIO || '0.5'),
        poolThreshold: parseInt(process.env.QUESTIONS_POOL_THRESHOLD || '1000'),
      },
      season: {
        pointsPerCorrect: parseInt(process.env.POINTS_PER_CORRECT || '1'),
        perfectBonus: parseInt(process.env.PERFECT_BONUS || '10'),
      },
    };
  }

  clearCache(): void {
    this.cachedConfig = null;
  }
}

// Singleton instance
let appConfigServiceInstance: AppConfigService | null = null;

export function getAppConfigService(): AppConfigService {
  if (!appConfigServiceInstance) {
    appConfigServiceInstance = new AppConfigService();
  }
  return appConfigServiceInstance;
}
