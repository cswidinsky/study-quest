import { HomeIcon, PlusIcon } from '../icons.jsx'

// The main screens. `name` matches matchRoute() in lib/router.js.
// The quiz/review screen will be added here when it exists.
export const NAV_ITEMS = [
  { name: 'home', path: '/', label: 'Home', Icon: HomeIcon },
  { name: 'new', path: '/new', label: 'New deck', Icon: PlusIcon },
]
