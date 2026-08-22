// Outbound events to Bario One's internal "Spott Acquisition" org — a
// separate data flow from the Phase 2 crm_webhooks queue (that one is
// scoped to a business's own connected CRM org; this fires for every
// business's acquisition-funnel activity regardless of connection).
export type AcquisitionEventType =
  | "spott.business.created"
  | "spott.claim.started"
  | "spott.claim.completed"
  | "spott.profile.updated"
  | "spott.review.created"
  | "spott.offer.created"
  | "spott.lead.created"
  | "spott.subscription.created";

export async function enqueueAcquisitionEvent(
  eventType: AcquisitionEventType,
  businessId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("enqueue_acquisition_event", {
    queue_name: "acquisition_events",
    payload: { event_type: eventType, business_id: businessId, data, queued_at: new Date().toISOString() } as never,
  });
}
