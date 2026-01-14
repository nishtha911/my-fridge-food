import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// db connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


// ---------------- INGREDIENT SEARCH ----------------
/*
GET /ingredients?query=to
returns top 10 ingredients (starts-with)
*/
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
    console.error("INGREDIENT SEARCH ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- RECIPE MATCHING ---------------- */
/*
POST /match-recipes
body: { ingredients: [1, 5, 9] }
*/
app.post("/match-recipes", async (req, res) => {
  const { ingredients } = req.body;

  if (!ingredients || ingredients.length === 0) {
    return res.json([]);
  }

  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.name,
        r.cuisine,
        r.total_time,
        r.url,
        r.ingredient_count,
        COUNT(ri.ingredient_id) AS matched_count
      FROM recipes r
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      WHERE ri.ingredient_id = ANY($1)
      GROUP BY r.id
      ORDER BY
        (r.ingredient_count - COUNT(ri.ingredient_id)) ASC,
        COUNT(ri.ingredient_id) DESC
      `,
      [ingredients]
    );

    const recipes = result.rows.map((r) => ({
      ...r,
      missing_count: r.ingredient_count - r.matched_count,
    }));

    res.json(recipes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Recipe matching failed" });
  }
});

/* ---------------- SERVER START ---------------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
