import express from "express";

const SOURCE_TYPES = new Set(["manual", "instagram", "youtube"]);
const DIFFICULTIES = new Set(["beginner", "intermediate", "advanced"]);

function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function parsePositiveNumber(value) {
    if (value === undefined || value === null || value === "") return null;

    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : Number.NaN;
}

function parseNonNegativeNumber(value) {
    if (value === undefined || value === null || value === "") return null;

    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : Number.NaN;
}

function parsePositiveInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : Number.NaN;
}

function parseNonNegativeInteger(value) {
    if (value === undefined || value === null || value === "") return null;

    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : Number.NaN;
}

function parseWorkoutId(id) {
    const workoutId = Number(id);
    return Number.isInteger(workoutId) && workoutId > 0 ? workoutId : null;
}

function normalizeOptionalString(value) {
    if (value === undefined || value === null) return null;

    const trimmed = String(value).trim();
    return trimmed || null;
}

function parseDecimal(value) {
    return value === undefined || value === null ? null : parseFloat(value);
}

function validateExercises(exercises) {
    const errors = [];

    if (!Array.isArray(exercises) || exercises.length === 0) {
        return {
            errors: ["exercises must be a non-empty array"],
            values: [],
        };
    }

    const values = exercises.map((exercise, index) => {
        const label = `exercises[${index}]`;
        const exerciseName = String(exercise?.exercise_name || "").trim();
        const sets = parsePositiveInteger(exercise?.sets);
        const reps = parsePositiveInteger(exercise?.reps);
        const weight = parseNonNegativeNumber(exercise?.weight);
        const restSeconds = parseNonNegativeInteger(exercise?.rest_seconds);
        const exerciseOrder = exercise?.exercise_order === undefined || exercise?.exercise_order === null || exercise?.exercise_order === ""
            ? index + 1
            : parsePositiveInteger(exercise.exercise_order);

        if (!exerciseName) errors.push(`${label}.exercise_name is required`);
        if (exerciseName.length > 255) errors.push(`${label}.exercise_name must be 255 characters or less`);
        if (!Number.isInteger(sets)) errors.push(`${label}.sets must be a positive integer`);
        if (!Number.isInteger(reps)) errors.push(`${label}.reps must be a positive integer`);
        if (Number.isNaN(weight)) errors.push(`${label}.weight must be a non-negative number`);
        if (restSeconds !== null && !Number.isInteger(restSeconds)) errors.push(`${label}.rest_seconds must be a non-negative integer`);
        if (!Number.isInteger(exerciseOrder)) errors.push(`${label}.exercise_order must be a positive integer`);

        return {
            exercise_name: exerciseName,
            sets,
            reps,
            weight,
            rest_seconds: restSeconds,
            exercise_order: exerciseOrder,
        };
    });

    return { errors, values };
}

function validateCreateWorkout(body) {
    const title = String(body.title || "").trim();
    const description = normalizeOptionalString(body.description);
    const sourceType = String(body.source_type || "").trim();
    const sourceUrl = normalizeOptionalString(body.source_url);
    const thumbnailUrl = normalizeOptionalString(body.thumbnail_url);
    const estimatedDuration = parsePositiveInteger(body.estimated_duration);
    const difficulty = String(body.difficulty || "").trim();
    const { errors, values: exercises } = validateExercises(body.exercises);

    if (!title) errors.push("title is required");
    if (title.length > 255) errors.push("title must be 255 characters or less");
    if (description && description.length > 1000) errors.push("description must be 1000 characters or less");
    if (!SOURCE_TYPES.has(sourceType)) errors.push("source_type must be manual, instagram, or youtube");
    if (sourceUrl && sourceUrl.length > 1000) errors.push("source_url must be 1000 characters or less");
    if (thumbnailUrl && thumbnailUrl.length > 1000) errors.push("thumbnail_url must be 1000 characters or less");
    if (body.estimated_duration !== undefined && body.estimated_duration !== null && body.estimated_duration !== "" && !Number.isInteger(estimatedDuration)) errors.push("estimated_duration must be a positive integer");
    if (!DIFFICULTIES.has(difficulty)) errors.push("difficulty must be beginner, intermediate, or advanced");

    return {
        errors,
        values: {
            title,
            description,
            source_type: sourceType,
            source_url: sourceUrl,
            thumbnail_url: thumbnailUrl,
            estimated_duration: estimatedDuration,
            difficulty,
            exercises,
        },
    };
}

