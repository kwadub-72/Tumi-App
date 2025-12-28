const Palette = {
    sage: '#A4B69D',
    olive: '#6E7A66', // Deep olive
    blueGreen: '#86A293',
    beige: '#CED6B2',
    leafGreen: '#859F74', // Primary Action
    // Computed variants
    cardBackground: '#131613', // Very dark green-black for cards
};

export const Colors = {
    // Base Palette
    theme: Palette,

    // Semantic Roles
    primary: Palette.leafGreen,
    background: '#0a0a0a', // Keeping it mostly black for contrast
    card: Palette.cardBackground,

    text: '#FFFFFF',
    textDim: '#A0A0A0',

    // UI Elements
    tint: Palette.leafGreen,
    tabIconDefault: '#555',
    tabIconSelected: Palette.beige,
    tabBar: '#0a0a0a',

    white: '#FFFFFF',
    black: '#000000',

    // Status
    success: Palette.sage,
    error: '#EF4444', // Keep red for errors, or maybe mute it? Keeping standard for now.

    // Legacy support (mapping old keys if necessary)
    secondary: Palette.blueGreen,
    secondaryDark: Palette.olive,
};
