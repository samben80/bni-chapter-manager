import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  Header, Footer, PageNumber, HeadingLevel, VerticalAlign,
  LevelFormat
} from 'docx'
import { formatDate } from './utils'
import type {
  Interview3MonthsFormData,
  Interview7MonthsFormData,
  Interview10MonthsFormData,
  PreboardingFormData
} from './types'

const BNI_RED = 'C0392B'
const BNI_DARK = '2C3E50'
const LIGHT_GRAY = 'F5F5F5'
const MID_GRAY = 'CCCCCC'

const border = { style: BorderStyle.SINGLE, size: 1, color: MID_GRAY }
const borders = { top: border, bottom: border, left: border, right: border }
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

function headerPara(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, color: 'FFFFFF', font: 'Arial' })],
    alignment: AlignmentType.CENTER,
    shading: { fill: BNI_RED, type: ShadingType.CLEAR },
    spacing: { before: 80, after: 80 },
  })
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: BNI_RED, font: 'Arial' })],
    spacing: { before: 200, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BNI_RED } }
  })
}

function labelValue(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 3600, type: WidthType.DXA },
        borders,
        shading: { fill: LIGHT_GRAY, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, size: 18, font: 'Arial' })]
        })]
      }),
      new TableCell({
        width: { size: 5760, type: WidthType.DXA },
        borders,
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: value || '', size: 18, font: 'Arial' })]
        })]
      }),
    ]
  })
}

function checkRow(label: string, checked: boolean): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: checked ? '☑  ' : '☐  ', size: 20, font: 'Arial' }),
      new TextRun({ text: label, size: 20, font: 'Arial' }),
    ],
    spacing: { before: 60, after: 60 },
  })
}

function metricTable(leftItems: [string, string][], rightItems: [string, string][]): Table {
  const maxRows = Math.max(leftItems.length, rightItems.length)
  const rows: TableRow[] = []

  rows.push(new TableRow({
    children: [
      new TableCell({
        width: { size: 4500, type: WidthType.DXA },
        borders,
        shading: { fill: BNI_RED, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: 'CE QUE J\'AI DONNÉ AU GROUPE', bold: true, size: 18, color: 'FFFFFF', font: 'Arial' })],
          alignment: AlignmentType.CENTER
        })]
      }),
      new TableCell({
        width: { size: 4500, type: WidthType.DXA },
        borders,
        shading: { fill: BNI_DARK, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: 'CE QUE J\'AI REÇU DU GROUPE', bold: true, size: 18, color: 'FFFFFF', font: 'Arial' })],
          alignment: AlignmentType.CENTER
        })]
      }),
    ]
  }))

  for (let i = 0; i < maxRows; i++) {
    const left = leftItems[i] || ['', '']
    const right = rightItems[i] || ['', '']
    rows.push(new TableRow({
      children: [
        new TableCell({
          width: { size: 4500, type: WidthType.DXA },
          borders,
          margins: { top: 40, bottom: 40, left: 120, right: 120 },
          children: [new Paragraph({
            children: [
              new TextRun({ text: left[0] ? `• ${left[0]} : ` : '', size: 18, font: 'Arial' }),
              new TextRun({ text: left[1], bold: true, size: 18, font: 'Arial' }),
            ]
          })]
        }),
        new TableCell({
          width: { size: 4500, type: WidthType.DXA },
          borders,
          margins: { top: 40, bottom: 40, left: 120, right: 120 },
          children: [new Paragraph({
            children: [
              new TextRun({ text: right[0] ? `• ${right[0]} : ` : '', size: 18, font: 'Arial' }),
              new TextRun({ text: right[1], bold: true, size: 18, font: 'Arial' }),
            ]
          })]
        }),
      ]
    }))
  }

  return new Table({ width: { size: 9000, type: WidthType.DXA }, columnWidths: [4500, 4500], rows })
}

function openTextBlock(question: string, value?: string): Paragraph[] {
  return [
    new Paragraph({
      children: [new TextRun({ text: question, bold: true, size: 20, font: 'Arial', color: BNI_DARK })],
      spacing: { before: 120, after: 60 }
    }),
    new Paragraph({
      children: [new TextRun({ text: value || '', size: 20, font: 'Arial' })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: MID_GRAY } },
      spacing: { after: 60 }
    }),
    new Paragraph({
      children: [new TextRun({ text: '', size: 20, font: 'Arial' })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: MID_GRAY } },
      spacing: { after: 60 }
    }),
  ]
}

function confidentialFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [new TextRun({ text: 'Document confidentiel – Usage interne BNI Maroc', size: 16, color: '888888', font: 'Arial', italics: true })],
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: MID_GRAY } }
      })
    ]
  })
}

function bniHeader(title: string): Header {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: 'BNI MAROC', bold: true, size: 24, color: BNI_RED, font: 'Arial' }),
          new TextRun({ text: '  |  ', size: 24, color: MID_GRAY, font: 'Arial' }),
          new TextRun({ text: title, size: 24, color: BNI_DARK, font: 'Arial' }),
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BNI_RED } }
      })
    ]
  })
}

// ─── PREBOARDING ────────────────────────────────────────────────────────────

export async function generatePreboardingDoc(
  member: { full_name: string; company: string; activity: string; intro_date: string; chapter_name?: string },
  ambassador: string,
  interviewDate: string,
  data: PreboardingFormData
): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
        }
      },
      headers: { default: bniHeader('Entretien Pré-boarding') },
      footers: { default: confidentialFooter() },
      children: [
        headerPara('ENTRETIEN PRÉ-BOARDING — AMBASSADEUR ON BOARDING'),
        new Paragraph({ children: [], spacing: { after: 120 } }),

        // Identité
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [3600, 5400],
          rows: [
            labelValue('Prénom NOM', member.full_name),
            labelValue('Entreprise', member.company),
            labelValue('Activité principale', member.activity),
            labelValue('Date d\'intronisation', formatDate(member.intro_date)),
            labelValue('Nom du chapitre', member.chapter_name || ''),
            labelValue('Ambassadeur On Boarding', ambassador),
            labelValue('Date de l\'entretien', formatDate(interviewDate)),
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 160 } }),
        sectionTitle('PRÉSENTATION DU PARCOURS D\'INTÉGRATION'),

        ...openTextBlock('Besoins spécifiques identifiés :', data.specific_needs),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('MENTORAT'),
        checkRow('Un mentor a été attribué au nouveau membre', data.mentor_assigned),
        new Paragraph({
          children: [new TextRun({ text: `Nom du mentor : ${data.mentor_name || '___________________________'}`, size: 20, font: 'Arial' })],
          spacing: { before: 80, after: 80 }
        }),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('DOCUMENTS REMIS'),
        checkRow('Guide de bienvenue BNI', true),
        checkRow('Calendrier des prochaines réunions', true),
        checkRow('Guide du programme de mentorat', true),
        checkRow('Accès à BNI Connect', true),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('ÉTAPES À VENIR'),
        new Paragraph({
          children: [new TextRun({ text: '• Semaine 1-4 : Programme de mentorat avec votre mentor désigné', size: 18, font: 'Arial' })],
          spacing: { before: 60, after: 40 }
        }),
        new Paragraph({
          children: [new TextRun({ text: '• Mois 1-2 : Complétion du PRM initial et avancé', size: 18, font: 'Arial' })],
          spacing: { before: 40, after: 40 }
        }),
        new Paragraph({
          children: [new TextRun({ text: '• Fin du 3ème mois : Entretien bilan 3 mois avec votre Ambassadeur', size: 18, font: 'Arial' })],
          spacing: { before: 40, after: 40 }
        }),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('NOTES AMBASSADEUR'),
        ...openTextBlock('', data.notes),

        new Paragraph({ children: [], spacing: { after: 200 } }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Signature Ambassadeur : ___________________________      ', size: 18, font: 'Arial' }),
            new TextRun({ text: 'Signature Membre : ___________________________', size: 18, font: 'Arial' }),
          ],
          spacing: { before: 200 }
        }),
      ]
    }]
  })

  return await Packer.toBuffer(doc)
}

// ─── 3 MOIS ─────────────────────────────────────────────────────────────────

