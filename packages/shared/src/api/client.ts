/**
 * HTTP API client with retry logic and auth token management
 */

import type {
  ApiClientConfig,
  RequestConfig,
  ApiResponse,
  ApiError,
} from './types';
import type {
  ConnectWalletRequest,
  ConnectWalletResponse,
  CreateProfileRequest,
  CreateProfileResponse,
  GetCurrentUserResponse,
  StartSessionRequest,
  StartSessionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  CompleteSessionResponse,
  GetSessionHistoryRequest,
  GetSessionHistoryResponse,
  FlagQuestionRequest,
  FlagQuestionResponse,
  GetEligibilitiesResponse,
  InitiateMintRequest,
  InitiateMintResponse,
  GetMintStatusResponse,
  GetForgeProgressResponse,
  InitiateForgeRequest,
  InitiateForgeResponse,
  GetForgeStatusResponse,
  GetLeaderboardRequest,
  GetLeaderboardResponse,
  GetProfileResponse,
  GetPlayerNFTsResponse,
  GetPlayerActivityResponse,
  GetCategoriesResponse,
  GetCategoryResponse,
  GetCurrentSeasonResponse,
} from '../types/api';

/**
 * API Client class
 */
export class ApiClient {
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      timeout: config.timeout ?? 30000,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      getAuthToken: config.getAuthToken ?? (() => null),
      onUnauthorized: config.onUnauthorized ?? (() => {}),
    };
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const { method, path, body, headers = {}, skipAuth = false, retryAttempts } = config;
    const maxAttempts = retryAttempts ?? this.config.retryAttempts;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Get auth token if not skipping auth
        if (!skipAuth) {
          const token = await this.config.getAuthToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        // Set content type for JSON requests
        if (body && !headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        // Make request
        const response = await fetch(`${this.config.baseUrl}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle unauthorized
        if (response.status === 401) {
          this.config.onUnauthorized();
          throw this.createApiError('Unauthorized', 401, 'UNAUTHORIZED');
        }

        // Parse response
        const data = await response.json();

        // Handle error responses
        if (!response.ok) {
          const errorData = data as { error?: string; code?: string; details?: Record<string, unknown> };
          throw this.createApiError(
            errorData.error || response.statusText,
            response.status,
            errorData.code,
            errorData.details
          );
        }

        return {
          data: data as T,
          status: response.status,
          headers: response.headers,
        };
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error instanceof Error && 'status' in error) {
          const apiError = error as ApiError;
          if (apiError.status >= 400 && apiError.status < 500 && apiError.status !== 429) {
            throw error;
          }
        }

        // Wait before retry with exponential backoff
        if (attempt < maxAttempts - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Create API error
   */
  private createApiError(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>
  ): ApiError {
    const error: ApiError = {
      message,
      status,
      code,
      details,
    };
    return error;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Authentication API
  // ============================================================================

  async connectWallet(request: ConnectWalletRequest): Promise<ConnectWalletResponse> {
    const response = await this.request<ConnectWalletResponse>({
      method: 'POST',
      path: '/auth/connect',
      body: request,
      skipAuth: true,
    });
    return response.data;
  }

  async createProfile(request: CreateProfileRequest): Promise<CreateProfileResponse> {
    const response = await this.request<CreateProfileResponse>({
      method: 'POST',
      path: '/auth/profile',
      body: request,
    });
    return response.data;
  }

  async getCurrentUser(): Promise<GetCurrentUserResponse> {
    const response = await this.request<GetCurrentUserResponse>({
      method: 'GET',
      path: '/auth/me',
    });
    return response.data;
  }

  // ============================================================================
  // Session API
  // ============================================================================

  async startSession(request: StartSessionRequest): Promise<StartSessionResponse> {
    const response = await this.request<StartSessionResponse>({
      method: 'POST',
      path: '/sessions/start',
      body: request,
    });
    return response.data;
  }

  async getSession(sessionId: string): Promise<StartSessionResponse> {
    const response = await this.request<StartSessionResponse>({
      method: 'GET',
      path: `/sessions/${sessionId}`,
    });
    return response.data;
  }

  async submitAnswer(
    sessionId: string,
    request: SubmitAnswerRequest
  ): Promise<SubmitAnswerResponse> {
    const response = await this.request<SubmitAnswerResponse>({
      method: 'POST',
      path: `/sessions/${sessionId}/answer`,
      body: request,
    });
    return response.data;
  }

  async completeSession(sessionId: string): Promise<CompleteSessionResponse> {
    const response = await this.request<CompleteSessionResponse>({
      method: 'POST',
      path: `/sessions/${sessionId}/complete`,
    });
    return response.data;
  }

  async getSessionHistory(
    request?: GetSessionHistoryRequest
  ): Promise<GetSessionHistoryResponse> {
    const params = new URLSearchParams();
    if (request?.limit) params.append('limit', request.limit.toString());
    if (request?.offset) params.append('offset', request.offset.toString());

    const response = await this.request<GetSessionHistoryResponse>({
      method: 'GET',
      path: `/sessions/history?${params.toString()}`,
    });
    return response.data;
  }

  // ============================================================================
  // Question API
  // ============================================================================

  async flagQuestion(request: FlagQuestionRequest): Promise<FlagQuestionResponse> {
    const response = await this.request<FlagQuestionResponse>({
      method: 'POST',
      path: '/questions/flag',
      body: request,
    });
    return response.data;
  }

  // ============================================================================
  // Eligibility API
  // ============================================================================

  async getEligibilities(): Promise<GetEligibilitiesResponse> {
    const response = await this.request<GetEligibilitiesResponse>({
      method: 'GET',
      path: '/eligibilities',
    });
    return response.data;
  }

  // ============================================================================
  // Mint API
  // ============================================================================

  async initiateMint(request: InitiateMintRequest): Promise<InitiateMintResponse> {
    const response = await this.request<InitiateMintResponse>({
      method: 'POST',
      path: `/mint/${request.eligibilityId}`,
    });
    return response.data;
  }

  async getMintStatus(mintId: string): Promise<GetMintStatusResponse> {
    const response = await this.request<GetMintStatusResponse>({
      method: 'GET',
      path: `/mint/${mintId}/status`,
    });
    return response.data;
  }

  // ============================================================================
  // Forge API
  // ============================================================================

  async getForgeProgress(): Promise<GetForgeProgressResponse> {
    const response = await this.request<GetForgeProgressResponse>({
      method: 'GET',
      path: '/forge/progress',
    });
    return response.data;
  }

  async initiateForge(request: InitiateForgeRequest): Promise<InitiateForgeResponse> {
    const path =
      request.type === 'category'
        ? '/forge/category'
        : request.type === 'master'
          ? '/forge/master'
          : '/forge/season';

    const response = await this.request<InitiateForgeResponse>({
      method: 'POST',
      path,
      body: request,
    });
    return response.data;
  }

  async getForgeStatus(forgeId: string): Promise<GetForgeStatusResponse> {
    const response = await this.request<GetForgeStatusResponse>({
      method: 'GET',
      path: `/forge/${forgeId}/status`,
    });
    return response.data;
  }

  // ============================================================================
  // Leaderboard API
  // ============================================================================

  async getGlobalLeaderboard(
    request?: GetLeaderboardRequest
  ): Promise<GetLeaderboardResponse> {
    const params = new URLSearchParams();
    if (request?.seasonId) params.append('seasonId', request.seasonId);
    if (request?.limit) params.append('limit', request.limit.toString());
    if (request?.offset) params.append('offset', request.offset.toString());

    const response = await this.request<GetLeaderboardResponse>({
      method: 'GET',
      path: `/leaderboard/global?${params.toString()}`,
    });
    return response.data;
  }

  async getCategoryLeaderboard(
    categoryId: string,
    request?: GetLeaderboardRequest
  ): Promise<GetLeaderboardResponse> {
    const params = new URLSearchParams();
    if (request?.seasonId) params.append('seasonId', request.seasonId);
    if (request?.limit) params.append('limit', request.limit.toString());
    if (request?.offset) params.append('offset', request.offset.toString());

    const response = await this.request<GetLeaderboardResponse>({
      method: 'GET',
      path: `/leaderboard/category/${categoryId}?${params.toString()}`,
    });
    return response.data;
  }

  async getSeasonStandings(seasonId: string): Promise<GetLeaderboardResponse> {
    const response = await this.request<GetLeaderboardResponse>({
      method: 'GET',
      path: `/leaderboard/season/${seasonId}`,
    });
    return response.data;
  }

  // ============================================================================
  // Profile API
  // ============================================================================

  async getProfile(): Promise<GetProfileResponse> {
    const response = await this.request<GetProfileResponse>({
      method: 'GET',
      path: '/profile',
    });
    return response.data;
  }

  async getPlayerNFTs(): Promise<GetPlayerNFTsResponse> {
    const response = await this.request<GetPlayerNFTsResponse>({
      method: 'GET',
      path: '/profile/nfts',
    });
    return response.data;
  }

  async getPlayerActivity(): Promise<GetPlayerActivityResponse> {
    const response = await this.request<GetPlayerActivityResponse>({
      method: 'GET',
      path: '/profile/activity',
    });
    return response.data;
  }

  // ============================================================================
  // Category API
  // ============================================================================

  async getCategories(): Promise<GetCategoriesResponse> {
    const response = await this.request<GetCategoriesResponse>({
      method: 'GET',
      path: '/categories',
    });
    return response.data;
  }

  async getCategory(categoryId: string): Promise<GetCategoryResponse> {
    const response = await this.request<GetCategoryResponse>({
      method: 'GET',
      path: `/categories/${categoryId}`,
    });
    return response.data;
  }

  // ============================================================================
  // Season API
  // ============================================================================

  async getCurrentSeason(): Promise<GetCurrentSeasonResponse> {
    const response = await this.request<GetCurrentSeasonResponse>({
      method: 'GET',
      path: '/seasons/current',
    });
    return response.data;
  }
}

/**
 * Create API client instance
 */
export const createApiClient = (config: ApiClientConfig): ApiClient => {
  return new ApiClient(config);
};
