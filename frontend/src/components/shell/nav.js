import { CardsIcon, ChartIcon, HomeIcon, PlusIcon, SettingsIcon, UserIcon } from '../icons.jsx'

// The main screens. `name` matches matchRoute() in lib/router.js.
// `badge: 'due'` shows how many cards are due (a queue that needs action).
export const NAV_ITEMS = [
  { name: 'home', path: '/', label: 'Home', Icon: HomeIcon },
  { name: 'review', path: '/review', label: 'Review', Icon: CardsIcon, badge: 'due' },
  { name: 'new', path: '/new', label: 'New deck', Icon: PlusIcon },
  { name: 'stats', path: '/stats', label: 'Stats', Icon: ChartIcon },
  { name: 'profile', path: '/profile', label: 'Profile', Icon: UserIcon },
  { name: 'settings', path: '/settings', label: 'Settings', Icon: SettingsIcon },
]
