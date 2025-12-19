const mongoose = require("mongoose");

const MarkSchema = new mongoose.Schema({
  studentUserId: { type: String, required: true, index: true }, 
  subject: { type: String, required: true, trim: true },
  marks: { type: Number, required: true, min: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Mark", MarkSchema);
