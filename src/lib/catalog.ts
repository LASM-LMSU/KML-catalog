import type { CatalogData } from "../types";

export async function loadCatalog(): Promise<CatalogData> {
  const response = await fetch("./data/catalog.json", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Не удалось загрузить catalog.json (${response.status})`);
  }

  return response.json() as Promise<CatalogData>;
}

