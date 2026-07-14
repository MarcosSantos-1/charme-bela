import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { getAnamnesis } from '../../../lib/api';
import { getApiErrorMessage } from '../../../types/commercial';
import { ScreenHeader } from '../../../components/ScreenHeader';

export function AnamnesisScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    setError(null);
    try { setData(await getAnamnesis(user.id)); }
    catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  const sections = data ? [
    { title: 'Dados pessoais', value: data.personalData },
    { title: 'Estilo de vida', value: data.lifestyleData },
    { title: 'Saúde', value: data.healthData },
    { title: 'Objetivos', value: data.objectivesData },
  ] : [];

  return (
    <View style={styles.container}>
      <ScreenHeader><TouchableOpacity onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity><Text style={styles.title}>Ficha de Anamnese</Text><TouchableOpacity onPress={load} style={styles.back}><Ionicons name="refresh" size={20} color="#ec4899" /></TouchableOpacity></ScreenHeader>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color="#ec4899" /></View> : (
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#ec4899" />}>
          <View style={styles.info}><Ionicons name="shield-checkmark" size={25} color="#2563eb" /><Text style={styles.infoText}>Suas informações reais estão sincronizadas com a clínica e ajudam a tornar os tratamentos mais seguros.</Text></View>
          {error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity></View> : !data ? <View style={styles.center}><Ionicons name="document-text-outline" size={50} color="#d1d5db" /><Text style={styles.empty}>Você ainda não possui uma ficha preenchida.</Text><Text style={styles.hint}>Ao tentar fazer o primeiro agendamento, o app abrirá a ficha essencial.</Text></View> : <>
            <View style={styles.updated}><Ionicons name="time-outline" size={16} color="#6b7280" /><Text style={styles.updatedText}>Atualizada em {new Date(data.updatedAt).toLocaleDateString('pt-BR')}</Text></View>
            {sections.map((section) => <View key={section.title} style={styles.section}><Text style={styles.sectionTitle}>{section.title}</Text><View style={styles.card}>{entries(section.value).map(([key, value]) => <View key={key} style={styles.row}><Text style={styles.label}>{humanize(key)}</Text><Text style={styles.value}>{formatValue(value)}</Text></View>)}</View></View>)}
          </>}
        </ScrollView>
      )}
    </View>
  );
}

function entries(value: any): [string, any][] { return value && typeof value === 'object' ? Object.entries(value) : [['Informações', value || 'Não informado']]; }
function humanize(value: string) { return value.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase()); }
function formatValue(value: any): string { if (Array.isArray(value)) return value.length ? value.join(', ') : 'Não informado'; if (typeof value === 'boolean') return value ? 'Sim' : 'Não'; if (value && typeof value === 'object') return Object.values(value).map(formatValue).filter(Boolean).join(', ') || 'Não informado'; return String(value || 'Não informado'); }

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#f9fafb' }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 18, fontWeight: '800', color: '#111827' }, content: { padding: 20, paddingBottom: 40 }, center: { flex: 1, minHeight: 300, justifyContent: 'center', alignItems: 'center', padding: 26 }, info: { flexDirection: 'row', gap: 12, backgroundColor: '#dbeafe', borderRadius: 14, padding: 16 }, infoText: { flex: 1, color: '#1e40af', lineHeight: 19 }, updated: { flexDirection: 'row', gap: 6, alignItems: 'center', marginVertical: 17 }, updatedText: { color: '#6b7280', fontSize: 13 }, section: { marginBottom: 20 }, sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '800', marginBottom: 10 }, card: { backgroundColor: 'white', borderRadius: 14, padding: 16 }, row: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }, label: { color: '#6b7280', fontSize: 12, marginBottom: 3 }, value: { color: '#111827', fontSize: 15, fontWeight: '600' }, error: { color: '#b91c1c', textAlign: 'center' }, retry: { color: '#ec4899', fontWeight: '800', marginTop: 12 }, empty: { color: '#4b5563', fontSize: 17, textAlign: 'center', marginTop: 12 }, hint: { color: '#9ca3af', textAlign: 'center', marginTop: 8, lineHeight: 19 } });
