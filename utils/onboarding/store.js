import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'kafel-onboarding-completed';

/**
 * Check if onboarding has been completed
 */
export const hasCompletedOnboarding = async () => {
  try {
    const completed = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return completed === 'true';
  } catch (error) {
    console.log('Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Mark onboarding as completed
 */
export const markOnboardingCompleted = async () => {
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.log('Error saving onboarding status:', error);
  }
};

/**
 * Reset onboarding status (useful for testing)
 */
export const resetOnboarding = async () => {
  try {
    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
  } catch (error) {
    console.log('Error resetting onboarding status:', error);
  }
};

