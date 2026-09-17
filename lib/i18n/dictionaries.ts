import type { Role } from "@prisma/client"
import type { Locale } from "./locales"

/**
 * Role names, in the same closed set as the Prisma enum, so a member row cannot
 * print a role that no locale has a word for.
 */
export type RoleLabels = Record<Role, string>


/**
 * The interface dictionary.
 *
 * `en` is the source of truth: its shape *is* the `Dictionary` type, so every
 * other language is checked against it at compile time. A key added to English
 * and forgotten in Serbian is a TypeScript error naming the missing property,
 * not a string that silently renders as a raw identifier in production.
 *
 * Two rules the structure follows:
 *
 *   - Keys are grouped by the surface that reads them (`nav`, `header`, `forms`),
 *     not by part of speech. When a screen changes, everything it needs is in one
 *     block rather than scattered across a `nouns`/`verbs` split.
 *   - Nothing here is interpolated with string concatenation at the call site.
 *     A string that takes a value declares a `{placeholder}`, and `format()`
 *     fills it — because word order differs between languages, and a language
 *     that puts the count last cannot be built by gluing fragments together.
 */

export const en = {
  nav: {
    groupLabel: "Navigation",
    closeNavigation: "Close navigation",
    overview: "Overview",
    properties: "Properties",
    bookings: "Bookings",
    calendar: "Calendar",
    expenses: "Expenses",
    analytics: "Financial Analytics",
    team: "Team & Roles",
    billing: "Billing & Subscription",
  },

  header: {
    openNavigation: "Open navigation",
    notifications: "Notifications",
    /** `{count}` is filled by `format`; the count never sits at the end of a
     *  sentence in every language, so it cannot be concatenated at the call site. */
    notificationsWithCount: "Notifications, {count} needing attention",
    settings: "Settings",
    account: "Account",
    fallbackName: "User",
    signOut: "Sign out",
  },

  theme: {
    label: "Theme",
    description: "Applies to the dashboard and sign-in screens.",
    SYSTEM: "System",
    LIGHT: "Light",
    DARK: "Dark",
  },

  language: {
    label: "Language",
    description: "Applies to your account only.",
  },

  common: {
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    delete: "Delete",
    deleting: "Deleting...",
    remove: "Remove",
    removing: "Removing...",
    edit: "Edit",
    view: "View",
    back: "Back",
    add: "Add",
    adding: "Adding...",
    actions: "Actions",
    optional: "optional",
    notPermitted: "Not permitted",
    unlimited: "unlimited",
    unexpectedError: "Something went wrong. Please try again.",
  },

  auth: {
    signIn: "Sign in",
    signingIn: "Signing in...",
    emailLabel: "Email",
    passwordLabel: "Password",
    nameLabel: "Full name",
    createAccount: "Create account",
    creatingAccount: "Creating account...",
    passwordMinLength: "At least 8 characters.",
    confirmPassword: "Confirm password",
    welcomeBack: "Welcome back",
    signInSubtitle: "Sign in to your LodgeTrack account",
    twoFactorTitle: "Two-factor authentication",
    twoFactorSubtitle: "Enter the six-digit code from your authenticator app.",
    authCode: "Authentication code",
    verifyAndSignIn: "Verify and sign in",
    verifying: "Verifying...",
    useDifferentAccount: "Use a different account",
    signingInAs: "Signing in as {email}",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    codeInvalid: "That code is not right. Check your authenticator app and try again.",
    twoFactorUnavailable:
      "Two-factor is enabled on this account but its key cannot be read, so signing in is blocked. An owner of your organization can reset it for you.",
    invalidCredentials: "Invalid email or password.",
    unexpected: "An unexpected error occurred.",
    registerTitle: "Create your account",
    registerSubtitle: "Start tracking your properties in a few seconds.",
    alreadyHaveAccount: "Already have an account?",
    nameOptionalHint: "Optional. You can add it later.",
  },

  forms: {
    property: "Property",
    unit: "Unit",
    unitWholeProperty: "Whole property",
    unitHelp:
      "Booking the whole property blocks every unit at once. A unit can be booked alongside another unit of the same property, but not twice over the same dates.",
    guestName: "Guest name",
    checkIn: "Check-in",
    checkOut: "Check-out",
    status: "Status",
    source: "Source",
    rate: "Total rate in {currency}",
    rateHelp:
      "Leave empty if the rate is not known. Revenue totals skip unpriced stays rather than guessing at them.",
    amount: "Amount in {currency}",
    expenseDate: "Date incurred",
    category: "Category",
    description: "Description",
    expenseDescription: "What was it for?",
    receipt: "Receipt",
    receiptHelp: "PDF, PNG, JPEG or WebP, up to {max} MB. Stored privately — only your organization can open it.",
    receiptReplace: "Choose a file only to replace the receipt already attached.",
    unitName: "New unit name",
    unitKind: "Kind",
    unitKindPlaceholder: "Double room, cabin, bunk",
    name: "Name",
    addresses: "Address",
    addBooking: "Add booking",
    saveChanges: "Save changes",
    needsProperty: "Add a property before creating a booking — every stay belongs to one.",
    checkOutAfterCheckIn: "The check-out date must be on or after the check-in date.",
    chooseDates: "Choose a check-in and check-out date to see which units are free.",
    noUnitSelected: "Whole property",
    fullName: "Full name",
    email: "Email",
    emailLocked: "Email cannot be changed — it identifies the account.",
    saveChangesShort: "Save changes",
    logExpense: "Log expense",
    needsPropertyForExpense: "Add a property before logging a cost — every expense is filed against one.",
    attachedReceipt: "Attached receipt",
    willUpload: "Will upload {name}.",
    propertyName: "Property name",
    address: "Address",
    icalUrl: "iCal URL",
    icalStored: "Stored for reference. Importing from this URL is not built yet.",
    addProperty: "Add property",
    deleting: "Deleting...",
    deletingProperty: "Deleting property...",
  },

  units: {
    title: "Units",
    help: "A unit is one bookable part of a property — a room, a cabin, a bed. A property with none is booked whole.",
    empty: "No units — every booking takes the whole property. Add one to let stays overlap.",
    noKind: "No kind given",
    noneActive: "no active bookings",
    rename: "Rename",
    renameTitle: "Rename {name}",
    renameHelp: "Bookings keep pointing at this unit — only the label changes.",
    saveUnit: "Save unit",
    remove: "Remove",
    removeTitle: "Remove {name}?",
    removeBlocked:
      "It still has {bookings}, so this will be refused until they are moved or cancelled.",
    removeConfirm: "This cannot be undone.",
    removeUnit: "Remove unit",
    addUnit: "Add unit",
  },

  roles: {
    label: "Role",
    labels: { OWNER: "Owner", MANAGER: "Manager", MAINTENANCE: "Maintenance" },
    descriptions: {
      OWNER: "Full access, including billing and organization settings",
      MANAGER: "Can add and edit properties, bookings and team members",
      MAINTENANCE: "Read-only access to properties and bookings",
    },
  },

  team: {
    inviteEmail: "Email address",
    inviteHint:
      "Managers can add and edit properties and bookings. Maintenance has read-only access.",
    createInviteLink: "Create invitation link",
    creatingLink: "Creating link...",
    revoke: "Revoke",
    revoking: "Revoking...",
    invitedAs: "Invited as {role} · expires {date}",
    manage: "Manage",
    manageDescription: "Change this member's role or remove them.",
    unnamed: "Unnamed",
    twoFactorOn: "Two-factor authentication is on",
    saveRole: "Save role",
    resetTwoFactor: "Reset two-factor",
    resetTwoFactorHint:
      "If they have lost their authenticator, clear it so they can set it up again.",
    noTwoFactor: "This member has no second factor set up.",
    clearing: "Clearing...",
    removeHint:
      "Removing them revokes access immediately. Their bookings and properties stay with the organization.",
    removeFromOrganization: "Remove from organization",
  },

  confirm: {
    deletePropertyTitle: "Delete {name}?",
    deletePropertyWithBookings: "This cannot be undone. Its {bookings} will be deleted with it.",
    deletePropertyNoBookings: "This cannot be undone. It has no bookings.",
    deleteProperty: "Delete property",
    deleteBookingTitle: "Delete this booking?",
    deleteBookingBody:
      "The booking for {guest} will be permanently removed and will no longer count towards revenue or occupancy. This cannot be undone.",
    deleteBooking: "Delete booking",
  },

  pages: {
    eyebrows: {
      overview: "Overview",
      operations: "Operations",
      people: "People",
      account: "Account",
      security: "Security",
      portfolio: "Portfolio",
      insights: "Insights",
    },
    notPermitted: "Not permitted",
    dashboard: {
      welcomeBack: "Welcome back",
      welcomeBackName: "Welcome back, {name}",
      happening: "Here\u2019s what\u2019s happening across {org} today.",
      manageProperties: "Manage properties",
      metrics: {
        totalProperties: "Total Properties",
        unlimited: "Unlimited",
        propertyLimit: "{max} property limit",
        propertiesUsed: "Properties used",
        upgradePlan: "Upgrade Plan",
        activeBookings: "Active Bookings",
        staysStartingThisMonth: "Stays starting this month",
        vsLastMonth: "vs last month",
        totalRevenue: "Total Revenue",
        noBookingsThisMonth: "No bookings this month",
        fromBookingsCount: "From {count} booking(s)",
        pricedOfCount: "{priced} of {count} bookings priced",
        occupancyRate: "Occupancy Rate",
        propertiesOccupiedToday: "Properties occupied today",
      },
      recent: {
        viewAll: "View all",
        noPropertiesYet: "No properties yet. Add your first property to get started.",
        noBookingsYet: "No bookings yet. Bookings will appear here when guests reserve your properties.",
        recentProperties: "Recent Properties",
        recentBookings: "Recent Bookings",
        property: "Property",
        status: "Status",
        bookings: "Bookings",
        guest: "Guest",
        dates: "Dates",
        amount: "Amount",
        occupied: "Occupied",
        available: "Available",
      }
    },
    properties: {
      title: "Properties",
      description: "Manage your property portfolio.",
      newTitle: "Add a property",
      newDescription: "This will be the {position} of {total} properties on your plan.",
      editTitle: "Edit property",
      addButton: "Add property",
      viewOnly: "Your role is view-only. Ask an owner or manager to change properties.",
    },
    bookings: {
      title: "Bookings",
      description: "Every stay across your properties, most recent first.",
      newTitle: "New booking",
      newDescription: "Dates and a rate go on the record you own \u2014 nothing is estimated.",
      editTitle: "Edit booking",
      newButton: "New booking",
      viewOnly: "Your role is view-only. Ask an owner or manager to add bookings.",
      viewOnlyEdit: "Your role is view-only. Ask an owner or manager to change this booking.",
      statuses: {
        PENDING: "Pending",
        CONFIRMED: "Confirmed",
        CHECKED_IN: "Checked in",
        CHECKED_OUT: "Checked out",
        CANCELLED: "Cancelled",
      },
      allBookings: "All bookings",
      totalAcrossProperties: "{bookings} across your properties.",
      noBookingsYet: "No bookings yet",
      emptyHelp: "Bookings will appear here when guests reserve your properties.",
      guest: "Guest",
      dates: "Dates",
      amount: "Amount",
      stay: "Stay",
      rate: "Rate",
      notRecorded: "Not recorded",
      perNight: "{amount} per night",
      viewProperty: "View property",
      record: "Record",
      recordHelp: "What this booking was created from.",
      created: "Created",
      reference: "Booking reference",
    },
    calendar: {
      title: "Calendar",
      description: "Every stay in your organization, by month.",
    },
    expenses: {
      title: "Expenses",
      description: "Costs logged against your properties, newest first.",
      newTitle: "Log expense",
      newDescription: "File a cost against the property that incurred it.",
      editTitle: "Edit expense",
      viewOnly: "Your role is view-only. Ask an owner or manager to log expenses.",
      logExpense: "Log expense",
      totalForThisProperty: "Total for this property",
      totalLogged: "Total logged",
      thisMonth: "This month",
      withAReceipt: "With a receipt",
      loggedCosts: "Logged costs",
      nothingLoggedYet: "Nothing logged yet.",
      noExpensesLogged: "No expenses logged",
      noExpensesHelp: "Maintenance, utilities and supplies go here, each with the receipt that backs it up.",
      allProperties: "All properties",
      view: "View",
      date: "Date",
      property: "Property",
      category: "Category",
      descriptionLabel: "Description",
      loggedAcrossProperties: "{expenses} across your properties.",
      loggedForProperty: "{expenses} for {property}.",
      categories: {
        MAINTENANCE: "Maintenance",
        UTILITIES: "Utilities",
        SUPPLIES: "Supplies",
        CLEANING: "Cleaning",
        TAXES: "Taxes",
        INSURANCE: "Insurance",
        OTHER: "Other",
      },
      receipt: "Receipt",
      amount: "Amount",
      actions: "Actions",
      backToExpenses: "Back to expenses",
      costDetails: "Cost details",
      needsProperty: "You need a property first.",
      costDetailsHelp: "Amount, category, date and a description. A receipt is optional.",
      editHelp: "Moving this cost to another property takes it off the old one's page.",
      deleteTitle: "Delete this expense?",
      deleteHelp: "this cannot be undone.",
      deleteWithReceipt: "Its receipt file is deleted as well.",
    },
    analytics: {
      title: "Financial Analytics",
      description: "Detailed revenue reports and occupancy trends.",
    },
    billing: {
      title: "Billing & Subscription",
      description: "Manage your plan and billing details.",
    },
    notifications: {
      title: "Notifications",
      description: "Derived live from your bookings \u2014 nothing is stored or marked as read.",
    },
    settings: {
      title: "Settings",
      description: "Manage your account and organization settings.",
      changePassword: "Change password",
      changePasswordDescription: "Changing it signs out every other session.",
      twoFactor: "Two-factor authentication",
      twoFactorDescription:
        "A one-time code from your authenticator app, on top of your password.",
    },
    team: {
      title: "Team & Roles",
      description: "Manage team members and permissions.",
      inviteTitle: "Invite a member",
      inviteDescription: "Creates a one-time link that lets someone join your organization.",
      inviteButton: "Invite member",
      inviteViewOnly: "Your role is view-only. Ask an owner or manager to invite people.",
      pendingInvitations: "Pending invitations",
    },
  },

  invite: {
    joinTitle: "Join {org}",
    subtitle: "{inviter} invited you as {role}. Choose a password to finish setting up your account.",
    subtitleNoInviter:
      "You have been invited as {role}. Choose a password to finish setting up your account.",
    invalidTitle: "This link cannot be used",
    problemNotFound: "This invitation link is not valid.",
    problemAccepted: "This invitation has already been used.",
    problemRevoked: "This invitation has been revoked.",
    problemExpired: "This invitation has expired.",
    askForNew: "Ask whoever invited you to send a new one, or",
    ifYouHaveAccount: "if you already have an account.",
    yourName: "Your name",
    choosePassword: "Choose a password",
    joining: "Joining...",
    accept: "Accept invitation",
  },

  onboarding: {
    title: "Set up your organization",
    description:
      "Your account is signed in but is not attached to an organization yet. Creating one takes a name and a currency.",
    signedInAs: "Signed in as {email}?",
    useAnotherAccount: "Use another account",
    organizationName: "Organization name",
    organizationNameHelp: "Shown in the dashboard header. You can change it later in Settings.",
    currency: "Currency",
    currencyHelp:
      "Every booking rate in this organization is stored and displayed in this currency.",
    creating: "Creating...",
    createOrganization: "Create organization",
  },

  availability: {
    free: "Free",
    occupied: "Booked",
    wholePropertyBlocked: "Whole property is booked",
    showsFree: "{count} of {total} units free",
    legend: "Availability",
  },
}

