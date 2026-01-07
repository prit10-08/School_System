const jwt = require("jsonwebtoken");
const User = require("../models/User");

const teacherAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Access denied. No token provided." 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user and verify it's a teacher
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token. User not found." 
      });
    }

    if (user.role !== "teacher") {
      return res.status(403).json({ 
        success: false,
        message: "Access denied. Only teachers can access this resource." 
      });
    }

    // Attach user info to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token." 
      });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        success: false,
        message: "Token expired." 
      });
    }
    
    console.error("Auth middleware error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Server error in authentication." 
    });
  }
};

module.exports = teacherAuth;
