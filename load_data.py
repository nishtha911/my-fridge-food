import pandas as pd
import psycopg2
from psycopg2 import sql

def load_data_to_postgres():
    DB_NAME = "my-fridge-food"
    DB_USER = "postgres"
    DB_PASSWORD = "database123"
    DB_HOST = "localhost"
    DB_PORT = "5432"

    conn = None
    try:
        print("Attempting to connect to the database...")
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        cur = conn.cursor()
        print("Connection successful! Database is ready to be populated.")

        print("Dropping old tables...")
        cur.execute("""
            DROP TABLE IF EXISTS recipe_ingredients;
            DROP TABLE IF EXISTS ingredients;
            DROP TABLE IF EXISTS recipes;
            DROP TABLE IF EXISTS categories;
        """)
        conn.commit()
        print("Old tables dropped.")

        print("Creating new tables...")
        cur.execute("""
            CREATE TABLE categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
        """)
        cur.execute("""
            CREATE TABLE ingredients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                category_id INTEGER REFERENCES categories(id)
            );
        """)
        cur.execute("""
            CREATE TABLE recipes (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                total_time_in_mins INTEGER,
                cuisine VARCHAR(100),
                instructions TEXT,
                url TEXT,
                ingredient_count INTEGER
            );
        """)
        cur.execute("""
            CREATE TABLE recipe_ingredients (
                recipe_id INTEGER REFERENCES recipes(id),
                ingredient_id INTEGER REFERENCES ingredients(id),
                PRIMARY KEY (recipe_id, ingredient_id)
            );
        """)
        conn.commit()
        print("Tables created successfully.")

        print("Reading cleaned CSV file...")
        df = pd.read_csv('Cleaned_Indian_Food_Dataset.csv')
        print("CSV file loaded. Starting data processing...")
        
        # Manually defined categories
        categories = {
            'Spices': ['Cumin', 'Turmeric', 'Coriander', 'Chilli', 'Garam Masala', 'Cardamom', 'Cinnamon', 'Clove', 'Fenugreek', 'Asafoetida', 'Saffron', 'Nutmeg', 'Mustard', 'Pepper', 'Bay Leaf'],
            'Vegetables': ['Onion', 'Tomato', 'Potato', 'Carrot', 'Cabbage', 'Cauliflower', 'Peas', 'Spinach', 'Okra', 'Capsicum', 'Brinjal', 'Mushroom', 'Ginger', 'Garlic', 'Chilli'],
            'Pulses': ['Lentil', 'Dal', 'Chickpeas', 'Moong', 'Toor', 'Urad', 'Rajma'],
            'Grains': ['Rice', 'Flour', 'Wheat', 'Atta', 'Semolina'],
            'Dairy': ['Curd', 'Yogurt', 'Paneer', 'Ghee', 'Butter', 'Cream', 'Milk'],
            'Herbs': ['Coriander Leaves', 'Mint Leaves', 'Curry Leaves', 'Cilantro'],
            'Nuts & Seeds': ['Cashew', 'Almond', 'Pistachio', 'Walnut', 'Sesame', 'Poppy Seeds', 'Melon Seeds'],
            'Oils': ['Oil', 'Sunflower Oil', 'Mustard Oil', 'Coconut Oil'],
            'Other': []
        }
        
        # Populate categories table
        category_map = {}
        for cat_name in categories.keys():
            cur.execute("INSERT INTO categories (name) VALUES (%s) RETURNING id", (cat_name,))
            category_map[cat_name] = cur.fetchone()[0]
        conn.commit()

        # Build ingredient-to-category mapping
        ingredient_to_category = {}
        all_ingredients = set()
        for ingredients_str in df['Cleaned-Ingredients'].dropna():
            if not isinstance(ingredients_str, str):
                continue
            ingredients_list = [ing.strip().title() for ing in ingredients_str.split(',')]
            all_ingredients.update(ingredients_list)

        for ingredient in all_ingredients:
            assigned = False
            for cat_name, keywords in categories.items():
                if any(keyword.lower() in ingredient.lower() for keyword in keywords):
                    ingredient_to_category[ingredient] = category_map[cat_name]
                    assigned = True
                    break
            if not assigned:
                ingredient_to_category[ingredient] = category_map['Other']

        # Populate ingredients table
        print(f"Found {len(all_ingredients)} unique ingredients. Populating 'ingredients' table...")
        ingredient_id_map = {}
        for ingredient in sorted(list(all_ingredients)):
            if ingredient:
                category_id = ingredient_to_category.get(ingredient)
                if category_id:
                    cur.execute(
                        "INSERT INTO ingredients (name, category_id) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING RETURNING id",
                        (ingredient, category_id)
                    )
                    result = cur.fetchone()
                    if result:
                        ingredient_id_map[ingredient] = result[0]
                    else:
                        cur.execute("SELECT id FROM ingredients WHERE name = %s", (ingredient,))
                        ingredient_id_map[ingredient] = cur.fetchone()[0]
        conn.commit()
        print("'ingredients' and 'categories' tables populated.")

        print("Populating 'recipes' and 'recipe_ingredients' tables...")
        for index, row in df.iterrows():
            ingredients_str = row['Cleaned-Ingredients']
            if not isinstance(ingredients_str, str):
                continue

            cleaned_list = [ing.strip().title() for ing in ingredients_str.split(',')]
            unique_ingredients_for_recipe = set(cleaned_list)

            cur.execute("""
                INSERT INTO recipes (name, total_time_in_mins, cuisine, instructions, url, ingredient_count)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                row['TranslatedRecipeName'],
                row['TotalTimeInMins'],
                row['Cuisine'],
                row['TranslatedInstructions'],
                row['URL'],
                row['Ingredient-count']
            ))
            recipe_id = cur.fetchone()[0]

            for ingredient in unique_ingredients_for_recipe:
                if ingredient in ingredient_id_map:
                    ingredient_id = ingredient_id_map[ingredient]
                    cur.execute(
                        "INSERT INTO recipe_ingredients (recipe_id, ingredient_id) VALUES (%s, %s);",
                        (recipe_id, ingredient_id)
                    )
        conn.commit()
        print("All data loaded successfully! The database is ready for use.")

    except psycopg2.Error as e:
        print(f"Database error: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            cur.close()
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    load_data_to_postgres()