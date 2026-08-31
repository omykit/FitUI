import express from "express";

const MEAL_TYPES = new Set(["breakfast", "lunch", "dinner", "snack"]);

function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function parseMealId(id) {
    const mealId = Number(id);
    return Number.isInteger(mealId) && mealId > 0 ? mealId : null;
}

function parseNonNegativeInteger(value) {
    if (value === undefined || value === null || value === "") return null;

    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : Number.NaN;
}

function parseNonNegativeNumber(value) {
    if (value === undefined || value === null || value === "") return null;

    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : Number.NaN;
}

function normalizeOptionalString(value) {
    if (value === undefined || value === null) return null;

    const trimmed = String(value).trim();
    return trimmed || null;
}

function parseDecimal(value) {
    return value === undefined || value === null ? null : parseFloat(value);
}

function formatMeal(row) {
    return {
        ...row,
        protein_grams: parseDecimal(row.protein_grams),
        carbs_grams: parseDecimal(row.carbs_grams),
        fat_grams: parseDecimal(row.fat_grams),
    };
}

function validateCreateMeal(body) {
    const mealName = String(body.meal_name || "").trim();
    const mealType = String(body.meal_type || "").trim();
    const calories = parseNonNegativeInteger(body.calories);
    const proteinGrams = parseNonNegativeNumber(body.protein_grams);
    const carbsGrams = parseNonNegativeNumber(body.carbs_grams);
    const fatGrams = parseNonNegativeNumber(body.fat_grams);
    const notes = normalizeOptionalString(body.notes);
    const errors = [];

    if (!mealName) errors.push("meal_name is required");
    if (mealName.length > 255) errors.push("meal_name must be 255 characters or less");
    if (!MEAL_TYPES.has(mealType)) errors.push("meal_type must be breakfast, lunch, dinner, or snack");
    if (Number.isNaN(calories)) errors.push("calories must be a non-negative integer");
    if (Number.isNaN(proteinGrams)) errors.push("protein_grams must be a non-negative number");
    if (Number.isNaN(carbsGrams)) errors.push("carbs_grams must be a non-negative number");
    if (Number.isNaN(fatGrams)) errors.push("fat_grams must be a non-negative number");
    if (notes && notes.length > 500) errors.push("notes must be 500 characters or less");

    return {
        errors,
        values: {
            meal_name: mealName,
            meal_type: mealType,
            calories,
            protein_grams: proteinGrams,
            carbs_grams: carbsGrams,
            fat_grams: fatGrams,
            notes,
        },
    };
}

function validateUpdateMeal(body) {
    const hasMealName = Object.hasOwn(body, "meal_name");
    const hasMealType = Object.hasOwn(body, "meal_type");
    const hasCalories = Object.hasOwn(body, "calories");
    const hasProteinGrams = Object.hasOwn(body, "protein_grams");
    const hasCarbsGrams = Object.hasOwn(body, "carbs_grams");
    const hasFatGrams = Object.hasOwn(body, "fat_grams");
    const hasNotes = Object.hasOwn(body, "notes");
    const mealName = hasMealName ? String(body.meal_name || "").trim() : null;
    const mealType = hasMealType ? String(body.meal_type || "").trim() : null;
    const calories = hasCalories ? parseNonNegativeInteger(body.calories) : null;
    const proteinGrams = hasProteinGrams ? parseNonNegativeNumber(body.protein_grams) : null;
    const carbsGrams = hasCarbsGrams ? parseNonNegativeNumber(body.carbs_grams) : null;
    const fatGrams = hasFatGrams ? parseNonNegativeNumber(body.fat_grams) : null;
    const notes = hasNotes ? normalizeOptionalString(body.notes) : null;
    const errors = [];

    if (!hasMealName && !hasMealType && !hasCalories && !hasProteinGrams && !hasCarbsGrams && !hasFatGrams && !hasNotes) {
        errors.push("At least one meal field is required");
    }
    if (hasMealName && !mealName) errors.push("meal_name cannot be empty");
    if (hasMealName && mealName.length > 255) errors.push("meal_name must be 255 characters or less");
    if (hasMealType && !MEAL_TYPES.has(mealType)) errors.push("meal_type must be breakfast, lunch, dinner, or snack");
    if (hasCalories && Number.isNaN(calories)) errors.push("calories must be a non-negative integer");
    if (hasProteinGrams && Number.isNaN(proteinGrams)) errors.push("protein_grams must be a non-negative number");
    if (hasCarbsGrams && Number.isNaN(carbsGrams)) errors.push("carbs_grams must be a non-negative number");
    if (hasFatGrams && Number.isNaN(fatGrams)) errors.push("fat_grams must be a non-negative number");
    if (notes && notes.length > 500) errors.push("notes must be 500 characters or less");

    return {
        errors,
        values: {
            hasMealName,
            hasMealType,
            hasCalories,
            hasProteinGrams,
            hasCarbsGrams,
            hasFatGrams,
            hasNotes,
            meal_name: mealName,
            meal_type: mealType,
            calories,
            protein_grams: proteinGrams,
            carbs_grams: carbsGrams,
            fat_grams: fatGrams,
            notes,
        },
    };
}

