import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import type { Dispatch } from 'react';
import { AnamnesisShell } from './components/AnamnesisShell';
import { WelcomeIntro } from './components/WelcomeIntro';
import { ChoiceCards } from './components/ChoiceCards';
import { MultiSelectCards } from './components/MultiSelectCards';
import { RevealInput } from './components/RevealInput';
import { SwitchRow } from './components/SwitchRow';
import { ConsentChecks } from './components/ConsentChecks';
import { formHeartOutlineSource } from '../../assets/brandAssets';
import {
  AnamnesisFormState,
  anamnesisReducer,
  createInitialState,
  fromBackendForm,
  GOAL_OPTIONS,
  PROCEDURE_OPTIONS,
  REGION_OPTIONS,
  toBackendPayload,
  HabitFrequency,
  SexValue,
  SkinType,
  WaterIntake,
  YesNo,
  YesNoUnknown,
  PregnancyStatus,
} from './types';
import { saveAnamnesis, updateUser } from '../../lib/api';
import { getApiErrorMessage } from '../../types/commercial';
import { brand } from '../../theme/brand';
import { phonePrefillFromUser } from '../../lib/userDisplay';
import { cpfDigits, isValidCpf, maskCpf } from '../../lib/cpf';
import { useAuth } from '../../contexts/AuthContext';

type StepId =
  | 'welcome'
  | 'personal'
  | 'sex'
  | 'health_disease'
  | 'health_treatment'
  | 'allergies'
  | 'cosmetics'
  | 'medications'
  | 'special_meds'
  | 'pregnancy'
  | 'contraindications'
  | 'habits'
  | 'movement'
  | 'skin'
  | 'aesthetic_history'
  | 'goals'
  | 'regions'
  | 'consent';

interface PrefillUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string | null;
}

interface AnamnesisFlowProps {
  user: PrefillUser;
  onComplete: () => void;
  /** Existing form for edit mode (skips welcome when present). */
  initialForm?: any | null;
}

function buildSteps(sex: SexValue | null): StepId[] {
  const base: StepId[] = [
    'welcome',
    'personal',
    'sex',
    'health_disease',
    'health_treatment',
    'allergies',
    'cosmetics',
    'medications',
    'special_meds',
  ];
  if (sex === 'female') base.push('pregnancy');
  base.push(
    'contraindications',
    'habits',
    'movement',
    'skin',
    'aesthetic_history',
    'goals',
    'regions',
    'consent',
  );
  return base;
}

function canContinue(step: StepId, state: AnamnesisFormState): boolean {
  switch (step) {
    case 'welcome':
      return true;
    case 'personal':
      return Boolean(
        state.fullName.trim() &&
          state.birthDate.trim().length >= 8 &&
          isValidCpf(state.cpf),
      );
    case 'sex':
      return state.sex != null;
    case 'health_disease':
      return (
        state.diagnosedDisease != null &&
        (state.diagnosedDisease === 'no' || state.diagnosedDiseaseDetails.trim().length > 0)
      );
    case 'health_treatment':
      return (
        state.medicalTreatment != null &&
        state.physicalLimitation != null &&
        (state.medicalTreatment === 'no' || state.medicalTreatmentDetails.trim().length > 0) &&
        (state.physicalLimitation === 'no' || state.physicalLimitationDetails.trim().length > 0)
      );
    case 'allergies':
      return (
        state.allergies != null &&
        (state.allergies === 'no' || state.allergiesDetails.trim().length > 0)
      );
    case 'cosmetics':
      return (
        state.cosmeticAllergy != null &&
        (state.cosmeticAllergy !== 'yes' || state.cosmeticAllergyDetails.trim().length > 0) &&
        state.aestheticReaction != null &&
        (state.aestheticReaction === 'no' || state.aestheticReactionDetails.trim().length > 0)
      );
    case 'medications':
      return (
        state.continuousMedications != null &&
        (state.continuousMedications === 'no' ||
          state.continuousMedicationsDetails.trim().length > 0)
      );
    case 'special_meds':
      return !state.roacutan || state.roacutanSince.trim().length > 0;
    case 'pregnancy':
      return state.pregnant != null;
    case 'contraindications':
      return (
        (!state.metalImplants || state.metalImplantsDetails.trim().length > 0) &&
        (!state.cancerHistory || state.cancerHistoryDetails.trim().length > 0) &&
        (!state.diabetes || state.diabetesDetails.trim().length > 0)
      );
    case 'habits':
      return state.smoking != null && state.alcohol != null;
    case 'movement':
      return state.waterIntake != null;
    case 'skin':
      return (
        state.skinType != null &&
        (!state.spots || state.spotsDetails.trim().length > 0)
      );
    case 'aesthetic_history':
      return (
        !state.previousAesthetic || state.previousAestheticProcedures.length > 0
      );
    case 'goals':
      return (
        state.goals.length > 0 &&
        (!state.goals.includes('other') || state.otherGoal.trim().length > 0)
      );
    case 'regions':
      return state.regions.length > 0;
    case 'consent':
      return state.consentTruth && state.consentUse && state.consentUpdate;
    default:
      return true;
  }
}

function maskBirthDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.replace(/(\d{0,2})/, '($1');
  if (digits.length <= 7) return digits.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function resolveResumeStepIndex(form: any | null | undefined, sex: SexValue | null): number {
  if (!form || form.termsAccepted) return form ? 1 : 0;
  const steps = buildSteps(sex ?? (form.personalData?.sex as SexValue | null) ?? null);
  const draftStep = form.personalData?.draftStepId as StepId | undefined;
  if (draftStep && steps.includes(draftStep)) {
    return steps.indexOf(draftStep);
  }
  const hydrated = fromBackendForm(form);
  for (let i = 0; i < steps.length; i++) {
    if (steps[i] === 'welcome') continue;
    if (!canContinue(steps[i], hydrated)) return i;
  }
  return Math.min(steps.length - 1, 1);
}

export function AnamnesisFlow({ user, onComplete, initialForm }: AnamnesisFlowProps) {
  const { setUserProfile } = useAuth();
  const isEditMode = Boolean(initialForm?.termsAccepted);
  const [state, dispatch] = useReducer(
    anamnesisReducer,
    undefined,
    () => {
      const prefill = {
        name: user.name,
        email: user.email,
        phone: phonePrefillFromUser(user) || user.phone,
        cpf: user.cpf ? maskCpf(user.cpf) : '',
      };
      return initialForm
        ? fromBackendForm(initialForm, prefill)
        : createInitialState(prefill);
    },
  );
  const [stepIndex, setStepIndex] = useState(() =>
    resolveResumeStepIndex(initialForm, initialForm?.personalData?.sex ?? null),
  );
  const [saving, setSaving] = useState(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipDraftRef = useRef(false);

  const steps = useMemo(() => buildSteps(state.sex), [state.sex]);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const patch = (payload: Partial<AnamnesisFormState>) =>
    dispatch({ type: 'PATCH', payload });

  const persistDraft = useCallback(
    async (stepId: StepId, formState: AnamnesisFormState) => {
      if (isEditMode || skipDraftRef.current) return;
      if (stepId === 'consent' && formState.consentTruth && formState.consentUse && formState.consentUpdate) {
        return;
      }
      try {
        const payload = toBackendPayload(formState);
        await saveAnamnesis(user.id, {
          ...payload,
          personalData: {
            ...payload.personalData,
            draftStepId: stepId,
          },
          termsAccepted: false,
          schemaVersion: 2,
        });
      } catch {
        // rascunho é best-effort — não bloqueia o fluxo
      }
    },
    [isEditMode, user.id],
  );

  // Persiste rascunho ao mudar de passo / dados (debounce), para retomar após fechar o app
  useEffect(() => {
    if (isEditMode) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      void persistDraft(step, state);
    }, 700);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [isEditMode, persistDraft, state, step]);

  const goNext = async () => {
    if (!canContinue(step, state)) return;

    if (step === 'consent') {
      setSaving(true);
      skipDraftRef.current = true;
      try {
        const payload = toBackendPayload(state);
        await saveAnamnesis(user.id, {
          ...payload,
          termsAccepted: true,
        });
        // Sync display name / phone on User so Home & Profile stay correct
        const fullName = state.fullName.trim();
        const phoneDigits = state.phone.replace(/\D/g, '');
        const document = cpfDigits(state.cpf);
        try {
          const updated = await updateUser(user.id, {
            ...(fullName ? { name: fullName } : {}),
            ...(phoneDigits.length >= 10 ? { phone: phoneDigits } : {}),
            ...(isValidCpf(document) ? { cpf: document } : {}),
          });
          await setUserProfile(updated);
        } catch {
          // anamnese já salva; sync de perfil é best-effort
        }
        onComplete();
      } catch (error) {
        skipDraftRef.current = false;
        Alert.alert('Não foi possível salvar', getApiErrorMessage(error));
      } finally {
        setSaving(false);
      }
      return;
    }

    const nextSteps = buildSteps(state.sex);
    const nextIndex = Math.min(stepIndex + 1, nextSteps.length - 1);
    setStepIndex(nextIndex);
    void persistDraft(nextSteps[nextIndex], state);
  };

  const goBack = () => {
    if (stepIndex <= 0) return;
    const prev = Math.max(0, stepIndex - 1);
    setStepIndex(prev);
    void persistDraft(steps[prev], state);
  };

  const meta = STEP_META[step];
  const disabled = !canContinue(step, state);

  const isWelcome = step === 'welcome';

  return (
    <AnamnesisShell
      badge={meta.badge}
      emoji={isWelcome ? undefined : meta.emoji}
      badgeIcon={isWelcome ? 'clipboard-outline' : undefined}
      title={meta.title}
      subtitle={meta.subtitle}
      titleAccessory={isWelcome ? formHeartOutlineSource : undefined}
      stepIndex={stepIndex}
      stepTotal={steps.length}
      onBack={stepIndex > 0 ? goBack : undefined}
      hideBack={stepIndex === 0}
      onNext={goNext}
      nextLabel={step === 'consent' ? 'Concluir minha ficha' : isWelcome ? 'Vamos começar' : 'Continuar'}
      nextDisabled={disabled}
      nextLoading={saving}
      scrollable={SCROLLABLE_STEPS.has(step)}
      variant={isWelcome ? 'welcome' : 'default'}
    >
      {renderStep(step, state, patch, dispatch)}
    </AnamnesisShell>
  );
}