function validateUpdateWorkout(body) {
    const hasTitle = Object.hasOwn(body, "title");
    const hasDescription = Object.hasOwn(body, "description");
    const hasSourceType = Object.hasOwn(body, "source_type");
    const hasSourceUrl = Object.hasOwn(body, "source_url");
    const hasThumbnailUrl = Object.hasOwn(body, "thumbnail_url");
    const hasEstimatedDuration = Object.hasOwn(body, "estimated_duration");
    const hasDifficulty = Object.hasOwn(body, "difficulty");
    const hasExercises = Object.hasOwn(body, "exercises");
    const title = hasTitle ? String(body.title || "").trim() : null;
    const description = hasDescription ? normalizeOptionalString(body.description) : null;
    const sourceType = hasSourceType ? String(body.source_type || "").trim() : null;
    const sourceUrl = hasSourceUrl ? normalizeOptionalString(body.source_url) : null;
    const thumbnailUrl = hasThumbnailUrl ? normalizeOptionalString(body.thumbnail_url) : null;
    const estimatedDuration = hasEstimatedDuration ? parsePositiveInteger(body.estimated_duration) : null;
    const difficulty = hasDifficulty ? String(body.difficulty || "").trim() : null;
    const exerciseValidation = hasExercises ? validateExercises(body.exercises) : { errors: [], values: [] };
    const errors = [...exerciseValidation.errors];

    if (!hasTitle && !hasDescription && !hasSourceType && !hasSourceUrl && !hasThumbnailUrl && !hasEstimatedDuration && !hasDifficulty && !hasExercises) {
        errors.push("At least one workout field is required");
    }
    if (hasTitle && !title) errors.push("title cannot be empty");
    if (hasTitle && title.length > 255) errors.push("title must be 255 characters or less");
    if (description && description.length > 1000) errors.push("description must be 1000 characters or less");
    if (hasSourceType && !SOURCE_TYPES.has(sourceType)) errors.push("source_type must be manual, instagram, or youtube");
    if (sourceUrl && sourceUrl.length > 1000) errors.push("source_url must be 1000 characters or less");
    if (thumbnailUrl && thumbnailUrl.length > 1000) errors.push("thumbnail_url must be 1000 characters or less");
    if (hasEstimatedDuration && body.estimated_duration !== null && body.estimated_duration !== "" && !Number.isInteger(estimatedDuration)) errors.push("estimated_duration must be a positive integer");
    if (hasDifficulty && !DIFFICULTIES.has(difficulty)) errors.push("difficulty must be beginner, intermediate, or advanced");

    return {
        errors,
        values: {
            hasTitle,
            hasDescription,
            hasSourceType,
            hasSourceUrl,
            hasThumbnailUrl,
            hasEstimatedDuration,
            hasDifficulty,
            hasExercises,
            title,
            description,
            source_type: sourceType,
            source_url: sourceUrl,
            thumbnail_url: thumbnailUrl,
            estimated_duration: estimatedDuration,
            difficulty,
            exercises: exerciseValidation.values,
        },
    };
}

function formatWorkout(row) {
    return {
        ...row.workout,
        exercises: (row.exercises || []).map((exercise) => ({
            ...exercise,
            weight: parseDecimal(exercise.weight),
        })),
    };
}

