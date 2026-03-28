import React from 'react';
import Svg, { Rect, Circle, Path, G, Text as SvgText, Ellipse, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

const W = 280;
const H = 280;

// ─── 1. Wallet / Ledger Scene ───
export const LedgerScene = ({ dark }: { dark: boolean }) => {
  const bg1 = dark ? '#1e293b' : '#e8f4f8';
  const bg2 = dark ? '#0f172a' : '#f0f7ff';
  const skin = '#f5c5a3';
  const hair = '#2d1b0e';
  const shirt = '#0a7ea4';
  const phoneBg = dark ? '#1e293b' : '#ffffff';
  const cardBg = '#1e3a5f';

  return (
    <Svg width={W} height={H} viewBox="0 0 280 280">
      <Defs>
        <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={bg1} stopOpacity="0.5" />
          <Stop offset="1" stopColor={bg2} stopOpacity="0.3" />
        </LinearGradient>
      </Defs>

      {/* Background circle */}
      <Circle cx="140" cy="140" r="130" fill="url(#bgGrad)" />
      <Circle cx="140" cy="140" r="100" fill={dark ? '#0f172a' : '#f8fbff'} opacity="0.5" />

      {/* Floating coins */}
      <Circle cx="45" cy="60" r="16" fill="#fbbf24" opacity="0.8" />
      <SvgText x="45" y="65" fontSize="14" fontWeight="900" fill="#78350f" textAnchor="middle">$</SvgText>
      <Circle cx="235" cy="80" r="12" fill="#fbbf24" opacity="0.5" />
      <SvgText x="235" y="84" fontSize="10" fontWeight="900" fill="#78350f" textAnchor="middle">$</SvgText>
      <Circle cx="55" cy="210" r="10" fill="#fbbf24" opacity="0.4" />

      {/* Phone */}
      <Rect x="90" y="45" width="100" height="175" rx="14" fill={phoneBg} stroke={dark ? '#334155' : '#cbd5e1'} strokeWidth="2" />
      {/* Phone screen header */}
      <Rect x="90" y="45" width="100" height="32" rx="14" fill="#0a7ea4" />
      <Rect x="130" y="45" width="60" height="32" fill="#0a7ea4" />
      <SvgText x="140" y="66" fontSize="7" fontWeight="800" fill="#fff" textAnchor="middle">KhaataWise</SvgText>
      {/* Balance card */}
      <Rect x="98" y="84" width="84" height="40" rx="8" fill="#0c4a6e" />
      <SvgText x="106" y="98" fontSize="6" fill="#7dd3fc">BALANCE</SvgText>
      <SvgText x="106" y="114" fontSize="14" fontWeight="900" fill="#fff">Rs 45,200</SvgText>
      {/* Transaction rows */}
      <G>
        <Circle cx="108" cy="140" r="6" fill="#dcfce7" />
        <Path d="M105 140 L108 137 L111 140" stroke="#22c55e" strokeWidth="1.5" fill="none" />
        <Rect x="118" y="137" width="35" height="3" rx="1.5" fill={dark ? '#475569' : '#94a3b8'} />
        <Rect x="160" y="137" width="18" height="3" rx="1.5" fill="#22c55e" />
        <Rect x="118" y="143" width="22" height="2" rx="1" fill={dark ? '#334155' : '#cbd5e1'} />
      </G>
      <G>
        <Circle cx="108" cy="158" r="6" fill="#fef2f2" />
        <Path d="M105 158 L108 161 L111 158" stroke="#ef4444" strokeWidth="1.5" fill="none" />
        <Rect x="118" y="155" width="30" height="3" rx="1.5" fill={dark ? '#475569' : '#94a3b8'} />
        <Rect x="160" y="155" width="18" height="3" rx="1.5" fill="#ef4444" />
        <Rect x="118" y="161" width="18" height="2" rx="1" fill={dark ? '#334155' : '#cbd5e1'} />
      </G>
      <G>
        <Circle cx="108" cy="176" r="6" fill="#dcfce7" />
        <Path d="M105 176 L108 173 L111 176" stroke="#22c55e" strokeWidth="1.5" fill="none" />
        <Rect x="118" y="173" width="28" height="3" rx="1.5" fill={dark ? '#475569' : '#94a3b8'} />
        <Rect x="160" y="173" width="18" height="3" rx="1.5" fill="#22c55e" />
        <Rect x="118" y="179" width="25" height="2" rx="1" fill={dark ? '#334155' : '#cbd5e1'} />
      </G>

      {/* Credit card floating */}
      <G transform="rotate(-15, 55, 150)">
        <Rect x="20" y="130" width="70" height="44" rx="8" fill={cardBg} />
        <Rect x="28" y="140" width="20" height="14" rx="3" fill="#fbbf24" opacity="0.8" />
        <Rect x="28" y="162" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.4)" />
        <Rect x="28" y="168" width="25" height="2" rx="1" fill="rgba(255,255,255,0.25)" />
      </G>

      {/* Person */}
      <G transform="translate(200, 130)">
        {/* Body */}
        <Rect x="-15" y="20" width="30" height="45" rx="6" fill={shirt} />
        {/* Head */}
        <Circle cx="0" cy="5" r="18" fill={skin} />
        {/* Hair */}
        <Path d="M-18 0 Q-18 -16 0 -18 Q18 -16 18 0 Q12 -8 0 -10 Q-12 -8 -18 0Z" fill={hair} />
        {/* Eyes */}
        <Circle cx="-5" cy="3" r="1.5" fill="#1e293b" />
        <Circle cx="7" cy="3" r="1.5" fill="#1e293b" />
        {/* Smile */}
        <Path d="M-4 9 Q1 14 6 9" stroke="#c4846c" strokeWidth="1.2" fill="none" />
        {/* Arm with phone */}
        <Rect x="10" y="25" width="8" height="25" rx="4" fill={skin} />
        <Rect x="12" y="42" width="12" height="20" rx="3" fill={dark ? '#334155' : '#e2e8f0'} />
        {/* Legs */}
        <Rect x="-12" y="62" width="10" height="30" rx="4" fill="#334155" />
        <Rect x="2" y="62" width="10" height="30" rx="4" fill="#334155" />
        <Rect x="-14" y="88" width="14" height="6" rx="3" fill="#1e293b" />
        <Rect x="0" y="88" width="14" height="6" rx="3" fill="#1e293b" />
      </G>

      {/* Trend arrow */}
      <G transform="translate(210, 60)">
        <Path d="M0 20 L10 10 L20 15 L30 0" stroke="#22c55e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <Circle cx="30" cy="0" r="4" fill="#22c55e" />
      </G>
    </Svg>
  );
};

