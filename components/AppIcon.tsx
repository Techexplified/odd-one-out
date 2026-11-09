import React from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = keyof typeof Ionicons.glyphMap;

const ALIAS_MAP: Record<string, IoniconName> = {
  'chevron-left': 'chevron-back',
  'chevron-right': 'chevron-forward',
  info: 'information-circle',
  'calendar-today': 'calendar',
  groups: 'people',
  schedule: 'time',
  check: 'checkmark',
  'play-arrow': 'play',
  favorite: 'heart',
  share: 'share-social',
};

export type IconName = IoniconName | keyof typeof ALIAS_MAP;

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: any;
  style?: any;
}

export function AppIcon({ name, size = 24, color = '#FF2E75', style }: AppIconProps) {
  const resolved: IoniconName = (ALIAS_MAP[name as string] ?? name) as IoniconName;
  return <Ionicons name={resolved} size={size} color={color} style={style} />;
}
