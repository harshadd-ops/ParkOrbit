import type { FeatureCollection } from "geojson";

export const PUNE_BOUNDARY_GEOJSON_URL = "/pune-boundary.geojson";

export const PUNE_BOUNDARY_GEOJSON: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Pune Metropolitan Region & Municipal Boundary",
        city: "Pune",
        state: "Maharashtra",
        authority: "PMC / PMRDA",
        code: "MH-12",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [73.715, 18.595],
            [73.745, 18.622],
            [73.795, 18.625],
            [73.855, 18.618],
            [73.915, 18.598],
            [73.955, 18.568],
            [73.962, 18.525],
            [73.948, 18.482],
            [73.905, 18.452],
            [73.855, 18.442],
            [73.795, 18.455],
            [73.755, 18.488],
            [73.728, 18.535],
            [73.715, 18.595],
          ],
        ],
      },
    },
  ],
};
