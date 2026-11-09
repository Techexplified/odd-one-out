import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { TileGraphic } from '@/components/TileGraphic';
import { GameTile } from '@/types/game';

interface SolutionConfettiProps {
  /** The odd-one-out solution tile that was solved */
  solutionTile: GameTile;
  /** Number of confetti particles to spawn */
  count?: number;
  /** 'burst' for explosive fountain pop on board, 'shower' for result screen celebration */
  variant?: 'burst' | 'shower';
  /** Changing trigger key restarts the animation */
  triggerKey?: string | number;
}

const KEYFRAME_STEPS = 12;
const INPUT_RANGE = Array.from(
  { length: KEYFRAME_STEPS + 1 },
  (_, i) => i / KEYFRAME_STEPS
);

interface PhysicsParticle {
  id: number;
  isSolutionReplica: boolean;
  color: string;
  size: number;
  shape: 'ribbon' | 'circle' | 'petal';
  delay: number;
  duration: number;
  xFrames: number[];
  yFrames: number[];
  rotateZFrames: string[];
  scaleXFrames: number[];
  scaleFrames: number[];
  opacityFrames: number[];
}

/**
 * Returns a curated color palette matching the specific odd-one-out solution tile.
 */
function getPaletteForSolution(tile: GameTile): string[] {
  const val = tile.value || '';

  if (tile.type === 'color' && val.startsWith('#')) {
    return [val, val, '#FFD166', '#FFFFFF', '#FF74A4', val];
  }

  if (val.startsWith('lemon')) {
    return ['#FFE135', '#FFD000', '#4CAF50', '#8BC34A', '#FFF59D'];
  }
  if (val.startsWith('butterfly')) {
    return ['#EC4899', '#A855F7', '#38BDF8', '#F472B6', '#C084FC'];
  }
  if (
    val.startsWith('apple') ||
    val.startsWith('strawberry') ||
    val.startsWith('mushroom') ||
    val.startsWith('rose') ||
    val.startsWith('cherries')
  ) {
    return ['#EF4444', '#F59E0B', '#FBBF24', '#FB7185', '#4ADE80'];
  }
  if (val.startsWith('donut') || val.startsWith('cookie')) {
    return ['#10B981', '#F59E0B', '#EC4899', '#38BDF8', '#A855F7'];
  }
  if (
    val.startsWith('sunflower') ||
    val.startsWith('chick') ||
    val.startsWith('smile') ||
    val.startsWith('star') ||
    val.includes('moon')
  ) {
    return ['#FACC15', '#FB923C', '#FDE047', '#F59E0B', '#FEF08A'];
  }
  if (
    val.startsWith('frog') ||
    val.startsWith('avocado') ||
    val.startsWith('evergreen') ||
    val.startsWith('turtle')
  ) {
    return ['#22C55E', '#FB923C', '#4ADE80', '#FACC15', '#10B981'];
  }
  if (
    val.startsWith('dog') ||
    val.startsWith('owl') ||
    val.startsWith('monkey') ||
    val.startsWith('cat') ||
    val.startsWith('bear') ||
    val.startsWith('koala')
  ) {
    return ['#FB923C', '#F472B6', '#FBBF24', '#A78BFA', '#38BDF8'];
  }
  if (val.includes('leaf')) {
    return ['#F97316', '#EF4444', '#EAB308', '#FB923C', '#84CC16'];
  }

  return ['#8B5CF6', '#EC4899', '#F59E0B', '#38BDF8', '#22C55E'];
}

