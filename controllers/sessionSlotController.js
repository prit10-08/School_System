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

    // Clear relevant student cache with pattern matching
    if (redisClient?.isOpen) {
      const studentCachePattern = `student:${studentId}:*`;
      const studentKeys = await redisClient.keys(studentCachePattern);
      if (studentKeys && studentKeys.length > 0) {
        await redisClient.del(studentKeys);
      }
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
    console.error('Error in getMyConfirmedSessions:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.getTeacherSessions = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacherTZ = req.user.timezone || "Asia/Kolkata";

    // Parse query parameters with defaults
    const type = req.query.type || "all";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const status = req.query.status || "all";
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    // Build cache key
    const cacheKey = `teacher:${teacherId}:sessions:${type}:${page}:${limit}:${status}:${dateFrom || ''}:${dateTo || ''}`;

    // Try Redis cache first
    if (redisClient?.isOpen) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    // Build query based on filters
    const query = { teacherId };

    if (type === "personal") {
      query.allowedStudentId = { $ne: null };
    } else if (type === "common") {
      query.allowedStudentId = null;
    }

    // Add date range filter if provided
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) {
        const fromDate = moment(dateFrom, "DD-MM-YYYY").startOf("day").toDate();
        if (!isNaN(fromDate.getTime())) {
          query.date.$gte = fromDate;
        }
      }
      if (dateTo) {
        const toDate = moment(dateTo, "DD-MM-YYYY").endOf("day").toDate();
        if (!isNaN(toDate.getTime())) {
          query.date.$lte = toDate;
        }
      }
    }

    // Get total count for pagination
    const totalSessions = await SessionSlot.countDocuments(query);

    // Fetch sessions with pagination
    const sessions = await SessionSlot.find(query)
      .populate("allowedStudentId", "name email")
      .populate("bookedSlots.bookedBy", "name email")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format response
    const response = {
      success: true,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalSessions / limit),
        totalSessions,
        limit,
        hasNext: page < Math.ceil(totalSessions / limit),
        hasPrev: page > 1
      },
      filters: {
        type,
        status,
        dateRange: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : null
      },
      sessions: await Promise.all(sessions.map(async (s) => {
        // Get availability for each session's specific date
        const sessionDate = moment(s.date).format("YYYY-MM-DD");
        const dayOfWeek = moment(s.date).format("dddd").toLowerCase();
        let dayAvailability;
        
        try {
          // Get teacher's weekly availability (this is how it's stored)
          const teacherAvailability = await TeacherAvailability.findOne({
            teacherId
          });
          
          console.log('Teacher availability found:', teacherAvailability);
          
          if (teacherAvailability && teacherAvailability.weeklyAvailability) {
            const weeklyDay = teacherAvailability.weeklyAvailability.find(
              d => d.day.toLowerCase() === dayOfWeek
            );
            
            console.log('Weekly day found for', dayOfWeek, ':', weeklyDay);
            
            if (weeklyDay && weeklyDay.isAvailable) {
              dayAvailability = {
                startTime: weeklyDay.startTime,
                endTime: weeklyDay.endTime,
                weeklyAvailability: teacherAvailability.weeklyAvailability
              };
              console.log('Using teacher availability:', weeklyDay);
            }
          }
          
          // Also check for date-specific availability (override)
          const dateSpecificAvailability = await TeacherAvailability.findOne({
            teacherId,
            date: sessionDate
          });
          
          if (dateSpecificAvailability && dateSpecificAvailability.startTime && dateSpecificAvailability.endTime) {
            dayAvailability = {
              startTime: dateSpecificAvailability.startTime,
              endTime: dateSpecificAvailability.endTime,
              weeklyAvailability: teacherAvailability?.weeklyAvailability || []
            };
            console.log('Using date-specific availability for', sessionDate);
          }
          
        } catch (error) {
          console.log('Error fetching availability for session date:', sessionDate, error);
          dayAvailability = null;
        }

        // Only use default if absolutely no availability found
        if (!dayAvailability) {
          console.log('No availability found for session date:', sessionDate, 'using default 9-5');
          dayAvailability = {
            startTime: "09:00",
            endTime: "17:00",
            weeklyAvailability: [{
              day: dayOfWeek,
              startTime: "09:00",
              endTime: "17:00",
              isAvailable: true
            }]
          };
        }

        // Generate available slots for this session using the actual availability
        const weeklyAvailability = dayAvailability?.weeklyAvailability?.find(
          d => d.day.toLowerCase() === dayOfWeek
        );
        
        let slots = [];
        if (weeklyAvailability && weeklyAvailability.startTime && weeklyAvailability.endTime && weeklyAvailability.isAvailable) {
          slots = await generateAvailableSlots(
            {
              date: s.date,
              availability: weeklyAvailability,
              sessionId: s._id,
              teacherId
            },
            {
              Duration: s.sessionDuration,
              breakDuration: s.breakDuration,
              teacherTimezone: teacherTZ
            },
            s.bookedSlots || []
          );
        }
        
        return {
          sessionId: s._id,
          title: s.title,
          date: moment(s.date).tz(teacherTZ).format("DD-MM-YYYY"),
          day: moment(s.date).tz(teacherTZ).format("dddd"),
          sessionDuration: s.sessionDuration,
          breakDuration: s.breakDuration,
          allowedStudent: s.allowedStudentId,
          totalSlots: slots.length,
          slots: slots,
          bookedSlots: s.bookedSlots?.map(b => ({
            startTime: moment(b.startTime).tz(teacherTZ).format("HH:mm"),
            endTime: moment(b.endTime).tz(teacherTZ).format("HH:mm"),
            bookedBy: b.bookedBy
          })) || [],
          createdAt: moment(s.createdAt).tz(teacherTZ).format("DD-MM-YYYY HH:mm"),
          updatedAt: moment(s.updatedAt).tz(teacherTZ).format("DD-MM-YYYY HH:mm")
        };
      }))
    };

    // Cache the response
    if (redisClient?.isOpen) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(response)); // 5 minutes cache
    }

    res.json(response);

  } catch (error) {
    console.error('Error in getTeacherSessions:', error);
    res.status(500).json({
      success: false,
      message: "Error fetching teacher sessions"
    });
  }
};
