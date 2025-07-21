import { supabase } from '@/integrations/supabase/client';

/**
 * Send an email notification using Supabase Edge Functions
 * @param to Recipient email address
 * @param subject Email subject
 * @param body Email body (HTML format)
 * @returns Promise with the result of the email sending operation
 */
export const sendEmail = async (to: string, subject: string, body: string) => {
  try {
    // Call the Supabase Edge Function for sending emails
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, body }
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Exception sending email:', err);
    return { success: false, error: err };
  }
};

/**
 * Send a team invitation email
 * @param to Recipient email address
 * @param teamName Name of the team
 * @param captainName Name of the team captain
 * @returns Promise with the result of the email sending operation
 */
export const sendTeamInvitationEmail = async (to: string, teamName: string, captainName: string) => {
  const subject = `You've been invited to join ${teamName} on Padel League Ace`;
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #FB8500; padding: 20px; text-align: center; color: white;">
        <h1>Padel League Ace</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <h2>Team Invitation</h2>
        <p>Hello,</p>
        <p>${captainName} has invited you to join their padel team "${teamName}" on Padel League Ace.</p>
        <p>To accept this invitation, please sign in to your account or create a new account if you don't have one yet.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${window.location.origin}/teams" style="background-color: #FB8500; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Invitation
          </a>
        </div>
        <p>If you don't have an account yet, you can create one at <a href="${window.location.origin}">${window.location.origin}</a>.</p>
        <p>Once you've signed in, you'll see the invitation on your Teams page.</p>
        <p>Happy playing!</p>
        <p>The Padel League Ace Team</p>
      </div>
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
  `;
  
  return sendEmail(to, subject, body);
};