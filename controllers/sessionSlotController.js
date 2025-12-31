const moment = require("moment-timezone");
const SessionSlot = require("../models/SessionSlot");
const TeacherAvailability = require("../models/TeacherAvailability");
const User = require("../models/User");
const generateAvailableSlots = require("../utils/generateAvailableSlots");

exports.createSessionSlots = async (req, res) => {
  try {
    const { title, date, sessionDuration, breakDuration, student_id } = req.body;
    const teacherId = req.user.id;

    const teacher = await User.findById(teacherId);
    const teacherTZ = teacher.timezone || "Asia/Kolkata";

    const parsedDate = moment(date, "DD-MM-YYYY").startOf("day").toDate();

    const duplicateSession = await SessionSlot.findOne({
      teacherId,
      title: title.trim(),
      date: parsedDate
    });

    if (duplicateSession) {
      return res.status(400).json({
        message: "Session with same title already exists on this date"
      });
    }

    const availability = await TeacherAvailability.findOne({ teacherId });
    if (!availability) {
      return res.status(400).json({ message: "Teacher availability not set" });
    }

    const isHoliday = availability.holidays.some(
      h => parsedDate >= h.startDate && parsedDate <= h.endDate
    );
    if (isHoliday) {
      return res.status(400).json({ message: "Session date is a holiday" });
    }

    const day = moment(parsedDate).format("dddd").toLowerCase();
    const dayAvailability = availability.weeklyAvailability.find(d => d.day === day);
    if (!dayAvailability) {
      return res.status(400).json({ message: "Teacher not available on this day" });
    }

    let allowedStudentId = null;
    if (student_id) {
      const student = await User.findOne({ _id: student_id, teacherId });
      if (!student) {
        return res.status(403).json({ message: "Invalid student for this teacher" });
      }
      allowedStudentId = student._id;
    }

    const existingSessions = await SessionSlot.find({
      teacherId,
      date: parsedDate
    });

    const allBookedSlots = [];
    for (const s of existingSessions) {
      for (const b of s.bookedSlots) {
        allBookedSlots.push(b);
      }
    }

    const generatedSlotsUTC = generateAvailableSlots({
      date: parsedDate,
      availability: dayAvailability,
      sessionDuration,
      breakDuration,
      bookedSlots: allBookedSlots,
      teacherTimezone: teacherTZ
    });

    if (generatedSlotsUTC.length === 0) {
      return res.status(400).json({
        message: "No available slots. All time is already booked."
      });
    }

    const session = await SessionSlot.create({
      teacherId,
      title: title.trim(),
      date: parsedDate,
      sessionDuration,
      breakDuration,
      allowedStudentId,
      bookedSlots: []
    });

    const previewSlots = generatedSlotsUTC.map(s => ({
      startTime: moment(s.startTimeUTC).tz(teacherTZ).format("HH:mm"),
      endTime: moment(s.endTimeUTC).tz(teacherTZ).format("HH:mm")
    }));

    res.status(201).json({
      message: "Session created successfully",
      sessionId: session._id,
      title: session.title,
      date: moment(session.date).format("DD-MM-YYYY(dddd)"),
      generatedSlots: previewSlots
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "Duplicate session detected (same title & date)"
      });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.getMySessionSlots = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    const studentTZ = student.timezone || "Asia/Kolkata";

    const teacher = await User.findById(student.teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const sessions = await SessionSlot.find({
      teacherId: student.teacherId,
      $or: [{ allowedStudentId: null }, { allowedStudentId: student._id }]
    })
      .skip(skip)
      .limit(limit);

    const availability = await TeacherAvailability.findOne({
      teacherId: student.teacherId
    });

    const response = [];

    for (const session of sessions) {
      const day = moment(session.date).format("dddd").toLowerCase();
      const dayAvailability = availability.weeklyAvailability.find(
        d => d.day === day
      );

      if (!dayAvailability) continue;

      const slotsUTC = generateAvailableSlots({
        date: session.date,
        availability: dayAvailability,
        sessionDuration: session.sessionDuration,
        breakDuration: session.breakDuration,
        bookedSlots: session.bookedSlots,
        teacherTimezone: teacher.timezone || "Asia/Kolkata"
      });

      const slotsForStudent = slotsUTC.map(s => ({
        startTime: moment(s.startTimeUTC).tz(studentTZ).format("HH:mm"),
        endTime: moment(s.endTimeUTC).tz(studentTZ).format("HH:mm")
      }));

      response.push({
        sessionId: session._id,
        title: session.title,
        date: moment(session.date).tz(studentTZ).format("DD-MM-YYYY"),
        slots: slotsForStudent
      });
    }

    res.json({
      pagination: { page, limit, count: response.length },
      sessions: response
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.confirmSessionSlot = async (req, res) => {
  try {
    const { sessionId, startTime } = req.body;
    const studentId = req.user.id;

    const student = await User.findById(studentId);
    const studentTZ = student.timezone || "Asia/Kolkata";

    const session = await SessionSlot.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (String(session.teacherId) !== String(student.teacherId)) {
      return res.status(403).json({
        message: "You are not allowed to confirm slot"
      });
    }
    if (
      session.allowedStudentId &&
      String(session.allowedStudentId) !== String(studentId)
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const teacher = await User.findById(session.teacherId);
    const availability = await TeacherAvailability.findOne({
      teacherId: session.teacherId
    });

    const day = moment(session.date).format("dddd").toLowerCase();
    const dayAvailability = availability.weeklyAvailability.find(
      d => d.day === day
    );

    if (!dayAvailability) {
      return res.status(400).json({ message: "Teacher not available on this day" });
    }

    const slotsUTC = generateAvailableSlots({
      date: session.date,
      availability: dayAvailability,
      sessionDuration: session.sessionDuration,
      breakDuration: session.breakDuration,
      bookedSlots: session.bookedSlots,
      teacherTimezone: teacher.timezone || "Asia/Kolkata"
    });

    const matchedSlot = slotsUTC.find(s => {
      const displayTime = moment(s.startTimeUTC)
        .tz(studentTZ)
        .format("HH:mm");
      return displayTime === startTime;
    });

    if (!matchedSlot) {
      return res.status(400).json({
        message: "Invalid or already booked slot"
      });
    }

    session.bookedSlots.push({
      startTime: matchedSlot.startTimeUTC,
      endTime: matchedSlot.endTimeUTC,
      bookedBy: studentId
    });

    await session.save();

    res.json({
      message: "Slot booked successfully",
      booking: {
        sessionId: session._id,
        date: moment(matchedSlot.startTimeUTC).tz(studentTZ).format("DD-MM-YYYY"),
        startTime,
        endTime: moment(matchedSlot.endTimeUTC).tz(studentTZ).format("HH:mm")
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyConfirmedSessions = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const timezone = student.timezone || "Asia/Kolkata";

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sessions = await SessionSlot.find({
      "bookedSlots.bookedBy": studentId
    })
      .populate("teacherId", "name userId")
      .lean();

    const bookedSlots = [];

    for (const session of sessions) {
      for (const slot of session.bookedSlots) {
        if (String(slot.bookedBy) === String(studentId)) {
          bookedSlots.push({
            sessionId: session._id,
            title: session.title,
            teacherName: session.teacherId.name,
            startTime: slot.startTime,
            endTime: slot.endTime
          });
        }
      }
    }

    const totalSessions = bookedSlots.length;
    const paginatedSlots = bookedSlots.slice(skip, skip + limit);

    const formattedSessions = paginatedSlots.map(s => ({
      sessionId: s.sessionId,
      title: s.title,
      teacherName: s.teacherName,
      date: moment(s.startTime).tz(timezone).format("DD-MM-YYYY"),
      startTime: moment(s.startTime).tz(timezone).format("HH:mm"),
      endTime: moment(s.endTime).tz(timezone).format("HH:mm")
    }));

    res.json({
      pagination: {
        totalSessions,
        currentPage: page,
        totalPages: Math.ceil(totalSessions / limit),
        limit
      },
      sessions: formattedSessions
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeacherSessions = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherName = req.user.name;

    const teacher = await User.findById(teacherId);
    const teacherTZ = teacher.timezone || "Asia/Kolkata";

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const type = req.query.type;
    const query = { teacherId };

    if (type === "personal") {
      query.allowedStudentId = { $ne: null };
    }

    if (type === "common") {
      query.allowedStudentId = null;
    }

    const totalSessions = await SessionSlot.countDocuments(query);

    const sessions = await SessionSlot.find(query)
      .skip(skip)
      .limit(limit)
      .populate("allowedStudentId", "name email")
      .populate("bookedSlots.bookedBy", "name email")
      .lean();

    const formattedSessions = sessions.map(session => ({
      sessionId: session._id,
      title: session.title,
      date: moment(session.date).tz(teacherTZ).format("DD-MM-YYYY"),
      allowedStudent: session.allowedStudentId || null,
      bookedSlots: session.bookedSlots.map(slot => ({
        startTime: moment(slot.startTime).tz(teacherTZ).format("HH:mm"),
        endTime: moment(slot.endTime).tz(teacherTZ).format("HH:mm"),
        bookedBy: slot.bookedBy ? {
          id: slot.bookedBy._id,
          name: slot.bookedBy.name,
          email: slot.bookedBy.email
        } : null
      }))
    }));

    res.json({
      pagination: {
        teacherName,
        teacherId,
        totalSessions,
        currentPage: page,
        totalPages: Math.ceil(totalSessions / limit),
        limit
      },
      sessions: formattedSessions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};