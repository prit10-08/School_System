const User = require("../models/User");
const Mark = require("../models/Mark");
const fs = require("fs");
const csv = require("csv-parser");
const bcrypt = require("bcryptjs");

exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student", teacherId: req.user.id });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMyStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student", teacherId: req.user.id }).select("-password");
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await User.findOne({  userId: req.params.userId, role: "student", teacherId: req.user.id }).select("-password");

    if (!student) return res.status(404).json({ message: "Student not found" });

    return res.status(201).json({
      message: "Get student by Teacher successful",
      student
    });  
  } 
  catch (err) 
  {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
exports.createStudent = async (req, res) => {
  const { userId, name, email, password, age, class: className, city, state, country } = req.body;

  try {
    const exists = await User.findOne({ $or: [{ userId }, { email }] });
    if (exists) {
      return res.status(400).json({ message: "UserId or Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const student = await User.create({
      role: "student",
      userId,
      name,
      email,
      password: hashed,
      age,
      city,
      state,
      country,
      class: className,
      teacherId: req.user.id,
      profileImage: req.file ? `/uploads/profiles/${req.file.filename}` : ""

    });
    return res.status(201).json({
      message: "Student create successful",
      student
    });  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { name, email, age, class: className, city, state, country } = req.body;
    const userId = req.params.userId;

    const update = {};
    if (name) update.name = name;
    if (age !== undefined) update.age = age;
    if (className) update.class = className;
    if (city) update.city = city;
    if (state) update.state = state;
    if (country) update.country = country;

    if (email) {
      const emailExists = await User.findOne({
        email: email.toLowerCase().trim(),
        userId: { $ne: userId }
      });

      if (emailExists) {
        return res.status(400).json({
          message: "Email already used by another user"
        });
      }
      update.email = email.toLowerCase().trim();
    }

    if (req.file) {
      update.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    const student = await User.findOneAndUpdate({ userId, role: "student" },update,{ new: true }).select("-password");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.json({
      message: "Student profile updated successfully",
      student
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await User.findOne({ userId: req.params.userId,role: "student",teacherId: req.user.id });
    const teacherId = req.user.id;

    if (!student) {
      return res.status(404).json({
        message: "Student not found or you are not allowed to delete this student"
      });
    }
    await student.deleteOne();

    await Mark.deleteMany({ studentUserId: req.params.userId});

    return res.json({ message: "Student deleted successfully", teacherId });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStudentMarks = async (req, res) => {
  try {
    const marks = await Mark.find({
      studentUserId: req.params.userId
    });
    return res.json(marks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.addMark = async (req, res) => {
  try {
    const { subject, marks } = req.body;
    const userId = req.params.userId;

    const student = await User.findOne({ userId, role: "student" });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const exists = await Mark.findOne({ studentUserId: userId, subject });
    if (exists) {
      return res.status(400).json({
        message: "Marks for this subject are already added"
      });
    }

    const newMark = await Mark.create({
      studentUserId: userId,
      subject,
      marks
    });
    return res.status(201).json(newMark);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.updateMark = async (req, res) => {
  try {
    const mark = await Mark.findById(req.params.id);
    if (!mark) return res.status(404).json({ message: "Mark not found" });

    const update = {};
    if (req.body.subject) update.subject = req.body.subject;
    if (req.body.marks !== undefined) update.marks = req.body.marks;

    const updated = await Mark.findByIdAndUpdate(mark._id, update, {
      new: true
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.deleteMark = async (req, res) => {
  try {
    const mark = await Mark.findById(req.params.id);
    if (!mark) return res.status(404).json({ message: "Mark not found" });

    await mark.deleteOne();

    return res.json({ message: "Mark deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const update = {};

    if (req.body.name) update.name = req.body.name;
    if (req.body.city) update.city = req.body.city;
    if (req.body.state) update.state = req.body.state;
    if (req.body.country) update.country = req.body.country;

    if (req.body.email) {
      const emailExists = await User.findOne({
        email: req.body.email,
        userId: { $ne: userId }
      });

      if (emailExists) {
        return res.status(400).json({
          message: "Email already in use"
        });
      }
      update.email = req.body.email;
    }

    if (req.file) {
      update.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    const teacher = await User.findOneAndUpdate(
      { userId, role: "teacher" },
      update,
      { new: true }
    ).select("-password");

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.json({
      message: "Profile updated successfully",
      teacher
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.uploadStudentsCSV = async (req, res) => {
  const teacherId = req.user.id;

  let inserted = 0;
  let skipped = req.csvSkippedDetails.length;
  const results = [...req.csvSkippedDetails];

  for (let i = 0; i < req.csvRows.length; i++) {
    const row = req.csvRows[i];

    const alreadyInvalid = req.csvSkippedDetails.find(r => r.row === i + 2);
    if (alreadyInvalid) continue;

    const {
      userId,
      name,
      email,
      password,
      age,
      class: className,
      city,
      state,
      country
    } = row;

    const exists = await User.findOne({
      $or: [{ userId }, { email }]
    });

    if (exists) {
      skipped++;
      results.push({
        row: i + 2,
        userId,
        reasons: ["UserId or Email already exists"]
      });
      continue;
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      await User.create({
        role: "student",
        userId,
        name,
        email,
        password: hashedPassword,
        age,
        class: className,
        city: city || "",
        state: state || "",
        country: country || "",
        teacherId
      });

      inserted++;
    } catch (err) {
      skipped++;
      results.push({
        row: i + 2,
        userId,
        reasons: ["Database error: " + err.message]
      });
    }
  }

  fs.unlinkSync(req.file.path);

  return res.json({
    message: "CSV upload completed",
    total: req.csvRows.length,
    inserted,
    skipped,
    skippedDetails: results
  });
};
