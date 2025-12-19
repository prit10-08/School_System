const { body, param, validationResult } = require("express-validator");

const createQuizValidation = [
  
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required"),

  
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required"),

  body("questions")
    .isArray({ min: 1 })
    .withMessage("Questions must be a non-empty array"),

  body("questions.*.question")
    .trim()
    .notEmpty()
    .withMessage("Question text is required"),

  body("questions.*.options")
    .isArray({ min: 4, max: 4 })
    .withMessage("Each question must have exactly 4 options"),

  body("questions.*.options.*")
    .trim()
    .notEmpty()
    .withMessage("Option value cannot be empty"),

  body("questions.*.correctOption")
    .isIn(["a", "b", "c", "d"])
    .withMessage("correctOption must be one of a, b, c, d")
];


const updateQuizValidation = [
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),
  body("subject").optional().trim().notEmpty().withMessage("Subject cannot be empty"),
  body("questions").optional().isArray({ min: 1 }).withMessage("Questions must be a non-empty array"),
  body("questions.*.question").optional().trim().notEmpty().withMessage("Question text is required"),
  body("questions.*.options").optional().isArray({ min: 4, max: 4 }).withMessage("Each question must have exactly 4 options"),
  body("questions.*.options.*").optional().trim().notEmpty().withMessage("Option value cannot be empty"),
  body("questions.*.correctOption").optional().isIn(["a", "b", "c", "d"]).withMessage("correctOption must be one of a, b, c, d")
];


const quizIdParam = [
  param("id").isMongoId().withMessage("Invalid quiz id")
];


const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  next();
};

module.exports = {createQuizValidation,updateQuizValidation,quizIdParam,validate};
