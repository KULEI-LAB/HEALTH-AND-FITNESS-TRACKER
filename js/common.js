// common.js

// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname;
    
    if (!token && !currentPage.includes('login.html')) {
        window.location.href = 'login.html';
        return false;
    } else if (token && currentPage.includes('login.html')) {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

// Update username across pages
function updateUsername() {
    const usernameElements = document.getElementsByClassName('user-name');
    const username = localStorage.getItem('username');
    
    if (username && usernameElements.length > 0) {
        Array.from(usernameElements).forEach(element => {
            element.textContent = username;
        });
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Logout functionality
function logout() {
    // Clear user session data
    localStorage.removeItem('token'); 
    localStorage.removeItem('username'); 

    // Redirect to login page
    window.location.href = 'login.html'; 
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateUsername();
});

// Add event listener for logout button
const logoutButton = document.getElementById('logout-btn');
if (logoutButton) {
    logoutButton.addEventListener('click', logout);
}

// Add event listener for logout button
const logoutButton2 = document.getElementById('logout-btn');
if (logoutButton2) {
    logoutButton2.addEventListener('click', logout);
}

// Add authentication header to all fetch requests
const originalFetch = window.fetch;
window.fetch = function() {
    const token = localStorage.getItem('token');
    if (token && !arguments[1]?.headers?.['Authorization']) {
        if (!arguments[1]) {
            arguments[1] = {};
        }
        if (!arguments[1].headers) {
            arguments[1].headers = {};
        }
        arguments[1].headers['Authorization'] = `Bearer ${token}`;
    }
    return originalFetch.apply(window, arguments);
};