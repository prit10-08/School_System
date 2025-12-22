const { body,param, validationResult } = require("express-validator");
const fs = require("fs");
const csv = require("csv-parser");

const studentCreate = [
  body('userId').trim().notEmpty().withMessage('userId is required'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('email').isEmail().withMessage('email must be valid'),
  body('password').isLength({ min: 6 }).withMessage('password min length is 6'),
  body('age').notEmpty().isInt({ min: 1 }).withMessage('age is required and must be positive integer'),
  body('class').notEmpty().withMessage('class is required for student')
];

const studentUpdate = [
  body('name').optional().trim().notEmpty().withMessage('name cannot be empty'),
  body('email').optional().isEmail().withMessage('invalid email'),
  body('age').optional().isInt({ min: 1 }).withMessage('age must be an integer'),
  body('class').optional().notEmpty().withMessage('class cannot be empty'),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('country').optional().trim()
];

const studentIdParam = [
  param('userId').trim().notEmpty().withMessage('userId param is required')
];

const markCreate = [
  body('subject').trim().notEmpty().withMessage('subject is required'),
  body('marks').isNumeric().withMessage('marks must be numeric')
];

const markUpdate = [
  body('subject').optional().trim().notEmpty().withMessage('subject cannot be empty'),
  body('marks').optional().isNumeric().withMessage('marks must be numeric')
];

const authLogin = [
  body('userId').trim().notEmpty().withMessage('userId required'),
  body('password').notEmpty().withMessage('password required')
];

const submitQuizValidation = [
  body("answers")
    .isArray({ min: 1 })
    .withMessage("Answers are required"),

  body("answers.*")
    .notEmpty()
    .withMessage("Each question must be answered")
    .isIn(["a", "b", "c", "d"])
    .withMessage("Answer must be one of a, b, c, d")
];
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const csvStudentValidators = [
  body("userId").trim().notEmpty().withMessage("userId is required"),
  body("name").trim().notEmpty().withMessage("name is required").matches(/^[A-Za-z\s]+$/).withMessage("name must contain only letters and spaces"),
  body("email").isEmail().withMessage("email must be valid"),
  body("password").isLength({ min: 6 }).withMessage("password min length is 6"),
  body("age").notEmpty().isInt({ min: 1 }).withMessage("age is required and must be positive integer"),
  body("class").notEmpty().withMessage("class is required for student")
];


const csvUploadValidation = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "CSV file is required" });
  }

  const rows = [];
  const skippedDetails = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => rows.push(row))
    .on("end", async () => {
      for (let i = 0; i < rows.length; i++) {
        const fakeReq = { body: rows[i] };

        for (const rule of csvStudentValidators) {
          await rule.run(fakeReq);
        }

        const errors = validationResult(fakeReq);

        if (!errors.isEmpty()) {
          skippedDetails.push({
            row: i + 2,
            userId: rows[i].userId || null,
            reasons: errors.array().map(e => e.msg)
          });
        }
      }
      req.csvRows = rows;
      req.csvSkippedDetails = skippedDetails;
      next();
    });
};
module.exports = { studentCreate, studentUpdate, studentIdParam, markCreate, markUpdate, authLogin,submitQuizValidation, validate, csvUploadValidation};
