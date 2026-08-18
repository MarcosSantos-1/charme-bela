import { prisma } from '../lib/prisma'

export type CancelPolicy =
  | {
      kind: 'machine'
      lateCancelHours: number
      lateCancelFeePercent: number
      text: string
    }
  | {
      kind: 'standard'
      minCancellationHours: number
      text: string
    }

export async function resolveCancelPolicy(machineKind?: string | null): Promise<CancelPolicy> {
  if (machineKind) {
    const { getLateCancelPolicyForKind } = await import('./machineRental')
    const policy = await getLateCancelPolicyForKind(machineKind as 'LASER' | 'CRYO')
    return {
      kind: 'machine',
      lateCancelHours: policy.lateCancelHours,
      lateCancelFeePercent: policy.lateCancelFeePercent,
      text: `Cancelamento com menos de ${policy.lateCancelHours}h de antecedência: estorno com multa de ${policy.lateCancelFeePercent}%. Com antecedência igual ou maior, você escolhe reembolso ou crédito.`,
    }
  }

  const config = await prisma.systemConfig.findFirst()
  const minH = config?.minCancellationHours || 4
  return {
    kind: 'standard',
    minCancellationHours: minH,
    text: `Cancele com pelo menos ${minH}h de antecedência para escolher reembolso em dinheiro ou crédito na clínica. Fora desse prazo, o valor vira crédito (avulso) ou a sessão do plano é perdida.`,
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
