'use client'

import { Section, Field, NumberField, CheckField, TextArea, RatingField, MetricGrid, GridCol } from './FormParts'

const BNI_POSITIVE_OPTIONS = ['Business', 'Compétences', 'Entraide', 'Conseils']

interface Props {
  data: Record<string, unknown>
  onChange: (d: Record<string, unknown>) => void
}

export default function Form7Months({ data, onChange }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v })

  const togglePositive = (item: string) => {
    const current = (data.bni_positive as string[]) || []
    const next = current.includes(item) ? current.filter(x => x !== item) : [...current, item]
    set('bni_positive', next)
  }

  return (
    <div className="space-y-7">
      <Section title="BILAN BNI DE L'ANNÉE ÉCOULÉE">
        <div className="flex gap-4 mb-4">
          <Field label="Période du" value={data.period_from as string} onChange={v => set('period_from', v)} type="date" />
          <Field label="au" value={data.period_to as string} onChange={v => set('period_to', v)} type="date" />
        </div>
        <MetricGrid>
          <GridCol title="Ce que j'ai DONNÉ au groupe" color="red">
            <NumberField label="Nombre de réunions sur l'année" value={data.meetings_count as number} onChange={v => set('meetings_count', v)} />
            <NumberField label="Nombre d'absences / suppléances" value={data.absences_count as number} onChange={v => set('absences_count', v)} />
            <NumberField label="Recommandations données" value={data.reco_given as number} onChange={v => set('reco_given', v)} />
            <NumberField label="Visiteurs invités" value={data.visitors_invited as number} onChange={v => set('visitors_invited', v)} />
            <NumberField label="TàT réalisés" value={data.tat_done as number} onChange={v => set('tat_done', v)} />
            <NumberField label="Chiffre d'affaires donné" value={data.ca_given as number} onChange={v => set('ca_given', v)} suffix="MAD" />
          </GridCol>
          <GridCol title="Ce que j'ai REÇU du groupe" color="dark">
            <NumberField label="Recommandations reçues" value={data.reco_received as number} onChange={v => set('reco_received', v)} />
            <NumberField label="  dont internes" value={data.reco_received_internal as number} onChange={v => set('reco_received_internal', v)} />
            <NumberField label="  dont externes" value={data.reco_received_external as number} onChange={v => set('reco_received_external', v)} />
            <NumberField label="CA reçu (6 mois)" value={data.ca_received_6m as number} onChange={v => set('ca_received_6m', v)} suffix="MAD" />
            <NumberField label="CA reçu (12 mois)" value={data.ca_received_12m as number} onChange={v => set('ca_received_12m', v)} suffix="MAD" />
            <NumberField label="CA reçu depuis l'intronisation" value={data.ca_received_total as number} onChange={v => set('ca_received_total', v)} suffix="MAD" />
          </GridCol>
        </MetricGrid>
      </Section>

      <Section title="RESSENTI & SATISFACTION">
        <div>
          <p className="text-sm text-gray-600 mb-2">Qu&apos;est-ce que BNI t&apos;a apporté de positif ?</p>
          <div className="flex flex-wrap gap-2">
            {BNI_POSITIVE_OPTIONS.map(opt => {
              const selected = ((data.bni_positive as string[]) || []).includes(opt)
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => togglePositive(opt)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    selected ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  style={selected ? { backgroundColor: '#C0392B', borderColor: '#C0392B' } : {}}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
        <TextArea label="Autres apports" value={data.other_benefits as string} onChange={v => set('other_benefits', v)} />
        <RatingField label="Ressenti général sur le groupe (1 à 10)" value={data.general_feeling as number} onChange={v => set('general_feeling', v)} />
        <TextArea label="Qu'est-ce que tu voudrais obtenir / améliorer ?" value={data.wants_to_improve as string} onChange={v => set('wants_to_improve', v)} />
      </Section>

      <Section title="ANALYSE BUSINESS">
        <NumberField label="Panier moyen entreprise" value={data.average_basket as number} onChange={v => set('average_basket', v)} suffix="MAD" />
        <NumberField label="CA moyen BNI (CA reçu / Nbre reco converties)" value={data.bni_avg_ca as number} onChange={v => set('bni_avg_ca', v)} suffix="MAD" />
        <NumberField label="Taux de conversion BNI" value={data.conversion_rate as number} onChange={v => set('conversion_rate', v)} suffix="%" />
        <TextArea label="Causes de non conversion" value={data.non_conversion_causes as string} onChange={v => set('non_conversion_causes', v)} />
        <TextArea label="Mes apporteurs / membres principaux" value={data.main_contributors as string} onChange={v => set('main_contributors', v)} />
      </Section>

      <Section title="MON PROJET D'ENTREPRISE">
        <Field label="Activité BNI retenue" value={data.bni_activity as string} onChange={v => set('bni_activity', v)} />
        <Field label="Mon client top (cible – type d'activité)" value={data.top_client_profile as string} onChange={v => set('top_client_profile', v)} />
        <Field label="L'offre que je préfère développer via BNI" value={data.preferred_offer as string} onChange={v => set('preferred_offer', v)} />
        <TextArea label="Mes projets d'entreprise à venir" value={data.company_projects as string} onChange={v => set('company_projects', v)} />
      </Section>

      <Section title="OBJECTIFS BNI">
        <NumberField label="Objectif CA année en cours" value={data.ca_objective_current as number} onChange={v => set('ca_objective_current', v)} suffix="MAD" />
        <NumberField label="Écart objectif / CA réalisé" value={data.ca_gap as number} onChange={v => set('ca_gap', v)} suffix="MAD" />
        <NumberField label="Objectif CA N+1" value={data.ca_objective_n1 as number} onChange={v => set('ca_objective_n1', v)} suffix="MAD" />
        <TextArea label="Activités / profils recherchés" value={data.profiles_sought as string} onChange={v => set('profiles_sought', v)} />
      </Section>

      <Section title="ACTIONS POUR ATTEINDRE LES OBJECTIFS">
        <TextArea label="Propositions de l'Ambassadeur" value={data.ambassador_proposals as string} onChange={v => set('ambassador_proposals', v)} rows={4} />
        <p className="text-sm font-medium text-gray-700">Objectifs pour le prochain trimestre</p>
        <NumberField label="Recommandations à donner" value={data.reco_target as number} onChange={v => set('reco_target', v)} />
        <NumberField label="Visiteurs à inviter" value={data.visitors_target as number} onChange={v => set('visitors_target', v)} />
        <Field label="Score IDP visé" value={data.idp_target as string} onChange={v => set('idp_target', v)} placeholder="ex: vert" />
      </Section>

      <Section title="SYNTHÈSE AMBASSADEUR COACH BUSINESS">
        <TextArea label="Points positifs" value={data.positive_points as string} onChange={v => set('positive_points', v)} />
        <TextArea label="Points d'interrogation" value={data.concerns as string} onChange={v => set('concerns', v)} />
      </Section>
    </div>
  )
}
