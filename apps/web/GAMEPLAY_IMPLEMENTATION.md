# Gameplay UI Components Implementation

## Overview

This document describes the implementation of Task 20: Core Gameplay UI Components for the TriviaNFT web application.

## Completed Subtasks

### 20.1 Category Selection Screen ✓

**Components Created:**
- `CategoryCard.tsx` - Individual category card with NFT count and stock availability
- `CategorySelection.tsx` - Main category selection screen with session limits display

**Services Created:**
- `category.ts` - Category service for fetching categories
- `session.ts` - Session service for managing trivia sessions

**Features:**
- Grid display of category cards with icons
- NFT count and stock availability per category
- Daily session limit display with countdown
- Cooldown timer display
- Disabled state when cooldown active or limit reached
- Real-time session limit updates

**Requirements Addressed:** 6, 13, 27

---

### 20.2 Session Flow Component ✓

**Components Created:**
- `SessionStartScreen.tsx` - Pre-session rules and countdown screen
- `QuestionCard.tsx` - Question display with timer and answer options
- `AnswerFeedback.tsx` - Feedback screen showing correct/incorrect results
- `SessionFlow.tsx` - Main session orchestration component

**Features:**
- Session start screen with rules message (10 questions • 10s each • no pauses • perfect = mint chance)
- Question card with 10-second countdown timer
- Progress indicator showing question X of 10
- Answer option buttons with 44x44px minimum touch targets
- Visual feedback for selected answers
- Timeout handling with automatic advance
- Answer submission with timing tracking
- Explanation display after each answer
- Auto-advance to next question after 2 seconds

**Requirements Addressed:** 1, 32, 33, 40

---

### 20.3 Session Results Screen ✓

**Components Created:**
- `SessionResults.tsx` - Comprehensive results display with statistics

**Features:**
- Final score display (X/10)
- Correct/incorrect breakdown with badges
- Perfect score celebration message
- Mint eligibility notification with "Mint Now" button
- Session statistics:
  - Total time
  - Average time per question
  - Win/Loss status
  - Perfect score achievement badge
- Action buttons:
  - Mint Now (if eligible)
  - Play Again
  - Back to Categories
- Contextual encouragement messages

**Requirements Addressed:** 10, 34

---

### 20.4 Session State Management ✓

**Contexts Created:**
- `SessionContext.tsx` - React context for managing active session state

**Hooks Created:**
- `useSessionTimer.ts` - Reusable timer hook with pause/resume functionality

**Components Created:**
- `ActiveSessionGuard.tsx` - Prevents multiple active sessions

**Features:**
- Active session tracking across app
- Session lock mechanism to prevent concurrent sessions
- Browser refresh recovery (restores session within 15 minutes)
- LocalStorage persistence for session recovery
- Automatic session cleanup on completion
- Periodic check for active sessions (every 30 seconds)
- Session lock expiration handling
- Active session warning screen

**Requirements Addressed:** 1, 2

---

## File Structure

```
apps/web/
├── app/
│   └── gameplay-demo.tsx          # Demo page showcasing gameplay flow
├── src/
│   ├── components/
│   │   ├── CategoryCard.tsx       # Category card component
│   │   ├── CategorySelection.tsx  # Category selection screen
│   │   ├── QuestionCard.tsx       # Question display component
│   │   ├── SessionStartScreen.tsx # Session start screen
│   │   ├── AnswerFeedback.tsx     # Answer feedback screen
│   │   ├── SessionFlow.tsx        # Main session orchestration
│   │   ├── SessionResults.tsx     # Results screen
│   │   └── ActiveSessionGuard.tsx # Session lock guard
│   ├── contexts/
│   │   └── SessionContext.tsx     # Session state management
│   ├── hooks/
│   │   └── useSessionTimer.ts     # Timer hook
│   └── services/
│       ├── category.ts            # Category API service
│       └── session.ts             # Session API service
```

## Key Design Decisions

### 1. Session State Management
- Used React Context for global session state
- LocalStorage for persistence across refreshes
- Session lock mechanism prevents concurrent sessions
- 15-minute expiration for abandoned sessions

### 2. Timer Implementation
- Custom hook for reusable timer logic
- Visual countdown with progress circle
- Warning state at 3 seconds or less
- Automatic timeout handling

### 3. Component Architecture
- Separation of concerns (display vs. orchestration)
- Reusable UI components (Card, Button, Badge, Timer)
- Type-safe props with TypeScript interfaces
- Error handling at component boundaries

### 4. User Experience
- Clear visual feedback for all actions
- Smooth transitions between states
- Accessible touch targets (44x44px minimum)
- Responsive design for mobile and desktop
- Auto-advance after feedback (2 seconds)

## API Integration

### Category Service
```typescript
GET /categories
Response: { categories: Category[] }
```

### Session Service
```typescript
GET /sessions/limits
Response: { dailyLimit, remainingSessions, resetAt, cooldownEndsAt }

POST /sessions/start
Body: { categoryId }
Response: { session: Session }

POST /sessions/{id}/answer
Body: { questionIndex, optionIndex, timeMs }
Response: { correct, correctIndex, explanation, score }

POST /sessions/{id}/complete
Response: { result: SessionResult }

GET /sessions/{id}
Response: { session: Session }
```

## Testing Recommendations

1. **Unit Tests:**
   - Timer hook functionality
   - Session context state management
   - Component rendering with various props

2. **Integration Tests:**
   - Complete session flow from start to finish
   - Session recovery after refresh
   - Multiple session prevention
   - Timeout handling

3. **E2E Tests:**
   - Full gameplay flow
   - Perfect score achievement
   - Session limit enforcement
   - Cooldown enforcement

## Usage Example

```tsx
import { SessionProvider } from '../src/contexts/SessionContext';
import { CategorySelection } from '../src/components/CategorySelection';
import { SessionFlow } from '../src/components/SessionFlow';
import { SessionResults } from '../src/components/SessionResults';

function GameplayScreen() {
  const [state, setState] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [result, setResult] = useState(null);

  return (
    <SessionProvider>
      {state === 'categories' && (
        <CategorySelection onCategorySelect={handleSelect} />
      )}
      {state === 'session' && (
        <SessionFlow
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
          onComplete={handleComplete}
        />
      )}
      {state === 'results' && (
        <SessionResults
          result={result}
          categoryName={selectedCategory.name}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </SessionProvider>
  );
}
```

## Next Steps

The following tasks can now be implemented:
- Task 21: NFT minting and inventory UI
- Task 22: Forging UI
- Task 23: Leaderboard and profile UI
- Task 24: PWA features
- Task 25: Error handling and user feedback

## Notes

- All components use Tailwind CSS via NativeWind for styling
- Components are fully typed with TypeScript
- Responsive design supports both mobile and desktop
- Accessibility considerations (touch targets, color contrast)
- Error boundaries should be added for production use
