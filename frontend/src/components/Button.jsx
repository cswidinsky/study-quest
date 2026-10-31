// One button for the whole app. Pills, because the cards use a soft radius.
// primary = the one main action on a screen (accent, glowing). deck = primary in the deck's colour.
// secondary = bordered. ghost = text only.

const VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover glow-accent',
  deck: 'bg-(--deck) text-on-accent glow-deck hover:brightness-110',
  secondary: 'border border-border bg-surface text-text hover:border-muted/50',
  ghost: 'text-muted hover:bg-border/50 hover:text-text',
}

const SIZES = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
}

export default function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  return (
    <Tag
      {...(Tag === 'button' ? { type: 'button' } : {})}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  )
}
