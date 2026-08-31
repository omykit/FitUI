import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiRequest } from '../api/client';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

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

function formatMealType(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function hasValue(value) {
  return value !== null && value !== undefined;
}

export function MealsScreen() {
  const [meals, setMeals] = useState([]);
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState('');
  const [calories, setCalories] = useState('');
  const [proteinGrams, setProteinGrams] = useState('');
  const [carbsGrams, setCarbsGrams] = useState('');
  const [fatGrams, setFatGrams] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function loadMeals() {
    setError('');

    try {
      const data = await apiRequest('/meals');
      setMeals(data.meals || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMeals();
  }, []);

  function validateOptionalNumber(value, label) {
    const parsedValue = parseOptionalNumber(value);

    if (parsedValue !== null && (Number.isNaN(parsedValue) || parsedValue < 0)) {
      return `${label} must be a non-negative number.`;
    }

    return '';
  }

  function validateForm() {
    if (!mealName.trim()) {
      return 'Meal name is required.';
    }

    if (!mealType) {
      return 'Meal type is required.';
    }

    if (calories.trim()) {
      const parsedCalories = Number(calories);

      if (!Number.isInteger(parsedCalories) || parsedCalories < 0) {
        return 'Calories must be a non-negative integer.';
      }
    }

    return (
      validateOptionalNumber(proteinGrams, 'Protein') ||
      validateOptionalNumber(carbsGrams, 'Carbs') ||
      validateOptionalNumber(fatGrams, 'Fat')
    );
  }

  async function handleCreateMeal() {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    const payload = {
      meal_name: mealName.trim(),
      meal_type: mealType,
    };
    const parsedCalories = calories.trim() ? Number(calories) : null;
    const parsedProtein = parseOptionalNumber(proteinGrams);
    const parsedCarbs = parseOptionalNumber(carbsGrams);
    const parsedFat = parseOptionalNumber(fatGrams);
    const trimmedNotes = notes.trim();

    if (parsedCalories !== null) {
      payload.calories = parsedCalories;
    }

    if (parsedProtein !== null) {
      payload.protein_grams = parsedProtein;
    }

    if (parsedCarbs !== null) {
      payload.carbs_grams = parsedCarbs;
    }

    if (parsedFat !== null) {
      payload.fat_grams = parsedFat;
    }

    if (trimmedNotes) {
      payload.notes = trimmedNotes;
    }

    try {
      await apiRequest('/meals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMealName('');
      setMealType('');
      setCalories('');
      setProteinGrams('');
      setCarbsGrams('');
      setFatGrams('');
      setNotes('');
      await loadMeals();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteMeal(id) {
    setError('');
    setDeletingId(id);

    try {
      await apiRequest(`/meals/${id}`, {
        method: 'DELETE',
      });
      setMeals((currentMeals) => currentMeals.filter((meal) => meal.id !== id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  function renderHeader() {
    return (
      <View style={styles.header}>
        <Text style={styles.title}>Meals</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput
          onChangeText={setMealName}
          placeholder="Meal name"
          style={styles.input}
          value={mealName}
        />
        <View style={styles.typeRow}>
          {MEAL_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setMealType(type)}
              style={[styles.typeButton, mealType === type ? styles.selectedTypeButton : null]}
            >
              <Text style={[styles.typeButtonText, mealType === type ? styles.selectedTypeButtonText : null]}>
                {formatMealType(type)}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          keyboardType="numeric"
          onChangeText={setCalories}
          placeholder="Calories optional"
          style={styles.input}
          value={calories}
        />
        <View style={styles.macroRow}>
          <TextInput
            keyboardType="numeric"
            onChangeText={setProteinGrams}
            placeholder="Protein"
            style={[styles.input, styles.macroInput]}
            value={proteinGrams}
          />
          <TextInput
            keyboardType="numeric"
            onChangeText={setCarbsGrams}
            placeholder="Carbs"
            style={[styles.input, styles.macroInput]}
            value={carbsGrams}
          />
          <TextInput
            keyboardType="numeric"
            onChangeText={setFatGrams}
            placeholder="Fat"
            style={[styles.input, styles.macroInput]}
            value={fatGrams}
          />
        </View>
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="Notes optional"
          style={[styles.input, styles.notesInput]}
          value={notes}
        />
        <Pressable
          disabled={isSubmitting}
          onPress={handleCreateMeal}
          style={[styles.button, isSubmitting ? styles.disabledButton : null]}
        >
          <Text style={styles.buttonText}>{isSubmitting ? 'Saving...' : 'Save meal'}</Text>
        </Pressable>
      </View>
    );
  }

  function renderMeal({ item }) {
    const macros = [
      hasValue(item.protein_grams) ? `P: ${item.protein_grams}g` : null,
      hasValue(item.carbs_grams) ? `C: ${item.carbs_grams}g` : null,
      hasValue(item.fat_grams) ? `F: ${item.fat_grams}g` : null,
    ].filter(Boolean);

    return (
      <View style={styles.entry}>
        <View style={styles.entryHeader}>
          <View style={styles.entryTitleWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.entryTitle}>{item.meal_name}</Text>
              <Text style={styles.badge}>{formatMealType(item.meal_type)}</Text>
            </View>
            <Text style={styles.entryDate}>{formatDate(item.logged_at)}</Text>
          </View>
          <Pressable
            disabled={deletingId === item.id}
            onPress={() => handleDeleteMeal(item.id)}
            style={[styles.deleteButton, deletingId === item.id ? styles.disabledDeleteButton : null]}
          >
            <Text style={styles.deleteButtonText}>{deletingId === item.id ? 'Deleting...' : 'Delete'}</Text>
          </Pressable>
        </View>
        {hasValue(item.calories) ? <Text style={styles.entryMeta}>Calories: {item.calories}</Text> : null}
        {macros.length ? <Text style={styles.entryMeta}>{macros.join(' · ')}</Text> : null}
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
      ListEmptyComponent={<Text style={styles.empty}>No meals yet.</Text>}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.container}
      data={meals}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      renderItem={renderMeal}
    />
  );
}

const styles = StyleSheet.create({
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
  macroInput: {
    flex: 1,
    minWidth: 0,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  notesInput: {
    minHeight: 88,
    textAlignVertical: 'top',
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
