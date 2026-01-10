const pool = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const result = await pool.query(`
      SELECT
        i.name,
        c.name AS category
      FROM ingredients i
      JOIN categories c ON i.category_id = c.id
      ORDER BY c.name ASC, i.name ASC;
    `);

    const categorizedIngredients = {};
    result.rows.forEach(row => {
      const { name, category } = row;
      if (!categorizedIngredients[category]) {
        categorizedIngredients[category] = [];
      }
      categorizedIngredients[category].push(name);
    });

    res.status(200).json(categorizedIngredients);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};
