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
        document.querySelectorAll('input[name="mobileNumber"]').forEach(input => {
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

        // User ID validation
        const userIdInput = document.getElementById('signup-userId');
        if (userIdInput) {
            userIdInput.addEventListener('blur', () => this.validateField(userIdInput, 'userId'));
            userIdInput.addEventListener('input', () => this.clearError(userIdInput));
        }

        // Name validation
        document.querySelectorAll('input[name="name"]').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input, 'name'));
            input.addEventListener('input', () => this.clearError(input));
        });

        // Select validation
        document.querySelectorAll('select').forEach(select => {
            select.addEventListener('change', () => this.validateField(select, 'required'));
        });

        // Text field validation
        document.querySelectorAll('input[type="text"]:not([name="userId"])').forEach(input => {
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
                if (value && !/^[0-9]{10}$/.test(value)) errorMsg = 'Must be 10 digits';
                break;
            case 'password':
                if (!value) errorMsg = 'Password is required';
                else if (value.length < 6) errorMsg = 'Min 6 characters';
                else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) errorMsg = 'Need uppercase, lowercase, and number';
                break;
            case 'userId':
                if (!value) errorMsg = 'User ID is required';
                else if (value.length < 3) errorMsg = 'User ID must be at least 3 characters';
                else if (!/^[a-zA-Z0-9_]+$/.test(value)) errorMsg = 'Only letters, numbers, and underscore allowed';
                break;
            case 'name':
                if (!value) errorMsg = 'Name is required';
                else if (value.length < 2) errorMsg = 'Name must be at least 2 characters';
                else if (!/^[a-zA-Z\s]+$/.test(value)) errorMsg = 'Only letters and spaces allowed';
                break;
            case 'required':
                if (!value) errorMsg = `${input.previousElementSibling.textContent.replace(':', '')} is required`;
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
        
        // Find error message container
        let errorEl = input.parentElement.querySelector('.error-message');
        if (!errorEl) {
            // If password input, look in the wrapper
            const wrapper = input.closest('.password-input-wrapper');
            if (wrapper) {
                errorEl = wrapper.parentElement.querySelector('.error-message');
            }
        }
        
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
        }
    }

    showSuccess(input) {
        input.classList.add('success');
        input.classList.remove('error');
        
        // Find error message container
        let errorEl = input.parentElement.querySelector('.error-message');
        if (!errorEl) {
            // If password input, look in the wrapper
            const wrapper = input.closest('.password-input-wrapper');
            if (wrapper) {
                errorEl = wrapper.parentElement.querySelector('.error-message');
            }
        }
        
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    clearError(input) {
        input.classList.remove('error', 'success');
        
        // Find error message container
        let errorEl = input.parentElement.querySelector('.error-message');
        if (!errorEl) {
            // If password input, look in the wrapper
            const wrapper = input.closest('.password-input-wrapper');
            if (wrapper) {
                errorEl = wrapper.parentElement.querySelector('.error-message');
            }
        }
        
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        
        // Clear previous errors
        this.clearAllErrors();
        
        // Validate form
        let isValid = true;
        const emailField = document.getElementById('login-email');
        const passwordField = document.getElementById('login-password');
        
        if (!this.validateField(emailField, 'email')) isValid = false;
        if (!this.validateField(passwordField, 'required')) isValid = false;
        
        if (!isValid) return;
        
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
                    } else if (payload.role === 'student') {
                        setTimeout(() => window.location.href = '/studentDashboard.html', 1500);
                    } else {
                        setTimeout(() => window.location.href = '/index.html', 1500);
                    }
                } catch (jwtError) {
                    // Fallback to generic dashboard
                    setTimeout(() => window.location.href = '/index.html', 1500);
                }
            } else {
                // Show specific inline error messages
                if (result.message && result.message.includes('email')) {
                    this.showError(emailField, result.message || 'Invalid email address');
                } else if (result.message && result.message.includes('password')) {
                    this.showError(passwordField, result.message || 'Incorrect password');
                } else {
                    this.showError(emailField, result.message || 'Invalid email or password');
                }
            }
        } catch (error) {
            this.showError(emailField, 'Network error. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Clear previous errors
        this.clearAllErrors();
        
        // Validate form
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
                // Show specific inline error messages
                if (result.errors && Array.isArray(result.errors)) {
                    result.errors.forEach(err => {
                        const input = document.querySelector(`[name="${err.field}"]`);
                        if (input) {
                            this.showError(input, err.message);
                        }
                    });
                } else if (result.message) {
                    // Handle specific error messages
                    const userIdField = document.getElementById('signup-userId');
                    const emailField = document.getElementById('signup-email');
                    
                    if (result.message.includes('User ID') || result.message.includes('userId')) {
                        this.showError(userIdField, result.message);
                    } else if (result.message.includes('email') || result.message.includes('Email')) {
                        this.showError(emailField, result.message);
                    } else {
                        // Show general error on first field
                        this.showError(userIdField, result.message);
                    }
                } else {
                    this.showError(document.getElementById('signup-userId'), 'Signup failed. Please try again.');
                }
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showError(document.getElementById('signup-userId'), `Network error: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    validateLoginForm(data) {
        let isValid = true;
        const emailField = document.getElementById('login-email');
        const passwordField = document.getElementById('login-password');
        
        if (!this.validateField(emailField, 'email')) isValid = false;
        if (!this.validateField(passwordField, 'required')) isValid = false;
        
        return isValid;
    }

    validateSignupForm(formData) {
        let isValid = true;
        const validations = [
            ['signup-userId', 'userId'],
            ['signup-fullName', 'name'],
            ['signup-email', 'email'],
            ['signup-password', 'password'],
            ['signup-timezone', 'required'],
            ['signup-city', 'required'],
            ['signup-state', 'required'],
            ['signup-country', 'required'],
            ['signup-mobileNumber', 'mobile']
        ];

        validations.forEach(([id, type]) => {
            const input = document.getElementById(id);
            if (input && !this.validateField(input, type)) isValid = false;
        });

        return isValid;
    }

    clearAllErrors() {
        document.querySelectorAll('input, select').forEach(input => this.clearError(input));
        const uploadText = document.querySelector('.file-label .upload-text');
        if (uploadText) {
            uploadText.textContent = 'Choose Profile Image';
        }
        const profileImage = document.getElementById('signup-profileImage');
        if (profileImage) {
            profileImage.value = '';
        }
    }

    showLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.add('active');
        }
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.remove('active');
        }
    }

    showMessage(text, type = 'info') {
        const container = document.getElementById('message-container');
        if (!container) return;
        
        const msg = document.createElement('div');
        msg.className = `message ${type}`;
        msg.innerHTML = `${text}<button class="message-close">&times;</button>`;
        container.appendChild(msg);

        setTimeout(() => msg.remove(), 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => new AuthSystem());
