import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL;

function App() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(() => {
    return JSON.parse(localStorage.getItem("ingredients")) || [];
  });
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- SEARCH INGREDIENTS ---------------- */
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    fetch(`${API}/ingredients?query=${query}`)
      .then((res) => res.json())
      .then((data) => {
  if (Array.isArray(data)) {
      setSuggestions(data);
    } else {
      setSuggestions([]);
    }
});

  }, [query]);

  /* ---------------- PERSIST ---------------- */
  useEffect(() => {
    localStorage.setItem("ingredients", JSON.stringify(selected));
  }, [selected]);

  /* ---------------- ADD INGREDIENT ---------------- */
  const addIngredient = (ing) => {
    if (selected.find((i) => i.id === ing.id)) return;
    setSelected([...selected, ing]);
    setQuery("");
    setSuggestions([]);
  };

  /* ---------------- REMOVE INGREDIENT ---------------- */
  const removeIngredient = (id) => {
    setSelected(selected.filter((i) => i.id !== id));
  };

  /* ---------------- FIND RECIPES ---------------- */
  const findRecipes = async () => {
    setLoading(true);

    const res = await fetch(`${API}/match-recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredients: selected.map((i) => i.id),
      }),
    });

    const data = await res.json();
    setRecipes(data);
    setLoading(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">My Fridge Food</h1>
        <p className="app-subtitle">
          Find Indian recipes from ingredients you have
        </p>
      </header>

      <div className="main-content-container">
        {/* INGREDIENT SEARCH */}
        <div className="ingredients-panel">
          <div className="ingredients-card">
            <h3 className="panel-title">Ingredients</h3>

            <input
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type ingredient..."
            />

            <div className="ingredients-list">
          {Array.isArray(suggestions) && suggestions.map((ing) => (
                <div
                  key={ing.id}
                  className="ingredient-item"
                  onClick={() => addIngredient(ing)}
                >
                  {ing.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SELECTED INGREDIENTS */}
        <div className="selected-panel">
          <div className="selected-card">
            <h3 className="panel-title">Selected Ingredients</h3>

            <div className="selected-ingredients-list">
              {selected.map((ing) => (
                <div key={ing.id} className="selected-ingredient-item">
                  {ing.name}
                  <button
                    className="remove-ingredient-button"
                    onClick={() => removeIngredient(ing.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              className="find-recipes-button"
              disabled={selected.length === 0 || loading}
              onClick={findRecipes}
            >
              {loading ? "Finding..." : "Find Recipes"}
            </button>
          </div>
        </div>
      </div>

      {/* RECIPES */}
      <section className="recipes-section">
        {selected.length === 0 ? (
          <p className="placeholder-text">
            Select ingredients to see recipes
          </p>
        ) : recipes.length === 0 ? (
          <div className="no-recipes-found">
            <div className="no-recipes-card">
              <p className="no-recipes-text">No recipes found</p>
            </div>
          </div>
        ) : (
          <div className="recipe-grid">
            {recipes.map((r) => (
              <div key={r.id} className="recipe-card">
                <h3 className="recipe-name">{r.name}</h3>

                <div className="recipe-info-group">
                  <span className="recipe-info-item">
                    🍽 {r.cuisine}
                  </span>
                  <span className="recipe-info-item">
                    ⏱ {r.total_time} mins
                  </span>
                  <span className="recipe-info-item">
                    ❌ Missing {r.missing_count}
                  </span>
                </div>

                <a
                  href={r.url}
                  target="_blank"
                  className="recipe-link"
                >
                  View Recipe
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
