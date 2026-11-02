// src/services/emailService.js
import nodemailer from 'nodemailer';

export function createEmailService(env) {
  const isConfigured = Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
  
  if (env.isProduction && !isConfigured) {
    console.warn('CRITICAL WARNING: SMTP must be configured in production to send OTPs');
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT, 
    secure: env.SMTP_PORT === 465,
    auth: isConfigured ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
   
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  return {
    async sendOtpEmail(email, otp) {
      if (!isConfigured) {
        console.warn(`[DEV MODE] Email service is NOT configured. OTP: ${otp}`);
        return true; 
      }

      try {
        await transporter.sendMail({
          from: env.SMTP_FROM,
          to: email,
          subject: 'GoregaonMeds - Your Login OTP',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>GoregaonMeds Login</h2>
              <p>Your One-Time Password (OTP) for login is:</p>
              <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
              <p>This OTP is valid for 5 minutes. Do not share it with anyone.</p>
            </div>
          `
        });
        return true;
      } catch (error) {
        console.error(`[emailService] Failed to send OTP to ${email}:`, error.message);
        throw error; // Rethrow to let the controller handle it
      }
    },
    
    async close() {
       transporter.close();
    }
  };
}