export async function generate3MonthsDoc(
  member: { full_name: string; company: string; activity: string; intro_date: string; chapter_name?: string },
  ambassador: string,
  interviewDate: string,
  data: Interview3MonthsFormData
): Promise<Buffer> {
  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
        }
      },
      headers: { default: bniHeader('Entretien 3 Mois') },
      footers: { default: confidentialFooter() },
      children: [
        headerPara('ENTRETIEN 3 MOIS — AMBASSADEUR ON BOARDING'),
        new Paragraph({ children: [], spacing: { after: 120 } }),

        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [3600, 5400],
          rows: [
            labelValue('Prénom NOM', member.full_name),
            labelValue('Entreprise', member.company),
            labelValue('Activité principale', member.activity),
            labelValue('Date d\'intronisation', formatDate(member.intro_date)),
            labelValue('Nom du chapitre', member.chapter_name || ''),
            labelValue('Ambassadeur On Boarding', ambassador),
            labelValue('Date de l\'entretien', formatDate(interviewDate)),
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 60 } }),
        checkRow('Dossier BNI complété en ligne et en totalité', data.dossier_completed),
        checkRow('Le binôme Ambassadeur a conscience que la décision sera partagée avec le Comité des Membres', data.aware_committee_decision),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('BILAN DES 3 PREMIERS MOIS'),
        new Paragraph({
          children: [new TextRun({ text: `Période du bilan : du ${data.period_from || '___________'} au ${data.period_to || '___________'}`, size: 18, font: 'Arial' })],
          spacing: { before: 80, after: 100 }
        }),

        metricTable(
          [
            ['Recommandations données', String(data.reco_given ?? '')],
            ['Visiteurs invités', String(data.visitors_invited ?? '')],
            ['TàT réalisés', String(data.tat_done ?? '')],
            ['Taux de présence', data.attendance_rate ? `${data.attendance_rate}%` : ''],
            ['CA apporté au Groupe', data.ca_given ? `${data.ca_given} MAD` : ''],
          ],
          [
            ['Recommandations reçues', String(data.reco_received ?? '')],
            ['CA reçu du Groupe', data.ca_received ? `${data.ca_received} MAD` : ''],
            ['', ''], ['', ''], ['', ''],
          ]
        ),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('CHECKLIST ENTRETIEN 3 MOIS'),
        checkRow('Le programme de mentorat a été réalisé dans sa totalité', data.mentoring_completed),
        checkRow('Le PRM initial (de base) a été complété', data.prm_initial_done),
        checkRow('Le PRM Avancé a été réalisé', data.prm_advanced_done),
        checkRow('Le membre a donné sa 1ère recommandation', data.first_reco_given),
        checkRow('Le membre a reçu sa 1ère recommandation', data.first_reco_received),
        checkRow('Le membre a réalisé au moins une infomerciale structurée', data.structured_infomercial_done),
        checkRow('Le membre connaît son score IDP et ses indicateurs', data.knows_idp_score),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('RESSENTI & INTÉGRATION'),
        ...openTextBlock('Qu\'est-ce que BNI t\'a apporté depuis ton intronisation ?', data.bni_brought),
        ...openTextBlock('Qu\'est-ce que tu voudrais améliorer ou obtenir davantage ?', data.wants_to_improve),
        new Paragraph({
          children: [new TextRun({ text: `Ressenti général sur le groupe (note de 1 à 10) : ${data.general_feeling ?? '___'}`, size: 20, font: 'Arial' })],
          spacing: { before: 80, after: 80 }
        }),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('LE PROJET BNI DANS TA STRATÉGIE'),
        ...openTextBlock('Quelle partie de ton activité génère le plus de chiffre d\'affaires ?', data.main_revenue_activity),
        ...openTextBlock('Comment BNI peut contribuer au développement de ton entreprise sur les 3 prochaines années ?', data.bni_contribution_strategy),
        new Paragraph({
          children: [new TextRun({ text: 'ℹ  Année 1 : Notoriété  >  Année 2 : Crédibilité  >  Année 3 : Profitabilité', size: 16, italics: true, color: '888888', font: 'Arial' })],
          spacing: { before: 40, after: 80 }
        }),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('MA VIE DE BNISTE'),
        checkRow('Je m\'engage à être présent ou suppléé(e)', true),
        new Paragraph({
          children: [new TextRun({ text: `Suppléant 1 : ${data.substituant1_name || ''} – ${data.substituant1_company || ''} – ${data.substituant1_phone || ''}`, size: 18, font: 'Arial' })],
          spacing: { before: 60, after: 40 }, indent: { left: 360 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Suppléant 2 : ${data.substituant2_name || ''} – ${data.substituant2_company || ''} – ${data.substituant2_phone || ''}`, size: 18, font: 'Arial' })],
          spacing: { before: 40, after: 60 }, indent: { left: 360 }
        }),
        checkRow('Je m\'engage à recommander mes co-membres', true),
        checkRow('Je m\'engage à inviter mon réseau en réunion BNI', true),
        checkRow('Je m\'engage à être professionnel, positif et constructif', true),
        checkRow('Je m\'engage à me former', true),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('SYNTHÈSE AMBASSADEUR'),
        new Paragraph({
          children: [new TextRun({ text: `Activité BNI confirmée : ${data.confirmed_bni_activity || '___________________________'}`, size: 20, font: 'Arial' })],
          spacing: { before: 80, after: 80 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Date de l'entretien : ${formatDate(interviewDate)}`, size: 20, font: 'Arial' })],
          spacing: { before: 40, after: 120 }
        }),

        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [4500, 4500],
          rows: [
            new TableRow({ children: [
              new TableCell({ width: { size: 9000, type: WidthType.DXA }, columnSpan: 2, borders,
                shading: { fill: BNI_DARK, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'AVIS DU COMITÉ DES MEMBRES', bold: true, color: 'FFFFFF', size: 20, font: 'Arial' })], alignment: AlignmentType.CENTER })]
              })
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: `Participant 1 : `, bold: true, size: 18, font: 'Arial' }), new TextRun({ text: '', size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: `Participant 2 : `, bold: true, size: 18, font: 'Arial' }), new TextRun({ text: '', size: 18, font: 'Arial' })] })]
              }),
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders,
                shading: { fill: '#E8F5E9', type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Points positifs :', bold: true, size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders,
                shading: { fill: '#FFF3E0', type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Points d\'interrogation :', bold: true, size: 18, font: 'Arial' })] })]
              }),
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: '', size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: '', size: 18, font: 'Arial' })] })]
              }),
            ]}),
          ]
        }),
      ]
    }]
  })

  return await Packer.toBuffer(doc)
}

