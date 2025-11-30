const fetch = require('node-fetch');

export default async (req, res) => {
    const API_KEY = process.env.SPOONACULAR_API_KEY;
    const { endpoint, query, ingredients } = req.query;

    let spoonacularUrl = '';

    if (endpoint === 'complexSearch') {
        spoonacularUrl = `https://api.spoonacular.com/recipes/complexSearch?query=${query}&apiKey=${API_KEY}&number=12&addRecipeInformation=true&fillIngredients=true`;
    } else if (endpoint === 'findByIngredients') {
        spoonacularUrl = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&apiKey=${API_KEY}&number=12&ranking=1`;
    } else if (endpoint === 'information') {
        spoonacularUrl = `https://api.spoonacular.com/recipes/${query}/information?apiKey=${API_KEY}&includeNutrition=false`;
    } else {
        res.status(400).send('Invalid API endpoint requested.');
        return;
    }

    try {
        const response = await fetch(spoonacularUrl);
        const data = await response.json();
        
        res.status(200).json(data);
    } catch (error) {
        res.status(500).send('API proxy error.');
    }
};
