import React from 'react'
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { formatDate } from './utils'

// All form data is stored as dynamic JSON — use a flexible type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormData = Record<string, any>

const RED   = '#C0392B'
const DARK  = '#2C3E50'
const LGRAY = '#F5F5F5'
const MGRAY = '#CCCCCC'
const WHITE = '#FFFFFF'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: '#333333',
          paddingTop: 48, paddingBottom: 48, paddingHorizontal: 40 },

  // ── Header ──────────────────────────────────────────────────────────────
  docHeader: { backgroundColor: RED, padding: 10, marginBottom: 14,
               borderRadius: 2 },
  docHeaderTitle: { color: WHITE, fontSize: 13, fontFamily: 'Helvetica-Bold',
                    textAlign: 'center' },
  docHeaderSub: { color: 'rgba(255,255,255,0.75)', fontSize: 8,
                  textAlign: 'center', marginTop: 2 },

  // ── Section title ────────────────────────────────────────────────────────
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: RED,
                  borderBottomWidth: 1, borderBottomColor: RED,
                  paddingBottom: 3, marginBottom: 8, marginTop: 16 },

  // ── Info table ───────────────────────────────────────────────────────────
  infoRow: { flexDirection: 'row', borderBottomWidth: 0.5,
             borderBottomColor: MGRAY },
  infoLabel: { width: 160, backgroundColor: LGRAY, padding: '4 8',
               fontSize: 8, fontFamily: 'Helvetica-Bold' },
  infoValue: { flex: 1, padding: '4 8', fontSize: 8 },

  // ── Metric 2-col grid ────────────────────────────────────────────────────
  metricGrid: { flexDirection: 'row', marginBottom: 10 },
  metricColL: { flex: 1, marginRight: 5 },
  metricColR: { flex: 1 },
  metricHead: { padding: '5 8', color: WHITE, fontSize: 7.5,
                fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  metricRow: { flexDirection: 'row', borderBottomWidth: 0.5,
               borderBottomColor: MGRAY, padding: '3 6',
               alignItems: 'center' },
  metricLabel: { flex: 1, fontSize: 8 },
  metricValue: { fontSize: 8, fontFamily: 'Helvetica-Bold',
                 textAlign: 'right', minWidth: 36 },

  // ── Check field ──────────────────────────────────────────────────────────
  checkRow:     { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
  checkSquare:  { width: 9, height: 9, borderWidth: 1, borderColor: '#999',
                  marginRight: 6, marginTop: 1, flexShrink: 0 },
  checkSquareOn:{ width: 9, height: 9, borderWidth: 1, borderColor: RED,
                  backgroundColor: RED, marginRight: 6, marginTop: 1, flexShrink: 0,
                  alignItems: 'center', justifyContent: 'center' },
  checkMark:    { color: WHITE, fontSize: 6, fontFamily: 'Helvetica-Bold',
                  marginTop: -1 },
  checkText:    { flex: 1, fontSize: 8 },
  checkHint:    { fontSize: 7, color: '#888888', marginLeft: 15 },

  // ── Open text block ───────────────────────────────────────────────────────
  qLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK,
             marginBottom: 3, marginTop: 10 },
  aLine: { borderBottomWidth: 0.5, borderBottomColor: MGRAY,
            marginBottom: 4, minHeight: 16, paddingBottom: 2 },
  aText: { fontSize: 8 },

  // ── Label–Value row ───────────────────────────────────────────────────────
  lvRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'center' },
  lvLabel: { width: 180, fontSize: 8, fontFamily: 'Helvetica-Bold' },
  lvValue: { flex: 1, fontSize: 8, borderBottomWidth: 0.5,
             borderBottomColor: MGRAY, paddingBottom: 1 },

  // ── Synthèse comité ───────────────────────────────────────────────────────
  synthHeader: { backgroundColor: DARK, padding: '5 8', color: WHITE,
                 fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center',
                 marginBottom: 0 },
  synthRow: { flexDirection: 'row' },
  synthCell: { flex: 1, padding: '5 8', borderWidth: 0.5,
               borderColor: MGRAY, minHeight: 60 },
  synthCellLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  synthCellText: { fontSize: 8 },

  // ── Plan d'actions table ──────────────────────────────────────────────────
  planHead: { flexDirection: 'row', backgroundColor: DARK },
  planHeadCell: { padding: '4 8', color: WHITE, fontSize: 8,
                  fontFamily: 'Helvetica-Bold' },
  planRow: { flexDirection: 'row', borderBottomWidth: 0.5,
             borderBottomColor: MGRAY },
  planCell: { padding: '4 8', fontSize: 8 },

  // ── Signatures ────────────────────────────────────────────────────────────
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 36 },
  sigBlock: { width: 200 },
  sigLabel: { fontSize: 8, marginBottom: 18 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: MGRAY },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40,
            borderTopWidth: 0.5, borderTopColor: MGRAY, paddingTop: 4,
            fontSize: 7, color: '#888888', fontFamily: 'Helvetica-Oblique',
            textAlign: 'center' },

  // ── Misc ─────────────────────────────────────────────────────────────────
  note: { fontSize: 7, color: '#999999', fontFamily: 'Helvetica-Oblique',
          marginTop: 4 },
  bold: { fontFamily: 'Helvetica-Bold' },
  spacer: { marginTop: 10 },
})

