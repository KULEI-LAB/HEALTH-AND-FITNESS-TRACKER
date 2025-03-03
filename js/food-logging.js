document.addEventListener('DOMContentLoaded', () => {
    const addMealBtn = document.getElementById('add-meal-btn');
    const foodLoggingForm = document.getElementById('food-logging-form');
    const cancelBtn = document.querySelector('.cancel-btn');
    const mealsContainer = document.querySelector('.meals-container');
    const foodDescriptionInput = document.getElementById('food-description');
    const portionSizeInput = document.getElementById('portion-size');
    const autocompleteDropdown = document.getElementById('autocomplete-dropdown');

    let meals = [];
    let selectedFood = null;
    let debounceTimer;

    // Event Listeners
    addMealBtn.addEventListener('click', () => {
        foodLoggingForm.classList.remove('hidden');
        foodLoggingForm.classList.add('fade-in');
    });

    cancelBtn.addEventListener('click', () => {
        foodLoggingForm.classList.add('hidden');
        resetForm();
    });

    foodLoggingForm.addEventListener('submit', handleMealSubmit);

    // Add new event listeners for food search
    foodDescriptionInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const searchTerm = e.target.value.trim();
            if (searchTerm.length >= 2) {
                searchFoods(searchTerm);
            } else {
                autocompleteDropdown.classList.add('hidden');
            }
        }, 300);
    });

    portionSizeInput.addEventListener('input', () => {
        if (selectedFood) {
            calculateNutrition();
        }
    });

    // Food search function
    async function searchFoods(term) {
        try {
            const response = await fetch(`http://localhost:3000/api/foods/search?term=${encodeURIComponent(term)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to search foods');

            const data = await response.json();
            displayAutocompleteResults(data.foods);
        } catch (error) {
            console.error('Error searching foods:', error);
            showNotification('Error searching foods', 'error');
        }
    }

    // Display autocomplete results
    function displayAutocompleteResults(foods) {
        if (!foods.length) {
            autocompleteDropdown.classList.add('hidden');
            return;
        }

        autocompleteDropdown.innerHTML = foods.map(food => `
            <div class="autocomplete-item" data-name="${food.name}">
                ${food.name}
            </div>
        `).join('');

        autocompleteDropdown.classList.remove('hidden');

        // Add click listeners to autocomplete items
        autocompleteDropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', async () => {
                const foodName = item.dataset.name;
                foodDescriptionInput.value = foodName;
                autocompleteDropdown.classList.add('hidden');
                
                try {
                    const response = await fetch(`http://localhost:3000/api/foods/details/${encodeURIComponent(foodName)}`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (!response.ok) throw new Error('Failed to fetch food details');

                    selectedFood = await response.json();
                    if (portionSizeInput.value) {
                        calculateNutrition();
                    }
                } catch (error) {
                    console.error('Error fetching food details:', error);
                    showNotification('Error fetching food details', 'error');
                }
            });
        });
    }

    // Calculate nutrition based on portion size
    function calculateNutrition() {
        if (!selectedFood || !portionSizeInput.value) return;

        const portionValue = parseFloat(portionSizeInput.value);
        if (isNaN(portionValue)) return;

        // Assuming the base portion in the database is 100g
        const ratio = portionValue / 100;

        document.getElementById('calories').value = Math.round(selectedFood.calories * ratio);
        document.getElementById('protein').value = (selectedFood.protein * ratio).toFixed(1);
        document.getElementById('carbs').value = (selectedFood.carbs * ratio).toFixed(1);
        document.getElementById('fats').value = (selectedFood.fats * ratio).toFixed(1);
    }

    // Click outside to close dropdown
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            autocompleteDropdown.classList.add('hidden');
        }
    });

    // Fetch and display initial data
    fetchTodaysMeals();
    fetchNutritionTotals();

    async function handleMealSubmit(e) {
        e.preventDefault();

        const mealData = {
            meal_time: document.getElementById('meal-time').value,
            description: document.getElementById('food-description').value,
            portion: document.getElementById('portion-size').value,
            calories: parseInt(document.getElementById('calories').value),
            protein: parseFloat(document.getElementById('protein').value),
            carbs: parseFloat(document.getElementById('carbs').value),
            fats: parseFloat(document.getElementById('fats').value),
            date: new Date().toISOString().split('T')[0]
        };

        try {
            const response = await fetch('http://localhost:3000/api/food/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(mealData)
            });

            if (!response.ok) throw new Error('Failed to log meal');

            // Refresh data
            await fetchTodaysMeals();
            await fetchNutritionTotals();
            
            // Reset and hide form
            resetForm();
            foodLoggingForm.classList.add('hidden');
            foodLoggingForm.reset();
            selectedFood = null;

            showNotification('Meal logged successfully!');
        } catch (error) {
            console.error('Error logging meal:', error);
            showNotification('Error logging meal', 'error');
        }
    }

    async function fetchTodaysMeals() {
        try {
            const response = await fetch('http://localhost:3000/api/food/logs', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch meals');

            const data = await response.json();
            meals = data.logs;
            updateMealsDisplay();
        } catch (error) {
            console.error('Error fetching meals:', error);
            showNotification('Error fetching meals', 'error');
        }
    }

    async function fetchNutritionTotals() {
        try {
            const response = await fetch('http://localhost:3000/api/food/nutrition-totals', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch nutrition totals');

            const totals = await response.json();
            updateQuickStats(totals);
        } catch (error) {
            console.error('Error fetching nutrition totals:', error);
        }
    }

    function updateQuickStats(totals) {
        updateQuickStat('calories', totals.calories.current);
        updateQuickStat('protein', totals.protein.current);
        updateQuickStat('carbs', totals.carbs.current);
        updateQuickStat('fats', totals.fats.current);
    }

    function updateMealsDisplay() {
        mealsContainer.innerHTML = meals.map(meal => `
            <div class="meal-card slide-up">
                <div class="meal-header">
                    <span class="meal-time">${meal.meal_time}</span>
                </div>
                <div class="meal-content">
                    <h3>${meal.description}</h3>
                    <div class="meal-details">
                        <span>Portion: ${meal.portion}</span>
                        <span>Calories: ${meal.calories}</span>
                    </div>
                    <div class="nutrient-breakdown">
                        <div class="nutrient">
                            <span class="label">Protein</span>
                            <span class="value">${meal.protein}g</span>
                        </div>
                        <div class="nutrient">
                            <span class="label">Carbs</span>
                            <span class="value">${meal.carbs}g</span>
                        </div>
                        <div class="nutrient">
                            <span class="label">Fats</span>
                            <span class="value">${meal.fats}g</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function updateQuickStat(type, current) {
        const card = document.querySelector(`.stat-card.${type}`);
        const valueElement = card.querySelector('.stat-value');
       
        valueElement.textContent = `${current}${type === 'calories' ? '' : 'g'} `;
       
        
     
    }

    function resetForm() {
        foodLoggingForm.reset();
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type} fade-in`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
});