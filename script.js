const modeA = document.getElementById('mode-a');
const modeB = document.getElementById('mode-b');
const modeABtn = document.getElementById('mode-a-btn');
const modeBBtn = document.getElementById('mode-b-btn');

const nameInput = document.getElementById('recipe-name-input');
const ingredientsInput = document.getElementById('ingredients-input');
const searchNameBtn = document.getElementById('search-name-btn');
const searchIngredientsBtn = document.getElementById('search-ingredients-btn');

const nameResultsDiv = document.getElementById('name-results');
const ingredientResultsDiv = document.getElementById('ingredient-results');
const statusMessage = document.getElementById('status-message');
const loader = document.getElementById('loader');

const overlay = document.getElementById('recipe-details-overlay');
const recipeDetailsInner = document.getElementById('recipe-details-inner');
const closeOverlayBtn = document.getElementById('close-overlay-btn');
const favoritesBtn = document.getElementById('favorites-btn');

let currentMode = localStorage.getItem('currentMode') || 'A';

function switchMode(mode) {
    if (mode === 'A') {
        modeA.classList.remove('hidden');
        modeB.classList.add('hidden');
        modeABtn.classList.add('active');
        modeBBtn.classList.remove('active');
    } else if (mode === 'B') {
        modeA.classList.add('hidden');
        modeB.classList.remove('hidden');
        modeABtn.classList.remove('active');
        modeBBtn.classList.add('active');
    }
    
    currentMode = mode;
    localStorage.setItem('currentMode', mode);
    clearStatus(); 
}

function showStatus(message, type = 'info') { 
    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden', 'info', 'error'); 
    statusMessage.classList.add(type); 
    statusMessage.classList.remove('hidden');
}

function clearStatus() {
    statusMessage.classList.add('hidden');
    statusMessage.textContent = '';
    statusMessage.classList.remove('info', 'error');
}

function toggleLoader(show) {
    loader.classList.toggle('hidden', !show);
}

