import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Platform, Dimensions, Modal, PanResponder, KeyboardAvoidingView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 48;
const CARD_H = CARD_W * 0.58;

// ─── Helper: detect if bg color is light ───
const isLightBg = (hex: string) => {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
};

// ─── Card Watermark (inside every card) ───
export const CardWatermark = ({ light = false }: { light?: boolean }) => (
  <View style={{ position: 'absolute', bottom: 5, right: 8, opacity: 0.4, zIndex: 0 }} pointerEvents="none">
    <Text style={{ fontSize: 7, fontWeight: '900', color: light ? '#000' : '#fff', letterSpacing: 1 }}>KhaataWise</Text>
  </View>
);

export interface CardData {
  name: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  company: string;
  website: string;
}

export interface CardElement {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight: '300' | '400' | '600' | '700' | '900';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number;
  textTransform: 'none' | 'uppercase';
  fontId?: string;
}

export interface CustomDesign {
  bgColor: string;
  accentColor: string;
  textColor: string;
  subtextColor: string;
  layout: 'left-accent' | 'top-banner' | 'split' | 'centered' | 'corner-circle' | 'diagonal';
  circleStyle: 'round' | 'square' | 'diamond' | 'none';
  showLogo: boolean;
  elements?: CardElement[];
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
}

const initials = (name: string) =>
  (name || 'KW').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

// ─── Constants ───
const COLOR_PALETTES = [
  { name: 'Ocean', bg: '#0077b6', accent: '#00b4d8', text: '#caf0f8', subtext: '#90e0ef' },
  { name: 'Midnight', bg: '#0f172a', accent: '#22d3ee', text: '#f1f5f9', subtext: '#94a3b8' },
  { name: 'Forest', bg: '#14532d', accent: '#22c55e', text: '#dcfce7', subtext: '#86efac' },
  { name: 'Sunset', bg: '#7c2d12', accent: '#fb923c', text: '#fff7ed', subtext: '#fed7aa' },
  { name: 'Royal', bg: '#1e1b4b', accent: '#818cf8', text: '#e0e7ff', subtext: '#a5b4fc' },
  { name: 'Cherry', bg: '#881337', accent: '#fb7185', text: '#fff1f2', subtext: '#fda4af' },
  { name: 'Golden', bg: '#1c1917', accent: '#eab308', text: '#fef9c3', subtext: '#fde047' },
  { name: 'Neon', bg: '#0a0a0a', accent: '#39ff14', text: '#f0fdf4', subtext: '#86efac' },
  { name: 'Rose', bg: '#2d1f2f', accent: '#f472b6', text: '#fce7f3', subtext: '#f9a8d4' },
  { name: 'Teal', bg: '#042f2e', accent: '#2dd4bf', text: '#ccfbf1', subtext: '#5eead4' },
  { name: 'White', bg: '#ffffff', accent: '#0a7ea4', text: '#0f172a', subtext: '#475569' },
  { name: 'Cream', bg: '#fef3c7', accent: '#b45309', text: '#451a03', subtext: '#78350f' },
  { name: 'Slate', bg: '#334155', accent: '#f8fafc', text: '#f1f5f9', subtext: '#cbd5e1' },
  { name: 'Copper', bg: '#1c1210', accent: '#f59e0b', text: '#fde68a', subtext: '#fbbf24' },
  { name: 'Lavender', bg: '#faf5ff', accent: '#9333ea', text: '#581c87', subtext: '#7e22ce' },
  { name: 'Carbon', bg: '#171717', accent: '#ef4444', text: '#fafafa', subtext: '#a3a3a3' },
];

const EXTRA_COLORS = [
  '#0f172a', '#1e293b', '#334155', '#475569', '#64748b',
  '#0a0a0a', '#171717', '#262626', '#404040', '#525252',
  '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444',
  '#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b',
  '#14532d', '#166534', '#15803d', '#22c55e', '#4ade80',
  '#0c4a6e', '#075985', '#0369a1', '#0284c7', '#0ea5e9',
  '#312e81', '#3730a3', '#4338ca', '#6366f1', '#818cf8',
  '#701a75', '#86198f', '#a21caf', '#c026d3', '#d946ef',
  '#831843', '#9f1239', '#be123c', '#e11d48', '#f43f5e',
  '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#fef3c7',
  '#fdf2f8', '#faf5ff', '#ecfdf5', '#f0f9ff', '#fff7ed',
];

const LAYOUTS: { id: CustomDesign['layout']; label: string; icon: string }[] = [
  { id: 'left-accent', label: 'Side Bar', icon: 'reorder-two-outline' },
  { id: 'top-banner', label: 'Banner', icon: 'tablet-landscape-outline' },
  { id: 'split', label: 'Split', icon: 'git-compare-outline' },
  { id: 'centered', label: 'Center', icon: 'scan-outline' },
  { id: 'corner-circle', label: 'Corner', icon: 'apps-outline' },
  { id: 'diagonal', label: 'Diagonal', icon: 'trending-up-outline' },
];

