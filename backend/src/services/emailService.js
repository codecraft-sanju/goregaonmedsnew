// src/services/emailService.js
import nodemailer from 'nodemailer';

export function createEmailService(env) {
  const isConfigured = Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
  
  if (env.isProduction && !isConfigured) {
    console.warn('CRITICAL WARNING: SMTP must be configured in production to send OTPs');
  }

  console.log('[emailService] Initializing SMTP with config:', {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    hasUser: !!env.SMTP_USER,
    hasPassword: !!env.SMTP_PASSWORD,
    from: env.SMTP_FROM
  });

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT, 
    secure: env.SMTP_PORT === 465,
    auth: isConfigured ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 30000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
   
    debug: false, 
    logger: false 
  });

  if (isConfigured) {
    console.log('[emailService] Verifying SMTP Connection...');
    transporter.verify(function (error) {
      if (error) {
        console.error('❌ [emailService] SMTP Verification Failed:', error.message);
      } else {
        console.log('✅ [emailService] SMTP Server is ready and authenticated successfully!');
      }
    });
  }

  return {
    async sendOtpEmail(email, otp) {
      if (!isConfigured) {
        console.warn(`[DEV MODE] Email service is NOT configured. OTP: ${otp}`);
        return true; 
      }

      console.log(`[emailService] Preparing to send email to: ${email}`);

      try {
        const info = await transporter.sendMail({
          from: env.SMTP_FROM || env.SMTP_USER,
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
        
        console.log(`✅ [emailService] Email sent successfully to ${email}. MessageId: ${info.messageId}`);
        return true;
      } catch (error) {
        console.error(`❌ [emailService] Failed to send OTP to ${email}:`, error.message);
        throw error;
      }
    },
    
    async close() {
      transporter.close();
    }
  };
}