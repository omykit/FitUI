export function createAuthMiddleware({ sql, jwt, jwtSecret, sanitizeUser }) {
    return async function authMiddleware(req, res, next) {
        const authHeader = req.headers.authorization || "";
        const [scheme, token] = authHeader.split(" ");

        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({ error: "Authentication token is required" });
        }

        try {
            const payload = jwt.verify(token, jwtSecret);
            const userId = Number(payload.sub);

            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(401).json({ error: "Invalid authentication token" });
            }

            const users = await sql`
                SELECT id, username, email, weight, height, goal, created_at
                FROM users
                WHERE id = ${userId}
                LIMIT 1
            `;

            if (users.length === 0) {
                return res.status(401).json({ error: "Invalid authentication token" });
            }

            req.user = sanitizeUser(users[0]);
            return next();
        } catch (err) {
            return res.status(401).json({ error: "Invalid authentication token" });
        }
    };
}
