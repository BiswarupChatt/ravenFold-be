function info(message, meta) {
  if (meta) {
    console.info(message, meta);
    return;
  }

  console.info(message);
}

function error(message, meta) {
  if (meta) {
    console.error(message, meta);
    return;
  }

  console.error(message);
}

export { error, info };

export default {
  error,
  info,
};