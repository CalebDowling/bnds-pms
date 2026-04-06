# Integrations Settings Page

## Overview

This page provides a centralized interface for managing all external service integrations for the pharmacy system. It displays the status of 7 integrations and allows pharmacists/admins to test connections.

## File Structure

```
integrations/
├── page.tsx          # Server component (SSR, force-dynamic)
├── client.tsx        # Client component (handles UI state & interactions)
├── actions.ts        # Server actions (env checks, connection tests)
└── README.md         # This file
```

## Architecture

### Server-Side (page.tsx + actions.ts)

- **page.tsx**: Entry point, renders Suspense boundary, calls actions
- **actions.ts**: "use server" functions for:
  - Environment variable checking
  - API connection testing
  - Integration configuration retrieval

### Client-Side (client.tsx)

- Receives initial integration statuses from server
- Handles test connection button clicks
- Updates UI state optimistically
- Shows toast notifications for feedback
- No direct env var access (security)

## Adding a New Integration

### Step 1: Add to Integration List

In `actions.ts`, add to the `getIntegrationStatuses()` function:

```typescript
{
  name: "New Service",
  description: "What it does",
  icon: "icon-name",
  configured: !!process.env.NEW_SERVICE_API_KEY,
  status: process.env.NEW_SERVICE_API_KEY ? "configured" : "planned",
},
```

### Step 2: Add Icon (if needed)

In `client.tsx`, add SVG to `IntegrationIcon` mapping:

```typescript
"new-service": (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {/* SVG path */}
  </svg>
),
```

### Step 3: Add Test Support (optional)

In `actions.ts`, add case to `testIntegration()`:

```typescript
case "New Service": {
  const apiKey = process.env.NEW_SERVICE_API_KEY;
  if (!apiKey) return { success: false, status: "error", message: "Not configured" };

  try {
    const response = await fetch("https://api.newservice.com/health", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (response.ok) return { success: true, status: "connected", message: "Connected" };
    return { success: false, status: "error", message: "Connection failed" };
  } catch (error) {
    return { success: false, status: "error", message: error.message };
  }
}
```

## Integration Status States

| Status | Color | Meaning | Action |
|--------|-------|---------|--------|
| `connected` | Green | API verified working | Can test again |
| `configured` | Blue | Env vars present, not tested | Can test |
| `planned` | Gray | Feature not yet available | —none— |
| `error` | Red | Test failed | Check config |
| `not_configured` | Gray | No env vars | Not shown |

## Environment Variables

Each integration checks for specific env vars:

| Integration | Env Vars | Required |
|-------------|----------|----------|
| Supabase | NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY | Yes |
| SureScripts | SURESCRIPTS_PARTNER_ID + SURESCRIPTS_API_KEY | No |
| NCPDP/D.0 | NCPDP_SWITCH_URL | No |
| Twilio | TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN | No |
| Stripe/Square | STRIPE_SECRET_KEY OR SQUARE_ACCESS_TOKEN | No |
| Shipping | USPS_API_KEY OR UPS_API_KEY OR FEDEX_API_KEY | No |
| Claude AI | ANTHROPIC_API_KEY | No |

## Permissions

- **Read**: `requirePermission("settings", "read")` - View integrations page
- **Write**: `requirePermission("settings", "write")` - Test connections

## UI Components

### IntegrationCard

Displays a single integration with status and actions.

Props:
- `name`: Integration name
- `description`: Human-readable description
- `status`: Current status
- `icon`: Icon key from mapping
- `onTest`: Click handler for test button
- `isLoading`: Show spinner while testing

### IntegrationIcon

Renders gradient icon with SVG.

Props:
- `icon`: Icon key from mapping

## Toast Notifications

Simple toast implementation without external library:

```typescript
showToast("Success message", "success") // Green toast
showToast("Error message", "error")     // Red toast
```

Toasts auto-dismiss after 3 seconds and appear bottom-right.

## Styling

- **Design Language**: Option B gradient borders, card-based
- **Color Scheme**: Emerald green (#40721D) primary
- **Grid**: 2 columns (lg breakpoint), 1 column mobile
- **Icons**: 10x10 rounded boxes with gradient
- **Spacing**: 6px-8px for tight controls, 24px-32px for sections

## Performance

- **SSR**: Page pre-renders on server with initial states
- **Streaming**: Suspense boundary for graceful loading
- **Caching**: Revalidate on-demand (no caching between page loads)
- **Client Updates**: Optimistic UI updates on test clicks

## Security

- No API keys exposed in UI
- Only env vars checked (no hardcoded keys)
- Permission guards on all actions
- Generic error messages for users, detailed logs for admins

## Testing

### Manual Testing Steps

1. Navigate to `/settings/integrations`
2. Verify all 7 cards render correctly
3. Click test button on Supabase (should succeed)
4. Click test button on Claude AI (check ANTHROPIC_API_KEY)
5. Check toast notifications appear
6. Verify mobile responsive layout
7. Check console for errors

### Automated Testing (Future)

```typescript
// Example Jest test
describe("IntegrationsPage", () => {
  it("should render all 7 integration cards", () => {
    // Test implementation
  });

  it("should test integration connection", async () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Integration shows "planned" but should be "configured"

- Check environment variable name matches exactly
- Verify env var is loaded in Next.js (restart dev server)
- Check `.env.local` file permissions

### Test connection fails

- Verify API key is correct
- Check API endpoint is accessible from server
- Review error message in toast/logs
- Confirm network connectivity

### Toast notifications not appearing

- Check browser console for errors
- Verify `showToast()` function is called
- Confirm CSS animations are not disabled

## Related Documentation

- Claude AI Integration: `../../CLAUDE_AI_INTEGRATION.md`
- API Routes: `/src/app/api/integrations/`
- Permission System: `/src/lib/permissions.ts`
- Authentication: `/src/lib/auth.ts`

## Future Enhancements

- [ ] Edit integration configuration in UI
- [ ] Disconnect/remove integrations
- [ ] View integration usage stats
- [ ] Setup wizards for each integration
- [ ] Integration health monitoring
- [ ] Webhook management
- [ ] API rate limit display
