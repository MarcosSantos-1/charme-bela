import { type ComponentProps } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { KeyboardForm, dismissKeyboard } from '../../../components/KeyboardForm';
import {
  displayUserContact,
  displayUserName,
  formatPhoneDisplay,
  isPhoneLocalEmail,
} from '../../../lib/userDisplay';

function FormField({
  label,
  icon,
  ...inputProps
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
} & ComponentProps<typeof TextInput>) {
  const { editable = true, ...rest } = inputProps;

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholderTextColor="#9ca3af"
          editable={editable}
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={dismissKeyboard}
          {...rest}
        />
      </View>
    </View>
  );
}

export function PersonalDataScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const contactEmail = user?.email && !isPhoneLocalEmail(user.email) ? user.email : '';
  const contactPhone = formatPhoneDisplay(user?.phone) || displayUserContact(user);

  return (
    <View style={styles.container}>
      <ScreenHeader>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dados Pessoais</Text>
        <View style={{ width: 40 }} />
      </ScreenHeader>

      <KeyboardForm
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayUserName(user).charAt(0).toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={20} color="#ec4899" />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <FormField
            label="Nome Completo"
            icon="person-outline"
            value={displayUserName(user, '')}
            placeholder="Seu nome completo"
            editable={false}
          />
          <FormField
            label="Email"
            icon="mail-outline"
            value={contactEmail}
            placeholder={isPhoneLocalEmail(user?.email) ? 'Conta por celular' : 'seu@email.com'}
            keyboardType="email-address"
            editable={false}
          />
          <FormField
            label="Telefone"
            icon="call-outline"
            value={contactPhone}
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            editable={false}
          />
          <FormField
            label="Data de Nascimento"
            icon="calendar-outline"
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
          />
          <FormField
            label="CPF"
            icon="card-outline"
            placeholder="000.000.000-00"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segurança</Text>

          <TouchableOpacity style={styles.securityButton}>
            <View style={styles.securityButtonContent}>
              <Ionicons name="lock-closed-outline" size={24} color="#6b7280" />
              <Text style={styles.securityButtonText}>Alterar Senha</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.securityButton}>
            <View style={styles.securityButtonContent}>
              <Ionicons name="finger-print-outline" size={24} color="#6b7280" />
              <Text style={styles.securityButtonText}>Biometria</Text>
            </View>
            <View style={styles.switchContainer}>
              <View style={styles.switchOff} />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={dismissKeyboard}>
          <Text style={styles.saveButtonText}>Salvar Alterações</Text>
        </TouchableOpacity>
      </KeyboardForm>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 32,
    right: '50%',
    marginRight: -50,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: 32 }],
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  securityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  securityButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  switchContainer: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d1d5db',
    padding: 2,
  },
  switchOff: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  saveButton: {
    margin: 20,
    backgroundColor: '#ec4899',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});



