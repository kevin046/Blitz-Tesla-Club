// Add this to handle back button navigation
window.onpopstate = function(event) {
    if (document.referrer.includes('register.html')) {
        window.location.href = 'register.html';
    }
};

// Update your Join Us button click handler
document.querySelector('.join-us-btn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.replace('register.html');
}); 

// Add comprehensive error handling
async function loginWithErrorHandling(email, password) {
    try {
        // Check inputs
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Attempt login
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        // Handle Supabase error
        if (error) {
            switch (error.status) {
                case 400:
                    throw new Error('Invalid email or password');
                case 422:
                    throw new Error('Email format is invalid');
                case 429:
                    throw new Error('Too many login attempts');
                default:
                    throw new Error(error.message);
            }
        }

        return data;

    } catch (err) {
        console.error('Login Error:', err);
        throw err;
    }
} 