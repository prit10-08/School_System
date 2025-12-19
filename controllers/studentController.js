const User = require("../models/User");
const Mark = require("../models/Mark");

exports.getMyProfile = async (req, res) => {
  try 
  {
    const student = await User.findOne({ userId: req.user.userId, role: "student" }).select("-password -__v").lean();

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let teacher = null;

    if (student.createdByTeacher) {
      teacher = await User.findOne(
        { userId: student.createdByTeacher, role: "teacher" },
        { name: 1, userId: 1, _id: 0 }
      );
    }
    res.json({ student,createdByTeacher: teacher });
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
      message: "Profile updated successfully",
      user: updatedStudent
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

    res.json(marks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
