# 🚀 Exemplos de Uso - Integração Frontend + Backend

## 📦 Imports Necessários

```typescript
import { useAuth } from '@/contexts/AuthContext'
import * as api from '@/lib/api'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { useAnamnesis } from '@/lib/hooks/useAnamnesis'
```

---

## 🔐 1. Login e Autenticação

### Cliente fazendo login
```typescript
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signIn, loading } = useAuth()
  const router = useRouter()

  const handleLogin = async (email: string, password: string) => {
    try {
      await signIn(email, password)
      // AuthContext automaticamente busca usuário do backend PostgreSQL
      router.push('/cliente')
    } catch (error) {
      console.error('Erro no login:', error)
    }
  }

  return (
    // Seu formulário de login...
  )
}
```

### Acessar usuário logado
```typescript
'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function ClientePage() {
  const { user, loading } = useAuth()

  if (loading) return <div>Carregando...</div>

  if (!user) return <div>Não autenticado</div>

  return (
    <div>
      <h1>Olá, {user.name}!</h1>
      <p>Email: {user.email}</p>
      <p>Plano: {user.subscription?.plan.name || 'Sem assinatura'}</p>
      <p>Tratamentos restantes: {user.subscription?.remaining?.thisMonth || 0}</p>
    </div>
  )
}
```

---

## 💎 2. Listar Planos e Assinar

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/lib/hooks/useSubscription'
import * as api from '@/lib/api'

