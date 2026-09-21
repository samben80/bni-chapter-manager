import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import {
  Document, Page, View, Text, Image, StyleSheet, renderToBuffer,
} from '@react-pdf/renderer'
import { sphereColor } from './spheres'

export { SPHERE_COLORS, SPHERE_NAMES, sphereColor } from './spheres'

/**
 * Génération des documents de réunion BNI : Badges membres et Chevalets.
 *
 * Les deux formats reproduisent fidèlement les modèles fournis par le chapitre
 * (BNI Bouskoura). Les couleurs de sphère, la géométrie des badges et les textes
 * fixes du chevalet (Code de déontologie, Ordre du jour) sont issus des PDF
 * d'origine. La sortie est un Buffer PDF (téléchargement direct via une route).
 */

// ── Logo BNI (embarqué depuis /public, converti en data URL au chargement) ────
let BNI_LOGO = ''
try {
  const p = path.join(process.cwd(), 'public', 'bni-logo.png')
  BNI_LOGO = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64')
} catch {
  BNI_LOGO = ''
}

const BNI_RED = '#CF2030'

// ── Données d'entrée d'une personne à éditer ──────────────────────────────────
export interface DocPerson {
  first_name: string
  last_name: string
  company?: string | null
  activity?: string | null   // métier / profession
  sphere?: string | null     // libellé du bandeau (sphère ou rôle)
  city?: string | null       // ex. « Bouskoura » -> « BOUSKOURA, MA »
  logo?: string | null       // logo société (data URL ou chemin) — chevalet
  country?: string | null    // code pays affiché après la ville (défaut MA)
}

function cityLine(p: DocPerson): string {
  const city = (p.city || '').trim()
  const cc = (p.country || 'MA').trim()
  if (!city) return `BNI ${cc}`.trim()
  return `${city.toUpperCase()}, ${cc}`
}