// ─── Reusable components ──────────────────────────────────────────────────────

function PageFooter() {
  return (
    <Text style={s.footer} fixed>
      Document confidentiel – Usage interne BNI Maroc
    </Text>
  )
}

function DocHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.docHeader}>
      <Text style={s.docHeaderTitle}>{title}</Text>
      {subtitle && <Text style={s.docHeaderSub}>{subtitle}</Text>}
    </View>
  )
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children.toUpperCase()}</Text>
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {rows.map(([label, value], i) => (
        <View key={i} style={s.infoRow}>
          <Text style={s.infoLabel}>{label}</Text>
          <Text style={s.infoValue}>{value || ''}</Text>
        </View>
      ))}
    </View>
  )
}

function MetricTable({ left, right }: { left: [string, string][]; right: [string, string][] }) {
  const maxRows = Math.max(left.length, right.length)
  return (
    <View style={s.metricGrid}>
      {/* Left column */}
      <View style={s.metricColL}>
        <View style={{ backgroundColor: RED }}>
          <Text style={s.metricHead}>CE QUE J'AI DONNÉ AU GROUPE</Text>
        </View>
        {Array.from({ length: maxRows }, (_, i) => {
          const [label, val] = left[i] ?? ['', '']
          return label
            ? <View key={i} style={s.metricRow}>
                <Text style={s.metricLabel}>{label}</Text>
                <Text style={s.metricValue}>{val}</Text>
              </View>
            : null
        })}
      </View>
      {/* Right column */}
      <View style={s.metricColR}>
        <View style={{ backgroundColor: DARK }}>
          <Text style={s.metricHead}>CE QUE J'AI REÇU DU GROUPE</Text>
        </View>
        {Array.from({ length: maxRows }, (_, i) => {
          const [label, val] = right[i] ?? ['', '']
          return label
            ? <View key={i} style={s.metricRow}>
                <Text style={s.metricLabel}>{label}</Text>
                <Text style={s.metricValue}>{val}</Text>
              </View>
            : null
        })}
      </View>
    </View>
  )
}

function Check({ label, checked, hint }: { label: string; checked: boolean; hint?: string }) {
  return (
    <View>
      <View style={s.checkRow}>
        <View style={checked ? s.checkSquareOn : s.checkSquare}>
          {checked && <Text style={s.checkMark}>X</Text>}
        </View>
        <Text style={s.checkText}>{label}</Text>
      </View>
      {hint && <Text style={s.checkHint}>{hint}</Text>}
    </View>
  )
}

function OpenText({ question, value }: { question?: string; value?: string }) {
  return (
    <View>
      {question ? <Text style={s.qLabel}>{question}</Text> : null}
      <View style={s.aLine}>
        {value ? <Text style={s.aText}>{value}</Text> : null}
      </View>
      <View style={s.aLine} />
    </View>
  )
}

function LV({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.lvRow}>
      <Text style={s.lvLabel}>{label}</Text>
      <Text style={s.lvValue}>{value || ''}</Text>
    </View>
  )
}

