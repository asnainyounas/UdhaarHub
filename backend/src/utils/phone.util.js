const normalizePhone = (rawPhone) => {
  if (typeof rawPhone !== 'string') return '';

  let phone = rawPhone.trim();

  if (phone.startsWith('0')) {
    phone = '+92' + phone.slice(1);
  } else if (!phone.startsWith('+')) {
    phone = '+92' + phone;
  }

  return phone;
};

module.exports = { normalizePhone };