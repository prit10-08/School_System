const { redisClient } = require("../config/redis");
const moment = require("moment-timezone");
const SessionSlot = require("../models/SessionSlot");
const TeacherAvailability = require("../models/TeacherAvailability");
const User = require("../models/User");
const generateAvailableSlots = require("../utils/generateAvailableSlots");

exports.createSessionSlots = async (req, res) => {
  try {
    const { title, date, sessionDuration, breakDuration, student_id } = req.body;

    // Input sanitization
    const sanitizedTitle = title?.trim().replace(/[<>]/g, '');
    const teacherId = req.user.id;
    const teacherTimezone = req.user.timezone || "Asia/Kolkata";

    // Validate date format and parse
    const parsedDate = moment(date, "DD-MM-YYYY").startOf("day").toDate();
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use DD-MM-YYYY format"
      });
    }

    // Check for duplicate session
    const duplicateSession = await SessionSlot.findOne({
      teacherId,
      title: sanitizedTitle,
      date: parsedDate
    });

    if (duplicateSession) {
      return res.status(409).json({
        success: false,
        message: "Session with same title already exists on this date"
      });
    }

    // Check teacher availability
    const availability = await TeacherAvailability.findOne({ teacherId });
    if (!availability) {
      return res.status(400).json({
        success: false,
        message: "Please set your weekly availability first"
      });
    }

    // Check if date is a holiday
    const isHoliday = availability.holidays.some(
      h => parsedDate >= new Date(h.startDate) && parsedDate <= new Date(h.endDate)
    );

    if (isHoliday) {
      return res.status(400).json({
        success: false,
        message: "Cannot create sessions on holidays"
      });
    }

    // Check day availability
    const day = moment(parsedDate).format("dddd").toLowerCase();
    const dayAvailability = availability.weeklyAvailability.find(
      d => d.day === day
    );

    if (!dayAvailability || !dayAvailability.startTime || !dayAvailability.endTime) {
      return res.status(400).json({
        success: false,
        message: `Teacher is not available on ${day}`
      });
    }

    // Validate student if provided
    let allowedStudentId = null;
    if (student_id) {
      const student = await User.findOne({
        _id: student_id,
        teacherId
      });

      if (!student) {
        return res.status(403).json({
          success: false,
          message: "Invalid student for this teacher"
        });
      }
      allowedStudentId = student._id;
    }

    // Check for existing session on same date
    const existingSession = await SessionSlot.findOne({
      teacherId,
      date: parsedDate
    });

    if (existingSession) {
      return res.status(409).json({
        success: false,
        message: "Session slots already created for this date"
      });
    }

    // Create session
    const session = await SessionSlot.create({
      teacherId,
      title: sanitizedTitle,
      date: parsedDate,
      sessionDuration: Math.max(15, Math.min(240, parseInt(sessionDuration) || 60)),
      breakDuration: Math.max(0, Math.min(60, parseInt(breakDuration) || 10)),
      allowedStudentId
    });

    // Generate available slots
    const slots = await generateAvailableSlots(
      {
        date: parsedDate,
        availability: dayAvailability,
        sessionId: session._id,
        teacherId
      },
      {
        Duration: session.sessionDuration,
        breakDuration,
        teacherTimezone
      },
      []
    );

    // Clear relevant cache with pattern matching for better invalidation
    if (redisClient?.isOpen) {
      const cachePattern = `teacher:${teacherId}:sessions:*`;
      const keys = await redisClient.keys(cachePattern);
      if (keys && keys.length > 0) {
        await redisClient.del(keys);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Session slots created successfully",
      data: {
        sessionId: session._id,
        title: session.title,
        date: moment(session.date).format("DD-MM-YYYY"),
        day: moment(session.date).format("dddd"),
        sessionDuration: session.sessionDuration,
        breakDuration: session.breakDuration,
        totalSlots: slots.length,
        slots
      }
    });

  } catch (err) {
    console.error('Error in createSessionSlots:', err);
    res.status(500).json({
      success: false,
      message: "Internal server error while creating session slots"
    });
  }
};

