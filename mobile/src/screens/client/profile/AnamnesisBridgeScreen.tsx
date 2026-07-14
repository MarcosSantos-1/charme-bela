import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ClientStackParamList } from '../../../navigation/ClientNavigator';
import { useAuth } from '../../../contexts/AuthContext';
import { saveMinimalAnamnesis } from '../../../lib/api';
import { getApiErrorMessage } from '../../../types/commercial';
import { ScreenHeader } from '../../../components/ScreenHeader';

type Props = NativeStackScreenProps<ClientStackParamList, 'AnamnesisBridge'>;

export function AnamnesisBridgeScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [birthDate, setBirthDate] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medications, setMedications] = useState('');
  const [objective, setObjective] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    if (!birthDate.trim()) {
      Alert.alert('Data necessária', 'Informe sua data de nascimento antes de continuar.');
      return;
    }
    setSaving(true);
    try {
      await saveMinimalAnamnesis(user.id, {
        personalData: { name: user.name, birthDate },
        healthData: { allergies: allergies || 'Não informado', medications: medications || 'Não informado' },
        lifestyleData: {},
        objectivesData: { objective: objective || 'Não informado' },
      });
      Alert.alert('Ficha salva', 'Agora você pode concluir seu primeiro agendamento.', [
        {
          text: 'Continuar',
          onPress: () => route.params?.serviceId
            ? navigation.replace('Booking', { serviceId: route.params.serviceId, appointmentId: route.params.appointmentId })
            : navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Não foi possível salvar', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity>
        <Text style={styles.title}>Ficha essencial</Text><View style={{ width: 42 }} />
      </ScreenHeader>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.info}><Ionicons name="shield-checkmark-outline" size={26} color="#2563eb" /><Text style={styles.infoText}>Precisamos destas informações antes do primeiro tratamento. Você poderá revisar a ficha completa depois.</Text></View>
        <Field label="Data de nascimento" value={birthDate} onChangeText={setBirthDate} placeholder="DD/MM/AAAA" />
        <Field label="Possui alergias?" value={allergies} onChangeText={setAllergies} placeholder="Se não possuir, escreva não" multiline />
        <Field label="Medicamentos em uso" value={medications} onChangeText={setMedications} placeholder="Liste ou escreva não" multiline />
        <Field label="Objetivo principal" value={objective} onChangeText={setObjective} placeholder="O que você busca com o tratamento?" multiline />
        <Text style={styles.consent}>Ao continuar, você confirma que as informações são verdadeiras e autoriza seu uso para segurança do atendimento.</Text>
        <TouchableOpacity disabled={saving} onPress={save} style={styles.button}>{saving ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Salvar e continuar</Text>}</TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput {...props} style={[styles.input, props.multiline && styles.multiline]} placeholderTextColor="#9ca3af" /></View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#f9fafb' }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 18, fontWeight: '800', color: '#111827' }, content: { padding: 22, paddingBottom: 44 }, info: { flexDirection: 'row', gap: 12, backgroundColor: '#dbeafe', borderRadius: 14, padding: 16, marginBottom: 22 }, infoText: { flex: 1, color: '#1e40af', lineHeight: 20 }, field: { marginBottom: 17 }, label: { color: '#374151', fontWeight: '700', marginBottom: 7 }, input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, minHeight: 50, color: '#111827' }, multiline: { minHeight: 82, paddingTop: 13, textAlignVertical: 'top' }, consent: { fontSize: 12, lineHeight: 18, color: '#6b7280', marginTop: 4 }, button: { backgroundColor: '#ec4899', borderRadius: 14, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 22 }, buttonText: { color: 'white', fontWeight: '800', fontSize: 16 } });
