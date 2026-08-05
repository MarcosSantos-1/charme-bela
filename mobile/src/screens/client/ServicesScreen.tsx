import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCommercial } from '../../contexts/CommercialContext';
import { CATEGORY_META, type Service, type ServiceCategory, type Subscription } from '../../types/commercial';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function isServiceInPlan(service: Service, subscription: Subscription | null) {
  if (!subscription) return false;
  const stillActive =
    subscription.status === 'ACTIVE' ||
    subscription.status === 'PAUSED' ||
    subscription.status === 'PAST_DUE' ||
    (subscription.status === 'CANCELED' && Boolean(subscription.endDate && new Date(subscription.endDate) > new Date()));
  if (!stillActive) return false;
  return subscription.plan.services.some((planService) => planService.id === service.id);
}

export function ServicesScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { services, subscription, loading, refreshing, error, refresh } = useCommercial();
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollToTop();
      const unsubscribe = navigation.addListener('tabPress', scrollToTop);
      return unsubscribe;
    }, [navigation, scrollToTop])
  );

  useEffect(() => {
    if (route.params?.category && route.params.category in CATEGORY_META) {
      setSelectedCategory(route.params.category);
    }
  }, [route.params?.category]);

  const categories = (Object.keys(CATEGORY_META) as ServiceCategory[])
    .filter((category) => services.some((service) => service.category === category))
    .map((category) => ({ id: category, ...CATEGORY_META[category] }));

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.trim().length > 0) {
      setSelectedCategory(null);
    }
  }, []);

  const filteredServices = services.filter((service) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query || `${service.name} ${service.description} ${CATEGORY_META[service.category].label}`.toLowerCase().includes(query);
    // Busca é global: com texto na pesquisa, ignora o chip de categoria
    if (query) return matchesSearch;
    const matchesCategory = !selectedCategory || service.category === selectedCategory;
    return matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Serviços</Text>
        <Text style={styles.headerSubtitle}>Escolha seu tratamento</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar serviços…"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ec4899" />}>
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
                Tente outro termo ou categoria
              </Text>
            </View>
          ) : (
            filteredServices.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                includedInPlan={isServiceInPlan(service, subscription)}
                onBook={() => navigation.navigate('Booking', { serviceId: service.id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ServiceCard({
  service,
  includedInPlan,
  onBook,
}: {
  service: Service;
  includedInPlan: boolean;
  onBook: () => void;
}) {
  const meta = CATEGORY_META[service.category];

  return (
    <TouchableOpacity style={styles.serviceCard} onPress={onBook}>
      <View style={styles.serviceHeader}>
        <View style={[styles.serviceIconContainer, { backgroundColor: `${meta.color}18` }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={24} color={meta.color} />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <Text style={styles.serviceCategory}>{meta.label}</Text>
        </View>
        {includedInPlan ? (
          <View style={styles.planBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#be185d" />
            <Text style={styles.planBadgeText}>No plano</Text>
          </View>
        ) : null}
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
              {formatCurrency(service.price)}
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
  searchBox: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
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
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
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
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fce7f3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f9a8d4',
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#be185d',
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