export function createMealRoutes({ sql, authMiddleware }) {
    const router = express.Router();

    router.use(authMiddleware);

    router.post("/", asyncHandler(async (req, res) => {
        const { errors, values } = validateCreateMeal(req.body || {});

        if (errors.length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const meals = await sql`
            INSERT INTO meals (
                user_id, meal_name, meal_type, calories, protein_grams,
                carbs_grams, fat_grams, notes
            )
            VALUES (
                ${req.user.id}, ${values.meal_name}, ${values.meal_type}, ${values.calories},
                ${values.protein_grams}, ${values.carbs_grams}, ${values.fat_grams}, ${values.notes}
            )
            RETURNING id, user_id, meal_name, meal_type, calories, protein_grams,
                carbs_grams, fat_grams, notes, logged_at
        `;

        return res.status(201).json({
            message: "Meal created successfully",
            meal: formatMeal(meals[0]),
        });
    }));

    router.get("/", asyncHandler(async (req, res) => {
        const meals = await sql`
            SELECT id, user_id, meal_name, meal_type, calories, protein_grams,
                carbs_grams, fat_grams, notes, logged_at
            FROM meals
            WHERE user_id = ${req.user.id}
            ORDER BY logged_at DESC
        `;

        return res.status(200).json({ meals: meals.map(formatMeal) });
    }));

    router.get("/:id", asyncHandler(async (req, res) => {
        const mealId = parseMealId(req.params.id);

        if (!mealId) {
            return res.status(400).json({ error: "Meal id must be a positive integer" });
        }

        const meals = await sql`
            SELECT id, user_id, meal_name, meal_type, calories, protein_grams,
                carbs_grams, fat_grams, notes, logged_at
            FROM meals
            WHERE id = ${mealId} AND user_id = ${req.user.id}
            LIMIT 1
        `;

        if (meals.length === 0) {
            return res.status(404).json({ error: "Meal not found" });
        }

        return res.status(200).json({ meal: formatMeal(meals[0]) });
    }));

    router.put("/:id", asyncHandler(async (req, res) => {
        const mealId = parseMealId(req.params.id);

        if (!mealId) {
            return res.status(400).json({ error: "Meal id must be a positive integer" });
        }

        const { errors, values } = validateUpdateMeal(req.body || {});

        if (errors.length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const meals = await sql`
            UPDATE meals
            SET
                meal_name = CASE WHEN ${values.hasMealName} THEN ${values.meal_name} ELSE meal_name END,
                meal_type = CASE WHEN ${values.hasMealType} THEN ${values.meal_type} ELSE meal_type END,
                calories = CASE WHEN ${values.hasCalories} THEN ${values.calories} ELSE calories END,
                protein_grams = CASE WHEN ${values.hasProteinGrams} THEN ${values.protein_grams} ELSE protein_grams END,
                carbs_grams = CASE WHEN ${values.hasCarbsGrams} THEN ${values.carbs_grams} ELSE carbs_grams END,
                fat_grams = CASE WHEN ${values.hasFatGrams} THEN ${values.fat_grams} ELSE fat_grams END,
                notes = CASE WHEN ${values.hasNotes} THEN ${values.notes} ELSE notes END
            WHERE id = ${mealId} AND user_id = ${req.user.id}
            RETURNING id, user_id, meal_name, meal_type, calories, protein_grams,
                carbs_grams, fat_grams, notes, logged_at
        `;

        if (meals.length === 0) {
            return res.status(404).json({ error: "Meal not found" });
        }

        return res.status(200).json({
            message: "Meal updated successfully",
            meal: formatMeal(meals[0]),
        });
    }));

    router.delete("/:id", asyncHandler(async (req, res) => {
        const mealId = parseMealId(req.params.id);

        if (!mealId) {
            return res.status(400).json({ error: "Meal id must be a positive integer" });
        }

        const deletedMeals = await sql`
            DELETE FROM meals
            WHERE id = ${mealId} AND user_id = ${req.user.id}
            RETURNING id
        `;

        if (deletedMeals.length === 0) {
            return res.status(404).json({ error: "Meal not found" });
        }

        return res.status(204).send();
    }));

    return router;
}
