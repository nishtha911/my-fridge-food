-- ============================================================
-- schema.sql
-- My Rasoi — "What's in Your Fridge?" Database Schema
-- PostgreSQL
-- ============================================================


-- ------------------------------------------------------------
-- 1. STAGING TABLE
--    Temporary table used to bulk-load data from
--    Cleaned_Indian_Food_Dataset.csv before inserting into
--    the normalised recipes table.
-- ------------------------------------------------------------
CREATE TABLE cleaned_recipe_staging (
    translatedrecipename    TEXT,
    translatedingredients   TEXT,
    totaltimeinmins         INTEGER,
    cuisine                 TEXT,
    translatedinstructions  TEXT,
    url                     TEXT,
    cleaned_ingredients     TEXT,
    image_url               TEXT,
    ingredient_count        INTEGER
);


-- ------------------------------------------------------------
-- 2. INGREDIENTS
--    Normalised, de-duplicated ingredient names.
--    Powers the GET /ingredients autocomplete endpoint.
-- ------------------------------------------------------------
CREATE TABLE ingredients (
    id   SERIAL PRIMARY KEY,
    name TEXT   NOT NULL UNIQUE
);


-- ------------------------------------------------------------
-- 3. RECIPES
--    One row per recipe. Populated from cleaned_recipe_staging
--    via the INSERT below.
-- ------------------------------------------------------------
CREATE TABLE recipes (
    id               SERIAL  PRIMARY KEY,
    name             TEXT    NOT NULL UNIQUE,
    cuisine          TEXT,
    total_time       INTEGER,   -- minutes
    url              TEXT,
    ingredient_count INTEGER
);


-- ------------------------------------------------------------
-- 4. RECIPE_INGREDIENT_RAW
--    Raw ingredient strings exactly as they appear in
--    recipe_ingredient_map.csv, e.g. "1 tablespoon Red Chilli powder".
--    Used by POST /match-recipes for ILIKE fuzzy matching.
-- ------------------------------------------------------------
CREATE TABLE recipe_ingredient_raw (
    id              SERIAL PRIMARY KEY,
    recipe_name     TEXT   NOT NULL,
    ingredient_name TEXT   NOT NULL
);


-- ------------------------------------------------------------
-- 5. SEED: Load recipes from staging
--    Run this after \COPY-ing your CSV into cleaned_recipe_staging.
-- ------------------------------------------------------------
INSERT INTO recipes (name, cuisine, total_time, url, ingredient_count)
SELECT DISTINCT ON (translatedrecipename)
    translatedrecipename,
    cuisine,
    totaltimeinmins,
    url,
    ingredient_count
FROM cleaned_recipe_staging
ORDER BY translatedrecipename;
