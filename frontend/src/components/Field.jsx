// Form building blocks: label above the field, white field with a 1px border.

const FIELD =
  'w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-text transition-[border-color] duration-150 ease-out hover:border-muted/50 focus-visible:border-transparent'

export function Field({ label, htmlFor, hint, hintId, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

export function TextInput({ className = '', ...props }) {
  return <input className={`${FIELD} h-10 ${className}`} {...props} />
}

export function TextArea({ className = '', ...props }) {
  return <textarea className={`${FIELD} min-h-[68px] resize-y py-2.5 leading-relaxed ${className}`} {...props} />
}
