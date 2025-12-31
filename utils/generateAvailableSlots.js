const moment = require("moment-timezone");

const generateAvailableSlots = (teacherDates = {
  date,
  availability,
},
  sessionData = {
    Duration,
    breakDuration,
    teacherTimezone,
  },
  bookedSlots = [],
) => {
  const slots = [];

  let currentTeacher = moment.tz(
    `${moment(date).format("DD-MM-YYYY")} ${availability.startTime}`,
    "DD-MM-YYYY HH:mm",
    teacherTimezone
  );

  const endTeacher = moment.tz(
    `${moment(date).format("DD-MM-YYYY")} ${availability.endTime}`,
    "DD-MM-YYYY HH:mm",
    teacherTimezone
  );

  while (
    currentTeacher.clone().add(sessionDuration, "minutes").isSameOrBefore(endTeacher)
  ) {
    const slotStartUTC = currentTeacher.clone().utc();
    const slotEndUTC = slotStartUTC.clone().add(sessionDuration, "minutes");

    const isBooked = bookedSlots.some(b =>
      slotStartUTC.isBefore(b.endTime) &&
      slotEndUTC.isAfter(b.startTime)
    );

    if (!isBooked) {
      slots.push({
        startTimeUTC: slotStartUTC.toDate(),
        endTimeUTC: slotEndUTC.toDate()
      });
    }

    currentTeacher = currentTeacher
      .clone()
      .add(sessionDuration + breakDuration, "minutes");
  }

  return slots;
};

module.exports = generateAvailableSlots;
