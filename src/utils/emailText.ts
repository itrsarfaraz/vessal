export const INSPECTION_SCHEDULED_SUBJECT =
  "New Inspection Scheduled for {{vessel_name}}";
export const INSPECTION_SCHEDULED_BODY = `
We are pleased to inform you that a new inspection has been scheduled for {{vessel_name}} on {{inspection_date}} at {{port_name}}. Please ensure that all necessary preparations are made.
`;

export const STATUS_UPDATE_SUBJECT =
  "Status Update for Inspection {{inspection_ID}} of {{vessel_name}}";
export const STATUS_UPDATE_BODY = `
We wanted to inform you that the status of inspection {{inspection_ID}} for {{vessel_name}} has changed to {{current_status}}. Please check the inspection details for further information.
`;

export const ACTION_PLAN_UPDATED_SUBJECT =
  "Action Plan Update for Inspection {{inspection_ID}} of {{vessel_name}}";
export const ACTION_PLAN_UPDATED_BODY = `
{{user_name}} has updated observation {{question_ID}} in the action plan for inspection {{inspection_ID}} of {{vessel_name}}. Please review the updates at your earliest convenience.
`;


export const APPROVAL_REQUEST_SUBJECT = "Approval Request for Action Completion on {{vessel_name}}";
export const APPROVAL_REQUEST_BODY = `
{{user_name}} has completed the action for observation {{question_ID}} and requests your approval. Please review the completion details and provide your approval.
`;

export const APPROVED_ACTION_SUBJECT = "Completion of Observation {{question_ID}} Approved";
export const APPROVED_ACTION_BODY = `
We are pleased to inform you that {{user_name}} has approved the completion of observation {{question_ID}}. Thank you for your prompt attention to this matter.
`