export function SolutionConfetti({
  solutionTile,
  count = 38,
  variant = 'shower',
  triggerKey,
}: SolutionConfettiProps) {
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const containerW = Math.min(screenW, 480);

  const palette = useMemo(() => getPaletteForSolution(solutionTile), [solutionTile]);

  const particles = useMemo<PhysicsParticle[]>(() => {
    const shapes: ('ribbon' | 'circle' | 'petal')[] = ['ribbon', 'circle', 'petal'];

    return Array.from({ length: count }, (_, i) => {
      const isSolutionReplica = i % 4 === 0;
      const color = palette[i % palette.length];
      const shape = shapes[i % shapes.length];
      const swayPhase = Math.random() * Math.PI * 2;
      const swayCycles = 1.6 + Math.random() * 1.8;
      const swayAmp = isSolutionReplica ? 16 + Math.random() * 18 : 22 + Math.random() * 28;
      const tumbleCycles = 2.0 + Math.random() * 2.5;
      const spinDir = i % 2 === 0 ? 1 : -1;
      const totalSpinDeg = spinDir * (isSolutionReplica ? 220 + Math.random() * 240 : 420 + Math.random() * 540);

      const xFrames: number[] = [];
      const yFrames: number[] = [];
      const rotateZFrames: string[] = [];
      const scaleXFrames: number[] = [];
      const scaleFrames: number[] = [];
      const opacityFrames: number[] = [];

      if (variant === 'burst') {
        // Dual-cannon + center fountain physics with fast initial pop, air drag, and gravity arc
        const originX =
          i % 3 === 0
            ? containerW * 0.22
            : i % 3 === 1
            ? containerW * 0.78
            : containerW * 0.5;
        const originY = screenH * 0.48 + (Math.random() - 0.5) * 30;

        // Launch angle fan upward (-75 deg to +75 deg from vertical)
        const angle = ((Math.random() - 0.5) * Math.PI * 0.82);
        const speed = 280 + Math.random() * 260;
        const vx0 = Math.sin(angle) * speed * 0.85;
        const vy0 = -Math.cos(angle) * speed;
        const gravity = 820 + Math.random() * 240;

        for (let step = 0; step <= KEYFRAME_STEPS; step++) {
          const t = step / KEYFRAME_STEPS;
          // Air resistance dampens horizontal velocity smoothly, plus gentle flutter sway
          const dragT = 1 - Math.pow(1 - t, 2.1);
          const flutter = Math.sin(t * Math.PI * 2 * swayCycles + swayPhase) * (swayAmp * 0.55) * t;
          const x = originX + vx0 * dragT * 0.75 + flutter;

          // Smooth projectile parabola: y = y0 + vy0 * t + 0.5 * g * t^2
          const y = originY + vy0 * t + 0.5 * gravity * t * t;

          const deg = Math.round(totalSpinDeg * Math.pow(t, 0.85));
          // 3D paper-flipping shimmer on non-replica ribbons
          const scaleX = isSolutionReplica
            ? 1
            : 0.25 + 0.75 * Math.abs(Math.cos(t * Math.PI * tumbleCycles + swayPhase));

          // Elastic pop-in at start, gentle shrink at end
          const scale =
            t === 0
              ? 0.1
              : t < 0.12
              ? 1.22
              : t < 0.25
              ? 1.05
              : 1 - t * 0.22;

          const opacity = t === 0 ? 0 : t < 0.08 ? 1 : t > 0.78 ? Math.max(0, (1 - t) / 0.22) : 1;

          xFrames.push(x);
          yFrames.push(y);
          rotateZFrames.push(`${deg}deg`);
          scaleXFrames.push(scaleX);
          scaleFrames.push(scale);
          opacityFrames.push(opacity);
        }

        return {
          id: i,
          isSolutionReplica,
          color,
          size: isSolutionReplica ? 30 + (i % 3) * 4 : 10 + (i % 4) * 3,
          shape,
          delay: Math.floor(Math.random() * 90),
          duration: 820 + Math.floor(Math.random() * 260),
          xFrames,
          yFrames,
          rotateZFrames,
          scaleXFrames,
          scaleFrames,
          opacityFrames,
        };
      }

      // 'shower': Launches from left/right celebration cannons up into an arch, then floats down with S-curve sway
      const fromLeft = i % 2 === 0;
      const startX =
        i % 3 === 2
          ? (0.12 + Math.random() * 0.76) * containerW
          : fromLeft
          ? 24 + Math.random() * 60
          : containerW - 24 - Math.random() * 60;
      const startY = i % 3 === 2 ? -30 - Math.random() * 60 : screenH * 0.22 + Math.random() * 60;
      const targetX = (0.08 + Math.random() * 0.84) * containerW;
      const apexOffset = i % 3 === 2 ? 0 : -(110 + Math.random() * 140);
      const endY = screenH * 0.88 + Math.random() * 90;

      for (let step = 0; step <= KEYFRAME_STEPS; step++) {
        const t = step / KEYFRAME_STEPS;
        // Smooth horizontal progression + multi-wave sinusoidal breeze flutter
        const baseX = startX + (targetX - startX) * (1 - Math.pow(1 - t, 1.6));
        const flutter = Math.sin(t * Math.PI * 2 * swayCycles + swayPhase) * swayAmp * Math.sin(t * Math.PI);
        const x = baseX + flutter;

        // Smooth arch up to apex thenterminal-velocity float down
        const arch = 4 * t * (1 - t) * apexOffset;
        const fall = Math.pow(t, 1.35) * (endY - startY);
        const y = startY + arch + fall;

        const deg = Math.round(totalSpinDeg * t + Math.sin(t * Math.PI * swayCycles) * 28);
        const scaleX = isSolutionReplica
          ? 0.92 + 0.08 * Math.cos(t * Math.PI * 2)
          : 0.22 + 0.78 * Math.abs(Math.cos(t * Math.PI * tumbleCycles + swayPhase));

        const scale =
          t === 0
            ? 0.2
            : t < 0.1
            ? 1.15
            : t > 0.85
            ? 0.75
            : 1;

        const opacity = t === 0 ? 0 : t < 0.06 ? 1 : t > 0.82 ? Math.max(0, (1 - t) / 0.18) : 1;

        xFrames.push(x);
        yFrames.push(y);
        rotateZFrames.push(`${deg}deg`);
        scaleXFrames.push(scaleX);
        scaleFrames.push(scale);
        opacityFrames.push(opacity);
      }

      return {
        id: i,
        isSolutionReplica,
        color,
        size: isSolutionReplica ? 28 + (i % 3) * 4 : 10 + (i % 4) * 3,
        shape,
        delay: (i % 12) * 55 + Math.floor(Math.random() * 45),
        duration: 2100 + Math.floor(Math.random() * 750),
        xFrames,
        yFrames,
        rotateZFrames,
        scaleXFrames,
        scaleFrames,
        opacityFrames,
      };
    });
  }, [count, containerW, screenH, palette, variant, triggerKey]);

  const progressValues = useRef<Animated.Value[]>([]);
  if (progressValues.current.length !== particles.length) {
    progressValues.current = particles.map(() => new Animated.Value(0));
  }

  useEffect(() => {
    progressValues.current.forEach((v) => v.setValue(0));

    // Use Easing.linear because the physics acceleration, gravity, and sinusoidal
    // sway are already baked directly into the 13-point keyframe curves!
    const animations = particles.map((p, idx) =>
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(progressValues.current[idx], {
          toValue: 1,
          duration: p.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    const composite = Animated.parallel(animations);
    composite.start();

    return () => {
      composite.stop();
    };
  }, [particles, triggerKey]);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {particles.map((p, idx) => {
        const anim = progressValues.current[idx];
        if (!anim) return null;

        const translateX = anim.interpolate({
          inputRange: INPUT_RANGE,
          outputRange: p.xFrames,
        });

        const translateY = anim.interpolate({
          inputRange: INPUT_RANGE,
          outputRange: p.yFrames,
        });

        const rotate = anim.interpolate({
          inputRange: INPUT_RANGE,
          outputRange: p.rotateZFrames,
        });

        const scaleX = anim.interpolate({
          inputRange: INPUT_RANGE,
          outputRange: p.scaleXFrames,
        });

        const scale = anim.interpolate({
          inputRange: INPUT_RANGE,
          outputRange: p.scaleFrames,
        });

        const opacity = anim.interpolate({
          inputRange: INPUT_RANGE,
          outputRange: p.opacityFrames,
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particleBase,
              {
                opacity,
                transform: [
                  { translateX },
                  { translateY },
                  { rotate },
                  { scale },
                  { scaleX },
                ],
              },
            ]}>
            {p.isSolutionReplica ? (
              <View style={styles.replicaBubble}>
                <TileGraphic
                  tile={solutionTile}
                  size={p.size}
                  fontSize={Math.round(p.size * 0.58)}
                />
              </View>
            ) : (
              <View
                style={[
                  p.shape === 'ribbon'
                    ? {
                        width: p.size * 1.45,
                        height: p.size * 0.52,
                        borderRadius: 3,
                      }
                    : p.shape === 'circle'
                    ? {
                        width: p.size * 0.85,
                        height: p.size * 0.85,
                        borderRadius: p.size,
                      }
                    : {
                        width: p.size * 1.1,
                        height: p.size * 0.75,
                        borderTopLeftRadius: p.size,
                        borderBottomRightRadius: p.size,
                        borderTopRightRadius: 2,
                        borderBottomLeftRadius: 2,
                      },
                  { backgroundColor: p.color },
                ]}
              />
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    elevation: 20,
    overflow: 'hidden',
  },
  particleBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replicaBubble: {
    padding: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#2B2250',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },
});
