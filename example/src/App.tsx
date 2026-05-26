import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { mark, measure, DevMenuReport } from 'react-native-liftoff';

import HomeScreen from './screens/HomeScreen';
import HeavyListScreen from './screens/HeavyListScreen';
import AnimatedScreen from './screens/AnimatedScreen';
import StorageScreen from './screens/StorageScreen';
import FormScreen from './screens/FormScreen';

mark('js:appComponent:render');

export type RootStackParamList = {
  Home: undefined;
  HeavyList: undefined;
  Animated: undefined;
  Storage: undefined;
  Form: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    mark('js:appComponent:mounted');
    if (Platform.OS === 'ios') {
      measure(
        'boot:native-init',
        'app:didFinishLaunching:start',
        'app:didFinishLaunching:end'
      );
      measure('boot:js-load', 'rn:factory:willStart', 'js:appComponent:render');
    } else {
      measure('boot:native-init', 'app:onCreate:start', 'app:onCreate:end');
      measure('boot:js-load', 'rn:host:willInit', 'js:appComponent:render');
    }
    measure(
      'boot:react-tree',
      'js:appComponent:render',
      'js:appComponent:mounted'
    );
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Liftoff Demo' }}
            />
            <Stack.Screen
              name="HeavyList"
              component={HeavyListScreen}
              options={{ title: 'Heavy List' }}
            />
            <Stack.Screen
              name="Animated"
              component={AnimatedScreen}
              options={{ title: 'Animated' }}
            />
            <Stack.Screen
              name="Storage"
              component={StorageScreen}
              options={{ title: 'Storage' }}
            />
            <Stack.Screen
              name="Form"
              component={FormScreen}
              options={{ title: 'Form' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <DevMenuReport />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
