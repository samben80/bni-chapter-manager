export type InterviewType = 'preboarding' | '3months' | '7months' | '10months'
export type InterviewStatus = 'pending' | 'scheduled' | 'completed' | 'overdue'
export type AmbassadorRole = 'onboarding' | 'coach_business' | 'both'
export type MemberStatus = 'Actif' | 'Arrêté' | 'Annulé' | 'Renouvellement en cours' | 'Postulation en cours'

export interface Chapter {
  id: number
  name: string
  region?: string
  created_at: string
}

export interface Member {
  id: number
  chapter_id: number
  first_name: string
  last_name: string
  company: string
  activity: string
  bni_activity?: string
  email?: string
  phone?: string
  intro_date: string
  status: MemberStatus
  created_at: string
  // computed
  months_since_intro?: number
  full_name?: string
}

export interface Ambassador {
  id: number
  chapter_id: number
  first_name: string
  last_name: string
  company?: string
  email?: string
  phone?: string
  role: AmbassadorRole
  active: number
  full_name?: string
  chapters?: { id: number; name: string }[]
}

export interface AmbassadorAssignment {
  id: number
  member_id: number
  ambassador_id: number
  role: 'onboarding' | 'coach_business'
  start_date: string
  end_date?: string
  ambassador_name?: string
}

export interface Interview {
  id: number
  member_id: number
  ambassador_id?: number
  type: InterviewType
  scheduled_date?: string
  completed_date?: string
  status: InterviewStatus
  form_data?: string
  committee_member1?: string
  committee_member1_opinion?: string
  committee_member2?: string
  committee_member2_opinion?: string
  positive_points?: string
  concerns?: string
  notes?: string
  created_at: string
  updated_at: string
  // joined
  member_name?: string
  ambassador_name?: string
}

// Form data shapes per interview type
export interface PreboardingFormData {
  integration_steps_explained: boolean
  welcome_docs_handed: boolean
  specific_needs: string
  mentor_assigned: boolean
  mentor_name: string
  notes: string
}

export interface Interview3MonthsFormData {
  dossier_completed: boolean
  aware_committee_decision: boolean
  period_from: string
  period_to: string
  reco_given: number
  reco_received: number
  visitors_invited: number
  ca_given: number
  tat_done: number
  attendance_rate: number
  ca_received: number
  mentoring_completed: boolean
  prm_initial_done: boolean
  prm_advanced_done: boolean
  first_reco_given: boolean
  first_reco_received: boolean
  structured_infomercial_done: boolean
  knows_idp_score: boolean
  bni_brought: string
  wants_to_improve: string
  general_feeling: number
  main_revenue_activity: string
  bni_contribution_strategy: string
  substituant1_name: string
  substituant1_company: string
  substituant1_phone: string
  substituant2_name: string
  substituant2_company: string
  substituant2_phone: string
  confirmed_bni_activity: string
}

export interface Interview7MonthsFormData {
  period_from: string
  period_to: string
  meetings_count: number
  absences_count: number
  reco_given: number
  visitors_invited: number
  tat_done: number
  ca_given: number
  reco_received: number
  reco_received_internal: number
  reco_received_external: number
  ca_received_6m: number
  ca_received_12m: number
  ca_received_total: number
  bni_positive: string[]
  other_benefits: string
  general_feeling: number
  wants_to_improve: string
  average_basket: number
  bni_avg_ca: number
  conversion_rate: number
  non_conversion_causes: string
  main_contributors: string
  bni_activity: string
  top_client_profile: string
  preferred_offer: string
  company_projects: string
  ca_objective_current: number
  ca_gap: number
  ca_objective_n1: number
  profiles_sought: string
  ambassador_proposals: string
  reco_target: number
  visitors_target: number
  idp_target: string
}

export interface Interview10MonthsFormData {
  company_location: string
  employees_count: number
  main_activity: string
  dossier_completed: boolean
  aware_committee_decision: boolean
  renewal_motivation: string
  period_from: string
  period_to: string
  reco_given: number
  ca_given: number
  tat_done: number
  visitors: number
  attendance_rate: number
  committee_participation: boolean
  reco_received: number
  ca_received: number
  recommendation_followup_org: string
  company_evolutions: string
  main_revenue_activity: string
  bni_objectives_next_year: string
  three_contacts_to_invite: string
  business_development_approach: string
  contribution_to_group: string
  substituant1_name: string
  substituant1_company: string
  substituant1_phone: string
  substituant2_name: string
  substituant2_company: string
  substituant2_phone: string
  confirmed_bni_activity: string
  plan_ca_target: number
  plan_reco_count: number
  plan_visitors_count: number
  plan_tat_count: number
  plan_mpb: string
  action1: string
  action1_deadline: string
  action2: string
  action2_deadline: string
  action3: string
  action3_deadline: string
  workshop_commitment_date: string
}

export interface MemberWithInterviews extends Member {
  interviews: Interview[]
  onboarding_ambassador?: string
  coach_ambassador?: string
  next_interview?: {
    type: InterviewType
    scheduled_date?: string
    days_until: number
  }
}
