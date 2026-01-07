const User = require("../models/User");
const Mark = require("../models/Mark");

exports.getMyProfile = async (req, res) => {
  try 
  {
    const student = await User.findOne({ userId: req.user.userId, role: "student" }).select("-password -__v").lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // let teacher = null;

    // if (student.createdByTeacher) {
    //   teacher = await User.findOne(
    //     { userId: student.createdByTeacher, role: "teacher" },
    //     { name: 1, userId: 1, _id: 0 }
    //   );
    // }
    res.json({ success: true, data: student });
  } 
  catch (err) 
  {
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
    const marks = await Mark.find({
      studentUserId: req.user.userId
    }).select("-__v");

    res.json({ success: true, data: marks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getStudentStats = async (req, res) => {
  try {
    const studentUserId = req.user.userId;
    
    // Get all marks for this student
    const marks = await Mark.find({ studentUserId });
    
    // Calculate statistics
    const totalQuizzes = marks.length;
    let totalScore = 0;
    let totalPossible = 0;
    let bestScore = 0;
    
    marks.forEach(mark => {
      totalScore += mark.score || 0;
      totalPossible += mark.total || 0;
      const percentage = mark.total > 0 ? (mark.score / mark.total) * 100 : 0;
      if (percentage > bestScore) {
        bestScore = percentage;
      }
    });
    
    const averageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    
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
