import ModernTabBar from '@/components/ui/ModernTabBar';
import { useLanguage } from '@/utils/i18n/store';
import { useTheme } from '@/utils/theme/store';
import { Tabs } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable } from 'react-native';

function BottomTabBarWrapper({ state }) {
  const currentRoute = state.routes[state.index];
  const routeName = currentRoute.name;

  const mainTabScreens = ['index', 'my-orders', 'chats/index', 'profile'];

  if (!mainTabScreens.includes(routeName)) {
    return null;
  }

  let activeTab = 'home';
  if (routeName === 'my-orders') activeTab = 'orders';
  else if (routeName === 'chats/index') activeTab = 'chats';
  else if (routeName === 'profile') activeTab = 'profile';

  return <ModernTabBar activeTab={activeTab} />;
}

export default function TabsLayout() {
  const { isRTL } = useLanguage();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={({ navigation }) => ({
        headerShown: false,
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerBackVisible: !isRTL,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          display: 'none',
          backgroundColor: colors.surface,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          color: colors.text,
        },
        headerRightContainerStyle: isRTL ? { paddingHorizontal: 8 } : undefined,
        headerRight:
          isRTL && navigation.canGoBack()
            ? () => (
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={({ pressed }) => ({
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <ChevronRight size={22} color={colors.text} />
                </Pressable>
              )
            : undefined,
        sceneStyle: {
          backgroundColor: colors.background,
        },
      })}
      tabBar={(props) => <BottomTabBarWrapper {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isRTL ? 'الرئيسية' : 'Home',
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-orders"
        options={{
          title: isRTL ? 'طلباتي' : 'Orders',
          href: null,
        }}
      />
      <Tabs.Screen
        name="chats/index"
        options={{
          headerShown: true,
          headerLargeTitle: false,
          headerBackVisible: false,
          title: isRTL ? 'المحادثات' : 'Chats',
          href: null,
        }}
      />
      <Tabs.Screen
        name="chats/chat"
        options={{
          href: null,
          title: isRTL ? 'المحادثة' : 'Chat',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isRTL ? 'حسابي' : 'Profile',
          href: null,
        }}
      />
    </Tabs>
  );
}
