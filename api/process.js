module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, demo } = req.body;
  const licenseKey = req.headers['x-license-key'];

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Demo mode - limited functionality
  const isDemo = demo === true;

  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const formatValid = emailRegex.test(email);

  // Extract domain
  const domain = email.split('@')[1]?.toLowerCase();

  // Disposable email domains (subset for demo)
  const disposableDomains = [
    '10minutemail.com', 'tempmail.com', 'guerrillamail.com', 'throwawaymail.com',
    'mailinator.com', 'yopmail.com', 'temp-mail.org', 'fakeemail.com',
    'sharklasers.com', 'getairmail.com', 'burnermail.io', 'tempmailaddress.com',
    'mailnesia.com', 'tempinbox.com', 'jetable.org', 'mailcatch.com',
    'spamgourmet.com', 'trashmail.com', 'mytrashmail.com', 'mailforspam.com'
  ];

  // Role-based prefixes
  const rolePrefixes = [
    'admin', 'support', 'info', 'sales', 'contact', 'help', 'noreply',
    'no-reply', 'webmaster', 'postmaster', 'hostmaster', 'abuse', 'marketing',
    'billing', 'team', 'hello', 'office', 'service', 'tech', 'feedback'
  ];

  const prefix = email.split('@')[0]?.toLowerCase();
  const isRole = rolePrefixes.some(role => prefix === role || prefix?.startsWith(role + '.'));
  const isDisposable = disposableDomains.includes(domain);

  // Calculate deliverability score
  let score = 100;

  if (!formatValid) score = 0;
  else {
    if (isDisposable) score -= 40;
    if (isRole) score -= 20;
    if (domain && (domain.includes('temp') || domain.includes('disposable'))) score -= 30;
    if (prefix && (prefix.includes('test') || prefix.includes('fake'))) score -= 50;
  }

  score = Math.max(0, score);

  // License check (simplified - in production would verify against database)
  const validLicense = licenseKey && licenseKey.startsWith('EVP-');

  // For demo or valid license, return full results
  if (isDemo || validLicense) {
    return res.status(200).json({
      email,
      valid: formatValid && !isDisposable && score >= 50,
      score,
      checks: {
        format: formatValid,
        mx: formatValid, // Simplified - would check actual MX records
        disposable: isDisposable,
        role: isRole,
        free: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain)
      },
      domain: domain || null,
      ...(validLicense && { license: 'valid', remaining: 9999 })
    });
  }

  // No valid license
  return res.status(401).json({
    error: 'Valid license key required',
    checkout_url: process.env.CHECKOUT_URL || null
  });
};
