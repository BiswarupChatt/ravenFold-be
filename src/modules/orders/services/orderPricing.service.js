function calculateOrderPricing() {
  return {
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  };
}

module.exports = {
  calculateOrderPricing,
};
