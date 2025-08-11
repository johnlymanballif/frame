import { Resend } from "resend";
import { render } from "@react-email/render";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private static instance: EmailService;

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail({ to, subject, html, from }: EmailOptions): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("📧 Email would be sent:", { to, subject, from });
        console.log("HTML content:", html);
        return true;
      }

      const result = await resend.emails.send({
        from: from || process.env.EMAIL_FROM || "Frame <noreply@frame.app>",
        to: [to],
        subject,
        html,
      });

      console.log("Email sent successfully:", result.data?.id);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  // Magic link email for authentication
  async sendMagicLink(email: string, signInUrl: string): Promise<boolean> {
    const subject = "Sign in to Frame";
    const html = this.generateMagicLinkTemplate(signInUrl);
    
    return this.sendEmail({ to: email, subject, html });
  }

  // Team invitation email
  async sendInvitation(
    email: string, 
    organizationName: string, 
    inviterName: string, 
    inviteUrl: string,
    role: string
  ): Promise<boolean> {
    const subject = `You're invited to join ${organizationName} on Frame`;
    const html = this.generateInvitationTemplate(
      organizationName, 
      inviterName, 
      inviteUrl, 
      role
    );
    
    return this.sendEmail({ to: email, subject, html });
  }

  // Welcome email for new users
  async sendWelcome(email: string, userName: string, organizationName: string): Promise<boolean> {
    const subject = "Welcome to Frame!";
    const html = this.generateWelcomeTemplate(userName, organizationName);
    
    return this.sendEmail({ to: email, subject, html });
  }

  // Password reset email (for future OAuth integrations)
  async sendPasswordReset(email: string, resetUrl: string): Promise<boolean> {
    const subject = "Reset your Frame password";
    const html = this.generatePasswordResetTemplate(resetUrl);
    
    return this.sendEmail({ to: email, subject, html });
  }

  // Project report email
  async sendProjectReport(
    email: string, 
    projectName: string, 
    reportData: any,
    attachmentUrl?: string
  ): Promise<boolean> {
    const subject = `${projectName} - Time Report`;
    const html = this.generateProjectReportTemplate(projectName, reportData, attachmentUrl);
    
    return this.sendEmail({ to: email, subject, html });
  }

  // Magic link email template
  private generateMagicLinkTemplate(signInUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign in to Frame</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
            }
            .logo {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .logo-icon {
              width: 32px;
              height: 32px;
              background: #000;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 16px;
            }
            .button {
              display: inline-block;
              background: #000;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 500;
              margin: 20px 0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <div class="logo-icon">⏱️</div>
              Frame
            </div>
          </div>
          
          <h2>Sign in to Frame</h2>
          
          <p>Click the button below to sign in to your Frame account. This link will expire in 10 minutes.</p>
          
          <div style="text-align: center;">
            <a href="${signInUrl}" class="button">Sign In to Frame</a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666; font-size: 14px;">${signInUrl}</p>
          
          <div class="footer">
            <p>If you didn't request this email, you can safely ignore it.</p>
            <p>This email was sent by Frame Time Tracking.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Team invitation template
  private generateInvitationTemplate(
    organizationName: string, 
    inviterName: string, 
    inviteUrl: string,
    role: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You're invited to ${organizationName}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header { text-align: center; margin-bottom: 30px; }
            .logo {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .logo-icon {
              width: 32px;
              height: 32px;
              background: #000;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 16px;
            }
            .invite-card {
              background: #f8f9ff;
              border: 1px solid #e1e6ff;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              background: #000;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 500;
              margin: 20px 0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <div class="logo-icon">⏱️</div>
              Frame
            </div>
          </div>
          
          <h2>You're invited to join ${organizationName}!</h2>
          
          <p><strong>${inviterName}</strong> has invited you to join their team on Frame for time tracking and project management.</p>
          
          <div class="invite-card">
            <h3>🏢 ${organizationName}</h3>
            <p><strong>Your role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
            <p><strong>Invited by:</strong> ${inviterName}</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </div>
          
          <p><strong>What is Frame?</strong><br>
          Frame is a modern time tracking and project management tool designed for creative teams. Track time, manage resources, and monitor project profitability all in one place.</p>
          
          <p>If the button doesn't work, copy and paste this link: <br>
          <span style="word-break: break-all; color: #666; font-size: 14px;">${inviteUrl}</span></p>
          
          <div class="footer">
            <p>This invitation will expire in 7 days.</p>
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `;
  }

  // Welcome email template
  private generateWelcomeTemplate(userName: string, organizationName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Frame</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header { text-align: center; margin-bottom: 30px; }
            .logo {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .logo-icon {
              width: 32px;
              height: 32px;
              background: #000;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 16px;
            }
            .feature-list {
              background: #f8f9ff;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .feature-list h3 { margin-top: 0; }
            .feature-list ul { margin: 0; padding-left: 20px; }
            .feature-list li { margin-bottom: 8px; }
            .button {
              display: inline-block;
              background: #000;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 500;
              margin: 20px 0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <div class="logo-icon">⏱️</div>
              Frame
            </div>
          </div>
          
          <h2>Welcome to Frame, ${userName}! 🎉</h2>
          
          <p>You've successfully joined <strong>${organizationName}</strong> on Frame. Here's what you can do now:</p>
          
          <div class="feature-list">
            <h3>✨ Get started with Frame:</h3>
            <ul>
              <li><strong>Start tracking time:</strong> Use the timer or natural language input like "2h on design work"</li>
              <li><strong>View your dashboard:</strong> See today's time entries and weekly summaries</li>
              <li><strong>Browse projects:</strong> Explore the projects you have access to</li>
              <li><strong>Check team planning:</strong> See resource allocation and capacity (if you're a manager)</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXTAUTH_URL}/track" class="button">Start Tracking Time</a>
          </div>
          
          <p>Need help getting started? Check out our quick start guide or reach out to your team administrator.</p>
          
          <div class="footer">
            <p>Happy tracking!</p>
            <p>The Frame Team</p>
          </div>
        </body>
      </html>
    `;
  }

  // Password reset template (for future use)
  private generatePasswordResetTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your Frame password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-flex; align-items: center; gap: 8px; font-size: 24px; font-weight: bold; margin-bottom: 20px;">
              <div style="width: 32px; height: 32px; background: #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">⏱️</div>
              Frame
            </div>
          </div>
          
          <h2>Reset your password</h2>
          
          <p>Click the button below to reset your Frame password. This link will expire in 1 hour.</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 20px 0;">Reset Password</a>
          </div>
          
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </body>
      </html>
    `;
  }

  // Project report template
  private generateProjectReportTemplate(
    projectName: string, 
    reportData: any, 
    attachmentUrl?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${projectName} Report</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-flex; align-items: center; gap: 8px; font-size: 24px; font-weight: bold; margin-bottom: 20px;">
              <div style="width: 32px; height: 32px; background: #000; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">⏱️</div>
              Frame
            </div>
          </div>
          
          <h2>📊 ${projectName} Time Report</h2>
          
          <p>Here's your time tracking report for <strong>${projectName}</strong>:</p>
          
          <div style="background: #f8f9ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3>📈 Summary</h3>
            <p><strong>Total Hours:</strong> ${reportData.totalHours || 'N/A'}</p>
            <p><strong>Team Members:</strong> ${reportData.teamMembers || 'N/A'}</p>
            <p><strong>Date Range:</strong> ${reportData.dateRange || 'N/A'}</p>
          </div>
          
          ${attachmentUrl ? `
          <div style="text-align: center;">
            <a href="${attachmentUrl}" style="display: inline-block; background: #000; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 20px 0;">Download Full Report</a>
          </div>
          ` : ''}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666;">
            <p>Generated by Frame Time Tracking</p>
          </div>
        </body>
      </html>
    `;
  }
}

export const emailService = EmailService.getInstance();