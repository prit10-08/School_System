const express = require("express");
const jwtAuth = require("../middleware/jwtAuth");
const roleAuth = require("../middleware/roleAuth");
const {createSession,getStudentSessions} = require("../controllers/sessionController");
const {createSessionSlots,getMySessionSlots,confirmSessionSlot,getMyConfirmedSessions,getTeacherSessions} = require("../controllers/sessionSlotController");

const {createSessionValidation, validateSession} = require("../middleware/validation/sessionValidation");
const { createSessionSlotsValidation, confirmSessionSlotValidation, validateSessionSlot} = require("../middleware/validation/sessionSlotValidation");

const router = express.Router();

router.post("/",jwtAuth,roleAuth("teacher"), createSessionValidation,validateSession, createSession);

router.get("/student",jwtAuth,roleAuth("student"), getStudentSessions);

router.post("/slots", jwtAuth, roleAuth("teacher"), createSessionSlotsValidation, validateSessionSlot,createSessionSlots);
router.get("/teacher",jwtAuth,roleAuth("teacher"),getTeacherSessions);
router.get("/mysessions", jwtAuth, roleAuth("student"), getMySessionSlots);
router.post("/confirm", jwtAuth, roleAuth("student"), confirmSessionSlotValidation, validateSessionSlot,confirmSessionSlot);
router.get("/my-confirmed-sessions", jwtAuth, roleAuth("student"), getMyConfirmedSessions);
module.exports = router;