export class WpDeployError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WpDeployError';
  }
}

export class ConfigError extends WpDeployError {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class ApiError extends WpDeployError {
  constructor(message, statusCode, body) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export class PluginDetectionError extends WpDeployError {
  constructor(message) {
    super(message);
    this.name = 'PluginDetectionError';
  }
}

export class DeployError extends WpDeployError {
  constructor(message) {
    super(message);
    this.name = 'DeployError';
  }
}
