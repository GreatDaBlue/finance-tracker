import nodemailer from 'nodemailer';

export interface SendOtpResult {
  success: boolean;
  simulated?: boolean;
  simulatedOtp?: string;
  error?: string;
}

/**
 * Cấu hình Transporter gửi email
 * Hỗ trợ Gmail SMTP với Mật khẩu ứng dụng (Google App Password)
 */
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

/**
 * Gửi mã OTP khôi phục mật khẩu về địa chỉ Gmail của người dùng
 */
export async function sendPasswordResetOtp(
  toEmail: string,
  otp: string,
  username: string
): Promise<SendOtpResult> {
  const transporter = getTransporter();

  // Nếu chưa cấu hình SMTP trong .env (chế độ phát triển / thử nghiệm)
  if (!transporter) {
    console.log('\n================================================================');
    console.log('📧 [THÔNG BÁO MAILER - CHẾ ĐỘ THỬ NGHIỆM]');
    console.log(`Chưa thiết lập SMTP_USER / SMTP_PASS trong file .env.`);
    console.log(`Tài khoản : ${username}`);
    console.log(`Gửi tới   : ${toEmail}`);
    console.log(`MÃ OTP    : 👉 [ ${otp} ] 👈 (Hiệu lực: 15 phút)`);
    console.log('================================================================\n');

    return {
      success: true,
      simulated: true,
      simulatedOtp: otp
    };
  }

  const fromEmail = process.env.SMTP_FROM || `"Tiền Đâu Rồi?" <${process.env.SMTP_USER}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 8px 0 0; font-size: 13px; opacity: 0.9; }
        .body { padding: 32px 24px; }
        .greeting { font-size: 15px; margin-bottom: 16px; }
        .otp-box { background: #f1f5f9; border: 2px dashed #93c5fd; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: monospace, 'Courier New'; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8; }
        .expire-text { font-size: 12px; color: #64748b; margin-top: 8px; }
        .note { font-size: 12px; line-height: 1.6; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🐼 Tiền Đâu Rồi?</h1>
          <p>Yêu cầu lấy lại mật khẩu tài khoản</p>
        </div>
        <div class="body">
          <p class="greeting">Xin chào <strong>${username}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Chúng tôi nhận được yêu cầu lấy lại mật khẩu cho tài khoản <strong>${username}</strong> trên ứng dụng <em>Tiền Đâu Rồi?</em>.
          </p>
          <div class="otp-box">
            <div style="font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Mã xác thực của bạn</div>
            <div class="otp-code">${otp}</div>
            <div class="expire-text">⏱️ Mã có hiệu lực trong <strong>15 phút</strong></div>
          </div>
          <div class="note">
            <p style="margin: 0 0 6px;">🔒 <strong>Lưu ý bảo mật:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</li>
              <li>Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này hoặc đăng nhập để kiểm tra tài khoản.</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          Ứng dụng Quản lý Thu Chi & Tài Chính Cá Nhân "Tiền Đâu Rồi?"<br>
          Thiết kế &amp; phát triển bởi Hoàng
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: `[Tiền Đâu Rồi?] Mã xác thực lấy lại mật khẩu: ${otp}`,
      text: `Xin chào ${username},\n\nMã xác thực lấy lại mật khẩu của bạn là: ${otp}\nMã này có hiệu lực trong vòng 15 phút.\n\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
      html: htmlContent
    });

    return { success: true, simulated: false };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi gửi email';
    console.error('[MAILER ERROR]', errorMsg);
    return { success: false, error: errorMsg };
  }
}
