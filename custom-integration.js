const { Integration } = require('./integration');

class CustomIntegration  extends Integration {
  build() {
  }

  respond() {
  }

  static invoke(options) {
    const integration = new CustomIntegration(options);
    return integration.invoke();
  }
}
