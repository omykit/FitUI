import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiRequest } from '../api/client';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

function createEmptyExercise() {
  return {
    exercise_name: '',
    reps: '',
    sets: '',
    weight: '',
  };
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

function formatLabel(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function hasValue(value) {
  return value !== null && value !== undefined;
}

function isExerciseEmpty(exercise) {
  return (
    !exercise.exercise_name.trim() &&
    !exercise.sets.trim() &&
    !exercise.reps.trim() &&
    !exercise.weight.trim()
  );
}

export function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [exercises, setExercises] = useState([createEmptyExercise()]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function loadWorkouts() {
    setError('');

    try {
      const data = await apiRequest('/workouts');
      setWorkouts(data.workouts || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWorkouts();
  }, []);

  function updateExercise(index, field, value) {
    setExercises((currentExercises) =>
      currentExercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index ? { ...exercise, [field]: value } : exercise,
      ),
    );
  }

  function addExercise() {
    setExercises((currentExercises) => [...currentExercises, createEmptyExercise()]);
  }

  function removeExercise(index) {
    setExercises((currentExercises) => currentExercises.filter((_, exerciseIndex) => exerciseIndex !== index));
  }

  function validateExercise(exercise, index) {
    const exerciseNumber = index + 1;
    const parsedSets = Number(exercise.sets);
    const parsedReps = Number(exercise.reps);
    const parsedWeight = exercise.weight.trim() ? Number(exercise.weight) : null;

    if (!exercise.exercise_name.trim()) {
      return `Exercise ${exerciseNumber} needs a name.`;
    }

    if (!Number.isInteger(parsedSets) || parsedSets <= 0) {
      return `Exercise ${exerciseNumber} sets must be a positive integer.`;
    }

    if (!Number.isInteger(parsedReps) || parsedReps <= 0) {
      return `Exercise ${exerciseNumber} reps must be a positive integer.`;
    }

    if (parsedWeight !== null && (Number.isNaN(parsedWeight) || parsedWeight < 0)) {
      return `Exercise ${exerciseNumber} weight must be a non-negative number.`;
    }

    return '';
  }

  function validateForm() {
    const filteredExercises = exercises.filter((exercise) => !isExerciseEmpty(exercise));

    if (!title.trim()) {
      return 'Workout title is required.';
    }

    if (!difficulty) {
      return 'Difficulty is required.';
    }

    if (estimatedDuration.trim()) {
      const parsedDuration = Number(estimatedDuration);

      if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
        return 'Estimated duration must be a positive integer.';
      }
    }

    if (!filteredExercises.length) {
      return 'Add at least one exercise before saving.';
    }

    for (let index = 0; index < filteredExercises.length; index += 1) {
      const exerciseError = validateExercise(filteredExercises[index], index);

      if (exerciseError) {
        return exerciseError;
      }
    }

    return '';
  }

  function buildExercisesPayload() {
    return exercises
      .filter((exercise) => !isExerciseEmpty(exercise))
      .map((exercise, index) => {
        const payload = {
          exercise_name: exercise.exercise_name.trim(),
          exercise_order: index + 1,
          reps: Number(exercise.reps),
          sets: Number(exercise.sets),
        };

        if (exercise.weight.trim()) {
          payload.weight = Number(exercise.weight);
        }

        return payload;
      });
  }

  async function handleCreateWorkout() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    const payload = {
      difficulty,
      exercises: buildExercisesPayload(),
      source_type: 'manual',
      title: title.trim(),
    };
    const trimmedDescription = description.trim();

    if (trimmedDescription) {
      payload.description = trimmedDescription;
    }

    if (estimatedDuration.trim()) {
      payload.estimated_duration = Number(estimatedDuration);
    }

    try {
      await apiRequest('/workouts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setTitle('');
      setDescription('');
      setDifficulty('');
      setEstimatedDuration('');
      setExercises([createEmptyExercise()]);
      await loadWorkouts();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteWorkout(id) {
    setError('');
    setDeletingId(id);

    try {
      await apiRequest(`/workouts/${id}`, {
        method: 'DELETE',
      });
      setWorkouts((currentWorkouts) => currentWorkouts.filter((workout) => workout.id !== id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  function renderExerciseForm(exercise, index) {
    return (
      <View key={index} style={styles.exerciseForm}>
        <View style={styles.exerciseFormHeader}>
          <Text style={styles.exerciseFormTitle}>Exercise {index + 1}</Text>
          {exercises.length > 1 ? (
            <Pressable onPress={() => removeExercise(index)} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
        <TextInput
          onChangeText={(value) => updateExercise(index, 'exercise_name', value)}
          placeholder="Exercise name"
          style={styles.input}
          value={exercise.exercise_name}
        />
        <View style={styles.exerciseRow}>
          <TextInput
            keyboardType="numeric"
            onChangeText={(value) => updateExercise(index, 'sets', value)}
            placeholder="Sets"
            style={[styles.input, styles.exerciseInput]}
            value={exercise.sets}
          />
          <TextInput
            keyboardType="numeric"
            onChangeText={(value) => updateExercise(index, 'reps', value)}
            placeholder="Reps"
            style={[styles.input, styles.exerciseInput]}
            value={exercise.reps}
          />
          <TextInput
            keyboardType="numeric"
            onChangeText={(value) => updateExercise(index, 'weight', value)}
            placeholder="Weight"
            style={[styles.input, styles.exerciseInput]}
            value={exercise.weight}
          />
        </View>
      </View>
    );
  }

  function renderHeader() {
    return (
      <View style={styles.header}>
        <Text style={styles.title}>Workouts</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput onChangeText={setTitle} placeholder="Workout title" style={styles.input} value={title} />
        <TextInput
          multiline
          onChangeText={setDescription}
          placeholder="Description optional"
          style={[styles.input, styles.notesInput]}
          value={description}
        />
        <View style={styles.typeRow}>
          {DIFFICULTIES.map((item) => (
            <Pressable
              key={item}
              onPress={() => setDifficulty(item)}
              style={[styles.typeButton, difficulty === item ? styles.selectedTypeButton : null]}
            >
              <Text style={[styles.typeButtonText, difficulty === item ? styles.selectedTypeButtonText : null]}>
                {formatLabel(item)}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          keyboardType="numeric"
          onChangeText={setEstimatedDuration}
          placeholder="Estimated duration minutes optional"
          style={styles.input}
          value={estimatedDuration}
        />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          <Pressable onPress={addExercise} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add exercise</Text>
          </Pressable>
        </View>
        {exercises.map(renderExerciseForm)}
        <Pressable
          disabled={isSubmitting}
          onPress={handleCreateWorkout}
          style={[styles.button, isSubmitting ? styles.disabledButton : null]}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Saving...' : 'Save workout'}</Text>
        </Pressable>
      </View>
    );
  }

  function renderWorkout({ item }) {
    return (
      <View style={styles.entry}>
        <View style={styles.entryHeader}>
          <View style={styles.entryTitleWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.entryTitle}>{item.title}</Text>
              <Text style={styles.badge}>{formatLabel(item.difficulty)}</Text>
            </View>
            <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
          </View>
          <Pressable
            disabled={deletingId === item.id}
            onPress={() => handleDeleteWorkout(item.id)}
            style={[styles.deleteButton, deletingId === item.id ? styles.disabledDeleteButton : null]}
          >
            <Text style={styles.deleteButtonText}>{deletingId === item.id ? 'Deleting...' : 'Delete'}</Text>
          </Pressable>
        </View>
        {hasValue(item.estimated_duration) ? (
          <Text style={styles.entryMeta}>{item.estimated_duration} minutes</Text>
        ) : null}
        {item.description ? <Text style={styles.entryNotes}>{item.description}</Text> : null}
        {item.exercises?.length ? (
          <View style={styles.exerciseList}>
            {item.exercises.map((exercise) => (
              <Text key={exercise.id} style={styles.exerciseText}>
                {exercise.exercise_name}: {exercise.sets}x{exercise.reps}
                {hasValue(exercise.weight) ? `, ${exercise.weight} weight` : ''}
              </Text>
            ))}
          </View>
        ) : null}
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
      ListEmptyComponent={<Text style={styles.empty}>No workouts yet.</Text>}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.container}
      data={workouts}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      renderItem={renderWorkout}
    />
  );
}

const styles = StyleSheet.create({
  addButton: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
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
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  entryTitleWrap: {
    flex: 1,
  },
  error: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    color: '#991b1b',
    padding: 12,
  },
  exerciseForm: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  exerciseFormHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseFormTitle: {
    color: '#334155',
    fontWeight: '800',
  },
  exerciseInput: {
    flex: 1,
    minWidth: 0,
  },
  exerciseList: {
    gap: 6,
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: 8,
  },
  exerciseText: {
    color: '#475569',
    lineHeight: 20,
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
  removeButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeButtonText: {
    color: '#991b1b',
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  selectedTypeButton: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  selectedTypeButtonText: {
    color: '#ffffff',
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  typeButtonText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
