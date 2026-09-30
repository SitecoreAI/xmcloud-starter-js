import { SitecoreClient } from '@sitecore-content-sdk/nextjs/client';
import scConfig from 'sitecore.config';
let connectedClient: SitecoreClient | undefined;
/** Instantiate only for an actual connected read; fixtures need no credentials. */
const client = new Proxy({} as SitecoreClient, {
  get(_target, property) {
    connectedClient ??= new SitecoreClient({ ...scConfig });
    const value = Reflect.get(connectedClient, property);
    return typeof value === 'function' ? value.bind(connectedClient) : value;
  },
});
export default client;
