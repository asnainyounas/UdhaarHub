const normalizePhone = (rawPhone) => {
  let phone = rawPhone.trim();

  if (phone.startsWith('0')) {
    phone = '+92' + phone.slice(1);
  } else if (phone.startsWith('+')) {
    // Already has country code, leave as is
  } else {
    phone = '+92' + phone;
  }

  return phone;
};

module.exports = { normalizePhone };
