/**
 * Configuración de Feature Flags para migración gradual
 * Permite habilitar/deshabilitar nuevas utilidades de fechas
 */

export const FEATURE_FLAGS = {
  // Control principal para nuevas utilidades de fecha
  USE_NEW_DATE_UTILS: process.env.USE_NEW_DATE_UTILS === 'true',
  
  // Control específico para componentes críticos
  USE_DATE_UTILS_IN_DISPONIBILIDAD: process.env.USE_DATE_UTILS_IN_DISPONIBILIDAD === 'true',
  USE_DATE_UTILS_IN_CALENDAR: process.env.USE_DATE_UTILS_IN_CALENDAR === 'true',
  USE_DATE_UTILS_IN_TURNS: process.env.USE_DATE_UTILS_IN_TURNS === 'true',
  
  // Control de modo de migración
  DATE_UTILS_MIGRATION_MODE: process.env.DATE_UTILS_MIGRATION_MODE || 'safe', // 'safe' | 'aggressive'
  
  // Logging y debugging
  ENABLE_DATE_LOGGING: process.env.ENABLE_DATE_LOGGING === 'true',
  DATE_LOG_LEVEL: process.env.DATE_LOG_LEVEL || 'info' // 'debug' | 'info' | 'warn' | 'error'
};

/**
 * Verifica si un feature flag está activo
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return Boolean(FEATURE_FLAGS[flag]);
}

/**
 * Logging condicional para debugging de fechas
 */
export function logDate(message: string, data?: any, level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
  if (!isFeatureEnabled('ENABLE_DATE_LOGGING')) return;
  
  const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = logLevels[FEATURE_FLAGS.DATE_LOG_LEVEL as keyof typeof logLevels] ?? 1;
  const messageLevel = logLevels[level];
  
  if (messageLevel >= currentLevel) {
    console.log(`🔍 [DateUtils] ${message}`, data || '');
  }
}
