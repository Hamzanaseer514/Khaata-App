import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, Platform, Animated, Dimensions, ActivityIndicator, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { goBack } from '@/utils/navigation';
import { showSuccess, showError } from '@/utils/toast';
import { tapHaptic, successHaptic, selectionHaptic } from '@/utils/haptics';
import config from '@/config/config';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { CustomCard, CustomDesignControls, CardWatermark } from '@/components/CustomCardBuilder';
import type { CardData, CustomDesign } from '@/components/CustomCardBuilder';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 48;
const CARD_H = CARD_W * 0.58;

const initials = (name: string) => (name || 'KW').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

// ─── Shared Info Rows ───
const InfoRows = ({ data, iconColor, textColor }: { data: CardData; iconColor: string; textColor: string }) => (
  <View style={{ gap: 3 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name="call" size={10} color={iconColor} />
      <Text style={{ fontSize: 10, fontWeight: '500', color: textColor }}>{data.phone || '+92 300 0000000'}</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name="mail" size={10} color={iconColor} />
      <Text style={{ fontSize: 10, fontWeight: '500', color: textColor }}>{data.email || 'email@example.com'}</Text>
    </View>
    {data.address ? (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="location" size={10} color={iconColor} />
        <Text style={{ fontSize: 10, fontWeight: '500', color: textColor }}>{data.address}</Text>
      </View>
    ) : null}
  </View>
);

// ══════════════════════════════════════════
// ─── ALL 30 CARD TEMPLATES ───
// ══════════════════════════════════════════

// 1. Classic
const ClassicCard = ({ data, isDark }: { data: CardData; isDark: boolean }) => (
  <View style={[cs.card, { backgroundColor: isDark ? '#1a1a2e' : '#ffffff', borderColor: isDark ? '#2a2a4a' : '#e2e8f0' }]}>
    <View style={[cs.classicAccent, { backgroundColor: isDark ? '#22d3ee' : '#0a7ea4' }]} />
    <View style={cs.classicBody}>
      <Text style={[cs.classicName, { color: isDark ? '#ffffff' : '#0f172a' }]}>{data.name || 'Your Name'}</Text>
      <Text style={[cs.classicTitle, { color: isDark ? '#22d3ee' : '#0a7ea4' }]}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={[cs.classicCompany, { color: isDark ? '#94a3b8' : '#64748b' }]}>{data.company}</Text> : null}
      <View style={cs.classicDivider} />
      <View style={cs.classicRow}>
        <Ionicons name="call-outline" size={12} color={isDark ? '#22d3ee' : '#0a7ea4'} />
        <Text style={[cs.classicInfo, { color: isDark ? '#cbd5e1' : '#475569' }]}>{data.phone || '+92 300 0000000'}</Text>
      </View>
      <View style={cs.classicRow}>
        <Ionicons name="mail-outline" size={12} color={isDark ? '#22d3ee' : '#0a7ea4'} />
        <Text style={[cs.classicInfo, { color: isDark ? '#cbd5e1' : '#475569' }]}>{data.email || 'email@example.com'}</Text>
      </View>
      {data.address ? (
        <View style={cs.classicRow}>
          <Ionicons name="location-outline" size={12} color={isDark ? '#22d3ee' : '#0a7ea4'} />
          <Text style={[cs.classicInfo, { color: isDark ? '#cbd5e1' : '#475569' }]}>{data.address}</Text>
        </View>
      ) : null}
    </View>
    <View style={[cs.classicLogo, { backgroundColor: isDark ? '#22d3ee' : '#0a7ea4' }]}>
      <Text style={cs.classicLogoText}>{initials(data.name)}</Text>
    </View>
  </View>
);

// 2. Modern
const ModernCard = ({ data, isDark }: { data: CardData; isDark: boolean }) => (
  <View style={[cs.card, { backgroundColor: isDark ? '#0f172a' : '#f0f9ff', borderColor: isDark ? '#1e3a5f' : '#bae6fd' }]}>
    <View style={cs.modernTop}>
      <View style={[cs.modernCircle, { backgroundColor: isDark ? '#22d3ee' : '#0a7ea4' }]}>
        <Text style={cs.modernInitials}>{initials(data.name)}</Text>
      </View>
      <View style={cs.modernNameBlock}>
        <Text style={[cs.modernName, { color: isDark ? '#ffffff' : '#0f172a' }]}>{data.name || 'Your Name'}</Text>
        <Text style={[cs.modernTitle, { color: isDark ? '#22d3ee' : '#0a7ea4' }]}>{data.title || 'Your Title'}</Text>
        {data.company ? <Text style={[cs.modernCompany, { color: isDark ? '#64748b' : '#94a3b8' }]}>{data.company}</Text> : null}
      </View>
    </View>
    <View style={[cs.modernBottom, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderTopColor: isDark ? '#334155' : '#e0f2fe' }]}>
      <View style={cs.modernInfoRow}><Ionicons name="call" size={11} color={isDark ? '#22d3ee' : '#0a7ea4'} /><Text style={[cs.modernInfo, { color: isDark ? '#cbd5e1' : '#475569' }]}>{data.phone || '+92 300 0000000'}</Text></View>
      <View style={cs.modernInfoRow}><Ionicons name="mail" size={11} color={isDark ? '#22d3ee' : '#0a7ea4'} /><Text style={[cs.modernInfo, { color: isDark ? '#cbd5e1' : '#475569' }]}>{data.email || 'email@example.com'}</Text></View>
      {data.address ? <View style={cs.modernInfoRow}><Ionicons name="location" size={11} color={isDark ? '#22d3ee' : '#0a7ea4'} /><Text style={[cs.modernInfo, { color: isDark ? '#cbd5e1' : '#475569' }]}>{data.address}</Text></View> : null}
    </View>
  </View>
);

