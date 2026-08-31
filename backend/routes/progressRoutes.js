import express from "express";

function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function parseProgressId(id) {
    const progressId = Number(id);
    return Number.isInteger(progressId) && progressId > 0 ? progressId : null;
}

function parsePositiveNumber(value) {
    if (value === undefined || value === null || value === "") return null;

    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : Number.NaN;
}

function parsePercentage(value) {
    if (value === undefined || value === null || value === "") return null;

    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 100 ? number : Number.NaN;
}

function normalizeOptionalString(value) {
    if (value === undefined || value === null) return null;

    const trimmed = String(value).trim();
    return trimmed || null;
}

function parseDecimal(value) {
    return value === undefined || value === null ? null : parseFloat(value);
}

function formatProgress(row) {
    return {
        ...row,
        weight: parseDecimal(row.weight),
        body_fat_percentage: parseDecimal(row.body_fat_percentage),
    };
}

function validateCreateProgress(body) {
    const weight = parsePositiveNumber(body.weight);
    const bodyFatPercentage = parsePercentage(body.body_fat_percentage);
    const notes = normalizeOptionalString(body.notes);
    const errors = [];

    if (body.weight === undefined || body.weight === null || body.weight === "") errors.push("weight is required");
    if (!Number.isFinite(weight)) errors.push("weight must be a positive number");
    if (Number.isNaN(bodyFatPercentage)) errors.push("body_fat_percentage must be a number between 0 and 100");
    if (notes && notes.length > 500) errors.push("notes must be 500 characters or less");

    return {
        errors,
        values: {
            weight,
            body_fat_percentage: bodyFatPercentage,
            notes,
        },
    };
}

function validateUpdateProgress(body) {
    const hasWeight = Object.hasOwn(body, "weight");
    const hasBodyFatPercentage = Object.hasOwn(body, "body_fat_percentage");
    const hasNotes = Object.hasOwn(body, "notes");
    const weight = hasWeight ? parsePositiveNumber(body.weight) : null;
    const bodyFatPercentage = hasBodyFatPercentage ? parsePercentage(body.body_fat_percentage) : null;
    const notes = hasNotes ? normalizeOptionalString(body.notes) : null;
    const errors = [];

    if (!hasWeight && !hasBodyFatPercentage && !hasNotes) {
        errors.push("At least one progress field is required");
    }
    if (hasWeight && !Number.isFinite(weight)) errors.push("weight must be a positive number");
    if (hasBodyFatPercentage && Number.isNaN(bodyFatPercentage)) errors.push("body_fat_percentage must be a number between 0 and 100");
    if (notes && notes.length > 500) errors.push("notes must be 500 characters or less");

    return {
        errors,
        values: {
            hasWeight,
            hasBodyFatPercentage,
            hasNotes,
            weight,
            body_fat_percentage: bodyFatPercentage,
            notes,
        },
    };
}

export function createProgressRoutes({ sql, authMiddleware }) {
    const router = express.Router();

    router.use(authMiddleware);

    router.post("/", asyncHandler(async (req, res) => {
        const { errors, values } = validateCreateProgress(req.body || {});

        if (errors.length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const progressLogs = await sql`
            INSERT INTO progress_logs (user_id, weight, body_fat_percentage, notes)
            VALUES (${req.user.id}, ${values.weight}, ${values.body_fat_percentage}, ${values.notes})
            RETURNING id, user_id, weight, body_fat_percentage, notes, logged_at
        `;

        return res.status(201).json({
            message: "Progress entry created successfully",
            progress: formatProgress(progressLogs[0]),
        });
    }));

    router.get("/", asyncHandler(async (req, res) => {
        const progress = await sql`
            SELECT id, user_id, weight, body_fat_percentage, notes, logged_at
            FROM progress_logs
            WHERE user_id = ${req.user.id}
            ORDER BY logged_at DESC
        `;

        return res.status(200).json({ progress: progress.map(formatProgress) });
    }));

    router.get("/:id", asyncHandler(async (req, res) => {
        const progressId = parseProgressId(req.params.id);

        if (!progressId) {
            return res.status(400).json({ error: "Progress id must be a positive integer" });
        }

        const progress = await sql`
            SELECT id, user_id, weight, body_fat_percentage, notes, logged_at
            FROM progress_logs
            WHERE id = ${progressId} AND user_id = ${req.user.id}
            LIMIT 1
        `;

        if (progress.length === 0) {
            return res.status(404).json({ error: "Progress entry not found" });
        }

        return res.status(200).json({ progress: formatProgress(progress[0]) });
    }));

    router.put("/:id", asyncHandler(async (req, res) => {
        const progressId = parseProgressId(req.params.id);

        if (!progressId) {
            return res.status(400).json({ error: "Progress id must be a positive integer" });
        }

        const { errors, values } = validateUpdateProgress(req.body || {});

        if (errors.length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const progress = await sql`
            UPDATE progress_logs
            SET
                weight = CASE WHEN ${values.hasWeight} THEN ${values.weight} ELSE weight END,
                body_fat_percentage = CASE WHEN ${values.hasBodyFatPercentage} THEN ${values.body_fat_percentage} ELSE body_fat_percentage END,
                notes = CASE WHEN ${values.hasNotes} THEN ${values.notes} ELSE notes END
            WHERE id = ${progressId} AND user_id = ${req.user.id}
            RETURNING id, user_id, weight, body_fat_percentage, notes, logged_at
        `;

        if (progress.length === 0) {
            return res.status(404).json({ error: "Progress entry not found" });
        }

        return res.status(200).json({
            message: "Progress entry updated successfully",
            progress: formatProgress(progress[0]),
        });
    }));

    router.delete("/:id", asyncHandler(async (req, res) => {
        const progressId = parseProgressId(req.params.id);

        if (!progressId) {
            return res.status(400).json({ error: "Progress id must be a positive integer" });
        }

        const deletedProgress = await sql`
            DELETE FROM progress_logs
            WHERE id = ${progressId} AND user_id = ${req.user.id}
            RETURNING id
        `;

        if (deletedProgress.length === 0) {
            return res.status(404).json({ error: "Progress entry not found" });
        }

        return res.status(204).send();
    }));

    return router;
}
