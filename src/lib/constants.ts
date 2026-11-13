export const PIPELINE_STAGES = [
  'Contacted',
  'Replied',
  'Package agreed',
  'Awaiting approval',
  'Ready to ship',
  'Shipped',
  'Content pending',
  'Content received',
  'Removed / on hold',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const DISPATCH_STATUSES = [
  'Ready',
  'Sent to ops',
  'Shipped',
  'Delivered',
] as const;

export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export const STAGE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Contacted': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  'Replied': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500' },
  'Package agreed': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Awaiting approval': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  'Ready to ship': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  'Shipped': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  'Content pending': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Content received': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Removed / on hold': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
};

export const PR_PACKAGES = [
  'Hair Revival Trio',
  'Eyespresso Under Eye Serum',
  'Bright Monster Serum',
  'B3 Hydra Glow Serum',
  'Frizz Free Leave-in Hair Moisturiser',
  'Hair Revival Duo & Eyespresso',
  'C2 Collagen + Ceramide Barrier Repair',
  'Brightening Pro Bundle',
  'Aloe Therapy Ultra Gentle Facewash',
  'Salicylic Acid & Miracle Mask',
  'Custom Bundle',
];

export const OPS_SHEET_HEADERS = [
  'NAME',
  'Address',
  'Number',
  'Pro ',
  'Amount',
  'Qty',
  'City',
  'Order',
];

export const CREATOR_CATEGORIES = [
  'Skinfluencer',
  'Influencer',
  'Dermatologist',
  'Creative',
  'Lifestyle',
];
