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

const quizQuestionParam = [
  param("quizId")
    .isMongoId()
    .withMessage("Invalid quiz id"),

  param("questionId")
    .isMongoId()
    .withMessage("Invalid question id")
];

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  next();
};

const fs = require("fs");
const csv = require("csv-parser");

const quizCsvValidators = [
  body("Question").trim().notEmpty().withMessage("Question is required"),
  body("Option A").trim().notEmpty().withMessage("Option A is required"),
  body("Option B").trim().notEmpty().withMessage("Option B is required"),
  body("Option C").trim().notEmpty().withMessage("Option C is required"),
  body("Option D").trim().notEmpty().withMessage("Option D is required"),
  body("Correct Answer")
    .trim()
    .notEmpty()
    .withMessage("Correct Answer is required")
    .custom((value, { req }) => {
      // Allow A, B, C, D (case insensitive) OR exact match with option text
      const validOptions = ["a", "b", "c", "d"];
      const valLower = value.toLowerCase();

      if (validOptions.includes(valLower)) return true;

      const row = req.body;
      const optionTexts = [
        row["Option A"],
        row["Option B"],
        row["Option C"],
        row["Option D"]
      ].map(opt => opt ? opt.trim().toLowerCase() : "");

      if (optionTexts.includes(valLower)) return true;

      throw new Error("Correct Answer must be 'A', 'B', 'C', 'D' or match one of the options");
    })
];

const quizCsvValidation = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "CSV file is required" });
  }

  const rows = [];
  const skippedDetails = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      // Normalize keys (trim spaces)
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        cleanRow[key.trim()] = row[key];
      });
      rows.push(cleanRow);
    })
    .on("error", (error) => {
      console.error("CSV parsing error:", error);
      return res.status(400).json({ message: "Error parsing CSV file: " + error.message });
    })
    .on("end", async () => {
      try {
        if (rows.length === 0) {
          return res.status(400).json({ message: "CSV file is empty" });
        }

        // Validate headers roughly by checking first row
        const requiredHeaders = ["Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer"];
        const firstRowKeys = Object.keys(rows[0]);
        const missingHeaders = requiredHeaders.filter(h => !firstRowKeys.includes(h));

        if (missingHeaders.length > 0) {
          return res.status(400).json({
            message: "Invalid CSV format. Missing columns: " + missingHeaders.join(", ")
          });
        }

        for (let i = 0; i < rows.length; i++) {
          const fakeReq = { body: rows[i] };

          for (const rule of quizCsvValidators) {
            await rule.run(fakeReq);
          }

          const errors = validationResult(fakeReq);

          if (!errors.isEmpty()) {
            skippedDetails.push({
              row: i + 2, // +2 because 1-based index + header row
              question: rows[i].Question ? rows[i].Question.substring(0, 30) + "..." : "Unknown",
              reasons: errors.array().map(e => e.msg)
            });
          }
        }

        req.csvRows = rows;
        req.csvSkippedDetails = skippedDetails;
        next();
      } catch (error) {
        console.error("CSV validation error:", error);
        return res.status(400).json({ message: "Error validating CSV: " + error.message });
      }
    });
};

module.exports = {
  createQuizValidation,
  updateQuizValidation,
  quizIdParam,
  quizQuestionParam,
  validate,
  quizCsvValidation
};
