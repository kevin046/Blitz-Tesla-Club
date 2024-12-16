document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerButton = document.getElementById('registerButton');
    const passwordInput = document.getElementById('password');
    const strengthBar = document.querySelector('.strength-bar');
    let currentStep = 1;

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

    // Password strength checker
    function checkPasswordStrength(password) {
        let strength = 0;
        const patterns = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        strength += patterns.length ? 1 : 0;
        strength += (patterns.lowercase && patterns.uppercase) ? 1 : 0;
        strength += patterns.numbers ? 1 : 0;
        strength += patterns.special ? 1 : 0;

        return {
            score: strength,
            patterns
        };
    }

    // Update password strength meter
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
    });

    // Real-time validation
    const inputs = registerForm.querySelectorAll('input[required]');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            validateInput(input);
        });

        input.addEventListener('blur', () => {
            validateInput(input);
        });
    });

    function validateInput(input) {
        const formGroup = input.closest('.form-group');
        
        if (input.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value.trim())) {
                formGroup.classList.remove('valid');
                return false;
            }
        } else if (input.id === 'password') {
            const { score } = checkPasswordStrength(input.value);
            if (score < 3) {
                formGroup.classList.remove('valid');
                return false;
            }
        } else if (input.id === 'confirmPassword') {
            if (input.value !== passwordInput.value) {
                formGroup.classList.remove('valid');
                return false;
            }
        } else if (input.value.trim() === '') {
            formGroup.classList.remove('valid');
            return false;
        }

        formGroup.classList.add('valid');
        return true;
    }

    // Form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get form values
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;

        // Validate all inputs
        let isValid = true;
        inputs.forEach(input => {
            if (!validateInput(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            showError('Please check all fields are filled correctly');
            return;
        }

        if (!terms) {
            showError('Please accept the Terms of Service and Privacy Policy');
            return;
        }

        try {
            registerButton.disabled = true;
            registerButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

            const response = await fetch('/api/register', {
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

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            showSuccess(data.message);
            
            // Redirect to verification pending page
            setTimeout(() => {
                window.location.href = '/verification-pending.html';
            }, 2000);

        } catch (error) {
            showError(error.message);
        } finally {
            registerButton.disabled = false;
            registerButton.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    });

    function updateProgressStep(step) {
        const steps = document.querySelectorAll('.progress-step');
        steps.forEach((stepElement, index) => {
            if (index + 1 < step) {
                stepElement.classList.add('completed');
            }
            if (index + 1 === step) {
                stepElement.classList.add('active');
            } else {
                stepElement.classList.remove('active');
            }
        });
        currentStep = step;
    }
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