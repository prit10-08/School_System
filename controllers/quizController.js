const Quiz = require("../models/Quiz");

exports.createQuiz = async (req, res) => {
  try {
    const { title, subject, questions } = req.body;

    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: "Questions are required" });
    }

    const quiz = await Quiz.create({
      title,
      subject,
      questions,
      totalMarks: questions.length,
      teacherId: req.user.id
    });

    res.status(201).json({
      message: "Quiz created successfully",
      quiz
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error",error: err.message });
    console.error(err);
  }
};


exports.getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({
      teacherId: req.user.id
    }).select("-__v");

    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      teacherId: req.user.id
      
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const { title, subject, questions } = req.body;

    if (title) quiz.title = title;
    if (subject) quiz.subject = subject;
    if (questions) {
      quiz.questions = questions;
      quiz.totalMarks = questions.length;
    }

    await quiz.save();

    res.json({
      message: "Quiz updated successfully",
      quiz
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
    console.error(err);
  }
};


exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.user.userId
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.json({ message: "Quiz deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
