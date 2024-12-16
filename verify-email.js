document.addEventListener('DOMContentLoaded', () => {
    const resendButton = document.getElementById('resendButton');
    const timerElement = document.getElementById('resendTimer');
    const userEmailElement = document.getElementById('userEmail');
    let countdown = 60;
    
    // Get email from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email') || localStorage.getItem('registrationEmail');
    
    if (email) {
        userEmailElement.textContent = email;
        localStorage.setItem('registrationEmail', email);
    }

    function updateTimer() {
        if (countdown > 0) {
            timerElement.textContent = `Resend available in ${countdown} seconds`;
            countdown--;
            setTimeout(updateTimer, 1000);
        } else {
            timerElement.textContent = '';
            resendButton.disabled = false;
        }
    }

    resendButton.addEventListener('click', async () => {
        try {
            resendButton.disabled = true;
            resendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            // Replace with your actual API endpoint
            const response = await fetch('/api/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                throw new Error('Failed to resend verification email');
            }

            // Show success message
            showMessage('Verification email has been resent!', 'success');
            
            // Reset and start countdown
            countdown = 60;
            updateTimer();

        } catch (error) {
            showMessage('Failed to resend verification email. Please try again.', 'error');
            resendButton.disabled = false;
        } finally {
            resendButton.innerHTML = '<i class="fas fa-redo"></i> Resend Email';
        }
    });

    function showMessage(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
        
        const verifyContent = document.querySelector('.verify-content');
        verifyContent.insertBefore(alertDiv, verifyContent.firstChild);

        setTimeout(() => alertDiv.remove(), 5000);
    }

    // Start initial countdown
    updateTimer();
}); 