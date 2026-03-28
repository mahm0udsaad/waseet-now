# Chat Custom Hooks Documentation

This directory contains custom hooks to optimize and clean up the chat functionality.

## Overview

The chat functionality has been refactored into three specialized custom hooks:

1. **`useChatConversation`** - Manages conversation state, messages, and user profiles
2. **`useChatAttachments`** - Handles media selection and attachments
3. **`useChatReceipt`** - Manages receipt form state

## Usage

### 1. useChatConversation

Manages the core chat conversation logic.

```javascript
import { useChatConversation } from "@/hooks/useChatConversation";

const {
  currentUserId,      // Current user's ID
  conversationId,     // Active conversation ID
  messages,           // Array of messages
  otherUserProfile,   // Other user's profile {displayName, avatarUrl}
  loadingMessages,    // Loading state
  sending,            // Sending state
  handleSendMessage,  // Function to send message (text, attachments)
} = useChatConversation(params, t, isRTL);
```

**Features:**
- Automatically resolves conversation ID from route params
- Fetches and subscribes to messages
- Fetches other user's profile information
- Handles creating new DM conversations
- Prevents users from messaging themselves

**Usage Example:**
```javascript
// Send a message
const success = await handleSendMessage("Hello!", []);

// Send with attachments
const success = await handleSendMessage("Check this out!", [
  { type: "image", uri: "...", name: "photo.jpg" }
]);
```

### 2. useChatAttachments

Manages all attachment-related functionality.

```javascript
import { useChatAttachments } from "@/hooks/useChatAttachments";

const {
  attachments,       // Array of attachments
  selectedImage,     // Currently selected image for preview
  setSelectedImage,  // Function to set selected image
  pickImage,         // Pick from gallery
  takePhoto,         // Take photo with camera
  pickDocument,      // Pick document/file
  shareLocation,     // Share current location
  removeAttachment,  // Remove attachment by ID
  clearAttachments,  // Clear all attachments
} = useChatAttachments(t, isRTL);
```

**Features:**
- Automatic permission handling
- Multiple attachment types (image, file, location)
- Error handling with user-friendly messages
- RTL support

**Usage Example:**
```javascript
// Pick an image
await pickImage();

// Take a photo
await takePhoto();

// Share location
await shareLocation();

// Remove specific attachment
removeAttachment(attachmentId);

// Clear all before sending
clearAttachments();
```

### 3. useChatReceipt

Manages receipt form state.

```javascript
import { useChatReceipt } from "@/hooks/useChatReceipt";

const {
  receiptData,             // {description, amount, date}
  updateReceiptData,       // Update single field
  resetReceiptData,        // Reset to default
  createReceiptAttachment, // Create receipt attachment object
} = useChatReceipt();
```

**Features:**
- Form state management
- Validation
- Creates proper attachment format

**Usage Example:**
```javascript
// Update receipt fields
updateReceiptData("description", "Service payment");
updateReceiptData("amount", "150");

// Create attachment for sending
const receiptAttachment = createReceiptAttachment();
if (receiptAttachment) {
  await handleSendMessage("Payment receipt", [receiptAttachment]);
  resetReceiptData();
}
```

## Benefits

### Code Organization
- **Separation of Concerns**: Each hook handles a specific aspect of chat functionality
- **Reusability**: Hooks can be used in other components if needed
- **Testability**: Each hook can be tested independently

### Performance
- **Optimized Re-renders**: State is isolated in hooks
- **Memoized Callbacks**: All handlers use `useCallback`
- **Efficient Subscriptions**: Proper cleanup in hooks

### Maintainability
- **Cleaner Component**: Main component is now much simpler
- **Single Responsibility**: Each hook has one clear purpose
- **Easy to Extend**: Add new features to specific hooks

## Migration Guide

To use these hooks in your chat component:

1. Import the hooks:
```javascript
import { useChatConversation } from "@/hooks/useChatConversation";
import { useChatAttachments } from "@/hooks/useChatAttachments";
import { useChatReceipt } from "@/hooks/useChatReceipt";
```

2. Replace state declarations:
```javascript
// OLD: Multiple useState declarations
const [messages, setMessages] = useState([]);
const [currentUserId, setCurrentUserId] = useState(null);
// ... many more

// NEW: Single hook call
const { messages, currentUserId, ... } = useChatConversation(params, t, isRTL);
```

3. Remove redundant useEffect hooks:
   - Conversation resolution logic
   - Message fetching and subscription
   - User profile fetching

4. Replace attachment handlers:
```javascript
// OLD: Direct ImagePicker calls with permission checks
const pickImage = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  // ... lots of code
};

// NEW: Use hook method
const { pickImage } = useChatAttachments(t, isRTL);
// Just call pickImage() - permissions handled internally
```

## File Structure

```
hooks/
├── README.md                    (this file)
├── useChatConversation.js      (Main chat logic)
├── useChatAttachments.js       (Media & files)
└── useChatReceipt.js           (Receipt form)
```

## Future Enhancements

Potential improvements:
- Add typing indicators hook
- Add message search hook
- Add message pagination hook
- Add voice message hook
- Add read receipts hook

## Notes

- All hooks handle RTL layouts
- All hooks include error handling
- All hooks clean up subscriptions/listeners properly
- Hooks follow React best practices (useCallback, dependency arrays, etc.)


