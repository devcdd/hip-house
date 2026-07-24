import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/widgets/app-header'
import { ScrollTopButton } from '@/shared/ui/ScrollTopButton'

export function Layout() {
  return (
    <>
      <AppHeader />
      <Outlet />
      <ScrollTopButton />
    </>
  )
}
