import { View, Text, TouchableOpacity, Modal, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ContactModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ContactModal({ visible, onClose }: ContactModalProps) {
  const handleWhatsApp = () => {
    const phoneNumber = '5511999999999'; // Número da clínica
    const message = 'Olá! Gostaria de falar sobre meus agendamentos.';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.openURL(url).catch(() => {
      // Fallback para web se o app não estiver instalado
      const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      Linking.openURL(webUrl);
    });
  };

  const handleEmail = () => {
    const email = 'contato@charmebela.com.br';
    const subject = 'Contato via App';
    const body = 'Olá! Gostaria de entrar em contato sobre...';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(url);
  };

  const handlePhone = () => {
    const phoneNumber = '5511999999999';
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Fale Conosco</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Escolha a melhor forma de entrar em contato conosco:
            </Text>

            {/* WhatsApp */}
            <TouchableOpacity style={styles.contactButton} onPress={handleWhatsApp}>
              <View style={[styles.contactIcon, { backgroundColor: '#25d366' }]}>
                <Ionicons name="logo-whatsapp" size={24} color="white" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>WhatsApp</Text>
                <Text style={styles.contactSubtitle}>Resposta rápida</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            {/* Email */}
            <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
              <View style={[styles.contactIcon, { backgroundColor: '#ec4899' }]}>
                <Ionicons name="mail" size={24} color="white" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Email</Text>
                <Text style={styles.contactSubtitle}>contato@charmebela.com.br</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            {/* Telefone */}
            <TouchableOpacity style={styles.contactButton} onPress={handlePhone}>
              <View style={[styles.contactIcon, { backgroundColor: '#6366f1' }]}>
                <Ionicons name="call" size={24} color="white" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Telefone</Text>
                <Text style={styles.contactSubtitle}>(11) 99999-9999</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </TouchableOpacity>

            {/* Horário de funcionamento */}
            <View style={styles.hoursContainer}>
              <Text style={styles.hoursTitle}>Horário de Funcionamento</Text>
              <Text style={styles.hoursText}>Segunda a Sexta: 8h às 18h</Text>
              <Text style={styles.hoursText}>Sábado: 8h às 14h</Text>
              <Text style={styles.hoursText}>Domingo: Fechado</Text>
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
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
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
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 12,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
    fontSize: 14,
    color: '#6b7280',
  },
  hoursContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  hoursTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  hoursText: {
    fontSize: 13,
    color: '#0369a1',
    marginBottom: 2,
  },
});
