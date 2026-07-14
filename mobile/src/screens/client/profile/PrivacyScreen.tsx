import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../components/ScreenHeader';

export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.container}>
      <ScreenHeader>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidade</Text>
        <View style={styles.placeholder} />
      </ScreenHeader>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Privacy Overview */}
        <View style={styles.section}>
          <View style={styles.overviewCard}>
            <View style={styles.overviewIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#10b981" />
            </View>
            <Text style={styles.overviewTitle}>Seus dados estão seguros</Text>
            <Text style={styles.overviewText}>
              Utilizamos criptografia de ponta e seguimos as melhores práticas de segurança 
              para proteger suas informações pessoais e médicas.
            </Text>
          </View>
        </View>

        {/* Data Collection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coleta de Dados</Text>
          
          <View style={styles.dataItem}>
            <View style={styles.dataIcon}>
              <Ionicons name="person" size={20} color="#ec4899" />
            </View>
            <View style={styles.dataInfo}>
              <Text style={styles.dataTitle}>Dados Pessoais</Text>
              <Text style={styles.dataDescription}>
                Nome, email, telefone, CPF e data de nascimento
              </Text>
            </View>
          </View>

          <View style={styles.dataItem}>
            <View style={styles.dataIcon}>
              <Ionicons name="medical" size={20} color="#ec4899" />
            </View>
            <View style={styles.dataInfo}>
              <Text style={styles.dataTitle}>Informações Médicas</Text>
              <Text style={styles.dataDescription}>
                Anamnese, histórico de procedimentos e alergias
              </Text>
            </View>
          </View>

          <View style={styles.dataItem}>
            <View style={styles.dataIcon}>
              <Ionicons name="card" size={20} color="#ec4899" />
            </View>
            <View style={styles.dataInfo}>
              <Text style={styles.dataTitle}>Dados de Pagamento</Text>
              <Text style={styles.dataDescription}>
                Informações de cartão processadas pelo Stripe
              </Text>
            </View>
          </View>

          <View style={styles.dataItem}>
            <View style={styles.dataIcon}>
              <Ionicons name="analytics" size={20} color="#ec4899" />
            </View>
            <View style={styles.dataInfo}>
              <Text style={styles.dataTitle}>Dados de Uso</Text>
              <Text style={styles.dataDescription}>
                Como você usa o app para melhorar nossos serviços
              </Text>
            </View>
          </View>
        </View>

        {/* Data Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Como Usamos Seus Dados</Text>
          
          <View style={styles.usageItem}>
            <Text style={styles.usageTitle}>• Agendamentos</Text>
            <Text style={styles.usageText}>Para marcar e gerenciar seus procedimentos</Text>
          </View>

          <View style={styles.usageItem}>
            <Text style={styles.usageTitle}>• Comunicação</Text>
            <Text style={styles.usageText}>Enviar lembretes e informações importantes</Text>
          </View>

          <View style={styles.usageItem}>
            <Text style={styles.usageTitle}>• Segurança Médica</Text>
            <Text style={styles.usageText}>Garantir procedimentos seguros baseados na anamnese</Text>
          </View>

          <View style={styles.usageItem}>
            <Text style={styles.usageTitle}>• Melhoria do Serviço</Text>
            <Text style={styles.usageText}>Analisar uso para melhorar a experiência</Text>
          </View>
        </View>

        {/* Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seus Direitos</Text>
          
          <TouchableOpacity style={styles.rightItem}>
            <View style={styles.rightIcon}>
              <Ionicons name="eye" size={20} color="#6366f1" />
            </View>
            <View style={styles.rightInfo}>
              <Text style={styles.rightTitle}>Acesso aos Dados</Text>
              <Text style={styles.rightDescription}>Visualizar todas as informações coletadas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.rightItem}>
            <View style={styles.rightIcon}>
              <Ionicons name="create" size={20} color="#6366f1" />
            </View>
            <View style={styles.rightInfo}>
              <Text style={styles.rightTitle}>Correção</Text>
              <Text style={styles.rightDescription}>Corrigir dados incorretos ou desatualizados</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.rightItem}>
            <View style={styles.rightIcon}>
              <Ionicons name="trash" size={20} color="#6366f1" />
            </View>
            <View style={styles.rightInfo}>
              <Text style={styles.rightTitle}>Exclusão</Text>
              <Text style={styles.rightDescription}>Solicitar exclusão dos seus dados</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.rightItem}>
            <View style={styles.rightIcon}>
              <Ionicons name="download" size={20} color="#6366f1" />
            </View>
            <View style={styles.rightInfo}>
              <Text style={styles.rightTitle}>Portabilidade</Text>
              <Text style={styles.rightDescription}>Exportar seus dados em formato legível</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dúvidas sobre Privacidade?</Text>
          
          <TouchableOpacity style={styles.contactButton}>
            <View style={styles.contactIcon}>
              <Ionicons name="mail" size={24} color="white" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Contatar DPO</Text>
              <Text style={styles.contactSubtitle}>privacidade@charmebela.com.br</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Last Updated */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Última atualização: 15 de novembro de 2025
          </Text>
          <Text style={styles.footerText}>
            Versão 1.0 da Política de Privacidade
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    padding: 20,
    paddingBottom: 12,
    backgroundColor: '#f9fafb',
  },
  overviewCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  overviewIcon: {
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  overviewText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dataIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#fce7f3',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  dataInfo: {
    flex: 1,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  dataDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  usageItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  usageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  usageText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  rightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rightIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#e0e7ff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rightInfo: {
    flex: 1,
  },
  rightTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  rightDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  contactIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#6366f1',
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
    fontSize: 13,
    color: '#6b7280',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
});
