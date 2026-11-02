//src/services/emailService.js
import nodemailer from 'nodemailer';
import { Queue, Worker } from 'bullmq';
import { redisQueueClient, createWorkerConnection } from '../config/redis.js'; 

export function createEmailQueue(env) {
  const isConfigured = Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
  if (env.isProduction && !isConfigured) {
    throw new Error('CRITICAL: SMTP must be configured in production to send OTPs');
  }

  const emailQueue = new Queue('emailQueue', { connection: redisQueueClient });
  
  return {
    // async sendOtpEmail(email, otp) {
    //   if (!isConfigured) {
    //     console.warn(`[DEV MODE] Email service is NOT configured. OTP: ${otp}`);
    //     return; 
    //   }
    
    //   await emailQueue.add('send-otp', { email, otp }, { 
    //     attempts: 3, 
    //     backoff: { type: 'exponential', delay: 2000 }
    //   });
    //   return true;
    // },
    async sendOtpEmail(email, otp) {
      if (!isConfigured) {
        console.warn(`[DEV MODE] Email service is NOT configured. OTP: ${otp}`);
        return; 
      }
    
      await emailQueue.add('send-otp', { email, otp }, { 
        attempts: 3, 
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 100
      });
      return true;
    },
    
    async close() {
      await emailQueue.close();
    }
  };
}

export function createEmailWorker(env) {
  const isConfigured = Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
  
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: isConfigured ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined
  });

  const workerConnection = createWorkerConnection();
  
  const emailWorker = new Worker('emailQueue', async (job) => {
    const { email, otp } = job.data;
    
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
  }, { connection: workerConnection });

  emailWorker.on('failed', (job, err) => {
    console.error(`[email-worker] Job ${job.id} failed for ${job.data.email}: ${err.message}`);
  });

  return {
    async close() {
      await emailWorker.close();
      await workerConnection.quit(); 
    }
  };
}