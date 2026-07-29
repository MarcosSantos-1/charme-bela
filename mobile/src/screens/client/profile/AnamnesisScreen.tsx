import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { getAnamnesis } from '../../../lib/api';
import { getApiErrorMessage } from '../../../types/commercial';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { brand } from '../../../theme/brand';
import { AnamnesisFlow } from '../../anamnesis/AnamnesisFlow';

const LABELS: Record<string, string> = {
  fullName: 'Nome completo',
  birthDate: 'Data de nascimento',
  sex: 'Sexo',
  phone: 'Telefone',
  email: 'E-mail',
  diagnosedDisease: 'Doença diagnosticada',
  diagnosedDiseaseDetails: 'Quais doenças',
  medicalTreatment: 'Tratamento médico',
  medicalTreatmentDetails: 'Qual tratamento',
  physicalLimitation: 'Limitação física',
  physicalLimitationDetails: 'Detalhes da limitação',
  allergies: 'Alergias',
  allergiesDetails: 'Quais alergias',
  cosmeticAllergy: 'Alergia a cosméticos',
  cosmeticAllergyDetails: 'Quais cosméticos',
  aestheticReaction: 'Reação a procedimento',
  aestheticReactionDetails: 'Qual reação',
  continuousMedications: 'Medicamentos contínuos',
  continuousMedicationsDetails: 'Quais medicamentos',
  anticoagulants: 'Anticoagulantes',
  roacutan: 'Roacutan',
  roacutanSince: 'Roacutan desde',
  corticosteroids: 'Corticoides',
  pregnant: 'Gestação',
  pregnantWeeks: 'Semanas de gestação',
  breastfeeding: 'Amamentando',
  iud: 'DIU',
  birthControl: 'Anticoncepcional',
  pacemaker: 'Marcapasso',
  metalImplants: 'Implantes metálicos',
  metalImplantsDetails: 'Onde',
  cancerHistory: 'Histórico de câncer',
  cancerHistoryDetails: 'Detalhes',
  epilepsy: 'Epilepsia',
  diabetes: 'Diabetes',
  diabetesDetails: 'Tipo / controle',
  hypertension: 'Hipertensão',
  smoking: 'Fumo',
  alcohol: 'Álcool',
  physicalActivity: 'Atividade física',
  physicalActivityPerWeek: 'Vezes por semana',
  waterIntake: 'Ingestão de água',
  skinType: 'Tipo de pele',
  acne: 'Acne',
  spots: 'Manchas',
  spotsDetails: 'Onde ficam as manchas',
  previousAesthetic: 'Procedimentos anteriores',
  previousAestheticProcedures: 'Quais procedimentos',
  goals: 'Objetivos',
  otherGoal: 'Outro objetivo',
  regions: 'Regiões',
  mainGoal: 'Objetivo principal',
  objective: 'Objetivo',
  name: 'Nome',
  howKnew: 'Como conheceu',
  address: 'Endereço',
};

const VALUE_LABELS: Record<string, string> = {
  yes: 'Sim',
  no: 'Não',
  unknown: 'Não sei',
  never: 'Nunca',
  socially: 'Socialmente',
  female: 'Feminino',
  male: 'Masculino',
  other: 'Outro',
  prefer_not: 'Prefiro não informar',
  low: 'Pouca',
  medium: 'Média',
  high: 'Alta',
  oily: 'Oleosa',
  dry: 'Seca',
  combination: 'Mista',
  sensitive: 'Sensível',
  suspect: 'Suspeita',
  rejuvenation: 'Rejuvenescimento',
  weight_loss: 'Emagrecimento',
  localized_fat: 'Gordura localizada',
  cellulite: 'Celulite',
  sagging: 'Flacidez',
  acne: 'Acne',
  spots: 'Manchas',
  hair_removal: 'Depilação',
  relaxation: 'Relaxamento',
  face: 'Rosto',
  abdomen: 'Abdômen',
  legs: 'Pernas',
  armpits: 'Axilas',
  groin: 'Virilha',
  back: 'Costas',
  full_body: 'Corpo todo',
  botox: 'Botox',
  filler: 'Preenchimento',
  laser: 'Laser',
  cleaning: 'Limpeza de pele',
  microneedling: 'Microagulhamento',
  peeling: 'Peeling',
};

