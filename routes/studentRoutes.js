const express = require("express");
const upload = require("../middleware/uploadImage");

const jwtAuth = require("../middleware/jwtAuth");
const roleAuth = require("../middleware/roleAuth");

const { studentUpdate,submitQuizValidation, validate} = require("../middleware/validation/studentValidation");
const { getMyProfile, updateMyProfile, getMyMarks} = require("../controllers/studentController");
const { getQuizForStudent, submitQuiz} = require("../controllers/studentQuizController");

const router = express.Router();
router.use(jwtAuth, roleAuth("student"));

router.get("/me", getMyProfile);
router.put("/me", upload.single("image"), studentUpdate, validate, updateMyProfile);
router.get("/me/marks", getMyMarks);

router.get("/quiz/:id", getQuizForStudent);
router.post("/quiz/:id/submit",submitQuizValidation,  validate, submitQuiz);

module.exports = router;
