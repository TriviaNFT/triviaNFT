import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@trivia-nft/shared';
import { sessionService } from '../services';

interface SessionContextValue {
  // State
  activeSession: Session | null;
  isSessionActive: boolean;
  hasActiveSessionLock: boolean;

  // Actions
  checkForActiveSession: () => Promise<void>;
  clearActiveSession: () => void;
  setActiveSession: (session: Session) => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: React.ReactNode;
}

const SESSION_STORAGE_KEY = 'trivia_active_session';
const SESSION_LOCK_KEY = 'trivia_session_lock';

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [activeSession, setActiveSessionState] = useState<Session | null>(null);
  const [hasActiveSessionLock, setHasActiveSessionLock] = useState(false);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize - check for active session on mount
  useEffect(() => {
    checkForActiveSession();
    
    // Set up periodic check for active session (every 30 seconds)
    checkIntervalRef.current = setInterval(() => {
      checkForActiveSession();
    }, 30000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Handle browser refresh - restore session from localStorage
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeSession) {
        // Save session to localStorage for recovery
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          sessionId: activeSession.id,
          timestamp: Date.now(),
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeSession]);

  // Restore session on mount if exists
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedData = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!savedData) return;

        const { sessionId, timestamp } = JSON.parse(savedData);
        
        // Check if session is still valid (within 15 minutes)
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;
        
        if (now - timestamp > fifteenMinutes) {
          // Session expired
          localStorage.removeItem(SESSION_STORAGE_KEY);
          return;
        }

        // Try to fetch session from backend
        const response = await sessionService.getSession(sessionId);
        
        if (response.session && response.session.status === 'active') {
          setActiveSessionState(response.session);
          setHasActiveSessionLock(true);
        } else {
          // Session no longer active
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    };

    restoreSession();
  }, []);

  const checkForActiveSession = useCallback(async () => {
    try {
      // Check if there's a session lock indicator
      const lockData = localStorage.getItem(SESSION_LOCK_KEY);
      
      if (lockData) {
        const { timestamp } = JSON.parse(lockData);
        const now = Date.now();
        const fifteenMinutes = 15 * 60 * 1000;
        
        if (now - timestamp < fifteenMinutes) {
          setHasActiveSessionLock(true);
        } else {
          // Lock expired
          localStorage.removeItem(SESSION_LOCK_KEY);
          setHasActiveSessionLock(false);
        }
      } else {
        setHasActiveSessionLock(false);
      }
    } catch (error) {
      console.error('Failed to check for active session:', error);
    }
  }, []);

  const setActiveSession = useCallback((session: Session) => {
    setActiveSessionState(session);
    setHasActiveSessionLock(true);
    
    // Set session lock
    localStorage.setItem(SESSION_LOCK_KEY, JSON.stringify({
      sessionId: session.id,
      timestamp: Date.now(),
    }));
    
    // Save session for recovery
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      sessionId: session.id,
      timestamp: Date.now(),
    }));
  }, []);

  const clearActiveSession = useCallback(() => {
    setActiveSessionState(null);
    setHasActiveSessionLock(false);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_LOCK_KEY);
  }, []);

  const value: SessionContextValue = {
    activeSession,
    isSessionActive: !!activeSession,
    hasActiveSessionLock,
    checkForActiveSession,
    clearActiveSession,
    setActiveSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
