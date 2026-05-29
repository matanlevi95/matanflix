import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { colors, font } from "../theme";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  בית: ["home", "home-outline"],
  חיפוש: ["search", "search-outline"],
  מועדפים: ["heart", "heart-outline"],
  הגדרות: ["settings", "settings-outline"],
};

export default function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: "#0B0B0B",
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: font.tiny },
        tabBarIcon: ({ color, size, focused }) => {
          const [active, inactive] = ICONS[route.name] || ["ellipse", "ellipse-outline"];
          return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="בית" component={HomeScreen} />
      <Tab.Screen name="חיפוש" component={SearchScreen} />
      <Tab.Screen name="מועדפים" component={FavoritesScreen} />
      <Tab.Screen name="הגדרות" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
