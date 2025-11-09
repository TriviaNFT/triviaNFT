/**
 * Lambda function handlers
 */

// Authentication handlers
export {
  connectHandler,
  profileHandler,
  meHandler,
  authorizerHandler,
} from './auth/index.js';

// Session handlers
export {
  startSession,
  submitAnswer,
  completeSession,
  getSessionHistory,
} from './sessions/index.js';

// Question handlers
export {
  generateHandler,
  indexQuestionsHandler,
  selectHandler,
  flagHandler,
} from './questions/index.js';

// Mint handlers
export {
  getEligibilities,
  initiateMint,
  getMintStatus,
  workflow as mintWorkflow,
} from './mint/index.js';

// Forge handlers
export {
  getProgress as getForgeProgress,
  initiateForge,
  getStatus as getForgeStatus,
} from './forge/index.js';

// Leaderboard handlers
export {
  getGlobal as getGlobalLeaderboard,
  getCategory as getCategoryLeaderboard,
  getSeason as getSeasonLeaderboard,
} from './leaderboard/index.js';

// Season handlers
export {
  getCurrentSeason,
  transitionSeason,
} from './seasons/index.js';
