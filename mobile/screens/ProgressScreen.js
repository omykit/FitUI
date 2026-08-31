import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiRequest } from '../api/client';

function parseOptionalNumber(value) {
  return value.trim() ? Number(value) : null;
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function ProgressScreen() {
  const [progress, setProgress] = useState([]);
  const [weight, setWeight] = useState('');
  const [bodyFatPercentage, setBodyFatPercentage] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function loadProgress() {
    setError('');

    try {
      const data = await apiRequest('/progress');
      setProgress(data.progress || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProgress();
  }, []);

  function validateForm() {
    const parsedWeight = Number(weight);
    const parsedBodyFat = parseOptionalNumber(bodyFatPercentage);

    if (!weight.trim() || Number.isNaN(parsedWeight) || parsedWeight <= 0) {
      return 'Weight must be a number greater than 0.';
    }

    if (parsedBodyFat !== null && (Number.isNaN(parsedBodyFat) || parsedBodyFat < 0 || parsedBodyFat > 100)) {
      return 'Body fat percentage must be between 0 and 100.';
    }

    return '';
  }

  async function handleCreateProgress() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    const payload = {
      weight: Number(weight),
    };
    const parsedBodyFat = parseOptionalNumber(bodyFatPercentage);
    const trimmedNotes = notes.trim();

    if (parsedBodyFat !== null) {
      payload.body_fat_percentage = parsedBodyFat;
    }

    if (trimmedNotes) {
      payload.notes = trimmedNotes;
    }

    try {
      await apiRequest('/progress', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setWeight('');
      setBodyFatPercentage('');
      setNotes('');
      await loadProgress();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteProgress(id) {
    setError('');
    setDeletingId(id);

    try {
      await apiRequest(`/progress/${id}`, {
        method: 'DELETE',
      });
      setProgress((currentProgress) => currentProgress.filter((entry) => entry.id !== id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  function renderHeader() {
    return (
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput
          keyboardType="numeric"
          onChangeText={setWeight}
          placeholder="Weight"
          style={styles.input}
          value={weight}
        />
        <TextInput
          keyboardType="numeric"
          onChangeText={setBodyFatPercentage}
          placeholder="Body fat % optional"
          style={styles.input}
          value={bodyFatPercentage}
        />
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="Notes optional"
          style={[styles.input, styles.notesInput]}
          value={notes}
        />
        <Pressable
          disabled={isSubmitting}
          onPress={handleCreateProgress}
          style={[styles.button, isSubmitting ? styles.disabledButton : null]}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Saving...' : 'Save entry'}</Text>
        </Pressable>
      </View>
    );
  }

  function renderProgressEntry({ item }) {
    return (
      <View style={styles.entry}>
        <View style={styles.entryHeader}>
          <View>
            <Text style={styles.entryTitle}>{item.weight} weight</Text>
            <Text style={styles.entryDate}>{formatDate(item.logged_at)}</Text>
          </View>
          <Pressable
            disabled={deletingId === item.id}
            onPress={() => handleDeleteProgress(item.id)}
            style={[styles.deleteButton, deletingId === item.id ? styles.disabledDeleteButton : null]}
          >
            <Text style={styles.deleteButtonText}>{deletingId === item.id ? 'Deleting...' : 'Delete'}</Text>
          </Pressable>
        </View>
        {item.body_fat_percentage !== null && item.body_fat_percentage !== undefined ? (
          <Text style={styles.entryMeta}>Body fat: {item.body_fat_percentage}%</Text>
        ) : null}
        {item.notes ? <Text style={styles.entryNotes}>{item.notes}</Text> : null}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#2563eb" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      ListEmptyComponent={<Text style={styles.empty}>No entries yet.</Text>}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.container}
      data={progress}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      renderItem={renderProgressEntry}
    />
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
    padding: 20,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#991b1b',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
  disabledDeleteButton: {
    opacity: 0.7,
  },
  empty: {
    color: '#64748b',
    textAlign: 'center',
  },
  entry: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  entryDate: {
    color: '#64748b',
    marginTop: 4,
  },
  entryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  entryMeta: {
    color: '#334155',
    fontWeight: '700',
  },
  entryNotes: {
    color: '#475569',
    lineHeight: 20,
  },
  entryTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  error: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    color: '#991b1b',
    padding: 12,
  },
  header: {
    gap: 14,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
  },
  notesInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
  },
});
