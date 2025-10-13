const nodemailer = require("nodemailer");

// Configure email transporter (e.g., Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: "gmail", // Replace with your email service (e.g., "hotmail", "yahoo", or custom SMTP)
  auth: {
    user: process.env.EMAIL_USER, // Your email address (set in environment variables)
    pass: process.env.EMAIL_PASS, // Your email password or app-specific password (set in environment variables)
  },
});

// Send email notification
const sendEmail = async ({ to, subject, text }) => {
  try {
    // Validate inputs
    if (!to || !subject || !text) {
      throw new Error("Recipient email, subject, and text are required");
    }

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender address
      to, // Recipient address
      subject, // Subject line
      text, // Plain text body
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = {
  sendEmail,
};