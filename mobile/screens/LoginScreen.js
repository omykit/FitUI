import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

export function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    setError('');
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FitUI</Text>
      <Text style={styles.subtitle}>Log in to your fitness companion.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        style={styles.input}
        value={email}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      <Pressable disabled={isSubmitting} onPress={handleLogin} style={styles.button}>
        <Text style={styles.buttonText}>{isSubmitting ? 'Logging in...' : 'Log in'}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Signup')} style={styles.linkButton}>
        <Text style={styles.linkText}>Create an account</Text>
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
  error: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    color: '#991b1b',
    padding: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  linkButton: {
    alignItems: 'center',
    padding: 8,
  },
  linkText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
  },
  title: {
    color: '#0f172a',
    fontSize: 34,
    fontWeight: '900',
  },
});
