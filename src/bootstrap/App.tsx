import { StatusBar } from 'expo-status-bar';

import { HomeScreen } from '@features/home/screens/HomeScreen';

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <HomeScreen />
    </>
  );
}
