function createQueue(name) {
  return {
    add() {
      throw new Error(`${name} queue is not configured yet`);
    },
  };
}

module.exports = {
  createQueue,
};
