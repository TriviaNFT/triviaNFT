import {
  AppConfigDataClient,
  StartConfigurationSessionCommand,
  GetLatestConfigurationCommand,
} from '@aws-sdk/client-appconfigdata';

/**
 * Game configuration settings interface
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

/**
 * AppConfig service for retrieving game configuration
 */
export class AppConfigService {
  private client: AppConfigDataClient;
  private applicationId: string;
  private environmentId: string;
  private configurationProfileId: string;
  
  // Cache configuration with TTL
  private cachedConfig: GameSettings | null = null;
  private cacheExpiry: number = 0;
  private cacheTTL: number = 60000; // 60 seconds
  
  // Session token for configuration retrieval
  private sessionToken: string | null = null;

  constructor(
    applicationId?: string,
    environmentId?: string,
    configurationProfileId?: string
  ) {
    this.client = new AppConfigDataClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    
    this.applicationId = applicationId || process.env.APPCONFIG_APPLICATION_ID || '';
    this.environmentId = environmentId || process.env.APPCONFIG_ENVIRONMENT_ID || '';
    this.configurationProfileId =
      configurationProfileId || process.env.APPCONFIG_CONFIGURATION_PROFILE_ID || '';

    if (!this.applicationId || !this.environmentId || !this.configurationProfileId) {
      console.warn(
        'AppConfig not fully configured. Using default values. Set APPCONFIG_APPLICATION_ID, APPCONFIG_ENVIRONMENT_ID, and APPCONFIG_CONFIGURATION_PROFILE_ID environment variables.'
      );
    }
  }

  /**
   * Get game settings with caching
   */
  async getGameSettings(): Promise<GameSettings> {
    // Return cached config if still valid
    if (this.cachedConfig && Date.now() < this.cacheExpiry) {
      return this.cachedConfig;
    }

    try {
      // Start a new configuration session if we don't have a token
      if (!this.sessionToken) {
        const sessionCommand = new StartConfigurationSessionCommand({
          ApplicationIdentifier: this.applicationId,
          EnvironmentIdentifier: this.environmentId,
          ConfigurationProfileIdentifier: this.configurationProfileId,
        });

        const sessionResponse = await this.client.send(sessionCommand);
        this.sessionToken = sessionResponse.InitialConfigurationToken || null;
      }

      // Get the latest configuration
      const configCommand = new GetLatestConfigurationCommand({
        ConfigurationToken: this.sessionToken || undefined,
      });

      const configResponse = await this.client.send(configCommand);

      // Update session token for next request
      this.sessionToken = configResponse.NextPollConfigurationToken || null;

      // Parse configuration if we received new data
      if (configResponse.Configuration) {
        const configString = new TextDecoder().decode(configResponse.Configuration);
        const config = JSON.parse(configString) as GameSettings;

        // Update cache
        this.cachedConfig = config;
        this.cacheExpiry = Date.now() + this.cacheTTL;

        return config;
      }

      // If no new configuration, return cached or default
      if (this.cachedConfig) {
        return this.cachedConfig;
      }
    } catch (error) {
      console.error('Error fetching AppConfig configuration:', error);
      
      // Return cached config if available
      if (this.cachedConfig) {
        console.warn('Using cached configuration due to fetch error');
        return this.cachedConfig;
      }
    }

    // Fallback to default configuration
    console.warn('Using default game settings');
    return this.getDefaultSettings();
  }

  /**
   * Get default settings (fallback)
   */
  private getDefaultSettings(): GameSettings {
    return {
      session: {
        questionsPerSession: 10,
        timerSeconds: 10,
        cooldownSeconds: 60,
      },
      limits: {
        dailySessionsConnected: 20,
        dailySessionsGuest: 10,
        resetTimeET: '00:00',
      },
      eligibility: {
        connectedWindowMinutes: 60,
        guestWindowMinutes: 25,
      },
      forging: {
        categoryUltimateCount: 10,
        masterUltimateCount: 10,
        seasonalUltimateCount: 2,
        seasonGraceDays: 7,
      },
      questions: {
        reusedRatio: 0.5,
        newRatio: 0.5,
        poolThreshold: 1000,
      },
      season: {
        pointsPerCorrect: 1,
        perfectBonus: 10,
      },
    };
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.cacheExpiry = 0;
    this.sessionToken = null;
  }

  /**
   * Set cache TTL
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }
}

// Singleton instance for Lambda reuse
let appConfigServiceInstance: AppConfigService | null = null;

/**
 * Get or create AppConfig service instance
 */
export function getAppConfigService(): AppConfigService {
  if (!appConfigServiceInstance) {
    appConfigServiceInstance = new AppConfigService();
  }
  return appConfigServiceInstance;
}
