// Replace analytics.js content

document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    setupEventListeners();
    loadAnalytics('week'); // Load initial data
});

let calorieChart, macroChart, activityChart;

function initializeCharts() {
    initializeCalorieChart([]);
    initializeMacroChart([]);
    initializeActivityChart([]);
}

function initializeCalorieChart(data) {
    const ctx = document.getElementById('calorieChart').getContext('2d');
    calorieChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date) || [],
            datasets: [
                {
                    label: 'Calories Consumed',
                    data: data.map(d => d.calories_consumed) || [],
                    borderColor: '#6366f1',
                    tension: 0.4
                },
                {
                    label: 'Calorie Goal',
                    data: data.map(d => d.calorie_goal) || [],
                    borderColor: '#9ca3af',
                    borderDash: [5, 5],
                    tension: 0.4
                },
                {
                    label: 'Calories Burned',
                    data: data.map(d => d.calories_burned) || [],
                    borderColor: '#f59e0b',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Calories'
                    }
                }
            }
        }
    });
}

function initializeMacroChart(data) {
    const ctx = document.getElementById('macroChart').getContext('2d');
    macroChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.date) || [],
            datasets: [
                {
                    label: 'Protein (g)',
                    data: data.map(d => d.total_protein) || [],
                    backgroundColor: '#6366f1'
                },
                {
                    label: 'Carbs (g)',
                    data: data.map(d => d.total_carbs) || [],
                    backgroundColor: '#f59e0b'
                },
                {
                    label: 'Fats (g)',
                    data: data.map(d => d.total_fats) || [],
                    backgroundColor: '#22c55e'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true
                },
                x: {
                    stacked: true
                }
            }
        }
    });
}

function initializeActivityChart(data) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.date) || [],
            datasets: [{
                label: 'Duration (minutes)',
                data: data.map(d => d.total_duration) || [],
                backgroundColor: '#6366f1',
                yAxisID: 'y'
            }, {
                label: 'Calories Burned',
                data: data.map(d => d.total_calories_burned) || [],
                backgroundColor: '#f59e0b',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Duration (minutes)'
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Calories Burned'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function setupEventListeners() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            loadAnalytics(button.dataset.range);
        });
    });

    document.getElementById('calorieMetric').addEventListener('change', (e) => {
        loadAnalytics(getActiveTimeRange(), e.target.value);
    });
}

function getActiveTimeRange() {
    return document.querySelector('.filter-btn.active').dataset.range;
}

function getDateRange(range) {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
        case 'week':
            start.setDate(end.getDate() - 7);
            break;
        case 'month':
            start.setMonth(end.getMonth() - 1);
            break;
        case 'year':
            start.setFullYear(end.getFullYear() - 1);
            break;
    }
    
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
    };
}

async function loadAnalytics(timeRange, metric = 'daily') {
    const { startDate, endDate } = getDateRange(timeRange);
    const token = localStorage.getItem('token');

    try {
        // Fetch all analytics data in parallel
        const [calorieData, macroData, activityData, progressData] = await Promise.all([
            fetch(`http://localhost:3000/api/analytics/calories?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()),
            fetch(`http://localhost:3000/api/analytics/macros?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()),
            fetch(`http://localhost:3000/api/analytics/activities?startDate=${startDate}&endDate=${endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()),
            fetch(`http://localhost:3000/api/analytics/progress-summary?currentStartDate=${startDate}&currentEndDate=${endDate}&previousStartDate=${getPreviousDateRange(startDate, endDate).startDate}&previousEndDate=${getPreviousDateRange(startDate, endDate).endDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json())
        ]);

        // Update all charts with new data
        updateCalorieChart(calorieData, metric);
        updateMacroChart(macroData);
        updateActivityChart(activityData);
        updateProgressSummary(progressData);
    } catch (error) {
        console.error('Error loading analytics:', error);
        showError('Failed to load analytics data');
    }
}

function getPreviousDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = end.getTime() - start.getTime();
    
    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    
    const previousStart = new Date(previousEnd);
    previousStart.setTime(previousEnd.getTime() - duration);
    
    return {
        startDate: previousStart.toISOString().split('T')[0],
        endDate: previousEnd.toISOString().split('T')[0]
    };
}

function updateCalorieChart(data, metric) {
    let chartData = data;
    
    if (metric === 'weekly') {
        chartData = aggregateDataByWeek(data);
    }
    
    calorieChart.data.labels = chartData.map(d => d.date);
    calorieChart.data.datasets[0].data = chartData.map(d => d.calories_consumed);
    calorieChart.data.datasets[1].data = chartData.map(d => d.calorie_goal);
    calorieChart.data.datasets[2].data = chartData.map(d => d.calories_burned);
    calorieChart.update();
}

function updateMacroChart(data) {
    macroChart.data.labels = data.map(d => d.date);
    macroChart.data.datasets[0].data = data.map(d => d.total_protein);
    macroChart.data.datasets[1].data = data.map(d => d.total_carbs);
    macroChart.data.datasets[2].data = data.map(d => d.total_fats);
    macroChart.update();
}

function updateActivityChart(data) {
    activityChart.data.labels = data.map(d => d.date);
    activityChart.data.datasets[0].data = data.map(d => d.total_duration);
    activityChart.data.datasets[1].data = data.map(d => d.total_calories_burned);
    activityChart.update();
}

function updateProgressSummary(data) {
    // Update average daily calories
    const caloriesCard = document.querySelector('.summary-card:nth-child(1)');
    caloriesCard.querySelector('.summary-value').textContent = Math.round(data.calories.current).toLocaleString();
    updateTrendIndicator(caloriesCard, data.calories.trend);

    // Update activity duration
    const activityCard = document.querySelector('.summary-card:nth-child(2)');
    activityCard.querySelector('.summary-value').textContent = `${Math.round(data.activity.current)} mins`;
    updateTrendIndicator(activityCard, data.activity.trend);

    // Update goal completion
    const goalCard = document.querySelector('.summary-card:nth-child(3)');
    goalCard.querySelector('.summary-value').textContent = `${Math.round(data.goals.current)}%`;
    updateTrendIndicator(goalCard, data.goals.trend);
}

function updateTrendIndicator(card, trend) {
    const trendElement = card.querySelector('.trend');
    const isPositive = trend >= 0;
    trendElement.className = `trend ${isPositive ? 'positive' : 'negative'}`;
    trendElement.textContent = `${isPositive ? '↑' : '↓'} ${Math.abs(Math.round(trend))}% vs last period`;
}

function aggregateDataByWeek(data) {
    const weeks = {};
    
    data.forEach(day => {
        const date = new Date(day.date);
        const week = getWeekNumber(date);
        
        if (!weeks[week]) {
            weeks[week] = {
                date: `Week of ${day.date}`,
                calories_consumed: 0,
                calorie_goal: 0,
                calories_burned: 0,
                count: 0
            };
        }
        
        weeks[week].calories_consumed += day.calories_consumed;
        weeks[week].calorie_goal += day.calorie_goal;
        weeks[week].calories_burned += day.calories_burned;
        weeks[week].count++;
    });
    
    return Object.values(weeks).map(week => ({
        date: week.date,
        calories_consumed: Math.round(week.calories_consumed / week.count),
        calorie_goal: Math.round(week.calorie_goal / week.count),
        calories_burned: Math.round(week.calories_burned / week.count)
    }));
}

function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
}

function showError(message) {
    // You can implement your own error display mechanism here
    alert(message);
}