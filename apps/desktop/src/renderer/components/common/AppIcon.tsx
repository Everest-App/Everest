import React from 'react';

interface AppIconProps {
    size?: number;
    className?: string;
}

/**
 * Inline SVG application icon — three flowing blue arrows.
 * Used in sidebar header and loading screens.
 */
export const AppIcon = React.memo(function AppIcon({ size = 24, className }: AppIconProps) {
    return (
        <img
            src="./icon.png"
            alt="App Icon"
            className={className}
            width={size}
            height={size}
            style={{ objectFit: 'contain' }}
        />
    );
});
