"use client";

import { useState, type ReactElement, type FormEvent } from "react";

// ---------------------------------------------------------------------------
// Question definitions — data-driven, one array drives the entire form.
// ---------------------------------------------------------------------------

type QuestionType = "radio" | "checkbox" | "text" | "textarea" | "date";

interface Question {
  id: string;
  section: string;
  number: number;
  text: string;
  type: QuestionType;
  options?: readonly string[];
  required?: boolean;
}

const QUESTIONS: readonly Question[] = [
  // ── Section 1A: Chef status ──
  { id: "q_001", section: "1A — Chef status & flexibility", number: 1, text: "Can chefs decline booking requests?", type: "radio", options: ["Yes, freely", "Yes, but repeated declines may affect future matching", "Only in exceptional circumstances", "No", "To be decided"], required: true },
  { id: "q_002", section: "1A — Chef status & flexibility", number: 2, text: "Can chefs set their own availability?", type: "radio", options: ["Yes", "Partially — within Chefmate-defined operating times", "No", "To be decided"], required: true },
  { id: "q_003", section: "1A — Chef status & flexibility", number: 3, text: "Can chefs temporarily pause their profiles?", type: "radio", options: ["Yes, at any time", "Yes, subject to existing accepted bookings", "Only with Chefmate approval", "No", "To be decided"], required: true },
  { id: "q_004", section: "1A — Chef status & flexibility", number: 4, text: "Can chefs take periods of leave or become temporarily unavailable?", type: "radio", options: ["Yes, provided accepted bookings are honoured", "Yes, with advance notice to Chefmate", "Only with Chefmate approval", "To be decided"], required: true },
  { id: "q_005", section: "1A — Chef status & flexibility", number: 5, text: "Once onboarded, does a chef automatically receive access to bookings?", type: "radio", options: ["Yes", "No — Chefmate retains discretion to approve or reject activation", "Conditional upon verification being completed", "To be decided"], required: true },
  { id: "q_006", section: "1A — Chef status & flexibility", number: 6, text: "Additional comments regarding chef independence or flexibility", type: "textarea" },

  // ── Section 1B: Chef eligibility ──
  { id: "q_007", section: "1B — Chef eligibility & qualifications", number: 7, text: "What minimum qualification requirement should apply?", type: "radio", options: ["Formal culinary qualification required", "Formal qualification preferred but relevant experience may suffice", "Experience alone may suffice", "No formal minimum; Chefmate assesses suitability individually", "To be decided"], required: true },
  { id: "q_008", section: "1B — Chef eligibility & qualifications", number: 8, text: "Should food safety certification be mandatory?", type: "radio", options: ["Yes", "Preferred but not mandatory", "No", "To be decided"], required: true },
  { id: "q_009", section: "1B — Chef eligibility & qualifications", number: 9, text: "Can sufficient professional cooking experience substitute for formal qualifications?", type: "radio", options: ["Yes", "No", "Case-by-case", "To be decided"], required: true },
  { id: "q_010", section: "1B — Chef eligibility & qualifications", number: 10, text: "How should chef qualifications be verified?", type: "radio", options: ["Document review only", "Independent verification with the issuing institution where possible", "Both document review and independent verification", "To be decided"], required: true },
  { id: "q_011", section: "1B — Chef eligibility & qualifications", number: 11, text: "Should Chefmate conduct ongoing re-verification of chefs?", type: "radio", options: ["Yes", "Only when a certificate expires", "Only where a concern arises", "No", "To be decided"], required: true },
  { id: "q_012", section: "1B — Chef eligibility & qualifications", number: 12, text: "If ongoing verification is required, how frequently?", type: "radio", options: ["Every 6 months", "Annually", "Every 2 years", "When relevant documentation expires", "Other / To be decided"] },

  // ── Section 1C: Booking acceptance ──
  { id: "q_013", section: "1C — Booking acceptance & chef cancellations", number: 13, text: "Once a chef accepts a booking, are they expected to fulfil it?", type: "radio", options: ["Yes, except emergencies or exceptional circumstances", "Yes, with very limited exceptions", "No", "To be decided"], required: true },
  { id: "q_014", section: "1C — Booking acceptance & chef cancellations", number: 14, text: "How should repeated chef cancellations be handled?", type: "radio", options: ["Case-by-case only", "Warning after repeated cancellations", "Temporary suspension after repeated cancellations", "Removal after a defined number of cancellations", "To be decided"], required: true },
  { id: "q_015", section: "1C — Booking acceptance & chef cancellations", number: 15, text: "How many unjustified chef cancellations should trigger formal action?", type: "text" },
  { id: "q_016", section: "1C — Booking acceptance & chef cancellations", number: 16, text: "Additional comments regarding chef cancellations", type: "textarea" },

  // ── Section 1D: Pricing ──
  { id: "q_017", section: "1D — Pricing model", number: 17, text: "Who determines the customer price?", type: "radio", options: ["Chefmate", "Individual chefs", "Chefmate sets pricing bands and chefs choose within them", "Combination of Chefmate and chef input", "To be decided"], required: true },
  { id: "q_018", section: "1D — Pricing model", number: 18, text: "If Chefmate sets prices, how should pricing generally be calculated?", type: "textarea" },
  { id: "q_019", section: "1D — Pricing model", number: 19, text: "Can Chefmate run discounts or promotions without individual chef approval?", type: "radio", options: ["Yes", "Yes, provided chef earnings are unaffected", "Only with participating chef approval", "No", "To be decided"], required: true },
  { id: "q_020", section: "1D — Pricing model", number: 20, text: "Who should normally bear the cost of Chefmate promotions?", type: "radio", options: ["Chefmate", "Chef", "Shared between Chefmate and chef", "Depends on the promotion", "To be decided"] },

  // ── Section 1E: Commission ──
  { id: "q_021", section: "1E — Commission, payments & refunds", number: 21, text: "What commission or platform fee model will Chefmate use?", type: "radio", options: ["Flat percentage", "Variable percentage", "Fixed Rand fee", "Combination of percentage and fixed fee", "Other / To be decided"], required: true },
  { id: "q_022", section: "1E — Commission, payments & refunds", number: 22, text: "What percentage or amount should apply?", type: "text" },
  { id: "q_023", section: "1E — Commission, payments & refunds", number: 23, text: "When should chefs be paid?", type: "radio", options: ["Immediately after a completed booking", "Within 24–48 hours", "Weekly", "Fortnightly", "Monthly", "Other / To be decided"] },
  { id: "q_024", section: "1E — Commission, payments & refunds", number: 24, text: "Should payment only be released once the booking is marked complete?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_025", section: "1E — Commission, payments & refunds", number: 25, text: "If a customer successfully reverses or charges back a payment, who should normally bear the loss?", type: "radio", options: ["Chefmate", "Chef", "Shared", "Determined case-by-case based on fault", "To be decided"] },
  { id: "q_026", section: "1E — Commission, payments & refunds", number: 26, text: "Additional payment or payout rules", type: "textarea" },

  // ── Section 1F: Service standards ──
  { id: "q_027", section: "1F — Service standards", number: 27, text: "Which minimum standards should every Chefmate chef be required to meet?", type: "checkbox", options: ["Punctuality", "Professional appearance", "Respectful communication", "Proper food handling and hygiene", "Following customer instructions", "Cleaning the cooking area after the service", "Appropriate behaviour inside customer homes", "Accurate communication regarding delays or issues", "Other"] },
  { id: "q_028", section: "1F — Service standards", number: 28, text: "What should Chefmate's minimum service standard be known for?", type: "textarea" },

  // ── Section 1G: Ratings ──
  { id: "q_029", section: "1G — Ratings & reviews", number: 29, text: "Should customers be able to rate chefs?", type: "radio", options: ["Yes", "No", "To be decided"], required: true },
  { id: "q_030", section: "1G — Ratings & reviews", number: 30, text: "Should chef ratings be visible publicly to customers?", type: "radio", options: ["Yes", "No — internal quality control only", "Selected information only", "To be decided"] },
  { id: "q_031", section: "1G — Ratings & reviews", number: 31, text: "What minimum rating should generally be considered acceptable?", type: "text" },
  { id: "q_032", section: "1G — Ratings & reviews", number: 32, text: "Should falling below the minimum rating automatically suspend a chef?", type: "radio", options: ["Yes", "No — it should trigger a review", "Only after a minimum number of ratings", "To be decided"] },

  // ── Section 1H: Food safety ──
  { id: "q_033", section: "1H — Food safety", number: 33, text: "How should food-safety complaints be handled?", type: "radio", options: ["Internal investigation by Chefmate", "Chef response plus internal review", "Independent investigation where serious", "Case-by-case depending on severity", "To be decided"] },
  { id: "q_034", section: "1H — Food safety", number: 34, text: "Should a serious food-safety complaint result in temporary suspension while investigated?", type: "radio", options: ["Yes", "No", "Case-by-case", "To be decided"] },

  // ── Section 1I: Insurance ──
  { id: "q_035", section: "1I — Insurance & liability", number: 35, text: "Should individual chefs be required to carry insurance?", type: "radio", options: ["Yes", "No", "Recommended but not mandatory", "To be decided"] },
  { id: "q_036", section: "1I — Insurance & liability", number: 36, text: "Should Chefmate obtain separate platform/business liability insurance?", type: "radio", options: ["Yes", "No", "To be investigated", "To be decided"] },
  { id: "q_037", section: "1I — Insurance & liability", number: 37, text: "For losses caused directly by a chef's negligence or misconduct, who should primarily carry the risk?", type: "radio", options: ["Chef", "Chefmate", "Shared depending on circumstances", "To be decided with legal counsel"] },
  { id: "q_038", section: "1I — Insurance & liability", number: 38, text: "Additional comments regarding food poisoning, injury, negligence or property damage", type: "textarea" },

  // ── Section 1J: Customer data ──
  { id: "q_039", section: "1J — Customer data & confidentiality", number: 39, text: "May chefs retain customer contact or address information after a booking is completed?", type: "radio", options: ["No", "Only information stored within the Chefmate platform", "Yes, with customer consent", "Yes", "To be decided"] },
  { id: "q_040", section: "1J — Customer data & confidentiality", number: 40, text: "Should chefs be prohibited from using customer information for purposes unrelated to the booking?", type: "radio", options: ["Yes", "No", "To be decided"] },

  // ── Section 1K: Off-platform ──
  { id: "q_041", section: "1K — Off-platform bookings", number: 41, text: "Should chefs be prohibited from taking direct bookings from customers introduced through Chefmate?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_042", section: "1K — Off-platform bookings", number: 42, text: "Should off-platform payments between a Chefmate-introduced customer and chef be prohibited?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_043", section: "1K — Off-platform bookings", number: 43, text: "How long should the non-circumvention restriction continue?", type: "radio", options: ["6 months", "12 months", "24 months", "Only while the chef is active on Chefmate", "Other / To be decided"] },

  // ── Section 1L: Suspension ──
  { id: "q_044", section: "1L — Suspension & termination", number: 44, text: "Which conduct should potentially result in a warning?", type: "textarea" },
  { id: "q_045", section: "1L — Suspension & termination", number: 45, text: "Which conduct should potentially result in temporary suspension?", type: "textarea" },
  { id: "q_046", section: "1L — Suspension & termination", number: 46, text: "Which conduct should justify immediate permanent removal?", type: "textarea" },

  // ── Section 2A: Identity ──
  { id: "q_047", section: "2A — Identity & verification", number: 47, text: "What identity documents should chefs provide?", type: "radio", options: ["ID only", "ID plus proof of address", "ID plus proof of address and additional verification", "Other / To be decided"] },
  { id: "q_048", section: "2A — Identity & verification", number: 48, text: "Should background checks be mandatory?", type: "radio", options: ["Yes", "No", "Case-by-case", "To be decided"] },
  { id: "q_049", section: "2A — Identity & verification", number: 49, text: "What types of criminal convictions should automatically disqualify a chef?", type: "checkbox", options: ["Violent offences", "Sexual offences", "Theft/fraud/dishonesty offences", "Serious drug-related offences", "Offences involving children or vulnerable persons", "Any criminal conviction", "No automatic exclusion; assess individually", "Other / To be decided"] },

  // ── Section 2B-2E: Verification through Digital ──
  { id: "q_050", section: "2B — Qualification verification", number: 50, text: "How should qualifications be verified?", type: "radio", options: ["Document review only", "Direct verification with awarding institution", "Both where possible", "To be decided"] },
  { id: "q_051", section: "2C — Personal information & POPIA", number: 51, text: "What information should Chefmate collect from chefs during onboarding?", type: "checkbox", options: ["Full name", "ID number", "Date of birth", "Residential address", "Phone number", "Email address", "Banking information", "Qualifications", "Employment / cooking experience", "Food-safety certificates", "Background-check information", "Profile photograph", "Emergency contact", "Other"] },
  { id: "q_052", section: "2C — Personal information & POPIA", number: 52, text: "What documents should be mandatory before activation?", type: "textarea" },
  { id: "q_053", section: "2D — Food-safety declarations", number: 53, text: "How frequently should food-safety certificates or declarations be reviewed?", type: "radio", options: ["Every 6 months", "Annually", "On certificate expiry", "Only where a concern arises", "To be decided"] },
  { id: "q_054", section: "2D — Food-safety declarations", number: 54, text: "Should chefs have a continuing obligation to disclose new criminal convictions?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_055", section: "2D — Food-safety declarations", number: 55, text: "Should chefs have a continuing obligation to disclose expired, suspended or revoked qualifications/certifications?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_056", section: "2E — Digital onboarding", number: 56, text: "Should onboarding and acceptance of Chefmate policies be completed digitally through the platform?", type: "radio", options: ["Yes", "No", "Combination of digital and manual onboarding", "To be decided"] },

  // ── Section 3: Code of Conduct (condensed) ──
  { id: "q_057", section: "3A — Brand & professionalism", number: 57, text: "In a few words, what should customers associate with the Chefmate brand?", type: "textarea" },
  { id: "q_058", section: "3A — Brand & professionalism", number: 58, text: "What minimum customer-service expectations should apply to chefs?", type: "textarea" },
  { id: "q_059", section: "3B — Hygiene & food handling", number: 59, text: "Should Chefmate publish specific mandatory hygiene standards?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_060", section: "3B — Hygiene & food handling", number: 60, text: "Which hygiene standards should be mandatory?", type: "textarea" },
  { id: "q_061", section: "3C — Communication", number: 61, text: "How quickly should chefs respond to booking-related customer messages during reasonable hours?", type: "radio", options: ["Within 15 minutes", "Within 30 minutes", "Within 1 hour", "Within 2 hours", "As soon as reasonably possible", "To be decided"] },
  { id: "q_062", section: "3D — Punctuality", number: 62, text: "How much lateness without prior communication should be considered unacceptable?", type: "radio", options: ["More than 5 minutes", "More than 10 minutes", "More than 15 minutes", "More than 30 minutes", "Case-by-case", "To be decided"] },
  { id: "q_063", section: "3D — Punctuality", number: 63, text: "Should lateness affect ratings, disciplinary action, or both?", type: "radio", options: ["Rating only", "Disciplinary action only", "Both", "Case-by-case", "To be decided"] },
  { id: "q_064", section: "3E — Conduct inside customer homes", number: 64, text: "Should chefs be required to clean the kitchen/work area they used before leaving?", type: "radio", options: ["Yes", "No", "Only basic clean-up", "To be decided"] },
  { id: "q_065", section: "3E — Conduct inside customer homes", number: 65, text: "What other house rules should apply while chefs are in customer homes?", type: "textarea" },
  { id: "q_066", section: "3F — Photography & social media", number: 66, text: "May chefs take photographs during a booking?", type: "radio", options: ["No", "Yes, only with customer permission", "Yes, but never identifiable customer/private information", "To be decided"] },
  { id: "q_067", section: "3F — Photography & social media", number: 67, text: "May chefs post photographs from customer bookings on social media?", type: "radio", options: ["No", "Yes, with explicit customer permission", "Yes, subject to Chefmate approval and customer permission", "To be decided"] },
  { id: "q_068", section: "3G — Serious misconduct", number: 68, text: "Which conduct should justify immediate removal from Chefmate?", type: "checkbox", options: ["Harassment", "Discrimination", "Violence or threats", "Theft", "Fraud or dishonesty", "Substance abuse during a booking", "Serious unsafe food handling", "Deliberate property damage", "Serious breach of customer privacy", "Sexual misconduct", "Other"] },
  { id: "q_069", section: "3G — Serious misconduct", number: 69, text: "Except for serious misconduct, should chefs normally receive an opportunity to respond before being permanently removed?", type: "radio", options: ["Yes", "No", "Depends on severity", "To be decided"] },

  // ── Section 4: Customer T&Cs ──
  { id: "q_070", section: "4A — Chefmate's role", number: 70, text: "Confirm Chefmate's intended role:", type: "radio", options: ["Chefmate is a technology marketplace connecting customers with independent chefs", "Chefmate directly provides chef/catering services", "Other / To be decided"] },
  { id: "q_071", section: "4A — Chefmate's role", number: 71, text: "Should all marketing material be required to remain consistent with Chefmate's marketplace/platform role?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_072", section: "4B — Booking confirmation", number: 72, text: "When should a booking become legally confirmed?", type: "radio", options: ["Once payment is successfully received", "Once a chef accepts the booking", "Only once both payment and chef acceptance have occurred", "Other / To be decided"] },
  { id: "q_073", section: "4C — Customer pricing", number: 73, text: "Who determines customer pricing?", type: "radio", options: ["Chefmate", "Chef", "Chefmate pricing bands", "Other / To be decided"] },
  { id: "q_074", section: "4D — Customer cancellations & refunds", number: 74, text: "What cancellation/refund policy should apply? (Specify for: well in advance, shortly before, on the day, no-show, and exceptional circumstances)", type: "textarea" },
  { id: "q_075", section: "4D — Customer cancellations & refunds", number: 75, text: "Should Chefmate retain discretion to make exceptions for genuine emergencies or exceptional circumstances?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_076", section: "4E — Customer obligations", number: 76, text: "What must customers provide for the chef?", type: "checkbox", options: ["Required groceries/ingredients", "Safe and functioning kitchen", "Electricity", "Water", "Working stove/oven where required", "Basic cookware", "Basic cooking utensils", "Safe access to the property", "Accurate dietary/allergy information", "Other"] },
  { id: "q_077", section: "4E — Customer obligations", number: 77, text: "What should happen if the chef arrives but cannot gain access to the property?", type: "radio", options: ["Booking treated as customer no-show", "Chef waits for a defined grace period", "Chefmate contacts customer before determining outcome", "Case-by-case", "To be decided"] },
  { id: "q_078", section: "4E — Customer obligations", number: 78, text: "How long should the chef reasonably wait before an inaccessible customer is considered a no-show?", type: "text" },
  { id: "q_079", section: "4F — Kitchen suitability", number: 79, text: "May a chef refuse or discontinue service if the kitchen or equipment is unsafe?", type: "radio", options: ["Yes", "No", "Only after contacting Chefmate", "Case-by-case", "To be decided"] },
  { id: "q_080", section: "4F — Kitchen suitability", number: 80, text: "What should happen if essential equipment is broken or unavailable?", type: "textarea" },
  { id: "q_081", section: "4G — Allergies & dietary", number: 81, text: "Must customers disclose allergies and dietary requirements accurately before the booking?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_082", section: "4G — Allergies & dietary", number: 82, text: "Should the customer remain responsible for inaccurate or incomplete allergy information they provide?", type: "radio", options: ["Yes", "No", "Subject to legal advice", "To be decided"] },
  { id: "q_083", section: "4G — Allergies & dietary", number: 83, text: "What should happen if inaccurate allergy information materially affects the service?", type: "textarea" },
  { id: "q_084", section: "4H — Liability", number: 84, text: "What risks should Chefmate accept directly, if any?", type: "textarea" },
  { id: "q_085", section: "4H — Liability", number: 85, text: "What risks should be allocated primarily to the independent chef?", type: "textarea" },
  { id: "q_086", section: "4H — Liability", number: 86, text: "What risks should remain with the customer?", type: "textarea" },
  { id: "q_087", section: "4I — Force majeure", number: 87, text: "How should circumstances outside anyone's reasonable control be handled?", type: "radio", options: ["Reschedule booking", "Customer refund", "Chefmate credit", "Determine case-by-case", "Combination depending on circumstances", "To be decided"] },
  { id: "q_088", section: "4J — Disputes", number: 88, text: "What role should Chefmate play when a dispute arises between a chef and customer?", type: "radio", options: ["Actively mediate", "Facilitate communication only", "Investigate and make a platform decision", "Different approach depending on the dispute", "To be decided"] },

  // ── Section 5: Website/App ToU ──
  { id: "q_089", section: "5A — User eligibility", number: 89, text: "What minimum age should a customer be to create an account or make a booking?", type: "radio", options: ["18", "16", "No defined minimum", "Other / To be decided"] },
  { id: "q_090", section: "5B — Customer verification", number: 90, text: "What customer verification should be required?", type: "checkbox", options: ["Email verification", "Mobile number verification", "Payment-method verification", "Identity verification", "Address verification", "No additional verification", "Other"] },
  { id: "q_091", section: "5C — Prohibited user behaviour", number: 91, text: "Which customer behaviours should permit suspension or termination?", type: "checkbox", options: ["Fraud", "Harassment", "Discrimination", "Abuse of chefs", "Unsafe home environment", "Repeated payment failures", "Repeated chargebacks", "Attempts to bypass Chefmate", "False information", "Misuse of the platform", "Other"] },
  { id: "q_092", section: "5D — Intellectual property", number: 92, text: "Should Chefmate own all platform branding, software, designs and original platform content?", type: "radio", options: ["Yes", "No", "Subject to existing third-party rights/licences", "To be decided"] },
  { id: "q_093", section: "5D — Intellectual property", number: 93, text: "Should users retain ownership of content they upload, while granting Chefmate permission to display/use it for operating the platform?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_094", section: "5E — User-generated content", number: 94, text: "May Chefmate use customer or chef reviews in marketing?", type: "radio", options: ["Yes", "Yes, but anonymised unless permission is obtained", "Only with explicit consent", "No", "To be decided"] },
  { id: "q_095", section: "5E — User-generated content", number: 95, text: "May Chefmate use user-uploaded photographs in marketing?", type: "radio", options: ["Yes", "Only with explicit permission", "No", "To be decided"] },
  { id: "q_096", section: "5F — Two-way ratings", number: 96, text: "Should chefs be allowed to rate/review customers?", type: "radio", options: ["Yes, visible to other chefs", "Yes, internal Chefmate use only", "No", "To be decided"] },
  { id: "q_097", section: "5G — Platform availability", number: 97, text: "Should Chefmate guarantee uninterrupted platform availability or uptime?", type: "radio", options: ["No", "Yes", "Only limited service commitments", "To be decided"] },
  { id: "q_098", section: "5H — Account suspension", number: 98, text: "Who should have authority to suspend or terminate accounts?", type: "radio", options: ["Chefmate management", "Designated operations/admin staff", "Automated system subject to human review", "Combination of the above", "To be decided"] },
  { id: "q_099", section: "5I — Platform liability", number: 99, text: "What platform-related risks should expressly be excluded or limited in the Terms of Use?", type: "textarea" },

  // ── Section 6: Privacy ──
  { id: "q_100", section: "6A — Customer information", number: 100, text: "What personal information will Chefmate collect from customers?", type: "checkbox", options: ["Name", "Email address", "Mobile number", "Residential/service address", "Payment-related information", "Booking history", "Dietary preferences", "Allergy information", "Household information", "Reviews/ratings", "Customer-support communications", "Device/technical information", "Marketing preferences", "Other"] },
  { id: "q_101", section: "6B — Chef information", number: 101, text: "What personal information will Chefmate collect from chefs?", type: "checkbox", options: ["Name", "Contact information", "ID number", "Residential address", "Banking information", "Qualifications", "Certificates", "Work history", "Background-check information", "Profile photograph", "Ratings", "Booking history", "Location/availability information", "Other"] },
  { id: "q_102", section: "6C — Purpose of collection", number: 102, text: "For what purposes will Chefmate process personal information?", type: "checkbox", options: ["Creating accounts", "Matching customers and chefs", "Managing bookings", "Processing payments/payouts", "Customer support", "Safety and verification", "Fraud prevention", "Legal/regulatory compliance", "Service improvement", "Ratings/reviews", "Marketing", "Analytics", "Other"] },
  { id: "q_103", section: "6D — Info shared with chefs (before booking)", number: 103, text: "What customer information should a chef see BEFORE accepting a booking?", type: "checkbox", options: ["Customer first name", "Suburb/general area", "Date and time", "Number of people", "Meal requirements", "Dietary/allergy information", "Exact address", "Phone number", "Other"] },
  { id: "q_104", section: "6D — Info shared with chefs (after booking)", number: 104, text: "What additional customer information should a chef receive AFTER accepting/confirmation?", type: "checkbox", options: ["Full name", "Exact service address", "Phone number", "Booking instructions", "Dietary/allergy information", "Access instructions", "Other"] },
  { id: "q_105", section: "6E — Info shared with customers", number: 105, text: "What chef information should customers see before booking/confirmation?", type: "checkbox", options: ["First name", "Full name", "Profile photograph", "Biography", "Experience", "Qualifications", "Ratings", "Reviews", "Number of completed bookings", "Other"] },
  { id: "q_106", section: "6F — Information storage", number: 106, text: "Where will customer and chef data be stored?", type: "textarea" },
  { id: "q_107", section: "6F — Information storage", number: 107, text: "Which people or roles within Chefmate should have access to personal information?", type: "textarea" },
  { id: "q_108", section: "6G — Data retention (customers)", number: 108, text: "How long should customer account and booking records generally be retained?", type: "radio", options: ["1 year after account closure", "3 years", "5 years", "As long as required for legitimate/legal purposes", "To be determined with legal counsel"] },
  { id: "q_109", section: "6G — Data retention (chefs)", number: 109, text: "How long should chef records generally be retained after a chef leaves the platform?", type: "radio", options: ["1 year", "3 years", "5 years", "As long as required for legitimate/legal purposes", "To be determined with legal counsel"] },
  { id: "q_110", section: "6H — Privacy requests", number: 110, text: "Who should be responsible for handling requests to access, correct or delete personal information?", type: "text" },
  { id: "q_111", section: "6I — Marketing communications", number: 111, text: "Will Chefmate send promotional communications?", type: "checkbox", options: ["Email newsletters", "Promotional emails", "SMS", "WhatsApp", "Push notifications", "No promotional communications", "Other"] },
  { id: "q_112", section: "6I — Marketing communications", number: 112, text: "Should customers be able to opt out of marketing communications at any time?", type: "radio", options: ["Yes", "No", "To be decided"] },
  { id: "q_113", section: "6J — Information Officer", number: 113, text: "Who will act as Chefmate's Information Officer or responsible privacy contact?", type: "text" },
  { id: "q_114", section: "6J — Information Officer", number: 114, text: "What contact details should be published for privacy complaints or requests?", type: "textarea" },
  { id: "q_115", section: "6K — Third-party providers", number: 115, text: "Which payment providers will Chefmate use?", type: "text" },
  { id: "q_116", section: "6K — Third-party providers", number: 116, text: "Which other software/service providers may process Chefmate customer or chef information? (hosting, email, analytics, etc.)", type: "textarea" },

  // ── Final section ──
  { id: "q_117", section: "Final — Outstanding matters", number: 117, text: "Which questions above still require discussion between the directors?", type: "textarea" },
  { id: "q_118", section: "Final — Outstanding matters", number: 118, text: "Which decisions should specifically be referred back to the lawyers for recommendation?", type: "textarea" },
  { id: "q_119", section: "Final — Outstanding matters", number: 119, text: "Are there any Chefmate operational rules not covered by this questionnaire that should be incorporated into the legal agreements?", type: "textarea" },
  { id: "q_120", section: "Final — About you", number: 120, text: "Name of person completing this questionnaire", type: "text", required: true },
  { id: "q_121", section: "Final — About you", number: 121, text: "Role / position", type: "text", required: true },
  { id: "q_122", section: "Final — About you", number: 122, text: "Date completed", type: "date", required: true },
];

