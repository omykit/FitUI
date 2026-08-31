import express from "express";
import bcrypt from "bcrypt";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function validateSignupInput(body) {
    const username = String(body.username || "").trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    const weight = body.weight === undefined || body.weight === null || body.weight === "" ? null : Number(body.weight);
    const height = body.height === undefined || body.height === null || body.height === "" ? null : Number(body.height);
    const goal = body.goal === undefined || body.goal === null ? null : String(body.goal).trim();
    const errors = [];

    if (!username) errors.push("username is required");
    if (username.length > 255) errors.push("username must be 255 characters or less");
    if (!email) errors.push("email is required");
    if (email && !EMAIL_REGEX.test(email)) errors.push("email must be valid");
    if (!password) errors.push("password is required");
    if (password && password.length < PASSWORD_MIN_LENGTH) errors.push(`password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    if (body.weight !== undefined && body.weight !== null && body.weight !== "" && (!Number.isFinite(weight) || weight <= 0)) errors.push("weight must be a positive number");
    if (body.height !== undefined && body.height !== null && body.height !== "" && (!Number.isFinite(height) || height <= 0)) errors.push("height must be a positive number");
    if (goal && goal.length > 100) errors.push("goal must be 100 characters or less");

    return {
        errors,
        values: { username, email, password, weight, height, goal: goal || null },
    };
}

function validateLoginInput(body) {
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    const errors = [];

    if (!email) errors.push("email is required");
    if (email && !EMAIL_REGEX.test(email)) errors.push("email must be valid");
    if (!password) errors.push("password is required");

    return {
        errors,
        values: { email, password },
    };
}

function asyncHandler(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

export function createAuthRoutes({ sql, jwt, jwtSecret, authMiddleware, sanitizeUser }) {
    const router = express.Router();

    function createAccessToken(user) {
        return jwt.sign(
            {
                sub: String(user.id),
                email: user.email,
            },
            jwtSecret,
            { expiresIn: "7d" }
        );
    }

    router.post("/signup", asyncHandler(async (req, res) => {
        const { errors, values } = validateSignupInput(req.body || {});

        if (errors.length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const existingUsers = await sql`
            SELECT id
            FROM users
            WHERE email = ${values.email}
            LIMIT 1
        `;

        if (existingUsers.length > 0) {
            return res.status(409).json({ error: "Email is already registered" });
        }

        const passwordHash = await bcrypt.hash(values.password, 12);
        const users = await sql`
            INSERT INTO users (username, email, password, weight, height, goal)
            VALUES (${values.username}, ${values.email}, ${passwordHash}, ${values.weight}, ${values.height}, ${values.goal})
            RETURNING id, username, email, weight, height, goal, created_at
        `;
        const user = sanitizeUser(users[0]);

        return res.status(201).json({
            message: "Signup successful",
            user,
            accessToken: createAccessToken(user),
        });
    }));

    router.post("/login", asyncHandler(async (req, res) => {
        const { errors, values } = validateLoginInput(req.body || {});

        if (errors.length > 0) {
            return res.status(400).json({ error: "Validation failed", details: errors });
        }

        const users = await sql`
            SELECT id, username, email, password, weight, height, goal, created_at
            FROM users
            WHERE email = ${values.email}
            LIMIT 1
        `;

        if (users.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isPasswordValid = await bcrypt.compare(values.password, users[0].password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = sanitizeUser(users[0]);

        return res.status(200).json({
            message: "Login successful",
            user,
            accessToken: createAccessToken(user),
        });
    }));

    router.get("/me", authMiddleware, (req, res) => {
        return res.status(200).json({ user: req.user });
    });

    return router;
}
