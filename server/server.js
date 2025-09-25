const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.get('/', (req, res) => {
  res.send('Welcome to the My Fridge Food API!');
});

app.get('/api/ingredients', async (req, res) => {
  try {
    // Fetch all ingredients along with their category name
    const result = await pool.query(`
      SELECT
        i.name,
        c.name AS category
      FROM ingredients i
      JOIN categories c ON i.category_id = c.id
      ORDER BY c.name ASC, i.name ASC;
    `);

    // Group the ingredients by category
    const categorizedIngredients = {};
    result.rows.forEach(row => {
      const { name, category } = row;
      if (!categorizedIngredients[category]) {
        categorizedIngredients[category] = [];
      }
      categorizedIngredients[category].push(name);
    });

    res.json(categorizedIngredients);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.post('/api/recipes', async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ message: 'No ingredients provided' });
    }

    const ingredientNames = ingredients.map(ing => ing.toLowerCase());

    const ingredientIdQuery = `SELECT id FROM ingredients WHERE LOWER(name) = ANY($1)`;
    const ingredientResult = await pool.query(ingredientIdQuery, [ingredientNames]);
    const ingredientIds = ingredientResult.rows.map(row => row.id);

    if (ingredientIds.length === 0) {
      return res.json([]); 
    }

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
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});