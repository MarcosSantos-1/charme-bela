import { View, Text, TouchableOpacity, Modal, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ACTIVE_CLINIC, type ClinicInfo } from '../constants/clinicInfo';

interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
  /** SaaS: clínica ativa; default Charme & Bela */
  clinic?: ClinicInfo;
}

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

export function ContactModal({
  visible,
  onClose,
  clinic = ACTIVE_CLINIC,
}: ContactModalProps) {
  const handleWhatsApp = () => {
    const message = 'Olá! Gostaria de falar sobre meus agendamentos no app Charme & Bela.';
    const appUrl = `whatsapp://send?phone=${clinic.whatsappE164}&text=${encodeURIComponent(message)}`;
    Linking.openURL(appUrl).catch(() => {
      openUrl(`https://wa.me/${clinic.whatsappE164}?text=${encodeURIComponent(message)}`);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Fale Conosco</Text>
              <Text style={styles.clinicName}>{clinic.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Tire dúvidas sobre agendamentos, planos ou procedimentos.
            </Text>

            <TouchableOpacity style={styles.contactButton} onPress={handleWhatsApp}>
              <View style={[styles.contactIcon, { backgroundColor: '#25d366' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="white" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>WhatsApp</Text>
                <Text style={styles.contactSubtitle}>{clinic.whatsappDisplay}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => openUrl(`tel:+${clinic.whatsappE164}`)}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#6366f1' }]}>
                <Ionicons name="call" size={24} color="white" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Telefone</Text>
                <Text style={styles.contactSubtitle}>{clinic.whatsappDisplay}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => openUrl(clinic.instagramUrl)}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#E1306C' }]}>
                <Ionicons name="logo-instagram" size={24} color="white" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Instagram</Text>
                <Text style={styles.contactSubtitle}>{clinic.instagramHandle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => openUrl(clinic.websiteUrl)}
            >
              <View style={[styles.contactIcon, { backgroundColor: '#ec4899' }]}>
                <Ionicons name="globe-outline" size={24} color="white" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Site</Text>
                <Text style={styles.contactSubtitle}>charmebela.com.br</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() =>
                openUrl(
                  `mailto:${clinic.contactEmail}?subject=${encodeURIComponent('Contato via App Charme & Bela')}`
                )
              }
            >
              <View style={[styles.contactIcon, { backgroundColor: '#111827' }]}>
                <Ionicons name="mail" size={24} color="white" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>E-mail</Text>
                <Text style={styles.contactSubtitle}>{clinic.contactEmail}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            <View style={styles.addressBox}>
              <Ionicons name="location" size={18} color="#9d174d" />
              <Text style={styles.addressText}>
                {clinic.addressLine1}
                {'\n'}
                {clinic.addressLine2} — {clinic.cityState}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  clinicName: {
    marginTop: 2,
    fontSize: 13,
    color: '#ec4899',
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 21,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 10,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  addressBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#fdf2f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fce7f3',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#9d174d',
    lineHeight: 19,
    fontWeight: '500',
  },
});
