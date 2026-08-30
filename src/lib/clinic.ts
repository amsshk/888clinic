const SRINAKARIN_QUERY =
  "The one clinic 29 ซอย บุษบา แขวงหนองบอน เขตประเวศ กรุงเทพมหานคร 10250";

export const CLINIC = {
  name: "888clinic",
  legalName: "888clinic Dermatology",
  // Primary contact line (Srinakarin, Bangkok)
  phone: "+66 62 646 5322",
  phoneHref: "tel:+66626465322",
  email: "care@888clinic.co",
  address: "888clinic · Srinakarin, Bangkok & Nakhon Pathom, Thailand",
  mapsUrl: "https://maps.app.goo.gl/fA7FeyPQCDGX9UfG6",
  mapsEmbed: `https://www.google.com/maps?q=${encodeURIComponent(SRINAKARIN_QUERY)}&output=embed`,
  branches: [
    {
      id: "srinakarin",
      name: "Srinakarin — Bangkok",
      nameTh: "ศรีนครินทร์ — กรุงเทพฯ",
      address: "29 Soi Butsaba, Nong Bon, Prawet, Bangkok 10250",
      addressTh: "29 ซอยบุษบา แขวงหนองบอน เขตประเวศ กรุงเทพมหานคร 10250",
      phone: "+66 62 646 5322",
      phoneHref: "tel:+66626465322",
      mapsUrl: "https://maps.app.goo.gl/fA7FeyPQCDGX9UfG6",
      mapsEmbed: `https://www.google.com/maps?q=${encodeURIComponent(SRINAKARIN_QUERY)}&output=embed`,
      line: "https://lin.ee/UrwMF4W",
    },
    {
      id: "nakhon-pathom",
      name: "Nakhon Pathom",
      nameTh: "นครปฐม",
      address: "888clinic, Nakhon Pathom, Thailand",
      addressTh: "888clinic นครปฐม ประเทศไทย",
      phone: "+66 81 494 6539",
      phoneHref: "tel:+66814946539",
      mapsUrl: "https://maps.google.com/?q=888+Clinic+Nakhon+Pathom",
      mapsEmbed:
        "https://www.google.com/maps?q=888%20Clinic%20Nakhon%20Pathom&output=embed",
      line: "https://lin.ee/NpQGT7h",
    },
  ],
  socials: {
    line: "https://lin.ee/UrwMF4W",
    facebook: "https://www.facebook.com/share/1DjLzLd1RE/",
    tiktok: "https://www.tiktok.com/@888clinic",
  },
} as const;
