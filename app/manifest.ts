import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MaltaGuns',
    short_name: 'MaltaGuns',
    description:
      "Marketplace and community hub for Malta's shooting and collecting community",
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/favicon.png',
        sizes: '150x150',
        type: 'image/png',
      },
      {
        src: '/maltaguns.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