const SCROLLABLE_STEPS = new Set<StepId>([
  'personal',
  'health_treatment',
  'cosmetics',
  'special_meds',
  'pregnancy',
  'contraindications',
  'movement',
  'skin',
  'aesthetic_history',
  'goals',
  'regions',
  'consent',
]);

const STEP_META: Record<
  StepId,
  { badge: string; emoji: string; title: string; subtitle: string }
> = {
  welcome: {
    badge: 'Ficha de anamnese',
    emoji: '❤️',
    title: 'Antes de tudo, queremos te conhecer melhor!',
    subtitle:
      'Responder algumas perguntas rápidas nos ajuda a entender suas necessidades e indicar os tratamentos mais seguros e eficazes para você.',
  },
  personal: {
    badge: 'Sobre você',
    emoji: '✨',
    title: 'Confirma seus dados pra gente?',
    subtitle: 'Assim sua ficha fica completa e o atendimento flui sem surpresas.',
  },
  sex: {
    badge: 'Sobre você',
    emoji: '🤍',
    title: 'Como você se identifica?',
    subtitle: 'Isso só serve para personalizar perguntas de saúde — você escolhe o que quiser.',
  },
  health_disease: {
    badge: 'Saúde',
    emoji: '🩺',
    title: 'Você tem alguma doença já diagnosticada?',
    subtitle: 'Saber disso nos ajuda a evitar procedimentos que não combinam com o seu histórico.',
  },
  health_treatment: {
    badge: 'Saúde',
    emoji: '💊',
    title: 'E o seu dia a dia de cuidados?',
    subtitle: 'Tratamentos ou limitações mudam o ritmo e o tipo de sessão ideal pra você.',
  },
  allergies: {
    badge: 'Alergias',
    emoji: '🌸',
    title: 'Você tem alguma alergia?',
    subtitle: 'Queremos deixar o ambiente e os produtos seguros pra sua pele.',
  },
  cosmetics: {
    badge: 'Alergias',
    emoji: '🧴',
    title: 'E cosméticos ou procedimentos?',
    subtitle: 'Reações anteriores são um ótimo mapa do que evitar daqui pra frente.',
  },
  medications: {
    badge: 'Medicamentos',
    emoji: '💊',
    title: 'Você usa algum medicamento contínuo?',
    subtitle: 'Alguns remédios influenciam cicatrização, sensibilidade e resultados.',
  },
  special_meds: {
    badge: 'Medicamentos',
    emoji: '⚠️',
    title: 'Tem algum destes em uso?',
    subtitle:
      'Isotretinoína (Roacutan), anticoagulantes e corticoides mudam como a pele reage — conta pra gente com carinho.',
  },
  pregnancy: {
    badge: 'Ciclo & gestação',
    emoji: '🤰',
    title: 'Um momento especial na sua saúde?',
    subtitle: 'Gestação, amamentação e contraceptivos guiam o que é seguro oferecer agora.',
  },
  contraindications: {
    badge: 'Segurança',
    emoji: '🛡️',
    title: 'Alguma condição de atenção?',
    subtitle: 'São checagens rápidas para proteger você em aparelhos e protocolos específicos.',
  },
  habits: {
    badge: 'Hábitos',
    emoji: '☕',
    title: 'Como anda o seu ritmo?',
    subtitle: 'Fumo e álcool influenciam cicatrização e qualidade da pele — sem julgamento, só cuidado.',
  },
  movement: {
    badge: 'Hábitos',
    emoji: '🏃',
    title: 'Movimento e hidratação',
    subtitle: 'Corpo ativo e bem hidratado responde melhor aos tratamentos.',
  },
  skin: {
    badge: 'Sua pele',
    emoji: '🪞',
    title: 'Como você sente a sua pele?',
    subtitle: 'Não precisa ser técnica — a sua percepção já nos ajuda a escolher o caminho.',
  },
  aesthetic_history: {
    badge: 'Histórico',
    emoji: '✨',
    title: 'Já fez algum procedimento estético?',
    subtitle: 'Saber o que você já experimentou evita repetir o que não fez sentido.',
  },
  goals: {
    badge: 'Objetivos',
    emoji: '🎯',
    title: 'O que você mais quer sentir no resultado?',
    subtitle: 'Pode marcar mais de um — vamos montar um plano alinhado ao seu momento.',
  },
  regions: {
    badge: 'Objetivos',
    emoji: '💫',
    title: 'Quais regiões te preocupam mais?',
    subtitle: 'Assim priorizamos o que importa pra você desde a primeira sessão.',
  },
  consent: {
    badge: 'Quase lá',
    emoji: '📝',
    title: 'Último passinho: seu consentimento',
    subtitle: 'Suas informações ficam protegidas e servem só para cuidar bem do seu atendimento.',
  },
};

