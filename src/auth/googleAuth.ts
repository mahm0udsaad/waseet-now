/**
 * ════════════════════════════════════════════════════════════════════════════
 * NATIVE GOOGLE SIGN-IN FOR EXPO + SUPABASE
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * This implementation uses NATIVE Google Sign-In with ID Token flow.
 * ✅ Works in TestFlight & production
 * ✅ No OAuth redirects
 * ✅ No AuthSession
 * ✅ Uses Web Client ID (+ optional iOS Client ID)
 * 
 * REQUIREMENTS:
 *   - Web Client ID in .env
 *   - @react-native-google-signin/google-signin package
 *   - Supabase configured with Google provider
 * 
 * FLOW:
 *   1. Configure GoogleSignin with Web Client ID (and iOS Client ID when available)
 *   2. User signs in → gets ID token
 *   3. Pass ID token to Supabase signInWithIdToken
 *   4. Session created automatically
 * 
 * ════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Lazy load GoogleSignin to avoid crashes when native module isn't built yet
let GoogleSignin: any = null;
let statusCodes: any = null;
let isErrorWithCode: any = null;
let isSuccessResponse: any = null;
try {
  const googleSignInLib = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignInLib.GoogleSignin;
  statusCodes = googleSignInLib.statusCodes;
  isErrorWithCode = googleSignInLib.isErrorWithCode;
  isSuccessResponse = googleSignInLib.isSuccessResponse;
} catch (error) {
  console.warn('Google Sign-In native module not available. Rebuild app with: npx expo prebuild && eas build');
}

/**
 * Configure Google Sign-In
 * This should be called once when the app starts
 */
export function configureGoogleSignIn() {
  if (!GoogleSignin) {
    console.warn('Google Sign-In not available - native module not built');
    return false;
  }

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

  if (!webClientId) {
    console.error('❌ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set in .env');
    return false;
  }

  try {
    GoogleSignin.configure({
      webClientId,
      ...(iosClientId ? { iosClientId } : {}),
      scopes: ['profile', 'email'],
      offlineAccess: false, // We don't need refresh tokens (Supabase handles this)
      forceCodeForRefreshToken: false,
    });

    console.log(
      `✅ Google Sign-In configured successfully (platform: ${Platform.OS}, iosClientId: ${iosClientId ? 'set' : 'missing'})`
    );
    return true;
  } catch (error) {
    console.error('❌ Failed to configure Google Sign-In:', error);
    return false;
  }
}

/**
 * Sign in with Google using native flow
 * Returns Supabase session data on success
 */
export async function signInWithGoogle() {
  if (!GoogleSignin) {
    throw new Error('Google Sign-In not available. App needs to be rebuilt with native module.');
  }

  try {
    console.log('🔐 Starting native Google Sign-In...');

    // Check if Play Services are available (Android)
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    // Sign in and get user info with ID token
    const signInResult = await GoogleSignin.signIn();
    if (!isSuccessResponse || !isSuccessResponse(signInResult)) {
      console.log('🚫 User cancelled Google Sign-In');
      return null;
    }
    console.log('✅ Google Sign-In successful, got user info');

    // Extract ID token
    const idToken = signInResult.data?.idToken;

    if (!idToken) {
      throw new Error(
        Platform.OS === 'ios'
          ? 'Google Sign-In succeeded but no ID token was returned. Check iOS client ID and URL scheme configuration.'
          : 'Google Sign-In succeeded but no ID token was returned. Check Android OAuth client/SHA settings.'
      );
    }

    console.log('✅ ID token received, signing in to Supabase...');

    // Sign in to Supabase using the ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      console.error('❌ Supabase sign-in error:', error);
      throw error;
    }

    console.log('✅ Supabase session created successfully');
    return data;
  } catch (error: any) {
    if (isErrorWithCode && isErrorWithCode(error)) {
      if (
        error.code === statusCodes?.SIGN_IN_CANCELLED ||
        error.code === statusCodes?.IN_PROGRESS
      ) {
        return null;
      }
      if (error.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services are unavailable or outdated on this device.');
      }
    }

    console.error('❌ Google Sign-In error:', error);
    throw error;
  }
}

/**
 * Sign out from Google and Supabase
 */
export async function signOutGoogle() {
  try {
    if (GoogleSignin) {
      await GoogleSignin.signOut();
    }
    await supabase.auth.signOut();
    console.log('✅ Signed out successfully');
  } catch (error) {
    console.error('❌ Sign out error:', error);
    throw error;
  }
}

/**
 * Custom hook for Google Sign-In
 * Provides loading state and error handling
 */
export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Configure Google Sign-In when component mounts
    const configured = configureGoogleSignIn();
    setIsConfigured(configured);
  }, []);

  const signIn = async () => {
    if (!isConfigured) {
      const errorMsg = 'Google Sign-In is not configured. Check your Web Client ID.';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      setLoading(true);
      setError(null);

      const result = await signInWithGoogle();

      setLoading(false);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in with Google';
      console.error('❌ useGoogleAuth error:', errorMessage);
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  };

  return {
    signIn,
    loading,
    error,
    isReady: isConfigured,
  };
}
