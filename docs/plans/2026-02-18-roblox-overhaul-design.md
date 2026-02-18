# GoBlox Roblox-Overhaul Design

## Ziel
GoBlox 500x Roblox-ähnlicher machen — UI, Features, Gameplay, Social.

## 10 Parallel Agents

### Agent 1: Homepage Redesign
- Roblox-Layout mit horizontalen Karussells
- Sektionen: "Weiterspielen", "Beliebt", "Empfohlen für dich", "Trending"
- Hero-Banner oben mit Featured Game
- "Alle anzeigen" Links pro Sektion
- Spiele-Grid mit unendlichem Scroll

### Agent 2: Navigation Overhaul
- Roblox-Sidebar: schmale Icons links (Home, Spiele, Erstellen, Avatar, Shop)
- Top-Bar: Logo links, Suchleiste Mitte, GoBux + Notifications + Profil rechts
- Hover-Labels auf Sidebar-Icons
- Active-State Indikator (grüner Balken links)

### Agent 3: Game Cards
- Roblox-Style: 16:9 Thumbnail, abgerundete Ecken oben
- Titel unter dem Bild
- Spieleranzahl mit grünem Punkt "1.2K aktiv"
- Like-Prozent mit Daumen-hoch Icon
- Hover: leichter Scale + Shadow + "Spielen" Overlay

### Agent 4: Game Detail Page
- Großes Hero-Bild/Video oben
- Grüner "Spielen" Button prominent
- Beschreibung, Ersteller-Info, Erstelldatum
- Server-Browser: Liste mit Spieleranzahl pro Server
- Game Passes Sektion zum Kaufen
- Bewertungen/Likes Sektion
- "Ähnliche Spiele" am Ende

### Agent 5: Avatar Editor
- Vollbild Avatar-Editor Seite
- 3D Avatar-Vorschau (drehbar) in der Mitte
- Tabs: Kleidung, Körper, Animationen, Accessoires
- Kategorie-Grid: Hüte, Haare, Gesichter, T-Shirts, Hosen, Schuhe
- Farb-Picker für Körperteile (Kopf, Torso, Arme, Beine)
- "Anziehen" / "Ausziehen" Buttons
- Kostenlos + GoBux-Items gemischt

### Agent 6: Chat System
- Chat-Bar unten rechts (Roblox-Style)
- Freunde-Liste mit Online-Status (grün/gelb/grau)
- 1:1 Chat-Fenster, aufklappbar
- Gruppen-Chat
- Chat-Nachrichten mit Zeitstempel
- "Freund hinzufügen" direkt aus Chat
- Minimierbar/Maximierbar

### Agent 7: Gruppen/Social
- Gruppen-Seite: Erstellen, Beitreten, Verlassen
- Gruppen-Detail: Banner, Beschreibung, Mitgliederliste
- Rollen: Owner, Admin, Member
- Gruppen-Wall (Posts)
- Gruppen-Spiele Sektion
- "Meine Gruppen" in Sidebar

### Agent 8: Store/Marketplace
- Avatar-Shop mit Kategorien (Hüte, Gesichter, etc.)
- Game Passes Marketplace
- GoBux kaufen Seite (simuliert)
- Item-Detail-Seite mit 3D-Vorschau
- "Kaufen" Flow mit Bestätigung
- Inventar-Seite (gekaufte Items)

### Agent 9: Game Experience
- Neues Obby-Template (Hindernisparcours, klassisch Roblox)
- Neues Tycoon-Template (Fabrik bauen, Geld verdienen)
- Verbesserte 3D-Steuerung (WASD + Maus)
- Roblox-typisches HUD: Gesundheit, Inventar, Leaderboard im Spiel
- Respawn-System
- Bessere Kamera (Third-Person follow)

### Agent 10: UX Polish
- Roblox-Ladebildschirm beim Spielstart (Logo + Fortschrittsbalken)
- Toast-Benachrichtigungen (Freundschaftsanfrage, GoBux erhalten)
- Hover-Tooltips überall
- Smooth Scroll-Animationen
- Sound-Effekte (Button-Click, Kaufen, Chat)
- Breadcrumb-Navigation
- 404/Error Seiten im Roblox-Stil

## Technische Constraints
- Alles client-side (kein Backend)
- LocalStorage für Persistenz
- Vanilla JS, kein Framework
- THREE.js für 3D
- Chat/Social = simuliert (localStorage-basiert)
