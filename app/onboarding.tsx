import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, FlatList, Animated, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/DarkModeContext';
import { LedgerScene, SplitScene, CardScene, SecurityScene } from '@/components/OnboardingIllustrations';

const { width: SW } = Dimensions.get('window');
const ONBOARDING_KEY = '@khaata_onboarding_done';
const ACCENT = '#0a7ea4';

const SLIDES = [
  { id: '1', title: 'Your Money,\nYour Khaata', subtitle: 'Track every rupee you lend or borrow. Always know where your money stands.', Illustration: LedgerScene },
  { id: '2', title: 'Split & Settle\nWith Friends', subtitle: 'Group expenses, mess bills, shared costs — divide fairly, settle easily.', Illustration: SplitScene },
  { id: '3', title: 'Professional\nVisiting Cards', subtitle: 'Design stunning cards with 30+ templates. Customize everything, share anywhere.', Illustration: CardScene },
  { id: '4', title: 'Secure &\nPrivate', subtitle: 'Biometric lock, multi-language, multi-currency. Your data stays yours.', Illustration: SecurityScene },
];

export default function OnboardingScreen() {
  const { isDarkMode } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const bg = isDarkMode ? '#0a0e1a' : '#ffffff';
  const textColor = isDarkMode ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDarkMode ? '#64748b' : '#94a3b8';

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/login');
  };

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      finishOnboarding();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index);
  }).current;

  const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => {
    const inputRange = [(index - 1) * SW, index * SW, (index + 1) * SW];
    const imgScale = scrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
    const imgOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
    const textY = scrollX.interpolate({ inputRange, outputRange: [40, 0, -40], extrapolate: 'clamp' });
    const textOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
    const Illustration = item.Illustration;

    return (
      <View style={[st.slide, { width: SW }]}>
        <Animated.View style={{ opacity: imgOpacity, transform: [{ scale: imgScale }], marginBottom: 32 }}>
          <Illustration dark={isDarkMode} />
        </Animated.View>
        <Animated.View style={[st.textWrap, { transform: [{ translateY: textY }], opacity: textOpacity }]}>
          <Text style={[st.slideTitle, { color: textColor }]}>{item.title}</Text>
          <Text style={[st.slideSubtitle, { color: mutedColor }]}>{item.subtitle}</Text>
        </Animated.View>
      </View>
    );
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[st.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {!isLast && (
        <TouchableOpacity style={st.skipBtn} onPress={finishOnboarding}>
          <Text style={[st.skipText, { color: mutedColor }]}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        bounces={false}
      />

      <View style={[st.bottom, { backgroundColor: bg }]}>
        <View style={st.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * SW, i * SW, (i + 1) * SW];
            const w = scrollX.interpolate({ inputRange, outputRange: [8, 28, 8], extrapolate: 'clamp' });
            const o = scrollX.interpolate({ inputRange, outputRange: [0.2, 1, 0.2], extrapolate: 'clamp' });
            return <Animated.View key={i} style={[st.dot, { width: w, opacity: o, backgroundColor: ACCENT }]} />;
          })}
        </View>

        <TouchableOpacity style={st.nextBtn} onPress={goNext} activeOpacity={0.9}>
          <View style={st.nextBtnBg}>
            <Text style={st.nextBtnText}>{isLast ? 'Get Started' : 'Next'}</Text>
            <View style={st.nextBtnArrow}>
              <Ionicons name={isLast ? 'rocket' : 'arrow-forward'} size={16} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 58 : 40, right: 24, zIndex: 10,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  skipText: { fontSize: 15, fontWeight: '600' },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textWrap: { paddingHorizontal: 40 },
  slideTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1, lineHeight: 38, textAlign: 'center', marginBottom: 14 },
  slideSubtitle: { fontSize: 15, fontWeight: '500', lineHeight: 22, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 48 : 28, alignItems: 'center' },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: { width: '100%' },
  nextBtnBg: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: ACCENT, paddingVertical: 18, borderRadius: 16, gap: 10,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  nextBtnArrow: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
});