// 3. Bold
const BoldCard = ({ data, isDark }: { data: CardData; isDark: boolean }) => (
  <View style={[cs.card, { backgroundColor: isDark ? '#22d3ee' : '#0a7ea4', borderColor: 'transparent' }]}>
    <View style={cs.boldBody}>
      <Text style={cs.boldName}>{data.name || 'Your Name'}</Text>
      <Text style={cs.boldTitle}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={cs.boldCompany}>{data.company}</Text> : null}
    </View>
    <View style={cs.boldFooter}>
      <View style={cs.boldInfoRow}><Ionicons name="call" size={11} color="rgba(255,255,255,0.8)" /><Text style={cs.boldInfo}>{data.phone || '+92 300 0000000'}</Text></View>
      <View style={cs.boldInfoRow}><Ionicons name="mail" size={11} color="rgba(255,255,255,0.8)" /><Text style={cs.boldInfo}>{data.email || 'email@example.com'}</Text></View>
      {data.address ? <View style={cs.boldInfoRow}><Ionicons name="location" size={11} color="rgba(255,255,255,0.8)" /><Text style={cs.boldInfo}>{data.address}</Text></View> : null}
    </View>
    <View style={cs.boldCorner}><Text style={cs.boldCornerText}>{initials(data.name)}</Text></View>
  </View>
);

// 4. Minimal
const MinimalCard = ({ data, isDark }: { data: CardData; isDark: boolean }) => (
  <View style={[cs.card, { backgroundColor: isDark ? '#16161a' : '#fafafa', borderColor: isDark ? '#2a2a2e' : '#e5e5e5' }]}>
    <View style={cs.minimalBody}>
      <Text style={[cs.minimalName, { color: isDark ? '#ffffff' : '#18181b' }]}>{data.name || 'Your Name'}</Text>
      <View style={[cs.minimalLine, { backgroundColor: isDark ? '#22d3ee' : '#0a7ea4' }]} />
      <Text style={[cs.minimalTitle, { color: isDark ? '#a1a1aa' : '#71717a' }]}>{data.title || 'Your Title'}{data.company ? ` at ${data.company}` : ''}</Text>
    </View>
    <View style={cs.minimalFooter}>
      <Text style={[cs.minimalInfo, { color: isDark ? '#71717a' : '#a1a1aa' }]}>{data.phone || '+92 300 0000000'}</Text>
      <Text style={[cs.minimalDot, { color: isDark ? '#3f3f46' : '#d4d4d8' }]}>  ·  </Text>
      <Text style={[cs.minimalInfo, { color: isDark ? '#71717a' : '#a1a1aa' }]}>{data.email || 'email@example.com'}</Text>
    </View>
    {data.address ? <Text style={[cs.minimalAddress, { color: isDark ? '#52525b' : '#a1a1aa' }]}>{data.address}</Text> : null}
  </View>
);

// 5. Elegant
const ElegantCard = ({ data, isDark }: { data: CardData; isDark: boolean }) => (
  <View style={[cs.card, { backgroundColor: isDark ? '#1c1917' : '#fffbeb', borderColor: isDark ? '#44403c' : '#fde68a' }]}>
    <View style={[cs.elegantStripe, { backgroundColor: isDark ? '#d97706' : '#b45309' }]} />
    <View style={cs.elegantContent}>
      <View style={cs.elegantLeft}>
        <Text style={[cs.elegantName, { color: isDark ? '#fbbf24' : '#92400e' }]}>{data.name || 'Your Name'}</Text>
        <Text style={[cs.elegantTitle, { color: isDark ? '#a8a29e' : '#78716c' }]}>{data.title || 'Your Title'}</Text>
        {data.company ? <Text style={[cs.elegantCompany, { color: isDark ? '#78716c' : '#a8a29e' }]}>{data.company}</Text> : null}
      </View>
      <View style={cs.elegantRight}>
        <View style={cs.elegantInfoRow}><Text style={[cs.elegantInfo, { color: isDark ? '#d6d3d1' : '#57534e' }]}>{data.phone || '+92 300 0000000'}</Text><Ionicons name="call" size={10} color={isDark ? '#d97706' : '#b45309'} /></View>
        <View style={cs.elegantInfoRow}><Text style={[cs.elegantInfo, { color: isDark ? '#d6d3d1' : '#57534e' }]}>{data.email || 'email@example.com'}</Text><Ionicons name="mail" size={10} color={isDark ? '#d97706' : '#b45309'} /></View>
        {data.address ? <View style={cs.elegantInfoRow}><Text style={[cs.elegantInfo, { color: isDark ? '#d6d3d1' : '#57534e' }]}>{data.address}</Text><Ionicons name="location" size={10} color={isDark ? '#d97706' : '#b45309'} /></View> : null}
      </View>
    </View>
  </View>
);

// 6. Sunset
const SunsetCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#ff6b35', borderColor: 'transparent' }]}>
    <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%', backgroundColor: '#ff1744', borderTopLeftRadius: 80, borderBottomLeftRadius: 120 }} />
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ marginTop: 10 }}><InfoRows data={data} iconColor="rgba(255,255,255,0.7)" textColor="rgba(255,255,255,0.9)" /></View>
    </View>
    <View style={{ position: 'absolute', top: 14, right: 18, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 2 }}>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900' }}>{initials(data.name)}</Text>
    </View>
  </View>
);

// 7. Ocean
const OceanCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#0077b6', borderColor: 'transparent' }]}>
    <View style={{ position: 'absolute', left: 0, bottom: 0, width: '60%', height: '50%', backgroundColor: '#023e8a', borderTopRightRadius: 100 }} />
    <View style={{ flex: 1, padding: 20, justifyContent: 'space-between', zIndex: 1 }}>
      <View>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#caf0f8' }}>{data.name || 'Your Name'}</Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#90e0ef', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
        {data.company ? <Text style={{ fontSize: 9, color: '#48cae4', marginTop: 1 }}>{data.company}</Text> : null}
      </View>
      <InfoRows data={data} iconColor="#90e0ef" textColor="#caf0f8" />
    </View>
  </View>
);

