const express = require("express");
const upload = require("../middleware/uploadImage");

const jwtAuth = require("../middleware/jwtAuth");
const roleAuth = require("../middleware/roleAuth");

const { studentUpdate, validate } = require("../middleware/validation/studentValidation");
const { getMyProfile, updateMyProfile, getMyMarks} = require("../controllers/studentController");

const router = express.Router();

router.use(jwtAuth, roleAuth("student"));

router.get("/me", getMyProfile);
router.put("/me", upload.single("image"), studentUpdate, validate, updateMyProfile);
router.get("/me/marks", getMyMarks);

module.exports = router;
