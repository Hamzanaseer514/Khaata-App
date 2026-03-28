import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  StatusBar, Platform, Animated, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/DarkModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { goBack } from '@/utils/navigation';
import { showSuccess, showError } from '@/utils/toast';
import { tapHaptic, successHaptic, selectionHaptic } from '@/utils/haptics';
import config from '@/config/config';

const EMOJIS = ['😞', '😕', '😐', '😊', '🤩'];
const LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Excellent'];

const TAGS = [
  { label: 'Easy to use', icon: 'thumbs-up-outline' },
  { label: 'Beautiful design', icon: 'color-palette-outline' },
  { label: 'Fast & smooth', icon: 'flash-outline' },
  { label: 'Great features', icon: 'star-outline' },
  { label: 'Visiting cards', icon: 'card-outline' },
  { label: 'Group splits', icon: 'people-outline' },
  { label: 'Mess tracking', icon: 'restaurant-outline' },
  { label: 'Needs work', icon: 'construct-outline' },
  { label: 'Has bugs', icon: 'bug-outline' },
  { label: 'Slow', icon: 'hourglass-outline' },
];

export default function FeedbackScreen() {
  const { isDarkMode } = useTheme();
  const { user, token } = useAuth();
  const COLORS = isDarkMode ? config.DARK_COLORS : config.LIGHT_COLORS;
  const accent = isDarkMode ? '#22d3ee' : '#0a7ea4';
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const border = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const toggleTag = (tag: string) => {
    selectionHaptic();
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (rating === 0) { showError('Please rate us first'); return; }
    setIsSubmitting(true);
    try {
      await fetch(`${config.BASE_URL}/auth/feedback`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, tags: selectedTags, feedback: feedback.trim(), userName: user?.name, userEmail: user?.email }),
      });
    } catch {}
    setIsSubmitting(false);
    successHaptic();
    setSubmitted(true);
    Animated.spring(successScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();
  };

  // ─── Success Screen ───
  if (submitted) {
    return (
      <View style={[st.container, { backgroundColor: COLORS.background }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Animated.View style={[st.successWrap, { transform: [{ scale: successScale }] }]}>
          <View style={[st.successEmojiRing, { borderColor: accent + '20' }]}>
            <Text style={{ fontSize: 56 }}>{EMOJIS[rating - 1]}</Text>
          </View>
          <Text style={[st.successTitle, { color: COLORS.text }]}>Thank You!</Text>
          <Text style={[st.successSub, { color: COLORS.textMuted }]}>
            Your feedback means everything to us.{'\n'}We'll keep making KhaataWise better.
          </Text>

          <View style={[st.recapCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={st.recapRow}>
              <Text style={[st.recapLabel, { color: COLORS.textMuted }]}>Your rating</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[1,2,3,4,5].map(i => (
                  <Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={18} color={i <= rating ? '#fbbf24' : '#334155'} />
                ))}
              </View>
            </View>
            {selectedTags.length > 0 && (
              <View style={[st.recapRow, { borderTopWidth: 1, borderTopColor: border, paddingTop: 12, marginTop: 12 }]}>
                <Text style={[st.recapLabel, { color: COLORS.textMuted }]}>You mentioned</Text>
                <Text style={[st.recapValue, { color: COLORS.text }]}>{selectedTags.slice(0, 3).join(', ')}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={[st.doneBtn, { backgroundColor: accent }]} onPress={() => goBack()}>
            <Text style={st.doneBtnText}>Back to App</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ─── Main Screen ───
  return (
    <View style={[st.container, { backgroundColor: COLORS.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[st.header, { borderColor: border }]}>
        <TouchableOpacity onPress={() => goBack()} style={st.backBtn}>
          <View style={[st.backBtnInner, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </View>
        </TouchableOpacity>
        <Text style={[st.headerTitle, { color: COLORS.text }]}>Feedback</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* Rating Card */}
            <View style={[st.ratingCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[st.ratingQuestion, { color: COLORS.text }]}>How would you rate{'\n'}KhaataWise?</Text>

              {/* Star buttons */}
              <View style={st.starsRow}>
                {[1, 2, 3, 4, 5].map(i => (
                  <TouchableOpacity key={i} onPress={() => { selectionHaptic(); setRating(i); }} activeOpacity={0.7} style={st.starBtn}>
                    <Ionicons
                      name={i <= rating ? 'star' : 'star-outline'}
                      size={38}
                      color={i <= rating ? '#fbbf24' : (isDarkMode ? '#1e293b' : '#e2e8f0')}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Emoji + Label */}
              {rating > 0 && (
                <View style={[st.emojiRow, { backgroundColor: accent + '10' }]}>
                  <Text style={{ fontSize: 32 }}>{EMOJIS[rating - 1]}</Text>
                  <Text style={[st.emojiLabel, { color: accent }]}>{LABELS[rating - 1]}</Text>
                </View>
              )}
            </View>

            {/* Tags */}
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: COLORS.textMuted }]}>WHAT STANDS OUT?</Text>
              <View style={st.tagsGrid}>
                {TAGS.map(tag => {
                  const sel = selectedTags.includes(tag.label);
                  return (
                    <TouchableOpacity
                      key={tag.label}
                      style={[st.tagChip, {
                        backgroundColor: sel ? accent : (isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                        borderColor: sel ? accent : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#e2e8f0'),
                      }]}
                      onPress={() => toggleTag(tag.label)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={tag.icon as any} size={14} color={sel ? '#fff' : COLORS.textMuted} />
                      <Text style={{ color: sel ? '#fff' : COLORS.text, fontSize: 12, fontWeight: '600' }}>{tag.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Text feedback */}
            <View style={st.section}>
              <Text style={[st.sectionLabel, { color: COLORS.textMuted }]}>ANYTHING ELSE?</Text>
              <View style={[st.textAreaWrap, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }]}>
                <TextInput
                  style={[st.textArea, { color: COLORS.text }]}
                  placeholder="Suggestions, bugs, ideas — we're all ears..."
                  placeholderTextColor={isDarkMode ? '#334155' : '#94a3b8'}
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  textAlignVertical="top"
                />
                <Text style={[st.charCount, { color: COLORS.textMuted }]}>{feedback.length}/500</Text>
              </View>
            </View>

            {/* Submit */}
            <View style={{ paddingHorizontal: 20 }}>
              <TouchableOpacity
                style={[st.submitBtn, { backgroundColor: accent, opacity: isSubmitting || rating === 0 ? 0.5 : 1 }]}
                onPress={handleSubmit}
                disabled={isSubmitting || rating === 0}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                    <Text style={st.submitBtnText}>Submit Feedback</Text>
                  </>
                )}
              </TouchableOpacity>

              {rating === 0 && (
                <Text style={[st.hint, { color: COLORS.textMuted }]}>Please rate us to submit</Text>
              )}
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backBtnInner: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },

  // Rating card
  ratingCard: {
    margin: 20, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center',
  },
  ratingQuestion: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, lineHeight: 30, marginBottom: 24 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  starBtn: { padding: 4 },
  emojiRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16,
  },
  emojiLabel: { fontSize: 17, fontWeight: '800' },

  // Tags
  section: { paddingHorizontal: 20, marginTop: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },

  // Text area
  textAreaWrap: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  textArea: { padding: 16, fontSize: 15, fontWeight: '500', minHeight: 110 },
  charCount: { textAlign: 'right', paddingRight: 16, paddingBottom: 10, fontSize: 11, fontWeight: '600' },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18, borderRadius: 16, marginTop: 24,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  hint: { textAlign: 'center', fontSize: 12, fontWeight: '500', marginTop: 10 },

  // Success
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successEmojiRing: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  successTitle: { fontSize: 34, fontWeight: '900', letterSpacing: -0.5, marginBottom: 10 },
  successSub: { fontSize: 15, fontWeight: '500', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  recapCard: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 28 },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recapLabel: { fontSize: 13, fontWeight: '600' },
  recapValue: { fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  doneBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
