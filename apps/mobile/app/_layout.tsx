import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0a0c10" },
          headerTintColor: "#e8eaed",
          contentStyle: { backgroundColor: "#0a0c10" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: "Providers & Keys" }} />
      </Stack>
    </>
  );
}
