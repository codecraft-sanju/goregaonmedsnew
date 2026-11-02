// src/services/invoiceService.js
import PDFDocument from 'pdfkit';
import { Queue, Worker } from 'bullmq';
import { Order } from '../models/Order.js';
import { uploadPDFBuffer } from './cloudinaryService.js';
import { redisQueueClient, createWorkerConnection } from '../config/redis.js';
import { formatLocalDateOnly } from '../utils/date.js';


function generatePDFBuffer(order) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
    doc.fontSize(20).font('Helvetica-Bold').text('GoregaonMeds', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Sheetal Krupa Building, Aarey Road, Goregaon East, Mumbai', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center', underline: true });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica');
    doc.text(`Order ID: ${order.orderId}`);
  doc.text(`Date: ${formatLocalDateOnly(order.billedAt || order.createdAt)}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Billed To:');
    doc.font('Helvetica').text(order.customerName);
    doc.text(`Mobile: +91 ${order.mobileNumber}`);
    if (order.address) {
      doc.text(`Address: ${order.address.flat}, ${order.address.area}, ${order.address.landmark || ''}`);
    }
    doc.moveDown();
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Item', 50, tableTop);
    doc.text('Qty', 350, tableTop);
    doc.text('Price (Rs)', 400, tableTop);
    doc.text('Total (Rs)', 480, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    let y = tableTop + 25;
    doc.font('Helvetica');
    function checkPageBreak(requiredHeight) {
      if (y + requiredHeight > 750) { 
        doc.addPage();
        y = 50; 
      }
    }
    if (order.medicines && order.medicines.length > 0) {
      order.medicines.forEach((med) => {
        if (!med.isAvailable) return;
        const price = Number(med.price || 0);
        const qty = Number(med.quantity || 1); // Ensure qty is defined for total calculation
        const total = price * qty;
        const textHeight = Math.max(doc.heightOfString(med.name, { width: 280 }), 15);
        checkPageBreak(textHeight);
        doc.text(med.name, 50, y, { width: 280 });
        doc.text(med.quantity, 350, y);
        doc.text(price.toFixed(2), 400, y);
        doc.text(total.toFixed(2), 480, y);
        y += textHeight + 8; 
      });
    }
    if (order.products && order.products.length > 0) {
      order.products.forEach((prod) => {
        const price = Number(prod.price || 0);
        const qty = Number(prod.quantity || 1);
        const total = price * qty;
        const textHeight = Math.max(doc.heightOfString(prod.name, { width: 280 }), 15);
        checkPageBreak(textHeight);
        doc.text(prod.name, 50, y, { width: 280 });
        doc.text(qty.toString(), 350, y);
        doc.text(price.toFixed(2), 400, y);
        doc.text(total.toFixed(2), 480, y);
        y += textHeight + 8;
      });
    }
    doc.moveTo(50, y).lineTo(550, y).stroke();
    y += 10;
    checkPageBreak(150); 
    doc.font('Helvetica');
    doc.text('Medicine Subtotal:', 350, y);
    doc.text(Number(order.medicineSubtotal).toFixed(2), 480, y);
    y += 15;
    doc.text('Other Items Subtotal:', 350, y);
    doc.text(Number(order.nonMedicineSubtotal).toFixed(2), 480, y);
    y += 15;
    doc.text('Delivery Charge:', 350, y);
    doc.text(Number(order.deliveryCharge).toFixed(2), 480, y);
    y += 15;
    if (order.discount > 0) {
      doc.fillColor('green');
      doc.text('Discount:', 350, y);
      doc.text(`- ${Number(order.discount).toFixed(2)}`, 480, y);
      doc.fillColor('black');
      y += 15;
    }
    doc.moveTo(350, y).lineTo(550, y).stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Final Amount:', 350, y);
    doc.text(`Rs ${Number(order.finalAmount).toFixed(2)}`, 480, y);
    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica').text('Thank you for choosing GoregaonMeds!', { align: 'center' });
    doc.text('This is a computer-generated invoice and does not require a physical signature.', { align: 'center', color: 'grey' });
    doc.end();
  });
}


// export function createInvoiceQueue(env) {
//   const invoiceQueue = new Queue('invoiceQueue', { connection: redisQueueClient });

//   return {
//     async requestInvoiceGeneration(orderId) {
//       await invoiceQueue.add('generate-invoice', { orderId }, {
//         attempts: 3,
//         backoff: { type: 'exponential', delay: 2000 }
//       });
//     },
//     async close() {
//       await invoiceQueue.close();
//     }
//   };
// }


// export function createInvoiceQueue(env) {
//   const invoiceQueue = new Queue('invoiceQueue', { connection: redisQueueClient });

//   return {
//     async requestInvoiceGeneration(orderId) {
//       await invoiceQueue.add('generate-invoice', { orderId }, {
//         jobId: `inv_${orderId}`, 
//         attempts: 3,
//         backoff: { type: 'exponential', delay: 2000 },
//         removeOnComplete: true, 
//         removeOnFail: 50 
//       });
//     },
//     async close() {
//       await invoiceQueue.close();
//     }
//   };
// }

export function createInvoiceQueue(env) {
  const invoiceQueue = new Queue('invoiceQueue', { connection: redisQueueClient });

  return {
    async requestInvoiceGeneration(orderId, billingVersion) {
      await invoiceQueue.add('generate-invoice', { orderId, billingVersion }, {
        jobId: `inv_${orderId}_v${billingVersion}`, // Unique job per version
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true, 
        removeOnFail: 50 
      });
    },
    async close() {
      await invoiceQueue.close();
    }
  };
}


export function createInvoiceWorker(env, logger = console) {
  const workerConnection = createWorkerConnection();

  const invoiceWorker = new Worker('invoiceQueue', async (job) => {
 const { orderId, billingVersion } = job.data;
   
    const order = await Order.findOne({ orderId }).lean();
    if (!order || !order.billedAt) throw new Error('Order not billed yet');

    const cloudinaryConfig = {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
      folder: env.CLOUDINARY_UPLOAD_FOLDER,
    };

    const pdfBuffer = await generatePDFBuffer(order);
    const secureUrl = await uploadPDFBuffer(pdfBuffer, orderId, cloudinaryConfig);
    
  //   await Order.updateOne({ orderId }, { $set: { invoiceUrl: secureUrl } });
  //   logger.info(`[invoice] Generated & Uploaded Invoice for ${orderId}`);
  // }, { connection: workerConnection });
  await Order.updateOne(
      { orderId, billingVersion }, 
      { $set: { invoiceUrl: secureUrl } }
    );
    logger.info(`[invoice] Generated & Uploaded Invoice for ${orderId} v${billingVersion}`);
  }, { connection: workerConnection });

  invoiceWorker.on('failed', (job, err) => {
    logger.error(`[invoice-worker] Job ${job.id} failed: ${err.message}`);
  });

  return {
    async close() {
      await invoiceWorker.close();
      await workerConnection.quit();
    }
  };
}