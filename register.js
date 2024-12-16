document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerButton = document.getElementById('registerButton');
    const passwordInput = document.getElementById('password');
    const strengthBar = document.querySelector('.strength-bar');

    if (!registerForm || !registerButton || !passwordInput || !strengthBar) {
        console.error('Required elements not found');
        return;
    }

    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = passwordInput.value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        try {
            registerButton.disabled = true;
            registerButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName,
                    email,
                    password
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Registration failed');
            }

            const data = await response.json();

            showSuccess('Registration successful! Please check your email to verify your account.');
            
            // Update progress steps
            document.querySelector('.progress-step.active').classList.add('completed');
            document.querySelector('.progress-step.active').classList.remove('current');
            document.querySelectorAll('.progress-step')[1].classList.add('active', 'current');
            
            // Redirect to verification pending page
            setTimeout(() => {
                window.location.href = '/verify-email.html?email=' + encodeURIComponent(email);
            }, 2000);

        } catch (error) {
            if (error.message === 'Failed to fetch') {
                showError('Unable to connect to the server. Please try again later.');
            } else {
                showError(error.message);
            }
        } finally {
            registerButton.disabled = false;
            registerButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    });

    // Password strength checker
    passwordInput.addEventListener('input', () => {
        const { score, patterns } = checkPasswordStrength(passwordInput.value);
        strengthBar.className = 'strength-bar';
        
        if (score === 0) {
            strengthBar.style.width = '0';
        } else if (score <= 2) {
            strengthBar.classList.add('strength-weak');
        } else if (score === 3) {
            strengthBar.classList.add('strength-medium');
        } else {
            strengthBar.classList.add('strength-strong');
        }

        // Update validation message
        const hint = document.querySelector('#password + small.form-hint');
        if (hint) {
            if (!patterns.length) {
                hint.textContent = 'Password must be at least 8 characters long';
            } else if (!patterns.lowercase || !patterns.uppercase) {
                hint.textContent = 'Add both uppercase and lowercase letters';
            } else if (!patterns.numbers) {
                hint.textContent = 'Add at least one number';
            } else if (!patterns.special) {
                hint.textContent = 'Add at least one special character';
            } else {
                hint.textContent = 'Strong password!';
            }
        }
    });
});

// Helper functions for showing messages
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    showMessage(errorDiv);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    showMessage(successDiv);
}

function showMessage(element) {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Insert the new alert before the form
    const form = document.getElementById('registerForm');
    form.parentNode.insertBefore(element, form);

    // Remove the alert after 5 seconds
    setTimeout(() => {
        element.remove();
    }, 5000);
} 