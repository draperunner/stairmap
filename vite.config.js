export default {
  build: {
    assetsInlineLimit: 0,
  },
  server: {
    port: 3456,
    headers: {
      "Content-Security-Policy":
        "default-src 'none'; connect-src 'self' https://tiles.openfreemap.org https://plausible.io; script-src 'self' https://plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tiles.openfreemap.org; manifest-src 'self'; worker-src 'self' blob:;",
    },
  },
};
