import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients } from '@/constants/Colors';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: React.ReactNode;
  gradient?: readonly [string, string, ...string[]];
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
}

export function PrimaryButton({
  title,
  onPress,
  icon,
  gradient = Gradients.primary,
  disabled = false,
  style,
  textStyle,
  size = 'medium',
}: PrimaryButtonProps) {
  const paddingVertical = size === 'small' ? 8 : size === 'large' ? 16 : 12;
  const paddingHorizontal = size === 'small' ? 16 : size === 'large' ? 28 : 22;
  const fontSize = size === 'small' ? 14 : size === 'large' ? 18 : 16;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.wrapper, style, disabled && styles.disabled]}>
      <LinearGradient
        colors={disabled ? ['#B0A8B6', '#9E94A5'] : (gradient as [string, string])}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { paddingVertical, paddingHorizontal }]}>
        {icon}
        <Text style={[styles.text, { fontSize }, textStyle]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 30,
    shadowColor: '#FF2E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
});
