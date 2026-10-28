/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/categoria/gotas',
        destination: '/categoria/extractos-y-gotas',
        permanent: true,
      },
      {
        source: '/categoria/moronel-gotas',
        destination: '/categoria/extractos-y-gotas',
        permanent: true,
      },
      {
        source: '/categoria/moronel-capsulas',
        destination: '/categoria/capsulas',
        permanent: true,
      },
      {
        source: '/categoria/moronel-hierba',
        destination: '/categoria/hierbas-e-infusiones',
        permanent: true,
      },
      {
        source: '/categoria/herbazen',
        destination: '/categoria/extractos-y-gotas',
        permanent: false,
      },
      {
        source: '/producto/moronel-gotas',
        destination: '/producto/moronel-gotas-50ml',
        permanent: true,
      },
      {
        source: '/producto/moronel-hierba-100g',
        destination: '/producto/moronel-hierba-240g',
        permanent: true,
      },
      {
        source: '/producto/moronel-capsulas-100-piezas',
        destination: '/producto/moronel-capsulas-60-capsulas',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
