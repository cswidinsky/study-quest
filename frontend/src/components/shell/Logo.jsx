// Product mark: a quest flag on the accent colour, plus the name.
export default function Logo({ withName = true }) {
  return (
    <a href="#/" className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight">
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
        <rect width="24" height="24" rx="7.5" className="fill-accent" />
        <path
          d="M8.5 18V6l8 3.25-8 3.25"
          fill="none"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-on-accent"
        />
      </svg>
      {withName ? <span>StudyQuest</span> : <span className="sr-only">StudyQuest home</span>}
    </a>
  )
}
