import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

const CREAM_COLOR = '#EAE8D9'; // Default cream color

interface TabonoLogoProps {
    size?: number;
    color?: string;
    hasDropShadow?: boolean;
}

export const TabonoLogo = ({ size = 200, color = CREAM_COLOR, hasDropShadow = false }: TabonoLogoProps) => {
    // Tabono symbol consists of 4 paddle-like shapes joined at the center.
    // Approximated with 4 rotated petals.
    // Path updated to match "wider inner parts" request.
    const petalPath = "M 0 0 C 15 -15 35 -40 35 -60 A 35 35 0 1 0 -35 -60 C -35 -40 -15 -15 0 0";

    // Compute scalable offset in SVG viewBox units to guarantee a consistent visual 1.5px shadow on screen
    const shadowOffsetX = (200 / size) * 1.2;
    const shadowOffsetY = (200 / size) * 1.2;

    return (
        <Svg width={size} height={size} viewBox="0 0 200 200">
            <G transform="translate(100, 100)">
                {hasDropShadow && [0, 90, 180, 270].map((rotation, i) => (
                    <G key={`shadow-${i}`} transform={`translate(${shadowOffsetX}, ${shadowOffsetY}) rotate(${rotation})`}>
                        <Path
                            d={petalPath}
                            fill="#000000"
                            opacity={0.35}
                        />
                    </G>
                ))}
                {[0, 90, 180, 270].map((rotation, i) => (
                    <G key={`main-${i}`} transform={`rotate(${rotation})`}>
                        <Path
                            d={petalPath}
                            fill={color}
                        />
                    </G>
                ))}
            </G>
        </Svg>
    );
};
