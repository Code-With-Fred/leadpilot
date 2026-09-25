/**
 * PLACEHOLDER CONTENT — fictional sample data used only to render product
 * previews on the marketing site. Not real customer data. Replace with live
 * data once the LeadPilot application backend is connected.
 */
import type { LeadStatus } from "@/components/product/status-badge";

export interface DemoLead {
  company: string;
  contact: string;
  status: LeadStatus;
  score: number;
  activity: string;
}

export const demoLeads: DemoLead[] = [
  {
    company: "Northstar Properties",
    contact: "Sarah Whitfield",
    status: "Interested",
    score: 87,
    activity: "Replied 2h ago",
  },
  {
    company: "Cedar Ridge Roofing",
    contact: "Daniel Mbeki",
    status: "Qualified",
    score: 78,
    activity: "Call booked",
  },
  {
    company: "Orchard HVAC Group",
    contact: "Lena Ortiz",
    status: "Contacted",
    score: 64,
    activity: "Follow up in 2d",
  },
  {
    company: "Beacon Legal Partners",
    contact: "Tom Aldridge",
    status: "New",
    score: 41,
    activity: "Imported today",
  },
  {
    company: "Halcyon Solar",
    contact: "Priya Raman",
    status: "Won",
    score: 93,
    activity: "Contract signed",
  },
];

export const demoMetrics = [
  { label: "Leads", value: 142 },
  { label: "Contacted", value: 38 },
  { label: "Replies", value: 17 },
  { label: "Qualified", value: 6 },
  { label: "Meetings", value: 3 },
];

export const demoRecommendations = [
  { text: "12 leads are due for follow up", tone: "primary" as const },
  { text: "5 prospects showed buying intent", tone: "success" as const },
  { text: "3 conversations need your attention", tone: "warning" as const },
];
