const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;
const hashPassword = async (rawPassword) => {
  return bcrypt.hash(rawPassword, SALT_ROUNDS);
};
const comparePassword = async (rawPassword, hash) => {
  return bcrypt.compare(rawPassword, hash);
};
module.exports = { hashPassword, comparePassword };