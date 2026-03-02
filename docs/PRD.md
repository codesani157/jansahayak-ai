# Product Requirements Document (PRD): GovGuide (Working Title)

## 1. Problem Statement
Government policies, schemes, and legal documents are notoriously difficult to understand and discover. They are often written in complex legal/bureaucratic jargon and scattered across various unintuitive portals. Consequently, eligible citizens (such as farmers, students, and small business owners) routinely miss out on critical benefits and programs meant for them. There is a massive gap between public information availability and citizen comprehension.

## 2. Target Users
**Primary Audience:** Citizens looking for government schemes, rules, or benefits with low to moderate digital literacy.
- **Farmers:** Seeking crop subsidies, loan waivers, or equipment grants.
- **Students:** Seeking scholarships, educational loans, or exam guidelines.
- **Small Business Owners / General Citizens:** Seeking tax rules, MSME grants, or basic civic procedures (e.g., getting an ID card).

**User Persona Traits:**
- Prefers localized, vernacular languages.
- Prefers lightweight, easily accessible web apps without heavy downloads. 
- Prefers asking direct, natural-language questions over using keyword-based search engines.

## 3. Core User Flows
### Flow A: Web App Onboarding & Role Selection
1. **Trigger:** User opens the web application link on their phone or computer.
2. **Language Selection:** System asks for preferred language (e.g., "Select English, Hindi, etc.").
3. **Role Selection:** System asks for the user's persona (e.g., "Are you a Farmer, Student, or Other?").
4. **Outcome:** The user's profile is saved (via local storage or lightweight account). Subsequent searches are automatically filtered to exclude irrelevant schemes.

### Flow B: Natural Language Querying (The "Explain Like I'm 5" Flow)
1. **Trigger:** User asks a question (via text or voice note), e.g., *"How do I get money for my crops?"*
2. **Processing:** System transcribes voice (if needed), determines intent, and searches the backend database of government schemes.
3. **Response:** System delivers a short, ELI5 (Explain Like I'm 5) summary directly in the chat interface, strictly covering:
   - What the benefit is.
   - Who is eligible.
   - The exact first step to take.

### Flow C: Smart Reminders
1. **Trigger:** A queried scheme relies on an upcoming deadline.
2. **Opt-in:** The system asks, *"The deadline is Dec 31. Do you want me to remind you 3 days before?"* -> User provides a phone number/email and replies "Yes".
3. **Execution:** The system schedules the cron job and pushes an SMS/Email alert on Dec 28.

## 4. Feature List

### Minimum Viable Product (MVP) - V1
- **Web-based Chat Interface:** Primary UI/UX handling text and voice notes via a mobile-responsive web application.
- **Persona-based Filtering:** Basic onboarding to capture the user's role (Farmer, Student, etc.) to heavily filter the search scope.
- **ELI5 Summarization Engine:** LLM integration that converts complex government text into simple, strict bullet points.
- **Multilingual Support:** Support for English plus at least 1-2 major local languages (e.g., Hindi, Tamil) for both input and output.
- **Basic Smart Reminders:** Ability for the user to opt-in for deadline alerts on specific schemes via SMS or email.

### Future Scope (V2+)
- **Application Assistance:** Step-by-step guidance for filling out actual government forms.
- **Document OCR:** Users can upload a photo of an ID (e.g., Aadhar) and the system auto-checks their eligibility.
- **Proactive Discovery:** System pushes new schemes to users based on their persona without them asking.
- **Integration with Gov APIs:** Real-time data fetching and application status tracking via official government APIs.
- **WhatsApp Integration:** Add omnichannel support via WhatsApp and other messaging platforms.

## 5. Edge Cases & Mitigation
- **Vague/Unanswerable Queries:** (e.g., "I want money"). **Mitigation:** The bot should gracefully prompt the user to be specific: *"Are you looking for a business loan, farming subsidy, or student scholarship?"*
- **LLM Hallucinations / Legal Liability:** The AI might invent a fake scheme or misinterpret a law, which is highly dangerous. **Mitigation:** Stick strictly to RAG (Retrieval-Augmented Generation) on a verified government database. Always append a disclaimer: *"This is a simplified guide. Please verify on official portals."*
- **Mixed Dialects:** Users sending voice notes blending English and regional languages (Hinglish). **Mitigation:** Use robust, region-specific speech-to-text models capable of handling code-switching.
- **Outdated Knowledge Base:** Government rules change. **Mitigation:** Establish a periodic sync/scraping mechanism to keep the underlying database fresh.
- **Server Load/Downtime:** The web service may go down under high traffic. **Mitigation:** Implement caching, queueing mechanisms and standard fallback "system under maintenance" error screens.

## 6. Non-Goals (Scope Exclusions for V1)
- **NO Native Mobile App:** We operate strictly as a lightweight web app to eliminate app store friction.
- **NO Direct Processing of Applications:** The system will guide the user on *how* to apply, but will not submit the form or process transactions on their behalf.
- **NO Legal/Tax Advice:** The bot is an information aggregator and simplifier, not a certified lawyer or CA.

## 7. Success Metrics
- **User Activation:** % of users who complete the initial onboarding (choose language and role).
- **Task Success Rate:** % of user queries that successfully return a scheme/rule vs. triggering a fallback ("Sorry, I couldn't find information on that").
- **ELI5 Effectiveness (Feedback):** Ratio of "Thumbs up" vs "Thumbs down" the user gives after receiving an answer.
- **Retention (Stickiness):** % of users who return to ask a second, separate question within 30 days.
- **Reminder Opt-in Rate:** % of eligible queries where the user says "Yes" to a deadline reminder.
