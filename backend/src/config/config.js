const dotenv = require('dotenv');
dotenv.config();

if (!process.env.MONGO_URI) {
  throw new Error('MONGO_URI is not defined');
}


const config = {
  MONGO_URI: process.env.MONGO_URI,
 
};

module.exports = config;