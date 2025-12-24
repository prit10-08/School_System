const TeacherAvailability = require("../models/TeacherAvailability");
const { parseTimeToMinutes , parseDDMMYYYY } = require("../utils/dateParser");

exports.setWeeklyAvailability = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { weeklyAvailability } = req.body;

    const availability = await TeacherAvailability.findOneAndUpdate(
      { teacherId },
      { $set: { weeklyAvailability } },
      { upsert: true, new: true }
    );

    res.json({
      message: "Weekly availability updated",
      availability
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.addHoliday = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { reason, note } = req.body;
    const { parsedStartDate, parsedEndDate } = req;

    const existingAvailability = await TeacherAvailability.findOne({
      teacherId,
      holidays: {
        $elemMatch: {
          startDate: { $lte: parsedEndDate },
          endDate: { $gte: parsedStartDate }
        }
      }
    });

    if (existingAvailability) {
      return res.status(400).json({
        errors: ["Holiday dates overlap with an existing holiday"]
      });
    }

    const availability = await TeacherAvailability.findOneAndUpdate(
      { teacherId },
      {
        $push: {
          holidays: {
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            reason,
            note: note || ""
          }
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      message: "Holiday added successfully",
      holidays: availability.holidays
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTeacherAvailabilityForStudent = async (req, res) => {
    console.log("User role from token:", req.user.role);

  try {
    const { teacherId } = req.params;

    const availability = await TeacherAvailability.findOne({ teacherId })
      .select("-_id -__v");

    if (!availability) {
      return res.status(404).json({ message: "Teacher availability not set yet" });
    }

    res.json(availability);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
