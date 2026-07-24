import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/app/ui/Layout'
import { AlbumsPage } from '@/pages/albums'
import { AlbumDetailPage } from '@/pages/album-detail'
import { ArtistDetailPage } from '@/pages/artist-detail'
import { SearchPage } from '@/pages/search'
import { AuthCallbackPage } from '@/pages/auth-callback'
import { FavoritesPage } from '@/pages/favorites'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<AlbumsPage />} />
        <Route path="/albums/:id" element={<AlbumDetailPage />} />
        <Route path="/artists/:id" element={<ArtistDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/auth/kakao/callback" element={<AuthCallbackPage />} />
      </Route>
    </Routes>
  )
}
