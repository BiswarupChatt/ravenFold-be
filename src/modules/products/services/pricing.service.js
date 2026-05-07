function calculateProductPrice(product) {
  return Number(product && product.price ? product.price : 0);
}

export { calculateProductPrice };

export default {
  calculateProductPrice,
};