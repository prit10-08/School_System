const express = require("express");
const upload = require("../middleware/uploadImage");
const { signupValidation, loginValidation, validate } = require("../middleware/validation/authValidation");

const { signup, login, logout } = require("../controllers/authController");

const router = express.Router();

router.post("/signup",  upload.single("image"),signupValidation, validate, signup);
router.post("/login", loginValidation, validate, login);
router.post("/logout", logout);

module.exports = router;
