import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/widgets/app-header'
import { ScrollToTop } from '@/app/ui/ScrollToTop'
import { ScrollTopButton } from '@/shared/ui/ScrollTopButton'

export function Layout() {
  return (
    <>
      <AppHeader />
      <ScrollToTop />
      <Outlet />
      <ScrollTopButton />
    </>
  )
}