// ─── 7 MOIS ─────────────────────────────────────────────────────────────────

export async function generate7MonthsDoc(
  member: { full_name: string; company: string; activity: string; intro_date: string; chapter_name?: string },
  ambassador: string,
  interviewDate: string,
  data: Interview7MonthsFormData
): Promise<Buffer> {
  const monthsSince = member.intro_date
    ? Math.floor((Date.now() - new Date(member.intro_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : 0

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
        }
      },
      headers: { default: bniHeader('RDV Accompagnement 7 Mois') },
      footers: { default: confidentialFooter() },
      children: [
        headerPara('RDV D\'ACCOMPAGNEMENT — 7 MOIS'),
        new Paragraph({
          children: [new TextRun({ text: 'Objectif : Améliorer ton expérience et ton retour sur investissement chez BNI', size: 18, italics: true, color: '555555', font: 'Arial' })],
          alignment: AlignmentType.CENTER, spacing: { before: 80, after: 120 }
        }),

        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [3600, 5400],
          rows: [
            labelValue('Prénom NOM', member.full_name),
            labelValue('Entreprise', member.company),
            labelValue('Activité principale', member.activity),
            labelValue('Date d\'intronisation', formatDate(member.intro_date)),
            labelValue('Nombre de mois BNI', String(monthsSince)),
            labelValue('Ambassadeur Coach Business', ambassador),
            labelValue('Date de l\'entretien', formatDate(interviewDate)),
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('BILAN BNI DE L\'ANNÉE ÉCOULÉE'),
        new Paragraph({
          children: [new TextRun({ text: `Période du bilan (12 mois) : du ${data.period_from || '___________'} au ${data.period_to || '___________'}`, size: 18, font: 'Arial' })],
          spacing: { before: 80, after: 100 }
        }),

        metricTable(
          [
            ['Nombre de réunions sur l\'année', String(data.meetings_count ?? '')],
            ['Nombre d\'absences / suppléances', String(data.absences_count ?? '')],
            ['Recommandations données', String(data.reco_given ?? '')],
            ['Visiteurs invités', String(data.visitors_invited ?? '')],
            ['TàT réalisés', String(data.tat_done ?? '')],
            ['Chiffre d\'affaires donné', data.ca_given ? `${data.ca_given} MAD` : ''],
          ],
          [
            ['Recommandations reçues', String(data.reco_received ?? '')],
            ['  dont internes', String(data.reco_received_internal ?? '')],
            ['  dont externes', String(data.reco_received_external ?? '')],
            ['CA reçu (6 mois)', data.ca_received_6m ? `${data.ca_received_6m} MAD` : ''],
            ['CA reçu (12 mois)', data.ca_received_12m ? `${data.ca_received_12m} MAD` : ''],
            ['Depuis l\'intronisation', data.ca_received_total ? `${data.ca_received_total} MAD` : ''],
          ]
        ),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('RESSENTI & SATISFACTION'),
        new Paragraph({
          children: [new TextRun({ text: 'Qu\'est-ce que BNI t\'a apporté de positif ?', bold: true, size: 20, font: 'Arial' })],
          spacing: { before: 80, after: 60 }
        }),
        ...(data.bni_positive || []).map(item => checkRow(item, true)),
        ...openTextBlock('Autres apports :', data.other_benefits),
        new Paragraph({
          children: [new TextRun({ text: `Ressenti général sur le groupe (1 à 10) : ${data.general_feeling ?? '___'}`, size: 20, font: 'Arial' })],
          spacing: { before: 80, after: 80 }
        }),
        ...openTextBlock('Qu\'est-ce que tu voudrais obtenir / améliorer ?', data.wants_to_improve),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('ANALYSE BUSINESS'),
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [3600, 5400],
          rows: [
            labelValue('Panier moyen entreprise', data.average_basket ? `${data.average_basket} MAD` : ''),
            labelValue('CA moyen BNI', data.bni_avg_ca ? `${data.bni_avg_ca} MAD` : ''),
            labelValue('Taux de conversion BNI', data.conversion_rate ? `${data.conversion_rate}%` : ''),
            labelValue('Causes de non conversion', data.non_conversion_causes || ''),
            labelValue('Mes apporteurs principaux', data.main_contributors || ''),
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('MON PROJET D\'ENTREPRISE'),
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [3600, 5400],
          rows: [
            labelValue('Activité BNI retenue', data.bni_activity || ''),
            labelValue('Mon client top (cible)', data.top_client_profile || ''),
            labelValue('L\'offre que je préfère développer via BNI', data.preferred_offer || ''),
          ]
        }),
        ...openTextBlock('Mes projets d\'entreprise à venir :', data.company_projects),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('OBJECTIFS BNI'),
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [3600, 5400],
          rows: [
            labelValue('Objectif CA année en cours', data.ca_objective_current ? `${data.ca_objective_current} MAD` : ''),
            labelValue('Écart objectif / CA réalisé', data.ca_gap ? `${data.ca_gap} MAD` : ''),
            labelValue('Objectif CA N+1', data.ca_objective_n1 ? `${data.ca_objective_n1} MAD` : ''),
            labelValue('Activités / profils recherchés', data.profiles_sought || ''),
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('ACTIONS POUR ATTEINDRE LES OBJECTIFS'),
        ...openTextBlock('Propositions de l\'Ambassadeur :', data.ambassador_proposals),
        new Paragraph({
          children: [new TextRun({ text: 'Objectifs pour le prochain trimestre :', bold: true, size: 20, font: 'Arial' })],
          spacing: { before: 100, after: 60 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `• Recommandations à donner : ${data.reco_target ?? '___'}`, size: 18, font: 'Arial' })],
          spacing: { before: 40, after: 40 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `• Visiteurs à inviter : ${data.visitors_target ?? '___'}`, size: 18, font: 'Arial' })],
          spacing: { before: 40, after: 40 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `• Score IDP visé : ${data.idp_target || '___'}`, size: 18, font: 'Arial' })],
          spacing: { before: 40, after: 80 }
        }),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('SYNTHÈSE AMBASSADEUR COACH BUSINESS'),

        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [4500, 4500],
          rows: [
            new TableRow({ children: [
              new TableCell({ width: { size: 9000, type: WidthType.DXA }, columnSpan: 2, borders,
                shading: { fill: BNI_DARK, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'AVIS DU COMITÉ DES MEMBRES', bold: true, color: 'FFFFFF', size: 20, font: 'Arial' })], alignment: AlignmentType.CENTER })]
              })
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Participant 1 :', bold: true, size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Participant 2 :', bold: true, size: 18, font: 'Arial' })] })]
              }),
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders,
                shading: { fill: 'E8F5E9', type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Points positifs :', bold: true, size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders,
                shading: { fill: 'FFF3E0', type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Points d\'interrogation :', bold: true, size: 18, font: 'Arial' })] })]
              }),
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: '', size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: '', size: 18, font: 'Arial' })] })]
              }),
            ]}),
          ]
        }),
      ]
    }]
  })

  return await Packer.toBuffer(doc)
}

