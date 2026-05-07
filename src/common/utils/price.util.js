function toPaise(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function fromPaise(amount) {
  return Number(amount || 0) / 100;
}

export { fromPaise, toPaise };

export default {
  fromPaise,
  toPaise,
};