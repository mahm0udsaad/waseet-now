import BottomTabBar from "@/components/BottomTabBar";
import { Tabs } from "expo-router";

function BottomTabBarWrapper({ state }) {
  const currentRoute = state.routes[state.index];
  const routeName = currentRoute.name;

  let activeTab = "home";
  if (routeName === "my-orders") activeTab = "orders";
  else if (routeName === "create-taqib") activeTab = "new";
  else if (routeName === "chats/index") activeTab = "chats";
  else if (routeName === "chats/chat") activeTab = "chats";
  else if (routeName === "profile") activeTab = "profile";
  else if (routeName === "index") activeTab = "home";
  else if (
    [
      "taqib-list",
      "tanazul-list",
      "create-tanazul",
      "create-dhamen",
      "taqib-ad-details",
      "taqib-details",
      "tanazul-details",
    ].includes(routeName)
  ) {
    activeTab = "home";
  }

  return <BottomTabBar activeTab={activeTab} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <BottomTabBarWrapper {...props} />}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="my-orders" options={{ href: null }} />
      <Tabs.Screen name="create-taqib" options={{ href: null }} />
      <Tabs.Screen name="chats/index" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />

      {/* Hide other screens from the tab configuration but keep them in the layout */}
      <Tabs.Screen name="taqib-list" options={{ href: null }} />
      <Tabs.Screen name="tanazul-list" options={{ href: null }} />
      <Tabs.Screen name="create-tanazul" options={{ href: null }} />
      <Tabs.Screen name="create-dhamen" options={{ href: null }} />
      {/* Details screens moved to root stack to hide bottom bar */}
    </Tabs>
  );
}

