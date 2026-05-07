'use client'

import { Section, Field, CheckField, TextArea } from './FormParts'

interface Props {
  data: Record<string, unknown>
  onChange: (d: Record<string, unknown>) => void
}

export default function FormPreboarding({ data, onChange }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...data, [k]: v })

  return (
    <div className="space-y-6">
      <Section title="PRÉSENTATION DU PARCOURS D'INTÉGRATION">
        <TextArea
          label="Besoins spécifiques identifiés"
          value={data.specific_needs as string}
          onChange={v => set('specific_needs', v)}
          placeholder="Notes sur les besoins particuliers du nouveau membre..."
        />
      </Section>

      <Section title="MENTORAT">
        <CheckField label="Un mentor a été attribué au nouveau membre" checked={!!data.mentor_assigned} onChange={v => set('mentor_assigned', v)} />
        <Field label="Nom du mentor" value={data.mentor_name as string} onChange={v => set('mentor_name', v)} />
      </Section>

      <Section title="DOCUMENTS REMIS">
        <CheckField label="Guide de bienvenue BNI" checked={!!data.doc_welcome} onChange={v => set('doc_welcome', v)} />
        <CheckField label="Calendrier des prochaines réunions" checked={!!data.doc_calendar} onChange={v => set('doc_calendar', v)} />
        <CheckField label="Guide du programme de mentorat" checked={!!data.doc_mentor_guide} onChange={v => set('doc_mentor_guide', v)} />
        <CheckField label="Accès à BNI Connect expliqué" checked={!!data.doc_connect} onChange={v => set('doc_connect', v)} />
      </Section>

      <Section title="ÉTAPES PRÉSENTÉES AU MEMBRE">
        <CheckField label="Semaine 1-4 : Programme de mentorat présenté" checked={!!data.step_mentoring} onChange={v => set('step_mentoring', v)} />
        <CheckField label="Mois 1-2 : PRM initial et avancé expliqués" checked={!!data.step_prm} onChange={v => set('step_prm', v)} />
        <CheckField label="Fin du 3ème mois : Entretien bilan 3 mois présenté" checked={!!data.step_3months} onChange={v => set('step_3months', v)} />
        <CheckField label="Structure des infomerciales expliquée" checked={!!data.step_infomercial} onChange={v => set('step_infomercial', v)} />
        <CheckField label="Fonctionnement des TàT présenté" checked={!!data.step_tat} onChange={v => set('step_tat', v)} />
      </Section>

      <Section title="NOTES AMBASSADEUR">
        <TextArea
          label="Observations et notes"
          value={data.notes as string}
          onChange={v => set('notes', v)}
          placeholder="Tout élément pertinent à retenir sur ce membre..."
          rows={5}
        />
      </Section>
    </div>
  )
}
