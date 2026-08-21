import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useColorScheme, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { initDB } from '../lib/db';
import { getLicenseStatus, activateLicense, LicenseStatus } from '../lib/license';
import Colors from '../constants/Colors';
import { Lock, ShieldCheck } from 'lucide-react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme() || 'light';
  const theme = Colors[colorScheme];

  const [loading, setLoading] = useState(true);
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    // 1. Initialize local SQLite databases
    initDB();

    // 2. Fetch security hardware status
    getLicenseStatus().then(status => {
      setLicense(status);
      setLoading(false);
    });
  }, []);

  if (loading || !license) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Initializing Solar ERP Engine...</Text>
      </View>
    );
  }

  // Intercept application execution if trial has ended and lacks written license verification code
  if (!license.isLicensed && !license.isTrial) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, padding: 20 }]}>
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Lock color={theme.danger} size={48} style={{ alignSelf: 'center', marginBottom: 16 }} />
          <Text style={[styles.title, { color: theme.text }]}>Software Activation Required</Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>
            Your evaluation trial has ended. Please enter your valid mobile validation key corresponding to this installation's hardware identifier (HWID) to access your database.
          </Text>

          <View style={[styles.hwidBox, { backgroundColor: theme.surface }]}>
            <Text style={[styles.hwidLabel, { color: theme.text }]}>INSTALLATION HWID:</Text>
            <Text style={[styles.hwidCode, { color: theme.primary }]}>{license.hwid}</Text>
          </View>

          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
            placeholder="Enter Mobile Activation Code"
            placeholderTextColor="#888"
            value={keyInput}
            onChangeText={setKeyInput}
            secureTextEntry={false}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            disabled={activating}
            onPress={async () => {
              setActivating(true);
              const success = await activateLicense(keyInput);
              if (success) {
                Alert.alert("Success", "Software unlocked successfully!");
                const res = await getLicenseStatus();
                setLicense(res);
              } else {
                Alert.alert("Activation Failed", "The license key provided is invalid for this HWID.");
              }
              setActivating(false);
            }}
          >
            <Text style={styles.buttonText}>{activating ? 'Verifying...' : 'Unlock Solar ERP'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#fff',
        title: 'Solar ERP Mobile',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings/backup" options={{ title: 'Google Drive Sync' }} />
      <Stack.Screen name="reports/index" options={{ title: 'Reports Hub' }} />
      <Stack.Screen name="reports/daily-book" options={{ title: 'Statements & Reports' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500' },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 4,
  },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  hwidBox: { padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  hwidLabel: { fontSize: 12, fontWeight: '600', opacity: 0.7 },
  hwidCode: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  input: { height: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, marginBottom: 16 },
  button: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
