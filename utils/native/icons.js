/**
 * Icon mapping from semantic names to SF Symbols (iOS) and Material Icons (Android)
 * This provides a single source of truth for all icons used in the app
 */

export const iconMapping = {
  // Navigation & UI
  'home': 'house.fill',
  'search': 'magnifyingglass',
  'filter': 'line.3.horizontal.decrease.circle',
  'sort': 'arrow.up.arrow.down',
  'menu': 'line.3.horizontal',
  'close': 'xmark',
  'back': 'chevron.backward',
  'forward': 'chevron.forward',
  'up': 'chevron.up',
  'down': 'chevron.down',
  'left': 'chevron.left',
  'right': 'chevron.right',
  'more': 'ellipsis',
  'more-vertical': 'ellipsis',
  'more-horizontal': 'ellipsis',
  
  // User & Profile
  'user': 'person.circle.fill',
  'user-outline': 'person.circle',
  'users': 'person.2.fill',
  'profile': 'person.crop.circle.fill',
  'account': 'person.text.rectangle.fill',
  
  // Communication
  'message': 'message.fill',
  'message-outline': 'message',
  'chat': 'bubble.left.and.bubble.right.fill',
  'send': 'paperplane.fill',
  'mail': 'envelope.fill',
  'phone': 'phone.fill',
  'call': 'phone.circle.fill',
  
  // Location
  'location': 'location.fill',
  'pin': 'mappin.circle.fill',
  'pin-outline': 'mappin',
  'map': 'map.fill',
  'navigation': 'location.north.fill',
  
  // Actions
  'add': 'plus',
  'plus': 'plus.circle.fill',
  'minus': 'minus.circle.fill',
  'edit': 'pencil',
  'delete': 'trash.fill',
  'save': 'checkmark.circle.fill',
  'share': 'square.and.arrow.up',
  'download': 'arrow.down.circle.fill',
  'upload': 'arrow.up.circle.fill',
  'refresh': 'arrow.clockwise',
  'copy': 'doc.on.doc.fill',
  
  // Media
  'image': 'photo.fill',
  'camera': 'camera.fill',
  'video': 'video.fill',
  'gallery': 'photo.on.rectangle',
  'attach': 'paperclip',
  'file': 'doc.fill',
  
  // Status & Feedback
  'check': 'checkmark',
  'checkmark': 'checkmark.circle.fill',
  'check-circle': 'checkmark.circle.fill',
  'alert': 'exclamationmark.triangle.fill',
  'warning': 'exclamationmark.circle.fill',
  'error': 'xmark.circle.fill',
  'info': 'info.circle.fill',
  'success': 'checkmark.seal.fill',
  
  // Settings & Controls
  'settings': 'gearshape.fill',
  'notification': 'bell.fill',
  'notification-off': 'bell.slash.fill',
  'lock': 'lock.fill',
  'unlock': 'lock.open.fill',
  'eye': 'eye.fill',
  'eye-off': 'eye.slash.fill',
  'star': 'star.fill',
  'star-outline': 'star',
  'heart': 'heart.fill',
  'heart-outline': 'heart',
  
  // Commerce & Orders
  'cart': 'cart.fill',
  'bag': 'bag.fill',
  'receipt': 'receipt.fill',
  'money': 'dollarsign.circle.fill',
  'card': 'creditcard.fill',
  'wallet': 'wallet.pass.fill',
  
  // Time & Calendar
  'time': 'clock.fill',
  'calendar': 'calendar',
  'history': 'clock.arrow.circlepath',
  
  // Content
  'list': 'list.bullet',
  'grid': 'square.grid.2x2.fill',
  'document': 'doc.text.fill',
  'folder': 'folder.fill',
  'bookmark': 'bookmark.fill',
  
  // Arrows & Directions
  'arrow-up': 'arrow.up',
  'arrow-down': 'arrow.down',
  'arrow-left': 'arrow.left',
  'arrow-right': 'arrow.right',
  
  // Toggle & Selection
  'radio-on': 'circle.inset.filled',
  'radio-off': 'circle',
  'checkbox-on': 'checkmark.square.fill',
  'checkbox-off': 'square',
  'toggle-on': 'toggle.on',
  'toggle-off': 'toggle.off',
  
  // Misc
  'question': 'questionmark.circle.fill',
  'help': 'questionmark.circle',
  'shield': 'shield.fill',
  'globe': 'globe',
  'link': 'link',
  'external-link': 'arrow.up.forward.square.fill',
  'sun': 'sun.max.fill',
  'moon': 'moon.fill',
  
  // Professions & Services
  'cook': 'fork.knife.circle.fill',
  'chef': 'fork.knife.circle.fill',
  'car': 'car.fill',
  'driver': 'car.fill',
  'nurse': 'cross.case.fill',
  'medical': 'cross.case.fill',
  'baby': 'figure.child',
  'childcare': 'figure.child',
};

