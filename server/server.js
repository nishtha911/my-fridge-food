const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Configuration
// Uses DATABASE_URL (for Vercel/Neon) or individual variables (for Local pgAdmin)
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Test DB Connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to PostgreSQL');
  release();
});

// --- API ROUTES ---

aapp.get('/api/test-db', async (req, res) => {
  try {
    const count = await pool.query('SELECT COUNT(*) FROM ingredients');
    const sample = await pool.query('SELECT * FROM ingredients LIMIT 5');
    res.json({
      total_ingredients: count.rows[0].count,
      sample: sample.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/recipes', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ message: 'No ingredients provided' });
    }

    const ingredientNames = ingredients.map(ing => ing.toLowerCase());

    // 1. Get IDs for the selected ingredients
    const ingredientIdQuery = `SELECT id FROM ingredients WHERE LOWER(name) = ANY($1)`;
    const ingredientResult = await pool.query(ingredientIdQuery, [ingredientNames]);
    const ingredientIds = ingredientResult.rows.map(row => row.id);

    if (ingredientIds.length === 0) {
      return res.json([]); 
    }

    // 2. Find recipes that contain ALL of the selected ingredients
    const recipeQuery = `
      SELECT r.*, COUNT(DISTINCT ri.ingredient_id) AS matching_ingredient_count
      FROM recipes r
      JOIN recipe_ingredients ri ON r.id = ri.recipe_id
      WHERE ri.ingredient_id = ANY($1)
      GROUP BY r.id
      HAVING COUNT(DISTINCT ri.ingredient_id) = $2
      ORDER BY r.ingredient_count ASC;
    `;
    const recipes = await pool.query(recipeQuery, [ingredientIds, ingredientIds.length]);

    res.json(recipes.rows);
  } catch (err) {
    console.error("Recipe Search Error:", err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// Default API landing
app.get('/api', (req, res) => {
  res.send('MyRasoi API is running');
});

// --- DEPLOYMENT SETTINGS ---

// Serve static files from the React app in production
if (isProduction) {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});