import Image from 'next/image'

interface LogoProps {
  size?: number
  showText?: boolean
  textSize?: string
}

export default function Logo({ size = 36, showText = true, textSize = 'text-base' }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0 rounded-full overflow-hidden" style={{ width: size, height: size }}>
        <Image src="/logo.webp" alt="Wave CRM" fill sizes={`${size}px`} className="object-contain" />
      </div>
      {showText && (
        <span className={`font-bold tracking-wide text-white ${textSize}`}>
          wave.<span style={{ color: '#00ff88' }}>crm</span>
        </span>
      )}
    </div>
  )
}