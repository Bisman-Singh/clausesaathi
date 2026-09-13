/**
 * Synthetic sample documents for the demo. Every party, address, amount and
 * date is invented. They exist so a visitor can see the product work without
 * pasting anything of their own.
 */

export interface SampleDocument {
  id: string;
  title: { en: string; hi: string };
  text: string;
}

export const RENT_AGREEMENT_V1 = `RENTAL AGREEMENT

This agreement is made on 1 April 2026 between Mr. Example Owner (the Landlord) and Ms. Sample Tenant (the Tenant) for Flat 4B, Example Residency, Sample Nagar, Bengaluru 560001.

1. Term
The tenancy is for eleven months from 1 April 2026. It may be renewed in writing on terms agreed by both parties.

2. Rent
The Tenant shall pay Rs. 18,000 per month on or before the 5th day of each month by bank transfer. Rent unpaid after the 10th attracts interest at 24 percent per annum.

3. Security deposit
The Tenant has paid Rs. 1,80,000 as security deposit. The Landlord will refund it within ninety days after the Tenant vacates, after deducting any dues and painting charges equal to two months rent.

4. Lock-in
Neither party may terminate this agreement during the first six months. If the Tenant leaves earlier, the entire deposit is forfeited.

5. Notice
After the lock-in, either party may terminate by giving one month written notice.

6. Maintenance
The Tenant bears all repairs, including structural repairs, at their own cost.

7. Entry
The Landlord may enter the flat at any time for inspection.

8. Disputes
Any dispute shall be referred to arbitration by a sole arbitrator appointed by the Landlord.`;

export const RENT_AGREEMENT_V2 = `RENTAL AGREEMENT

This agreement is made on 1 April 2026 between Mr. Example Owner (the Landlord) and Ms. Sample Tenant (the Tenant) for Flat 4B, Example Residency, Sample Nagar, Bengaluru 560001.

1. Term
The tenancy is for eleven months from 1 April 2026. It may be renewed in writing on terms agreed by both parties.

2. Rent
The Tenant shall pay Rs. 18,000 per month on or before the 5th day of each month by bank transfer. Rent unpaid after the 15th attracts interest at 12 percent per annum.

3. Security deposit
The Tenant has paid Rs. 54,000 as security deposit. The Landlord will refund it within thirty days after the Tenant vacates, after deducting unpaid rent and the cost of repairing damage beyond normal wear and tear.

4. Notice
Either party may terminate by giving one month written notice.

5. Maintenance
The Landlord bears structural repairs. The Tenant bears minor repairs up to Rs. 2,000 per instance.

6. Entry
The Landlord may enter the flat for inspection with 24 hours prior notice, at a reasonable hour.

7. Disputes
Any dispute shall be referred to the courts at Bengaluru.`;

export const EMPLOYMENT_OFFER = `OFFER OF EMPLOYMENT

Example Technologies Private Limited (the Company) is pleased to offer Mr. Sample Candidate (the Employee) the position of Software Engineer at its Pune office.

1. Compensation
Annual cost to company of Rs. 9,00,000, of which Rs. 1,00,000 is a variable bonus payable at the Company's sole discretion.

2. Probation
The first six months are a probation period. During probation, the Company may terminate employment with seven days notice and without reason.

3. Notice period
After probation, either party must give ninety days written notice. The Company may, at its option, require the Employee to serve the full notice period or pay in lieu. The Employee may not buy out the notice period.

4. Non-compete
For twelve months after leaving, the Employee shall not work for any competitor of the Company anywhere in India.

5. Intellectual property
All work created by the Employee during employment, including work done outside office hours, belongs to the Company.

6. Training bond
If the Employee resigns within two years of joining, the Employee shall repay Rs. 2,00,000 as training costs.

7. Working hours
Standard hours are 9:30 am to 6:30 pm, Monday to Friday. The Employee may be required to work additional hours without extra pay.

8. Acceptance
Please sign and return this letter within five days of its date.`;

export const CONSUMER_TERMS = `FITNESS CLUB MEMBERSHIP TERMS

These terms apply to the twelve month membership purchased by the Member at Example Fitness, Sample Road, Hyderabad.

1. Fees
The annual fee of Rs. 24,000 is payable in full at signing and is non-refundable under all circumstances.

2. Auto-renewal
The membership renews automatically for a further twelve months unless the Member gives written notice at least sixty days before the end of the term. The renewal fee may be revised without notice.

3. Freezing
Membership may be frozen for medical reasons only, on production of a certificate, for a maximum of thirty days per year.

4. Liability
The Club is not liable for any injury, loss or theft on its premises, howsoever caused, including by negligence of its staff.

5. Changes
The Club may change opening hours, facilities and these terms at any time by posting a notice at reception.

6. Complaints
All complaints must be made in writing within seven days of the incident, failing which they will not be entertained.`;

export const LEGAL_NOTICE = `LEGAL NOTICE

To: Ms. Sample Tenant, Flat 4B, Example Residency, Sample Nagar, Bengaluru 560001

Under instructions from my client, Mr. Example Owner, I serve upon you the following notice.

1. My client let out the above flat to you under a rental agreement dated 1 April 2026 at a monthly rent of Rs. 18,000.

2. You have not paid rent for the months of July and August 2026, amounting to Rs. 36,000, despite reminders sent on 8 July 2026 and 9 August 2026.

3. Under clause 5 of the agreement, my client hereby terminates the tenancy. You are called upon to pay the arrears of Rs. 36,000 together with interest at 24 percent per annum and to vacate the flat within fifteen days of receipt of this notice.

4. Should you fail to comply, my client will initiate legal proceedings for recovery of the arrears and for eviction, at your risk as to costs.

Dated 3 September 2026
Example Advocate, Sample Chambers, Bengaluru`;

export const SAMPLES: SampleDocument[] = [
  {
    id: "rent-agreement",
    title: { en: "Rent agreement", hi: "किराया समझौता" },
    text: RENT_AGREEMENT_V1,
  },
  {
    id: "employment-offer",
    title: { en: "Employment offer letter", hi: "नौकरी का प्रस्ताव पत्र" },
    text: EMPLOYMENT_OFFER,
  },
  {
    id: "consumer-terms",
    title: { en: "Gym membership terms", hi: "जिम सदस्यता की शर्तें" },
    text: CONSUMER_TERMS,
  },
  {
    id: "legal-notice",
    title: { en: "Legal notice from a landlord", hi: "मकान मालिक का कानूनी नोटिस" },
    text: LEGAL_NOTICE,
  },
];

export function findSample(id: string): SampleDocument | undefined {
  return SAMPLES.find((sample) => sample.id === id);
}
