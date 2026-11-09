import { useAudioPlayer } from 'expo-audio';
import { useGame } from '@/context/GameContext';

export function useGameAudio() {
  const { stats } = useGame();
  const tapPlayer = useAudioPlayer(require('@/assets/sounds/tap.wav'));
  const successPlayer = useAudioPlayer(require('@/assets/sounds/success.wav'));
  const errorPlayer = useAudioPlayer(require('@/assets/sounds/error.wav'));

  const playTap = () => {
    if (!stats.sfxEnabled) return;
    try {
      tapPlayer.seekTo(0);
      tapPlayer.play();
    } catch {
      // Ignore audio error on unsupported platforms
    }
  };

  const playSuccess = () => {
    if (!stats.sfxEnabled) return;
    try {
      successPlayer.seekTo(0);
      successPlayer.play();
    } catch {
      // Ignore
    }
  };

  const playError = () => {
    if (!stats.sfxEnabled) return;
    try {
      errorPlayer.seekTo(0);
      errorPlayer.play();
    } catch {
      // Ignore
    }
  };

  return { playTap, playSuccess, playError };
}
