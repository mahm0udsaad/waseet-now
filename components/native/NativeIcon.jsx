import React from 'react';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getIconName } from '@/utils/native/icons';
import { iconSize } from '@/utils/native/layout';

/**
 * NativeIcon - Platform-aware icon component
 * Automatically uses SF Symbols on iOS and Material Icons on Android
 * 
 * @param {Object} props
 * @param {string} props.name - Semantic icon name (e.g., 'user', 'search', 'message')
 * @param {number} [props.size='md'] - Icon size ('xs'|'sm'|'md'|'lg'|'xl'|'xxl' or number)
 * @param {string} props.color - Icon color
 * @param {'ultralight'|'thin'|'light'|'regular'|'medium'|'semibold'|'bold'|'heavy'|'black'} [props.weight='regular'] - Icon weight (iOS only)
 * @param {Object} [props.style] - Additional styles
 */
export function NativeIcon({ 
  name, 
  size = 'md', 
  color, 
  weight = 'regular',
  style,
  ...props 
}) {
  // Get the SF Symbol name from the semantic name
  const symbolName = getIconName(name);
  
  // Convert size to number if it's a string
  const numericSize = typeof size === 'string' ? iconSize[size] : size;

  return (
    <IconSymbol
      name={symbolName}
      size={numericSize}
      color={color}
      weight={weight}
      style={style}
      {...props}
    />
  );
}

export default NativeIcon;

