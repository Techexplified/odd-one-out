import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '@/components/AppIcon';
import { GameAsset, GameAssetName } from '@/components/GameAsset';
import { DialogPayload, dismissDialog, subscribeDialog } from '@/utils/dialog';

function pickIconForDialog(payload: DialogPayload): GameAssetName {
  const t = payload.title.toLowerCase();
  if (payload.destructive || t.includes('reset')) return 'trash';
  if (t.includes('heart')) return 'heart';
  if (t.includes('coin')) return 'coin';
  if (t.includes('hint')) return 'bulb';
  if (t.includes('reminder') || t.includes('notification')) return 'bell';
  return 'sparkles';
}

export function ThemedDialogHost() {
  const [dialog, setDialog] = useState<DialogPayload | null>(null);

  useEffect(() => {
    return subscribeDialog(setDialog);
  }, []);

  if (!dialog) return null;

  const iconName = pickIconForDialog(dialog);

  const handleConfirm = () => {
    const callback = dialog.onConfirm;
    dismissDialog();
    if (callback) callback();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={dismissDialog}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header Row with Close Button */}
          <View style={styles.topRow}>
            <View style={{ width: 32 }} />
            <View
              style={[
                styles.iconBadge,
                dialog.destructive && styles.iconBadgeDestructive,
              ]}>
              <GameAsset name={iconName} size={34} />
            </View>
            <Pressable style={styles.closeBtn} onPress={dismissDialog}>
              <AppIcon name="close" size={18} color="#4A3F78" />
            </Pressable>
          </View>

          <Text style={styles.title}>{dialog.title}</Text>
          {Boolean(dialog.message) && (
            <Text style={styles.message}>{dialog.message}</Text>
          )}

          {/* Primary Confirm / Got it! Button */}
          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.primaryBtnOuter,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}>
            <LinearGradient
              colors={
                dialog.destructive
                  ? ['#FF5C77', '#E11D48']
                  : ['#FF74A4', '#FF477E']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryBtnGradient}>
              <Text style={styles.primaryBtnText}>
                {dialog.confirmText || 'Got it!'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Secondary Cancel Button (for confirmations) */}
          {dialog.isConfirm && (
            <Pressable
              onPress={dismissDialog}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.85 },
              ]}>
              <Text style={styles.cancelBtnText}>
                {dialog.cancelText || 'Cancel'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 16, 48, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#2B2250',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconBadgeDestructive: {
    backgroundColor: '#FFE8EF',
  },
  iconEmoji: {
    fontSize: 30,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2B2250',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E5484',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryBtnOuter: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#FF477E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  cancelBtn: {
    width: '100%',
    backgroundColor: '#F4F0FF',
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelBtnText: {
    color: '#4A3F78',
    fontSize: 15,
    fontWeight: '800',
  },
});
