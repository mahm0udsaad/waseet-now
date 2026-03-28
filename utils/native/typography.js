import { Platform } from 'react-native';

/**
 * Native typography system
 * Based on iOS Human Interface Guidelines and Material Design
 */

export const typography = {
  // Large titles (iOS style)
  largeTitle: {
    fontSize: 34,
    fontWeight: Platform.OS === 'ios' ? '700' : '600',
    lineHeight: 41,
  },

  // Title 1
  title1: {
    fontSize: 28,
    fontWeight: Platform.OS === 'ios' ? '700' : '600',
    lineHeight: 34,
  },

  // Title 2
  title2: {
    fontSize: 22,
    fontWeight: Platform.OS === 'ios' ? '700' : '600',
    lineHeight: 28,
  },

  // Title 3
  title3: {
    fontSize: 20,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    lineHeight: 25,
  },

  // Headline
  headline: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },

  // Body (default)
  body: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 22,
  },

  // Callout
  callout: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 21,
  },

  // Subheadline
  subheadline: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  },

  // Footnote
  footnote: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },

  // Caption 1
  caption1: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },

  // Caption 2
  caption2: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 13,
  },
};

/**
 * Get typography style by name
 * @param {keyof typography} name
 * @returns {Object} Typography style object
 */
export const getTypography = (name) => typography[name] || typography.body;

