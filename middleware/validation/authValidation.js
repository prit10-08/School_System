const { body, validationResult } = require("express-validator");

const signupValidation = 
[
  body("role")
    .isIn(["student", "teacher"])
    .withMessage("Role must be student or teacher"),

  body("userId")
    .notEmpty()
    .withMessage("userId is required"),

  body("name")
    .notEmpty()
    .withMessage("Name is required"),

  body("email")
    .isEmail()
    .withMessage("Valid email is required"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("age")
    .if(body("role").equals("student"))
    .notEmpty()
    .isInt({ min: 1 })
    .withMessage("Age is required for students"),

  body("class")
    .if(body("role").equals("student"))
    .notEmpty()
    .withMessage("Class is required for students")
];

const loginValidation = 
[
  body("email")
    .isEmail()
    .withMessage("Valid email is required"),

  body("password")
    .notEmpty()
    .withMessage("Password cannot be empty")
];

const validate = (req, res, next) => 
{
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array()
    });
  }
  next();
};

module.exports = { signupValidation, loginValidation, validate };