'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, PartyPopper } from 'lucide-react'
import {
  CardSelect,
  CheckList,
  LabeledSlider,
  MultiSelect,
  Question,
  RadioGroup,
  Segmented,
  SwitchRow,
  TextField,
} from './fields'
import { SignaturePad } from './signature-pad'

type Form = {
  // Step 1
  nome: string
  nascimento: string
  sexo: string
  telefone: string
  email: string
  // Step 2
  doenca: string
  doencaQuais: string
  tratamento: string
  tratamentoQual: string
  limitacao: string
  limitacaoQual: string
  // Step 3
  alergia: string
  alergiaQuais: string
  alergiaCosmeticos: string
  reacaoProc: string
  reacaoQual: string
  // Step 4
  medContinuo: string
  medQuais: string
  anticoagulantes: boolean
  roacutan: boolean
  roacutanTempo: string
  corticoides: boolean
  // Step 5
  gravida: string
  semanas: string
  amamentando: boolean
  diu: boolean
  anticoncepcional: boolean
  // Step 6
  fuma: string
  alcool: string
  atividade: boolean
  atividadeFreq: number
  agua: number
  // Step 7
  tipoPele: string
  acne: boolean
  manchas: boolean
  manchasOnde: string
  jaFezProc: boolean
  procedimentos: string[]
  // Step 8
  objetivos: string[]
  objetivoOutro: string
  regioes: string[]
  // Step 9
  marcapasso: boolean
  proteses: boolean
  protesesOnde: string
  cancer: boolean
  cancerDetalhe: string
  epilepsia: boolean
  diabetes: boolean
  diabetesTipo: string
  hipertensao: boolean
  // Step 10
  consent1: boolean
  consent2: boolean
  consent3: boolean
  assinatura: boolean
}

const initial: Form = {
  nome: '',
  nascimento: '',
  sexo: '',
  telefone: '',
  email: '',
  doenca: '',
  doencaQuais: '',
  tratamento: '',
  tratamentoQual: '',
  limitacao: '',
  limitacaoQual: '',
  alergia: '',
  alergiaQuais: '',
  alergiaCosmeticos: '',
  reacaoProc: '',
  reacaoQual: '',
  medContinuo: '',
  medQuais: '',
  anticoagulantes: false,
  roacutan: false,
  roacutanTempo: '',
  corticoides: false,
  gravida: '',
  semanas: '',
  amamentando: false,
  diu: false,
  anticoncepcional: false,
  fuma: '',
  alcool: '',
  atividade: false,
  atividadeFreq: 3,
  agua: 1,
  tipoPele: '',
  acne: false,
  manchas: false,
  manchasOnde: '',
  jaFezProc: false,
  procedimentos: [],
  objetivos: [],
  objetivoOutro: '',
  regioes: [],
  marcapasso: false,
  proteses: false,
  protesesOnde: '',
  cancer: false,
  cancerDetalhe: '',
  epilepsia: false,
  diabetes: false,
  diabetesTipo: '',
  hipertensao: false,
  consent1: false,
  consent2: false,
  consent3: false,
  assinatura: false,
}

const STEP_TITLES = [
  'Dados pessoais',
  'Saúde geral',
  'Alergias',
  'Medicamentos',
  'Gravidez',
  'Hábitos',
  'Pele',
  'Objetivo',
  'Contraindicações',
  'Consentimento',
]

