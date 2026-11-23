// The StudyQuest logo (public/brand). Dark text on the light theme, light text on the dark theme:
// both images are in the page and CSS shows the right one, so there's no flash when the theme flips.
// href = null renders it without a link (the sign-in screens).
export default function Logo({ href = '#/', className = 'h-7' }) {
  const images = (
    <>
      <img src="/brand/studyquest-logo-light.svg" alt="StudyQuest" width="126" height="28" className={`${className} w-auto dark:hidden`} />
      <img src="/brand/studyquest-logo-dark.svg" alt="StudyQuest" width="126" height="28" className={`${className} hidden w-auto dark:block`} />
    </>
  )
  if (!href) return <span className="flex shrink-0 items-center">{images}</span>
  return (
    <a href={href} className="flex shrink-0 items-center rounded-lg" aria-label="StudyQuest home">
      {images}
    </a>
  )
}