exports.getMySessionSlots = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).lean();
    if (!student) return res.status(404).json({ message: "Student not found" });

    const studentTimezone =
      student.timezone || student[" timezone"] || "Asia/Kolkata";

    const teacher = await User.findById(student.teacherId).lean();
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const teacherTZ = teacher.timezone || "Asia/Kolkata";

    const sessions = await SessionSlot.find({
      teacherId: student.teacherId,
      $or: [{ allowedStudentId: null }, { allowedStudentId: student._id }]
    })
      .sort({ date: 1 })
      .lean();

    const availability = await TeacherAvailability.findOne({
      teacherId: student.teacherId
    }).lean();

    if (!availability) {
      return res.status(404).json({ message: "Teacher availability not found" });
    }

    const response = [];

    for (const session of sessions) {
      // ✅ day based on TEACHER timezone
      const day = moment(session.date).tz(teacherTZ).format("dddd").toLowerCase();

      const dayAvailability = availability.weeklyAvailability.find(d => d.day === day);
      if (!dayAvailability) continue;

      // ✅ 1) Available slots returned from generator (already removes booked)
      const availableSlotsRaw = await generateAvailableSlots(
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
          teacherTimezone: teacherTZ,
          studentTimezone: studentTimezone
        },
        session.bookedSlots || []
      );

      // ✅ 2) My booked slots (same position ma show karva mate slots array ma merge karvana)
      const myBookedSlots = (session.bookedSlots || [])
        .filter(b => String(b.bookedBy) === String(student._id))
        .map(b => ({
          startTime: moment(b.startTime).tz(studentTimezone).format("HH:mm"),
          endTime: moment(b.endTime).tz(studentTimezone).format("HH:mm"),
          startTimeUTC: moment(b.startTime).utc().toISOString(),
          endTimeUTC: moment(b.endTime).utc().toISOString(),
          isBooked: true,
          isBookedByMe: true
        }));

      // ✅ 3) Remove past slots (student timezone)
      const nowStudent = moment().tz(studentTimezone);

      const availableSlots = (availableSlotsRaw || [])
        .filter(slot => {
          const slotStartStudent = moment.utc(slot.startTimeUTC).tz(studentTimezone);
          return slotStartStudent.isAfter(nowStudent);
        })
        .map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          startTimeUTC: slot.startTimeUTC,
          endTimeUTC: slot.endTimeUTC,
          isBooked: false,
          isBookedByMe: false
        }));

      // ✅ 4) Merge both in ONE ARRAY (same place, no extra row)
      const finalMap = new Map();

      // ✅ add available first
      availableSlots.forEach(s => {
        finalMap.set(s.startTimeUTC, s);
      });

      // ✅ overwrite with booked (GREEN)
      myBookedSlots.forEach(s => {
        finalMap.set(s.startTimeUTC, s);
      });

      // ✅ 5) Sort using UTC time (perfect order including 23:40-00:40 etc)
      const slots = Array.from(finalMap.values()).sort((a, b) => {
        return moment.utc(a.startTimeUTC).valueOf() - moment.utc(b.startTimeUTC).valueOf();
      });

      response.push({
        sessionId: session._id,
        title: session.title,
        sessionType: session.allowedStudentId ? "personal" : "common",
        date: moment(session.date).tz(studentTimezone).format("DD-MM-YYYY / dddd"),
        teacherName: teacher.name,
        duration: session.sessionDuration,
        slots
      });
    }

