export interface NameChar {
  char: string;
  pinyin: string;
  meaning: string;
  type: string;
  element: string;
}

export interface NameOption {
  hanzi: string;
  pinyin: string;
  poeticMeaning: string;
  culturalHeritage: { source: string; original: string; translation: string };
  anatomy: NameChar[];
  masterComment: string;
}

export interface ApiResponse {
  names: NameOption[];
}

export interface City {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  timezone: string;
}
