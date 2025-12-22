const express = require("express");
const jwtAuth = require("../middleware/jwtAuth");
const roleAuth = require("../middleware/roleAuth");

const { createQuiz,getMyQuizzes,getQuizById,updateQuiz,updateQuizQuestion,deleteQuiz} = require("../controllers/quizController");
const { createQuizValidation,updateQuizValidation,quizIdParam,quizQuestionParam,validate} = require("../middleware/validation/quizValidation");
const router = express.Router();

router.use(jwtAuth, roleAuth("teacher"));

router.post("/", createQuizValidation, validate, createQuiz);
router.get("/", getMyQuizzes);
router.get("/:id", quizIdParam, validate, getQuizById);
router.put("/:id", quizIdParam, updateQuizValidation, validate, updateQuiz);

router.put("/:quizId/questions/:questionId",quizQuestionParam,validate,updateQuizQuestion);

router.delete("/:id", quizIdParam, validate, deleteQuiz);

module.exports = router;
