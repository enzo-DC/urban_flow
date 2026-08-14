/** Types GBFS minimaux — uniquement les champs reellement utilises. */

export interface GbfsDiscoveryResponse {
  data: Record<string, { feeds: { name: string; url: string }[] }>;
}

export interface GbfsStationInformationResponse {
  data: {
    stations: {
      station_id: string;
      lat: number;
      lon: number;
    }[];
  };
}

export interface GbfsStationStatusResponse {
  ttl: number;
  data: {
    stations: {
      station_id: string;
      num_bikes_available: number;
    }[];
  };
}

export function findFeedUrl(
  discovery: GbfsDiscoveryResponse,
  feedName: string,
): string | undefined {
  for (const locale of Object.values(discovery.data)) {
    const feed = locale.feeds.find((entry) => entry.name === feedName);
    if (feed) return feed.url;
  }
  return undefined;
}
