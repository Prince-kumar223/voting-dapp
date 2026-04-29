import { useEffect, useRef, useState } from 'react'

type MobileMenuProps = {
  walletAddress: string | undefined
  balance: string
  isConnected: boolean
}

function truncateAddress(address: string | undefined): string {
  if (!address) return 'Not connected'
  if (address.length <= 12) return address

  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function MobileMenu({ walletAddress, balance, isConnected }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target

      if (target instanceof Node && !menuRef.current?.contains(target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick)

    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  return (
    <div className="md:hidden" ref={menuRef}>
      <button
        type="button"
        className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 border border-terminalGreen/50 text-terminalGreen transition hover:border-terminalGreen"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        aria-label="Open mobile menu"
        aria-expanded={open}
      >
        <span className="h-0.5 w-5 bg-current" />
        <span className="h-0.5 w-5 bg-current" />
        <span className="h-0.5 w-5 bg-current" />
      </button>

      <div
        className={`fixed left-0 right-0 top-0 z-40 border-b border-terminalGreen/30 bg-terminalBlack px-4 py-5 text-terminalWhite shadow-lg transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <button
          type="button"
          className="absolute right-4 top-4 text-xl leading-none text-terminalGreen transition hover:text-terminalWhite"
          onClick={() => setOpen(false)}
          aria-label="Close mobile menu"
        >
          X
        </button>

        <div className="grid gap-4 pr-10">
          <div>
            <div className="text-xs uppercase tracking-wider text-terminalWhite/50">Wallet</div>
            <div className="mt-1 break-all text-sm">
              {isConnected ? truncateAddress(walletAddress) : 'Not connected'}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-terminalWhite/50">Balance</div>
            <div className="mt-1 text-sm">{balance} RWD</div>
          </div>
        </div>
      </div>
    </div>
  )
}
