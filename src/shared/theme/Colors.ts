const Palette = {
    matteBlack: '#1A1A1A',
    harvestGold: '#DAA520',
    burntSienna: '#8B4513',
    oliveDrab: '#556B2F',
    dust: '#EDE8D5',
    softWhite: '#FFFFFF',
    transparent: 'transparent',
};

export const Colors = {
    // Base Palette
    theme: Palette,

    // Semantic Roles
    primary: Palette.harvestGold,
    background: Palette.matteBlack,
    card: Palette.matteBlack,

    text: Palette.softWhite,
    textDark: Palette.matteBlack,
    textDim: Palette.dust,

    // UI Elements
    tint: Palette.harvestGold,
    tabIconDefault: Palette.dust,
    tabIconSelected: Palette.harvestGold,
    tabBar: Palette.matteBlack,

    white: Palette.softWhite,
    black: Palette.matteBlack,

    // Status
    success: Palette.oliveDrab,
    error: Palette.burntSienna,

    // Feature specific
    pillBackground: Palette.harvestGold,
    pillText: Palette.matteBlack,
    topNavBackground: Palette.matteBlack,
};
