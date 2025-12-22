const Quiz = require("../models/Quiz");
const Mark = require("../models/Mark");
const User = require("../models/User");

exports.getQuizForStudent = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).select("-questions.correctOption");

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const student = await User.findOne({
      userId: req.user.userId,
      role: "student"
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (String(quiz.teacherId) !== String(student.teacherId)) {
      return res.status(403).json({
        message: "You are not allowed to access this quiz"
      });
    }
    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body;

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const student = await User.findOne({
      _id: req.user.id,
      role: "student"
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (String(quiz.teacherId) !== String(student.teacherId)) {
      return res.status(403).json({
        message: "You are not allowed to submit this quiz"
      });
    }

    let score = 0;
    quiz.questions.forEach((q, index) => {
      if (answers[index] === q.correctOption) {
        score++;
      }
    });

    const exists = await Mark.findOne({
      studentUserId: req.user.userId,
      subject: quiz.subject,
      student_id: req.user.id
    });

    if (exists) {
      return res.status(400).json({ message: "Quiz already submitted" });
    }

    await Mark.create({
      studentUserId: req.user.userId,
      subject: quiz.subject,
      marks: score,
      student_id: req.user.id,
      teacherId: student.teacherId
    });

    res.json({
      message: "Quiz submitted successfully",
      totalMarks: quiz.totalMarks,
      obtainedMarks: score,
      student_id:req.user.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
