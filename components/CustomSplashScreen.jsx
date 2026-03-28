import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const BRAND_COLOR = '#14264D';

export default function CustomSplashScreen({ onAnimationComplete }) {
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(24); // Slightly higher starting point
  
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);

  useEffect(() => {
    // 1. Animate Logo
    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.exp), // A smoother, more dramatic fade
    });
    logoTranslateY.value = withSpring(0, {
      damping: 14, // Controls the "bounciness" (higher = less bouncy)
      stiffness: 90, // Controls the speed of the spring
    });

    // 2. Animate Tagline (with delay)
    taglineOpacity.value = withDelay(
      350,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.exp) })
    );
    taglineTranslateY.value = withDelay(
      350,
      withSpring(0, { damping: 14, stiffness: 90 }, (finished) => {
        // 3. Notify the app when the final animation is done
        if (finished && onAnimationComplete) {
          runOnJS(onAnimationComplete)();
        }
      })
    );
  }, [logoOpacity, logoTranslateY, taglineOpacity, taglineTranslateY, onAnimationComplete]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoBlock, logoStyle]}>
        <Image
          source={require('@/assets/images/splash-logo.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityRole="image"
          accessibilityLabel="App Logo"
        />
      </Animated.View>

      <Animated.Text style={[styles.tagline, taglineStyle]}>
        انت في امان
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 280,
    height: 280,
  },
  tagline: {
    marginTop: 34,
    fontSize: 36,
    fontWeight: '300', // Consider changing to '400' or '500' depending on your Arabic font, as '300' can sometimes be hard to read on dark backgrounds
    color: '#F5F7FB',
    textAlign: 'center',
  },
});