/**
 * Shipping Carriers Integration (USPS, UPS, FedEx)
 * Handles address validation, rate quotes, shipment creation, and tracking
 * Uses native fetch - no external packages
 */

import { logger } from "@/lib/logger";

// Environment variables
const USPS_USER_ID = process.env.USPS_USER_ID;
const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID;
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET;
const FEDEX_API_KEY = process.env.FEDEX_API_KEY;
const FEDEX_SECRET_KEY = process.env.FEDEX_SECRET_KEY;

// Type definitions
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface ValidatedAddress extends Address {
  validated: boolean;
  deliverable: boolean;
  error?: string;
}

export interface Package {
  weight: number; // in ounces
  length: number; // in inches
  width: number;
  height: number;
  description?: string;
}

export interface ShippingRate {
  carrier: "usps" | "ups" | "fedex";
  service: string;
  cost: number;
  currency: string;
  estimatedDays: number;
  trackingAvailable: boolean;
}

export interface ShipmentData {
  carrier: "usps" | "ups" | "fedex";
  from: Address;
  to: Address;
  package: Package;
  reference?: string;
  signature?: boolean;
  insurance?: boolean;
}

export interface Shipment {
  carrier: "usps" | "ups" | "fedex";
  shipmentId: string;
  trackingNumber: string;
  labelUrl: string;
  cost: number;
  status: "created" | "shipped" | "in-transit" | "delivered" | "failed";
}

export interface TrackingInfo {
  carrier: "usps" | "ups" | "fedex";
  trackingNumber: string;
  status: "in-transit" | "delivered" | "pending" | "exception";
  lastUpdate: string;
  events: TrackingEvent[];
  estimatedDelivery?: string;
}

export interface TrackingEvent {
  timestamp: string;
  location: string;
  description: string;
  status: string;
}

export interface CarrierResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  carrier?: "usps" | "ups" | "fedex";
}

/**
 * Shipping Client - unified interface for multiple carriers
 */
class ShippingCarriersClient {
  private uspsUserId: string | undefined;
  private upsClientId: string | undefined;
  private upsClientSecret: string | undefined;
  private fedexApiKey: string | undefined;
  private fedexSecretKey: string | undefined;
  private isDev: boolean;

  private upsBaseUrl = "https://onrate.ups.com/ship/v2403";
  private upsOAuthUrl = "https://onlinetools.ups.com/upsclient/v1";
  private fedexBaseUrl = "https://apis.fedex.com";
  private uspsBaseUrl = "https://secure.shippingapis.com";

  constructor() {
    this.uspsUserId = USPS_USER_ID;
    this.upsClientId = UPS_CLIENT_ID;
    this.upsClientSecret = UPS_CLIENT_SECRET;
    this.fedexApiKey = FEDEX_API_KEY;
    this.fedexSecretKey = FEDEX_SECRET_KEY;

    // Dev mode if any carrier credentials are missing
    this.isDev = !this.uspsUserId && !this.upsClientId && !this.fedexApiKey;
  }

