// One button for the whole app. Pills, because the cards use a soft radius.
// primary = the one main action on a screen (accent, glowing). deck = primary in the deck's colour.
// secondary = bordered. ghost = text only.

const VARIANTS = {
  // Disabled: a calm grey pill (a faded orange looks muddy on the dark theme). While a request
  // is running (aria-busy) it stays orange, with its spinner.
  primary:
    'bg-accent text-on-accent hover:bg-accent-hover glow-accent disabled:bg-border disabled:text-muted disabled:shadow-none disabled:aria-busy:bg-accent disabled:aria-busy:text-on-accent disabled:aria-busy:opacity-80',
  deck: 'bg-(--deck) text-on-accent glow-deck hover:brightness-110 disabled:opacity-45',
  secondary: 'border border-border bg-surface text-text hover:border-muted/50 disabled:opacity-45',
  ghost: 'text-muted hover:bg-border/50 hover:text-text disabled:opacity-45',
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
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,scale] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  )
}
