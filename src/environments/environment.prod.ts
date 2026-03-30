import { buildVersion } from './build-version';

export const environment = {
  appVersion: buildVersion.version,
  buildId: buildVersion.buildId,
  buildTime: buildVersion.buildTime,
  production: true,
  apiUrl: 'https://corevadev.com'  
};
