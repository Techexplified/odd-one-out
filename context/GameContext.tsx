import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Badge, PlayerStats, RunRecord } from '@/types/game';
import { addDays, dateKey, daysBetween } from '@/utils/date';
import { calculateScore, calculateStars, COINS_PER_STAR, TOTAL_LEVELS } from '@/utils/gameEngine';
import {
  deleteBackendHighScore,
  flushPendingHighScoreSync,
  getSyncState,
  syncPlayerHighScore,
} from '@/utils/highscoreApi';
import { disableDailyReminder, enableDailyReminder } from '@/utils/reminders';

/* ------------------------------------------------------------------ */
/* Economy & tuning                                                    */
/* ------------------------------------------------------------------ */

export const HEART_REGEN_INTERVAL_MS = 15 * 60 * 1000;
export const HEART_REFILL_COST = 50;
export const HINT_COST = 20;
export const EXTRA_TIME_COST = 20;
export const EXTRA_TIME_SECONDS = 10;
export const HINT_PACK_COST = 60;
export const HINT_PACK_SIZE = 3;
export const DAILY_BONUS_COINS = 20;
export const STREAK_MILESTONE_DAYS = 7;
export const STREAK_MILESTONE_COINS = 100;
export const MAX_STREAK_FREEZES = 2;
const MAX_RUNS_STORED = 200;

const STORAGE_KEY = '@oddoneout_player_stats_v4';
const LEGACY_KEYS = ['@oddoneout_player_stats_v3', '@oddoneout_player_stats_v2'];

const DEFAULT_STATS: PlayerStats = {
  playerName: 'Little Detective',
  avatar: 'boy',
  currentLevel: 1,
  highestLevelUnlocked: 1,
  coins: 100,
  totalCoinsEarned: 100,
  stars: 0,
  levelStars: {},
  levelBestScore: {},
  hearts: 3,
  maxHearts: 3,
  lastHeartRegenTimestamp: 0,
  highScore: 0,
  gamesPlayed: 0,
  gamesWon: 0,
  fastestSolveSec: null,
  flawlessStreak: 0,
  bestFlawlessStreak: 0,
  hintsRemaining: 3,
  dailyBestScore: 0,
  dailyBestTimeSec: null,
  dailyLastScore: 0,
  dailyLastTimeSec: 0,
  dailyLastAccuracy: 0,
  hasSeenDailyInstructions: false,
  endlessBestWave: 0,
  endlessBestScore: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastStreakDate: null,
  lastMissedStreakDate: null,
  previousStreakBeforeLoss: 0,
  completedDates: [],
  frozenDates: [],
  streakFreezes: 0,
  streakReminderEnabled: false,
  sfxEnabled: true,
  hapticsEnabled: true,
  darkModeOverride: null,
  unlockedBadges: [],
  runs: [],
  hasSeenTutorial: false,
};

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const ALL_BADGES: (Omit<Badge, 'unlocked' | 'progress'> & { progress: (s: PlayerStats) => number })[] = [
  { id: 'badge_first_step', title: 'First Step', description: 'Solve your first puzzle', icon: 'seedling', category: 'levels',
    progress: (s) => Math.min(1, s.gamesWon) },
  { id: 'badge_sharp_eye', title: 'Sharp Eye', description: 'Win 10 puzzles in a row without a mistake', icon: 'eye', category: 'accuracy',
    progress: (s) => Math.min(1, s.bestFlawlessStreak / 10) },
  { id: 'badge_speed_demon', title: 'Speed Demon', description: 'Solve a puzzle in under 3 seconds', icon: 'bolt', category: 'speed',
    progress: (s) => (s.fastestSolveSec === null ? 0 : Math.min(1, 3 / Math.max(s.fastestSolveSec, 0.001))) },
  { id: 'badge_fire_streak', title: 'On Fire!', description: 'Reach a 7-day daily streak', icon: 'fire', category: 'streaks',
    progress: (s) => Math.min(1, s.bestStreak / 7) },
  { id: 'badge_coin_hoarder', title: 'Treasure Hunter', description: 'Earn 500 coins in total', icon: 'money_bag', category: 'levels',
    progress: (s) => Math.min(1, s.totalCoinsEarned / 500) },
  { id: 'badge_master_spotter', title: 'Master Spotter', description: 'Clear all 25 Easy levels', icon: 'crown', category: 'levels',
    progress: (s) => Math.min(1, (s.highestLevelUnlocked - 1) / 25) },
  { id: 'badge_grandmaster', title: 'Grandmaster', description: `Clear all ${TOTAL_LEVELS} levels`, icon: 'trophy', category: 'levels',
    progress: (s) => Math.min(1, Object.keys(s.levelStars).length / TOTAL_LEVELS) },
];

