import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TOKEN_KEY = 'fitui_token';

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function storeToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearStoredToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = await getStoredToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.details?.join('\n') || data?.error || 'Request failed';
    throw new Error(message);
  }

  return data;
}
