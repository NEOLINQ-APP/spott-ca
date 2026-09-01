// SPOTT Auto <-> Bario One integration prep. This is deliberately an
// interface + a no-op logging implementation only — Phase 1 explicitly does
// not wire a live connection (no real Bario One API endpoint or credentials
// exist to call yet; inventing one would be worse than not having it). When
// Bario One sync is actually built, swap LoggingBarioOneLeadService for a
// real HTTP-backed implementation of the same interface — nothing calling
// this needs to change.
export type BarioOneLead = {
  financing_application_id: string;
  partner_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  province: string | null;
  vehicle_id: string | null;
  status: string;
};

export interface BarioOneLeadService {
  createLead(lead: BarioOneLead): Promise<{ bario_one_lead_id: string | null }>;
  updateLead(financingApplicationId: string, patch: Partial<BarioOneLead>): Promise<void>;
  assignPartner(financingApplicationId: string, partnerId: string): Promise<void>;
  assignDealership(financingApplicationId: string, dealerBusinessId: string): Promise<void>;
  updateApplicationStatus(financingApplicationId: string, status: string): Promise<void>;
}

class LoggingBarioOneLeadService implements BarioOneLeadService {
  async createLead(lead: BarioOneLead) {
    console.log("[BarioOneLeadService] createLead (no-op, not yet connected)", lead);
    return { bario_one_lead_id: null };
  }
  async updateLead(financingApplicationId: string, patch: Partial<BarioOneLead>) {
    console.log("[BarioOneLeadService] updateLead (no-op, not yet connected)", financingApplicationId, patch);
  }
  async assignPartner(financingApplicationId: string, partnerId: string) {
    console.log("[BarioOneLeadService] assignPartner (no-op, not yet connected)", financingApplicationId, partnerId);
  }
  async assignDealership(financingApplicationId: string, dealerBusinessId: string) {
    console.log("[BarioOneLeadService] assignDealership (no-op, not yet connected)", financingApplicationId, dealerBusinessId);
  }
  async updateApplicationStatus(financingApplicationId: string, status: string) {
    console.log("[BarioOneLeadService] updateApplicationStatus (no-op, not yet connected)", financingApplicationId, status);
  }
}

export const barioOneLeadService: BarioOneLeadService = new LoggingBarioOneLeadService();
