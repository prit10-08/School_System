const User = require("../models/User");
const Mark = require("../models/Mark");
const Quiz = require("../models/Quiz");
const SessionSlot = require("../models/SessionSlot");
const TeacherAvailability = require("../models/TeacherAvailability");
const fs = require("fs");
const csv = require("csv-parser");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const emailTemplates = require("../config/emailTemplates");

exports.getTeacherStats = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    const totalStudents = await User.countDocuments({ role: "student", teacherId });
    const totalQuizzes = await Quiz.countDocuments({ teacherId });
    const totalSessions = await SessionSlot.countDocuments({ teacherId });
    
    res.json({
      success: true,
      data: {
        totalStudents,
        totalQuizzes,
        totalSessions
      }
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student", teacherId: req.user.id }).select("-password");
    res.json({ success: true, data: students });
  } catch (err) {
    console.error("Get students error:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
    const studentId = req.params.userId;
    
    // Try to find by MongoDB _id first, then by userId
    let student = await User.findOne({ 
      _id: studentId, 
      role: "student", 
      teacherId: req.user.id 
    }).select("-password");

    // If not found by _id, try by userId
    if (!student) {
      student = await User.findOne({ 
        userId: studentId, 
        role: "student", 
        teacherId: req.user.id 
      }).select("-password");
    }

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get student by Teacher successful",
      data: student
    });  
  } 
  catch (err) 
  {
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};
exports.createStudent = async (req, res) => {
  const { userId, name, email, password, age, class: className, city, state, country, mobileNumber, role, timezone } = req.body;

  try {
    const exists = await User.findOne({ $or: [{ userId }, { email }] });
    if (exists) {
      return res.status(400).json({ success: false, message: "UserId or Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const studentData = {
      role: "student",
      userId,
      name,
      email,
      password: hashedPassword,
      age,
      class: className,
      city,
      state,
      country,
      mobileNumber,
      timezone: timezone || "Asia/Kolkata",
      teacherId: req.user.id,
      profileImage: req.file ? `/uploads/profiles/${req.file.filename}` : ""
    };
    
    const student = await User.create(studentData);

    // Send emails to both teacher and student (non-blocking)
    // setImmediate(async () => {
    //   try {
    //     // Get teacher details
    //     const teacher = await User.findById(req.user.id).select('name email');
        
    //     // Send email to teacher
    //     await sendEmail({
    //       to: teacher.email,
    //       subject: emailTemplates.student_added.teacher.subject,
    //       html: emailTemplates.student_added.teacher.html(teacher.name, name, email)
    //     });
        
    //     // Send email to student
    //     await sendEmail({
    //       to: email,
    //       subject: emailTemplates.student_added.student.subject,
    //       html: emailTemplates.student_added.student.html(name, teacher.name)
    //     });
    //   } catch (emailErr) {
    //     console.error("Failed to send student addition emails:", emailErr.message);
    //   }
    // });

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

    
exports.updateStudent = async (req, res) => {
  try {
    const { name, email, age, class: className, city, state, country, timezone, mobileNumber } = req.body;
    const studentId = req.params.userId;

    const update = {};
    if (name) update.name = name;
    if (age !== undefined) update.age = age;
    if (className) update.class = className;
    if (city) update.city = city;
    if (state) update.state = state;
    if (country) update.country = country;
    if (timezone) update.timezone = timezone;
    if (mobileNumber) update.mobileNumber = mobileNumber;
    if (email) {
      const emailExists = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: studentId }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already used by another user"
        });
      }
      update.email = email.toLowerCase().trim();
    }

    if (req.file) {
      update.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    // Try to find and update by MongoDB _id first, then by userId
    let student = await User.findOneAndUpdate(
      { _id: studentId, role: "student", teacherId: req.user.id },
      update,
      { new: true }
    ).select("-password");

    // If not found by _id, try by userId
    if (!student) {
      student = await User.findOneAndUpdate(
        { userId: studentId, role: "student", teacherId: req.user.id },
        update,
        { new: true }
      ).select("-password");
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      message: "Student updated successfully",
      data: student
    });
  } catch (err) {
    console.error("Update student error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
        exports.deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.userId;
    
    // Try to find by MongoDB _id first, then by userId
    let student = await User.findOne({ 
      _id: studentId, 
      role: "student", 
      teacherId: req.user.id 
    });

    // If not found by _id, try by userId
    if (!student) {
      student = await User.findOne({ 
        userId: studentId, 
        role: "student", 
        teacherId: req.user.id 
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    await User.findByIdAndDelete(student._id);

    res.json({
      success: true,
      message: "Student deleted successfully"
    });
  } catch (err) {
    console.error("Delete student error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

    
    exports.getStudentMarks = async (req, res) => {
  try {
    const marks = await Mark.find({
      studentUserId: req.params.userId,
      teacherId: req.user.userId
    });

    res.json({
      success: true,
      data: marks
    });
  } catch (err) {
    console.error("Get student marks error:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
    if (req.body.mobileNumber) update.mobileNumber = req.body.mobileNumber;

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
  try {
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
        country,
        mobileNumber,
        timezone
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
          mobileNumber,
          timezone: timezone || "Asia/Kolkata",
          teacherId
        });

        inserted++;
      } catch (err) {
        console.error("Error creating student:", err);
        skipped++;
        results.push({
          row: i + 2,
          userId,
          reasons: ["Database error: " + err.message]
        });
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.error("Error deleting uploaded file:", err);
    }

    return res.json({
      success: true,
      message: "CSV upload completed",
      total: req.csvRows.length,
      inserted,
      skipped,
      skippedDetails: results
    });
  } catch (error) {
    console.error("CSV upload error:", error);
    
    // Clean up uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Error deleting uploaded file:", err);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: "Error processing CSV: " + error.message
    });
  }
};
