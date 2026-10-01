export const ASKANPHARMA_PRICING = Object.freeze({
  monthlyFirstDevice: 1_500,
  monthlyAdditionalDevice: 500,
  annualFirstDevice: 15_000,
  annualAdditionalDevice: 5_000,
  freeOnboardingDevices: 3,
  additionalDeviceOnboarding: 500,
  maximumDevices: 10_000,
});

export type AskanPharmaPricing = {
  devices: number;
  monthlyTotal: number;
  annualTotal: number;
  annualSavingsVsMonthly: number;
  onboardingTotal: number;
};

export function calculateAskanPharmaPricing(devices: unknown): AskanPharmaPricing | null {
  if (typeof devices !== "number" || !Number.isSafeInteger(devices)
    || devices < 1 || devices > ASKANPHARMA_PRICING.maximumDevices) return null;

  const additionalDevices = devices - 1;
  const monthlyTotal = ASKANPHARMA_PRICING.monthlyFirstDevice
    + additionalDevices * ASKANPHARMA_PRICING.monthlyAdditionalDevice;
  const annualTotal = ASKANPHARMA_PRICING.annualFirstDevice
    + additionalDevices * ASKANPHARMA_PRICING.annualAdditionalDevice;

  return {
    devices,
    monthlyTotal,
    annualTotal,
    annualSavingsVsMonthly: monthlyTotal * 12 - annualTotal,
    onboardingTotal: Math.max(0, devices - ASKANPHARMA_PRICING.freeOnboardingDevices)
      * ASKANPHARMA_PRICING.additionalDeviceOnboarding,
  };
}

export function formatKes(amount: number): string {
  return `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(amount)}`;
}
