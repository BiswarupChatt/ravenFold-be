const createQueue = (name) => {
  return {
    add: () => {
      throw new Error(`${name} queue is not configured yet`);
    },
  };
};

export { createQueue };

export default {
  createQueue,
};
