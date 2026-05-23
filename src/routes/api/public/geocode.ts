import { createFileRoute } from '@tanstack/react-router';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

export const Route = createFileRoute('/api/public/geocode')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const address = url.searchParams.get('address');
        if (!address || address.length > 500) {
          return Response.json({ error: 'Invalid address' }, { status: 400 });
        }

        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY_1 ?? process.env.GOOGLE_MAPS_API_KEY;
        if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
          return Response.json({ error: 'Maps not configured' }, { status: 500 });
        }

        try {
          const res = await fetch(
            `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
            {
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
              },
            },
          );
          const data = await res.json();
          const loc = data?.results?.[0]?.geometry?.location;
          if (!loc) return Response.json({ error: 'Not found' }, { status: 404 });
          return Response.json({ lat: loc.lat, lng: loc.lng });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? 'Geocode failed' }, { status: 500 });
        }
      },
    },
  },
});
