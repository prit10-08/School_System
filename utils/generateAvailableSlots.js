const moment = require("moment-timezone");
const { getCache, setCache } = require("./redisCache");

const generateAvailableSlots = async (
  teacherDates = {
    date: null,
    availability: null,
    sessionId: null,
    teacherId: null,
    studentId: null
  },
  sessionData = {
    Duration: 0,
    breakDuration: 0,
    teacherTimezone: "Asia/Kolkata",
    studentTimezone: null
  },
  bookedSlots = []
) => {
  const slots = [];

  const { date, availability, sessionId, teacherId, studentId } = teacherDates;

  const { Duration, breakDuration, teacherTimezone, studentTimezone } = sessionData;

  if (!date || !availability) {
    throw new Error("Missing date or availability in generateAvailableSlots");
  }

  const redisDate = moment(date).format("YYYY-MM-DD");
  const effectiveTimezone = studentTimezone || teacherTimezone;

  const teacherRedisKey =
    `slots:teacher:${teacherId}:${sessionId}:${redisDate}:${availability.startTime}-${availability.endTime}`;

  const studentRedisKey =
    studentId
      ? `slots:student:${studentId}:${sessionId}:${redisDate}:${availability.startTime}-${availability.endTime}:${effectiveTimezone}`
      : null;

  if (studentRedisKey) {
    const studentCached = await getCache(studentRedisKey);
    if (studentCached) {
      console.log("STUDENT CACHE HIT");
      return JSON.parse(studentCached);
    }
  }

  const teacherCached = await getCache(teacherRedisKey);
  if (teacherCached) {
    console.log("TEACHER CACHE HIT");

    const teacherSlots = JSON.parse(teacherCached);

    const convertedSlots = teacherSlots.map(slot => ({
      startTime: moment(slot.startTime, "HH:mm")
        .tz(effectiveTimezone)
        .format("HH:mm"),
      endTime: moment(slot.endTime, "HH:mm")
        .tz(effectiveTimezone)
        .format("HH:mm")
    }));

     if (studentRedisKey) {
      await setCache(studentRedisKey, convertedSlots);
      console.log("STUDENT CACHE CREATED");
    }

    return convertedSlots;
  }

  let currentTeacher = moment.tz(
    `${redisDate} ${availability.startTime}`,
    "YYYY-MM-DD HH:mm",
    teacherTimezone
  );

  const endTeacher = moment.tz(
    `${redisDate} ${availability.endTime}`,
    "YYYY-MM-DD HH:mm",
    teacherTimezone
  );

  while (
    currentTeacher.clone().add(Duration, "minutes").isSameOrBefore(endTeacher)
  ) {
    const slotStartUTC = currentTeacher.clone().utc();
    const slotEndUTC = slotStartUTC.clone().add(Duration, "minutes");

    const isBooked = bookedSlots.some(
      b =>
        slotStartUTC.isBefore(b.endTime) &&
        slotEndUTC.isAfter(b.startTime)
    );

    if (!isBooked) {
      slots.push({
        startTime: slotStartUTC
          .clone()
          .tz(teacherTimezone)
          .format("HH:mm"),
        endTime: slotEndUTC
          .clone()
          .tz(teacherTimezone)
          .format("HH:mm")
      });
    }

    currentTeacher.add(Duration + breakDuration, "minutes");
  }

  await setCache(teacherRedisKey, slots);
  console.log("TEACHER CACHE CREATED");

  if (studentRedisKey) {
    await setCache(studentRedisKey, slots);
    console.log("STUDENT CACHE CREATED");
  }

  return slots;
};

module.exports = generateAvailableSlots;
