export const getServiceUrl = (servicePrefix: string): string => {
    const currentHost = window.location.hostname; // e.g., app.localhost or app.myservice.com
    const serviceHost = currentHost.replace(/^app\./, `${servicePrefix}.`);
    return `https://${serviceHost}`;
};
