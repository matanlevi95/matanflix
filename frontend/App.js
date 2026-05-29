import React, { useEffect } from "react";
import { I18nManager, LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";

import { colors } from "./src/theme";
import { setApiBase } from "./src/api";
import { loadSettings } from "./src/store/settings";
import RootTabs from "./src/navigation/RootTabs";
import SeriesDetailScreen from "./src/screens/SeriesDetailScreen";
import MovieDetailScreen from "./src/screens/MovieDetailScreen";
import PlayerScreen from "./src/screens/PlayerScreen";

// --- Force RTL for the whole app (Hebrew UI) ---
// In a standalone build (the shipped APK) we force RTL natively so every
// default flips to right-to-left. In Expo Go, forceRTL triggers a native
// reload that crashes the client's bundled Reanimated, so we skip the native
// flip there — every screen also uses explicit RTL styles (row-reverse /
// textAlign:right / insetInlineStart), so the layout looks correct regardless.
const isExpoGo = Constants.appOwnership === "expo";
I18nManager.allowRTL(true);
if (!isExpoGo && !I18nManager.isRTL) {
  I18nManager.forceRTL(true);
}

LogBox.ignoreLogs(["Require cycle:", "Unhandled SoftException"]);

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    primary: colors.accent,
    border: colors.border,
  },
};

export default function App() {
  useEffect(() => {
    // Apply the user-configured backend URL.
    loadSettings().then((s) => setApiBase(s.backendUrl));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="Tabs" component={RootTabs} />
            <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
            <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
            <Stack.Screen
              name="Player"
              component={PlayerScreen}
              options={{ orientation: "landscape", animation: "fade" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