export function AnamneseFlow({ onFinish }: { onFinish: () => void }) {
  const [form, setForm] = useState<Form>(initial)
  const [stepIdx, setStepIdx] = useState(0)
  const [done, setDone] = useState(false)

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const toggle = (key: 'procedimentos' | 'objetivos' | 'regioes', v: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(v)
        ? f[key].filter((x) => x !== v)
        : [...f[key], v],
    }))

  // Steps 5 (gravidez) só aparece para sexo Feminino
  const activeSteps = useMemo(() => {
    const all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    return form.sexo === 'Feminino' ? all : all.filter((s) => s !== 4)
  }, [form.sexo])

  const currentStep = activeSteps[stepIdx]
  const total = activeSteps.length
  const progress = ((stepIdx + 1) / total) * 100

  const next = () => {
    if (stepIdx < total - 1) setStepIdx((i) => i + 1)
    else setDone(true)
  }
  const back = () => setStepIdx((i) => Math.max(0, i - 1))

  const consentOk =
    form.consent1 && form.consent2 && form.consent3 && form.assinatura

  if (done) {
    return (
      <section className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-blush via-background to-champagne px-8 text-center">
        <div
          aria-hidden
          className="absolute -top-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-rose/20 blur-3xl"
        />
        <div className="relative z-10 flex flex-col items-center">
          <span className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose text-white shadow-lg shadow-rose/40">
            <PartyPopper className="h-9 w-9" />
          </span>
          <h1 className="text-balance font-serif text-3xl font-semibold text-ink">
            Ficha concluída!
          </h1>
          <p className="mt-3 max-w-[18rem] text-pretty text-[15px] leading-relaxed text-muted-foreground">
            Obrigada, {form.nome.split(' ')[0] || 'cliente'}. Sua anamnese foi
            registrada e a equipe já pode preparar seu atendimento.
          </p>
          <button
            type="button"
            onClick={onFinish}
            className="mt-8 w-full rounded-full bg-rose py-4 text-base font-medium text-primary-foreground shadow-lg shadow-rose/30 transition-transform active:scale-[0.98]"
          >
            Ir para o app
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-background to-champagne/40">
      {/* Cabeçalho + progresso */}
      <div className="relative z-10 px-6 pb-4 pt-14">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={stepIdx === 0 ? undefined : back}
            disabled={stepIdx === 0}
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/70 text-ink shadow-sm backdrop-blur transition-transform active:scale-95 disabled:opacity-30"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-[0.2em] text-rose-deep/70">
                Passo {stepIdx + 1} de {total}
              </span>
              <span className="text-muted-foreground">
                {STEP_TITLES[currentStep]}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-rose transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo rolável */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 pb-4">
        {currentStep === 0 && (
          <StepShell title="Confirme seus dados">
            <TextField
              label="Nome completo"
              placeholder="Seu nome"
              value={form.nome}
              onChange={(v) => set('nome', v)}
            />
            <TextField
              label="Data de nascimento"
              type="date"
              value={form.nascimento}
              onChange={(v) => set('nascimento', v)}
            />
            <Question label="Sexo">
              <Segmented
                options={['Feminino', 'Masculino', 'Outro', 'Prefiro não informar']}
                value={form.sexo}
                onChange={(v) => set('sexo', v)}
              />
            </Question>
            <TextField
              label="Telefone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={form.telefone}
              onChange={(v) => set('telefone', v)}
            />
            <TextField
              label="Email"
              type="email"
              placeholder="voce@email.com"
              value={form.email}
              onChange={(v) => set('email', v)}
            />
          </StepShell>
        )}

        {currentStep === 1 && (
          <StepShell title="Conte-nos um pouco sobre sua saúde.">
            <Question label="Você possui alguma doença diagnosticada?">
              <RadioGroup
                options={['Não', 'Sim']}
                value={form.doenca}
                onChange={(v) => set('doenca', v)}
              />
              {form.doenca === 'Sim' && (
                <TextField
                  placeholder="Quais doenças?"
                  value={form.doencaQuais}
                  onChange={(v) => set('doencaQuais', v)}
                />
              )}
            </Question>
            <Question label="Está realizando algum tratamento médico atualmente?">
              <RadioGroup
                options={['Não', 'Sim']}
                value={form.tratamento}
                onChange={(v) => set('tratamento', v)}
              />
              {form.tratamento === 'Sim' && (
                <TextField
                  placeholder="Qual tratamento?"
                  value={form.tratamentoQual}
                  onChange={(v) => set('tratamentoQual', v)}
                />
              )}
            </Question>
            <Question label="Possui alguma limitação física?">
              <RadioGroup
                options={['Não', 'Sim']}
                value={form.limitacao}
                onChange={(v) => set('limitacao', v)}
              />
              {form.limitacao === 'Sim' && (
                <TextField
                  placeholder="Qual limitação?"
                  value={form.limitacaoQual}
                  onChange={(v) => set('limitacaoQual', v)}
                />
              )}
            </Question>
          </StepShell>
        )}

        {currentStep === 2 && (
          <StepShell title="Alergias">
            <Question label="Possui alguma alergia?">
              <RadioGroup
                options={['Não', 'Sim']}
                value={form.alergia}
                onChange={(v) => set('alergia', v)}
              />
              {form.alergia === 'Sim' && (
                <TextField
                  placeholder="Quais?"
                  value={form.alergiaQuais}
                  onChange={(v) => set('alergiaQuais', v)}
                />
              )}
            </Question>
            <Question label="Tem alergia a cosméticos?">
              <RadioGroup
                options={['Não', 'Sim', 'Não sei']}
                value={form.alergiaCosmeticos}
                onChange={(v) => set('alergiaCosmeticos', v)}
              />
            </Question>
            <Question label="Já apresentou reação após algum procedimento estético?">
              <RadioGroup
                options={['Nunca', 'Sim']}
                value={form.reacaoProc}
                onChange={(v) => set('reacaoProc', v)}
              />
              {form.reacaoProc === 'Sim' && (
                <TextField
                  placeholder="Qual reação?"
                  value={form.reacaoQual}
                  onChange={(v) => set('reacaoQual', v)}
                />
              )}
            </Question>
          </StepShell>
        )}

        {currentStep === 3 && (
          <StepShell title="Medicamentos">
            <Question label="Faz uso contínuo de medicamentos?">
              <RadioGroup
                options={['Não', 'Sim']}
                value={form.medContinuo}
                onChange={(v) => set('medContinuo', v)}
              />
              {form.medContinuo === 'Sim' && (
                <TextField
                  placeholder="Quais?"
                  value={form.medQuais}
                  onChange={(v) => set('medQuais', v)}
                />
              )}
            </Question>
            <SwitchRow
              label="Utiliza anticoagulantes?"
              checked={form.anticoagulantes}
              onChange={(v) => set('anticoagulantes', v)}
            />
            <div className="flex flex-col gap-2.5">
              <SwitchRow
                label="Está utilizando Roacutan (Isotretinoína)?"
                checked={form.roacutan}
                onChange={(v) => set('roacutan', v)}
              />
              {form.roacutan && (
                <TextField
                  label="Há quanto tempo?"
                  type="date"
                  value={form.roacutanTempo}
                  onChange={(v) => set('roacutanTempo', v)}
                />
              )}
            </div>
            <SwitchRow
              label="Usa corticoides?"
              checked={form.corticoides}
              onChange={(v) => set('corticoides', v)}
            />
          </StepShell>
        )}

        {currentStep === 4 && (
          <StepShell title="Gravidez">
            <Question label="Está grávida?">
              <RadioGroup
                options={['Não', 'Sim', 'Suspeita']}
                value={form.gravida}
                onChange={(v) => set('gravida', v)}
              />
              {form.gravida === 'Sim' && (
                <TextField
                  label="Quantas semanas?"
                  type="number"
                  placeholder="Ex: 12"
                  value={form.semanas}
                  onChange={(v) => set('semanas', v)}
                />
              )}
            </Question>
            <SwitchRow
              label="Está amamentando?"
              checked={form.amamentando}
              onChange={(v) => set('amamentando', v)}
            />
            <SwitchRow
              label="Utiliza DIU?"
              checked={form.diu}
              onChange={(v) => set('diu', v)}
            />
            <SwitchRow
              label="Faz uso de anticoncepcional?"
              checked={form.anticoncepcional}
              onChange={(v) => set('anticoncepcional', v)}
            />
          </StepShell>
        )}

        {currentStep === 5 && (
          <StepShell title="Hábitos">
            <Question label="Fuma?">
              <RadioGroup
                options={['Nunca', 'Socialmente', 'Sim']}
                value={form.fuma}
                onChange={(v) => set('fuma', v)}
              />
            </Question>
            <Question label="Consome bebida alcoólica?">
              <RadioGroup
                options={['Nunca', 'Socialmente', 'Sim']}
                value={form.alcool}
                onChange={(v) => set('alcool', v)}
              />
            </Question>
            <div className="flex flex-col gap-2.5">
              <SwitchRow
                label="Pratica atividade física?"
                checked={form.atividade}
                onChange={(v) => set('atividade', v)}
              />
              {form.atividade && (
                <Question label="Quantas vezes por semana?">
                  <LabeledSlider
                    min={1}
                    max={7}
                    value={form.atividadeFreq}
                    onChange={(v) => set('atividadeFreq', v)}
                    suffix="x por semana"
                  />
                </Question>
              )}
            </div>
            <Question label="Ingere bastante água diariamente?">
              <LabeledSlider
                min={0}
                max={2}
                value={form.agua}
                onChange={(v) => set('agua', v)}
                marks={['Pouca', 'Média', 'Alta']}
              />
            </Question>
          </StepShell>
        )}

        {currentStep === 6 && (
          <StepShell title="Pele">
            <Question label="Como você classificaria sua pele?">
              <CardSelect
                options={['Oleosa', 'Seca', 'Mista', 'Sensível', 'Não sei']}
                value={form.tipoPele}
                onChange={(v) => set('tipoPele', v)}
              />
            </Question>
            <SwitchRow
              label="Possui acne?"
              checked={form.acne}
              onChange={(v) => set('acne', v)}
            />
            <div className="flex flex-col gap-2.5">
              <SwitchRow
                label="Tem manchas?"
                checked={form.manchas}
                onChange={(v) => set('manchas', v)}
              />
              {form.manchas && (
                <TextField
                  placeholder="Onde?"
                  value={form.manchasOnde}
                  onChange={(v) => set('manchasOnde', v)}
                />
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              <SwitchRow
                label="Já realizou procedimentos estéticos?"
                checked={form.jaFezProc}
                onChange={(v) => set('jaFezProc', v)}
              />
              {form.jaFezProc && (
                <CheckList
                  options={[
                    'Botox',
                    'Preenchimento',
                    'Laser',
                    'Limpeza',
                    'Microagulhamento',
                    'Peeling',
                    'Outros',
                  ]}
                  values={form.procedimentos}
                  onToggle={(v) => toggle('procedimentos', v)}
                />
              )}
            </div>
          </StepShell>
        )}

        {currentStep === 7 && (
          <StepShell title="Objetivo">
            <Question label="Qual resultado você procura?">
              <MultiSelect
                options={[
                  'Rejuvenescimento',
                  'Emagrecimento',
                  'Gordura localizada',
                  'Celulite',
                  'Flacidez',
                  'Acne',
                  'Manchas',
                  'Depilação',
                  'Relaxamento',
                  'Outro',
                ]}
                values={form.objetivos}
                onToggle={(v) => toggle('objetivos', v)}
              />
              {form.objetivos.includes('Outro') && (
                <TextField
                  placeholder="Conte qual objetivo"
                  value={form.objetivoOutro}
                  onChange={(v) => set('objetivoOutro', v)}
                />
              )}
            </Question>
            <Question label="Há alguma região específica?">
              <MultiSelect
                options={[
                  'Rosto',
                  'Abdômen',
                  'Pernas',
                  'Axilas',
                  'Virilha',
                  'Costas',
                  'Corpo todo',
                ]}
                values={form.regioes}
                onToggle={(v) => toggle('regioes', v)}
              />
            </Question>
          </StepShell>
        )}

        {currentStep === 8 && (
          <StepShell title="Contraindicações">
            <SwitchRow
              label="Você possui marcapasso?"
              checked={form.marcapasso}
              onChange={(v) => set('marcapasso', v)}
            />
            <div className="flex flex-col gap-2.5">
              <SwitchRow
                label="Possui próteses metálicas?"
                checked={form.proteses}
                onChange={(v) => set('proteses', v)}
              />
              {form.proteses && (
                <TextField
                  placeholder="Onde?"
                  value={form.protesesOnde}
                  onChange={(v) => set('protesesOnde', v)}
                />
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              <SwitchRow
                label="Possui câncer ou histórico recente?"
                checked={form.cancer}
                onChange={(v) => set('cancer', v)}
              />
              {form.cancer && (
                <TextField
                  placeholder="Conte mais detalhes"
                  value={form.cancerDetalhe}
                  onChange={(v) => set('cancerDetalhe', v)}
                />
              )}
            </div>
            <SwitchRow
              label="Tem epilepsia?"
              checked={form.epilepsia}
              onChange={(v) => set('epilepsia', v)}
            />
            <div className="flex flex-col gap-2.5">
              <SwitchRow
                label="Diabetes?"
                checked={form.diabetes}
                onChange={(v) => set('diabetes', v)}
              />
              {form.diabetes && (
                <TextField
                  label="Tipo?"
                  placeholder="Ex: Tipo 2"
                  value={form.diabetesTipo}
                  onChange={(v) => set('diabetesTipo', v)}
                />
              )}
            </div>
            <SwitchRow
              label="Hipertensão?"
              checked={form.hipertensao}
              onChange={(v) => set('hipertensao', v)}
            />
          </StepShell>
        )}

        {currentStep === 9 && (
          <StepShell title="Consentimento">
            <div className="flex flex-col gap-2">
              <ConsentItem
                checked={form.consent1}
                onChange={(v) => set('consent1', v)}
                label="Confirmo que todas as informações fornecidas são verdadeiras."
              />
              <ConsentItem
                checked={form.consent2}
                onChange={(v) => set('consent2', v)}
                label="Autorizo a clínica a utilizar estas informações para fins de avaliação clínica."
              />
              <ConsentItem
                checked={form.consent3}
                onChange={(v) => set('consent3', v)}
                label="Estou ciente de que devo informar qualquer alteração no meu estado de saúde."
              />
            </div>
            <Question label="Assinatura">
              <SignaturePad onChange={(v) => set('assinatura', v)} />
            </Question>
          </StepShell>
        )}
      </div>

      {/* CTA fixo */}
      <div className="relative z-10 border-t border-black/5 bg-background/80 px-6 py-4 backdrop-blur-md">
        <button
          type="button"
          onClick={next}
          disabled={currentStep === 9 && !consentOk}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-rose py-4 text-base font-medium text-primary-foreground shadow-lg shadow-rose/30 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {stepIdx === total - 1 ? 'Finalizar anamnese' : 'Continuar'}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </section>
  )
}

function StepShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-5 pb-2 pt-2">
      <h1 className="text-balance font-serif text-2xl font-semibold leading-tight text-ink">
        {title}
      </h1>
      {children}
    </div>
  )
}

function ConsentItem({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-[14px] leading-snug transition-all active:scale-[0.99] ${
        checked ? 'border-rose bg-rose/10 text-ink' : 'border-black/10 bg-white/70 text-ink/80'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
          checked ? 'border-rose bg-rose text-white' : 'border-black/20'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      {label}
    </button>
  )
}
