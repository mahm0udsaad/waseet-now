# Kafel (وسيط الان) 📱

[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

A comprehensive digital marketplace platform for Saudi Arabia, providing secure and reliable services for contract transfers, real-time tracking, and guaranteed surety solutions.

## 🌟 Features

### Core Services
- **Tanazul (التنازل)** - Seamless transfer of contract ownership
- **Taqib (التعقيب)** - Real-time status tracking and monitoring
- **Damen (الضامن)** - Guaranteed security and surety services

### Technical Features
- 🔐 **Secure Authentication** - OTP verification, Google Sign-in, and secure token management
- 💬 **Real-time Chat** - Integrated messaging with push notifications
- 🌍 **Multi-language Support** - Arabic (RTL) and English (LTR) with seamless switching
- 🎨 **Dark/Light Theme** - Automatic theme switching with system preference detection
- 📍 **Saudi Cities Integration** - Comprehensive coverage of all Saudi Arabian cities
- 📱 **Cross-platform** - Native iOS and Android support with Expo
- 🔔 **Push Notifications** - Real-time notifications for important updates
- 📎 **File Attachments** - Support for document and media sharing in chats

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kafel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy the environment template and fill in your values
   cp .env.example .env
   ```

   Required environment variables:
   - `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID

4. **Set up Supabase**
   - Create a new project on [Supabase](https://supabase.com)
   - Run the SQL migrations in the `supabase/` directory
   - Configure authentication providers

5. **Start the development server**
   ```bash
   npm start
   ```

### Development Builds

- **Android**: `npm run android`
- **iOS**: `npm run ios`
- **Web**: `npm run web`

## 📁 Project Structure

```
kafel/
├── app/                    # Main application screens (file-based routing)
│   ├── (tabs)/            # Tab navigation screens
│   ├── chat.jsx           # Chat interface
│   ├── signin.jsx         # Authentication screens
│   └── ...
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components
│   ├── forms/            # Form-related components
│   └── native/           # Native platform components
├── constants/            # App constants and data
├── hooks/               # Custom React hooks
├── utils/               # Utility functions and services
│   ├── auth/            # Authentication utilities
│   ├── supabase/        # Database operations
│   ├── notifications/   # Push notification handling
│   └── ...
├── supabase/            # Database schema and migrations
├── assets/              # Static assets (images, icons)
└── ...
```

## 🛠️ Tech Stack

### Frontend
- **React Native 0.81.5** - Cross-platform mobile development
- **Expo SDK 54** - Development platform and services
- **React Navigation** - Navigation and routing
- **TypeScript** - Type-safe JavaScript

### Backend & Services
- **Supabase** - Backend-as-a-Service (Database, Auth, Storage)
- **Google Sign-in** - OAuth authentication
- **Expo Notifications** - Push notification service

### UI & Styling
- **React Native Reanimated** - Smooth animations
- **Expo Linear Gradient** - Gradient backgrounds
- **Lucide React Native** - Icon library
- **Custom Theme System** - Dark/light mode support

### Development Tools
- **ESLint** - Code linting
- **Expo Router** - File-based routing
- **TypeScript** - Type checking

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### Supabase Setup
1. Create tables using the schema in `supabase/schema.sql`
2. Set up Row Level Security (RLS) policies
3. Configure authentication providers
4. Set up Edge Functions for push notifications

## 📱 Supported Platforms

- **iOS 15.1+** - Native iOS app
- **Android API 23+** - Native Android app
- **Web** - Progressive Web App (PWA)

## ✅ Testing

- `npm run e2e:smoke` - basic auth + tanazul smoke
- `npm run e2e:taqib` - taqib list/create flow
- `npm run e2e:tanazul` - full tanazul lifecycle
- `npm run e2e:damin` - damin + wallet flow
- `npm run qa:critical` - runs all critical e2e suites
- `npm run qa:production` - lint + all critical e2e

Production release criteria and manual high-risk checks are defined in:
- [TESTING_PRODUCTION_GATE.md](./TESTING_PRODUCTION_GATE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and TypeScript conventions
- Write meaningful commit messages
- Test on both iOS and Android platforms
- Update documentation for any new features

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Support

For support and questions:
- Create an issue in this repository
- Contact the development team

## 🔄 Recent Updates

- Real-time chat with file attachments
- Enhanced Arabic/English localization
- Improved push notification system
- Dark mode support
- Supabase integration optimization

---

**Built with ❤️ for the Saudi Arabian community** 🇸🇦
