// Constants
const API_ENDPOINTS = {
    BASE_URL: 'http://localhost:3000/api',
    WATER: {
        LOG: '/water/log',
        LOGS: '/water/logs',
        STATS: '/water/stats',
        DELETE: '/water/log'
    }
};

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return;
    }

    // Get DOM elements
    const waterLoggingForm = document.getElementById('water-logging-form');
    const addWaterBtn = document.getElementById('add-water-btn');
    const cancelWaterBtn = document.getElementById('cancel-water-btn');
    const waterAmount = document.getElementById('water-amount');
    const waterNotes = document.getElementById('water-notes');
    const waterLogsList = document.getElementById('water-logs-list');
    const currentWater = document.getElementById('current-water');
    const waterGoal = document.getElementById('water-goal');
    const waterRemaining = document.getElementById('water-remaining');
    const waterProgressBar = document.getElementById('water-progress-bar');
    const progressText = document.getElementById('progress-text');
    const quickAmountBtns = document.querySelectorAll('.quick-amount');
    const logoutBtn = document.getElementById('logout-btn');

    // Initialize
    try {
        await loadUserProfile();
        await loadWaterLogs();
        await updateWaterStats();
    } catch (error) {
        console.error('Initialization error:', error);
        showNotification('Failed to initialize water logging', true);
    }

    // Event Listeners
    addWaterBtn.addEventListener('click', () => {
        waterLoggingForm.classList.remove('hidden');
        waterAmount.focus();
    });

    cancelWaterBtn.addEventListener('click', () => {
        waterLoggingForm.classList.add('hidden');
        waterLoggingForm.reset();
    });

    // Quick amount buttons
    quickAmountBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            waterAmount.value = btn.dataset.amount;
        });
    });

    // Form submission
    waterLoggingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseInt(waterAmount.value);
        const notes = waterNotes.value;

        try {
            const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WATER.LOG}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ amount, notes })
            });

            if (!response.ok) {
                throw new Error('Failed to log water intake');
            }

            const data = await response.json();
            addWaterLogToUI(data);
            await updateWaterStats();
            waterLoggingForm.reset();
            waterLoggingForm.classList.add('hidden');
            showNotification('Water intake logged successfully!');
        } catch (error) {
            console.error('Error:', error);
            showNotification('Failed to log water intake', true);
        }
    });

    // Delete water log
    waterLogsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-water-log')) {
            const logItem = e.target.closest('.water-log-item');
            const logId = logItem.dataset.id;

            try {
                const response = await fetch(`${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WATER.DELETE}/${logId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to delete water log');
                }

                logItem.remove();
                await updateWaterStats();
                showNotification('Water log deleted successfully!');
            } catch (error) {
                console.error('Error:', error);
                showNotification('Failed to delete water log', true);
            }
        }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // Helper Functions
    async function loadUserProfile() {
        try {
            const response = await fetch(`${API_ENDPOINTS.BASE_URL}/user-profile`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }

            const { user } = await response.json();
            document.querySelector('.user-name').textContent = user.name;
            
           
            
            // Update date
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.querySelector('.date').textContent = new Date().toLocaleDateString('en-US', dateOptions);
        } catch (error) {
            console.error('Error loading user profile:', error);
            showNotification('Failed to load user profile', true);
        }
    }

    async function loadWaterLogs() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(
                `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WATER.LOGS}?date=${today}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch water logs');
            }

            const { logs } = await response.json();
            waterLogsList.innerHTML = '';
            logs.forEach(log => addWaterLogToUI(log));
        } catch (error) {
            console.error('Error:', error);
            showNotification('Failed to load water logs', true);
        }
    }

    function addWaterLogToUI(log) {
        const logItem = document.createElement('div');
        logItem.className = 'water-log-item';
        logItem.dataset.id = log.id;

        const time = new Date(log.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        logItem.innerHTML = `
            <div class="log-time">${time}</div>
            <div class="log-amount">${log.amount}ml</div>
            ${log.notes ? `<div class="log-notes">${log.notes}</div>` : ''}
            <button class="delete-water-log" title="Delete log">🗑️</button>
        `;

        waterLogsList.insertBefore(logItem, waterLogsList.firstChild);
    }

    async function updateWaterStats() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(
                `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.WATER.STATS}?date=${today}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
    
            if (!response.ok) {
                throw new Error('Failed to fetch water stats');
            }
    
            const stats = await response.json();
            
            currentWater.textContent = stats.current;
            waterGoal.textContent = stats.goal;
            waterRemaining.textContent = Math.max(0, stats.goal - stats.current);
    
            const progress = (stats.current / stats.goal) * 100;
            waterProgressBar.style.width = `${Math.min(100, progress)}%`;
            progressText.textContent = `${Math.round(progress)}% of daily goal`;
        } catch (error) {
            console.error('Error:', error);
            showNotification('Failed to update water stats', true);
        }
    }
    

    function showNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.className = `notification ${isError ? 'error' : 'success'}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
});