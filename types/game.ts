export type TileType = 'emoji' | 'text' | 'color' | 'sprite';

export type SpriteName =
  | 'lemon'
  | 'lemon_odd'
  | 'butterfly'
  | 'butterfly_odd'
  | 'butterfly_daily_odd'
  | 'apple'
  | 'apple_odd';

export type DifficultyTier = 'easy' | 'medium' | 'hard';

export interface GameTile {
  id: string;
  isOdd: boolean;
  type: TileType;
  value: string; // emoji char, letter/number string, hex color, or SpriteName
  rotationDeg?: number;
}

export interface LevelConfig {
  /** 1..TOTAL_LEVELS for campaign levels, 0 for the daily puzzle. */
  levelNumber: number;
  isDaily: boolean;
  title: string;
  theme: string;
  tier: DifficultyTier;
  gridSize: number; // columns count
  gridCols: number;
  gridRows: number;
  timeLimitSeconds: number;
  tiles: GameTile[];
  oddIndex: number;
  hintDescription: string;
}

export interface RunRecord {
  id: string;
  /** 0 = daily puzzle */
  level: number;
  score: number;
  stars: number;
  timeTakenSec: number;
  accuracy?: number;
  /** YYYY-MM-DD local date key */
  dateKey?: string;
  /** ISO timestamp */
  playedAt: string;
}

export interface PlayerStats {
  playerName: string;
  /** 'boy' renders the illustrated avatar; anything else is an emoji. */
  avatar: string;
  currentLevel: number;
  highestLevelUnlocked: number;
  coins: number;
  totalCoinsEarned: number;
  stars: number;
  levelStars: Record<number, number>;
  levelBestScore: Record<number, number>;
  hearts: number;
  maxHearts: number;
  /** Start of the current heart-regeneration countdown. */
  lastHeartRegenTimestamp: number;
  highScore: number;
  gamesPlayed: number;
  gamesWon: number;
  fastestSolveSec: number | null;
  flawlessStreak: number;
  bestFlawlessStreak: number;
  hintsRemaining: number;
  // Daily Puzzle stats
  dailyBestScore: number;
  dailyBestTimeSec: number | null;
  dailyLastScore: number;
  dailyLastTimeSec: number;
  dailyLastAccuracy: number;
  hasSeenDailyInstructions: boolean;
  // Endless Mode stats
  endlessBestWave: number;
  endlessBestScore: number;
  // Streak
  currentStreak: number;
  bestStreak: number;
  /** Last day counted toward the streak (played or covered by a freeze). */
  lastStreakDate: string | null;
  /** Set when a streak was broken so the Streak Lost view can inform the player. */
  lastMissedStreakDate: string | null;
  previousStreakBeforeLoss: number;
  completedDates: string[]; // daily puzzles solved, YYYY-MM-DD local
  frozenDates: string[]; // days saved by a streak freeze
  streakFreezes: number;
  streakReminderEnabled: boolean;
  // Settings
  sfxEnabled: boolean;
  hapticsEnabled: boolean;
  darkModeOverride: boolean | null; // null = follow system
  // Unlocked items
  unlockedBadges: string[];
  runs: RunRecord[];
  hasSeenTutorial: boolean;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number; // 0 to 1
  category: 'levels' | 'streaks' | 'speed' | 'accuracy';
}
