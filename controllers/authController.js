const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const emailTemplates = require("../config/emailTemplates");

exports.signup = async (req, res) => {
  const { userId, name, email, password, city, state, country, role } = req.body;

  // Only allow teacher signup
  if (role !== "teacher") {
    return res.status(403).json({
      success: false,
      message: "Only teacher accounts can be created through public signup"
    });
  }

  try {
    const exists = await User.findOne({
      $or: [{ userId }, { email }]
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "UserId or Email already in use"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      role: "teacher",
      userId,
      name,
      email,
      password: hashedPassword,
      city,
      state,
      country,
      profileImage: req.file ? `/uploads/profiles/${req.file.filename}` : ""
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    setImmediate(async () => {
      try {
        await sendEmail({
          to: email,
          subject: emailTemplates.teacher_signup.subject,
          html: emailTemplates.teacher_signup.html(name)
        });
      } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr.message);
      }
    });

    return res.status(201).json({
      success: true,
      message: "Teacher signup successful",
      user: userResponse
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid credentials" 
      });
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
      { expiresIn: "50d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

exports.logout = (req, res) => {
  return res.json({
    success: true,
    message: "Logout successful"
  });
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};
