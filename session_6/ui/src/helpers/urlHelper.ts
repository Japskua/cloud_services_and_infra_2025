export const getServiceUrl = (servicePrefix: string): string => {
    const currentHost = window.location.hostname; // e.g., ui.localhost or ui.myservice.com
    const serviceHost = currentHost.replace(/^app\./, `${servicePrefix}.`);
    return `https://${serviceHost}`;
};
