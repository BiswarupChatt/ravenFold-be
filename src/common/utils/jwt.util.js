function signToken() {
  throw new Error('JWT signing is not configured yet');
}

function verifyToken() {
  throw new Error('JWT verification is not configured yet');
}

export { signToken, verifyToken };

export default {
  signToken,
  verifyToken,
};