function SyntheseComite({ pos, neg }: { pos?: string; neg?: string }) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={s.synthHeader}>
        <Text>AVIS DU COMITÉ DES MEMBRES</Text>
      </View>
      <View style={s.synthRow}>
        <View style={[s.synthCell, { backgroundColor: '#E8F5E9', marginRight: 1 }]}>
          <Text style={s.synthCellLabel}>Points positifs :</Text>
          {pos ? <Text style={s.synthCellText}>{pos}</Text> : null}
        </View>
        <View style={[s.synthCell, { backgroundColor: '#FFF3E0' }]}>
          <Text style={s.synthCellLabel}>Points d'interrogation :</Text>
          {neg ? <Text style={s.synthCellText}>{neg}</Text> : null}
        </View>
      </View>
    </View>
  )
}

function n(v: unknown, suffix = '') {
  const num = Number(v ?? 0)
  if (!num) return suffix ? `0 ${suffix}` : '0'
  return suffix
    ? `${num.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${suffix}`
    : num.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

// ─── PREBOARDING ──────────────────────────────────────────────────────────────

function PreboardingDoc({
  member, ambassador, interviewDate, data,
}: {
  member: { full_name: string; company: string; activity: string; intro_date: string; chapter_name?: string }
  ambassador: string; interviewDate: string; data: FormData
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PageFooter />
        <DocHeader
          title="ENTRETIEN PRÉ-BOARDING"
          subtitle="Ambassadeur On Boarding"
        />

        <InfoTable rows={[
          ['Prénom NOM', member.full_name],
          ['Entreprise', member.company],
          ['Activité principale', member.activity],
          ['Date d\'intronisation', formatDate(member.intro_date)],
          ['Nom du chapitre', member.chapter_name || ''],
          ['Ambassadeur On Boarding', ambassador],
          ['Date de l\'entretien', formatDate(interviewDate)],
        ]} />

        <SectionTitle>Présentation du parcours d'intégration</SectionTitle>
        <OpenText question="Besoins spécifiques identifiés :" value={data.specific_needs} />

        <SectionTitle>Mentorat</SectionTitle>
        <Check label="Un mentor a été attribué au nouveau membre" checked={!!data.mentor_assigned} />
        <LV label="Nom du mentor" value={data.mentor_name || ''} />

        <SectionTitle>Documents remis</SectionTitle>
        <Check label="Guide de bienvenue BNI" checked />
        <Check label="Calendrier des prochaines réunions" checked />
        <Check label="Guide du programme de mentorat" checked />
        <Check label="Accès à BNI Connect expliqué" checked />

        <SectionTitle>Étapes présentées au membre</SectionTitle>
        <Check label="Semaine 1-4 : Programme de mentorat présenté" checked={!!data.step_mentoring} />
        <Check label="Mois 1-2 : PRM initial et avancé expliqués" checked={!!data.step_prm} />
        <Check label="Fin du 3ème mois : Entretien bilan 3 mois présenté" checked={!!data.step_3months} />
        <Check label="Structure des infomerciales expliquée" checked={!!data.step_infomercial} />
        <Check label="Fonctionnement des TàT présenté" checked={!!data.step_tat} />

        <SectionTitle>Notes Ambassadeur</SectionTitle>
        <OpenText value={data.notes} />

        <View style={s.sigRow}>
          <View style={s.sigBlock}>
            <Text style={s.sigLabel}>Signature Ambassadeur :</Text>
            <View style={s.sigLine} />
          </View>
          <View style={s.sigBlock}>
            <Text style={s.sigLabel}>Signature Membre :</Text>
            <View style={s.sigLine} />
          </View>
        </View>
      </Page>
    </Document>
  )
}

// ─── 3 MOIS ───────────────────────────────────────────────────────────────────

function ThreeMonthsDoc({
  member, ambassador, interviewDate, data, positivePoints, concerns,
}: {
  member: { full_name: string; company: string; activity: string; intro_date: string; chapter_name?: string }
  ambassador: string; interviewDate: string; data: FormData
  positivePoints?: string; concerns?: string
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PageFooter />
        <DocHeader title="ENTRETIEN 3 MOIS" subtitle="Ambassadeur On Boarding" />

        <InfoTable rows={[
          ['Prénom NOM', member.full_name],
          ['Entreprise', member.company],
          ['Activité principale', member.activity],
          ['Date d\'intronisation', formatDate(member.intro_date)],
          ['Nom du chapitre', member.chapter_name || ''],
          ['Ambassadeur On Boarding', ambassador],
          ['Date de l\'entretien', formatDate(interviewDate)],
        ]} />

        <Check
          label="Dossier BNI complété en ligne et en totalité"
          checked={!!data.dossier_completed}
        />
        <Check
          label="Le binôme Ambassadeur a conscience que la décision sera partagée avec le Comité des Membres"
          checked={!!data.aware_committee_decision}
        />

        <SectionTitle>Bilan des 3 premiers mois</SectionTitle>
        <MetricTable
          left={[
            ['Recommandations données', n(data.reco_given)],
            ['Visiteurs invités', n(data.visitors_invited)],
            ['TàT réalisés', n(data.tat_done)],
            ['Taux de présence', n(data.attendance_rate, '%')],
            ['CA apporté au Groupe', n(data.ca_given, 'MAD')],
          ]}
          right={[
            ['Recommandations reçues', n(data.reco_received)],
            ['CA reçu du Groupe', n(data.ca_received, 'MAD')],
          ]}
        />

        <SectionTitle>Checklist entretien 3 mois</SectionTitle>
        <Check label="Le programme de mentorat a été réalisé dans sa totalité" checked={!!data.mentoring_completed} />
        <Check label="Le PRM initial (de base) a été complété" checked={!!data.prm_initial_done} />
        <Check label="Le PRM Avancé a été réalisé" checked={!!data.prm_advanced_done} />
        <Check label="Le membre a donné sa 1ère recommandation" checked={!!data.first_reco_given} />
        <Check label="Le membre a reçu sa 1ère recommandation" checked={!!data.first_reco_received} />
        <Check label="Le membre a réalisé au moins une infomerciale structurée" checked={!!data.structured_infomercial_done} />
        <Check label="Le membre connaît son score IDP et ses indicateurs" checked={!!data.knows_idp_score} />

        <SectionTitle>Ressenti & Intégration</SectionTitle>
        <OpenText question="Qu'est-ce que BNI t'a apporté depuis ton intronisation ?" value={data.bni_brought} />
        <OpenText question="Qu'est-ce que tu voudrais améliorer ou obtenir davantage ?" value={data.wants_to_improve} />
        <LV label="Ressenti général (1 à 10)" value={data.general_feeling ? String(data.general_feeling) : ''} />

        <SectionTitle>Le projet BNI dans ta stratégie</SectionTitle>
        <OpenText
          question="Quelle partie de ton activité génère le plus de CA ?"
          value={data.main_revenue_activity}
        />
        <OpenText
          question="Comment BNI peut contribuer au développement de ton entreprise sur 3 ans ?"
          value={data.bni_contribution_strategy}
        />
        <Text style={s.note}>(i) Année 1 : Notoriété  &gt;  Année 2 : Crédibilité  &gt;  Année 3 : Profitabilité</Text>

        <SectionTitle>Ma vie de BNIste</SectionTitle>
        <Check label="Je m'engage à être présent ou suppléé(e)" checked />
        <LV label="Suppléant 1" value={[data.substituant1_name, data.substituant1_company, data.substituant1_phone].filter(Boolean).join(' – ')} />
        <LV label="Suppléant 2" value={[data.substituant2_name, data.substituant2_company, data.substituant2_phone].filter(Boolean).join(' – ')} />
        <Check label="Je m'engage à recommander mes co-membres" checked hint="Une recommandation par semaine est un gage de succès" />
        <Check label="Je m'engage à inviter mon réseau en réunion BNI" checked />
        <Check label="Je m'engage à être professionnel, positif et constructif" checked />
        <Check label="Je m'engage à me former" checked />

        <SectionTitle>Synthèse Ambassadeur</SectionTitle>
        <LV label="Activité BNI confirmée" value={data.confirmed_bni_activity || ''} />
        <SyntheseComite pos={positivePoints} neg={concerns} />
      </Page>
    </Document>
  )
}

// ─── 7 MOIS ───────────────────────────────────────────────────────────────────

function SevenMonthsDoc({
  member, ambassador, interviewDate, data, positivePoints, concerns,
}: {
  member: { full_name: string; company: string; activity: string; intro_date: string; chapter_name?: string }
  ambassador: string; interviewDate: string; data: FormData
  positivePoints?: string; concerns?: string
}) {
  const monthsSince = member.intro_date
    ? Math.floor((Date.now() - new Date(member.intro_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : 0

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PageFooter />
        <DocHeader
          title="RDV D'ACCOMPAGNEMENT — 7 MOIS"
          subtitle="Objectif : Améliorer ton expérience et ton retour sur investissement chez BNI"
        />

        <InfoTable rows={[
          ['Prénom NOM', member.full_name],
          ['Entreprise', member.company],
          ['Activité principale', member.activity],
          ['Date d\'intronisation', formatDate(member.intro_date)],
          ['Nombre de mois BNI', String(monthsSince)],
          ['Ambassadeur Coach Business', ambassador],
          ['Date de l\'entretien', formatDate(interviewDate)],
        ]} />

        <SectionTitle>Bilan BNI de l'année écoulée</SectionTitle>
        <MetricTable
          left={[
            ['Réunions sur l\'année', n(data.meetings_count)],
            ['Absences / suppléances', n(data.absences_count)],
            ['Recommandations données', n(data.reco_given)],
            ['Visiteurs invités', n(data.visitors_invited)],
            ['TàT réalisés', n(data.tat_done)],
            ['CA apporté au Groupe', n(data.ca_given, 'MAD')],
          ]}
          right={[
            ['Recommandations reçues', n(data.reco_received)],
            ['  dont internes', n(data.reco_received_internal)],
            ['  dont externes', n(data.reco_received_external)],
            ['CA reçu (6 mois)', n(data.ca_received_6m, 'MAD')],
            ['CA reçu (12 mois)', n(data.ca_received_12m, 'MAD')],
            ['Depuis l\'intronisation', n(data.ca_received_total, 'MAD')],
          ]}
        />

        <SectionTitle>Ressenti & Satisfaction</SectionTitle>
        {data.bni_positive && data.bni_positive.length > 0 && (
          <View>
            <Text style={[s.qLabel, { marginTop: 4 }]}>Qu'est-ce que BNI t'a apporté de positif ?</Text>
            {(data.bni_positive as string[]).map((item: string, i: number) => (
              <Check key={i} label={item} checked />
            ))}
          </View>
        )}
        <OpenText question="Autres apports :" value={data.other_benefits} />
        <LV label="Ressenti général (1 à 10)" value={data.general_feeling ? String(data.general_feeling) : ''} />
        <OpenText question="Qu'est-ce que tu voudrais obtenir / améliorer ?" value={data.wants_to_improve} />

        <SectionTitle>Analyse Business</SectionTitle>
        <LV label="Panier moyen entreprise" value={n(data.average_basket, 'MAD')} />
        <LV label="CA moyen BNI" value={n(data.bni_avg_ca, 'MAD')} />
        <LV label="Taux de conversion BNI" value={n(data.conversion_rate, '%')} />
        <OpenText question="Causes de non conversion :" value={data.non_conversion_causes} />
        <OpenText question="Mes apporteurs principaux :" value={data.main_contributors} />

        <SectionTitle>Mon projet d'entreprise</SectionTitle>
        <LV label="Activité BNI retenue" value={data.bni_activity || ''} />
        <LV label="Mon client top (cible)" value={data.top_client_profile || ''} />
        <LV label="L'offre que je préfère développer via BNI" value={data.preferred_offer || ''} />
        <OpenText question="Mes projets d'entreprise à venir :" value={data.company_projects} />

        <SectionTitle>Objectifs BNI</SectionTitle>
        <LV label="Objectif CA année en cours" value={n(data.ca_objective_current, 'MAD')} />
        <LV label="Écart objectif / CA réalisé" value={n(data.ca_gap, 'MAD')} />
        <LV label="Objectif CA N+1" value={n(data.ca_objective_n1, 'MAD')} />
        <OpenText question="Activités / profils recherchés :" value={data.profiles_sought} />

        <SectionTitle>Actions pour atteindre les objectifs</SectionTitle>
        <OpenText question="Propositions de l'Ambassadeur :" value={data.ambassador_proposals} />
        <Text style={s.qLabel}>Objectifs pour le prochain trimestre :</Text>
        <LV label="Recommandations à donner" value={n(data.reco_target)} />
        <LV label="Visiteurs à inviter" value={n(data.visitors_target)} />
        <LV label="Score IDP visé" value={String(data.idp_target || '')} />

        <SectionTitle>Synthèse Ambassadeur Coach Business</SectionTitle>
        <SyntheseComite pos={positivePoints} neg={concerns} />
      </Page>
    </Document>
  )
}

// ─── 10 MOIS ──────────────────────────────────────────────────────────────────

function TenMonthsDoc({
  member, ambassador, interviewDate, data, positivePoints, concerns,
}: {
  member: { full_name: string; company: string; activity: string; intro_date: string; chapter_name?: string }
  ambassador: string; interviewDate: string; data: FormData
  positivePoints?: string; concerns?: string
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PageFooter />
        <DocHeader title="RDV DE RENOUVELLEMENT BNI" />

        <InfoTable rows={[
          ['Prénom NOM', member.full_name],
          ['Entreprise', member.company],
          ['Localisation siège', data.company_location || ''],
          ['Nombre de salariés', n(data.employees_count)],
          ['Activité principale', member.activity],
          ['Ambassadeur Coach Business', ambassador],
          ['Date de l\'entretien', formatDate(interviewDate)],
        ]} />

        <Check label="Dossier BNI complété en ligne et en totalité" checked={!!data.dossier_completed} />
        <Check
          label="Le binôme Comité des Membres a conscience que la décision sera prise après consultation de l'ensemble du Comité"
          checked={!!data.aware_committee_decision}
        />

        <SectionTitle>Motivation à renouveler BNI</SectionTitle>
        <OpenText
          question="Quels sont les éléments qui te motivent à demander ton renouvellement ?"
          value={data.renewal_motivation}
        />

        <SectionTitle>Bilan BNI de l'année écoulée</SectionTitle>
        <MetricTable
          left={[
            ['Recommandations données', n(data.reco_given)],
            ['CA apporté au Groupe', n(data.ca_given, 'MAD')],
            ['TàT réalisés', n(data.tat_done)],
            ['Visiteurs', n(data.visitors)],
            ['Taux de présence', n(data.attendance_rate, '%')],
            ['Participation Comité pilotage', data.committee_participation ? 'Oui' : 'Non'],
          ]}
          right={[
            ['Recommandations reçues', n(data.reco_received)],
            ['CA reçu du Groupe', n(data.ca_received, 'MAD')],
          ]}
        />
        <OpenText
          question="Organisation interne pour le suivi des recommandations BNI :"
          value={data.recommendation_followup_org}
        />

        <SectionTitle>Actualités de l'entreprise et du membre</SectionTitle>
        <OpenText question="Quelles sont les évolutions de l'entreprise ?" value={data.company_evolutions} />
        <OpenText
          question="Quelle partie de l'activité génère le plus de chiffre d'affaires ?"
          value={data.main_revenue_activity}
        />

        <SectionTitle>BNI dans la stratégie d'entreprise</SectionTitle>
        <OpenText
          question="Quels sont tes objectifs business BNI pour l'année à venir ?"
          value={data.bni_objectives_next_year}
        />
        <Text style={s.note}>(i) Année 1 : Notoriété  &gt;  Année 2 : Crédibilité  &gt;  Année 3 : Profitabilité</Text>
        <OpenText
          question="Quels sont les 3 contacts à qui tu souhaites offrir l'opportunité de découvrir BNI ?"
          value={data.three_contacts_to_invite}
        />
        <OpenText question="Comment traiter le développement des affaires ? Quels moyens ?" value={data.business_development_approach} />
        <OpenText question="Que comptes-tu apporter au Groupe ?" value={data.contribution_to_group} />

        <SectionTitle>Ma vie de BNIste</SectionTitle>
        <Check label="Je m'engage à être présent ou suppléé(e)" checked />
        <LV label="Suppléant 1" value={[data.substituant1_name, data.substituant1_company, data.substituant1_phone].filter(Boolean).join(' – ')} />
        <LV label="Suppléant 2" value={[data.substituant2_name, data.substituant2_company, data.substituant2_phone].filter(Boolean).join(' – ')} />
        <Check label="Je m'engage à recommander mes co-membres" checked />
        <Check label="Je m'engage à inviter mon réseau en réunion BNI" checked />
        <Check label="Je m'engage à être professionnel, positif et constructif" checked />
        <Check label="Je m'engage à me former" checked />
        <Check label="Je certifie exercer conformément à mes obligations légales et professionnelles" checked />
        <Check label="Je certifie ne pas appartenir à un réseau incompatible" checked />
        <Check label="J'accepte que les réunions se déroulent en physique ou en online selon les conditions sanitaires" checked />

        <SectionTitle>Mon plan d'actions BNI</SectionTitle>
        <LV label="CA visé" value={n(data.plan_ca_target, 'MAD')} />
        <LV label="Recommandations à apporter" value={n(data.plan_reco_count)} />
        <LV label="Visiteurs attendus" value={n(data.plan_visitors_count)} />
        <LV label="TàT à réaliser" value={n(data.plan_tat_count)} />
        <LV label="MPB à apporter" value={String(data.plan_mpb || '')} />

        <Text style={[s.qLabel, { marginTop: 12 }]}>Mes 3 actions prioritaires :</Text>
        <View style={{ marginBottom: 2 }}>
          <View style={s.planHead}>
            <Text style={[s.planHeadCell, { flex: 1 }]}>Action</Text>
            <Text style={[s.planHeadCell, { width: 90 }]}>Deadline</Text>
          </View>
          {[
            [data.action1, data.action1_deadline],
            [data.action2, data.action2_deadline],
            [data.action3, data.action3_deadline],
          ].map(([action, deadline], i) => (
            <View key={i} style={s.planRow}>
              <Text style={[s.planCell, { flex: 1 }]}>{String(action || '')}</Text>
              <Text style={[s.planCell, { width: 90 }]}>{String(deadline || '')}</Text>
            </View>
          ))}
        </View>

        {data.workshop_commitment_date && (
          <Check
            label={`Je m'engage à exploiter l'opportunité atelier BNI (Date choisie : ${data.workshop_commitment_date})`}
            checked
          />
        )}

        <SectionTitle>Synthèse du Comité des Membres</SectionTitle>
        <LV label="Activité BNI confirmée" value={data.confirmed_bni_activity || ''} />
        <SyntheseComite pos={positivePoints} neg={concerns} />
      </Page>
    </Document>
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

type MemberInfo = {
  full_name: string; company: string; activity: string
  intro_date: string; chapter_name?: string
}

export async function generatePreboardingPdf(
  member: MemberInfo, ambassador: string, interviewDate: string, data: FormData
): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(
    <PreboardingDoc member={member} ambassador={ambassador} interviewDate={interviewDate} data={data} />
  ))
}

export async function generate3MonthsPdf(
  member: MemberInfo, ambassador: string, interviewDate: string, data: FormData,
  positivePoints?: string, concerns?: string
): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(
    <ThreeMonthsDoc member={member} ambassador={ambassador} interviewDate={interviewDate}
      data={data} positivePoints={positivePoints} concerns={concerns} />
  ))
}

export async function generate7MonthsPdf(
  member: MemberInfo, ambassador: string, interviewDate: string, data: FormData,
  positivePoints?: string, concerns?: string
): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(
    <SevenMonthsDoc member={member} ambassador={ambassador} interviewDate={interviewDate}
      data={data} positivePoints={positivePoints} concerns={concerns} />
  ))
}

export async function generate10MonthsPdf(
  member: MemberInfo, ambassador: string, interviewDate: string, data: FormData,
  positivePoints?: string, concerns?: string
): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(
    <TenMonthsDoc member={member} ambassador={ambassador} interviewDate={interviewDate}
      data={data} positivePoints={positivePoints} concerns={concerns} />
  ))
}
