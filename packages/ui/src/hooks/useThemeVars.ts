/**
 * Hook for accessing shadcn theme variables in UI components
 * Provides typed access to theme colors and ensures consistency
 */

/**
 * Hook to access shadcn theme variables with type safety
 * Returns functions to get theme-aware color values
 */
export const useThemeVars = () => {

  /**
   * Get a shadcn theme variable value
   */
  const getThemeVariable = (variableName: string): string => {
    return `var(--shadcn-${variableName})`;
  };

  /**
   * Get academic entity color mapping
   */
  const getEntityColor = (entityType: string): string => {
    const entityColors: Record<string, string> = {
      works: 'blue',
      authors: 'green',
      sources: 'violet',
      institutions: 'orange',
      concepts: 'pink',
      topics: 'red',
      publishers: 'teal',
      funders: 'cyan',
      keywords: 'zinc',
    };

    return getThemeVariable(entityColors[entityType] || 'gray');
  };

  /**
   * Get semantic color with fallback
   */
  const getSemanticColor = (colorType: 'primary' | 'secondary' | 'muted' | 'destructive' | 'success' | 'warning'): string => {
    return getThemeVariable(colorType);
  };

  return {
    getThemeVar: getThemeVariable,
    getEntityColor,
    getSemanticColor,

    // Pre-defined semantic variables
    foreground: getThemeVariable('foreground'),
    mutedForeground: getThemeVariable('muted-foreground'),
    background: getThemeVariable('background'),
    muted: getThemeVariable('muted'),
    border: getThemeVariable('border'),
    primary: getThemeVariable('primary'),
    secondary: getThemeVariable('secondary'),
    destructive: getThemeVariable('destructive'),
    success: getThemeVariable('success'),
    warning: getThemeVariable('warning'),

    // Academic entity colors
    work: getEntityColor('works'),
    author: getEntityColor('authors'),
    source: getEntityColor('sources'),
    institution: getEntityColor('institutions'),
    concept: getEntityColor('concepts'),
    topic: getEntityColor('topics'),
    publisher: getEntityColor('publishers'),
    funder: getEntityColor('funders'),
    keyword: getEntityColor('keywords'),
  };
};