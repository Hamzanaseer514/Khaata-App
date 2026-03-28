import Toast from 'react-native-toast-message';

type ToastType = 'success' | 'error' | 'info';

export function showToast(type: ToastType, title: string, message?: string) {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 3000,
    topOffset: 0,
  });
}

export function showSuccess(message: string, title = 'Success') {
  showToast('success', title, message);
}

export function showError(message: string, title = 'Error') {
  showToast('error', title, message);
}

export function showInfo(message: string, title = 'Info') {
  showToast('info', title, message);
}
