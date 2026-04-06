"use server";

/**
 * BNDS PMS — Campaign Management Server Actions
 */

import {
  createCampaign as createCampaignEngine,
  executeCampaign as executeCampaignEngine,
  retryFailedCalls,
  getAllCampaigns,
  getCampaignById,
  getCampaignStats,
  type Campaign,
  type CampaignType,
  type CampaignFilters,
  type CampaignStats,
  type CallResult,
} from "@/lib/communications/outbound-caller";

export interface CampaignDashboardData {
  campaigns: Campaign[];
  stats: CampaignStats;
}

export interface CampaignDetailData {
  campaign: Campaign;
  callResults: CallResult[];
}

// ---------------------------------------------------------------------------
// Dashboard — list campaigns + aggregate stats
// ---------------------------------------------------------------------------

export async function getCampaignDashboard(
  filters?: { type?: CampaignType; dateFrom?: string; dateTo?: string },
): Promise<CampaignDashboardData> {
  let campaigns = await getAllCampaigns();

  if (filters?.type) {
    campaigns = campaigns.filter((c) => c.type === filters.type);
  }
  if (filters?.dateFrom) {
    campaigns = campaigns.filter((c) => c.createdAt >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    campaigns = campaigns.filter((c) => c.createdAt <= filters.dateTo!);
  }

  // Most recent first
  campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = await getCampaignStats();

  return { campaigns, stats };
}

// ---------------------------------------------------------------------------
// Create campaign — build call list from DB query for the given type
// ---------------------------------------------------------------------------

export async function createCampaignAction(
  name: string,
  type: CampaignType,
  filters?: CampaignFilters,
  options?: { retryCount?: number; retryIntervalHours?: number; message?: string },
): Promise<Campaign> {
  return createCampaignEngine(name, type, filters, options);
}

// ---------------------------------------------------------------------------
// Execute campaign — start making calls
// ---------------------------------------------------------------------------

export async function executeCampaignAction(campaignId: string): Promise<Campaign> {
  return executeCampaignEngine(campaignId);
}

// ---------------------------------------------------------------------------
// Campaign detail — individual call results
// ---------------------------------------------------------------------------

export async function getCampaignDetail(campaignId: string): Promise<CampaignDetailData | null> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return null;

  return {
    campaign,
    callResults: campaign.callList,
  };
}

// ---------------------------------------------------------------------------
// Retry failed/no-answer calls
// ---------------------------------------------------------------------------

export async function retryFailed(campaignId: string): Promise<Campaign> {
  return retryFailedCalls(campaignId);
}
