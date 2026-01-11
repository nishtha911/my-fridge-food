const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

// Parse CSV line properly
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);

  return fields;
}

async function seedDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting database seeding...');

    // Drop existing tables if they exist
    await client.query('DROP TABLE IF EXISTS recipe_ingredients CASCADE');
    await client.query('DROP TABLE IF EXISTS recipes CASCADE');
    await client.query('DROP TABLE IF EXISTS ingredients CASCADE');
    await client.query('DROP TABLE IF EXISTS categories CASCADE');
    console.log('✅ Dropped existing tables');

    // Create categories table with longer name field
    await client.query(`
      CREATE TABLE categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      )
    `);
    console.log('✅ Created categories table');

    // Create ingredients table
    await client.query(`
      CREATE TABLE ingredients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        category_id INTEGER REFERENCES categories(id)
      )
    `);
    console.log('✅ Created ingredients table');

    // Create recipes table
    await client.query(`
      CREATE TABLE recipes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        cuisine VARCHAR(100),
        total_time INTEGER,
        instructions TEXT,
        url TEXT,
        image_url TEXT,
        ingredient_count INTEGER
      )
    `);
    console.log('✅ Created recipes table');

    // Create recipe_ingredients junction table
    await client.query(`
      CREATE TABLE recipe_ingredients (
        recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
        ingredient_id INTEGER REFERENCES ingredients(id) ON DELETE CASCADE,
        PRIMARY KEY (recipe_id, ingredient_id)
      )
    `);
    console.log('✅ Created recipe_ingredients table');

    // Read CSV and build data structures
    const csvFilePath = path.join(__dirname, '..', 'Cleaned_Indian_Food_Dataset.csv');
    const fileStream = fs.createReadStream(csvFilePath, 'utf-8');
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const recipes = [];
    const ingredientMap = new Map();

    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber++;
      if (lineNumber === 1) continue;

      if (lineNumber % 500 === 0) {
        process.stdout.write(`\r📄 Reading line ${lineNumber}...`);
      }

      try {
        const fields = parseCSVLine(line);

        if (fields.length < 7) continue;

        const recipeName = (fields[0] || '').trim();
        let cuisine = (fields[3] || 'Indian').trim();
        
        // Limit cuisine name to 100 chars
        if (cuisine.length > 100) {
          cuisine = 'Indian';
        }
        
        const cleanedIngredients = (fields[6] || '').trim();
        const totalTime = parseInt(fields[2]) || 0;
        const instructions = (fields[4] || '').trim();
        const url = (fields[5] || '').trim();
        const imageUrl = (fields[7] || '').trim();
        const ingredientCount = parseInt(fields[8]) || 0;

        if (!recipeName || !cleanedIngredients) continue;

        // Parse ingredients
        const ingredientsList = cleanedIngredients.split(',')
          .map(ing => ing.trim().toLowerCase())
          .filter(ing => ing.length > 0 && ing.length < 100); // Filter noise and long strings

        recipes.push({
          name: recipeName,
          cuisine,
          total_time: totalTime,
          instructions,
          url,
          image_url: imageUrl,
          ingredient_count: ingredientCount,
          ingredients: ingredientsList
        });

        // Collect ingredients
        for (const ing of ingredientsList) {
          if (!ingredientMap.has(ing)) {
            ingredientMap.set(ing, cuisine);
          }
        }
      } catch (err) {
        continue;
      }
    }

    console.log(`\n📊 Parsed ${recipes.length} recipes from CSV`);

    // Insert categories
    const categorySet = new Set(ingredientMap.values());
    for (const category of categorySet) {
      await client.query(
        `INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING`,
        [category]
      );
    }
    console.log(`✅ Inserted ${categorySet.size} categories`);

    // Insert ingredients
    let ingredientCount = 0;
    for (const [ingredientName, cuisine] of ingredientMap) {
      // Validate ingredient name length
      if (ingredientName.length > 254) {
        continue; // Skip very long ingredient names
      }

      const categoryResult = await client.query(
        `SELECT id FROM categories WHERE name = $1`,
        [cuisine]
      );
      const categoryId = categoryResult.rows[0]?.id || null;

      await client.query(
        `INSERT INTO ingredients (name, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [ingredientName, categoryId]
      );
      ingredientCount++;
    }
    console.log(`✅ Inserted ${ingredientCount} ingredients`);

    // Insert recipes and links
    let recipeCount = 0;
    let linkCount = 0;

    for (const recipe of recipes) {
      const recipeResult = await client.query(
        `INSERT INTO recipes (name, cuisine, total_time, instructions, url, image_url, ingredient_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [recipe.name, recipe.cuisine, recipe.total_time, recipe.instructions, recipe.url, recipe.image_url, recipe.ingredient_count]
      );
      const recipeId = recipeResult.rows[0].id;
      recipeCount++;

      // Link ingredients
      for (const ingredientName of recipe.ingredients) {
        if (ingredientName.length > 254) {
          continue; // Skip very long ingredient names
        }

        const ingredientResult = await client.query(
          `SELECT id FROM ingredients WHERE name = $1`,
          [ingredientName]
        );

        if (ingredientResult.rows.length > 0) {
          const ingredientId = ingredientResult.rows[0].id;
          await client.query(
            `INSERT INTO recipe_ingredients (recipe_id, ingredient_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [recipeId, ingredientId]
          );
          linkCount++;
        }
      }
    }

    console.log(`✅ Inserted ${recipeCount} recipes`);
    console.log(`✅ Linked ${linkCount} recipe-ingredient relationships`);

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (err) {
    console.error('❌ Error during seeding:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase();
