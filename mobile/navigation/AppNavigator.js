import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MealsScreen } from '../screens/MealsScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { WorkoutsScreen } from '../screens/WorkoutsScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { token } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {token ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Workouts" component={WorkoutsScreen} />
            <Stack.Screen name="Progress" component={ProgressScreen} />
            <Stack.Screen name="Meals" component={MealsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Log in' }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Create account' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
