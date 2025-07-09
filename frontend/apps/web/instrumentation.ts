export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid bundling in client-side code
    import('@opentelemetry/sdk-node').then(({ NodeSDK }) => {
      import('@opentelemetry/auto-instrumentations-node').then(({ getNodeAutoInstrumentations }) => {
        import('@opentelemetry/resources').then(({ Resource }) => {
          import('@opentelemetry/semantic-conventions').then(({ SemanticResourceAttributes }) => {
            const sdk = new NodeSDK({
              resource: new Resource({
                [SemanticResourceAttributes.SERVICE_NAME]: 'datatourisme-web',
                [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
              }),
              instrumentations: [getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': {
                  enabled: false,
                },
              })],
            });
            sdk.start();
          });
        });
      });
    });
  }
}