// ─── 2. Split / Group Scene ───
export const SplitScene = ({ dark }: { dark: boolean }) => {
  const bg = dark ? '#1e293b' : '#f0f7ff';
  const skin1 = '#f5c5a3';
  const skin2 = '#d4956b';
  const skin3 = '#f5dcc3';

  return (
    <Svg width={W} height={H} viewBox="0 0 280 280">
      {/* Background */}
      <Circle cx="140" cy="140" r="130" fill={bg} opacity="0.5" />

      {/* Center receipt */}
      <Rect x="105" y="60" width="70" height="100" rx="8" fill={dark ? '#0f172a' : '#fff'} stroke={dark ? '#334155' : '#e2e8f0'} strokeWidth="1.5" />
      <SvgText x="140" y="82" fontSize="8" fontWeight="800" fill="#0a7ea4" textAnchor="middle">BILL</SvgText>
      <Line x1="115" y1="88" x2="165" y2="88" stroke={dark ? '#334155' : '#e2e8f0'} strokeWidth="1" />
      <Rect x="115" y="95" width="35" height="3" rx="1.5" fill={dark ? '#475569' : '#94a3b8'} />
      <Rect x="155" y="95" width="12" height="3" rx="1.5" fill={dark ? '#475569' : '#94a3b8'} />
      <Rect x="115" y="104" width="30" height="3" rx="1.5" fill={dark ? '#475569' : '#94a3b8'} />
      <Rect x="155" y="104" width="12" height="3" rx="1.5" fill={dark ? '#475569' : '#94a3b8'} />
      <Rect x="115" y="113" width="25" height="3" rx="1.5" fill={dark ? '#475569' : '#94a3b8'} />
      <Rect x="155" y="113" width="12" height="3" rx="1.5" fill={dark ? '#475569' : '#94a3b8'} />
      <Line x1="115" y1="122" x2="165" y2="122" stroke={dark ? '#334155' : '#e2e8f0'} strokeWidth="1" />
      <SvgText x="116" y="132" fontSize="6" fontWeight="700" fill={dark ? '#94a3b8' : '#64748b'}>Total</SvgText>
      <SvgText x="164" y="144" fontSize="10" fontWeight="900" fill="#0a7ea4" textAnchor="end">Rs 2,000</SvgText>
      {/* Scissors line */}
      <Line x1="100" y1="148" x2="180" y2="148" stroke={dark ? '#334155' : '#cbd5e1'} strokeWidth="1" strokeDasharray="4 3" />

      {/* Split amounts */}
      <Rect x="110" y="152" width="28" height="16" rx="4" fill="#0a7ea420" />
      <SvgText x="124" y="163" fontSize="6" fontWeight="800" fill="#0a7ea4" textAnchor="middle">Rs 500</SvgText>
      <Rect x="142" y="152" width="28" height="16" rx="4" fill="#0a7ea420" />
      <SvgText x="156" y="163" fontSize="6" fontWeight="800" fill="#0a7ea4" textAnchor="middle">Rs 500</SvgText>

      {/* Person 1 - left */}
      <G transform="translate(50, 100)">
        <Circle cx="0" cy="0" r="20" fill={skin1} />
        <Path d="M-20 -5 Q-20 -22 0 -24 Q20 -22 20 -5 Q14 -12 0 -14 Q-14 -12 -20 -5Z" fill="#2d1b0e" />
        <Circle cx="-5" cy="-1" r="1.5" fill="#1e293b" />
        <Circle cx="7" cy="-1" r="1.5" fill="#1e293b" />
        <Path d="M-3 6 Q2 10 7 6" stroke="#c4846c" strokeWidth="1" fill="none" />
        <Rect x="-14" y="22" width="28" height="30" rx="6" fill="#8b5cf6" />
      </G>
      {/* Arrow from person 1 */}
      <Path d="M72 110 L100 95" stroke="#0a7ea4" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />

      {/* Person 2 - right */}
      <G transform="translate(230, 100)">
        <Circle cx="0" cy="0" r="20" fill={skin2} />
        <Path d="M-18 -8 Q-16 -24 0 -24 Q16 -24 18 -8 Q10 -14 0 -14 Q-10 -14 -18 -8Z" fill="#1a1a2e" />
        <Circle cx="-5" cy="-1" r="1.5" fill="#1e293b" />
        <Circle cx="7" cy="-1" r="1.5" fill="#1e293b" />
        <Path d="M-3 6 Q2 10 7 6" stroke="#a0764e" strokeWidth="1" fill="none" />
        <Rect x="-14" y="22" width="28" height="30" rx="6" fill="#f59e0b" />
      </G>
      <Path d="M208 110 L180 95" stroke="#0a7ea4" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />

      {/* Person 3 - bottom left */}
      <G transform="translate(70, 210)">
        <Circle cx="0" cy="0" r="18" fill={skin3} />
        <Path d="M-16 -6 Q-14 -20 0 -22 Q14 -20 16 -6 Q10 -12 0 -12 Q-10 -12 -16 -6Z" fill="#6b3a20" />
        <Circle cx="-4" cy="-1" r="1.5" fill="#1e293b" />
        <Circle cx="6" cy="-1" r="1.5" fill="#1e293b" />
        <Rect x="-12" y="20" width="24" height="26" rx="5" fill="#22c55e" />
      </G>
      <Path d="M85 198 L118 168" stroke="#0a7ea4" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />

      {/* Person 4 - bottom right */}
      <G transform="translate(210, 210)">
        <Circle cx="0" cy="0" r="18" fill={skin1} />
        <Path d="M-16 -6 Q-14 -20 0 -22 Q14 -20 16 -6 Q10 -12 0 -12 Q-10 -12 -16 -6Z" fill="#2d1b0e" />
        <Circle cx="-4" cy="-1" r="1.5" fill="#1e293b" />
        <Circle cx="6" cy="-1" r="1.5" fill="#1e293b" />
        <Rect x="-12" y="20" width="24" height="26" rx="5" fill="#ef4444" />
      </G>
      <Path d="M195 198 L162 168" stroke="#0a7ea4" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />

      {/* Equal sign */}
      <Circle cx="140" cy="190" r="14" fill="#0a7ea4" />
      <SvgText x="140" y="194" fontSize="12" fontWeight="900" fill="#fff" textAnchor="middle">÷</SvgText>
    </Svg>
  );
};

