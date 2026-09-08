const dotenv = require('dotenv');
dotenv.config();
const JWT_EXPIRY = process.env.JWT_EXPIRY;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not defined');
}

if (!JWT_EXPIRY) {
  throw new Error('JWT_EXPIRY is not defined');
}


const config = {
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRY: JWT_EXPIRY,
};


module.exports = config;