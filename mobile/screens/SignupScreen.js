import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { useAuth } from '../context/AuthContext';

function optionalNumber(value) {
  return value.trim() ? Number(value) : null;
}

export function SignupScreen() {
  const { signup } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignup() {
    setError('');
    setIsSubmitting(true);

    try {
      await signup({
        username,
        email,
        password,
        weight: optionalNumber(weight),
        height: optionalNumber(height),
        goal: goal.trim() || null,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Create account</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput onChangeText={setUsername} placeholder="Username" style={styles.input} value={username} />
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
      <TextInput
        keyboardType="numeric"
        onChangeText={setWeight}
        placeholder="Weight optional"
        style={styles.input}
        value={weight}
      />
      <TextInput
        keyboardType="numeric"
        onChangeText={setHeight}
        placeholder="Height optional"
        style={styles.input}
        value={height}
      />
      <TextInput onChangeText={setGoal} placeholder="Goal optional" style={styles.input} value={goal} />
      <Pressable disabled={isSubmitting} onPress={handleSignup} style={styles.button}>
        <Text style={styles.buttonText}>{isSubmitting ? 'Creating...' : 'Sign up'}</Text>
      </Pressable>
    </ScrollView>
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
    flexGrow: 1,
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
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
  },
});
