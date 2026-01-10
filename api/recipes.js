const pool = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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
      return res.status(200).json([]);
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

    res.status(200).json(recipes.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};
