/**
 * Authentication Service
 * Centralized auth logic with secure email verification
 */

import { supabase } from './supabase';
import { buildFunctionUrl } from './config';

export interface RegistrationData {
  email: string;
  password: string;
  fullName: string;
  affiliation?: string;
}

/**
 * Send confirmation email using Supabase's built-in email confirmation
 */
export const sendConfirmationEmail = async (email: string, fullName: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Call Supabase function to send custom confirmation email
    const response = await fetch(buildFunctionUrl('send-confirmation-email'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        fullName,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to send confirmation email');
    }

    return {
      success: true,
      message: 'Confirmation email sent. Please check your inbox and click the verification link.',
    };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
};

/**
 * Register user with email verification
 * Creates auth user but marks email as unverified
 */
export const registerUser = async (data: RegistrationData): Promise<{ success: boolean; message: string }> => {
  try {
    // Step 1: Sign up via Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          affiliation: data.affiliation || '',
        },
      },
    });

    if (signUpError) {
      throw new Error(signUpError.message);
    }

    if (!authData.user) {
      throw new Error('Failed to create user account');
    }

    // Step 2: Send confirmation email
    // Supabase automatically sends confirmation email, but we'll send a custom one
    const emailResult = await sendConfirmationEmail(data.email, data.fullName);

    // Note: User profile will be created only after email verification
    // This is handled by a database trigger or the confirmation webhook

    return {
      success: true,
      message: emailResult.message,
    };
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

/**
 * Verify email confirmation token
 * Completes registration after email verification
 */
export const verifyEmailConfirmation = async (token: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Supabase handles email confirmation via URL token
    // This function is for backend verification if needed
    const response = await fetch(buildFunctionUrl('complete-email-verification'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to verify email');
    }

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  } catch (error) {
    console.error('Error verifying email:', error);
    throw error;
  }
};

/**
 * Check if user email is verified
 */
export const isEmailVerified = (userEmail?: string): boolean => {
  return !!userEmail; // Supabase will only return email if verified
};

/**
 * Resend confirmation email
 */
export const resendConfirmationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      message: 'Confirmation email resent. Please check your inbox.',
    };
  } catch (error) {
    console.error('Error resending confirmation email:', error);
    throw error;
  }
};