export function createWorkoutRoutes({ sql, authMiddleware }) {
    const router = express.Router();

    router.use(authMiddleware);

    router.post("/", asyncHandler(async (req, res) => {
        const { errors, values } = validateCreateWorkout(req.body || {});

        if (errors.length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const exercisesJson = JSON.stringify(values.exercises);
        const [results] = await sql.transaction((tx) => [
            tx`
                WITH new_workout AS (
                    INSERT INTO workouts (
                        user_id, title, description, source_type, source_url,
                        thumbnail_url, estimated_duration, difficulty
                    )
                    VALUES (
                        ${req.user.id}, ${values.title}, ${values.description}, ${values.source_type},
                        ${values.source_url}, ${values.thumbnail_url}, ${values.estimated_duration}, ${values.difficulty}
                    )
                    RETURNING id, user_id, title, description, source_type, source_url,
                        thumbnail_url, estimated_duration, difficulty, created_at, updated_at
                ),
                inserted_exercises AS (
                    INSERT INTO workout_exercises (
                        workout_id, exercise_name, sets, reps, weight, rest_seconds, exercise_order
                    )
                    SELECT new_workout.id, exercise.exercise_name, exercise.sets, exercise.reps,
                        exercise.weight, exercise.rest_seconds, exercise.exercise_order
                    FROM new_workout
                    CROSS JOIN jsonb_to_recordset(${exercisesJson}::jsonb) AS exercise(
                        exercise_name text,
                        sets integer,
                        reps integer,
                        weight numeric,
                        rest_seconds integer,
                        exercise_order integer
                    )
                    RETURNING id, workout_id, exercise_name, sets, reps, weight, rest_seconds, exercise_order
                )
                SELECT
                    (SELECT row_to_json(new_workout) FROM new_workout) AS workout,
                    COALESCE(
                        (SELECT json_agg(inserted_exercises ORDER BY exercise_order) FROM inserted_exercises),
                        '[]'::json
                    ) AS exercises
            `,
        ]);

        return res.status(201).json({
            message: "Workout created successfully",
            workout: formatWorkout(results[0]),
        });
    }));

    router.get("/", asyncHandler(async (req, res) => {
        const workouts = await sql`
            SELECT
                row_to_json(w) AS workout,
                COALESCE(
                    json_agg(e ORDER BY e.exercise_order) FILTER (WHERE e.id IS NOT NULL),
                    '[]'::json
                ) AS exercises
            FROM workouts w
            LEFT JOIN workout_exercises e ON e.workout_id = w.id
            WHERE w.user_id = ${req.user.id}
            GROUP BY w.id
            ORDER BY w.created_at DESC
        `;

        return res.status(200).json({ workouts: workouts.map(formatWorkout) });
    }));

    router.get("/:id", asyncHandler(async (req, res) => {
        const workoutId = parseWorkoutId(req.params.id);

        if (!workoutId) {
            return res.status(400).json({ error: "Workout id must be a positive integer" });
        }

        const workouts = await sql`
            SELECT
                row_to_json(w) AS workout,
                COALESCE(
                    json_agg(e ORDER BY e.exercise_order) FILTER (WHERE e.id IS NOT NULL),
                    '[]'::json
                ) AS exercises
            FROM workouts w
            LEFT JOIN workout_exercises e ON e.workout_id = w.id
            WHERE w.id = ${workoutId} AND w.user_id = ${req.user.id}
            GROUP BY w.id
            LIMIT 1
        `;

        if (workouts.length === 0) {
            return res.status(404).json({ error: "Workout not found" });
        }

        return res.status(200).json({ workout: formatWorkout(workouts[0]) });
    }));

    router.put("/:id", asyncHandler(async (req, res) => {
        const workoutId = parseWorkoutId(req.params.id);

        if (!workoutId) {
            return res.status(400).json({ error: "Workout id must be a positive integer" });
        }

        const { errors, values } = validateUpdateWorkout(req.body || {});

        if (errors.length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const exercisesJson = JSON.stringify(values.exercises);
        const [results] = await sql.transaction((tx) => [
            tx`
                WITH updated_workout AS (
                    UPDATE workouts
                    SET
                        title = CASE WHEN ${values.hasTitle} THEN ${values.title} ELSE title END,
                        description = CASE WHEN ${values.hasDescription} THEN ${values.description} ELSE description END,
                        source_type = CASE WHEN ${values.hasSourceType} THEN ${values.source_type} ELSE source_type END,
                        source_url = CASE WHEN ${values.hasSourceUrl} THEN ${values.source_url} ELSE source_url END,
                        thumbnail_url = CASE WHEN ${values.hasThumbnailUrl} THEN ${values.thumbnail_url} ELSE thumbnail_url END,
                        estimated_duration = CASE WHEN ${values.hasEstimatedDuration} THEN ${values.estimated_duration} ELSE estimated_duration END,
                        difficulty = CASE WHEN ${values.hasDifficulty} THEN ${values.difficulty} ELSE difficulty END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ${workoutId} AND user_id = ${req.user.id}
                    RETURNING id, user_id, title, description, source_type, source_url,
                        thumbnail_url, estimated_duration, difficulty, created_at, updated_at
                ),
                deleted_exercises AS (
                    DELETE FROM workout_exercises
                    WHERE workout_id IN (SELECT id FROM updated_workout)
                        AND ${values.hasExercises}
                    RETURNING id
                ),
                inserted_exercises AS (
                    INSERT INTO workout_exercises (
                        workout_id, exercise_name, sets, reps, weight, rest_seconds, exercise_order
                    )
                    SELECT updated_workout.id, exercise.exercise_name, exercise.sets, exercise.reps,
                        exercise.weight, exercise.rest_seconds, exercise.exercise_order
                    FROM updated_workout
                    CROSS JOIN jsonb_to_recordset(${exercisesJson}::jsonb) AS exercise(
                        exercise_name text,
                        sets integer,
                        reps integer,
                        weight numeric,
                        rest_seconds integer,
                        exercise_order integer
                    )
                    WHERE ${values.hasExercises}
                    RETURNING id, workout_id, exercise_name, sets, reps, weight, rest_seconds, exercise_order
                ),
                existing_exercises AS (
                    SELECT id, workout_id, exercise_name, sets, reps, weight, rest_seconds, exercise_order
                    FROM workout_exercises
                    WHERE workout_id IN (SELECT id FROM updated_workout)
                        AND NOT ${values.hasExercises}
                )
                SELECT
                    (SELECT row_to_json(updated_workout) FROM updated_workout) AS workout,
                    COALESCE(
                        (SELECT json_agg(inserted_exercises ORDER BY exercise_order) FROM inserted_exercises),
                        (SELECT json_agg(existing_exercises ORDER BY exercise_order) FROM existing_exercises),
                        '[]'::json
                    ) AS exercises
            `,
        ]);

        if (!results[0]?.workout) {
            return res.status(404).json({ error: "Workout not found" });
        }

        return res.status(200).json({
            message: "Workout updated successfully",
            workout: formatWorkout(results[0]),
        });
    }));

    router.delete("/:id", asyncHandler(async (req, res) => {
        const workoutId = parseWorkoutId(req.params.id);

        if (!workoutId) {
            return res.status(400).json({ error: "Workout id must be a positive integer" });
        }

        const deletedWorkouts = await sql`
            DELETE FROM workouts
            WHERE id = ${workoutId} AND user_id = ${req.user.id}
            RETURNING id
        `;

        if (deletedWorkouts.length === 0) {
            return res.status(404).json({ error: "Workout not found" });
        }

        return res.status(204).send();
    }));

    return router;
}
