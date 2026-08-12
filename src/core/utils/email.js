import nodemailer from 'nodemailer';
let transporter = null;
const initTransporter = async () => {
  if (transporter) return transporter;
  
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
 * @param {Object} options
 */
export const sendEmail = async (options) => {
  const t = await initTransporter();
  const mailOptions = {
    from: `"Skorla!" <${process.env.SMTP_USER || 'noreply@skorla.com'}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };
  const info = await t.sendMail(mailOptions);
  
  if (info.messageId && (!process.env.SMTP_USER || process.env.SMTP_USER === 'ethereal.user')) {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
  
  return info;
};