const CIRCLE_STYLES: { id: CustomDesign['circleStyle']; label: string; icon: string }[] = [
  { id: 'round', label: 'Round', icon: 'ellipse-outline' },
  { id: 'square', label: 'Square', icon: 'square-outline' },
  { id: 'diamond', label: 'Diamond', icon: 'diamond-outline' },
  { id: 'none', label: 'None', icon: 'close-circle-outline' },
];

const FONTS = [
  { id: 'default', label: 'Default', style: {} },
  { id: 'serif', label: 'Serif', style: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' } },
  { id: 'mono', label: 'Mono', style: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' } },
  { id: 'sans', label: 'Sans', style: { fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif' } },
];

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32];
const FONT_WEIGHTS: { id: CardElement['fontWeight']; label: string }[] = [
  { id: '300', label: 'Light' }, { id: '400', label: 'Regular' },
  { id: '600', label: 'Semi' }, { id: '700', label: 'Bold' }, { id: '900', label: 'Black' },
];

// ─── Info Row ───
const InfoRow = ({ icon, text, color }: { icon: string; text: string; color: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
    <Ionicons name={icon as any} size={11} color={color} />
    <Text style={{ fontSize: 10, fontWeight: '500', color }} numberOfLines={1}>{text}</Text>
  </View>
);

// ─── Draggable Text Element ───
const CANVAS_W = CARD_W - 12; // actual card width inside canvas padding

const DraggableText = React.memo(({ el, isSelected, onSelect, onMoveEnd, scrollRef }: {
  el: CardElement; isSelected: boolean;
  onSelect: () => void;
  onMoveEnd: (newX: number, newY: number) => void;
  scrollRef?: React.RefObject<ScrollView | null>;
}) => {
  const fontStyle = FONTS.find(f => f.id === el.fontId)?.style || {};

  // Refs to avoid stale closures in PanResponder
  const elRef = useRef(el);
  const onSelectRef = useRef(onSelect);
  const onMoveEndRef = useRef(onMoveEnd);
  const scrollRefRef = useRef(scrollRef);
  elRef.current = el;
  onSelectRef.current = onSelect;
  onMoveEndRef.current = onMoveEnd;
  scrollRefRef.current = scrollRef;

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
    onPanResponderGrant: () => {
      onSelectRef.current();
      scrollRefRef.current?.current?.setNativeProps?.({ scrollEnabled: false });
    },
    onPanResponderMove: (_, gs) => {
      translateX.setValue(gs.dx);
      translateY.setValue(gs.dy);
    },
    onPanResponderRelease: (_, gs) => {
      const cur = elRef.current;
      const newX = Math.max(0, Math.min(90, cur.x + (gs.dx / CANVAS_W) * 100));
      const newY = Math.max(0, Math.min(85, cur.y + (gs.dy / CARD_H) * 100));
      translateX.setValue(0);
      translateY.setValue(0);
      onMoveEndRef.current(newX, newY);
      scrollRefRef.current?.current?.setNativeProps?.({ scrollEnabled: true });
    },
    onPanResponderTerminate: () => {
      translateX.setValue(0);
      translateY.setValue(0);
      scrollRefRef.current?.current?.setNativeProps?.({ scrollEnabled: true });
    },
  })).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        left: (el.x / 100) * CANVAS_W,
        top: (el.y / 100) * CARD_H,
        transform: [{ translateX }, { translateY }],
        borderWidth: isSelected ? 1.5 : 0,
        borderColor: '#22d3ee',
        borderStyle: 'dashed',
        padding: isSelected ? 3 : 0,
        borderRadius: 3,
        maxWidth: CANVAS_W * 0.85,
        zIndex: isSelected ? 10 : 1,
      }}
    >
      <Text
        style={[{
          fontSize: el.fontSize,
          fontWeight: el.fontWeight,
          color: el.color,
          textAlign: el.textAlign,
          letterSpacing: el.letterSpacing,
          textTransform: el.textTransform === 'uppercase' ? 'uppercase' : 'none',
        }, fontStyle]}
        numberOfLines={3}
      >
        {el.content || 'Text'}
      </Text>
    </Animated.View>
  );
});