function QuestionLabel({ children }: { children: string }) {
  return <Text style={styles.question}>{children}</Text>;
}

function renderStep(
  step: StepId,
  state: AnamnesisFormState,
  patch: (p: Partial<AnamnesisFormState>) => void,
  dispatch: Dispatch<import('./types').AnamnesisAction>,
) {
  switch (step) {
    case 'welcome':
      return <WelcomeIntro />;

    case 'personal':
      return (
        <>
          <RevealInput
            label="Nome completo"
            value={state.fullName}
            onChangeText={(fullName) => patch({ fullName })}
            placeholder="Como você gosta de ser chamada"
          />
          <RevealInput
            label="Data de nascimento"
            value={state.birthDate}
            onChangeText={(v) => patch({ birthDate: maskBirthDate(v) })}
            placeholder="DD/MM/AAAA"
            keyboardType="numeric"
          />
          <RevealInput
            label="Telefone"
            value={state.phone}
            onChangeText={(v) => patch({ phone: maskPhone(v) })}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
          />
          <RevealInput
            label="CPF"
            value={state.cpf}
            onChangeText={(v) => patch({ cpf: maskCpf(v) })}
            placeholder="000.000.000-00"
            keyboardType="numeric"
          />
          {cpfDigits(state.cpf).length === 11 && !isValidCpf(state.cpf) ? (
            <Text style={{ color: '#b91c1c', fontSize: 13, fontWeight: '600', marginTop: -4 }}>
              CPF inválido. Confira os dígitos.
            </Text>
          ) : null}
        </>
      );

    case 'sex':
      return (
        <ChoiceCards<SexValue>
          value={state.sex}
          onChange={(sex) => patch({ sex })}
          options={[
            { value: 'female', label: 'Feminino', emoji: '♀️' },
            { value: 'male', label: 'Masculino', emoji: '♂️' },
            { value: 'other', label: 'Outro', emoji: '🌈' },
            { value: 'prefer_not', label: 'Prefiro não informar', emoji: '🤍' },
          ]}
        />
      );

    case 'health_disease':
      return (
        <>
          <ChoiceCards<YesNo>
            value={state.diagnosedDisease}
            onChange={(diagnosedDisease) =>
              patch({
                diagnosedDisease,
                diagnosedDiseaseDetails:
                  diagnosedDisease === 'no' ? '' : state.diagnosedDiseaseDetails,
              })
            }
            options={[
              { value: 'no', label: 'Não', emoji: '😊' },
              { value: 'yes', label: 'Sim', emoji: '🩺' },
            ]}
          />
          {state.diagnosedDisease === 'yes' ? (
            <RevealInput
              label="Quais doenças?"
              value={state.diagnosedDiseaseDetails}
              onChangeText={(diagnosedDiseaseDetails) => patch({ diagnosedDiseaseDetails })}
              placeholder="Pode listar com suas palavras"
              multiline
            />
          ) : null}
        </>
      );

    case 'health_treatment':
      return (
        <>
          <QuestionLabel>Está em algum tratamento médico agora?</QuestionLabel>
          <ChoiceCards<YesNo>
            value={state.medicalTreatment}
            onChange={(medicalTreatment) =>
              patch({
                medicalTreatment,
                medicalTreatmentDetails:
                  medicalTreatment === 'no' ? '' : state.medicalTreatmentDetails,
              })
            }
            options={[
              { value: 'no', label: 'Não' },
              { value: 'yes', label: 'Sim' },
            ]}
          />
          {state.medicalTreatment === 'yes' ? (
            <RevealInput
              value={state.medicalTreatmentDetails}
              onChangeText={(medicalTreatmentDetails) => patch({ medicalTreatmentDetails })}
              placeholder="Qual tratamento?"
              multiline
            />
          ) : null}
          <QuestionLabel>Tem alguma limitação física?</QuestionLabel>
          <ChoiceCards<YesNo>
            value={state.physicalLimitation}
            onChange={(physicalLimitation) =>
              patch({
                physicalLimitation,
                physicalLimitationDetails:
                  physicalLimitation === 'no' ? '' : state.physicalLimitationDetails,
              })
            }
            options={[
              { value: 'no', label: 'Não' },
              { value: 'yes', label: 'Sim' },
            ]}
          />
          {state.physicalLimitation === 'yes' ? (
            <RevealInput
              value={state.physicalLimitationDetails}
              onChangeText={(physicalLimitationDetails) =>
                patch({ physicalLimitationDetails })
              }
              placeholder="Conta um pouco pra gente"
              multiline
            />
          ) : null}
        </>
      );

    case 'allergies':
      return (
        <>
          <ChoiceCards<YesNo>
            value={state.allergies}
            onChange={(allergies) =>
              patch({
                allergies,
                allergiesDetails: allergies === 'no' ? '' : state.allergiesDetails,
              })
            }
            options={[
              { value: 'no', label: 'Não tenho', emoji: '🌿' },
              { value: 'yes', label: 'Sim, tenho', emoji: '⚠️' },
            ]}
          />
          {state.allergies === 'yes' ? (
            <RevealInput
              label="Quais alergias?"
              value={state.allergiesDetails}
              onChangeText={(allergiesDetails) => patch({ allergiesDetails })}
              placeholder="Medicamentos, alimentos, metais…"
              multiline
            />
          ) : null}
        </>
      );

    case 'cosmetics':
      return (
        <>
          <QuestionLabel>Tem alergia a cosméticos?</QuestionLabel>
          <ChoiceCards<YesNoUnknown>
            value={state.cosmeticAllergy}
            onChange={(cosmeticAllergy) =>
              patch({
                cosmeticAllergy,
                cosmeticAllergyDetails:
                  cosmeticAllergy === 'yes' ? state.cosmeticAllergyDetails : '',
              })
            }
            options={[
              { value: 'no', label: 'Não' },
              { value: 'yes', label: 'Sim' },
              { value: 'unknown', label: 'Não sei' },
            ]}
          />
          {state.cosmeticAllergy === 'yes' ? (
            <RevealInput
              label="Quais cosméticos?"
              value={state.cosmeticAllergyDetails}
              onChangeText={(cosmeticAllergyDetails) => patch({ cosmeticAllergyDetails })}
              placeholder="Ex.: perfume, esmalte, creme com ácido…"
              multiline
            />
          ) : null}
          <QuestionLabel>Já teve reação após procedimento estético?</QuestionLabel>
          <ChoiceCards<YesNo>
            value={state.aestheticReaction}
            onChange={(aestheticReaction) =>
              patch({
                aestheticReaction,
                aestheticReactionDetails:
                  aestheticReaction === 'no' ? '' : state.aestheticReactionDetails,
              })
            }
            options={[
              { value: 'no', label: 'Nunca' },
              { value: 'yes', label: 'Sim' },
            ]}
          />
          {state.aestheticReaction === 'yes' ? (
            <RevealInput
              value={state.aestheticReactionDetails}
              onChangeText={(aestheticReactionDetails) =>
                patch({ aestheticReactionDetails })
              }
              placeholder="O que aconteceu?"
              multiline
            />
          ) : null}
        </>
      );

    case 'medications':
      return (
        <>
          <ChoiceCards<YesNo>
            value={state.continuousMedications}
            onChange={(continuousMedications) =>
              patch({
                continuousMedications,
                continuousMedicationsDetails:
                  continuousMedications === 'no'
                    ? ''
                    : state.continuousMedicationsDetails,
              })
            }
            options={[
              { value: 'no', label: 'Não uso', emoji: '💚' },
              { value: 'yes', label: 'Sim, uso', emoji: '💊' },
            ]}
          />
          {state.continuousMedications === 'yes' ? (
            <RevealInput
              label="Quais medicamentos?"
              value={state.continuousMedicationsDetails}
              onChangeText={(continuousMedicationsDetails) =>
                patch({ continuousMedicationsDetails })
              }
              placeholder="Liste os principais"
              multiline
            />
          ) : null}
        </>
      );

    case 'special_meds':
      return (
        <>
          <SwitchRow
            label="Anticoagulantes"
            description="Ex.: AAS, varfarina, rivaroxabana…"
            value={state.anticoagulants}
            onChange={(anticoagulants) => patch({ anticoagulants })}
          />
          <SwitchRow
            label="Roacutan (isotretinoína)"
            description="Muito importante para laser e peelings"
            value={state.roacutan}
            onChange={(roacutan) =>
              patch({ roacutan, roacutanSince: roacutan ? state.roacutanSince : '' })
            }
          />
          {state.roacutan ? (
            <RevealInput
              label="Há quanto tempo?"
              value={state.roacutanSince}
              onChangeText={(roacutanSince) => patch({ roacutanSince })}
              placeholder="Ex.: 3 meses, desde jan/2026…"
            />
          ) : null}
          <SwitchRow
            label="Corticoides"
            value={state.corticosteroids}
            onChange={(corticosteroids) => patch({ corticosteroids })}
          />
        </>
      );

    case 'pregnancy':
      return (
        <>
          <QuestionLabel>Está grávida?</QuestionLabel>
          <ChoiceCards<PregnancyStatus>
            value={state.pregnant}
            onChange={(pregnant) =>
              patch({
                pregnant,
                pregnantWeeks: pregnant === 'yes' ? state.pregnantWeeks : '',
              })
            }
            options={[
              { value: 'no', label: 'Não', emoji: '🤍' },
              { value: 'yes', label: 'Sim', emoji: '🤰' },
              { value: 'suspect', label: 'Suspeita', emoji: '💭' },
            ]}
          />
          {state.pregnant === 'yes' ? (
            <RevealInput
              label="Quantas semanas?"
              value={state.pregnantWeeks}
              onChangeText={(pregnantWeeks) =>
                patch({ pregnantWeeks: pregnantWeeks.replace(/\D/g, '').slice(0, 2) })
              }
              placeholder="Ex.: 12"
              keyboardType="numeric"
            />
          ) : null}
          <SwitchRow
            label="Está amamentando"
            value={state.breastfeeding}
            onChange={(breastfeeding) => patch({ breastfeeding })}
          />
          <SwitchRow
            label="Utiliza DIU"
            value={state.iud}
            onChange={(iud) => patch({ iud })}
          />
          <SwitchRow
            label="Faz uso de anticoncepcional"
            value={state.birthControl}
            onChange={(birthControl) => patch({ birthControl })}
          />
        </>
      );

    case 'contraindications':
      return (
        <>
          <SwitchRow
            label="Marcapasso"
            value={state.pacemaker}
            onChange={(pacemaker) => patch({ pacemaker })}
          />
          <SwitchRow
            label="Próteses ou implantes metálicos"
            value={state.metalImplants}
            onChange={(metalImplants) =>
              patch({
                metalImplants,
                metalImplantsDetails: metalImplants ? state.metalImplantsDetails : '',
              })
            }
          />
          {state.metalImplants ? (
            <RevealInput
              value={state.metalImplantsDetails}
              onChangeText={(metalImplantsDetails) => patch({ metalImplantsDetails })}
              placeholder="Onde?"
            />
          ) : null}
          <SwitchRow
            label="Câncer ou histórico recente"
            value={state.cancerHistory}
            onChange={(cancerHistory) =>
              patch({
                cancerHistory,
                cancerHistoryDetails: cancerHistory ? state.cancerHistoryDetails : '',
              })
            }
          />
          {state.cancerHistory ? (
            <RevealInput
              value={state.cancerHistoryDetails}
              onChangeText={(cancerHistoryDetails) => patch({ cancerHistoryDetails })}
              placeholder="Conta um pouco (se quiser)"
              multiline
            />
          ) : null}
          <SwitchRow
            label="Epilepsia"
            value={state.epilepsy}
            onChange={(epilepsy) => patch({ epilepsy })}
          />
          <SwitchRow
            label="Diabetes"
            value={state.diabetes}
            onChange={(diabetes) =>
              patch({
                diabetes,
                diabetesDetails: diabetes ? state.diabetesDetails : '',
              })
            }
          />
          {state.diabetes ? (
            <RevealInput
              value={state.diabetesDetails}
              onChangeText={(diabetesDetails) => patch({ diabetesDetails })}
              placeholder="Tipo / controle"
            />
          ) : null}
          <SwitchRow
            label="Hipertensão"
            value={state.hypertension}
            onChange={(hypertension) => patch({ hypertension })}
          />
        </>
      );

    case 'habits':
      return (
        <>
          <QuestionLabel>Você fuma?</QuestionLabel>
          <ChoiceCards<HabitFrequency>
            value={state.smoking}
            onChange={(smoking) => patch({ smoking })}
            options={[
              { value: 'never', label: 'Nunca', emoji: '🌱' },
              { value: 'socially', label: 'Socialmente', emoji: '🙂' },
              { value: 'yes', label: 'Sim', emoji: '🚬' },
            ]}
          />
          <QuestionLabel>Consome bebida alcoólica?</QuestionLabel>
          <ChoiceCards<HabitFrequency>
            value={state.alcohol}
            onChange={(alcohol) => patch({ alcohol })}
            options={[
              { value: 'never', label: 'Nunca', emoji: '💧' },
              { value: 'socially', label: 'Socialmente', emoji: '🥂' },
              { value: 'yes', label: 'Com frequência', emoji: '🍷' },
            ]}
          />
        </>
      );

    case 'movement':
      return (
        <>
          <SwitchRow
            label="Pratico atividade física"
            value={state.physicalActivity}
            onChange={(physicalActivity) => patch({ physicalActivity })}
          />
          {state.physicalActivity ? (
            <View style={styles.freqWrap}>
              <Text style={styles.freqLabel}>
                Quantas vezes por semana? · {state.physicalActivityPerWeek}x
              </Text>
              <View style={styles.freqRow}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                  const selected = state.physicalActivityPerWeek === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => patch({ physicalActivityPerWeek: n })}
                      style={[styles.freqChip, selected && styles.freqChipOn]}
                    >
                      <Text style={[styles.freqChipText, selected && styles.freqChipTextOn]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
          <QuestionLabel>Quanto de água você costuma beber?</QuestionLabel>
          <ChoiceCards<WaterIntake>
            value={state.waterIntake}
            onChange={(waterIntake) => patch({ waterIntake })}
            options={[
              { value: 'low', label: 'Pouca', emoji: '💧', description: 'Menos de 1L' },
              { value: 'medium', label: 'Média', emoji: '💦', description: '1–2 litros' },
              { value: 'high', label: 'Bastante', emoji: '🌊', description: 'Mais de 2L' },
            ]}
          />
        </>
      );

    case 'skin':
      return (
        <>
          <ChoiceCards<SkinType>
            value={state.skinType}
            onChange={(skinType) => patch({ skinType })}
            options={[
              { value: 'oily', label: 'Oleosa', emoji: '✨' },
              { value: 'dry', label: 'Seca', emoji: '🏜️' },
              { value: 'combination', label: 'Mista', emoji: '🌤️' },
              { value: 'sensitive', label: 'Sensível', emoji: '💗' },
              { value: 'unknown', label: 'Não sei dizer', emoji: '🤔' },
            ]}
          />
          <SwitchRow
            label="Tenho acne"
            value={state.acne}
            onChange={(acne) => patch({ acne })}
          />
          <SwitchRow
            label="Tenho manchas"
            value={state.spots}
            onChange={(spots) =>
              patch({ spots, spotsDetails: spots ? state.spotsDetails : '' })
            }
          />
          {state.spots ? (
            <RevealInput
              value={state.spotsDetails}
              onChangeText={(spotsDetails) => patch({ spotsDetails })}
              placeholder="Onde ficam as manchas?"
            />
          ) : null}
        </>
      );

    case 'aesthetic_history':
      return (
        <>
          <SwitchRow
            label="Já realizei procedimentos estéticos"
            value={state.previousAesthetic}
            onChange={(previousAesthetic) =>
              patch({
                previousAesthetic,
                previousAestheticProcedures: previousAesthetic
                  ? state.previousAestheticProcedures
                  : [],
              })
            }
          />
          {state.previousAesthetic ? (
            <MultiSelectCards
              options={[...PROCEDURE_OPTIONS]}
              values={state.previousAestheticProcedures}
              onToggle={(value) =>
                dispatch({
                  type: 'TOGGLE_ARRAY',
                  field: 'previousAestheticProcedures',
                  value,
                })
              }
            />
          ) : null}
        </>
      );

    case 'goals':
      return (
        <>
          <MultiSelectCards
            options={[...GOAL_OPTIONS]}
            values={state.goals}
            onToggle={(value) =>
              dispatch({ type: 'TOGGLE_ARRAY', field: 'goals', value })
            }
          />
          {state.goals.includes('other') ? (
            <RevealInput
              label="Conta qual outro objetivo"
              value={state.otherGoal}
              onChangeText={(otherGoal) => patch({ otherGoal })}
              placeholder="O que você sonha melhorar?"
              multiline
            />
          ) : null}
        </>
      );

    case 'regions':
      return (
        <MultiSelectCards
          options={[...REGION_OPTIONS]}
          values={state.regions}
          onToggle={(value) =>
            dispatch({ type: 'TOGGLE_ARRAY', field: 'regions', value })
          }
        />
      );

    case 'consent':
      return (
        <ConsentChecks
          items={[
            {
              key: 'truth',
              label: 'Confirmo que as informações que passei são verdadeiras.',
              value: state.consentTruth,
              onChange: (consentTruth) => patch({ consentTruth }),
            },
            {
              key: 'use',
              label:
                'Autorizo a clínica a usar estas informações para avaliação e segurança do atendimento.',
              value: state.consentUse,
              onChange: (consentUse) => patch({ consentUse }),
            },
            {
              key: 'update',
              label:
                'Estou ciente de que devo avisar se algo mudar no meu estado de saúde.',
              value: state.consentUpdate,
              onChange: (consentUpdate) => patch({ consentUpdate }),
            },
          ]}
        />
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  question: {
    fontSize: 15,
    fontWeight: '600',
    color: brand.ink,
    marginTop: 4,
  },
  freqWrap: { gap: 10 },
  freqLabel: { fontSize: 14, fontWeight: '500', color: brand.ink },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  freqChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: brand.border,
  },
  freqChipOn: {
    backgroundColor: brand.blush,
    borderColor: brand.rose,
  },
  freqChipText: {
    fontWeight: '600',
    color: brand.ink,
  },
  freqChipTextOn: {
    color: brand.roseDeep,
  },
});
