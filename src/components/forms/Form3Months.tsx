'use client'

import { Section, Field, NumberField, CheckField, TextArea, RatingField, MetricGrid, GridCol, SubstituantFields } from './FormParts'

interface Props {
  data: Record<string, unknown>
  onChange: (d: Record<string, unknown>) => void
}

export default function Form3Months({ data, onChange }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v })

  return (
    <div className="space-y-7">
      <Section title="INFORMATIONS GÉNÉRALES">
        <CheckField label="Dossier BNI complété en ligne et en totalité" checked={!!data.dossier_completed} onChange={v => set('dossier_completed', v)} />
        <CheckField label="Le binôme Ambassadeur a conscience que la décision sera partagée avec le Comité des Membres" checked={!!data.aware_committee_decision} onChange={v => set('aware_committee_decision', v)} />
      </Section>

      <Section title="BILAN DES 3 PREMIERS MOIS">
        <div className="flex gap-4 mb-4">
          <Field label="Période du" value={data.period_from as string} onChange={v => set('period_from', v)} type="date" />
          <Field label="au" value={data.period_to as string} onChange={v => set('period_to', v)} type="date" />
        </div>
        <MetricGrid>
          <GridCol title="Ce que j'ai DONNÉ au groupe" color="red">
            <NumberField label="Recommandations données" value={data.reco_given as number} onChange={v => set('reco_given', v)} />
            <NumberField label="Visiteurs invités" value={data.visitors_invited as number} onChange={v => set('visitors_invited', v)} />
            <NumberField label="TàT réalisés" value={data.tat_done as number} onChange={v => set('tat_done', v)} />
            <NumberField label="Taux de présence" value={data.attendance_rate as number} onChange={v => set('attendance_rate', v)} suffix="%" />
            <NumberField label="CA apporté au Groupe" value={data.ca_given as number} onChange={v => set('ca_given', v)} suffix="MAD" />
          </GridCol>
          <GridCol title="Ce que j'ai REÇU du groupe" color="dark">
            <NumberField label="Recommandations reçues" value={data.reco_received as number} onChange={v => set('reco_received', v)} />
            <NumberField label="CA reçu du Groupe" value={data.ca_received as number} onChange={v => set('ca_received', v)} suffix="MAD" />
          </GridCol>
        </MetricGrid>
      </Section>

      <Section title="CHECKLIST ENTRETIEN 3 MOIS">
        <CheckField label="Le programme de mentorat a été réalisé dans sa totalité" checked={!!data.mentoring_completed} onChange={v => set('mentoring_completed', v)} />
        <CheckField label="Le PRM initial (de base) a été complété" checked={!!data.prm_initial_done} onChange={v => set('prm_initial_done', v)} />
        <CheckField label="Le PRM Avancé a été réalisé" checked={!!data.prm_advanced_done} onChange={v => set('prm_advanced_done', v)} />
        <CheckField label="Le membre a donné sa 1ère recommandation" checked={!!data.first_reco_given} onChange={v => set('first_reco_given', v)} />
        <CheckField label="Le membre a reçu sa 1ère recommandation" checked={!!data.first_reco_received} onChange={v => set('first_reco_received', v)} />
        <CheckField label="Le membre a réalisé au moins une infomerciale structurée" checked={!!data.structured_infomercial_done} onChange={v => set('structured_infomercial_done', v)} />
        <CheckField label="Le membre connaît son score IDP et ses indicateurs" checked={!!data.knows_idp_score} onChange={v => set('knows_idp_score', v)} />
      </Section>

      <Section title="RESSENTI & INTÉGRATION">
        <TextArea label="Qu'est-ce que BNI t'a apporté depuis ton intronisation ?" value={data.bni_brought as string} onChange={v => set('bni_brought', v)} />
        <TextArea label="Qu'est-ce que tu voudrais améliorer ou obtenir davantage ?" value={data.wants_to_improve as string} onChange={v => set('wants_to_improve', v)} />
        <RatingField label="Ressenti général sur le groupe (1 à 10)" value={data.general_feeling as number} onChange={v => set('general_feeling', v)} />
      </Section>

      <Section title="LE PROJET BNI DANS TA STRATÉGIE">
        <TextArea label="Quelle partie de ton activité génère le plus de chiffre d'affaires ?" value={data.main_revenue_activity as string} onChange={v => set('main_revenue_activity', v)} />
        <TextArea
          label="Comment BNI peut contribuer au développement de ton entreprise sur les 3 prochaines années ?"
          value={data.bni_contribution_strategy as string}
          onChange={v => set('bni_contribution_strategy', v)}
          rows={4}
        />
        <p className="text-xs text-gray-400 italic">ℹ Année 1 : Notoriété &gt; Année 2 : Crédibilité &gt; Année 3 : Profitabilité</p>
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
      </Section>

      <Section title="SYNTHÈSE AMBASSADEUR">
        <Field label="Activité BNI confirmée" value={data.confirmed_bni_activity as string} onChange={v => set('confirmed_bni_activity', v)} />
        <TextArea label="Points positifs" value={data.positive_points as string} onChange={v => set('positive_points', v)} />
        <TextArea label="Points d'interrogation" value={data.concerns as string} onChange={v => set('concerns', v)} />
      </Section>
    </div>
  )
}
