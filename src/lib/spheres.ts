/**
 * Sphères officielles BNI et leur code couleur (bandeau des badges & chevalets).
 * Module sans dépendance serveur : importable côté client comme côté serveur.
 * Couleurs extraites des modèles de badges fournis par le chapitre.
 */
export const SPHERE_COLORS: Record<string, string> = {
  'Conseils & services aux entreprises': '#1D3D7A',
  'Communication': '#74398E',
  'Santé / Bien-être': '#3FA535',
  'Construction': '#B22222',
  'Informatique et télécom': '#D72329',
  'Vente au détail / B2C / ...': '#F39207',
  'Immobilier': '#6F462B',
  'RH & formation': '#FED700',
  'Finances': '#5F5B5C',
  // Rôle particulier (bandeau rouge BNI)
  'Ambassadeur': '#CF2031',
}

export const SPHERE_NAMES = Object.keys(SPHERE_COLORS)

/** Repli (rôle/sphère non listé) : rouge BNI. */
export const DEFAULT_BANNER = '#CF2031'

/** Couleur du bandeau pour une sphère/rôle donné(e) ; '' si vide. */
export function sphereColor(sphere?: string | null): string {
  if (!sphere) return ''
  return SPHERE_COLORS[sphere.trim()] ?? DEFAULT_BANNER
}
