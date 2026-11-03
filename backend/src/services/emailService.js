// src/services/emailService.js
import nodemailer from 'nodemailer';

export function createEmailService(env) {
  const isConfigured = Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
  
  if (env.isProduction && !isConfigured) {
    console.warn('CRITICAL WARNING: SMTP must be configured in production to send OTPs');
  }

  // --- DEBUGGING LOG 1: Check what environment variables are actually loaded ---
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
    
    connectionTimeout: 30000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
    debug: true, // --- DEBUGGING LOG 2: Enable nodemailer raw debug logs ---
    logger: true // Enable internal logger
  });

  // --- DEBUGGING LOG 3: Startup Connection Test ---
  if (isConfigured) {
    console.log('[emailService] Verifying SMTP Connection...');
    transporter.verify(function (error, success) {
      if (error) {
        console.error('❌ [emailService] SMTP Verification Failed:', error);
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
          from: env.SMTP_FROM || env.SMTP_USER, // fallback to user if FROM is missing
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
        // --- DEBUGGING LOG 4: Detailed Catch Log ---
        console.error(`❌ [emailService] Failed to send OTP to ${email}`);
        console.error(`[emailService] Error Code:`, error.code);
        console.error(`[emailService] Error Command:`, error.command);
        console.error(`[emailService] Full Error Details:`, error);
        throw error; // Rethrow to let the controller handle it
      }
    },
    
    async close() {
       transporter.close();
    }
  };
}