function withNewBadges(s: PlayerStats): { stats: PlayerStats; newBadges: string[] } {
  const newBadges = ALL_BADGES.filter((b) => b.progress(s) >= 1 && !s.unlockedBadges.includes(b.id)).map((b) => b.id);
  if (!newBadges.length) return { stats: s, newBadges };
  return { stats: { ...s, unlockedBadges: [...s.unlockedBadges, ...newBadges] }, newBadges };
}

export function badgeById(id: string) {
  return ALL_BADGES.find((b) => b.id === id);
}

/* ------------------------------------------------------------------ */
/* Pure state transitions                                              */
/* ------------------------------------------------------------------ */

function applyHeartRegen(s: PlayerStats, now: number): PlayerStats {
  if (s.hearts >= s.maxHearts) return s;
  if (!s.lastHeartRegenTimestamp) {
    return { ...s, lastHeartRegenTimestamp: now };
  }
  const gained = Math.floor((now - s.lastHeartRegenTimestamp) / HEART_REGEN_INTERVAL_MS);
  if (gained <= 0) return s;
  const hearts = Math.min(s.maxHearts, s.hearts + gained);
  return {
    ...s,
    hearts,
    lastHeartRegenTimestamp: hearts >= s.maxHearts ? now : s.lastHeartRegenTimestamp + gained * HEART_REGEN_INTERVAL_MS,
  };
}

/** Breaks the streak after a missed day, unless freezes cover the gap. */
function normalizeStreak(s: PlayerStats, today: string): PlayerStats {
  if (!s.lastStreakDate || s.currentStreak === 0) return s;
  const gap = daysBetween(s.lastStreakDate, today);
  if (gap <= 1) return s;
  const missed = gap - 1;
  if (missed <= s.streakFreezes) {
    const frozen = Array.from({ length: missed }, (_, i) => addDays(s.lastStreakDate as string, i + 1));
    return {
      ...s,
      streakFreezes: s.streakFreezes - missed,
      frozenDates: [...s.frozenDates, ...frozen],
      lastStreakDate: addDays(today, -1),
    };
  }
  return {
    ...s,
    previousStreakBeforeLoss: s.currentStreak,
    lastMissedStreakDate: addDays(s.lastStreakDate, 1),
    currentStreak: 0,
    lastStreakDate: null,
  };
}

/** Recompute total stars from levelStars + completedDates so stars are always consistent. */
function sanitizeStats(raw: Partial<PlayerStats>): PlayerStats {
  // Detect if raw came from the temporary v3 placeholder seed (where runs was empty but currentLevel was 12)
  const isLegacyPlaceholderSeed =
    Array.isArray(raw.runs) &&
    raw.runs.length === 0 &&
    raw.currentLevel === 12 &&
    raw.highestLevelUnlocked === 12;

  if (isLegacyPlaceholderSeed) {
    return {
      ...DEFAULT_STATS,
      playerName: raw.playerName || DEFAULT_STATS.playerName,
      avatar: raw.avatar || DEFAULT_STATS.avatar,
      sfxEnabled: raw.sfxEnabled ?? true,
      hapticsEnabled: raw.hapticsEnabled ?? true,
      darkModeOverride: raw.darkModeOverride ?? null,
    };
  }

  const merged: PlayerStats = {
    ...DEFAULT_STATS,
    ...raw,
    maxHearts: 3,
    levelStars: raw.levelStars && typeof raw.levelStars === 'object' ? raw.levelStars : {},
    levelBestScore: raw.levelBestScore && typeof raw.levelBestScore === 'object' ? raw.levelBestScore : {},
    completedDates: Array.isArray(raw.completedDates) ? raw.completedDates : [],
    frozenDates: Array.isArray(raw.frozenDates) ? raw.frozenDates : [],
    unlockedBadges: Array.isArray(raw.unlockedBadges) ? raw.unlockedBadges : [],
    runs: Array.isArray(raw.runs) ? raw.runs : [],
  };
  merged.hearts = Math.max(0, Math.min(merged.maxHearts, Number(merged.hearts ?? merged.maxHearts)));
  return merged;
}

