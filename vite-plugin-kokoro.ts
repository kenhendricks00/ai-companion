
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export function kokoroPlugin(): Plugin {
  return {
    name: 'vite-plugin-kokoro',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.includes('kokoro-82m-v1.0.onnx')) {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        }
        next();
      });
    },
    // We need to handle ONNX and WASM files correctly
    transform(code, id) {
      if (id.endsWith('.onnx') || id.endsWith('.wasm')) {
        // Return the asset URL instead of the content
        return {
          code: `export default ${JSON.stringify(path.basename(id))}`,
          map: null
        };
      }
    }
  };
}
