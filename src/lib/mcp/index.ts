import { auth, defineMcp } from "@lovable.dev/mcp-js";
import { addLead, getLead, listFollowUps, listLeads, updateLeadStage } from "./tools/leads";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "leadpilot",
  title: "Leadpilot",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in user's LeadPilot sales workspace. Use list_leads/get_lead to review prospects, add_lead to save a new one, update_lead_stage to move it through the pipeline, and list_follow_ups to see what's due.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listLeads, getLead, addLead, updateLeadStage, listFollowUps],
});
