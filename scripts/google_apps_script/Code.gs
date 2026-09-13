/** Deploy as a web app: execute as Me, access Anyone. The signature protects it.
 * Set BRIDGE_SECRET (32+ random characters) in Project Settings > Script Properties.
 * Deploy from customercareprashasti@gmail.com. Never paste credentials into source.
 */
function doPost(event) {
  const json = value => ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
  const lock = LockService.getScriptLock();
  try {
    if (!event.postData || event.postData.contents.length > 150000) throw new Error('invalid');
    const request = JSON.parse(event.postData.contents);
    const properties = PropertiesService.getScriptProperties();
    const secret = properties.getProperty('BRIDGE_SECRET');
    if (!secret || secret.length < 32 || typeof request.payload !== 'string') throw new Error('invalid');
    const expected = Utilities.computeHmacSha256Signature(request.payload, secret).map(b => (b & 255).toString(16).padStart(2, '0')).join('');
    if (typeof request.signature !== 'string' || request.signature.length !== expected.length) throw new Error('invalid');
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ request.signature.charCodeAt(i);
    if (difference) throw new Error('invalid');
    const data = JSON.parse(request.payload);
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isInteger(data.timestamp) || Math.abs(now - data.timestamp) > 120 || !/^[A-Za-z0-9_-]{20,64}$/.test(data.nonce)) throw new Error('invalid');
    lock.waitLock(10000);
    const nonceKey = 'nonce:' + data.nonce;
    if (properties.getProperty(nonceKey)) throw new Error('duplicate');
    const all = properties.getProperties();
    Object.keys(all).filter(key => key.startsWith('nonce:') && Number(all[key]) < now - 240).forEach(key => properties.deleteProperty(key));
    properties.setProperty(nonceKey, String(now));
    if (data.kind === 'email') {
      const sender = Session.getEffectiveUser().getEmail().toLowerCase();
      if (String(data.sender).toLowerCase() !== sender || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(data.to)) throw new Error('invalid');
      if (typeof data.subject !== 'string' || data.subject.length > 180 || /[\r\n]/.test(data.subject) || typeof data.body !== 'string' || data.body.length > 12000) throw new Error('invalid');
      if (MailApp.getRemainingDailyQuota() < 1) throw new Error('quota');
      MailApp.sendEmail({to: data.to, subject: data.subject, body: data.body, name: 'SchemeSaathi Support'});
      return json({ok: true});
    }
    if (data.kind === 'translate') {
      const languages = ['en', 'hi', 'mr', 'gu', 'ta', 'te', 'bn', 'kn'];
      if (!languages.includes(data.source) || !languages.includes(data.target) || !Array.isArray(data.texts) || data.texts.length > 100 || !data.texts.every(text => typeof text === 'string' && text.length <= 30000)) throw new Error('invalid');
      const translations = data.texts.map(text => LanguageApp.translate(text, data.source, data.target));
      return json({ok: true, translations});
    }
    throw new Error('invalid');
  } catch (error) {
    // No message contents, recipient addresses, OTPs, signatures or secret are logged.
    return json({ok: false});
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
