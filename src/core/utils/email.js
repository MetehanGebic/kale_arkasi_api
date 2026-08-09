import nodemailer from 'nodemailer';
let transporter = null;
const initTransporter = async () => {
  if (transporter) return transporter;
  // Eğer gerçek bir SMTP yapılandırılmamışsa veya Ethereal varsayılan bilgileriyse test hesabı aç
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'ethereal.user') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Email] Ethereal test hesabı oluşturuldu: ${testAccount.user}`);
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};
/**
 * E-posta göndermek için genel yardımcı fonksiyon
 * @param {Object} options - { to, subject, text, html }
 */
export const sendEmail = async (options) => {
  const t = await initTransporter();
  const mailOptions = {
    from: '"Skorla!" <noreply@skorla.com>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };
  const info = await t.sendMail(mailOptions);
  
  // Ethereal mail ile test ediyorsak tarayıcıda görmek için linki konsola basıyoruz.
  if (info.messageId && (!process.env.SMTP_USER || process.env.SMTP_USER === 'ethereal.user')) {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
};