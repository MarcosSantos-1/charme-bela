import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import {
  ACTIVE_CLINIC,
  clinicMapsUrl,
  clinicWazeUrl,
  type ClinicInfo,
} from '../constants/clinicInfo';

interface ClinicInfoPanelProps {
  visible: boolean;
  onClose: () => void;
  /** SaaS: passar clínica selecionada; default = Charme & Bela */
  clinic?: ClinicInfo;
}

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

export function ClinicInfoPanel({
  visible,
  onClose,
  clinic = ACTIVE_CLINIC,
}: ClinicInfoPanelProps) {
  const openWhatsApp = () => {
    const message = 'Olá! Gostaria de falar sobre a clínica.';
    const appUrl = `whatsapp://send?phone=${clinic.whatsappE164}&text=${encodeURIComponent(message)}`;
    Linking.openURL(appUrl).catch(() => {
      openUrl(`https://wa.me/${clinic.whatsappE164}?text=${encodeURIComponent(message)}`);
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoCircle}>
                <Image source={clinic.logo} style={styles.logo} resizeMode="contain" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>{clinic.name}</Text>
                <Text style={styles.headerSubtitle}>Sobre a clínica</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>Redes e contato</Text>

            <TouchableOpacity style={styles.row} onPress={openWhatsApp}>
              <View style={[styles.rowIcon, { backgroundColor: '#25d366' }]}>
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>WhatsApp</Text>
                <Text style={styles.rowSubtitle}>{clinic.whatsappDisplay}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={() => openUrl(clinic.instagramUrl)}>
              <View style={[styles.rowIcon, { backgroundColor: '#E1306C' }]}>
                <Ionicons name="logo-instagram" size={20} color="#fff" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>Instagram</Text>
                <Text style={styles.rowSubtitle}>{clinic.instagramHandle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.row}
              onPress={() => openUrl(`mailto:${clinic.email}`)}
            >
              <View style={[styles.rowIcon, { backgroundColor: '#ec4899' }]}>
                <Ionicons name="mail" size={20} color="#fff" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>E-mail</Text>
                <Text style={styles.rowSubtitle}>{clinic.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Localização</Text>
            <Text style={styles.address}>
              {clinic.addressLine1}
              {'\n'}
              {clinic.addressLine2}
              {'\n'}
              {clinic.cityState}
            </Text>

            <TouchableOpacity
              style={styles.mapWrap}
              activeOpacity={0.9}
              onPress={() => openUrl(clinicMapsUrl(clinic))}
            >
              <MapView
                style={styles.map}
                pointerEvents="none"
                initialRegion={{
                  latitude: clinic.latitude,
                  longitude: clinic.longitude,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: clinic.latitude,
                    longitude: clinic.longitude,
                  }}
                  title={clinic.name}
                />
              </MapView>
              <View style={styles.mapHint}>
                <Ionicons name="expand-outline" size={14} color="#fff" />
                <Text style={styles.mapHintText}>Toque para abrir no Google</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnPrimary]}
                onPress={() => openUrl(clinicMapsUrl(clinic))}
              >
                <Ionicons name="logo-google" size={18} color="#fff" />
                <Text style={styles.navBtnPrimaryText}>Google Negócio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnSecondary]}
                onPress={() => openUrl(clinicWazeUrl(clinic))}
              >
                <Ionicons name="navigate" size={18} color="#33ccff" />
                <Text style={styles.navBtnSecondaryText}>Waze</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hoursBox}>
              <Text style={styles.hoursTitle}>Horário de funcionamento</Text>
              {clinic.hours.map((h) => (
                <View key={h.label} style={styles.hoursLine}>
                  <Text style={styles.hoursLabel}>{h.label}</Text>
                  <Text style={styles.hoursValue}>{h.value}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 30,
    height: 30,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  address: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  mapWrap: {
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#e5e7eb',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapHint: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17,24,39,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mapHintText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  navBtnPrimary: {
    backgroundColor: '#111827',
  },
  navBtnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  navBtnSecondary: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#a5f3fc',
  },
  navBtnSecondaryText: {
    color: '#0e7490',
    fontWeight: '700',
    fontSize: 14,
  },
  hoursBox: {
    padding: 16,
    backgroundColor: '#fdf2f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7f3',
  },
  hoursTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9d174d',
    marginBottom: 10,
  },
  hoursLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hoursLabel: {
    fontSize: 13,
    color: '#9d174d',
  },
  hoursValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9d174d',
  },
});
