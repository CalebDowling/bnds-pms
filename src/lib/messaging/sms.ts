/**
 * SMS service using Twilio REST API via fetch
 * No external packages needed - uses native fetch
 * Falls back to console logging in dev mode if Twilio config not provided
 */

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const isDev = !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber;

/**
 * Send an SMS via Twilio
 * In dev mode (no Twilio config), logs to console
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate phone number format
    const cleanNumber = to.replace(/\D/g, "");
    if (cleanNumber.length < 10) {
      return { success: false, error: "Invalid phone number format" };
    }

    if (isDev) {
      console.log("📱 [DEV MODE] SMS would be sent:");
      console.log(`  To: ${to}`);
      console.log(`  Message: ${message}`);
      return { success: true, messageId: "dev-mode" };
    }

    // Build the request body for Twilio API
    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", twilioPhoneNumber!);
    formData.append("Body", message);

    // Create basic auth header
    const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString(
      "base64"
    );

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMsg =
        errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error(`Failed to send SMS to ${to}:`, errorMsg);
      return { success: false, error: errorMsg };
    }

    const data = await response.json();
    return { success: true, messageId: data.sid };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Failed to send SMS to ${to}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}