// ─── 3. Visiting Card Scene ───
export const CardScene = ({ dark }: { dark: boolean }) => {
  const bg = dark ? '#1e293b' : '#f0f7ff';

  return (
    <Svg width={W} height={H} viewBox="0 0 280 280">
      <Circle cx="140" cy="140" r="130" fill={bg} opacity="0.4" />

      {/* Card 3 (back) */}
      <G transform="rotate(8, 140, 150)">
        <Rect x="55" y="105" width="170" height="100" rx="12" fill={dark ? '#334155' : '#cbd5e1'} />
      </G>
      {/* Card 2 (middle) */}
      <G transform="rotate(3, 140, 145)">
        <Rect x="55" y="100" width="170" height="100" rx="12" fill={dark ? '#1e293b' : '#e2e8f0'} stroke={dark ? '#475569' : '#cbd5e1'} strokeWidth="1" />
      </G>
      {/* Card 1 (front - main) */}
      <Rect x="55" y="95" width="170" height="100" rx="12" fill="#0a7ea4" />
      {/* Card accent bar */}
      <Rect x="55" y="95" width="6" height="100" rx="3" fill="#0284c7" />
      {/* Initials circle */}
      <Circle cx="88" cy="128" r="16" fill="rgba(255,255,255,0.2)" />
      <SvgText x="88" y="133" fontSize="13" fontWeight="900" fill="#fff" textAnchor="middle">KW</SvgText>
      {/* Name & title */}
      <Rect x="112" y="118" width="70" height="5" rx="2.5" fill="rgba(255,255,255,0.85)" />
      <Rect x="112" y="128" width="45" height="4" rx="2" fill="rgba(255,255,255,0.5)" />
      <Rect x="112" y="137" width="30" height="3" rx="1.5" fill="rgba(255,255,255,0.3)" />
      {/* Divider */}
      <Line x1="70" y1="155" x2="215" y2="155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      {/* Contact info icons */}
      <Circle cx="78" cy="168" r="4" fill="rgba(255,255,255,0.2)" />
      <Rect x="88" y="166" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.4)" />
      <Circle cx="78" cy="180" r="4" fill="rgba(255,255,255,0.2)" />
      <Rect x="88" y="178" width="50" height="3" rx="1.5" fill="rgba(255,255,255,0.4)" />

      {/* Person designing */}
      <G transform="translate(225, 75)">
        <Circle cx="0" cy="0" r="16" fill="#f5c5a3" />
        <Path d="M-15 -4 Q-14 -18 0 -20 Q14 -18 15 -4 Q10 -10 0 -12 Q-10 -10 -15 -4Z" fill="#2d1b0e" />
        <Circle cx="-4" cy="-1" r="1.2" fill="#1e293b" />
        <Circle cx="5" cy="-1" r="1.2" fill="#1e293b" />
        <Path d="M-2 5 Q1 8 4 5" stroke="#c4846c" strokeWidth="1" fill="none" />
        <Rect x="-12" y="18" width="24" height="28" rx="5" fill="#8b5cf6" />
        {/* Arm pointing to card */}
        <Path d="M-12 28 L-30 35" stroke="#f5c5a3" strokeWidth="5" strokeLinecap="round" />
      </G>

      {/* Color palette floating */}
      <G transform="translate(35, 70)">
        <Rect x="0" y="0" width="36" height="36" rx="10" fill={dark ? '#1e293b' : '#fff'} stroke={dark ? '#334155' : '#e2e8f0'} strokeWidth="1" />
        <Circle cx="11" cy="11" r="5" fill="#ef4444" />
        <Circle cx="25" cy="11" r="5" fill="#22c55e" />
        <Circle cx="11" cy="25" r="5" fill="#3b82f6" />
        <Circle cx="25" cy="25" r="5" fill="#fbbf24" />
      </G>

      {/* Share icon floating */}
      <G transform="translate(30, 190)">
        <Circle cx="16" cy="16" r="16" fill={dark ? '#1e293b' : '#f1f5f9'} />
        <Circle cx="10" cy="16" r="3" fill="#0a7ea4" />
        <Circle cx="22" cy="9" r="3" fill="#0a7ea4" />
        <Circle cx="22" cy="23" r="3" fill="#0a7ea4" />
        <Line x1="12" y1="14" x2="20" y2="10" stroke="#0a7ea4" strokeWidth="1.2" />
        <Line x1="12" y1="18" x2="20" y2="22" stroke="#0a7ea4" strokeWidth="1.2" />
      </G>

      {/* Download icon */}
      <G transform="translate(230, 200)">
        <Circle cx="14" cy="14" r="14" fill="#22c55e20" />
        <Path d="M14 6 L14 18 M9 14 L14 19 L19 14" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" fill="none" />
        <Path d="M7 22 L21 22" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
      </G>
    </Svg>
  );
};

