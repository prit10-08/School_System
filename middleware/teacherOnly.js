const teacherOnly = (req, res, next) => {
  // Check if role is provided in request body
  const { role } = req.body;
  
  if (!role) {
    return res.status(400).json({
      message: "Role is required"
    });
  }
  
  if (role !== "teacher") {
    return res.status(403).json({
      message: "Only teacher accounts can be created through public signup"
    });
  }
  
  next();
};

module.exports = teacherOnly;