function fullName(p: DocPerson): string {
  return `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim()
}

// ═══════════════════════════════════════════════════════════════════════════
//  BADGES — A4 portrait, 10 badges / page (2 colonnes × 5 lignes)
//  Géométrie reprise du modèle : boîte 254.6 × 152.5 pt, pas colonne 269.3,
//  pas ligne 158.75, marge haute 49.9 pt, marge gauche 7.4 pt.
// ═══════════════════════════════════════════════════════════════════════════

const BADGE = {
  boxW: 254.6, boxH: 152.5,
  colPitch: 269.3, rowPitch: 158.75,
  marginLeft: 7.4, marginTop: 49.9,
  // offsets verticaux (haut de la boîte -> haut de l'élément)
  cityTop: 12, nameTop: 46, companyTop: 66, activityTop: 80,
  bannerTop: 96, bannerH: 23.8,
  logoW: 72, logoH: 35,
}

const badgeStyles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', position: 'relative' },
  box: {
    position: 'absolute',
    width: BADGE.boxW, height: BADGE.boxH,
    borderWidth: 0.8, borderStyle: 'dashed', borderColor: '#AFAFAF',
    borderRadius: 3,
  },
  city: {
    position: 'absolute', top: BADGE.cityTop, left: 6, right: 6,
    fontSize: 10, fontFamily: 'Helvetica-Bold', color: BNI_RED,
    textAlign: 'center',
  },
  logo: {
    position: 'absolute', top: 8, right: 10,
    width: BADGE.logoW, height: BADGE.logoH, objectFit: 'contain',
  },
  name: {
    position: 'absolute', top: BADGE.nameTop, left: 8, right: 8,
    fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111111',
    textAlign: 'center',
  },
  company: {
    position: 'absolute', top: BADGE.companyTop, left: 8, right: 8,
    fontSize: 12, color: '#111111', textAlign: 'center',
  },
  activity: {
    position: 'absolute', top: BADGE.activityTop, left: 8, right: 8,
    fontSize: 10, color: '#333333', textAlign: 'center',
  },
  banner: {
    position: 'absolute', top: BADGE.bannerTop, left: 3.1, right: 3.1,
    height: BADGE.bannerH, alignItems: 'center', justifyContent: 'center',
  },
  bannerText: {
    fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#FFFFFF',
    textAlign: 'center',
  },
})

function Badge({ p, col, row }: { p: DocPerson; col: number; row: number }) {
  const left = BADGE.marginLeft + col * BADGE.colPitch
  const top = BADGE.marginTop + row * BADGE.rowPitch
  const color = sphereColor(p.sphere)
  const company = (p.company || '').trim()
  const activity = (p.activity || '').trim()
  return (
    <View style={[badgeStyles.box, { left, top }]}>
      <Text style={badgeStyles.city}>{cityLine(p)}</Text>
      {BNI_LOGO ? <Image style={badgeStyles.logo} src={BNI_LOGO} /> : null}
      <Text style={badgeStyles.name}>{fullName(p)}</Text>
      {company ? <Text style={badgeStyles.company}>{company}</Text> : null}
      {activity ? <Text style={badgeStyles.activity}>{activity}</Text> : null}
      {p.sphere ? (
        <View style={[badgeStyles.banner, { backgroundColor: color }]}>
          <Text style={badgeStyles.bannerText}>{p.sphere}</Text>
        </View>
      ) : null}
    </View>
  )
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

function BadgesDocument({ people }: { people: DocPerson[] }) {
  const pages = chunk(people, 10)
  return (
    <Document title="Badges membres BNI">
      {pages.map((group, pi) => (
        <Page key={pi} size="A4" style={badgeStyles.page}>
          {group.map((p, i) => (
            <Badge key={i} p={p} col={i % 2} row={Math.floor(i / 2)} />
          ))}
        </Page>
      ))}
    </Document>
  )
}

export async function generateBadgesPdf(people: DocPerson[]): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<BadgesDocument people={people} />))
}

// ═══════════════════════════════════════════════════════════════════════════
//  CHEVALETS — A4 paysage, 1 membre / page. Carte à plier au milieu.
//  Moitié basse : identité (face public). Moitié haute : pivotée 180°
//  (face membre) = Nom + Code de déontologie + Ordre du jour.
// ═══════════════════════════════════════════════════════════════════════════

export const CODE_DEONTOLOGIE: string[] = [
  'Je fournirai des produits ou services répondant aux critères de qualité et de prix précédemment annoncés.',
  'Je serai sincère envers mes Co-Membres et envers les personnes auprès desquelles ils m’auront recommandé.',
  'Je développerai confiance et bonne volonté dans mes relations avec mes Co-Membres et les personnes auprès desquelles ils m’auront recommandé.',
  'Je suivrai promptement chacune des recommandations que je recevrai.',
  'J’agirai conformément aux normes éthiques de ma profession.',
  'J’adopterai une attitude positive et constructive envers les Membres de BNI.',
]

export const ORDRE_DU_JOUR: string[] = [
  'Networking ouvert & Accueil des visiteurs.',
  'Accueil des participants et présentation des Comités',
  'Objectifs et vue d’ensemble de BNI.',
  'Formation et sensibilisation au travail en réseau.',
  'Présentation des « Membres les plus performants » du groupe',
  'Échange des coordonnées.',
  'Accueil des nouveaux membres et des membres renouvelés.',
  'Infomerciales',
  'Présentation des Visiteurs',
  'Compte-rendu du Vice-Président.',
  'Compte-rendu du Comité des Membres, autres comptes-rendus (CA, Coord. Evt, Coord. RS, CME)',
  'Annonces du Secrétaire Trésorier',
  'Conférence',
  'Tirage au sort du cadeau du conférencier',
  'Tour des contributions',
  'MPB et suivi des recos',
  'Compte-Rendu du Secrétaire Trésorier',
  'Intervention DC/DR',
  'Remerciements du Président aux Visiteurs & Remise du trophée de la meilleure infomerciale.',
  'Clôture',
]

const chevStyles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', position: 'relative' },
  half: { position: 'absolute', left: 0, right: 0, height: '50%' },
  foldLine: {
    position: 'absolute', left: 20, right: 20, top: '50%',
    borderTopWidth: 0.7, borderTopColor: '#BBBBBB', borderStyle: 'dashed',
  },

  // ── Moitié basse : identité ────────────────────────────────────────────────
  idWrap: { flex: 1, paddingHorizontal: 40, paddingTop: 24, paddingBottom: 0,
            alignItems: 'center', justifyContent: 'flex-start' },
  companyLogo: { position: 'absolute', left: 48, top: 40, width: 150, height: 90,
                 objectFit: 'contain' },
  cityBig: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: BNI_RED,
             marginBottom: 24 },
  nameBig: { fontSize: 40, fontFamily: 'Helvetica-Bold', color: '#111111',
             textAlign: 'center' },
  companyBig: { fontSize: 22, color: '#111111', textAlign: 'center', marginTop: 8 },
  activityBig: { fontSize: 18, color: '#222222', textAlign: 'center', marginTop: 2 },
  bannerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0,
                alignItems: 'center' },
  banner: { width: '100%', height: 46, borderTopLeftRadius: 24,
            borderTopRightRadius: 24, alignItems: 'center', justifyContent: 'center' },
  bannerTxt: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#FFFFFF',
               textAlign: 'center' },

  // ── Moitié haute : face membre (pivotée 180°) ──────────────────────────────
  readWrap: { flex: 1, transform: 'rotate(180deg)', paddingHorizontal: 26,
              paddingTop: 10, paddingBottom: 8 },
  readName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#111111',
              textAlign: 'center', marginBottom: 6 },
  boxesRow: { flexDirection: 'row', flex: 1, gap: 14 },
  box: { flex: 1, borderWidth: 0.8, borderColor: '#CCCCCC', borderRadius: 10,
         padding: 8 },
  boxOrdre: { flex: 1.4 },
  boxDeo: { flex: 1 },
  boxTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BNI_RED,
              textAlign: 'center', marginBottom: 5 },
  odjCols: { flexDirection: 'row', gap: 8 },
  odjCol: { flex: 1 },
  li: { flexDirection: 'row', marginBottom: 2.2 },
  liNum: { fontSize: 6.6, fontFamily: 'Helvetica-Bold', color: '#333',
           width: 15, flexShrink: 0 },
  liTxt: { fontSize: 6.6, color: '#222', flex: 1, lineHeight: 1.15 },
  deoLi: { flexDirection: 'row', marginBottom: 6 },
  deoNum: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#333',
            width: 14, flexShrink: 0 },
  deoTxt: { fontSize: 8.5, color: '#222', flex: 1, lineHeight: 1.2 },
})

function OrdreDuJour() {
  const half = Math.ceil(ORDRE_DU_JOUR.length / 2)
  const colA = ORDRE_DU_JOUR.slice(0, half)
  const colB = ORDRE_DU_JOUR.slice(half)
  const renderItem = (txt: string, idx: number) => (
    <View style={chevStyles.li} key={idx}>
      <Text style={chevStyles.liNum}>{idx + 1} -</Text>
      <Text style={chevStyles.liTxt}>{txt}</Text>
    </View>
  )
  return (
    <View style={[chevStyles.box, chevStyles.boxOrdre]}>
      <Text style={chevStyles.boxTitle}>ORDRE DU JOUR RÉUNION BNI</Text>
      <View style={chevStyles.odjCols}>
        <View style={chevStyles.odjCol}>{colA.map((t, i) => renderItem(t, i))}</View>
        <View style={chevStyles.odjCol}>{colB.map((t, i) => renderItem(t, i + half))}</View>
      </View>
    </View>
  )
}

function CodeDeontologie() {
  return (
    <View style={[chevStyles.box, chevStyles.boxDeo]}>
      <Text style={chevStyles.boxTitle}>CODE DE DÉONTOLOGIE BNI</Text>
      {CODE_DEONTOLOGIE.map((t, i) => (
        <View style={chevStyles.deoLi} key={i}>
          <Text style={chevStyles.deoNum}>{i + 1}.</Text>
          <Text style={chevStyles.deoTxt}>{t}</Text>
        </View>
      ))}
    </View>
  )
}

function Chevalet({ p }: { p: DocPerson }) {
  const color = sphereColor(p.sphere) || '#1D3D7A'
  const company = (p.company || '').trim()
  const activity = (p.activity || '').trim()
  return (
    <Page size="A4" orientation="landscape" style={chevStyles.page}>
      {/* Moitié haute — face membre, pivotée 180° */}
      <View style={[chevStyles.half, { top: 0 }]}>
        <View style={chevStyles.readWrap}>
          <Text style={chevStyles.readName}>{fullName(p)}</Text>
          <View style={chevStyles.boxesRow}>
            {/* Après rotation 180°, le 1er enfant passe à droite : on place le
                Code à gauche du flux pour qu'il s'affiche à droite, l'Ordre à
                gauche — conforme au modèle. */}
            <CodeDeontologie />
            <OrdreDuJour />
          </View>
        </View>
      </View>

      <View style={chevStyles.foldLine} />

      {/* Moitié basse — identité, face public */}
      <View style={[chevStyles.half, { bottom: 0 }]}>
        <View style={chevStyles.idWrap}>
          {p.logo ? <Image style={chevStyles.companyLogo} src={p.logo} /> : null}
          <Text style={chevStyles.cityBig}>{cityLine(p)}</Text>
          <Text style={chevStyles.nameBig}>{fullName(p)}</Text>
          {company ? <Text style={chevStyles.companyBig}>{company}</Text> : null}
          {activity ? <Text style={chevStyles.activityBig}>{activity}</Text> : null}
        </View>
        <View style={chevStyles.bannerWrap}>
          <View style={[chevStyles.banner, { backgroundColor: color }]}>
            <Text style={chevStyles.bannerTxt}>{p.sphere || ''}</Text>
          </View>
        </View>
      </View>
    </Page>
  )
}

function ChevaletsDocument({ people }: { people: DocPerson[] }) {
  return (
    <Document title="Chevalets BNI">
      {people.map((p, i) => <Chevalet key={i} p={p} />)}
    </Document>
  )
}

export async function generateChevaletsPdf(people: DocPerson[]): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<ChevaletsDocument people={people} />))
}
