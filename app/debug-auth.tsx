import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { authClient, BEARER_TOKEN_KEY } from '@/lib/auth';
import { useRouter } from 'expo-router';

const KNOWN_KEYS = [
  'sacreddesign_bearer_token',
  'sacreddesign_cookie',
  'sacreddesign_session_data',
  'sacreddesign.session_token',
  'better-auth_cookie',
  'better-auth_session_data',
  'better-auth.session_token',
  'sacreddesign-session',
  'sacreddesign-token',
  'bearer_token',
  'session_token',
];

export default function DebugAuthScreen() {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, string | null>>({});
  const [session, setSession] = useState<string>('loading...');

  useEffect(() => {
    console.log('[DebugAuth] Screen mounted — scanning SecureStore keys:', KNOWN_KEYS);
    async function run() {
      const found: Record<string, string | null> = {};
      for (const key of KNOWN_KEYS) {
        try {
          const val = await SecureStore.getItemAsync(key);
          console.log(`[DebugAuth] SecureStore key="${key}" →`, val === null ? '(null)' : val?.substring(0, 80));
          found[key] = val;
        } catch (e) {
          console.warn(`[DebugAuth] SecureStore error for key="${key}":`, e);
          found[key] = `ERROR: ${e}`;
        }
      }
      setResults(found);

      console.log('[DebugAuth] Calling authClient.getSession()...');
      try {
        const s = await authClient.getSession();
        console.log('[DebugAuth] getSession() result:', JSON.stringify(s?.data, null, 2));
        setSession(JSON.stringify(s?.data, null, 2));
      } catch (e) {
        console.warn('[DebugAuth] getSession() error:', e);
        setSession(`ERROR: ${e}`);
      }
    }
    run();
  }, []);

  const checking = 'checking...';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable
        onPress={() => {
          console.log('[DebugAuth] Back pressed');
          router.back();
        }}
        style={styles.back}
      >
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Auth Debug</Text>

      <Text style={styles.section}>BEARER_TOKEN_KEY constant:</Text>
      <View style={styles.row}>
        <Text style={styles.value}>{BEARER_TOKEN_KEY}</Text>
      </View>

      <Text style={styles.section}>SecureStore Keys:</Text>
      {KNOWN_KEYS.map(key => {
        const raw = results[key];
        const display =
          raw === undefined
            ? checking
            : raw === null
            ? '(null)'
            : raw.length > 100
            ? raw.substring(0, 100) + '...'
            : raw;
        const isFound = raw !== undefined && raw !== null;
        return (
          <View key={key} style={[styles.row, isFound && styles.rowFound]}>
            <Text style={styles.key}>{key}</Text>
            <Text style={[styles.value, isFound && styles.valueFound]}>{display}</Text>
          </View>
        );
      })}

      <Text style={styles.section}>authClient.getSession():</Text>
      <View style={styles.row}>
        <Text style={styles.value}>{session}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F6F1E8' },
  content: { padding: 20, paddingBottom: 80 },
  back: { marginBottom: 16 },
  backText: { color: '#6F8A6A', fontSize: 16 },
  title: { fontSize: 24, fontFamily: 'Lora_700Bold', color: '#2F3E2F', marginBottom: 20 },
  section: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#6F8A6A',
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(47,62,47,0.08)',
  },
  rowFound: {
    borderColor: '#6F8A6A',
    backgroundColor: '#F0F5F0',
  },
  key: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#2F3E2F', marginBottom: 4 },
  value: { fontSize: 11, fontFamily: 'Inter_400Regular', color: '#888', lineHeight: 16 },
  valueFound: { color: '#2F3E2F' },
});
