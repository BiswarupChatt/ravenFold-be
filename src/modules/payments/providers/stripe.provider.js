async function createStripePaymentIntent() {
  throw new Error('Stripe provider is not configured yet');
}

export { createStripePaymentIntent };

export default {
  createStripePaymentIntent,
};