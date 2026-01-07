const express = require("express");
const upload = require("../middleware/uploadImage");
const { signupValidation, loginValidation, validate } = require("../middleware/validation/authValidation");
const teacherAuth = require("../middleware/teacherAuth");

const { signup, login, logout, getProfile } = require("../controllers/authController");

const router = express.Router();

router.post("/signup", upload.single("profileImage"), signupValidation, validate, signup);
router.post("/login", loginValidation, validate, login);
router.post("/logout", logout);
router.get("/profile", teacherAuth, getProfile);

module.exports = router;
