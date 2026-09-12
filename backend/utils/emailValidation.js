const dns = require('dns').promises;
const { validate } = require('deep-email-validator');

// Често срещани временни/фалшиви домейни
const BLOCKED_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'yopmail.com',
  'trashmail.com',
  'fakeinbox.com',
  'sharklasers.com',
  'getnada.com',
  'emailondeck.com',
]);

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function getDomain(email) {
  return String(email).split('@')[1]?.toLowerCase() || '';
}

async function hasMxRecords(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}

/**
 * Проверява дали имейлът изглежда реален:
 * - правилен формат
 * - не е временен/фалшив домейн
 * - домейнът има MX записи (може да приема поща)
 * - допълнителна проверка чрез deep-email-validator (вкл. SMTP, когато е възможно)
 */
async function assertRealEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();

  if (!normalized || !EMAIL_REGEX.test(normalized)) {
    const error = new Error('Моля, въведи валиден имейл адрес (пример: name@gmail.com).');
    error.status = 400;
    throw error;
  }

  const domain = getDomain(normalized);
  if (!domain || !domain.includes('.')) {
    const error = new Error('Имейлът трябва да е с реален домейн (например gmail.com).');
    error.status = 400;
    throw error;
  }

  if (BLOCKED_DOMAINS.has(domain)) {
    const error = new Error('Временни/фалшиви имейли не са позволени. Ползвай личен имейл.');
    error.status = 400;
    throw error;
  }

  const mxOk = await hasMxRecords(domain);
  if (!mxOk) {
    const error = new Error(
      'Този домейн не приема имейли (няма MX записи). Ползвай реален имейл адрес.'
    );
    error.status = 400;
    throw error;
  }

  const result = await validate({
    email: normalized,
    sender: normalized,
    validateRegex: true,
    validateMx: true,
    validateTypo: true,
    validateDisposable: true,
    validateSMTP: true,
  });

  if (!result.valid) {
    const reason = result.reason || '';
    let message = 'Този имейл не може да се ползва. Въведи реален, съществуващ адрес.';

    if (reason === 'typo') {
      message = 'Имейлът изглежда сгрешен. Провери изписването.';
    } else if (reason === 'disposable') {
      message = 'Временни имейли не са позволени.';
    } else if (reason === 'mx' || reason === 'smtp') {
      message =
        'Този имейл изглежда не съществува или домейнът не приема поща. Ползвай реален адрес.';
    }

    const error = new Error(message);
    error.status = 400;
    throw error;
  }

  return normalized;
}

module.exports = { assertRealEmail };
