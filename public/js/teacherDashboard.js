class TeacherDashboard {
    constructor() {
        this.apiBaseUrl = '/api';
        this.token = localStorage.getItem('token');
        this.teacher = null;
        this.currentStudents = [];
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
            this.setupEventListeners();
            this.loadTeacherProfile();
            this.loadDashboardData();
        } else {
            // Wait for components to load
            document.addEventListener('componentsLoaded', () => {
                this.setupEventListeners();
                this.loadTeacherProfile();
                this.loadDashboardData();
            });
        }
    }

    setupEventListeners() {
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
    }

    setupModalControls() {
        // Add Student Modal
        document.getElementById('addStudentBtn')?.addEventListener('click', () => {
            // ✅ Always clear old values when opening Add Student modal
            const form = document.getElementById("addStudentForm");
            if (form) {
                form.reset();
                this.clearValidationMessages(form);
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
        });

        // Create Quiz Modal
        document.getElementById('createQuizBtn')?.addEventListener('click', () => {
            this.showModal('createQuizModal');
        });

        document.getElementById('closeQuizModal')?.addEventListener('click', () => {
            this.hideModal('createQuizModal');
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
                    if (modal.id === 'deleteConfirmModal') {
                        this.hideDeleteConfirmModal();
                    } else {
                        this.hideModal(modal.id);
                    }
                }
            });
        });

        // Close delete modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const deleteModal = document.getElementById('deleteConfirmModal');
                if (deleteModal.classList.contains('show')) {
                    this.hideDeleteConfirmModal();
                }
            }
        });
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

        // Availability Forms
        document.getElementById('saveAvailabilityBtn')?.addEventListener('click', () => {
            this.saveInlineEditedAvailability();
        });

        // Marks Form
        document.getElementById('marksForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMarks(e.target);
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

    async loadQuizzes() {
        try {
            const response = await this.apiCall('/quizzes', 'GET');
            if (response.success) {
                this.displayQuizzes(response.data);
                this.updateRecentQuizzes(response.data.slice(0, 5));
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
        const list = document.getElementById('quizList');
        if (!list) return;

        if (quizzes.length === 0) {
            list.innerHTML = '<p class="empty">No quizzes created yet</p>';
            return;
        }

        list.innerHTML = quizzes.map(quiz => `
            <div class="quiz-item" data-quiz-item-id="${quiz._id}">
                <div class="quiz-header">
                    <h3 class="quiz-title">${quiz.title}</h3>
                    <span class="quiz-subject-badge">
                        <i class="fas fa-tag"></i>
                        ${quiz.subject || 'General'}
                    </span>
                </div>
                <div class="quiz-body">
                    <div class="quiz-details">
                        <div class="quiz-detail">
                            <i class="fas fa-question-circle"></i>
                            <span><strong>${quiz.questions ? quiz.questions.length : 0}</strong> Questions</span>
                        </div>
                        <div class="quiz-detail">
                            <i class="fas fa-star"></i>
                            <span><strong>${quiz.totalMarks || (quiz.questions ? quiz.questions.length : 0)}</strong> Marks</span>
                        </div>
                        <div class="quiz-detail">
                            <i class="fas fa-calendar"></i>
                            <span><strong>Created:</strong> ${new Date(quiz.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div class="quiz-detail">
                            <i class="fas fa-clock"></i>
                            <span><strong>Updated:</strong> ${new Date(quiz.updatedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div class="quiz-actions">
                    <button class="quiz-btn quiz-btn-edit" onclick="dashboard.editQuiz('${quiz._id}')">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="quiz-btn quiz-btn-delete" onclick="dashboard.deleteQuiz('${quiz._id}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
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

  /*  enableInlineEdit() {
        const container = document.getElementById('currentSchedule');
        if (!container) return;

        const editBtn = document.getElementById('editAvailabilityBtn');
        const saveBtn = document.getElementById('saveAvailabilityBtn');

        container.querySelectorAll('.schedule-item').forEach(item => {
            const day = item.dataset.day;
            const timeDiv = item.querySelector('.schedule-time');

            let startTime = timeDiv.dataset.start || "00:00";
            let endTime = timeDiv.dataset.end || "00:00";

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
        });

        if (editBtn) editBtn.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'block';
    }*/

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

   /* setOrEraseDay(day) {
        const row = document.querySelector(`.availability-row[data-day="${day}"]`);
        if (!row) return;

        const timeDiv = row.querySelector(".availability-time");
        if (!timeDiv) return;

        const startTime = timeDiv.dataset.start || "00:00";
        const endTime = timeDiv.dataset.end || "00:00";
        const isNotSet = startTime === "00:00" && endTime === "00:00";

        if (isNotSet) {
            // If not set, enable edit mode
            this.enableDayEdit(day);
        } else {
            // If set, clear the times
            this.clearDayTime(day);
            // Update local data immediately
            const dayIndex = this.currentAvailabilityData.findIndex(item => item.day === day);
            if (dayIndex !== -1) {
                this.currentAvailabilityData[dayIndex].startTime = "00:00";
                this.currentAvailabilityData[dayIndex].endTime = "00:00";
            }
            // Show save button
            const saveBtn = document.getElementById("saveAvailabilityBtn");
            if (saveBtn) saveBtn.style.display = "block";
        }
    }*/

    clearDayTime(day) {
        const startInput = document.querySelector(`input[data-type="start-time"][data-day="${day}"]`);
        const endInput = document.querySelector(`input[data-type="end-time"][data-day="${day}"]`);

        if (startInput) startInput.value = "";
        if (endInput) endInput.value = "";
    }

   /* clearAllDaySlots() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
            this.clearDayTime(day);
        });
    }*/

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
            <p>${new Date(holiday.startDate || holiday.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })} • ${holiday.reason === 'public' || holiday.reason === 'Public Holiday' ? 'Public' : 'Personal'} • ${holiday.duration || 1} day(s)</p>
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

        if (quizzes.length === 0) {
            container.innerHTML = '<p class="empty">No quizzes created yet</p>';
            return;
        }

        container.innerHTML = quizzes.map(quiz => `
        <div class="quiz-item-small clickable-item" data-quiz-id="${quiz._id}">
            <h4><i class="fas fa-question-circle"></i> ${quiz.title}</h4>
            <p> ${quiz.subject || 'General'} • ${quiz.questions ? quiz.questions.length : 0} questions • ${quiz.totalMarks || (quiz.questions ? quiz.questions.length : 0)} marks</p>
        </div>
    `).join('');

        // Add click handlers
        container.querySelectorAll('.quiz-item-small').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateToQuizPage(item.dataset.quizId);
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
            <h4><i class="fas fa-clock"></i> ${session.title}</h4>
            <p>${session.date || 'Scheduled'} • ${session.day || 'Weekday'} • ${session.sessionDuration || 60} min</p>
        </div>
    `).join('');

        // Add click handlers
        container.querySelectorAll('.session-item-small').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateToSessionPage(item.dataset.sessionId);
            });
        });
    }

    navigateToQuizPage(quizId) {
        // Switch to quiz page
        this.switchPage('quiz');

        // Highlight the specific quiz if ID is provided
        if (quizId) {
            setTimeout(() => {
                const quizElement = document.querySelector(`[data-quiz-item-id="${quizId}"]`);
                if (quizElement) {
                    quizElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    quizElement.classList.add('highlighted');
                    setTimeout(() => {
                        quizElement.classList.remove('highlighted');
                    }, 2000);
                }
            }, 100);
        }
    }

    navigateToSessionPage(sessionId) {
        // Switch to session page
        this.switchPage('sessions');

        // Highlight the specific session if ID is provided
        if (sessionId) {
            setTimeout(() => {
                const sessionElement = document.querySelector(`[data-session-item-id="${sessionId}"]`);
                if (sessionElement) {
                    sessionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    sessionElement.classList.add('highlighted');
                    setTimeout(() => {
                        sessionElement.classList.remove('highlighted');
                    }, 2000);
                }
            }, 100);
        }
    }

    navigateToHolidayPage(holidayId) {
        // Switch to holiday page
        this.switchPage('holidays');

        // Highlight the specific holiday if ID is provided
        if (holidayId) {
            setTimeout(() => {
                const holidayElement = document.querySelector(`[data-holiday-item-id="${holidayId}"]`);
                if (holidayElement) {
                    holidayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    holidayElement.classList.add('highlighted');
                    setTimeout(() => {
                        holidayElement.classList.remove('highlighted');
                    }, 2000);
                }
            }, 100);
        }
    }

    async addStudent(form) {
        const formData = new FormData(form);
        formData.append('teacherUserId', this.teacher.userId);

        // Debug: Get timezone value specifically
        const timezoneSelect = form.querySelector('select[name="timezone"]');
        const selectedTimezone = timezoneSelect ? timezoneSelect.value : 'NOT_FOUND';
        console.log('Timezone select element:', timezoneSelect);
        console.log('Selected timezone value:', selectedTimezone);

        // Debug: Log all form data
        console.log('Form data being sent:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}: ${value}`);
        }

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
                if (response.skippedDetails && response.skippedDetails.length > 0) {
                    message += '\n\nSkipped rows:';
                    response.skippedDetails.forEach(detail => {
                        message += `\nRow ${detail.row} (${detail.userId}): ${detail.reasons.join(', ')}`;
                    });
                }
                this.showMessage(message, response.inserted > 0 ? 'success' : 'warning');
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

        // Collect questions properly
        const questions = [];
        const questionElements = form.querySelectorAll('.question-item');
        questionElements.forEach((questionEl, index) => {
            const questionText = questionEl.querySelector(`input[name="questions[]"]`).value;
            const options = [
                questionEl.querySelector(`input[name="options${index + 1}[]"]:nth-child(2)`).value,
                questionEl.querySelector(`input[name="options${index + 1}[]"]:nth-child(3)`).value,
                questionEl.querySelector(`input[name="options${index + 1}[]"]:nth-child(4)`).value,
                questionEl.querySelector(`input[name="options${index + 1}[]"]:nth-child(5)`).value
            ];
            const correctOption = questionEl.querySelector(`select[name="answers[]"]`).value;

            console.log(`Question ${index + 1}:`, { questionText, options, correctOption });

            questions.push({
                question: questionText,
                options: options,
                correctOption: ['a', 'b', 'c', 'd'][parseInt(correctOption)]
            });
        });

        const quizData = {
            title: formData.get('title'),
            subject: formData.get('subject') || 'General Knowledge',
            class: formData.get('class') || '',
            questions: questions
        };

        try {
            this.showLoading();
            const response = await this.apiCall('/quizzes', 'POST', quizData);

            console.log('=== SERVER RESPONSE ===');
            console.log('Response:', response);

            if (response.success || response.quiz) {
                this.showMessage('Quiz created successfully', 'success');
                this.hideModal('createQuizModal');
                form.reset();
                await this.loadQuizzes();
                await this.loadStats();
            } else {
                this.showMessage(response.message || 'Failed to create quiz', 'error');
            }
        } catch (error) {
            console.error('Error creating quiz:', error);
            const customErrorMessage = this.getCustomErrorMessage(error, 'Quiz creation');
            this.showMessage(customErrorMessage, 'error');
        } finally {
            this.hideLoading();
        }
    }

    showInlineError(input, message) {
        if (!input) return;

        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';

        // Remove existing error message if any
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
        color: #ef4444;
        font-size: 12px;
        margin-top: 4px;
        font-weight: 500;
    `;
        input.parentNode.appendChild(errorDiv);
    }

    clearValidationErrors() {
        // Clear all error styles
        document.querySelectorAll('.availability-card input[type="time"]').forEach(input => {
            input.style.borderColor = '';
            input.style.boxShadow = '';
        });

        // Remove all error messages
        document.querySelectorAll('.error-message').forEach(error => {
            error.remove();
        });
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

    addQuizQuestion() {
        const container = document.getElementById('questionsContainer');
        const questionCount = container.querySelectorAll('.question-item').length + 1;

        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.innerHTML = `
            <input type="text" name="questions[]" placeholder="Question ${questionCount}" required>
            <input type="text" name="options${questionCount}[]" placeholder="Option A" required>
            <input type="text" name="options${questionCount}[]" placeholder="Option B" required>
            <input type="text" name="options${questionCount}[]" placeholder="Option C" required>
            <input type="text" name="options${questionCount}[]" placeholder="Option D" required>
            <select name="answers[]">
                <option value="0">A</option>
                <option value="1">B</option>
                <option value="2">C</option>
                <option value="3">D</option>
            </select>
            <button type="button" class="btn-remove" onclick="this.parentElement.remove()">Remove</button>
        `;

        container.appendChild(questionItem);
    }

    switchPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${pageName}-page`).classList.add('active');

        // Load page-specific data
        if (pageName === 'students') {
            this.loadStudents();
        } else if (pageName === 'quiz') {
            this.loadQuizzes();
        } else if (pageName === 'availability') {
            this.loadAvailability();
        } else if (pageName === 'holidays') {
            this.loadHolidays();
        } else if (pageName === 'sessions') {
            this.loadSessions();
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
        }
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');

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

        console.log(`API Call: ${method} ${this.apiBaseUrl}${endpoint}`, config);

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
                    await this.loadQuizzes();
                    await this.loadStats();
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
        this.clearValidationMessages(form);

        // Re-setup profile image upload functionality
        this.setupEditProfileImageUpload();

        this.showModal('editStudentModal');
    }

    validateEditFormInput(input) {
        const value = input.value.trim();
        const isValid = input.checkValidity();

        if (isValid) {
            input.style.borderColor = '#28a745';
            input.classList.remove('error');
        } else {
            input.style.borderColor = '#dc3545';
            input.classList.add('error');
        }
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

    clearValidationMessages(form) {
        form.querySelectorAll('.validation-message').forEach(msg => {
            msg.textContent = '';
        });
        form.querySelectorAll('input, select').forEach(field => {
            field.classList.remove('error');
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

    clearSessionFormValidation() {
        const form = document.getElementById('sessionForm');
        if (form) {
            // Clear all field errors
            form.querySelectorAll('input, select').forEach(field => {
                field.classList.remove('error');
            });

            // Clear all validation messages
            form.querySelectorAll('.validation-message').forEach(message => {
                message.textContent = '';
            });
        }
    }

    clearHolidayFormValidation(formId) {
        const form = document.getElementById(formId);
        if (form) {
            // Clear all field errors
            form.querySelectorAll('input, select').forEach(field => {
                field.classList.remove('error');
            });

            // Clear all validation messages
            form.querySelectorAll('.validation-message').forEach(message => {
                message.textContent = '';
            });
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
                                <input type="text" id="editStudentClass" name="class" placeholder="e.g., 10th Grade" data-required="true">
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
            if (this.validateEditStudentForm(newForm)) {
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
            this.showLoading();
            const response = await this.apiCall(`/quizzes/${quizId}`, 'GET');

            if (response.success || response._id) {
                this.showEditQuizModal(response.data || response);
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

    showEditQuizModal(quiz) {
        const modal = document.getElementById('editQuizModal');
        if (!modal) {
            this.createEditQuizModal();
            this.showEditQuizModal(quiz);
            return;
        }

        // Fill form with quiz data
        document.getElementById('editQuizId').value = quiz._id;
        document.getElementById('editQuizTitle').value = quiz.title;
        document.getElementById('editQuizSubject').value = quiz.subject;

        // Clear existing questions
        const questionsContainer = document.getElementById('editQuestionsContainer');
        questionsContainer.innerHTML = '<h4>Questions</h4>';

        // Add existing questions
        quiz.questions.forEach((question, index) => {
            this.addEditQuizQuestion(question, index + 1);
        });

        this.showModal('editQuizModal');
    }

    createEditQuizModal() {
        const modalHtml = `
        <div class="modal" id="editQuizModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Quiz</h3>
                    <button class="modal-close" id="closeEditQuizModal">&times;</button>
                </div>
                <form id="editQuizForm">
                    <input type="hidden" id="editQuizId" name="id">
                    <div class="form-group">
                        <label>Quiz Title</label>
                        <input type="text" id="editQuizTitle" name="title" placeholder="Enter quiz title" required>
                    </div>
                    <div class="form-group">
                        <label>Subject</label>
                        <input type="text" id="editQuizSubject" name="subject" placeholder="Enter subject" required>
                    </div>
                    <div id="editQuestionsContainer">
                        <h4>Questions</h4>
                    </div>
                    <button type="button" class="btn-secondary" id="addEditQuestionBtn">Add Question</button>
                    <button type="submit" class="btn-primary">Update Quiz</button>
                </form>
            </div>
        </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listeners
        document.getElementById('closeEditQuizModal').addEventListener('click', () => {
            this.hideModal('editQuizModal');
        });

        document.getElementById('editQuizForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateQuiz(e.target);
        });

        document.getElementById('addEditQuestionBtn').addEventListener('click', () => {
            this.addEditQuizQuestion();
        });
    }

    addEditQuizQuestion(existingQuestion = null, questionNumber = null) {
        const container = document.getElementById('editQuestionsContainer');
        const questionCount = questionNumber || container.querySelectorAll('.question-item').length + 1;

        const questionItem = document.createElement('div');
        questionItem.className = 'question-item';
        questionItem.innerHTML = `
        <input type="text" name="questions[]" placeholder="Question ${questionCount}" value="${existingQuestion?.question || ''}" required>
        <input type="text" name="options${questionCount}[]" placeholder="Option A" value="${existingQuestion?.options?.[0] || ''}" required>
        <input type="text" name="options${questionCount}[]" placeholder="Option B" value="${existingQuestion?.options?.[1] || ''}" required>
        <input type="text" name="options${questionCount}[]" placeholder="Option C" value="${existingQuestion?.options?.[2] || ''}" required>
        <input type="text" name="options${questionCount}[]" placeholder="Option D" value="${existingQuestion?.options?.[3] || ''}" required>
        <select name="answers[]">
            <option value="0" ${existingQuestion?.correctOption === 'a' ? 'selected' : ''}>A</option>
            <option value="1" ${existingQuestion?.correctOption === 'b' ? 'selected' : ''}>B</option>
            <option value="2" ${existingQuestion?.correctOption === 'c' ? 'selected' : ''}>C</option>
            <option value="3" ${existingQuestion?.correctOption === 'd' ? 'selected' : ''}>D</option>
        </select>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">Remove</button>
    `;

        container.appendChild(questionItem);
    }

    async updateQuiz(form) {
        const formData = new FormData(form);
        const quizId = formData.get('id');

        const quizData = {
            title: formData.get('title'),
            subject: formData.get('subject'),
            questions: []
        };

        // Collect questions
        const questions = formData.getAll('questions[]');
        const answers = formData.getAll('answers[]');

        questions.forEach((question, index) => {
            const options = formData.getAll(`options${index + 1}[]`);
            quizData.questions.push({
                question,
                options,
                correctOption: ['a', 'b', 'c', 'd'][parseInt(answers[index])]
            });
        });

        try {
            this.showLoading();
            const response = await this.apiCall(`/quizzes/${quizId}`, 'PUT', quizData);

            if (response.success || response.quiz) {
                this.showMessage('Quiz updated successfully', 'success');
                this.hideModal('editQuizModal');
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
    }

    validateEditStudentForm(form) {
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

    showUpdateStudentSelection() {
        // Get all students to populate selection dropdown
        this.loadStudents().then(() => {
            const students = this.currentStudents || [];

            if (students.length === 0) {
                this.showMessage('No students available to update', 'error');
                return;
            }

            // Create selection modal
            const modalHtml = `
                <div class="modal" id="selectStudentModal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Select Student to Update</h3>
                            <button class="modal-close" id="closeSelectStudentModal">&times;</button>
                        </div>
                        <div class="form-group">
                            <label>Select Student:</label>
                            <select id="studentSelect" required>
                                <option value="">Choose a student...</option>
                                ${students.map(student =>
                `<option value="${student._id}">${student.name} (${student.userId})</option>`
            ).join('')}
                            </select>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-primary" id="confirmSelectStudent">Update Selected Student</button>
                            <button type="button" class="btn-secondary" id="cancelSelectStudent">Cancel</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Add event listeners
            document.getElementById('closeSelectStudentModal').addEventListener('click', () => {
                this.hideModal('selectStudentModal');
            });

            document.getElementById('cancelSelectStudent').addEventListener('click', () => {
                this.hideModal('selectStudentModal');
            });

            document.getElementById('confirmSelectStudent').addEventListener('click', () => {
                const selectedStudentId = document.getElementById('studentSelect').value;

                if (selectedStudentId) {
                    this.hideModal('selectStudentModal');
                    this.editStudent(selectedStudentId);
                } else {
                    this.showMessage('Please select a student to update', 'error');
                }
            });
        });
    }

    async deleteAvailability(slotId) {
        if (!confirm('Are you sure you want to delete this availability slot?')) return;

        try {
            this.showLoading();
            const response = await this.apiCall(`/teacher-availability/${slotId}`, 'DELETE');

            if (response.success) {
                this.showMessage('Availability deleted successfully', 'success');
                await this.loadAvailability();
                await this.loadStats();
            } else {
                this.showMessage(response.message || 'Failed to delete availability', 'error');
            }
        } catch (error) {
            console.error('Error deleting availability:', error);
            this.showMessage('Error deleting availability', 'error');
        } finally {
            this.hideLoading();
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

    showSingleDayHolidayCard() {
        const setHolidaysCard = document.getElementById('setHolidaysCard');
        const singleDayHolidayCard = document.getElementById('singleDayHolidayCard');

        if (setHolidaysCard) setHolidaysCard.style.display = 'none';
        if (singleDayHolidayCard) singleDayHolidayCard.style.display = 'block';
    }

    validateHolidayForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;

        // Clear all previous validation messages
        this.clearHolidayFormValidation(formId);

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

                this.updateRecentSessions(response.sessions.slice(0, 2));
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
        console.log('displaySessions called with:', sessions.length, 'sessions');

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
                                                        data-student-id="${slot.bookedBy || slot.bookedBy}"
                                                        data-booked-by-teacher="${slot.bookedByTeacher ? 'true' : 'false'}"
                                                        ${slot.bookedByTeacher ? `title="This slot was assigned by you"` : ''}
                                                    `
                        }
                                            onclick="dashboard.handleSlotClick(this, '${slot.isBooked}', '${session.sessionId}', '${slot.startUTC}', '${slot.endUTC}', '${slot.bookedBy || ''}', '${slot.studentName || ''}', '${slot.bookedByTeacher || false}')"
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

        this.clearSessionFormValidation();

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

            console.log('Session form reset successfully');
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

        this.clearSessionFormValidation();

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

        console.log('Sending session data:', sessionData);

        try {
            this.showLoading();
            const response = await this.apiCall('/sessions/slots', 'POST', sessionData);

            if (response.success) {
                this.hideSessionModal();

                if (response.data) {
                    console.log('New session response data:', response.data);
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

                    console.log('Mapped new session:', newSession);
                    currentSessions.unshift(newSession);

                    this.allSessions = currentSessions;

                    console.log('Updating UI with new session...');
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

                console.log('Original error message:', errorMsg);
                let customErrorMessage = this.getSessionCreationErrorMessage({
                    response: { data: { message: errorMsg } }
                });
                console.log('Custom error message:', customErrorMessage);
                this.showMessage(customErrorMessage, 'error');
            }
        } catch (error) {
            console.error('Error creating session:', error);

            this.hideSessionModal();

            console.log('Catch block error:', error);
            let customErrorMessage = this.getSessionCreationErrorMessage(error);
            console.log('Custom error message from catch:', customErrorMessage);
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

    getSessionCreationErrorMessage(error) {
        let errorMessage = '';

        if (error.response && error.response.data) {
            errorMessage = error.response.data.message || '';
        } else if (error.message) {
            errorMessage = error.message;
        }

        console.log('getSessionCreationErrorMessage - full error object:', error);
        console.log('getSessionCreationErrorMessage - extracted errorMessage:', errorMessage);

        if (errorMessage) {
            return errorMessage;
        } else {
            return "Session cannot be created. Please check your connection and try again.";
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
                console.log('Assign button clicked - immediate response');
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
            console.log('Assign slot already in progress, ignoring duplicate call');
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

            console.log("Assign slot payload:", payload);

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
                    console.log('slot.dataset--->', slot.dataset);

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
                console.log('slot.dataset 2--->');
                this.showCancelSlotConfirmation(sessionId, startUTC, endUTC, studentId, studentName);
            } else {
                this.showMessage('Cannot cancel slots booked directly by students', 'error');
            }
        } else {
            this.openAssignSlotModal(sessionId, startUTC, endUTC);
        }
    }

    showCancelSlotConfirmation(sessionId, startUTC, endUTC, studentId, providedStudentName) {
        console.log('showCancelSlotConfirmation called with:', { sessionId, startUTC, endUTC, studentId, providedStudentName });
        const modal = document.getElementById('cancelSlotModal');
        if (!modal) {
            console.log('slot.dataset 3--->');
            this.createCancelSlotModal();
            this.showCancelSlotConfirmation(sessionId, startUTC, endUTC, studentId, providedStudentName);
            return;
        }

        // Store slot data for later use
        this.currentSlotToCancel = { sessionId, startUTC, endUTC, studentId };
        console.log('Stored currentSlotToCancel:', this.currentSlotToCancel);

        // Populate modal with slot details
        const studentNameElement = document.getElementById('cancelStudentName');
        const slotTimeElement = document.getElementById('cancelSlotTime');

        // Use provided student name first, then fallback to lookup
        let studentName = providedStudentName || 'Unknown Student';

        // If no student name provided, try to find it in current students
        if (!providedStudentName && studentId) {
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
            console.log('Cancel slot already in progress, ignoring duplicate call');
            return;
        }

        this.isCancellingSlot = true;

        try {
            if (!this.currentSlotToCancel) {
                this.showMessage('No slot selected for cancellation', 'error');
                return;
            }

            const { sessionId, startUTC, endUTC, studentId } = this.currentSlotToCancel;

            console.log('Cancelling slot with data:', { sessionId, startUTC, endUTC, studentId });

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

            console.log('Sending payload:', payload);

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

            console.log(`Slot ${sessionId} updated to booked status instantly (${isPersonalSession ? 'personal' : 'common'} session)`);
        } else {
            console.warn(`Slot element not found for instant update: ${sessionId}, ${startUTC}, ${endUTC}`);
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
}

let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new TeacherDashboard();
});
