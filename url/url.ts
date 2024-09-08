import dotenv from 'dotenv';
import { api, APIError } from "encore.dev/api";
import mysql from "mysql2/promise";
import { randomBytes } from "node:crypto";
dotenv.config();


// Create a MySQL connection using environment variables
const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

interface URL {
    id: string; // short-form URL id
    url: string; // complete URL, in long form
}

interface ShortenParams {
    url: string; // the URL to shorten
}

// shorten shortens a URL.
export const shorten = api(
    { expose: true, auth: false, method: "POST", path: "/url" },
    async ({ url }: ShortenParams): Promise<URL> => {
        const id = randomBytes(6).toString("base64url");
        try {
            // Insert shortened URL into MySQL database
            await db.execute('INSERT INTO url (id, original_url) VALUES (?, ?)', [id, url]);
            return { id, url };
        } catch (error) {
            console.error("Database Error:", error);
        }
    }
);

// Get retrieves the original URL for the id.
export const get = api(
    { expose: true, auth: false, method: "GET", path: "/url/:id" },
    async ({ id }: { id: string }): Promise<URL> => {
        try {
            // Query the original URL from MySQL database
            const [rows] = await db.execute('SELECT original_url FROM url WHERE id = ?', [id]);
            if (!rows || (rows as any[]).length === 0) {
                throw APIError.notFound("URL not found");
            }
            const row = (rows as any[])[0];
            return { id, url: row.original_url };
        } catch (error) {
            console.error("Database Error:", error);
            throw new APIError.internal("An error occurred while retrieving the URL.");
        }
    }
);

interface ListResponse {
    urls: URL[];
}

// List retrieves all URLs.
export const list = api(
    { expose: false, method: "GET", path: "/url" },
    async (): Promise<ListResponse> => {
        try {
            // Query all URLs from MySQL database
            const [rows] = await db.execute('SELECT id, original_url FROM url');
            const urls: URL[] = (rows as any[]).map(row => ({
                id: row.id,
                url: row.original_url
            }));
            return { urls };
        } catch (error) {
            console.error("Database Error:", error);
            throw new APIError.internal("An error occurred while retrieving the URLs.");
        }
    }
);