return res.json({
  pagination: { page: 1, limit: 10, count: response.length },

  meta: {
    teacherName: teacher.name,
    studentTimezone: studentTimezone
  },

  sessions: response
});

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.confirmSessionSlot = async (req, res) => {
  let lockKey;

  try {
    const { sessionId, startTimeUTC, endTimeUTC } = req.body;
    const studentId = req.user.id;

    if (!sessionId || !startTimeUTC || !endTimeUTC) {
      return res.status(400).json({
        message: "sessionId, startTimeUTC, endTimeUTC are required"
      });
    }

    const student = await User.findById(studentId).lean();
    if (!student) return res.status(404).json({ message: "Student not found" });

    const studentTZ = student.timezone || "Asia/Kolkata";

    const session = await SessionSlot.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (String(session.teacherId) !== String(student.teacherId)) {
      return res.status(403).json({ message: "Not allowed to book this session" });
    }

    if (
      session.allowedStudentId &&
      String(session.allowedStudentId) !== String(studentId)
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const startUTC = moment.utc(startTimeUTC);
    const endUTC = moment.utc(endTimeUTC);

    if (!startUTC.isValid() || !endUTC.isValid()) {
      return res.status(400).json({ message: "Invalid UTC time format" });
    }

    if (!endUTC.isAfter(startUTC)) {
      return res.status(400).json({ message: "Invalid slot duration" });
    }

    lockKey = `lock:session:${sessionId}:slot:${startUTC.toISOString()}`;

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

    const overlap = (session.bookedSlots || []).some(b =>
      startUTC.isBefore(moment(b.endTime)) &&
      endUTC.isAfter(moment(b.startTime))
    );

    if (overlap) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    session.bookedSlots.push({
      startTime: startUTC.toDate(),
      endTime: endUTC.toDate(),
      bookedBy: studentId
    });

    await session.save();

    // ✅ Clear caches
    if (redisClient?.isOpen) {
      const keys = [
  ...(await redisClient.keys(`slots:teacher:${session.teacherId}:${session._id}:*`)),
  ...(await redisClient.keys(`slots:student:*:${session._id}:*`)),
  ...(await redisClient.keys(`slots:student:${studentId}:${session._id}:*`)),
  ...(await redisClient.keys(`teacher:${session.teacherId}:sessions:*`)),
  ...(await redisClient.keys(`student:${studentId}:sessions:*`))
];


      if (keys.length > 0) await redisClient.del(keys);
    }

    return res.json({
      message: "Slot booked successfully",
      booking: {
        sessionId: session._id,
        date: startUTC.clone().tz(studentTZ).format("DD-MM-YYYY"),
        startTime: startUTC.clone().tz(studentTZ).format("HH:mm"),
        endTime: endUTC.clone().tz(studentTZ).format("HH:mm")
      }
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
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
    console.error('Error in getMyConfirmedSessions:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getTeacherSessions = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const teacherUser = await User.findById(teacherId).lean();
    const teacherTZ = teacherUser?.timezone || "Asia/Kolkata";

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const type = req.query.type || "all";

    const query = { teacherId };
    if (type === "personal") query.allowedStudentId = { $ne: null };
    if (type === "common") query.allowedStudentId = null;

    const totalSessions = await SessionSlot.countDocuments(query);

    const sessions = await SessionSlot.find(query)
      .populate("allowedStudentId", "name email userId")
      .populate({
        path: "bookedSlots.bookedBy",
        select: "name email"
      })
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const teacherAvailability = await TeacherAvailability.findOne({ teacherId }).lean();

    const formattedSessions = await Promise.all(
      sessions.map(async (s) => {
        const dayOfWeek = moment(s.date).tz(teacherTZ).format("dddd").toLowerCase();

        const weeklyDay = teacherAvailability?.weeklyAvailability?.find(
          d => d.day?.toLowerCase() === dayOfWeek && d.isAvailable !== false
        );

        let availableSlots = [];
        if (weeklyDay?.startTime && weeklyDay?.endTime) {
          availableSlots = await generateAvailableSlots(
            {
              date: s.date,
              availability: weeklyDay,
              sessionId: s._id,
              teacherId,
              studentId: null
            },
            {
              Duration: s.sessionDuration,
              breakDuration: s.breakDuration,
              teacherTimezone: teacherTZ,
              studentTimezone: teacherTZ
            },
            s.bookedSlots || []
          );
        }

        const bookedSlots = (s.bookedSlots || []).map(b => ({
          startTime: moment(b.startTime).tz(teacherTZ).format("HH:mm"),
          endTime: moment(b.endTime).tz(teacherTZ).format("HH:mm"),
          bookedBy: b.bookedBy,
          studentName: b.bookedBy?.name || 'Unknown'
        }));

        // ✅ FIXED TOTAL: base = available + booked always
        const totalSlots = availableSlots.length + bookedSlots.length;

        return {
          sessionId: s._id,
          title: s.title,
          date: moment(s.date).tz(teacherTZ).format("DD-MM-YYYY"),
          day: moment(s.date).tz(teacherTZ).format("dddd"),

          sessionDuration: s.sessionDuration,
          breakDuration: s.breakDuration,
          allowedStudent: { name: s.allowedStudentId?.name || 'Unknown' },

          totalSlots,
          slots: availableSlots, // available
          bookedSlots,           // booked
        };
      })
    );

    return res.json({
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalSessions / limit),
        totalSessions,
        limit
      },
      sessions: formattedSessions
    });

  } catch (error) {
    console.error("Error in getTeacherSessions:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching teacher sessions"
    });
  }
};


