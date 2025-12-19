const express = require("express");
const upload = require("../middleware/uploadImage");
const jwtAuth = require("../middleware/jwtAuth");
const roleAuth = require("../middleware/roleAuth");
const uploadCsv = require("../middleware/uploadCsv");


const { studentCreate, studentUpdate, studentIdParam, markCreate, markUpdate, validate, csvUploadValidation} = require("../middleware/validation/studentValidation");
const { getStudents, getStudentById, createStudent, updateStudent, deleteStudent, getStudentMarks, addMark, updateMark, deleteMark, updateMyProfile, uploadStudentsCSV } = require("../controllers/teacherController");

const router = express.Router();
router.use(jwtAuth, roleAuth("teacher"));

router.put("/me/profile", upload.single("image"), updateMyProfile);
router.get("/students", getStudents);
router.get("/students/:userId", studentIdParam, validate, getStudentById);
router.post("/students", upload.single("image"),studentCreate, validate, createStudent);
router.put("/students/:userId", upload.single("image"), studentUpdate, validate, updateStudent);
router.delete("/students/:userId", studentIdParam, validate, deleteStudent);

router.post("/students/upload-csv", uploadCsv.single("csv"), csvUploadValidation, uploadStudentsCSV);


router.get("/students/:userId/marks", studentIdParam, validate, getStudentMarks);
router.post("/students/:userId/marks", markCreate, validate, addMark);
router.put("/marks/:id", markUpdate, validate, updateMark);
router.delete("/marks/:id", deleteMark);

module.exports = router;
