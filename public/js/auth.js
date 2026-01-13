class AuthSystem {
    constructor() {
        this.apiBaseUrl = '/api/auth';
        this.init();
    }

    init() {
        this.setupForms();
        this.setupValidation();
        this.setupPasswordToggle();
        this.setupRoleHandler();
        this.setupFileUpload();
    }

    setupForms() {
        document.getElementById('login-form')?.addEventListener('submit', e => this.handleLogin(e));
        document.getElementById('signup-form')?.addEventListener('submit', e => this.handleSignup(e));
    }

    setupPasswordToggle() {
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                const icon = btn.querySelector('.eye-icon');
                input.type = input.type === 'password' ? 'text' : 'password';
                icon.textContent = input.type === 'password' ? '👁️' : '🙈';
            });
        });
    }

    setupValidation() {
        // Email validation
        document.querySelectorAll('input[type="email"]').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input, 'email'));
            input.addEventListener('input', () => this.clearError(input));
        });

        // Login email field specific validation
        const loginEmail = document.getElementById('login-email');
        if (loginEmail) {
            loginEmail.addEventListener('blur', () => this.validateField(loginEmail, 'email'));
            loginEmail.addEventListener('input', () => this.clearError(loginEmail));
        }

        // Mobile validation
        document.querySelectorAll('input[name="mobileNo"]').forEach(input => {
            input.addEventListener('input', () => {
                input.value = input.value.replace(/\D/g, '').slice(0, 10);
                this.validateField(input, 'mobile');
            });
        });

        // Password validation
        document.querySelectorAll('input[name="password"]').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input, 'password'));
            input.addEventListener('input', () => this.clearError(input));
        });

        // Required fields
        document.querySelectorAll('[required]').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input, 'required'));
            input.addEventListener('input', () => this.clearError(input));
        });
    }

    setupRoleHandler() {
        const roleSelect = document.getElementById('signup-role');
        const classGroup = document.getElementById('class-group');
        if (roleSelect && classGroup) {
            roleSelect.addEventListener('change', () => {
                const isStudent = roleSelect.value === 'student';
                classGroup.style.display = isStudent ? 'block' : 'none';
                document.getElementById('signup-class').required = isStudent;
            });
        }
    }

    setupFileUpload() {
        const fileInput = document.getElementById('signup-profileImage');
        const fileLabel = document.querySelector('.file-label');
        if (fileInput && fileLabel) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const validation = this.validateFile(file);
                    if (validation.valid) {
                        fileLabel.querySelector('.upload-text').textContent = file.name;
                        fileLabel.style.borderColor = '#28a745';
                        this.clearError(fileInput);
                    } else {
                        this.showError(fileInput, validation.error);
                        fileLabel.style.borderColor = '#dc3545';
                    }
                }
            });
        }
    }

    validateField(input, type) {
        const value = input.value.trim();
        let isValid = true;
        let errorMsg = '';

        switch (type) {
            case 'email':
                if (!value) errorMsg = 'Email is required';
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errorMsg = 'Invalid email format';
                break;
            case 'mobile':
                if (!value) errorMsg = 'Mobile number is required';
                else if (!/^[0-9]{10}$/.test(value)) errorMsg = 'Must be 10 digits';
                break;
            case 'password':
                if (!value) errorMsg = 'Password is required';
                else if (value.length < 6) errorMsg = 'Min 6 characters';
                else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) errorMsg = 'Need uppercase, lowercase, and number';
                break;
            case 'required':
                if (!value) errorMsg = `${input.previousElementSibling.textContent} is required`;
                break;
        }

        if (errorMsg) {
            this.showError(input, errorMsg);
            isValid = false;
        } else {
            this.showSuccess(input);
        }

        return isValid;
    }

    validateFile(file) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024;
        
        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Invalid file type' };
        }
        if (file.size > maxSize) {
            return { valid: false, error: 'File too large (max 5MB)' };
        }
        return { valid: true };
    }

    showError(input, msg) {
        input.classList.add('error');
        input.classList.remove('success');
        const errorEl = input.parentElement.querySelector('.error-message');
        if (errorEl) errorEl.textContent = msg;
    }

    showSuccess(input) {
        input.classList.add('success');
        input.classList.remove('error');
        const errorEl = input.parentElement.querySelector('.error-message');
        if (errorEl) errorEl.textContent = '';
    }

    clearError(input) {
        input.classList.remove('error', 'success');
        const errorEl = input.parentElement.querySelector('.error-message');
        if (errorEl) errorEl.textContent = '';
    }

    async handleLogin(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        
        if (!this.validateLoginForm(data)) return;
        
        this.showLoading();
        try {
            const res = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            if (res.ok) {
                this.showMessage('Login successful!', 'success');
                localStorage.setItem('token', result.token);
                
                // Check user role and redirect accordingly
                try {
                    const payload = JSON.parse(atob(result.token.split('.')[1]));
                    if (payload.role === 'teacher') {
                        setTimeout(() => window.location.href = '/teacherDashboard.html', 1500);
                    } else {
                        setTimeout(() => window.location.href = '/index.html', 1500);
                    }
                } catch (jwtError) {
                    // Fallback to generic dashboard
                    setTimeout(() => window.location.href = '/index.html', 1500);
                }
            } else {
                this.showMessage(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            this.showMessage('Network error', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        if (!this.validateSignupForm(formData)) return;
        
        this.showLoading();
        try {
            const res = await fetch(`${this.apiBaseUrl}/signup`, {
                method: 'POST',
                body: formData
            });
            
            const result = await res.json();
            
            if (res.ok) {
                this.showMessage(result.message || 'Account created! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
            } else {
                if (result.errors) {
                    result.errors.forEach(err => {
                        const input = document.querySelector(`[name="${err.field}"]`);
                        if (input) this.showError(input, err.message);
                    });
                }
                this.showMessage(result.message || 'Signup failed', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showMessage(`Network error: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    validateLoginForm(data) {
        return this.validateField(document.getElementById('login-email'), 'email') &&
               this.validateField(document.getElementById('login-password'), 'required');
    }

    validateSignupForm(formData) {
        let isValid = true;
        const validations = [
            ['signup-userId', 'required'],
            ['signup-fullName', 'required'],
            ['signup-email', 'email'],
            ['signup-password', 'password'],
            ['signup-role', 'required'],
            ['signup-city', 'required'],
            ['signup-state', 'required'],
            ['signup-country', 'required']
        ];

        validations.forEach(([id, type]) => {
            const input = document.getElementById(id);
            if (input && !this.validateField(input, type)) isValid = false;
        });

        return isValid;
    }

    clearAllErrors() {
        document.querySelectorAll('input, select').forEach(input => this.clearError(input));
        document.querySelector('.file-label .upload-text').textContent = 'Choose Profile Image';
        document.getElementById('signup-profileImage').value = '';
    }

    showLoading() {
        document.getElementById('loading').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loading').classList.remove('active');
    }

    showMessage(text, type = 'info') {
        const container = document.getElementById('message-container');
        const msg = document.createElement('div');
        msg.className = `message ${type}`;
        msg.innerHTML = `${text}<button class="message-close">&times;</button>`;
        container.appendChild(msg);

        setTimeout(() => msg.remove(), 5000);
        msg.querySelector('.message-close').addEventListener('click', () => msg.remove());
    }

    clearMessages() {
        document.getElementById('message-container').innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', () => new AuthSystem());
