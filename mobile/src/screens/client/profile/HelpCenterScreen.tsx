import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../components/ScreenHeader';

const FAQ_ITEMS = [
  {
    id: '1',
    category: 'Agendamentos',
    questions: [
      { id: '1-1', question: 'Como agendar um procedimento?', answer: 'Você pode agendar através do app na seção Agenda, ou entrar em contato conosco via WhatsApp.' },
      { id: '1-2', question: 'Posso reagendar meu agendamento?', answer: 'Sim, você pode reagendar até 24h antes do horário marcado através do app ou entrando em contato.' },
      { id: '1-3', question: 'O que acontece se eu faltar?', answer: 'Agendamentos não cancelados com antecedência podem ter taxa de no-show aplicada.' },
    ]
  },
  {
    id: '2',
    category: 'Planos e Pagamentos',
    questions: [
      { id: '2-1', question: 'Como funciona o plano mensal?', answer: 'O plano mensal inclui tratamentos específicos que podem ser utilizados durante o mês de vigência.' },
      { id: '2-2', question: 'Posso cancelar meu plano?', answer: 'Sim, você pode cancelar a qualquer momento através da seção "Meu Plano" no app.' },
      { id: '2-3', question: 'Os tratamentos não utilizados são perdidos?', answer: 'Sim, os tratamentos do plano não utilizados no mês não são transferidos para o próximo mês.' },
    ]
  },
  {
    id: '3',
    category: 'Procedimentos',
    questions: [
      { id: '3-1', question: 'Preciso fazer anamnese?', answer: 'Sim, a anamnese é obrigatória antes de qualquer procedimento para sua segurança.' },
      { id: '3-2', question: 'Quanto tempo dura cada procedimento?', answer: 'A duração varia conforme o procedimento, geralmente entre 30 a 90 minutos.' },
      { id: '3-3', question: 'Há contraindicações?', answer: 'Sim, alguns procedimentos têm contraindicações que serão avaliadas na anamnese.' },
    ]
  },
];

export function HelpCenterScreen({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.container}>
      <ScreenHeader>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Central de Ajuda</Text>
        <View style={styles.placeholder} />
      </ScreenHeader>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInput}>
            <Ionicons name="search" size={20} color="#6b7280" />
            <Text style={styles.searchPlaceholder}>Buscar ajuda...</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>
          
          <TouchableOpacity style={styles.quickAction}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="calendar-outline" size={24} color="#ec4899" />
            </View>
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionTitle}>Agendar Procedimento</Text>
              <Text style={styles.quickActionSubtitle}>Marque seu próximo tratamento</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="card-outline" size={24} color="#ec4899" />
            </View>
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionTitle}>Gerenciar Plano</Text>
              <Text style={styles.quickActionSubtitle}>Verificar assinatura e pagamentos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickAction}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="document-text-outline" size={24} color="#ec4899" />
            </View>
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionTitle}>Minha Anamnese</Text>
              <Text style={styles.quickActionSubtitle}>Atualizar informações médicas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* FAQ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perguntas Frequentes</Text>
          
          {FAQ_ITEMS.map((category) => (
            <View key={category.id} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.category}</Text>
              
              {category.questions.map((item) => (
                <TouchableOpacity key={item.id} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ainda precisa de ajuda?</Text>
          
          <TouchableOpacity style={styles.contactButton}>
            <View style={styles.contactIcon}>
              <Ionicons name="chatbubbles-outline" size={24} color="white" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Fale Conosco</Text>
              <Text style={styles.contactSubtitle}>WhatsApp, email ou telefone</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
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
  searchContainer: {
    padding: 20,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
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
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#fce7f3',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  quickActionInfo: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ec4899',
    marginBottom: 12,
    marginTop: 8,
  },
  faqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
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
    backgroundColor: '#ec4899',
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
});
