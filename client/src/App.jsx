import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [ingredients, setIngredients] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Fetch ingredients on component mount
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        // This relative path is handled by the proxy in vite.config.js
        const response = await axios.get('/api/ingredients');
        
        // Ensure data exists and is the categorized object format from server.js
        if (response.data && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
          // Flatten the object { Category: [item1, item2] } into a single array for searching
          const allIngredients = Object.values(response.data).flat();
          
          console.log(`Successfully loaded ${allIngredients.length} ingredients.`);
          setIngredients(allIngredients);
          setError(null);
        } else {
          // If the DB returns an empty object
          setIngredients([]);
          console.warn('No ingredients found in the database response.');
        }
      } catch (err) {
        setError('Failed to fetch ingredients from server.');
        console.error('Fetch error:', err.message);
      }
    };
    fetchIngredients();
  }, []);

  // Update search results whenever searchTerm or ingredients list changes
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = ingredients.filter(ingredient =>
        ingredient.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 50)); // Limit to top 50 for performance
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchTerm, ingredients]);

  const handleSelectIngredient = (ingredient) => {
    if (!selectedIngredients.includes(ingredient)) {
      setSelectedIngredients(prev => [...prev, ingredient]);
    }
    setSearchTerm('');
    setShowSearchResults(false);
  };

  const removeIngredient = (ingredient) => {
    setSelectedIngredients(prev => prev.filter(ing => ing !== ingredient));
  };

  const findRecipes = async () => {
    if (selectedIngredients.length === 0) {
      setError('Please select at least one ingredient');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/recipes', {
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
    setError(null);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text-container">
            <h1 className="app-title">MyRasoi</h1>
            <p className="app-subtitle">Find delicious recipes with ingredients you already have</p>
          </div>
        </div>
      </header>

      <div className="main-content-container">
        <div className="ingredients-panel">
          <div className="ingredients-card">
            <div className="panel-header">
              <h2 className="panel-title">Select Ingredients</h2>
            </div>
            
            <div className="search-container">
              <span className="search-icon">&#128269;</span>
              <input
                type="text"
                placeholder="Search 4000+ ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {searchResults.map(ingredient => (
                  <button 
                    key={ingredient} 
                    className="search-result-item" 
                    onClick={() => handleSelectIngredient(ingredient)}
                  >
                    {ingredient}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="error-message" style={{ color: '#d32f2f', padding: '10px' }}>
                {error}
              </div>
            )}
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
                No ingredients selected yet. Start searching to add some!
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
                  </div>

                  {recipe.url && (
                    <a
                      href={recipe.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="recipe-link"
                    >
                      View Full Recipe
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedIngredients.length > 0 && recipes.length === 0 && !loading && !error && (
        <div className="no-recipes-found">
          <div className="no-recipes-card">
            <span className="chef-icon-large">👨‍🍳</span>
            <h3 className="no-recipes-heading">No Matches Yet</h3>
            <p className="no-recipes-text">
              We couldn't find recipes matching all those ingredients. Try removing one or two!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;