// ─── 10 MOIS ─────────────────────────────────────────────────────────────────

export async function generate10MonthsDoc(
  member: { full_name: string; company: string; activity: string; intro_date: string; chapter_name?: string },
  ambassador: string,
  interviewDate: string,
  data: Interview10MonthsFormData
): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
        }
      },
      headers: { default: bniHeader('RDV Renouvellement 10 Mois') },
      footers: { default: confidentialFooter() },
      children: [
        headerPara('RDV DE RENOUVELLEMENT BNI'),
        new Paragraph({ children: [], spacing: { after: 120 } }),

        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [3600, 5400],
          rows: [
            labelValue('Prénom NOM', member.full_name),
            labelValue('Entreprise', member.company),
            labelValue('Localisation siège social', data.company_location || ''),
            labelValue('Nombre de salariés', String(data.employees_count ?? '')),
            labelValue('Activité principale', member.activity),
            labelValue('Ambassadeur Coach Business', ambassador),
            labelValue('Date de l\'entretien', formatDate(interviewDate)),
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 60 } }),
        checkRow('Dossier BNI complété en ligne et en totalité', data.dossier_completed),
        checkRow('Le binôme Comité des Membres a conscience que la décision sera prise après consultation de l\'ensemble du Comité des Membres', data.aware_committee_decision),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('MOTIVATION À RENOUVELER BNI'),
        ...openTextBlock('Quels sont les éléments qui te motivent à demander ton renouvellement ?', data.renewal_motivation),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('BILAN BNI DE L\'ANNÉE ÉCOULÉE'),
        new Paragraph({
          children: [new TextRun({ text: `Période du bilan (12 mois) : du ${data.period_from || '___________'} au ${data.period_to || '___________'}`, size: 18, font: 'Arial' })],
          spacing: { before: 80, after: 100 }
        }),

        metricTable(
          [
            ['Recommandations données', String(data.reco_given ?? '')],
            ['CA apporté au Groupe', data.ca_given ? `${data.ca_given} MAD` : ''],
            ['TàT réalisés', String(data.tat_done ?? '')],
            ['Visiteurs', String(data.visitors ?? '')],
            ['Taux de présence', data.attendance_rate ? `${data.attendance_rate}%` : ''],
            ['Participation Comité pilotage', data.committee_participation ? 'Oui' : 'Non'],
          ],
          [
            ['Recommandations reçues', String(data.reco_received ?? '')],
            ['CA reçu du Groupe', data.ca_received ? `${data.ca_received} MAD` : ''],
            ['', ''], ['', ''], ['', ''], ['', ''],
          ]
        ),

        ...openTextBlock('Organisation interne pour le suivi des recommandations BNI :', data.recommendation_followup_org),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('ACTUALITÉS DE L\'ENTREPRISE ET DU MEMBRE'),
        ...openTextBlock('Quelles sont les évolutions de l\'entreprise ?', data.company_evolutions),
        ...openTextBlock('Quelle partie de l\'activité génère, actuellement, le plus de chiffre d\'affaires ?', data.main_revenue_activity),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('BNI DANS LA STRATÉGIE D\'ENTREPRISE'),
        ...openTextBlock('Quels sont tes objectifs business BNI pour l\'année à venir ?', data.bni_objectives_next_year),
        new Paragraph({
          children: [new TextRun({ text: 'ℹ  Année 1 : Notoriété  >  Année 2 : Crédibilité  >  Année 3 : Profitabilité', size: 16, italics: true, color: '888888', font: 'Arial' })],
          spacing: { before: 40, after: 80 }
        }),
        ...openTextBlock('Quels sont les 3 contacts à qui tu souhaites offrir l\'opportunité de découvrir BNI ?', data.three_contacts_to_invite),
        ...openTextBlock('Comment traiter le développement des affaires ? Quels moyens ?', data.business_development_approach),
        ...openTextBlock('Que comptes-tu apporter au Groupe ?', data.contribution_to_group),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('MA VIE DE BNISTE'),
        checkRow('Je m\'engage à être présent ou suppléé(e)', true),
        new Paragraph({
          children: [new TextRun({ text: `Suppléant 1 : ${data.substituant1_name || ''} – ${data.substituant1_company || ''} – ${data.substituant1_phone || ''}`, size: 18, font: 'Arial' })],
          spacing: { before: 60, after: 40 }, indent: { left: 360 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Suppléant 2 : ${data.substituant2_name || ''} – ${data.substituant2_company || ''} – ${data.substituant2_phone || ''}`, size: 18, font: 'Arial' })],
          spacing: { before: 40, after: 60 }, indent: { left: 360 }
        }),
        checkRow('Je m\'engage à recommander mes co-membres', true),
        checkRow('Je m\'engage à inviter mon réseau en réunion BNI', true),
        checkRow('Je m\'engage à être professionnel, positif et constructif', true),
        checkRow('Je m\'engage à me former', true),
        checkRow('Je certifie exercer conformément à mes obligations légales et professionnelles', true),
        checkRow('Je certifie ne pas appartenir à un réseau incompatible', true),
        checkRow('J\'accepte que les réunions se déroulent en physique ou en online selon les conditions sanitaires', true),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('MON PLAN D\'ACTIONS BNI'),

        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [3600, 5400],
          rows: [
            labelValue('CA visé', data.plan_ca_target ? `${data.plan_ca_target} MAD` : ''),
            labelValue('Recommandations à apporter', String(data.plan_reco_count ?? '')),
            labelValue('Visiteurs attendus', String(data.plan_visitors_count ?? '')),
            labelValue('TàT à réaliser', String(data.plan_tat_count ?? '')),
            labelValue('MPB à apporter', data.plan_mpb || ''),
          ]
        }),

        new Paragraph({ children: [new TextRun({ text: 'Mes 3 actions prioritaires :', bold: true, size: 20, font: 'Arial' })], spacing: { before: 120, after: 80 } }),
        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [6300, 2700],
          rows: [
            new TableRow({ children: [
              new TableCell({ width: { size: 6300, type: WidthType.DXA }, borders, shading: { fill: BNI_DARK, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Action', bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 2700, type: WidthType.DXA }, borders, shading: { fill: BNI_DARK, type: ShadingType.CLEAR }, margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Deadline', bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })] })]
              }),
            ]}),
            ...[
              [data.action1, data.action1_deadline],
              [data.action2, data.action2_deadline],
              [data.action3, data.action3_deadline],
            ].map(([action, deadline]) => new TableRow({ children: [
              new TableCell({ width: { size: 6300, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: action || '', size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 2700, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: deadline || '', size: 18, font: 'Arial' })] })]
              }),
            ]})),
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        checkRow(`Je m'engage à exploiter l'opportunité atelier BNI (Date choisie : ${data.workshop_commitment_date || '___________'})`, !!data.workshop_commitment_date),

        new Paragraph({ children: [], spacing: { after: 120 } }),
        sectionTitle('SYNTHÈSE DU COMITÉ DES MEMBRES'),
        new Paragraph({
          children: [new TextRun({ text: `Activité BNI confirmée : ${data.confirmed_bni_activity || '___________________________'}`, size: 20, font: 'Arial' })],
          spacing: { before: 80, after: 120 }
        }),

        new Table({
          width: { size: 9000, type: WidthType.DXA },
          columnWidths: [4500, 4500],
          rows: [
            new TableRow({ children: [
              new TableCell({ width: { size: 9000, type: WidthType.DXA }, columnSpan: 2, borders,
                shading: { fill: BNI_DARK, type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'AVIS DU COMITÉ DES MEMBRES', bold: true, color: 'FFFFFF', size: 20, font: 'Arial' })], alignment: AlignmentType.CENTER })]
              })
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Participant 1 :', bold: true, size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Participant 2 :', bold: true, size: 18, font: 'Arial' })] })]
              }),
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, shading: { fill: 'E8F5E9', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Points positifs :', bold: true, size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, shading: { fill: 'FFF3E0', type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: 'Points d\'interrogation :', bold: true, size: 18, font: 'Arial' })] })]
              }),
            ]}),
            new TableRow({ children: [
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 120, bottom: 120, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: '', size: 18, font: 'Arial' })] })]
              }),
              new TableCell({ width: { size: 4500, type: WidthType.DXA }, borders, margins: { top: 120, bottom: 120, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: '', size: 18, font: 'Arial' })] })]
              }),
            ]}),
          ]
        }),
      ]
    }]
  })

  return await Packer.toBuffer(doc)
}
