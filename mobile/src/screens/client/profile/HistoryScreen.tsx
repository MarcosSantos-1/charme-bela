import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../components/ScreenHeader';

const MOCK_HISTORY = [
  {
    id: '1',
    date: '15/11/2025',
    service: 'Limpeza de Pele Profunda',
    professional: 'Dra. Ana Paula',
    duration: '60 min',
    price: 0,
    paymentType: 'plan',
    status: 'completed',
  },
  {
    id: '2',
    date: '08/11/2025',
    service: 'Drenagem Linfática',
    professional: 'Terapeuta Carla Santos',
    duration: '60 min',
    price: 0,
    paymentType: 'plan',
    status: 'completed',
  },
  {
    id: '3',
    date: '01/11/2025',
    service: 'Radiofrequência Facial',
    professional: 'Dra. Beatriz Lima',
    duration: '45 min',
    price: 180,
    paymentType: 'cash',
    status: 'completed',
  },
  {
    id: '4',
    date: '25/10/2025',
    service: 'Massagem Modeladora',
    professional: 'Terapeuta Julia',
    duration: '60 min',
    price: 0,
    paymentType: 'plan',
    status: 'completed',
  },
  {
    id: '5',
    date: '18/10/2025',
    service: 'Peeling Químico',
    professional: 'Dra. Ana Paula',
    duration: '45 min',
    price: 0,
    paymentType: 'plan',
    status: 'completed',
  },
];

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const getPaymentBadge = (type: string) => {
    switch (type) {
      case 'plan':
        return { text: 'Plano', color: '#10b981', bg: '#d1fae5' };
      case 'cash':
        return { text: 'Avulso', color: '#f59e0b', bg: '#fef3c7' };
      case 'clinic':
        return { text: 'Clínica', color: '#6366f1', bg: '#e0e7ff' };
      default:
        return { text: 'N/A', color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={20} color="#ec4899" />
        </TouchableOpacity>
      </ScreenHeader>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{MOCK_HISTORY.length}</Text>
            <Text style={styles.statLabel}>Procedimentos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {MOCK_HISTORY.filter(h => h.paymentType === 'plan').length}
            </Text>
            <Text style={styles.statLabel}>Pelo Plano</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>R$ 1.2k</Text>
            <Text style={styles.statLabel}>Economizado</Text>
          </View>
        </View>

        {/* History List */}
        <View style={styles.historyList}>
          <Text style={styles.listTitle}>Todos os Procedimentos</Text>
          
          {MOCK_HISTORY.map((item) => {
            const paymentBadge = getPaymentBadge(item.paymentType);
            
            return (
              <View key={item.id} style={styles.historyCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  </View>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardService}>{item.service}</Text>
                    <Text style={styles.cardDate}>
                      {item.date} • {item.duration}
                    </Text>
                  </View>
                  <View style={[styles.paymentBadge, { backgroundColor: paymentBadge.bg }]}>
                    <Text style={[styles.paymentBadgeText, { color: paymentBadge.color }]}>
                      {paymentBadge.text}
                    </Text>
                  </View>
                </View>

                {/* Professional */}
                <View style={styles.cardRow}>
                  <Ionicons name="person-outline" size={16} color="#6b7280" />
                  <Text style={styles.cardRowText}>{item.professional}</Text>
                </View>

                {/* Price */}
                {item.price > 0 && (
                  <View style={styles.cardRow}>
                    <Ionicons name="cash-outline" size={16} color="#6b7280" />
                    <Text style={styles.cardRowText}>R$ {item.price.toFixed(2)}</Text>
                  </View>
                )}

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.statusContainer}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Concluído</Text>
                  </View>
                  <TouchableOpacity style={styles.detailsButton}>
                    <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
                    <Ionicons name="chevron-forward" size={16} color="#ec4899" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ec4899',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  historyList: {
    paddingHorizontal: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardService: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardRowText: {
    fontSize: 14,
    color: '#6b7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ec4899',
  },
});



