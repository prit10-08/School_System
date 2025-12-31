# School System API 

**A Node.js + Express REST API to manage students, teachers, quizzes, sessions and availability for a simple school system.**

---

##  Overview
This project implements a backend API for a school management system that supports:
- User authentication (teacher / student) with JWT
- Student records and marks management
- Quiz creation and student quiz submission
- Teacher weekly availability and holiday management
- Session and session slots creation and booking
- CSV import for bulk student uploads and profile image uploads


##  Tech Stack
- Node.js, Express
- MongoDB (Mongoose)
- JWT for authentication
- Validation with express-validator
- File uploads with Multer
- Helpful libs: dotenv, bcryptjs, nodemailer, dayjs


##  Quick Start
Prerequisites:
- Node.js (v16+ recommended)
- MongoDB (local or Atlas)

1. Clone the repo

   ```bash
   git clone <repo-url>
   cd School_System
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create a `.env` file in project root and set required variables (example):

   ```env
   MONGO_URI=mongodb://localhost:27017/school_system
   JWT_SECRET=your_jwt_secret_here
   PORT=5000
   ```

4. Run the app

   - Development (with nodemon):
     ```bash
     npm run dev
     ```
   - Production:
     ```bash
     npm start
     ```

The server will be available at http://localhost:5000 by default.


##  Environment Variables
- `MONGO_URI` - MongoDB connection URI
- `JWT_SECRET` - Secret used to sign JWT tokens
- `PORT` - (optional) server port


##  API Overview
All routes are prefixed with `/api`.

### Auth
- `POST /api/auth/signup` - Signup (multipart: `image` file optional)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Student (Student role only)
- `GET /api/students/me` - Get own profile
- `PUT /api/students/me` - Update profile (file field `image`)
- `GET /api/students/me/marks` - Get own marks
- `GET /api/students/quiz/:id` - Get quiz for student
- `POST /api/students/quiz/:id/submit` - Submit answers

### Teacher (Teacher role only)
- `GET /api/teachers/students` - List students
- `GET /api/teachers/students/:userId` - Get student by id
- `POST /api/teachers/students` - Create student (file field `image`)
- `PUT /api/teachers/students/:userId` - Update student
- `DELETE /api/teachers/students/:userId` - Delete student
- `POST /api/teachers/students/upload-csv` - Upload CSV to bulk create students (file field `csv`)
- Marks endpoints: `POST /api/teachers/students/:userId/marks`, `PUT /api/teachers/marks/:id`, `DELETE /api/teachers/marks/:id`

### Quiz (Teacher role only)
- `POST /api/quizzes` - Create quiz
- `GET /api/quizzes` - Get my quizzes
- `GET /api/quizzes/:id` - Get quiz by id
- `PUT /api/quizzes/:id` - Update quiz
- `PUT /api/quizzes/:quizId/questions/:questionId` - Update a quiz question
- `DELETE /api/quizzes/:id` - Delete quiz

### Teacher Availability
- `POST /api/teacher-availability/availability` - Set weekly availability (teacher)
- `POST /api/teacher-availability/holidays` - Add holiday (teacher)
- `GET /api/teacher-availability/:teacherId` - Get availability for a teacher (student)

### Sessions
- `POST /api/sessions` - Create session (teacher)
- `POST /api/sessions/slots` - Create session slots (teacher)
- `GET /api/sessions/teacher` - Get teacher's sessions (teacher)
- `GET /api/sessions/mysessions` - Get student session slots (student)
- `POST /api/sessions/confirm` - Confirm a session slot (student)
- `GET /api/sessions/my-confirmed-sessions` - Get my confirmed sessions (student)
- `GET /api/sessions/student` - Get student sessions (student)


##  Uploads
- Static uploads are served from the `/uploads` route.
- Profile images are uploaded via form `image` field.
- CSV sample for student upload available at `uploads/csv/StudentValidationCSV.csv`.


##  Authentication & Validation
- JWT-based auth middleware: `middleware/jwtAuth.js` (expects `Authorization: Bearer <token>`)
- Role-based middleware: `middleware/roleAuth.js` (use `teacher` or `student`)
- All inputs are validated using express-validator; validation middlewares live in `middleware/validation/`.






