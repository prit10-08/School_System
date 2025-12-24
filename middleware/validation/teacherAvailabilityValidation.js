const { parseTimeToMinutes } = require("../../utils/dateParser");

exports.validateWeeklyAvailability = (req, res, next) => {
  const { weeklyAvailability } = req.body;
  const errors = [];

  if (!Array.isArray(weeklyAvailability) || weeklyAvailability.length === 0) {
    return res.status(400).json({
      errors: ["weeklyAvailability is required"]
    });
  }

  const validDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

  weeklyAvailability.forEach((slot, index) => {
    const { day, startTime, endTime } = slot;

    if (!validDays.includes(day)) {
      errors.push(`Row ${index + 1}: Invalid day (${day})`);
    }

    try {
      parseTimeToMinutes(startTime);
    } catch (e) {
      errors.push(`Row ${index + 1}: startTime ${e.message}`);
    }

    try {
      parseTimeToMinutes(endTime);
    } catch (e) {
      errors.push(`Row ${index + 1}: endTime ${e.message}`);
    }

    try {
      const start = parseTimeToMinutes(startTime);
      const end = parseTimeToMinutes(endTime);
      if (start >= end) {
        errors.push(`Row ${index + 1}: startTime must be before endTime`);
      }
    } catch {
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  next();
};


exports.validateHoliday = (req, res, next) => {
  const { startDate, endDate, reason } = req.body;
  const errors = [];

  if (!startDate) errors.push("startDate is required");
  if (!endDate) errors.push("endDate is required");
  if (!reason) errors.push("reason is required");

  let parsedStartDate, parsedEndDate;

  try {
    parsedStartDate = parseDDMMYYYY(startDate);
  } catch (e) {
    errors.push(e.message);
  }

  try {
    parsedEndDate = parseDDMMYYYY(endDate);
  } catch (e) {
    errors.push(e.message);
  }

  if (parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate) {
    errors.push("endDate cannot be before startDate");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  req.parsedStartDate = parsedStartDate;
  req.parsedEndDate = parsedEndDate;
  next();
};
