import { Resend } from 'resend';

// Load from env or use a dummy for now
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_123');

interface EmailParams {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, from, replyTo, subject, html }: EmailParams) => {
  try {
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_dummy_123') {
      throw new Error('CONFIG_ERROR: RESEND_API_KEY is missing from Render Environment Variables.');
    }

    const { data, error } = await resend.emails.send({
      from,
      to,
      replyTo,
      subject,
      html,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Email Dispatch Error:', err);
    return { success: false, error: err };
  }
};

/**
 * Generates a professional HTML template for a Purchase Order dispatch.
 */
export const generatePOHtml = (order: any, creatorName: string) => {
  const itemsHtml = order.items.map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.product?.name || 'Item'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.unitPrice.toLocaleString('en-IN')}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${(item.quantity * item.unitPrice).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #2563eb; color: white; padding: 24px;">
        <h2 style="margin: 0;">New Purchase Order</h2>
        <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 14px;">PO Reference: ${order.id.slice(0, 8).toUpperCase()}</p>
      </div>
      <div style="padding: 24px;">
        <p>Dear <strong>${order.vendor?.name || 'Supply Partner'}</strong>,</p>
        <p>A new purchase order has been generated and approved. Please find the details below:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Item</th>
              <th style="padding: 12px; text-align: center; font-size: 12px; text-transform: uppercase; color: #64748b;">Qty</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b;">Price</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Grand Total</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #2563eb;">₹${order.totalAmount.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 32px; padding-top: 20px; border-t: 1px solid #eee; font-size: 14px; color: #64748b;">
          <p>Requested By: <strong>${creatorName}</strong></p>
          <p>Please acknowledge this receipt and proceed with dispatch. You can reply directly to this email for any clarifications.</p>
        </div>
      </div>
      <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        This is an automated request from the Globuz ERP System.
      </div>
    </div>
  `;
};
