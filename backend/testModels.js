// testModels.js
// Throwaway verification script — NOT part of the actual app.
// Run with: node testModels.js
// Creates one Company -> User -> Debtor -> Charge -> Payment, logs each,
// then cleans up and disconnects. Proves the whole chain actually works,
// not just that the DB connection string is accepted.

const mongoose = require('mongoose');
const connectDB = require('./src/config/db');

const Company = require('./src/models/Company.model');
const User = require('./src/models/User.model');
const Debtor = require('./src/models/Debtor.model');
const Charge = require('./src/models/Charge.model');
const Payment = require('./src/models/Payment.model');

async function run() {
  await connectDB();

  try {
    // 1. Company (owner set after User is created — chicken/egg, so we patch it back)
    const company = await Company.create({
      name: 'Test Store',
      type: 'shop',
      ownerId: new mongoose.Types.ObjectId(), // placeholder, replaced below
    });
    console.log('✅ Company created:', company._id.toString());

    // 2. User (owner), linked to the company
    const owner = await User.create({
      companyId: company._id,
      name: 'Test Owner',
      phone: '+923001234567',
      passwordHash: 'fake-hash-for-testing-only', // real hashing happens in the auth service, not here
      role: 'owner',
    });
    console.log('✅ User created:', owner._id.toString());

    // patch Company.ownerId to point at the real owner we just created
    company.ownerId = owner._id;
    await company.save();
    console.log('✅ Company.ownerId patched to real owner');

    // 3. Debtor, linked to the company
    const debtor = await Debtor.create({
      companyId: company._id,
      name: 'Test Debtor',
      phone: '+923009876543',
      openingBalance: 500,
    });
    console.log('✅ Debtor created:', debtor._id.toString());

    // 4. Charge, linked to company + debtor + recordedBy
    const charge = await Charge.create({
      companyId: company._id,
      debtorId: debtor._id,
      amount: 1000,
      note: 'Test charge - flour bag',
      recordedBy: owner._id,
    });
    console.log('✅ Charge created:', charge._id.toString());

    // 5. Payment, linked to company + debtor + recordedBy
    const payment = await Payment.create({
      companyId: company._id,
      debtorId: debtor._id,
      amount: 300,
      note: 'Test payment',
      recordedBy: owner._id,
    });
    console.log('✅ Payment created:', payment._id.toString());

    // update lastPaymentDate on the debtor, same as the real service layer will do
    debtor.lastPaymentDate = payment.transactionDate;
    await debtor.save();
    console.log('✅ Debtor.lastPaymentDate updated');

    console.log('\n🎉 All 5 models created and linked successfully.\n');

    // --- cleanup so this test doesn't leave junk data behind ---
    await Payment.deleteOne({ _id: payment._id });
    await Charge.deleteOne({ _id: charge._id });
    await Debtor.deleteOne({ _id: debtor._id });
    await User.deleteOne({ _id: owner._id });
    await Company.deleteOne({ _id: company._id });
    console.log('🧹 Test data cleaned up.');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected.');
  }
}

run();