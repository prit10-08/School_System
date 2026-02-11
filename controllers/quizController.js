const Quiz = require("../models/Quiz");
const User = require("../models/User");
exports.createQuiz = async (req, res) => {
  try {


    const { title, subject, class: studentClass, questions, startTime, endTime, duration } = req.body;

    if (!questions || questions.length === 0) {
      console.log('Validation failed: No questions');
      return res.status(400).json({
        success: false,
        message: "Questions are required"
      });
    }

    if (!studentClass) {
      return res.status(400).json({
        success: false,
        message: "Class is required"
      });
    }


    const quiz = await Quiz.create({
      title,
      subject,
      class: studentClass,
      questions,
      totalMarks: questions.length,
      itemOffset: 0,
      startTime: startTime || null,
      endTime: endTime || null,
      duration: duration || null,
      teacherId: req.user.id
    });


    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      quiz
    });
  } catch (err) {
    console.error('Error creating quiz:', err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

exports.getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({
      teacherId: req.user.id
    }).select("-__v");

    res.json({
      success: true,
      data: quizzes
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    res.json({
      success: true,
      data: quiz
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    const { title, subject, class: studentClass, questions, startTime, endTime, duration } = req.body;

    if (title) quiz.title = title;
    if (subject) quiz.subject = subject;
    if (studentClass) quiz.class = studentClass;
    if (startTime) quiz.startTime = startTime;
    if (endTime) quiz.endTime = endTime;
    if (duration) quiz.duration = duration;

    if (questions) {
      quiz.questions = questions;
      quiz.totalMarks = questions.length;
    }

    await quiz.save();

    res.json({
      success: true,
      message: "Quiz updated successfully",
      quiz
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.updateQuizQuestion = async (req, res) => {
  try {
    const { quizId, questionId } = req.params;
    const { question, options, correctOption } = req.body;

    const quiz = await Quiz.findOne({
      _id: quizId,
      teacherId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const ques = quiz.questions.id(questionId);

    if (!ques) {
      return res.status(404).json({ message: "Question not found" });
    }

    if (question) ques.question = question;
    if (options) ques.options = options;
    if (correctOption !== undefined) ques.correctOption = correctOption;

    await quiz.save();

    res.json({
      message: "Question updated successfully",
      question: ques
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({
      _id: req.params.id,
      teacherId: req.user.id
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    res.json({
      success: true,
      message: "Quiz deleted successfully"
    });
  } catch (err) {
    console.error('Error deleting quiz:', err);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

exports.getAvailableQuizzes = async (req, res) => {
  try {
    // ✅ logged in student fetch
    const student = await User.findById(req.user.id).select("teacherId");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (!student.teacherId) {
      return res.status(400).json({
        success: false,
        message: "Teacher not assigned to this student"
      });
    }

    // ✅ Only quizzes created by student's teacher
    const quizzes = await Quiz.find({ teacherId: student.teacherId })
      .select("-__v -questions.correctOption")
      .sort({ createdAt: -1 });

    const quizzesWithDetails = quizzes.map((quiz) => ({
      _id: quiz._id,
      title: quiz.title,
      subject: quiz.subject,
      description: quiz.description || `Test your knowledge in ${quiz.subject}`,
      duration: quiz.duration || 30,
      questionCount: quiz.questions ? quiz.questions.length : 0,

      // ✅ fix operator precedence issue
      totalMarks: quiz.totalMarks || (quiz.questions ? quiz.questions.length : 0),

      createdAt: quiz.createdAt
    }));

    res.json({
      success: true,
      data: quizzesWithDetails
    });

  } catch (err) {
    console.error("Error getting available quizzes:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

