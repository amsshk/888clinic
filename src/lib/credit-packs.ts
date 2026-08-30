export type CreditPack = {
  id: string;
  credits: number;
  amountThb: number;
};

export const DEFAULT_CREDIT_PRICE_ID = "scan_pack_3_thb";

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack-3", credits: 3, amountThb: 500 },
];
