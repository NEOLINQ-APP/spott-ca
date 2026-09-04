// SPOTT Auto <-> Bario One integration. Phase 1 shipped this as an
// interface + a logging no-op (no queue existed yet). Phase 2 adds the
// real queue (bario_lead_sync pgmq queue, see
// supabase/migrations/20260902205357_bario_lead_sync_queue.sql) and a
// pg_cron worker (src/routes/lovable/bario/lead-sync/process.ts) that
// actually POSTs to https://bario.ca/api/bario-one/spott/webhook, signed
// with BARIO_ONE_SYNC_SECRET — mirroring the same real, already-proven
// pattern business_leads uses to sync to Bario's CRM. createLead() now
// enqueues a real sync job instead of just logging; the interface itself
// is unchanged, so nothing calling this needed to change.
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

class QueuedBarioOneLeadService implements BarioOneLeadService {
  async createLead(lead: BarioOneLead) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("bario_sync_records")
      .upsert(
        { application_id: lead.financing_application_id, status: "pending" },
        { onConflict: "application_id" },
      );

    const { error } = await supabaseAdmin.rpc("enqueue_bario_lead_sync", {
      queue_name: "bario_lead_sync",
      payload: {
        event_type: "financing_lead.created",
        application_id: lead.financing_application_id,
        queued_at: new Date().toISOString(),
      },
    });
    if (error) {
      console.error("[BarioOneLeadService] failed to enqueue createLead", lead.financing_application_id, error);
      await supabaseAdmin
        .from("bario_sync_records")
        .update({ status: "failed", last_error: error.message })
        .eq("application_id", lead.financing_application_id);
    }

    // bario_one_lead_id is filled in asynchronously once the worker's POST
    // succeeds — never known synchronously here, so this always returns
    // null; callers read the real value later from bario_sync_records.
    return { bario_one_lead_id: null };
  }

  async updateLead(financingApplicationId: string, patch: Partial<BarioOneLead>) {
    console.log("[BarioOneLeadService] updateLead (not yet wired — outbound updates are a follow-up)", financingApplicationId, patch);
  }
  async assignPartner(financingApplicationId: string, partnerId: string) {
    console.log("[BarioOneLeadService] assignPartner (not yet wired — outbound updates are a follow-up)", financingApplicationId, partnerId);
  }
  async assignDealership(financingApplicationId: string, dealerBusinessId: string) {
    console.log("[BarioOneLeadService] assignDealership (not yet wired — outbound updates are a follow-up)", financingApplicationId, dealerBusinessId);
  }
  async updateApplicationStatus(financingApplicationId: string, status: string) {
    console.log("[BarioOneLeadService] updateApplicationStatus (not yet wired — outbound updates are a follow-up)", financingApplicationId, status);
  }
}

export const barioOneLeadService: BarioOneLeadService = new QueuedBarioOneLeadService();
