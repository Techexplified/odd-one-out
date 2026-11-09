/**
 * Event-driven themed dialog store.
 *
 * Replaces native OS `Alert.alert` and browser `window.alert` / `window.confirm`
 * with our pastel wireframe modal (`<ThemedDialogHost />` mounted in RootLayout).
 */

export interface DialogPayload {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  isConfirm?: boolean;
  onConfirm?: () => void;
}

type DialogListener = (payload: DialogPayload | null) => void;

let currentDialog: DialogPayload | null = null;
const listeners = new Set<DialogListener>();

function emit(payload: DialogPayload | null) {
  currentDialog = payload;
  listeners.forEach((fn) => fn(payload));
}

export function subscribeDialog(listener: DialogListener): () => void {
  listeners.add(listener);
  listener(currentDialog);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissDialog() {
  emit(null);
}

export function showMessage(title: string, message?: string) {
  emit({
    title,
    message,
    confirmText: 'Got it!',
    isConfirm: false,
  });
}

export function confirmAction(options: {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  emit({
    title: options.title,
    message: options.message,
    confirmText: options.confirmText,
    cancelText: options.cancelText ?? 'Cancel',
    destructive: options.destructive,
    isConfirm: true,
    onConfirm: options.onConfirm,
  });
}