// ---------------------------------------------------------------------------
// Group questions by section for rendering
// ---------------------------------------------------------------------------

interface SectionGroup {
  name: string;
  questions: Question[];
}

function groupBySection(questions: readonly Question[]): SectionGroup[] {
  const map = new Map<string, Question[]>();
  for (const q of questions) {
    const existing = map.get(q.section);
    if (existing) {
      existing.push(q);
    } else {
      map.set(q.section, [q]);
    }
  }
  return [...map.entries()].map(([name, qs]) => ({ name, questions: qs }));
}

const SECTIONS = groupBySection(QUESTIONS);

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

const API_URL = "/api/v1/legal-questionnaire";

export default function LegalQuestionnairePage(): ReactElement {
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function setValue(id: string, value: unknown) {
    setResponses((prev) => ({ ...prev, [id]: value }));
  }

  function toggleCheckbox(id: string, option: string) {
    setResponses((prev) => {
      const current = (prev[id] as string[]) ?? [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [id]: next };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses,
          submittedBy: String(responses["q_120"] ?? "Unknown"),
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setStatus("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
    }
  }

  if (status === "done") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-[#7e2422] to-[#5a1816] px-4">
        <div className="max-w-lg rounded-3xl bg-[#f7f2ec] p-10 text-center shadow-2xl">
          <h1 className="font-display text-3xl text-[#7e2422]">Thank you</h1>
          <p className="mt-4 text-[#555] leading-relaxed">
            Your responses have been recorded and emailed to the Chefmate team.
            These answers will be consolidated as Chefmate&apos;s commercial and
            operational instructions for the preparation of its launch legal
            documentation.
          </p>
          <p className="mt-4 text-sm text-[#999]">
            Any items marked &ldquo;To be decided&rdquo; will be identified for
            further discussion before the final agreements and policies are
            approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#f7f2ec] to-white">
      {/* Header */}
      <div className="bg-[#7e2422] px-4 py-12 text-center text-[#f7f2ec] sm:py-20">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#f7f2ec]/70">
          Internal use only
        </p>
        <h1 className="mt-4 font-display text-3xl sm:text-4xl">
          Chefmate Legal &amp; Commercial Decisions Questionnaire
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#f7f2ec]/80">
          This questionnaire records Chefmate&rsquo;s internal commercial and
          operational decisions required for the preparation of its legal
          documents. Please answer based on how Chefmate intends to operate at
          launch. Select <strong>&ldquo;To be decided&rdquo;</strong> rather
          than guessing where a matter is not yet settled.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {SECTIONS.map((section) => (
          <section key={section.name} className="mb-12">
            <h2 className="mb-6 font-display text-xl text-[#7e2422] border-b border-[#7e2422]/15 pb-3">
              {section.name}
            </h2>

            <div className="flex flex-col gap-8">
              {section.questions.map((q) => (
                <fieldset key={q.id} className="flex flex-col gap-2">
                  <legend className="text-sm font-semibold text-[#333]">
                    {q.number}. {q.text}
                    {q.required ? (
                      <span className="ml-1 text-[#7e2422]">*</span>
                    ) : null}
                  </legend>

                  {q.type === "radio" && q.options ? (
                    <div className="flex flex-col gap-1.5">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition ${
                            responses[q.id] === opt
                              ? "border-[#7e2422] bg-[#7e2422]/5 text-[#7e2422] font-semibold"
                              : "border-[#ddd] bg-white text-[#555] hover:border-[#bbb]"
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={responses[q.id] === opt}
                            onChange={() => setValue(q.id, opt)}
                            className="accent-[#7e2422]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {q.type === "checkbox" && q.options ? (
                    <div className="flex flex-col gap-1.5">
                      {q.options.map((opt) => {
                        const selected = (responses[q.id] as string[]) ?? [];
                        return (
                          <label
                            key={opt}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition ${
                              selected.includes(opt)
                                ? "border-[#7e2422] bg-[#7e2422]/5 text-[#7e2422] font-semibold"
                                : "border-[#ddd] bg-white text-[#555] hover:border-[#bbb]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(opt)}
                              onChange={() => toggleCheckbox(q.id, opt)}
                              className="accent-[#7e2422] rounded"
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}

                  {q.type === "text" ? (
                    <input
                      type="text"
                      value={(responses[q.id] as string) ?? ""}
                      onChange={(e) => setValue(q.id, e.target.value)}
                      className="rounded-xl border border-[#ddd] px-4 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:border-[#7e2422] focus:outline-none focus:ring-2 focus:ring-[#7e2422]/20"
                      placeholder="Type your answer…"
                    />
                  ) : null}

                  {q.type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={(responses[q.id] as string) ?? ""}
                      onChange={(e) => setValue(q.id, e.target.value)}
                      className="rounded-xl border border-[#ddd] px-4 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:border-[#7e2422] focus:outline-none focus:ring-2 focus:ring-[#7e2422]/20 resize-y"
                      placeholder="Type your answer…"
                    />
                  ) : null}

                  {q.type === "date" ? (
                    <input
                      type="date"
                      value={(responses[q.id] as string) ?? ""}
                      onChange={(e) => setValue(q.id, e.target.value)}
                      className="rounded-xl border border-[#ddd] px-4 py-2.5 text-sm text-[#333] focus:border-[#7e2422] focus:outline-none focus:ring-2 focus:ring-[#7e2422]/20 w-full max-w-[240px]"
                    />
                  ) : null}
                </fieldset>
              ))}
            </div>
          </section>
        ))}

        {/* Submit */}
        <div className="mt-8 flex flex-col items-center gap-4 border-t border-[#ddd] pt-8">
          {status === "error" ? (
            <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">
              {errorMsg}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="rounded-2xl bg-[#7e2422] px-10 py-3.5 font-display text-base text-white shadow-lg transition hover:bg-[#5a1816] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "submitting" ? "Submitting…" : "Submit questionnaire"}
          </button>

          <p className="text-xs text-[#999]">
            Your responses will be saved and emailed to the Chefmate team.
          </p>
        </div>
      </form>
    </div>
  );
}
