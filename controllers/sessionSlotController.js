const { redisClient } = require("../config/redis");
const moment = require("moment-timezone");
const SessionSlot = require("../models/SessionSlot");
const TeacherAvailability = require("../models/TeacherAvailability");
const User = require("../models/User");
const generateAvailableSlots = require("../utils/generateAvailableSlots");

exports.createSessionSlots = async (req, res) => {
  try {
    const { title, date, sessionDuration, breakDuration, student_id } = req.body;

    const teacherId = req.user.id;
    const teacherTimezone = req.user.timezone || "Asia/Kolkata";

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
      return res.status(400).json({
        message: "Teacher availability not set"
      });
    }

    const isHoliday = availability.holidays.some(
      h => parsedDate >= h.startDate && parsedDate <= h.endDate
    );

    if (isHoliday) {
      return res.status(400).json({
        message: "Session date is a holiday"
      });
    }

    const day = moment(parsedDate).format("dddd").toLowerCase();
    const dayAvailability = availability.weeklyAvailability.find(
      d => d.day === day
    );

    if (!dayAvailability) {
      return res.status(400).json({
        message: "Teacher is not available on this day"
      });
    }

    let allowedStudentId = null;

    if (student_id) {
      const student = await User.findOne({
        _id: student_id,
        teacherId
      });

      if (!student) {
        return res.status(403).json({
          message: "Invalid student for this teacher"
        });
      }
      allowedStudentId = student._id;
    }

    const existingSession = await SessionSlot.findOne({
      teacherId,
      date: parsedDate
    });

    if (existingSession) {
      return res.status(400).json({
        message: "Session slots already created for this date"
      });
    }

    const session = await SessionSlot.create({
      teacherId,
      title,
      date: parsedDate,
      sessionDuration,
      breakDuration,
      allowedStudentId
    });

    const slots = await generateAvailableSlots(
      {
        date: parsedDate,
        availability: dayAvailability,
        sessionId: session._id,
        teacherId
      },
      {
        Duration: sessionDuration,
        breakDuration,
        teacherTimezone
      },
      []
    );

    return res.status(201).json({
      message: "Session slots created successfully",
      sessionId: session._id,
      title: session.title,
      date: moment(session.date).format("DD-MM-YYYY"),
      slots: slots
    });

  } catch (err) {
    res.status(500).json({ message1: err.message });
  }
};

exports.getMySessionSlots = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const studentTimezone = student.timezone || "Asia/Kolkata";
    const teacher = await User.findById(student.teacherId);

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sessions = await SessionSlot.find({
      teacherId: student.teacherId,
      $or: [
        { allowedStudentId: null },
        { allowedStudentId: student._id }
      ]
    })
      .skip(skip)
      .limit(limit)
      .sort({ date: 1 });

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

      const slots = await generateAvailableSlots(
        {
          date: session.date,
          availability: dayAvailability,
          sessionId: session._id,
          teacherId: teacher._id,
          studentId: student._id
        },
        {
          Duration: session.sessionDuration,
          breakDuration: session.breakDuration,
          teacherTimezone: teacher.timezone || "Asia/Kolkata",
          studentTimezone: student.timezone || "Asia/kolkata"
        },
        []
      );

      response.push({
        sessionId: session._id,
        title: session.title,
        date: moment(session.date)
          .tz(studentTimezone)
          .format("DD-MM-YYYY / dddd"),
        slots: slots
      });
    }

    return res.json({
      pagination: {
        page,
        limit,
        count: response.length
      },
      sessions: response
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.confirmSessionSlot = async (req, res) => {
  let lockKey;

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

    lockKey = `lock:session:${sessionId}:slot:${startTime}`;

    if (redisClient?.isOpen) {
      const lock = await redisClient.set(lockKey, "locked", {
        NX: true,
        EX: 10
      });

      if (!lock) {
        return res.status(409).json({
          message: "Slot is being booked by another student. Try again."
        });
      }
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
      return res.status(400).json({
        message: "Teacher not available on this day"
      });
    }



    const slotsUTC = generateAvailableSlots(
      {
        date: session.date,
        availability: dayAvailability
      },
      {
        sessionDuration: session.sessionDuration,
        breakDuration: session.breakDuration,
        teacherTimezone: teacher.timezone || "Asia/Kolkata",
        studentTimezone: student.timezone || "Asia/Kolkata"
      },
      session.bookedSlots
    );

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

    const overlap = session.bookedSlots.some(b =>
      matchedSlot.startTimeUTC < b.endTime &&
      matchedSlot.endTimeUTC > b.startTime
    );

    if (overlap) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    session.bookedSlots.push({
      startTime: matchedSlot.startTimeUTC,
      endTime: matchedSlot.endTimeUTC,
      bookedBy: studentId
    });

    await session.save();

    if (redisClient?.isOpen) {
      await redisClient.del(
        `student:${studentId}:confirmed-sessions:page:1:limit:10`
      );
      await redisClient.del(
        `student:${studentId}:session-slots`
      );
    }

    res.json({
      message: "Slot booked successfully",
      booking: {
        sessionId: session._id,
        date: moment(matchedSlot.startTimeUTC)
          .tz(studentTZ)
          .format("DD-MM-YYYY"),
        startTime,
        endTime: moment(matchedSlot.endTimeUTC)
          .tz(studentTZ)
          .format("HH:mm")
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });

  } finally {
    if (redisClient?.isOpen && lockKey) {
      await redisClient.del(lockKey);
    }
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

    const cacheKey = `student:${studentId}:confirmed-sessions:page:${page}:limit:${limit}`;

    // 🔴 1️⃣ TRY REDIS FIRST
    if (redisClient?.isOpen) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    // 🔴 2️⃣ DATABASE FETCH (UNCHANGED LOGIC)
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

    const finalResponse = {
      pagination: {
        totalSessions,
        currentPage: page,
        totalPages: Math.ceil(totalSessions / limit),
        limit
      },
      sessions: formattedSessions
    };

    // 🔴 3️⃣ SAVE TO REDIS (TTL = 60s)
    if (redisClient?.isOpen) {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(finalResponse));
    }

    res.json(finalResponse);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeacherSessions = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherTZ = req.user.timezone || "Asia/Kolkata";
    const type = req.query.type || "all";

    const cacheKey = `teacher:${teacherId}:sessions:${type}`;

    // 🔴 TRY REDIS
    if (redisClient?.isOpen) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    // 👉 EXISTING LOGIC
    const query = { teacherId };
    if (type === "personal") query.allowedStudentId = { $ne: null };
    if (type === "common") query.allowedStudentId = null;

    const totalSessions = await SessionSlot.countDocuments(query);

    const sessions = await SessionSlot.find(query)
      .populate("allowedStudentId", "name email")
      .populate("bookedSlots.bookedBy", "name email")
      .lean();

    const response = {
      pagination: {
        totalSessions,
        currentPage: 1,
        totalPages: 1,
        limit: sessions.length
      },
      sessions: sessions.map(s => ({
        sessionId: s._id,
        title: s.title,
        date: moment(s.date).tz(teacherTZ).format("DD-MM-YYYY"),
        allowedStudent: s.allowedStudentId,
        bookedSlots: s.bookedSlots.map(b => ({
          startTime: moment(b.startTime).tz(teacherTZ).format("HH:mm"),
          endTime: moment(b.endTime).tz(teacherTZ).format("HH:mm"),
          bookedBy: b.bookedBy
        }))
      }))
    };

    // 🔴 CACHE RESULT
    if (redisClient?.isOpen) {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
    }

    res.json(response);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};