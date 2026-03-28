import * as Haptics from 'expo-haptics';

// Light tap - buttons, nav items, chips
export const tapHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// Medium tap - important actions (save, submit, send)
export const mediumHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

// Heavy tap - delete, logout, destructive actions
export const heavyHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
};

// Success - transaction added, saved, etc
export const successHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

// Error - failed actions
export const errorHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

// Warning - confirmations, alerts
export const warningHaptic = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
};

// Selection change - toggle, picker, swipe
export const selectionHaptic = () => {
  Haptics.selectionAsync();
};
