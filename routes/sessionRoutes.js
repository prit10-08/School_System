const express = require("express");
const jwtAuth = require("../middleware/jwtAuth");
const roleAuth = require("../middleware/roleAuth");
const {createSession,getStudentSessions} = require("../controllers/sessionController");

const {createSessionValidation, validateSession} = require("../middleware/validation/sessionValidation");

const router = express.Router();

router.post("/",jwtAuth,roleAuth("teacher"), createSessionValidation,validateSession, createSession);

router.get("/student",jwtAuth,roleAuth("student"), getStudentSessions);

module.exports = router;