/**
 * The contract. Deliberately derived from `en` rather than written out by hand —
 * a hand-written interface and a dictionary drift, and the drift shows up as a
 * missing translation at runtime; deriving it from the dictionary cannot drift.
 *
 * Note that `as const` is *not* applied to `en`: with it, every value would be a
 * literal type (`"Save"`), and Serbian could only satisfy the contract by
 * repeating the English words. Without it, the values widen to `string` and the
 * keys stay checked.
 */
export type Dictionary = typeof en

const sr: Dictionary = {
  nav: {
    groupLabel: "Navigacija",
    closeNavigation: "Zatvori navigaciju",
    overview: "Pregled",
    properties: "Objekti",
    bookings: "Rezervacije",
    calendar: "Kalendar",
    expenses: "Troškovi",
    analytics: "Finansijska analitika",
    team: "Tim i uloge",
    billing: "Naplata i pretplata",
  },

  header: {
    openNavigation: "Otvori navigaciju",
    notifications: "Obaveštenja",
    notificationsWithCount: "Obaveštenja, {count} zahteva pažnju",
    settings: "Podešavanja",
    account: "Nalog",
    fallbackName: "Korisnik",
    signOut: "Odjavi se",
  },

  theme: {
    label: "Tema",
    description: "Primenjuje se na kontrolnu tablu i stranice za prijavu.",
    SYSTEM: "Sistemska",
    LIGHT: "Svetla",
    DARK: "Tamna",
  },

  language: {
    label: "Jezik",
    description: "Primenjuje se samo na vaš nalog.",
  },

  common: {
    save: "Sačuvaj",
    saving: "Čuvanje...",
    cancel: "Otkaži",
    delete: "Obriši",
    deleting: "Brisanje...",
    remove: "Ukloni",
    removing: "Uklanjanje...",
    edit: "Izmeni",
    view: "Prikaži",
    back: "Nazad",
    add: "Dodaj",
    adding: "Dodavanje...",
    actions: "Radnje",
    optional: "opciono",
    notPermitted: "Nemate dozvolu",
    unlimited: "neograničeno",
    unexpectedError: "Došlo je do greške. Pokušajte ponovo.",
  },

  auth: {
    signIn: "Prijavi se",
    signingIn: "Prijava...",
    emailLabel: "Imejl",
    passwordLabel: "Lozinka",
    nameLabel: "Ime i prezime",
    createAccount: "Napravi nalog",
    creatingAccount: "Pravljenje naloga...",
    passwordMinLength: "Najmanje 8 znakova.",
    confirmPassword: "Potvrdite lozinku",
    welcomeBack: "Dobro došli nazad",
    signInSubtitle: "Prijavite se na svoj LodgeTrack nalog",
    twoFactorTitle: "Dvofaktorska autentifikacija",
    twoFactorSubtitle: "Unesite šestocifreni kod iz aplikacije za autentifikaciju.",
    authCode: "Kod za autentifikaciju",
    verifyAndSignIn: "Potvrdi i prijavi se",
    verifying: "Provera...",
    useDifferentAccount: "Koristi drugi nalog",
    signingInAs: "Prijavljujete se kao {email}",
    noAccount: "Nemate nalog?",
    signUp: "Registrujte se",
    codeInvalid: "Taj kod nije ispravan. Proverite aplikaciju za autentifikaciju i pokušajte ponovo.",
    twoFactorUnavailable:
      "Dvofaktorska zaštita je uključena na ovom nalogu, ali se njen ključ ne može pročitati, pa je prijava blokirana. Vlasnik vaše organizacije može da je resetuje.",
    invalidCredentials: "Neispravna imejl adresa ili lozinka.",
    unexpected: "Došlo je do neočekivane greške.",
    registerTitle: "Napravite svoj nalog",
    registerSubtitle: "Počnite da pratite svoje objekte za nekoliko sekundi.",
    alreadyHaveAccount: "Već imate nalog?",
    nameOptionalHint: "Opciono. Možete ga dodati kasnije.",
  },

  forms: {
    property: "Objekat",
    unit: "Jedinica",
    unitWholeProperty: "Ceo objekat",
    unitHelp:
      "Rezervacija celog objekta blokira sve jedinice odjednom. Jedinica može biti rezervisana uz drugu jedinicu istog objekta, ali ne dva puta u istom periodu.",
    guestName: "Ime gosta",
    checkIn: "Prijava",
    checkOut: "Odjava",
    status: "Status",
    source: "Izvor",
    rate: "Ukupna cena u {currency}",
    rateHelp:
      "Ostavite prazno ako cena nije poznata. Ukupan prihod preskače rezervacije bez cene umesto da ih procenjuje.",
    amount: "Iznos u {currency}",
    expenseDate: "Datum nastanka",
    category: "Kategorija",
    description: "Opis",
    expenseDescription: "Na šta se odnosi?",
    receipt: "Račun",
    receiptHelp: "PDF, PNG, JPEG ili WebP, do {max} MB. Čuva se privatno — samo vaša organizacija može da ga otvori.",
    receiptReplace: "Izaberite datoteku samo ako menjate već priloženi račun.",
    unitName: "Naziv nove jedinice",
    unitKind: "Vrsta",
    unitKindPlaceholder: "Dvokrevetna soba, koliba, ležaj",
    name: "Naziv",
    addresses: "Adresa",
    addBooking: "Dodaj rezervaciju",
    saveChanges: "Sačuvaj izmene",
    needsProperty: "Dodajte objekat pre pravljenja rezervacije — svaki boravak pripada jednom.",
    checkOutAfterCheckIn: "Datum odjave mora biti isti ili posle datuma prijave.",
    chooseDates: "Izaberite datume prijave i odjave da vidite koje su jedinice slobodne.",
    noUnitSelected: "Ceo objekat",
    fullName: "Ime i prezime",
    email: "Imejl",
    emailLocked: "Imejl se ne može menjati — po njemu se nalog prepoznaje.",
    saveChangesShort: "Sačuvaj izmene",
    logExpense: "Zabeleži trošak",
    needsPropertyForExpense: "Dodajte objekat pre evidentiranja troška — svaki trošak se knjiži na jedan.",
    attachedReceipt: "Priložen račun",
    willUpload: "Biće otpremljeno: {name}.",
    propertyName: "Naziv objekta",
    address: "Adresa",
    icalUrl: "iCal URL",
    icalStored: "Čuva se samo za referencu. Uvoz sa ovog URL-a još nije napravljen.",
    addProperty: "Dodaj objekat",
    deleting: "Brisanje...",
    deletingProperty: "Brisanje objekta...",
  },

  units: {
    title: "Jedinice",
    help: "Jedinica je jedan deo objekta koji se može rezervisati — soba, koliba, ležaj. Objekat bez jedinica rezerviše se u celosti.",
    empty: "Nema jedinica — svaka rezervacija zauzima ceo objekat. Dodajte jedinicu da se boravci mogu preklapati.",
    noKind: "Vrsta nije navedena",
    noneActive: "nema aktivnih rezervacija",
    rename: "Preimenuj",
    renameTitle: "Preimenuj {name}",
    renameHelp: "Rezervacije i dalje pokazuju na ovu jedinicu — menja se samo naziv.",
    saveUnit: "Sačuvaj jedinicu",
    remove: "Ukloni",
    removeTitle: "Ukloniti {name}?",
    removeBlocked:
      "Još uvek ima {bookings}, pa će ovo biti odbijeno dok se ne prebace ili otkažu.",
    removeConfirm: "Ovo se ne može poništiti.",
    removeUnit: "Ukloni jedinicu",
    addUnit: "Dodaj jedinicu",
  },

  roles: {
    label: "Uloga",
    labels: { OWNER: "Vlasnik", MANAGER: "Menadžer", MAINTENANCE: "Održavanje" },
    descriptions: {
      OWNER: "Pun pristup, uključujući naplatu i podešavanja organizacije",
      MANAGER: "Može da dodaje i menja objekte, rezervacije i članove tima",
      MAINTENANCE: "Pristup samo za čitanje objekata i rezervacija",
    },
  },

  team: {
    inviteEmail: "Email adresa",
    inviteHint:
      "Menadžeri mogu da dodaju i menjaju objekte i rezervacije. Održavanje ima pristup samo za čitanje.",
    createInviteLink: "Napravi link za pozivnicu",
    creatingLink: "Pravljenje linka...",
    revoke: "Opozovi",
    revoking: "Opozivanje...",
    invitedAs: "Pozvan kao {role} · ističe {date}",
    manage: "Upravljaj",
    manageDescription: "Promenite ulogu ovog člana ili ga uklonite.",
    unnamed: "Bez imena",
    twoFactorOn: "Dvofaktorska autentifikacija je uključena",
    saveRole: "Sačuvaj ulogu",
    resetTwoFactor: "Resetuj dvofaktorsku",
    resetTwoFactorHint:
      "Ako su izgubili autentifikator, obrišite ga da bi mogli ponovo da ga podese.",
    noTwoFactor: "Ovaj član nema podešen drugi faktor.",
    clearing: "Brisanje...",
    removeHint:
      "Uklanjanjem se pristup odmah opoziva. Njihove rezervacije i objekti ostaju u organizaciji.",
    removeFromOrganization: "Ukloni iz organizacije",
  },

  confirm: {
    deletePropertyTitle: "Obrisati {name}?",
    deletePropertyWithBookings: "Ovo se ne može poništiti. Njegove {bookings} biće obrisane zajedno sa njim.",
    deletePropertyNoBookings: "Ovo se ne može poništiti. Objekat nema rezervacija.",
    deleteProperty: "Obriši objekat",
    deleteBookingTitle: "Obrisati ovu rezervaciju?",
    deleteBookingBody:
      "Rezervacija za {guest} biće trajno uklonjena i više neće ulaziti u prihod ni popunjenost. Ovo se ne može poništiti.",
    deleteBooking: "Obriši rezervaciju",
  },

  pages: {
    eyebrows: {
      overview: "Pregled",
      operations: "Operacije",
      people: "Ljudi",
      account: "Nalog",
      security: "Bezbednost",
      portfolio: "Portfolio",
      insights: "Uvidi",
    },
    notPermitted: "Nije dozvoljeno",
    dashboard: {
      welcomeBack: "Dobro došli nazad",
      welcomeBackName: "Dobro došli nazad, {name}",
      happening: "Evo šta se danas dešava u organizaciji {org}.",
      manageProperties: "Upravljaj objektima",
      metrics: {
        totalProperties: "Ukupno objekata",
        unlimited: "Neograničeno",
        propertyLimit: "{max} limit objekata",
        propertiesUsed: "Iskorišćeni objekti",
        upgradePlan: "Unapredi paket",
        activeBookings: "Aktivne rezervacije",
        staysStartingThisMonth: "Boravci koji počinju ovog meseca",
        vsLastMonth: "u odnosu na prošli mesec",
        totalRevenue: "Ukupan prihod",
        noBookingsThisMonth: "Nema rezervacija ovog meseca",
        fromBookingsCount: "Zasnovano na {count} rezervaciji",
        pricedOfCount: "{priced} od {count} rezervacija procenjeno",
        occupancyRate: "Stopa popunjenosti",
        propertiesOccupiedToday: "Popunjeni objekti danas",
      },
      recent: {
        viewAll: "Prikaži sve",
        noPropertiesYet: "U ovom trenutku nema objekata. Dodajte svoj prvi objekat da započnete.",
        noBookingsYet: "Trenutno nema rezervacija. Rezervacije će se pojaviti ovde kada gosti rezervišu vaše objekte.",
        recentProperties: "Nedavni objekti",
        recentBookings: "Nedavne rezervacije",
        property: "Objekat",
        status: "Status",
        bookings: "Rezervacije",
        guest: "Gost",
        dates: "Datumi",
        amount: "Iznos",
        occupied: "Zauzeto",
        available: "Slobodno",
      }
    },
    properties: {
      title: "Objekti",
      description: "Upravljajte svojim portfolijom objekata.",
      newTitle: "Dodaj objekat",
      newDescription: "Ovo će biti {position}. od {total} objekata na vašem planu.",
      editTitle: "Izmeni objekat",
      addButton: "Dodaj objekat",
      viewOnly: "Vaša uloga je samo za čitanje. Zamolite vlasnika ili menadžera da izmeni objekte.",
    },
    bookings: {
      title: "Rezervacije",
      description: "Sva boravka u vašim objektima, najnovija prva.",
      newTitle: "Nova rezervacija",
      newDescription: "Datumi i cena idu u zapis koji je vaš \u2014 ništa se ne procenjuje.",
      editTitle: "Izmeni rezervaciju",
      newButton: "Nova rezervacija",
      viewOnly: "Vaša uloga je samo za čitanje. Zamolite vlasnika ili menadžera da doda rezervacije.",
      statuses: {
        PENDING: "Na čekanju",
        CONFIRMED: "Potvrđena",
        CHECKED_IN: "Prijavljen",
        CHECKED_OUT: "Odjavljen",
        CANCELLED: "Otkazana",
      },
      viewOnlyEdit:
        "Vaša uloga je samo za čitanje. Zamolite vlasnika ili menadžera da izmeni ovu rezervaciju.",
      allBookings: "Sve rezervacije",
      totalAcrossProperties: "{bookings} u vašim objektima.",
      noBookingsYet: "Još nema rezervacija",
      emptyHelp: "Rezervacije će se pojaviti ovde kada gosti rezervišu vaše objekte.",
      guest: "Gost",
      dates: "Datumi",
      amount: "Iznos",
      stay: "Boravak",
      rate: "Cena",
      notRecorded: "Nije zabeleženo",
      perNight: "{amount} po noći",
      viewProperty: "Prikaži objekat",
      record: "Zapis",
      recordHelp: "Podaci na osnovu kojih je rezervacija nastala.",
      created: "Kreirano",
      reference: "Referenca rezervacije",
    },
    calendar: {
      title: "Kalendar",
      description: "Sva boravka u vašoj organizaciji, po mesecima.",
    },
    expenses: {
      title: "Troškovi",
      description: "Troškovi knjiženi na vaše objekte, najnoviji prvi.",
      newTitle: "Zabeleži trošak",
      newDescription: "Knjižite trošak na objekat na kome je nastao.",
      editTitle: "Izmeni trošak",
      viewOnly: "Vaša uloga je samo za čitanje. Zamolite vlasnika ili menadžera da knjiži troškove.",
      logExpense: "Zabeleži trošak",
      totalForThisProperty: "Ukupno za ovaj objekat",
      totalLogged: "Ukupno zabeleženo",
      thisMonth: "Ovog meseca",
      withAReceipt: "Sa računom",
      loggedCosts: "Zabeleženi troškovi",
      nothingLoggedYet: "Još uvek nema troškova.",
      noExpensesLogged: "Nema zabeleženih troškova",
      noExpensesHelp: "Održavanje, komunalije i materijal idu ovde, svaki sa računom kao dokazom.",
      allProperties: "Svi objekti",
      view: "Prikaži",
      date: "Datum",
      property: "Objekat",
      category: "Kategorija",
      descriptionLabel: "Opis",
      loggedAcrossProperties: "{expenses} u vašim objektima.",
      loggedForProperty: "{expenses} za objekat {property}.",
      categories: {
        MAINTENANCE: "Održavanje",
        UTILITIES: "Komunalije",
        SUPPLIES: "Materijal",
        CLEANING: "Čišćenje",
        TAXES: "Porezi",
        INSURANCE: "Osiguranje",
        OTHER: "Ostalo",
      },
      receipt: "Račun",
      amount: "Iznos",
      actions: "Akcije",
      backToExpenses: "Nazad na troškove",
      costDetails: "Detalji troška",
      needsProperty: "Prvo morate dodati objekat.",
      costDetailsHelp: "Iznos, kategorija, datum i opis. Račun je opcioni.",
      editHelp: "Premeštanje ovog troška na drugi objekat uklanja ga sa stranice starog.",
      deleteTitle: "Brisanje ovog troška?",
      deleteHelp: "ovo se ne može opozvati.",
      deleteWithReceipt: "Priloženi račun će takođe biti obrisan.",
    },
    analytics: {
      title: "Finansijska analitika",
      description: "Detaljni izveštaji o prihodu i trendovi popunjenosti.",
    },
    billing: {
      title: "Naplata i pretplata",
      description: "Upravljajte planom i podacima za naplatu.",
    },
    notifications: {
      title: "Obaveštenja",
      description: "Izvedeno uživo iz vaših rezervacija \u2014 ništa se ne čuva niti označava kao pročitano.",
    },
    settings: {
      title: "Podešavanja",
      description: "Upravljajte nalogom i podešavanjima organizacije.",
      changePassword: "Promeni lozinku",
      changePasswordDescription: "Promenom se odjavljuju sve ostale sesije.",
      twoFactor: "Dvofaktorska autentifikacija",
      twoFactorDescription:
        "Jednokratni kod iz aplikacije za autentifikaciju, povrh vaše lozinke.",
    },
    team: {
      title: "Tim i uloge",
      description: "Upravljajte članovima tima i dozvolama.",
      inviteTitle: "Pozovi člana",
      inviteDescription: "Pravi jednokratni link preko kog neko može da se pridruži organizaciji.",
      inviteButton: "Pozovi člana",
      inviteViewOnly: "Vaša uloga je samo za čitanje. Zamolite vlasnika ili menadžera da pozove ljude.",
      pendingInvitations: "Pozivnice na čekanju",
    },
  },

  invite: {
    joinTitle: "Pridružite se: {org}",
    subtitle: "{inviter} vas je pozvao kao {role}. Izaberite lozinku da dovršite podešavanje naloga.",
    subtitleNoInviter:
      "Pozvani ste kao {role}. Izaberite lozinku da dovršite podešavanje naloga.",
    invalidTitle: "Ovaj link se ne može iskoristiti",
    problemNotFound: "Ovaj link za pozivnicu nije važeći.",
    problemAccepted: "Ova pozivnica je već iskorišćena.",
    problemRevoked: "Ova pozivnica je opozvana.",
    problemExpired: "Ova pozivnica je istekla.",
    askForNew: "Zamolite onoga ko vas je pozvao da pošalje novu, ili",
    ifYouHaveAccount: "ako već imate nalog.",
    yourName: "Vaše ime",
    choosePassword: "Izaberite lozinku",
    joining: "Pridruživanje...",
    accept: "Prihvati pozivnicu",
  },

  onboarding: {
    title: "Podesite svoju organizaciju",
    description:
      "Vaš nalog je prijavljen, ali još nije povezan sa organizacijom. Za kreiranje su potrebni naziv i valuta.",
    signedInAs: "Prijavljeni ste kao {email}?",
    useAnotherAccount: "Koristi drugi nalog",
    organizationName: "Naziv organizacije",
    organizationNameHelp:
      "Prikazuje se u zaglavlju kontrolne table. Možete ga promeniti kasnije u Podešavanjima.",
    currency: "Valuta",
    currencyHelp: "Svaka cena rezervacije u ovoj organizaciji se čuva i prikazuje u ovoj valuti.",
    creating: "Kreiranje...",
    createOrganization: "Kreiraj organizaciju",
  },

  availability: {
    free: "Slobodno",
    occupied: "Zauzeto",
    wholePropertyBlocked: "Ceo objekat je rezervisan",
    showsFree: "{count} od {total} jedinica slobodno",
    legend: "Zauzetost",
  },
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, sr }