export default function PlanosPage() {
  const { user } = useAuth()
  const { createSubscription } = useSubscription(user?.id)
  const [plans, setPlans] = useState([])

  useEffect(() => {
    // Buscar planos
    api.getPlans().then(setPlans)
  }, [])

  const handleSubscribe = async (planId: string) => {
    try {
      await createSubscription(planId)
      // Redireciona ou atualiza UI
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div>
      {plans.map(plan => (
        <div key={plan.id}>
          <h3>{plan.name}</h3>
          <p>{plan.description}</p>
          <p>R$ {plan.price}/mês</p>
          <p>{plan.maxTreatmentsPerMonth} tratamentos/mês</p>
          <p>{plan.services.length} serviços inclusos</p>
          <button onClick={() => handleSubscribe(plan.id)}>
            Assinar
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## 📋 3. Criar Anamnese (5 Steps)

```typescript
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useAnamnesis } from '@/lib/hooks/useAnamnesis'
import { AnamnesisData } from '@/types'

export default function AnamnesePage() {
  const { user } = useAuth()
  const { createAnamnesis, hasAnamnesis } = useAnamnesis(user?.id)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<AnamnesisData>>({})

  const handleSubmit = async () => {
    try {
      await createAnamnesis(formData as AnamnesisData)
      // Redireciona para agendamento
    } catch (error) {
      console.error(error)
    }
  }

  if (hasAnamnesis) {
    return <div>Você já preencheu a anamnese! ✅</div>
  }

  return (
    <div>
      {step === 1 && <Step1DadosPessoais onChange={data => setFormData({...formData, personalData: data})} />}
      {step === 2 && <Step2EstiloVida onChange={data => setFormData({...formData, lifestyle: data})} />}
      {step === 3 && <Step3Saude onChange={data => setFormData({...formData, healthInfo: data})} />}
      {step === 4 && <Step4Objetivos onChange={data => setFormData({...formData, goals: data})} />}
      {step === 5 && <Step5Termo onChange={agreed => setFormData({...formData, agreedToTerms: agreed})} />}
      
      <button onClick={() => step < 5 ? setStep(step + 1) : handleSubmit()}>
        {step < 5 ? 'Próximo' : 'Finalizar'}
      </button>
    </div>
  )
}
```

---

## 📅 4. Agendar Tratamento

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { useSubscription } from '@/lib/hooks/useSubscription'
import * as api from '@/lib/api'

export default function AgendaPage() {
  const { user } = useAuth()
  const { scheduleAppointment } = useAppointments(user?.id)
  const { subscription, canSchedule } = useSubscription(user?.id)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])

  // Buscar horários disponíveis quando selecionar data
  useEffect(() => {
    if (selectedDate && selectedService) {
      api.getAvailableSlots(selectedDate, selectedService)
        .then(data => setAvailableSlots(data.slots))
    }
  }, [selectedDate, selectedService])

  const handleSchedule = async (time: string) => {
    if (!user) return

    try {
      // Montar datetime ISO
      const dateTime = new Date(`${selectedDate}T${time}:00.000Z`)

      await scheduleAppointment({
        serviceId: selectedService,
        startTime: dateTime.toISOString(),
        origin: subscription ? 'SUBSCRIPTION' : 'SINGLE',
        paymentMethod: !subscription ? 'pix' : undefined,
        paymentAmount: !subscription ? 120 : undefined,
      })
      
      // Atualiza lista de horários disponíveis
      const updated = await api.getAvailableSlots(selectedDate, selectedService)
      setAvailableSlots(updated.slots)
    } catch (error) {
      console.error(error)
    }
  }

  if (!canSchedule && subscription) {
    return (
      <div>
        <p>Você já usou todos os {subscription.limits?.maxPerMonth} tratamentos deste mês!</p>
        <p>Restam: {subscription.remaining?.thisMonth}</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Agendar Tratamento</h1>
      
      {/* Seletor de data */}
      <input 
        type="date" 
        value={selectedDate}
        onChange={e => setSelectedDate(e.target.value)}
      />

      {/* Horários disponíveis */}
      <div>
        {availableSlots.map(slot => (
          <button key={slot} onClick={() => handleSchedule(slot)}>
            {slot}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## 👥 5. Admin - Confirmar Agendamentos

```typescript
'use client'

import { useState, useEffect } from 'react'
import * as api from '@/lib/api'

export default function AdminAgendamentosPage() {
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    // Buscar agendamentos pendentes
    api.getAppointments({ status: 'PENDING' })
      .then(setAppointments)
  }, [])

  const handleConfirm = async (appointmentId: string) => {
    try {
      await api.confirmAppointment(appointmentId)
      toast.success('Agendamento confirmado!')
      
      // Atualiza lista
      const updated = await api.getAppointments({ status: 'PENDING' })
      setAppointments(updated)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div>
      <h1>Agendamentos Pendentes</h1>
      {appointments.map(apt => (
        <div key={apt.id}>
          <p>{apt.user?.name}</p>
          <p>{apt.service?.name}</p>
          <p>{new Date(apt.startTime).toLocaleString('pt-BR')}</p>
          <button onClick={() => handleConfirm(apt.id)}>
            Confirmar
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## 🎁 6. Admin - Dar Voucher

```typescript
'use client'

import * as api from '@/lib/api'

export default function DarVoucherModal({ userId }: { userId: string }) {
  const handleCreateVoucher = async () => {
    try {
      await api.createVoucher({
        userId,
        type: 'FREE_TREATMENT',
        description: 'Presente de aniversário! 🎂',
        anyService: true,
        grantedBy: 'admin-id', // ID do admin logado
        grantedReason: 'Aniversário',
      })
      
      toast.success('Voucher criado! Cliente foi presenteado! 🎁')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <button onClick={handleCreateVoucher}>
      Dar Tratamento Grátis
    </button>
  )
}
```

---

## ⏰ 7. Admin - Definir Horários

```typescript
'use client'

import * as api from '@/lib/api'

export default function HorariosPage() {
  const handleSetSchedule = async () => {
    try {
      // Segunda a sexta
      for (let day = 1; day <= 5; day++) {
        await api.setManagerSchedule({
          dayOfWeek: day,
          isAvailable: true,
          availableSlots: [
            { start: '09:00', end: '12:00' },
            { start: '14:00', end: '18:00' },
          ],
        })
      }
      
      toast.success('Horários configurados!')
    } catch (error) {
      console.error(error)
    }
  }

  const handleCreateHoliday = async () => {
    try {
      await api.createScheduleOverride({
        date: '2025-12-25',
        isAvailable: false,
        reason: 'Natal',
      })
      
      toast.success('Feriado cadastrado!')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div>
      <button onClick={handleSetSchedule}>
        Configurar Horários Padrão
      </button>
      <button onClick={handleCreateHoliday}>
        Adicionar Feriado
      </button>
    </div>
  )
}
```

---

## 💻 8. Admin - Gerenciar Planos (Adicionar/Remover Serviços)

```typescript
'use client'

import { useState, useEffect } from 'react'
import * as api from '@/lib/api'

export default function EditarPlanoPage({ planId }: { planId: string }) {
  const [plan, setPlan] = useState(null)
  const [allServices, setAllServices] = useState([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])

  useEffect(() => {
    // Buscar plano e serviços
    api.getPlan(planId).then(p => {
      setPlan(p)
      setSelectedServices(p.services.map(s => s.id))
    })
    
    api.getServices().then(setAllServices)
  }, [planId])

  const handleSaveServices = async () => {
    try {
      // Substitui todos os serviços do plano
      await api.setServicesOnPlan(planId, selectedServices)
      toast.success('Serviços do plano atualizados!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao atualizar serviços')
    }
  }

  const toggleService = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter(id => id !== serviceId))
    } else {
      setSelectedServices([...selectedServices, serviceId])
    }
  }

  return (
    <div>
      <h1>Editar Plano: {plan?.name}</h1>
      
      <div>
        {allServices.map(service => (
          <label key={service.id}>
            <input
              type="checkbox"
              checked={selectedServices.includes(service.id)}
              onChange={() => toggleService(service.id)}
            />
            {service.name} ({service.category})
          </label>
        ))}
      </div>

      <button onClick={handleSaveServices}>
        Salvar Alterações
      </button>
    </div>
  )
}
```

---

## 📊 9. Dashboard do Cliente

```typescript
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { useAnamnesis } from '@/lib/hooks/useAnamnesis'

export default function ClienteDashboard() {
  const { user } = useAuth()
  const { subscription, remainingTreatments, hasSubscription } = useSubscription(user?.id)
  const { appointments } = useAppointments(user?.id)
  const { hasAnamnesis } = useAnamnesis(user?.id)

  if (!user) return <div>Carregando...</div>

  return (
    <div>
      <h1>Bem-vindo(a), {user.name}!</h1>

      {/* Status da assinatura */}
      {hasSubscription ? (
        <div>
          <h2>Seu Plano: {subscription.plan.name}</h2>
          <p>Tratamentos restantes este mês: {remainingTreatments}</p>
          <p>Status: {subscription.status}</p>
        </div>
      ) : (
        <div>
          <p>Você ainda não tem um plano ativo</p>
          <a href="/cliente/plano">Assinar agora!</a>
        </div>
      )}

      {/* Anamnese */}
      {!hasAnamnesis && (
        <div>
          <p>⚠️ Preencha sua ficha de anamnese para agendar</p>
          <a href="/cliente/anamnese">Preencher agora</a>
        </div>
      )}

      {/* Próximos agendamentos */}
      <div>
        <h2>Próximos Agendamentos</h2>
        {appointments
          .filter(apt => apt.status !== 'COMPLETED' && apt.status !== 'CANCELED')
          .map(apt => (
            <div key={apt.id}>
              <p>{apt.service?.name}</p>
              <p>{new Date(apt.startTime).toLocaleString('pt-BR')}</p>
              <p>Status: {apt.status}</p>
            </div>
          ))}
      </div>
    </div>
  )
}
```

---

## 🎯 10. Fluxo Completo de Agendamento

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { useAppointments } from '@/lib/hooks/useAppointments'
import { useAnamnesis } from '@/lib/hooks/useAnamnesis'
import * as api from '@/lib/api'

export default function AgendarPage() {
  const { user } = useAuth()
  const { subscription, canSchedule } = useSubscription(user?.id)
  const { scheduleAppointment } = useAppointments(user?.id)
  const { hasAnamnesis } = useAnamnesis(user?.id)
  
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])

  // 1. Buscar serviços (filtrados pelo plano se tiver)
  useEffect(() => {
    if (subscription) {
      // Mostra apenas serviços do plano
      setServices(subscription.plan.services)
    } else {
      // Mostra todos os serviços (avulso)
      api.getServices().then(setServices)
    }
  }, [subscription])

  // 2. Buscar horários disponíveis ao selecionar data
  useEffect(() => {
    if (selectedDate && selectedService) {
      api.getAvailableSlots(selectedDate, selectedService)
        .then(data => setAvailableSlots(data.slots))
        .catch(err => {
          console.error(err)
          setAvailableSlots([])
        })
    }
  }, [selectedDate, selectedService])

  // 3. Validações antes de agendar
  if (!hasAnamnesis) {
    return (
      <div>
        <p>⚠️ Você precisa preencher a ficha de anamnese antes de agendar</p>
        <a href="/cliente/anamnese">Preencher Anamnese</a>
      </div>
    )
  }

  if (!canSchedule && subscription) {
    return (
      <div>
        <p>Você já usou todos os tratamentos deste mês!</p>
        <p>Restam: {subscription.remaining?.thisMonth} tratamentos</p>
      </div>
    )
  }

  // 4. Agendar
  const handleSchedule = async (time: string) => {
    try {
      const dateTime = new Date(`${selectedDate}T${time}:00.000Z`)
      
      await scheduleAppointment({
        serviceId: selectedService,
        startTime: dateTime.toISOString(),
        origin: subscription ? 'SUBSCRIPTION' : 'SINGLE',
        paymentMethod: !subscription ? 'pix' : undefined,
        paymentAmount: !subscription ? 120 : undefined,
      })
      
      // Redireciona
      router.push('/cliente/agenda')
    } catch (error: any) {
      // Erro já tratado no hook (toast)
    }
  }

  return (
    <div>
      <h1>Agendar Tratamento</h1>

      {/* 1. Escolher serviço */}
      <select onChange={e => setSelectedService(e.target.value)}>
        <option value="">Escolha um tratamento</option>
        {services.map(service => (
          <option key={service.id} value={service.id}>
            {service.name} - {service.category} ({service.duration}min)
          </option>
        ))}
      </select>

      {/* 2. Escolher data */}
      <input
        type="date"
        min={new Date().toISOString().split('T')[0]}
        value={selectedDate}
        onChange={e => setSelectedDate(e.target.value)}
      />

      {/* 3. Escolher horário */}
      {availableSlots.length > 0 ? (
        <div>
          <h3>Horários Disponíveis:</h3>
          {availableSlots.map(slot => (
            <button key={slot} onClick={() => handleSchedule(slot)}>
              {slot}
            </button>
          ))}
        </div>
      ) : (
        selectedDate && <p>Nenhum horário disponível nesta data</p>
      )}
    </div>
  )
}
```

---

## 📱 11. Meus Agendamentos (Cancelar/Reagendar)

```typescript
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useAppointments } from '@/lib/hooks/useAppointments'

export default function MeusAgendamentosPage() {
  const { user } = useAuth()
  const { appointments, cancelAppointment, rescheduleAppointment } = useAppointments(user?.id)

  const handleCancel = async (appointmentId: string) => {
    if (confirm('Tem certeza que deseja cancelar?')) {
      try {
        await cancelAppointment(appointmentId, 'Cliente cancelou')
      } catch (error) {
        console.error(error)
      }
    }
  }

  const handleReschedule = async (appointmentId: string) => {
    const newDateTime = prompt('Nova data/hora (YYYY-MM-DDTHH:mm:00.000Z):')
    if (newDateTime) {
      try {
        await rescheduleAppointment(appointmentId, newDateTime)
      } catch (error) {
        console.error(error)
      }
    }
  }

  const upcomingAppointments = appointments.filter(
    apt => ['PENDING', 'CONFIRMED'].includes(apt.status)
  )

  return (
    <div>
      <h1>Meus Agendamentos</h1>
      {upcomingAppointments.map(apt => (
        <div key={apt.id}>
          <h3>{apt.service?.name}</h3>
          <p>{new Date(apt.startTime).toLocaleString('pt-BR')}</p>
          <p>Status: {apt.status}</p>
          {apt.status === 'PENDING' && <span>⏳ Aguardando confirmação</span>}
          {apt.status === 'CONFIRMED' && <span>✅ Confirmado</span>}
          
          <button onClick={() => handleCancel(apt.id)}>Cancelar</button>
          <button onClick={() => handleReschedule(apt.id)}>Reagendar</button>
        </div>
      ))}
    </div>
  )
}
```

---

## 🔧 TROUBLESHOOTING

### Erro: "Usuário não encontrado"
**Causa:** Firebase UID não está no banco  
**Solução:** A função `getOrCreateUserFromFirebase` cria automaticamente

### Erro: "Anamnese não encontrada"
**Causa:** Cliente ainda não preencheu  
**Solução:** Redirecionar para `/cliente/anamnese`

### Erro: "Já existe agendamento neste horário"
**Causa:** Conflito de horário  
**Solução:** Atualizar lista de horários disponíveis

### Erro: "Limite mensal atingido"
**Causa:** Cliente já usou todos os tratamentos  
**Solução:** Exibir mensagem e bloquear agendamento

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Copiar código do `api.ts` expandido
2. ✅ Criar os hooks (`useAppointments`, `useSubscription`, `useAnamnesis`)
3. ✅ Atualizar AuthContext
4. ✅ Implementar páginas uma por uma
5. ✅ Testar cada fluxo

**Dica:** Comece pelas páginas mais simples (listar serviços, listar planos) e vá evoluindo!

