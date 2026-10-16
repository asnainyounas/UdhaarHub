const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const csrfMiddleware = require('./middlewares/csrf.middleware');

const app = express();

// Global Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(csrfMiddleware);

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/debtors', require('./routes/debtor.routes'));
app.use('/api/charges', require('./routes/charge.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/companies', require('./routes/company.routes'));
app.use('/api/users', require('./routes/user.routes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

module.exports = app;