/**
 * The dictionary for a locale.
 *
 * Falls back to English for a locale with no dictionary rather than throwing:
 * `parseLocale` already rejects unknown values, so reaching the fallback means a
 * language was added to `LOCALES` without a translation, and shipping English
 * beats shipping a crashed page.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? en
}

/**
 * Fills `{placeholder}` slots in a translated string.
 *
 * Only the values are interpolated — never the template — so a translation can
 * move a placeholder anywhere in the sentence, or drop it, without the call site
 * needing to know the language's word order.
 */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  )
}

/**
 * Counted nouns.
 *
 * English has two forms and Serbian has three, selected by the last two digits —
 * "1 rezervacija", "2 rezervacije", "5 rezervacija". Threading a bare count
 * through a template would be wrong in Serbian for every plural, so the counting
 * strings declare all three forms and this picks one.
 *
 * `few` is unused in English and required anyway, so a language added later can
 * fill it in without the English entries having to change shape.
 */
export interface PluralForms {
  one: string
  few: string
  many: string
}

/**
 * Counted nights, per language.
 *
 * Kept beside the dictionaries rather than in them because a plural is not a
 * single string: it is the set of forms one count expression takes, and `plural`
 * is what chooses between them.
 */
export const NIGHT_FORMS: Record<Locale, PluralForms> = {
  en: { one: "{count} night", few: "{count} nights", many: "{count} nights" },
  // Serbian counts in threes: 1 noć, 2–4 noći, 5+ noći.
  sr: { one: "{count} noć", few: "{count} noći", many: "{count} noći" },
}