/**
 * Material Icons fallback mapping for Android
 * Maps SF Symbol names to Material Icon names
 */
export const materialIconMapping = {
  'house.fill': 'home',
  'magnifyingglass': 'search',
  'line.3.horizontal.decrease.circle': 'filter-list',
  'arrow.up.arrow.down': 'sort',
  'line.3.horizontal': 'menu',
  'xmark': 'close',
  'chevron.backward': 'chevron-left',
  'chevron.forward': 'chevron-right',
  'chevron.up': 'keyboard-arrow-up',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'ellipsis': 'more-vert',
  
  'person.circle.fill': 'account-circle',
  'person.circle': 'account-circle',
  'person.2.fill': 'people',
  'person.crop.circle.fill': 'account-circle',
  'person.text.rectangle.fill': 'badge',
  
  'message.fill': 'message',
  'message': 'message',
  'bubble.left.and.bubble.right.fill': 'chat',
  'paperplane.fill': 'send',
  'envelope.fill': 'email',
  'phone.fill': 'phone',
  'phone.circle.fill': 'phone',
  
  'location.fill': 'location-on',
  'mappin.circle.fill': 'place',
  'mappin': 'place',
  'tag': 'sell',
  'map.fill': 'map',
  'location.north.fill': 'navigation',
  
  'plus': 'add',
  'plus.circle.fill': 'add-circle',
  'minus.circle.fill': 'remove-circle',
  'pencil': 'edit',
  'trash.fill': 'delete',
  'checkmark.circle.fill': 'check-circle',
  'square.and.arrow.up': 'share',
  'arrow.down.circle.fill': 'download',
  'arrow.up.circle.fill': 'upload',
  'arrow.clockwise': 'refresh',
  'doc.on.doc.fill': 'content-copy',
  
  'photo.fill': 'image',
  'camera.fill': 'camera-alt',
  'video.fill': 'videocam',
  'photo.on.rectangle': 'photo-library',
  'paperclip': 'attach-file',
  'doc.fill': 'description',
  
  'checkmark': 'check',
  'checkmark.circle.fill': 'check-circle',
  'exclamationmark.triangle.fill': 'warning',
  'exclamationmark.circle.fill': 'error',
  'xmark.circle.fill': 'cancel',
  'info.circle.fill': 'info',
  'checkmark.seal.fill': 'verified',
  
  'gearshape.fill': 'settings',
  'bell.fill': 'notifications',
  'bell.slash.fill': 'notifications-off',
  'lock.fill': 'lock',
  'lock.open.fill': 'lock-open',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'star.fill': 'star',
  'star': 'star-outline',
  'heart.fill': 'favorite',
  'heart': 'favorite-border',
  
  'cart.fill': 'shopping-cart',
  'bag.fill': 'shopping-bag',
  'receipt.fill': 'receipt',
  'dollarsign.circle.fill': 'attach-money',
  'creditcard.fill': 'credit-card',
  'wallet.pass.fill': 'account-balance-wallet',
  
  'clock.fill': 'access-time',
  'calendar': 'event',
  'clock.arrow.circlepath': 'history',
  
  'list.bullet': 'list',
  'square.grid.2x2.fill': 'grid-view',
  'doc.text.fill': 'description',
  'folder.fill': 'folder',
  'bookmark.fill': 'bookmark',
  
  'arrow.up': 'arrow-upward',
  'arrow.down': 'arrow-downward',
  'arrow.left': 'arrow-back',
  'arrow.right': 'arrow-forward',
  
  'circle.inset.filled': 'radio-button-checked',
  'circle': 'radio-button-unchecked',
  'checkmark.square.fill': 'check-box',
  'square': 'check-box-outline-blank',
  'toggle.on': 'toggle-on',
  'toggle.off': 'toggle-off',
  
  'questionmark.circle.fill': 'help',
  'questionmark.circle': 'help-outline',
  'shield.fill': 'security',
  'globe': 'public',
  'link': 'link',
  'arrow.up.forward.square.fill': 'open-in-new',
  'sun.max.fill': 'wb-sunny',
  'moon.fill': 'nights-stay',
  
  'fork.knife.circle.fill': 'restaurant-menu',
  'car.fill': 'directions-car',
  'cross.case.fill': 'medical-services',
  'figure.child': 'child-care',
};

/**
 * Get the platform-appropriate icon name
 * @param {string} semanticName - The semantic icon name (e.g., 'user', 'search')
 * @returns {string} The SF Symbol name (used by IconSymbol component)
 */
export const getIconName = (semanticName) => {
  return iconMapping[semanticName] || semanticName;
};
