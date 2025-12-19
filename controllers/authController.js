const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.signup = async (req, res) => {
  if (!req.file) {
  return res.status(400).json({
    message: "Profile image is required"
  });
}

  const { role,userId,name,email,password,age,class: className,city,state,country,teacherUserId } = req.body;

  try {
    const exists = await User.findOne({
      $or: [{ userId }, { email }]
    });

    if (exists) {
      return res.status(400).json({
        message: "UserId or Email already in use"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let createdByTeacher = null;

  if (role === "student" && teacherUserId) {
       const teacher = await User.findOne({
       userId: teacherUserId,
       role: "teacher"
    });

    if (!teacher) {
      return res.status(400).json({ message: "Invalid teacher userId" });
    }

      createdByTeacher = teacherUserId;
  }

    const user = await User.create({
      role,
      userId,
      name,
      email,
      password: hashedPassword,
      age: role === "student" ? age : undefined,
      class: role === "student" ? className : undefined,
      city,
      state,
      country,
      createdByTeacher, 
      profileImage: req.file ? `/uploads/profiles/${req.file.filename}` : ""
    });

    return res.status(201).json({
      message: "Signup successful",
      user
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  const userId = String(req.body.userId).trim();
  const password = String(req.body.password);

  try {
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password..!" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        userId: user.userId,
        role: user.role,
        name: user.name,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successfully",
      token
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.logout = (req, res) => {
  return res.json({
    message: "Logout successful. Please delete token on client."
  });
};
