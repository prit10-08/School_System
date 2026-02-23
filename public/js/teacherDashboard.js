class TeacherDashboard {
    constructor() {
        this.apiBaseUrl = '/api';
        this.token = localStorage.getItem('token');
        this.teacher = null;
        this.currentStudents = [];
        this.quizExpiryInterval = null;
        this.statusCheckInterval = null;
        this.quizStartTime = null;
        this.quizEndTime = null;
        this.init();
    }

    // Helper function to format duration
    formatDuration(minutes) {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            if (remainingMinutes === 0) {
                return `${hours} Hour${hours > 1 ? 's' : ''}`;
            } else {
                return `${hours} Hour${hours > 1 ? 's' : ''} ${remainingMinutes} min`;
            }
        } else {
            return `${minutes} min`;
        }
    }

    // Helper function to format session date
    formatSessionDate(dateString) {
        if (!dateString) return 'Scheduled';

        try {
            // Handle DD-MM-YYYY format from backend
            let date;
            if (dateString.includes('-') && dateString.split('-').length === 3) {
                const parts = dateString.split('-');
                if (parts[2].length === 4) {
                    // DD-MM-YYYY format
                    date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else {
                    // Try standard format
                    date = new Date(dateString);
                }
            } else {
                date = new Date(dateString);
            }

            const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        } catch (error) {
            console.error('Date formatting error:', error, 'Input:', dateString);
            return dateString;
        }
    }

    init() {
        if (!this.token) {
            window.location.href = '/index.html';
            return;
        }

        // Wait for components to be loaded before setting up event listeners
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.waitForComponentsAndInit();
            });
        } else {
            this.waitForComponentsAndInit();
        }
    }

    waitForComponentsAndInit() {
        // Check if components are already loaded
        if (document.querySelector('.nav-item') && document.querySelector('.profile-dropdown')) {
            // Initialize button states - hide Edit button by default
            const updateDraftBtn = document.getElementById('updateDraftBtn');
            if (updateDraftBtn) updateDraftBtn.style.display = 'none';
            
            this.setupEventListeners();
            this.loadTeacherProfile();
            this.loadDashboardData();
        } else {
            // Wait for components to load
            document.addEventListener('componentsLoaded', () => {
                // Initialize button states - hide Edit button by default
                const updateDraftBtn = document.getElementById('updateDraftBtn');
                if (updateDraftBtn) updateDraftBtn.style.display = 'none';
                
                this.setupEventListeners();
                this.loadTeacherProfile();
                this.loadDashboardData();
            });
        }
    }

    setupEventListeners() {
        this.setupQuizCsvHandlers();

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.switchPage(page);
                }
            });
        });

        // Profile dropdown
        const profileDropdown = document.querySelector('.profile-dropdown');
        const dropdownToggle = profileDropdown?.querySelector('.dropdown-toggle');
        const dropdownMenu = profileDropdown?.querySelector('.dropdown-menu');

        dropdownToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdownMenu?.classList.remove('show');
        });

        // Profile dropdown menu items
        document.querySelector('[data-page="profile"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchPage('profile');
        });

        // Edit Profile button
        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            this.showEditProfileModal();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Holiday functionality
        document.getElementById('addHolidayBtn')?.addEventListener('click', () => {
            this.showAddHolidayModal();
        });

        // Single-Day Holiday checkbox toggle
        document.getElementById('singleDayHolidayCheckbox')?.addEventListener('change', () => {
            this.handleSingleDayHolidayToggle();
        });

        // Back button should close the holiday modal completely
        document.getElementById("singleHolidayBackBtn")?.addEventListener("click", () => {
            this.hideHolidayModal();
        });

        document.getElementById('setHolidaysForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSetHolidaySubmit();
        });

        document.getElementById('singleDayHolidayForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSingleDayHoliday();
        });

        // Holiday filter functionality
        document.getElementById('holidayFilter')?.addEventListener('change', (e) => {
            this.filterHolidays(e.target.value);
        });

        // Sessions filter functionality
        document.getElementById('sessionTypeFilter')?.addEventListener('change', (e) => {
            this.filterSessions(e.target.value);
        });

        // Sessions functionality
        document.getElementById('addSessionBtn')?.addEventListener('click', () => {
            this.showSessionModal();
        });

        document.getElementById('sessionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createSession(e);
        });

        // Session date change listener for holiday validation
        document.getElementById('sessionDate')?.addEventListener('change', (e) => {
            this.validateSessionDateForHoliday(e.target.value);
        });

        // Pagination controls
        document.getElementById('prevPageBtn')?.addEventListener('click', () => {
            const currentPage = parseInt(document.getElementById('currentPage').textContent);
            if (currentPage > 1) {
                this.loadSessions(currentPage - 1);
            }
        });

        document.getElementById('nextPageBtn')?.addEventListener('click', () => {
            const currentPage = parseInt(document.getElementById('currentPage').textContent);
            this.loadSessions(currentPage + 1);
        });

        // Modal controls
        this.setupModalControls();

        // Session modal close button
        document.querySelector('#sessionModal .close-modal')?.addEventListener('click', () => {
            this.hideSessionModal();
        });

        // Form submissions
        this.setupFormHandlers();

        // Cleanup monitoring on page unload
        window.addEventListener('beforeunload', () => {
            this.stopTeacherQuizMonitoring();
            this.stopGlobalTeacherMonitoring();
        });
    }

    setupModalControls() {
        // Add Student Modal
        document.getElementById('addStudentBtn')?.addEventListener('click', () => {
            // ✅ Always clear old values when opening Add Student modal
            const form = document.getElementById("addStudentForm");
            if (form) {
                form.reset();
                this.clearFormValidation(form);
            }

            this.showModal('addStudentModal');
        });

        document.getElementById('closeStudentModal')?.addEventListener('click', () => {
            this.hideModal('addStudentModal');
        });

        document.getElementById('cancelBtn')?.addEventListener('click', () => {
            this.hideModal('addStudentModal');
        });

        // Add real-time validation for student form fields
        const studentForm = document.getElementById('addStudentForm');
        if (studentForm) {
            studentForm.querySelectorAll('input, select').forEach(field => {
                field.addEventListener('input', () => {
                    this.clearFieldValidation(field);
                });
                field.addEventListener('change', () => {
                    this.clearFieldValidation(field);
                });
            });
        }

        // Upload CSV Modal
        document.getElementById('uploadCsvBtn')?.addEventListener('click', () => {
            this.showModal('uploadCsvModal');
        });

        document.getElementById('closeCsvModal')?.addEventListener('click', () => {
            this.hideModal('uploadCsvModal');
            // Clear error message when modal is closed
            const errorElement = document.getElementById('csvFileError');
            if (errorElement) {
                errorElement.textContent = '';
            }
        });

        // Clear error message when file is selected
        const csvFileInput = document.querySelector('input[name="csv"]');
        if (csvFileInput) {
            csvFileInput.addEventListener('change', () => {
                const errorElement = document.getElementById('csvFileError');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            });
        }

        // Create Quiz Form Toggle
        document.getElementById('createQuizBtn')?.addEventListener('click', () => {
            console.log('Create Quiz button clicked!');

            // Reset form state for new quiz
            const form = document.getElementById('createQuizForm');
            if (form) {
                form.reset();
                this.clearFormValidation(form);
                document.getElementById('quizId').value = '';

                // Reset header and button text
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Quiz';

                const headerText = document.querySelector('#quizFormHeader h2');
                if (headerText) headerText.innerHTML = '<i class="fas fa-plus-circle"></i> Create New Quiz';

                // Reset questions container
                const container = document.getElementById('questionsContainer');
                if (container) {
                    container.innerHTML = '';
                    this.addQuizQuestion();
                }

                // Ensure bottom action buttons are visible for new creations
                const saveDraftBtn = document.getElementById('saveDraftBtn');
                const updateDraftBtn = document.getElementById('updateDraftBtn');
                const publishBtn = document.getElementById('publishQuizBtn');
                
                // Hide Edit/Update button for new quiz creation - only show creation actions
                if (saveDraftBtn) saveDraftBtn.style.display = 'inline-block';
                if (updateDraftBtn) updateDraftBtn.style.display = 'none';
                if (publishBtn) publishBtn.style.display = 'inline-block';
            }

            const quizMainCard = document.querySelector('.quiz-main-card');

            if (quizMainCard) {
                quizMainCard.style.display = 'none';
            }

            const quizMainHeader = document.getElementById('quizMainPageHeader');
            if (quizMainHeader) {
                quizMainHeader.style.display = 'none';
            }

            document.getElementById('quizFormHeader').style.display = 'flex';
            document.getElementById('quizCreationForm').style.display = 'block';

            // Set minimum date for inputs
            this.setMinDateForQuizInputs();
        });

        // Save to Draft button
        document.getElementById('saveDraftBtn')?.addEventListener('click', () => {
            this.saveDraft();
        });
        // Update button (used when editing published or draft; preserves original status)
        document.getElementById('updateDraftBtn')?.addEventListener('click', () => {
            const form = document.getElementById('createQuizForm');
            if (form) this.createQuiz(form);
        });

        // Back to Quiz List button
        document.getElementById('backToQuizListBtn')?.addEventListener('click', () => {
            const quizMainCard = document.querySelector('.quiz-main-card');
            if (quizMainCard) quizMainCard.style.display = 'flex';

            const quizMainHeader = document.getElementById('quizMainPageHeader');
            if (quizMainHeader) quizMainHeader.style.display = 'flex';

            document.getElementById('quizFormHeader').style.display = 'none';
            document.getElementById('quizCreationForm').style.display = 'none';

            const form = document.getElementById('createQuizForm');
            if (form) {
                form.reset();
                document.getElementById('quizId').value = '';
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Quiz';

                const headerText = document.querySelector('#quizFormHeader h2');
                if (headerText) headerText.innerHTML = '<i class="fas fa-plus-circle"></i> Create New Quiz';

                const container = document.getElementById('questionsContainer');
                if (container) {
                    container.innerHTML = '';
                    this.addQuizQuestion();
                }
                
                // Reset button states to default (creation mode)
                const saveDraftBtn = document.getElementById('saveDraftBtn');
                const updateDraftBtn = document.getElementById('updateDraftBtn');
                const publishBtn = document.getElementById('publishQuizBtn');
                
                if (saveDraftBtn) saveDraftBtn.style.display = 'inline-block';
                if (updateDraftBtn) updateDraftBtn.style.display = 'none';
                if (publishBtn) publishBtn.style.display = 'inline-block';
            }
        });

        // Cancel Quiz Form
        document.getElementById('cancelQuizBtn')?.addEventListener('click', () => {
            const quizMainCard = document.querySelector('.quiz-main-card');
            if (quizMainCard) quizMainCard.style.display = 'flex';

            const quizMainHeader = document.getElementById('quizMainPageHeader');
            if (quizMainHeader) quizMainHeader.style.display = 'flex';

            document.getElementById('quizFormHeader').style.display = 'none';
            document.getElementById('quizCreationForm').style.display = 'none';

            const form = document.getElementById('createQuizForm');
            if (form) {
                form.reset();
                document.getElementById('quizId').value = '';
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Quiz';

                const headerText = document.querySelector('#quizFormHeader h2');
                if (headerText) headerText.innerHTML = '<i class="fas fa-plus-circle"></i> Create New Quiz';

                const container = document.getElementById('questionsContainer');
                if (container) {
                    container.innerHTML = '';
                    this.addQuizQuestion();
                }
                
                // Reset button states to default (creation mode)
                const saveDraftBtn = document.getElementById('saveDraftBtn');
                const updateDraftBtn = document.getElementById('updateDraftBtn');
                const publishBtn = document.getElementById('publishQuizBtn');
                
                if (saveDraftBtn) saveDraftBtn.style.display = 'inline-block';
                if (updateDraftBtn) updateDraftBtn.style.display = 'none';
                if (publishBtn) publishBtn.style.display = 'inline-block';
            }
        });

        // Edit Profile Modal
        document.getElementById('closeEditProfileModal')?.addEventListener('click', () => {
            this.hideModal('editProfileModal');
        });

        // Edit Profile Form
        document.getElementById('editProfileForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile(e.target);
        });

        // Assign Slot Modal
        document.getElementById('confirmAssignSlot')?.addEventListener('click', () => {
            this.assignSlot();
        });

        document.getElementById('cancelAssignSlot')?.addEventListener('click', () => {
            this.hideModal('assignSlotModal');
        });

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Publish Quiz button
        document.getElementById('publishQuizBtn')?.addEventListener('click', () => {
            const form = document.getElementById('createQuizForm');
            if (!form) return;
            
            // First validate the form
            if (!this.validateQuizForm(form)) {
                // Validation failed - errors are shown inline
                return;
            }
            
            // Validation passed - show preview
            const quizId = document.getElementById('quizId')?.value;
            if (quizId) {
                this.showQuizPreviewBeforePublish();
            } else {
                const formData = this.getQuizFormData('published');
                if (!formData) return;
                // For new quizzes, use publish mode, not create mode
                this.renderQuizPreview(formData, 'publish', null);
            }
        });

        document.getElementById('closePublishQuizModal')?.addEventListener('click', () => {
            this.hideModal('publishQuizModal');
        });

        document.getElementById('cancelPublishQuiz')?.addEventListener('click', () => {
            this.hideModal('publishQuizModal');
        });

        document.getElementById('confirmPublishQuiz')?.addEventListener('click', () => {
            this.publishQuiz();
        });
    }

    async publishQuiz() {
        const form = document.getElementById('createQuizForm');
        const quizId = document.getElementById('quizId').value;

        if (!quizId) {
            this.showMessage('No quiz selected to publish', 'error');
            this.hideModal('publishQuizModal');
            return;
        }

        try {
            this.showLoading();
            this.hideModal('publishQuizModal');

            const response = await this.apiCall(`/quizzes/${quizId}`, 'PUT', {
                status: 'published'
            });

            if (response.success) {
                this.showMessage('Quiz published successfully.', 'success');

                // Refresh quizzes and return to list
                await this.refreshQuizzes();

                // Hide form and show list
                const quizMainCard = document.querySelector('.quiz-main-card');
                if (quizMainCard) quizMainCard.style.display = 'flex';

                const quizMainHeader = document.getElementById('quizMainPageHeader');
                if (quizMainHeader) quizMainHeader.style.display = 'flex';

                document.getElementById('quizFormHeader').style.display = 'none';
                document.getElementById('quizCreationForm').style.display = 'none';

                // Reset form
                form.reset();
                document.getElementById('quizId').value = '';

            } else {
                this.showMessage(response.message || 'Failed to publish quiz', 'error');
            }
        } catch (error) {
            console.error('Error publishing quiz:', error);
            this.showMessage('Error publishing quiz', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Show Quiz Preview before publishing draft quiz
    async showQuizPreviewBeforePublish() {
        const form = document.getElementById('createQuizForm');
        const quizId = document.getElementById('quizId').value;

        if (!quizId) {
            this.showMessage('No quiz selected to preview', 'error');
            return;
        }

        try {
            this.showLoading();

            // Get current form values for start/end times
            const formStartTime = document.getElementById('quizStartTime').value;
            const formEndTime = document.getElementById('quizEndTime').value;
            const formDuration = document.getElementById('quizDuration').value;
            const formTitle = document.getElementById('quizTitle').value;
            const formSubject = document.getElementById('quizSubject').value;
            const formClass = document.getElementById('quizClass').value;

            // Get current quiz data from database for questions and other fields
            const response = await this.apiCall(`/quizzes/${quizId}`, 'GET');
            
            if (response.success && response.data) {
                const quiz = response.data;
                
                // Prepare quiz data for preview - use form values for times, database for questions
                const quizData = {
                    title: formTitle || quiz.title,
                    subject: formSubject || quiz.subject,
                    class: formClass || quiz.class,
                    questions: quiz.questions,
                    startTime: formStartTime ? new Date(formStartTime) : quiz.startTime,
                    endTime: formEndTime ? new Date(formEndTime) : quiz.endTime,
                    duration: formDuration || quiz.duration,
                    totalMarks: quiz.totalMarks
                };

                // Show preview modal with publish-specific buttons
                this.showQuizConfirmationDialog(quizData, quizId);
            } else {
                this.showMessage('Failed to load quiz data', 'error');
            }
    } catch (error) {
        console.error('Error loading quiz for preview:', error);
        this.showMessage('Error loading quiz data', 'error');
    } finally {
        this.hideLoading();
    }
}

// Show Quiz Confirmation Dialog specifically for publishing draft quizzes
showQuizConfirmationDialog(quizData, quizId) {
    this.renderQuizPreview(quizData, 'publish', quizId);
}

// Helper function to escape HTML
escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Confirm publish after preview
async confirmPublishFromPreview() {
    if (!this.currentQuizData) {
        this.showMessage('No quiz data available', 'error');
        return;
    }

    const { quizData, quizId } = this.currentQuizData;

    try {
        this.showLoading();
        this.hideModal('quizPreviewModal');

        let response;
        if (quizId) {
            // Publishing existing draft quiz - update all fields including status
            response = await this.apiCall(`/quizzes/${quizId}`, 'PUT', {
                ...quizData,
                status: 'published'
            });
        } else {
            // Creating new quiz
            response = await this.apiCall('/quizzes', 'POST', {
                ...quizData,
                status: 'published'
            });
        }

        if (response.success) {
            this.showMessage(quizId ? 'Quiz published successfully.' : 'Quiz created successfully.', 'success');

            // Refresh quizzes and return to list
            await this.refreshQuizzes();

            // Hide form and show list
            const quizMainCard = document.querySelector('.quiz-main-card');
            if (quizMainCard) quizMainCard.style.display = 'flex';

            const quizMainHeader = document.getElementById('quizMainPageHeader');
            if (quizMainHeader) quizMainHeader.style.display = 'flex';

            document.getElementById('quizFormHeader').style.display = 'none';
            document.getElementById('quizCreationForm').style.display = 'none';

            // Reset form
            const form = document.getElementById('createQuizForm');
            if (form) {
                form.reset();
                document.getElementById('quizId').value = '';
            }

            // Clear current data
            this.currentQuizData = null;

        } else {
            this.showMessage(response.message || (quizId ? 'Failed to publish quiz' : 'Failed to create quiz'), 'error');
        }
    } catch (error) {
        console.error('Error publishing/creating quiz:', error);
        this.showMessage('Error processing quiz', 'error');
    } finally {
        this.hideLoading();
    }
}

    setupFormHandlers() {
        // Add Student Form
        document.getElementById('addStudentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.validateStudentForm(e.target)) {
                this.addStudent(e.target);
            }
        });

        // Setup Profile Image Upload
        this.setupProfileImageUpload();

        // Upload CSV Form
        document.getElementById('uploadCsvForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadCsv(e.target);
        });

        // Create Quiz Form
        document.getElementById('createQuizForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createQuiz(e.target);
        });

        // Add Question Button
        document.getElementById('addQuestionBtn')?.addEventListener('click', () => {
            this.addQuizQuestion();
        });

        // Availability Forms
        document.getElementById('saveAvailabilityBtn')?.addEventListener('click', () => {
            this.saveInlineEditedAvailability();
        });

        // Marks Form
        document.getElementById('marksForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMarks(e.target);
        });

        // Setup Validation Listeners
        this.setupValidationListeners();
    }

    setupValidationListeners() {
        const form = document.getElementById('createQuizForm');
        if (!form) return;

        form.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                this.clearFieldValidation(e.target);
            }
        });

        form.addEventListener('change', (e) => {
            if (e.target.tagName === 'SELECT' || e.target.type === 'datetime-local' || e.target.type === 'checkbox') {
                this.clearFieldValidation(e.target);
            }
        });
    }

    async loadTeacherProfile() {
        try {
            const response = await this.apiCall('/auth/profile', 'GET');
            if (response.success) {
                this.teacher = response.data;
                this.updateProfileDisplay();
            } else {
                this.showMessage('Failed to load profile', 'error');
                if (response.message === 'Invalid token') {
                    this.logout();
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showMessage('Error loading profile', 'error');
        }
    }

    updateProfileDisplay() {
        if (!this.teacher) return;

        // Update header profile
        const headerProfileImage = document.getElementById('headerProfileImage');
        const headerTeacherName = document.getElementById('headerTeacherName');

        if (headerProfileImage) {
            headerProfileImage.src = this.teacher.profileImage || '/images/default-avatar.png';
        }
        if (headerTeacherName) {
            headerTeacherName.textContent = this.teacher.name;
        }

        // Update profile page
        document.getElementById('profileAvatar').src = this.teacher.profileImage || '/images/default-avatar.png';
        document.getElementById('profileName').textContent = this.teacher.name;
        document.getElementById('profileEmail').textContent = this.teacher.email;
        document.getElementById('profileUserId').textContent = this.teacher.userId;
        document.getElementById('profileTimezone').textContent = this.teacher.timezone;
        document.getElementById('profileMobile').textContent = this.teacher.mobileNumber || 'Not provided';
        document.getElementById('profileCity').textContent = this.teacher.city || 'Not provided';
        document.getElementById('profileState').textContent = this.teacher.state || 'Not provided';
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadStudents(),
            this.loadQuizzes(),
            this.loadSessions(),
            this.loadAvailability(),
            this.loadHolidays(),
            this.loadStats()
        ]);
        
        // Start real-time quiz expiry monitoring
        this.startQuizExpiryMonitoring();
    }

    async loadStudents() {
        try {
            const response = await this.apiCall('/teachers/students', 'GET');
            if (response.success) {
                this.currentStudents = response.data;
                this.displayStudents(response.data);
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
    }

    async refreshQuizzes() {
        // This method can be called when quiz data actually changes (create, edit, delete)
        await this.loadQuizzes();
        await this.loadStats();
    }

    async loadQuizzes() {
        try {
            const response = await this.apiCall('/quizzes', 'GET');
            if (response.success) {
                this.displayQuizzes(response.data);
                // Show all quizzes (drafts and published) in recent section
                this.updateRecentQuizzes(response.data.slice(0, 3));
                
                // Start global real-time monitoring for all quizzes
                this.startGlobalTeacherMonitoring(response.data);
            } else {
                console.error('Failed to load quizzes:', response.message);
                this.showMessage('Failed to load quizzes from database', 'error');
            }
        } catch (error) {
            console.error('Error loading quizzes:', error);
            this.showMessage('Error connecting to database for quizzes', 'error');
            // Show empty state with retry option
            const list = document.getElementById('quizList');
            if (list) {
                list.innerHTML = `
                    <div class="empty">
                        <p>Unable to load quizzes from database</p>
                        <button class="btn-primary" onclick="dashboard.loadQuizzes()">Retry</button>
                    </div>
                `;
            }
        }
    }

    async loadAvailability() {
        try {
            const response = await this.apiCall('/teacher-availability/my-availability', 'GET');
            if (response.success) {
                this.displayWeeklyAvailability(response.weeklyAvailability || []);
            } else {
                this.showMessage(response.message || 'Failed to load availability', 'error');
            }
        } catch (error) {
            console.error('Error loading availability:', error);
            this.showMessage('Error loading availability: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    async loadStats() {
        try {
            const response = await this.apiCall('/teachers/stats', 'GET');
            if (response.success) {
                this.updateStats(response.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    displayStudents(students) {
        const grid = document.getElementById('studentsGrid');
        const titleElement = document.getElementById('studentsManagementTitle');
        if (!grid) return;

        // Update student count in header
        if (titleElement) {
            titleElement.textContent = `Students Management (${students.length})`;
        }

        if (students.length === 0) {
            grid.innerHTML = '<p class="empty">No students found</p>';
            return;
        }

        grid.innerHTML = students.map(student => `
            <div class="student-card-grid">
                <div class="student-card-content">
                    <div class="student-avatar-section">
                        <img src="${student.profileImage || '/images/default-avatar.png'}" alt="${student.name}" class="student-avatar-grid">
                    </div>
                    <div class="student-info-grid">
                        <h4 class="student-name-grid">${student.name}</h4>
                        <div class="student-detail-row">
                            <p class="student-detail-grid">
                                <i class="fas fa-id-card"></i>
                                ${student.userId}
                            </p>
                            <button class="edit-icon-inline" onclick="dashboard.editStudent('${student._id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                        <p class="student-detail-grid">
                            <i class="fas fa-envelope"></i>
                            ${student.email}
                        </p>
                        <div class="student-detail-row">
                            <p class="student-detail-grid">
                                <i class="fas fa-phone"></i>
                                ${student.mobileNumber || 'Not provided'}
                            </p>
                            <button class="delete-icon-inline" onclick="dashboard.deleteStudent('${student._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <p class="student-detail-grid">
                            <i class="fas fa-graduation-cap"></i>
                            ${student.class || 'Not assigned'}
                        </p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayQuizzes(quizzes) {
        console.log('Displaying quizzes:', quizzes); // Debug log
        const list = document.getElementById('quizList');
        const countSubtitle = document.getElementById('quizCountSubtitle');

        if (!list) {
            console.error('Quiz list element not found');
            return;
        }

        // Store quizzes for expiry monitoring
        this.currentQuizzes = quizzes;

        // Show all quizzes (drafts and published) in unified list
        const allQuizzes = quizzes;

        // Update count subtitle
        if (countSubtitle) {
            const totalCount = allQuizzes.length;
            countSubtitle.textContent = `${totalCount} quiz${totalCount !== 1 ? 'zes' : ''}`;
        }

        if (allQuizzes.length === 0) {
            list.innerHTML = '<p class="empty">No quizzes created yet</p>';
            return;
        }

        console.log('Creating quiz items for', allQuizzes.length, 'quizzes');
        list.innerHTML = allQuizzes.map(quiz => {
            const createdDate = new Date(quiz.createdAt);
            const startTime = quiz.startTime ? new Date(quiz.startTime) : null;
            const endTime = quiz.endTime ? new Date(quiz.endTime) : null;

            // Format date for created: Feb 13, 2026
            const formattedCreatedDate = createdDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            // Format date-time for schedule: Feb 19, 2026, 06:48 PM
            const formatScheduleDateTime = (date) => {
                if (!date) return 'Not set';
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }).replace(',', ',').replace(' at ', ', ');
            };

            const formattedStart = formatScheduleDateTime(startTime);
            const formattedEnd = formatScheduleDateTime(endTime);
            const duration = quiz.duration ? `${quiz.duration} min` : 'Not set';

            // Status
            const isDraft = quiz.status === 'draft';
            const now = new Date();
            const isExpired = !isDraft && endTime && endTime < now;
            const isStarted = !isDraft && startTime && startTime <= now;
            
            let statusClass, statusText;
            if (isDraft) {
                statusClass = 'draft';
                statusText = 'DRAFT';
            } else if (isExpired) {
                statusClass = 'expired';
                statusText = 'EXPIRED';
            } else {
                statusClass = 'published';
                statusText = 'PUBLISHED';
            }

            // Determine if edit should be disabled for published quizzes
            const editDisabled = !isDraft && isStarted;
            const editTitle = editDisabled ? 'Cannot edit published quiz after start time' : 'Edit Quiz';

            return `
            <div class="quiz-card" data-quiz-item-id="${quiz._id}" data-quiz-status="${quiz.status}" data-start-time="${quiz.startTime || ''}" data-end-time="${quiz.endTime || ''}">
                <div class="quiz-card-header">
                    <div class="quiz-icon-section">
                        <div class="quiz-icon">
                            <i class="fas fa-question"></i>
                        </div>
                        <div class="quiz-title-info">
                            <h3 class="quiz-title">${quiz.title}</h3>
                            <p class="quiz-subtitle">${quiz.class || 'No class'} • ${quiz.subject || 'General'}</p>
                        </div>
                    </div>
                    <div class="quiz-actions">
                        <button class="btn-status ${statusClass}">${statusText}</button>
                        ${!isDraft ? `<button class="btn-view-attempts" onclick="dashboard.viewQuizAttempts('${quiz._id}')" title="View Attempts">
                            <i class="fas fa-chart-bar"></i>
                        </button>` : ''}
                        <button class="btn-edit ${editDisabled ? 'disabled' : ''}" onclick="dashboard.editQuiz('${quiz._id}')" title="${editTitle}" ${editDisabled ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="dashboard.deleteQuiz('${quiz._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="quiz-info-section">
                    <div class="info-card">
                        <div class="info-text">
                            <p class="info-label">QUESTIONS</p>
                            <p class="info-value">${quiz.questions ? quiz.questions.length : 0}</p>
                        </div>
                    </div>
                    <div class="info-card">
                        <div class="info-text">
                            <p class="info-label">DURATION</p>
                            <p class="info-value">${duration}</p>
                        </div>
                    </div>
                    <div class="info-card">
                        <div class="info-text">
                            <p class="info-label">CREATED</p>
                            <p class="info-value">${formattedCreatedDate}</p>
                        </div>
                    </div>
                </div>
                
                <div class="quiz-schedule-container">
                    <div class="schedule-content">
                        <div class="schedule-item">
                            <span class="schedule-label">START</span>
                            <span class="schedule-value">${formattedStart}</span>
                        </div>
                        <div class="schedule-item">
                            <span class="schedule-label">END</span>
                            <span class="schedule-value">${formattedEnd}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        }).join('');
        console.log('Quiz items rendered successfully');
    }

    displayWeeklyAvailability(weeklyAvailability) {
        const container = document.getElementById('currentSchedule');
        if (!container) return;

        // Save button hidden by default
        const saveBtn = document.getElementById('saveAvailabilityBtn');
        if (saveBtn) saveBtn.style.display = 'none';

        const dayNames = {
            monday: 'Monday',
            tuesday: 'Tuesday',
            wednesday: 'Wednesday',
            thursday: 'Thursday',
            friday: 'Friday',
            saturday: 'Saturday',
            sunday: 'Sunday'
        };

        // Convert backend array to map
        const availabilityMap = {};
        if (Array.isArray(weeklyAvailability)) {
            weeklyAvailability.forEach(slot => {
                availabilityMap[slot.day] = slot;
            });
        }

        // Always build Monday-Sunday
        const finalAvailability = Object.keys(dayNames).map(day => {
            const backendSlot = availabilityMap[day];
            return {
                day,
                startTime: backendSlot?.startTime || "00:00",
                endTime: backendSlot?.endTime || "00:00"
            };
        });

        this.currentAvailabilityData = finalAvailability;

        // Render with new clean row design
        container.innerHTML = finalAvailability.map(slot => {
            const isNotSet = slot.startTime === "00:00" && slot.endTime === "00:00";
            const timeDisplay = isNotSet ? "Not set" : `${this.formatTimeForDisplay(slot.startTime)} - ${this.formatTimeForDisplay(slot.endTime)}`;

            return `
            <div class="availability-row" data-day="${slot.day}">
                <div class="availability-day">
                    ${dayNames[slot.day]}
                </div>
                <div class="availability-time ${isNotSet ? 'not-set' : ''}" 
                     data-start="${slot.startTime}" 
                     data-end="${slot.endTime}">
                    ${timeDisplay}
                </div>
                <div class="availability-actions">
                    <button class="btn" 
                            onclick="dashboard.enableDayEdit('${slot.day}')"
                            title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-erase" 
                            onclick="dashboard.eraseDayTime('${slot.day}')"
                            title="Erase">
                        <i class="fas fa-eraser"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }

    formatTimeForDisplay(time24) {
        if (!time24 || time24 === "00:00") return "00:00";

        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours, 10);

        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

        return `${displayHour}:${minutes} ${period}`;
    }


    saveInlineEditedAvailability() {
        const updatedAvailability = [];

        document.querySelectorAll(".availability-row").forEach(row => {
            const day = row.dataset.day;
            const timeDiv = row.querySelector(".availability-time");

            // If day is in edit mode (inputs exist)
            const startInput = row.querySelector('[data-type="start-time"]');
            const endInput = row.querySelector('[data-type="end-time"]');

            let startTime = "";
            let endTime = "";

            if (startInput && endInput) {
                // Take from input values
                startTime = startInput.value || "";
                endTime = endInput.value || "";
            } else {
                // Take from dataset values
                startTime = timeDiv?.dataset.start || "";
                endTime = timeDiv?.dataset.end || "";
            }

            // ✅ Skip "Not set" days entirely - don't send to DB
            if (!startTime || !endTime || startTime === "00:00" || endTime === "00:00") {
                return; // Skip this day
            }

            // ✅ Validate only: startTime < endTime
            if (startTime < endTime) {
                updatedAvailability.push({ day, startTime, endTime });
            } else {
                this.showMessage(`${day.charAt(0).toUpperCase() + day.slice(1)}: Start time must be before end time`, "error");
                return;
            }
        });

        this.saveWeeklyAvailabilityToBackend(updatedAvailability);
    }

    async saveWeeklyAvailabilityToBackend(weeklyAvailability) {
        try {
            this.showLoading();

            const response = await this.apiCall(
                '/teacher-availability/availability',
                'POST',
                { weeklyAvailability }
            );

            if (response.success) {
                this.showMessage('Weekly availability saved successfully!', 'success');
                this.currentAvailabilityData = weeklyAvailability;
                this.exitInlineEdit();
                await this.loadAvailability();
            } else {
                this.showMessage(response.message || 'Failed to save availability', 'error');
            }
        } catch (error) {
            console.error('Error saving weekly availability:', error);
            const customErrorMessage = this.getCustomErrorMessage(error, 'Availability update');
            this.showMessage(customErrorMessage, 'error');
        } finally {
            this.hideLoading();
        }
    }

    exitInlineEdit() {
        const editBtn = document.getElementById('editAvailabilityBtn');
        const saveBtn = document.getElementById('saveAvailabilityBtn');

        if (editBtn) editBtn.style.display = 'block';
        if (saveBtn) saveBtn.style.display = 'none';

        if (this.currentAvailabilityData) {
            this.displayWeeklyAvailability(this.currentAvailabilityData);
        }
    }

    enableDayEdit(day) {
        // Show Save button when teacher edits any day
        const saveBtn = document.getElementById("saveAvailabilityBtn");
        if (saveBtn) saveBtn.style.display = "block";

        const row = document.querySelector(`.availability-row[data-day="${day}"]`);
        if (!row) return;

        const timeDiv = row.querySelector(".availability-time");
        if (!timeDiv) return;

        let startTime = timeDiv.dataset.start || "00:00";
        let endTime = timeDiv.dataset.end || "00:00";

        // If not set, show blank inputs
        if (startTime === "00:00") startTime = "";
        if (endTime === "00:00") endTime = "";

        timeDiv.innerHTML = `
        <div class="time-input-group">
            <input type="time" class="time-picker"
                   data-day="${day}" data-type="start-time"
                   value="${startTime}" step="60">

            <span class="time-separator">-</span>

            <input type="time" class="time-picker"
                   data-day="${day}" data-type="end-time"
                   value="${endTime}" step="60">

            <button class="btn-clear-time"
                    onclick="dashboard.clearDayTime('${day}')"
                    title="Clear time">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    }

    eraseDayTime(day) {
        // Update local data immediately to show "Not set"
        const dayIndex = this.currentAvailabilityData.findIndex(item => item.day === day);
        if (dayIndex !== -1) {
            this.currentAvailabilityData[dayIndex].startTime = "00:00";
            this.currentAvailabilityData[dayIndex].endTime = "00:00";
        }

        // Update UI immediately to show "Not set"
        const row = document.querySelector(`.availability-row[data-day="${day}"]`);
        if (row) {
            const timeDiv = row.querySelector(".availability-time");
            if (timeDiv) {
                timeDiv.className = "availability-time not-set";
                timeDiv.setAttribute("data-start", "00:00");
                timeDiv.setAttribute("data-end", "00:00");
                timeDiv.textContent = "Not set";
            }
        }

        // Show save button
        const saveBtn = document.getElementById("saveAvailabilityBtn");
        if (saveBtn) saveBtn.style.display = "block";
    }


    clearDayTime(day) {
        const startInput = document.querySelector(`input[data-type="start-time"][data-day="${day}"]`);
        const endInput = document.querySelector(`input[data-type="end-time"][data-day="${day}"]`);

        if (startInput) startInput.value = "";
        if (endInput) endInput.value = "";
    }


    updateStats(stats) {
        document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
        document.getElementById('totalQuizzes').textContent = stats.totalQuizzes || 0;
        document.getElementById('totalSessions').textContent = stats.totalSessions || 0;
    }

    updateRecentHolidays(holidays) {
        const container = document.getElementById('recentHolidays');
        if (!container) return;

        if (holidays.length === 0) {
            container.innerHTML = '<p class="empty">No holidays scheduled</p>';
            return;
        }

        container.innerHTML = holidays.map(holiday => `
        <div class="holiday-item-small clickable-item" data-holiday-id="${holiday._id}">
            <h4><i class="fas fa-calendar-alt"></i> ${holiday.title || holiday.reason || 'Holiday'}</h4>
            <p>${this.formatSessionDate(holiday.startDate || holiday.date)} • ${holiday.reason === 'public' || holiday.reason === 'Public Holiday' ? 'Public' : 'Personal'} • ${holiday.duration || 1} day(s)</p>
        </div>
    `).join('');

        // Add click handlers
        container.querySelectorAll('.holiday-item-small').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateToHolidayPage(item.dataset.holidayId);
            });
        });
    }

    updateRecentQuizzes(quizzes) {
        const container = document.getElementById('recentQuizzes');
        if (!container) return;

        // Show all quizzes (drafts and published) in recent section
        if (quizzes.length === 0) {
            container.innerHTML = '<p class="empty">No quizzes created yet</p>';
            return;
        }

        container.innerHTML = quizzes.map(quiz => {
            const isDraft = quiz.status === 'draft';
            const statusBadge = isDraft ?
                '<span class="btn-status draft">DRAFT</span>' :
                '<span class="btn-status published">PUBLISHED</span>';

            return `
        <div class="quiz-item-small clickable-item" data-quiz-id="${quiz._id}">
            ${statusBadge}
            <div class="quiz-item-content">
                <div class="quiz-item-header">
                    <h4><i class="fas fa-question-circle"></i> ${(quiz.title || 'Quiz').toUpperCase()}</h4>
                </div>
                <p>${(quiz.subject || 'General').toUpperCase()} • ${quiz.class || 'No class'} • ${quiz.questions ? quiz.questions.length : 0} questions</p>
            </div>
        </div>
    `;
        }).join('');

        // Add click handlers
        container.querySelectorAll('.quiz-item-small').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateToQuizPage(item.dataset.quizId);
            });
        });

        // Start monitoring for quiz start times to disable edit buttons
        this.startTeacherQuizMonitoring(quizzes);
    }

    // Real-time monitoring for teacher quiz start times
    startGlobalTeacherMonitoring(quizzes) {
        // Stop any existing global monitoring
        this.stopGlobalTeacherMonitoring();

        // Store quiz data for monitoring
        this.monitoredTeacherQuizzes = quizzes;

        // Start continuous monitoring
        this.globalTeacherInterval = setInterval(() => {
            this.updateAllTeacherQuizStatuses();
        }, 1000); // Check every second
    }

    stopGlobalTeacherMonitoring() {
        if (this.globalTeacherInterval) {
            clearInterval(this.globalTeacherInterval);
            this.globalTeacherInterval = null;
        }
    }

    updateAllTeacherQuizStatuses() {
        if (!this.monitoredTeacherQuizzes) return;

        const now = new Date();

        this.monitoredTeacherQuizzes.forEach(quiz => {
            if (quiz.status === 'published' && quiz.startTime) {
                const startTime = new Date(quiz.startTime);
                
                // Check if quiz has started and edit button should be disabled
                if (now >= startTime && !quiz.editDisabled) {
                    quiz.editDisabled = true;
                    this.disableQuizEditButton(quiz._id);
                }
            }
        });
    }

    // Real-time monitoring for teacher quiz start times
    startTeacherQuizMonitoring(quizzes) {
        this.stopTeacherQuizMonitoring();

        quizzes.forEach(quiz => {
            if (quiz.status === 'published' && quiz.startTime) {
                const startTime = new Date(quiz.startTime);
                const now = new Date();
                
                if (startTime > now) {
                    // Monitor this quiz for start time
                    const checkInterval = setInterval(() => {
                        const currentTime = new Date();
                        if (currentTime >= startTime) {
                            clearInterval(checkInterval);
                            this.disableQuizEditButton(quiz._id);
                        }
                    }, 1000);
                    
                    // Store interval reference for cleanup
                    if (!this.quizMonitoringIntervals) {
                        this.quizMonitoringIntervals = [];
                    }
                    this.quizMonitoringIntervals.push(checkInterval);
                }
            }
        });
    }

    stopTeacherQuizMonitoring() {
        if (this.quizMonitoringIntervals) {
            this.quizMonitoringIntervals.forEach(interval => clearInterval(interval));
            this.quizMonitoringIntervals = [];
        }
    }

    disableQuizEditButton(quizId) {
        // Find and disable edit buttons for this quiz
        const editButtons = document.querySelectorAll(`[data-quiz-id="${quizId}"] .btn-edit, [onclick*="editQuiz('${quizId}')"]`);
        editButtons.forEach(button => {
            button.disabled = true;
            button.classList.add('disabled');
            // Remove onclick handler to prevent clicks
            button.onclick = null;
            button.style.cursor = 'not-allowed';
            button.style.opacity = '0.5';
        });
    }

    enableDayEdit(day) {
        // Show Save button when teacher edits any day
        const saveBtn = document.getElementById("saveAvailabilityBtn");
        if (saveBtn) saveBtn.style.display = "block";

        const row = document.querySelector(`.availability-row[data-day="${day}"]`);
        if (!row) return;

        const timeDiv = row.querySelector(".availability-time");
        if (!timeDiv) return;

        let startTime = timeDiv.dataset.start || "00:00";
        let endTime = timeDiv.dataset.end || "00:00";

        // If not set, show blank inputs
        if (startTime === "00:00") startTime = "";
        if (endTime === "00:00") endTime = "";

        timeDiv.innerHTML = `
    <div class="time-input-group">
        <input type="time" class="time-picker"
               data-day="${day}" data-type="start-time"
               value="${startTime}" step="60">

        <span class="time-separator">-</span>

        <input type="time" class="time-picker"
               data-day="${day}" data-type="end-time"
               value="${endTime}" step="60">

        <button class="btn-clear-time"
                onclick="dashboard.clearDayTime('${day}')"
                title="Clear time">
            <i class="fas fa-times"></i>
        </button>
    </div>
`;
    }

    eraseDayTime(day) {
        // Update local data immediately to show "Not set"
        const dayIndex = this.currentAvailabilityData.findIndex(item => item.day === day);
        if (dayIndex !== -1) {
            this.currentAvailabilityData[dayIndex].startTime = "00:00";
            this.currentAvailabilityData[dayIndex].endTime = "00:00";
        }

        // Update UI immediately to show "Not set"
        const row = document.querySelector(`.availability-row[data-day="${day}"]`);
        if (row) {
            const timeDiv = row.querySelector(".availability-time");
            if (timeDiv) {
                timeDiv.className = "availability-time not-set";
                timeDiv.setAttribute("data-start", "00:00");
                timeDiv.setAttribute("data-end", "00:00");
                timeDiv.textContent = "Not set";
            }
        }

        // Show save button
        const saveBtn = document.getElementById("saveAvailabilityBtn");
        if (saveBtn) saveBtn.style.display = "block";
    }

    clearDayTime(day) {
        const startInput = document.querySelector(`input[data-type="start-time"][data-day="${day}"]`);
        const endInput = document.querySelector(`input[data-type="end-time"][data-day="${day}"]`);

        if (startInput) startInput.value = "";
        if (endInput) endInput.value = "";
    }

    updateStats(stats) {
        document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
        document.getElementById('totalQuizzes').textContent = stats.totalQuizzes || 0;
        document.getElementById('totalSessions').textContent = stats.totalSessions || 0;
    }

    updateRecentHolidays(holidays) {
        const container = document.getElementById('recentHolidays');
        if (!container) return;

        if (holidays.length === 0) {
            container.innerHTML = '<p class="empty">No holidays scheduled</p>';
            return;
        }

        container.innerHTML = holidays.map(holiday => `
    <div class="holiday-item-small clickable-item" data-holiday-id="${holiday._id}">
        <h4><i class="fas fa-calendar-alt"></i> ${holiday.title || holiday.reason || 'Holiday'}</h4>
        <p>${this.formatSessionDate(holiday.startDate || holiday.date)} • ${holiday.reason === 'public' || holiday.reason === 'Public Holiday' ? 'Public' : 'Personal'} • ${holiday.duration || 1} day(s)</p>
    </div>
`).join('');

        // Add click handlers
        container.querySelectorAll('.holiday-item-small').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateToHolidayPage(item.dataset.holidayId);
            });
        });
    }

    updateRecentSessions(sessions) {
        const container = document.getElementById('recentSessions');
        if (!container) return;

        if (sessions.length === 0) {
            container.innerHTML = '<p class="empty">No sessions created yet</p>';
            return;
        }

        container.innerHTML = sessions.map(session => `
        <div class="session-item-small clickable-item" data-session-id="${session._id}">
            <div class="session-item-icon-wrapper session-icon-blue">
                <i class="fas fa-calendar-alt"></i>
            </div>
            <div class="session-item-content">
                <h4>${(session.title || 'Session').toLowerCase()}</h4>
                <p>${this.formatSessionDate(session.date)}</p>
                <span class="session-item-description">${session.description || ''}</span>
            </div>
            <div class="session-item-actions">
                <div class="session-item-icon-wrapper session-icon-red delete-session-btn" data-session-id="${session._id}">
                    <i class="fas fa-trash"></i>
                </div>
            </div>
        </div>
    `).join('');

        // Add click handlers for navigation
        container.querySelectorAll('.session-item-small').forEach(item => {
            item.addEventListener('click', (event) => {
                // Prevent navigation if delete button is clicked
                if (!event.target.closest('.delete-session-btn')) {
                    this.navigateToSessionPage(item.dataset.sessionId);
                }
            });
        });

        // Add click handlers for delete buttons
        container.querySelectorAll('.delete-session-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent triggering parent item's click
                const sessionId = button.dataset.sessionId;
                if (confirm('Are you sure you want to delete this session?')) {
                    this.deleteSession(sessionId);
                }
            });
        });
    }

    navigateToQuizPage(quizId) {
        // Switch to quiz page
        this.switchPage('quiz');

        // Scroll to the specific quiz if ID is provided (no highlight)
        if (quizId) {
            setTimeout(() => {
                const quizElement = document.querySelector(`[data-quiz-item-id="${quizId}"]`);
                if (quizElement) {
                    quizElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }

    navigateToSessionPage(sessionId) {
        // Switch to session page
        this.switchPage('sessions');

        // Scroll to the specific session if ID is provided (no highlight)
        if (sessionId) {
            setTimeout(() => {
                const sessionElement = document.querySelector(`[data-session-item-id="${sessionId}"]`);
                if (sessionElement) {
                    sessionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }

    navigateToHolidayPage(holidayId) {
        // Switch to holiday page
        this.switchPage('holidays');

        // Scroll to the specific holiday if ID is provided (no highlight)
        if (holidayId) {
            setTimeout(() => {
                const holidayElement = document.querySelector(`[data-holiday-item-id="${holidayId}"]`);
                if (holidayElement) {
                    holidayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }

    async addStudent(form) {
        const formData = new FormData(form);
        formData.append('teacherUserId', this.teacher.userId);


        try {
            this.showLoading();
            const response = await this.apiCall('/teachers/students', 'POST', formData);

            if (response.success) {
                this.showMessage('Student added successfully', 'success');
                this.hideModal('addStudentModal');
                form.reset();
                await this.loadStudents();
                await this.loadStats();
            } else {
                this.showMessage(response.message || 'Failed to add student', 'error');
            }
        } catch (error) {
            console.error('Error adding student:', error);
            const customErrorMessage = this.getCustomErrorMessage(error, 'Student addition');
            this.showMessage(customErrorMessage, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async uploadCsv(form) {
        // Custom validation: Check if file is selected
        const fileInput = form.querySelector('input[name="csv"]');
        const errorElement = document.getElementById('csvFileError');
        
        // Clear previous error
        errorElement.textContent = '';
        
        if (!fileInput.files || fileInput.files.length === 0) {
            errorElement.textContent = 'Please select a file.';
            fileInput.focus();
            return;
        }
        
        // Check if file is CSV
        const file = fileInput.files[0];
        if (!file.name.toLowerCase().endsWith('.csv')) {
            errorElement.textContent = 'Please select a valid CSV file.';
            fileInput.focus();
            return;
        }

        const formData = new FormData(form);
        formData.append('teacherUserId', this.teacher.userId);

        try {
            this.showLoading();
            const response = await this.apiCall('/teachers/students/upload-csv', 'POST', formData);

            if (response.success || response.message) {
                // Show detailed results
                let message = response.message || 'CSV upload completed';
                if (response.total !== undefined) {
                    message += `\nTotal: ${response.total}, Inserted: ${response.inserted}, Skipped: ${response.skipped}`;
                }
                
                // If all rows were skipped, show a simple format error message
                if (response.total > 0 && response.inserted === 0 && response.skipped === response.total) {
                    this.showMessage('Invalid CSV format. Please check the required columns.', 'error');
                } else if (response.skippedDetails && response.skippedDetails.length > 0 && response.inserted > 0) {
                    // Show skipped details only if some records were successfully inserted
                    message += '\n\nSkipped rows:';
                    response.skippedDetails.forEach(detail => {
                        message += `\nRow ${detail.row} (${detail.userId}): ${detail.reasons.join(', ')}`;
                    });
                    this.showMessage(message, 'warning');
                } else {
                    this.showMessage(message, response.inserted > 0 ? 'success' : 'warning');
                }
                
                this.hideModal('uploadCsvModal');
                form.reset();
                await this.loadStudents();
                await this.loadStats();
            } else {
                this.showMessage(response.message || 'Failed to upload CSV', 'error');
            }
        } catch (error) {
            console.error('Error uploading CSV:', error);
            this.showMessage('Error uploading CSV: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            this.hideLoading();
        }
    }

    async createQuiz(form) {
        const formData = new FormData(form);
        const quizId = formData.get('quizId');
        const isEdit = !!quizId; // Convert to boolean

        // Validate form
        if (!this.validateQuizForm(form)) {
            return;
        }

        // Collect questions properly
        const questions = [];
        const questionElements = form.querySelectorAll('.question-item');

        questionElements.forEach((questionEl, index) => {
            const questionInput = questionEl.querySelector(`input[name="questions[]"]`);
            const questionText = questionInput ? questionInput.value : '';

            // Get options for this question
            const optionInputs = questionEl.querySelectorAll(`input[name="options${index + 1}[]"]`);
            const options = [];

            optionInputs.forEach(input => {
                options.push(input ? input.value : '');
            });

            // Get correct answer from checkboxes
            const answerCheckboxes = questionEl.querySelectorAll(`input[name^="answers"]`);
            let correctOption = '0'; // default to first option
            answerCheckboxes.forEach((checkbox) => {
                if (checkbox.checked) {
                    correctOption = checkbox.value;
                }
            });

            if (questionText.trim()) {
                questions.push({
                    question: questionText,
                    options: options,
                    correctOption: ['a', 'b', 'c', 'd'][parseInt(correctOption)] || 'a'
                });
            }
        });

        const startTimeStr = formData.get('startTime');
        const endTimeStr = formData.get('endTime');

        if (startTimeStr && endTimeStr) {
            const start = new Date(startTimeStr);
            const end = new Date(endTimeStr);

            if (end <= start) {
                this.showMessage('End Time must be later than Start Time', 'error');
                return;
            }
        }

        // Check if this is editing a quiz (Update Quiz button)
        if (isEdit) {
            // Get the original quiz status to preserve it
            const originalStatus = document.getElementById('originalQuizStatus')?.value ;
            
            // For editing existing quizzes, update directly
            const quizData = {
                title: formData.get('title'),
                subject: formData.get('subject') || 'General Knowledge',
                class: formData.get('class') || '',
                totalMarks: questions.length || 0,
                startTime: startTimeStr || '',
                endTime: endTimeStr || '',
                duration: parseInt(formData.get('duration')) || 30,
                questions: questions,
                status: originalStatus // Preserve original status (Draft stays Draft, Published stays Published)
            };

            try {
                this.showLoading();

                const response = await this.apiCall(`/quizzes/${quizId}`, 'PUT', quizData);

                if (response.success) {
                    this.showMessage('Quiz updated successfully.', 'success');

                    // Always redirect to Quiz Main Page after Update Quiz
                    this.backToQuizList();

                    // Refresh quizzes to show the updated list
                    await this.loadQuizzes();

                } else {
                    this.showMessage(response.message || 'Failed to update quiz', 'error');
                }
            } catch (error) {
                console.error('Error updating quiz:', error);
                this.showMessage('Error updating quiz', 'error');
            } finally {
                this.hideLoading();
            }

            return;
        }

        // For new quizzes, show preview modal
        const quizData = {
            title: formData.get('title'),
            description: '',
            subject: formData.get('subject') || 'General Knowledge',
            class: formData.get('class') || '',
            totalMarks: questions.length || 0,
            startTime: startTimeStr || '',
            endTime: endTimeStr || '',
            duration: parseInt(formData.get('duration')) || 30,
            questions: questions,
            status: 'published' // Set status to published when creating a new quiz
        };

        // Validate basic fields
        // Validation already handled by validateQuizForm
        /* if (!quizData.title || !quizData.subject || !quizData.duration) {
            this.showMessage('Please fill in all required fields (Title, Subject, Duration)', 'error');
            return;
        } */

        if (quizData.questions.length === 0) {
            this.showMessage('Please add at least one question', 'error');
            return;
        }

        // Show Preview Modal instead of direct submission
        this.showQuizConfirmationDialog(quizData, null);
    }

    async addMarks(form) {
        const formData = new FormData(form);
        const marksData = {
            studentId: formData.get('studentSelect'),
            subject: formData.get('subject'),
            marks: formData.get('marks'),
            teacherId: this.teacher._id
        };

        try {
            this.showLoading();
            const response = await this.apiCall('/marks', 'POST', marksData);

            if (response.success) {
                this.showMessage('Marks added successfully', 'success');
                form.reset();
                // Reload marks data
            } else {
                this.showMessage(response.message || 'Failed to add marks', 'error');
            }
        } catch (error) {
            console.error('Error adding marks:', error);
            this.showMessage('Error adding marks', 'error');
        } finally {
            this.hideLoading();
        }
    }


    clearFormValidation(form) {
        if (!form) return;
        form.querySelectorAll('.validation-message').forEach(msg => {
            msg.textContent = '';
            msg.style.display = 'block'; // Ensure it's visible when needed
        });
        form.querySelectorAll('.error').forEach(field => field.classList.remove('error'));
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('error');
            // Try to find the validation message span
            let msg = field.nextElementSibling;
            if (!msg || !msg.classList.contains('validation-message')) {
                // Try parent's validation message (for grouped inputs)
                msg = field.parentElement.querySelector('.validation-message');
            }

            if (msg) {
                msg.textContent = message;
                msg.style.color = '#dc3545'; // Ensure red color
            } else {
                console.warn(`Validation message element not found for field: ${fieldId}`);
            }
        } else {
            console.warn(`Field not found: ${fieldId}`);
        }
    }

    clearFieldValidation(field) {
        if (!field) return;
        field.classList.remove('error');
        let msg = field.nextElementSibling;
        if (!msg || !msg.classList.contains('validation-message')) {
            msg = field.parentElement.querySelector('.validation-message');
        }
        if (msg) msg.textContent = '';
        
        // For checkboxes in options, also clear the answer validation message and highlighting
        if (field.type === 'checkbox' && field.name.startsWith('answers')) {
            // Clear validation message from first option container
            const questionItem = field.closest('.question-item');
            if (questionItem) {
                const firstOptionContainer = questionItem.querySelector('.option-container');
                if (firstOptionContainer) {
                    const validationMsg = firstOptionContainer.querySelector('.validation-message');
                    if (validationMsg) validationMsg.textContent = '';
                }
            }
            
            // Clear highlighting from all option containers in this question
            const allCheckboxes = field.closest('.question-item').querySelectorAll('input[name^="answers"]');
            allCheckboxes.forEach(checkbox => {
                const container = checkbox.closest('.option-container');
                if (container) {
                    container.classList.remove('selected');
                }
            });
        }
    }

    // Helper function to check if current quiz being edited is a draft
    isCurrentQuizDraft() {
        const quizId = document.getElementById('quizId').value;
        if (!quizId || !this.currentQuizzes) return false;
        
        const currentQuiz = this.currentQuizzes.find(q => q._id === quizId);
        return currentQuiz && currentQuiz.status === 'draft';
    }

    validateQuizForm(form) {
        let isValid = true;
        this.clearFormValidation(form);

        // Basic Info
        const title = form.querySelector('#quizTitle');
        if (!title.value.trim()) {
            this.showFieldError('quizTitle', 'Quiz Title is required');
            isValid = false;
        }

        const quizClass = form.querySelector('#quizClass');
        if (!quizClass.value) {
            this.showFieldError('quizClass', 'Class is required');
            isValid = false;
        }

        const subject = form.querySelector('#quizSubject');
        if (!subject.value.trim()) {
            this.showFieldError('quizSubject', 'Subject is required');
            isValid = false;
        }

        // Schedule
        const startTime = form.querySelector('#quizStartTime');
        if (!startTime.value) {
            this.showFieldError('quizStartTime', 'Start Time is required');
            isValid = false;
        }

        const endTime = form.querySelector('#quizEndTime');
        if (!endTime.value) {
            this.showFieldError('quizEndTime', 'End Time is required');
            isValid = false;
        } else if (startTime.value && new Date(startTime.value) >= new Date(endTime.value)) {
            this.showFieldError('quizEndTime', 'End Time must be after Start Time');
            isValid = false;
        }

        // Check if this is a draft quiz and validate dates are not in the past
        const quizId = document.getElementById('quizId').value;
        const isDraftMode = !quizId; // No quizId means creating new draft
        
        if (isDraftMode || (quizId && this.isCurrentQuizDraft())) {
            const now = new Date();
            const startDate = startTime.value ? new Date(startTime.value) : null;
            const endDate = endTime.value ? new Date(endTime.value) : null;
            
            if (startDate && startDate < now) {
                this.showFieldError('quizStartTime', 'Start Time cannot be in the past for draft quizzes. Please choose a future date.');
                isValid = false;
            }
            
            if (endDate && endDate < now) {
                this.showFieldError('quizEndTime', 'End Time cannot be in the past for draft quizzes. Please choose a future date.');
                isValid = false;
            }
        }

        const duration = form.querySelector('#quizDuration');
        if (!duration.value || parseInt(duration.value) <= 0) {
            this.showFieldError('quizDuration', 'Duration must be greater than 0');
            isValid = false;
        }

        // Questions
        const questions = form.querySelectorAll('.question-item');
        if (questions.length === 0) {
            this.showMessage('Please add at least one question', 'error');
            isValid = false;
        }

        questions.forEach((question, index) => {
            const questionInput = question.querySelector('input[name="questions[]"]');
            if (questionInput && !questionInput.value.trim()) {
                questionInput.classList.add('error');
                const msg = questionInput.nextElementSibling;
                if (msg && msg.classList.contains('validation-message')) {
                    msg.textContent = 'Question text is required';
                }
                isValid = false;
            }

            const options = question.querySelectorAll('input[name^="options"]');
            options.forEach((option) => {
                if (!option.value.trim()) {
                    option.classList.add('error');
                    const msg = option.nextElementSibling;
                    if (msg && msg.classList.contains('validation-message')) {
                        msg.textContent = 'Option text is required';
                    }
                    isValid = false;
                }
            });

            const answerCheckboxes = question.querySelectorAll('input[name^="answers"]');
            let hasSelectedAnswer = false;
            answerCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    hasSelectedAnswer = true;
                }
            });
            
            if (!hasSelectedAnswer) {
                // Show error in the first option container's validation message
                const firstOptionContainer = question.querySelector('.option-container');
                if (firstOptionContainer) {
                    const msg = firstOptionContainer.querySelector('.validation-message');
                    if (msg) {
                        msg.textContent = 'Please select a correct answer';
                    }
                }
                isValid = false;
            }
        });
        return isValid;
    }

    addQuizQuestion(data = null) {
        const container = document.getElementById('questionsContainer');
        const questionCount = container.querySelectorAll('.question-item').length + 1;

        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.innerHTML = `
            <div class="question-header">
                <span class="question-number">Question ${questionCount}</span>
                <button type="button" class="btn-remove-question">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="question-content">
                <!-- Question Text Field (Full Width) -->
                <div class="question-row">
                    <input type="text" name="questions[]" placeholder="Enter your question here..." class="question-input" value="${data ? data.question : ''}">
                    <span class="validation-message"></span>
                </div>
                
                <!-- Options Row (4 Columns) -->
                <div class="options-row">
                    <div class="option-item">
                        <input type="text" name="options${questionCount}[]" placeholder="Option A" class="option-input" value="${data && data.options && data.options[0] ? data.options[0] : ''}">
                        <div class="option-checkbox-wrapper">
                            <input type="checkbox" name="answers${questionCount}[]" id="answerA${questionCount}" value="0" class="option-checkbox" ${data && data.correctOption === 'a' ? 'checked' : ''}>
                            <label for="answerA${questionCount}" class="checkbox-label"></label>
                        </div>
                        <span class="validation-message"></span>
                    </div>
                    <div class="option-item">
                        <input type="text" name="options${questionCount}[]" placeholder="Option B" class="option-input" value="${data && data.options && data.options[1] ? data.options[1] : ''}">
                        <div class="option-checkbox-wrapper">
                            <input type="checkbox" name="answers${questionCount}[]" id="answerB${questionCount}" value="1" class="option-checkbox" ${data && data.correctOption === 'b' ? 'checked' : ''}>
                            <label for="answerB${questionCount}" class="checkbox-label"></label>
                        </div>
                        <span class="validation-message"></span>
                    </div>
                    <div class="option-item">
                        <input type="text" name="options${questionCount}[]" placeholder="Option C" class="option-input" value="${data && data.options && data.options[2] ? data.options[2] : ''}">
                        <div class="option-checkbox-wrapper">
                            <input type="checkbox" name="answers${questionCount}[]" id="answerC${questionCount}" value="2" class="option-checkbox" ${data && data.correctOption === 'c' ? 'checked' : ''}>
                            <label for="answerC${questionCount}" class="checkbox-label"></label>
                        </div>
                        <span class="validation-message"></span>
                    </div>
                    <div class="option-item">
                        <input type="text" name="options${questionCount}[]" placeholder="Option D" class="option-input" value="${data && data.options && data.options[3] ? data.options[3] : ''}">
                        <div class="option-checkbox-wrapper">
                            <input type="checkbox" name="answers${questionCount}[]" id="answerD${questionCount}" value="3" class="option-checkbox" ${data && data.correctOption === 'd' ? 'checked' : ''}>
                            <label for="answerD${questionCount}" class="checkbox-label"></label>
                        </div>
                        <span class="validation-message"></span>
                    </div>
                </div>
            </div>
        `;

        // Add event listener to remove button
        const removeBtn = questionItem.querySelector('.btn-remove-question');
        removeBtn.addEventListener('click', () => {
            this.removeQuestion(removeBtn);
        });

        // Add event listeners to option inputs for checkbox visibility
        const optionInputs = questionItem.querySelectorAll('.option-input');
        optionInputs.forEach(input => {
            input.addEventListener('focus', () => {
                // Hide checkbox when user starts typing
                const wrapper = input.nextElementSibling;
                if (wrapper && wrapper.classList.contains('option-checkbox-wrapper')) {
                    wrapper.style.opacity = '0';
                    wrapper.style.pointerEvents = 'none';
                }
            });
            
            input.addEventListener('blur', () => {
                // Show checkbox when user clicks outside
                const wrapper = input.nextElementSibling;
                if (wrapper && wrapper.classList.contains('option-checkbox-wrapper')) {
                    wrapper.style.opacity = '1';
                    wrapper.style.pointerEvents = 'auto';
                }
            });
        });

        // Add event listeners to checkboxes to ensure only one can be selected and handle highlighting
        const checkboxes = questionItem.querySelectorAll(`input[name="answers${questionCount}[]"]`);
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    // Uncheck all other checkboxes in this question
                    checkboxes.forEach(otherCheckbox => {
                        if (otherCheckbox !== checkbox) {
                            otherCheckbox.checked = false;
                        }
                        // Remove highlighting from all option items
                        const otherOptionItem = otherCheckbox.closest('.option-item');
                        if (otherOptionItem) {
                            otherOptionItem.classList.remove('selected');
                        }
                    });
                    
                    // Add highlighting to selected option item
                    const selectedOptionItem = checkbox.closest('.option-item');
                    if (selectedOptionItem) {
                        selectedOptionItem.classList.add('selected');
                    }
                } else {
                    // Remove highlighting when unchecked
                    const optionItem = checkbox.closest('.option-item');
                    if (optionItem) {
                        optionItem.classList.remove('selected');
                    }
                }
            });
        });

        container.appendChild(questionItem);

        // Show remove button for all questions if more than 1
        if (questionCount > 1) {
            container.querySelectorAll('.btn-remove-question').forEach(btn => {
                btn.style.display = 'block';
            });
        }
    }

    removeQuestion(button) {
        const questionItem = button.closest('.question-item');
        const container = document.getElementById('questionsContainer');

        questionItem.remove();

        // Re-number remaining questions
        const remainingQuestions = container.querySelectorAll('.question-item');
        remainingQuestions.forEach((item, index) => {
            const questionNumber = item.querySelector('.question-number');
            questionNumber.textContent = `Question ${index + 1}`;

            // Update input names for options
            const options = item.querySelectorAll('input[name^="options"]');
            options.forEach(option => {
                const currentName = option.name;
                const newNumber = index + 1;
                option.name = `options${newNumber}[]`;
            });
        });

        // Hide remove button if only 1 question remains
        if (remainingQuestions.length === 1) {
            remainingQuestions[0].querySelector('.btn-remove-question').style.display = 'none';
        }
    }

    switchPage(pageName) {
        // Update navigation (only if navigation item exists)
        const navItem = document.querySelector(`[data-page="${pageName}"]`);
        if (navItem) {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            navItem.classList.add('active');
        }

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Manage quiz expiry monitoring based on page
        if (pageName === 'quiz') {
            // Start monitoring when on quiz page
            this.startQuizExpiryMonitoring();
        } else {
            // Stop monitoring when leaving quiz page
            this.stopQuizExpiryMonitoring();
        }

        // Load page-specific data (only for pages that need fresh data)
        if (pageName === 'students') {
            this.loadStudents();
        } else if (pageName === 'availability') {
            this.loadAvailability();
        } else if (pageName === 'holidays') {
            this.loadHolidays();
        } else if (pageName === 'sessions') {
            this.loadSessions();
        }
        // Note: Removed loadQuizzes() call to prevent UI changes when returning to quiz page
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = ''; // Re-enable scrolling
            }, 300); // Match this with CSS transition duration
        }

        // Reset Add Student form when closing
        if (modalId === 'addStudentModal') {
            this.resetAddStudentForm();
        }
    }

    setupProfileImageUpload() {
        const profileImageInput = document.getElementById('profileImage');
        const profileCircle = document.querySelector('.profile-circle');
        const uploadIcon = document.querySelector('.upload-icon-small');

        if (profileImageInput && profileCircle && uploadIcon) {
            // Handle circle click
            profileCircle.addEventListener('click', () => {
                profileImageInput.click();
            });

            // Handle upload icon click
            uploadIcon.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent circle click event
                profileImageInput.click();
            });

            profileImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        profileCircle.innerHTML = `
                            <img src="${e.target.result}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                        `;
                        // Re-add the upload icon after image is set
                        const newUploadIcon = document.createElement('div');
                        newUploadIcon.className = 'upload-icon-small';
                        newUploadIcon.innerHTML = '<i class="fas fa-arrow-up"></i>';
                        newUploadIcon.addEventListener('click', (e) => {
                            e.stopPropagation();
                            profileImageInput.click();
                        });
                        profileCircle.appendChild(newUploadIcon);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    setupEditProfileImageUpload() {
        const profileImageInput = document.getElementById('editStudentProfileImage');
        const profileCircle = document.getElementById('editStudentProfileCircle');

        if (profileImageInput && profileCircle) {
            // Handle circle click
            profileCircle.addEventListener('click', () => {
                profileImageInput.click();
            });

            // Handle upload icon click
            const uploadIcon = profileCircle.querySelector('.upload-icon-small');
            if (uploadIcon) {
                uploadIcon.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent circle click event
                    profileImageInput.click();
                });
            }

            profileImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        profileCircle.innerHTML = `
                            <img src="${e.target.result}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
                        `;
                        // Re-add the upload icon after image is set
                        const newUploadIcon = document.createElement('div');
                        newUploadIcon.className = 'upload-icon-small';
                        newUploadIcon.innerHTML = '<i class="fas fa-arrow-up"></i>';
                        newUploadIcon.addEventListener('click', (e) => {
                            e.stopPropagation();
                            profileImageInput.click();
                        });
                        profileCircle.appendChild(newUploadIcon);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    resetAddStudentForm() {
        const form = document.getElementById('addStudentForm');
        if (!form) return;

        // Reset all input fields
        form.reset();

        // Clear validation messages
        const validationMessages = form.querySelectorAll('.validation-message');
        validationMessages.forEach(msg => msg.textContent = '');

        // Remove error classes
        const errorFields = form.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));

        // Reset profile image to default state
        const profileCircle = document.querySelector('.profile-circle');
        if (profileCircle) {
            profileCircle.innerHTML = `
                <div class="profile-placeholder">
                    <span>Profile</span>
                    <div class="upload-icon-small">
                        <i class="fas fa-arrow-up"></i>
                    </div>
                </div>
            `;
        }

        // Reset file input
        const profileImageInput = document.getElementById('profileImage');
        if (profileImageInput) {
            profileImageInput.value = '';
        }

        // Re-setup profile image upload functionality
        this.setupProfileImageUpload();
    }

    showLoading() {
        document.getElementById('loading').classList.add('show');
    }

    hideLoading() {
        document.getElementById('loading').classList.remove('show');
    }

    showMessage(text, type = 'info') {
        const container = document.getElementById('messages');
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${text}</span>
        `;

        container.appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 5000);
    }

    async apiCall(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        if (data instanceof FormData) {
            delete config.headers['Content-Type'];
            config.body = data;
        } else if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, config);

            let result = null;
            const contentType = response.headers.get('content-type');

            // Try to parse JSON safely
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                result = { message: text };
            }

            // ✅ IMPORTANT FIX: preserve backend message
            if (!response.ok) {
                const error = new Error(
                    result?.message || `Request failed with status ${response.status}`
                );
                error.status = response.status;
                throw error;
            }

            return result;

        } catch (error) {
            console.error('API call failed:', error);

            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error(
                    'Network error: Unable to connect to server. Please check if the server is running.'
                );
            } else if (error.name === 'AbortError') {
                throw new Error(
                    'Request timeout: Server took too long to respond.'
                );
            } else {
                // ✅ forward backend message
                throw error;
            }
        }
    }

    logout() {
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    }

    async deleteStudent(studentId) {
        // Show custom delete confirmation modal
        this.showDeleteConfirmModal(studentId, 'student');
    }

    showDeleteConfirmModal(id, type) {
        const modal = document.getElementById('deleteConfirmModal');
        const message = document.getElementById('deleteConfirmMessage');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        // Set message based on type
        if (type === 'student') {
            message.textContent = 'Are you sure you want to delete this student? This action cannot be undone.';
        } else if (type === 'quiz') {
            message.textContent = 'Are you sure you want to delete this quiz? This action cannot be undone.';
        } else if (type === 'holiday') {
            message.textContent = 'Are you sure you want to delete this holiday? This action cannot be undone.';
        } else if (type === 'session') {
            message.textContent = 'Are you sure you want to delete this session? This action cannot be undone.';
        }

        // Set up confirm button click handler
        confirmBtn.onclick = async () => {
            this.hideDeleteConfirmModal();
            await this.executeDelete(id, type);
        };

        // Show modal
        modal.classList.add('show');
    }

    hideDeleteConfirmModal() {
        const modal = document.getElementById('deleteConfirmModal');
        modal.classList.remove('show');
    }

    async executeDelete(id, type) {
        if (type === 'student') {
            try {
                this.showLoading();
                const response = await this.apiCall(`/teachers/students/${id}`, 'DELETE');

                if (response.success) {
                    this.showMessage('Student deleted successfully', 'success');
                    await this.loadStudents();
                    await this.loadStats();
                } else {
                    this.showMessage(response.message || 'Failed to delete student', 'error');
                }
            } catch (error) {
                console.error('Error deleting student:', error);
                const customErrorMessage = this.getCustomErrorMessage(error, 'Student deletion');
                this.showMessage(customErrorMessage, 'error');
            } finally {
                this.hideLoading();
            }
        } else if (type === 'quiz') {
            try {
                this.showLoading();
                const response = await this.apiCall(`/quizzes/${id}`, 'DELETE');

                if (response.success || response.message) {
                    this.showMessage('Quiz deleted successfully', 'success');
                    await this.refreshQuizzes(); // Use refreshQuizzes instead of loadQuizzes
                } else {
                    this.showMessage(response.message || 'Failed to delete quiz', 'error');
                }
            } catch (error) {
                console.error('Error deleting quiz:', error);
                this.showMessage('Error deleting quiz', 'error');
            } finally {
                this.hideLoading();
            }
        } else if (type === 'holiday') {
            try {
                this.showLoading();
                const response = await this.apiCall(`/teacher-availability/holidays/${id}`, 'DELETE');

                if (response.success) {
                    this.showMessage('Holiday deleted successfully', 'success');
                    this.loadHolidays();
                } else {
                    this.showMessage(response.message || 'Failed to delete holiday', 'error');
                }
            } catch (error) {
                console.error('Error deleting holiday:', error);
                this.showMessage('Error deleting holiday: ' + (error.message || 'Unknown error'), 'error');
            } finally {
                this.hideLoading();
            }
        } else if (type === 'session') {
            try {
                this.showLoading();
                const response = await this.apiCall(`/sessions/teacher/${id}`, 'DELETE');

                if (response.success) {
                    this.showMessage('Session deleted successfully', 'success');
                    this.loadSessions();
                } else {
                    this.showMessage(response.message || 'Failed to delete session', 'error');
                }

            } catch (error) {
                console.error('Error deleting session:', error);

                // ✅ CUSTOM USER FRIENDLY MESSAGE
                if (
                    error.message &&
                    error.message.includes('Cannot delete session with booked slots')
                ) {
                    this.showMessage(
                        'Cannot delete session with existing booking.',
                        'error'
                    );
                } else {
                    this.showMessage(
                        'Unable to delete session. Please try again later.',
                        'error'
                    );
                }

            } finally {
                this.hideLoading();
            }
        }
    }

    async editStudent(studentId) {
        try {
            const response = await this.apiCall(`/teachers/students/${studentId}`, 'GET');

            if (response.success) {
                const student = response.data;

                // ✅ FIX 1: Prepare Profile Image URL (fallback support)
                const imagePath =
                    student.profileImage ||
                    student.image ||
                    student.profileImageUrl ||
                    student.avatar ||
                    student.photo ||
                    "";

                let finalImageUrl = "/images/default-avatar.png"; // ✅ fallback

                if (imagePath && imagePath !== "") {
                    if (imagePath.startsWith("http")) {
                        finalImageUrl = imagePath;
                    } else {
                        // ✅ If backend already returns "/uploads/xyz.jpg"
                        finalImageUrl = imagePath.startsWith("/")
                            ? imagePath
                            : `/uploads/${imagePath}`;
                    }
                }

                // ✅ Add in object so modal can directly use it
                student.finalProfileImageUrl = finalImageUrl;
                // ✅ Show modal
                this.showEditStudentModal(student);

            } else {
                this.showMessage(
                    `Failed to load student: ${response.message || 'Unknown error'}`,
                    'error'
                );
            }
        } catch (error) {
            console.error('Error loading student data:', error);
            this.showMessage('Error loading student data', 'error');
        }
    }

    showEditStudentModal(student) {
        const modal = document.getElementById('editStudentModal');
        if (!modal) {
            this.createEditStudentModal();
            this.showEditStudentModal(student);
            return;
        }

        // Fill form with student data
        document.getElementById('editStudentId').value = student._id;
        document.getElementById('editStudentUserId').value = student.userId;
        document.getElementById('editStudentName').value = student.name;
        document.getElementById('editStudentEmail').value = student.email;
        document.getElementById('editStudentMobile').value = student.mobileNumber || '';
        document.getElementById('editStudentClass').value = student.class || '';
        document.getElementById('editStudentCity').value = student.city || '';
        document.getElementById('editStudentState').value = student.state || '';
        document.getElementById('editStudentTimezone').value = student.timezone || 'Asia/Kolkata';

        // Set current profile image
        const profileCircle = document.getElementById('editStudentProfileCircle');
        if (profileCircle && student.finalProfileImageUrl) {
            profileCircle.innerHTML = `
                <img src="${student.finalProfileImageUrl}" alt="${student.name}'s Profile" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
            `;
            // Re-add the upload icon
            const newUploadIcon = document.createElement('div');
            newUploadIcon.className = 'upload-icon-small';
            newUploadIcon.innerHTML = '<i class="fas fa-arrow-up"></i>';
            newUploadIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('editStudentProfileImage').click();
            });
            profileCircle.appendChild(newUploadIcon);
        }

        // Clear validation messages
        const form = document.getElementById('editStudentForm');
        this.clearFormValidation(form);

        // Re-setup profile image upload functionality
        this.setupEditProfileImageUpload();

        this.showModal('editStudentModal');
    }


    validateStudentForm(form) {
        let isValid = true;

        form.querySelectorAll('.validation-message').forEach(msg => {
            msg.textContent = '';
        });
        form.querySelectorAll('input, select').forEach(field => {
            field.classList.remove('error');
        });

        const requiredFields = form.querySelectorAll('[data-required="true"]');

        requiredFields.forEach(field => {
            const value = field.value.trim();
            const validationMessage = field.parentElement.querySelector('.validation-message');

            if (!value) {
                let message = 'This field is required';

                if (field.name === 'userId') message = 'User ID is required';
                else if (field.name === 'name') message = 'Full name is required';
                else if (field.name === 'email') message = 'Email is required';
                else if (field.name === 'password') message = 'Password is required';
                else if (field.name === 'age') message = 'Age is required';
                else if (field.name === 'mobileNumber') message = 'Mobile number is required';
                else if (field.name === 'city') message = 'City is required';
                else if (field.name === 'state') message = 'State is required';
                else if (field.name === 'country') message = 'Country is required';
                else if (field.name === 'timezone') message = 'Timezone is required';
                else if (field.name === 'class') message = 'Class is required';

                validationMessage.textContent = message;
                field.classList.add('error');
                isValid = false;
            } else {
                if (field.name === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        validationMessage.textContent = 'Please enter a valid email address';
                        field.classList.add('error');
                        isValid = false;
                    }
                } else if (field.name === 'mobileNumber') {
                    const phoneRegex = /^\d{10}$/;
                    if (!phoneRegex.test(value)) {
                        validationMessage.textContent = 'Mobile number must be exactly 10 digits';
                        field.classList.add('error');
                        isValid = false;
                    }
                } else if (field.name === 'age') {
                    const age = parseInt(value);
                    if (age < 1 || age > 120) {
                        validationMessage.textContent = 'Age must be between 1 and 120';
                        field.classList.add('error');
                        isValid = false;
                    }
                }
            }
        });

        return isValid;
    }

    clearFormValidation(formOrFormId) {
        let form;
        if (typeof formOrFormId === 'string') {
            form = document.getElementById(formOrFormId);
        } else {
            form = formOrFormId;
        }

        if (!form) return;

        // Clear all field errors
        form.querySelectorAll('input, select').forEach(field => {
            field.classList.remove('error');
        });

        // Clear all validation messages
        form.querySelectorAll('.validation-message').forEach(message => {
            message.textContent = '';
        });
    }

    clearFieldValidation(field) {
        field.classList.remove('error');
        const validationMessage = field.parentElement.querySelector('.validation-message');
        if (validationMessage) {
            validationMessage.textContent = '';
        }
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('error');
        }

        // Handle special case for availability error which has a dedicated container
        let errorContainer;
        if (fieldId === 'sessionAvailabilityError') {
            errorContainer = document.getElementById('sessionAvailabilityError');
        } else {
            const fieldElement = document.getElementById(fieldId);
            if (fieldElement) {
                errorContainer = fieldElement.parentElement.querySelector('.validation-message');
            }
        }

        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.style.color = '#E53935';
            errorContainer.style.fontSize = '14px';
            errorContainer.style.marginTop = '5px';
        }
    }

    createEditStudentModal() {
        const modalHtml = `
        <div class="modal" id="editStudentModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Student</h3>
                    <button class="modal-close" id="closeEditStudentModal">&times;</button>
                </div>
                <form id="editStudentForm" enctype="multipart/form-data" novalidate>
                    <input type="hidden" id="editStudentId" name="id">
                    
                    <!-- Basic Info Section -->
                    <div class="form-section">
                        <div class="section-header">
                            <h4>Basic Info</h4>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editStudentUserId">User ID *</label>
                                <input type="text" id="editStudentUserId" name="userId" placeholder="Enter User ID" data-required="true">
                                <span class="validation-message"></span>
                            </div>
                            <div class="form-group">
                                <label for="editStudentName">Full Name *</label>
                                <input type="text" id="editStudentName" name="name" placeholder="Enter Full Name" data-required="true">
                                <span class="validation-message"></span>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editStudentEmail">Email *</label>
                                <input type="email" id="editStudentEmail" name="email" placeholder="Enter Email Address" data-required="true">
                                <span class="validation-message"></span>
                            </div>
                        </div>
                    </div>

                    <!-- Contact Info Section -->
                    <div class="form-section">
                        <div class="section-header">
                            <h4>Contact Info</h4>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editStudentMobile">Mobile *</label>
                                <input type="tel" id="editStudentMobile" name="mobileNumber" placeholder="10-digit number" maxlength="10" data-required="true">
                                <span class="validation-message"></span>
                            </div>
                            <div class="form-group">
                                <label for="editStudentCity">City *</label>
                                <input type="text" id="editStudentCity" name="city" placeholder="City" data-required="true">
                                <span class="validation-message"></span>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editStudentState">State *</label>
                                <input type="text" id="editStudentState" name="state" placeholder="State" data-required="true">
                                <span class="validation-message"></span>
                            </div>
                        </div>
                    </div>

                    <!-- Academic Info Section -->
                    <div class="form-section">
                        <div class="section-header">
                            <h4>Academic Info</h4>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editStudentClass">Class *</label>
                                <select id="editStudentClass" name="class" data-required="true">
                                    <option value="">Select Class</option>
                                    <option value="1st">1st</option>
                                    <option value="2nd">2nd</option>
                                    <option value="3rd">3rd</option>
                                    <option value="4th">4th</option>
                                    <option value="5th">5th</option>
                                    <option value="6th">6th</option>
                                    <option value="7th">7th</option>
                                    <option value="8th">8th</option>
                                    <option value="9th">9th</option>
                                    <option value="10th">10th</option>
                                    <option value="11th">11th</option>
                                    <option value="12th">12th</option>
                                </select>
                                <span class="validation-message"></span>
                            </div>
                            <div class="form-group">
                                <label for="editStudentTimezone">Timezone</label>
                                <select id="editStudentTimezone" name="timezone">
                                 <option value="">Select Timezone</option>
                                    <option value="Asia/Kolkata">India - Asia/Kolkata</option>
                                    <option value="America/New_York">USA East - America/New_York</option>
                                    <option value="America/Los_Angeles">USA West - America/Los_Angeles</option>
                                    <option value="America/Chicago">USA Central - America/Chicago</option>
                                    <option value="America/Denver">USA Mountain - America/Denver</option>
                                    <option value="Europe/London">UK - Europe/London</option>
                                    <option value="Europe/Paris">France - Europe/Paris</option>
                                    <option value="Europe/Berlin">Germany - Europe/Berlin</option>
                                    <option value="Europe/Moscow">Russia - Europe/Moscow</option>
                                    <option value="Asia/Tokyo">Japan - Asia/Tokyo</option>
                                    <option value="Asia/Shanghai">China - Asia/Shanghai</option>
                                    <option value="Asia/Hong_Kong">Hong Kong - Asia/Hong_Kong</option>
                                    <option value="Asia/Singapore">Singapore - Asia/Singapore</option>
                                    <option value="Asia/Dubai">UAE - Asia/Dubai</option>
                                    <option value="Australia/Sydney">Australia East - Australia/Sydney</option>
                                    <option value="Australia/Melbourne">Australia - Australia/Melbourne</option>
                                    <option value="Australia/Perth">Australia West - Australia/Perth</option>
                                    <option value="Pacific/Auckland">New Zealand - Pacific/Auckland</option>
                                    <option value="America/Toronto">Canada - America/Toronto</option>
                                    <option value="America/Vancouver">Canada West - America/Vancouver</option>
                                    <option value="America/Mexico_City">Mexico - America/Mexico_City</option>
                                    <option value="America/Sao_Paulo">Brazil - America/Sao_Paulo</option>
                                    <option value="Europe/Rome">Italy - Europe/Rome</option>
                                    <option value="Europe/Madrid">Spain - Europe/Madrid</option>
                                    <option value="Asia/Seoul">South Korea - Asia/Seoul</option>
                                    <option value="Asia/Bangkok">Thailand - Asia/Bangkok</option>
                                    <option value="Asia/Jakarta">Indonesia - Asia/Jakarta</option>
                                    <option value="Africa/Cairo">Egypt - Africa/Cairo</option>
                                    <option value="Africa/Johannesburg">South Africa - Africa/Johannesburg</option>
                                </select>
                                <span class="validation-message"></span>
                            </div>
                        </div>
                    </div>

                    <!-- Profile Image Section -->
                    <div class="form-section">
                        <div class="section-header">
                            <h4>Profile Image</h4>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editStudentProfileImage">Profile Image</label>
                                <div class="profile-image-upload-simple">
                                    <div class="profile-circle" id="editStudentProfileCircle">
                                        <div class="profile-placeholder">
                                            <span>Profile</span>
                                            <div class="upload-icon-small">
                                                <i class="fas fa-arrow-up"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <input type="file" id="editStudentProfileImage" name="profileImage" accept="image/*" class="profile-input-simple">
                                </div>
                                <span class="validation-message"></span>
                            </div>
                        </div>
                    </div>

                    <!-- Form Actions -->
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" id="cancelEditBtn">Cancel</button>
                        <button type="submit" class="btn-primary">Update Student</button>
                    </div>
                </form>
            </div>
        </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listeners for the new modal
        document.getElementById('closeEditStudentModal').addEventListener('click', () => {
            this.hideModal('editStudentModal');
        });

        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.hideModal('editStudentModal');
        });

        // Setup profile image upload for edit form
        this.setupEditProfileImageUpload();

        const editForm = document.getElementById("editStudentForm");

        const newForm = editForm.cloneNode(true);
        editForm.parentNode.replaceChild(newForm, editForm);

        // Add real-time validation for edit form fields
        newForm.querySelectorAll('input, select').forEach(field => {
            field.addEventListener('input', () => {
                this.clearFieldValidation(field);
            });
            field.addEventListener('change', () => {
                this.clearFieldValidation(field);
            });
        });

        newForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (this.validateStudentForm(newForm)) {
                this.updateStudent(newForm);
            }
        });

        // Close modal on background click
        document.getElementById('editStudentModal').addEventListener('click', (e) => {
            if (e.target.id === 'editStudentModal') {
                this.hideModal('editStudentModal');
            }
        });
    }

    async updateStudent(form) {
        const formData = new FormData(form);

        const studentId = formData.get("id") || document.getElementById("editStudentId")?.value;

        if (!studentId) {
            this.showMessage("Student ID missing. Cannot update.", "error");
            return;
        }

        const password = formData.get("password");
        if (!password || password.trim() === "") {
            formData.delete("password");
        }

        const studentClass = formData.get("class");
        if (!studentClass || studentClass.trim() === "") {
            formData.delete("class");
        }

        try {
            this.showLoading();

            const response = await this.apiCall(`/teachers/students/${studentId}`, 'PUT', formData);

            if (response.success) {
                this.showMessage('Student updated successfully', 'success');
                this.hideModal('editStudentModal');
                await this.loadStudents();
            } else {
                this.showMessage(response.message || 'Failed to update student', 'error');
            }
        } catch (error) {
            console.error('Error updating student:', error);
            const customErrorMessage = this.getCustomErrorMessage(error, 'Student update');
            this.showMessage(customErrorMessage, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteQuiz(quizId) {
        this.showDeleteConfirmModal(quizId, 'quiz');
    }

    async editQuiz(quizId) {
        try {
            // First check if quiz is loaded in current data
            const quiz = this.currentQuizzes?.find(q => q._id === quizId);
            
            if (quiz) {
                // Check edit validation for published quizzes
                const isDraft = quiz.status === 'draft';
                const now = new Date();
                const startTime = quiz.startTime ? new Date(quiz.startTime) : null;
                const isStarted = !isDraft && startTime && startTime <= now;
                
                if (!isDraft && isStarted) {
                    this.showMessage('Cannot edit published quiz after start time', 'error');
                    return;
                }
            }
            
            this.showLoading();
            const response = await this.apiCall(`/quizzes/${quizId}`, 'GET');

            if (response.success || response._id) {
                const quizData = response.data || response;
                
                // Double-check validation with fresh data
                const isDraft = quizData.status === 'draft';
                const startTime = quizData.startTime ? new Date(quizData.startTime) : null;
                const currentTime = new Date();
                const isStarted = !isDraft && startTime && startTime <= currentTime;
                
                if (!isDraft && isStarted) {
                    this.showMessage('Cannot edit published quiz after start time', 'error');
                    return;
                }
                
                this.populateAndShowQuizForm(quizData);
            } else {
                this.showMessage(response.message || 'Failed to load quiz', 'error');
            }
        } catch (error) {
            console.error('Error loading quiz:', error);
            this.showMessage('Error loading quiz', 'error');
        } finally {
            this.hideLoading();
        }
    }

    populateAndShowQuizForm(quiz) {
        const form = document.getElementById('createQuizForm');
        if (!form) return;

        // Reset form first
        form.reset();
        this.clearFormValidation(form);

        // 1. Populate Basic Info
        document.getElementById('quizId').value = quiz._id;
        document.getElementById('quizTitle').value = quiz.title || '';
        document.getElementById('quizSubject').value = quiz.subject || '';
        document.getElementById('quizClass').value = quiz.class || '';
        document.getElementById('quizDuration').value = quiz.duration || '';
        
        // Store original quiz status to preserve it during updates
        const originalStatusInput = document.getElementById('originalQuizStatus');
        if (originalStatusInput) {
            originalStatusInput.value = quiz.status;
        } else {
            // Create hidden field if it doesn't exist
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.id = 'originalQuizStatus';
            hiddenInput.name = 'originalQuizStatus';
            hiddenInput.value = quiz.status;
            form.appendChild(hiddenInput);
        }

        // 2. Populate Dates
        if (quiz.startTime) {
            document.getElementById('quizStartTime').value = this.formatDateForInput(quiz.startTime);
        }
        if (quiz.endTime) {
            document.getElementById('quizEndTime').value = this.formatDateForInput(quiz.endTime);
        }

        // 3. Populate Questions
        const container = document.getElementById('questionsContainer');
        if (container) {
            container.innerHTML = ''; // Clear existing questions

            if (quiz.questions && quiz.questions.length > 0) {
                quiz.questions.forEach(question => {
                    this.addQuizQuestion(question);
                });
            } else {
                this.addQuizQuestion(); // Add one empty if none
            }
        }

        // 4. Update UI State (Show Form, Hide List)
        const quizMainCard = document.querySelector('.quiz-main-card');
        if (quizMainCard) {
            quizMainCard.style.display = 'none';
        }

        const quizMainHeader = document.getElementById('quizMainPageHeader');
        if (quizMainHeader) {
            quizMainHeader.style.display = 'none';
        }

        document.getElementById('quizFormHeader').style.display = 'flex';
        document.getElementById('quizCreationForm').style.display = 'block';

        // 5. Update Header and Button Text based on quiz status
        const headerText = document.querySelector('#quizFormHeader h2');
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        const updateDraftBtn = document.getElementById('updateDraftBtn');
        const publishBtn = document.getElementById('publishQuizBtn');

        const isDraft = quiz.status === 'draft';

        if (isDraft) {
            if (headerText) headerText.innerHTML = '<i class="fas fa-edit"></i> Edit Quiz';
            if (saveDraftBtn) saveDraftBtn.style.display = 'none';
            if (updateDraftBtn) updateDraftBtn.style.display = 'inline-block';
            if (publishBtn) publishBtn.style.display = 'inline-block';
        } else {
            if (headerText) headerText.innerHTML = '<i class="fas fa-edit"></i> Edit Quiz';
            if (saveDraftBtn) saveDraftBtn.style.display = 'inline-block';
            if (updateDraftBtn) updateDraftBtn.style.display = 'inline-block';
            if (publishBtn) publishBtn.style.display = 'none';
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        this.setMinDateForQuizInputs();
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Format: YYYY-MM-DDTHH:mm
        const pad = (num) => num.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    setMinDateForQuizInputs() {
        const startInput = document.getElementById('quizStartTime');
        const endInput = document.getElementById('quizEndTime');

        if (!startInput || !endInput) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

        startInput.min = currentDateTime;
        endInput.min = currentDateTime;

        // Ensure end time min is at least start time
        startInput.addEventListener('input', () => {
            if (startInput.value) {
                endInput.min = startInput.value;
            } else {
                endInput.min = currentDateTime;
            }
        });

        // Initial check if value exists
        if (startInput.value) {
            endInput.min = startInput.value;
        }
    }

    showEditProfileModal() {
        if (!this.teacher) {
            this.showMessage('Teacher profile not loaded', 'error');
            return;
        }

        // Fill form with current teacher data
        document.getElementById('editName').value = this.teacher.name || '';
        document.getElementById('editEmail').value = this.teacher.email || '';
        document.getElementById('editMobileNumber').value = this.teacher.mobileNumber || '';
        document.getElementById('editCity').value = this.teacher.city || '';
        document.getElementById('editState').value = this.teacher.state || '';
        document.getElementById('editCountry').value = this.teacher.country || '';

        // Set current profile image if exists
        const currentImageElement = document.getElementById('currentProfileImage');
        if (currentImageElement) {
            currentImageElement.src = this.teacher.profileImage || '/images/default-avatar.png';
            currentImageElement.alt = `${this.teacher.name}'s Profile`;
        }

        this.showModal('editProfileModal');
    }

    async updateProfile(form) {
        const formData = new FormData(form);

        const mobileNumber = formData.get('mobileNumber');
        if (mobileNumber && !/^[6-9]\d{9}$/.test(mobileNumber)) {
            this.showMessage('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9', 'error');
            return;
        }

        try {
            this.showLoading();
            const response = await this.apiCall('/teachers/me/profile', 'PUT', formData);

            if (response.message || response.teacher) {
                this.showMessage('Profile updated successfully', 'success');
                this.hideModal('editProfileModal');

                await this.loadTeacherProfile();

                form.reset();
            } else {
                this.showMessage(response.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showMessage('Error updating profile', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async showAddHolidayModal() {
        const modal = document.getElementById('addHolidayModal');
        if (modal) {
            modal.classList.add('show');
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('startDate').min = today;
            document.getElementById('endDate').min = today;
            document.getElementById('singleDate').min = today;

            const setHolidaysForm = document.getElementById('setHolidaysForm');
            if (setHolidaysForm) {
                setHolidaysForm.querySelectorAll('input, select').forEach(field => {
                    field.addEventListener('input', () => {
                        this.clearFieldValidation(field);
                    });
                    field.addEventListener('change', () => {
                        this.clearFieldValidation(field);
                    });
                });
            }

            const singleDayHolidayForm = document.getElementById('singleDayHolidayForm');
            if (singleDayHolidayForm) {
                singleDayHolidayForm.querySelectorAll('input, select').forEach(field => {
                    field.addEventListener('input', () => {
                        this.clearFieldValidation(field);
                    });
                    field.addEventListener('change', () => {
                        this.clearFieldValidation(field);
                    });
                });
            }

            this.showSetHolidaysCard();
        }
    }

    hideHolidayModal() {
        const modal = document.getElementById('addHolidayModal');
        if (modal) {
            modal.classList.remove('show');
            const setHolidaysForm = document.getElementById('setHolidaysForm');
            const singleDayHolidayForm = document.getElementById('singleDayHolidayForm');
            if (setHolidaysForm) setHolidaysForm.reset();
            if (singleDayHolidayForm) singleDayHolidayForm.reset();
            this.showSetHolidaysCard();
        }
    }

    showSetHolidaysCard() {
        const setHolidaysCard = document.getElementById('setHolidaysCard');
        const singleDayHolidayCard = document.getElementById('singleDayHolidayCard');
        const singleDayHolidayCheckbox = document.getElementById('singleDayHolidayCheckbox');

        if (setHolidaysCard) setHolidaysCard.style.display = 'block';
        if (singleDayHolidayCard) singleDayHolidayCard.style.display = 'none';
        if (singleDayHolidayCheckbox) singleDayHolidayCheckbox.checked = false;
    }

    handleSingleDayHolidayToggle() {
        const checkbox = document.getElementById('singleDayHolidayCheckbox');
        const endDateGroup = document.getElementById('endDateGroup');
        const endDateInput = document.getElementById('endDate');
        const setHolidaysForm = document.getElementById('setHolidaysForm');
        const singleDayHolidayForm = document.getElementById('singleDayHolidayForm');
        const startDateLabel = document.querySelector('label[for="startDate"]');

        if (!checkbox || !endDateGroup || !endDateInput || !setHolidaysForm || !singleDayHolidayForm) {
            console.error('Required holiday form elements not found');
            return;
        }

        if (checkbox.checked) {
            endDateGroup.classList.add('hidden');
            endDateInput.required = false;
            endDateInput.value = '';

            if (startDateLabel) {
                startDateLabel.textContent = 'Holiday Date *';
            }

            setHolidaysForm.style.display = 'none';
            singleDayHolidayForm.style.display = 'flex';
            singleDayHolidayForm.style.flexDirection = 'column';
            singleDayHolidayForm.style.gap = '16px';
        } else {
            endDateGroup.classList.remove('hidden');
            endDateInput.required = true;

            if (startDateLabel) {
                startDateLabel.textContent = 'Start Date *';
            }

            setHolidaysForm.style.display = 'flex';
            setHolidaysForm.style.flexDirection = 'column';
            setHolidaysForm.style.gap = '16px';
            singleDayHolidayForm.style.display = 'none';
        }
    }

    handleSetHolidaySubmit() {
        const checkbox = document.getElementById('singleDayHolidayCheckbox');
        const setHolidaysForm = document.getElementById('setHolidaysForm');
        const singleDayHolidayForm = document.getElementById('singleDayHolidayForm');

        if (checkbox.checked) {
            if (this.validateHolidayForm('singleDayHolidayForm')) {
                this.addSingleDayHoliday();
            }
        } else {
            if (this.validateHolidayForm('setHolidaysForm')) {
                this.addSetHoliday();
            }
        }
    }


    validateHolidayForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;

        // Clear all previous validation messages
        this.clearFormValidation(formId);

        let isValid = true;

        if (formId === 'setHolidaysForm') {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const reason = document.getElementById('holidayReason').value;

            if (!startDate) {
                this.showFieldError('startDate', 'Start date is required');
                isValid = false;
            }

            if (!endDate) {
                this.showFieldError('endDate', 'End date is required');
                isValid = false;
            }

            if (!reason) {
                this.showFieldError('holidayReason', 'Please select a reason');
                isValid = false;
            }

            if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                this.showFieldError('endDate', 'End date must be after start date');
                isValid = false;
            }
        } else if (formId === 'singleDayHolidayForm') {
            const date = document.getElementById('singleDate').value;
            const reason = document.getElementById('singleDayReason').value;

            if (!date) {
                this.showFieldError('singleDate', 'Holiday date is required');
                isValid = false;
            }

            if (!reason) {
                this.showFieldError('singleDayReason', 'Please select a reason');
                isValid = false;
            }
        }

        return isValid;
    }

    async addSetHoliday() {
        if (!this.validateHolidayForm('setHolidaysForm')) {
            return;
        }

        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const reason = document.getElementById('holidayReason').value;
        const note = document.getElementById('holidayNote').value;

        try {
            this.showLoading();
            const response = await this.apiCall('/teacher-availability/holidays', 'POST', {
                startDate,
                endDate,
                reason,
                note: note || ''
            });

            if (response.success) {
                this.showMessage('Holiday added successfully!', 'success');
                this.hideHolidayModal();
                this.loadHolidays();
            } else {
                this.showMessage(response.message || 'Failed to add holiday', 'error');
            }
        } catch (error) {
            console.error('Error adding holiday:', error);
            this.showMessage('Error adding holiday: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            this.hideLoading();
        }
    }

    async addSingleDayHoliday() {
        if (!this.validateHolidayForm('singleDayHolidayForm')) {
            return;
        }

        const date = document.getElementById('singleDate').value;
        const reason = document.getElementById('singleDayReason').value;
        const note = document.getElementById('singleDayNote').value;

        try {
            this.showLoading();
            const response = await this.apiCall('/teacher-availability/holidays', 'POST', {
                startDate: date,
                endDate: date,
                reason,
                note: note || ''
            });

            if (response.success) {
                this.showMessage('Single-day holiday added successfully! 🎉', 'success');
                this.hideHolidayModal();
                this.loadHolidays();
            } else {
                this.showMessage(response.message || 'Failed to add holiday', 'error');
            }
        } catch (error) {
            console.error('Error adding holiday:', error);
            this.showMessage('Error adding holiday: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadHolidays() {
        try {
            const response = await this.apiCall('/teacher-availability/holidays', 'GET');

            if (response.success && response.holidays) {
                this.allHolidays = response.holidays;
                // Filter out past holidays
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
                const futureHolidays = response.holidays.filter(holiday => {
                    const holidayEndDate = new Date(holiday.endDate);
                    holidayEndDate.setHours(0, 0, 0, 0);
                    return holidayEndDate >= today;
                });
                this.displayHolidays(futureHolidays);
                this.updateHolidayStatistics(response.holidays);
                this.updateRecentHolidays(futureHolidays.slice(0, 3));
            } else {
                this.allHolidays = [];
                this.displayHolidays([]);
                this.updateHolidayStatistics([]);
                this.updateRecentHolidays([]);
            }
        } catch (error) {
            console.error('Error loading holidays:', error);
            this.allHolidays = [];
            this.displayHolidays([]);
            this.updateHolidayStatistics([]);
        }
    }

    updateHolidayStatistics(holidays) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Count total holidays (excluding past ones)
        const totalHolidays = holidays.filter(holiday => {
            const holidayEndDate = new Date(holiday.endDate);
            holidayEndDate.setHours(0, 0, 0, 0);
            return holidayEndDate >= today;
        }).length;

        // Count upcoming holidays (future dates)
        const upcomingHolidays = holidays.filter(holiday => {
            const holidayStartDate = new Date(holiday.startDate);
            holidayStartDate.setHours(0, 0, 0, 0);
            return holidayStartDate > today;
        }).length;

        // Count this month holidays
        const thisMonthHolidays = holidays.filter(holiday => {
            const holidayStartDate = new Date(holiday.startDate);
            const holidayEndDate = new Date(holiday.endDate);
            return (
                holidayStartDate.getMonth() === currentMonth &&
                holidayStartDate.getFullYear() === currentYear &&
                holidayEndDate >= today
            );
        }).length;

        // Update DOM elements
        document.getElementById('totalHolidaysCount').textContent = totalHolidays;
        document.getElementById('upcomingHolidaysCount').textContent = upcomingHolidays;
        document.getElementById('thisMonthHolidaysCount').textContent = thisMonthHolidays;
    }

    displayHolidays(holidays) {
        const container = document.getElementById('holidaysList');
        if (!container) return;

        if (holidays.length === 0) {
            container.innerHTML = `
                <div class="holidays-empty">
                    <i class="fas fa-calendar-times"></i>
                    <p>No holidays added yet</p>
                    <small>Click "Add Holiday" to create a new holiday</small>
                </div>
            `;
            return;
        }

        container.innerHTML = holidays.map(holiday => {
            const isPublic = holiday.reason === 'public' || holiday.reason === 'Public Holiday';
            const typeClass = isPublic ? 'public' : 'personal';
            const typeText = isPublic ? 'PUBLIC' : 'PERSONAL';

            return `
                <div class="holiday-card" data-holiday-item-id="${holiday._id}" data-type="${typeClass}">
                    <div class="holiday-header">
                        <span class="holiday-type ${typeClass}">${typeText}</span>
                        <button class="delete-holiday-btn" onclick="dashboard.deleteHoliday('${holiday._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="holiday-content">
                        <div class="holiday-date">
                            <i class="fas fa-calendar-alt"></i>
                            ${new Date(holiday.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            })}
                            ${holiday.startDate !== holiday.endDate ? ' - ' + new Date(holiday.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }) : ''}
                        </div>
                        <div class="holiday-description">
                            <i class="fas fa-info-circle"></i>
                            ${holiday.note || holiday.reason}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterHolidays(filterType) {
        if (!this.allHolidays) {
            return;
        }

        // First filter out past holidays
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
        const futureHolidays = this.allHolidays.filter(holiday => {
            const holidayEndDate = new Date(holiday.endDate);
            holidayEndDate.setHours(0, 0, 0, 0);
            return holidayEndDate >= today;
        });

        let filteredHolidays;
        if (filterType === 'all') {
            filteredHolidays = futureHolidays;
        } else {
            filteredHolidays = futureHolidays.filter(holiday => {
                const isPublic = holiday.reason === 'public' || holiday.reason === 'Public Holiday';
                const holidayType = isPublic ? 'public' : 'personal';
                return holidayType === filterType;
            });
        }

        this.displayHolidays(filteredHolidays);
    }

    async deleteHoliday(holidayId) {
        this.showDeleteConfirmModal(holidayId, 'holiday');
    }

    async loadSessions(page = 1, filters = {}) {
        try {
            this.showLoading();

            const queryParams = new URLSearchParams({
                page: page,
                limit: 10,
                ...filters
            });

            const response = await this.apiCall(`/sessions/teacher?${queryParams}`, 'GET');

            if (response.success) {
                this.allSessions = response.sessions;
                this.displaySessions(response.sessions, response.pagination);

                this.updateRecentSessions(response.sessions.slice(0, 3));
            } else {
                this.showMessage(response.message || 'Failed to load sessions', 'error');
                this.displaySessions([], { totalSessions: 0, currentPage: 1, totalPages: 0 });
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showMessage('Error loading sessions: ' + (error.message || 'Unknown error'), 'error');
            this.displaySessions([], { totalSessions: 0, currentPage: 1, totalPages: 0 });
        } finally {
            this.hideLoading();
        }
    }

    displaySessions(sessions, pagination) {

        const container = document.getElementById('sessionsList');
        const paginationContainer = document.getElementById('sessionsPagination');
        const sessionCountElement = document.getElementById('sessionCount');

        // Update session count in header
        if (sessionCountElement) {
            if (sessions.length === 1) {
                sessionCountElement.textContent = '1 session';
            } else {
                sessionCountElement.textContent = `${sessions.length} sessions`;
            }
        }

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div class="sessions-empty">
                    <i class="fas fa-calendar-alt"></i>
                    <p>No sessions created yet</p>
                    <small>Click "Create Session" to create a new session</small>
                </div>
            `;
            paginationContainer.style.display = 'none';
            return;
        }

        container.innerHTML = sessions.map(session => {
            const sessionType =
                session.sessionType || (session.allowedStudent ? 'personal' : 'common');
            const isPersonal = sessionType === 'personal';
            const typeClass = sessionType;
            const typeText = isPersonal ? 'PERSONAL' : 'ALL STUDENTS';

            const availableSlots = session.slots || [];
            const bookedSlots = session.bookedSlots || [];
            const totalSlots = availableSlots.length + bookedSlots.length;
            const availableCount = availableSlots.length;
            const bookedCount = bookedSlots.length;
            const occupancyRate = totalSlots > 0 ? Math.round((bookedCount / totalSlots) * 100) : 0;

            return `
            <div class="session-card" data-session-item-id="${session._id || session.sessionId}">
                
                <!-- HEADER -->
                <div class="session-header">
                    <h3 class="session-title">${session.title}</h3>

                    <div class="session-header-actions">
                        <span class="session-type ${typeClass}">
                            ${typeText}
                        </span>
                    </div>
                </div>

                <!-- CONTENT -->
                <div class="session-content">

                    <div class="session-info">
                        <i class="fas fa-calendar"></i>
                        <span>${session.date} (${session.day})</span>
                    </div>

                    <div class="session-info">
                        <i class="fas fa-clock"></i>
                        <span>
                            ${this.formatDuration(session.sessionDuration)} •
                            ${session.breakDuration} min break
                        </span>
                    </div>

                    ${isPersonal && session.allowedStudent ? `
                        <div class="session-info">
                            <i class="fas fa-user"></i>
                            <span>Student: ${session.allowedStudent.name}</span>
                        </div>
                    ` : ''}

                    <!-- SLOT STATISTICS -->
                    <div class="slot-statistics">
                        <div class="slot-stats-header">
                            <span class="slot-stats-title">Slot Status</span>
                            <span class="slot-stats-total">${totalSlots} Total</span>
                        </div>
                        
                        <div class="slot-stats-badges">
                            <div class="slot-badge available">
                                <i class="fas fa-check-circle"></i>
                                <span class="count">${availableCount}</span>
                                <span class="label">Available</span>
                            </div>
                            <div class="slot-badge booked">
                                <i class="fas fa-user-check"></i>
                                <span class="count">${bookedCount}</span>
                                <span class="label">Booked</span>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="slot-progress-container">
                            <div class="slot-progress-bar">
                                <div class="slot-progress-fill booked" style="width: ${occupancyRate}%"></div>
                                <div class="slot-progress-fill available" style="width: ${100 - occupancyRate}%"></div>
                            </div>
                            <div class="slot-progress-text">${occupancyRate}% Booked</div>
                        </div>
                    </div>

                    <div class="session-slots">
                        <div class="session-slots-header">
                            My Slots (${totalSlots})
                        </div>

                        <div class="slots-grid">
                            ${totalSlots > 0
                    ? this.mergeAndSortSlots(
                        availableSlots,
                        bookedSlots
                    ).map(slot => `
                                        <div
                                            class="slot-item ${slot.isBooked ? 'booked' : 'available'
                        }"
                                            ${!slot.isBooked
                            ? `
                                                        data-session-id="${session.sessionId}"
                                                        data-start-utc="${slot.startUTC}"
                                                        data-end-utc="${slot.endUTC}"
                                                    `
                            : `
                                                        data-session-id="${session.sessionId}"
                                                        data-start-utc="${slot.startUTC}"
                                                        data-end-utc="${slot.endUTC}"
                                                        data-student-id="${typeof slot.bookedBy === 'object' ? slot.bookedBy._id || slot.bookedBy.id : slot.bookedBy}"
                                                        data-booked-by-teacher="${slot.bookedByTeacher ? 'true' : 'false'}"
                                                        ${slot.bookedByTeacher ? `title="This slot was assigned by you"` : ''}
                                                    `
                        }
                                            onclick="dashboard.handleSlotClick(this, '${slot.isBooked}', '${session.sessionId}', '${slot.startUTC}', '${slot.endUTC}', '${typeof slot.bookedBy === 'object' ? slot.bookedBy._id || slot.bookedBy.id : slot.bookedBy || ''}', '${slot.studentName || ''}', '${slot.bookedByTeacher || false}')"
                                        >
                                            ${slot.startTime} - ${slot.endTime}
                                            ${slot.isBooked && !isPersonal
                            ? `<br><span class="student-name">${slot.studentName}</span>`
                            : ''
                        }
                                        </div>
                                    `).join('')
                    : `<div class="slot-item empty">No slots available</div>`
                }
                        </div>
                    </div>

                    <!-- ✅ DELETE BUTTON : BOTTOM RIGHT -->
                    <div class="session-footer-actions">
    <button
        class="delete-session-btn"
        data-session-id="${session.sessionId}"
        title="Delete Session"
    >
        Delete
    </button>
</div>


                </div>
            </div>
        `;
        }).join('');

        if (pagination) {
            this.updateSessionsPagination(pagination);
            paginationContainer.style.display = 'flex';
        }

        // attach handlers AFTER render
        this.attachTeacherSlotHandlers();
        this.attachDeleteSessionHandlers();
    }

    updateSessionsPagination(pagination) {
        const paginationInfo = document.getElementById('paginationInfo');
        const currentPage = document.getElementById('currentPage');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        paginationInfo.textContent = `Showing ${pagination.totalSessions} session${pagination.totalSessions !== 1 ? 's' : ''}`;
        currentPage.textContent = pagination.currentPage;

        prevBtn.disabled = pagination.currentPage <= 1;
        nextBtn.disabled = pagination.currentPage >= pagination.totalPages;
    }

    attachDeleteSessionHandlers() {
        document.querySelectorAll(".delete-session-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();

                const sessionId = btn.dataset.sessionId;
                if (!sessionId) return;

                this.deleteSession(sessionId);
            });
        });
    }

    mergeAndSortSlots(availableSlots, bookedSlots) {
        const allSlots = [
            ...availableSlots.map(slot => ({
                ...slot,
                isBooked: false,
                startUTC: slot.startUTC || slot.startTimeUTC || slot.startTime,
                endUTC: slot.endUTC || slot.endTimeUTC || slot.endTime
            })),
            ...bookedSlots.map(slot => ({
                ...slot,
                isBooked: true,
                startUTC: slot.startUTC || slot.startTimeUTC || slot.startTime,
                endUTC: slot.endUTC || slot.endTimeUTC || slot.endTime
            }))
        ];

        return allSlots.sort((a, b) => {
            const [h1, m1] = a.startTime.split(':').map(Number);
            const [h2, m2] = b.startTime.split(':').map(Number);
            return h1 * 60 + m1 - (h2 * 60 + m2);
        });
    }

    showSessionModal() {
        const modal = document.getElementById('sessionModal');
        const sessionDateInput = document.getElementById('sessionDate');

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const minDate = `${yyyy}-${mm}-${dd}`;

        sessionDateInput.setAttribute('min', minDate);

        this.clearFormValidation('sessionForm');

        const sessionForm = document.getElementById('sessionForm');
        if (sessionForm) {
            sessionForm.querySelectorAll('input, select').forEach(field => {
                field.addEventListener('input', () => {
                    this.clearFieldValidation(field);
                });
                field.addEventListener('change', () => {
                    this.clearFieldValidation(field);
                });
            });
        }

        modal.classList.add('show');
        this.loadStudentsForSession();
    }

    async validateSessionDateForHoliday(selectedDate) {
        const errorElement = document.getElementById('sessionDateError');
        const availabilityErrorElement = document.getElementById('sessionAvailabilityError');

        this.clearSessionDateError();

        if (!selectedDate) {
            return;
        }

        try {
            const isHoliday = await this.isDateHoliday(selectedDate);

            if (isHoliday) {
                errorElement.textContent = 'Teacher is on holiday. Session cannot be created on this date.';
                errorElement.style.display = 'block';
                errorElement.style.color = '#ef4444';

                this.setSessionSubmitButtonState(false);
                return;
            }

            const isAvailable = await this.isTeacherAvailable(selectedDate);

            if (!isAvailable) {
                availabilityErrorElement.textContent = 'Teacher availability is not set or the teacher is not available on this day.';
                availabilityErrorElement.style.display = 'block';
                availabilityErrorElement.style.color = '#ef4444';

                this.setSessionSubmitButtonState(false);
                return;
            }

            this.setSessionSubmitButtonState(true);

        } catch (error) {
            console.error('Error checking date validation:', error);
            this.setSessionSubmitButtonState(true);
        }
    }

    async isTeacherAvailable(dateString) {
        try {
            const selectedDate = new Date(dateString);
            const dayOfWeek = this.getDayOfWeek(selectedDate);

            if (this.currentAvailabilityData && this.currentAvailabilityData.length > 0) {
                const dayAvailability = this.currentAvailabilityData.find(slot => slot.day === dayOfWeek);

                if (!dayAvailability) {
                    return false;
                }

                if (dayAvailability.startTime === "00:00" && dayAvailability.endTime === "00:00") {
                    return false;
                }

                if (!dayAvailability.startTime || !dayAvailability.endTime) {
                    return false;
                }

                return true;
            }

            await this.loadAvailability();

            if (this.currentAvailabilityData && this.currentAvailabilityData.length > 0) {
                const dayAvailability = this.currentAvailabilityData.find(slot => slot.day === dayOfWeek);

                if (!dayAvailability || dayAvailability.startTime === "00:00" && dayAvailability.endTime === "00:00") {
                    return false;
                }

                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking teacher availability:', error);
            return false;
        }
    }

    getDayOfWeek(date) {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()];
    }

    setSessionSubmitButtonState(enabled) {
        const submitBtn = document.querySelector('#sessionForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = !enabled;
            submitBtn.style.opacity = enabled ? '1' : '0.5';
            submitBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }
    }

    async isDateHoliday(dateString) {
        try {
            const selectedDate = new Date(dateString);

            if (this.allHolidays && this.allHolidays.length > 0) {
                return this.allHolidays.some(holiday => {
                    const startDate = new Date(holiday.startDate);
                    const endDate = new Date(holiday.endDate);

                    return selectedDate >= startDate && selectedDate <= endDate;
                });
            }

            await this.loadHolidays();

            if (this.allHolidays && this.allHolidays.length > 0) {
                return this.allHolidays.some(holiday => {
                    const startDate = new Date(holiday.startDate);
                    const endDate = new Date(holiday.endDate);

                    return selectedDate >= startDate && selectedDate <= endDate;
                });
            }

            return false;
        } catch (error) {
            console.error('Error checking if date is holiday:', error);
            return false;
        }
    }

    clearSessionDateError() {
        const errorElement = document.getElementById('sessionDateError');
        const availabilityErrorElement = document.getElementById('sessionAvailabilityError');

        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }

        if (availabilityErrorElement) {
            availabilityErrorElement.style.display = 'none';
            availabilityErrorElement.textContent = '';
        }

        this.setSessionSubmitButtonState(true);
    }

    hideSessionModal() {
        const modal = document.getElementById('sessionModal');
        if (modal) {
            modal.classList.remove('show');
        }
        setTimeout(() => {
            this.resetSessionForm();
        }, 0);
    }

    resetSessionForm() {
        const form = document.getElementById('sessionForm');
        if (form) {

            form.reset();

            document.getElementById('sessionTitle').value = '';
            document.getElementById('sessionDate').value = '';
            document.getElementById('sessionDuration').value = '';
            document.getElementById('breakDuration').value = '';
            document.getElementById('studentSelectionType').value = '';

            this.clearSessionDateError();

            const particularStudentRow = document.getElementById('particularStudentRow');
            if (particularStudentRow) {
                particularStudentRow.style.display = 'none';
            }

            const studentSelect = document.getElementById('studentSelect');
            if (studentSelect) {
                studentSelect.innerHTML = '<option value="">Select a Student</option>';
            }

        }
    }

    async loadStudentsForSession() {
        const selectionType = document.getElementById('studentSelectionType').value;
        if (selectionType !== 'particular') {
            return;
        }

        const studentSelect = document.querySelector('#particularStudentRow #studentSelect');
        if (!studentSelect) {
            console.error('Session student select element not found');
            return;
        }

        studentSelect.innerHTML = '<option value="">Loading students...</option>';

        try {
            const response = await this.apiCall('/teachers/students', 'GET');

            if (response && response.success && response.data) {

                if (response.data.length > 0) {
                    const particularStudentRow = document.getElementById('particularStudentRow');
                    if (particularStudentRow) {
                        particularStudentRow.style.display = 'block';
                        particularStudentRow.style.visibility = 'visible';
                        particularStudentRow.style.opacity = '1';
                    }

                    studentSelect.style.display = 'block';
                    studentSelect.style.visibility = 'visible';
                    studentSelect.style.opacity = '1';

                    studentSelect.innerHTML = '';

                    studentSelect.add(new Option('Select a Student', ''));

                    response.data.forEach(student => {
                        studentSelect.add(new Option(student.name, student._id));
                    });
                } else {
                    studentSelect.innerHTML = '<option value="">No students found</option>';
                }
            } else {
                studentSelect.innerHTML = '<option value="">Error loading students</option>';
            }
        } catch (error) {
            console.error('Error in loadStudentsForSession:', error);
            studentSelect.innerHTML = '<option value="">Error loading students</option>';
        }
    }

    handleStudentSelectionChange() {
        const selectionType = document.getElementById('studentSelectionType').value;
        const particularStudentRow = document.getElementById('particularStudentRow');

        if (selectionType === 'particular') {
            particularStudentRow.style.display = 'block';

            setTimeout(() => {
                this.loadStudentsForSession();
            }, 100);
        } else {
            particularStudentRow.style.display = 'none';
            document.getElementById('studentSelect').value = '';
        }
    }

    async createSession(event) {
        event.preventDefault();

        this.clearFormValidation('sessionForm');

        const formData = new FormData(event.target);
        const sessionDate = formData.get('sessionDate');
        const selectionType = formData.get('studentSelectionType');
        let isValid = true;

        const title = formData.get('sessionTitle')?.trim();
        if (!title) {
            this.showFieldError('sessionTitle', 'Session title is required');
            isValid = false;
        } else if (title.length < 3 || title.length > 100) {
            this.showFieldError('sessionTitle', 'Session title must be between 3 and 100 characters');
            isValid = false;
        }

        if (!sessionDate) {
            this.showFieldError('sessionDate', 'Session date is required');
            isValid = false;
        } else {
            const dateObj = new Date(sessionDate);
            if (isNaN(dateObj.getTime())) {
                this.showFieldError('sessionDate', 'Invalid date selected');
                isValid = false;
            } else {
                const isHoliday = await this.isDateHoliday(sessionDate);
                if (isHoliday) {
                    this.showFieldError('sessionAvailabilityError', 'Teacher is on holiday. Session cannot be created on this date.');
                    isValid = false;
                } else {
                    const isAvailable = await this.isTeacherAvailable(sessionDate);
                    if (!isAvailable) {
                        this.showFieldError('sessionAvailabilityError', 'Teacher is not available on this day.');
                        isValid = false;
                    }
                }
            }
        }

        const sessionDuration = parseInt(formData.get('sessionDuration'));
        if (!sessionDuration) {
            this.showFieldError('sessionDuration', 'Session duration is required');
            isValid = false;
        } else if (sessionDuration < 15 || sessionDuration > 240 || sessionDuration % 15 !== 0) {
            this.showFieldError('sessionDuration', 'Session duration must be between 15-240 minutes in 15-minute intervals');
            isValid = false;
        }

        const breakDuration = parseInt(formData.get('breakDuration'));
        if (isNaN(breakDuration) || breakDuration < 0 || breakDuration > 60 || breakDuration % 5 !== 0) {
            this.showFieldError('breakDuration', 'Break duration must be between 0-60 minutes in 5-minute intervals');
            isValid = false;
        }

        if (!selectionType) {
            this.showFieldError('studentSelectionType', 'Please select whether to assign to all students or a particular student');
            isValid = false;
        } else if (selectionType === 'particular' && !formData.get('studentSelect')) {
            this.showFieldError('studentSelect', 'Please select a student when "Particular Student" is choosen');
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        const dateObj = new Date(sessionDate);
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()}`;

        const sessionData = {
            title: title,
            date: formattedDate,
            sessionDuration: sessionDuration,
            breakDuration: breakDuration,
            studentSelectionType: selectionType,
            student_id: selectionType === 'particular' ? formData.get('studentSelect') : undefined
        };


        try {
            this.showLoading();
            const response = await this.apiCall('/sessions/slots', 'POST', sessionData);

            if (response.success) {
                this.hideSessionModal();

                if (response.data) {
                    const currentSessions = this.allSessions || [];

                    const newSession = {
                        ...response.data,
                        sessionId: response.data.sessionId,
                        allowedStudent: response.data.allowedStudent || null,
                        sessionType: response.data.sessionType || (sessionData.student_id ? 'personal' : 'common'),
                        slots: response.data.slots || [],
                        bookedSlots: response.data.bookedSlots || []
                    };

                    // Ensure allowedStudent has proper structure for personal sessions
                    if (sessionData.student_id && newSession.sessionType === 'personal' && !newSession.allowedStudent) {
                        // Find the student from currentStudents list
                        const selectedStudent = this.currentStudents.find(s => s._id === sessionData.student_id);
                        if (selectedStudent) {
                            newSession.allowedStudent = {
                                _id: selectedStudent._id,
                                name: selectedStudent.name
                            };
                        }
                    }

                    currentSessions.unshift(newSession);

                    this.allSessions = currentSessions;

                    this.displaySessions(this.allSessions, { currentPage: 1, totalPages: 1, totalSessions: this.allSessions.length });

                    const slotCount = response.data.slots ? response.data.slots.length : 0;
                    const sessionType = response.data.sessionType || 'common';
                    const studentName = response.data.allowedStudent ? response.data.allowedStudent.name : '';

                    let successMessage = `Session created successfully with ${slotCount} slots`;
                    if (sessionType === 'personal' && studentName) {
                        successMessage += ` for ${studentName}`;
                    }

                    this.showMessage(successMessage, 'success');
                } else {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.loadSessions();
                }
            } else {
                this.hideSessionModal();

                const errorMsg = response.errors && response.errors.length > 0
                    ? response.errors.map(e => e.message).join(', ')
                    : response.message || 'Failed to create session';

                let customErrorMessage = this.getCustomErrorMessage(error, 'Session creation');
                this.showMessage(customErrorMessage, 'error');
            }
        } catch (error) {
            console.error('Error creating session:', error);

            this.hideSessionModal();

            let customErrorMessage = this.getCustomErrorMessage(error, 'Session creation');
            this.showMessage(customErrorMessage, 'error');
        } finally {
            this.hideLoading();
        }
    }

    getCustomErrorMessage(error, operation = 'operation') {
        let errorMessage = '';

        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || '';
        } else if (error.message) {
            errorMessage = error.message;
        }

        if (errorMessage.includes('holiday') || errorMessage.includes('Holiday') || errorMessage.includes('marked as a holiday')) {
            return `${operation} cannot be completed because the selected date is marked as a holiday.`;
        } else if (errorMessage.includes('availability') || errorMessage.includes('not available') || errorMessage.includes('not set') || errorMessage.includes('Teacher is not available')) {
            return `${operation} cannot be completed because availability is not set for the selected day.`;
        } else if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
            return `${operation} cannot be completed because it already exists.`;
        } else if (errorMessage.includes('Invalid student') || errorMessage.includes('not allowed') || errorMessage.includes('Invalid student for this teacher')) {
            return `${operation} cannot be completed because the selected student is not valid for this teacher.`;
        } else if (errorMessage.includes('Validation failed') || errorMessage.includes('required')) {
            return `${operation} cannot be completed due to missing required information. Please fill all required fields.`;
        } else if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
            return `${operation} cannot be completed due to invalid data. Please check all fields and try again.`;
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid token')) {
            return `${operation} cannot be completed due to authentication issues. Please log in again.`;
        } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
            return `${operation} cannot be completed due to insufficient permissions.`;
        } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
            return `${operation} cannot be completed because the requested resource was not found.`;
        } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
            return `${operation} cannot be completed due to a server error. Please try again later.`;
        } else if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('fetch')) {
            return `${operation} cannot be completed due to network issues. Please check your connection and try again.`;
        } else if (errorMessage) {
            return errorMessage;
        } else {
            return `${operation} cannot be completed. Please check your connection and try again.`;
        }
    }

    filterSessions(type = 'all') {
        const filters = {};
        if (type !== 'all') filters.type = type;

        this.loadSessions(1, filters);
    }

    async deleteSession(sessionId) {
        this.showDeleteConfirmModal(sessionId, 'session');
    }

    openAssignSlotModal(sessionId, startUTC, endUTC) {
        // Try multiple possible ID fields
        let session = this.allSessions.find(s =>
            String(s.sessionId) === String(sessionId) ||
            String(s._id) === String(sessionId) ||
            String(s.id) === String(sessionId)
        );

        if (!session) {
            this.showMessage("Session not found", "error");
            return;
        }

        // Save context for assignSlot()
        this.assignSlotContext = {
            sessionId,
            sessionType: session.sessionType,
            allowedStudent: session.allowedStudent || null,
            startUTC,
            endUTC
        };

        // Fill session title and type
        const sessionTypeElement = document.getElementById("assignSessionType");
        sessionTypeElement.innerText = session.sessionType === "personal" ? "Personal Session" : "ALL STUDENTS";
        sessionTypeElement.className = `session-type ${session.sessionType}`;

        // Convert UTC → teacher local time for time display only
        const start = moment.utc(startUTC).tz(this.teacher.timezone);
        const end = moment.utc(endUTC).tz(this.teacher.timezone);

        document.getElementById("assignSlotTime").innerText =
            `${start.format("HH:mm")} - ${end.format("HH:mm")}`;

        // Remove any existing date elements to prevent duplicates
        const modalBody = document.querySelector("#assignSlotModal .modal-body");
        if (modalBody) {
            const existingDateContainer = modalBody.querySelector("#slotDateContainer");
            if (existingDateContainer) {
                existingDateContainer.remove();
            }
        }

        // Display the session's original scheduled date (no timezone conversion)
        const sessionDate = session.date; // Use the session's original date field
        const dateContainer = document.querySelector("#slotDateContainer .detail-content span");
        if (dateContainer) {
            dateContainer.textContent = sessionDate;
        }

        const studentDropdownGroup =
            document.getElementById("assignStudentSelect")?.closest(".form-group");

        const fixedStudentWrapper =
            document.getElementById("assignFixedStudentWrapper");

        // PERSONAL session - hide both student name and dropdown
        if (session.sessionType === "personal") {
            if (studentDropdownGroup) {
                studentDropdownGroup.style.display = "none";
            }

            if (fixedStudentWrapper) {
                fixedStudentWrapper.style.display = "none";
            }
        }
        // COMMON session - show dropdown only
        else {
            if (studentDropdownGroup) {
                studentDropdownGroup.style.display = "block";
            }

            if (fixedStudentWrapper) {
                fixedStudentWrapper.style.display = "none";
            }

            const select = document.getElementById("assignStudentSelect");
            select.innerHTML = `<option value="">Select student</option>` +
                this.currentStudents
                    .map(s => `<option value="${s._id}">${s.name}</option>`)
                    .join("");
        }

        // Ensure the assign button has the correct event listener
        const assignButton = document.getElementById('confirmAssignSlot');
        if (assignButton) {
            // Remove any existing listeners to prevent duplicates
            const newButton = assignButton.cloneNode(true);
            assignButton.parentNode.replaceChild(newButton, assignButton);

            // Add fresh event listener
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.assignSlot();
            });

            // Reset button state
            newButton.disabled = false;
            newButton.innerHTML = 'Assign Slot';
            newButton.style.opacity = '1';
            newButton.style.cursor = 'pointer';
        }

        this.showModal("assignSlotModal");
    }

    async assignSlot() {
        // Get the assign button
        const assignButton = document.getElementById('confirmAssignSlot');

        // Prevent multiple simultaneous calls
        if (this.isAssigningSlot) {
            return;
        }

        this.isAssigningSlot = true;

        try {
            const ctx = this.assignSlotContext;
            if (!ctx) {
                this.showMessage("Slot data missing", "error");
                return;
            }

            let studentId;

            if (ctx.sessionType === "personal") {
                // personal → fixed student
                studentId = ctx.allowedStudent?._id;
            } else {
                // common → dropdown
                studentId = document.getElementById("assignStudentSelect")?.value;
            }

            if (!studentId) {
                if (ctx.sessionType === "personal") {
                    this.showMessage("Unable to assign slot - student information not found", "error");
                } else {
                    this.showMessage("Please select a student", "error");
                }
                return;
            }

            // Convert UTC → local values required by API
            const startLocal = moment.utc(ctx.startUTC).tz(this.teacher.timezone);
            const endLocal = moment.utc(ctx.endUTC).tz(this.teacher.timezone);

            const payload = {
                sessionId: ctx.sessionId,
                studentId,
                date: startLocal.format("DD-MM-YYYY"),
                startTime: startLocal.format("HH:mm"),
                endTime: endLocal.format("HH:mm")
            };


            // Show instant success message immediately
            this.showMessage("Slot assigned successfully", "success");

            // Close modal immediately
            this.hideModal("assignSlotModal");

            // **INSTANT UI UPDATE - Change slot to red immediately**
            this.updateSlotToBooked(ctx.sessionId, ctx.startUTC, ctx.endUTC, studentId);

            // Make API call in background
            const response = await this.apiCall(
                "/sessions/teacher/assign-slot",
                "POST",
                payload
            );

            if (response.success) {
                // Refresh data in background to keep everything in sync
                await this.loadSessions();
            } else {
                // If API failed, show error message and revert UI
                this.showMessage(response.message || 'Failed to assign slot', 'error');
                this.updateSlotToAvailable(ctx.sessionId, ctx.startUTC, ctx.endUTC);
                // Reopen modal if needed
                this.openAssignSlotModal(ctx.sessionId, ctx.startUTC, ctx.endUTC);
            }
        } catch (err) {
            console.error('Assign slot error:', err);
            // Show error if something went wrong and revert UI
            this.showMessage(err.message || "Failed to assign slot", "error");
            // Revert the UI change if API failed
            if (ctx) {
                this.updateSlotToAvailable(ctx.sessionId, ctx.startUTC, ctx.endUTC);
            }
        } finally {
            this.isAssigningSlot = false;
        }
    }

    attachTeacherSlotHandlers() {
        // Remove existing event listeners to prevent duplicates
        document.querySelectorAll(".slot-item.available, .slot-item.booked").forEach(slot => {
            slot.replaceWith(slot.cloneNode(true));
        });

        // Add fresh event listeners for available slots
        document.querySelectorAll(".slot-item.available").forEach(slot => {
            slot.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const sessionId = slot.dataset.sessionId;
                const startUTC = slot.dataset.startUtc;
                const endUTC = slot.dataset.endUtc;

                if (!sessionId || !startUTC || !endUTC) {
                    this.showMessage("Slot data is incomplete", "error");
                    return;
                }

                this.openAssignSlotModal(sessionId, startUTC, endUTC);
            });
        });

        // Add event listeners for booked slots (red slots)
        document.querySelectorAll(".slot-item.booked").forEach(slot => {
            const bookedByTeacher = slot.dataset.bookedByTeacher === 'true';

            if (bookedByTeacher) {
                // Teacher-assigned slots: add hover effects and click handler
                slot.addEventListener("mouseenter", () => {
                    slot.style.backgroundColor = '#ff6b6b'; // Lighter red on hover
                    slot.style.cursor = 'pointer';
                    slot.title = 'Assigned by you - Click to cancel';
                });

                slot.addEventListener("mouseleave", () => {
                    slot.style.backgroundColor = ''; // Reset to default red
                    slot.style.cursor = '';
                });

                slot.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const sessionId = slot.dataset.sessionId;
                    const startUTC = slot.dataset.startUtc;
                    const endUTC = slot.dataset.endUtc;
                    const studentId = slot.dataset.studentId;

                    // Try to get student name from the slot's onclick attribute or from current students
                    let studentName = null;
                    if (studentId) {
                        const student = this.currentStudents.find(s =>
                            s._id === studentId ||
                            String(s._id) === String(studentId) ||
                            s.id === studentId
                        );
                        if (student && student.name) {
                            studentName = student.name;
                        }
                    }

                    if (!sessionId || !startUTC || !endUTC) {
                        this.showMessage("Slot data is incomplete", "error");
                        return;
                    }

                    this.showCancelSlotConfirmation(sessionId, startUTC, endUTC, studentId, studentName);
                });
            } else {
                // Student-booked slots: disable all interactions
                slot.style.cursor = 'not-allowed';
                slot.title = 'Booked by student - Cannot cancel';
                slot.style.opacity = '0.7';

                // Remove any existing click handlers
                slot.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
                // No hover effects for student-booked slots
            }
        });
    }

    handleSlotClick(element, isBooked, sessionId, startUTC, endUTC, studentId, studentName, bookedByTeacher) {
        if (isBooked === 'true') {
            // Check if this slot was booked by teacher or directly by student
            if (bookedByTeacher === 'true' || bookedByTeacher === true) {
                this.showCancelSlotConfirmation(sessionId, startUTC, endUTC, studentId, studentName);
            } else {
                this.showMessage('Cannot cancel slots booked directly by students', 'error');
            }
        } else {
            this.openAssignSlotModal(sessionId, startUTC, endUTC);
        }
    }

    showCancelSlotConfirmation(sessionId, startUTC, endUTC, studentId, providedStudentName) {
        const modal = document.getElementById('cancelSlotModal');
        if (!modal) {
            this.createCancelSlotModal();
            this.showCancelSlotConfirmation(sessionId, startUTC, endUTC, studentId, providedStudentName);
            return;
        }

        // Store slot data for later use
        this.currentSlotToCancel = { sessionId, startUTC, endUTC, studentId };

        // Populate modal with slot details
        const studentNameElement = document.getElementById('cancelStudentName');
        const slotTimeElement = document.getElementById('cancelSlotTime');

        // Use provided student name first, then fallback to lookup
        let studentName = providedStudentName;

        // If no student name provided, try to find it in current students
        if (!studentName && studentId) {
            // Try multiple matching approaches for robustness
            const student = this.currentStudents.find(s =>
                s._id === studentId ||
                String(s._id) === String(studentId) ||
                s.id === studentId
            );

            if (student && student.name) {
                studentName = student.name;
            } else {
                console.warn('Student not found in currentStudents:', { studentId, availableStudents: this.currentStudents.map(s => ({ _id: s._id, name: s.name })) });
                // Fallback: try to fetch student data if not found in cached list
                this.fetchStudentById(studentId).then(fetchedStudent => {
                    if (fetchedStudent && fetchedStudent.name) {
                        const studentNameElement = document.getElementById('cancelStudentName');
                        if (studentNameElement) {
                            studentNameElement.textContent = fetchedStudent.name;
                        }
                    }
                }).catch(err => {
                    console.error('Failed to fetch student data:', err);
                });
            }
        }

        // Final fallback if still no student name
        if (!studentName) {
            studentName = 'Unknown Student';
        }

        // Format slot time
        let slotTime = 'Unknown Time';
        if (startUTC && endUTC) {
            const startTime = moment.utc(startUTC).tz(this.teacher.timezone).format('HH:mm');
            const endTime = moment.utc(endUTC).tz(this.teacher.timezone).format('HH:mm');
            slotTime = `${startTime} - ${endTime}`;
        }

        // Update modal content
        if (studentNameElement) {
            studentNameElement.textContent = studentName;
        }
        if (slotTimeElement) {
            slotTimeElement.textContent = slotTime;
        }

        // Show the modal
        modal.classList.add('show');
    }

    createCancelSlotModal() {
        // Create the modal element with professional design
        const modal = document.createElement('div');
        modal.id = 'cancelSlotModal';
        modal.className = 'modal cancel-slot-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-body">
                    <div class="warning-header">
                        <div class="warning-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h2 class="modal-title">Cancel Slot Confirmation</h2>
                    </div>
                    
                    <div class="warning-message">
                        This action will permanently cancel the booked slot for the student.
                    </div>
                    
                    <div class="details-card">
                        <div class="detail-row">
                            <div class="detail-left">
                                <div class="detail-icon">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="detail-label">Student</div>
                            </div>
                            <div class="detail-value" id="cancelStudentName">Loading...</div>
                        </div>
                        
                        <div class="detail-divider"></div>
                        
                        <div class="detail-row">
                            <div class="detail-left">
                                <div class="detail-icon">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="detail-label">Time</div>
                            </div>
                            <div class="detail-value" id="cancelSlotTime">Loading...</div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button id="cancelCancelBtn" class="btn btn-secondary">
                            No, Keep Slot
                        </button>
                        <button id="confirmCancelBtn" class="btn btn-danger">
                            Yes, Cancel Slot
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('confirmCancelBtn').addEventListener('click', () => {
            this.confirmCancelSlot();
        });

        document.getElementById('cancelCancelBtn').addEventListener('click', () => {
            this.hideCancelSlotModal();
        });
    }

    hideCancelSlotModal() {
        const modal = document.getElementById('cancelSlotModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async fetchStudentById(studentId) {
        try {
            const response = await this.apiCall(`/teachers/students/${studentId}`, 'GET');
            if (response.success && response.data) {
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Error fetching student by ID:', error);
            return null;
        }
    }

    async confirmCancelSlot() {
        // Prevent multiple simultaneous calls
        if (this.isCancellingSlot) {
            return;
        }

        this.isCancellingSlot = true;

        try {
            if (!this.currentSlotToCancel) {
                this.showMessage('No slot selected for cancellation', 'error');
                return;
            }

            const { sessionId, startUTC, endUTC, studentId } = this.currentSlotToCancel;


            // Validate data before sending
            if (!sessionId || !startUTC || !endUTC) {
                this.showMessage('Missing slot data', 'error');
                return;
            }

            this.showLoading();

            const payload = {
                sessionId,
                startTimeUTC: startUTC,
                endTimeUTC: endUTC
            };


            const response = await this.apiCall(
                '/sessions/teacher/cancel-assigned-slot',
                'POST',
                payload
            );

            if (response.success) {
                this.showMessage('Slot cancelled successfully', 'success');
                this.hideCancelSlotModal();

                // Update UI in real-time - change slot from red to green
                this.updateSlotToAvailable(sessionId, startUTC, endUTC);

                // Also refresh the sessions data to keep everything in sync
                await this.loadSessions();
            } else {
                this.showMessage(response.message || 'Failed to cancel slot', 'error');
            }
        } catch (error) {
            console.error('Error cancelling slot:', error);
            this.showMessage('Error cancelling slot: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            this.hideLoading();
            this.isCancellingSlot = false;
        }
    }

    updateSlotToBooked(sessionId, startUTC, endUTC, studentId) {
        // Find the slot element and update its class and appearance immediately
        const slotElement = document.querySelector(
            `.slot-item[data-session-id="${sessionId}"][data-start-utc="${startUTC}"][data-end-utc="${endUTC}"]`
        );

        if (slotElement) {
            // Get session info to check if it's personal or common
            const session = this.allSessions.find(s =>
                String(s.sessionId) === String(sessionId) ||
                String(s._id) === String(sessionId) ||
                String(s.id) === String(sessionId)
            );

            const isPersonalSession = session && session.sessionType === 'personal';

            // Remove available class and add booked class
            slotElement.classList.remove('available');
            slotElement.classList.add('booked');

            // Add student name display ONLY for common sessions
            if (!isPersonalSession) {
                const student = this.currentStudents.find(s => s._id === studentId);
                const studentName = student ? student.name : 'Assigned';

                const slotContent = slotElement.innerHTML;
                const studentNameHtml = `<br><span class="student-name">${studentName}</span>`;

                // Update the slot content to include student name
                if (!slotContent.includes('student-name')) {
                    slotElement.innerHTML = slotContent + studentNameHtml;
                }
            }

            // Add the student-id attribute
            slotElement.setAttribute('data-student-id', studentId);

            // Update the onclick handler to call the booked slot handler
            const studentName = !isPersonalSession ?
                (this.currentStudents.find(s => s._id === studentId)?.name || 'Assigned') : '';

            slotElement.setAttribute('onclick', `dashboard.handleSlotClick(this, 'true', '${sessionId}', '${startUTC}', '${endUTC}', '${studentId}', '${studentName}')`);

            // Add data-booked-by-teacher attribute if not present (assume teacher-assigned for new bookings)
            if (!slotElement.hasAttribute('data-booked-by-teacher')) {
                slotElement.setAttribute('data-booked-by-teacher', 'true');
            }

            // Re-attach event listeners to ensure proper functionality
            this.attachTeacherSlotHandlers();

        } else {
        }
    }

    updateSlotToAvailable(sessionId, startUTC, endUTC) {
        // Find the slot element and update its class and click handler
        const slotElement = document.querySelector(
            `.slot-item[data-session-id="${sessionId}"][data-start-utc="${startUTC}"][data-end-utc="${endUTC}"]`
        );

        if (slotElement) {
            // Remove booked class and add available class
            slotElement.classList.remove('booked');
            slotElement.classList.add('available');

            // Remove student name if present
            const studentNameSpan = slotElement.querySelector('.student-name');
            if (studentNameSpan) {
                studentNameSpan.remove();
            }

            // Remove the student-id attribute
            slotElement.removeAttribute('data-student-id');

            // Update the onclick handler to call the available slot handler
            slotElement.setAttribute('onclick', `dashboard.handleSlotClick(this, 'false', '${sessionId}', '${startUTC}', '${endUTC}', '', '')`);

            // Re-attach event listeners
            this.attachTeacherSlotHandlers();
        }
    }

    // Quiz CSV and Preview Handlers
    setupQuizCsvHandlers() {
        const uploadBtn = document.getElementById('uploadQuizCsvBtn');
        const closeBtn = document.getElementById('closeQuizCsvModal');
        const form = document.getElementById('uploadQuizCsvForm');
        const downloadSampleBtn = document.getElementById('downloadQuizSampleBtn');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.showModal('uploadQuizCsvModal');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal('uploadQuizCsvModal');
                // Clear error message when modal is closed
                const errorElement = document.getElementById('quizCsvFileError');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => this.handleQuizCsvUpload(e));
        }

        const fileInput = document.getElementById('csvFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const fileName = e.target.files[0]?.name;
                const display = document.getElementById('selectedFileName');
                if (display) {
                    display.textContent = fileName ? `Selected: ${fileName}` : '';
                    display.style.display = fileName ? 'inline-block' : 'none';
                }
                
                // Clear error message when file is selected
                const errorElement = document.getElementById('quizCsvFileError');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            });
        }

        if (downloadSampleBtn) {
            downloadSampleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadQuizSampleCsv();
            });
        }

        // Preview Modal Handlers
        const closePreviewBtn = document.getElementById('closeQuizPreviewModal');
        const cancelPreviewBtn = document.getElementById('cancelQuizPreview');
        const confirmBtn = document.getElementById('confirmCreateQuizBtn');

        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', () => this.hideModal('quizPreviewModal'));
        }
        if (cancelPreviewBtn) {
            cancelPreviewBtn.addEventListener('click', () => this.hideModal('quizPreviewModal'));
        }
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmCreateQuiz());
        }
    }

    async downloadQuizSampleCsv() {
        try {
            const response = await fetch('/api/teachers/quizzes/sample-csv', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'quiz_sample.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                this.showMessage('Failed to download sample CSV', 'error');
            }
        } catch (error) {
            console.error('Download sample error:', error);
            this.showMessage('Error downloading sample CSV', 'error');
        }
    }

    async handleQuizCsvUpload(e) {
        e.preventDefault();
        const form = e.target;
        
        // Custom validation: Check if file is selected
        const fileInput = form.querySelector('input[name="csv"]');
        const errorElement = document.getElementById('quizCsvFileError');
        
        // Clear previous error
        errorElement.textContent = '';
        
        if (!fileInput.files || fileInput.files.length === 0) {
            errorElement.textContent = 'Please select a file.';
            fileInput.focus();
            return;
        }
        
        // Check if file is CSV
        const file = fileInput.files[0];
        if (!file.name.toLowerCase().endsWith('.csv')) {
            errorElement.textContent = 'Please select a valid CSV file.';
            fileInput.focus();
            return;
        }
        
        const formData = new FormData(form);

        try {
            this.showLoading();
            const response = await this.apiCall('/teachers/quizzes/parse-csv', 'POST', formData);

            if (response.success) {
                this.hideModal('uploadQuizCsvModal');
                this.populateQuizFormFromCsv(response.questions);
                this.showMessage(`Successfully parsed ${response.totalParsed} questions`, 'success');

                if (response.skipped && response.skipped.length > 0) {
                    console.warn('Skipped rows:', response.skipped);
                    this.showMessage(`Warning: ${response.totalSkipped} rows were skipped due to errors`, 'info');
                }
            } else {
                this.showMessage(response.message || 'Failed to parse CSV', 'error');
            }
        } catch (error) {
            console.error('CSV upload error:', error);
            this.showMessage('No valid questions found in CSV file', 'error');
        } finally {
            this.hideLoading();
            form.reset();
        }
    }

    populateQuizFormFromCsv(questions) {
        // Show the create quiz form if not already visible
        const createBtn = document.getElementById('createQuizBtn');
        if (createBtn) createBtn.click();

        // Guarantee Save to Draft visibility after CSV flow
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        const updateDraftBtn = document.getElementById('updateDraftBtn');
        const publishBtn = document.getElementById('publishQuizBtn');
        if (saveDraftBtn) saveDraftBtn.style.display = 'inline-block';
        if (updateDraftBtn) updateDraftBtn.style.display = 'none';
        if (publishBtn) publishBtn.style.display = 'inline-block';

        // Clear existing questions
        const container = document.getElementById('questionsContainer');
        if (container) container.innerHTML = '';

        // Add questions
        questions.forEach(q => {
            this.addQuizQuestion(q);
        });
    }

    renderQuizPreview(quizData, mode = 'create', quizId = null) {
        const title = quizData.title || 'Untitled Quiz';
        const description = mode === 'publish'
            ? 'Please review your quiz details before publishing'
            : 'Please review your quiz details before creating';
        const duration = quizData.duration || 0;
        const totalMarks = quizData.totalMarks || (quizData.questions?.length || 0);
        const questions = Array.isArray(quizData.questions) ? quizData.questions : [];
        const subject = quizData.subject || '—';
        const className = quizData.class || '—';
        const startTime = quizData.startTime || quizData.start || null;
        const endTime = quizData.endTime || quizData.end || null;

        const headerTitleEl = document.getElementById('previewHeaderTitle');
        const headerDescEl = document.getElementById('previewHeaderDescription');
        const titleEl = document.getElementById('previewTitle');
        const subjectEl = document.getElementById('previewSubject');
        const classEl = document.getElementById('previewClass');
        const totalQEl = document.getElementById('previewTotalQuestions');
        const durationEl = document.getElementById('previewDuration');
        const marksEl = document.getElementById('previewTotalMarks');
        const startEl = document.getElementById('previewStartTime');
        const endEl = document.getElementById('previewEndTime');
        const countBadgeEl = document.getElementById('previewQuestionCountBadge');
        const listEl = document.getElementById('quizPreviewQuestionsList');
        const confirmBtn = document.getElementById('confirmCreateQuizBtn');
        const cancelBtn = document.getElementById('cancelQuizPreview');
        const closeBtn = document.getElementById('closeQuizPreviewModal');

        if (headerTitleEl) headerTitleEl.textContent = 'Quiz Confirmation';
        if (headerDescEl) headerDescEl.textContent = description;
        if (titleEl) titleEl.textContent = title;
        if (subjectEl) subjectEl.textContent = subject;
        if (classEl) classEl.textContent = className;
        if (durationEl) durationEl.textContent = `${parseInt(duration) || 0} minutes`;
        if (marksEl) marksEl.textContent = totalMarks;
        if (totalQEl) totalQEl.textContent = `${questions.length} questions`;
        if (countBadgeEl) countBadgeEl.textContent = `${questions.length} questions`;
        if (startEl) startEl.textContent = startTime ? moment(startTime).format('MMM D, YYYY, h:mm A') : '—';
        if (endEl) endEl.textContent = endTime ? moment(endTime).format('MMM D, YYYY, h:mm A') : '—';

        if (listEl) {
            listEl.innerHTML = '';
            questions.forEach((q, index) => {
                const correctKey = (q.correctOption || q.correct || '').toLowerCase();
                const card = document.createElement('article');
                card.className = 'quiz-preview-question-card';
                const optionsHtml = (q.options || []).map((opt, i) => {
                    const key = String.fromCharCode(97 + i);
                    const isCorrect = key === correctKey;
                    return `
                        <div class="quiz-preview-option ${isCorrect ? 'correct' : ''}">
                            <span class="quiz-preview-option-label">${String.fromCharCode(65 + i)}.</span>
                            <span class="quiz-preview-option-text">${this.escapeHtml(opt)}</span>
                        </div>
                    `;
                }).join('');
                card.innerHTML = `
                    <div class="quiz-preview-question-header">
                        <span class="quiz-preview-question-number">${index + 1}</span>
                        <h3 class="quiz-preview-question-text">${this.escapeHtml(q.question || q.text || '')}</h3>
                        <span class="quiz-preview-question-marks">${q.marks || 1} marks</span>
                    </div>
                    <div class="quiz-preview-options-list">
                        ${optionsHtml}
                    </div>
                `;
                listEl.appendChild(card);
            });
        }

        if (cancelBtn) {
            const newCancel = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
            newCancel.addEventListener('click', () => this.hideModal('quizPreviewModal'));
        }

        if (closeBtn) {
            const newClose = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newClose, closeBtn);
            newClose.addEventListener('click', () => this.hideModal('quizPreviewModal'));
        }

        if (confirmBtn) {
            const newConfirm = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
            if (mode === 'publish') {
                newConfirm.innerHTML = '<svg class="quiz-preview-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>Confirm Publish';
                this.currentQuizData = { quizData, quizId };
                newConfirm.addEventListener('click', () => this.confirmPublishFromPreview());
            } else {
                newConfirm.innerHTML = '<svg class="quiz-preview-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>Create Quiz';
                this.pendingQuizData = { formData: quizData, isEdit: false, quizId: null };
                newConfirm.addEventListener('click', () => this.confirmCreateQuiz());
            }
        }

        this.showModal('quizPreviewModal');
    }

    showQuizPreviewModal(formData, isEdit, quizId) {
        this.pendingQuizData = { formData, isEdit, quizId };
        if (isEdit) {
            this.confirmCreateQuiz();
            return;
        }
        this.renderQuizPreview(formData, 'create', null);
    }

    async confirmCreateQuiz() {
        if (!this.pendingQuizData) return;

        const { formData, isEdit, quizId } = this.pendingQuizData;

        try {
            this.showLoading();
            const url = isEdit ? `/quizzes/${quizId}` : '/quizzes';
            const method = isEdit ? 'PUT' : 'POST';
            const response = await this.apiCall(url, method, formData);

            if (response.success || response.quiz) {
                // Check if this was a draft being published (check if we came from drafts page)
                const draftsPage = document.getElementById('drafts-page');
                const wasFromDrafts = draftsPage && draftsPage.classList.contains('active');

                if (wasFromDrafts && isEdit) {
                    // This was a draft being published
                    this.showMessage('Quiz published successfully', 'success');

                    // Remove from drafts list
                    this.removeDraftFromList(quizId);

                    // Add to quizzes list
                    if (response.quiz) {
                        this.addQuizToList(response.quiz);
                    }

                    // Update counts
                    this.updateQuizCounts();

                    // Switch back to quiz management page
                    document.getElementById('drafts-page').classList.remove('active');
                    document.getElementById('quiz-page').classList.add('active');
                } else {
                    this.showMessage(isEdit ? 'Quiz updated successfully' : 'Quiz created successfully', 'success');
                }

                this.hideModal('quizPreviewModal');

                // Show main card and header
                const quizMainCard = document.querySelector('.quiz-main-card');
                if (quizMainCard) quizMainCard.style.display = 'flex';
                const quizMainHeader = document.getElementById('quizMainPageHeader');
                if (quizMainHeader) quizMainHeader.style.display = 'flex';

                // Hide form
                document.getElementById('quizFormHeader').style.display = 'none';
                document.getElementById('quizCreationForm').style.display = 'none';

                // Only reload quizzes if this wasn't a draft publish (since we already updated UI)
                if (!wasFromDrafts) {
                    await this.loadQuizzes();
                }
            } else {
                this.showMessage(response.message || (isEdit ? 'Failed to update quiz' : 'Failed to create quiz'), 'error');
            }
        } catch (error) {
            console.error('Error creating/updating quiz:', error);
            this.showMessage('Error processing request', 'error');
        } finally {
            this.hideLoading();
            this.pendingQuizData = null;
        }
    }

    // Draft functionality methods
    getQuizFormData(includeStatus = null) {
        const form = document.getElementById('createQuizForm');
        if (!form) return null;

        const formData = new FormData(form);

        // Collect questions properly
        const questions = [];
        const questionElements = form.querySelectorAll('.question-item');

        questionElements.forEach((questionEl, index) => {
            const questionInput = questionEl.querySelector(`input[name="questions[]"]`);
            const questionText = questionInput ? questionInput.value : '';

            // Get options for this question
            const optionInputs = questionEl.querySelectorAll(`input[name="options${index + 1}[]"]`);
            const options = [];

            optionInputs.forEach(input => {
                options.push(input ? input.value : '');
            });

            // Get correct answer from checkboxes
            const answerCheckboxes = questionEl.querySelectorAll(`input[name^="answers"]`);
            let correctOption = '0'; // default to first option
            answerCheckboxes.forEach((checkbox) => {
                if (checkbox.checked) {
                    correctOption = checkbox.value;
                }
            });

            if (questionText.trim()) {
                questions.push({
                    question: questionText,
                    options: options,
                    correctOption: ['a', 'b', 'c', 'd'][parseInt(correctOption)] || 'a'
                });
            }
        });

        const startTimeStr = formData.get('startTime');
        const endTimeStr = formData.get('endTime');

        if (startTimeStr && endTimeStr) {
            const start = new Date(startTimeStr);
            const end = new Date(endTimeStr);

            if (end <= start) {
                this.showMessage('End Time must be later than Start Time', 'error');
                return null;
            }
        }

        const result = {
            title: formData.get('title'),
            description: '',
            subject: formData.get('subject') || 'General Knowledge',
            class: formData.get('class') || '',
            totalMarks: questions.length || 0,
            startTime: startTimeStr || '',
            endTime: endTimeStr || '',
            duration: parseInt(formData.get('duration')) || 30,
            questions: questions
        };

        // Add status if provided
        if (includeStatus) {
            result.status = includeStatus;
        }

        return result;
    }

    async saveDraft() {
        try {
            const form = document.getElementById('createQuizForm');
            if (!form) {
                this.showMessage('Form not found', 'error');
                return;
            }

            // Validate the form before saving draft
            if (!this.validateQuizForm(form)) {
                // Validation failed - errors are shown inline
                return;
            }

            const formData = this.getQuizFormData('draft');
            if (!formData) {
                return; // Error already shown in getQuizFormData
            }

            const quizId = document.getElementById('quizId').value;
            const isEdit = !!quizId;

            // Add status as draft for unified API
            const quizData = {
                ...formData,
                status: 'draft'
            };

            // Determine if we're updating an existing quiz or creating a new one
            const url = isEdit
                ? `${this.apiBaseUrl}/quizzes/${quizId}`  // Update existing quiz
                : `${this.apiBaseUrl}/quizzes`;            // Create new quiz

            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(quizData)
            });

            const result = await response.json();

            if (result.success) {
                const message = isEdit
                    ? 'Quiz updated to draft successfully!'
                    : 'Draft saved successfully!';

                this.showMessage(message, 'success');

                // Always redirect to Quiz Main Page after Save to Draft
                // This applies to both new quizzes and edited quizzes
                this.backToQuizList();

                // Refresh quizzes to show the updated list
                await this.loadQuizzes();
            } else {
                this.showMessage(result.message || 'Failed to save draft', 'error');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            this.showMessage('Error saving draft', 'error');
        }
    }

    updateQuizUIForDraftStatus() {
        // Update the status badge in the form header
        const statusBadge = document.querySelector('#quizFormHeader .status-badge');
        if (statusBadge) {
            statusBadge.textContent = 'Draft';
            statusBadge.className = 'status-badge draft';
        }

        // Update the status in the quiz card in the list
        const quizId = document.getElementById('quizId').value;
        const quizCard = document.querySelector(`.quiz-card[data-quiz-id="${quizId}"]`);
        if (quizCard) {
            const cardStatusBadge = quizCard.querySelector('.status-badge');
            if (cardStatusBadge) {
                cardStatusBadge.textContent = 'Draft';
                cardStatusBadge.className = 'status-badge draft';
            }
        }

        // Update the header and buttons to reflect draft status
        const headerText = document.querySelector('#quizFormHeader h2');
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        const updateDraftBtn = document.getElementById('updateDraftBtn');
        const publishBtn = document.getElementById('publishQuizBtn');
        
        if (headerText) headerText.innerHTML = '<i class="fas fa-edit"></i> Edit Quiz';
        if (saveDraftBtn) saveDraftBtn.style.display = 'none';
        if (updateDraftBtn) updateDraftBtn.style.display = 'inline-block';
        if (publishBtn) publishBtn.style.display = 'inline-block';

        // Show success message
        this.showMessage('Quiz saved as draft', 'success');
    }

    async showDraftsPage() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/quizzes/drafts`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                this.renderDrafts(result.data);
                // Hide quiz page and show drafts page
                document.getElementById('quiz-page').classList.remove('active');
                document.getElementById('drafts-page').classList.add('active');
            } else {
                this.showMessage(result.message || 'Failed to load drafts', 'error');
            }
        } catch (error) {
            console.error('Error loading drafts:', error);
            this.showMessage('Error loading drafts', 'error');
        }
    }

    renderDrafts(drafts) {
        const draftsList = document.getElementById('draftsList');
        const draftCount = document.getElementById('draftCountSubtitle');

        if (!drafts || drafts.length === 0) {
            draftsList.innerHTML = '<p class="empty">No drafts saved yet</p>';
            draftCount.textContent = '0 drafts';
            return;
        }

        draftCount.textContent = `${drafts.length} draft${drafts.length > 1 ? 's' : ''}`;

        draftsList.innerHTML = drafts.map(draft => {
            const questionCount = draft.questions ? draft.questions.length : 0;
            const createdDate = new Date(draft.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });

            return `
                <div class="draft-card-simple" data-draft-id="${draft._id}">
                    <div class="draft-header">
                        <div class="draft-icon-section">
                            <div class="draft-icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <div class="draft-title-info">
                                <h3 class="draft-title">${draft.title || 'Untitled Quiz'}</h3>
                                <p class="draft-subtitle">${draft.class || 'No class'} • ${draft.subject || 'No subject'}</p>
                            </div>
                        </div>
                        <div class="draft-actions">
                            <button class="draft-btn-publish" onclick="dashboard.publishDraft('${draft._id}')" title="Publish Quiz">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="draft-btn-edit" onclick="dashboard.editDraft('${draft._id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="draft-btn-delete" onclick="dashboard.deleteDraft('${draft._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="draft-info-section">
                        <div class="draft-info-card">
                            <div class="draft-info-icon">
                                <i class="fas fa-list"></i>
                            </div>
                            <div class="draft-info-text">
                                <p class="draft-info-value">${questionCount}</p>
                                <p class="draft-info-label">QUESTIONS</p>
                            </div>
                        </div>
                        <div class="draft-info-card">
                            <div class="draft-info-icon">
                                <i class="fas fa-calendar"></i>
                            </div>
                            <div class="draft-info-text">
                                <p class="draft-info-value">${createdDate}</p>
                                <p class="draft-info-label">CREATED</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="draft-status-section">
                        <button class="draft-btn-status draft">DRAFT</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async editDraft(draftId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/quizzes/${draftId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                const draft = result.data;
                this.populateQuizForm(draft);

                // Switch to quiz creation form
                document.getElementById('drafts-page').classList.remove('active');
                document.getElementById('quiz-page').classList.add('active');

                // Show form
                const quizMainCard = document.querySelector('.quiz-main-card');
                const quizMainHeader = document.getElementById('quizMainPageHeader');

                if (quizMainCard) quizMainCard.style.display = 'none';
                if (quizMainHeader) quizMainHeader.style.display = 'none';

                document.getElementById('quizFormHeader').style.display = 'flex';
                document.getElementById('quizCreationForm').style.display = 'block';

                // Update header and button text for editing draft
                const headerText = document.querySelector('#quizFormHeader h2');
                if (headerText) headerText.innerHTML = '<i class="fas fa-edit"></i> Edit Draft';

                const submitBtn = document.querySelector('#createQuizForm button[type="submit"]');
                if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-check"></i> Publish Quiz';

                // Set minimum date for inputs
                this.setMinDateForQuizInputs();
            } else {
                this.showMessage(result.message || 'Failed to load draft', 'error');
            }
        } catch (error) {
            console.error('Error loading draft:', error);
            this.showMessage('Error loading draft', 'error');
        }
    }

    async publishDraft(draftId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/quizzes/${draftId}/publish`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                // Show success toast message
                this.showMessage('Quiz published successfully', 'success');

                // Remove the draft from the drafts list in real-time
                this.removeDraftFromList(draftId);

                // Add the published quiz to the manage quiz list in real-time
                if (result.quiz) {
                    this.addQuizToList(result.quiz);
                }

                // Update quiz counts
                this.updateQuizCounts();

                // Automatically redirect to Quiz Management page
                document.getElementById('drafts-page').classList.remove('active');
                document.getElementById('quiz-page').classList.add('active');

                // Refresh drafts list to update count (in background)
                this.showDraftsPage();
            } else {
                this.showMessage(result.message || 'Failed to publish draft', 'error');
            }
        } catch (error) {
            console.error('Error publishing draft:', error);
            this.showMessage('Error publishing draft', 'error');
        }
    }

    removeDraftFromList(draftId) {
        const draftElement = document.querySelector(`[data-draft-id="${draftId}"]`);
        if (draftElement) {
            draftElement.remove();
        }
    }

    addQuizToList(quiz) {
        const quizList = document.getElementById('quizList');
        if (!quizList) return;

        // Format Dates
        const createdDate = new Date(quiz.createdAt);
        const formattedCreatedDate = createdDate.toLocaleDateString('en-US');

        const startTime = quiz.startTime ? new Date(quiz.startTime) : null;
        const endTime = quiz.endTime ? new Date(quiz.endTime) : null;

        // Format Schedule Dates
        const scheduleOptions = { month: 'short', day: 'numeric' };
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

        const formatSchedule = (date) => {
            if (!date) return 'Not set';
            const datePart = date.toLocaleDateString('en-US', scheduleOptions);
            const timePart = date.toLocaleTimeString('en-US', timeOptions);
            return `${datePart}, ${timePart}`;
        };

        const formattedStart = formatSchedule(startTime);
        const formattedEnd = formatSchedule(endTime);
        const duration = quiz.duration ? `${quiz.duration} min` : 'Not set';

        const quizCard = document.createElement('div');
        quizCard.className = 'quiz-card';
        quizCard.setAttribute('data-quiz-item-id', quiz._id);
        quizCard.innerHTML = `
            <div class="quiz-card-content">
                <div class="quiz-card-header">
                    <div class="quiz-icon">
                        <i class="fas fa-question"></i>
                    </div>
                    <div class="quiz-title-info">
                        <h3 class="quiz-title">${quiz.title || 'FastAPI'}</h3>
                        <p class="quiz-subject">${quiz.class || '12th'} • ${quiz.subject || 'PYTHON'}</p>
                    </div>
                    <div class="quiz-status published">
                        PUBLISHED
                    </div>
                </div>
                <div class="quiz-card-body">
                    <div class="quiz-meta">
                        <div class="quiz-meta-item">
                            <span class="meta-label">QUESTIONS</span>
                            <span class="meta-value">5</span>
                        </div>
                        <div class="quiz-meta-item">
                            <span class="meta-label">DURATION</span>
                            <span class="meta-value">20 min</span>
                        </div>
                        <div class="quiz-meta-item">
                            <span class="meta-label">CREATED</span>
                            <span class="meta-value">${createdDate}</span>
                        </div>
                    </div>
                    <div class="quiz-dates">
                        <div class="date-item">
                            <span class="date-label">START</span>
                            <span class="date-value">Feb 19, 2026 06:48 PM</span>
                        </div>
                        <div class="date-item">
                            <span class="date-label">END</span>
                            <span class="date-value">Feb 23, 2026 06:48 PM</span>
                        </div>
                    </div>
                </div>
                <div class="quiz-card-actions">
                    <button class="btn-action edit-quiz" data-quiz-id="${quiz._id}">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-action delete-quiz" data-quiz-id="${quiz._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>`;

        // Add the new quiz card to the beginning of the list
        if (quizList.firstChild && quizList.firstChild.classList.contains('empty')) {
            quizList.innerHTML = '';
        }
        quizList.insertBefore(quizCard, quizList.firstChild);
    }

    updateQuizCounts() {
        // Update quiz count in the manage quiz page
        const quizCountSubtitle = document.getElementById('quizCountSubtitle');
        if (quizCountSubtitle) {
            const currentQuizzes = document.querySelectorAll('#quizList .quiz-card').length;
            quizCountSubtitle.textContent = `${currentQuizzes} active quizzes`;
        }

        // Update draft count
        const draftCount = document.getElementById('draftCountSubtitle');
        if (draftCount) {
            const currentDrafts = document.querySelectorAll('#draftsList .draft-card-simple').length;
            draftCount.textContent = `${currentDrafts} draft${currentDrafts !== 1 ? 's' : ''}`;
        }
    }

    showDeleteDraftModal(draftId) {
        this.currentDraftId = draftId;
        this.showModal('deleteDraftModal');
    }

    async deleteDraft(draftId) {
        this.showDeleteDraftModal(draftId);
    }

    async confirmDeleteDraft() {
        if (!this.currentDraftId) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/quizzes/${this.currentDraftId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('Draft deleted successfully!', 'success');
                this.hideModal('deleteDraftModal');
                this.showDraftsPage(); // Refresh drafts list
                this.currentDraftId = null;
            } else {
                this.showMessage(result.message || 'Failed to delete draft', 'error');
            }
        } catch (error) {
            console.error('Error deleting draft:', error);
            this.showMessage('Error deleting draft', 'error');
        }
    }

    populateQuizForm(quiz) {
        const form = document.getElementById('createQuizForm');
        if (!form) return;

        // Set quiz ID for editing
        document.getElementById('quizId').value = quiz._id;

        // Populate basic fields
        form.querySelector('#quizTitle').value = quiz.title || '';
        form.querySelector('#quizClass').value = quiz.class || '';
        form.querySelector('#quizSubject').value = quiz.subject || '';
        form.querySelector('#quizDuration').value = quiz.duration || '';

        // Handle date fields
        if (quiz.startTime) {
            const startTime = new Date(quiz.startTime);
            form.querySelector('#quizStartTime').value = startTime.toISOString().slice(0, 16);
        }
        if (quiz.endTime) {
            const endTime = new Date(quiz.endTime);
            form.querySelector('#quizEndTime').value = endTime.toISOString().slice(0, 16);
        }

        // Populate questions
        const container = document.getElementById('questionsContainer');
        if (container && quiz.questions && quiz.questions.length > 0) {
            container.innerHTML = '';
            quiz.questions.forEach((question, index) => {
                this.addQuizQuestion(question);
            });
        }
    }

    backToQuizList() {
        // Hide form and show quiz list
        const quizMainCard = document.querySelector('.quiz-main-card');
        if (quizMainCard) quizMainCard.style.display = 'flex';

        const quizMainHeader = document.getElementById('quizMainPageHeader');
        if (quizMainHeader) quizMainHeader.style.display = 'flex';

        document.getElementById('quizFormHeader').style.display = 'none';
        document.getElementById('quizCreationForm').style.display = 'none';

        // Reset form
        const form = document.getElementById('createQuizForm');
        if (form) {
            form.reset();
            document.getElementById('quizId').value = '';
        }
    }

    async viewQuizAttempts(quizId) {
        try {
            this.showLoading();

            this.ensureQuizDetailsListeners();
            this.showQuizDetailsPage();

            this.quizDetailsState = {
                quizId,
                filter: 'all',
                search: ''
            };

            const searchInput = document.getElementById('qdSearchInput');
            if (searchInput) searchInput.value = '';
            this.setQuizDetailsFilter('all', true);

            const [attemptsResponse, quizResponse] = await Promise.all([
                this.apiCall(`/teachers/quizzes/${quizId}/attempts`, 'GET'),
                this.apiCall(`/quizzes/${quizId}`, 'GET')
            ]);

            console.log('API Responses:', { attemptsResponse, quizResponse }); // Debug log

            if (!attemptsResponse?.success) {
                this.showMessage(attemptsResponse?.message || 'Failed to load quiz attempts', 'error');
                return;
            }
            if (!quizResponse?.success) {
                this.showMessage(quizResponse?.message || 'Failed to load quiz details', 'error');
                return;
            }

            this.quizDetailsData = {
                quiz: quizResponse.data,
                attempts: attemptsResponse.data || attemptsResponse // Handle both response formats
            };

            console.log('Quiz attempts data loaded:', this.quizDetailsData); // Debug log
            this.renderQuizDetailsPage();
        } catch (error) {
            console.error('Error loading quiz attempts:', error);
            this.showMessage('Error loading quiz attempts', 'error');
        } finally {
            this.hideLoading();
        }
    }

    ensureQuizDetailsListeners() {
        if (this._quizDetailsListenersAdded) return;

        document.getElementById('backToQuizListFromDetailsBtn')?.addEventListener('click', () => {
            this.hideQuizDetailsPage();
        });

        document.getElementById('qdSearchInput')?.addEventListener('input', (e) => {
            this.quizDetailsState = this.quizDetailsState || {};
            this.quizDetailsState.search = e.target.value || '';
            this.renderQuizDetailsPage();
        });

        document.querySelectorAll('.qd-chip').forEach((btn) => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter || 'all';
                this.setQuizDetailsFilter(filter);
            });
        });

        this._quizDetailsListenersAdded = true;
    }

    showQuizDetailsPage() {
        const quizMainCard = document.querySelector('.quiz-main-card');
        if (quizMainCard) quizMainCard.style.display = 'none';

        const quizMainHeader = document.getElementById('quizMainPageHeader');
        if (quizMainHeader) quizMainHeader.style.display = 'none';

        const quizFormHeader = document.getElementById('quizFormHeader');
        const quizCreationForm = document.getElementById('quizCreationForm');
        if (quizFormHeader) quizFormHeader.style.display = 'none';
        if (quizCreationForm) quizCreationForm.style.display = 'none';

        const details = document.getElementById('quizDetailsPage');
        if (details) details.style.display = 'block';
    }

    hideQuizDetailsPage() {
        const details = document.getElementById('quizDetailsPage');
        if (details) details.style.display = 'none';

        const quizMainCard = document.querySelector('.quiz-main-card');
        if (quizMainCard) quizMainCard.style.display = 'flex';

        const quizMainHeader = document.getElementById('quizMainPageHeader');
        if (quizMainHeader) quizMainHeader.style.display = 'flex';

        this.quizDetailsData = null;
        this.quizDetailsState = null;
    }

    setQuizDetailsFilter(filter, skipRender = false) {
        this.quizDetailsState = this.quizDetailsState || {};
        this.quizDetailsState.filter = filter;

        document.querySelectorAll('.qd-chip').forEach((b) => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.qd-chip[data-filter="${filter}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        if (!skipRender) this.renderQuizDetailsPage();
    }

    renderQuizDetailsPage() {
        if (!this.quizDetailsData?.quiz || !this.quizDetailsData?.attempts) return;

        const quiz = this.quizDetailsData.quiz;
        const {
            totalStudents,
            attemptedCount,
            notAttemptedCount,
            attemptedStudents = [],
            notAttemptedStudents = []
        } = this.quizDetailsData.attempts || {};

        // Header title
        const titleEl = document.getElementById('qdQuizTitle');
        const subtitleEl = document.getElementById('qdQuizSubtitle');
        if (titleEl) titleEl.textContent = quiz.title || 'Untitled Quiz';
        if (subtitleEl) subtitleEl.textContent = `${quiz.class || '—'} • ${quiz.subject || '—'}`;

        // Summary
        document.getElementById('qdTotalStudents').textContent = totalStudents ?? 0;
        document.getElementById('qdAttemptedCount').textContent = attemptedCount ?? 0;
        document.getElementById('qdNotAttemptedCount').textContent = notAttemptedCount ?? 0;

        const state = this.quizDetailsState || { filter: 'all', search: '' };
        const q = (state.search || '').trim().toLowerCase();

        const attemptedFiltered = attemptedStudents.filter((s) => (s.name || '').toLowerCase().includes(q));
        const notAttemptedFiltered = notAttemptedStudents.filter((s) => (s.name || '').toLowerCase().includes(q));

        // If no assigned students, show only summary with zeros and hide student lists
        if ((totalStudents ?? 0) === 0) {
            // Hide both student sections completely
            const attemptedSection = document.getElementById('qdAttemptedSection');
            const notAttemptedSection = document.getElementById('qdNotAttemptedSection');
            if (attemptedSection) attemptedSection.style.display = 'none';
            if (notAttemptedSection) notAttemptedSection.style.display = 'none';

            // Hide section badges since there are no sections
            const attemptedBadge = document.getElementById('qdAttemptedBadge');
            const notAttemptedBadge = document.getElementById('qdNotAttemptedBadge');
            if (attemptedBadge) attemptedBadge.style.display = 'none';
            if (notAttemptedBadge) notAttemptedBadge.style.display = 'none';

            return;
        }

        // Only show Attempted section if there are attempted students
        const attemptedSection = document.getElementById('qdAttemptedSection');
        const notAttemptedSection = document.getElementById('qdNotAttemptedSection');
        
        // Show attempted section only if there are attempted students
        const showAttempted = (state.filter === 'all' || state.filter === 'attempted') && attemptedFiltered.length > 0;
        // Show not attempted section only if there are not attempted students and total students > 0
        const showNotAttempted = (state.filter === 'all' || state.filter === 'notAttempted') && notAttemptedFiltered.length > 0 && (totalStudents ?? 0) > 0;
        
        if (attemptedSection) attemptedSection.style.display = showAttempted ? 'block' : 'none';
        if (notAttemptedSection) notAttemptedSection.style.display = showNotAttempted ? 'block' : 'none';

        // Section badges (reflect current search)
        document.getElementById('qdAttemptedBadge').textContent = attemptedFiltered.length;
        document.getElementById('qdNotAttemptedBadge').textContent = notAttemptedFiltered.length;

        // Show badges when there are students
        const attemptedBadge = document.getElementById('qdAttemptedBadge');
        const notAttemptedBadge = document.getElementById('qdNotAttemptedBadge');
        if (attemptedBadge) attemptedBadge.style.display = 'inline-block';
        if (notAttemptedBadge) notAttemptedBadge.style.display = 'inline-block';

        // Get DOM elements for attempted section
        const attemptedTbody = document.getElementById('qdAttemptedTbody');
        const attemptedCards = document.getElementById('qdAttemptedCards');

        if (attemptedFiltered.length === 0) {
            const emptyHtml = `
                <tr>
                    <td colspan="5">
                        <div class="qd-empty-state">
                            <div class="qd-empty-title">0 Students Attempted</div>
                            <div class="qd-empty-subtitle">Students will appear here once they submit this quiz.</div>
                        </div>
                    </td>
                </tr>
            `;
            if (attemptedTbody) attemptedTbody.innerHTML = emptyHtml;
            if (attemptedCards) attemptedCards.innerHTML = `
                <div class="qd-empty-state">
                    <div class="qd-empty-title">0 Students Attempted</div>
                    <div class="qd-empty-subtitle">Students will appear here once they submit this quiz.</div>
                </div>
            `;
        } else {
            if (attemptedTbody) {
                attemptedTbody.innerHTML = attemptedFiltered.map((s) => {
                    const total = (s.totalMarks ?? quiz.totalMarks ?? 0);
                    const when = s.attemptTime ? moment(s.attemptTime).format('DD MMM YYYY, HH:mm') : '—';
                    return `
                        <tr>
                            <td>${s.name || '—'}</td>
                            <td>${s.score ?? 0} / ${total}</td>
                            <td>${when}</td>
                            <td><span class="qd-badge qd-badge-success">ATTEMPTED</span></td>
                            <td>
                                <button class="qd-btn-outline" type="button" onclick="dashboard.viewAttemptDetails('${s.id}')">
                                    View Details
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            if (attemptedCards) {
                attemptedCards.innerHTML = attemptedFiltered.map((s) => {
                    const total = (s.totalMarks ?? quiz.totalMarks ?? 0);
                    const when = s.attemptTime ? moment(s.attemptTime).format('DD MMM YYYY, HH:mm') : '—';
                    return `
                        <div class="qd-mobile-card">
                            <div class="qd-mobile-card-top">
                                <div class="qd-mobile-name">${s.name || '—'}</div>
                                <span class="qd-badge qd-badge-success">ATTEMPTED</span>
                            </div>
                            <div class="qd-mobile-meta">
                                <div><span class="qd-mobile-label">Score</span><span class="qd-mobile-value">${s.score ?? 0} / ${total}</span></div>
                                <div><span class="qd-mobile-label">Attempt Time</span><span class="qd-mobile-value">${when}</span></div>
                            </div>
                            <div class="qd-mobile-actions">
                                <button class="qd-btn-outline" type="button" onclick="dashboard.viewAttemptDetails('${s.id}')">View Details</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        // Not attempted table + mobile cards
        const notAttemptedTbody = document.getElementById('qdNotAttemptedTbody');
        const notAttemptedCards = document.getElementById('qdNotAttemptedCards');

        if ((notAttemptedCount ?? 0) === 0) {
            const okHtml = `
                <tr>
                    <td colspan="2">
                        <div class="qd-empty-state qd-empty-state-success">
                            <div class="qd-empty-title"><i class="fas fa-check-circle"></i> All students have attempted this quiz</div>
                        </div>
                    </td>
                </tr>
            `;
            if (notAttemptedTbody) notAttemptedTbody.innerHTML = okHtml;
            if (notAttemptedCards) notAttemptedCards.innerHTML = `
                <div class="qd-empty-state qd-empty-state-success">
                    <div class="qd-empty-title"><i class="fas fa-check-circle"></i> All students have attempted this quiz</div>
                </div>
            `;
        } else if (notAttemptedFiltered.length === 0) {
            const emptyHtml = `
                <tr>
                    <td colspan="2">
                        <div class="qd-empty-state">
                            <div class="qd-empty-title">No students found</div>
                        </div>
                    </td>
                </tr>
            `;
            if (notAttemptedTbody) notAttemptedTbody.innerHTML = emptyHtml;
            if (notAttemptedCards) notAttemptedCards.innerHTML = `
                <div class="qd-empty-state">
                    <div class="qd-empty-title">No students found</div>
                </div>
            `;
        } else {
            if (notAttemptedTbody) {
                notAttemptedTbody.innerHTML = notAttemptedFiltered.map((s) => `
                    <tr>
                        <td>${s.name || '—'}</td>
                        <td><span class="qd-badge qd-badge-danger">NOT ATTEMPTED</span></td>
                    </tr>
                `).join('');
            }

            if (notAttemptedCards) {
                notAttemptedCards.innerHTML = notAttemptedFiltered.map((s) => `
                    <div class="qd-mobile-card">
                        <div class="qd-mobile-card-top">
                            <div class="qd-mobile-name">${s.name || '—'}</div>
                            <span class="qd-badge qd-badge-danger">NOT ATTEMPTED</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    async viewAttemptDetails(attemptId) {
        // This can be implemented to show detailed answer breakdown
        this.showMessage('Detailed view coming soon!', 'info');
    }

    // Real-time quiz expiry monitoring
    startQuizExpiryMonitoring() {
        // Clear any existing interval
        if (this.quizExpiryInterval) {
            clearInterval(this.quizExpiryInterval);
        }

        // Check every 30 seconds
        this.quizExpiryInterval = setInterval(() => {
            this.updateQuizStatuses();
        }, 30000);

        // Initial check
        this.updateQuizStatuses();
    }

    updateQuizStatuses() {
        if (!this.currentQuizzes || this.currentQuizzes.length === 0) return;

        const now = new Date();
        let statusChanged = false;

        this.currentQuizzes.forEach(quiz => {
            const isDraft = quiz.status === 'draft';
            const endTime = quiz.endTime ? new Date(quiz.endTime) : null;
            const startTime = quiz.startTime ? new Date(quiz.startTime) : null;
            
            const isExpired = !isDraft && endTime && endTime < now;
            const isStarted = !isDraft && startTime && startTime <= now;

            // Find the quiz card element
            const quizCard = document.querySelector(`[data-quiz-item-id="${quiz._id}"]`);
            if (!quizCard) return;

            // Update status badge if needed
            const statusButton = quizCard.querySelector('.btn-status');
            if (statusButton) {
                let newStatusClass, newStatusText;
                if (isDraft) {
                    newStatusClass = 'draft';
                    newStatusText = 'DRAFT';
                } else if (isExpired) {
                    newStatusClass = 'expired';
                    newStatusText = 'EXPIRED';
                } else {
                    newStatusClass = 'published';
                    newStatusText = 'PUBLISHED';
                }

                // Update status if changed
                if (!statusButton.classList.contains(newStatusClass)) {
                    statusButton.className = `btn-status ${newStatusClass}`;
                    statusButton.textContent = newStatusText;
                    statusChanged = true;
                }
            }

            // Update edit button state if needed
            const editButton = quizCard.querySelector('.btn-edit');
            if (editButton && !isDraft) {
                const shouldBeDisabled = isStarted;
                const isCurrentlyDisabled = editButton.classList.contains('disabled');
                
                if (shouldBeDisabled !== isCurrentlyDisabled) {
                    if (shouldBeDisabled) {
                        editButton.classList.add('disabled');
                        editButton.setAttribute('disabled', 'disabled');
                        editButton.setAttribute('title', 'Cannot edit published quiz after start time');
                    } else {
                        editButton.classList.remove('disabled');
                        editButton.removeAttribute('disabled');
                        editButton.setAttribute('title', 'Edit Quiz');
                    }
                    statusChanged = true;
                }
            }
        });

        // Show notification if status changed
        if (statusChanged) {
            console.log('Quiz statuses updated in real-time');
        }
    }

    stopQuizExpiryMonitoring() {
        if (this.quizExpiryInterval) {
            clearInterval(this.quizExpiryInterval);
            this.quizExpiryInterval = null;
        }
    }
}
let dashboard;
let teacherDashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new TeacherDashboard();
    teacherDashboard = dashboard;
});

// Quiz CSV and Preview Handlers