export function AnamnesisScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    setError(null);
    try {
      setData(await getAnamnesis(user.id));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (editing && user) {
    return (
      <AnamnesisFlow
        user={user}
        initialForm={data}
        onComplete={async () => {
          setEditing(false);
          await load();
        }}
      />
    );
  }

  const sections = data
    ? [
        { title: 'Dados pessoais', value: data.personalData },
        { title: 'Saúde', value: data.healthData },
        { title: 'Estilo de vida & pele', value: data.lifestyleData },
        { title: 'Objetivos', value: data.objectivesData },
      ]
    : [];

  return (
    <View style={styles.container}>
      <ScreenHeader>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={brand.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Ficha de Anamnese</Text>
        {data ? (
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.back}>
            <Ionicons name="create-outline" size={20} color={brand.rose} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={load} style={styles.back}>
            <Ionicons name="refresh" size={20} color={brand.rose} />
          </TouchableOpacity>
        )}
      </ScreenHeader>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.rose} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={brand.rose} />
          }
        >
          <View style={styles.info}>
            <Ionicons name="heart" size={22} color={brand.rose} />
            <Text style={styles.infoText}>
              Suas respostas ajudam a clínica a cuidar de você com mais segurança.
            </Text>
          </View>
          {error ? (
            <View style={styles.center}>
              <Text style={styles.error}>{error}</Text>
              <TouchableOpacity onPress={load}>
                <Text style={styles.retry}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : !data ? (
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={50} color="#d1d5db" />
              <Text style={styles.empty}>Você ainda não possui uma ficha preenchida.</Text>
              <Text style={styles.hint}>
                No primeiro acesso, o app abre o questionário completo para você.
              </Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editBtnText}>Preencher agora</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <Ionicons name="create-outline" size={18} color={brand.white} />
                <Text style={styles.editBtnText}>Atualizar ficha</Text>
              </TouchableOpacity>
              <View style={styles.updated}>
                <Ionicons name="time-outline" size={16} color={brand.muted} />
                <Text style={styles.updatedText}>
                  Atualizada em {new Date(data.updatedAt).toLocaleDateString('pt-BR')}
                  {data.termsAccepted ? ' · Completa' : ' · Pendente'}
                </Text>
              </View>
              {sections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.card}>
                    {readableEntries(section.value).map(([key, value]) => (
                      <View key={key} style={styles.row}>
                        <Text style={styles.label}>{labelFor(key)}</Text>
                        <Text style={styles.value}>{formatValue(value)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function readableEntries(value: any): [string, any][] {
  if (!value || typeof value !== 'object') {
    return [['Informações', value || 'Não informado']];
  }
  return Object.entries(value).filter(([, v]) => {
    if (v == null || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
}

function labelFor(key: string) {
  return LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (l) => l.toUpperCase());
}

function formatValue(value: any): string {
  if (Array.isArray(value)) {
    return value.length
      ? value.map((v) => VALUE_LABELS[String(v)] || String(v)).join(', ')
      : 'Não informado';
  }
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (value && typeof value === 'object') {
    return (
      Object.entries(value)
        .map(([k, v]) => `${labelFor(k)}: ${formatValue(v)}`)
        .join(' · ') || 'Não informado'
    );
  }
  const raw = String(value ?? '');
  return VALUE_LABELS[raw] || raw || 'Não informado';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.background },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: brand.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: brand.ink },
  content: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 26,
  },
  info: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: brand.blush,
    borderRadius: 14,
    padding: 16,
  },
  infoText: { flex: 1, color: brand.roseDeep, lineHeight: 19 },
  updated: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginVertical: 17,
  },
  updatedText: { color: brand.muted, fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: brand.ink,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  card: {
    backgroundColor: brand.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: brand.border,
  },
  row: {
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: brand.border,
  },
  label: { color: brand.muted, fontSize: 12, marginBottom: 3 },
  value: { color: brand.ink, fontSize: 15, fontWeight: '600' },
  error: { color: '#b91c1c', textAlign: 'center' },
  retry: { color: brand.rose, fontWeight: '700', marginTop: 12 },
  empty: {
    color: brand.ink,
    fontSize: 17,
    textAlign: 'center',
    marginTop: 12,
  },
  hint: {
    color: brand.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  editBtn: {
    alignSelf: 'stretch',
    backgroundColor: brand.rose,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  editBtnText: {
    color: brand.white,
    fontWeight: '600',
    fontSize: 15,
  },
});
