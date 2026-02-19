const User = require("../models/User");
const Mark = require("../models/Mark");
const Quiz = require("../models/Quiz");

exports.getMyProfile = async (req, res) => {
  try {
    const student = await User.findOne({
      userId: req.user.userId,
      role: "student"
    }).select("-password -__v").lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // ✅ Fix timezone key issue
    student.timezone = student.timezone || student[" timezone"] || "Asia/Kolkata";
    delete student[" timezone"];

    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


exports.updateMyProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      age,
      class: className,
      city,
      state,
      country
    } = req.body;

    const userId = req.user.userId;

    const currentStudent = await User.findOne({ userId, role: "student" });
    if (!currentStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    const update = {};

    if (name) update.name = name;
    if (age !== undefined) update.age = age;
    if (className) update.class = className;
    if (city) update.city = city;
    if (state) update.state = state;
    if (country) update.country = country;

    if (email) {
      const newEmail = email.toLowerCase().trim();
      const oldEmail = currentStudent.email.toLowerCase().trim();

      if (newEmail !== oldEmail) {
        const emailExists = await User.findOne({
          email: new RegExp(`^${newEmail}$`, "i"),
          userId: { $ne: userId }
        });

        if (emailExists) {
          return res.status(400).json({
            message: "Email already used by another user"
          });
        }
        update.email = newEmail;
      }
    }

    if (req.file) {
      update.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    const updatedStudent = await User.findOneAndUpdate({ userId, role: "student" }, update, { new: true }).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedStudent
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMyMarks = async (req, res) => {
  try {
    
    // Get marks with quiz information
    const marks = await Mark.find({
      studentUserId: req.user.userId
    }).select("-__v").lean();

    // Enrich marks with quiz total marks
    const enrichedMarks = await Promise.all(marks.map(async (mark) => {
      const quiz = await Quiz.findOne({ subject: mark.subject, teacherId: mark.teacherId })
        .select('totalMarks')
        .lean();
      
      return {
        ...mark,
        total: quiz?.totalMarks || 0
      };
    }));

    res.json({ success: true, data: enrichedMarks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const mongoose = require("mongoose");

exports.getStudentStats = async (req, res) => {
  try {
    const studentUserId = req.user.userId;
    const studentId = req.user.id; // Use _id field from JWT token
    
    // Debug: Log both IDs to see their format
    console.log("User ID format:", studentUserId, typeof studentUserId);
    console.log("Student _id format:", studentId, typeof studentId);
    
    // Get all marks for this student
    const marks = await Mark.find({ studentUserId });
    
    // Calculate quiz statistics
    const totalQuizzes = marks.length;
    let totalScore = 0;
    let totalPossible = 0;
    let bestScore = 0;
    
    marks.forEach(mark => {
      totalScore += mark.marks || 0; // Fixed: use 'marks' instead of 'score'
      // We need to get total marks from the quiz, but it's not stored in Mark model
      // For now, we'll calculate based on available data
      const percentage = 0; // Will be calculated when we have quiz data
      if (percentage > bestScore) {
        bestScore = percentage;
      }
    });
    
    const averageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    
    // Get session statistics - use proper ObjectId for both queries
    const SessionSlot = require("../models/SessionSlot");
    const Session = require("../models/Session");
    let bookedSessions = 0;
    let totalSessions = 0;
    
    try {
      const studentObjectId = new mongoose.Types.ObjectId(studentId);
      bookedSessions = await SessionSlot.countDocuments({
        "bookedSlots.bookedBy": studentObjectId
      });
      
      totalSessions = await Session.countDocuments({
        $or: [
          { studentId: studentObjectId },
          { studentId: null }
        ]
      });
    } catch (err) {
      console.error("ObjectId conversion failed:", err);
      // Fallback to 0 if conversion fails
    }
    
    // Get last activity (most recent mark)
    const lastActivity = marks.length > 0 ? 
      new Date(Math.max(...marks.map(m => new Date(m.createdAt)))).toLocaleDateString() : 
      '--';
    
    res.json({
      success: true,
      data: {
        averageScore: averageScore.toFixed(1),
        totalQuizzes,
        bestScore: bestScore.toFixed(1),
        bookedSessions,
        totalSessions,
        lastActivity
      }
    });
  } catch (err) {
    console.error("Student stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateMyProfileImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image required" });
  }

  const user = await User.findOneAndUpdate(
    { userId: req.user.userId },
    { profileImage: `/uploads/profiles/${req.file.filename}` },
    { new: true }
  ).select("-password");

  res.json({
    message: "Profile image updated",
    profileImage: user.profileImage
  });
};
