const mongoose = require("mongoose");

const MarkSchema = new mongoose.Schema({
  studentUserId: { type: String, required: true, index: true }, 
  subject: { type: String, required: true, trim: true },
  marks: { type: Number, required: true, min: 0 },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model("Mark", MarkSchema);
