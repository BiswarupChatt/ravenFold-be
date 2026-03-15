const formatMessage = (level, message, meta) => {
  const timestamp = new Date().toISOString();

  if (meta === undefined) {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }

  return `[${timestamp}] ${level.toUpperCase()}: ${message} ${JSON.stringify(
    meta
  )}`;
};

const writeLog = (method, level, message, meta) => {
  console[method](formatMessage(level, message, meta));
};

module.exports = {
  info: (message, meta) => writeLog("info", "info", message, meta),
  warn: (message, meta) => writeLog("warn", "warn", message, meta),
  error: (message, meta) => writeLog("error", "error", message, meta),
};
