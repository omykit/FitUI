import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

export function HomeScreen({ navigation }) {
  const { logout, user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.username || 'athlete'}</Text>
      <Text style={styles.subtitle}>Auth is connected. Feature screens come next.</Text>
      <Pressable onPress={() => navigation.navigate('Workouts')} style={styles.button}>
        <Text style={styles.buttonText}>Workouts</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Progress')} style={styles.button}>
        <Text style={styles.buttonText}>Progress</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Meals')} style={styles.button}>
        <Text style={styles.buttonText}>Meals</Text>
      </Pressable>
      <Pressable onPress={logout} style={[styles.button, styles.logoutButton]}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  container: {
    backgroundColor: '#f8fafc',
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 20,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
  },
});
