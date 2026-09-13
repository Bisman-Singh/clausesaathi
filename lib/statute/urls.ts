/**
 * Where statute text lives. Kept apart from the API client so pages that only
 * need a link (the legal-aid panel) do not pull the client, and its schema
 * library, into the browser bundle.
 */
export const INDIACODE_BASE_URL = "https://indiacode.ecourtsindia.com";
