import { memo } from 'react'
import { ProposalCard } from './ProposalCard'
import type { Proposal } from './types'

export const ProposalList = memo(function ProposalList({
  proposals,
  disabled,
  onVote,
}: {
  proposals: Proposal[]
  disabled: boolean
  onVote: (id: number) => void
}) {
  return (
    <div className="divide-y divide-terminalGreen/10">
      {proposals.map((p) => (
        <div key={p.id} className="px-4">
          <ProposalCard proposal={p} disabled={disabled} onVote={onVote} />
        </div>
      ))}
    </div>
  )
})

