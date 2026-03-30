import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const BRAND_COLOR = '#14264D';

export default function CustomSplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoBlock}>
        <Image
          source={require('@/assets/images/splash-logo.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityRole="image"
          accessibilityLabel="App Logo"
        />
      </View>

      <Text style={styles.tagline}>
        انت في امان
      </Text>
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
