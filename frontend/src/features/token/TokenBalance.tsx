export function TokenBalance({ amount }: { amount: string }) {
  return (
    <div>
      <div className="text-2xl">{amount}</div>
      <div className="text-sm text-terminalWhite/60">rewards</div>
    </div>
  )
}

