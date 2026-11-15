import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  inverted?: boolean;
  logoMode?: 'vector' | 'image';
  customImageUrl?: string;
  customTitle?: string;
  customSubtitle?: string;
  customNavyColor?: string;
  customRedColor?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  inverted = false,
  logoMode = 'vector',
  customImageUrl = '',
  customTitle,
  customSubtitle,
  customNavyColor,
  customRedColor,
}) => {
  const [imageError, setImageError] = useState(false);

  // Automatically reset image error whenever customImageUrl changes so edits take effect immediately
  useEffect(() => {
    setImageError(false);
  }, [customImageUrl]);

  // Dimensions based on size
  const heights = {
    sm: 'h-10',
    md: 'h-14',
    lg: 'h-20',
    xl: 'h-28',
  };

  const imageSizes = {
    sm: 'h-10 max-w-[130px] object-contain',
    md: 'h-14 max-w-[180px] object-contain',
    lg: 'h-20 max-w-[240px] object-contain',
    xl: 'h-28 max-w-[320px] object-contain',
  };

  const navyColor = customNavyColor || (inverted ? '#FFFFFF' : '#0B192C');
  const redColor = customRedColor || '#E61C24';

  const hasCustomImage = Boolean(customImageUrl && customImageUrl.trim().length > 0 && !imageError);
  const shouldRenderImage = hasCustomImage;

  // If Admin chose custom image logo or has a custom image URL
  if (shouldRenderImage) {
    return (
      <div className={`flex flex-col items-center justify-center select-none ${className}`}>
        <img
          key={customImageUrl}
          src={customImageUrl}
          alt={customTitle || 'شعار شاورما ليل'}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className={`${imageSizes[size]} rounded-xl shadow-xs transition-transform hover:scale-105 duration-200`}
        />
        {showSubtitle && customSubtitle && (
          <span
            className="text-[10px] font-black tracking-widest mt-1 uppercase"
            style={{ color: redColor }}
          >
            {customSubtitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 320 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${heights[size]} w-auto transition-transform hover:scale-105 duration-200`}
        aria-label={customTitle || "شعار شاورما ليل - Leil Shawarma"}
      >
        <defs>
          {/* Starry Night pattern for the Arabic "ليل" letters */}
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="shawarmaFlame" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#E61C24" />
            <stop offset="60%" stopColor="#FF3838" />
            <stop offset="100%" stopColor="#FFA600" />
          </linearGradient>
        </defs>

        {/* --- SHAWARMA SPIT ON SKEWER (Red with flames) --- */}
        <g id="shawarma-spit">
          {/* Horizontal skewer rod */}
          <rect x="55" y="93" width="130" height="4" rx="2" fill={redColor} />
          
          {/* Flame tongues above spit */}
          <path
            d="M 120 72 C 117 62 121 54 125 45 C 127 52 129 57 127 63 C 129 62 131 58 132 53 C 135 60 134 68 130 73 Z"
            fill="url(#shawarmaFlame)"
          />
          <path
            d="M 108 72 C 106 65 109 59 113 52 C 114 57 115 62 113 67 C 115 66 117 63 118 60 C 119 65 118 70 115 73 Z"
            fill={redColor}
          />
          <path
            d="M 98 72 C 97 68 99 64 102 60 C 103 63 103 67 101 70 C 103 69 104 67 105 65 C 105 69 104 71 102 73 Z"
            fill={redColor}
          />

          {/* Sliced cone meat slices (distinct red segments) */}
          {/* Slice 1 (Base/Left) */}
          <path
            d="M 80 80 C 85 80 89 86 89 95 C 89 104 85 110 80 110 C 74 110 72 103 72 95 C 72 87 74 80 80 80 Z"
            fill={redColor}
          />
          {/* Slice 2 */}
          <path
            d="M 93 78 C 98 78 102 85 102 95 C 102 105 98 112 93 112 C 89 112 87 104 87 95 C 87 86 89 78 93 78 Z"
            fill={redColor}
          />
          {/* Slice 3 */}
          <path
            d="M 106 79 C 111 79 114 86 114 95 C 114 104 111 111 106 111 C 102 111 100 104 100 95 C 100 86 102 79 106 79 Z"
            fill={redColor}
          />
          {/* Slice 4 */}
          <path
            d="M 119 82 C 123 82 126 87 126 95 C 126 103 123 108 119 108 C 115 108 114 102 114 95 C 114 88 115 82 119 82 Z"
            fill={redColor}
          />
          {/* Slice 5 (Tip) */}
          <path
            d="M 130 86 C 134 86 136 90 136 95 C 136 100 134 104 130 104 C 127 104 126 100 126 95 C 126 90 127 86 130 86 Z"
            fill={redColor}
          />

          {/* Registered symbol (R) */}
          <circle cx="48" cy="74" r="7" stroke={navyColor} strokeWidth="1.5" />
          <text x="45.5" y="77" fontSize="8" fontWeight="bold" fill={navyColor} fontFamily="sans-serif">
            R
          </text>
        </g>

        {/* --- MAIN CALLIGRAPHY: "ليل" (Dark Navy with Starry Night Speckles) --- */}
        <g id="calligraphy-leil">
          {/* Massive sweeping lower curve (the boat swash of Yaa/Laam) */}
          <path
            d="M 38 126 C 60 148 105 168 180 162 C 215 159 235 145 244 126 C 248 117 248 95 248 60 C 248 55 246 51 251 51 C 255 51 255 55 255 60 C 255 105 253 133 241 146 C 228 162 195 174 150 174 C 95 174 52 153 38 126 Z"
            fill={navyColor}
          />

          {/* Vertical uprights of initial Laam and Ya */}
          {/* Initial Laam (far right) */}
          <path
            d="M 248 60 C 248 53 252 48 250 45 C 246 45 242 53 242 62 L 241 125 C 235 137 225 142 215 142 L 210 102 C 210 95 204 95 204 102 L 204 135 C 196 138 185 137 175 134 L 175 92 C 175 85 168 85 168 92 L 168 132 C 145 135 110 133 75 120 C 70 118 68 125 73 127 C 105 139 140 142 165 139 L 165 143 C 185 146 205 145 220 138 L 222 144 C 235 135 244 120 248 100 Z"
            fill={navyColor}
          />

          {/* Decorative Stars embedded into the navy swash (matching Logo-01.jpg) */}
          {/* Star 1 */}
          <polygon points="62,148 64,143 66,148 71,150 66,152 64,157 62,152 57,150" fill="#FFFFFF" opacity="0.9" />
          {/* Star 2 */}
          <polygon points="98,154 99,150 101,154 105,155 101,157 99,161 98,157 94,155" fill="#FFFFFF" opacity="0.8" />
          {/* Star 3 */}
          <polygon points="135,153 136,150 137,153 140,154 137,156 136,159 135,156 132,154" fill="#FFFFFF" opacity="0.85" />
          {/* Star 4 */}
          <polygon points="175,148 176,144 178,148 182,149 178,151 176,155 175,151 171,149" fill="#FFFFFF" opacity="0.95" />
          {/* Star 5 (Right area) */}
          <polygon points="228,128 229,125 231,128 234,129 231,131 229,134 228,131 225,129" fill="#FFFFFF" opacity="0.85" />
          {/* Star 6 (Upper right laam) */}
          <polygon points="246,115 247,112 249,115 252,116 249,118 247,121 246,118 243,116" fill="#FFFFFF" opacity="0.8" />

          {/* Small star dust dots */}
          <circle cx="80" cy="151" r="1" fill="#FFFFFF" opacity="0.8" />
          <circle cx="118" cy="158" r="1.2" fill="#FFFFFF" opacity="0.9" />
          <circle cx="155" cy="155" r="1" fill="#FFFFFF" opacity="0.7" />
          <circle cx="218" cy="138" r="1.3" fill="#FFFFFF" opacity="0.8" />
          <circle cx="245" cy="98" r="1" fill="#FFFFFF" opacity="0.75" />
        </g>

        {/* --- TWO RED DIAMOND DOTS OF YAA (نقاط الياء) --- */}
        <g id="yaa-dots">
          {/* Right dot */}
          <polygon points="225,178 234,185 225,193 216,185" fill={redColor} />
          {/* Left dot */}
          <polygon points="208,178 217,185 208,193 199,185" fill={redColor} />
        </g>

        {/* --- BOTTOM TEXT: S H A W A R M A --- */}
        {showSubtitle && (
          <g id="shawarma-sub">
            <text
              x="160"
              y="214"
              textAnchor="middle"
              fill={redColor}
              fontFamily="'Cairo', 'Arial Black', sans-serif"
              fontSize="16"
              fontWeight="900"
              letterSpacing="7"
            >
              SHAWARMA
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
