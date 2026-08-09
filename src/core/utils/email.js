import nodemailer from 'nodemailer';

// E-posta gönderimi için taşıyıcıyı oluşturuyoruz.
// Projede test amaçlı Ethereal Mail veya basit SMTP bilgileri .env üzerinden çekilir.
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * E-posta göndermek için genel yardımcı fonksiyon
 * @param {Object} options - { to, subject, text, html }
 */
export const sendEmail = async (options) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: '"Kale Arkası" <noreply@kalearkasi.com>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  const info = await transporter.sendMail(mailOptions);
  
  // Ethereal mail ile test ediyorsak tarayıcıda görmek için linki konsola basıyoruz.
  if (process.env.SMTP_HOST?.includes('ethereal')) {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
  
  return info;
};
