const express = require("express");
const jwtAuth = require("../middleware/jwtAuth");
const roleAuth = require("../middleware/roleAuth");

const {setWeeklyAvailability,addHoliday,getTeacherAvailabilityForStudent} = require("../controllers/teacherAvailabilityController");
const {validateWeeklyAvailability,validateHoliday} = require("../middleware/validation/teacherAvailabilityValidation");
const router = express.Router();

router.post("/availability",jwtAuth,roleAuth("teacher"),validateWeeklyAvailability,setWeeklyAvailability);

router.post("/holidays",jwtAuth,roleAuth("teacher"),validateHoliday,addHoliday);

router.get("/:teacherId",jwtAuth,roleAuth("student"),getTeacherAvailabilityForStudent);

module.exports = router;