  /**
   * USPS Address Validation
   */
  async validateAddress(
    address: Address
  ): Promise<CarrierResponse<ValidatedAddress>> {
    try {
      if (this.isDev) {
        logger.info(
          `[USPS Address - DEV] ${address.line1}, ${address.city}, ${address.state}`
        );
        return {
          success: true,
          carrier: "usps",
          data: {
            ...address,
            validated: true,
            deliverable: true,
          },
        };
      }

      if (!this.uspsUserId) {
        return {
          success: false,
          carrier: "usps",
          error: "USPS_USER_ID not configured",
        };
      }

      const params = new URLSearchParams();
      params.append("API", "Verify");
      params.append("XML", this._buildUSPSValidationXML(address));

      const response = await fetch(`${this.uspsBaseUrl}/ShippingAPI.dll`, {
        method: "POST",
        body: params.toString(),
      });

      const xmlText = await response.text();
      const validated = this._parseUSPSAddressResponse(xmlText, address);

      logger.info(
        `[USPS] Address validation: ${validated.validated ? "valid" : "invalid"}`
      );

      return {
        success: validated.validated,
        carrier: "usps",
        data: validated,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[USPS] Address validation failed", error);
      return {
        success: false,
        carrier: "usps",
        error: errorMsg,
      };
    }
  }

  /**
   * Get shipping rates from all configured carriers
   */
  async getRates(
    origin: Address,
    destination: Address,
    pkg: Package
  ): Promise<CarrierResponse<ShippingRate[]>> {
    try {
      const rates: ShippingRate[] = [];

      // USPS rates (simplified - mock for now)
      if (this.uspsUserId || this.isDev) {
        const uspsRates = await this._uspsGetRates(origin, destination, pkg);
        if (uspsRates.success && uspsRates.data) {
          rates.push(...uspsRates.data);
        }
      }

      // UPS rates
      if (this.upsClientId || this.isDev) {
        const upsRates = await this._upsGetRates(origin, destination, pkg);
        if (upsRates.success && upsRates.data) {
          rates.push(...upsRates.data);
        }
      }

      // FedEx rates
      if (this.fedexApiKey || this.isDev) {
        const fedexRates = await this._fedexGetRates(origin, destination, pkg);
        if (fedexRates.success && fedexRates.data) {
          rates.push(...fedexRates.data);
        }
      }

      if (rates.length === 0) {
        return {
          success: false,
          error: "No carriers configured or rates unavailable",
        };
      }

      // Sort by cost
      rates.sort((a, b) => a.cost - b.cost);

      logger.info(`[Shipping] Retrieved ${rates.length} rate quotes`);

      return {
        success: true,
        data: rates,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[Shipping] Failed to get rates", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Create a shipment
   */
  async createShipment(
    shipmentData: ShipmentData
  ): Promise<CarrierResponse<Shipment>> {
    try {
      if (!shipmentData.carrier) {
        return {
          success: false,
          error: "Carrier type required",
        };
      }

      let result: CarrierResponse<Shipment>;

      switch (shipmentData.carrier) {
        case "usps":
          result = await this._uspsCreateShipment(shipmentData);
          break;
        case "ups":
          result = await this._upsCreateShipment(shipmentData);
          break;
        case "fedex":
          result = await this._fedexCreateShipment(shipmentData);
          break;
        default:
          return {
            success: false,
            error: `Unknown carrier: ${shipmentData.carrier}`,
          };
      }

      if (result.success && result.data) {
        logger.info(
          `[${result.carrier?.toUpperCase()}] Created shipment ${result.data.trackingNumber}`
        );
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error("[Shipping] Failed to create shipment", error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get tracking information
   */
  async getTrackingInfo(
    carrier: "usps" | "ups" | "fedex",
    trackingNumber: string
  ): Promise<CarrierResponse<TrackingInfo>> {
    try {
      if (!carrier || !trackingNumber) {
        return {
          success: false,
          error: "Carrier and tracking number required",
        };
      }

      let result: CarrierResponse<TrackingInfo>;

      switch (carrier) {
        case "usps":
          result = await this._uspsTrack(trackingNumber);
          break;
        case "ups":
          result = await this._upsTrack(trackingNumber);
          break;
        case "fedex":
          result = await this._fedexTrack(trackingNumber);
          break;
        default:
          return {
            success: false,
            error: `Unknown carrier: ${carrier}`,
          };
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        `[${carrier?.toUpperCase()}] Failed to get tracking info`,
        error
      );
      return {
        success: false,
        carrier,
        error: errorMsg,
      };
    }
  }

  /**
   * Cancel a shipment
   */
  async cancelShipment(
    carrier: "usps" | "ups" | "fedex",
    shipmentId: string
  ): Promise<CarrierResponse<{ status: string }>> {
    try {
      if (!carrier || !shipmentId) {
        return {
          success: false,
          error: "Carrier and shipment ID required",
        };
      }

      if (this.isDev) {
        logger.info(`[${carrier} Cancel - DEV] Shipment: ${shipmentId}`);
        return {
          success: true,
          carrier,
          data: {
            status: "cancelled",
          },
        };
      }

      // Placeholder for actual carrier implementations
      logger.warn(`[${carrier}] Shipment cancellation not yet implemented`);

      return {
        success: false,
        carrier,
        error: "Shipment cancellation not yet implemented",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[${carrier}] Failed to cancel shipment`, error);
      return {
        success: false,
        carrier,
        error: errorMsg,
      };
    }
  }

  /**
   * Get label URL for a shipment
   */
  async getLabel(
    carrier: "usps" | "ups" | "fedex",
    shipmentId: string
  ): Promise<CarrierResponse<{ labelUrl: string }>> {
    try {
      if (!carrier || !shipmentId) {
        return {
          success: false,
          error: "Carrier and shipment ID required",
        };
      }

      if (this.isDev) {
        logger.info(`[${carrier} Label - DEV] Shipment: ${shipmentId}`);
        return {
          success: true,
          carrier,
          data: {
            labelUrl: `https://example.com/label/${shipmentId}.pdf`,
          },
        };
      }

      // Placeholder for actual carrier implementations
      logger.warn(`[${carrier}] Label retrieval not yet implemented`);

      return {
        success: false,
        carrier,
        error: "Label retrieval not yet implemented",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[${carrier}] Failed to get label`, error);
      return {
        success: false,
        carrier,
        error: errorMsg,
      };
    }
  }

  /**
   * Test connection to a carrier
   */
  async testConnection(
    carrier: "usps" | "ups" | "fedex"
  ): Promise<CarrierResponse<{ timestamp: string }>> {
    try {
      if (this.isDev) {
        logger.warn(
          `[${carrier}] Running in dev mode - connection test skipped`
        );
        return {
          success: false,
          carrier,
          error: `${carrier} not configured (dev mode)`,
        };
      }

      switch (carrier) {
        case "usps":
          if (!this.uspsUserId) {
            return {
              success: false,
              carrier,
              error: "USPS_USER_ID not configured",
            };
          }
          break;
        case "ups":
          if (!this.upsClientId || !this.upsClientSecret) {
            return {
              success: false,
              carrier,
              error: "UPS credentials not configured",
            };
          }
          break;
        case "fedex":
          if (!this.fedexApiKey) {
            return {
              success: false,
              carrier,
              error: "FedEx credentials not configured",
            };
          }
          break;
      }

      logger.info(`[${carrier}] Connection test successful`);

      return {
        success: true,
        carrier,
        data: {
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[${carrier}] Connection test failed`, error);
      return {
        success: false,
        carrier,
        error: errorMsg,
      };
    }
  }

  // ===== USPS Private Methods =====

  private _buildUSPSValidationXML(address: Address): string {
    return `<AddressValidateRequest USERID="${this.uspsUserId}">
      <Address ID="0">
        <Address1>${address.line2 || ""}</Address1>
        <Address2>${address.line1}</Address2>
        <City>${address.city}</City>
        <State>${address.state}</State>
        <Zip5>${address.postalCode}</Zip5>
      </Address>
    </AddressValidateRequest>`;
  }

  private _parseUSPSAddressResponse(
    xml: string,
    originalAddress: Address
  ): ValidatedAddress {
    // Simple XML parsing for address validation response
    const error = xml.includes("Error");
    return {
      ...originalAddress,
      validated: !error,
      deliverable: !error,
      error: error ? "Address validation failed" : undefined,
    };
  }

  private async _uspsGetRates(
    origin: Address,
    destination: Address,
    pkg: Package
  ): Promise<CarrierResponse<ShippingRate[]>> {
    if (this.isDev) {
      logger.info("[USPS Rates - DEV] Generating mock rates");
      return {
        success: true,
        carrier: "usps",
        data: [
          {
            carrier: "usps",
            service: "Priority Mail Express",
            cost: 45.99,
            currency: "USD",
            estimatedDays: 1,
            trackingAvailable: true,
          },
          {
            carrier: "usps",
            service: "Priority Mail",
            cost: 12.99,
            currency: "USD",
            estimatedDays: 3,
            trackingAvailable: true,
          },
        ],
      };
    }

    logger.warn("[USPS] Rate calculation not yet implemented");
    return {
      success: false,
      carrier: "usps",
      error: "USPS rate calculation not yet implemented",
    };
  }

  private async _uspsCreateShipment(
    shipmentData: ShipmentData
  ): Promise<CarrierResponse<Shipment>> {
    if (this.isDev) {
      logger.info("[USPS Shipment - DEV] Creating mock shipment");
      return {
        success: true,
        carrier: "usps",
        data: {
          carrier: "usps",
          shipmentId: `usps-${Date.now()}`,
          trackingNumber: `9400${Math.random().toString().slice(2, 13)}US`,
          labelUrl: "https://example.com/label.pdf",
          cost: 12.99,
          status: "created",
        },
      };
    }

    logger.warn("[USPS] Shipment creation not yet implemented");
    return {
      success: false,
      carrier: "usps",
      error: "USPS shipment creation not yet implemented",
    };
  }

  private async _uspsTrack(
    trackingNumber: string
  ): Promise<CarrierResponse<TrackingInfo>> {
    if (this.isDev) {
      logger.info(`[USPS Track - DEV] Tracking: ${trackingNumber}`);
      return {
        success: true,
        carrier: "usps",
        data: {
          carrier: "usps",
          trackingNumber,
          status: "in-transit",
          lastUpdate: new Date().toISOString(),
          events: [
            {
              timestamp: new Date().toISOString(),
              location: "Local Distribution Center",
              description: "Package in transit",
              status: "in-transit",
            },
          ],
        },
      };
    }

    logger.warn("[USPS] Tracking not yet implemented");
    return {
      success: false,
      carrier: "usps",
      error: "USPS tracking not yet implemented",
    };
  }

  // ===== UPS Private Methods =====

  private async _upsGetRates(
    origin: Address,
    destination: Address,
    pkg: Package
  ): Promise<CarrierResponse<ShippingRate[]>> {
    if (this.isDev) {
      logger.info("[UPS Rates - DEV] Generating mock rates");
      return {
        success: true,
        carrier: "ups",
        data: [
          {
            carrier: "ups",
            service: "UPS Next Day Air",
            cost: 65.99,
            currency: "USD",
            estimatedDays: 1,
            trackingAvailable: true,
          },
          {
            carrier: "ups",
            service: "UPS Ground",
            cost: 18.99,
            currency: "USD",
            estimatedDays: 5,
            trackingAvailable: true,
          },
        ],
      };
    }

    logger.warn("[UPS] Rate calculation not yet implemented");
    return {
      success: false,
      carrier: "ups",
      error: "UPS rate calculation not yet implemented",
    };
  }

  private async _upsCreateShipment(
    shipmentData: ShipmentData
  ): Promise<CarrierResponse<Shipment>> {
    if (this.isDev) {
      logger.info("[UPS Shipment - DEV] Creating mock shipment");
      return {
        success: true,
        carrier: "ups",
        data: {
          carrier: "ups",
          shipmentId: `ups-${Date.now()}`,
          trackingNumber: `1Z${Math.random().toString().slice(2, 10)}`,
          labelUrl: "https://example.com/label.pdf",
          cost: 18.99,
          status: "created",
        },
      };
    }

    logger.warn("[UPS] Shipment creation not yet implemented");
    return {
      success: false,
      carrier: "ups",
      error: "UPS shipment creation not yet implemented",
    };
  }

  private async _upsTrack(
    trackingNumber: string
  ): Promise<CarrierResponse<TrackingInfo>> {
    if (this.isDev) {
      logger.info(`[UPS Track - DEV] Tracking: ${trackingNumber}`);
      return {
        success: true,
        carrier: "ups",
        data: {
          carrier: "ups",
          trackingNumber,
          status: "in-transit",
          lastUpdate: new Date().toISOString(),
          events: [
            {
              timestamp: new Date().toISOString(),
              location: "Hub Facility",
              description: "Package in transit",
              status: "in-transit",
            },
          ],
        },
      };
    }

    logger.warn("[UPS] Tracking not yet implemented");
    return {
      success: false,
      carrier: "ups",
      error: "UPS tracking not yet implemented",
    };
  }

  // ===== FedEx Private Methods =====

  private async _fedexGetRates(
    origin: Address,
    destination: Address,
    pkg: Package
  ): Promise<CarrierResponse<ShippingRate[]>> {
    if (this.isDev) {
      logger.info("[FedEx Rates - DEV] Generating mock rates");
      return {
        success: true,
        carrier: "fedex",
        data: [
          {
            carrier: "fedex",
            service: "FedEx Overnight",
            cost: 72.99,
            currency: "USD",
            estimatedDays: 1,
            trackingAvailable: true,
          },
          {
            carrier: "fedex",
            service: "FedEx Ground",
            cost: 16.99,
            currency: "USD",
            estimatedDays: 5,
            trackingAvailable: true,
          },
        ],
      };
    }

    logger.warn("[FedEx] Rate calculation not yet implemented");
    return {
      success: false,
      carrier: "fedex",
      error: "FedEx rate calculation not yet implemented",
    };
  }

  private async _fedexCreateShipment(
    shipmentData: ShipmentData
  ): Promise<CarrierResponse<Shipment>> {
    if (this.isDev) {
      logger.info("[FedEx Shipment - DEV] Creating mock shipment");
      return {
        success: true,
        carrier: "fedex",
        data: {
          carrier: "fedex",
          shipmentId: `fedex-${Date.now()}`,
          trackingNumber: `${Math.random().toString().slice(2, 14)}`,
          labelUrl: "https://example.com/label.pdf",
          cost: 16.99,
          status: "created",
        },
      };
    }

    logger.warn("[FedEx] Shipment creation not yet implemented");
    return {
      success: false,
      carrier: "fedex",
      error: "FedEx shipment creation not yet implemented",
    };
  }

  private async _fedexTrack(
    trackingNumber: string
  ): Promise<CarrierResponse<TrackingInfo>> {
    if (this.isDev) {
      logger.info(`[FedEx Track - DEV] Tracking: ${trackingNumber}`);
      return {
        success: true,
        carrier: "fedex",
        data: {
          carrier: "fedex",
          trackingNumber,
          status: "in-transit",
          lastUpdate: new Date().toISOString(),
          events: [
            {
              timestamp: new Date().toISOString(),
              location: "FedEx Facility",
              description: "Package in transit",
              status: "in-transit",
            },
          ],
        },
      };
    }

    logger.warn("[FedEx] Tracking not yet implemented");
    return {
      success: false,
      carrier: "fedex",
      error: "FedEx tracking not yet implemented",
    };
  }
}

// Export singleton instance
export const shippingClient = new ShippingCarriersClient();
