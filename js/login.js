// login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchButtons = document.querySelectorAll('.switch-btn');

    // Clear localStorage when on login page
    localStorage.removeItem('token');
    localStorage.removeItem('username');

    // Form switch functionality
    switchButtons.forEach(button => {
        button.addEventListener('click', () => {
            const formType = button.getAttribute('data-form');
            switchButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            if (formType === 'login') {
                loginForm.classList.add('active');
                registerForm.classList.remove('active');
            } else {
                registerForm.classList.add('active');
                loginForm.classList.remove('active');
            }
        });
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                showNotification('Login successful!', 'success');
                window.location.href = 'dashboard.html';
            } else {
                showNotification(data.message || 'Login failed', 'error');
            }
        } catch (error) {
            showNotification('Server error occurred', 'error');
        }
    });

    // Registration form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const userData = {
            name: document.getElementById('register-name').value,
            email: document.getElementById('register-email').value,
            password: document.getElementById('register-password').value,
            age: document.getElementById('register-age').value,
            gender: document.getElementById('register-gender').value,
            weight: document.getElementById('register-weight').value,
            height: document.getElementById('register-height').value
        };

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (response.ok) {
                showNotification('Registration successful! Please login.', 'success');
                // Switch to login form
                document.querySelector('[data-form="login"]').click();
            } else {
                showNotification(data.message || 'Registration failed', 'error');
            }
        } catch (error) {
            showNotification('Server error occurred', 'error');
        }
    });
});