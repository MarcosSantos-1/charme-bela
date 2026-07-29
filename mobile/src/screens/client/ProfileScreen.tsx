import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import type { ClientTabParamList } from '../../navigation/ClientNavigator';
import { PersonalDataScreen } from './profile/PersonalDataScreen';
import { MyPlanScreen } from './profile/MyPlanScreen';
import { AnamnesisScreen } from './profile/AnamnesisScreen';
import { HistoryScreen } from './profile/HistoryScreen';
import { NotificationsScreen } from './profile/NotificationsScreen';
import { LanguageScreen } from './profile/LanguageScreen';
import { HelpCenterScreen } from './profile/HelpCenterScreen';
import { PrivacyScreen } from './profile/PrivacyScreen';
import { ContactModal } from '../../components/ContactModal';
import { displayUserContact, displayUserName } from '../../lib/userDisplay';

type SubScreen = 'main' | 'personal-data' | 'plan' | 'anamnesis' | 'history' | 'notifications' | 'language' | 'help' | 'privacy';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<ClientTabParamList, 'Profile'>>();
  const navigation = useNavigation<any>();
  const [currentScreen, setCurrentScreen] = useState<SubScreen>('main');
  const [showContactModal, setShowContactModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const screen = route.params?.openScreen;
      if (screen === 'history' || screen === 'anamnesis' || screen === 'plan') {
        setCurrentScreen(screen);
        navigation.setParams({ openScreen: undefined });
      }
    }, [route.params?.openScreen, navigation])
  );

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: signOut }
      ]
    );
  };

  // Renderizar sub-telas
  if (currentScreen === 'personal-data') {
    return <PersonalDataScreen onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'plan') {
    return <MyPlanScreen onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'anamnesis') {
    return <AnamnesisScreen onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'history') {
    return <HistoryScreen onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'notifications') {
    return <NotificationsScreen onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'language') {
    return <LanguageScreen onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'help') {
    return <HelpCenterScreen onBack={() => setCurrentScreen('main')} />;
  }
  if (currentScreen === 'privacy') {
    return <PrivacyScreen onBack={() => setCurrentScreen('main')} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header rosa invade a safe area superior */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>
                {displayUserName(user).charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.userName}>{displayUserName(user)}</Text>
            <Text style={styles.userEmail}>{displayUserContact(user)}</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => setCurrentScreen('personal-data')}>
              <Text style={styles.editButtonText}>Editar Perfil</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Procedimentos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>6</Text>
              <Text style={styles.statLabel}>Meses ativo</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Ativo</Text>
              <Text style={styles.statLabel}>Próxima cobrança: 15/12</Text>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Minha Conta</Text>

          <View style={styles.menuSection}>
            <MenuItem 
              icon="person-outline"
              title="Dados Pessoais"
              subtitle="Nome, email, telefone"
              onPress={() => setCurrentScreen('personal-data')}
            />
            <Divider />
            <MenuItem 
              icon="card-outline"
              title="Plano e Pagamentos"
              subtitle="Gerenciar assinatura"
              onPress={() => setCurrentScreen('plan')}
            />
            <Divider />
            <MenuItem 
              icon="document-text-outline"
              title="Ficha de Anamnese"
              subtitle="Histórico médico"
              onPress={() => setCurrentScreen('anamnesis')}
            />
            <Divider />
            <MenuItem 
              icon="time-outline"
              title="Histórico"
              subtitle="Procedimentos realizados"
              onPress={() => setCurrentScreen('history')}
            />
          </View>

          <Text style={styles.sectionTitle}>Preferências</Text>

          <View style={styles.menuSection}>
            <MenuItem 
              icon="notifications-outline"
              title="Notificações"
              subtitle="Lembretes e avisos"
              onPress={() => setCurrentScreen('notifications')}
            />
            <Divider />
            <MenuItem 
              icon="moon-outline"
              title="Modo Escuro"
              subtitle="Em breve"
              disabled
            />
            <Divider />
            <MenuItem 
              icon="language-outline"
              title="Idioma"
              subtitle="Português (BR)"
              onPress={() => setCurrentScreen('language')}
            />
          </View>

          <Text style={styles.sectionTitle}>Suporte</Text>

          <View style={styles.menuSection}>
            <MenuItem 
              icon="help-circle-outline"
              title="Central de Ajuda"
              subtitle="FAQ e tutoriais"
              onPress={() => setCurrentScreen('help')}
            />
            <Divider />
            <MenuItem 
              icon="chatbubbles-outline"
              title="Fale Conosco"
              subtitle="WhatsApp e email"
              onPress={() => setShowContactModal(true)}
            />
            <Divider />
            <MenuItem 
              icon="shield-checkmark-outline"
              title="Privacidade"
              subtitle="Termos e política"
              onPress={() => setCurrentScreen('privacy')}
            />
            <Divider />
            <MenuItem 
              icon="information-circle-outline"
              title="Sobre o App"
              subtitle="Versão 1.0.0"
            />
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutIcon}>
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            </View>
            <View style={styles.logoutContent}>
              <Text style={styles.logoutText}>Sair da Conta</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Contact Modal */}
        <ContactModal 
          visible={showContactModal}
          onClose={() => setShowContactModal(false)}
        />
      </ScrollView>
    </View>
  );
}

function MenuItem({ 
  icon, 
  title, 
  subtitle, 
  disabled = false,
  onPress
}: { 
  icon: string; 
  title: string; 
  subtitle: string; 
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity 
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color="#6b7280" />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 24,
    paddingBottom: 48,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatarLarge: {
    width: 96,
    height: 96,
    backgroundColor: '#fce7f3',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#fce7f3',
  },
  editButton: {
    backgroundColor: '#db2777',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginTop: -24,
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ec4899',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  content: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginLeft: 80,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#fecaca',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
  },
  logoutIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#fef2f2',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logoutContent: {
    flex: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
});
