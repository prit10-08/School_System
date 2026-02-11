const express = require("express");
const upload = require("../middleware/uploadImage");
const teacherAuth = require("../middleware/teacherAuth");
const uploadCsv = require("../middleware/uploadCsv");

const { studentCreate, studentUpdate, studentIdParam, markCreate, markUpdate, validate, csvUploadValidation } = require("../middleware/validation/studentValidation");
const { getStudents, getStudentById, createStudent, updateStudent, deleteStudent, getStudentMarks, addMark, updateMark, deleteMark, updateMyProfile, uploadStudentsCSV, getTeacherStats, getQuizSampleCSV, parseQuizCSV } = require("../controllers/teacherController");
const { quizCsvValidation } = require("../middleware/validation/quizValidation");

const router = express.Router();
router.use(teacherAuth);

router.get("/stats", getTeacherStats);
router.put("/me/profile", upload.single("image"), updateMyProfile);
router.get("/students", getStudents);
router.get("/students/:userId", studentIdParam, validate, getStudentById);
router.post("/students", upload.single("profileImage"), studentCreate, validate, createStudent);
router.put("/students/:userId", studentIdParam, upload.single("profileImage"), studentUpdate, validate, updateStudent);
router.delete("/students/:userId", studentIdParam, validate, deleteStudent);

router.post("/students/upload-csv", uploadCsv.single("csv"), csvUploadValidation, uploadStudentsCSV);

// Quiz CSV Routes
router.get("/quizzes/sample-csv", getQuizSampleCSV);
router.post("/quizzes/parse-csv", uploadCsv.single("csv"), quizCsvValidation, parseQuizCSV);

router.get("/students/:userId/marks", studentIdParam, validate, getStudentMarks);
router.post("/students/:userId/marks", markCreate, validate, addMark);
router.put("/marks/:id", markUpdate, validate, updateMark);
router.delete("/marks/:id", deleteMark);

module.exports = router;
