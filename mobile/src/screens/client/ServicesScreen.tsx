import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useCommercial } from '../../contexts/CommercialContext';
import { CATEGORY_META, type Service, type ServiceCategory } from '../../types/commercial';

export function ServicesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { services, loading, refreshing, error, refresh } = useCommercial();
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (route.params?.category && route.params.category in CATEGORY_META) {
      setSelectedCategory(route.params.category);
    }
  }, [route.params?.category]);

  const categories = (Object.keys(CATEGORY_META) as ServiceCategory[])
    .filter((category) => services.some((service) => service.category === category))
    .map((category) => ({ id: category, ...CATEGORY_META[category] }));

  const filteredServices = services.filter(service => {
    const matchesCategory = !selectedCategory || service.category === selectedCategory;
    const matchesSearch = `${service.name} ${service.description}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Serviços</Text>
        <Text style={styles.headerSubtitle}>Escolha seu tratamento</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ec4899" />}>
        {/* Categories Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipActive
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[
              styles.categoryChipText,
              !selectedCategory && styles.categoryChipTextActive
            ]}>
              Todos
            </Text>
          </TouchableOpacity>

          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <MaterialCommunityIcons
                name={category.icon as any}
                size={18}
                color={selectedCategory === category.id ? 'white' : '#6b7280'}
                style={styles.categoryIcon}
              />
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.categoryChipTextActive
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Services List */}
        <View style={styles.servicesList}>
          {loading ? (
            <ActivityIndicator size="large" color="#ec4899" style={styles.loader} />
          ) : error && services.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={58} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>Não foi possível carregar</Text>
              <Text style={styles.emptyStateText}>{error}</Text>
              <TouchableOpacity style={[styles.bookButton, { marginTop: 18 }]} onPress={refresh}><Text style={styles.bookButtonText}>Tentar novamente</Text></TouchableOpacity>
            </View>
          ) : filteredServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>Nenhum serviço encontrado</Text>
              <Text style={styles.emptyStateText}>
                Tente selecionar outra categoria
              </Text>
            </View>
          ) : (
            filteredServices.map(service => (
              <ServiceCard key={service.id} service={service} onBook={() => navigation.navigate('Booking', { serviceId: service.id })} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ServiceCard({ service, onBook }: { service: Service; onBook: () => void }) {
  return (
    <TouchableOpacity style={styles.serviceCard} onPress={onBook}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceIconContainer}>
          <Ionicons name="sparkles" size={24} color="#ec4899" />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.serviceCategory}>{CATEGORY_META[service.category].label}</Text>
        </View>
        {service.isActive && (
          <View style={styles.availableBadge}>
            <View style={styles.availableDot} />
            <Text style={styles.availableText}>Disponível</Text>
          </View>
        )}
      </View>

      <Text style={styles.serviceDescription} numberOfLines={2}>
        {service.description}
      </Text>

      <View style={styles.serviceFooter}>
        <View style={styles.serviceDetails}>
          <View style={styles.serviceDetail}>
            <Ionicons name="time-outline" size={16} color="#6b7280" />
              <Text style={styles.serviceDetailText}>{service.duration} min</Text>
          </View>
          <View style={styles.serviceDetail}>
            <Ionicons name="cash-outline" size={16} color="#6b7280" />
            <Text style={styles.serviceDetailText}>
              R$ {service.price.toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.bookButton} onPress={onBook}>
          <Text style={styles.bookButtonText}>Agendar</Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  categoriesScroll: {
    paddingVertical: 20,
  },
  categoriesContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#ec4899',
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryChipTextActive: {
    color: 'white',
  },
  servicesList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  loader: {
    marginTop: 48,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#fce7f3',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  serviceCategory: {
    fontSize: 13,
    color: '#6b7280',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableDot: {
    width: 6,
    height: 6,
    backgroundColor: '#10b981',
    borderRadius: 3,
    marginRight: 4,
  },
  availableText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  serviceDetailText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ec4899',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});