// 8. Neon
const NeonCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#0d0d0d', borderColor: '#39ff14', borderWidth: 1.5 }]}>
    <View style={{ position: 'absolute', top: -30, right: -30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(57,255,20,0.08)' }} />
    <View style={{ position: 'absolute', bottom: -20, left: -20, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(57,255,20,0.06)' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#39ff14', letterSpacing: -0.5 }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#7fff00', marginTop: 3 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#556b2f', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(57,255,20,0.2)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#39ff14" textColor="#98fb98" />
    </View>
  </View>
);

// 9. Rose Gold
const RoseGoldCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#2d1f2f', borderColor: '#b76e79' }]}>
    <View style={{ position: 'absolute', right: 0, top: 0, width: 6, height: '100%', backgroundColor: '#b76e79' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#b76e79', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>{initials(data.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#f4c2c2' }}>{data.name || 'Your Name'}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#b76e79', marginTop: 1 }}>{data.title || 'Your Title'}</Text>
          {data.company ? <Text style={{ fontSize: 9, color: '#8b6969', marginTop: 1 }}>{data.company}</Text> : null}
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: 'rgba(183,110,121,0.3)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#b76e79" textColor="#d4a5a5" />
    </View>
  </View>
);

// 10. Galaxy
const GalaxyCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#1a0533', borderColor: '#7c3aed' }]}>
    <View style={{ position: 'absolute', top: -20, left: '30%', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(139,92,246,0.12)' }} />
    <View style={{ position: 'absolute', bottom: -10, right: '20%', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(236,72,153,0.1)' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#c4b5fd' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#a78bfa', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#7c3aed', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ marginTop: 12 }}><InfoRows data={data} iconColor="#a78bfa" textColor="#ddd6fe" /></View>
    </View>
    <View style={{ position: 'absolute', top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.3)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)' }}>
      <Text style={{ color: '#c4b5fd', fontSize: 10, fontWeight: '800' }}>{initials(data.name)}</Text>
    </View>
  </View>
);

// 11. Forest
const ForestCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#14532d', borderColor: '#22c55e' }]}>
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: '#22c55e' }} />
    <View style={{ position: 'absolute', right: -20, bottom: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(34,197,94,0.08)' }} />
    <View style={{ flex: 1, paddingLeft: 20, paddingRight: 16, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#bbf7d0' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#4ade80', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#16a34a', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(34,197,94,0.2)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#4ade80" textColor="#dcfce7" />
    </View>
  </View>
);

// 12. Cherry
const CherryCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#dc2626', borderColor: 'transparent' }]}>
    <View style={{ position: 'absolute', right: 0, top: 0, width: '35%', height: '100%', backgroundColor: '#991b1b' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#fecaca', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#fca5a5', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ marginTop: 10 }}><InfoRows data={data} iconColor="#fecaca" textColor="#fff5f5" /></View>
    </View>
  </View>
);

// 13. Ice Blue
const IceCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' }]}>
    <View style={{ position: 'absolute', top: -15, right: -15, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(56,189,248,0.15)' }} />
    <View style={{ position: 'absolute', bottom: -10, left: '40%', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(14,165,233,0.1)' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#0c4a6e' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#0369a1', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#0284c7', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(14,165,233,0.2)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#0284c7" textColor="#075985" />
    </View>
    <View style={{ position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 12, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>{initials(data.name)}</Text>
    </View>
  </View>
);

// 14. Midnight
const MidnightCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#09090b', borderColor: '#27272a' }]}>
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#fafafa' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#fafafa', letterSpacing: 1 }}>{data.name || 'Your Name'}</Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#a1a1aa', marginTop: 3, letterSpacing: 2 }}>{(data.title || 'Your Title').toUpperCase()}</Text>
          {data.company ? <Text style={{ fontSize: 9, color: '#52525b', marginTop: 2, letterSpacing: 1 }}>{data.company?.toUpperCase()}</Text> : null}
        </View>
        <View style={{ width: 36, height: 36, borderRadius: 4, borderWidth: 1.5, borderColor: '#fafafa', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fafafa', fontSize: 12, fontWeight: '900' }}>{initials(data.name)}</Text>
        </View>
      </View>
      <InfoRows data={data} iconColor="#71717a" textColor="#a1a1aa" />
    </View>
  </View>
);

// 15. Coral
const CoralCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#fff1f2', borderColor: '#fda4af' }]}>
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', backgroundColor: '#fb7185', borderTopRightRadius: 60, borderBottomRightRadius: 120 }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#9f1239' }}>{data.name || 'Your Name'}</Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#e11d48', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
        {data.company ? <Text style={{ fontSize: 9, color: '#f43f5e', marginTop: 1 }}>{data.company}</Text> : null}
        <View style={{ height: 1, backgroundColor: 'rgba(244,63,94,0.2)', marginVertical: 8, width: '80%' }} />
        <InfoRows data={data} iconColor="#e11d48" textColor="#881337" />
      </View>
    </View>
  </View>
);

// 16. Teal
const TealCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#0f766e', borderColor: 'transparent' }]}>
    <View style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', backgroundColor: '#134e4a', borderTopLeftRadius: 80 }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#5eead4', fontSize: 16, fontWeight: '900' }}>{initials(data.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#ccfbf1' }}>{data.name || 'Your Name'}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#5eead4', marginTop: 1 }}>{data.title || 'Your Title'}</Text>
        </View>
      </View>
      {data.company ? <Text style={{ fontSize: 9, color: '#2dd4bf', marginTop: 4, marginLeft: 56 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(94,234,212,0.15)', marginVertical: 8 }} />
      <InfoRows data={data} iconColor="#5eead4" textColor="#ccfbf1" />
    </View>
  </View>
);

// 17. Lavender
const LavenderCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#faf5ff', borderColor: '#d8b4fe' }]}>
    <View style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(192,132,252,0.12)' }} />
    <View style={{ position: 'absolute', bottom: -15, left: -15, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(168,85,247,0.08)' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#581c87' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#7e22ce', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#a855f7', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(168,85,247,0.15)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#9333ea" textColor="#6b21a8" />
    </View>
    <View style={{ position: 'absolute', bottom: 14, right: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#9333ea' }}>
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{initials(data.name)}</Text>
    </View>
  </View>
);

// 18. Golden
const GoldenCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#1c1a17', borderColor: '#a16207' }]}>
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#eab308' }} />
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#eab308' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#fde047', letterSpacing: -0.3 }}>{data.name || 'Your Name'}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#ca8a04', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
          {data.company ? <Text style={{ fontSize: 9, color: '#a16207', marginTop: 1 }}>{data.company}</Text> : null}
        </View>
        <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#eab308', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#eab308', fontSize: 15, fontWeight: '900' }}>{initials(data.name)}</Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: 'rgba(234,179,8,0.2)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#eab308" textColor="#fef08a" />
    </View>
  </View>
);

// 19. Copper
const CopperCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#1c1210', borderColor: '#b45309' }]}>
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50, backgroundColor: '#92400e', borderBottomRightRadius: 40 }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#fbbf24', letterSpacing: 3, marginTop: 16 }}>{(data.company || 'COMPANY').toUpperCase()}</Text>
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#fde68a', marginTop: 6 }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#d97706', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      <View style={{ marginTop: 10 }}><InfoRows data={data} iconColor="#f59e0b" textColor="#fcd34d" /></View>
    </View>
  </View>
);

// 20. Arctic
const ArcticCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#f8fafc', borderColor: '#bae6fd' }]}>
    <View style={{ position: 'absolute', bottom: 0, right: 0, width: 100, height: 70, backgroundColor: '#e0f2fe', borderTopLeftRadius: 60 }} />
    <View style={{ position: 'absolute', top: 0, left: 0, width: 70, height: 50, backgroundColor: '#f0f9ff', borderBottomRightRadius: 40 }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 42, height: 42, borderRadius: 8, backgroundColor: '#0284c7', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '900' }}>{initials(data.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#0c4a6e' }}>{data.name || 'Your Name'}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#0369a1', marginTop: 1 }}>{data.title || 'Your Title'}</Text>
        </View>
      </View>
      {data.company ? <Text style={{ fontSize: 9, color: '#0284c7', marginTop: 4, marginLeft: 52 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(2,132,199,0.12)', marginVertical: 8 }} />
      <InfoRows data={data} iconColor="#0284c7" textColor="#0c4a6e" />
    </View>
  </View>
);

// 21. Magenta
const MagentaCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#831843', borderColor: '#ec4899' }]}>
    <View style={{ position: 'absolute', right: -10, top: -10, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(236,72,153,0.15)' }} />
    <View style={{ position: 'absolute', left: '30%', bottom: -15, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(244,114,182,0.1)' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#fce7f3' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#f9a8d4', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#ec4899', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(236,72,153,0.3)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#f472b6" textColor="#fce7f3" />
    </View>
    <View style={{ position: 'absolute', top: 14, right: 14, width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#ec4899', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#f9a8d4', fontSize: 13, fontWeight: '900' }}>{initials(data.name)}</Text>
    </View>
  </View>
);

// 22. Olive
const OliveCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#1a2e05', borderColor: '#4d7c0f' }]}>
    <View style={{ position: 'absolute', top: 0, right: 0, width: 5, height: '100%', backgroundColor: '#84cc16' }} />
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#65a30d' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center' }}>
      <Text style={{ fontSize: 9, fontWeight: '800', color: '#84cc16', letterSpacing: 4 }}>{(data.title || 'TITLE').toUpperCase()}</Text>
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#ecfccb', marginTop: 4 }}>{data.name || 'Your Name'}</Text>
      {data.company ? <Text style={{ fontSize: 10, color: '#a3e635', marginTop: 3 }}>{data.company}</Text> : null}
      <View style={{ marginTop: 10 }}><InfoRows data={data} iconColor="#84cc16" textColor="#d9f99d" /></View>
    </View>
  </View>
);

// 23. Slate
const SlateCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}>
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '38%', backgroundColor: '#334155', borderBottomRightRadius: 80 }} />
    <View style={{ flex: 1, flexDirection: 'row', zIndex: 1 }}>
      <View style={{ width: '38%', padding: 16, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>{initials(data.name)}</Text>
        </View>
        <Text style={{ color: '#e2e8f0', fontSize: 8, fontWeight: '700', marginTop: 6, letterSpacing: 1, textAlign: 'center' }}>{(data.company || '').toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '900', color: '#1e293b' }}>{data.name || 'Your Name'}</Text>
        <Text style={{ fontSize: 10, fontWeight: '600', color: '#475569', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
        <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 }} />
        <InfoRows data={data} iconColor="#475569" textColor="#334155" />
      </View>
    </View>
  </View>
);

// 24. Indigo
const IndigoCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#312e81', borderColor: '#6366f1' }]}>
    <View style={{ position: 'absolute', top: -30, right: '15%', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(99,102,241,0.12)' }} />
    <View style={{ position: 'absolute', bottom: -20, left: '10%', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(129,140,248,0.08)' }} />
    <View style={{ position: 'absolute', top: '40%', right: -15, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(165,180,252,0.1)' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#e0e7ff' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#a5b4fc', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#818cf8', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(129,140,248,0.2)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#818cf8" textColor="#c7d2fe" />
    </View>
  </View>
);

// 25. Peach
const PeachCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
    <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, backgroundColor: '#f97316' }} />
    <View style={{ position: 'absolute', top: -20, left: '50%', width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(251,146,60,0.08)' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#9a3412' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#ea580c', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#f97316', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(249,115,22,0.15)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#ea580c" textColor="#7c2d12" />
    </View>
    <View style={{ position: 'absolute', top: 14, right: 18, width: 38, height: 38, borderRadius: 10, backgroundColor: '#f97316', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>{initials(data.name)}</Text>
    </View>
  </View>
);

// 26. Carbon
const CarbonCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#171717', borderColor: '#404040' }]}>
    {[0,1,2,3,4,5,6,7].map(i => (
      <View key={i} style={{ position: 'absolute', top: -20 + i * 30, left: -50, width: CARD_W + 100, height: 1, backgroundColor: 'rgba(255,255,255,0.03)', transform: [{ rotate: '-30deg' }] }} />
    ))}
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#ef4444' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#fafafa', letterSpacing: -0.3 }}>{data.name || 'Your Name'}</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
          {data.company ? <Text style={{ fontSize: 9, color: '#737373', marginTop: 1 }}>{data.company}</Text> : null}
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>{initials(data.name)}</Text>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#ef4444" textColor="#a3a3a3" />
    </View>
  </View>
);

// 27. Emerald
const EmeraldCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#064e3b', borderColor: '#10b981' }]}>
    <View style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 45, backgroundColor: '#047857' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="diamond" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#d1fae5' }}>{data.name || 'Your Name'}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#6ee7b7', marginTop: 1 }}>{data.title || 'Your Title'}</Text>
        </View>
      </View>
      {data.company ? <Text style={{ fontSize: 9, color: '#34d399', marginTop: 4, marginLeft: 50 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(16,185,129,0.2)', marginVertical: 8 }} />
      <InfoRows data={data} iconColor="#34d399" textColor="#a7f3d0" />
    </View>
  </View>
);

// 28. Royal
const RoyalCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#1e3a5f', borderColor: '#2563eb' }]}>
    <View style={{ position: 'absolute', right: 0, top: 0, width: 90, height: '100%', backgroundColor: '#1e40af', borderTopLeftRadius: 50, borderBottomLeftRadius: 100 }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#dbeafe' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#93c5fd', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#60a5fa', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ marginTop: 10 }}><InfoRows data={data} iconColor="#60a5fa" textColor="#bfdbfe" /></View>
    </View>
    <View style={{ position: 'absolute', top: 16, right: 20, zIndex: 2 }}>
      <Ionicons name="shield-checkmark" size={28} color="rgba(147,197,253,0.4)" />
    </View>
  </View>
);

// 29. Bubblegum
const BubblegumCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#fdf2f8', borderColor: '#f9a8d4' }]}>
    <View style={{ position: 'absolute', top: -15, left: -15, width: 60, height: 60, borderRadius: 30, backgroundColor: '#fbcfe8' }} />
    <View style={{ position: 'absolute', bottom: -10, right: -10, width: 50, height: 50, borderRadius: 25, backgroundColor: '#f9a8d4' }} />
    <View style={{ position: 'absolute', top: '30%', right: '25%', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(244,114,182,0.15)' }} />
    <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#9d174d' }}>{data.name || 'Your Name'}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#db2777', marginTop: 2 }}>{data.title || 'Your Title'}</Text>
      {data.company ? <Text style={{ fontSize: 9, color: '#ec4899', marginTop: 1 }}>{data.company}</Text> : null}
      <View style={{ height: 1, backgroundColor: 'rgba(219,39,119,0.1)', marginVertical: 10 }} />
      <InfoRows data={data} iconColor="#db2777" textColor="#831843" />
    </View>
  </View>
);

// 30. Charcoal
const CharcoalCard = ({ data }: { data: CardData }) => (
  <View style={[cs.card, { backgroundColor: '#27272a', borderColor: '#52525b' }]}>
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, backgroundColor: '#18181b' }} />
    <View style={{ flex: 1, padding: 18, zIndex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#fafafa', letterSpacing: -0.5 }}>{data.name || 'Your Name'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <View style={{ height: 1, width: 20, backgroundColor: '#71717a' }} />
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#a1a1aa', letterSpacing: 1 }}>{(data.title || 'Your Title').toUpperCase()}</Text>
        </View>
        {data.company ? <Text style={{ fontSize: 9, color: '#71717a', marginTop: 2, marginLeft: 28 }}>{data.company}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="call" size={10} color="#a1a1aa" />
          <Text style={{ fontSize: 10, color: '#d4d4d8' }}>{data.phone || '+92 300 0000000'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="mail" size={10} color="#a1a1aa" />
          <Text style={{ fontSize: 10, color: '#d4d4d8' }}>{data.email || 'email@example.com'}</Text>
        </View>
      </View>
    </View>
  </View>
);

// ══════════════════════════════════════════
// ─── TEMPLATE REGISTRY ───
// ══════════════════════════════════════════

export const TEMPLATES = [
  { id: 'classic', label: 'Classic', icon: 'grid-outline' as const, Component: ClassicCard },
  { id: 'modern', label: 'Modern', icon: 'layers-outline' as const, Component: ModernCard },
  { id: 'bold', label: 'Bold', icon: 'flash-outline' as const, Component: BoldCard },
  { id: 'minimal', label: 'Minimal', icon: 'remove-outline' as const, Component: MinimalCard },
  { id: 'elegant', label: 'Elegant', icon: 'diamond-outline' as const, Component: ElegantCard },
  { id: 'sunset', label: 'Sunset', icon: 'sunny-outline' as const, Component: SunsetCard },
  { id: 'ocean', label: 'Ocean', icon: 'water-outline' as const, Component: OceanCard },
  { id: 'neon', label: 'Neon', icon: 'bulb-outline' as const, Component: NeonCard },
  { id: 'rosegold', label: 'Rose Gold', icon: 'heart-outline' as const, Component: RoseGoldCard },
  { id: 'galaxy', label: 'Galaxy', icon: 'planet-outline' as const, Component: GalaxyCard },
  { id: 'forest', label: 'Forest', icon: 'leaf-outline' as const, Component: ForestCard },
  { id: 'cherry', label: 'Cherry', icon: 'flame-outline' as const, Component: CherryCard },
  { id: 'ice', label: 'Ice Blue', icon: 'snow-outline' as const, Component: IceCard },
  { id: 'midnight', label: 'Midnight', icon: 'moon-outline' as const, Component: MidnightCard },
  { id: 'coral', label: 'Coral', icon: 'rose-outline' as const, Component: CoralCard },
  { id: 'teal', label: 'Teal', icon: 'fish-outline' as const, Component: TealCard },
  { id: 'lavender', label: 'Lavender', icon: 'flower-outline' as const, Component: LavenderCard },
  { id: 'golden', label: 'Golden', icon: 'star-outline' as const, Component: GoldenCard },
  { id: 'copper', label: 'Copper', icon: 'bonfire-outline' as const, Component: CopperCard },
  { id: 'arctic', label: 'Arctic', icon: 'cloudy-outline' as const, Component: ArcticCard },
  { id: 'magenta', label: 'Magenta', icon: 'color-palette-outline' as const, Component: MagentaCard },
  { id: 'olive', label: 'Olive', icon: 'shield-outline' as const, Component: OliveCard },
  { id: 'slate', label: 'Slate', icon: 'browsers-outline' as const, Component: SlateCard },
  { id: 'indigo', label: 'Indigo', icon: 'prism-outline' as const, Component: IndigoCard },
  { id: 'peach', label: 'Peach', icon: 'nutrition-outline' as const, Component: PeachCard },
  { id: 'carbon', label: 'Carbon', icon: 'speedometer-outline' as const, Component: CarbonCard },
  { id: 'emerald', label: 'Emerald', icon: 'diamond-outline' as const, Component: EmeraldCard },
  { id: 'royal', label: 'Royal', icon: 'ribbon-outline' as const, Component: RoyalCard },
  { id: 'bubblegum', label: 'Bubble', icon: 'ellipse-outline' as const, Component: BubblegumCard },
  { id: 'charcoal', label: 'Charcoal', icon: 'contrast-outline' as const, Component: CharcoalCard },
];

// ══════════════════════════════════════════
// ─── MAIN SCREEN ───
// ══════════════════════════════════════════

export default function VisitingCardScreen() {
  const { isDarkMode } = useTheme();
  const { user, token, updateUser } = useAuth();
  const { t } = useTranslation();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';

  const saved = user?.visitingCard as any;
  const [cardData, setCardData] = useState<CardData>({
    name: saved?.cardData?.name || user?.name || '',
    title: saved?.cardData?.title || '',
    phone: saved?.cardData?.phone || '',
    email: saved?.cardData?.email || user?.email || '',
    address: saved?.cardData?.address || '',
    company: saved?.cardData?.company || '',
    website: saved?.cardData?.website || '',
  });
  const [customDesign, setCustomDesign] = useState<CustomDesign>({
    bgColor: saved?.customDesign?.bgColor || '#0f172a',
    accentColor: saved?.customDesign?.accentColor || '#22d3ee',
    textColor: saved?.customDesign?.textColor || '#f1f5f9',
    subtextColor: saved?.customDesign?.subtextColor || '#94a3b8',
    layout: saved?.customDesign?.layout || 'left-accent',
    circleStyle: saved?.customDesign?.circleStyle || 'round',
    showLogo: saved?.customDesign?.showLogo ?? true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>(saved?.isCustom ? 'custom' : 'templates');
  const [currentCardIndex, setCurrentCardIndex] = useState(() => {
    const idx = TEMPLATES.findIndex(t => t.id === (saved?.templateId || 'classic'));
    return idx >= 0 ? idx : 0;
  });

  const cardRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const isCustom = activeTab === 'custom';
  const currentTemplateId = isCustom ? 'custom' : TEMPLATES[currentCardIndex]?.id || 'classic';

  const goToCard = (idx: number) => {
    if (idx < 0 || idx >= TEMPLATES.length) return;
    selectionHaptic();
    const direction = idx > currentCardIndex ? -1 : 1;
    Animated.timing(swipeAnim, { toValue: direction * CARD_W, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentCardIndex(idx);
      swipeAnim.setValue(-direction * CARD_W);
      Animated.spring(swipeAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 15 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => { swipeAnim.setValue(gs.dx); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 60 && currentCardIndex > 0) {
          Animated.timing(swipeAnim, { toValue: CARD_W, duration: 150, useNativeDriver: true }).start(() => {
            setCurrentCardIndex(prev => prev - 1);
            swipeAnim.setValue(-CARD_W);
            Animated.spring(swipeAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
          });
        } else if (gs.dx < -60 && currentCardIndex < TEMPLATES.length - 1) {
          Animated.timing(swipeAnim, { toValue: -CARD_W, duration: 150, useNativeDriver: true }).start(() => {
            setCurrentCardIndex(prev => prev + 1);
            swipeAnim.setValue(CARD_W);
            Animated.spring(swipeAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
          });
        } else {
          Animated.spring(swipeAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const renderCurrentCard = () => {
    if (isCustom) return <CustomCard data={cardData} design={customDesign} />;
    const CardComp = TEMPLATES[currentCardIndex]?.Component || ClassicCard;
    return (
      <View style={{ position: 'relative' }}>
        <CardComp data={cardData} isDark={isDarkMode} />
        <CardWatermark light={!isDarkMode} />
      </View>
    );
  };

  const captureCurrentCard = async (): Promise<string | null> => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      const filename = `${FileSystem.documentDirectory}visiting_card_${Date.now()}.png`;
      await FileSystem.copyAsync({ from: uri, to: filename });
      return filename;
    } catch (e) {
      console.error('Capture error:', e);
      return null;
    }
  };

  const saveCard = async () => {
    tapHaptic();
    const file = await captureCurrentCard();
    if (!file) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(file);
        successHaptic();
        showSuccess(t('visitingCard.cardSavedGallery'));
        return;
      }
    } catch {}
    // Fallback to share sheet (Expo Go / permission denied)
    await Sharing.shareAsync(file, { mimeType: 'image/png', dialogTitle: 'Save Visiting Card' });
  };

  const shareCard = async () => {
    const file = await captureCurrentCard();
    if (file) {
      await Sharing.shareAsync(file, { mimeType: 'image/png', dialogTitle: 'Share Visiting Card' });
    }
  };

  const updateField = (field: keyof CardData, value: string) => {
    setCardData(prev => ({ ...prev, [field]: value }));
  };

  const updateDesign = (field: keyof CustomDesign, value: any) => {
    setCustomDesign(prev => ({ ...prev, [field]: value }));
  };

  const saveToProfile = async () => {
    if (!cardData.name.trim()) {
      showError(t('visitingCard.enterName'));
      return;
    }
    setIsSaving(true);
    try {
      const visitingCard = {
        cardData,
        templateId: isCustom ? 'custom' : currentTemplateId,
        customDesign: isCustom ? customDesign : undefined,
        isCustom,
      };
      const res = await fetch(`${config.BASE_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visitingCard }),
      });
      const data = await res.json();
      if (data.success) {
        await updateUser({ visitingCard } as any);
        successHaptic();
        showSuccess(t('visitingCard.cardSaved'));
      } else {
        showError(data.message || t('visitingCard.saveFailed'));
      }
    } catch (error) {
      console.error('Save to profile error:', error);
      showError(t('visitingCard.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const fields = [
    { key: 'name' as const, label: t('visitingCard.fullName'), icon: 'person-outline' as const, placeholder: 'Muhammad Ali' },
    { key: 'title' as const, label: t('visitingCard.designation'), icon: 'briefcase-outline' as const, placeholder: 'Software Engineer' },
    { key: 'company' as const, label: t('visitingCard.company'), icon: 'business-outline' as const, placeholder: 'KhaataWise Inc.' },
    { key: 'phone' as const, label: t('visitingCard.phone'), icon: 'call-outline' as const, placeholder: '+92 300 1234567', keyboard: 'phone-pad' as const },
    { key: 'email' as const, label: t('visitingCard.email'), icon: 'mail-outline' as const, placeholder: 'ali@example.com', keyboard: 'email-address' as const },
    { key: 'website' as const, label: t('visitingCard.website'), icon: 'globe-outline' as const, placeholder: 'www.example.com' },
    { key: 'address' as const, label: t('visitingCard.address'), icon: 'location-outline' as const, placeholder: 'Lahore, Pakistan' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: isDarkMode ? '#1c1e1f' : accent, borderColor: isDarkMode ? 'rgba(34,211,238,0.2)' : 'transparent' }]}>
        <TouchableOpacity onPress={() => goBack()} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('visitingCard.title')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={saveCard} style={s.headerBtn}>
            <Ionicons name="download-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={shareCard} style={s.headerBtn}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Tab Switch: Templates / Custom */}
        <View style={[s.tabBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f1f5f9', borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
          <TouchableOpacity
            style={[s.tab, !isCustom && { backgroundColor: accent }]}
            onPress={() => setActiveTab('templates')}
          >
            <Ionicons name="albums-outline" size={16} color={!isCustom ? '#fff' : COLORS.textMuted} />
            <Text style={[s.tabText, { color: !isCustom ? '#fff' : COLORS.text }]}>{t('visitingCard.templates')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, isCustom && { backgroundColor: accent }]}
            onPress={() => setActiveTab('custom')}
          >
            <Ionicons name="color-wand-outline" size={16} color={isCustom ? '#fff' : COLORS.textMuted} />
            <Text style={[s.tabText, { color: isCustom ? '#fff' : COLORS.text }]}>{t('visitingCard.customDesign')}</Text>
          </TouchableOpacity>
        </View>

        {/* Card Preview - only for templates (custom has its own canvas in controls) */}
        {!isCustom && (
          <Animated.View style={[s.previewSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={{ overflow: 'hidden', borderRadius: 16 }} {...panResponder.panHandlers}>
              <Animated.View style={{ transform: [{ translateX: swipeAnim }] }}>
                {renderCurrentCard()}
              </Animated.View>
            </View>

            {/* Template name + nav arrows */}
            <View style={s.cardNav}>
              <TouchableOpacity
                onPress={() => goToCard(currentCardIndex - 1)}
                style={[s.navArrow, { opacity: currentCardIndex === 0 ? 0.3 : 1 }]}
                disabled={currentCardIndex === 0}
              >
                <Ionicons name="chevron-back" size={20} color={accent} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={[s.cardNavLabel, { color: COLORS.text }]}>
                  {TEMPLATES[currentCardIndex]?.label || 'Classic'}
                </Text>
                <Text style={[s.cardNavCount, { color: COLORS.textMuted }]}>
                  {currentCardIndex + 1} / {TEMPLATES.length}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => goToCard(currentCardIndex + 1)}
                style={[s.navArrow, { opacity: currentCardIndex === TEMPLATES.length - 1 ? 0.3 : 1 }]}
                disabled={currentCardIndex === TEMPLATES.length - 1}
              >
                <Ionicons name="chevron-forward" size={20} color={accent} />
              </TouchableOpacity>
            </View>

            {/* Swipe hint */}
            <View style={s.swipeHint}>
              <Ionicons name="chevron-back" size={14} color={COLORS.textMuted} />
              <Text style={[s.swipeHintText, { color: COLORS.textMuted }]}>{t('visitingCard.swipeToBrowse')}</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
            </View>
          </Animated.View>
        )}

        {/* Custom Design Controls (includes live card canvas with drag) */}
        {isCustom && (
          <CustomDesignControls
            design={customDesign}
            onUpdateDesign={updateDesign}
            COLORS={COLORS}
            isDarkMode={isDarkMode}
            accent={accent}
            cardData={cardData}
            scrollRef={scrollViewRef}
          />
        )}

        {/* Form */}
        <View style={s.formSection}>
          <Text style={[s.sectionLabel, { color: COLORS.textMuted }]}>{t('visitingCard.cardDetails')}</Text>
          {fields.map(f => (
            <View key={f.key} style={[s.inputRow, {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f9fafb',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
            }]}>
              <Ionicons name={f.icon} size={18} color={accent} style={{ marginRight: 10 }} />
              <TextInput
                style={[s.input, { color: COLORS.text }]}
                placeholder={f.placeholder}
                placeholderTextColor={isDarkMode ? '#4b5563' : '#9ca3af'}
                value={cardData[f.key]}
                onChangeText={v => updateField(f.key, v)}
                keyboardType={f.keyboard || 'default'}
                autoCapitalize={f.key === 'email' || f.key === 'website' ? 'none' : 'words'}
              />
            </View>
          ))}
        </View>

        {/* Save to Profile Button */}
        <View style={{ paddingHorizontal: 24, marginTop: isCustom ? 20 : 0 }}>
          <TouchableOpacity
            style={[s.saveProfileBtn, { backgroundColor: accent, opacity: isSaving ? 0.7 : 1 }]}
            onPress={saveToProfile}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="bookmark-outline" size={20} color="#fff" />
                <Text style={s.saveProfileBtnText}>{t('visitingCard.saveToProfile')}</Text>
              </>
            )}
          </TouchableOpacity>
          {user?.visitingCard && (
            <Text style={[s.savedHint, { color: COLORS.textMuted }]}>
              {t('visitingCard.alreadySaved')}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Hidden card for screenshot capture */}
      <View style={{ position: 'absolute', left: -9999 }} pointerEvents="none">
        <View ref={cardRef} collapsable={false}>
          {renderCurrentCard()}
        </View>
      </View>
    </View>
  );
}

// ─── Page Styles ───
const s = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewSection: { paddingHorizontal: 24, paddingTop: 24 },
  cardNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingHorizontal: 4,
  },
  navArrow: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  cardNavLabel: { fontSize: 16, fontWeight: '800' },
  cardNavCount: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  swipeHint: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, marginTop: 6,
  },
  swipeHintText: { fontSize: 12, fontWeight: '500' },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 24, marginTop: 16,
    borderRadius: 14, padding: 4, borderWidth: 1,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 11,
  },
  tabText: { fontSize: 13, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
  formSection: { paddingHorizontal: 24, marginTop: 24 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, height: 50, borderRadius: 12,
    borderWidth: 1, marginBottom: 10,
  },
  input: { flex: 1, fontSize: 15, fontWeight: '500' },
  saveProfileBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 20,
  },
  saveProfileBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  savedHint: { textAlign: 'center', fontSize: 12, marginTop: 8, fontWeight: '500' },
});

// ─── Card Template Styles ───
const cs = StyleSheet.create({
  card: {
    width: CARD_W, height: CARD_H, borderRadius: 16, borderWidth: 1,
    overflow: 'hidden', position: 'relative',
  },
  // Classic
  classicAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  classicBody: { flex: 1, paddingLeft: 20, paddingRight: 16, paddingTop: 18, justifyContent: 'center' },
  classicName: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  classicTitle: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  classicCompany: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  classicDivider: { height: 1, backgroundColor: 'rgba(128,128,128,0.15)', marginVertical: 8 },
  classicRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  classicInfo: { fontSize: 10, fontWeight: '500' },
  classicLogo: {
    position: 'absolute', top: 16, right: 16,
    width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
  },
  classicLogoText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  // Modern
  modernTop: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, flex: 1 },
  modernCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  modernInitials: { color: '#fff', fontSize: 18, fontWeight: '900' },
  modernNameBlock: { flex: 1 },
  modernName: { fontSize: 18, fontWeight: '800' },
  modernTitle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  modernCompany: { fontSize: 9, fontWeight: '500', marginTop: 1 },
  modernBottom: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  modernInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  modernInfo: { fontSize: 10, fontWeight: '500' },
  // Bold
  boldBody: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  boldName: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  boldTitle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  boldCompany: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  boldFooter: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.15)', flexDirection: 'row', flexWrap: 'wrap', gap: 14,
  },
  boldInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  boldInfo: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  boldCorner: {
    position: 'absolute', top: 14, right: 14,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  boldCornerText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  // Minimal
  minimalBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  minimalName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  minimalLine: { width: 30, height: 2.5, borderRadius: 2, marginVertical: 8 },
  minimalTitle: { fontSize: 11, fontWeight: '500' },
  minimalFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16 },
  minimalInfo: { fontSize: 10, fontWeight: '500' },
  minimalDot: { fontSize: 10 },
  minimalAddress: { paddingHorizontal: 24, paddingBottom: 12, fontSize: 9, fontWeight: '500' },
  // Elegant
  elegantStripe: { height: 4 },
  elegantContent: { flex: 1, flexDirection: 'row', padding: 16 },
  elegantLeft: { flex: 1, justifyContent: 'center' },
  elegantName: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  elegantTitle: { fontSize: 11, fontWeight: '500', marginTop: 3 },
  elegantCompany: { fontSize: 9, fontWeight: '500', marginTop: 1 },
  elegantRight: { justifyContent: 'center', alignItems: 'flex-end', gap: 4 },
  elegantInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  elegantInfo: { fontSize: 10, fontWeight: '500' },
});
