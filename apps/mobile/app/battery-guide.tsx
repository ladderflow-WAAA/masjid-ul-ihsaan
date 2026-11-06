import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BatteryCharging } from 'lucide-react-native';

export default function BatteryGuideScreen() {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <BatteryCharging color="#047857" size={28} />
        <Text style={styles.headerTitle}>{t('battery.title')}</Text>
        <Text style={styles.headerDesc}>{t('battery.desc')}</Text>
      </View>

      {/* Xiaomi / Redmi / Poco */}
      <View style={styles.brandCard}>
        <Text style={styles.brandTitle}>Xiaomi / Redmi / POCO</Text>
        <Text style={styles.brandText}>{t('battery.xiaomi')}</Text>
      </View>

      {/* Samsung */}
      <View style={styles.brandCard}>
        <Text style={styles.brandTitle}>Samsung (One UI)</Text>
        <Text style={styles.brandText}>{t('battery.samsung')}</Text>
      </View>

      {/* Oppo / Vivo / Realme */}
      <View style={styles.brandCard}>
        <Text style={styles.brandTitle}>Oppo / Vivo / Realme (ColorOS / Funtouch)</Text>
        <Text style={styles.brandText}>{t('battery.oppoVivo')}</Text>
      </View>

      {/* Stock Android / Pixel / Motorola */}
      <View style={styles.brandCard}>
        <Text style={styles.brandTitle}>Stock Android / Google Pixel / Motorola</Text>
        <Text style={styles.brandText}>{t('battery.generic')}</Text>
      </View>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => Linking.openSettings()}
        accessibilityRole="button"
        accessibilityLabel="Open System App Settings"
      >
        <Text style={styles.settingsButtonText}>Open System App Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  headerCard: {
    backgroundColor: '#EEFBF4',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#B8E8D0',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#0A1F17',
  },
  headerDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#047857',
    lineHeight: 18,
  },
  brandCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  brandTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
  },
  brandText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#6B6560',
    lineHeight: 20,
  },
  settingsButton: {
    backgroundColor: '#047857',
    paddingVertical: 14,
    borderRadius: 999,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 48,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
