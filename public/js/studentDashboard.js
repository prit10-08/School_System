class StudentDashboard {
    constructor() {
        this.apiBaseUrl = '/api/students';
        this.quizApiBaseUrl = '/api/quizzes';
        this.sessionApiBaseUrl = '/api/sessions';
        this.teacherAvailabilityApiBaseUrl = '/api/teacher-availability';
        this.token = localStorage.getItem('token');
        this.student = null;
        this.currentQuiz = null;
        this.quizTimer = null;
        this.init();
    }

    init() {
        if (!this.token) {
            window.location.href = '/index.html';
            return;
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.waitForComponentsAndInit();
            });
        } else {
            this.waitForComponentsAndInit();
        }
    }

    waitForComponentsAndInit() {
        if (document.querySelector('.nav-item') && document.querySelector('.profile-dropdown')) {
            this.setupEventListeners();
            this.loadStudentProfile();
            this.loadDashboardData();
        } else {
            document.addEventListener('componentsLoaded', () => {
                this.setupEventListeners();
                this.loadStudentProfile();
                this.loadDashboardData();
            });
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                if (page) {
                    this.switchPage(page);
                }
            });
        });

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

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Quiz form
        document.getElementById('quizForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitQuiz();
        });

        // Modal close buttons
        document.getElementById('closeQuizModal')?.addEventListener('click', () => {
            this.closeQuizModal();
        });
    }

    async apiRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await fetch(url, {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Request failed' }));

            // Create detailed error message
            let errorMessage = error.message || 'Request failed';

            // If validation errors exist, include them
            if (error.errors && Array.isArray(error.errors)) {
                const validationErrors = error.errors.map(err =>
                    `${err.path || err.param || "field"}: ${err.msg || err.message}`
                ).join(', ');

                errorMessage = `Validation failed: ${validationErrors}`;
            }

            throw new Error(errorMessage);
        }

        return response.json();
    }

    async loadStudentProfile() {
        try {
            const response = await this.apiRequest(`${this.apiBaseUrl}/me`);
            this.student = response.data;
            this.updateHeaderProfile();
            this.updateProfilePage();
        } catch (error) {
            this.showMessage('Error loading profile: ' + error.message, 'error');
        }
    }

    async loadDashboardData() {
        try {
            // ✅ Load required data in parallel
            const [sessionsStats, quizzesResponse, confirmedResponse] = await Promise.all([
                this.loadSessionStats(),
                this.apiRequest(`${this.quizApiBaseUrl}/available`),
                this.apiRequest(`${this.sessionApiBaseUrl}/my-confirmed-sessions`)
            ]);

            const quizzes = quizzesResponse.data || [];
            const bookedSessions = confirmedResponse.sessions || [];

            // ✅ Stats (always correct)
            this.updateSessionStats(sessionsStats);
            this.updateTotalQuizzes(quizzes.length);
            this.updateBookedSessionsCount(bookedSessions.length);

            // ✅ Update quizzes
            this.updateAvailableQuizzes(quizzes);
            this.updateQuizList(quizzes);

            // ✅ Recent Sessions = Available sessions ma thi last 2
            this.updateRecentSessions(sessionsStats.totalSessions);

        } catch (error) {
            this.showMessage('Error loading dashboard data: ' + error.message, 'error');
        }
    }

    updateBookedSessionsCount(count) {
        const el = document.getElementById("bookedSessions");
        if (el) el.textContent = count || 0;
    }

    updateTotalQuizzes(total) {
        const totalQuizzesElement = document.getElementById('totalQuizzes');
        if (totalQuizzesElement) {
            totalQuizzesElement.textContent = total || 0;
        }
    }

    updateRecentSessions(sessions) {
        const container = document.getElementById('recentSessions');
        if (!container) return;

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `<p class="empty">No sessions available yet</p>`;
            return;
        }

        // ✅ recent 2 sessions
        const recentSessions = sessions.slice(0, 2);

        container.innerHTML = recentSessions.map(session => `
        <div class="recent-session-item">
            <div class="session-title">${session.title || "Session"}</div>
            <div class="session-meta">
                <small>
                    ${session.date || ""} • ${session.teacherName || "Teacher"} • ${session.duration || 60} mins
                </small>
            </div>
            <div class="session-meta">
                <small>
                    Slots: ${session.slots ? session.slots.length : 0}
                </small>
            </div>
        </div>
     `).join('');
    }

    updateHeaderProfile() {
        if (!this.student) return;

        const headerName = document.getElementById('headerStudentName');
        const headerImage = document.getElementById('headerProfileImage');

        if (headerName) headerName.textContent = this.student.name;
        if (headerImage) {
            headerImage.src = this.student.profileImage;
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('bookedSessions').textContent = stats.bookedSessions || 0;
        document.getElementById('totalSessions').textContent = stats.totalSessions || 0;
        document.getElementById('totalQuizzes').textContent = stats.totalQuizzes || 0;
    }

    updateRecentMarks(marks) {
        const container = document.getElementById('recentMarks');

        if (!marks || marks.length === 0) {
            container.innerHTML = '<p class="empty">No marks available yet</p>';
            return;
        }

        const recentMarks = marks.slice(-5).reverse();
        container.innerHTML = recentMarks.map(mark => `
            <div class="recent-marks-item">
                <div class="marks-subject">${mark.subject}</div>
                <div class="marks-score">
                    <span class="score-badge">${mark.score}</span>
                    <small>${new Date(mark.createdAt).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    }

    async loadAvailableQuizzes() {
        try {
            const response = await this.apiRequest(`${this.quizApiBaseUrl}/available`);
            const quizzes = response.data || response;
            this.updateAvailableQuizzes(quizzes);
            this.updateQuizList(quizzes);
        } catch (error) {
            document.getElementById('availableQuizzes').innerHTML = '<p class="empty">No quizzes available</p>';
            document.getElementById('quizList').innerHTML = '<p class="empty">No quizzes available</p>';
        }
    }

    updateAvailableQuizzes(quizzes) {
        const container = document.getElementById('availableQuizzes');

        if (!quizzes || quizzes.length === 0) {
            container.innerHTML = '<p class="empty">No quizzes available</p>';
            return;
        }

        container.innerHTML = quizzes.slice(0, 3).map(quiz => `
        <div class="quiz-item teacher-like-quiz-item">
            <div class="quiz-info-small">
                <div class="quiz-title-small">${quiz.title}</div>
                <div class="quiz-meta-small">${quiz.subject || "Quiz"} • ${quiz.duration || 30} mins</div>
            </div>
            <button class="btn-start-quiz-small" onclick="dashboard.startQuiz('${quiz._id}')">
                Start
            </button>
        </div>
    `).join('');
    }


    updateQuizList(quizzes) {
        const container = document.getElementById('quizList');

        if (!quizzes || quizzes.length === 0) {
            container.innerHTML = '<p class="empty">No quizzes available</p>';
            return;
        }

        container.innerHTML = quizzes.map(quiz => `
        <div class="student-quiz-card">

            <div class="student-quiz-top">
                <div>
                    <h3 class="student-quiz-title">${quiz.title}</h3>
                </div>

                <span class="student-quiz-badge">
                    ${quiz.subject || "Quiz"}
                </span>
            </div>

            <div class="student-quiz-meta">
                <span><i class="fas fa-question-circle"></i> ${quiz.questionCount || (quiz.questions?.length || 0)} Questions</span>
                <span><i class="fas fa-clock"></i> ${quiz.duration || 30} mins</span>
            </div>

            <div class="student-quiz-actions">
                <button class="btn-start-quiz" onclick="dashboard.startQuiz('${quiz._id}')">
                    Start Quiz
                </button>
            </div>

        </div>
    `).join('');
    }


    async startQuiz(quizId) {
        try {
            this.showLoading();

            const response = await this.apiRequest(`${this.apiBaseUrl}/quiz/${quizId}`);
            this.currentQuiz = response.data || response;

            this.showQuizModal(this.currentQuiz);
        } catch (error) {
            this.showMessage('Error loading quiz: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    showQuizModal(quiz) {
        const modal = document.getElementById('quizModal');
        const title = document.getElementById('quizTitle');
        const subject = document.getElementById('quizSubject');
        const duration = document.getElementById('quizDuration');
        const container = document.getElementById('questionsContainer');

        title.textContent = quiz.title;
        subject.textContent = quiz.subject;
        duration.textContent = quiz.duration || 30;

        // Render questions
        container.innerHTML = quiz.questions.map((question, index) => `
            <div class="question-item">
                <div class="question-text">Question ${index + 1}: ${question.question}</div>
                <div class="options-grid">
                    ${question.options.map((option, optionIndex) => `
                        <label class="option-label">
                            <input type="radio" name="question${index}" value="${optionIndex}">
                            <span>${option}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');

        modal.classList.add('active');
        this.startQuizTimer((quiz.duration || 30) * 60);
    }

    startQuizTimer(durationSeconds) {
        let timeRemaining = durationSeconds;
        const timerElement = document.getElementById('timeRemaining');

        this.quizTimer = setInterval(() => {
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (timeRemaining <= 0) {
                clearInterval(this.quizTimer);
                this.submitQuiz();
            }
            timeRemaining--;
        }, 1000);
    }

    async submitQuiz() {
        if (!this.currentQuiz) return;

        try {
            const answers = [];
            const questions = this.currentQuiz.questions || [];

            for (let i = 0; i < questions.length; i++) {
                const selectedOption = document.querySelector(`input[name="question${i}"]:checked`);

                if (!selectedOption) {
                    this.showMessage(`Please attempt Question ${i + 1}`, 'error');
                    return;
                }

                // ✅ Send only option index (same like your old code + Postman style)
                const optionIndex = Number(selectedOption.value);
                const optionMap = ["a", "b", "c", "d"];
                answers.push(optionMap[optionIndex]);
            }

            console.log("✅ FINAL ANSWERS ARRAY:", answers);
            console.log("✅ FINAL REQUEST BODY:", JSON.stringify({ answers }));

            this.showLoading();

            const response = await this.apiRequest(
                `${this.apiBaseUrl}/quiz/${this.currentQuiz._id}/submit`,
                {
                    method: 'POST',
                    body: JSON.stringify({ answers })
                }
            );

            this.showMessage(
                `Quiz submitted! Score: ${response.obtainedMarks}/${response.totalMarks}`,
                'success'
            );

            this.closeQuizModal();
            this.loadDashboardData();

        } catch (error) {
            console.error("❌ Quiz Submit Error:", error);
            this.showMessage('Error submitting quiz: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    closeQuizModal() {
        const modal = document.getElementById('quizModal');
        modal.classList.remove('active');

        if (this.quizTimer) {
            clearInterval(this.quizTimer);
            this.quizTimer = null;
        }

        this.currentQuiz = null;
    }

    updateProfilePage() {
        if (!this.student) return;

        document.getElementById('profileName').textContent = this.student.name;
        document.getElementById('profileEmail').textContent = this.student.email;
        document.getElementById('profileAvatar').src = this.student.profileImage || '/images/default-avatar.png';
        document.getElementById('profileUserId').textContent = this.student.userId;
        document.getElementById('profileAge').textContent = this.student.age || '-';
        document.getElementById('profileClass').textContent = this.student.class || '-';
        document.getElementById('profileMobile').textContent = this.student.mobileNumber || '-';
        document.getElementById('profileTimezone').textContent = this.student.timezone || '-';
        document.getElementById('profileCity').textContent = this.student.city || '-';
        document.getElementById('profileState').textContent = this.student.state || '-';
        document.getElementById('profileCountry').textContent = this.student.country || '-';
    }

    async loadMarks() {
        try {
            const response = await this.apiRequest(`${this.apiBaseUrl}/me/marks`);
            this.updateMarksTable(response.data);
        } catch (error) {
            this.showMessage('Error loading marks: ' + error.message, 'error');
        }
    }

    updateMarksTable(marks) {
        const tbody = document.getElementById('marksTableBody');

        if (!marks || marks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty">No records found</td></tr>';
            return;
        }

        tbody.innerHTML = marks.map(mark => {
            const percentage = mark.total > 0 ? ((mark.score / mark.total) * 100).toFixed(1) : 0;
            return `
                <tr>
                    <td>${mark.subject}</td>
                    <td>${mark.score}</td>
                    <td>${mark.total}</td>
                    <td>${percentage}%</td>
                    <td>${new Date(mark.createdAt).toLocaleDateString()}</td>
                </tr>
            `;
        }).join('');
    }

    async loadSessionStats() {
        try {
            const [confirmedResponse, availableResponse] = await Promise.all([
                this.apiRequest(`${this.sessionApiBaseUrl}/my-confirmed-sessions`),
                this.apiRequest(`${this.sessionApiBaseUrl}/mysessions`)
            ]);

            const bookedSessions = confirmedResponse.sessions || [];
            const totalSessions = availableResponse.sessions || [];

            return {
                bookedSessions,
                totalSessions
            };
        } catch (error) {
            console.error('Error loading session stats:', error);
            return { bookedSessions: [], totalSessions: [] };
        }
    }

    updateSessionStats(sessionStats) {
        // Update dashboard with session statistics
        if (sessionStats) {
            const bookedCount = sessionStats.bookedSessions?.length || 0;
            const totalCount = sessionStats.totalSessions?.length || 0;

            // Update dashboard stats if elements exist
            const bookedElement = document.getElementById('bookedSessions');
            const totalElement = document.getElementById('totalSessions');

            if (bookedElement) bookedElement.textContent = bookedCount;
            if (totalElement) totalElement.textContent = totalCount;
        }
    }

    async loadSessions() {
        try {
            this.showLoading();

            const [availableResponse, confirmedResponse] = await Promise.all([
                this.apiRequest(`${this.sessionApiBaseUrl}/mysessions`),
                this.apiRequest(`${this.sessionApiBaseUrl}/my-confirmed-sessions`)
            ]);

            const meta = availableResponse.meta || {};

            this.updateSessionsList(
                availableResponse.sessions || [],
                confirmedResponse.sessions || [],
                meta
            );

        } catch (error) {
            console.error("Error loading sessions:", error);
            this.showMessage("Error loading sessions: " + error.message, "error");
            this.showEmptySessionsState();
        } finally {
            this.hideLoading();
        }
    }

    showEmptySessionsState() {
        const container = document.getElementById('sessionsList');
        container.innerHTML = `
            <div class="empty-sessions">
                <div class="empty-icon">
                    <i class="fas fa-calendar-times"></i>
                </div>
                <h3>No Sessions Available</h3>
                <p>There are no sessions available at the moment. Please check back later.</p>
                <div class="empty-actions">
                    <button class="btn btn-outline" onclick="dashboard.loadSessions()">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                </div>
            </div>
        `;
    }

    updateSessionsList(availableSessions, confirmedSessions, meta = {}) {
        const container = document.getElementById("sessionsList");

        if (!availableSessions || availableSessions.length === 0) {
            this.showEmptySessionsState();
            return;
        }

        const teacherName = meta.teacherName || "N/A";
        const studentTimezone = meta.studentTimezone || "Asia/Kolkata";

        container.innerHTML = `
        <div class="session-list-container">
            <div class="session-list-header">
                <h3>Session List</h3>
                <div class="session-list-info">
                    <span>${availableSessions.length} Total Sessions</span>
                </div>
            </div>
            <div class="sessions-list">
                <div class="sessions-grid">
                    ${availableSessions.map(session => this.createSessionCard(session)).join("")}
                </div>
            </div>
        </div>`;

        // Add event listeners for slot interactions
        container.querySelectorAll(".slot-item.available").forEach(chip => {
            chip.addEventListener("click", async () => {
                const sessionId = chip.dataset.sessionId;
                const startTimeUTC = chip.dataset.startUtc;
                const endTimeUTC = chip.dataset.endUtc;
                const startTime = chip.dataset.startTime;
                const endTime = chip.dataset.endTime;
                const title = chip.dataset.title;
                const date = chip.dataset.date;

                this.showBookingConfirmation(sessionId, startTimeUTC, endTimeUTC, startTime, endTime, title, date);
            });
        });
    }

    showBookingConfirmation(sessionId, startTimeUTC, endTimeUTC, startTime, endTime, title, date) {
        // Remove any existing modal
        const existingModal = document.getElementById('bookingModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal element
        const modal = document.createElement('div');
        modal.id = 'bookingModal';
        modal.className = 'booking-modal';
        modal.innerHTML = `
            <div class="booking-modal-overlay">
                <div class="booking-modal-content">
                    <div class="booking-modal-header">
                        <h3>Book Session Slot</h3>
                        <button class="booking-modal-close" onclick="this.closest('.booking-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="booking-modal-body">
                        <div class="booking-details">
                            <div class="detail-item">
                                <span class="detail-label">Session:</span>
                                <span class="detail-value">${title}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Date:</span>
                                <span class="detail-value">${date}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Time:</span>
                                <span class="detail-value">${startTime} - ${endTime}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="booking-modal-actions">
                        <button class="booking-btn booking-btn-cancel" onclick="this.closest('.booking-modal').remove()">
                            Cancel
                        </button>
                        <button class="booking-btn booking-btn-confirm" id="confirmBookingBtn">
                            Confirm Booking
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Add event listener for confirm button
        document.getElementById('confirmBookingBtn').addEventListener('click', async () => {
            const chip = document.querySelector(`.slot-item[data-session-id="${sessionId}"][data-start-utc="${startTimeUTC}"]`);
            
            if (chip) {
                chip.classList.add('booked');
            }

            try {
                await this.bookSession(sessionId, startTimeUTC, endTimeUTC);
                modal.remove();
                document.body.style.overflow = '';
                await this.loadSessions();
            } catch (err) {
                if (chip) {
                    chip.classList.remove('booked');
                }
                this.showMessage(err.message, 'error');
            }
        });

        // Close modal when clicking overlay
        modal.querySelector('.booking-modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.booking-modal-overlay')) {
                modal.remove();
                document.body.style.overflow = '';
            }
        });
    }

    addSwipeSupport(element) {
        let startX = 0;
        let scrollLeft = 0;
        let isDown = false;

        element.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX - element.offsetLeft;
            scrollLeft = element.scrollLeft;
        }, { passive: true });

        element.addEventListener('touchmove', (e) => {
            if (!startX) return;
            const x = e.touches[0].pageX - element.offsetLeft;
            const walk = (x - startX) * 2;
            element.scrollLeft = scrollLeft - walk;
        }, { passive: true });

        element.addEventListener('touchend', () => {
            startX = 0;
        }, { passive: true });
    }

    scrollSessions(direction) {
        const grid = document.getElementById('sessionsGrid');
        if (!grid) return;

        const scrollAmount = 400; 
        const currentScroll = grid.scrollLeft;

        if (direction === 'left') {
            grid.scrollTo({
                left: Math.max(0, currentScroll - scrollAmount),
                behavior: 'smooth'
            });
        } else {
            grid.scrollTo({
                left: currentScroll + scrollAmount,
                behavior: 'smooth'
            });
        }

        // Update button states after scroll
        setTimeout(() => this.updateCarouselButtons(), 300);
    }

    updateCarouselButtons() {
        const grid = document.getElementById('sessionsGrid');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (!grid || !prevBtn || !nextBtn) return;

        // Update previous button
        prevBtn.disabled = grid.scrollLeft <= 0;

        // Update next button
        const maxScroll = grid.scrollWidth - grid.clientWidth;
        nextBtn.disabled = grid.scrollLeft >= maxScroll;
    }

    createSessionCard(session) {
        const sessionType = session.sessionType || "common";
        const isPersonal = sessionType === "personal";
        const slots = session.slots || [];
        
        // Calculate available and booked slots
        const availableSlots = slots.filter(slot => !slot.isBooked);
        const bookedSlots = slots.filter(slot => slot.isBooked);
        
        // Create slot items HTML
        const slotItemsHTML = slots.map(slot => {
            const isBooked = slot.isBooked;
            const slotClass = isBooked ? "booked" : "available";
            const studentName = slot.studentName || "";
            
            return `
                <div class="slot-item ${slotClass}"
                     data-session-id="${session.sessionId}"
                     data-start-utc="${slot.startTimeUTC}"
                     data-end-utc="${slot.endTimeUTC}"
                     data-start-time="${slot.startTime}"
                     data-end-time="${slot.endTime}"
                     data-title="${session.title || 'SESSION'}"
                     data-date="${session.date || ''}">
                    ${slot.startTime} - ${slot.endTime}
                    ${studentName ? `<div class="student-name">${studentName}</div>` : ''}
                </div>
            `;
        }).join("");
        
        return `
            <div class="session-card">
                <div class="session-header">
                    <h4 class="session-title">${session.title || 'SESSION'}</h4>
                    <span class="session-type ${isPersonal ? 'personal' : 'common'}">
                        ${isPersonal ? 'PERSONAL' : 'ALL STUDENTS'}
                    </span>
                </div>
                
                <div class="session-content">
                    <div class="session-info">
                        <i class="fas fa-calendar"></i>
                        <span>${session.date || 'N/A'}</span>
                    </div>
                    <div class="session-info">
                        <i class="fas fa-clock"></i>
                        <span>${session.duration || 60} minutes</span>
                    </div>
                    ${isPersonal && session.teacherName ? `
                        <div class="session-info">
                            <i class="fas fa-user"></i>
                            <span>${session.teacherName}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="session-slots">
                    <div class="session-slots-header">Slots</div>
                    
                    <div class="slot-statistics">
                        <div class="slot-stats-badges">
                            <div class="slot-badge available">
                                <div class="count">${availableSlots.length}</div>
                                <div class="label">Available</div>
                            </div>
                            <div class="slot-badge booked">
                                <div class="count">${bookedSlots.length}</div>
                                <div class="label">Booked</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="my-slots-section">
                        <div class="my-slots-header">MY SLOTS</div>
                        <div class="slots-grid">
                            ${slotItemsHTML || '<div class="empty">No slots available</div>'}
                        </div>
                    </div>
                </div>
                
            </div>
        `;
    }

    updateMySessionsHeader(meta) {
        const metaDiv = document.getElementById("mySessionsMetaInfo");
        if (!metaDiv) return;

        const teacherName = meta.teacherName || "N/A";
        const studentTimezone = meta.studentTimezone || "Asia/Kolkata";

        metaDiv.innerHTML = `
    <span style="margin-right:14px; display:inline-flex; align-items:center; gap:6px;">
        <i class="fas fa-user-tie"></i><b>${teacherName}</b>
    </span>
    <span style="display:inline-flex; align-items:center; gap:6px;">
        <i class="fas fa-globe"></i><b>${studentTimezone}</b>
    </span>`;
    }

    async bookSession(sessionId, startTimeUTC, endTimeUTC) {
        try {
            this.showLoading();

            const response = await this.apiRequest(`${this.sessionApiBaseUrl}/confirm`, {
                method: "POST",
                body: JSON.stringify({
                    sessionId,
                    startTimeUTC,
                    endTimeUTC
                })
            });

            this.showMessage("Slot booked successfully!", "success");
            return response;

        } catch (error) {
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    markSlotAsBooked(sessionId, startTime) {
        const chip = document.querySelector(
            `.slot-chip[data-session-id="${sessionId}"][data-start-time="${startTime}"]`
        );

        if (chip) {
            chip.classList.add("selected", "disabled");
        }
    }

    openBookingPopup(sessionId, startTime, endTime, title, date, startTimeUTC, endTimeUTC) {
        const oldModal = document.querySelector(".booking-confirmation-modal");
        if (oldModal) oldModal.remove();

        const modal = document.createElement("div");
        modal.className = "booking-confirmation-modal";

        modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-calendar-check"></i> Confirm Booking</h3>
                <button class="modal-close" id="closeBookingModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="modal-body">
                <p>Are you sure you want to book this session?</p>

                <div class="booking-details">
                    <div class="detail-row">
                        <span class="label">Session:</span>
                        <span class="value">${title}</span>
                    </div>

                    <div class="detail-row">
                        <span class="label">Date:</span>
                        <span class="value">${date}</span>
                    </div>

                    <div class="detail-row">
                        <span class="label">Time:</span>
                        <span class="value">${startTime} - ${endTime}</span>
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn btn-outline" id="cancelBookingBtn">Cancel</button>
                <button class="btn btn-primary" id="confirmBookingBtn">Confirm Booking</button>
            </div>
        </div>
    `;

        document.body.appendChild(modal);
        document.body.style.overflow = "hidden";

        const closeModal = () => {
            modal.remove();
            document.body.style.overflow = "auto";
        };

        document.getElementById("closeBookingModal").addEventListener("click", closeModal);
        document.getElementById("cancelBookingBtn").addEventListener("click", closeModal);

        document.getElementById("confirmBookingBtn").addEventListener("click", async () => {
            closeModal();

            await this.bookSession(sessionId, startTimeUTC, endTimeUTC);
        });

        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModal();
        });
    }

    switchPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(`${page}-page`)?.classList.add('active');

        // Load page-specific data
        switch (page) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'sessions':
                this.loadSessions();
                break;
            case 'quiz':
                this.loadAvailableQuizzes();
                break;
            case 'marks':
                this.loadMarks();
                break;
            case 'profile':
                this.updateProfilePage();
                break;
        }
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('messages');
        if (!container) {
            console.error('Message container not found');
            return;
        }
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}" ></i >
            <span>${message}</span>
        `;

        container.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('active');
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('active');
        }
    }

    logout() {
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    }
}

// Initialize dashboard when page loads
const dashboard = new StudentDashboard();