async function searchRecipesByName() {
    const query = nameInput.value.trim();
    if (query.length < 3) {
        showStatus("Please enter at least 3 characters for the recipe name.", 'error');
        return;
    }
    
    clearStatus();
    toggleLoader(true);
    nameResultsDiv.innerHTML = '';

    try {
        const url = `/api/search?endpoint=complexSearch&query=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (data.results.length === 0) {
            showStatus(`No recipes found matching "${query}". Try a different name.`, 'info');
        } else {
            renderSearchResults(data.results, nameResultsDiv);
        }

    } catch (error) {
        showStatus("Error fetching recipes. Check console/Vercel logs.", 'error');
        console.error('Fetch error:', error);
    } finally {
        toggleLoader(false);
    }
}

async function searchRecipesByIngredients() {
    const ingredients = ingredientsInput.value.trim();
    if (ingredients.length === 0) {
        showStatus("Please enter one or more ingredients separated by commas.", 'error');
        return;
    }

    clearStatus();
    toggleLoader(true);
    ingredientResultsDiv.innerHTML = '';
    
    try {
        const url = `/api/search?endpoint=findByIngredients&ingredients=${encodeURIComponent(ingredients)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        if (data.length === 0) {
            showStatus(`No recipes found using those ingredients. Try fewer or different ones.`, 'info');
        } else {
            renderSearchResults(data, ingredientResultsDiv);
        }

    } catch (error) {
        showStatus("Error fetching recipes. Check console/Vercel logs.", 'error');
        console.error('Fetch error:', error);
    } finally {
        toggleLoader(false);
    }
}

async function showRecipeDetails(recipeId) {
    if (!recipeId) return;

    recipeDetailsInner.innerHTML = '<div class="loader"></div><p style="text-align: center; margin-top: 15px;">Loading recipe details...</p>';
    overlay.classList.remove('hidden');

    try {
        const url = `/api/search?endpoint=information&query=${recipeId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const recipe = await response.json();
        
        let ingredientsList = recipe.extendedIngredients.map(ing => `
            <li>
                <strong>${ing.name}</strong>: ${ing.amount.toFixed(2)} ${ing.unit}
            </li>
        `).join('');

        let instructions = recipe.instructions || "No detailed instructions available. Please check external sources or try a different recipe.";
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = instructions;
        instructions = tempDiv.textContent || tempDiv.innerText || instructions;
        
        const isRecipeFav = isFavorite(recipe.id);
        const favButtonClass = isRecipeFav ? 'remove-fav' : 'add-fav';
        const favButtonIcon = isRecipeFav ? '<i class="fas fa-bookmark"></i>' : '<i class="far fa-bookmark"></i>';
        const favButtonText = isRecipeFav ? 'Remove from Favorites' : 'Add to Favorites';

        recipeDetailsInner.innerHTML = `
            <h2>${recipe.title}</h2>
            <img src="${recipe.image || 'https://via.placeholder.com/600x350?text=No+Image'}" alt="${recipe.title}">
            
            <button class="fav-toggle-btn ${favButtonClass}" data-id="${recipe.id}">
                ${favButtonIcon} ${favButtonText}
            </button>

            <h3><i class="fas fa-list"></i> Ingredients</h3>
            <ul style="list-style-type: none; padding: 0;">${ingredientsList}</ul>

            <h3><i class="fas fa-steps"></i> Preparation</h3>
            <p style="white-space: pre-wrap;">${instructions}</p>

            <p style="margin-top: 20px; font-style: italic; font-size: 0.9rem; color: #6c757d;">
                Ready in: ${recipe.readyInMinutes} mins | Servings: ${recipe.servings}
            </p>
        `;

        document.querySelector('.fav-toggle-btn').addEventListener('click', toggleFavorite);

    } catch (error) {
        recipeDetailsInner.innerHTML = `<p style="color: var(--favorite-red); text-align: center;">Failed to load recipe details. Please ensure the API Key is valid in Vercel.</p>`;
        console.error('Details fetch error:', error);
    }
}

function renderSearchResults(recipes, targetDiv) {
    targetDiv.innerHTML = recipes.map(recipe => `
        <div class="recipe-card" data-id="${recipe.id}">
            <img src="${recipe.image || 'https://via.placeholder.com/200x200?text=No+Image'}" alt="${recipe.title}">
            <div class="card-body">
                <h3>${recipe.title}</h3>
            </div>
        </div>
    `).join('');
    
    targetDiv.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', () => {
            const recipeId = card.getAttribute('data-id');
            showRecipeDetails(recipeId);
        });
    });
}


function getFavorites() {
    return JSON.parse(localStorage.getItem('forkyFavorites')) || [];
}

function isFavorite(id) {
    const favorites = getFavorites();
    return favorites.some(fav => fav.id === parseInt(id));
}

async function toggleFavorite(e) {
    const button = e.currentTarget;
    const recipeId = parseInt(button.getAttribute('data-id'));
    let favorites = getFavorites();
    clearStatus();

    if (isFavorite(recipeId)) {
        favorites = favorites.filter(fav => fav.id !== recipeId);
        button.classList.remove('remove-fav');
        button.classList.add('add-fav');
        button.innerHTML = '<i class="far fa-bookmark"></i> Add to Favorites';
        showStatus('Recipe removed from favorites.', 'info');
    } else {
        try {
            const url = `/api/search?endpoint=information&query=${recipeId}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch recipe for favoriting: ${response.status}`);
            const recipe = await response.json();
            
            favorites.push({
                id: recipeId,
                title: recipe.title,
                image: recipe.image
            });
            button.classList.remove('add-fav');
            button.classList.add('remove-fav');
            button.innerHTML = '<i class="fas fa-bookmark"></i> Remove from Favorites';
            showStatus('Recipe added to favorites!', 'info');

        } catch (error) {
            console.error("Could not fetch recipe summary for saving:", error);
            showStatus('Failed to save recipe. API fetch error.', 'error');
            return;
        }
    }
    
    localStorage.setItem('forkyFavorites', JSON.stringify(favorites));
    
    if (document.title.includes("Favorites")) {
        showFavoritesList();
    }
}

function showFavoritesList() {
    const favorites = getFavorites();

    switchMode('A'); 
    nameInput.value = ''; 
    ingredientResultsDiv.innerHTML = ''; 
    document.title = "Forky - Favorites";

    if (favorites.length === 0) {
        nameResultsDiv.innerHTML = '<div style="padding: 20px; text-align: center; font-size: 1.1rem; color: #6c757d;">You have no saved favorite recipes yet. Click the "Add to Favorites" button on any recipe to save it!</div>';
        showStatus('Your Favorites List is Empty', 'info');
        return;
    }

    renderSearchResults(favorites, nameResultsDiv);
    showStatus(`Displaying ${favorites.length} Favorite Recipes.`, 'info');
}


modeABtn.addEventListener('click', () => {
    switchMode('A');
    document.title = "Forky - Dual-Mode Recipe Explorer";
});
modeBBtn.addEventListener('click', () => {
    switchMode('B');
    document.title = "Forky - Dual-Mode Recipe Explorer";
});

searchNameBtn.addEventListener('click', searchRecipesByName);
nameInput.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') searchRecipesByName();
});

searchIngredientsBtn.addEventListener('click', searchRecipesByIngredients);
ingredientsInput.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') searchRecipesByIngredients();
});


closeOverlayBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    clearStatus(); 
});

favoritesBtn.addEventListener('click', showFavoritesList);

document.addEventListener('DOMContentLoaded', () => {
    switchMode(currentMode); 
    showStatus("Welcome to Forky! Start by searching for a recipe or ingredients.", 'info');
});