/** "3 units that can be booked independently." — one count expression, two languages. */
export const UNIT_COUNT_FORMS: Record<Locale, PluralForms> = {
  en: {
    one: "{count} unit that can be booked independently.",
    few: "{count} units that can be booked independently.",
    many: "{count} units that can be booked independently.",
  },
  sr: {
    one: "{count} jedinica koja može da se rezerviše zasebno.",
    few: "{count} jedinice koje mogu da se rezervišu zasebno.",
    many: "{count} jedinica koje mogu da se rezervišu zasebno.",
  },
}

/** "2 active bookings" — fed both into a row and into the refusal sentence. */
export const ACTIVE_BOOKING_FORMS: Record<Locale, PluralForms> = {
  en: {
    one: "{count} active booking",
    few: "{count} active bookings",
    many: "{count} active bookings",
  },
  sr: {
    one: "{count} aktivna rezervacija",
    few: "{count} aktivne rezervacije",
    many: "{count} aktivnih rezervacija",
  },
}

/** "3 bookings" — counted in the delete-a-property confirmation. */
export const BOOKING_COUNT_FORMS: Record<Locale, PluralForms> = {
  en: {
    one: "{count} booking",
    few: "{count} bookings",
    many: "{count} bookings",
  },
  sr: {
    one: "{count} rezervacija",
    few: "{count} rezervacije",
    many: "{count} rezervacija",
  },
}

export const EXPENSE_COUNT_FORMS: Record<Locale, PluralForms> = {
  en: { one: "{count} expense", few: "{count} expenses", many: "{count} expenses" },
  sr: { one: "{count} trošak", few: "{count} troška", many: "{count} troškova" },
}

export function plural(count: number, forms: PluralForms, locale: Locale): string {
  return format(selectPluralForm(count, locale, forms), { count })
}

function selectPluralForm(count: number, locale: Locale, forms: PluralForms): string {
  const n = Math.abs(count)

  if (locale === "sr") {
    const lastTwo = n % 100
    const last = n % 10
    // The teens are the exception that catches people out: 11 takes the "many"
    // form, not the "one" form that its final digit suggests.
    if (last === 1 && lastTwo !== 11) return forms.one
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return forms.few
    return forms.many
  }

  return n === 1 ? forms.one : forms.many
}