function pushRun(s: PlayerStats, run: Omit<RunRecord, 'id' | 'playedAt'>): RunRecord[] {
  const record: RunRecord = {
    ...run,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    playedAt: new Date().toISOString(),
  };
  return [record, ...s.runs].slice(0, MAX_RUNS_STORED);
}

function earn(s: PlayerStats, coins: number): Pick<PlayerStats, 'coins' | 'totalCoinsEarned'> {
  return { coins: s.coins + coins, totalCoinsEarned: s.totalCoinsEarned + coins };
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export interface LevelResult {
  stars: number;
  starsEarned: number;
  score: number;
  coinsEarned: number;
  timeTakenSec: number;
  accuracy: number;
  isNewBest: boolean;
  newBadges: string[];
}

export interface DailyResult extends LevelResult {
  alreadyCompleted: boolean;
  streak: number;
  milestoneReached: boolean;
}

export interface EndlessResult {
  wavesCleared: number;
  score: number;
  coinsEarned: number;
  starsEarned: number;
  accuracy: number;
  isNewBestWave: boolean;
  isNewBestScore: boolean;
  newBadges: string[];
}

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error';

interface GameContextType {
  stats: PlayerStats;
  badges: Badge[];
  isLoading: boolean;
  today: string;
  isDailyCompletedToday: boolean;
  /** Milliseconds until the next heart, or null when hearts are full. */
  nextHeartInMs: number | null;
  completeLevel: (level: number, timeRemaining: number, totalTime: number, mistakes: number) => LevelResult;
  completeDaily: (timeRemaining: number, totalTime: number, mistakes: number) => DailyResult;
  completeEndlessRun: (wavesCleared: number, totalScore: number, mistakes: number, timeTakenSec: number) => EndlessResult;
  recordEndlessWaveProgress: (wavesCleared: number, currentScore: number) => void;
  /** Wrong tap. Returns hearts left. */
  recordMistake: () => number;
  /** Timer ran out — costs a heart and ends the attempt. Returns hearts left. */
  recordTimeout: () => number;
  /** Attempt ended because hearts reached zero. */
  recordFailedAttempt: () => void;
  useHint: () => 'free' | 'paid' | false;
  useExtraTime: () => boolean;
  buyHeartRefill: () => 'full' | 'insufficient' | 'ok';
  buyHintPack: () => 'insufficient' | 'ok';
  setStreakReminder: (enabled: boolean) => Promise<boolean>;
  updatePlayerName: (name: string) => void;
  updateAvatar: (avatar: string) => void;
  toggleSfx: () => void;
  toggleHaptics: () => void;
  setThemeMode: (mode: boolean | null) => void;
  toggleDarkMode: () => void;
  markTutorialSeen: () => void;
  markDailyInstructionsSeen: () => void;
  triggerHaptic: (type?: HapticType) => void;
  resetProgress: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<PlayerStats>(DEFAULT_STATS);
  const statsRef = useRef<PlayerStats>(DEFAULT_STATS);
  const isHydratedRef = useRef(false);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [today, setToday] = useState(() => dateKey());

  const persistToDisk = useCallback((next: PlayerStats) => {
    const serialized = JSON.stringify(next);
    saveChainRef.current = saveChainRef.current
      .then(() => AsyncStorage.setItem(STORAGE_KEY, serialized))
      .catch((err) => console.warn('Error saving stats:', err));
  }, []);

  /** Apply an update against the latest state and persist it to device storage. */
  const commit = useCallback(
    (updater: (prev: PlayerStats) => PlayerStats) => {
      const next = updater(statsRef.current);
      statsRef.current = next;
      setStats(next);
      if (isHydratedRef.current) {
        persistToDisk(next);
      }
      return next;
    },
    [persistToDisk]
  );

  // Load saved state from device storage on mount
  useEffect(() => {
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
          for (const legacyKey of LEGACY_KEYS) {
            const legacyRaw = await AsyncStorage.getItem(legacyKey);
            if (legacyRaw) {
              raw = legacyRaw;
              break;
            }
          }
        }
        const parsed = raw ? sanitizeStats(JSON.parse(raw)) : DEFAULT_STATS;
        const ts = Date.now();
        const hydrated = normalizeStreak(applyHeartRegen(parsed, ts), dateKey());
        statsRef.current = hydrated;
        isHydratedRef.current = true;
        setStats(hydrated);
        persistToDisk(hydrated);

        // Flush any queued offline highscores or sync with backend on launch
        flushPendingHighScoreSync(hydrated, dateKey());

        if (hydrated.streakReminderEnabled) {
          enableDailyReminder().then((ok) => {
            if (!ok) commit((s) => ({ ...s, streakReminderEnabled: false }));
          });
        }
      } catch (err) {
        console.warn('Error loading stats:', err);
        isHydratedRef.current = true;
      } finally {
        setIsLoading(false);
      }
    })();
  }, [commit, persistToDisk]);

  // Day rollover & resume: re-evaluate streak, hearts, and auto-sync offline highscores.
  useEffect(() => {
    const refresh = () => {
      if (!isHydratedRef.current) return;
      const key = dateKey();
      setToday(key);
      setNow(Date.now());
      const next = commit((s) => normalizeStreak(applyHeartRegen(s, Date.now()), key));
      flushPendingHighScoreSync(next, key);
    };
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    const dayTimer = setInterval(() => {
      if (dateKey() !== today) refresh();
    }, 60 * 1000);
    // Auto-reconnect heartbeat: retry syncing every 12s when offline or when a pending sync is queued
    const syncRetryTimer = setInterval(() => {
      if (!isHydratedRef.current) return;
      const syncState = getSyncState();
      if (syncState.status === 'offline' || syncState.hasPendingSync) {
        flushPendingHighScoreSync(statsRef.current, dateKey());
      }
    }, 12 * 1000);

    const handleOnline = () => {
      if (isHydratedRef.current) {
        flushPendingHighScoreSync(statsRef.current, dateKey());
      }
    };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('online', handleOnline);
    }

    return () => {
      sub.remove();
      clearInterval(dayTimer);
      clearInterval(syncRetryTimer);
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [commit, today]);

  // Live heart regeneration while not full.
  const heartsFull = stats.hearts >= stats.maxHearts;
  useEffect(() => {
    if (heartsFull) return;
    const id = setInterval(() => {
      if (!isHydratedRef.current) return;
      const ts = Date.now();
      setNow(ts);
      const s = statsRef.current;
      if (s.hearts < s.maxHearts && ts - s.lastHeartRegenTimestamp >= HEART_REGEN_INTERVAL_MS) {
        commit((prev) => applyHeartRegen(prev, ts));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [heartsFull, commit]);

  const triggerHaptic = useCallback((type: HapticType = 'light') => {
    if (!statsRef.current.hapticsEnabled) return;
    try {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch {
      // ignore web/unsupported
    }
  }, []);

  /** Shared win bookkeeping for campaign and daily runs. */
  const applyWin = (
    s: PlayerStats,
    level: number,
    timeRemaining: number,
    totalTime: number,
    mistakes: number,
    runDateKey: string
  ) => {
    const stars = calculateStars(timeRemaining, totalTime);
    const score = calculateScore(level, timeRemaining, stars);
    const timeTakenSec = Math.max(1, totalTime - timeRemaining);
    const accuracy = Math.round((1 / (1 + Math.max(0, mistakes))) * 100);
    const flawless = mistakes === 0 ? s.flawlessStreak + 1 : 0;
    const next: PlayerStats = {
      ...s,
      highScore: Math.max(s.highScore, score),
      gamesPlayed: s.gamesPlayed + 1,
      gamesWon: s.gamesWon + 1,
      fastestSolveSec: s.fastestSolveSec === null ? timeTakenSec : Math.min(s.fastestSolveSec, timeTakenSec),
      flawlessStreak: flawless,
      bestFlawlessStreak: Math.max(s.bestFlawlessStreak, flawless),
      runs: pushRun(s, { level, score, stars, timeTakenSec, accuracy, dateKey: runDateKey }),
    };
    return { next, stars, score, timeTakenSec, accuracy };
  };

  const completeLevel = (level: number, timeRemaining: number, totalTime: number, mistakes: number): LevelResult => {
    triggerHaptic('success');
    const key = dateKey();
    let result: LevelResult = {
      stars: 0,
      starsEarned: 0,
      score: 0,
      coinsEarned: 0,
      timeTakenSec: 0,
      accuracy: 100,
      isNewBest: false,
      newBadges: [],
    };
    commit((prev) => {
      const { next, stars, score, timeTakenSec, accuracy } = applyWin(prev, level, timeRemaining, totalTime, mistakes, key);
      const prevStars = prev.levelStars[level] || 0;
      const prevBest = prev.levelBestScore[level] || 0;
      const newStarsEarned = Math.max(0, stars - prevStars);
      const firstClearBonus = prevStars === 0 ? 20 : 0;
      const coinsEarned = newStarsEarned * COINS_PER_STAR + firstClearBonus;
      const nextLevel = level + 1;
      const nextLevelBestScore = {
        ...prev.levelBestScore,
        [level]: Math.max(prevBest, score),
      };
      const levelSum = Object.values(nextLevelBestScore).reduce((a, b) => a + b, 0);
      const careerTotal = levelSum + (prev.dailyBestScore || 0) + (prev.endlessBestScore || 0);
      const updated: PlayerStats = {
        ...next,
        ...earn(prev, coinsEarned),
        highScore: Math.max(next.highScore, careerTotal),
        currentLevel: level >= prev.currentLevel ? nextLevel : prev.currentLevel,
        highestLevelUnlocked: Math.max(prev.highestLevelUnlocked, nextLevel),
        stars: prev.stars + newStarsEarned,
        levelStars: { ...prev.levelStars, [level]: Math.max(prevStars, stars) },
        levelBestScore: nextLevelBestScore,
      };
      const { stats: withBadges, newBadges } = withNewBadges(updated);
      result = {
        stars,
        starsEarned: newStarsEarned,
        score,
        coinsEarned,
        timeTakenSec,
        accuracy,
        isNewBest: score > prevBest,
        newBadges,
      };
      return withBadges;
    });
    syncPlayerHighScore(statsRef.current, key);
    return result;
  };

  const completeDaily = (timeRemaining: number, totalTime: number, mistakes: number): DailyResult => {
    const key = dateKey();
    triggerHaptic('success');
    let result: DailyResult = {
      stars: 3,
      starsEarned: 0,
      score: 0,
      coinsEarned: 0,
      timeTakenSec: 0,
      accuracy: 100,
      isNewBest: false,
      newBadges: [],
      alreadyCompleted: false,
      streak: statsRef.current.currentStreak,
      milestoneReached: false,
    };

    const alreadyDoneToday = statsRef.current.completedDates.includes(key);

    commit((raw) => {
      const prev = normalizeStreak(raw, key);
      const { next, stars, timeTakenSec, accuracy } = applyWin(prev, 0, timeRemaining, totalTime, mistakes, key);
      const dailyScore = (180 + Math.floor(timeRemaining * 4.5)) * stars;
      const isNewBest = dailyScore > prev.dailyBestScore;
      const nextBestTime =
        prev.dailyBestTimeSec === null ? timeTakenSec : Math.min(prev.dailyBestTimeSec, timeTakenSec);

      if (alreadyDoneToday) {
        const updatedPractice: PlayerStats = {
          ...next,
          highScore: Math.max(prev.highScore, dailyScore),
          dailyBestScore: Math.max(prev.dailyBestScore, dailyScore),
          dailyBestTimeSec: nextBestTime,
          dailyLastScore: Math.max(prev.dailyLastScore, dailyScore),
          dailyLastTimeSec: prev.dailyLastTimeSec > 0 ? Math.min(prev.dailyLastTimeSec, timeTakenSec) : timeTakenSec,
          dailyLastAccuracy: Math.max(prev.dailyLastAccuracy, accuracy),
          runs: [{ ...next.runs[0], score: dailyScore }, ...next.runs.slice(1)],
        };
        result = {
          stars,
          starsEarned: 0,
          score: dailyScore,
          coinsEarned: 0,
          timeTakenSec,
          accuracy,
          isNewBest,
          newBadges: [],
          alreadyCompleted: true,
          streak: prev.currentStreak,
          milestoneReached: false,
        };
        return updatedPractice;
      }

      const streak = prev.lastStreakDate === addDays(key, -1) ? prev.currentStreak + 1 : 1;
      const milestoneReached = streak > 0 && streak % STREAK_MILESTONE_DAYS === 0;
      const coinsEarned = stars * COINS_PER_STAR + DAILY_BONUS_COINS + (milestoneReached ? STREAK_MILESTONE_COINS : 0);
      const updated: PlayerStats = {
        ...next,
        ...earn(prev, coinsEarned),
        stars: prev.stars + stars,
        highScore: Math.max(prev.highScore, dailyScore),
        dailyBestScore: Math.max(prev.dailyBestScore, dailyScore),
        dailyBestTimeSec: nextBestTime,
        dailyLastScore: dailyScore,
        dailyLastTimeSec: timeTakenSec,
        dailyLastAccuracy: accuracy,
        runs: [{ ...next.runs[0], score: dailyScore }, ...next.runs.slice(1)],
        currentStreak: streak,
        bestStreak: Math.max(prev.bestStreak, streak),
        lastStreakDate: key,
        lastMissedStreakDate: null,
        previousStreakBeforeLoss: 0,
        completedDates: [...prev.completedDates, key],
        streakFreezes: milestoneReached ? Math.min(MAX_STREAK_FREEZES, prev.streakFreezes + 1) : prev.streakFreezes,
      };
      const { stats: withBadges, newBadges } = withNewBadges(updated);
      result = {
        stars,
        starsEarned: stars,
        score: dailyScore,
        coinsEarned,
        timeTakenSec,
        accuracy,
        isNewBest,
        newBadges,
        alreadyCompleted: false,
        streak,
        milestoneReached,
      };
      return withBadges;
    });
    syncPlayerHighScore(statsRef.current, key);
    return result;
  };

  const completeEndlessRun = (
    wavesCleared: number,
    totalScore: number,
    mistakes: number,
    timeTakenSec: number
  ): EndlessResult => {
    const key = dateKey();
    if (wavesCleared > 0) {
      triggerHaptic('success');
    } else {
      triggerHaptic('error');
    }
    let result: EndlessResult = {
      wavesCleared,
      score: totalScore,
      coinsEarned: 0,
      starsEarned: 0,
      accuracy: 100,
      isNewBestWave: false,
      isNewBestScore: false,
      newBadges: [],
    };
    commit((prev) => {
      const totalTaps = Math.max(1, wavesCleared + mistakes);
      const accuracy = wavesCleared > 0 ? Math.round((wavesCleared / totalTaps) * 100) : 0;
      const coinsEarned = wavesCleared * 8;
      const starsEarned = wavesCleared >= 10 ? 3 : wavesCleared >= 5 ? 2 : wavesCleared >= 1 ? 1 : 0;
      const isNewBestWave = wavesCleared > (prev.endlessBestWave || 0);
      const isNewBestScore = totalScore > (prev.endlessBestScore || 0);
      const updated: PlayerStats = {
        ...prev,
        ...earn(prev, coinsEarned),
        stars: prev.stars + starsEarned,
        highScore: Math.max(prev.highScore, totalScore),
        gamesPlayed: prev.gamesPlayed + 1,
        gamesWon: wavesCleared > 0 ? prev.gamesWon + 1 : prev.gamesWon,
        endlessBestWave: Math.max(prev.endlessBestWave || 0, wavesCleared),
        endlessBestScore: Math.max(prev.endlessBestScore || 0, totalScore),
        runs:
          wavesCleared > 0
            ? pushRun(prev, {
                level: -1,
                score: totalScore,
                stars: starsEarned,
                timeTakenSec: Math.max(1, timeTakenSec),
                accuracy,
                dateKey: key,
              })
            : prev.runs,
      };
      const { stats: withBadges, newBadges } = withNewBadges(updated);
      result = {
        wavesCleared,
        score: totalScore,
        coinsEarned,
        starsEarned,
        accuracy,
        isNewBestWave,
        isNewBestScore,
        newBadges,
      };
      return withBadges;
    });
    syncPlayerHighScore(statsRef.current, key);
    return result;
  };

  const recordEndlessWaveProgress = (wavesCleared: number, currentScore: number) => {
    const key = dateKey();
    commit((prev) => {
      const nextEndlessBestWave = Math.max(prev.endlessBestWave || 0, wavesCleared);
      const nextEndlessBestScore = Math.max(prev.endlessBestScore || 0, currentScore);
      const levelSum = Object.values(prev.levelBestScore || {}).reduce((a, b) => a + b, 0);
      const careerTotal = levelSum + (prev.dailyBestScore || 0) + nextEndlessBestScore;
      return {
        ...prev,
        endlessBestWave: nextEndlessBestWave,
        endlessBestScore: nextEndlessBestScore,
        highScore: Math.max(prev.highScore, currentScore, careerTotal),
      };
    });
    syncPlayerHighScore(statsRef.current, key);
  };

  const loseHeart = (s: PlayerStats): PlayerStats => {
    const ts = Date.now();
    const regen = applyHeartRegen(s, ts);
    return {
      ...regen,
      hearts: Math.max(0, regen.hearts - 1),
      lastHeartRegenTimestamp: regen.hearts >= regen.maxHearts ? ts : regen.lastHeartRegenTimestamp,
      flawlessStreak: 0,
    };
  };

  const recordMistake = () => {
    triggerHaptic('error');
    return commit(loseHeart).hearts;
  };

  const recordTimeout = () => {
    triggerHaptic('error');
    return commit((s) => ({ ...loseHeart(s), gamesPlayed: s.gamesPlayed + 1 })).hearts;
  };

  const recordFailedAttempt = () => {
    commit((s) => ({ ...s, gamesPlayed: s.gamesPlayed + 1 }));
  };

  const useHint = (): 'free' | 'paid' | false => {
    const s = statsRef.current;
    if (s.hintsRemaining > 0) {
      triggerHaptic('medium');
      commit((p) => ({ ...p, hintsRemaining: p.hintsRemaining - 1 }));
      return 'free';
    }
    if (s.coins >= HINT_COST) {
      triggerHaptic('medium');
      commit((p) => ({ ...p, coins: p.coins - HINT_COST }));
      return 'paid';
    }
    return false;
  };

  const useExtraTime = (): boolean => {
    const s = statsRef.current;
    if (s.coins < EXTRA_TIME_COST) return false;
    triggerHaptic('medium');
    commit((p) => ({ ...p, coins: p.coins - EXTRA_TIME_COST }));
    return true;
  };

  const buyHeartRefill = (): 'full' | 'insufficient' | 'ok' => {
    const s = applyHeartRegen(statsRef.current, Date.now());
    if (s.hearts >= s.maxHearts) return 'full';
    if (s.coins < HEART_REFILL_COST) return 'insufficient';
    triggerHaptic('success');
    commit((p) => ({ ...p, coins: p.coins - HEART_REFILL_COST, hearts: p.maxHearts, lastHeartRegenTimestamp: Date.now() }));
    return 'ok';
  };

  const buyHintPack = (): 'insufficient' | 'ok' => {
    if (statsRef.current.coins < HINT_PACK_COST) return 'insufficient';
    triggerHaptic('success');
    commit((p) => ({ ...p, coins: p.coins - HINT_PACK_COST, hintsRemaining: p.hintsRemaining + HINT_PACK_SIZE }));
    return 'ok';
  };

  const setStreakReminder = async (enabled: boolean) => {
    triggerHaptic('light');
    if (!enabled) {
      await disableDailyReminder();
      commit((s) => ({ ...s, streakReminderEnabled: false }));
      return true;
    }
    const ok = await enableDailyReminder();
    commit((s) => ({ ...s, streakReminderEnabled: ok }));
    return ok;
  };

  const updatePlayerName = (name: string) => {
    const next = commit((s) => ({ ...s, playerName: name }));
    syncPlayerHighScore(next, dateKey());
  };

  const updateAvatar = (avatar: string) => {
    triggerHaptic('light');
    const next = commit((s) => ({ ...s, avatar }));
    syncPlayerHighScore(next, dateKey());
  };

  const toggleSfx = () => {
    triggerHaptic('light');
    commit((s) => ({ ...s, sfxEnabled: !s.sfxEnabled }));
  };

  const toggleHaptics = () => {
    const enabling = !statsRef.current.hapticsEnabled;
    if (enabling) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // ignore
      }
    }
    commit((s) => ({ ...s, hapticsEnabled: enabling }));
  };

  const setThemeMode = (mode: boolean | null) => {
    triggerHaptic('light');
    commit((s) => ({ ...s, darkModeOverride: mode }));
  };

  const toggleDarkMode = () => {
    triggerHaptic('light');
    commit((s) => ({ ...s, darkModeOverride: s.darkModeOverride === true ? false : true }));
  };

  const markTutorialSeen = () => commit((s) => ({ ...s, hasSeenTutorial: true }));

  const markDailyInstructionsSeen = () => commit((s) => ({ ...s, hasSeenDailyInstructions: true }));

  const resetProgress = () => {
    disableDailyReminder();
    deleteBackendHighScore();
    AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => {});
    commit(() => ({ ...DEFAULT_STATS, hasSeenTutorial: true, hasSeenDailyInstructions: true }));
  };

  const badges: Badge[] = useMemo(
    () =>
      ALL_BADGES.map(({ progress, ...b }) => {
        const unlocked = stats.unlockedBadges.includes(b.id);
        return { ...b, unlocked, progress: unlocked ? 1 : progress(stats) };
      }),
    [stats]
  );

  const nextHeartInMs = heartsFull
    ? null
    : Math.max(0, stats.lastHeartRegenTimestamp + HEART_REGEN_INTERVAL_MS - now);

  return (
    <GameContext.Provider
      value={{
        stats,
        badges,
        isLoading,
        today,
        isDailyCompletedToday: stats.completedDates.includes(today),
        nextHeartInMs,
        completeLevel,
        completeDaily,
        completeEndlessRun,
        recordEndlessWaveProgress,
        recordMistake,
        recordTimeout,
        recordFailedAttempt,
        useHint,
        useExtraTime,
        buyHeartRefill,
        buyHintPack,
        setStreakReminder,
        updatePlayerName,
        updateAvatar,
        toggleSfx,
        toggleHaptics,
        setThemeMode,
        toggleDarkMode,
        markTutorialSeen,
        markDailyInstructionsSeen,
        triggerHaptic,
        resetProgress,
      }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
