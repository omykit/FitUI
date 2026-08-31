import {neon} from "@neondatabase/serverless";
import "dotenv/config";

//Creates sql connection to the database using the DATABASE_URL from the .env file
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
}

export const sql = neon(process.env.DATABASE_URL);
