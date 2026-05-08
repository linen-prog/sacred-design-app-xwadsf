import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/contexts/AuthContext';
import { DiscoveryContext } from '@/contexts/DiscoveryContext';
import { ARCHETYPE_CONTENT, ArchetypeName } from '@/constants/ArchetypeContent';
import { authenticatedDelete } from '@/utils/api';
import { updateAppState as updateStateUtil } from '@/utils/appState';

export default function ProfileScreen() {
  const router = useRouter();
  const { appState, updateAppState, retakeQuiz } = useAppState();
  const { user, signOut } = useAuth();
  const { sacredDesignResult, clearSacredDesign } = useContext(DiscoveryContext);

  const primaryArchetype = sacredDesignResult?.primary_archetype ?? appState.primaryArchetype ?? null;
  const secondaryArchetype = sacredDesignResult?.secondary_archetype ?? appState.secondaryArchetype ?? null;
  const archetypeData = primaryArchetype ? ARCHETYPE_CONTENT[primaryArchetype as ArchetypeName] : null;

  const narrativeSentences = archetypeData ? archetypeData.narrative.split('. ') : [];
  const identityStatement = archetypeData
    ? narrativeSentences[0] + '.'
    : null;

  const userName = (user as any)?.name ?? null;
  const userEmail = (user as any)?.email ?? null;

  const rhythmText = appState.dailyAlignmentReady
    ? "You've been here recently."
    : "You showed up this week.";

  const [confirmModal, setConfirmModal] = useState<'startFresh' | 'takeBreak' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleStartFresh() {
    console.log('[Profile] Start Fresh confirmed — clearing design and restarting');
    setConfirmModal(null);
    clearSacredDesign();
    await retakeQuiz();
    await updateAppState({
      revealViewed: false,
      revealUnlocked: false,
      quizCompleted: false,
      postQuizSaveCompleted: false,
      guestMode: false,
      currentOnboardingStep: '/onboarding/welcome',
    });
    router.replace('/onboarding/welcome' as any);
  }

  async function handleTakeBreak() {
    console.log('[Profile] Take a Break confirmed — signing out, preserving design state');
    setConfirmModal(null);
    await signOut();
    await updateAppState({ guestMode: false });
    router.replace('/auth-screen' as any);
  }

  function handleDeleteAccountPress() {
    console.log('[Profile] Delete Account pressed — showing first confirmation');
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your saved data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: handleDeleteAccountConfirm,
        },
      ]
    );
  }

  async function handleDeleteAccountConfirm() {
    console.log('[Profile] Delete Account confirmed — calling DELETE /api/account');
    setIsDeleting(true);
    try {
      console.log('[Profile] Calling authenticatedDelete /api/account');
      await authenticatedDelete('/api/account');
      console.log('[Profile] DELETE /api/account succeeded — clearing state and signing out');
      try {
        await updateStateUtil({
          revealViewed: false,
          revealUnlocked: false,
          quizCompleted: false,
          postQuizSaveCompleted: false,
          guestMode: false,
          currentOnboardingStep: '/onboarding/welcome',
        });
      } catch (e) {
        console.warn('[Profile] Failed to reset appState on account deletion:', e);
      }
      await signOut();
      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
      router.replace('/onboarding/welcome' as any);
    } catch (e: any) {
      console.error('[Profile] DELETE /api/account failed:', e?.message, e?.status, JSON.stringify(e));
      setIsDeleting(false);
      const msg = (e?.message ?? '').toLowerCase();
      if (msg.includes('token') || msg.includes('sign in') || msg.includes('authentication')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please sign out and sign back in, then try deleting your account again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
    }
  }

  type ModalType = 'startFresh' | 'takeBreak';

  const modalConfig: Record<ModalType, { title: string; body: string; confirmLabel: string; onConfirm: () => void }> = {
    startFresh: {
      title: 'Start fresh?',
      body: "This will clear your Sacred Design results. You'll go through the discovery again.",
      confirmLabel: 'Yes, start fresh',
      onConfirm: handleStartFresh,
    },
    takeBreak: {
      title: 'Take a break?',
      body: "You'll be signed out. Your Sacred Design will be waiting when you return.",
      confirmLabel: 'Take a break',
      onConfirm: handleTakeBreak,
    },
  };

  const activeModal = confirmModal ? modalConfig[confirmModal] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#0A0E1A', '#1A1030', '#0D1A14']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Identity Header */}
        <View style={styles.identityHeader}>
          {primaryArchetype === null ? (
            <>
              <ActivityIndicator color="#C9A84C" />
              <Text style={styles.loadingText}>Loading your design…</Text>
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>YOUR SACRED DESIGN</Text>
              <Text style={styles.primaryArchetypeName}>{primaryArchetype}</Text>
              {secondaryArchetype ? (
                <Text style={styles.secondaryArchetypeName}>{secondaryArchetype}</Text>
              ) : null}
              {identityStatement ? (
                <Text style={styles.identityStatement}>{identityStatement}</Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.goldDivider} />

        {/* SECTION 2: Your Rhythm */}
        <Text style={styles.sectionLabel}>YOUR RHYTHM</Text>
        <View style={styles.card}>
          <Text style={styles.cardBodyText}>{rhythmText}</Text>
        </View>

        {/* SECTION 3: Today's Alignment */}
        <Text style={styles.sectionLabel}>TODAY'S ALIGNMENT</Text>
        <TouchableOpacity
          style={styles.alignmentCard}
          onPress={() => {
            console.log('[Profile] Today\'s Alignment card pressed');
            router.push('/(tabs)/(home)' as any);
          }}
          activeOpacity={0.75}
        >
          <View style={styles.alignmentCardLeft}>
            <Text style={styles.alignmentCardTitle}>Open today's practice</Text>
            <Text style={styles.alignmentCardSubtitle}>Your daily alignment is ready</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="rgba(201,168,76,0.7)" />
        </TouchableOpacity>

        {/* SECTION 4: Settings */}
        <Text style={styles.sectionLabel}>SETTINGS</Text>
        <View style={[styles.card, styles.settingsCard]}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => {
              console.log('[Profile] Notification time tapped — opening app settings');
              Linking.openURL('app-settings:');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsRowLabel}>Notification time</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.settingsRowValue}>Morning</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(201,168,76,0.4)" />
            </View>
          </TouchableOpacity>
          <View style={styles.inCardDivider} />
          <TouchableOpacity
            style={styles.settingsFeedbackRow}
            onPress={() => {
              console.log('[Profile] Send feedback pressed');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsRowLabel}>Send feedback</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 5: Account Actions */}
        <View style={styles.accountSection}>
          <Text style={styles.accountSectionLabel}>ACCOUNT</Text>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => {
              console.log('[Profile] Start fresh tapped');
              setConfirmModal('startFresh');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.accountRowTextMuted}>Start fresh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.accountRow}
            onPress={() => {
              console.log('[Profile] Take a break tapped');
              setConfirmModal('takeBreak');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.accountRowTextMuted}>Take a break</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accountRow, styles.accountRowLast]}
            onPress={handleDeleteAccountPress}
            activeOpacity={0.7}
            disabled={isDeleting}
          >
            <Text style={[styles.accountRowTextClose, isDeleting && { opacity: 0.4 }]}>
              {isDeleting ? 'Deleting…' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CONFIRMATION MODAL */}
      <Modal
        visible={confirmModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setConfirmModal(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {activeModal ? (
              <>
                <Text style={styles.modalTitle}>{activeModal.title}</Text>
                <Text style={styles.modalBody}>{activeModal.body}</Text>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={() => {
                    console.log('[Profile] Modal confirm pressed:', confirmModal);
                    activeModal.onConfirm();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalConfirmText}>{activeModal.confirmLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    console.log('[Profile] Modal cancel pressed');
                    setConfirmModal(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingBottom: 60,
  },

  // Identity Header
  identityHeader: {
    marginTop: 48,
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(245,240,232,0.5)',
    marginTop: 12,
  },
  eyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 2.5,
    color: '#C9A84C',
    marginBottom: 16,
  },
  primaryArchetypeName: {
    fontFamily: 'Lora_700Bold',
    fontSize: 36,
    color: '#F5F0E8',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  secondaryArchetypeName: {
    fontFamily: 'Lora_400Regular_Italic',
    fontSize: 18,
    color: 'rgba(245,240,232,0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  identityStatement: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(245,240,232,0.75)',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 300,
  },

  // Divider
  goldDivider: {
    width: '40%',
    height: 1,
    backgroundColor: 'rgba(201,168,76,0.2)',
    marginVertical: 32,
    alignSelf: 'center',
  },

  // Section label
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.8,
    color: '#C9A84C',
    marginBottom: 12,
  },

  // Card
  card: {
    backgroundColor: 'rgba(245,240,232,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.15)',
    padding: 18,
    marginBottom: 28,
  },
  cardBodyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(245,240,232,0.75)',
    lineHeight: 24,
  },

  // Alignment card
  alignmentCard: {
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
    padding: 20,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alignmentCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  alignmentCardTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#F5F0E8',
  },
  alignmentCardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(245,240,232,0.55)',
    marginTop: 3,
  },

  // Settings card
  settingsCard: {
    padding: 0,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  settingsRowLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(245,240,232,0.75)',
  },
  settingsRowValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(201,168,76,0.6)',
  },
  inCardDivider: {
    height: 1,
    backgroundColor: 'rgba(245,240,232,0.07)',
  },
  settingsFeedbackRow: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },

  // Account section
  accountSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  accountSectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.8,
    color: 'rgba(245,240,232,0.3)',
    marginBottom: 12,
  },
  accountRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,240,232,0.06)',
  },
  accountRowLast: {
    borderBottomWidth: 0,
  },
  accountRowTextMuted: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(245,240,232,0.45)',
  },
  accountRowTextClose: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(201,168,76,0.4)',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#1A1030',
    borderRadius: 20,
    padding: 28,
    width: 300,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
  },
  modalTitle: {
    fontFamily: 'Lora_700Bold',
    fontSize: 20,
    color: '#F5F0E8',
    marginBottom: 12,
  },
  modalBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(245,240,232,0.7)',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalConfirmButton: {
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  modalConfirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#0A0E1A',
    textAlign: 'center',
  },
  modalCancelText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(245,240,232,0.5)',
    paddingVertical: 12,
    textAlign: 'center',
  },
});
