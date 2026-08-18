import { prisma } from '../lib/prisma'

export type CancelPolicy =
  | {
      kind: 'machine'
      lateCancelHours: number
      lateCancelFeePercent: number
      text: string
      onTimeText: string
      latePaidText: string
    }
  | {
      kind: 'standard'
      minCancellationHours: number
      text: string
      onTimeText: string
      latePaidText: string
      latePlanText: string
    }

export async function resolveCancelPolicy(machineKind?: string | null): Promise<CancelPolicy> {
  if (machineKind) {
    const { getLateCancelPolicyForKind } = await import('./machineRental')
    const policy = await getLateCancelPolicyForKind(machineKind as 'LASER' | 'CRYO')
    const h = policy.lateCancelHours
    const fee = policy.lateCancelFeePercent
    return {
      kind: 'machine',
      lateCancelHours: h,
      lateCancelFeePercent: fee,
      text:
        `Tratamento especial (máquina): prazo de ${h}h. ` +
        `Com ${h}h ou mais de antecedência, você escolhe reembolso integral ou crédito. ` +
        `Com menos de ${h}h (por exemplo 20h restantes), ainda há reembolso em dinheiro, mas com multa de ${fee}% — neste caso não existe crédito.`,
      onTimeText:
        `Você está com ${h}h ou mais de antecedência. Pode escolher reembolso integral em dinheiro ou crédito na clínica. ` +
        `Se cancelar mais perto do horário (menos de ${h}h), o reembolso sai com multa de ${fee}% e sem opção de crédito.`,
      latePaidText:
        `Faltam menos de ${h}h para este tratamento especial. ` +
        `O valor volta em dinheiro com multa de ${fee}% (penalidade por ocupar a agenda). ` +
        `Neste caso não há crédito — só o estorno com desconto da multa.`,
    }
  }

  const config = await prisma.systemConfig.findFirst()
  const minH = config?.minCancellationHours || 4
  return {
    kind: 'standard',
    minCancellationHours: minH,
    text:
      `Prazo da clínica: ${minH}h. Com ${minH}h ou mais de antecedência, o avulso pago pode ser reembolsado em dinheiro ou virar crédito. ` +
      `Com menos de ${minH}h (por exemplo 3h59), não há reembolso em dinheiro — só crédito. No plano, a sessão é perdida.`,
    onTimeText:
      `Você está com ${minH}h ou mais de antecedência. Pode escolher reembolso em dinheiro (Pix/cartão) ou crédito para outros procedimentos.`,
    latePaidText:
      `Faltam menos de ${minH}h. Não é possível reembolso em dinheiro. O valor pago vira crédito na clínica, no mesmo valor, para usar em outros procedimentos.`,
    latePlanText:
      `Faltam menos de ${minH}h. Se cancelar agora, esta sessão do plano é perdida (não volta para a cota do mês).`,
  }
}

export function minHoursFromPolicy(policy: CancelPolicy): number {
  return policy.kind === 'machine' ? policy.lateCancelHours : policy.minCancellationHours
}

export async function attachCancelPolicies<T extends { service?: { machineKind?: string | null } }>(
  items: T[],
): Promise<Array<T & { cancelPolicy: CancelPolicy }>> {
  const cache = new Map<string, CancelPolicy>()
  const result: Array<T & { cancelPolicy: CancelPolicy }> = []
  for (const item of items) {
    const kind = item.service?.machineKind || 'standard'
    if (!cache.has(kind)) {
      cache.set(kind, await resolveCancelPolicy(item.service?.machineKind))
    }
    result.push({ ...item, cancelPolicy: cache.get(kind)! })
  }
  return result
}
