const Palette = {
    sage: '#A4B69D',
    sageLight: '#B7C4B0',
    sageDark: '#4F6352', // Active tab green from image
    olive: '#6E7A66',
    blueGreen: '#A4B69D',
    beige: '#E3E3CC', // Main background from image
    beigeLight: '#EFF0E1', // Nav bubble
    leafGreen: '#789370',
    darkGreen: '#2D3A26',
    white: '#FFFFFF',

    // Computed variants
    cardBackground: '#A4B69D',
    mainBackground: '#E3E3CC',
};

export const Colors = {
    // Base Palette
    theme: Palette,

    // Semantic Roles
    primary: Palette.darkGreen,
    background: Palette.mainBackground,
    card: Palette.cardBackground,

    text: '#FFFFFF',
    textDark: Palette.sageDark,
    textDim: 'rgba(255,255,255,0.7)',

    // UI Elements
    tint: Palette.sageDark,
    tabIconDefault: 'rgba(255,255,255,0.5)',
    tabIconSelected: '#FFFFFF',
    tabBar: '#A4B69D',

    white: '#FFFFFF',
    black: '#000000',

    // Status
    success: '#789370',
    error: '#EF4444',

    // Feature specific
    pillBackground: Palette.sageDark,
    pillText: '#FFFFFF',
    topNavBackground: '#EFF0E1',
};
