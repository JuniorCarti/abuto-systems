"use client";

import { useState } from "react";
import { calculateAskanPharmaPricing, formatKes } from "@/lib/askanpharma-pricing";

const calculatorLimit = 100;

export function AskanPharmaPricingCalculator() {
  const [deviceInput, setDeviceInput] = useState("1");
  const deviceCount = /^\d+$/.test(deviceInput) ? Number(deviceInput) : NaN;
  const pricing = deviceCount <= calculatorLimit ? calculateAskanPharmaPricing(deviceCount) : null;
  const error = pricing ? "" : `Enter a whole number from 1 to ${calculatorLimit}. For larger installations, request a demo.`;

  function adjustDevices(amount: number) {
    if (!pricing) {
      setDeviceInput("1");
      return;
    }
    setDeviceInput(String(Math.min(calculatorLimit, Math.max(1, pricing.devices + amount))));
  }

  return (
    <section className="pricing-calculator" aria-labelledby="device-calculator-title">
      <div className="pricing-calculator-heading">
        <div>
          <span className="eyebrow"><span className="eyebrow-line" />SCALE BY DEVICE</span>
          <h3 id="device-calculator-title">See your total</h3>
          <p>One complete system. Your device count sets the subscription total.</p>
        </div>
        <div className="device-input-group">
          <label htmlFor="pricing-device-count">Number of devices</label>
          <div className="device-stepper">
            <button type="button" aria-label="Remove one device" disabled={Boolean(pricing && pricing.devices <= 1)} onClick={() => adjustDevices(-1)}>−</button>
            <input
              id="pricing-device-count"
              type="number"
              inputMode="numeric"
              min="1"
              max={calculatorLimit}
              step="1"
              value={deviceInput}
              aria-invalid={Boolean(error)}
              aria-describedby="pricing-device-help pricing-device-error"
              onChange={event => setDeviceInput(event.target.value)}
            />
            <button type="button" aria-label="Add one device" disabled={Boolean(pricing && pricing.devices >= calculatorLimit)} onClick={() => adjustDevices(1)}>+</button>
          </div>
          <span id="pricing-device-help" className="pricing-input-help">Enter 1–{calculatorLimit} devices</span>
          <span id="pricing-device-error" className="pricing-input-error" role="status">{error}</span>
        </div>
      </div>

      {pricing ? <div className="pricing-calculator-results" aria-live="polite" aria-atomic="true">
        <div className="pricing-result">
          <span>Monthly</span>
          <strong>{formatKes(pricing.monthlyTotal)}<small>/month</small></strong>
        </div>
        <div className="pricing-result pricing-result-annual">
          <span>Annual</span>
          <strong>{formatKes(pricing.annualTotal)}<small>/year</small></strong>
          <small>{formatKes(pricing.annualSavingsVsMonthly)} less than paying monthly for a year</small>
        </div>
        <div className="pricing-result pricing-result-onboarding">
          <span>Setup &amp; onboarding</span>
          <strong>{pricing.onboardingTotal ? `${formatKes(pricing.onboardingTotal)} one-time` : "FREE"}</strong>
          <small>{pricing.onboardingTotal ? `For ${pricing.devices - 3} device${pricing.devices - 3 === 1 ? "" : "s"} above three` : "For up to 3 devices"}</small>
        </div>
      </div> : null}
    </section>
  );
}
