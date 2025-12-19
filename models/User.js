const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["student", "teacher"],
      default: "student"
    },
    
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
        
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    age: {
      type: Number,
      required: function () {
        return this.role === "student";
      },
    },

    class: {
      type: String,
      required: function () {
        return this.role === "student";
      },
    },

    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    profileImage: { type: String, default: "" },


    teacherId: {
      type: String,   
      default: null
  },


  },

  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
