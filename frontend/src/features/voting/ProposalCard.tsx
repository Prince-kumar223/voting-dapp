import type { Proposal } from './types'

export function ProposalCard({
  proposal,
  disabled,
  onVote,
}: {
  proposal: Proposal
  disabled: boolean
  onVote: (id: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-xs text-terminalWhite/60">id_{proposal.id}</div>
        <div className="truncate text-lg">{proposal.title}</div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="text-sm text-terminalWhite/70">votes_{proposal.votes}</div>
        <button
          type="button"
          className="terminal-button"
          disabled={disabled}
          onClick={() => onVote(proposal.id)}
        >
          vote
        </button>
      </div>
    </div>
  )
}