// ─── 4. Security Scene ───
export const SecurityScene = ({ dark }: { dark: boolean }) => {
  const bg = dark ? '#1e293b' : '#f0f7ff';

  return (
    <Svg width={W} height={H} viewBox="0 0 280 280">
      <Circle cx="140" cy="140" r="130" fill={bg} opacity="0.4" />

      {/* Shield */}
      <Path d="M140 40 L200 70 L200 150 Q200 200 140 230 Q80 200 80 150 L80 70 Z" fill="#0a7ea4" opacity="0.15" />
      <Path d="M140 55 L190 80 L190 145 Q190 185 140 210 Q90 185 90 145 L90 80 Z" fill="#0a7ea4" />

      {/* Lock inside shield */}
      <Rect x="120" y="120" width="40" height="35" rx="6" fill="#fff" />
      <Path d="M128 120 L128 110 Q128 100 140 100 Q152 100 152 110 L152 120" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Circle cx="140" cy="133" r="5" fill="#0a7ea4" />
      <Rect x="138" y="136" width="4" height="8" rx="2" fill="#0a7ea4" />

      {/* Checkmark on shield */}
      <Circle cx="140" cy="80" r="12" fill="rgba(255,255,255,0.25)" />
      <Path d="M133 80 L138 85 L148 75" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Fingerprint floating left */}
      <G transform="translate(25, 90)">
        <Circle cx="22" cy="22" r="22" fill={dark ? '#1e293b' : '#fff'} stroke={dark ? '#334155' : '#e2e8f0'} strokeWidth="1.5" />
        <Path d="M15 26 Q15 16 22 14 Q29 16 29 26" stroke="#0a7ea4" strokeWidth="1.8" fill="none" />
        <Path d="M18 28 Q18 20 22 18 Q26 20 26 28" stroke="#0a7ea4" strokeWidth="1.5" fill="none" />
        <Line x1="22" y1="22" x2="22" y2="30" stroke="#0a7ea4" strokeWidth="1.5" />
      </G>

      {/* Globe floating right */}
      <G transform="translate(220, 80)">
        <Circle cx="22" cy="22" r="22" fill={dark ? '#1e293b' : '#fff'} stroke={dark ? '#334155' : '#e2e8f0'} strokeWidth="1.5" />
        <Circle cx="22" cy="22" r="12" stroke="#0a7ea4" strokeWidth="1.5" fill="none" />
        <Ellipse cx="22" cy="22" rx="6" ry="12" stroke="#0a7ea4" strokeWidth="1" fill="none" />
        <Line x1="10" y1="22" x2="34" y2="22" stroke="#0a7ea4" strokeWidth="1" />
        <Line x1="22" y1="10" x2="22" y2="34" stroke="#0a7ea4" strokeWidth="1" />
      </G>

      {/* Key floating bottom left */}
      <G transform="translate(40, 200)">
        <Circle cx="16" cy="16" r="16" fill={dark ? '#1e293b' : '#f1f5f9'} />
        <Circle cx="12" cy="14" r="5" stroke="#fbbf24" strokeWidth="2" fill="none" />
        <Path d="M16 17 L26 17 L26 21 L23 21 L23 17" stroke="#fbbf24" strokeWidth="2" fill="none" strokeLinecap="round" />
      </G>

      {/* Language icon bottom right */}
      <G transform="translate(210, 200)">
        <Circle cx="16" cy="16" r="16" fill={dark ? '#1e293b' : '#f1f5f9'} />
        <SvgText x="16" y="13" fontSize="7" fontWeight="800" fill="#0a7ea4" textAnchor="middle">EN</SvgText>
        <SvgText x="16" y="24" fontSize="7" fontWeight="800" fill="#8b5cf6" textAnchor="middle">اردو</SvgText>
      </G>

      {/* Person with phone */}
      <G transform="translate(215, 140)">
        <Circle cx="0" cy="0" r="14" fill="#f5c5a3" />
        <Path d="M-13 -3 Q-12 -16 0 -17 Q12 -16 13 -3 Q8 -9 0 -10 Q-8 -9 -13 -3Z" fill="#6b3a20" />
        <Circle cx="-3" cy="-1" r="1.2" fill="#1e293b" />
        <Circle cx="5" cy="-1" r="1.2" fill="#1e293b" />
        <Rect x="-10" y="16" width="20" height="24" rx="4" fill="#22c55e" />
        <Rect x="8" y="20" width="8" height="14" rx="2" fill={dark ? '#334155' : '#e2e8f0'} />
      </G>
    </Svg>
  );
};
