const { body, validationResult } = require("express-validator");
const moment = require("moment");

exports.createSessionSlotsValidation = [
  body("title").trim().notEmpty().withMessage("Session title is required"),
  body("date").notEmpty().withMessage("date is required")
    .custom(value => {
      const parsed = moment(value, "DD-MM-YYYY", true);
      if (!parsed.isValid()) {
        throw new Error("date must be in DD-MM-YYYY format");
      }
      if (parsed.isBefore(moment().startOf("day"))) {
        throw new Error("date must be today or future");
      }
      return true;
    }),

  body("sessionDuration").notEmpty().withMessage("sessionDuration is required").isInt({ min: 30, max: 120 }).withMessage("sessionDuration must be between 15 and 240 minutes"),
  body("breakDuration").notEmpty().withMessage("breakDuration is required").isInt({ min: 0, max: 60 }).withMessage("breakDuration must be between 0 and 120 minutes"),
  body("student_id").optional().isMongoId().withMessage("student_id must be a valid Mongo ID")
];

exports.confirmSessionSlotValidation = [
  body("sessionId").notEmpty().withMessage("sessionId is required").isMongoId().withMessage("sessionId must be a valid Mongo ID"),
  body("startTime").notEmpty().withMessage("startTime is required").matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage("startTime must be in HH:mm format")
];

exports.validateSessionSlot = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(e => e.msg)
    });
  }
  next();
};
