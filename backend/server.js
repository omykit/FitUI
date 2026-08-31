import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createAuthRoutes } from "./routes/authRoutes.js";
import { createMealRoutes } from "./routes/mealRoutes.js";
import { createProgressRoutes } from "./routes/progressRoutes.js";
import { createWorkoutRoutes } from "./routes/workoutRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const REQUIRED_ENV_VARS = ["DATABASE_URL", "JWT_SECRET"];
let sql;
let authMiddleware;

function validateEnv() {
    const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
    }

    if (process.env.PORT && Number.isNaN(Number(process.env.PORT))) {
        throw new Error("PORT must be a valid number");
    }
}

app.use(cors());
app.use(express.json());

// Postgres returns DECIMAL columns as strings. The route modules each parse
// their own decimals before responding; sanitizeUser did not, so user.weight
// was served as "72.00" while progress.weight for the same person was 72.
// Same helper shape as routes/mealRoutes.js and routes/progressRoutes.js.
function parseDecimal(value) {
    return value === undefined || value === null ? null : parseFloat(value);
}

function sanitizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        weight: parseDecimal(user.weight),
        height: parseDecimal(user.height),
        goal: user.goal,
        created_at: user.created_at,
    };
}

function validateProfileInput(body) {
    const hasWeight = Object.hasOwn(body, "weight");
    const hasHeight = Object.hasOwn(body, "height");
    const hasGoal = Object.hasOwn(body, "goal");
    const weight = body.weight === undefined || body.weight === null || body.weight === "" ? null : Number(body.weight);
    const height = body.height === undefined || body.height === null || body.height === "" ? null : Number(body.height);
    const goal = body.goal === undefined || body.goal === null ? null : String(body.goal).trim();
    const errors = [];

    if (!hasWeight && !hasHeight && !hasGoal) errors.push("At least one profile field is required");
    if (hasWeight && body.weight !== null && body.weight !== "" && (!Number.isFinite(weight) || weight <= 0)) errors.push("weight must be a positive number");
    if (hasHeight && body.height !== null && body.height !== "" && (!Number.isFinite(height) || height <= 0)) errors.push("height must be a positive number");
    if (hasGoal && goal && goal.length > 100) errors.push("goal must be 100 characters or less");

    return {
        errors,
        values: {
            hasWeight,
            hasHeight,
            hasGoal,
            weight,
            height,
            goal: goal || null,
        },
    };
}

function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

async function initdb() {
    await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        weight DECIMAL(10,2),
        height DECIMAL(10,2),
        goal VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('manual', 'instagram', 'youtube')),
        source_url TEXT,
        thumbnail_url TEXT,
        estimated_duration INTEGER,
        difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`CREATE TABLE IF NOT EXISTS workout_exercises (
        id SERIAL PRIMARY KEY,
        workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_name VARCHAR(255) NOT NULL,
        sets INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight DECIMAL(10,2),
        rest_seconds INTEGER,
        exercise_order INTEGER NOT NULL
    );`;

    await sql`CREATE TABLE IF NOT EXISTS progress_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        weight DECIMAL(10,2) NOT NULL,
        body_fat_percentage DECIMAL(5,2),
        notes TEXT,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    await sql`CREATE TABLE IF NOT EXISTS meals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        meal_name VARCHAR(255) NOT NULL,
        meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        calories INTEGER,
        protein_grams DECIMAL(6,2),
        carbs_grams DECIMAL(6,2),
        fat_grams DECIMAL(6,2),
        notes TEXT,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;

    console.log("Database initialized successfully");
}

app.get("/", (req, res) => {
    res.json({ message: "FitUI backend running" });
});

app.put("/api/profile", asyncHandler(async (req, res, next) => {
    return authMiddleware(req, res, next);
}), asyncHandler(async (req, res) => {
    const { errors, values } = validateProfileInput(req.body || {});

    if (errors.length > 0) {
        return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const users = await sql`
        UPDATE users
        SET
            weight = CASE WHEN ${values.hasWeight} THEN ${values.weight} ELSE weight END,
            height = CASE WHEN ${values.hasHeight} THEN ${values.height} ELSE height END,
            goal = CASE WHEN ${values.hasGoal} THEN ${values.goal} ELSE goal END
        WHERE id = ${req.user.id}
        RETURNING id, username, email, weight, height, goal, created_at
    `;

    if (users.length === 0) {
        return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
        message: "Profile updated successfully",
        user: sanitizeUser(users[0]),
    });
}));

function registerFallbackHandlers() {
    app.use((req, res) => {
        return res.status(404).json({ error: "Route not found" });
    });

    app.use((err, req, res, next) => {
        console.error(err);

        if (err?.code === "23505") {
            return res.status(409).json({ error: "Email is already registered" });
        }

        return res.status(500).json({ error: "Internal server error" });
    });
}

async function startServer() {
    try {
        validateEnv();
        const db = await import("./config/db.js");
        sql = db.sql;
        authMiddleware = createAuthMiddleware({
            sql,
            jwt,
            jwtSecret: process.env.JWT_SECRET,
            sanitizeUser,
        });
        app.use("/api/auth", createAuthRoutes({
            sql,
            jwt,
            jwtSecret: process.env.JWT_SECRET,
            authMiddleware,
            sanitizeUser,
        }));
        app.use("/api/workouts", createWorkoutRoutes({
            sql,
            authMiddleware,
        }));
        app.use("/api/progress", createProgressRoutes({
            sql,
            authMiddleware,
        }));
        app.use("/api/meals", createMealRoutes({
            sql,
            authMiddleware,
        }));
        registerFallbackHandlers();
        await initdb();
        app.listen(PORT, () => {
            console.log("Server is running on PORT:", PORT);
        });
    } catch (err) {
        console.error("Server startup failed:", err.message);
        process.exit(1);
    }
}

startServer();
