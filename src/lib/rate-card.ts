import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type OfficeFrequency = "oneoff" | "weekly" | "fortnightly" | "monthly" | "daily";

export interface RateCard {
  vatRate: number;
  endOfTenancy: {
    basePrices: {
      studio1bed: number;
      bed2: number;
      bed3: number;
      bed4: number;
      bed5plus: number;
    };
    extraBathroomFee: number;
    addons: {
      carpetCleaning: number;
      ovenClean: number;
      fridgeFreezerClean: number;
      washingMachineClean: number;
      dishwasherClean: number;
      microwaveClean: number;
      exteriorWindowClean: number;
    };
  };
  deepCleaning: {
    calloutFee: number;
    perBedroom: number;
    perToilet: number;
    perWc: number;
    perKitchen: number;
    perLounge: number;
    addons: {
      fridge: number;
      oven: number;
      washingMachine: number;
      microwave: number;
      dishwasher: number;
    };
  };
  officeCleaning: {
    hourlyRate: number;
    minHours: number;
    ratePerSqm: number;
    minChargeSqm: number;
    frequencies: Record<OfficeFrequency, { multiplier: number; visitsPerMonth: number }>;
  };
}

/**
 * Builds the typed rate card from rate_card_items by known `key`
 * strings. Throws if a required key is missing -- since the admin UI
 * only ever edits `value` (never adds/removes rows), a missing key
 * means the seed migration or this accessor has drifted, which should
 * fail loudly rather than silently miscalculate a price.
 */
export async function getRateCard(): Promise<RateCard> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("rate_card_items").select("key, value");
  if (error) throw new Error(error.message);

  const byKey = new Map((data ?? []).map((r) => [r.key, Number(r.value)]));
  const v = (key: string): number => {
    const val = byKey.get(key);
    if (val === undefined) throw new Error(`Missing rate card key: ${key}`);
    return val;
  };

  const freq = (name: string): { multiplier: number; visitsPerMonth: number } => ({
    multiplier: v(`office.freq.${name}.multiplier`),
    visitsPerMonth: v(`office.freq.${name}.visits_per_month`),
  });

  return {
    vatRate: v("general.vat_rate"),
    endOfTenancy: {
      basePrices: {
        studio1bed: v("eot.base.studio_1bed"),
        bed2: v("eot.base.2bed"),
        bed3: v("eot.base.3bed"),
        bed4: v("eot.base.4bed"),
        bed5plus: v("eot.base.5plus_bed"),
      },
      extraBathroomFee: v("eot.extra_bathroom_fee"),
      addons: {
        carpetCleaning: v("eot.addon.carpet_cleaning"),
        ovenClean: v("eot.addon.oven_clean"),
        fridgeFreezerClean: v("eot.addon.fridge_freezer_clean"),
        washingMachineClean: v("eot.addon.washing_machine_clean"),
        dishwasherClean: v("eot.addon.dishwasher_clean"),
        microwaveClean: v("eot.addon.microwave_clean"),
        exteriorWindowClean: v("eot.addon.exterior_window_clean"),
      },
    },
    deepCleaning: {
      calloutFee: v("deep.callout_fee"),
      perBedroom: v("deep.per_bedroom"),
      perToilet: v("deep.per_toilet"),
      perWc: v("deep.per_wc"),
      perKitchen: v("deep.per_kitchen"),
      perLounge: v("deep.per_lounge"),
      addons: {
        fridge: v("deep.addon.fridge"),
        oven: v("deep.addon.oven"),
        washingMachine: v("deep.addon.washing_machine"),
        microwave: v("deep.addon.microwave"),
        dishwasher: v("deep.addon.dishwasher"),
      },
    },
    officeCleaning: {
      hourlyRate: v("office.hourly_rate"),
      minHours: v("office.min_hours"),
      ratePerSqm: v("office.rate_per_sqm"),
      minChargeSqm: v("office.min_charge_sqm"),
      frequencies: {
        oneoff: freq("oneoff"),
        weekly: freq("weekly"),
        fortnightly: freq("fortnightly"),
        monthly: freq("monthly"),
        daily: freq("daily"),
      },
    },
  };
}
