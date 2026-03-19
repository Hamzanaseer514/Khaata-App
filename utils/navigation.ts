import { router } from 'expo-router';

/**
 * Safe go-back: uses router.back() if possible, otherwise replaces to dashboard.
 */
export function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/dashboard' as any);
  }
}
