import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [ingredientsByCategory, setIngredientsByCategory] = useState({});
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/ingredients');
        if (typeof response.data === 'object' && response.data !== null) {
          setIngredientsByCategory(response.data);
          const categories = Object.keys(response.data);
          const initialExpanded = {};
          categories.slice(0, 3).forEach(cat => {
            initialExpanded[cat] = true;
          });
          setExpandedCategories(initialExpanded);
        } else {
          setError('Invalid data format received from the server.');
        }
      } catch (err) {
        setError('Failed to fetch ingredients.');
        console.error(err);
      }
    };
    fetchIngredients();
  }, []);

  const handleIngredientToggle = (ingredient) => {
    setSelectedIngredients(prev => {
      if (prev.includes(ingredient)) {
        return prev.filter(ing => ing !== ingredient);
      } else {
        return [...prev, ingredient];
      }
    });
  };

  const removeIngredient = (ingredient) => {
    setSelectedIngredients(prev => prev.filter(ing => ing !== ingredient));
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const findRecipes = async () => {
    if (selectedIngredients.length === 0) {
      setError('Please select at least one ingredient');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://localhost:5000/api/recipes', {
        ingredients: selectedIngredients,
      });
      setRecipes(response.data);
    } catch (err) {
      setError('Failed to fetch recipes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setSelectedIngredients([]);
    setRecipes([]);
  };

  const filteredCategories = Object.entries(ingredientsByCategory).reduce((acc, [category, ingredients]) => {
    if (!searchTerm) {
      acc[category] = ingredients;
    } else {
      const filtered = ingredients.filter(ingredient => 
        ingredient.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
    }
    return acc;
  }, {});

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text-container">
            <h1 className="app-title">My Fridge Food</h1>
            <p className="app-subtitle">Find delicious recipes with ingredients you already have</p>
          </div>
        </div>
      </header>

      <div className="main-content-container">
        <div className="ingredients-panel">
          <div className="ingredients-card">
            <div className="panel-header">
              <h2 className="panel-title">Select Ingredients</h2>
              <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="ingredient-list-container">
              {Object.entries(filteredCategories).map(([category, ingredients]) => (
                <div key={category} className="category-group">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="category-button"
                  >
                    <span className="category-title">
                      {category} ({ingredients.length})
                    </span>
                    {expandedCategories[category] ? 
                      <span className="category-icon">▲</span> : 
                      <span className="category-icon">▼</span>
                    }
                  </button>
                  
                  {expandedCategories[category] && (
                    <div className="ingredient-checkboxes">
                      <div className="ingredient-grid">
                        {ingredients.map((ingredient) => (
                          <label
                            key={ingredient}
                            className={`ingredient-label ${
                              selectedIngredients.includes(ingredient)
                                ? 'selected'
                                : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIngredients.includes(ingredient)}
                              onChange={() => handleIngredientToggle(ingredient)}
                              className="ingredient-checkbox"
                            />
                            <span className="ingredient-name">{ingredient}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="recipes-panel">
          <div className="recipes-card">
            <div className="panel-header">
              <h3 className="panel-title">
                Selected ({selectedIngredients.length})
              </h3>
              {selectedIngredients.length > 0 && (
                <button
                  onClick={clearAll}
                  className="clear-button"
                >
                  Clear All
                </button>
              )}
            </div>

            {selectedIngredients.length === 0 ? (
              <p className="placeholder-text">
                No ingredients selected yet. Choose some ingredients to get started!
              </p>
            ) : (
              <>
                <div className="selected-ingredients-list">
                  {selectedIngredients.map((ingredient) => (
                    <div
                      key={ingredient}
                      className="selected-ingredient-item"
                    >
                      <span className="selected-ingredient-name">{ingredient}</span>
                      <button
                        onClick={() => removeIngredient(ingredient)}
                        className="remove-ingredient-button"
                      >
                        <span className="remove-icon">✕</span>
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={findRecipes}
                  disabled={loading}
                  className="find-recipes-button"
                >
                  {loading ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      Finding Recipes...
                    </div>
                  ) : (
                    <div className="button-content">
                      <span className="chef-icon">👨‍🍳</span>
                      Find Recipes
                    </div>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {recipes.length > 0 && (
        <div className="recipes-section">
          <div className="recipes-list-container">
            <h2 className="recipes-heading">
              Available Recipes ({recipes.length})
            </h2>
            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="recipe-card">
                  <h3 className="recipe-name">{recipe.name}</h3>
                  
                  <div className="recipe-info-group">
                    {recipe.cuisine && (
                      <div className="recipe-info-item">
                        <span className="recipe-info-icon">🌐</span>
                        <span className="recipe-info-text">{recipe.cuisine}</span>
                      </div>
                    )}
                    
                    {recipe.total_time_in_mins && (
                      <div className="recipe-info-item">
                        <span className="recipe-info-icon">⏰</span>
                        <span className="recipe-info-text">{recipe.total_time_in_mins} mins</span>
                      </div>
                    )}
                    
                    {recipe.ingredient_count && (
                      <div className="recipe-info-item">
                        <span className="recipe-info-icon">🍽️</span>
                        <span className="recipe-info-text">{recipe.ingredient_count} ingredients</span>
                      </div>
                    )}
                  </div>

                  {recipe.url && (
                    <a
                      href={recipe.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="recipe-link"
                    >
                      View Recipe
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedIngredients.length > 0 && recipes.length === 0 && !loading && (
        <div className="no-recipes-found">
          <div className="no-recipes-card">
            <span className="chef-icon-large">👨‍🍳</span>
            <h3 className="no-recipes-heading">No Recipes Found</h3>
            <p className="no-recipes-text">
              No recipes found with all selected ingredients. Try selecting different ingredients or fewer ingredients.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;