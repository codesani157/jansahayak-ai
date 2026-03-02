# UX Screen Breakdown: GovGuide (Modular Web MVP)

## Design Philosophy Statement
The target user faces cognitive overload when looking at typical government portals. The UI must invoke the familiar feeling of an SMS/WhatsApp chat rather than a heavy enterprise application. 

To ensure **scalability, manageability, and efficiency**, the UX is architected purely as a **system of reusable components**. This modular approach prevents code duplication and allows rapid iteration of the conversation flow.

**Core Principles:**
- **Modular Component Library:** Screens are just containers that arrange a limited set of universally reusable components.
- **Zero-Learning Curve:** The primary interface mimics universally understood chat apps. No complex navigation.
- **Progressive Disclosure:** Ask only one thing per view. Let the chat history naturally push older states up.
- **Large Target Areas & High Contrast:** Designed for use standing up, in sunlight, on low-end Android screens (Fitts's Law).

---

## 1. Global Component Library (Reusable UI Blocks)
These modular components form the building blocks of every screen.

### 1.1 Structural Components
- **`App_Header`**: Fixed at the top. Contains Logo/Agent Name, current Language Toggle (`A/अ`), and active Persona Icon (🚜).
- **`Sticky_Bottom_Area`**: Fixed at the bottom. Holds either the `Chat_Input_Bar` or a `Contextual_Action_Container`.
- **`Scrollable_Canvas`**: The main content area that automatically scrolls to the bottom when new items are added.

### 1.2 Chat Building Blocks
- **`System_Bubble_Text`**: Standard left-aligned conversational text bubble from the AI.
- **`User_Bubble_Text`**: Standard right-aligned conversational text bubble from the user.
- **`Quick_Reply_Chip`**: A pill-shaped button (e.g., "Crop Insurance") placed either below a System Bubble or above the Chat Input to allow one-tap responses.
- **`Typing_Indicator`**: A small 'three-dots-bouncing' animation styled as a System Bubble.

### 1.3 Rich Media Cards (In-Chat Widgets)
- **`Selection_Grid`**: A 2x2 or vertically scrolling grid of large, illustrated touch cards used for Language or Persona selection.
- **`ELI5_Scheme_Card`**: A dense, structured left-aligned chat card containing:
  - Big Title.
  - "Explain Like I'm 5" summary text.
  - Checklist (Eligibility / First Step).
  - Attached Action Bar (Remind Me 🔔, Read Official 🌐).

### 1.4 Modals & Overlays
- **`Bottom_Sheet_Modal`**: Slides up over the UI (e.g., for capturing a phone number for reminders) without losing background context.
- **`Toast_Notification`**: Brief, non-blocking feedback banner at the top/bottom (e.g., "Reminder Set!", "Offline").

---

## 2. Screen Composition
Screens are simply states of the **`Scrollable_Canvas`** and **`Sticky_Bottom_Area`**, populated by components.

### Screen 01: Language & Persona Selection (Onboarding State)
**Composition:**
- **Top:** `App_Header` (Minimal mode: Logo only).
- **Canvas:** 
  - `System_Bubble_Text`: "Hello! Which language do you prefer?"
  - `Selection_Grid`: Language toggle cards (English, Hindi, etc.).
  - *Upon selection -> auto-scrolls down to reveal:*
  - `System_Bubble_Text`: "Tell us about yourself to filter out irrelevant schemes."
  - `Selection_Grid`: Persona cards (🚜 Farmer, 🎓 Student, etc.).
- **Bottom:** Empty or hidden `Sticky_Bottom_Area` (Input is driven entirely by tap interactions in the Canvas).

### Screen 02: Primary Chat Interface (Core Hub)
**Composition:**
- **Top:** `App_Header` (Full mode: Persona, Agent Name, Language Toggle).
- **Canvas:**
  - Historical `User_Bubble_Text` and `System_Bubble_Text`.
  - Empty State: If no history, show 3 `Quick_Reply_Chips` to teach the user what to ask.
  - Loading State: Shows `Typing_Indicator`.
- **Bottom:** `Chat_Input_Bar` (Text field + Large Microphone 🎤 Button + implicit Send action).

### Screen 03: Rich Answer State (Scheme Detail)
**Composition:**
- **Top:** `App_Header` (Full mode).
- **Canvas:**
  - `User_Bubble_Text`: "How do I get a tractor loan?"
  - `ELI5_Scheme_Card`: Displaying the "PM Kisan" breakdown with action buttons attached.
  - (Optional) `Quick_Reply_Chips`: "How to apply?", "Am I eligible?" dynamically generated based on the card.
- **Bottom:** `Chat_Input_Bar`.

### Screen 04: Contextual Interruption (Reminder Opt-In Modal)
**Composition:**
- **Base Layer:** The current blurred state of *Screen 03*.
- **Overlay:** `Bottom_Sheet_Modal`.
  - Title: "Never miss a date!"
  - Content: Mobile number input field with numeric keypad auto-focused.
  - Action: Large "Set SMS Reminder" button + "Cancel" text link.
  - *Upon success*: Modal dismisses, drops a `System_Bubble_Text` ("Reminder set for +91 99XXXXXX!") into the chat, and flashes a `Toast_Notification`.

---

## 3. Interaction Logic & Error Handling (Component Level)
By handling errors at the component level, the entire app behaves logically without custom error screens.

- **`Chat_Input_Bar` Error:** 
  - *Trigger:* Spotty network.
  - *Action:* Replaces the Microphone/Send button with a greyed-out state.
  - *Global Action:* Triggers a red `Toast_Notification` ("You are offline.").

- **`System_Bubble_Text` Fallbacks:**
  - *Trigger:* Unclear audio.
  - *Action:* System pushes a new bubble: *"I'm sorry, I couldn't hear that clearly. Could you record that again?"*
  - *Trigger:* No matching schemes.
  - *Action:* System pushes a new bubble: *"I couldn't find a scheme matching that. Are you looking for something else?"* followed immediately by 2-3 `Quick_Reply_Chips` with related topics to avoid a dead-end.

- **`ELI5_Scheme_Card` Feedback:**
  - *Trigger:* User taps Thumbs Up/Down on the card.
  - *Action:* Icon changes color (active state), fires a `Toast_Notification` ("Thanks for the feedback!"). No navigation required.
