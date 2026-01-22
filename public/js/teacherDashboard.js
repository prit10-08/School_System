class TeacherDashboard {
    constructor() {
        this.apiBaseUrl = '/api';
        this.token = localStorage.getItem('token');
        this.teacher = null;
        this.currentStudents = [];
        this.init();
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
            this.addSetHoliday();
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
            this.showModal('addStudentModal');
        });

        document.getElementById('closeStudentModal')?.addEventListener('click', () => {
            this.hideModal('addStudentModal');
        });

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

        // Add Question Button
        document.getElementById('addQuestionBtn')?.addEventListener('click', () => {
            this.addQuizQuestion();
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

        // Close modals on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    setupFormHandlers() {
        // Add Student Form
        document.getElementById('addStudentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addStudent(e.target);
        });

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

        // Setup time picker functionality for readonly inputs
        // this.setupTimePickers();

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
            this.loadStats()
        ]);
    }

    async loadStudents() {
        try {
            const response = await this.apiCall('/teachers/students', 'GET');
            if (response.success) {
                this.currentStudents = response.data;
                this.displayStudents(response.data);
                this.updateRecentStudents(response.data.slice(0, 5));
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
        if (!grid) return;

        if (students.length === 0) {
            grid.innerHTML = '<p class="empty">No students found</p>';
            return;
        }

        grid.innerHTML = students.map(student => `
            <div class="student-card">
                <img src="${student.profileImage || '/images/default-avatar.png'}" alt="${student.name}">
                <div class="student-details">
                    <h4>${student.name}</h4>
                    <p><i class="fas fa-id-card"></i> ${student.userId}</p>
                    <p><i class="fas fa-envelope"></i> ${student.email}</p>
                    <p><i class="fas fa-phone"></i> ${student.mobileNumber || 'Not provided'}</p>
                    <p><i class="fas fa-graduation-cap"></i> ${student.class ? `<span class="student-class">${student.class}</span>` : ''}</p>
                    <p><i class="fas fa-globe"></i> ${student.timezone || 'Asia/Kolkata'}</p>
                </div>
                <div class="student-actions">
                    <button class="btn-edit" onclick="dashboard.editStudent('${student._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="dashboard.deleteStudent('${student._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
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
            <div class="quiz-item">
                <h4>
                    ${quiz.title}
                    <span class="quiz-subject">${quiz.subject}</span>
                </h4>
                <div class="quiz-meta">
                    <p><i class="fas fa-question-circle"></i> ${quiz.questions ? quiz.questions.length : 0} Questions</p>
                    <p><i class="fas fa-star"></i> ${quiz.totalMarks || quiz.questions ? quiz.questions.length : 0} Marks</p>
                    <p><i class="fas fa-calendar"></i> Created ${new Date(quiz.createdAt).toLocaleDateString()}</p>
                    <p><i class="fas fa-clock"></i> Updated ${new Date(quiz.updatedAt).toLocaleDateString()}</p>
                    ${quiz.class ? `<p><i class="fas fa-graduation-cap"></i> Class: ${quiz.class}</p>` : ''}
                </div>
                <div class="quiz-actions">
                    <button class="btn-edit" onclick="dashboard.editQuiz('${quiz._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="dashboard.deleteQuiz('${quiz._id}')">
                        <i class="fas fa-trash"></i> Delete
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
            saturday: 'Saturday'
        };

        // Convert backend array to map
        const availabilityMap = {};
        if (Array.isArray(weeklyAvailability)) {
            weeklyAvailability.forEach(slot => {
                availabilityMap[slot.day] = slot;
            });
        }

        // Always build Monday-Saturday
        const finalAvailability = Object.keys(dayNames).map(day => ({
            day,
            startTime: availabilityMap[day]?.startTime || "00:00",
            endTime: availabilityMap[day]?.endTime || "00:00"
        }));

        this.currentAvailabilityData = finalAvailability;

        // ✅ Render with EDIT ICON per day
        container.innerHTML = finalAvailability.map(slot => `
        <div class="schedule-item" data-day="${slot.day}">
            <div class="schedule-day">
                ${dayNames[slot.day]}
            </div>

            <div class="schedule-time"
                 data-start="${slot.startTime}"
                 data-end="${slot.endTime}"
                 style="display:flex; align-items:center; justify-content:space-between; gap:12px;">

                <span class="time-text">
                    ${this.formatTimeForDisplay(slot.startTime)} - ${this.formatTimeForDisplay(slot.endTime)}
                </span>

                <button class="btn btn-secondary btn-sm"
                        onclick="dashboard.enableDayEdit('${slot.day}')"
                        title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
    `).join('');
    }

    formatTimeForDisplay(time24) {
        if (!time24 || time24 === "00:00") return "00:00";

        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours, 10);

        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

        return `${displayHour}:${minutes} ${period}`;
    }

    enableInlineEdit() {
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
    }


    saveInlineEditedAvailability() {
        const updatedAvailability = [];

        document.querySelectorAll(".schedule-item").forEach(item => {
            const day = item.dataset.day;
            const timeDiv = item.querySelector(".schedule-time");

            // ✅ If day is in edit mode (inputs exist)
            const startInput = item.querySelector('[data-type="start-time"]');
            const endInput = item.querySelector('[data-type="end-time"]');

            let startTime = "";
            let endTime = "";

            if (startInput && endInput) {
                // ✅ take from input values
                startTime = startInput.value || "00:00";
                endTime = endInput.value || "00:00";
            } else {
                // ✅ take from old saved dataset values
                startTime = timeDiv?.dataset.start || "00:00";
                endTime = timeDiv?.dataset.end || "00:00";
            }

            // ✅ if cleared day
            if (startTime === "00:00" && endTime === "00:00") {
                updatedAvailability.push({ day, startTime, endTime });
                return;
            }

            // ✅ validate start < end
            if (startTime < endTime) {
                updatedAvailability.push({ day, startTime, endTime });
            } else {
                this.showMessage(`${day}: Start time must be before end time`, "error");
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
            this.showMessage('Error saving availability: ' + (error.message || 'Unknown error'), 'error');
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

        const item = document.querySelector(`.schedule-item[data-day="${day}"]`);
        if (!item) return;

        const timeDiv = item.querySelector(".schedule-time");
        if (!timeDiv) return;

        let startTime = timeDiv.dataset.start || "00:00";
        let endTime = timeDiv.dataset.end || "00:00";

        // If not set, show blank inputs (avoid 12:00 AM view)
        if (startTime === "00:00") startTime = "";
        if (endTime === "00:00") endTime = "";

        timeDiv.innerHTML = `
        <div class="time-input-group" style="display:flex; align-items:center; gap:10px;">
            <input type="time" class="time-picker"
                   data-day="${day}" data-type="start-time"
                   value="${startTime}" step="60">

            <span>-</span>

            <input type="time" class="time-picker"
                   data-day="${day}" data-type="end-time"
                   value="${endTime}" step="60">

            <button class="btn btn-danger btn-sm"
                    onclick="dashboard.clearDayTime('${day}')"
                    title="Clear time">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    }

    clearDayTime(day) {
        const startInput = document.querySelector(`input[data-type="start-time"][data-day="${day}"]`);
        const endInput = document.querySelector(`input[data-type="end-time"][data-day="${day}"]`);

        if (startInput) startInput.value = "";
        if (endInput) endInput.value = "";
    }



    clearAllDaySlots() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        days.forEach(day => {
            this.clearDayTime(day);
        });
    }

    updateStats(stats) {
        document.getElementById('totalStudents').textContent = stats.totalStudents || 0;
        document.getElementById('totalQuizzes').textContent = stats.totalQuizzes || 0;
        document.getElementById('totalSessions').textContent = stats.totalSessions || 0;
    }

    updateRecentStudents(students) {
        const container = document.getElementById('recentStudents');
        if (!container) return;
        if (students.length === 0) {
            container.innerHTML = '<p class="empty">No students added yet</p>';
            return;
        }
        container.innerHTML = students.map(student => `
        <div class="student-item">
            <img src="${student.profileImage || '/images/default-avatar.png'}" alt="${student.name}">
            <div class="student-info">
                <h4>${student.name}</h4>
                <p>${student.email}</p>
                <p><i class="fas fa-globe"></i> ${student.timezone || 'Asia/Kolkata'}</p>
            </div>
            ${student.class ? `<span class="student-class">${student.class}</span>` : ''}
        </div>
    `).join('');
    }

    updateRecentQuizzes(quizzes) {
        const container = document.getElementById('recentQuizzes');
        if (!container) return;

        if (quizzes.length === 0) {
            container.innerHTML = '<p class="empty">No quizzes created yet</p>';
            return;
        }

        container.innerHTML = quizzes.map(quiz => `
        <div class="quiz-item-small">
            <h4>${quiz.title}</h4>
            <p>${quiz.subject} • ${quiz.questions ? quiz.questions.length : 0} questions • ${quiz.totalMarks || quiz.questions ? quiz.questions.length : 0} marks</p>
            <small>Created: ${new Date(quiz.createdAt).toLocaleDateString()}</small>
        </div>
    `).join('');
    }

    updateRecentSessions(sessions) {
        const container = document.getElementById('recentSessions');
        if (!container) return;

        if (sessions.length === 0) {
            container.innerHTML = '<p class="empty">No sessions created yet</p>';
            return;
        }

        container.innerHTML = sessions.map(session => `
        <div class="session-item-small">
            <h4>${session.title}</h4>
            <p>${session.date} • ${session.day} • ${session.sessionDuration} min</p>
            <small>${session.totalSlots || 0} slots available</small>
        </div>
    `).join('');
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
            this.showMessage('Error adding student', 'error');
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
            this.showMessage('Error creating quiz', 'error');
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
        document.getElementById(modalId).classList.add('show');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
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
            // Don't set Content-Type for FormData (browser sets it with boundary)
            delete config.headers['Content-Type'];
            config.body = data;
        } else if (data) {
            config.body = JSON.stringify(data);
        }

        console.log(`API Call: ${method} ${this.apiBaseUrl}${endpoint}`, config);

        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, config);

            // Handle network errors or server not responding
            if (!response.ok) {
                const errorText = await response.text();
                console.error('HTTP Error:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API call failed:', error);

            // Provide more specific error messages
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to server. Please check if the server is running.');
            } else if (error.name === 'AbortError') {
                throw new Error('Request timeout: Server took too long to respond.');
            } else {
                throw error;
            }
        }
    }

    logout() {
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    }

    async deleteStudent(studentId) {
        if (!confirm('Are you sure you want to delete this student?')) return;

        try {
            this.showLoading();
            const response = await this.apiCall(`/teachers/students/${studentId}`, 'DELETE');

            if (response.success) {
                this.showMessage('Student deleted successfully', 'success');
                await this.loadStudents();
                await this.loadStats();
            } else {
                this.showMessage(response.message || 'Failed to delete student', 'error');
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            this.showMessage('Error deleting student', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async editStudent(studentId) {
        try {
            const response = await this.apiCall(`/teachers/students/${studentId}`, 'GET');

            if (response.success) {
                const student = response.data;
                this.showEditStudentModal(student);
            } else {
                this.showMessage(`Failed to load student: ${response.message || 'Unknown error'}`, 'error');
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
        document.getElementById('editStudentId').value = student._id || student.userId;
        document.getElementById('editStudentUserId').value = student.userId;
        document.getElementById('editStudentName').value = student.name;
        document.getElementById('editStudentEmail').value = student.email;
        document.getElementById('editStudentAge').value = student.age || '';
        document.getElementById('editStudentMobile').value = student.mobileNumber || '';
        document.getElementById('editStudentClass').value = student.class || '';
        document.getElementById('editStudentCity').value = student.city || '';
        document.getElementById('editStudentState').value = student.state || '';
        document.getElementById('editStudentCountry').value = student.country || '';

        // Set current profile image if exists
        const currentImageElement = document.getElementById('currentProfileImage');
        if (currentImageElement && student.profileImage) {
            currentImageElement.src = student.profileImage;
            currentImageElement.alt = `${student.name}'s Profile`;
        }

        // Add real-time validation and auto-save functionality
        const form = document.getElementById('editStudentForm');
        const inputs = form.querySelectorAll('input, select');

        // Add input event listeners for real-time validation
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.validateEditFormInput(input);
            });
        });

        // Add change detection for auto-save
        let originalData = {
            name: student.name,
            email: student.email,
            age: student.age,
            mobileNumber: student.mobileNumber,
            class: student.class,
            city: student.city,
            state: student.state,
            country: student.country
        };

        // Auto-save every 30 seconds
        const autoSaveInterval = setInterval(() => {
            const currentData = {
                name: document.getElementById('editStudentName').value,
                email: document.getElementById('editStudentEmail').value,
                age: document.getElementById('editStudentAge').value,
                mobileNumber: document.getElementById('editStudentMobile').value,
                class: document.getElementById('editStudentClass').value,
                city: document.getElementById('editStudentCity').value,
                state: document.getElementById('editStudentState').value,
                country: document.getElementById('editStudentCountry').value
            };

            // Check if data changed
            const hasChanges = Object.keys(currentData).some(key => currentData[key] !== originalData[key]);

            if (hasChanges) {
                this.autoSaveStudentChanges(student._id || student.userId, currentData);
            }
        }, 30000); // 30 seconds

        // Save on form submission
        const submitHandler = (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.updateStudent(formData);
        };

        // Remove existing listeners and add new one
        form.removeEventListener('submit', this.editStudentFormSubmitHandler);
        form.addEventListener('submit', submitHandler);
        this.editStudentFormSubmitHandler = submitHandler;

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

    async autoSaveStudentChanges(studentId, data) {
        try {
            const response = await this.apiCall(`/teachers/students/${studentId}`, 'PUT', data);

            if (response.success) {
                this.showMessage('Student updated automatically', 'success');
            } else {
                console.error('Auto-save failed:', response);
                this.showMessage(`Auto-save failed: ${response.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Auto-save error:', error);
            this.showMessage('Auto-save error', 'error');
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
                    <form id="editStudentForm" enctype="multipart/form-data">
                        <input type="hidden" id="editStudentId" name="id">
                        
                        <!-- Left Column -->
                        <div class="form-column">
                            <div class="form-group">
                                <label for="editStudentUserId">User ID</label>
                                <input type="text" id="editStudentUserId" name="userId" placeholder="User ID" required>
                            </div>
                            <div class="form-group">
                                <label for="editStudentName">Full Name</label>
                                <input type="text" id="editStudentName" name="name" placeholder="Full Name" required>
                            </div>
                            <div class="form-group">
                                <label for="editStudentEmail">Email</label>
                                <input type="email" id="editStudentEmail" name="email" placeholder="Email" required>
                            </div>
                            <div class="form-group">
                                <label for="editStudentPassword">Password (leave blank to keep current)</label>
                                <input type="password" id="editStudentPassword" name="password" placeholder="Password (leave blank to keep current)">
                            </div>
                        </div>
                        
                        <!-- Right Column -->
                        <div class="form-column">
                            <div class="form-group">
                                <label for="editStudentAge">Age</label>
                                <input type="number" id="editStudentAge" name="age" placeholder="Age" min="1" max="120">
                            </div>
                            <div class="form-group">
                                <label for="editStudentMobile">Mobile Number</label>
                                <input type="tel" id="editStudentMobile" name="mobileNumber" placeholder="Mobile Number" maxlength="10">
                            </div>
                            <div class="form-group">
                                <label for="editStudentClass">Class</label>
                                <input type="text" id="editStudentClass" name="class" placeholder="Class">
                            </div>
                            <div class="form-group">
                                <label for="editStudentCity">City</label>
                                <input type="text" id="editStudentCity" name="city" placeholder="City" required>
                            </div>
                            <div class="form-group">
                                <label for="editStudentState">State</label>
                                <input type="text" id="editStudentState" name="state" placeholder="State" required>
                            </div>
                            <div class="form-group">
                                <label for="editStudentCountry">Country</label>
                                <input type="text" id="editStudentCountry" name="country" placeholder="Country" required>
                            </div>
                        </div>
                        
                        <!-- Profile Image Section -->
                        <div class="form-group full-width">
                            <label>Current Profile Image</label>
                            <div class="current-image">
                                <img id="currentProfileImage" src="" alt="Current Profile" style="max-width: 100px; max-height: 100px; border-radius: 8px;">
                            </div>
                        </div>
                        <div class="form-group full-width">
                            <label>Update Profile Image (Optional)</label>
                            <input type="file" name="profileImage" accept="image/*">
                        </div>
                        
                        <button type="submit" class="btn-primary">Update Student</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listeners for the new modal
        document.getElementById('closeEditStudentModal').addEventListener('click', () => {
            this.hideModal('editStudentModal');
        });

        document.getElementById('editStudentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateStudent(e.target);
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
        const studentId = formData.get('id');

        try {
            this.showLoading();
            const response = await this.apiCall(`/teachers/students/${studentId}`, 'PUT', formData);

            if (response.success) {
                this.showMessage('Student updated successfully', 'success');
                this.hideModal('editStudentModal');
                await this.loadStudents();
            } else {
                this.showMessage(`Update failed: ${response.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error updating student:', error);
            this.showMessage('Error updating student', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteQuiz(quizId) {
        if (!confirm('Are you sure you want to delete this quiz?')) return;

        try {
            this.showLoading();
            const response = await this.apiCall(`/quizzes/${quizId}`, 'DELETE');

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

        // Validate mobile number if provided
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

                // Reload teacher profile to update display
                await this.loadTeacherProfile();

                // Clear form
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

    // Holiday Management Methods
    async showAddHolidayModal() {
        const modal = document.getElementById('addHolidayModal');
        if (modal) {
            modal.classList.add('show');
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('startDate').min = today;
            document.getElementById('endDate').min = today;
            document.getElementById('singleDate').min = today;
            document.getElementById('startDate').value = today;
            document.getElementById('endDate').value = today;
            document.getElementById('singleDate').value = today;

            // Show Set Holidays card by default
            this.showSetHolidaysCard();
        }
    }

    hideHolidayModal() {
        const modal = document.getElementById('addHolidayModal');
        if (modal) {
            modal.classList.remove('show');
            // Reset forms
            document.getElementById('setHolidaysForm').reset();
            document.getElementById('singleDayHolidayForm').reset();
            this.showSetHolidaysCard();
        }
    }

    showSetHolidaysCard() {
        document.getElementById('setHolidaysCard').style.display = 'block';
        document.getElementById('singleDayHolidayCard').style.display = 'none';
        // Reset checkbox state
        document.getElementById('singleDayHolidayCheckbox').checked = false;
    }

    handleSingleDayHolidayToggle() {
        const checkbox = document.getElementById('singleDayHolidayCheckbox');

        if (checkbox.checked) {
            // Redirect to single-day holiday card
            this.showSingleDayHolidayCard();
        } else {
            // Show set holidays card
            this.showSetHolidaysCard();
        }
    }

    showSingleDayHolidayCard() {
        document.getElementById('setHolidaysCard').style.display = 'none';
        document.getElementById('singleDayHolidayCard').style.display = 'block';
    }

    async addSetHoliday() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const reason = document.getElementById('holidayReason').value;
        const note = document.getElementById('holidayNote').value;

        if (!startDate || !endDate || !reason) {
            this.showMessage('Please fill in all required fields', 'error');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            this.showMessage('End date must be after start date', 'error');
            return;
        }

        try {
            this.showLoading();
            const response = await this.apiCall('/teacher-availability/holidays', 'POST', {
                startDate,
                endDate,
                reason,
                note: note || ''
            });

            if (response.success) {
                this.showMessage('Holiday added successfully! 🎉', 'success');
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
        const date = document.getElementById('singleDate').value;
        const reason = document.getElementById('singleDayReason').value;
        const note = document.getElementById('singleDayNote').value;

        if (!date || !reason) {
            this.showMessage('Please fill in all required fields', 'error');
            return;
        }

        try {
            this.showLoading();
            const response = await this.apiCall('/teacher-availability/holidays', 'POST', {
                startDate: date,
                endDate: date, // Same date for single day
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
                this.displayHolidays(response.holidays);
            } else {
                this.allHolidays = [];
                this.displayHolidays([]);
            }
        } catch (error) {
            console.error('Error loading holidays:', error);
            this.allHolidays = [];
            this.displayHolidays([]);
        }
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
                <div class="holiday-card" data-holiday-id="${holiday._id}" data-type="${typeClass}">
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

        let filteredHolidays;
        if (filterType === 'all') {
            filteredHolidays = this.allHolidays;
        } else {
            filteredHolidays = this.allHolidays.filter(holiday => {
                const isPublic = holiday.reason === 'public' || holiday.reason === 'Public Holiday';
                const holidayType = isPublic ? 'public' : 'personal';
                return holidayType === filterType;
            });
        }

        this.displayHolidays(filteredHolidays);
    }

    async deleteHoliday(holidayId) {
        if (!confirm('Are you sure you want to delete this holiday?')) return;

        try {
            this.showLoading();
            const response = await this.apiCall(`/teacher-availability/holidays/${holidayId}`, 'DELETE');

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
    }

    // Sessions functionality
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

                // Update recent sessions for dashboard (only first 5)
                this.updateRecentSessions(response.sessions.slice(0, 5));
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
            const isPersonal = session.allowedStudent !== null;
            const typeClass = isPersonal ? 'personal' : 'common';
            const typeText = isPersonal ? 'PERSONAL' : 'COMMON';

            // ✅ Backend gives:
            // session.slots = available slots only
            // session.bookedSlots = booked slots only
            const availableSlots = session.slots || [];
            const bookedSlots = session.bookedSlots || [];

            const availableCount = availableSlots.length;
            const bookedCount = bookedSlots.length;

            // ✅ FIX: Total slots always correct
            const totalSlots = availableCount + bookedCount;

            return `
      <div class="session-card" data-session-id="${session.sessionId}">
        <div class="session-header">
          <h3 class="session-title">${session.title}</h3>
          <span class="session-type ${typeClass}">${typeText}</span>
        </div>

        <div class="session-content">
          <div class="session-info">
            <i class="fas fa-calendar"></i>
            <span>${session.date} (${session.day})</span>
          </div>

          <div class="session-info">
            <i class="fas fa-clock"></i>
            <span>${session.sessionDuration} min session • ${session.breakDuration} min break</span>
          </div>

          ${isPersonal && session.allowedStudent ? `
            <div class="session-info">
              <i class="fas fa-user"></i>
              <span>Student: ${session.allowedStudent.name}</span>
            </div>
          ` : ''}

          <!-- ✅ FIX: Total slots show -->
          <div class="session-info">
            <i class="fas fa-users"></i>
            <span>Total Slots: ${totalSlots}</span>
          </div>

          <!-- ✅ My Slots (Merged Available + Booked) -->
          <div class="session-slots">
            <div class="session-slots-header">My Slots (${totalSlots})</div>

            <div class="slots-grid">
              ${totalSlots > 0
                    ? this.mergeAndSortSlots(availableSlots, bookedSlots).map(slot => `
                      <div class="slot-item ${slot.isBooked ? 'booked' : 'available'}">
                        ${slot.startTime} - ${slot.endTime}
                        ${slot.isBooked ? `[${slot.studentName}]` : ''}
                      </div>
                    `).join('')
                    : `<div class="slot-item empty">No slots available</div>`
                }
            </div>
          </div>
        </div>
      </div>
    `;
        }).join('');

        // Pagination update
        if (pagination) {
            this.updateSessionsPagination(pagination);
            paginationContainer.style.display = 'flex';
        }
    }

    updateSessionsPagination(pagination) {
        const paginationInfo = document.getElementById('paginationInfo');
        const currentPage = document.getElementById('currentPage');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        paginationInfo.textContent = `Showing ${pagination.totalSessions} session${pagination.totalSessions !== 1 ? 's' : ''}`;
        currentPage.textContent = pagination.currentPage;

        return `
            <div class="session-card" data-session-id="${session.sessionId}">
                <div class="session-header">
                    <h3 class="session-title">${session.title}</h3>
                    <span class="session-type ${typeClass}">${typeText}</span>
                </div>
                <div class="session-content">
                    
                    <div class="session-info">
                        <i class="fas fa-calendar"></i>
                        <span>${session.date} (${session.day})</span>
                    </div>
                    <div class="session-info">
                        <i class="fas fa-clock"></i>
                        <span>${session.sessionDuration} min session • ${session.breakDuration} min break</span>
                    </div>
                    ${isPersonal && session.allowedStudent ? `
                        <div class="session-info">
                            <i class="fas fa-user"></i>
                            <span>Student: ${session.allowedStudent.name}</span>
                        </div>
                    ` : ''}
                    <div class="session-info">
                        <i class="fas fa-users"></i>
                        <span>${slotsCount} Available slot${slotsCount !== 1 ? 's' : ''}</span>
                    </div>
                    ${session.slots && session.slots.length > 0 ? `
                        <div class="session-slots">
                            <div class="session-slots-header">Available Slots (${slotsCount})</div>
                            <div class="slots-grid">
                                ${session.slots.map((slot, index) => `
                                    <div class="slot-item ${slot.isBooked ? 'booked' : 'available'}">
                                        ${slot.startTime} - ${slot.endTime}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${session.bookedSlots && session.bookedSlots.length > 0 ? `
                        <div class="session-slots">
                            <div class="session-slots-header">Booked Slots (${session.bookedSlots.length})</div>
                            <div class="slots-grid">
                                ${session.bookedSlots.map(slot => `
                                    <div class="slot-item booked">
                                        ${slot.startTime} – ${slot.endTime} [${slot.studentName}]
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
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

    mergeAndSortSlots(availableSlots, bookedSlots) {
        // Create array with all slots, marking booked slots
        const allSlots = [
            ...availableSlots.map(slot => ({
                ...slot,
                isBooked: false
            })),
            ...bookedSlots.map(slot => ({
                ...slot,
                isBooked: true
            }))
        ];

        // Sort by start time to maintain chronological order
        return allSlots.sort((a, b) => {
            const timeA = a.startTime.split(':').map(Number);
            const timeB = b.startTime.split(':').map(Number);
            const minutesA = timeA[0] * 60 + timeA[1];
            const minutesB = timeB[0] * 60 + timeB[1];
            return minutesA - minutesB;
        });
    }

    showSessionModal() {
        const modal = document.getElementById('sessionModal');
        const sessionDateInput = document.getElementById('sessionDate');

        // Set minimum date to today to prevent past date selection
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const minDate = `${yyyy}-${mm}-${dd}`;

        sessionDateInput.setAttribute('min', minDate);

        // Use show class for proper centering
        modal.classList.add('show');
        this.loadStudentsForSession();
    }

    hideSessionModal() {
        const modal = document.getElementById('sessionModal');
        modal.classList.remove('show');
    }

    async loadStudentsForSession() {
        // Check if particular student is selected before loading
        const selectionType = document.getElementById('studentSelectionType').value;
        if (selectionType !== 'particular') {
            return; // Don't load students if not particular student
        }

        // Use more specific selector to get the session modal dropdown
        const studentSelect = document.querySelector('#particularStudentRow #studentSelect');
        if (!studentSelect) {
            console.error('Session student select element not found');
            return;
        }

        // Show loading state
        studentSelect.innerHTML = '<option value="">Loading students...</option>';

        try {
            // Test with same method that works for main students page
            const response = await this.apiCall('/teachers/students', 'GET');

            if (response && response.success && response.data) {

                if (response.data.length > 0) {
                    // Make row visible first with inline style override
                    const particularStudentRow = document.getElementById('particularStudentRow');
                    if (particularStudentRow) {
                        particularStudentRow.style.display = 'block';
                        particularStudentRow.style.visibility = 'visible';
                        particularStudentRow.style.opacity = '1';
                    }

                    // Force student select visibility
                    studentSelect.style.display = 'block';
                    studentSelect.style.visibility = 'visible';
                    studentSelect.style.opacity = '1';

                    // Clear existing options
                    studentSelect.innerHTML = '';

                    // Add default option
                    studentSelect.add(new Option('Select a Student', ''));

                    // Add student options
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

            // Add a small delay to ensure DOM is updated
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

        const formData = new FormData(event.target);
        const sessionDate = formData.get('sessionDate');
        const selectionType = formData.get('studentSelectionType');

        // Convert date from YYYY-MM-DD to DD-MM-YYYY format
        const dateObj = new Date(sessionDate);
        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()}`;

        const sessionData = {
            title: formData.get('sessionTitle'),
            date: formattedDate,
            sessionDuration: parseInt(formData.get('sessionDuration')),
            breakDuration: parseInt(formData.get('breakDuration')),
            student_id: selectionType === 'particular' ? formData.get('studentSelect') : undefined
        };

        try {
            this.showLoading();
            const response = await this.apiCall('/sessions/slots', 'POST', sessionData);

            if (response.success) {
                this.showMessage('Session created successfully', 'success');
                this.hideSessionModal();

                // Add the new session directly to the current sessions list
                if (response.data) {
                    // Get current sessions (use allSessions which is the correct property)
                    const currentSessions = this.allSessions || [];

                    // Map response data to match display function expectations
                    const newSession = {
                        ...response.data,
                        sessionId: response.data.sessionId, // Map sessionId to sessionId
                        allowedStudent: response.data.allowedStudent || null
                    };

                    // Add new session to the beginning of the array
                    currentSessions.unshift(newSession);

                    // Update the sessions data
                    this.allSessions = currentSessions;

                    // Immediately display the updated sessions
                    this.displaySessions(this.allSessions, { currentPage: 1, totalPages: 1, totalSessions: this.allSessions.length });

                } else {
                    // Fallback: reload all sessions
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.loadSessions();
                }
            } else {
                this.showMessage(response.message || 'Failed to create session', 'error');
            }
        } catch (error) {
            console.error('Error creating session:', error);
            this.showMessage('Error creating session: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            this.hideLoading();
        }
    }

    filterSessions(type = 'all') {
        const filters = {};
        if (type !== 'all') filters.type = type;

        this.loadSessions(1, filters);
    }

    async deleteSession(sessionId) {
        if (!confirm('Are you sure you want to delete this session? This will remove all associated slots.')) return;

        try {
            this.showLoading();
            const response = await this.apiCall(`/sessions/${sessionId}`, 'DELETE');

            if (response.success) {
                this.showMessage('Session deleted successfully', 'success');
                this.loadSessions();
            } else {
                this.showMessage(response.message || 'Failed to delete session', 'error');
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            this.showMessage('Error deleting session: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            this.hideLoading();
        }
    }
}


// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new TeacherDashboard();
});
