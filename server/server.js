import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------------- DB CONNECTION ----------------
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// ---------------- INGREDIENT SEARCH ----------------
app.get("/ingredients", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);

  try {
    const result = await pool.query(
      `
      SELECT id, name
      FROM ingredients
      WHERE name ILIKE $1
      ORDER BY name
      LIMIT 10
      `,
      [`${query}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ingredient search failed" });
  }
});

// ---------------- RECIPE MATCHING ----------------
app.post("/match-recipes", async (req, res) => {
  const { ingredients } = req.body;
  if (!ingredients || ingredients.length === 0) return res.json([]);

  try {
    const result = await pool.query(
      `
      WITH selected_ingredients AS (
        SELECT name
        FROM ingredients
        WHERE id = ANY($1)
      ),
      matched AS (
        SELECT
          r.id,
          r.name,
          r.cuisine,
          r.total_time,
          r.url,
          r.ingredient_count,
          COUNT(*) AS matched_count
        FROM recipe_ingredient_raw rir
        JOIN selected_ingredients si
          ON rir.ingredient_name ILIKE '%' || si.name || '%'
        JOIN recipes r
          ON r.name = rir.recipe_name
        GROUP BY r.id
      )
      SELECT *,
        (ingredient_count - matched_count) AS missing_count
      FROM matched
      ORDER BY missing_count ASC, matched_count DESC
      LIMIT 50;
      `,
      [ingredients]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("MATCH ERROR:", err.message);
    res.status(500).json({ error: "Recipe matching failed" });
  }
});

// ---------------- SERVER START ----------------
// Serve client build when running in production or when explicitly requested
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.join(__dirname, "..", "client", "dist");

try {
  // If a built client exists, serve it
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
} catch (e) {
  // ignore if dist doesn't exist
}

// Export a handler for serverless platforms (Vercel, etc.)
export default function handler(req, res) {
  app(req, res);
}

// Start the server when running as a standalone process (not on serverless platforms)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
