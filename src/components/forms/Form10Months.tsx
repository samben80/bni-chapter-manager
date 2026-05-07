'use client'

import { Section, Field, NumberField, CheckField, TextArea, MetricGrid, GridCol, SubstituantFields } from './FormParts'

interface Props {
  data: Record<string, unknown>
  onChange: (d: Record<string, unknown>) => void
}

export default function Form10Months({ data, onChange }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v })

  return (
    <div className="space-y-7">
      <Section title="INFORMATIONS GÉNÉRALES">
        <Field label="Localisation du siège social" value={data.company_location as string} onChange={v => set('company_location', v)} />
        <NumberField label="Nombre de salariés" value={data.employees_count as number} onChange={v => set('employees_count', v)} />
        <CheckField label="Dossier BNI complété en ligne et en totalité" checked={!!data.dossier_completed} onChange={v => set('dossier_completed', v)} />
        <CheckField label="Le binôme Comité des Membres a conscience que la décision sera prise après consultation de l'ensemble du Comité" checked={!!data.aware_committee_decision} onChange={v => set('aware_committee_decision', v)} />
      </Section>

      <Section title="MOTIVATION À RENOUVELER BNI">
        <TextArea
          label="Quels sont les éléments qui te motivent à demander ton renouvellement ?"
          value={data.renewal_motivation as string}
          onChange={v => set('renewal_motivation', v)}
          rows={4}
        />
      </Section>

      <Section title="BILAN BNI DE L'ANNÉE ÉCOULÉE">
        <div className="flex gap-4 mb-4">
          <Field label="Période du" value={data.period_from as string} onChange={v => set('period_from', v)} type="date" />
          <Field label="au" value={data.period_to as string} onChange={v => set('period_to', v)} type="date" />
        </div>
        <MetricGrid>
          <GridCol title="Ce que j'ai DONNÉ au groupe" color="red">
            <NumberField label="Recommandations données" value={data.reco_given as number} onChange={v => set('reco_given', v)} />
            <NumberField label="CA apporté au Groupe" value={data.ca_given as number} onChange={v => set('ca_given', v)} suffix="MAD" />
            <NumberField label="TàT réalisés" value={data.tat_done as number} onChange={v => set('tat_done', v)} />
            <NumberField label="Visiteurs" value={data.visitors as number} onChange={v => set('visitors', v)} />
            <NumberField label="Taux de présence" value={data.attendance_rate as number} onChange={v => set('attendance_rate', v)} suffix="%" />
            <CheckField label="Participation à un Comité de pilotage" checked={!!data.committee_participation} onChange={v => set('committee_participation', v)} />
          </GridCol>
          <GridCol title="Ce que j'ai REÇU du groupe" color="dark">
            <NumberField label="Recommandations reçues" value={data.reco_received as number} onChange={v => set('reco_received', v)} />
            <NumberField label="CA reçu du Groupe" value={data.ca_received as number} onChange={v => set('ca_received', v)} suffix="MAD" />
          </GridCol>
        </MetricGrid>
        <TextArea label="Organisation interne pour le suivi des recommandations BNI" value={data.recommendation_followup_org as string} onChange={v => set('recommendation_followup_org', v)} />
      </Section>

      <Section title="ACTUALITÉS DE L'ENTREPRISE ET DU MEMBRE">
        <TextArea label="Quelles sont les évolutions de l'entreprise ?" value={data.company_evolutions as string} onChange={v => set('company_evolutions', v)} />
        <TextArea
          label="Quelle partie de l'activité génère, actuellement, le plus de chiffre d'affaires ?"
          value={data.main_revenue_activity as string}
          onChange={v => set('main_revenue_activity', v)}
        />
      </Section>

      <Section title="BNI DANS LA STRATÉGIE D'ENTREPRISE">
        <TextArea
          label="Quels sont tes objectifs business BNI pour l'année à venir ?"
          value={data.bni_objectives_next_year as string}
          onChange={v => set('bni_objectives_next_year', v)}
          rows={4}
        />
        <p className="text-xs text-gray-400 italic">ℹ Année 1 : Notoriété &gt; Année 2 : Crédibilité &gt; Année 3 : Profitabilité</p>
        <TextArea
          label="Quels sont les 3 contacts à qui tu souhaites offrir l'opportunité de découvrir BNI ?"
          value={data.three_contacts_to_invite as string}
          onChange={v => set('three_contacts_to_invite', v)}
        />
        <TextArea
          label="Comment traiter le développement des affaires ? Quels moyens ?"
          value={data.business_development_approach as string}
          onChange={v => set('business_development_approach', v)}
        />
        <TextArea label="Que comptes-tu apporter au Groupe ?" value={data.contribution_to_group as string} onChange={v => set('contribution_to_group', v)} />
      </Section>

      <Section title="MA VIE DE BNISTE">
        <CheckField label="Je m'engage à être présent ou suppléé(e)" checked={true} onChange={() => {}} />
        <div>
          <p className="text-sm text-gray-600 mb-2">Suppléant 1</p>
          <SubstituantFields prefix="substituant1" data={data} onChange={onChange} />
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-2">Suppléant 2</p>
          <SubstituantFields prefix="substituant2" data={data} onChange={onChange} />
        </div>
        <CheckField label="Je m'engage à recommander mes co-membres" checked={true} onChange={() => {}} hint="Une recommandation par semaine est un gage de succès au sein du Groupe" />
        <CheckField label="Je m'engage à inviter mon réseau en réunion BNI" checked={true} onChange={() => {}} />
        <CheckField label="Je m'engage à être professionnel, positif et constructif" checked={true} onChange={() => {}} />
        <CheckField label="Je m'engage à me former" checked={true} onChange={() => {}} />
        <CheckField label="Je certifie exercer conformément à mes obligations légales et professionnelles (ex : assurances)" checked={true} onChange={() => {}} />
        <CheckField label="Je certifie ne pas appartenir à un réseau incompatible" checked={true} onChange={() => {}} />
        <CheckField label="J'accepte que les réunions se déroulent en physique ou en online selon les conditions sanitaires" checked={true} onChange={() => {}} />
      </Section>

      <Section title="MON PLAN D'ACTIONS BNI">
        <NumberField label="CA visé" value={data.plan_ca_target as number} onChange={v => set('plan_ca_target', v)} suffix="MAD" />
        <NumberField label="Nombre de recommandations à apporter" value={data.plan_reco_count as number} onChange={v => set('plan_reco_count', v)} />
        <NumberField label="Nombre de Visiteurs attendus" value={data.plan_visitors_count as number} onChange={v => set('plan_visitors_count', v)} />
        <NumberField label="Nombre de TàT à réaliser" value={data.plan_tat_count as number} onChange={v => set('plan_tat_count', v)} />
        <Field label="MPB à apporter" value={data.plan_mpb as string} onChange={v => set('plan_mpb', v)} />

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Mes 3 actions prioritaires</p>
          {[1, 2, 3].map(n => (
            <div key={n} className="flex gap-3 mb-2">
              <span className="text-sm text-gray-400 w-4 flex-shrink-0 mt-2">{n}.</span>
              <input
                type="text"
                placeholder={`Action ${n}`}
                value={(data[`action${n}`] as string) ?? ''}
                onChange={e => set(`action${n}`, e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              />
              <input
                type="date"
                value={(data[`action${n}_deadline`] as string) ?? ''}
                onChange={e => set(`action${n}_deadline`, e.target.value)}
                className="w-36 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>
          ))}
        </div>

        <CheckField
          label="Je m'engage à exploiter l'opportunité atelier BNI au moins une fois par an"
          checked={!!data.workshop_commitment_date}
          onChange={v => { if (!v) set('workshop_commitment_date', ''); }}
        />
        <Field label="Date choisie pour l'atelier" value={data.workshop_commitment_date as string} onChange={v => set('workshop_commitment_date', v)} type="date" />
      </Section>

      <Section title="SYNTHÈSE DU COMITÉ DES MEMBRES">
        <Field label="Activité BNI confirmée" value={data.confirmed_bni_activity as string} onChange={v => set('confirmed_bni_activity', v)} />
        <TextArea label="Points positifs" value={data.positive_points as string} onChange={v => set('positive_points', v)} />
        <TextArea label="Points d'interrogation" value={data.concerns as string} onChange={v => set('concerns', v)} />
      </Section>
    </div>
  )
}