// ══════════════════════════════════════════
// ─── Custom Card Renderer ───
// ══════════════════════════════════════════
export const CustomCard = ({ data, design }: { data: CardData; design: CustomDesign }) => {
  const { bgColor, accentColor, textColor, subtextColor, layout, circleStyle, showLogo } = design;
  const elements = design.elements || [];
  const bw = design.borderWidth ?? 1;
  const br = design.borderRadius ?? 16;
  const bc = design.borderColor || accentColor;

  const renderCircle = () => {
    if (!showLogo || circleStyle === 'none') return null;
    const size = layout === 'split' ? 52 : 44;
    const radius = circleStyle === 'round' ? size / 2 : circleStyle === 'square' ? 8 : 4;
    const rot = circleStyle === 'diamond' ? [{ rotate: '45deg' }] : [];
    const tRot = circleStyle === 'diamond' ? [{ rotate: '-45deg' }] : [];
    return (
      <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center', transform: rot }}>
        <Text style={{ color: bgColor, fontSize: size * 0.35, fontWeight: '900', transform: tRot }}>{initials(data.name)}</Text>
      </View>
    );
  };

  const renderInfo = () => (
    <View style={{ gap: 3 }}>
      {data.phone ? <InfoRow icon="call" text={data.phone} color={subtextColor} /> : null}
      {data.email ? <InfoRow icon="mail" text={data.email} color={subtextColor} /> : null}
      {data.website ? <InfoRow icon="globe-outline" text={data.website} color={subtextColor} /> : null}
      {data.address ? <InfoRow icon="location" text={data.address} color={subtextColor} /> : null}
    </View>
  );

  const cs = { width: CARD_W, height: CARD_H, borderRadius: br, borderWidth: bw, overflow: 'hidden' as const, position: 'relative' as const, backgroundColor: bgColor, borderColor: bc };

  const renderLayout = () => {
    if (layout === 'top-banner') return (
      <>
        <View style={{ height: 50, backgroundColor: accentColor, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View><Text style={{ fontSize: 18, fontWeight: '900', color: bgColor }}>{data.name || 'Your Name'}</Text><Text style={{ fontSize: 10, fontWeight: '600', color: bgColor + 'cc' }}>{data.title || 'Designation'}</Text></View>
          {renderCircle()}
        </View>
        <View style={{ flex: 1, paddingHorizontal: 18, paddingVertical: 10, justifyContent: 'center' }}>
          {data.company ? <Text style={{ fontSize: 10, fontWeight: '700', color: accentColor, letterSpacing: 2, marginBottom: 6 }}>{data.company.toUpperCase()}</Text> : null}
          {renderInfo()}
        </View>
      </>
    );
    if (layout === 'split') return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ width: '38%', backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center', padding: 12 }}>
          {renderCircle()}
          {data.company ? <Text style={{ color: bgColor + 'cc', fontSize: 8, fontWeight: '700', marginTop: 6, letterSpacing: 1, textAlign: 'center' }}>{data.company.toUpperCase()}</Text> : null}
        </View>
        <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: textColor }}>{data.name || 'Your Name'}</Text>
          <Text style={{ fontSize: 10, fontWeight: '600', color: accentColor, marginTop: 2 }}>{data.title || 'Designation'}</Text>
          <View style={{ height: 1, backgroundColor: accentColor + '25', marginVertical: 8 }} />{renderInfo()}
        </View>
      </View>
    );
    if (layout === 'centered') return (
      <>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          {renderCircle()}
          <Text style={{ fontSize: 20, fontWeight: '900', color: textColor, marginTop: 10, textAlign: 'center' }}>{data.name || 'Your Name'}</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: accentColor, marginTop: 2 }}>{data.title || 'Designation'}</Text>
          {data.company ? <Text style={{ fontSize: 9, color: subtextColor, marginTop: 1 }}>{data.company}</Text> : null}
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {data.phone ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="call" size={10} color={accentColor} /><Text style={{ fontSize: 9, color: subtextColor }}>{data.phone}</Text></View> : null}
          {data.email ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Ionicons name="mail" size={10} color={accentColor} /><Text style={{ fontSize: 9, color: subtextColor }}>{data.email}</Text></View> : null}
        </View>
      </>
    );
    if (layout === 'corner-circle') return (
      <>
        {showLogo && <View style={{ position: 'absolute', top: -25, right: -25, width: 80, height: 80, borderRadius: 40, backgroundColor: accentColor + '18' }} />}
        <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {renderCircle()}
            <View style={{ flex: 1 }}><Text style={{ fontSize: 18, fontWeight: '900', color: textColor }}>{data.name || 'Your Name'}</Text><Text style={{ fontSize: 11, fontWeight: '700', color: accentColor, marginTop: 1 }}>{data.title || 'Designation'}</Text>{data.company ? <Text style={{ fontSize: 9, color: subtextColor, marginTop: 1 }}>{data.company}</Text> : null}</View>
          </View>
          <View style={{ height: 1, backgroundColor: accentColor + '20', marginVertical: 8 }} />{renderInfo()}
        </View>
      </>
    );
    if (layout === 'diagonal') return (
      <>
        <View style={{ position: 'absolute', top: 0, right: 0, width: '45%', height: '100%', backgroundColor: accentColor + '15', borderTopLeftRadius: 80, borderBottomLeftRadius: 120 }} />
        <View style={{ flex: 1, padding: 18, justifyContent: 'center', zIndex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: textColor }}>{data.name || 'Your Name'}</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: accentColor, marginTop: 2 }}>{data.title || 'Designation'}</Text>
          {data.company ? <Text style={{ fontSize: 10, color: subtextColor, marginTop: 1 }}>{data.company}</Text> : null}
          <View style={{ marginTop: 10 }}>{renderInfo()}</View>
        </View>
        {showLogo && <View style={{ position: 'absolute', top: 14, right: 16, zIndex: 2 }}>{renderCircle()}</View>}
      </>
    );
    // left-accent (default)
    return (
      <>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: accentColor }} />
        <View style={{ flex: 1, paddingLeft: 22, paddingRight: 16, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: textColor, letterSpacing: -0.3 }}>{data.name || 'Your Name'}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: accentColor, marginTop: 2 }}>{data.title || 'Designation'}</Text>
              {data.company ? <Text style={{ fontSize: 10, fontWeight: '500', color: subtextColor, marginTop: 1 }}>{data.company}</Text> : null}
            </View>
            {renderCircle()}
          </View>
          <View style={{ height: 1, backgroundColor: accentColor + '30', marginVertical: 8 }} />{renderInfo()}
        </View>
      </>
    );
  };

  return (
    <View style={cs}>
      {renderLayout()}
      <CardWatermark light={isLightBg(bgColor)} />
      {/* Overlay custom text elements */}
      {elements.map(el => {
        const fontStyle = FONTS.find(f => f.id === el.fontId)?.style || {};
        return (
          <View key={el.id} style={{ position: 'absolute', left: (el.x / 100) * CARD_W, top: (el.y / 100) * CARD_H, maxWidth: CARD_W * 0.9 }}>
            <Text style={[{
              fontSize: el.fontSize, fontWeight: el.fontWeight, color: el.color,
              textAlign: el.textAlign, letterSpacing: el.letterSpacing,
              textTransform: el.textTransform === 'uppercase' ? 'uppercase' : 'none',
            }, fontStyle]} numberOfLines={3}>{el.content}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Color Picker Modal ───
const ColorPickerModal = ({ visible, onClose, onSelect, currentColor, title }: {
  visible: boolean; onClose: () => void; onSelect: (c: string) => void; currentColor: string; title: string;
}) => {
  const isLight = (c: string) => ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#fef3c7', '#fdf2f8', '#faf5ff', '#ecfdf5', '#f0f9ff', '#fff7ed'].includes(c);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 20, maxHeight: '65%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={26} color="#64748b" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EXTRA_COLORS.map((c, i) => (
                <TouchableOpacity key={i} onPress={() => { onSelect(c); onClose(); }}
                  style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c, borderWidth: currentColor === c ? 3 : 1, borderColor: currentColor === c ? '#22d3ee' : 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  {currentColor === c && <Ionicons name="checkmark" size={16} color={isLight(c) ? '#000' : '#fff'} />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Edit Text Modal ───
const EditTextModal = ({ visible, onClose, value, onChange }: {
  visible: boolean; onClose: () => void; value: string; onChange: (v: string) => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Edit Text</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="checkmark-circle" size={28} color="#22d3ee" /></TouchableOpacity>
          </View>
          <TextInput style={{ color: '#fff', fontSize: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minHeight: 50 }}
            value={value} onChangeText={onChange} placeholder="Type text..." placeholderTextColor="#4b5563" multiline autoFocus />
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

// ─── Base Layout Render (layout only, no overlay elements) ───
const BaseLayoutRender = ({ data, design }: { data: CardData; design: CustomDesign }) => {
  const { accentColor, textColor, subtextColor, layout, circleStyle, showLogo, bgColor } = design;
  const renderCircle = () => {
    if (!showLogo || circleStyle === 'none') return null;
    const sz = 40; const r = circleStyle === 'round' ? 20 : circleStyle === 'square' ? 6 : 3;
    const rot = circleStyle === 'diamond' ? [{ rotate: '45deg' }] : [];
    const tR = circleStyle === 'diamond' ? [{ rotate: '-45deg' }] : [];
    return <View style={{ width: sz, height: sz, borderRadius: r, backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center', transform: rot }}><Text style={{ color: bgColor, fontSize: 14, fontWeight: '900', transform: tR }}>{initials(data.name)}</Text></View>;
  };
  const renderInfo = () => (
    <View style={{ gap: 2 }}>
      {data.phone ? <InfoRow icon="call" text={data.phone} color={subtextColor} /> : null}
      {data.email ? <InfoRow icon="mail" text={data.email} color={subtextColor} /> : null}
      {data.address ? <InfoRow icon="location" text={data.address} color={subtextColor} /> : null}
    </View>
  );
  if (layout === 'top-banner') return (<><View style={{ height: 46, backgroundColor: accentColor, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View><Text style={{ fontSize: 16, fontWeight: '900', color: bgColor }}>{data.name || 'Your Name'}</Text><Text style={{ fontSize: 9, fontWeight: '600', color: bgColor + 'cc' }}>{data.title || 'Title'}</Text></View>{renderCircle()}</View><View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8, justifyContent: 'center' }}>{data.company ? <Text style={{ fontSize: 9, fontWeight: '700', color: accentColor, letterSpacing: 2, marginBottom: 4 }}>{data.company.toUpperCase()}</Text> : null}{renderInfo()}</View></>);
  if (layout === 'split') return (<View style={{ flex: 1, flexDirection: 'row' }}><View style={{ width: '36%', backgroundColor: accentColor, justifyContent: 'center', alignItems: 'center', padding: 10 }}>{renderCircle()}{data.company ? <Text style={{ color: bgColor + 'cc', fontSize: 7, fontWeight: '700', marginTop: 4, textAlign: 'center' }}>{data.company.toUpperCase()}</Text> : null}</View><View style={{ flex: 1, padding: 14, justifyContent: 'center' }}><Text style={{ fontSize: 15, fontWeight: '900', color: textColor }}>{data.name || 'Your Name'}</Text><Text style={{ fontSize: 9, fontWeight: '600', color: accentColor, marginTop: 2 }}>{data.title || 'Title'}</Text><View style={{ height: 1, backgroundColor: accentColor + '25', marginVertical: 6 }} />{renderInfo()}</View></View>);
  if (layout === 'centered') return (<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 14 }}>{renderCircle()}<Text style={{ fontSize: 18, fontWeight: '900', color: textColor, marginTop: 8 }}>{data.name || 'Your Name'}</Text><Text style={{ fontSize: 10, fontWeight: '700', color: accentColor, marginTop: 2 }}>{data.title || 'Title'}</Text>{data.company ? <Text style={{ fontSize: 8, color: subtextColor, marginTop: 1 }}>{data.company}</Text> : null}<View style={{ marginTop: 8 }}>{renderInfo()}</View></View>);
  if (layout === 'corner-circle') return (<><View style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: 35, backgroundColor: accentColor + '15' }} /><View style={{ flex: 1, padding: 16, justifyContent: 'center', zIndex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{renderCircle()}<View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '900', color: textColor }}>{data.name || 'Your Name'}</Text><Text style={{ fontSize: 10, fontWeight: '700', color: accentColor, marginTop: 1 }}>{data.title || 'Title'}</Text></View></View><View style={{ height: 1, backgroundColor: accentColor + '20', marginVertical: 6 }} />{renderInfo()}</View></>);
  if (layout === 'diagonal') return (<><View style={{ position: 'absolute', top: 0, right: 0, width: '42%', height: '100%', backgroundColor: accentColor + '12', borderTopLeftRadius: 80, borderBottomLeftRadius: 120 }} /><View style={{ flex: 1, padding: 16, justifyContent: 'center', zIndex: 1 }}><Text style={{ fontSize: 18, fontWeight: '900', color: textColor }}>{data.name || 'Your Name'}</Text><Text style={{ fontSize: 11, fontWeight: '700', color: accentColor, marginTop: 2 }}>{data.title || 'Title'}</Text>{data.company ? <Text style={{ fontSize: 9, color: subtextColor, marginTop: 1 }}>{data.company}</Text> : null}<View style={{ marginTop: 8 }}>{renderInfo()}</View></View>{showLogo && <View style={{ position: 'absolute', top: 12, right: 14, zIndex: 2 }}>{renderCircle()}</View>}</>);
  // left-accent
  return (<><View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: accentColor }} /><View style={{ flex: 1, paddingLeft: 20, paddingRight: 14, justifyContent: 'center' }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}><View style={{ flex: 1 }}><Text style={{ fontSize: 18, fontWeight: '900', color: textColor }}>{data.name || 'Your Name'}</Text><Text style={{ fontSize: 11, fontWeight: '700', color: accentColor, marginTop: 2 }}>{data.title || 'Title'}</Text>{data.company ? <Text style={{ fontSize: 9, color: subtextColor, marginTop: 1 }}>{data.company}</Text> : null}</View>{renderCircle()}</View><View style={{ height: 1, backgroundColor: accentColor + '30', marginVertical: 6 }} />{renderInfo()}</View></>);
};

// ══════════════════════════════════════════
// ─── DESIGN CONTROLS ───
// ══════════════════════════════════════════
export const CustomDesignControls = ({
  design, onUpdateDesign, COLORS, isDarkMode, accent, cardData, scrollRef,
}: {
  design: CustomDesign;
  onUpdateDesign: (field: keyof CustomDesign, value: any) => void;
  COLORS: any; isDarkMode: boolean; accent: string;
  cardData: CardData;
  scrollRef?: React.RefObject<ScrollView | null>;
}) => {
  const elements: CardElement[] = design.elements || [];
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [colorTarget, setColorTarget] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEditText, setShowEditText] = useState(false);
  const [activeSection, setActiveSection] = useState<'design' | 'text'>('design');

  const selectedEl = elements.find(e => e.id === selectedElId) || null;

  const updateElements = (els: CardElement[]) => onUpdateDesign('elements', els);

  const addText = (content: string, preset?: Partial<CardElement>) => {
    const el: CardElement = {
      id: Date.now().toString(), content,
      x: 5 + Math.random() * 15, y: 5 + (elements.length % 5) * 16,
      fontSize: 14, fontWeight: '700', color: '#ffffff',
      textAlign: 'left', letterSpacing: 0, textTransform: 'none',
      ...preset,
    };
    updateElements([...elements, el]);
    setSelectedElId(el.id);
    setActiveSection('text');
  };

  const updateEl = (updates: Partial<CardElement>) => {
    if (!selectedElId) return;
    updateElements(elements.map(e => e.id === selectedElId ? { ...e, ...updates } : e));
  };

  const deleteEl = () => {
    if (!selectedElId) return;
    updateElements(elements.filter(e => e.id !== selectedElId));
    setSelectedElId(null);
  };

  const moveEl = (id: string, newX: number, newY: number) => {
    updateElements(elements.map(e => e.id === id ? { ...e, x: newX, y: newY } : e));
  };

  const applyPalette = (p: typeof COLOR_PALETTES[0]) => {
    onUpdateDesign('bgColor', p.bg);
    onUpdateDesign('accentColor', p.accent);
    onUpdateDesign('textColor', p.text);
    onUpdateDesign('subtextColor', p.subtext);
  };

  const openColorPicker = (target: string) => { setColorTarget(target); setShowColorPicker(true); };

  const handleColorSelect = (c: string) => {
    if (colorTarget === 'elColor') updateEl({ color: c });
    else if (colorTarget) onUpdateDesign(colorTarget as any, c);
  };

  const chip = (active: boolean) => [st.chip, {
    backgroundColor: active ? accent : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
    borderColor: active ? accent : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0'),
  }];

  return (
    <View style={{ paddingHorizontal: 24 }}>

      {/* ─── Live Editable Card Canvas ─── */}
      <View style={{ marginTop: 16, borderRadius: 20, borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0', padding: 6, backgroundColor: 'rgba(0,0,0,0.15)' }}>
        <View style={{
          width: CANVAS_W, height: CARD_H,
          borderRadius: design.borderRadius ?? 16,
          borderWidth: design.borderWidth ?? 1,
          borderColor: design.borderColor || design.accentColor || '#333',
          backgroundColor: design.bgColor || '#0f172a',
          overflow: 'hidden', position: 'relative',
        }}>
          {/* Base layout rendered underneath */}
          <BaseLayoutRender data={cardData} design={design} />
          {/* Draggable text overlays */}
          {elements.map(el => (
            <DraggableText
              key={el.id}
              el={el}
              isSelected={selectedElId === el.id}
              onSelect={() => { setSelectedElId(el.id); setActiveSection('text'); }}
              onMoveEnd={(newX, newY) => moveEl(el.id, newX, newY)}
              scrollRef={scrollRef}
            />
          ))}
          {elements.length === 0 && (
            <View style={{ position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center', opacity: 0.3 }}>
              <Text style={{ color: '#fff', fontSize: 9 }}>Add custom text from below</Text>
            </View>
          )}
        </View>
      </View>

      {/* ─── Section Tabs ─── */}
      <View style={[st.tabs, { borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
        <TouchableOpacity style={[st.tab, activeSection === 'design' && { borderBottomColor: accent, borderBottomWidth: 2 }]} onPress={() => setActiveSection('design')}>
          <Ionicons name="color-palette-outline" size={16} color={activeSection === 'design' ? accent : COLORS.textMuted} />
          <Text style={{ color: activeSection === 'design' ? accent : COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>Design</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.tab, activeSection === 'text' && { borderBottomColor: accent, borderBottomWidth: 2 }]} onPress={() => setActiveSection('text')}>
          <Ionicons name="text-outline" size={16} color={activeSection === 'text' ? accent : COLORS.textMuted} />
          <Text style={{ color: activeSection === 'text' ? accent : COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>Custom Text</Text>
        </TouchableOpacity>
      </View>

      {activeSection === 'design' ? (
        <>
          {/* ═══ COLOR PALETTE ═══ */}
          <Text style={[st.label, { color: COLORS.textMuted, marginTop: 16 }]}>COLOR PALETTE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {COLOR_PALETTES.map((p, i) => (
              <TouchableOpacity key={i} onPress={() => applyPalette(p)}
                style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: p.bg, borderWidth: 2, borderColor: design.bgColor === p.bg && design.accentColor === p.accent ? '#22d3ee' : 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 18, backgroundColor: p.accent }} />
                <Text style={{ color: p.text, fontSize: 7, fontWeight: '800', zIndex: 1, letterSpacing: 0.5 }}>{p.name.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ═══ INDIVIDUAL COLORS ═══ */}
          <Text style={[st.label, { color: COLORS.textMuted, marginTop: 20 }]}>COLORS</Text>
          <View style={{ gap: 8 }}>
            {[
              { key: 'bgColor', label: 'Background' },
              { key: 'accentColor', label: 'Accent' },
              { key: 'textColor', label: 'Text' },
              { key: 'subtextColor', label: 'Subtext' },
            ].map(c => (
              <TouchableOpacity key={c.key} style={[st.colorRow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f9fafb' }]} onPress={() => openColorPicker(c.key)}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: (design as any)[c.key], borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }} />
                <Text style={{ flex: 1, marginLeft: 10, color: COLORS.text, fontSize: 14, fontWeight: '700' }}>{c.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* ═══ LAYOUT ═══ */}
          <Text style={[st.label, { color: COLORS.textMuted, marginTop: 20 }]}>CARD LAYOUT</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LAYOUTS.map(l => (
              <TouchableOpacity key={l.id} style={chip(design.layout === l.id)} onPress={() => onUpdateDesign('layout', l.id)}>
                <Ionicons name={l.icon as any} size={15} color={design.layout === l.id ? '#fff' : COLORS.textMuted} />
                <Text style={{ color: design.layout === l.id ? '#fff' : COLORS.text, fontSize: 12, fontWeight: '600' }}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ═══ INITIALS BADGE ═══ */}
          <Text style={[st.label, { color: COLORS.textMuted, marginTop: 20 }]}>INITIALS BADGE</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CIRCLE_STYLES.map(c => (
              <TouchableOpacity key={c.id} style={[...chip(design.circleStyle === c.id), { flex: 1 }]}
                onPress={() => { onUpdateDesign('circleStyle', c.id); onUpdateDesign('showLogo', c.id !== 'none'); }}>
                <Ionicons name={c.icon as any} size={16} color={design.circleStyle === c.id ? '#fff' : COLORS.textMuted} />
                <Text style={{ color: design.circleStyle === c.id ? '#fff' : COLORS.text, fontSize: 11, fontWeight: '600' }}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ═══ BORDER ═══ */}
          <Text style={[st.label, { color: COLORS.textMuted, marginTop: 20 }]}>BORDER</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
            {[0, 1, 2, 3].map(w => (
              <TouchableOpacity key={w} style={chip((design.borderWidth ?? 1) === w)} onPress={() => onUpdateDesign('borderWidth', w)}>
                <Text style={{ color: (design.borderWidth ?? 1) === w ? '#fff' : COLORS.text, fontSize: 13, fontWeight: '700' }}>{w}px</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[st.label, { color: COLORS.textMuted, marginTop: 12 }]}>CORNER RADIUS</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[0, 8, 16, 24, 32].map(r => (
              <TouchableOpacity key={r} style={chip((design.borderRadius ?? 16) === r)} onPress={() => onUpdateDesign('borderRadius', r)}>
                <Text style={{ color: (design.borderRadius ?? 16) === r ? '#fff' : COLORS.text, fontSize: 13, fontWeight: '700' }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <>
          {/* ═══ CUSTOM TEXT SECTION ═══ */}

          {/* Quick Add */}
          <Text style={[st.label, { color: COLORS.textMuted, marginTop: 16 }]}>ADD TEXT ELEMENT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[
              { label: 'Heading', icon: 'text-outline', preset: { fontSize: 22, fontWeight: '900' as const } },
              { label: 'Subtitle', icon: 'reader-outline', preset: { fontSize: 12, fontWeight: '600' as const, color: '#22d3ee' } },
              { label: 'Body', icon: 'document-text-outline', preset: { fontSize: 10, fontWeight: '400' as const, color: '#94a3b8' } },
              { label: 'Label', icon: 'pricetag-outline', preset: { fontSize: 9, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 3, color: '#64748b' } },
              { label: 'Symbol', icon: 'sparkles-outline', preset: { fontSize: 20, content: '★' } },
              { label: 'Line', icon: 'remove-outline', preset: { fontSize: 8, color: '#ffffff33', content: '━━━━━━━━━━━━' } },
            ].map(item => (
              <TouchableOpacity key={item.label} style={[st.addChip, { borderColor: accent }]}
                onPress={() => addText(item.preset?.content || item.label, item.preset as any)}>
                <Ionicons name={item.icon as any} size={14} color={accent} />
                <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Elements List */}
          {elements.length > 0 && (
            <>
              <Text style={[st.label, { color: COLORS.textMuted, marginTop: 20 }]}>TEXT ELEMENTS (drag on card to move)</Text>
              {elements.map(el => (
                <TouchableOpacity key={el.id}
                  style={[st.colorRow, { backgroundColor: selectedElId === el.id ? accent + '15' : (isDarkMode ? 'rgba(255,255,255,0.04)' : '#f9fafb'), borderWidth: 1, borderColor: selectedElId === el.id ? accent : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#e5e7eb'), marginBottom: 6 }]}
                  onPress={() => { setSelectedElId(el.id); }}>
                  <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: el.color, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                  <Text style={{ flex: 1, marginLeft: 10, color: COLORS.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>"{el.content}"</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{el.fontSize}px</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Selected Element Controls */}
          {selectedEl && (
            <>
              <Text style={[st.label, { color: COLORS.textMuted, marginTop: 16 }]}>EDIT: "{selectedEl.content.substring(0, 20)}"</Text>

              {/* Edit content */}
              <TouchableOpacity style={[st.colorRow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f9fafb', marginBottom: 10 }]} onPress={() => setShowEditText(true)}>
                <Ionicons name="create-outline" size={18} color={accent} />
                <Text style={{ flex: 1, marginLeft: 10, color: COLORS.text, fontSize: 14, fontWeight: '700' }}>Edit Text</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Text Color */}
              <TouchableOpacity style={[st.colorRow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#f9fafb', marginBottom: 10 }]} onPress={() => openColorPicker('elColor')}>
                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: selectedEl.color, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                <Text style={{ flex: 1, marginLeft: 10, color: COLORS.text, fontSize: 14, fontWeight: '700' }}>Color</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Font Size */}
              <Text style={[st.miniLabel, { color: COLORS.textMuted }]}>SIZE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
                {FONT_SIZES.map(sz => (
                  <TouchableOpacity key={sz} style={chip(selectedEl.fontSize === sz)} onPress={() => updateEl({ fontSize: sz })}>
                    <Text style={{ color: selectedEl.fontSize === sz ? '#fff' : COLORS.text, fontSize: 12, fontWeight: '700' }}>{sz}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Font Weight */}
              <Text style={[st.miniLabel, { color: COLORS.textMuted }]}>WEIGHT</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {FONT_WEIGHTS.map(fw => (
                  <TouchableOpacity key={fw.id} style={chip(selectedEl.fontWeight === fw.id)} onPress={() => updateEl({ fontWeight: fw.id })}>
                    <Text style={{ color: selectedEl.fontWeight === fw.id ? '#fff' : COLORS.text, fontSize: 12, fontWeight: fw.id as any }}>{fw.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Font Style */}
              <Text style={[st.miniLabel, { color: COLORS.textMuted }]}>FONT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
                {FONTS.map(f => (
                  <TouchableOpacity key={f.id} style={chip(selectedEl.fontId === f.id || (!selectedEl.fontId && f.id === 'default'))} onPress={() => updateEl({ fontId: f.id } as any)}>
                    <Text style={[{ color: (selectedEl.fontId === f.id || (!selectedEl.fontId && f.id === 'default')) ? '#fff' : COLORS.text, fontSize: 13, fontWeight: '600' }, f.style]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Alignment + Transform */}
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {(['left', 'center', 'right'] as const).map(a => (
                  <TouchableOpacity key={a} style={[...chip(selectedEl.textAlign === a), { flex: 1 }]} onPress={() => updateEl({ textAlign: a })}>
                    <Text style={{ color: selectedEl.textAlign === a ? '#fff' : COLORS.text, fontSize: 11, fontWeight: '600' }}>{a.charAt(0).toUpperCase() + a.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[...chip(selectedEl.textTransform === 'uppercase'), { flex: 1 }]}
                  onPress={() => updateEl({ textTransform: selectedEl.textTransform === 'uppercase' ? 'none' : 'uppercase' })}>
                  <Text style={{ color: selectedEl.textTransform === 'uppercase' ? '#fff' : COLORS.text, fontSize: 11, fontWeight: '700' }}>AA</Text>
                </TouchableOpacity>
              </View>

              {/* Letter Spacing */}
              <Text style={[st.miniLabel, { color: COLORS.textMuted }]}>SPACING</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
                {[0, 0.5, 1, 2, 3, 4, 6].map(sp => (
                  <TouchableOpacity key={sp} style={chip(selectedEl.letterSpacing === sp)} onPress={() => updateEl({ letterSpacing: sp })}>
                    <Text style={{ color: selectedEl.letterSpacing === sp ? '#fff' : COLORS.text, fontSize: 12, fontWeight: '700' }}>{sp}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>


              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)' }} onPress={deleteEl}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {elements.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 24, opacity: 0.5 }}>
              <Ionicons name="add-circle-outline" size={28} color={COLORS.textMuted} />
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600', marginTop: 6 }}>Add text elements above</Text>
            </View>
          )}
        </>
      )}

      {/* Modals */}
      <ColorPickerModal visible={showColorPicker} onClose={() => setShowColorPicker(false)}
        currentColor={colorTarget === 'elColor' ? (selectedEl?.color || '#fff') : ((design as any)[colorTarget || 'bgColor'] || '#000')}
        title={colorTarget === 'bgColor' ? 'Background' : colorTarget === 'accentColor' ? 'Accent' : colorTarget === 'textColor' ? 'Text Color' : colorTarget === 'subtextColor' ? 'Subtext' : colorTarget === 'elColor' ? 'Text Color' : 'Color'}
        onSelect={handleColorSelect} />
      <EditTextModal visible={showEditText} onClose={() => setShowEditText(false)}
        value={selectedEl?.content || ''} onChange={(v) => updateEl({ content: v })} />
    </View>
  );
};

const st = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  miniLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, color: '#64748b' },
  chip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1, minWidth: 40,
  },
  colorRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
  },
  addChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed',
  },
  tabs: {
    flexDirection: 'row', marginTop: 16, borderBottomWidth: 1, marginBottom: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
});
