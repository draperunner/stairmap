export default {
  build: {
    assetsInlineLimit: 0,
  },
  server: {
    port: 3456,
    headers: {
      "Content-Security-Policy":
        "default-src 'none'; connect-src 'self' https://plausible.io; script-src 'self' https://plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org; manifest-src 'self'",
    },
  },
};
